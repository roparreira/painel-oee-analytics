import React from 'react';
import { X, Calculator, Info } from 'lucide-react';
import { BUSINESS_CONSTANTS, BUSINESS_CONSTANTS_PATIO, TARGETS, TARGETS_PATIO } from '../config';

const OEEExplanation = ({ aggregates, areaMode, onClose }) => {
    if (!aggregates) return null;

    const isPatio = areaMode === 'patio';
    const BC = isPatio ? BUSINESS_CONSTANTS_PATIO : BUSINESS_CONSTANTS;
    const T = isPatio ? TARGETS_PATIO : TARGETS;

    // --- PÁTIO LOGIC ---
    if (isPatio) {
        return (
            <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <Calculator size={18} className="text-blue-500" />
                            Cálculo OEE - Pátio/Envio
                        </h3>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto space-y-4">
                        {/* Intro */}
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3 text-xs text-blue-800">
                            <Info size={16} className="shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold mb-1">Fórmula OEE Pátio/Envio</p>
                                <p>OEE = <strong>Disponibilidade × Performance × Qualidade</strong></p>
                            </div>
                        </div>

                        {/* Resultado */}
                        <div className="grid grid-cols-4 gap-2 text-center">
                            <div className="bg-slate-100 p-3 rounded-lg">
                                <span className="text-[10px] text-slate-500 uppercase">OEE</span>
                                <p className="text-xl font-bold text-slate-700">{aggregates.oee}%</p>
                            </div>
                            <div className="bg-red-50 p-3 rounded-lg">
                                <span className="text-[10px] text-red-600 uppercase">Disp.</span>
                                <p className="text-lg font-bold text-red-700">{aggregates.avail}%</p>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg">
                                <span className="text-[10px] text-green-600 uppercase">Perf.</span>
                                <p className="text-lg font-bold text-green-700">{aggregates.perf}%</p>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-lg">
                                <span className="text-[10px] text-purple-600 uppercase">Qual.</span>
                                <p className="text-lg font-bold text-purple-700">{aggregates.qual}%</p>
                            </div>
                        </div>

                        {/* Disponibilidade */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-slate-700 border-l-4 border-red-500 pl-2">Disponibilidade</h4>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1">
                                <div className="flex justify-between"><span>Calendar Time:</span><span className="font-mono">{BC.TC_META}h × dias</span></div>
                                <div className="flex justify-between"><span>Loading Time:</span><span className="font-mono">Calendar - Paradas Programadas</span></div>
                                <div className="flex justify-between"><span>Operating Time:</span><span className="font-mono">Loading - Indisponibilidade</span></div>
                                <div className="flex justify-between font-bold border-t pt-1"><span>DF = Operating / Loading</span><span className="font-mono">{aggregates.avail}%</span></div>
                            </div>
                        </div>

                        {/* Performance */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-slate-700 border-l-4 border-green-500 pl-2">Performance</h4>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1">
                                <div className="flex justify-between"><span>UF = NetOperating / Operating</span><span className="font-mono">Fator de Utilização</span></div>
                                <div className="flex justify-between"><span>TX_REAL = Volume / (NetOper/60)</span><span className="font-mono">Taxa Real [t/h]</span></div>
                                <div className="flex justify-between"><span>TX_THEORY = {BC.TX_THEORY || 600} t/h</span><span className="font-mono">Taxa Teórica</span></div>
                                <div className="flex justify-between"><span>ADTX = TX_REAL / TX_THEORY</span><span className="font-mono">Aderência à Taxa</span></div>
                                <div className="flex justify-between font-bold border-t pt-1"><span>PE = UF × ADTX</span><span className="font-mono">{aggregates.perf}%</span></div>
                            </div>
                        </div>

                        {/* Qualidade */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-slate-700 border-l-4 border-purple-500 pl-2">Qualidade</h4>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                                <div className="flex justify-between font-bold"><span>QA = 100% (fixo para Pátio/Envio)</span><span className="font-mono">{aggregates.qual}%</span></div>
                            </div>
                        </div>

                        {/* Check */}
                        <div className="bg-slate-800 text-white p-3 rounded-lg text-xs">
                            <div className="flex justify-between">
                                <span>Check: {aggregates.avail}% × {aggregates.perf}% × {aggregates.qual}% =</span>
                                <span className="font-bold text-blue-400">{aggregates.oee}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- MÁQUINAS LOGIC ---
    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <Calculator size={18} className="text-orange-500" />
                        Cálculo OEE - Máquinas
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                    {/* Intro */}
                    <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 flex gap-3 text-xs text-orange-800">
                        <Info size={16} className="shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold mb-1">Fórmula OEE Máquinas</p>
                            <p>OEE = <strong>Disponibilidade × Performance × Qualidade</strong></p>
                        </div>
                    </div>

                    {/* Resultado */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="bg-slate-100 p-3 rounded-lg">
                            <span className="text-[10px] text-slate-500 uppercase">OEE</span>
                            <p className="text-xl font-bold text-slate-700">{aggregates.oee}%</p>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg">
                            <span className="text-[10px] text-red-600 uppercase">Disp.</span>
                            <p className="text-lg font-bold text-red-700">{aggregates.avail}%</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                            <span className="text-[10px] text-green-600 uppercase">Perf.</span>
                            <p className="text-lg font-bold text-green-700">{aggregates.perf}%</p>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg">
                            <span className="text-[10px] text-purple-600 uppercase">Qual.</span>
                            <p className="text-lg font-bold text-purple-700">{aggregates.qual}%</p>
                        </div>
                    </div>

                    {/* Disponibilidade */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-slate-700 border-l-4 border-red-500 pl-2">Disponibilidade</h4>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1">
                            <div className="flex justify-between"><span>Calendar Time:</span><span className="font-mono">{BC.TC_META}h/dia × dias</span></div>
                            <div className="flex justify-between"><span>Loading Time:</span><span className="font-mono">Calendar - Paradas Programadas</span></div>
                            <div className="flex justify-between"><span>Operating Time:</span><span className="font-mono">Loading - Falhas - Manutenções</span></div>
                            <div className="flex justify-between font-bold border-t pt-1"><span>DF = Operating / Loading</span><span className="font-mono">{aggregates.avail}%</span></div>
                        </div>
                    </div>

                    {/* Performance */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-slate-700 border-l-4 border-green-500 pl-2">Performance</h4>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1">
                            <div className="flex justify-between"><span>AVOL = wetCharge / (FN × VOL_THEORY)</span><span className="font-mono">Aderência Volume</span></div>
                            <div className="flex justify-between"><span>UF = NetOperating / Operating</span><span className="font-mono">Fator de Utilização</span></div>
                            <div className="flex justify-between"><span>Ciclo Teórico = {BC.FN_THEORY} min/forno</span><span className="font-mono"></span></div>
                            <div className="flex justify-between"><span>ADFN = Ciclo Teórico / Ciclo Real</span><span className="font-mono">Aderência ao Ritmo</span></div>
                            <div className="flex justify-between font-bold border-t pt-1"><span>PE = AVOL × UF × ADFN</span><span className="font-mono">{aggregates.perf}%</span></div>
                        </div>
                    </div>

                    {/* Qualidade */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-slate-700 border-l-4 border-purple-500 pl-2">Qualidade (Yield)</h4>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                            <div className="flex justify-between"><span>Yield = Produção Aprovada / Produção Total</span><span className="font-mono"></span></div>
                            <div className="flex justify-between font-bold border-t pt-1"><span>QA (do VTO)</span><span className="font-mono">{aggregates.qual}%</span></div>
                        </div>
                    </div>

                    {/* Check */}
                    <div className="bg-slate-800 text-white p-3 rounded-lg text-xs">
                        <div className="flex justify-between">
                            <span>Check: {aggregates.avail}% × {aggregates.perf}% × {aggregates.qual}% =</span>
                            <span className="font-bold text-orange-400">{aggregates.oee}%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OEEExplanation;
