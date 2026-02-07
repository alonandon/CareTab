import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { createNannyInstance } from '../hooks/useHousehold'
import type { Profile } from '../types'
import { format } from 'date-fns'

interface Props {
  householdId: string
  nannies: Profile[]
  onCreated: () => void
}

export function CreateNannyInstanceForm({ householdId, nannies, onCreated }: Props) {
  const [nannyId, setNannyId] = useState('')
  const [name, setName] = useState('')
  const [rateType, setRateType] = useState<'hourly' | 'weekly'>('hourly')
  const [rateAmount, setRateAmount] = useState('')
  const [overtimeEnabled, setOvertimeEnabled] = useState(false)
  const [overtimeMultiplier, setOvertimeMultiplier] = useState('1.50')
  const [overtimeTriggerType, setOvertimeTriggerType] = useState<'daily' | 'weekly'>('daily')
  const [overtimeTriggerHours, setOvertimeTriggerHours] = useState('8')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (nannies.length === 0) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nannyId || !name.trim() || !rateAmount) return

    setError('')
    setSubmitting(true)

    const result = await createNannyInstance(householdId, nannyId, name.trim(), {
      rate_type: rateType,
      rate_amount: parseFloat(rateAmount),
      overtime_enabled: overtimeEnabled,
      overtime_multiplier: overtimeEnabled ? parseFloat(overtimeMultiplier) : undefined,
      overtime_trigger_type: overtimeEnabled ? overtimeTriggerType : undefined,
      overtime_trigger_hours: overtimeEnabled ? parseFloat(overtimeTriggerHours) : undefined,
      effective_date: format(new Date(), 'yyyy-MM-dd'),
    })

    if (!result) {
      setError('Failed to create nanny instance. Please try again.')
      setSubmitting(false)
      return
    }

    setName('')
    setNannyId('')
    setRateAmount('')
    setOvertimeEnabled(false)
    setSubmitting(false)
    onCreated()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4"
    >
      <div className="flex items-center gap-2">
        <UserPlus size={18} className="text-blue-500" />
        <h3 className="text-sm font-semibold text-gray-900">Create Rate Profile</h3>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Nanny select */}
      <div>
        <label htmlFor="nanny-select" className="block text-sm font-medium text-gray-700 mb-1">
          Nanny
        </label>
        <select
          id="nanny-select"
          value={nannyId}
          onChange={(e) => setNannyId(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select a nanny</option>
          {nannies.map((n) => (
            <option key={n.id} value={n.id}>
              {n.full_name || n.email}
            </option>
          ))}
        </select>
      </div>

      {/* Instance name */}
      <div>
        <label htmlFor="instance-name" className="block text-sm font-medium text-gray-700 mb-1">
          Instance name
        </label>
        <input
          id="instance-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder='e.g. "Regular Hours"'
        />
      </div>

      {/* Rate config */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="rate-type" className="block text-sm font-medium text-gray-700 mb-1">
            Rate type
          </label>
          <select
            id="rate-type"
            value={rateType}
            onChange={(e) => setRateType(e.target.value as 'hourly' | 'weekly')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="hourly">Hourly</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <div>
          <label htmlFor="rate-amount" className="block text-sm font-medium text-gray-700 mb-1">
            Rate ($)
          </label>
          <input
            id="rate-amount"
            type="number"
            required
            min="0"
            step="0.01"
            value={rateAmount}
            onChange={(e) => setRateAmount(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="25.00"
          />
        </div>
      </div>

      {/* Overtime toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={overtimeEnabled}
          onChange={(e) => setOvertimeEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">Enable overtime</span>
      </label>

      {overtimeEnabled && (
        <div className="grid grid-cols-3 gap-3 rounded-lg bg-gray-50 p-3">
          <div>
            <label htmlFor="ot-multiplier" className="block text-xs font-medium text-gray-600 mb-1">
              Multiplier
            </label>
            <input
              id="ot-multiplier"
              type="number"
              min="1"
              step="0.01"
              value={overtimeMultiplier}
              onChange={(e) => setOvertimeMultiplier(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="ot-trigger-type" className="block text-xs font-medium text-gray-600 mb-1">
              Trigger
            </label>
            <select
              id="ot-trigger-type"
              value={overtimeTriggerType}
              onChange={(e) => setOvertimeTriggerType(e.target.value as 'daily' | 'weekly')}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div>
            <label htmlFor="ot-trigger-hours" className="block text-xs font-medium text-gray-600 mb-1">
              After (hrs)
            </label>
            <input
              id="ot-trigger-hours"
              type="number"
              min="1"
              step="0.5"
              value={overtimeTriggerHours}
              onChange={(e) => setOvertimeTriggerHours(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !nannyId || !name.trim() || !rateAmount}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
      >
        {submitting ? 'Creating...' : 'Create rate profile'}
      </button>
    </form>
  )
}
