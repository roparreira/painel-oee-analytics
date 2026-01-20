import {
    parseDate, getProductionDate, formatDateISO, parseNumber,
    getMinutesInsideWindow, getAggregationKey, formatDateDisplay, formatDuration, dayjs
} from '../utils';
import { TARGETS, TARGETS_PATIO, BUSINESS_CONSTANTS, BUSINESS_CONSTANTS_PATIO, STEPPED_TARGETS_MAQUINAS, STEPPED_TARGETS_PATIO } from '../config';

// --- HELPERS DE REGRESSÃO (Para calcular Beta e Eta) ---
const calculateLinearRegression = (data) => {
    const N = data.length;
    if (N < 2) return { slope: 0, intercept: 0 };
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    data.forEach(d => {
        sumX += d.x;
        sumY += d.y;
        sumXY += d.x * d.y;
        sumX2 += d.x * d.x;
    });

    const slope = (N * sumXY - sumX * sumY) / (N * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / N;
    return { slope, intercept };
};

// --- LEITURA DE ARQUIVOS (INGESTÃO) ---
const readExcelToArray = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                // Leitura de dados sem opções de data para forçar a interpretação numérica em parseNumber
                const workbook = window.XLSX.read(data, { type: 'array' });
                resolve(workbook);
            } catch (err) { reject(err); }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

