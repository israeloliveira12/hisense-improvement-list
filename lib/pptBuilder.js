// Modulo SERVIDOR -- gera o .pptx de UMA acao (rota /api/ppt/[no]).
// O desenho dos slides em si mora em lib/pptSlides.js (isomorfico); aqui so
// mora o que e especifico de Node: buscar a foto no Drive e medir o tamanho
// dela com image-size.
//
// O deck COMPLETO ("baixar tudo") NAO passa mais por aqui -- ele e montado
// dentro do navegador (components/baixarDeck.js). Motivo concreto: com as
// fotos reais da planilha, o arquivo passa de 25 MB, e uma funcao
// serverless da Vercel nao consegue devolver uma resposta desse tamanho
// (teto de 4,5 MB) nem baixar ~100 fotos dentro do tempo limite. No
// navegador nao existe nenhum desses dois tetos.
import PptxGenJS from "pptxgenjs";
import { imageSize } from "image-size";
import { getFileStream } from "./googleDrive";
import { setupPresentation, addActionSlide } from "./pptSlides";

async function bufferFromFileId(fileId) {
  const stream = await getFileStream(fileId);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function mimeFromType(type) {
  const map = { jpg: "jpeg", jpeg: "jpeg", png: "png", gif: "gif", webp: "webp" };
  return map[type] || "jpeg";
}

// Loader de foto no formato que pptSlides espera. Devolve null (em vez de
// estourar) quando a foto sumiu do Drive por fora -- uma foto faltando nao
// pode derrubar a geracao do slide inteiro.
async function loadPhotoNode(fileId) {
  try {
    const buffer = await bufferFromFileId(fileId);
    const { width, height, type } = imageSize(buffer);
    if (!width || !height) return null;
    return {
      data: `image/${mimeFromType(type)};base64,${buffer.toString("base64")}`,
      width,
      height,
    };
  } catch (e) {
    return null;
  }
}

export async function buildActionPptx(acao) {
  const pptx = setupPresentation(new PptxGenJS());
  await addActionSlide(pptx, acao, loadPhotoNode);
  const buffer = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}
