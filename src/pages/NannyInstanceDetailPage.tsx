import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { RateHistory } from '../components/RateHistory'
import { RateConfigForm } from '../components/RateConfigForm'
import { TimeEntryForm } from '../components/TimeEntryForm'
import { TimeEntryList } from '../components/TimeEntryList'
import { useTimeEntries } from '../hooks/useTimeEntries'
import type { TimeEntryWithPeriods, NannyInstanceForSelector } from '../hooks/useTimeEntries'
import type { NannyInstance, RateConfig, Profile, Household } from '../types'

interface InstanceFull extends NannyInstance {
  profiles: Profile
  households: Household
  rate_configs: RateConfig[]
}

export function NannyInstanceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [instance, setInstance] = useState<InstanceFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editEntry, setEditEntry] = useState<TimeEntryWithPeriods | null>(null)

  const isParent = profile?.role === 'parent'
  const isNanny = profile?.role === 'nanny'

  const fetchInstance = useCallback(async () => {
    if (!id) return
    const { data } = await supabase
      .from('nanny_instances')
      .select(
        '*, profiles:nanny_id(id, email, full_name, role, created_at, updated_at), households(*), rate_configs(*)'
      )
      .eq('id', id)
      .single()
    setInstance(data as InstanceFull | null)
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchInstance()
  }, [fetchInstance])

  const { entries, loading: entriesLoading, refresh: refreshEntries } = useTimeEntries(id)

  // Build a NannyInstanceForSelector for the form
  const instanceForForm: NannyInstanceForSelector | null = instance
    ? {
        ...instance,
        households: { id: instance.households.id, name: instance.households.name },
      }
    : null

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (!instance) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">Rate profile not found.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 text-sm text-blue-500 hover:text-blue-600"
        >
          Back to dashboard
        </button>
      </div>
    )
  }

  const handleEdit = (entry: TimeEntryWithPeriods) => {
    setEditEntry(entry)
    setShowForm(true)
  }

  const handleSaved = () => {
    setShowForm(false)
    setEditEntry(null)
    refreshEntries()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(`/household/${instance.household_id}`)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft size={16} />
          {instance.households.name}
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{instance.name}</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {instance.profiles.full_name || instance.profiles.email}
        </p>
      </div>

      {/* Rate History */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Rate History
        </h2>
        <RateHistory rates={instance.rate_configs} />
      </section>

      {/* Add new rate — parent only */}
      {isParent && (
        <section>
          <RateConfigForm
            nannyInstanceId={instance.id}
            onCreated={fetchInstance}
          />
        </section>
      )}

      {/* Time Entries */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Time Entries
          </h2>
          {isNanny && !showForm && (
            <button
              onClick={() => { setEditEntry(null); setShowForm(true) }}
              className="flex items-center gap-1 text-sm font-medium text-blue-500 hover:text-blue-600"
            >
              <Plus size={16} />
              New entry
            </button>
          )}
        </div>

        {isNanny && showForm && instanceForForm && user && (
          <div className="mb-4">
            <TimeEntryForm
              instances={[instanceForForm]}
              userId={user.id}
              editEntry={editEntry ?? undefined}
              defaultInstanceId={instance.id}
              onSaved={handleSaved}
              onCancel={() => { setShowForm(false); setEditEntry(null) }}
            />
          </div>
        )}

        {entriesLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <TimeEntryList
            entries={entries}
            rates={instance.rate_configs}
            onEdit={handleEdit}
            onRefresh={refreshEntries}
          />
        )}
      </section>
    </div>
  )
}
