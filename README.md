# (Hisense) Improvement List — site

Site que substitui o par Excel + PPT por 3 telas: **Apresentação** (o slide de cada ação), **Banco de Dados** (a tabela editável) e **Dashboard** (calculado ao vivo).

## Estado atual: Fase 2 — Google Sheets e Drive conectados, PPT ainda pendente

O que já funciona de verdade (não é mais mock):
- As 3 telas, com a marca Multilaser, protegidas por senha única, com seletor de idioma (PT/EN/ZH) e tema claro/escuro/sistema no topbar.
- **Dado ao vivo do Google Sheets** — Apresentação, Banco de Dados e Dashboard leem direto da planilha a cada carregamento, sem cache/JSON estático.
- **Edição na tabela grava de verdade no Sheets** — mudar Item/Departamento/Responsável/Prazo na tela de Banco de Dados escreve na célula certa da planilha (com indicador visual de salvando/salvo/erro).
- **Upload de foto vai pro Google Drive** — clicar/arrastar nas caixas Before/After da Apresentação sobe a imagem pro Drive e guarda a referência na aba `PPT_Detalhes` (colunas `Foto Before`/`Foto Improvement`, criadas automaticamente no primeiro upload).
- Modo "Apresentar" agora usa a Fullscreen API de verdade do navegador (antes era só uma camada por cima da página).
- "Abrir no Google Sheets" já linka pra planilha real.

O que ainda **não** está pronto:
- **Botão "Baixar PPT"** — ainda mostra um aviso em vez de gerar o arquivo. Motivo: o modelo de slide (`template_seed.pptx`, usado pelo gerador Python) ainda está no layout ANTIGO (14 tabelas), não no design novo aprovado que a tela "Apresentação" já usa. Gerar o PPT agora produziria um arquivo com aparência diferente da tela — combinamos deixar isso pra próxima etapa, depois de reconstruir o modelo no layout novo.
- "+ Nova ação" (criar uma ação nova direto pelo site).

## Configurar as credenciais (Fase 2)

Na Vercel (Project Settings → Environment Variables), configure:

| Variável | De onde vem |
|---|---|
| `SITE_PASSWORD` | Escolhida por você (já configurada na Fase 1). |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` do JSON da service account — no seu caso: `site-hisense-improvement@hisense-improvement-list.iam.gserviceaccount.com`. |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | `private_key` do mesmo JSON — cole o valor inteiro (com `-----BEGIN PRIVATE KEY-----` etc.), exatamente como está no arquivo. |
| `GOOGLE_SHEET_ID` | `1NwRVmtB-jJWOEshYthvP2sUjIy2TtXVv` (já é o ID da planilha que você converteu). |
| `GOOGLE_DRIVE_FOLDER_ID` | `1OI0RTwQ_nPxMu-z8rzcbWJAc8YCKOMvG` (pasta "Evidências"). |

Depois de adicionar/mudar variáveis de ambiente na Vercel, é preciso fazer um **novo deploy** pra elas passarem a valer (a Vercel geralmente oferece um botão "Redeploy" nas configurações, ou basta dar outro `git push`).

⚠️ Nunca cole essas credenciais no chat comigo nem commite elas no GitHub — o `.gitignore` já bloqueia `.env*`, mas a chave privada em si (o `.json` baixado do Google Cloud) também não deve entrar na pasta do projeto.

## Rodar localmente

Precisa de [Node.js](https://nodejs.org) instalado (18 ou mais novo).

```bash
cd site-web
npm install
cp .env.example .env.local
```

Edite `.env.local` com os mesmos valores da tabela acima. Depois:

```bash
npm run dev
```

Abre em `http://localhost:3000`.

## Próximo passo: reconstruir o template do PPT

Pra ligar o botão "Baixar PPT" de verdade, falta reconstruir `gerador_slides/template_seed.pptx` no layout novo (o mesmo da tela Apresentação: Issue+Description fundidos, sem tabela de Recheck, 1 prazo só) e portar `gerador_slides/gerar_ppt.py` pra ler os dados vindos do Sheets (via uma função serverless) em vez do Excel local. Isso fica pra uma próxima etapa — combine comigo quando quiser seguir com isso.
