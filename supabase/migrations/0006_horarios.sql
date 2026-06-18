-- ============================================================
-- My Routine — janela do dia (acordar / dormir) no perfil
-- Rode no SQL Editor da Supabase. Idempotente.
-- ============================================================

alter table public.profiles
  add column if not exists hora_acordar text,
  add column if not exists hora_dormir text;
