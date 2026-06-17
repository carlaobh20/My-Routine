-- ============================================================
-- Ritmo / My Routine — colunas de categoria e validade
-- Idempotente: pode rodar mesmo que algumas colunas já existam.
-- Rode no SQL Editor da Supabase.
-- ============================================================

alter table public.blocks
  add column if not exists categoria text default 'Outro',
  add column if not exists cor text default '#64748b',
  add column if not exists validade_tipo text default 'hoje',
  add column if not exists validade_ate date,
  add column if not exists gatilho text;
