# NFe Scanner — instruções

## 1. Variáveis de ambiente necessárias na Vercel

Vá em **Settings → Environment Variables** no seu projeto da Vercel e confirme que
estas variáveis existem (marcadas para Production, Preview e Development):

- `GOOGLE_CLIENT_EMAIL` — e-mail da Service Account
- `GOOGLE_PRIVATE_KEY` — chave privada da Service Account (com `-----BEGIN PRIVATE KEY-----`)
- `GOOGLE_SPREADSHEET_ID` — ID da planilha do Google Sheets
- `GOOGLE_DRIVE_FOLDER_ID` — ID da pasta do Google Drive (fotos e áudios)
- `GEMINI_API_KEY` — chave da API do Gemini (gratuita)

## 2. Abas necessárias na planilha do Google Sheets

A planilha precisa ter estas 3 abas, com esses nomes exatos:

- **usuarios** — colunas: `usuario_id | usuario | senha_hash`
- **historico** — colunas: `data_hora | numero_nfe | razao_social | nome_paciente | nome_vendedora | foto_id | usuario_id`
- **chat** — colunas: `data_hora | remetente | mensagem`

Não precisa preencher nada manualmente — o app cria as linhas sozinho. Só confirme
que as abas existem com esses nomes (a primeira linha pode ficar vazia ou com
cabeçalhos, tanto faz).

## 3. Publicar

Basta arrastar esta pasta inteira para o painel da Vercel (Add New → Project →
arraste a pasta). A Vercel detecta que é um projeto Next.js e instala tudo
sozinha (não precisa rodar `npm install` no seu computador).

## 4. PWA (instalar no celular)

O app já é um PWA. Depois de publicado, ao acessar pelo celular (Chrome/Safari),
vai aparecer a opção "Adicionar à tela inicial" / "Instalar app". Uma vez
instalado, ele abre em tela cheia, com ícone próprio, como um app nativo.

## 5. Como funciona a segurança das fotos

As fotos e áudios ficam **privados** no Google Drive (não são públicos). O app
busca a foto por trás das câmeras, através da rota `/api/photo`, autenticada
pela Service Account — só aparece quando alguém clica no card.
