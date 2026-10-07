/** Búsqueda y filtros de movimientos (lógica pura). */
import type { Account, Category, Transaction, TxType } from '../db/types'
import type { ISODate } from './dates'
import type { Cents } from './money'

export interface TxFilters {
  text: string
  types: TxType[]
  categoryIds: string[]
  accountIds: string[]
  tags: string[]
  from?: ISODate
  to?: ISODate
  minAmount?: Cents
  maxAmount?: Cents
}

export const EMPTY_FILTERS: TxFilters = { text: '', types: [], categoryIds: [], accountIds: [], tags: [] }

/** Cantidad de filtros activos (sin contar el texto). */
export function activeFilterCount(f: TxFilters): number {
  return (
    (f.types.length ? 1 : 0) +
    (f.categoryIds.length ? 1 : 0) +
    (f.accountIds.length ? 1 : 0) +
    (f.tags.length ? 1 : 0) +
    (f.from || f.to ? 1 : 0) +
    (f.minAmount != null || f.maxAmount != null ? 1 : 0)
  )
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** Aplica texto y filtros. El monto que se compara es el que ves en la lista (tu parte en gastos). */
export function filterTransactions(
  txs: Transaction[],
  f: TxFilters,
  categoryMap: Map<string, Category>,
  accountMap: Map<string, Account>,
): Transaction[] {
  const words = norm(f.text.trim()).split(/\s+/).filter(Boolean)
  return txs.filter((t) => {
    if (f.types.length && !f.types.includes(t.type)) return false
    if (f.categoryIds.length && (!t.categoryId || !f.categoryIds.includes(t.categoryId))) return false
    if (f.accountIds.length && !f.accountIds.some((id) => t.accountId === id || t.toAccountId === id)) return false
    if (f.tags.length && !f.tags.every((tag) => t.tags.includes(tag))) return false
    if (f.from && t.date < f.from) return false
    if (f.to && t.date > f.to) return false
    const shown = t.type === 'expense' || t.type === 'income' ? t.myAmount : t.amount
    if (f.minAmount != null && shown < f.minAmount) return false
    if (f.maxAmount != null && shown > f.maxAmount) return false
    if (words.length) {
      const hay = norm(
        [
          t.note,
          t.categoryId ? categoryMap.get(t.categoryId)?.name : '',
          t.accountId ? accountMap.get(t.accountId)?.name : '',
          t.toAccountId ? accountMap.get(t.toAccountId)?.name : '',
          ...t.tags.map((x) => `#${x} ${x}`),
          (shown / 100).toFixed(2),
        ].join(' '),
      )
      if (!words.every((w) => hay.includes(w.replace(/^\$/, '')))) return false
    }
    return true
  })
}

/** Etiquetas usadas, de la más frecuente a la menos. */
export function tagUsage(txs: Transaction[]): Array<{ tag: string; count: number }> {
  const map = new Map<string, number>()
  for (const t of txs) for (const tag of t.tags) map.set(tag, (map.get(tag) ?? 0) + 1)
  return [...map.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

/** Total gastado (tu parte) por etiqueta. */
export function spendByTag(txs: Transaction[]): Array<{ tag: string; total: Cents; count: number }> {
  const map = new Map<string, { total: Cents; count: number }>()
  for (const t of txs) {
    if (t.type !== 'expense') continue
    for (const tag of t.tags) {
      const e = map.get(tag) ?? { total: 0, count: 0 }
      e.total += t.myAmount
      e.count++
      map.set(tag, e)
    }
  }
  return [...map.entries()].map(([tag, v]) => ({ tag, ...v })).sort((a, b) => b.total - a.total)
}

/** "Viaje a Japón" → "viaje-a-japon": etiquetas simples, sin espacios ni tildes. */
export function cleanTag(raw: string): string {
  return norm(raw.replace(/^#/, '').trim())
    .replace(/[^a-z0-9ñ]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
}
