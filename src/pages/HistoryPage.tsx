import { useState, useMemo, useCallback } from 'react'
import { format } from 'date-fns'
import {
  Download,
  SlidersHorizontal,
  X,
  Clock,
  Receipt,
  DollarSign,
  ArrowUpDown,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNannyInstances, useHouseholdInstances } from '../hooks/useTimeEntries'
import {
  useTransactions,
  applyFilters,
  paginate,
} from '../hooks/useTransactions'
import type { TransactionFilters, TransactionType, TransactionStatus, Transaction } from '../hooks/useTransactions'
import { transactionsToCsv, downloadCsv } from '../lib/csv'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_TYPES: TransactionType[] = ['time', 'expense', 'payment']
const ALL_STATUSES: TransactionStatus[] = [
  'draft',
  'pending',
  'approved',
  'rejected',
  'logged',
  'accepted',
]

const TYPE_LABELS: Record<TransactionType, string> = {
  time: 'Time',
  expense: 'Expense',
  payment: 'Payment',
}
const STATUS_LABELS: Record<TransactionStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  logged: 'Logged',
  accepted: 'Accepted',
}

const TYPE_ICONS: Record<TransactionType, typeof Clock> = {
  time: Clock,
  expense: Receipt,
  payment: DollarSign,
}

const STATUS_COLORS: Record<TransactionStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-amber-50 text-amber-600',
  approved: 'bg-green-50 text-green-600',
  rejected: 'bg-red-50 text-red-600',
  logged: 'bg-amber-50 text-amber-600',
  accepted: 'bg-green-50 text-green-600',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DEFAULT_FILTERS: TransactionFilters = {
  dateFrom: '',
  dateTo: '',
  types: [],
  statuses: [],
  sortBy: 'date',
  sortDir: 'desc',
}

