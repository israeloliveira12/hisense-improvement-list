"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../lib/i18n";

// Filtros da Apresentacao: um switch pra ver so as acoes Open (oculta as
// Closed), e um seletor de departamento -- os dois combinam com a busca
// por texto que ja existia. Fica num dropdown do topbar, com uma bolinha
// mostrando quantos filtros estao ativos.
export default function FilterMenu({ apenasOpen, onToggleApenasOpen, apenasInvestimento, onToggleApenasInvestimento, departamentos, deptosFiltro, onChangeDeptos }) {
  const { t, tv } = useLanguage();
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const selecionados = deptosFiltro || [];
  const ativos = (apenasOpen ? 1 : 0) + (apenasInvestimento ? 1 : 0) + (selecionados.length ? 1 : 0);

  function alternarDepto(d) {
    onChangeDeptos(
      selecionados.includes(d) ? selecionados.filter((x) => x !== d) : [...selecionados, d]
    );
  }

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

          <div className="filter-label">
            {t("pres.departamento")}
            {selecionados.length > 0 && (
              <span className="filter-label-count">{selecionados.length}</span>
            )}
          </div>
          {/* Lista de marcacao (nao mais um <select> de escolha unica) --
              da pra combinar quantos departamentos quiser. Nenhum marcado
              = todos, mesma semantica de antes. */}
          <div className="filter-check-list">
            <label className="filter-check-row filter-check-todos">
              <input
                type="checkbox"
                checked={selecionados.length === 0}
                // Marcar "todos" limpa a selecao; desmarcar nao faz sentido
                // (viraria "nenhum departamento", que nao mostra nada).
                onChange={() => onChangeDeptos([])}
              />
              <span>{t("pres.todosDeptos")}</span>
            </label>
            {departamentos.map((d) => (
              <label className="filter-check-row" key={d}>
                <input
                  type="checkbox"
                  checked={selecionados.includes(d)}
                  onChange={() => alternarDepto(d)}
                />
                <span>{tv(d)}</span>
              </label>
            ))}
          </div>

          {ativos > 0 && (
            <button
              type="button"
              className="filter-clear"
              onClick={() => {
                onToggleApenasOpen(false);
                onToggleApenasInvestimento(false);
                onChangeDeptos([]);
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
