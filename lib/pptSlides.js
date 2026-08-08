// Modulo ISOMORFICO -- so desenha os slides, roda igual no servidor e no
// navegador. Nao importa NADA de servidor aqui (nem googleDrive, nem
// image-size): quem chama passa um `loadPhoto(fileId)` que sabe buscar a
// imagem no ambiente dele. E isso que permite gerar o deck completo dentro
// do navegador -- ver components/baixarDeck.js pro motivo (limite de
// resposta e de tempo da funcao serverless da Vercel).

const PURPLE = "5000BF";
const PURPLE_DARK = "3A008C";
const BLUE = "004EDB";
const GREEN = "1E8E3E";
const AMBER = "B4680A";
const GRAY_BOX = "F4F3F8";
const TEXT_DARK = "17151F";
const BORDER_LIGHT = "ECEAF4";
export const LAYOUT_NAME = "HISENSE";

export function setupPresentation(pptx) {
  pptx.defineLayout({ name: LAYOUT_NAME, width: 13.333, height: 7.5 });
  pptx.layout = LAYOUT_NAME;
  return pptx;
}

// Encaixa a foto preservando proporcao (sem distorcer), centralizada na
// caixa -- nao reaproveita o zoom/posicao configurado no site, so evita
// esticar a imagem.
async function addPhoto(slide, fileId, x, y, w, h, loadPhoto) {
  if (!fileId || !loadPhoto) return;
  const foto = await loadPhoto(fileId); // { data, width, height } ou null
  if (!foto || !foto.data || !foto.width || !foto.height) return;

  const boxRatio = w / h;
  const imgRatio = foto.width / foto.height;
  let drawW = w;
  let drawH = h;
  if (imgRatio > boxRatio) {
    drawH = w / imgRatio;
  } else {
    drawW = h * imgRatio;
  }
  slide.addImage({
    data: foto.data,
    x: x + (w - drawW) / 2,
    y: y + (h - drawH) / 2,
    w: drawW,
    h: drawH,
  });
}

// Desenha TODAS as fotos de um lado (Before ou After), nao so a principal --
// os 2 primeiros IDs da lista sao as "principais" (lado a lado, grandes,
// ocupando a altura toda quando nao ha mais nenhuma foto), o resto vira uma
// fileira de miniaturas embaixo. Mesma ordem que o site mostra.
async function addPhotoGroup(slide, ids, x, y, w, h, loadPhoto) {
  const lista = (ids || []).filter(Boolean);
  if (!lista.length) return;

  const principais = lista.slice(0, 2);
  const extras = lista.slice(2);
  const gap = 0.06;

  const alturaPrincipais = extras.length ? h - Math.min(h * 0.32, 1.1) - gap : h;

  const nP = principais.length;
  const boxWP = (w - gap * (nP - 1)) / nP;
  for (let i = 0; i < nP; i++) {
    await addPhoto(slide, principais[i], x + i * (boxWP + gap), y, boxWP, alturaPrincipais, loadPhoto);
  }

  if (!extras.length) return;

  const alturaExtras = h - alturaPrincipais - gap;
  const yExtras = y + alturaPrincipais + gap;
  const nE = extras.length;
  const boxWE = (w - gap * (nE - 1)) / nE;
  for (let i = 0; i < nE; i++) {
    await addPhoto(slide, extras[i], x + i * (boxWE + gap), yExtras, boxWE, alturaExtras, loadPhoto);
  }
}

