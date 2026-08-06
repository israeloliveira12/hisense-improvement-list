"use client";

import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Topbar({ title, sub, children }) {
  return (
    <div className="topbar">
      <h1>
        {title}
        {sub && <span className="sub">{sub}</span>}
      </h1>
      <div className="topbar-actions">
        {children}
        <div className="topbar-divider" />
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </div>
  );
}
