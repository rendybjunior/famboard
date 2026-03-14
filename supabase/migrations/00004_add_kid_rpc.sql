-- RPC for parent to add a kid directly to their family
create or replace function add_kid_to_family(
  kid_user_id uuid,
  kid_display_name text
)
returns json
language plpgsql
security definer
as $$
declare
  parent_family_id uuid;
  new_member_id uuid;
begin
  -- Verify caller is a parent
  select family_id into parent_family_id
  from family_members
  where user_id = auth.uid() and role = 'parent'
  limit 1;

  if parent_family_id is null then
    raise exception 'You must be a parent to add kids';
  end if;

  -- Check if already a member
  if exists (
    select 1 from family_members
    where family_id = parent_family_id and user_id = kid_user_id
  ) then
    raise exception 'This user is already a member of the family';
  end if;

  -- Add as kid
  insert into family_members (family_id, user_id, display_name, role)
  values (parent_family_id, kid_user_id, kid_display_name, 'kid')
  returning id into new_member_id;

  return json_build_object(
    'family_id', parent_family_id,
    'member_id', new_member_id
  );
end;
$$;
