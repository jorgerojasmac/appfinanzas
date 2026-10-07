import { CircleAlert, CircleCheck, CircleDashed, TriangleAlert } from 'lucide-react'
import { ProgressRing } from '../../components/ui/Progress'
import { scoreLabel, STATUS_LABEL, type Status } from '../../domain/health'

export const STATUS_COLOR: Record<Status, string> = {
  good: 'var(--green)',
  warn: 'var(--orange)',
  alert: 'var(--red)',
  none: 'var(--gray)',
}

/** Señal de estado: icono + texto, nunca solo color. */
export function StatusBadge({ status }: { status: Status }) {
  const Icon = status === 'good' ? CircleCheck : status === 'warn' ? TriangleAlert : status === 'alert' ? CircleAlert : CircleDashed
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium"
      style={{ color: STATUS_COLOR[status], background: `color-mix(in srgb, ${STATUS_COLOR[status]} 14%, transparent)` }}
    >
      <Icon size={13} strokeWidth={2.25} />
      {STATUS_LABEL[status]}
    </span>
  )
}

/** Anillo con el puntaje global */
export function ScoreRing({ score, size = 96 }: { score: number | null; size?: number }) {
  const s = score == null ? null : scoreLabel(score)
  return (
    <ProgressRing ratio={(score ?? 0) / 100} color={s ? STATUS_COLOR[s.status] : 'var(--gray)'} size={size} stroke={Math.round(size / 9)}>
      <span className="font-rounded font-bold" style={{ fontSize: size * 0.32 }}>
        {score ?? '—'}
      </span>
    </ProgressRing>
  )
}
