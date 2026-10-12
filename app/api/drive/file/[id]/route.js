import { getFileStream, getFileMeta } from "../../../../../lib/googleDrive";

// Espera crescente entre tentativas -- falha do Drive aqui costuma ser
// passageira (limite de taxa, renovacao de token, oscilacao de rede).
function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Abre o arquivo no Drive com algumas tentativas. So vale a pena tentar de
// novo ANTES de responder: depois que o primeiro byte sai, o status ja foi
// enviado e nao da mais pra voltar atras.
async function abrirComRetentativa(id, tentativas = 3) {
  let ultimoErro;
  for (let i = 0; i < tentativas; i++) {
    try {
      return await Promise.all([getFileMeta(id), getFileStream(id)]);
    } catch (e) {
      ultimoErro = e;
      const status = e?.code || e?.response?.status;
      // 404/403 e definitivo (arquivo nao existe ou sem permissao) --
      // insistir so atrasaria a resposta.
      if (status === 404 || status === 403) break;
      if (i < tentativas - 1) await esperar(250 * (i + 1));
    }
  }
  throw ultimoErro;
}

export async function GET(request, { params }) {
  const { id } = params;
  let meta;
  let stream;
  try {
    [meta, stream] = await abrirComRetentativa(id);
  } catch (e) {
    // "no-store" de proposito: sem isso o navegador poderia guardar a
    // falha e continuar mostrando imagem quebrada mesmo depois do Drive
    // voltar ao normal.
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  // Repassa o stream do Drive respeitando contrapressao: enfileirar tudo
  // de uma vez (o que o codigo fazia antes) segura o arquivo inteiro na
  // memoria da funcao serverless e, com varias fotos grandes ao mesmo
  // tempo, era caminho pra estourar memoria no meio da resposta.
  const tamanhoEsperado = Number(meta.size) || 0;
  let enviados = 0;
  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => {
        enviados += chunk.length;
        controller.enqueue(chunk);
        if (controller.desiredSize !== null && controller.desiredSize <= 0) stream.pause();
      });
      stream.on("end", () => {
        // Terminou com menos bytes do que o arquivo tem: fecha com ERRO em
        // vez de fechar normal. Fechar normal entregaria um 200 curto, que
        // e justamente o que o navegador guardava como se fosse a imagem
        // inteira. Com erro, a conexao quebra e nada e cacheado.
        if (tamanhoEsperado && enviados < tamanhoEsperado) {
          console.error(`[drive/file] ${id}: recebido ${enviados} de ${tamanhoEsperado} bytes`);
          controller.error(new Error("resposta incompleta do Drive"));
          return;
        }
        controller.close();
      });
      stream.on("error", (err) => controller.error(err));
    },
    pull() {
      stream.resume();
    },
    cancel() {
      // navegador desistiu (trocou de slide, fechou a aba): nao adianta
      // continuar baixando do Drive.
      stream.destroy();
    },
  });

  const headers = {
    "Content-Type": meta.mimeType || "application/octet-stream",
    // Cache FOREVER, de proposito: o ID do arquivo no Drive e imutavel --
    // uma foto nunca e sobrescrita, so trocada por um ID novo (upload) ou
    // removida da lista da acao (delete). Ou seja, um ID sempre aponta pro
    // MESMO conteudo pra sempre; nao ha risco de servir bytes desatualizados
    // pra um ID que ja foi visto antes. "private" (nao "public"): so o
    // navegador de quem esta logado guarda, nada de cache compartilhado —
    // continua atras do gate de senha do site.
    "Cache-Control": "private, max-age=31536000, immutable",
  };
  // Content-Length e o que torna o cache "imutavel" acima seguro. Sem ele,
  // uma resposta cortada no meio (erro do Drive depois do primeiro byte,
  // funcao reciclada, conexao caida) chega ao navegador como 200 de
  // tamanho desconhecido, e fica guardada PRA SEMPRE como se estivesse
  // completa -- a foto passa a aparecer quebrada mesmo com o arquivo
  // intacto no Drive, e nem recarregar a pagina resolve. Com o tamanho
  // declarado, o navegador percebe que veio menos do que devia, descarta
  // e busca de novo. Era exatamente esse o bug de "algumas imagens
  // pararam de carregar".
  if (meta.size) headers["Content-Length"] = String(meta.size);

  return new Response(webStream, { headers });
}
