import { useMemo } from 'react'
import { budgetLimit, computeIncomeBase, type IncomeBase } from '../domain/budgets'
import { currentMonth, type MonthKey } from '../domain/dates'
import { expenseByCategory } from '../domain/ledger'
import { monthKey } from '../domain/dates'
import type { Budget, Category, Goal, GoalEntry, Transaction } from '../db/types'
import { useSetting } from './data'

export interface EffectiveBase extends IncomeBase {
  /** Ingreso base que se usa: el manual si está definido, si no el calculado */
  effective: number | null
  manual: number | null
}

export function useIncomeBase(transactions: Transaction[], month: MonthKey = currentMonth()): EffectiveBase {
  const manual = useSetting<number | null>('incomeBaseManual', null)
  return useMemo(() => {
    const computed = computeIncomeBase(transactions, month)
    return { ...computed, manual, effective: manual ?? computed.value }
  }, [transactions, month, manual])
}

export interface BudgetLine {
  budget: Budget
  category: Category
  limit: number | null
  spent: number
}

/** Presupuestos del mes con lo gastado en cada categoría. */
export function useBudgetLines(
  budgets: Budget[] | undefined,
  categoryMap: Map<string, Category>,
  transactions: Transaction[],
  month: MonthKey,
  base: number | null,
) {
  return useMemo(() => {
    const spentMap = expenseByCategory(transactions.filter((t) => monthKey(t.date) === month))
    const lines: BudgetLine[] = []
    for (const b of budgets ?? []) {
      const category = categoryMap.get(b.categoryId)
      if (!category || category.archived) continue
      lines.push({ budget: b, category, limit: budgetLimit(b, base), spent: spentMap.get(b.categoryId) ?? 0 })
    }
    lines.sort((a, b) => a.category.order - b.category.order)
    const budgeted = new Set(lines.map((l) => l.category.id))
    const unbudgeted = [...spentMap.entries()]
      .filter(([id]) => !budgeted.has(id) && categoryMap.get(id))
      .map(([id, spent]) => ({ category: categoryMap.get(id)!, spent }))
      .sort((a, b) => b.spent - a.spent)
    const totalLimit = lines.reduce((s, l) => s + (l.limit ?? 0), 0)
    const totalSpent = lines.reduce((s, l) => s + l.spent, 0)
    return { lines, unbudgeted, totalLimit, totalSpent }
  }, [budgets, categoryMap, transactions, month, base])
}

/** Ahorro acumulado de cada meta: saldo de la cuenta vinculada o suma de aportes. */
export function goalSavedMap(
  goals: Goal[],
  entries: GoalEntry[],
  balances: Map<string, number>,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const g of goals) {
    if (g.accountId) map.set(g.id, Math.max(0, balances.get(g.accountId) ?? 0))
    else map.set(g.id, 0)
  }
  for (const e of entries) {
    const g = goals.find((x) => x.id === e.goalId)
    if (g && !g.accountId) map.set(e.goalId, (map.get(e.goalId) ?? 0) + e.amount)
  }
  return map
}
