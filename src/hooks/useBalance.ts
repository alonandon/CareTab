import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { resolveRate, calculatePay } from '../lib/pay'
import type { RateConfig, TimeEntryPeriod } from '../types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Balance {
  approvedOwed: number
  pendingApproval: number
  totalOwed: number
}

interface TimeEntryForCalc {
  date: string
  status: string
  time_entry_periods: TimeEntryPeriod[]
}

interface ExpenseForCalc {
  amount: number
  status: string
}

interface PaymentForCalc {
  amount: number
  status: string
}

// ---------------------------------------------------------------------------
// Pure calculation (exported for reuse)
// ---------------------------------------------------------------------------

export function calculateBalance(
  timeEntries: TimeEntryForCalc[],
  expenses: ExpenseForCalc[],
  payments: PaymentForCalc[],
  rates: RateConfig[]
): Balance {
  let approvedTimePay = 0
  let pendingTimePay = 0

  for (const entry of timeEntries) {
    const rate = resolveRate(rates, entry.date)
    if (!rate) continue

    let entryPay: number
    if (entry.time_entry_periods.length > 0) {
      entryPay = calculatePay(entry.time_entry_periods, rate).totalPay
    } else if (rate.rate_type === 'weekly') {
      entryPay = rate.rate_amount
    } else {
      continue
    }

    if (entry.status === 'approved') {
      approvedTimePay += entryPay
    } else if (entry.status === 'pending') {
      pendingTimePay += entryPay
    }
  }

  let approvedExpenses = 0
  let pendingExpenses = 0
  for (const exp of expenses) {
    const amt = Number(exp.amount)
    if (exp.status === 'approved') approvedExpenses += amt
    else if (exp.status === 'pending') pendingExpenses += amt
  }

  let acceptedPayments = 0
  for (const pay of payments) {
    if (pay.status === 'accepted') acceptedPayments += Number(pay.amount)
  }

  const approvedOwed = round(approvedTimePay + approvedExpenses - acceptedPayments)
  const pendingApproval = round(pendingTimePay + pendingExpenses)
  const totalOwed = round(approvedOwed + pendingApproval)

  return { approvedOwed, pendingApproval, totalOwed }
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

// ---------------------------------------------------------------------------
// Hook: useBalance (for a single nanny instance)
// ---------------------------------------------------------------------------

export function useBalance(nannyInstanceId: string | undefined) {
  const [balance, setBalance] = useState<Balance>({ approvedOwed: 0, pendingApproval: 0, totalOwed: 0 })
  const [loading, setLoading] = useState(true)

  const fetchBalance = useCallback(async () => {
    if (!nannyInstanceId) {
      setBalance({ approvedOwed: 0, pendingApproval: 0, totalOwed: 0 })
      setLoading(false)
      return
    }
    setLoading(true)

    const [teResult, expResult, payResult, rateResult] = await Promise.all([
      supabase
        .from('time_entries')
        .select('date, status, time_entry_periods(start_time, end_time)')
        .eq('nanny_instance_id', nannyInstanceId)
        .in('status', ['approved', 'pending']),
      supabase
        .from('expenses')
        .select('amount, status')
        .eq('nanny_instance_id', nannyInstanceId)
        .in('status', ['approved', 'pending']),
      supabase
        .from('payments')
        .select('amount, status')
        .eq('nanny_instance_id', nannyInstanceId)
        .eq('status', 'accepted'),
      supabase
        .from('rate_configs')
        .select('*')
        .eq('nanny_instance_id', nannyInstanceId),
    ])

    if (teResult.error) console.warn('[useBalance] time_entries error:', teResult.error)
    if (expResult.error) console.warn('[useBalance] expenses error:', expResult.error)
    if (payResult.error) console.warn('[useBalance] payments error:', payResult.error)
    if (rateResult.error) console.warn('[useBalance] rate_configs error:', rateResult.error)

    const rates = (rateResult.data as RateConfig[]) ?? []
    const entries = (teResult.data as TimeEntryForCalc[]) ?? []

    const bal = calculateBalance(
      entries,
      (expResult.data as ExpenseForCalc[]) ?? [],
      (payResult.data as PaymentForCalc[]) ?? [],
      rates
    )

    setBalance(bal)
    setLoading(false)
  }, [nannyInstanceId])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  // Poll for updates every 30s
  useEffect(() => {
    if (!nannyInstanceId) return
    const id = setInterval(fetchBalance, 30_000)
    return () => clearInterval(id)
  }, [nannyInstanceId, fetchBalance])

  return { balance, loading, refresh: fetchBalance }
}

// ---------------------------------------------------------------------------
// Hook: useMultiBalance (balances for multiple nanny instances)
// ---------------------------------------------------------------------------

export function useMultiBalance(instanceIds: string[]) {
  const [balances, setBalances] = useState<Record<string, Balance>>({})
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (instanceIds.length === 0) {
      setBalances({})
      setLoading(false)
      return
    }
    setLoading(true)

    const [teResult, expResult, payResult, rateResult] = await Promise.all([
      supabase
        .from('time_entries')
        .select('nanny_instance_id, date, status, time_entry_periods(start_time, end_time)')
        .in('nanny_instance_id', instanceIds)
        .in('status', ['approved', 'pending']),
      supabase
        .from('expenses')
        .select('nanny_instance_id, amount, status')
        .in('nanny_instance_id', instanceIds)
        .in('status', ['approved', 'pending']),
      supabase
        .from('payments')
        .select('nanny_instance_id, amount, status')
        .in('nanny_instance_id', instanceIds)
        .eq('status', 'accepted'),
      supabase
        .from('rate_configs')
        .select('*')
        .in('nanny_instance_id', instanceIds),
    ])

    type TERow = TimeEntryForCalc & { nanny_instance_id: string }
    type ExpRow = ExpenseForCalc & { nanny_instance_id: string }
    type PayRow = PaymentForCalc & { nanny_instance_id: string }

    if (teResult.error) console.warn('[useMultiBalance] time_entries error:', teResult.error)
    if (expResult.error) console.warn('[useMultiBalance] expenses error:', expResult.error)
    if (payResult.error) console.warn('[useMultiBalance] payments error:', payResult.error)
    if (rateResult.error) console.warn('[useMultiBalance] rate_configs error:', rateResult.error)

    const teRows = (teResult.data as TERow[]) ?? []
    const expRows = (expResult.data as ExpRow[]) ?? []
    const payRows = (payResult.data as PayRow[]) ?? []
    const rateRows = (rateResult.data as RateConfig[]) ?? []

    const result: Record<string, Balance> = {}
    for (const id of instanceIds) {
      result[id] = calculateBalance(
        teRows.filter((t) => t.nanny_instance_id === id),
        expRows.filter((e) => e.nanny_instance_id === id),
        payRows.filter((p) => p.nanny_instance_id === id),
        rateRows.filter((r) => r.nanny_instance_id === id)
      )
    }

    setBalances(result)
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

  return { balances, loading, refresh: fetchAll }
}

// ---------------------------------------------------------------------------
// Hook: useHouseholdBalance (aggregate balance for an entire household)
// Simpler alternative to useHouseholdDetail + useMultiBalance
// ---------------------------------------------------------------------------

export function useHouseholdBalance(householdId: string | undefined) {
  const [balance, setBalance] = useState<Balance | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchBalance = useCallback(async () => {
    if (!householdId) {
      setBalance(null)
      setLoading(false)
      return
    }

    // Get active nanny instance IDs for this household
    const { data: instances, error: instError } = await supabase
      .from('nanny_instances')
      .select('id')
      .eq('household_id', householdId)
      .eq('is_active', true)

    if (instError) {
      console.warn('[useHouseholdBalance] nanny_instances error:', instError)
      setBalance(null)
      setLoading(false)
      return
    }

    const ids = (instances ?? []).map((i) => i.id)
    if (ids.length === 0) {
      setBalance(null)
      setLoading(false)
      return
    }

    const [teResult, expResult, payResult, rateResult] = await Promise.all([
      supabase
        .from('time_entries')
        .select('nanny_instance_id, date, status, time_entry_periods(start_time, end_time)')
        .in('nanny_instance_id', ids)
        .in('status', ['approved', 'pending']),
      supabase
        .from('expenses')
        .select('nanny_instance_id, amount, status')
        .in('nanny_instance_id', ids)
        .in('status', ['approved', 'pending']),
      supabase
        .from('payments')
        .select('nanny_instance_id, amount, status')
        .in('nanny_instance_id', ids)
        .eq('status', 'accepted'),
      supabase
        .from('rate_configs')
        .select('*')
        .in('nanny_instance_id', ids),
    ])

    if (teResult.error) console.warn('[useHouseholdBalance] time_entries error:', teResult.error)
    if (expResult.error) console.warn('[useHouseholdBalance] expenses error:', expResult.error)
    if (payResult.error) console.warn('[useHouseholdBalance] payments error:', payResult.error)
    if (rateResult.error) console.warn('[useHouseholdBalance] rate_configs error:', rateResult.error)

    type TERow = TimeEntryForCalc & { nanny_instance_id: string }
    type ExpRow = ExpenseForCalc & { nanny_instance_id: string }
    type PayRow = PaymentForCalc & { nanny_instance_id: string }

    const teRows = (teResult.data as TERow[]) ?? []
    const expRows = (expResult.data as ExpRow[]) ?? []
    const payRows = (payResult.data as PayRow[]) ?? []
    const rateRows = (rateResult.data as RateConfig[]) ?? []

    const agg: Balance = { approvedOwed: 0, pendingApproval: 0, totalOwed: 0 }

    for (const id of ids) {
      const bal = calculateBalance(
        teRows.filter((t) => t.nanny_instance_id === id),
        expRows.filter((e) => e.nanny_instance_id === id),
        payRows.filter((p) => p.nanny_instance_id === id),
        rateRows.filter((r) => r.nanny_instance_id === id)
      )
      agg.approvedOwed += bal.approvedOwed
      agg.pendingApproval += bal.pendingApproval
      agg.totalOwed += bal.totalOwed
    }

    agg.approvedOwed = round(agg.approvedOwed)
    agg.pendingApproval = round(agg.pendingApproval)
    agg.totalOwed = round(agg.totalOwed)

    setBalance(agg)
    setLoading(false)
  }, [householdId])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  // Poll for updates every 30s
  useEffect(() => {
    if (!householdId) return
    const id = setInterval(fetchBalance, 30_000)
    return () => clearInterval(id)
  }, [householdId, fetchBalance])

  return { balance, loading, refresh: fetchBalance }
}
