import React from 'react';
import { X, Calculator, Info } from 'lucide-react';
import { BUSINESS_CONSTANTS, BUSINESS_CONSTANTS_PATIO, TARGETS } from '../config';

const BridgeChartExplanation = ({ aggregates, areaMode = 'patio', onClose }) => {
    if (!aggregates) return null;

    const isPatio = areaMode === 'patio';

    // --- PÁTIO LOGIC (NOVA LÓGICA COM 4 PARCELAS) ---
    if (isPatio) {
        const bm = aggregates.patioBridgeMeta || {};
        const br = aggregates.patioBridgeReal || {};

        if (!bm.VM || !br.VR) {
            return (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md">
                        <p className="text-slate-600">Dados de Bridge não disponíveis.</p>
                        <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-100 rounded">Fechar</button>
                    </div>
                </div>
            );
        }

        // Cálculos das 4 parcelas da Bridge
        const BVSL = Math.round((bm.SLM - br.SLR) * bm.TLIQ);
        const BIND = Math.round((bm.PNPM - br.PNPR) * bm.TLIQ);
        const BPOP = Math.round((bm.POM - br.POR) * bm.TLIQ);
        const BPRT = Math.round((br.TLIQR - bm.TLIQ) * br.TLR);

        // Check de verificação
        const check = Math.round(bm.VM) - BVSL - BIND - BPOP + BPRT;

        return (
            <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <Calculator size={18} className="text-blue-500" />
                            Detalhamento: Bridge de Volume (Pátio/Envio)
                        </h3>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto space-y-4">
                        {/* Info Box */}
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3 text-xs text-blue-800">
                            <Info size={16} className="shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold mb-1">Schedule Loss Variável</p>
                                <p>{bm.thursdays} quintas (8h PP) + {bm.otherDays} outros dias (4h PP). Taxa Líquida Meta média: <strong>{bm.TLIQ?.toFixed(1)} t/h</strong></p>
                            </div>
                        </div>

                        {/* Meta */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-slate-700 border-l-4 border-gray-400 pl-2">1. Volume Meta</h4>
                            <div className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <span className="text-slate-700 font-mono block">
                                    {aggregates.totalDays} dias × {BUSINESS_CONSTANTS_PATIO.VOL_META.toLocaleString('pt-BR')} t = <strong className="text-lg">{Math.round(bm.VM).toLocaleString('pt-BR')} t</strong>
                                </span>
                            </div>
                        </div>

                        {/* 4 Parcelas */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-slate-700 border-l-4 border-yellow-500 pl-2">2. Parcela: Ausência de Janela (Schedule Loss)</h4>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                                <p className="font-mono">BVSL = (SLM - SLR) × TLIQ</p>
                                <p className="font-mono mt-1">= ({bm.SLM?.toFixed(1)}h - {br.SLR?.toFixed(1)}h) × {bm.TLIQ?.toFixed(1)} t/h</p>
                                <p className="mt-2 text-right"><strong className={BVSL > 0 ? 'text-red-600' : 'text-green-600'}>{BVSL > 0 ? '-' : '+'}{Math.abs(BVSL).toLocaleString('pt-BR')} t</strong></p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-slate-700 border-l-4 border-red-500 pl-2">3. Parcela: Indisponibilidade</h4>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                                <p className="font-mono">BIND = (PNPM - PNPR) × TLIQ</p>
                                <p className="font-mono mt-1">= ({bm.PNPM?.toFixed(1)}h - {br.PNPR?.toFixed(1)}h) × {bm.TLIQ?.toFixed(1)} t/h</p>
                                <p className="mt-2 text-right"><strong className={BIND > 0 ? 'text-red-600' : 'text-green-600'}>{BIND > 0 ? '-' : '+'}{Math.abs(BIND).toLocaleString('pt-BR')} t</strong></p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-slate-700 border-l-4 border-orange-500 pl-2">4. Parcela: Perda Operacional</h4>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                                <p className="font-mono">BPOP = (POM - POR) × TLIQ</p>
                                <p className="font-mono mt-1">= ({bm.POM?.toFixed(1)}h - {br.POR?.toFixed(1)}h) × {bm.TLIQ?.toFixed(1)} t/h</p>
                                <p className="mt-2 text-right"><strong className={BPOP > 0 ? 'text-red-600' : 'text-green-600'}>{BPOP > 0 ? '-' : '+'}{Math.abs(BPOP).toLocaleString('pt-BR')} t</strong></p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className={`text-sm font-bold border-l-4 pl-2 ${BPRT >= 0 ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700'}`}>5. Parcela: Taxa de Produção</h4>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                                <p className="font-mono">BPRT = (TLIQR - TLIQ) × TLR</p>
                                <p className="font-mono mt-1">= ({br.TLIQR?.toFixed(1)} - {bm.TLIQ?.toFixed(1)}) t/h × {br.TLR?.toFixed(1)}h</p>
                                <p className="mt-2 text-right"><strong className={BPRT >= 0 ? 'text-green-600' : 'text-red-600'}>{BPRT >= 0 ? '+' : ''}{BPRT.toLocaleString('pt-BR')} t</strong></p>
                            </div>
                        </div>

                        {/* Check */}
                        <div className="bg-slate-800 text-white p-4 rounded-lg text-xs">
                            <p className="font-bold mb-2">✓ Verificação: VM + BVSL + BIND + BPOP + BPRT</p>
                            <p className="font-mono">{Math.round(bm.VM).toLocaleString('pt-BR')} + {BVSL.toLocaleString('pt-BR')} + {BIND.toLocaleString('pt-BR')} + {BPOP.toLocaleString('pt-BR')} + {BPRT.toLocaleString('pt-BR')} = <strong className="text-orange-400">{check.toLocaleString('pt-BR')} t</strong></p>
                            <p className="mt-2">Real: <strong className="text-blue-400">{Math.round(br.VR).toLocaleString('pt-BR')} t</strong></p>
                        </div>

                        {/* Legenda */}
                        <div className="bg-slate-100 p-3 rounded-lg text-[10px] text-slate-600">
                            <p className="font-bold text-slate-700 mb-2">📖 Legenda das Siglas</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                <div><strong>VM</strong> = Volume Meta (t)</div>
                                <div><strong>VR</strong> = Volume Real (t)</div>
                                <div><strong>SLM</strong> = Schedule Loss Meta (h)</div>
                                <div><strong>SLR</strong> = Schedule Loss Real (h)</div>
                                <div><strong>PNPM</strong> = Paradas Não Programadas Meta (h)</div>
                                <div><strong>PNPR</strong> = Paradas Não Programadas Real (h)</div>
                                <div><strong>POM</strong> = Perda Operacional Meta (h)</div>
                                <div><strong>POR</strong> = Perda Operacional Real (h)</div>
                                <div><strong>TLIQ</strong> = Taxa Líquida Meta (t/h)</div>
                                <div><strong>TLIQR</strong> = Taxa Líquida Real (t/h)</div>
                                <div><strong>TLR</strong> = Tempo Líquido Real (h)</div>
                                <div><strong>BVSL</strong> = Bridge Volume Schedule Loss</div>
                                <div><strong>BIND</strong> = Bridge Indisponibilidade</div>
                                <div><strong>BPOP</strong> = Bridge Perda Operacional</div>
                                <div><strong>BPRT</strong> = Bridge Taxa Produção</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- MÁQUINAS LOGIC (NOVA LÓGICA COM FRANQUIAS CORRIGIDAS) ---
    const bm = aggregates.bridgeMeta || {};
    const br = aggregates.bridgeReal || {};

    // Constantes Meta
    const FM = bm.FM || 160;
    const LT = bm.LT || (35 * 60);
    const TL = bm.TL || (30 * 60);
    const FFL = bm.FFL || 11.25;
    const DM = bm.DM || 0.9143;
    const UM = bm.UM || 0.9375;

    // Valores Reais
    const FR = br.FR || 0;
    const PNPR = br.PNPR || 0;
    const POR = br.POR || 0;
    const LTR = br.LTR || 0;
    const TLR = br.TLR || 0;
    const totalDays = aggregates.totalDays || 1;

    // Cálculos intermediários
    const PNPMC = (1 - DM) * LTR;
    const POMC = (1 - UM) * (LTR - PNPR);
    const NTL = LTR - PNPMC - POMC;
    const FFR = FR > 0 ? TLR / FR : 0;

    // Parcelas do Bridge
    const BNFSL = Math.round((NTL - TL) / FFL);
    const BIND = Math.round((PNPMC - PNPR) / FFL);
    const BPOP = Math.round((POMC - POR) / FFL);
    const BPRT = FFR > 0 ? Math.round((TLR / FFR) - (TLR / FFL)) : 0;

    const formatMin = (min) => {
        const h = Math.floor(Math.abs(min) / 60);
        const m = Math.round(Math.abs(min) % 60);
        return `${h}h${m.toString().padStart(2, '0')}m`;
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <Calculator size={18} className="text-orange-500" />
                        Bridge de Fornos (Máquinas)
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
                            <p className="font-bold mb-1">Lógica com Franquias Corrigidas</p>
                            <p>As metas de Indisponibilidade e Perda Operacional são recalculadas baseadas no <strong>Ciclo Real</strong>, não no calendário fixo.</p>
                        </div>
                    </div>

                    {/* Meta e Real */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-100 p-3 rounded-lg text-center">
                            <span className="text-[10px] text-slate-500 uppercase">Meta</span>
                            <p className="text-xl font-bold text-slate-700">{FM}</p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-lg text-center">
                            <span className="text-[10px] text-blue-600 uppercase">Real</span>
                            <p className="text-xl font-bold text-blue-700">{FR}</p>
                        </div>
                    </div>

                    {/* Tempos */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1">
                        <div className="flex justify-between"><span>LT (Loading Meta):</span><span className="font-mono">{formatMin(LT)}</span></div>
                        <div className="flex justify-between"><span>LTR (Loading Real):</span><span className="font-mono">{formatMin(LTR)}</span></div>
                        <div className="flex justify-between"><span>TL (T. Líquido Meta):</span><span className="font-mono">{formatMin(TL)}</span></div>
                        <div className="flex justify-between"><span>TLR (T. Líquido Real):</span><span className="font-mono">{formatMin(TLR)}</span></div>
                        <div className="flex justify-between font-bold border-t pt-1"><span>FFL (Forno a Forno Meta):</span><span className="font-mono">{FFL.toFixed(2)} min</span></div>
                        <div className="flex justify-between font-bold"><span>FFR (Forno a Forno Real):</span><span className="font-mono">{FFR.toFixed(2)} min</span></div>
                    </div>

                    {/* Franquias Corrigidas */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-slate-700 border-l-4 border-blue-500 pl-2">Franquias Corrigidas</h4>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1">
                            <div className="flex justify-between"><span>PNPMC = (1 - {(DM * 100).toFixed(1)}%) × LTR:</span><span className="font-mono">{formatMin(PNPMC)}</span></div>
                            <div className="flex justify-between"><span>POMC = (1 - {(UM * 100).toFixed(1)}%) × (LTR - PNPR):</span><span className="font-mono">{formatMin(POMC)}</span></div>
                            <div className="flex justify-between font-bold border-t pt-1"><span>NTL (Novo T. Líquido):</span><span className="font-mono">{formatMin(NTL)}</span></div>
                        </div>
                    </div>

                    {/* Parcelas */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-slate-700 border-l-4 border-orange-500 pl-2">Parcelas do Bridge</h4>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-2">
                            <div className="flex justify-between items-center">
                                <span>Ausência Janela: (NTL - TL) / FFL</span>
                                <span className={`font-mono font-bold ${BNFSL >= 0 ? 'text-yellow-500' : 'text-red-600'}`}>{BNFSL > 0 ? '+' : ''}{BNFSL}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Indisponibilidade: (PNPMC - PNPR) / FFL</span>
                                <span className={`font-mono font-bold ${BIND >= 0 ? 'text-green-600' : 'text-red-600'}`}>{BIND > 0 ? '+' : ''}{BIND}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>P. Operacional: (POMC - POR) / FFL</span>
                                <span className={`font-mono font-bold ${BPOP >= 0 ? 'text-green-600' : 'text-red-600'}`}>{BPOP > 0 ? '+' : ''}{BPOP}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Forno a Forno: (TLR/FFR) - (TLR/FFL)</span>
                                <span className={`font-mono font-bold ${BPRT >= 0 ? 'text-green-600' : 'text-red-600'}`}>{BPRT > 0 ? '+' : ''}{BPRT}</span>
                            </div>
                        </div>
                    </div>

                    {/* Verificação */}
                    <div className="bg-slate-800 text-white p-3 rounded-lg text-xs">
                        <div className="flex justify-between">
                            <span>Check: {FM} + {BNFSL} + {BIND} + {BPOP} + {BPRT} =</span>
                            <span className="font-bold text-orange-400">{FM + BNFSL + BIND + BPOP + BPRT} (Real: {FR})</span>
                        </div>
                    </div>

                    {/* Legenda */}
                    <div className="bg-slate-100 p-3 rounded-lg text-[10px] text-slate-600">
                        <p className="font-bold text-slate-700 mb-2">📖 Legenda das Siglas</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <div><strong>FM</strong> = Fornos Meta</div>
                            <div><strong>FR</strong> = Fornos Real</div>
                            <div><strong>FFL</strong> = Franquia Forno Líquido (min/forno)</div>
                            <div><strong>FFR</strong> = Forno a Forno Real (min/forno)</div>
                            <div><strong>SLMC</strong> = Schedule Loss Meta Corrigido (min)</div>
                            <div><strong>SLR</strong> = Schedule Loss Real (min)</div>
                            <div><strong>PNPMC</strong> = Paradas Não Progr. Meta Corrigida (min)</div>
                            <div><strong>PNPR</strong> = Paradas Não Progr. Real (min)</div>
                            <div><strong>POMC</strong> = Perda Oper. Meta Corrigida (min)</div>
                            <div><strong>POR</strong> = Perda Oper. Real (min)</div>
                            <div><strong>TLR</strong> = Tempo Líquido Real (min)</div>
                            <div><strong>BNFSL</strong> = Bridge Ausência Janela</div>
                            <div><strong>BIND</strong> = Bridge Indisponibilidade</div>
                            <div><strong>BPOP</strong> = Bridge Perda Operacional</div>
                            <div><strong>BPRT</strong> = Bridge Forno a Forno (Ritmo)</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BridgeChartExplanation;
