import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import OEEDashboardContent from '../components/OEEDashboardContent';
import FailuresAnalysisDashboard from '../components/FailuresAnalysisDashboard';

export default function DashboardScreen({ rawData, initialDateRange, areaMode, setAreaMode }) {
    const [activeModule, setActiveModule] = useState('oee');
    const [activeSubTab, setActiveSubTab] = useState('tree'); // Default to Desdobramento OEE

    // Handler para mudar de módulo
    const handleModuleChange = (moduleId) => {
        setActiveModule(moduleId);
        // Definir subtab padrão ao trocar de módulo
        if (moduleId === 'oee') {
            setActiveSubTab('tree');
        } else if (moduleId === 'failures') {
            setActiveSubTab('rcfas');
        }
    };

    return (
        <div className="flex h-full w-full bg-slate-50 overflow-hidden animate-fade-in">
            <Sidebar
                activeModule={activeModule}
                activeSubTab={activeSubTab}
                onChange={handleModuleChange}
                onSubTabChange={setActiveSubTab}
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
            </div>
        </div>
    );
}