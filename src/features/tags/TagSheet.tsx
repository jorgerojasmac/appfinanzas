import { Check, Hash, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Transaction } from '../../db/types'
import { Group } from '../../components/ui/List'
import { Sheet, SheetButton } from '../../components/ui/Sheet'
import { useOnOpen } from '../../hooks/useOnOpen'
import { cleanTag, tagUsage } from '../../domain/filters'

/** Elegir o crear etiquetas libres (por ejemplo "viaje" o "maestria"). */
export function TagSheet({
  open,
  onClose,
  selected,
  onChange,
  transactions,
}: {
  open: boolean
  onClose: () => void
  selected: string[]
  onChange: (tags: string[]) => void
  transactions: Transaction[]
}) {
  const [draft, setDraft] = useState<string[]>([])
  const [text, setText] = useState('')
  const usage = useMemo(() => tagUsage(transactions), [transactions])

  useOnOpen(open, () => {
    setDraft(selected)
    setText('')
  })

  const toggle = (tag: string) => setDraft((d) => (d.includes(tag) ? d.filter((x) => x !== tag) : [...d, tag]))
  const add = () => {
    const tag = cleanTag(text)
    if (!tag) return
    if (!draft.includes(tag)) setDraft((d) => [...d, tag])
    setText('')
  }
  const all = [...new Set([...draft, ...usage.map((u) => u.tag)])]

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="auto"
      title="Etiquetas"
      left={<SheetButton onClick={onClose}>Cancelar</SheetButton>}
      right={
        <SheetButton
          bold
          onClick={() => {
            const pending = cleanTag(text)
            onChange(pending && !draft.includes(pending) ? [...draft, pending] : draft)
            onClose()
          }}
        >
          Listo
        </SheetButton>
      }
    >
      <div className="space-y-5">
        <Group footer="Usa etiquetas para agrupar gastos de distintas categorías, como un viaje o tu maestría. En Estadísticas verás el total por etiqueta.">
          <div className="flex min-h-11 items-center gap-3 bg-card px-4">
            <Hash size={20} strokeWidth={1.75} className="shrink-0 text-label-3" />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="Nueva etiqueta"
              enterKeyHint="done"
              autoCapitalize="none"
              className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-label-3"
            />
            {cleanTag(text) && (
              <button onClick={add} className="flex items-center gap-1 text-[17px] font-semibold text-blue">
                <Plus size={18} /> Agregar
              </button>
            )}
          </div>
        </Group>
        {all.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {all.map((tag) => {
              const on = draft.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => toggle(tag)}
                  className={`flex h-9 items-center gap-1 rounded-full px-3.5 text-[15px] transition-colors ${on ? 'bg-blue text-white' : 'bg-card text-label'}`}
                >
                  {on ? <Check size={15} strokeWidth={2.5} /> : <span className="text-label-3">#</span>}
                  {tag}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </Sheet>
  )
}
