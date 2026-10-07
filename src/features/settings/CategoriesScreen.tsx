import { Plus } from 'lucide-react'
import { useState } from 'react'
import type { Category, CategoryKind } from '../../db/types'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { Segmented } from '../../components/ui/Controls'
import { Group, Row } from '../../components/ui/List'
import { NavButton, Screen } from '../../components/ui/Screen'
import { useCategories } from '../../hooks/data'
import { CategorySheet } from './CategorySheet'

export function CategoriesScreen() {
  const categories = useCategories() ?? []
  const [kind, setKind] = useState<CategoryKind>('expense')
  const [sheet, setSheet] = useState<{ open: boolean; category?: Category }>({ open: false })
  const list = categories.filter((c) => c.kind === kind)

  return (
    <Screen
      title="Categorías"
      back="Ajustes"
      tabBar
      right={
        <NavButton label="Nueva categoría" onClick={() => setSheet({ open: true })}>
          <Plus size={26} strokeWidth={2} />
        </NavButton>
      }
    >
      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          { value: 'expense', label: 'Gastos' },
          { value: 'income', label: 'Ingresos' },
        ]}
      />
      <Group footer={kind === 'expense' ? 'Toca una categoría para cambiar su nombre, icono, color o si es un gasto fijo o variable.' : undefined}>
        {list.map((c) => (
          <Row
            key={c.id}
            icon={<CategoryIcon icon={c.icon} color={c.color} />}
            title={c.name}
            value={kind === 'expense' ? <span className="text-[15px] text-label-2">{c.fixed ? 'Fijo' : 'Variable'}</span> : undefined}
            chevron
            onClick={() => setSheet({ open: true, category: c })}
          />
        ))}
      </Group>
      <CategorySheet open={sheet.open} category={sheet.category} kind={kind} onClose={() => setSheet((s) => ({ ...s, open: false }))} />
    </Screen>
  )
}
