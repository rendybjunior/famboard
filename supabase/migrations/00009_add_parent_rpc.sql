-- RPC for parent to add another parent to their family
create or replace function add_parent_to_family(
  parent_user_id uuid,
  parent_display_name text
)
returns json
language plpgsql
security definer
as $$
declare
  caller_family_id uuid;
  new_member_id uuid;
begin
  -- Verify caller is a parent
  select family_id into caller_family_id
  from family_members
  where user_id = auth.uid() and role = 'parent'
  limit 1;

  if caller_family_id is null then
    raise exception 'You must be a parent to add members';
  end if;

  -- Check if already a member
  if exists (
    select 1 from family_members
    where family_id = caller_family_id and user_id = parent_user_id
  ) then
    raise exception 'This user is already a member of the family';
  end if;

  -- Add as parent
  insert into family_members (family_id, user_id, display_name, role)
  values (caller_family_id, parent_user_id, parent_display_name, 'parent')
  returning id into new_member_id;

  return json_build_object(
    'family_id', caller_family_id,
    'member_id', new_member_id
  );
end;
$$;
