import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Invitation } from '../types'

interface InviteWithHousehold extends Invitation {
  households: { id: string; name: string }
  profiles: { full_name: string; email: string }
}

export function usePendingInvites(userEmail: string | undefined) {
  const [invites, setInvites] = useState<InviteWithHousehold[]>([])
  const [loading, setLoading] = useState(true)

  const fetchInvites = useCallback(async () => {
    if (!userEmail) {
      setInvites([])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('invitations')
      .select('*, households:household_id(id, name), profiles:invited_by(full_name, email)')
      .eq('email', userEmail)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    setInvites((data as InviteWithHousehold[]) ?? [])
    setLoading(false)
  }, [userEmail])

  useEffect(() => {
    fetchInvites()
  }, [fetchInvites])

  // Poll every 30s
  useEffect(() => {
    if (!userEmail) return
    const id = setInterval(fetchInvites, 30_000)
    return () => clearInterval(id)
  }, [userEmail, fetchInvites])

  return { invites, loading, refresh: fetchInvites }
}

export async function acceptInvite(
  inviteId: string,
  householdId: string,
  userId: string
): Promise<{ error: string | null }> {
  // Add user to household as nanny
  const { error: memberError } = await supabase
    .from('household_members')
    .insert({
      household_id: householdId,
      profile_id: userId,
      role: 'nanny',
    })

  if (memberError && memberError.code !== '23505') {
    return { error: memberError.message }
  }

  // Mark invitation as accepted
  const { error: updateError } = await supabase
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('id', inviteId)

  if (updateError) return { error: updateError.message }
  return { error: null }
}

export async function declineInvite(inviteId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('invitations')
    .update({ status: 'expired' })
    .eq('id', inviteId)

  if (error) return { error: error.message }
  return { error: null }
}
