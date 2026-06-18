# Como atualizar (substituir a pasta + push)

## 1. SQL no Supabase — rode o que faltar, um de cada vez (idempotentes)
SQL Editor > New query > cole > Run:
  - supabase/migrations/0007_structured.sql   (NOVO — ícone, subtarefas, inbox)
(Se ainda não rodou 0004/0005/0006, rode-os antes.)

## 2. Substitua a pasta
Descompacte e copie o conteúdo de "ritmo" para C:\MEUS PROJETOS\myroutine, substituindo.

## 3. Push
cd "C:\MEUS PROJETOS\myroutine"
git pull origin main
git add .
git commit -m "feat: timeline de vazios, subtarefas, icone e inbox"
git push

## NOVO nesta versão (inspirado no Structured, sem IA)
- Timeline com VAZIOS: na aba Meu dia, entre as atividades aparece
  "Xh livre — + adicionar". Toca e já cria no horário do buraco.
- Subtarefas dentro da atividade (marca/desmarca na aba Hoje).
- Ícone (emoji) por atividade, escolhido no formulário.
- Captura rápida (📥): anote algo sem horário na aba Hoje e use "Agendar"
  depois para encaixar no dia.
