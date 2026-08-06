// Modulo SERVIDOR (nunca importar de um "use client") -- fala com a copia
// em Google Sheets da planilha (ver README.md / CLAUDE.md pra como essa
// copia foi criada). So le/escreve o que precisa, nunca reescreve a aba
// inteira -- mesmo cuidado cirurgico ja usado no lado Excel do projeto.
import { google } from "googleapis";

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

const EDITABLE_FIELD_TO_COL = {
  item: "E",
  dept: "I",
  person: "H",
  deadline: "L",
};

let _client = null;

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!email || !key) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY não configuradas."
    );
  }
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheets() {
  if (!_client) {
    _client = google.sheets({ version: "v4", auth: getAuth() });
  }
  return _client;
}

// Sheets/Excel guardam data como numero serial (dias desde 1899-12-30).
function serialToDateBR(serial) {
  if (serial === "" || serial === null || serial === undefined) return null;
  const n = Number(serial);
  if (Number.isNaN(n)) return String(serial); // ja veio como texto
  const ms = Date.UTC(1899, 11, 30) + n * 86400000;
  const d = new Date(ms);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
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

// Le o bloco B3:AL da Improvement List e agrupa por No., cuidando de
// celulas mescladas (linha de continuacao de item de investimento vem com
// o bloco B:U vazio -- mesma logica de forward-fill do lado Python).
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
        const item = {};
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

// Ponto de entrada: devolve as acoes no MESMO formato que data/acoes.json
// (pra ser um substituto direto), agora lido ao vivo do Sheets.
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

    return {
      no,
      _row: row,
      item: acao["Item"] || "",
      dept: acao["Dept. in charge"] || "",
      person: acao["Person in charge"] || "",
      status: statusRaw === "closed" ? "closed" : "open",
      occur: serialToDateBR(acao["Occur. Date"]),
      deadline: serialToDateBR(acao["New Deadline"]) || serialToDateBR(acao["Deadline"]),
      target: acao["Target"] || "",
      investment: investimentoDisplay(itens) || "Sem investimento",
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
      factory: det["Factory Comment"] || "",
      hisense: det["Hisense Comment"] || "",
      auditor: acao["Audit"] || "",
      fotoBeforeId: det["Foto Before"] || null,
      fotoImprovementId: det["Foto Improvement"] || null,
    };
  });
}

export async function getDashboardStats() {
  const grupos = await readImprovementListRaw();
  let closed = 0,
    open = 0,
    delayed = 0;
  const porDept = new Map();
  let aprovado = 0,
    recusado = 0,
    valorTotal = 0,
    totalItens = 0;

  grupos.forEach(({ acao, itens }) => {
    const status = String(acao["Status"] || "").trim();
    if (status === "Closed") closed++;
    else open++;
    if (String(acao["Time"] || "") === "Delayed") delayed++;

    const dept = String(acao["Dept. in charge"] || "Sem departamento").trim().replace(/\s+/g, " ");
    porDept.set(dept, (porDept.get(dept) || 0) + 1);

    itens.forEach((it) => {
      const valor = (Number(it["Quantity"]) || 0) * (Number(it["Unit cost (BRL)"]) || 0);
      valorTotal += valor;
      totalItens++;
      if (it["Request Approval"] === "Approved") aprovado += valor;
      else if (it["Request Approval"] === "Declined") recusado += valor;
    });
  });

  const total = grupos.length;
  const topDept = [...porDept.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const outros = total - topDept.reduce((acc, [, c]) => acc + c, 0);
  const porDepartamento = topDept.map(([label, count]) => ({ label, count }));
  if (outros > 0) porDepartamento.push({ label: "Outros", count: outros });

  return {
    total,
    closed,
    open,
    delayed,
    porDepartamento,
    investimento: {
      totalItens,
      valorTotal: Math.round(valorTotal * 100) / 100,
      aprovado: Math.round(aprovado * 100) / 100,
      recusado: Math.round(recusado * 100) / 100,
    },
  };
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

export async function appendPptDetalhesFoto(no, campo, driveFileId) {
  // campo = "Foto Before" | "Foto Improvement" -- ver lib/googleDrive.js
  const { headers, rows } = await readSimpleTab(TAB_DETALHES);
  const sheets = getSheets();
  let colIdx = headers.indexOf(campo);

  if (colIdx === -1) {
    colIdx = headers.length;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${TAB_DETALHES}!${colLetter(colIdx)}1`,
      valueInputOption: "RAW",
      requestBody: { values: [[campo]] },
    });
  }

  const existente = rows.find((r) => normNo(r["No."]) === normNo(no));
  if (!existente) {
    // acao ainda sem linha em PPT_Detalhes -- cria uma nova, so com No. + a foto
    const novaLinha = rows.length ? Math.max(...rows.map((r) => r._row)) + 1 : 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${TAB_DETALHES}!A${novaLinha}`,
      valueInputOption: "RAW",
      requestBody: { values: [[no]] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${TAB_DETALHES}!${colLetter(colIdx)}${novaLinha}`,
      valueInputOption: "RAW",
      requestBody: { values: [[driveFileId]] },
    });
    return;
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB_DETALHES}!${colLetter(colIdx)}${existente._row}`,
    valueInputOption: "RAW",
    requestBody: { values: [[driveFileId]] },
  });
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
