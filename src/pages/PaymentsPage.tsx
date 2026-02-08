import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  useNannyInstances,
  useHouseholdInstances,
} from '../hooks/useTimeEntries'
import { useAllPayments } from '../hooks/usePayments'
import { PaymentForm } from '../components/PaymentForm'
import { PaymentList } from '../components/PaymentList'

export function PaymentsPage() {
  const { user, profile } = useAuth()
  const isParent = profile?.role === 'parent'

  const { instances: nannyInstances, loading: nannyLoading } = useNannyInstances(
    !isParent ? user?.id : undefined
  )
  const { instances: parentInstances, loading: parentLoading } = useHouseholdInstances(
    isParent ? user?.id : undefined
  )

  const instances = isParent ? parentInstances : nannyInstances
  const instancesLoading = isParent ? parentLoading : nannyLoading

  const instanceIds = useMemo(() => instances.map((i) => i.id), [instances])
  const { payments, loading: paymentsLoading, refresh } = useAllPayments(instanceIds)
  const [showForm, setShowForm] = useState(false)

  const instanceNames = useMemo(() => {
    const map: Record<string, string> = {}
    for (const inst of instances) {
      map[inst.id] = `${inst.households.name} — ${inst.name}`
    }
    return map
  }, [instances])

  const loading = instancesLoading || paymentsLoading

  const handleSaved = () => {
    setShowForm(false)
    refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        {isParent && !showForm && instances.length > 0 && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
          >
            <Plus size={16} />
            Log payment
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {instances.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <p className="text-sm text-gray-500">
                {isParent
                  ? 'No nanny connections yet. Set up a household and invite a nanny first.'
                  : 'No rate profiles yet. Ask a parent to set one up for you.'}
              </p>
            </div>
          ) : (
            <>
              {isParent && showForm && (
                <PaymentForm
                  instances={instances}
                  userId={user!.id}
                  onSaved={handleSaved}
                  onCancel={() => setShowForm(false)}
                />
              )}

              <PaymentList
                payments={payments}
                currentUserId={user!.id}
                onRefresh={refresh}
                instanceNames={instanceNames}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}
