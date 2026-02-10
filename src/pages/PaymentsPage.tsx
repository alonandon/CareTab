import { useState, useMemo } from 'react'
import { Plus, DollarSign } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { SkeletonList } from '../components/Skeleton'
import { EmptyState } from '../components/EmptyState'
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
      const nannyName = inst.profiles?.full_name || inst.profiles?.email || inst.name
      map[inst.id] = `${nannyName} — ${inst.households.name}`
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
        <SkeletonList count={4} />
      ) : (
        <>
          {instances.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title={isParent ? 'No nanny connections yet' : 'No payments yet'}
              description={
                isParent
                  ? 'Set up a household and invite a nanny first.'
                  : 'Ask a parent to set up a rate profile for you.'
              }
            />
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
