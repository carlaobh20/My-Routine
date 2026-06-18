# Como atualizar (substituir a pasta + push)

## 1. SQL no Supabase
NESTA VERSÃO **NÃO TEM SQL NOVO**. Pode subir direto.

## 2. Substitua a pasta
Descompacte e copie o conteúdo de "ritmo" para C:\MEUS PROJETOS\myroutine, substituindo TUDO.
(package.json/lock já tinham lucide-react; mantêm.)

## 3. Push
cd "C:\MEUS PROJETOS\myroutine"
git pull origin main
git add .
git commit -m "feat: tema escuro com botao + tela inicial acolhedora + duplicar"
git push

## NOVO nesta versão
- TEMA ESCURO com botão: ícone de lua/sol no topo (e em Ajustes > Aparência).
  Você escolhe claro/escuro quando quiser; fica salvo no aparelho.
- TELA INICIAL ACOLHEDORA quando o dia está vazio: saudação, ícone e um
  botão grande "Montar meu dia".
- DUPLICAR atividade: ao editar uma atividade, há o botão "Duplicar"
  (cria uma cópia com "(cópia)" no nome) — útil pra criar parecidas rápido.

## Sobre "arrastar pra reordenar"
Não foi feito de propósito: neste app a ORDEM é o HORÁRIO. Para mudar a ordem
de uma atividade, mude a hora de início dela. Arrastar brigaria com isso e
funciona mal no iPhone. Se quiser mesmo assim, dá pra fazer com setas ▲▼ depois.

## Próximo passo (o que falta de verdade)
Ligar a NOTIFICAÇÃO (push). É interativo e exige passos no servidor — fazemos
juntos numa conversa dedicada.
