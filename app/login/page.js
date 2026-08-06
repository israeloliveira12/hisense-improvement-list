import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark" />
          <div className="brand-name">
            grupo<b>Multilaser</b>
          </div>
        </div>
        <h1 className="login-title">(Hisense) Improvement List</h1>
        <p className="login-sub">Entre com a senha compartilhada da equipe.</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
