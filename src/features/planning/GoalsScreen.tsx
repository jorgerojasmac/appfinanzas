import { Plus, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Goal } from '../../db/types'
import { EmptyState, PrimaryButton } from '../../components/ui/Controls'
import { Group } from '../../components/ui/List'
import { NavButton, Screen } from '../../components/ui/Screen'
import { useGoalEntries, useGoals, useLedger } from '../../hooks/data'
import { goalSavedMap } from '../../hooks/planning'
import { GoalRow } from './GoalCard'
import { GoalDetailSheet } from './GoalDetailSheet'
import { GoalSheet } from './GoalSheet'

export function GoalsScreen() {
  const goals = useGoals() ?? []
  const entries = useGoalEntries() ?? []
  const { accounts, balances, accountMap } = useLedger()
  const saved = useMemo(() => goalSavedMap(goals, entries, balances), [goals, entries, balances])
  const [detailId, setDetailId] = useState<string>()
  const [edit, setEdit] = useState<{ open: boolean; goal?: Goal }>({ open: false })

  const active = goals.filter((g) => !g.completedAt)
  const done = goals.filter((g) => g.completedAt)
  const detail = goals.find((g) => g.id === detailId)
  const savingsAccounts = accounts.filter((a) => !a.archived && a.type === 'savings')

  return (
    <Screen
      title="Metas"
      back="Planificación"
      right={
        <NavButton label="Nueva meta" onClick={() => setEdit({ open: true })}>
          <Plus size={26} strokeWidth={2} />
        </NavButton>
      }
    >
      {goals.length === 0 ? (
        <EmptyState
          icon={<Target size={28} strokeWidth={1.5} />}
          title="Sin metas de ahorro"
          message="Crea una meta con un monto objetivo y una fecha. Te diré cuánto apartar cada mes para llegar a tiempo."
          action={<PrimaryButton onClick={() => setEdit({ open: true })}>Crear meta</PrimaryButton>}
        />
      ) : (
        <>
          {active.length > 0 && (
            <Group header="En progreso">
              {active.map((g) => (
                <GoalRow key={g.id} goal={g} saved={saved.get(g.id) ?? 0} onClick={() => setDetailId(g.id)} />
              ))}
            </Group>
          )}
          {done.length > 0 && (
            <Group header="Cumplidas">
              {done.map((g) => (
                <GoalRow key={g.id} goal={g} saved={saved.get(g.id) ?? 0} onClick={() => setDetailId(g.id)} />
              ))}
            </Group>
          )}
        </>
      )}

      <GoalDetailSheet
        open={!!detail && !edit.open}
        onClose={() => setDetailId(undefined)}
        goal={detail}
        saved={detail ? saved.get(detail.id) ?? 0 : 0}
        entries={entries.filter((e) => e.goalId === detailId)}
        account={detail?.accountId ? accountMap.get(detail.accountId) : undefined}
        onEdit={() => setEdit({ open: true, goal: detail })}
      />
      <GoalSheet
        open={edit.open}
        goal={edit.goal}
        savingsAccounts={savingsAccounts}
        onClose={() => {
          setEdit((e) => ({ ...e, open: false }))
          if (edit.goal && !goals.some((g) => g.id === edit.goal!.id)) setDetailId(undefined)
        }}
      />
    </Screen>
  )
}
