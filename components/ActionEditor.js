"use client";

import { useState } from "react";
import { useLanguage } from "../lib/i18n";

const STATUS_OPTIONS = ["Open", "Under Review", "Closed"];
const APPROVAL_OPTIONS = ["", "Approved", "Declined"];
const STAGE_OPTIONS = ["", "Comercial", "On Hold", "Delivered"];
const PASSO_STATUS_OPTIONS = ["Open", "Closed"];
const MAX_PASSOS = 10;

function SaveDot({ status }) {
  if (!status) return null;
  return <span className={"save-dot " + status} />;
}

export default function ActionEditor({ acao, onClose, onFieldChanged }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState("geral");
  const [status, setStatus] = useState({}); // { [key]: "saving"|"saved"|"error" }
  const [local, setLocal] = useState(acao);

  if (!local) return null;

  async function salvar(url, field, value, statusKey) {
    setLocal((prev) => ({ ...prev, [field]: value }));
    onFieldChanged && onFieldChanged(local.no, field, value);
    setStatus((s) => ({ ...s, [statusKey]: "saving" }));
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setStatus((s) => ({ ...s, [statusKey]: "saved" }));
      setTimeout(() => setStatus((s) => ({ ...s, [statusKey]: undefined })), 2000);
    } catch (e) {
      setStatus((s) => ({ ...s, [statusKey]: "error" }));
      alert(`${t("common.error")}: ${e.message}`);
    }
  }

  function salvarAcao(field, value) {
    return salvar(`/api/acoes/${encodeURIComponent(local.no)}`, field, value, "acao." + field);
  }

  async function salvarStatus(value) {
    setLocal((prev) => ({ ...prev, statusRaw: value, status: value === "Closed" ? "closed" : "open" }));
    onFieldChanged && onFieldChanged(local.no, "status", value === "Closed" ? "closed" : "open");
    setStatus((s) => ({ ...s, "acao.status": "saving" }));
    try {
      const res = await fetch(`/api/acoes/${encodeURIComponent(local.no)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: "status", value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setStatus((s) => ({ ...s, "acao.status": "saved" }));
      setTimeout(() => setStatus((s) => ({ ...s, "acao.status": undefined })), 2000);
    } catch (e) {
      setStatus((s) => ({ ...s, "acao.status": "error" }));
      alert(`${t("common.error")}: ${e.message}`);
    }
  }
  function salvarDetalhe(field, value) {
    return salvar(`/api/detalhes/${encodeURIComponent(local.no)}`, field, value, "det." + field);
  }
  function salvarInvestimento(row, field, value) {
    setLocal((prev) => ({
      ...prev,
      itensInvestimento: prev.itensInvestimento.map((it) => (it.row === row ? { ...it, [field]: value } : it)),
    }));
    return salvar(`/api/investimento/${row}`, field, value, "inv." + row + "." + field);
  }

  async function salvarPasso(row, field, value) {
    setLocal((prev) => ({
      ...prev,
      stepsEditable: prev.stepsEditable.map((p) => (p.row === row ? { ...p, [field]: value } : p)),
    }));
    return salvar(`/api/passos/${row}`, field, value, "passo." + row + "." + field);
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
      setLocal((prev) => ({
        ...prev,
        stepsEditable: [...(prev.stepsEditable || []), { row: data.row, ordem, acao: "", responsavel: "", prazo: "", status: "Open" }],
      }));
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
      setLocal((prev) => ({ ...prev, stepsEditable: prev.stepsEditable.filter((p) => p.row !== row) }));
    } catch (e) {
      alert(`${t("common.error")}: ${e.message}`);
    }
  }

  return (
    <div className="editor-overlay" onClick={onClose}>
      <div className="editor-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="editor-head">
          <div>
            <div className="editor-no">AÇÃO Nº {local.no}</div>
            <h4>{local.item}</h4>
          </div>
          <button type="button" className="editor-close" onClick={onClose}>✕</button>
        </div>

        <div className="editor-status-row">
          <span className={"slide-status-pill " + local.status}>{local.status === "closed" ? "CLOSED" : "OPEN"}</span>
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
          <button className={tab === "geral" ? "active" : ""} onClick={() => setTab("geral")}>Geral</button>
          <button className={tab === "descricao" ? "active" : ""} onClick={() => setTab("descricao")}>Descrição</button>
          <button className={tab === "plano" ? "active" : ""} onClick={() => setTab("plano")}>
            Plano de Ação {local.stepsEditable?.length ? `(${local.stepsEditable.length})` : ""}
          </button>
          <button className={tab === "investimento" ? "active" : ""} onClick={() => setTab("investimento")}>
            Investimento {local.itensInvestimento?.length ? `(${local.itensInvestimento.length})` : ""}
          </button>
        </div>

        <div className="editor-body">
          {tab === "geral" && (
            <>
              <div className="editor-field">
                <label>Item <SaveDot status={status["acao.item"]} /></label>
                <input defaultValue={local.item} onBlur={(e) => salvarAcao("item", e.target.value)} />
              </div>
              <div className="editor-row2">
                <div className="editor-field">
                  <label>Dept. in charge <SaveDot status={status["acao.dept"]} /></label>
                  <input defaultValue={local.dept} onBlur={(e) => salvarAcao("dept", e.target.value)} />
                </div>
                <div className="editor-field">
                  <label>Person in charge <SaveDot status={status["acao.person"]} /></label>
                  <input defaultValue={local.person} onBlur={(e) => salvarAcao("person", e.target.value)} />
                </div>
              </div>
              <div className="editor-row2">
                <div className="editor-field">
                  <label>Audit <SaveDot status={status["acao.audit"]} /></label>
                  <input defaultValue={local.audit} onBlur={(e) => salvarAcao("audit", e.target.value)} />
                </div>
                <div className="editor-field">
                  <label>Process <SaveDot status={status["acao.process"]} /></label>
                  <input defaultValue={local.process} onBlur={(e) => salvarAcao("process", e.target.value)} />
                </div>
              </div>
              <div className="editor-row2">
                <div className="editor-field">
                  <label>Occur. date <SaveDot status={status["acao.occur"]} /></label>
                  <input defaultValue={local.occur} onBlur={(e) => salvarAcao("occur", e.target.value)} />
                </div>
                <div className="editor-field">
                  <label>Target</label>
                  <div className="editor-readonly">{local.target ? "Target" : "Non-target"} <span className="hint">(calculado — ver Dashboard)</span></div>
                </div>
              </div>
              <div className="editor-row2">
                <div className="editor-field">
                  <label>Deadline original <SaveDot status={status["acao.deadlineOriginal"]} /></label>
                  <input defaultValue={local.deadlineOriginal} onBlur={(e) => salvarAcao("deadlineOriginal", e.target.value)} />
                </div>
                <div className="editor-field">
                  <label>New deadline <SaveDot status={status["acao.deadline"]} /></label>
                  <input defaultValue={local.deadline} onBlur={(e) => salvarAcao("deadline", e.target.value)} />
                </div>
              </div>
              <div className="editor-field">
                <label>Delay reason <SaveDot status={status["acao.delayReason"]} /></label>
                <input defaultValue={local.delayReason} onBlur={(e) => salvarAcao("delayReason", e.target.value)} />
              </div>
            </>
          )}

          {tab === "descricao" && (
            <>
              <div className="editor-field">
                <label>Description <SaveDot status={status["det.description"]} /></label>
                <textarea defaultValue={local.description} onBlur={(e) => salvarDetalhe("description", e.target.value)} />
              </div>
              <div className="editor-field">
                <label>Expectation <SaveDot status={status["det.expectation"]} /></label>
                <textarea defaultValue={local.expectation} onBlur={(e) => salvarDetalhe("expectation", e.target.value)} />
              </div>
              <div className="editor-field">
                <label>Abrangency <SaveDot status={status["det.abrangency"]} /></label>
                <textarea defaultValue={local.abrangency} onBlur={(e) => salvarDetalhe("abrangency", e.target.value)} />
              </div>
              <div className="editor-field">
                <label>Factory Comment <SaveDot status={status["det.factory"]} /></label>
                <textarea defaultValue={local.factory} onBlur={(e) => salvarDetalhe("factory", e.target.value)} />
              </div>
              <div className="editor-field">
                <label>Hisense Comment <SaveDot status={status["det.hisense"]} /></label>
                <textarea defaultValue={local.hisense} onBlur={(e) => salvarDetalhe("hisense", e.target.value)} />
              </div>
            </>
          )}

          {tab === "plano" && (
            <>
              {(!local.stepsEditable || local.stepsEditable.length === 0) && (
                <p className="editor-empty">Nenhum passo cadastrado ainda.</p>
              )}
              {local.stepsEditable && local.stepsEditable.length > 0 && (
                <table className="editor-inv-table">
                  <thead>
                    <tr><th style={{ width: 28 }}>#</th><th>Ação</th><th>Responsável</th><th style={{ width: 60 }}>Prazo</th><th style={{ width: 70 }}>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {local.stepsEditable.map((p) => (
                      <tr key={p.row}>
                        <td><input defaultValue={p.ordem} style={{ width: 24 }} onBlur={(e) => salvarPasso(p.row, "ordem", e.target.value)} /></td>
                        <td><input defaultValue={p.acao} onBlur={(e) => salvarPasso(p.row, "acao", e.target.value)} /></td>
                        <td><input defaultValue={p.responsavel} onBlur={(e) => salvarPasso(p.row, "responsavel", e.target.value)} /></td>
                        <td><input defaultValue={p.prazo} onBlur={(e) => salvarPasso(p.row, "prazo", e.target.value)} /></td>
                        <td>
                          <select defaultValue={PASSO_STATUS_OPTIONS.includes(p.status) ? p.status : "Open"} onChange={(e) => salvarPasso(p.row, "status", e.target.value)}>
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
                <p className="editor-note">Limite de {MAX_PASSOS} passos atingido.</p>
              )}
            </>
          )}

          {tab === "investimento" && (
            <>
              {(!local.itensInvestimento || local.itensInvestimento.length === 0) && (
                <p className="editor-empty">Nenhum item de investimento lançado pra essa ação ainda.</p>
              )}
              {local.itensInvestimento && local.itensInvestimento.length > 0 && (
                <table className="editor-inv-table">
                  <thead>
                    <tr><th>Item</th><th>Qtd</th><th>Custo un. (R$)</th><th>Fornecedor</th><th>Aprovação</th><th>Etapa</th></tr>
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
                          <select defaultValue={it.stage} onChange={(e) => salvarInvestimento(it.row, "stage", e.target.value)}>
                            {STAGE_OPTIONS.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="editor-note">Adicionar um item de investimento novo ainda não é possível pelo site — edite direto na planilha por enquanto.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
