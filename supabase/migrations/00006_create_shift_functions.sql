-- ============================================================================
-- SHIFT HELPER FUNCTIONS
-- ============================================================================
-- Functions to support shift generation and confirmation workflow.

-- ============================================================================
-- FUNCTION: generate_shifts_from_recurring
-- ============================================================================
-- Generates individual shift instances from a recurring shift pattern
-- for dates within the specified range that are not blackout dates.
--
-- Parameters:
--   p_recurring_shift_id: UUID of the recurring_shifts record
--   p_from_date: Start date for generation (inclusive)
--   p_to_date: End date for generation (inclusive)
--
-- Returns: Number of shifts created

create or replace function public.generate_shifts_from_recurring(
  p_recurring_shift_id uuid,
  p_from_date date,
  p_to_date date
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recurring_shift public.recurring_shifts;
  v_current_date date;
  v_nanny_instance_id uuid;
  v_day_of_week int;
  v_count int := 0;
  v_is_blackout boolean;
begin
  -- Fetch the recurring shift
  select * into v_recurring_shift
  from public.recurring_shifts
  where id = p_recurring_shift_id;

  if not found then
    raise exception 'Recurring shift not found';
  end if;

  if not v_recurring_shift.is_active then
    return 0;
  end if;

  v_nanny_instance_id := v_recurring_shift.nanny_instance_id;
  v_current_date := greatest(p_from_date, v_recurring_shift.start_date);

  -- Adjust end date for recurring shift's end_date constraint
  if v_recurring_shift.end_date is not null then
    p_to_date := least(p_to_date, v_recurring_shift.end_date);
  end if;

  -- Generate shifts based on recurrence type
  case v_recurring_shift.recurrence_type
    when 'daily' then
      while v_current_date <= p_to_date loop
        -- Check if this date is a blackout date
        select exists(
          select 1 from public.blackout_dates
          where nanny_instance_id = v_nanny_instance_id
            and date = v_current_date
        ) into v_is_blackout;

        if not v_is_blackout then
          -- Check if shift already exists
          if not exists(
            select 1 from public.shifts
            where nanny_instance_id = v_nanny_instance_id
              and date = v_current_date
          ) then
            insert into public.shifts (
              nanny_instance_id, date, start_time, end_time,
              notes, rate_override, created_by
            ) values (
              v_nanny_instance_id, v_current_date,
              v_recurring_shift.start_time, v_recurring_shift.end_time,
              v_recurring_shift.notes, v_recurring_shift.rate_override,
              v_recurring_shift.created_by
            );
            v_count := v_count + 1;
          end if;
        end if;

        v_current_date := v_current_date + interval '1 day';
      end loop;

    when 'weekly' then
      while v_current_date <= p_to_date loop
        v_day_of_week := extract(dow from v_current_date)::int;

        -- Check if this is the correct day of week
        if v_day_of_week = v_recurring_shift.day_of_week then
          -- Check if this date is a blackout date
          select exists(
            select 1 from public.blackout_dates
            where nanny_instance_id = v_nanny_instance_id
              and date = v_current_date
          ) into v_is_blackout;

          if not v_is_blackout then
            -- Check if shift already exists
            if not exists(
              select 1 from public.shifts
              where nanny_instance_id = v_nanny_instance_id
                and date = v_current_date
            ) then
              insert into public.shifts (
                nanny_instance_id, date, start_time, end_time,
                notes, rate_override, created_by
              ) values (
                v_nanny_instance_id, v_current_date,
                v_recurring_shift.start_time, v_recurring_shift.end_time,
                v_recurring_shift.notes, v_recurring_shift.rate_override,
                v_recurring_shift.created_by
              );
              v_count := v_count + 1;
            end if;
          end if;
        end if;

        v_current_date := v_current_date + interval '1 day';
      end loop;

    when 'biweekly' then
      while v_current_date <= p_to_date loop
        v_day_of_week := extract(dow from v_current_date)::int;

        -- Check if this is the correct day of week AND the correct week
        if v_day_of_week = v_recurring_shift.day_of_week then
          -- Calculate weeks difference from start_date
          if ((v_current_date - v_recurring_shift.start_date)::int / 7) % 2 = 0 then
            -- Check if this date is a blackout date
            select exists(
              select 1 from public.blackout_dates
              where nanny_instance_id = v_nanny_instance_id
                and date = v_current_date
            ) into v_is_blackout;

            if not v_is_blackout then
              -- Check if shift already exists
              if not exists(
                select 1 from public.shifts
                where nanny_instance_id = v_nanny_instance_id
                  and date = v_current_date
              ) then
                insert into public.shifts (
                  nanny_instance_id, date, start_time, end_time,
                  notes, rate_override, created_by
                ) values (
                  v_nanny_instance_id, v_current_date,
                  v_recurring_shift.start_time, v_recurring_shift.end_time,
                  v_recurring_shift.notes, v_recurring_shift.rate_override,
                  v_recurring_shift.created_by
                );
                v_count := v_count + 1;
              end if;
            end if;
          end if;
        end if;

        v_current_date := v_current_date + interval '1 day';
      end loop;
  end case;

  return v_count;
end;
$$;

-- ============================================================================
-- FUNCTION: is_blackout_date
-- ============================================================================
-- Checks if a given date is a blackout date for a nanny instance.
--
-- Parameters:
--   p_nanny_instance_id: UUID of the nanny instance
--   p_date: Date to check
--
-- Returns: boolean

create or replace function public.is_blackout_date(
  p_nanny_instance_id uuid,
  p_date date
)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists(
    select 1 from public.blackout_dates
    where nanny_instance_id = p_nanny_instance_id
      and date = p_date
  );
$$;

-- ============================================================================
-- FUNCTION: get_shift_status
-- ============================================================================
-- Determines the confirmation status of a shift.
-- Returns: 'scheduled' (future), 'unconfirmed' (past, no time entry),
--          'confirmed' (time entry exists)
--
-- Parameters:
--   p_shift_id: UUID of the shift
--
-- Returns: text

create or replace function public.get_shift_status(p_shift_id uuid)
returns text
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_shift_date date;
  v_time_entry_exists boolean;
begin
  -- Get shift date
  select date into v_shift_date
  from public.shifts
  where id = p_shift_id;

  if not found then
    raise exception 'Shift not found';
  end if;

  -- Check if shift is in the future
  if v_shift_date > current_date then
    return 'scheduled';
  end if;

  -- Check if a time entry exists for this shift
  select exists(
    select 1 from public.time_entries
    where shift_id = p_shift_id
  ) into v_time_entry_exists;

  if v_time_entry_exists then
    return 'confirmed';
  else
    return 'unconfirmed';
  end if;
end;
$$;

-- ============================================================================
-- FUNCTION: create_time_entry_from_shift
-- ============================================================================
-- Creates a draft time entry from a confirmed shift.
-- This is called when a nanny confirms they worked a past shift.
--
-- Parameters:
--   p_shift_id: UUID of the shift to confirm
--   p_nanny_id: UUID of the nanny (should match shift's nanny instance)
--
-- Returns: UUID of created time entry

create or replace function public.create_time_entry_from_shift(
  p_shift_id uuid,
  p_nanny_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shift public.shifts;
  v_time_entry_id uuid;
  v_nanny_instance_id uuid;
begin
  -- Fetch the shift
  select * into v_shift
  from public.shifts
  where id = p_shift_id;

  if not found then
    raise exception 'Shift not found';
  end if;

  -- Get nanny instance ID from the shift
  v_nanny_instance_id := v_shift.nanny_instance_id;

  -- Verify the shift is in the past
  if v_shift.date > current_date then
    raise exception 'Cannot confirm future shifts';
  end if;

  -- Check if time entry already exists
  if exists(
    select 1 from public.time_entries
    where shift_id = p_shift_id
  ) then
    raise exception 'Time entry already exists for this shift';
  end if;

  -- Create the time entry as draft
  insert into public.time_entries (
    nanny_instance_id, entered_by, date, shift_id, status, notes
  ) values (
    v_nanny_instance_id, p_nanny_id, v_shift.date, p_shift_id, 'draft',
    'Auto-created from shift: ' || coalesce(v_shift.notes, '')
  ) returning id into v_time_entry_id;

  -- Create initial time entry period from shift times
  insert into public.time_entry_periods (
    time_entry_id, start_time, end_time
  ) values (
    v_time_entry_id, v_shift.start_time, v_shift.end_time
  );

  return v_time_entry_id;
end;
$$;
