import Sidebar from "../../components/Sidebar";
import { LanguageProvider } from "../../lib/i18n";

export default function ProtectedLayout({ children }) {
  return (
    <LanguageProvider>
      <div className="app">
        <Sidebar />
        <div className="main">{children}</div>
      </div>
    </LanguageProvider>
  );
}
