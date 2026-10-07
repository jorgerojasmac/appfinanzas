/**
 * Ingreso base y presupuestos, pensados para ingresos irregulares:
 * se presupuesta sobre un ingreso conservador, no sobre el del mes.
 */
import type { Budget, Category, Transaction } from '../db/types'
import { addMonths, currentMonth, monthKey, monthsBetween, type MonthKey } from './dates'
import { totalsByMonth } from './ledger'
import type { Cents } from './money'

export const BASE_WINDOW = 6
export const BASE_MIN_MONTHS = 3
export const BASE_LOWEST = 2

export interface IncomeBase {
  /** null si no hay datos suficientes */
  value: Cents | null
  months: Array<{ month: MonthKey; income: Cents }>
  /** Meses usados para el cálculo (los más bajos) */
  lowest: MonthKey[]
  /** Meses completos que faltan para poder calcularlo */
  missing: number
}

/**
 * Primer mes "completo" del historial: si el primer movimiento es después del
 * día 7, ese mes probablemente está incompleto y no se usa.
 */
function firstFullMonth(txs: Transaction[]): MonthKey | null {
  let first: string | null = null
  for (const t of txs) if (!first || t.date < first) first = t.date
  if (!first) return null
  const m = monthKey(first)
  return Number(first.slice(8, 10)) > 7 ? addMonths(m, 1) : m
}

/** Ingreso base: promedio de los 2 meses más bajos de los últimos 6 meses completos. */
export function computeIncomeBase(txs: Transaction[], month: MonthKey = currentMonth()): IncomeBase {
  const lastComplete = addMonths(month, -1)
  const windowStart = addMonths(month, -BASE_WINDOW)
  const first = firstFullMonth(txs)
  if (!first || first > lastComplete) {
    return { value: null, months: [], lowest: [], missing: BASE_MIN_MONTHS }
  }
  const start = first > windowStart ? first : windowStart
  const keys = monthsBetween(start, lastComplete)
  const byMonth = totalsByMonth(txs, keys)
  const months = keys.map((m) => ({ month: m, income: byMonth.get(m)?.income ?? 0 }))
  if (months.length < BASE_MIN_MONTHS) {
    return { value: null, months, lowest: [], missing: BASE_MIN_MONTHS - months.length }
  }
  const sorted = [...months].sort((a, b) => a.income - b.income).slice(0, BASE_LOWEST)
  const value = Math.round(sorted.reduce((s, m) => s + m.income, 0) / sorted.length)
  return { value, months, lowest: sorted.map((m) => m.month), missing: 0 }
}

/** Límite del presupuesto en centavos (null si es % y no hay ingreso base). */
export function budgetLimit(b: Pick<Budget, 'mode' | 'amount' | 'percent'>, base: Cents | null): Cents | null {
  if (b.mode === 'fixed') return b.amount ?? 0
  if (base == null) return null
  return Math.round((base * (b.percent ?? 0)) / 100)
}

export type BudgetTone = 'ok' | 'warn' | 'over'

/** Verde por debajo del 80 %, amarillo hasta el 100 %, rojo si se excede. */
export function budgetTone(spent: Cents, limit: Cents): BudgetTone {
  if (limit <= 0) return spent > 0 ? 'over' : 'ok'
  const r = spent / limit
  if (r > 1) return 'over'
  if (r >= 0.8) return 'warn'
  return 'ok'
}

export const TONE_COLOR: Record<BudgetTone, string> = {
  ok: 'var(--green)',
  warn: 'var(--yellow)',
  over: 'var(--red)',
}

/** Gasto mensual promedio por categoría en los últimos `n` meses completos. */
export function averageByCategory(txs: Transaction[], month: MonthKey, n = 3): Map<string, Cents> {
  const from = addMonths(month, -n)
  const to = addMonths(month, -1)
  const sums = new Map<string, Cents>()
  for (const t of txs) {
    if (t.type !== 'expense' || !t.categoryId) continue
    const m = monthKey(t.date)
    if (m < from || m > to) continue
    sums.set(t.categoryId, (sums.get(t.categoryId) ?? 0) + t.myAmount)
  }
  const out = new Map<string, Cents>()
  for (const [k, v] of sums) out.set(k, Math.round(v / n))
  return out
}

export interface BudgetSuggestion {
  categoryId: string
  average: Cents
  suggested: Cents
  /** % del ingreso base (si existe) */
  percent: number | null
}

/** Meta de ahorro implícita al sugerir presupuestos */
export const SUGGEST_SAVINGS = 0.15

const roundTo5 = (c: Cents) => Math.max(500, Math.round(c / 500) * 500)

/**
 * Sugiere presupuestos a partir del gasto promedio reciente. Los gastos fijos
 * se mantienen; los variables se recortan proporcionalmente si en total
 * superan el 85 % del ingreso base (para dejar un 15 % de ahorro).
 */
export function suggestBudgets(
  txs: Transaction[],
  categories: Category[],
  base: Cents | null,
  month: MonthKey = currentMonth(),
): BudgetSuggestion[] {
  const avg = averageByCategory(txs, month)
  const cats = categories.filter((c) => c.kind === 'expense' && !c.archived && (avg.get(c.id) ?? 0) > 0)
  const fixedTotal = cats.filter((c) => c.fixed).reduce((s, c) => s + (avg.get(c.id) ?? 0), 0)
  const variableTotal = cats.filter((c) => !c.fixed).reduce((s, c) => s + (avg.get(c.id) ?? 0), 0)

  let scale = 1
  if (base != null && variableTotal > 0) {
    const available = base * (1 - SUGGEST_SAVINGS) - fixedTotal
    if (available > 0 && variableTotal > available) scale = available / variableTotal
  }

  return cats
    .map((c) => {
      const average = avg.get(c.id) ?? 0
      const suggested = c.fixed ? roundTo5(average) : roundTo5(average * scale)
      return {
        categoryId: c.id,
        average,
        suggested,
        percent: base ? Math.round((suggested / base) * 1000) / 10 : null,
      }
    })
    .sort((a, b) => b.suggested - a.suggested)
}
