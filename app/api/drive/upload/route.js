import { NextResponse } from "next/server";
import { uploadFile, deleteFile } from "../../../../lib/googleDrive";
import { appendPptDetalhesFoto, removePptDetalhesFoto } from "../../../../lib/googleSheets";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const no = formData.get("no");
    const slot = formData.get("slot"); // "before" | "improvement"

    if (!file || !no || !slot) {
      return NextResponse.json({ error: "Parâmetros faltando (file, no, slot)." }, { status: 400 });
    }
    if (!["before", "improvement"].includes(slot)) {
      return NextResponse.json({ error: "slot inválido." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const filename = `${no}_${slot}_${Date.now()}.${ext}`;

    const fileId = await uploadFile(buffer, filename, file.type || "image/jpeg");
    // "registrar=0" sobe o arquivo pro Drive mas NAO o adiciona na lista de
    // fotos da acao. Usado pela capa de video (um quadro extraido do
    // proprio video): ela precisa existir no Drive pra ser exibida, mas
    // nao e um anexo separado -- quem aponta pra ela e o metadado do
    // video. Sem o parametro, o comportamento e o de sempre (registra).
    if (formData.get("registrar") !== "0") {
      const campo = slot === "before" ? "Foto Before" : "Foto Improvement";
      await appendPptDetalhesFoto(no, campo, fileId);
    }
    return NextResponse.json({ ok: true, fileId, url: `/api/drive/file/${fileId}` });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { no, slot, fileId } = await request.json();

    if (!no || !slot || !fileId) {
      return NextResponse.json({ error: "Parâmetros faltando (no, slot, fileId)." }, { status: 400 });
    }
    if (!["before", "improvement"].includes(slot)) {
      return NextResponse.json({ error: "slot inválido." }, { status: 400 });
    }

    const campo = slot === "before" ? "Foto Before" : "Foto Improvement";
    // tira SO essa foto da lista na planilha primeiro -- se o arquivo ja
    // tiver sido apagado direto no Drive (fora do site), deleteFile()
    // abaixo falharia, e nao queremos deixar uma referencia quebrada.
    await removePptDetalhesFoto(no, campo, fileId);
    try {
      await deleteFile(fileId);
    } catch (e) {
      // arquivo ja pode nao existir mais no Drive (ex.: apagado por fora) --
      // a referencia na planilha ja foi limpa, entao nao e mais um problema.
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
