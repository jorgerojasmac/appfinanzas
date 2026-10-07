import { ArrowDownRight, ArrowUpRight, CalendarCheck, ChevronRight, Trophy, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useLock } from '../../app/lockStore'
import { setSetting } from '../../db/repo'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { Card } from '../../components/ui/List'
import { Sheet, SheetButton } from '../../components/ui/Sheet'
import { useBudgets, useLedger, useRules, useSetting, useSettingLoaded } from '../../hooks/data'
import { addMonths, currentMonth, formatMonth, type MonthKey } from '../../domain/dates'
import { buildMonthClose, pendingMonthClose } from '../../domain/monthClose'
import { formatMoney } from '../../domain/money'

// Permite abrir el resumen desde otras pantallas
let requested: MonthKey | null = null
const listeners = new Set<() => void>()
export function openMonthClose(month: MonthKey) {
  requested = month
  listeners.forEach((l) => l())
}
function useRequested() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => requested,
  )
}

/** Resumen del mes anterior: se muestra solo una vez al comenzar un mes nuevo. */
export function MonthCloseSheet() {
  const { ready, transactions, accounts, categories, categoryMap } = useLedger()
  const budgets = useBudgets()
  const rules = useRules()
  const manualBase = useSetting<number | null>('incomeBaseManual', null)
  const lastSeen = useSettingLoaded<MonthKey>('lastMonthCloseSeen')
  const { locked, decided } = useLock()
  const req = useRequested()
  const [auto, setAuto] = useState<MonthKey | null>(null)

  // Abrir automáticamente una vez, con la app desbloqueada
  useEffect(() => {
    if (!ready || !decided || locked || lastSeen === undefined || auto) return
    const pending = pendingMonthClose(transactions, currentMonth(), lastSeen)
    if (pending) {
      const t = setTimeout(() => setAuto(pending), 900)
      return () => clearTimeout(t)
    }
  }, [ready, decided, locked, lastSeen, transactions, auto])

  const month = req ?? auto
  const data = useMemo(() => {
    if (!month || !budgets || !rules) return null
    return buildMonthClose({ transactions, accounts, budgets, categories, rules, manualBase }, month)
  }, [month, transactions, accounts, budgets, categories, rules, manualBase])

  const close = () => {
    if (auto) setSetting('lastMonthCloseSeen', auto)
    setAuto(null)
    requested = null
    listeners.forEach((l) => l())
  }

  const name = month ? formatMonth(month).split(' ')[0] : ''
  const grewCat = data?.grew ? categoryMap.get(data.grew.categoryId) : undefined
  const delta = data && data.score != null && data.prevScore != null ? data.score - data.prevScore : null

  return (
    <Sheet open={!!data} onClose={close} title={`Cierre de ${name.toLowerCase()}`} right={<SheetButton onClick={close} bold>Listo</SheetButton>}>
      {data && (
        <div className="space-y-4">
          <div className="flex flex-col items-center pt-2 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue/12 text-blue">
              <CalendarCheck size={28} strokeWidth={1.75} />
            </span>
            <p className="mt-2 text-[15px] text-label-2">{data.net >= 0 ? `Ahorraste en ${name.toLowerCase()}` : `Resultado de ${name.toLowerCase()}`}</p>
            <p className={`font-rounded text-[40px] leading-[48px] font-bold ${data.net < 0 ? 'text-red' : ''}`}>{formatMoney(data.net, { sign: data.net > 0 })}</p>
            {data.savingsRate != null && <p className="text-[15px] text-label-2">{Math.round(data.savingsRate * 100)}% de tus ingresos</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <p className="text-[13px] text-label-2">Ingresos</p>
              <p className="text-[20px] font-semibold text-green">{formatMoney(data.income)}</p>
            </Card>
            <Card>
              <p className="text-[13px] text-label-2">Gastos</p>
              <p className="text-[20px] font-semibold">{formatMoney(data.expense)}</p>
            </Card>
          </div>

          <Card className={`flex items-start gap-3 ${data.highlight.kind === 'achievement' ? '' : ''}`}>
            {data.highlight.kind === 'achievement' ? (
              <Trophy size={24} strokeWidth={1.75} className="shrink-0 text-yellow" />
            ) : (
              <TriangleAlert size={24} strokeWidth={1.75} className="shrink-0 text-orange" />
            )}
            <div>
              <p className="text-[13px] font-semibold text-label-2 uppercase">{data.highlight.kind === 'achievement' ? 'Logro del mes' : 'Para tener en cuenta'}</p>
              <p className="mt-0.5 text-[15px] leading-5">{data.highlight.text}</p>
            </div>
          </Card>

          {data.score != null && (
            <Card className="flex items-center justify-between">
              <div>
                <p className="text-[13px] text-label-2">Puntaje de salud financiera</p>
                <p className="text-[20px] font-semibold">
                  {data.prevScore != null && <span className="text-label-2">{data.prevScore} → </span>}
                  {data.score}
                </p>
              </div>
              {delta != null && delta !== 0 && (
                <span className={`flex items-center gap-0.5 text-[17px] font-semibold ${delta > 0 ? 'text-green' : 'text-red'}`}>
                  {delta > 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                  {delta > 0 ? `+${delta}` : delta}
                </span>
              )}
              {delta === 0 && <span className="text-[15px] text-label-2">Sin cambios</span>}
            </Card>
          )}

          {data.grew && grewCat && (
            <Card className="flex items-center gap-3">
              <CategoryIcon icon={grewCat.icon} color={grewCat.color} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-label-2">Categoría que más creció</p>
                <p className="truncate text-[17px] font-semibold">{grewCat.name}</p>
              </div>
              <div className="tabular text-right">
                <p className="text-[15px] font-semibold text-red">+{formatMoney(data.grew.to - data.grew.from)}</p>
                <p className="text-[12px] text-label-2">
                  {formatMoney(data.grew.from)} → {formatMoney(data.grew.to)}
                </p>
              </div>
            </Card>
          )}
        </div>
      )}
    </Sheet>
  )
}

/** Fila para volver a ver el cierre del mes anterior (en Estadísticas). */
export function MonthCloseLink() {
  const { transactions } = useLedger()
  const prev = addMonths(currentMonth(), -1)
  if (!transactions.some((t) => t.date.startsWith(prev))) return null
  return (
    <button onClick={() => openMonthClose(prev)} className="flex w-full items-center gap-3 rounded-[12px] bg-card px-4 py-3 text-left active:bg-fill-2">
      <CalendarCheck size={22} strokeWidth={1.75} className="text-blue" />
      <span className="flex-1 text-[17px]">Cierre de {formatMonth(prev).split(' ')[0].toLowerCase()}</span>
      <ChevronRight size={18} strokeWidth={2.25} className="text-label-3" />
    </button>
  )
}
