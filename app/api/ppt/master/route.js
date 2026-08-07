import { getAcoes } from "../../../../lib/googleSheets";
import { buildMasterPptx } from "../../../../lib/pptBuilder";

// Gerar 50 acoes + fotos pode passar do limite padrao de execucao da
// Vercel (10s) -- pede mais tempo. No plano Hobby, o teto real e mais
// baixo que isso mesmo pedindo mais (nao consigo confirmar o numero exato
// sem testar em producao).
export const maxDuration = 60;

export async function GET() {
  try {
    const acoes = await getAcoes();
    const buffer = await buildMasterPptx(acoes);
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="Improvement_List_${new Date().toISOString().slice(0, 10)}.pptx"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (e) {
    return new Response(`Erro gerando a apresentação completa: ${e.message}`, { status: 500 });
  }
}
