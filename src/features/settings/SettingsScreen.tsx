import { FlaskConical, LayoutGrid, Trash2, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearSampleData, loadSampleData } from '../../db/sampleData'
import { Group, Row } from '../../components/ui/List'
import { Screen } from '../../components/ui/Screen'
import { ActionSheet } from '../../components/ui/Sheet'
import { toast } from '../../components/ui/Toast'
import { useSetting } from '../../hooks/data'

/** Icono cuadrado de color, como en Ajustes de iOS */
export function SettingsIcon({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px] text-white"
      style={{ background: `var(--${color})` }}
    >
      {children}
    </span>
  )
}

export function SettingsScreen() {
  const navigate = useNavigate()
  const sampleLoaded = useSetting<boolean>('sampleLoaded', false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setBusy(true)
    try {
      await loadSampleData()
      toast('Datos de ejemplo cargados')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen title="Ajustes">
      <Group>
        <Row
            inset={58}
          icon={<SettingsIcon color="orange"><LayoutGrid size={18} strokeWidth={2} /></SettingsIcon>}
          title="Categorías"
          chevron
          onClick={() => navigate('/ajustes/categorias')}
         
        />
        <Row
            inset={58}
          icon={<SettingsIcon color="blue"><Wallet size={18} strokeWidth={2} /></SettingsIcon>}
          title="Cuentas"
          chevron
          onClick={() => navigate('/ajustes/cuentas')}
        />
      </Group>

      <Group
        header="Datos de ejemplo"
        footer="Carga meses de movimientos ficticios con ingresos irregulares para ver los dashboards llenos. Se borran sin tocar tus datos reales."
      >
        {sampleLoaded ? (
          <Row
            inset={58}
            icon={<SettingsIcon color="red"><Trash2 size={18} strokeWidth={2} /></SettingsIcon>}
            title="Borrar datos de ejemplo"
            destructive
            onClick={() => setConfirmClear(true)}
          />
        ) : (
          <Row
            inset={58}
            icon={<SettingsIcon color="purple"><FlaskConical size={18} strokeWidth={2} /></SettingsIcon>}
            title={busy ? 'Cargando…' : 'Cargar datos de ejemplo'}
            onClick={busy ? undefined : load}
          />
        )}
      </Group>

      <p className="pt-2 text-center text-[13px] text-label-3">
        Finanzas · versión {__APP_VERSION__}
        <br />
        Tus datos se guardan solo en este dispositivo.
      </p>

      <ActionSheet
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        message="Se borrarán todas las cuentas y movimientos de ejemplo. Tus datos reales no se tocan."
        actions={[
          {
            label: 'Borrar datos de ejemplo',
            destructive: true,
            onSelect: async () => {
              await clearSampleData()
              toast('Datos de ejemplo borrados', 'delete')
            },
          },
        ]}
      />
    </Screen>
  )
}
