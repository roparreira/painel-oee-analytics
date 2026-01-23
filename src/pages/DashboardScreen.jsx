import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import OEEDashboardContent from '../components/OEEDashboardContent';
import FailuresAnalysisDashboard from '../components/FailuresAnalysisDashboard';
import TBMDashboard from '../components/TBMDashboard';

export default function DashboardScreen({ rawData, initialDateRange, areaMode, setAreaMode }) {
    const [activeModule, setActiveModule] = useState('oee');
    const [activeSubTab, setActiveSubTab] = useState('overview'); // Default to Visão Geral
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Handler para mudar de módulo
    const handleModuleChange = (moduleId) => {
        if (moduleId !== activeModule) {
            setActiveModule(moduleId);
            // Definir subtab padrão ao trocar de módulo
            if (moduleId === 'oee') {
                setActiveSubTab('overview');
            } else if (moduleId === 'failures') {
                setActiveSubTab('rcfas');
            } else if (moduleId === 'tbm') {
                setActiveSubTab('tbm_dashboard');
            }
        }
    };

    return (
        <div className="flex h-full w-full bg-slate-50 overflow-hidden animate-fade-in">
            <Sidebar
                activeModule={activeModule}
                activeSubTab={activeSubTab}
                onChange={handleModuleChange}
                onSubTabChange={setActiveSubTab}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />

            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {activeModule === 'oee' && (
                    <OEEDashboardContent
                        rawData={rawData}
                        initialDateRange={initialDateRange}
                        areaMode={areaMode}
                        setAreaMode={setAreaMode}
                        activeTab={activeSubTab}
                        setActiveTab={setActiveSubTab}
                    />
                )}

                {activeModule === 'failures' && (
                    <FailuresAnalysisDashboard
                        activeSubTab={activeSubTab}
                        setActiveSubTab={setActiveSubTab}
                    />
                )}

                {activeModule === 'tbm' && (
                    <TBMDashboard />
                )}
            </div>
        </div>
    );
}