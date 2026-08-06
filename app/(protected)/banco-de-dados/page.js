import acoes from "../../../data/acoes.json";
import DatabaseTable from "../../../components/DatabaseTable";

export default function BancoDeDadosPage() {
  return <DatabaseTable acoes={acoes} />;
}
