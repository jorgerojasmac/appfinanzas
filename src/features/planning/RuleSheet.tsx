import { Eye, SkipForward } from 'lucide-react'
import { useMemo, useState } from 'react'
import { deleteRule, saveRule, skipNext } from '../../db/planning'
import type { Account, Category, ColorName, Frequency, RecurringRule } from '../../db/types'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { Segmented } from '../../components/ui/Controls'
import { DateRow, MoneyRow, PickerRow, TextRow, ToggleRow } from '../../components/ui/Form'
import { Group, Row } from '../../components/ui/List'
import { ActionSheet, Sheet, SheetButton } from '../../components/ui/Sheet'
import { toast } from '../../components/ui/Toast'
import { addMonths, currentMonth, dateInMonth, formatDate, todayISO } from '../../domain/dates'
import { describeFrequency, upcoming } from '../../domain/recurrence'
import { centsToInput, formatMoney, parseMoney } from '../../domain/money'
import { AccountPicker } from '../accounts/AccountPicker'
import { StyleFields } from '../settings/StyleFields'
import { CategoryPicker } from './CategoryPicker'
import { useOnOpen } from '../../hooks/useOnOpen'

type Kind = RecurringRule['kind']

export function RuleSheet({
  open,
  onClose,
  kind,
  rule,
  accounts,
  categories,
  balances,
}: {
  open: boolean
  onClose: () => void
  kind: Kind
  rule?: RecurringRule
  accounts: Account[]
  categories: Category[]
  balances: Map<string, number>
}) {
  const isSub = kind === 'subscription'
  const [type, setType] = useState<RecurringRule['type']>('expense')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [nextDate, setNextDate] = useState(todayISO())
  const [endDate, setEndDate] = useState<string | undefined>()
  const [accountId, setAccountId] = useState<string>()
  const [toAccountId, setToAccountId] = useState<string>()
  const [categoryId, setCategoryId] = useState<string>()
  const [active, setActive] = useState(true)
  const [review, setReview] = useState(false)
  const [icon, setIcon] = useState('Repeat')
  const [color, setColor] = useState<ColorName>('pink')
  const [picker, setPicker] = useState<null | 'account' | 'to' | 'category'>(null)
  const [confirm, setConfirm] = useState(false)

  const activeAccounts = useMemo(() => accounts.filter((a) => !a.archived), [accounts])
  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  useOnOpen(open, () => {
    const r = rule
    setType(r?.type ?? 'expense')
    setName(r?.name ?? '')
    setAmount(r ? centsToInput(r.amount) : '')
    setFrequency(r?.frequency ?? 'monthly')
    // Nueva regla: por defecto, el mismo día del mes que viene
    setNextDate(r?.nextDate ?? dateInMonth(addMonths(currentMonth(), 1), Number(todayISO().slice(8, 10))))
    setEndDate(r?.endDate)
    setAccountId(r?.accountId ?? activeAccounts.find((a) => a.type === (isSub ? 'credit' : 'bank'))?.id ?? activeAccounts[0]?.id)
    setToAccountId(r?.toAccountId)
    setCategoryId(r?.categoryId ?? (isSub ? 'cat-suscripciones' : undefined))
    setActive(r?.active ?? true)
    setReview(r?.review ?? false)
    setIcon(r?.icon ?? 'Repeat')
    setColor(r?.color ?? 'pink')
  })

  const cents = parseMoney(amount)
  const valid =
    name.trim() &&
    cents > 0 &&
    !!accountId &&
    (type === 'transfer' ? !!toAccountId && toAccountId !== accountId : !!categoryId)

  const draft = { frequency, interval: 1, anchorDay: Number(nextDate.slice(8, 10)), nextDate, endDate }

  const save = async () => {
    const created = await saveRule({
      id: rule?.id,
      kind,
      name: name.trim(),
      type: isSub ? 'expense' : type,
      amount: cents,
      accountId,
      toAccountId,
      categoryId,
      frequency,
      interval: 1,
      nextDate,
      endDate: isSub ? undefined : endDate,
      active,
      review: isSub ? review : undefined,
      icon: isSub ? icon : undefined,
      color: isSub ? color : undefined,
      sample: rule?.sample,
    })
    const base = rule ? 'Cambios guardados' : isSub ? 'Suscripción agregada' : 'Recurrente creado'
    toast(created > 0 ? `${base} · ${created === 1 ? '1 movimiento registrado' : `${created} movimientos registrados`}` : base)
    onClose()
  }

  const remove = async () => {
    if (!rule) return
    await deleteRule(rule.id)
    toast(isSub ? 'Suscripción eliminada' : 'Recurrente eliminado', 'delete')
    onClose()
  }

  const account = accountId ? accMap.get(accountId) : undefined
  const to = toAccountId ? accMap.get(toAccountId) : undefined
  const category = categoryId ? catMap.get(categoryId) : undefined
  const next3 = upcoming(draft, 3)
  const title = rule ? (isSub ? 'Editar suscripción' : 'Editar recurrente') : isSub ? 'Nueva suscripción' : 'Nuevo recurrente'

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={title}
        left={<SheetButton onClick={onClose}>Cancelar</SheetButton>}
        right={
          <SheetButton onClick={save} bold disabled={!valid}>
            {rule ? 'Guardar' : 'Crear'}
          </SheetButton>
        }
      >
        <div className="space-y-6">
          {isSub ? (
            <div className="flex justify-center pt-2">
              <CategoryIcon icon={icon} color={color} size={72} />
            </div>
          ) : (
            <Segmented
              value={type}
              onChange={setType}
              options={[
                { value: 'expense', label: 'Gasto' },
                { value: 'income', label: 'Ingreso' },
                { value: 'transfer', label: 'Transferencia' },
              ]}
            />
          )}

          <Group>
            <TextRow label="Nombre" value={name} onChange={setName} placeholder={isSub ? 'Ej. Netflix' : 'Ej. Arriendo'} />
            <MoneyRow label="Monto" value={amount} onChange={setAmount} />
          </Group>

          <div className="space-y-2">
            <Segmented
              value={frequency}
              onChange={setFrequency}
              options={
                isSub
                  ? [
                      { value: 'monthly', label: 'Mensual' },
                      { value: 'yearly', label: 'Anual' },
                    ]
                  : [
                      { value: 'weekly', label: 'Semanal' },
                      { value: 'monthly', label: 'Mensual' },
                      { value: 'yearly', label: 'Anual' },
                    ]
              }
            />
            <Group
              footer={`${describeFrequency(draft)}. Próximas fechas: ${next3.map((d) => formatDate(d)).join(', ')}. El movimiento se registra solo ese día.`}
            >
              <DateRow label={isSub ? 'Próximo cobro' : 'Próxima fecha'} value={nextDate} onChange={(v) => v && setNextDate(v)} />
              {!isSub && <DateRow label="Termina" value={endDate} onChange={setEndDate} optional />}
            </Group>
          </div>

          <Group>
            <PickerRow
              label={type === 'transfer' && !isSub ? 'Desde' : isSub ? 'Cargo a' : 'Cuenta'}
              value={account?.name ?? 'Elegir'}
              icon={account && <CategoryIcon icon={account.icon} color={account.color} size={24} />}
              onClick={() => setPicker('account')}
            />
            {type === 'transfer' && !isSub ? (
              <PickerRow
                label="Hacia"
                value={to?.name ?? 'Elegir'}
                icon={to && <CategoryIcon icon={to.icon} color={to.color} size={24} />}
                onClick={() => setPicker('to')}
              />
            ) : (
              <PickerRow
                label="Categoría"
                value={category?.name ?? 'Elegir'}
                icon={category && <CategoryIcon icon={category.icon} color={category.color} size={24} />}
                onClick={() => setPicker('category')}
              />
            )}
          </Group>

          {isSub ? (
            <Group footer="Márcala si estás pensando en cancelarla. Seguirá registrándose hasta que la canceles.">
              <ToggleRow
                label="En revisión"
                checked={review}
                onChange={setReview}
                icon={<Eye size={20} strokeWidth={1.75} className="text-orange" />}
              />
            </Group>
          ) : (
            <Group footer={active ? undefined : 'Pausado: no se generarán movimientos. Al reactivarlo no se crean los atrasados.'}>
              <ToggleRow label="Activo" checked={active} onChange={setActive} />
            </Group>
          )}

          {isSub && <StyleFields icon={icon} color={color} onIcon={setIcon} onColor={setColor} />}

          {rule && (
            <Group>
              {rule.active && (
                <Row
                  icon={<SkipForward size={20} strokeWidth={1.75} className="text-blue" />}
                  inset={52}
                  title={`Saltar el ${formatDate(rule.nextDate)}`}
                  onClick={async () => {
                    await skipNext(rule.id)
                    toast('Fecha saltada')
                    onClose()
                  }}
                />
              )}
              {isSub && (
                <Row
                  title={rule.active ? 'Cancelar suscripción' : 'Reactivar suscripción'}
                  destructive={rule.active}
                  onClick={async () => {
                    await saveRule({ ...rule, active: !rule.active, review: false })
                    toast(rule.active ? 'Suscripción cancelada' : 'Suscripción reactivada')
                    onClose()
                  }}
                />
              )}
              <Row title={isSub ? 'Eliminar de la lista' : 'Eliminar recurrente'} destructive onClick={() => setConfirm(true)} />
            </Group>
          )}
          {rule && (
            <p className="px-4 text-[13px] text-label-2">
              Monto actual: {formatMoney(rule.amount)}. Cambiarlo no modifica los movimientos ya registrados.
            </p>
          )}
        </div>
      </Sheet>

      <AccountPicker
        open={picker === 'account' || picker === 'to'}
        onClose={() => setPicker(null)}
        accounts={activeAccounts}
        balances={balances}
        selected={picker === 'to' ? toAccountId : accountId}
        exclude={type === 'transfer' ? (picker === 'to' ? accountId : toAccountId) : undefined}
        title={picker === 'to' ? 'Hacia' : 'Cuenta'}
        onSelect={(id) => {
          if (picker === 'to') setToAccountId(id)
          else setAccountId(id)
          setPicker(null)
        }}
      />
      <CategoryPicker
        open={picker === 'category'}
        onClose={() => setPicker(null)}
        categories={categories.filter((c) => !c.archived && c.kind === (type === 'income' && !isSub ? 'income' : 'expense'))}
        selected={categoryId}
        onSelect={(id) => {
          setCategoryId(id)
          setPicker(null)
        }}
      />
      <ActionSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        message="Los movimientos ya registrados se conservan."
        actions={[{ label: 'Eliminar', destructive: true, onSelect: remove }]}
      />
    </>
  )
}
