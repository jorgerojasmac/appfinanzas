/** Resumen del mes anterior que se muestra al comenzar un mes nuevo. */
import type { Transaction } from '../db/types'
import { computeHealth, type HealthInput } from './health'
import { addMonths, monthKey, type MonthKey } from './dates'
import { expenseByCategory, totalsForMonth } from './ledger'
import type { Cents } from './money'
import { budgetLimit, computeIncomeBase } from './budgets'

export interface MonthClose {
  month: MonthKey
  income: Cents
  expense: Cents
  net: Cents
  savingsRate: number | null
  score: number | null
  prevScore: number | null
  /** Categoría cuyo gasto más creció respecto al mes previo */
  grew: { categoryId: string; from: Cents; to: Cents } | null
  highlight: { kind: 'achievement' | 'alert'; text: string }
}

const inMonth = (txs: Transaction[], m: MonthKey) => txs.filter((t) => monthKey(t.date) === m)

export function buildMonthClose(input: HealthInput, month: MonthKey): MonthClose {
  const { transactions: txs } = input
  const t = totalsForMonth(txs, month)
  const prev = addMonths(month, -1)
  // Puntaje al cerrar el mes y al cerrar el mes anterior
  const score = computeHealth({ ...input, today: `${addMonths(month, 1)}-01` }).score
  const prevScore = computeHealth({ ...input, today: `${month}-01` }).score

  const now = expenseByCategory(inMonth(txs, month))
  const before = expenseByCategory(inMonth(txs, prev))
  let grew: MonthClose['grew'] = null
  for (const [id, to] of now) {
    const from = before.get(id) ?? 0
    if (to - from > 0 && (!grew || to - from > grew.to - grew.from)) grew = { categoryId: id, from, to }
  }

  const rate = t.income > 0 ? t.net / t.income : null
  const base = input.manualBase ?? computeIncomeBase(txs, addMonths(month, 1)).value
  const over = input.budgets.filter((b) => {
    const limit = budgetLimit(b, base)
    return limit != null && limit > 0 && (now.get(b.categoryId) ?? 0) > limit
  }).length
  const evaluable = input.budgets.filter((b) => (budgetLimit(b, base) ?? 0) > 0).length

  let highlight: MonthClose['highlight']
  if (t.income > 0 && t.net < 0) highlight = { kind: 'alert', text: 'Gastaste más de lo que ganaste este mes.' }
  else if (rate != null && rate >= 0.2) highlight = { kind: 'achievement', text: `Ahorraste el ${Math.round(rate * 100)}% de tus ingresos. ¡Excelente!` }
  else if (evaluable > 0 && over === 0) highlight = { kind: 'achievement', text: 'Cumpliste todos tus presupuestos.' }
  else if (over > 0) highlight = { kind: 'alert', text: `Te pasaste en ${over} ${over === 1 ? 'presupuesto' : 'presupuestos'}.` }
  else if (t.income === 0) highlight = { kind: 'alert', text: 'No registraste ingresos este mes. Es un buen momento para revisar tu fondo colchón.' }
  else if (rate != null && rate > 0) highlight = { kind: 'achievement', text: `Cerraste el mes con ${Math.round(rate * 100)}% de ahorro.` }
  else highlight = { kind: 'alert', text: 'Este mes no te quedó ahorro.' }

  return { month, income: t.income, expense: t.expense, net: t.net, savingsRate: rate, score, prevScore, grew, highlight }
}

/** Mes cuyo cierre corresponde mostrar (el anterior), o null si ya se vio o no hay datos. */
export function pendingMonthClose(txs: Transaction[], currentMonth: MonthKey, lastSeen: MonthKey | null): MonthKey | null {
  const prev = addMonths(currentMonth, -1)
  if (lastSeen && lastSeen >= prev) return null
  return txs.some((t) => monthKey(t.date) === prev) ? prev : null
}
