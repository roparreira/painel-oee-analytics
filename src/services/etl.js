import { 
    parseDate, getProductionDate, formatDateISO, parseNumber, 
    getMinutesInsideWindow, getAggregationKey, formatDateDisplay, formatDuration
} from '../utils';
import { TARGETS, BUSINESS_CONSTANTS } from '../config';

// --- LEITURA DE ARQUIVOS (INGESTÃO) ---
const readExcelToArray = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                // IMPORTANTE: Removemos 'cellDates' e mantemos 'raw: false' para que a data seja lida como string/número, 
                // e tratada posteriormente pela nossa função parseDate customizada.
                const workbook = window.XLSX.read(data, { type: 'array' }); 
                resolve(workbook);
            } catch (err) { reject(err); }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

export const processFiles = async (fileStop, fileProd) => {
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
        quench: headStop.findIndex(h => h.includes('quench'))
    };
    if (idxS.quench === -1) idxS.quench = 5;

    const cleanStops = [];
    let totalStopDuration = 0;
    let maintenanceDuration = 0;

    for (let i = hIdx + 1; i < rowsStop.length; i++) {
        const r = rowsStop[i];
        if (!r || r.length === 0) continue;

        const valProc = String(r[idxS.proc] || '').trim().toLowerCase();
        if (!valProc.includes('maquina') && !valProc.includes('máquina')) {
            ignored.push({ row: i + 1, reason: `Processo: ${valProc}` }); continue;
        }

        const valParou = String(r[idxS.parou] || '').trim().toLowerCase();
        const start = parseDate(r[idxS.inicio]);
        const end = parseDate(r[idxS.fim]);

        if (!start || !end) { ignored.push({ row: i + 1, reason: `Data Inválida` }); continue; }

        const prodDate = getProductionDate(start);
        const dateStr = formatDateISO(prodDate);
        if (!dateStr) { ignored.push({ row: i + 1, reason: `Erro ISO` }); continue; }

        const duration = (end - start) / 1000 / 60;
        const safeDuration = isNaN(duration) || duration < 0 ? 0 : duration;

        if (valParou.includes('sim')) {
            totalStopDuration += safeDuration;
            const area = String(r[idxS.area] || '').trim();
            if (area.toLowerCase().includes('manut')) maintenanceDuration += safeDuration;
        }

        cleanStops.push({
            start, end, duration: safeDuration, dateStr,
            area: String(r[idxS.area] || '').trim(),
            tipo: String(r[idxS.tipo] || '').trim(),
            desc: String(r[idxS.desc] || '').trim(),
            equip: String(r[idxS.equip] || '').trim(),
            comp: String(r[idxS.comp] || '').trim(),
            modo: String(r[idxS.modo] || '').trim(),
            parou: valParou,
            bateria: (idxS.bateria > -1) ? String(r[idxS.bateria] || '').trim() : String(r[3]).trim(),
            quench: String(r[idxS.quench] || '').trim()
        });
    }

    // 2. Processar Produção
    const wbProd = await readExcelToArray(fileProd);
    // CORREÇÃO: Ponto e vírgula removido
    const sheetProdName = wbProd.SheetNames.find(n => n.toLowerCase().includes('production') || n.toLowerCase().includes('produção'));
    
    if (!sheetProdName) throw new Error("Aba 'Production' não encontrada.");

    const wsProd = wbProd.Sheets[sheetProdName];
    // Adicionamos { header: 1, defval: null } para leitura correta
    const rowsProd = window.XLSX.utils.sheet_to_json(wsProd, { header: 1, defval: null });

    const cleanProd = {};
    let minDateFound = null, maxDateFound = null;
    let totalFornos = 0, totalProdReal = 0, totalWater = 0;

    // As colunas 1, 3, 6, 9, 10, 20 são HARDCODED e dependem do layout do seu arquivo.
    // Se o layout mudar, esses índices devem ser ajustados.
    for (let i = 0; i < rowsProd.length; i++) {
        const r = rowsProd[i];
        if (!r) continue;
        
        // Coluna de data: Índice 1
        const d = parseDate(r[1]); 
        if (!d || String(r[1]).toLowerCase().includes('total')) continue;
        const iso = formatDateISO(d);
        if (!iso) continue;

        if (!minDateFound || d < minDateFound) minDateFound = d;
        if (!maxDateFound || d > maxDateFound) maxDateFound = d;

        // Leitura de Yield (Índice 10)
        let rawYield = parseNumber(r[10]);
        if (rawYield > 0 && rawYield < 1) rawYield = rawYield * 100;

        const ovens = parseNumber(r[9]);       // Fornos (Índice 9)
        const realCoke = parseNumber(r[3]);    // Produção Real (Índice 3)
        const water = parseNumber(r[20]);      // Água (Índice 20)
        const wetCharge = parseNumber(r[6]);   // Carga Úmida (Índice 6)

        totalFornos += ovens;
        totalProdReal += realCoke;
        totalWater += water;

        // Filtrar linhas com Fornos e Carga Zerados
        if(ovens === 0 && wetCharge === 0) continue;

        cleanProd[iso] = {
            date: d,
            planCoke: parseNumber(r[2]),
            realCoke, ovens, yield: rawYield, water, wetCharge
        };
    }

    let daysSpan = 0;
    if (minDateFound && maxDateFound) {
        const diffTime = Math.abs(maxDateFound - minDateFound);
        daysSpan = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    return {
        stops: cleanStops,
        prod: cleanProd,
        auditStats: {
            stops: { count: cleanStops.length, totalHours: (totalStopDuration / 60).toFixed(1), maintHours: (maintenanceDuration / 60).toFixed(1) },
            prod: { days: daysSpan, ovens: totalFornos, prodTons: totalProdReal.toFixed(0), water: totalWater.toFixed(0) }
        },
        ignored
    };
};

