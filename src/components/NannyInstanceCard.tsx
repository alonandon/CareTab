import { useNavigate } from 'react-router-dom'
import { Clock, ChevronRight, DollarSign } from 'lucide-react'
import type { NannyInstanceWithDetails } from '../hooks/useHousehold'

interface Props {
  instance: NannyInstanceWithDetails
  showNannyName?: boolean
}

export function NannyInstanceCard({ instance, showNannyName = true }: Props) {
  const navigate = useNavigate()

  const currentRate = instance.rate_configs
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date))
    .find((r) => r.effective_date <= new Date().toISOString().slice(0, 10))

  return (
    <button
      onClick={() => navigate(`/nanny-instance/${instance.id}`)}
      className="w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-left hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50">
            <Clock size={20} className="text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{instance.name}</h3>
            {showNannyName && (
              <p className="text-xs text-gray-500 mt-0.5">
                {instance.profiles.full_name || instance.profiles.email}
              </p>
            )}
          </div>
        </div>
        <ChevronRight size={20} className="text-gray-400 mt-1" />
      </div>

      {currentRate && (
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
          <DollarSign size={14} className="text-green-600" />
          <span className="text-sm font-medium text-gray-700">
            ${currentRate.rate_amount.toFixed(2)}/{currentRate.rate_type === 'hourly' ? 'hr' : 'wk'}
          </span>
          {currentRate.overtime_enabled && (
            <span className="text-xs text-gray-500">
              OT: {currentRate.overtime_multiplier}x after {currentRate.overtime_trigger_hours}h/{currentRate.overtime_trigger_type}
            </span>
          )}
        </div>
      )}
    </button>
  )
}
