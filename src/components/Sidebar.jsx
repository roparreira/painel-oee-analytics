import React, { useState } from 'react';
import { LayoutDashboard, Wrench, ChevronDown, ChevronRight, Eye, TreeDeciduous, TrendingDown, Activity, FileText, ClipboardList } from 'lucide-react';

export default function Sidebar({ activeModule, activeSubTab, onChange, onSubTabChange }) {
    const [expandedMenus, setExpandedMenus] = useState({ oee: true, failures: true });

    const menuItems = [
        {
            id: 'oee',
            label: 'OEE',
            icon: LayoutDashboard,
            subItems: [
                // "Análise OEE" / Visão Geral removed
                { id: 'tree', label: 'Desdobramento OEE', icon: TreeDeciduous }, // Renamed from Árvore OEE
                { id: 'losses', label: 'Análise de Perdas', icon: TrendingDown },
                { id: 'reliability', label: 'Confiabilidade', icon: Activity },
            ]
        },
        {
            id: 'failures',
            label: 'Análise de Falhas',
            icon: Wrench,
            subItems: [
                { id: 'rcfas', label: 'RCFAs', icon: FileText },
                { id: 'acoes', label: 'Ações', icon: ClipboardList },
            ]
        },
    ];

    const toggleExpanded = (menuId) => {
        setExpandedMenus(prev => ({ ...prev, [menuId]: !prev[menuId] }));
    };

    const handleMenuClick = (menuId, firstSubId) => {
        onChange(menuId);
        if (firstSubId) {
            onSubTabChange(firstSubId);
        }
    };

    const handleSubItemClick = (menuId, subId) => {
        onChange(menuId);
        onSubTabChange(subId);
    };

    return (
        <div className="h-full bg-slate-900 w-16 md:w-64 flex flex-col shrink-0 transition-all duration-300 shadow-xl z-30">
            {/* Logo Area */}
            <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-slate-800">
                <div className="w-8 h-8 rounded bg-orange-600 flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-lg">S</span>
                </div>
                <span className="ml-3 text-white font-bold tracking-wider hidden md:block opacity-90">SUNCOKE</span>
            </div>

            {/* Menu Items */}
            <div className="flex-1 py-4 flex flex-col gap-1 px-2 md:px-3 overflow-y-auto">
                {menuItems.map(item => {
                    const isActive = activeModule === item.id;
                    const isExpanded = expandedMenus[item.id];
                    const Icon = item.icon;

                    return (
                        <div key={item.id}>
                            {/* Main Menu Item */}
                            <button
                                onClick={() => {
                                    toggleExpanded(item.id);
                                    handleMenuClick(item.id, item.subItems?.[0]?.id);
                                }}
                                className={`
                                    w-full flex items-center justify-center md:justify-start px-2 py-2.5 md:px-4 rounded-lg transition-all duration-200 group
                                    ${isActive ? 'bg-orange-600/20 text-orange-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                                `}
                            >
                                <Icon size={18} className={`shrink-0 ${isActive ? 'text-orange-400' : 'text-slate-500 group-hover:text-white'}`} />
                                <span className={`ml-3 text-sm font-medium hidden md:block whitespace-nowrap flex-1 text-left`}>{item.label}</span>

                                {/* Chevron */}
                                {item.subItems && (
                                    <div className="hidden md:block">
                                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </div>
                                )}
                            </button>

                            {/* Sub Items */}
                            {item.subItems && isExpanded && (
                                <div className="hidden md:flex flex-col mt-1 ml-4 pl-4 border-l border-slate-700">
                                    {item.subItems.map(sub => {
                                        const isSubActive = isActive && activeSubTab === sub.id;
                                        const SubIcon = sub.icon;

                                        return (
                                            <button
                                                key={sub.id}
                                                onClick={() => handleSubItemClick(item.id, sub.id)}
                                                className={`
                                                    w-full flex items-center px-3 py-2 rounded-lg transition-all duration-200 text-left
                                                    ${isSubActive
                                                        ? 'bg-orange-600 text-white shadow-md'
                                                        : 'text-slate-500 hover:bg-slate-800 hover:text-white'}
                                                `}
                                            >
                                                <SubIcon size={14} className="shrink-0" />
                                                <span className="ml-2 text-xs font-medium">{sub.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 hidden md:block">
                <div className="text-[10px] text-slate-500 text-center">
                    v1.4.0 • 2026
                </div>
            </div>
        </div>
    );
}
