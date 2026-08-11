/** @type {import('next').NextConfig} */
const nextConfig = {
  // pptxgenjs (e afins) mexem com modulos nativos do Node de um jeito que
  // o bundler do Next as vezes nao consegue empacotar direito pra dentro
  // da funcao serverless -- marcando como "external" ele so faz
  // require() normal em tempo de execucao, sem tentar empacotar.
  experimental: {
    serverComponentsExternalPackages: ["pptxgenjs", "image-size", "exceljs"],
    // Por padrao o App Router guarda a pagina no cache do NAVEGADOR por 30s
    // depois de sair dela, mesmo em rota "force-dynamic" -- e um cache
    // separado do servidor, so pra navegacao voltar/avancar ser instantanea.
    // Era exatamente por isso que salvar uma acao, mudar de tela e voltar
    // (ou so voltar pra Apresentacao/Banco de Dados vindo de outra aba)
    // mostrava a versao de ANTES de salvar ate um F5 de verdade -- o F5
    // ignora esse cache, uma navegacao normal nao. Zerado: toda navegacao
    // entre paginas busca dado fresco de novo (o dado e pequeno, o custo
    // disso e irrelevante perto do problema que resolve).
    staleTimes: { dynamic: 0 },
  },
  // pptxgenjs agora tambem roda no NAVEGADOR (baixar apresentacao completa,
  // ver components/baixarDeck.js). O build do lado do cliente quebrava com
  // "UnhandledSchemeError: Reading from node:fs" porque o pacote tem um
  // `import('node:fs')` interno (so executado em runtime Node de verdade,
  // atras de um `if (isNode)` -- nunca roda no navegador, mas o webpack
  // precisa conseguir RESOLVER o import mesmo assim pra montar o bundle).
  // O campo "browser" do package.json do pptxgenjs ja mapeia "fs"/"https"
  // pra false, mas so bate com o nome exato "fs" -- nao com "node:fs" (o
  // prefixo de esquema muda como o webpack resolve o import). Solucao
  // padrao: tira o prefixo "node:" antes de resolver, e ai o fallback
  // (equivalente a um modulo vazio) entra em acao normalmente.
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, https: false };
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, "");
        })
      );
    }
    return config;
  },
};

export default nextConfig;
