import { describe, expect, it } from 'vitest'
import type { Transaction } from '../src/db/types'
import { buildSplit, draftFromSplit, personBalances } from '../src/domain/shared'
import { computeBalances, totals } from '../src/domain/ledger'

let n = 0
const tx = (p: Partial<Transaction>): Transaction => ({
  id: String(n++),
  type: 'expense',
  amount: 0,
  myAmount: 0,
  date: '2026-10-01',
  note: '',
  tags: [],
  createdAt: 0,
  updatedAt: 0,
  ...p,
})

describe('dividir gastos', () => {
  it('partes iguales sin perder centavos', () => {
    const r = buildSplit(10000, { mode: 'equal', paidBy: 'me', participants: ['me', 'ana', 'luis'], values: {} })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.split.shares.map((s) => s.amount)).toEqual([3334, 3333, 3333])
    expect(r.myAmount).toBe(3334)
  })

  it('por porcentaje', () => {
    const r = buildSplit(9000, { mode: 'percent', paidBy: 'ana', participants: ['me', 'ana'], values: { me: 40, ana: 60 } })
    expect(r.ok && r.myAmount).toBe(3600)
  })

  it('porcentajes que no suman 100 dan error', () => {
    const r = buildSplit(9000, { mode: 'percent', paidBy: 'me', participants: ['me', 'ana'], values: { me: 40, ana: 50 } })
    expect(r.ok).toBe(false)
  })

  it('por montos: deben sumar el total', () => {
    expect(buildSplit(5000, { mode: 'amount', paidBy: 'me', participants: ['me', 'ana'], values: { me: 2000, ana: 2000 } }).ok).toBe(false)
    const r = buildSplit(5000, { mode: 'amount', paidBy: 'me', participants: ['me', 'ana'], values: { me: 2000, ana: 3000 } })
    expect(r.ok && r.myAmount).toBe(2000)
  })

  it('necesita al menos otra persona', () => {
    expect(buildSplit(5000, { mode: 'equal', paidBy: 'me', participants: ['me'], values: {} }).ok).toBe(false)
  })

  it('pagar todo por un amigo: mi parte es 0 y me debe el total', () => {
    const r = buildSplit(5000, { mode: 'equal', paidBy: 'me', participants: ['ana'], values: {} })
    expect(r.ok && r.myAmount).toBe(0)
  })

  it('se puede reconstruir el borrador para editar', () => {
    const r = buildSplit(9000, { mode: 'percent', paidBy: 'me', participants: ['me', 'ana'], values: { me: 40, ana: 60 } })
    if (!r.ok) throw new Error()
    expect(draftFromSplit(r.split).values).toEqual({ me: 40, ana: 60 })
  })
})

describe('saldos por persona', () => {
  const pagueYo = tx({
    amount: 9000,
    myAmount: 3000,
    accountId: 'banco',
    split: { mode: 'equal', paidBy: 'me', shares: [{ who: 'me', amount: 3000 }, { who: 'ana', amount: 3000 }, { who: 'luis', amount: 3000 }] },
  })
  const pagoAna = tx({
    amount: 4000,
    myAmount: 2000,
    split: { mode: 'equal', paidBy: 'ana', shares: [{ who: 'me', amount: 2000 }, { who: 'ana', amount: 2000 }] },
  })

  it('quién me debe y a quién le debo', () => {
    const b = personBalances([pagueYo, pagoAna])
    expect(b.get('ana')).toBe(1000) // me debía 30, le debo 20
    expect(b.get('luis')).toBe(3000)
  })

  it('saldar cuentas deja el saldo en cero sin contar como ingreso', () => {
    const saldo = tx({ type: 'settlement', amount: 3000, personId: 'luis', settleDirection: 'received', accountId: 'banco' })
    const all = [pagueYo, pagoAna, saldo]
    expect(personBalances(all).get('luis')).toBe(0)
    expect(totals(all)).toEqual({ income: 0, expense: 5000, net: -5000 })
  })

  it('solo sale de mi cuenta lo que yo pagué', () => {
    const b = computeBalances(
      [{ id: 'banco', name: 'b', type: 'bank', openingBalance: 100000, icon: '', color: 'blue', order: 0, archived: false, createdAt: 0 }],
      [pagueYo, pagoAna],
    )
    expect(b.get('banco')).toBe(91000)
  })
})
