import { motion } from 'framer-motion'
import { ArrowDown, ArrowLeftRight, Calendar, ChevronDown, Hash, Trash2, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { personName, usePeopleMap } from '../../app/PeopleContext'
import { ui, useUI } from '../../app/uiStore'
import { Avatar } from '../../components/ui/Avatar'
import { buildSplit, draftFromSplit, ME, type SplitDraft } from '../../domain/shared'
import { SplitSheet } from '../shared/SplitSheet'
import { TagSheet } from '../tags/TagSheet'
import { deleteTransaction, getSetting, restoreTransaction, saveTransaction } from '../../db/repo'
import type { Account, Category, TxType } from '../../db/types'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { Segmented } from '../../components/ui/Controls'
import { applyKey, NumPad } from '../../components/ui/NumPad'
import { Sheet, SheetButton } from '../../components/ui/Sheet'
import { toast } from '../../components/ui/Toast'
import { useLedger, usePeople } from '../../hooks/data'
import { addDays, formatDateShort, todayISO } from '../../domain/dates'
import { centsToInput, formatMoney, parseMoney } from '../../domain/money'
import { AccountPicker } from '../accounts/AccountPicker'

type Kind = Exclude<TxType, 'settlement'>

const TITLES: Record<Kind, [string, string]> = {
  expense: ['Nuevo gasto', 'Editar gasto'],
  income: ['Nuevo ingreso', 'Editar ingreso'],
  transfer: ['Nueva transferencia', 'Editar transferencia'],
}

const TONE: Record<Kind, string> = {
  expense: 'var(--label)',
  income: 'var(--green)',
  transfer: 'var(--blue)',
}

/** Hoja global para registrar o editar un movimiento en pocos toques. */
export function TransactionSheet() {
  const { txSheet } = useUI()
  return <TransactionSheetInner key={txSheet.edit?.id ?? 'new'} />
}

function TransactionSheetInner() {
  const { txSheet } = useUI()
  const { accounts, categories, transactions, balances, accountMap } = useLedger()
  const edit = txSheet.edit

  const [type, setType] = useState<Kind>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<string>()
  const [accountId, setAccountId] = useState<string>()
  const [toAccountId, setToAccountId] = useState<string>()
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [picker, setPicker] = useState<null | 'from' | 'to'>(null)
  const [shake, setShake] = useState(0)
  const [split, setSplit] = useState<SplitDraft>()
  const [splitOpen, setSplitOpen] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagsOpen, setTagsOpen] = useState(false)
  const people = usePeople() ?? []
  const peopleMap = usePeopleMap()

  const active = useMemo(() => accounts.filter((a) => !a.archived), [accounts])

  // Al abrir: precargar valores (edición) o valores por defecto (nuevo)
  useEffect(() => {
    if (!txSheet.open) return
    if (edit) {
      setType(edit.type === 'settlement' ? 'transfer' : edit.type)
      setAmount(centsToInput(edit.amount))
      setCategoryId(edit.categoryId)
      setAccountId(edit.accountId)
      setToAccountId(edit.toAccountId)
      setDate(edit.date)
      setNote(edit.note)
      setSplit(edit.split ? draftFromSplit(edit.split) : undefined)
      setTags(edit.tags)
      return
    }
    const preset = txSheet.preset ?? {}
    setType(preset.type && preset.type !== 'settlement' ? preset.type : 'expense')
    setAmount(preset.amount ? centsToInput(preset.amount) : '')
    setCategoryId(undefined)
    setDate(todayISO())
    setNote(preset.note ?? '')
    setToAccountId(preset.toAccountId)
    setAccountId(undefined)
    setSplit(undefined)
    setTags([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txSheet.open])

  // Cuenta por defecto: la última usada (o la indicada), cuando las cuentas ya cargaron
  useEffect(() => {
    if (!txSheet.open || edit || accountId || active.length === 0) return
    let cancelled = false
    getSetting<string>('lastAccountId').then((last) => {
      if (cancelled) return
      const fallback = active.find((a) => a.type === 'bank') ?? active[0]
      const preferred = txSheet.preset?.accountId ?? (last && active.some((a) => a.id === last) ? last : fallback?.id)
      setAccountId(preferred)
    })
    return () => {
      cancelled = true
    }
  }, [txSheet.open, txSheet.preset, edit, accountId, active])

  // Categorías del tipo actual, las más usadas (últimos 90 días) primero
  const sortedCategories = useMemo(() => {
    if (type === 'transfer') return []
    const since = addDays(todayISO(), -90)
    const usage = new Map<string, number>()
    for (const t of transactions) {
      if (t.date < since) break
      if (t.categoryId) usage.set(t.categoryId, (usage.get(t.categoryId) ?? 0) + 1)
    }
    return categories
      .filter((c) => c.kind === type && (!c.archived || c.id === categoryId))
      .sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.order - b.order)
  }, [categories, transactions, type, categoryId])

  const cents = parseMoney(amount)
  const activeSplit = type === 'expense' ? split : undefined
  const splitResult = activeSplit ? buildSplit(cents, activeSplit) : null
  // Si pagó otra persona, no se usa ninguna cuenta mía
  const othersPaid = !!activeSplit && activeSplit.paidBy !== ME
  const valid =
    cents > 0 &&
    (othersPaid || !!accountId) &&
    (!splitResult || splitResult.ok) &&
    (type === 'transfer' ? !!toAccountId && toAccountId !== accountId : !!categoryId)

  const changeType = (t: Kind) => {
    setType(t)
    setCategoryId(undefined)
    if (t === 'transfer' && !toAccountId) {
      const current = accountId ? accountMap.get(accountId) : undefined
      if (current?.type === 'credit') {
        // Desde una tarjeta, lo habitual es pagarla: Banco → Tarjeta
        const bank = active.find((a) => a.type === 'bank') ?? active.find((a) => a.id !== current.id)
        setAccountId(bank?.id)
        setToAccountId(current.id)
      } else {
        const other =
          active.find((a) => a.id !== accountId && a.type === 'credit') ?? active.find((a) => a.id !== accountId)
        setToAccountId(other?.id)
      }
    }
  }

  const save = async () => {
    if (!valid) {
      setShake((s) => s + 1)
      return
    }
    const result = splitResult && splitResult.ok ? splitResult : null
    await saveTransaction({
      id: edit?.id,
      type,
      amount: cents,
      myAmount: result ? result.myAmount : cents,
      accountId: othersPaid ? undefined : accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      categoryId: type === 'transfer' ? undefined : categoryId,
      date,
      note,
      tags,
      split: result?.split,
      recurringId: edit?.recurringId,
      sample: edit?.sample,
    })
    ui.closeTx()
    toast(edit ? 'Cambios guardados' : type === 'income' ? 'Ingreso guardado' : type === 'transfer' ? 'Transferencia guardada' : 'Gasto guardado')
  }

  const remove = async () => {
    if (!edit) return
    const removed = await deleteTransaction(edit.id)
    ui.closeTx()
    if (removed) toast('Movimiento borrado', 'delete', { label: 'Deshacer', run: () => restoreTransaction(removed) })
  }

  const from = accountId ? accountMap.get(accountId) : undefined
  const to = toAccountId ? accountMap.get(toAccountId) : undefined
  const isCardPayment = type === 'transfer' && to?.type === 'credit'

  return (
    <>
      <Sheet
        open={txSheet.open}
        onClose={ui.closeTx}
        bare
        title={TITLES[type][edit ? 1 : 0]}
        left={<SheetButton onClick={ui.closeTx}>Cancelar</SheetButton>}
        right={
          edit ? (
            <SheetButton onClick={remove} destructive>
              <Trash2 size={20} strokeWidth={1.75} aria-label="Borrar" />
            </SheetButton>
          ) : undefined
        }
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 space-y-3 px-4">
            <Segmented
              value={type}
              onChange={changeType}
              options={[
                { value: 'expense', label: 'Gasto' },
                { value: 'income', label: 'Ingreso' },
                { value: 'transfer', label: 'Transferencia' },
              ]}
            />

            {/* Monto */}
            <motion.div
              key={shake}
              animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : undefined}
              transition={{ duration: 0.35 }}
              className="flex h-[64px] items-center justify-center"
            >
              <span
                className="tabular truncate font-rounded text-[52px] leading-none font-semibold tracking-tight transition-colors"
                style={{ color: cents ? TONE[type] : 'var(--label-3)' }}
              >
                {formatAmountInput(amount)}
              </span>
            </motion.div>

            {/* Cuenta(s) */}
            <div className="flex items-center gap-2">
              {type === 'transfer' ? (
                <>
                  <Chip onClick={() => setPicker('from')} account={from} placeholder="Desde" />
                  <ArrowDown size={16} className="shrink-0 -rotate-90 text-label-3" />
                  <Chip onClick={() => setPicker('to')} account={to} placeholder="Hacia" />
                </>
              ) : othersPaid ? (
                <button
                  type="button"
                  onClick={() => setSplitOpen(true)}
                  className="pressable flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-card pr-3 pl-1.5 text-[15px]"
                >
                  <Avatar name={personName(activeSplit!.paidBy, peopleMap)} color={peopleMap.get(activeSplit!.paidBy)?.color} size={28} />
                  <span className="truncate">Pagó {personName(activeSplit!.paidBy, peopleMap)}</span>
                </button>
              ) : (
                <Chip onClick={() => setPicker('from')} account={from} placeholder="Cuenta" />
              )}
            </div>
            {/* Nota y fecha */}
            <div className="flex items-center gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Agregar nota"
                enterKeyHint="done"
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="h-10 min-w-0 flex-1 rounded-full bg-card px-4 text-[16px] outline-none placeholder:text-label-3"
              />
              <DateChip value={date} onChange={setDate} />
              <button
                type="button"
                aria-label="Etiquetas"
                onClick={() => setTagsOpen(true)}
                className={`pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tags.length ? 'bg-blue text-white' : 'bg-card text-label-2'}`}
              >
                <Hash size={18} strokeWidth={1.75} />
              </button>
              {type === 'expense' && (
                <button
                  type="button"
                  aria-label="Dividir gasto"
                  onClick={() => setSplitOpen(true)}
                  className={`pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${activeSplit ? 'bg-blue text-white' : 'bg-card text-label-2'}`}
                >
                  <Users size={18} strokeWidth={1.75} />
                </button>
              )}
            </div>
            {tags.length > 0 && (
              <button
                type="button"
                onClick={() => setTagsOpen(true)}
                className="flex w-full items-center gap-1.5 px-1 text-left text-[13px] text-label-2"
              >
                <Hash size={14} strokeWidth={2} className="shrink-0" />
                <span className="truncate">{tags.map((t) => `#${t}`).join('  ')}</span>
              </button>
            )}
            {activeSplit && (
              <button
                type="button"
                onClick={() => setSplitOpen(true)}
                className={`flex w-full items-center gap-1.5 px-1 text-left text-[13px] ${splitResult?.ok ? 'text-label-2' : 'text-red'}`}
              >
                <Users size={14} strokeWidth={2} className="shrink-0" />
                <span className="truncate">
                  {splitResult?.ok
                    ? `Dividido entre ${activeSplit.participants.length} · tu parte ${formatMoney(splitResult.myAmount)}`
                    : `Revisa la división: ${splitResult && !splitResult.ok ? splitResult.error : ''}`}
                </span>
              </button>
            )}
          </div>

          {/* Categorías o explicación de la transferencia */}
          <div className="no-scrollbar mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3">
            {type === 'transfer' ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center text-label-2">
                <ArrowLeftRight size={28} strokeWidth={1.5} className="mb-2" />
                <p className="text-[15px] leading-5">
                  {isCardPayment
                    ? 'Pago de tarjeta: baja la deuda de la tarjeta. No se cuenta como gasto, porque las compras ya se registraron.'
                    : 'Mueve dinero entre tus cuentas. No cuenta como ingreso ni como gasto.'}
                </p>
              </div>
            ) : (
              <CategoryGrid categories={sortedCategories} selected={categoryId} onSelect={setCategoryId} highlight={shake > 0 && !categoryId} />
            )}
          </div>

          <div className="shrink-0 bg-bg px-3 pt-2" style={{ paddingBottom: 'calc(var(--sab) + 8px)' }}>
            <NumPad
              onKey={(k) => setAmount((a) => applyKey(a, k))}
              onSave={save}
              canSave={valid}
              saveColor={type === 'income' ? 'var(--green)' : 'var(--blue)'}
            />
          </div>
        </div>
      </Sheet>

      <TagSheet open={tagsOpen} onClose={() => setTagsOpen(false)} selected={tags} onChange={setTags} transactions={transactions} />
      <SplitSheet
        open={splitOpen}
        onClose={() => setSplitOpen(false)}
        total={cents}
        people={people}
        draft={split}
        onApply={setSplit}
      />
      <AccountPicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        accounts={active}
        balances={balances}
        selected={picker === 'to' ? toAccountId : accountId}
        exclude={type === 'transfer' ? (picker === 'to' ? accountId : toAccountId) : undefined}
        title={picker === 'to' ? 'Hacia' : type === 'transfer' ? 'Desde' : 'Cuenta'}
        onSelect={(id) => {
          if (picker === 'to') setToAccountId(id)
          else setAccountId(id)
          setPicker(null)
        }}
      />
    </>
  )
}

