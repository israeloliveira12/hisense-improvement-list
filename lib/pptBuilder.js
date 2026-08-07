// Modulo SERVIDOR -- gera .pptx no layout novo (o mesmo da tela
// Apresentacao), usando pptxgenjs -- puro Node, sem precisar de funcao
// serverless Python separada. Decisao tomada de proposito: o template
// Python antigo (gerador_slides/) esta no layout ANTIGO (14 tabelas) e
// teria que ser reconstruido do zero de qualquer jeito pra bater com o
// design novo -- entao nao ha vantagem real em reusar Python aqui, e
// ficar em Node evita um runtime separado que eu nao consigo testar
// neste ambiente.
import PptxGenJS from "pptxgenjs";
import { imageSize } from "image-size";
import { getFileStream } from "./googleDrive";

const PURPLE = "5000BF";
const PURPLE_DARK = "3A008C";
const BLUE = "004EDB";
const GREEN = "1E8E3E";
const AMBER = "B4680A";
const GRAY_BOX = "F4F3F8";
const TEXT_DARK = "17151F";
const BORDER_LIGHT = "ECEAF4";
const LAYOUT_NAME = "HISENSE";

function newPresentation() {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: LAYOUT_NAME, width: 13.333, height: 7.5 });
  pptx.layout = LAYOUT_NAME;
  return pptx;
}

