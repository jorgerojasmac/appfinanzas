import { useMemo } from 'react'
import { cushionAdvice, type CushionAdvice } from '../domain/cushion'
import { todayISO } from '../domain/dates'
import { useLedger } from './data'
import { useIncomeBase } from './planning'

export function useCushion(): CushionAdvice | null {
  const { ready, accounts, transactions } = useLedger()
  const base = useIncomeBase(transactions)
  return useMemo(() => {
    if (!ready) return null
    return cushionAdvice(accounts, transactions, base.effective, todayISO())
  }, [ready, accounts, transactions, base.effective])
}
