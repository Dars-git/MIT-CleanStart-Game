create table if not exists public.game_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  quarter integer not null default 1,
  cash double precision not null,
  engineers integer not null,
  sales_staff integer not null,
  quality double precision not null,
  last_revenue double precision not null default 0,
  last_net_income double precision not null default 0,
  total_revenue double precision not null default 0,
  total_net_income double precision not null default 0,
  is_over boolean not null default false,
  is_won boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quarter_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  quarter integer not null,
  year integer not null,
  quarter_in_year integer not null,
  cash double precision not null,
  revenue double precision not null,
  net_income double precision not null,
  engineers integer not null,
  sales_staff integer not null,
  quality double precision not null,
  created_at timestamptz not null default now()
);

create index if not exists quarter_history_user_quarter_idx
  on public.quarter_history (user_id, quarter desc);

alter table public.game_states enable row level security;
alter table public.quarter_history enable row level security;

drop policy if exists "Users can read own game state" on public.game_states;
create policy "Users can read own game state"
  on public.game_states for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own game state" on public.game_states;
create policy "Users can insert own game state"
  on public.game_states for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own game state" on public.game_states;
create policy "Users can update own game state"
  on public.game_states for update using (auth.uid() = user_id);

drop policy if exists "Users can read own history" on public.quarter_history;
create policy "Users can read own history"
  on public.quarter_history for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own history" on public.quarter_history;
create policy "Users can insert own history"
  on public.quarter_history for insert with check (auth.uid() = user_id);
