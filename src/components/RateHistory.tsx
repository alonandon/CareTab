import { Clock, DollarSign } from 'lucide-react'
import type { RateConfig } from '../types'
import { resolveRate } from '../lib/pay'

interface Props {
  rates: RateConfig[]
}

export function RateHistory({ rates }: Props) {
  if (rates.length === 0) {
    return <p className="text-sm text-gray-400">No rates configured.</p>
  }

  const today = new Date().toISOString().slice(0, 10)
  const currentRate = resolveRate(rates, today)

  const sorted = [...rates].sort((a, b) =>
    b.effective_date.localeCompare(a.effective_date)
  )

  return (
    <div className="space-y-2.5">
      {sorted.map((rate) => {
        const isCurrent = currentRate?.id === rate.id
        const isFuture = rate.effective_date > today

        return (
          <div
            key={rate.id}
            className={`rounded-lg p-3 ${
              isCurrent
                ? 'bg-blue-50 border border-blue-200'
                : isFuture
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-gray-50 border border-gray-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {rate.rate_type === 'hourly' ? (
                  <Clock
                    size={14}
                    className={isCurrent ? 'text-blue-500' : 'text-gray-400'}
                  />
                ) : (
                  <DollarSign
                    size={14}
                    className={isCurrent ? 'text-blue-500' : 'text-gray-400'}
                  />
                )}
                <span className="text-sm font-semibold text-gray-900">
                  ${rate.rate_amount.toFixed(2)}/
                  {rate.rate_type === 'hourly' ? 'hr' : 'wk'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isCurrent && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Current
                  </span>
                )}
                {isFuture && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Upcoming
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {rate.effective_date}
                </span>
              </div>
            </div>

            {rate.overtime_enabled && (
              <p className="mt-1.5 text-xs text-gray-600">
                OT: {rate.overtime_multiplier}x after{' '}
                {rate.overtime_trigger_hours}h/
                {rate.overtime_trigger_type}
              </p>
            )}

            {isCurrent && rate.rate_type === 'hourly' && rate.overtime_enabled && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-white p-2">
                  <p className="text-gray-400">Regular rate</p>
                  <p className="font-semibold text-gray-900">
                    ${rate.rate_amount.toFixed(2)}/hr
                  </p>
                </div>
                <div className="rounded-md bg-white p-2">
                  <p className="text-gray-400">OT rate</p>
                  <p className="font-semibold text-gray-900">
                    $
                    {(
                      rate.rate_amount * (rate.overtime_multiplier ?? 1)
                    ).toFixed(2)}
                    /hr
                  </p>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
