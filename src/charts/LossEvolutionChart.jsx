import React, { memo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ReferenceLine, LabelList } from 'recharts';
import { COLORS } from '../config';

const toHours = (mins) => `${(mins / 60).toFixed(1)}h`;

const renderCustomLabel = (props, color) => {
    if (!props || !props.payload) return null;
    const { x, y, width, height, value } = props;
    const hours = value / 60;
    if (hours < 0.5) return null; // Don't show label for small values

    return (
        <text x={x + width / 2} y={y + height / 2} fill={color} textAnchor="middle" dominantBaseline="middle" fontSize={10} fontWeight="bold" style={{ pointerEvents: 'none' }}>
            {hours.toFixed(1)}h
        </text>
    );
};

const getOpacity = (entryKey, selectedKey) => {
    if (!selectedKey) return 1;
    if (Array.isArray(selectedKey)) return selectedKey.includes(entryKey) ? 1 : 0.3;
    return entryKey === selectedKey ? 1 : 0.3;
};

const LossEvolutionChart = memo(({ data, onDrillDown, selectedKey, selectedType }) => {
    if (!data || data.length === 0) return <div className="flex h-full items-center justify-center text-xs text-gray-400 italic">Aguardando dados...</div>;

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="horizontal" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#94A3B8' }} dy={5} />
                <YAxis tickFormatter={(val) => toHours(val)} fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#94A3B8' }} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} formatter={(value, name) => {
                    return [toHours(value), name];
                }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                {/* Base Inferior: Perdas de Performance (lossUtil) */}
                <Bar dataKey="lossUtil" name="Perda Perf." stackId="a" fill={COLORS.yellow} barSize={40} hide={selectedType && selectedType !== 'performance'} onClick={(data) => onDrillDown && onDrillDown(data.key, 'performance')} cursor="pointer">
                    {data.map((entry, index) => (<Cell key={`cell-perf-${index}`} fillOpacity={getOpacity(entry.key, selectedKey)} />))}
                    <LabelList content={(props) => renderCustomLabel(props, '#334155')} />
                </Bar>
                {/* Parte Superior: Perdas de Disponibilidade (lossDisp) */}
                <Bar dataKey="lossDisp" name="Perda Disp." stackId="a" fill={COLORS.blue} barSize={40} hide={selectedType && selectedType !== 'availability'} onClick={(data) => onDrillDown && onDrillDown(data.key, 'availability')} cursor="pointer">
                    {data.map((entry, index) => (<Cell key={`cell-disp-${index}`} fillOpacity={getOpacity(entry.key, selectedKey)} />))}
                    <LabelList content={(props) => renderCustomLabel(props, '#FFFFFF')} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
});

export default LossEvolutionChart;