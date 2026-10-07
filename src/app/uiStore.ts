import { useSyncExternalStore } from 'react'
import type { Transaction, TxType } from '../db/types'

/** Estado global mínimo de la interfaz: la hoja de "nuevo movimiento". */
interface UIState {
  txSheet: { open: boolean; edit?: Transaction; type?: TxType; accountId?: string }
}

let state: UIState = { txSheet: { open: false } }
const listeners = new Set<() => void>()
const set = (s: Partial<UIState>) => {
  state = { ...state, ...s }
  listeners.forEach((l) => l())
}

export const ui = {
  openNewTx: (opts: { type?: TxType; accountId?: string } = {}) => set({ txSheet: { open: true, ...opts } }),
  openEditTx: (edit: Transaction) => set({ txSheet: { open: true, edit } }),
  closeTx: () => set({ txSheet: { ...state.txSheet, open: false } }),
}

export function useUI(): UIState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}
