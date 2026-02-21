import { format, isAfter, isBefore, isSameDay, parse } from 'date-fns'
import type { Shift, RecurringShift } from '../types'

// ---------------------------------------------------------------------------
// Shift Status Helpers
// ---------------------------------------------------------------------------

/**
 * Determines if a shift is in the future (scheduled).
 */
export function isScheduledShift(shift: Shift): boolean {
  return isAfter(parse(shift.date, 'yyyy-MM-dd', new Date()), new Date())
}

/**
 * Determines if a shift is in the past and unconfirmed.
 */
export function isUnconfirmedShift(shift: Shift, hasTimeEntry: boolean): boolean {
  return isBefore(parse(shift.date, 'yyyy-MM-dd', new Date()), new Date()) && !hasTimeEntry
}

/**
 * Gets the status label for a shift.
 */
export function getShiftStatusLabel(
  shift: Shift,
  hasTimeEntry: boolean
): 'Scheduled' | 'Unconfirmed' | 'Confirmed' {
  if (isScheduledShift(shift)) {
    return 'Scheduled'
  }
  if (hasTimeEntry) {
    return 'Confirmed'
  }
  return 'Unconfirmed'
}

/**
 * Gets the status color for UI display.
 */
export function getShiftStatusColor(
  status: 'Scheduled' | 'Unconfirmed' | 'Confirmed'
): 'blue' | 'yellow' | 'green' {
  switch (status) {
    case 'Scheduled':
      return 'blue'
    case 'Unconfirmed':
      return 'yellow'
    case 'Confirmed':
      return 'green'
  }
}

// ---------------------------------------------------------------------------
// Time Calculation Helpers
// ---------------------------------------------------------------------------

/**
 * Calculates hours worked from a shift's time range.
 */
export function calculateShiftHours(startTime: string, endTime: string): number {
  try {
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)

    const startTotalMin = startHour * 60 + startMin
    const endTotalMin = endHour * 60 + endMin

    // Handle shifts that cross midnight (e.g., 10pm to 6am)
    if (endTotalMin < startTotalMin) {
      return (24 * 60 - startTotalMin + endTotalMin) / 60
    }

    return (endTotalMin - startTotalMin) / 60
  } catch {
    return 0
  }
}

/**
 * Formats a time string (HH:MM) for display.
 */
export function formatTime(timeStr: string): string {
  try {
    const [hour, minute] = timeStr.split(':')
    const h = parseInt(hour, 10)
    const m = parseInt(minute, 10)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${displayHour}:${String(m).padStart(2, '0')} ${ampm}`
  } catch {
    return timeStr
  }
}

/**
 * Formats a date string (YYYY-MM-DD) for display.
 */
export function formatShiftDate(dateStr: string): string {
  try {
    return format(parse(dateStr, 'yyyy-MM-dd', new Date()), 'EEE, MMM d')
  } catch {
    return dateStr
  }
}

/**
 * Gets a formatted shift time range (e.g., "9:00 AM - 5:00 PM").
 */
export function formatShiftTimeRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)} - ${formatTime(endTime)}`
}

// ---------------------------------------------------------------------------
// Validation Helpers
// ---------------------------------------------------------------------------

/**
 * Validates that end_time is after start_time.
 */
export function isValidTimeRange(startTime: string, endTime: string): boolean {
  try {
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)

    const startTotalMin = startHour * 60 + startMin
    const endTotalMin = endHour * 60 + endMin

    // Allow crosses midnight (endTime can be "less than" startTime)
    return startTotalMin !== endTotalMin
  } catch {
    return false
  }
}

/**
 * Validates that a date is valid (YYYY-MM-DD format).
 */
export function isValidDate(dateStr: string): boolean {
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date())
    return !isNaN(date.getTime())
  } catch {
    return false
  }
}

/**
 * Validates that a date is not in the past (for scheduling).
 */
export function isFutureDate(dateStr: string): boolean {
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date())
    return isAfter(date, new Date())
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Recurring Shift Helpers
// ---------------------------------------------------------------------------

/**
 * Gets the display label for a recurrence type.
 */
export function getRecurrenceLabel(recurringShift: RecurringShift): string {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  switch (recurringShift.recurrence_type) {
    case 'daily':
      return 'Every day'
    case 'weekly':
      return `Every ${dayNames[recurringShift.day_of_week ?? 0]}`
    case 'biweekly':
      return `Every other ${dayNames[recurringShift.day_of_week ?? 0]}`
    default:
      return 'Unknown'
  }
}

/**
 * Gets the day of week number from a date string (0 = Sunday, 6 = Saturday).
 */
export function getDayOfWeekFromDate(dateStr: string): number {
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date())
    return date.getDay()
  } catch {
    return -1
  }
}

/**
 * Formats recurring shift details for display.
 */
export function formatRecurringShiftDetails(
  recurringShift: RecurringShift
): {
  recurrence: string
  timeRange: string
  dateRange: string
  status: string
} {
  const timeRange = formatShiftTimeRange(recurringShift.start_time, recurringShift.end_time)

  const startDate = formatShiftDate(recurringShift.start_date)
  const endDate = recurringShift.end_date ? formatShiftDate(recurringShift.end_date) : 'Ongoing'
  const dateRange = `${startDate} - ${endDate}`

  const status = recurringShift.is_active ? 'Active' : 'Inactive'

  return {
    recurrence: getRecurrenceLabel(recurringShift),
    timeRange,
    dateRange,
    status,
  }
}

// ---------------------------------------------------------------------------
// Calendar Helpers
// ---------------------------------------------------------------------------

/**
 * Groups shifts by date for calendar display.
 */
export function groupShiftsByDate(shifts: Shift[]): Map<string, Shift[]> {
  const grouped = new Map<string, Shift[]>()

  shifts.forEach((shift) => {
    if (!grouped.has(shift.date)) {
      grouped.set(shift.date, [])
    }
    grouped.get(shift.date)!.push(shift)
  })

  return grouped
}

/**
 * Gets all dates in a month.
 */
export function getMonthDates(year: number, month: number): Date[] {
  const dates: Date[] = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Add days from previous month to fill the first week
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  const currentDate = new Date(startDate)
  while (currentDate <= lastDay) {
    dates.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dates
}

/**
 * Gets all dates in a week starting from a given date.
 */
export function getWeekDates(date: Date): Date[] {
  const dates: Date[] = []
  const startDate = new Date(date)
  startDate.setDate(startDate.getDate() - startDate.getDay()) // Start on Sunday

  for (let i = 0; i < 7; i++) {
    dates.push(new Date(startDate))
    startDate.setDate(startDate.getDate() + 1)
  }

  return dates
}

// ---------------------------------------------------------------------------
// Date String Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a Date object to YYYY-MM-DD format string.
 */
export function dateToString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/**
 * Converts a YYYY-MM-DD string to a Date object.
 */
export function stringToDate(dateStr: string): Date {
  return parse(dateStr, 'yyyy-MM-dd', new Date())
}

/**
 * Gets today's date as a YYYY-MM-DD string.
 */
export function getTodayString(): string {
  return dateToString(new Date())
}

/**
 * Gets tomorrow's date as a YYYY-MM-DD string.
 */
export function getTomorrowString(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return dateToString(tomorrow)
}
