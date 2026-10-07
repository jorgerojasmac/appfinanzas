import { CalendarClock, ChevronRight, Repeat, Scale, Target } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { ProgressBar, ProgressRing } from '../../components/ui/Progress'
import { Screen } from '../../components/ui/Screen'
import { useBudgets, useGoalEntries, useGoals, useLedger, useRules } from '../../hooks/data'
import { goalSavedMap, useBudgetLines, useIncomeBase } from '../../hooks/planning'
import { budgetTone, TONE_COLOR } from '../../domain/budgets'
import { currentMonth, formatDayHeader, formatMonth } from '../../domain/dates'
import { goalProgress } from '../../domain/goals'
import { formatMoney } from '../../domain/money'
import { subscriptionTotals } from './SubscriptionsScreen'

function Section({
  title,
  icon,
  color,
  to,
  children,
}: {
  title: string
  icon: ReactNode
  color: string
  to: string
  children: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      className="block w-full rounded-[16px] bg-card p-4 text-left transition-transform active:scale-[0.98]"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-[15px] font-semibold" style={{ color }}>
          {icon}
          {title}
        </span>
        <ChevronRight size={18} strokeWidth={2.25} className="ml-auto text-label-3" />
      </div>
      {children}
    </button>
  )
}

export function PlanningScreen() {
  const { transactions, categoryMap, balances } = useLedger()
  const budgets = useBudgets()
  const goals = useGoals() ?? []
  const entries = useGoalEntries() ?? []
  const subs = useRules('subscription') ?? []
  const recurring = useRules('recurring') ?? []
  const month = currentMonth()
  const base = useIncomeBase(transactions, month)
  const { lines, totalLimit, totalSpent } = useBudgetLines(budgets, categoryMap, transactions, month, base.effective)
  const saved = useMemo(() => goalSavedMap(goals, entries, balances), [goals, entries, balances])
  const subTotals = subscriptionTotals(subs)

  const atRisk = [...lines]
    .filter((l) => l.limit)
    .sort((a, b) => b.spent / (b.limit || 1) - a.spent / (a.limit || 1))
    .slice(0, 3)
  const activeGoals = goals.filter((g) => !g.completedAt).slice(0, 3)
  const nextRecurring = recurring.filter((r) => r.active).slice(0, 3)
  const tone = budgetTone(totalSpent, totalLimit)

  return (
    <Screen title="Planificación">
      <Section title={`Presupuestos de ${formatMonth(month).split(' ')[0].toLowerCase()}`} icon={<Scale size={18} />} color="var(--green)" to="/planificacion/presupuestos">
        {lines.length === 0 ? (
          <p className="text-[15px] leading-5 text-label-2">
            Define límites por categoría según tu ingreso base{base.effective ? ` (${formatMoney(base.effective)})` : ''}.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <ProgressRing ratio={totalLimit ? totalSpent / totalLimit : 0} color={TONE_COLOR[tone]} size={52} stroke={6}>
                <span className="tabular text-[12px] font-semibold">{totalLimit ? Math.round((totalSpent / totalLimit) * 100) : 0}%</span>
              </ProgressRing>
              <div>
                <p className="tabular text-[20px] font-semibold">{formatMoney(totalSpent)}</p>
                <p className="tabular text-[13px] text-label-2">de {formatMoney(totalLimit)} presupuestados</p>
              </div>
            </div>
            <div className="mt-3 space-y-2.5">
              {atRisk.map((l) => (
                <div key={l.budget.id} className="flex items-center gap-2.5">
                  <CategoryIcon icon={l.category.icon} color={l.category.color} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-[13px]">
                      <span className="truncate">{l.category.name}</span>
                      <span className="tabular text-label-2">{Math.round((l.spent / (l.limit || 1)) * 100)}%</span>
                    </div>
                    <ProgressBar ratio={l.spent / (l.limit || 1)} color={TONE_COLOR[budgetTone(l.spent, l.limit ?? 0)]} height={5} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      <Section title="Metas de ahorro" icon={<Target size={18} />} color="var(--blue)" to="/planificacion/metas">
        {activeGoals.length === 0 ? (
          <p className="text-[15px] leading-5 text-label-2">
            {goals.length ? '¡Todas tus metas están cumplidas! Crea una nueva.' : 'Crea una meta y te diré cuánto apartar cada mes.'}
          </p>
        ) : (
          <div className="space-y-3">
            {activeGoals.map((g) => {
              const p = goalProgress(g, saved.get(g.id) ?? 0)
              return (
                <div key={g.id} className="flex items-center gap-2.5">
                  <CategoryIcon icon={g.icon} color={g.color} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-[13px]">
                      <span className="truncate">{g.name}</span>
                      <span className="tabular text-label-2">
                        {formatMoney(p.saved)} / {formatMoney(g.target)}
                      </span>
                    </div>
                    <ProgressBar ratio={p.ratio} color={`var(--${g.color})`} height={5} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      <Section title="Suscripciones" icon={<Repeat size={18} />} color="var(--pink)" to="/planificacion/suscripciones">
        {subTotals.count === 0 ? (
          <p className="text-[15px] leading-5 text-label-2">Agrega tus suscripciones para ver cuánto te cuestan al año.</p>
        ) : (
          <div className="flex items-end justify-between">
            <div>
              <p className="tabular text-[20px] font-semibold">
                {formatMoney(subTotals.monthly)}
                <span className="text-[15px] font-normal text-label-2"> /mes</span>
              </p>
              <p className="tabular text-[13px] text-label-2">
                {formatMoney(subTotals.yearly)} al año · {subTotals.count} activas
              </p>
            </div>
            {subs.some((s) => s.active && s.review) && (
              <span className="rounded-full bg-orange/15 px-2.5 py-1 text-[12px] font-medium text-orange">
                {subs.filter((s) => s.active && s.review).length} en revisión
              </span>
            )}
          </div>
        )}
      </Section>

      <Section title="Recurrentes" icon={<CalendarClock size={18} />} color="var(--indigo)" to="/planificacion/recurrentes">
        {nextRecurring.length === 0 ? (
          <p className="text-[15px] leading-5 text-label-2">Arriendo, servicios o ahorros automáticos que se registran solos.</p>
        ) : (
          <div className="space-y-2">
            {nextRecurring.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-[15px]">
                <span className="truncate">{r.name}</span>
                <span className="tabular shrink-0 text-label-2">
                  {formatDayHeader(r.nextDate)} · {formatMoney(r.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <p className="px-4 text-center text-[13px] text-label-3">Tarjetas de crédito y gastos compartidos llegan en la fase 3.</p>
    </Screen>
  )
}
