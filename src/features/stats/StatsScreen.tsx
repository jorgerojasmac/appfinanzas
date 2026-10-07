import { ChartPie, ChevronLeft, ChevronRight, ChevronRight as Chevron, Hash } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { txFilters } from '../../app/filterStore'
import { EMPTY_FILTERS, spendByTag } from '../../domain/filters'
import { MonthCloseLink } from '../monthClose/MonthCloseSheet'
import { useMemo, useState } from 'react'
import { ChartCard, ChartEmpty } from '../../components/charts/ChartTooltip'
import {
  CategoryDonut,
  CumulativeChart,
  IncomeExpenseBars,
  IncomeVariabilityChart,
  NetWorthChart,
  SpendHeatmap,
} from '../../components/charts/Charts'
import { Segmented } from '../../components/ui/Controls'
import { EmptyState } from '../../components/ui/Controls'
import { Screen } from '../../components/ui/Screen'
import { useLedger, useSetting } from '../../hooks/data'
import { computeIncomeBase } from '../../domain/budgets'
import { addMonths, currentMonth, formatMonth, monthsBetween, todayISO } from '../../domain/dates'
import { totals, totalsByMonth } from '../../domain/ledger'
import { formatMoney } from '../../domain/money'
import {
  categorySlices,
  cumulativeByDay,
  inPeriod,
  incomeVariability,
  makePeriod,
  netWorthSeries,
  shiftPeriod,
  spendByDate,
  weeksBetween,
  type PeriodKind,
} from '../../domain/stats'
import { HealthCard } from './HealthCard'

