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
  if (rates.length === 0) return null

  // Normalize dates to YYYY-MM-DD (in case full timestamps come through)
  const normalizedDate = entryDate.slice(0, 10)

  const matching = rates
    .filter((r) => r.effective_date.slice(0, 10) <= normalizedDate)
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date))

  if (matching.length > 0) return matching[0]

  // Fallback: if no rate has effective_date <= entryDate, use the earliest
  // available rate. This handles the edge case where a rate was created with
  // an effective_date in the future relative to the entry.
  const sorted = [...rates].sort((a, b) =>
    a.effective_date.localeCompare(b.effective_date)
  )
  return sorted[0]
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
  // Ensure rate_amount is a number (PostgREST may return decimal as string)
  const rateAmount = Number(rate.rate_amount)

  if (rate.rate_type === 'weekly') {
    return {
      regularHours: hours,
      overtimeHours: 0,
      regularPay: rateAmount,
      overtimePay: 0,
      totalPay: rateAmount,
    }
  }

  if (
    !rate.overtime_enabled ||
    rate.overtime_trigger_type !== 'daily' ||
    !rate.overtime_trigger_hours ||
    !rate.overtime_multiplier
  ) {
    const pay = round(hours * rateAmount)
    return {
      regularHours: round(hours),
      overtimeHours: 0,
      regularPay: pay,
      overtimePay: 0,
      totalPay: pay,
    }
  }

  const threshold = Number(rate.overtime_trigger_hours)
  const multiplier = Number(rate.overtime_multiplier)
  const regularHours = Math.min(hours, threshold)
  const overtimeHours = Math.max(0, hours - threshold)
  const regularPay = round(regularHours * rateAmount)
  const overtimePay = round(overtimeHours * rateAmount * multiplier)

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
  const rateAmount = Number(rate.rate_amount)

  if (rate.rate_type === 'weekly') {
    const totalHours = dailyHours.reduce((a, b) => a + b, 0)
    return {
      regularHours: round(totalHours),
      overtimeHours: 0,
      regularPay: rateAmount,
      overtimePay: 0,
      totalPay: rateAmount,
    }
  }

  const totalHours = dailyHours.reduce((a, b) => a + b, 0)

  if (
    !rate.overtime_enabled ||
    rate.overtime_trigger_type !== 'weekly' ||
    !rate.overtime_trigger_hours ||
    !rate.overtime_multiplier
  ) {
    const pay = round(totalHours * rateAmount)
    return {
      regularHours: round(totalHours),
      overtimeHours: 0,
      regularPay: pay,
      overtimePay: 0,
      totalPay: pay,
    }
  }

  const threshold = Number(rate.overtime_trigger_hours)
  const multiplier = Number(rate.overtime_multiplier)
  const regularHours = Math.min(totalHours, threshold)
  const overtimeHours = Math.max(0, totalHours - threshold)
  const regularPay = round(regularHours * rateAmount)
  const overtimePay = round(overtimeHours * rateAmount * multiplier)

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
