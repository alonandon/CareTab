interface RateConfigValues {
  rateType: 'hourly' | 'weekly'
  rateAmount: string
  overtimeEnabled: boolean
  overtimeMultiplier: string
  overtimeTriggerType: 'daily' | 'weekly'
  overtimeTriggerHours: string
  effectiveDate: string
}

interface Props {
  values: RateConfigValues
  onChange: (values: RateConfigValues) => void
  showEffectiveDate?: boolean
}

export type { RateConfigValues }

export function RateConfigFields({
  values,
  onChange,
  showEffectiveDate = false,
}: Props) {
  const update = (partial: Partial<RateConfigValues>) =>
    onChange({ ...values, ...partial })

  return (
    <div className="space-y-4">
      {/* Rate type toggle */}
      <div className="flex rounded-lg border border-gray-200 p-0.5">
        <button
          type="button"
          onClick={() => update({ rateType: 'hourly', overtimeEnabled: values.overtimeEnabled })}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            values.rateType === 'hourly'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Hourly Rate
        </button>
        <button
          type="button"
          onClick={() => update({ rateType: 'weekly', overtimeEnabled: false })}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            values.rateType === 'weekly'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Weekly Rate
        </button>
      </div>

      {/* Rate amount */}
      <div>
        <label htmlFor="rate-amount" className="block text-sm font-medium text-gray-700 mb-1">
          {values.rateType === 'hourly' ? 'Hourly rate' : 'Weekly rate'}
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input
            id="rate-amount"
            type="number"
            required
            min="0"
            step="0.01"
            value={values.rateAmount}
            onChange={(e) => update({ rateAmount: e.target.value })}
            className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder={values.rateType === 'hourly' ? '25.00' : '800.00'}
          />
        </div>
      </div>

      {/* Effective date */}
      {showEffectiveDate && (
        <div>
          <label htmlFor="effective-date" className="block text-sm font-medium text-gray-700 mb-1">
            Effective date
          </label>
          <input
            id="effective-date"
            type="date"
            required
            value={values.effectiveDate}
            onChange={(e) => update({ effectiveDate: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Overtime (hourly only) */}
      {values.rateType === 'hourly' && (
        <>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={values.overtimeEnabled}
              onChange={(e) => update({ overtimeEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Enable overtime</span>
          </label>

          {values.overtimeEnabled && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-3">
              {/* Multiplier */}
              <div>
                <label htmlFor="ot-multiplier" className="block text-xs font-medium text-gray-600 mb-1">
                  Overtime multiplier
                </label>
                <div className="relative">
                  <input
                    id="ot-multiplier"
                    type="number"
                    min="1"
                    step="0.01"
                    value={values.overtimeMultiplier}
                    onChange={(e) => update({ overtimeMultiplier: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    x base rate
                  </span>
                </div>
              </div>

              {/* Trigger type toggle */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Overtime threshold
                </label>
                <div className="flex rounded-lg border border-gray-200 p-0.5 mb-2">
                  <button
                    type="button"
                    onClick={() => update({ overtimeTriggerType: 'daily', overtimeTriggerHours: '8' })}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      values.overtimeTriggerType === 'daily'
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Per Day
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ overtimeTriggerType: 'weekly', overtimeTriggerHours: '40' })}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      values.overtimeTriggerType === 'weekly'
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Per Week
                  </button>
                </div>
              </div>

              {/* Trigger hours */}
              <div>
                <label htmlFor="ot-hours" className="block text-xs font-medium text-gray-600 mb-1">
                  Overtime after (hours)
                </label>
                <input
                  id="ot-hours"
                  type="number"
                  min="1"
                  step="0.5"
                  value={values.overtimeTriggerHours}
                  onChange={(e) => update({ overtimeTriggerHours: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-400">
                  {values.overtimeTriggerType === 'daily'
                    ? `Hours over ${values.overtimeTriggerHours || '0'}/day = overtime`
                    : `Hours over ${values.overtimeTriggerHours || '0'}/week = overtime`}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
