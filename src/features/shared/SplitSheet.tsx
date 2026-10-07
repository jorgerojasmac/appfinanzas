import { Check, UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { personName, usePeopleMap } from '../../app/PeopleContext'
import { savePerson } from '../../db/repo'
import type { Person } from '../../db/types'
import { Avatar } from '../../components/ui/Avatar'
import { COLOR_NAMES } from '../../components/ui/colors'
import { Segmented } from '../../components/ui/Controls'
import { Group, Row } from '../../components/ui/List'
import { Sheet, SheetButton } from '../../components/ui/Sheet'
import { useOnOpen } from '../../hooks/useOnOpen'
import { buildSplit, ME, type SplitDraft, type SplitMode } from '../../domain/shared'
import { centsToInput, formatMoney, parseMoney, splitEvenly } from '../../domain/money'

/** Valores iniciales para un modo: partes iguales expresadas en % o en montos. */
function defaultValues(mode: SplitMode, participants: string[], total: number): Record<string, number> {
  const out: Record<string, number> = {}
  if (mode === 'percent') {
    const base = Math.floor((100 / participants.length) * 10) / 10
    participants.forEach((p, i) => {
      out[p] = i === 0 ? Math.round((100 - base * (participants.length - 1)) * 10) / 10 : base
    })
  } else if (mode === 'amount') {
    const parts = splitEvenly(total, participants.length)
    participants.forEach((p, i) => (out[p] = parts[i]))
  }
  return out
}

export function SplitSheet({
  open,
  onClose,
  total,
  people,
  draft,
  onApply,
}: {
  open: boolean
  onClose: () => void
  total: number
  people: Person[]
  draft?: SplitDraft
  onApply: (d: SplitDraft | undefined) => void
}) {
  const peopleMap = usePeopleMap()
  const [participants, setParticipants] = useState<string[]>([ME])
  const [paidBy, setPaidBy] = useState(ME)
  const [mode, setMode] = useState<SplitMode>('equal')
  const [values, setValues] = useState<Record<string, number>>({})
  // Texto de los campos editables (para no reformatear mientras se escribe)
  const [texts, setTexts] = useState<Record<string, string>>({})
  const [newName, setNewName] = useState('')

  useOnOpen(open, () => {
    if (draft) {
      setParticipants(draft.participants)
      setPaidBy(draft.paidBy)
      setMode(draft.mode)
      setValues(draft.values)
      setTexts(toTexts(draft.mode, draft.values))
    } else {
      // Por defecto: yo + la primera persona, partes iguales, pagué yo
      const first = people[0]?.id
      setParticipants(first ? [ME, first] : [ME])
      setPaidBy(ME)
      setMode('equal')
      setValues({})
      setTexts({})
    }
    setNewName('')
  })

  const current: SplitDraft = { mode, paidBy, participants, values }
  const result = useMemo(() => buildSplit(total, current), [total, mode, paidBy, participants, values]) // eslint-disable-line react-hooks/exhaustive-deps

  const resetValues = (m: SplitMode, list: string[]) => {
    const v = defaultValues(m, list, total)
    setValues(v)
    setTexts(toTexts(m, v))
  }

  const toggle = (id: string) => {
    const next = participants.includes(id) ? participants.filter((p) => p !== id) : [...participants, id]
    setParticipants(next)
    if (!next.includes(paidBy) && paidBy !== ME) setPaidBy(ME)
    resetValues(mode, next)
  }

  const changeMode = (m: SplitMode) => {
    setMode(m)
    resetValues(m, participants)
  }

  const setValue = (who: string, text: string) => {
    const clean = text.replace(/[^0-9.]/g, '')
    setTexts((t) => ({ ...t, [who]: clean }))
    setValues((v) => ({ ...v, [who]: mode === 'percent' ? Number(clean) || 0 : parseMoney(clean) }))
  }

  const addPerson = async () => {
    const name = newName.trim()
    if (!name) return
    const id = await savePerson({ name, color: COLOR_NAMES[(people.length * 3 + 1) % COLOR_NAMES.length] })
    setNewName('')
    toggle(id)
  }

  const payers = [ME, ...participants.filter((p) => p !== ME)]
  if (!payers.includes(paidBy)) payers.push(paidBy)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Dividir gasto"
      left={<SheetButton onClick={onClose}>Cancelar</SheetButton>}
      right={
        <SheetButton
          bold
          disabled={!result.ok}
          onClick={() => {
            onApply(current)
            onClose()
          }}
        >
          Listo
        </SheetButton>
      }
    >
      <div className="space-y-6">
        <p className="tabular text-center font-rounded text-[34px] font-bold">{formatMoney(total)}</p>

        <Group header="Con quién" footer="Solo tu parte contará como tu gasto en presupuestos y estadísticas.">
          {[ME, ...people.map((p) => p.id)].map((id) => {
            const on = participants.includes(id)
            const p = peopleMap.get(id)
            return (
              <Row
                key={id}
                icon={<Avatar name={id === ME ? 'Yo' : p?.name ?? '?'} color={id === ME ? 'blue' : p?.color} size={32} />}
                inset={60}
                title={id === ME ? 'Yo' : p?.name}
                onClick={() => toggle(id)}
                value={
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] ${on ? 'border-blue bg-blue text-white' : 'border-label-3'}`}
                  >
                    {on && <Check size={15} strokeWidth={3} />}
                  </span>
                }
              />
            )
          })}
          <div className="flex min-h-11 items-center gap-3 bg-card px-4" style={{ ['--sep-inset' as string]: '60px' }}>
            <UserPlus size={22} strokeWidth={1.75} className="mx-[5px] shrink-0 text-blue" />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPerson()}
              placeholder="Agregar persona"
              enterKeyHint="done"
              className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-label-3"
            />
            {newName.trim() && (
              <button onClick={addPerson} className="text-[17px] font-semibold text-blue">
                Agregar
              </button>
            )}
          </div>
        </Group>

        <div>
          <h3 className="px-4 pb-1.5 text-[13px] text-label-2 uppercase">¿Quién pagó?</h3>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {payers.map((id) => {
              const on = paidBy === id
              const p = peopleMap.get(id)
              return (
                <button
                  key={id}
                  onClick={() => setPaidBy(id)}
                  className={`flex h-10 shrink-0 items-center gap-2 rounded-full pr-4 pl-1.5 text-[15px] transition-colors ${on ? 'bg-blue text-white' : 'bg-card'}`}
                >
                  <span className={`rounded-full ${on ? 'ring-2 ring-white/80' : ''}`}>
                    <Avatar name={id === ME ? 'Yo' : p?.name ?? '?'} color={id === ME ? 'blue' : p?.color} size={28} />
                  </span>
                  {id === ME ? 'Yo' : p?.name}
                </button>
              )
            })}
          </div>
        </div>

        <Segmented
          value={mode}
          onChange={changeMode}
          options={[
            { value: 'equal', label: 'Iguales' },
            { value: 'percent', label: 'Porcentaje' },
            { value: 'amount', label: 'Montos' },
          ]}
        />

        {participants.length > 0 && (
          <Group
            footer={
              result.ok ? (
                <span className="tabular">{summary(result.split.shares, paidBy, peopleMap)}</span>
              ) : (
                <span className="text-red">{result.error}</span>
              )
            }
          >
            {participants.map((id) => {
              const p = peopleMap.get(id)
              const share = result.ok ? result.split.shares.find((s) => s.who === id)?.amount ?? 0 : null
              return (
                <div key={id} className="flex min-h-11 items-center gap-3 bg-card px-4" style={{ ['--sep-inset' as string]: '60px' }}>
                  <Avatar name={id === ME ? 'Yo' : p?.name ?? '?'} color={id === ME ? 'blue' : p?.color} size={32} />
                  <span className="flex-1 text-[17px]">{personName(id, peopleMap)}</span>
                  {mode === 'equal' ? (
                    <span className="tabular text-[17px] text-label-2">{share != null ? formatMoney(share) : '—'}</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      {mode === 'amount' && <span className="text-label-3">$</span>}
                      <input
                        inputMode="decimal"
                        value={texts[id] ?? ''}
                        onChange={(e) => setValue(id, e.target.value)}
                        className="tabular w-20 rounded-[8px] bg-fill px-2 py-1 text-right text-[17px] outline-none"
                      />
                      {mode === 'percent' && <span className="text-label-2">%</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </Group>
        )}

        {draft && (
          <Group>
            <Row
              title="Quitar división"
              destructive
              onClick={() => {
                onApply(undefined)
                onClose()
              }}
            />
          </Group>
        )}
      </div>
    </Sheet>
  )
}

function toTexts(mode: SplitMode, values: Record<string, number>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(values)) out[k] = mode === 'percent' ? String(v) : centsToInput(v)
  return out
}

/** "Tu parte: $30.00 · Ana te deberá $30.00" */
function summary(shares: Array<{ who: string; amount: number }>, paidBy: string, map: Map<string, Person>): string {
  const mine = shares.find((s) => s.who === ME)?.amount ?? 0
  const parts = [`Tu parte: ${formatMoney(mine)}`]
  if (paidBy === ME) {
    for (const s of shares) if (s.who !== ME && s.amount > 0) parts.push(`${personName(s.who, map)} te deberá ${formatMoney(s.amount)}`)
  } else if (mine > 0) {
    parts.push(`Le deberás ${formatMoney(mine)} a ${personName(paidBy, map)}`)
  }
  return parts.join(' · ')
}
