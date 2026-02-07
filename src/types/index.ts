export interface User {
  id: string
  email: string
  full_name: string
  role: 'parent' | 'caregiver'
  created_at: string
}

export interface TimeEntry {
  id: string
  caregiver_id: string
  parent_id: string
  start_time: string
  end_time: string | null
  hourly_rate: number
  notes: string | null
  created_at: string
}

export interface Expense {
  id: string
  caregiver_id: string
  parent_id: string
  amount: number
  category: string
  description: string
  date: string
  receipt_url: string | null
  created_at: string
}

export interface Payment {
  id: string
  from_id: string
  to_id: string
  amount: number
  method: string | null
  notes: string | null
  date: string
  created_at: string
}
