"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  {
    href: "/apresentacao",
    label: "Apresentação",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/banco-de-dados",
    label: "Banco de Dados",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 10h18M9 10v10" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M4 20V10M12 20V4M20 20v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" />
        <div className="brand-name">
          grupo<b>Multilaser</b>
        </div>
      </div>
      <div className="nav-label">Improvement List · Hisense</div>
      <nav className="nav">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={"nav-item" + (pathname.startsWith(item.href) ? " active" : "")}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="doc-pill">
          <span className="dot" />
          Sincronizado agora
        </div>
      </div>
    </aside>
  );
}
