# Como atualizar (substituir a pasta + push)

## 1. SQL no Supabase — rode os que faltam, um de cada vez (todos idempotentes)
SQL Editor > New query > cole > Run:
  - supabase/migrations/0004_recorrencia.sql   (se ainda não rodou)
  - supabase/migrations/0005_reflexoes.sql     (se ainda não rodou)
  - supabase/migrations/0006_horarios.sql      (NOVO — acordar/dormir)

Se "adicionar tarefa" não estava salvando, era SQL faltando. Rodar estes resolve.

## 2. Substitua a pasta
Descompacte e copie o conteúdo de "ritmo" para C:\MEUS PROJETOS\myroutine, substituindo.
(Não vem node_modules nem .next.)

## 3. Push
cd "C:\MEUS PROJETOS\myroutine"
git pull origin main
git add .
git commit -m "feat: hora de acordar e dormir (janela do dia)"
git push

## NOVO nesta versão
- Na primeira vez, o app pergunta hora de acordar e dormir.
- A agenda (Meu dia) mostra 🌅 Acordar no topo e 🌙 Dormir no fim; os blocos ficam no meio.
- Dá para editar em Ajustes (engrenagem) > Seu dia.

## Lembrete: notificação continua dependendo da configuração do servidor
(ver seção no histórico / passos VAPID + supabase functions deploy + Vault).
