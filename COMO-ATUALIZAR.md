# Como atualizar (substituir a pasta + push)

## 1. SQL no Supabase (rode os que faltam, nesta ordem; todos idempotentes)
SQL Editor > New query > cole e Run, um de cada vez:
  - supabase/migrations/0004_recorrencia.sql   (se ainda não rodou)
  - supabase/migrations/0005_reflexoes.sql

## 2. Substitua os arquivos locais
Descompacte e copie TODO o conteúdo da pasta "ritmo" para C:\MEUS PROJETOS\myroutine,
substituindo. (Não vem node_modules nem .next — são gerados sozinhos.)

## 3. Push pelo PowerShell
cd "C:\MEUS PROJETOS\myroutine"
git pull origin main
git add .
git commit -m "feat: streak, XP, aba Progresso, foco, ritual de fim de dia"
git push

A Vercel redeploya. Abra em aba anônima quando ficar Ready.

# ============================================================
# O QUE ENTROU NESTA VERSÃO
# ============================================================
- Sequência (streak) 🔥 por atividade recorrente + recorde.
- XP por minutos cumpridos + níveis (aba Progresso).
- Aba Progresso: nível, últimos 7 dias, sequências, tempo por categoria.
- Aviso de "dia cheio" quando passa de 12h planejadas.
- Modo foco: botão "Entrar em foco" no bloco atual (timer em tela cheia).
- Ritual de fim de dia: botão "Encerrar o dia" (resumo + reflexão).

# ============================================================
# LIGAR A NOTIFICAÇÃO (o passo que só você pode fazer)
# ============================================================
O código já está no repositório. Falta CONFIGURAR no servidor:

1) Gerar chaves VAPID (no PowerShell, dentro da pasta):
     npx web-push generate-vapid-keys
   Guarde a PÚBLICA e a PRIVADA.

2) Vercel > Settings > Environment Variables, adicione:
     NEXT_PUBLIC_VAPID_PUBLIC_KEY = (a chave pública)
   Depois Redeploy (sem cache).

3) Instale o Supabase CLI e faça login (uma vez):
     npm install -g supabase
     supabase login
     supabase link --project-ref dokkpuuawzoubkfubhub

4) Defina os segredos da função e faça deploy:
     supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:voce@exemplo.com
     supabase functions deploy send-push

5) No Supabase SQL Editor, guarde os segredos do cron no Vault (uma vez):
     select vault.create_secret('SUA_SERVICE_ROLE_KEY', 'service_role_key');
     select vault.create_secret('https://dokkpuuawzoubkfubhub.supabase.co/functions/v1/send-push', 'edge_url');
   (O cron já foi criado pelo 0002_cron.sql.)

6) TESTE no iPhone (Fase 0): app instalado na tela inicial, Ajustes > Ativar
   notificações, crie um bloco para daqui a 2 min, feche o app, veja se chega.

Se algum passo der erro, me mande a mensagem exata — não tente adivinhar.
