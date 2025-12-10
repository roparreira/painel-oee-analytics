import React, { useState } from 'react';
import { Database, AlertTriangle, CheckCircle, Activity, RefreshCw, ArrowRight } from 'lucide-react';
import { Card } from '../components/UI';
import { COLORS } from '../config';
import { processFiles } from '../services/etl';

export default function UploadScreen({ onDataReady }) {
    const [files, setFiles] = useState({ stop: null, prod: null });
    const [loading, setLoading] = useState(false);
    const [errorLog, setErrorLog] = useState("");

    const handleProcess = async () => {
        if(!files.stop || !files.prod) return alert("Selecione os arquivos.");
        setLoading(true); setErrorLog(""); 
        try {
            const result = await processFiles(files.stop, files.prod);
            onDataReady(result);
        } catch(e) { console.error(e); setErrorLog(e.message); } finally { setLoading(false); }
    };

    return (
        <div className="h-full flex items-center justify-center animate-fade-in">
            <Card className="p-10 max-w-2xl w-full">
                {/* ALTERAÇÃO VISUAL: Rótulo principal mudado */}
                <h2 className="text-lg font-bold mb-8 flex items-center gap-2 text-slate-700">
                    <Database className="text-orange-600"/> Carregar dados
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    
                    {/* ALTERAÇÃO VISUAL: Rótulo "Apontamentos" para "GPMW" */}
                    <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 hover:border-orange-400 transition-all group cursor-pointer">
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" accept=".xlsx,.csv" onChange={e => setFiles(prev => ({...prev, stop: e.target.files[0]}))}/>
                        <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"><AlertTriangle style={{color: COLORS.red}} /></div>
                        <p className="font-bold text-sm text-slate-700">GPMW (Apontamentos)</p>
                        <p className="text-xs text-slate-400 mt-1">{files.stop ? files.stop.name : "Arraste ou clique"}</p>
                        {files.stop && <div className="mt-2 text-xs font-bold text-green-600 flex justify-center items-center gap-1"><CheckCircle size={12}/> Carregado</div>}
                    </div>
                    
                    {/* ALTERAÇÃO VISUAL: Rótulo "Produção" para "VTO" */}
                    <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 hover:border-green-400 transition-all group cursor-pointer">
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" accept=".xlsx,.xlsm" onChange={e => setFiles(prev => ({...prev, prod: e.target.files[0]}))}/>
                        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"><Activity style={{color: COLORS.green}} /></div>
                        <p className="font-bold text-sm text-slate-700">VTO (Produção)</p>
                        <p className="text-xs text-slate-400 mt-1">{files.prod ? files.prod.name : "Arraste ou clique"}</p>
                        {files.prod && <div className="mt-2 text-xs font-bold text-green-600 flex justify-center items-center gap-1"><CheckCircle size={12}/> Carregado</div>}
                    </div>
                </div>
                
                {errorLog && (<div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-3 animate-fade-in"><AlertTriangle size={18} className="mt-0.5 shrink-0"/><div><p className="font-bold">Erro na importação:</p><p>{errorLog}</p></div></div>)}
                
                {/* NOVO TEXTO ADVERTÊNCIA */}
                <div className="mt-4 mb-6 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs italic text-center">
                    Aviso: Este sistema não salva os dados online. Todos os dados são calculados com base nas planilhas fornecidas.
                </div>

                <button onClick={handleProcess} disabled={loading || !files.stop || !files.prod} className="w-full text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all disabled:opacity-50 flex justify-center items-center gap-2 bg-slate-800 disabled:cursor-not-allowed">
                    {loading ? <RefreshCw className="animate-spin"/> : <ArrowRight/>}
                    {loading ? "Processando..." : "Iniciar Auditoria"}
                </button>
            </Card>
        </div>
    );
}