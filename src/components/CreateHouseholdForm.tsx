import { useState } from 'react'
import { Home, Plus } from 'lucide-react'
import { createHousehold } from '../hooks/useHousehold'
import { useAuth } from '../context/AuthContext'

interface Props {
  onCreated: () => void
}

export function CreateHouseholdForm({ onCreated }: Props) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !name.trim()) return

    setError('')
    setSubmitting(true)

    const household = await createHousehold(name.trim(), user.id)
    if (!household) {
      setError('Failed to create household. Please try again.')
      setSubmitting(false)
      return
    }

    setName('')
    setSubmitting(false)
    onCreated()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Home size={18} className="text-blue-500" />
        <h3 className="text-sm font-semibold text-gray-900">Create a Household</h3>
      </div>

      {error && (
        <p className="mb-3 text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder='e.g. "The Smith Family"'
        />
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          <Plus size={16} />
          Create
        </button>
      </div>
    </form>
  )
}
