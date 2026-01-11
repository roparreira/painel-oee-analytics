// src/config.js

// --- CONSTANTES DE NEGÓCIO (BUSINESS CONSTANTS) ---
// Definidas pela Engenharia de Confiabilidade (OEE v2.3)
// m = Meta, t = Teórico/Capacidade

export const BUSINESS_CONSTANTS = {
    // TEMPO (Horas)
    TC_META: 48,       // Tempo Calendário
    SL_META: 13,       // Schedule Loss Meta (10h Manut + 3h Turno)
    SL_THEORY: 21.33333,

    CO_META: 3,        // Corretiva Aceitável (h)
    CO_THEORY: 0,

    STP_META: 2,       // Setup/Limpeza Aceitável (h)
    STP_THEORY: 0,

    // PRODUÇÃO FÍSICA
    FN_META: 160,      // Fornos/dia
    FN_THEORY: 160,

    VOL_META: 40.31,   // Toneladas Carvão Úmido / Forno (Meta)
    VOL_THEORY: 42.82, // Toneladas Carvão Úmido / Forno (Teórico)

    // QUALIDADE
    QA_META: 72.15,    // Yield (%)
    QA_THEORY: 100
};

// --- CONSTANTES DE NEGÓCIO - PÁTIO/ENVIO ---
export const BUSINESS_CONSTANTS_PATIO = {
    // TEMPO (Horas)
    TC_META: 24,       // Tempo Calendário (24h por dia para Pátio)
    SL_META: 6,        // Schedule Loss Meta

    CO_META: 3,        // Corretiva Aceitável (h)
    STP_META: 1,       // Setup/Limpeza Aceitável (h)

    // PRODUÇÃO FÍSICA / TAXA
    VOL_META: 4188,    // Volume Meta (toneladas)
    TX_META: 301,      // Taxa Meta (t/h)

    // QUALIDADE (sempre 100% para Pátio/Envio)
    QA_META: 100     // Yield (%)
};

// --- CÁLCULO DE METAS (TARGETS) ---
// Derivadas matematicamente das constantes acima para consistência total com o ETL

// 1. Disponibilidade (DI)
// Base: Loading Meta = 48h - 13h = 35h
const loadingTimeMeta = BUSINESS_CONSTANTS.TC_META - BUSINESS_CONSTANTS.SL_META;
const operatingTimeMeta = loadingTimeMeta - BUSINESS_CONSTANTS.CO_META; // 35h - 3h = 32h
const targetAvailPct = (operatingTimeMeta / loadingTimeMeta) * 100; // ~91.43%

// 2. Performance (PE) - Fórmula Composta: AVOL * UF * ADFN

// A. AVOL (Volume): (FNm * VOLm) / (FNt * VOLt)
// Eficiência de massa em relação à capacidade máxima
const massMeta = BUSINESS_CONSTANTS.FN_META * BUSINESS_CONSTANTS.VOL_META;
const massTheory = BUSINESS_CONSTANTS.FN_THEORY * BUSINESS_CONSTANTS.VOL_THEORY;
const targetAVOL = massMeta / massTheory; // ~0.9414

// B. UF (Utilização Física): (NetOperating / Operating)
// NetOperating Meta = 32h - 2h (Setup) = 30h
const netOperatingTimeMeta = operatingTimeMeta - BUSINESS_CONSTANTS.STP_META;
const targetUF = netOperatingTimeMeta / operatingTimeMeta; // 30/32 = 0.9375

// C. ADFN (Aderência Forno a Forno): Teórico / Meta
// Ciclo Teórico = Tempo Disponível Teórico / Fornos Teóricos
// Tempo Teórico = 48h - 21.33h (SLt) = 26.66h
const timeAvailableTheory = BUSINESS_CONSTANTS.TC_META - BUSINESS_CONSTANTS.SL_THEORY;
const cycleTheory = (timeAvailableTheory * 60) / BUSINESS_CONSTANTS.FN_THEORY; // ~10 min/forno

