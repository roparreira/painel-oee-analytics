import React, { useState, useEffect, useMemo } from 'react';
import { Filter, X, ChevronDown, TrendingDown, Timer, Wrench, Layers, Crosshair, PlayCircle, StopCircle, Percent, Maximize, CalendarX, AlertTriangle, CheckCircle, Clock, LineChart, ScatterChart, LifeBuoy, Info } from 'lucide-react';
import { COLORS, TARGETS, TARGETS_PATIO, BUSINESS_CONSTANTS, BUSINESS_CONSTANTS_PATIO } from '../config';
import { Card, ComparisonCard, CheckCardDual, CheckCardSingle, MiniDreRow, BigNumberCard, PillarCard } from './UI';
import CustomJackKnifeChart from '../charts/JackKnifeChart';
import ParetoChart from '../charts/ParetoChart';
import OEEGaugeCard from '../charts/OEEGauge';
import TargetChart from '../charts/TargetChart';
import BridgeChart from '../charts/BridgeChart';
import LossEvolutionChart from '../charts/LossEvolutionChart';
import ReliabilityTrendChart from '../charts/ReliabilityTrendChart';
import WeibullChart from '../charts/WeibullChart';
import WindowHoursChart from '../charts/WindowHoursChart';
import { calculateOEEData, calculateDashboardAggregates, calculateTreeStats, calculateJackKnifeData, calculateParetoData, calculateReliabilityTrend, calculateWeibullData, calculateWindowHoursData } from '../services/etl';
import { formatDateISO } from '../utils';
import BridgeChartExplanation from './BridgeChartExplanation';
import OEEExplanation from './OEEExplanation';

