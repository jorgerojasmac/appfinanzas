import { Check } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { removeAccount, saveAccount } from '../../db/repo'
import type { Account, AccountType, ColorName, SavingsPurpose } from '../../db/types'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { FieldRow, Segmented } from '../../components/ui/Controls'
import { Group, Row } from '../../components/ui/List'
import { ActionSheet, Sheet, SheetButton } from '../../components/ui/Sheet'
import { toast } from '../../components/ui/Toast'
import { centsToInput, formatMoney, parseMoney } from '../../domain/money'
import { StyleFields } from '../settings/StyleFields'
import { DEFAULT_ACCOUNT_ICON } from './accountLabels'
import { useOnOpen } from '../../hooks/useOnOpen'

const DEFAULT_COLOR: Record<AccountType, ColorName> = {
  cash: 'green',
  bank: 'blue',
  savings: 'mint',
  credit: 'indigo',
}

const inputCls = 'w-full bg-transparent text-right text-[17px] text-label-2 outline-none placeholder:text-label-3'

export function AccountSheet({
  open,
  onClose,
  account,
  currentBalance,
  defaultType,
}: {
  open: boolean
  onClose: () => void
  account?: Account
  /** Saldo actual calculado con los movimientos (solo al editar) */
  currentBalance?: number
  /** Tipo inicial al crear (por ejemplo desde Tarjetas) */
  defaultType?: AccountType
}) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('bank')
  const [opening, setOpening] = useState('')
  const [icon, setIcon] = useState('Landmark')
  const [color, setColor] = useState<ColorName>('blue')
  const [limit, setLimit] = useState('')
  const [statementDay, setStatementDay] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [purpose, setPurpose] = useState<SavingsPurpose>('general')
  const [confirm, setConfirm] = useState(false)

  useOnOpen(open, () => {
    const a = account
    setName(a?.name ?? '')
    const t = a?.type ?? defaultType ?? 'bank'
    setType(t)
    // En tarjetas se ingresa la deuda como número positivo
    setOpening(a ? centsToInput(a.type === 'credit' ? -a.openingBalance : a.openingBalance) : '')
    setIcon(a?.icon ?? DEFAULT_ACCOUNT_ICON[t])
    setColor(a?.color ?? DEFAULT_COLOR[t])
    setLimit(a?.creditLimit ? centsToInput(a.creditLimit) : '')
    setStatementDay(a?.statementDay ? String(a.statementDay) : '')
    setDueDay(a?.dueDay ? String(a.dueDay) : '')
    setPurpose(a?.savingsPurpose ?? 'general')
  })

  const changeType = (t: AccountType) => {
    // Si el icono/color eran los de por defecto, se actualizan al nuevo tipo
    if (icon === DEFAULT_ACCOUNT_ICON[type]) setIcon(DEFAULT_ACCOUNT_ICON[t])
    if (color === DEFAULT_COLOR[type]) setColor(DEFAULT_COLOR[t])
    setType(t)
  }

  const day = (v: string) => {
    const n = Number(v)
    return n >= 1 && n <= 31 ? Math.round(n) : undefined
  }

  const save = async () => {
    const amount = parseMoney(opening)
    await saveAccount({
      id: account?.id,
      name: name.trim() || 'Cuenta',
      type,
      openingBalance: type === 'credit' ? -Math.abs(amount) : amount,
      icon,
      color,
      creditLimit: type === 'credit' ? parseMoney(limit) || undefined : undefined,
      statementDay: type === 'credit' ? day(statementDay) : undefined,
      dueDay: type === 'credit' ? day(dueDay) : undefined,
      savingsPurpose: type === 'savings' ? purpose : undefined,
    })
    toast(account ? 'Cuenta actualizada' : 'Cuenta creada')
    onClose()
  }

  const remove = async () => {
    if (!account) return
    const result = await removeAccount(account.id)
    onClose()
    toast(result === 'deleted' ? 'Cuenta borrada' : 'Cuenta archivada', 'delete')
    navigate('/ajustes/cuentas', { replace: true })
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={account ? 'Editar cuenta' : 'Nueva cuenta'}
      left={<SheetButton onClick={onClose}>Cancelar</SheetButton>}
      right={
        <SheetButton onClick={save} bold disabled={!name.trim()}>
          {account ? 'Guardar' : 'Crear'}
        </SheetButton>
      }
    >
      <div className="space-y-6">
        <div className="flex justify-center pt-2">
          <CategoryIcon icon={icon} color={color} size={72} />
        </div>
        <Group>
          <FieldRow label="Nombre">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Banco Pichincha" />
          </FieldRow>
        </Group>

        <Segmented
          value={type}
          onChange={changeType}
          options={[
            { value: 'cash', label: 'Efectivo' },
            { value: 'bank', label: 'Banco' },
            { value: 'savings', label: 'Ahorro' },
            { value: 'credit', label: 'Tarjeta' },
          ]}
        />

        <Group
          footer={
            account
              ? `${type === 'credit' ? 'Deuda' : 'Saldo'} al crear la cuenta. Hoy ${
                  type === 'credit' ? 'la deuda es' : 'el saldo es'
                } ${formatMoney(type === 'credit' ? Math.max(0, -(currentBalance ?? 0)) : currentBalance ?? 0)}, calculado con tus movimientos.`
              : type === 'credit'
                ? 'Lo que debes hoy en la tarjeta. Cada compra aumenta la deuda y cada pago (transferencia desde el banco) la reduce.'
                : 'El saldo que tiene la cuenta hoy. Después se actualiza solo con tus movimientos.'
          }
        >
          <FieldRow label={account ? (type === 'credit' ? 'Deuda inicial' : 'Saldo inicial') : type === 'credit' ? 'Deuda actual' : 'Saldo actual'}>
            <input className={inputCls} inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="$0.00" />
          </FieldRow>
          {type === 'credit' && (
            <>
              <FieldRow label="Cupo">
                <input className={inputCls} inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="$0.00" />
              </FieldRow>
              <FieldRow label="Día de corte">
                <input className={inputCls} inputMode="numeric" value={statementDay} onChange={(e) => setStatementDay(e.target.value)} placeholder="1–31" />
              </FieldRow>
              <FieldRow label="Día de pago">
                <input className={inputCls} inputMode="numeric" value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="1–31" />
              </FieldRow>
            </>
          )}
        </Group>

        {type === 'savings' && (
          <Group header="Propósito" footer="El fondo de emergencia y el colchón se usan en los indicadores de salud financiera.">
            {(['emergency', 'cushion', 'general'] as SavingsPurpose[]).map((p) => (
              <Row
                key={p}
                title={{ emergency: 'Fondo de emergencia', cushion: 'Fondo colchón', general: 'Ahorro general' }[p]}
                onClick={() => setPurpose(p)}
                value={p === purpose ? <Check size={20} strokeWidth={2.5} className="text-blue" /> : undefined}
              />
            ))}
          </Group>
        )}

        <StyleFields icon={icon} color={color} onIcon={setIcon} onColor={setColor} />

        {account && (
          <Group>
            <Row title="Borrar cuenta" destructive onClick={() => setConfirm(true)} />
          </Group>
        )}
      </div>
      <ActionSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        message="Si la cuenta tiene movimientos se archivará para conservar tu historial."
        actions={[{ label: 'Borrar cuenta', destructive: true, onSelect: remove }]}
      />
    </Sheet>
  )
}
