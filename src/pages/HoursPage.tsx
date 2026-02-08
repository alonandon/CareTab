import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  useNannyInstances,
  useHouseholdInstances,
  useAllTimeEntries,
} from '../hooks/useTimeEntries'
import type { TimeEntryWithPeriods } from '../hooks/useTimeEntries'
import { TimeEntryForm } from '../components/TimeEntryForm'
import { TimeEntryList } from '../components/TimeEntryList'

export function HoursPage() {
  const { user, profile } = useAuth()
  const isNanny = profile?.role === 'nanny'

  // Nannies see their own instances; parents see all instances in their households
  const { instances: nannyInstances, loading: nannyLoading } = useNannyInstances(
    isNanny ? user?.id : undefined
  )
  const { instances: parentInstances, loading: parentLoading } = useHouseholdInstances(
    !isNanny ? user?.id : undefined
  )

  const instances = isNanny ? nannyInstances : parentInstances
  const instancesLoading = isNanny ? nannyLoading : parentLoading

  const instanceIds = useMemo(() => instances.map((i) => i.id), [instances])
  const { entries, loading: entriesLoading, refresh } = useAllTimeEntries(instanceIds)
  const [showForm, setShowForm] = useState(false)
  const [editEntry, setEditEntry] = useState<TimeEntryWithPeriods | null>(null)

  const instanceNames = useMemo(() => {
    const map: Record<string, string> = {}
    for (const inst of instances) {
      map[inst.id] = `${inst.households.name} — ${inst.name}`
    }
    return map
  }, [instances])

  const allRates = useMemo(
    () => instances.flatMap((i) => i.rate_configs),
    [instances]
  )

  const loading = instancesLoading || entriesLoading

  const handleEdit = (entry: TimeEntryWithPeriods) => {
    setEditEntry(entry)
    setShowForm(true)
  }

  const handleSaved = () => {
    setShowForm(false)
    setEditEntry(null)
    refresh()
  }

  // Parent view: read-only list of all entries across their households
  if (!isNanny) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Hours</h1>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <TimeEntryList
            entries={entries}
            rates={allRates}
            onEdit={handleEdit}
            onRefresh={refresh}
            instanceNames={instanceNames}
          />
        )}
      </div>
    )
  }

  // Nanny view: form + list
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Hours</h1>
        {!showForm && instances.length > 0 && (
          <button
            onClick={() => { setEditEntry(null); setShowForm(true) }}
            className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
          >
            <Plus size={16} />
            New entry
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
                No rate profiles yet. Ask a parent to set one up for you.
              </p>
            </div>
          ) : (
            <>
              {showForm && (
                <TimeEntryForm
                  instances={instances}
                  userId={user!.id}
                  editEntry={editEntry ?? undefined}
                  onSaved={handleSaved}
                  onCancel={() => { setShowForm(false); setEditEntry(null) }}
                />
              )}

              <TimeEntryList
                entries={entries}
                rates={allRates}
                onEdit={handleEdit}
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
