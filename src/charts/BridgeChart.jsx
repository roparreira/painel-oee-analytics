import React, { memo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, CartesianGrid, Tooltip, Cell, LabelList, ReferenceLine } from 'recharts';
import { COLORS, TARGETS, BUSINESS_CONSTANTS_PATIO } from '../config';

const BridgeLabel = (props) => {
    const { x, y, width, value, index, data, isPatio } = props;
    const entry = data[index];
    if (!entry) return null;

    const val = entry.label;
    const isGain = val >= 0;
    const isTotal = entry.isTotal;
    const yPos = y - 12;

    let fill = COLORS.darkGray;
    if (entry.name === 'Meta') fill = COLORS.darkGray;
    else if (entry.name === 'Real') fill = COLORS.blue;
    else if (entry.name === 'Ausência Janela') fill = isGain ? COLORS.yellow : COLORS.red;
    else fill = isGain ? COLORS.green : COLORS.red;

    // Para Pátio, formata o número com locale
    const displayVal = isPatio
        ? (isTotal ? val.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : (isGain ? '+' : '') + val.toLocaleString('pt-BR', { maximumFractionDigits: 0 }))
        : (isTotal ? val : (isGain ? `+${val}` : val));

    return (
        <text x={x + width / 2} y={yPos} fill={fill} textAnchor="middle" dominantBaseline="middle" fontSize={isPatio ? 8 : 10} fontWeight="bold">
            {displayVal}
        </text>
    );
};

