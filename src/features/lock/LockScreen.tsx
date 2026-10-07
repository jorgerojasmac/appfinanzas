import { AnimatePresence, motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { lock, useLock } from '../../app/lockStore'
import { useSettingLoaded } from '../../hooks/data'
import { verifyPin, type PinRecord } from '../../domain/pin'
import { PinDots, PinPad } from './PinPad'

/** Minutos fuera de la app después de los cuales se vuelve a pedir el PIN */
const RELOCK_AFTER_MS = 60_000
const MAX_TRIES = 5
const LOCKOUT_MS = 30_000

/**
 * Bloqueo opcional con PIN al abrir la app. Es una protección de privacidad:
 * no cifra los datos guardados en el dispositivo.
 */
export function LockScreen() {
  const pin = useSettingLoaded<PinRecord>('pin')
  const { locked, decided } = useLock()
  const [entry, setEntry] = useState('')
  const [shake, setShake] = useState(0)
  const [tries, setTries] = useState(0)
  const [until, setUntil] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [hidden, setHidden] = useState(false)
  const hiddenAt = useRef<number | null>(null)

  // Decidir si hay que bloquear cuando el ajuste ya cargó
  useEffect(() => {
    if (pin === undefined || decided) return
    lock.set({ decided: true, locked: !!pin })
  }, [pin, decided])

  // Si se quita el PIN desde Ajustes, desbloquear
  useEffect(() => {
    if (decided && pin === null) lock.set({ locked: false })
  }, [pin, decided])

  // Volver a bloquear tras un rato fuera de la app y tapar el contenido en el selector de apps
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now()
        setHidden(true)
      } else {
        setHidden(false)
        if (pin && hiddenAt.current && Date.now() - hiddenAt.current > RELOCK_AFTER_MS) {
          setEntry('')
          lock.set({ locked: true })
        }
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [pin])

  useEffect(() => {
    if (until <= Date.now()) return
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [until])

  const blocked = until > now

  const onDigit = async (d: string) => {
    if (!pin || blocked) return
    const next = (entry + d).slice(0, 4)
    setEntry(next)
    if (next.length < 4) return
    if (await verifyPin(next, pin)) {
      setTries(0)
      setTimeout(() => {
        setEntry('')
        lock.set({ locked: false })
      }, 120)
    } else {
      const t = tries + 1
      setTries(t)
      setShake((s) => s + 1)
      setTimeout(() => setEntry(''), 350)
      if (t >= MAX_TRIES) {
        setUntil(Date.now() + LOCKOUT_MS)
        setNow(Date.now())
        setTries(0)
      }
    }
  }

  // Mientras no se sabe si hay PIN, tapar para que no se vea el contenido un instante
  const cover = !decided
  const show = decided && locked && !!pin

  return (
    <>
      {(cover || (hidden && !!pin)) && <div className="fixed inset-0 z-[95] bg-bg" aria-hidden />}
      <AnimatePresence>
        {show && (
          <motion.div
            className="fixed inset-0 z-[96] flex flex-col items-center bg-bg"
            style={{ paddingTop: 'calc(var(--sat) + 48px)', paddingBottom: 'calc(var(--sab) + 24px)' }}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.25 }}
          >
            <Lock size={28} strokeWidth={1.75} className="text-label-2" />
            <p className="mt-3 text-[20px] font-semibold">Ingresa tu PIN</p>
            <p className="mt-1 h-5 text-[15px] text-label-2">
              {blocked
                ? `Demasiados intentos. Espera ${Math.ceil((until - now) / 1000)} s`
                : tries > 0
                  ? `PIN incorrecto · ${MAX_TRIES - tries} ${MAX_TRIES - tries === 1 ? 'intento' : 'intentos'} más`
                  : ''}
            </p>
            <div className="mt-8">
              <PinDots length={entry.length} shake={shake} />
            </div>
            <div className="mt-auto">
              <PinPad onDigit={onDigit} onBack={() => setEntry((e) => e.slice(0, -1))} disabled={blocked} />
            </div>
            <ForgotPin />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function ForgotPin() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-6 px-8 text-center">
      <button onClick={() => setOpen((o) => !o)} className="text-[15px] text-blue">
        ¿Olvidaste tu PIN?
      </button>
      {open && (
        <p className="mt-2 text-[13px] leading-[18px] text-label-2">
          Por seguridad no se puede recuperar. Para quitarlo hay que borrar los datos de la app (en iPhone: Ajustes → Apps → Safari → Avanzado → Datos de sitios web). Si tienes un respaldo, podrás restaurarlo después.
        </p>
      )}
    </div>
  )
}
