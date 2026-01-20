import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, Legend, LabelList } from 'recharts';
import { Card } from '../components/UI';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-lg p-3 border border-slate-200 text-xs">
                <p className="font-bold text-slate-700 mb-2">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: entry.color }}></div>
                        <span className="text-slate-600">{entry.name}:</span>
                        <span className="font-bold text-slate-700">{entry.value.toFixed(2)}h</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const WindowHoursChart = ({ data, title = "Horas de Janela por Período" }) => {
    if (!data || data.length === 0) {
        return (
            <Card className="h-full flex items-center justify-center bg-slate-50 border-dashed">
                <div className="text-center text-slate-400">
                    <p className="text-sm font-bold">Sem dados de janela</p>
                    <p className="text-xs">Carregue dados para visualizar</p>
                </div>
            </Card>
        );
    }

    // Preparar dados para Recharts com cores condicionais
    const chartData = data.map(d => ({
        ...d,
        name: d.label
    }));

    return (
        <Card className="p-4 h-full flex flex-col">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold uppercase text-slate-600">{title}</h3>
                <div className="flex gap-4 text-[10px]">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-green-500"></div>
                        <span className="text-slate-500">5h (±10min)</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-red-500"></div>
                        <span className="text-slate-500">Fora do alvo</span>
                    </div>
                </div>
            </div>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={{ stroke: '#cbd5e1' }}
                            tickLine={false}
                            angle={-45}
                            textAnchor="end"
                            height={50}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={{ stroke: '#cbd5e1' }}
                            tickLine={false}
                            label={{ value: 'Horas', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }}
                            domain={[0, 'auto']}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={5} stroke="#22c55e" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Meta 5h', position: 'right', fontSize: 10, fill: '#22c55e' }} />

                        {/* Barra Quench Sul */}
                        <Bar dataKey="hoursSul" name="Quench Sul" stackId={false} barSize={20}>
                            {chartData.map((entry, index) => (
                                <Cell key={`sul-${index}`} fill={entry.colorSul} />
                            ))}
                            <LabelList dataKey="hoursSul" position="inside" content={({ x, y, width, height }) => (
                                <text x={x + width / 2} y={y + height / 2} fill="#fff" textAnchor="middle" dominantBaseline="middle" fontSize={9} fontWeight="bold">QS</text>
                            )} />
                        </Bar>

                        {/* Barra Quench Norte */}
                        <Bar dataKey="hoursNorte" name="Quench Norte" stackId={false} barSize={20}>
                            {chartData.map((entry, index) => (
                                <Cell key={`norte-${index}`} fill={entry.colorNorte} opacity={0.7} />
                            ))}
                            <LabelList dataKey="hoursNorte" position="inside" content={({ x, y, width, height }) => (
                                <text x={x + width / 2} y={y + height / 2} fill="#fff" textAnchor="middle" dominantBaseline="middle" fontSize={9} fontWeight="bold">QN</text>
                            )} />
                        </Bar>

                        <Legend
                            wrapperStyle={{ fontSize: '10px' }}
                            formatter={(value) => <span className="text-slate-600">{value}</span>}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default WindowHoursChart;
