import { animate, motion, useMotionValue, type PanInfo } from 'framer-motion'
import { Pencil, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

const ACTION_W = 76

/** Solo una fila abierta a la vez */
let closeOpenRow: (() => void) | null = null

interface Props {
  children: ReactNode
  onEdit?: () => void
  onDelete?: () => void
  /** Sangría del separador superior (ver .grouped) */
  inset?: number
}

/** Fila que revela "Editar" y "Borrar" al deslizar hacia la izquierda. */
export function SwipeRow({ children, onEdit, onDelete, inset = 64 }: Props) {
  const actions = [onEdit, onDelete].filter(Boolean).length
  const width = actions * ACTION_W
  const x = useMotionValue(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const close = () => {
    animate(x, 0, { type: 'spring', stiffness: 500, damping: 40 })
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const prev = closeOpenRow
    if (prev && prev !== close) prev()
    closeOpenRow = close
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const shouldOpen = info.offset.x < -40 || info.velocity.x < -400
    if (shouldOpen && !(open && info.velocity.x > 200)) {
      animate(x, -width, { type: 'spring', stiffness: 500, damping: 40 })
      setOpen(true)
    } else close()
  }

  const run = (fn?: () => void) => {
    close()
    fn?.()
  }

  return (
    <div
      ref={ref}
      className="relative overflow-hidden"
      style={{ '--sep-inset': `${inset}px` } as CSSProperties}
    >
      <div className="absolute inset-y-0 right-0 flex" style={{ width }}>
        {onEdit && (
          <button
            onClick={() => run(onEdit)}
            className="flex h-full flex-1 flex-col items-center justify-center gap-0.5 bg-gray text-[13px] text-white"
          >
            <Pencil size={20} strokeWidth={1.75} />
            Editar
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => run(onDelete)}
            className="flex h-full flex-1 flex-col items-center justify-center gap-0.5 bg-red text-[13px] text-white"
          >
            <Trash2 size={20} strokeWidth={1.75} />
            Borrar
          </button>
        )}
      </div>
      <motion.div
        className="relative bg-card"
        style={{ x }}
        drag={width ? 'x' : false}
        dragDirectionLock
        dragConstraints={{ left: -width, right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
        dragMomentum={false}
        onDragEnd={onDragEnd}
        onClickCapture={(e) => {
          if (open) {
            e.stopPropagation()
            e.preventDefault()
            close()
          }
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}
