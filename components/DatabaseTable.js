"use client";

import { useMemo, useState } from "react";
import Topbar from "./Topbar";
import ActionEditor from "./ActionEditor";
import NewActionModal from "./NewActionModal";
import { useLanguage } from "../lib/i18n";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1SoK5AjfSUqI1XxHibq-nufrTKADgdRxVGFO5srXcehQ/edit";

export default function DatabaseTable({ acoes: initialAcoes, error }) {
  const { t, tv, dateInputLang } = useLanguage();
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [linhas, setLinhas] = useState(initialAcoes);
  const [status, setStatus] = useState({}); // { [no]: "saving" | "saved" | "error" }
  const [editando, setEditando] = useState(null);
  const [criandoNova, setCriandoNova] = useState(false);
  const [recarregando, setRecarregando] = useState(false);

  async function recarregarAcoes() {
    setRecarregando(true);
    try {
      const res = await fetch("/api/acoes");
      const data = await res.json();
      if (res.ok) setLinhas(data.acoes);
    } finally {
      setRecarregando(false);
    }
  }

  function aplicarMudancaLocal(no, campo, valor) {
    setLinhas((prev) => prev.map((a) => (a.no === no ? { ...a, [campo]: valor } : a)));
  }

  // Editor confirmou o salvamento relendo a acao da planilha -- troca o
  // objeto inteiro (mesma logica da Apresentacao).
  function substituirAcao(noAntigo, nova) {
    setLinhas((prev) => prev.map((a) => (a.no === noAntigo ? nova : a)));
    setEditando((atual) => (atual && atual.no === noAntigo ? nova : atual));
  }

  function acaoDeletada(no) {
    setLinhas((prev) => prev.filter((a) => a.no !== no));
    setEditando(null);
  }

  const contagens = useMemo(
    () => ({
      todas: linhas.length,
      open: linhas.filter((a) => a.status === "open").length,
      closed: linhas.filter((a) => a.status === "closed").length,
      investimento: linhas.filter((a) => a.investmentFlag === "yes").length,
    }),
    [linhas]
  );

  const filtradas = useMemo(() => {
    let base = linhas;
    if (filtro === "open") base = base.filter((a) => a.status === "open");
    if (filtro === "closed") base = base.filter((a) => a.status === "closed");
    if (filtro === "investimento") base = base.filter((a) => a.investmentFlag === "yes");

    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (a) =>
        a.no.toLowerCase().includes(q) ||
        (a.item || "").toLowerCase().includes(q) ||
        (a.person || "").toLowerCase().includes(q)
    );
  }, [linhas, filtro, query]);

  async function editarCampo(no, campo, valor) {
    setLinhas((prev) => prev.map((a) => (a.no === no ? { ...a, [campo]: valor } : a)));
    if (error) return; // sem Sheets conectado ainda -- so muda localmente
    setStatus((s) => ({ ...s, [no]: "saving" }));
    try {
      const res = await fetch(`/api/acoes/${encodeURIComponent(no)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: campo, value: valor }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setStatus((s) => ({ ...s, [no]: "saved" }));
      setTimeout(() => setStatus((s) => ({ ...s, [no]: undefined })), 2000);
    } catch (e) {
      setStatus((s) => ({ ...s, [no]: "error" }));
      alert(`${t("common.error")} (${no} · ${campo}): ${e.message}`);
    }
  }

  return (
    <>
      <Topbar title={t("db.title")}>
        <a className="btn btn-outline" href={SHEET_URL} target="_blank" rel="noopener noreferrer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="4" y="17" width="16" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          {t("db.abrirSheets")}
        </a>
        <button className="btn btn-primary" onClick={() => setCriandoNova(true)}>
          {t("db.novaAcao")}
        </button>
      </Topbar>

      {error && (
        <div className="config-banner">
          <b>{t("config.title")}</b>
          {t("config.desc")}
          <code className="config-raw">{error}</code>
        </div>
      )}

      <div className="view">
        <div className="view-inner">
          <div className="db-toolbar">
            <div className="search-box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
              </svg>
              <input
                placeholder={t("db.buscar")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {[
              ["todas", t("db.todas")],
              ["open", t("db.open")],
              ["closed", t("db.closed")],
              ["investimento", t("db.comInvestimento")],
            ].map(([key, label]) => (
              <button
                key={key}
                className={"filter-chip" + (filtro === key ? " active" : "")}
                onClick={() => setFiltro(key)}
              >
                {label} ({contagens[key]})
              </button>
            ))}
            <div className="sync-note">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {error ? t("common.demo") : t("db.syncNote")}
            </div>
          </div>

          <div className="table-card">
            <div className="table-scroll">
              <table className="db-table">
                <thead>
                  <tr>
                    <th>{t("db.col.no")}</th>
                    <th>{t("db.col.item")}</th>
                    <th>{t("db.col.dept")}</th>
                    <th>{t("db.col.process")}</th>
                    <th>{t("db.col.person")}</th>
                    <th>{t("db.col.status")}</th>
                    <th>{t("db.col.deadline")}</th>
                    <th>{t("db.col.investment")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((a) => (
                    <tr key={a.no}>
                      <td className="cell-no cell-no-clickable" onClick={() => setEditando(a)} title={t("pres.editarAcao")}>
                        {a.no}
                        {status[a.no] === "saving" && <span className="save-dot saving" title={t("common.saving")} />}
                        {status[a.no] === "saved" && <span className="save-dot saved" title={t("common.saved")} />}
                        {status[a.no] === "error" && <span className="save-dot error" title={t("common.error")} />}
                      </td>
                      <td
                        className="cell-item cell-editable"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => editarCampo(a.no, "item", e.currentTarget.textContent)}
                      >
                        {a.item}
                      </td>
                      <td
                        className="cell-editable"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => editarCampo(a.no, "dept", e.currentTarget.textContent)}
                      >
                        {a.dept}
                      </td>
                      <td
                        className="cell-editable"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => editarCampo(a.no, "process", e.currentTarget.textContent)}
                      >
                        {a.process}
                      </td>
                      <td
                        className="cell-editable"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => editarCampo(a.no, "person", e.currentTarget.textContent)}
                      >
                        {a.person}
                      </td>
                      <td>
                        <span className={"chip " + a.status}>
                          <span className="dot" />
                          {a.status === "closed" ? t("db.closed") : t("db.open")}
                        </span>
                      </td>
                      {/* a key faz o input (nao-controlado) remontar quando o
                          prazo muda no servidor -- sem ela ele continuaria
                          mostrando o valor antigo depois de editar pelo popup */}
                      <td>
                        <input
                          type="date"
                          className="cell-date-input"
                          lang={dateInputLang}
                          key={a.deadline || ""}
                          defaultValue={a.deadline || ""}
                          onChange={(e) => editarCampo(a.no, "deadline", e.target.value)}
                        />
                      </td>
                      <td>
                        <span className={"tag-inv " + a.investmentFlag}>
                          {a.investmentFlag === "yes" ? t("common.sim") : t("common.nao")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {editando && (
        <ActionEditor
          acao={editando}
          onClose={() => setEditando(null)}
          onFieldChanged={aplicarMudancaLocal}
          onSaved={substituirAcao}
          onDeleted={acaoDeletada}
        />
      )}

      {criandoNova && (
        <NewActionModal
          onClose={() => setCriandoNova(false)}
          onCreated={() => recarregarAcoes()}
        />
      )}
    </>
  );
}
