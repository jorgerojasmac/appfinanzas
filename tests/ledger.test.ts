import { describe, expect, it } from 'vitest'
import type { Account, Transaction } from '../src/db/types'
import { computeBalances, totals, totalsByMonth } from '../src/domain/ledger'

const acc = (id: string, type: Account['type'], openingBalance = 0): Account => ({
  id,
  name: id,
  type,
  openingBalance,
  icon: 'Wallet',
  color: 'blue',
  order: 0,
  archived: false,
  createdAt: 0,
})

let n = 0
const tx = (p: Partial<Transaction>): Transaction => ({
  id: String(n++),
  type: 'expense',
  amount: 0,
  myAmount: p.myAmount ?? p.amount ?? 0,
  date: '2026-10-01',
  note: '',
  tags: [],
  createdAt: 0,
  updatedAt: 0,
  ...p,
})

describe('ledger', () => {
  const accounts = [acc('banco', 'bank', 100000), acc('visa', 'credit')]

  it('una compra con tarjeta y su pago cuentan como UN solo gasto', () => {
    const txs = [
      tx({ type: 'expense', amount: 5000, accountId: 'visa' }),
      tx({ type: 'transfer', amount: 5000, accountId: 'banco', toAccountId: 'visa' }),
    ]
    const b = computeBalances(accounts, txs)
    expect(b.get('visa')).toBe(0)
    expect(b.get('banco')).toBe(95000)
    expect(totals(txs)).toEqual({ income: 0, expense: 5000, net: -5000 })
  })

  it('gasto compartido: sale el total de mi cuenta pero solo mi parte es gasto', () => {
    const txs = [tx({ type: 'expense', amount: 9000, myAmount: 3000, accountId: 'banco' })]
    expect(computeBalances(accounts, txs).get('banco')).toBe(91000)
    expect(totals(txs).expense).toBe(3000)
  })

  it('gasto compartido pagado por otra persona no toca mis cuentas', () => {
    const txs = [tx({ type: 'expense', amount: 9000, myAmount: 3000 })]
    expect(computeBalances(accounts, txs).get('banco')).toBe(100000)
    expect(totals(txs).expense).toBe(3000)
  })

  it('las liquidaciones mueven dinero pero no son ingreso ni gasto', () => {
    const txs = [tx({ type: 'settlement', amount: 3000, accountId: 'banco', settleDirection: 'received' })]
    expect(computeBalances(accounts, txs).get('banco')).toBe(103000)
    expect(totals(txs)).toEqual({ income: 0, expense: 0, net: 0 })
  })

  it('saldo hasta una fecha', () => {
    const txs = [
      tx({ type: 'income', amount: 1000, accountId: 'banco', date: '2026-09-01' }),
      tx({ type: 'income', amount: 1000, accountId: 'banco', date: '2026-10-05' }),
    ]
    expect(computeBalances(accounts, txs, '2026-09-30').get('banco')).toBe(101000)
  })

  it('totales por mes', () => {
    const txs = [
      tx({ type: 'income', amount: 2000, accountId: 'banco', date: '2026-09-10' }),
      tx({ type: 'expense', amount: 500, accountId: 'banco', date: '2026-09-11' }),
      tx({ type: 'expense', amount: 700, accountId: 'banco', date: '2026-10-01' }),
    ]
    const m = totalsByMonth(txs, ['2026-09', '2026-10'])
    expect(m.get('2026-09')).toEqual({ income: 2000, expense: 500, net: 1500 })
    expect(m.get('2026-10')).toEqual({ income: 0, expense: 700, net: -700 })
  })
})
