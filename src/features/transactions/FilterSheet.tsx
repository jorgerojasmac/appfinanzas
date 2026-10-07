import { Check } from 'lucide-react'
import { useMemo, useState } from 'react'
import { txFilters } from '../../app/filterStore'
import type { Account, Category, Transaction, TxType } from '../../db/types'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { DateRow, MoneyRow } from '../../components/ui/Form'
import { Group } from '../../components/ui/List'
import { Sheet, SheetButton } from '../../components/ui/Sheet'
import { useOnOpen } from '../../hooks/useOnOpen'
import { EMPTY_FILTERS, tagUsage, type TxFilters } from '../../domain/filters'
import { centsToInput, parseMoney } from '../../domain/money'

const TYPES: Array<{ value: TxType; label: string }> = [
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Ingresos' },
  { value: 'transfer', label: 'Transferencias' },
  { value: 'settlement', label: 'Saldos con personas' },
]

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-[15px] transition-colors ${on ? 'bg-blue text-white' : 'bg-card'}`}
    >
      {on && <Check size={14} strokeWidth={2.5} />}
      {children}
    </button>
  )
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

export function FilterSheet({
  open,
  onClose,
  current,
  categories,
  accounts,
  transactions,
}: {
  open: boolean
  onClose: () => void
  current: TxFilters
  categories: Category[]
  accounts: Account[]
  transactions: Transaction[]
}) {
  const [f, setF] = useState<TxFilters>(EMPTY_FILTERS)
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const tags = useMemo(() => tagUsage(transactions), [transactions])

  useOnOpen(open, () => {
    setF(current)
    setMin(current.minAmount != null ? centsToInput(current.minAmount) : '')
    setMax(current.maxAmount != null ? centsToInput(current.maxAmount) : '')
  })

  const apply = () => {
    txFilters.replace({
      ...f,
      text: current.text,
      minAmount: min ? parseMoney(min) : undefined,
      maxAmount: max ? parseMoney(max) : undefined,
    })
    onClose()
  }

  const clear = () => {
    setF({ ...EMPTY_FILTERS, text: current.text })
    setMin('')
    setMax('')
  }

  const activeCats = categories.filter((c) => !c.archived)
  const activeAccounts = accounts.filter((a) => !a.archived)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filtros"
      left={<SheetButton onClick={clear}>Limpiar</SheetButton>}
      right={
        <SheetButton onClick={apply} bold>
          Aplicar
        </SheetButton>
      }
    >
      <div className="space-y-6">
        <Section title="Tipo">
          {TYPES.map((t) => (
            <Chip key={t.value} on={f.types.includes(t.value)} onClick={() => setF({ ...f, types: toggle(f.types, t.value) })}>
              {t.label}
            </Chip>
          ))}
        </Section>

        <Group header="Fechas">
          <DateRow label="Desde" value={f.from} onChange={(v) => setF({ ...f, from: v })} optional />
          <DateRow label="Hasta" value={f.to} onChange={(v) => setF({ ...f, to: v })} optional />
        </Group>

        <Group header="Monto" footer="En gastos compartidos se compara tu parte.">
          <MoneyRow label="Mínimo" value={min} onChange={setMin} />
          <MoneyRow label="Máximo" value={max} onChange={setMax} />
        </Group>

        {tags.length > 0 && (
          <Section title="Etiquetas">
            {tags.map(({ tag }) => (
              <Chip key={tag} on={f.tags.includes(tag)} onClick={() => setF({ ...f, tags: toggle(f.tags, tag) })}>
                #{tag}
              </Chip>
            ))}
          </Section>
        )}

        <Section title="Cuentas">
          {activeAccounts.map((a) => (
            <Chip key={a.id} on={f.accountIds.includes(a.id)} onClick={() => setF({ ...f, accountIds: toggle(f.accountIds, a.id) })}>
              {a.name}
            </Chip>
          ))}
        </Section>

        <Section title="Categorías">
          {activeCats.map((c) => (
            <button
              key={c.id}
              onClick={() => setF({ ...f, categoryIds: toggle(f.categoryIds, c.id) })}
              className={`flex h-9 items-center gap-1.5 rounded-full pr-3 pl-1 text-[15px] transition-colors ${f.categoryIds.includes(c.id) ? 'bg-blue text-white' : 'bg-card'}`}
            >
              <CategoryIcon icon={c.icon} color={c.color} size={28} solid={f.categoryIds.includes(c.id)} />
              {c.name}
            </button>
          ))}
        </Section>
      </div>
    </Sheet>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="px-4 pb-1.5 text-[13px] text-label-2 uppercase">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  )
}
