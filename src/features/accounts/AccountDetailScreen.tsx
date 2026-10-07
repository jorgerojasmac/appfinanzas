import { Inbox, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AnimatedMoney } from '../../components/ui/AnimatedNumber'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { EmptyState } from '../../components/ui/Controls'
import { Card } from '../../components/ui/List'
import { NavButton, Screen } from '../../components/ui/Screen'
import { useLedger } from '../../hooks/data'
import { formatMoney } from '../../domain/money'
import { TransactionList } from '../transactions/TransactionList'
import { CardDetails } from '../cards/CardDetails'
import { summarizeCard } from '../../domain/cards'
import { todayISO } from '../../domain/dates'
import { ACCOUNT_TYPE_LABEL, SAVINGS_PURPOSE_LABEL } from './accountLabels'
import { AccountSheet } from './AccountSheet'

export function AccountDetailScreen() {
  const { id = '' } = useParams()
  const { ready, accountMap, transactions, balances, categoryMap } = useLedger()
  const [editing, setEditing] = useState(false)
  const account = accountMap.get(id)
  const txs = useMemo(
    () => transactions.filter((t) => t.accountId === id || t.toAccountId === id),
    [transactions, id],
  )

  if (!ready) return <Screen title="" back tabBar>{null}</Screen>
  if (!account)
    return (
      <Screen title="Cuenta" back>
        <EmptyState icon={<Inbox size={28} />} title="Cuenta no encontrada" />
      </Screen>
    )

  const balance = balances.get(id) ?? 0
  const isCard = account.type === 'credit'
  const debt = Math.max(0, -balance)

  return (
    <Screen
      title={account.name}
      back
      right={
        <NavButton label="Editar cuenta" onClick={() => setEditing(true)}>
          <Pencil size={20} strokeWidth={1.75} />
        </NavButton>
      }
    >
      {isCard ? (
        <CardDetails card={account} summary={summarizeCard(account, transactions, todayISO())} />
      ) : (
      <Card className="flex flex-col items-center py-6 text-center">
        <CategoryIcon icon={account.icon} color={account.color} size={56} />
        <p className="mt-3 text-[15px] text-label-2">
          {isCard ? 'Deuda actual' : 'Saldo'} ·{' '}
          {account.type === 'savings' && account.savingsPurpose
            ? SAVINGS_PURPOSE_LABEL[account.savingsPurpose]
            : ACCOUNT_TYPE_LABEL[account.type]}
        </p>
        <AnimatedMoney
          value={isCard ? debt : balance}
          className={`font-rounded text-[40px] leading-[48px] font-bold tracking-tight ${
            isCard && debt > 0 ? 'text-red' : !isCard && balance < 0 ? 'text-red' : ''
          }`}
        />
        {isCard && account.creditLimit ? (
          <p className="mt-1 text-[13px] text-label-2">
            Cupo {formatMoney(account.creditLimit)} · Disponible {formatMoney(Math.max(0, account.creditLimit - debt))}
          </p>
        ) : null}
      </Card>
      )}

      {txs.length === 0 ? (
        <EmptyState icon={<Inbox size={28} strokeWidth={1.5} />} title="Sin movimientos" message="Los movimientos de esta cuenta aparecerán aquí." />
      ) : (
        <TransactionList transactions={txs} categoryMap={categoryMap} accountMap={accountMap} perspective={id} />
      )}

      <AccountSheet open={editing} onClose={() => setEditing(false)} account={account} currentBalance={balance} />
    </Screen>
  )
}
