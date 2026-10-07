import { Check } from 'lucide-react'
import type { Account } from '../../db/types'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { Group, Row } from '../../components/ui/List'
import { Sheet, SheetButton } from '../../components/ui/Sheet'
import { ACCOUNT_TYPE_LABEL, accountBalanceLabel } from './accountLabels'

export function AccountPicker({
  open,
  onClose,
  accounts,
  balances,
  selected,
  exclude,
  title,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  accounts: Account[]
  balances: Map<string, number>
  selected?: string
  exclude?: string
  title: string
  onSelect: (id: string) => void
}) {
  return (
    <Sheet open={open} onClose={onClose} size="auto" title={title} right={<SheetButton onClick={onClose}>Listo</SheetButton>}>
      <Group>
        {accounts
          .filter((a) => a.id !== exclude)
          .map((a) => (
            <Row
              key={a.id}
              onClick={() => onSelect(a.id)}
              icon={<CategoryIcon icon={a.icon} color={a.color} />}
              title={a.name}
              subtitle={`${ACCOUNT_TYPE_LABEL[a.type]} · ${accountBalanceLabel(a, balances.get(a.id) ?? 0)}`}
              value={a.id === selected ? <Check size={20} strokeWidth={2.5} className="text-blue" /> : undefined}
            />
          ))}
      </Group>
      {accounts.length === 0 && (
        <p className="py-6 text-center text-label-2">Crea una cuenta en Ajustes → Cuentas.</p>
      )}
    </Sheet>
  )
}
