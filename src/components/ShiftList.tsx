import { AlertCircle, Trash2, Edit2 } from 'lucide-react'
import type { Shift } from '../types'
import {
  formatShiftDate,
  formatShiftTimeRange,
  calculateShiftHours,
  getShiftStatusLabel,
  getShiftStatusColor,
} from '../lib/shifts'
import { deleteShift } from '../hooks/useShifts'
import { useToast } from '../context/ToastContext'

interface Props {
  shifts: Shift[]
  loading?: boolean
  onEdit?: (shift: Shift) => void
  onDelete?: () => void
  showActions?: boolean
  emptyMessage?: string
}

export function ShiftList({
  shifts,
  loading = false,
  onEdit,
  onDelete,
  showActions = true,
  emptyMessage = 'No shifts scheduled.',
}: Props) {
  const { error: showError, success: showSuccess } = useToast()

  const handleDelete = async (shiftId: string) => {
    if (window.confirm('Are you sure you want to delete this shift?')) {
      const success = await deleteShift(shiftId)
      if (success) {
        showSuccess('Shift deleted.')
        onDelete?.()
      } else {
        showError('Failed to delete shift.')
      }
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="text-center py-8 text-gray-500">Loading shifts...</div>
      </div>
    )
  }

  if (shifts.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-center gap-3 py-8 text-gray-500">
          <AlertCircle size={18} />
          <span>{emptyMessage}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {shifts.map((shift) => {
        const hours = calculateShiftHours(shift.start_time, shift.end_time)
        const statusLabel = getShiftStatusLabel(shift, false) // TODO: pass hasTimeEntry
        const statusColor = getShiftStatusColor(statusLabel)

        return (
          <div
            key={shift.id}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {formatShiftDate(shift.date)}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {formatShiftTimeRange(shift.start_time, shift.end_time)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        statusColor === 'blue'
                          ? 'bg-blue-100 text-blue-700'
                          : statusColor === 'yellow'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {statusLabel}
                    </span>
                    <span className="text-sm font-medium text-gray-600">
                      {hours.toFixed(1)}h
                    </span>
                  </div>
                </div>

                {shift.notes && (
                  <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    {shift.notes}
                  </div>
                )}

                {shift.rate_override && (
                  <div className="mt-2 text-xs text-gray-500">
                    Rate override: ${shift.rate_override.toFixed(2)}/hr
                  </div>
                )}
              </div>

              {showActions && (
                <div className="flex gap-2 ml-4">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(shift)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit shift"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(shift.id)}
                    className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                    title="Delete shift"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
