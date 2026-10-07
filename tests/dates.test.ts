import { describe, expect, it } from 'vitest'
import { addMonths, dateInMonth, formatDate, monthsBetween } from '../src/domain/dates'

describe('dates', () => {
  it('formatea en español', () => {
    expect(formatDate('2026-10-06')).toBe('6 oct 2026')
  })
  it('suma meses cruzando años', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
  })
  it('ajusta días que no existen en el mes', () => {
    expect(dateInMonth('2026-02', 31)).toBe('2026-02-28')
  })
  it('lista meses', () => {
    expect(monthsBetween('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02'])
  })
})
