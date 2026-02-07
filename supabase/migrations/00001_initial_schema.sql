-- Keeper Database Schema
-- Run this in the Supabase SQL Editor to set up the full schema.
-- Requires: Supabase project with Auth enabled.

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- HELPER: updated_at trigger function
-- ============================================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- TABLE: profiles
-- ============================================================================

create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text not null,
  full_name   text not null default '',
  role        text check (role in ('parent', 'nanny')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- TABLE: households
-- ============================================================================

create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid not null references public.profiles on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger households_updated_at
  before update on public.households
  for each row execute function public.handle_updated_at();

-- ============================================================================
-- TABLE: household_members
-- ============================================================================

create table public.household_members (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households on delete cascade,
  profile_id    uuid not null references public.profiles on delete cascade,
  role          text not null check (role in ('parent', 'nanny')),
  joined_at     timestamptz not null default now(),
  unique (household_id, profile_id)
);

-- ============================================================================
-- TABLE: children
-- ============================================================================

create table public.children (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households on delete cascade,
  name          text not null,
  created_at    timestamptz not null default now()
);

-- ============================================================================
-- TABLE: invitations
-- ============================================================================

create table public.invitations (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households on delete cascade,
  invited_by    uuid not null references public.profiles on delete cascade,
  email         text not null,
  token         text unique not null default encode(gen_random_bytes(32), 'hex'),
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '7 days')
);

-- ============================================================================
-- TABLE: nanny_instances
-- ============================================================================

