import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Cell,
  LabelList,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
} from 'recharts';
import {
  Upload,
  Activity,
  Droplet,
  AlertTriangle,
  Calendar,
  Filter,
  CheckCircle,
  BarChart2,
  FileSearch,
  Database,
  ArrowRight,
  Settings,
  Clock,
  RefreshCw,
  X,
  ChevronDown,
  Info,
  Layout,
  TrendingDown,
  Timer,
  Wrench,
  Layers,
  Target,
  Crosshair,
  PlayCircle,
  StopCircle,
  Percent,
  Maximize,
  CalendarX,
} from 'lucide-react';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);

// --- CONSTANTES DE META ---
const TARGETS = {
  OEE: 65,
  AVAIL: 90,
  PERF: 95,
  QUAL: 72.15,
};

// --- PALETA DE CORES ---
const COLORS = {
  orange: '#FB4F14',
  darkGray: '#334155', // Slate-700
  red: '#EF4444', // Vermelho (Perda / Excedente)
  blue: '#0065BD', // Azul (Target / Confiabilidade)
  blueGray: '#7D9AAA',
  yellow: '#EBB700', // Amarelo Performance
  lightGray: '#94A3B8',
  green: '#22C55E', // Verde (Ganho / Economia)
  transparent: 'rgba(0,0,0,0)',
  offWhite: '#F8FAFC',
  faded: '#E2E8F0',
  jackKnife: {
    chronic: '#fee2e2', // Red faded
    acute: '#fef3c7', // Yellow faded
    monitor: '#dcfce7', // Green faded
    ideal: '#f1f5f9', // Slate faded
  },
};

// --- HELPERS DE FORMATAÇÃO ---
const formatDuration = (minutes) => {
  if (!minutes && minutes !== 0) return '--:--';
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);
  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
};

// --- COMPONENTES UI ---
const Card = ({ children, className = '', style = {}, onClick = null }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-slate-100 flex flex-col ${className} ${
      onClick ? 'cursor-pointer transition-all duration-200' : ''
    }`}
    style={style}
  >
    {children}
  </div>
);

const ComparisonCard = ({
  title,
  real,
  target,
  unit = 'h',
  inverse = false,
  showDeviationOnly = false,
}) => {
  const safeReal = typeof real === 'number' ? real : 0;
  const safeTarget = typeof target === 'number' ? target : 0;

  const diff = safeReal - safeTarget;
  let isGood;

  if (inverse) {
    isGood = safeReal <= safeTarget + 0.01;
  } else {
    isGood = safeReal >= safeTarget - 0.01;
  }

  const diffColor = isGood ? 'text-green-600' : 'text-red-600';
  const bgColor = isGood ? 'bg-green-50' : 'bg-red-50';

  return (
    <Card
      className="p-2 flex flex-col gap-1 border-t-4 h-full justify-between"
      style={{ borderTopColor: isGood ? COLORS.green : COLORS.red }}
    >
      <h3 className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1 leading-tight">
        {isGood ? (
          <CheckCircle size={12} className="text-green-500 shrink-0" />
        ) : (
          <AlertTriangle size={12} className="text-red-500 shrink-0" />
        )}
        {title}
      </h3>

      {!showDeviationOnly ? (
        <div className="flex justify-between items-end mt-1">
          <div>
            <span className="text-lg font-bold text-slate-700 block leading-none">
              {safeReal.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{' '}
              <span className="text-[9px] font-normal text-slate-400">
                {unit}
              </span>
            </span>
            <span className="text-[8px] text-slate-400 font-bold uppercase">
              Realizado
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-500 block leading-none">
              {safeTarget.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{' '}
              <span className="text-[8px] font-normal text-slate-300">
                {unit}
              </span>
            </span>
            <span className="text-[8px] text-slate-400">Meta</span>
          </div>
        </div>
      ) : (
        <div className="mt-1">
          <span className="text-[9px] text-slate-400 block mb-1">
            Meta:{' '}
            {safeTarget.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
          </span>
        </div>
      )}

      <div
        className={`mt-1 py-1 px-2 rounded ${bgColor} flex justify-between items-center`}
      >
        <span className="text-[9px] font-bold text-slate-600">Desvio</span>
        <span className={`text-xs font-bold ${diffColor}`}>
          {diff > 0 ? '+' : ''}
          {diff.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
        </span>
      </div>
    </Card>
  );
};

const CheckCardDual = ({
  title,
  sub,
  icon: Icon,
  valNorte,
  totalNorte,
  valSul,
  totalSul,
  color = COLORS.orange,
}) => {
  const safeValNorte = valNorte || 0;
  const safeTotalNorte = totalNorte || 0;
  const safeValSul = valSul || 0;
  const safeTotalSul = totalSul || 0;

  const pctNorte =
    safeTotalNorte > 0 ? (safeValNorte / safeTotalNorte) * 100 : 0;
  const pctSul = safeTotalSul > 0 ? (safeValSul / safeTotalSul) * 100 : 0;

  return (
    <Card
      className="p-3 flex flex-col gap-2 border-l-4 h-full justify-between"
      style={{ borderLeftColor: color }}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
            {title}
          </p>
          <p className="text-[8px] text-slate-400 leading-tight">{sub}</p>
        </div>
        <div className="p-1 rounded-full bg-slate-50">
          <Icon size={14} style={{ color }} />
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-[9px] mb-0.5">
            <span className="font-bold text-slate-600">Norte</span>
            <span className="text-slate-500">{pctNorte.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${pctNorte}%`, backgroundColor: color }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[9px] mb-0.5">
            <span className="font-bold text-slate-600">Sul</span>
            <span className="text-slate-500">{pctSul.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${pctSul}%`, backgroundColor: color }}
            ></div>
          </div>
        </div>
      </div>
    </Card>
  );
};

const CheckCardSingle = ({
  title,
  value,
  total,
  sub,
  icon: Icon,
  color = COLORS.orange,
}) => {
  const safeValue = Number(value) || 0;
  const safeTotal = Number(total) || 0;
  const percentage = safeTotal > 0 ? (safeValue / safeTotal) * 100 : 0;

  return (
    <Card
      className="p-3 flex flex-col gap-2 border-l-4 h-full justify-between"
      style={{ borderLeftColor: color }}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
            {title}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-slate-700">
              {percentage.toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="p-1 rounded-full bg-slate-50">
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-1">
        <div
          className="h-full rounded-full"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        ></div>
      </div>
      <p className="text-[8px] text-slate-400 mt-1 leading-tight">{sub}</p>
    </Card>
  );
};

const MiniDreRow = ({ label, value, target, unit = 'h' }) => {
  const valNum = parseFloat(value);
  const targetNum = parseFloat(target);
  const isGood = valNum <= targetNum;
  const textColor = isGood ? 'text-green-600' : 'text-red-600';
  const dotColor = isGood ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors px-1 rounded">
      <div className="flex items-center gap-1.5 overflow-hidden">
        <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></div>
        <span
          className="text-[10px] font-medium text-slate-600 truncate max-w-[110px]"
          title={label}
        >
          {label}
        </span>
      </div>
      <div className="flex items-center gap-3 text-[10px]">
        <div className="text-right">
          <span className={`block font-bold leading-none ${textColor}`}>
            {valNum}{' '}
            <span className={`text-[8px] font-normal opacity-70`}>{unit}</span>
          </span>
          <span className="text-[8px] text-slate-400 leading-none">Real</span>
        </div>
        <div className="text-right w-12 border-l border-slate-100 pl-2">
          <span className="block font-bold text-slate-500 leading-none">
            {targetNum}{' '}
            <span className="text-[8px] font-normal text-slate-300">
              {unit}
            </span>
          </span>
          <span className="text-[8px] text-slate-400 leading-none">Meta</span>
        </div>
      </div>
    </div>
  );
};

const AuditStat = ({ label, value, sub, color, icon: Icon }) => (
  <div
    className="flex items-start p-3 bg-slate-50 rounded-lg border-l-4"
    style={{ borderLeftColor: color }}
  >
    <div className="mr-3 mt-1">
      <div className="p-1.5 rounded-full bg-white shadow-sm">
        <Icon size={16} style={{ color: color }} />
      </div>
    </div>
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <h4 className="text-lg font-bold" style={{ color: color }}>
        {value}
      </h4>
      <p className="text-[10px] text-gray-400">{sub}</p>
    </div>
  </div>
);

// --- COMPONENTE JACK KNIFE CHART (REFEITO) ---
const CustomJackKnifeChart = ({
  data,
  title,
  onPointClick,
  selectedId,
  type = 'equip',
}) => {
  if (!data || data.length === 0)
    return (
      <div className="flex h-full items-center justify-center text-gray-400 text-xs italic">
        Sem dados suficientes.
      </div>
    );

  // Constantes para as curvas (Exemplo: Limite Disp 90% -> K = TotalTime * (1-0.9))
  // Usando valores aproximados para visualização logarítmica adequada
  // Total Time fixo de exemplo ou passado via props. Vamos assumir um K relativo aos dados
  // K = MTTR * Freq.
  // Se Availability Target = 90%, então Unavailability = 10%.
  // Max Downtime = TotalTime * 0.1
  // Curva: y = (TotalTime * 0.1) / x

  // Para simplificar a visualização sem o TotalTime exato de cada linha,
  // vamos plotar curvas de referência baseadas no range dos dados
  const maxFreq = Math.max(...data.map((d) => d.frequency)) * 1.5;
  const maxMTTR = Math.max(...data.map((d) => d.mttr)) * 1.5;
  const minFreq = 0.8; // Para log scale funcionar bem (log(1) = 0)
  const minMTTR = 0.8;

  // Gerar curvas
  // Supondo uma "constante de falha" média para desenhar as linhas de iso-disponibilidade
  // Linha Vermelha (Limite): Pega um percentil alto de indisponibilidade dos dados
  const totalDowntimeArr = data.map((d) => d.totalDuration);
  const maxDowntime = Math.max(...totalDowntimeArr);
  const avgDowntime =
    totalDowntimeArr.reduce((a, b) => a + b, 0) / totalDowntimeArr.length;

  // Curva Limite (Vermelha) - Representa alta indisponibilidade
  const kRed = maxDowntime * 0.8;
  // Curva Meta (Azul) - Representa meta de disponibilidade (menor indisponibilidade)
  const kBlue = maxDowntime * 0.2;

  const generateCurve = (k) => {
    const pts = [];
    // Log space iteration
    for (let f = 1; f <= maxFreq * 2; f *= 1.2) {
      const m = k / f;
      if (m > 0.1) pts.push({ x: f, y: m });
    }
    return pts;
  };

  const curveRed = generateCurve(kRed);
  const curveBlue = generateCurve(kBlue);

  return (
    <Card className="h-full p-4 flex flex-col relative overflow-hidden">
      <h4 className="text-xs font-bold uppercase text-slate-500 mb-2 flex justify-between items-center">
        <span>{title}</span>
        <span className="text-[10px] font-normal text-slate-400 normal-case">
          Log-Log Scale
        </span>
      </h4>
      <div className="flex-1 min-h-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              type="number"
              dataKey="frequency"
              name="Frequência"
              scale="log"
              domain={[minFreq, 'auto']}
              allowDataOverflow={true}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              label={{
                value: 'Nº de Eventos (Freq)',
                position: 'bottom',
                offset: 0,
                fontSize: 10,
                fill: '#64748B',
              }}
            />
            <YAxis
              type="number"
              dataKey="mttr"
              name="MTTR"
              scale="log"
              domain={[minMTTR, 'auto']}
              allowDataOverflow={true}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              label={{
                value: 'MTTR (min)',
                angle: -90,
                position: 'insideLeft',
                fontSize: 10,
                fill: '#64748B',
              }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ payload }) => {
                if (payload && payload.length) {
                  const d = payload[0].payload;
                  if (d.bg) return null; // Ignora tooltip das curvas
                  return (
                    <div className="bg-white p-2 border border-slate-200 shadow-xl rounded text-xs z-50">
                      <p className="font-bold text-slate-800 mb-1 border-b border-slate-100 pb-1">
                        {d.name}
                      </p>
                      <div className="space-y-1 text-slate-600">
                        <p>
                          Frequência:{' '}
                          <strong className="text-slate-800">
                            {d.frequency}
                          </strong>
                        </p>
                        <p>
                          MTTR:{' '}
                          <strong className="text-slate-800">
                            {d.mttr.toFixed(1)} min
                          </strong>
                        </p>
                        <p>
                          Total Parado:{' '}
                          <strong className="text-red-600">
                            {(d.totalDuration / 60).toFixed(1)} h
                          </strong>
                        </p>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 italic">
                        Clique para filtrar
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Reference Lines/Curves */}
            <Scatter
              name="Limit"
              data={curveRed}
              line={{
                stroke: COLORS.red,
                strokeWidth: 2,
                strokeDasharray: '5 5',
              }}
              shape={() => null}
              isAnimationActive={false}
              legendType="none"
            />
            <Scatter
              name="Target"
              data={curveBlue}
              line={{
                stroke: COLORS.blue,
                strokeWidth: 2,
                strokeDasharray: '5 5',
              }}
              shape={() => null}
              isAnimationActive={false}
              legendType="none"
            />

            <Scatter
              data={data}
              fill={COLORS.darkGray}
              onClick={(e) => onPointClick && onPointClick(e)}
              cursor="pointer"
            >
              {data.map((entry, index) => {
                const isSelected = selectedId === entry.name;
                const isFaded = selectedId && !isSelected && type === 'equip';

                // Color logic based on quadrant roughly
                // High MTTR & High Freq = Red (Chronic)
                // High MTTR & Low Freq = Yellow (Acute)
                // Low MTTR & High Freq = Yellow (Frequent Minor)
                // Low MTTR & Low Freq = Green (Ideal)
                let fill = COLORS.green;
                const isHighFreq = entry.frequency > maxFreq / 4; // Threshold dinamico simplificado
                const isHighMTTR = entry.mttr > maxMTTR / 4;

                if (isHighFreq && isHighMTTR) fill = COLORS.red;
                else if (isHighFreq || isHighMTTR) fill = COLORS.yellow;

                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={fill}
                    stroke="#475569"
                    strokeWidth={isSelected ? 2 : 1}
                    fillOpacity={isFaded ? 0.1 : 0.7}
                  />
                );
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {/* Legendas Personalizadas das Linhas */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1 pointer-events-none">
          <span className="text-[9px] text-red-500 font-bold bg-white/80 px-1 rounded">
            Limite Disp.
          </span>
          <span className="text-[9px] text-blue-600 font-bold bg-white/80 px-1 rounded">
            Meta Disp.
          </span>
        </div>
      </div>
    </Card>
  );
};

// ... (Outros componentes mantidos iguais: ParetoChart, OEEGaugeCard, BigNumberCard, PillarCard, BridgeChart, TargetChart, Helpers, etc. serão incluídos no código final, reutilizando a lógica existente para economizar espaço visual aqui, mas estarão no arquivo gerado)

const ParetoChart = ({
  data,
  color,
  emptyMessage = 'Sem dados',
  onBarClick,
  selectedName,
}) => {
  if (!data || data.length === 0)
    return (
      <div className="flex h-full items-center justify-center text-gray-400 text-xs italic">
        {emptyMessage}
      </div>
    );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 35, left: 5, bottom: 0 }}
        barCategoryGap={2}
        onClick={(e) => {
          if (
            e &&
            e.activePayload &&
            e.activePayload.length > 0 &&
            onBarClick
          ) {
            onBarClick(e.activePayload[0].payload.name);
          }
        }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          horizontal={false}
          stroke="#E2E8F0"
        />
        <XAxis type="number" hide />
        <YAxis
          dataKey="name"
          type="category"
          width={90}
          tick={{ fontSize: 9, fill: '#475569', fontWeight: 500 }}
          interval={0}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.03)' }}
          contentStyle={{
            fontSize: '11px',
            borderRadius: '8px',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            padding: '8px',
          }}
          formatter={(val) => [`${val} min`, 'Duração']}
        />
        <Bar
          dataKey="value"
          barSize={12}
          radius={[0, 4, 4, 0]}
          cursor="pointer"
        >
          {data.map((entry, index) => {
            const isSelected = selectedName
              ? entry.name === selectedName
              : true;
            return (
              <Cell
                key={`cell-${index}`}
                fill={color || COLORS.orange}
                opacity={isSelected ? 1 : 0.3}
              />
            );
          })}
          <LabelList
            dataKey="value"
            position="right"
            fontSize={9}
            fill="#64748B"
            formatter={(val) => val}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

const OEEGaugeCard = ({ value, target }) => {
  const safeValue = isNaN(value) ? 0 : value;
  const isOk = safeValue >= target;
  const color = isOk ? COLORS.green : COLORS.red;

  const data = [
    { name: 'OEE', value: safeValue, fill: color },
    {
      name: 'Rest',
      value: Math.max(0, 100 - safeValue),
      fill: COLORS.offWhite,
    },
  ];

  return (
    <div
      className="bg-white rounded-xl border-l-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)] h-full flex flex-col relative"
      style={{ borderLeftColor: color }}
    >
      <div className="absolute top-3 left-4 z-10">
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">
          OEE Máquinas
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="55%"
              innerRadius="65%"
              outerRadius="85%"
              startAngle={180}
              endAngle={0}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell key="val" fill={color} />
              <Cell key="rest" fill={COLORS.offWhite} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute top-[55%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center mt-4">
          <span
            className="text-4xl font-bold block leading-none tracking-tight"
            style={{ color: color }}
          >
            {safeValue.toFixed(1)}%
          </span>
          <span className="text-[10px] text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded-full mt-1 inline-block">
            Meta: {target}%
          </span>
        </div>
      </div>
    </div>
  );
};

const BigNumberCard = ({
  title,
  valueNumeric,
  displayValue,
  unit,
  target,
  compact = false,
}) => {
  let statusColor = COLORS.darkGray;
  let adherenceVal = 0;

  if (target > 0 && typeof valueNumeric === 'number' && !isNaN(valueNumeric)) {
    adherenceVal = (valueNumeric / target) * 100;
    statusColor = valueNumeric >= target ? COLORS.green : COLORS.red;
  }

  return (
    <div
      className={`bg-white rounded-xl border-l-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)] flex flex-col justify-between h-full ${
        compact ? 'p-3' : 'p-4'
      }`}
      style={{ borderLeftColor: statusColor }}
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">
          {title}
        </p>
        <div className="flex items-baseline gap-1">
          <h3
            className={`${
              compact ? 'text-2xl' : 'text-3xl'
            } font-bold tracking-tight`}
            style={{ color: statusColor }}
          >
            {displayValue}
          </h3>
          <span className="text-[10px] font-medium text-gray-400">{unit}</span>
        </div>
      </div>
      {!compact && (
        <div className="mt-2 flex justify-between items-center text-[10px] border-t border-slate-50 pt-2">
          <span className="text-gray-400">
            Meta:{' '}
            <strong className="text-slate-600">
              {target.toLocaleString('pt-BR')}
            </strong>
          </span>
          <span
            className={`px-1.5 py-0.5 rounded font-bold ${
              valueNumeric >= target
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {adherenceVal.toLocaleString('pt-BR', {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
            %
          </span>
        </div>
      )}
      {compact && target !== 0 && (
        <div className="mt-1 flex items-center gap-2 text-[10px]">
          <span className="text-gray-400">
            Meta: {target.toLocaleString('pt-BR')}
          </span>
        </div>
      )}
    </div>
  );
};

