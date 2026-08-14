// Modulo ISOMORFICO -- so desenha os slides, roda igual no servidor e no
// navegador. Nao importa NADA de servidor aqui (nem googleDrive, nem
// image-size): quem chama passa um `loadPhoto(fileId)` que sabe buscar a
// imagem no ambiente dele. E isso que permite gerar o deck completo dentro
// do navegador -- ver components/baixarDeck.js pro motivo (limite de
// resposta e de tempo da funcao serverless da Vercel).
//
// Idioma: o deck baixado ACOMPANHA o idioma escolhido na tela (pedido
// explicito do usuario -- antes ficava sempre em ingles, decisao revertida
// nesta sessao). `s(lang, chave)`/`sv(lang, valor)` sao as versoes de
// t()/tv() de lib/i18n.js que recebem o idioma como parametro em vez de ler
// de um React Context (este modulo roda fora de componente, inclusive no
// servidor, onde nao ha Context nenhum).
// Importa de i18nCore (nao de i18n): i18n.js tem "use client", e importar
// dele aqui fazia `translate` chegar no SERVIDOR como referencia de
// cliente em vez de funcao -- ver o comentario no topo de i18nCore.js.
import { translate as s, translateValue as sv, formatDateISO } from "./i18nCore";

const PURPLE = "5000BF";
const PURPLE_DARK = "3A008C";
const BLUE = "004EDB";
const GREEN = "1E8E3E";
const AMBER = "B4680A";
const RED = "C62828";
const GRAY_BOX = "F4F3F8";
const TEXT_DARK = "17151F";
const BORDER_LIGHT = "ECEAF4";
// Mesmas cores de "fundo tintado" que a tela usa nos chips de Aberta/Fechada
// (var(--green-tint)/var(--amber-tint) em app/globals.css) -- usadas nos
// slides de dashboard pra chegar o mais perto possivel do visual real.
const GREEN_TINT = "E7F5EC";
const AMBER_TINT = "FBF0E1";
const BG_LIGHT = "FAFAFC"; // var(--bg) da tela -- fundo do cabecalho de tabela
const TEXT_MUTED = "6B6878"; // var(--text-muted) da tela
export const LAYOUT_NAME = "HISENSE";

// TODO texto que sai da planilha passa por aqui antes de virar XML.
// O .pptx e um zip de XML 1.0, e XML 1.0 NAO ACEITA a maioria dos
// caracteres de controle -- nem escapados. Um unico byte desses no meio de
// uma Description faz o PowerPoint abrir com "o arquivo precisa de reparo"
// e, no reparo, DESCARTAR o slide inteiro (um dos motivos dos slides em
// branco). O conteudo da planilha tem historico de sujeira desse tipo
// (texto traduzido de/para chines, colado de outros sistemas).
// Escrito com codigos numericos, sem escapes \\u no fonte, de proposito:
// um literal de regex com esses caracteres crus corromperia este arquivo.
// TAB (9), LF (10) e CR (13) sao validos em XML e ficam.
function txt(v) {
  if (v === null || v === undefined) return "";
  let out = "";
  for (const ch of String(v)) {
    const c = ch.codePointAt(0);
    if (c > 0xffff) { out += ch; continue; } // par substituto completo (emoji) -- valido
    if (c >= 0xd800 && c <= 0xdfff) continue; // substituto orfao -- invalida o XML
    if (c <= 8 || c === 11 || c === 12 || (c >= 14 && c <= 31)) continue;
    if (c >= 127 && c <= 159) continue;
    if (c === 0xfffe || c === 0xffff) continue;
    out += ch;
  }
  return out;
}

// Data ISO -> formato do idioma, ja passando pelo sanitizador de XML.
function dt(iso, lang) {
  return txt(formatDateISO(txt(iso), lang));
}