create table public.nanny_instances (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households on delete cascade,
  nanny_id      uuid not null references public.profiles on delete cascade,
  name          text not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ============================================================================
-- TABLE: rate_configs
-- ============================================================================

create table public.rate_configs (
  id                      uuid primary key default gen_random_uuid(),
  nanny_instance_id       uuid not null references public.nanny_instances on delete cascade,
  rate_type               text not null check (rate_type in ('hourly', 'weekly')),
  rate_amount             decimal(10,2) not null,
  overtime_enabled        boolean not null default false,
  overtime_multiplier     decimal(3,2),
  overtime_trigger_type   text check (overtime_trigger_type in ('daily', 'weekly')),
  overtime_trigger_hours  decimal(5,2),
  effective_date          date not null,
  created_at              timestamptz not null default now()
);

-- ============================================================================
-- TABLE: time_entries
-- ============================================================================

create table public.time_entries (
  id                  uuid primary key default gen_random_uuid(),
  nanny_instance_id   uuid not null references public.nanny_instances on delete cascade,
  entered_by          uuid not null references public.profiles on delete cascade,
  date                date not null,
  status              text not null default 'draft'
                        check (status in ('draft', 'pending', 'approved', 'rejected')),
  notes               text,
  rejection_comment   text,
  approved_by         uuid references public.profiles,
  approved_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger time_entries_updated_at
  before update on public.time_entries
  for each row execute function public.handle_updated_at();

-- ============================================================================
-- TABLE: time_entry_periods
-- ============================================================================

create table public.time_entry_periods (
  id              uuid primary key default gen_random_uuid(),
  time_entry_id   uuid not null references public.time_entries on delete cascade,
  start_time      time not null,
  end_time        time not null
);

-- ============================================================================
-- TABLE: expenses
-- ============================================================================

create table public.expenses (
  id                  uuid primary key default gen_random_uuid(),
  nanny_instance_id   uuid not null references public.nanny_instances on delete cascade,
  entered_by          uuid not null references public.profiles on delete cascade,
  date                date not null,
  amount              decimal(10,2) not null,
  description         text not null,
  status              text not null default 'draft'
                        check (status in ('draft', 'pending', 'approved', 'rejected')),
  rejection_comment   text,
  approved_by         uuid references public.profiles,
  approved_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger expenses_updated_at
  before update on public.expenses
  for each row execute function public.handle_updated_at();

-- ============================================================================
-- TABLE: payments
-- ============================================================================

create table public.payments (
  id                  uuid primary key default gen_random_uuid(),
  nanny_instance_id   uuid not null references public.nanny_instances on delete cascade,
  logged_by           uuid not null references public.profiles on delete cascade,
  amount              decimal(10,2) not null,
  date                date not null,
  method              text check (method in ('cash', 'check', 'venmo', 'zelle', 'bank_transfer', 'other')),
  status              text not null default 'logged'
                        check (status in ('logged', 'accepted', 'rejected')),
  rejection_comment   text,
  created_at          timestamptz not null default now()
);

-- ============================================================================
-- TABLE: comment_history
-- ============================================================================

create table public.comment_history (
  id            uuid primary key default gen_random_uuid(),
  entity_type   text not null check (entity_type in ('time_entry', 'expense', 'payment')),
  entity_id     uuid not null,
  author_id     uuid not null references public.profiles on delete cascade,
  comment       text not null,
  created_at    timestamptz not null default now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index idx_time_entries_instance_date on public.time_entries (nanny_instance_id, date);
create index idx_expenses_instance_date on public.expenses (nanny_instance_id, date);
create index idx_payments_instance_date on public.payments (nanny_instance_id, date);
create index idx_invitations_token on public.invitations (token);
create index idx_invitations_email on public.invitations (email);
create index idx_household_members_profile on public.household_members (profile_id);
create index idx_nanny_instances_household on public.nanny_instances (household_id);
create index idx_comment_history_entity on public.comment_history (entity_type, entity_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Helper: returns all household IDs the current user belongs to
create or replace function public.user_household_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select household_id
  from public.household_members
  where profile_id = auth.uid();
$$;

-- Helper: returns the role for the current user in a given household
create or replace function public.user_role_in_household(p_household_id uuid)
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select role
  from public.household_members
  where profile_id = auth.uid()
    and household_id = p_household_id
  limit 1;
$$;

-- --------------------------------------------------------------------------
-- profiles
-- --------------------------------------------------------------------------

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can view profiles in their households"
  on public.profiles for select
  using (
    id in (
      select hm.profile_id
      from public.household_members hm
      where hm.household_id in (select public.user_household_ids())
    )
  );

create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- --------------------------------------------------------------------------
-- households
-- --------------------------------------------------------------------------

alter table public.households enable row level security;

create policy "Members can view their households"
  on public.households for select
  using (id in (select public.user_household_ids()));

create policy "Authenticated users can create households"
  on public.households for insert
  with check (auth.uid() is not null);

create policy "Parents can update their households"
  on public.households for update
  using (
    id in (select public.user_household_ids())
    and public.user_role_in_household(id) = 'parent'
  );

-- --------------------------------------------------------------------------
-- household_members
-- --------------------------------------------------------------------------

alter table public.household_members enable row level security;

create policy "Members can view their household members"
  on public.household_members for select
  using (household_id in (select public.user_household_ids()));

create policy "Parents can add household members"
  on public.household_members for insert
  with check (
    public.user_role_in_household(household_id) = 'parent'
    or (
      -- Allow self-insert when joining via invitation (no members yet for this user)
      profile_id = auth.uid()
    )
  );

create policy "Parents can remove household members"
  on public.household_members for delete
  using (
    public.user_role_in_household(household_id) = 'parent'
  );

-- --------------------------------------------------------------------------
-- children
-- --------------------------------------------------------------------------

alter table public.children enable row level security;

create policy "Members can view children in their households"
  on public.children for select
  using (household_id in (select public.user_household_ids()));

create policy "Parents can manage children"
  on public.children for insert
  with check (public.user_role_in_household(household_id) = 'parent');

create policy "Parents can update children"
  on public.children for update
  using (public.user_role_in_household(household_id) = 'parent');

create policy "Parents can delete children"
  on public.children for delete
  using (public.user_role_in_household(household_id) = 'parent');

-- --------------------------------------------------------------------------
-- invitations
-- --------------------------------------------------------------------------

alter table public.invitations enable row level security;

create policy "Members can view invitations for their households"
  on public.invitations for select
  using (household_id in (select public.user_household_ids()));

create policy "Parents can create invitations"
  on public.invitations for insert
  with check (public.user_role_in_household(household_id) = 'parent');

create policy "Invitees can view their own invitation by email"
  on public.invitations for select
  using (
    email = (select email from public.profiles where id = auth.uid())
  );

create policy "Invitees can accept their own invitation"
  on public.invitations for update
  using (
    email = (select email from public.profiles where id = auth.uid())
  )
  with check (status = 'accepted');

-- --------------------------------------------------------------------------
-- nanny_instances
-- --------------------------------------------------------------------------

alter table public.nanny_instances enable row level security;

create policy "Members can view nanny instances in their households"
  on public.nanny_instances for select
  using (household_id in (select public.user_household_ids()));

create policy "Parents can create nanny instances"
  on public.nanny_instances for insert
  with check (public.user_role_in_household(household_id) = 'parent');

create policy "Parents can update nanny instances"
  on public.nanny_instances for update
  using (public.user_role_in_household(household_id) = 'parent');

-- --------------------------------------------------------------------------
-- rate_configs
-- --------------------------------------------------------------------------

alter table public.rate_configs enable row level security;

create policy "Members can view rate configs for their nanny instances"
  on public.rate_configs for select
  using (
    nanny_instance_id in (
      select ni.id from public.nanny_instances ni
      where ni.household_id in (select public.user_household_ids())
    )
  );

create policy "Parents can create rate configs"
  on public.rate_configs for insert
  with check (
    nanny_instance_id in (
      select ni.id from public.nanny_instances ni
      where public.user_role_in_household(ni.household_id) = 'parent'
    )
  );

create policy "Parents can update rate configs"
  on public.rate_configs for update
  using (
    nanny_instance_id in (
      select ni.id from public.nanny_instances ni
      where public.user_role_in_household(ni.household_id) = 'parent'
    )
  );

-- --------------------------------------------------------------------------
-- time_entries
-- --------------------------------------------------------------------------

alter table public.time_entries enable row level security;

create policy "Members can view time entries for their nanny instances"
  on public.time_entries for select
  using (
    nanny_instance_id in (
      select ni.id from public.nanny_instances ni
      where ni.household_id in (select public.user_household_ids())
    )
  );

create policy "Nannies can create their own time entries"
  on public.time_entries for insert
  with check (
    entered_by = auth.uid()
    and nanny_instance_id in (
      select ni.id from public.nanny_instances ni
      where ni.household_id in (select public.user_household_ids())
    )
  );

create policy "Entry owners can update draft entries"
  on public.time_entries for update
  using (
    entered_by = auth.uid()
    and status in ('draft', 'rejected')
  );

create policy "Parents can approve or reject time entries"
  on public.time_entries for update
  using (
    nanny_instance_id in (
      select ni.id from public.nanny_instances ni
      where public.user_role_in_household(ni.household_id) = 'parent'
    )
    and status = 'pending'
  );

create policy "Entry owners can delete draft entries"
  on public.time_entries for delete
  using (entered_by = auth.uid() and status = 'draft');

-- --------------------------------------------------------------------------
-- time_entry_periods
-- --------------------------------------------------------------------------

alter table public.time_entry_periods enable row level security;

create policy "Members can view periods for visible time entries"
  on public.time_entry_periods for select
  using (
    time_entry_id in (
      select te.id from public.time_entries te
      join public.nanny_instances ni on ni.id = te.nanny_instance_id
      where ni.household_id in (select public.user_household_ids())
    )
  );

create policy "Entry owners can manage periods on draft entries"
  on public.time_entry_periods for insert
  with check (
    time_entry_id in (
      select te.id from public.time_entries te
      where te.entered_by = auth.uid()
        and te.status in ('draft', 'rejected')
    )
  );

create policy "Entry owners can update periods on draft entries"
  on public.time_entry_periods for update
  using (
    time_entry_id in (
      select te.id from public.time_entries te
      where te.entered_by = auth.uid()
        and te.status in ('draft', 'rejected')
    )
  );

create policy "Entry owners can delete periods on draft entries"
  on public.time_entry_periods for delete
  using (
    time_entry_id in (
      select te.id from public.time_entries te
      where te.entered_by = auth.uid()
        and te.status in ('draft', 'rejected')
    )
  );

-- --------------------------------------------------------------------------
-- expenses
-- --------------------------------------------------------------------------

alter table public.expenses enable row level security;

create policy "Members can view expenses for their nanny instances"
  on public.expenses for select
  using (
    nanny_instance_id in (
      select ni.id from public.nanny_instances ni
      where ni.household_id in (select public.user_household_ids())
    )
  );

create policy "Nannies can create their own expenses"
  on public.expenses for insert
  with check (
    entered_by = auth.uid()
    and nanny_instance_id in (
      select ni.id from public.nanny_instances ni
      where ni.household_id in (select public.user_household_ids())
    )
  );

create policy "Expense owners can update draft expenses"
  on public.expenses for update
  using (
    entered_by = auth.uid()
    and status in ('draft', 'rejected')
  );

create policy "Parents can approve or reject expenses"
  on public.expenses for update
  using (
    nanny_instance_id in (
      select ni.id from public.nanny_instances ni
      where public.user_role_in_household(ni.household_id) = 'parent'
    )
    and status = 'pending'
  );

create policy "Expense owners can delete draft expenses"
  on public.expenses for delete
  using (entered_by = auth.uid() and status = 'draft');

-- --------------------------------------------------------------------------
-- payments
-- --------------------------------------------------------------------------

alter table public.payments enable row level security;

create policy "Members can view payments for their nanny instances"
  on public.payments for select
  using (
    nanny_instance_id in (
      select ni.id from public.nanny_instances ni
      where ni.household_id in (select public.user_household_ids())
    )
  );

create policy "Members can log payments"
  on public.payments for insert
  with check (
    logged_by = auth.uid()
    and nanny_instance_id in (
      select ni.id from public.nanny_instances ni
      where ni.household_id in (select public.user_household_ids())
    )
  );

create policy "Payment owners can update logged payments"
  on public.payments for update
  using (logged_by = auth.uid() and status = 'logged');

create policy "Counterparty can accept or reject payments"
  on public.payments for update
  using (
    nanny_instance_id in (
      select ni.id from public.nanny_instances ni
      where ni.household_id in (select public.user_household_ids())
    )
    and logged_by != auth.uid()
    and status = 'logged'
  );

-- --------------------------------------------------------------------------
-- comment_history
-- --------------------------------------------------------------------------

alter table public.comment_history enable row level security;

create policy "Members can view comments for entities in their households"
  on public.comment_history for select
  using (
    author_id in (
      select hm.profile_id
      from public.household_members hm
      where hm.household_id in (select public.user_household_ids())
    )
  );

create policy "Members can add comments"
  on public.comment_history for insert
  with check (author_id = auth.uid());
