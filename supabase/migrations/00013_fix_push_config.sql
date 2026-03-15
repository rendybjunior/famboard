-- Store push config in a table instead of ALTER DATABASE SET
-- (ALTER DATABASE SET is not allowed on Supabase free tier)

create table if not exists app_config (
  key   text primary key,
  value text not null
);

-- No RLS needed — only accessed by security definer functions
alter table app_config enable row level security;

-- Replace the trigger function to read from app_config table
create or replace function notify_new_pending_entry()
returns trigger
language plpgsql
security definer
as $$
declare
  func_url text;
  svc_key text;
  payload jsonb;
begin
  if new.status != 'pending' then
    return new;
  end if;

  select value into func_url from app_config where key = 'push_function_url';
  select value into svc_key from app_config where key = 'service_role_key';

  if func_url is null or svc_key is null then
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
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || svc_key
    ),
    body := payload
  );

  return new;
end;
$$;
