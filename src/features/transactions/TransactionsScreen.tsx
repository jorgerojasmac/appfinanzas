import { ArrowLeftRight, Plus } from 'lucide-react'
import { ui } from '../../app/uiStore'
import { EmptyState, PrimaryButton } from '../../components/ui/Controls'
import { Screen } from '../../components/ui/Screen'
import { useLedger } from '../../hooks/data'
import { TransactionList } from './TransactionList'

export function TransactionsScreen() {
  const { ready, transactions, categoryMap, accountMap } = useLedger()
  return (
    <Screen title="Movimientos">
      {ready && transactions.length === 0 && (
        <EmptyState
          icon={<ArrowLeftRight size={28} strokeWidth={1.5} />}
          title="Sin movimientos"
          message="Aquí verás tus ingresos, gastos y transferencias agrupados por día. Desliza uno hacia la izquierda para editarlo o borrarlo."
          action={
            <PrimaryButton onClick={() => ui.openNewTx()}>
              <span className="flex items-center gap-1.5">
                <Plus size={20} /> Registrar movimiento
              </span>
            </PrimaryButton>
          }
        />
      )}
      <TransactionList transactions={transactions} categoryMap={categoryMap} accountMap={accountMap} />
    </Screen>
  )
}