// pptxgenjs nao mede texto antes de desenhar -- quem quebra linha de
// verdade e o PowerPoint, na hora de abrir o arquivo. Pra reservar espaco
// suficiente pro resto do slide (banda Before/After, legendas, fotos)
// precisamos ESTIMAR, antes de desenhar, quantas linhas um texto vai
// ocupar dentro da largura da coluna -- senao a tabela do plano de acao
// (que cresce quando alguem digita um passo com paragrafo/texto longo)
// fica mais alta do que o espaco reservado, e o resto do slide (banda
// Before/After) acaba desenhado por CIMA da tabela em vez de ser
// empurrado pra baixo. Conta paragrafos reais (\n, de quem "pulou
// paragrafo" digitando) + estima o wrap de cada paragrafo pelo
// comprimento -- de proposito generoso (superestimar linhas so deixa a
// foto um pouco menor; subestimar e que causa sobreposicao de novo).
function estimarLinhas(texto, colWIn, fontSizePt) {
  const limpo = String(texto || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const paragrafos = limpo.split("\n");
  const CHARS_POR_POL_POR_PT = 130; // Arial, conservador de proposito
  const larguraUtil = Math.max(0.3, colWIn - 0.2); // desconta padding interno da celula
  const charsPorLinha = Math.max(8, Math.floor((larguraUtil * CHARS_POR_POL_POR_PT) / fontSizePt));
  let linhas = 0;
  paragrafos.forEach((p) => {
    linhas += Math.max(1, Math.ceil(p.length / charsPorLinha));
  });
  return Math.max(1, linhas);
}

export function setupPresentation(pptx) {
  pptx.defineLayout({ name: LAYOUT_NAME, width: 13.333, height: 7.5 });
  pptx.layout = LAYOUT_NAME;
  return pptx;
}

// Busca e mede uma foto -- devolve a proporcao EFETIVA (ja considerando
// rotacao: girada 90/270, largura e altura trocam de papel pro layout,
// mesmo a imagem original continuando a mesma). null se a foto sumiu/nao
// carregou, pra addPhotoGroup pular ela sem quebrar o layout das outras.
// Video nao tem thumbnail real (nao da pra gerar sem processar o arquivo
// no servidor) -- usa uma proporcao padrao 16:9 pro layout e vira
// placeholder na hora de desenhar (ver desenharFotoNaCaixa).
async function medirFoto(fileId, tipo, rotacoes, loadPhoto) {
  if (!fileId) return null;
  if (tipo === "video") return { tipo: "video", rotate: 0, ratio: 16 / 9 };
  if (!loadPhoto) return null;
  const foto = await loadPhoto(fileId);
  if (!foto || !foto.data || !foto.width || !foto.height) return null;
  const rotate = rotacoes?.[fileId] || 0;
  const girada = rotate === 90 || rotate === 270;
  const larguraEfetiva = girada ? foto.height : foto.width;
  const alturaEfetiva = girada ? foto.width : foto.height;
  return { tipo: "foto", data: foto.data, rotate, ratio: larguraEfetiva / alturaEfetiva };
}

// Layout "justificado" (como galeria de fotos -- Google Fotos/Flickr):
// cada foto de uma fileira ocupa uma largura proporcional a sua propria
// proporcao, todas com a MESMA altura, escalada pra fileira inteira
// preencher a largura disponivel exatamente -- ninguem fica com borda
// vazia do lado (o problema que gerava fileiras "feias" quando a
// orientacao das fotos nao combinava com uma grade de colunas iguais).
// Se a altura que preencheria a largura passar do maximo permitido
// (fotos "altas" demais pro espaco), usa o maximo e centraliza a fileira
// horizontalmente em vez de estourar pra baixo.
function layoutJustificado(fotos, wDisponivel, hMax, gap) {
  if (!fotos.length) return { posicoes: [], altura: 0 };
  const somaRatios = fotos.reduce((acc, f) => acc + f.ratio, 0);
  const gapsTotal = gap * (fotos.length - 1);
  const alturaQuePreenche = (wDisponivel - gapsTotal) / somaRatios;
  const altura = Math.min(hMax, Math.max(0.3, alturaQuePreenche));
  const larguraTotal = somaRatios * altura + gapsTotal;
  let x = Math.max(0, (wDisponivel - larguraTotal) / 2);
  const posicoes = fotos.map((f) => {
    const largura = f.ratio * altura;
    const pos = { foto: f, x, w: largura, h: altura };
    x += largura + gap;
    return pos;
  });
  return { posicoes, altura };
}

// Desenha a foto preenchendo a caixa EXATAMENTE (a caixa ja foi calculada
// no formato certo pra proporcao dela, ver layoutJustificado -- sem
// letterbox, sem cortar). Rotacao gira em torno do centro da caixa; como
// pptxgenjs rotaciona a caixa ANTES de girar, uma foto girada 90/270
// precisa da caixa "pre-rotacao" com largura/altura trocadas pra, depois
// de girar, ocupar exatamente (w,h) no lugar certo.
function desenharFotoNaCaixa(slide, foto, boxX, boxY, boxW, boxH) {
  if (foto.tipo === "video") {
    // Mesmo placeholder da tela: retangulo escuro + triangulo de play --
    // nunca embute o video de verdade no .pptx (infla o arquivo e tem
    // risco de compatibilidade, mesma convencao ja usada nos relatorios
    // Multilaser pra video).
    slide.addShape("rect", { x: boxX, y: boxY, w: boxW, h: boxH, fill: { color: "17151F" }, line: { type: "none" } });
    const triSize = Math.min(boxW, boxH) * 0.3;
    slide.addShape("triangle", {
      x: boxX + boxW / 2 - triSize / 2, y: boxY + boxH / 2 - triSize / 2,
      w: triSize, h: triSize, fill: { color: "FFFFFF" }, line: { type: "none" }, rotate: 90,
    });
    return;
  }
  const girada = foto.rotate === 90 || foto.rotate === 270;
  const preW = girada ? boxH : boxW;
  const preH = girada ? boxW : boxH;
  const centerX = boxX + boxW / 2;
  const centerY = boxY + boxH / 2;
  slide.addImage({
    data: foto.data,
    x: centerX - preW / 2,
    y: centerY - preH / 2,
    w: preW,
    h: preH,
    rotate: foto.rotate || 0,
  });
}

// Desenha TODAS as fotos/videos de um lado (Before ou After), nao so a
// principal -- os 2 primeiros IDs (contando so foto+video) sao as
// "principais" (fileira de cima, mais alta), o resto vira miniatura
// embaixo. Documentos NUNCA entram aqui -- o PPT e um documento oficial
// ja bem denso (sem espaco sobrando pra mais uma fileira), entao anexo de
// documento fica so na tela; ver Slide.js pro chip. Mesma ordem que o
// site mostra pra foto/video. Cada fileira usa layout justificado (ver
// acima).
async function addPhotoGroup(slide, ids, rotacoes, meta, x, y, w, h, loadPhoto) {
  const lista = (ids || []).filter(Boolean).filter((id) => (meta?.[id]?.tipo || "foto") !== "doc");
  if (!lista.length) return;

  const carregadas = await Promise.all(lista.map((id) => medirFoto(id, meta?.[id]?.tipo || "foto", rotacoes, loadPhoto)));
  const fotos = carregadas.filter(Boolean);
  if (!fotos.length) return;

  const principais = fotos.slice(0, 2);
  const extras = fotos.slice(2);
  const gap = 0.06;

  const hMaxPrincipais = extras.length ? h - Math.min(h * 0.32, 1.1) - gap : h;
  const { posicoes: posPrincipais, altura: alturaPrincipaisReal } = layoutJustificado(principais, w, hMaxPrincipais, gap);
  posPrincipais.forEach((p) => desenharFotoNaCaixa(slide, p.foto, x + p.x, y, p.w, p.h));

  if (!extras.length) return;

  const yExtras = y + alturaPrincipaisReal + gap;
  const hMaxExtras = h - alturaPrincipaisReal - gap;
  const { posicoes: posExtras } = layoutJustificado(extras, w, hMaxExtras, gap);
  posExtras.forEach((p) => desenharFotoNaCaixa(slide, p.foto, x + p.x, yExtras, p.w, p.h));
}

// --- 1 slide de detalhe de acao -------------------------------------------
export async function addActionSlide(pptx, acao, loadPhoto, lang = "en") {
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };

  slide.addShape("rect", { x: 0, y: 0, w: 13.333, h: 1.02, fill: { color: PURPLE }, line: { type: "none" } });
  // Circulo do numero vira link pro SPM quando a ação tem o link preenchido
  // (campo "Editar ação" -> Link SPM) -- visual identico de qualquer forma,
  // so ganha destino de clique.
  const spmHyperlink = acao.spmLink ? { hyperlink: { url: txt(acao.spmLink) } } : {};
  slide.addShape("ellipse", { x: 0.28, y: 0.17, w: 0.68, h: 0.68, fill: { color: "FFFFFF" }, line: { type: "none" }, ...spmHyperlink });
  const noStr = txt(acao.no);
  slide.addText(noStr, {
    x: 0.28, y: 0.17, w: 0.68, h: 0.68, align: "center", valign: "middle",
    fontSize: noStr.length > 9 ? 7 : noStr.length > 6 ? 9 : 11, bold: true, color: PURPLE, fontFace: "Arial",
    underline: false, // pptxgenjs sublinha texto com hyperlink por padrao -- visual deve ficar identico com ou sem o link SPM preenchido
    ...spmHyperlink,
  });
  slide.addText(txt(acao.item).toUpperCase(), {
    x: 1.15, y: 0.15, w: 9.9, h: 0.42, fontSize: 17, bold: true, color: "FFFFFF", fontFace: "Arial",
  });
  slide.addText(txt(acao.process), { x: 1.15, y: 0.58, w: 9.9, h: 0.3, fontSize: 10, color: "DCCFF6", fontFace: "Arial" });

  const isClosed = acao.status === "closed";
  slide.addShape("roundRect", {
    x: 11.35, y: 0.28, w: 1.7, h: 0.42, rectRadius: 0.1,
    fill: { color: isClosed ? GREEN : AMBER }, line: { type: "none" },
  });
  slide.addText(s(lang, isClosed ? "db.closed" : "db.open").toUpperCase(), {
    x: 11.35, y: 0.28, w: 1.7, h: 0.42, align: "center", valign: "middle",
    fontSize: 11, bold: true, color: "FFFFFF", fontFace: "Arial",
  });

  // No PPT so o valor numerico, sem a situacao (Approved/Partial/Pending) --
  // decisao explicita do usuario: o slide e o documento oficial que sai da
  // fabrica, e o detalhamento (quantos itens, qual aprovado/pendente) fica
  // reservado pro Dashboard e pro editor de acao no site, nao pro PPT.
  const investValor = acao.investmentInfo
    ? `R$ ${(acao.investmentInfo.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : s(lang, "common.semInvestimento");

  const metaY = 1.12;
  const metaCols = [
    [s(lang, "pres.slidePersonInCharge"), `${txt(acao.person) || "—"}${acao.dept ? ` (${txt(acao.dept)})` : ""}`],
    [s(lang, "pres.slideOccurDate"), dt(acao.occur, lang) || "—"],
    [s(lang, "pres.slideDeadline"), dt(acao.deadline, lang) || "—"],
    [s(lang, "pres.slideInvestment"), txt(investValor)],
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
  // As 3 caixas tem que caber na MESMA faixa util da tabela logo abaixo
  // (x=0.35, w=12.63 -> borda direita em 12.98). Antes somavam
  // 6.15+3.35+3.35 + 2 gaps de 0.12 = 13.44, ou seja, a borda da caixa
  // ABRANGENCY terminava em 13.44" num slide de 13.333" -- por isso ela
  // aparecia "vazando" pra fora no arquivo baixado.
  const DESC_GAP = 0.12;
  const DESC_W_TOTAL = 12.63;
  const descW1 = 6.15;
  const descWResto = (DESC_W_TOTAL - descW1 - DESC_GAP * 2) / 2; // 3.12
  const descCols = [
    [s(lang, "pres.slideDescription"), acao.description, descW1],
    [s(lang, "pres.slideExpectation"), acao.expectation, descWResto],
    [s(lang, "pres.slideAbrangency"), acao.abrangency, descWResto],
  ];
  let cx = 0.35;
  descCols.forEach(([label, text, w]) => {
    slide.addText(label, { x: cx, y: descY, w, h: 0.2, fontSize: 8, bold: true, color: PURPLE, fontFace: "Arial" });
    slide.addShape("rect", { x: cx, y: descY + 0.2, w, h: descH - 0.2, fill: { color: GRAY_BOX }, line: { type: "none" } });
    slide.addText(txt(text) || "—", {
      x: cx + 0.1, y: descY + 0.25, w: w - 0.2, h: descH - 0.3,
      fontSize: 9, color: TEXT_DARK, valign: "top", fontFace: "Arial",
    });
    cx += w + DESC_GAP;
  });

  const planY = descY + descH + 0.16;
  slide.addText(s(lang, "pres.slideActionPlan"), { x: 0.35, y: planY, w: 4, h: 0.2, fontSize: 8, bold: true, color: PURPLE, fontFace: "Arial" });
  // ate 10 passos (limite tambem aplicado na hora de adicionar, no
  // editor) -- a tabela cresce e a zona de foto abaixo encolhe pra
  // compensar (ver calculo de photoH mais abaixo, ja e dinamico).
  const steps = acao.steps && acao.steps.length ? acao.steps.slice(0, 10) : [["1", "—", "—", "—", "—"]];
  const headerRow = [
    "#", s(lang, "pres.slideColAction"), s(lang, "pres.slideColOwner"), s(lang, "pres.slideColDate"), s(lang, "pres.slideColStatus"),
  ].map((text, i) => ({
    text,
    options: {
      bold: true, color: "FFFFFF", fill: { color: PURPLE }, fontSize: 8, fontFace: "Arial",
      align: i === 1 ? "left" : "center",
    },
  }));
  const bodyRows = steps.map((st) =>
    st.map((v, i) => {
      const isStatus = i === 4;
      const isDate = i === 3;
      const statusUpper = isStatus ? String(v || "").trim().toUpperCase() : "";
      const statusColor = statusUpper === "CLOSED" ? GREEN : statusUpper === "ON HOLD" ? RED : AMBER;
      let texto;
      if (isDate) texto = dt(v, lang) || txt(v);
      else if (isStatus) texto = sv(lang, statusUpper).toUpperCase();
      else texto = txt(v);
      return {
        text: texto,
        options: {
          fontSize: 8, fill: { color: GRAY_BOX }, fontFace: "Arial",
          color: isStatus ? statusColor : TEXT_DARK, bold: isStatus,
          align: i === 0 ? "center" : i >= 2 ? "center" : "left",
        },
      };
    })
  );
  const tableY = planY + 0.22;
  const ROW_H = 0.26; // altura de 1 linha so -- passo curto, sem quebra
  const LINE_H = 0.145; // altura estimada por linha de texto a 8pt
  const ROW_PAD = 0.11; // padding interno da celula (topo+base)
  const COL_W = [0.5, 7.63, 1.8, 1.2, 1.5];
  // Uma linha da tabela precisa ser tao alta quanto a MAIOR celula dela --
  // normalmente e a coluna "Acao" (mais larga que as outras, mas ainda
  // assim pode transbordar quando o passo tem paragrafo/texto longo).
  const rowHeights = bodyRows.map((row) =>
    Math.max(
      ROW_H,
      ...row.map((cell, i) => estimarLinhas(cell.text, COL_W[i], cell.options.fontSize || 8) * LINE_H + ROW_PAD)
    )
  );
  slide.addTable([headerRow, ...bodyRows], {
    x: 0.35, y: tableY, w: 12.63,
    colW: COL_W,
    rowH: [ROW_H, ...rowHeights],
    border: { type: "solid", color: "FFFFFF", pt: 1.5 },
    autoPage: false,
    fontFace: "Arial",
  });

  // Soma a altura REAL estimada (nao mais "linhas fixas x contagem") --
  // e isso que faz a banda Before/After, a legenda e as fotos serem
  // empurradas pra baixo (e encolhidas, se precisar) quando um passo tem
  // texto longo, em vez de ficarem sobrepostas pela tabela.
  const tableH = ROW_H + rowHeights.reduce((acc, h) => acc + h, 0);
  const bandY = tableY + tableH + 0.1;
  slide.addShape("rect", { x: 0, y: bandY, w: 13.333, h: 0.3, fill: { color: BLUE }, line: { type: "none" } });
  slide.addText(s(lang, "pres.slideBefore"), { x: 0.35, y: bandY, w: 6.3, h: 0.3, align: "center", fontSize: 10, bold: true, color: "FFFFFF", valign: "middle", fontFace: "Arial" });
  slide.addText(s(lang, "pres.slideAfter"), { x: 6.65, y: bandY, w: 6.3, h: 0.3, align: "center", fontSize: 10, bold: true, color: "FFFFFF", valign: "middle", fontFace: "Arial" });

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
    { text: s(lang, "pres.slideFactoryComment") + "\n", options: { bold: true, fontSize: 6.5, color: TEXT_DARK } },
    { text: txt(acao.factory) || "—", options: { fontSize: 7, italic: true, color: "6B6878" } },
  ], { x: 0.35, y: captionY, w: 6.0, h: captionH, fontFace: "Arial", valign: "top" });
  slide.addText([
    { text: s(lang, "pres.slideHisenseComment") + "\n", options: { bold: true, fontSize: 6.5, color: TEXT_DARK } },
    { text: txt(acao.hisense) || "—", options: { fontSize: 7, italic: true, color: "6B6878" } },
  ], { x: 6.65, y: captionY, w: 6.0, h: captionH, fontFace: "Arial", valign: "top" });

  // Cada lado tem seu proprio try/catch: um erro inesperado num grupo de
  // fotos (ex.: foto corrompida) nao pode derrubar o slide inteiro nem o
  // OUTRO lado -- so aquele grupo fica sem foto, e o motivo vai pro console
  // em vez de sumir em silencio (era exatamente esse silencio que deixava
  // "baixar tudo" sair sem imagem nenhuma sem nenhuma pista do porque).
  try {
    await addPhotoGroup(slide, acao.fotosBefore, acao.fotosBeforeRotacao, acao.fotosBeforeMeta, 0.35, photoY, 6.0, photoH, loadPhoto);
  } catch (e) {
    console.error("Falha ao desenhar fotos 'Before' da acao", acao?.no, e);
  }
  try {
    await addPhotoGroup(slide, acao.fotosImprovement, acao.fotosImprovementRotacao, acao.fotosImprovementMeta, 6.65, photoY, 6.0, photoH, loadPhoto);
  } catch (e) {
    console.error("Falha ao desenhar fotos 'Improvement' da acao", acao?.no, e);
  }
}

// --- capa / divisor / encerramento -----------------------------------------
export function addCoverSlide(pptx, { geradoEm }, lang = "en") {
  const slide = pptx.addSlide();
  slide.background = { color: PURPLE_DARK };
  slide.addShape("roundRect", {
    x: 0.5, y: 0.55, w: 3.6, h: 0.4, rectRadius: 0.2,
    fill: { color: "FFFFFF", transparency: 85 }, line: { color: "FFFFFF", width: 0.75, transparency: 70 },
  });
  slide.addText(s(lang, "pptDeck.coverTag"), {
    x: 0.5, y: 0.55, w: 3.6, h: 0.4, align: "center", valign: "middle",
    fontSize: 10, bold: true, color: "FFFFFF", fontFace: "Arial",
  });
  slide.addText(s(lang, "pptDeck.coverTitle"), {
    x: 0.5, y: 2.6, w: 10, h: 1, fontSize: 34, bold: true, color: "FFFFFF", fontFace: "Arial",
  });
  slide.addText(
    s(lang, "pptDeck.coverSubtitle"),
    { x: 0.5, y: 3.65, w: 8, h: 0.8, fontSize: 13, color: "DCCFF6", fontFace: "Arial", valign: "top" }
  );
  slide.addText(geradoEm, {
    x: 0.5, y: 6.9, w: 8, h: 0.3, fontSize: 10.5, color: "B9A6E8", fontFace: "Arial",
  });
}

// --- "Improvement Overview": espelha o dashboard Principal num unico slide,
// logo apos a capa. Usa graficos NATIVOS do pptxgenjs (nao e uma imagem
// capturada da tela) -- mesmos dados que o dashboard mostra, calculados no
// mesmo lugar (getDashboardStats no servidor), so desenhados em formato de
// slide em vez de HTML/CSS.
export function addOverviewSlide(pptx, stats, lang = "en") {
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };

  slide.addShape("rect", { x: 0, y: 0, w: 13.333, h: 1.0, fill: { color: PURPLE }, line: { type: "none" } });
  slide.addText(s(lang, "pptDeck.overviewTitle"), {
    x: 0.5, y: 0.16, w: 10, h: 0.5, fontSize: 24, bold: true, color: "FFFFFF", fontFace: "Arial",
  });
  slide.addText(s(lang, "pptDeck.overviewSubtitle", { n: stats.total }), {
    x: 0.5, y: 0.62, w: 10, h: 0.3, fontSize: 11, color: "DCCFF6", fontFace: "Arial",
  });

  // KPI row (Total/Closed/Open/Delayed) -- mesmos 4 numeros do topo do
  // dashboard Principal. Cartao com borda + cantos arredondados, igual
  // .kpi-card da tela (fundo branco, nao cinza -- o cinza era um desvio).
  const kpis = [
    [s(lang, "pptDeck.overviewTotal"), stats.total, TEXT_DARK],
    [s(lang, "pptDeck.overviewClosed"), stats.closed, GREEN],
    [s(lang, "pptDeck.overviewOpen"), stats.open, AMBER],
    [s(lang, "pptDeck.overviewDelayed"), stats.delayed, RED],
  ];
  const kpiY = 1.2;
  const kpiW = (13.333 - 0.7) / 4 - 0.12;
  kpis.forEach(([label, value, color], i) => {
    const x = 0.35 + i * (kpiW + 0.16);
    slide.addShape("roundRect", { x, y: kpiY, w: kpiW, h: 0.82, fill: { color: "FFFFFF" }, line: { color: BORDER_LIGHT, width: 1 }, rectRadius: 0.08 });
    slide.addText(String(value), { x: x + 0.14, y: kpiY + 0.1, w: kpiW - 0.28, h: 0.4, fontSize: 24, bold: true, color, fontFace: "Arial" });
    slide.addText(txt(label), { x: x + 0.14, y: kpiY + 0.5, w: kpiW - 0.28, h: 0.24, fontSize: 8.5, bold: true, color: TEXT_MUTED, fontFace: "Arial" });
  });

  // Donut de status (Closed vs Open) -- esquerda, dentro de um cartao com
  // borda igual .chart-card da tela. O donut nativo nao desenha texto no
  // centro do anel nem uma legenda com contagem/%, entao os dois sao
  // desenhados por cima na mao (mesmo visual do SVG da tela: total grande
  // no meio do anel + legenda com "Status — N (X%)").
  const chartY = 2.3;
  const chartH = 3.55;
  const cardPad = 0.22;
  slide.addShape("roundRect", { x: 0.35, y: chartY, w: 5.8, h: chartH, fill: { color: "FFFFFF" }, line: { color: BORDER_LIGHT, width: 1 }, rectRadius: 0.08 });
  slide.addText(s(lang, "dash.statusAcoes"), { x: 0.35 + cardPad, y: chartY + 0.16, w: 5.8 - cardPad * 2, h: 0.22, fontSize: 12, bold: true, color: TEXT_DARK, fontFace: "Arial" });
  slide.addText(s(lang, "dash.openVsClosed"), { x: 0.35 + cardPad, y: chartY + 0.38, w: 5.8 - cardPad * 2, h: 0.2, fontSize: 8.5, color: TEXT_MUTED, fontFace: "Arial" });

  const notaH = stats.potencialFechamento ? 0.55 : 0;
  const legendaH = 0.26;
  const donutTop = chartY + 0.66;
  const donutH = chartH - 0.66 - cardPad - legendaH - notaH;
  slide.addChart(
    pptx.ChartType.doughnut,
    [{
      name: s(lang, "dash.statusAcoes"),
      labels: [s(lang, "db.closed"), s(lang, "db.open")],
      values: [stats.closed, stats.open],
    }],
    {
      x: 0.35 + cardPad, y: donutTop, w: 5.8 - cardPad * 2, h: donutH,
      chartColors: [GREEN, AMBER],
      showLegend: false, showValue: false,
      holeSize: 62, dataBorder: { color: "FFFFFF", pt: 2 }, fontFace: "Arial",
    }
  );
  // Total no centro do anel -- a caixa do doughnut fica centralizada na
  // area passada acima; o buraco (holeSize 62%) tem espaco de sobra pra um
  // numero grande + o rotulo pequeno embaixo, igual o SVG da tela.
  const donutCenterX = 0.35 + 5.8 / 2;
  const donutCenterY = donutTop + donutH / 2;
  slide.addText(
    [
      { text: String(stats.total) + "\n", options: { fontSize: 18, bold: true, color: TEXT_DARK } },
      { text: txt(s(lang, "pptDeck.actionsSuffix")), options: { fontSize: 8, color: TEXT_MUTED } },
    ],
    { x: donutCenterX - 0.6, y: donutCenterY - 0.32, w: 1.2, h: 0.64, align: "center", valign: "middle", fontFace: "Arial" }
  );
  // Legenda customizada (quadradinho colorido + "Status — N (X%)"), igual a
  // tela -- a legenda nativa do pptxgenjs so mostra o rotulo, sem contagem
  // nem percentual.
  const pctClosed = stats.total ? Math.round((stats.closed / stats.total) * 100) : 0;
  const pctOpen = stats.total ? Math.round((stats.open / stats.total) * 100) : 0;
  const legendaY = donutTop + donutH + 0.06;
  const legendaItens = [
    [GREEN, `${s(lang, "db.closed")} — ${stats.closed} (${pctClosed}%)`],
    [AMBER, `${s(lang, "db.open")} — ${stats.open} (${pctOpen}%)`],
  ];
  let legendaX = 0.35 + cardPad + 0.15;
  legendaItens.forEach(([cor, texto]) => {
    slide.addShape("roundRect", { x: legendaX, y: legendaY + 0.06, w: 0.09, h: 0.09, fill: { color: cor }, line: { type: "none" }, rectRadius: 0.015 });
    slide.addText(txt(texto), { x: legendaX + 0.18, y: legendaY, w: 2.3, h: legendaH, fontSize: 8.5, color: TEXT_MUTED, fontFace: "Arial", valign: "middle" });
    legendaX += 2.5;
  });
  if (stats.potencialFechamento) {
    const pf = stats.potencialFechamento;
    slide.addText(
      txt(s(lang, "dash.potencialNota", { n: pf.fechaveis, pctAtual: pf.pctAtual, pctPotencial: pf.pctPotencial })),
      {
        x: 0.35 + cardPad, y: legendaY + legendaH + 0.02, w: 5.8 - cardPad * 2, h: notaH,
        fontSize: 7.8, italic: true, color: TEXT_MUTED, fontFace: "Arial", valign: "top",
      }
    );
  }

  // Barras horizontais de acoes ABERTAS por departamento (so quem tem
  // open>0, mesmo filtro aplicado no dashboard Principal) -- direita,
  // mesmo cartao com borda. Ate 10 departamentos pra caber num unico slide
  // sem espremer demais. Sem eixo de valor (a tela tambem nao mostra
  // régua nenhuma, so a barra + numero no fim dela) -- alem de bater com
  // o visual da tela, evita o formato "General" da barra de valor
  // renderizar torto em alguns visualizadores (aparecia como "1900r0oI",
  // herdado do jeito que o OOXML trata eixo numerico sem formato
  // explicito).
  const deptos = (stats.departamentosDetalhe || [])
    .filter((d) => d.open > 0)
    .sort((a, b) => b.open - a.open)
    .slice(0, 10);
  slide.addShape("roundRect", { x: 6.45, y: chartY, w: 6.55, h: chartH, fill: { color: "FFFFFF" }, line: { color: BORDER_LIGHT, width: 1 }, rectRadius: 0.08 });
  slide.addText(s(lang, "dash.porDepto"), { x: 6.45 + cardPad, y: chartY + 0.16, w: 6.55 - cardPad * 2, h: 0.25, fontSize: 12, bold: true, color: TEXT_DARK, fontFace: "Arial" });
  if (deptos.length) {
    slide.addChart(
      pptx.ChartType.bar,
      [{
        name: s(lang, "db.open"),
        labels: deptos.map((d) => txt(sv(lang, d.label))).reverse(),
        values: deptos.map((d) => d.open).reverse(),
      }],
      {
        x: 6.45 + cardPad, y: chartY + 0.5, w: 6.55 - cardPad * 2, h: chartH - 0.5 - cardPad,
        barDir: "bar", chartColors: [PURPLE],
        showLegend: false, showValue: true, dataLabelColor: TEXT_DARK, dataLabelFontSize: 8, dataLabelPosition: "outEnd",
        catAxisLabelFontSize: 8, catAxisLineShow: false,
        valAxisHidden: true, valAxisMinVal: 0, valGridLine: { style: "none" },
        fontFace: "Arial",
      }
    );
  } else {
    slide.addText("—", { x: 6.45 + cardPad, y: chartY + 0.5, w: 6.55 - cardPad * 2, h: chartH - 0.5 - cardPad, align: "center", valign: "middle", fontSize: 12, color: "9490A0", fontFace: "Arial" });
  }

  // Resumo de investimento -- rodape, mesmo cartao com borda, mesmos 3
  // numeros do card de investimento do dashboard Principal (Approved /
  // Em Analise / Precisam).
  const inv = stats.investimento || {};
  const investY = chartY + chartH + 0.2;
  const investH = 7.5 - investY - 0.2;
  slide.addShape("roundRect", { x: 0.35, y: investY, w: 12.63, h: investH, fill: { color: "FFFFFF" }, line: { color: BORDER_LIGHT, width: 1 }, rectRadius: 0.08 });
  slide.addText(s(lang, "dash.resumoInvestimento"), { x: 0.35 + cardPad, y: investY + 0.14, w: 6, h: 0.24, fontSize: 12, bold: true, color: TEXT_DARK, fontFace: "Arial" });
  const investCols = [
    [s(lang, "dash.aprovado"), `R$ ${(inv.aprovado || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, GREEN],
    [s(lang, "dash.pendente"), `R$ ${(inv.pendente || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, AMBER],
    [s(lang, "pptDeck.overviewNeedInvest"), String(inv.acoesComInvestimento || 0), PURPLE],
  ];
  const investColW = (12.63 - cardPad * 2) / 3;
  investCols.forEach(([label, value, color], i) => {
    const x = 0.35 + cardPad + i * investColW;
    slide.addText(txt(label), { x, y: investY + 0.46, w: investColW - 0.2, h: 0.2, fontSize: 8.5, bold: true, color: TEXT_MUTED, fontFace: "Arial" });
    slide.addText(txt(value), { x, y: investY + 0.66, w: investColW - 0.2, h: 0.32, fontSize: 16, bold: true, color, fontFace: "Arial" });
  });
}

// --- "Dashboard Departamentos": mesma tabela da tela (Dept./Total/Aberta/
// Fechada/Atrasadas/Taxa de fechamento), sem a seta de expandir -- no PPT
// impresso ela nao teria funcao nenhuma (nao da pra clicar num slide
// estatico). Mesma ordem de departamentos que stats.departamentosDetalhe
// ja vem (identica a tela).
export function addDepartmentsSlide(pptx, stats, lang = "en") {
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };

  slide.addShape("rect", { x: 0, y: 0, w: 13.333, h: 1.0, fill: { color: PURPLE }, line: { type: "none" } });
  slide.addText(s(lang, "pptDeck.deptDashboardTitle"), {
    x: 0.5, y: 0.16, w: 10, h: 0.5, fontSize: 24, bold: true, color: "FFFFFF", fontFace: "Arial",
  });
  slide.addText(s(lang, "pptDeck.deptDashboardSubtitle", { n: stats.total }), {
    x: 0.5, y: 0.62, w: 10, h: 0.3, fontSize: 11, color: "DCCFF6", fontFace: "Arial",
  });

  const deptos = stats.departamentosDetalhe || [];

  const tableY = 1.3;
  const tableW = 12.63;
  if (!deptos.length) {
    slide.addShape("roundRect", { x: 0.35, y: tableY, w: tableW, h: 1, fill: { color: "FFFFFF" }, line: { color: BORDER_LIGHT, width: 1 }, rectRadius: 0.08 });
    slide.addText("—", { x: 0.35, y: tableY, w: tableW, h: 1, align: "center", valign: "middle", fontSize: 14, color: "9490A0", fontFace: "Arial" });
    return;
  }

  // rowH so era um "minimo sugerido" pro pptxgenjs -- se o texto da celula
  // precisasse de mais espaco que isso pra caber (linha inteira numa
  // fonte grande demais pra caixa), a biblioteca CRESCE a linha de
  // verdade, ignorando o rowH pedido. Com autoPage:false (obrigatorio pra
  // nao espalhar a tabela em varios slides) isso empurrava linhas pra
  // fora do rodape do slide quando havia muitos departamentos -- o
  // "estourando o PPT" relatado. Corrige garantindo que a fonte SEMPRE
  // caiba dentro do rowH calculado (com folga pra padding/entrelinha),
  // em vez de fixar um tamanho de fonte que só funciona com poucas linhas.
  const alturaDisponivel = 7.5 - tableY - 0.3;
  const rowH = Math.min(0.32, alturaDisponivel / (deptos.length + 1));
  const rowHpt = rowH * 72;
  const margemVerticalPt = 2; // total (1pt topo + 1pt base), ver options.margin abaixo
  const fontSize = Math.max(5.5, Math.min(10, rowHpt - margemVerticalPt - 3));

  // Cabecalho igual ao da tela: fundo claro (nao roxo), texto cinza
  // maiusculo, tudo alinhado a esquerda -- .db-table th em globals.css.
  const headerRow = [
    s(lang, "dash.deptSub"), s(lang, "dash.total"), s(lang, "db.open"), s(lang, "db.closed"),
    s(lang, "dash.atrasadas"), s(lang, "dash.deptTaxaFechamento"),
  ].map((text) => ({
    text: txt(text).toUpperCase(),
    options: {
      bold: true, color: TEXT_MUTED, fill: { color: BG_LIGHT }, fontSize: Math.min(9, fontSize), fontFace: "Arial",
      align: "left", border: [{ type: "none" }, { type: "none" }, { type: "solid", color: BORDER_LIGHT, pt: 1 }, { type: "none" }],
    },
  }));
  // Cada linha so tem borda embaixo (igual .db-table td), sem grade
  // vertical/horizontal completa -- e as colunas Aberta/Fechada usam o
  // mesmo "chip" tintado (fundo claro + texto colorido) que a tela usa nos
  // badges de contagem, em vez de so um numero colorido solto.
  const bordaCelula = [{ type: "none" }, { type: "none" }, { type: "solid", color: BORDER_LIGHT, pt: 0.75 }, { type: "none" }];
  const bodyRows = deptos.map((d) => {
    const taxa = d.total ? Math.round((d.closed / d.total) * 100) : 0;
    return [
      { text: txt(sv(lang, d.label)), options: { fontSize, bold: true, fontFace: "Arial", color: TEXT_DARK, align: "left", fill: { color: "FFFFFF" } } },
      { text: String(d.total), options: { fontSize, fontFace: "Arial", color: TEXT_MUTED, bold: true, align: "left", fill: { color: "FFFFFF" } } },
      { text: String(d.open), options: { fontSize, fontFace: "Arial", color: AMBER, bold: true, align: "left", fill: { color: AMBER_TINT } } },
      { text: String(d.closed), options: { fontSize, fontFace: "Arial", color: GREEN, bold: true, align: "left", fill: { color: GREEN_TINT } } },
      { text: String(d.delayed), options: { fontSize, fontFace: "Arial", color: d.delayed ? RED : "9490A0", bold: !!d.delayed, align: "left", fill: { color: "FFFFFF" } } },
      { text: `${taxa}%`, options: { fontSize, fontFace: "Arial", color: TEXT_MUTED, bold: true, align: "left", fill: { color: "FFFFFF" } } },
    ].map((cell) => ({ ...cell, options: { ...cell.options, border: bordaCelula } }));
  });

  // Cartao com borda por baixo da tabela, igual .table-card da tela.
  slide.addShape("roundRect", {
    x: 0.35, y: tableY, w: tableW, h: rowH * (bodyRows.length + 1),
    fill: { color: "FFFFFF" }, line: { color: BORDER_LIGHT, width: 1 }, rectRadius: 0.06,
  });
  slide.addTable([headerRow, ...bodyRows], {
    x: 0.35, y: tableY, w: tableW,
    colW: [4.63, 1.6, 1.6, 1.6, 1.6, 1.6],
    rowH,
    margin: [1, 6, 1, 6],
    autoPage: false,
    fontFace: "Arial",
  });
}

export function addDividerSlide(pptx, titulo, contagem, lang = "en") {
  const slide = pptx.addSlide();
  slide.background = { color: PURPLE_DARK };
  slide.addText(titulo, {
    x: 0.8, y: 3.15, w: 11.7, h: 0.9, align: "center", fontSize: 26, bold: true, color: "FFFFFF", fontFace: "Arial",
  });
  if (contagem !== undefined) {
    slide.addText(`${contagem} ${s(lang, "pptDeck.actionsSuffix")}`, {
      x: 0.8, y: 4.05, w: 11.7, h: 0.4, align: "center", fontSize: 12, color: "DCCFF6", fontFace: "Arial",
    });
  }
}

export function addClosingSlide(pptx, lang = "en") {
  const slide = pptx.addSlide();
  slide.background = { color: PURPLE_DARK };
  slide.addText(s(lang, "pptDeck.thankYou"), {
    x: 0.8, y: 3.3, w: 11.7, h: 0.9, align: "center", fontSize: 32, bold: true, color: "FFFFFF", fontFace: "Arial",
  });
}

// Deck completo: capa -> "Improvement Overview" -> divisor "com investimento"
// -> essas acoes -> divisor "sem investimento" -> essas acoes -> encerramento.
// `stats` (opcional) e o mesmo objeto de getDashboardStats()/`/api/dashboard`
// -- sem ele o slide de overview simplesmente nao entra (deck continua
// funcionando, so sem esse slide). `onProgress(feito, total)` e opcional --
// usado pela barra de progresso no navegador, ja que gerar 60+ slides com
// foto leva alguns segundos.
export async function buildDeck(pptx, acoes, loadPhoto, onProgress, lang = "en", stats = null) {
  const comInvestimento = acoes.filter((a) => a.investmentFlag === "yes");
  const semInvestimento = acoes.filter((a) => a.investmentFlag !== "yes");
  const geradoEm = formatDateISO(new Date().toISOString().slice(0, 10), lang) || new Date().toLocaleDateString("pt-BR");

  addCoverSlide(pptx, { geradoEm }, lang);
  if (stats) {
    try {
      addOverviewSlide(pptx, stats, lang);
    } catch (e) {
      console.error("Falha ao desenhar o slide de overview", e);
    }
    try {
      addDepartmentsSlide(pptx, stats, lang);
    } catch (e) {
      console.error("Falha ao desenhar o slide de dashboard por departamento", e);
    }
  }

  let feito = 0;
  const total = acoes.length;

  // Uma acao com dado estranho nao pode derrubar o deck inteiro nem sair
  // pela metade (slide meio desenhado = XML quebrado = PowerPoint pedindo
  // reparo). Se falhar, avisa no console e segue -- o resto sai inteiro.
  const falhas = [];
  async function desenhar(acao) {
    try {
      await addActionSlide(pptx, acao, loadPhoto, lang);
    } catch (e) {
      falhas.push(`${acao?.no || "?"}: ${e.message}`);
      console.error("Falha ao desenhar o slide da acao", acao?.no, e);
    }
    if (onProgress) onProgress(++feito, total);
  }

  addDividerSlide(pptx, s(lang, "pptDeck.dividerInvestment"), comInvestimento.length, lang);
  for (const acao of comInvestimento) await desenhar(acao);

  addDividerSlide(pptx, s(lang, "pptDeck.dividerNoInvestment"), semInvestimento.length, lang);
  for (const acao of semInvestimento) await desenhar(acao);

  addClosingSlide(pptx, lang);
  pptx._falhasHisense = falhas;
  return pptx;
}
