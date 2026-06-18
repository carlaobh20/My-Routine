# Como atualizar (substituir a pasta + push)

## 1. SQL no Supabase
NESTA VERSÃO **NÃO TEM SQL NOVO**. Pode subir direto.

## 2. Substitua a pasta
Descompacte e copie o conteúdo de "ritmo" para C:\MEUS PROJETOS\myroutine, substituindo TUDO.
IMPORTANTE: esta versão adicionou a biblioteca "lucide-react" (ícones).
Por isso o package.json e o package-lock.json mudaram — copie-os também.
A Vercel instala sozinha no deploy; você não precisa rodar npm install.

## 3. Push
cd "C:\MEUS PROJETOS\myroutine"
git pull origin main
git add .
git commit -m "feat: icones modernos (lucide) + ajuste aba Acompanhar"
git push

## NOVO nesta versão
- Ícones de linha modernos (Lucide) na barra, botões e nas atividades.
- Cada atividade aparece num SELO colorido pela categoria.
- Picker de ícone no formulário agora é de ícones de linha (não emoji).
- Aba Acompanhar: mostra SÓ atividades que se repetem (some o lixo de
  tarefas "só hoje"). Toque no nome de uma atividade (na lista "Por atividade")
  para abrir e EXCLUIR duplicadas.

## Observação sobre ícones antigos
Atividades criadas antes guardavam emoji no ícone. Como agora o ícone é por
nome (ex.: "book"), as antigas aparecem com um ícone neutro (círculo).
É só abrir a atividade, escolher o ícone novo e salvar.
