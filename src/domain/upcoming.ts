/** Próximos pagos: tarjetas, suscripciones y recurrentes de los próximos días. */
import type { Account, RecurringRule, Transaction } from '../db/types'
import { summarizeCard } from './cards'
import { addDays, type ISODate } from './dates'
import type { Cents } from './money'
import { upcoming } from './recurrence'

export interface UpcomingPayment {
  id: string
  kind: 'card' | 'subscription' | 'recurring'
  name: string
  date: ISODate
  amount: Cents
  icon?: string
  color?: string
  /** Pago de tarjeta vencido */
  overdue?: boolean
  /** Para abrir el detalle */
  refId: string
  categoryId?: string
}

export function upcomingPayments(
  accounts: Account[],
  rules: RecurringRule[],
  txs: Transaction[],
  today: ISODate,
  days = 7,
): UpcomingPayment[] {
  const until = addDays(today, days)
  const out: UpcomingPayment[] = []

  for (const card of accounts) {
    if (card.archived || card.type !== 'credit') continue
    const s = summarizeCard(card, txs, today)
    if (!s.dueDate || s.toPay <= 0) continue
    if (s.status === 'overdue' || (s.status === 'due' && s.dueDate <= until)) {
      out.push({
        id: `card-${card.id}`,
        kind: 'card',
        name: `Pago ${card.name}`,
        date: s.dueDate,
        amount: s.toPay,
        icon: card.icon,
        color: card.color,
        overdue: s.status === 'overdue',
        refId: card.id,
      })
    }
  }

  for (const r of rules) {
    // Solo salidas de dinero: gastos y transferencias (por ejemplo, ahorro automático)
    if (!r.active || r.type === 'income') continue
    for (const d of upcoming(r, 8)) {
      if (d < today) continue
      if (d > until) break
      out.push({
        id: `${r.id}-${d}`,
        kind: r.kind === 'subscription' ? 'subscription' : 'recurring',
        name: r.name,
        date: d,
        amount: r.amount,
        icon: r.icon,
        color: r.color,
        refId: r.id,
        categoryId: r.categoryId,
      })
    }
  }

  return out.sort((a, b) => (a.overdue === b.overdue ? a.date.localeCompare(b.date) : a.overdue ? -1 : 1))
}
