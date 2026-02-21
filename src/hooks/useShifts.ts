import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Shift, RecurringShift, BlackoutDate } from '../types'

// ---------------------------------------------------------------------------
// Types for joined queries
// ---------------------------------------------------------------------------

export interface ShiftWithDetails extends Shift {
  nanny_instances?: { id: string; name: string }
}

// ---------------------------------------------------------------------------
// Hook: useShifts (shifts for a specific nanny instance)
// ---------------------------------------------------------------------------

export function useShifts(nannyInstanceId: string | undefined) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)

  const fetchShifts = useCallback(async () => {
    if (!nannyInstanceId) {
      setShifts([])
      setLoading(false)
      return
    }

    setLoading(true)
    const { data } = await supabase
      .from('shifts')
      .select('*')
      .eq('nanny_instance_id', nannyInstanceId)
      .order('date', { ascending: true })

    setShifts((data as Shift[]) ?? [])
    setLoading(false)
  }, [nannyInstanceId])

  useEffect(() => {
    fetchShifts()
  }, [fetchShifts])

  return { shifts, loading, refresh: fetchShifts }
}

// ---------------------------------------------------------------------------
// Hook: useShiftsInDateRange (shifts within a date range for an instance)
// ---------------------------------------------------------------------------

export function useShiftsInDateRange(
  nannyInstanceId: string | undefined,
  fromDate: string | undefined,
  toDate: string | undefined
) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)

  const fetchShifts = useCallback(async () => {
    if (!nannyInstanceId || !fromDate || !toDate) {
      setShifts([])
      setLoading(false)
      return
    }

    setLoading(true)
    const { data } = await supabase
      .from('shifts')
      .select('*')
      .eq('nanny_instance_id', nannyInstanceId)
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: true })

    setShifts((data as Shift[]) ?? [])
    setLoading(false)
  }, [nannyInstanceId, fromDate, toDate])

  useEffect(() => {
    fetchShifts()
  }, [fetchShifts])

  return { shifts, loading, refresh: fetchShifts }
}

// ---------------------------------------------------------------------------
// Hook: useAllShifts (all shifts across nanny instance IDs)
// ---------------------------------------------------------------------------

export function useAllShifts(instanceIds: string[]) {
  const [shifts, setShifts] = useState<ShiftWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  const fetchShifts = useCallback(async () => {
    if (instanceIds.length === 0) {
      setShifts([])
      setLoading(false)
      return
    }

    setLoading(true)
    const { data } = await supabase
      .from('shifts')
      .select('*, nanny_instances(id, name)')
      .in('nanny_instance_id', instanceIds)
      .order('date', { ascending: true })

    setShifts((data as ShiftWithDetails[]) ?? [])
    setLoading(false)
  }, [instanceIds.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchShifts()
  }, [fetchShifts])

  return { shifts, loading, refresh: fetchShifts }
}

// ---------------------------------------------------------------------------
// Hook: useRecurringShifts (recurring shift patterns for an instance)
// ---------------------------------------------------------------------------

