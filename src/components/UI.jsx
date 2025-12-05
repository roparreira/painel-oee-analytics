// src/components/UI.jsx
import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { COLORS } from '../config';

// Helper de formatação condicional
const getStatusColor = (percentage) => {
    if (percentage < 50) return COLORS.red;
    if (percentage < 90) return COLORS.yellow;
    return COLORS.green;
};

// Wrapper Genérico
export const Card = ({ children, className = "", style = {}, onClick = null }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-slate-100 flex flex-col ${className} ${onClick ? 'cursor-pointer transition-all duration-200' : ''}`} 
    style={style}
  >
    {children}
  </div>
);

// Cartão de Comparação (Real vs Meta)
export const ComparisonCard = ({ title, real, target, unit = "h", inverse = false, showDeviationOnly = false }) => {
    const safeReal = typeof real === 'number' ? real : 0;
    const safeTarget = typeof target === 'number' ? target : 0;

    const diff = safeReal - safeTarget;
    let isGood;
    
    if (inverse) {
        isGood = safeReal <= (safeTarget + 0.01);
    } else {
        isGood = safeReal >= (safeTarget - 0.01);
    }

    const diffColor = isGood ? 'text-green-600' : 'text-red-600';
    const bgColor = isGood ? 'bg-green-50' : 'bg-red-50';

    return (
        <Card className="p-2 flex flex-col gap-1 border-t-4 h-full justify-between" style={{borderTopColor: isGood ? COLORS.green : COLORS.red}}>
            <h3 className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1 leading-tight">
                {isGood ? <CheckCircle size={12} className="text-green-500 shrink-0"/> : <AlertTriangle size={12} className="text-red-500 shrink-0"/>}
                {title}
            </h3>
            
            {!showDeviationOnly ? (
                <div className="flex justify-between items-end mt-1">
                    <div>
                        <span className="text-lg font-bold text-slate-700 block leading-none">{safeReal.toLocaleString('pt-BR', {maximumFractionDigits: 1})} <span className="text-[9px] font-normal text-slate-400">{unit}</span></span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase">Realizado</span>
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-bold text-slate-500 block leading-none">{safeTarget.toLocaleString('pt-BR', {maximumFractionDigits: 1})} <span className="text-[8px] font-normal text-slate-300">{unit}</span></span>
                        <span className="text-[8px] text-slate-400">Meta</span>
                    </div>
                </div>
            ) : (
                <div className="mt-1">
                     <span className="text-[9px] text-slate-400 block mb-1">Meta: {safeTarget.toLocaleString('pt-BR', {maximumFractionDigits: 1})}</span>
                </div>
            )}

            <div className={`mt-1 py-1 px-2 rounded ${bgColor} flex justify-between items-center`}>
                <span className="text-[9px] font-bold text-slate-600">Desvio</span>
                <span className={`text-xs font-bold ${diffColor}`}>
                    {diff > 0 ? '+' : ''}{diff.toLocaleString('pt-BR', {maximumFractionDigits: 1})}
                </span>
            </div>
        </Card>
    )
};

// Cartão Duplo (Norte/Sul) com Cores Condicionais
export const CheckCardDual = ({ title, sub, icon: Icon, valNorte, totalNorte, valSul, totalSul }) => {
    const safeValNorte = valNorte || 0;
    const safeTotalNorte = totalNorte || 0;
    const safeValSul = valSul || 0;
    const safeTotalSul = totalSul || 0;

    const pctNorte = safeTotalNorte > 0 ? (safeValNorte / safeTotalNorte) * 100 : 0;
    const pctSul = safeTotalSul > 0 ? (safeValSul / safeTotalSul) * 100 : 0;

    // Cores dinâmicas por barra
    const colorNorte = getStatusColor(pctNorte);
    const colorSul = getStatusColor(pctSul);
    
    // Cor da borda do cartão (Pega o pior cenário para alertar)
    const cardBorderColor = (pctNorte < 50 || pctSul < 50) ? COLORS.red : (pctNorte < 90 || pctSul < 90) ? COLORS.yellow : COLORS.green;

    return (
        <Card className="p-3 flex flex-col gap-2 border-l-4 h-full justify-between" style={{borderLeftColor: cardBorderColor}}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{title}</p>
                    <p className="text-[8px] text-slate-400 leading-tight">{sub}</p>
                </div>
                <div className="p-1 rounded-full bg-slate-50">
                    <Icon size={14} style={{color: cardBorderColor}} />
                </div>
            </div>
            
            <div className="space-y-2">
                <div>
                    <div className="flex justify-between text-[9px] mb-0.5">
                        <span className="font-bold text-slate-600">Norte</span>
                        <span className="text-slate-500 font-medium">
                            {pctNorte.toFixed(0)}% <span className="text-[8px] text-slate-400">({safeValNorte}/{safeTotalNorte})</span>
                        </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width: `${pctNorte}%`, backgroundColor: colorNorte}}></div>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between text-[9px] mb-0.5">
                        <span className="font-bold text-slate-600">Sul</span>
                        <span className="text-slate-500 font-medium">
                            {pctSul.toFixed(0)}% <span className="text-[8px] text-slate-400">({safeValSul}/{safeTotalSul})</span>
                        </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width: `${pctSul}%`, backgroundColor: colorSul}}></div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

// Cartão Simples com Cores Condicionais
export const CheckCardSingle = ({ title, value, total, sub, icon: Icon }) => {
    const safeValue = Number(value) || 0;
    const safeTotal = Number(total) || 0;
    const percentage = safeTotal > 0 ? (safeValue / safeTotal) * 100 : 0; 
    
    const color = getStatusColor(percentage);

    return (
        <Card className="p-3 flex flex-col gap-2 border-l-4 h-full justify-between" style={{borderLeftColor: color}}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{title}</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-slate-700">{percentage.toFixed(0)}%</span>
                        <span className="text-[10px] text-slate-400 font-medium">({safeValue}/{safeTotal})</span>
                    </div>
                </div>
                <div className="p-1 rounded-full bg-slate-50">
                    <Icon size={14} style={{color}} />
                </div>
            </div>
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-1">
                <div className="h-full rounded-full" style={{width: `${percentage}%`, backgroundColor: color}}></div>
            </div>
            <p className="text-[8px] text-slate-400 mt-1 leading-tight">{sub}</p>
        </Card>
    );
};

// Linha Miniatura (Tree View)
export const MiniDreRow = ({ label, value, target, unit = "h" }) => {
    const valNum = parseFloat(value);
    const targetNum = parseFloat(target);
    const isGood = valNum <= targetNum; 
    const textColor = isGood ? 'text-green-600' : 'text-red-600';
    const dotColor = isGood ? 'bg-green-500' : 'bg-red-500';
    
    return (
        <div className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors px-1 rounded">
            <div className="flex items-center gap-1.5 overflow-hidden">
                <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></div>
                <span className="text-[10px] font-medium text-slate-600 truncate max-w-[110px]" title={label}>{label}</span>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
                <div className="text-right">
                    <span className={`block font-bold leading-none ${textColor}`}>{valNum} <span className={`text-[8px] font-normal opacity-70`}>{unit}</span></span>
                    <span className="text-[8px] text-slate-400 leading-none">Real</span>
                </div>
                <div className="text-right w-12 border-l border-slate-100 pl-2">
                    <span className="block font-bold text-slate-500 leading-none">{targetNum} <span className="text-[8px] font-normal text-slate-300">{unit}</span></span>
                    <span className="text-[8px] text-slate-400 leading-none">Meta</span>
                </div>
            </div>
        </div>
    );
};

// Estatística de Auditoria
export const AuditStat = ({ label, value, sub, color, icon: Icon }) => (
    <div className="flex items-start p-3 bg-slate-50 rounded-lg border-l-4" style={{ borderLeftColor: color }}>
        <div className="mr-3 mt-1">
            <div className="p-1.5 rounded-full bg-white shadow-sm">
                <Icon size={16} style={{ color: color }} />
            </div>
        </div>
        <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
            <h4 className="text-lg font-bold" style={{ color: color }}>{value}</h4>
            <p className="text-[10px] text-gray-400">{sub}</p>
        </div>
    </div>
);

// Card de Número Grande
export const BigNumberCard = ({ title, valueNumeric, displayValue, unit, target, compact = false }) => {
    let statusColor = COLORS.darkGray;
    let adherenceVal = 0;
    
    if (target > 0 && typeof valueNumeric === 'number' && !isNaN(valueNumeric)) {
        adherenceVal = (valueNumeric / target) * 100;
        statusColor = valueNumeric >= target ? COLORS.green : COLORS.red;
    }

    return (
        <div className={`bg-white rounded-xl border-l-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)] flex flex-col justify-between h-full ${compact ? 'p-3' : 'p-4'}`} style={{ borderLeftColor: statusColor }}>
            <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">{title}</p>
                <div className="flex items-baseline gap-1">
                    <h3 className={`${compact ? 'text-2xl' : 'text-3xl'} font-bold tracking-tight`} style={{ color: statusColor }}>{displayValue}</h3>
                    <span className="text-[10px] font-medium text-gray-400">{unit}</span>
                </div>
            </div>
            {!compact && (
                <div className="mt-2 flex justify-between items-center text-[10px] border-t border-slate-50 pt-2">
                    <span className="text-gray-400">Meta: <strong className="text-slate-600">{target.toLocaleString('pt-BR')}</strong></span>
                    <span className={`px-1.5 py-0.5 rounded font-bold ${valueNumeric >= target ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {adherenceVal.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1})}%
                    </span>
                </div>
            )}
            {compact && target !== 0 && (
                 <div className="mt-1 flex items-center gap-2 text-[10px]">
                    <span className="text-gray-400">Meta: {target.toLocaleString('pt-BR')}</span>
                 </div>
            )}
        </div>
    );
};

// Card de Pilar OEE
export const PillarCard = ({ title, value, target, icon: Icon }) => {
    const numVal = parseFloat(value) || 0;
    const isOk = numVal >= target;
    const dynamicColor = isOk ? COLORS.green : COLORS.red;

    return (
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-between relative overflow-hidden h-full group transition-all hover:shadow-md">
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 group-hover:w-2`} style={{ backgroundColor: dynamicColor }}></div>
            <div>
                <p className="text-[10px] font-bold uppercase tracking-wide mb-1 text-slate-400">{title}</p>
                <div className="flex items-baseline gap-1">
                    <h3 className="text-xl font-bold" style={{ color: dynamicColor }}>{value}%</h3>
                    <span className="text-[10px] text-gray-400">/ {target}%</span>
                </div>
            </div>
            <div className="p-2 rounded-full bg-slate-50 group-hover:bg-white transition-colors">
                <Icon size={18} style={{ color: dynamicColor }} />
            </div>
        </div>
    );
};