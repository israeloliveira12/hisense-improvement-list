import "./globals.css";

export const metadata = {
  title: "(Hisense) Improvement List",
  description: "Painel de acompanhamento das ações de melhoria Hisense — grupo Multilaser.",
};

const THEME_INIT_SCRIPT = `
  try {
    var t = localStorage.getItem("hisense-theme");
    if (t === "light" || t === "dark") {
      document.documentElement.setAttribute("data-theme", t);
    }
  } catch (e) {}
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