export const processFiles = async (fileStop, fileProd, fileDespacho = null) => {
    const ignored = [];

    // 1. Processar Apontamentos (Stops)
    const wbStop = await readExcelToArray(fileStop);
    const wsStop = wbStop.Sheets[wbStop.SheetNames.find(n => n.includes('Apont') || n.includes('Dados')) || wbStop.SheetNames[0]];
    const rowsStop = window.XLSX.utils.sheet_to_json(wsStop, { header: 1, defval: null });

    let hIdx = -1;
    for (let i = 0; i < Math.min(rowsStop.length, 50); i++) {
        const rStr = JSON.stringify(rowsStop[i]).toLowerCase();
        if (rStr.includes('processo') && (rStr.includes('duração') || rStr.includes('duracao'))) { hIdx = i; break; }
    }
    if (hIdx === -1) throw new Error("Cabeçalho 'Processo' não encontrado no arquivo de paradas.");

    const headStop = rowsStop[hIdx].map(h => String(h).trim().toLowerCase());
    const idxS = {
        proc: headStop.findIndex(h => h.includes('processo')),
        linha: headStop.findIndex(h => h.includes('linha')),
        parou: headStop.findIndex(h => h.includes('parou')),
        inicio: headStop.findIndex(h => h.includes('início') || h.includes('inicio')),
        fim: headStop.findIndex(h => h.includes('fim')),
        area: headStop.findIndex(h => h.includes('área') || h.includes('responsável')),
        tipo: headStop.findIndex(h => h.includes('tipo')),
        desc: headStop.findIndex(h => h.includes('descrição')),
        equip: headStop.findIndex(h => h.includes('equipamento') || h.includes('tag')),
        comp: headStop.findIndex(h => h.includes('componente') || h.includes('causa')),
        modo: headStop.findIndex(h => h.includes('modo') || h.includes('desvio') || h.includes('falha')),
        bateria: headStop.findIndex(h => h.includes('bateria') || h.includes('local') || h.includes('área executante')),
        quench: headStop.findIndex(h => h.includes('quench')),
        dataProd: headStop.findIndex(h => h.includes('data de produção') || h.includes('data de producao')) // Coluna Z
    };
    if (idxS.quench === -1) idxS.quench = 5;
    if (idxS.dataProd === -1) idxS.dataProd = 25; // Coluna Z = índice 25

    const cleanStops = [];
    const cleanStopsPatio = [];
    let totalStopDuration = 0;
    let maintenanceDuration = 0;
    let totalStopDurationPatio = 0;

    for (let i = hIdx + 1; i < rowsStop.length; i++) {
        const r = rowsStop[i];
        if (!r || r.length === 0) continue;

        const valProc = String(r[idxS.proc] || '').trim().toLowerCase();
        const valLinha = String(r[idxS.linha] || '').trim().toLowerCase();
        const valParou = String(r[idxS.parou] || '').trim().toLowerCase();

        // Identificar tipo de dado
        const isMaquina = valProc.includes('maquina') || valProc.includes('máquina');
        const isPatio = valProc.includes('patio') || valProc.includes('pátio');
        const isEnvio = valLinha.includes('envio');

        // Ignorar se não for nem Máquina nem Pátio/Envio
        if (!isMaquina && !(isPatio && isEnvio)) {
            ignored.push({ row: i + 1, reason: `Processo: ${valProc}, Linha: ${valLinha}` }); continue;
        }

        const start = parseDate(r[idxS.inicio]);
        const end = parseDate(r[idxS.fim]);

        if (!start || !end) { ignored.push({ row: i + 1, reason: `Data Inválida` }); continue; }

        // Para Pátio: usar coluna Z (Data de Produção). Para Máquinas: calcular de início.
        let dateStr;
        if (isPatio && isEnvio) {
            const dataProdVal = parseDate(r[idxS.dataProd]);
            dateStr = dataProdVal ? formatDateISO(dataProdVal) : null;
        } else {
            const prodDate = getProductionDate(start);
            dateStr = formatDateISO(prodDate);
        }
        if (!dateStr) { ignored.push({ row: i + 1, reason: `Erro ISO` }); continue; }

        const duration = (end - start) / 1000 / 60;
        const safeDuration = isNaN(duration) || duration < 0 ? 0 : duration;

        const stopRecord = {
            start, end, duration: safeDuration, dateStr,
            area: String(r[idxS.area] || '').trim(),
            tipo: String(r[idxS.tipo] || '').trim(),
            desc: String(r[idxS.desc] || '').trim(),
            equip: String(r[idxS.equip] || '').trim(),
            comp: String(r[idxS.comp] || '').trim(),
            modo: String(r[idxS.modo] || '').trim(),
            parou: valParou,
            bateria: (idxS.bateria > -1) ? String(r[idxS.bateria] || '').trim() : String(r[3]).trim(),
            quench: String(r[idxS.quench] || '').trim(),
            processo: valProc  // Campo para identificar Pátio/Envio vs Máquinas
        };

        // Processar Máquinas (TODOS os registros, estatísticas apenas para parou='sim')
        if (isMaquina) {
            // Estatísticas apenas para parou='sim' (comportamento original)
            if (valParou.includes('sim')) {
                totalStopDuration += safeDuration;
                const area = String(r[idxS.area] || '').trim();
                if (area.toLowerCase().includes('manut')) maintenanceDuration += safeDuration;
            }
            // TODOS os registros de Máquinas vão para o array (comportamento original)
            cleanStops.push(stopRecord);
        }

        // Processar Pátio/Envio (independente de 'parou')
        if (isPatio && isEnvio) {
            totalStopDurationPatio += safeDuration;
            cleanStopsPatio.push(stopRecord);
        }
    }

    // 2. Processar Produção (VTO - Máquinas) - Suporte a múltiplos arquivos
    const cleanProd = {};
    let minDateFound = null, maxDateFound = null;
    let totalFornos = 0, totalProdReal = 0, totalWater = 0;

    // Normalizar para array sempre
    const prodFiles = Array.isArray(fileProd) ? fileProd : [fileProd];

    for (const pFile of prodFiles) {
        const wbProd = await readExcelToArray(pFile);
        const sheetProdName = wbProd.SheetNames.find(n => n.toLowerCase().includes('production') || n.toLowerCase().includes('produção'));

        if (!sheetProdName) continue; // Pula se não achar a aba neste arquivo, ou lance erro se preferir rigor

        const wsProd = wbProd.Sheets[sheetProdName];
        const rowsProd = window.XLSX.utils.sheet_to_json(wsProd, { header: 1, defval: null });

        for (let i = 0; i < rowsProd.length; i++) {
            const r = rowsProd[i];
            if (!r) continue;

            const d = parseDate(r[1]);
            if (!d || String(r[1]).toLowerCase().includes('total')) continue;
            const iso = formatDateISO(d);
            if (!iso) continue;

            // Atualiza range global de datas
            if (!minDateFound || d < minDateFound) minDateFound = d;
            if (!maxDateFound || d > maxDateFound) maxDateFound = d;

            // Leitura de Yield (Índice 10)
            let rawYield = parseNumber(r[10]);
            if (rawYield > 0 && rawYield < 1) rawYield = rawYield * 100;

            const ovens = parseNumber(r[9]);
            const realCoke = parseNumber(r[3]);
            const water = parseNumber(r[20]);
            const wetCharge = parseNumber(r[6]);

            totalFornos += ovens;
            totalProdReal += realCoke;
            totalWater += water;

            // Filtrar linhas com Fornos e Carga Zerados
            if (ovens === 0 && wetCharge === 0) continue;

            // Sobrescreve se já existir (mesma data em arquivos diferentes??) 
            // ou apenas adiciona ao dicionário global
            cleanProd[iso] = {
                date: d,
                planCoke: parseNumber(r[2]),
                realCoke, ovens, yield: rawYield, water, wetCharge
            };
        }
    }

    if (Object.keys(cleanProd).length === 0) throw new Error("Aba 'Production' não encontrada ou sem dados válidos nos arquivos de VTO.");

    let daysSpan = 0;
    if (minDateFound && maxDateFound) {
        const diffTime = Math.abs(maxDateFound - minDateFound);
        daysSpan = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    // 3. Processar Totalizador Despacho (Pátio/Envio) - Opcional
    const cleanProdPatio = {};
    let totalVolDespacho = 0;
    let despachoStats = { count: 0, totalVolume: 0 };

    if (fileDespacho) {
        const wbDespacho = await readExcelToArray(fileDespacho);
        const wsDespacho = wbDespacho.Sheets[wbDespacho.SheetNames[0]];
        const rowsDespacho = window.XLSX.utils.sheet_to_json(wsDespacho, { header: 1, defval: null });

        // Encontrar cabeçalho (procura por "Data" na coluna A ou "Total Entregue" na coluna D)
        let hIdxDespacho = 0;
        for (let i = 0; i < Math.min(rowsDespacho.length, 20); i++) {
            const row = rowsDespacho[i];
            if (row && row[0] && String(row[0]).toLowerCase().includes('data')) {
                hIdxDespacho = i;
                break;
            }
        }

        for (let i = hIdxDespacho + 1; i < rowsDespacho.length; i++) {
            const r = rowsDespacho[i];
            if (!r) continue;

            // Coluna A: Data, Coluna D: Total Entregue BS [ton]
            const dateVal = parseDate(r[0]);
            const volumeVal = parseNumber(r[3]); // Coluna D (índice 3)

            if (!dateVal || volumeVal === 0) continue;
            const iso = formatDateISO(dateVal);
            if (!iso) continue;

            totalVolDespacho += volumeVal;
            despachoStats.count++;

            // Criar estrutura compatível com prod
            cleanProdPatio[iso] = {
                date: dateVal,
                planCoke: 0,
                realCoke: 0,
                ovens: 0,
                yield: 100, // Qualidade sempre 100% para Pátio
                water: 0,
                // wetCharge: Carregamento Úmido para Máquinas | Coque Base Seca para Pátio
                wetCharge: volumeVal // Volume usado para cálculo TX_REAL
            };
        }
        despachoStats.totalVolume = totalVolDespacho;
    }

    return {
        stops: cleanStops,
        stopsPatio: cleanStopsPatio,
        prod: cleanProd,
        prodPatio: cleanProdPatio,
        auditStats: {
            stops: { count: cleanStops.length, totalHours: (totalStopDuration / 60).toFixed(1), maintHours: (maintenanceDuration / 60).toFixed(1) },
            stopsPatio: { count: cleanStopsPatio.length, totalHours: (totalStopDurationPatio / 60).toFixed(1) },
            prod: { days: daysSpan, ovens: totalFornos, prodTons: totalProdReal.toFixed(0), water: totalWater.toFixed(0) },
            despacho: despachoStats
        },
        ignored
    };
};

// --- CÁLCULOS E AGREGAÇÕES ---
// (O código de cálculo permanece o mesmo para MTTR, MTBF, Aggregates, e Weibull)
// ... [Código de calculateOEEData, calculateDashboardAggregates, calculateTreeStats, calculateJackKnifeData, calculateReliabilityTrend, calculateWeibullData]

export const calculateOEEData = (rawData, dateRange, aggregation, equipmentFilter, areaMode = 'maquinas') => {
    const { stops, prod } = rawData;
    const dates = Object.keys(prod).sort();
    if (dates.length === 0 || !dateRange.start || !dateRange.end) return [];

    // Selecionar constantes baseado no modo
    const isPatio = areaMode === 'patio';
    const BC = isPatio ? BUSINESS_CONSTANTS_PATIO : BUSINESS_CONSTANTS;

    const results = [];

    // Para Máquinas: usa cycleTheory para ADFN
    const timeAvailableTheory = BUSINESS_CONSTANTS.TC_META - BUSINESS_CONSTANTS.SL_THEORY;
    const cycleTheory = (timeAvailableTheory * 60) / BUSINESS_CONSTANTS.FN_THEORY;

    dates.forEach(dateKey => {
        if (dateKey < dateRange.start || dateKey > dateRange.end) return;
        const p = prod[dateKey];
        let s = stops.filter(stop => stop.dateStr === dateKey);
        if (equipmentFilter) s = s.filter(stop => stop.equip === equipmentFilter);

        // Tempo Calendário baseado no modo
        const HOURS_PER_DAY = BC.TC_META;
        const TARGET_MAINT_MINS = isPatio ? BC.SL_META * 60 : 10 * 60;
        const TARGET_SHIFT_CHANGE = isPatio ? 0 : 3 * 60;
        const TARGET_BUCKET_QUENCH = isPatio ? 0 : 5 * 60;

        let dailyJanelaInsideNorte = 0, dailyJanelaInsideSul = 0, dailyJanelaOutside = 0;
        let failureLoss = 0, shiftChange = 0, opsLoss = 0;

        s.forEach(ev => {
            const timeData = getMinutesInsideWindow(ev.start, ev.end);
            const areaLower = ev.area.toLowerCase();
            const bateriaLower = (ev.bateria || '').toLowerCase();
            const quenchLower = (ev.quench || '').toLowerCase();
            const parouSim = (ev.parou || '').toLowerCase().includes('sim');
            const isJanela = bateriaLower.includes('janela a/b') || bateriaLower.includes('janela c/d');
            const isMaint = areaLower.includes('manut');
            const isProdArea = areaLower.includes('produção') || areaLower.includes('producao') || areaLower.includes('externo');
            const isTurno = (ev.modo + ev.desc).toLowerCase().includes('turno') || (ev.modo + ev.desc).toLowerCase().includes('passagem');

            if (isPatio) {
                // Para Pátio: categorizar paradas baseado em Tipo (col K) e Área (col I)
                const tipoLower = ev.tipo.toLowerCase();
                const areaLower = ev.area.toLowerCase();

                if (tipoLower.includes('programada') && !tipoLower.includes('não')) {
                    // Tipo = "Programada" → Preventiva (Schedule Loss)
                    shiftChange += ev.duration; // reutilizando shiftChange para slReal
                } else if (tipoLower.includes('não programada') || tipoLower.includes('nao programada')) {
                    // Tipo = "Não Programada"
                    if (areaLower.includes('manut')) {
                        // Área = Manutenção → Indisponibilidade (lossDisp)
                        failureLoss += ev.duration;
                    } else if (areaLower.includes('produ')) {
                        // Área = Produção → Perda Operacional (lossUtil)
                        opsLoss += ev.duration;
                    }
                }
            } else {
                // Para Máquinas: lógica original
                if (isJanela) {
                    if (quenchLower.includes('norte') || quenchLower.includes('north')) dailyJanelaInsideNorte += timeData.inside;
                    else dailyJanelaInsideSul += timeData.inside;
                    dailyJanelaOutside += timeData.outside;
                } else if (isTurno) {
                    shiftChange += timeData.total;
                } else if (parouSim) {
                    if (isMaint) failureLoss += timeData.total;
                    else if (isProdArea) opsLoss += timeData.total;
                }
            }
        });

        let calendar, loading, operating, lossDisp, lossUtil, netOperating;
        let totalUsedMaint = 0, extMaint = 0, outsideMaint = 0, excessShift = 0, loadingMins;

        if (isPatio) {
            // Cálculos para Pátio usando valores REAIS das paradas
            calendar = HOURS_PER_DAY * 60; // 24h = 1440 min

            // slReal = soma das paradas Programadas (preventiva)
            const slReal = shiftChange; // shiftChange foi usado para acumular paradas programadas
            loading = calendar - slReal;
            loadingMins = loading;

            // lossDisp = soma das paradas Não Programadas de Manutenção (indisponibilidade)
            lossDisp = failureLoss;
            operating = Math.max(0, loading - lossDisp);

            // lossUtil = soma das paradas Não Programadas de Produção (perda operacional)
            lossUtil = opsLoss;
            netOperating = Math.max(0, operating - lossUtil);
        } else {
            // Cálculos originais para Máquinas
            const usedMaintNorte = Math.min(dailyJanelaInsideNorte, TARGET_BUCKET_QUENCH);
            const excessNorte = dailyJanelaInsideNorte - usedMaintNorte;
            const usedMaintSul = Math.min(dailyJanelaInsideSul, TARGET_BUCKET_QUENCH);
            const excessSul = dailyJanelaInsideSul - usedMaintSul;
            totalUsedMaint = usedMaintNorte + usedMaintSul;

            extMaint = excessNorte + excessSul;
            outsideMaint = dailyJanelaOutside;

            const shiftTimeForSchedule = shiftChange < TARGET_SHIFT_CHANGE ? shiftChange : TARGET_SHIFT_CHANGE;
            const appliedSchedule = totalUsedMaint + shiftTimeForSchedule;

            calendar = HOURS_PER_DAY * 60;
            loading = calendar - appliedSchedule;
            loadingMins = loading;
            excessShift = Math.max(0, shiftChange - TARGET_SHIFT_CHANGE);
            lossDisp = extMaint + outsideMaint + failureLoss;
            operating = Math.max(0, loading - lossDisp);

            lossUtil = opsLoss + excessShift;
            netOperating = Math.max(0, operating - lossUtil);
        }

        // Cálculo de Performance
        let AVOL, UF, ADFN, ADTX, perfFinal;

        if (isPatio) {
            // Pátio: usa ADTX (Aderência a Taxa)
            const volumeReal = p.wetCharge || 0; // Fallback para 0 se undefined

            // AVOL = Volume Real / VOL_META
            AVOL = (BC.VOL_META > 0 && volumeReal > 0) ? (volumeReal / BC.VOL_META) : 0;

            // UF = netOperating / operating
            UF = operating > 0 ? (netOperating / operating) : 0;

            // TX_REAL = Volume Produzido / netOperating (em horas)
            const netOperatingHours = netOperating / 60;
            const txReal = (netOperatingHours > 0 && volumeReal > 0) ? (volumeReal / netOperatingHours) : 0;

            // ADTX = TX_REAL / TX_THEORY (maior taxa = melhor performance)
            ADTX = BC.TX_THEORY > 0 ? (txReal / BC.TX_THEORY) : 0;
            ADFN = 0; // Não usado para Pátio

            perfFinal = UF * ADTX; // Pátio: sem AVOL
        } else {
            // Máquinas: usa ADFN original
            const totalVolReal = p.wetCharge;
            const totalVolTheory = BUSINESS_CONSTANTS.FN_THEORY * BUSINESS_CONSTANTS.VOL_THEORY;
            AVOL = totalVolTheory > 0 ? (totalVolReal / totalVolTheory) : 0;
            UF = operating > 0 ? (netOperating / operating) : 0;

            const cycleReal = p.ovens > 0 ? (netOperating / p.ovens) : 0;
            ADFN = cycleReal > 0 ? (cycleTheory / cycleReal) : 0;
            ADTX = 0; // Não usado para Máquinas

            perfFinal = AVOL * UF * ADFN;
        }

        const avail = loading > 0 ? (operating / loading) : 0;
        const qual = isPatio ? 1 : (p.yield / 100); // Pátio sempre 100%
        const oee = avail * perfFinal * qual;

        results.push({
            date: dateKey, day: formatDateDisplay(dateKey),
            calendar, loading, operating, lossDisp, lossUtil,
            oee, avail, perf: perfFinal, qual,
            ovens: p.ovens, yield: isPatio ? 100 : p.yield, realCoke: p.realCoke, water: p.water, wetCharge: p.wetCharge,
            failureLoss, extMaint, outsideMaint, shiftChange, opsLoss,
            targetMaint: TARGET_MAINT_MINS, usedMaint: totalUsedMaint, loadingMins, excessShift,
            AVOL, UF, ADFN, ADTX, netOperating, areaMode
        });
    });

    const grouped = {};
    results.forEach(day => {
        const { key, label } = getAggregationKey(day.date, aggregation);
        if (!grouped[key]) {
            grouped[key] = {
                key, label,
                calendar: 0, loading: 0, operating: 0, netOperating: 0, lossDisp: 0, lossUtil: 0,
                ovens: 0, wetCharge: 0, yieldSum: 0, yieldCount: 0, days: 0, water: 0,
                failureLoss: 0, extMaint: 0, outsideMaint: 0, shiftChange: 0, opsLoss: 0, excessShift: 0,
                totalUsedMaint: 0, loadingMins: 0
            };
        }
        const g = grouped[key];
        g.calendar += day.calendar || 0;
        g.loading += day.loading; g.operating += day.operating; g.netOperating += day.netOperating;
        g.lossDisp += day.lossDisp; g.lossUtil += day.lossUtil;
        g.ovens += day.ovens; g.wetCharge += day.wetCharge;
        if (day.yield > 0) { g.yieldSum += day.yield; g.yieldCount++; }
        g.days++; g.water += day.water;
        g.failureLoss += day.failureLoss; g.extMaint += day.extMaint; g.outsideMaint += day.outsideMaint;
        g.shiftChange += day.shiftChange; g.excessShift += day.excessShift; g.opsLoss += day.opsLoss;
        g.totalUsedMaint += day.usedMaint; g.loadingMins += day.loadingMins;
    });

    let finalResults = Object.values(grouped).map(g => {
        const avail = g.loading > 0 ? (g.operating / g.loading) : 0;

        let AVOL, UF, ADFN, ADTX, perf, qual;

        if (isPatio) {
            // Pátio: usa VOL_META e ADTX
            // VOL_META é meta DIÁRIA, então para agregação multiplica pelo número de dias
            const totalVolMeta = BC.VOL_META * g.days;
            AVOL = (totalVolMeta > 0 && g.wetCharge > 0) ? (g.wetCharge / totalVolMeta) : 0;
            UF = g.operating > 0 ? (g.netOperating / g.operating) : 0;

            const netOperatingHours = g.netOperating / 60;
            const txReal = (netOperatingHours > 0 && g.wetCharge > 0) ? (g.wetCharge / netOperatingHours) : 0;
            ADTX = BC.TX_THEORY > 0 ? (txReal / BC.TX_THEORY) : 0;
            ADFN = 0;

            perf = UF * ADTX; // Pátio: sem AVOL
            qual = 1; // Pátio sempre 100%
        } else {
            // Máquinas: usa FN_THEORY/VOL_THEORY e ADFN
            const totalVolTheory = g.days * BUSINESS_CONSTANTS.FN_THEORY * BUSINESS_CONSTANTS.VOL_THEORY;
            AVOL = totalVolTheory > 0 ? (g.wetCharge / totalVolTheory) : 0;
            UF = g.operating > 0 ? (g.netOperating / g.operating) : 0;

            const cycleRealAgg = g.ovens > 0 ? (g.netOperating / g.ovens) : 0;
            ADFN = cycleRealAgg > 0 ? (cycleTheory / cycleRealAgg) : 0;
            ADTX = 0;

            perf = AVOL * UF * ADFN;
            const avgYield = g.yieldCount > 0 ? (g.yieldSum / g.yieldCount) : 0;
            qual = avgYield / 100;
        }

        const oee = avail * perf * qual;

        return {
            ...g,
            oee: parseFloat((oee * 100).toFixed(1)),
            avail: parseFloat((avail * 100).toFixed(1)),
            perf: parseFloat((perf * 100).toFixed(1)),
            qual: parseFloat((qual * 100).toFixed(2)),
            AVOL, UF, ADFN, ADTX, netOperating: g.netOperating
        };
    });

    finalResults.sort((a, b) => a.key.localeCompare(b.key));
    let accDisp = 0; let accUtil = 0;
    finalResults = finalResults.map(item => {
        accDisp += item.lossDisp; accUtil += item.lossUtil;
        return { ...item, accLossDisp: accDisp, accLossUtil: accUtil };
    });

    return finalResults;
};

export const calculateDashboardAggregates = (calculatedData, rawData, dateRange, filterSelection, areaMode = 'maquinas') => {
    // [CÓDIGO calculateDashboardAggregates COMPLETO]
    const dataToAggregate = filterSelection
        ? calculatedData.filter(d => d.key === filterSelection)
        : calculatedData;

    if (dataToAggregate.length === 0) return null;

    const isPatio = areaMode === 'patio';
    const BC = isPatio ? BUSINESS_CONSTANTS_PATIO : BUSINESS_CONSTANTS;

    const sum = (key) => dataToAggregate.reduce((a, b) => a + (b[key] || 0), 0);
    const totalDays = sum('days');
    const totalLoading = sum('loading');
    const totalOperating = sum('operating');
    const totalNetOperating = sum('netOperating');
    const totalWetCharge = sum('wetCharge');
    const totalYieldSum = sum('yieldSum');
    const totalYieldCount = sum('yieldCount');
    const totalOvens = sum('ovens');

    let AVOL_Global, UF_Global, ADFN_Global, ADTX_Global, perfGlobal, qualGlobal;

    if (isPatio) {
        // Pátio: usa VOL_META e ADTX
        // VOL_META é meta DIÁRIA, então para acumulado multiplica pelo número de dias
        const totalVolMeta = BC.VOL_META * totalDays;
        AVOL_Global = (totalVolMeta > 0 && totalWetCharge > 0) ? (totalWetCharge / totalVolMeta) : 0;
        UF_Global = totalOperating > 0 ? (totalNetOperating / totalOperating) : 0;

        const netOperatingHours = totalNetOperating / 60;
        const txReal = (netOperatingHours > 0 && totalWetCharge > 0) ? (totalWetCharge / netOperatingHours) : 0;
        ADTX_Global = BC.TX_THEORY > 0 ? (txReal / BC.TX_THEORY) : 0;
        ADFN_Global = 0;

        perfGlobal = UF_Global * ADTX_Global; // Pátio: sem AVOL
        qualGlobal = 1; // Pátio sempre 100%
    } else {
        // Máquinas: usa FN_THEORY/VOL_THEORY e ADFN
        const timeAvailableTheory = BC.TC_META - BC.SL_THEORY;
        const cycleTheory = (timeAvailableTheory * 60) / BC.FN_THEORY;
        const cycleRealGlobal = totalOvens > 0 ? (totalNetOperating / totalOvens) : 0;
        ADFN_Global = cycleRealGlobal > 0 ? (cycleTheory / cycleRealGlobal) : 0;

        const totalVolTheory = totalDays * BC.FN_THEORY * BC.VOL_THEORY;
        AVOL_Global = totalVolTheory > 0 ? (totalWetCharge / totalVolTheory) : 0;
        UF_Global = totalOperating > 0 ? (totalNetOperating / totalOperating) : 0;
        ADTX_Global = 0;

        perfGlobal = AVOL_Global * UF_Global * ADFN_Global;
        const avgYieldGlobal = totalYieldCount > 0 ? (totalYieldSum / totalYieldCount) : 0;
        qualGlobal = avgYieldGlobal / 100;
    }

    const availGlobal = totalLoading > 0 ? (totalOperating / totalLoading) : 0;
    const oeeGlobal = availGlobal * perfGlobal * qualGlobal;

    const targetOvens = isPatio ? 0 : BUSINESS_CONSTANTS.FN_META * totalDays;
    const ritmoMin = totalOvens > 0 ? (totalLoading / totalOvens) : 0;
    const targetShiftChange = isPatio ? 0 : totalDays * 3 * 60;

    const checkDays = new Set();
    rawData.stops.forEach(s => {
        if (s.dateStr < dateRange.start || s.dateStr > dateRange.end) return;
        checkDays.add(s.dateStr);
    });

    // ========= BRIDGE PÁTIO: Calcular metas por dia da semana =========
    let patioBridgeMeta = null;
    let patioBridgeReal = null;

    if (isPatio) {
        // Calcular metas acumuladas considerando dia da semana
        let totalPPM = 0;   // Paradas Programadas Meta acumulada
        let totalSLM = 0;   // Schedule Loss Meta acumulada
        let totalLTM = 0;   // Loading Time Meta acumulada
        let totalTLM = 0;   // Tempo Líquido Meta acumulado
        let totalTLIQxDay = 0; // Soma de TLIQ * dia (para média ponderada)
        let thursdays = 0;
        let otherDays = 0;

        // Usa as datas do período selecionado
        const startDate = new Date(dateRange.start + 'T12:00:00');
        const endDate = new Date(dateRange.end + 'T12:00:00');

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay(); // 0=domingo, 4=quinta
            const isThursday = dayOfWeek === 4;

            const PPM_day = isThursday ? BC.PPM_THURSDAY : BC.PPM_OTHER;
            const SLM_day = PPM_day + BC.TTM;
            const LTM_day = BC.TC_META - PPM_day - BC.TTM;
            const TLM_day = LTM_day - BC.PNPM - BC.POM;
            const TLIQ_day = BC.VOL_META / TLM_day; // Taxa Líquida Meta do dia

            totalPPM += PPM_day;
            totalSLM += SLM_day;
            totalLTM += LTM_day;
            totalTLM += TLM_day;
            totalTLIQxDay += TLIQ_day;

            if (isThursday) thursdays++;
            else otherDays++;
        }

        const TLIQ_avg = totalTLIQxDay / totalDays; // Taxa Líquida Meta média

        // Valores Reais do período
        const PPR = sum('shiftChange') / 60;  // Paradas Programadas Real (h) - usou shiftChange para PP em Pátio
        const TTR = 0; // Troca de Turno Real - não separado por enquanto
        const SLR = PPR + TTR;
        const PNPR = sum('failureLoss') / 60; // Indisponibilidade Real (h)
        const POR = sum('opsLoss') / 60;      // Perda Operacional Real (h)
        const LTR = (totalDays * BC.TC_META) - SLR;
        const TLR = LTR - PNPR - POR;
        const TLIQR = TLR > 0 ? totalWetCharge / TLR : 0; // Taxa Líquida Real

        patioBridgeMeta = {
            VM: BC.VOL_META * totalDays,      // Volume Meta total
            PPM: totalPPM,                    // Paradas Programadas Meta (h)
            TTM: BC.TTM * totalDays,          // Troca de Turno Meta (h)
            SLM: totalSLM,                    // Schedule Loss Meta (h)
            PNPM: BC.PNPM * totalDays,        // Paradas Não Programadas Meta (h)
            POM: BC.POM * totalDays,          // Perda Operacional Meta (h)
            CC: BC.TC_META * totalDays,       // Ciclo Calendário (h)
            LTM: totalLTM,                    // Loading Time Meta (h)
            TLM: totalTLM,                    // Tempo Líquido Meta (h)
            TLIQ: TLIQ_avg,                   // Taxa Líquida Meta média (t/h)
            thursdays: thursdays,
            otherDays: otherDays
        };

        patioBridgeReal = {
            VR: totalWetCharge,               // Volume Real
            PPR: PPR,                         // Paradas Programadas Real (h)
            TTR: TTR,                         // Troca de Turno Real (h)
            SLR: SLR,                         // Schedule Loss Real (h)
            PNPR: PNPR,                       // Indisponibilidade Real (h)
            POR: POR,                         // Perda Operacional Real (h)
            LTR: LTR,                         // Loading Time Real (h)
            TLR: TLR,                         // Tempo Líquido Real (h)
            TLIQR: TLIQR                      // Taxa Líquida Real (t/h)
        };

        // ============ CÁLCULO DE METAS DINÂMICAS PARA PÁTIO ============
        // Metas variam com base na proporção de Quintas vs Outros dias

        // DISPONIBILIDADE META = Operating / Loading
        // Operating = Loading - PNPM
        // Loading = CC - SL
        const loadingMeta = patioBridgeMeta.CC - patioBridgeMeta.SLM;
        const operatingMeta = loadingMeta - patioBridgeMeta.PNPM;
        const targetDispPatio = loadingMeta > 0 ? (operatingMeta / loadingMeta) * 100 : 0;

        // PERFORMANCE META = UF × ADTX (sem AVOL)
        // UF = NetOperating / Operating = TLM / operatingMeta
        // ADTX = TX_META / TX_TEORICO = TLIQ / TX_THEORY
        const ufMeta = operatingMeta > 0 ? (patioBridgeMeta.TLM / operatingMeta) : 0;
        const adtxMeta = patioBridgeMeta.TLIQ / BC.TX_THEORY;
        const targetPerfPatio = (ufMeta * adtxMeta) * 100;

        // QUALIDADE META = 100% (sempre para Pátio)
        const targetQualPatio = BC.QA_META;

        // OEE META = DI × PE × QA
        const targetOeePatio = (targetDispPatio / 100) * (targetPerfPatio / 100) * (targetQualPatio / 100) * 100;

        // Adicionar targets ao patioBridgeMeta
        patioBridgeMeta.targetDI = parseFloat(targetDispPatio.toFixed(2));
        patioBridgeMeta.targetPE = parseFloat(targetPerfPatio.toFixed(2));
        patioBridgeMeta.targetQA = parseFloat(targetQualPatio.toFixed(2));
        patioBridgeMeta.targetOEE = parseFloat(targetOeePatio.toFixed(2));
        patioBridgeMeta.targetOEE = parseFloat(targetOeePatio.toFixed(2));

        // ========= PÁTIO: Calcular metas escalonadas (Média Ponderada) =========
        // P1: Jan-Mar (34.93%) | P2: Abr-Jul (35.54%) | P3: Ago-Dez (36.17%)

        const startDateP = new Date(dateRange.start + 'T12:00:00');
        const endDateP = new Date(dateRange.end + 'T12:00:00');

        let sumOEE_P = 0, sumAVAIL_P = 0, sumPERF_P = 0, sumQUAL_P = 0;
        let daysCount_P = 0;

        for (let d = new Date(startDateP); d <= endDateP; d.setDate(d.getDate() + 1)) {
            const month = d.getMonth(); // 0-11
            let targetSet = null;

            if (month <= 2) targetSet = STEPPED_TARGETS_PATIO.P1;       // Jan-Mar
            else if (month <= 6) targetSet = STEPPED_TARGETS_PATIO.P2;  // Abr-Jul (até mês 6 - Julho)
            else targetSet = STEPPED_TARGETS_PATIO.P3;                  // Ago-Dez

            sumOEE_P += targetSet.OEE;
            sumAVAIL_P += targetSet.AVAIL;
            sumPERF_P += targetSet.PERF;
            sumQUAL_P += targetSet.QUAL;
            daysCount_P++;
        }

        if (daysCount_P > 0) {
            patioBridgeMeta.steppedPatioTargets = {
                OEE: parseFloat((sumOEE_P / daysCount_P).toFixed(2)),
                AVAIL: parseFloat((sumAVAIL_P / daysCount_P).toFixed(2)),
                PERF: parseFloat((sumPERF_P / daysCount_P).toFixed(2)),
                QUAL: parseFloat((sumQUAL_P / daysCount_P).toFixed(2))
            };
        }
    }

    // ========= MÁQUINAS: Calcular metas escalonadas (Média Ponderada) =========
    let steppedMachineTargets = null;
    if (!isPatio) {
        // Jan-Mar: Q1 (46.46%) | Abr-Jun: Q2 (47.69%) | Jul-Dez: H2 (48.95%)

        const startDate = new Date(dateRange.start + 'T12:00:00');
        const endDate = new Date(dateRange.end + 'T12:00:00');

        let sumOEE = 0, sumAVAIL = 0, sumPERF = 0, sumQUAL = 0;
        let daysCount = 0;

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const month = d.getMonth(); // 0-11
            let targetSet = null;

            if (month <= 2) targetSet = STEPPED_TARGETS_MAQUINAS.Q1;      // Jan-Mar
            else if (month <= 5) targetSet = STEPPED_TARGETS_MAQUINAS.Q2; // Abr-Jun
            else targetSet = STEPPED_TARGETS_MAQUINAS.H2;                 // Jul-Dez

            sumOEE += targetSet.OEE;
            sumAVAIL += targetSet.AVAIL;
            sumPERF += targetSet.PERF;
            sumQUAL += targetSet.QUAL;
            daysCount++;
        }

        if (daysCount > 0) {
            steppedMachineTargets = {
                OEE: parseFloat((sumOEE / daysCount).toFixed(2)),
                AVAIL: parseFloat((sumAVAIL / daysCount).toFixed(2)),
                PERF: parseFloat((sumPERF / daysCount).toFixed(2)),
                QUAL: parseFloat((sumQUAL / daysCount).toFixed(2))
            };
        }
    }

    let winStartOkNorte = 0, winStartOkSul = 0;
    let winEndOkNorte = 0, winEndOkSul = 0;
    let winInsideOkNorte = 0, winInsideOkSul = 0;
    let winDurPctNorteSum = 0, winDurPctSulSum = 0;
    let winFreqScoreSum = 0;
    let daysWithStopNorte = 0, daysWithStopSul = 0;

    // Novos contadores (Janelas 5h e Simultâneas)
    let count5hNorte = 0, count5hSul = 0;
    let countSimultaneous = 0, countSimultaneous5h = 0;

    // Contadores PÁTIO: Quintas vs Outros
    let patioDaysWithStopThursday = 0, patioDaysWithStopOther = 0;
    let patioInsideOkThursday = 0, patioInsideOkOther = 0;
    let patioStartOkThursday = 0, patioStartOkOther = 0;
    let patioEndOkThursday = 0, patioEndOkOther = 0;

    Array.from(checkDays).forEach(dateStr => {
        const dayStops = rawData.stops.filter(s => s.dateStr === dateStr);
        let hasNorte = false, hasSul = false;
        let minStartNorte = null, maxEndNorte = null;
        let minStartSul = null, maxEndSul = null;
        let durNorte = 0, durSul = 0;

        // Para Pátio: verificar se é quinta-feira
        const dateObj = new Date(dateStr + 'T12:00:00');
        const isThursday = dateObj.getDay() === 4;

        // Para Pátio: verificar se houve alguma parada programada
        let hasPatioStop = false;
        let patioMinStart = null, patioMaxEnd = null;

        dayStops.forEach(s => {
            const bateriaLower = (s.bateria || '').toLowerCase();
            if (bateriaLower.includes('janela a/b') || bateriaLower.includes('janela c/d')) {
                const quenchLower = (s.quench || '').toLowerCase();
                const isNorte = quenchLower.includes('norte') || quenchLower.includes('north');
                if (isNorte) {
                    hasNorte = true; durNorte += s.duration;
                    if (!minStartNorte || s.start < minStartNorte) minStartNorte = s.start;
                    if (!maxEndNorte || s.end > maxEndNorte) maxEndNorte = s.end;
                } else {
                    hasSul = true; durSul += s.duration;
                    if (!minStartSul || s.start < minStartSul) minStartSul = s.start;
                    if (!maxEndSul || s.end > maxEndSul) maxEndSul = s.end;
                }
            }

            // Pátio: verificar paradas programadas (preventivas)
            if (isPatio) {
                const parouSim = (s.parou || '').toLowerCase().includes('sim');
                const isPreventiva = (s.tipo || '').toLowerCase().includes('prevent');
                if (parouSim && isPreventiva) {
                    hasPatioStop = true;
                    if (!patioMinStart || s.start < patioMinStart) patioMinStart = s.start;
                    if (!patioMaxEnd || s.end > patioMaxEnd) patioMaxEnd = s.end;
                }
            }
        });

        // Tolerância para 5h = 290 min (4h50)
        const THRESHOLD_5H = 290;

        // Contabilizar Janelas de 5h
        if (hasNorte && durNorte >= THRESHOLD_5H) count5hNorte++;
        if (hasSul && durSul >= THRESHOLD_5H) count5hSul++;

        // Contabilizar Simultâneas
        if (hasNorte && hasSul) {
            countSimultaneous++;
            if (durNorte >= THRESHOLD_5H && durSul >= THRESHOLD_5H) countSimultaneous5h++;
        }

        const checkTime = (dateObj, targetH, targetM, tolerance) => {
            if (!dateObj) return false;
            const h = dateObj.getHours(); const m = dateObj.getMinutes();
            const diff = (h * 60 + m) - (targetH * 60 + targetM);
            return Math.abs(diff) <= tolerance;
        };
        const checkInside = (startObj, endObj) => {
            if (!startObj || !endObj) return false;
            const sVal = startObj.getHours() * 60 + startObj.getMinutes();
            const eVal = endObj.getHours() * 60 + endObj.getMinutes();
            return sVal >= (8 * 60 - 15) && eVal <= (17 * 60 + 15);
        };

        // Função específica para Pátio: dentro do horário (Qui: 8-16h, Outros: 8-12h)
        const checkInsidePatio = (startObj, endObj, thursday) => {
            if (!startObj || !endObj) return false;
            const sVal = startObj.getHours() * 60 + startObj.getMinutes();
            const eVal = endObj.getHours() * 60 + endObj.getMinutes();
            const endLimit = thursday ? 16 * 60 : 12 * 60;
            return sVal >= (8 * 60 - 15) && eVal <= (endLimit + 15);
        };

        if (hasNorte) {
            daysWithStopNorte++;
            if (checkTime(minStartNorte, 8, 0, 15)) winStartOkNorte++;
            if (checkTime(maxEndNorte, 13, 0, 15)) winEndOkNorte++;
            if (checkInside(minStartNorte, maxEndNorte)) winInsideOkNorte++;
        }
        winDurPctNorteSum += Math.min(100, (durNorte / 300) * 100);

        if (hasSul) {
            daysWithStopSul++;
            if (checkTime(minStartSul, 8, 0, 15)) winStartOkSul++;
            if (checkTime(maxEndSul, 13, 0, 15)) winEndOkSul++;
            if (checkInside(minStartSul, maxEndSul)) winInsideOkSul++;
        }
        winDurPctSulSum += Math.min(100, (durSul / 300) * 100);

        if (hasNorte || hasSul) {
            if (hasNorte && hasSul) winFreqScoreSum += 100;
            else winFreqScoreSum += 50;
        }

        // =========== PÁTIO: Contabilizar por Quinta vs Outros ===========
        if (isPatio && hasPatioStop) {
            if (isThursday) {
                patioDaysWithStopThursday++;
                if (checkTime(patioMinStart, 8, 0, 15)) patioStartOkThursday++;
                if (checkTime(patioMaxEnd, 16, 0, 15)) patioEndOkThursday++;
                if (checkInsidePatio(patioMinStart, patioMaxEnd, true)) patioInsideOkThursday++;
            } else {
                patioDaysWithStopOther++;
                if (checkTime(patioMinStart, 8, 0, 15)) patioStartOkOther++;
                if (checkTime(patioMaxEnd, 12, 0, 15)) patioEndOkOther++;
                if (checkInsidePatio(patioMinStart, patioMaxEnd, false)) patioInsideOkOther++;
            }
        }
    });

    const totalDaysWindow = Math.max(1, checkDays.size);

    return {
        oee: (oeeGlobal * 100).toFixed(1),
        avail: (availGlobal * 100).toFixed(1),
        perf: (perfGlobal * 100).toFixed(1),
        qual: (qualGlobal * 100).toFixed(2),
        water: sum('water').toFixed(0),
        ovensNumeric: totalOvens,
        ovensDisplay: totalOvens.toLocaleString('pt-BR'),
        targetOvens: targetOvens,
        lossDispH: (sum('lossDisp') / 60).toFixed(1),
        lossUtilH: (sum('lossUtil') / 60).toFixed(1),
        lossFailH: (sum('failureLoss') / 60).toFixed(1),
        ritmoDisplay: formatDuration(ritmoMin),
        ritmoMin: ritmoMin,
        failLossMins: sum('failureLoss'),
        schedMaintLossMins: sum('extMaint') + sum('outsideMaint'),
        opsLossMins: sum('opsLoss'),
        shiftLossMins: sum('shiftChange'),
        targetMaintMins: totalDays * 10 * 60,
        usedMaintMins: sum('totalUsedMaint'),
        loadingMins: sum('loadingMins'),
        extMaintMins: sum('extMaint'),
        outsideMaintMins: sum('outsideMaint'),
        targetShiftChange: targetShiftChange / 60,
        totalCalendarTime: totalDays * 48 * 60,

        // Campos adicionais para BridgeChart Pátio
        totalDays: totalDays,
        totalWetCharge: totalWetCharge,
        operatingMins: totalOperating,
        netOperatingMins: totalNetOperating,

        windowTotalDays: checkDays.size,
        daysWithStopNorte, daysWithStopSul,
        daysWithoutStopNorte: checkDays.size - daysWithStopNorte,
        daysWithoutStopSul: checkDays.size - daysWithStopSul,
        winStartOkNorte, winStartOkSul, winEndOkNorte, winEndOkSul, winInsideOkNorte, winInsideOkSul,
        windowAvgDurNorte: (winDurPctNorteSum / totalDaysWindow).toFixed(0),
        windowAvgDurSul: (winDurPctSulSum / totalDaysWindow).toFixed(0),
        windowFreqScore: (winFreqScoreSum / totalDaysWindow).toFixed(0),

        // Novos Campos
        count5hNorte, count5hSul, countSimultaneous, countSimultaneous5h,
        ritmoMetaMin: BC.FN_THEORY, // Adicionando ritmo meta (geralmente 10)

        // ============ PÁTIO: Checklist de Janela ============
        patioDaysWithStop: patioDaysWithStopThursday + patioDaysWithStopOther,
        patioDaysWithStopThursday,
        patioDaysWithStopOther,
        patioInsideOkThursday,
        patioInsideOkOther,
        patioStartOkThursday,
        patioStartOkOther,
        patioEndOkThursday,
        patioEndOkOther,

        // ============ BRIDGE CHART MÁQUINAS - NOVA LÓGICA ============
        // Constantes calculadas (Metas derivadas) - PROPORCIONAIS AO PERÍODO
        bridgeMeta: {
            FM: BC.FN_META * totalDays,                               // Fornos Meta = 160 * dias
            PPM: 10 * 60 * totalDays,                                 // Paradas Programadas Meta = 10h * dias
            TTM: 3 * 60 * totalDays,                                  // Troca de Turno Meta = 3h * dias
            PNPM: BC.CO_META * 60 * totalDays,                        // Paradas Não Programadas Meta = 3h * dias
            POM: BC.STP_META * 60 * totalDays,                        // Perda Operacional Meta = 2h * dias
            CC: BC.TC_META * 60 * totalDays,                          // Ciclo Calendário = 48h * dias
            LT: (BC.TC_META - 10 - 3) * 60 * totalDays,               // Loading Time Meta = 35h * dias
            TL: (BC.TC_META - 10 - 3 - BC.CO_META - BC.STP_META) * 60 * totalDays, // Tempo Líquido Meta = 30h * dias
            FFL: ((BC.TC_META - 10 - 3 - BC.CO_META - BC.STP_META) * 60) / BC.FN_META, // 11.25 min/forno (NÃO muda com dias)
            DM: ((BC.TC_META - 10 - 3) * 60 - BC.CO_META * 60) / ((BC.TC_META - 10 - 3) * 60), // 91.43% (percentual)
            UM: (((BC.TC_META - 10 - 3 - BC.CO_META) * 60) - BC.STP_META * 60) / ((BC.TC_META - 10 - 3 - BC.CO_META) * 60) // 93.75% (percentual)
        },
        // Valores Reais agregados para Bridge
        bridgeReal: {
            FR: totalOvens,                                          // Fornos Real
            PPR: sum('totalUsedMaint'),                              // Paradas Programadas Real (Janelas usadas)
            TTR: sum('shiftChange'),                                 // Troca de Turno Real
            PNPR: sum('failureLoss') + sum('extMaint') + sum('outsideMaint'), // Paradas Não Programadas Real
            POR: sum('opsLoss') + sum('excessShift'),                // Perda Operacional Real
            LTR: totalDays * BC.TC_META * 60 - sum('totalUsedMaint') - sum('shiftChange'), // Loading Time Real
            TLR: totalNetOperating                                   // Tempo Líquido Real
        },

        // ============ BRIDGE CHART PÁTIO ============
        patioBridgeMeta: patioBridgeMeta,
        patioBridgeReal: patioBridgeReal,
        steppedMachineTargets, // Retorna as metas escalonadas para Máquinas
        patioWindowStats: {
            patioDaysWithStop: patioDaysWithStopThursday + patioDaysWithStopOther,
            patioDaysWithStopThursday,
            patioDaysWithStopOther,
            patioInsideOkThursday,
            patioInsideOkOther,
            patioStartOkThursday,
            patioStartOkOther,
            patioEndOkThursday,
            patioEndOkOther,
        }
    };
};

