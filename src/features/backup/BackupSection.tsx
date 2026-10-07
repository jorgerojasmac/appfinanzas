import { Download, FileSpreadsheet, HardDrive, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { usePeopleMap } from '../../app/PeopleContext'
import { backupFileName, buildBackup, checkBackup, markBackupDone, restoreBackup, saveFile, transactionsToCSV, type BackupCheck } from '../../db/backup'
import { Group, Row } from '../../components/ui/List'
import { ActionSheet } from '../../components/ui/Sheet'
import { toast } from '../../components/ui/Toast'
import { useLedger, useSetting } from '../../hooks/data'
import { formatDate, toISO } from '../../domain/dates'
import { SettingsIcon } from '../settings/SettingsScreen'

export function daysSince(ts: number | null): number | null {
  return ts ? Math.floor((Date.now() - ts) / 86_400_000) : null
}

/** Exportar e importar respaldos (Ajustes). */
export function BackupSection() {
  const { transactions, categoryMap, accountMap } = useLedger()
  const people = usePeopleMap()
  const lastBackup = useSetting<number | null>('lastBackupAt', null)
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Extract<BackupCheck, { ok: true }> | null>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null))
  }, [])

  const exportJSON = async () => {
    const backup = await buildBackup()
    const r = await saveFile(backupFileName('json'), JSON.stringify(backup), 'application/json')
    if (r === 'cancelled') return
    await markBackupDone()
    toast('Respaldo exportado')
  }

  const exportCSV = async () => {
    const csv = transactionsToCSV(transactions, categoryMap, accountMap, people)
    const r = await saveFile(backupFileName('csv'), csv, 'text/csv')
    if (r !== 'cancelled') toast('Movimientos exportados')
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const check = checkBackup(JSON.parse(await f.text()))
      if (!check.ok) return toast(check.error, 'delete')
      setPending(check)
    } catch {
      toast('No se pudo leer el archivo. ¿Es un respaldo .json de esta app?', 'delete')
    }
  }

  const days = daysSince(lastBackup)

  return (
    <>
      <Group
        header="Respaldo"
        footer={
          <>
            {lastBackup ? `Último respaldo: ${formatDate(toISO(new Date(lastBackup)))}${days ? ` (hace ${days} ${days === 1 ? 'día' : 'días'})` : ' (hoy)'}.` : 'Aún no has hecho un respaldo.'}{' '}
            Tus datos viven solo en este iPhone: guarda el archivo .json en Archivos o iCloud Drive. El CSV sirve para abrir tus movimientos en Excel o Numbers.
            {persisted === false && ' Almacenamiento estándar: si el iPhone se queda sin espacio, el sistema podría borrar datos de apps web; el respaldo te protege.'}
          </>
        }
      >
        <Row inset={58} icon={<SettingsIcon color="blue"><Download size={17} strokeWidth={2} /></SettingsIcon>} title="Exportar respaldo (JSON)" onClick={exportJSON} />
        <Row inset={58} icon={<SettingsIcon color="green"><FileSpreadsheet size={17} strokeWidth={2} /></SettingsIcon>} title="Exportar movimientos (CSV)" onClick={exportCSV} />
        <Row inset={58} icon={<SettingsIcon color="orange"><Upload size={17} strokeWidth={2} /></SettingsIcon>} title="Importar respaldo" onClick={() => input.current?.click()} />
        {persisted !== null && (
          <Row
            inset={58}
            icon={<SettingsIcon color="gray"><HardDrive size={17} strokeWidth={2} /></SettingsIcon>}
            title="Almacenamiento"
            value={<span className="text-[15px] text-label-2">{persisted ? 'Protegido' : 'Estándar'}</span>}
          />
        )}
      </Group>
      <input ref={input} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
      <ActionSheet
        open={!!pending}
        onClose={() => setPending(null)}
        title="Importar respaldo"
        message={
          pending
            ? `Se reemplazarán TODOS tus datos actuales por los del respaldo${pending.exportedAt ? ` del ${formatDate(pending.exportedAt.slice(0, 10))}` : ''} (${pending.counts.transactions} movimientos, ${pending.counts.accounts} cuentas). Si tienes datos nuevos, exporta un respaldo antes.`
            : undefined
        }
        actions={[
          {
            label: 'Reemplazar mis datos',
            destructive: true,
            onSelect: async () => {
              if (!pending) return
              try {
                await restoreBackup(pending.file)
                toast(`Respaldo importado: ${pending.counts.transactions} movimientos`)
              } catch {
                toast('No se pudo importar. Tus datos no cambiaron.', 'delete')
              }
              setPending(null)
            },
          },
        ]}
      />
    </>
  )
}
