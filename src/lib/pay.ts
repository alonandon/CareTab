import type { RateConfig, TimeEntryPeriod } from '../types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PayBreakdown {
  regularHours: number
  overtimeHours: number
  regularPay: number
  overtimePay: number
  totalPay: number
}

// ---------------------------------------------------------------------------
// Rate resolution: find the applicable rate for a given date
// ---------------------------------------------------------------------------

export function resolveRate(
  rates: RateConfig[],
  entryDate: string
): RateConfig | null {
  return (
    rates
      .filter((r) => r.effective_date <= entryDate)
      .sort((a, b) => b.effective_date.localeCompare(a.effective_date))[0] ??
    null
  )
}

// ---------------------------------------------------------------------------
// Time math helpers
// ---------------------------------------------------------------------------

/** Parse "HH:MM" or "HH:MM:SS" into fractional hours */
export function timeToHours(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h + (m ?? 0) / 60
}

/** Total hours from an array of periods (for a single day) */
export function totalHoursFromPeriods(periods: TimeEntryPeriod[]): number {
  return periods.reduce((sum, p) => {
    const start = timeToHours(p.start_time)
    const end = timeToHours(p.end_time)
    // Handle overnight: if end < start, assume it wraps past midnight
    const hours = end >= start ? end - start : 24 - start + end
    return sum + hours
  }, 0)
}

// ---------------------------------------------------------------------------
// Pay calculation — single day (daily overtime)
// ---------------------------------------------------------------------------

export function calculateDailyPay(
  hours: number,
  rate: RateConfig
): PayBreakdown {
  if (rate.rate_type === 'weekly') {
    return {
      regularHours: hours,
      overtimeHours: 0,
      regularPay: rate.rate_amount,
      overtimePay: 0,
      totalPay: rate.rate_amount,
    }
  }

  if (
    !rate.overtime_enabled ||
    rate.overtime_trigger_type !== 'daily' ||
    !rate.overtime_trigger_hours ||
    !rate.overtime_multiplier
  ) {
    const pay = round(hours * rate.rate_amount)
    return {
      regularHours: round(hours),
      overtimeHours: 0,
      regularPay: pay,
      overtimePay: 0,
      totalPay: pay,
    }
  }

  const threshold = rate.overtime_trigger_hours
  const regularHours = Math.min(hours, threshold)
  const overtimeHours = Math.max(0, hours - threshold)
  const regularPay = round(regularHours * rate.rate_amount)
  const overtimePay = round(
    overtimeHours * rate.rate_amount * rate.overtime_multiplier
  )

  return {
    regularHours: round(regularHours),
    overtimeHours: round(overtimeHours),
    regularPay,
    overtimePay,
    totalPay: round(regularPay + overtimePay),
  }
}

// ---------------------------------------------------------------------------
// Pay calculation — weekly (weekly overtime)
// ---------------------------------------------------------------------------

/**
 * Calculate pay for a set of daily hour totals in a week, using weekly
 * overtime rules. Each entry in `dailyHours` is one day's total.
 * Returns aggregate pay for the entire week.
 */
export function calculateWeeklyPay(
  dailyHours: number[],
  rate: RateConfig
): PayBreakdown {
  if (rate.rate_type === 'weekly') {
    const totalHours = dailyHours.reduce((a, b) => a + b, 0)
    return {
      regularHours: round(totalHours),
      overtimeHours: 0,
      regularPay: rate.rate_amount,
      overtimePay: 0,
      totalPay: rate.rate_amount,
    }
  }

  const totalHours = dailyHours.reduce((a, b) => a + b, 0)

  if (
    !rate.overtime_enabled ||
    rate.overtime_trigger_type !== 'weekly' ||
    !rate.overtime_trigger_hours ||
    !rate.overtime_multiplier
  ) {
    const pay = round(totalHours * rate.rate_amount)
    return {
      regularHours: round(totalHours),
      overtimeHours: 0,
      regularPay: pay,
      overtimePay: 0,
      totalPay: pay,
    }
  }

  const threshold = rate.overtime_trigger_hours
  const regularHours = Math.min(totalHours, threshold)
  const overtimeHours = Math.max(0, totalHours - threshold)
  const regularPay = round(regularHours * rate.rate_amount)
  const overtimePay = round(
    overtimeHours * rate.rate_amount * rate.overtime_multiplier
  )

  return {
    regularHours: round(regularHours),
    overtimeHours: round(overtimeHours),
    regularPay,
    overtimePay,
    totalPay: round(regularPay + overtimePay),
  }
}

// ---------------------------------------------------------------------------
// Convenience: calculate pay for a single time entry with its periods
// ---------------------------------------------------------------------------

export function calculatePay(
  periods: TimeEntryPeriod[],
  rate: RateConfig
): PayBreakdown {
  const hours = totalHoursFromPeriods(periods)
  return calculateDailyPay(hours, rate)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round(n: number): number {
  return Math.round(n * 100) / 100
}
