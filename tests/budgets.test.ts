import { describe, expect, it } from 'vitest'
import type { Category, Transaction } from '../src/db/types'
import { budgetLimit, budgetTone, computeIncomeBase, suggestBudgets } from '../src/domain/budgets'
import { goalProgress } from '../src/domain/goals'

let n = 0
const tx = (p: Partial<Transaction>): Transaction => ({
  id: String(n++),
  type: 'income',
  amount: 0,
  myAmount: p.myAmount ?? p.amount ?? 0,
  date: '2026-01-01',
  note: '',
  tags: [],
  accountId: 'b',
  createdAt: 0,
  updatedAt: 0,
  ...p,
})

const incomes = (list: Array<[string, number]>) => list.map(([date, amount]) => tx({ type: 'income', amount, date }))

describe('ingreso base', () => {
  it('promedia los 2 meses más bajos de los últimos 6 completos', () => {
    const txs = incomes([
      ['2026-03-01', 300000], // fuera de la ventana de 6 meses
      ['2026-04-01', 200000],
      ['2026-05-01', 500000],
      ['2026-06-01', 150000],
      ['2026-07-01', 400000],
      ['2026-08-01', 350000],
      ['2026-09-01', 100000], // septiembre es el último mes completo
      ['2026-10-02', 900000], // mes en curso: no cuenta
    ])
    const r = computeIncomeBase(txs, '2026-10')
    expect(r.months.map((m) => m.month)).toEqual(['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'])
    expect(r.lowest.sort()).toEqual(['2026-06', '2026-09'])
    expect(r.value).toBe(125000)
  })

  it('un mes sin ingresos cuenta como mes bajo', () => {
    const txs = incomes([
      ['2026-06-01', 300000],
      ['2026-08-01', 300000],
      ['2026-09-01', 300000],
    ])
    expect(computeIncomeBase(txs, '2026-10').value).toBe(150000)
  })

  it('pide al menos 3 meses completos', () => {
    const r = computeIncomeBase(incomes([['2026-08-01', 1000], ['2026-09-01', 1000]]), '2026-10')
    expect(r.value).toBeNull()
    expect(r.missing).toBe(1)
  })

  it('ignora el primer mes si se empezó a usar la app a mitad de mes', () => {
    const r = computeIncomeBase(incomes([['2026-06-20', 1000], ['2026-07-01', 1000], ['2026-08-01', 1000], ['2026-09-01', 1000]]), '2026-10')
    expect(r.months[0].month).toBe('2026-07')
  })
})

describe('presupuestos', () => {
  it('límite fijo o porcentaje del ingreso base', () => {
    expect(budgetLimit({ mode: 'fixed', amount: 5000 }, null)).toBe(5000)
    expect(budgetLimit({ mode: 'percent', percent: 12.5 }, 200000)).toBe(25000)
    expect(budgetLimit({ mode: 'percent', percent: 10 }, null)).toBeNull()
  })

  it('colores por avance', () => {
    expect(budgetTone(70, 100)).toBe('ok')
    expect(budgetTone(80, 100)).toBe('warn')
    expect(budgetTone(100, 100)).toBe('warn')
    expect(budgetTone(101, 100)).toBe('over')
  })

  it('sugiere recortando solo gastos variables para dejar 15 % de ahorro', () => {
    const cats: Category[] = [
      { id: 'casa', name: 'Casa', icon: '', color: 'brown', kind: 'expense', fixed: true, order: 0, archived: false },
      { id: 'comida', name: 'Comida', icon: '', color: 'green', kind: 'expense', fixed: false, order: 1, archived: false },
    ]
    const txs: Transaction[] = []
    for (const m of ['2026-07', '2026-08', '2026-09']) {
      txs.push(tx({ type: 'expense', amount: 50000, categoryId: 'casa', date: `${m}-01` }))
      txs.push(tx({ type: 'expense', amount: 60000, categoryId: 'comida', date: `${m}-05` }))
    }
    // base 1000: disponible = 850 - 500 = 350 para variables (promedio 600)
    const s = suggestBudgets(txs, cats, 100000, '2026-10')
    expect(s.find((x) => x.categoryId === 'casa')?.suggested).toBe(50000)
    expect(s.find((x) => x.categoryId === 'comida')?.suggested).toBe(35000)
  })
})

describe('metas', () => {
  it('calcula cuánto apartar por mes', () => {
    const p = goalProgress({ target: 120000, targetDate: '2027-04-06' }, 60000, '2026-10-06')
    expect(p.ratio).toBe(0.5)
    expect(p.monthsLeft).toBe(6)
    expect(p.perMonth).toBe(10000)
  })

  it('meta cumplida', () => {
    expect(goalProgress({ target: 1000 }, 1500).done).toBe(true)
  })
})
