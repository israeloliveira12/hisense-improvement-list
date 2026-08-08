// Modulo SERVIDOR (nunca importar de um "use client") -- fala com a copia
// em Google Sheets da planilha (ver README.md / CLAUDE.md pra como essa
// copia foi criada). So le/escreve o que precisa, nunca reescreve a aba
// inteira -- mesmo cuidado cirurgico ja usado no lado Excel do projeto.
import { google } from "googleapis";
import { getServiceAccountAuth } from "./googleAuth";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const TAB_IMPROVEMENT = "Improvement List";
const TAB_DETALHES = "PPT_Detalhes";
const TAB_PASSOS = "PPT_Passos";

// mesma ordem de colunas B..U documentada em gerador_slides/parse_excel.py
const ACTION_COLS = [
  "Audit", "Process", "No.", "Item", "Description", "Action Plan",
  "Person in charge", "Dept. in charge", "Occur. Date", "Deadline",
  "New Deadline", "Year", "Week", "Aging", "Delay", "Time", "Target",
  "Investment", "Status", "Delay reason",
];
// colunas V..AL
const INVEST_COLS = [
  "#", "Item", "Type", "Quantity", "Unit cost (BRL)", "Total cost (BRL)",
  "Dollar", "Total cost (USD)", "Person in charge", "Dept. in charge",
  "Supplier", "Cost Center", "Resquet No.", "Request Approval", "Stage",
  "Status", "Remark",
];

// Campos do bloco Acao que o site deixa editar, e a coluna real deles.
// "Target" nao esta aqui de proposito -- deixou de ser um campo manual,
// agora e calculado (ver computeTarget) a pedido do usuario.
const EDITABLE_FIELD_TO_COL = {
  audit: "B",
  process: "C",
  item: "E",
  person: "H",
  dept: "I",
  occur: "J",
  deadlineOriginal: "K",
  deadline: "L", // New Deadline
  status: "T",
  delayReason: "U",
};

const INVEST_EDITABLE_FIELD_TO_COL = {
  item: "W",
  type: "X",
  quantity: "Y",
  unitCost: "Z",
  supplier: "AF",
  requestApproval: "AI",
  stage: "AJ",
  status: "AK",
  remark: "AL",
};

let _client = null;

function getSheets() {
  if (!_client) {
    const auth = getServiceAccountAuth(["https://www.googleapis.com/auth/spreadsheets"]);
    _client = google.sheets({ version: "v4", auth });
  }
  return _client;
}

// Sheets/Excel guardam data como numero serial (dias desde 1899-12-30).
function serialToDate(serial) {
  if (serial === "" || serial === null || serial === undefined) return null;
  const n = Number(serial);
  if (Number.isNaN(n)) return null; // ja veio como texto, nao da pra converter com seguranca
  return new Date(Date.UTC(1899, 11, 30) + n * 86400000);
}

