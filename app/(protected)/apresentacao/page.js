import acoes from "../../../data/acoes.json";
import PresentationClient from "../../../components/PresentationClient";

export default function ApresentacaoPage() {
  return <PresentationClient acoes={acoes} />;
}
