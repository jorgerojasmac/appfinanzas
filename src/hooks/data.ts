import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../db/schema'
import type { Account, Category, Transaction } from '../db/types'
import { computeBalances } from '../domain/ledger'

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order

export function useAccounts(includeArchived = false): Account[] | undefined {
  return useLiveQuery(async () => {
    const all = (await db.accounts.toArray()).sort(byOrder)
    return includeArchived ? all : all.filter((a) => !a.archived)
  }, [includeArchived])
}

export function useCategories(includeArchived = false): Category[] | undefined {
  return useLiveQuery(async () => {
    const all = (await db.categories.toArray()).sort(byOrder)
    return includeArchived ? all : all.filter((c) => !c.archived)
  }, [includeArchived])
}

/** Todos los movimientos, del más reciente al más antiguo. */
export function useTransactions(): Transaction[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.transactions.toArray()
    return all.sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1))
  })
}

export function useSetting<T>(key: string, fallback: T): T {
  const v = useLiveQuery(async () => (await db.settings.get(key))?.value as T | undefined, [key])
  return v ?? fallback
}

/** Mapa id → objeto, útil para resolver categorías y cuentas en listas. */
export function useLookup<T extends { id: string }>(items: T[] | undefined): Map<string, T> {
  return useMemo(() => new Map((items ?? []).map((i) => [i.id, i])), [items])
}

/** Datos base que casi todas las pantallas necesitan. */
export function useLedger() {
  const accounts = useAccounts(true)
  const categories = useCategories(true)
  const transactions = useTransactions()
  const accountMap = useLookup(accounts)
  const categoryMap = useLookup(categories)
  const balances = useMemo(
    () => (accounts && transactions ? computeBalances(accounts, transactions) : new Map<string, number>()),
    [accounts, transactions],
  )
  const ready = !!(accounts && categories && transactions)
  return { ready, accounts: accounts ?? [], categories: categories ?? [], transactions: transactions ?? [], accountMap, categoryMap, balances }
}

export function useBudgets() {
  return useLiveQuery(() => db.budgets.toArray())
}

export function useGoals() {
  return useLiveQuery(async () => (await db.goals.toArray()).sort(byOrder))
}

export function useGoalEntries() {
  return useLiveQuery(() => db.goalEntries.toArray())
}

export function useRules(kind?: 'recurring' | 'subscription') {
  return useLiveQuery(async () => {
    const all = kind ? await db.recurring.where('kind').equals(kind).toArray() : await db.recurring.toArray()
    return all.sort((a, b) => (a.nextDate < b.nextDate ? -1 : a.nextDate > b.nextDate ? 1 : a.name.localeCompare(b.name)))
  }, [kind])
}

export function usePeople(includeArchived = false) {
  return useLiveQuery(async () => {
    const all = (await db.people.toArray()).sort(byOrder)
    return includeArchived ? all : all.filter((p) => !p.archived)
  }, [includeArchived])
}

/**
 * Como useSetting, pero distingue "todavía cargando" de "no existe":
 * devuelve undefined mientras carga y null si el ajuste no está guardado.
 */
export function useSettingLoaded<T>(key: string): T | null | undefined {
  const r = useLiveQuery(async () => ({ v: ((await db.settings.get(key))?.value ?? null) as T | null }), [key])
  return r === undefined ? undefined : r.v
}
