import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { runRecurring } from '../src/db/planning'
import { clearSampleData, loadSampleData } from '../src/db/sampleData'
import { db } from '../src/db/schema'

describe('datos de ejemplo', () => {
  it('se cargan sin que el generador de recurrentes duplique movimientos', async () => {
    await loadSampleData()
    const before = await db.transactions.count()
    expect(before).toBeGreaterThan(100)
    expect(await runRecurring()).toBe(0)
    expect(await db.transactions.count()).toBe(before)
    expect(await db.recurring.count()).toBeGreaterThan(0)
    expect(await db.budgets.count()).toBeGreaterThan(0)
  })

  it('cargar dos veces no duplica', async () => {
    await loadSampleData()
    const n = await db.transactions.count()
    await loadSampleData()
    expect(await db.transactions.count()).toBe(n)
  })

  it('al borrarlos no queda nada de ejemplo y se conservan las cuentas iniciales', async () => {
    await clearSampleData()
    for (const t of [db.transactions, db.budgets, db.goals, db.goalEntries, db.recurring, db.people]) {
      expect(await t.count()).toBe(0)
    }
    expect(await db.accounts.get('acc-banco')).toBeTruthy()
    expect(await db.categories.count()).toBeGreaterThan(10)
  })
})

describe('gastos compartidos de ejemplo', () => {
  it('generan saldos coherentes por persona', async () => {
    const { personBalances } = await import('../src/domain/shared')
    await loadSampleData()
    const b = personBalances(await db.transactions.toArray())
    // Carlos debe al menos su parte de la cena reciente; con Ana hay saldo por compras y cenas
    expect(b.get('sample-carlos')).toBeGreaterThan(0)
    expect(b.has('sample-ana')).toBe(true)
    await clearSampleData()
  })
})
