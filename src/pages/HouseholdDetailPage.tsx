import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus, Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useHouseholdDetail } from '../hooks/useHousehold'
import { useMultiBalance } from '../hooks/useBalance'
import { AddChildForm } from '../components/AddChildForm'
import { InviteNannyModal } from '../components/InviteNannyModal'
import { CreateNannyInstanceForm } from '../components/CreateNannyInstanceForm'
import { NannyInstanceCard } from '../components/NannyInstanceCard'

export function HouseholdDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const { household, loading, refresh } = useHouseholdDetail(id)
  const navigate = useNavigate()
  const [inviteOpen, setInviteOpen] = useState(false)

  const isParent = profile?.role === 'parent'

  const activeInstances = useMemo(
    () => (household?.nanny_instances ?? []).filter((ni) => ni.is_active),
    [household]
  )
  const activeInstanceIds = useMemo(
    () => activeInstances.map((ni) => ni.id),
    [activeInstances]
  )
  const { balances, loading: balancesLoading } = useMultiBalance(activeInstanceIds)

  // Group instances by nanny and calculate cumulative balances
  const instancesByNanny = useMemo(() => {
    const map: Record<string, { nanny: any; instances: any[]; balance: any }> = {}
    for (const inst of activeInstances) {
      const nannyId = inst.nanny_id
      const nannyKey = inst.profiles.id

      if (!map[nannyKey]) {
        map[nannyKey] = {
          nanny: inst.profiles,
          instances: [],
          balance: { approvedOwed: 0, pendingApproval: 0, totalOwed: 0 },
        }
      }

      map[nannyKey].instances.push(inst)

      const instBalance = balances[inst.id]
      if (instBalance) {
        map[nannyKey].balance.approvedOwed += instBalance.approvedOwed
        map[nannyKey].balance.pendingApproval += instBalance.pendingApproval
        map[nannyKey].balance.totalOwed += instBalance.totalOwed
      }
    }
    return Object.values(map)
  }, [activeInstances, balances])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (!household) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">Household not found.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 text-sm text-blue-500 hover:text-blue-600"
        >
          Back to dashboard
        </button>
      </div>
    )
  }

  const nannyMembers = household.household_members
    .filter((m) => m.role === 'nanny')
    .map((m) => m.profiles)

  const parentMembers = household.household_members
    .filter((m) => m.role === 'parent')
    .map((m) => m.profiles)

  const pendingInvites = household.invitations.filter(
    (inv) => inv.status === 'pending'
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft size={16} />
          Dashboard
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{household.name}</h1>
      </div>

      {/* Members */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Members</h2>

        <div className="space-y-2">
          {parentMembers.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{p.full_name || p.email}</span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                Parent
              </span>
            </div>
          ))}
          {nannyMembers.map((n) => (
            <div key={n.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{n.full_name || n.email}</span>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                Nanny
              </span>
            </div>
          ))}
        </div>

        {isParent && (
          <button
            onClick={() => setInviteOpen(true)}
            className="mt-3 flex items-center gap-1.5 text-sm font-medium text-blue-500 hover:text-blue-600"
          >
            <UserPlus size={16} />
            Invite a nanny
          </button>
        )}

        {isParent && pendingInvites.length > 0 && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-500 mb-2">Pending invitations</p>
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 mb-1.5"
              >
                <Mail size={12} />
                <span>{inv.email}</span>
                <span className="ml-auto text-amber-500">
                  Expires {new Date(inv.expires_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Children — parents only */}
      {isParent && (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <AddChildForm
            householdId={household.id}
            children={household.children}
            onChanged={refresh}
          />
        </section>
      )}

      {/* Children — nanny view */}
      {!isParent && household.children.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Children</h2>
          <div className="flex flex-wrap gap-1.5">
            {household.children.map((child) => (
              <span
                key={child.id}
                className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
              >
                {child.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Nanny Instances */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Rate Profiles
        </h2>

        <div className="space-y-4">
          {instancesByNanny.length > 0 ? (
            instancesByNanny.map((nannyGroup) => (
              <div key={nannyGroup.nanny.id} className="space-y-2">
                {/* Nanny header with cumulative balance */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      {nannyGroup.nanny.full_name || nannyGroup.nanny.email}
                    </h3>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-700">
                        ${nannyGroup.balance.totalOwed.toFixed(2)}
                      </div>
                      {nannyGroup.balance.pendingApproval > 0 && (
                        <div className="text-xs text-gray-500">
                          +${nannyGroup.balance.pendingApproval.toFixed(2)} pending
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rate profiles for this nanny */}
                <div className="space-y-2 ml-2">
                  {nannyGroup.instances.map((ni) => (
                    <NannyInstanceCard
                      key={ni.id}
                      instance={ni}
                      balance={balances[ni.id]}
                      balanceLoading={balancesLoading}
                      showNannyName={false}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : !isParent ? (
            <p className="text-center text-sm text-gray-400 py-4">
              No rate profiles yet. Ask the parent to set one up.
            </p>
          ) : null}
        </div>

        {isParent && nannyMembers.length > 0 && (
          <div className="mt-4">
            <CreateNannyInstanceForm
              householdId={household.id}
              nannies={nannyMembers}
              onCreated={refresh}
            />
          </div>
        )}

        {isParent && nannyMembers.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-4">
            Invite a nanny first, then create rate profiles.
          </p>
        )}
      </section>

      {/* Invite Modal */}
      <InviteNannyModal
        householdId={household.id}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={refresh}
      />
    </div>
  )
}
