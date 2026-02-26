import React, { useState, useEffect, useMemo } from 'react';
import { Card } from './UI';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Users, Clock, AlertTriangle, FileText, RefreshCw, Search, X, Filter } from 'lucide-react';

const COLORS = {
    primary: '#f97316', // orange-500
    secondary: '#3b82f6', // blue-500
    success: '#22c55e', // green-500
    warning: '#eab308', // yellow-500
    danger: '#ef4444', // red-500
    slate: '#64748b', // slate-500
    orange: '#f97316',
    blue: '#3b82f6',
    green: '#22c55e',
    red: '#ef4444',
};

const PIE_COLORS = ['#3b82f6', '#f97316', '#22c55e', '#ef4444', '#eab308', '#8b5cf6', '#ec4899', '#6366f1'];

// Big Number Card - Local (similar to FailuresAnalysisDashboard)
function BigNumberCard({ title, value, subtext, icon: Icon, color = 'orange', suffix = '' }) {
    const resolvedColor = COLORS[color] || color;

    return (
        <Card className="p-3 flex flex-col justify-between h-full border-t-4" style={{ borderTopColor: resolvedColor }}>
            <div>
                <div className="flex justify-between items-start">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
                    {Icon && <div className="p-1.5 rounded-full bg-slate-50"><Icon size={14} style={{ color: resolvedColor }} /></div>}
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                    <h3 className="text-2xl font-bold tracking-tight" style={{ color: resolvedColor }}>{value}</h3>
                    {suffix && <span className="text-xs font-medium text-slate-400">{suffix}</span>}
                </div>
            </div>
            {subtext && (
                <div className="mt-2 pt-2 border-t border-slate-50">
                    <p className="text-[10px] text-slate-400">{subtext}</p>
                </div>
            )}
        </Card>
    );
}

// Filter badge component
function FilterBadge({ label, value, onClear, color = 'bg-blue-100 text-blue-700' }) {
    return (
        <span className={`inline - flex items - center gap - 1 text - [10px] font - bold px - 2 py - 0.5 rounded uppercase ${color} `}>
            {label}: {value}
            <button onClick={onClear} className="hover:opacity-70 transition-opacity" title="Remover filtro">
                <X size={10} />
            </button>
        </span>
    );
}

