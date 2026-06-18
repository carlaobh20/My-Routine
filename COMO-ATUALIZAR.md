# Como atualizar

## 1. SQL no Supabase
SEM SQL NOVO.

## 2. Substitua a pasta + push
Copie "ritmo" para C:\MEUS PROJETOS\myroutine, substituindo.
cd "C:\MEUS PROJETOS\myroutine"
git pull origin main
git add .
git commit -m "fix: notificacao pede permissao primeiro + botao Testar agora"
git push

## O QUE MUDOU (notificação — FASE 0)
- O botão "Ativar notificações" agora pede a PERMISSÃO primeiro e MOSTRA o
  resultado na tela (antes falhava mudo porque faltava a chave VAPID).
- Novo botão "Testar agora": dispara uma notificação LOCAL de teste, que NÃO
  depende de servidor nem de chave. Serve pra provar que o iPhone aceita.

## COMO TESTAR (no iPhone, app aberto pela tela inicial)
1. Ajustes (engrenagem) > Notificações.
2. Toque em "Ativar notificações" > deve aparecer o popup do iPhone > Permitir.
   - Vai aparecer um texto. Se disser "Falta só a chave VAPID", está PERFEITO
     para esta fase (a permissão funcionou; a chave é o próximo passo).
3. Toque em "Testar agora" > deve aparecer uma notificação na tela do iPhone.
   - Se a notificação aparecer, seu iPhone PASSOU no teste.

Me diga o texto que apareceu e se a notificação de teste chegou.
