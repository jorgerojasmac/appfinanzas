import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const spring = { type: 'spring', damping: 34, stiffness: 380, mass: 0.9 } as const

let openSheets = 0
function lockScroll() {
  openSheets++
  document.documentElement.style.overflow = 'hidden'
}
function unlockScroll() {
  openSheets = Math.max(0, openSheets - 1)
  if (openSheets === 0) document.documentElement.style.overflow = ''
}

interface Props {
  open: boolean
  onClose: () => void
  title?: ReactNode
  left?: ReactNode
  right?: ReactNode
  /** 'large' ocupa casi toda la pantalla; 'auto' se ajusta al contenido */
  size?: 'large' | 'auto'
  /** El contenido maneja su propio scroll y layout (ej. teclado numérico fijo) */
  bare?: boolean
  children: ReactNode
}

/**
 * Hoja que sube desde abajo y se cierra deslizando hacia abajo desde la
 * cabecera. Respeta la Dynamic Island (arriba) y el indicador de inicio (abajo).
 */
export function Sheet({ open, onClose, title, left, right, size = 'large', bare, children }: Props) {
  const controls = useDragControls()

  useEffect(() => {
    if (!open) return
    lockScroll()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      unlockScroll()
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose()
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-[var(--backdrop)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[14px] bg-bg shadow-2xl"
            style={{
              height: size === 'large' ? 'calc(100dvh - var(--sat) - 12px)' : undefined,
              maxHeight: 'calc(100dvh - var(--sat) - 12px)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={spring}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.9 }}
            onDragEnd={onDragEnd}
          >
            {/* Cabecera arrastrable */}
            <div
              className="shrink-0 touch-none"
              onPointerDown={(e) => controls.start(e)}
            >
              <div className="flex justify-center pt-1.5 pb-0.5">
                <div className="h-[5px] w-9 rounded-full bg-label-3" />
              </div>
              {(title || left || right) && (
                <div className="grid h-12 grid-cols-[1fr_auto_1fr] items-center px-4">
                  <div className="flex justify-start">{left}</div>
                  <div className="truncate text-center text-[17px] font-semibold">{title}</div>
                  <div className="flex justify-end">{right}</div>
                </div>
              )}
            </div>
            {bare ? (
              children
            ) : (
              <div
                className="flex-1 overflow-y-auto overscroll-contain px-4 pt-2"
                style={{ paddingBottom: 'calc(var(--sab) + 24px)' }}
              >
                {children}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** Botón de texto para la cabecera de una hoja */
export function SheetButton({
  onClick,
  children,
  bold,
  disabled,
  destructive,
}: {
  onClick: () => void
  children: ReactNode
  bold?: boolean
  disabled?: boolean
  destructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`pressable -mx-2 flex h-11 items-center px-2 text-[17px] disabled:opacity-30 ${
        destructive ? 'text-red' : 'text-blue'
      } ${bold ? 'font-semibold' : ''}`}
    >
      {children}
    </button>
  )
}

export interface ActionItem {
  label: string
  destructive?: boolean
  onSelect: () => void
}

/** Hoja de acciones estilo iOS (confirmaciones) */
export function ActionSheet({
  open,
  onClose,
  title,
  message,
  actions,
}: {
  open: boolean
  onClose: () => void
  title?: string
  message?: string
  actions: ActionItem[]
}) {
  useEffect(() => {
    if (!open) return
    lockScroll()
    return unlockScroll
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            className="absolute inset-0 bg-[var(--backdrop)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="absolute inset-x-2 space-y-2"
            style={{ bottom: 'calc(var(--sab) + 8px)' }}
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            exit={{ y: '110%' }}
            transition={spring}
          >
            <div className="grouped material-bar overflow-hidden rounded-[14px] text-center">
              {(title || message) && (
                <div className="px-4 py-3.5">
                  {title && <p className="text-[13px] font-semibold text-label-2">{title}</p>}
                  {message && <p className="mt-0.5 text-[13px] text-label-2">{message}</p>}
                </div>
              )}
              {actions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => {
                    onClose()
                    a.onSelect()
                  }}
                  className={`block h-14 w-full text-[20px] active:bg-fill-2 ${
                    a.destructive ? 'text-red' : 'text-blue'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="block h-14 w-full rounded-[14px] bg-card text-[20px] font-semibold text-blue active:bg-fill-2"
            >
              Cancelar
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
