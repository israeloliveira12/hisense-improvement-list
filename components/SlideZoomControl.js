"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../lib/i18n";

const NIVEIS = [0.8, 1, 1.25, 1.5];

export default function SlideZoomControl() {
  const { t } = useLanguage();
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const saved = Number(localStorage.getItem("hisense-slide-zoom"));
    if (NIVEIS.includes(saved)) {
      setZoom(saved);
      document.documentElement.style.setProperty("--slide-zoom", saved);
    }
  }, []);

  function aplicar(v) {
    setZoom(v);
    document.documentElement.style.setProperty("--slide-zoom", v);
    localStorage.setItem("hisense-slide-zoom", v);
  }

  return (
    <div className="lang-switch" role="group" aria-label={t("pres.tamanhoTexto")} title={t("pres.tamanhoTexto")}>
      {NIVEIS.map((v) => (
        <button
          key={v}
          type="button"
          className={"lang-switch-btn" + (zoom === v ? " active" : "")}
          onClick={() => aplicar(v)}
        >
          {Math.round(v * 100)}%
        </button>
      ))}
    </div>
  );
}