export const calculateTreeStats = (calculatedData, filterSelection) => {
    // [CÓDIGO calculateTreeStats COMPLETO]
    const dataToUse = filterSelection ? calculatedData.filter(d => d.key === filterSelection) : calculatedData;
    if (dataToUse.length === 0) return null;

    const sum = (k) => dataToUse.reduce((a, b) => a + b[k], 0);
    const loading = sum('loading');
    const operating = sum('operating');
    const netOperating = sum('netOperating');
    const failLoss = sum('failureLoss');
    const schedMaintLoss = sum('extMaint') + sum('outsideMaint');
    const shiftLoss = sum('excessShift');
    const opsLossSum = sum('opsLoss');
    const totalOvens = sum('ovens');
    const totalVolume = sum('wetCharge');
    const avgCycle = totalOvens > 0 ? (operating / totalOvens).toFixed(2) : "0.00";
    const netCycle = totalOvens > 0 ? (netOperating / totalOvens).toFixed(2) : "0.00";
    const avgYield = dataToUse.length > 0 ? (dataToUse.reduce((a, b) => a + b.qual, 0) / dataToUse.length) / 100 : 0;
    const fullyProductive = netOperating * avgYield;
    const lossQualityTime = netOperating - fullyProductive;
    const targetLossDisp = loading * (1 - (TARGETS.AVAIL / 100));
    const targetLossQual = netOperating * (1 - (TARGETS.QUAL / 100));

    return {
        loading: (loading / 60).toFixed(1),
        operating: (operating / 60).toFixed(1),
        netOperating: (netOperating / 60).toFixed(1),
        fullyProductive: (fullyProductive / 60).toFixed(1),
        lossDisp: (sum('lossDisp') / 60).toFixed(1),
        failLoss: { val: (failLoss / 60).toFixed(1), target: (targetLossDisp / 60).toFixed(1) },
        schedMaintLoss: { val: (schedMaintLoss / 60).toFixed(1), target: 0 },
        lossPerf: (sum('lossUtil') / 60).toFixed(1),
        shiftLoss: { val: (shiftLoss / 60).toFixed(1), target: 0 },
        opsLoss: { val: (opsLossSum / 60).toFixed(1), target: 0 },
        rhythmLoss: { val: 0, target: 0 },
        lossQual: { val: (lossQualityTime / 60).toFixed(1), target: (targetLossQual / 60).toFixed(1) },
        totalOvens, totalVolume: totalVolume.toFixed(0), avgCycle, netCycle
    };
};

