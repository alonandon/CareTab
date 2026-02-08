import { useState } from 'react'
import { DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import type { NannyInstanceForSelector } from '../hooks/useTimeEntries'
import type { Payment } from '../types'
import { logPayment } from '../hooks/usePayments'

const METHODS: { value: NonNullable<Payment['method']>; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
]

interface Props {
  instances: NannyInstanceForSelector[]
  userId: string
  defaultInstanceId?: string
  onSaved: () => void
  onCancel?: () => void
}

export function PaymentForm({
  instances,
  userId,
  defaultInstanceId,
  onSaved,
  onCancel,
}: Props) {
  const [instanceId, setInstanceId] = useState(defaultInstanceId ?? '')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<Payment['method']>('cash')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!instanceId || !date || !amount) return

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount.')
      return
    }

    setError('')
    setSubmitting(true)

    const payment = await logPayment({
      nanny_instance_id: instanceId,
      logged_by: userId,
      amount: parsedAmount,
      date,
      method,
    })

    if (!payment) {
      setError('Failed to log payment.')
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    onSaved()
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign size={18} className="text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-900">Log Payment</h3>
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

      {/* Instance selector */}
      {!defaultInstanceId && (
        <div>
          <label htmlFor="pay-instance" className="block text-sm font-medium text-gray-700 mb-1">
            Nanny
          </label>
          <select
            id="pay-instance"
            value={instanceId}
            onChange={(e) => setInstanceId(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select a nanny</option>
            {instances.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.households.name} — {inst.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Amount */}
      <div>
        <label htmlFor="pay-amount" className="block text-sm font-medium text-gray-700 mb-1">
          Amount
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input
            id="pay-amount"
            type="number"
            required
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Date */}
      <div>
        <label htmlFor="pay-date" className="block text-sm font-medium text-gray-700 mb-1">
          Date
        </label>
        <input
          id="pay-date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Payment method */}
      <div>
        <label htmlFor="pay-method" className="block text-sm font-medium text-gray-700 mb-1">
          Payment method
        </label>
        <select
          id="pay-method"
          value={method ?? ''}
          onChange={(e) => setMethod(e.target.value as Payment['method'])}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !instanceId || !date || !amount}
        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
      >
        <DollarSign size={16} />
        Log Payment
      </button>
    </div>
  )
}
