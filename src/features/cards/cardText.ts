import type { CardSummary } from '../../domain/cards'
import { formatDate, formatDayHeader } from '../../domain/dates'
import { formatMoney } from '../../domain/money'

/** Texto del próximo pago: "Pagar $500.00 antes del 10 oct (en 3 días)" */
export function paymentText(s: CardSummary): { title: string; detail: string; tone: string } {
  const when =
    s.daysToDue == null
      ? ''
      : s.daysToDue === 0
        ? 'hoy'
        : s.daysToDue === 1
          ? 'mañana'
          : s.daysToDue > 0
            ? `en ${s.daysToDue} días`
            : `hace ${-s.daysToDue} días`
  switch (s.status) {
    case 'due':
      return {
        title: `Pagar ${formatMoney(s.toPay)}`,
        detail: `Antes del ${formatDate(s.dueDate!)} (${when})`,
        tone: s.daysToDue != null && s.daysToDue <= 3 ? 'text-orange' : 'text-label',
      }
    case 'overdue':
      return { title: `Pago vencido: ${formatMoney(s.toPay)}`, detail: `Venció el ${formatDate(s.dueDate!)} (${when})`, tone: 'text-red' }
    case 'paid':
      return {
        title: 'Corte pagado',
        detail: s.dueDate ? `Próximo corte: ${formatDayHeader(s.nextStatement!)}` : 'Sin deuda',
        tone: 'text-green',
      }
    case 'estimate':
      return {
        title: `Próximo pago ≈ ${formatMoney(s.toPay)}`,
        detail: `Estimado al ${formatDate(s.dueDate!)}; se confirma en el corte del ${formatDate(s.nextStatement!)}`,
        tone: 'text-label',
      }
    default:
      return { title: `Deuda ${formatMoney(s.debt)}`, detail: 'Configura el día de corte y de pago para ver el próximo pago', tone: 'text-label-2' }
  }
}
