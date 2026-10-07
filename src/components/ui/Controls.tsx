import { motion } from 'framer-motion'
import { useId, type ReactNode } from 'react'

/** Control segmentado de iOS */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: ReactNode }>
}) {
  const id = useId()
  return (
    <div className="flex h-8 rounded-[9px] bg-fill p-[2px]">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="relative flex-1 text-[13px] font-medium"
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-[7px] bg-white shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)] dark:bg-[#636366]"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className={`relative ${active ? 'font-semibold' : ''}`}>{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Interruptor de iOS */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200"
      style={{ background: checked ? 'var(--green)' : 'var(--fill-2)' }}
    >
      <motion.span
        className="absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_3px_1px_rgba(0,0,0,0.06)]"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 600, damping: 35 }}
      />
    </button>
  )
}

/** Estado vacío amable con icono */
export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: ReactNode
  title: string
  message?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-8 py-10 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-fill text-label-2">
        {icon}
      </div>
      <h3 className="text-[20px] font-semibold">{title}</h3>
      {message && <p className="mt-1.5 text-[15px] leading-5 text-label-2">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Botón principal relleno */
export function PrimaryButton({
  children,
  onClick,
  tone = 'blue',
  className = '',
}: {
  children: ReactNode
  onClick: () => void
  tone?: 'blue' | 'red' | 'plain'
  className?: string
}) {
  const styles = {
    blue: 'bg-blue text-white',
    red: 'bg-card text-red',
    plain: 'bg-card text-blue',
  }[tone]
  return (
    <button
      onClick={onClick}
      className={`pressable h-[50px] rounded-[12px] px-5 text-[17px] font-semibold ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

/** Campo de texto dentro de una lista agrupada */
export function FieldRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 bg-card px-4">
      <span className="shrink-0 text-[17px]">{label}</span>
      <div className="flex min-w-0 flex-1 justify-end">{children}</div>
    </label>
  )
}