// --- 1 slide de detalhe de acao -------------------------------------------
export async function addActionSlide(pptx, acao, loadPhoto) {
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
  slide.addText(acao.process || "", { x: 1.15, y: 0.58, w: 9.9, h: 0.3, fontSize: 10, color: "DCCFF6", fontFace: "Arial" });

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
    ["ACTION LEADER", `${acao.person || "—"}${acao.dept ? ` (${acao.dept})` : ""}`],
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
  // ate 10 passos (limite tambem aplicado na hora de adicionar, no
  // editor) -- a tabela cresce e a zona de foto abaixo encolhe pra
  // compensar (ver calculo de photoH mais abaixo, ja e dinamico).
  const steps = acao.steps && acao.steps.length ? acao.steps.slice(0, 10) : [["1", "—", "—", "—", "—"]];
  const headerRow = ["#", "Action", "Owner", "Date", "Status"].map((text, i) => ({
    text,
    options: {
      bold: true, color: "FFFFFF", fill: { color: PURPLE }, fontSize: 8, fontFace: "Arial",
      align: i === 1 ? "left" : "center",
    },
  }));
  const bodyRows = steps.map((st) =>
    st.map((v, i) => {
      const isStatus = i === 4;
      const isClosed = isStatus && String(v || "").trim().toUpperCase() === "CLOSED";
      return {
        text: String(v || ""),
        options: {
          fontSize: 8, fill: { color: GRAY_BOX }, fontFace: "Arial",
          color: isStatus ? (isClosed ? GREEN : AMBER) : TEXT_DARK, bold: isStatus,
          align: i === 0 ? "center" : i >= 2 ? "center" : "left",
        },
      };
    })
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
  slide.addText("BEFORE", { x: 0.35, y: bandY, w: 6.3, h: 0.3, align: "center", fontSize: 10, bold: true, color: "FFFFFF", valign: "middle", fontFace: "Arial" });
  slide.addText("AFTER", { x: 6.65, y: bandY, w: 6.3, h: 0.3, align: "center", fontSize: 10, bold: true, color: "FFFFFF", valign: "middle", fontFace: "Arial" });

  // reserva uma faixa fixa embaixo pra legenda (Factory/Hisense Comment) --
  // sem isso a foto tomava o espaco todo e o comentario nunca aparecia no
  // arquivo baixado (aparecia so na tela). Calculo garante que, mesmo no
  // pior caso (10 passos, tabela alta), a legenda nunca passa do limite
  // fisico do slide (7.5in) -- prioriza a legenda cabendo inteira sobre a
  // foto ficar grande.
  const captionH = 0.45;
  const photoY = bandY + 0.36;
  const maxBottom = 7.5 - 0.08;
  const photoH = Math.max(0.4, maxBottom - photoY - 0.06 - captionH);
  const captionY = photoY + photoH + 0.06;

  slide.addText([
    { text: "FACTORY COMMENT\n", options: { bold: true, fontSize: 6.5, color: TEXT_DARK } },
    { text: acao.factory || "—", options: { fontSize: 7, italic: true, color: "6B6878" } },
  ], { x: 0.35, y: captionY, w: 6.0, h: captionH, fontFace: "Arial", valign: "top" });
  slide.addText([
    { text: "HISENSE COMMENT\n", options: { bold: true, fontSize: 6.5, color: TEXT_DARK } },
    { text: acao.hisense || "—", options: { fontSize: 7, italic: true, color: "6B6878" } },
  ], { x: 6.65, y: captionY, w: 6.0, h: captionH, fontFace: "Arial", valign: "top" });

  await addPhotoGroup(slide, acao.fotosBefore, 0.35, photoY, 6.0, photoH, loadPhoto);
  await addPhotoGroup(slide, acao.fotosImprovement, 6.65, photoY, 6.0, photoH, loadPhoto);
}

// --- capa / divisor / encerramento -----------------------------------------
export function addCoverSlide(pptx, { geradoEm }) {
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
  slide.addText(geradoEm, {
    x: 0.5, y: 6.9, w: 8, h: 0.3, fontSize: 10.5, color: "B9A6E8", fontFace: "Arial",
  });
}

export function addDividerSlide(pptx, titulo, contagem) {
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

export function addClosingSlide(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: PURPLE_DARK };
  slide.addText("Thank You!", {
    x: 0.8, y: 3.3, w: 11.7, h: 0.9, align: "center", fontSize: 32, bold: true, color: "FFFFFF", fontFace: "Arial",
  });
}

// Deck completo: capa -> divisor "com investimento" -> essas acoes ->
// divisor "sem investimento" -> essas acoes -> encerramento.
// `onProgress(feito, total)` e opcional -- usado pela barra de progresso no
// navegador, ja que gerar 60+ slides com foto leva alguns segundos.
export async function buildDeck(pptx, acoes, loadPhoto, onProgress) {
  const comInvestimento = acoes.filter((a) => a.investmentFlag === "yes");
  const semInvestimento = acoes.filter((a) => a.investmentFlag !== "yes");
  const geradoEm = new Date().toLocaleDateString("pt-BR");

  addCoverSlide(pptx, { geradoEm });

  let feito = 0;
  const total = acoes.length;

  addDividerSlide(pptx, "Action Plan (Investment)", comInvestimento.length);
  for (const acao of comInvestimento) {
    await addActionSlide(pptx, acao, loadPhoto);
    if (onProgress) onProgress(++feito, total);
  }

  addDividerSlide(pptx, "Action Plan (No Investment)", semInvestimento.length);
  for (const acao of semInvestimento) {
    await addActionSlide(pptx, acao, loadPhoto);
    if (onProgress) onProgress(++feito, total);
  }

  addClosingSlide(pptx);
  return pptx;
}
