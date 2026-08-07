"use client";

import { useLanguage } from "../../lib/i18n";

export default function DashboardAging({ stats }) {
  const { t } = useLanguage();
  const aging = stats.aging || { histograma: [], top: [], media: 0, total: 0 };
  const max = Math.max(...aging.histograma.map((f) => f.count), 1);

  return (
    <>
      <div className="kpi-row" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
        <div className="kpi-card">
          <div className="kpi-label">{t("dash.agingMedia")}</div>
          <div className="kpi-value">{aging.media}</div>
          <div className="kpi-sub muted">{t("dash.agingMediaSub")}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{t("dash.agingTotal")}</div>
          <div className="kpi-value">{aging.total}</div>
          <div className="kpi-sub muted">{t("dash.agingTotalSub")}</div>
        </div>
      </div>

      <div className="chart-card">
        <h3>{t("dash.agingHistTitulo")}</h3>
        <div className="chart-sub">{t("dash.agingHistSub")}</div>
        <div className="forecast-chart">
          {aging.histograma.map((f) => (
            <div className="forecast-col" key={f.label}>
              <div className="forecast-count">{f.count}</div>
              <div
                className={"forecast-bar" + (f.label === "90d+" || f.label === "61-90d" ? " atrasada" : "")}
                style={{ height: `${Math.max(6, (f.count / max) * 100)}px` }}
              />
              <div className="forecast-label">{f.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="chart-card">
        <h3>{t("dash.agingTopTitulo")}</h3>
        <div className="chart-sub">{t("dash.agingTopSub")}</div>
        {aging.top.map((a) => (
          <div className="bar-row" key={a.no}>
            <div className="b-label" style={{ width: 150, textAlign: "left" }}>
              {a.no} — {a.item}
            </div>
            <div className="b-track">
              <div className="b-fill" style={{ width: `${Math.min(100, (a.dias / (aging.top[0]?.dias || 1)) * 100)}%`, background: "var(--red)" }} />
            </div>
            <div className="b-val">{a.dias}d</div>
          </div>
        ))}
      </div>
    </>
  );
}
