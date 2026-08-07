// Modulo SERVIDOR -- gera o .pptx de 1 acao no layout novo (o mesmo da
// tela Apresentacao), usando pptxgenjs -- puro Node, sem precisar de
// funcao serverless Python separada. Decisao tomada de proposito: o
// template Python antigo (gerador_slides/) esta no layout ANTIGO (14
// tabelas) e teria que ser reconstruido do zero de qualquer jeito pra
// bater com o design novo -- entao nao ha vantagem real em reusar Python
// aqui, e ficar em Node evita um runtime separado que eu nao consigo
// testar neste ambiente.
import PptxGenJS from "pptxgenjs";
import { imageSize } from "image-size";
import { getFileStream } from "./googleDrive";

const PURPLE = "5000BF";
const BLUE = "004EDB";
const GREEN = "1E8E3E";
const AMBER = "B4680A";
const GRAY_BOX = "F4F3F8";
const TEXT_DARK = "17151F";
const BORDER_LIGHT = "ECEAF4";

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
// caixa -- v1 nao reaproveita o zoom/posicao configurado no site (ver
// CLAUDE.md), so evita esticar a imagem.
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

export async function buildActionPptx(acao) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "HISENSE", width: 13.333, height: 7.5 });
  pptx.layout = "HISENSE";
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };

  // --- header ---
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

  // --- meta strip ---
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

  // --- description row ---
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

  // --- action plan ---
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
    rowH: ROW_H, // fixo -- addTable auto-dimensiona por conteudo senao, e o calculo de tableH abaixo ficaria errado
    border: { type: "solid", color: "FFFFFF", pt: 1.5 },
    autoPage: false,
    fontFace: "Arial",
  });

  // --- before/after ---
  const tableH = ROW_H * (bodyRows.length + 1);
  const bandY = tableY + tableH + 0.1;
  slide.addShape("rect", { x: 0, y: bandY, w: 13.333, h: 0.3, fill: { color: BLUE }, line: { type: "none" } });
  slide.addText("BEFORE", { x: 0.35, y: bandY, w: 6.3, h: 0.3, fontSize: 10, bold: true, color: "FFFFFF", valign: "middle", fontFace: "Arial" });
  slide.addText("AFTER", { x: 6.65, y: bandY, w: 6.3, h: 0.3, fontSize: 10, bold: true, color: "FFFFFF", valign: "middle", fontFace: "Arial" });

  const photoY = bandY + 0.38;
  const photoH = Math.max(1.3, 7.15 - photoY);
  await addPhoto(slide, acao.fotoBeforeId, 0.35, photoY, 6.0, photoH);
  await addPhoto(slide, acao.fotoImprovementId, 6.65, photoY, 6.0, photoH);

  const buffer = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}
