import { useEffect } from 'react'
import { db } from '../../db/schema'
import { celebrate } from '../../components/ui/Confetti'
import { goalSavedMap } from '../../hooks/planning'
import { useGoalEntries, useGoals, useLedger } from '../../hooks/data'

/**
 * Vigila las metas: cuando una llega al objetivo (por un aporte o porque la
 * cuenta vinculada creció) la marca como cumplida y lanza la celebración.
 */
export function GoalWatcher() {
  const goals = useGoals()
  const entries = useGoalEntries()
  const { ready, balances } = useLedger()

  useEffect(() => {
    if (!goals || !entries || !ready) return
    const saved = goalSavedMap(goals, entries, balances)
    for (const g of goals) {
      const done = g.target > 0 && (saved.get(g.id) ?? 0) >= g.target
      if (done && !g.completedAt) {
        db.goals.update(g.id, { completedAt: Date.now() })
        celebrate(`¡Meta cumplida: ${g.name}!`)
      } else if (!done && g.completedAt) {
        db.goals.update(g.id, { completedAt: undefined })
      }
    }
  }, [goals, entries, balances, ready])

  return null
}
