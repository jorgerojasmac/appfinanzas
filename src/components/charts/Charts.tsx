import { Fragment, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { daysInMonth, formatDateShort, todayISO, formatMonth, formatMonthShort, type ISODate, type MonthKey } from '../../domain/dates'
import { formatMoney, formatMoneyCompact, type Cents } from '../../domain/money'
import type { Slice } from '../../domain/stats'
import { Legend, TooltipBox } from './ChartTooltip'
import { useThemeColors, type ThemeColors } from './useThemeColors'

const axisTick = (c: ThemeColors) => ({ fill: c['label-2'], fontSize: 11 })
const MARGIN = { top: 8, right: 4, bottom: 0, left: 0 }

// ---------- Dona: gasto por categoría ----------

export function CategoryDonut({ slices, total }: { slices: Slice[]; total: Cents }) {
  const c = useThemeColors()
  const [active, setActive] = useState<number | null>(null)
  const sel = active != null ? slices[active] : null
  return (
    <div>
      <div className="relative mx-auto h-[200px] w-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={66}
              outerRadius={96}
              paddingAngle={0}
              cornerRadius={4}
              stroke={c.card}
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              isAnimationActive
              animationDuration={700}
              onClick={(_, i) => setActive(active === i ? null : i)}
            >
              {slices.map((s, i) => (
                <Cell key={s.id} fill={c[s.color]} opacity={active == null || active === i ? 1 : 0.35} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[12px] text-label-2">{sel ? sel.name : 'Total'}</span>
          <span className="text-[20px] font-semibold">{formatMoney(sel ? sel.value : total)}</span>
          {sel && <span className="text-[12px] text-label-2">{Math.round((sel.value / total) * 100)}%</span>}
        </div>
      </div>
      {/* La leyenda es también la tabla de valores */}
      <ul className="mt-3 space-y-1.5">
        {slices.map((s, i) => (
          <li key={s.id}>
            <button
              onClick={() => setActive(active === i ? null : i)}
              className={`flex w-full items-center gap-2 text-left text-[15px] transition-opacity ${active == null || active === i ? '' : 'opacity-40'}`}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c[s.color] }} />
              <span className="flex-1 truncate">{s.name}</span>
              <span className="tabular text-label-2">{Math.round((s.value / total) * 100)}%</span>
              <span className="tabular w-24 text-right">{formatMoney(s.value)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------- Barras: ingresos vs gastos por mes ----------

export function IncomeExpenseBars({ data }: { data: Array<{ month: MonthKey; income: Cents; expense: Cents }> }) {
  const c = useThemeColors()
  const rows = data.map((d) => ({ ...d, label: formatMonthShort(d.month) }))
  return (
    <>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={MARGIN} barGap={2} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke={c.separator} strokeWidth={0.5} />
            <XAxis dataKey="label" tick={axisTick(c)} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatMoneyCompact(v)} tick={axisTick(c)} axisLine={false} tickLine={false} width={44} />
            <Tooltip
              cursor={{ fill: c.fill }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <TooltipBox
                    title={formatMonth((payload[0].payload as { month: string }).month)}
                    rows={[
                      { color: c.green, label: 'Ingresos', value: formatMoney(payload[0].payload.income) },
                      { color: c.red, label: 'Gastos', value: formatMoney(payload[0].payload.expense) },
                      { label: 'Balance', value: formatMoney(payload[0].payload.income - payload[0].payload.expense, { sign: true }) },
                    ]}
                  />
                ) : null
              }
            />
            <Bar dataKey="income" name="Ingresos" fill={c.green} radius={[4, 4, 0, 0]} maxBarSize={18} animationDuration={700} />
            <Bar dataKey="expense" name="Gastos" fill={c.red} radius={[4, 4, 0, 0]} maxBarSize={18} animationDuration={700} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Legend items={[{ color: c.green, label: 'Ingresos' }, { color: c.red, label: 'Gastos' }]} />
    </>
  )
}

// ---------- Línea: patrimonio neto ----------

export function NetWorthChart({ data }: { data: Array<{ month: MonthKey; net: Cents; assets: Cents; debts: Cents }> }) {
  const c = useThemeColors()
  const rows = data.map((d) => ({ ...d, label: formatMonthShort(d.month) }))
  return (
    <div className="h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={MARGIN}>
          <defs>
            <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.blue} stopOpacity={0.22} />
              <stop offset="100%" stopColor={c.blue} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={c.separator} strokeWidth={0.5} />
          <XAxis dataKey="label" tick={axisTick(c)} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tickFormatter={(v) => formatMoneyCompact(v)} tick={axisTick(c)} axisLine={false} tickLine={false} width={44} domain={['auto', 'auto']} />
          <Tooltip
            cursor={{ stroke: c['label-3'], strokeWidth: 1 }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipBox
                  title={formatMonth(payload[0].payload.month)}
                  rows={[
                    { color: c.blue, label: 'Patrimonio', value: formatMoney(payload[0].payload.net) },
                    { label: 'Cuentas y ahorros', value: formatMoney(payload[0].payload.assets) },
                    { label: 'Deudas', value: formatMoney(-payload[0].payload.debts) },
                  ]}
                />
              ) : null
            }
          />
          <Area type="monotone" dataKey="net" stroke={c.blue} strokeWidth={2} fill="url(#nw)" dot={false} activeDot={{ r: 5, stroke: c.card, strokeWidth: 2 }} animationDuration={800} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------- Línea: gasto acumulado, mes actual vs anterior ----------

export function CumulativeChart({
  current,
  previous,
  currentLabel,
  previousLabel,
}: {
  current: Array<number | null>
  previous: Array<number | null>
  currentLabel: string
  previousLabel: string
}) {
  const c = useThemeColors()
  const rows = useMemo(
    () =>
      Array.from({ length: Math.max(current.length, previous.length) }, (_, i) => ({
        day: i + 1,
        current: current[i] ?? null,
        previous: previous[i] ?? null,
      })),
    [current, previous],
  )
  return (
    <>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={MARGIN}>
            <CartesianGrid vertical={false} stroke={c.separator} strokeWidth={0.5} />
            <XAxis dataKey="day" tick={axisTick(c)} axisLine={false} tickLine={false} ticks={[1, 8, 15, 22, 29]} />
            <YAxis tickFormatter={(v) => formatMoneyCompact(v)} tick={axisTick(c)} axisLine={false} tickLine={false} width={44} />
            <Tooltip
              cursor={{ stroke: c['label-3'], strokeWidth: 1 }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipBox
                    title={`Día ${label}`}
                    rows={[
                      ...(payload[0].payload.current != null ? [{ color: c.blue, label: currentLabel, value: formatMoney(payload[0].payload.current) }] : []),
                      ...(payload[0].payload.previous != null ? [{ color: c.gray, label: previousLabel, value: formatMoney(payload[0].payload.previous) }] : []),
                    ]}
                  />
                ) : null
              }
            />
            <Line type="monotone" dataKey="previous" stroke={c.gray} strokeWidth={2} dot={false} connectNulls={false} animationDuration={700} />
            <Line type="monotone" dataKey="current" stroke={c.blue} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: c.card, strokeWidth: 2 }} connectNulls={false} animationDuration={700} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Legend items={[{ color: c.blue, label: currentLabel }, { color: c.gray, label: previousLabel }]} />
    </>
  )
}

// ---------- Barras: variabilidad de ingresos ----------

export function IncomeVariabilityChart({
  data,
  mean,
  base,
}: {
  data: Array<{ month: MonthKey; income: Cents }>
  mean: Cents
  base: Cents | null
}) {
  const c = useThemeColors()
  const rows = data.map((d) => ({ ...d, label: formatMonthShort(d.month) }))
  return (
    <>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={MARGIN} barCategoryGap="18%">
            <CartesianGrid vertical={false} stroke={c.separator} strokeWidth={0.5} />
            <XAxis dataKey="label" tick={axisTick(c)} axisLine={false} tickLine={false} interval={0} />
            <YAxis tickFormatter={(v) => formatMoneyCompact(v)} tick={axisTick(c)} axisLine={false} tickLine={false} width={44} />
            <Tooltip
              cursor={{ fill: c.fill }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <TooltipBox
                    title={formatMonth(payload[0].payload.month)}
                    rows={[
                      { color: c.green, label: 'Ingresos', value: formatMoney(payload[0].payload.income) },
                      { label: 'vs. promedio', value: formatMoney(payload[0].payload.income - mean, { sign: true }) },
                    ]}
                  />
                ) : null
              }
            />
            <Bar dataKey="income" fill={c.green} radius={[4, 4, 0, 0]} maxBarSize={22} animationDuration={700} />
            <ReferenceLine y={mean} stroke={c.label} strokeOpacity={0.55} strokeWidth={1} />
            {base != null && <ReferenceLine y={base} stroke={c.orange} strokeWidth={1.5} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Legend
        items={[
          { color: c.green, label: 'Ingreso del mes' },
          { color: c.label, label: `Promedio ${formatMoneyCompact(mean)}` },
          ...(base != null ? [{ color: c.orange, label: `Ingreso base ${formatMoneyCompact(base)}` }] : []),
        ]}
      />
    </>
  )
}

// ---------- Mapa de calor de gasto por día ----------

const LEVELS = [0.18, 0.38, 0.6, 0.82, 1]

/** #ff9500 + 0.4 → rgba(255,149,0,0.4) */
function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, (x) => x + x) : h.slice(0, 6), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** Nivel 0–5 según cuantiles del gasto diario (para que unos pocos días altos no aplanen todo). */
function levelFor(v: number, thresholds: number[]): number {
  if (v <= 0) return 0
  let l = 1
  for (const t of thresholds) if (v > t) l++
  return Math.min(l, 5)
}

export function SpendHeatmap({
  weeks,
  values,
  start,
  end,
  calendar,
  months,
}: {
  weeks: ISODate[][]
  values: Map<ISODate, Cents>
  start: ISODate
  end: ISODate
  /** true: vista de calendario (un mes); false: semanas en columnas (trimestre) */
  calendar: boolean
  /** Si se indica, se usa la vista anual: una fila por mes */
  months?: MonthKey[]
}) {
  const c = useThemeColors()
  const [selected, setSelected] = useState<ISODate | null>(null)
  const sorted = [...values.values()].filter((v) => v > 0).sort((a, b) => a - b)
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0
  const thresholds = [q(0.25), q(0.5), q(0.75), q(0.9)]
  const today = todayISO()
  const color = (iso: ISODate) => {
    // Fuera del período o en el futuro: celda vacía (no es "día sin gasto")
    if (iso < start || iso > end || iso > today) return 'transparent'
    const l = levelFor(values.get(iso) ?? 0, thresholds)
    if (l === 0) return c.fill
    return withAlpha(c.orange, LEVELS[l - 1])
  }
  const sel = selected ? values.get(selected) ?? 0 : null

  return (
    <div>
      {calendar ? (
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="text-center text-[11px] text-label-2">
              {d}
            </span>
          ))}
          {weeks.flat().map((iso) => {
            const inRange = iso >= start && iso <= end
            const future = iso > today
            return (
              <button
                key={iso}
                disabled={!inRange || future}
                onClick={() => setSelected(selected === iso ? null : iso)}
                className={`flex aspect-square items-center justify-center rounded-[8px] text-[12px] ${selected === iso ? 'ring-2 ring-blue' : ''}`}
                style={{ backgroundColor: color(iso) }}
              >
                {inRange && <span className={future ? 'text-label-3' : levelFor(values.get(iso) ?? 0, thresholds) >= 4 ? 'font-semibold text-white' : 'text-label-2'}>{Number(iso.slice(8))}</span>}
              </button>
            )
          })}
        </div>
      ) : months ? (
        // Año: una fila por mes, una columna por día
        <div className="grid gap-[2px]" style={{ gridTemplateColumns: '22px repeat(31, minmax(0, 1fr))' }}>
          {months.map((m) => (
            <Fragment key={m}>
              <span className="text-[10px] leading-none text-label-2 self-center">{formatMonthShort(m).slice(0, 3)}</span>
              {Array.from({ length: 31 }, (_, d) => {
                const iso = `${m}-${String(d + 1).padStart(2, '0')}`
                const exists = d + 1 <= daysInMonth(m)
                return exists ? (
                  <button
                    key={iso}
                    disabled={iso > today}
                    onClick={() => setSelected(selected === iso ? null : iso)}
                    aria-label={iso}
                    className={`aspect-square rounded-[2px] ${selected === iso ? 'ring-1 ring-blue' : ''}`}
                    style={{ backgroundColor: color(iso) }}
                  />
                ) : (
                  <span key={iso} />
                )
              })}
            </Fragment>
          ))}
        </div>
      ) : (
        <div className="no-scrollbar flex justify-between gap-[3px] overflow-x-auto pb-1">
          {weeks.map((w) => (
            <div key={w[0]} className="flex flex-col gap-[3px]">
              {w.map((iso) => (
                <button
                  key={iso}
                  disabled={iso < start || iso > end}
                  onClick={() => setSelected(selected === iso ? null : iso)}
                  className={`rounded-[2px] ${selected === iso ? 'ring-1 ring-blue' : ''}`}
                  style={{ width: weeks.length > 20 ? 5 : 16, height: weeks.length > 20 ? 5 : 16, background: color(iso) }}
                  aria-label={iso}
                />
              ))}
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between text-[12px] text-label-2">
        <span className="tabular">{selected ? `${formatDateShort(selected)}: ${formatMoney(sel ?? 0)}` : 'Toca un día para ver el monto'}</span>
        <span className="flex items-center gap-1">
          Menos
          {[0, 1, 2, 3, 4, 5].map((l) => (
            <span
              key={l}
              className="h-2.5 w-2.5 rounded-[3px]"
              style={{ background: l === 0 ? c.fill : withAlpha(c.orange, LEVELS[l - 1]) }}
            />
          ))}
          Más
        </span>
      </div>
    </div>
  )
}

