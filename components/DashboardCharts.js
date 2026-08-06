const CIRC = 2 * Math.PI * 60;

function formatBRL(v) {
  return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DashboardCharts({ stats }) {
  const { total, closed, open, delayed, porDepartamento, investimento } = stats;
  const pctClosed = total ? (closed / total) * 100 : 0;
  const pctOpen = total ? (open / total) * 100 : 0;
  const closedLen = (pctClosed / 100) * CIRC;
  const openLen = (pctOpen / 100) * CIRC;
  const maxDept = Math.max(...porDepartamento.map((d) => d.count), 1);
  const pctAprovado = investimento.valorTotal ? (investimento.aprovado / investimento.valorTotal) * 100 : 0;
  const pctRecusado = investimento.valorTotal ? (investimento.recusado / investimento.valorTotal) * 100 : 0;

  return (
    <>
      <div className="topbar">
        <h1>
          Dashboard <span className="sub">calculado ao vivo, sem &quot;Atualizar tudo&quot;</span>
        </h1>
        <div className="topbar-actions">
          <button className="btn btn-ghost">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 4v6h6M20 20v-6h-6M4.6 15a8 8 0 0014.4-3M19.4 9A8 8 0 005 12"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Atualizar
          </button>
        </div>
      </div>

      <div className="view">
        <div className="view-inner">
          <div className="kpi-row">
            <div className="kpi-card">
              <div className="kpi-label">Total de ações</div>
              <div className="kpi-value">{total}</div>
              <div className="kpi-sub muted">Ano-base 2026</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Fechadas</div>
              <div className="kpi-value">{closed}</div>
              <div className="kpi-sub up">{Math.round(pctClosed)}% do total</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Em aberto</div>
              <div className="kpi-value">{open}</div>
              <div className="kpi-sub muted">{Math.round(pctOpen)}% do total</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Atrasadas</div>
              <div className="kpi-value">{delayed}</div>
              <div className="kpi-sub warn">Fora do prazo hoje</div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3>Status das ações</h3>
              <div className="chart-sub">Open vs. Closed</div>
              <svg width="100%" height="150" viewBox="0 0 200 150">
                <g transform="translate(100,75)">
                  <circle r="60" fill="none" stroke="var(--border)" strokeWidth="22" />
                  <circle
                    r="60"
                    fill="none"
                    stroke="var(--green)"
                    strokeWidth="22"
                    strokeDasharray={`${closedLen} ${CIRC}`}
                    strokeDashoffset="0"
                    transform="rotate(-90)"
                  />
                  <circle
                    r="60"
                    fill="none"
                    stroke="var(--amber)"
                    strokeWidth="22"
                    strokeDasharray={`${openLen} ${CIRC}`}
                    strokeDashoffset={-closedLen}
                    transform="rotate(-90)"
                  />
                  <text textAnchor="middle" y="-2" fontSize="26" fontWeight="700" fill="var(--text)">
                    {total}
                  </text>
                  <text textAnchor="middle" y="16" fontSize="10" fill="var(--text-muted)">
                    ações
                  </text>
                </g>
              </svg>
              <div className="legend">
                <div className="legend-item">
                  <span className="sw" style={{ background: "var(--green)" }} />
                  Closed — {closed} ({Math.round(pctClosed)}%)
                </div>
                <div className="legend-item">
                  <span className="sw" style={{ background: "var(--amber)" }} />
                  Open — {open} ({Math.round(pctOpen)}%)
                </div>
              </div>
            </div>

            <div className="chart-card">
              <h3>Ações por departamento</h3>
              <div className="chart-sub">Dept. in charge</div>
              {porDepartamento.map((d) => (
                <div className="bar-row" key={d.label}>
                  <div className="b-label">{d.label}</div>
                  <div className="b-track">
                    <div className="b-fill" style={{ width: `${(d.count / maxDept) * 100}%` }} />
                  </div>
                  <div className="b-val">{d.count}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-card">
            <h3>Investimento — aprovado vs. recusado</h3>
            <div className="chart-sub">
              {investimento.totalItens} itens · {formatBRL(investimento.valorTotal)} solicitados no total
            </div>
            <div className="money-row">
              <div className="m-label" style={{ color: "var(--green)" }}>
                Aprovado
              </div>
              <div className="m-track">
                <div className="m-fill" style={{ width: `${pctAprovado}%`, background: "var(--green)" }}>
                  {formatBRL(investimento.aprovado)}
                </div>
              </div>
            </div>
            <div className="money-row">
              <div className="m-label" style={{ color: "var(--red)" }}>
                Recusado
              </div>
              <div className="m-track">
                <div className="m-fill" style={{ width: `${pctRecusado}%`, background: "var(--red)" }}>
                  {formatBRL(investimento.recusado)}
                </div>
              </div>
            </div>
            <div className="footer-note">
              Calculado ao vivo a partir do &quot;banco de dados&quot; a cada carregamento — nunca fica
              desatualizado esperando um &quot;Atualizar tudo&quot; manual.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
