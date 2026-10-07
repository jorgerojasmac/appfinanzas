import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, FlaskConical, Plus, Wallet } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ui } from '../../app/uiStore'
import { AnimatedMoney } from '../../components/ui/AnimatedNumber'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { EmptyState, PrimaryButton } from '../../components/ui/Controls'
import { Card, Group, Row, SectionTitle } from '../../components/ui/List'
import { Screen } from '../../components/ui/Screen'
import { loadSampleData } from '../../db/sampleData'
import { toast } from '../../components/ui/Toast'
import { useLedger } from '../../hooks/data'
import { addMonths, currentMonth, daysInMonth, formatLongToday, formatMonth, todayISO } from '../../domain/dates'
import { cardDebt, isLiquid, totalsForMonth } from '../../domain/ledger'
import { formatMoney } from '../../domain/money'
import { accountBalanceLabel, ACCOUNT_TYPE_LABEL } from '../accounts/accountLabels'
import { TransactionRow } from '../transactions/TransactionRow'

export function HomeScreen() {
  const navigate = useNavigate()
  const { ready, accounts, transactions, balances, accountMap, categoryMap } = useLedger()
  const month = currentMonth()

  const summary = useMemo(() => {
    const active = accounts.filter((a) => !a.archived)
    let liquid = 0
    let savings = 0
    let debt = 0
    for (const a of active) {
      const b = balances.get(a.id) ?? 0
      if (isLiquid(a)) liquid += b
      else if (a.type === 'savings') savings += b
      else if (a.type === 'credit') debt += cardDebt(b)
    }
    const thisMonth = totalsForMonth(transactions, month)
    const lastMonth = totalsForMonth(transactions, addMonths(month, -1))
    return { active, liquid, savings, debt, thisMonth, lastMonth }
  }, [accounts, balances, transactions, month])

  if (!ready) return <Screen title="Inicio" eyebrow={formatLongToday()}>{null}</Screen>

  const { active, liquid, savings, debt, thisMonth } = summary
  const recent = transactions.slice(0, 5)
  const max = Math.max(thisMonth.income, thisMonth.expense, 1)
  const day = Number(todayISO().slice(8, 10))
  const monthProgress = day / daysInMonth(month)

  return (
    <Screen title="Inicio" eyebrow={formatLongToday()}>
      {/* Saldo disponible */}
      <Card>
        <div className="flex items-center gap-2 text-[15px] text-label-2">
          <Wallet size={17} strokeWidth={1.75} />
          Saldo disponible
        </div>
        <AnimatedMoney
          value={liquid}
          fromZero
          className={`mt-1 block font-rounded text-[40px] leading-[48px] font-bold tracking-tight ${liquid < 0 ? 'text-red' : ''}`}
        />
        <p className="text-[13px] text-label-2">Efectivo y bancos</p>
        {(savings !== 0 || debt > 0) && (
          <div className="mt-3 flex gap-2">
            {savings !== 0 && <MiniStat label="Ahorros" value={formatMoney(savings)} />}
            {debt > 0 && <MiniStat label="Deuda tarjetas" value={formatMoney(debt)} tone="text-red" />}
          </div>
        )}
      </Card>

      {/* Ingresos vs gastos del mes */}
      <Card onClick={() => navigate('/movimientos')}>
        <div className="flex items-baseline justify-between">
          <h3 className="text-[17px] font-semibold">{formatMonth(month)}</h3>
          <span className="text-[13px] text-label-2">
            Día {day} de {daysInMonth(month)}
          </span>
        </div>
        <div className="mt-3 space-y-3">
          <FlowBar
            icon={<ArrowDownLeft size={16} strokeWidth={2} />}
            label="Ingresos"
            value={thisMonth.income}
            ratio={thisMonth.income / max}
            color="var(--green)"
          />
          <FlowBar
            icon={<ArrowUpRight size={16} strokeWidth={2} />}
            label="Gastos"
            value={thisMonth.expense}
            ratio={thisMonth.expense / max}
            color="var(--red)"
          />
        </div>
        <div className="mt-3 flex items-center justify-between border-t-[0.5px] border-separator pt-3">
          <span className="text-[15px] text-label-2">Balance del mes</span>
          <AnimatedMoney
            value={thisMonth.net}
            sign
            className={`text-[17px] font-semibold ${thisMonth.net >= 0 ? 'text-green' : 'text-red'}`}
          />
        </div>
        <MonthHint income={thisMonth.income} expense={thisMonth.expense} progress={monthProgress} />
      </Card>

      {transactions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wallet size={28} strokeWidth={1.5} />}
            title="Empecemos"
            message="Registra tu primer ingreso o gasto con el botón +. También puedes cargar datos de ejemplo para ver la app llena."
            action={
              <div className="flex flex-col gap-2">
                <PrimaryButton onClick={() => ui.openNewTx()}>
                  <span className="flex items-center gap-1.5">
                    <Plus size={20} /> Registrar movimiento
                  </span>
                </PrimaryButton>
                <PrimaryButton
                  tone="plain"
                  onClick={async () => {
                    await loadSampleData()
                    toast('Datos de ejemplo cargados')
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <FlaskConical size={18} /> Cargar datos de ejemplo
                  </span>
                </PrimaryButton>
              </div>
            }
          />
        </Card>
      ) : (
        <section>
          <SectionTitle
            title="Recientes"
            action={
              <Link to="/movimientos" className="text-[17px] text-blue">
                Ver todos
              </Link>
            }
          />
          <Group>
            {recent.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} categoryMap={categoryMap} accountMap={accountMap} />
            ))}
          </Group>
        </section>
      )}

      {/* Cuentas */}
      <section>
        <SectionTitle
          title="Cuentas"
          action={
            <Link to="/ajustes/cuentas" className="text-[17px] text-blue">
              Editar
            </Link>
          }
        />
        <Group>
          {active.map((a) => {
            const b = balances.get(a.id) ?? 0
            return (
              <Row
                key={a.id}
                onClick={() => navigate(`/cuentas/${a.id}`)}
                icon={<CategoryIcon icon={a.icon} color={a.color} />}
                title={a.name}
                subtitle={ACCOUNT_TYPE_LABEL[a.type]}
                value={
                  <span className={a.type === 'credit' ? (b < 0 ? 'text-red' : 'text-label-2') : b < 0 ? 'text-red' : ''}>
                    {a.type === 'credit' ? accountBalanceLabel(a, b).replace('Deuda ', '-') : formatMoney(b)}
                  </span>
                }
                chevron
              />
            )
          })}
        </Group>
      </section>
    </Screen>
  )
}

