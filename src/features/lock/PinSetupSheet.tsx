import { useState } from 'react'
import { setSetting } from '../../db/repo'
import { Sheet, SheetButton } from '../../components/ui/Sheet'
import { toast } from '../../components/ui/Toast'
import { useOnOpen } from '../../hooks/useOnOpen'
import { createPin, verifyPin, type PinRecord } from '../../domain/pin'
import { PinDots, PinPad } from './PinPad'

type Step = 'current' | 'new' | 'confirm'

/** Crear, cambiar o quitar el PIN. */
export function PinSetupSheet({
  open,
  onClose,
  existing,
  mode,
}: {
  open: boolean
  onClose: () => void
  existing: PinRecord | null
  mode: 'create' | 'change' | 'remove'
}) {
  const [step, setStep] = useState<Step>('new')
  const [entry, setEntry] = useState('')
  const [first, setFirst] = useState('')
  const [shake, setShake] = useState(0)
  const [msg, setMsg] = useState('')

  useOnOpen(open, () => {
    setStep(mode === 'create' ? 'new' : 'current')
    setEntry('')
    setFirst('')
    setMsg('')
  })

  const fail = (text: string) => {
    setShake((s) => s + 1)
    setMsg(text)
    setTimeout(() => setEntry(''), 350)
  }

  const onDigit = async (d: string) => {
    const next = (entry + d).slice(0, 4)
    setEntry(next)
    if (next.length < 4) return
    if (step === 'current') {
      if (!existing || !(await verifyPin(next, existing))) return fail('PIN incorrecto')
      if (mode === 'remove') {
        await setSetting('pin', null)
        toast('PIN desactivado')
        onClose()
        return
      }
      setTimeout(() => {
        setStep('new')
        setEntry('')
        setMsg('')
      }, 150)
    } else if (step === 'new') {
      setTimeout(() => {
        setFirst(next)
        setStep('confirm')
        setEntry('')
        setMsg('')
      }, 150)
    } else {
      if (next !== first) {
        setStep('new')
        setFirst('')
        return fail('Los PIN no coinciden. Inténtalo de nuevo.')
      }
      await setSetting('pin', await createPin(next))
      toast(mode === 'create' ? 'PIN activado' : 'PIN cambiado')
      onClose()
    }
  }

  const title =
    step === 'current' ? 'Ingresa tu PIN actual' : step === 'new' ? (mode === 'create' ? 'Crea un PIN de 4 dígitos' : 'Nuevo PIN') : 'Confirma tu PIN'

  return (
    <Sheet open={open} onClose={onClose} left={<SheetButton onClick={onClose}>Cancelar</SheetButton>} bare>
      <div className="flex flex-1 flex-col items-center" style={{ paddingBottom: 'calc(var(--sab) + 24px)' }}>
        <p className="mt-6 text-[20px] font-semibold">{title}</p>
        <p className="mt-1 h-5 px-6 text-center text-[15px] text-red">{msg}</p>
        <div className="mt-8">
          <PinDots length={entry.length} shake={shake} />
        </div>
        <div className="mt-auto">
          <PinPad onDigit={onDigit} onBack={() => setEntry((e) => e.slice(0, -1))} />
        </div>
      </div>
    </Sheet>
  )
}
