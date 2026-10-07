import { motion } from 'framer-motion'

/** Barra de progreso redondeada que se anima al cambiar. */
export function ProgressBar({ ratio, color, height = 8 }: { ratio: number; color: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100
  return (
    <div className="overflow-hidden rounded-full bg-fill" style={{ height }}>
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct > 0 ? Math.max(pct, 3) : 0}%` }}
        transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
      />
    </div>
  )
}

/** Anillo de progreso (estilo Actividad de Apple). */
export function ProgressRing({
  ratio,
  color,
  size = 64,
  stroke = 7,
  children,
}: {
  ratio: number
  color: string
  size?: number
  stroke?: number
  children?: React.ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, ratio))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fill)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 0.9, ease: [0.32, 0.72, 0, 1] }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  )
}
