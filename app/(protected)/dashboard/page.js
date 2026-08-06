import stats from "../../../data/dashboard.json";
import DashboardCharts from "../../../components/DashboardCharts";

export default function DashboardPage() {
  return <DashboardCharts stats={stats} />;
}
