-- Fix: allow create_family to work for newly signed-up users by accepting
-- an explicit for_user_id, falling back to auth.uid().

create or replace function create_family(
  family_name text,
  creator_display_name text,
  for_user_id uuid default null
)
returns json
language plpgsql
security definer
as $$
declare
  new_family_id uuid;
  new_member_id uuid;
  new_invite_code text;
  effective_user_id uuid;
begin
  effective_user_id := coalesce(auth.uid(), for_user_id);

  if effective_user_id is null then
    raise exception 'No authenticated user';
  end if;

  -- Create the family
  insert into families (name)
  values (family_name)
  returning id, invite_code into new_family_id, new_invite_code;

  -- Add the caller as parent
  insert into family_members (family_id, user_id, display_name, role)
  values (new_family_id, effective_user_id, creator_display_name, 'parent')
  returning id into new_member_id;

  return json_build_object(
    'family_id', new_family_id,
    'member_id', new_member_id,
    'invite_code', new_invite_code
  );
end;
$$;
