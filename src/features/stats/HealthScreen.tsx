import { Lightbulb } from 'lucide-react'
import {
  Activity, CalendarRange, CreditCard, Gauge, House, PiggyBank, Repeat, Scale, Shield, TrendingUp, type LucideIcon,
} from 'lucide-react'
import { Card, Group } from '../../components/ui/List'
import { Screen } from '../../components/ui/Screen'
import { useHealth } from '../../hooks/health'
import { scoreLabel, type IndicatorId } from '../../domain/health'
import { ScoreRing, StatusBadge, STATUS_COLOR, Tint } from './HealthBits'

const ICON: Record<IndicatorId, LucideIcon> = {
  base: Scale,
  stability: Activity,
  savings: PiggyBank,
  budgets: Gauge,
  fixed: House,
  emergency: Shield,
  cards: CreditCard,
  subscriptions: Repeat,
  trend: TrendingUp,
  projection: CalendarRange,
}

export function HealthScreen() {
  const { report } = useHealth()
  if (!report) return <Screen title="Salud financiera" back="Estadísticas">{null}</Screen>
  const s = report.score != null ? scoreLabel(report.score) : null

  return (
    <Screen title="Salud financiera" back="Estadísticas">
      <Card className="flex flex-col items-center py-6 text-center">
        <ScoreRing score={report.score} size={132} />
        <p className="mt-3 text-[20px] font-semibold" style={{ color: s ? STATUS_COLOR[s.status] : undefined }}>
          {s ? s.label : 'Aún sin puntaje'}
        </p>
        <p className="mt-1 px-4 text-[13px] leading-[18px] text-label-2">
          {report.score != null
            ? 'Puntaje de 0 a 100 que combina tus indicadores, calculado sobre promedios de meses completos.'
            : 'Necesito al menos dos indicadores con datos para darte un puntaje. Sigue registrando tus movimientos.'}
        </p>
      </Card>

      {report.recommendations.length > 0 && (
        <Group header="Recomendaciones">
          {report.recommendations.map((r, i) => (
            <div key={i} className="flex gap-3 bg-card px-4 py-3" style={{ ['--sep-inset' as string]: '52px' }}>
              <Lightbulb size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-yellow" />
              <p className="text-[15px] leading-5">{r}</p>
            </div>
          ))}
        </Group>
      )}

      {report.breakdown.length > 0 && report.score != null && (
        <Group
          header="Cómo se calcula"
          footer="Cada indicador vale de 0 a 100 y pesa según su importancia. Si a uno le faltan datos, su peso se reparte entre los demás."
        >
          {report.breakdown.map((b) => (
            <div key={b.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 bg-card px-4 py-2.5 text-[15px]">
              <span className="truncate">{b.title}</span>
              <span className="tabular text-[13px] text-label-2">
                {b.score}/100 × {b.weight}%
              </span>
              <span className="tabular w-12 text-right font-semibold">{b.points.toFixed(1)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between bg-card px-4 py-2.5 text-[15px] font-semibold">
            <span>Puntaje</span>
            <span className="tabular">{report.score}</span>
          </div>
        </Group>
      )}

      <Group header="Indicadores">
        {report.indicators.map((ind) => {
          const Icon = ICON[ind.id]
          return (
            <div key={ind.id} className="bg-card px-4 py-3" style={{ ['--sep-inset' as string]: '56px' }}>
              <div className="flex items-start gap-3">
                <span
                  className="relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full"
                  style={{ color: STATUS_COLOR[ind.status] }}
                >
                  <Tint color={STATUS_COLOR[ind.status]} />
                  <Icon size={16} strokeWidth={1.75} className="relative" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[15px] font-semibold">{ind.title}</p>
                    <StatusBadge status={ind.status} />
                  </div>
                  {ind.value != null ? (
                    <>
                      <p className="mt-0.5 font-rounded text-[24px] leading-7 font-bold">{ind.value}</p>
                      {ind.detail && <p className="text-[13px] text-label-2">{ind.detail}</p>}
                      <p className="mt-1.5 text-[14px] leading-[19px] text-label-2">{ind.explanation}</p>
                    </>
                  ) : (
                    <>
                      <p className="mt-1 text-[14px] leading-[19px] text-label-2">{ind.explanation}</p>
                      <p className="mt-1.5 rounded-[10px] bg-fill px-3 py-2 text-[13px] leading-[18px] text-label-2">{ind.empty}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </Group>
    </Screen>
  )
}
