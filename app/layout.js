import "./globals.css";

export const metadata = {
  title: "(Hisense) Improvement List",
  description: "Painel de acompanhamento das ações de melhoria Hisense — grupo Multilaser.",
};

// Sempre abre no tema claro (o CSS ja garante isso sozinho -- ver
// globals.css, nao tem media query de escuro por SO). Esse script so
// limpa uma preferencia antiga que podia ter ficado salva no localStorage
// de uma versao anterior do site. setAttribute vem ANTES do try/catch de
// proposito: se o localStorage falhar (modo privado, storage bloqueado),
// isso nao pode impedir o resto do script de rodar -- foi exatamente esse
// bug que fez o site abrir escuro pra um usuario.
const THEME_INIT_SCRIPT = `
  document.documentElement.setAttribute("data-theme", "light");
  try { localStorage.removeItem("hisense-theme"); } catch (e) {}
`;

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