export function StatsScreen() {
  const navigate = useNavigate()
  const { ready, transactions, categories, accounts } = useLedger()
  const manualBase = useSetting<number | null>('incomeBaseManual', null)
  const [period, setPeriod] = useState(() => makePeriod('month', currentMonth()))
  const now = currentMonth()
  const today = todayISO()
  const atLatest = period.months[period.months.length - 1] >= now

  const data = useMemo(() => {
    const inP = transactions.filter((t) => inPeriod(t, period))
    // Último mes del período que no sea futuro: referencia para gráficos mensuales
    const refMonth = period.anchor > now ? now : period.anchor
    const barMonths = period.kind === 'month' ? monthsBetween(addMonths(refMonth, -5), refMonth) : period.months.filter((m) => m <= now)
    const byMonth = totalsByMonth(transactions, barMonths)
    const last12 = monthsBetween(addMonths(refMonth, -11), refMonth)
    const incomeByMonth = totalsByMonth(transactions, last12)
    // Solo meses completos con datos para la variabilidad
    const firstDate = transactions.reduce<string | null>((a, t) => (!a || t.date < a ? t.date : a), null)
    const varMonths = last12.filter((m) => m < now && firstDate && m >= firstDate.slice(0, 7))
    const variability = incomeVariability(varMonths.map((m) => incomeByMonth.get(m)?.income ?? 0))
    const nwMonths = period.kind === 'year' ? period.months.filter((m) => m <= now) : last12
    return {
      t: totals(inP),
      tags: spendByTag(inP),
      slices: categorySlices(inP, categories),
      bars: barMonths.map((m) => ({ month: m, income: byMonth.get(m)?.income ?? 0, expense: byMonth.get(m)?.expense ?? 0 })),
      refMonth,
      cumCurrent: cumulativeByDay(transactions, refMonth, today),
      cumPrev: cumulativeByDay(transactions, addMonths(refMonth, -1), today),
      heat: spendByDate(transactions, period.start, period.end),
      weeks: weeksBetween(period.start, period.end),
      variability,
      varData: varMonths.map((m) => ({ month: m, income: incomeByMonth.get(m)?.income ?? 0 })),
      netWorth: netWorthSeries(accounts, transactions, nwMonths, today),
      base: manualBase ?? computeIncomeBase(transactions, now).value,
    }
  }, [transactions, categories, accounts, period, now, today, manualBase])

  if (!ready) return <Screen title="Estadísticas">{null}</Screen>

  if (transactions.length === 0) {
    return (
      <Screen title="Estadísticas">
        <EmptyState
          icon={<ChartPie size={28} strokeWidth={1.5} />}
          title="Aún no hay estadísticas"
          message="Cuando registres ingresos y gastos verás aquí en qué se va tu dinero, cómo varían tus ingresos y cómo crece tu patrimonio."
        />
      </Screen>
    )
  }

  const { t } = data
  const rate = t.income > 0 ? t.net / t.income : null
  const lastNW = data.netWorth[data.netWorth.length - 1]
  const firstNW = data.netWorth[0]

  return (
    <Screen title="Estadísticas">
      {/* Filtros: una sola fila arriba de todos los gráficos */}
      <div className="space-y-2">
        <Segmented<PeriodKind>
          value={period.kind}
          onChange={(k) => setPeriod(makePeriod(k, now))}
          options={[
            { value: 'month', label: 'Mes' },
            { value: 'quarter', label: 'Trimestre' },
            { value: 'year', label: 'Año' },
          ]}
        />
        <div className="flex items-center justify-between rounded-[12px] bg-card px-1">
          <button onClick={() => setPeriod(shiftPeriod(period, -1))} aria-label="Período anterior" className="pressable flex h-11 w-11 items-center justify-center text-blue">
            <ChevronLeft size={24} strokeWidth={2} />
          </button>
          <span className="text-[17px] font-semibold">{period.label}</span>
          <button
            onClick={() => setPeriod(shiftPeriod(period, 1))}
            disabled={atLatest}
            aria-label="Período siguiente"
            className="pressable flex h-11 w-11 items-center justify-center text-blue disabled:opacity-25"
          >
            <ChevronRight size={24} strokeWidth={2} />
          </button>
        </div>
      </div>

      <HealthCard />
      <MonthCloseLink />

      {/* Resumen del período */}
      <div className="grid grid-cols-2 gap-3">
        <Tile label="Ingresos" value={formatMoney(t.income)} tone="text-green" />
        <Tile label="Gastos" value={formatMoney(t.expense)} />
        <Tile label="Ahorro" value={formatMoney(t.net, { sign: t.net > 0 })} tone={t.net < 0 ? 'text-red' : ''} />
        <Tile label="Tasa de ahorro" value={rate == null ? '—' : `${Math.round(rate * 100)}%`} tone={rate != null && rate < 0 ? 'text-red' : ''} />
      </div>

      <ChartCard title="Gasto por categoría" subtitle={`${period.label} · solo tu parte de los gastos compartidos`}>
        {data.slices.total > 0 ? <CategoryDonut slices={data.slices.slices} total={data.slices.total} /> : <ChartEmpty>No hay gastos en este período.</ChartEmpty>}
      </ChartCard>

      <ChartCard title="Ingresos vs gastos" subtitle={period.kind === 'month' ? 'Últimos 6 meses' : period.label}>
        {data.bars.some((b) => b.income || b.expense) ? <IncomeExpenseBars data={data.bars} /> : <ChartEmpty>Sin movimientos en estos meses.</ChartEmpty>}
      </ChartCard>

      <ChartCard
        title="Gasto acumulado"
        subtitle={`${formatMonth(data.refMonth)} comparado con ${formatMonth(addMonths(data.refMonth, -1)).toLowerCase()}`}
      >
        <CumulativeChart
          current={data.cumCurrent}
          previous={data.cumPrev}
          currentLabel={formatMonth(data.refMonth).split(' ')[0]}
          previousLabel={formatMonth(addMonths(data.refMonth, -1)).split(' ')[0]}
        />
      </ChartCard>

      <ChartCard title="Gasto por día" subtitle={`${period.label} · más intenso = más gasto`}>
        <SpendHeatmap
          weeks={data.weeks}
          values={data.heat}
          start={period.start}
          end={period.end}
          calendar={period.kind === 'month'}
          months={period.kind === 'year' ? period.months : undefined}
        />
      </ChartCard>

      <ChartCard title="Gasto por etiqueta" subtitle={`${period.label} · toca una para ver sus movimientos`}>
        {data.tags.length ? (
          <ul className="-mx-1">
            {data.tags.slice(0, 8).map((tg) => (
              <li key={tg.tag}>
                <button
                  onClick={() => {
                    txFilters.replace({ ...EMPTY_FILTERS, tags: [tg.tag], from: period.start, to: period.end })
                    navigate('/movimientos')
                  }}
                  className="flex min-h-11 w-full items-center gap-2 rounded-[10px] px-1 text-left active:bg-fill"
                >
                  <Hash size={16} strokeWidth={2} className="text-blue" />
                  <span className="flex-1 truncate text-[15px]">{tg.tag}</span>
                  <span className="text-[13px] text-label-2">
                    {tg.count} {tg.count === 1 ? 'gasto' : 'gastos'}
                  </span>
                  <span className="tabular w-24 text-right text-[15px] font-medium">{formatMoney(tg.total)}</span>
                  <Chevron size={16} className="text-label-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ChartEmpty>Aún no usas etiquetas en este período. Agrégalas al registrar un gasto con el botón #.</ChartEmpty>
        )}
      </ChartCard>

      <ChartCard
        title="Variabilidad de ingresos"
        subtitle={
          data.variability.cv != null
            ? `Tus ingresos varían ±${Math.round(data.variability.cv * 100)}% respecto al promedio`
            : 'Meses completos de los últimos 12'
        }
      >
        {data.varData.length >= 2 ? (
          <IncomeVariabilityChart data={data.varData} mean={data.variability.mean} base={data.base} />
        ) : (
          <ChartEmpty>Necesito al menos 2 meses completos de ingresos para mostrar cómo varían.</ChartEmpty>
        )}
      </ChartCard>

      <ChartCard
        title="Patrimonio neto"
        subtitle={
          lastNW && firstNW
            ? `${formatMoney(lastNW.net)} · ${lastNW.net - firstNW.net >= 0 ? 'subió' : 'bajó'} ${formatMoney(Math.abs(lastNW.net - firstNW.net))} en el período`
            : undefined
        }
      >
        {data.netWorth.length >= 2 ? <NetWorthChart data={data.netWorth} /> : <ChartEmpty>Necesito al menos dos meses para mostrar la evolución.</ChartEmpty>}
        <p className="mt-2 text-[13px] leading-[18px] text-label-2">Saldos de tus cuentas y ahorros menos la deuda de tus tarjetas, al cierre de cada mes.</p>
      </ChartCard>
    </Screen>
  )
}

function Tile({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-[14px] bg-card px-4 py-3">
      <p className="text-[13px] text-label-2">{label}</p>
      <p className={`mt-0.5 text-[20px] font-semibold ${tone}`}>{value}</p>
    </div>
  )
}
