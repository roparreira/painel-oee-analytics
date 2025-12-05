import { 
    parseDate, 
    getProductionDate, 
    formatDateISO, 
    parseNumber, 
    getMinutesInsideWindow, 
    getAggregationKey, 
    formatDateDisplay, 
    formatDuration
} from '../utils';
import { TARGETS } from '../config';

// --- LEITURA DE ARQUIVOS (INGESTÃO) ---

const readExcelToArray = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = window.XLSX.read(data, { type: 'array' });
                resolve(workbook);
            } catch (err) {
                reject(err);
            }
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
        quench: 5 // Fallback
    };
    
    const quenchIdx = headStop.findIndex(h => h.includes('quench'));
    if (quenchIdx > -1) idxS.quench = quenchIdx;

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

        if (!start || !end) {
            ignored.push({ row: i + 1, reason: `Data Inválida` }); continue;
        }

        const prodDate = getProductionDate(start);
        const dateStr = formatDateISO(prodDate);
        if (!dateStr) {
            ignored.push({ row: i + 1, reason: `Erro ISO` }); continue;
        }

        const duration = (end - start) / 1000 / 60;
        const safeDuration = isNaN(duration) || duration < 0 ? 0 : duration;

        if (valParou.includes('sim')) {
            totalStopDuration += safeDuration;
            const area = String(r[idxS.area] || '').trim();
            if (area.toLowerCase().includes('manut')) maintenanceDuration += safeDuration;
        }

        let bateriaVal = '';
        if (idxS.bateria > -1) {
            bateriaVal = String(r[idxS.bateria] || '').trim();
        } else if (r[3]) {
            bateriaVal = String(r[3]).trim();
        }

        cleanStops.push({
            start,
            end,
            duration: safeDuration,
            dateStr,
            area: String(r[idxS.area] || '').trim(),
            tipo: String(r[idxS.tipo] || '').trim(),
            desc: String(r[idxS.desc] || '').trim(),
            equip: String(r[idxS.equip] || '').trim(),
            comp: String(r[idxS.comp] || '').trim(),
            modo: String(r[idxS.modo] || '').trim(),
            parou: valParou,
            bateria: bateriaVal,
            quench: String(r[idxS.quench] || '').trim()
        });
    }

    // 2. Processar Produção
    const wbProd = await readExcelToArray(fileProd);
    const sheetProdName = wbProd.SheetNames.find(n => n.toLowerCase().includes('production') || n.toLowerCase().includes('produção'));
    if (!sheetProdName) throw new Error("Aba 'Production' não encontrada.");

    const wsProd = wbProd.Sheets[sheetProdName];
    const rowsProd = window.XLSX.utils.sheet_to_json(wsProd, { header: 1, defval: null });

    const cleanProd = {};
    let minDateFound = null, maxDateFound = null;
    let totalFornos = 0, totalProdReal = 0, totalWater = 0;

    for (let i = 0; i < rowsProd.length; i++) {
        const r = rowsProd[i];
        if (!r) continue;
        const d = parseDate(r[1]);
        if (!d || String(r[1]).toLowerCase().includes('total')) continue;
        const iso = formatDateISO(d);
        if (!iso) continue;

        if (!minDateFound || d < minDateFound) minDateFound = d;
        if (!maxDateFound || d > maxDateFound) maxDateFound = d;

        let rawYield = parseNumber(r[10]);
        if (rawYield > 0 && rawYield < 1) rawYield = rawYield * 100;

        const ovens = parseNumber(r[9]);
        const realCoke = parseNumber(r[3]);
        const water = parseNumber(r[20]);
        const wetCharge = parseNumber(r[6]);

        totalFornos += ovens;
        totalProdReal += realCoke;
        totalWater += water;

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

// --- CÁLCULOS E AGREGAÇÕES ---

export const calculateOEEData = (rawData, dateRange, aggregation, equipmentFilter) => {
    const { stops, prod } = rawData;
    const dates = Object.keys(prod).sort();
    if (dates.length === 0 || !dateRange.start || !dateRange.end) return [];

    const results = [];

    dates.forEach(dateKey => {
        if (dateKey < dateRange.start || dateKey > dateRange.end) return;
        const p = prod[dateKey];
        let s = stops.filter(stop => stop.dateStr === dateKey);

        if (equipmentFilter) {
            s = s.filter(stop => stop.equip === equipmentFilter);
        }

        const HOURS_PER_DAY = 48;
        const TARGET_BUCKET = 10 * 60; // 600 min totais
        const TARGET_BUCKET_QUENCH = 5 * 60; // 300 min por quench
        const dayOfWeek = p.date.getDay();
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

        let dailyJanelaInsideNorte = 0;
        let dailyJanelaInsideSul = 0;
        let dailyJanelaOutside = 0;
        let failureLoss = 0;
        let shiftChange = 0, opsLoss = 0;

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
                if (quenchLower.includes('norte') || quenchLower.includes('north')) {
                    dailyJanelaInsideNorte += timeData.inside;
                } else {
                    dailyJanelaInsideSul += timeData.inside;
                }
                dailyJanelaOutside += timeData.outside;
            }
            else if (isTurno) {
                shiftChange += timeData.total;
            }
            else if (parouSim) {
                if (isMaint) failureLoss += timeData.total;
                else if (isProd) {
                    opsLoss += timeData.total;
                }
            }
        });

        const usedMaintNorte = Math.min(dailyJanelaInsideNorte, TARGET_BUCKET_QUENCH);
        const excessNorte = dailyJanelaInsideNorte - usedMaintNorte;

        const usedMaintSul = Math.min(dailyJanelaInsideSul, TARGET_BUCKET_QUENCH);
        const excessSul = dailyJanelaInsideSul - usedMaintSul;

        const totalUsedMaint = usedMaintNorte + usedMaintSul;
        const totalExcessInside = excessNorte + excessSul;

        let targetMaint = TARGET_BUCKET;
        let usedMaint = totalUsedMaint;
        let extMaint = 0;
        let outsideMaint = 0;
        let usedProd = 0;
        let extProd = 0;
        let outsideProd = 0;

        if (!isWeekend) {
            extMaint = totalExcessInside;
            outsideMaint = dailyJanelaOutside;
        } else {
            extProd = totalExcessInside;
            outsideProd = dailyJanelaOutside;
        }

        const appliedSchedule = usedMaint + usedProd;
        const calendar = HOURS_PER_DAY * 60;
        const loading = calendar - appliedSchedule;
        const loadingMins = loading;

        const lossDisp = extMaint + outsideMaint + failureLoss;
        const operating = Math.max(0, loading - lossDisp);

        const lossUtil = extProd + outsideProd + shiftChange + opsLoss;
        const avail = loading > 0 ? (operating / loading) : 0;
        const perfFinal = operating > 0 ? ((operating - lossUtil) / operating) : 0;
        const qual = p.yield / 100;
        const oee = avail * perfFinal * qual;

        results.push({
            date: dateKey,
            day: formatDateDisplay(dateKey),
            calendar, loading, operating, lossDisp, lossUtil,
            ovens: p.ovens,
            yield: p.yield,
            realCoke: p.realCoke,
            water: p.water,
            failureLoss,
            extMaint,
            outsideMaint,
            shiftChange,
            opsLoss,
            extProd,
            outsideProd,
            targetMaint,
            usedMaint,
            loadingMins,
            usedProd
        });
    });

    const grouped = {};
    results.forEach(day => {
        const { key, label } = getAggregationKey(day.date, aggregation);
        if (!grouped[key]) {
            grouped[key] = {
                key, label,
                loading: 0, operating: 0, lossUtil: 0,
                ovens: 0, yieldSum: 0, yieldCount: 0, days: 0,
                lossDisp: 0, water: 0,
                failureLoss: 0, extMaint: 0, outsideMaint: 0,
                shiftChange: 0, opsLoss: 0, extProd: 0, outsideProd: 0,
                targetMaint: 0, usedMaint: 0, loadingMins: 0, usedProd: 0
            };
        }
        const g = grouped[key];
        g.loading += day.loading;
        g.operating += day.operating;
        g.lossUtil += day.lossUtil;
        g.ovens += day.ovens;
        if (day.yield > 0) { g.yieldSum += day.yield; g.yieldCount++; }
        g.days++;
        g.lossDisp += day.lossDisp;
        g.water += day.water;

        g.failureLoss += day.failureLoss;
        g.extMaint += day.extMaint;
        g.outsideMaint += day.outsideMaint;
        g.shiftChange += day.shiftChange;
        g.opsLoss += day.opsLoss;
        g.extProd += day.extProd;
        g.outsideProd += day.outsideProd;

        g.targetMaint += day.targetMaint;
        g.usedMaint += day.usedMaint;
        g.loadingMins += day.loadingMins;
        g.usedProd += day.usedProd;
    });

    let finalResults = Object.values(grouped).map(g => {
        const avail = g.loading > 0 ? (g.operating / g.loading) : 0;
        const perf = g.operating > 0 ? ((g.operating - g.lossUtil) / g.operating) : 0;
        const avgYield = g.yieldCount > 0 ? (g.yieldSum / g.yieldCount) : 0;
        const qual = avgYield / 100;
        const oee = avail * perf * qual;

        return {
            ...g,
            oee: parseFloat((oee * 100).toFixed(1)),
            avail: parseFloat((avail * 100).toFixed(1)),
            perf: parseFloat((perf * 100).toFixed(1)),
            qual: parseFloat(avgYield.toFixed(2)),
        };
    });

    finalResults.sort((a, b) => a.key.localeCompare(b.key));

    let accDisp = 0;
    let accUtil = 0;
    finalResults = finalResults.map(item => {
        accDisp += item.lossDisp;
        accUtil += item.lossUtil;
        return {
            ...item,
            accLossDisp: accDisp,
            accLossUtil: accUtil
        };
    });

    return finalResults;
};

