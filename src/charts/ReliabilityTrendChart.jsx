import React from 'react';
import { 
    ResponsiveContainer, ComposedChart, Line, Bar, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, 
    Label // <-- CORREÇÃO: Adicionando Label aqui!
} from 'recharts';
import { Card } from '../components/UI';
import { COLORS } from '../config';

const ReliabilityTrendChart = ({ data, aggregation }) => {
    // Definição da unidade do MTBF
    const mtbfUnit = 'h'; 

    if (!data || data.length === 0) {
        return (
            <Card className="p-4 h-full flex items-center justify-center">
                <span className="text-gray-400 text-xs italic">Selecione um período com falhas para análise de tendência.</span>
            </Card>
        );
    }
    
    // Calcula o MTTR e MTBF médio para as linhas de referência
    const totalMTTR = data.reduce((sum, d) => sum + d.mttr, 0);
    const totalMTBF = data.reduce((sum, d) => sum + d.mtbf, 0);
    const avgMTTR = totalMTTR / data.length;
    const avgMTBF = totalMTBF / data.length;

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const mttr = payload.find(p => p.dataKey === 'mttr')?.value;
            const mtbf = payload.find(p => p.dataKey === 'mtbf')?.value;
            const events = payload.find(p => p.dataKey === 'eventCount')?.value;
            
            return (
                <div className="bg-white p-3 border border-slate-200 shadow-xl rounded text-xs">
                    <p className="font-bold text-slate-800 mb-1 border-b border-slate-100 pb-1">{label}</p>
                    <p className="text-slate-600">Eventos: <strong className="text-orange-600">{events}</strong></p>
                    <p className="text-slate-600">MTTR: <strong className="text-red-600">{mttr?.toFixed(1)} min</strong></p>
                    <p className="text-slate-600">MTBF: <strong className="text-green-600">{mtbf?.toFixed(1)} {mtbfUnit}</strong></p>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="p-4 h-full flex flex-col">
            <h3 className="text-sm font-bold uppercase text-slate-600 mb-2">
                Tendência de Confiabilidade ({aggregation.toUpperCase()})
            </h3>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#94A3B8' }} dy={5} />
                        
                        {/* Eixo Y Esquerdo (MTTR - minutos) */}
                        <YAxis 
                            yAxisId="left" 
                            label={{ value: 'MTTR (min)', angle: -90, position: 'insideLeft', fontSize: 10, fill: COLORS.red }} 
                            orientation="left"
                            stroke={COLORS.red}
                            fontSize={10}
                        />
                        
                        {/* Eixo Y Direito (MTBF - horas) */}
                        <YAxis 
                            yAxisId="right" 
                            label={{ value: `MTBF (${mtbfUnit})`, angle: 90, position: 'insideRight', fontSize: 10, fill: COLORS.green }} 
                            orientation="right"
                            stroke={COLORS.green}
                            fontSize={10}
                        />

                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} content={CustomTooltip} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}/>

                        {/* Linha de Referência MTTR Médio */}
                        <ReferenceLine y={avgMTTR} yAxisId="left" stroke={COLORS.red} strokeDasharray="3 3" strokeOpacity={0.5}>
                             <Label value={`Avg MTTR: ${avgMTTR.toFixed(1)} min`} position="insideTopLeft" fontSize={10} fill={COLORS.red} dx={10} />
                        </ReferenceLine>

                         {/* Linha de Referência MTBF Médio */}
                        <ReferenceLine y={avgMTBF} yAxisId="right" stroke={COLORS.green} strokeDasharray="3 3" strokeOpacity={0.5}>
                             <Label value={`Avg MTBF: ${avgMTBF.toFixed(1)} ${mtbfUnit}`} position="insideTopRight" fontSize={10} fill={COLORS.green} dx={-10} />
                        </ReferenceLine>

                        {/* MTTR (Linha - Eixo Esquerdo) */}
                        <Line yAxisId="left" type="monotone" dataKey="mttr" name="MTTR (min)" stroke={COLORS.red} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        
                        {/* MTBF (Linha - Eixo Direito) */}
                        <Line yAxisId="right" type="monotone" dataKey="mtbf" name={`MTBF (${mtbfUnit})`} stroke={COLORS.green} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />

                        {/* Contagem de Eventos (Barras - Eixo Esquerdo) */}
                        <Bar yAxisId="left" dataKey="eventCount" name="Eventos (Cont.)" fill={COLORS.lightGray} opacity={0.3} barSize={10} />
                        
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default ReliabilityTrendChart;