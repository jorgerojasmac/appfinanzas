import { Eye, Plus, Repeat } from 'lucide-react'
import { useState } from 'react'
import type { RecurringRule } from '../../db/types'
import { AnimatedMoney } from '../../components/ui/AnimatedNumber'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { EmptyState, PrimaryButton } from '../../components/ui/Controls'
import { Card, Group } from '../../components/ui/List'
import { NavButton, Screen } from '../../components/ui/Screen'
import { useLedger, useRules } from '../../hooks/data'
import { formatDayHeader } from '../../domain/dates'
import { formatMoney } from '../../domain/money'
import { monthlyEquivalent, yearlyEquivalent } from '../../domain/recurrence'
import { RuleSheet } from './RuleSheet'

export function subscriptionTotals(subs: RecurringRule[]) {
  const active = subs.filter((s) => s.active)
  const monthly = active.reduce((a, s) => a + monthlyEquivalent(s.amount, s.frequency, s.interval), 0)
  const yearly = active.reduce((a, s) => a + yearlyEquivalent(s.amount, s.frequency, s.interval), 0)
  const reviewYearly = active.filter((s) => s.review).reduce((a, s) => a + yearlyEquivalent(s.amount, s.frequency, s.interval), 0)
  return { monthly, yearly, reviewYearly, count: active.length }
}

export function SubscriptionsScreen() {
  const subs = useRules('subscription') ?? []
  const { accounts, categories, balances, accountMap } = useLedger()
  const [edit, setEdit] = useState<{ open: boolean; rule?: RecurringRule }>({ open: false })
  const totals = subscriptionTotals(subs)

  const review = subs.filter((s) => s.active && s.review)
  const active = subs.filter((s) => s.active && !s.review)
  const cancelled = subs.filter((s) => !s.active)

  const row = (s: RecurringRule) => (
    <button
      key={s.id}
      onClick={() => setEdit({ open: true, rule: s })}
      className="flex min-h-[60px] w-full items-center gap-3 bg-card px-4 py-2 text-left active:bg-fill-2"
      style={{ ['--sep-inset' as string]: '64px' }}
    >
      <CategoryIcon icon={s.icon ?? 'Repeat'} color={s.color ?? 'pink'} />
      <div className="min-w-0 flex-1">
        <div className={`truncate text-[17px] ${s.active ? '' : 'text-label-2 line-through'}`}>{s.name}</div>
        <div className="truncate text-[15px] leading-5 text-label-2">
          {s.active ? `${formatDayHeader(s.nextDate)} · ` : 'Cancelada · '}
          {(s.accountId && accountMap.get(s.accountId)?.name) || 'Sin cuenta'}
        </div>
      </div>
      <div className="tabular shrink-0 text-right">
        <div className="text-[17px]">{formatMoney(s.amount)}</div>
        <div className="text-[13px] text-label-2">{s.frequency === 'yearly' ? 'al año' : 'al mes'}</div>
      </div>
    </button>
  )

  return (
    <Screen
      title="Suscripciones"
      back="Planificación"
      right={
        <NavButton label="Nueva suscripción" onClick={() => setEdit({ open: true })}>
          <Plus size={26} strokeWidth={2} />
        </NavButton>
      }
    >
      {subs.length === 0 ? (
        <EmptyState
          icon={<Repeat size={28} strokeWidth={1.5} />}
          title="Sin suscripciones"
          message="Agrega Netflix, Spotify, iCloud y demás. Se registran solas el día del cobro y verás cuánto te cuestan al mes y al año."
          action={<PrimaryButton onClick={() => setEdit({ open: true })}>Agregar suscripción</PrimaryButton>}
        />
      ) : (
        <>
          <Card>
            <div className="grid grid-cols-2 divide-x-[0.5px] divide-separator">
              <div className="pr-4">
                <p className="text-[13px] text-label-2">Al mes</p>
                <AnimatedMoney value={totals.monthly} className="font-rounded text-[26px] font-bold" />
              </div>
              <div className="pl-4">
                <p className="text-[13px] text-label-2">Al año</p>
                <AnimatedMoney value={totals.yearly} className="font-rounded text-[26px] font-bold" />
              </div>
            </div>
            <p className="mt-2 text-[13px] text-label-2">
              {totals.count} {totals.count === 1 ? 'suscripción activa' : 'suscripciones activas'}
            </p>
            {totals.reviewYearly > 0 && (
              <p className="mt-2 flex items-center gap-1.5 rounded-[10px] bg-orange/12 px-3 py-2 text-[13px] text-orange">
                <Eye size={15} strokeWidth={2} className="shrink-0" />
                Si cancelas las que están en revisión, ahorras {formatMoney(totals.reviewYearly)} al año.
              </p>
            )}
          </Card>
          {review.length > 0 && <Group header="En revisión">{review.map(row)}</Group>}
          {active.length > 0 && <Group header="Activas">{active.map(row)}</Group>}
          {cancelled.length > 0 && <Group header="Canceladas">{cancelled.map(row)}</Group>}
        </>
      )}
      <RuleSheet
        open={edit.open}
        onClose={() => setEdit((e) => ({ ...e, open: false }))}
        kind="subscription"
        rule={edit.rule}
        accounts={accounts}
        categories={categories}
        balances={balances}
      />
    </Screen>
  )
}
