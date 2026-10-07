import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { useEffect, useMemo, useSyncExternalStore } from 'react'

let current: { id: number; message: string } | null = null
let seq = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Pequeña celebración (al cumplir una meta). */
export function celebrate(message: string) {
  current = { id: ++seq, message }
  emit()
}

const COLORS = ['var(--green)', 'var(--blue)', 'var(--yellow)', 'var(--pink)', 'var(--orange)', 'var(--purple)', 'var(--mint)']

export function ConfettiHost() {
  const c = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!c) return
    const t = setTimeout(() => {
      if (current?.id === c.id) {
        current = null
        emit()
      }
    }, 3200)
    return () => clearTimeout(t)
  }, [c])

  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        i,
        x: (Math.random() - 0.5) * 380,
        y: 380 + Math.random() * 420,
        r: Math.random() * 720 - 360,
        d: 1.6 + Math.random() * 1.2,
        delay: Math.random() * 0.25,
        w: 6 + Math.random() * 6,
        color: COLORS[i % COLORS.length],
        round: Math.random() > 0.6,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [c?.id],
  )

  return (
    <AnimatePresence>
      {c && (
        <motion.div
          key={c.id}
          className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {!reduce &&
            pieces.map((p) => (
              <motion.span
                key={p.i}
                className="absolute top-[28%] left-1/2"
                style={{ width: p.w, height: p.round ? p.w : p.w * 0.45, background: p.color, borderRadius: p.round ? 99 : 2 }}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.4 }}
                animate={{ x: [0, p.x * 0.6, p.x], y: [0, -140 - Math.random() * 80, p.y], rotate: p.r, opacity: [1, 1, 0], scale: 1 }}
                transition={{ duration: p.d, delay: p.delay, ease: 'easeOut' }}
              />
            ))}
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            className="material-bar flex flex-col items-center gap-2 rounded-[22px] px-8 py-6 text-center shadow-xl"
          >
            <Trophy size={40} strokeWidth={1.5} className="text-yellow" />
            <p className="text-[17px] font-semibold">{c.message}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
