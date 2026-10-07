import { ArrowLeftRight, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { txFilters, useTxFilters } from '../../app/filterStore'
import { ui } from '../../app/uiStore'
import { EmptyState, PrimaryButton } from '../../components/ui/Controls'
import { NavButton, Screen } from '../../components/ui/Screen'
import { useLedger } from '../../hooks/data'
import { formatDateShort } from '../../domain/dates'
import { activeFilterCount, filterTransactions, type TxFilters } from '../../domain/filters'
import { totals } from '../../domain/ledger'
import { formatMoney } from '../../domain/money'
import { FilterSheet } from './FilterSheet'
import { TransactionList } from './TransactionList'

const TYPE_LABEL: Record<string, string> = { expense: 'Gastos', income: 'Ingresos', transfer: 'Transferencias', settlement: 'Saldos' }

export function TransactionsScreen() {
  const { ready, transactions, categories, accounts, categoryMap, accountMap } = useLedger()
  const filters = useTxFilters()
  const [sheet, setSheet] = useState(false)
  const count = activeFilterCount(filters)
  const filtering = count > 0 || filters.text.trim() !== ''

  const list = useMemo(
    () => (filtering ? filterTransactions(transactions, filters, categoryMap, accountMap) : transactions),
    [filtering, transactions, filters, categoryMap, accountMap],
  )
  const sum = useMemo(() => totals(list), [list])
  const chips = filterChips(filters, categoryMap, accountMap)

  return (
    <Screen
      title="Movimientos"
      right={
        <NavButton label="Filtros" onClick={() => setSheet(true)}>
          <span className="relative">
            <SlidersHorizontal size={22} strokeWidth={1.75} />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue px-1 text-[10px] font-semibold text-white">
                {count}
              </span>
            )}
          </span>
        </NavButton>
      }
    >
      {/* Barra de búsqueda estilo iOS */}
      <div className="-mt-1 space-y-2">
        <label className="flex h-9 items-center gap-1.5 rounded-[10px] bg-fill px-2 text-label-2">
          <Search size={17} strokeWidth={2} className="shrink-0" />
          <input
            type="search"
            value={filters.text}
            onChange={(e) => txFilters.set({ text: e.target.value })}
            placeholder="Buscar nota, categoría, #etiqueta, monto"
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent text-[17px] text-label outline-none placeholder:text-label-2 [&::-webkit-search-cancel-button]:hidden"
          />
          {filters.text && (
            <button onClick={() => txFilters.set({ text: '' })} aria-label="Borrar búsqueda" className="flex h-5 w-5 items-center justify-center rounded-full bg-label-3 text-card">
              <X size={13} strokeWidth={3} />
            </button>
          )}
        </label>
        {chips.length > 0 && (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {chips.map((c) => (
              <button
                key={c.key}
                onClick={() => txFilters.set(c.clear)}
                className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-blue/12 pr-2 pl-3 text-[14px] text-blue"
              >
                {c.label}
                <X size={14} strokeWidth={2.5} />
              </button>
            ))}
            <button onClick={() => txFilters.reset()} className="h-8 shrink-0 px-2 text-[14px] text-blue">
              Quitar todo
            </button>
          </div>
        )}
      </div>

      {filtering && (
        <div className="flex items-baseline justify-between px-1 text-[13px] text-label-2">
          <span>
            {list.length} {list.length === 1 ? 'movimiento' : 'movimientos'}
          </span>
          <span className="tabular">
            {sum.expense > 0 && `Gastos ${formatMoney(sum.expense)}`}
            {sum.expense > 0 && sum.income > 0 && ' · '}
            {sum.income > 0 && `Ingresos ${formatMoney(sum.income)}`}
          </span>
        </div>
      )}

      {ready && transactions.length === 0 && (
        <EmptyState
          icon={<ArrowLeftRight size={28} strokeWidth={1.5} />}
          title="Sin movimientos"
          message="Aquí verás tus ingresos, gastos y transferencias agrupados por día. Desliza uno hacia la izquierda para editarlo o borrarlo."
          action={
            <PrimaryButton onClick={() => ui.openNewTx()}>
              <span className="flex items-center gap-1.5">
                <Plus size={20} /> Registrar movimiento
              </span>
            </PrimaryButton>
          }
        />
      )}
      {ready && transactions.length > 0 && list.length === 0 && (
        <EmptyState
          icon={<Search size={28} strokeWidth={1.5} />}
          title="Sin resultados"
          message="Ningún movimiento coincide con la búsqueda o los filtros."
          action={<PrimaryButton tone="plain" onClick={() => txFilters.reset()}>Quitar filtros</PrimaryButton>}
        />
      )}
      <TransactionList transactions={list} categoryMap={categoryMap} accountMap={accountMap} />

      <FilterSheet
        open={sheet}
        onClose={() => setSheet(false)}
        current={filters}
        categories={categories}
        accounts={accounts}
        transactions={transactions}
      />
    </Screen>
  )
}

/** Chips de filtros activos, cada uno sabe cómo quitarse. */
function filterChips(f: TxFilters, cats: Map<string, { name: string }>, accts: Map<string, { name: string }>) {
  const out: Array<{ key: string; label: string; clear: Partial<TxFilters> }> = []
  if (f.types.length) out.push({ key: 'types', label: f.types.map((t) => TYPE_LABEL[t]).join(', '), clear: { types: [] } })
  if (f.tags.length) out.push({ key: 'tags', label: f.tags.map((t) => `#${t}`).join(' '), clear: { tags: [] } })
  if (f.categoryIds.length)
    out.push({
      key: 'cats',
      label: f.categoryIds.length === 1 ? cats.get(f.categoryIds[0])?.name ?? 'Categoría' : `${f.categoryIds.length} categorías`,
      clear: { categoryIds: [] },
    })
  if (f.accountIds.length)
    out.push({
      key: 'accts',
      label: f.accountIds.length === 1 ? accts.get(f.accountIds[0])?.name ?? 'Cuenta' : `${f.accountIds.length} cuentas`,
      clear: { accountIds: [] },
    })
  if (f.from || f.to)
    out.push({
      key: 'dates',
      label: f.from && f.to ? `${formatDateShort(f.from)} – ${formatDateShort(f.to)}` : f.from ? `Desde ${formatDateShort(f.from)}` : `Hasta ${formatDateShort(f.to!)}`,
      clear: { from: undefined, to: undefined },
    })
  if (f.minAmount != null || f.maxAmount != null)
    out.push({
      key: 'amount',
      label:
        f.minAmount != null && f.maxAmount != null
          ? `${formatMoney(f.minAmount)} – ${formatMoney(f.maxAmount)}`
          : f.minAmount != null
            ? `≥ ${formatMoney(f.minAmount)}`
            : `≤ ${formatMoney(f.maxAmount!)}`,
      clear: { minAmount: undefined, maxAmount: undefined },
    })
  return out
}
