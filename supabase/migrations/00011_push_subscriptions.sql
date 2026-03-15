-- Push notification subscriptions (Web Push API)
create table push_subscriptions (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  endpoint    text        not null,
  subscription jsonb      not null,  -- full PushSubscription object {endpoint, keys{p256dh, auth}}
  created_at  timestamptz not null default now(),

  unique(user_id, endpoint)
);

alter table push_subscriptions enable row level security;

-- Users can manage their own subscriptions
create policy "users can view own subscriptions"
  on push_subscriptions for select
  using (user_id = auth.uid());

create policy "users can insert own subscriptions"
  on push_subscriptions for insert
  with check (user_id = auth.uid());

create policy "users can delete own subscriptions"
  on push_subscriptions for delete
  using (user_id = auth.uid());

create index idx_push_subscriptions_user_id on push_subscriptions(user_id);