// ISO (YYYY-MM-DD) -- formato neutro de fio pro cliente, que reformata na
// exibicao conforme o idioma da interface (ver lib/i18n.js formatDateISO).
// Tambem e o formato que <input type="date"> usa nativamente e que o
// Google Sheets aceita via USER_ENTERED sem depender do locale da planilha.
function serialToDateISO(serial) {
  const d = serialToDate(serial);
  if (d) {
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${d.getUTCFullYear()}-${mm}-${dd}`;
  }
  return serial ? String(serial) : null;
}

function formatBRL(v) {
  const n = Number(v) || 0;
  return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function readRange(range) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  return res.data.values || [];
}

// Le o bloco B4:AL da Improvement List e agrupa por No., cuidando de
// celulas mescladas (linha de continuacao de item de investimento vem com
// o bloco B:U vazio -- mesma logica de forward-fill do lado Python). Cada
// item de investimento guarda sua PROPRIA linha absoluta (`_row`) -- e o
// que permite editar um item especifico depois sem confundir com outro.
async function readImprovementListRaw() {
  const rows = await readRange(`${TAB_IMPROVEMENT}!B4:AL1000`);
  const grupos = [];
  let atual = null;

  rows.forEach((row, i) => {
    const absRow = 4 + i;
    const noCel = row[2]; // D = No. (B=0, C=1, D=2)
    const iniciaGrupo = noCel !== undefined && noCel !== null && noCel !== "";

    if (iniciaGrupo) {
      const acao = {};
      ACTION_COLS.forEach((nome, idx) => (acao[nome] = row[idx] ?? null));
      atual = { row: absRow, acao, itens: [] };
      grupos.push(atual);
    }

    if (atual) {
      const itemNum = row[20]; // V = '#' (V-B=20)
      if (itemNum !== undefined && itemNum !== null && itemNum !== "") {
        const item = { _row: absRow };
        INVEST_COLS.forEach((nome, idx) => (item[nome] = row[20 + idx] ?? null));
        atual.itens.push(item);
      }
    }
  });

  return grupos;
}

async function readSimpleTab(tabName) {
  const rows = await readRange(`${tabName}!A1:Z1000`);
  if (rows.length === 0) return { headers: [], rows: [] };
  const [headers, ...data] = rows;
  return {
    headers,
    // `_row` = linha absoluta na planilha (1-based) -- guardado pra quem
    // precisar escrever de volta na linha certa, mesmo que outras linhas
    // do meio estejam em branco (nunca confiar no indice do array filtrado).
    rows: data
      .map((r, i) => ({ _row: 2 + i, ...Object.fromEntries(headers.map((h, hi) => [h, r[hi] ?? ""])) }))
      .filter((r) => headers.some((h) => r[h] !== "")),
  };
}

// Formato compacto "z150,x30,y15" guardado na PPT_Detalhes -- zoom em %
// (100 = sem zoom) e posicao X/Y em % (50,50 = centralizado).
function parseAjuste(str) {
  const def = { zoom: 100, x: 50, y: 50 };
  if (!str) return def;
  const out = { ...def };
  String(str).split(",").forEach((par) => {
    const m = /^([a-z])(-?\d+(?:\.\d+)?)$/.exec(par.trim());
    if (!m) return;
    if (m[1] === "z") out.zoom = Number(m[2]);
    if (m[1] === "x") out.x = Number(m[2]);
    if (m[1] === "y") out.y = Number(m[2]);
  });
  return out;
}

export function formatAjuste({ zoom, x, y }) {
  return `z${Math.round(zoom)},x${Math.round(x)},y${Math.round(y)}`;
}

const MAX_FOTOS_POR_LADO = 8; // aumentado de 6 pra 8 -- a migracao do full.pptx trouxe 2 acoes com 7/8 fotos reais de um lado

function parseFotoIds(str) {
  if (!str) return [];
  return String(str).split(",").map((s) => s.trim()).filter(Boolean);
}

function formatFotoIds(ids) {
  return ids.filter(Boolean).join(",");
}

const DIAS_SELO_NEW = 30;

// "Criado em" fica gravado como texto "YYYY-MM-DD" (ver createAcao) --
// nao usa numero serial de data aqui de proposito, pra nao depender de
// como o Sheets formata a celula.
function isRecentlyCreated(criadoEmStr) {
  if (!criadoEmStr) return false;
  const criado = new Date(criadoEmStr);
  if (Number.isNaN(criado.getTime())) return false;
  const dias = (Date.now() - criado.getTime()) / 86400000;
  return dias >= 0 && dias < DIAS_SELO_NEW;
}

function normNo(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function investimentoDisplay(itens) {
  if (!itens.length) return null;
  const total = itens.reduce((acc, it) => acc + (Number(it["Quantity"]) || 0) * (Number(it["Unit cost (BRL)"]) || 0), 0);
  const stage = itens[0]["Stage"] || "";
  const situacao = { Delivered: "Released", "On Hold": "On Hold", Comercial: "Em cotação" }[stage] || stage;
  return formatBRL(total) + (situacao ? ` · ${situacao}` : "");
}

// "Target" deixou de ser um campo manual (o usuario confirmou a regra que
// ja estava escrita como texto solto em Din_Action!B39:C41 da planilha
// original): uma acao e Target (mais facil de fechar) se NAO precisa de
// investimento, OU se o investimento ja foi aprovado, OU se ja esta
// fechada. Antes o site so lia a coluna R (manual, nunca confiavel).
function computeTarget(investmentFlag, itens, statusRaw) {
  if (statusRaw === "closed") return true;
  if (investmentFlag !== "yes") return true; // nao precisa de investimento
  return itens.some((it) => String(it["Request Approval"] || "") === "Approved");
}

// "Da pra fechar essa acao hoje?" -- mesma regra do Target, MENOS as que ja
// estao fechadas (essas nao sao potencial, ja sao resultado). Serve pra
// responder "quantas ainda da pra fechar sem depender de aprovacao nova".
function isFechavelAgora(investmentFlag, itens, statusRaw) {
  if (statusRaw === "closed") return false;
  if (investmentFlag !== "yes") return true; // nao precisa de investimento
  return itens.some((it) => String(it["Request Approval"] || "") === "Approved");
}

// Ponto de entrada: devolve as acoes no formato que os componentes esperam,
// lido ao vivo do Sheets.
export async function getAcoes() {
  const [grupos, detalhes, passos] = await Promise.all([
    readImprovementListRaw(),
    readSimpleTab(TAB_DETALHES),
    readSimpleTab(TAB_PASSOS),
  ]);

  const detalhesPorNo = new Map(detalhes.rows.map((r) => [normNo(r["No."]), r]));
  const passosPorNo = new Map();
  passos.rows.forEach((r) => {
    const key = normNo(r["No."]);
    if (!passosPorNo.has(key)) passosPorNo.set(key, []);
    passosPorNo.get(key).push(r);
  });

  return grupos.map(({ row, acao, itens }) => {
    const no = normNo(acao["No."]);
    const det = detalhesPorNo.get(no) || {};
    const passosAcao = (passosPorNo.get(no) || []).sort(
      (a, b) => (Number(a["Ordem"]) || 0) - (Number(b["Ordem"]) || 0)
    );
    const statusRaw = String(acao["Status"] || "").trim().toLowerCase();
    const investmentFlag = String(acao["Investment"] || "").trim().toLowerCase();
    const deadlineDate = serialToDate(acao["New Deadline"]) || serialToDate(acao["Deadline"]);

    return {
      no,
      _row: row,
      audit: acao["Audit"] || "",
      process: acao["Process"] || "",
      item: acao["Item"] || "",
      dept: acao["Dept. in charge"] || "",
      person: acao["Person in charge"] || "",
      status: statusRaw === "closed" ? "closed" : "open",
      statusRaw: acao["Status"] || "Open", // valor de verdade (Open/On Hold/Closed), pro editor
      occur: serialToDateISO(acao["Occur. Date"]),
      deadlineOriginal: serialToDateISO(acao["Deadline"]),
      deadline: serialToDateISO(acao["New Deadline"]) || serialToDateISO(acao["Deadline"]),
      deadlineISO: deadlineDate ? deadlineDate.toISOString().slice(0, 10) : null,
      delayReason: acao["Delay reason"] || "",
      investmentFlag: investmentFlag === "yes" ? "yes" : "no",
      target: computeTarget(investmentFlag, itens, statusRaw),
      investment: investimentoDisplay(itens) || "Sem investimento",
      itensInvestimento: itens.map((it) => ({
        row: it._row,
        item: it["Item"] || "",
        type: it["Type"] || "",
        quantity: it["Quantity"] ?? "",
        unitCost: it["Unit cost (BRL)"] ?? "",
        supplier: it["Supplier"] || "",
        requestApproval: it["Request Approval"] || "",
        stage: it["Stage"] || "",
        status: it["Status"] || "",
        remark: it["Remark"] || "",
      })),
      description: det["Description"] || acao["Description"] || "",
      expectation: det["Expectation"] || "",
      abrangency: det["Abrangency"] || "",
      steps: passosAcao.map((p, i) => [
        String(p["Ordem"] || i + 1),
        p["Ação"] || "",
        p["Responsável"] || "",
        p["Prazo"] || "",
        String(p["Status"] || "").toUpperCase() || (statusRaw === "closed" ? "CLOSED" : "OPEN"),
      ]),
      stepsEditable: passosAcao.map((p, i) => ({
        row: p._row,
        ordem: p["Ordem"] || i + 1,
        acao: p["Ação"] || "",
        responsavel: p["Responsável"] || "",
        prazo: p["Prazo"] || "",
        status: p["Status"] || "",
      })),
      factory: det["Factory Comment"] || "",
      hisense: det["Hisense Comment"] || "",
      auditor: acao["Audit"] || "",
      // "Foto Before"/"Foto Improvement" guardam a lista ORDENADA de IDs do
      // Drive, separada por virgula -- a ORDEM e o que decide o layout: os
      // 2 primeiros sao as fotos "principais" (grandes, lado a lado), o
      // resto aparece como miniatura. Mover uma foto (site) so reescreve
      // essa lista na ordem nova. Formato antigo (1 ID sem virgula)
      // continua funcionando, vira uma lista de 1.
      fotosBefore: parseFotoIds(det["Foto Before"]),
      fotosImprovement: parseFotoIds(det["Foto Improvement"]),
      isNew: isRecentlyCreated(det["Criado em"]),
    };
  });
}

export async function getDashboardStats() {
  const grupos = await readImprovementListRaw();
  let closed = 0,
    open = 0,
    delayed = 0,
    targetCount = 0,
    nonTargetCount = 0,
    fechaveisAgora = 0,
    precisaInvestimento = 0,
    naoPrecisaInvestimento = 0;
  const porDept = new Map();
  const porDeptDetalhe = new Map(); // dept -> {open, closed, delayed}
  const porAuditor = new Map(); // auditor -> {total, closed}
  let aprovado = 0,
    recusado = 0,
    pendente = 0,
    valorTotal = 0,
    totalItens = 0;
  const forecastPorSemana = new Map(); // "YYYY-Www" -> count (so acoes Open)
  const agingList = []; // {no, item, dias} -- so acoes ainda nao fechadas (Open/On Hold)
  const itensDetalhados = []; // todo item de investimento, com o contexto da acao -- pro kanban de acompanhamento

  grupos.forEach(({ acao, itens }) => {
    const status = String(acao["Status"] || "").trim();
    const statusRaw = status.toLowerCase();
    const isDelayed = String(acao["Time"] || "") === "Delayed";
    if (status === "Closed") closed++;
    else open++;
    if (isDelayed) delayed++;

    const investmentFlag = String(acao["Investment"] || "").trim().toLowerCase();
    if (investmentFlag === "yes") precisaInvestimento++;
    else naoPrecisaInvestimento++;

    if (computeTarget(investmentFlag, itens, statusRaw)) targetCount++;
    else nonTargetCount++;

    if (isFechavelAgora(investmentFlag, itens, statusRaw)) fechaveisAgora++;

    const dept = String(acao["Dept. in charge"] || "Sem departamento").trim().replace(/\s+/g, " ");
    porDept.set(dept, (porDept.get(dept) || 0) + 1);
    if (!porDeptDetalhe.has(dept)) porDeptDetalhe.set(dept, { open: 0, closed: 0, delayed: 0, pessoas: new Map() });
    const dd = porDeptDetalhe.get(dept);
    if (status === "Closed") dd.closed++;
    else dd.open++;
    if (isDelayed) dd.delayed++;

    const pessoa = String(acao["Person in charge"] || "").trim() || "Sem responsável";
    dd.pessoas.set(pessoa, (dd.pessoas.get(pessoa) || 0) + 1);

    const auditor = String(acao["Audit"] || "Sem auditor").trim();
    if (!porAuditor.has(auditor)) porAuditor.set(auditor, { total: 0, closed: 0 });
    const au = porAuditor.get(auditor);
    au.total++;
    if (status === "Closed") au.closed++;

    itens.forEach((it) => {
      const valor = (Number(it["Quantity"]) || 0) * (Number(it["Unit cost (BRL)"]) || 0);
      valorTotal += valor;
      totalItens++;
      if (it["Request Approval"] === "Approved") aprovado += valor;
      else if (it["Request Approval"] === "Declined") recusado += valor;
      else pendente += valor;

      itensDetalhados.push({
        acaoNo: normNo(acao["No."]),
        acaoItem: acao["Item"] || "",
        acaoStatus: status === "Closed" ? "closed" : "open",
        dept: dept,
        item: it["Item"] || "",
        quantity: it["Quantity"] ?? "",
        unitCost: it["Unit cost (BRL)"] ?? "",
        totalCost: Math.round(valor * 100) / 100,
        supplier: it["Supplier"] || "",
        person: it["Person in charge"] || acao["Person in charge"] || "",
        requestApproval: it["Request Approval"] || "",
        stage: it["Stage"] || "",
        deadline: serialToDateISO(acao["New Deadline"]) || serialToDateISO(acao["Deadline"]),
      });
    });

    if (statusRaw !== "closed") {
      const d = serialToDate(acao["New Deadline"]) || serialToDate(acao["Deadline"]);
      if (d) {
        const semana = isoWeekKey(d);
        forecastPorSemana.set(semana, (forecastPorSemana.get(semana) || 0) + 1);
      }
      const occurDate = serialToDate(acao["Occur. Date"]);
      if (occurDate) {
        const dias = Math.max(0, Math.round((Date.now() - occurDate.getTime()) / 86400000));
        agingList.push({ no: normNo(acao["No."]), item: acao["Item"] || "", dias });
      }
    }
  });

  const total = grupos.length;
  // todos os departamentos, sem agrupar os menores em "Outros" -- pedido
  // explicito do usuario (o card tem scroll pra caber a lista inteira).
  const porDepartamento = [...porDept.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  const forecast = [...forecastPorSemana.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(0, 12)
    .map(([semana, count]) => ({ semana, count }));

  const auditores = [...porAuditor.entries()]
    .map(([label, v]) => ({ label, total: v.total, closed: v.closed, taxaFechamento: v.total ? Math.round((v.closed / v.total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);

  const departamentosDetalhe = [...porDeptDetalhe.entries()]
    .map(([label, v]) => ({
      label,
      open: v.open,
      closed: v.closed,
      delayed: v.delayed,
      total: v.open + v.closed,
      // Map nao serializa no payload do Server Component -- vira array simples.
      pessoas: [...v.pessoas.entries()]
        .map(([nome, count]) => ({ nome, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.total - a.total);

  const AGING_FAIXAS = [
    { label: "0-15d", min: 0, max: 15 },
    { label: "16-30d", min: 16, max: 30 },
    { label: "31-60d", min: 31, max: 60 },
    { label: "61-90d", min: 61, max: 90 },
    { label: "90d+", min: 91, max: Infinity },
  ];
  const agingHistograma = AGING_FAIXAS.map((f) => ({
    label: f.label,
    count: agingList.filter((a) => a.dias >= f.min && a.dias <= f.max).length,
  }));
  const agingTop = [...agingList].sort((a, b) => b.dias - a.dias).slice(0, 8);
  const agingMedia = agingList.length ? Math.round(agingList.reduce((acc, a) => acc + a.dias, 0) / agingList.length) : 0;

  return {
    total,
    closed,
    open,
    delayed,
    porDepartamento,
    target: { target: targetCount, nonTarget: nonTargetCount },
    // Potencial de fechamento: quantas acoes AINDA ABERTAS ja poderiam ser
    // fechadas sem depender de aprovacao nova (nao precisam de investimento,
    // ou o investimento delas ja foi aprovado), e a que % de conclusao a
    // planilha chegaria se todas elas fossem fechadas.
    potencialFechamento: {
      fechaveis: fechaveisAgora,
      bloqueadas: open - fechaveisAgora,
      pctAtual: total ? Math.round((closed / total) * 100) : 0,
      pctPotencial: total ? Math.round(((closed + fechaveisAgora) / total) * 100) : 0,
    },
    investimento: {
      totalItens,
      valorTotal: Math.round(valorTotal * 100) / 100,
      aprovado: Math.round(aprovado * 100) / 100,
      recusado: Math.round(recusado * 100) / 100,
      pendente: Math.round(pendente * 100) / 100,
      acoesComInvestimento: precisaInvestimento,
      acoesSemInvestimento: naoPrecisaInvestimento,
    },
    forecast,
    auditores,
    departamentosDetalhe,
    aging: { histograma: agingHistograma, top: agingTop, media: agingMedia, total: agingList.length },
    itensDetalhados,
  };
}

// "W36 · 2026" no padrao ISO (semana comeca na segunda) -- usado so pro
// forecast, nao precisa bater com a coluna "Week" antiga da planilha
// (essa usava semana-comeca-domingo e nao e mais lida pelo site).
function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

// Upsert cirurgico: escreve SO a celula do campo pedido, na linha-ancora
// daquela acao -- nunca a linha inteira, nunca mexe em linha de
// continuacao de merge.
export async function updateAcaoField(no, field, value) {
  const col = EDITABLE_FIELD_TO_COL[field];
  if (!col) throw new Error(`Campo não editável: ${field}`);

  const grupos = await readImprovementListRaw();
  const alvo = grupos.find((g) => normNo(g.acao["No."]) === normNo(no));
  if (!alvo) throw new Error(`Ação ${no} não encontrada.`);

  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB_IMPROVEMENT}!${col}${alvo.row}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[value]] },
  });
}

// Cria uma acao nova, escrevendo numa linha logo apos a ultima ja usada
// (a copia em Google Sheets nao tem pivot table/grafico -- ao contrario
// do Excel original, nao ha risco de "range de pivot cache" aqui, entao
// pode simplesmente ir pra proxima linha livre em vez de precisar de
// linhas pre-formatadas reservadas). O "No." e um placeholder
// "NEW-<timestamp>" -- o numero de auditoria oficial da Hisense so e
// atribuido depois, por fora do site (mesmo comportamento documentado no
// fluxo antigo Excel/PPT).
export async function createAcao({ item, dept, person, occur, deadline, status, investmentFlag }) {
  if (!item || !String(item).trim()) throw new Error("Item é obrigatório.");

  const grupos = await readImprovementListRaw();
  let lastRow = 3; // linha 3 = cabecalho
  grupos.forEach((g) => {
    const rowsMax = Math.max(g.row, ...g.itens.map((it) => it.row), g.row);
    if (rowsMax > lastRow) lastRow = rowsMax;
  });
  const novaLinha = lastRow + 1;
  const no = `NEW-${Date.now()}`;

  const valores = {
    D: no,
    E: item,
    H: person || "",
    I: dept || "",
    J: occur || "",
    L: deadline || "",
    T: status || "Open",
    S: investmentFlag === "yes" ? "Yes" : "No",
  };
  const data = Object.entries(valores)
    .filter(([, v]) => v !== "")
    .map(([col, v]) => ({ range: `${TAB_IMPROVEMENT}!${col}${novaLinha}`, values: [[v]] }));

  const sheets = getSheets();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { valueInputOption: "USER_ENTERED", data },
  });

  await setPptDetalhesField(no, "Criado em", new Date().toISOString().slice(0, 10));

  return no;
}

// Edita um item de investimento JA EXISTENTE pelo numero da linha (o
// cliente recebe `row` de getAcoes().itensInvestimento e manda de volta).
// Nao cria linha nova -- adicionar um item novo exige inserir linha e
// tratar merge, ainda nao implementado (ver CLAUDE.md).
export async function updateInvestmentItemField(row, field, value) {
  const col = INVEST_EDITABLE_FIELD_TO_COL[field];
  if (!col) throw new Error(`Campo de investimento não editável: ${field}`);
  const rowNum = Number(row);
  if (!rowNum || rowNum < 4) throw new Error("Linha de item de investimento inválida.");

  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB_IMPROVEMENT}!${col}${rowNum}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[value]] },
  });
}

// Troca o ID (coluna No.) de uma acao, propagando o vinculo pras abas que
// guardam "No." como chave propria (PPT_Detalhes = 1 linha, PPT_Passos =
// N linhas) -- sem isso a troca "descolaria" fotos/plano de acao/comentarios
// da acao. Itens de investimento NAO precisam de propagacao: ficam
// vinculados por linha absoluta dentro do grupo, nao pelo texto do No.
export async function renameAcaoId(oldNo, newNo) {
  const novo = normNo(newNo);
  if (!novo) throw new Error("Novo ID não pode ser vazio.");

  const grupos = await readImprovementListRaw();
  const alvo = grupos.find((g) => normNo(g.acao["No."]) === normNo(oldNo));
  if (!alvo) throw new Error(`Ação ${oldNo} não encontrada.`);

  if (novo !== normNo(oldNo) && grupos.some((g) => normNo(g.acao["No."]) === novo)) {
    throw new Error(`Já existe uma ação com o ID ${novo}.`);
  }

  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB_IMPROVEMENT}!D${alvo.row}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[novo]] },
  });

  const [detalhes, passos] = await Promise.all([readSimpleTab(TAB_DETALHES), readSimpleTab(TAB_PASSOS)]);
  const detLinha = detalhes.rows.find((r) => normNo(r["No."]) === normNo(oldNo));
  const passosLinhas = passos.rows.filter((r) => normNo(r["No."]) === normNo(oldNo));

  const data = [];
  if (detLinha) data.push({ range: `${TAB_DETALHES}!A${detLinha._row}`, values: [[novo]] });
  passosLinhas.forEach((p) => data.push({ range: `${TAB_PASSOS}!A${p._row}`, values: [[novo]] }));

  if (data.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { valueInputOption: "USER_ENTERED", data },
    });
  }

  return novo;
}

// Exclui uma acao por completo -- limpa (nao desloca linhas, mesmo padrao
// "soft delete" usado no resto do projeto) todas as linhas fisicas que ela
// ocupa na Improvement List (a linha ancora MAIS qualquer linha de
// continuacao de merge, quando a acao tem mais de 1 item de investimento),
// a linha dela na PPT_Detalhes, e todas as linhas dela na PPT_Passos.
export async function deleteAcao(no) {
  const grupos = await readImprovementListRaw();
  const alvo = grupos.find((g) => normNo(g.acao["No."]) === normNo(no));
  if (!alvo) throw new Error(`Ação ${no} não encontrada.`);

  const linhasImprovement = new Set([alvo.row, ...alvo.itens.map((it) => it._row)]);

  const [detalhes, passos] = await Promise.all([readSimpleTab(TAB_DETALHES), readSimpleTab(TAB_PASSOS)]);
  const detLinha = detalhes.rows.find((r) => normNo(r["No."]) === normNo(no));
  const passosLinhas = passos.rows.filter((r) => normNo(r["No."]) === normNo(no));

  const sheets = getSheets();
  const data = [
    ...[...linhasImprovement].map((row) => ({ range: `${TAB_IMPROVEMENT}!B${row}:AL${row}` })),
    ...(detLinha ? [{ range: `${TAB_DETALHES}!A${detLinha._row}:Z${detLinha._row}` }] : []),
    ...passosLinhas.map((p) => ({ range: `${TAB_PASSOS}!A${p._row}:F${p._row}` })),
  ];

  await Promise.all(data.map(({ range }) => sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range, requestBody: {} })));
}

const MAX_PASSOS = 10;
const PASSO_FIELD_TO_COL = { ordem: "B", acao: "C", responsavel: "D", prazo: "E", status: "F" };

// Edita um passo JA EXISTENTE do plano de acao, pelo numero da linha (o
// cliente recebe `row` de getAcoes().stepsEditable).
export async function updatePassoField(row, field, value) {
  const col = PASSO_FIELD_TO_COL[field];
  if (!col) throw new Error(`Campo de passo não editável: ${field}`);
  const rowNum = Number(row);
  if (!rowNum || rowNum < 2) throw new Error("Linha de passo inválida.");

  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB_PASSOS}!${col}${rowNum}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[value]] },
  });
}

// Adiciona um passo novo ao plano de acao (maximo 10 por acao -- pedido
// explicito do usuario, o slide compensa isso encolhendo a zona de foto).
export async function addPasso(no, { ordem, acao, responsavel, prazo, status }) {
  const { rows } = await readSimpleTab(TAB_PASSOS);
  const existentes = rows.filter((r) => normNo(r["No."]) === normNo(no));
  if (existentes.length >= MAX_PASSOS) {
    throw new Error(`Limite de ${MAX_PASSOS} passos por ação atingido.`);
  }

  const novaLinha = rows.length ? Math.max(...rows.map((r) => r._row)) + 1 : 2;
  const valores = {
    A: no,
    B: ordem || existentes.length + 1,
    C: acao || "",
    D: responsavel || "",
    E: prazo || "",
    F: status || "Open",
  };
  const data = Object.entries(valores).map(([col, v]) => ({
    range: `${TAB_PASSOS}!${col}${novaLinha}`,
    values: [[v]],
  }));

  const sheets = getSheets();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { valueInputOption: "USER_ENTERED", data },
  });

  return novaLinha;
}

// "Remove" um passo limpando a linha (nao desloca as linhas de baixo --
// leitura ja ignora linhas totalmente em branco, mesmo padrao usado no
// resto do projeto).
export async function deletePasso(row) {
  const rowNum = Number(row);
  if (!rowNum || rowNum < 2) throw new Error("Linha de passo inválida.");

  const sheets = getSheets();
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: `${TAB_PASSOS}!A${rowNum}:F${rowNum}`,
    requestBody: {},
  });
}

async function _pptDetalhesColLetter(headers, campo) {
  const idx = headers.indexOf(campo);
  if (idx !== -1) return { colIdx: idx, isNovaColuna: false };
  return { colIdx: headers.length, isNovaColuna: true };
}

// Escreve um campo qualquer da aba PPT_Detalhes (texto do documento, foto,
// etc.) pra uma acao -- cria a coluna se ela ainda nao existir, e cria a
// linha da acao se ela ainda nao tiver nenhuma linha nessa aba.
export async function setPptDetalhesField(no, campo, valor) {
  const { headers, rows } = await readSimpleTab(TAB_DETALHES);
  const sheets = getSheets();
  const { colIdx, isNovaColuna } = await _pptDetalhesColLetter(headers, campo);

  if (isNovaColuna) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${TAB_DETALHES}!${colLetter(colIdx)}1`,
      valueInputOption: "RAW",
      requestBody: { values: [[campo]] },
    });
  }

  const existente = rows.find((r) => normNo(r["No."]) === normNo(no));
  const linha = existente ? existente._row : (rows.length ? Math.max(...rows.map((r) => r._row)) + 1 : 2);

  if (!existente) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${TAB_DETALHES}!A${linha}`,
      valueInputOption: "RAW",
      requestBody: { values: [[no]] },
    });
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB_DETALHES}!${colLetter(colIdx)}${linha}`,
    valueInputOption: "RAW",
    requestBody: { values: [[valor]] },
  });
}

