-- ============================================================
-- Ritmo — schema inicial (Fase 0 + Fase 1)
-- Rode no SQL Editor da Supabase, ou via `supabase db push`.
-- ============================================================

-- 1. PERFIS (espelha auth.users) -----------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text,
  timezone    text not null default 'America/Sao_Paulo',
  nivel       int  not null default 1,
  xp_total    int  not null default 0,
  criado_em   timestamptz not null default now()
);

-- cria perfil automaticamente quando nasce um usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome) values (new.id, new.raw_user_meta_data->>'nome');
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. TAREFAS (modelo reutilizável) ---------------------------
create table if not exists public.tasks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  titulo           text not null,
  gatilho_se_entao text,                 -- ex.: "se são 9h, então abro a planilha"
  cor              text default '#6366f1',
  arquivado        boolean not null default false,
  criado_em        timestamptz not null default now()
);

-- 3. BLOCOS (instâncias na agenda do dia) --------------------
create table if not exists public.blocks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  task_id      uuid references public.tasks(id) on delete set null,
  titulo       text not null,            -- copiado da task no momento da criação
  data         date not null,
  hora_inicio  timestamptz not null,     -- instante exato (com fuso) do início
  duracao_min  int  not null check (duracao_min > 0),
  notificado   boolean not null default false,  -- o cron marca após enviar o push
  criado_em    timestamptz not null default now()
);
create index if not exists idx_blocks_user_data on public.blocks(user_id, data);
create index if not exists idx_blocks_disparo on public.blocks(hora_inicio) where notificado = false;

-- 4. EXECUÇÕES (o que foi cumprido) --------------------------
create table if not exists public.executions (
  id              uuid primary key default gen_random_uuid(),
  block_id        uuid not null references public.blocks(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  status          text not null check (status in ('cumprido','parcial','nao')),
  minutos_cumpridos int not null default 0,
  registrado_em   timestamptz not null default now(),
  unique (block_id)
);

-- 5. SEQUÊNCIAS (streak não punitivo) ------------------------
create table if not exists public.streaks (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  sequencia_atual   int not null default 0,
  recorde           int not null default 0,
  folga_usada_semana boolean not null default false,
  ultima_data       date
);

-- 6. INSCRIÇÕES DE PUSH (web push / iOS) ---------------------
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  criado_em  timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY — cada usuário só acessa o que é dele.
-- ============================================================
alter table public.profiles            enable row level security;
alter table public.tasks               enable row level security;
alter table public.blocks              enable row level security;
alter table public.executions          enable row level security;
alter table public.streaks             enable row level security;
alter table public.push_subscriptions  enable row level security;

-- profiles
create policy "perfil_proprio_select" on public.profiles for select using (auth.uid() = id);
create policy "perfil_proprio_update" on public.profiles for update using (auth.uid() = id);

-- macro de políticas "dono" para as tabelas com user_id
do $$
declare t text;
begin
  foreach t in array array['tasks','blocks','executions','streaks','push_subscriptions'] loop
    execute format($f$
      create policy "%1$s_select" on public.%1$s for select using (auth.uid() = user_id);
      create policy "%1$s_insert" on public.%1$s for insert with check (auth.uid() = user_id);
      create policy "%1$s_update" on public.%1$s for update using (auth.uid() = user_id);
      create policy "%1$s_delete" on public.%1$s for delete using (auth.uid() = user_id);
    $f$, t);
  end loop;
end $$;
