import { DatabaseZap, RotateCw } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { db } from '../db/schema'

/**
 * Abre la base de datos antes de mostrar la app. Si falla (navegación privada,
 * almacenamiento lleno o restringido), muestra una explicación en vez de una
 * pantalla en blanco.
 */
export function DbGuard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'opening' | 'ok' | 'error'>('opening')
  const [detail, setDetail] = useState('')

  useEffect(() => {
    let cancelled = false
    db.open()
      .then(async () => {
        // Fecha de instalación: base para el recordatorio de respaldo
        if (!(await db.settings.get('installedAt'))) await db.settings.put({ key: 'installedAt', value: Date.now() })
        if (!cancelled) setState('ok')
      })
      .catch((e: unknown) => {
        console.error('No se pudo abrir la base de datos', e)
        if (!cancelled) {
          setDetail(e instanceof Error ? `${e.name}: ${e.message}` : String(e))
          setState('error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (state === 'ok') return <>{children}</>
  if (state === 'opening') return <div className="min-h-dvh bg-bg" />

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center bg-bg px-8 text-center"
      style={{ paddingTop: 'var(--sat)', paddingBottom: 'var(--sab)' }}
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-fill text-orange">
        <DatabaseZap size={30} strokeWidth={1.5} />
      </span>
      <h1 className="mt-4 text-[22px] font-bold">No se pudieron abrir tus datos</h1>
      <p className="mt-2 text-[15px] leading-5 text-label-2">
        Tus datos no se han borrado. Esto suele pasar si Safari está en navegación privada, si el iPhone no tiene espacio libre o si el almacenamiento de sitios web está bloqueado en Ajustes.
      </p>
      <button
        onClick={() => location.reload()}
        className="pressable mt-6 flex h-[50px] items-center gap-2 rounded-[12px] bg-blue px-6 text-[17px] font-semibold text-white"
      >
        <RotateCw size={20} /> Reintentar
      </button>
      {detail && <p className="mt-6 text-[12px] break-all text-label-3">{detail}</p>}
    </div>
  )
}
