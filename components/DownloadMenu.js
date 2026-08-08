"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../lib/i18n";

// Um so botao ("Baixar") que abre as duas opcoes -- antes eram 2 botoes
// separados grudados no topbar ("Baixar PPT" e "Baixar tudo").
export default function DownloadMenu({ onBaixarUm, onBaixarTudo, podeBaixarUm, gerando }) {
  const { t } = useLanguage();
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickFora(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, []);

  return (
    <div className="topbar-dropdown" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        title={t("pres.baixar")}
        disabled={gerando}
        onClick={() => setAberto((a) => !a)}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M5 20h14" />
        </svg>
      </button>
      {aberto && (
        <div className="topbar-dropdown-pop">
          <button type="button" disabled={!podeBaixarUm} onClick={() => { setAberto(false); onBaixarUm(); }}>
            {t("pres.baixarPpt")}
          </button>
          <button type="button" onClick={() => { setAberto(false); onBaixarTudo(); }}>
            {t("pres.baixarTudo")}
          </button>
        </div>
      )}
    </div>
  );
}
