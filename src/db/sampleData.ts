/**
 * Datos de ejemplo con ingresos irregulares. Todo lo que se crea aquí lleva
 * `sample: true`, así se puede borrar sin tocar los datos reales.
 */
import { addMonths, currentMonth, dateInMonth, daysInMonth, todayISO, type MonthKey } from '../domain/dates'
import { setSetting } from './repo'
import { db, newId } from './schema'
import { defaultAccounts, slug } from './seed'
import type { Account, Transaction } from './types'

const MONTHS_BACK = 8

/** Generador pseudoaleatorio con semilla: los datos son siempre los mismos. */
function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SAMPLE_ACCOUNTS: Account[] = [
  { id: 'sample-visa', name: 'Visa', type: 'credit', openingBalance: 0, icon: 'CreditCard', color: 'indigo', order: 11, archived: false, creditLimit: 300000, statementDay: 25, dueDay: 10, sample: true, createdAt: 0 },
  { id: 'sample-emergencia', name: 'Fondo de emergencia', type: 'savings', openingBalance: 250000, icon: 'Shield', color: 'mint', order: 12, archived: false, savingsPurpose: 'emergency', sample: true, createdAt: 0 },
  { id: 'sample-colchon', name: 'Fondo colchón', type: 'savings', openingBalance: 80000, icon: 'PiggyBank', color: 'orange', order: 13, archived: false, savingsPurpose: 'cushion', sample: true, createdAt: 0 },
]

// Ingresos por trabajo de cada mes (USD): muy variables a propósito
const WORK_INCOME = [2800, 4200, 1900, 3600, 5100, 2300, 3900, 3100, 2600]

