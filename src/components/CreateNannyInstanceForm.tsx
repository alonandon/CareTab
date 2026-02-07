import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { format } from 'date-fns'
import { createNannyInstance } from '../hooks/useHousehold'
import { RateConfigFields } from './RateConfigFields'
import type { RateConfigValues } from './RateConfigFields'
import type { Profile } from '../types'

interface Props {
  householdId: string
  nannies: Profile[]
  onCreated: () => void
}

export function CreateNannyInstanceForm({ householdId, nannies, onCreated }: Props) {
  const [nannyId, setNannyId] = useState('')
  const [name, setName] = useState('')
  const [rateValues, setRateValues] = useState<RateConfigValues>({
    rateType: 'hourly',
    rateAmount: '',
    overtimeEnabled: false,
    overtimeMultiplier: '1.50',
    overtimeTriggerType: 'daily',
    overtimeTriggerHours: '8',
    effectiveDate: format(new Date(), 'yyyy-MM-dd'),
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (nannies.length === 0) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nannyId || !name.trim() || !rateValues.rateAmount) return

    setError('')
    setSubmitting(true)

    const result = await createNannyInstance(householdId, nannyId, name.trim(), {
      rate_type: rateValues.rateType,
      rate_amount: parseFloat(rateValues.rateAmount),
      overtime_enabled: rateValues.overtimeEnabled,
      overtime_multiplier: rateValues.overtimeEnabled
        ? parseFloat(rateValues.overtimeMultiplier)
        : undefined,
      overtime_trigger_type: rateValues.overtimeEnabled
        ? rateValues.overtimeTriggerType
        : undefined,
      overtime_trigger_hours: rateValues.overtimeEnabled
        ? parseFloat(rateValues.overtimeTriggerHours)
        : undefined,
      effective_date: rateValues.effectiveDate,
    })

    if (!result) {
      setError('Failed to create rate profile. Please try again.')
      setSubmitting(false)
      return
    }

    setName('')
    setNannyId('')
    setRateValues({
      rateType: 'hourly',
      rateAmount: '',
      overtimeEnabled: false,
      overtimeMultiplier: '1.50',
      overtimeTriggerType: 'daily',
      overtimeTriggerHours: '8',
      effectiveDate: format(new Date(), 'yyyy-MM-dd'),
    })
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

      {/* Rate config fields (shared component) */}
      <RateConfigFields values={rateValues} onChange={setRateValues} />

      <button
        type="submit"
        disabled={submitting || !nannyId || !name.trim() || !rateValues.rateAmount}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
      >
        {submitting ? 'Creating...' : 'Create rate profile'}
      </button>
    </form>
  )
}
