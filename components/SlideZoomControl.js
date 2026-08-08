"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../lib/i18n";

const NIVEIS = [0.8, 1, 1.25, 1.5];

// Dropdown minimalista (so um icone no topbar) em vez dos 4 botoes "80% 100%
// 125% 150%" grudados -- pedido explicito de deixar o topbar menos poluido.
export default function SlideZoomControl() {
  const { t } = useLanguage();
  const [zoom, setZoom] = useState(1);
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const saved = Number(localStorage.getItem("hisense-slide-zoom"));
    if (NIVEIS.includes(saved)) {
      setZoom(saved);
      document.documentElement.style.setProperty("--slide-zoom", saved);
    }
  }, []);

  useEffect(() => {
    function onClickFora(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, []);

  function aplicar(v) {
    setZoom(v);
    document.documentElement.style.setProperty("--slide-zoom", v);
    localStorage.setItem("hisense-slide-zoom", v);
    setAberto(false);
  }

  return (
    <div className="topbar-dropdown" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        title={t("pres.tamanhoTexto")}
        onClick={() => setAberto((a) => !a)}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="M21 21l-4.3-4.3M9 11h4" />
        </svg>
      </button>
      {aberto && (
        <div className="topbar-dropdown-pop">
          {NIVEIS.map((v) => (
            <button key={v} type="button" onClick={() => aplicar(v)} className={zoom === v ? "active" : ""}>
              {Math.round(v * 100)}%
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