async function _getDetalhesRawField(no, campo) {
  const { rows } = await readSimpleTab(TAB_DETALHES);
  const linha = rows.find((r) => normNo(r["No."]) === normNo(no));
  return linha ? linha[campo] || "" : "";
}

// Adiciona uma foto na lista daquele lado (Before/After) -- nao
// sobrescreve mais as que ja tinha, ate MAX_FOTOS_POR_LADO.
export async function appendPptDetalhesFoto(no, campo, driveFileId) {
  const atual = parseFotoIds(await _getDetalhesRawField(no, campo));
  if (atual.length >= MAX_FOTOS_POR_LADO) {
    throw new Error(`Limite de ${MAX_FOTOS_POR_LADO} fotos por lado atingido.`);
  }
  atual.push(driveFileId);
  return setPptDetalhesField(no, campo, formatFotoIds(atual));
}

// Remove SO a foto especifica da lista (as outras continuam).
export async function removePptDetalhesFoto(no, campo, driveFileId) {
  const atual = parseFotoIds(await _getDetalhesRawField(no, campo));
  const novaLista = atual.filter((id) => id !== driveFileId);
  return setPptDetalhesField(no, campo, formatFotoIds(novaLista));
}

export async function clearPptDetalhesFoto(no, campo) {
  return setPptDetalhesField(no, campo, "");
}

function colLetter(idx0) {
  let letters = "";
  let n = idx0 + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}
