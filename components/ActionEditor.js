"use client";

import { useRef, useState } from "react";
import { useLanguage } from "../lib/i18n";

// Status geral da acao: so Open/Closed (sem On Hold -- pedido explicito,
// "on hold" so faz sentido no nivel de passo do plano de acao).
const STATUS_OPTIONS = ["Open", "Closed"];
const APPROVAL_OPTIONS = ["", "Approved", "Declined"];
const STAGE_OPTIONS = ["", "Preparing", "In Transit", "Delivered"];
const STAGE_LABEL_KEYS = { Preparing: "dash.etapaPreparing", "In Transit": "dash.etapaInTransit", Delivered: "dash.etapaDelivered" };
const PASSO_STATUS_OPTIONS = ["Open", "Closed", "On Hold"];
const MAX_PASSOS = 10;

function SaveDot({ status }) {
  if (!status) return null;
  return <span className={"save-dot " + status} />;
}

// `steps` (formato de exibicao, array de arrays -- o que Slide.js/PPT
// consomem) precisa ser recalculado toda vez que `stepsEditable` (formato
// de edicao, usado so aqui no editor) muda, e mandado pro componente pai
// via onFieldChanged -- senao o slide por tras do editor e o PPT baixado
// ficam com os passos desatualizados (bug: editar/adicionar passo "nao
// salva" -- salvava no servidor, so o preview local que nao via a mudanca).
function stepsParaArray(stepsEditable) {
  return (stepsEditable || []).map((p) => [
    String(p.ordem ?? ""),
    p.acao || "",
    p.responsavel || "",
    p.prazo || "",
    String(p.status || "Open").toUpperCase(),
  ]);
}

