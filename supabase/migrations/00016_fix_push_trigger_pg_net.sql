-- Fix push notification trigger to gracefully handle missing pg_net extension.
-- Uses dynamic SQL so the function body compiles even without the net schema.

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

  -- Use dynamic SQL so this compiles even if pg_net is not installed
  begin
    execute format(
      'select net.http_post(url := %L, headers := %L::jsonb, body := %L::jsonb)',
      func_url,
      '{"Content-Type": "application/json"}',
      payload::text
    );
  exception when others then
    -- pg_net not available or call failed — log and continue
    raise warning 'push notification skipped: %', SQLERRM;
  end;

  return new;
end;
$$;
