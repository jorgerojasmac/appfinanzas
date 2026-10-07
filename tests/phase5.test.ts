import { describe, expect, it } from 'vitest'
import type { Account, Category, RecurringRule, Transaction } from '../src/db/types'
import { cushionAdvice } from '../src/domain/cushion'
import { cleanTag, EMPTY_FILTERS, filterTransactions, spendByTag } from '../src/domain/filters'
import { buildMonthClose, pendingMonthClose } from '../src/domain/monthClose'
import { createPin, verifyPin } from '../src/domain/pin'
import { upcomingPayments } from '../src/domain/upcoming'

let n = 0
const tx = (p: Partial<Transaction>): Transaction => ({
  id: String(n++),
  type: 'expense',
  amount: 0,
  myAmount: p.myAmount ?? p.amount ?? 0,
  date: '2026-10-01',
  note: '',
  tags: [],
  accountId: 'banco',
  createdAt: 0,
  updatedAt: 0,
  ...p,
})
const acc = (p: Partial<Account>): Account => ({ id: 'banco', name: 'Banco', type: 'bank', openingBalance: 0, icon: '', color: 'blue', order: 0, archived: false, createdAt: 0, ...p })
const cats = new Map<string, Category>([['comida', { id: 'comida', name: 'Alimentación', icon: '', color: 'green', kind: 'expense', fixed: false, order: 0, archived: false }]])
const accts = new Map([['banco', acc({})]])

describe('búsqueda y filtros', () => {
  const txs = [
    tx({ amount: 4500, categoryId: 'comida', note: 'Supermercado', tags: ['casa'] }),
    tx({ amount: 12000, note: 'Pasajes', tags: ['viaje'], date: '2026-09-15' }),
    tx({ type: 'income', amount: 300000, note: 'Honorarios' }),
  ]
  it('busca por texto sin importar tildes ni mayúsculas', () => {
    expect(filterTransactions(txs, { ...EMPTY_FILTERS, text: 'alimentacion' }, cats, accts)).toHaveLength(1)
    expect(filterTransactions(txs, { ...EMPTY_FILTERS, text: 'SUPER' }, cats, accts)).toHaveLength(1)
    expect(filterTransactions(txs, { ...EMPTY_FILTERS, text: '#viaje' }, cats, accts)).toHaveLength(1)
  })
  it('filtra por tipo, etiqueta, fechas y montos', () => {
    expect(filterTransactions(txs, { ...EMPTY_FILTERS, types: ['income'] }, cats, accts)).toHaveLength(1)
    expect(filterTransactions(txs, { ...EMPTY_FILTERS, tags: ['viaje'] }, cats, accts)).toHaveLength(1)
    expect(filterTransactions(txs, { ...EMPTY_FILTERS, from: '2026-10-01' }, cats, accts)).toHaveLength(2)
    expect(filterTransactions(txs, { ...EMPTY_FILTERS, minAmount: 5000, maxAmount: 20000 }, cats, accts)).toHaveLength(1)
  })
  it('totales por etiqueta y etiquetas limpias', () => {
    expect(spendByTag(txs)).toEqual([
      { tag: 'viaje', total: 12000, count: 1 },
      { tag: 'casa', total: 4500, count: 1 },
    ])
    expect(cleanTag('#Viaje a Japón')).toBe('viaje-a-japon')
  })
})

describe('próximos pagos', () => {
  it('incluye tarjetas, suscripciones y recurrentes de los próximos 7 días', () => {
    const visa = acc({ id: 'visa', name: 'Visa', type: 'credit', creditLimit: 100000, statementDay: 25, dueDay: 10 })
    const rules: RecurringRule[] = [
      { id: 'n', kind: 'subscription', name: 'Netflix', type: 'expense', amount: 1549, frequency: 'monthly', interval: 1, nextDate: '2026-10-12', anchorDay: 12, active: true, createdAt: 0 },
      { id: 'a', kind: 'recurring', name: 'Arriendo', type: 'expense', amount: 75000, frequency: 'monthly', interval: 1, nextDate: '2026-11-01', anchorDay: 1, active: true, createdAt: 0 },
      { id: 's', kind: 'recurring', name: 'Sueldo', type: 'income', amount: 1, frequency: 'monthly', interval: 1, nextDate: '2026-10-08', anchorDay: 8, active: true, createdAt: 0 },
    ]
    const txs = [tx({ amount: 30000, accountId: 'visa', date: '2026-09-20' })]
    const list = upcomingPayments([visa], rules, txs, '2026-10-07')
    expect(list.map((p) => p.name)).toEqual(['Pago Visa', 'Netflix'])
    expect(list[0].amount).toBe(30000)
  })
})

