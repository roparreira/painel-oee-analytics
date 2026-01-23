import React, { useState } from 'react';
import { Database, AlertTriangle, CheckCircle, Activity, RefreshCw, ArrowRight, Truck } from 'lucide-react';
import { Card } from '../components/UI';
import { COLORS } from '../config';
import { processFiles } from '../services/etl';

export default function UploadScreen({ onDataReady }) {
    const [files, setFiles] = useState({ stop: null, prod: null, despacho: null, recebimento: null });
    const [loading, setLoading] = useState(false);
    const [errorLog, setErrorLog] = useState("");

    const isPublicDomain = window.location.hostname.includes('netlify.app') || window.location.hostname.includes('github.io');

    const handleNetworkLoad = async () => {
        setLoading(true); setErrorLog("");
        try {
            if (isPublicDomain) {
                throw new Error("O carregamento automático não está disponível em domínios públicos (Netlify). Use o Upload Manual ou execute o app na Intranet da empresa.");
            }

            const res = await fetch('/api/load-network-files');
            if (res.status === 404) {
                throw new Error("Serviço de rede não encontrado. Se estiver na Intranet, certifique-se de que o servidor Node.js está rodando.");
            }
            if (!res.ok) throw new Error(`Falha na conexão (${res.status})`);

            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Falha ao carregar arquivos");

            const f = json.files;
            const newFiles = { ...files };

            // Helper para converter base64 em File
            const b64toFile = (b64, name) => {
                const byteCharacters = atob(b64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                return new File([byteArray], name);
            };

            if (f.stop) newFiles.stop = b64toFile(f.stop.data, f.stop.name);

            const prodFiles = [];
            if (f.prod_25) prodFiles.push(b64toFile(f.prod_25.data, f.prod_25.name));
            if (f.prod_26) prodFiles.push(b64toFile(f.prod_26.data, f.prod_26.name));
            if (prodFiles.length > 0) newFiles.prod = prodFiles;

            if (f.despacho) newFiles.despacho = b64toFile(f.despacho.data, f.despacho.name);
            if (f.recebimento) newFiles.recebimento = b64toFile(f.recebimento.data, f.recebimento.name);

            setFiles(newFiles);
            setAutoLoaded(true);
        } catch (e) {
            console.error(e);
            setErrorLog(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleProcess = async () => {
        if (!files.stop || !files.prod) return alert("Selecione os arquivos obrigatórios.");
        setLoading(true); setErrorLog("");
        try {
            const result = await processFiles(files.stop, files.prod, files.despacho, files.recebimento);
            onDataReady(result);
        } catch (e) { console.error(e); setErrorLog(e.message); } finally { setLoading(false); }
    };

    return (
        <div className="h-full flex items-center justify-center animate-fade-in">
            <Card className="p-10 max-w-4xl w-full">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-700">
                        <Database className="text-orange-600" /> Carregar dados
                    </h2>
                    <button
                        onClick={handleNetworkLoad}
                        className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
                        title="Carregar arquivos da rede (W:)"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        Carregar Automático (Rede)
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

                    {/* GPMW (Apontamentos) - Obrigatório */}
                    <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 hover:border-orange-400 transition-all group cursor-pointer">
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" accept=".xlsx,.csv" onChange={e => setFiles(prev => ({ ...prev, stop: e.target.files[0] }))} />
                        <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"><AlertTriangle style={{ color: COLORS.red }} /></div>
                        <p className="font-bold text-sm text-slate-700">GPMW (Apontamentos)</p>
                        <p className="text-xs text-slate-400 mt-1">{files.stop ? files.stop.name : "Arraste ou clique"}</p>
                        {files.stop && <div className="mt-2 text-xs font-bold text-green-600 flex justify-center items-center gap-1"><CheckCircle size={12} /> Carregado</div>}
                        <div className="mt-2 text-[10px] text-orange-600 font-bold">Obrigatório</div>
                    </div>

                    {/* VTO (Produção Máquinas) - Obrigatório */}
                    <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 hover:border-green-400 transition-all group cursor-pointer">
                        <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            accept=".xlsx,.xlsm"
                            multiple
                            onChange={e => {
                                const files = Array.from(e.target.files);
                                if (files.length > 0) {
                                    setFiles(prev => ({ ...prev, prod: files }));
                                }
                            }}
                        />
                        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"><Activity style={{ color: COLORS.green }} /></div>
                        <p className="font-bold text-sm text-slate-700">VTO (Produção)</p>
                        <p className="text-xs text-slate-400 mt-1">
                            {files.prod && files.prod.length > 0
                                ? `${files.prod.length} arquivo(s) selecionado(s)`
                                : "Arraste ou clique (Múltiplos permitidos)"}
                        </p>
                        {files.prod && files.prod.length > 0 && <div className="mt-2 text-xs font-bold text-green-600 flex justify-center items-center gap-1"><CheckCircle size={12} /> Carregado</div>}
                        <div className="mt-2 text-[10px] text-orange-600 font-bold">Obrigatório</div>
                    </div>

                    {/* Totalizador Despacho (Pátio/Envio) - Opcional */}
                    <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 hover:border-yellow-400 transition-all group cursor-pointer">
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" accept=".xlsx,.xlsm" onChange={e => setFiles(prev => ({ ...prev, despacho: e.target.files[0] }))} />
                        <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"><Truck style={{ color: COLORS.yellow }} /></div>
                        <p className="font-bold text-sm text-slate-700">Totalizador Despacho</p>
                        <p className="text-xs text-slate-400 mt-1">{files.despacho ? files.despacho.name : "Arraste ou clique"}</p>
                        {files.despacho && <div className="mt-2 text-xs font-bold text-green-600 flex justify-center items-center gap-1"><CheckCircle size={12} /> {autoLoaded ? "Sincronizado via Robô" : "Carregado"}</div>}
                        <div className="mt-2 text-[10px] text-slate-400 italic">Opcional (Envio)</div>
                    </div>

                    {/* Totalizado Recebimento (Pátio/Recebimento) - Opcional */}
                    <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 hover:border-blue-400 transition-all group cursor-pointer">
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" accept=".xlsx,.xlsm" onChange={e => setFiles(prev => ({ ...prev, recebimento: e.target.files[0] }))} />
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"><Database style={{ color: COLORS.blue }} /></div>
                        <p className="font-bold text-sm text-slate-700">Totalizado Recebimento</p>
                        <p className="text-xs text-slate-400 mt-1">{files.recebimento ? files.recebimento.name : "Arraste ou clique"}</p>
                        {files.recebimento && <div className="mt-2 text-xs font-bold text-green-600 flex justify-center items-center gap-1"><CheckCircle size={12} /> Carregado</div>}
                        <div className="mt-2 text-[10px] text-slate-400 italic">Opcional (Recebimento)</div>
                    </div>
                </div>

                {errorLog && (<div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-3 animate-fade-in"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><div><p className="font-bold">Erro na importação:</p><p>{errorLog}</p></div></div>)}

                <div className="mt-4 mb-6 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs italic text-center">
                    Aviso: Este sistema não salva os dados online. Todos os dados são calculados com base nas planilhas fornecidas.
                </div>

                <button onClick={handleProcess} disabled={loading || !files.stop || !files.prod} className="w-full text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all disabled:opacity-50 flex justify-center items-center gap-2 bg-slate-800 disabled:cursor-not-allowed">
                    {loading ? <RefreshCw className="animate-spin" /> : <ArrowRight />}
                    {loading ? "Processando..." : "Iniciar Auditoria"}
                </button>
            </Card>
        </div>
    );
}