import React, { useState } from 'react';
import { 
    FileSearch, AlertTriangle, Clock, Settings, Activity, Database, 
    BarChart2, Calendar, Droplet, Info, CheckCircle 
} from 'lucide-react';
import { Card, AuditStat } from '../components/UI';
import { COLORS } from '../config';

const AuditScreen = ({ auditStats, ignoredLog, onConfirm, onCancel }) => {
    const [showLog, setShowLog] = useState(false);

    // Proteção contra dados nulos
    if (!auditStats) return null;

    return (
        <div className="h-full flex items-center justify-center animate-fade-in">
            <div className="max-w-5xl w-full">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Validação de Dados</h2>
                        <p className="text-sm text-slate-500">Confira os totais identificados antes de calcular o OEE.</p>
                    </div>
                    <div className="flex gap-4">
                        {ignoredLog && ignoredLog.length > 0 && (
                            <button 
                                onClick={() => setShowLog(!showLog)} 
                                className="text-sm text-red-600 font-bold hover:underline flex items-center gap-1"
                            >
                                <Info size={16}/> {ignoredLog.length} Linhas Ignoradas
                            </button>
                        )}
                        <button 
                            onClick={onConfirm} 
                            className="text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 bg-green-600 hover:bg-green-700"
                        >
                            <CheckCircle size={18}/> Confirmar e Calcular
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Cartão de Auditoria de Paradas */}
                    <Card className="p-6 border-t-4" style={{borderTopColor: COLORS.red}}>
                        <h3 className="font-bold mb-6 flex items-center gap-2 text-slate-700">
                            <FileSearch style={{color: COLORS.red}}/> Auditoria de Paradas
                        </h3>
                        <div className="space-y-4">
                            <AuditStat 
                                label="Eventos Válidos" 
                                value={auditStats.stops.count} 
                                sub="Filtro: Máquinas + Parou" 
                                color={COLORS.darkGray} 
                                icon={AlertTriangle} 
                            />
                            <AuditStat 
                                label="Tempo Total" 
                                value={auditStats.stops.totalHours + " h"} 
                                sub="Soma bruta" 
                                color={COLORS.red} 
                                icon={Clock} 
                            />
                            <AuditStat 
                                label="Manutenção" 
                                value={auditStats.stops.maintHours + " h"} 
                                sub="Área Técnica" 
                                color={COLORS.orange} 
                                icon={Settings} 
                            />
                        </div>
                    </Card>

                    {/* Cartão de Auditoria de Produção */}
                    <Card className="p-6 border-t-4" style={{borderTopColor: COLORS.green}}>
                        <h3 className="font-bold mb-6 flex items-center gap-2 text-slate-700">
                            <Activity style={{color: COLORS.green}}/> Auditoria de Produção
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <AuditStat 
                                label="Produção Total" 
                                value={parseInt(auditStats.prod.prodTons).toLocaleString()} 
                                sub="Toneladas" 
                                color={COLORS.green} 
                                icon={Database} 
                            />
                            <AuditStat 
                                label="Total Fornos" 
                                value={auditStats.prod.ovens} 
                                sub="Unidades" 
                                color={COLORS.darkGray} 
                                icon={BarChart2} 
                            />
                            <AuditStat 
                                label="Dias Cobertos" 
                                value={auditStats.prod.days} 
                                sub="Range do Arquivo" 
                                color={COLORS.blue} 
                                icon={Calendar} 
                            />
                            <AuditStat 
                                label="Água Industrial" 
                                value={parseInt(auditStats.prod.water).toLocaleString()} 
                                sub="m³ Total" 
                                color={COLORS.blueGray} 
                                icon={Droplet} 
                            />
                        </div>
                    </Card>
                </div>

                {/* Log de Erros/Ignorados */}
                {showLog && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg max-h-60 overflow-y-auto text-xs font-mono text-red-800">
                        <p className="font-bold mb-2 sticky top-0 bg-red-50">Log de Rejeição (Amostra):</p>
                        {ignoredLog.map((l, idx) => (
                            <div key={idx} className="mb-1">Linha {l.row}: {l.reason}</div>
                        ))}
                    </div>
                )}

                <div className="mt-8 text-center">
                    <button 
                        onClick={onCancel} 
                        className="text-sm hover:underline text-slate-400"
                    >
                        Cancelar e carregar outros arquivos
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuditScreen;