import { db, newId } from './schema'
import type { Account, Category, Person, Transaction } from './types'

export type TxInput = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }

/** Normaliza un movimiento antes de guardarlo para mantener las reglas contables. */
export function normalizeTx(input: TxInput): TxInput {
  const t = { ...input }
  t.amount = Math.abs(Math.round(t.amount))
  if (t.type === 'transfer' || t.type === 'settlement') {
    t.categoryId = undefined
    t.split = undefined
    t.myAmount = 0
  } else {
    t.toAccountId = undefined
    if (t.type !== 'expense') t.split = undefined
    // Si pagó otra persona, no sale dinero de ninguna cuenta mía
    if (t.split && t.split.paidBy !== 'me') t.accountId = undefined
    if (!t.split) t.myAmount = t.amount
    t.myAmount = Math.min(Math.abs(Math.round(t.myAmount)), t.amount)
  }
  if (t.type !== 'settlement') {
    t.personId = undefined
    t.settleDirection = undefined
  } else if (!t.settleDirection) {
    t.settleDirection = 'received'
  }
  t.note = (t.note ?? '').trim()
  t.tags = Array.from(new Set((t.tags ?? []).map((x) => x.trim().toLowerCase()).filter(Boolean)))
  return t
}

export async function saveTransaction(input: TxInput): Promise<string> {
  const t = normalizeTx(input)
  const now = Date.now()
  if (t.id) {
    const existing = await db.transactions.get(t.id)
    await db.transactions.put({
      ...(t as Transaction),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    })
    return t.id
  }
  const id = newId()
  await db.transactions.add({ ...(t as Transaction), id, createdAt: now, updatedAt: now })
  if (t.accountId) await setSetting('lastAccountId', t.accountId)
  return id
}

export async function deleteTransaction(id: string): Promise<Transaction | undefined> {
  const tx = await db.transactions.get(id)
  if (tx) await db.transactions.delete(id)
  return tx
}

export async function restoreTransaction(tx: Transaction) {
  await db.transactions.put(tx)
}

export async function saveCategory(c: Omit<Category, 'id' | 'order' | 'archived'> & Partial<Category>) {
  if (c.id) {
    await db.categories.update(c.id, c)
    return c.id
  }
  const order = await db.categories.where('kind').equals(c.kind).count()
  const id = newId()
  await db.categories.add({ ...c, id, order, archived: false })
  return id
}

/** Borra la categoría si no tiene movimientos; si los tiene, la archiva para no perder historial. */
export async function removeCategory(id: string): Promise<'deleted' | 'archived'> {
  const used = await db.transactions.where('categoryId').equals(id).count()
  if (used > 0) {
    await db.categories.update(id, { archived: true })
    return 'archived'
  }
  await db.categories.delete(id)
  return 'deleted'
}

export async function saveAccount(a: Omit<Account, 'id' | 'order' | 'archived' | 'createdAt'> & Partial<Account>) {
  if (a.id) {
    await db.accounts.update(a.id, a)
    return a.id
  }
  const order = await db.accounts.count()
  const id = newId()
  await db.accounts.add({ ...a, id, order, archived: false, createdAt: Date.now() })
  return id
}

export async function removeAccount(id: string): Promise<'deleted' | 'archived'> {
  const used =
    (await db.transactions.where('accountId').equals(id).count()) +
    (await db.transactions.where('toAccountId').equals(id).count())
  if (used > 0) {
    await db.accounts.update(id, { archived: true })
    return 'archived'
  }
  await db.accounts.delete(id)
  return 'deleted'
}

export async function getSetting<T>(key: string): Promise<T | undefined> {
  return (await db.settings.get(key))?.value as T | undefined
}

export async function setSetting(key: string, value: unknown) {
  await db.settings.put({ key, value })
}

// ---------- Personas (gastos compartidos) ----------

export async function savePerson(p: { id?: string; name: string; color: Person['color'] }) {
  if (p.id) {
    await db.people.update(p.id, { name: p.name, color: p.color })
    return p.id
  }
  const id = newId()
  await db.people.add({ id, name: p.name, color: p.color, order: await db.people.count(), archived: false, createdAt: Date.now() })
  return id
}

/** Borra la persona si no tiene movimientos; si los tiene, la archiva. */
export async function removePerson(id: string): Promise<'deleted' | 'archived'> {
  const used = (await db.transactions.toArray()).some(
    (t) => t.personId === id || t.split?.paidBy === id || t.split?.shares.some((s) => s.who === id),
  )
  if (used) {
    await db.people.update(id, { archived: true })
    return 'archived'
  }
  await db.people.delete(id)
  return 'deleted'
}
