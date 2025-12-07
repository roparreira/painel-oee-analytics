import React from 'react';
import { 
    ResponsiveContainer, ScatterChart, Scatter, Line, // Adicionando Line para plotar a regressão
    XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { Card } from '../components/UI';
import { COLORS } from '../config';

const getYTickFormatter = (value) => {
    // Converte o valor do eixo Y de volta para Probabilidade Acumulada (%)
    const p = (1 - Math.exp(-Math.exp(value))) * 100;
    if (p < 1) return p.toFixed(2) + '%';
    if (p < 10) return p.toFixed(1) + '%';
    return Math.round(p) + '%';
};

const getXTickFormatter = (value) => {
    // Converte o valor do eixo X de volta para Tempo (Horas)
    const t = Math.exp(value);
    if (t < 10) return t.toFixed(1);
    if (t < 100) return Math.round(t);
    return t.toFixed(0); 
};

const WeibullChart = ({ plotData, ttfUnits = "horas" }) => {
    // plotData é o objeto retornado por calculateWeibullData
    const data = plotData.data || [];
    const lineData = plotData.lineData || [];

    if (data.length === 0) {
        return (
            <div className="flex h-full items-center justify-center text-xs text-gray-400 italic">
                Aguardando dados (Mínimo de 3 falhas necessárias).
            </div>
        );
    }
    
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const d = payload.find(p => p.dataKey === 'x')?.payload; // Pega o payload dos pontos (Scatter)
            
            // Verifica se é o tooltip da linha de regressão
            if (payload.find(p => p.dataKey === 'yLine')) {
                 const xLine = payload.find(p => p.dataKey === 'x')?.value; // Pega o X do tooltip da linha
                 const yLine = payload.find(p => p.dataKey === 'yLine')?.value; // Pega o Y da linha

                 const t = Math.exp(xLine);
                 const p = (1 - Math.exp(-Math.exp(yLine))) * 100;
                 
                 return (
                    <div className="bg-white p-3 border border-slate-200 shadow-xl rounded text-xs">
                        <p className="font-bold text-slate-800 mb-1">Linha de Regressão</p>
                        <p className="text-slate-600">Vida (T): <strong className="text-gray-600">{t.toFixed(1)} {ttfUnits}</strong></p>
                        <p className="text-slate-600">F(T) Projetada: <strong className="text-gray-600">{p.toFixed(1)}%</strong></p>
                    </div>
                 );
            }

            return (
                <div className="bg-white p-3 border border-slate-200 shadow-xl rounded text-xs">
                    <p className="font-bold text-slate-800 mb-1">Ponto de Falha #{d.rank}</p>
                    <p className="text-slate-600">Tempo de Vida (T): <strong className="text-blue-600">{d.ttf.toFixed(2)} {ttfUnits}</strong></p>
                    <p className="text-slate-600">Probabilidade de Falha (F): <strong className="text-red-600">{(d.medianRank * 100).toFixed(2)}%</strong></p>
                    <p className="text-slate-400 mt-1 italic text-[10px]">Eixo Y plotado em ln(ln(1/(1-F)))</p>
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5EEFE" />
                
                <XAxis 
                    type="number" 
                    dataKey="x" 
                    name={`Tempo de Vida (T) - ln(${ttfUnits})`}
                    domain={['auto', 'auto']}
                    tickFormatter={getXTickFormatter} 
                    scale="linear" 
                    tick={{ fontSize: 10, fill: COLORS.darkGray }}
                    label={{ value: `Tempo de Vida (TTF) - ${ttfUnits}`, position: 'bottom', offset: 0, fontSize: 11, fill: COLORS.darkGray }}
                />

                <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="Probabilidade de Falha (F)"
                    domain={['auto', 'auto']}
                    tickFormatter={getYTickFormatter} 
                    scale="linear"
                    tick={{ fontSize: 10, fill: COLORS.darkGray }}
                    label={{ value: 'Probabilidade Acumulada de Falha', angle: -90, position: 'insideLeft', fontSize: 11, fill: COLORS.darkGray }}
                />

                <Tooltip cursor={{ strokeDasharray: '4 4' }} content={CustomTooltip} />
                <Legend layout="horizontal" verticalAlign="top" align="center" wrapperStyle={{ paddingTop: '10px' }} />

                {/* 1. Pontos de Falha (TTF vs Rank de Mediana) */}
                <Scatter 
                    name="Pontos de Falha" 
                    data={data} 
                    dataKey="y" // O eixo Y dos pontos é 'y'
                    fill={COLORS.blue} 
                    stroke={COLORS.darkGray}
                    strokeWidth={1}
                    shape="circle" 
                    r={5}
                />

                {/* 2. Linha de Regressão (Ajuste) */}
                {lineData.length > 0 && (
                    <Line
                        data={lineData}
                        dataKey="y" // O eixo Y da linha de regressão
                        name={`Regressão (β:${plotData.parameters.beta}, η:${plotData.parameters.eta})`}
                        stroke={COLORS.red}
                        strokeWidth={2}
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                    />
                )}
            </ScatterChart>
        </ResponsiveContainer>
    );
};

export default WeibullChart;