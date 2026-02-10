import { useMemo, useState } from 'react'
import { Receipt, Save, Send } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '../context/ToastContext'
import type { NannyInstanceForSelector } from '../hooks/useTimeEntries'
import type { Expense } from '../types'
import { createExpense, updateExpense, submitExpense } from '../hooks/useExpenses'

interface Props {
  instances: NannyInstanceForSelector[]
  userId: string
  editExpense?: Expense
  defaultInstanceId?: string
  onSaved: () => void
  onCancel?: () => void
}

export function ExpenseForm({
  instances,
  userId,
  editExpense,
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
    editExpense?.nanny_instance_id ?? autoId
  )
  const [date, setDate] = useState(
    editExpense?.date ?? format(new Date(), 'yyyy-MM-dd')
  )
  const [amount, setAmount] = useState(
    editExpense ? String(editExpense.amount) : ''
  )
  const [description, setDescription] = useState(editExpense?.description ?? '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { success: showSuccess, error: showError } = useToast()

  const handleSave = async (status: 'draft' | 'pending') => {
    if (!instanceId || !date || !amount || !description.trim()) return

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount.')
      return
    }

    setError('')
    setSubmitting(true)

    if (editExpense) {
      const ok = await updateExpense(editExpense.id, {
        date,
        amount: parsedAmount,
        description: description.trim(),
      })
      if (!ok) {
        setError('Failed to update expense.')
        showError('Failed to update expense.')
        setSubmitting(false)
        return
      }
      if (status === 'pending') {
        await submitExpense(editExpense.id)
      }
    } else {
      const expense = await createExpense({
        nanny_instance_id: instanceId,
        entered_by: userId,
        date,
        amount: parsedAmount,
        description: description.trim(),
        status,
      })
      if (!expense) {
        setError('Failed to create expense.')
        showError('Failed to create expense.')
        setSubmitting(false)
        return
      }
    }

    setSubmitting(false)
    showSuccess(status === 'pending' ? 'Expense submitted.' : 'Expense saved as draft.')
    onSaved()
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt size={18} className="text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            {editExpense ? 'Edit Expense' : 'New Expense'}
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
          <label htmlFor="exp-instance" className="block text-sm font-medium text-gray-700 mb-1">
            Household
          </label>
          <select
            id="exp-instance"
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
        <label htmlFor="exp-date" className="block text-sm font-medium text-gray-700 mb-1">
          Date
        </label>
        <input
          id="exp-date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Amount */}
      <div>
        <label htmlFor="exp-amount" className="block text-sm font-medium text-gray-700 mb-1">
          Amount
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input
            id="exp-amount"
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

      {/* Description */}
      <div>
        <label htmlFor="exp-desc" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="exp-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 resize-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="What was this expense for?"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleSave('draft')}
          disabled={submitting || !instanceId || !date || !amount || !description.trim()}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {submitting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
          ) : (
            <Save size={16} />
          )}
          {editExpense ? 'Update draft' : 'Save draft'}
        </button>
        <button
          type="button"
          onClick={() => handleSave('pending')}
          disabled={submitting || !instanceId || !date || !amount || !description.trim()}
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
