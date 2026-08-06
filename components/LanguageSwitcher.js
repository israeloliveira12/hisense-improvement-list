"use client";

import { LANGUAGES, useLanguage } from "../lib/i18n";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="lang-switch" role="group" aria-label="Idioma / Language / 语言">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          className={"lang-switch-btn" + (lang === l.code ? " active" : "")}
          onClick={() => setLang(l.code)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
