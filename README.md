# (Hisense) Improvement List — site

Site que substitui o par Excel + PPT por 3 telas: **Apresentação** (o slide de cada ação), **Banco de Dados** (a tabela editável) e **Dashboard** (calculado ao vivo).

## Estado atual: Fase 2 — Google Sheets e Drive conectados, PPT ainda pendente

O que já funciona de verdade (não é mais mock):
- As 3 telas, com a marca Multilaser, protegidas por senha única, com seletor de idioma (PT/EN/ZH) e tema claro/escuro/sistema no topbar.
- **Dado ao vivo do Google Sheets** — Apresentação, Banco de Dados e Dashboard leem direto da planilha a cada carregamento, sem cache/JSON estático.
- **Edição na tabela grava de verdade no Sheets** — mudar Item/Departamento/Responsável/Prazo na tela de Banco de Dados escreve na célula certa da planilha (com indicador visual de salvando/salvo/erro).
- Modo "Apresentar" agora usa a Fullscreen API de verdade do navegador (antes era só uma camada por cima da página).
- "Abrir no Google Sheets" já linka pra planilha real.
- Layout responsivo pra celular/tablet.
- **Upload E exclusão de foto pro Drive** — funcionando (corrigido bug de cache que fazia foto apagada no Drive continuar aparecendo no site).
- **Editor completo de ação** — clique no nº da ação (Banco de Dados) ou no botão flutuante "Editar ação" (Apresentação) abre um painel com TODOS os campos editáveis: Geral (item, depto, responsável, auditor, processo, datas, status incl. fechar ação, motivo de atraso), Descrição do documento (Description/Expectation/Abrangency/comentários), Investimento (edita item, quantidade, custo, fornecedor, aprovação, etapa de cada item já lançado — adicionar item novo ainda não).
- **Target calculado** — deixou de ser um campo manual; agora é `sem investimento OU investimento aprovado OU já fechada`, calculado ao vivo e mostrado no Dashboard (não mais um texto solto no slide).
- **Dashboard com abas** — Principal / Investimentos (aprovado vs. recusado vs. pendente, quem precisa de investimento) / Forecast (previsão de fechamento por semana, calculado ao vivo a partir do prazo).

O que ainda **não** está pronto (mockups em [proposta_fase3](https://claude.ai/code/artifact/73ff86e7-3ecc-4506-ae91-c9ed06c3d263)):
- **Botão "Baixar PPT"** — ainda mostra um aviso em vez de gerar o arquivo (modelo do slide ainda no layout antigo).
- **Baixar apresentação completa** (capa + divisores + encerramento, como o master deck original).
- **Mover/redimensionar foto** dentro do slide (hoje sempre preenche a caixa toda, cortando o excesso).
- **Selo "NEW"** em ações recém-criadas.
- "+ Nova ação" (criar uma ação nova direto pelo site) — Investimento (adicionar item novo, hoje só edita os existentes).

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
