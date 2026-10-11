# Protocolo Mentor — protocolar notas, vales e remessas do almoxarifado

App web (Next.js + Google Sheets via Apps Script), feito a partir da tela de exemplo.
Roda na Vercel e no celular (PWA).

## Campos (iguais aos da imagem)
- Código de barras (bipa e preenche a Nota sozinho quando o código tem 44 dígitos)
- Escolha: NOTA / VALE
- Nota * (obrigatória)
- Cliente/Hospital (obrigatório)
- Paciente
- Tipo devolução: VENDA DIRETA, CONSIGNAÇÃO, DEVOLUÇÃO TOTAL, DEVOLUÇÃO PARCIAL, VALE / REMESSA, OUTROS
- Observação
- Tabela: Item | Doc. | Hospital/Cliente | Paciente/Cliente | Status | Data protocolo | Observação | Ação (editar/excluir)
- Topo com Pesquisar + usuário

Status padrão ao salvar: `AGUARDANDO CONFIRMAÇÃO DA MENTOR!`

A planilha recebe na aba `Protocolo`:
`id | data_protocolo | codigo_barras | tipo_doc | numero_doc | cliente_hospital | paciente | tipo_devolucao | observacao | status | usuario` (criada sozinha).

## Configuração (1 vez só)

### 1. Backend (Code.gs já pronto na raiz)
1. Abra a planilha
2. Menu **Extensões → Apps Script**
3. Apague tudo e cole TODO o conteúdo do arquivo `Code.gs` desta pasta
4. **Deploy → Gerenciar deploy → Nova versão** (ou Novo deploy → Aplicativo da web):
   - Executar como: Eu
   - Quem tem acesso: **Qualquer pessoa**
5. Copie a URL (termina com `/exec`)

### 2. Frontend (Vercel)
- Em **Settings → Environment Variables** crie `NEXT_PUBLIC_GAS_URL` com a URL e redeploy.
- Ou abra o app e cole a URL no campo **Config. GAS** (fica salva no aparelho).

### 3. Teste rápido
- `URL?action=ping` → `{"success":true,"mensagem":"Protocolo Mentor online"}`
- `URL?action=listar` → `{"success":true,"dados":[...]}`

## Rodar local
`npm install` → `npm run dev` (usa o `NEXT_PUBLIC_GAS_URL` do `.env.local`).
