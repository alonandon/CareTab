import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { resolveRate, calculatePay, totalHoursFromPeriods, getWeekStartDate } from '../lib/pay'
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
  // Overtime breakdown (for time entries)
  regularHours?: number | null
  overtimeHours?: number | null
  regularRate?: number | null
  overtimeRate?: number | null
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
// Helper: Calculate overtime breakdown for a single entry with weekly overtime
// ---------------------------------------------------------------------------

interface OvertimeBreakdown {
  regularHours: number
  overtimeHours: number
  regularRate: number
  overtimeRate: number
}

function calculateWeeklyOvertimeBreakdown(
  entry: TERow,
  allTimeEntries: TERow[],
  rate: RateConfig
): OvertimeBreakdown | null {
  // Only calculate for weekly overtime rates
  if (!rate.overtime_enabled || rate.overtime_trigger_type !== 'weekly') {
    return null
  }

  const rateAmount = Number(rate.rate_amount)
  const threshold = Number(rate.overtime_trigger_hours ?? 40)
  const multiplier = Number(rate.overtime_multiplier ?? 1.5)
  const overtimeRate = rateAmount * multiplier

  // Get the week start date for this entry
  const weekStart = getWeekStartDate(entry.date)

  // Find all entries in the same week
  const weekEntries = allTimeEntries
    .filter(
      (e) =>
        getWeekStartDate(e.date) === weekStart &&
        e.nanny_instance_id === entry.nanny_instance_id
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  // Calculate hours up to and including this entry
  let hoursBeforeThisEntry = 0
  let thisEntryHours = totalHoursFromPeriods(entry.time_entry_periods)

  for (const e of weekEntries) {
    if (e.date < entry.date) {
      hoursBeforeThisEntry += totalHoursFromPeriods(e.time_entry_periods)
    } else if (e.date === entry.date && e.id === entry.id) {
      break
    }
  }

  // Calculate split for this entry
  const regularThreshold = Math.max(0, threshold - hoursBeforeThisEntry)
  const regularHours = Math.min(thisEntryHours, regularThreshold)
  const overtimeHours = Math.max(0, thisEntryHours - regularThreshold)

  return {
    regularHours: Math.round(regularHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    regularRate: rateAmount,
    overtimeRate: overtimeRate,
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

  // Poll for updates every 30s
  useEffect(() => {
    if (instanceIds.length === 0) return
    const id = setInterval(fetchAll, 30_000)
    return () => clearInterval(id)
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

      // Calculate overtime breakdown for weekly overtime entries
      const breakdown = rate ? calculateWeeklyOvertimeBreakdown(te, timeRows, rate) : null

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
        regularHours: breakdown?.regularHours ?? null,
        overtimeHours: breakdown?.overtimeHours ?? null,
        regularRate: breakdown?.regularRate ?? null,
        overtimeRate: breakdown?.overtimeRate ?? null,
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
