import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Edit3,
  Trash2,
  Send,
  Undo2,
  Clock,
  AlertCircle,
  CheckCircle,
  DollarSign,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { Expense } from '../types'
import {
  deleteExpense,
  submitExpense,
  cancelExpenseSubmission,
} from '../hooks/useExpenses'

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600', icon: Edit3 },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: AlertCircle },
} as const

function StatusBadge({ status }: { status: keyof typeof statusConfig }) {
  const { label, color, icon: Icon } = statusConfig[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      <Icon size={12} />
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Single expense row
// ---------------------------------------------------------------------------

interface ExpenseRowProps {
  expense: Expense
  onEdit: (expense: Expense) => void
  onRefresh: () => void
  showInstanceName?: string
}

function ExpenseRow({ expense, onEdit, onRefresh, showInstanceName }: ExpenseRowProps) {
  const [expanded, setExpanded] = useState(false)

  const canEdit = expense.status === 'draft' || expense.status === 'rejected'
  const canDelete = expense.status === 'draft'
  const canSubmit = expense.status === 'draft'
  const canCancel = expense.status === 'pending'

  const handleDelete = async () => {
    await deleteExpense(expense.id)
    onRefresh()
  }

  const handleSubmit = async () => {
    await submitExpense(expense.id)
    onRefresh()
  }

  const handleCancel = async () => {
    await cancelExpenseSubmission(expense.id)
    onRefresh()
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Collapsed row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">
              {format(parseISO(expense.date), 'EEE, MMM d')}
            </span>
            <StatusBadge status={expense.status} />
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{expense.description}</p>
          {showInstanceName && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{showInstanceName}</p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-0.5 text-sm font-medium text-gray-700">
            <DollarSign size={14} className="text-gray-400" />
            {Number(expense.amount).toFixed(2)}
          </span>
          {expanded ? (
            <ChevronUp size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-3 py-3 space-y-3">
          {/* Description */}
          <p className="text-sm text-gray-700">{expense.description}</p>

          {/* Amount */}
          {expense.status === 'approved' && (
            <div className="rounded-lg bg-green-50 p-2.5 text-xs">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Approved amount</span>
                <span className="font-semibold text-green-700">${Number(expense.amount).toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Rejection comment */}
          {expense.status === 'rejected' && expense.rejection_comment && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              <p className="font-medium">Rejection reason:</p>
              <p className="mt-0.5">{expense.rejection_comment}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {canEdit && (
              <button
                onClick={() => onEdit(expense)}
                className="flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Edit3 size={12} />
                Edit
              </button>
            )}
            {canSubmit && (
              <button
                onClick={handleSubmit}
                className="flex items-center gap-1 rounded-md bg-blue-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
              >
                <Send size={12} />
                Submit
              </button>
            )}
            {canCancel && (
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
              >
                <Undo2 size={12} />
                Recall
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors ml-auto"
              >
                <Trash2 size={12} />
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// List component (grouped by date)
// ---------------------------------------------------------------------------

interface ListProps {
  expenses: Expense[]
  onEdit: (expense: Expense) => void
  onRefresh: () => void
  instanceNames?: Record<string, string>
}

export function ExpenseList({ expenses, onEdit, onRefresh, instanceNames }: ListProps) {
  if (expenses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-400">No expenses yet.</p>
      </div>
    )
  }

  // Group by date
  const grouped = expenses.reduce<Record<string, Expense[]>>(
    (acc, expense) => {
      ;(acc[expense.date] ??= []).push(expense)
      return acc
    },
    {}
  )

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-4">
      {sortedDates.map((date) => (
        <div key={date}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 px-1">
            {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
          </h3>
          <div className="space-y-2">
            {grouped[date].map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                onEdit={onEdit}
                onRefresh={onRefresh}
                showInstanceName={instanceNames?.[expense.nanny_instance_id]}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
