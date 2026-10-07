import { CalendarClock, TriangleAlert } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColorName } from '../../db/types'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { Group, SectionTitle } from '../../components/ui/List'
import { useLedger, useRules } from '../../hooks/data'
import { formatDayHeader, todayISO } from '../../domain/dates'
import { formatMoney } from '../../domain/money'
import { upcomingPayments } from '../../domain/upcoming'

/** Próximos pagos de los siguientes 7 días: tarjetas, suscripciones y recurrentes. */
export function UpcomingPayments() {
  const navigate = useNavigate()
  const { accounts, transactions, categoryMap } = useLedger()
  const rules = useRules()
  const items = useMemo(() => upcomingPayments(accounts, rules ?? [], transactions, todayISO()), [accounts, rules, transactions])
  const total = items.reduce((a, i) => a + i.amount, 0)

  return (
    <section>
      <SectionTitle
        title="Próximos pagos"
        action={items.length > 0 ? <span className="tabular text-[15px] text-label-2">{formatMoney(total)} en 7 días</span> : undefined}
      />
      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-[12px] bg-card px-4 py-3 text-[15px] text-label-2">
          <CalendarClock size={20} strokeWidth={1.75} />
          Sin pagos en los próximos 7 días.
        </div>
      ) : (
        <Group>
          {items.map((p) => {
            const cat = p.categoryId ? categoryMap.get(p.categoryId) : undefined
            const icon = p.icon ?? cat?.icon ?? 'Repeat'
            const color = (p.color ?? cat?.color ?? 'gray') as ColorName
            const to =
              p.kind === 'card' ? `/cuentas/${p.refId}` : p.kind === 'subscription' ? '/planificacion/suscripciones' : '/planificacion/recurrentes'
            return (
              <button
                key={p.id}
                onClick={() => navigate(to)}
                className="flex min-h-[56px] w-full items-center gap-3 bg-card px-4 py-2 text-left active:bg-fill-2"
                style={{ ['--sep-inset' as string]: '64px' }}
              >
                <CategoryIcon icon={icon} color={color} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[17px]">{p.name}</div>
                  <div className={`flex items-center gap-1 text-[13px] ${p.overdue ? 'text-red' : 'text-label-2'}`}>
                    {p.overdue && <TriangleAlert size={13} strokeWidth={2} />}
                    {p.overdue ? `Vencido · ${formatDayHeader(p.date)}` : formatDayHeader(p.date)}
                    {p.kind === 'subscription' && !p.overdue && ' · suscripción'}
                    {p.kind === 'card' && !p.overdue && ' · tarjeta'}
                  </div>
                </div>
                <span className={`tabular text-[17px] ${p.overdue ? 'font-semibold text-red' : ''}`}>{formatMoney(p.amount)}</span>
              </button>
            )
          })}
        </Group>
      )}
    </section>
  )
}
