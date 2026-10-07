import { CalendarClock, Plus } from 'lucide-react'
import { useState } from 'react'
import type { RecurringRule } from '../../db/types'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { EmptyState, PrimaryButton } from '../../components/ui/Controls'
import { Group } from '../../components/ui/List'
import { NavButton, Screen } from '../../components/ui/Screen'
import { useLedger, useRules } from '../../hooks/data'
import { formatDayHeader } from '../../domain/dates'
import { formatMoney } from '../../domain/money'
import { describeFrequency } from '../../domain/recurrence'
import { RuleSheet } from './RuleSheet'

export function RecurringScreen() {
  const rules = useRules('recurring') ?? []
  const { accounts, categories, balances, categoryMap, accountMap } = useLedger()
  const [edit, setEdit] = useState<{ open: boolean; rule?: RecurringRule }>({ open: false })

  const row = (r: RecurringRule) => {
    const cat = r.categoryId ? categoryMap.get(r.categoryId) : undefined
    const to = r.toAccountId ? accountMap.get(r.toAccountId) : undefined
    const icon = r.type === 'transfer' ? (to?.type === 'credit' ? 'CreditCard' : 'ArrowLeftRight') : cat?.icon
    const color = r.type === 'transfer' ? 'gray' : cat?.color
    return (
      <button
        key={r.id}
        onClick={() => setEdit({ open: true, rule: r })}
        className="flex min-h-[60px] w-full items-center gap-3 bg-card px-4 py-2 text-left active:bg-fill-2"
        style={{ ['--sep-inset' as string]: '64px' }}
      >
        <CategoryIcon icon={icon} color={color} />
        <div className="min-w-0 flex-1">
          <div className={`truncate text-[17px] ${r.active ? '' : 'text-label-2'}`}>{r.name}</div>
          <div className="truncate text-[15px] leading-5 text-label-2">
            {r.active ? `${formatDayHeader(r.nextDate)} · ${describeFrequency(r).replace(/, .*/, '')}` : 'Pausado'}
          </div>
        </div>
        <div
          className={`tabular shrink-0 text-[17px] ${r.type === 'income' ? 'text-green' : r.type === 'transfer' ? 'text-label-2' : ''}`}
        >
          {formatMoney(r.type === 'expense' ? -r.amount : r.amount, { sign: r.type === 'income' })}
        </div>
      </button>
    )
  }

  const active = rules.filter((r) => r.active)
  const paused = rules.filter((r) => !r.active)

  return (
    <Screen
      title="Recurrentes"
      back="Planificación"
      right={
        <NavButton label="Nuevo recurrente" onClick={() => setEdit({ open: true })}>
          <Plus size={26} strokeWidth={2} />
        </NavButton>
      }
    >
      {rules.length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={28} strokeWidth={1.5} />}
          title="Sin recurrentes"
          message="Arriendo, servicios, la cuota de la maestría o un ahorro automático: defínelos una vez y se registran solos en su fecha."
          action={<PrimaryButton onClick={() => setEdit({ open: true })}>Crear recurrente</PrimaryButton>}
        />
      ) : (
        <>
          {active.length > 0 && (
            <Group header="Activos" footer="Se registran automáticamente al abrir la app en la fecha indicada o después.">
              {active.map(row)}
            </Group>
          )}
          {paused.length > 0 && <Group header="Pausados">{paused.map(row)}</Group>}
        </>
      )}
      <RuleSheet
        open={edit.open}
        onClose={() => setEdit((e) => ({ ...e, open: false }))}
        kind="recurring"
        rule={edit.rule}
        accounts={accounts}
        categories={categories}
        balances={balances}
      />
    </Screen>
  )
}
