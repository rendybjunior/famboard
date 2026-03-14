-- Fix: allow join_family to work for newly signed-up users whose session
-- may not yet be established (e.g. when email confirmation is enabled).
-- Accepts an explicit for_user_id, falling back to auth.uid().

create or replace function join_family(
  invite_code text,
  member_display_name text,
  for_user_id uuid default null
)
returns json
language plpgsql
security definer
as $$
declare
  target_family_id uuid;
  target_family_name text;
  new_member_id uuid;
  effective_user_id uuid;
begin
  effective_user_id := coalesce(auth.uid(), for_user_id);

  if effective_user_id is null then
    raise exception 'No authenticated user';
  end if;

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
    where family_id = target_family_id and user_id = effective_user_id
  ) then
    raise exception 'You are already a member of this family';
  end if;

  -- Add as kid
  insert into family_members (family_id, user_id, display_name, role)
  values (target_family_id, effective_user_id, member_display_name, 'kid')
  returning id into new_member_id;

  return json_build_object(
    'family_id', target_family_id,
    'family_name', target_family_name,
    'member_id', new_member_id
  );
end;
$$;
