import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, CartesianGrid, Tooltip, Cell, LabelList, ReferenceLine } from 'recharts';
import { COLORS, TARGETS } from '../config';

const BridgeLabel = (props) => {
    const { x, y, width, value, index, data } = props;
    const entry = data[index];
    if (!entry) return null;
    
    // O valor a ser mostrado é o 'label' (delta), não o tamanho da barra
    const val = entry.label; 
    const isGain = val >= 0;
    const isTotal = entry.isTotal;

    // Posicionamento ajustado
    const yPos = y - 12;

    // Definição de cor do texto baseada no tipo
    let fill = COLORS.darkGray;
    if (entry.name === 'Meta') fill = COLORS.darkGray;
    else if (entry.name === 'Real') fill = COLORS.blue;
    else fill = isGain ? COLORS.green : COLORS.red;

    return (
        <text 
            x={x + width / 2} 
            y={yPos} 
            fill={fill}
            textAnchor="middle" 
            dominantBaseline="middle"
            fontSize={10}
            fontWeight="bold"
        >
            {isTotal ? val : (isGain ? `+${val}` : val)}
        </text>
    );
};

const BridgeChart = ({ aggregates }) => {
    // Proteção contra dados nulos para evitar gráfico em branco
    if (!aggregates) return <div className="flex items-center justify-center h-full text-xs text-gray-400">Carregando dados...</div>;

    const meta = Math.round(aggregates.targetOvens || 0);
    const actual = Math.round(aggregates.ovensNumeric || 0);
    
    // Proteção contra divisão por zero e valores nulos
    const pace = (aggregates.ritmoMetaMin && aggregates.ritmoMetaMin > 0) ? aggregates.ritmoMetaMin : 10; 
    
    // Cálculo dos Deltas (Passos da Ponte)
    // 1. Falhas (Perda Disp)
    const loadingTimeReal = aggregates.loadingMins || 0; 
    const franchiseFailMins = loadingTimeReal * (1 - (TARGETS.AVAIL / 100)); 
    const realFailMins = aggregates.failLossMins || 0;
    const varFailMins = franchiseFailMins - realFailMins; 
    const stepFail = Math.round(varFailMins / pace);

    // 2. Outras Indisponibilidades (Excesso de Janela)
    const varOtherDispMins = 0 - (aggregates.schedMaintLossMins || 0); 
    const stepOtherDisp = Math.round(varOtherDispMins / pace);

    // 3. Manutenção Planejada (Desvio de Janela)
    // Rótulo alterado de "Efic. Janela" para "Desvio de Janela"
    const varPlannedMaintMins = (aggregates.targetMaintMins || 0) - (aggregates.usedMaintMins || 0);
    const stepPlanned = Math.round(varPlannedMaintMins / pace);

    // 4. Perdas de Utilização (Performance)
    const varUtilMins = 0 - ((aggregates.opsLossMins || 0) + (aggregates.shiftLossMins || 0));
    const stepUtil = Math.round(varUtilMins / pace);

    // 5. Ritmo (Forno a Forno)
    // Rótulo alterado de "Ritmo Puro" para "Forno a Forno"
    const stepRhythm = actual - meta - (stepFail + stepOtherDisp + stepPlanned + stepUtil);

    let rawSteps = [
        { name: 'Falhas', val: stepFail, type: 'disp' },
        { name: 'Excesso Maint.', val: stepOtherDisp, type: 'disp' },
        { name: 'Desvio de Janela', val: stepPlanned, type: 'disp' },
        { name: 'Utilização', val: stepUtil, type: 'perf' },
        { name: 'Forno a Forno', val: stepRhythm, type: 'perf' }
    ];

    // ORDENAÇÃO: Da maior perda (valor mais negativo) para o maior ganho (valor mais positivo)
    // Isso cria o efeito de "vale" antes de subir a ponte
    rawSteps.sort((a, b) => a.val - b.val);

    // Montagem dos Dados para o Gráfico Waterfall
    const data = [];
    
    // A. Barra Inicial (Meta)
    data.push({ 
        name: 'Meta', 
        base: 0, 
        value: meta, 
        label: meta, 
        isTotal: true, 
        type: 'start' 
    });

    let currentLevel = meta;

    // B. Passos Intermediários (Ordenados)
    rawSteps.forEach(step => {
        // Filtra passos zerados para limpar o visual
        if (step.val === 0) return;

        const isGain = step.val >= 0;
        const absVal = Math.abs(step.val);
        
        let base;
        if (isGain) {
            base = currentLevel;
            currentLevel += step.val;
        } else {
            currentLevel += step.val; // Ao subtrair (somar negativo), o nível desce
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

    // C. Barra Final (Realizado)
    data.push({ 
        name: 'Real', 
        base: 0, 
        value: actual, 
        label: actual, 
        isTotal: true, 
        type: 'end' 
    });

    // Função de Cor Atualizada
    const getBarColor = (entry) => {
        if (entry.name === 'Meta') return COLORS.darkGray;
        if (entry.name === 'Real') return COLORS.blue;
        return entry.type === 'gain' ? COLORS.green : COLORS.red; 
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 9, fill: '#64748B'}} 
                    interval={0} 
                    dy={5}
                />
                <Tooltip 
                    cursor={{fill: 'rgba(0,0,0,0.03)'}}
                    content={({ payload }) => {
                        if (!payload || payload.length === 0) return null;
                        const d = payload[1] ? payload[1].payload : payload[0].payload; 
                        
                        return (
                            <div className="bg-white p-2 border border-slate-100 shadow-xl rounded text-xs">
                                <p className="font-bold text-slate-700 mb-1">{d.name}</p>
                                <p className="text-slate-500">
                                    {d.isTotal ? 'Total: ' : 'Impacto: '}
                                    <strong style={{color: getBarColor(d)}}>{d.label > 0 && !d.isTotal ? '+' : ''}{d.label}</strong> fornos
                                </p>
                            </div>
                        );
                    }}
                />
                <ReferenceLine y={0} stroke="#000" />
                
                {/* Barra Invisível (Base) */}
                <Bar dataKey="base" stackId="a" fill="transparent" />
                
                {/* Barra Visível (Delta ou Total) */}
                <Bar dataKey="value" stackId="a" radius={[2, 2, 2, 2]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
                    ))}
                    <LabelList content={(props) => <BridgeLabel {...props} data={data} />} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

export default BridgeChart;