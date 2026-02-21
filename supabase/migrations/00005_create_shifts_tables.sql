-- ============================================================================
-- SHIFTS FEATURE MIGRATION
-- ============================================================================
-- Adds calendar/scheduling functionality for parents to schedule nanny shifts
-- in advance, with nannies confirming actual hours worked after the shift date.

-- ============================================================================
-- TABLE: shifts
-- ============================================================================
-- One-off or instance-based shifts scheduled by parents.
-- A shift is a scheduled time block with a nanny instance.

create table public.shifts (
  id                uuid primary key default gen_random_uuid(),
  nanny_instance_id uuid not null references public.nanny_instances on delete cascade,
  date              date not null,
  start_time        time not null,
  end_time          time not null,
  notes             text,
  rate_override     decimal(10,2),  -- Optional override of rate_config rate
  created_by        uuid not null references public.profiles on delete cascade,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger shifts_updated_at
  before update on public.shifts
  for each row execute function public.handle_updated_at();

create index idx_shifts_instance_date on public.shifts (nanny_instance_id, date);
create index idx_shifts_created_by on public.shifts (created_by);

-- ============================================================================
-- TABLE: recurring_shifts
-- ============================================================================
-- Recurring shift patterns (e.g., "every Tuesday 9am-5pm").
-- These define templates that generate individual shift instances.

create table public.recurring_shifts (
  id                  uuid primary key default gen_random_uuid(),
  nanny_instance_id   uuid not null references public.nanny_instances on delete cascade,
  recurrence_type     text not null check (recurrence_type in ('daily', 'weekly', 'biweekly')),
  day_of_week         int check (day_of_week >= 0 and day_of_week <= 6),  -- 0=Sunday, 6=Saturday
  start_time          time not null,
  end_time            time not null,
  notes               text,
  rate_override       decimal(10,2),
  start_date          date not null,
  end_date            date,  -- NULL = ongoing
  created_by          uuid not null references public.profiles on delete cascade,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  is_active           boolean not null default true
);

create trigger recurring_shifts_updated_at
  before update on public.recurring_shifts
  for each row execute function public.handle_updated_at();

create index idx_recurring_shifts_instance on public.recurring_shifts (nanny_instance_id);
create index idx_recurring_shifts_start_date on public.recurring_shifts (start_date);

-- ============================================================================
-- TABLE: blackout_dates
-- ============================================================================
-- Dates when childcare is not needed (vacation, holidays, etc).
-- Prevents shift generation on these dates from recurring patterns.

create table public.blackout_dates (
  id                uuid primary key default gen_random_uuid(),
  nanny_instance_id uuid not null references public.nanny_instances on delete cascade,
  date              date not null,
  reason            text,
  created_by        uuid not null references public.profiles on delete cascade,
  created_at        timestamptz not null default now()
);

create index idx_blackout_dates_instance_date on public.blackout_dates (nanny_instance_id, date);

-- ============================================================================
-- MODIFY: time_entries
-- ============================================================================
-- Add foreign key to link time entries to shifts.
-- This allows tracking which shifts have been confirmed as time entries.

alter table public.time_entries
  add column shift_id uuid references public.shifts on delete set null;

create index idx_time_entries_shift on public.time_entries (shift_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- --------------------------------------------------------------------------
-- shifts
-- --------------------------------------------------------------------------

alter table public.shifts enable row level security;

-- Parents can view shifts for their household's nanny instances
create policy "Members can view shifts for their nanny instances"
  on public.shifts for select
  using (
    nanny_instance_id in (
      select ni.id from public.nanny_instances ni
      where ni.household_id in (select public.user_household_ids())
    )
  );

-- Parents can create shifts for their household's nanny instances
create policy "Parents can create shifts"
  on public.shifts for insert
  with check (
    nanny_instance_id in (
      select ni.id from public.nanny_instances ni
      where public.user_role_in_household(ni.household_id) = 'parent'
    )
    and created_by = auth.uid()
  );

-- Parents can update future shifts
create policy "Parents can update future shifts"
  on public.shifts for update
  using (
    nanny_instance_id in (
      select ni.id from public.nanny_instances ni
      where public.user_role_in_household(ni.household_id) = 'parent'
    )
    and date > current_date
    and created_by = auth.uid()
  );

-- Parents can delete future shifts
create policy "Parents can delete future shifts"
  on public.shifts for delete
  using (
    nanny_instance_id in (
      select ni.id from public.nanny_instances ni
      where public.user_role_in_household(ni.household_id) = 'parent'
    )
    and date > current_date
  );

-- --------------------------------------------------------------------------
-- recurring_shifts
-- --------------------------------------------------------------------------

alter table public.recurring_shifts enable row level security;

-- Members can view recurring shifts for their nanny instances
create policy "Members can view recurring shifts"
  on public.recurring_shifts for select
  using (
    nanny_instance_id in (
      select ni.id from public.nanny_instances ni
      where ni.household_id in (select public.user_household_ids())
    )
  );

-- Parents can create recurring shifts
create policy "Parents can create recurring shifts"
  on public.recurring_shifts for insert
  with check (
    nanny_instance_id in (
      select ni.id from public.nanny_instances ni
      where public.user_role_in_household(ni.household_id) = 'parent'
    )
    and created_by = auth.uid()
  );

-- Parents can update recurring shifts
create policy "Parents can update recurring shifts"
  on public.recurring_shifts for update
  using (
    nanny_instance_id in (
      select ni.id from public.nanny_instances ni
      where public.user_role_in_household(ni.household_id) = 'parent'
    )
    and created_by = auth.uid()
  );

-- Parents can delete recurring shifts
create policy "Parents can delete recurring shifts"
  on public.recurring_shifts for delete
  using (
    nanny_instance_id in (
      select ni.id from public.nanny_instances ni
      where public.user_role_in_household(ni.household_id) = 'parent'
    )
  );

-- --------------------------------------------------------------------------
-- blackout_dates
-- --------------------------------------------------------------------------

alter table public.blackout_dates enable row level security;

-- Members can view blackout dates for their nanny instances
create policy "Members can view blackout dates"
  on public.blackout_dates for select
  using (
    nanny_instance_id in (
      select ni.id from public.nanny_instances ni
      where ni.household_id in (select public.user_household_ids())
    )
  );

-- Parents can create blackout dates
create policy "Parents can create blackout dates"
  on public.blackout_dates for insert
  with check (
    nanny_instance_id in (
      select ni.id from public.nanny_instances ni
      where public.user_role_in_household(ni.household_id) = 'parent'
    )
    and created_by = auth.uid()
  );

-- Parents can delete blackout dates
create policy "Parents can delete blackout dates"
  on public.blackout_dates for delete
  using (
    nanny_instance_id in (
      select ni.id from public.nanny_instances ni
      where public.user_role_in_household(ni.household_id) = 'parent'
    )
  );
