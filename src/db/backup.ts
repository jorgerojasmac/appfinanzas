/**
 * Respaldo de los datos: exportar a JSON (completo, se puede importar) y a CSV
 * (los movimientos, para abrir en Excel o Numbers).
 */
import { todayISO } from '../domain/dates'
import { setSetting } from './repo'
import { db } from './schema'
import type { Account, Category, Person, Transaction } from './types'

export const BACKUP_APP = 'finanzas'

const TABLES = ['accounts', 'categories', 'transactions', 'budgets', 'goals', 'goalEntries', 'recurring', 'people', 'settings'] as const
type TableName = (typeof TABLES)[number]

/** Ajustes que no viajan en el respaldo: el PIN y el estado de avisos son de este dispositivo. */
const LOCAL_SETTINGS = new Set(['pin', 'lastBackupAt', 'lastMonthCloseSeen', 'installedAt'])

export interface BackupFile {
  app: typeof BACKUP_APP
  schema: number
  exportedAt: string
  data: Record<TableName, unknown[]>
}

export async function buildBackup(): Promise<BackupFile> {
  const data = {} as BackupFile['data']
  await db.transaction('r', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      const rows = await db.table(t).toArray()
      data[t] = t === 'settings' ? rows.filter((r: { key: string }) => !LOCAL_SETTINGS.has(r.key)) : rows
    }
  })
  return { app: BACKUP_APP, schema: db.verno, exportedAt: new Date().toISOString(), data }
}

export type BackupCheck =
  | { ok: true; file: BackupFile; counts: { transactions: number; accounts: number; categories: number }; exportedAt: string }
  | { ok: false; error: string }

/** Revisa que el archivo sea un respaldo válido de esta app antes de importarlo. */
export function checkBackup(raw: unknown): BackupCheck {
  const f = raw as Partial<BackupFile> | null
  if (!f || typeof f !== 'object' || f.app !== BACKUP_APP || !f.data || typeof f.data !== 'object') {
    return { ok: false, error: 'El archivo no es un respaldo de esta app.' }
  }
  if (typeof f.schema === 'number' && f.schema > db.verno) {
    return { ok: false, error: 'El respaldo es de una versión más nueva de la app. Actualiza la app e inténtalo de nuevo.' }
  }
  for (const t of ['accounts', 'categories', 'transactions'] as const) {
    if (!Array.isArray(f.data[t])) return { ok: false, error: `Al respaldo le falta información (${t}).` }
  }
  const txs = f.data.transactions as Partial<Transaction>[]
  const bad = txs.find((t) => !t || typeof t.id !== 'string' || typeof t.amount !== 'number' || typeof t.date !== 'string' || !t.type)
  if (bad) return { ok: false, error: 'El respaldo tiene movimientos dañados y no se puede importar.' }
  return {
    ok: true,
    file: f as BackupFile,
    counts: { transactions: txs.length, accounts: f.data.accounts.length, categories: f.data.categories.length },
    exportedAt: f.exportedAt ?? '',
  }
}

/** Reemplaza todos los datos por los del respaldo, en una sola transacción (todo o nada). */
export async function restoreBackup(file: BackupFile) {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    // Se conservan los ajustes propios de este dispositivo (PIN, avisos)
    const keep = (await db.settings.toArray()).filter((s) => LOCAL_SETTINGS.has(s.key))
    for (const t of TABLES) await db.table(t).clear()
    for (const t of TABLES) {
      const rows = Array.isArray(file.data[t]) ? file.data[t] : []
      if (rows.length) await db.table(t).bulkPut(rows)
    }
    await db.settings.bulkPut(keep)
  })
}

// ---------- CSV ----------

const csvCell = (v: string | number) => {
  const s = String(v)
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const TYPE_LABEL: Record<Transaction['type'], string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  transfer: 'Transferencia',
  settlement: 'Saldo con persona',
}

/** CSV de movimientos (con BOM para que Excel respete las tildes). */
export function transactionsToCSV(
  txs: Transaction[],
  categories: Map<string, Category>,
  accounts: Map<string, Account>,
  people: Map<string, Person>,
): string {
  const header = ['Fecha', 'Tipo', 'Monto', 'Mi parte', 'Categoría', 'Cuenta', 'Cuenta destino', 'Nota', 'Etiquetas', 'Pagó', 'Persona']
  const name = (who: string) => (who === 'me' ? 'Yo' : people.get(who)?.name ?? '')
  const rows = [...txs]
    .sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1))
    .map((t) => [
      t.date,
      TYPE_LABEL[t.type],
      (t.amount / 100).toFixed(2),
      t.type === 'expense' || t.type === 'income' ? (t.myAmount / 100).toFixed(2) : '',
      t.categoryId ? categories.get(t.categoryId)?.name ?? '' : '',
      t.accountId ? accounts.get(t.accountId)?.name ?? '' : '',
      t.toAccountId ? accounts.get(t.toAccountId)?.name ?? '' : '',
      t.note,
      t.tags.join(' '),
      t.split ? name(t.split.paidBy) : '',
      t.personId ? name(t.personId) : t.split ? t.split.shares.filter((s) => s.who !== 'me').map((s) => name(s.who)).join(' ') : '',
    ])
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
}

// ---------- Guardar archivos ----------

/**
 * Entrega un archivo al usuario. En iPhone usa la hoja de compartir (Guardar en
 * Archivos, AirDrop, etc.); en otros navegadores lo descarga.
 */
export async function saveFile(name: string, content: string, type: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = new Blob([content], { type })
  const file = new File([blob], name, { type })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: name })
      return 'shared'
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return 'downloaded'
}

export const backupFileName = (ext: 'json' | 'csv') => `finanzas-${todayISO()}.${ext}`

export async function markBackupDone() {
  await setSetting('lastBackupAt', Date.now())
}