// --- CÁLCULOS E AGREGAÇÕES (OEE, MTTR/MTBF, PARETO) ---

export const calculateOEEData = (rawData, dateRange, aggregation, equipmentFilter) => {
    // [CÓDIGO calculateOEEData COMPLETO]
    const { stops, prod } = rawData;
    const dates = Object.keys(prod).sort();
    if (dates.length === 0 || !dateRange.start || !dateRange.end) return [];

    const results = [];
    const timeAvailableTheory = BUSINESS_CONSTANTS.TC_META - BUSINESS_CONSTANTS.SL_THEORY;
    const cycleTheory = (timeAvailableTheory * 60) / BUSINESS_CONSTANTS.FN_THEORY;

    dates.forEach(dateKey => {
        if (dateKey < dateRange.start || dateKey > dateRange.end) return;
        const p = prod[dateKey];
        let s = stops.filter(stop => stop.dateStr === dateKey);
        if (equipmentFilter) s = s.filter(stop => stop.equip === equipmentFilter);

        const HOURS_PER_DAY = 48;
        const TARGET_MAINT_MINS = 10 * 60; 
        const TARGET_SHIFT_CHANGE = 3 * 60;
        const TARGET_BUCKET_QUENCH = 5 * 60; 

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
            const isProd = areaLower.includes('produção') || areaLower.includes('producao') || areaLower.includes('externo');
            const isTurno = (ev.modo + ev.desc).toLowerCase().includes('turno') || (ev.modo + ev.desc).toLowerCase().includes('passagem');

            if (isJanela) {
                if (quenchLower.includes('norte') || quenchLower.includes('north')) dailyJanelaInsideNorte += timeData.inside;
                else dailyJanelaInsideSul += timeData.inside;
                dailyJanelaOutside += timeData.outside;
            } else if (isTurno) {
                shiftChange += timeData.total;
            } else if (parouSim) {
                if (isMaint) failureLoss += timeData.total;
                else if (isProd) opsLoss += timeData.total;
            }
        });

        const usedMaintNorte = Math.min(dailyJanelaInsideNorte, TARGET_BUCKET_QUENCH);
        const excessNorte = dailyJanelaInsideNorte - usedMaintNorte;
        const usedMaintSul = Math.min(dailyJanelaInsideSul, TARGET_BUCKET_QUENCH);
        const excessSul = dailyJanelaInsideSul - usedMaintSul;
        const totalUsedMaint = usedMaintNorte + usedMaintSul;
        const totalExcessMaint = excessNorte + excessSul;

        let extMaint = totalExcessMaint;
        let outsideMaint = dailyJanelaOutside;

        const shiftTimeForSchedule = shiftChange < TARGET_SHIFT_CHANGE ? shiftChange : TARGET_SHIFT_CHANGE;
        const appliedSchedule = totalUsedMaint + shiftTimeForSchedule;
        
        const calendar = HOURS_PER_DAY * 60;
        const loading = calendar - appliedSchedule;
        const loadingMins = loading;
        const excessShift = Math.max(0, shiftChange - TARGET_SHIFT_CHANGE);
        const lossDisp = extMaint + outsideMaint + failureLoss;
        const operating = Math.max(0, loading - lossDisp);

        const totalVolReal = p.wetCharge; 
        const totalVolTheory = BUSINESS_CONSTANTS.FN_THEORY * BUSINESS_CONSTANTS.VOL_THEORY;
        const AVOL = totalVolTheory > 0 ? (totalVolReal / totalVolTheory) : 0;

        const lossUtil = opsLoss + excessShift; 
        const netOperating = Math.max(0, operating - lossUtil);
        const UF = operating > 0 ? (netOperating / operating) : 0;

        const cycleReal = p.ovens > 0 ? (netOperating / p.ovens) : 0;
        const ADFN = cycleReal > 0 ? (cycleTheory / cycleReal) : 0;
        const perfFinal = AVOL * UF * ADFN;

        const avail = loading > 0 ? (operating / loading) : 0;
        const qual = p.yield / 100;
        const oee = avail * perfFinal * qual;

        results.push({
            date: dateKey, day: formatDateDisplay(dateKey),
            calendar, loading, operating, lossDisp, lossUtil, 
            oee, avail, perf: perfFinal, qual,
            ovens: p.ovens, yield: p.yield, realCoke: p.realCoke, water: p.water, wetCharge: p.wetCharge,
            failureLoss, extMaint, outsideMaint, shiftChange, opsLoss,
            targetMaint: TARGET_MAINT_MINS, usedMaint: totalUsedMaint, loadingMins, excessShift,
            AVOL, UF, ADFN, netOperating
        });
    });

    const grouped = {};
    results.forEach(day => {
        const { key, label } = getAggregationKey(day.date, aggregation);
        if (!grouped[key]) {
            grouped[key] = {
                key, label,
                loading: 0, operating: 0, netOperating: 0, lossDisp: 0, lossUtil: 0,
                ovens: 0, wetCharge: 0, yieldSum: 0, yieldCount: 0, days: 0, water: 0,
                failureLoss: 0, extMaint: 0, outsideMaint: 0, shiftChange: 0, opsLoss: 0, excessShift: 0,
                totalUsedMaint: 0, loadingMins: 0
            };
        }
        const g = grouped[key];
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
        const totalVolTheory = g.days * BUSINESS_CONSTANTS.FN_THEORY * BUSINESS_CONSTANTS.VOL_THEORY;
        const AVOL = totalVolTheory > 0 ? (g.wetCharge / totalVolTheory) : 0;
        const UF = g.operating > 0 ? (g.netOperating / g.operating) : 0;
        const cycleRealAgg = g.ovens > 0 ? (g.netOperating / g.ovens) : 0;
        const ADFN = cycleRealAgg > 0 ? (cycleTheory / cycleRealAgg) : 0;
        const perf = AVOL * UF * ADFN;
        const avgYield = g.yieldCount > 0 ? (g.yieldSum / g.yieldCount) : 0;
        const qual = avgYield / 100;
        const oee = avail * perf * qual;

        return {
            ...g,
            oee: parseFloat((oee * 100).toFixed(1)),
            avail: parseFloat((avail * 100).toFixed(1)),
            perf: parseFloat((perf * 100).toFixed(1)),
            qual: parseFloat(avgYield.toFixed(2)),
            debug: { AVOL, UF, ADFN } 
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

export const calculateDashboardAggregates = (calculatedData, rawData, dateRange, filterSelection) => {
    // [CÓDIGO calculateDashboardAggregates COMPLETO]
    const dataToAggregate = filterSelection 
        ? calculatedData.filter(d => d.key === filterSelection)
        : calculatedData;

    if(dataToAggregate.length === 0) return null;
    
    const sum = (key) => dataToAggregate.reduce((a,b)=>a+b[key],0);
    const totalDays = sum('days');
    const totalLoading = sum('loading');
    const totalOperating = sum('operating');
    const totalNetOperating = sum('netOperating');
    const totalWetCharge = sum('wetCharge');
    const totalYieldSum = sum('yieldSum');
    const totalYieldCount = sum('yieldCount');
    const totalOvens = sum('ovens');

    const timeAvailableTheory = BUSINESS_CONSTANTS.TC_META - BUSINESS_CONSTANTS.SL_THEORY;
    const cycleTheory = (timeAvailableTheory * 60) / BUSINESS_CONSTANTS.FN_THEORY;
    const cycleRealGlobal = totalOvens > 0 ? (totalNetOperating / totalOvens) : 0;
    const ADFN_Global = cycleRealGlobal > 0 ? (cycleTheory / cycleRealGlobal) : 0;

    const availGlobal = totalLoading > 0 ? (totalOperating / totalLoading) : 0;
    const totalVolTheory = totalDays * BUSINESS_CONSTANTS.FN_THEORY * BUSINESS_CONSTANTS.VOL_THEORY;
    const AVOL_Global = totalVolTheory > 0 ? (totalWetCharge / totalVolTheory) : 0;
    const UF_Global = totalOperating > 0 ? (totalNetOperating / totalOperating) : 0;
    const perfGlobal = AVOL_Global * UF_Global * ADFN_Global;
    const avgYieldGlobal = totalYieldCount > 0 ? (totalYieldSum / totalYieldCount) : 0;
    const qualGlobal = avgYieldGlobal / 100;
    const oeeGlobal = availGlobal * perfGlobal * qualGlobal;

    const targetOvens = BUSINESS_CONSTANTS.FN_META * totalDays;
    const ritmoMin = totalOvens > 0 ? (totalOperating / totalOvens) : 0;
    const targetShiftChange = totalDays * 3 * 60; 

    const checkDays = new Set();
    rawData.stops.forEach(s => {
        if(s.dateStr < dateRange.start || s.dateStr > dateRange.end) return;
        checkDays.add(s.dateStr);
    });

    let winStartOkNorte = 0, winStartOkSul = 0;
    let winEndOkNorte = 0, winEndOkSul = 0;
    let winInsideOkNorte = 0, winInsideOkSul = 0;
    let winDurPctNorteSum = 0, winDurPctSulSum = 0;
    let winFreqScoreSum = 0;
    let daysWithStopNorte = 0, daysWithStopSul = 0;

    Array.from(checkDays).forEach(dateStr => {
        const dayStops = rawData.stops.filter(s => s.dateStr === dateStr);
        let hasNorte = false, hasSul = false;
        let minStartNorte = null, maxEndNorte = null;
        let minStartSul = null, maxEndSul = null;
        let durNorte = 0, durSul = 0;

        dayStops.forEach(s => {
            const bateriaLower = (s.bateria || '').toLowerCase();
            if(bateriaLower.includes('janela a/b') || bateriaLower.includes('janela c/d')) {
                const quenchLower = (s.quench || '').toLowerCase();
                const isNorte = quenchLower.includes('norte') || quenchLower.includes('north');
                if(isNorte) {
                    hasNorte = true; durNorte += s.duration;
                    if(!minStartNorte || s.start < minStartNorte) minStartNorte = s.start;
                    if(!maxEndNorte || s.end > maxEndNorte) maxEndNorte = s.end;
                } else {
                    hasSul = true; durSul += s.duration;
                    if(!minStartSul || s.start < minStartSul) minStartSul = s.start;
                    if(!maxEndSul || s.end > maxEndSul) maxEndSul = s.end;
                }
            }
        });

        const checkTime = (dateObj, targetH, targetM, tolerance) => {
            if(!dateObj) return false;
            const h = dateObj.getHours(); const m = dateObj.getMinutes();
            const diff = (h * 60 + m) - (targetH * 60 + targetM);
            return Math.abs(diff) <= tolerance;
        };
        const checkInside = (startObj, endObj) => {
            if(!startObj || !endObj) return false;
            const sVal = startObj.getHours() * 60 + startObj.getMinutes();
            const eVal = endObj.getHours() * 60 + endObj.getMinutes();
            return sVal >= (8 * 60 - 15) && eVal <= (17 * 60 + 15);
        };

        if(hasNorte) {
            daysWithStopNorte++;
            if(checkTime(minStartNorte, 8, 0, 15)) winStartOkNorte++;
            if(checkTime(maxEndNorte, 13, 0, 15)) winEndOkNorte++;
            if(checkInside(minStartNorte, maxEndNorte)) winInsideOkNorte++;
        }
        winDurPctNorteSum += Math.min(100, (durNorte / 300) * 100); 

        if(hasSul) {
            daysWithStopSul++;
            if(checkTime(minStartSul, 8, 0, 15)) winStartOkSul++;
            if(checkTime(maxEndSul, 13, 0, 15)) winEndOkSul++;
            if(checkInside(minStartSul, maxEndSul)) winInsideOkSul++;
        }
        winDurPctSulSum += Math.min(100, (durSul / 300) * 100);

        if(hasNorte || hasSul) {
            if (hasNorte && hasSul) winFreqScoreSum += 100;
            else winFreqScoreSum += 50;
        }
    });

    const totalDaysWindow = Math.max(1, checkDays.size);
    
    return {
        oee: (oeeGlobal * 100).toFixed(1),
        avail: (availGlobal * 100).toFixed(1),
        perf: (perfGlobal * 100).toFixed(1),
        qual: avgYieldGlobal.toFixed(2),
        water: sum('water').toFixed(0),
        ovensNumeric: totalOvens,
        ovensDisplay: totalOvens.toLocaleString('pt-BR'),
        targetOvens: targetOvens,
        lossDispH: (sum('lossDisp')/60).toFixed(1),
        lossUtilH: (sum('lossUtil')/60).toFixed(1),
        lossFailH: (sum('failureLoss')/60).toFixed(1),
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
        
        windowTotalDays: checkDays.size,
        daysWithStopNorte, daysWithStopSul,
        daysWithoutStopNorte: checkDays.size - daysWithStopNorte,
        daysWithoutStopSul: checkDays.size - daysWithStopSul,
        winStartOkNorte, winStartOkSul, winEndOkNorte, winEndOkSul, winInsideOkNorte, winInsideOkSul,
        windowAvgDurNorte: (winDurPctNorteSum / totalDaysWindow).toFixed(0),
        windowAvgDurSul: (winDurPctSulSum / totalDaysWindow).toFixed(0),
        windowFreqScore: (winFreqScoreSum / totalDaysWindow).toFixed(0)
    };
};

export const calculateTreeStats = (calculatedData, filterSelection) => {
    // [CÓDIGO calculateTreeStats COMPLETO]
    const dataToUse = filterSelection ? calculatedData.filter(d => d.key === filterSelection) : calculatedData;
    if(dataToUse.length === 0) return null;

    const sum = (k) => dataToUse.reduce((a,b) => a + b[k], 0);
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
    const avgYield = dataToUse.length > 0 ? (dataToUse.reduce((a,b) => a + b.qual, 0) / dataToUse.length) / 100 : 0;
    const fullyProductive = netOperating * avgYield;
    const lossQualityTime = netOperating - fullyProductive;
    const targetLossDisp = loading * (1 - (TARGETS.AVAIL/100));
    const targetLossQual = netOperating * (1 - (TARGETS.QUAL/100));

    return {
        loading: (loading/60).toFixed(1),
        operating: (operating/60).toFixed(1),
        netOperating: (netOperating/60).toFixed(1),
        fullyProductive: (fullyProductive/60).toFixed(1),
        lossDisp: (sum('lossDisp')/60).toFixed(1),
        failLoss: { val: (failLoss/60).toFixed(1), target: (targetLossDisp/60).toFixed(1) },
        schedMaintLoss: { val: (schedMaintLoss/60).toFixed(1), target: 0 },
        lossPerf: (sum('lossUtil')/60).toFixed(1),
        shiftLoss: { val: (shiftLoss/60).toFixed(1), target: 0 }, 
        opsLoss: { val: (opsLossSum/60).toFixed(1), target: 0 },
        rhythmLoss: { val: 0, target: 0 }, 
        lossQual: { val: (lossQualityTime/60).toFixed(1), target: (targetLossQual/60).toFixed(1) },
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
        if(d.frequency === 1 && d.mttr < noiseThresholdMTTR) noiseList.push(d);
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
        return { data: [], ttfs: [], status: 'Selecione o equipamento' };
    }

    const validStops = rawData.stops.filter(s => {
        const areaLower = s.area.toLowerCase();
        const tipoLower = (s.tipo || '').toLowerCase();
        const isMaint = areaLower.includes('manut') || tipoLower.includes('corretiva') || tipoLower.includes('quebra');
        const isJanela = (s.bateria || '').toLowerCase().includes('janela');
        
        // Deve ser uma falha não planejada e corresponder ao equipamento filtrado
        return isMaint && !isJanela && s.parou.includes('sim') && s.equip === equipmentFilter;
    });
    
    // 1. Coletar os Tempos de Vida (TTFs)
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
        return { data: [], ttfs, status: 'Mínimo de 3 falhas não programadas é necessário para análise de Weibull.', numFailures: ttfs.length };
    }
    
    // 2. Cálculo do Rank de Mediana (Median Rank) para plotagem
    ttfs.sort((a, b) => a - b);
    const N = ttfs.length;
    
    const weibullData = ttfs.map((ttf, i) => {
        const rank = i + 1;
        const medianRank = (rank - 0.3) / (N + 0.4);
        
        // Y = ln(ln(1 / (1 - F(i))))
        const yValue = Math.log(Math.log(1 / (1 - medianRank)));
        
        // X = ln(TTF)
        const xValue = Math.log(ttf);

        return {
            ttf: ttf, 
            medianRank: medianRank,
            x: xValue, 
            y: yValue,
            rank: rank
        };
    });

    return { 
        data: weibullData, 
        ttfs, 
        status: `Análise gerada com ${N} falhas.`,
        numFailures: N
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
        if (!parouSim && !isJanela) return;
        
        const areaLower = s.area.toLowerCase();
        const tipoLower = (s.tipo || '').toLowerCase();
        const isMaint = areaLower.includes('manut') || tipoLower.includes('corretiva') || tipoLower.includes('quebra');
        
        if (lossFilter === 'availability' && !isMaint && !isJanela) return; 
        if (lossFilter === 'performance' && isMaint) return;
        
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