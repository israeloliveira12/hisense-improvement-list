"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../lib/i18n";

// Filtro do Dashboard: status (Todas/Open/Closed) + departamento -- os dois
// recortam o conjunto de acoes ANTES do servidor agregar (ver
// getDashboardStats em lib/googleSheets.js), entao afetam TODAS as abas do
// dashboard, sempre a que estiver selecionada no momento. Mesmo padrao
// visual do FilterMenu da Apresentacao (dropdown no topbar, bolinha com
// contagem de filtros ativos).
export default function DashboardFilterMenu({ status, onChangeStatus, investimento, onChangeInvestimento, departamentos, dept, onChangeDept, mostrarRecusados, onToggleMostrarRecusados }) {
  const { t, tv } = useLanguage();
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const ativos = (status ? 1 : 0) + (investimento ? 1 : 0) + (dept ? 1 : 0);

  useEffect(() => {
    function onClickFora(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, []);

  return (
    <div className="topbar-dropdown" ref={ref}>
      <button
        type="button"
        className={"icon-btn" + (ativos ? " has-badge" : "")}
        title={t("pres.filtros")}
        onClick={() => setAberto((a) => !a)}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16M7 12h10M11 19h2" />
        </svg>
        {ativos > 0 && <span className="icon-btn-badge">{ativos}</span>}
      </button>
      {aberto && (
        <div className="topbar-dropdown-pop filter-pop">
          <div className="filter-label">{t("dash.filtroStatus")}</div>
          <select className="filter-select" value={status} onChange={(e) => onChangeStatus(e.target.value)}>
            <option value="">{t("dash.filtroStatusTodas")}</option>
            <option value="open">{t("db.open")}</option>
            <option value="closed">{t("db.closed")}</option>
          </select>

          <div className="filter-divider" />

          <div className="filter-label">{t("dash.filtroInvestimento")}</div>
          <select className="filter-select" value={investimento} onChange={(e) => onChangeInvestimento(e.target.value)}>
            <option value="">{t("dash.filtroInvestTodos")}</option>
            <option value="yes">{t("dash.filtroInvestSim")}</option>
            <option value="no">{t("dash.filtroInvestNao")}</option>
          </select>

          <div className="filter-divider" />

          <label className="filter-switch-row">
            <span>{t("dash.mostrarRecusados")}</span>
            <span className="switch-wrap">
              <input type="checkbox" checked={mostrarRecusados} onChange={(e) => onToggleMostrarRecusados(e.target.checked)} />
              <span className="switch-track"><span className="switch-knob" /></span>
            </span>
          </label>

          <div className="filter-divider" />

          <div className="filter-label">{t("pres.departamento")}</div>
          <select className="filter-select" value={dept} onChange={(e) => onChangeDept(e.target.value)}>
            <option value="">{t("pres.todosDeptos")}</option>
            {departamentos.map((d) => (
              <option key={d} value={d}>{tv(d)}</option>
            ))}
          </select>

          {ativos > 0 && (
            <button
              type="button"
              className="filter-clear"
              onClick={() => {
                onChangeStatus("");
                onChangeInvestimento("");
                onChangeDept("");
              }}
            >
              {t("pres.limparFiltros")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
