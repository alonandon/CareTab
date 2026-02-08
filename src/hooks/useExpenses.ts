import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Expense } from '../types'

// ---------------------------------------------------------------------------
// Hook: useExpenses (expenses for a nanny instance, with realtime)
// ---------------------------------------------------------------------------

export function useExpenses(nannyInstanceId: string | undefined) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const fetchExpenses = useCallback(async () => {
    if (!nannyInstanceId) return
    setLoading(true)

    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('nanny_instance_id', nannyInstanceId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    setExpenses((data as Expense[]) ?? [])
    setLoading(false)
  }, [nannyInstanceId])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  // Realtime subscription
  useEffect(() => {
    if (!nannyInstanceId) return

    const channel = supabase
      .channel(`expenses:${nannyInstanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `nanny_instance_id=eq.${nannyInstanceId}`,
        },
        () => {
          fetchExpenses()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [nannyInstanceId, fetchExpenses])

  return { expenses, loading, refresh: fetchExpenses }
}

// ---------------------------------------------------------------------------
// Hook: useAllExpenses (all expenses across nanny's instances)
// ---------------------------------------------------------------------------

export function useAllExpenses(instanceIds: string[]) {
  const [expenses, setExpenses] = useState<
    (Expense & { nanny_instances: { id: string; name: string; household_id: string } })[]
  >([])
  const [loading, setLoading] = useState(true)

  const fetchExpenses = useCallback(async () => {
    if (instanceIds.length === 0) {
      setExpenses([])
      setLoading(false)
      return
    }
    setLoading(true)

    const { data } = await supabase
      .from('expenses')
      .select('*, nanny_instances(id, name, household_id)')
      .in('nanny_instance_id', instanceIds)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    setExpenses(data as typeof expenses ?? [])
    setLoading(false)
  }, [instanceIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  return { expenses, loading, refresh: fetchExpenses }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createExpense(params: {
  nanny_instance_id: string
  entered_by: string
  date: string
  amount: number
  description: string
  status: 'draft' | 'pending'
}): Promise<Expense | null> {
  const { data, error } = await supabase
    .from('expenses')
    .insert(params)
    .select()
    .single()

  if (error || !data) return null
  return data as Expense
}

export async function updateExpense(
  expenseId: string,
  params: {
    date?: string
    amount?: number
    description?: string
    notes?: string | null
  }
): Promise<boolean> {
  const { error } = await supabase
    .from('expenses')
    .update(params)
    .eq('id', expenseId)
  return !error
}

export async function deleteExpense(expenseId: string): Promise<boolean> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)
  return !error
}

export async function submitExpense(expenseId: string): Promise<boolean> {
  const { error } = await supabase
    .from('expenses')
    .update({ status: 'pending' })
    .eq('id', expenseId)
  return !error
}

export async function cancelExpenseSubmission(expenseId: string): Promise<boolean> {
  const { error } = await supabase
    .from('expenses')
    .update({ status: 'draft' })
    .eq('id', expenseId)
  return !error
}
