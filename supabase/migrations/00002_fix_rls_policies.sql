-- ============================================================================
-- FIX: Drop and re-create all RLS policies
-- Safe to run multiple times. Run this in the Supabase SQL Editor.
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop all existing policies (ignore errors if they don't exist)
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ============================================================================
-- STEP 2: Ensure RLS is enabled on all tables
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nanny_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entry_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Re-create helper functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_household_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT household_id
  FROM public.household_members
  WHERE profile_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.user_role_in_household(p_household_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role
  FROM public.household_members
  WHERE profile_id = auth.uid()
    AND household_id = p_household_id
  LIMIT 1;
$$;

-- ============================================================================
-- STEP 4: Create all policies
-- ============================================================================

-- --------------------------------------------------------------------------
-- profiles
-- --------------------------------------------------------------------------

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can view profiles in their households"
  ON public.profiles FOR SELECT
  USING (
    id IN (
      SELECT hm.profile_id
      FROM public.household_members hm
      WHERE hm.household_id IN (SELECT public.user_household_ids())
    )
  );

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- --------------------------------------------------------------------------
-- households
-- --------------------------------------------------------------------------

CREATE POLICY "Authenticated users can create households"
  ON public.households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow creators to read back the household they just created
CREATE POLICY "Creators can view their own households"
  ON public.households FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Members can view their households"
  ON public.households FOR SELECT
  USING (id IN (SELECT public.user_household_ids()));

CREATE POLICY "Parents can update their households"
  ON public.households FOR UPDATE
  USING (
    id IN (SELECT public.user_household_ids())
    AND public.user_role_in_household(id) = 'parent'
  );

-- --------------------------------------------------------------------------
-- household_members
-- --------------------------------------------------------------------------

CREATE POLICY "Members can view their household members"
  ON public.household_members FOR SELECT
  USING (household_id IN (SELECT public.user_household_ids()));

-- Also allow users to see their own memberships (for bootstrapping)
CREATE POLICY "Users can view their own memberships"
  ON public.household_members FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Parents can add household members"
  ON public.household_members FOR INSERT
  WITH CHECK (
    public.user_role_in_household(household_id) = 'parent'
    OR (
      -- Allow self-insert (creating first membership or joining via invitation)
      profile_id = auth.uid()
    )
  );

CREATE POLICY "Parents can remove household members"
  ON public.household_members FOR DELETE
  USING (
    public.user_role_in_household(household_id) = 'parent'
  );

-- --------------------------------------------------------------------------
-- children
-- --------------------------------------------------------------------------

CREATE POLICY "Members can view children in their households"
  ON public.children FOR SELECT
  USING (household_id IN (SELECT public.user_household_ids()));

CREATE POLICY "Parents can manage children"
  ON public.children FOR INSERT
  WITH CHECK (public.user_role_in_household(household_id) = 'parent');

CREATE POLICY "Parents can update children"
  ON public.children FOR UPDATE
  USING (public.user_role_in_household(household_id) = 'parent');

CREATE POLICY "Parents can delete children"
  ON public.children FOR DELETE
  USING (public.user_role_in_household(household_id) = 'parent');

-- --------------------------------------------------------------------------
-- invitations
-- --------------------------------------------------------------------------

CREATE POLICY "Members can view invitations for their households"
  ON public.invitations FOR SELECT
  USING (household_id IN (SELECT public.user_household_ids()));

CREATE POLICY "Parents can create invitations"
  ON public.invitations FOR INSERT
  WITH CHECK (public.user_role_in_household(household_id) = 'parent');

CREATE POLICY "Invitees can view their own invitation by email"
  ON public.invitations FOR SELECT
  USING (
    email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Invitees can accept their own invitation"
  ON public.invitations FOR UPDATE
  USING (
    email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (status = 'accepted');

-- --------------------------------------------------------------------------
-- nanny_instances
-- --------------------------------------------------------------------------

CREATE POLICY "Members can view nanny instances in their households"
  ON public.nanny_instances FOR SELECT
  USING (household_id IN (SELECT public.user_household_ids()));

CREATE POLICY "Parents can create nanny instances"
  ON public.nanny_instances FOR INSERT
  WITH CHECK (public.user_role_in_household(household_id) = 'parent');

CREATE POLICY "Parents can update nanny instances"
  ON public.nanny_instances FOR UPDATE
  USING (public.user_role_in_household(household_id) = 'parent');

-- --------------------------------------------------------------------------
-- rate_configs
-- --------------------------------------------------------------------------

CREATE POLICY "Members can view rate configs for their nanny instances"
  ON public.rate_configs FOR SELECT
  USING (
    nanny_instance_id IN (
      SELECT ni.id FROM public.nanny_instances ni
      WHERE ni.household_id IN (SELECT public.user_household_ids())
    )
  );

CREATE POLICY "Parents can create rate configs"
  ON public.rate_configs FOR INSERT
  WITH CHECK (
    nanny_instance_id IN (
      SELECT ni.id FROM public.nanny_instances ni
      WHERE public.user_role_in_household(ni.household_id) = 'parent'
    )
  );

CREATE POLICY "Parents can update rate configs"
  ON public.rate_configs FOR UPDATE
  USING (
    nanny_instance_id IN (
      SELECT ni.id FROM public.nanny_instances ni
      WHERE public.user_role_in_household(ni.household_id) = 'parent'
    )
  );

-- --------------------------------------------------------------------------
-- time_entries
-- --------------------------------------------------------------------------

CREATE POLICY "Members can view time entries for their nanny instances"
  ON public.time_entries FOR SELECT
  USING (
    nanny_instance_id IN (
      SELECT ni.id FROM public.nanny_instances ni
      WHERE ni.household_id IN (SELECT public.user_household_ids())
    )
  );

CREATE POLICY "Nannies can create their own time entries"
  ON public.time_entries FOR INSERT
  WITH CHECK (
    entered_by = auth.uid()
    AND nanny_instance_id IN (
      SELECT ni.id FROM public.nanny_instances ni
      WHERE ni.household_id IN (SELECT public.user_household_ids())
    )
  );

CREATE POLICY "Entry owners can update draft entries"
  ON public.time_entries FOR UPDATE
  USING (
    entered_by = auth.uid()
    AND status IN ('draft', 'rejected')
  );

CREATE POLICY "Parents can approve or reject time entries"
  ON public.time_entries FOR UPDATE
  USING (
    nanny_instance_id IN (
      SELECT ni.id FROM public.nanny_instances ni
      WHERE public.user_role_in_household(ni.household_id) = 'parent'
    )
    AND status = 'pending'
  );

CREATE POLICY "Entry owners can delete draft entries"
  ON public.time_entries FOR DELETE
  USING (entered_by = auth.uid() AND status = 'draft');

-- --------------------------------------------------------------------------
-- time_entry_periods
-- --------------------------------------------------------------------------

CREATE POLICY "Members can view periods for visible time entries"
  ON public.time_entry_periods FOR SELECT
  USING (
    time_entry_id IN (
      SELECT te.id FROM public.time_entries te
      JOIN public.nanny_instances ni ON ni.id = te.nanny_instance_id
      WHERE ni.household_id IN (SELECT public.user_household_ids())
    )
  );

CREATE POLICY "Entry owners can manage periods on draft entries"
  ON public.time_entry_periods FOR INSERT
  WITH CHECK (
    time_entry_id IN (
      SELECT te.id FROM public.time_entries te
      WHERE te.entered_by = auth.uid()
        AND te.status IN ('draft', 'rejected')
    )
  );

CREATE POLICY "Entry owners can update periods on draft entries"
  ON public.time_entry_periods FOR UPDATE
  USING (
    time_entry_id IN (
      SELECT te.id FROM public.time_entries te
      WHERE te.entered_by = auth.uid()
        AND te.status IN ('draft', 'rejected')
    )
  );

CREATE POLICY "Entry owners can delete periods on draft entries"
  ON public.time_entry_periods FOR DELETE
  USING (
    time_entry_id IN (
      SELECT te.id FROM public.time_entries te
      WHERE te.entered_by = auth.uid()
        AND te.status IN ('draft', 'rejected')
    )
  );

-- --------------------------------------------------------------------------
-- expenses
-- --------------------------------------------------------------------------

CREATE POLICY "Members can view expenses for their nanny instances"
  ON public.expenses FOR SELECT
  USING (
    nanny_instance_id IN (
      SELECT ni.id FROM public.nanny_instances ni
      WHERE ni.household_id IN (SELECT public.user_household_ids())
    )
  );

CREATE POLICY "Nannies can create their own expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (
    entered_by = auth.uid()
    AND nanny_instance_id IN (
      SELECT ni.id FROM public.nanny_instances ni
      WHERE ni.household_id IN (SELECT public.user_household_ids())
    )
  );

CREATE POLICY "Expense owners can update draft expenses"
  ON public.expenses FOR UPDATE
  USING (
    entered_by = auth.uid()
    AND status IN ('draft', 'rejected')
  );

CREATE POLICY "Parents can approve or reject expenses"
  ON public.expenses FOR UPDATE
  USING (
    nanny_instance_id IN (
      SELECT ni.id FROM public.nanny_instances ni
      WHERE public.user_role_in_household(ni.household_id) = 'parent'
    )
    AND status = 'pending'
  );

CREATE POLICY "Expense owners can delete draft expenses"
  ON public.expenses FOR DELETE
  USING (entered_by = auth.uid() AND status = 'draft');

-- --------------------------------------------------------------------------
-- payments
-- --------------------------------------------------------------------------

CREATE POLICY "Members can view payments for their nanny instances"
  ON public.payments FOR SELECT
  USING (
    nanny_instance_id IN (
      SELECT ni.id FROM public.nanny_instances ni
      WHERE ni.household_id IN (SELECT public.user_household_ids())
    )
  );

CREATE POLICY "Members can log payments"
  ON public.payments FOR INSERT
  WITH CHECK (
    logged_by = auth.uid()
    AND nanny_instance_id IN (
      SELECT ni.id FROM public.nanny_instances ni
      WHERE ni.household_id IN (SELECT public.user_household_ids())
    )
  );

CREATE POLICY "Payment owners can update logged payments"
  ON public.payments FOR UPDATE
  USING (logged_by = auth.uid() AND status = 'logged');

CREATE POLICY "Counterparty can accept or reject payments"
  ON public.payments FOR UPDATE
  USING (
    nanny_instance_id IN (
      SELECT ni.id FROM public.nanny_instances ni
      WHERE ni.household_id IN (SELECT public.user_household_ids())
    )
    AND logged_by != auth.uid()
    AND status = 'logged'
  );

-- --------------------------------------------------------------------------
-- comment_history
-- --------------------------------------------------------------------------

CREATE POLICY "Members can view comments for entities in their households"
  ON public.comment_history FOR SELECT
  USING (
    author_id IN (
      SELECT hm.profile_id
      FROM public.household_members hm
      WHERE hm.household_id IN (SELECT public.user_household_ids())
    )
  );

CREATE POLICY "Members can add comments"
  ON public.comment_history FOR INSERT
  WITH CHECK (author_id = auth.uid());

-- ============================================================================
-- DONE! All RLS policies have been created.
-- ============================================================================
