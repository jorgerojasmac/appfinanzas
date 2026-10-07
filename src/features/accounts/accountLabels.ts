import type { Account, AccountType, SavingsPurpose } from '../../db/types'
import { formatMoney } from '../../domain/money'

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  cash: 'Efectivo',
  bank: 'Banco',
  savings: 'Ahorro',
  credit: 'Tarjeta de crédito',
}

export const ACCOUNT_TYPE_PLURAL: Record<AccountType, string> = {
  cash: 'Efectivo',
  bank: 'Bancos',
  savings: 'Ahorros',
  credit: 'Tarjetas de crédito',
}

export const SAVINGS_PURPOSE_LABEL: Record<SavingsPurpose, string> = {
  emergency: 'Fondo de emergencia',
  cushion: 'Fondo colchón',
  general: 'Ahorro general',
}

export const DEFAULT_ACCOUNT_ICON: Record<AccountType, string> = {
  cash: 'Banknote',
  bank: 'Landmark',
  savings: 'PiggyBank',
  credit: 'CreditCard',
}

/** En tarjetas se muestra la deuda; en el resto, el saldo. */
export function accountBalanceLabel(a: Account, balance: number): string {
  if (a.type === 'credit')
    return balance < 0 ? `Deuda ${formatMoney(-balance)}` : balance > 0 ? `A favor ${formatMoney(balance)}` : 'Sin deuda'
  return formatMoney(balance)
}
