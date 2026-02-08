import { DollarSign } from 'lucide-react'
import type { Balance } from '../hooks/useBalance'

interface Props {
  balance: Balance
  loading?: boolean
  compact?: boolean
}

export function BalanceCard({ balance, loading, compact }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
      </div>
    )
  }

  const isZeroOrCredit = balance.totalOwed <= 0
  const accentColor = isZeroOrCredit ? 'text-green-600' : 'text-gray-900'

  if (compact) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
        <span className="text-xs text-gray-500">Balance owed</span>
        <span className={`text-sm font-semibold ${accentColor}`}>
          ${Math.abs(balance.totalOwed).toFixed(2)}
          {balance.totalOwed < 0 && ' credit'}
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isZeroOrCredit ? 'bg-green-50' : 'bg-blue-50'}`}>
          <DollarSign size={16} className={isZeroOrCredit ? 'text-green-500' : 'text-blue-500'} />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">Balance</h3>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Approved owed</span>
          <span className={`font-medium ${balance.approvedOwed <= 0 ? 'text-green-600' : 'text-gray-900'}`}>
            ${Math.abs(balance.approvedOwed).toFixed(2)}
            {balance.approvedOwed < 0 && ' credit'}
          </span>
        </div>

        {balance.pendingApproval > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Pending approval</span>
            <span className="font-medium text-amber-600">
              ${balance.pendingApproval.toFixed(2)}
            </span>
          </div>
        )}

        <div className="flex justify-between border-t border-gray-100 pt-1.5 text-sm">
          <span className="font-medium text-gray-700">Total owed</span>
          <span className={`font-bold ${accentColor}`}>
            ${Math.abs(balance.totalOwed).toFixed(2)}
            {balance.totalOwed < 0 && ' credit'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline balance for cards (tiny, one-line)
// ---------------------------------------------------------------------------

export function BalanceInline({ balance, loading }: { balance: Balance; loading?: boolean }) {
  if (loading) {
    return <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
  }

  if (balance.totalOwed === 0 && balance.pendingApproval === 0 && balance.approvedOwed === 0) return null

  const isZeroOrCredit = balance.totalOwed <= 0

  return (
    <div className="flex items-center gap-2 mt-2">
      {balance.totalOwed !== 0 && (
        <span className={`text-xs font-semibold ${isZeroOrCredit ? 'text-green-600' : 'text-gray-700'}`}>
          ${Math.abs(balance.totalOwed).toFixed(2)} {balance.totalOwed < 0 ? 'credit' : 'owed'}
        </span>
      )}
      {balance.pendingApproval > 0 && (
        <span className="text-xs text-amber-600">
          +${balance.pendingApproval.toFixed(2)} pending
        </span>
      )}
    </div>
  )
}
