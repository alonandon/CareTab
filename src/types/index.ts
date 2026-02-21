export interface Profile {
  id: string
  email: string
  full_name: string
  role: 'parent' | 'nanny' | null
  created_at: string
  updated_at: string
}

export interface Household {
  id: string
  name: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface HouseholdMember {
  id: string
  household_id: string
  profile_id: string
  role: 'parent' | 'nanny'
  joined_at: string
}

export interface Child {
  id: string
  household_id: string
  name: string
  created_at: string
}

export interface Invitation {
  id: string
  household_id: string
  invited_by: string
  email: string
  token: string
  status: 'pending' | 'accepted' | 'expired'
  created_at: string
  expires_at: string
}

export interface NannyInstance {
  id: string
  household_id: string
  nanny_id: string
  name: string
  is_active: boolean
  created_at: string
}

export interface RateConfig {
  id: string
  nanny_instance_id: string
  rate_type: 'hourly' | 'weekly'
  rate_amount: number
  overtime_enabled: boolean
  overtime_multiplier: number | null
  overtime_trigger_type: 'daily' | 'weekly' | null
  overtime_trigger_hours: number | null
  effective_date: string
  created_at: string
}

export interface Shift {
  id: string
  nanny_instance_id: string
  date: string
  start_time: string
  end_time: string
  notes: string | null
  rate_override: number | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface RecurringShift {
  id: string
  nanny_instance_id: string
  recurrence_type: 'daily' | 'weekly' | 'biweekly'
  day_of_week: number | null
  start_time: string
  end_time: string
  notes: string | null
  rate_override: number | null
  start_date: string
  end_date: string | null
  created_by: string
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface BlackoutDate {
  id: string
  nanny_instance_id: string
  date: string
  reason: string | null
  created_by: string
  created_at: string
}

export interface TimeEntry {
  id: string
  nanny_instance_id: string
  entered_by: string
  date: string
  shift_id: string | null
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  notes: string | null
  rejection_comment: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface TimeEntryPeriod {
  id: string
  time_entry_id: string
  start_time: string
  end_time: string
}

export interface Expense {
  id: string
  nanny_instance_id: string
  entered_by: string
  date: string
  amount: number
  description: string
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  rejection_comment: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  nanny_instance_id: string
  logged_by: string
  amount: number
  date: string
  method: 'cash' | 'check' | 'venmo' | 'zelle' | 'bank_transfer' | 'other' | null
  status: 'logged' | 'accepted' | 'rejected'
  rejection_comment: string | null
  created_at: string
}

export interface CommentHistory {
  id: string
  entity_type: 'time_entry' | 'expense' | 'payment'
  entity_id: string
  author_id: string
  comment: string
  created_at: string
}
