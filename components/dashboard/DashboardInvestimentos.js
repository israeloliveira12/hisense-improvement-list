"use client";

import { useLanguage } from "../../lib/i18n";

function formatBRL(v) {
  return "R$ " + (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DashboardInvestimentos({ stats }) {
  const { t } = useLanguage();
  const { investimento, target, total } = stats;
  const { valorTotal, aprovado, recusado, pendente, totalItens, acoesComInvestimento, acoesSemInvestimento } = investimento;
  const pctAprovado = valorTotal ? (aprovado / valorTotal) * 100 : 0;
  const pctRecusado = valorTotal ? (recusado / valorTotal) * 100 : 0;
  const pctPendente = valorTotal ? (pendente / valorTotal) * 100 : 0;
  const pctComInvest = total ? (acoesComInvestimento / total) * 100 : 0;

  return (
    <>
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">{t("dash.valorTotal")}</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{formatBRL(valorTotal)}</div>
          <div className="kpi-sub muted">{totalItens} {t("dash.itens")}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{t("dash.aprovado")}</div>
          <div className="kpi-value" style={{ fontSize: 22, color: "var(--green)" }}>{formatBRL(aprovado)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{t("dash.recusado")}</div>
          <div className="kpi-value" style={{ fontSize: 22, color: "var(--red)" }}>{formatBRL(recusado)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{t("dash.pendente")}</div>
          <div className="kpi-value" style={{ fontSize: 22, color: "var(--amber)" }}>{formatBRL(pendente)}</div>
        </div>
      </div>

      <div className="chart-card">
        <h3>{t("dash.investimento")}</h3>
        <div className="chart-sub">{t("dash.itensSolicitados", { n: totalItens, valor: formatBRL(valorTotal) })}</div>
        <div className="money-row">
          <div className="m-label" style={{ color: "var(--green)" }}>{t("dash.aprovado")}</div>
          <div className="m-track"><div className="m-fill" style={{ width: `${pctAprovado}%`, background: "var(--green)" }}>{formatBRL(aprovado)}</div></div>
        </div>
        <div className="money-row">
          <div className="m-label" style={{ color: "var(--amber)" }}>{t("dash.pendente")}</div>
          <div className="m-track"><div className="m-fill" style={{ width: `${pctPendente}%`, background: "var(--amber)" }}>{formatBRL(pendente)}</div></div>
        </div>
        <div className="money-row">
          <div className="m-label" style={{ color: "var(--red)" }}>{t("dash.recusado")}</div>
          <div className="m-track"><div className="m-fill" style={{ width: `${pctRecusado}%`, background: "var(--red)" }}>{formatBRL(recusado)}</div></div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3>{t("dash.precisaInvestimento")}</h3>
          <div className="chart-sub">{t("dash.deQuantasAcoes", { n: total })}</div>
          <svg width="100%" height="150" viewBox="0 0 200 150">
            <g transform="translate(100,75)">
              <circle r="60" fill="none" stroke="var(--border)" strokeWidth="22" />
              <circle r="60" fill="none" stroke="var(--purple)" strokeWidth="22"
                strokeDasharray={`${(pctComInvest / 100) * 2 * Math.PI * 60} ${2 * Math.PI * 60}`} transform="rotate(-90)" />
              <text textAnchor="middle" y="-2" fontSize="26" fontWeight="700" fill="var(--text)">{acoesComInvestimento}</text>
              <text textAnchor="middle" y="16" fontSize="10" fill="var(--text-muted)">{t("dash.precisamLabel")}</text>
            </g>
          </svg>
          <div className="legend">
            <div className="legend-item"><span className="sw" style={{ background: "var(--purple)" }} />{t("dash.precisamLabel")} — {acoesComInvestimento}</div>
            <div className="legend-item"><span className="sw" style={{ background: "var(--border)" }} />{t("dash.naoPrecisamLabel")} — {acoesSemInvestimento}</div>
          </div>
        </div>

        <div className="chart-card">
          <h3>{t("dash.facilFechar")}</h3>
          <div className="chart-sub">{t("dash.targetExplica")}</div>
          {target && (
            <>
              <div className="bar-row">
                <div className="b-label" style={{ color: "var(--green)" }}>Target</div>
                <div className="b-track"><div className="b-fill" style={{ width: `${total ? (target.target / total) * 100 : 0}%`, background: "var(--green)" }} /></div>
                <div className="b-val">{target.target}</div>
              </div>
              <div className="bar-row">
                <div className="b-label" style={{ color: "var(--amber)" }}>Non-target</div>
                <div className="b-track"><div className="b-fill" style={{ width: `${total ? (target.nonTarget / total) * 100 : 0}%`, background: "var(--amber)" }} /></div>
                <div className="b-val">{target.nonTarget}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
