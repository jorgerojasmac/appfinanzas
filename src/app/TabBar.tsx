import { motion } from 'framer-motion'
import { ArrowLeftRight, ChartPie, House, Plus, Settings, Target } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { ui } from './uiStore'

const TABS = [
  { to: '/', label: 'Inicio', Icon: House },
  { to: '/movimientos', label: 'Movimientos', Icon: ArrowLeftRight },
  { to: '/estadisticas', label: 'Estadísticas', Icon: ChartPie },
  { to: '/planificacion', label: 'Planificación', Icon: Target },
  { to: '/ajustes', label: 'Ajustes', Icon: Settings },
]

/** Barra de pestañas translúcida; se apoya sobre el indicador de inicio. */
export function TabBar() {
  return (
    <nav
      className="material-bar hairline-t fixed inset-x-0 bottom-0 z-40"
      style={{ paddingBottom: 'var(--sab)', paddingLeft: 'var(--sal)', paddingRight: 'var(--sar)' }}
    >
      <div className="flex h-[var(--tab-h)]">
        {TABS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            replace
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-[3px] pt-1 ${isActive ? 'text-blue' : 'text-gray'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={24} strokeWidth={isActive ? 2.1 : 1.6} />
                <span className="text-[10px] leading-3 font-medium tracking-[0.1px]">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

/** Botón flotante "+" para registrar un movimiento (en Inicio y Movimientos). */
export function AddButton() {
  const { pathname } = useLocation()
  const visible = pathname === '/' || pathname === '/movimientos' || pathname.startsWith('/cuentas/')
  const accountId = pathname.startsWith('/cuentas/') ? pathname.split('/')[2] : undefined
  return (
    <motion.button
      aria-label="Nuevo movimiento"
      onClick={() => ui.openNewTx({ accountId })}
      initial={false}
      animate={{ scale: visible ? 1 : 0, opacity: visible ? 1 : 0 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue text-white shadow-[0_6px_20px_rgba(0,122,255,0.4)]"
      style={{
        right: 'calc(20px + var(--sar))',
        bottom: 'calc(var(--tab-h) + var(--sab) + 16px)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <Plus size={30} strokeWidth={2.25} />
    </motion.button>
  )
}
