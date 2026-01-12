import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, CheckCircle, Clock, Users, MapPin, Calendar, TrendingUp, FileText, Filter, X, ChevronDown, RefreshCw, Database, DollarSign, BarChart3, ClipboardList, AlertCircle } from 'lucide-react';
import { Card } from './UI';
import ActionsEvolutionChart from '../charts/ActionsEvolutionChart';
import ActionsParetoChart from '../charts/ActionsParetoChart';

// Cores do tema
const COLORS = {
    orange: '#f97316',
    blue: '#3b82f6',
    green: '#22c55e',
    red: '#ef4444',
    yellow: '#eab308',
    purple: '#a855f7',
    slate: '#64748b',
};

const STATUS_COLORS = {
    'Finalizado': '#22c55e',
    'Finalizado Atrasado': '#eab308',
    'No Prazo': '#3b82f6',
    'Atrasado': '#ef4444',
    'COMP': '#22c55e',
    'FECHAR': '#22c55e',
    'CONCLUIDO': '#22c55e',
    'EMAND': '#3b82f6',
    'EM ANDAMENTO': '#3b82f6',
    'AGUARD': '#eab308',
    'PENDENTE': '#eab308',
    'NOVO': '#a855f7',
    'CANCEL': '#64748b',
    'N/A': '#64748b',
};

// Big Number Card - Estilo OEE Dashboard
function BigNumberCard({ title, value, subtitle, icon: Icon, color = COLORS.orange }) {
    return (
        <Card className="p-3 flex flex-col justify-between h-full border-t-4" style={{ borderTopColor: color }}>
            <div>
                <div className="flex justify-between items-start">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
                    {Icon && <div className="p-1.5 rounded-full bg-slate-50"><Icon size={14} style={{ color }} /></div>}
                </div>
                <h3 className="text-2xl font-bold mt-1 tracking-tight" style={{ color }}>{value}</h3>
            </div>
            {subtitle && (
                <div className="mt-2 pt-2 border-t border-slate-50">
                    <p className="text-[10px] text-slate-400">{subtitle}</p>
                </div>
            )}
        </Card>
    );
}

// Status Badge - Estilo OEE Dashboard
function StatusBadge({ status, count, onClick, selected }) {
    const statusColors = {
        'CONCLUÍDO': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', bar: 'bg-green-500' },
        'Finalizado': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', bar: 'bg-green-500' },
        'Finalizado Atrasado': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', bar: 'bg-yellow-500' },
        'No Prazo': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', bar: 'bg-blue-500' },
        'Atrasado': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', bar: 'bg-red-500' },
        'COMP': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', bar: 'bg-green-500' },
        'FECHAR': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', bar: 'bg-green-500' },
        'EM ANDAMENTO': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', bar: 'bg-blue-500' },
        'EMAND': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', bar: 'bg-blue-500' },
        'PENDENTE': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', bar: 'bg-yellow-500' },
        'AGUARD': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', bar: 'bg-yellow-500' },
        'NOVO': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', bar: 'bg-purple-500' },
        'default': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', bar: 'bg-slate-500' },
    };
    const colors = statusColors[status] || statusColors.default;

    return (
        <Card
            className={`p-3 flex flex-col justify-between cursor-pointer transition-all hover:shadow-md ${selected ? 'ring-2 ring-orange-400' : ''}`}
            onClick={onClick}
        >
            <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold uppercase ${colors.text} truncate`}>{status}</span>
                <span className={`text-lg font-bold ${colors.text}`}>{count}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${colors.bar}`} style={{ width: '100%' }} />
            </div>
        </Card>
    );
}

