// URL do proxy que serve foto/video/documento do Drive
// (app/api/drive/file/[id]). Centralizado aqui porque a tela e o gerador
// de .pptx precisam pedir EXATAMENTE a mesma URL -- se cada um montasse a
// sua, o navegador guardaria o mesmo arquivo duas vezes no cache.
//
// VERSAO_CACHE existe pra poder INVALIDAR o cache do navegador de todo
// mundo de uma vez. A resposta e marcada como "immutable" por um ano (ver
// a rota), entao o navegador nao busca de novo nem com F5 -- a unica
// forma de furar isso e mudar a URL.
//
// Historico de bump:
//  v2 -- a rota servia sem "Content-Length"; quando a transferencia caia
//        no meio, o navegador guardava a resposta CORTADA como se fosse
//        completa, e a foto ficava quebrada pra sempre naquele navegador
//        mesmo com o arquivo intacto no Drive ("algumas imagens pararam
//        de carregar"). Com o tamanho declarado isso nao se repete, mas
//        quem ja tinha o cache sujo precisava de uma URL nova.
const VERSAO_CACHE = "2";

export function urlArquivoDrive(fileId) {
  return `/api/drive/file/${fileId}?v=${VERSAO_CACHE}`;
}
