import type { BudgetLine } from '../../hooks/planning'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { ProgressBar } from '../../components/ui/Progress'
import { budgetTone, TONE_COLOR } from '../../domain/budgets'
import { formatMoney } from '../../domain/money'

/** Fila de presupuesto con barra verde / amarilla / roja. */
export function BudgetRow({
  line,
  onClick,
  monthProgress,
}: {
  line: BudgetLine
  onClick?: () => void
  /** 0–1: avance del mes actual, para avisar si se va por encima del ritmo */
  monthProgress?: number
}) {
  const { category, limit, spent } = line
  const tone = limit == null ? 'ok' : budgetTone(spent, limit)
  const left = (limit ?? 0) - spent
  const aheadOfPace =
    limit != null && monthProgress != null && tone === 'ok' && limit > 0 && spent / limit > monthProgress + 0.15

  return (
    <button onClick={onClick} className="block w-full bg-card px-4 py-3 text-left active:bg-fill-2" style={{ ['--sep-inset' as string]: '64px' }}>
      <div className="flex items-center gap-3">
        <CategoryIcon icon={category.icon} color={category.color} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[17px]">{category.name}</span>
            <span className={`tabular shrink-0 text-[15px] ${tone === 'over' ? 'font-semibold text-red' : 'text-label-2'}`}>
              {limit == null ? 'Sin ingreso base' : left >= 0 ? `Quedan ${formatMoney(left)}` : `Excedido ${formatMoney(-left)}`}
            </span>
          </div>
          <div className="mt-1.5">
            <ProgressBar ratio={limit ? spent / limit : 0} color={TONE_COLOR[tone]} height={6} />
          </div>
          <div className="mt-1 flex justify-between text-[13px] text-label-2">
            <span className="tabular">
              {formatMoney(spent)} de {limit == null ? '—' : formatMoney(limit)}
              {line.budget.mode === 'percent' && ` · ${line.budget.percent}%`}
            </span>
            {aheadOfPace && <span className="text-orange">Vas rápido este mes</span>}
          </div>
        </div>
      </div>
    </button>
  )
}
