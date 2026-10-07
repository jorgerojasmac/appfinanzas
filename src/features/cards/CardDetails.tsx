import { CreditCard } from 'lucide-react'
import { ui } from '../../app/uiStore'
import type { Account } from '../../db/types'
import { Group, Row } from '../../components/ui/List'
import type { CardSummary } from '../../domain/cards'
import { formatDate } from '../../domain/dates'
import { formatMoney } from '../../domain/money'
import { CardVisual } from './CardVisual'
import { paymentText } from './cardText'

/** Bloque de detalle de tarjeta: visual, próximo pago, ciclo y botón de pago. */
export function CardDetails({ card, summary }: { card: Account; summary: CardSummary }) {
  const p = paymentText(summary)
  const canPay = summary.debt > 0
  return (
    <>
      <CardVisual card={card} summary={summary} />
      <div className="rounded-[16px] bg-card p-4">
        <p className={`text-[20px] font-semibold ${p.tone}`}>{p.title}</p>
        <p className="mt-0.5 text-[15px] text-label-2">{p.detail}</p>
        {canPay && (
          <button
            onClick={() =>
              ui.openNewTx({
                type: 'transfer',
                toAccountId: card.id,
                amount: summary.toPay > 0 ? summary.toPay : summary.debt,
                note: `Pago ${card.name}`,
              })
            }
            className="pressable mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-blue text-[17px] font-semibold text-white"
          >
            <CreditCard size={20} strokeWidth={1.75} /> Pagar tarjeta
          </button>
        )}
        <p className="mt-2 text-[13px] leading-[18px] text-label-2">
          El pago es una transferencia desde tu banco: baja la deuda pero no cuenta como gasto, porque las compras ya se registraron.
        </p>
      </div>
      {summary.lastStatement && (
        <Group header="Ciclo de facturación">
          <Row title="Último corte" value={<span className="text-label-2">{formatDate(summary.lastStatement)}</span>} />
          <Row title="Deuda al corte" value={<span className="text-label-2">{formatMoney(summary.statementBalance)}</span>} />
          <Row title="Pagado desde el corte" value={<span className="text-label-2">{formatMoney(summary.paidSinceStatement)}</span>} />
          <Row title="Próximo corte" value={<span className="text-label-2">{formatDate(summary.nextStatement!)}</span>} />
          {card.creditLimit ? <Row title="Cupo total" value={<span className="text-label-2">{formatMoney(card.creditLimit)}</span>} /> : null}
        </Group>
      )}
    </>
  )
}