export default function OEEDashboardContent({ rawData, initialDateRange, areaMode, setAreaMode, activeTab = 'overview', setActiveTab }) {
    // activeTab is now received from props (controlled by Sidebar)
    const [activeReliabilitySubTab, setActiveReliabilitySubTab] = useState('weibull');
    const [aggregation, setAggregation] = useState('month');
    const [dateRange, setDateRange] = useState(initialDateRange);
    const [validatedDateRange, setValidatedDateRange] = useState(initialDateRange); // Estado validado para cálculos

    const [filterSelection, setFilterSelection] = useState(null);
    const [lossFilter, setLossFilter] = useState(null);
    const [equipmentFilter, setEquipmentFilter] = useState(null);
    const [selectedEquipJackKnife, setSelectedEquipJackKnife] = useState(null);
    const [showBridgeExplainer, setShowBridgeExplainer] = useState(false);
    const [showOEEExplainer, setShowOEEExplainer] = useState(false);

    const [calculatedData, setCalculatedData] = useState([]);

    const [weibullEquipmentFilter, setWeibullEquipmentFilter] = useState(null);
    const [treeSubTab, setTreeSubTab] = useState('tree_main'); // tree_main, detailed, verification
    const [weibullPeriodFilters, setWeibullPeriodFilters] = useState([]);

    // Seleciona os stops e prod da área ativa
    const activeRawData = useMemo(() => ({
        stops: areaMode === 'maquinas' ? rawData.stops : rawData.stopsPatio,
        prod: areaMode === 'maquinas' ? rawData.prod : rawData.prodPatio
    }), [areaMode, rawData]);

    // Seleciona as metas da área ativa
    const activeTargets = useMemo(() =>
        areaMode === 'maquinas' ? TARGETS : TARGETS_PATIO
        , [areaMode]);

    // Limpa filtros ao trocar de área
    useEffect(() => {
        setFilterSelection(null);
        setEquipmentFilter(null);
        setSelectedEquipJackKnife(null);
        setWeibullEquipmentFilter(null);
    }, [areaMode]);

    useEffect(() => { setFilterSelection(null); }, [aggregation, validatedDateRange]);

    // DEBOUNCE: Atualiza validatedDateRange 300ms após última mudança em dateRange
    useEffect(() => {
        const isDateRangeComplete = dateRange.start && dateRange.end &&
            dateRange.start.length === 10 && dateRange.end.length === 10;

        if (!isDateRangeComplete) return;

        const debounceTimer = setTimeout(() => {
            setValidatedDateRange(dateRange);
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [dateRange]);

    // Cálculos usam validatedDateRange (após debounce)
    useEffect(() => {
        const isDateRangeComplete = validatedDateRange.start && validatedDateRange.end &&
            validatedDateRange.start.length === 10 && validatedDateRange.end.length === 10;

        // Verificar se data inicial é menor ou igual à data final
        const isDateRangeValid = isDateRangeComplete && validatedDateRange.start <= validatedDateRange.end;

        // Verificar se há dados de produção para a área selecionada
        const hasProdData = activeRawData.prod && Object.keys(activeRawData.prod).length > 0;

        if (!isDateRangeValid || !hasProdData) {
            setCalculatedData([]);
            return;
        }

        const results = calculateOEEData(activeRawData, validatedDateRange, aggregation, equipmentFilter, areaMode);
        setCalculatedData(results);
    }, [validatedDateRange, aggregation, equipmentFilter, activeRawData, areaMode]);

    const availableEquipments = useMemo(() => {
        const uniqueEquips = new Set(activeRawData.stops
            .filter(s => s.equip && s.equip !== 'Sem Tag')
            .map(s => s.equip));
        return Array.from(uniqueEquips).sort();
    }, [activeRawData]);

    const periodOptions = calculatedData.map(d => ({ label: d.label, key: d.key }));


    const activeAggregates = useMemo(() => calculateDashboardAggregates(calculatedData, activeRawData, validatedDateRange, filterSelection, areaMode), [calculatedData, filterSelection, activeRawData, validatedDateRange, areaMode]);
    const treeStats = useMemo(() => calculateTreeStats(calculatedData, filterSelection), [calculatedData, filterSelection]);
    const jackKnifeData = useMemo(() => calculateJackKnifeData(activeRawData, validatedDateRange), [activeRawData, validatedDateRange]);
    const { topEquipmentsData, topCausesData } = useMemo(() => calculateParetoData(activeRawData, validatedDateRange, filterSelection, aggregation, lossFilter, equipmentFilter), [activeRawData, validatedDateRange, filterSelection, aggregation, lossFilter, equipmentFilter]);
    const reliabilityTrendData = useMemo(() => {
        return calculateReliabilityTrend(activeRawData, validatedDateRange, aggregation);
    }, [activeRawData, validatedDateRange, aggregation]);

    const weibullData = useMemo(() => {
        return calculateWeibullData(activeRawData, weibullEquipmentFilter);
    }, [activeRawData, weibullEquipmentFilter]);

    const windowHoursData = useMemo(() => {
        return calculateWindowHoursData(activeRawData, validatedDateRange, aggregation);
    }, [activeRawData, validatedDateRange, aggregation]);



    const handleBarToggle = (key) => setFilterSelection(prev => prev === key ? null : key);
    const handleChartDrillDown = (key, type) => {
        if (filterSelection === key && lossFilter === type) { setFilterSelection(null); setLossFilter(null); }
        else { setFilterSelection(key); setLossFilter(type); }
    };
    const toggleLossFilter = (type) => setLossFilter(prev => prev === type ? null : type);
    const handleEquipmentToggle = (equipName) => setEquipmentFilter(prev => prev === equipName ? null : equipName);
    const getLocalStatusColor = (val) => { if (val < 50) return COLORS.red; if (val < 90) return COLORS.yellow; return COLORS.green; };

    // Smart Date Range Handler: Auto-ordena datas (menor = start, maior = end)
    const handleDateChange = (type, value) => {
        // Verifica se a string é uma data ISO válida (YYYY-MM-DD)
        const isIsoDate = value.match(/^\d{4}-\d{2}-\d{2}$/);

        setDateRange(prev => {
            const newRange = { ...prev, [type]: value };

            // Se ambas as datas são válidas (10 caracteres), auto-ordena
            if (newRange.start?.length === 10 && newRange.end?.length === 10) {
                if (newRange.start > newRange.end) {
                    // Troca as datas automaticamente
                    return { start: newRange.end, end: newRange.start };
                }
            }

            return newRange;
        });
    };

    // Verificar se há dados de produção para a área selecionada
    const hasProdData = activeRawData.prod && Object.keys(activeRawData.prod).length > 0;

    if (!hasProdData) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                <div className="text-6xl">📊</div>
                <div className="text-lg font-bold">Sem dados de produção para {areaMode === 'maquinas' ? 'Máquinas' : 'Pátio/Envio'}</div>
                {areaMode === 'patio' && (
                    <p className="text-sm text-slate-400 text-center max-w-md">
                        Para visualizar dados de Pátio/Envio, carregue o arquivo <strong>Totalizador_do_Despacho.xlsx</strong> na tela de upload.
                    </p>
                )}
            </div>
        );
    }

    if (!activeAggregates) return <div className="h-full flex items-center justify-center text-slate-400">Carregando dados...</div>;

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* HEADER DE CONTROLES */}
            <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex flex-col 2xl:flex-row items-center justify-between gap-4 shadow-sm shrink-0 z-20">
                <div className="flex bg-slate-100 rounded-lg p-1 gap-1 overflow-x-auto shrink-0 w-full 2xl:w-auto no-scrollbar">
                    {/* Exibir sub-abas apenas se estiver na aba TREE */}
                    {activeTab === 'tree' && (
                        <>
                            <button onClick={() => setTreeSubTab('tree_main')} className={`px-3 md:px-4 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${treeSubTab === 'tree_main' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Árvore OEE</button>
                            <button onClick={() => setTreeSubTab('janela')} className={`px-3 md:px-4 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${treeSubTab === 'janela' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Janela</button>
                            <button onClick={() => setTreeSubTab('verification')} className={`px-3 md:px-4 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${treeSubTab === 'verification' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Verificação</button>
                        </>
                    )}
                    {/* Título Estático para outras abas */}
                    {activeTab === 'overview' && <span className="px-3 py-1.5 text-xs font-bold text-orange-600">Visão Geral</span>}
                    {activeTab === 'losses' && <span className="px-3 py-1.5 text-xs font-bold text-orange-600">Análise de Perdas</span>}
                    {activeTab === 'reliability' && <span className="px-3 py-1.5 text-xs font-bold text-orange-600">Confiabilidade</span>}
                </div>
                <div className="flex-1 flex justify-center min-w-0 w-full 2xl:w-auto">
                    {(filterSelection || equipmentFilter || lossFilter) && (
                        <div className="flex items-center gap-3 bg-orange-50 border border-orange-100 text-orange-800 px-3 py-1.5 rounded-full text-[10px] font-bold shadow-sm animate-fade-in truncate max-w-full overflow-hidden">
                            <span className="shrink-0 flex items-center gap-1"><Filter size={12} /> Filtros:</span>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                {filterSelection && (<button onClick={() => setFilterSelection(null)} className="flex items-center gap-1 hover:text-red-500 transition-colors bg-white px-2 py-0.5 rounded-full border border-orange-100 whitespace-nowrap">{calculatedData.find(d => d.key === filterSelection)?.label} <X size={10} /></button>)}
                                {equipmentFilter && (<button onClick={() => setEquipmentFilter(null)} className="flex items-center gap-1 hover:text-red-500 transition-colors bg-white px-2 py-0.5 rounded-full border border-orange-100 whitespace-nowrap"><Wrench size={10} /> {equipmentFilter} <X size={10} /></button>)}
                                {lossFilter && (<button onClick={() => setLossFilter(null)} className="flex items-center gap-1 hover:text-red-500 transition-colors bg-white px-2 py-0.5 rounded-full border border-orange-100 whitespace-nowrap"><Layers size={10} /> {lossFilter === 'availability' ? 'Disp.' : 'Perf.'} <X size={10} /></button>)}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 shrink-0 w-full 2xl:w-auto">
                    {/* SELETOR DE MODO DE ÁREA (NOVO LOCAL) */}
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                        <button
                            onClick={() => setAreaMode('maquinas')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${areaMode === 'maquinas' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Máquinas
                        </button>
                        <button
                            onClick={() => setAreaMode('patio')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${areaMode === 'patio' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Pátio/Envio
                        </button>
                    </div>

                    <div className="w-px h-6 bg-slate-200 mx-2 hidden md:block"></div>

                    <div className="relative group w-full md:w-auto">
                        <select value={aggregation} onChange={(e) => setAggregation(e.target.value)} className="w-full md:w-auto appearance-none bg-white border border-slate-200 text-slate-700 py-1.5 pl-3 pr-8 rounded-lg text-xs font-bold focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm hover:border-slate-300 transition-colors">
                            <option value="day">Diário</option><option value="week">Semanal</option><option value="fortnight">Quinzenal</option><option value="month">Mensal</option><option value="quarter">Trimestral</option><option value="year">Anual</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-2 text-slate-400 pointer-events-none group-hover:text-slate-600" />
                    </div>
                    <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm bg-gradient-to-r from-white to-slate-50 w-full md:w-auto justify-between md:justify-start hover:border-orange-300 transition-colors">
                        <div className="flex items-center gap-1.5">
                            <span className="text-orange-400 text-[10px] font-bold uppercase tracking-wider">De</span>
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={e => handleDateChange('start', e.target.value)}
                                className="bg-transparent text-xs font-semibold focus:outline-none text-slate-700 min-w-[100px] cursor-pointer"
                            />
                        </div>
                        <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                            <span className="text-orange-500 text-[10px] font-bold">⇄</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-orange-400 text-[10px] font-bold uppercase tracking-wider">Até</span>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={e => handleDateChange('end', e.target.value)}
                                className="bg-transparent text-xs font-semibold focus:outline-none text-slate-700 min-w-[100px] cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            </div>
            {/* --- CONTEÚDO PRINCIPAL --- */}
            <div className="flex-1 p-4 md:p-6 w-full h-full max-w-[1920px] mx-auto overflow-y-auto animate-fade-in" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>

                {/* ABA 1: VISÃO GERAL */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-12 auto-rows-min 2xl:grid-rows-6 gap-4 2xl:h-full pb-4 2xl:pb-2">
                        <div className="col-span-1 2xl:col-span-2 2xl:row-span-2 min-h-[220px] 2xl:min-h-0"><OEEGaugeCard value={parseFloat(activeAggregates.oee)} target={activeTargets.OEE} /></div>
                        {/* CORREÇÃO VISUAL: Adicionando os títulos (rótulos) nos PillarCards */}
                        <div className="col-span-1 2xl:col-span-2 2xl:row-span-2 flex flex-col gap-2 min-h-[220px] 2xl:min-h-0">
                            {/* Título adicionado */}
                            <PillarCard title="DISPONIBILIDADE" value={activeAggregates.avail} target={activeTargets.AVAIL} icon={AlertTriangle} className="flex-1 min-h-0" />
                            {/* Título adicionado */}
                            <PillarCard title="PERFORMANCE" value={activeAggregates.perf} target={activeTargets.PERF} icon={Clock} className="flex-1 min-h-0" />
                            {/* Título adicionado */}
                            <PillarCard title="QUALIDADE" value={activeAggregates.qual} target={activeTargets.QUAL} icon={CheckCircle} className="flex-1 min-h-0" />
                        </div>
                        <Card className="col-span-1 md:col-span-2 2xl:col-span-5 2xl:row-span-2 p-4 min-h-[280px] 2xl:min-h-0 relative">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-bold uppercase flex items-center gap-2 text-slate-600"><TrendingDown size={16} /> BRIDGE DE PERDAS ({areaMode === 'patio' ? 'VOLUME' : 'FORNOS'})</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded font-medium">Meta → Realizado</span>
                                    <button
                                        onClick={() => setShowBridgeExplainer(true)}
                                        className="text-slate-400 hover:text-blue-500 transition-colors p-1"
                                        title="Ver detalhes do cálculo"
                                    >
                                        <Info size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 min-h-0"><BridgeChart aggregates={activeAggregates} areaMode={areaMode} /></div>

                        </Card>
                        <div className="col-span-1 md:col-span-2 2xl:col-span-3 2xl:row-span-2 flex flex-col gap-2 min-h-[200px] 2xl:min-h-0">
                            {areaMode === 'patio' ? (
                                <>
                                    <div className="flex-1"><BigNumberCard title="VOLUME TOTAL" valueNumeric={activeAggregates.totalWetCharge} displayValue={(activeAggregates.totalWetCharge || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} unit="ton" target={activeAggregates.totalDays * 4188} compact={true} /></div>
                                    <div className="flex-1 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border-l-4 p-3 flex flex-col justify-between border border-slate-100" style={{ borderLeftColor: COLORS.orange }}><p className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1 text-slate-400"><Timer size={12} /> TAXA MÉDIA</p><div className="flex items-baseline gap-1"><h3 className="text-2xl font-bold" style={{ color: COLORS.orange }}>{((activeAggregates.totalWetCharge || 0) / ((activeAggregates.loadingMins || 1) / 60)).toFixed(1)}</h3><span className="text-[10px] font-medium text-gray-400">t/h</span></div><div className="text-[9px] text-gray-400 border-t border-slate-50 pt-1 mt-1 flex justify-between"><span>Base: <strong>Volume / Loading</strong></span></div></div>
                                </>
                            ) : (
                                <>
                                    <div className="flex-1"><BigNumberCard title="TOTAL FORNOS" valueNumeric={activeAggregates.ovensNumeric} displayValue={activeAggregates.ovensDisplay} unit="un" target={activeAggregates.targetOvens} compact={true} /></div>
                                    <div className="flex-1 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border-l-4 p-3 flex flex-col justify-between border border-slate-100" style={{ borderLeftColor: COLORS.orange }}><p className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1 text-slate-400"><Timer size={12} /> RITMO MÉDIO</p><div className="flex items-baseline gap-1"><h3 className="text-2xl font-bold" style={{ color: COLORS.orange }}>{activeAggregates.ritmoDisplay}</h3><span className="text-[10px] font-medium text-gray-400">min/forno</span></div><div className="text-[9px] text-gray-400 border-t border-slate-50 pt-1 mt-1 flex justify-between"><span>Base: <strong>Loading / Realizado</strong></span></div></div>
                                </>
                            )}
                        </div>
                        <div className="col-span-1 md:col-span-2 2xl:col-span-12 2xl:row-span-2 min-h-[280px] 2xl:min-h-0">
                            <TargetChart data={calculatedData} dataKey="oee" target={activeTargets.OEE} title="EVOLUÇÃO OEE GLOBAL (%)" colorLine={COLORS.lightGray} onBarClick={handleBarToggle} selectedKey={filterSelection} />
                        </div>
                        <div className="col-span-1 2xl:col-span-4 2xl:row-span-2 min-h-[220px] 2xl:min-h-0">
                            <TargetChart data={calculatedData} dataKey="avail" target={activeTargets.AVAIL} title="DISPONIBILIDADE (%)" colorLine={COLORS.lightGray} onBarClick={handleBarToggle} selectedKey={filterSelection} />
                        </div>
                        <div className="col-span-1 2xl:col-span-4 2xl:row-span-2 min-h-[220px] 2xl:min-h-0">
                            <TargetChart data={calculatedData} dataKey="perf" target={activeTargets.PERF} icon={Clock} title="PERFORMANCE (%)" colorLine={COLORS.lightGray} onBarClick={handleBarToggle} selectedKey={filterSelection} />
                        </div>
                        <div className="col-span-1 2xl:col-span-4 2xl:row-span-2 min-h-[220px] 2xl:min-h-0">
                            <TargetChart data={calculatedData} dataKey="qual" target={activeTargets.QUAL} icon={CheckCircle} title="QUALIDADE (%)" colorLine={COLORS.lightGray} yMax={110} onBarClick={handleBarToggle} selectedKey={filterSelection} />
                        </div>
                    </div>
                )}

                {/* ABA 5: CONFIABILIDADE (MOVIDA PARA TREE SUBTAB) */}
                {activeTab === 'tree' && treeSubTab === 'verification' && (
                    <div className="h-full overflow-y-auto flex flex-col pb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-6 gap-2 content-start">
                            <div className="col-span-1 md:col-span-2 2xl:col-span-6 mb-1 flex items-center gap-2 mt-2"><div className="h-px bg-slate-300 flex-1"></div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Disponibilidade</span><div className="h-px bg-slate-300 flex-1"></div></div>
                            <div className="col-span-1 2xl:col-span-2 h-24"><ComparisonCard title="Manutenção Prog." target={activeAggregates.targetMaintMins / 60} real={(activeAggregates.usedMaintMins) / 60} inverse={true} /></div>
                            <div className="col-span-1 2xl:col-span-2 h-24"><ComparisonCard title="Corretivas / Falhas" target={activeAggregates.loadingMins * (1 - activeTargets.AVAIL / 100) / 60} real={activeAggregates.failLossMins / 60} inverse={true} /></div>
                            <div className="col-span-1 2xl:col-span-2 h-24"><ComparisonCard title="Excedente Manut." target={0} real={(activeAggregates.extMaintMins + activeAggregates.outsideMaintMins) / 60} inverse={true} /></div>
                            <div className="col-span-1 md:col-span-2 2xl:col-span-6 mt-3 mb-1 flex items-center gap-2"><div className="h-px bg-slate-300 flex-1"></div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Performance & Operação</span><div className="h-px bg-slate-300 flex-1"></div></div>
                            <div className="col-span-1 2xl:col-span-2 h-24"><ComparisonCard title="Fornos Produzidos" target={activeAggregates.targetOvens} real={activeAggregates.ovensNumeric} unit="un" inverse={false} /></div>
                            <div className="col-span-1 2xl:col-span-2 h-24"><ComparisonCard title="Troca de Turno" target={activeAggregates.targetShiftChange} real={activeAggregates.shiftLossMins / 60} inverse={true} showDeviationOnly={true} /></div>
                            <div className="col-span-1 2xl:col-span-2 h-24"><ComparisonCard title="Perda Operacional" target={0} real={(activeAggregates.opsLossMins) / 60} inverse={true} /></div>
                        </div>
                    </div>
                )}

                {/* ABA JANELA: Checklist de Janela (Aderência) + Gráfico de Barras */}
                {activeTab === 'tree' && treeSubTab === 'janela' && (
                    <div className="h-full overflow-y-auto flex flex-col pb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-6 gap-2 content-start">
                            {/* Título da seção */}
                            <div className="col-span-1 md:col-span-2 2xl:col-span-6 mb-1 flex items-center gap-2 mt-2 flex-wrap"><div className="h-px bg-slate-300 flex-1 hidden md:block"></div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-full md:w-auto text-center">Checklist de Janela (Aderência)</span><div className="flex gap-3 ml-2 text-[9px] font-medium border-l pl-2 border-slate-300 text-slate-400 justify-center w-full md:w-auto"><div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> &lt; 50%</div><div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div> 50-90%</div><div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> &gt; 90%</div></div><div className="h-px bg-slate-300 flex-1 hidden md:block"></div></div>

                            {/* Cards do checklist */}
                            {areaMode === 'maquinas' ? (
                                <>
                                    {/* MÁQUINAS: Janelas Simultâneas 5h - Primeiro Card */}
                                    <div className="col-span-1 h-32">
                                        <Card className="p-3 flex flex-col justify-between h-full border-l-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderLeftColor: '#8B5CF6' }}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="p-1 rounded-full bg-purple-50 text-purple-500"><AlertTriangle size={12} /></div>
                                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate">Simultâneas 5h+</p>
                                            </div>
                                            <div className="flex items-center justify-center flex-1">
                                                <span className="text-4xl font-black text-purple-600">{activeAggregates.countSimultaneous5h || 0}</span>
                                            </div>
                                            <p className="text-[8px] text-slate-400 text-center">Dias com ambos ≥5h</p>
                                        </Card>
                                    </div>

                                    {/* MÁQUINAS: Janelas Realizadas (5h) */}
                                    <div className="col-span-1 h-32">
                                        <Card className="p-3 flex flex-col justify-between h-full border-l-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderLeftColor: COLORS.blue }}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="p-1 rounded-full bg-blue-50 text-blue-500"><CheckCircle size={12} /></div>
                                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate">Janelas Realizadas (5h)</p>
                                            </div>
                                            <div className="flex gap-3 mb-1">
                                                <div>
                                                    <span className="text-xl font-bold text-slate-700 block leading-none">{activeAggregates.count5hNorte || 0}</span>
                                                    <span className="text-[8px] text-slate-400 font-bold uppercase">Norte</span>
                                                </div>
                                                <div className="w-px bg-slate-200"></div>
                                                <div>
                                                    <span className="text-xl font-bold text-slate-700 block leading-none">{activeAggregates.count5hSul || 0}</span>
                                                    <span className="text-[8px] text-slate-400 font-bold uppercase">Sul</span>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 rounded p-1.5 border border-slate-100">
                                                <div className="flex justify-between text-[9px] text-slate-500 mb-0.5"><span>Simultâneas:</span> <strong className="text-slate-700">{activeAggregates.countSimultaneous || 0}</strong></div>
                                                <div className="flex justify-between text-[9px] text-slate-500"><span>Simult. 5h:</span> <strong className="text-blue-600">{activeAggregates.countSimultaneous5h || 0}</strong></div>
                                            </div>
                                        </Card>
                                    </div>
                                    {/* MÁQUINAS: Dias Com Parada */}
                                    <div className="col-span-1 h-32"><CheckCardDual title="Dias Com Parada" valNorte={activeAggregates.daysWithStopNorte} totalNorte={activeAggregates.windowTotalDays} valSul={activeAggregates.daysWithStopSul} totalSul={activeAggregates.windowTotalDays} sub="Com registro" icon={CalendarX} /></div>
                                    {/* MÁQUINAS: Dentro Horário */}
                                    <div className="col-span-1 h-32"><CheckCardDual title="Dentro Horário" valNorte={activeAggregates.winInsideOkNorte} totalNorte={activeAggregates.daysWithStopNorte} valSul={activeAggregates.winInsideOkSul} totalSul={activeAggregates.daysWithStopSul} sub="Entre 08h-17h" icon={Maximize} /></div>
                                    {/* MÁQUINAS: Pontualidade Início */}
                                    <div className="col-span-1 h-32"><CheckCardDual title="Pontualidade Início" valNorte={activeAggregates.winStartOkNorte} totalNorte={activeAggregates.daysWithStopNorte} valSul={activeAggregates.winStartOkSul} totalSul={activeAggregates.daysWithStopSul} sub="Início 08:00 ±15m" icon={PlayCircle} /></div>
                                    {/* MÁQUINAS: Pontualidade Fim */}
                                    <div className="col-span-1 h-32"><CheckCardDual title="Pontualidade Fim" valNorte={activeAggregates.winEndOkNorte} totalNorte={activeAggregates.daysWithStopNorte} valSul={activeAggregates.winEndOkSul} totalSul={activeAggregates.daysWithStopSul} sub="Término 13:00 ±15m" icon={StopCircle} /></div>
                                </>
                            ) : (
                                <>
                                    {/* PÁTIO: Dias Com Parada (Quintas vs Outros) */}
                                    <div className="col-span-1 h-32">
                                        <Card className="p-3 flex flex-col justify-between h-full border-l-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderLeftColor: COLORS.blue }}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="p-1 rounded-full bg-blue-50 text-blue-500"><CalendarX size={12} /></div>
                                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate">Dias Com Parada</p>
                                            </div>
                                            <div className="flex gap-3 mb-1">
                                                <div>
                                                    <span className="text-xl font-bold text-slate-700 block leading-none">{activeAggregates.patioDaysWithStopThursday || 0}</span>
                                                    <span className="text-[8px] text-slate-400 font-bold uppercase">Quintas</span>
                                                </div>
                                                <div className="w-px bg-slate-200"></div>
                                                <div>
                                                    <span className="text-xl font-bold text-slate-700 block leading-none">{activeAggregates.patioDaysWithStopOther || 0}</span>
                                                    <span className="text-[8px] text-slate-400 font-bold uppercase">Outros</span>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 rounded p-1.5 border border-slate-100">
                                                <div className="flex justify-between text-[9px] text-slate-500"><span>Total:</span> <strong className="text-slate-700">{activeAggregates.patioDaysWithStop || 0} / {activeAggregates.windowTotalDays || 0}</strong></div>
                                            </div>
                                        </Card>
                                    </div>
                                    {/* PÁTIO: Dentro do Horário */}
                                    <div className="col-span-1 h-32">
                                        <Card className="p-3 flex flex-col justify-between h-full border-l-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderLeftColor: COLORS.green }}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="p-1 rounded-full bg-green-50 text-green-500"><Maximize size={12} /></div>
                                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate">Dentro Horário</p>
                                            </div>
                                            <div className="flex gap-3 mb-1">
                                                <div>
                                                    <span className="text-xl font-bold text-slate-700 block leading-none">{activeAggregates.patioInsideOkThursday || 0}</span>
                                                    <span className="text-[8px] text-slate-400 font-bold uppercase">Quintas</span>
                                                </div>
                                                <div className="w-px bg-slate-200"></div>
                                                <div>
                                                    <span className="text-xl font-bold text-slate-700 block leading-none">{activeAggregates.patioInsideOkOther || 0}</span>
                                                    <span className="text-[8px] text-slate-400 font-bold uppercase">Outros</span>
                                                </div>
                                            </div>
                                            <p className="text-[8px] text-slate-400 text-center">Qui: 08h-16h | Outros: 08h-12h</p>
                                        </Card>
                                    </div>
                                    {/* PÁTIO: Pontualidade Início */}
                                    <div className="col-span-1 h-32">
                                        <Card className="p-3 flex flex-col justify-between h-full border-l-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderLeftColor: COLORS.yellow }}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="p-1 rounded-full bg-yellow-50 text-yellow-600"><PlayCircle size={12} /></div>
                                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate">Pontualidade Início</p>
                                            </div>
                                            <div className="flex gap-3 mb-1">
                                                <div>
                                                    <span className="text-xl font-bold text-slate-700 block leading-none">{activeAggregates.patioStartOkThursday || 0}</span>
                                                    <span className="text-[8px] text-slate-400 font-bold uppercase">Quintas</span>
                                                </div>
                                                <div className="w-px bg-slate-200"></div>
                                                <div>
                                                    <span className="text-xl font-bold text-slate-700 block leading-none">{activeAggregates.patioStartOkOther || 0}</span>
                                                    <span className="text-[8px] text-slate-400 font-bold uppercase">Outros</span>
                                                </div>
                                            </div>
                                            <p className="text-[8px] text-slate-400 text-center">Início 08:00 ±15min</p>
                                        </Card>
                                    </div>
                                    {/* PÁTIO: Pontualidade Fim */}
                                    <div className="col-span-1 h-32">
                                        <Card className="p-3 flex flex-col justify-between h-full border-l-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderLeftColor: COLORS.red }}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="p-1 rounded-full bg-red-50 text-red-500"><StopCircle size={12} /></div>
                                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate">Pontualidade Fim</p>
                                            </div>
                                            <div className="flex gap-3 mb-1">
                                                <div>
                                                    <span className="text-xl font-bold text-slate-700 block leading-none">{activeAggregates.patioEndOkThursday || 0}</span>
                                                    <span className="text-[8px] text-slate-400 font-bold uppercase">Quintas</span>
                                                </div>
                                                <div className="w-px bg-slate-200"></div>
                                                <div>
                                                    <span className="text-xl font-bold text-slate-700 block leading-none">{activeAggregates.patioEndOkOther || 0}</span>
                                                    <span className="text-[8px] text-slate-400 font-bold uppercase">Outros</span>
                                                </div>
                                            </div>
                                            <p className="text-[8px] text-slate-400 text-center">Qui: 16:00 | Outros: 12:00 ±15min</p>
                                        </Card>
                                    </div>
                                </>
                            )}

                            {/* Gráfico de Barras - Horas de Janela por Período */}
                            <div className="col-span-1 md:col-span-2 2xl:col-span-6 mt-4 h-80">
                                <WindowHoursChart data={windowHoursData} title={areaMode === 'maquinas' ? "Horas de Janela por Período (Norte x Sul)" : "Horas de Parada Programada por Período"} />
                            </div>
                        </div>
                    </div>
                )}


                {/* ABA 3: ÁRVORE OEE */}
                {activeTab === 'tree' && treeSubTab === 'tree_main' && treeStats && (
                    <div className="h-full relative overflow-y-auto pb-4">
                        <div className="absolute top-0 left-0 z-20 hidden 2xl:block">
                            <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl shadow-sm w-48">
                                <h4 className="text-[10px] font-bold text-orange-800 mb-2 uppercase tracking-wide">Resultado da Produção</h4>
                                <div className="flex flex-col gap-2">
                                    {areaMode === 'maquinas' ? (
                                        <>
                                            <div><span className="block text-orange-400 text-[9px] uppercase font-bold">Fornos</span><span className="text-xl font-bold text-slate-700">{activeAggregates.ovensDisplay}</span></div>
                                            <div className="h-px bg-orange-200 w-full"></div>
                                            <div><span className="block text-orange-400 text-[9px] uppercase font-bold">Ritmo Médio</span><span className="text-xl font-bold text-slate-700">{activeAggregates.ritmoDisplay} <span className="text-[9px] font-normal text-slate-400">min/u</span></span></div>
                                        </>
                                    ) : (
                                        <>
                                            <div><span className="block text-orange-400 text-[9px] uppercase font-bold">Volume</span><span className="text-xl font-bold text-slate-700">{activeAggregates.totalWetCharge?.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) || 0} <span className="text-[9px] font-normal text-slate-400">t</span></span></div>
                                            <div className="h-px bg-orange-200 w-full"></div>
                                            <div><span className="block text-orange-400 text-[9px] uppercase font-bold">Taxa Média</span><span className="text-xl font-bold text-slate-700">{activeAggregates.patioBridgeReal?.TLIQR?.toFixed(1) || 0} <span className="text-[9px] font-normal text-slate-400">t/h</span></span></div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="2xl:hidden mb-4 p-3 bg-orange-50 border border-orange-100 rounded-xl shadow-sm">
                            <h4 className="text-[10px] font-bold text-orange-800 mb-2 uppercase tracking-wide">Resultado da Produção</h4>
                            <div className="flex justify-between">
                                {areaMode === 'maquinas' ? (
                                    <>
                                        <div><span className="block text-orange-400 text-[9px] uppercase font-bold">Fornos</span><span className="text-xl font-bold text-slate-700">{activeAggregates.ovensDisplay}</span></div>
                                        <div className="w-px bg-orange-200"></div>
                                        <div><span className="block text-orange-400 text-[9px] uppercase font-bold">Ritmo Médio</span><span className="text-xl font-bold text-slate-700">{activeAggregates.ritmoDisplay} <span className="text-[9px] font-normal text-slate-400">min/u</span></span></div>
                                    </>
                                ) : (
                                    <>
                                        <div><span className="block text-orange-400 text-[9px] uppercase font-bold">Volume</span><span className="text-xl font-bold text-slate-700">{activeAggregates.totalWetCharge?.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) || 0} <span className="text-[9px] font-normal text-slate-400">t</span></span></div>
                                        <div className="w-px bg-orange-200"></div>
                                        <div><span className="block text-orange-400 text-[9px] uppercase font-bold">Taxa Média</span><span className="text-xl font-bold text-slate-700">{activeAggregates.patioBridgeReal?.TLIQR?.toFixed(1) || 0} <span className="text-[9px] font-normal text-slate-400">t/h</span></span></div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col items-center pt-2 2xl:pt-8 w-full max-w-5xl mx-auto">
                            {(() => {
                                const oeeVal = parseFloat(activeAggregates.oee);
                                const colorOee = oeeVal >= activeTargets.OEE ? COLORS.green : COLORS.red;
                                return (
                                    <>
                                        <div className="flex flex-col items-center mb-8 relative z-10 w-full max-w-4xl">
                                            <Card className="w-full md:w-64 p-4 border-t-4 text-center shadow-lg relative" style={{ borderTopColor: colorOee }}>
                                                <button
                                                    onClick={() => setShowOEEExplainer(true)}
                                                    className="absolute top-2 right-2 text-slate-400 hover:text-blue-500 transition-colors p-1"
                                                    title="Ver detalhes do cálculo OEE"
                                                >
                                                    <Info size={14} />
                                                </button>
                                                <h3 className="font-bold text-slate-500 uppercase text-xs mb-1">OEE Global</h3>
                                                <span className="text-4xl font-bold block" style={{ color: colorOee }}>{activeAggregates.oee}%</span>
                                                <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-400 flex justify-between"><span>Meta: {activeTargets.OEE}%</span><span style={{ color: colorOee }}>{oeeVal >= activeTargets.OEE ? '▲' : '▼'}</span></div>
                                            </Card>
                                            <div className="h-8 w-px bg-slate-300 hidden 2xl:block"></div><div className="h-px bg-slate-300 w-[70%] hidden 2xl:block"></div>
                                        </div>
                                        <div className="flex flex-col 2xl:flex-row justify-between w-full max-w-5xl px-0 md:px-4 mb-8 relative z-10 gap-8 2xl:gap-4">
                                            <div className="flex flex-col items-center relative w-full">
                                                <div className="h-4 w-px bg-slate-300 absolute -top-8 hidden 2xl:block"></div>
                                                <PillarCard title="DISPONIBILIDADE" value={activeAggregates.avail} target={activeTargets.AVAIL} icon={AlertTriangle} className="w-full 2xl:w-64 shadow-md hover:shadow-lg transition-all" />
                                            </div>
                                            <div className="flex flex-col items-center relative w-full">
                                                <div className="h-4 w-px bg-slate-300 absolute -top-8 hidden 2xl:block"></div>
                                                <PillarCard title="PERFORMANCE" value={activeAggregates.perf} target={activeTargets.PERF} icon={Clock} className="w-full 2xl:w-64 shadow-md hover:shadow-lg transition-all" />
                                            </div>
                                            <div className="flex flex-col items-center relative w-full">
                                                <div className="h-4 w-px bg-slate-300 absolute -top-8 hidden 2xl:block"></div>
                                                <PillarCard title="QUALIDADE (YIELD)" value={activeAggregates.qual} target={activeTargets.QUAL} icon={CheckCircle} className="w-full 2xl:w-64 shadow-md hover:shadow-lg transition-all" />
                                            </div>
                                        </div>

                                        {/* Tabela OEE Detalhado abaixo da árvore */}
                                        <div className="w-full max-w-6xl mt-6 px-2">
                                            <Card className="p-4">
                                                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                                    📊 OEE Detalhado por Período
                                                </h3>
                                                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                                                    <table className="w-full text-xs">
                                                        <thead className="bg-slate-100 sticky top-0">
                                                            <tr className="text-[10px]">
                                                                <th className="px-2 py-1 text-left">Período</th>
                                                                <th className="px-2 py-1 text-right bg-blue-50">Calendar</th>
                                                                <th className="px-2 py-1 text-right bg-blue-50">Loading</th>
                                                                <th className="px-2 py-1 text-right bg-blue-50">Operating</th>
                                                                <th className="px-2 py-1 text-right bg-blue-50">NetOper</th>
                                                                <th className="px-2 py-1 text-right bg-red-50">Indisp</th>
                                                                <th className="px-2 py-1 text-right bg-red-50">P. Op</th>
                                                                <th className="px-2 py-1 text-right bg-green-50">Volume</th>
                                                                <th className="px-2 py-1 text-right bg-orange-50">Disp %</th>
                                                                <th className="px-2 py-1 text-right bg-orange-50">Perf %</th>
                                                                <th className="px-2 py-1 text-right bg-orange-50 font-bold">OEE %</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {calculatedData.map((r, i) => (
                                                                <tr key={i} className="hover:bg-slate-50">
                                                                    <td className="px-2 py-1.5 font-medium text-slate-700">{r.label || r.day}</td>
                                                                    <td className="px-2 py-1.5 text-right bg-blue-50/30">{r.calendar?.toFixed(0)}</td>
                                                                    <td className="px-2 py-1.5 text-right bg-blue-50/30">{r.loadingMins?.toFixed(0)}</td>
                                                                    <td className="px-2 py-1.5 text-right bg-blue-50/30">{r.operating?.toFixed(0)}</td>
                                                                    <td className="px-2 py-1.5 text-right bg-blue-50/30">{r.netOperating?.toFixed(0)}</td>
                                                                    <td className="px-2 py-1.5 text-right bg-red-50/30">{r.failureLoss?.toFixed(0) || r.lossDisp?.toFixed(0)}</td>
                                                                    <td className="px-2 py-1.5 text-right bg-red-50/30">{r.lossUtil?.toFixed(0)}</td>
                                                                    <td className="px-2 py-1.5 text-right bg-green-50/30">{r.wetCharge?.toFixed(1)}</td>
                                                                    <td className="px-2 py-1.5 text-right bg-orange-50/30" style={{ color: r.avail >= activeTargets.AVAIL ? COLORS.green : COLORS.red }}>{r.avail?.toFixed(1)}%</td>
                                                                    <td className="px-2 py-1.5 text-right bg-orange-50/30" style={{ color: r.perf >= activeTargets.PERF ? COLORS.green : COLORS.red }}>{r.perf?.toFixed(1)}%</td>
                                                                    <td className="px-2 py-1.5 text-right bg-orange-50/30 font-bold" style={{ color: r.oee >= activeTargets.OEE ? COLORS.green : COLORS.red }}>{r.oee?.toFixed(1)}%</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </Card>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* ABA 4: PERDAS */}
                {activeTab === 'losses' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 grid-rows-none 2xl:grid-rows-2 gap-6 h-full pb-4 auto-rows-auto">
                        <Card className="col-span-1 md:col-span-2 2xl:col-span-2 2xl:row-span-1 p-4 min-h-[350px]">
                            <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-slate-700 text-sm">Composição de Perdas (%)</h3><span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded">Proporção Disp. vs Perf.</span></div>
                            <div className="flex-1 min-h-0 h-full"><LossEvolutionChart data={calculatedData} onDrillDown={handleChartDrillDown} selectedKey={filterSelection} selectedType={lossFilter} /></div>
                        </Card>
                        <div className="col-span-1 2xl:col-span-1 2xl:row-span-2 flex flex-col gap-4">
                            <Card className={`flex-1 p-4 flex flex-col transition-all duration-300 min-h-[350px] ${equipmentFilter ? 'ring-2 ring-orange-100' : ''}`}><h3 className="font-bold text-slate-700 text-xs mb-2 flex items-center gap-2"><Wrench size={14} className="text-orange-600" /> {lossFilter === 'availability' ? 'Equipamentos (Disponibilidade)' : lossFilter === 'performance' ? 'Equipamentos (Performance)' : 'Equipamentos (Geral)'}</h3><div className="flex-1 min-h-0"><ParetoChart data={topEquipmentsData} color={lossFilter === 'availability' ? COLORS.blue : lossFilter === 'performance' ? COLORS.yellow : COLORS.darkGray} emptyMessage="Tag de Equipamento não encontrada" onBarClick={handleEquipmentToggle} selectedName={equipmentFilter} /></div><div className="text-[9px] text-center text-gray-400 mt-1 italic">Clique na barra para filtrar por equipamento</div></Card>
                            <Card className="flex-1 p-4 flex flex-col transition-all duration-300 min-h-[350px]"><h3 className="font-bold text-slate-700 text-xs mb-2 flex items-center gap-2"><Layers size={14} className="text-orange-600" /> {lossFilter === 'availability' ? 'Componente - Modo Falha (Disp.)' : lossFilter === 'performance' ? 'Componente - Modo Falha (Perf.)' : 'Componente - Modo Falha (Geral)'}</h3><div className="flex-1 min-h-0"><ParetoChart data={topCausesData} color={lossFilter === 'availability' ? COLORS.blue : lossFilter === 'performance' ? COLORS.yellow : COLORS.darkGray} emptyMessage={equipmentFilter ? "Nenhuma falha para este equipamento" : "Selecione um equipamento ou período"} /></div></Card>
                        </div>
                        <Card onClick={() => toggleLossFilter('availability')} className={`col-span-1 2xl:col-span-1 2xl:row-span-1 p-5 border-t-4 flex flex-col relative overflow-hidden transition-all duration-300 min-h-[250px] ${lossFilter === 'availability' ? 'ring-2 ring-blue-500 shadow-md scale-[1.02]' : lossFilter ? 'opacity-50 grayscale-[0.5]' : 'hover:shadow-md hover:scale-[1.01]'}`} style={{ borderTopColor: COLORS.blue }}><div className="absolute top-0 right-0 p-4 opacity-10"><AlertTriangle size={60} color={COLORS.blue} /></div><h3 className="font-bold text-gray-500 uppercase text-xs mb-4 flex items-center gap-2">{lossFilter === 'availability' && <CheckCircle size={14} className="text-blue-600" />} Perdas de Disponibilidade</h3><div className="flex-1 flex flex-col justify-center gap-4"><div><span className="text-3xl font-bold block" style={{ color: COLORS.blue }}>{activeAggregates.lossDispH} h</span><span className="text-xs text-gray-400">Total Indisponível {equipmentFilter ? `(${equipmentFilter})` : ''}</span></div><div className="h-px bg-slate-100 w-full"></div><div className="grid grid-cols-2 gap-2 text-xs"><div><span className="block font-bold text-slate-700">{activeAggregates.lossFailH} h</span><span className="text-gray-400">Falhas Téc.</span></div><div><span className="block font-bold text-slate-700">{(parseFloat(activeAggregates.lossDispH) - parseFloat(activeAggregates.lossFailH)).toFixed(1)} h</span><span className="text-gray-400">Outros/Ext.</span></div></div></div><div className="absolute bottom-2 right-2 text-[10px] text-gray-300 italic">Clique para filtrar tipo</div></Card>
                        <Card onClick={() => toggleLossFilter('performance')} className={`col-span-1 2xl:col-span-1 2xl:row-span-1 p-5 border-t-4 flex flex-col relative overflow-hidden transition-all duration-300 min-h-[250px] ${lossFilter === 'performance' ? 'ring-2 ring-yellow-400 shadow-md scale-[1.02]' : lossFilter ? 'opacity-50 grayscale-[0.5]' : 'hover:shadow-md hover:scale-[1.01]'}`} style={{ borderTopColor: COLORS.yellow }}><div className="absolute top-0 right-0 p-4 opacity-10"><Clock size={60} color={COLORS.yellow} /></div><h3 className="font-bold text-gray-500 uppercase text-xs mb-4 flex items-center gap-2">{lossFilter === 'performance' && <CheckCircle size={14} className="text-yellow-600" />} Perdas de Performance</h3><div className="flex-1 flex flex-col justify-center gap-4"><div><span className="text-3xl font-bold block" style={{ color: COLORS.yellow }}>{activeAggregates.lossUtilH} h</span><span className="text-xs text-gray-400">Total Perda Ritmo/Ops {equipmentFilter ? `(${equipmentFilter})` : ''}</span></div><div className="h-px bg-slate-100 w-full"></div><div className="text-xs text-gray-400 leading-relaxed">Calculado base: Capacidade Teórica - Realizado. Inclui microparadas, redução de velocidade e trocas de turno.</div></div><div className="absolute bottom-2 right-2 text-[10px] text-gray-300 italic">Clique para filtrar tipo</div></Card>
                    </div>
                )}

                {/* ABA 5: CONFIABILIDADE (MODIFICADA para 3 sub-abas) */}
                {activeTab === 'reliability' && (
                    <div className="h-full flex flex-col gap-4">
                        <div className="flex bg-white rounded-xl p-1 gap-1 shadow-sm border border-slate-200 shrink-0 w-full md:w-auto">
                            {[{ key: 'jackknife', icon: ScatterChart, label: 'Diagrama Jack-Knife' }, { key: 'trend', icon: LineChart, label: 'MTBF/MTTR Tendência' }, { key: 'weibull', icon: LifeBuoy, label: 'Análise Weibull' }].map(tab => (
                                <button key={tab.key} onClick={() => setActiveReliabilitySubTab(tab.key)} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${activeReliabilitySubTab === tab.key ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}><tab.icon size={14} /> {tab.label}</button>
                            ))}
                        </div>

                        {/* Conteúdo Jack Knife (Original) */}
                        {activeReliabilitySubTab === 'jackknife' && (
                            <div className="grid grid-cols-1 2xl:grid-cols-2 grid-rows-none 2xl:grid-rows-6 gap-4 pb-4 auto-rows-auto flex-1">
                                <div className="col-span-1 2xl:row-span-5 min-h-[450px]"><CustomJackKnifeChart title="Análise Jack Knife: Equipamentos" data={jackKnifeData.equip} onPointClick={(e) => { const clickedName = e.name || (e.payload && e.payload.name); if (clickedName) setSelectedEquipJackKnife(prev => prev === clickedName ? null : clickedName); }} selectedId={selectedEquipJackKnife} type="equip" /></div>
                                <div className="col-span-1 2xl:row-span-5 min-h-[450px]">{selectedEquipJackKnife ? (<CustomJackKnifeChart title={`Drill Down: ${selectedEquipJackKnife} (Componentes)`} data={jackKnifeData.comp.filter(c => c.parentEquip === selectedEquipJackKnife)} type="comp" />) : (<Card className="h-full flex items-center justify-center bg-slate-50 border-dashed"><div className="text-center text-slate-400"><Crosshair size={48} className="mx-auto mb-2 opacity-20" /><p className="text-sm font-bold">Selecione um Equipamento</p><p className="text-xs">Clique no gráfico ao lado para ver detalhes</p></div></Card>)}</div>
                                <div className="col-span-1 2xl:col-span-2 2xl:row-span-1 min-h-[100px]"><Card className="h-full p-3 flex flex-row items-center justify-between bg-slate-50 border-slate-200 overflow-hidden"><div className="flex items-center gap-3 flex-1 min-w-0 mr-2"><div className="p-2.5 bg-white rounded-full shadow-sm shrink-0"><Filter size={18} className="text-slate-400" /></div><div className="flex-1 min-w-0"><h4 className="text-sm font-bold text-slate-600 truncate">Eventos Pontuais (Ruído)</h4><p className="text-[10px] text-slate-400 truncate">Eventos de baixa frequência e MTTR removidos para clareza (Princípio Pareto 80/20)</p></div></div><div className="flex gap-4 pl-4 border-l border-slate-200 shrink-0 h-full items-center justify-end"><div className="text-center w-16"><span className="block text-xl font-bold text-slate-700 leading-none">{jackKnifeData.noise.length}</span><span className="text-[9px] text-slate-400 uppercase font-bold block mt-0.5">Eventos</span></div><div className="text-center w-20"><span className="block text-xl font-bold text-slate-700 leading-none">{(jackKnifeData.noise.reduce((a, b) => a + b.totalDuration, 0) / 60).toFixed(1)} h</span><span className="text-[9px] text-slate-400 uppercase font-bold block mt-0.5">Total Parado</span></div></div></Card></div>
                            </div>
                        )}

                        {/* Conteúdo Tendência */}
                        {activeReliabilitySubTab === 'trend' && (
                            <div className="grid grid-cols-1 pb-4 auto-rows-auto flex-1">
                                <div className="col-span-1 min-h-[500px]"><ReliabilityTrendChart data={reliabilityTrendData} aggregation={aggregation} /></div>
                                <div className="col-span-1 mt-4"><Card className="p-4 bg-slate-50 border-t-4 border-blue-500"><p className="text-xs font-bold text-slate-700 mb-2">Entendendo a Tendência de Confiabilidade</p><p className="text-xs text-slate-500">O **MTBF (Mean Time Between Failures)** idealmente deve **subir** (mais horas entre falhas), e o **MTTR (Mean Time To Repair)** idealmente deve **cair** (menos tempo para reparar). Esta análise usa o Tempo Disponível de Operação (Loading Time) no período como base para o cálculo do MTBF, refletindo a real janela de oportunidade para falha.</p></Card></div>
                            </div>
                        )}

                        {/* Conteúdo Weibull (NOVO) */}
                        {activeReliabilitySubTab === 'weibull' && (
                            <div className="grid grid-cols-1 xl:grid-cols-3 pb-4 auto-rows-auto flex-1 gap-4">

                                <Card className="col-span-1 xl:col-span-3 p-4 flex flex-col md:flex-row justify-between items-center bg-slate-50">
                                    <h3 className="text-sm font-bold text-slate-700">Selecione o Equipamento para Análise de Vida Útil:</h3>
                                    <div className="flex items-center gap-2 mt-2 md:mt-0">
                                        <select
                                            value={weibullEquipmentFilter || ''}
                                            onChange={(e) => setWeibullEquipmentFilter(e.target.value)}
                                            className="appearance-none bg-white border border-slate-300 text-slate-700 py-1.5 pl-3 pr-8 rounded-lg text-xs font-bold cursor-pointer shadow-sm"
                                        >
                                            <option value="">-- Selecione um Equipamento --</option>
                                            {availableEquipments.map(equip => (
                                                <option key={equip} value={equip}>{equip}</option>
                                            ))}
                                        </select>
                                        {weibullEquipmentFilter && (
                                            <button onClick={() => setWeibullEquipmentFilter(null)} className="text-red-500 hover:text-red-700 transition-colors"><X size={16} /></button>
                                        )}
                                    </div>
                                </Card>

                                <div className="col-span-1 xl:col-span-2 min-h-[500px]">
                                    <Card className="p-4 h-full flex flex-col">
                                        <h3 className="text-sm font-bold uppercase text-slate-600 mb-2">
                                            Gráfico de Probabilidade de Weibull ({weibullEquipmentFilter || 'Geral'})
                                        </h3>
                                        <div className="flex-1 min-h-0">
                                            <WeibullChart
                                                plotData={weibullData}
                                                ttfUnits="horas"
                                            />
                                        </div>
                                    </Card>
                                </div>

                                <Card className="col-span-1 min-h-[250px] p-4 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-700 mb-2 border-b pb-2">Resultados da Análise</h3>

                                        <div className="flex justify-between text-xs my-1">
                                            <span className="text-slate-500">Falhas analisadas (TTF):</span>
                                            <span className="font-bold text-slate-700">{weibullData.numFailures || weibullData.ttfs.length}</span>
                                        </div>

                                        <div className="flex justify-between text-xs my-1">
                                            <span className="text-slate-500 font-bold">Parâmetro Beta (Forma - β):</span>
                                            <span className="font-bold text-orange-600">{weibullData.parameters.beta !== undefined ? weibullData.parameters.beta.toFixed(3) : '--'}</span>
                                        </div>

                                        <div className="flex justify-between text-xs my-1 border-b pb-2">
                                            <span className="text-slate-500 font-bold">Parâmetro Eta (Vida Caract. - η):</span>
                                            <span className="font-bold text-orange-600">{weibullData.parameters.eta !== undefined ? weibullData.parameters.eta.toFixed(1) + ' h' : '--'}</span>
                                        </div>


                                        {weibullData.numFailures >= 3 && (
                                            <div className="mt-4">
                                                <p className="text-sm font-bold text-blue-600 mb-1">Interpretação (β)</p>
                                                <p className="text-xs text-slate-600 italic">{weibullData.parameters.interpretation}</p>
                                            </div>
                                        )}

                                        {weibullData.numFailures < 3 && weibullEquipmentFilter && (
                                            <div className="mt-4 p-2 bg-red-100 rounded text-red-700">
                                                <p className="text-xs font-bold">Dados Insuficientes:</p>
                                                <p className="text-xs">Mínimo de 3 falhas é necessário para o cálculo estatístico de regressão (Beta/Eta).</p>
                                            </div>
                                        )}

                                    </div>
                                    <div className="text-xs text-slate-400 border-t pt-2 mt-auto">
                                        *A linha de regressão (ajuste) é baseada no método Log-Log de Mediana de Rank.
                                    </div>
                                </Card>
                            </div>
                        )}

                    </div>
                )}

                {/* ABA 6: DESDOBRAMENTO */}
                {activeTab === 'breakdown' && (
                    <Card className="h-full overflow-hidden flex flex-col min-h-[600px]">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 font-bold text-sm uppercase flex justify-between items-center text-slate-600"><span>Detalhamento {aggregation === 'day' ? 'Diário' : 'Agregado'}</span><span className="text-xs text-slate-400 font-normal">{filterSelection ? "1 registro filtrado" : `${calculatedData.length} registros`}{equipmentFilter ? ` • Equipamento: ${equipmentFilter}` : ""}</span></div>
                        <div className="flex-1 overflow-auto">
                            <table className="min-w-full text-sm divide-y divide-slate-100 relative">
                                <thead className="bg-white sticky top-0 z-10 shadow-sm"><tr><th className="px-6 py-3 text-left font-bold text-slate-700">Período</th><th className="px-6 py-3 text-right font-bold text-slate-500">Disp %</th><th className="px-6 py-3 text-right font-bold text-slate-500">Perf %</th><th className="px-6 py-3 text-right font-bold text-slate-500">Yield %</th><th className="px-6 py-3 text-right font-bold text-orange-600">OEE %</th><th className="px-6 py-3 text-right font-bold text-slate-600">Perda Disp (h)</th><th className="px-6 py-3 text-right font-bold text-slate-600">Perda Perf (h)</th></tr></thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {(filterSelection ? calculatedData.filter(d => d.key === filterSelection) : calculatedData).map((r, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors"><td className="px-6 py-4 font-medium text-slate-700">{r.label}</td><td className="px-6 py-4 text-right" style={{ color: r.avail >= activeTargets.AVAIL ? COLORS.green : COLORS.red }}>{r.avail.toFixed(1)}</td><td className="px-6 py-4 text-right" style={{ color: r.perf >= activeTargets.PERF ? COLORS.green : COLORS.red }}>{r.perf.toFixed(1)}</td><td className="px-6 py-4 text-right" style={{ color: r.qual >= activeTargets.QUAL ? COLORS.green : COLORS.red }}>{r.qual.toFixed(2)}</td><td className="px-6 py-4 text-right font-bold bg-orange-50" style={{ color: r.oee >= activeTargets.OEE ? COLORS.green : COLORS.red }}>{r.oee.toFixed(1)}</td><td className="px-6 py-4 text-right font-bold text-slate-600">{(r.lossDisp / 60).toFixed(1)}</td><td className="px-6 py-4 text-right font-bold text-slate-600">{(r.lossUtil / 60).toFixed(1)}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

            </div>
            {showBridgeExplainer && (
                <BridgeChartExplanation aggregates={activeAggregates} areaMode={areaMode} onClose={() => setShowBridgeExplainer(false)} />
            )}
            {showOEEExplainer && (
                <OEEExplanation aggregates={activeAggregates} areaMode={areaMode} onClose={() => setShowOEEExplainer(false)} />
            )}
        </div>
    );
}