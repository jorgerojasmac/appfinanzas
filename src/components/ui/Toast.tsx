import { AnimatePresence, motion } from 'framer-motion'
import { CircleCheck, Trash2 } from 'lucide-react'
import { useEffect, useSyncExternalStore } from 'react'

interface ToastData {
  id: number
  message: string
  kind: 'success' | 'delete'
  action?: { label: string; run: () => void }
}

let current: ToastData | null = null
let seq = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Muestra una confirmación breve bajo la Dynamic Island. */
export function toast(message: string, kind: ToastData['kind'] = 'success', action?: ToastData['action']) {
  current = { id: ++seq, message, kind, action }
  emit()
}

function dismiss(id: number) {
  if (current?.id === id) {
    current = null
    emit()
  }
}

export function ToastHost() {
  const t = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )

  useEffect(() => {
    if (!t) return
    const timer = setTimeout(() => dismiss(t.id), t.action ? 4500 : 1800)
    return () => clearTimeout(timer)
  }, [t])

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-4"
      style={{ top: 'calc(var(--sat) + 6px)' }}
    >
      <AnimatePresence>
        {t && (
          <motion.div
            key={t.id}
            initial={{ y: -24, scale: 0.9, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -16, scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className="pointer-events-auto flex items-center gap-2.5 rounded-full bg-[#1c1c1e]/95 py-2.5 pr-4 pl-3 text-[15px] font-medium text-white shadow-lg ring-1 ring-white/10"
          >
            {t.kind === 'success' ? (
              <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.08, type: 'spring', stiffness: 600, damping: 20 }}>
                <CircleCheck size={20} className="text-[#30d158]" strokeWidth={2.25} />
              </motion.span>
            ) : (
              <Trash2 size={18} className="text-[#ff453a]" strokeWidth={2} />
            )}
            <span>{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.run()
                  dismiss(t.id)
                }}
                className="ml-1 font-semibold text-[#0a84ff]"
              >
                {t.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
