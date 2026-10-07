import { Plus, Scale, Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { Budget, Category } from '../../db/types'
import { AnimatedMoney } from '../../components/ui/AnimatedNumber'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { EmptyState, PrimaryButton } from '../../components/ui/Controls'
import { Card, Group, Row } from '../../components/ui/List'
import { MonthSwitcher } from '../../components/ui/MonthSwitcher'
import { ProgressRing } from '../../components/ui/Progress'
import { NavButton, Screen } from '../../components/ui/Screen'
import { useBudgets, useLedger } from '../../hooks/data'
import { useBudgetLines, useIncomeBase } from '../../hooks/planning'
import { budgetTone, TONE_COLOR } from '../../domain/budgets'
import { currentMonth, daysInMonth, todayISO } from '../../domain/dates'
import { formatMoney } from '../../domain/money'
import { SettingsIcon } from '../settings/SettingsScreen'
import { BudgetRow } from './BudgetRow'
import { BudgetSheet } from './BudgetSheet'
import { CategoryPicker } from './CategoryPicker'
import { IncomeBaseSheet } from './IncomeBaseSheet'
import { SuggestSheet } from './SuggestSheet'

export function BudgetsScreen() {
  const { categories, categoryMap, transactions } = useLedger()
  const budgets = useBudgets()
  const [month, setMonth] = useState(currentMonth())
  const base = useIncomeBase(transactions, month)
  const { lines, unbudgeted, totalLimit, totalSpent } = useBudgetLines(budgets, categoryMap, transactions, month, base.effective)

  const [edit, setEdit] = useState<{ open: boolean; category?: Category; budget?: Budget }>({ open: false })
  const [picker, setPicker] = useState(false)
  const [suggest, setSuggest] = useState(false)
  const [baseSheet, setBaseSheet] = useState(false)

  const isCurrent = month === currentMonth()
  const monthProgress = isCurrent ? Number(todayISO().slice(8, 10)) / daysInMonth(month) : 1
  const within = lines.filter((l) => l.limit != null && l.spent <= l.limit).length
  const tone = budgetTone(totalSpent, totalLimit)
  const budgetedIds = new Set(lines.map((l) => l.category.id))
  const available = categories.filter((c) => c.kind === 'expense' && !c.archived && !budgetedIds.has(c.id))

  return (
    <Screen
      title="Presupuestos"
      back="Planificación"
      right={
        <NavButton label="Nuevo presupuesto" onClick={() => setPicker(true)}>
          <Plus size={26} strokeWidth={2} />
        </NavButton>
      }
    >
      <MonthSwitcher month={month} onChange={setMonth} />

      {lines.length > 0 && (
        <Card className="flex items-center gap-4">
          <ProgressRing ratio={totalLimit ? totalSpent / totalLimit : 0} color={TONE_COLOR[tone]} size={76} stroke={9}>
            <span className="tabular text-[15px] font-semibold">{totalLimit ? Math.round((totalSpent / totalLimit) * 100) : 0}%</span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-label-2">Gastado de lo presupuestado</p>
            <AnimatedMoney value={totalSpent} className="font-rounded text-[26px] font-bold" />
            <p className="tabular text-[13px] text-label-2">
              de {formatMoney(totalLimit)} · {within} de {lines.length} categorías dentro del límite
            </p>
          </div>
        </Card>
      )}

      <Group>
        <Row
          icon={<SettingsIcon color="green"><Scale size={18} strokeWidth={2} /></SettingsIcon>}
          inset={58}
          title="Ingreso base"
          value={<span className="text-label-2">{base.effective != null ? formatMoney(base.effective) : 'Sin datos'}</span>}
          chevron
          onClick={() => setBaseSheet(true)}
        />
        <Row
          icon={<SettingsIcon color="purple"><Sparkles size={18} strokeWidth={2} /></SettingsIcon>}
          inset={58}
          title="Sugerir presupuestos"
          chevron
          onClick={() => setSuggest(true)}
        />
      </Group>

      {lines.length === 0 ? (
        <EmptyState
          icon={<Scale size={28} strokeWidth={1.5} />}
          title="Sin presupuestos"
          message="Define un límite mensual por categoría, como monto fijo o como porcentaje de tu ingreso base. Puedo sugerirte valores según tu gasto reciente."
          action={<PrimaryButton onClick={() => setSuggest(true)}>Ver sugerencias</PrimaryButton>}
        />
      ) : (
        <Group header="Por categoría" footer={base.manual != null ? 'Usando un ingreso base definido manualmente.' : undefined}>
          {lines.map((l) => (
            <BudgetRow
              key={l.budget.id}
              line={l}
              monthProgress={isCurrent ? monthProgress : undefined}
              onClick={() => setEdit({ open: true, category: l.category, budget: l.budget })}
            />
          ))}
        </Group>
      )}

      {unbudgeted.length > 0 && (
        <Group header="Gastos sin presupuesto" footer="Toca una categoría para ponerle un límite.">
          {unbudgeted.map(({ category, spent }) => (
            <Row
              key={category.id}
              icon={<CategoryIcon icon={category.icon} color={category.color} />}
              title={category.name}
              value={<span className="text-label-2">{formatMoney(spent)}</span>}
              chevron
              onClick={() => setEdit({ open: true, category })}
            />
          ))}
        </Group>
      )}

      <CategoryPicker
        open={picker}
        onClose={() => setPicker(false)}
        categories={available}
        title="Elige una categoría"
        onSelect={(id) => {
          setPicker(false)
          setEdit({ open: true, category: categoryMap.get(id) })
        }}
      />
      <BudgetSheet
        open={edit.open}
        onClose={() => setEdit((e) => ({ ...e, open: false }))}
        category={edit.category}
        budget={edit.budget}
        base={base.effective}
        transactions={transactions}
      />
      <SuggestSheet
        open={suggest}
        onClose={() => setSuggest(false)}
        transactions={transactions}
        categories={categories}
        budgets={budgets ?? []}
        base={base.effective}
      />
      <IncomeBaseSheet open={baseSheet} onClose={() => setBaseSheet(false)} base={base} />
    </Screen>
  )
}
