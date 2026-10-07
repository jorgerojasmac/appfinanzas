import { useSyncExternalStore } from 'react'

/** Estado del bloqueo con PIN (y si la app ya decidió si debe bloquearse). */
let state = { locked: true, decided: false }
const listeners = new Set<() => void>()

export const lock = {
  set(next: Partial<typeof state>) {
    state = { ...state, ...next }
    listeners.forEach((l) => l())
  },
}

export function useLock() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}
