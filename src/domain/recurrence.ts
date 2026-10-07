/** Cálculo de fechas de movimientos recurrentes y suscripciones (lógica pura). */
import type { Frequency, RecurringRule } from '../db/types'
import { addDays, addMonths, dateInMonth, monthKey, type ISODate } from './dates'
import type { Cents } from './money'

type RuleDates = Pick<RecurringRule, 'frequency' | 'interval' | 'anchorDay' | 'nextDate' | 'endDate'>

/** Máximo de movimientos que se generan de una vez (por si la fecha quedó muy atrás). */
export const MAX_CATCH_UP = 36

/** Siguiente fecha después de `date` según la frecuencia. */
export function advance(date: ISODate, frequency: Frequency, interval: number, anchorDay: number): ISODate {
  const n = Math.max(1, interval)
  if (frequency === 'weekly') return addDays(date, 7 * n)
  const months = frequency === 'monthly' ? n : 12 * n
  return dateInMonth(addMonths(monthKey(date), months), anchorDay)
}

/** Fechas pendientes desde `nextDate` hasta `today` (incluido). */
export function dueDates(rule: RuleDates, today: ISODate): { dates: ISODate[]; next: ISODate } {
  const dates: ISODate[] = []
  let d = rule.nextDate
  while (d <= today && (!rule.endDate || d <= rule.endDate) && dates.length < MAX_CATCH_UP) {
    dates.push(d)
    d = advance(d, rule.frequency, rule.interval, rule.anchorDay)
  }
  return { dates, next: d }
}

/** Primera fecha de la regla que cae hoy o después (para reactivar sin generar atrasados). */
export function firstOnOrAfter(rule: RuleDates, today: ISODate): ISODate {
  let d = rule.nextDate
  for (let i = 0; d < today && i < 1000; i++) d = advance(d, rule.frequency, rule.interval, rule.anchorDay)
  return d
}

/** Próximas `count` fechas a partir de `nextDate`. */
export function upcoming(rule: RuleDates, count: number): ISODate[] {
  const out: ISODate[] = []
  let d = rule.nextDate
  while (out.length < count && (!rule.endDate || d <= rule.endDate)) {
    out.push(d)
    d = advance(d, rule.frequency, rule.interval, rule.anchorDay)
  }
  return out
}

/** Costo mensual equivalente. */
export function monthlyEquivalent(amount: Cents, frequency: Frequency, interval = 1): Cents {
  const n = Math.max(1, interval)
  if (frequency === 'weekly') return Math.round((amount * 52) / 12 / n)
  if (frequency === 'monthly') return Math.round(amount / n)
  return Math.round(amount / 12 / n)
}

export function yearlyEquivalent(amount: Cents, frequency: Frequency, interval = 1): Cents {
  const n = Math.max(1, interval)
  if (frequency === 'weekly') return Math.round((amount * 52) / n)
  if (frequency === 'monthly') return Math.round((amount * 12) / n)
  return Math.round(amount / n)
}

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** "Cada mes, el día 1" · "Cada semana, los lunes" · "Cada año, el 14 de marzo" */
export function describeFrequency(rule: Pick<RecurringRule, 'frequency' | 'interval' | 'anchorDay' | 'nextDate'>): string {
  const n = Math.max(1, rule.interval)
  const [y, m, d] = rule.nextDate.split('-').map(Number)
  if (rule.frequency === 'weekly') {
    const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()]
    return n === 1 ? `Cada semana, los ${wd}` : `Cada ${n} semanas, los ${wd}`
  }
  if (rule.frequency === 'monthly') return n === 1 ? `Cada mes, el día ${rule.anchorDay}` : `Cada ${n} meses, el día ${rule.anchorDay}`
  return n === 1 ? `Cada año, el ${rule.anchorDay} de ${MONTHS[m - 1]}` : `Cada ${n} años, el ${rule.anchorDay} de ${MONTHS[m - 1]}`
}
