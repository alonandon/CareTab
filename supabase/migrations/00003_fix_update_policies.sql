-- ============================================================================
-- FIX: Update policies need explicit WITH CHECK for status changes
-- Run this in the Supabase SQL Editor.
-- ============================================================================

-- --------------------------------------------------------------------------
-- time_entries: parents approve/reject (pending -> approved/rejected)
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents can approve or reject time entries" ON public.time_entries;

CREATE POLICY "Parents can approve or reject time entries"
  ON public.time_entries FOR UPDATE
  USING (
    nanny_instance_id IN (
      SELECT ni.id FROM public.nanny_instances ni
      WHERE public.user_role_in_household(ni.household_id) = 'parent'
    )
    AND status = 'pending'
  )
  WITH CHECK (
    nanny_instance_id IN (
      SELECT ni.id FROM public.nanny_instances ni
      WHERE public.user_role_in_household(ni.household_id) = 'parent'
    )
    AND status IN ('approved', 'rejected')
  );

-- --------------------------------------------------------------------------
-- time_entries: entry owners update draft/rejected entries
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Entry owners can update draft entries" ON public.time_entries;

CREATE POLICY "Entry owners can update draft entries"
  ON public.time_entries FOR UPDATE
  USING (
    entered_by = auth.uid()
    AND status IN ('draft', 'rejected')
  )
  WITH CHECK (
    entered_by = auth.uid()
    AND status IN ('draft', 'pending', 'rejected')
  );

-- --------------------------------------------------------------------------
-- expenses: parents approve/reject (pending -> approved/rejected)
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents can approve or reject expenses" ON public.expenses;

CREATE POLICY "Parents can approve or reject expenses"
  ON public.expenses FOR UPDATE
  USING (
    nanny_instance_id IN (
      SELECT ni.id FROM public.nanny_instances ni
      WHERE public.user_role_in_household(ni.household_id) = 'parent'
    )
    AND status = 'pending'
  )
  WITH CHECK (
    nanny_instance_id IN (
      SELECT ni.id FROM public.nanny_instances ni
      WHERE public.user_role_in_household(ni.household_id) = 'parent'
    )
    AND status IN ('approved', 'rejected')
  );

-- --------------------------------------------------------------------------
-- expenses: expense owners update draft/rejected expenses
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Expense owners can update draft expenses" ON public.expenses;

CREATE POLICY "Expense owners can update draft expenses"
  ON public.expenses FOR UPDATE
  USING (
    entered_by = auth.uid()
    AND status IN ('draft', 'rejected')
  )
  WITH CHECK (
    entered_by = auth.uid()
    AND status IN ('draft', 'pending', 'rejected')
  );

-- --------------------------------------------------------------------------
-- payments: owner can update logged payments
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Payment owners can update logged payments" ON public.payments;

CREATE POLICY "Payment owners can update logged payments"
  ON public.payments FOR UPDATE
  USING (logged_by = auth.uid() AND status = 'logged')
  WITH CHECK (logged_by = auth.uid());

-- --------------------------------------------------------------------------
-- payments: counterparty can accept/reject logged payments
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Counterparty can accept or reject payments" ON public.payments;

CREATE POLICY "Counterparty can accept or reject payments"
  ON public.payments FOR UPDATE
  USING (
    nanny_instance_id IN (
      SELECT ni.id FROM public.nanny_instances ni
      WHERE ni.household_id IN (SELECT public.user_household_ids())
    )
    AND logged_by != auth.uid()
    AND status = 'logged'
  )
  WITH CHECK (
    nanny_instance_id IN (
      SELECT ni.id FROM public.nanny_instances ni
      WHERE ni.household_id IN (SELECT public.user_household_ids())
    )
    AND status IN ('accepted', 'rejected')
  );

-- --------------------------------------------------------------------------
-- invitations: invitees accept their own invitation
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Invitees can accept their own invitation" ON public.invitations;

CREATE POLICY "Invitees can accept their own invitation"
  ON public.invitations FOR UPDATE
  USING (
    email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    AND status = 'pending'
  )
  WITH CHECK (
    status IN ('accepted', 'expired')
  );
