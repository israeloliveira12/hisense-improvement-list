"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { DICT, DATE_INPUT_LANG, formatDateISO, translate, translateValue } from "./i18nCore";

// Reexportado pra nao quebrar quem ja importava essas coisas de "lib/i18n"
// -- a implementacao mora em i18nCore.js (ver o porque la).
export { LANGUAGES, DATE_INPUT_LANG, formatDateISO, translate, translateValue } from "./i18nCore";

const LanguageContext = createContext({ lang: "pt", setLang: () => {}, t: (k) => k, tv: (v) => v, formatDate: (iso) => iso || "", dateInputLang: "pt-BR" });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("pt");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("hisense-lang") : null;
    if (saved && DICT[saved]) setLangState(saved);
  }, []);

  function setLang(next) {
    setLangState(next);
    try {
      localStorage.setItem("hisense-lang", next);
    } catch (e) {}
  }

  function t(key, vars) {
    return translate(lang, key, vars);
  }

  function formatDate(iso) {
    return formatDateISO(iso, lang);
  }

  // traduz um VALOR gerado pelo sistema (Open/Closed/Approved/"Sem
  // departamento"...). Qualquer coisa que nao esteja no mapa e dado
  // digitado pelo usuario e volta intacta.
  function tv(valor) {
    return translateValue(lang, valor);
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tv, formatDate, dateInputLang: DATE_INPUT_LANG[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