export default function TBMDashboard() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [syncing, setSyncing] = useState(false);

    // Cross-filter states
    const [statusFilter, setStatusFilter] = useState(null);
    const [crewFilter, setCrewFilter] = useState(null);
    const [assetFilter, setAssetFilter] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [planStatusFilter, setPlanStatusFilter] = useState('ATIVO'); // New state for plan status

    const hasAnyFilter = statusFilter || crewFilter || assetFilter || planStatusFilter !== 'ATIVO';

    const clearAllFilters = () => {
        setStatusFilter(null);
        setCrewFilter(null);
        setAssetFilter(null);
        setSearchText('');
        setPlanStatusFilter('ATIVO');
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetch('./tbm_data.json?t=' + Date.now());
            const json = await res.json();
            const rawData = json.data || [];
            const normalized = rawData.map(item => {
                const newItem = { ...item };
                if (newItem.LOCAL_MP && String(newItem.LOCAL_MP).toUpperCase() === '9621A') {
                    newItem.LOCAL_MP = 'PCM A';
                }
                if (newItem.LOCAL_TAREFA && String(newItem.LOCAL_TAREFA).toUpperCase().includes('9621A')) {
                    newItem.LOCAL_TAREFA = String(newItem.LOCAL_TAREFA).toUpperCase().replace('9621A', 'PCM A');
                }
                return newItem;
            });
            setData(normalized);
            setLastUpdated(json.lastUpdated);
        } catch (err) {
            console.error("Erro ao carregar dados TBM:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleSyncData = async () => {
        setSyncing(true);
        try {
            const res = await fetch('/api/sync-af-data', { method: 'POST' });
            if (!res.ok) throw new Error('Falha na sincronização');
            await loadData();
        } catch (err) {
            console.error('Erro ao sincronizar TBM:', err);
        } finally {
            setSyncing(false);
        }
    };

    // Helper: check if item is overdue
    const isItemOverdue = (item) => {
        if (!item.PROXIMO_VENCIMENTO) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(item.PROXIMO_VENCIMENTO) < today;
    };

    // Filter by plan status (ATIVO / INATIVO / Todos)
    const filteredByPlanStatus = useMemo(() => {
        if (!planStatusFilter || planStatusFilter === 'TODOS') return data;
        return data.filter(item => {
            const status = (item.STATUS_MP || '').toUpperCase();
            return status === planStatusFilter;
        });
    }, [data, planStatusFilter]);

    // Cross-filtered data: apply all chart filters
    const crossFilteredData = useMemo(() => {
        return filteredByPlanStatus.filter(item => {
            // Status filter
            if (statusFilter) {
                const overdue = isItemOverdue(item);
                if (statusFilter === 'overdue' && !overdue) return false;
                if (statusFilter === 'on_time' && overdue) return false;
            }
            // Crew filter
            if (crewFilter) {
                const crew = item.EQUIPE || 'Sem Equipe';
                if (crew !== crewFilter) return false;
            }
            // Asset filter
            if (assetFilter) {
                const asset = item.LOCAL_MP || 'Sem Local';
                if (asset !== assetFilter) return false;
            }
            return true;
        });
    }, [filteredByPlanStatus, statusFilter, crewFilter, assetFilter]);

    // Table data: cross-filtered + text search
    const filteredData = useMemo(() => {
        if (!searchText.trim()) return crossFilteredData;
        const term = searchText.trim().toLowerCase();
        return crossFilteredData.filter(item => {
            const fields = [
                item.MP, item.DESCRICAO_MP, item.FREQUENCIA, item.EQUIPE,
                item.PLANO, item.TAREFA_ID, item.DESCRICAO_TAREFA,
                item.TOTAL_HORAS, item.LOCAL_MP, item.LOCAL_TAREFA,
                item.MAO_DE_OBRA,
                item.PROXIMO_VENCIMENTO ? new Date(item.PROXIMO_VENCIMENTO).toLocaleDateString('pt-BR') : ''
            ];
            return fields.some(f => String(f || '').toLowerCase().includes(term));
        });
    }, [crossFilteredData, searchText]);

    // KPIs Calculation (from filteredByPlanStatus data)
    const kpis = useMemo(() => {
        if (!filteredByPlanStatus.length) return { totalMPs: 0, totalHours: 0, overdue: 0, distinctPlans: 0 };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let totalHours = 0;
        let overdueCount = 0;
        const plans = new Set();
        const mps = new Set();

        filteredByPlanStatus.forEach(item => {
            mps.add(item.MP);
            plans.add(item.PLANO);
            const hours = parseFloat(item.TOTAL_HORAS) || 0;
            totalHours += hours;

            if (item.PROXIMO_VENCIMENTO) {
                const dueDate = new Date(item.PROXIMO_VENCIMENTO);
                if (dueDate < today) overdueCount++;
            }
        });

        return {
            totalMPs: mps.size,
            totalHours: totalHours,
            overdue: overdueCount,
            distinctPlans: plans.size
        };
    }, [filteredByPlanStatus]);

    // Charts Data - computed from cross-filtered data but EXCLUDING own filter
    const chartsData = useMemo(() => {
        if (!crossFilteredData.length) return { byCrew: [], byCraft: [], byAsset: [], byStatus: [] };

        // Helper: filter data excluding a specific filter dimension
        const filterExcluding = (excludeDimension) => {
            return filteredByPlanStatus.filter(item => { // Start from filteredByPlanStatus
                if (excludeDimension !== 'status' && statusFilter) {
                    const overdue = isItemOverdue(item);
                    if (statusFilter === 'overdue' && !overdue) return false;
                    if (statusFilter === 'on_time' && overdue) return false;
                }
                if (excludeDimension !== 'crew' && crewFilter) {
                    const crew = item.EQUIPE || 'Sem Equipe';
                    if (crew !== crewFilter) return false;
                }
                if (excludeDimension !== 'asset' && assetFilter) {
                    const asset = item.LOCAL_MP || 'Sem Local';
                    if (asset !== assetFilter) return false;
                }
                return true;
            });
        };

        // By Equipe (Total Hours) - exclude crew filter from own data
        const crewData = filterExcluding('crew');
        const crewMap = {};
        crewData.forEach(item => {
            const crew = item.EQUIPE || 'Sem Equipe';
            const hours = parseFloat(item.TOTAL_HORAS) || 0;
            crewMap[crew] = (crewMap[crew] || 0) + hours;
        });
        const byCrew = Object.entries(crewMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // By Mão de Obra (Hours) - uses all cross-filtered data
        const craftData = crossFilteredData; // This should use crossFilteredData as it's already filtered by all other dimensions
        const craftMap = {};
        craftData.forEach(item => {
            const craft = item.MAO_DE_OBRA || 'Outros';
            const hours = parseFloat(item.TOTAL_HORAS) || 0;
            craftMap[craft] = (craftMap[craft] || 0) + hours;
        });
        const byCraft = Object.entries(craftMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // By Ativo - exclude asset filter from own data
        const assetData = filterExcluding('asset');
        const assetMap = {};
        assetData.forEach(item => {
            const asset = item.LOCAL_MP || 'Sem Local';
            assetMap[asset] = (assetMap[asset] || 0) + 1;
        });
        const byAsset = Object.entries(assetMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 20);

        // By Status - exclude status filter from own data
        const statusData = filterExcluding('status');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let onTimeCount = 0;
        let overdueCount = 0;

        statusData.forEach(item => {
            const dueDate = item.PROXIMO_VENCIMENTO ? new Date(item.PROXIMO_VENCIMENTO) : null;
            if (dueDate && dueDate < today) {
                overdueCount++;
            } else {
                onTimeCount++;
            }
        });

        const byStatus = [
            { name: 'Em Dia', value: onTimeCount, key: 'on_time', color: COLORS.success },
            { name: 'Atrasado', value: overdueCount, key: 'overdue', color: COLORS.danger }
        ];

        return { byCrew, byCraft, byAsset, byStatus };
    }, [filteredByPlanStatus, statusFilter, crewFilter, assetFilter, crossFilteredData]);

    if (loading) return <div className="p-8 text-center text-slate-500">Carregando dados TBM...</div>;

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Clock className="text-orange-500" />
                            Manutenção Baseada no Tempo (TBM)
                        </h2>
                        <p className="text-sm text-slate-500">
                            Visão geral do plano de manutenção preventiva e rotinas periódicas.
                            {lastUpdated && <span className="ml-2 text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Atualizado em: {lastUpdated}</span>}
                        </p>
                    </div>
                    <button
                        onClick={handleSyncData}
                        disabled={syncing}
                        title="Sincronizar dados do Maximo/Oracle"
                        className={`ml - 2 p - 2 rounded - lg text - xs font - bold flex items - center gap - 1.5 transition - all ${syncing
                                ? 'bg-orange-100 text-orange-400 cursor-wait'
                                : 'bg-orange-50 text-orange-600 hover:bg-orange-100 hover:shadow-sm'
                            } `}
                    >
                        <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                        {syncing ? 'Sincronizando...' : 'Atualizar Dados'}
                    </button>
                </div>
                {/* Plan Status Filter Buttons */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Status do Plano:</span>
                    {['ATIVO', 'INATIVO', 'TODOS'].map(status => (
                        <button
                            key={status}
                            onClick={() => setPlanStatusFilter(status)}
                            className={`px - 3 py - 1 rounded - full text - xs font - semibold transition - colors ${planStatusFilter === status
                                    ? 'bg-orange-500 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                } `}
                        >
                            {status === 'ATIVO' ? 'Ativo' : status === 'INATIVO' ? 'Inativo' : 'Todos'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Active Filters Bar */}
            {hasAnyFilter && (
                <div className="mb-4 flex items-center gap-2 flex-wrap bg-white border border-slate-200 rounded-lg px-4 py-2.5 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Filtros Ativos:</span>
                    {planStatusFilter !== 'ATIVO' && (
                        <FilterBadge
                            label="Plano"
                            value={planStatusFilter === 'TODOS' ? 'Todos' : planStatusFilter === 'ATIVO' ? 'Ativo' : 'Inativo'}
                            onClear={() => setPlanStatusFilter('ATIVO')}
                            color="bg-orange-100 text-orange-700"
                        />
                    )}
                    {statusFilter && (
                        <FilterBadge
                            label="Status"
                            value={statusFilter === 'overdue' ? 'Atrasado' : 'Em Dia'}
                            onClear={() => setStatusFilter(null)}
                            color={statusFilter === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}
                        />
                    )}
                    {crewFilter && (
                        <FilterBadge
                            label="Equipe"
                            value={crewFilter}
                            onClear={() => setCrewFilter(null)}
                            color="bg-purple-100 text-purple-700"
                        />
                    )}
                    {assetFilter && (
                        <FilterBadge
                            label="Ativo"
                            value={assetFilter}
                            onClear={() => setAssetFilter(null)}
                            color="bg-blue-100 text-blue-700"
                        />
                    )}
                    <button
                        onClick={clearAllFilters}
                        className="ml-auto text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-500 px-2 py-1 rounded transition-colors font-medium"
                    >
                        Limpar Todos
                    </button>
                </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <BigNumberCard
                    title={`Total de MPs ${planStatusFilter === 'TODOS' ? '' : planStatusFilter === 'ATIVO' ? 'Ativas' : 'Inativas'} `}
                    value={kpis.totalMPs}
                    icon={FileText}
                    color="blue"
                    subtext={`${kpis.distinctPlans} Planos de Trabalho distintos`}
                />
                <BigNumberCard
                    title="Carga de Trabalho Estimada"
                    value={kpis.totalHours.toFixed(1)}
                    suffix=" h"
                    icon={Clock}
                    color="orange"
                    subtext="Total de horas homem cadastradas"
                />
                <BigNumberCard
                    title="MPs Vencidas"
                    value={kpis.overdue}
                    icon={AlertTriangle}
                    color={kpis.overdue > 0 ? "red" : "green"}
                    subtext="Data de Próx. Vencimento < Hoje"
                />
                <BigNumberCard
                    title="Equipes Envolvidas"
                    value={chartsData.byCrew.length}
                    icon={Users}
                    color="slate"
                    subtext="Quantidade de equipes com MPs"
                />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card className="p-4 flex flex-col min-h-[350px]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-slate-700 font-bold">Carga de Horas por Equipe</h3>
                        {crewFilter && (
                            <button
                                onClick={() => setCrewFilter(null)}
                                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-500 px-2 py-1 rounded transition-colors"
                            >
                                Limpar Filtro
                            </button>
                        )}
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartsData.byCrew}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                onClick={(state) => {
                                    if (state && state.activePayload && state.activePayload.length > 0) {
                                        const name = state.activePayload[0].payload.name;
                                        setCrewFilter(prev => prev === name ? null : name);
                                    }
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} interval={0} />
                                <Tooltip
                                    formatter={(value) => [`${value.toFixed(1)} h`, 'Horas Estimadas']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="value" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={20} cursor="pointer">
                                    {chartsData.byCrew.map((entry, index) => (
                                        <Cell
                                            key={`cell - ${index} `}
                                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                                            fillOpacity={crewFilter === null || crewFilter === entry.name ? 1 : 0.3}
                                            stroke={crewFilter === entry.name ? '#000' : 'none'}
                                            strokeWidth={2}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 text-center italic">Clique nas barras para filtrar</p>
                </Card>

                <Card className="p-4 flex flex-col min-h-[350px]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-slate-700 font-bold">Status dos Planos (MP's)</h3>
                        {statusFilter && (
                            <button
                                onClick={() => setStatusFilter(null)}
                                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-500 px-2 py-1 rounded transition-colors"
                            >
                                Limpar Filtro
                            </button>
                        )}
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartsData.byStatus}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                onClick={(state) => {
                                    if (state && state.activePayload && state.activePayload.length > 0) {
                                        const key = state.activePayload[0].payload.key;
                                        setStatusFilter(prev => prev === key ? null : key);
                                    }
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 'bold' }} />
                                <YAxis />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={60} cursor="pointer">
                                    {chartsData.byStatus.map((entry, index) => (
                                        <Cell
                                            key={`cell - ${index} `}
                                            fill={entry.color}
                                            fillOpacity={statusFilter === null || statusFilter === entry.key ? 1 : 0.3}
                                            stroke={statusFilter === entry.key ? '#000' : 'none'}
                                            strokeWidth={2}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 text-center italic">Clique nas barras para filtrar</p>
                </Card>
            </div>

            {/* Chart Row 2: Top Assets */}
            <div className="mb-6">
                <Card className="p-4 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-slate-700 font-bold">Top 20 Ativos com mais MPs (Quantidade)</h3>
                        {assetFilter && (
                            <button
                                onClick={() => setAssetFilter(null)}
                                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-500 px-2 py-1 rounded transition-colors"
                            >
                                Limpar Filtro
                            </button>
                        )}
                    </div>
                    <div className="w-full h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartsData.byAsset}
                                margin={{ top: 10, right: 30, left: 10, bottom: 80 }}
                                onClick={(state) => {
                                    if (state && state.activePayload && state.activePayload.length > 0) {
                                        const name = state.activePayload[0].payload.name;
                                        setAssetFilter(prev => prev === name ? null : name);
                                    }
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    interval={0}
                                    angle={-45}
                                    textAnchor="end"
                                    height={60}
                                />
                                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                                <Tooltip
                                    formatter={(value) => [value, 'Quantidade de MPs']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="value" fill={COLORS.secondary} radius={[4, 4, 0, 0]} barSize={30} name="Quantidade de MPs" cursor="pointer">
                                    {chartsData.byAsset.map((entry, index) => (
                                        <Cell
                                            key={`cell - ${index} `}
                                            fill={COLORS.secondary}
                                            fillOpacity={assetFilter === null || assetFilter === entry.name ? 1 : 0.3}
                                            stroke={assetFilter === entry.name ? '#000' : 'none'}
                                            strokeWidth={2}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 text-center italic">Clique nas barras para filtrar</p>
                </Card>
            </div>

            {/* Data Table */}
            <Card className="overflow-hidden flex flex-col" id="detalhamento-mp">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold text-slate-700">Detalhamento de MPs</h3>
                            {hasAnyFilter && (
                                <div className="flex items-center gap-1.5">
                                    {planStatusFilter !== 'ATIVO' && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-orange-100 text-orange-700">
                                            {planStatusFilter === 'TODOS' ? 'Todos Planos' : planStatusFilter === 'ATIVO' ? 'Planos Ativos' : 'Planos Inativos'}
                                        </span>
                                    )}
                                    {statusFilter && (
                                        <span className={`text - [10px] font - bold px - 2 py - 0.5 rounded uppercase ${statusFilter === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'} `}>
                                            {statusFilter === 'overdue' ? 'Atrasadas' : 'Em Dia'}
                                        </span>
                                    )}
                                    {crewFilter && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-purple-100 text-purple-700">
                                            {crewFilter}
                                        </span>
                                    )}
                                    {assetFilter && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-blue-100 text-blue-700">
                                            {assetFilter}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        <span className="text-xs text-slate-500">
                            {filteredData.length} registros encontrados
                            {(hasAnyFilter || searchText) && ` (filtrados de ${data.length})`}
                        </span>
                    </div>
                    {/* Search Input */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder="Pesquisar em todas as colunas..."
                            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 bg-white transition-all"
                        />
                        {searchText && (
                            <button
                                onClick={() => setSearchText('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                title="Limpar pesquisa"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs text-left">
                        <thead className="bg-slate-100 font-bold text-slate-600">
                            <tr>
                                <th className="px-4 py-3">MP</th>
                                <th className="px-4 py-3">Descrição da MP</th>
                                <th className="px-4 py-3">Freq. (Dias)</th>
                                <th className="px-4 py-3">Equipe</th>
                                <th className="px-4 py-3">Plano</th>
                                <th className="px-4 py-3">Tarefa</th>
                                <th className="px-4 py-3">Descrição da Tarefa</th>
                                <th className="px-4 py-3 text-right">Horas</th>
                                <th className="px-4 py-3 text-right">Próx. Venc.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.slice(0, 100).map((row, idx) => {
                                const isOverdue = row.PROXIMO_VENCIMENTO && new Date(row.PROXIMO_VENCIMENTO) < new Date();
                                return (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-2 font-medium text-slate-700 whitespace-nowrap">{row.MP}</td>
                                        <td className="px-4 py-2 text-slate-600 max-w-[200px] truncate" title={row.DESCRICAO_MP}>{row.DESCRICAO_MP}</td>
                                        <td className="px-4 py-2 text-center">{row.FREQUENCIA}</td>
                                        <td className="px-4 py-2 text-slate-600">{row.EQUIPE}</td>
                                        <td className="px-4 py-2 text-slate-600">{row.PLANO}</td>
                                        <td className="px-4 py-2 text-center">{row.TAREFA_ID}</td>
                                        <td className="px-4 py-2 text-slate-600 max-w-[250px] truncate" title={row.DESCRICAO_TAREFA}>{row.DESCRICAO_TAREFA}</td>
                                        <td className="px-4 py-2 text-right font-mono">{parseFloat(row.TOTAL_HORAS).toFixed(1)}</td>
                                        <td className={`px - 4 py - 2 text - right font - mono whitespace - nowrap ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-600'} `}>
                                            {row.PROXIMO_VENCIMENTO ? new Date(row.PROXIMO_VENCIMENTO).toLocaleDateString('pt-BR') : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredData.length > 100 && (
                        <div className="p-2 text-center text-xs text-slate-400 italic bg-slate-50 border-t border-slate-100">
                            Mostrando os primeiros 100 registros de {filteredData.length}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
