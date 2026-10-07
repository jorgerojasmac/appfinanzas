import { motion } from 'framer-motion'
import type { Account } from '../../db/types'
import { colorVar } from '../../components/ui/colors'
import { getIcon } from '../../components/ui/icons'
import { IDEAL_USAGE, type CardSummary } from '../../domain/cards'
import { formatMoney } from '../../domain/money'

/** Tarjeta estilo Wallet con deuda y uso del cupo. */
export function CardVisual({ card, summary, onClick }: { card: Account; summary: CardSummary; onClick?: () => void }) {
  const Icon = getIcon(card.icon)
  const usage = summary.usage
  return (
    <motion.div
      role={onClick ? 'button' : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={`relative w-full overflow-hidden rounded-[18px] p-5 text-left text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        // Color sólido + capas de luz y sombra: se ve igual en cualquier versión de Safari
        backgroundColor: colorVar(card.color),
        backgroundImage:
          'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.28) 100%)',
        aspectRatio: '1.586',
        minHeight: 190,
      }}
    >
      {/* Brillo sutil */}
      <span
        className="pointer-events-none absolute -top-1/2 -right-1/4 h-full w-3/4 rounded-full blur-2xl"
        style={{ background: 'rgba(255,255,255,0.16)' }}
      />
      <div className="relative flex h-full min-h-[150px] flex-col">
        <div className="flex items-center justify-between">
          <span className="text-[17px] font-semibold">{card.name}</span>
          <Icon size={26} strokeWidth={1.5} className="opacity-90" />
        </div>
        <div className="mt-auto">
          <p className="text-[13px] opacity-80">Deuda actual</p>
          <p className="tabular font-rounded text-[30px] leading-9 font-bold">{formatMoney(summary.debt)}</p>
          {usage != null ? (
            <>
              <div className="relative mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.28)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: usage > IDEAL_USAGE ? (usage > 0.7 ? '#ffd0cc' : '#fff3c4') : '#fff' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(usage, 1) * 100}%` }}
                  transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                />
                {/* Marca del 30 % recomendado */}
                <span className="absolute top-0 h-full w-[2px]" style={{ left: `${IDEAL_USAGE * 100}%`, background: 'rgba(255,255,255,0.75)' }} />
              </div>
              <p className="tabular mt-1.5 flex justify-between text-[12px] opacity-85">
                <span>{Math.round(usage * 100)}% del cupo</span>
                <span>Disponible {formatMoney(summary.available ?? 0)}</span>
              </p>
            </>
          ) : (
            <p className="mt-2 text-[12px] opacity-85">Agrega el cupo para ver el % de uso</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
