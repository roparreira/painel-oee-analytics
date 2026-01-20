import React, { useState } from 'react';
import { LayoutDashboard, Wrench, ChevronDown, ChevronRight, ChevronLeft, Eye, TreeDeciduous, TrendingDown, Activity, FileText, ClipboardList, Timer } from 'lucide-react';

export default function Sidebar({ activeModule, activeSubTab, onChange, onSubTabChange, isCollapsed, onToggleCollapse }) {
    const [expandedMenus, setExpandedMenus] = useState({ oee: true, failures: true, tbm: true });

    const menuItems = [
        {
            id: 'oee',
            label: 'OEE',
            icon: LayoutDashboard,
            subItems: [
                { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard }, // Restored
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
        {
            id: 'tbm',
            label: 'TBM - Man. Tempo',
            icon: Timer,
            subItems: [
                { id: 'tbm_dashboard', label: 'Dashboard TBM', icon: LayoutDashboard },
            ]
        },
    ];

    const toggleExpanded = (menuId) => {
        if (isCollapsed) return; // Prevent expanding subitems when collapsed
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
        <div className={`h-full bg-slate-900 transition-all duration-300 shadow-xl z-30 flex flex-col shrink-0 ${isCollapsed ? 'w-16' : 'w-64'}`}>
            {/* Logo Area */}
            <div className={`h-16 flex items-center border-b border-slate-800 transition-all duration-300 ${isCollapsed ? 'justify-center' : 'justify-between px-4'}`}>
                <div className="flex items-center">
                    <div className="w-8 h-8 rounded bg-orange-600 flex items-center justify-center shrink-0">
                        <span className="text-white font-bold text-lg">S</span>
                    </div>
                    {!isCollapsed && <span className="ml-3 text-white font-bold tracking-wider opacity-90">SUNCOKE</span>}
                </div>
                {!isCollapsed && (
                    <button onClick={onToggleCollapse} className="p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
                        <ChevronLeft size={16} />
                    </button>
                )}
            </div>

            {/* Menu Items */}
            <div className={`flex-1 py-4 flex flex-col gap-1 overflow-y-auto overflow-x-hidden ${isCollapsed ? 'px-2' : 'px-3'}`}>
                {isCollapsed && (
                    <button onClick={onToggleCollapse} className="mb-4 w-full flex items-center justify-center p-2 rounded-lg text-orange-500 bg-orange-500/10 hover:bg-orange-500/20 transition-all">
                        <ChevronRight size={20} />
                    </button>
                )}

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
                                title={isCollapsed ? item.label : ""}
                                className={`
                                    w-full flex items-center rounded-lg transition-all duration-200 group relative
                                    ${isCollapsed ? 'justify-center px-2 py-3 mb-1' : 'px-4 py-2.5 mb-1'}
                                    ${isActive ? 'bg-orange-600/20 text-orange-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                                `}
                            >
                                <Icon size={18} className={`shrink-0 ${isActive ? 'text-orange-400' : 'text-slate-500 group-hover:text-white'}`} />
                                {!isCollapsed && (
                                    <>
                                        <span className="ml-3 text-sm font-medium whitespace-nowrap flex-1 text-left">{item.label}</span>
                                        {item.subItems && (
                                            <div className="ml-auto">
                                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            </div>
                                        )}
                                    </>
                                )}
                                {isCollapsed && isActive && <div className="absolute left-0 w-1 h-6 bg-orange-600 rounded-r-full" />}
                            </button>

                            {/* Sub Items */}
                            {item.subItems && isExpanded && !isCollapsed && (
                                <div className="flex flex-col mt-1 ml-4 pl-4 border-l border-slate-700">
                                    {item.subItems.map(sub => {
                                        const isSubActive = isActive && activeSubTab === sub.id;
                                        const SubIcon = sub.icon;

                                        return (
                                            <button
                                                key={sub.id}
                                                onClick={() => handleSubItemClick(item.id, sub.id)}
                                                className={`
                                                    w-full flex items-center px-3 py-2 rounded-lg transition-all duration-200 text-left mb-0.5
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
            <div className={`p-4 border-t border-slate-800 transition-all duration-300 ${isCollapsed ? 'text-center' : ''}`}>
                <div className="text-[10px] text-slate-500 italic whitespace-nowrap overflow-hidden">
                    {isCollapsed ? 'v1.4' : 'v1.4.0 • 2026'}
                </div>
            </div>
        </div>
    );
}
