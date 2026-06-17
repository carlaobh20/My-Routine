# Como atualizar (substituir a pasta + push)

## 1. Rode o SQL no Supabase (uma vez, nesta ordem)
SQL Editor > New query > cole e Run, um de cada vez:
  - supabase/migrations/0004_recorrencia.sql
(O 0003 você já rodou. Todos são idempotentes — seguro rodar de novo.)

## 2. Substitua os arquivos locais
1. Descompacte este zip.
2. Copie TODO o conteúdo da pasta "ritmo" para C:\MEUS PROJETOS\myroutine, substituindo.
   - NÃO vem node_modules nem .next (são gerados sozinhos).
   - Mantenha seu .env.local se tiver um.

## 3. Push pelo PowerShell
cd "C:\MEUS PROJETOS\myroutine"
git pull origin main
git add .
git commit -m "feat: dias da semana (recorrencia) + linha do agora"
git push

## O que mudou nesta versão
- Atividade pode repetir em dias da semana (atalho "Dias úteis" = seg a sex).
- "Cumpri/Em parte" agora é registrado POR DIA (antes era uma vez por bloco).
- Linha vermelha "AGORA" na aba Meu dia, mostrando onde você está no dia.

## Honestidade
- Recorrência: a atividade APARECE nos dias certos automaticamente. Não gera
  cópias no banco — ela é mostrada quando o dia da semana bate. Isso é o certo.
- Notificação automática nos dias recorrentes ainda depende do cron/Edge Function
  que ainda não ligamos (Fase de notificação). Hoje a recorrência é visual + registro.
