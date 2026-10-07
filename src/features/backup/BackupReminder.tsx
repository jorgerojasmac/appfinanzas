import { CloudUpload, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLedger, useSetting } from '../../hooks/data'
import { daysSince } from './BackupSection'

const REMIND_AFTER_DAYS = 30

/** Recordatorio discreto si pasan más de 30 días sin respaldo. */
export function BackupReminder() {
  const navigate = useNavigate()
  const { transactions } = useLedger()
  const lastBackup = useSetting<number | null>('lastBackupAt', null)
  const installedAt = useSetting<number | null>('installedAt', null)
  const [dismissed, setDismissed] = useState(false)

  // Solo cuenta si hay datos reales (no de ejemplo)
  const hasRealData = transactions.some((t) => !t.sample)
  const days = daysSince(lastBackup ?? installedAt)
  if (dismissed || !hasRealData || days == null || days < REMIND_AFTER_DAYS) return null

  return (
    <div className="flex items-center gap-3 rounded-[14px] bg-card py-2.5 pr-2 pl-4">
      <CloudUpload size={22} strokeWidth={1.75} className="shrink-0 text-blue" />
      <button onClick={() => navigate('/ajustes')} className="min-w-0 flex-1 text-left">
        <p className="text-[15px] font-medium">{lastBackup ? `Hace ${days} días que no respaldas` : 'Aún no has respaldado tus datos'}</p>
        <p className="text-[13px] text-label-2">Toca para exportar un respaldo</p>
      </button>
      <button onClick={() => setDismissed(true)} aria-label="Ocultar recordatorio" className="flex h-9 w-9 items-center justify-center text-label-3">
        <X size={18} />
      </button>
    </div>
  )
}
