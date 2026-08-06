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
  return <DashboardCharts initialStats={stats} initialError={error} />;
}