export const calculateJackKnifeData = (rawData, dateRange) => {
    // [CÓDIGO calculateJackKnifeData COMPLETO]
    if (!rawData.stops || rawData.stops.length === 0) return { equip: [], comp: [], noise: [] };
    const validStops = rawData.stops.filter(s => {
        if (s.dateStr < dateRange.start || s.dateStr > dateRange.end) return false;
        const areaLower = s.area.toLowerCase();
        const tipoLower = (s.tipo || '').toLowerCase();
        const isMaint = areaLower.includes('manut') || tipoLower.includes('corretiva') || tipoLower.includes('quebra');
        const isJanela = (s.bateria || '').toLowerCase().includes('janela');
        return isMaint && !isJanela && s.parou.includes('sim');
    });

    const equipMap = {};
    validStops.forEach(s => {
        const equip = s.equip || "Sem Tag";
        if (!equipMap[equip]) equipMap[equip] = { name: equip, frequency: 0, totalDuration: 0 };
        equipMap[equip].frequency += 1;
        equipMap[equip].totalDuration += s.duration;
    });

    let equipData = Object.values(equipMap).map(d => ({ ...d, mttr: d.totalDuration / d.frequency }));

    const compMap = {};
    validStops.forEach(s => {
        const equip = s.equip || "Sem Tag";
        const comp = s.comp || "Geral";
        const key = `${equip} | ${comp}`;
        if (!compMap[key]) compMap[key] = { name: key, compName: comp, parentEquip: equip, frequency: 0, totalDuration: 0 };
        compMap[key].frequency += 1;
        compMap[key].totalDuration += s.duration;
    });

    let compData = Object.values(compMap).map(d => ({ ...d, mttr: d.totalDuration / d.frequency }));
    const noiseThresholdMTTR = 30;
    const noiseList = [];
    const cleanEquipData = [];

    equipData.forEach(d => {
        if (d.frequency === 1 && d.mttr < noiseThresholdMTTR) noiseList.push(d);
        else cleanEquipData.push(d);
    });

    return { equip: cleanEquipData, comp: compData, noise: noiseList };
};

