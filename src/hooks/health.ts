import { useMemo } from 'react'
import { computeHealth, type HealthReport } from '../domain/health'
import { useBudgets, useLedger, useRules, useSetting } from './data'

/** Informe de salud financiera con los datos actuales. */
export function useHealth(): { ready: boolean; report: HealthReport | null } {
  const { ready, accounts, categories, transactions } = useLedger()
  const budgets = useBudgets()
  const rules = useRules()
  const manualBase = useSetting<number | null>('incomeBaseManual', null)
  const report = useMemo(() => {
    if (!ready || !budgets || !rules) return null
    return computeHealth({ transactions, accounts, budgets, categories, rules, manualBase })
  }, [ready, transactions, accounts, budgets, categories, rules, manualBase])
  return { ready: !!report, report }
}
