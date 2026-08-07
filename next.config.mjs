/** @type {import('next').NextConfig} */
const nextConfig = {
  // pptxgenjs (e afins) mexem com modulos nativos do Node de um jeito que
  // o bundler do Next as vezes nao consegue empacotar direito pra dentro
  // da funcao serverless -- marcando como "external" ele so faz
  // require() normal em tempo de execucao, sem tentar empacotar.
  experimental: {
    serverComponentsExternalPackages: ["pptxgenjs", "image-size"],
  },
};

export default nextConfig;
