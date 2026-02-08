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

    const bal = calculateBalance(
      (teResult.data as TimeEntryForCalc[]) ?? [],
      (expResult.data as ExpenseForCalc[]) ?? [],
      (payResult.data as PaymentForCalc[]) ?? [],
      (rateResult.data as RateConfig[]) ?? []
    )

    setBalance(bal)
    setLoading(false)
  }, [nannyInstanceId])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  // Realtime: re-fetch when any relevant table changes
  useEffect(() => {
    if (!nannyInstanceId) return

    const channels = [
      supabase
        .channel(`balance_te:${nannyInstanceId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'time_entries', filter: `nanny_instance_id=eq.${nannyInstanceId}` }, () => fetchBalance())
        .subscribe(),
      supabase
        .channel(`balance_exp:${nannyInstanceId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `nanny_instance_id=eq.${nannyInstanceId}` }, () => fetchBalance())
        .subscribe(),
      supabase
        .channel(`balance_pay:${nannyInstanceId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `nanny_instance_id=eq.${nannyInstanceId}` }, () => fetchBalance())
        .subscribe(),
    ]

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch))
    }
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

  // Realtime for each instance
  useEffect(() => {
    if (instanceIds.length === 0) return

    const channels = instanceIds.flatMap((id) => [
      supabase.channel(`mbal_te:${id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'time_entries', filter: `nanny_instance_id=eq.${id}` }, () => fetchAll()).subscribe(),
      supabase.channel(`mbal_exp:${id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `nanny_instance_id=eq.${id}` }, () => fetchAll()).subscribe(),
      supabase.channel(`mbal_pay:${id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `nanny_instance_id=eq.${id}` }, () => fetchAll()).subscribe(),
    ])

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch))
    }
  }, [instanceIds.join(','), fetchAll]) // eslint-disable-line react-hooks/exhaustive-deps

  return { balances, loading, refresh: fetchAll }
}