// Pareto Bar with click filter
function ParetoBar({ data, title, maxItems = 10, color = 'bg-orange-500', onItemClick, selectedItem }) {
    const sortedData = [...data].sort((a, b) => b.count - a.count).slice(0, maxItems);
    const maxCount = sortedData[0]?.count || 1;
    return (
        <Card className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-700">{title}</h3>
                {selectedItem && (
                    <button
                        onClick={() => onItemClick && onItemClick(null)}
                        className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full flex items-center gap-1 hover:bg-orange-200 transition-colors"
                    >
                        {selectedItem} <X size={10} />
                    </button>
                )}
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
                {sortedData.map((item, i) => (
                    <div
                        key={i}
                        className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-all ${selectedItem === item.name
                            ? 'bg-orange-50 ring-2 ring-orange-400'
                            : 'hover:bg-slate-50'
                            }`}
                        onClick={() => onItemClick && onItemClick(selectedItem === item.name ? null : item.name)}
                    >
                        <span className="text-xs text-slate-600 w-24 truncate font-medium" title={item.name}>{item.name || '(vazio)'}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                            <div
                                className={`h-full ${selectedItem === item.name ? 'bg-orange-500' : color} rounded-full transition-all`}
                                style={{ width: `${(item.count / maxCount) * 100}%` }}
                            />
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-8 text-right">{item.count}</span>
                    </div>
                ))}
                {sortedData.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Sem dados</p>}
            </div>
        </Card>
    );
}

// Gráfico de linha de tempo de ações
function ActionsTimelineChart({ data }) {
    const [aggregation, setAggregation] = useState('month');

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return { periods: [], abertas: {}, previstas: {}, concluidas: {}, acumulado: {} };

        // Função para calcular a chave do período baseada na agregação
        const getPeriodKey = (dateStr) => {
            if (!dateStr) return null;
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return null;

            const year = date.getFullYear();
            const month = date.getMonth();
            const day = date.getDate();
            const week = Math.ceil((day + new Date(year, month, 1).getDay()) / 7);

            switch (aggregation) {
                case 'day':
                    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                case 'week':
                    const startOfYear = new Date(year, 0, 1);
                    const weekNum = Math.ceil(((date - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
                    return `${year}-S${String(weekNum).padStart(2, '0')}`;
                case 'fortnight':
                    const fn = Math.ceil((month * 2 + (day > 15 ? 2 : 1)) / 1);
                    return `${year}-Q${String(Math.ceil((month + 1) / 1)).padStart(2, '0')}-${day > 15 ? '2' : '1'}`;
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

        const abertas = {};    // Por OCORRENCIA
        const previstas = {};   // Por PRAZO ou PRAZO_EXTENDIDO
        const concluidas = {};  // Por DATA_STATUS_ACAO
        const allPeriods = new Set();

        data.forEach(d => {
            // Abertas: baseado na data de ocorrência
            const periodAbertura = getPeriodKey(d.OCORRENCIA);
            if (periodAbertura) {
                abertas[periodAbertura] = (abertas[periodAbertura] || 0) + 1;
                allPeriods.add(periodAbertura);
            }

            // Previstas: baseado no prazo (estendido tem prioridade)
            const prazoData = d.PRAZO_EXTENDIDO || d.PRAZO;
            const periodPrevista = getPeriodKey(prazoData);
            if (periodPrevista) {
                previstas[periodPrevista] = (previstas[periodPrevista] || 0) + 1;
                allPeriods.add(periodPrevista);
            }

            // Concluídas: baseado na data de conclusão
            const periodConcluida = getPeriodKey(d.DATA_STATUS_ACAO);
            if (periodConcluida) {
                concluidas[periodConcluida] = (concluidas[periodConcluida] || 0) + 1;
                allPeriods.add(periodConcluida);
            }
        });

        // Ordenar períodos e calcular acumulado
        const sortedPeriods = [...allPeriods].sort();
        const acumulado = {};
        let runningTotal = 0;

        // Calcular total inicial (ações abertas antes do primeiro período visível)
        const firstPeriod = sortedPeriods[0];
        data.forEach(d => {
            const periodAbertura = getPeriodKey(d.OCORRENCIA);
            const periodConcluida = getPeriodKey(d.DATA_STATUS_ACAO);
            if (periodAbertura && periodAbertura < firstPeriod) runningTotal++;
            if (periodConcluida && periodConcluida < firstPeriod) runningTotal--;
        });

        sortedPeriods.forEach(period => {
            runningTotal += (abertas[period] || 0) - (concluidas[period] || 0);
            acumulado[period] = runningTotal;
        });

        // Limitar a exibição baseada na agregação
        const maxPeriods = aggregation === 'day' ? 30 : aggregation === 'week' ? 20 : 12;
        const visiblePeriods = sortedPeriods.slice(-maxPeriods);

        return { periods: visiblePeriods, abertas, previstas, concluidas, acumulado };
    }, [data, aggregation]);

    if (!chartData.periods || chartData.periods.length === 0) {
        return (
            <Card className="p-4">
                <h3 className="text-sm font-bold text-slate-700 mb-3">Evolução de Ações</h3>
                <p className="text-xs text-slate-400 text-center py-8">Sem dados para exibir</p>
            </Card>
        );
    }

    // Calcular escalas separadas para barras e linha
    const maxBarValue = Math.max(
        ...chartData.periods.map(p => Math.max(
            chartData.abertas[p] || 0,
            chartData.previstas[p] || 0,
            chartData.concluidas[p] || 0
        ))
    ) || 1;

    const maxLineValue = Math.max(...chartData.periods.map(p => chartData.acumulado[p] || 0)) || 1;

    const formatPeriod = (period) => {
        if (aggregation === 'day') return period.slice(5);
        if (aggregation === 'week') return period.slice(5);
        if (aggregation === 'month') return `${period.slice(5)}/${period.slice(2, 4)}`;
        if (aggregation === 'quarter') return period;
        if (aggregation === 'semester') return period;
        return period;
    };

    const chartHeight = 200;
    const chartWidth = Math.max(chartData.periods.length * 60, 600);
    const barAreaWidth = 45;
    const barWidth = 12;

    return (
        <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <TrendingUp size={16} /> Evolução de Ações
                </h3>
                <div className="relative">
                    <select
                        value={aggregation}
                        onChange={(e) => setAggregation(e.target.value)}
                        className="appearance-none bg-white border border-slate-200 text-slate-700 py-1.5 pl-3 pr-8 rounded-lg text-xs font-bold cursor-pointer shadow-sm"
                    >
                        <option value="day">Diário</option>
                        <option value="week">Semanal</option>
                        <option value="fortnight">Quinzenal</option>
                        <option value="month">Mensal</option>
                        <option value="quarter">Trimestral</option>
                        <option value="semester">Semestral</option>
                        <option value="year">Anual</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-2 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap gap-4 mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 rounded bg-orange-500" />
                    <span className="text-slate-600 font-medium">Abertas</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 rounded bg-blue-500" />
                    <span className="text-slate-600 font-medium">Previstas</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 rounded bg-green-500" />
                    <span className="text-slate-600 font-medium">Concluídas</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-8 h-0.5 bg-red-500 rounded" />
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-slate-600 font-medium">Acumulado Aberto</span>
                </div>
            </div>

            {/* Gráfico */}
            <div className="relative overflow-x-auto">
                <div className="flex">
                    {/* Eixo Y esquerdo (barras) */}
                    <div className="flex flex-col justify-between h-[200px] pr-2 text-right">
                        <span className="text-[10px] text-slate-400">{maxBarValue}</span>
                        <span className="text-[10px] text-slate-400">{Math.round(maxBarValue / 2)}</span>
                        <span className="text-[10px] text-slate-400">0</span>
                    </div>

                    {/* Área do gráfico */}
                    <div className="relative flex-1" style={{ minWidth: chartWidth }}>
                        {/* Grid horizontal */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                            <div className="border-b border-slate-100 border-dashed" />
                            <div className="border-b border-slate-100 border-dashed" />
                            <div className="border-b border-slate-200" />
                        </div>

                        {/* Barras */}
                        <div className="flex items-end h-[200px] relative z-10">
                            {chartData.periods.map((period, i) => {
                                const abertas = chartData.abertas[period] || 0;
                                const previstas = chartData.previstas[period] || 0;
                                const concluidas = chartData.concluidas[period] || 0;
                                const acumulado = chartData.acumulado[period] || 0;

                                return (
                                    <div
                                        key={i}
                                        className="flex-1 flex flex-col items-center justify-end group relative"
                                        style={{ minWidth: 55 }}
                                    >
                                        {/* Tooltip on hover */}
                                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-20">
                                            <div className="bg-slate-800 text-white text-[10px] rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                                                <div className="font-bold text-orange-300 mb-1">{formatPeriod(period)}</div>
                                                <div className="flex items-center gap-2"><span className="w-2 h-2 bg-orange-500 rounded" />Abertas: <b>{abertas}</b></div>
                                                <div className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded" />Previstas: <b>{previstas}</b></div>
                                                <div className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded" />Concluídas: <b>{concluidas}</b></div>
                                                <div className="flex items-center gap-2 border-t border-slate-600 mt-1 pt-1"><span className="w-2 h-2 bg-red-500 rounded" />Acumulado: <b>{acumulado}</b></div>
                                            </div>
                                        </div>
                                        <div className="flex items-end gap-1 mb-1 cursor-pointer">
                                            <div
                                                className="bg-orange-500 rounded-t transition-all hover:bg-orange-400"
                                                style={{
                                                    width: barWidth,
                                                    height: `${(abertas / maxBarValue) * (chartHeight - 20)}px`
                                                }}
                                            />
                                            <div
                                                className="bg-blue-500 rounded-t transition-all hover:bg-blue-400"
                                                style={{
                                                    width: barWidth,
                                                    height: `${(previstas / maxBarValue) * (chartHeight - 20)}px`
                                                }}
                                            />
                                            <div
                                                className="bg-green-500 rounded-t transition-all hover:bg-green-400"
                                                style={{
                                                    width: barWidth,
                                                    height: `${(concluidas / maxBarValue) * (chartHeight - 20)}px`
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Linha SVG do acumulado */}
                        <svg
                            className="absolute inset-0 pointer-events-none overflow-visible"
                            viewBox={`0 0 ${chartData.periods.length * 55} ${chartHeight}`}
                            preserveAspectRatio="none"
                            style={{ width: '100%', height: chartHeight }}
                        >
                            <polyline
                                fill="none"
                                stroke="#ef4444"
                                strokeWidth="3"
                                strokeLinejoin="round"
                                strokeLinecap="round"
                                points={chartData.periods.map((period, i) => {
                                    const acumulado = chartData.acumulado[period] || 0;
                                    const x = (i + 0.5) * 55;
                                    const y = chartHeight - 10 - ((acumulado / maxLineValue) * (chartHeight - 30));
                                    return `${x},${y}`;
                                }).join(' ')}
                            />
                            {chartData.periods.map((period, i) => {
                                const acumulado = chartData.acumulado[period] || 0;
                                const x = (i + 0.5) * 55;
                                const y = chartHeight - 10 - ((acumulado / maxLineValue) * (chartHeight - 30));
                                return (
                                    <g key={i}>
                                        <circle
                                            cx={x}
                                            cy={y}
                                            r="6"
                                            fill="#ef4444"
                                            stroke="white"
                                            strokeWidth="2"
                                        />
                                        <title>Acumulado: {acumulado}</title>
                                    </g>
                                );
                            })}
                        </svg>
                    </div>

                    {/* Eixo Y direito (linha) */}
                    <div className="flex flex-col justify-between h-[200px] pl-2 text-left">
                        <span className="text-[10px] text-red-500 font-bold">{maxLineValue}</span>
                        <span className="text-[10px] text-red-400">{Math.round(maxLineValue / 2)}</span>
                        <span className="text-[10px] text-red-400">0</span>
                    </div>
                </div>

                {/* Labels do eixo X */}
                <div className="flex mt-2" style={{ marginLeft: 25, marginRight: 25 }}>
                    {chartData.periods.map((period, i) => (
                        <div key={i} className="flex-1 text-center" style={{ minWidth: 55 }}>
                            <span className="text-[10px] text-slate-500 font-medium">
                                {formatPeriod(period)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
}

// ========== COMPONENTE PRINCIPAL ==========
export default function FailuresAnalysisDashboard({ activeSubTab = 'rcfas', setActiveSubTab }) {
    // activeSubTab is now received from props (controlled by Sidebar)

    // Default date range: 01/01/2025 to today
    const getDefaultDateRange = () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return { start: '2025-01-01', end: `${yyyy}-${mm}-${dd}` };
    };
    const defaultRange = getDefaultDateRange();

    // Dados RCFAs
    const [afData, setAfData] = useState(null);
    const [afLoading, setAfLoading] = useState(true);
    const [afError, setAfError] = useState(null);
    const [afLastUpdated, setAfLastUpdated] = useState(null);

    // Dados Ações
    const [acoesData, setAcoesData] = useState(null);
    const [acoesLoading, setAcoesLoading] = useState(true);
    const [acoesError, setAcoesError] = useState(null);
    const [acoesLastUpdated, setAcoesLastUpdated] = useState(null);

    // Filtros RCFAs (date range)
    const [rcfaDateRange, setRcfaDateRange] = useState(defaultRange);
    const [selectedLocal, setSelectedLocal] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState(null);

    // Filtros Ações (date range)
    const [acoesDateRange, setAcoesDateRange] = useState(defaultRange);
    const [selectedAcaoStatus, setSelectedAcaoStatus] = useState(null);
    const [selectedResponsavel, setSelectedResponsavel] = useState(null);
    const [selectedAcaoLocal, setSelectedAcaoLocal] = useState(null);
    const [selectedTipoAcao, setSelectedTipoAcao] = useState(null);
    const [showOnlyAtrasadas, setShowOnlyAtrasadas] = useState(false);

    // Carregar dados RCFAs
    useEffect(() => {
        const loadData = async () => {
            setAfLoading(true);
            setAfError(null);
            try {
                const response = await fetch('/af_data.json');
                if (!response.ok) throw new Error('Arquivo af_data.json não encontrado');
                const json = await response.json();
                setAfData(json.data || []);
                setAfLastUpdated(json.lastUpdated);
            } catch (err) {
                setAfError(err.message);
                setAfData([]);
            } finally {
                setAfLoading(false);
            }
        };
        loadData();
    }, []);

    // Carregar dados Ações
    useEffect(() => {
        const loadData = async () => {
            setAcoesLoading(true);
            setAcoesError(null);
            try {
                const response = await fetch('/af_acoes.json');
                if (!response.ok) throw new Error('Arquivo af_acoes.json não encontrado');
                const json = await response.json();
                setAcoesData(json.data || []);
                setAcoesLastUpdated(json.lastUpdated);
            } catch (err) {
                setAcoesError(err.message);
                setAcoesData([]);
            } finally {
                setAcoesLoading(false);
            }
        };
        loadData();
    }, []);

    // Opções de filtro RCFAs
    const rcfaFilterOptions = useMemo(() => {
        if (!afData || afData.length === 0) return { locals: [], statuses: [] };
        const locals = [...new Set(afData.map(d => d.LOCAL).filter(Boolean))].sort();
        const statuses = [...new Set(afData.map(d => d.STATUS_RCFA).filter(Boolean))].sort();
        return { locals, statuses };
    }, [afData]);

    // Opções de filtro Ações
    const acoesFilterOptions = useMemo(() => {
        if (!acoesData || acoesData.length === 0) return { statuses: [], responsaveis: [] };
        const statuses = [...new Set(acoesData.map(d => d.STATUS_ACAO).filter(Boolean))].sort();
        const responsaveis = [...new Set(acoesData.map(d => d.RESPONSAVEL).filter(Boolean))].sort();
        return { statuses, responsaveis };
    }, [acoesData]);

    // Dados filtrados RCFAs
    const filteredRcfaData = useMemo(() => {
        if (!afData) return [];
        return afData.filter(d => {
            if (rcfaDateRange.start && d.OCORRENCIA < rcfaDateRange.start) return false;
            if (rcfaDateRange.end && d.OCORRENCIA > rcfaDateRange.end) return false;
            if (selectedLocal && d.LOCAL !== selectedLocal) return false;
            if (selectedStatus && d.STATUS_RCFA !== selectedStatus) return false;
            return true;
        });
    }, [afData, rcfaDateRange, selectedLocal, selectedStatus]);

    // Dados filtrados Ações
    const filteredAcoesData = useMemo(() => {
        if (!acoesData) return [];
        return acoesData.filter(d => {
            if (acoesDateRange.start && d.OCORRENCIA < acoesDateRange.start) return false;
            if (acoesDateRange.end && d.OCORRENCIA > acoesDateRange.end) return false;
            if (selectedAcaoStatus && d.STATUS_CALCULADO !== selectedAcaoStatus) return false;
            if (selectedResponsavel && d.RESPONSAVEL !== selectedResponsavel) return false;
            if (selectedAcaoLocal && d.LOCAL !== selectedAcaoLocal) return false;
            if (selectedTipoAcao && d.TIPO_ACAO !== selectedTipoAcao) return false;
            if (showOnlyAtrasadas && !d.ATRASADA) return false;
            return true;
        });
    }, [acoesData, acoesDateRange, selectedAcaoStatus, selectedResponsavel, selectedAcaoLocal, selectedTipoAcao, showOnlyAtrasadas]);

    // Estatísticas RCFAs
    const rcfaStats = useMemo(() => {
        if (!filteredRcfaData || filteredRcfaData.length === 0) {
            return { total: 0, byStatus: [], byLocal: [], byYear: [], totalCusto: 0 };
        }
        const byStatus = Object.entries(
            filteredRcfaData.reduce((acc, d) => { acc[d.STATUS_RCFA || 'N/A'] = (acc[d.STATUS_RCFA || 'N/A'] || 0) + 1; return acc; }, {})
        ).map(([name, count]) => ({ name, count }));
        const byLocal = Object.entries(
            filteredRcfaData.reduce((acc, d) => { acc[d.LOCAL || 'N/A'] = (acc[d.LOCAL || 'N/A'] || 0) + 1; return acc; }, {})
        ).map(([name, count]) => ({ name, count }));
        const byYear = Object.entries(
            filteredRcfaData.reduce((acc, d) => { acc[d.ANO || 'N/A'] = (acc[d.ANO || 'N/A'] || 0) + 1; return acc; }, {})
        ).map(([name, count]) => ({ name, count })).sort((a, b) => b.name - a.name);
        const totalCusto = filteredRcfaData.reduce((sum, d) => sum + (parseFloat(d.CUSTO) || 0), 0);
        return { total: filteredRcfaData.length, byStatus, byLocal, byYear, totalCusto };
    }, [filteredRcfaData]);

    // Estatísticas Ações
    const acoesStats = useMemo(() => {
        if (!filteredAcoesData || filteredAcoesData.length === 0) {
            return { total: 0, atrasadas: 0, concluidas: 0, finalizadoAtrasado: 0, noPrazo: 0, byStatus: [], byResponsavel: [], byTipoAcao: [] };
        }
        // Usar STATUS_CALCULADO para estatísticas
        const atrasadas = filteredAcoesData.filter(d => d.STATUS_CALCULADO === 'Atrasado').length;
        const concluidas = filteredAcoesData.filter(d => d.STATUS_CALCULADO === 'Finalizado').length;
        const finalizadoAtrasado = filteredAcoesData.filter(d => d.STATUS_CALCULADO === 'Finalizado Atrasado').length;
        const noPrazo = filteredAcoesData.filter(d => d.STATUS_CALCULADO === 'No Prazo').length;
        const byStatus = Object.entries(
            filteredAcoesData.reduce((acc, d) => { acc[d.STATUS_CALCULADO || 'N/A'] = (acc[d.STATUS_CALCULADO || 'N/A'] || 0) + 1; return acc; }, {})
        ).map(([name, count]) => ({ name, count }));
        const byResponsavel = Object.entries(
            filteredAcoesData.reduce((acc, d) => { acc[d.RESPONSAVEL || 'N/A'] = (acc[d.RESPONSAVEL || 'N/A'] || 0) + 1; return acc; }, {})
        ).map(([name, count]) => ({ name, count }));
        const byTipoAcao = Object.entries(
            filteredAcoesData.reduce((acc, d) => { acc[d.TIPO_ACAO || 'N/A'] = (acc[d.TIPO_ACAO || 'N/A'] || 0) + 1; return acc; }, {})
        ).map(([name, count]) => ({ name, count }));
        const byLocal = Object.entries(
            filteredAcoesData.reduce((acc, d) => { acc[d.LOCAL || 'N/A'] = (acc[d.LOCAL || 'N/A'] || 0) + 1; return acc; }, {})
        ).map(([name, count]) => ({ name, count }));
        return { total: filteredAcoesData.length, atrasadas, concluidas, finalizadoAtrasado, noPrazo, byStatus, byResponsavel, byTipoAcao, byLocal };
    }, [filteredAcoesData]);

    const clearRcfaFilters = () => { setRcfaDateRange({ start: '', end: '' }); setSelectedLocal(null); setSelectedStatus(null); };
    const clearAcoesFilters = () => { setAcoesDateRange({ start: '', end: '' }); setSelectedAcaoStatus(null); setSelectedResponsavel(null); setSelectedAcaoLocal(null); setSelectedTipoAcao(null); setShowOnlyAtrasadas(false); };

    const loading = activeSubTab === 'rcfas' ? afLoading : acoesLoading;
    const error = activeSubTab === 'rcfas' ? afError : acoesError;
    const lastUpdated = activeSubTab === 'rcfas' ? afLastUpdated : acoesLastUpdated;

    const hasRcfaFilters = rcfaDateRange.start || rcfaDateRange.end || selectedLocal || selectedStatus;
    const hasAcoesFilters = acoesDateRange.start || acoesDateRange.end || selectedAcaoStatus || selectedResponsavel || selectedAcaoLocal || selectedTipoAcao || showOnlyAtrasadas;

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw size={48} className="animate-spin text-orange-500 mx-auto mb-4" />
                    <p className="text-slate-600 font-bold">Carregando dados...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex items-center justify-center p-6">
                <Card className="p-8 max-w-lg text-center border-t-4 border-red-500">
                    <Database size={48} className="text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-700 mb-2">Dados não disponíveis</h2>
                    <p className="text-sm text-slate-500 mb-4">{error}</p>
                    <div className="bg-slate-100 rounded-lg p-4 text-left">
                        <p className="text-xs font-bold text-slate-600 mb-2">Para sincronizar:</p>
                        <code className="text-xs bg-white px-2 py-1 rounded block">
                            {activeSubTab === 'rcfas' ? '.\\scripts\\sync_af_data.ps1' : '.\\scripts\\sync_af_acoes.ps1'}
                        </code>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 shadow-sm shrink-0 z-20">
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                    {/* Título */}
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <FileText size={20} className="text-orange-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-700">
                                {activeSubTab === 'rcfas' ? 'RCFAs' : 'Ações'}
                            </h2>
                            <p className="text-[10px] text-slate-400">{lastUpdated ? `Atualizado: ${lastUpdated}` : 'Maximo/Oracle'}</p>
                        </div>
                    </div>

                    {/* Filtros */}
                    <div className="flex flex-wrap items-center gap-2">
                        {activeSubTab === 'rcfas' ? (
                            <>
                                {/* Date Range RCFAs */}
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-sm">
                                    <span className="text-orange-500 text-[10px] font-bold">De</span>
                                    <input type="date" value={rcfaDateRange.start} onChange={e => setRcfaDateRange(p => ({ ...p, start: e.target.value }))} className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none w-[105px]" />
                                    <span className="text-orange-500 text-[10px] font-bold">Até</span>
                                    <input type="date" value={rcfaDateRange.end} onChange={e => setRcfaDateRange(p => ({ ...p, end: e.target.value }))} className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none w-[105px]" />
                                </div>
                                <div className="relative">
                                    <select value={selectedLocal || ''} onChange={(e) => setSelectedLocal(e.target.value || null)} className="appearance-none bg-white border border-slate-200 text-slate-700 py-1.5 pl-3 pr-8 rounded-lg text-xs font-bold cursor-pointer shadow-sm max-w-[120px]">
                                        <option value="">Local</option>
                                        {rcfaFilterOptions.locals.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-2 top-2 text-slate-400 pointer-events-none" />
                                </div>
                                <div className="relative">
                                    <select value={selectedStatus || ''} onChange={(e) => setSelectedStatus(e.target.value || null)} className="appearance-none bg-white border border-slate-200 text-slate-700 py-1.5 pl-3 pr-8 rounded-lg text-xs font-bold cursor-pointer shadow-sm">
                                        <option value="">Status</option>
                                        {rcfaFilterOptions.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-2 top-2 text-slate-400 pointer-events-none" />
                                </div>
                                {hasRcfaFilters && <button onClick={clearRcfaFilters} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100"><X size={12} /></button>}
                            </>
                        ) : (
                            <>
                                {/* Date Range Ações */}
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-sm">
                                    <span className="text-orange-500 text-[10px] font-bold">De</span>
                                    <input type="date" value={acoesDateRange.start} onChange={e => setAcoesDateRange(p => ({ ...p, start: e.target.value }))} className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none w-[105px]" />
                                    <span className="text-orange-500 text-[10px] font-bold">Até</span>
                                    <input type="date" value={acoesDateRange.end} onChange={e => setAcoesDateRange(p => ({ ...p, end: e.target.value }))} className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none w-[105px]" />
                                </div>
                                <div className="relative">
                                    <select value={selectedResponsavel || ''} onChange={(e) => setSelectedResponsavel(e.target.value || null)} className="appearance-none bg-white border border-slate-200 text-slate-700 py-1.5 pl-3 pr-8 rounded-lg text-xs font-bold cursor-pointer shadow-sm max-w-[120px]">
                                        <option value="">Responsável</option>
                                        {acoesFilterOptions.responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-2 top-2 text-slate-400 pointer-events-none" />
                                </div>
                                <div className="relative">
                                    <select value={selectedAcaoStatus || ''} onChange={(e) => setSelectedAcaoStatus(e.target.value || null)} className="appearance-none bg-white border border-slate-200 text-slate-700 py-1.5 pl-3 pr-8 rounded-lg text-xs font-bold cursor-pointer shadow-sm">
                                        <option value="">Status</option>
                                        {acoesFilterOptions.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-2 top-2 text-slate-400 pointer-events-none" />
                                </div>
                                <button onClick={() => setShowOnlyAtrasadas(!showOnlyAtrasadas)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showOnlyAtrasadas ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                                    <AlertCircle size={12} /> Atrasadas
                                </button>
                                {hasAcoesFilters && <button onClick={clearAcoesFilters} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200"><X size={12} /></button>}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto">
                {/* ========== TAB RCFAs ========== */}
                {activeSubTab === 'rcfas' && (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <BigNumberCard title="Total RCFAs" value={rcfaStats.total} subtitle="Investigações" icon={FileText} color={COLORS.orange} />
                            <BigNumberCard title="Em Andamento" value={rcfaStats.byStatus.find(s => s.name?.includes('ANDAMENTO'))?.count || 0} subtitle="Análises ativas" icon={Clock} color={COLORS.blue} />
                            <BigNumberCard title="Concluídas" value={rcfaStats.byStatus.find(s => s.name?.includes('CONCLU'))?.count || 0} subtitle="Finalizadas" icon={CheckCircle} color={COLORS.green} />
                            <BigNumberCard title="Custo Revisado" value={`R$ ${(rcfaStats.totalCusto / 1000).toFixed(0)}k`} subtitle="Acumulado" icon={DollarSign} color={COLORS.purple} />
                        </div>
                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2"><BarChart3 size={16} /> Status</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                {rcfaStats.byStatus.sort((a, b) => b.count - a.count).map((s, i) => <StatusBadge key={i} status={s.name} count={s.count} />)}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ParetoBar data={rcfaStats.byLocal} title="Top Locais" />
                            <Card className="p-4">
                                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Calendar size={16} /> Por Ano</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead><tr className="bg-slate-100"><th className="px-3 py-2 text-left font-bold">Ano</th><th className="px-3 py-2 text-right font-bold">RCFAs</th></tr></thead>
                                        <tbody>{rcfaStats.byYear.map((y, i) => <tr key={i} className="border-b hover:bg-slate-50"><td className="px-3 py-2">{y.name}</td><td className="px-3 py-2 text-right font-bold text-orange-600">{y.count}</td></tr>)}</tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>

                        {/* Tabela de RCFAs */}
                        <Card className="p-4 mt-6">
                            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><FileText size={16} /> Lista de Análises</h3>
                            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-slate-100">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-bold text-slate-600">RCFA</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-600">Ocorrência</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-600">Status</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-600">Local</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-600 min-w-[300px]">Descrição</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRcfaData.slice(0, 100).map((d, i) => (
                                            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="px-3 py-2 font-bold text-orange-600 whitespace-nowrap">{d.RCFA}</td>
                                                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{d.OCORRENCIA}</td>
                                                <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.STATUS_RCFA?.includes('CONCLU') ? 'bg-green-100 text-green-700' : d.STATUS_RCFA?.includes('ANDAMENTO') ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{d.STATUS_RCFA}</span></td>
                                                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{d.LOCAL}</td>
                                                <td className="px-3 py-2 text-slate-700" title={d.DESCRICAO_RCFA}>{(d.DESCRICAO_RCFA || '').slice(0, 80)}{(d.DESCRICAO_RCFA || '').length > 80 ? '...' : ''}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredRcfaData.length > 100 && <p className="text-[10px] text-slate-400 mt-2 text-center">Mostrando 100 de {filteredRcfaData.length} registros</p>}
                            </div>
                        </Card>
                    </>
                )}

                {/* ========== TAB AÇÕES ========== */}
                {activeSubTab === 'acoes' && (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                            <BigNumberCard title="Total Ações" value={acoesStats.total} subtitle="Registradas" icon={ClipboardList} color={COLORS.orange} />
                            <BigNumberCard title="Atrasadas" value={acoesStats.atrasadas} subtitle="Prazo vencido" icon={AlertCircle} color={COLORS.red} />
                            <BigNumberCard title="No Prazo" value={acoesStats.noPrazo} subtitle="Dentro do prazo" icon={Clock} color={COLORS.blue} />
                            <BigNumberCard title="Finalizadas" value={acoesStats.concluidas} subtitle="No prazo" icon={CheckCircle} color={COLORS.green} />
                            <BigNumberCard title="Fin. Atrasado" value={acoesStats.finalizadoAtrasado} subtitle="Fora do prazo" icon={AlertTriangle} color={COLORS.yellow} />
                        </div>

                        {/* Gráfico de Evolução de Ações (Recharts) */}
                        <div className="mb-6">
                            <ActionsEvolutionChart data={filteredAcoesData} title="Evolução de Ações" />
                        </div>

                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2"><BarChart3 size={16} /> Status das Ações</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                {acoesStats.byStatus.sort((a, b) => b.count - a.count).map((s, i) => <StatusBadge key={i} status={s.name} count={s.count} />)}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            <Card className="p-4">
                                <h3 className="text-sm font-bold text-slate-700 mb-3">Top Locais</h3>
                                <div className="h-48">
                                    <ActionsParetoChart
                                        data={acoesStats.byLocal}
                                        color="#f97316"
                                        onBarClick={setSelectedAcaoLocal}
                                        selectedName={selectedAcaoLocal}
                                    />
                                </div>
                            </Card>
                            <Card className="p-4">
                                <h3 className="text-sm font-bold text-slate-700 mb-3">Top Responsáveis</h3>
                                <div className="h-48">
                                    <ActionsParetoChart
                                        data={acoesStats.byResponsavel}
                                        color="#3b82f6"
                                        onBarClick={setSelectedResponsavel}
                                        selectedName={selectedResponsavel}
                                    />
                                </div>
                            </Card>
                            <Card className="p-4">
                                <h3 className="text-sm font-bold text-slate-700 mb-3">Por Tipo de Ação</h3>
                                <div className="h-48">
                                    <ActionsParetoChart
                                        data={acoesStats.byTipoAcao}
                                        color="#a855f7"
                                        onBarClick={setSelectedTipoAcao}
                                        selectedName={selectedTipoAcao}
                                    />
                                </div>
                            </Card>
                            <Card className="p-4">
                                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><BarChart3 size={16} /> Resumo de Status</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center p-2 bg-red-50 rounded-lg border border-red-100">
                                        <span className="text-xs font-bold text-red-700">Atrasadas</span>
                                        <span className="text-lg font-bold text-red-600">{acoesStats.atrasadas}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-yellow-50 rounded-lg border border-yellow-100">
                                        <span className="text-xs font-bold text-yellow-700">Fin. Atrasado</span>
                                        <span className="text-lg font-bold text-yellow-600">{acoesStats.finalizadoAtrasado}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg border border-blue-100">
                                        <span className="text-xs font-bold text-blue-700">No Prazo</span>
                                        <span className="text-lg font-bold text-blue-600">{acoesStats.noPrazo}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg border border-green-100">
                                        <span className="text-xs font-bold text-green-700">Finalizadas</span>
                                        <span className="text-lg font-bold text-green-600">{acoesStats.concluidas}</span>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Tabela de Ações */}
                        <Card className="p-4 mt-6">
                            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><ClipboardList size={16} /> Lista de Ações</h3>
                            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-slate-100">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-bold text-slate-600">Ação</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-600">RCFA</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-600">Ocorrência</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-600">Prazo</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-600">Status</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-600">Responsável</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-600 min-w-[250px]">Descrição</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAcoesData.slice(0, 100).map((d, i) => (
                                            <tr key={i} className={`border-b border-slate-100 hover:bg-slate-50 ${d.ATRASADA ? 'bg-red-50' : ''}`}>
                                                <td className="px-3 py-2 font-bold text-blue-600 whitespace-nowrap">{d.ACAO}</td>
                                                <td className="px-3 py-2 text-orange-600 whitespace-nowrap">{d.RCFA}</td>
                                                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{d.OCORRENCIA}</td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <span className={d.ATRASADA ? 'text-red-600 font-bold' : 'text-slate-600'}>{d.PRAZO}</span>
                                                    {d.ATRASADA && <span className="ml-1 text-[9px] bg-red-500 text-white px-1 rounded">ATRASADA</span>}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.STATUS_CALCULADO === 'Finalizado' ? 'bg-green-100 text-green-700' :
                                                        d.STATUS_CALCULADO === 'Finalizado Atrasado' ? 'bg-yellow-100 text-yellow-700' :
                                                            d.STATUS_CALCULADO === 'No Prazo' ? 'bg-blue-100 text-blue-700' :
                                                                d.STATUS_CALCULADO === 'Atrasado' ? 'bg-red-100 text-red-700' :
                                                                    'bg-slate-100 text-slate-600'
                                                        }`}>{d.STATUS_CALCULADO}</span>
                                                </td>
                                                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{d.RESPONSAVEL}</td>
                                                <td className="px-3 py-2 text-slate-700" title={d.DESCRICAO_ACAO}>{(d.DESCRICAO_ACAO || '').slice(0, 60)}{(d.DESCRICAO_ACAO || '').length > 60 ? '...' : ''}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredAcoesData.length > 100 && <p className="text-[10px] text-slate-400 mt-2 text-center">Mostrando 100 de {filteredAcoesData.length} registros</p>}
                            </div>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}
