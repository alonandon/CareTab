import { useState } from 'react'
import { Send, X, Copy, Check } from 'lucide-react'
import { inviteNanny } from '../hooks/useHousehold'
import { useAuth } from '../context/AuthContext'

interface Props {
  householdId: string
  open: boolean
  onClose: () => void
  onInvited: () => void
}

export function InviteNannyModal({ householdId, open, onClose, onInvited }: Props) {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !email.trim()) return

    setError('')
    setSubmitting(true)

    const invitation = await inviteNanny(householdId, email.trim(), user.id)
    if (!invitation) {
      setError('Failed to create invitation. Please try again.')
      setSubmitting(false)
      return
    }

    const link = `${window.location.origin}/invite/${invitation.token}`
    setInviteLink(link)
    setSubmitting(false)
    onInvited()
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setEmail('')
    setInviteLink('')
    setError('')
    setCopied(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-title"
    >
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} aria-hidden="true" />
      <div className="relative w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-5 shadow-xl mx-4 mb-0 sm:mb-0">
        <div className="flex items-center justify-between mb-4">
          <h2 id="invite-title" className="text-lg font-semibold text-gray-900">Invite a Nanny</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-3 text-sm text-red-600">{error}</p>
        )}

        {!inviteLink ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-1">
                Nanny&apos;s email
              </label>
              <input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="nanny@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              <Send size={16} />
              {submitting ? 'Creating invite...' : 'Create invite link'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Share this link with your nanny. It expires in 7 days.
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 p-3">
              <code className="flex-1 text-xs text-gray-700 break-all">{inviteLink}</code>
              <button
                onClick={handleCopy}
                className="shrink-0 rounded-md bg-white border border-gray-200 p-2 text-gray-500 hover:text-blue-500 transition-colors"
                aria-label="Copy link"
              >
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
            </div>
            <button
              onClick={handleClose}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
