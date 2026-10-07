import { HandCoins, Pencil, Plus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ui } from '../../app/uiStore'
import type { Person } from '../../db/types'
import { AnimatedMoney } from '../../components/ui/AnimatedNumber'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState, PrimaryButton } from '../../components/ui/Controls'
import { Card, Group } from '../../components/ui/List'
import { NavButton, Screen } from '../../components/ui/Screen'
import { Sheet, SheetButton } from '../../components/ui/Sheet'
import { useLedger, usePeople } from '../../hooks/data'
import { formatMoney } from '../../domain/money'
import { effectOnPerson, involvesPerson, personBalances } from '../../domain/shared'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { formatDateShort } from '../../domain/dates'
import { PersonSheet } from './PersonSheet'

export function balanceLabel(b: number) {
  if (b > 0) return { text: `Te debe ${formatMoney(b)}`, cls: 'text-green' }
  if (b < 0) return { text: `Le debes ${formatMoney(-b)}`, cls: 'text-red' }
  return { text: 'Al día', cls: 'text-label-2' }
}

export function SharedScreen() {
  const people = usePeople() ?? []
  const { transactions, categoryMap } = useLedger()
  const balances = useMemo(() => personBalances(transactions), [transactions])
  const [edit, setEdit] = useState<{ open: boolean; person?: Person }>({ open: false })
  const [detailId, setDetailId] = useState<string>()

  const owedToMe = [...balances.values()].filter((b) => b > 0).reduce((a, b) => a + b, 0)
  const iOwe = -[...balances.values()].filter((b) => b < 0).reduce((a, b) => a + b, 0)
  const detail = people.find((p) => p.id === detailId)
  const history = useMemo(
    () => (detailId ? transactions.filter((t) => involvesPerson(t, detailId)) : []),
    [transactions, detailId],
  )
  const detailBalance = detailId ? balances.get(detailId) ?? 0 : 0

  return (
    <Screen
      title="Compartidos"
      back="Planificación"
      right={
        <NavButton label="Agregar persona" onClick={() => setEdit({ open: true })}>
          <Plus size={26} strokeWidth={2} />
        </NavButton>
      }
    >
      {people.length === 0 ? (
        <EmptyState
          icon={<Users size={28} strokeWidth={1.5} />}
          title="Sin gastos compartidos"
          message="Agrega a las personas con las que compartes gastos. Al registrar un gasto, toca el ícono de personas para dividirlo."
          action={<PrimaryButton onClick={() => setEdit({ open: true })}>Agregar persona</PrimaryButton>}
        />
      ) : (
        <>
          <Card>
            <div className="grid grid-cols-2 divide-x-[0.5px] divide-separator">
              <div className="pr-4">
                <p className="text-[13px] text-label-2">Te deben</p>
                <AnimatedMoney value={owedToMe} className="font-rounded text-[26px] font-bold text-green" />
              </div>
              <div className="pl-4">
                <p className="text-[13px] text-label-2">Debes</p>
                <AnimatedMoney value={iOwe} className={`font-rounded text-[26px] font-bold ${iOwe ? 'text-red' : ''}`} />
              </div>
            </div>
          </Card>
          <Group header="Personas" footer="Solo tu parte de cada gasto compartido cuenta en tus presupuestos y estadísticas.">
            {people.map((p) => {
              const b = balances.get(p.id) ?? 0
              const l = balanceLabel(b)
              return (
                <button
                  key={p.id}
                  onClick={() => setDetailId(p.id)}
                  className="flex min-h-[60px] w-full items-center gap-3 bg-card px-4 py-2 text-left active:bg-fill-2"
                  style={{ ['--sep-inset' as string]: '64px' }}
                >
                  <Avatar name={p.name} color={p.color} />
                  <span className="flex-1 truncate text-[17px]">{p.name}</span>
                  <span className={`tabular text-[15px] ${l.cls}`}>{l.text}</span>
                </button>
              )
            })}
          </Group>
        </>
      )}

      <Sheet
        open={!!detail && !edit.open}
        onClose={() => setDetailId(undefined)}
        title={detail?.name}
        left={<SheetButton onClick={() => setDetailId(undefined)}>Cerrar</SheetButton>}
        right={
          <SheetButton onClick={() => setEdit({ open: true, person: detail })}>
            <Pencil size={20} strokeWidth={1.75} aria-label="Editar persona" />
          </SheetButton>
        }
      >
        {detail && (
          <div className="space-y-5">
            <Card className="flex flex-col items-center py-5 text-center">
              <Avatar name={detail.name} color={detail.color} size={64} />
              <AnimatedMoney
                value={Math.abs(detailBalance)}
                className={`mt-3 font-rounded text-[34px] font-bold ${balanceLabel(detailBalance).cls}`}
              />
              <p className="text-[15px] text-label-2">
                {detailBalance > 0 ? `${detail.name} te debe` : detailBalance < 0 ? `Le debes a ${detail.name}` : 'Están al día'}
              </p>
              {detailBalance !== 0 && (
              <button
                onClick={() => ui.openSettle(detail.id)}
                className="pressable mt-4 flex h-11 items-center gap-1.5 rounded-full bg-blue px-5 text-[17px] font-semibold text-white"
              >
                <HandCoins size={20} strokeWidth={1.75} /> Saldar cuentas
              </button>
              )}
            </Card>
            {history.length > 0 ? (
              <Group header="Historial">
                {history.map((t) => {
                  const effect = effectOnPerson(t, detail.id)
                  const cat = t.categoryId ? categoryMap.get(t.categoryId) : undefined
                  const isSettle = t.type === 'settlement'
                  return (
                    <button
                      key={t.id}
                      onClick={() => ui.openEditTx(t)}
                      className="flex min-h-[60px] w-full items-center gap-3 bg-card px-4 py-2 text-left active:bg-fill-2"
                      style={{ ['--sep-inset' as string]: '64px' }}
                    >
                      <CategoryIcon icon={isSettle ? 'Users' : cat?.icon} color={isSettle ? 'gray' : cat?.color} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[17px]">
                          {isSettle
                            ? t.settleDirection === 'received'
                              ? `${detail.name} te pagó`
                              : `Le pagaste a ${detail.name}`
                            : t.note || cat?.name}
                        </div>
                        <div className="truncate text-[13px] text-label-2">
                          {formatDateShort(t.date)}
                          {!isSettle && t.split && ` · ${t.split.paidBy === 'me' ? 'Pagaste tú' : `Pagó ${detail.name}`} ${formatMoney(t.amount)}`}
                        </div>
                      </div>
                      <div className="tabular shrink-0 text-right">
                        <div className={`text-[17px] ${isSettle ? 'text-label-2' : balanceLabel(effect).cls}`}>{formatMoney(isSettle ? t.amount : Math.abs(effect))}</div>
                        <div className="text-[11px] text-label-2">{isSettle ? 'saldado' : effect > 0 ? 'te debe' : effect < 0 ? 'le debes' : ''}</div>
                      </div>
                    </button>
                  )
                })}
              </Group>
            ) : (
              <p className="px-4 text-center text-[15px] text-label-2">Aún no hay gastos compartidos con {detail.name}.</p>
            )}
          </div>
        )}
      </Sheet>

      <PersonSheet open={edit.open} person={edit.person} count={people.length} onClose={() => setEdit((e) => ({ ...e, open: false }))} />
    </Screen>
  )
}
