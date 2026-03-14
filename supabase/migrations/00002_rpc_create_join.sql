-- =============================================================================
-- RPC functions for family creation and joining
-- These bypass RLS (security definer) to handle the chicken-and-egg problem:
-- you can't be a member before the family exists, but RLS requires membership.
-- =============================================================================

-- Create a family and add the calling user as parent
create or replace function create_family(
  family_name text,
  creator_display_name text
)
returns json
language plpgsql
security definer
as $$
declare
  new_family_id uuid;
  new_member_id uuid;
  new_invite_code text;
begin
  -- Create the family
  insert into families (name)
  values (family_name)
  returning id, invite_code into new_family_id, new_invite_code;

  -- Add the caller as parent
  insert into family_members (family_id, user_id, display_name, role)
  values (new_family_id, auth.uid(), creator_display_name, 'parent')
  returning id into new_member_id;

  return json_build_object(
    'family_id', new_family_id,
    'member_id', new_member_id,
    'invite_code', new_invite_code
  );
end;
$$;

-- Join a family via invite code as a kid
create or replace function join_family(
  invite_code text,
  member_display_name text
)
returns json
language plpgsql
security definer
as $$
declare
  target_family_id uuid;
  target_family_name text;
  new_member_id uuid;
begin
  -- Look up the family
  select id, name into target_family_id, target_family_name
  from families
  where families.invite_code = join_family.invite_code
  limit 1;

  if target_family_id is null then
    raise exception 'Invalid invite code';
  end if;

  -- Check if already a member
  if exists (
    select 1 from family_members
    where family_id = target_family_id and user_id = auth.uid()
  ) then
    raise exception 'You are already a member of this family';
  end if;

  -- Add as kid
  insert into family_members (family_id, user_id, display_name, role)
  values (target_family_id, auth.uid(), member_display_name, 'kid')
  returning id into new_member_id;

  return json_build_object(
    'family_id', target_family_id,
    'family_name', target_family_name,
    'member_id', new_member_id
  );
end;
$$;
