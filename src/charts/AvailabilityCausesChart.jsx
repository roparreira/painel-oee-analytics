import React, { useMemo, useState } from 'react';
import { COLORS } from '../config';
import { AlertTriangle, ChevronDown, ChevronUp, Maximize2, Minimize2, Search, Wrench, Calendar, AlertCircle } from 'lucide-react';

const AvailabilityCausesChart = ({ data, rawData, target, type = 'availability', areaMode = 'maquinas' }) => {
    const [expandedIndices, setExpandedIndices] = useState([]);
    const [highlightedEquip, setHighlightedEquip] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showImpactOnly, setShowImpactOnly] = useState(false);
    const [highlightAMT, setHighlightAMT] = useState(false);
    const [stopTypeFilter, setStopTypeFilter] = useState('all'); // 'all', 'programada', 'nao_programada'

    // Process data to find top causes for each period
    const chartData = useMemo(() => {
        if (!data || !rawData || !rawData.stops) return [];

        const isPatio = areaMode === 'patio' || areaMode === 'recebimento';

        return data.map((period, index) => {
            // Find stops in this period
            let periodStops = [];
            if (period.key.length === 10) { // Day
                periodStops = rawData.stops.filter(s => s.dateStr === period.key);
            } else if (period.key.length === 7 && period.key.includes('-')) { // Month
                periodStops = rawData.stops.filter(s => s.dateStr.startsWith(period.key));
            } else {
                periodStops = [];
            }

            // Group by EQUIP + CAUSE
            const causes = {};
            periodStops.forEach(s => {
                const areaLower = (s.area || '').toLowerCase();
                const tipoLower = (s.tipo || '').toLowerCase();
                const parouSim = (s.parou || '').toLowerCase().includes('sim');
                const disciplina = (s.disciplina || '').toUpperCase().trim();
                const isAMT = disciplina === 'AMT';

                // Check stop type using Column K values directly: "Programada" vs "Não Programada"
                const isProgramada = tipoLower.includes('programada') && !tipoLower.includes('não') && !tipoLower.includes('nao');
                const isNaoProgramada = tipoLower.includes('não programada') || tipoLower.includes('nao programada');

                // Filter by stop type if active
                if (stopTypeFilter === 'programada' && !isProgramada) return;
                if (stopTypeFilter === 'nao_programada' && !isNaoProgramada) return;

                // Filter by "Parou Produção" if active
                if (showImpactOnly && !parouSim) return;

                const isFailure = areaLower.includes('manut') || tipoLower.includes('corretiva') || tipoLower.includes('quebra');

                let isMatch = false;
                if (type === 'availability') {
                    if (isPatio) {
                        // Pátio: Availability = All stops (filtered by stopTypeFilter if needed)
                        isMatch = true;
                    } else {
                        // Máquinas: Availability = Manutenção failures
                        isMatch = isFailure;
                    }
                } else {
                    if (isPatio) {
                        // Pátio: Utilization = All stops (filtered by stopTypeFilter if needed)
                        isMatch = true;
                    } else {
                        // Máquinas: Utilization = Operational losses, Turno, etc.
                        isMatch = !isFailure;
                    }
                }

                if (!isMatch) return;

                // Label: Equip - Comp - Mode
                let causeLabel = "Indefinido";
                if (s.comp || s.modo) causeLabel = `${s.comp || '?'} - ${s.modo || '?'}`;
                else causeLabel = s.desc || s.tipo || "Geral";

                const fullLabel = `${s.equip} - ${causeLabel}`;

                if (!causes[fullLabel]) {
                    causes[fullLabel] = {
                        label: fullLabel,
                        equip: s.equip,
                        cause: causeLabel,
                        duration: 0,
                        count: 0,
                        // Separate tracking for "Impact" events (Parou=Sim or Parada Não Programada)
                        impactDuration: 0,
                        impactCount: 0,
                        isAMT: false,
                        descriptions: [] // Track activity descriptions for tooltip
                    };
                }
                causes[fullLabel].duration += s.duration;
                causes[fullLabel].count++;
                // Collect unique descriptions
                const descStr = (s.desc || '').trim();
                if (descStr && !causes[fullLabel].descriptions.includes(descStr)) {
                    causes[fullLabel].descriptions.push(descStr);
                }

                // Track impact events separately (for Analysis Required calculation)
                if (isPatio) {
                    if (isNaoProgramada) {
                        causes[fullLabel].impactDuration += s.duration;
                        causes[fullLabel].impactCount++;
                    }
                } else {
                    if (parouSim) {
                        causes[fullLabel].impactDuration += s.duration;
                        causes[fullLabel].impactCount++;
                    }
                }

                if (isAMT) causes[fullLabel].isAMT = true;
            });

            // Convert to Array and Check Rules
            const causesList = Object.values(causes).map(c => {
                let needsAnalysis = false;

                // Analysis Required ONLY applies to Availability type
                // Uses impactDuration/impactCount (only events with Parou=Sim or Parada Não Programada)
                if (type === 'availability') {
                    if (isPatio) {
                        // Envio/Recebimento: Parada Não Programada AND (>=300min OR 3x+>=300min)
                        needsAnalysis = c.impactDuration >= 300 || (c.impactCount >= 3 && c.impactDuration >= 300);
                    } else {
                        // Máquinas: Parou=Sim AND (>=180min OR 3x+>=180min)
                        needsAnalysis = c.impactDuration >= 180 || (c.impactCount >= 3 && c.impactDuration >= 180);
                    }
                }

                return { ...c, needsAnalysis };
            });

            // Sort by Duration Desc
            causesList.sort((a, b) => b.duration - a.duration);

            return {
                ...period,
                causes: causesList,
                index // Add index for expansion tracking
            };
        });
    }, [data, rawData, showImpactOnly, type, areaMode, stopTypeFilter]);


    const handleToggleExpand = (index) => {
        setExpandedIndices(prev => {
            if (prev.includes(index)) {
                return prev.filter(i => i !== index);
            } else {
                return [...prev, index];
            }
        });
    };

    const handleToggleAll = () => {
        if (expandedIndices.length === chartData.length) {
            setExpandedIndices([]); // Collapse All
        } else {
            setExpandedIndices(chartData.map((_, i) => i)); // Expand All
        }
    };

    const handleCauseClick = (e, equip) => {
        e.stopPropagation();
        setHighlightedEquip(prev => prev === equip ? null : equip);
    };

    // Calculate statistics for selected equipment, Search Filter, AMT Filter, or Stop Type Filter
    const stats = useMemo(() => {
        if (!chartData.length) return null;

        const isSearchActive = searchTerm.length >= 3;
        const isStopTypeActive = stopTypeFilter !== 'all';
        const activeFilter = isSearchActive ? 'search' : (highlightedEquip ? 'equip' : (highlightAMT ? 'amt' : (isStopTypeActive ? 'stopType' : null)));

        if (!activeFilter) return null;

        let totalDuration = 0;
        let filteredDuration = 0;

        chartData.forEach(d => {
            d.causes.forEach(c => {
                totalDuration += c.duration;

                let matches = false;
                if (activeFilter === 'search') {
                    const searchLower = searchTerm.toLowerCase();
                    const content = `${c.equip} ${c.cause}`.toLowerCase();
                    matches = content.includes(searchLower);
                } else if (activeFilter === 'equip') {
                    matches = c.equip === highlightedEquip;
                } else if (activeFilter === 'amt') {
                    matches = c.isAMT;
                } else if (activeFilter === 'stopType') {
                    // All visible causes match when stopTypeFilter is applied (data already filtered)
                    matches = true;
                }

                if (matches) {
                    filteredDuration += c.duration;
                }
            });
        });

        const pct = totalDuration ? ((filteredDuration / totalDuration) * 100).toFixed(1) : 0;
        let label = '';
        if (activeFilter === 'equip') label = highlightedEquip;
        else if (activeFilter === 'amt') label = 'AMT';
        else if (activeFilter === 'stopType') label = stopTypeFilter === 'programada' ? 'Programadas' : 'Não Programadas';
        else label = searchTerm;

        return { total: totalDuration, selected: filteredDuration, pct, type: activeFilter, label };
    }, [chartData, highlightedEquip, searchTerm, highlightAMT, stopTypeFilter]);

    const allExpanded = chartData.length > 0 && expandedIndices.length === chartData.length;
    const isSearchActive = searchTerm.length >= 3;

    return (
        <div className="w-full h-full relative flex flex-col bg-white">
            {/* Header: Title + Controls */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center shrink-0 min-h-[60px] gap-3">
                <h3 className="font-bold text-slate-700 uppercase text-[11px] md:text-sm">
                    {type === 'availability' ? 'Aderência Disponibilidade Intrínseca + Falhas' : 'Aderência Utilização + Perdas Operacionais'}
                </h3>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {/* Parou Produção Toggle */}
                    <button
                        onClick={() => setShowImpactOnly(!showImpactOnly)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${showImpactOnly ? 'bg-orange-500 border-orange-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-orange-300'}`}
                        title="Filtrar apenas ocorrências que pararam a produção"
                    >
                        <div className={`w-1.5 h-1.5 rounded-full ${showImpactOnly ? 'bg-white animate-pulse' : 'bg-slate-300'}`}></div>
                        Parou Produção {showImpactOnly ? ': SIM' : ': TODOS'}
                    </button>

                    {/* AMT Highlight Toggle */}
                    <button
                        onClick={() => setHighlightAMT(!highlightAMT)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${highlightAMT ? 'bg-purple-600 border-purple-700 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-purple-300'}`}
                        title="Destacar paradas com disciplina AMT"
                    >
                        <Wrench size={12} className={highlightAMT ? 'text-white' : 'text-purple-400'} />
                        AMT {highlightAMT ? ': ON' : ''}
                    </button>

                    {/* Stop Type Filter (Programada / Não Programada) */}
                    <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 overflow-hidden">
                        <button
                            onClick={() => setStopTypeFilter('all')}
                            className={`px-2 py-1.5 text-[9px] font-bold transition-all ${stopTypeFilter === 'all' ? 'bg-slate-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                            title="Todas as paradas"
                        >
                            TODAS
                        </button>
                        <button
                            onClick={() => setStopTypeFilter('programada')}
                            className={`px-2 py-1.5 text-[9px] font-bold transition-all flex items-center gap-1 ${stopTypeFilter === 'programada' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                            title="Apenas Paradas Programadas (Preventiva)"
                        >
                            <Calendar size={10} />PROG
                        </button>
                        <button
                            onClick={() => setStopTypeFilter('nao_programada')}
                            className={`px-2 py-1.5 text-[9px] font-bold transition-all flex items-center gap-1 ${stopTypeFilter === 'nao_programada' ? 'bg-red-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                            title="Apenas Paradas Não Programadas (Corretiva/Quebra)"
                        >
                            <AlertCircle size={10} />N. PROG
                        </button>
                    </div>

                    <div className="h-4 w-px bg-slate-200 hidden md:block mx-1"></div>
                    {/* Stats Badge */}
                    {stats && (
                        <div className="bg-slate-800 text-white text-[10px] px-3 py-1.5 rounded shadow-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <span className="font-bold text-yellow-400 max-w-[100px] truncate">{stats.label}</span>
                            <span className="w-px h-3 bg-slate-600"></span>
                            <span>{Math.round(stats.selected)} min</span>
                            <span className="bg-slate-700 px-1 rounded text-slate-300">{stats.pct}%</span>
                            {stats.type === 'equip' && (
                                <button
                                    onClick={() => setHighlightedEquip(null)}
                                    className="ml-1 hover:text-red-400 font-bold"
                                    title="Limpar seleção"
                                >✕</button>
                            )}
                        </div>
                    )}

                    {/* Search Input */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Pesquisar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-400 w-48 transition-all focus:w-64"
                        />
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-400"
                            >✕</button>
                        )}
                    </div>

                    {/* Expand All Button */}
                    <button
                        onClick={handleToggleAll}
                        className="bg-white shadow-sm border border-slate-200 rounded p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors"
                        title={allExpanded ? "Recolher Todos" : "Expandir Todos"}
                    >
                        {allExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
                <div className="flex flex-nowrap gap-1 h-auto pl-2 py-2 pr-16 items-start">
                    {chartData.map((d, i) => {
                        const val = type === 'availability' ? (d.avail || 0) : (d.perf || 0);
                        const isTargetMet = val >= target;
                        const barHeightPct = Math.min((val / 110) * 100, 100);
                        const isExpanded = expandedIndices.includes(i);

                        // Visualization Logic: 
                        // If Search Active: Show ALL matches. No hidden count.
                        // Else: > 60 min OR Expanded.

                        let visibleCauses = [];
                        let hiddenCount = 0;

                        if (isSearchActive) {
                            visibleCauses = d.causes.filter(c => {
                                const content = `${c.equip} ${c.cause}`.toLowerCase();
                                return content.includes(searchTerm.toLowerCase());
                            });
                            // No hidden count when searching
                        } else {
                            visibleCauses = isExpanded
                                ? d.causes
                                : d.causes.filter(c => c.duration > 60);
                            hiddenCount = d.causes.length - visibleCauses.length;
                        }

                        // Skip rendering day completely if searching and no matches? 
                        // User said "show all cards of the filter". Usually keeping the day structure is better context.
                        // Let's keep empty days visible but with no causes.

                        return (
                            <div key={i} className="flex flex-col items-center flex-1 min-w-0 group relative">
                                {/* Bar Section - Clickable (Height Reduced to 160px ~ 65%) */}
                                <div
                                    onClick={() => handleToggleExpand(i)}
                                    className="h-[160px] w-full flex flex-col justify-end items-center relative border-b border-slate-300 pb-1 cursor-pointer"
                                >
                                    <div className="text-[9px] font-bold text-slate-600 mb-1">{val.toFixed(0)}%</div>

                                    {/* Target Line Segment */}
                                    <div
                                        className="absolute w-[120%] border-t border-dashed border-slate-400 z-0 pointer-events-none opacity-50"
                                        style={{ bottom: `${Math.min((target / 110) * 100, 100)}%`, left: '-10%' }}
                                        title={`Meta: ${target}%`}
                                    ></div>

                                    {/* Target Label - Show only on last column */}
                                    {i === chartData.length - 1 && (
                                        <div
                                            className="absolute right-0 translate-x-full text-[9px] font-bold text-slate-500 bg-white/80 px-1 rounded z-20 pointer-events-none whitespace-nowrap"
                                            style={{ bottom: `${Math.min((target / 110) * 100, 100)}%`, transform: 'translate(5px, 50%)' }}
                                        >
                                            Meta: {target}%
                                        </div>
                                    )}

                                    <div
                                        className={`w-full max-w-[40px] rounded-t-sm transition-all duration-300 hover:opacity-80 relative z-10 ${isTargetMet ? 'bg-green-500' : 'bg-red-500'} ${isExpanded ? 'ring-2 ring-orange-400 opacity-90' : ''}`}
                                        style={{ height: `${barHeightPct}%` }}
                                    >
                                        {/* Expand Indicator */}
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
                                            {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                        </div>
                                    </div>
                                </div>

                                {/* Label Section */}
                                <div className="mt-1 text-center border-b border-slate-100 w-full pb-1 mb-1">
                                    <span className={`text-[10px] font-bold block truncate ${isExpanded ? 'text-orange-600' : 'text-slate-700'}`}>{d.label || d.day || d.date}</span>
                                </div>

                                {/* Failures List Section */}
                                <div className="flex flex-col gap-1 w-full text-[8px] text-slate-500 leading-tight px-0.5">
                                    {visibleCauses.length > 0 ? (
                                        visibleCauses.map((c, idx) => {
                                            const isDimmed = highlightedEquip && c.equip !== highlightedEquip;
                                            const isSelected = highlightedEquip === c.equip;
                                            // When searching, no dimming (?) or keep it? 
                                            // If searching, highlighting specific equip might be confusing. 
                                            // Let's disable dimming if search is active, or allow it within search results.

                                            // User requirement: "mostrar todos os cards do filtro".

                                            // Build tooltip text with descriptions
                                            const descTooltip = c.descriptions && c.descriptions.length > 0
                                                ? `\n\n📋 Atividades:\n${c.descriptions.slice(0, 3).join('\n')}${c.descriptions.length > 3 ? '\n...' : ''}`
                                                : '';
                                            const tooltipText = `${c.equip} - ${c.cause}\n⏱️ ${Math.round(c.duration)}min | ${c.count}x${descTooltip}`;

                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={(e) => handleCauseClick(e, c.equip)}
                                                    className={`p-1 rounded border transition-all cursor-pointer 
                                                        ${c.needsAnalysis ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-slate-50 border-slate-100'}
                                                        ${!isSearchActive && isDimmed ? 'opacity-20 grayscale scale-95' : 'opacity-100'}
                                                        ${isSelected ? 'ring-2 ring-blue-500 shadow-md scale-105 z-10' : ''}
                                                        ${highlightAMT && c.isAMT ? 'ring-2 ring-purple-500 border-purple-400 shadow-md bg-purple-50' : ''}
                                                    `}
                                                    title={tooltipText}
                                                >
                                                    <p className="font-bold text-slate-700 truncate mb-0.5">{c.equip}</p>
                                                    <p className="text-slate-500 truncate mb-0.5">{c.cause}</p>

                                                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end border-t border-slate-200/50 pt-0.5">
                                                        <div>
                                                            <span className={`text-[9px] font-bold block ${c.duration > 180 ? 'text-red-600' : 'text-slate-600'}`}>{Math.round(c.duration)}m</span>
                                                        </div>
                                                        {c.needsAnalysis && (
                                                            <div className="flex items-center justify-center w-full xl:w-auto xl:ml-auto mt-0.5 xl:mt-0 text-[7px] font-bold text-red-600 bg-red-100 px-1 rounded">
                                                                !
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center text-slate-300 italic py-2">-</div>
                                    )}

                                    {hiddenCount > 0 && (
                                        <button
                                            onClick={() => handleToggleExpand(i)}
                                            className="text-[8px] text-blue-500 hover:text-blue-700 text-center font-bold mt-0.5 bg-blue-50 py-0.5 rounded"
                                        >
                                            +{hiddenCount}
                                        </button>
                                    )}
                                </div>

                                {/* Connector Line (Decorative) */}
                                <div className="h-full w-px bg-slate-50 absolute left-0 top-[166px] bottom-0"></div>
                                {i === chartData.length - 1 && <div className="h-full w-px bg-slate-50 absolute right-0 top-[166px] bottom-0"></div>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AvailabilityCausesChart;
