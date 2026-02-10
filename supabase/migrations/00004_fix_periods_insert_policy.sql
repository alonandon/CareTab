-- ============================================================================
-- FIX: Allow time_entry_periods INSERT on pending entries
--
-- The original policy only allowed period inserts for 'draft' or 'rejected'
-- entries. When a nanny submits directly (status = 'pending'), the periods
-- silently fail to insert, causing $0 balance calculations.
-- Run this in the Supabase SQL Editor.
-- ============================================================================

DROP POLICY IF EXISTS "Entry owners can manage periods on draft entries" ON public.time_entry_periods;

CREATE POLICY "Entry owners can manage periods on their entries"
  ON public.time_entry_periods FOR INSERT
  WITH CHECK (
    time_entry_id IN (
      SELECT te.id FROM public.time_entries te
      WHERE te.entered_by = auth.uid()
        AND te.status IN ('draft', 'pending', 'rejected')
    )
  );

-- Also fix the UPDATE and DELETE policies to include pending
DROP POLICY IF EXISTS "Entry owners can update periods on draft entries" ON public.time_entry_periods;

CREATE POLICY "Entry owners can update periods on their entries"
  ON public.time_entry_periods FOR UPDATE
  USING (
    time_entry_id IN (
      SELECT te.id FROM public.time_entries te
      WHERE te.entered_by = auth.uid()
        AND te.status IN ('draft', 'pending', 'rejected')
    )
  );

DROP POLICY IF EXISTS "Entry owners can delete periods on draft entries" ON public.time_entry_periods;

CREATE POLICY "Entry owners can delete periods on their entries"
  ON public.time_entry_periods FOR DELETE
  USING (
    time_entry_id IN (
      SELECT te.id FROM public.time_entries te
      WHERE te.entered_by = auth.uid()
        AND te.status IN ('draft', 'pending', 'rejected')
    )
  );
