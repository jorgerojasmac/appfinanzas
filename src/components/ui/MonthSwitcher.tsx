import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, currentMonth, formatMonth, type MonthKey } from '../../domain/dates'

/** ‹ Octubre 2026 › */
export function MonthSwitcher({ month, onChange }: { month: MonthKey; onChange: (m: MonthKey) => void }) {
  const isCurrent = month >= currentMonth()
  return (
    <div className="flex items-center justify-between rounded-[12px] bg-card px-1">
      <button onClick={() => onChange(addMonths(month, -1))} aria-label="Mes anterior" className="pressable flex h-11 w-11 items-center justify-center text-blue">
        <ChevronLeft size={24} strokeWidth={2} />
      </button>
      <button onClick={() => onChange(currentMonth())} className="text-[17px] font-semibold">
        {formatMonth(month)}
      </button>
      <button
        onClick={() => onChange(addMonths(month, 1))}
        aria-label="Mes siguiente"
        disabled={isCurrent}
        className="pressable flex h-11 w-11 items-center justify-center text-blue disabled:opacity-25"
      >
        <ChevronRight size={24} strokeWidth={2} />
      </button>
    </div>
  )
}
