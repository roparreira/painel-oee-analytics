// src/utils.js
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

// Configuração do DayJS
dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);

export { dayjs };

// --- HELPERS DE FORMATAÇÃO ---
export const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return "--:--";
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// --- ETL HELPERS ---
export const parseNumber = (val) => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    let s = String(val).trim();
    if (s === '-' || s === '') return 0;
    const hasComma = s.includes(',');
    const hasDot = s.includes('.');
    if (hasComma && hasDot) {
        const lastComma = s.lastIndexOf(',');
        const lastDot = s.lastIndexOf('.');
        if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
        else s = s.replace(/,/g, '');
    } else if (hasComma) s = s.replace(',', '.');
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
};

export const parseDate = (val) => {
    if (!val) return null;
    if (typeof val === 'number') {
        if (val < 20000) return null;
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() + offset);
    }
    if (typeof val === 'string') {
        const match = val.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:\s(\d{1,2}):(\d{1,2}))?/);
        if (match) {
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1; 
            const year = parseInt(match[3], 10);
            const hour = match[4] ? parseInt(match[4], 10) : 0;
            const min = match[5] ? parseInt(match[5], 10) : 0;
            return new Date(year, month, day, hour, min);
        }
        const dt = new Date(val);
        return isNaN(dt.getTime()) ? null : dt;
    }
    return null;
};

export const getProductionDate = (date) => {
    const d = new Date(date);
    if (d.getHours() >= 12) d.setDate(d.getDate() + 1);
    d.setHours(0,0,0,0);
    return d;
};

export const formatDateISO = (date) => {
    if (!date || isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
};

export const formatDateDisplay = (iso) => { 
    if(!iso) return '';
    const [y,m,d] = iso.split('-'); 
    return `${d}/${m}`; 
};

export const getMinutesInsideWindow = (start, end) => {
    if (!start || !end) return { total: 0, inside: 0, outside: 0 };
    
    // Calcula duração total em minutos
    const totalDur = (end - start) / 1000 / 60;
    
    // Define a janela de interesse no dia do início do evento
    // Janela: 08:00 às 13:00
    const winStart = new Date(start);
    winStart.setHours(8, 0, 0, 0);
    
    const winEnd = new Date(start);
    winEnd.setHours(13, 0, 0, 0);
    
    // Calcula o overlap (interseção)
    // Máximo entre (InicioEvento, InicioJanela)
    const effectiveStart = start < winStart ? winStart : start;
    // Mínimo entre (FimEvento, FimJanela)
    const effectiveEnd = end > winEnd ? winEnd : end;
    
    let inside = (effectiveEnd - effectiveStart) / 1000 / 60;
    
    // Se não houver overlap (ex: evento começa 14:00, effectiveStart(14:00) > effectiveEnd(13:00)), inside será negativo.
    if (inside < 0) inside = 0;
    
    const outside = Math.max(0, totalDur - inside);

    return { total: totalDur, inside, outside };
};

export const getAggregationKey = (dateStr, type) => {
    const d = dayjs(dateStr);
    switch (type) {
        case 'day': return { key: dateStr, label: d.format('DD/MM') };
        case 'week': return { key: `${d.year()}-W${d.isoWeek()}`, label: `Sem ${d.isoWeek()}` };
        case 'fortnight': return { key: `${d.format('YYYY-MM')}-${d.date() <= 15 ? '1' : '2'}`, label: `${d.format('MMM')}-${d.date() <= 15 ? '1ª Qinz' : '2ª Qinz'}` };
        case 'month': return { key: d.format('YYYY-MM'), label: d.format('MMM/YY') };
        case 'quarter': return { key: `${d.year()}-Q${d.quarter()}`, label: `${d.year()} T${d.quarter()}` };
        case 'year': return { key: d.format('YYYY'), label: d.format('YYYY') };
        default: return { key: dateStr, label: dateStr };
    }
};