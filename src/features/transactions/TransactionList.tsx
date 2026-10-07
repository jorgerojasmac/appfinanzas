import { useEffect, useMemo, useRef, useState } from 'react'
import type { Account, Category, Transaction } from '../../db/types'
import { Group } from '../../components/ui/List'
import { formatDayHeader } from '../../domain/dates'
import { formatMoney } from '../../domain/money'
import { TransactionRow } from './TransactionRow'

const PAGE = 120

/** Lista agrupada por día, con carga progresiva al hacer scroll. */
export function TransactionList({
  transactions,
  categoryMap,
  accountMap,
  perspective,
}: {
  transactions: Transaction[]
  categoryMap: Map<string, Category>
  accountMap: Map<string, Account>
  perspective?: string
}) {
  const [limit, setLimit] = useState(PAGE)
  const sentinel = useRef<HTMLDivElement>(null)

  const groups = useMemo(() => {
    const out: Array<{ date: string; items: Transaction[]; spent: number }> = []
    for (const tx of transactions.slice(0, limit)) {
      let g = out[out.length - 1]
      if (!g || g.date !== tx.date) {
        g = { date: tx.date, items: [], spent: 0 }
        out.push(g)
      }
      g.items.push(tx)
      if (tx.type === 'expense') g.spent += tx.myAmount
    }
    return out
  }, [transactions, limit])

  useEffect(() => {
    const el = sentinel.current
    if (!el || limit >= transactions.length) return
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setLimit((l) => l + PAGE),
      { rootMargin: '600px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [limit, transactions.length])

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <Group
          key={g.date}
          header={<span className="normal-case">{formatDayHeader(g.date)}</span>}
          headerRight={
            g.spent > 0 ? (
              <span className="tabular text-[13px] text-label-2">{formatMoney(-g.spent)}</span>
            ) : undefined
          }
        >
          {g.items.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} categoryMap={categoryMap} accountMap={accountMap} perspective={perspective} />
          ))}
        </Group>
      ))}
      <div ref={sentinel} />
    </div>
  )
}
