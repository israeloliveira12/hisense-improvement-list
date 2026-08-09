"use client";

import { useLanguage } from "../../lib/i18n";
import DashboardInvestimentoKanban from "./DashboardInvestimentoKanban";

function formatBRL(v) {
  return "R$ " + (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Barra estreita demais pro valor caber dentro dela (com letra branca) --
// nesse caso o valor sai pra fora da barra, à direita, na cor da propria
// categoria (continua legivel, so muda de dentro/branco pra fora/colorido).
const BARRA_ESTREITA = 16; // %

function MoneyRow({ label, color, pct, valor }) {
  const estreita = pct < BARRA_ESTREITA;
  return (
    <div className="money-row">
      <div className="m-label" style={{ color }}>{label}</div>
      <div className="m-track">
        <div className="m-fill" style={{ width: `${pct}%`, background: color }}>
          {!estreita && valor}
        </div>
        {estreita && (
          <span className="m-fill-valor-fora" style={{ left: `calc(${pct}% + 8px)`, color }}>{valor}</span>
        )}
      </div>
    </div>
  );
}

export default function DashboardInvestimentos({ stats, mostrarRecusados }) {
  const { t } = useLanguage();
  const { investimento, total, itensDetalhados } = stats;
  const { aprovado, recusado, pendente, acoesComInvestimento, acoesSemInvestimento } = investimento;

  // "Recusado" e uma preferencia de EXIBICAO (toggle no topbar do
  // Dashboard, ver DashboardCharts.js), nao um filtro de servidor -- os
  // itens ja vieram todos em `itensDetalhados`, aqui so decide se entram
  // nas somas/contagens. Com o toggle desligado, Valor Total/qtd de itens
  // somam SOMENTE Aprovado+Pendente (nao inclui Recusado); ligado, some tudo.
  const itensRecusados = (itensDetalhados || []).filter((it) => it.requestApproval === "Declined");
  const totalItensVisiveis = (itensDetalhados || []).length - (mostrarRecusados ? 0 : itensRecusados.length);
  const valorTotal = aprovado + pendente + (mostrarRecusados ? recusado : 0);
  const pctAprovado = valorTotal ? (aprovado / valorTotal) * 100 : 0;
  const pctRecusado = valorTotal ? (recusado / valorTotal) * 100 : 0;
  const pctPendente = valorTotal ? (pendente / valorTotal) * 100 : 0;
  const pctComInvest = total ? (acoesComInvestimento / total) * 100 : 0;

  return (
    <>
      <div className="kpi-row" style={{ gridTemplateColumns: `repeat(${mostrarRecusados ? 4 : 3}, 1fr)` }}>
        <div className="kpi-card">
          <div className="kpi-label">{t("dash.valorTotal")}</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{formatBRL(valorTotal)}</div>
          <div className="kpi-sub muted">{totalItensVisiveis} {t("dash.itens")}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{t("dash.aprovado")}</div>
          <div className="kpi-value" style={{ fontSize: 22, color: "var(--green)" }}>{formatBRL(aprovado)}</div>
        </div>
        {mostrarRecusados && (
          <div className="kpi-card">
            <div className="kpi-label">{t("dash.recusado")}</div>
            <div className="kpi-value" style={{ fontSize: 22, color: "var(--red)" }}>{formatBRL(recusado)}</div>
          </div>
        )}
        <div className="kpi-card">
          <div className="kpi-label">{t("dash.pendente")}</div>
          <div className="kpi-value" style={{ fontSize: 22, color: "var(--amber)" }}>{formatBRL(pendente)}</div>
        </div>
      </div>

      <DashboardInvestimentoKanban stats={stats} mostrarRecusados={mostrarRecusados} />

      <div className="chart-card">
        <h3>{t("dash.investimento")}</h3>
        <div className="chart-sub">{t("dash.itensSolicitados", { n: totalItensVisiveis, valor: formatBRL(valorTotal) })}</div>
        <MoneyRow label={t("dash.aprovado")} color="var(--green)" pct={pctAprovado} valor={formatBRL(aprovado)} />
        <MoneyRow label={t("dash.pendente")} color="var(--amber)" pct={pctPendente} valor={formatBRL(pendente)} />
        {mostrarRecusados && (
          <MoneyRow label={t("dash.recusado")} color="var(--red)" pct={pctRecusado} valor={formatBRL(recusado)} />
        )}
      </div>

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
    </>
  );
}
