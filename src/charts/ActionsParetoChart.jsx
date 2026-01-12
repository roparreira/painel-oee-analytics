import React, { memo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from 'recharts';

const COLORS = {
    orange: '#f97316',
    blue: '#3b82f6',
    green: '#22c55e',
    purple: '#a855f7',
    slate: '#64748b',
};

const ActionsParetoChart = memo(({ data, color = COLORS.orange, emptyMessage = "Sem dados", onBarClick, selectedName, title }) => {
    if (!data || data.length === 0) {
        return <div className="flex h-full items-center justify-center text-gray-400 text-xs italic">{emptyMessage}</div>;
    }

    // Ordenar e limitar top 10
    const sortedData = [...data].sort((a, b) => b.count - a.count).slice(0, 10);
    const chartData = sortedData.map(item => ({
        name: item.name || '(vazio)',
        value: item.count,
    }));

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 35, left: 5, bottom: 0 }} barCategoryGap={2}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" hide />
                <YAxis
                    dataKey="name"
                    type="category"
                    width={90}
                    tick={{ fontSize: 9, fill: '#475569', fontWeight: 500 }}
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                    contentStyle={{
                        fontSize: '11px',
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '8px'
                    }}
                    formatter={(val) => [`${val}`, 'Quantidade']}
                />
                <Bar
                    dataKey="value"
                    barSize={14}
                    radius={[0, 4, 4, 0]}
                    cursor="pointer"
                    onClick={(e) => { if (e && onBarClick) onBarClick(e.name === '(vazio)' ? null : e.name); }}
                >
                    {chartData.map((entry, index) => {
                        const isSelected = selectedName ? entry.name === selectedName : true;
                        return (
                            <Cell
                                key={`cell-${index}`}
                                fill={color}
                                opacity={isSelected ? 1 : 0.3}
                            />
                        );
                    })}
                    <LabelList dataKey="value" position="right" fontSize={9} fill="#64748B" />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
});

export default ActionsParetoChart;
