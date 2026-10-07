import Dexie, { type EntityTable } from 'dexie'
import type { Account, Category, Setting, Transaction } from './types'
import { defaultAccounts, defaultCategories } from './seed'

export class FinanzasDB extends Dexie {
  accounts!: EntityTable<Account, 'id'>
  categories!: EntityTable<Category, 'id'>
  transactions!: EntityTable<Transaction, 'id'>
  settings!: EntityTable<Setting, 'key'>

  constructor(name = 'finanzas') {
    super(name)
    this.version(1).stores({
      accounts: 'id, type, order',
      categories: 'id, kind, order',
      transactions: 'id, date, type, accountId, toAccountId, categoryId, *tags, recurringId, personId',
      settings: 'key',
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
