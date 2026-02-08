import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type {
  TimeEntry,
  TimeEntryPeriod,
  Expense,
  RateConfig,
} from '../types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PendingTimeEntry extends TimeEntry {
  time_entry_periods: TimeEntryPeriod[]
  nanny_instances: {
    id: string
    name: string
    household_id: string
    nanny_id: string
    rate_configs: RateConfig[]
    profiles: { full_name: string; email: string }
    households: { id: string; name: string }
  }
}

export interface PendingExpense extends Expense {
  nanny_instances: {
    id: string
    name: string
    household_id: string
    nanny_id: string
    profiles: { full_name: string; email: string }
    households: { id: string; name: string }
  }
}

// ---------------------------------------------------------------------------
// Hook: usePendingApprovals
// ---------------------------------------------------------------------------

export function usePendingApprovals(userId: string | undefined) {
  const [timeEntries, setTimeEntries] = useState<PendingTimeEntry[]>([])
  const [expenses, setExpenses] = useState<PendingExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [instanceIds, setInstanceIds] = useState<string[]>([])

  const fetchAll = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    // Get household IDs for this parent
    const { data: memberships } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('profile_id', userId)

    if (!memberships || memberships.length === 0) {
      setTimeEntries([])
      setExpenses([])
      setLoading(false)
      return
    }

    const householdIds = memberships.map((m) => m.household_id)

    // Get nanny instance IDs
    const { data: instances } = await supabase
      .from('nanny_instances')
      .select('id')
      .in('household_id', householdIds)
      .eq('is_active', true)

    const ids = instances?.map((i) => i.id) ?? []
    setInstanceIds(ids)

    if (ids.length === 0) {
      setTimeEntries([])
      setExpenses([])
      setLoading(false)
      return
    }

    // Fetch pending time entries and expenses in parallel
    const [teResult, expResult] = await Promise.all([
      supabase
        .from('time_entries')
        .select(
          '*, time_entry_periods(*), nanny_instances(id, name, household_id, nanny_id, rate_configs(*), profiles:nanny_id(full_name, email), households(id, name))'
        )
        .in('nanny_instance_id', ids)
        .eq('status', 'pending')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('expenses')
        .select(
          '*, nanny_instances(id, name, household_id, nanny_id, profiles:nanny_id(full_name, email), households(id, name))'
        )
        .in('nanny_instance_id', ids)
        .eq('status', 'pending')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
    ])

    setTimeEntries((teResult.data as PendingTimeEntry[]) ?? [])
    setExpenses((expResult.data as PendingExpense[]) ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Poll for updates every 30s
  useEffect(() => {
    if (instanceIds.length === 0) return
    const id = setInterval(fetchAll, 30_000)
    return () => clearInterval(id)
  }, [instanceIds.join(','), fetchAll]) // eslint-disable-line react-hooks/exhaustive-deps

  return { timeEntries, expenses, loading, refresh: fetchAll }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function approveTimeEntry(
  entryId: string,
  approvedBy: string
): Promise<boolean> {
  const { error } = await supabase
    .from('time_entries')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', entryId)
  return !error
}

export async function rejectTimeEntry(
  entryId: string,
  comment: string,
  authorId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('time_entries')
    .update({
      status: 'rejected',
      rejection_comment: comment,
    })
    .eq('id', entryId)

  if (error) return false

  // Save to comment history
  await supabase.from('comment_history').insert({
    entity_type: 'time_entry',
    entity_id: entryId,
    author_id: authorId,
    comment,
  })

  return true
}

export async function approveExpense(
  expenseId: string,
  approvedBy: string
): Promise<boolean> {
  const { error } = await supabase
    .from('expenses')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', expenseId)
  return !error
}

export async function rejectExpense(
  expenseId: string,
  comment: string,
  authorId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('expenses')
    .update({
      status: 'rejected',
      rejection_comment: comment,
    })
    .eq('id', expenseId)

  if (error) return false

  await supabase.from('comment_history').insert({
    entity_type: 'expense',
    entity_id: expenseId,
    author_id: authorId,
    comment,
  })

  return true
}

export async function batchApproveTimeEntries(
  entryIds: string[],
  approvedBy: string
): Promise<boolean> {
  const { error } = await supabase
    .from('time_entries')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .in('id', entryIds)
  return !error
}

export async function batchApproveExpenses(
  expenseIds: string[],
  approvedBy: string
): Promise<boolean> {
  const { error } = await supabase
    .from('expenses')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .in('id', expenseIds)
  return !error
}