async function writeBuffer(pptx) {
  const buffer = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

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

// Encaixa a foto preservando proporcao (sem distorcer), centralizada na
// caixa -- v1 nao reaproveita o zoom/posicao configurado no site, so
// evita esticar a imagem.
async function addPhoto(slide, fileId, x, y, w, h) {
  if (!fileId) return;
  try {
    const buffer = await bufferFromFileId(fileId);
    const { width, height, type } = imageSize(buffer);
    if (!width || !height) return;
    const mime = mimeFromType(type);
    const data = `image/${mime};base64,${buffer.toString("base64")}`;

    const boxRatio = w / h;
    const imgRatio = width / height;
    let drawW = w,
      drawH = h;
    if (imgRatio > boxRatio) {
      drawH = w / imgRatio;
    } else {
      drawW = h * imgRatio;
    }
    const offX = (w - drawW) / 2;
    const offY = (h - drawH) / 2;
    slide.addImage({ data, x: x + offX, y: y + offY, w: drawW, h: drawH });
  } catch (e) {
    // foto pode ter sido apagada no Drive por fora -- nao trava a geracao do slide todo por isso
  }
}

// --- 1 slide de detalhe de acao -------------------------------------------
export function addActionSlide(pptx, acao) {
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };

  slide.addShape("rect", { x: 0, y: 0, w: 13.333, h: 1.02, fill: { color: PURPLE }, line: { type: "none" } });
  slide.addShape("ellipse", { x: 0.28, y: 0.17, w: 0.68, h: 0.68, fill: { color: "FFFFFF" }, line: { type: "none" } });
  slide.addText(String(acao.no), {
    x: 0.28, y: 0.17, w: 0.68, h: 0.68, align: "center", valign: "middle",
    fontSize: 11, bold: true, color: PURPLE, fontFace: "Arial",
  });
  slide.addText((acao.item || "").toUpperCase(), {
    x: 1.15, y: 0.15, w: 9.9, h: 0.42, fontSize: 17, bold: true, color: "FFFFFF", fontFace: "Arial",
  });
  const sub = [acao.dept, acao.auditor ? `Auditor: ${acao.auditor}` : ""].filter(Boolean).join("  ·  ");
  slide.addText(sub, { x: 1.15, y: 0.58, w: 9.9, h: 0.3, fontSize: 10, color: "DCCFF6", fontFace: "Arial" });

  const isClosed = acao.status === "closed";
  slide.addShape("roundRect", {
    x: 11.35, y: 0.28, w: 1.7, h: 0.42, rectRadius: 0.1,
    fill: { color: isClosed ? GREEN : AMBER }, line: { type: "none" },
  });
  slide.addText(isClosed ? "CLOSED" : "OPEN", {
    x: 11.35, y: 0.28, w: 1.7, h: 0.42, align: "center", valign: "middle",
    fontSize: 11, bold: true, color: "FFFFFF", fontFace: "Arial",
  });

  const metaY = 1.12;
  const metaCols = [
    ["PERSON IN CHARGE", `${acao.person || "—"}${acao.dept ? ` (${acao.dept})` : ""}`],
    ["OCCUR. DATE", acao.occur || "—"],
    ["DEADLINE", acao.deadline || "—"],
    ["INVESTMENT", acao.investment || "—"],
  ];
  const metaColW = 13.333 / 4;
  metaCols.forEach(([label, value], i) => {
    const x = 0.35 + i * metaColW;
    slide.addText(label, { x, y: metaY, w: metaColW - 0.3, h: 0.18, fontSize: 7, bold: true, color: BLUE, fontFace: "Arial" });
    slide.addText(value, { x, y: metaY + 0.18, w: metaColW - 0.3, h: 0.28, fontSize: 10, bold: true, color: TEXT_DARK, fontFace: "Arial" });
  });
  slide.addShape("line", { x: 0.05, y: metaY + 0.5, w: 13.23, h: 0, line: { color: BORDER_LIGHT, width: 1 } });

  const descY = metaY + 0.62;
  const descH = 0.88;
  const descCols = [
    ["DESCRIPTION", acao.description, 6.15],
    ["EXPECTATION", acao.expectation, 3.35],
    ["ABRANGENCY", acao.abrangency, 3.35],
  ];
  let cx = 0.35;
  descCols.forEach(([label, text, w]) => {
    slide.addText(label, { x: cx, y: descY, w, h: 0.2, fontSize: 8, bold: true, color: PURPLE, fontFace: "Arial" });
    slide.addShape("rect", { x: cx, y: descY + 0.2, w, h: descH - 0.2, fill: { color: GRAY_BOX }, line: { type: "none" } });
    slide.addText(text || "—", {
      x: cx + 0.1, y: descY + 0.25, w: w - 0.2, h: descH - 0.3,
      fontSize: 9, color: TEXT_DARK, valign: "top", fontFace: "Arial",
    });
    cx += w + 0.12;
  });

  const planY = descY + descH + 0.16;
  slide.addText("ACTION PLAN", { x: 0.35, y: planY, w: 4, h: 0.2, fontSize: 8, bold: true, color: PURPLE, fontFace: "Arial" });
  const steps = acao.steps && acao.steps.length ? acao.steps.slice(0, 4) : [["1", "—", "—", "—", "—"]];
  const headerStyle = { bold: true, color: "FFFFFF", fill: { color: PURPLE }, fontSize: 8, fontFace: "Arial" };
  const headerRow = ["#", "Action", "Owner", "Due", "Status"].map((text) => ({ text, options: headerStyle }));
  const bodyRows = steps.map((st) =>
    st.map((v, i) => ({
      text: String(v || ""),
      options: {
        fontSize: 8, fill: { color: GRAY_BOX }, fontFace: "Arial",
        color: i === 4 ? GREEN : TEXT_DARK, bold: i === 4,
        align: i === 0 ? "center" : i >= 2 ? "center" : "left",
      },
    }))
  );
  const tableY = planY + 0.22;
  const ROW_H = 0.26;
  slide.addTable([headerRow, ...bodyRows], {
    x: 0.35, y: tableY, w: 12.63,
    colW: [0.5, 7.63, 1.8, 1.2, 1.5],
    rowH: ROW_H,
    border: { type: "solid", color: "FFFFFF", pt: 1.5 },
    autoPage: false,
    fontFace: "Arial",
  });

  const tableH = ROW_H * (bodyRows.length + 1);
  const bandY = tableY + tableH + 0.1;
  slide.addShape("rect", { x: 0, y: bandY, w: 13.333, h: 0.3, fill: { color: BLUE }, line: { type: "none" } });
  slide.addText("BEFORE", { x: 0.35, y: bandY, w: 6.3, h: 0.3, fontSize: 10, bold: true, color: "FFFFFF", valign: "middle", fontFace: "Arial" });
  slide.addText("AFTER", { x: 6.65, y: bandY, w: 6.3, h: 0.3, fontSize: 10, bold: true, color: "FFFFFF", valign: "middle", fontFace: "Arial" });

  const photoY = bandY + 0.38;
  const photoH = Math.max(1.3, 7.15 - photoY);
  return Promise.all([
    addPhoto(slide, acao.fotoBeforeId, 0.35, photoY, 6.0, photoH),
    addPhoto(slide, acao.fotoImprovementId, 6.65, photoY, 6.0, photoH),
  ]);
}

