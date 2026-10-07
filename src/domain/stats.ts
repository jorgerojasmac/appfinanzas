/** Agregaciones para la pantalla de Estadísticas (lógica pura). */
import type { Account, Category, Transaction } from '../db/types'
import { addDays, addMonths, daysInMonth, monthKey, monthRange, monthsBetween, parseISO, todayISO, toISO, type ISODate, type MonthKey } from './dates'
import { computeBalances, isLiquid } from './ledger'
import type { Cents } from './money'

export type PeriodKind = 'month' | 'quarter' | 'year'

export interface Period {
  kind: PeriodKind
  /** Mes de referencia (el último del período) */
  anchor: MonthKey
  months: MonthKey[]
  start: ISODate
  end: ISODate
  label: string
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export function makePeriod(kind: PeriodKind, anyMonth: MonthKey): Period {
  const [y, m] = anyMonth.split('-').map(Number)
  let first: MonthKey
  let last: MonthKey
  let label: string
  if (kind === 'month') {
    first = last = anyMonth
    label = `${MONTHS[m - 1]} ${y}`
  } else if (kind === 'quarter') {
    const q = Math.floor((m - 1) / 3)
    first = `${y}-${String(q * 3 + 1).padStart(2, '0')}`
    last = addMonths(first, 2)
    label = `${q + 1}.º trimestre ${y}`
  } else {
    first = `${y}-01`
    last = `${y}-12`
    label = String(y)
  }
  return { kind, anchor: last, months: monthsBetween(first, last), start: monthRange(first).start, end: monthRange(last).end, label }
}

export function shiftPeriod(p: Period, dir: 1 | -1): Period {
  const step = p.kind === 'month' ? 1 : p.kind === 'quarter' ? 3 : 12
  return makePeriod(p.kind, addMonths(p.months[0], dir * step))
}

export const inPeriod = (t: Transaction, p: Period) => t.date >= p.start && t.date <= p.end

export interface Slice {
  id: string
  name: string
  color: Category['color'] | 'gray'
  value: Cents
}

/** Gasto por categoría: las 5 mayores y el resto agrupado en "Otros". */
export function categorySlices(txs: Transaction[], categories: Category[], max = 5): { slices: Slice[]; total: Cents; all: Slice[] } {
  const map = new Map<string, Cents>()
  for (const t of txs) {
    if (t.type !== 'expense' || !t.myAmount) continue
    const k = t.categoryId ?? 'none'
    map.set(k, (map.get(k) ?? 0) + t.myAmount)
  }
  const cats = new Map(categories.map((c) => [c.id, c]))
  const all: Slice[] = [...map.entries()]
    .map(([id, value]) => {
      const c = cats.get(id)
      return { id, name: c?.name ?? 'Sin categoría', color: c?.color ?? ('gray' as const), value }
    })
    .sort((a, b) => b.value - a.value)
  const total = all.reduce((a, s) => a + s.value, 0)
  if (all.length <= max + 1) return { slices: all, total, all }
  const top = all.slice(0, max)
  const rest = all.slice(max).reduce((a, s) => a + s.value, 0)
  return { slices: [...top, { id: 'other', name: 'Otros', color: 'gray', value: rest }], total, all }
}

/** Gasto acumulado día a día de un mes (hasta hoy si es el mes en curso). */
export function cumulativeByDay(txs: Transaction[], month: MonthKey, today: ISODate = todayISO()): Array<number | null> {
  const days = daysInMonth(month)
  const daily = new Array(days).fill(0)
  for (const t of txs) {
    if (t.type !== 'expense' || monthKey(t.date) !== month) continue
    daily[Number(t.date.slice(8, 10)) - 1] += t.myAmount
  }
  const limit = monthKey(today) === month ? Number(today.slice(8, 10)) : monthKey(today) < month ? 0 : days
  let acc = 0
  return daily.map((v, i) => {
    acc += v
    return i < limit ? acc : null
  })
}

/** Gasto por fecha (para el mapa de calor). */
export function spendByDate(txs: Transaction[], start: ISODate, end: ISODate): Map<ISODate, Cents> {
  const map = new Map<ISODate, Cents>()
  for (const t of txs) {
    if (t.type !== 'expense' || t.date < start || t.date > end) continue
    map.set(t.date, (map.get(t.date) ?? 0) + t.myAmount)
  }
  return map
}

/** Lunes de la semana de una fecha (la semana empieza el lunes). */
export function mondayOf(iso: ISODate): ISODate {
  const d = parseISO(iso)
  const dow = (d.getDay() + 6) % 7
  return toISO(new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow))
}

/** Semanas (columnas de lunes a domingo) que cubren el rango. */
export function weeksBetween(start: ISODate, end: ISODate): ISODate[][] {
  const out: ISODate[][] = []
  let monday = mondayOf(start)
  while (monday <= end) {
    out.push(Array.from({ length: 7 }, (_, i) => addDays(monday, i)))
    monday = addDays(monday, 7)
  }
  return out
}

export interface NetWorthPoint {
  month: MonthKey
  assets: Cents
  debts: Cents
  net: Cents
}

/** Patrimonio neto al cierre de cada mes: cuentas y ahorros menos deudas de tarjetas. */
export function netWorthSeries(accounts: Account[], txs: Transaction[], months: MonthKey[], today: ISODate = todayISO()): NetWorthPoint[] {
  const active = accounts.filter((a) => !a.archived || txs.some((t) => t.accountId === a.id || t.toAccountId === a.id))
  return months.map((m) => {
    const end = monthRange(m).end
    const at = end > today ? today : end
    const b = computeBalances(active, txs, at)
    let assets = 0
    let debts = 0
    for (const a of active) {
      const v = b.get(a.id) ?? 0
      if (a.type === 'credit') {
        if (v < 0) debts += -v
        else assets += v
      } else if (v >= 0 || isLiquid(a) || a.type === 'savings') {
        assets += v
      }
    }
    return { month: m, assets, debts, net: assets - debts }
  })
}

/** Ingresos de cada mes y su variabilidad (coeficiente de variación). */
export function incomeVariability(monthlyIncome: Cents[]): { mean: Cents; cv: number | null } {
  const vals = monthlyIncome
  if (!vals.length) return { mean: 0, cv: null }
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length)
  return { mean: Math.round(mean), cv: mean ? sd / mean : null }
}
