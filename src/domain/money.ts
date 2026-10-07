/**
 * Todos los montos se guardan como centavos enteros (123456 = $1,234.56)
 * para evitar errores de punto flotante.
 */
export type Cents = number

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** $1,234.56 · -$1,234.56 */
export function formatMoney(cents: Cents, opts: { sign?: boolean } = {}): string {
  const value = usd.format(Math.abs(cents) / 100)
  if (cents < 0) return `-${value}`
  if (opts.sign && cents > 0) return `+${value}`
  return value
}

/** $1.2K — para ejes de gráficos */
export function formatMoneyCompact(cents: Cents): string {
  return usdCompact.format(cents / 100)
}

/** Convierte lo que el usuario escribió ("12.5", "1,234.56") a centavos. */
export function parseMoney(input: string): Cents {
  const clean = input.replace(/[^0-9.-]/g, '')
  if (!clean || clean === '.' || clean === '-') return 0
  const n = Number(clean)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

/** Centavos → texto editable sin símbolo ("1234.5"). */
export function centsToInput(cents: Cents): string {
  if (!cents) return ''
  const abs = Math.abs(cents)
  const units = Math.floor(abs / 100)
  const dec = abs % 100
  if (dec === 0) return String(units)
  return `${units}.${String(dec).padStart(2, '0').replace(/0$/, '')}`
}

export function sumCents(values: Cents[]): Cents {
  return values.reduce((a, b) => a + b, 0)
}

/** Reparte un total en partes que suman exactamente el total (sin perder centavos). */
export function splitEvenly(total: Cents, parts: number): Cents[] {
  if (parts <= 0) return []
  const base = Math.trunc(total / parts)
  let rest = total - base * parts
  return Array.from({ length: parts }, () => {
    if (rest > 0) {
      rest--
      return base + 1
    }
    return base
  })
}