// Mesma logica de investimentoDisplay() do servidor (lib/googleSheets.js),
// reaproveitada aqui pro resumo (acao.investment) tambem ficar em dia
// depois de editar um item pelo editor, sem precisar recarregar a pagina.
function investimentoDisplayClient(itens) {
  if (!itens || !itens.length) return null;
  const total = itens.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitCost) || 0), 0);
  const situacao = { Approved: "Approved", Declined: "Declined" }[itens[0].requestApproval] || "Pending";
  const totalBRL = "R$ " + (total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${totalBRL} · ${situacao}`;
}

export default function ActionEditor({ acao, onClose, onFieldChanged, onDeleted }) {
  const { t, dateInputLang } = useLanguage();
  const [tab, setTab] = useState("geral");
  const [status, setStatus] = useState({}); // { [key]: "saving"|"saved"|"error" }
  const [local, setLocal] = useState(acao);
  const [excluindo, setExcluindo] = useState(false);
  const [novoInv, setNovoInv] = useState(null); // null = form fechado; objeto = form aberto com os valores digitados
  // Campos de texto/select/data NAO salvam mais sozinhos ao perder o foco --
  // só ficam pendentes aqui (ref, nao state, pra "agendar" durante um
  // onBlur ler o valor mais recente sem esperar re-render) ate o usuario
  // fechar o editor (X, clicar fora, ou "Salvar e fechar"), que dispara
  // salvarPendentes() e manda tudo de uma vez. Pedido explicito do usuario:
  // antes, cada campo ja alterava o Google Sheets no exato momento em que
  // perdia o foco, antes de qualquer confirmacao de "salvar".
  const pendentesRef = useRef({});

  if (!local) return null;

  async function excluirAcao() {
    if (!window.confirm(t("pres.confirmarExcluirAcao", { no: local.no, item: local.item || "" }))) return;
    setExcluindo(true);
    try {
      const res = await fetch(`/api/acoes/${encodeURIComponent(local.no)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      onDeleted && onDeleted(local.no);
    } catch (e) {
      alert(`${t("common.error")}: ${e.message}`);
      setExcluindo(false);
    }
  }

  // So agenda o PATCH (guarda no ref) -- nao manda pro servidor ainda.
  // "pending" e um status novo do SaveDot (bolinha cinza: "mudou, ainda nao
  // salvou"), diferente de "saving"/"saved" que so aparecem durante o
  // flush de verdade (ver salvarPendentes).
  function agendar(url, statusKey, body) {
    pendentesRef.current[statusKey] = { url, body };
    setStatus((s) => ({ ...s, [statusKey]: "pending" }));
  }

  // Manda TODOS os campos pendentes de uma vez (em paralelo) -- chamado só
  // ao fechar o editor (X, clicar fora, ou "Salvar e fechar"), nunca por
  // um onBlur individual. Devolve false se algum PATCH falhou, pra quem
  // chamou decidir NAO fechar (evita perder a edicao silenciosamente).
  async function salvarPendentes() {
    const entradas = Object.entries(pendentesRef.current);
    pendentesRef.current = {};
    if (!entradas.length) return true;

    setStatus((s) => {
      const next = { ...s };
      entradas.forEach(([k]) => (next[k] = "saving"));
      return next;
    });

    const resultados = await Promise.all(
      entradas.map(async ([statusKey, { url, body }]) => {
        try {
          const res = await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
          return { statusKey, ok: true };
        } catch (e) {
          return { statusKey, ok: false, error: e.message };
        }
      })
    );

    setStatus((s) => {
      const next = { ...s };
      resultados.forEach(({ statusKey, ok }) => { next[statusKey] = ok ? "saved" : "error"; });
      return next;
    });

    const erros = resultados.filter((r) => !r.ok);
    if (erros.length) {
      alert(`${t("common.error")}: ${erros.map((e) => e.error).join("; ")}`);
      return false;
    }

    setTimeout(() => {
      setStatus((s) => {
        const next = { ...s };
        resultados.forEach(({ statusKey }) => { if (next[statusKey] === "saved") next[statusKey] = undefined; });
        return next;
      });
    }, 1500);
    return true;
  }

  // Fecha o editor SEMPRE passando por aqui (X, clicar fora, "Salvar e
  // fechar") -- garante que nenhum caminho de fechar descarta uma edicao
  // pendente. Da blur no campo focado primeiro (garante que o ultimo valor
  // digitado, ainda nao "commitado" via onBlur, entra na fila) e so fecha
  // de verdade se o flush inteiro deu certo.
  async function salvarEFechar() {
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
    const ok = await salvarPendentes();
    if (ok) onClose();
  }

  function salvarAcao(field, value) {
    setLocal((prev) => ({ ...prev, [field]: value }));
    onFieldChanged && onFieldChanged(local.no, field, value);
    agendar(`/api/acoes/${encodeURIComponent(local.no)}`, "acao." + field, { field, value });
  }

  function salvarStatus(value) {
    setLocal((prev) => ({ ...prev, statusRaw: value, status: value === "Closed" ? "closed" : "open" }));
    onFieldChanged && onFieldChanged(local.no, "status", value === "Closed" ? "closed" : "open");
    agendar(`/api/acoes/${encodeURIComponent(local.no)}`, "acao.status", { field: "status", value });
  }

  function salvarDetalhe(field, value) {
    setLocal((prev) => ({ ...prev, [field]: value }));
    onFieldChanged && onFieldChanged(local.no, field, value);
    agendar(`/api/detalhes/${encodeURIComponent(local.no)}`, "det." + field, { field, value });
  }

  function salvarInvestimento(row, field, value) {
    const novosItens = local.itensInvestimento.map((it) => (it.row === row ? { ...it, [field]: value } : it));
    setLocal((prev) => ({ ...prev, itensInvestimento: novosItens }));
    onFieldChanged && onFieldChanged(local.no, "investment", investimentoDisplayClient(novosItens) || "Sem investimento");
    agendar(`/api/investimento/${row}`, "inv." + row + "." + field, { field, value });
  }

  function salvarPasso(row, field, value) {
    const novosSteps = local.stepsEditable.map((p) => (p.row === row ? { ...p, [field]: value } : p));
    setLocal((prev) => ({ ...prev, stepsEditable: novosSteps }));
    onFieldChanged && onFieldChanged(local.no, "steps", stepsParaArray(novosSteps));
    agendar(`/api/passos/${row}`, "passo." + row + "." + field, { field, value });
  }

  async function adicionarPasso() {
    const ordem = (local.stepsEditable?.length || 0) + 1;
    setStatus((s) => ({ ...s, novoPasso: "saving" }));
    try {
      const res = await fetch("/api/passos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ no: local.no, ordem, acao: "", responsavel: "", prazo: "", status: "Open" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const novosSteps = [...(local.stepsEditable || []), { row: data.row, ordem, acao: "", responsavel: "", prazo: "", status: "Open" }];
      setLocal((prev) => ({ ...prev, stepsEditable: novosSteps }));
      onFieldChanged && onFieldChanged(local.no, "steps", stepsParaArray(novosSteps));
      setStatus((s) => ({ ...s, novoPasso: undefined }));
    } catch (e) {
      setStatus((s) => ({ ...s, novoPasso: undefined }));
      alert(`${t("common.error")}: ${e.message}`);
    }
  }

  async function removerPasso(row) {
    if (!window.confirm(t("pres.excluirPasso") + "?")) return;
    try {
      const res = await fetch(`/api/passos/${row}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const novosSteps = local.stepsEditable.filter((p) => p.row !== row);
      setLocal((prev) => ({ ...prev, stepsEditable: novosSteps }));
      onFieldChanged && onFieldChanged(local.no, "steps", stepsParaArray(novosSteps));
    } catch (e) {
      alert(`${t("common.error")}: ${e.message}`);
    }
  }

  // So funciona pro PRIMEIRO item de investimento da acao (escreve na
  // propria linha-ancora, que fica livre nesse caso) -- ver o aviso em
  // addInvestimentoItem (lib/googleSheets.js) sobre o limite de 1.
  async function adicionarInvestimento() {
    if (!novoInv?.item?.trim()) return;
    setStatus((s) => ({ ...s, novoInvestimento: "saving" }));
    try {
      const res = await fetch("/api/investimento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ no: local.no, ...novoInv }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const novoItem = {
        row: data.row,
        item: novoInv.item,
        quantity: novoInv.quantity || "",
        unitCost: novoInv.unitCost || "",
        supplier: novoInv.supplier || "",
        requestApproval: "",
        stage: "",
        status: "",
        remark: "",
      };
      const novosItens = [...(local.itensInvestimento || []), novoItem];
      setLocal((prev) => ({ ...prev, itensInvestimento: novosItens, investmentFlag: "yes" }));
      onFieldChanged && onFieldChanged(local.no, "investment", investimentoDisplayClient(novosItens) || "Sem investimento");
      // addInvestimentoItem (servidor) forca a flag "Investment" pra Yes
      // junto do primeiro item -- propaga aqui tambem, senao a tag
      // Yes/No do Banco de Dados fica desatualizada ate recarregar.
      onFieldChanged && onFieldChanged(local.no, "investmentFlag", "yes");
      setNovoInv(null);
      setStatus((s) => ({ ...s, novoInvestimento: undefined }));
    } catch (e) {
      setStatus((s) => ({ ...s, novoInvestimento: undefined }));
      alert(`${t("common.error")}: ${e.message}`);
    }
  }

  return (
    <div className="editor-overlay" onClick={salvarEFechar}>
      <div className="editor-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="editor-head">
          <div>
            <div className="editor-no">{t("edit.acaoNo")} {local.no}</div>
            <h4>{local.item}</h4>
          </div>
          <button type="button" className="editor-close" onClick={salvarEFechar}>✕</button>
        </div>

        <div className="editor-status-row">
          <span className={"slide-status-pill " + local.status}>{local.status === "closed" ? t("db.closed") : t("db.open")}</span>
          <select
            value={STATUS_OPTIONS.includes(local.statusRaw) ? local.statusRaw : "Open"}
            onChange={(e) => salvarStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <SaveDot status={status["acao.status"]} />
        </div>

        <div className="editor-tabs">
          <button className={tab === "geral" ? "active" : ""} onClick={() => setTab("geral")}>{t("edit.tabGeral")}</button>
          <button className={tab === "descricao" ? "active" : ""} onClick={() => setTab("descricao")}>{t("edit.tabDescricao")}</button>
          <button className={tab === "plano" ? "active" : ""} onClick={() => setTab("plano")}>
            {t("edit.tabPlano")} {local.stepsEditable?.length ? `(${local.stepsEditable.length})` : ""}
          </button>
          <button className={tab === "investimento" ? "active" : ""} onClick={() => setTab("investimento")}>
            {t("edit.tabInvestimento")} {local.itensInvestimento?.length ? `(${local.itensInvestimento.length})` : ""}
          </button>
        </div>

        <div className="editor-body">
          {tab === "geral" && (
            <>
              <div className="editor-field">
                <label>{t("edit.fieldId")} <SaveDot status={status["acao.no"]} /></label>
                <input
                  defaultValue={local.no}
                  onBlur={(e) => {
                    const novo = e.target.value.trim();
                    if (!novo || novo === local.no) {
                      e.target.value = local.no;
                      return;
                    }
                    if (window.confirm(t("edit.confirmChangeId", { atual: local.no, novo }))) {
                      salvarAcao("no", novo);
                    } else {
                      e.target.value = local.no;
                    }
                  }}
                />
              </div>
              <div className="editor-field">
                <label>{t("edit.fieldItem")} <SaveDot status={status["acao.item"]} /></label>
                <input defaultValue={local.item} onBlur={(e) => salvarAcao("item", e.target.value)} />
              </div>
              <div className="editor-row2">
                <div className="editor-field">
                  <label>{t("edit.fieldDept")} <SaveDot status={status["acao.dept"]} /></label>
                  <input defaultValue={local.dept} onBlur={(e) => salvarAcao("dept", e.target.value)} />
                </div>
                <div className="editor-field">
                  <label>{t("edit.fieldPerson")} <SaveDot status={status["acao.person"]} /></label>
                  <input defaultValue={local.person} onBlur={(e) => salvarAcao("person", e.target.value)} />
                </div>
              </div>
              <div className="editor-row2">
                <div className="editor-field">
                  <label>{t("edit.fieldAudit")} <SaveDot status={status["acao.audit"]} /></label>
                  <input defaultValue={local.audit} onBlur={(e) => salvarAcao("audit", e.target.value)} />
                </div>
                <div className="editor-field">
                  <label>{t("edit.fieldProcess")} <SaveDot status={status["acao.process"]} /></label>
                  <input defaultValue={local.process} onBlur={(e) => salvarAcao("process", e.target.value)} />
                </div>
              </div>
              <div className="editor-row2">
                <div className="editor-field">
                  <label>{t("edit.fieldOccur")} <SaveDot status={status["acao.occur"]} /></label>
                  <input type="date" lang={dateInputLang} defaultValue={local.occur} onChange={(e) => salvarAcao("occur", e.target.value)} />
                </div>
                <div className="editor-field">
                  <label>{t("edit.fieldTarget")}</label>
                  <div className="editor-readonly">{local.target ? t("edit.valueTarget") : t("edit.valueNonTarget")} <span className="hint">{t("edit.targetHint")}</span></div>
                </div>
              </div>
              <div className="editor-row2">
                <div className="editor-field">
                  <label>{t("edit.fieldDeadlineOriginal")} <SaveDot status={status["acao.deadlineOriginal"]} /></label>
                  <input type="date" lang={dateInputLang} defaultValue={local.deadlineOriginal} onChange={(e) => salvarAcao("deadlineOriginal", e.target.value)} />
                </div>
                <div className="editor-field">
                  <label>{t("edit.fieldNewDeadline")} <SaveDot status={status["acao.deadline"]} /></label>
                  <input type="date" lang={dateInputLang} defaultValue={local.deadline} onChange={(e) => salvarAcao("deadline", e.target.value)} />
                </div>
              </div>
              <div className="editor-field">
                <label>{t("edit.fieldDelayReason")} <SaveDot status={status["acao.delayReason"]} /></label>
                <input defaultValue={local.delayReason} onBlur={(e) => salvarAcao("delayReason", e.target.value)} />
              </div>
            </>
          )}

          {tab === "descricao" && (
            <>
              <div className="editor-field">
                <label>{t("edit.fieldDescription")} <SaveDot status={status["det.description"]} /></label>
                <textarea defaultValue={local.description} onBlur={(e) => salvarDetalhe("description", e.target.value)} />
              </div>
              <div className="editor-field">
                <label>{t("edit.fieldExpectation")} <SaveDot status={status["det.expectation"]} /></label>
                <textarea defaultValue={local.expectation} onBlur={(e) => salvarDetalhe("expectation", e.target.value)} />
              </div>
              <div className="editor-field">
                <label>{t("edit.fieldAbrangency")} <SaveDot status={status["det.abrangency"]} /></label>
                <textarea defaultValue={local.abrangency} onBlur={(e) => salvarDetalhe("abrangency", e.target.value)} />
              </div>
              <div className="editor-field">
                <label>{t("edit.fieldFactoryComment")} <SaveDot status={status["det.factory"]} /></label>
                <textarea defaultValue={local.factory} onBlur={(e) => salvarDetalhe("factory", e.target.value)} />
              </div>
              <div className="editor-field">
                <label>{t("edit.fieldHisenseComment")} <SaveDot status={status["det.hisense"]} /></label>
                <textarea defaultValue={local.hisense} onBlur={(e) => salvarDetalhe("hisense", e.target.value)} />
              </div>
            </>
          )}

          {tab === "plano" && (
            <>
              {(!local.stepsEditable || local.stepsEditable.length === 0) && (
                <p className="editor-empty">{t("edit.semPassos")}</p>
              )}
              {local.stepsEditable && local.stepsEditable.length > 0 && (
                <table className="editor-inv-table editor-plano-table">
                  <thead>
                    <tr><th style={{ width: 28 }}>#</th><th>{t("edit.colAcao")}</th><th style={{ width: 130 }}>{t("edit.colResponsavel")}</th><th style={{ width: 80 }}>{t("edit.colPrazo")}</th><th style={{ width: 90 }}>{t("edit.colStatus")}</th><th></th></tr>
                  </thead>
                  <tbody>
                    {local.stepsEditable.map((p) => (
                      <tr key={p.row}>
                        <td><input defaultValue={p.ordem} style={{ width: 24 }} onBlur={(e) => salvarPasso(p.row, "ordem", e.target.value)} /></td>
                        <td><textarea rows={2} defaultValue={p.acao} onBlur={(e) => salvarPasso(p.row, "acao", e.target.value)} /></td>
                        <td><input defaultValue={p.responsavel} onBlur={(e) => salvarPasso(p.row, "responsavel", e.target.value)} /></td>
                        <td><input type="date" lang={dateInputLang} defaultValue={p.prazo} onChange={(e) => salvarPasso(p.row, "prazo", e.target.value)} /></td>
                        <td>
                          <select
                            defaultValue={PASSO_STATUS_OPTIONS.includes(p.status) ? p.status : "Open"}
                            onChange={(e) => salvarPasso(p.row, "status", e.target.value)}
                            style={{ color: p.status === "Closed" ? "var(--green)" : p.status === "On Hold" ? "var(--red)" : "var(--amber)", fontWeight: 700 }}
                          >
                            {PASSO_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                        <td>
                          <button type="button" className="editor-remove-row" title={t("pres.excluirPasso")} onClick={() => removerPasso(p.row)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {(local.stepsEditable?.length || 0) < MAX_PASSOS ? (
                <div className="m-add-row-real" onClick={adicionarPasso}>
                  {status.novoPasso === "saving" ? t("common.saving") : t("pres.adicionarPasso")}
                </div>
              ) : (
                <p className="editor-note">{t("edit.limitePassos", { n: MAX_PASSOS })}</p>
              )}
            </>
          )}

          {tab === "investimento" && (
            <>
              {(!local.itensInvestimento || local.itensInvestimento.length === 0) && (
                <p className="editor-empty">{t("edit.semInvestimento")}</p>
              )}
              {local.itensInvestimento && local.itensInvestimento.length > 0 && (
                <table className="editor-inv-table">
                  <thead>
                    <tr><th>{t("edit.colItem")}</th><th>{t("edit.colQtd")}</th><th>{t("edit.colCustoUn")}</th><th>{t("edit.colFornecedor")}</th><th>{t("edit.colAprovacao")}</th><th>{t("edit.colEtapa")}</th></tr>
                  </thead>
                  <tbody>
                    {local.itensInvestimento.map((it) => (
                      <tr key={it.row}>
                        <td><input defaultValue={it.item} onBlur={(e) => salvarInvestimento(it.row, "item", e.target.value)} /></td>
                        <td><input defaultValue={it.quantity} style={{ width: 40 }} onBlur={(e) => salvarInvestimento(it.row, "quantity", e.target.value)} /></td>
                        <td><input defaultValue={it.unitCost} style={{ width: 70 }} onBlur={(e) => salvarInvestimento(it.row, "unitCost", e.target.value)} /></td>
                        <td><input defaultValue={it.supplier} onBlur={(e) => salvarInvestimento(it.row, "supplier", e.target.value)} /></td>
                        <td>
                          <select defaultValue={it.requestApproval} onChange={(e) => salvarInvestimento(it.row, "requestApproval", e.target.value)}>
                            {APPROVAL_OPTIONS.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
                          </select>
                        </td>
                        <td>
                          {it.requestApproval === "Approved" ? (
                            <select defaultValue={it.stage || ""} onChange={(e) => salvarInvestimento(it.row, "stage", e.target.value)}>
                              {STAGE_OPTIONS.map((o) => <option key={o} value={o}>{o ? t(STAGE_LABEL_KEYS[o]) : "—"}</option>)}
                              {it.stage && !STAGE_OPTIONS.includes(it.stage) && (
                                <option value={it.stage}>{it.stage} ({t("edit.etapaAntiga")})</option>
                              )}
                            </select>
                          ) : (
                            <span className="editor-etapa-disabled" title={t("edit.etapaRequerAprovacao")}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {local.itensInvestimento && local.itensInvestimento.length > 0 ? (
                <p className="editor-note">{t("edit.notaInvestimento")}</p>
              ) : novoInv ? (
                <div className="editor-add-inv-form">
                  <input
                    placeholder={t("edit.invItemPlaceholder")}
                    value={novoInv.item || ""}
                    onChange={(e) => setNovoInv((f) => ({ ...f, item: e.target.value }))}
                    autoFocus
                  />
                  <div className="editor-row2">
                    <input
                      placeholder={t("edit.colQtd")}
                      value={novoInv.quantity || ""}
                      onChange={(e) => setNovoInv((f) => ({ ...f, quantity: e.target.value }))}
                    />
                    <input
                      placeholder={t("edit.colCustoUn")}
                      value={novoInv.unitCost || ""}
                      onChange={(e) => setNovoInv((f) => ({ ...f, unitCost: e.target.value }))}
                    />
                  </div>
                  <input
                    placeholder={t("edit.colFornecedor")}
                    value={novoInv.supplier || ""}
                    onChange={(e) => setNovoInv((f) => ({ ...f, supplier: e.target.value }))}
                  />
                  <div className="editor-row2">
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ justifyContent: "center" }}
                      onClick={adicionarInvestimento}
                      disabled={status.novoInvestimento === "saving" || !novoInv.item?.trim()}
                    >
                      {status.novoInvestimento === "saving" ? t("common.saving") : t("edit.invSalvar")}
                    </button>
                    <button type="button" className="btn btn-ghost" style={{ justifyContent: "center" }} onClick={() => setNovoInv(null)}>
                      {t("pres.cancelar")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="m-add-row-real" onClick={() => setNovoInv({})}>
                  {t("edit.addInvestimento")}
                </div>
              )}
            </>
          )}
        </div>

        <div className="editor-footer">
          <button type="button" className="btn btn-primary editor-save-btn" onClick={salvarEFechar}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
            </svg>
            {t("pres.salvarEFechar")}
          </button>
        </div>

        <div className="editor-danger-zone">
          <button type="button" className="editor-delete-full" onClick={excluirAcao} disabled={excluindo}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z" />
            </svg>
            {t("pres.excluirAcao")}
          </button>
        </div>
      </div>
    </div>
  );
}
