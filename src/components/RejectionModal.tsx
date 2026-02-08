import { useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  title: string
  onConfirm: (comment: string) => Promise<void>
  onClose: () => void
}

export function RejectionModal({ title, onConfirm, onClose }: Props) {
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!comment.trim()) return
    setSubmitting(true)
    await onConfirm(comment.trim())
    setSubmitting(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rejection-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 space-y-4 mx-4 mb-0 sm:mb-0">
        <div className="flex items-center justify-between">
          <h3 id="rejection-title" className="text-base font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div>
          <label htmlFor="rejection-comment" className="block text-sm font-medium text-gray-700 mb-1">
            Reason for rejection
          </label>
          <textarea
            id="rejection-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            autoFocus
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 resize-none focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            placeholder="Explain why this is being rejected..."
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!comment.trim() || submitting}
            className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}