export const calculateReliabilityTrend = (rawData, dateRange, aggregation) => {
    // [CÓDIGO calculateReliabilityTrend COMPLETO]
    const validStops = rawData.stops.filter(s => {
        if (s.dateStr < dateRange.start || s.dateStr > dateRange.end) return false;
        const areaLower = s.area.toLowerCase();
        const tipoLower = (s.tipo || '').toLowerCase();
        const isMaint = areaLower.includes('manut') || tipoLower.includes('corretiva') || tipoLower.includes('quebra');
        const isJanela = (s.bateria || '').toLowerCase().includes('janela');
        return isMaint && !isJanela && s.parou.includes('sim');
    });

    const trendMap = {};

    validStops.forEach(s => {
        const { key, label } = getAggregationKey(s.dateStr, aggregation);

        if (!trendMap[key]) {
            trendMap[key] = {
                key,
                label,
                totalDuration: 0,
                eventCount: 0,
                loadingTime: 0
            };
        }

        trendMap[key].totalDuration += s.duration;
        trendMap[key].eventCount += 1;
    });

    const oeeData = calculateOEEData(rawData, dateRange, aggregation);
    const oeeDataMap = oeeData.reduce((acc, curr) => {
        acc[curr.key] = curr;
        return acc;
    }, {});

    let finalTrendData = Object.values(trendMap).map(d => {
        const oeePeriodData = oeeDataMap[d.key];
        const totalLoadingMins = oeePeriodData ? oeePeriodData.loading : 0;

        const mttr = d.eventCount > 0 ? (d.totalDuration / d.eventCount) : 0;

        const totalUptime = totalLoadingMins - d.totalDuration;
        const mtbf = d.eventCount > 0 ? (totalUptime / d.eventCount) : 0;

        return {
            key: d.key,
            label: d.label,
            mttr: parseFloat(mttr.toFixed(1)),
            mtbf: parseFloat((mtbf / 60).toFixed(1)),
            eventCount: d.eventCount
        };
    }).filter(d => d.mtbf > 0 || d.mttr > 0);

    return finalTrendData.sort((a, b) => a.key.localeCompare(b.key));
};

