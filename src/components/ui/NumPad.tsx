import { motion } from 'framer-motion'
import { Check, Delete } from 'lucide-react'
import type { ReactNode } from 'react'

const MAX_INT_DIGITS = 9

/** Aplica una tecla al texto del monto respetando máx. 2 decimales. */
export function applyKey(current: string, key: string): string {
  if (key === 'back') return current.slice(0, -1)
  if (key === '.') {
    if (current.includes('.')) return current
    return (current || '0') + '.'
  }
  const [int, dec] = current.split('.')
  if (dec !== undefined) {
    if (dec.length >= 2) return current
    return current + key
  }
  if (int === '0') return key
  if (int.length >= MAX_INT_DIGITS) return current
  return current + key
}

function Key({
  children,
  onPress,
  className = '',
  label,
}: {
  children: ReactNode
  onPress: () => void
  className?: string
  label?: string
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      whileTap={{ scale: 0.94 }}
      transition={{ duration: 0.08 }}
      onPointerDown={(e) => e.preventDefault()}
      onClick={onPress}
      className={`flex items-center justify-center rounded-[12px] font-rounded text-[26px] font-medium active:brightness-90 ${className}`}
    >
      {children}
    </motion.button>
  )
}

/** Teclado numérico grande con botón "Guardar" integrado (estilo calculadora). */
export function NumPad({
  onKey,
  onSave,
  canSave,
  saveColor = 'var(--blue)',
}: {
  onKey: (key: string) => void
  onSave: () => void
  canSave: boolean
  saveColor?: string
}) {
  const digit = 'bg-card text-label h-[50px]'
  return (
    <div className="grid grid-cols-4 gap-2">
      {['1', '2', '3'].map((d) => (
        <Key key={d} className={digit} onPress={() => onKey(d)}>
          {d}
        </Key>
      ))}
      <Key className={`${digit} text-label-2`} onPress={() => onKey('back')} label="Borrar">
        <Delete size={24} strokeWidth={1.75} />
      </Key>
      {['4', '5', '6'].map((d) => (
        <Key key={d} className={digit} onPress={() => onKey(d)}>
          {d}
        </Key>
      ))}
      <Key
        className="row-span-3 text-white"
        onPress={onSave}
        label="Guardar"
      >
        <span
          className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-[12px] font-sans text-[15px] font-semibold transition-opacity"
          style={{ background: saveColor, opacity: canSave ? 1 : 0.35 }}
        >
          <Check size={28} strokeWidth={2.5} />
          Guardar
        </span>
      </Key>
      {['7', '8', '9'].map((d) => (
        <Key key={d} className={digit} onPress={() => onKey(d)}>
          {d}
        </Key>
      ))}
      <Key className={digit} onPress={() => onKey('.')} label="Punto decimal">
        .
      </Key>
      <Key className={`${digit} col-span-2`} onPress={() => onKey('0')}>
        0
      </Key>
    </div>
  )
}
