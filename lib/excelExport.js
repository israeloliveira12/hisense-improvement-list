// Modulo SERVIDOR -- monta a planilha de auditoria (.xlsx) com TODAS as
// acoes e TODOS os passos de plano de acao, pra conferencia fora do site.
//
// Ao contrario do deck de PPT, aqui nao tem foto nenhuma -- entao nao
// existe o problema de tamanho/tempo que forcou o "baixar tudo" do PPT a
// rodar no navegador (ver components/baixarDeck.js). Isso e so texto e
// numero: cabe tranquilo numa unica chamada de servidor.
//
// Segue o mesmo padrao do PPT pra idioma: cabecalhos e valores de sistema
// (Open/Closed/Approved/etc.) sao traduzidos via translate()/translateValue()
// de lib/i18n.js; o CONTEUDO real da planilha (titulo, descricao, nomes de
// pessoas) nunca e traduzido -- e o dado oficial. Moeda sempre em R$
// (BRL), independente do idioma -- mesma regra do PPT.
import ExcelJS from "exceljs";
import { translate as s, translateValue as sv, formatDateISO } from "./i18nCore";

const PURPLE = "FF5000BF";
const GREEN = "FF1E8E3E";
const AMBER = "FFB4680A";
const RED = "FFC62828";
const ROW_ATRASADA = "FFFDEDED";

function dt(iso, lang) {
  return iso ? formatDateISO(iso, lang) : "";
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function novaAba(wb, nome, colunas) {
  const sheet = wb.addWorksheet(nome, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = colunas;
  const headerRow = sheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PURPLE } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  });
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colunas.length } };
  return sheet;
}

function corStatus(statusUpper) {
  if (statusUpper === "CLOSED") return GREEN;
  if (statusUpper === "ON HOLD") return RED;
  return AMBER;
}

