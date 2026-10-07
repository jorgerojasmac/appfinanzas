import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { CalendarRange, ChartPie } from 'lucide-react'
import { useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ToastHost } from '../components/ui/Toast'
import { AccountDetailScreen } from '../features/accounts/AccountDetailScreen'
import { HomeScreen } from '../features/home/HomeScreen'
import { Placeholder } from '../features/Placeholder'
import { AccountsScreen } from '../features/settings/AccountsScreen'
import { CategoriesScreen } from '../features/settings/CategoriesScreen'
import { SettingsScreen } from '../features/settings/SettingsScreen'
import { TransactionSheet } from '../features/transactions/TransactionSheet'
import { TransactionsScreen } from '../features/transactions/TransactionsScreen'
import { AddButton, TabBar } from './TabBar'

const TAB_ROOTS = ['/', '/movimientos', '/estadisticas', '/planificacion', '/ajustes']

function AnimatedRoutes() {
  const location = useLocation()
  const isRoot = TAB_ROOTS.includes(location.pathname)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.main
        key={location.pathname}
        initial={isRoot ? { opacity: 0 } : { x: '30%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: isRoot ? 0.18 : 0.32, ease: [0.32, 0.72, 0, 1] }}
      >
        <Routes location={location}>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/movimientos" element={<TransactionsScreen />} />
          <Route
            path="/estadisticas"
            element={
              <Placeholder
                title="Estadísticas"
                icon={<ChartPie size={28} strokeWidth={1.5} />}
                message="Gráficos de gasto por categoría, ingresos vs gastos, patrimonio y tu puntaje de salud financiera llegan en la fase 4."
              />
            }
          />
          <Route
            path="/planificacion"
            element={
              <Placeholder
                title="Planificación"
                icon={<CalendarRange size={28} strokeWidth={1.5} />}
                message="Presupuestos, metas, recurrentes y suscripciones llegan en la fase 2; tarjetas y gastos compartidos en la fase 3."
              />
            }
          />
          <Route path="/ajustes" element={<SettingsScreen />} />
          <Route path="/ajustes/categorias" element={<CategoriesScreen />} />
          <Route path="/ajustes/cuentas" element={<AccountsScreen />} />
          <Route path="/cuentas/:id" element={<AccountDetailScreen />} />
          <Route path="*" element={<HomeScreen />} />
        </Routes>
      </motion.main>
    </AnimatePresence>
  )
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <AnimatedRoutes />
        <TabBar />
        <AddButton />
        <TransactionSheet />
        <ToastHost />
        <DevIphoneOverlay />
      </HashRouter>
    </MotionConfig>
  )
}

/** En desarrollo (?sim=1) dibuja la Dynamic Island y el indicador de inicio del iPhone 15 Pro. */
function DevIphoneOverlay() {
  if (!import.meta.env.DEV || !document.documentElement.classList.contains('sim-iphone')) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[100]">
      <div className="absolute top-[11px] left-1/2 h-[37px] w-[126px] -translate-x-1/2 rounded-full bg-black" />
      <div className="absolute top-[18px] left-[34px] text-[17px] font-semibold text-label">9:41</div>
      <div className="absolute bottom-[8px] left-1/2 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-label" />
    </div>
  )
}
