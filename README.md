# (Hisense) Improvement List — site

Site que substitui o par Excel + PPT por 3 telas: **Apresentação** (o slide de cada ação), **Banco de Dados** (a tabela editável) e **Dashboard** (calculado ao vivo).

## Estado atual: Fase 3 — todos os itens do roadmap de mockups implementados

O que já funciona de verdade (não é mais mock):
- As 3 telas, com a marca Multilaser, protegidas por senha única, com seletor de idioma (PT/EN/ZH) e 1 botão de tema claro/escuro no topbar.
- **Dado ao vivo do Google Sheets** — Apresentação, Banco de Dados e Dashboard leem direto da planilha a cada carregamento, sem cache/JSON estático.
- **Edição completa** — clique no nº da ação (Banco de Dados) ou no botão flutuante "Editar ação" (Apresentação, fora do `.slide` de propósito) abre um painel com TODOS os campos: Geral (item, depto, responsável, auditor, processo, datas, status incl. fechar ação, motivo de atraso), Descrição do documento (Description/Expectation/Abrangency/comentários), Investimento (edita os itens já lançados — adicionar item novo ainda não).
- **"+ Nova ação"** — formulário no Banco de Dados cria uma linha nova na planilha (número temporário `NEW-<timestamp>` até a Hisense atribuir o número oficial).
- **Selo "NEW"** no slide de ações criadas há menos de 30 dias pelo site (some sozinho depois).
- **Upload, exclusão E reposicionamento (zoom/posição) de foto** — tudo funcionando, com preview ao vivo no ajuste de enquadramento.
- **Baixar PPT** — de 1 ação ou da apresentação completa (capa + divisores + encerramento), gerado com `pptxgenjs` (Node puro, sem função Python) no layout novo. Fotos entram sem distorcer, mas ainda sem usar o zoom/posição configurado no site (ver pendências).
- **Target calculado** (não mais manual): `sem investimento OU investimento aprovado OU já fechada`.
- **Dashboard com 6 abas**: Principal, Investimentos, Forecast (previsão de fechamento por semana), Auditor, Aging (tempo em aberto), Departamentos.
- Modo "Apresentar" com Fullscreen API real. Layout responsivo pra celular/tablet.

O que ainda **não** está pronto:
- O PPT baixado não usa o zoom/posição de foto configurado no site (usa a foto inteira, centralizada).
- Adicionar item de investimento novo pelo site (só edita os que já existem na planilha).
- **Risco não testável daqui**: gerar a apresentação completa (50 slides + fotos) pode esbarrar no limite de tempo de execução da Vercel — só se confirma testando em produção.

## Configurar as credenciais (Fase 2)

Na Vercel (Project Settings → Environment Variables), configure:

| Variável | De onde vem |
|---|---|
| `SITE_PASSWORD` | Escolhida por você (já configurada na Fase 1). |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` do JSON da service account — no seu caso: `site-hisense-improvement@hisense-improvement-list.iam.gserviceaccount.com`. |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | `private_key` do mesmo JSON — cole o valor inteiro (com `-----BEGIN PRIVATE KEY-----` etc.), exatamente como está no arquivo. |
| `GOOGLE_SHEET_ID` | `1SoK5AjfSUqI1XxHibq-nufrTKADgdRxVGFO5srXcehQ` (a cópia convertida de verdade em Google Sheets — não a antiga, que ainda era um `.xlsx` em modo de compatibilidade). |
| `GOOGLE_DRIVE_FOLDER_ID` | `1OI0RTwQ_nPxMu-z8rzcbWJAc8YCKOMvG` (pasta "Evidências"). |

Depois de adicionar/mudar variáveis de ambiente na Vercel, é preciso fazer um **novo deploy** pra elas passarem a valer (a Vercel geralmente oferece um botão "Redeploy" nas configurações, ou basta dar outro `git push`).

## Configurar o OAuth do Drive (upload de foto)

O upload de foto **não pode usar a service account** — contas de serviço não têm cota de armazenamento própria no Google Drive, e a única forma disso funcionar numa conta pessoal (não-Workspace) é o upload acontecer autenticado como você mesmo, via OAuth. Passo a passo:

1. **Criar a credencial OAuth no Google Cloud** (mesmo projeto de antes: `hisense-improvement-list`):
   - Console → **APIs e Serviços → Tela de consentimento OAuth**. Tipo de usuário: **Externo**. Preencha nome do app, e-mail de suporte e e-mail de contato do desenvolvedor (pode ser o seu mesmo). Salve.
   - Na etapa **"Usuários de teste"**, adicione o seu próprio e-mail do Google — sem isso o Google bloqueia a autorização, já que o app não passou pela revisão pública (não precisa passar, é só uso seu).
   - Console → **APIs e Serviços → Credenciais → + Criar Credenciais → ID do cliente OAuth**. Tipo de aplicativo: **Aplicativo da Web**. Em **URIs de redirecionamento autorizados**, adicione: `https://SEU-DOMINIO-VERCEL/api/auth/google/callback` (troque pelo domínio real do seu site na Vercel).
   - Copie o **Client ID** e o **Client Secret** gerados.

2. **Configurar na Vercel** (Environment Variables): adicione `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` e `GOOGLE_OAUTH_REDIRECT_URI` (o mesmo valor exato usado no passo acima) — e faça um **Redeploy**.

3. **Autorizar uma vez**: acesse `https://SEU-DOMINIO-VERCEL/api/auth/google/start` (logado no site). Você vai cair na tela de consentimento do Google — entre com sua conta e autorize o acesso ao Drive. A página final mostra um texto longo (o `refresh_token`) — copie ele.

4. **Guardar o token**: cole esse valor na variável `GOOGLE_OAUTH_REFRESH_TOKEN` na Vercel, e faça outro **Redeploy**. A partir daí o upload de foto passa a funcionar de verdade.

⚠️ O `refresh_token` equivale a uma senha de acesso ao seu Drive — nunca cole ele no chat comigo, nunca commite no GitHub.

### Erro comum: `error:1E08010C:DECODER routines::unsupported`

Significa que `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` não está num formato que o Node reconhece como chave válida — quase sempre é ter colado o valor **com as aspas do JSON incluídas**. Pra copiar certo:

1. Abra o `.json` da service account num editor de texto simples (Bloco de Notas serve).
2. Ache a linha `"private_key": "-----BEGIN PRIVATE KEY-----\n...==\n-----END PRIVATE KEY-----\n"`.
3. Copie **só o que está DENTRO das aspas** — comece a seleção logo depois do `"` que vem depois de `private_key":` e termine antes do `"` final da linha (antes da vírgula). Ou seja, copie começando em `-----BEGIN PRIVATE KEY-----` e terminando em `-----END PRIVATE KEY-----\n` — sem nenhuma aspa dupla `"` no início nem no fim.
4. Cole esse valor exato no campo da Vercel — os `\n` literais (barra + n) podem ficar como estão, o código já converte pra quebra de linha de verdade.

O código já foi ajustado pra tolerar aspas coladas por engano, mas se o erro persistir depois de conferir isso, o valor colado provavelmente está incompleto (faltando o `-----BEGIN` ou `-----END`).

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
