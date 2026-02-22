import { useState } from 'react'
import { X, Save, Trash2 } from 'lucide-react'
import type { NannyInstanceForSelector } from '../hooks/useTimeEntries'
import type { Shift, RecurringShift } from '../types'
import { isValidTimeRange, isValidDate, isFutureDate } from '../lib/shifts'
import { useToast } from '../context/ToastContext'
import {
  createShift,
  updateShift,
  createRecurringShift,
  updateRecurringShift,
  deleteShift,
} from '../hooks/useShifts'

interface Props {
  instances: NannyInstanceForSelector[]
  userId: string
  editShift?: Shift
  editRecurringShift?: RecurringShift
  defaultDate?: string
  onClose: () => void
  onSaved: () => void
}

type ShiftType = 'one-off' | 'recurring'

export function ShiftModal({
  instances,
  userId,
  editShift,
  editRecurringShift,
  defaultDate,
  onClose,
  onSaved,
}: Props) {
  const { success: showSuccess, error: showError } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Determine if we're editing a recurring shift or one-off
  const isEditingRecurring = !!editRecurringShift
  const [shiftType, setShiftType] = useState<ShiftType>(
    isEditingRecurring ? 'recurring' : 'one-off'
  )

  // Common fields
  const [instanceId, setInstanceId] = useState(
    editShift?.nanny_instance_id ||
      editRecurringShift?.nanny_instance_id ||
      (instances.length === 1 ? instances[0].id : '')
  )
  const [startTime, setStartTime] = useState(
    editShift?.start_time ||
      editRecurringShift?.start_time ||
      '09:00'
  )
  const [endTime, setEndTime] = useState(
    editShift?.end_time ||
      editRecurringShift?.end_time ||
      '17:00'
  )
  const [notes, setNotes] = useState(editShift?.notes || editRecurringShift?.notes || '')
  const [rateOverride, setRateOverride] = useState<string>(
    (editShift?.rate_override ?? editRecurringShift?.rate_override)?.toString() || ''
  )

  // One-off shift fields
  const [date, setDate] = useState(editShift?.date || defaultDate || '')

  // Recurring shift fields
  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekly' | 'biweekly'>(
    editRecurringShift?.recurrence_type || 'weekly'
  )
  const [dayOfWeek, setDayOfWeek] = useState(
    editRecurringShift?.day_of_week?.toString() || '0'
  )
  const [startDate, setStartDate] = useState(editRecurringShift?.start_date || '')
  const [endDate, setEndDate] = useState(editRecurringShift?.end_date || '')

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const handleDelete = async () => {
    if (!editShift) return
    if (!window.confirm('Are you sure you want to delete this shift?')) return

    const success = await deleteShift(editShift.id)
    if (success) {
      showSuccess('Shift deleted.')
      onClose()
      onSaved()
    } else {
      showError('Failed to delete shift.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate common fields
    if (!instanceId) {
      setError('Please select a nanny instance.')
      return
    }

    if (!isValidTimeRange(startTime, endTime)) {
      setError('End time must be different from start time.')
      return
    }

    if (shiftType === 'one-off') {
      if (!date) {
        setError('Please select a date.')
        return
      }

      if (!isValidDate(date)) {
        setError('Invalid date.')
        return
      }

      if (!isFutureDate(date) && !editShift) {
        setError('Cannot schedule shifts in the past.')
        return
      }

      // Create or update one-off shift
      setSubmitting(true)

      if (editShift) {
        const rateValue: number | null = rateOverride ? parseFloat(rateOverride) : null
        const result = await updateShift(editShift.id, {
          date,
          start_time: startTime,
          end_time: endTime,
          notes: notes || null,
          rate_override: rateValue,
          nanny_instance_id: instanceId,
        })

        if (!result) {
          setError('Failed to update shift.')
          showError('Failed to update shift.')
          setSubmitting(false)
          return
        }
      } else {
        const rateValue: number | null = rateOverride ? parseFloat(rateOverride) : null
        const result = await createShift({
          nanny_instance_id: instanceId,
          date,
          start_time: startTime,
          end_time: endTime,
          notes: notes || null,
          rate_override: rateValue,
          created_by: userId,
        })

        if (!result) {
          setError('Failed to create shift.')
          showError('Failed to create shift.')
          setSubmitting(false)
          return
        }
      }
    } else {
      // Recurring shift
      if (!startDate) {
        setError('Please select a start date.')
        return
      }

      if (recurrenceType !== 'daily' && recurrenceType !== 'weekly' && recurrenceType !== 'biweekly') {
        setError('Please select a recurrence type.')
        return
      }

      setSubmitting(true)

      const rateValue: number | null = rateOverride ? parseFloat(rateOverride) : null
      const dayValue: number | null = recurrenceType === 'daily' ? null : parseInt(dayOfWeek, 10)

      if (editRecurringShift) {
        const result = await updateRecurringShift(editRecurringShift.id, {
          recurrence_type: recurrenceType,
          day_of_week: dayValue,
          start_time: startTime,
          end_time: endTime,
          notes: notes || null,
          rate_override: rateValue,
          start_date: startDate,
          end_date: endDate || null,
          nanny_instance_id: instanceId,
        })

        if (!result) {
          setError('Failed to update recurring shift.')
          showError('Failed to update recurring shift.')
          setSubmitting(false)
          return
        }
      } else {
        const result = await createRecurringShift({
          nanny_instance_id: instanceId,
          recurrence_type: recurrenceType,
          day_of_week: dayValue,
          start_time: startTime,
          end_time: endTime,
          notes: notes || null,
          rate_override: rateValue,
          start_date: startDate,
          end_date: endDate || null,
          created_by: userId,
        })

        if (!result) {
          setError('Failed to create recurring shift.')
          showError('Failed to create recurring shift.')
          setSubmitting(false)
          return
        }
      }
    }

    setSubmitting(false)
    showSuccess(
      editShift || editRecurringShift ? 'Shift updated.' : 'Shift created.'
    )
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {editShift || editRecurringShift ? 'Edit Shift' : 'Schedule Shift'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Nanny Selection */}
          <div>
            <label htmlFor="instance" className="block text-sm font-medium text-gray-700 mb-1">
              Nanny
            </label>
            <select
              id="instance"
              value={instanceId}
              onChange={(e) => setInstanceId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a nanny</option>
              {instances.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.profiles?.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Current Rate Profile Display */}
          {instanceId && instances.find((i) => i.id === instanceId)?.rate_configs && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-xs text-blue-600 font-medium mb-2">Rate Profile</p>
              {instances
                .find((i) => i.id === instanceId)
                ?.rate_configs?.map((rc) => (
                  <div key={rc.id} className="text-sm text-blue-900">
                    {rc.rate_type === 'hourly'
                      ? `$${rc.rate_amount}/hour`
                      : `$${rc.rate_amount}/week`}
                    {rc.overtime_enabled && (
                      <span className="ml-2 text-xs">
                        (Overtime: {rc.overtime_multiplier}x after {rc.overtime_trigger_hours}h)
                      </span>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* Step 3: Schedule Details */}
          {instanceId && (
            <>
              {/* Shift Type Toggle (only if creating new) */}
              {!editShift && !editRecurringShift && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shift Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShiftType('one-off')}
                      className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                        shiftType === 'one-off'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      One-off
                    </button>
                    <button
                      type="button"
                      onClick={() => setShiftType('recurring')}
                      className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                        shiftType === 'recurring'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Recurring
                    </button>
                  </div>
                </div>
              )}

              {/* One-off shift fields */}
              {shiftType === 'one-off' && (
                <>
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {/* Recurring shift fields */}
              {shiftType === 'recurring' && (
                <>
                  <div>
                    <label htmlFor="recurrence" className="block text-sm font-medium text-gray-700 mb-1">
                      Recurrence
                    </label>
                    <select
                      id="recurrence"
                      value={recurrenceType}
                      onChange={(e) => setRecurrenceType(e.target.value as any)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="daily">Every day</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                    </select>
                  </div>

                  {recurrenceType !== 'daily' && (
                    <div>
                      <label htmlFor="dayOfWeek" className="block text-sm font-medium text-gray-700 mb-1">
                        Day of Week
                      </label>
                      <select
                        id="dayOfWeek"
                        value={dayOfWeek}
                        onChange={(e) => setDayOfWeek(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {dayNames.map((day, idx) => (
                          <option key={idx} value={idx}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                      End Date (optional)
                    </label>
                    <input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {/* Time Range (both types) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Rate Override */}
              <div>
                <label htmlFor="rateOverride" className="block text-sm font-medium text-gray-700 mb-1">
                  Rate Override (optional)
                </label>
                <input
                  id="rateOverride"
                  type="number"
                  step="0.01"
                  min="0"
                  value={rateOverride}
                  onChange={(e) => setRateOverride(e.target.value)}
                  placeholder="Leave blank to use default rate"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this shift..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-4 border-t border-gray-200">
            {editShift && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 rounded-lg bg-red-100 text-red-700 font-medium text-sm hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              <Save size={16} />
              {submitting ? 'Saving...' : 'Save Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
