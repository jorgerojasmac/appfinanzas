/**
 * Las fechas se guardan como texto local "YYYY-MM-DD" para evitar
 * corrimientos por zona horaria. Los meses se identifican como "YYYY-MM".
 */
export type ISODate = string
export type MonthKey = string

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function todayISO(): ISODate {
  return toISO(new Date())
}

export function monthKey(iso: ISODate): MonthKey {
  return iso.slice(0, 7)
}

export function currentMonth(): MonthKey {
  return monthKey(todayISO())
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = parseISO(iso)
  d.setDate(d.getDate() + days)
  return toISO(d)
}

export function addMonths(month: MonthKey, n: number): MonthKey {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function daysInMonth(month: MonthKey): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function monthRange(month: MonthKey): { start: ISODate; end: ISODate } {
  return { start: `${month}-01`, end: `${month}-${pad(daysInMonth(month))}` }
}

/** Lista de meses desde `from` hasta `to`, ambos incluidos. */
export function monthsBetween(from: MonthKey, to: MonthKey): MonthKey[] {
  const out: MonthKey[] = []
  let m = from
  while (m <= to && out.length < 600) {
    out.push(m)
    m = addMonths(m, 1)
  }
  return out
}

/** Días entre dos fechas (b - a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000)
}

/** Fecha con el día `day` en el mes dado, ajustada si el mes es más corto (31 → 30/28). */
export function dateInMonth(month: MonthKey, day: number): ISODate {
  return `${month}-${pad(Math.min(Math.max(day, 1), daysInMonth(month)))}`
}

const fmtDay = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtDayNoYear = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
const fmtWeekday = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })
const fmtLong = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
const fmtMonth = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' })
const fmtMonthShort = new Intl.DateTimeFormat('es-ES', { month: 'short' })

const clean = (s: string) => s.replace(/\./g, '')
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "6 oct 2026" */
export function formatDate(iso: ISODate): string {
  return clean(fmtDay.format(parseISO(iso)))
}

/** "6 oct" si es del año actual, si no "6 oct 2025" */
export function formatDateShort(iso: ISODate): string {
  const sameYear = iso.slice(0, 4) === todayISO().slice(0, 4)
  return clean((sameYear ? fmtDayNoYear : fmtDay).format(parseISO(iso)))
}

/** "Hoy", "Ayer", "Lunes, 4 oct" */
export function formatDayHeader(iso: ISODate): string {
  const today = todayISO()
  if (iso === today) return 'Hoy'
  if (iso === addDays(today, -1)) return 'Ayer'
  if (iso === addDays(today, 1)) return 'Mañana'
  const sameYear = iso.slice(0, 4) === today.slice(0, 4)
  const text = sameYear ? fmtWeekday.format(parseISO(iso)) : fmtDay.format(parseISO(iso))
  return cap(clean(text))
}

/** "Martes, 6 de octubre" */
export function formatLongToday(): string {
  return cap(fmtLong.format(new Date()))
}

/** "Octubre 2026" */
export function formatMonth(month: MonthKey): string {
  return cap(fmtMonth.format(parseISO(`${month}-01`)).replace(' de ', ' '))
}

/** "oct" */
export function formatMonthShort(month: MonthKey): string {
  return clean(fmtMonthShort.format(parseISO(`${month}-01`)))
}