export function HistoryPage() {
  const { user, profile } = useAuth()
  const isParent = profile?.role === 'parent'

  const { instances: nannyInst, loading: nLoad } = useNannyInstances(
    !isParent ? user?.id : undefined
  )
  const { instances: parentInst, loading: pLoad } = useHouseholdInstances(
    isParent ? user?.id : undefined
  )

  const instances = isParent ? parentInst : nannyInst
  const instancesLoading = isParent ? pLoad : nLoad

  const instanceIds = useMemo(
    () => instances.map((i) => i.id),
    [instances]
  )

  const { transactions, loading: txnLoading } = useTransactions(instanceIds)

  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)

  const filtered = useMemo(
    () => applyFilters(transactions, filters),
    [transactions, filters]
  )
  const { items, hasMore } = useMemo(
    () => paginate(filtered, page),
    [filtered, page]
  )

  const loading = instancesLoading || txnLoading

  // Reset page when filters change
  const updateFilter = useCallback(
    <K extends keyof TransactionFilters>(key: K, value: TransactionFilters[K]) => {
      setFilters((f) => ({ ...f, [key]: value }))
      setPage(1)
    },
    []
  )

  const toggleType = useCallback(
    (type: TransactionType) => {
      setFilters((f) => {
        const next = f.types.includes(type)
          ? f.types.filter((t) => t !== type)
          : [...f.types, type]
        return { ...f, types: next }
      })
      setPage(1)
    },
    []
  )

  const toggleStatus = useCallback(
    (status: TransactionStatus) => {
      setFilters((f) => {
        const next = f.statuses.includes(status)
          ? f.statuses.filter((s) => s !== status)
          : [...f.statuses, status]
        return { ...f, statuses: next }
      })
      setPage(1)
    },
    []
  )

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setPage(1)
  }, [])

  const hasActiveFilters =
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.types.length > 0 ||
    filters.statuses.length > 0

  const handleExport = useCallback(() => {
    const csv = transactionsToCsv(filtered)
    const dateStr = format(new Date(), 'yyyy-MM-dd')
    downloadCsv(csv, `keeper-history-${dateStr}.csv`)
  }, [filtered])

  const toggleSort = useCallback(
    (col: 'date' | 'amount') => {
      setFilters((f) => {
        if (f.sortBy === col) {
          return { ...f, sortDir: f.sortDir === 'asc' ? 'desc' : 'asc' }
        }
        return { ...f, sortBy: col, sortDir: 'desc' }
      })
      setPage(1)
    },
    []
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">History</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              showFilters
                ? 'border-blue-300 bg-blue-50 text-blue-600'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal size={16} />
            Filters
            {hasActiveFilters && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white">
                !
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
          {/* Date range */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Date range
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Type filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Type
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_TYPES.map((type) => {
                const active = filters.types.includes(type)
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {TYPE_LABELS[type]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map((status) => {
                const active = filters.statuses.includes(status)
                return (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Clear */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
            >
              <X size={12} />
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Sort controls */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>Sort by:</span>
        <SortButton
          label="Date"
          active={filters.sortBy === 'date'}
          dir={filters.sortBy === 'date' ? filters.sortDir : undefined}
          onClick={() => toggleSort('date')}
        />
        <SortButton
          label="Amount"
          active={filters.sortBy === 'amount'}
          dir={filters.sortBy === 'amount' ? filters.sortDir : undefined}
          onClick={() => toggleSort('amount')}
        />
        <span className="ml-auto text-gray-400">
          {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Transaction list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-500">
            {hasActiveFilters
              ? 'No transactions match your filters.'
              : 'No transactions yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((txn) => (
            <TransactionRow key={`${txn.type}-${txn.id}`} txn={txn} />
          ))}

          {hasMore && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="flex w-full items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <ChevronDown size={16} />
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir?: 'asc' | 'desc'
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-0.5 rounded px-2 py-1 transition-colors ${
        active
          ? 'bg-blue-50 text-blue-600 font-medium'
          : 'hover:bg-gray-100 text-gray-500'
      }`}
    >
      {label}
      {active && (
        <ArrowUpDown
          size={12}
          className={dir === 'asc' ? 'rotate-180' : ''}
        />
      )}
    </button>
  )
}

function TransactionRow({ txn }: { txn: Transaction }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = TYPE_ICONS[txn.type]
  const iconColorClass =
    txn.type === 'time'
      ? 'bg-blue-50 text-blue-500'
      : txn.type === 'expense'
        ? 'bg-amber-50 text-amber-500'
        : 'bg-green-50 text-green-500'

  const amountPrefix = txn.type === 'payment' ? '-' : '+'
  const amountColor = txn.type === 'payment' ? 'text-green-600' : 'text-gray-900'

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm text-left hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconColorClass}`}
        >
          <Icon size={16} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900 truncate">
              {txn.description}
            </span>
            <span className={`text-sm font-semibold ${amountColor} ml-2 shrink-0`}>
              {amountPrefix}${txn.amount.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400">
              {format(new Date(txn.date + 'T00:00:00'), 'MMM d, yyyy')}
            </span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[txn.status]}`}
            >
              {STATUS_LABELS[txn.status]}
            </span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 border-t border-gray-100 pt-3 space-y-1 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>Household</span>
            <span className="text-gray-700">{txn.householdName}</span>
          </div>
          <div className="flex justify-between">
            <span>Rate Profile</span>
            <span className="text-gray-700">{txn.instanceName}</span>
          </div>
          {txn.hours !== null && (
            <div className="flex justify-between">
              <span>Hours</span>
              <span className="text-gray-700">{txn.hours.toFixed(2)}</span>
            </div>
          )}
          {txn.rate !== null && (
            <div className="flex justify-between">
              <span>Rate</span>
              <span className="text-gray-700">${txn.rate.toFixed(2)}/hr</span>
            </div>
          )}
          {txn.notes && (
            <div className="flex justify-between">
              <span>Notes</span>
              <span className="text-gray-700 text-right max-w-[60%]">
                {txn.notes}
              </span>
            </div>
          )}
        </div>
      )}
    </button>
  )
}
