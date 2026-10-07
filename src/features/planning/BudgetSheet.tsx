import { useMemo, useState } from 'react'
import { deleteBudget, saveBudget } from '../../db/planning'
import type { Budget, Category, Transaction } from '../../db/types'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { Segmented } from '../../components/ui/Controls'
import { MoneyRow } from '../../components/ui/Form'
import { Group, Row } from '../../components/ui/List'
import { Sheet, SheetButton } from '../../components/ui/Sheet'
import { toast } from '../../components/ui/Toast'
import { averageByCategory, budgetLimit } from '../../domain/budgets'
import { currentMonth } from '../../domain/dates'
import { centsToInput, formatMoney, parseMoney } from '../../domain/money'
import { useOnOpen } from '../../hooks/useOnOpen'

export function BudgetSheet({
  open,
  onClose,
  category,
  budget,
  base,
  transactions,
}: {
  open: boolean
  onClose: () => void
  category?: Category
  budget?: Budget
  base: number | null
  transactions: Transaction[]
}) {
  const [mode, setMode] = useState<Budget['mode']>('fixed')
  const [amount, setAmount] = useState('')
  const [percent, setPercent] = useState('')

  const average = useMemo(
    () => (category ? averageByCategory(transactions, currentMonth()).get(category.id) ?? 0 : 0),
    [transactions, category],
  )

  useOnOpen(open, () => {
    setMode(budget?.mode ?? 'fixed')
    setAmount(budget?.amount ? centsToInput(budget.amount) : average ? centsToInput(Math.round(average / 500) * 500) : '')
    setPercent(budget?.percent ? String(budget.percent) : base && average ? String(Math.round((average / base) * 1000) / 10) : '')
  })

  if (!category) return null

  const pct = Number(percent) || 0
  const draft = { mode, amount: parseMoney(amount), percent: pct }
  const limit = budgetLimit(draft, base)
  const valid = mode === 'fixed' ? draft.amount > 0 : pct > 0 && pct <= 100

  const save = async () => {
    await saveBudget({
      id: budget?.id,
      categoryId: category.id,
      mode,
      amount: mode === 'fixed' ? draft.amount : undefined,
      percent: mode === 'percent' ? pct : undefined,
    })
    toast('Presupuesto guardado')
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="auto"
      title={budget ? 'Editar presupuesto' : 'Nuevo presupuesto'}
      left={<SheetButton onClick={onClose}>Cancelar</SheetButton>}
      right={
        <SheetButton onClick={save} bold disabled={!valid}>
          Guardar
        </SheetButton>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-2 pt-1">
          <CategoryIcon icon={category.icon} color={category.color} size={56} />
          <p className="text-[20px] font-semibold">{category.name}</p>
          <p className="text-[13px] text-label-2">
            {average > 0 ? `Promedio de los últimos 3 meses: ${formatMoney(average)}` : 'Sin gastos en los últimos 3 meses'}
          </p>
        </div>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'fixed', label: 'Monto fijo' },
            { value: 'percent', label: '% del ingreso base' },
          ]}
        />
        <Group
          footer={
            mode === 'percent'
              ? base
                ? `Equivale a ${formatMoney(limit ?? 0)} al mes, sobre tu ingreso base de ${formatMoney(base)}. Si tu ingreso base cambia, el presupuesto se ajusta solo.`
                : 'Aún no hay ingreso base: necesitas al menos 3 meses completos de datos o definirlo manualmente.'
              : base && draft.amount
                ? `Es el ${Math.round((draft.amount / base) * 1000) / 10}% de tu ingreso base (${formatMoney(base)}).`
                : 'Límite mensual para esta categoría.'
          }
        >
          {mode === 'fixed' ? (
            <MoneyRow label="Límite mensual" value={amount} onChange={setAmount} />
          ) : (
            <MoneyRow label="Porcentaje" value={percent} onChange={setPercent} suffix="%" />
          )}
        </Group>
        {budget && (
          <Group>
            <Row
              title="Quitar presupuesto"
              destructive
              onClick={async () => {
                await deleteBudget(budget.id)
                toast('Presupuesto eliminado', 'delete')
                onClose()
              }}
            />
          </Group>
        )}
      </div>
    </Sheet>
  )
}
