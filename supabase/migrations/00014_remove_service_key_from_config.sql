-- Remove service_role_key from app_config — it should not be stored in DB.
-- The Edge Function will be deployed with --no-verify-jwt instead.
delete from app_config where key = 'service_role_key';

-- Update trigger function to call without Authorization header
create or replace function notify_new_pending_entry()
returns trigger
language plpgsql
security definer
as $$
declare
  func_url text;
  payload jsonb;
begin
  if new.status != 'pending' then
    return new;
  end if;

  select value into func_url from app_config where key = 'push_function_url';

  if func_url is null then
    return new;
  end if;

  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', TG_TABLE_NAME,
    'record', row_to_json(new)
  );

  perform net.http_post(
    url := func_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := payload
  );

  return new;
end;
$$;
