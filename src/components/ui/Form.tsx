import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatDate } from '../../domain/dates'
import { Toggle } from './Controls'

const valueCls = 'w-full bg-transparent text-right text-[17px] text-label-2 outline-none placeholder:text-label-3'

export function TextRow({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 bg-card px-4">
      <span className="shrink-0 text-[17px]">{label}</span>
      <input className={valueCls} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  )
}

/** Monto con teclado decimal de iOS */
export function MoneyRow({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  suffix?: string
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 bg-card px-4">
      <span className="shrink-0 text-[17px]">{label}</span>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
        {/* El símbolo va dentro del valor para que se lea "$1,250" sin espacios */}
        <input
          className={`${valueCls} tabular`}
          style={{ width: suffix ? '6ch' : undefined }}
          inputMode="decimal"
          value={value ? (suffix ? value : `$${value}`) : ''}
          onChange={(e) => {
            const clean = e.target.value.replace(/[^0-9.]/g, '')
            const [int, ...rest] = clean.split('.')
            onChange(rest.length ? `${int}.${rest.join('').slice(0, 2)}` : int)
          }}
          placeholder={suffix ? '0' : '$0.00'}
        />
        {suffix && <span className="text-[17px] text-label-2">{suffix}</span>}
      </div>
    </label>
  )
}

/** Fecha con el selector nativo de iOS */
export function DateRow({
  label,
  value,
  onChange,
  optional,
}: {
  label: string
  value: string | undefined
  onChange: (v: string | undefined) => void
  optional?: boolean
}) {
  return (
    <label className="relative flex min-h-11 items-center gap-3 bg-card px-4">
      <span className="shrink-0 text-[17px]">{label}</span>
      <span className={`flex-1 text-right text-[17px] ${value ? 'text-blue' : 'text-label-3'}`}>
        {value ? formatDate(value) : optional ? 'Sin fecha' : 'Elegir'}
      </span>
      <input
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || (optional ? undefined : value))}
        className="absolute inset-0 h-full w-full opacity-0"
        aria-label={label}
      />
    </label>
  )
}

/** Fila que abre un selector */
export function PickerRow({
  label,
  value,
  icon,
  onClick,
}: {
  label: string
  value: ReactNode
  icon?: ReactNode
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-11 w-full items-center gap-3 bg-card px-4 text-left active:bg-fill-2">
      <span className="shrink-0 text-[17px]">{label}</span>
      <span className="flex min-w-0 flex-1 items-center justify-end gap-2 text-[17px] text-label-2">
        {icon}
        <span className="truncate">{value}</span>
      </span>
      <ChevronRight size={18} strokeWidth={2.25} className="-mr-1 shrink-0 text-label-3" />
    </button>
  )
}

export function ToggleRow({
  label,
  checked,
  onChange,
  icon,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  icon?: ReactNode
}) {
  return (
    <div className="flex min-h-11 items-center gap-3 bg-card px-4 py-1.5">
      {icon}
      <span className="flex-1 text-[17px]">{label}</span>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  )
}
