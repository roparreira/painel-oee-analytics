import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { COLORS } from '../config';

const OEEGaugeCard = ({ value, target }) => {
    const safeValue = isNaN(value) ? 0 : value;
    const isOk = safeValue >= target;
    const color = isOk ? COLORS.green : COLORS.red;
    
    const data = [
        { name: 'OEE', value: safeValue, fill: color },
        { name: 'Rest', value: Math.max(0, 100 - safeValue), fill: COLORS.offWhite }
    ];

    return (
        <div className="bg-white rounded-xl border-l-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)] h-full flex flex-col relative" style={{ borderLeftColor: color }}>
            <div className="absolute top-3 left-4 z-10">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">OEE Máquinas</p>
            </div>
            
            <div className="flex-1 flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="55%"
                            innerRadius="65%"
                            outerRadius="85%"
                            startAngle={180}
                            endAngle={0}
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                        >
                            <Cell key="val" fill={color} />
                            <Cell key="rest" fill={COLORS.offWhite} />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-[55%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center mt-4">
                     <span className="text-4xl font-bold block leading-none tracking-tight" style={{ color: color }}>{safeValue.toFixed(1)}%</span>
                     <span className="text-[10px] text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded-full mt-1 inline-block">Meta: {target}%</span>
                </div>
            </div>
        </div>
    );
};

export default OEEGaugeCard;