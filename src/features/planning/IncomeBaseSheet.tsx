import { motion } from 'framer-motion'
import { useState } from 'react'
import { setSetting } from '../../db/repo'
import type { EffectiveBase } from '../../hooks/planning'
import { MoneyRow, ToggleRow } from '../../components/ui/Form'
import { Card, Group } from '../../components/ui/List'
import { Sheet, SheetButton } from '../../components/ui/Sheet'
import { toast } from '../../components/ui/Toast'
import { BASE_LOWEST, BASE_WINDOW } from '../../domain/budgets'
import { formatMonth } from '../../domain/dates'
import { centsToInput, formatMoney, parseMoney } from '../../domain/money'
import { useOnOpen } from '../../hooks/useOnOpen'

/** Explica cómo se calcula el ingreso base y permite definirlo a mano. */
export function IncomeBaseSheet({ open, onClose, base }: { open: boolean; onClose: () => void; base: EffectiveBase }) {
  const [manualOn, setManualOn] = useState(false)
  const [manual, setManual] = useState('')

  useOnOpen(open, () => {
    setManualOn(base.manual != null)
    setManual(base.manual != null ? centsToInput(base.manual) : base.value ? centsToInput(base.value) : '')
  })

  const save = async () => {
    const v = parseMoney(manual)
    await setSetting('incomeBaseManual', manualOn && v > 0 ? v : null)
    toast('Ingreso base actualizado')
    onClose()
  }

  const max = Math.max(...base.months.map((m) => m.income), 1)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ingreso base"
      left={<SheetButton onClick={onClose}>Cancelar</SheetButton>}
      right={
        <SheetButton onClick={save} bold disabled={manualOn && parseMoney(manual) <= 0}>
          Guardar
        </SheetButton>
      }
    >
      <div className="space-y-5">
        <Card className="text-center">
          <p className="text-[15px] text-label-2">Calculado con tus datos</p>
          <p className="tabular font-rounded text-[34px] font-bold">
            {base.value != null ? formatMoney(base.value) : '—'}
          </p>
          <p className="mt-1 text-[13px] leading-[18px] text-label-2">
            {base.value != null
              ? `Promedio de tus ${BASE_LOWEST} meses más bajos de los últimos ${BASE_WINDOW}. Es un ingreso conservador: lo que puedes esperar incluso en un mes flojo.`
              : base.months.length === 0
                ? 'Aún no hay meses completos registrados. Cuando tengas 3 meses de ingresos lo calcularé solo.'
                : `Faltan ${base.missing} ${base.missing === 1 ? 'mes completo' : 'meses completos'} de datos para calcularlo.`}
          </p>
        </Card>

        {base.months.length > 0 && (
          <Group header="Ingresos por mes">
            <div className="space-y-2.5 px-4 py-3">
              {base.months.map((m) => {
                const low = base.lowest.includes(m.month)
                return (
                  <div key={m.month} className="grid grid-cols-[96px_1fr_auto] items-center gap-3 text-[15px]">
                    <span className={low ? 'font-semibold' : 'text-label-2'}>{formatMonth(m.month).replace(/ \d{4}$/, '')}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-fill">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: low ? 'var(--orange)' : 'var(--green)' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(m.income / max) * 100}%` }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                    <span className="tabular text-right">{formatMoney(m.income)}</span>
                  </div>
                )
              })}
              <p className="pt-1 text-[13px] text-label-2">En naranja, los meses usados para el cálculo.</p>
            </div>
          </Group>
        )}

        <Group footer="Útil mientras juntas datos o si conoces un ingreso mínimo seguro (por ejemplo, un contrato fijo).">
          <ToggleRow label="Definir manualmente" checked={manualOn} onChange={setManualOn} />
          {manualOn && <MoneyRow label="Ingreso base" value={manual} onChange={setManual} />}
        </Group>
      </div>
    </Sheet>
  )
}
