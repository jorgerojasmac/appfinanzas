import { useEffect, useState } from 'react'

const TOKENS = [
  'red', 'orange', 'yellow', 'green', 'mint', 'teal', 'cyan', 'blue', 'indigo', 'purple', 'pink', 'brown', 'gray',
  'label', 'label-2', 'label-3', 'separator', 'fill', 'card', 'bg',
] as const

export type ThemeColors = Record<(typeof TOKENS)[number], string>

function read(): ThemeColors {
  const cs = getComputedStyle(document.documentElement)
  const out = {} as ThemeColors
  for (const t of TOKENS) out[t] = cs.getPropertyValue(`--${t}`).trim()
  return out
}

/**
 * Colores resueltos del tema actual. Recharts usa atributos SVG, donde las
 * variables CSS no siempre funcionan; se vuelven a leer al cambiar claro/oscuro.
 */
export function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState(read)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setColors(read())
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return colors
}
