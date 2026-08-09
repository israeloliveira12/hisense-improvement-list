"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Topbar from "./Topbar";
import DashboardFilterMenu from "./DashboardFilterMenu";
import DashboardPrincipal from "./dashboard/DashboardPrincipal";
import DashboardInvestimentos from "./dashboard/DashboardInvestimentos";
import DashboardForecast from "./dashboard/DashboardForecast";
import DashboardAuditor from "./dashboard/DashboardAuditor";
import DashboardAging from "./dashboard/DashboardAging";
import DashboardDepartamentos from "./dashboard/DashboardDepartamentos";
import { useLanguage } from "../lib/i18n";

const TABS_VALIDAS = ["principal", "investimentos", "forecast", "auditor", "aging", "departamentos"];

export default function DashboardCharts({ initialStats, initialError }) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [stats, setStats] = useState(initialStats);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  // A aba fica refletida na URL (?tab=...) -- assim um F5 volta pra mesma
  // aba em vez de sempre resetar pra "Principal" (useState sozinho nao
  // sobrevive a um reload de pagina de verdade).
  const tabDaUrl = searchParams.get("tab");
  const [tab, setTab] = useState(TABS_VALIDAS.includes(tabDaUrl) ? tabDaUrl : "principal");

  function mudarTab(novaTab) {
    setTab(novaTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", novaTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }
  const [status, setStatus] = useState("");
  const [dept, setDept] = useState("");
  const [investimento, setInvestimento] = useState("");
  // Preferencia de exibicao (nao e um filtro que muda a chamada ao servidor
  // -- so decide se os itens "Declined" aparecem nos cartoes e no kanban de
  // Investimentos). Comeca desligada (o pedido do usuario foi "geralmente
  // eu nao mostro") e fica salva no navegador, igual o tema.
  const [mostrarRecusados, setMostrarRecusados] = useState(false);
  useEffect(() => {
    const salvo = localStorage.getItem("hisense_mostrar_recusados");
    if (salvo === "1") setMostrarRecusados(true);
  }, []);
  function alternarMostrarRecusados(v) {
    setMostrarRecusados(v);
    localStorage.setItem("hisense_mostrar_recusados", v ? "1" : "0");
  }
  // Lista de departamentos pro seletor vem SEMPRE da carga inicial (sem
  // filtro) -- assim continua completa mesmo depois de filtrar por um
  // departamento so, permitindo trocar de departamento sem precisar limpar
  // o filtro primeiro.
  const [departamentos] = useState(() =>
    [...new Set((initialStats?.departamentosDetalhe || []).map((d) => d.label))].sort((a, b) => a.localeCompare(b))
  );

  async function carregar(novoStatus, novoDept, novoInvestimento) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (novoStatus) params.set("status", novoStatus);
      if (novoDept) params.set("dept", novoDept);
      if (novoInvestimento) params.set("investimento", novoInvestimento);
      const qs = params.toString();
      const res = await fetch("/api/dashboard" + (qs ? `?${qs}` : ""));
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

  function atualizar() {
    return carregar(status, dept, investimento);
  }

  function mudarStatus(v) {
    setStatus(v);
    carregar(v, dept, investimento);
  }

  function mudarDept(v) {
    setDept(v);
    carregar(status, v, investimento);
  }

  function mudarInvestimento(v) {
    setInvestimento(v);
    carregar(status, dept, v);
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
        <DashboardFilterMenu
          status={status} onChangeStatus={mudarStatus}
          investimento={investimento} onChangeInvestimento={mudarInvestimento}
          departamentos={departamentos} dept={dept} onChangeDept={mudarDept}
          mostrarRecusados={mostrarRecusados} onToggleMostrarRecusados={alternarMostrarRecusados}
        />
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
            <button className={tab === "principal" ? "active" : ""} onClick={() => mudarTab("principal")}>{t("dash.tabPrincipal")}</button>
            <button className={tab === "investimentos" ? "active" : ""} onClick={() => mudarTab("investimentos")}>{t("dash.tabInvestimentos")}</button>
            <button className={tab === "forecast" ? "active" : ""} onClick={() => mudarTab("forecast")}>{t("dash.tabForecast")}</button>
            <button className={tab === "auditor" ? "active" : ""} onClick={() => mudarTab("auditor")}>{t("dash.tabAuditor")}</button>
            <button className={tab === "aging" ? "active" : ""} onClick={() => mudarTab("aging")}>{t("dash.tabAging")}</button>
            <button className={tab === "departamentos" ? "active" : ""} onClick={() => mudarTab("departamentos")}>{t("dash.tabDepartamentos")}</button>
          </div>

          {tab === "principal" && <DashboardPrincipal stats={stats} />}
          {tab === "investimentos" && <DashboardInvestimentos stats={stats} mostrarRecusados={mostrarRecusados} />}
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
