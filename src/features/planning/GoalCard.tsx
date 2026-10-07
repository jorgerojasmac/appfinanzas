import { CheckCircle2 } from 'lucide-react'
import type { Goal } from '../../db/types'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { ProgressBar } from '../../components/ui/Progress'
import { goalProgress } from '../../domain/goals'
import { formatMoney } from '../../domain/money'

export function GoalRow({ goal, saved, onClick }: { goal: Goal; saved: number; onClick: () => void }) {
  const p = goalProgress(goal, saved)
  return (
    <button onClick={onClick} className="block w-full bg-card px-4 py-3 text-left active:bg-fill-2" style={{ ['--sep-inset' as string]: '64px' }}>
      <div className="flex items-center gap-3">
        <CategoryIcon icon={goal.icon} color={goal.color} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 truncate text-[17px]">
              {goal.name}
              {p.done && <CheckCircle2 size={16} className="shrink-0 text-green" />}
            </span>
            <span className="tabular shrink-0 text-[15px] text-label-2">{Math.round(p.ratio * 100)}%</span>
          </div>
          <div className="mt-1.5">
            <ProgressBar ratio={p.ratio} color={`var(--${goal.color})`} height={6} />
          </div>
          <div className="mt-1 flex justify-between gap-2 text-[13px] text-label-2">
            <span className="tabular">
              {formatMoney(p.saved)} de {formatMoney(goal.target)}
            </span>
            {!p.done && p.perMonth != null && (
              <span className={`tabular ${p.overdue ? 'text-orange' : ''}`}>
                {p.overdue ? 'Fecha vencida' : `${formatMoney(p.perMonth)}/mes`}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
