import { useState } from 'react'
import { Plus, Home } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useHouseholds } from '../hooks/useHousehold'
import { HouseholdCard } from '../components/HouseholdCard'
import { CreateHouseholdForm } from '../components/CreateHouseholdForm'
import { SkeletonDashboard } from '../components/Skeleton'
import { EmptyState } from '../components/EmptyState'

export function ParentDashboard() {
  const { profile } = useAuth()
  const { households, loading, refresh } = useHouseholds()
  const [showCreateForm, setShowCreateForm] = useState(false)

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
              <HouseholdCard key={h.id} household={h} />
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
