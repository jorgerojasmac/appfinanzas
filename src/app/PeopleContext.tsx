import { createContext, useContext, type ReactNode } from 'react'
import type { Person } from '../db/types'
import { useLookup, usePeople } from '../hooks/data'

const PeopleContext = createContext<Map<string, Person>>(new Map())

/** Un solo listado de personas para toda la app (evita una consulta por fila). */
export function PeopleProvider({ children }: { children: ReactNode }) {
  const people = usePeople(true)
  const map = useLookup(people)
  return <PeopleContext.Provider value={map}>{children}</PeopleContext.Provider>
}

export function usePeopleMap() {
  return useContext(PeopleContext)
}

/** Nombre para mostrar: "Tú" para 'me' */
export function personName(who: string, map: Map<string, Person>): string {
  if (who === 'me') return 'Tú'
  return map.get(who)?.name ?? 'Alguien'
}
