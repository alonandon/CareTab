import { format } from 'date-fns'
import type { Transaction } from '../hooks/useTransactions'

// ---------------------------------------------------------------------------
// CSV generation and download
// ---------------------------------------------------------------------------

const HEADERS = [
  'Date',
  'Type',
  'Description',
  'Hours',
  'Rate',
  'Amount',
  'Status',
  'Household',
  'Rate Profile',
  'Notes',
]

function escapeField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function typeLabel(type: string): string {
  switch (type) {
    case 'time':
      return 'Time'
    case 'expense':
      return 'Expense'
    case 'payment':
      return 'Payment'
    default:
      return type
  }
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function transactionsToCsv(transactions: Transaction[]): string {
  const rows: string[] = []

  for (const t of transactions) {
    // For time entries with overtime breakdown, create separate rows
    if (
      t.type === 'time' &&
      t.regularHours != null &&
      t.regularHours > 0
    ) {
      // Regular hours row
      rows.push(
        [
          format(new Date(t.date + 'T00:00:00'), 'yyyy-MM-dd'),
          typeLabel(t.type),
          escapeField(t.description),
          t.regularHours.toFixed(2),
          t.regularRate != null ? t.regularRate.toFixed(2) : '',
          (t.regularHours * (t.regularRate ?? 0)).toFixed(2),
          statusLabel(t.status),
          escapeField(t.householdName),
          escapeField(t.instanceName),
          escapeField(t.notes ?? ''),
        ].join(',')
      )
      // Overtime hours row (if any)
      if (t.overtimeHours != null && t.overtimeHours > 0) {
        rows.push(
          [
            format(new Date(t.date + 'T00:00:00'), 'yyyy-MM-dd'),
            typeLabel(t.type),
            escapeField(t.description),
            t.overtimeHours.toFixed(2),
            t.overtimeRate != null ? t.overtimeRate.toFixed(2) : '',
            (t.overtimeHours * (t.overtimeRate ?? 0)).toFixed(2),
            statusLabel(t.status),
            escapeField(t.householdName),
            escapeField(t.instanceName),
            escapeField(t.notes ?? ''),
          ].join(',')
        )
      }
    } else {
      // For all other transactions, use the original format
      rows.push(
        [
          format(new Date(t.date + 'T00:00:00'), 'yyyy-MM-dd'),
          typeLabel(t.type),
          escapeField(t.description),
          t.hours !== null ? t.hours.toFixed(2) : '',
          t.rate !== null ? t.rate.toFixed(2) : '',
          t.amount.toFixed(2),
          statusLabel(t.status),
          escapeField(t.householdName),
          escapeField(t.instanceName),
          escapeField(t.notes ?? ''),
        ].join(',')
      )
    }
  }

  return [HEADERS.join(','), ...rows].join('\n')
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
