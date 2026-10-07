import { useSyncExternalStore } from 'react'
import { EMPTY_FILTERS, type TxFilters } from '../domain/filters'

/** Filtros de Movimientos: se mantienen al cambiar de pestaña y se pueden fijar desde otras pantallas. */
let filters: TxFilters = EMPTY_FILTERS
const listeners = new Set<() => void>()

export const txFilters = {
  set(next: Partial<TxFilters>) {
    filters = { ...filters, ...next }
    listeners.forEach((l) => l())
  },
  replace(next: TxFilters) {
    filters = next
    listeners.forEach((l) => l())
  },
  reset() {
    filters = EMPTY_FILTERS
    listeners.forEach((l) => l())
  },
}

export function useTxFilters(): TxFilters {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => filters,
  )
}
