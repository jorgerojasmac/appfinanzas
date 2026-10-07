import { ChevronRight, PiggyBank } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ui } from '../../app/uiStore'
import { ProgressBar } from '../../components/ui/Progress'
import { useLedger } from '../../hooks/data'
import { useCushion } from '../../hooks/cushion'
import { formatMoney } from '../../domain/money'
import { formatMonth } from '../../domain/dates'

/** Consejo del fondo colchón: apartar en meses buenos, usar en meses flojos. */
export function CushionCard({ compact = false, link = true }: { compact?: boolean; link?: boolean }) {
  const navigate = useNavigate()
  const advice = useCushion()
  const { accounts } = useLedger()
  if (!advice) return null
  // En Inicio solo aparece cuando hay algo que hacer
  if (compact && !(advice.mode === 'surplus' && advice.suggestSave > 0) && !(advice.mode === 'shortfall' && advice.suggestUse > 0)) return null

  const cushionAcc = accounts.find((a) => !a.archived && a.type === 'savings' && a.savingsPurpose === 'cushion')
  const bank = accounts.find((a) => !a.archived && a.type === 'bank')
  const ratio = advice.target ? advice.balance / advice.target : 0

  const prevName = advice.shortfallMonth ? formatMonth(advice.shortfallMonth).split(' ')[0].toLowerCase() : ''
  const title =
    advice.mode === 'no-base'
      ? 'Aún sin ingreso base'
      : advice.mode === 'surplus'
        ? advice.suggestSave > 0
          ? `Buen mes: aparta ${formatMoney(advice.suggestSave)}`
          : advice.savedThisMonth > 0
            ? 'Buen mes: ya apartaste el excedente'
            : 'Buen mes y colchón completo'
        : advice.mode === 'shortfall'
          ? advice.suggestUse > 0
            ? `Completa ${prevName}: usa ${formatMoney(advice.suggestUse)}`
            : advice.usedRecent > 0
              ? `Ya compensaste ${prevName}`
              : 'Mes flojo y colchón vacío'
          : advice.mode === 'pending'
            ? `Llevas ${formatMoney(advice.income)} de ${formatMoney(advice.base!)}`
            : 'Mes en equilibrio'
  const detail =
    advice.mode === 'no-base'
      ? 'Cuando tenga 3 meses de datos (o lo definas en Presupuestos) te diré cuánto apartar o usar.'
      : advice.mode === 'surplus'
        ? advice.suggestSave > 0
          ? `Este mes ya ingresaste ${formatMoney(advice.income)}, ${formatMoney(advice.surplus)} más que tu ingreso base. Guardar el excedente te protege en los meses flojos.`
          : advice.savedThisMonth > 0
            ? `Apartaste ${formatMoney(advice.savedThisMonth)} este mes. ¡Bien!`
            : 'Tu colchón ya cubre la meta. Puedes dirigir el excedente a tus metas de ahorro.'
        : advice.mode === 'shortfall'
          ? advice.suggestUse > 0
            ? `En ${prevName} ingresaste ${formatMoney(advice.shortfall)} menos que tu ingreso base. Puedes tomarlo del colchón para vivir este mes con tu ingreso base de siempre.${advice.suggestUse < advice.shortfall - advice.usedRecent ? ' Tu colchón no alcanza para todo: revisa gastos variables.' : ''}`
            : advice.usedRecent > 0
              ? `Usaste ${formatMoney(advice.usedRecent)} del colchón para cubrir la diferencia.`
              : `En ${prevName} ingresaste menos que tu ingreso base y tu colchón está vacío. Prioriza reponerlo en el próximo mes bueno.`
          : advice.mode === 'pending'
            ? 'Este mes aún no llegas a tu ingreso base. Si al cierre te falta, te diré cuánto tomar del colchón; si lo superas, cuánto apartar.'
            : 'Tus ingresos de este mes igualan tu ingreso base.'

  const action =
    advice.mode === 'surplus' && advice.suggestSave > 0 && cushionAcc
      ? { label: 'Apartar al colchón', run: () => ui.openNewTx({ type: 'transfer', accountId: bank?.id, toAccountId: cushionAcc.id, amount: advice.suggestSave, note: 'Aporte al colchón' }) }
      : advice.mode === 'shortfall' && advice.suggestUse > 0 && cushionAcc
        ? { label: 'Usar del colchón', run: () => ui.openNewTx({ type: 'transfer', accountId: cushionAcc.id, toAccountId: bank?.id, amount: advice.suggestUse, note: 'Uso del colchón' }) }
        : null

  return (
    <div className="rounded-[16px] bg-card p-4">
      <button
        onClick={() => link && navigate('/planificacion/colchon')}
        className="mb-2 flex w-full items-center gap-1.5 text-left text-[15px] font-semibold text-orange"
      >
        <PiggyBank size={18} />
        Fondo colchón
        {link && <ChevronRight size={18} strokeWidth={2.25} className="ml-auto text-label-3" />}
      </button>
      <p className="text-[17px] font-semibold">{title}</p>
      <p className="mt-1 text-[13px] leading-[18px] text-label-2">{detail}</p>
      {!compact && advice.target != null && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[13px]">
            <span>{formatMoney(advice.balance)} en el colchón</span>
            <span className="tabular text-label-2">Meta {formatMoney(advice.target)}</span>
          </div>
          <ProgressBar ratio={ratio} color="var(--orange)" />
        </div>
      )}
      {!advice.hasAccount && advice.mode !== 'no-base' && (
        <p className="mt-2 text-[13px] text-orange">Crea una cuenta de ahorro con propósito "Fondo colchón" en Ajustes → Cuentas.</p>
      )}
      {action && (
        <button onClick={action.run} className="pressable mt-3 h-10 w-full rounded-[10px] bg-orange text-[15px] font-semibold text-white">
          {action.label}
        </button>
      )}
    </div>
  )
}
