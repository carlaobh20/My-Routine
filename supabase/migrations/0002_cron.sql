-- ============================================================
-- Ritmo — agendador (pg_cron + pg_net)
-- Roda a cada minuto, encontra blocos que estão começando e
-- chama a Edge Function "send-push".
-- ============================================================
-- PRÉ-REQUISITO: habilite as extensões no painel da Supabase
--   Database > Extensions:  pg_cron  e  pg_net
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 🔴 SEGREDO: NÃO escreva a service_role key aqui dentro.
-- Guarde-a no Supabase Vault e leia em tempo de execução.
-- 1) No SQL editor, uma única vez:
--    select vault.create_secret('SUA_SERVICE_ROLE_KEY', 'service_role_key');
--    select vault.create_secret('https://SEU-PROJETO.supabase.co/functions/v1/send-push', 'edge_url');

-- Função que o cron chama: monta o POST para a Edge Function.
create or replace function public.disparar_push_pendentes()
returns void language plpgsql security definer set search_path = public, vault as $$
declare
  v_key text;
  v_url text;
begin
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'service_role_key';
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'edge_url';

  -- só dispara se houver bloco começando no minuto atual e ainda não notificado
  if exists (
    select 1 from public.blocks
    where notificado = false
      and hora_inicio <= now()
      and hora_inicio >  now() - interval '2 minutes'
  ) then
    perform net.http_post(
      url     := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_key
      ),
      body    := '{}'::jsonb
    );
  end if;
end; $$;

-- agenda a cada minuto
select cron.schedule('ritmo-disparar-push', '* * * * *', $$ select public.disparar_push_pendentes(); $$);
