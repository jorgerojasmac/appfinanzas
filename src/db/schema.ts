import Dexie, { type EntityTable } from 'dexie'
import type { Account, Budget, Category, Goal, GoalEntry, RecurringRule, Setting, Transaction } from './types'
import { defaultAccounts, defaultCategories } from './seed'

export class FinanzasDB extends Dexie {
  accounts!: EntityTable<Account, 'id'>
  categories!: EntityTable<Category, 'id'>
  transactions!: EntityTable<Transaction, 'id'>
  settings!: EntityTable<Setting, 'key'>
  budgets!: EntityTable<Budget, 'id'>
  goals!: EntityTable<Goal, 'id'>
  goalEntries!: EntityTable<GoalEntry, 'id'>
  recurring!: EntityTable<RecurringRule, 'id'>

  constructor(name = 'finanzas') {
    super(name)
    this.version(1).stores({
      accounts: 'id, type, order',
      categories: 'id, kind, order',
      transactions: 'id, date, type, accountId, toAccountId, categoryId, *tags, recurringId, personId',
      settings: 'key',
    })
    // Fase 2: presupuestos, metas, recurrentes y suscripciones
    this.version(2).stores({
      transactions:
        'id, date, type, accountId, toAccountId, categoryId, *tags, recurringId, personId, [recurringId+date]',
      budgets: 'id, &categoryId',
      goals: 'id, order',
      goalEntries: 'id, goalId, date',
      recurring: 'id, kind, nextDate',
    })

    // Primera apertura: categorías y cuentas iniciales
    this.on('populate', (tx) => {
      tx.table('categories').bulkAdd(defaultCategories())
      tx.table('accounts').bulkAdd(defaultAccounts())
    })
  }
}

export const db = new FinanzasDB()

export const newId = () => crypto.randomUUID()
