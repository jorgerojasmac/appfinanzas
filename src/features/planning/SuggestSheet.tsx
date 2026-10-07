import { Check } from 'lucide-react'
import { useMemo, useState } from 'react'
import { applyBudgets } from '../../db/planning'
import type { Budget, Category, Transaction } from '../../db/types'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { Segmented } from '../../components/ui/Controls'
import { Group } from '../../components/ui/List'
import { Sheet, SheetButton } from '../../components/ui/Sheet'
import { toast } from '../../components/ui/Toast'
import { SUGGEST_SAVINGS, suggestBudgets } from '../../domain/budgets'
import { formatMoney } from '../../domain/money'
import { useOnOpen } from '../../hooks/useOnOpen'

export function SuggestSheet({
  open,
  onClose,
  transactions,
  categories,
  budgets,
  base,
}: {
  open: boolean
  onClose: () => void
  transactions: Transaction[]
  categories: Category[]
  budgets: Budget[]
  base: number | null
}) {
  const suggestions = useMemo(() => suggestBudgets(transactions, categories, base), [transactions, categories, base])
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const existing = useMemo(() => new Set(budgets.map((b) => b.categoryId)), [budgets])
  const [mode, setMode] = useState<Budget['mode']>('fixed')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useOnOpen(open, () => {
    // Por defecto se marcan las categorías que aún no tienen presupuesto
    setSelected(new Set(suggestions.filter((s) => !existing.has(s.categoryId)).map((s) => s.categoryId)))
    setMode(base ? 'percent' : 'fixed')
  })

  const total = suggestions.filter((s) => selected.has(s.categoryId)).reduce((a, s) => a + s.suggested, 0)

  const apply = async () => {
    await applyBudgets(
      suggestions
        .filter((s) => selected.has(s.categoryId))
        .map((s) => ({
          categoryId: s.categoryId,
          mode,
          amount: mode === 'fixed' ? s.suggested : undefined,
          percent: mode === 'percent' ? s.percent ?? 0 : undefined,
        })),
    )
    toast(`${selected.size} presupuestos aplicados`)
    onClose()
  }

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Sugerencias"
      left={<SheetButton onClick={onClose}>Cancelar</SheetButton>}
      right={
        <SheetButton onClick={apply} bold disabled={selected.size === 0}>
          Aplicar
        </SheetButton>
      }
    >
      {suggestions.length === 0 ? (
        <p className="px-4 py-10 text-center text-[15px] text-label-2">
          Necesito al menos un mes completo de gastos para sugerirte presupuestos.
        </p>
      ) : (
        <div className="space-y-5">
          <p className="px-1 text-[15px] leading-5 text-label-2">
            Basado en tu gasto promedio de los últimos 3 meses. Si una categoría ya tiene presupuesto, marcarla lo reemplaza.
            {base
              ? ` Los gastos variables se ajustan para que el total no pase del ${Math.round((1 - SUGGEST_SAVINGS) * 100)}% de tu ingreso base (${formatMoney(base)}) y puedas ahorrar al menos un ${Math.round(SUGGEST_SAVINGS * 100)}%.`
              : ' Cuando tengas 3 meses de datos también se ajustarán a tu ingreso base.'}
          </p>
          {base && (
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: 'percent', label: '% del ingreso base' },
                { value: 'fixed', label: 'Monto fijo' },
              ]}
            />
          )}
          <Group
            footer={
              <span className="tabular">
                Total seleccionado: {formatMoney(total)}
                {base ? ` · ${Math.round((total / base) * 100)}% del ingreso base` : ''}
              </span>
            }
          >
            {suggestions.map((s) => {
              const c = catMap.get(s.categoryId)!
              const on = selected.has(s.categoryId)
              return (
                <button
                  key={s.categoryId}
                  onClick={() => toggle(s.categoryId)}
                  className="flex min-h-[60px] w-full items-center gap-3 bg-card px-4 py-2 text-left active:bg-fill-2"
                  style={{ ['--sep-inset' as string]: '64px' }}
                >
                  <CategoryIcon icon={c.icon} color={c.color} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[17px]">{c.name}</div>
                    <div className="tabular text-[13px] text-label-2">
                      Prom. {formatMoney(s.average)}
                      {existing.has(s.categoryId) && ' · ya tiene'}
                    </div>
                  </div>
                  <div className="tabular text-right">
                    <div className="text-[17px]">{formatMoney(s.suggested)}</div>
                    {s.percent != null && <div className="text-[13px] text-label-2">{s.percent}%</div>}
                  </div>
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] ${on ? 'border-blue bg-blue text-white' : 'border-label-3'}`}
                  >
                    {on && <Check size={15} strokeWidth={3} />}
                  </span>
                </button>
              )
            })}
          </Group>
        </div>
      )}
    </Sheet>
  )
}
