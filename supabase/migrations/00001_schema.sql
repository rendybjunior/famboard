-- =============================================================================
-- FamBoard Schema Migration
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: generate short invite codes
-- -----------------------------------------------------------------------------
create or replace function generate_invite_code(length int default 6)
returns text
language sql
volatile
as $$
  select upper(substr(replace(replace(
    encode(gen_random_bytes(8), 'base64'),
    '/', ''), '+', ''), 1, length));
$$;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table families (
  id               uuid        primary key default gen_random_uuid(),
  name             text        not null,
  invite_code      text        not null unique default generate_invite_code(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table family_members (
  id               uuid        primary key default gen_random_uuid(),
  family_id        uuid        not null references families(id) on delete cascade,
  user_id          uuid        not null references auth.users(id) on delete cascade,
  display_name     text        not null,
  role             text        not null default 'kid'
                               check (role in ('parent', 'kid')),
  redemption_rate  int         not null default 1
                               check (redemption_rate >= 1),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (family_id, user_id)
);

create table reading_entries (
  id               uuid        primary key default gen_random_uuid(),
  family_id        uuid        not null references families(id) on delete cascade,
  kid_id           uuid        not null references family_members(id) on delete cascade,
  minutes          int         not null check (minutes > 0 and minutes <= 180),
  book_title       text,
  notes            text,
  status           text        not null default 'pending'
                               check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by      uuid        references family_members(id),
  reviewed_at      timestamptz,
  review_note      text,
  created_at       timestamptz not null default now()
);

create table redemptions (
  id               uuid        primary key default gen_random_uuid(),
  family_id        uuid        not null references families(id) on delete cascade,
  kid_id           uuid        not null references family_members(id) on delete cascade,
  minutes          int         not null check (minutes > 0),
  status           text        not null default 'pending'
                               check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by      uuid        references family_members(id),
  reviewed_at      timestamptz,
  review_note      text,
  created_at       timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

create index idx_family_members_user_id   on family_members(user_id);
create index idx_family_members_family_id on family_members(family_id);
create index idx_reading_entries_kid_id   on reading_entries(kid_id);
create index idx_reading_entries_status   on reading_entries(family_id, status);
create index idx_redemptions_kid_id       on redemptions(kid_id);
create index idx_redemptions_status       on redemptions(family_id, status);

-- -----------------------------------------------------------------------------
-- View: kid_balances
-- -----------------------------------------------------------------------------

create or replace view kid_balances as
select
  fm.id              as kid_id,
  fm.family_id,
  fm.display_name,
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

-- -----------------------------------------------------------------------------
-- Auto-update updated_at
-- -----------------------------------------------------------------------------

create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_families_updated_at
  before update on families
  for each row execute function update_updated_at();

create trigger trg_family_members_updated_at
  before update on family_members
  for each row execute function update_updated_at();

-- -----------------------------------------------------------------------------
-- Row-Level Security
-- -----------------------------------------------------------------------------

alter table families        enable row level security;
alter table family_members  enable row level security;
alter table reading_entries enable row level security;
alter table redemptions     enable row level security;

-- Helper: get the family_member row for the current auth user
-- Used in most policies to resolve user_id -> family membership
create or replace function my_family_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select family_id from family_members where user_id = auth.uid();
$$;

create or replace function my_member_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select id from family_members where user_id = auth.uid();
$$;

create or replace function is_parent_in_family(fid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from family_members
    where user_id = auth.uid()
      and family_id = fid
      and role = 'parent'
  );
$$;

-- -- families ------------------------------------------------------------------

create policy "members can view own family"
  on families for select
  using (id in (select my_family_ids()));

create policy "parents can update own family"
  on families for update
  using (is_parent_in_family(id));

create policy "authenticated users can create families"
  on families for insert
  with check (auth.uid() is not null);

-- -- family_members ------------------------------------------------------------

create policy "members can view family members"
  on family_members for select
  using (family_id in (select my_family_ids()));

create policy "users can join a family"
  on family_members for insert
  with check (user_id = auth.uid());

create policy "parents can update family members"
  on family_members for update
  using (is_parent_in_family(family_id));

create policy "parents can remove family members"
  on family_members for delete
  using (
    is_parent_in_family(family_id)
    and user_id != auth.uid()  -- cannot remove yourself
  );

-- -- reading_entries -----------------------------------------------------------

create policy "kids see own, parents see family"
  on reading_entries for select
  using (
    kid_id in (select my_member_ids())
    or is_parent_in_family(family_id)
  );

create policy "kids can submit reading entries"
  on reading_entries for insert
  with check (
    kid_id in (select my_member_ids())
  );

create policy "kids cancel own pending; parents review"
  on reading_entries for update
  using (
    -- kid cancelling own pending entry
    (kid_id in (select my_member_ids()) and status = 'pending')
    -- parent reviewing family entry
    or is_parent_in_family(family_id)
  );

-- -- redemptions ---------------------------------------------------------------

create policy "kids see own, parents see family"
  on redemptions for select
  using (
    kid_id in (select my_member_ids())
    or is_parent_in_family(family_id)
  );

create policy "kids can submit redemptions"
  on redemptions for insert
  with check (
    kid_id in (select my_member_ids())
  );

create policy "kids cancel own pending; parents review"
  on redemptions for update
  using (
    (kid_id in (select my_member_ids()) and status = 'pending')
    or is_parent_in_family(family_id)
  );

-- -----------------------------------------------------------------------------
-- RPC: look up family by invite code (public, no RLS needed)
-- -----------------------------------------------------------------------------

create or replace function get_family_by_invite_code(code text)
returns table(id uuid, name text)
language sql
security definer
as $$
  select id, name from families where invite_code = code limit 1;
$$;
