-- Supabase SECURE & FREE setup for showcase-portfolio
-- Run this in Supabase Dashboard → SQL Editor → New query → Paste → Run
-- Free tier includes everything used here: Auth, Postgres, Realtime, RLS
-- After running: Authentication → Users → Add user → admin email+password

-- 1) Main portfolio table — single row id=1 stores full portfolio JSON (validated, <400KB)
create table if not exists public.portfolio (
  id int primary key check (id = 1),
  data jsonb not null,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- 2) History table — audit trail, free tier okay (tiny rows), keep last ~100 versions
create table if not exists public.portfolio_history (
  id uuid primary key default gen_random_uuid(),
  portfolio_id int not null default 1,
  data jsonb not null,
  version int not null,
  reason text,
  by_email text,
  by_uid uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_portfolio_history_version on public.portfolio_history (version desc);
create index if not exists idx_portfolio_history_created on public.portfolio_history (created_at desc);

-- 3) Enable Row Level Security — CRITICAL for security (FREE)
alter table public.portfolio enable row level security;
alter table public.portfolio_history enable row level security;

-- 4) RLS Policies — visitors can READ, only AUTHENTICATED can WRITE (secure, free)
-- Drop old policies if re-running
drop policy if exists "Public read portfolio" on public.portfolio;
drop policy if exists "Authenticated write portfolio" on public.portfolio;
drop policy if exists "Public read portfolio history" on public.portfolio_history;
drop policy if exists "Authenticated write portfolio history" on public.portfolio_history;

-- Public (anon) can SELECT — needed for visitors to see live portfolio
create policy "Public read portfolio"
  on public.portfolio for select
  using (true);

create policy "Public read portfolio history"
  on public.portfolio_history for select
  using (true);

-- Only authenticated users can INSERT/UPDATE/DELETE — Supabase Auth required
create policy "Authenticated write portfolio"
  on public.portfolio for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated write portfolio history"
  on public.portfolio_history for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- 5) Enable Realtime for <2s global sync (free tier includes realtime)
-- Supabase Dashboard → Database → Realtime → Enable for portfolio table
-- Or via SQL:
alter publication supabase_realtime add table public.portfolio;

-- 6) No initial row required — first Supabase-authenticated publish will create id=1 via upsert.
-- If you want an initial row, publish from admin after setup. No need to insert manually.

-- 7) Optional: tighten history — keep only last 100 rows (run as cron or manually)
-- delete from public.portfolio_history where id not in (select id from public.portfolio_history order by created_at desc limit 100);

-- Done! Now:
-- 1) Add admin user: Supabase Dashboard → Authentication → Users → Add user
-- 2) Copy Project URL + anon key to .env and GitHub Secrets
-- 3) Enable Realtime: Database → Realtime → portfolio = ON (if not already via alter publication)
