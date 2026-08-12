"use client";

import { Suspense } from "react";
import LoginForm from "./LoginForm";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { useLanguage } from "../../lib/i18n";

export default function LoginPage() {
  const { t } = useLanguage();
  return (
    <div className="login-wrap">
      <div className="login-lang-corner">
        <LanguageSwitcher />
      </div>
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark" />
          <div className="brand-name">
            grupo<b>Multilaser</b>
          </div>
        </div>
        <h1 className="login-title">(Hisense) Improvement List</h1>
        <p className="login-sub">{t("login.subtitle")}</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
