import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type {
  Household,
  HouseholdMember,
  Child,
  Invitation,
  NannyInstance,
  RateConfig,
  Profile,
} from '../types'

// ---------------------------------------------------------------------------
// Types for joined queries
// ---------------------------------------------------------------------------

export interface HouseholdWithMembers extends Household {
  household_members: (HouseholdMember & { profiles: Profile })[]
  children: Child[]
}

export interface NannyInstanceWithDetails extends NannyInstance {
  profiles: Profile
  rate_configs: RateConfig[]
}

export interface HouseholdFull extends HouseholdWithMembers {
  nanny_instances: NannyInstanceWithDetails[]
  invitations: Invitation[]
}

// ---------------------------------------------------------------------------
// Hook: useHouseholds  (list all households for current user)
// ---------------------------------------------------------------------------

export function useHouseholds() {
  const { user } = useAuth()
  const [households, setHouseholds] = useState<HouseholdWithMembers[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // Get household IDs for this user
    const { data: memberships } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('profile_id', user.id)

    if (!memberships || memberships.length === 0) {
      setHouseholds([])
      setLoading(false)
      return
    }

    const ids = memberships.map((m) => m.household_id)

    const { data } = await supabase
      .from('households')
      .select(
        `*, household_members(*, profiles(*)), children(*)`
      )
      .in('id', ids)
      .order('created_at', { ascending: false })

    setHouseholds((data as HouseholdWithMembers[]) ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { households, loading, refresh: fetch }
}

// ---------------------------------------------------------------------------
// Hook: useHouseholdDetail  (single household with everything)
// ---------------------------------------------------------------------------

export function useHouseholdDetail(householdId: string | undefined) {
  const [household, setHousehold] = useState<HouseholdFull | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!householdId) return
    setLoading(true)

    const { data } = await supabase
      .from('households')
      .select(
        `*, household_members(*, profiles(*)), children(*), nanny_instances(*, profiles:nanny_id(id, email, full_name, role, created_at, updated_at), rate_configs(*)), invitations(*)`
      )
      .eq('id', householdId)
      .single()

    setHousehold((data as HouseholdFull) ?? null)
    setLoading(false)
  }, [householdId])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { household, loading, refresh: fetch }
}

// ---------------------------------------------------------------------------
// Hook: useNannyHouseholds  (households a nanny belongs to)
// ---------------------------------------------------------------------------

export function useNannyHouseholds() {
  const { user } = useAuth()
  const [instances, setInstances] = useState<
    (NannyInstance & { households: Household })[]
  >([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data } = await supabase
      .from('nanny_instances')
      .select('*, households(*)')
      .eq('nanny_id', user.id)
      .eq('is_active', true)

    setInstances(
      (data as (NannyInstance & { households: Household })[]) ?? []
    )
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { instances, loading, refresh: fetch }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createHousehold(
  name: string,
  userId: string
): Promise<Household | null> {
  const { data, error } = await supabase
    .from('households')
    .insert({ name, created_by: userId })
    .select()
    .single()

  if (error || !data) return null

  // Auto-add creator as parent member
  await supabase.from('household_members').insert({
    household_id: data.id,
    profile_id: userId,
    role: 'parent',
  })

  return data
}

export async function inviteNanny(
  householdId: string,
  email: string,
  invitedBy: string
): Promise<Invitation | null> {
  const { data, error } = await supabase
    .from('invitations')
    .insert({
      household_id: householdId,
      invited_by: invitedBy,
      email,
    })
    .select()
    .single()

  if (error) return null
  return data
}

export async function addChild(
  householdId: string,
  name: string
): Promise<Child | null> {
  const { data, error } = await supabase
    .from('children')
    .insert({ household_id: householdId, name })
    .select()
    .single()

  if (error) return null
  return data
}

export async function removeChild(childId: string): Promise<boolean> {
  const { error } = await supabase.from('children').delete().eq('id', childId)
  return !error
}

export async function createNannyInstance(
  householdId: string,
  nannyId: string,
  name: string,
  rateConfig: {
    rate_type: 'hourly' | 'weekly'
    rate_amount: number
    overtime_enabled: boolean
    overtime_multiplier?: number
    overtime_trigger_type?: 'daily' | 'weekly'
    overtime_trigger_hours?: number
    effective_date: string
  }
): Promise<NannyInstance | null> {
  const { data: instance, error } = await supabase
    .from('nanny_instances')
    .insert({ household_id: householdId, nanny_id: nannyId, name })
    .select()
    .single()

  if (error || !instance) return null

  await supabase.from('rate_configs').insert({
    nanny_instance_id: instance.id,
    ...rateConfig,
  })

  return instance
}
