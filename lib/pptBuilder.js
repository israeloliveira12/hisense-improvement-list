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

// So estes 3 formatos podem entrar num .pptx. O pptxgenjs nomeia o arquivo
// interno de midia a partir deste MIME (image/png -> ppt/media/imageN.png),
// e o OOXML nao aceita webp/avif/heic -- o PowerPoint abre pedindo reparo e
// o reparo descarta o slide inteiro. "webp" ESTAVA nesta lista e era
// exatamente por isso que alguns slides vinham em branco.
// Aqui no servidor nao da pra reconverter (sem canvas/sharp), entao foto de
// formato exotico e simplesmente pulada: slide sem uma foto e muito melhor
// que um arquivo que nao abre. No deck completo, que e montado no
// navegador, essas fotos sao reconvertidas e aparecem normalmente
// (ver components/baixarDeck.js).
const TIPOS_ACEITOS = { jpg: "jpeg", jpeg: "jpeg", png: "png", gif: "gif" };

// Loader de foto no formato que pptSlides espera. Devolve null (em vez de
// estourar) quando a foto sumiu do Drive por fora -- uma foto faltando nao
// pode derrubar a geracao do slide inteiro.
async function loadPhotoNode(fileId) {
  try {
    const buffer = await bufferFromFileId(fileId);
    const { width, height, type } = imageSize(buffer);
    if (!width || !height) return null;
    const mime = TIPOS_ACEITOS[String(type || "").toLowerCase()];
    if (!mime) return null;
    return {
      data: `image/${mime};base64,${buffer.toString("base64")}`,
      width,
      height,
    };
  } catch (e) {
    return null;
  }
}

export async function buildActionPptx(acao, lang = "en") {
  const pptx = setupPresentation(new PptxGenJS());
  await addActionSlide(pptx, acao, loadPhotoNode, lang);
  const buffer = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}
