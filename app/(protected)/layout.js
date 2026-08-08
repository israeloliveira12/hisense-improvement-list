import AppShell from "../../components/AppShell";
import { LanguageProvider } from "../../lib/i18n";

export default function ProtectedLayout({ children }) {
  return (
    <LanguageProvider>
      <AppShell>{children}</AppShell>
    </LanguageProvider>
  );
}
