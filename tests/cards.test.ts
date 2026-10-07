import { describe, expect, it } from 'vitest'
import type { Account, Transaction } from '../src/db/types'
import { dueDateFor, lastStatementDate, summarizeCard, totalUsage } from '../src/domain/cards'
import { totals } from '../src/domain/ledger'

const card: Account = {
  id: 'visa',
  name: 'Visa',
  type: 'credit',
  openingBalance: 0,
  icon: 'CreditCard',
  color: 'indigo',
  order: 0,
  archived: false,
  creditLimit: 100000,
  statementDay: 25,
  dueDay: 10,
  createdAt: 0,
}

let n = 0
const tx = (p: Partial<Transaction>): Transaction => ({
  id: String(n++),
  type: 'expense',
  amount: 0,
  myAmount: p.amount ?? 0,
  date: '2026-09-01',
  note: '',
  tags: [],
  createdAt: 0,
  updatedAt: 0,
  ...p,
})

const buy = (amount: number, date: string) => tx({ type: 'expense', amount, date, accountId: 'visa' })
const pay = (amount: number, date: string) => tx({ type: 'transfer', amount, date, accountId: 'banco', toAccountId: 'visa' })

describe('fechas de tarjeta', () => {
  it('último corte', () => {
    expect(lastStatementDate(25, '2026-10-07')).toBe('2026-09-25')
    expect(lastStatementDate(25, '2026-10-25')).toBe('2026-10-25')
  })
  it('fecha de pago: mes siguiente si el día de pago es menor al de corte', () => {
    expect(dueDateFor('2026-09-25', 25, 10)).toBe('2026-10-10')
    expect(dueDateFor('2026-09-05', 5, 20)).toBe('2026-09-20')
  })
})

describe('resumen de tarjeta', () => {
  const txs = [buy(30000, '2026-09-10'), buy(20000, '2026-09-20'), buy(5000, '2026-09-28')]

  it('antes de la fecha de pago: a pagar es la deuda al corte, no las compras posteriores', () => {
    const s = summarizeCard(card, txs, '2026-10-07')
    expect(s.debt).toBe(55000)
    expect(s.statementBalance).toBe(50000)
    expect(s.toPay).toBe(50000)
    expect(s.status).toBe('due')
    expect(s.dueDate).toBe('2026-10-10')
    expect(s.daysToDue).toBe(3)
    expect(s.usage).toBeCloseTo(0.55)
  })

  it('un pago parcial reduce lo que falta pagar', () => {
    const s = summarizeCard(card, [...txs, pay(20000, '2026-10-01')], '2026-10-07')
    expect(s.paidSinceStatement).toBe(20000)
    expect(s.toPay).toBe(30000)
  })

  it('pagado completo', () => {
    expect(summarizeCard(card, [...txs, pay(50000, '2026-10-05')], '2026-10-07').status).toBe('paid')
  })

  it('vencido si pasó la fecha de pago y falta pagar', () => {
    const s = summarizeCard(card, txs, '2026-10-12')
    expect(s.status).toBe('overdue')
    expect(s.toPay).toBe(50000)
  })

  it('tras pagar el corte, estima el próximo pago con la deuda actual', () => {
    const s = summarizeCard(card, [...txs, pay(50000, '2026-10-05')], '2026-10-12')
    expect(s.status).toBe('estimate')
    expect(s.toPay).toBe(5000)
    expect(s.dueDate).toBe('2026-11-10')
  })

  it('el pago de la tarjeta no se cuenta como gasto', () => {
    expect(totals([...txs, pay(50000, '2026-10-05')]).expense).toBe(55000)
  })

  it('sin días de corte y pago configurados', () => {
    const s = summarizeCard({ ...card, statementDay: undefined }, txs, '2026-10-07')
    expect(s.status).toBe('no-cycle')
    expect(s.toPay).toBe(55000)
  })

  it('uso total del cupo', () => {
    expect(totalUsage([summarizeCard(card, txs, '2026-10-07'), summarizeCard({ ...card, id: 'mc' }, [], '2026-10-07')])).toBeCloseTo(0.275)
  })
})
