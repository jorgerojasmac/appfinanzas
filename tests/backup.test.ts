import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { buildBackup, checkBackup, restoreBackup, transactionsToCSV } from '../src/db/backup'
import { setSetting, saveTransaction } from '../src/db/repo'
import { db } from '../src/db/schema'
import type { Transaction } from '../src/db/types'

describe('respaldo JSON', () => {
  it('exporta e importa todo sin perder datos y conserva el PIN del dispositivo', async () => {
    await saveTransaction({ type: 'expense', amount: 1234, myAmount: 1234, accountId: 'acc-banco', categoryId: 'cat-alimentacion', date: '2026-10-01', note: 'Pan, leche y "huevos"', tags: ['casa'] })
    await setSetting('incomeBaseManual', 200000)
    await setSetting('pin', { salt: 'a', hash: 'b' })
    const backup = JSON.parse(JSON.stringify(await buildBackup()))
    expect(backup.data.settings.find((s: { key: string }) => s.key === 'pin')).toBeUndefined()

    const check = checkBackup(backup)
    expect(check.ok).toBe(true)

    // Datos distintos antes de restaurar
    await db.transactions.clear()
    await saveTransaction({ type: 'income', amount: 1, myAmount: 1, accountId: 'acc-banco', date: '2026-10-02', note: 'otro', tags: [] })
    if (check.ok) await restoreBackup(check.file)

    const txs = await db.transactions.toArray()
    expect(txs).toHaveLength(1)
    expect(txs[0].note).toBe('Pan, leche y "huevos"')
    expect((await db.settings.get('incomeBaseManual'))?.value).toBe(200000)
    expect((await db.settings.get('pin'))?.value).toEqual({ salt: 'a', hash: 'b' })
  })

  it('rechaza archivos que no son respaldos', () => {
    expect(checkBackup({ foo: 1 }).ok).toBe(false)
    expect(checkBackup(null).ok).toBe(false)
    expect(checkBackup({ app: 'finanzas', data: { accounts: [], categories: [], transactions: [{ id: 1 }] } }).ok).toBe(false)
    expect(checkBackup({ app: 'finanzas', schema: 999, data: { accounts: [], categories: [], transactions: [] } }).ok).toBe(false)
  })
})

describe('CSV', () => {
  it('escapa comas y comillas, y usa punto decimal', () => {
    const t: Transaction = {
      id: '1', type: 'expense', amount: 123456, myAmount: 61728, date: '2026-10-01', note: 'Cena, "especial"', tags: ['viaje'],
      accountId: 'b', categoryId: 'c', createdAt: 0, updatedAt: 0,
      split: { mode: 'equal', paidBy: 'me', shares: [{ who: 'me', amount: 61728 }, { who: 'ana', amount: 61728 }] },
    }
    const csv = transactionsToCSV(
      [t],
      new Map([['c', { id: 'c', name: 'Restaurantes', icon: '', color: 'orange', kind: 'expense', fixed: false, order: 0, archived: false }]]),
      new Map([['b', { id: 'b', name: 'Banco', type: 'bank', openingBalance: 0, icon: '', color: 'blue', order: 0, archived: false, createdAt: 0 }]]),
      new Map([['ana', { id: 'ana', name: 'Ana', color: 'orange', order: 0, archived: false, createdAt: 0 }]]),
    )
    const [head, row] = csv.replace('﻿', '').split('\r\n')
    expect(head.startsWith('Fecha,Tipo,Monto,Mi parte')).toBe(true)
    expect(row).toBe('2026-10-01,Gasto,1234.56,617.28,Restaurantes,Banco,,"Cena, ""especial""",viaje,Yo,Ana')
  })
})
