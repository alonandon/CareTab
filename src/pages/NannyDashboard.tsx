import { useMemo } from 'react'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHouseholds, useNannyHouseholds } from '../hooks/useHousehold'
import { useMultiBalance } from '../hooks/useBalance'
import { BalanceInline } from '../components/BalanceCard'
import type { Balance } from '../hooks/useBalance'

export function NannyDashboard() {
  const { profile, signOut } = useAuth()
  const { households, loading } = useHouseholds()
  const { instances } = useNannyHouseholds()
  const navigate = useNavigate()

  const instanceIds = useMemo(() => instances.map((i) => i.id), [instances])
  const { balances, loading: balancesLoading } = useMultiBalance(instanceIds)

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hi, {profile?.full_name || 'there'}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">Nanny Dashboard</p>
        </div>
        <button
          onClick={signOut}
          className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Sign out"
        >
          <LogOut size={20} />
        </button>
      </div>

      {/* Connected Households */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          My Households
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : households.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-500">
              No households yet. Ask a parent to send you an invite link.
            </p>
          </div>
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
