"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";

// Colapsar a sidebar persiste entre visitas (diferente do tema, que reseta
// sempre -- aqui nao houve pedido de resetar, e "esconder o menu" e o tipo
// de preferencia que faz sentido lembrar).
export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("hisense-sidebar-collapsed") === "1");
    setPronto(true);
  }, []);

  function toggle() {
    setCollapsed((atual) => {
      const proximo = !atual;
      localStorage.setItem("hisense-sidebar-collapsed", proximo ? "1" : "0");
      return proximo;
    });
  }

  // so decide esconder/mostrar depois de ler o localStorage -- antes disso
  // renderiza a sidebar normal (evita ela sumir e reaparecer com flash)
  const mostrarSidebar = !pronto || !collapsed;

  return (
    <div className="app">
      {mostrarSidebar && <Sidebar onCollapse={toggle} />}
      {pronto && collapsed && (
        <button type="button" className="sidebar-reopen" onClick={toggle} title="Mostrar menu">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
          </svg>
        </button>
      )}
      <div className="main">{children}</div>
    </div>
  );
}
