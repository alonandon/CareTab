import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { resolveRate, calculatePay, totalHoursFromPeriods } from '../lib/pay'
import type { RateConfig, TimeEntryPeriod } from '../types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TransactionType = 'time' | 'expense' | 'payment'
export type TransactionStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'logged'
  | 'accepted'

export interface Transaction {
  id: string
  date: string
  type: TransactionType
  description: string
  amount: number
  status: TransactionStatus
  hours: number | null
  rate: number | null
  notes: string | null
  instanceName: string
  householdName: string
  nannyInstanceId: string
}

export interface TransactionFilters {
  dateFrom: string
  dateTo: string
  types: TransactionType[]
  statuses: TransactionStatus[]
  sortBy: 'date' | 'amount'
  sortDir: 'asc' | 'desc'
}

// ---------------------------------------------------------------------------
// Raw DB row types
// ---------------------------------------------------------------------------

interface TERow {
  id: string
  date: string
  status: string
  notes: string | null
  nanny_instance_id: string
  time_entry_periods: TimeEntryPeriod[]
  nanny_instances: {
    id: string
    name: string
    household_id: string
    rate_configs: RateConfig[]
    households: { id: string; name: string }
  }
}

interface ExpRow {
  id: string
  date: string
  status: string
  amount: number
  description: string
  nanny_instance_id: string
  nanny_instances: {
    id: string
    name: string
    household_id: string
    households: { id: string; name: string }
  }
}

