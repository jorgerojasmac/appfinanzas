import { Check } from 'lucide-react'
import type { ColorName } from '../../db/types'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { COLOR_NAMES, colorVar } from '../../components/ui/colors'
import { ICON_NAMES } from '../../components/ui/icons'
import { Group } from '../../components/ui/List'

/** Selector de color y de icono compartido por categorías y cuentas. */
export function StyleFields({
  icon,
  color,
  onIcon,
  onColor,
}: {
  icon: string
  color: ColorName
  onIcon: (v: string) => void
  onColor: (v: ColorName) => void
}) {
  return (
    <>
      <Group header="Color">
        <div className="grid grid-cols-7 gap-2 p-3">
          {COLOR_NAMES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => onColor(c)}
              className="flex aspect-square items-center justify-center rounded-full transition-transform active:scale-90"
              style={{ background: colorVar(c) }}
            >
              {c === color && <Check size={18} strokeWidth={3} className="text-white" />}
            </button>
          ))}
        </div>
      </Group>
      <Group header="Icono">
        <div className="grid grid-cols-6 gap-2 p-3">
          {ICON_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              aria-label={name}
              onClick={() => onIcon(name)}
              className="flex items-center justify-center rounded-full p-0.5 transition-transform active:scale-90"
              style={{ boxShadow: name === icon ? `0 0 0 2px ${colorVar(color)}` : undefined }}
            >
              <CategoryIcon icon={name} color={name === icon ? color : 'gray'} size={40} />
            </button>
          ))}
        </div>
      </Group>
    </>
  )
}
