import "./globals.css";

export const metadata = {
  title: "(Hisense) Improvement List",
  description: "Painel de acompanhamento das ações de melhoria Hisense — grupo Multilaser.",
};

// Sempre abre no tema claro, pedido explicito do usuario -- nao persiste
// entre sessoes (nem localStorage, nem segue o "prefers-color-scheme" do
// SO). Escrito ANTES do primeiro paint (script no <head>) pra nao piscar
// escuro por uma fracao de segundo em quem usa SO no modo escuro. Trocar
// pra escuro no ThemeToggle vale so pra aba atual.
const THEME_INIT_SCRIPT = `
  try {
    localStorage.removeItem("hisense-theme");
    document.documentElement.setAttribute("data-theme", "light");
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