const PillarCard = ({ title, value, target, icon: Icon }) => {
  const numVal = parseFloat(value) || 0;
  const isOk = numVal >= target;
  const dynamicColor = isOk ? COLORS.green : COLORS.red;

  return (
    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-between relative overflow-hidden h-full group transition-all hover:shadow-md">
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 group-hover:w-2`}
        style={{ backgroundColor: dynamicColor }}
      ></div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide mb-1 text-slate-400">
          {title}
        </p>
        <div className="flex items-baseline gap-1">
          <h3 className="text-xl font-bold" style={{ color: dynamicColor }}>
            {value}%
          </h3>
          <span className="text-[10px] text-gray-400">/ {target}%</span>
        </div>
      </div>
      <div className="p-2 rounded-full bg-slate-50 group-hover:bg-white transition-colors">
        <Icon size={18} style={{ color: dynamicColor }} />
      </div>
    </div>
  );
};

const BridgeLabel = (props) => {
  const { x, y, width, value, index, data } = props;
  const entry = data[index];
  if (!entry) return null;

  const val = entry.label;
  const isGain = val > 0;
  const isTotal = entry.isTotal;

  const yPos = y - 5;

  return (
    <text
      x={x + width / 2}
      y={yPos}
      fill={COLORS.darkGray}
      textAnchor="middle"
      dominantBaseline="baseline"
      fontSize={11}
      fontWeight="bold"
    >
      {isGain && !isTotal ? `+${val}` : val}
    </text>
  );
};

const BridgeChart = ({ aggregates }) => {
  const meta = Math.round(aggregates.targetOvens);
  const actual = Math.round(aggregates.ovensNumeric);
  const pace = aggregates.ritmoMetaMin;

  if (!pace || pace === 0)
    return (
      <div className="flex items-center justify-center h-full text-xs text-gray-400">
        Sem dados de ritmo meta
      </div>
    );

  const loadingTimeReal = aggregates.loadingMins;
  const franchiseFailMins = loadingTimeReal * (1 - TARGETS.AVAIL / 100);
  const realFailMins = aggregates.failLossMins;
  const varFailMins = franchiseFailMins - realFailMins;
  const stepFail = Math.round(varFailMins / pace);

  const varOtherDispMins = 0 - aggregates.schedMaintLossMins;
  const stepOtherDisp = Math.round(varOtherDispMins / pace);

  const varPlannedMaintMins =
    aggregates.targetMaintMins - aggregates.usedMaintMins;
  const stepPlanned = Math.round(varPlannedMaintMins / pace);

  const varUtilMins =
    0 -
    (aggregates.opsLossMins +
      aggregates.shiftLossMins +
      aggregates.extProdMins +
      aggregates.outsideProdMins);
  const stepUtil = Math.round(varUtilMins / pace);

  const stepRhythm =
    actual - meta - stepFail - stepOtherDisp - stepPlanned - stepUtil;

  const steps = [
    { name: 'Falhas', val: stepFail, type: 'disp' },
    { name: 'Outros Disp', val: stepOtherDisp, type: 'disp' },
    { name: 'Planejadas', val: stepPlanned, type: 'disp' },
    { name: 'Utilização', val: stepUtil, type: 'perf' },
    { name: 'Forno a Forno', val: stepRhythm, type: 'perf' },
  ].sort((a, b) => a.val - b.val);

  const data = [
    {
      name: 'Meta',
      base: 0,
      value: meta,
      label: meta,
      isTotal: true,
      type: 'start',
    },
  ];

  let runningTotal = meta;

  steps.forEach((step) => {
    const isGain = step.val >= 0;
    const absVal = Math.abs(step.val);

    let base;
    if (isGain) {
      base = runningTotal;
      runningTotal += step.val;
    } else {
      runningTotal += step.val;
      base = runningTotal;
    }

    data.push({
      name: step.name,
      base: base,
      value: absVal,
      label: step.val,
      isTotal: false,
      category: step.type,
      type: isGain ? 'gain' : 'loss',
    });
  });

  data.push({
    name: 'Realizado',
    base: 0,
    value: actual,
    label: actual,
    isTotal: true,
    type: 'end',
  });

  const getBarColor = (entry) => {
    if (entry.type === 'start') return COLORS.darkGray;
    if (entry.type === 'end') return COLORS.blue;
    return entry.label >= 0 ? COLORS.green : COLORS.red;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 25, right: 10, left: 10, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#E5E7EB"
        />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 9, fill: '#64748B' }}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.05)' }}
          content={({ payload, label }) => {
            if (!payload || payload.length === 0) return null;
            const dataPoint = payload[1].payload;
            return (
              <div className="bg-white p-2 border border-slate-200 shadow-lg rounded text-xs">
                <p className="font-bold mb-1 text-slate-700">
                  {dataPoint.name}
                </p>
                <p
                  style={{ color: getBarColor(dataPoint) }}
                  className="font-bold"
                >
                  {dataPoint.isTotal
                    ? `Valor: ${dataPoint.label}`
                    : `Impacto: ${dataPoint.label > 0 ? '+' : ''}${
                        dataPoint.label
                      } fornos`}
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="base" stackId="a" fill="transparent" />
        <Bar dataKey="value" stackId="a" radius={[3, 3, 3, 3]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
          ))}
          <LabelList dataKey="label" content={<BridgeLabel data={data} />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

const TargetChart = ({
  data,
  dataKey,
  target,
  title,
  colorLine,
  yMax = 110,
  onBarClick,
  selectedKey,
}) => {
  return (
    <Card className="p-3 h-full flex flex-col cursor-pointer transition hover:border-blue-300 group">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-xs font-bold uppercase text-slate-600 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
          Meta: {target}%
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
            onClick={(e) => {
              if (e && e.activePayload && e.activePayload.length > 0) {
                onBarClick(e.activePayload[0].payload.key);
              }
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#E5E7EB"
            />
            <XAxis
              dataKey="label"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#94A3B8' }}
              dy={5}
            />
            <YAxis
              domain={[0, yMax]}
              fontSize={9}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#94A3B8' }}
            />
            <Tooltip
              cursor={{ fill: '#F1F5F9' }}
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                fontSize: '12px',
              }}
            />
            <ReferenceLine
              y={target}
              stroke={COLORS.darkGray}
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <Bar dataKey={dataKey} barSize={20} radius={[3, 3, 0, 0]}>
              {data.map((entry, index) => {
                const isSelected = selectedKey
                  ? entry.key === selectedKey
                  : true;
                const baseColor =
                  entry[dataKey] >= target ? COLORS.green : COLORS.red;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={baseColor}
                    opacity={isSelected ? 1 : 0.2}
                    cursor="pointer"
                  />
                );
              })}
            </Bar>
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={colorLine}
              strokeWidth={2}
              dot={{ r: 1 }}
              activeDot={{ r: 4 }}
              opacity={selectedKey ? 0.3 : 1}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// --- ETL HELPERS ---
const parseNumber = (val) => {
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

const parseDate = (val) => {
  if (!val) return null;
  if (typeof val === 'number') {
    if (val < 20000) return null;
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() + offset);
  }
  if (typeof val === 'string') {
    const match = val.match(
      /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:\s(\d{1,2}):(\d{1,2}))?/
    );
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

const getProductionDate = (date) => {
  const d = new Date(date);
  if (d.getHours() >= 12) d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDateISO = (date) => {
  if (!date || isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
};

const formatDateDisplay = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}`;
};

const getMinutesInsideWindow = (start, end) => {
  if (!start || !end) return { total: 0, inside: 0, outside: 0 };
  let totalDur = (end - start) / 1000 / 60;
  if (totalDur < 0) totalDur = 0;
  const hStart = start.getHours();
  const isInside = hStart >= 8 && hStart < 17;
  return {
    total: totalDur,
    inside: isInside ? totalDur : 0,
    outside: isInside ? 0 : totalDur,
  };
};

const getAggregationKey = (dateStr, type) => {
  const d = dayjs(dateStr);
  switch (type) {
    case 'day':
      return { key: dateStr, label: d.format('DD/MM') };
    case 'week':
      return {
        key: `${d.year()}-W${d.isoWeek()}`,
        label: `Sem ${d.isoWeek()}`,
      };
    case 'fortnight':
      return {
        key: `${d.format('YYYY-MM')}-${d.date() <= 15 ? '1' : '2'}`,
        label: `${d.format('MMM')}-${d.date() <= 15 ? '1ª Qinz' : '2ª Qinz'}`,
      };
    case 'month':
      return { key: d.format('YYYY-MM'), label: d.format('MMM/YY') };
    case 'quarter':
      return {
        key: `${d.year()}-Q${d.quarter()}`,
        label: `${d.year()} T${d.quarter()}`,
      };
    case 'year':
      return { key: d.format('YYYY'), label: d.format('YYYY') };
    default:
      return { key: dateStr, label: dateStr };
  }
};

export default function App() {
  const [step, setStep] = useState('upload');
  const [activeTab, setActiveTab] = useState('overview');
  const [aggregation, setAggregation] = useState('month');
  const [filterSelection, setFilterSelection] = useState(null);
  const [lossFilter, setLossFilter] = useState(null);
  const [equipmentFilter, setEquipmentFilter] = useState(null);

  // States for Jack Knife
  const [selectedEquipJackKnife, setSelectedEquipJackKnife] = useState(null);

  const [files, setFiles] = useState({ stop: null, prod: null });
  const [loading, setLoading] = useState(false);
  const [errorLog, setErrorLog] = useState('');

  const [rawData, setRawData] = useState({ stops: [], prod: {} });
  const [auditStats, setAuditStats] = useState(null);
  const [ignoredLog, setIgnoredLog] = useState([]);
  const [showLog, setShowLog] = useState(false);

  const [calculatedData, setCalculatedData] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    setFilterSelection(null);
  }, [aggregation, dateRange]);

  const handleBarToggle = (key) => {
    if (filterSelection === key) {
      setFilterSelection(null);
    } else {
      setFilterSelection(key);
    }
  };

  const toggleLossFilter = (type) => {
    if (lossFilter === type) setLossFilter(null);
    else setLossFilter(type);
  };

  const handleEquipmentToggle = (equipName) => {
    if (equipmentFilter === equipName) setEquipmentFilter(null);
    else setEquipmentFilter(equipName);
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleProcess = async () => {
    if (!files.stop || !files.prod) return alert('Selecione os arquivos.');
    setLoading(true);
    setErrorLog('');
    setIgnoredLog([]);

    try {
      const stopBuffer = await files.stop.arrayBuffer();
      const wbStop = window.XLSX.read(stopBuffer, { type: 'array' });
      const wsStop =
        wbStop.Sheets[
          wbStop.SheetNames.find(
            (n) => n.includes('Apont') || n.includes('Dados')
          ) || wbStop.SheetNames[0]
        ];
      const rowsStop = window.XLSX.utils.sheet_to_json(wsStop, {
        header: 1,
        defval: null,
      });

      let hIdx = -1;
      for (let i = 0; i < Math.min(rowsStop.length, 50); i++) {
        const rStr = JSON.stringify(rowsStop[i]).toLowerCase();
        if (
          rStr.includes('processo') &&
          (rStr.includes('duração') || rStr.includes('duracao'))
        ) {
          hIdx = i;
          break;
        }
      }
      if (hIdx === -1)
        throw new Error(
          "Cabeçalho 'Processo' não encontrado no arquivo de paradas."
        );

      const headStop = rowsStop[hIdx].map((h) =>
        String(h).trim().toLowerCase()
      );
      const idxS = {
        proc: headStop.findIndex((h) => h.includes('processo')),
        parou: headStop.findIndex((h) => h.includes('parou')),
        inicio: headStop.findIndex(
          (h) => h.includes('início') || h.includes('inicio')
        ),
        fim: headStop.findIndex((h) => h.includes('fim')),
        area: headStop.findIndex(
          (h) => h.includes('área') || h.includes('responsável')
        ),
        tipo: headStop.findIndex((h) => h.includes('tipo')),
        desc: headStop.findIndex((h) => h.includes('descrição')),
        equip: headStop.findIndex(
          (h) => h.includes('equipamento') || h.includes('tag')
        ),
        comp: headStop.findIndex(
          (h) => h.includes('componente') || h.includes('causa')
        ),
        modo: headStop.findIndex(
          (h) =>
            h.includes('modo') || h.includes('desvio') || h.includes('falha')
        ),
        bateria: headStop.findIndex(
          (h) =>
            h.includes('bateria') ||
            h.includes('local') ||
            h.includes('área executante')
        ),
        quench: 5, // Default for F
      };

      const quenchIdx = headStop.findIndex((h) => h.includes('quench'));
      if (quenchIdx > -1) idxS.quench = quenchIdx;

      const cleanStops = [];
      const ignored = [];
      let totalStopDuration = 0;
      let maintenanceDuration = 0;

      for (let i = hIdx + 1; i < rowsStop.length; i++) {
        const r = rowsStop[i];
        if (!r || r.length === 0) continue;

        const valProc = String(r[idxS.proc] || '')
          .trim()
          .toLowerCase();
        if (!valProc.includes('maquina') && !valProc.includes('máquina')) {
          ignored.push({ row: i + 1, reason: `Processo: ${valProc}` });
          continue;
        }

        const valParou = String(r[idxS.parou] || '')
          .trim()
          .toLowerCase();

        const start = parseDate(r[idxS.inicio]);
        const end = parseDate(r[idxS.fim]);
        if (!start || !end) {
          ignored.push({ row: i + 1, reason: `Data Inválida` });
          continue;
        }

        const prodDate = getProductionDate(start);
        const dateStr = formatDateISO(prodDate);
        if (!dateStr) {
          ignored.push({ row: i + 1, reason: `Erro ISO` });
          continue;
        }

        const duration = (end - start) / 1000 / 60;
        const safeDuration = isNaN(duration) || duration < 0 ? 0 : duration;

        if (valParou.includes('sim')) {
          totalStopDuration += safeDuration;
          const area = String(r[idxS.area] || '').trim();
          if (area.toLowerCase().includes('manut'))
            maintenanceDuration += safeDuration;
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
          quench: String(r[idxS.quench] || '').trim(),
        });
      }

      const prodBuffer = await files.prod.arrayBuffer();
      const wbProd = window.XLSX.read(prodBuffer, { type: 'array' });
      const sheetProdName = wbProd.SheetNames.find(
        (n) =>
          n.toLowerCase().includes('production') ||
          n.toLowerCase().includes('produção')
      );
      if (!sheetProdName) throw new Error("Aba 'Production' não encontrada.");

      const wsProd = wbProd.Sheets[sheetProdName];
      const rowsProd = window.XLSX.utils.sheet_to_json(wsProd, {
        header: 1,
        defval: null,
      });

      const cleanProd = {};
      let minDateFound = null,
        maxDateFound = null;
      let totalFornos = 0,
        totalProdReal = 0,
        totalWater = 0;

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
          realCoke,
          ovens,
          yield: rawYield,
          water,
          wetCharge,
        };
      }

      let daysSpan = 0;
      if (minDateFound && maxDateFound) {
        const diffTime = Math.abs(maxDateFound - minDateFound);
        daysSpan = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }

      setRawData({ stops: cleanStops, prod: cleanProd });
      setAuditStats({
        stops: {
          count: cleanStops.length,
          totalHours: (totalStopDuration / 60).toFixed(1),
          maintHours: (maintenanceDuration / 60).toFixed(1),
        },
        prod: {
          days: daysSpan,
          ovens: totalFornos,
          prodTons: totalProdReal.toFixed(0),
          water: totalWater.toFixed(0),
        },
      });
      setIgnoredLog(ignored);
      setStep('audit');
    } catch (e) {
      setErrorLog(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAudit = () => {
    const dates = Object.keys(rawData.prod).sort();
    if (dates.length > 0) {
      const start = dates[0];
      const today = new Date();
      today.setDate(today.getDate() - 1);
      const yesterdayIso = formatDateISO(today);
      const maxDataDate = dates[dates.length - 1];
      const end =
        yesterdayIso && yesterdayIso < maxDataDate ? yesterdayIso : maxDataDate;
      setDateRange({ start, end });
    }
    setStep('dashboard');
  };

  useEffect(() => {
    if (step !== 'dashboard') return;
    const { stops, prod } = rawData;
    const dates = Object.keys(prod).sort();
    if (dates.length === 0 || !dateRange.start || !dateRange.end) return;

    const start = dateRange.start;
    const end = dateRange.end;
    const results = [];

    dates.forEach((dateKey) => {
      if (dateKey < start || dateKey > end) return;
      const p = prod[dateKey];
      let s = stops.filter((stop) => stop.dateStr === dateKey);

      if (equipmentFilter) {
        s = s.filter((stop) => stop.equip === equipmentFilter);
      }

      const HOURS_PER_DAY = 48;
      const TARGET_BUCKET = 10 * 60; // 600 min totais
      const TARGET_BUCKET_QUENCH = 5 * 60; // 300 min por quench
      const dayOfWeek = p.date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      let dailyJanelaInsideNorte = 0;
      let dailyJanelaInsideSul = 0;
      let dailyJanelaOutside = 0;
      let failureLoss = 0;
      let shiftChange = 0,
        opsLoss = 0;

      s.forEach((ev) => {
        const timeData = getMinutesInsideWindow(ev.start, ev.end);
        const areaLower = ev.area.toLowerCase();
        const bateriaLower = (ev.bateria || '').toLowerCase();
        const quenchLower = (ev.quench || '').toLowerCase();
        const parouSim = (ev.parou || '').toLowerCase().includes('sim');

        const isJanela =
          bateriaLower.includes('janela a/b') ||
          bateriaLower.includes('janela c/d');
        const isMaint = areaLower.includes('manut');
        const isProd =
          areaLower.includes('produção') ||
          areaLower.includes('producao') ||
          areaLower.includes('externo');

        const isTurno =
          (ev.modo + ev.desc).toLowerCase().includes('turno') ||
          (ev.modo + ev.desc).toLowerCase().includes('passagem');

        if (isJanela) {
          if (quenchLower.includes('norte') || quenchLower.includes('north')) {
            dailyJanelaInsideNorte += timeData.inside;
          } else {
            dailyJanelaInsideSul += timeData.inside;
          }
          dailyJanelaOutside += timeData.outside;
        } else if (isTurno) {
          shiftChange += timeData.total;
        } else if (parouSim) {
          if (isMaint) failureLoss += timeData.total;
          else if (isProd) {
            opsLoss += timeData.total;
          }
        }
      });

      const usedMaintNorte = Math.min(
        dailyJanelaInsideNorte,
        TARGET_BUCKET_QUENCH
      );
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
      const netOperating = Math.max(0, operating - lossUtil);

      const avail = loading > 0 ? operating / loading : 0;
      const perfFinal = operating > 0 ? (operating - lossUtil) / operating : 0;
      const qual = p.yield / 100;
      const oee = avail * perfFinal * qual;

      results.push({
        date: dateKey,
        day: formatDateDisplay(dateKey),
        calendar,
        loading,
        operating,
        lossDisp,
        lossUtil,
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
        usedProd,
      });
    });

    const grouped = {};
    results.forEach((day) => {
      const { key, label } = getAggregationKey(day.date, aggregation);
      if (!grouped[key]) {
        grouped[key] = {
          key,
          label,
          loading: 0,
          operating: 0,
          lossUtil: 0,
          ovens: 0,
          yieldSum: 0,
          yieldCount: 0,
          days: 0,
          lossDisp: 0,
          water: 0,
          failureLoss: 0,
          extMaint: 0,
          outsideMaint: 0,
          shiftChange: 0,
          opsLoss: 0,
          extProd: 0,
          outsideProd: 0,
          targetMaint: 0,
          usedMaint: 0,
          loadingMins: 0,
          usedProd: 0,
        };
      }
      const g = grouped[key];
      g.loading += day.loading;
      g.operating += day.operating;
      g.lossUtil += day.lossUtil;
      g.ovens += day.ovens;
      if (day.yield > 0) {
        g.yieldSum += day.yield;
        g.yieldCount++;
      }
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

    let finalResults = Object.values(grouped).map((g) => {
      const avail = g.loading > 0 ? g.operating / g.loading : 0;
      const perf =
        g.operating > 0 ? (g.operating - g.lossUtil) / g.operating : 0;
      const avgYield = g.yieldCount > 0 ? g.yieldSum / g.yieldCount : 0;
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
    finalResults = finalResults.map((item) => {
      accDisp += item.lossDisp;
      accUtil += item.lossUtil;
      return {
        ...item,
        accLossDisp: accDisp,
        accLossUtil: accUtil,
      };
    });

    setCalculatedData(finalResults);
  }, [dateRange, step, aggregation, equipmentFilter]);

  const activeAggregates = useMemo(() => {
    const dataToAggregate = filterSelection
      ? calculatedData.filter((d) => d.key === filterSelection)
      : calculatedData;

    if (dataToAggregate.length === 0) return null;

    const sum = (key) => dataToAggregate.reduce((a, b) => a + b[key], 0);
    const avg = (key) => sum(key) / dataToAggregate.length;

    const totalDays = sum('days');
    const targetOvens = 160 * totalDays;
    const totalOvens = sum('ovens');
    const avgOee = avg('oee');

    const ritmoMin = totalOvens > 0 ? sum('operating') / totalOvens : 0;
    const ritmoMetaMin = targetOvens > 0 ? sum('loading') / targetOvens : 0;

    const targetShiftChange = totalDays * 3;

    const checkDays = new Set();

    rawData.stops.forEach((s) => {
      if (s.dateStr < dateRange.start || s.dateStr > dateRange.end) return;
      checkDays.add(s.dateStr);
    });

    let winStartOkNorte = 0,
      winStartOkSul = 0;
    let winEndOkNorte = 0,
      winEndOkSul = 0;
    let winInsideOkNorte = 0,
      winInsideOkSul = 0;
    let winDurPctNorteSum = 0,
      winDurPctSulSum = 0;
    let winFreqScoreSum = 0;

    let daysWithStopNorte = 0;
    let daysWithStopSul = 0;

    Array.from(checkDays).forEach((dateStr) => {
      const dayStops = rawData.stops.filter((s) => s.dateStr === dateStr);

      let hasNorte = false;
      let hasSul = false;

      let minStartNorte = null,
        maxEndNorte = null;
      let minStartSul = null,
        maxEndSul = null;

      let durNorte = 0;
      let durSul = 0;

      dayStops.forEach((s) => {
        const bateriaLower = (s.bateria || '').toLowerCase();
        const isJanela =
          bateriaLower.includes('janela a/b') ||
          bateriaLower.includes('janela c/d');

        if (isJanela) {
          const quenchLower = (s.quench || '').toLowerCase();
          const isNorte =
            quenchLower.includes('norte') || quenchLower.includes('north');

          if (isNorte) {
            hasNorte = true;
            durNorte += s.duration;
            if (!minStartNorte || s.start < minStartNorte)
              minStartNorte = s.start;
            if (!maxEndNorte || s.end > maxEndNorte) maxEndNorte = s.end;
          } else {
            hasSul = true;
            durSul += s.duration;
            if (!minStartSul || s.start < minStartSul) minStartSul = s.start;
            if (!maxEndSul || s.end > maxEndSul) maxEndSul = s.end;
          }
        }
      });

      const targetStartH = 8,
        targetStartM = 0;
      const targetEndH = 13,
        targetEndM = 0; // 13:00
      const tol = 15; // min

      const absStartH = 8,
        absStartM = 0;
      const absEndH = 17,
        absEndM = 0;

      const checkTime = (dateObj, targetH, targetM, tolerance) => {
        if (!dateObj) return false;
        const h = dateObj.getHours();
        const m = dateObj.getMinutes();
        const diff = h * 60 + m - (targetH * 60 + targetM);
        return Math.abs(diff) <= tolerance;
      };

      const checkInside = (startObj, endObj) => {
        if (!startObj || !endObj) return false;
        const sVal = startObj.getHours() * 60 + startObj.getMinutes();
        const eVal = endObj.getHours() * 60 + endObj.getMinutes();
        const minVal = absStartH * 60 + absStartM;
        const maxVal = absEndH * 60 + absEndM;
        return sVal >= minVal && eVal <= maxVal;
      };

      if (hasNorte) {
        daysWithStopNorte++;
        if (checkTime(minStartNorte, targetStartH, targetStartM, tol))
          winStartOkNorte++;
        if (checkTime(maxEndNorte, targetEndH, targetEndM, tol))
          winEndOkNorte++;
        if (checkInside(minStartNorte, maxEndNorte)) winInsideOkNorte++;
      }
      winDurPctNorteSum += Math.min(100, (durNorte / 300) * 100);

      if (hasSul) {
        daysWithStopSul++;
        if (checkTime(minStartSul, targetStartH, targetStartM, tol))
          winStartOkSul++;
        if (checkTime(maxEndSul, targetEndH, targetEndM, tol)) winEndOkSul++;
        if (checkInside(minStartSul, maxEndSul)) winInsideOkSul++;
      }
      winDurPctSulSum += Math.min(100, (durSul / 300) * 100);

      if (hasNorte || hasSul) {
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
      lossDispH: (sum('lossDisp') / 60).toFixed(1),
      lossUtilH: (sum('lossUtil') / 60).toFixed(1),
      lossFailH: (sum('failureLoss') / 60).toFixed(1),
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

      // Window Metrics
      windowTotalDays: checkDays.size,

      daysWithStopNorte,
      daysWithStopSul,
      daysWithoutStopNorte: checkDays.size - daysWithStopNorte,
      daysWithoutStopSul: checkDays.size - daysWithStopSul,

      winStartOkNorte,
      winStartOkSul,
      winEndOkNorte,
      winEndOkSul,
      winInsideOkNorte,
      winInsideOkSul,

      windowAvgDurNorte: (winDurPctNorteSum / totalDaysWindow).toFixed(0),
      windowAvgDurSul: (winDurPctSulSum / totalDaysWindow).toFixed(0),

      windowFreqScore: (winFreqScoreSum / totalDaysWindow).toFixed(0),
    };
  }, [calculatedData, filterSelection, rawData, dateRange]);

  const treeStats = useMemo(() => {
    const dataToUse = filterSelection
      ? calculatedData.filter((d) => d.key === filterSelection)
      : calculatedData;
    if (dataToUse.length === 0) return null;

    const sum = (k) => dataToUse.reduce((a, b) => a + b[k], 0);

    const loading = sum('loading');
    const operating = sum('operating');
    const netOperating = Math.max(0, operating - sum('lossUtil'));
    const failLoss = sum('failureLoss');
    const schedMaintLoss = sum('extMaint') + sum('outsideMaint');
    const shiftLoss = sum('shiftChange');
    const opsLossSum = sum('opsLoss');
    const rhythmLossSum = sum('extProd') + sum('outsideProd');
    const avgYield =
      dataToUse.length > 0
        ? dataToUse.reduce((a, b) => a + b.qual, 0) / dataToUse.length / 100
        : 0;
    const fullyProductive = netOperating * avgYield;
    const lossQualityTime = netOperating - fullyProductive;
    const targetLossDisp = loading * (1 - TARGETS.AVAIL / 100);
    const targetLossPerfTotal = operating * (1 - TARGETS.PERF / 100);
    const targetLossQual = netOperating * (1 - TARGETS.QUAL / 100);

    return {
      loading: (loading / 60).toFixed(1),
      operating: (operating / 60).toFixed(1),
      netOperating: (netOperating / 60).toFixed(1),
      fullyProductive: (fullyProductive / 60).toFixed(1),
      lossDisp: (sum('lossDisp') / 60).toFixed(1),
      failLoss: {
        val: (failLoss / 60).toFixed(1),
        target: (targetLossDisp / 60).toFixed(1),
      },
      schedMaintLoss: { val: (schedMaintLoss / 60).toFixed(1), target: 0 },
      lossPerf: (sum('lossUtil') / 60).toFixed(1),
      shiftLoss: { val: (shiftLoss / 60).toFixed(1), target: 0 },
      rhythmLoss: {
        val: (rhythmLossSum / 60).toFixed(1),
        target: (targetLossPerfTotal / 60).toFixed(1),
      },
      opsLoss: { val: (opsLossSum / 60).toFixed(1), target: 0 },
      lossQual: {
        val: (lossQualityTime / 60).toFixed(1),
        target: (targetLossQual / 60).toFixed(1),
      },
    };
  }, [calculatedData, filterSelection]);

  // --- LOGICA JACK KNIFE ---
  const jackKnifeData = useMemo(() => {
    if (!rawData.stops || rawData.stops.length === 0)
      return { equip: [], comp: [], noise: [] };

    // Filtrar stops válidos (Manutenção Corretiva)
    const validStops = rawData.stops.filter((s) => {
      if (s.dateStr < dateRange.start || s.dateStr > dateRange.end)
        return false;
      // Jack Knife foca em paradas técnicas/falhas
      const areaLower = s.area.toLowerCase();
      const tipoLower = (s.tipo || '').toLowerCase();
      const isMaint =
        areaLower.includes('manut') ||
        tipoLower.includes('corretiva') ||
        tipoLower.includes('quebra');
      const isJanela = (s.bateria || '').toLowerCase().includes('janela');
      return isMaint && !isJanela && s.parou.includes('sim');
    });

    // Group by Equip
    const equipMap = {};
    validStops.forEach((s) => {
      const equip = s.equip || 'Sem Tag';
      if (!equipMap[equip])
        equipMap[equip] = {
          name: equip,
          frequency: 0,
          totalDuration: 0,
          mttr: 0,
        };
      equipMap[equip].frequency += 1;
      equipMap[equip].totalDuration += s.duration;
    });

    // Calc MTTR Equip
    let equipData = Object.values(equipMap).map((d) => ({
      ...d,
      mttr: d.totalDuration / d.frequency,
    }));

    // Group by Component (All)
    const compMap = {};
    validStops.forEach((s) => {
      const equip = s.equip || 'Sem Tag';
      const comp = s.comp || 'Geral';
      const key = `${equip} | ${comp}`;
      if (!compMap[key])
        compMap[key] = {
          name: key,
          compName: comp,
          parentEquip: equip,
          frequency: 0,
          totalDuration: 0,
          mttr: 0,
        };
      compMap[key].frequency += 1;
      compMap[key].totalDuration += s.duration;
    });

    let compData = Object.values(compMap).map((d) => ({
      ...d,
      mttr: d.totalDuration / d.frequency,
    }));

    // --- LOGICA DE RUÍDO (NOISE) ---
    // "Dados com apenas 1 evento, mttr na zona ideal (baixo) e somado aos 20 do 80/20"
    // Simplificação: Freq = 1 e MTTR baixo (< media ou < limite)
    // Vamos considerar ruído: Freq == 1 e MTTR < 30 min (exemplo de corte)
    const noiseThresholdMTTR = 30;

    const noiseList = [];
    const cleanEquipData = [];

    equipData.forEach((d) => {
      if (d.frequency === 1 && d.mttr < noiseThresholdMTTR) {
        noiseList.push(d);
      } else {
        cleanEquipData.push(d);
      }
    });

    return {
      equip: cleanEquipData,
      comp: compData, // Componentes serão filtrados no render com base no equip selecionado
      noise: noiseList,
    };
  }, [rawData, dateRange]);

  const { topEquipmentsData, topCausesData } = useMemo(() => {
    if (!rawData.stops || rawData.stops.length === 0)
      return { topEquipmentsData: [], topCausesData: [] };
    const activeStops = rawData.stops.filter((s) => {
      if (s.dateStr < dateRange.start || s.dateStr > dateRange.end)
        return false;
      if (
        filterSelection &&
        s.dateStr !== filterSelection &&
        getAggregationKey(s.dateStr, aggregation).key !== filterSelection
      )
        return false;
      return true;
    });
    const reasonsEquip = {};
    const reasonsCause = {};
    activeStops.forEach((s) => {
      const parouSim = (s.parou || '').toLowerCase().includes('sim');
      const bateriaLower = (s.bateria || '').toLowerCase();
      const isJanela =
        bateriaLower.includes('janela a/b') ||
        bateriaLower.includes('janela c/d');
      if (!parouSim && !isJanela) return;
      const areaLower = s.area.toLowerCase();
      const tipoLower = (s.tipo || '').toLowerCase();
      const isMaint =
        areaLower.includes('manut') ||
        tipoLower.includes('corretiva') ||
        tipoLower.includes('quebra');
      if (lossFilter === 'availability' && !isMaint && !isJanela) return;
      if (lossFilter === 'performance' && isMaint) return;
      const equipLabel = s.equip && s.equip !== '' ? s.equip : 'Sem Tag';
      reasonsEquip[equipLabel] = (reasonsEquip[equipLabel] || 0) + s.duration;
      if (equipmentFilter && s.equip !== equipmentFilter) return;
      let causeLabel = 'Não identificado';
      if (s.comp || s.modo) causeLabel = `${s.comp || '?'} - ${s.modo || '?'}`;
      else causeLabel = s.desc || s.tipo || 'Geral';
      if (causeLabel.length > 35)
        causeLabel = causeLabel.substring(0, 35) + '...';
      reasonsCause[causeLabel] = (reasonsCause[causeLabel] || 0) + s.duration;
    });
    const processPareto = (obj) =>
      Object.entries(obj)
        .map(([name, value]) => ({ name, value: Math.round(value) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    return {
      topEquipmentsData: processPareto(reasonsEquip),
      topCausesData: processPareto(reasonsCause),
    };
  }, [
    rawData,
    dateRange,
    filterSelection,
    aggregation,
    lossFilter,
    equipmentFilter,
  ]);

  return (
    <div className="h-screen flex flex-col font-sans text-slate-700 bg-slate-50 overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex flex-col gap-3 shadow-sm shrink-0 z-20">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500 text-white shadow-md shadow-orange-200">
              <Activity size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800 leading-none">
                Portal OEE{' '}
                <span className="text-orange-500 font-light">Analytics</span>
              </h1>
              <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">
                Heat Recovery System • Máquinas
              </p>
              <p className="text-[10px] text-orange-500 font-bold mt-0.5 uppercase tracking-wide">
                ENGENHARIA DE CONFIABILIDADE
              </p>
            </div>
          </div>
        </div>

        {step === 'dashboard' && (
          <div className="flex items-center justify-between">
            <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeTab === 'overview'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Visão Geral
              </button>
              <button
                onClick={() => setActiveTab('tree')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeTab === 'tree'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Árvore OEE
              </button>
              <button
                onClick={() => setActiveTab('losses')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeTab === 'losses'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Análise de Perdas
              </button>
              <button
                onClick={() => setActiveTab('reliability')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeTab === 'reliability'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Confiabilidade
              </button>
              <button
                onClick={() => setActiveTab('breakdown')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeTab === 'breakdown'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Desdobramento OEE
              </button>
              <button
                onClick={() => setActiveTab('verification')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeTab === 'verification'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Verificação
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative group">
                <select
                  value={aggregation}
                  onChange={(e) => setAggregation(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 text-slate-700 py-1.5 pl-3 pr-8 rounded-lg text-xs font-bold focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm hover:border-slate-300 transition-colors"
                >
                  <option value="day">Diário</option>
                  <option value="week">Semanal</option>
                  <option value="fortnight">Quinzenal</option>
                  <option value="month">Mensal</option>
                  <option value="quarter">Trimestral</option>
                  <option value="year">Anual</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2 top-2 text-slate-400 pointer-events-none group-hover:text-slate-600"
                />
              </div>
              <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange((p) => ({ ...p, start: e.target.value }))
                  }
                  className="bg-transparent text-xs font-medium focus:outline-none text-slate-700"
                />
                <span className="text-slate-300 text-xs">→</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange((p) => ({ ...p, end: e.target.value }))
                  }
                  className="bg-transparent text-xs font-medium focus:outline-none text-slate-700"
                />
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 p-6 w-full h-full max-w-[1920px] mx-auto overflow-hidden">
        {step === 'upload' && (
          <div className="h-full flex items-center justify-center animate-fade-in">
            <Card className="p-10 max-w-2xl w-full">
              <h2 className="text-lg font-bold mb-8 flex items-center gap-2 text-slate-700">
                <Database className="text-orange-600" /> Ingestão de Dados
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 hover:border-orange-400 transition-all group cursor-pointer">
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    accept=".xlsx,.csv"
                    onChange={(e) =>
                      setFiles({ ...files, stop: e.target.files[0] })
                    }
                  />
                  <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <AlertTriangle style={{ color: COLORS.red }} />
                  </div>
                  <p className="font-bold text-sm text-slate-700">
                    Apontamentos
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {files.stop ? files.stop.name : 'Arraste ou clique'}
                  </p>
                  {files.stop && (
                    <div className="mt-2 text-xs font-bold text-green-600 flex justify-center items-center gap-1">
                      <CheckCircle size={12} /> Carregado
                    </div>
                  )}
                </div>
                <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 hover:border-green-400 transition-all group cursor-pointer">
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    accept=".xlsx,.xlsm"
                    onChange={(e) =>
                      setFiles({ ...files, prod: e.target.files[0] })
                    }
                  />
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Activity style={{ color: COLORS.green }} />
                  </div>
                  <p className="font-bold text-sm text-slate-700">Produção</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {files.prod ? files.prod.name : 'Arraste ou clique'}
                  </p>
                  {files.prod && (
                    <div className="mt-2 text-xs font-bold text-green-600 flex justify-center items-center gap-1">
                      <CheckCircle size={12} /> Carregado
                    </div>
                  )}
                </div>
              </div>
              {errorLog && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-3">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">Erro na importação:</p>
                    <p>{errorLog}</p>
                  </div>
                </div>
              )}
              <button
                onClick={handleProcess}
                disabled={loading || !files.stop || !files.prod}
                className="w-full text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all disabled:opacity-50 flex justify-center items-center gap-2 bg-slate-800 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <RefreshCw className="animate-spin" />
                ) : (
                  <ArrowRight />
                )}
                {loading ? 'Processando...' : 'Iniciar Auditoria'}
              </button>
            </Card>
          </div>
        )}

        {step === 'audit' && auditStats && (
          <div className="h-full flex items-center justify-center animate-fade-in">
            <div className="max-w-5xl w-full">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    Validação de Dados
                  </h2>
                  <p className="text-sm text-slate-500">
                    Confira os totais identificados antes de calcular o OEE.
                  </p>
                </div>
                <div className="flex gap-4">
                  {ignoredLog.length > 0 && (
                    <button
                      onClick={() => setShowLog(!showLog)}
                      className="text-sm text-red-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <Info size={16} /> {ignoredLog.length} Linhas Ignoradas
                    </button>
                  )}
                  <button
                    onClick={handleConfirmAudit}
                    className="text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle size={18} /> Confirmar e Calcular
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card
                  className="p-6 border-t-4"
                  style={{ borderTopColor: COLORS.red }}
                >
                  <h3 className="font-bold mb-6 flex items-center gap-2 text-slate-700">
                    <FileSearch style={{ color: COLORS.red }} /> Auditoria de
                    Paradas
                  </h3>
                  <div className="space-y-4">
                    <AuditStat
                      label="Eventos Válidos"
                      value={auditStats.stops.count}
                      sub="Filtro: Máquinas + Parou"
                      color={COLORS.darkGray}
                      icon={AlertTriangle}
                    />
                    <AuditStat
                      label="Tempo Total"
                      value={auditStats.stops.totalHours + ' h'}
                      sub="Soma bruta"
                      color={COLORS.red}
                      icon={Clock}
                    />
                    <AuditStat
                      label="Manutenção"
                      value={auditStats.stops.maintHours + ' h'}
                      sub="Área Técnica"
                      color={COLORS.orange}
                      icon={Settings}
                    />
                  </div>
                </Card>
                <Card
                  className="p-6 border-t-4"
                  style={{ borderTopColor: COLORS.green }}
                >
                  <h3 className="font-bold mb-6 flex items-center gap-2 text-slate-700">
                    <Activity style={{ color: COLORS.green }} /> Auditoria de
                    Produção
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <AuditStat
                      label="Produção Total"
                      value={parseInt(
                        auditStats.prod.prodTons
                      ).toLocaleString()}
                      sub="Toneladas"
                      color={COLORS.green}
                      icon={Database}
                    />
                    <AuditStat
                      label="Total Fornos"
                      value={auditStats.prod.ovens}
                      sub="Unidades"
                      color={COLORS.darkGray}
                      icon={BarChart2}
                    />
                    <AuditStat
                      label="Dias Cobertos"
                      value={auditStats.prod.days}
                      sub="Range do Arquivo"
                      color={COLORS.blue}
                      icon={Calendar}
                    />
                    <AuditStat
                      label="Água Industrial"
                      value={parseInt(auditStats.prod.water).toLocaleString()}
                      sub="m³ Total"
                      color={COLORS.blueGray}
                      icon={Droplet}
                    />
                  </div>
                </Card>
              </div>
              {showLog && (
                <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg max-h-60 overflow-y-auto text-xs font-mono text-red-800">
                  <p className="font-bold mb-2 sticky top-0 bg-red-50">
                    Log de Rejeição (Amostra):
                  </p>
                  {ignoredLog.map((l, idx) => (
                    <div key={idx} className="mb-1">
                      Linha {l.row}: {l.reason}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-8 text-center">
                <button
                  onClick={() => setStep('upload')}
                  className="text-sm hover:underline text-slate-400"
                >
                  Cancelar e carregar outros arquivos
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'dashboard' && activeAggregates && (
          <div className="h-full flex flex-col gap-4 animate-fade-in">
            {(filterSelection || equipmentFilter) && (
              <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-2 rounded-lg flex justify-between items-center text-xs font-bold shadow-sm">
                <div className="flex gap-4">
                  {filterSelection && (
                    <span className="flex items-center gap-2">
                      <Filter size={14} /> Período:{' '}
                      {
                        calculatedData.find((d) => d.key === filterSelection)
                          ?.label
                      }
                    </span>
                  )}
                  {equipmentFilter && (
                    <span className="flex items-center gap-2">
                      <Wrench size={14} /> Equipamento: {equipmentFilter}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {filterSelection && (
                    <button
                      onClick={() => setFilterSelection(null)}
                      className="flex items-center gap-1 hover:underline text-orange-600"
                    >
                      <X size={14} /> Limpar Período
                    </button>
                  )}
                  {equipmentFilter && (
                    <button
                      onClick={() => setEquipmentFilter(null)}
                      className="flex items-center gap-1 hover:underline text-orange-600"
                    >
                      <X size={14} /> Limpar Equipamento
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'overview' && (
              <div className="grid grid-cols-12 grid-rows-6 gap-4 h-full pb-2">
                <div className="col-span-2 row-span-2">
                  <OEEGaugeCard
                    value={parseFloat(activeAggregates.oee)}
                    target={65}
                  />
                </div>
                <div className="col-span-2 row-span-2 flex flex-col gap-2">
                  <PillarCard
                    title="Disponibilidade"
                    value={activeAggregates.avail}
                    target={90}
                    icon={AlertTriangle}
                  />
                  <PillarCard
                    title="Performance"
                    value={activeAggregates.perf}
                    target={95}
                    icon={Clock}
                  />
                  <PillarCard
                    title="Qualidade"
                    value={activeAggregates.qual}
                    target={72.15}
                    icon={CheckCircle}
                  />
                </div>
                <Card className="col-span-5 row-span-2 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-bold uppercase flex items-center gap-2 text-slate-600">
                      <TrendingDown size={16} /> Bridge de Perdas (Fornos)
                    </h3>
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-medium">
                      Meta → Realizado
                    </span>
                  </div>
                  <div className="flex-1 min-h-0">
                    <BridgeChart aggregates={activeAggregates} />
                  </div>
                </Card>
                <div className="col-span-3 row-span-2 flex flex-col gap-2">
                  <div className="flex-1">
                    <BigNumberCard
                      title="Total Fornos"
                      valueNumeric={activeAggregates.ovensNumeric}
                      displayValue={activeAggregates.ovensDisplay}
                      unit="un"
                      target={activeAggregates.targetOvens}
                      compact={true}
                    />
                  </div>
                  <div
                    className="flex-1 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border-l-4 p-3 flex flex-col justify-between border border-slate-100"
                    style={{ borderLeftColor: COLORS.orange }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1 text-slate-400">
                      <Timer size={12} /> Ritmo Médio
                    </p>
                    <div className="flex items-baseline gap-1">
                      <h3
                        className="text-2xl font-bold"
                        style={{ color: COLORS.orange }}
                      >
                        {activeAggregates.ritmoDisplay}
                      </h3>
                      <span className="text-[10px] font-medium text-gray-400">
                        min/forno
                      </span>
                    </div>
                    <div className="text-[9px] text-gray-400 border-t border-slate-50 pt-1 mt-1 flex justify-between">
                      <span>
                        Base: <strong>Loading / Realizado</strong>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="col-span-12 row-span-2">
                  <TargetChart
                    data={calculatedData}
                    dataKey="oee"
                    target={65}
                    title="Evolução OEE (%)"
                    colorLine={COLORS.blue}
                    onBarClick={handleBarToggle}
                    selectedKey={filterSelection}
                  />
                </div>
                <div className="col-span-4 row-span-2">
                  <TargetChart
                    data={calculatedData}
                    dataKey="avail"
                    target={90}
                    title="Disp. (%)"
                    colorLine={COLORS.red}
                    onBarClick={handleBarToggle}
                    selectedKey={filterSelection}
                  />
                </div>
                <div className="col-span-4 row-span-2">
                  <TargetChart
                    data={calculatedData}
                    dataKey="perf"
                    target={95}
                    title="Perf. (%)"
                    colorLine={COLORS.yellow}
                    onBarClick={handleBarToggle}
                    selectedKey={filterSelection}
                  />
                </div>
                <div className="col-span-4 row-span-2">
                  <TargetChart
                    data={calculatedData}
                    dataKey="qual"
                    target={72.15}
                    title="Qual. (%)"
                    colorLine={COLORS.green}
                    yMax={110}
                    onBarClick={handleBarToggle}
                    selectedKey={filterSelection}
                  />
                </div>
              </div>
            )}

            {activeTab === 'verification' && (
              <div className="h-full overflow-hidden flex flex-col pb-4">
                <div className="grid grid-cols-6 gap-2 h-full content-start">
                  {/* Linha 1: Detalhamento Disp (Ocupa largura total, mas dividido) */}
                  <div className="col-span-6 mb-1 flex items-center gap-2 mt-2">
                    <div className="h-px bg-slate-300 flex-1"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Disponibilidade
                    </span>
                    <div className="h-px bg-slate-300 flex-1"></div>
                  </div>

                  <div className="col-span-2 h-24">
                    <ComparisonCard
                      title="Manutenção Prog."
                      target={activeAggregates.targetMaintMins / 60}
                      real={activeAggregates.usedMaintMins / 60}
                      inverse={true}
                    />
                  </div>
                  <div className="col-span-2 h-24">
                    <ComparisonCard
                      title="Corretivas / Falhas"
                      target={
                        (activeAggregates.loadingMins *
                          (1 - TARGETS.AVAIL / 100)) /
                        60
                      }
                      real={activeAggregates.failLossMins / 60}
                      inverse={true}
                    />
                  </div>
                  <div className="col-span-2 h-24">
                    <ComparisonCard
                      title="Excedente Manut."
                      target={0}
                      real={
                        (activeAggregates.extMaintMins +
                          activeAggregates.outsideMaintMins) /
                        60
                      }
                      inverse={true}
                    />
                  </div>

                  {/* Linha 2: Checklist Janela (6 cards em linha) */}
                  <div className="col-span-6 mt-3 mb-1 flex items-center gap-2">
                    <div className="h-px bg-slate-300 flex-1"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Checklist de Janela (Aderência)
                    </span>
                    <div className="h-px bg-slate-300 flex-1"></div>
                  </div>

                  <div className="col-span-1 h-32">
                    <CheckCardDual
                      title="Pontualidade Início"
                      valNorte={activeAggregates.winStartOkNorte}
                      totalNorte={activeAggregates.daysWithStopNorte}
                      valSul={activeAggregates.winStartOkSul}
                      totalSul={activeAggregates.daysWithStopSul}
                      sub="Início 08:00 ±15m"
                      icon={PlayCircle}
                      color={COLORS.orange}
                    />
                  </div>
                  <div className="col-span-1 h-32">
                    <CheckCardDual
                      title="Pontualidade Fim"
                      valNorte={activeAggregates.winEndOkNorte}
                      totalNorte={activeAggregates.daysWithStopNorte}
                      valSul={activeAggregates.winEndOkSul}
                      totalSul={activeAggregates.daysWithStopSul}
                      sub="Término 13:00 ±15m"
                      icon={StopCircle}
                      color={COLORS.orange}
                    />
                  </div>
                  <div className="col-span-1 h-32">
                    <CheckCardDual
                      title="Dentro Horário"
                      valNorte={activeAggregates.winInsideOkNorte}
                      totalNorte={activeAggregates.daysWithStopNorte}
                      valSul={activeAggregates.winInsideOkSul}
                      totalSul={activeAggregates.daysWithStopSul}
                      sub="Entre 08h-17h"
                      icon={Maximize}
                      color={COLORS.orange}
                    />
                  </div>
                  <div className="col-span-1 h-32">
                    <Card
                      className="p-3 flex flex-col gap-2 border-l-4 h-full justify-between"
                      style={{ borderLeftColor: COLORS.orange }}
                    >
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                          Duração
                        </p>
                        <div className="flex gap-2">
                          <div>
                            <span className="text-lg font-bold text-slate-700 block">
                              {activeAggregates.windowAvgDurNorte}%
                            </span>
                            <span className="text-[8px] text-slate-400">
                              Norte
                            </span>
                          </div>
                          <div className="w-px bg-slate-200"></div>
                          <div>
                            <span className="text-lg font-bold text-slate-700 block">
                              {activeAggregates.windowAvgDurSul}%
                            </span>
                            <span className="text-[8px] text-slate-400">
                              Sul
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[8px] text-slate-400 mt-1">
                        Meta 5h/quench
                      </p>
                    </Card>
                  </div>
                  <div className="col-span-1 h-32">
                    <CheckCardSingle
                      title="Score Freq."
                      value={activeAggregates.windowFreqScore}
                      total={100}
                      sub="Quenchs Parados"
                      icon={Percent}
                      color={COLORS.orange}
                    />
                  </div>
                  <div className="col-span-1 h-32">
                    <CheckCardDual
                      title="Dias Sem Parada"
                      valNorte={activeAggregates.daysWithoutStopNorte}
                      totalNorte={activeAggregates.windowTotalDays}
                      valSul={activeAggregates.daysWithoutStopSul}
                      totalSul={activeAggregates.windowTotalDays}
                      sub="Sem registro"
                      icon={CalendarX}
                      color={COLORS.orange}
                    />
                  </div>

                  {/* Linha 3: Performance & Operação */}
                  <div className="col-span-6 mt-3 mb-1 flex items-center gap-2">
                    <div className="h-px bg-slate-300 flex-1"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Performance & Operação
                    </span>
                    <div className="h-px bg-slate-300 flex-1"></div>
                  </div>

                  <div className="col-span-2 h-24">
                    <ComparisonCard
                      title="Fornos Produzidos"
                      target={activeAggregates.targetOvens}
                      real={activeAggregates.ovensNumeric}
                      unit="un"
                      inverse={false}
                    />
                  </div>
                  <div className="col-span-2 h-24">
                    <ComparisonCard
                      title="Troca de Turno"
                      target={activeAggregates.targetShiftChange}
                      real={activeAggregates.shiftLossMins / 60}
                      inverse={true}
                      showDeviationOnly={true}
                    />
                  </div>
                  <div className="col-span-2 h-24">
                    <ComparisonCard
                      title="Perda Operacional"
                      target={0}
                      real={
                        (activeAggregates.opsLossMins +
                          activeAggregates.extProdMins +
                          activeAggregates.outsideProdMins) /
                        60
                      }
                      inverse={true}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tree' && treeStats && (
              <div className="h-full relative overflow-auto pb-4">
                {/* 1. Resultado da Produção no canto superior esquerdo (Absoluto ou Grid) */}
                <div className="absolute top-0 left-0 z-20">
                  <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl shadow-sm w-48">
                    <h4 className="text-[10px] font-bold text-orange-800 mb-2 uppercase tracking-wide">
                      Resultado da Produção
                    </h4>
                    <div className="flex flex-col gap-2">
                      <div>
                        <span className="block text-orange-400 text-[9px] uppercase font-bold">
                          Fornos
                        </span>
                        <span className="text-xl font-bold text-slate-700">
                          {activeAggregates.ovensDisplay}
                        </span>
                      </div>
                      <div className="h-px bg-orange-200 w-full"></div>
                      <div>
                        <span className="block text-orange-400 text-[9px] uppercase font-bold">
                          Ritmo Médio
                        </span>
                        <span className="text-xl font-bold text-slate-700">
                          {activeAggregates.ritmoDisplay}{' '}
                          <span className="text-[9px] font-normal text-slate-400">
                            min/u
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conteúdo Centralizado da Árvore */}
                <div className="flex flex-col items-center pt-8 w-full max-w-5xl mx-auto">
                  {/* OEE Global Card */}
                  <div className="flex flex-col items-center mb-8 relative z-10 w-full max-w-4xl">
                    <Card
                      className="w-64 p-4 border-t-4 text-center shadow-lg"
                      style={{ borderTopColor: COLORS.blue }}
                    >
                      <h3 className="font-bold text-slate-500 uppercase text-xs mb-1">
                        OEE Global
                      </h3>
                      <span
                        className={`text-4xl font-bold block ${
                          parseFloat(activeAggregates.oee) >= TARGETS.OEE
                            ? 'text-green-500'
                            : 'text-red-500'
                        }`}
                      >
                        {activeAggregates.oee}%
                      </span>
                      <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-400 flex justify-between">
                        <span>Meta: {TARGETS.OEE}%</span>
                        <span
                          className={`${
                            parseFloat(activeAggregates.oee) >= TARGETS.OEE
                              ? 'text-green-500'
                              : 'text-red-500'
                          }`}
                        >
                          {parseFloat(activeAggregates.oee) >= TARGETS.OEE
                            ? '▲'
                            : '▼'}
                        </span>
                      </div>
                    </Card>
                    <div className="h-8 w-px bg-slate-300"></div>
                    <div className="h-px bg-slate-300 w-[70%]"></div>
                  </div>

                  {/* Cards de Nível 2 */}
                  <div className="flex justify-between w-full max-w-5xl px-4 mb-8 relative z-10 gap-4">
                    {/* Disponibilidade */}
                    <div className="flex flex-col items-center relative">
                      <div className="h-4 w-px bg-slate-300 absolute -top-8"></div>
                      <Card
                        className="w-64 p-4 border-t-4 text-center shadow-md hover:shadow-lg transition-all mb-4"
                        style={{ borderTopColor: COLORS.red }}
                      >
                        <h3 className="font-bold text-slate-500 uppercase text-xs mb-1 flex justify-center items-center gap-1">
                          <AlertTriangle size={12} /> Disponibilidade
                        </h3>
                        <span
                          className={`text-3xl font-bold block ${
                            parseFloat(activeAggregates.avail) >= TARGETS.AVAIL
                              ? 'text-green-500'
                              : 'text-red-500'
                          }`}
                        >
                          {activeAggregates.avail}%
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          T. Operando / T. Carregado
                        </span>
                      </Card>
                      <div className="h-6 w-px bg-slate-300 mb-2"></div>

                      <div className="bg-white border border-slate-200 rounded-lg p-2 text-left w-64 text-xs shadow-sm space-y-1">
                        <div className="flex justify-between items-center text-slate-500 border-b border-slate-100 pb-1 mb-1 font-bold">
                          <span>Detalhamento de Perdas</span>
                        </div>
                        <MiniDreRow
                          label="Falha Equip."
                          value={treeStats.failLoss.val}
                          target={treeStats.failLoss.target}
                        />
                        <MiniDreRow
                          label="Prog. Excedente"
                          value={treeStats.schedMaintLoss.val}
                          target={treeStats.schedMaintLoss.target}
                        />
                        <div className="flex justify-between items-center border-t-2 border-slate-100 pt-2 mt-1">
                          <span className="font-bold text-slate-700">
                            T. Operando
                          </span>
                          <span className="font-bold text-slate-700 bg-slate-100 px-1.5 rounded">
                            {treeStats.operating} h
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Performance */}
                    <div className="flex flex-col items-center relative">
                      <div className="h-4 w-px bg-slate-300 absolute -top-8"></div>
                      <Card
                        className="w-64 p-4 border-t-4 text-center shadow-md hover:shadow-lg transition-all mb-4"
                        style={{ borderTopColor: COLORS.yellow }}
                      >
                        <h3 className="font-bold text-slate-500 uppercase text-xs mb-1 flex justify-center items-center gap-1">
                          <Clock size={12} /> Performance
                        </h3>
                        <span
                          className={`text-3xl font-bold block ${
                            parseFloat(activeAggregates.perf) >= TARGETS.PERF
                              ? 'text-green-500'
                              : 'text-red-500'
                          }`}
                        >
                          {activeAggregates.perf}%
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          T. Líquido / T. Operando
                        </span>
                      </Card>
                      <div className="h-6 w-px bg-slate-300 mb-2"></div>

                      <div className="bg-white border border-slate-200 rounded-lg p-2 text-left w-64 text-xs shadow-sm space-y-1">
                        <div className="flex justify-between items-center text-slate-500 border-b border-slate-100 pb-1 mb-1 font-bold">
                          <span>Detalhamento de Perdas</span>
                        </div>
                        <MiniDreRow
                          label="Ritmo Forno a Forno"
                          value={treeStats.rhythmLoss.val}
                          target={treeStats.rhythmLoss.target}
                        />
                        <MiniDreRow
                          label="Perda Operacional"
                          value={treeStats.opsLoss.val}
                          target={treeStats.opsLoss.target}
                        />
                        <MiniDreRow
                          label="Troca de Turno"
                          value={treeStats.shiftLoss.val}
                          target={treeStats.shiftLoss.target}
                        />
                        <div className="flex justify-between items-center border-t-2 border-slate-100 pt-2 mt-1">
                          <span className="font-bold text-slate-700">
                            T. Líquido
                          </span>
                          <span className="font-bold text-slate-700 bg-slate-100 px-1.5 rounded">
                            {treeStats.netOperating} h
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Qualidade */}
                    <div className="flex flex-col items-center relative">
                      <div className="h-4 w-px bg-slate-300 absolute -top-8"></div>
                      <Card
                        className="w-64 p-4 border-t-4 text-center shadow-md hover:shadow-lg transition-all mb-4"
                        style={{ borderTopColor: COLORS.green }}
                      >
                        <h3 className="font-bold text-slate-500 uppercase text-xs mb-1 flex justify-center items-center gap-1">
                          <CheckCircle size={12} /> Qualidade (Yield)
                        </h3>
                        <span
                          className={`text-3xl font-bold block ${
                            parseFloat(activeAggregates.qual) >= TARGETS.QUAL
                              ? 'text-green-500'
                              : 'text-red-500'
                          }`}
                        >
                          {activeAggregates.qual}%
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Produtivo / T. Líquido
                        </span>
                      </Card>
                      <div className="h-6 w-px bg-slate-300 mb-2"></div>

                      <div className="bg-white border border-slate-200 rounded-lg p-2 text-left w-64 text-xs shadow-sm space-y-1">
                        <div className="flex justify-between items-center text-slate-500 border-b border-slate-100 pb-1 mb-1 font-bold">
                          <span>Detalhamento de Perdas</span>
                        </div>
                        <MiniDreRow
                          label="Perda Volume"
                          value={treeStats.lossQual.val}
                          target={treeStats.lossQual.target}
                        />
                        <div className="flex justify-between items-center border-t-2 border-slate-100 pt-2 mt-1">
                          <span className="font-bold text-slate-700">
                            Produtivo
                          </span>
                          <span className="font-bold text-slate-700 bg-slate-100 px-1.5 rounded">
                            {treeStats.fullyProductive} h
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'losses' && (
              <div className="grid grid-cols-3 grid-rows-2 gap-6 h-full pb-4">
                <Card className="col-span-2 row-span-1 p-4">
                  <h3 className="font-bold text-slate-700 text-sm mb-2">
                    Evolução das Perdas (Horas)
                  </h3>
                  <div className="flex-1 min-h-0 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={calculatedData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        onClick={(e) => {
                          if (
                            e &&
                            e.activePayload &&
                            e.activePayload.length > 0
                          ) {
                            handleBarToggle(e.activePayload[0].payload.key);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#E2E8F0"
                        />
                        <XAxis
                          dataKey="label"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: '#94A3B8' }}
                        />

                        <YAxis
                          yAxisId="left"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: '#94A3B8' }}
                          label={{
                            value: 'Acumulado (h)',
                            angle: -90,
                            position: 'insideLeft',
                            style: {
                              textAnchor: 'middle',
                              fill: '#94A3B8',
                              fontSize: 10,
                            },
                          }}
                        />

                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: '#94A3B8' }}
                          label={{
                            value: 'Pontual (h)',
                            angle: 90,
                            position: 'insideRight',
                            style: {
                              textAnchor: 'middle',
                              fill: '#94A3B8',
                              fontSize: 10,
                            },
                          }}
                        />

                        <Tooltip
                          contentStyle={{
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            fontSize: '12px',
                          }}
                          formatter={(value, name) => {
                            const valH = (value / 60).toFixed(1);
                            return [`${valH} h`, name];
                          }}
                        />
                        <Legend
                          wrapperStyle={{
                            fontSize: '11px',
                            paddingTop: '10px',
                          }}
                        />

                        <Bar
                          yAxisId="right"
                          dataKey="lossDisp"
                          name="Disp. (Pontual)"
                          fill={COLORS.blue}
                          fillOpacity={0.6}
                          barSize={20}
                          radius={[4, 4, 0, 0]}
                        >
                          {calculatedData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fillOpacity={
                                filterSelection && entry.key !== filterSelection
                                  ? 0.2
                                  : 0.6
                              }
                            />
                          ))}
                        </Bar>
                        <Bar
                          yAxisId="right"
                          dataKey="lossUtil"
                          name="Perf. (Pontual)"
                          fill={COLORS.yellow}
                          fillOpacity={0.6}
                          barSize={20}
                          radius={[4, 4, 0, 0]}
                        >
                          {calculatedData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fillOpacity={
                                filterSelection && entry.key !== filterSelection
                                  ? 0.2
                                  : 0.6
                              }
                            />
                          ))}
                        </Bar>

                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="accLossDisp"
                          name="Disp. (Acum.)"
                          stroke={COLORS.blue}
                          strokeWidth={2}
                          dot={false}
                          opacity={filterSelection ? 0.3 : 1}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="accLossUtil"
                          name="Perf. (Acum.)"
                          stroke={COLORS.yellow}
                          strokeWidth={2}
                          dot={false}
                          opacity={filterSelection ? 0.3 : 1}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <div className="col-span-1 row-span-2 flex flex-col gap-4">
                  <Card
                    className={`flex-1 p-4 flex flex-col transition-all duration-300 ${
                      equipmentFilter ? 'ring-2 ring-orange-100' : ''
                    }`}
                  >
                    <h3 className="font-bold text-slate-700 text-xs mb-2 flex items-center gap-2">
                      <Wrench size={14} className="text-orange-600" />
                      {lossFilter === 'availability'
                        ? 'Equipamentos (Disponibilidade)'
                        : lossFilter === 'performance'
                        ? 'Equipamentos (Performance)'
                        : 'Equipamentos (Geral)'}
                    </h3>
                    <div className="flex-1 min-h-0">
                      <ParetoChart
                        data={topEquipmentsData}
                        color={
                          lossFilter === 'availability'
                            ? COLORS.blue
                            : lossFilter === 'performance'
                            ? COLORS.yellow
                            : COLORS.darkGray
                        }
                        emptyMessage="Tag de Equipamento não encontrada"
                        onBarClick={handleEquipmentToggle}
                        selectedName={equipmentFilter}
                      />
                    </div>
                    <div className="text-[9px] text-center text-gray-400 mt-1 italic">
                      Clique na barra para filtrar por equipamento
                    </div>
                  </Card>

                  <Card className="flex-1 p-4 flex flex-col transition-all duration-300">
                    <h3 className="font-bold text-slate-700 text-xs mb-2 flex items-center gap-2">
                      <Layers size={14} className="text-orange-600" />
                      {lossFilter === 'availability'
                        ? 'Componente - Modo Falha (Disp.)'
                        : lossFilter === 'performance'
                        ? 'Componente - Modo Falha (Perf.)'
                        : 'Componente - Modo Falha (Geral)'}
                    </h3>
                    <div className="flex-1 min-h-0">
                      <ParetoChart
                        data={topCausesData}
                        color={
                          lossFilter === 'availability'
                            ? COLORS.blue
                            : lossFilter === 'performance'
                            ? COLORS.yellow
                            : COLORS.darkGray
                        }
                        emptyMessage={
                          equipmentFilter
                            ? 'Nenhuma falha para este equipamento'
                            : 'Selecione um equipamento ou período'
                        }
                      />
                    </div>
                  </Card>
                </div>

                <Card
                  onClick={() => toggleLossFilter('availability')}
                  className={`col-span-1 row-span-1 p-5 border-t-4 flex flex-col relative overflow-hidden transition-all duration-300 ${
                    lossFilter === 'availability'
                      ? 'ring-2 ring-blue-500 shadow-md scale-[1.02]'
                      : lossFilter
                      ? 'opacity-50 grayscale-[0.5]'
                      : 'hover:shadow-md hover:scale-[1.01]'
                  }`}
                  style={{ borderTopColor: COLORS.blue }}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <AlertTriangle size={60} color={COLORS.blue} />
                  </div>
                  <h3 className="font-bold text-gray-500 uppercase text-xs mb-4 flex items-center gap-2">
                    {lossFilter === 'availability' && (
                      <CheckCircle size={14} className="text-blue-600" />
                    )}{' '}
                    Perdas de Disponibilidade
                  </h3>
                  <div className="flex-1 flex flex-col justify-center gap-4">
                    <div>
                      <span
                        className="text-3xl font-bold block"
                        style={{ color: COLORS.blue }}
                      >
                        {activeAggregates.lossDispH} h
                      </span>
                      <span className="text-xs text-gray-400">
                        Total Indisponível{' '}
                        {equipmentFilter ? `(${equipmentFilter})` : ''}
                      </span>
                    </div>
                    <div className="h-px bg-slate-100 w-full"></div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="block font-bold text-slate-700">
                          {activeAggregates.lossFailH} h
                        </span>
                        <span className="text-gray-400">Falhas Téc.</span>
                      </div>
                      <div>
                        <span className="block font-bold text-slate-700">
                          {(
                            parseFloat(activeAggregates.lossDispH) -
                            parseFloat(activeAggregates.lossFailH)
                          ).toFixed(1)}{' '}
                          h
                        </span>
                        <span className="text-gray-400">Outros/Ext.</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 text-[10px] text-gray-300 italic">
                    Clique para filtrar tipo
                  </div>
                </Card>

                <Card
                  onClick={() => toggleLossFilter('performance')}
                  className={`col-span-1 row-span-1 p-5 border-t-4 flex flex-col relative overflow-hidden transition-all duration-300 ${
                    lossFilter === 'performance'
                      ? 'ring-2 ring-yellow-400 shadow-md scale-[1.02]'
                      : lossFilter
                      ? 'opacity-50 grayscale-[0.5]'
                      : 'hover:shadow-md hover:scale-[1.01]'
                  }`}
                  style={{ borderTopColor: COLORS.yellow }}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Clock size={60} color={COLORS.yellow} />
                  </div>
                  <h3 className="font-bold text-gray-500 uppercase text-xs mb-4 flex items-center gap-2">
                    {lossFilter === 'performance' && (
                      <CheckCircle size={14} className="text-yellow-600" />
                    )}{' '}
                    Perdas de Performance
                  </h3>
                  <div className="flex-1 flex flex-col justify-center gap-4">
                    <div>
                      <span
                        className="text-3xl font-bold block"
                        style={{ color: COLORS.yellow }}
                      >
                        {activeAggregates.lossUtilH} h
                      </span>
                      <span className="text-xs text-gray-400">
                        Total Perda Ritmo/Ops{' '}
                        {equipmentFilter ? `(${equipmentFilter})` : ''}
                      </span>
                    </div>
                    <div className="h-px bg-slate-100 w-full"></div>
                    <div className="text-xs text-gray-400 leading-relaxed">
                      Calculado base: Capacidade Teórica - Realizado. Inclui
                      microparadas, redução de velocidade e trocas de turno.
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 text-[10px] text-gray-300 italic">
                    Clique para filtrar tipo
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'reliability' && (
              <div className="h-full grid grid-cols-2 grid-rows-6 gap-4 pb-4">
                {/* Gráfico 1: Equipamentos */}
                <div className="col-span-1 row-span-5">
                  <CustomJackKnifeChart
                    title="Análise Jack Knife: Equipamentos"
                    data={jackKnifeData.equip}
                    onPointClick={(e) => {
                      if (e && e.name) setSelectedEquipJackKnife(e.name);
                    }}
                    selectedId={selectedEquipJackKnife}
                    type="equip"
                  />
                </div>

                {/* Gráfico 2: Componentes (Filtrado) */}
                <div className="col-span-1 row-span-5">
                  {selectedEquipJackKnife ? (
                    <CustomJackKnifeChart
                      title={`Drill Down: ${selectedEquipJackKnife} (Componentes)`}
                      data={jackKnifeData.comp.filter(
                        (c) => c.parentEquip === selectedEquipJackKnife
                      )}
                      type="comp"
                    />
                  ) : (
                    <Card className="h-full flex items-center justify-center bg-slate-50 border-dashed">
                      <div className="text-center text-slate-400">
                        <Crosshair
                          size={48}
                          className="mx-auto mb-2 opacity-20"
                        />
                        <p className="text-sm font-bold">
                          Selecione um Equipamento
                        </p>
                        <p className="text-xs">
                          Clique no gráfico ao lado para ver detalhes
                        </p>
                      </div>
                    </Card>
                  )}
                </div>

                {/* Card Inferior de Ruído */}
                <div className="col-span-2 row-span-1">
                  <Card className="h-full p-4 flex flex-row items-center justify-between bg-slate-50 border-slate-200">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white rounded-full shadow-sm">
                        <Filter size={20} className="text-slate-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-600">
                          Eventos de Ruído Filtrados
                        </h4>
                        <p className="text-xs text-slate-400">
                          Eventos únicos com baixo MTTR removidos dos gráficos
                          para clareza (Princípio Pareto 80/20)
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-8 px-8 border-l border-slate-200">
                      <div>
                        <span className="block text-2xl font-bold text-slate-700">
                          {jackKnifeData.noise.length}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">
                          Eventos
                        </span>
                      </div>
                      <div>
                        <span className="block text-2xl font-bold text-slate-700">
                          {(
                            jackKnifeData.noise.reduce(
                              (a, b) => a + b.totalDuration,
                              0
                            ) / 60
                          ).toFixed(1)}{' '}
                          h
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">
                          Total Parado
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'breakdown' && (
              <Card className="h-full overflow-hidden flex flex-col">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 font-bold text-sm uppercase flex justify-between items-center text-slate-600">
                  <span>
                    Detalhamento {aggregation === 'day' ? 'Diário' : 'Agregado'}
                  </span>
                  <span className="text-xs text-slate-400 font-normal">
                    {filterSelection
                      ? '1 registro filtrado'
                      : `${calculatedData.length} registros`}
                    {equipmentFilter
                      ? ` • Equipamento: ${equipmentFilter}`
                      : ''}
                  </span>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="min-w-full text-sm divide-y divide-slate-100 relative">
                    <thead className="bg-white sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-6 py-3 text-left font-bold text-slate-700">
                          Período
                        </th>
                        <th className="px-6 py-3 text-right font-bold text-slate-500">
                          Disp %
                        </th>
                        <th className="px-6 py-3 text-right font-bold text-slate-500">
                          Perf %
                        </th>
                        <th className="px-6 py-3 text-right font-bold text-slate-500">
                          Yield %
                        </th>
                        <th className="px-6 py-3 text-right font-bold text-orange-600">
                          OEE %
                        </th>
                        <th className="px-6 py-3 text-right font-bold text-slate-600">
                          Perda Disp (h)
                        </th>
                        <th className="px-6 py-3 text-right font-bold text-slate-600">
                          Perda Perf (h)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {(filterSelection
                        ? calculatedData.filter(
                            (d) => d.key === filterSelection
                          )
                        : calculatedData
                      ).map((r, i) => (
                        <tr
                          key={i}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-6 py-4 font-medium text-slate-700">
                            {r.label}
                          </td>
                          <td
                            className="px-6 py-4 text-right"
                            style={{
                              color:
                                r.avail >= TARGETS.AVAIL
                                  ? COLORS.green
                                  : COLORS.red,
                            }}
                          >
                            {r.avail.toFixed(1)}
                          </td>
                          <td
                            className="px-6 py-4 text-right"
                            style={{
                              color:
                                r.perf >= TARGETS.PERF
                                  ? COLORS.green
                                  : COLORS.red,
                            }}
                          >
                            {r.perf.toFixed(1)}
                          </td>
                          <td
                            className="px-6 py-4 text-right"
                            style={{
                              color:
                                r.qual >= TARGETS.QUAL
                                  ? COLORS.green
                                  : COLORS.red,
                            }}
                          >
                            {r.qual.toFixed(2)}
                          </td>
                          <td
                            className="px-6 py-4 text-right font-bold bg-orange-50"
                            style={{
                              color:
                                r.oee >= TARGETS.OEE
                                  ? COLORS.green
                                  : COLORS.red,
                            }}
                          >
                            {r.oee.toFixed(1)}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-600">
                            {(r.lossDisp / 60).toFixed(1)}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-600">
                            {(r.lossUtil / 60).toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
