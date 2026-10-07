import { describe, expect, it } from 'vitest'
import { centsToInput, formatMoney, parseMoney, splitEvenly } from '../src/domain/money'

describe('money', () => {
  it('formatea en USD', () => {
    expect(formatMoney(123456)).toBe('$1,234.56')
    expect(formatMoney(-5)).toBe('-$0.05')
    expect(formatMoney(100, { sign: true })).toBe('+$1.00')
    expect(formatMoney(0)).toBe('$0.00')
  })

  it('convierte texto a centavos sin errores de redondeo', () => {
    expect(parseMoney('0.1')).toBe(10)
    expect(parseMoney('1,234.56')).toBe(123456)
    expect(parseMoney('19.99')).toBe(1999)
    expect(parseMoney('')).toBe(0)
    expect(parseMoney('.')).toBe(0)
  })

  it('centavos a texto editable', () => {
    expect(centsToInput(1250)).toBe('12.5')
    expect(centsToInput(1205)).toBe('12.05')
    expect(centsToInput(1200)).toBe('12')
    expect(centsToInput(0)).toBe('')
  })

  it('reparte sin perder centavos', () => {
    expect(splitEvenly(1000, 3)).toEqual([334, 333, 333])
    expect(splitEvenly(1000, 3).reduce((a, b) => a + b)).toBe(1000)
  })
})