const BridgeChart = memo(({ aggregates, areaMode = 'maquinas' }) => {
    if (!aggregates) return <div className="flex items-center justify-center h-full text-xs text-gray-400">Carregando dados...</div>;

    const isPatio = areaMode === 'patio';
    const unit = isPatio ? 'ton' : 'fornos';

    let meta, actual, data;

    if (isPatio) {
        // PÁTIO: Nova lógica com 4 parcelas em Volume
        const bm = aggregates.patioBridgeMeta || {};
        const br = aggregates.patioBridgeReal || {};

        if (!bm.VM || !br.VR) {
            // Fallback para lógica antiga se não houver dados
            const totalDays = aggregates.totalDays || 1;
            meta = Math.round(BUSINESS_CONSTANTS_PATIO.VOL_META * totalDays);
            actual = Math.round(aggregates.totalWetCharge || 0);
            data = [
                { name: 'Meta', base: 0, value: meta, label: meta, isTotal: true, type: 'start' },
                { name: 'Real', base: 0, value: actual, label: actual, isTotal: true, type: 'end' }
            ];
        } else {
            meta = Math.round(bm.VM);
            actual = Math.round(br.VR);

            // Fórmulas da Bridge em Volume (toneladas)
            // BVSL = (SLM - SLR) * TLIQ  ->  Volume perdido por Schedule Loss
            const BVSL = Math.round((bm.SLM - br.SLR) * bm.TLIQ);

            // BIND = (PNPM - PNPR) * TLIQ  ->  Volume perdido por Indisponibilidade
            const BIND = Math.round((bm.PNPM - br.PNPR) * bm.TLIQ);

            // BPOP = (POM - POR) * TLIQ  ->  Volume perdido por Perda Operacional
            const BPOP = Math.round((bm.POM - br.POR) * bm.TLIQ);

            // BPRT = (TLIQR - TLIQ) * TLR  ->  Volume perdido/ganho por Taxa
            const BPRT = Math.round((br.TLIQR - bm.TLIQ) * br.TLR);

            let rawSteps = [
                { name: 'Ausência Janela', val: BVSL, type: 'sl' },     // Positivo = ganho (menos paradas)
                { name: 'Indisponibilidade', val: BIND, type: 'disp' }, // Positivo = ganho (menos falhas)
                { name: 'Perda Operacional', val: BPOP, type: 'perf' }, // Negativo = perda (mais paradas)
                { name: 'Taxa', val: BPRT, type: 'taxa' }               // Positivo = ganho, Negativo = perda
            ];

            // Ordenar por valor (perdas primeiro, ganhos depois)
            rawSteps.sort((a, b) => a.val - b.val);

            data = [];
            data.push({ name: 'Meta', base: 0, value: meta, label: meta, isTotal: true, type: 'start' });

            let currentLevel = meta;

            rawSteps.forEach(step => {
                if (step.val === 0) return;
                const isGain = step.val >= 0;
                const absVal = Math.abs(step.val);

                let base;
                if (isGain) {
                    base = currentLevel;
                    currentLevel += step.val;
                } else {
                    currentLevel += step.val;
                    base = currentLevel;
                }

                data.push({
                    name: step.name,
                    base: base,
                    value: absVal,
                    label: step.val,
                    isTotal: false,
                    category: step.type,
                    type: isGain ? 'gain' : 'loss'
                });
            });

            data.push({ name: 'Real', base: 0, value: actual, label: actual, isTotal: true, type: 'end' });
        }
    } else {
        // MÁQUINAS: Nova lógica com franquias corrigidas
        const bm = aggregates.bridgeMeta || {};
        const br = aggregates.bridgeReal || {};

        meta = Math.round(bm.FM || 160);
        actual = Math.round(br.FR || 0);

        // Constantes Meta
        const FM = bm.FM || 160;
        const LT = bm.LT || (35 * 60);          // Loading Time Meta em min
        const TL = bm.TL || (30 * 60);          // Tempo Líquido Meta em min
        const FFL = bm.FFL || 11.25;            // Forno a Forno Líquido Meta
        const DM = bm.DM || 0.9143;             // Disponibilidade Meta
        const UM = bm.UM || 0.9375;             // Utilização Meta

        // Valores Reais
        const FR = br.FR || 0;
        const PPR = br.PPR || 0;                // Paradas Programadas Real
        const TTR = br.TTR || 0;                // Troca de Turno Real
        const PNPR = br.PNPR || 0;              // Paradas Não Programadas Real
        const POR = br.POR || 0;                // Perda Operacional Real
        const LTR = br.LTR || 0;                // Loading Time Real
        const TLR = br.TLR || 0;                // Tempo Líquido Real

        // Cálculos intermediários
        const PNPMC = (1 - DM) * LTR;           // Franquia Corrigida de Indisponibilidade
        const POMC = (1 - UM) * (LTR - PNPR);   // Franquia Corrigida de Perda Operacional
        const NTL = LTR - PNPMC - POMC;         // Novo Tempo Líquido
        const FFR = FR > 0 ? TLR / FR : 0;      // Forno a Forno Real

        // Parcelas do Bridge
        const BNFSL = Math.round((NTL - TL) / FFL);           // Schedule Loss (Ganho/Perda)
        const BIND = Math.round((PNPMC - PNPR) / FFL);        // Indisponibilidade
        const BPOP = Math.round((POMC - POR) / FFL);          // Perda Operacional
        const BPRT = FFR > 0 ? Math.round((TLR / FFR) - (TLR / FFL)) : 0; // Perda de Ritmo

        let rawSteps = [
            { name: 'Ausência Janela', val: BNFSL, type: 'schedule' },
            { name: 'Indisponibilidade', val: BIND, type: 'disp' },
            { name: 'P. Operacional', val: BPOP, type: 'perf' },
            { name: 'Forno a Forno', val: BPRT, type: 'perf' }
        ];

        rawSteps.sort((a, b) => a.val - b.val);

        data = [];
        data.push({ name: 'Meta', base: 0, value: meta, label: meta, isTotal: true, type: 'start' });

        let currentLevel = meta;

        rawSteps.forEach(step => {
            if (step.val === 0) return;
            const isGain = step.val >= 0;
            const absVal = Math.abs(step.val);

            let base;
            if (isGain) {
                base = currentLevel;
                currentLevel += step.val;
            } else {
                currentLevel += step.val;
                base = currentLevel;
            }

            data.push({ name: step.name, base: base, value: absVal, label: step.val, isTotal: false, category: step.type, type: isGain ? 'gain' : 'loss' });
        });

        data.push({ name: 'Real', base: 0, value: actual, label: actual, isTotal: true, type: 'end' });
    }

    const getBarColor = (entry) => {
        if (entry.name === 'Meta') return COLORS.darkGray;
        if (entry.name === 'Real') return COLORS.blue;
        // Ausência Janela: amarelo se positivo, vermelho se negativo
        if (entry.name === 'Ausência Janela') return entry.label >= 0 ? COLORS.yellow : COLORS.red;
        return entry.type === 'gain' ? COLORS.green : COLORS.red;
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748B' }} interval={0} dy={5} />
                <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                    content={({ payload }) => {
                        if (!payload || payload.length === 0) return null;
                        const d = payload[1] ? payload[1].payload : payload[0].payload;
                        return (
                            <div className="bg-white p-2 border border-slate-100 shadow-xl rounded text-xs">
                                <p className="font-bold text-slate-700 mb-1">{d.name}</p>
                                <p className="text-slate-500">{d.isTotal ? 'Total: ' : 'Impacto: '}<strong style={{ color: getBarColor(d) }}>{d.label > 0 && !d.isTotal ? '+' : ''}{isPatio ? d.label.toLocaleString('pt-BR') : d.label}</strong> {unit}</p>
                            </div>
                        );
                    }}
                />
                <ReferenceLine y={0} stroke="#000" />
                <Bar dataKey="base" stackId="a" fill="transparent" />
                <Bar dataKey="value" stackId="a" radius={[2, 2, 2, 2]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
                    ))}
                    <LabelList content={(props) => <BridgeLabel {...props} data={data} isPatio={isPatio} />} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
});

export default BridgeChart;