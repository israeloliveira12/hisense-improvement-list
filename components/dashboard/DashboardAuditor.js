"use client";

import { useLanguage } from "../../lib/i18n";

export default function DashboardAuditor({ stats }) {
  const { t } = useLanguage();
  const auditores = stats.auditores || [];
  const max = Math.max(...auditores.map((a) => a.total), 1);

  return (
    <div className="chart-card">
      <h3>{t("dash.auditorTitulo")}</h3>
      <div className="chart-sub">{t("dash.auditorSub")}</div>
      {auditores.map((a) => (
        <div className="bar-row" key={a.label}>
          <div className="b-label">{a.label}</div>
          <div className="b-track">
            <div className="b-fill" style={{ width: `${(a.total / max) * 100}%` }} />
          </div>
          <div className="b-val">{a.total}</div>
          <div className="auditor-rate" title={t("dash.auditorTaxa")}>
            {a.taxaFechamento}%
          </div>
        </div>
      ))}
      <div className="footer-note">{t("dash.auditorNota")}</div>
    </div>
  );
}
