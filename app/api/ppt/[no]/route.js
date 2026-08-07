import { getAcoes } from "../../../../lib/googleSheets";
import { buildActionPptx } from "../../../../lib/pptBuilder";

export async function GET(request, { params }) {
  const { no } = params;

  try {
    const acoes = await getAcoes();
    const acao = acoes.find((a) => a.no === no);
    if (!acao) {
      return new Response(`Ação ${no} não encontrada.`, { status: 404 });
    }

    const buffer = await buildActionPptx(acao);
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="Acao_${acao.no}.pptx"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (e) {
    return new Response(`Erro gerando o PPT: ${e.message}`, { status: 500 });
  }
}
