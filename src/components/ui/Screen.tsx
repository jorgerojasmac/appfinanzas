import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface Props {
  title: string
  /** Texto pequeño sobre el título grande (por ejemplo la fecha) */
  eyebrow?: string
  /** Muestra "‹ Atrás" y usa título pequeño fijo */
  back?: string | boolean
  right?: ReactNode
  /** Deja espacio para la barra de pestañas */
  tabBar?: boolean
  children: ReactNode
}

/**
 * Pantalla estilo iOS: título grande que se reduce a un título centrado en
 * una barra translúcida al hacer scroll. La barra respeta la Dynamic Island.
 */
export function Screen({ title, eyebrow, back, right, tabBar = true, children }: Props) {
  const navigate = useNavigate()
  const { scrollY } = useScroll()
  const compact = useTransform(scrollY, [28, 44], [0, 1])
  const [scrolled, setScrolled] = useState(false)
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 4))

  const large = !back

  return (
    <div
      className="min-h-dvh"
      style={{
        paddingBottom: tabBar
          ? 'calc(var(--tab-h) + var(--sab) + 96px)'
          : 'calc(var(--sab) + 32px)',
      }}
    >
      {/* Barra de navegación fija */}
      <header
        className="fixed inset-x-0 top-0 z-30"
        style={{ paddingTop: 'var(--sat)' }}
      >
        <motion.div
          className="material-bar hairline-b absolute inset-0"
          style={{ opacity: large ? compact : scrolled ? 1 : 0 }}
        />
        <div
          className="relative grid h-[var(--nav-h)] grid-cols-[1fr_auto_1fr] items-center"
          style={{ paddingLeft: 'calc(8px + var(--sal))', paddingRight: 'calc(16px + var(--sar))' }}
        >
          <div className="flex min-w-0 items-center">
            {back && (
              <button
                onClick={() => navigate(-1)}
                className="pressable -ml-1 flex h-11 items-center pr-2 text-blue"
              >
                <ChevronLeft size={28} strokeWidth={2.25} className="-mr-0.5" />
                <span className="truncate text-[17px]">{typeof back === 'string' ? back : 'Atrás'}</span>
              </button>
            )}
          </div>
          <motion.h2
            className="max-w-[60vw] truncate text-center text-[17px] font-semibold"
            style={{ opacity: large ? compact : 1 }}
          >
            {title}
          </motion.h2>
          <div className="flex items-center justify-end gap-4">{right}</div>
        </div>
      </header>

      <div style={{ paddingTop: 'calc(var(--sat) + var(--nav-h))' }}>
        {large && (
          <div className="px-4 pb-2" style={{ paddingLeft: 'calc(16px + var(--sal))' }}>
            {eyebrow && (
              <p className="text-[13px] font-semibold tracking-wide text-label-2 uppercase">{eyebrow}</p>
            )}
            <h1 className="text-[34px] leading-[41px] font-bold tracking-[0.37px]">{title}</h1>
          </div>
        )}
        <div
          className="space-y-6 pt-2"
          style={{ paddingLeft: 'calc(16px + var(--sal))', paddingRight: 'calc(16px + var(--sar))' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

/** Botón de texto o icono para la barra de navegación */
export function NavButton({
  onClick,
  children,
  label,
}: {
  onClick: () => void
  children: ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="pressable flex h-11 min-w-11 items-center justify-end text-[17px] text-blue"
    >
      {children}
    </button>
  )
}
