-- ============================================================
-- showcase-portfolio — Supabase setup SQL
-- Run this ONCE in Supabase Dashboard → SQL Editor → Run.
-- Then run:  notify pgrst, 'reload schema';
-- ============================================================

-- 1) Tables ----------------------------------------------------

-- Main portfolio row (single row, id = 1) — public read, admin write
create table if not exists public.portfolio (
  id          integer primary key check (id = 1),
  data        jsonb not null,
  version     bigint not null default 1,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

-- Audit/history of every publish (best-effort write, non-fatal)
create table if not exists public.portfolio_history (
  id            bigint generated always as identity primary key,
  portfolio_id  integer not null references public.portfolio (id) on delete cascade,
  data          jsonb not null,
  version       bigint not null,
  reason        text,
  by_email      text,
  by_uid        text,
  created_at    timestamptz not null default now()
);

create index if not exists portfolio_history_version_idx
  on public.portfolio_history (portfolio_id, version);

-- 2) Row Level Security -----------------------------------------

alter table public.portfolio enable row level security;
alter table public.portfolio_history enable row level security;

-- Anyone (visitors too) can read the live portfolio — this is what
-- powers the public site + realtime updates.
drop policy if exists "portfolio public read" on public.portfolio;
create policy "portfolio public read" on public.portfolio
  for select using (true);

-- Only signed-in Supabase users (admins) can create/update the row.
drop policy if exists "portfolio admin insert" on public.portfolio;
create policy "portfolio admin insert" on public.portfolio
  for insert to authenticated
  with check (auth.role() = 'authenticated');

drop policy if exists "portfolio admin update" on public.portfolio;
create policy "portfolio admin update" on public.portfolio
  for update to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- History: admins append, anyone can read (optional).
drop policy if exists "history admin insert" on public.portfolio_history;
create policy "history admin insert" on public.portfolio_history
  for insert to authenticated
  with check (auth.role() = 'authenticated');

drop policy if exists "history public read" on public.portfolio_history;
create policy "history public read" on public.portfolio_history
  for select using (true);

-- 3) Realtime (live updates in <2s for visitors) -----------------

-- Enable Realtime for the portfolio table:
alter publication supabase_realtime add table public.portfolio;

-- 4) Reload schema so PostgREST picks up the new tables ----------
notify pgrst, 'reload schema';

-- ============================================================
-- Optional: create the first admin user via SQL
-- (or use Dashboard → Authentication → Users → Add user)
-- replace 'ashhad0beg@gmail.com' and 'YourStrongPassword123!'
-- ============================================================
-- select * from auth.users limit 0; -- (users are managed via Auth UI)