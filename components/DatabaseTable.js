"use client";

import { useMemo, useState } from "react";

const FILTROS = [
  { key: "todas", label: "Todas" },
  { key: "open", label: "Open" },
  { key: "closed", label: "Closed" },
  { key: "investimento", label: "Com investimento" },
];

export default function DatabaseTable({ acoes }) {
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [linhas, setLinhas] = useState(acoes);

  const contagens = useMemo(
    () => ({
      todas: linhas.length,
      open: linhas.filter((a) => a.status === "open").length,
      closed: linhas.filter((a) => a.status === "closed").length,
      investimento: linhas.filter((a) => a.investment && a.investment.startsWith("R$")).length,
    }),
    [linhas]
  );

  const filtradas = useMemo(() => {
    let base = linhas;
    if (filtro === "open") base = base.filter((a) => a.status === "open");
    if (filtro === "closed") base = base.filter((a) => a.status === "closed");
    if (filtro === "investimento") base = base.filter((a) => a.investment && a.investment.startsWith("R$"));

    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (a) =>
        a.no.toLowerCase().includes(q) ||
        (a.item || "").toLowerCase().includes(q) ||
        (a.person || "").toLowerCase().includes(q)
    );
  }, [linhas, filtro, query]);

  function editarCampo(no, campo, valor) {
    setLinhas((prev) => prev.map((a) => (a.no === no ? { ...a, [campo]: valor } : a)));
  }

  return (
    <>
      <div className="topbar">
        <h1>
          Banco de Dados <span className="sub">aba &quot;Improvement List&quot;</span>
        </h1>
        <div className="topbar-actions">
          <button className="btn btn-outline">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="4" y="17" width="16" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            Abrir no Google Sheets
          </button>
          <button className="btn btn-primary">+ Nova ação</button>
        </div>
      </div>

      <div className="view">
        <div className="view-inner">
          <div className="db-toolbar">
            <div className="search-box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
              </svg>
              <input
                placeholder="Buscar por nº, item ou responsável…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {FILTROS.map((f) => (
              <button
                key={f.key}
                className={"filter-chip" + (filtro === f.key ? " active" : "")}
                onClick={() => setFiltro(f.key)}
              >
                {f.label} ({contagens[f.key]})
              </button>
            ))}
            <div className="sync-note">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Editar aqui atualiza o Google Sheets instantaneamente
            </div>
          </div>

          <div className="table-card">
            <div className="table-scroll">
              <table className="db-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Item</th>
                    <th>Dept. in charge</th>
                    <th>Person in charge</th>
                    <th>Status</th>
                    <th>Deadline</th>
                    <th>Investment</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((a) => (
                    <tr key={a.no}>
                      <td className="cell-no">{a.no}</td>
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
                        onBlur={(e) => editarCampo(a.no, "person", e.currentTarget.textContent)}
                      >
                        {a.person}
                      </td>
                      <td>
                        <span className={"chip " + a.status}>
                          <span className="dot" />
                          {a.status === "closed" ? "Closed" : "Open"}
                        </span>
                      </td>
                      <td
                        className="cell-editable"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => editarCampo(a.no, "deadline", e.currentTarget.textContent)}
                      >
                        {a.deadline || "—"}
                      </td>
                      <td>
                        <span className={"tag-inv " + (a.investment && a.investment.startsWith("R$") ? "yes" : "no")}>
                          {a.investment && a.investment.startsWith("R$") ? "Yes" : "No"}
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
    </>
  );
}
