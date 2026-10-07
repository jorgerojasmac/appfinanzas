import type { ColorName } from '../../db/types'
import { colorVar, tintVar } from './colors'
import { getIcon } from './icons'

interface Props {
  icon: string | undefined
  color: ColorName | undefined
  size?: number
  solid?: boolean
}

/** Icono de lucide dentro de un círculo con el color de la categoría o cuenta. */
export function CategoryIcon({ icon, color, size = 36, solid = false }: Props) {
  const Icon = getIcon(icon)
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: solid ? colorVar(color) : tintVar(color),
        color: solid ? '#fff' : colorVar(color),
      }}
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={1.75} />
    </span>
  )
}
