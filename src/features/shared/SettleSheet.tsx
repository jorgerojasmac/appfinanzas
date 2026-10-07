import { Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { personName, usePeopleMap } from '../../app/PeopleContext'
import { ui, useUI } from '../../app/uiStore'
import { deleteTransaction, restoreTransaction, saveTransaction } from '../../db/repo'
import { Avatar } from '../../components/ui/Avatar'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { Segmented } from '../../components/ui/Controls'
import { DateRow, MoneyRow, PickerRow, TextRow } from '../../components/ui/Form'
import { Group } from '../../components/ui/List'
import { Sheet, SheetButton } from '../../components/ui/Sheet'
import { toast } from '../../components/ui/Toast'
import { useLedger } from '../../hooks/data'
import { useOnOpen } from '../../hooks/useOnOpen'
import { todayISO } from '../../domain/dates'
import { centsToInput, formatMoney, parseMoney } from '../../domain/money'
import { personBalances } from '../../domain/shared'
import { AccountPicker } from '../accounts/AccountPicker'

/** Registrar (o editar) cuando se saldan cuentas con una persona. */
export function SettleSheet() {
  const { settleSheet } = useUI()
  const { accounts, transactions, balances, accountMap } = useLedger()
  const people = usePeopleMap()
  const { open, personId, edit } = settleSheet
  const person = personId ? people.get(personId) : undefined

  const [direction, setDirection] = useState<'received' | 'paid'>('received')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState<string>()
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [picker, setPicker] = useState(false)

  const active = useMemo(() => accounts.filter((a) => !a.archived && a.type !== 'credit'), [accounts])
  // Saldo sin contar la liquidación que se está editando
  const balance = useMemo(() => {
    if (!personId) return 0
    return personBalances(transactions.filter((t) => t.id !== edit?.id)).get(personId) ?? 0
  }, [transactions, personId, edit])

  useOnOpen(open, () => {
    if (edit) {
      setDirection(edit.settleDirection ?? 'received')
      setAmount(centsToInput(edit.amount))
      setAccountId(edit.accountId)
      setDate(edit.date)
      setNote(edit.note)
    } else {
      setDirection(balance >= 0 ? 'received' : 'paid')
      setAmount(balance ? centsToInput(Math.abs(balance)) : '')
      setAccountId(active.find((a) => a.type === 'bank')?.id ?? active[0]?.id)
      setDate(todayISO())
      setNote('')
    }
  })

  const cents = parseMoney(amount)
  const name = personId ? personName(personId, people) : ''
  const after = balance + (direction === 'received' ? -cents : cents)

  const save = async () => {
    if (!personId || cents <= 0 || !accountId) return
    await saveTransaction({
      id: edit?.id,
      type: 'settlement',
      amount: cents,
      myAmount: 0,
      accountId,
      personId,
      settleDirection: direction,
      date,
      note,
      tags: [],
      sample: edit?.sample,
    })
    ui.closeSettle()
    toast(after === 0 ? `Cuentas saldadas con ${name}` : 'Pago registrado')
  }

  const remove = async () => {
    if (!edit) return
    const removed = await deleteTransaction(edit.id)
    ui.closeSettle()
    if (removed) toast('Pago borrado', 'delete', { label: 'Deshacer', run: () => restoreTransaction(removed) })
  }

  const account = accountId ? accountMap.get(accountId) : undefined

  return (
    <>
      <Sheet
        open={open}
        onClose={ui.closeSettle}
        size="auto"
        title={edit ? 'Editar pago' : 'Saldar cuentas'}
        left={<SheetButton onClick={ui.closeSettle}>Cancelar</SheetButton>}
        right={
          <SheetButton onClick={save} bold disabled={cents <= 0 || !accountId}>
            Guardar
          </SheetButton>
        }
      >
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-2 pt-1">
            <Avatar name={name} color={person?.color} size={56} />
            <p className="text-[20px] font-semibold">{name}</p>
            <p className={`tabular text-[15px] ${balance > 0 ? 'text-green' : balance < 0 ? 'text-red' : 'text-label-2'}`}>
              {balance > 0 ? `Te debe ${formatMoney(balance)}` : balance < 0 ? `Le debes ${formatMoney(-balance)}` : 'Están al día'}
            </p>
          </div>
          <Segmented
            value={direction}
            onChange={setDirection}
            options={[
              { value: 'received', label: `${name} me pagó` },
              { value: 'paid', label: `Yo le pagué` },
            ]}
          />
          <Group
            footer={
              cents > 0
                ? after === 0
                  ? 'Quedarán al día. No cuenta como ingreso ni gasto: solo mueve dinero de tu cuenta.'
                  : `Después del pago: ${after > 0 ? `te deberá ${formatMoney(after)}` : `le deberás ${formatMoney(-after)}`}. No cuenta como ingreso ni gasto.`
                : undefined
            }
          >
            <MoneyRow label="Monto" value={amount} onChange={setAmount} />
            <PickerRow
              label={direction === 'received' ? 'Recibido en' : 'Pagado desde'}
              value={account?.name ?? 'Elegir'}
              icon={account && <CategoryIcon icon={account.icon} color={account.color} size={24} />}
              onClick={() => setPicker(true)}
            />
            <DateRow label="Fecha" value={date} onChange={(v) => v && setDate(v)} />
            <TextRow label="Nota" value={note} onChange={setNote} placeholder="Opcional" />
          </Group>
          {edit && (
            <button onClick={remove} className="pressable flex h-11 w-full items-center justify-center gap-1.5 rounded-[12px] bg-card text-[17px] text-red">
              <Trash2 size={18} strokeWidth={1.75} /> Borrar pago
            </button>
          )}
        </div>
      </Sheet>
      <AccountPicker
        open={picker}
        onClose={() => setPicker(false)}
        accounts={active}
        balances={balances}
        selected={accountId}
        title="Cuenta"
        onSelect={(id) => {
          setAccountId(id)
          setPicker(false)
        }}
      />
    </>
  )
}
