-- Fix: kids could not cancel their own pending entries because the update
-- policy's USING clause was also used as WITH CHECK. After setting
-- status = 'cancelled', the row no longer matched "status = 'pending'",
-- causing a 403.

-- reading_entries
drop policy "kids cancel own pending; parents review" on reading_entries;
create policy "kids cancel own pending; parents review"
  on reading_entries for update
  using (
    (kid_id in (select my_member_ids()) and status = 'pending')
    or is_parent_in_family(family_id)
  )
  with check (
    kid_id in (select my_member_ids())
    or is_parent_in_family(family_id)
  );

-- redemptions
drop policy "kids cancel own pending; parents review" on redemptions;
create policy "kids cancel own pending; parents review"
  on redemptions for update
  using (
    (kid_id in (select my_member_ids()) and status = 'pending')
    or is_parent_in_family(family_id)
  )
  with check (
    kid_id in (select my_member_ids())
    or is_parent_in_family(family_id)
  );
