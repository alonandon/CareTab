import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type {
  TimeEntry,
  TimeEntryPeriod,
  NannyInstance,
  RateConfig,
} from '../types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimeEntryWithPeriods extends TimeEntry {
  time_entry_periods: TimeEntryPeriod[]
}

export interface NannyInstanceForSelector extends NannyInstance {
  rate_configs: RateConfig[]
  households: { id: string; name: string }
}

// ---------------------------------------------------------------------------
// Hook: useTimeEntries (entries for a nanny instance, with realtime)
// ---------------------------------------------------------------------------

export function useTimeEntries(nannyInstanceId: string | undefined) {
  const [entries, setEntries] = useState<TimeEntryWithPeriods[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEntries = useCallback(async () => {
    if (!nannyInstanceId) return
    setLoading(true)

    const { data } = await supabase
      .from('time_entries')
      .select('*, time_entry_periods(*)')
      .eq('nanny_instance_id', nannyInstanceId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    setEntries((data as TimeEntryWithPeriods[]) ?? [])
    setLoading(false)
  }, [nannyInstanceId])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Poll for updates every 30s
  useEffect(() => {
    if (!nannyInstanceId) return
    const id = setInterval(fetchEntries, 30_000)
    return () => clearInterval(id)
  }, [nannyInstanceId, fetchEntries])

  return { entries, loading, refresh: fetchEntries }
}

// ---------------------------------------------------------------------------
// Hook: useAllTimeEntries (all entries across nanny's instances)
// ---------------------------------------------------------------------------

export function useAllTimeEntries(instanceIds: string[]) {
  const [entries, setEntries] = useState<
    (TimeEntryWithPeriods & { nanny_instances: { id: string; name: string; household_id: string; rate_configs: RateConfig[] } })[]
  >([])
  const [loading, setLoading] = useState(true)

  const fetchEntries = useCallback(async () => {
    if (instanceIds.length === 0) {
      setEntries([])
      setLoading(false)
      return
    }
    setLoading(true)

    const { data } = await supabase
      .from('time_entries')
      .select('*, time_entry_periods(*), nanny_instances(id, name, household_id, rate_configs(*))')
      .in('nanny_instance_id', instanceIds)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    setEntries(data as typeof entries ?? [])
    setLoading(false)
  }, [instanceIds.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  return { entries, loading, refresh: fetchEntries }
}

// ---------------------------------------------------------------------------
// Hook: useNannyInstances (for the selector in the form)
// ---------------------------------------------------------------------------

export function useNannyInstances(userId: string | undefined) {
  const [instances, setInstances] = useState<NannyInstanceForSelector[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    async function fetch() {
      const { data } = await supabase
        .from('nanny_instances')
        .select('*, rate_configs(*), households(id, name)')
        .eq('nanny_id', userId)
        .eq('is_active', true)

      setInstances((data as NannyInstanceForSelector[]) ?? [])
      setLoading(false)
    }

    fetch()
  }, [userId])

  return { instances, loading }
}

// ---------------------------------------------------------------------------
// Hook: useHouseholdInstances (all instances in households user belongs to)
// Used by parents to see all nanny instances across their households
// ---------------------------------------------------------------------------

export function useHouseholdInstances(userId: string | undefined) {
  const [instances, setInstances] = useState<NannyInstanceForSelector[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    async function fetch() {
      // Get household IDs for this user
      const { data: memberships } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('profile_id', userId)

      if (!memberships || memberships.length === 0) {
        setInstances([])
        setLoading(false)
        return
      }

      const ids = memberships.map((m) => m.household_id)

      const { data } = await supabase
        .from('nanny_instances')
        .select('*, rate_configs(*), households(id, name)')
        .in('household_id', ids)
        .eq('is_active', true)

      setInstances((data as NannyInstanceForSelector[]) ?? [])
      setLoading(false)
    }

    fetch()
  }, [userId])

  return { instances, loading }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createTimeEntry(params: {
  nanny_instance_id: string
  entered_by: string
  date: string
  status: 'draft' | 'pending'
  notes: string | null
  periods: { start_time: string; end_time: string }[]
}): Promise<TimeEntry | null> {
  const { periods, ...entryData } = params

  const { data: entry, error } = await supabase
    .from('time_entries')
    .insert(entryData)
    .select()
    .single()

  if (error || !entry) return null

  if (periods.length > 0) {
    await supabase.from('time_entry_periods').insert(
      periods.map((p) => ({
        time_entry_id: entry.id,
        start_time: p.start_time,
        end_time: p.end_time,
      }))
    )
  }

  return entry
}

export async function updateTimeEntry(
  entryId: string,
  params: {
    date?: string
    status?: 'draft' | 'pending'
    notes?: string | null
    periods?: { start_time: string; end_time: string }[]
  }
): Promise<boolean> {
  const { periods, ...updateData } = params

  const { error } = await supabase
    .from('time_entries')
    .update(updateData)
    .eq('id', entryId)

  if (error) return false

  if (periods !== undefined) {
    // Delete existing periods and re-insert
    await supabase
      .from('time_entry_periods')
      .delete()
      .eq('time_entry_id', entryId)

    if (periods.length > 0) {
      await supabase.from('time_entry_periods').insert(
        periods.map((p) => ({
          time_entry_id: entryId,
          start_time: p.start_time,
          end_time: p.end_time,
        }))
      )
    }
  }

  return true
}

export async function deleteTimeEntry(entryId: string): Promise<boolean> {
  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', entryId)
  return !error
}

export async function submitTimeEntry(entryId: string): Promise<boolean> {
  const { error } = await supabase
    .from('time_entries')
    .update({ status: 'pending' })
    .eq('id', entryId)
  return !error
}

export async function cancelSubmission(entryId: string): Promise<boolean> {
  const { error } = await supabase
    .from('time_entries')
    .update({ status: 'draft' })
    .eq('id', entryId)
  return !error
}
