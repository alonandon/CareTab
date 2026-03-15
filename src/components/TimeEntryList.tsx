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
import { totalHoursFromPeriods, resolveRate, calculatePay, calculateDailyPay } from '../lib/pay'
import type { PayBreakdown } from '../lib/pay'
import type { TimeEntryWithPeriods } from '../hooks/useTimeEntries'
import {
  deleteTimeEntry,
  submitTimeEntry,
  cancelSubmission,
} from '../hooks/useTimeEntries'
import type { RateConfig } from '../types'

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
// Single entry row
// ---------------------------------------------------------------------------

interface EntryRowProps {
  entry: TimeEntryWithPeriods
  rates?: RateConfig[]
  onEdit: (entry: TimeEntryWithPeriods) => void
  onRefresh: () => void
  showInstanceName?: string
}

function EntryRow({ entry, rates, onEdit, onRefresh, showInstanceName }: EntryRowProps) {
  const [expanded, setExpanded] = useState(false)

  const hours = totalHoursFromPeriods(entry.time_entry_periods)
  const rate = rates ? resolveRate(rates, entry.date) : null
  const pay: PayBreakdown | null =
    rate && entry.time_entry_periods.length > 0
      ? calculatePay(entry.time_entry_periods, rate)
      : rate?.rate_type === 'weekly'
        ? { regularHours: 0, overtimeHours: 0, regularPay: rate.rate_amount, overtimePay: 0, totalPay: rate.rate_amount }
        : null

  const canEdit = entry.status === 'draft' || entry.status === 'rejected'
  const canDelete = entry.status === 'draft'
  const canSubmit = entry.status === 'draft'
  const canCancel = entry.status === 'pending'

  const handleDelete = async () => {
    await deleteTimeEntry(entry.id)
    onRefresh()
  }

  const handleSubmit = async () => {
    await submitTimeEntry(entry.id)
    onRefresh()
  }

  const handleCancel = async () => {
    await cancelSubmission(entry.id)
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
              {format(parseISO(entry.date), 'EEE, MMM d')}
            </span>
            <StatusBadge status={entry.status} />
          </div>
          {showInstanceName && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{showInstanceName}</p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {entry.time_entry_periods.length > 0 && (
            <span className="text-sm text-gray-500">{hours.toFixed(1)}h</span>
          )}
          {pay && (
            <span className={`flex items-center gap-0.5 text-sm font-medium ${
              entry.status === 'approved' ? 'text-green-600' :
              entry.status === 'pending' ? 'text-amber-600' : 'text-gray-500'
            }`}>
              <DollarSign size={14} />
              {pay.totalPay.toFixed(2)}
            </span>
          )}
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
          {/* Time periods */}
          {entry.time_entry_periods.length > 0 && (
            <div className="space-y-1">
              {entry.time_entry_periods.map((p) => {
                const s = p.start_time.slice(0, 5)
                const e = p.end_time.slice(0, 5)
                return (
                  <div key={p.id} className="flex items-center gap-2 text-xs text-gray-600">
                    <Clock size={12} className="text-gray-400" />
                    <span>{s} — {e}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Weekly indicator */}
          {entry.time_entry_periods.length === 0 && rate?.rate_type === 'weekly' && (
            <p className="text-xs text-blue-600">Weekly rate entry</p>
          )}

          {/* Pay breakdown */}
          {pay && (
            <div className={`rounded-lg p-2.5 space-y-1 text-xs ${
              entry.status === 'approved' ? 'bg-green-50' :
              entry.status === 'pending' ? 'bg-amber-50' : 'bg-gray-50'
            }`}>
              {pay.regularHours > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Regular ({pay.regularHours}h × ${rate!.rate_amount}/hr)</span>
                  <span className="font-medium text-gray-900">${pay.regularPay.toFixed(2)}</span>
                </div>
              )}
              {pay.overtimeHours > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Overtime ({pay.overtimeHours}h × ${(rate!.rate_amount * (rate!.overtime_multiplier ?? 1)).toFixed(2)}/hr)</span>
                  <span className="font-medium text-gray-900">${pay.overtimePay.toFixed(2)}</span>
                </div>
              )}
              <div className={`flex justify-between border-t pt-1 ${
                entry.status === 'approved' ? 'border-green-200' :
                entry.status === 'pending' ? 'border-amber-200' : 'border-gray-200'
              }`}>
                <span className="font-medium text-gray-700">Total</span>
                <span className={`font-semibold ${
                  entry.status === 'approved' ? 'text-green-700' :
                  entry.status === 'pending' ? 'text-amber-700' : 'text-gray-700'
                }`}>${pay.totalPay.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Rejection comment */}
          {entry.status === 'rejected' && entry.rejection_comment && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              <p className="font-medium">Rejection reason:</p>
              <p className="mt-0.5">{entry.rejection_comment}</p>
            </div>
          )}

          {/* Notes */}
          {entry.notes && (
            <p className="text-xs text-gray-500">{entry.notes}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {canEdit && (
              <button
                onClick={() => onEdit(entry)}
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
  entries: TimeEntryWithPeriods[]
  rates?: RateConfig[]
  onEdit: (entry: TimeEntryWithPeriods) => void
  onRefresh: () => void
  /** If provided, shows instance name per row (for the global Hours page) */
  instanceNames?: Record<string, string>
}

export function TimeEntryList({ entries, rates, onEdit, onRefresh, instanceNames }: ListProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-400">No time entries yet.</p>
      </div>
    )
  }

  // Group by date
  const grouped = entries.reduce<Record<string, TimeEntryWithPeriods[]>>(
    (acc, entry) => {
      ;(acc[entry.date] ??= []).push(entry)
      return acc
    },
    {}
  )

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-4">
      {sortedDates.map((date) => {
        const entries = grouped[date]

        // Calculate daily total pay by aggregating all hours for the day
        const dailyTotalHours = entries.reduce((sum, entry) =>
          sum + totalHoursFromPeriods(entry.time_entry_periods), 0
        )

        // Get the rate for this date (use first entry's date to resolve rate)
        const firstRate = rates ? resolveRate(rates, date) : null
        const dailyPay = firstRate ? calculateDailyPay(dailyTotalHours, firstRate) : null

        return (
          <div key={date}>
            <div className="flex items-center justify-between px-1 mb-1.5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
              </h3>
              {dailyPay && entries.length > 0 && (
                <span className="flex items-center gap-0.5 text-xs font-medium text-gray-600">
                  <DollarSign size={12} />
                  {dailyPay.totalPay.toFixed(2)}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {entries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  rates={rates}
                  onEdit={onEdit}
                  onRefresh={onRefresh}
                  showInstanceName={instanceNames?.[entry.nanny_instance_id]}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
