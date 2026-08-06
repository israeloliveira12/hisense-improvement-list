# (Hisense) Improvement List — site

Site que substitui o par Excel + PPT por 3 telas: **Apresentação** (o slide de cada ação, no mesmo visual do PPT), **Banco de Dados** (a tabela editável) e **Dashboard** (calculado ao vivo, sem precisar de "Atualizar tudo").

## Estado atual: Fase 1 — interface completa, dado real, sem integração viva ainda

O que já funciona:
- As 3 telas, com a marca Multilaser, protegidas por senha única.
- Dado **real** das 50 ações (exportado uma vez da planilha de produção pra `data/acoes.json`/`data/dashboard.json` — não é mais texto de exemplo).
- Navegação, busca, filtros, edição de célula na tabela (só localmente, ainda não grava em lugar nenhum), modo "Apresentar" em tela cheia com seta do teclado.

O que ainda **não** está ligado (Fase 2, ver "Próximos passos" abaixo):
- Google Sheets como banco de dados de verdade (hoje é um `.json` estático, gerado 1x).
- Google Drive pra upload de foto (o botão de soltar imagem existe visualmente, ainda não envia nada).
- Botão "Baixar PPT" (hoje só mostra um aviso — a função serverless que gera o `.pptx` de verdade ainda não foi escrita).
- Botão "+ Nova ação" e "Abrir no Google Sheets" (visuais, sem ação ainda).

## Rodar localmente

Precisa de [Node.js](https://nodejs.org) instalado (18 ou mais novo).

```bash
cd site-web
npm install
cp .env.example .env.local
```

Edite `.env.local` e troque `SITE_PASSWORD` pela senha que você quiser usar. Depois:

```bash
npm run dev
```

Abre em `http://localhost:3000` — vai pedir a senha antes de mostrar qualquer tela.

## Próximos passos (Fase 2) — o que só você consegue fazer (contas/credenciais)

Nenhuma dessas contas pode ser criada por mim — são da sua conta Google/GitHub/Vercel. Quando quiser seguir pra Fase 2 (ligar Google Sheets/Drive de verdade e publicar), os passos são:

1. **Google Cloud — criar a "service account" (a credencial que o site usa pra falar com Sheets/Drive em seu nome, sem ser sua conta pessoal)**
   - Criar um projeto em [console.cloud.google.com](https://console.cloud.google.com).
   - Ativar as APIs "Google Sheets API" e "Google Drive API" nesse projeto.
   - Criar uma "Service Account" (IAM & Admin → Service Accounts → Create), gerar uma chave JSON pra ela.
   - Na planilha do Google Sheets (a versão migrada do Excel) e na pasta do Google Drive (evidências), compartilhar com o e-mail dessa service account como Editor — do mesmo jeito que se compartilha com uma pessoa, só que é uma "pessoa robô".

2. **GitHub — criar o repositório**
   - Criar um repositório novo (pode ser privado) e subir a pasta `site-web/` pra lá.

3. **Vercel — conectar e publicar**
   - Criar conta na Vercel (dá pra entrar direto com GitHub), importar o repositório.
   - Nas configurações do projeto na Vercel, adicionar as variáveis de ambiente (`SITE_PASSWORD`, e as credenciais da service account que vêm do passo 1) — nunca commitar essas credenciais no GitHub.
   - Cada `git push` depois disso publica uma versão nova automaticamente.

Assim que você tiver os itens 1–3 prontos (ou quiser ajuda decidindo algum detalhe deles), me avise que eu sigo com o código da Fase 2: as rotas que de fato leem/escrevem no Google Sheets e Drive, e a função de gerar o `.pptx`.
