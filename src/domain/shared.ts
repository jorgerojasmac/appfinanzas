/**
 * Gastos compartidos. Solo mi parte cuenta como gasto (myAmount); el resto
 * genera saldos con cada persona.
 *
 * Saldo positivo = esa persona me debe. Negativo = yo le debo.
 */
import type { Split, SplitShare, Transaction } from '../db/types'
import { splitEvenly, type Cents } from './money'

export const ME = 'me'

export type SplitMode = Split['mode']

export interface SplitDraft {
  mode: SplitMode
  paidBy: string
  /** Participantes, incluido 'me' si participo */
  participants: string[]
  /** Valores por participante: % en modo porcentaje, centavos en modo montos */
  values: Record<string, number>
}

export type SplitResult = { ok: true; split: Split; myAmount: Cents } | { ok: false; error: string }

/** Convierte el borrador en partes exactas que suman el total. */
export function buildSplit(total: Cents, d: SplitDraft): SplitResult {
  const who = d.participants
  if (who.length < 2 && !(who.length === 1 && who[0] !== ME)) {
    return { ok: false, error: 'Elige al menos a una persona con quien dividir.' }
  }
  let shares: SplitShare[]
  if (d.mode === 'equal') {
    const parts = splitEvenly(total, who.length)
    shares = who.map((w, i) => ({ who: w, amount: parts[i] }))
  } else if (d.mode === 'percent') {
    const pcts = who.map((w) => d.values[w] ?? 0)
    const sum = pcts.reduce((a, b) => a + b, 0)
    if (Math.abs(sum - 100) > 0.01) return { ok: false, error: `Los porcentajes suman ${round1(sum)}%, deben sumar 100%.` }
    // Reparte por porcentaje y asigna el centavo sobrante al primero
    const amounts = pcts.map((p) => Math.floor((total * p) / 100))
    let rest = total - amounts.reduce((a, b) => a + b, 0)
    for (let i = 0; rest > 0; i = (i + 1) % amounts.length, rest--) amounts[i]++
    shares = who.map((w, i) => ({ who: w, amount: amounts[i], percent: pcts[i] }))
  } else {
    const amounts = who.map((w) => Math.round(d.values[w] ?? 0))
    const sum = amounts.reduce((a, b) => a + b, 0)
    if (sum !== total) {
      const diff = total - sum
      return { ok: false, error: diff > 0 ? `Faltan ${fmt(diff)} por asignar.` : `Sobran ${fmt(-diff)}.` }
    }
    shares = who.map((w, i) => ({ who: w, amount: amounts[i] }))
  }
  const myAmount = shares.find((s) => s.who === ME)?.amount ?? 0
  return { ok: true, split: { mode: d.mode, paidBy: d.paidBy, shares }, myAmount }
}

/** Reconstruye el borrador desde un gasto ya guardado (para editarlo). */
export function draftFromSplit(split: Split): SplitDraft {
  const values: Record<string, number> = {}
  for (const s of split.shares) values[s.who] = split.mode === 'percent' ? s.percent ?? 0 : s.amount
  return { mode: split.mode, paidBy: split.paidBy, participants: split.shares.map((s) => s.who), values }
}

/** Saldo con cada persona a partir de gastos compartidos y liquidaciones. */
export function personBalances(txs: Transaction[]): Map<string, Cents> {
  const map = new Map<string, Cents>()
  const add = (id: string, v: Cents) => map.set(id, (map.get(id) ?? 0) + v)
  for (const t of txs) {
    if (t.type === 'expense' && t.split) {
      const { paidBy, shares } = t.split
      if (paidBy === ME) {
        for (const s of shares) if (s.who !== ME) add(s.who, s.amount)
      } else {
        const mine = shares.find((s) => s.who === ME)?.amount ?? 0
        if (mine) add(paidBy, -mine)
      }
    } else if (t.type === 'settlement' && t.personId) {
      add(t.personId, t.settleDirection === 'received' ? -t.amount : t.amount)
    }
  }
  return map
}

/** ¿Este movimiento involucra a la persona? */
export function involvesPerson(t: Transaction, personId: string): boolean {
  if (t.type === 'settlement') return t.personId === personId
  if (t.type === 'expense' && t.split) return t.split.paidBy === personId || t.split.shares.some((s) => s.who === personId)
  return false
}

/** Efecto de un movimiento en el saldo con una persona (para el historial). */
export function effectOnPerson(t: Transaction, personId: string): Cents {
  return personBalances([t]).get(personId) ?? 0
}

const round1 = (n: number) => Math.round(n * 10) / 10
const fmt = (c: Cents) => `$${(c / 100).toFixed(2)}`
