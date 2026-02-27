-- local development seed
insert into public.lobbies (id, code, owner_id, status, options)
values (
  '00000000-0000-0000-0000-000000000001',
  'DEV28A',
  'dev-user-1',
  'waiting',
  '{"pairEnabled":false,"doubleEnabled":false}'::jsonb
)
on conflict (id) do nothing;

insert into public.lobby_players (lobby_id, actor_id, seat, ready)
values
  ('00000000-0000-0000-0000-000000000001', 'dev-user-1', 0, false),
  ('00000000-0000-0000-0000-000000000001', 'dev-user-2', 1, false),
  ('00000000-0000-0000-0000-000000000001', 'dev-user-3', 2, false),
  ('00000000-0000-0000-0000-000000000001', 'dev-user-4', 3, false)
on conflict do nothing;
