import { getAcoes } from "../../../lib/googleSheets";
import DatabaseTable from "../../../components/DatabaseTable";

export const dynamic = "force-dynamic";

export default async function BancoDeDadosPage() {
  let acoes = [];
  let error = null;
  try {
    acoes = await getAcoes();
  } catch (e) {
    error = String(e.message || e);
  }
  return <DatabaseTable acoes={acoes} error={error} />;
}
