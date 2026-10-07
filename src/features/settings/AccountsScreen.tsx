import { Plus } from 'lucide-react'
import { useState } from 'react'
import type { Account, AccountType } from '../../db/types'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { Group, Row } from '../../components/ui/List'
import { NavButton, Screen } from '../../components/ui/Screen'
import { useLedger } from '../../hooks/data'
import { ACCOUNT_TYPE_PLURAL, accountBalanceLabel, SAVINGS_PURPOSE_LABEL } from '../accounts/accountLabels'
import { AccountSheet } from '../accounts/AccountSheet'

const ORDER: AccountType[] = ['cash', 'bank', 'savings', 'credit']

export function AccountsScreen() {
  const { accounts, balances } = useLedger()
  const [sheet, setSheet] = useState<{ open: boolean; account?: Account }>({ open: false })
  const active = accounts.filter((a) => !a.archived)

  return (
    <Screen
      title="Cuentas"
      back="Ajustes"
      right={
        <NavButton label="Nueva cuenta" onClick={() => setSheet({ open: true })}>
          <Plus size={26} strokeWidth={2} />
        </NavButton>
      }
    >
      {ORDER.map((type) => {
        const list = active.filter((a) => a.type === type)
        if (!list.length) return null
        return (
          <Group key={type} header={ACCOUNT_TYPE_PLURAL[type]}>
            {list.map((a) => (
              <Row
                key={a.id}
                icon={<CategoryIcon icon={a.icon} color={a.color} />}
                title={a.name}
                subtitle={
                  a.type === 'savings' && a.savingsPurpose && SAVINGS_PURPOSE_LABEL[a.savingsPurpose] !== a.name
                    ? SAVINGS_PURPOSE_LABEL[a.savingsPurpose]
                    : undefined
                }
                value={<span className="text-label-2">{accountBalanceLabel(a, balances.get(a.id) ?? 0)}</span>}
                chevron
                onClick={() => setSheet({ open: true, account: a })}
              />
            ))}
          </Group>
        )
      })}
      <p className="px-4 text-[13px] leading-[18px] text-label-2">
        Las tarjetas de crédito muestran su deuda. Pagar una tarjeta es una transferencia desde el banco, no un gasto nuevo.
      </p>
      <AccountSheet
        open={sheet.open}
        account={sheet.account}
        currentBalance={sheet.account ? balances.get(sheet.account.id) : undefined}
        onClose={() => setSheet((s) => ({ ...s, open: false }))} />
    </Screen>
  )
}
