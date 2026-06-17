# Como atualizar o projeto (substituir a pasta + push)

Seu PowerShell local está atrasado (você editou no GitHub).
Para religar tudo, SUBSTITUA o conteúdo da pasta por este e dê push.

## 1. Rode o SQL no Supabase (uma vez)
SQL Editor > New query > cole o conteúdo de:
  supabase/migrations/0003_meu_dia.sql
> Run. (É idempotente: seguro rodar mesmo que algumas colunas já existam.)

## 2. Substitua os arquivos locais
1. Descompacte este zip.
2. Copie TODO o conteúdo da pasta "ritmo" para dentro de C:\MEUS PROJETOS\myroutine,
   substituindo os arquivos existentes (pode substituir tudo).
   - NÃO copie node_modules nem .next (não vêm no zip).
   - Mantenha o seu .env.local se tiver criado um (ele não vem no zip).

## 3. Suba pelo PowerShell
cd "C:\MEUS PROJETOS\myroutine"
git pull origin main          # traz o que está no GitHub e evita conflito
git add .
git commit -m "feat: abas Hoje e Meu dia, editar/validade, ajustes"
git push

A Vercel redeploya sozinha. Abra em aba anônima quando ficar Ready.

## Observações honestas
- A "validade" é GRAVADA mas ainda não REPETE a atividade sozinha (recorrência fica para depois).
- O arquivo Timeline.tsx foi removido (virou parte da page.tsx).
- O botão de notificações agora vive dentro do ícone de Ajustes (engrenagem, topo direito).
