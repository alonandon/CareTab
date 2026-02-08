import { useState, useMemo } from 'react'
import { Plus, Receipt } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { SkeletonList } from '../components/Skeleton'
import { EmptyState } from '../components/EmptyState'
import {
  useNannyInstances,
  useHouseholdInstances,
} from '../hooks/useTimeEntries'
import { useAllExpenses } from '../hooks/useExpenses'
import type { Expense } from '../types'
import { ExpenseForm } from '../components/ExpenseForm'
import { ExpenseList } from '../components/ExpenseList'

export function ExpensesPage() {
  const { user, profile } = useAuth()
  const isNanny = profile?.role === 'nanny'

  const { instances: nannyInstances, loading: nannyLoading } = useNannyInstances(
    isNanny ? user?.id : undefined
  )
  const { instances: parentInstances, loading: parentLoading } = useHouseholdInstances(
    !isNanny ? user?.id : undefined
  )

  const instances = isNanny ? nannyInstances : parentInstances
  const instancesLoading = isNanny ? nannyLoading : parentLoading

  const instanceIds = useMemo(() => instances.map((i) => i.id), [instances])
  const { expenses, loading: expensesLoading, refresh } = useAllExpenses(instanceIds)
  const [showForm, setShowForm] = useState(false)
  const [editExpense, setEditExpense] = useState<Expense | null>(null)

  const instanceNames = useMemo(() => {
    const map: Record<string, string> = {}
    for (const inst of instances) {
      map[inst.id] = `${inst.households.name} — ${inst.name}`
    }
    return map
  }, [instances])

  const loading = instancesLoading || expensesLoading

  const handleEdit = (expense: Expense) => {
    setEditExpense(expense)
    setShowForm(true)
  }

  const handleSaved = () => {
    setShowForm(false)
    setEditExpense(null)
    refresh()
  }

  // Parent view: read-only list of all expenses across their households
  if (!isNanny) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        {loading ? (
          <SkeletonList count={4} />
        ) : (
          <ExpenseList
            expenses={expenses}
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
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        {!showForm && instances.length > 0 && (
          <button
            onClick={() => { setEditExpense(null); setShowForm(true) }}
            className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
          >
            <Plus size={16} />
            New expense
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
            <EmptyState
              icon={Receipt}
              title="No expenses yet"
              description="You need a rate profile before logging expenses. Ask a parent to set one up."
            />
          ) : (
            <>
              {showForm && (
                <ExpenseForm
                  instances={instances}
                  userId={user!.id}
                  editExpense={editExpense ?? undefined}
                  onSaved={handleSaved}
                  onCancel={() => { setShowForm(false); setEditExpense(null) }}
                />
              )}

              <ExpenseList
                expenses={expenses}
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