export const calculateWeibullData = (rawData, equipmentFilter) => {
    // [CÓDIGO calculateWeibullData COMPLETO]
    if (!rawData.stops || rawData.stops.length === 0 || !equipmentFilter) {
        return { data: [], ttfs: [], status: 'Selecione o equipamento', parameters: {} };
    }

    const validStops = rawData.stops.filter(s => {
        const areaLower = s.area.toLowerCase();
        const tipoLower = (s.tipo || '').toLowerCase();
        const isMaint = areaLower.includes('manut') || tipoLower.includes('corretiva') || tipoLower.includes('quebra');
        const isJanela = (s.bateria || '').toLowerCase().includes('janela');

        return isMaint && !isJanela && s.parou.includes('sim') && s.equip === equipmentFilter;
    });

    const events = validStops.sort((a, b) => a.start.getTime() - b.start.getTime());
    let ttfs = [];
    let previousEndTime = null;

    if (events.length > 0) {
        const allDates = Object.keys(rawData.prod).sort();
        const dataStartDate = allDates.length > 0 ? parseDate(allDates[0]) : null;

        if (dataStartDate) {
            previousEndTime = dataStartDate;
        }

        events.forEach(currentEvent => {
            if (previousEndTime && currentEvent.start > previousEndTime) {
                const ttf_ms = currentEvent.start.getTime() - previousEndTime.getTime();
                const ttf_hours = ttf_ms / (1000 * 60 * 60);

                if (ttf_hours > 0.1) {
                    ttfs.push(ttf_hours);
                }
            }
            previousEndTime = currentEvent.end;
        });
    }

    if (ttfs.length < 3) {
        return { data: [], ttfs, status: 'Mínimo de 3 falhas não programadas é necessário para análise de Weibull.', numFailures: ttfs.length, parameters: {} };
    }

    // 2. Cálculo do Rank de Mediana (Median Rank)
    ttfs.sort((a, b) => a - b);
    const N = ttfs.length;

    const weibullData = ttfs.map((ttf, i) => {
        const rank = i + 1;
        const medianRank = (rank - 0.3) / (N + 0.4);

        // Transformações Log-Log
        const yValue = Math.log(Math.log(1 / (1 - medianRank)));
        const xValue = Math.log(ttf);

        return {
            ttf: ttf,
            medianRank: medianRank,
            x: xValue,
            y: yValue,
            rank: rank
        };
    });

    // 3. Cálculo dos Parâmetros de Weibull (Regressão Linear)
    const { slope, intercept } = calculateLinearRegression(weibullData);

    const beta = parseFloat(slope.toFixed(3)); // Beta (Parâmetro de Forma)
    const eta = parseFloat(Math.exp(-intercept / beta).toFixed(3)); // Eta (Vida Característica)

    // 4. Calcular a linha de regressão para plotagem no gráfico
    const lineData = [
        { x: weibullData[0].x, yLine: slope * weibullData[0].x + intercept },
        { x: weibullData[N - 1].x, yLine: slope * weibullData[N - 1].x + intercept }
    ];

    let interpretation = 'Análise não disponível (Beta Indefinido).';
    if (beta > 0) {
        if (beta < 1) {
            interpretation = "Desgaste Inicial (Infant Mortality) - Falhas mais prováveis no início da vida útil. Indicação: Reforçar inspeção inicial, melhorar o controle de qualidade ou quebra de componentes por erro de montagem.";
        } else if (beta >= 1 && beta <= 1.5) { // Ajuste para B=1 (Constante) e início de desgaste
            interpretation = "Taxa de Falha Constante (Aleatória) - A taxa de falha é constante (distribuição exponencial). A vida útil é imprevisível. Indicação: Reforçar manutenção preventiva (por tempo) e reduzir o estresse operacional.";
        } else if (beta > 1.5) {
            interpretation = "Desgaste Acelerado (Wear Out) - Falhas mais prováveis no final da vida útil. Indicação: Trocar componentes por manutenção preditiva/planejada no tempo 'eta' (vida característica).";
        }
    }


    return {
        data: weibullData,
        ttfs,
        status: `Análise gerada com ${N} falhas.`,
        numFailures: N,
        parameters: { beta, eta, interpretation },
        lineData: lineData
    };
};

