import { useEffect, useState } from 'react'
import { removeCategory, saveCategory } from '../../db/repo'
import type { Category, CategoryKind, ColorName } from '../../db/types'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { FieldRow, Segmented } from '../../components/ui/Controls'
import { Group, Row } from '../../components/ui/List'
import { ActionSheet, Sheet, SheetButton } from '../../components/ui/Sheet'
import { toast } from '../../components/ui/Toast'
import { StyleFields } from './StyleFields'

export function CategorySheet({
  open,
  onClose,
  category,
  kind,
}: {
  open: boolean
  onClose: () => void
  category?: Category
  kind: CategoryKind
}) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('ShoppingBag')
  const [color, setColor] = useState<ColorName>('blue')
  const [fixed, setFixed] = useState(false)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(category?.name ?? '')
    setIcon(category?.icon ?? (kind === 'income' ? 'Coins' : 'ShoppingBag'))
    setColor(category?.color ?? 'blue')
    setFixed(category?.fixed ?? false)
  }, [open, category, kind])

  const save = async () => {
    await saveCategory({
      id: category?.id,
      name: name.trim(),
      icon,
      color,
      kind: category?.kind ?? kind,
      fixed: (category?.kind ?? kind) === 'expense' ? fixed : false,
    })
    toast(category ? 'Categoría actualizada' : 'Categoría creada')
    onClose()
  }

  const remove = async () => {
    if (!category) return
    const r = await removeCategory(category.id)
    onClose()
    toast(r === 'deleted' ? 'Categoría borrada' : 'Categoría archivada', 'delete')
  }

  const isExpense = (category?.kind ?? kind) === 'expense'

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={category ? 'Editar categoría' : 'Nueva categoría'}
      left={<SheetButton onClick={onClose}>Cancelar</SheetButton>}
      right={
        <SheetButton onClick={save} bold disabled={!name.trim()}>
          {category ? 'Guardar' : 'Crear'}
        </SheetButton>
      }
    >
      <div className="space-y-6">
        <div className="flex justify-center pt-2">
          <CategoryIcon icon={icon} color={color} size={72} />
        </div>
        <Group>
          <FieldRow label="Nombre">
            <input
              className="w-full bg-transparent text-right text-[17px] text-label-2 outline-none placeholder:text-label-3"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Gimnasio"
            />
          </FieldRow>
        </Group>
        {isExpense && (
          <div>
            <Segmented
              value={fixed ? 'fixed' : 'variable'}
              onChange={(v) => setFixed(v === 'fixed')}
              options={[
                { value: 'variable', label: 'Gasto variable' },
                { value: 'fixed', label: 'Gasto fijo' },
              ]}
            />
            <p className="px-4 pt-1.5 text-[13px] leading-[18px] text-label-2">
              Los gastos fijos (arriendo, servicios, cuotas) se comparan contra tu ingreso base en los indicadores.
            </p>
          </div>
        )}
        <StyleFields icon={icon} color={color} onIcon={setIcon} onColor={setColor} />
        {category && (
          <Group>
            <Row title="Borrar categoría" destructive onClick={() => setConfirm(true)} />
          </Group>
        )}
      </div>
      <ActionSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        message="Si la categoría tiene movimientos se archivará para conservar tu historial."
        actions={[{ label: 'Borrar categoría', destructive: true, onSelect: remove }]}
      />
    </Sheet>
  )
}
