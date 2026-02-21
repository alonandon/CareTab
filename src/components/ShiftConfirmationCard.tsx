import { useState } from 'react'
import { Check, AlertCircle, Clock } from 'lucide-react'
import type { Shift } from '../types'
import {
  formatShiftDate,
  formatShiftTimeRange,
  calculateShiftHours,
} from '../lib/shifts'
import { confirmShift } from '../hooks/useShifts'
import { useToast } from '../context/ToastContext'

interface Props {
  shift: Shift
  userId: string
  onConfirmed?: (timeEntryId: string) => void
  onClose?: () => void
}

export function ShiftConfirmationCard({
  shift,
  userId,
  onConfirmed,
  onClose,
}: Props) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const { success: showSuccess, error: showError } = useToast()

  const hours = calculateShiftHours(shift.start_time, shift.end_time)

  const handleConfirm = async () => {
    setError('')
    setConfirming(true)

    const { timeEntryId, error: confirmError } = await confirmShift(shift.id, userId)

    if (confirmError || !timeEntryId) {
      setError('Failed to confirm shift. Please try again.')
      showError('Failed to confirm shift.')
      setConfirming(false)
      return
    }

    setConfirming(false)
    showSuccess('Shift confirmed! Time entry created as draft.')
    onConfirmed?.(timeEntryId)
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-amber-900 mb-2">
            Confirm Shift Completion
          </h3>
          <div className="space-y-2 text-sm text-amber-800 mb-4">
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span>
                <strong>{formatShiftDate(shift.date)}</strong> •{' '}
                {formatShiftTimeRange(shift.start_time, shift.end_time)}
              </span>
            </div>
            <div>
              <strong>Scheduled Hours:</strong> {hours.toFixed(1)} hours
            </div>
            {shift.rate_override && (
              <div>
                <strong>Rate Override:</strong> ${shift.rate_override.toFixed(2)}/hr
              </div>
            )}
            {shift.notes && (
              <div>
                <strong>Notes:</strong> {shift.notes}
              </div>
            )}
          </div>

          <p className="text-xs text-amber-700 mb-4 bg-amber-100 p-2 rounded">
            Confirming this shift will create a draft time entry with the scheduled hours.
            You can adjust the actual hours worked before submitting for approval.
          </p>

          {error && (
            <div className="p-2 rounded bg-red-100 text-red-700 text-xs mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-2 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              <Check size={16} />
              {confirming ? 'Confirming...' : 'Confirm Shift'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
