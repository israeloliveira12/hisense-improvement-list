"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import Slide from "./Slide";

export default function PresentationClient({ acoes }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [presenting, setPresenting] = useState(false);

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return acoes;
    return acoes.filter(
      (a) =>
        a.no.toLowerCase().includes(q) ||
        (a.item || "").toLowerCase().includes(q) ||
        (a.dept || "").toLowerCase().includes(q)
    );
  }, [acoes, query]);

  const acaoAtual = filtradas[selected] || filtradas[0] || null;

  const irPara = useCallback(
    (delta) => {
      setSelected((i) => {
        const next = i + delta;
        if (next < 0 || next >= filtradas.length) return i;
        return next;
      });
    },
    [filtradas.length]
  );

  useEffect(() => {
    if (!presenting) return;
    function onKey(e) {
      if (e.key === "ArrowRight" || e.key === "PageDown") irPara(1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") irPara(-1);
      if (e.key === "Escape") setPresenting(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting, irPara]);

  function baixarPpt() {
    alert(
      "Ainda não conectado — este botão vai chamar a função de geração de PPT " +
        "assim que a integração com Google Sheets/Drive estiver ligada (fase seguinte deste projeto)."
    );
  }

  return (
    <>
      <div className="topbar">
        <h1>
          Apresentação <span className="sub">{acoes.length} ações · (Hisense) Improvement List</span>
        </h1>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={baixarPpt}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 4v12m0 0l-4-4m4 4l4-4M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Baixar PPT
          </button>
          <button className="btn btn-primary" onClick={() => setPresenting(true)} disabled={!acaoAtual}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 3l16 9-16 9V3z" fill="currentColor" />
            </svg>
            Apresentar
          </button>
        </div>
      </div>

      <div className="view">
        <div className="pres-layout">
          <div className="pres-rail">
            <input
              className="rail-search"
              placeholder="Buscar ação…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(0);
              }}
            />
            {filtradas.map((a, i) => (
              <button
                key={a.no}
                className={"rail-card" + (i === selected ? " active" : "")}
                onClick={() => setSelected(i)}
              >
                <div className="rail-no">{a.no}</div>
                <div>
                  <div className="rail-item-name">{a.item}</div>
                  <div className="rail-meta">
                    <span className={"status-dot " + a.status} />
                    {a.dept}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="pres-canvas-wrap">
            <Slide acao={acaoAtual} />
          </div>
        </div>
      </div>

      {presenting && acaoAtual && (
        <div className="present-fullscreen" onClick={() => setPresenting(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <Slide acao={acaoAtual} />
          </div>
          <div className="present-hint">
            ← → pra navegar · Esc pra sair · {selected + 1} / {filtradas.length}
          </div>
        </div>
      )}
    </>
  );
}
