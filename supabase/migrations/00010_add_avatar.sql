-- Add avatar column to family_members
alter table family_members add column avatar text;

-- RPC so kids (and parents) can update their own avatar without
-- weakening the existing RLS update policy.
create or replace function update_my_avatar(new_avatar text)
returns void
language plpgsql
security definer
as $$
begin
  update family_members
  set avatar = new_avatar
  where user_id = auth.uid();
end;
$$;

-- Drop and recreate kid_balances view to include avatar
-- (CREATE OR REPLACE cannot add a column before existing ones)
drop view if exists kid_balances;
create view kid_balances as
select
  fm.id              as kid_id,
  fm.family_id,
  fm.display_name,
  fm.avatar,
  fm.redemption_rate,
  coalesce(r.total_reading, 0)                                          as total_reading_minutes,
  coalesce(r.total_reading, 0) / fm.redemption_rate                     as earned_screen_minutes,
  coalesce(d.total_redeemed, 0)                                         as used_screen_minutes,
  coalesce(r.total_reading, 0) / fm.redemption_rate
    - coalesce(d.total_redeemed, 0)                                     as balance
from family_members fm
left join (
  select kid_id, sum(minutes) as total_reading
  from reading_entries
  where status = 'approved'
  group by kid_id
) r on r.kid_id = fm.id
left join (
  select kid_id, sum(minutes) as total_redeemed
  from redemptions
  where status = 'approved'
  group by kid_id
) d on d.kid_id = fm.id
where fm.role = 'kid';
