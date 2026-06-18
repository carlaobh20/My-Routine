-- ============================================================
-- My Routine — ícone, subtarefas e inbox (captura rápida)
-- Rode no SQL Editor da Supabase. Idempotente.
-- ============================================================

alter table public.blocks
  add column if not exists icone text,
  add column if not exists subtarefas jsonb not null default '[]'::jsonb;

create table if not exists public.inbox_items (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  texto     text not null,
  criado_em timestamptz not null default now()
);

alter table public.inbox_items enable row level security;
drop policy if exists "inbox_select" on public.inbox_items;
drop policy if exists "inbox_insert" on public.inbox_items;
drop policy if exists "inbox_delete" on public.inbox_items;
create policy "inbox_select" on public.inbox_items for select using (auth.uid() = user_id);
create policy "inbox_insert" on public.inbox_items for insert with check (auth.uid() = user_id);
create policy "inbox_delete" on public.inbox_items for delete using (auth.uid() = user_id);
