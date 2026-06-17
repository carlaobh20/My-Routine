-- ============================================================
-- My Routine — reflexões diárias (ritual de fim de dia)
-- Rode no SQL Editor da Supabase. Idempotente.
-- ============================================================

create table if not exists public.daily_reviews (
  user_id    uuid not null references auth.users(id) on delete cascade,
  data       date not null,
  nota       text,
  sentimento text,
  criado_em  timestamptz not null default now(),
  primary key (user_id, data)
);

alter table public.daily_reviews enable row level security;

drop policy if exists "dr_select" on public.daily_reviews;
drop policy if exists "dr_insert" on public.daily_reviews;
drop policy if exists "dr_update" on public.daily_reviews;
create policy "dr_select" on public.daily_reviews for select using (auth.uid() = user_id);
create policy "dr_insert" on public.daily_reviews for insert with check (auth.uid() = user_id);
create policy "dr_update" on public.daily_reviews for update using (auth.uid() = user_id);