// --- capa / divisor / encerramento -----------------------------------------
function addCoverSlide(pptx, { total, geradoEm }) {
  const slide = pptx.addSlide();
  slide.background = { color: PURPLE_DARK };
  slide.addShape("roundRect", {
    x: 0.5, y: 0.55, w: 3.6, h: 0.4, rectRadius: 0.2,
    fill: { color: "FFFFFF", transparency: 85 }, line: { color: "FFFFFF", width: 0.75, transparency: 70 },
  });
  slide.addText("IMPROVEMENT LIST · 2026", {
    x: 0.5, y: 0.55, w: 3.6, h: 0.4, align: "center", valign: "middle",
    fontSize: 10, bold: true, color: "FFFFFF", fontFace: "Arial",
  });
  slide.addText("Performance Improvement Actions", {
    x: 0.5, y: 2.6, w: 10, h: 1, fontSize: 34, bold: true, color: "FFFFFF", fontFace: "Arial",
  });
  slide.addText(
    "Following recent assessments, Hisense shared valuable insights to strengthen the performance and competitiveness of Multi's Manaus facility.",
    { x: 0.5, y: 3.65, w: 8, h: 0.8, fontSize: 13, color: "DCCFF6", fontFace: "Arial", valign: "top" }
  );
  slide.addText(`${total} ações · gerado em ${geradoEm}`, {
    x: 0.5, y: 6.9, w: 8, h: 0.3, fontSize: 10.5, color: "B9A6E8", fontFace: "Arial",
  });
}

function addDividerSlide(pptx, titulo, contagem) {
  const slide = pptx.addSlide();
  slide.background = { color: PURPLE_DARK };
  slide.addText(titulo, {
    x: 0.8, y: 3.15, w: 11.7, h: 0.9, align: "center", fontSize: 26, bold: true, color: "FFFFFF", fontFace: "Arial",
  });
  if (contagem !== undefined) {
    slide.addText(`${contagem} ações`, {
      x: 0.8, y: 4.05, w: 11.7, h: 0.4, align: "center", fontSize: 12, color: "DCCFF6", fontFace: "Arial",
    });
  }
}

function addClosingSlide(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: PURPLE_DARK };
  slide.addText("Thank You!", {
    x: 0.8, y: 3.3, w: 11.7, h: 0.9, align: "center", fontSize: 32, bold: true, color: "FFFFFF", fontFace: "Arial",
  });
}

// --- pontos de entrada ------------------------------------------------------
export async function buildActionPptx(acao) {
  const pptx = newPresentation();
  await addActionSlide(pptx, acao);
  return writeBuffer(pptx);
}

// Deck completo: capa -> divisor "com investimento" -> essas acoes ->
// divisor "sem investimento" -> essas acoes -> encerramento. Gera as
// fotos de todas as acoes em sequencia (nao em paralelo) de proposito --
// evita estourar limite de chamadas simultaneas na API do Drive quando
// tem muita foto.
export async function buildMasterPptx(acoes) {
  const pptx = newPresentation();
  const comInvestimento = acoes.filter((a) => a.investmentFlag === "yes");
  const semInvestimento = acoes.filter((a) => a.investmentFlag !== "yes");
  const geradoEm = new Date().toLocaleDateString("pt-BR");

  addCoverSlide(pptx, { total: acoes.length, geradoEm });

  addDividerSlide(pptx, "Action Plan (Investment)", comInvestimento.length);
  for (const acao of comInvestimento) {
    await addActionSlide(pptx, acao);
  }

  addDividerSlide(pptx, "Action Plan (No Investment)", semInvestimento.length);
  for (const acao of semInvestimento) {
    await addActionSlide(pptx, acao);
  }

  addClosingSlide(pptx);

  return writeBuffer(pptx);
}
