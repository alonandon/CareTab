import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Lightweight hook that returns the count of pending approvals for a parent.
 * Used by the nav badge — avoids fetching full approval data.
 */
export function usePendingCount(userId: string | undefined, isParent: boolean) {
  const [count, setCount] = useState(0)

  const fetchCount = useCallback(async () => {
    if (!userId || !isParent) {
      setCount(0)
      return
    }

    const { data: memberships } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('profile_id', userId)

    if (!memberships || memberships.length === 0) {
      setCount(0)
      return
    }

    const householdIds = memberships.map((m) => m.household_id)

    const { data: instances } = await supabase
      .from('nanny_instances')
      .select('id')
      .in('household_id', householdIds)
      .eq('is_active', true)

    const ids = instances?.map((i) => i.id) ?? []
    if (ids.length === 0) {
      setCount(0)
      return
    }

    const [teResult, expResult] = await Promise.all([
      supabase
        .from('time_entries')
        .select('id', { count: 'exact', head: true })
        .in('nanny_instance_id', ids)
        .eq('status', 'pending'),
      supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .in('nanny_instance_id', ids)
        .eq('status', 'pending'),
    ])

    setCount((teResult.count ?? 0) + (expResult.count ?? 0))
  }, [userId, isParent])

  useEffect(() => {
    fetchCount()
  }, [fetchCount])

  // Realtime: re-count on changes
  useEffect(() => {
    if (!userId || !isParent) return

    const ch1 = supabase
      .channel('pending_count_te')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_entries' }, () => fetchCount())
      .subscribe()

    const ch2 = supabase
      .channel('pending_count_exp')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchCount())
      .subscribe()

    return () => {
      supabase.removeChannel(ch1)
      supabase.removeChannel(ch2)
    }
  }, [userId, isParent, fetchCount])

  return count
}