function MiniStat({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex-1 rounded-[10px] bg-card-2 px-3 py-2">
      <div className="text-[12px] text-label-2">{label}</div>
      <div className={`tabular text-[15px] font-semibold ${tone}`}>{value}</div>
    </div>
  )
}

function FlowBar({
  icon,
  label,
  value,
  ratio,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  ratio: number
  color: string
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[15px]">
        <span className="flex items-center gap-1.5" style={{ color }}>
          {icon}
          <span className="text-label">{label}</span>
        </span>
        <AnimatedMoney value={value} className="font-semibold" />
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-fill">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(ratio * 100, value > 0 ? 2 : 0)}%` }}
          transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
        />
      </div>
    </div>
  )
}

/** Frase breve que interpreta el mes en curso. */
function MonthHint({ income, expense, progress }: { income: number; expense: number; progress: number }) {
  let text: string
  if (income === 0 && expense === 0) text = 'Aún no hay movimientos este mes.'
  else if (income === 0) text = 'Todavía no registras ingresos este mes. Es normal con ingresos variables.'
  else {
    const pct = Math.round((expense / income) * 100)
    text =
      pct <= 100
        ? `Has gastado el ${pct}% de lo que ingresó este mes.`
        : `Tus gastos superan en ${pct - 100}% los ingresos del mes.`
    if (progress < 0.5 && pct > 70) text += ' Ojo: aún queda más de medio mes.'
  }
  return <p className="mt-2 text-[13px] leading-[18px] text-label-2">{text}</p>
}
