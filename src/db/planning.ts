/** Operaciones de presupuestos, metas, recurrentes y suscripciones. */
import { advance, dueDates, firstOnOrAfter } from '../domain/recurrence'
import { todayISO, type ISODate } from '../domain/dates'
import { db, newId } from './schema'
import type { Budget, Goal, GoalEntry, RecurringRule, Transaction } from './types'

// ---------- Presupuestos ----------

export async function saveBudget(b: Omit<Budget, 'id' | 'createdAt'> & { id?: string }) {
  const existing = await db.budgets.where('categoryId').equals(b.categoryId).first()
  const id = b.id ?? existing?.id ?? newId()
  await db.budgets.put({ ...b, id, createdAt: existing?.createdAt ?? Date.now() })
  return id
}

export async function deleteBudget(id: string) {
  await db.budgets.delete(id)
}

/** Reemplaza (o crea) varios presupuestos de una vez, por ejemplo al aplicar sugerencias. */
export async function applyBudgets(items: Array<Omit<Budget, 'id' | 'createdAt'>>) {
  await db.transaction('rw', db.budgets, async () => {
    for (const b of items) await saveBudget(b)
  })
}

// ---------- Metas ----------

export async function saveGoal(g: Omit<Goal, 'id' | 'order' | 'createdAt'> & Partial<Goal>) {
  if (g.id) {
    await db.goals.update(g.id, g)
    return g.id
  }
  const id = newId()
  await db.goals.add({ ...g, id, order: await db.goals.count(), createdAt: Date.now() })
  return id
}

export async function deleteGoal(id: string) {
  await db.transaction('rw', db.goals, db.goalEntries, async () => {
    await db.goalEntries.where('goalId').equals(id).delete()
    await db.goals.delete(id)
  })
}

export async function addGoalEntry(e: Omit<GoalEntry, 'id' | 'createdAt'>) {
  await db.goalEntries.add({ ...e, id: newId(), createdAt: Date.now() })
}

export async function deleteGoalEntry(id: string) {
  await db.goalEntries.delete(id)
}

// ---------- Recurrentes y suscripciones ----------

export type RuleInput = Omit<RecurringRule, 'id' | 'createdAt' | 'anchorDay'> & { id?: string; anchorDay?: number }

/** Guarda la regla y genera lo que ya venció. Devuelve cuántos movimientos se registraron. */
export async function saveRule(input: RuleInput): Promise<number> {
  const today = todayISO()
  const rule = { ...input }
  rule.anchorDay = Number(rule.nextDate.slice(8, 10))
  if (rule.type !== 'transfer') rule.toAccountId = undefined
  else rule.categoryId = undefined

  if (rule.id) {
    const prev = await db.recurring.get(rule.id)
    // Al reactivar una regla pausada no se generan los movimientos atrasados
    if (prev && !prev.active && rule.active && rule.nextDate < today) {
      rule.nextDate = firstOnOrAfter(rule as RecurringRule, today)
    }
    await db.recurring.put({ ...(rule as RecurringRule), createdAt: prev?.createdAt ?? Date.now() })
  } else {
    rule.id = newId()
    await db.recurring.add({ ...(rule as RecurringRule), createdAt: Date.now() })
  }
  return runRecurring()
}

export async function deleteRule(id: string) {
  // Los movimientos ya generados se conservan
  await db.recurring.delete(id)
}

let running: Promise<number> | null = null

/**
 * Genera los movimientos vencidos de todas las reglas activas. Es idempotente:
 * cada regla avanza su `nextDate` dentro de la misma transacción y además se
 * verifica que no exista ya un movimiento de esa regla en esa fecha.
 */
export function runRecurring(today: ISODate = todayISO()): Promise<number> {
  if (running) return running.then(() => runRecurring(today))
  running = (async () => {
    let created = 0
    const due = await db.recurring.where('nextDate').belowOrEqual(today).toArray()
    for (const r of due) {
      if (!r.active) continue
      created += await db.transaction('rw', db.recurring, db.transactions, async () => {
        const rule = await db.recurring.get(r.id)
        if (!rule || !rule.active || rule.nextDate > today) return 0
        const { dates, next } = dueDates(rule, today)
        let count = 0
        const now = Date.now()
        for (const date of dates) {
          const exists = await db.transactions.where('[recurringId+date]').equals([rule.id, date]).count()
          if (exists) continue
          const tx: Transaction = {
            id: newId(),
            type: rule.type,
            amount: rule.amount,
            myAmount: rule.type === 'transfer' ? 0 : rule.amount,
            accountId: rule.accountId,
            toAccountId: rule.type === 'transfer' ? rule.toAccountId : undefined,
            categoryId: rule.type === 'transfer' ? undefined : rule.categoryId,
            date,
            note: rule.name,
            tags: [],
            recurringId: rule.id,
            sample: rule.sample,
            createdAt: now + count,
            updatedAt: now,
          }
          await db.transactions.add(tx)
          count++
        }
        // Si se alcanzó la fecha de fin, la regla queda inactiva
        const finished = rule.endDate && next > rule.endDate
        await db.recurring.update(rule.id, { nextDate: next, active: finished ? false : rule.active })
        return count
      })
    }
    return created
  })()
  return running.finally(() => {
    running = null
  })
}

/** Salta la próxima fecha sin generar el movimiento (por ejemplo, un mes que no se cobró). */
export async function skipNext(id: string) {
  const r = await db.recurring.get(id)
  if (!r) return
  await db.recurring.update(id, { nextDate: advance(r.nextDate, r.frequency, r.interval, r.anchorDay) })
}
