import type { Cents } from '../domain/money'
import type { ISODate } from '../domain/dates'

/** Nombres de color del sistema iOS; el valor real se adapta a claro/oscuro. */
export type ColorName =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'mint'
  | 'teal'
  | 'cyan'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink'
  | 'brown'
  | 'gray'

export type AccountType = 'cash' | 'bank' | 'savings' | 'credit'
export type SavingsPurpose = 'emergency' | 'cushion' | 'general'

export interface Account {
  id: string
  name: string
  type: AccountType
  /**
   * Saldo al crear la cuenta. En tarjetas es negativo cuando hay deuda
   * (una tarjeta con $300 de deuda tiene saldo -30000).
   */
  openingBalance: Cents
  icon: string
  color: ColorName
  order: number
  archived: boolean
  /** Solo tarjetas de crédito */
  creditLimit?: Cents
  statementDay?: number
  dueDay?: number
  /** Solo cuentas de ahorro */
  savingsPurpose?: SavingsPurpose
  sample?: boolean
  createdAt: number
}

export type CategoryKind = 'expense' | 'income'

export interface Category {
  id: string
  name: string
  icon: string
  color: ColorName
  kind: CategoryKind
  /** Gasto fijo (arriendo, servicios) o variable */
  fixed: boolean
  order: number
  archived: boolean
}

/**
 * - income:     suma a la cuenta. Cuenta como ingreso.
 * - expense:    resta de la cuenta (si la hay). Cuenta como gasto SOLO `myAmount`.
 * - transfer:   resta de `accountId`, suma a `toAccountId`. Nunca es ingreso ni gasto
 *               (incluye el pago de tarjetas: banco → tarjeta).
 * - settlement: saldar cuentas con una persona. Mueve dinero, pero no es ingreso ni gasto.
 */
export type TxType = 'income' | 'expense' | 'transfer' | 'settlement'

export interface SplitShare {
  /** 'me' o el id de una persona */
  who: string
  amount: Cents
}

export interface Split {
  mode: 'equal' | 'percent' | 'amount'
  /** 'me' o el id de la persona que pagó */
  paidBy: string
  shares: SplitShare[]
}

export interface Transaction {
  id: string
  type: TxType
  /** Monto total, siempre positivo */
  amount: Cents
  /**
   * La parte que es realmente mía. Es lo único que cuentan los dashboards.
   * Igual a `amount`, salvo en gastos compartidos.
   */
  myAmount: Cents
  accountId?: string
  toAccountId?: string
  categoryId?: string
  date: ISODate
  note: string
  tags: string[]
  split?: Split
  /** Para settlement: con quién y en qué dirección */
  personId?: string
  settleDirection?: 'received' | 'paid'
  recurringId?: string
  sample?: boolean
  createdAt: number
  updatedAt: number
}

export interface Setting {
  key: string
  value: unknown
}
