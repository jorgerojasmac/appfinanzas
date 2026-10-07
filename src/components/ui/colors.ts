import type { ColorName } from '../../db/types'

export const COLOR_NAMES: ColorName[] = [
  'red', 'orange', 'yellow', 'green', 'mint', 'teal', 'cyan', 'blue', 'indigo', 'purple', 'pink',
  'brown', 'gray',
]

/** Color sólido: var(--blue) */
export const colorVar = (c: ColorName | undefined) => `var(--${c ?? 'gray'})`

/** Fondo suave del círculo detrás del icono */
export const tintVar = (c: ColorName | undefined) =>
  `color-mix(in srgb, var(--${c ?? 'gray'}) var(--tint-alpha), transparent)`
