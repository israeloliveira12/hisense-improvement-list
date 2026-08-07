"use client";

import { useLanguage } from "../../lib/i18n";

export default function DashboardDepartamentos({ stats }) {
  const { t } = useLanguage();
  const deptos = stats.departamentosDetalhe || [];

  return (
    <div className="table-card">
      <div className="table-scroll">
        <table className="db-table">
          <thead>
            <tr>
              <th>{t("dash.deptSub")}</th>
              <th>{t("dash.total")}</th>
              <th>{t("db.open")}</th>
              <th>{t("db.closed")}</th>
              <th>{t("dash.atrasadas")}</th>
              <th>{t("dash.deptTaxaFechamento")}</th>
            </tr>
          </thead>
          <tbody>
            {deptos.map((d) => (
              <tr key={d.label}>
                <td className="cell-item">{d.label}</td>
                <td className="cell-no">{d.total}</td>
                <td>
                  <span className="chip open">
                    <span className="dot" />
                    {d.open}
                  </span>
                </td>
                <td>
                  <span className="chip closed">
                    <span className="dot" />
                    {d.closed}
                  </span>
                </td>
                <td style={{ color: d.delayed ? "var(--red)" : "var(--text-faint)", fontWeight: 700 }}>{d.delayed}</td>
                <td className="cell-no">{d.total ? Math.round((d.closed / d.total) * 100) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
