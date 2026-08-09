"use client";

import { useLanguage } from "../../lib/i18n";

function semanaAtualISO() {
  const d = new Date();
  const dd = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = dd.getUTCDay() || 7;
  dd.setUTCDate(dd.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(dd.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((dd - yearStart) / 86400000 + 1) / 7);
  return `${dd.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export default function DashboardForecast({ stats }) {
  const { t, tv } = useLanguage();
  const forecast = stats.forecast || [];
  const forecastDeptos = stats.forecastDeptos || [];
  const hoje = semanaAtualISO();
  const max = Math.max(...forecast.map((f) => f.count), 1);
  const atrasadas = forecast.filter((f) => f.semana < hoje).reduce((acc, f) => acc + f.count, 0);
  const proximas = forecast.filter((f) => f.semana >= hoje).reduce((acc, f) => acc + f.count, 0);

  return (
    <>
      <div className="kpi-row" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
        <div className="kpi-card">
          <div className="kpi-label">{t("dash.forecastAtrasadas")}</div>
          <div className="kpi-value" style={{ color: "var(--red)" }}>{atrasadas}</div>
          <div className="kpi-sub warn">{t("dash.forecastAtrasadasSub")}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{t("dash.forecastProximas")}</div>
          <div className="kpi-value" style={{ color: "var(--purple)" }}>{proximas}</div>
          <div className="kpi-sub muted">{t("dash.forecastProximasSub")}</div>
        </div>
      </div>

      <div className="chart-card">
        <h3>{t("dash.forecastTitulo")}</h3>
        <div className="chart-sub">{t("dash.forecastSub")}</div>
        {forecast.length === 0 && <p className="footer-note">{t("dash.forecastVazio")}</p>}
        <div className="forecast-chart">
          {forecast.map((f) => {
            const atrasada = f.semana < hoje;
            const atual = f.semana === hoje;
            return (
              <div className="forecast-col" key={f.semana}>
                <div className="forecast-count">{f.count}</div>
                <div
                  className={"forecast-bar" + (atrasada ? " atrasada" : "") + (atual ? " atual" : "")}
                  style={{ height: `${Math.max(6, (f.count / max) * 100)}px` }}
                />
                <div className="forecast-label">{f.semana.replace(/^\d+-/, "")}</div>
              </div>
            );
          })}
        </div>
        <div className="legend" style={{ marginTop: 16 }}>
          <div className="legend-item"><span className="sw" style={{ background: "var(--red)" }} />{t("dash.forecastAtrasadas")}</div>
          <div className="legend-item"><span className="sw" style={{ background: "var(--purple)" }} />{t("dash.forecastProximas")}</div>
        </div>
      </div>

      {forecastDeptos.length > 0 && (
        <div className="chart-card">
          <h3>{t("dash.forecastMatrizTitulo")}</h3>
          <div className="chart-sub">{t("dash.forecastMatrizSub")}</div>
          <div className="forecast-matrix-wrap">
            <table className="forecast-matrix">
              <thead>
                <tr>
                  <th className="fm-dept-head"></th>
                  {forecast.map((f) => (
                    <th key={f.semana} className={f.semana < hoje ? "fm-atrasada" : f.semana === hoje ? "fm-atual" : ""}>
                      {f.semana.replace(/^\d+-/, "")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {forecastDeptos.map((dept) => (
                  <tr key={dept}>
                    <td className="fm-dept-label">{tv(dept)}</td>
                    {forecast.map((f) => {
                      const n = f.porDepto[dept] || 0;
                      const atrasada = f.semana < hoje;
                      return (
                        <td key={f.semana} className={"fm-cell" + (n ? " fm-tem" : "") + (n && atrasada ? " fm-atrasada" : "")}>
                          {n || "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
