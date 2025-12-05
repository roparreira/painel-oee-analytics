import React from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';
import { Card } from '../components/UI';
import { COLORS } from '../config';

const TargetChart = ({ data, dataKey, target, title, colorLine, yMax = 110, onBarClick, selectedKey }) => {
    return (
        <Card className="p-3 h-full flex flex-col cursor-pointer transition hover:border-blue-300 group">
            <div className="flex justify-between items-center mb-1">
                <h3 className="text-xs font-bold uppercase text-slate-600 group-hover:text-blue-600 transition-colors">{title}</h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">Meta: {target}%</span>
            </div>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart 
                        data={data} 
                        margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="label" fontSize={9} tickLine={false} axisLine={false} tick={{fill: '#94A3B8'}} dy={5} />
                        <YAxis domain={[0, yMax]} fontSize={9} tickLine={false} axisLine={false} tick={{fill: '#94A3B8'}} />
                        <Tooltip cursor={{fill: '#F1F5F9'}} contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px'}} />
                        <ReferenceLine y={target} stroke={COLORS.darkGray} strokeDasharray="3 3" strokeWidth={1} />
                        <Bar 
                            dataKey={dataKey} 
                            barSize={20} 
                            radius={[3, 3, 0, 0]}
                            onClick={(data) => {
                                if (data && onBarClick) {
                                    onBarClick(data.key);
                                }
                            }}
                        >
                            {data.map((entry, index) => {
                                const isSelected = selectedKey ? entry.key === selectedKey : true;
                                const baseColor = entry[dataKey] >= target ? COLORS.green : COLORS.red;
                                return (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={baseColor} 
                                        opacity={isSelected ? 1 : 0.2}
                                        cursor="pointer"
                                    />
                                );
                            })}
                        </Bar>
                        <Line type="monotone" dataKey={dataKey} stroke={colorLine} strokeWidth={2} dot={{r: 1}} activeDot={{r: 4}} opacity={selectedKey ? 0.3 : 1} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default TargetChart;