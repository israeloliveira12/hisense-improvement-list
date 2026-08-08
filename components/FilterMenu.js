"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../lib/i18n";

// Filtros da Apresentacao: um switch pra ver so as acoes Open (oculta as
// Closed), e um seletor de departamento -- os dois combinam com a busca
// por texto que ja existia. Fica num dropdown do topbar, com uma bolinha
// mostrando quantos filtros estao ativos.
export default function FilterMenu({ apenasOpen, onToggleApenasOpen, apenasInvestimento, onToggleApenasInvestimento, departamentos, deptoFiltro, onChangeDepto }) {
  const { t, tv } = useLanguage();
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const ativos = (apenasOpen ? 1 : 0) + (apenasInvestimento ? 1 : 0) + (deptoFiltro ? 1 : 0);

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
          <label className="filter-switch-row">
            <span>{t("pres.somenteOpen")}</span>
            <span className="switch-wrap">
              <input type="checkbox" checked={apenasOpen} onChange={(e) => onToggleApenasOpen(e.target.checked)} />
              <span className="switch-track"><span className="switch-knob" /></span>
            </span>
          </label>

          <label className="filter-switch-row">
            <span>{t("pres.somenteInvestimento")}</span>
            <span className="switch-wrap">
              <input type="checkbox" checked={apenasInvestimento} onChange={(e) => onToggleApenasInvestimento(e.target.checked)} />
              <span className="switch-track"><span className="switch-knob" /></span>
            </span>
          </label>

          <div className="filter-divider" />

          <div className="filter-label">{t("pres.departamento")}</div>
          <select className="filter-select" value={deptoFiltro} onChange={(e) => onChangeDepto(e.target.value)}>
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
                onToggleApenasOpen(false);
                onToggleApenasInvestimento(false);
                onChangeDepto("");
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
