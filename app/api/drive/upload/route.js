import { NextResponse } from "next/server";
import { uploadFile } from "../../../../lib/googleDrive";
import { appendPptDetalhesFoto } from "../../../../lib/googleSheets";

export async function POST(request) {
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

  try {
    const fileId = await uploadFile(buffer, filename, file.type || "image/jpeg");
    const campo = slot === "before" ? "Foto Before" : "Foto Improvement";
    await appendPptDetalhesFoto(no, campo, fileId);
    return NextResponse.json({ ok: true, fileId, url: `/api/drive/file/${fileId}` });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
