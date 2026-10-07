import type { ColorName } from '../../db/types'
import { colorVar } from './colors'

/** Círculo con la inicial de la persona. */
export function Avatar({ name, color, size = 36 }: { name: string; color: ColorName | undefined; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-rounded font-semibold text-white"
      style={{ width: size, height: size, background: colorVar(color), fontSize: Math.round(size * 0.44) }}
      aria-hidden
    >
      {initial}
    </span>
  )
}
