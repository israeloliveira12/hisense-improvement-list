import { getAcoes } from "../../../../lib/googleSheets";
import { buildAuditWorkbook } from "../../../../lib/excelExport";
import { translate } from "../../../../lib/i18n";

export const maxDuration = 30;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lang = ["pt", "en", "zh"].includes(searchParams.get("lang")) ? searchParams.get("lang") : "en";

  try {
    const acoes = await getAcoes();
    const wb = await buildAuditWorkbook(acoes, lang);
    const raw = await wb.xlsx.writeBuffer();
    const buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    const nome = `${translate(lang, "excel.nomeArquivo")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${nome}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (e) {
    return new Response(`Erro gerando a planilha: ${e.message}`, { status: 500 });
  }
}
