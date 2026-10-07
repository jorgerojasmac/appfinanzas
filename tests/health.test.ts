import { describe, expect, it } from 'vitest'
import type { Account, Category, RecurringRule, Transaction } from '../src/db/types'
import { computeHealth, projectMonth, scale } from '../src/domain/health'
import { categorySlices, cumulativeByDay, makePeriod, netWorthSeries, weeksBetween } from '../src/domain/stats'

let n = 0
const tx = (p: Partial<Transaction>): Transaction => ({
  id: String(n++),
  type: 'expense',
  amount: 0,
  myAmount: p.myAmount ?? p.amount ?? 0,
  date: '2026-01-01',
  note: '',
  tags: [],
  accountId: 'banco',
  createdAt: 0,
  updatedAt: 0,
  ...p,
})

const acc = (p: Partial<Account>): Account => ({
  id: 'banco',
  name: 'Banco',
  type: 'bank',
  openingBalance: 0,
  icon: '',
  color: 'blue',
  order: 0,
  archived: false,
  createdAt: 0,
  ...p,
})

const cats: Category[] = [
  { id: 'casa', name: 'Vivienda', icon: '', color: 'brown', kind: 'expense', fixed: true, order: 0, archived: false },
  { id: 'comida', name: 'Comida', icon: '', color: 'green', kind: 'expense', fixed: false, order: 1, archived: false },
]

/** 6 meses (abr–sep) con ingresos variables y gastos estables */
function history(): Transaction[] {
  const incomes = [300000, 200000, 400000, 250000, 350000, 300000]
  const out: Transaction[] = []
  ;['04', '05', '06', '07', '08', '09'].forEach((m, i) => {
    out.push(tx({ type: 'income', amount: incomes[i], date: `2026-${m}-05` }))
    out.push(tx({ amount: 100000, categoryId: 'casa', date: `2026-${m}-01` }))
    out.push(tx({ amount: 80000, categoryId: 'comida', date: `2026-${m}-15` }))
  })
  return out
}

const base = {
  accounts: [acc({}), acc({ id: 'ahorro', type: 'savings', savingsPurpose: 'emergency', openingBalance: 540000 })],
  budgets: [],
  categories: cats,
  rules: [] as RecurringRule[],
  manualBase: null,
}

describe('indicadores de salud', () => {
  const r = computeHealth({ ...base, transactions: history(), today: '2026-10-15' })
  const get = (id: string) => r.indicators.find((i) => i.id === id)!

  it('ingreso base y tasa de ahorro sobre promedios móviles', () => {
    expect(get('base').value).toBe('$2,250.00') // (200000+250000)/2
    // últimos 3 meses (jul–sep): ingresos 900000, gastos 540000 → 40%
    expect(get('savings').value).toBe('40%')
    expect(get('savings').status).toBe('good')
  })

  it('fondo de emergencia en meses de gasto', () => {
    expect(get('emergency').value).toBe('3 meses')
    expect(get('emergency').status).toBe('warn')
  })

  it('gastos fijos contra el ingreso base', () => {
    expect(get('fixed').value).toBe('44%')
  })

  it('sin datos suficientes muestra un mensaje en vez de ceros', () => {
    const empty = computeHealth({ ...base, accounts: [], transactions: [], today: '2026-10-15' })
    expect(empty.score).toBeNull()
    for (const i of empty.indicators) {
      expect(i.value).toBeNull()
      expect(i.empty).toBeTruthy()
    }
  })

  it('el puntaje reparte el peso de los indicadores sin datos', () => {
    expect(r.score).not.toBeNull()
    const totalPoints = r.breakdown.reduce((a, b) => a + b.points, 0)
    expect(Math.abs(totalPoints - r.score!)).toBeLessThan(1)
    expect(r.breakdown.find((b) => b.id === 'cards')).toBeUndefined()
  })

  it('genera recomendaciones concretas', () => {
    expect(r.recommendations.length).toBeGreaterThan(0)
    expect(r.recommendations.length).toBeLessThanOrEqual(2)
  })

  it('escala lineal acotada', () => {
    expect(scale(0.25, -0.05, 0.25)).toBe(100)
    expect(scale(-1, -0.05, 0.25)).toBe(0)
    expect(scale(3, 0, 6)).toBe(50)
  })
})

describe('proyección del mes', () => {
  it('cuenta los fijos una vez, extrapola los variables y suma recurrentes pendientes', () => {
    const txs = [tx({ amount: 100000, categoryId: 'casa', date: '2026-10-01' }), tx({ amount: 10000, categoryId: 'comida', date: '2026-10-05' })]
    const rules: RecurringRule[] = [
      { id: 'r', kind: 'subscription', name: 'Netflix', type: 'expense', amount: 1500, frequency: 'monthly', interval: 1, nextDate: '2026-10-20', anchorDay: 20, active: true, createdAt: 0 },
    ]
    const p = projectMonth(txs, rules, '2026-10-10', cats)
    // 100000 + 10000/10*31 + 1500
    expect(p.projected).toBe(132500)
    expect(p.pendingRecurring).toBe(1500)
  })
})

describe('estadísticas', () => {
  it('períodos', () => {
    expect(makePeriod('quarter', '2026-08').months).toEqual(['2026-07', '2026-08', '2026-09'])
    expect(makePeriod('year', '2026-08').label).toBe('2026')
  })

  it('agrupa categorías pequeñas en Otros', () => {
    const txs = Array.from({ length: 8 }, (_, i) => tx({ amount: 1000 * (i + 1), categoryId: `c${i}` }))
    const { slices, total } = categorySlices(txs, [])
    expect(slices).toHaveLength(6)
    expect(slices[5].name).toBe('Otros')
    expect(slices.reduce((a, s) => a + s.value, 0)).toBe(total)
  })

  it('gasto acumulado hasta hoy', () => {
    const c = cumulativeByDay([tx({ amount: 500, date: '2026-10-02' }), tx({ amount: 300, date: '2026-10-04' })], '2026-10', '2026-10-05')
    expect(c.slice(0, 6)).toEqual([0, 500, 500, 800, 800, null])
  })

  it('semanas de lunes a domingo', () => {
    const w = weeksBetween('2026-10-01', '2026-10-31')
    expect(w[0][0]).toBe('2026-09-28')
    expect(w.at(-1)![6] >= '2026-10-31').toBe(true)
  })

  it('patrimonio neto resta la deuda de tarjetas', () => {
    const accounts = [acc({ openingBalance: 100000 }), acc({ id: 'visa', type: 'credit' })]
    const txs = [tx({ amount: 30000, accountId: 'visa', date: '2026-09-10' })]
    const [p] = netWorthSeries(accounts, txs, ['2026-09'], '2026-10-01')
    expect(p).toEqual({ month: '2026-09', assets: 100000, debts: 30000, net: 70000 })
  })
})
