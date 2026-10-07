import { useState } from 'react'
import { removePerson, savePerson } from '../../db/repo'
import type { ColorName, Person } from '../../db/types'
import { Avatar } from '../../components/ui/Avatar'
import { COLOR_NAMES, colorVar } from '../../components/ui/colors'
import { TextRow } from '../../components/ui/Form'
import { Group, Row } from '../../components/ui/List'
import { ActionSheet, Sheet, SheetButton } from '../../components/ui/Sheet'
import { toast } from '../../components/ui/Toast'
import { useOnOpen } from '../../hooks/useOnOpen'
import { Check } from 'lucide-react'

export function PersonSheet({ open, onClose, person, count }: { open: boolean; onClose: () => void; person?: Person; count: number }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<ColorName>('orange')
  const [confirm, setConfirm] = useState(false)

  useOnOpen(open, () => {
    setName(person?.name ?? '')
    setColor(person?.color ?? COLOR_NAMES[(count * 3 + 1) % COLOR_NAMES.length])
  })

  const save = async () => {
    await savePerson({ id: person?.id, name: name.trim(), color })
    toast(person ? 'Persona actualizada' : 'Persona agregada')
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="auto"
      title={person ? 'Editar persona' : 'Nueva persona'}
      left={<SheetButton onClick={onClose}>Cancelar</SheetButton>}
      right={
        <SheetButton onClick={save} bold disabled={!name.trim()}>
          {person ? 'Guardar' : 'Agregar'}
        </SheetButton>
      }
    >
      <div className="space-y-6">
        <div className="flex justify-center pt-2">
          <Avatar name={name || '?'} color={color} size={72} />
        </div>
        <Group>
          <TextRow label="Nombre" value={name} onChange={setName} placeholder="Ej. Ana" />
        </Group>
        <Group header="Color">
          <div className="grid grid-cols-7 gap-2 p-3">
            {COLOR_NAMES.map((c) => (
              <button
                key={c}
                aria-label={c}
                onClick={() => setColor(c)}
                className="flex aspect-square items-center justify-center rounded-full active:scale-90"
                style={{ background: colorVar(c) }}
              >
                {c === color && <Check size={18} strokeWidth={3} className="text-white" />}
              </button>
            ))}
          </div>
        </Group>
        {person && (
          <Group>
            <Row title="Eliminar persona" destructive onClick={() => setConfirm(true)} />
          </Group>
        )}
      </div>
      <ActionSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        message="Si tiene gastos compartidos registrados, se archivará para conservar el historial."
        actions={[
          {
            label: 'Eliminar',
            destructive: true,
            onSelect: async () => {
              if (!person) return
              const r = await removePerson(person.id)
              toast(r === 'deleted' ? 'Persona eliminada' : 'Persona archivada', 'delete')
              onClose()
            },
          },
        ]}
      />
    </Sheet>
  )
}
