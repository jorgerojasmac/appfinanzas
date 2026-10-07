import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { runRecurring, saveRule } from '../src/db/planning'
import { db } from '../src/db/schema'

const base = {
  kind: 'recurring' as const,
  name: 'Arriendo',
  type: 'expense' as const,
  amount: 75000,
  accountId: 'acc-banco',
  categoryId: 'cat-vivienda',
  frequency: 'monthly' as const,
  interval: 1,
  active: true,
}

describe('generación de recurrentes', () => {
  beforeEach(async () => {
    await db.recurring.clear()
    await db.transactions.clear()
  })

  it('genera los movimientos vencidos una sola vez, aunque se ejecute en paralelo', async () => {
    await db.recurring.add({ ...base, id: 'r1', nextDate: '2026-01-15', anchorDay: 15, createdAt: 0 })
    const [a, b] = await Promise.all([runRecurring('2026-03-20'), runRecurring('2026-03-20')])
    expect(a + b).toBe(3)
    expect(await runRecurring('2026-03-20')).toBe(0)
    const txs = await db.transactions.orderBy('date').toArray()
    expect(txs.map((t) => t.date)).toEqual(['2026-01-15', '2026-02-15', '2026-03-15'])
    expect(txs.every((t) => t.myAmount === 75000 && t.note === 'Arriendo')).toBe(true)
    expect((await db.recurring.get('r1'))?.nextDate).toBe('2026-04-15')
  })

  it('no genera nada para reglas pausadas', async () => {
    await db.recurring.add({ ...base, id: 'r2', active: false, nextDate: '2026-01-15', anchorDay: 15, createdAt: 0 })
    expect(await runRecurring('2026-03-20')).toBe(0)
  })

  it('las transferencias recurrentes no cuentan como gasto', async () => {
    await db.recurring.add({ ...base, id: 'r3', type: 'transfer', toAccountId: 'ahorro', nextDate: '2026-03-01', anchorDay: 1, createdAt: 0 })
    await runRecurring('2026-03-02')
    const [t] = await db.transactions.toArray()
    expect(t.type).toBe('transfer')
    expect(t.myAmount).toBe(0)
    expect(t.categoryId).toBeUndefined()
  })

  it('reactivar una regla pausada no genera los meses atrasados', async () => {
    await db.recurring.add({ ...base, id: 'r4', active: false, nextDate: '2026-01-15', anchorDay: 15, createdAt: 0 })
    const today = new Date().toISOString().slice(0, 10)
    await saveRule({ ...base, id: 'r4', active: true, nextDate: '2020-01-15' })
    const rule = await db.recurring.get('r4')
    expect(rule!.nextDate >= today.slice(0, 7)).toBe(true)
    expect(await db.transactions.count()).toBeLessThanOrEqual(1)
  })
})
