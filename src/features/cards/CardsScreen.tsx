import { CreditCard, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState, PrimaryButton } from '../../components/ui/Controls'
import { Card } from '../../components/ui/List'
import { ProgressBar } from '../../components/ui/Progress'
import { NavButton, Screen } from '../../components/ui/Screen'
import { useLedger } from '../../hooks/data'
import { IDEAL_USAGE, summarizeCard, totalUsage } from '../../domain/cards'
import { todayISO } from '../../domain/dates'
import { formatMoney } from '../../domain/money'
import { AccountSheet } from '../accounts/AccountSheet'
import { CardVisual } from './CardVisual'
import { paymentText } from './cardText'

export function useCardSummaries() {
  const { accounts, transactions } = useLedger()
  return useMemo(() => {
    const today = todayISO()
    return accounts
      .filter((a) => a.type === 'credit' && !a.archived)
      .map((card) => ({ card, summary: summarizeCard(card, transactions, today) }))
  }, [accounts, transactions])
}

export function CardsScreen() {
  const navigate = useNavigate()
  const cards = useCardSummaries()
  const [adding, setAdding] = useState(false)
  const usage = totalUsage(cards.map((c) => c.summary))
  const debt = cards.reduce((a, c) => a + c.summary.debt, 0)

  return (
    <Screen
      title="Tarjetas"
      back="Planificación"
      right={
        <NavButton label="Nueva tarjeta" onClick={() => setAdding(true)}>
          <Plus size={26} strokeWidth={2} />
        </NavButton>
      }
    >
      {cards.length === 0 ? (
        <EmptyState
          icon={<CreditCard size={28} strokeWidth={1.5} />}
          title="Sin tarjetas de crédito"
          message="Agrega tus tarjetas con su cupo, día de corte y día de pago. Te avisaré cuánto pagar y cuándo."
          action={<PrimaryButton onClick={() => setAdding(true)}>Agregar tarjeta</PrimaryButton>}
        />
      ) : (
        <>
          <Card>
            <div className="flex items-baseline justify-between">
              <p className="text-[15px] text-label-2">Deuda total</p>
              <p className="tabular text-[20px] font-semibold">{formatMoney(debt)}</p>
            </div>
            {usage != null && (
              <>
                <div className="mt-3">
                  <ProgressBar
                    ratio={usage}
                    color={usage <= IDEAL_USAGE ? 'var(--green)' : usage <= 0.5 ? 'var(--yellow)' : 'var(--red)'}
                  />
                </div>
                <p className="mt-1.5 text-[13px] leading-[18px] text-label-2">
                  Usas el {Math.round(usage * 100)}% de tu cupo total.{' '}
                  {usage <= IDEAL_USAGE ? 'Bien: lo ideal es menos del 30%.' : 'Lo ideal es mantenerlo por debajo del 30%.'}
                </p>
              </>
            )}
          </Card>
          {cards.map(({ card, summary }) => {
            const p = paymentText(summary)
            return (
              <div key={card.id} className="space-y-2">
                <CardVisual card={card} summary={summary} onClick={() => navigate(`/cuentas/${card.id}`)} />
                <div className="px-1">
                  <p className={`text-[15px] font-semibold ${p.tone}`}>{p.title}</p>
                  <p className="text-[13px] text-label-2">{p.detail}</p>
                </div>
              </div>
            )
          })}
        </>
      )}
      <AccountSheet open={adding} onClose={() => setAdding(false)} defaultType="credit" />
    </Screen>
  )
}
