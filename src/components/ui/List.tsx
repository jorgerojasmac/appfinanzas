import { ChevronRight } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'

/** Lista agrupada blanca con esquinas redondeadas (estilo Ajustes). */
export function Group({
  header,
  headerRight,
  footer,
  children,
  className = '',
}: {
  header?: ReactNode
  headerRight?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={className}>
      {(header || headerRight) && (
        <div className="flex items-end justify-between px-4 pb-1.5">
          <h3 className="text-[13px] tracking-[-0.08px] text-label-2 uppercase">{header}</h3>
          {headerRight}
        </div>
      )}
      <div className="grouped overflow-hidden rounded-[12px] bg-card">{children}</div>
      {footer && <p className="px-4 pt-1.5 text-[13px] leading-[18px] text-label-2">{footer}</p>}
    </section>
  )
}

/** Título de sección grande (como "Recientes" en Salud) con acción opcional */
export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between px-1 pb-2">
      <h2 className="text-[22px] leading-7 font-bold tracking-[0.35px]">{title}</h2>
      {action}
    </div>
  )
}

interface RowProps {
  icon?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  value?: ReactNode
  valueSub?: ReactNode
  chevron?: boolean
  onClick?: () => void
  destructive?: boolean
  className?: string
  /** Sangría del separador; por defecto se calcula según haya icono */
  inset?: number
}

/** Fila táctil de al menos 44pt. */
export function Row({
  icon,
  title,
  subtitle,
  value,
  valueSub,
  chevron,
  onClick,
  destructive,
  className = '',
  inset,
}: RowProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`flex w-full items-center gap-3 bg-card px-4 text-left ${
        onClick ? 'transition-colors active:bg-fill-2' : ''
      } ${subtitle ? 'min-h-[60px] py-2' : 'min-h-11 py-2.5'} ${className}`}
      style={{ '--sep-inset': `${inset ?? (icon ? 64 : 16)}px` } as CSSProperties}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <div className={`truncate text-[17px] ${destructive ? 'text-red' : ''}`}>{title}</div>
        {subtitle && <div className="truncate text-[15px] leading-5 text-label-2">{subtitle}</div>}
      </div>
      {(value !== undefined || valueSub) && (
        <div className="shrink-0 text-right">
          <div className="tabular text-[17px]">{value}</div>
          {valueSub && <div className="tabular text-[13px] text-label-2">{valueSub}</div>}
        </div>
      )}
      {chevron && <ChevronRight size={18} strokeWidth={2.25} className="-mr-1 shrink-0 text-label-3" />}
    </Tag>
  )
}

/** Tarjeta blanca simple para dashboards */
export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`block w-full rounded-[16px] bg-card p-4 text-left ${
        onClick ? 'transition-transform active:scale-[0.98]' : ''
      } ${className}`}
    >
      {children}
    </Tag>
  )
}
