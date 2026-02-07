import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { RateHistory } from '../components/RateHistory'
import { RateConfigForm } from '../components/RateConfigForm'
import type { NannyInstance, RateConfig, Profile, Household } from '../types'

interface InstanceFull extends NannyInstance {
  profiles: Profile
  households: Household
  rate_configs: RateConfig[]
}

export function NannyInstanceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [instance, setInstance] = useState<InstanceFull | null>(null)
  const [loading, setLoading] = useState(true)

  const isParent = profile?.role === 'parent'

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

      {/* Placeholder for future: time entries, expenses, payments */}
      <section className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-400">
          Time entries, expenses, and payments for this rate profile will appear
          here.
        </p>
      </section>
    </div>
  )
}
