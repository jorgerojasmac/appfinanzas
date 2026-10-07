import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './app/App'
import './index.css'

// Modo desarrollo: simular la Dynamic Island del iPhone 15 Pro con ?sim=1
if (import.meta.env.DEV) {
  const params = new URLSearchParams(location.search)
  if (params.has('sim')) localStorage.setItem('sim', params.get('sim') ?? '1')
  if (localStorage.getItem('sim') === '1') document.documentElement.classList.add('sim-iphone')
  // ?seed=1 carga los datos de ejemplo (para capturas automáticas)
  if (params.has('seed')) import('./db/sampleData').then((m) => m.loadSampleData())
}

// Pedir almacenamiento persistente para reducir el riesgo de que el sistema borre los datos
navigator.storage?.persist?.().catch(() => {})

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
