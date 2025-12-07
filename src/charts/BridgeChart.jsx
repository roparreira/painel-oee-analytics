import React, { memo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, CartesianGrid, Tooltip, Cell, LabelList, ReferenceLine } from 'recharts';
import { COLORS, TARGETS } from '../config';

const BridgeLabel = (props) => {
    const { x, y, width, value, index, data } = props;
    const entry = data[index];
    if (!entry) return null;
    
    const val = entry.label; 
    const isGain = val >= 0;
    const isTotal = entry.isTotal;
    const yPos = y - 12;

    let fill = COLORS.darkGray;
    if (entry.name === 'Meta') fill = COLORS.darkGray;
    else if (entry.name === 'Real') fill = COLORS.blue;
    else fill = isGain ? COLORS.green : COLORS.red;

    return (
        <text x={x + width / 2} y={yPos} fill={fill} textAnchor="middle" dominantBaseline="middle" fontSize={10} fontWeight="bold">
            {isTotal ? val : (isGain ? `+${val}` : val)}
        </text>
    );
};

const BridgeChart = memo(({ aggregates }) => {
    if (!aggregates) return <div className="flex items-center justify-center h-full text-xs text-gray-400">Carregando dados...</div>;

    const meta = Math.round(aggregates.targetOvens || 0);
    const actual = Math.round(aggregates.ovensNumeric || 0);
    const pace = (aggregates.ritmoMetaMin && aggregates.ritmoMetaMin > 0) ? aggregates.ritmoMetaMin : 10; 
    
    const loadingTimeReal = aggregates.loadingMins || 0; 
    const franchiseFailMins = loadingTimeReal * (1 - (TARGETS.AVAIL / 100)); 
    const realFailMins = aggregates.failLossMins || 0;
    const varFailMins = franchiseFailMins - realFailMins; 
    const stepFail = Math.round(varFailMins / pace);

    const varOtherDispMins = 0 - (aggregates.schedMaintLossMins || 0); 
    const stepOtherDisp = Math.round(varOtherDispMins / pace);

    const varPlannedMaintMins = (aggregates.targetMaintMins || 0) - (aggregates.usedMaintMins || 0);
    const stepPlanned = Math.round(varPlannedMaintMins / pace);

    const varUtilMins = 0 - ((aggregates.opsLossMins || 0) + (aggregates.shiftLossMins || 0));
    const stepUtil = Math.round(varUtilMins / pace);

    const stepRhythm = actual - meta - (stepFail + stepOtherDisp + stepPlanned + stepUtil);

    let rawSteps = [
        { name: 'Falhas', val: stepFail, type: 'disp' },
        { name: 'Excesso Maint.', val: stepOtherDisp, type: 'disp' },
        { name: 'Desvio de Janela', val: stepPlanned, type: 'disp' },
        { name: 'Utilização', val: stepUtil, type: 'perf' },
        { name: 'Forno a Forno', val: stepRhythm, type: 'perf' }
    ];

    rawSteps.sort((a, b) => a.val - b.val);

    const data = [];
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

    const getBarColor = (entry) => {
        if (entry.name === 'Meta') return COLORS.darkGray;
        if (entry.name === 'Real') return COLORS.blue;
        return entry.type === 'gain' ? COLORS.green : COLORS.red; 
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#64748B'}} interval={0} dy={5} />
                <Tooltip 
                    cursor={{fill: 'rgba(0,0,0,0.03)'}}
                    content={({ payload }) => {
                        if (!payload || payload.length === 0) return null;
                        const d = payload[1] ? payload[1].payload : payload[0].payload; 
                        return (
                            <div className="bg-white p-2 border border-slate-100 shadow-xl rounded text-xs">
                                <p className="font-bold text-slate-700 mb-1">{d.name}</p>
                                <p className="text-slate-500">{d.isTotal ? 'Total: ' : 'Impacto: '}<strong style={{color: getBarColor(d)}}>{d.label > 0 && !d.isTotal ? '+' : ''}{d.label}</strong> fornos</p>
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
                    <LabelList content={(props) => <BridgeLabel {...props} data={data} />} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
});

export default BridgeChart;