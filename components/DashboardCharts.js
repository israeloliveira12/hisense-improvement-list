"use client";

import { useState } from "react";
import Topbar from "./Topbar";
import { useLanguage } from "../lib/i18n";

const CIRC = 2 * Math.PI * 60;

function formatBRL(v) {
  return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DashboardCharts({ initialStats, initialError }) {
  const { t } = useLanguage();
  const [stats, setStats] = useState(initialStats);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  async function atualizar() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStats(data);
      setError(null);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  if (!stats) {
    return (
      <>
        <Topbar title={t("dash.title")} sub={t("dash.sub")} />
        <div className="config-banner">
          <b>{t("config.title")}</b>
          {t("config.desc")}
        </div>
      </>
    );
  }

  const { total, closed, open, delayed, porDepartamento, investimento } = stats;
  const pctClosed = total ? (closed / total) * 100 : 0;
  const pctOpen = total ? (open / total) * 100 : 0;
  const closedLen = (pctClosed / 100) * CIRC;
  const openLen = (pctOpen / 100) * CIRC;
  const maxDept = Math.max(...porDepartamento.map((d) => d.count), 1);
  const pctAprovado = investimento.valorTotal ? (investimento.aprovado / investimento.valorTotal) * 100 : 0;
  const pctRecusado = investimento.valorTotal ? (investimento.recusado / investimento.valorTotal) * 100 : 0;

  return (
    <>
      <Topbar title={t("dash.title")} sub={t("dash.sub")}>
        <button className="btn btn-ghost" onClick={atualizar} disabled={loading}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 4v6h6M20 20v-6h-6M4.6 15a8 8 0 0014.4-3M19.4 9A8 8 0 005 12"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t("dash.atualizar")}
        </button>
      </Topbar>

      {error && (
        <div className="config-banner">
          <b>{t("config.title")}</b>
          {t("config.desc")}
        </div>
      )}

      <div className="view">
        <div className="view-inner">
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
                  <circle
                    r="60"
                    fill="none"
                    stroke="var(--green)"
                    strokeWidth="22"
                    strokeDasharray={`${closedLen} ${CIRC}`}
                    strokeDashoffset="0"
                    transform="rotate(-90)"
                  />
                  <circle
                    r="60"
                    fill="none"
                    stroke="var(--amber)"
                    strokeWidth="22"
                    strokeDasharray={`${openLen} ${CIRC}`}
                    strokeDashoffset={-closedLen}
                    transform="rotate(-90)"
                  />
                  <text textAnchor="middle" y="-2" fontSize="26" fontWeight="700" fill="var(--text)">
                    {total}
                  </text>
                  <text textAnchor="middle" y="16" fontSize="10" fill="var(--text-muted)">
                    ações
                  </text>
                </g>
              </svg>
              <div className="legend">
                <div className="legend-item">
                  <span className="sw" style={{ background: "var(--green)" }} />
                  {t("db.closed")} — {closed} ({Math.round(pctClosed)}%)
                </div>
                <div className="legend-item">
                  <span className="sw" style={{ background: "var(--amber)" }} />
                  {t("db.open")} — {open} ({Math.round(pctOpen)}%)
                </div>
              </div>
            </div>

            <div className="chart-card">
              <h3>{t("dash.porDepto")}</h3>
              <div className="chart-sub">{t("dash.deptSub")}</div>
              {porDepartamento.map((d) => (
                <div className="bar-row" key={d.label}>
                  <div className="b-label">{d.label}</div>
                  <div className="b-track">
                    <div className="b-fill" style={{ width: `${(d.count / maxDept) * 100}%` }} />
                  </div>
                  <div className="b-val">{d.count}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-card">
            <h3>{t("dash.investimento")}</h3>
            <div className="chart-sub">
              {t("dash.itensSolicitados", { n: investimento.totalItens, valor: formatBRL(investimento.valorTotal) })}
            </div>
            <div className="money-row">
              <div className="m-label" style={{ color: "var(--green)" }}>
                {t("dash.aprovado")}
              </div>
              <div className="m-track">
                <div className="m-fill" style={{ width: `${pctAprovado}%`, background: "var(--green)" }}>
                  {formatBRL(investimento.aprovado)}
                </div>
              </div>
            </div>
            <div className="money-row">
              <div className="m-label" style={{ color: "var(--red)" }}>
                {t("dash.recusado")}
              </div>
              <div className="m-track">
                <div className="m-fill" style={{ width: `${pctRecusado}%`, background: "var(--red)" }}>
                  {formatBRL(investimento.recusado)}
                </div>
              </div>
            </div>
            <div className="footer-note">{t("dash.footerNote")}</div>
          </div>
        </div>
      </div>
    </>
  );
}
