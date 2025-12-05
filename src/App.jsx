import React, { useState, useEffect, useMemo } from 'react';
import { 
    Activity, Droplet, AlertTriangle, Calendar, Filter, CheckCircle, 
    BarChart2, FileSearch, Database, ArrowRight, Settings, Clock, RefreshCw, 
    X, ChevronDown, Info, TrendingDown, Timer, Wrench, Layers, 
    Crosshair, PlayCircle, StopCircle, Percent, Maximize, CalendarX 
} from 'lucide-react';

import { COLORS, TARGETS } from './config';
import { formatDateISO } from './utils';

// Importação dos Componentes UI
import { 
    Card, ComparisonCard, CheckCardDual, CheckCardSingle, MiniDreRow, AuditStat, 
    BigNumberCard, PillarCard 
} from './components/UI';

// Importação dos Gráficos
import CustomJackKnifeChart from './charts/JackKnifeChart';
import ParetoChart from './charts/ParetoChart';
import OEEGaugeCard from './charts/OEEGauge';
import TargetChart from './charts/TargetChart';
import BridgeChart from './charts/BridgeChart';
import LossEvolutionChart from './charts/LossEvolutionChart';

// Importação do Motor de Processamento (ETL)
import { 
    processFiles, 
    calculateOEEData, 
    calculateDashboardAggregates, 
    calculateTreeStats, 
    calculateJackKnifeData, 
    calculateParetoData 
} from './services/etl';

