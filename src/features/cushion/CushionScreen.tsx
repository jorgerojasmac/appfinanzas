import { Card, Group } from '../../components/ui/List'
import { Screen } from '../../components/ui/Screen'
import { useCushion } from '../../hooks/cushion'
import { CUSHION_MONTHS } from '../../domain/cushion'
import { currentMonth, formatMonth } from '../../domain/dates'
import { formatMoney } from '../../domain/money'
import { CushionCard } from './CushionCard'

export function CushionScreen() {
  const advice = useCushion()
  return (
    <Screen title="Fondo colchón" back="Planificación">
      <CushionCard link={false} />
      <Card>
        <p className="text-[15px] font-semibold">¿Cómo funciona?</p>
        <p className="mt-1 text-[14px] leading-[19px] text-label-2">
          Con ingresos irregulares conviene vivir con tu <b className="font-semibold text-label">ingreso base</b>. En los meses en que ganas más, apartas el excedente al colchón; en los meses flojos, usas el colchón para cubrir la diferencia. La meta es tener {CUSHION_MONTHS} meses de ingreso base.
        </p>
      </Card>
      {advice && advice.base != null && (
        <Group header="Últimos meses vs ingreso base" footer={`Ingreso base: ${formatMoney(advice.base)}`}>
          {[...advice.history].reverse().map((h) => (
            <div key={h.month} className="flex min-h-11 items-center gap-3 bg-card px-4 text-[15px]">
              <span className="flex-1">{formatMonth(h.month)}</span>
              <span className="tabular text-label-2">{formatMoney(h.income)}</span>
              {h.month === currentMonth() ? (
                <span className="w-28 text-right text-[13px] text-label-2">En curso</span>
              ) : (
                <span className={`tabular w-28 text-right font-medium ${h.diff != null && h.diff >= 0 ? 'text-green' : 'text-red'}`}>
                  {h.diff != null ? formatMoney(h.diff, { sign: true }) : '—'}
                </span>
              )}
            </div>
          ))}
        </Group>
      )}
    </Screen>
  )
}
