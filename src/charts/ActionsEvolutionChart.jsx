import React, { useState, memo } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import { ChevronDown } from 'lucide-react';
import { Card } from '../components/UI';

const CHART_COLORS = {
    abertas: '#f97316',    // orange
    previstas: '#3b82f6',  // blue
    concluidas: '#22c55e', // green
    acumulado: '#ef4444',  // red
};

const ActionsEvolutionChart = memo(({ data, title = "Evolução de Ações" }) => {
    const [aggregation, setAggregation] = useState('month');

    // Função para calcular a chave do período baseada na agregação
    const getPeriodKey = (dateStr) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;

        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();

        switch (aggregation) {
            case 'day':
                return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            case 'week':
                const startOfYear = new Date(year, 0, 1);
                const weekNum = Math.ceil(((date - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
                return `${year}-S${String(weekNum).padStart(2, '0')}`;
            case 'month':
                return `${year}-${String(month + 1).padStart(2, '0')}`;
            case 'quarter':
                return `${year}-T${Math.ceil((month + 1) / 3)}`;
            case 'semester':
                return `${year}-${month < 6 ? '1S' : '2S'}`;
            case 'year':
                return `${year}`;
            default:
                return `${year}-${String(month + 1).padStart(2, '0')}`;
        }
    };

    const formatPeriodLabel = (period, agg) => {
        if (agg === 'day') return period.slice(5);
        if (agg === 'week') return period.slice(5);
        if (agg === 'month') return `${period.slice(5)}/${period.slice(2, 4)}`;
        return period;
    };

    // Processar dados
    const chartData = React.useMemo(() => {
        if (!data || data.length === 0) return [];

        const abertas = {};
        const previstas = {};
        const concluidas = {};
        const allPeriods = new Set();

        data.forEach(d => {
            const periodAbertura = getPeriodKey(d.OCORRENCIA);
            if (periodAbertura) {
                abertas[periodAbertura] = (abertas[periodAbertura] || 0) + 1;
                allPeriods.add(periodAbertura);
            }

            const prazoData = d.PRAZO_EXTENDIDO || d.PRAZO;
            const periodPrevista = getPeriodKey(prazoData);
            if (periodPrevista) {
                previstas[periodPrevista] = (previstas[periodPrevista] || 0) + 1;
                allPeriods.add(periodPrevista);
            }

            const periodConcluida = getPeriodKey(d.DATA_STATUS_ACAO);
            if (periodConcluida) {
                concluidas[periodConcluida] = (concluidas[periodConcluida] || 0) + 1;
                allPeriods.add(periodConcluida);
            }
        });

        const sortedPeriods = [...allPeriods].sort();
        let runningTotal = 0;

        // Calcular total inicial
        const firstPeriod = sortedPeriods[0];
        data.forEach(d => {
            const periodAbertura = getPeriodKey(d.OCORRENCIA);
            const periodConcluida = getPeriodKey(d.DATA_STATUS_ACAO);
            if (periodAbertura && periodAbertura < firstPeriod) runningTotal++;
            if (periodConcluida && periodConcluida < firstPeriod) runningTotal--;
        });

        const maxPeriods = aggregation === 'day' ? 30 : aggregation === 'week' ? 20 : 12;
        const visiblePeriods = sortedPeriods.slice(-maxPeriods);

        return visiblePeriods.map(period => {
            runningTotal += (abertas[period] || 0) - (concluidas[period] || 0);
            return {
                period,
                label: formatPeriodLabel(period, aggregation),
                abertas: abertas[period] || 0,
                previstas: previstas[period] || 0,
                concluidas: concluidas[period] || 0,
                acumulado: runningTotal,
            };
        });
    }, [data, aggregation]);

    if (!chartData || chartData.length === 0) {
        return (
            <Card className="p-4">
                <h3 className="text-sm font-bold text-slate-700 mb-3">{title}</h3>
                <div className="flex h-48 items-center justify-center text-xs text-gray-400 italic">Sem dados para exibir</div>
            </Card>
        );
    }

    const maxBarValue = Math.max(...chartData.map(d => Math.max(d.abertas, d.previstas, d.concluidas))) || 1;
    const maxLineValue = Math.max(...chartData.map(d => d.acumulado)) || 1;

    return (
        <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-700">{title}</h3>
                <div className="relative">
                    <select
                        value={aggregation}
                        onChange={(e) => setAggregation(e.target.value)}
                        className="appearance-none bg-white border border-slate-200 text-slate-700 py-1.5 pl-3 pr-8 rounded-lg text-xs font-bold cursor-pointer shadow-sm"
                    >
                        <option value="day">Diário</option>
                        <option value="week">Semanal</option>
                        <option value="month">Mensal</option>
                        <option value="quarter">Trimestral</option>
                        <option value="semester">Semestral</option>
                        <option value="year">Anual</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-2 text-slate-400 pointer-events-none" />
                </div>
            </div>

            <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={chartData} margin={{ top: 10, right: 40, left: 0, bottom: 5 }}>
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
                        yAxisId="left"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#94A3B8' }}
                        domain={[0, 'auto']}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#ef4444' }}
                        domain={[0, 'auto']}
                    />
                    <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        contentStyle={{
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            fontSize: '12px'
                        }}
                        formatter={(value, name) => {
                            const labels = {
                                abertas: 'Abertas',
                                previstas: 'Previstas',
                                concluidas: 'Concluídas',
                                acumulado: 'Acumulado',
                            };
                            return [value, labels[name] || name];
                        }}
                    />
                    <Legend
                        wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                        formatter={(value) => {
                            const labels = {
                                abertas: 'Abertas',
                                previstas: 'Previstas',
                                concluidas: 'Concluídas',
                                acumulado: 'Acumulado',
                            };
                            return labels[value] || value;
                        }}
                    />
                    <Bar
                        yAxisId="left"
                        dataKey="abertas"
                        name="abertas"
                        fill={CHART_COLORS.abertas}
                        barSize={12}
                        radius={[4, 4, 0, 0]}
                    />
                    <Bar
                        yAxisId="left"
                        dataKey="previstas"
                        name="previstas"
                        fill={CHART_COLORS.previstas}
                        barSize={12}
                        radius={[4, 4, 0, 0]}
                    />
                    <Bar
                        yAxisId="left"
                        dataKey="concluidas"
                        name="concluidas"
                        fill={CHART_COLORS.concluidas}
                        barSize={12}
                        radius={[4, 4, 0, 0]}
                    />
                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="acumulado"
                        name="acumulado"
                        stroke={CHART_COLORS.acumulado}
                        strokeWidth={3}
                        dot={{ fill: CHART_COLORS.acumulado, r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </Card>
    );
});

export default ActionsEvolutionChart;
