import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { formatDateISO } from './utils';

// Páginas (Default Exports)
import UploadScreen from './pages/UploadScreen';
import AuditScreen from './pages/AuditScreen';
import DashboardScreen from './pages/DashboardScreen';

export default function App() {
  const [step, setStep] = useState('upload');
  const [rawData, setRawData] = useState({ stops: [], stopsPatio: [], prod: {}, prodPatio: {} });
  const [auditStats, setAuditStats] = useState(null);
  const [ignoredLog, setIgnoredLog] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [areaMode, setAreaMode] = useState('maquinas'); // 'maquinas' ou 'patio'

  // Injeção XLSX
  useEffect(() => {
    if (!window.XLSX) {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      script.async = true;
      document.body.appendChild(script);
      return () => { document.body.removeChild(script); }
    }
  }, []);

  const handleUploadComplete = (result) => {
    setRawData({
      stops: result.stops,
      stopsPatio: result.stopsPatio,
      prod: result.prod,
      prodPatio: result.prodPatio || {}
    });
    setAuditStats(result.auditStats);
    setIgnoredLog(result.ignored);
    setStep('audit');
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

  return (
    <div className="h-screen flex flex-col font-sans text-slate-700 bg-slate-50 overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex flex-col gap-3 shadow-sm shrink-0 z-20">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500 text-white shadow-md shadow-orange-200"><Activity size={20} /></div>
            <div><h1 className="text-xl font-bold tracking-tight text-slate-800 leading-none">Portal OEE <span className="text-orange-500 font-light">Analytics</span></h1><p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">Heat Recovery System • {areaMode === 'maquinas' ? 'Máquinas' : 'Pátio/Envio'}</p><p className="text-[10px] text-orange-500 font-bold mt-0.5 uppercase tracking-wide">ENGENHARIA DE CONFIABILIDADE</p></div>
          </div>
          {step === 'dashboard' && (
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setAreaMode('maquinas')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${areaMode === 'maquinas' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Máquinas
              </button>
              <button
                onClick={() => setAreaMode('patio')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${areaMode === 'patio' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Pátio/Envio
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1 w-full h-full max-w-[1920px] mx-auto overflow-hidden relative">
        {step === 'upload' && (<UploadScreen onDataReady={handleUploadComplete} />)}
        {step === 'audit' && (<AuditScreen auditStats={auditStats} ignoredLog={ignoredLog} onConfirm={handleConfirmAudit} onCancel={() => setStep('upload')} />)}
        {step === 'dashboard' && (<DashboardScreen rawData={rawData} initialDateRange={dateRange} areaMode={areaMode} />)}
      </main>
      <footer className="bg-slate-50 px-6 py-1 text-right shrink-0 z-10 border-t border-slate-100"><p className="text-[10px] text-slate-400 italic">Desenvolvido pela Engenharia de Confiabilidade SunCoke Energy Brasil</p></footer>
    </div>
  );
}