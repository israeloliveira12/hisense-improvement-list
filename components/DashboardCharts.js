"use client";

import { useState } from "react";
import Topbar from "./Topbar";
import DashboardPrincipal from "./dashboard/DashboardPrincipal";
import DashboardInvestimentos from "./dashboard/DashboardInvestimentos";
import DashboardForecast from "./dashboard/DashboardForecast";
import DashboardAuditor from "./dashboard/DashboardAuditor";
import DashboardAging from "./dashboard/DashboardAging";
import DashboardDepartamentos from "./dashboard/DashboardDepartamentos";
import { useLanguage } from "../lib/i18n";

export default function DashboardCharts({ initialStats, initialError }) {
  const { t } = useLanguage();
  const [stats, setStats] = useState(initialStats);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("principal");

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
        <Topbar title={t("dash.title")} />
        <div className="config-banner">
          <b>{t("config.title")}</b>
          {t("config.desc")}
          <code className="config-raw">{error}</code>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title={t("dash.title")}>
        <button className="btn btn-ghost" onClick={atualizar} disabled={loading}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 4v6h6M20 20v-6h-6M4.6 15a8 8 0 0014.4-3M19.4 9A8 8 0 005 12"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
          {t("dash.atualizar")}
        </button>
      </Topbar>

      {error && (
        <div className="config-banner">
          <b>{t("config.title")}</b>
          {t("config.desc")}
          <code className="config-raw">{error}</code>
        </div>
      )}

      <div className="view">
        <div className="view-inner">
          <div className="dash-tabs">
            <button className={tab === "principal" ? "active" : ""} onClick={() => setTab("principal")}>{t("dash.tabPrincipal")}</button>
            <button className={tab === "investimentos" ? "active" : ""} onClick={() => setTab("investimentos")}>{t("dash.tabInvestimentos")}</button>
            <button className={tab === "forecast" ? "active" : ""} onClick={() => setTab("forecast")}>{t("dash.tabForecast")}</button>
            <button className={tab === "auditor" ? "active" : ""} onClick={() => setTab("auditor")}>{t("dash.tabAuditor")}</button>
            <button className={tab === "aging" ? "active" : ""} onClick={() => setTab("aging")}>{t("dash.tabAging")}</button>
            <button className={tab === "departamentos" ? "active" : ""} onClick={() => setTab("departamentos")}>{t("dash.tabDepartamentos")}</button>
          </div>

          {tab === "principal" && <DashboardPrincipal stats={stats} />}
          {tab === "investimentos" && <DashboardInvestimentos stats={stats} />}
          {tab === "forecast" && <DashboardForecast stats={stats} />}
          {tab === "auditor" && <DashboardAuditor stats={stats} />}
          {tab === "aging" && <DashboardAging stats={stats} />}
          {tab === "departamentos" && <DashboardDepartamentos stats={stats} />}

          <div className="footer-note">{t("dash.footerNote")}</div>
        </div>
      </div>
    </>
  );
}
