import { getAcoes } from "../../../lib/googleSheets";
import PresentationClient from "../../../components/PresentationClient";

export const dynamic = "force-dynamic";

export default async function ApresentacaoPage() {
  let acoes = [];
  let error = null;
  try {
    acoes = await getAcoes();
  } catch (e) {
    error = String(e.message || e);
  }
  return <PresentationClient acoes={acoes} error={error} />;
}
