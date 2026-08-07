"use client";

import { useLanguage } from "../../lib/i18n";

const CIRC = 2 * Math.PI * 60;

export default function DashboardPrincipal({ stats }) {
  const { t } = useLanguage();
  const { total, closed, open, delayed, porDepartamento, potencialFechamento } = stats;
  const pctClosed = total ? (closed / total) * 100 : 0;
  const pctOpen = total ? (open / total) * 100 : 0;
  const closedLen = (pctClosed / 100) * CIRC;
  const openLen = (pctOpen / 100) * CIRC;
  const maxDept = Math.max(...porDepartamento.map((d) => d.count), 1);
  // Faixa "potencial" no anel: o pedaco que ainda da pra fechar sem nova
  // aprovacao. Comeca exatamente onde as fechadas terminam e vai ate onde a
  // conclusao chegaria -- por isso o offset e -closedLen (nao 0) e o
  // comprimento e so a diferenca. Desenhada com cor solida (nao opacidade)
  // pra nao borrar em cima da faixa laranja que esta embaixo.
  const fechaveis = potencialFechamento ? potencialFechamento.fechaveis : 0;
  const potencialLen = fechaveis
    ? ((potencialFechamento.pctPotencial - potencialFechamento.pctAtual) / 100) * CIRC
    : 0;

  return (
    <>
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">{t("dash.total")}</div>
          <div className="kpi-value">{total}</div>
          <div className="kpi-sub muted">{t("dash.anoBase")}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{t("dash.fechadas")}</div>
          <div className="kpi-value">{closed}</div>
          <div className="kpi-sub up">{Math.round(pctClosed)}{t("dash.doTotal")}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{t("dash.abertas")}</div>
          <div className="kpi-value">{open}</div>
          <div className="kpi-sub muted">{Math.round(pctOpen)}{t("dash.doTotal")}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{t("dash.atrasadas")}</div>
          <div className="kpi-value">{delayed}</div>
          <div className="kpi-sub warn">{t("dash.foraDoPrazo")}</div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3>{t("dash.statusAcoes")}</h3>
          <div className="chart-sub">{t("dash.openVsClosed")}</div>
          <svg width="100%" height="150" viewBox="0 0 200 150">
            <g transform="translate(100,75)">
              <circle r="60" fill="none" stroke="var(--border)" strokeWidth="22" />
              <circle r="60" fill="none" stroke="var(--amber)" strokeWidth="22" strokeDasharray={`${openLen} ${CIRC}`} strokeDashoffset={-closedLen} transform="rotate(-90)" />
              {fechaveis > 0 && (
                <circle
                  r="60" fill="none" stroke="#8FC7A2" strokeWidth="22"
                  strokeDasharray={`${potencialLen} ${CIRC}`} strokeDashoffset={-closedLen} transform="rotate(-90)"
                />
              )}
              <circle r="60" fill="none" stroke="var(--green)" strokeWidth="22" strokeDasharray={`${closedLen} ${CIRC}`} strokeDashoffset="0" transform="rotate(-90)" />
              <text textAnchor="middle" y="-2" fontSize="26" fontWeight="700" fill="var(--text)">{total}</text>
              <text textAnchor="middle" y="16" fontSize="10" fill="var(--text-muted)">ações</text>
            </g>
          </svg>
          <div className="legend">
            <div className="legend-item"><span className="sw" style={{ background: "var(--green)" }} />{t("db.closed")} — {closed} ({Math.round(pctClosed)}%)</div>
            {fechaveis > 0 && (
              <div className="legend-item"><span className="sw" style={{ background: "#8FC7A2" }} />{t("dash.podeFechar")} — {fechaveis}</div>
            )}
            <div className="legend-item"><span className="sw" style={{ background: "var(--amber)" }} />{t("db.open")} — {open} ({Math.round(pctOpen)}%)</div>
          </div>
          {potencialFechamento && (
            <div className="footer-note">
              {t("dash.potencialNota", {
                n: potencialFechamento.fechaveis,
                pctAtual: potencialFechamento.pctAtual,
                pctPotencial: potencialFechamento.pctPotencial,
              })}
            </div>
          )}
        </div>

        <div className="chart-card">
          <h3>{t("dash.porDepto")}</h3>
          <div className="chart-sub">{t("dash.deptSub")}</div>
          {porDepartamento.map((d) => (
            <div className="bar-row" key={d.label}>
              <div className="b-label">{d.label}</div>
              <div className="b-track"><div className="b-fill" style={{ width: `${(d.count / maxDept) * 100}%` }} /></div>
              <div className="b-val">{d.count}</div>
            </div>
          ))}
        </div>
      </div>

    </>
  );
}
