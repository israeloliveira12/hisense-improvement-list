"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";
import { useLanguage } from "../lib/i18n";

const ICONS = {
  apresentacao: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  banco: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 10h18M9 10v10" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M4 20V10M12 20V4M20 20v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
};

const ITEMS = [
  { href: "/dashboard", key: "dashboard" },
  { href: "/apresentacao", key: "apresentacao" },
  { href: "/banco-de-dados", key: "banco" },
];

export default function Sidebar({ onCollapse }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" />
        <div className="brand-name">
          grupo<b>Multilaser</b>
        </div>
        {onCollapse && (
          <button type="button" className="sidebar-collapse-btn" onClick={onCollapse} title={t("nav.ocultarMenu")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
            </svg>
          </button>
        )}
      </div>
      <div className="nav-label">{t("nav.tag")}</div>
      <nav className="nav">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={"nav-item" + (pathname.startsWith(item.href) ? " active" : "")}
          >
            {ICONS[item.key]}
            {t("nav." + item.key)}
          </Link>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="doc-pill">
          <span className="dot" />
          {t("common.live")}
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
