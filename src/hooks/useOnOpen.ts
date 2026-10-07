import { useEffect, useRef } from 'react'

/**
 * Ejecuta `init` solo cuando una hoja pasa de cerrada a abierta. Así el
 * formulario no se reinicia si los datos de fondo cambian mientras se edita.
 */
export function useOnOpen(open: boolean, init: () => void) {
  const initRef = useRef(init)
  initRef.current = init
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open && !wasOpen.current) initRef.current()
    wasOpen.current = open
  }, [open])
}
