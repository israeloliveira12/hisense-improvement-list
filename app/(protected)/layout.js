import AppShell from "../../components/AppShell";

// LanguageProvider agora mora no layout raiz (app/layout.js) -- cobre o
// login tambem, nao so as paginas protegidas (ver app/layout.js pro
// motivo: o login inteiro ficava sempre em portugues, ignorando o idioma
// salvo no localStorage, porque o Provider nunca chegava ate ele).
export default function ProtectedLayout({ children }) {
  return <AppShell>{children}</AppShell>;
}