export const calculateParetoData = (rawData, dateRange, filterSelection, aggregation, lossFilter, equipmentFilter) => {
    // [CÓDIGO calculateParetoData COMPLETO]
    if (!rawData.stops || rawData.stops.length === 0) return { topEquipmentsData: [], topCausesData: [] };
    const activeStops = rawData.stops.filter(s => {
        if (s.dateStr < dateRange.start || s.dateStr > dateRange.end) return false;
        if (filterSelection && s.dateStr !== filterSelection && getAggregationKey(s.dateStr, aggregation).key !== filterSelection) return false;
        return true;
    });

    const reasonsEquip = {};
    const reasonsCause = {};

    activeStops.forEach(s => {
        const parouSim = (s.parou || '').toLowerCase().includes('sim');
        const bateriaLower = (s.bateria || '').toLowerCase();
        const isJanela = bateriaLower.includes('janela a/b') || bateriaLower.includes('janela c/d');

        // PÁTIO/ENVIO: incluir se o processo for Pátio/Envio
        const processoLower = (s.processo || '').toLowerCase();
        const isPatio = processoLower.includes('patio') || processoLower.includes('pátio') || processoLower.includes('envio');

        // Máquinas: precisa ter parouSim ou isJanela
        // Pátio: incluir TODOS os registros (ignora coluna "parou produção")
        if (!isPatio && !parouSim && !isJanela) return;

        const areaLower = s.area.toLowerCase();
        const tipoLower = (s.tipo || '').toLowerCase();
        const isMaint = areaLower.includes('manut') || tipoLower.includes('corretiva') || tipoLower.includes('quebra');

        // Para Pátio: filtrar por Área Responsável (coluna I)
        // Disponibilidade = Manutenção ou Engenharia
        // Performance = Operação
        if (isPatio) {
            const isDisp = areaLower.includes('manut') || areaLower.includes('engenharia');
            const isPerf = areaLower.includes('produ') || areaLower.includes('opera');
            if (lossFilter === 'availability' && !isDisp) return;
            if (lossFilter === 'performance' && !isPerf) return;
        } else {
            // Para Máquinas: aplicar lógica original
            if (lossFilter === 'availability' && !isMaint && !isJanela) return;
            if (lossFilter === 'performance' && isMaint) return;
        }

        const equipLabel = s.equip && s.equip !== '' ? s.equip : "Sem Tag";
        if (equipmentFilter && s.equip !== equipmentFilter) return;

        reasonsEquip[equipLabel] = (reasonsEquip[equipLabel] || 0) + s.duration;

        let causeLabel = "Não identificado";
        if (s.comp || s.modo) causeLabel = `${s.comp || '?'} - ${s.modo || '?'}`;
        else causeLabel = s.desc || s.tipo || "Geral";

        if (causeLabel.length > 35) causeLabel = causeLabel.substring(0, 35) + '...';
        reasonsCause[causeLabel] = (reasonsCause[causeLabel] || 0) + s.duration;
    });

    const processPareto = (obj) => Object.entries(obj)
        .map(([name, value]) => ({ name, value: Math.round(value) }))
        .sort((a, b) => b.value - a.value).slice(0, 10);

    return { topEquipmentsData: processPareto(reasonsEquip), topCausesData: processPareto(reasonsCause) };
};

