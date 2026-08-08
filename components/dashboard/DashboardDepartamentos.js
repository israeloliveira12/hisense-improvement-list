"use client";

import { Fragment, useState } from "react";
import { useLanguage } from "../../lib/i18n";

export default function DashboardDepartamentos({ stats }) {
  const { t, tv } = useLanguage();
  const deptos = stats.departamentosDetalhe || [];
  const [expandido, setExpandido] = useState(() => new Set());

  function toggle(label) {
    setExpandido((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

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
            {deptos.map((d) => {
              const aberto = expandido.has(d.label);
              return (
                <Fragment key={d.label}>
                  <tr className="dept-row-clickable" onClick={() => toggle(d.label)}>
                    <td className="cell-item">
                      <span className={"dept-caret" + (aberto ? " open" : "")}>▸</span>
                      {tv(d.label)}
                    </td>
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
                  {aberto && (
                    <tr className="dept-row-expand">
                      <td colSpan={6}>
                        <div className="dept-pessoas">
                          <div className="dept-pessoas-title">{t("dash.deptResponsaveis")}</div>
                          {(d.pessoas || []).map((p) => (
                            <div className="dept-pessoa-row" key={p.nome}>
                              <span>{tv(p.nome)}</span>
                              <b>{t("dash.deptAcoesCount", { n: p.count })}</b>
                            </div>
                          ))}
                          {!d.pessoas?.length && <span className="editor-empty">—</span>}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
