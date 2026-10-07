import { describe, expect, it } from 'vitest'
import { advance, describeFrequency, dueDates, firstOnOrAfter, monthlyEquivalent } from '../src/domain/recurrence'

const rule = (p: Partial<Parameters<typeof dueDates>[0]> = {}) => ({
  frequency: 'monthly' as const,
  interval: 1,
  anchorDay: 31,
  nextDate: '2026-01-31',
  ...p,
})

describe('recurrence', () => {
  it('el día 31 se ajusta en meses cortos y vuelve a 31', () => {
    expect(advance('2026-01-31', 'monthly', 1, 31)).toBe('2026-02-28')
    expect(advance('2026-02-28', 'monthly', 1, 31)).toBe('2026-03-31')
  })

  it('genera las fechas pendientes hasta hoy y calcula la siguiente', () => {
    const { dates, next } = dueDates(rule(), '2026-04-15')
    expect(dates).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
    expect(next).toBe('2026-04-30')
  })

  it('no genera nada si la fecha es futura', () => {
    expect(dueDates(rule({ nextDate: '2026-05-01' }), '2026-04-15').dates).toEqual([])
  })

  it('respeta la fecha de fin', () => {
    expect(dueDates(rule({ endDate: '2026-02-28' }), '2026-12-31').dates).toEqual(['2026-01-31', '2026-02-28'])
  })

  it('semanal y anual', () => {
    expect(advance('2026-10-05', 'weekly', 1, 5)).toBe('2026-10-12')
    expect(advance('2028-02-29', 'yearly', 1, 29)).toBe('2029-02-28')
  })

  it('reactivar salta las fechas pasadas sin generarlas', () => {
    expect(firstOnOrAfter(rule({ nextDate: '2026-01-31' }), '2026-04-15')).toBe('2026-04-30')
  })

  it('costo mensual equivalente', () => {
    expect(monthlyEquivalent(12000, 'yearly')).toBe(1000)
    expect(monthlyEquivalent(1000, 'weekly')).toBe(4333)
  })

  it('describe la frecuencia en español', () => {
    expect(describeFrequency({ frequency: 'monthly', interval: 1, anchorDay: 1, nextDate: '2026-11-01' })).toBe('Cada mes, el día 1')
    expect(describeFrequency({ frequency: 'weekly', interval: 1, anchorDay: 5, nextDate: '2026-10-05' })).toBe('Cada semana, los lunes')
  })
})
