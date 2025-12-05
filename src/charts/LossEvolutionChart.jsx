// src/charts/LossEvolutionChart.jsx
import React from 'react';
import { 
    ResponsiveContainer, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    Cell,
    ReferenceLine,
    LabelList
} from 'recharts';
import { COLORS } from '../config';

const toPercent = (decimal, fixed = 0) => `${(decimal * 100).toFixed(fixed)}%`;

const renderCustomLabel = (props, color) => {
    if (!props || !props.payload) return null;
    const { x, y, width, height, value, payload } = props;
    const lossDisp = payload.lossDisp || 0;
    const lossUtil = payload.lossUtil || 0;
    const total = lossDisp + lossUtil;
    if (total === 0) return null;
    const percent = value / total;
    if (percent < 0.05) return null;

    return (
        <text 
            x={x + width / 2} 
            y={y + height / 2} 
            fill={color} 
            textAnchor="middle" 
            dominantBaseline="middle" 
            fontSize={10} 
            fontWeight="bold"
            style={{ pointerEvents: 'none' }}
        >
            {toPercent(percent, 0)}
        </text>
    );
};

// Função auxiliar para calcular opacidade
const getOpacity = (entryKey, type, selectedKey, selectedType) => {
    // Se nada estiver selecionado, tudo fica visível
    if (!selectedKey) return 1;
    
    // Se a data não for a selecionada, fica apagado
    if (entryKey !== selectedKey) return 0.3;

    // Se a data for a selecionada:
    // Se não houver tipo selecionado OU o tipo bater, fica visível. Senão, apaga.
    if (!selectedType || selectedType === type) return 1;
    
    return 0.3;
};

const LossEvolutionChart = ({ data, onDrillDown, selectedKey, selectedType }) => {
    if (!data || data.length === 0) {
        return <div className="flex h-full items-center justify-center text-xs text-gray-400 italic">Aguardando dados...</div>;
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                layout="horizontal"
                stackOffset="expand"
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                
                <XAxis 
                    dataKey="label" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#94A3B8' }} 
                    dy={5}
                />
                
                <YAxis 
                    tickFormatter={(val) => toPercent(val, 0)} 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#94A3B8' }} 
                />

                <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    formatter={(value, name, props) => {
                        if (!props || !props.payload) return [value, name];
                        const total = (props.payload.lossDisp || 0) + (props.payload.lossUtil || 0);
                        const pct = total > 0 ? (value / total) : 0;
                        const valH = (value / 60).toFixed(1);
                        return [`${valH} h (${(pct * 100).toFixed(1)}%)`, name];
                    }}
                />

                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                <ReferenceLine y={0.5} stroke="#64748B" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: '50%', position: 'right', fill: '#64748B', fontSize: 10 }} />

                {/* Barra Azul (Disponibilidade) - Clicável */}
                <Bar 
                    dataKey="lossDisp" 
                    name="Perda Disp." 
                    stackId="a" 
                    fill={COLORS.blue} 
                    barSize={40}
                    onClick={(data) => onDrillDown && onDrillDown(data.key, 'availability')}
                    cursor="pointer"
                >
                    {data.map((entry, index) => (
                        <Cell 
                            key={`cell-disp-${index}`} 
                            fillOpacity={getOpacity(entry.key, 'availability', selectedKey, selectedType)} 
                        />
                    ))}
                    <LabelList content={(props) => renderCustomLabel(props, '#FFFFFF')} />
                </Bar>

                {/* Barra Amarela (Performance) - Clicável */}
                <Bar 
                    dataKey="lossUtil" 
                    name="Perda Perf." 
                    stackId="a" 
                    fill={COLORS.yellow} 
                    barSize={40}
                    onClick={(data) => onDrillDown && onDrillDown(data.key, 'performance')}
                    cursor="pointer"
                >
                    {data.map((entry, index) => (
                        <Cell 
                            key={`cell-perf-${index}`} 
                            fillOpacity={getOpacity(entry.key, 'performance', selectedKey, selectedType)} 
                        />
                    ))}
                    <LabelList content={(props) => renderCustomLabel(props, '#334155')} />
                </Bar>

            </BarChart>
        </ResponsiveContainer>
    );
};

export default LossEvolutionChart;