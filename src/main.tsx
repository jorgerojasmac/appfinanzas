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

// La app instalada busca versiones nuevas al abrirse, al volver a ella y cada hora
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    const check = () => registration.update().catch(() => {})
    setInterval(check, 60 * 60 * 1000)
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
