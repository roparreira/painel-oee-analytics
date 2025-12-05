import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, CartesianGrid, Tooltip, Cell, LabelList } from 'recharts';
import { COLORS, TARGETS } from '../config';

const BridgeLabel = (props) => {
    const { x, y, width, value, index, data } = props;
    const entry = data[index];
    if (!entry) return null;
    
    const val = entry.label; 
    const isGain = val > 0;
    const isTotal = entry.isTotal;

    const yPos = y - 5;

    return (
        <text 
            x={x + width / 2} 
            y={yPos} 
            fill={COLORS.darkGray} 
            textAnchor="middle" 
            dominantBaseline="baseline"
            fontSize={11}
            fontWeight="bold"
        >
            {isGain && !isTotal ? `+${val}` : val}
        </text>
    );
};

const BridgeChart = ({ aggregates }) => {
    const meta = Math.round(aggregates.targetOvens);
    const actual = Math.round(aggregates.ovensNumeric);
    const pace = aggregates.ritmoMetaMin; 

    if (!pace || pace === 0) return <div className="flex items-center justify-center h-full text-xs text-gray-400">Sem dados de ritmo meta</div>;

    const loadingTimeReal = aggregates.loadingMins; 
    const franchiseFailMins = loadingTimeReal * (1 - (TARGETS.AVAIL / 100)); 
    const realFailMins = aggregates.failLossMins;
    const varFailMins = franchiseFailMins - realFailMins;
    const stepFail = Math.round(varFailMins / pace);

    const varOtherDispMins = 0 - aggregates.schedMaintLossMins;
    const stepOtherDisp = Math.round(varOtherDispMins / pace);

    const varPlannedMaintMins = aggregates.targetMaintMins - aggregates.usedMaintMins;
    const stepPlanned = Math.round(varPlannedMaintMins / pace);

    const varUtilMins = 0 - (aggregates.opsLossMins + aggregates.shiftLossMins + aggregates.extProdMins + aggregates.outsideProdMins);
    const stepUtil = Math.round(varUtilMins / pace);

    const stepRhythm = actual - meta - stepFail - stepOtherDisp - stepPlanned - stepUtil;

    const steps = [
        { name: 'Falhas', val: stepFail, type: 'disp' },
        { name: 'Outros Disp', val: stepOtherDisp, type: 'disp' },
        { name: 'Ausência de Janelas', val: stepPlanned, type: 'disp' }, // <--- Rótulo Alterado Aqui
        { name: 'Utilização', val: stepUtil, type: 'perf' },
        { name: 'Forno a Forno', val: stepRhythm, type: 'perf' }
    ].sort((a, b) => a.val - b.val); 

    const data = [
        { name: 'Meta', base: 0, value: meta, label: meta, isTotal: true, type: 'start' }
    ];

    let runningTotal = meta;

    steps.forEach(step => {
        const isGain = step.val >= 0;
        const absVal = Math.abs(step.val);
        
        let base;
        if (isGain) {
            base = runningTotal;
            runningTotal += step.val;
        } else {
            runningTotal += step.val; 
            base = runningTotal;
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

    data.push({ name: 'Realizado', base: 0, value: actual, label: actual, isTotal: true, type: 'end' });

    const getBarColor = (entry) => {
        if (entry.type === 'start') return COLORS.darkGray;
        if (entry.type === 'end') return COLORS.blue;
        return entry.label >= 0 ? COLORS.green : COLORS.red;
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 25, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#64748B'}} interval={0} />
                <Tooltip 
                    cursor={{fill: 'rgba(0,0,0,0.05)'}}
                    content={({ payload, label }) => {
                        if (!payload || payload.length === 0) return null;
                        const dataPoint = payload[1].payload; 
                        return (
                            <div className="bg-white p-2 border border-slate-200 shadow-lg rounded text-xs">
                                <p className="font-bold mb-1 text-slate-700">{dataPoint.name}</p>
                                <p style={{color: getBarColor(dataPoint)}} className="font-bold">
                                    {dataPoint.isTotal ? `Valor: ${dataPoint.label}` : `Impacto: ${dataPoint.label > 0 ? '+' : ''}${dataPoint.label} fornos`}
                                </p>
                            </div>
                        );
                    }}
                />
                <Bar dataKey="base" stackId="a" fill="transparent" />
                <Bar dataKey="value" stackId="a" radius={[3, 3, 3, 3]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
                    ))}
                    <LabelList dataKey="label" content={<BridgeLabel data={data} />} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

export default BridgeChart;