export function buildSampleTransactions(today = todayISO()): Transaction[] {
  const r = rng(42)
  const between = (a: number, b: number) => Math.round((a + r() * (b - a)) * 100)
  const txs: Transaction[] = []
  const now = Date.now()
  const cash = 'acc-efectivo'
  const bank = 'acc-banco'
  const visa = 'sample-visa'

  const add = (p: Partial<Transaction> & Pick<Transaction, 'type' | 'amount' | 'date'>) => {
    if (p.date > today) return
    txs.push({
      id: newId(),
      myAmount: p.amount,
      note: '',
      tags: [],
      sample: true,
      createdAt: now + txs.length,
      updatedAt: now,
      ...p,
    })
  }
  const expense = (cat: string, amount: number, date: string, accountId: string, note = '') =>
    add({ type: 'expense', amount, date, accountId, categoryId: slug(cat), note })

  const start = addMonths(currentMonth(), -MONTHS_BACK)
  let prevCardSpend = 0

  for (let i = 0; i <= MONTHS_BACK; i++) {
    const m: MonthKey = addMonths(start, i)
    const day = (d: number) => dateInMonth(m, d)
    const rand = (max = daysInMonth(m)) => day(1 + Math.floor(r() * max))
    let cardSpend = 0
    const card = (cat: string, amount: number, date: string, note = '') => {
      expense(cat, amount, date, visa, note)
      if (date <= today) cardSpend += amount
    }

    // Ingresos: uno o dos pagos de trabajo + extras ocasionales
    const work = WORK_INCOME[i % WORK_INCOME.length] * 100
    if (r() > 0.4) {
      const first = Math.round(work * (0.4 + r() * 0.2))
      add({ type: 'income', amount: first, date: day(5 + Math.floor(r() * 5)), accountId: bank, categoryId: slug('Ingresos por trabajo'), note: 'Proyecto cliente' })
      add({ type: 'income', amount: work - first, date: day(20 + Math.floor(r() * 6)), accountId: bank, categoryId: slug('Ingresos por trabajo'), note: 'Pago final proyecto' })
    } else {
      add({ type: 'income', amount: work, date: day(12 + Math.floor(r() * 8)), accountId: bank, categoryId: slug('Ingresos por trabajo'), note: 'Honorarios' })
    }
    if (r() > 0.55) add({ type: 'income', amount: between(120, 650), date: rand(), accountId: bank, categoryId: slug('Ingresos extra'), note: 'Trabajo freelance' })

    // Gastos fijos
    expense('Vivienda', 75000, day(i === 0 ? 28 : 1), bank, 'Arriendo')
    expense('Servicios', between(38, 62), day(8), bank, 'Luz')
    expense('Servicios', between(14, 22), day(8), bank, 'Agua')
    expense('Servicios', 4500, day(12), bank, 'Internet')
    expense('Servicios', 2500, day(15), bank, 'Plan celular')
    expense('Educación', 22000, day(3), bank, 'Cuota maestría')
    card('Suscripciones', 1549, day(14), 'Netflix')
    card('Suscripciones', 1099, day(18), 'Spotify')
    card('Suscripciones', 299, day(22), 'iCloud+')

    // Gastos variables
    for (let k = 0, n = 4 + Math.floor(r() * 3); k < n; k++) card('Alimentación', between(28, 115), rand(), 'Supermercado')
    for (let k = 0, n = 2 + Math.floor(r() * 3); k < n; k++) expense('Alimentación', between(4, 18), rand(), cash, 'Panadería')
    for (let k = 0, n = 3 + Math.floor(r() * 4); k < n; k++) card('Restaurantes', between(12, 48), rand())
    for (let k = 0, n = 4 + Math.floor(r() * 4); k < n; k++) expense('Transporte', between(3, 12), rand(), cash, 'Taxi')
    card('Transporte', between(30, 45), rand(), 'Gasolina')
    if (r() > 0.3) card('Entretenimiento', between(15, 70), rand(), 'Cine y salidas')
    if (r() > 0.4) card('Compras', between(25, 160), rand())
    if (r() > 0.6) expense('Salud', between(20, 90), rand(), bank, 'Farmacia')
    if (r() > 0.7) card('Cuidado personal', between(15, 40), rand(), 'Peluquería')
    if (r() > 0.85) card('Regalos', between(30, 80), rand())
    if (i === 3) card('Viajes', 42000, day(17), 'Pasajes vacaciones')

    // Pago de la tarjeta: transferencia banco → Visa por lo gastado el mes anterior
    if (prevCardSpend > 0) {
      add({ type: 'transfer', amount: prevCardSpend, date: day(10), accountId: bank, toAccountId: visa, note: '' })
    }
    prevCardSpend = cardSpend

    // Ahorro: en meses buenos se aparta al colchón y al fondo de emergencia
    if (work >= 3500 * 100) {
      add({ type: 'transfer', amount: Math.round((work - 3000 * 100) * 0.5), date: day(26), accountId: bank, toAccountId: 'sample-colchon' })
      add({ type: 'transfer', amount: 15000, date: day(26), accountId: bank, toAccountId: 'sample-emergencia' })
    } else if (work < 2500 * 100) {
      add({ type: 'transfer', amount: 40000, date: day(27), accountId: 'sample-colchon', toAccountId: bank, note: 'Uso del colchón' })
    }

    // Retiro de efectivo
    add({ type: 'transfer', amount: 10000, date: day(2), accountId: bank, toAccountId: cash, note: 'Retiro cajero' })
  }
  return txs
}

export async function loadSampleData() {
  await db.transaction('rw', db.accounts, db.transactions, db.settings, async () => {
    await clearSampleRows()
    const now = Date.now()
    await db.accounts.bulkPut(SAMPLE_ACCOUNTS.map((a) => ({ ...a, createdAt: now })))
    // Los ejemplos usan las cuentas iniciales Efectivo y Banco; si se borraron, se crean como ejemplo
    for (const base of defaultAccounts()) {
      const existing = await db.accounts.get(base.id)
      if (!existing) await db.accounts.add({ ...base, sample: true, createdAt: now })
      else if (existing.archived) await db.accounts.update(base.id, { archived: false })
    }
    await db.transactions.bulkAdd(buildSampleTransactions())
    await setSetting('sampleLoaded', true)
  })
}

async function clearSampleRows() {
  await db.transactions.filter((t) => !!t.sample).delete()
  await db.accounts.filter((a) => !!a.sample).delete()
}

export async function clearSampleData() {
  await db.transaction('rw', db.accounts, db.transactions, db.settings, async () => {
    await clearSampleRows()
    await setSetting('sampleLoaded', false)
  })
}
