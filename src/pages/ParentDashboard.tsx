import { useState } from 'react'
import { Plus, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useHouseholds } from '../hooks/useHousehold'
import { HouseholdCard } from '../components/HouseholdCard'
import { CreateHouseholdForm } from '../components/CreateHouseholdForm'

export function ParentDashboard() {
  const { profile, signOut } = useAuth()
  const { households, loading, refresh } = useHouseholds()
  const [showCreateForm, setShowCreateForm] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hi, {profile?.full_name || 'there'}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">Parent Dashboard</p>
        </div>
        <button
          onClick={signOut}
          className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Sign out"
        >
          <LogOut size={20} />
        </button>
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
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
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
              <p className="text-center text-sm text-gray-400 py-4">
                Create a household to get started.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