export const calculateDashboardAggregates = (calculatedData, rawData, dateRange, filterSelection) => {
    const dataToAggregate = filterSelection 
        ? calculatedData.filter(d => d.key === filterSelection)
        : calculatedData;

    if(dataToAggregate.length === 0) return null;
    
    const sum = (key) => dataToAggregate.reduce((a,b)=>a+b[key],0);
    const avg = (key) => sum(key) / dataToAggregate.length;

    const totalDays = sum('days'); 
    const targetOvens = 160 * totalDays; 
    const totalOvens = sum('ovens');
    const avgOee = avg('oee');
    
    const ritmoMin = totalOvens > 0 ? (sum('operating') / totalOvens) : 0;
    const ritmoMetaMin = targetOvens > 0 ? (sum('loading') / targetOvens) : 0;
    
    const targetShiftChange = totalDays * 3;

    // Window Check
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
    
    let daysWithStopNorte = 0;
    let daysWithStopSul = 0;

    Array.from(checkDays).forEach(dateStr => {
        const dayStops = rawData.stops.filter(s => s.dateStr === dateStr);
        let hasNorte = false, hasSul = false;
        let minStartNorte = null, maxEndNorte = null;
        let minStartSul = null, maxEndSul = null;
        let durNorte = 0, durSul = 0;

        dayStops.forEach(s => {
            const bateriaLower = (s.bateria || '').toLowerCase();
            const isJanela = bateriaLower.includes('janela a/b') || bateriaLower.includes('janela c/d');
            
            if(isJanela) {
                const quenchLower = (s.quench || '').toLowerCase();
                const isNorte = quenchLower.includes('norte') || quenchLower.includes('north');

                if(isNorte) {
                    hasNorte = true;
                    durNorte += s.duration;
                    if(!minStartNorte || s.start < minStartNorte) minStartNorte = s.start;
                    if(!maxEndNorte || s.end > maxEndNorte) maxEndNorte = s.end;
                } else {
                    hasSul = true;
                    durSul += s.duration;
                    if(!minStartSul || s.start < minStartSul) minStartSul = s.start;
                    if(!maxEndSul || s.end > maxEndSul) maxEndSul = s.end;
                }
            }
        });

        const targetStartH = 8, targetStartM = 0;
        const targetEndH = 13, targetEndM = 0; // 13:00
        const tol = 15; // min
        const absStartH = 8, absStartM = 0;
        const absEndH = 17, absEndM = 0;

        const checkTime = (dateObj, targetH, targetM, tolerance) => {
            if(!dateObj) return false;
            const h = dateObj.getHours();
            const m = dateObj.getMinutes();
            const diff = (h * 60 + m) - (targetH * 60 + targetM);
            return Math.abs(diff) <= tolerance;
        };

        const checkInside = (startObj, endObj) => {
            if(!startObj || !endObj) return false;
            const sVal = startObj.getHours() * 60 + startObj.getMinutes();
            const eVal = endObj.getHours() * 60 + endObj.getMinutes();
            
            // CORREÇÃO: Tolerância de 15 minutos aplicada aos limites
            // Limite Inferior: 08:00 - 15m = 07:45
            const minVal = (absStartH * 60 + absStartM) - tol;
            // Limite Superior: 17:00 + 15m = 17:15
            const maxVal = (absEndH * 60 + absEndM) + tol;
            
            return sVal >= minVal && eVal <= maxVal;
        };

        if(hasNorte) {
            daysWithStopNorte++;
            if(checkTime(minStartNorte, targetStartH, targetStartM, tol)) winStartOkNorte++;
            if(checkTime(maxEndNorte, targetEndH, targetEndM, tol)) winEndOkNorte++;
            if(checkInside(minStartNorte, maxEndNorte)) winInsideOkNorte++;
        }
        winDurPctNorteSum += Math.min(100, (durNorte / 300) * 100); 

        if(hasSul) {
            daysWithStopSul++;
            if(checkTime(minStartSul, targetStartH, targetStartM, tol)) winStartOkSul++;
            if(checkTime(maxEndSul, targetEndH, targetEndM, tol)) winEndOkSul++;
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
        oee: avgOee.toFixed(1),
        avail: avg('avail').toFixed(1),
        perf: avg('perf').toFixed(1),
        qual: avg('qual').toFixed(2),
        water: sum('water').toFixed(0),
        ovensNumeric: totalOvens,
        ovensDisplay: totalOvens.toLocaleString('pt-BR'),
        targetOvens: targetOvens,
        lossDispH: (sum('lossDisp')/60).toFixed(1),
        lossUtilH: (sum('lossUtil')/60).toFixed(1),
        lossFailH: (sum('failureLoss')/60).toFixed(1),
        ritmoDisplay: formatDuration(ritmoMin),
        ritmoMetaDisplay: formatDuration(ritmoMetaMin),
        ritmoMin: ritmoMin,
        ritmoMetaMin: ritmoMetaMin,
        failLossMins: sum('failureLoss'),
        schedMaintLossMins: sum('extMaint') + sum('outsideMaint'),
        opsLossMins: sum('opsLoss'),
        shiftLossMins: sum('shiftChange'),
        targetMaintMins: sum('targetMaint'),
        usedMaintMins: sum('usedMaint'),
        loadingMins: sum('loadingMins'),
        extMaintMins: sum('extMaint'),
        outsideMaintMins: sum('outsideMaint'),
        usedProdMins: sum('usedProd'),
        extProdMins: sum('extProd'),
        outsideProdMins: sum('outsideProd'),
        targetShiftChange,
        totalCalendarTime: totalDays * 48 * 60,
        
        windowTotalDays: checkDays.size,
        daysWithStopNorte,
        daysWithStopSul,
        daysWithoutStopNorte: checkDays.size - daysWithStopNorte,
        daysWithoutStopSul: checkDays.size - daysWithStopSul,
        winStartOkNorte, winStartOkSul,
        winEndOkNorte, winEndOkSul,
        winInsideOkNorte, winInsideOkSul,
        windowAvgDurNorte: (winDurPctNorteSum / totalDaysWindow).toFixed(0),
        windowAvgDurSul: (winDurPctSulSum / totalDaysWindow).toFixed(0),
        windowFreqScore: (winFreqScoreSum / totalDaysWindow).toFixed(0)
    };
};

export const calculateTreeStats = (calculatedData, filterSelection) => {
    const dataToUse = filterSelection ? calculatedData.filter(d => d.key === filterSelection) : calculatedData;
    if(dataToUse.length === 0) return null;

    const sum = (k) => dataToUse.reduce((a,b) => a + b[k], 0);
    
    const loading = sum('loading');
    const operating = sum('operating');
    const netOperating = Math.max(0, operating - sum('lossUtil'));
    const failLoss = sum('failureLoss');
    const schedMaintLoss = sum('extMaint') + sum('outsideMaint');
    const shiftLoss = sum('shiftChange');
    const opsLossSum = sum('opsLoss');
    const rhythmLossSum = sum('extProd') + sum('outsideProd');
    const avgYield = dataToUse.length > 0 ? (dataToUse.reduce((a,b) => a + b.qual, 0) / dataToUse.length) / 100 : 0;
    const fullyProductive = netOperating * avgYield;
    const lossQualityTime = netOperating - fullyProductive;
    
    const targetLossDisp = loading * (1 - TARGETS.AVAIL/100);
    const targetLossPerfTotal = operating * (1 - TARGETS.PERF/100);
    const targetLossQual = netOperating * (1 - TARGETS.QUAL/100);

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
        rhythmLoss: { val: (rhythmLossSum/60).toFixed(1), target: (targetLossPerfTotal/60).toFixed(1) },
        opsLoss: { val: (opsLossSum/60).toFixed(1), target: 0 },
        lossQual: { val: (lossQualityTime/60).toFixed(1), target: (targetLossQual/60).toFixed(1) }
    };
};

export const calculateJackKnifeData = (rawData, dateRange) => {
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
        if (!equipMap[equip]) equipMap[equip] = { name: equip, frequency: 0, totalDuration: 0, mttr: 0 };
        equipMap[equip].frequency += 1;
        equipMap[equip].totalDuration += s.duration;
    });

    let equipData = Object.values(equipMap).map(d => ({
        ...d,
        mttr: d.totalDuration / d.frequency
    }));

    const compMap = {};
    validStops.forEach(s => {
        const equip = s.equip || "Sem Tag";
        const comp = s.comp || "Geral";
        const key = `${equip} | ${comp}`;
        if (!compMap[key]) compMap[key] = { name: key, compName: comp, parentEquip: equip, frequency: 0, totalDuration: 0, mttr: 0 };
        compMap[key].frequency += 1;
        compMap[key].totalDuration += s.duration;
    });

    let compData = Object.values(compMap).map(d => ({
        ...d,
        mttr: d.totalDuration / d.frequency
    }));

    const noiseThresholdMTTR = 30; 
    
    const noiseList = [];
    const cleanEquipData = [];

    equipData.forEach(d => {
        if(d.frequency === 1 && d.mttr < noiseThresholdMTTR) {
            noiseList.push(d);
        } else {
            cleanEquipData.push(d);
        }
    });
    
    return {
        equip: cleanEquipData,
        comp: compData, 
        noise: noiseList
    };
};

export const calculateParetoData = (rawData, dateRange, filterSelection, aggregation, lossFilter, equipmentFilter) => {
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
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

    return { 
        topEquipmentsData: processPareto(reasonsEquip), 
        topCausesData: processPareto(reasonsCause) 
    };
};