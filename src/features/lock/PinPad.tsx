import { motion } from 'framer-motion'
import { Delete } from 'lucide-react'

/** Teclado de código estilo iOS: botones redondos grandes. */
export function PinPad({ onDigit, onBack, disabled }: { onDigit: (d: string) => void; onBack: () => void; disabled?: boolean }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back']
  return (
    <div className="grid grid-cols-3 gap-x-6 gap-y-4">
      {keys.map((k, i) =>
        k === '' ? (
          <span key={i} />
        ) : k === 'back' ? (
          <button key={i} onClick={onBack} disabled={disabled} aria-label="Borrar" className="flex h-[76px] w-[76px] items-center justify-center text-label disabled:opacity-30">
            <Delete size={28} strokeWidth={1.5} />
          </button>
        ) : (
          <motion.button
            key={i}
            whileTap={{ scale: 0.92 }}
            disabled={disabled}
            onClick={() => onDigit(k)}
            className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-fill font-rounded text-[34px] font-normal active:bg-fill-2 disabled:opacity-30"
          >
            {k}
          </motion.button>
        ),
      )}
    </div>
  )
}

/** Cuatro puntos que se rellenan al escribir. */
export function PinDots({ length, shake }: { length: number; shake: number }) {
  return (
    <motion.div
      key={shake}
      animate={shake ? { x: [0, -14, 14, -10, 10, -4, 0] } : undefined}
      transition={{ duration: 0.4 }}
      className="flex justify-center gap-5"
    >
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="h-[14px] w-[14px] rounded-full border-[1.5px] border-label transition-colors"
          style={{ background: i < length ? 'var(--label)' : 'transparent' }}
        />
      ))}
    </motion.div>
  )
}
