import Sidebar from "../../components/Sidebar";

export default function ProtectedLayout({ children }) {
  return (
    <div className="app">
      <Sidebar />
      <div className="main">{children}</div>
    </div>
  );
}
