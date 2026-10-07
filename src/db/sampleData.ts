/**
 * Datos de ejemplo con ingresos irregulares. Todo lo que se crea aquí lleva
 * `sample: true`, así se puede borrar sin tocar los datos reales.
 */
import { addMonths, currentMonth, dateInMonth, daysInMonth, todayISO, type MonthKey } from '../domain/dates'
import { setSetting } from './repo'
import { db, newId } from './schema'
import { defaultAccounts, slug } from './seed'
import type { Account, Budget, Goal, GoalEntry, Person, RecurringRule, Transaction } from './types'
import { buildSplit, ME } from '../domain/shared'

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

/** Movimientos del historial que pertenecen a una regla recurrente (por su nota) */
const RULE_BY_NOTE: Record<string, string> = {
  Arriendo: 'sample-rule-arriendo',
  Internet: 'sample-rule-internet',
  'Cuota maestría': 'sample-rule-maestria',
  'Plan celular': 'sample-rule-celular',
  Netflix: 'sample-sub-netflix',
  Spotify: 'sample-sub-spotify',
  'iCloud+': 'sample-sub-icloud',
}

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
    add({ type: 'expense', amount, date, accountId, categoryId: slug(cat), note, recurringId: RULE_BY_NOTE[note] })

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
  addSharedSamples(txs, today, now)
  return txs
}

export const SAMPLE_PEOPLE: Person[] = [
  { id: 'sample-ana', name: 'Ana', color: 'orange', order: 0, archived: false, sample: true, createdAt: 0 },
  { id: 'sample-carlos', name: 'Carlos', color: 'teal', order: 1, archived: false, sample: true, createdAt: 0 },
]

/** Cenas divididas entre tres, compras de la casa que paga Ana y liquidaciones. */
function addSharedSamples(txs: Transaction[], today: string, now: number) {
  const r = rng(7)
  const between = (a: number, b: number) => Math.round((a + r() * (b - a)) * 100)
  const start = addMonths(currentMonth(), -MONTHS_BACK)
  const push = (t: Omit<Transaction, 'id' | 'tags' | 'sample' | 'createdAt' | 'updatedAt'>) => {
    if (t.date > today) return
    txs.push({ ...t, id: newId(), tags: [], sample: true, createdAt: now + txs.length, updatedAt: now })
  }
  for (let i = 0; i <= MONTHS_BACK; i++) {
    const m = addMonths(start, i)
    const isLast = i >= MONTHS_BACK - 1
    // Cena entre tres que pago yo desde el banco
    const dinner = between(60, 120)
    const r3 = buildSplit(dinner, { mode: 'equal', paidBy: ME, participants: [ME, 'sample-ana', 'sample-carlos'], values: {} })
    if (r3.ok) {
      push({ type: 'expense', amount: dinner, myAmount: r3.myAmount, accountId: 'acc-banco', categoryId: slug('Restaurantes'), date: dateInMonth(m, 4), note: 'Cena con amigos', split: r3.split })
      // Carlos devuelve su parte al final de cada mes (salvo los dos últimos)
      if (!isLast) {
        const carlos = r3.split.shares.find((x) => x.who === 'sample-carlos')!.amount
        push({ type: 'settlement', amount: carlos, myAmount: 0, accountId: 'acc-banco', personId: 'sample-carlos', settleDirection: 'received', date: dateInMonth(m, 27), note: '' })
      }
    }
    // Compras de la casa que paga Ana, a medias
    if (i % 2 === 0) {
      const groceries = between(80, 140)
      const r2 = buildSplit(groceries, { mode: 'equal', paidBy: 'sample-ana', participants: [ME, 'sample-ana'], values: {} })
      if (r2.ok) push({ type: 'expense', amount: groceries, myAmount: r2.myAmount, categoryId: slug('Alimentación'), date: dateInMonth(m, 3), note: 'Compras de la casa', split: r2.split })
    }
  }
}

/** Próxima fecha con ese día del mes, a partir de mañana (para no duplicar el historial). */
function nextOn(day: number, today = todayISO()): string {
  const thisMonth = dateInMonth(currentMonth(), day)
  return thisMonth > today ? thisMonth : dateInMonth(addMonths(currentMonth(), 1), day)
}

