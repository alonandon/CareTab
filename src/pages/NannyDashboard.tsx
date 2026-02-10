import { useMemo, useState } from 'react'
import { Home, Mail, Loader2, DollarSign, CheckCircle, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { useHouseholds, useNannyHouseholds } from '../hooks/useHousehold'
import { useMultiBalance } from '../hooks/useBalance'
import { usePendingInvites, acceptInvite, declineInvite } from '../hooks/usePendingInvites'
import { usePendingPayments, acceptPayment, disputePayment } from '../hooks/usePayments'
import type { PendingPayment } from '../hooks/usePayments'
import { BalanceInline } from '../components/BalanceCard'
import { RejectionModal } from '../components/RejectionModal'
import { SkeletonDashboard } from '../components/Skeleton'
import { EmptyState } from '../components/EmptyState'
import type { Balance } from '../hooks/useBalance'

export function NannyDashboard() {
  const { user, profile } = useAuth()
  const { households, loading, refresh: refreshHouseholds } = useHouseholds()
  const { instances } = useNannyHouseholds()
  const { invites, refresh: refreshInvites } = usePendingInvites(profile?.email)
  const navigate = useNavigate()

  const instanceIds = useMemo(() => instances.map((i) => i.id), [instances])
  const { balances, loading: balancesLoading } = useMultiBalance(instanceIds)
  const { payments: pendingPayments, refresh: refreshPayments } = usePendingPayments(instanceIds, user?.id)

  // Aggregate balances per household
  const householdBalances = useMemo(() => {
    const map: Record<string, Balance> = {}
    for (const inst of instances) {
      const bal = balances[inst.id]
      if (!bal) continue
      const hid = inst.household_id
      if (!map[hid]) {
        map[hid] = { approvedOwed: 0, pendingApproval: 0, totalOwed: 0 }
      }
      map[hid].approvedOwed += bal.approvedOwed
      map[hid].pendingApproval += bal.pendingApproval
      map[hid].totalOwed += bal.totalOwed
    }
    return map
  }, [instances, balances])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hi, {profile?.full_name || 'there'}
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">Nanny Dashboard</p>
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Pending Invites
          </h2>
          <div className="space-y-3">
            {invites.map((invite) => (
              <InviteCard
                key={invite.id}
                inviteId={invite.id}
                householdId={invite.household_id}
                householdName={invite.households?.name ?? 'Unknown household'}
                invitedBy={invite.profiles?.full_name || invite.profiles?.email || 'Someone'}
                userId={user!.id}
                onResponded={() => {
                  refreshInvites()
                  refreshHouseholds()
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Payments to Review
          </h2>
          <div className="space-y-3">
            {pendingPayments.map((payment) => (
              <PendingPaymentCard
                key={payment.id}
                payment={payment}
                currentUserId={user!.id}
                onResponded={refreshPayments}
              />
            ))}
          </div>
        </section>
      )}

      {/* Connected Households */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          My Households
        </h2>

        {loading ? (
          <SkeletonDashboard />
        ) : households.length === 0 && invites.length === 0 ? (
          <EmptyState
            icon={Home}
            title="No households yet"
            description="When a parent invites you, it will appear here."
          />
        ) : households.length === 0 ? (
          <p className="text-sm text-gray-400">No households yet. Accept an invite above to get started.</p>
        ) : (
          <div className="space-y-3">
            {households.map((h) => {
              const parentMembers = h.household_members.filter(
                (m) => m.role === 'parent'
              )
              return (
                <button
                  key={h.id}
                  onClick={() => navigate(`/household/${h.id}`)}
                  className="w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-left hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold text-gray-900">{h.name}</h3>
                  {parentMembers.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      {parentMembers
                        .map((m) => m.profiles.full_name || m.profiles.email)
                        .join(', ')}
                    </p>
                  )}
                  {h.children.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {h.children.map((child) => (
                        <span
                          key={child.id}
                          className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
                        >
                          {child.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {householdBalances[h.id] && (
                    <BalanceInline balance={householdBalances[h.id]} loading={balancesLoading} />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Invite Card
// ---------------------------------------------------------------------------

function InviteCard({
  inviteId,
  householdId,
  householdName,
  invitedBy,
  userId,
  onResponded,
}: {
  inviteId: string
  householdId: string
  householdName: string
  invitedBy: string
  userId: string
  onResponded: () => void
}) {
  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [error, setError] = useState('')

  const handleAccept = async () => {
    setAccepting(true)
    setError('')
    const result = await acceptInvite(inviteId, householdId, userId)
    if (result.error) {
      setError(result.error)
      setAccepting(false)
      return
    }
    onResponded()
  }

  const handleDecline = async () => {
    setDeclining(true)
    setError('')
    const result = await declineInvite(inviteId)
    if (result.error) {
      setError(result.error)
      setDeclining(false)
      return
    }
    onResponded()
  }

  return (
    <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
          <Mail size={16} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{householdName}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Invited by {invitedBy}
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={handleAccept}
          disabled={accepting || declining}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {accepting ? <Loader2 size={14} className="animate-spin" /> : null}
          {accepting ? 'Joining...' : 'Accept'}
        </button>
        <button
          onClick={handleDecline}
          disabled={accepting || declining}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {declining ? <Loader2 size={14} className="animate-spin" /> : null}
          {declining ? 'Declining...' : 'Decline'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pending Payment Card
// ---------------------------------------------------------------------------

function PendingPaymentCard({
  payment,
  currentUserId,
  onResponded,
}: {
  payment: PendingPayment
  currentUserId: string
  onResponded: () => void
}) {
  const [accepting, setAccepting] = useState(false)
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [error, setError] = useState('')

  const handleAccept = async () => {
    setAccepting(true)
    setError('')
    const ok = await acceptPayment(payment.id)
    if (!ok) {
      setError('Failed to accept payment.')
      setAccepting(false)
      return
    }
    onResponded()
  }

  const handleDispute = async (comment: string) => {
    const ok = await disputePayment(payment.id, comment, currentUserId)
    setShowDisputeModal(false)
    if (!ok) {
      setError('Failed to dispute payment.')
      return
    }
    onResponded()
  }

  const methodLabel: Record<string, string> = {
    cash: 'Cash', check: 'Check', venmo: 'Venmo',
    zelle: 'Zelle', bank_transfer: 'Bank Transfer', other: 'Other',
  }

  return (
    <>
      <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
            <DollarSign size={16} className="text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">
                ${Number(payment.amount).toFixed(2)}
              </span>
              <span className="text-xs text-gray-500">
                via {methodLabel[payment.method ?? ''] ?? 'Unknown'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              From {payment.profiles?.full_name || payment.profiles?.email || 'Parent'} — {payment.nanny_instances?.households?.name}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {format(parseISO(payment.date), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        )}

        <div className="mt-3 flex gap-2">
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-green-500 px-3 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {accepting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            {accepting ? 'Accepting...' : 'Accept'}
          </button>
          <button
            onClick={() => setShowDisputeModal(true)}
            disabled={accepting}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            <XCircle size={14} />
            Dispute
          </button>
        </div>
      </div>

      {showDisputeModal && (
        <RejectionModal
          title="Dispute Payment"
          onConfirm={handleDispute}
          onClose={() => setShowDisputeModal(false)}
        />
      )}
    </>
  )
}