export async function buildAuditWorkbook(acoes, lang = "en") {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Hisense Improvement List";
  wb.created = new Date();
  const hoje = hojeISO();

  // --- Aba 1: Acoes (1 linha por acao, visao macro) -----------------------
  const shAcoes = novaAba(wb, s(lang, "excel.sheetAcoes"), [
    { header: s(lang, "excel.colNo"), key: "no", width: 10 },
    { header: s(lang, "excel.colItem"), key: "item", width: 30 },
    { header: s(lang, "excel.colDescription"), key: "description", width: 45 },
    { header: s(lang, "excel.colProcess"), key: "process", width: 16 },
    { header: s(lang, "excel.colDept"), key: "dept", width: 20 },
    { header: s(lang, "excel.colLeader"), key: "leader", width: 18 },
    { header: s(lang, "excel.colAuditor"), key: "auditor", width: 14 },
    { header: s(lang, "excel.colStatus"), key: "status", width: 12 },
    { header: s(lang, "excel.colTarget"), key: "target", width: 10 },
    { header: s(lang, "excel.colOccur"), key: "occur", width: 13 },
    { header: s(lang, "excel.colDeadlineOriginal"), key: "deadlineOriginal", width: 14 },
    { header: s(lang, "excel.colDeadlineNew"), key: "deadlineNew", width: 14 },
    { header: s(lang, "excel.colDelayReason"), key: "delayReason", width: 26 },
    { header: s(lang, "excel.colNeedsInvestment"), key: "needsInvestment", width: 13 },
    { header: s(lang, "excel.colInvestmentTotal"), key: "investmentTotal", width: 17 },
    { header: s(lang, "excel.colInvestmentStatus"), key: "investmentStatus", width: 15 },
    { header: s(lang, "excel.colExpectation"), key: "expectation", width: 32 },
    { header: s(lang, "excel.colAbrangency"), key: "abrangency", width: 26 },
    { header: s(lang, "excel.colFactoryComment"), key: "factoryComment", width: 28 },
    { header: s(lang, "excel.colHisenseComment"), key: "hisenseComment", width: 28 },
    { header: s(lang, "excel.colTotalSteps"), key: "totalSteps", width: 10 },
    { header: s(lang, "excel.colClosedSteps"), key: "closedSteps", width: 10 },
    { header: s(lang, "excel.colOpenSteps"), key: "openSteps", width: 10 },
    { header: s(lang, "excel.colPctDone"), key: "pctDone", width: 10 },
  ]);

  acoes.forEach((a) => {
    const totalPassos = a.steps.length;
    const fechados = a.steps.filter((p) => p[4] === "CLOSED").length;
    const abertos = totalPassos - fechados;
    const row = shAcoes.addRow({
      no: a.no,
      item: a.item,
      description: a.description,
      process: a.process,
      dept: a.dept,
      leader: a.person,
      auditor: a.audit,
      status: sv(lang, a.status === "closed" ? "Closed" : "Open"),
      target: a.target ? s(lang, "common.sim") : s(lang, "common.nao"),
      occur: dt(a.occur, lang),
      deadlineOriginal: dt(a.deadlineOriginal, lang),
      deadlineNew: dt(a.deadline, lang),
      delayReason: a.delayReason,
      needsInvestment: a.investmentFlag === "yes" ? s(lang, "common.sim") : s(lang, "common.nao"),
      investmentTotal: a.investmentInfo ? a.investmentInfo.total : 0,
      investmentStatus: a.investmentInfo ? sv(lang, a.investmentInfo.situacao) : "",
      expectation: a.expectation,
      abrangency: a.abrangency,
      factoryComment: a.factory,
      hisenseComment: a.hisense,
      totalSteps: totalPassos,
      closedSteps: fechados,
      openSteps: abertos,
      pctDone: totalPassos ? fechados / totalPassos : 0,
    });
    row.getCell("status").font = { color: { argb: a.status === "closed" ? GREEN : AMBER }, bold: true };
    row.getCell("investmentTotal").numFmt = '"R$" #,##0.00';
    row.getCell("pctDone").numFmt = "0%";
    ["description", "expectation", "abrangency", "factoryComment", "hisenseComment", "delayReason"].forEach((k) => {
      row.getCell(k).alignment = { wrapText: true, vertical: "top" };
    });
  });

  // --- Aba 2: Plano de Acao passo a passo (1 linha por passo) -------------
  const shPassos = novaAba(wb, s(lang, "excel.sheetPassos"), [
    { header: s(lang, "excel.colNo"), key: "no", width: 10 },
    { header: s(lang, "excel.colItem"), key: "item", width: 28 },
    { header: s(lang, "excel.colDescription"), key: "description", width: 40 },
    { header: s(lang, "excel.colDept"), key: "dept", width: 18 },
    { header: s(lang, "excel.colLeader"), key: "leader", width: 16 },
    { header: s(lang, "excel.colStepNo"), key: "stepNo", width: 8 },
    { header: s(lang, "excel.colStepAction"), key: "stepAction", width: 42 },
    { header: s(lang, "excel.colStepOwner"), key: "stepOwner", width: 18 },
    { header: s(lang, "excel.colStepDeadline"), key: "stepDeadline", width: 14 },
    { header: s(lang, "excel.colStepStatus"), key: "stepStatus", width: 12 },
    { header: s(lang, "excel.colLate"), key: "late", width: 10 },
    { header: s(lang, "excel.colParentStatus"), key: "parentStatus", width: 14 },
  ]);

  acoes.forEach((a) => {
    a.steps.forEach(([ordem, acaoPasso, responsavel, prazoISO, statusUpper]) => {
      const atrasado = Boolean(prazoISO) && prazoISO < hoje && statusUpper !== "CLOSED";
      const row = shPassos.addRow({
        no: a.no,
        item: a.item,
        description: a.description,
        dept: a.dept,
        leader: a.person,
        stepNo: ordem,
        stepAction: acaoPasso,
        stepOwner: responsavel,
        stepDeadline: dt(prazoISO, lang),
        stepStatus: sv(lang, statusUpper),
        late: atrasado ? s(lang, "common.sim") : s(lang, "common.nao"),
        parentStatus: sv(lang, a.status === "closed" ? "Closed" : "Open"),
      });
      row.getCell("stepStatus").font = { color: { argb: corStatus(statusUpper) }, bold: true };
      if (atrasado) {
        row.getCell("late").font = { color: { argb: RED }, bold: true };
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ROW_ATRASADA } };
        });
      }
      ["description", "stepAction"].forEach((k) => {
        row.getCell(k).alignment = { wrapText: true, vertical: "top" };
      });
    });
  });

  // --- Aba 3: Investimentos (1 linha por item comprado) -------------------
  const shInvest = novaAba(wb, s(lang, "excel.sheetInvestimentos"), [
    { header: s(lang, "excel.colNo"), key: "no", width: 10 },
    { header: s(lang, "excel.colInvestItem"), key: "item", width: 26 },
    { header: s(lang, "excel.colType"), key: "type", width: 14 },
    { header: s(lang, "excel.colQuantity"), key: "quantity", width: 10 },
    { header: s(lang, "excel.colUnitCost"), key: "unitCost", width: 15 },
    { header: s(lang, "excel.colTotalCost"), key: "totalCost", width: 16 },
    { header: s(lang, "excel.colSupplier"), key: "supplier", width: 22 },
    { header: s(lang, "excel.colApproval"), key: "approval", width: 13 },
    { header: s(lang, "excel.colStage"), key: "stage", width: 14 },
    { header: s(lang, "excel.colStatus"), key: "status", width: 12 },
    { header: s(lang, "excel.colRemark"), key: "remark", width: 26 },
  ]);

  acoes.forEach((a) => {
    (a.itensInvestimento || []).forEach((it) => {
      const qtd = Number(it.quantity) || 0;
      const custoUnit = Number(it.unitCost) || 0;
      const row = shInvest.addRow({
        no: a.no,
        item: it.item,
        type: it.type,
        quantity: qtd,
        unitCost: custoUnit,
        totalCost: qtd * custoUnit,
        supplier: it.supplier,
        approval: it.requestApproval ? sv(lang, it.requestApproval) : "",
        stage: it.stage,
        status: it.status ? sv(lang, it.status) : "",
        remark: it.remark,
      });
      row.getCell("unitCost").numFmt = '"R$" #,##0.00';
      row.getCell("totalCost").numFmt = '"R$" #,##0.00';
      row.getCell("remark").alignment = { wrapText: true, vertical: "top" };
    });
  });

  return wb;
}
