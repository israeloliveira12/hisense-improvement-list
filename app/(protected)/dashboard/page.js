import { Suspense } from "react";
import { getDashboardStats } from "../../../lib/googleSheets";
import DashboardCharts from "../../../components/DashboardCharts";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let stats = null;
  let error = null;
  try {
    stats = await getDashboardStats();
  } catch (e) {
    error = String(e.message || e);
  }
  // DashboardCharts le a aba ativa da URL (useSearchParams) pra sobreviver
  // a um F5 -- o Next exige que quem usa useSearchParams fique dentro de um
  // Suspense (mesmo padrao ja usado em app/login/page.js).
  return (
    <Suspense>
      <DashboardCharts initialStats={stats} initialError={error} />
    </Suspense>
  );
}
