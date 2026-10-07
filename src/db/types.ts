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
  /** % ingresado (solo en modo porcentaje) */
  percent?: number
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

/** Presupuesto mensual de una categoría de gasto. */
export interface Budget {
  id: string
  categoryId: string
  /** Monto fijo o porcentaje del ingreso base */
  mode: 'fixed' | 'percent'
  amount?: Cents
  /** 12.5 = 12.5 % del ingreso base */
  percent?: number
  sample?: boolean
  createdAt: number
}

export interface Goal {
  id: string
  name: string
  icon: string
  color: ColorName
  target: Cents
  targetDate?: ISODate
  /** Si está vinculada, el progreso es el saldo de esa cuenta de ahorro */
  accountId?: string
  completedAt?: number
  order: number
  sample?: boolean
  createdAt: number
}

/** Aporte (positivo) o retiro (negativo) de una meta no vinculada a cuenta. */
export interface GoalEntry {
  id: string
  goalId: string
  amount: Cents
  date: ISODate
  note: string
  sample?: boolean
  createdAt: number
}

export type Frequency = 'weekly' | 'monthly' | 'yearly'

/**
 * Regla que genera movimientos sola. `kind: 'subscription'` son las
 * suscripciones (siempre gastos), con estado "en revisión" opcional.
 */
export interface RecurringRule {
  id: string
  kind: 'recurring' | 'subscription'
  name: string
  type: 'income' | 'expense' | 'transfer'
  amount: Cents
  accountId?: string
  toAccountId?: string
  categoryId?: string
  frequency: Frequency
  interval: number
  /** Próxima fecha en que se generará el movimiento */
  nextDate: ISODate
  /** Día del mes de referencia (para que el 31 vuelva a ser 31 tras febrero) */
  anchorDay: number
  endDate?: ISODate
  active: boolean
  /** Solo suscripciones: marcada para decidir si cancelarla */
  review?: boolean
  icon?: string
  color?: ColorName
  sample?: boolean
  createdAt: number
}

/** Persona con la que comparto gastos. */
export interface Person {
  id: string
  name: string
  color: ColorName
  order: number
  archived: boolean
  sample?: boolean
  createdAt: number
}