export function useRecurringShifts(nannyInstanceId: string | undefined) {
  const [recurring, setRecurring] = useState<RecurringShift[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRecurring = useCallback(async () => {
    if (!nannyInstanceId) {
      setRecurring([])
      setLoading(false)
      return
    }

    setLoading(true)
    const { data } = await supabase
      .from('recurring_shifts')
      .select('*')
      .eq('nanny_instance_id', nannyInstanceId)
      .eq('is_active', true)
      .order('start_date', { ascending: true })

    setRecurring((data as RecurringShift[]) ?? [])
    setLoading(false)
  }, [nannyInstanceId])

  useEffect(() => {
    fetchRecurring()
  }, [fetchRecurring])

  return { recurring, loading, refresh: fetchRecurring }
}

// ---------------------------------------------------------------------------
// Hook: useBlackoutDates (blackout dates for an instance)
// ---------------------------------------------------------------------------

export function useBlackoutDates(nannyInstanceId: string | undefined) {
  const [blackoutDates, setBlackoutDates] = useState<BlackoutDate[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBlackoutDates = useCallback(async () => {
    if (!nannyInstanceId) {
      setBlackoutDates([])
      setLoading(false)
      return
    }

    setLoading(true)
    const { data } = await supabase
      .from('blackout_dates')
      .select('*')
      .eq('nanny_instance_id', nannyInstanceId)
      .order('date', { ascending: true })

    setBlackoutDates((data as BlackoutDate[]) ?? [])
    setLoading(false)
  }, [nannyInstanceId])

  useEffect(() => {
    fetchBlackoutDates()
  }, [fetchBlackoutDates])

  return { blackoutDates, loading, refresh: fetchBlackoutDates }
}

// ---------------------------------------------------------------------------
// Mutations: Shifts
// ---------------------------------------------------------------------------

export async function createShift(params: {
  nanny_instance_id: string
  date: string
  start_time: string
  end_time: string
  notes: string | null
  rate_override: number | null
  created_by: string
}): Promise<Shift | null> {
  const { data, error } = await supabase
    .from('shifts')
    .insert(params)
    .select()
    .single()

  if (error || !data) return null
  return data as Shift
}

export async function updateShift(
  shiftId: string,
  params: Partial<Omit<Shift, 'id' | 'created_by' | 'created_at' | 'updated_at'>>
): Promise<Shift | null> {
  const { data, error } = await supabase
    .from('shifts')
    .update(params)
    .eq('id', shiftId)
    .select()
    .single()

  if (error || !data) return null
  return data as Shift
}

export async function deleteShift(shiftId: string): Promise<boolean> {
  const { error } = await supabase
    .from('shifts')
    .delete()
    .eq('id', shiftId)
  return !error
}

// ---------------------------------------------------------------------------
// Mutations: Recurring Shifts
// ---------------------------------------------------------------------------

export async function createRecurringShift(params: {
  nanny_instance_id: string
  recurrence_type: 'daily' | 'weekly' | 'biweekly'
  day_of_week: number | null
  start_time: string
  end_time: string
  notes: string | null
  rate_override: number | null
  start_date: string
  end_date: string | null
  created_by: string
}): Promise<RecurringShift | null> {
  const { data, error } = await supabase
    .from('recurring_shifts')
    .insert(params)
    .select()
    .single()

  if (error || !data) return null
  return data as RecurringShift
}

export async function updateRecurringShift(
  recurringShiftId: string,
  params: Partial<Omit<RecurringShift, 'id' | 'created_by' | 'created_at' | 'updated_at'>>
): Promise<RecurringShift | null> {
  const { data, error } = await supabase
    .from('recurring_shifts')
    .update(params)
    .eq('id', recurringShiftId)
    .select()
    .single()

  if (error || !data) return null
  return data as RecurringShift
}

export async function deleteRecurringShift(recurringShiftId: string): Promise<boolean> {
  const { error } = await supabase
    .from('recurring_shifts')
    .delete()
    .eq('id', recurringShiftId)
  return !error
}

export async function toggleRecurringShift(
  recurringShiftId: string,
  isActive: boolean
): Promise<boolean> {
  const { error } = await supabase
    .from('recurring_shifts')
    .update({ is_active: isActive })
    .eq('id', recurringShiftId)
  return !error
}

// ---------------------------------------------------------------------------
// Mutations: Blackout Dates
// ---------------------------------------------------------------------------

export async function createBlackoutDate(params: {
  nanny_instance_id: string
  date: string
  reason: string | null
  created_by: string
}): Promise<BlackoutDate | null> {
  const { data, error } = await supabase
    .from('blackout_dates')
    .insert(params)
    .select()
    .single()

  if (error || !data) return null
  return data as BlackoutDate
}

export async function deleteBlackoutDate(blackoutDateId: string): Promise<boolean> {
  const { error } = await supabase
    .from('blackout_dates')
    .delete()
    .eq('id', blackoutDateId)
  return !error
}

// ---------------------------------------------------------------------------
// Mutations: Shift Generation & Confirmation
// ---------------------------------------------------------------------------

export async function generateShiftsFromRecurring(
  recurringShiftId: string,
  fromDate: string,
  toDate: string
): Promise<{ count: number; error: boolean }> {
  const { data, error } = await supabase
    .rpc('generate_shifts_from_recurring', {
      p_recurring_shift_id: recurringShiftId,
      p_from_date: fromDate,
      p_to_date: toDate,
    })

  if (error) return { count: 0, error: true }
  return { count: data ?? 0, error: false }
}

export async function confirmShift(
  shiftId: string,
  nannyId: string
): Promise<{ timeEntryId: string | null; error: boolean }> {
  const { data, error } = await supabase
    .rpc('create_time_entry_from_shift', {
      p_shift_id: shiftId,
      p_nanny_id: nannyId,
    })

  if (error) return { timeEntryId: null, error: true }
  return { timeEntryId: data ?? null, error: false }
}

// ---------------------------------------------------------------------------
// Utility: Get shift status
// ---------------------------------------------------------------------------

export async function getShiftStatus(
  shiftId: string
): Promise<'scheduled' | 'unconfirmed' | 'confirmed' | null> {
  const { data, error } = await supabase
    .rpc('get_shift_status', { p_shift_id: shiftId })

  if (error) return null
  return data as 'scheduled' | 'unconfirmed' | 'confirmed'
}
