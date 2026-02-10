import { useMemo, useState } from 'react'
import { Plus, Trash2, Clock, Save, Send } from 'lucide-react'
import { format } from 'date-fns'
import { timeToHours, resolveRate } from '../lib/pay'
import { useToast } from '../context/ToastContext'
import type { NannyInstanceForSelector, TimeEntryWithPeriods } from '../hooks/useTimeEntries'
import { createTimeEntry, updateTimeEntry, submitTimeEntry } from '../hooks/useTimeEntries'

interface Period {
  start_time: string
  end_time: string
}

interface Props {
  instances: NannyInstanceForSelector[]
  userId: string
  /** If provided, we're editing an existing entry */
  editEntry?: TimeEntryWithPeriods
  /** Pre-select this instance */
  defaultInstanceId?: string
  onSaved: () => void
  onCancel?: () => void
}

export function TimeEntryForm({
  instances,
  userId,
  editEntry,
  defaultInstanceId,
  onSaved,
  onCancel,
}: Props) {
  // Deduplicate instances by household so each household appears once
  const householdOptions = useMemo(() => {
    const seen = new Map<string, NannyInstanceForSelector>()
    for (const inst of instances) {
      if (!seen.has(inst.household_id)) {
        seen.set(inst.household_id, inst)
      }
    }
    return Array.from(seen.values())
  }, [instances])

  // Auto-select if there's only one option or a default is provided
  const autoId = defaultInstanceId ?? (householdOptions.length === 1 ? householdOptions[0].id : '')
  const showSelector = !defaultInstanceId && householdOptions.length > 1

  const [instanceId, setInstanceId] = useState(
    editEntry?.nanny_instance_id ?? autoId
  )
  const [date, setDate] = useState(
    editEntry?.date ?? format(new Date(), 'yyyy-MM-dd')
  )
  const [periods, setPeriods] = useState<Period[]>(
    editEntry?.time_entry_periods?.map((p) => ({
      start_time: p.start_time.slice(0, 5),
      end_time: p.end_time.slice(0, 5),
    })) ?? [{ start_time: '09:00', end_time: '17:00' }]
  )
  const [notes, setNotes] = useState(editEntry?.notes ?? '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { success: showSuccess, error: showError } = useToast()

  const selectedInstance = instances.find((i) => i.id === instanceId)
  const currentRate = selectedInstance
    ? resolveRate(selectedInstance.rate_configs, date)
    : null
  const isWeekly = currentRate?.rate_type === 'weekly'

  const periodHours = (p: Period) => {
    if (!p.start_time || !p.end_time) return 0
    const s = timeToHours(p.start_time)
    const e = timeToHours(p.end_time)
    return e >= s ? e - s : 24 - s + e
  }

  const totalHours = periods.reduce((sum, p) => sum + periodHours(p), 0)

  const addPeriod = () => {
    setPeriods([...periods, { start_time: '', end_time: '' }])
  }

  const removePeriod = (idx: number) => {
    setPeriods(periods.filter((_, i) => i !== idx))
  }

  const updatePeriod = (idx: number, field: keyof Period, value: string) => {
    setPeriods(periods.map((p, i) => (i === idx ? { ...p, [field]: value } : p)))
  }

  const handleSave = async (status: 'draft' | 'pending') => {
    if (!instanceId || !date) return
    if (!isWeekly && periods.some((p) => !p.start_time || !p.end_time)) return

    setError('')
    setSubmitting(true)

    const entryPeriods = isWeekly ? [] : periods

    if (editEntry) {
      const ok = await updateTimeEntry(editEntry.id, {
        date,
        notes: notes || null,
        periods: entryPeriods,
      })
      if (!ok) {
        setError('Failed to update entry.')
        showError('Failed to update time entry.')
        setSubmitting(false)
        return
      }
      if (status === 'pending') {
        await submitTimeEntry(editEntry.id)
      }
    } else {
      const entry = await createTimeEntry({
        nanny_instance_id: instanceId,
        entered_by: userId,
        date,
        status,
        notes: notes || null,
        periods: entryPeriods,
      })
      if (!entry) {
        setError('Failed to create entry.')
        showError('Failed to create time entry.')
        setSubmitting(false)
        return
      }
    }

    setSubmitting(false)
    showSuccess(status === 'pending' ? 'Time entry submitted.' : 'Time entry saved as draft.')
    onSaved()
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            {editEntry ? 'Edit Time Entry' : 'New Time Entry'}
          </h3>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Household selector (only when nanny has multiple households) */}
      {showSelector && (
        <div>
          <label htmlFor="te-instance" className="block text-sm font-medium text-gray-700 mb-1">
            Household
          </label>
          <select
            id="te-instance"
            value={instanceId}
            onChange={(e) => setInstanceId(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select a household</option>
            {householdOptions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.households.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Date */}
      <div>
        <label htmlFor="te-date" className="block text-sm font-medium text-gray-700 mb-1">
          {isWeekly ? 'Week of' : 'Date'}
        </label>
        <input
          id="te-date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Time periods (hourly only) */}
      {!isWeekly && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time periods
          </label>
          <div className="space-y-2">
            {periods.map((period, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="time"
                  value={period.start_time}
                  onChange={(e) => updatePeriod(idx, 'start_time', e.target.value)}
                  required
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-gray-400 text-xs">to</span>
                <input
                  type="time"
                  value={period.end_time}
                  onChange={(e) => updatePeriod(idx, 'end_time', e.target.value)}
                  required
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="w-14 text-right text-xs text-gray-500">
                  {periodHours(period) > 0
                    ? `${periodHours(period).toFixed(1)}h`
                    : ''}
                </span>
                {periods.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePeriod(idx)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addPeriod}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-600"
          >
            <Plus size={14} />
            Add another period
          </button>

          {totalHours > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-xs text-gray-500">Total hours</span>
              <span className="text-sm font-semibold text-gray-900">
                {totalHours.toFixed(2)}h
              </span>
            </div>
          )}
        </div>
      )}

      {isWeekly && (
        <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-600">
          Weekly rate — no time periods needed. Just select the week start date.
        </div>
      )}

      {/* Notes */}
      <div>
        <label htmlFor="te-notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          id="te-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 resize-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Any notes about this entry..."
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleSave('draft')}
          disabled={submitting || !instanceId || !date}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {submitting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
          ) : (
            <Save size={16} />
          )}
          {editEntry ? 'Update draft' : 'Save draft'}
        </button>
        <button
          type="button"
          onClick={() => handleSave('pending')}
          disabled={submitting || !instanceId || !date}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {submitting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send size={16} />
          )}
          Submit
        </button>
      </div>
    </div>
  )
}
