-- =============================================================================
-- FamBoard Seed Data
-- =============================================================================
--
-- INSTRUCTIONS:
--
-- 1. Create 3 users via Supabase Dashboard (Authentication > Users > Add User):
--      - parent@example.com  / slfjdf324
--      - kid1@example.com    / lkgdafs423
--      - kid2@example.com    / ladsfhoun387
--
-- 2. Copy each user's UUID from the dashboard and paste below:
--

-- Family
insert into families (id, name)
values ('a0000000-0000-0000-0000-000000000001', 'The Smiths');

-- Members (replace the user_id values with your real UUIDs from the dashboard)
insert into family_members (id, family_id, user_id, display_name, role, redemption_rate)
values
  ('b0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   'cccf6078-865c-49b1-8504-da1bda2574ff',  -- parent@example.com
   'Mom', 'parent', 1),
  ('b0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000001',
   '883757f3-7b70-4f19-ac54-b864298deecb',    -- kid1@example.com
   'Alex', 'kid', 1),
  ('b0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000001',
   'd0d4bf93-2851-4410-905b-cc5207e9e43f',    -- kid2@example.com
   'Jordan', 'kid', 2);       -- Jordan has 2:1 ratio

-- Sample reading entries for Alex
insert into reading_entries (family_id, kid_id, minutes, book_title, notes, status, reviewed_by, reviewed_at)
values
  ('a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002',
   30, 'Harry Potter', 'Chapters 1-3', 'approved',
   'b0000000-0000-0000-0000-000000000001', now() - interval '2 days'),
  ('a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002',
   45, 'Harry Potter', 'Chapters 4-6', 'approved',
   'b0000000-0000-0000-0000-000000000001', now() - interval '1 day'),
  ('a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002',
   20, 'Harry Potter', 'Chapter 7', 'pending',
   null, null);

-- Sample reading entry for Jordan
insert into reading_entries (family_id, kid_id, minutes, book_title, status)
values
  ('a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000003',
   60, 'Diary of a Wimpy Kid', 'approved');

-- Sample redemption for Alex (used 15 min of the 75 earned)
insert into redemptions (family_id, kid_id, minutes, status, reviewed_by, reviewed_at)
values
  ('a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002',
   15, 'approved',
   'b0000000-0000-0000-0000-000000000001', now() - interval '1 day');

-- Expected balances after seed:
--   Alex:   75 reading / 1 rate = 75 earned - 15 used = 60 balance  (+ 20 pending)
--   Jordan: 60 reading / 2 rate = 30 earned -  0 used = 30 balance
