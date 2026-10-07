import { motion } from 'framer-motion'
import type { Category } from '../../db/types'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { Sheet, SheetButton } from '../../components/ui/Sheet'

/** Selector de categoría en cuadrícula */
export function CategoryPicker({
  open,
  onClose,
  categories,
  selected,
  onSelect,
  title = 'Categoría',
}: {
  open: boolean
  onClose: () => void
  categories: Category[]
  selected?: string
  onSelect: (id: string) => void
  title?: string
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} right={<SheetButton onClick={onClose}>Listo</SheetButton>}>
      <div className="grid grid-cols-4 gap-x-1 gap-y-3">
        {categories.map((c) => {
          const isSel = c.id === selected
          return (
            <motion.button
              key={c.id}
              whileTap={{ scale: 0.92 }}
              onClick={() => onSelect(c.id)}
              className="flex flex-col items-center gap-1"
            >
              <span className="rounded-full p-[3px]" style={{ boxShadow: isSel ? `0 0 0 2.5px var(--${c.color})` : undefined }}>
                <CategoryIcon icon={c.icon} color={c.color} size={50} solid={isSel} />
              </span>
              <span className={`line-clamp-2 text-center text-[11px] leading-[13px] ${isSel ? 'font-semibold' : 'text-label-2'}`}>{c.name}</span>
            </motion.button>
          )
        })}
        {categories.length === 0 && <p className="col-span-4 py-8 text-center text-label-2">No hay categorías disponibles.</p>}
      </div>
    </Sheet>
  )
}
