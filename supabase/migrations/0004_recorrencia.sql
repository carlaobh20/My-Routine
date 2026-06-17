-- ============================================================
-- My Routine — recorrência por dia da semana + execução por dia
-- Rode no SQL Editor da Supabase. Idempotente.
-- ============================================================

-- Dias da semana em que a atividade se repete.
-- 0=Domingo, 1=Segunda ... 6=Sábado. NULL/vazio = atividade de um dia só.
alter table public.blocks
  add column if not exists dias_semana int[];

-- Execução passa a ser por DIA (antes era uma por bloco, para sempre).
alter table public.executions
  add column if not exists data date;

-- preenche a data das execuções antigas com a data em que foram registradas
update public.executions set data = (registrado_em)::date where data is null;

-- a partir de agora data é obrigatória
alter table public.executions alter column data set not null;

-- troca a unicidade: de (block_id) para (block_id, data)
alter table public.executions drop constraint if exists executions_block_id_key;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'executions_block_data_key') then
    alter table public.executions add constraint executions_block_data_key unique (block_id, data);
  end if;
end $$;
