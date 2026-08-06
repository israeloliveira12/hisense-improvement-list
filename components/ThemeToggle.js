"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../lib/i18n";

export default function ThemeToggle() {
  const { t } = useLanguage();
  const [pref, setPref] = useState(null); // null = segue o sistema, "light" | "dark" = escolha explícita

  useEffect(() => {
    const saved = localStorage.getItem("hisense-theme");
    setPref(saved === "light" || saved === "dark" ? saved : null);
  }, []);

  function escolher(next) {
    setPref(next);
    if (next) {
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("hisense-theme", next);
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.removeItem("hisense-theme");
    }
  }

  return (
    <div className="theme-toggle" role="group" aria-label="Tema">
      <button
        type="button"
        className={"theme-toggle-btn" + (pref === "light" ? " active" : "")}
        onClick={() => escolher("light")}
        title={t("theme.light")}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path strokeLinecap="round" d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </button>
      <button
        type="button"
        className={"theme-toggle-btn" + (pref === "dark" ? " active" : "")}
        onClick={() => escolher("dark")}
        title={t("theme.dark")}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />
        </svg>
      </button>
      <button
        type="button"
        className={"theme-toggle-btn" + (pref === null ? " active" : "")}
        onClick={() => escolher(null)}
        title={t("theme.system")}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path strokeLinecap="round" d="M8 21h8M12 17v4" />
        </svg>
      </button>
    </div>
  );
}
