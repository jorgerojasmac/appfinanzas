import { Minus, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { addGoalEntry, deleteGoalEntry } from '../../db/planning'
import type { Account, Goal, GoalEntry } from '../../db/types'
import { AnimatedMoney } from '../../components/ui/AnimatedNumber'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { Segmented } from '../../components/ui/Controls'
import { MoneyRow } from '../../components/ui/Form'
import { Card, Group } from '../../components/ui/List'
import { ProgressRing } from '../../components/ui/Progress'
import { Sheet, SheetButton } from '../../components/ui/Sheet'
import { toast } from '../../components/ui/Toast'
import { formatDate, formatDateShort, todayISO } from '../../domain/dates'
import { goalProgress } from '../../domain/goals'
import { formatMoney, parseMoney } from '../../domain/money'
import { useOnOpen } from '../../hooks/useOnOpen'

export function GoalDetailSheet({
  open,
  onClose,
  goal,
  saved,
  entries,
  account,
  onEdit,
}: {
  open: boolean
  onClose: () => void
  goal?: Goal
  saved: number
  entries: GoalEntry[]
  account?: Account
  onEdit: () => void
}) {
  const [dir, setDir] = useState<'in' | 'out'>('in')
  const [amount, setAmount] = useState('')

  useOnOpen(open, () => {
      setAmount('')
      setDir('in')
  })

  if (!goal) return null
  const p = goalProgress(goal, saved)
  const color = `var(--${goal.color})`

  const add = async () => {
    const cents = parseMoney(amount)
    if (cents <= 0) return
    await addGoalEntry({ goalId: goal.id, amount: dir === 'in' ? cents : -cents, date: todayISO(), note: '' })
    setAmount('')
    toast(dir === 'in' ? 'Aporte registrado' : 'Retiro registrado')
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={goal.name}
      left={<SheetButton onClick={onClose}>Cerrar</SheetButton>}
      right={
        <SheetButton onClick={onEdit}>
          <Pencil size={20} strokeWidth={1.75} aria-label="Editar meta" />
        </SheetButton>
      }
    >
      <div className="space-y-5">
        <Card className="flex flex-col items-center py-6 text-center">
          <ProgressRing ratio={p.ratio} color={color} size={150} stroke={14}>
            <CategoryIcon icon={goal.icon} color={goal.color} size={60} />
          </ProgressRing>
          <AnimatedMoney value={p.saved} className="mt-4 font-rounded text-[34px] font-bold" />
          <p className="tabular text-[15px] text-label-2">
            de {formatMoney(goal.target)} · {Math.round(p.ratio * 100)}%
          </p>
          <p className="mt-2 px-4 text-[13px] leading-[18px] text-label-2">
            {p.done
              ? '¡Meta cumplida! 🎉'
              : p.perMonth != null
                ? p.overdue
                  ? `La fecha objetivo (${formatDate(goal.targetDate!)}) ya pasó. Te faltan ${formatMoney(p.remaining)}.`
                  : `Para llegar al ${formatDate(goal.targetDate!)} aparta ${formatMoney(p.perMonth)} al mes.`
                : `Te faltan ${formatMoney(p.remaining)}.`}
          </p>
        </Card>

        {account ? (
          <p className="px-4 text-[13px] leading-[18px] text-label-2">
            Vinculada a <b className="font-semibold text-label">{account.name}</b>: el progreso es el saldo de esa cuenta. Para aportar, registra una transferencia hacia ella.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              <Segmented
                value={dir}
                onChange={setDir}
                options={[
                  { value: 'in', label: 'Aportar' },
                  { value: 'out', label: 'Retirar' },
                ]}
              />
              <Group>
                <MoneyRow label={dir === 'in' ? 'Aporte' : 'Retiro'} value={amount} onChange={setAmount} />
              </Group>
              <button
                onClick={add}
                disabled={parseMoney(amount) <= 0}
                className="pressable flex h-[50px] w-full items-center justify-center gap-1.5 rounded-[12px] text-[17px] font-semibold text-white disabled:opacity-40"
                style={{ background: color }}
              >
                {dir === 'in' ? <Plus size={20} /> : <Minus size={20} />}
                {dir === 'in' ? 'Aportar' : 'Retirar'}
              </button>
            </div>

            {entries.length > 0 && (
              <Group header="Historial">
                {[...entries]
                  .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1))
                  .map((e) => (
                    <div key={e.id} className="flex min-h-11 items-center gap-3 bg-card px-4">
                      <span className="flex-1 text-[15px] text-label-2">{formatDateShort(e.date)}</span>
                      <span className={`tabular text-[17px] ${e.amount >= 0 ? 'text-green' : ''}`}>
                        {formatMoney(e.amount, { sign: true })}
                      </span>
                      <button
                        aria-label="Borrar aporte"
                        onClick={() => deleteGoalEntry(e.id)}
                        className="pressable -mr-2 flex h-11 w-9 items-center justify-center text-label-3"
                      >
                        <Trash2 size={17} strokeWidth={1.75} />
                      </button>
                    </div>
                  ))}
              </Group>
            )}
          </>
        )}
      </div>
    </Sheet>
  )
}
