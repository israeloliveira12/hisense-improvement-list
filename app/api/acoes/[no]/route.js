import { NextResponse } from "next/server";
import { getAcoes, updateAcaoField, renameAcaoId, deleteAcao } from "../../../../lib/googleSheets";

export const dynamic = "force-dynamic";

// Le UMA acao direto da planilha. Usado pelo editor logo depois de salvar,
// pra confirmar que o que ficou gravado e o que a tela vai mostrar (em vez
// de assumir que deu certo e remendar o estado local campo a campo).
export async function GET(request, { params }) {
  const { no } = params;
  try {
    const acoes = await getAcoes();
    const alvo = acoes.find((a) => String(a.no) === String(no));
    if (!alvo) return NextResponse.json({ error: `Ação ${no} não encontrada.` }, { status: 404 });
    return NextResponse.json({ acao: alvo });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}

const CAMPOS_PERMITIDOS = new Set([
  "item", "dept", "person", "deadline",
  "audit", "process", "occur", "deadlineOriginal", "status", "delayReason",
]);

export async function PATCH(request, { params }) {
  const { no } = params;

  try {
    const { field, value } = await request.json();
    if (field === "no") {
      const novo = await renameAcaoId(no, value);
      return NextResponse.json({ ok: true, no: novo });
    }
    if (!CAMPOS_PERMITIDOS.has(field)) {
      return NextResponse.json({ error: `Campo não editável: ${field}` }, { status: 400 });
    }
    await updateAcaoField(no, field, value);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { no } = params;
  try {
    await deleteAcao(no);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