export default function App() {
  const [step, setStep] = useState('upload'); 
  const [activeTab, setActiveTab] = useState('overview');
  const [aggregation, setAggregation] = useState('month'); 
  const [filterSelection, setFilterSelection] = useState(null); 
  const [lossFilter, setLossFilter] = useState(null); 
  const [equipmentFilter, setEquipmentFilter] = useState(null); 
  
  const [selectedEquipJackKnife, setSelectedEquipJackKnife] = useState(null);
  
  const [files, setFiles] = useState({ stop: null, prod: null });
  const [loading, setLoading] = useState(false);
  const [errorLog, setErrorLog] = useState("");
  
  const [rawData, setRawData] = useState({ stops: [], prod: {} });
  const [auditStats, setAuditStats] = useState(null);
  const [ignoredLog, setIgnoredLog] = useState([]);
  const [showLog, setShowLog] = useState(false);

  const [calculatedData, setCalculatedData] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    setFilterSelection(null);
  }, [aggregation, dateRange]);

  const handleBarToggle = (key) => {
      if (filterSelection === key) {
          setFilterSelection(null); 
      } else {
          setFilterSelection(key); 
      }
  };

  const handleChartDrillDown = (key, type) => {
      if (filterSelection === key && lossFilter === type) {
          setFilterSelection(null);
          setLossFilter(null);
      } else {
          setFilterSelection(key);
          setLossFilter(type);
      }
  };

  const toggleLossFilter = (type) => {
      if (lossFilter === type) setLossFilter(null);
      else setLossFilter(type);
  };

  const handleEquipmentToggle = (equipName) => {
      if (equipmentFilter === equipName) setEquipmentFilter(null);
      else setEquipmentFilter(equipName);
  };

  useEffect(() => {
    if (!window.XLSX) {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
        script.async = true;
        document.body.appendChild(script);
        return () => { document.body.removeChild(script); }
    }
  }, []);

  const handleProcess = async () => {
    if(!files.stop || !files.prod) return alert("Selecione os arquivos.");
    setLoading(true); setErrorLog(""); setIgnoredLog([]);
    try {
        const result = await processFiles(files.stop, files.prod);
        setRawData({ stops: result.stops, prod: result.prod });
        setAuditStats(result.auditStats);
        setIgnoredLog(result.ignored);
        setStep('audit');
    } catch(e) { 
        console.error(e);
        setErrorLog(e.message); 
    } finally { 
        setLoading(false); 
    }
  };

  const handleConfirmAudit = () => {
    const dates = Object.keys(rawData.prod).sort();
    if (dates.length > 0) {
        const start = dates[0];
        const today = new Date();
        today.setDate(today.getDate() - 1);
        const yesterdayIso = formatDateISO(today);
        const maxDataDate = dates[dates.length - 1];
        const end = (yesterdayIso && yesterdayIso < maxDataDate) ? yesterdayIso : maxDataDate;
        setDateRange({ start, end });
    }
    setStep('dashboard');
  };

  useEffect(() => {
    if (step !== 'dashboard') return;
    const results = calculateOEEData(rawData, dateRange, aggregation, equipmentFilter);
    setCalculatedData(results);
  }, [dateRange, step, aggregation, equipmentFilter, rawData]);

  const activeAggregates = useMemo(() => {
      return calculateDashboardAggregates(calculatedData, rawData, dateRange, filterSelection);
  }, [calculatedData, filterSelection, rawData, dateRange]);

  const treeStats = useMemo(() => {
      return calculateTreeStats(calculatedData, filterSelection);
  }, [calculatedData, filterSelection]);

  const jackKnifeData = useMemo(() => {
      return calculateJackKnifeData(rawData, dateRange);
  }, [rawData, dateRange]);

  const { topEquipmentsData, topCausesData } = useMemo(() => {
      return calculateParetoData(rawData, dateRange, filterSelection, aggregation, lossFilter, equipmentFilter);
  }, [rawData, dateRange, filterSelection, aggregation, lossFilter, equipmentFilter]);

  // Helper para cor local no App.jsx (usado no card manual)
  const getLocalStatusColor = (val) => {
      if(val < 50) return COLORS.red;
      if(val < 90) return COLORS.yellow;
      return COLORS.green;
  };

  return (
    <div className="h-screen flex flex-col font-sans text-slate-700 bg-slate-50 overflow-hidden">
      
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex flex-col gap-3 shadow-sm shrink-0 z-20">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500 text-white shadow-md shadow-orange-200">
                    <Activity size={20}/>
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-800 leading-none">Portal OEE <span className="text-orange-500 font-light">Analytics</span></h1>
                    <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">Heat Recovery System • Máquinas</p>
                    <p className="text-[10px] text-orange-500 font-bold mt-0.5 uppercase tracking-wide">ENGENHARIA DE CONFIABILIDADE</p>
                </div>
            </div>
        </div>

        {step === 'dashboard' && (
            <div className="flex items-center justify-between gap-4">
                <div className="flex bg-slate-100 rounded-lg p-1 gap-1 overflow-x-auto shrink-0">
                    {['overview', 'tree', 'losses', 'reliability', 'breakdown', 'verification'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)} 
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${activeTab===tab ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {tab === 'overview' ? 'Visão Geral' : 
                             tab === 'tree' ? 'Árvore OEE' :
                             tab === 'losses' ? 'Análise de Perdas' :
                             tab === 'reliability' ? 'Confiabilidade' :
                             tab === 'breakdown' ? 'Desdobramento OEE' : 'Verificação'}
                        </button>
                    ))}
                </div>

                <div className="flex-1 flex justify-center min-w-0">
                    {(filterSelection || equipmentFilter || lossFilter) && (
                        <div className="flex items-center gap-3 bg-orange-50 border border-orange-100 text-orange-800 px-3 py-1.5 rounded-full text-[10px] font-bold shadow-sm animate-fade-in truncate max-w-full">
                            <span className="shrink-0 flex items-center gap-1"><Filter size={12}/> Filtros:</span>
                            {filterSelection && (
                                <button onClick={() => setFilterSelection(null)} className="flex items-center gap-1 hover:text-red-500 transition-colors bg-white px-2 py-0.5 rounded-full border border-orange-100">
                                    {calculatedData.find(d => d.key === filterSelection)?.label} <X size={10}/>
                                </button>
                            )}
                            {equipmentFilter && (
                                <button onClick={() => setEquipmentFilter(null)} className="flex items-center gap-1 hover:text-red-500 transition-colors bg-white px-2 py-0.5 rounded-full border border-orange-100">
                                    <Wrench size={10}/> {equipmentFilter} <X size={10}/>
                                </button>
                            )}
                            {lossFilter && (
                                <button onClick={() => setLossFilter(null)} className="flex items-center gap-1 hover:text-red-500 transition-colors bg-white px-2 py-0.5 rounded-full border border-orange-100">
                                    <Layers size={10}/> {lossFilter === 'availability' ? 'Disp.' : 'Perf.'} <X size={10}/>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                     <div className="relative group">
                        <select value={aggregation} onChange={(e) => setAggregation(e.target.value)} className="appearance-none bg-white border border-slate-200 text-slate-700 py-1.5 pl-3 pr-8 rounded-lg text-xs font-bold focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm hover:border-slate-300 transition-colors">
                            <option value="day">Diário</option>
                            <option value="week">Semanal</option>
                            <option value="fortnight">Quinzenal</option>
                            <option value="month">Mensal</option>
                            <option value="quarter">Trimestral</option>
                            <option value="year">Anual</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-2 text-slate-400 pointer-events-none group-hover:text-slate-600"/>
                    </div>
                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
                        <input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({...p, start: e.target.value}))} className="bg-transparent text-xs font-medium focus:outline-none text-slate-700"/>
                        <span className="text-slate-300 text-xs">→</span>
                        <input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({...p, end: e.target.value}))} className="bg-transparent text-xs font-medium focus:outline-none text-slate-700"/>
                    </div>
                </div>
            </div>
        )}
      </header>

      <main className="flex-1 p-6 w-full h-full max-w-[1920px] mx-auto overflow-hidden">
        {step === 'upload' && (
            <div className="h-full flex items-center justify-center animate-fade-in">
                <Card className="p-10 max-w-2xl w-full">
                    <h2 className="text-lg font-bold mb-8 flex items-center gap-2 text-slate-700">
                        <Database className="text-orange-600"/> Ingestão de Dados
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 hover:border-orange-400 transition-all group cursor-pointer">
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" accept=".xlsx,.csv" onChange={e => setFiles({...files, stop: e.target.files[0]})}/>
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                <AlertTriangle style={{color: COLORS.red}} />
                            </div>
                            <p className="font-bold text-sm text-slate-700">Apontamentos</p>
                            <p className="text-xs text-slate-400 mt-1">{files.stop ? files.stop.name : "Arraste ou clique"}</p>
                            {files.stop && <div className="mt-2 text-xs font-bold text-green-600 flex justify-center items-center gap-1"><CheckCircle size={12}/> Carregado</div>}
                        </div>
                        <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 hover:border-green-400 transition-all group cursor-pointer">
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" accept=".xlsx,.xlsm" onChange={e => setFiles({...files, prod: e.target.files[0]})}/>
                            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                <Activity style={{color: COLORS.green}} />
                            </div>
                            <p className="font-bold text-sm text-slate-700">Produção</p>
                            <p className="text-xs text-slate-400 mt-1">{files.prod ? files.prod.name : "Arraste ou clique"}</p>
                            {files.prod && <div className="mt-2 text-xs font-bold text-green-600 flex justify-center items-center gap-1"><CheckCircle size={12}/> Carregado</div>}
                        </div>
                    </div>
                    {errorLog && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-3"><AlertTriangle size={18} className="mt-0.5 shrink-0"/><div><p className="font-bold">Erro na importação:</p><p>{errorLog}</p></div></div>}
                    <button onClick={handleProcess} disabled={loading || !files.stop || !files.prod} className="w-full text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all disabled:opacity-50 flex justify-center items-center gap-2 bg-slate-800 disabled:cursor-not-allowed">
                        {loading ? <RefreshCw className="animate-spin"/> : <ArrowRight/>}
                        {loading ? "Processando..." : "Iniciar Auditoria"}
                    </button>
                </Card>
            </div>
        )}

        {step === 'audit' && auditStats && (
            <div className="h-full flex items-center justify-center animate-fade-in">
                <div className="max-w-5xl w-full">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Validação de Dados</h2>
                            <p className="text-sm text-slate-500">Confira os totais identificados antes de calcular o OEE.</p>
                        </div>
                        <div className="flex gap-4">
                            {ignoredLog.length > 0 && (
                                <button onClick={() => setShowLog(!showLog)} className="text-sm text-red-600 font-bold hover:underline flex items-center gap-1">
                                    <Info size={16}/> {ignoredLog.length} Linhas Ignoradas
                                </button>
                            )}
                            <button onClick={handleConfirmAudit} className="text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 bg-green-600 hover:bg-green-700">
                                <CheckCircle size={18}/> Confirmar e Calcular
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Card className="p-6 border-t-4" style={{borderTopColor: COLORS.red}}>
                            <h3 className="font-bold mb-6 flex items-center gap-2 text-slate-700"><FileSearch style={{color: COLORS.red}}/> Auditoria de Paradas</h3>
                            <div className="space-y-4">
                                <AuditStat label="Eventos Válidos" value={auditStats.stops.count} sub="Filtro: Máquinas + Parou" color={COLORS.darkGray} icon={AlertTriangle} />
                                <AuditStat label="Tempo Total" value={auditStats.stops.totalHours + " h"} sub="Soma bruta" color={COLORS.red} icon={Clock} />
                                <AuditStat label="Manutenção" value={auditStats.stops.maintHours + " h"} sub="Área Técnica" color={COLORS.orange} icon={Settings} />
                            </div>
                        </Card>
                        <Card className="p-6 border-t-4" style={{borderTopColor: COLORS.green}}>
                            <h3 className="font-bold mb-6 flex items-center gap-2 text-slate-700"><Activity style={{color: COLORS.green}}/> Auditoria de Produção</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <AuditStat label="Produção Total" value={parseInt(auditStats.prod.prodTons).toLocaleString()} sub="Toneladas" color={COLORS.green} icon={Database} />
                                <AuditStat label="Total Fornos" value={auditStats.prod.ovens} sub="Unidades" color={COLORS.darkGray} icon={BarChart2} />
                                <AuditStat label="Dias Cobertos" value={auditStats.prod.days} sub="Range do Arquivo" color={COLORS.blue} icon={Calendar} />
                                <AuditStat label="Água Industrial" value={parseInt(auditStats.prod.water).toLocaleString()} sub="m³ Total" color={COLORS.blueGray} icon={Droplet} />
                            </div>
                        </Card>
                    </div>
                    {showLog && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg max-h-60 overflow-y-auto text-xs font-mono text-red-800">
                            <p className="font-bold mb-2 sticky top-0 bg-red-50">Log de Rejeição (Amostra):</p>
                            {ignoredLog.map((l, idx) => (<div key={idx} className="mb-1">Linha {l.row}: {l.reason}</div>))}
                        </div>
                    )}
                    <div className="mt-8 text-center"><button onClick={() => setStep('upload')} className="text-sm hover:underline text-slate-400">Cancelar e carregar outros arquivos</button></div>
                </div>
            </div>
        )}

        {step === 'dashboard' && activeAggregates && (
            <div className="h-full flex flex-col gap-4 animate-fade-in">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-12 grid-rows-6 gap-4 h-full pb-2">
                        <div className="col-span-2 row-span-2">
                            <OEEGaugeCard value={parseFloat(activeAggregates.oee)} target={65} />
                        </div>
                        <div className="col-span-2 row-span-2 flex flex-col gap-2">
                             <PillarCard title="Disponibilidade" value={activeAggregates.avail} target={90} icon={AlertTriangle}/>
                             <PillarCard title="Performance" value={activeAggregates.perf} target={95} icon={Clock}/>
                             <PillarCard title="Qualidade" value={activeAggregates.qual} target={72.15} icon={CheckCircle}/>
                        </div>
                        <Card className="col-span-5 row-span-2 p-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-bold uppercase flex items-center gap-2 text-slate-600">
                                    <TrendingDown size={16}/> Bridge de Perdas (Fornos)
                                </h3>
                                <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-medium">Meta → Realizado</span>
                            </div>
                            <div className="flex-1 min-h-0">
                                <BridgeChart aggregates={activeAggregates} />
                            </div>
                        </Card>
                        <div className="col-span-3 row-span-2 flex flex-col gap-2">
                            <div className="flex-1">
                                <BigNumberCard title="Total Fornos" valueNumeric={activeAggregates.ovensNumeric} displayValue={activeAggregates.ovensDisplay} unit="un" target={activeAggregates.targetOvens} compact={true}/>
                            </div>
                            <div className="flex-1 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border-l-4 p-3 flex flex-col justify-between border border-slate-100" 
                                 style={{ borderLeftColor: COLORS.orange }}>
                                <p className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1 text-slate-400"><Timer size={12}/> Ritmo Médio</p>
                                <div className="flex items-baseline gap-1">
                                    <h3 className="text-2xl font-bold" style={{ color: COLORS.orange }}>
                                        {activeAggregates.ritmoDisplay}
                                    </h3>
                                    <span className="text-[10px] font-medium text-gray-400">min/forno</span>
                                </div>
                                <div className="text-[9px] text-gray-400 border-t border-slate-50 pt-1 mt-1 flex justify-between">
                                    <span>Base: <strong>Loading / Realizado</strong></span>
                                </div>
                            </div>
                        </div>
                        <div className="col-span-12 row-span-2">
                            <TargetChart data={calculatedData} dataKey="oee" target={65} title="Evolução OEE (%)" colorLine={COLORS.blue} onBarClick={handleBarToggle} selectedKey={filterSelection}/>
                        </div>
                        <div className="col-span-4 row-span-2">
                            <TargetChart data={calculatedData} dataKey="avail" target={90} title="Disp. (%)" colorLine={COLORS.red} onBarClick={handleBarToggle} selectedKey={filterSelection}/>
                        </div>
                        <div className="col-span-4 row-span-2">
                            <TargetChart data={calculatedData} dataKey="perf" target={95} title="Perf. (%)" colorLine={COLORS.yellow} onBarClick={handleBarToggle} selectedKey={filterSelection}/>
                        </div>
                        <div className="col-span-4 row-span-2">
                            <TargetChart data={calculatedData} dataKey="qual" target={72.15} title="Qual. (%)" colorLine={COLORS.green} yMax={110} onBarClick={handleBarToggle} selectedKey={filterSelection}/>
                        </div>
                    </div>
                )}

                {activeTab === 'verification' && (
                    <div className="h-full overflow-hidden flex flex-col pb-4">
                        <div className="grid grid-cols-6 gap-2 h-full content-start">
                            {/* LINHA 1: DISPONIBILIDADE */}
                            <div className="col-span-6 mb-1 flex items-center gap-2 mt-2">
                                <div className="h-px bg-slate-300 flex-1"></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Disponibilidade</span>
                                <div className="h-px bg-slate-300 flex-1"></div>
                            </div>
                            
                            <div className="col-span-2 h-24"><ComparisonCard title="Manutenção Prog." target={activeAggregates.targetMaintMins / 60} real={(activeAggregates.usedMaintMins) / 60} inverse={true}/></div>
                            <div className="col-span-2 h-24"><ComparisonCard title="Corretivas / Falhas" target={activeAggregates.loadingMins * (1 - TARGETS.AVAIL/100) / 60} real={activeAggregates.failLossMins / 60} inverse={true}/></div>
                            <div className="col-span-2 h-24"><ComparisonCard title="Excedente Manut." target={0} real={(activeAggregates.extMaintMins + activeAggregates.outsideMaintMins) / 60} inverse={true}/></div>

                            {/* LINHA 2: PERFORMANCE & OPERAÇÃO (Movida para cima) */}
                            <div className="col-span-6 mt-3 mb-1 flex items-center gap-2">
                                <div className="h-px bg-slate-300 flex-1"></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Performance & Operação</span>
                                <div className="h-px bg-slate-300 flex-1"></div>
                            </div>

                            <div className="col-span-2 h-24"><ComparisonCard title="Fornos Produzidos" target={activeAggregates.targetOvens} real={activeAggregates.ovensNumeric} unit="un" inverse={false}/></div>
                            <div className="col-span-2 h-24"><ComparisonCard title="Troca de Turno" target={activeAggregates.targetShiftChange} real={activeAggregates.shiftLossMins / 60} inverse={true} showDeviationOnly={true}/></div>
                            <div className="col-span-2 h-24"><ComparisonCard title="Perda Operacional" target={0} real={(activeAggregates.opsLossMins + activeAggregates.extProdMins + activeAggregates.outsideProdMins) / 60} inverse={true}/></div>

                            {/* LINHA 3: CHECKLIST DE JANELA (Movida para baixo com Legenda) */}
                            <div className="col-span-6 mt-3 mb-1 flex items-center gap-2">
                                <div className="h-px bg-slate-300 flex-1"></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Checklist de Janela (Aderência)</span>
                                
                                {/* LEGENDA ADICIONADA */}
                                <div className="flex gap-3 ml-2 text-[9px] font-medium border-l pl-2 border-slate-300 text-slate-400">
                                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> &lt; 50%</div>
                                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div> 50-90%</div>
                                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> &gt; 90%</div>
                                </div>

                                <div className="h-px bg-slate-300 flex-1"></div>
                            </div>

                            <div className="col-span-1 h-32"><CheckCardDual title="Pontualidade Início" valNorte={activeAggregates.winStartOkNorte} totalNorte={activeAggregates.daysWithStopNorte} valSul={activeAggregates.winStartOkSul} totalSul={activeAggregates.daysWithStopSul} sub="Início 08:00 ±15m" icon={PlayCircle} /></div>
                            <div className="col-span-1 h-32"><CheckCardDual title="Pontualidade Fim" valNorte={activeAggregates.winEndOkNorte} totalNorte={activeAggregates.daysWithStopNorte} valSul={activeAggregates.winEndOkSul} totalSul={activeAggregates.daysWithStopSul} sub="Término 13:00 ±15m" icon={StopCircle} /></div>
                            <div className="col-span-1 h-32"><CheckCardDual title="Dentro Horário" valNorte={activeAggregates.winInsideOkNorte} totalNorte={activeAggregates.daysWithStopNorte} valSul={activeAggregates.winInsideOkSul} totalSul={activeAggregates.daysWithStopSul} sub="Entre 08h-17h" icon={Maximize} /></div>
                            <div className="col-span-1 h-32">
                                <Card className="p-3 flex flex-col gap-2 border-l-4 h-full justify-between" 
                                      style={{borderLeftColor: getLocalStatusColor(Math.min(activeAggregates.windowAvgDurNorte, activeAggregates.windowAvgDurSul)) }}>
                                    <div>
                                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Duração</p>
                                        <div className="flex gap-2">
                                            <div>
                                                <span className="text-lg font-bold text-slate-700 block" style={{color: getLocalStatusColor(activeAggregates.windowAvgDurNorte)}}>
                                                    {activeAggregates.windowAvgDurNorte}%
                                                </span>
                                                <span className="text-[8px] text-slate-400">Norte</span>
                                            </div>
                                            <div className="w-px bg-slate-200"></div>
                                            <div>
                                                <span className="text-lg font-bold text-slate-700 block" style={{color: getLocalStatusColor(activeAggregates.windowAvgDurSul)}}>
                                                    {activeAggregates.windowAvgDurSul}%
                                                </span>
                                                <span className="text-[8px] text-slate-400">Sul</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[8px] text-slate-400 mt-1">Meta 5h/quench</p>
                                </Card>
                            </div>
                            <div className="col-span-1 h-32"><CheckCardSingle title="Score Freq." value={activeAggregates.windowFreqScore} total={100} sub="Quenchs Parados" icon={Percent} /></div>
                            <div className="col-span-1 h-32"><CheckCardDual title="Dias Sem Parada" valNorte={activeAggregates.daysWithoutStopNorte} totalNorte={activeAggregates.windowTotalDays} valSul={activeAggregates.daysWithoutStopSul} totalSul={activeAggregates.windowTotalDays} sub="Sem registro" icon={CalendarX} /></div>
                        </div>
                    </div>
                )}

                {/* Restante das abas (tree, losses, reliability, breakdown) mantidas inalteradas... */}
                {activeTab === 'tree' && treeStats && (
                    <div className="h-full relative overflow-auto pb-4">
                        {/* 1. Resultado da Produção no canto superior esquerdo (Absoluto ou Grid) */}
                        <div className="absolute top-0 left-0 z-20">
                            <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl shadow-sm w-48">
                                <h4 className="text-[10px] font-bold text-orange-800 mb-2 uppercase tracking-wide">Resultado da Produção</h4>
                                <div className="flex flex-col gap-2">
                                    <div>
                                        <span className="block text-orange-400 text-[9px] uppercase font-bold">Fornos</span>
                                        <span className="text-xl font-bold text-slate-700">{activeAggregates.ovensDisplay}</span>
                                    </div>
                                    <div className="h-px bg-orange-200 w-full"></div>
                                    <div>
                                        <span className="block text-orange-400 text-[9px] uppercase font-bold">Ritmo Médio</span>
                                        <span className="text-xl font-bold text-slate-700">{activeAggregates.ritmoDisplay} <span className="text-[9px] font-normal text-slate-400">min/u</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Conteúdo Centralizado da Árvore */}
                        <div className="flex flex-col items-center pt-8 w-full max-w-5xl mx-auto">
                            
                            {/* CÁLCULO DAS CORES DINÂMICAS */}
                            {(() => {
                                const oeeVal = parseFloat(activeAggregates.oee);
                                const availVal = parseFloat(activeAggregates.avail);
                                const perfVal = parseFloat(activeAggregates.perf);
                                const qualVal = parseFloat(activeAggregates.qual);

                                const colorOee = oeeVal >= TARGETS.OEE ? COLORS.green : COLORS.red;
                                const colorAvail = availVal >= TARGETS.AVAIL ? COLORS.green : COLORS.red;
                                const colorPerf = perfVal >= TARGETS.PERF ? COLORS.green : COLORS.red;
                                const colorQual = qualVal >= TARGETS.QUAL ? COLORS.green : COLORS.red;

                                return (
                                    <>
                                        {/* OEE Global Card */}
                                        <div className="flex flex-col items-center mb-8 relative z-10 w-full max-w-4xl">
                                            <Card className="w-64 p-4 border-t-4 text-center shadow-lg" style={{borderTopColor: colorOee}}>
                                                <h3 className="font-bold text-slate-500 uppercase text-xs mb-1">OEE Global</h3>
                                                <span className="text-4xl font-bold block" style={{color: colorOee}}>{activeAggregates.oee}%</span>
                                                <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-400 flex justify-between">
                                                    <span>Meta: {TARGETS.OEE}%</span>
                                                    <span style={{color: colorOee}}>
                                                        {oeeVal >= TARGETS.OEE ? '▲' : '▼'}
                                                    </span>
                                                </div>
                                            </Card>
                                            <div className="h-8 w-px bg-slate-300"></div>
                                            <div className="h-px bg-slate-300 w-[70%]"></div>
                                        </div>

                                        {/* Cards de Nível 2 */}
                                        <div className="flex justify-between w-full max-w-5xl px-4 mb-8 relative z-10 gap-4">
                                            
                                            {/* Disponibilidade */}
                                            <div className="flex flex-col items-center relative">
                                                <div className="h-4 w-px bg-slate-300 absolute -top-8"></div>
                                                <Card className="w-64 p-4 border-t-4 text-center shadow-md hover:shadow-lg transition-all mb-4" style={{borderTopColor: colorAvail}}>
                                                    <h3 className="font-bold text-slate-500 uppercase text-xs mb-1 flex justify-center items-center gap-1">
                                                        <AlertTriangle size={12} style={{color: colorAvail}}/> Disponibilidade
                                                    </h3>
                                                    <span className="text-3xl font-bold block" style={{color: colorAvail}}>{activeAggregates.avail}%</span>
                                                    <span className="text-[10px] text-slate-400 mt-1 block">T. Operando / T. Carregado</span>
                                                </Card>
                                                <div className="h-6 w-px bg-slate-300 mb-2"></div>
                                                
                                                <div className="bg-white border border-slate-200 rounded-lg p-2 text-left w-64 text-xs shadow-sm space-y-1">
                                                    <div className="flex justify-between items-center text-slate-500 border-b border-slate-100 pb-1 mb-1 font-bold">
                                                        <span>Detalhamento de Perdas</span>
                                                    </div>
                                                    <MiniDreRow label="Falha Equip." value={treeStats.failLoss.val} target={treeStats.failLoss.target} />
                                                    <MiniDreRow label="Prog. Excedente" value={treeStats.schedMaintLoss.val} target={treeStats.schedMaintLoss.target} />
                                                    <div className="flex justify-between items-center border-t-2 border-slate-100 pt-2 mt-1">
                                                        <span className="font-bold text-slate-700">T. Operando</span>
                                                        <span className="font-bold text-slate-700 bg-slate-100 px-1.5 rounded">{treeStats.operating} h</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Performance */}
                                            <div className="flex flex-col items-center relative">
                                                <div className="h-4 w-px bg-slate-300 absolute -top-8"></div>
                                                <Card className="w-64 p-4 border-t-4 text-center shadow-md hover:shadow-lg transition-all mb-4" style={{borderTopColor: colorPerf}}>
                                                    <h3 className="font-bold text-slate-500 uppercase text-xs mb-1 flex justify-center items-center gap-1">
                                                        <Clock size={12} style={{color: colorPerf}}/> Performance
                                                    </h3>
                                                    <span className="text-3xl font-bold block" style={{color: colorPerf}}>{activeAggregates.perf}%</span>
                                                    <span className="text-[10px] text-slate-400 mt-1 block">T. Líquido / T. Operando</span>
                                                </Card>
                                                <div className="h-6 w-px bg-slate-300 mb-2"></div>
                                                
                                                <div className="bg-white border border-slate-200 rounded-lg p-2 text-left w-64 text-xs shadow-sm space-y-1">
                                                    <div className="flex justify-between items-center text-slate-500 border-b border-slate-100 pb-1 mb-1 font-bold">
                                                        <span>Detalhamento de Perdas</span>
                                                    </div>
                                                    <MiniDreRow label="Ritmo Forno a Forno" value={treeStats.rhythmLoss.val} target={treeStats.rhythmLoss.target} />
                                                    <MiniDreRow label="Perda Operacional" value={treeStats.opsLoss.val} target={treeStats.opsLoss.target} />
                                                    <MiniDreRow label="Troca de Turno" value={treeStats.shiftLoss.val} target={treeStats.shiftLoss.target} />
                                                    <div className="flex justify-between items-center border-t-2 border-slate-100 pt-2 mt-1">
                                                        <span className="font-bold text-slate-700">T. Líquido</span>
                                                        <span className="font-bold text-slate-700 bg-slate-100 px-1.5 rounded">{treeStats.netOperating} h</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Qualidade */}
                                            <div className="flex flex-col items-center relative">
                                                <div className="h-4 w-px bg-slate-300 absolute -top-8"></div>
                                                <Card className="w-64 p-4 border-t-4 text-center shadow-md hover:shadow-lg transition-all mb-4" style={{borderTopColor: colorQual}}>
                                                    <h3 className="font-bold text-slate-500 uppercase text-xs mb-1 flex justify-center items-center gap-1">
                                                        <CheckCircle size={12} style={{color: colorQual}}/> Qualidade (Yield)
                                                    </h3>
                                                    <span className="text-3xl font-bold block" style={{color: colorQual}}>{activeAggregates.qual}%</span>
                                                    <span className="text-[10px] text-slate-400 mt-1 block">Produtivo / T. Líquido</span>
                                                </Card>
                                                <div className="h-6 w-px bg-slate-300 mb-2"></div>
                                                
                                                <div className="bg-white border border-slate-200 rounded-lg p-2 text-left w-64 text-xs shadow-sm space-y-1">
                                                    <div className="flex justify-between items-center text-slate-500 border-b border-slate-100 pb-1 mb-1 font-bold">
                                                        <span>Detalhamento de Perdas</span>
                                                    </div>
                                                    <MiniDreRow label="Perda Volume" value={treeStats.lossQual.val} target={treeStats.lossQual.target} />
                                                    <div className="flex justify-between items-center border-t-2 border-slate-100 pt-2 mt-1">
                                                        <span className="font-bold text-slate-700">Produtivo</span>
                                                        <span className="font-bold text-slate-700 bg-slate-100 px-1.5 rounded">{treeStats.fullyProductive} h</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {activeTab === 'losses' && (
                    <div className="grid grid-cols-3 grid-rows-2 gap-6 h-full pb-4">
                        <Card className="col-span-2 row-span-1 p-4">
                             <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-slate-700 text-sm">Composição de Perdas (%)</h3>
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded">Proporção Disp. vs Perf.</span>
                             </div>
                             <div className="flex-1 min-h-0 h-full">
                                <LossEvolutionChart 
                                    data={calculatedData} 
                                    onDrillDown={handleChartDrillDown}
                                    selectedKey={filterSelection}
                                    selectedType={lossFilter}
                                />
                             </div>
                        </Card>
                        <div className="col-span-1 row-span-2 flex flex-col gap-4">
                            <Card className={`flex-1 p-4 flex flex-col transition-all duration-300 ${equipmentFilter ? 'ring-2 ring-orange-100' : ''}`}>
                                <h3 className="font-bold text-slate-700 text-xs mb-2 flex items-center gap-2">
                                    <Wrench size={14} className="text-orange-600"/> 
                                    {lossFilter === 'availability' ? 'Equipamentos (Disponibilidade)' : 
                                     lossFilter === 'performance' ? 'Equipamentos (Performance)' : 
                                     'Equipamentos (Geral)'}
                                </h3>
                                <div className="flex-1 min-h-0">
                                    <ParetoChart 
                                        data={topEquipmentsData} 
                                        color={lossFilter === 'availability' ? COLORS.blue : lossFilter === 'performance' ? COLORS.yellow : COLORS.darkGray}
                                        emptyMessage="Tag de Equipamento não encontrada"
                                        onBarClick={handleEquipmentToggle}
                                        selectedName={equipmentFilter}
                                    />
                                </div>
                                <div className="text-[9px] text-center text-gray-400 mt-1 italic">Clique na barra para filtrar por equipamento</div>
                            </Card>
                            <Card className="flex-1 p-4 flex flex-col transition-all duration-300">
                                <h3 className="font-bold text-slate-700 text-xs mb-2 flex items-center gap-2">
                                    <Layers size={14} className="text-orange-600"/> 
                                    {lossFilter === 'availability' ? 'Componente - Modo Falha (Disp.)' : 
                                     lossFilter === 'performance' ? 'Componente - Modo Falha (Perf.)' : 
                                     'Componente - Modo Falha (Geral)'}
                                </h3>
                                <div className="flex-1 min-h-0">
                                    <ParetoChart 
                                        data={topCausesData} 
                                        color={lossFilter === 'availability' ? COLORS.blue : lossFilter === 'performance' ? COLORS.yellow : COLORS.darkGray}
                                        emptyMessage={equipmentFilter ? "Nenhuma falha para este equipamento" : "Selecione um equipamento ou período"}
                                    />
                                </div>
                            </Card>
                        </div>
                        <Card 
                            onClick={() => toggleLossFilter('availability')}
                            className={`col-span-1 row-span-1 p-5 border-t-4 flex flex-col relative overflow-hidden transition-all duration-300 ${lossFilter === 'availability' ? 'ring-2 ring-blue-500 shadow-md scale-[1.02]' : lossFilter ? 'opacity-50 grayscale-[0.5]' : 'hover:shadow-md hover:scale-[1.01]'}`} 
                            style={{borderTopColor: COLORS.blue}}
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10"><AlertTriangle size={60} color={COLORS.blue}/></div>
                            <h3 className="font-bold text-gray-500 uppercase text-xs mb-4 flex items-center gap-2">{lossFilter === 'availability' && <CheckCircle size={14} className="text-blue-600"/>} Perdas de Disponibilidade</h3>
                            <div className="flex-1 flex flex-col justify-center gap-4">
                                <div><span className="text-3xl font-bold block" style={{color: COLORS.blue}}>{activeAggregates.lossDispH} h</span><span className="text-xs text-gray-400">Total Indisponível {equipmentFilter ? `(${equipmentFilter})` : ''}</span></div>
                                <div className="h-px bg-slate-100 w-full"></div>
                                <div className="grid grid-cols-2 gap-2 text-xs"><div><span className="block font-bold text-slate-700">{activeAggregates.lossFailH} h</span><span className="text-gray-400">Falhas Téc.</span></div><div><span className="block font-bold text-slate-700">{(parseFloat(activeAggregates.lossDispH) - parseFloat(activeAggregates.lossFailH)).toFixed(1)} h</span><span className="text-gray-400">Outros/Ext.</span></div></div>
                            </div>
                            <div className="absolute bottom-2 right-2 text-[10px] text-gray-300 italic">Clique para filtrar tipo</div>
                        </Card>
                        <Card 
                            onClick={() => toggleLossFilter('performance')}
                            className={`col-span-1 row-span-1 p-5 border-t-4 flex flex-col relative overflow-hidden transition-all duration-300 ${lossFilter === 'performance' ? 'ring-2 ring-yellow-400 shadow-md scale-[1.02]' : lossFilter ? 'opacity-50 grayscale-[0.5]' : 'hover:shadow-md hover:scale-[1.01]'}`} 
                            style={{borderTopColor: COLORS.yellow}}
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Clock size={60} color={COLORS.yellow}/></div>
                            <h3 className="font-bold text-gray-500 uppercase text-xs mb-4 flex items-center gap-2">{lossFilter === 'performance' && <CheckCircle size={14} className="text-yellow-600"/>} Perdas de Performance</h3>
                            <div className="flex-1 flex flex-col justify-center gap-4">
                                <div><span className="text-3xl font-bold block" style={{color: COLORS.yellow}}>{activeAggregates.lossUtilH} h</span><span className="text-xs text-gray-400">Total Perda Ritmo/Ops {equipmentFilter ? `(${equipmentFilter})` : ''}</span></div>
                                <div className="h-px bg-slate-100 w-full"></div>
                                <div className="text-xs text-gray-400 leading-relaxed">Calculado base: Capacidade Teórica - Realizado. Inclui microparadas, redução de velocidade e trocas de turno.</div>
                            </div>
                            <div className="absolute bottom-2 right-2 text-[10px] text-gray-300 italic">Clique para filtrar tipo</div>
                        </Card>
                    </div>
                )}

                {activeTab === 'reliability' && (
                    <div className="h-full grid grid-cols-2 grid-rows-6 gap-4 pb-4">
                        <div className="col-span-1 row-span-5">
                            <CustomJackKnifeChart 
                                title="Análise Jack Knife: Equipamentos"
                                data={jackKnifeData.equip}
                                onPointClick={(e) => {
                                    const clickedName = e.name || (e.payload && e.payload.name);
                                    if (clickedName) {
                                        setSelectedEquipJackKnife(prev => prev === clickedName ? null : clickedName);
                                    }
                                }}
                                selectedId={selectedEquipJackKnife}
                                type="equip"
                            />
                        </div>
                        <div className="col-span-1 row-span-5">
                            {selectedEquipJackKnife ? (
                                <CustomJackKnifeChart 
                                    title={`Drill Down: ${selectedEquipJackKnife} (Componentes)`}
                                    data={jackKnifeData.comp.filter(c => c.parentEquip === selectedEquipJackKnife)}
                                    type="comp"
                                />
                            ) : (
                                <Card className="h-full flex items-center justify-center bg-slate-50 border-dashed">
                                    <div className="text-center text-slate-400">
                                        <Crosshair size={48} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-sm font-bold">Selecione um Equipamento</p>
                                        <p className="text-xs">Clique no gráfico ao lado para ver detalhes</p>
                                    </div>
                                </Card>
                            )}
                        </div>
                        <div className="col-span-2 row-span-1">
                            <Card className="h-full p-4 flex flex-row items-center justify-between bg-slate-50 border-slate-200">
                                <div className="flex items-center gap-4 flex-1 min-w-0"> 
                                    <div className="p-3 bg-white rounded-full shadow-sm shrink-0">
                                        <Filter size={20} className="text-slate-400"/>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-slate-600">Eventos Pontuais (Ruído)</h4>
                                        <p className="text-xs text-slate-400 line-clamp-2 md:line-clamp-1">
                                            Eventos de baixa frequência e MTTR removidos para clareza (Princípio Pareto 80/20)
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-6 px-6 border-l border-slate-200 shrink-0">
                                    <div className="text-right">
                                        <span className="block text-2xl font-bold text-slate-700 leading-none">{jackKnifeData.noise.length}</span>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold">Eventos</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-2xl font-bold text-slate-700 leading-none">{(jackKnifeData.noise.reduce((a,b)=>a+b.totalDuration,0)/60).toFixed(1)} h</span>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold">Total Parado</span>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {activeTab === 'breakdown' && (
                    <Card className="h-full overflow-hidden flex flex-col">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 font-bold text-sm uppercase flex justify-between items-center text-slate-600">
                            <span>Detalhamento {aggregation === 'day' ? 'Diário' : 'Agregado'}</span>
                            <span className="text-xs text-slate-400 font-normal">
                                {filterSelection ? "1 registro filtrado" : `${calculatedData.length} registros`}
                                {equipmentFilter ? ` • Equipamento: ${equipmentFilter}` : ""}
                            </span>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="min-w-full text-sm divide-y divide-slate-100 relative">
                                <thead className="bg-white sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-3 text-left font-bold text-slate-700">Período</th>
                                        <th className="px-6 py-3 text-right font-bold text-slate-500">Disp %</th>
                                        <th className="px-6 py-3 text-right font-bold text-slate-500">Perf %</th>
                                        <th className="px-6 py-3 text-right font-bold text-slate-500">Yield %</th>
                                        <th className="px-6 py-3 text-right font-bold text-orange-600">OEE %</th>
                                        <th className="px-6 py-3 text-right font-bold text-slate-600">Perda Disp (h)</th>
                                        <th className="px-6 py-3 text-right font-bold text-slate-600">Perda Perf (h)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {(filterSelection ? calculatedData.filter(d => d.key === filterSelection) : calculatedData).map((r, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-700">{r.label}</td>
                                            <td className="px-6 py-4 text-right" style={{color: r.avail >= TARGETS.AVAIL ? COLORS.green : COLORS.red}}>{r.avail.toFixed(1)}</td>
                                            <td className="px-6 py-4 text-right" style={{color: r.perf >= TARGETS.PERF ? COLORS.green : COLORS.red}}>{r.perf.toFixed(1)}</td>
                                            <td className="px-6 py-4 text-right" style={{color: r.qual >= TARGETS.QUAL ? COLORS.green : COLORS.red}}>{r.qual.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right font-bold bg-orange-50" style={{color: r.oee >= TARGETS.OEE ? COLORS.green : COLORS.red}}>{r.oee.toFixed(1)}</td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-600">{(r.lossDisp/60).toFixed(1)}</td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-600">{(r.lossUtil/60).toFixed(1)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>
        )}
      </main>
    </div>
  );
}