interface PayRow {
  id: string
  date: string
  status: string
  amount: number
  method: string | null
  nanny_instance_id: string
  nanny_instances: {
    id: string
    name: string
    household_id: string
    households: { id: string; name: string }
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50

export function useTransactions(instanceIds: string[]) {
  const [timeRows, setTimeRows] = useState<TERow[]>([])
  const [expenseRows, setExpenseRows] = useState<ExpRow[]>([])
  const [paymentRows, setPaymentRows] = useState<PayRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (instanceIds.length === 0) {
      setTimeRows([])
      setExpenseRows([])
      setPaymentRows([])
      setLoading(false)
      return
    }
    setLoading(true)

    const [teResult, expResult, payResult] = await Promise.all([
      supabase
        .from('time_entries')
        .select(
          '*, time_entry_periods(*), nanny_instances(id, name, household_id, rate_configs(*), households(id, name))'
        )
        .in('nanny_instance_id', instanceIds)
        .order('date', { ascending: false }),
      supabase
        .from('expenses')
        .select(
          '*, nanny_instances(id, name, household_id, households(id, name))'
        )
        .in('nanny_instance_id', instanceIds)
        .order('date', { ascending: false }),
      supabase
        .from('payments')
        .select(
          '*, nanny_instances(id, name, household_id, households(id, name))'
        )
        .in('nanny_instance_id', instanceIds)
        .order('date', { ascending: false }),
    ])

    setTimeRows((teResult.data as TERow[]) ?? [])
    setExpenseRows((expResult.data as ExpRow[]) ?? [])
    setPaymentRows((payResult.data as PayRow[]) ?? [])
    setLoading(false)
  }, [instanceIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Realtime: re-fetch on any change
  useEffect(() => {
    if (instanceIds.length === 0) return

    const channels = instanceIds.flatMap((id) => [
      supabase
        .channel(`txn_te:${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'time_entries', filter: `nanny_instance_id=eq.${id}` }, () => fetchAll())
        .subscribe(),
      supabase
        .channel(`txn_exp:${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `nanny_instance_id=eq.${id}` }, () => fetchAll())
        .subscribe(),
      supabase
        .channel(`txn_pay:${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `nanny_instance_id=eq.${id}` }, () => fetchAll())
        .subscribe(),
    ])

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch))
    }
  }, [instanceIds.join(','), fetchAll]) // eslint-disable-line react-hooks/exhaustive-deps

  // Transform raw rows into unified Transaction[]
  const allTransactions = useMemo<Transaction[]>(() => {
    const txns: Transaction[] = []

    for (const te of timeRows) {
      const ni = te.nanny_instances
      const rates = ni?.rate_configs ?? []
      const rate = resolveRate(rates, te.date)
      const hours =
        te.time_entry_periods.length > 0
          ? totalHoursFromPeriods(te.time_entry_periods)
          : null
      let amount = 0
      if (rate && te.time_entry_periods.length > 0) {
        amount = calculatePay(te.time_entry_periods, rate).totalPay
      } else if (rate?.rate_type === 'weekly') {
        amount = rate.rate_amount
      }

      const periods = te.time_entry_periods
        .map((p) => `${p.start_time.slice(0, 5)}–${p.end_time.slice(0, 5)}`)
        .join(', ')

      txns.push({
        id: te.id,
        date: te.date,
        type: 'time',
        description: periods || 'Time entry',
        amount,
        status: te.status as TransactionStatus,
        hours: hours !== null ? Math.round(hours * 100) / 100 : null,
        rate: rate?.rate_amount ?? null,
        notes: te.notes,
        instanceName: ni?.name ?? '',
        householdName: ni?.households?.name ?? '',
        nannyInstanceId: te.nanny_instance_id,
      })
    }

    for (const exp of expenseRows) {
      const ni = exp.nanny_instances
      txns.push({
        id: exp.id,
        date: exp.date,
        type: 'expense',
        description: exp.description,
        amount: Number(exp.amount),
        status: exp.status as TransactionStatus,
        hours: null,
        rate: null,
        notes: null,
        instanceName: ni?.name ?? '',
        householdName: ni?.households?.name ?? '',
        nannyInstanceId: exp.nanny_instance_id,
      })
    }

    for (const pay of paymentRows) {
      const ni = pay.nanny_instances
      const methodLabel = pay.method
        ? pay.method.charAt(0).toUpperCase() + pay.method.slice(1).replace('_', ' ')
        : 'Payment'
      txns.push({
        id: pay.id,
        date: pay.date,
        type: 'payment',
        description: methodLabel,
        amount: Number(pay.amount),
        status: pay.status as TransactionStatus,
        hours: null,
        rate: null,
        notes: null,
        instanceName: ni?.name ?? '',
        householdName: ni?.households?.name ?? '',
        nannyInstanceId: pay.nanny_instance_id,
      })
    }

    return txns
  }, [timeRows, expenseRows, paymentRows])

  return { transactions: allTransactions, loading, refresh: fetchAll }
}

// ---------------------------------------------------------------------------
// Filtering + sorting + pagination (pure functions)
// ---------------------------------------------------------------------------

export function applyFilters(
  transactions: Transaction[],
  filters: TransactionFilters
): Transaction[] {
  let result = transactions

  if (filters.dateFrom) {
    result = result.filter((t) => t.date >= filters.dateFrom)
  }
  if (filters.dateTo) {
    result = result.filter((t) => t.date <= filters.dateTo)
  }
  if (filters.types.length > 0) {
    result = result.filter((t) => filters.types.includes(t.type))
  }
  if (filters.statuses.length > 0) {
    result = result.filter((t) => filters.statuses.includes(t.status))
  }

  result.sort((a, b) => {
    const key = filters.sortBy
    if (key === 'date') {
      const cmp = a.date.localeCompare(b.date)
      return filters.sortDir === 'asc' ? cmp : -cmp
    }
    const cmp = a.amount - b.amount
    return filters.sortDir === 'asc' ? cmp : -cmp
  })

  return result
}

export function paginate(
  transactions: Transaction[],
  page: number
): { items: Transaction[]; hasMore: boolean } {
  const start = 0
  const end = page * PAGE_SIZE
  return {
    items: transactions.slice(start, end),
    hasMore: end < transactions.length,
  }
}
