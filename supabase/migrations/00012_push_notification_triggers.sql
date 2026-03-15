-- Trigger function that calls the send-push-notification Edge Function
-- when a new pending reading_entry or redemption is inserted.
--
-- NOTE: This uses pg_net (pre-installed on Supabase) to make async HTTP calls.
-- The Edge Function URL must be set as a database secret:
--
--   1. Deploy the edge function:
--      supabase functions deploy send-push-notification
--
--   2. Set the webhook URL in Supabase SQL editor:
--      ALTER DATABASE postgres SET app.settings.push_function_url = 'https://<project>.supabase.co/functions/v1/send-push-notification';
--      ALTER DATABASE postgres SET app.settings.service_role_key = '<your-service-role-key>';

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
  -- Only notify for new pending entries
  if new.status != 'pending' then
    return new;
  end if;

  func_url := current_setting('app.settings.push_function_url', true);
  svc_key := current_setting('app.settings.service_role_key', true);

  -- Skip if not configured
  if func_url is null or svc_key is null then
    return new;
  end if;

  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', TG_TABLE_NAME,
    'record', row_to_json(new)
  );

  -- Fire-and-forget HTTP POST via pg_net
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

create trigger trg_reading_entry_push
  after insert on reading_entries
  for each row execute function notify_new_pending_entry();

create trigger trg_redemption_push
  after insert on redemptions
  for each row execute function notify_new_pending_entry();