describe('fondo colchón', () => {
  const cushion = acc({ id: 'colchon', type: 'savings', savingsPurpose: 'cushion', openingBalance: 100000 })
  const income = (amount: number, date: string) => tx({ type: 'income', amount, date })

  it('mes bueno: sugiere apartar el excedente, descontando lo ya apartado y sin pasar la meta', () => {
    const r = cushionAdvice([cushion], [income(350000, '2026-10-03')], 250000, '2026-10-07')
    expect(r.mode).toBe('surplus')
    expect(r.surplus).toBe(100000)
    expect(r.suggestSave).toBe(100000)
    const saved = tx({ type: 'transfer', amount: 40000, accountId: 'banco', toAccountId: 'colchon', date: '2026-10-05' })
    expect(cushionAdvice([cushion], [income(350000, '2026-10-03'), saved], 250000, '2026-10-07').suggestSave).toBe(60000)
  })

  it('mes anterior flojo: sugiere usar la diferencia, limitada al saldo del colchón', () => {
    const r = cushionAdvice([cushion], [income(100000, '2026-09-10')], 250000, '2026-10-07')
    expect(r.mode).toBe('shortfall')
    expect(r.shortfallMonth).toBe('2026-09')
    expect(r.shortfall).toBe(150000)
    expect(r.suggestUse).toBe(100000)
  })

  it('no repite la sugerencia si ya se usó el colchón', () => {
    const used = tx({ type: 'transfer', amount: 150000, accountId: 'colchon', toAccountId: 'banco', date: '2026-10-02' })
    const big = acc({ id: 'colchon', type: 'savings', savingsPurpose: 'cushion', openingBalance: 500000 })
    expect(cushionAdvice([big], [income(100000, '2026-09-10'), used], 250000, '2026-10-07').suggestUse).toBe(0)
  })

  it('mes en curso sin llegar al ingreso base: no sugiere usar el colchón todavía', () => {
    const r = cushionAdvice([cushion], [income(300000, '2026-09-10'), income(50000, '2026-10-03')], 250000, '2026-10-07')
    expect(r.mode).toBe('pending')
    expect(r.suggestUse).toBe(0)
  })
})

describe('cierre de mes', () => {
  const base = { accounts: [acc({})], budgets: [], categories: [...cats.values()], rules: [], manualBase: null }
  it('resume el mes y detecta la categoría que más creció', () => {
    const txs = [
      tx({ type: 'income', amount: 300000, date: '2026-09-05' }),
      tx({ amount: 20000, categoryId: 'comida', date: '2026-08-10' }),
      tx({ amount: 50000, categoryId: 'comida', date: '2026-09-10' }),
    ]
    const c = buildMonthClose({ ...base, transactions: txs }, '2026-09')
    expect(c.income).toBe(300000)
    expect(c.grew).toEqual({ categoryId: 'comida', from: 20000, to: 50000 })
    expect(c.highlight.kind).toBe('achievement')
  })
  it('se muestra una sola vez por mes', () => {
    const txs = [tx({ date: '2026-09-10' })]
    expect(pendingMonthClose(txs, '2026-10', null)).toBe('2026-09')
    expect(pendingMonthClose(txs, '2026-10', '2026-09')).toBeNull()
    expect(pendingMonthClose([], '2026-10', null)).toBeNull()
  })
})

describe('PIN', () => {
  it('guarda solo el hash y verifica', async () => {
    const rec = await createPin('1234')
    expect(rec.hash).not.toContain('1234')
    expect(await verifyPin('1234', rec)).toBe(true)
    expect(await verifyPin('0000', rec)).toBe(false)
  })
})
