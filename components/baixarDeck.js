"use client";

// Gera a apresentacao completa DENTRO DO NAVEGADOR.
//
// Por que nao no servidor: com as fotos reais da planilha o arquivo passa
// de 25 MB. Uma funcao serverless da Vercel tem teto de 4,5 MB de resposta
// e alguns segundos de execucao -- baixar ~100 fotos do Drive e devolver um
// arquivo desse tamanho nao cabe de jeito nenhum. Era exatamente por isso
// que o "baixar tudo" vinha sem foto: o codigo engolia o erro de cada foto
// e entregava o .pptx vazio de imagem.
//
// No navegador nao existe nenhum desses dois limites: as fotos vem pelo
// mesmo proxy que ja mostra elas na tela (/api/drive/file/[id], protegido
// pelo gate de senha), e o arquivo e montado e salvo localmente.

import { setupPresentation, buildDeck } from "../lib/pptSlides";

// converte o blob da foto em data URI + descobre largura/altura reais
// (precisa das duas coisas: o data URI pro pptxgenjs, as dimensoes pra nao
// distorcer a imagem dentro da caixa do slide)
async function blobParaFoto(blob) {
  // dimensoes: medidas por object URL (o navegador le direto do blob) em vez
  // de jogar o data URI inteiro no src -- com foto de 10 MB isso evita
  // segurar uma string de ~13 MB so pra descobrir largura e altura
  const objectUrl = URL.createObjectURL(blob);
  let dimensoes;
  try {
    dimensoes = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("imagem inválida"));
      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("falha lendo a foto"));
    reader.readAsDataURL(blob);
  });

  return {
    // pptxgenjs quer "image/png;base64,..." -- sem o prefixo "data:"
    data: String(dataUrl).replace(/^data:/, ""),
    width: dimensoes.width,
    height: dimensoes.height,
  };
}

export async function baixarApresentacaoCompleta(acoes, onProgress) {
  // import dinamico: pptxgenjs tem ~1 MB, nao faz sentido carregar isso no
  // bundle inicial de quem so quer ver os slides na tela
  const { default: PptxGenJS } = await import("pptxgenjs");

  // uma foto usada em duas acoes so e baixada uma vez
  const cache = new Map();

  async function loadPhoto(fileId) {
    if (cache.has(fileId)) return cache.get(fileId);
    let resultado = null;
    try {
      const res = await fetch(`/api/drive/file/${fileId}`);
      if (res.ok) {
        resultado = await blobParaFoto(await res.blob());
      }
    } catch (e) {
      resultado = null; // foto apagada no Drive por fora nao derruba o deck
    }
    cache.set(fileId, resultado);
    return resultado;
  }

  const pptx = setupPresentation(new PptxGenJS());
  await buildDeck(pptx, acoes, loadPhoto, onProgress);

  const nome = `Improvement_List_${new Date().toISOString().slice(0, 10)}.pptx`;
  await pptx.writeFile({ fileName: nome });
  return nome;
}