function buildSampleRules(): RecurringRule[] {
  const rule = (p: Partial<RecurringRule> & Pick<RecurringRule, 'id' | 'name' | 'amount' | 'kind'>, day: number): RecurringRule => ({
    type: 'expense',
    accountId: 'acc-banco',
    frequency: 'monthly',
    interval: 1,
    nextDate: nextOn(day),
    anchorDay: day,
    active: true,
    sample: true,
    createdAt: Date.now(),
    ...p,
  })
  return [
    rule({ id: 'sample-rule-arriendo', kind: 'recurring', name: 'Arriendo', amount: 75000, categoryId: slug('Vivienda') }, 1),
    rule({ id: 'sample-rule-maestria', kind: 'recurring', name: 'Cuota maestría', amount: 22000, categoryId: slug('Educación') }, 3),
    rule({ id: 'sample-rule-internet', kind: 'recurring', name: 'Internet', amount: 4500, categoryId: slug('Servicios') }, 12),
    rule({ id: 'sample-rule-celular', kind: 'recurring', name: 'Plan celular', amount: 2500, categoryId: slug('Servicios') }, 15),
    rule({ id: 'sample-sub-netflix', kind: 'subscription', name: 'Netflix', amount: 1549, accountId: 'sample-visa', categoryId: slug('Suscripciones'), icon: 'Clapperboard', color: 'red' }, 14),
    rule({ id: 'sample-sub-spotify', kind: 'subscription', name: 'Spotify', amount: 1099, accountId: 'sample-visa', categoryId: slug('Suscripciones'), icon: 'Music', color: 'green', review: true }, 18),
    rule({ id: 'sample-sub-icloud', kind: 'subscription', name: 'iCloud+', amount: 299, accountId: 'sample-visa', categoryId: slug('Suscripciones'), icon: 'Globe', color: 'cyan' }, 22),
    rule({ id: 'sample-sub-office', kind: 'subscription', name: 'Office 365', amount: 9999, accountId: 'sample-visa', categoryId: slug('Suscripciones'), icon: 'Laptop', color: 'orange', frequency: 'yearly', nextDate: dateInMonth(addMonths(currentMonth(), 3), 9) }, 9),
  ]
}

function buildSampleBudgets(): Budget[] {
  const b = (cat: string, p: Partial<Budget>): Budget => ({ id: `sample-budget-${slug(cat)}`, categoryId: slug(cat), mode: 'fixed', sample: true, createdAt: Date.now(), ...p })
  return [
    b('Vivienda', { amount: 75000 }),
    b('Servicios', { amount: 13000 }),
    b('Alimentación', { mode: 'percent', percent: 18 }),
    b('Restaurantes', { mode: 'percent', percent: 6 }),
    b('Transporte', { mode: 'percent', percent: 5 }),
    b('Entretenimiento', { amount: 5000 }),
    b('Compras', { amount: 8000 }),
    b('Suscripciones', { amount: 3000 }),
  ]
}

function buildSampleGoals(): { goals: Goal[]; entries: GoalEntry[] } {
  const now = Date.now()
  const goals: Goal[] = [
    { id: 'sample-goal-japon', name: 'Viaje a Japón', icon: 'Plane', color: 'pink', target: 400000, targetDate: dateInMonth(addMonths(currentMonth(), 10), 1), order: 0, sample: true, createdAt: now },
    { id: 'sample-goal-emergencia', name: 'Fondo de emergencia', icon: 'Shield', color: 'mint', target: 600000, accountId: 'sample-emergencia', order: 1, sample: true, createdAt: now },
    { id: 'sample-goal-laptop', name: 'Laptop nueva', icon: 'Laptop', color: 'indigo', target: 120000, order: 2, completedAt: now, sample: true, createdAt: now },
  ]
  const entry = (goalId: string, amount: number, monthsAgo: number): GoalEntry => ({
    id: newId(),
    goalId,
    amount,
    date: dateInMonth(addMonths(currentMonth(), -monthsAgo), 26),
    note: '',
    sample: true,
    createdAt: now - monthsAgo,
  })
  return {
    goals,
    entries: [
      entry('sample-goal-japon', 50000, 5),
      entry('sample-goal-japon', 80000, 3),
      entry('sample-goal-japon', 30000, 2),
      entry('sample-goal-japon', 40000, 1),
      entry('sample-goal-laptop', 60000, 6),
      entry('sample-goal-laptop', 60000, 4),
    ],
  }
}

const SAMPLE_TABLES = () => [db.accounts, db.transactions, db.settings, db.budgets, db.goals, db.goalEntries, db.recurring, db.people]

export async function loadSampleData() {
  await db.transaction('rw', SAMPLE_TABLES(), async () => {
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
    await db.recurring.bulkPut(buildSampleRules())
    await db.people.bulkPut(SAMPLE_PEOPLE.map((p) => ({ ...p, createdAt: now })))
    // Un presupuesto por categoría: los de ejemplo no pisan presupuestos reales
    for (const b of buildSampleBudgets()) {
      if (!(await db.budgets.where('categoryId').equals(b.categoryId).count())) await db.budgets.add(b)
    }
    const { goals, entries } = buildSampleGoals()
    await db.goals.bulkPut(goals)
    await db.goalEntries.bulkAdd(entries)
    await setSetting('sampleLoaded', true)
  })
}

async function clearSampleRows() {
  await db.transactions.filter((t) => !!t.sample).delete()
  await db.accounts.filter((a) => !!a.sample).delete()
  await db.budgets.filter((b) => !!b.sample).delete()
  await db.goals.filter((g) => !!g.sample).delete()
  await db.goalEntries.filter((e) => !!e.sample).delete()
  await db.recurring.filter((r) => !!r.sample).delete()
  await db.people.filter((p) => !!p.sample).delete()
}

export async function clearSampleData() {
  await db.transaction('rw', SAMPLE_TABLES(), async () => {
    await clearSampleRows()
    await setSetting('sampleLoaded', false)
  })
}
