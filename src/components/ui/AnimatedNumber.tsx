import { animate, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { formatMoney } from '../../domain/money'

/** Monto que "cuenta" hasta su nuevo valor cuando cambia. */
export function AnimatedMoney({
  value,
  className = '',
  sign,
  fromZero = false,
}: {
  value: number
  className?: string
  sign?: boolean
  fromZero?: boolean
}) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(fromZero && !reduce ? 0 : value)
  const prev = useRef(fromZero ? 0 : value)

  useEffect(() => {
    if (reduce) {
      setDisplay(value)
      prev.current = value
      return
    }
    const controls = animate(prev.current, value, {
      duration: 0.7,
      ease: [0.32, 0.72, 0, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
      onComplete: () => setDisplay(value),
    })
    prev.current = value
    return () => controls.stop()
  }, [value, reduce])

  return <span className={`tabular ${className}`}>{formatMoney(display, { sign })}</span>
}
