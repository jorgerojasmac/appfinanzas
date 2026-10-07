import type { Goal } from '../db/types'
import { diffDays, todayISO, type ISODate } from './dates'
import type { Cents } from './money'

export interface GoalProgress {
  saved: Cents
  ratio: number
  remaining: Cents
  done: boolean
  /** Meses que quedan hasta la fecha objetivo (redondeado hacia arriba) */
  monthsLeft: number | null
  /** Cuánto apartar por mes para llegar a tiempo */
  perMonth: Cents | null
  overdue: boolean
}

export function goalProgress(goal: Pick<Goal, 'target' | 'targetDate'>, saved: Cents, today: ISODate = todayISO()): GoalProgress {
  const s = Math.max(0, saved)
  const remaining = Math.max(0, goal.target - s)
  const done = goal.target > 0 && s >= goal.target
  let monthsLeft: number | null = null
  let perMonth: Cents | null = null
  let overdue = false
  if (goal.targetDate) {
    const days = diffDays(today, goal.targetDate)
    overdue = days < 0 && !done
    monthsLeft = Math.max(0, Math.ceil(days / 30.44))
    if (!done) perMonth = monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : remaining
  }
  return {
    saved: s,
    ratio: goal.target > 0 ? Math.min(1, s / goal.target) : 0,
    remaining,
    done,
    monthsLeft,
    perMonth,
    overdue,
  }
}
