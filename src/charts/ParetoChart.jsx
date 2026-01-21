import React, { memo, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from 'recharts';
import { COLORS } from '../config';

const ParetoChart = memo(({ data, color, emptyMessage = "Sem dados", onBarClick, selectedName }) => {
  if (!data || data.length === 0) return <div className="flex h-full items-center justify-center text-gray-400 text-xs italic">{emptyMessage}</div>;

  // Calcular total para percentual
  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

  // Adicionar percentual aos dados
  const dataWithPct = useMemo(() => data.map(item => ({
    ...item,
    pct: total > 0 ? ((item.value / total) * 100).toFixed(1) : 0
  })), [data, total]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dataWithPct} layout="vertical" margin={{ top: 0, right: 40, left: 5, bottom: 0 }} barCategoryGap={2}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 9, fill: '#475569', fontWeight: 500 }} interval={0} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} contentStyle={{ fontSize: '11px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '8px' }} formatter={(val, name, props) => [`${props.payload.value} min (${props.payload.pct}%)`, 'Duração']} />
        <Bar dataKey="value" barSize={14} radius={[0, 4, 4, 0]} cursor="pointer" onClick={(e) => { if (e && onBarClick) { onBarClick(e.name); } }}>
          {dataWithPct.map((entry, index) => {
            const isSelected = selectedName ? (Array.isArray(selectedName) ? selectedName.includes(entry.name) : entry.name === selectedName) : true;
            return (<Cell key={`cell-${index}`} fill={color || COLORS.orange} opacity={isSelected ? 1 : 0.3} />);
          })}
          {/* Label de minutos na extremidade externa (direita) */}
          <LabelList dataKey="value" position="right" fontSize={9} fill="#64748B" formatter={(val) => val} />
          {/* Label de percentual na extremidade interna (dentro da barra) */}
          <LabelList dataKey="pct" position="insideRight" fontSize={8} fill="#FFFFFF" fontWeight="bold" formatter={(val) => `${val}%`} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
});

export default ParetoChart;