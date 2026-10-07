import type { ReactNode } from 'react'

/** Tooltip de gráfico con los tokens de la app (texto en tinta, color solo en el punto). */
export function TooltipBox({ title, rows }: { title?: ReactNode; rows: Array<{ color?: string; label: string; value: string }> }) {
  return (
    <div className="material-bar rounded-[12px] px-3 py-2 text-[13px] shadow-lg ring-1 ring-black/5">
      {title && <p className="mb-1 font-semibold">{title}</p>}
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2">
          {r.color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />}
          <span className="text-label-2">{r.label}</span>
          <span className="tabular ml-auto pl-3 font-medium">{r.value}</span>
        </p>
      ))}
    </div>
  )
}

/** Tarjeta contenedora de un gráfico */
export function ChartCard({
  title,
  subtitle,
  children,
  right,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  right?: ReactNode
}) {
  return (
    <section className="rounded-[16px] bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[17px] font-semibold">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[13px] leading-[18px] text-label-2">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

/** Leyenda: punto de color + texto en tinta */
export function Legend({ items }: { items: Array<{ color: string; label: string }> }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-label-2">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

/** Mensaje amable cuando un gráfico no tiene datos */
export function ChartEmpty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-[15px] leading-5 text-label-2">{children}</p>
}
