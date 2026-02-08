import { useState } from 'react'
import { Plus, Home } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useHouseholds } from '../hooks/useHousehold'
import { useHouseholdBalance } from '../hooks/useBalance'
import { HouseholdCard } from '../components/HouseholdCard'
import { CreateHouseholdForm } from '../components/CreateHouseholdForm'
import { SkeletonDashboard } from '../components/Skeleton'
import { EmptyState } from '../components/EmptyState'

export function ParentDashboard() {
  const { profile } = useAuth()
  const { households, loading, refresh } = useHouseholds()
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Collect all nanny instance IDs across all households for balance fetching
  // households from useHouseholds don't include nanny_instances, so we need
  // to fetch them separately. We use the household_members to identify nannies
  // and then fetch balances via a separate detail query.
  // For now, pass household IDs to HouseholdCard which will fetch its own balance.

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hi, {profile?.full_name || 'there'}
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">Parent Dashboard</p>
      </div>

      {/* Households */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Households
          </h2>
          {!showCreateForm && households.length > 0 && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-1 text-sm font-medium text-blue-500 hover:text-blue-600"
            >
              <Plus size={16} />
              New
            </button>
          )}
        </div>

        {loading ? (
          <SkeletonDashboard />
        ) : (
          <div className="space-y-3">
            {households.map((h) => (
              <HouseholdCardWithBalance key={h.id} household={h} />
            ))}

            {(households.length === 0 || showCreateForm) && (
              <CreateHouseholdForm
                onCreated={() => {
                  setShowCreateForm(false)
                  refresh()
                }}
              />
            )}

            {households.length === 0 && !showCreateForm && (
              <EmptyState
                icon={Home}
                title="Create your first household"
                description="Set up a household to start tracking hours, expenses, and payments."
                actionLabel="Get started"
                onAction={() => setShowCreateForm(true)}
              />
            )}
          </div>
        )}
      </section>
    </div>
  )
}

// Wrapper that fetches balance for a single household
function HouseholdCardWithBalance({ household }: { household: Parameters<typeof HouseholdCard>[0]['household'] }) {
  const { balance, loading } = useHouseholdBalance(household.id)

  return (
    <HouseholdCard
      household={household}
      balance={balance}
      balanceLoading={loading}
    />
  )
}
