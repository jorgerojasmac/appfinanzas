import { useSyncExternalStore } from 'react'
import type { Transaction, TxType } from '../db/types'
import type { Cents } from '../domain/money'

export interface NewTxPreset {
  type?: TxType
  accountId?: string
  toAccountId?: string
  amount?: Cents
  note?: string
}

/** Estado global mínimo de la interfaz: hojas de movimiento y de liquidación. */
interface UIState {
  txSheet: { open: boolean; edit?: Transaction; preset?: NewTxPreset }
  settleSheet: { open: boolean; personId?: string; edit?: Transaction }
}

let state: UIState = { txSheet: { open: false }, settleSheet: { open: false } }
const listeners = new Set<() => void>()
const set = (s: Partial<UIState>) => {
  state = { ...state, ...s }
  listeners.forEach((l) => l())
}

export const ui = {
  openNewTx: (preset: NewTxPreset = {}) => set({ txSheet: { open: true, preset } }),
  openEditTx: (edit: Transaction) => {
    // Las liquidaciones con personas tienen su propio editor
    if (edit.type === 'settlement') set({ settleSheet: { open: true, personId: edit.personId, edit } })
    else set({ txSheet: { open: true, edit } })
  },
  closeTx: () => set({ txSheet: { ...state.txSheet, open: false } }),
  openSettle: (personId: string) => set({ settleSheet: { open: true, personId } }),
  closeSettle: () => set({ settleSheet: { ...state.settleSheet, open: false } }),
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
