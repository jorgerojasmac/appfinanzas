import { Check } from 'lucide-react'
import { useState } from 'react'
import { deleteGoal, saveGoal } from '../../db/planning'
import type { Account, ColorName, Goal } from '../../db/types'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { DateRow, MoneyRow, TextRow } from '../../components/ui/Form'
import { Group, Row } from '../../components/ui/List'
import { ActionSheet, Sheet, SheetButton } from '../../components/ui/Sheet'
import { toast } from '../../components/ui/Toast'
import { centsToInput, parseMoney } from '../../domain/money'
import { StyleFields } from '../settings/StyleFields'
import { useOnOpen } from '../../hooks/useOnOpen'

export function GoalSheet({
  open,
  onClose,
  goal,
  savingsAccounts,
}: {
  open: boolean
  onClose: () => void
  goal?: Goal
  savingsAccounts: Account[]
}) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [date, setDate] = useState<string | undefined>()
  const [accountId, setAccountId] = useState<string | undefined>()
  const [icon, setIcon] = useState('Target')
  const [color, setColor] = useState<ColorName>('blue')
  const [confirm, setConfirm] = useState(false)

  useOnOpen(open, () => {
    setName(goal?.name ?? '')
    setTarget(goal ? centsToInput(goal.target) : '')
    setDate(goal?.targetDate)
    setAccountId(goal?.accountId)
    setIcon(goal?.icon ?? 'Target')
    setColor(goal?.color ?? 'blue')
  })

  const valid = name.trim() && parseMoney(target) > 0

  const save = async () => {
    await saveGoal({
      id: goal?.id,
      name: name.trim(),
      target: parseMoney(target),
      targetDate: date,
      accountId,
      icon,
      color,
    })
    toast(goal ? 'Meta actualizada' : 'Meta creada')
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={goal ? 'Editar meta' : 'Nueva meta'}
      left={<SheetButton onClick={onClose}>Cancelar</SheetButton>}
      right={
        <SheetButton onClick={save} bold disabled={!valid}>
          {goal ? 'Guardar' : 'Crear'}
        </SheetButton>
      }
    >
      <div className="space-y-6">
        <div className="flex justify-center pt-2">
          <CategoryIcon icon={icon} color={color} size={72} />
        </div>
        <Group>
          <TextRow label="Nombre" value={name} onChange={setName} placeholder="Ej. Viaje a Japón" />
          <MoneyRow label="Objetivo" value={target} onChange={setTarget} />
          <DateRow label="Fecha objetivo" value={date} onChange={setDate} optional />
        </Group>
        <Group
          header="¿Dónde está el dinero?"
          footer={
            accountId
              ? 'El progreso es el saldo de esa cuenta de ahorro: se actualiza solo con tus transferencias.'
              : 'Registras aportes a mano. Son apartados: el dinero sigue en tus cuentas.'
          }
        >
          <Row
            title="Aportes manuales"
            onClick={() => setAccountId(undefined)}
            value={!accountId ? <Check size={20} strokeWidth={2.5} className="text-blue" /> : undefined}
          />
          {savingsAccounts.map((a) => (
            <Row
              key={a.id}
              icon={<CategoryIcon icon={a.icon} color={a.color} size={30} />}
              inset={58}
              title={a.name}
              onClick={() => setAccountId(a.id)}
              value={accountId === a.id ? <Check size={20} strokeWidth={2.5} className="text-blue" /> : undefined}
            />
          ))}
        </Group>
        <StyleFields icon={icon} color={color} onIcon={setIcon} onColor={setColor} />
        {goal && (
          <Group>
            <Row title="Borrar meta" destructive onClick={() => setConfirm(true)} />
          </Group>
        )}
      </div>
      <ActionSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        message="Se borrará la meta y su historial de aportes. Tus cuentas no cambian."
        actions={[
          {
            label: 'Borrar meta',
            destructive: true,
            onSelect: async () => {
              if (!goal) return
              await deleteGoal(goal.id)
              toast('Meta borrada', 'delete')
              onClose()
            },
          },
        ]}
      />
    </Sheet>
  )
}
