# Ritmo

Rotina em blocos com aviso de transição, para iPhone (PWA).
Stack: **Next.js (Vercel) + Supabase + GitHub**. Este repositório cobre a **Fase 0** (prova de notificação no iOS) e o **esqueleto da Fase 1** (MVP: login, criar bloco, timeline, marcar execução).

> ⚠️ Gamificação (XP/nível) e ritual de planejamento **ainda não estão aqui** — de propósito. Primeiro provamos que a notificação chega no seu iPhone (Fase 0). Veja o protocolo no fim.

---

## Como subir ESTE código no seu repositório

Eu não envio com o seu PAT — quem dá push com a sua credencial é você. No seu computador, dentro da pasta do projeto:

```bash
git init
git add .
git commit -m "Ritmo: Fase 0 + esqueleto MVP"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

Se o repositório já tem commits, troque a última linha por `git pull --rebase origin main` e depois `git push`.
Quando o Git pedir credencial, **aí sim** você cola o seu PAT no seu terminal — nunca aqui.

---

## Setup (uma vez)

### 1. Dependências
```bash
npm install
```

### 2. Banco (Supabase)
1. Crie um projeto em supabase.com.
2. Em **Database > Extensions**, ligue `pg_cron` e `pg_net`.
3. No **SQL Editor**, rode `supabase/migrations/0001_init.sql` e depois `0002_cron.sql`.
   (No `0002`, siga os comentários para guardar a service_role key e a URL da função no **Vault** — não escreva a chave no SQL.)
4. Em **Authentication**, deixe o login por e-mail (magic link) ativo.

### 3. Chaves VAPID (para o push)
```bash
npx web-push generate-vapid-keys
```
Guarde a pública e a privada.

### 4. Variáveis de ambiente
- **Local:** copie `.env.example` para `.env.local` e preencha as públicas.
- **Vercel:** em Project Settings > Environment Variables, coloque `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- **Supabase Edge Function (segredos):**
  ```bash
  supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:voce@exemplo.com
  ```

### 5. Deploy da função de push
```bash
supabase functions deploy send-push
```

### 6. Rodar
```bash
npm run dev        # local, em http://localhost:3000
```
Para produção, conecte o repositório à Vercel (deploy automático a cada push).

---

## Protocolo de teste da Fase 0 (faça ANTES de construir mais)

O objetivo é uma única resposta: **o push chega no seu iPhone, no horário, com o app fechado?**

1. Faça deploy na Vercel (push precisa de HTTPS; localhost não basta no iOS).
2. No iPhone, abra o site no **Safari** → Compartilhar → **Adicionar à Tela de Início**.
3. Abra o app pelo ícone, faça login, toque em **Ativar notificações**.
4. Crie um bloco para daqui a ~2 minutos. **Feche o app.**
5. Veja se a notificação chega.
6. Repita variando o tempo (2 min, 10 min, 1 h) e com o telefone bloqueado.

**Critério de aprovação:** ≥ 90% de entrega em ~50 disparos ao longo de 3 dias.
**Se reprovar:** o plano B é uma camada nativa (Capacitor) só para notificação. Não construa Fase 1/2 antes de decidir isso.

---

## Estrutura

```
src/app/            telas (login, hoje)
src/components/      Timeline, TaskForm, PushManager
src/lib/             clientes Supabase + lógica de push
public/sw.js         service worker (exibe o push — crítico no iOS)
public/manifest.json PWA
supabase/migrations/ schema + RLS + cron
supabase/functions/  edge function send-push (VAPID)
```

## Segurança (não negociável)
- Nenhum segredo no repositório — só em variáveis de ambiente / Vault.
- RLS ligada em todas as tabelas: cada usuário só vê os próprios dados.
- `main` protegida + Pull Request revisado pelo sócio antes do merge.

## Próximas fases (não implementadas)
- **Fase 2:** XP por minutos cumpridos, níveis, recorde de sequência com folga semanal.
- **Fase 3:** ritual de planejamento, aviso de superlotação, modo foco (Pomodoro), compartilhamento entre pessoas próximas.
