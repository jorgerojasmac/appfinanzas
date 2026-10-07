import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ConfettiHost } from '../components/ui/Confetti'
import { toast, ToastHost } from '../components/ui/Toast'
import { runRecurring } from '../db/planning'
import { BudgetsScreen } from '../features/planning/BudgetsScreen'
import { GoalsScreen } from '../features/planning/GoalsScreen'
import { GoalWatcher } from '../features/planning/GoalWatcher'
import { PlanningScreen } from '../features/planning/PlanningScreen'
import { CardsScreen } from '../features/cards/CardsScreen'
import { SharedScreen } from '../features/shared/SharedScreen'
import { CushionScreen } from '../features/cushion/CushionScreen'
import { SettleSheet } from '../features/shared/SettleSheet'
import { PeopleProvider } from './PeopleContext'
import { LockScreen } from '../features/lock/LockScreen'
import { MonthCloseSheet } from '../features/monthClose/MonthCloseSheet'
import { RecurringScreen } from '../features/planning/RecurringScreen'
import { SubscriptionsScreen } from '../features/planning/SubscriptionsScreen'
import { AccountDetailScreen } from '../features/accounts/AccountDetailScreen'
import { HomeScreen } from '../features/home/HomeScreen'
import { AccountsScreen } from '../features/settings/AccountsScreen'
import { CategoriesScreen } from '../features/settings/CategoriesScreen'
import { SettingsScreen } from '../features/settings/SettingsScreen'
import { TransactionSheet } from '../features/transactions/TransactionSheet'
import { TransactionsScreen } from '../features/transactions/TransactionsScreen'
import { AddButton, TabBar } from './TabBar'

// Las pantallas con gráficos se cargan aparte para que la app arranque más rápido
const StatsScreen = lazy(() => import('../features/stats/StatsScreen').then((m) => ({ default: m.StatsScreen })))
const HealthScreen = lazy(() => import('../features/stats/HealthScreen').then((m) => ({ default: m.HealthScreen })))
const Lazy = ({ children }: { children: ReactNode }) => <Suspense fallback={<div className="min-h-dvh" />}>{children}</Suspense>

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
          <Route path="/estadisticas" element={<Lazy><StatsScreen /></Lazy>} />
          <Route path="/estadisticas/salud" element={<Lazy><HealthScreen /></Lazy>} />
          <Route path="/planificacion" element={<PlanningScreen />} />
          <Route path="/planificacion/presupuestos" element={<BudgetsScreen />} />
          <Route path="/planificacion/metas" element={<GoalsScreen />} />
          <Route path="/planificacion/suscripciones" element={<SubscriptionsScreen />} />
          <Route path="/planificacion/recurrentes" element={<RecurringScreen />} />
          <Route path="/planificacion/tarjetas" element={<CardsScreen />} />
          <Route path="/planificacion/compartidos" element={<SharedScreen />} />
          <Route path="/planificacion/colchon" element={<CushionScreen />} />
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

/** Registra recurrentes y suscripciones vencidos al abrir la app y al volver a ella. */
function useRecurringRunner() {
  useEffect(() => {
    const run = () => {
      runRecurring().then((n) => {
        if (n > 0) toast(n === 1 ? '1 movimiento recurrente registrado' : `${n} movimientos recurrentes registrados`)
      })
    }
    run()
    const onVisible = () => document.visibilityState === 'visible' && run()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])
}

export function App() {
  useRecurringRunner()
  return (
    <MotionConfig reducedMotion="user">
      <PeopleProvider>
      <HashRouter>
        <AnimatedRoutes />
        <TabBar />
        <AddButton />
        <TransactionSheet />
        <SettleSheet />
        <ToastHost />
        <ConfettiHost />
        <MonthCloseSheet />
        <LockScreen />
        <GoalWatcher />
        <DevIphoneOverlay />
      </HashRouter>
      </PeopleProvider>
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
