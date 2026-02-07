import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { addChild, removeChild } from '../hooks/useHousehold'
import type { Child } from '../types'

interface Props {
  householdId: string
  children: Child[]
  onChanged: () => void
}

export function AddChildForm({ householdId, children: kids, onChanged }: Props) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSubmitting(true)
    await addChild(householdId, name.trim())
    setName('')
    setSubmitting(false)
    onChanged()
  }

  const handleRemove = async (childId: string) => {
    await removeChild(childId)
    onChanged()
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Children</h3>

      {kids.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {kids.map((child) => (
            <li
              key={child.id}
              className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700"
            >
              <span>{child.name}</span>
              <button
                onClick={() => handleRemove(child.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
                aria-label={`Remove ${child.name}`}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Child's name"
        />
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          <Plus size={16} />
          Add
        </button>
      </form>
    </div>
  )
}
