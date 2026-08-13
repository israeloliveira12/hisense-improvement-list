"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import Slide, { detectarTipoArquivo } from "./Slide";
import Topbar from "./Topbar";
import ActionEditor from "./ActionEditor";
import NewActionModal from "./NewActionModal";
import SlideZoomControl from "./SlideZoomControl";
import DownloadMenu from "./DownloadMenu";
import FilterMenu from "./FilterMenu";
import { useLanguage } from "../lib/i18n";

export default function PresentationClient({ acoes: initialAcoes, error }) {
  const { t, lang } = useLanguage();
  const [acoes, setAcoes] = useState(initialAcoes);
  const [query, setQuery] = useState("");
  const [apenasOpen, setApenasOpen] = useState(false);
  const [apenasInvestimento, setApenasInvestimento] = useState(false);
  const [deptoFiltro, setDeptoFiltro] = useState("");
  const [selected, setSelected] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [fsZoom, setFsZoom] = useState(1);
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [editando, setEditando] = useState(null);
  const [criandoNova, setCriandoNova] = useState(false);
  const [gerandoDeck, setGerandoDeck] = useState(null); // { feito, total } enquanto monta o .pptx
  const fullscreenRef = useRef(null);
  const lightboxAbertoRef = useRef(false); // enquanto o carrossel de fotos esta aberto, seta do teclado e dele, nao do slide

  const departamentos = useMemo(() => {
    const set = new Set();
    acoes.forEach((a) => a.dept && set.add(a.dept));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [acoes]);

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    return acoes.filter((a) => {
      if (apenasOpen && a.status !== "open") return false;
      if (apenasInvestimento && a.investmentFlag !== "yes") return false;
      if (deptoFiltro && a.dept !== deptoFiltro) return false;
      if (q && !(a.no.toLowerCase().includes(q) || (a.item || "").toLowerCase().includes(q) || (a.dept || "").toLowerCase().includes(q))) {
        return false;
      }
      return true;
    });
  }, [acoes, query, apenasOpen, apenasInvestimento, deptoFiltro]);

  function alternarApenasOpen(v) {
    setApenasOpen(v);
    setSelected(0);
  }

  function alternarApenasInvestimento(v) {
    setApenasInvestimento(v);
    setSelected(0);
  }

  function mudarDeptoFiltro(v) {
    setDeptoFiltro(v);
    setSelected(0);
  }

  const acaoAtual = filtradas[selected] || filtradas[0] || null;

  const irPara = useCallback(
    (delta) => {
      setSelected((i) => {
        const next = i + delta;
        if (next < 0 || next >= filtradas.length) return i;
        return next;
      });
    },
    [filtradas.length]
  );

  useEffect(() => {
    function onKey(e) {
      // com o carrossel de fotos aberto (ver Slide.js/PhotoLightbox), a seta
      // e dele -- nao navega o slide por baixo. Sem isso os dois escutavam
      // a mesma tecla e o slide sempre "ganhava" (o listener dele foi
      // registrado primeiro, entao roda primeiro).
      if (lightboxAbertoRef.current) return;
      // nao rouba a seta de quem esta digitando (busca, comentario editavel)
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") irPara(1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") irPara(-1);
      if (e.key === "Escape" && document.fullscreenElement) document.exitFullscreen();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [irPara]);

  useEffect(() => {
    function onFsChange() {
      setPresenting(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Ctrl+scroll (e pinch de trackpad, que o navegador reporta como wheel com
  // ctrlKey) so e capturado ENQUANTO apresentando -- preventDefault impede o
  // navegador de aplicar o zoom nativo na pagina inteira (o bug reportado: sair
  // da apresentacao e a pagina toda ficar gigante). Fora da apresentacao nenhum
  // listener fica registrado, entao o zoom nativo do site continua normal.
  useEffect(() => {
    if (!presenting) {
      setFsZoom(1);
      return undefined;
    }
    const el = fullscreenRef.current;
    if (!el) return undefined;
    function onWheel(e) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setFsZoom((z) => Math.min(2.2, Math.max(0.6, z - e.deltaY * 0.0015)));
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [presenting]);

  async function apresentar() {
    try {
      await fullscreenRef.current?.requestFullscreen();
      setPresenting(true);
    } catch (e) {
      setPresenting(true);
    }
  }

  function baixarPpt() {
    if (!acaoAtual) return;
    window.open(`/api/ppt/${encodeURIComponent(acaoAtual.no)}?lang=${lang}`, "_blank");
  }

  // O deck completo e montado no NAVEGADOR, nao no servidor -- ver
  // components/baixarDeck.js pro motivo (limite de resposta/tempo da funcao
  // serverless nao cabe um arquivo de 25 MB com ~100 fotos). `lista` e
  // `acoes` inteiro ("Baixar tudo") ou `filtradas` ("Baixar com filtro").
  // Busca as stats do dashboard pra montar o slide "Improvement Overview"
  // logo apos a capa -- mesmo numero que a tela do Dashboard mostra, so que
  // sem nenhum filtro aplicado (visao geral, independente do que estava
  // filtrado na apresentacao).
  async function gerarDeck(lista, confirmKey) {
    if (gerandoDeck || !lista.length) return;
    if (!window.confirm(t(confirmKey, { n: lista.length }))) return;
    setGerandoDeck({ feito: 0, total: lista.length });
    try {
      const { baixarApresentacaoCompleta } = await import("./baixarDeck");
      let stats = null;
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) stats = await res.json();
      } catch (e) {
        stats = null; // sem stats o deck sai igual, so sem o slide de overview
      }
      const { falhasFoto } = await baixarApresentacaoCompleta(lista, (feito, total) => setGerandoDeck({ feito, total }), lang, stats);
      if (falhasFoto && falhasFoto.length) {
        alert(`${t("pres.fotosFalharamNoDeck")}\n\n${falhasFoto.length}x:\n${falhasFoto.slice(0, 8).join("\n")}${falhasFoto.length > 8 ? "\n…" : ""}`);
      }
    } catch (e) {
      alert(`${t("common.error")}: ${e.message}`);
    } finally {
      setGerandoDeck(null);
    }
  }

  function baixarTudo() {
    return gerarDeck(acoes, "pres.confirmarBaixarTudo");
  }

  function baixarFiltrados() {
    return gerarDeck(filtradas, "pres.confirmarBaixarFiltrados");
  }

  function aplicarMudancaLocal(no, campo, valor) {
    setAcoes((prev) => prev.map((a) => (a.no === no ? { ...a, [campo]: valor } : a)));
  }

  // Chamado depois que o editor confirma o salvamento relendo a acao da
  // planilha -- troca o objeto inteiro em vez de remendar campo a campo,
  // entao slide, banco de dados e PPT passam a refletir exatamente o que
  // ficou gravado (inclusive campos derivados, como target/investmentFlag).
  function substituirAcao(noAntigo, nova) {
    setAcoes((prev) => prev.map((a) => (a.no === noAntigo ? nova : a)));
    setEditando((atual) => (atual && atual.no === noAntigo ? nova : atual));
  }

  function acaoDeletada(no) {
    setAcoes((prev) => prev.filter((a) => a.no !== no));
    setEditando(null);
  }

  // Depois de criar, recarrega a lista inteira (mais simples que montar o
  // objeto novo na mao) e pula direto pra ação recem-criada -- limpa os
  // filtros ativos pra garantir que ela nao fique escondida por engano.
  async function acaoCriada(no) {
    try {
      const res = await fetch("/api/acoes");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAcoes(data.acoes);
      setQuery("");
      setApenasOpen(false);
      setApenasInvestimento(false);
      setDeptoFiltro("");
      const idx = data.acoes.findIndex((a) => a.no === no);
      setSelected(idx >= 0 ? idx : 0);
    } catch (e) {
      alert(t("common.error") + ": " + e.message);
    }
  }

  // Mesmo formato esparso "id:tipo:nomeCodificado,..." que o servidor
  // espera (ver parseAnexoMeta em lib/googleSheets.js) -- so entra quem
  // NAO e foto (o tipo default nao precisa de entrada nenhuma).
  function formatarAnexoMeta(mapa) {
    return Object.entries(mapa)
      .map(([id, m]) => `${id}:${m.tipo}:${encodeURIComponent(m.nome || "")}`)
      .join(",");
  }

  // Video/documento nao passam pelo upload antigo (que manda o arquivo
  // inteiro de uma vez) porque toda funcao serverless da Vercel tem um
  // teto de ~4.5MB de corpo de requisicao imposto pela propria plataforma
  // (mesmo teto do lado da resposta, ja documentado em lib/pptBuilder.js)
  // -- foto escapa disso porque e redimensionada antes de enviar, video
  // nao tem como ser "redimensionado" do mesmo jeito.
  //
  // O navegador manda o arquivo em PEDACOS pequenos pra nossa PROPRIA
  // rota (mesma origem, nunca esbarra em CORS), que repassa cada pedaco
  // pro Drive server-a-servidor -- ver lib/googleDrive.js
  // (criarSessaoUploadResumavel/enviarPedacoResumavel) pro protocolo
  // completo e o motivo de nao ser o navegador falando direto com o
  // Google (tentativa anterior, revertida por falhar com "Failed to
  // fetch" -- bem provavelmente CORS na sessao de upload).
  async function uploadDireto(file) {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const filename = `anexo_${Date.now()}.${ext}`;
    const resInit = await fetch("/api/drive/upload-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, mimeType: file.type || "application/octet-stream" }),
    });
    const dataInit = await resInit.json();
    if (!resInit.ok) throw new Error(dataInit.error || t("pres.uploadFalhou"));

    const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB -- folga confortavel abaixo do teto de ~4.5MB da Vercel
    const total = file.size;
    let inicio = 0;
    let fileId = null;
    while (inicio < total) {
      const fim = Math.min(inicio + CHUNK_SIZE, total);
      const pedaco = file.slice(inicio, fim);
      const resChunk = await fetch("/api/drive/upload-chunk", {
        method: "POST",
        headers: {
          "X-Upload-Url": dataInit.uploadUrl,
          "X-Chunk-Start": String(inicio),
          "X-Total-Bytes": String(total),
          "Content-Type": "application/octet-stream",
        },
        body: pedaco,
      });
      const dataChunk = await resChunk.json().catch(() => ({}));
      if (!resChunk.ok) throw new Error(dataChunk.error || t("pres.uploadFalhou"));
      if (dataChunk.completo) fileId = dataChunk.fileId;
      inicio = fim;
    }
    if (!fileId) throw new Error(t("pres.uploadFalhou"));
    return fileId;
  }

  async function uploadFoto(no, slot, file) {
    setUploadingSlot(slot);
    const campo = slot === "before" ? "fotosBefore" : "fotosImprovement";
    const campoMeta = slot === "before" ? "fotosBeforeMeta" : "fotosImprovementMeta";
    const campoMetaApi = slot === "before" ? "fotoBeforeTipo" : "fotoImprovementTipo";
    const tipo = detectarTipoArquivo(file);
    try {
      let fileId;
      if (tipo === "foto") {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("no", no);
        fd.append("slot", slot);
        const res = await fetch("/api/drive/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t("pres.uploadFalhou"));
        fileId = data.fileId;
      } else {
        fileId = await uploadDireto(file);
        const resFinish = await fetch("/api/drive/upload-finish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ no, slot, fileId }),
        });
        const dataFinish = await resFinish.json().catch(() => ({}));
        if (!resFinish.ok) throw new Error(dataFinish.error || `HTTP ${resFinish.status}`);
      }
      setAcoes((prev) =>
        prev.map((a) => (a.no === no ? { ...a, [campo]: [...(a[campo] || []), fileId] } : a))
      );
      // video/documento precisam da marcacao de tipo -- foto e o default,
      // nao precisa gravar nada (mesma logica esparsa da rotacao).
      if (tipo !== "foto") {
        const acaoAtual = acoes.find((a) => a.no === no);
        const novoMapa = { ...(acaoAtual?.[campoMeta] || {}), [fileId]: { tipo, nome: file.name } };
        setAcoes((prev) => prev.map((a) => (a.no === no ? { ...a, [campoMeta]: novoMapa } : a)));
        const resMeta = await fetch(`/api/detalhes/${encodeURIComponent(no)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field: campoMetaApi, value: formatarAnexoMeta(novoMapa) }),
        });
        const dataMeta = await resMeta.json().catch(() => ({}));
        if (!resMeta.ok) throw new Error(dataMeta.error || `HTTP ${resMeta.status}`);
      }
    } catch (e) {
      alert(t("common.error") + ": " + e.message);
    } finally {
      setUploadingSlot(null);
    }
  }

  async function deletarFoto(no, slot, fileId) {
    if (!fileId) return;
    const campo = slot === "before" ? "fotosBefore" : "fotosImprovement";
    try {
      const res = await fetch("/api/drive/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ no, slot, fileId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setAcoes((prev) =>
        prev.map((a) => (a.no === no ? { ...a, [campo]: (a[campo] || []).filter((id) => id !== fileId) } : a))
      );
    } catch (e) {
      alert(t("common.error") + ": " + e.message);
    }
  }

  // Mover uma foto de posicao (troca com a vizinha) -- os 2 primeiros IDs
  // da lista viram as fotos "principais" automaticamente, entao mover e o
  // unico gesto que decide tanto ordem quanto quem e principal.
  async function reordenarFotos(no, slot, novaOrdem) {
    const campo = slot === "before" ? "fotosBefore" : "fotosImprovement";
    setAcoes((prev) => prev.map((a) => (a.no === no ? { ...a, [campo]: novaOrdem } : a)));
    try {
      const fieldApi = slot === "before" ? "fotoBeforeOrdem" : "fotoImprovementOrdem";
      const res = await fetch(`/api/detalhes/${encodeURIComponent(no)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: fieldApi, value: novaOrdem.join(",") }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    } catch (e) {
      alert(t("common.error") + ": " + e.message);
    }
  }

  // Gira uma foto 90° por clique (0->90->180->270->0). Guardado a parte da
  // ordem, so pras fotos que tem rotacao != 0 (formato esparso "id:deg").
  async function rotacionarFoto(no, slot, fileId) {
    const campo = slot === "before" ? "fotosBeforeRotacao" : "fotosImprovementRotacao";
    const acaoAlvo = acoes.find((a) => a.no === no);
    const atual = (acaoAlvo && acaoAlvo[campo]) || {};
    const novoDeg = ((atual[fileId] || 0) + 90) % 360;
    const novoMapa = { ...atual };
    if (novoDeg === 0) delete novoMapa[fileId];
    else novoMapa[fileId] = novoDeg;

    setAcoes((prev) => prev.map((a) => (a.no === no ? { ...a, [campo]: novoMapa } : a)));
    try {
      const fieldApi = slot === "before" ? "fotoBeforeRotacao" : "fotoImprovementRotacao";
      const value = Object.entries(novoMapa).map(([id, deg]) => `${id}:${deg}`).join(",");
      const res = await fetch(`/api/detalhes/${encodeURIComponent(no)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: fieldApi, value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    } catch (e) {
      alert(t("common.error") + ": " + e.message);
    }
  }

  async function editarLegenda(no, campo, valor) {
    setAcoes((prev) => prev.map((a) => (a.no === no ? { ...a, [campo]: valor } : a)));
    try {
      const res = await fetch(`/api/detalhes/${encodeURIComponent(no)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: campo, value: valor }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    } catch (e) {
      alert(t("common.error") + ": " + e.message);
    }
  }

  return (
    <>
      <Topbar title={t("pres.title")}>
        <FilterMenu
          apenasOpen={apenasOpen}
          onToggleApenasOpen={alternarApenasOpen}
          apenasInvestimento={apenasInvestimento}
          onToggleApenasInvestimento={alternarApenasInvestimento}
          departamentos={departamentos}
          deptoFiltro={deptoFiltro}
          onChangeDepto={mudarDeptoFiltro}
        />
        <SlideZoomControl />
        <DownloadMenu
          onBaixarUm={baixarPpt}
          onBaixarTudo={baixarTudo}
          onBaixarFiltrados={baixarFiltrados}
          podeBaixarUm={Boolean(acaoAtual)}
          filtroAtivo={apenasOpen || apenasInvestimento || Boolean(deptoFiltro) || Boolean(query.trim())}
          totalFiltrado={filtradas.length}
          gerando={Boolean(gerandoDeck)}
        />
        <button type="button" className="icon-btn" title={t("db.novaAcao")} onClick={() => setCriandoNova(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button type="button" className="icon-btn primary" title={t("pres.apresentar")} onClick={apresentar} disabled={!acaoAtual}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M5 3l16 9-16 9V3z" fill="currentColor" />
          </svg>
        </button>
      </Topbar>

      {error && (
        <div className="config-banner">
          <b>{t("config.title")}</b>
          {t("config.desc")}
          <code className="config-raw">{error}</code>
        </div>
      )}

      {gerandoDeck && (
        <div className="deck-progress">
          <div className="deck-progress-txt">
            {t("pres.gerandoDeck", { feito: gerandoDeck.feito, total: gerandoDeck.total })}
          </div>
          <div className="deck-progress-track">
            <div
              className="deck-progress-fill"
              style={{ width: `${gerandoDeck.total ? (gerandoDeck.feito / gerandoDeck.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="view">
        <div className="pres-layout">
          <div className="pres-rail">
            <input
              className="rail-search"
              placeholder={t("pres.buscar")}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(0);
              }}
            />
            {filtradas.map((a, i) => (
              <button
                key={a.no}
                className={"rail-card" + (i === selected ? " active" : "")}
                onClick={() => setSelected(i)}
              >
                <div className="rail-no">{a.no}</div>
                <div>
                  <div className="rail-item-name">{a.item}</div>
                  <div className="rail-meta">
                    <span className={"status-dot " + a.status} />
                    {a.dept}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="pres-canvas-wrap" ref={fullscreenRef} style={presenting ? { "--fs-slide-zoom": fsZoom } : undefined}>
            <Slide
              acao={acaoAtual}
              onUploadFoto={uploadFoto}
              onDeleteFoto={deletarFoto}
              onReorderFoto={reordenarFotos}
              onRotateFoto={rotacionarFoto}
              onEditCaption={editarLegenda}
              uploadingSlot={uploadingSlot}
              onLightboxOpenChange={(aberto) => { lightboxAbertoRef.current = aberto; }}
            />
          </div>
        </div>
      </div>

      {!presenting && acaoAtual && (
        <button type="button" className="edit-shortcut" onClick={() => setEditando(acaoAtual)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9" strokeLinecap="round" />
            <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t("pres.editarAcao")}
        </button>
      )}

      {editando && (
        <ActionEditor
          acao={editando}
          onClose={() => setEditando(null)}
          onFieldChanged={aplicarMudancaLocal}
          onSaved={substituirAcao}
          onDeleted={acaoDeletada}
        />
      )}

      {criandoNova && (
        <NewActionModal
          onClose={() => setCriandoNova(false)}
          onCreated={acaoCriada}
        />
      )}
    </>
  );
}