export const calculateWindowHoursData = (rawData, dateRange, aggregation) => {
    // Calcula as horas de janela por período para Norte e Sul
    if (!rawData.stops || rawData.stops.length === 0) return [];

    const windowStopsMap = {};

    rawData.stops.forEach(s => {
        if (s.dateStr < dateRange.start || s.dateStr > dateRange.end) return;

        const bateriaLower = (s.bateria || '').toLowerCase();
        const isJanela = bateriaLower.includes('janela a/b') || bateriaLower.includes('janela c/d');
        if (!isJanela) return;

        const { key, label } = getAggregationKey(s.dateStr, aggregation);
        const quenchLower = (s.quench || '').toLowerCase();
        const isNorte = quenchLower.includes('norte') || quenchLower.includes('north');

        if (!windowStopsMap[key]) {
            windowStopsMap[key] = { key, label, minsNorte: 0, minsSul: 0 };
        }

        if (isNorte) {
            windowStopsMap[key].minsNorte += s.duration || 0;
        } else {
            windowStopsMap[key].minsSul += s.duration || 0;
        }
    });

    // Tolerância: 5h = 300 min, tolerância de ±10 min = [290, 310]
    const TARGET_MIN = 290;
    const TARGET_MAX = 310;

    const results = Object.values(windowStopsMap).map(d => {
        const hoursNorte = parseFloat((d.minsNorte / 60).toFixed(2));
        const hoursSul = parseFloat((d.minsSul / 60).toFixed(2));

        // Verde se dentro da tolerância (4h50 - 5h10), vermelho caso contrário ou zerado
        const isOkNorte = d.minsNorte >= TARGET_MIN && d.minsNorte <= TARGET_MAX;
        const isOkSul = d.minsSul >= TARGET_MIN && d.minsSul <= TARGET_MAX;

        return {
            key: d.key,
            label: d.label,
            hoursNorte,
            hoursSul,
            colorNorte: isOkNorte ? '#22c55e' : '#ef4444', // green-500 / red-500
            colorSul: isOkSul ? '#22c55e' : '#ef4444'
        };
    });

    return results.sort((a, b) => a.key.localeCompare(b.key));
};
