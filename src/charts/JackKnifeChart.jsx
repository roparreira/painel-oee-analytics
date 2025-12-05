import React from 'react';
import { 
    ResponsiveContainer, 
    ScatterChart, 
    Scatter, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Cell, 
    ReferenceArea,
    ReferenceLine,
    Label,
    Legend
} from 'recharts';
import { Card } from '../components/UI';
import { COLORS } from '../config';

const CustomJackKnifeChart = ({ data, title, onPointClick, selectedId, type = "equip" }) => {
    // Defesa: sem dados
    if (!data || data.length === 0) return (
        <Card className="h-full flex items-center justify-center p-4">
            <span className="text-gray-400 text-xs italic">Sem dados suficientes para o gráfico.</span>
        </Card>
    );

    // 1. Definição dos Limites e Domínios (Log Scale)
    const maxFreqData = Math.max(...data.map(d => d.frequency));
    const maxMTTRData = Math.max(...data.map(d => d.mttr));
    
    // Área visível fixa (Domain)
    const xDomain = [0.5, Math.ceil(maxFreqData * 3)]; 
    const yDomain = [0.5, Math.ceil(maxMTTRData * 3)];

    // 2. Limites dos Quadrantes (Linhas Cruzadas)
    // Critério: ~30% do valor máximo dos dados
    const limitFreqCrosshair = Math.max(2, Math.round(maxFreqData * 0.3)); 
    const limitMTTRCrosshair = Math.max(10, Math.round(maxMTTRData * 0.3));

    // 3. Cálculo das Constantes K (Total Downtime)
    const totalDowntimeValues = data.map(d => d.totalDuration);
    const maxTotalDowntime = Math.max(...totalDowntimeValues);
    
    const kAvailabilityLimit = maxTotalDowntime * 0.8; // Linha Vermelha
    const kTargetAvailability = maxTotalDowntime * 0.2; // Linha Verde

    // --- FUNÇÃO GERADORA DE LINHA (Retorna {frequency, mttr}) ---
    const getDiagonalSegment = (k, xMin, xMax, yMin, yMax) => {
        const points = [];
        const eps = 0.0001;

        // Verifica interseção com as 4 bordas
        // 1. Esquerda (frequency = xMin)
        const yAtXMin = k / xMin;
        if (yAtXMin >= yMin - eps && yAtXMin <= yMax + eps) 
            points.push({ frequency: xMin, mttr: yAtXMin });

        // 2. Direita (frequency = xMax)
        const yAtXMax = k / xMax;
        if (yAtXMax >= yMin - eps && yAtXMax <= yMax + eps) 
            points.push({ frequency: xMax, mttr: yAtXMax });

        // 3. Baixo (mttr = yMin)
        const xAtYMin = k / yMin;
        if (xAtYMin >= xMin - eps && xAtYMin <= xMax + eps) 
            points.push({ frequency: xAtYMin, mttr: yMin });

        // 4. Cima (mttr = yMax)
        const xAtYMax = k / yMax;
        if (xAtYMax >= xMin - eps && xAtYMax <= xMax + eps) 
            points.push({ frequency: xAtYMax, mttr: yMax });

        // Ordena por X (frequency) e remove duplicatas
        const unique = points.sort((a, b) => a.frequency - b.frequency).filter((p, i, arr) => {
            if (i === 0) return true;
            return Math.abs(p.frequency - arr[i-1].frequency) > 0.001 || Math.abs(p.mttr - arr[i-1].mttr) > 0.001;
        });

        // Retorna apenas se tivermos um segmento válido (2 pontos)
        if (unique.length < 2) return [];
        return [unique[0], unique[unique.length - 1]];
    };

    const lineRedData = getDiagonalSegment(kAvailabilityLimit, xDomain[0], xDomain[1], yDomain[0], yDomain[1]);
    const lineGreenData = getDiagonalSegment(kTargetAvailability, xDomain[0], xDomain[1], yDomain[0], yDomain[1]);

    // Legenda customizada
    const renderLegend = () => (
        <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-red-500"></div>
                <span className="text-[10px] font-bold text-slate-600 uppercase">Availability Limit</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 border-t-2 border-dashed border-green-500"></div>
                <span className="text-[10px] font-bold text-slate-600 uppercase">Target Availability</span>
            </div>
        </div>
    );

    return (
        <Card className="h-full p-4 flex flex-col relative overflow-hidden">
            <h4 className="text-xs font-bold uppercase text-slate-500 mb-2 flex justify-between items-center">
                <span>{title}</span>
                <span className="text-[10px] font-normal text-slate-400 normal-case">Log-Log Scale</span>
            </h4>
            <div className="flex-1 min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        
                        <XAxis 
                            type="number" 
                            dataKey="frequency" 
                            name="Frequência" 
                            scale="log" 
                            domain={xDomain} 
                            allowDataOverflow={true}
                            tick={{fontSize: 10, fill: '#94a3b8'}}
                            label={{ value: 'Nº de Eventos (Freq) →', position: 'bottom', offset: 0, fontSize: 10, fill: '#64748B' }}
                        />
                        <YAxis 
                            type="number" 
                            dataKey="mttr" 
                            name="MTTR" 
                            scale="log" 
                            domain={yDomain} 
                            allowDataOverflow={true}
                            tick={{fontSize: 10, fill: '#94a3b8'}}
                            label={{ value: 'MTTR (min) →', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748B' }}
                        />

                        {/* --- ÁREAS COLORIDAS (Quadrantes) --- */}
                        <ReferenceArea x1={xDomain[0]} x2={limitFreqCrosshair} y1={yDomain[0]} y2={limitMTTRCrosshair} fill={COLORS.jackKnife.ideal} fillOpacity={0.6} />
                        <ReferenceArea x1={limitFreqCrosshair} x2={xDomain[1]} y1={yDomain[0]} y2={limitMTTRCrosshair} fill={COLORS.jackKnife.chronic} fillOpacity={0.6} />
                        <ReferenceArea x1={xDomain[0]} x2={limitFreqCrosshair} y1={limitMTTRCrosshair} y2={yDomain[1]} fill={COLORS.jackKnife.acute} fillOpacity={0.6} />
                        <ReferenceArea x1={limitFreqCrosshair} x2={xDomain[1]} y1={limitMTTRCrosshair} y2={yDomain[1]} fill={COLORS.jackKnife.acuteChronic} fillOpacity={0.6} />

                        {/* --- RÓTULOS DAS ZONAS --- */}
                        <ReferenceArea x1={xDomain[0]} x2={limitFreqCrosshair} y1={yDomain[0]} y2={limitMTTRCrosshair} fill="none" stroke="none">
                            <Label value="Zona Ideal" position="center" fill="#166534" fontSize={12} fontWeight="900" opacity={0.4}/>
                        </ReferenceArea>
                        <ReferenceArea x1={limitFreqCrosshair} x2={xDomain[1]} y1={yDomain[0]} y2={limitMTTRCrosshair} fill="none" stroke="none">
                            <Label value="Crônico" position="center" fill="#9a3412" fontSize={12} fontWeight="900" opacity={0.4}/>
                        </ReferenceArea>
                        <ReferenceArea x1={xDomain[0]} x2={limitFreqCrosshair} y1={limitMTTRCrosshair} y2={yDomain[1]} fill="none" stroke="none">
                            <Label value="Agudo" position="center" fill="#9a3412" fontSize={12} fontWeight="900" opacity={0.4}/>
                        </ReferenceArea>
                        <ReferenceArea x1={limitFreqCrosshair} x2={xDomain[1]} y1={limitMTTRCrosshair} y2={yDomain[1]} fill="none" stroke="none">
                            <Label value="Agudo + Crônico" position="center" fill="#991b1b" fontSize={12} fontWeight="900" opacity={0.4}/>
                        </ReferenceArea>

                        {/* --- LINHAS CRUZADAS (Crosshair) --- */}
                        <ReferenceLine x={limitFreqCrosshair} stroke={COLORS.darkGray} strokeWidth={2} strokeOpacity={0.8} />
                        <ReferenceLine y={limitMTTRCrosshair} stroke={COLORS.darkGray} strokeWidth={2} strokeOpacity={0.8} />

                        {/* --- LINHAS DIAGONAIS (AGORA USANDO SCATTER) --- */}
                        {/* A "linha" é desenhada conectando os pontos do array 'data' */}
                        <Scatter 
                            name="LimitLine" 
                            data={lineRedData} 
                            line={{ stroke: COLORS.red, strokeWidth: 2 }} 
                            shape={() => null} // Esconde as bolinhas, mostra só a linha
                            legendType="none"
                            isAnimationActive={false}
                        />
                        <Scatter 
                            name="TargetLine" 
                            data={lineGreenData} 
                            line={{ stroke: COLORS.green, strokeWidth: 2, strokeDasharray: '5 5' }} 
                            shape={() => null}
                            legendType="none"
                            isAnimationActive={false}
                        />

                        {/* --- PONTOS DE DADOS REAIS --- */}
                        <Tooltip 
                            cursor={{ strokeDasharray: '3 3' }}
                            content={({ payload }) => {
                                if (payload && payload.length) {
                                    const d = payload[0].payload;
                                    // Ignora tooltip das linhas (que não têm 'name')
                                    if (!d.name) return null; 

                                    return (
                                        <div className="bg-white p-2 border border-slate-200 shadow-xl rounded text-xs z-50">
                                            <p className="font-bold text-slate-800 mb-1 border-b border-slate-100 pb-1">{d.name}</p>
                                            <div className="space-y-1 text-slate-600">
                                                <p>Frequência: <strong className="text-slate-800">{d.frequency}</strong></p>
                                                <p>MTTR: <strong className="text-slate-800">{d.mttr.toFixed(1)} min</strong></p>
                                                <p>Total Parado: <strong className="text-red-600">{(d.totalDuration/60).toFixed(1)} h</strong></p>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-2 italic">Clique para filtrar</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />

                        <Scatter 
                            data={data} 
                            onClick={(e) => onPointClick && onPointClick(e)}
                            cursor="pointer"
                        >
                            {data.map((entry, index) => {
                                const isSelected = selectedId === entry.name;
                                const isFaded = selectedId && !isSelected && type === 'equip';
                                
                                let fill = COLORS.darkGray;
                                if (entry.frequency > limitFreqCrosshair && entry.mttr > limitMTTRCrosshair) fill = '#b91c1c'; 
                                else if (entry.frequency > limitFreqCrosshair || entry.mttr > limitMTTRCrosshair) fill = '#b45309'; 
                                else fill = '#15803d'; 

                                return (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={fill} 
                                        stroke="#ffffff"
                                        strokeWidth={1}
                                        r={isSelected ? 7 : 5}
                                        fillOpacity={isFaded ? 0.2 : 0.9}
                                    />
                                );
                            })}
                        </Scatter>
                        <Legend content={renderLegend} verticalAlign="bottom"/>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default CustomJackKnifeChart;