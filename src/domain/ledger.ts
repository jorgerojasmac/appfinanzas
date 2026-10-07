/**
 * Reglas contables centrales. Todo dashboard pasa por aquí.
 *
 * Saldos: se calculan siempre (saldo inicial + movimientos), nunca se guardan.
 * Ingreso/gasto: solo `income` y `expense` cuentan, y siempre por `myAmount`.
 *   Las transferencias (incluido el pago de tarjetas) y las liquidaciones con
 *   personas mueven dinero entre cuentas pero no son ingreso ni gasto.
 *   Así una compra con tarjeta se cuenta una sola vez: cuando se compra.
 */
import type { Account, Transaction } from '../db/types'
import type { Cents } from './money'
import { monthKey, type ISODate, type MonthKey } from './dates'

/** Efecto de un movimiento sobre el saldo de cada cuenta. */
export function accountEffects(tx: Transaction): Array<[accountId: string, delta: Cents]> {
  switch (tx.type) {
    case 'income':
      return tx.accountId ? [[tx.accountId, tx.amount]] : []
    case 'expense':
      // Si pagó otra persona (gasto compartido) no hay cuenta mía involucrada
      return tx.accountId ? [[tx.accountId, -tx.amount]] : []
    case 'transfer': {
      const out: Array<[string, Cents]> = []
      if (tx.accountId) out.push([tx.accountId, -tx.amount])
      if (tx.toAccountId) out.push([tx.toAccountId, tx.amount])
      return out
    }
    case 'settlement':
      if (!tx.accountId) return []
      return [[tx.accountId, tx.settleDirection === 'received' ? tx.amount : -tx.amount]]
  }
}

/** Saldo de cada cuenta, opcionalmente hasta una fecha (incluida). */
export function computeBalances(
  accounts: Account[],
  txs: Transaction[],
  upTo?: ISODate,
): Map<string, Cents> {
  const balances = new Map<string, Cents>()
  for (const a of accounts) balances.set(a.id, a.openingBalance)
  for (const tx of txs) {
    if (upTo && tx.date > upTo) continue
    for (const [id, delta] of accountEffects(tx)) {
      if (balances.has(id)) balances.set(id, (balances.get(id) ?? 0) + delta)
    }
  }
  return balances
}

export const isLiquid = (a: Account) => a.type === 'cash' || a.type === 'bank'

/** Deuda de una tarjeta (positiva) a partir de su saldo (negativo). */
export const cardDebt = (balance: Cents) => Math.max(0, -balance)

export interface Totals {
  income: Cents
  expense: Cents
  net: Cents
}

/** Ingresos y gastos efectivos (mi parte) de una lista de movimientos. */
export function totals(txs: Transaction[]): Totals {
  let income = 0
  let expense = 0
  for (const tx of txs) {
    if (tx.type === 'income') income += tx.myAmount
    else if (tx.type === 'expense') expense += tx.myAmount
  }
  return { income, expense, net: income - expense }
}

export function totalsForMonth(txs: Transaction[], month: MonthKey): Totals {
  return totals(txs.filter((t) => monthKey(t.date) === month))
}

/** Totales por mes para una lista de meses. */
export function totalsByMonth(txs: Transaction[], months: MonthKey[]): Map<MonthKey, Totals> {
  const map = new Map<MonthKey, Totals>(months.map((m) => [m, { income: 0, expense: 0, net: 0 }]))
  for (const tx of txs) {
    const t = map.get(monthKey(tx.date))
    if (!t) continue
    if (tx.type === 'income') t.income += tx.myAmount
    else if (tx.type === 'expense') t.expense += tx.myAmount
  }
  for (const t of map.values()) t.net = t.income - t.expense
  return map
}

/** Gasto efectivo por categoría. */
export function expenseByCategory(txs: Transaction[]): Map<string, Cents> {
  const map = new Map<string, Cents>()
  for (const tx of txs) {
    if (tx.type !== 'expense' || !tx.categoryId) continue
    map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.myAmount)
  }
  return map
}

/** Signo con el que se muestra un movimiento en las listas, desde mi punto de vista. */
export function displayAmount(tx: Transaction): { value: Cents; tone: 'income' | 'expense' | 'neutral' } {
  if (tx.type === 'income') return { value: tx.myAmount, tone: 'income' }
  if (tx.type === 'expense') return { value: -tx.myAmount, tone: 'expense' }
  if (tx.type === 'settlement')
    return { value: tx.settleDirection === 'received' ? tx.amount : -tx.amount, tone: 'neutral' }
  return { value: tx.amount, tone: 'neutral' }
}
