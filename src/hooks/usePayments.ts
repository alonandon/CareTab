import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Payment } from '../types'

// ---------------------------------------------------------------------------
// Hook: usePayments (payments for a nanny instance, with realtime)
// ---------------------------------------------------------------------------

export function usePayments(nannyInstanceId: string | undefined) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPayments = useCallback(async () => {
    if (!nannyInstanceId) return
    setLoading(true)

    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('nanny_instance_id', nannyInstanceId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    setPayments((data as Payment[]) ?? [])
    setLoading(false)
  }, [nannyInstanceId])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // Poll for updates every 30s
  useEffect(() => {
    if (!nannyInstanceId) return
    const id = setInterval(fetchPayments, 30_000)
    return () => clearInterval(id)
  }, [nannyInstanceId, fetchPayments])

  return { payments, loading, refresh: fetchPayments }
}

// ---------------------------------------------------------------------------
// Hook: useAllPayments (all payments across instances)
// ---------------------------------------------------------------------------

export function useAllPayments(instanceIds: string[]) {
  const [payments, setPayments] = useState<
    (Payment & { nanny_instances: { id: string; name: string; household_id: string } })[]
  >([])
  const [loading, setLoading] = useState(true)

  const fetchPayments = useCallback(async () => {
    if (instanceIds.length === 0) {
      setPayments([])
      setLoading(false)
      return
    }
    setLoading(true)

    const { data } = await supabase
      .from('payments')
      .select('*, nanny_instances(id, name, household_id)')
      .in('nanny_instance_id', instanceIds)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    setPayments(data as typeof payments ?? [])
    setLoading(false)
  }, [instanceIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  return { payments, loading, refresh: fetchPayments }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function logPayment(params: {
  nanny_instance_id: string
  logged_by: string
  amount: number
  date: string
  method: Payment['method']
}): Promise<{ data: Payment | null; error: string | null }> {
  const { data, error } = await supabase
    .from('payments')
    .insert({ ...params, status: 'logged' })
    .select()
    .single()

  if (error) {
    console.warn('[logPayment] error:', error)
    return { data: null, error: error.message }
  }
  return { data: data as Payment, error: null }
}

export async function acceptPayment(paymentId: string): Promise<boolean> {
  const { error } = await supabase
    .from('payments')
    .update({ status: 'accepted' })
    .eq('id', paymentId)
  return !error
}

export async function disputePayment(
  paymentId: string,
  comment: string,
  authorId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'rejected',
      rejection_comment: comment,
    })
    .eq('id', paymentId)

  if (error) return false

  await supabase.from('comment_history').insert({
    entity_type: 'payment',
    entity_id: paymentId,
    author_id: authorId,
    comment,
  })

  return true
}

export async function deletePayment(paymentId: string): Promise<boolean> {
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', paymentId)
  return !error
}

// ---------------------------------------------------------------------------
// Hook: usePendingPayments (logged payments awaiting nanny acceptance)
// ---------------------------------------------------------------------------

export interface PendingPayment extends Payment {
  nanny_instances: {
    id: string
    name: string
    household_id: string
    households: { name: string }
  }
  profiles: { full_name: string; email: string }
}

export function usePendingPayments(instanceIds: string[], currentUserId: string | undefined) {
  const [payments, setPayments] = useState<PendingPayment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPending = useCallback(async () => {
    if (instanceIds.length === 0 || !currentUserId) {
      setPayments([])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('payments')
      .select('*, nanny_instances(id, name, household_id, households(name)), profiles:logged_by(full_name, email)')
      .in('nanny_instance_id', instanceIds)
      .eq('status', 'logged')
      .neq('logged_by', currentUserId)
      .order('created_at', { ascending: false })

    setPayments((data as PendingPayment[]) ?? [])
    setLoading(false)
  }, [instanceIds.join(','), currentUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  // Poll every 30s
  useEffect(() => {
    if (instanceIds.length === 0 || !currentUserId) return
    const id = setInterval(fetchPending, 30_000)
    return () => clearInterval(id)
  }, [instanceIds.length, currentUserId, fetchPending])

  return { payments, loading, refresh: fetchPending }
}
