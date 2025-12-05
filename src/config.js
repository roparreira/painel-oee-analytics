// src/config.js

// --- CONSTANTES DE META ---
export const TARGETS = {
    OEE: 65,
    AVAIL: 90,
    PERF: 95,
    QUAL: 72.15
};

// --- PALETA DE CORES ---
export const COLORS = {
    orange: '#FB4F14',
    darkGray: '#334155', // Slate-700
    red: '#EF4444',      // Vermelho (Perda / Excedente)
    blue: '#0065BD',     // Azul (Target / Confiabilidade)
    blueGray: '#7D9AAA', 
    yellow: '#EBB700',   // Amarelo Performance
    lightGray: '#94A3B8',
    green: '#22C55E',    // Verde (Ganho / Economia)
    transparent: 'rgba(0,0,0,0)',
    offWhite: '#F8FAFC',
    faded: '#E2E8F0',
    // Cores específicas para o fundo do Jack Knife (Tons pastéis transparentes)
    jackKnife: {
        chronic: '#FEF3C7',      // Amarelo/Laranja claro (Bottom-Right)
        acute: '#FFEDD5',        // Laranja claro (Top-Left)
        acuteChronic: '#FEE2E2', // Vermelho claro (Top-Right)
        ideal: '#DCFCE7'         // Verde claro (Bottom-Left)
    }
};