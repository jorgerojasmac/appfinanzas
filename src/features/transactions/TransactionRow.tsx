import { ArrowLeftRight, CreditCard, Repeat, Users } from 'lucide-react'
import { ui } from '../../app/uiStore'
import { deleteTransaction, restoreTransaction } from '../../db/repo'
import { personName, usePeopleMap } from '../../app/PeopleContext'
import type { Account, Category, Person, Transaction } from '../../db/types'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { SwipeRow } from '../../components/ui/SwipeRow'
import { toast } from '../../components/ui/Toast'
import { displayAmount } from '../../domain/ledger'
import { formatMoney } from '../../domain/money'

interface Props {
  tx: Transaction
  categoryMap: Map<string, Category>
  accountMap: Map<string, Account>
  /** Desde el punto de vista de una cuenta (detalle de cuenta) */
  perspective?: string
}

export async function deleteWithUndo(id: string) {
  const removed = await deleteTransaction(id)
  if (removed) toast('Movimiento borrado', 'delete', { label: 'Deshacer', run: () => restoreTransaction(removed) })
}

/** Describe un movimiento para mostrarlo en listas. */
export function describeTx(
  tx: Transaction,
  categoryMap: Map<string, Category>,
  accountMap: Map<string, Account>,
  people: Map<string, Person> = new Map(),
) {
  const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined
  const from = tx.accountId ? accountMap.get(tx.accountId) : undefined
  const to = tx.toAccountId ? accountMap.get(tx.toAccountId) : undefined

  if (tx.type === 'transfer') {
    const cardPayment = to?.type === 'credit'
    return {
      icon: cardPayment ? 'CreditCard' : 'ArrowLeftRight',
      color: 'gray' as const,
      title: tx.note || (cardPayment ? `Pago ${to?.name ?? 'tarjeta'}` : 'Transferencia'),
      subtitle: `${from?.name ?? '—'} → ${to?.name ?? '—'}`,
      Fallback: cardPayment ? CreditCard : ArrowLeftRight,
    }
  }
  if (tx.type === 'settlement') {
    const name = tx.personId ? personName(tx.personId, people) : 'Alguien'
    return {
      icon: 'Users',
      color: 'gray' as const,
      title: tx.settleDirection === 'received' ? `${name} te pagó` : `Le pagaste a ${name}`,
      subtitle: [tx.note, from?.name].filter(Boolean).join(' · '),
      Fallback: Users,
    }
  }
  return {
    icon: cat?.icon ?? 'Ellipsis',
    color: cat?.color ?? ('gray' as const),
    title: tx.note || cat?.name || 'Sin categoría',
    subtitle: [
      tx.note ? cat?.name : null,
      tx.split && tx.split.paidBy !== 'me' ? `Pagó ${personName(tx.split.paidBy, people)}` : from?.name,
    ]
      .filter(Boolean)
      .join(' · '),
    Fallback: null,
  }
}

export function TransactionRow({ tx, categoryMap, accountMap, perspective }: Props) {
  const people = usePeopleMap()
  const d = describeTx(tx, categoryMap, accountMap, people)
  let { value, tone } = displayAmount(tx)
  if (perspective && tx.type === 'transfer') {
    value = tx.accountId === perspective ? -tx.amount : tx.amount
  }
  const color = tone === 'income' ? 'text-green' : tone === 'neutral' ? 'text-label-2' : 'text-label'
  const sign = tone === 'income' || (perspective && value > 0)

  return (
    <SwipeRow onEdit={() => ui.openEditTx(tx)} onDelete={() => deleteWithUndo(tx.id)}>
      <button
        onClick={() => ui.openEditTx(tx)}
        className="flex min-h-[60px] w-full items-center gap-3 px-4 py-2 text-left transition-colors active:bg-fill-2"
      >
        <CategoryIcon icon={d.icon} color={d.color} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[17px]">{d.title}</div>
          {d.subtitle && (
            <div className="flex items-center gap-1 truncate text-[15px] leading-5 text-label-2">
              {tx.split && <Users size={13} strokeWidth={2} className="shrink-0" />}
              {tx.recurringId && <Repeat size={13} strokeWidth={2} className="shrink-0" aria-label="Recurrente" />}
              <span className="truncate">{d.subtitle}</span>
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className={`tabular text-[17px] ${color}`}>{formatMoney(value, { sign: !!sign })}</div>
          {tx.split && tx.type === 'expense' && (
            <div className="tabular text-[13px] text-label-2">
              {tx.myAmount === 0 ? `prestado ${formatMoney(tx.amount)}` : `de ${formatMoney(tx.amount)}`}
            </div>
          )}
        </div>
      </button>
    </SwipeRow>
  )
}
