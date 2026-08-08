"use client";

import { useLanguage } from "../../lib/i18n";

const COLUNAS = [
  { key: "Preparing", labelKey: "dash.etapaPreparing", color: "var(--amber)" },
  { key: "In Transit", labelKey: "dash.etapaInTransit", color: "var(--blue)" },
  { key: "Delivered", labelKey: "dash.etapaDelivered", color: "var(--green)" },
];

// so itens Approved entram no pipeline de etapas -- "Comercial" e qualquer
// outro valor antigo (pre-migracao) cai no inicio do fluxo, exceto o caso
// especifico de assinatura recorrente ("Comercial" == servico ja ativo).
function normalizarEtapa(stage) {
  if (COLUNAS.some((c) => c.key === stage)) return stage;
  if (stage === "Comercial") return "Delivered";
  return "Preparing";
}

function formatBRL(v) {
  return "R$ " + (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DashboardInvestimentoKanban({ stats }) {
  const { t, formatDate } = useLanguage();
  const itens = stats.itensDetalhados || [];

  const aprovados = itens.filter((it) => it.requestApproval === "Approved");
  const recusados = itens.filter((it) => it.requestApproval === "Declined");
  const pendentes = itens.filter((it) => it.requestApproval !== "Approved" && it.requestApproval !== "Declined");
  const totalPendentes = pendentes.reduce((acc, it) => acc + it.totalCost, 0);
  const totalRecusados = recusados.reduce((acc, it) => acc + it.totalCost, 0);

  return (
    <div className="chart-card">
      <h3>{t("dash.kanbanTitulo")}</h3>
      <div className="chart-sub">{t("dash.kanbanSub")}</div>

      <div className="kanban-decisao">
        <div className="kanban-decisao-titulo">{t("dash.kanbanDecisaoTitulo")}</div>
        <div className="kanban-decisao-row">
          <div className="kanban-decisao-card">
            <span className="kanban-decisao-label"><span className="dot pending" />{t("dash.pendenteAprovacao")}</span>
            <span className="kanban-decisao-nums">
              <b>{pendentes.length}</b>
              <span className="kanban-decisao-total">{formatBRL(totalPendentes)}</span>
            </span>
          </div>
          <div className="kanban-decisao-card">
            <span className="kanban-decisao-label"><span className="dot declined" />{t("dash.recusado")}</span>
            <span className="kanban-decisao-nums">
              <b>{recusados.length}</b>
              <span className="kanban-decisao-total">{formatBRL(totalRecusados)}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="kanban-decisao-titulo kanban-pipeline-titulo">{t("dash.kanbanPipelineTitulo")}</div>
      <div className="kanban-board">
        {COLUNAS.map((col) => {
          const itensColuna = aprovados.filter((it) => normalizarEtapa(it.stage) === col.key);
          const totalColuna = itensColuna.reduce((acc, it) => acc + it.totalCost, 0);
          return (
            <div className="kanban-col" key={col.key}>
              <div className="kanban-col-head" style={{ borderColor: col.color }}>
                <span className="kanban-col-title">{t(col.labelKey)}</span>
                <span className="kanban-col-count">{itensColuna.length}</span>
              </div>
              <div className="kanban-col-total">{formatBRL(totalColuna)}</div>
              <div className="kanban-cards">
                {itensColuna.length === 0 && <p className="editor-empty">—</p>}
                {itensColuna.map((it, i) => (
                  <div className="kanban-card" key={i}>
                    <div className="kanban-card-top">
                      <span className="kanban-acao-no">{it.acaoNo}</span>
                      <span className={"status-dot " + it.acaoStatus} title={it.acaoStatus} />
                    </div>
                    <div className="kanban-card-item">{it.item || it.acaoItem}</div>
                    <div className="kanban-card-row">
                      <span>{t("dash.quanto")}</span>
                      <b>{formatBRL(it.totalCost)}</b>
                    </div>
                    {it.deadline && (
                      <div className="kanban-card-row">
                        <span>{t("dash.quando")}</span>
                        <b>{formatDate(it.deadline)}</b>
                      </div>
                    )}
                    {it.supplier && (
                      <div className="kanban-card-row">
                        <span>{t("dash.fornecedor")}</span>
                        <b>{it.supplier}</b>
                      </div>
                    )}
                    <div className="kanban-card-foot">
                      <span className="kanban-person">{it.person || "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