// Ciclo Meta = Tempo Líquido Meta / Fornos Meta
const cycleMeta = (netOperatingTimeMeta * 60) / BUSINESS_CONSTANTS.FN_META; // (30*60)/160 = 11.25 min/forno

// Fator ADFN (Quanto menor o ciclo real/meta, melhor, então compara-se com o teórico que é o menor possível)
const targetADFN = cycleTheory / cycleMeta; // 10 / 11.25 = 0.888...

const targetPerfPct = (targetAVOL * targetUF * targetADFN) * 100; // ~78.45%

// 3. Qualidade (QA)
const targetQualPct = BUSINESS_CONSTANTS.QA_META; // 72.15%

// 4. OEE
const targetOeePct = (targetAvailPct / 100) * (targetPerfPct / 100) * (targetQualPct / 100) * 100;

export const TARGETS = {
    OEE: parseFloat(targetOeePct.toFixed(2)),
    AVAIL: parseFloat(targetAvailPct.toFixed(2)),
    PERF: parseFloat(targetPerfPct.toFixed(2)),
    QUAL: parseFloat(targetQualPct.toFixed(2))
};

// --- CÁLCULO DE METAS - PÁTIO/ENVIO ---
// Para Pátio/Envio, usa fórmula ADTX (Aderência a Taxa) ao invés de ADFN

// 1. Disponibilidade Pátio
const loadingTimeMetaPatio = BUSINESS_CONSTANTS_PATIO.TC_META - BUSINESS_CONSTANTS_PATIO.SL_META; // 24 - 6 = 18h
const operatingTimeMetaPatio = loadingTimeMetaPatio - BUSINESS_CONSTANTS_PATIO.CO_META; // 18 - 3 = 15h
const targetAvailPctPatio = (operatingTimeMetaPatio / loadingTimeMetaPatio) * 100; // ~83.33%

// 2. Performance Pátio - Fórmula: AVOL * UF * ADTX
// A. AVOL para Pátio: VOL_META / VOL_META = 1 (simplificado, usa ADTX para aderência)
const targetAVOLPatio = 1;

// B. UF Pátio
const netOperatingTimeMetaPatio = operatingTimeMetaPatio - BUSINESS_CONSTANTS_PATIO.STP_META; // 15 - 1 = 14h
const targetUFPatio = netOperatingTimeMetaPatio / operatingTimeMetaPatio; // 14/15 = 0.9333

// C. ADTX (Aderência a Taxa): TX_META / TX_REAL_META
// TX_REAL_META = VOL_META / (TC - SL - CO - STP) = 4188 / 14 = 299 t/h
const txRealMeta = BUSINESS_CONSTANTS_PATIO.VOL_META / netOperatingTimeMetaPatio;
const targetADTX = BUSINESS_CONSTANTS_PATIO.TX_META / txRealMeta; // 301 / 299 ~= 1.0067

const targetPerfPctPatio = (targetAVOLPatio * targetUFPatio * targetADTX) * 100;

// 3. Qualidade Pátio
const targetQualPctPatio = BUSINESS_CONSTANTS_PATIO.QA_META;

// 4. OEE Pátio
const targetOeePctPatio = (targetAvailPctPatio / 100) * (targetPerfPctPatio / 100) * (targetQualPctPatio / 100) * 100;

export const TARGETS_PATIO = {
    OEE: parseFloat(targetOeePctPatio.toFixed(2)),
    AVAIL: parseFloat(targetAvailPctPatio.toFixed(2)),
    PERF: parseFloat(targetPerfPctPatio.toFixed(2)),
    QUAL: parseFloat(targetQualPctPatio.toFixed(2))
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
    jackKnife: {
        chronic: '#FEF3C7',
        acute: '#FFEDD5',
        acuteChronic: '#FEE2E2',
        ideal: '#DCFCE7'
    }
};