import { ChevronRight, HeartPulse } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useHealth } from '../../hooks/health'
import { scoreLabel } from '../../domain/health'
import { ScoreRing, STATUS_COLOR } from './HealthBits'

/** Tarjeta de salud financiera para Inicio y Estadísticas. */
export function HealthCard() {
  const navigate = useNavigate()
  const { report } = useHealth()
  if (!report) return null
  const s = report.score != null ? scoreLabel(report.score) : null
  const tip = report.recommendations[0]
  return (
    <button
      onClick={() => navigate('/estadisticas/salud')}
      className="block w-full rounded-[16px] bg-card p-4 text-left transition-transform active:scale-[0.98]"
    >
      <div className="mb-3 flex items-center gap-1.5 text-[15px] font-semibold text-pink">
        <HeartPulse size={18} />
        Salud financiera
        <ChevronRight size={18} strokeWidth={2.25} className="ml-auto text-label-3" />
      </div>
      <div className="flex items-center gap-4">
        <ScoreRing score={report.score} size={72} />
        <div className="min-w-0 flex-1">
          <p className="text-[20px] font-semibold" style={{ color: s ? STATUS_COLOR[s.status] : undefined }}>
            {s ? s.label : 'Aún sin puntaje'}
          </p>
          <p className="line-clamp-3 text-[13px] leading-[18px] text-label-2">
            {tip ?? 'Registra tus movimientos durante unos meses para ver tu puntaje.'}
          </p>
        </div>
      </div>
    </button>
  )
}