/** "1234.5" → "$1,234.5" manteniendo lo que el usuario escribe */
function formatAmountInput(raw: string): string {
  if (!raw) return '$0'
  const [int, dec] = raw.split('.')
  const intFmt = Number(int || '0').toLocaleString('en-US')
  return `$${intFmt}${dec !== undefined ? '.' + dec : ''}`
}

function Chip({ account, placeholder, onClick }: { account?: Account; placeholder: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pressable flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-card pr-3 pl-1.5 text-[15px]"
    >
      {account ? (
        <CategoryIcon icon={account.icon} color={account.color} size={28} />
      ) : (
        <span className="h-7 w-7 rounded-full bg-fill" />
      )}
      <span className={`min-w-0 flex-1 truncate text-left ${account ? '' : 'text-label-3'}`}>
        {account?.name ?? placeholder}
      </span>
      <ChevronDown size={16} className="shrink-0 text-label-3" />
    </button>
  )
}

function DateChip({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = todayISO()
  const label = value === today ? 'Hoy' : value === addDays(today, -1) ? 'Ayer' : formatDateShort(value)
  return (
    <label className="pressable relative flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-card px-3 text-[15px]">
      <Calendar size={16} strokeWidth={1.75} className="text-label-2" />
      {label}
      {/* El selector nativo de iOS (ruedas) se abre al tocar */}
      <input
        type="date"
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="absolute inset-0 h-full w-full opacity-0"
        aria-label="Fecha"
      />
    </label>
  )
}

function CategoryGrid({
  categories,
  selected,
  onSelect,
  highlight,
}: {
  categories: Category[]
  selected?: string
  onSelect: (id: string) => void
  highlight: boolean
}) {
  return (
    <div className={`grid grid-cols-4 gap-x-1 gap-y-2 rounded-[14px] transition-colors ${highlight ? 'bg-red/10' : ''}`}>
      {categories.map((c) => {
        const isSel = c.id === selected
        return (
          <motion.button
            key={c.id}
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => onSelect(c.id)}
            className="flex flex-col items-center gap-1 rounded-[12px] px-0.5 py-1.5"
          >
            <span
              className="rounded-full p-[3px] transition-shadow"
              style={{ boxShadow: isSel ? `0 0 0 2.5px var(--${c.color})` : '0 0 0 2.5px transparent' }}
            >
              <CategoryIcon icon={c.icon} color={c.color} size={46} solid={isSel} />
            </span>
            <span className={`line-clamp-2 text-center text-[11px] leading-[13px] ${isSel ? 'font-semibold' : 'text-label-2'}`}>
              {c.name}
            </span>
          </motion.button>
        )
      })}
      {categories.length === 0 && (
        <p className="col-span-4 py-6 text-center text-[15px] text-label-2">
          No hay categorías. Créalas en Ajustes → Categorías.
        </p>
      )}
    </div>
  )
}
