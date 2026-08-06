export default function Slide({ acao }) {
  if (!acao) return null;

  return (
    <div className="slide">
      <div className="slide-head">
        <div className="slide-badge">{acao.no}</div>
        <div className="slide-head-txt">
          <h2>{acao.item}</h2>
          <p>
            {acao.dept}
            {acao.auditor ? ` · Auditor: ${acao.auditor}` : ""}
          </p>
        </div>
        <div className={"slide-status-pill " + acao.status}>
          {acao.status === "closed" ? "CLOSED" : "OPEN"}
        </div>
      </div>

      <div className="slide-meta">
        <div className="m">
          <label>PERSON IN CHARGE</label>
          <div>
            {acao.person || "—"} {acao.dept ? `(${acao.dept})` : ""}
          </div>
        </div>
        <div className="m">
          <label>OCCUR. DATE</label>
          <div>{acao.occur || "—"}</div>
        </div>
        <div className="m">
          <label>DEADLINE</label>
          <div>{acao.deadline || "—"}</div>
        </div>
        <div className="m">
          <label>TARGET</label>
          <div>{acao.target || "—"}</div>
        </div>
        <div className="m">
          <label>INVESTMENT</label>
          <div>{acao.investment || "—"}</div>
        </div>
      </div>

      <div className="slide-body">
        <div className="desc-row">
          <div className="desc-col wide">
            <label>DESCRIPTION</label>
            <div className="desc-box">{acao.description || "—"}</div>
          </div>
          <div className="desc-col">
            <label>EXPECTATION</label>
            <div className="desc-box">{acao.expectation || "—"}</div>
          </div>
          <div className="desc-col">
            <label>ABRANGENCY</label>
            <div className="desc-box">{acao.abrangency || "—"}</div>
          </div>
        </div>

        <div className="plan-label">ACTION PLAN</div>
        <table className="plan-table">
          <tbody>
            <tr>
              <th style={{ width: 24 }}>#</th>
              <th>Action</th>
              <th style={{ width: 80 }}>Owner</th>
              <th style={{ width: 56 }}>Due</th>
              <th style={{ width: 60 }}>Status</th>
            </tr>
            {(acao.steps || []).map((st, i) => (
              <tr key={i}>
                <td>{st[0]}</td>
                <td>{st[1]}</td>
                <td>{st[2]}</td>
                <td>{st[3]}</td>
                <td className="chip">{st[4]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ba-band">
          <span>BEFORE</span>
          <span>AFTER</span>
        </div>
        <div className="ba-photos">
          <div className="ba-col">
            <div className="drop">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <span>Clique ou arraste pra enviar</span>
            </div>
            <div className="ba-caption">
              <b>FACTORY COMMENT</b>
              {acao.factory || "—"}
            </div>
          </div>
          <div className="ba-col">
            <div className="drop">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <span>Clique ou arraste pra enviar</span>
            </div>
            <div className="ba-caption">
              <b>HISENSE COMMENT</b>
              {acao.hisense || "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
