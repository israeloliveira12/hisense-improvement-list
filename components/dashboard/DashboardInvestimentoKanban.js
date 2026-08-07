"use client";

import { useLanguage } from "../../lib/i18n";

const COLUNAS = [
  { key: "Comercial", labelKey: "dash.etapaComercial", color: "var(--amber)" },
  { key: "On Hold", labelKey: "dash.etapaOnHold", color: "var(--blue)" },
  { key: "Delivered", labelKey: "dash.etapaDelivered", color: "var(--green)" },
];

function formatBRL(v) {
  return "R$ " + (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function AprovacaoBadge({ status }) {
  const { t } = useLanguage();
  if (status === "Approved") return <span className="kanban-approval approved">✓ {t("dash.aprovado")}</span>;
  if (status === "Declined") return <span className="kanban-approval declined">✕ {t("dash.recusado")}</span>;
  return <span className="kanban-approval pending">⏳ {t("dash.pendenteAprovacao")}</span>;
}

export default function DashboardInvestimentoKanban({ stats }) {
  const { t } = useLanguage();
  const itens = stats.itensDetalhados || [];

  return (
    <div className="chart-card">
      <h3>{t("dash.kanbanTitulo")}</h3>
      <div className="chart-sub">{t("dash.kanbanSub")}</div>
      <div className="kanban-board">
        {COLUNAS.map((col) => {
          const itensColuna = itens.filter((it) => (it.stage || "Comercial") === col.key);
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
                        <b>{it.deadline}</b>
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
                      <AprovacaoBadge status={it.requestApproval} />
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
