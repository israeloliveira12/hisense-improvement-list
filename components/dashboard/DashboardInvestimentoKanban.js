"use client";

import { useLanguage } from "../../lib/i18n";

const COLUNAS_PIPELINE = [
  { key: "Preparing", labelKey: "dash.etapaPreparing", color: "var(--amber)" },
  { key: "In Transit", labelKey: "dash.etapaInTransit", color: "var(--blue)" },
  { key: "Delivered", labelKey: "dash.etapaDelivered", color: "var(--green)" },
];

// so itens Approved entram no pipeline de etapas -- "Comercial" e qualquer
// outro valor antigo (pre-migracao) cai no inicio do fluxo, exceto o caso
// especifico de assinatura recorrente ("Comercial" == servico ja ativo).
function normalizarEtapa(stage) {
  if (COLUNAS_PIPELINE.some((c) => c.key === stage)) return stage;
  if (stage === "Comercial") return "Delivered";
  return "Preparing";
}

function formatBRL(v) {
  return "R$ " + (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Mesmo cartao pras 5 colunas (Pendente/Recusado + as 3 do pipeline) --
// antes Pendente/Recusado eram so um numero+valor agregado, sem dar pra ver
// QUAIS itens estavam parados ali. Virou coluna de verdade, com o mesmo
// nivel de detalhe que o pipeline ja tinha.
function KanbanColuna({ titulo, cor, itens }) {
  const { t, formatDate } = useLanguage();
  const total = itens.reduce((acc, it) => acc + it.totalCost, 0);
  return (
    <div className="kanban-col">
      <div className="kanban-col-head" style={{ borderColor: cor }}>
        <span className="kanban-col-title">{titulo}</span>
        <span className="kanban-col-count">{itens.length}</span>
      </div>
      <div className="kanban-col-total">{formatBRL(total)}</div>
      <div className="kanban-cards">
        {itens.length === 0 && <p className="editor-empty">—</p>}
        {itens.map((it, i) => (
          <div className="kanban-card" key={i}>
            <div className="kanban-card-top">
              <span className="kanban-acao-no">{it.acaoNo}</span>
              <span className={"status-dot " + it.acaoStatus} title={it.acaoStatus === "closed" ? t("db.closed") : t("db.open")} />
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
}

// Uma unica fileira de cartoes: Recusado (so quando o toggle "mostrar
// recusados" do topbar do Dashboard esta ligado, entrando ANTES de
// Pendente) + Pendente + as 3 etapas do pipeline de compra. Antes eram 2
// fileiras separadas (decisao + pipeline) -- virou uma so, seguindo o
// pedido do usuario de ver tudo lado a lado num unico bloco.
export default function DashboardInvestimentoKanban({ stats, mostrarRecusados }) {
  const { t } = useLanguage();
  const itens = stats.itensDetalhados || [];

  const aprovados = itens.filter((it) => it.requestApproval === "Approved");
  const recusados = itens.filter((it) => it.requestApproval === "Declined");
  const pendentes = itens.filter((it) => it.requestApproval !== "Approved" && it.requestApproval !== "Declined");

  const colunas = [];
  if (mostrarRecusados) {
    colunas.push({ key: "declined", titulo: t("dash.recusado"), cor: "var(--red)", itens: recusados });
  }
  colunas.push({ key: "pending", titulo: t("dash.etapaPendenteAnalise"), cor: "var(--amber)", itens: pendentes });
  COLUNAS_PIPELINE.forEach((col) => {
    colunas.push({
      key: col.key,
      titulo: t(col.labelKey),
      cor: col.color,
      itens: aprovados.filter((it) => normalizarEtapa(it.stage) === col.key),
    });
  });

  return (
    <div className="chart-card">
      <h3>{t("dash.kanbanTitulo")}</h3>
      <div className="chart-sub">{t("dash.kanbanSub")}</div>

      <div className="kanban-board" style={{ gridTemplateColumns: `repeat(${colunas.length}, 1fr)` }}>
        {colunas.map((col) => (
          <KanbanColuna key={col.key} titulo={col.titulo} cor={col.cor} itens={col.itens} />
        ))}
      </div>
    </div>
  );
}
