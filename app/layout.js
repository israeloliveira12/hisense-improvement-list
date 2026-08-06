import "./globals.css";

export const metadata = {
  title: "(Hisense) Improvement List",
  description: "Painel de acompanhamento das ações de melhoria Hisense — grupo Multilaser.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
