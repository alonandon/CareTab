import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  CreditCard,
  Banknote,
  Landmark,
  Smartphone,
  HelpCircle,
  FileCheck,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { Payment } from '../types'
import { acceptPayment, disputePayment } from '../hooks/usePayments'
import { RejectionModal } from './RejectionModal'

// ---------------------------------------------------------------------------
// Method display
// ---------------------------------------------------------------------------

const methodConfig: Record<string, { label: string; icon: typeof CreditCard }> = {
  cash: { label: 'Cash', icon: Banknote },
  check: { label: 'Check', icon: FileCheck },
  venmo: { label: 'Venmo', icon: Smartphone },
  zelle: { label: 'Zelle', icon: Smartphone },
  bank_transfer: { label: 'Bank Transfer', icon: Landmark },
  other: { label: 'Other', icon: HelpCircle },
}

function MethodBadge({ method }: { method: Payment['method'] }) {
  const cfg = method ? methodConfig[method] : null
  if (!cfg) return null
  const Icon = cfg.icon
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
      <Icon size={12} />
      {cfg.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const statusConfig = {
  logged: { label: 'Logged', color: 'bg-amber-100 text-amber-700', icon: DollarSign },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Disputed', color: 'bg-red-100 text-red-700', icon: AlertCircle },
} as const

function StatusBadge({ status }: { status: keyof typeof statusConfig }) {
  const { label, color, icon: Icon } = statusConfig[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      <Icon size={12} />
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Single payment row
// ---------------------------------------------------------------------------

interface PaymentRowProps {
  payment: Payment
  currentUserId: string
  onRefresh: () => void
  showInstanceName?: string
}

function PaymentRow({ payment, currentUserId, onRefresh, showInstanceName }: PaymentRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)

  // Nanny can accept/dispute payments logged by the parent
  const isCounterparty = payment.logged_by !== currentUserId
  const canAccept = payment.status === 'logged' && isCounterparty
  const canDispute = payment.status === 'logged' && isCounterparty

  const handleAccept = async () => {
    await acceptPayment(payment.id)
    onRefresh()
  }

  const handleDispute = async (comment: string) => {
    await disputePayment(payment.id, comment, currentUserId)
    setShowRejectModal(false)
    onRefresh()
  }

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        {/* Collapsed row */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 px-3 py-3 text-left"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">
                {format(parseISO(payment.date), 'EEE, MMM d')}
              </span>
              <StatusBadge status={payment.status} />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <MethodBadge method={payment.method} />
              {showInstanceName && (
                <span className="text-xs text-gray-400 truncate">{showInstanceName}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="flex items-center gap-0.5 text-sm font-semibold text-gray-900">
              <DollarSign size={14} className="text-gray-400" />
              {Number(payment.amount).toFixed(2)}
            </span>
            {expanded ? (
              <ChevronUp size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )}
          </div>
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div className="border-t border-gray-100 px-3 py-3 space-y-3">
            {/* Summary */}
            <div className="rounded-lg bg-gray-50 p-2.5 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="font-medium text-gray-900">${Number(payment.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Method</span>
                <MethodBadge method={payment.method} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="text-gray-700">{format(parseISO(payment.date), 'MMMM d, yyyy')}</span>
              </div>
            </div>

            {/* Rejection comment */}
            {payment.status === 'rejected' && payment.rejection_comment && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                <p className="font-medium">Dispute reason:</p>
                <p className="mt-0.5">{payment.rejection_comment}</p>
              </div>
            )}

            {/* Accepted indicator */}
            {payment.status === 'accepted' && (
              <div className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700 flex items-center gap-1.5">
                <CheckCircle size={14} />
                Payment confirmed by nanny
              </div>
            )}

            {/* Nanny actions */}
            {(canAccept || canDispute) && (
              <div className="flex gap-2 pt-1">
                {canAccept && (
                  <button
                    onClick={handleAccept}
                    className="flex items-center gap-1 rounded-md bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600 transition-colors"
                  >
                    <CheckCircle size={12} />
                    Accept
                  </button>
                )}
                {canDispute && (
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <XCircle size={12} />
                    Dispute
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showRejectModal && (
        <RejectionModal
          title="Dispute Payment"
          onConfirm={handleDispute}
          onClose={() => setShowRejectModal(false)}
        />
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Date range filter
// ---------------------------------------------------------------------------

interface DateFilter {
  from: string
  to: string
}

// ---------------------------------------------------------------------------
// List component
// ---------------------------------------------------------------------------

interface ListProps {
  payments: Payment[]
  currentUserId: string
  onRefresh: () => void
  instanceNames?: Record<string, string>
}

export function PaymentList({ payments, currentUserId, onRefresh, instanceNames }: ListProps) {
  const [filter, setFilter] = useState<DateFilter>({ from: '', to: '' })

  const filtered = payments.filter((p) => {
    if (filter.from && p.date < filter.from) return false
    if (filter.to && p.date > filter.to) return false
    return true
  })

  return (
    <div className="space-y-3">
      {/* Date filter */}
      {payments.length > 0 && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filter.from}
            onChange={(e) => setFilter((f) => ({ ...f, from: e.target.value }))}
            className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="From"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={filter.to}
            onChange={(e) => setFilter((f) => ({ ...f, to: e.target.value }))}
            className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {(filter.from || filter.to) && (
            <button
              onClick={() => setFilter({ from: '', to: '' })}
              className="text-xs text-blue-500 hover:text-blue-600 font-medium whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-400">
            {payments.length === 0 ? 'No payments yet.' : 'No payments in this date range.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupByDate(filtered).map(([date, group]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 px-1">
                {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
              </h3>
              <div className="space-y-2">
                {group.map((payment) => (
                  <PaymentRow
                    key={payment.id}
                    payment={payment}
                    currentUserId={currentUserId}
                    onRefresh={onRefresh}
                    showInstanceName={instanceNames?.[payment.nanny_instance_id]}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupByDate(payments: Payment[]): [string, Payment[]][] {
  const grouped = payments.reduce<Record<string, Payment[]>>(
    (acc, p) => {
      ;(acc[p.date] ??= []).push(p)
      return acc
    },
    {}
  )
  return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]))
}
