import { useState } from 'react'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { RateConfigFields } from './RateConfigFields'
import type { RateConfigValues } from './RateConfigFields'

interface Props {
  nannyInstanceId: string
  onCreated: () => void
}

export function RateConfigForm({ nannyInstanceId, onCreated }: Props) {
  const [values, setValues] = useState<RateConfigValues>({
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
  const [expanded, setExpanded] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!values.rateAmount) return

    setError('')
    setSubmitting(true)

    const { error: insertError } = await supabase.from('rate_configs').insert({
      nanny_instance_id: nannyInstanceId,
      rate_type: values.rateType,
      rate_amount: parseFloat(values.rateAmount),
      overtime_enabled: values.overtimeEnabled,
      overtime_multiplier: values.overtimeEnabled
        ? parseFloat(values.overtimeMultiplier)
        : null,
      overtime_trigger_type: values.overtimeEnabled
        ? values.overtimeTriggerType
        : null,
      overtime_trigger_hours: values.overtimeEnabled
        ? parseFloat(values.overtimeTriggerHours)
        : null,
      effective_date: values.effectiveDate,
    })

    if (insertError) {
      setError('Failed to add rate. Please try again.')
      setSubmitting(false)
      return
    }

    setValues({
      rateType: 'hourly',
      rateAmount: '',
      overtimeEnabled: false,
      overtimeMultiplier: '1.50',
      overtimeTriggerType: 'daily',
      overtimeTriggerHours: '8',
      effectiveDate: format(new Date(), 'yyyy-MM-dd'),
    })
    setSubmitting(false)
    setExpanded(false)
    onCreated()
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
      >
        <Plus size={16} />
        Add new rate
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">New Rate</h3>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Cancel
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <RateConfigFields
        values={values}
        onChange={setValues}
        showEffectiveDate
      />

      <button
        type="submit"
        disabled={submitting || !values.rateAmount}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
      >
        {submitting ? 'Adding...' : 'Add rate'}
      </button>
    </form>
  )
}
