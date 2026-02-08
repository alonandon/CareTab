import { useNavigate } from 'react-router-dom'
import { Home, Users, ChevronRight } from 'lucide-react'
import { BalanceInline } from './BalanceCard'
import type { HouseholdWithMembers } from '../hooks/useHousehold'
import type { Balance } from '../hooks/useBalance'

interface Props {
  household: HouseholdWithMembers
  balance?: Balance | null
  balanceLoading?: boolean
}

export function HouseholdCard({ household, balance, balanceLoading }: Props) {
  const navigate = useNavigate()
  const parents = household.household_members.filter((m) => m.role === 'parent')
  const nannies = household.household_members.filter((m) => m.role === 'nanny')

  return (
    <button
      onClick={() => navigate(`/household/${household.id}`)}
      className="w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-left hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
            <Home size={20} className="text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{household.name}</h3>
            <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
              <Users size={12} />
              <span>
                {parents.length} parent{parents.length !== 1 ? 's' : ''}
                {nannies.length > 0 &&
                  `, ${nannies.length} nann${nannies.length !== 1 ? 'ies' : 'y'}`}
              </span>
            </div>
          </div>
        </div>
        <ChevronRight size={20} className="text-gray-400 mt-1" />
      </div>

      {household.children.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {household.children.map((child) => (
            <span
              key={child.id}
              className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
            >
              {child.name}
            </span>
          ))}
        </div>
      )}

      {nannies.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="flex flex-wrap gap-2">
            {nannies.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700"
              >
                {m.profiles.full_name || m.profiles.email}
              </span>
            ))}
          </div>
        </div>
      )}

      {balance && (
        <BalanceInline balance={balance} loading={balanceLoading} />
      )}
    </button>
  )
}
