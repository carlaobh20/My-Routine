# Como atualizar (substituir a pasta + push)

## 1. SQL no Supabase
NESTA VERSÃO **NÃO TEM SQL NOVO**. 🎉
(Se você ainda não rodou alguma migration de 0001 a 0007, rode as que faltarem.
Todas são idempotentes. Mas para a aba Acompanhar não precisa de nada novo.)

## 2. Substitua a pasta
Descompacte e copie o conteúdo de "ritmo" para C:\MEUS PROJETOS\myroutine, substituindo.

## 3. Push
cd "C:\MEUS PROJETOS\myroutine"
git pull origin main
git add .
git commit -m "feat: aba Acompanhar (dash semanal) + duracao em horas e minutos"
git push

## NOVO nesta versão
- Aba ACOMPANHAR (📊): grade atividade × dias da semana.
  - Toque numa célula para marcar/desmarcar como FEITA naquele dia.
  - Setas ‹ › navegam entre semanas.
  - Topo: % de adesão da semana (cumpridas / agendadas).
  - Embaixo: por atividade — ✓ feitas, ◐ parciais, ✕ não, ! faltas, % adesão.
  - Legenda das cores na própria tela.
- Formulário: duração agora em HORAS + MINUTOS (ex.: 1h 30min), logo após o horário.
- Bônus: se salvar uma tarefa falhar, o erro aparece na tela (não trava mais mudo).
