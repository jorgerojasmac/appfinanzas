/**
 * Tarjetas de crédito: ciclo de facturación, próximo pago y uso del cupo.
 *
 * Una tarjeta es una cuenta cuyo saldo es negativo cuando hay deuda. Las
 * compras son gastos (aumentan la deuda) y los pagos son transferencias desde
 * otra cuenta (la reducen sin contarse como gasto).
 */
import type { Account, Transaction } from '../db/types'
import { addMonths, dateInMonth, diffDays, monthKey, type ISODate } from './dates'
import { computeBalances } from './ledger'
import type { Cents } from './money'

/** Uso del cupo recomendado */
export const IDEAL_USAGE = 0.3

export type CardStatus = 'paid' | 'due' | 'overdue' | 'estimate' | 'no-cycle'

export interface CardSummary {
  debt: Cents
  limit: Cents | null
  usage: number | null
  available: Cents | null
  lastStatement?: ISODate
  nextStatement?: ISODate
  /** Fecha del pago que corresponde mostrar */
  dueDate?: ISODate
  /** Deuda al último corte */
  statementBalance: Cents
  /** Pagos hechos desde el último corte */
  paidSinceStatement: Cents
  /** Lo que falta pagar del corte (o la deuda actual si es estimado) */
  toPay: Cents
  status: CardStatus
  daysToDue?: number
}

/** Fecha de corte más reciente que sea <= hoy. */
export function lastStatementDate(statementDay: number, today: ISODate): ISODate {
  const thisMonth = dateInMonth(monthKey(today), statementDay)
  return thisMonth <= today ? thisMonth : dateInMonth(addMonths(monthKey(today), -1), statementDay)
}

/** Fecha de pago que corresponde a un corte: mismo mes si el día de pago es posterior, si no el mes siguiente. */
export function dueDateFor(statement: ISODate, statementDay: number, dueDay: number): ISODate {
  const m = monthKey(statement)
  return dueDay > statementDay ? dateInMonth(m, dueDay) : dateInMonth(addMonths(m, 1), dueDay)
}

/** Pagos (transferencias hacia la tarjeta) en un rango de fechas: (from, to]. */
function paymentsBetween(cardId: string, txs: Transaction[], from: ISODate, to: ISODate): Cents {
  let sum = 0
  for (const t of txs) {
    if (t.type === 'transfer' && t.toAccountId === cardId && t.date > from && t.date <= to) sum += t.amount
  }
  return sum
}

export function summarizeCard(card: Account, txs: Transaction[], today: ISODate): CardSummary {
  const balance = computeBalances([card], txs).get(card.id) ?? card.openingBalance
  const debt = Math.max(0, -balance)
  const limit = card.creditLimit ?? null
  const base = {
    debt,
    limit,
    usage: limit ? debt / limit : null,
    available: limit != null ? Math.max(0, limit - debt) : null,
  }

  if (!card.statementDay || !card.dueDay) {
    return { ...base, statementBalance: 0, paidSinceStatement: 0, toPay: debt, status: 'no-cycle' }
  }

  const sDay = card.statementDay
  const dDay = card.dueDay
  const last = lastStatementDate(sDay, today)
  const next = dateInMonth(addMonths(monthKey(last), 1), sDay)
  const due = dueDateFor(last, sDay, dDay)
  const statementBalance = Math.max(0, -(computeBalances([card], txs, last).get(card.id) ?? 0))
  const paid = paymentsBetween(card.id, txs, last, today)
  const remaining = Math.max(0, statementBalance - paid)

  const common = { ...base, lastStatement: last, nextStatement: next, statementBalance, paidSinceStatement: paid }

  if (today <= due) {
    return {
      ...common,
      dueDate: due,
      toPay: remaining,
      status: remaining > 0 ? 'due' : 'paid',
      daysToDue: diffDays(today, due),
    }
  }
  if (remaining > 0) {
    return { ...common, dueDate: due, toPay: remaining, status: 'overdue', daysToDue: diffDays(today, due) }
  }
  // El corte anterior ya está pagado: se estima el próximo pago con la deuda actual
  const nextDue = dueDateFor(next, sDay, dDay)
  return {
    ...common,
    dueDate: nextDue,
    toPay: debt,
    status: debt > 0 ? 'estimate' : 'paid',
    daysToDue: diffDays(today, nextDue),
  }
}

/** Uso total del cupo de todas las tarjetas con cupo definido. */
export function totalUsage(summaries: CardSummary[]): number | null {
  const withLimit = summaries.filter((s) => s.limit)
  if (!withLimit.length) return null
  const debt = withLimit.reduce((a, s) => a + s.debt, 0)
  const limit = withLimit.reduce((a, s) => a + (s.limit ?? 0), 0)
  return limit ? debt / limit : null
}
