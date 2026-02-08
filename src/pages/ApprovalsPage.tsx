import { useState, useMemo } from 'react'
import {
  Clock,
  Receipt,
  CheckCircle,
  XCircle,
  DollarSign,
  CheckSquare,
  Square,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import {
  usePendingApprovals,
  approveTimeEntry,
  rejectTimeEntry,
  approveExpense,
  rejectExpense,
  batchApproveTimeEntries,
  batchApproveExpenses,
} from '../hooks/useApprovals'
import type { PendingTimeEntry, PendingExpense } from '../hooks/useApprovals'
import { totalHoursFromPeriods, resolveRate, calculatePay } from '../lib/pay'
import type { PayBreakdown } from '../lib/pay'
import { RejectionModal } from '../components/RejectionModal'
import { SkeletonList } from '../components/Skeleton'

// ---------------------------------------------------------------------------
// Tab type
// ---------------------------------------------------------------------------

type Tab = 'all' | 'hours' | 'expenses'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ApprovalsPage() {
  const { user } = useAuth()
  const { success: showSuccess } = useToast()
  const { timeEntries, expenses, loading, refresh } = usePendingApprovals(user?.id)
  const [tab, setTab] = useState<Tab>('all')
  const [selectedTE, setSelectedTE] = useState<Set<string>>(new Set())
  const [selectedExp, setSelectedExp] = useState<Set<string>>(new Set())
  const [rejecting, setRejecting] = useState<{ type: 'time_entry' | 'expense'; id: string } | null>(null)
  const [batchLoading, setBatchLoading] = useState(false)

  const totalPending = timeEntries.length + expenses.length
  const showTE = tab === 'all' || tab === 'hours'
  const showExp = tab === 'all' || tab === 'expenses'

  // Group time entries by nanny instance
  const teByInstance = useMemo(() => {
    const map = new Map<string, { name: string; nannyName: string; householdName: string; entries: PendingTimeEntry[] }>()
    for (const te of timeEntries) {
      const key = te.nanny_instance_id
      if (!map.has(key)) {
        const ni = te.nanny_instances
        map.set(key, {
          name: ni.name,
          nannyName: ni.profiles.full_name || ni.profiles.email,
          householdName: ni.households.name,
          entries: [],
        })
      }
      map.get(key)!.entries.push(te)
    }
    return map
  }, [timeEntries])

  // Group expenses by nanny instance
  const expByInstance = useMemo(() => {
    const map = new Map<string, { name: string; nannyName: string; householdName: string; expenses: PendingExpense[] }>()
    for (const exp of expenses) {
      const key = exp.nanny_instance_id
      if (!map.has(key)) {
        const ni = exp.nanny_instances
        map.set(key, {
          name: ni.name,
          nannyName: ni.profiles.full_name || ni.profiles.email,
          householdName: ni.households.name,
          expenses: [],
        })
      }
      map.get(key)!.expenses.push(exp)
    }
    return map
  }, [expenses])

  // Selection helpers
  const toggleTE = (id: string) => {
    setSelectedTE((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleExp = (id: string) => {
    setSelectedExp((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAllTE = () => {
    const visible = showTE ? timeEntries.map((t) => t.id) : []
    setSelectedTE((prev) =>
      prev.size === visible.length ? new Set() : new Set(visible)
    )
  }

  const selectAllExp = () => {
    const visible = showExp ? expenses.map((e) => e.id) : []
    setSelectedExp((prev) =>
      prev.size === visible.length ? new Set() : new Set(visible)
    )
  }

  const totalSelected = selectedTE.size + selectedExp.size

  // Batch approve
  const handleBatchApprove = async () => {
    if (!user || totalSelected === 0) return
    setBatchLoading(true)

    const promises: Promise<boolean>[] = []
    if (selectedTE.size > 0) {
      promises.push(batchApproveTimeEntries([...selectedTE], user.id))
    }
    if (selectedExp.size > 0) {
      promises.push(batchApproveExpenses([...selectedExp], user.id))
    }

    await Promise.all(promises)
    setSelectedTE(new Set())
    setSelectedExp(new Set())
    setBatchLoading(false)
    showSuccess(`Approved ${totalSelected} item${totalSelected > 1 ? 's' : ''}.`)
    refresh()
  }

  // Single approve
  const handleApproveTE = async (id: string) => {
    if (!user) return
    await approveTimeEntry(id, user.id)
    showSuccess('Time entry approved.')
    refresh()
  }

  const handleApproveExp = async (id: string) => {
    if (!user) return
    await approveExpense(id, user.id)
    showSuccess('Expense approved.')
    refresh()
  }

  // Reject handlers
  const handleRejectConfirm = async (comment: string) => {
    if (!rejecting || !user) return
    if (rejecting.type === 'time_entry') {
      await rejectTimeEntry(rejecting.id, comment, user.id)
      showSuccess('Time entry rejected.')
    } else {
      await rejectExpense(rejecting.id, comment, user.id)
      showSuccess('Expense rejected.')
    }
    setRejecting(null)
    refresh()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
        <SkeletonList count={4} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
          {totalPending > 0 && (
            <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] rounded-full bg-amber-500 px-2 text-xs font-bold text-white">
              {totalPending}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-gray-200 p-0.5">
        {([
          ['all', 'All', timeEntries.length + expenses.length],
          ['hours', 'Hours', timeEntries.length],
          ['expenses', 'Expenses', expenses.length],
        ] as [Tab, string, number][]).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                tab === key ? 'bg-blue-400 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Batch action bar */}
      {totalSelected > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
          <span className="text-sm font-medium text-blue-700">
            {totalSelected} selected
          </span>
          <button
            onClick={handleBatchApprove}
            disabled={batchLoading}
            className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            <CheckCircle size={14} />
            Approve all selected
          </button>
        </div>
      )}

      {totalPending === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <CheckCircle size={32} className="mx-auto text-green-400 mb-2" />
          <p className="text-sm font-medium text-gray-600">All caught up!</p>
          <p className="text-xs text-gray-400 mt-1">No pending items to review.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Time entries section */}
          {showTE && timeEntries.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-blue-500" />
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Time Entries
                  </h2>
                  <span className="text-xs text-gray-400">({timeEntries.length})</span>
                </div>
                <button
                  onClick={selectAllTE}
                  className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                >
                  {selectedTE.size === timeEntries.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              <div className="space-y-4">
                {[...teByInstance.entries()].map(([instanceId, group]) => (
                  <div key={instanceId}>
                    <p className="text-xs font-medium text-gray-500 mb-1.5 px-1">
                      {group.householdName} — {group.name} <span className="text-gray-400">({group.nannyName})</span>
                    </p>
                    <div className="space-y-2">
                      {group.entries.map((entry) => (
                        <PendingTimeEntryCard
                          key={entry.id}
                          entry={entry}
                          selected={selectedTE.has(entry.id)}
                          onToggle={() => toggleTE(entry.id)}
                          onApprove={() => handleApproveTE(entry.id)}
                          onReject={() => setRejecting({ type: 'time_entry', id: entry.id })}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Expenses section */}
          {showExp && expenses.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Receipt size={16} className="text-blue-500" />
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Expenses
                  </h2>
                  <span className="text-xs text-gray-400">({expenses.length})</span>
                </div>
                <button
                  onClick={selectAllExp}
                  className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                >
                  {selectedExp.size === expenses.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              <div className="space-y-4">
                {[...expByInstance.entries()].map(([instanceId, group]) => (
                  <div key={instanceId}>
                    <p className="text-xs font-medium text-gray-500 mb-1.5 px-1">
                      {group.householdName} — {group.name} <span className="text-gray-400">({group.nannyName})</span>
                    </p>
                    <div className="space-y-2">
                      {group.expenses.map((expense) => (
                        <PendingExpenseCard
                          key={expense.id}
                          expense={expense}
                          selected={selectedExp.has(expense.id)}
                          onToggle={() => toggleExp(expense.id)}
                          onApprove={() => handleApproveExp(expense.id)}
                          onReject={() => setRejecting({ type: 'expense', id: expense.id })}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Rejection modal */}
      {rejecting && (
        <RejectionModal
          title={rejecting.type === 'time_entry' ? 'Reject Time Entry' : 'Reject Expense'}
          onConfirm={handleRejectConfirm}
          onClose={() => setRejecting(null)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pending Time Entry Card
// ---------------------------------------------------------------------------

function PendingTimeEntryCard({
  entry,
  selected,
  onToggle,
  onApprove,
  onReject,
}: {
  entry: PendingTimeEntry
  selected: boolean
  onToggle: () => void
  onApprove: () => void
  onReject: () => void
}) {
  const [approving, setApproving] = useState(false)
  const hours = totalHoursFromPeriods(entry.time_entry_periods)
  const rates = entry.nanny_instances.rate_configs
  const rate = resolveRate(rates, entry.date)
  const pay: PayBreakdown | null =
    rate && entry.time_entry_periods.length > 0
      ? calculatePay(entry.time_entry_periods, rate)
      : rate?.rate_type === 'weekly'
        ? { regularHours: 0, overtimeHours: 0, regularPay: rate.rate_amount, overtimePay: 0, totalPay: rate.rate_amount }
        : null

  const handleApprove = async () => {
    setApproving(true)
    await onApprove()
    setApproving(false)
  }

  return (
    <div className={`rounded-lg border bg-white overflow-hidden ${selected ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200'}`}>
      <div className="px-3 py-3 space-y-2">
        {/* Top row: checkbox + date + hours */}
        <div className="flex items-start gap-2">
          <button onClick={onToggle} className="mt-0.5 shrink-0">
            {selected ? (
              <CheckSquare size={18} className="text-blue-500" />
            ) : (
              <Square size={18} className="text-gray-300" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">
                {format(parseISO(entry.date), 'EEE, MMM d, yyyy')}
              </span>
              {hours > 0 && (
                <span className="text-sm font-medium text-gray-600">{hours.toFixed(1)}h</span>
              )}
            </div>

            {/* Time periods */}
            {entry.time_entry_periods.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                {entry.time_entry_periods.map((p) => (
                  <span key={p.id} className="text-xs text-gray-500">
                    {p.start_time.slice(0, 5)} — {p.end_time.slice(0, 5)}
                  </span>
                ))}
              </div>
            )}

            {entry.time_entry_periods.length === 0 && rate?.rate_type === 'weekly' && (
              <p className="text-xs text-blue-600 mt-0.5">Weekly rate entry</p>
            )}
          </div>
        </div>

        {/* Pay calculation */}
        {pay && (
          <div className="rounded-lg bg-gray-50 p-2 text-xs ml-6">
            {pay.regularHours > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Regular ({pay.regularHours}h × ${rate!.rate_amount})</span>
                <span className="text-gray-700">${pay.regularPay.toFixed(2)}</span>
              </div>
            )}
            {pay.overtimeHours > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Overtime ({pay.overtimeHours}h × ${(rate!.rate_amount * (rate!.overtime_multiplier ?? 1)).toFixed(2)})</span>
                <span className="text-gray-700">${pay.overtimePay.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium border-t border-gray-200 pt-1 mt-1">
              <span className="text-gray-700">Total</span>
              <span className="flex items-center gap-0.5 text-green-700">
                <DollarSign size={12} />
                {pay.totalPay.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Notes */}
        {entry.notes && (
          <p className="text-xs text-gray-500 ml-6">{entry.notes}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 ml-6 pt-1">
          <button
            onClick={handleApprove}
            disabled={approving}
            className="flex items-center gap-1 rounded-md bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            <CheckCircle size={12} />
            Approve
          </button>
          <button
            onClick={onReject}
            className="flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <XCircle size={12} />
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pending Expense Card
// ---------------------------------------------------------------------------

function PendingExpenseCard({
  expense,
  selected,
  onToggle,
  onApprove,
  onReject,
}: {
  expense: PendingExpense
  selected: boolean
  onToggle: () => void
  onApprove: () => void
  onReject: () => void
}) {
  const [approving, setApproving] = useState(false)

  const handleApprove = async () => {
    setApproving(true)
    await onApprove()
    setApproving(false)
  }

  return (
    <div className={`rounded-lg border bg-white overflow-hidden ${selected ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200'}`}>
      <div className="px-3 py-3 space-y-2">
        {/* Top row: checkbox + date + amount */}
        <div className="flex items-start gap-2">
          <button onClick={onToggle} className="mt-0.5 shrink-0">
            {selected ? (
              <CheckSquare size={18} className="text-blue-500" />
            ) : (
              <Square size={18} className="text-gray-300" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">
                {format(parseISO(expense.date), 'EEE, MMM d, yyyy')}
              </span>
              <span className="flex items-center gap-0.5 text-sm font-medium text-gray-700">
                <DollarSign size={14} className="text-gray-400" />
                {Number(expense.amount).toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">{expense.description}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 ml-6 pt-1">
          <button
            onClick={handleApprove}
            disabled={approving}
            className="flex items-center gap-1 rounded-md bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            <CheckCircle size={12} />
            Approve
          </button>
          <button
            onClick={onReject}
            className="flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <XCircle size={12} />
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}
