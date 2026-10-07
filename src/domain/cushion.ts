/**
 * Fondo colchón para ingresos irregulares, con el método "págate tu ingreso base":
 * - Si este mes ya ingresó más que el ingreso base, se sugiere apartar el excedente
 *   (es seguro: lo ingresado no baja).
 * - Si el mes anterior, ya cerrado, quedó por debajo del ingreso base, se sugiere
 *   usar del colchón la diferencia para completarlo.
 * - Durante el mes en curso solo se muestra cuánto llevas de tu ingreso base.
 */
import type { Account, Transaction } from '../db/types'
import { addMonths, monthKey, type ISODate, type MonthKey } from './dates'
import { computeBalances, totalsByMonth } from './ledger'
import type { Cents } from './money'

/** Meta del colchón: meses de ingreso base */
export const CUSHION_MONTHS = 3

export interface CushionAdvice {
  balance: Cents
  target: Cents | null
  /** Ingreso del mes en curso hasta hoy */
  income: Cents
  base: Cents | null
  mode: 'surplus' | 'shortfall' | 'pending' | 'even' | 'no-base'
  /** Excedente sobre el ingreso base este mes */
  surplus: Cents
  /** Ya apartado al colchón este mes */
  savedThisMonth: Cents
  /** Cuánto apartar sugerido */
  suggestSave: Cents
  /** Mes flojo que se compensa (el anterior) */
  shortfallMonth: MonthKey | null
  /** Diferencia entre el ingreso base y lo que ingresó ese mes */
  shortfall: Cents
  /** Ya usado del colchón para compensarlo */
  usedRecent: Cents
  /** Cuánto usar del colchón (limitado a su saldo) */
  suggestUse: Cents
  hasAccount: boolean
  history: Array<{ month: MonthKey; income: Cents; diff: Cents | null }>
}

export function cushionAdvice(accounts: Account[], txs: Transaction[], base: Cents | null, today: ISODate): CushionAdvice {
  const month = monthKey(today)
  const prev = addMonths(month, -1)
  const cushionAccts = accounts.filter((a) => !a.archived && a.type === 'savings' && a.savingsPurpose === 'cushion')
  const ids = new Set(cushionAccts.map((a) => a.id))
  const balances = computeBalances(cushionAccts, txs, today)
  const balance = cushionAccts.reduce((s, a) => s + Math.max(0, balances.get(a.id) ?? 0), 0)

  const months = Array.from({ length: 6 }, (_, i) => addMonths(month, i - 5))
  const byMonth = totalsByMonth(txs, months)
  const income = byMonth.get(month)?.income ?? 0
  const prevIncome = byMonth.get(prev)?.income ?? 0
  const prevHasData = txs.some((t) => monthKey(t.date) === prev)

  let savedThisMonth = 0
  let usedRecent = 0
  for (const t of txs) {
    if (t.type !== 'transfer' || t.date > today) continue
    const m = monthKey(t.date)
    if (m === month && t.toAccountId && ids.has(t.toAccountId)) savedThisMonth += t.amount
    if ((m === month || m === prev) && t.accountId && ids.has(t.accountId)) usedRecent += t.amount
  }

  const target = base ? base * CUSHION_MONTHS : null
  const history = months.map((m) => {
    const inc = byMonth.get(m)?.income ?? 0
    return { month: m, income: inc, diff: base != null ? inc - base : null }
  })
  const common = {
    balance,
    target,
    income,
    base,
    savedThisMonth,
    usedRecent,
    hasAccount: cushionAccts.length > 0,
    history,
    surplus: 0,
    suggestSave: 0,
    shortfallMonth: null,
    shortfall: 0,
    suggestUse: 0,
  }

  if (base == null) return { ...common, mode: 'no-base' }

  if (income > base) {
    const surplus = income - base
    const room = target != null ? Math.max(0, target - balance) : surplus
    return { ...common, mode: 'surplus', surplus, suggestSave: Math.max(0, Math.min(surplus - savedThisMonth, room)) }
  }

  if (prevHasData && prevIncome < base) {
    const shortfall = base - prevIncome
    const remaining = Math.max(0, shortfall - usedRecent)
    return { ...common, mode: 'shortfall', shortfallMonth: prev, shortfall, suggestUse: Math.min(remaining, balance) }
  }

  return { ...common, mode: income < base ? 'pending' : 'even' }
}
