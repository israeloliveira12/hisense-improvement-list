"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import Slide from "./Slide";
import Topbar from "./Topbar";
import ActionEditor from "./ActionEditor";
import SlideZoomControl from "./SlideZoomControl";
import DownloadMenu from "./DownloadMenu";
import { useLanguage } from "../lib/i18n";

export default function PresentationClient({ acoes: initialAcoes, error }) {
  const { t } = useLanguage();
  const [acoes, setAcoes] = useState(initialAcoes);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [editando, setEditando] = useState(null);
  const [gerandoDeck, setGerandoDeck] = useState(null); // { feito, total } enquanto monta o .pptx
  const fullscreenRef = useRef(null);
  const lightboxAbertoRef = useRef(false); // enquanto o carrossel de fotos esta aberto, seta do teclado e dele, nao do slide

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return acoes;
    return acoes.filter(
      (a) =>
        a.no.toLowerCase().includes(q) ||
        (a.item || "").toLowerCase().includes(q) ||
        (a.dept || "").toLowerCase().includes(q)
    );
  }, [acoes, query]);

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
    window.open(`/api/ppt/${encodeURIComponent(acaoAtual.no)}`, "_blank");
  }

  // O deck completo e montado no NAVEGADOR, nao no servidor -- ver
  // components/baixarDeck.js pro motivo (limite de resposta/tempo da funcao
  // serverless nao cabe um arquivo de 25 MB com ~100 fotos).
  async function baixarTudo() {
    if (gerandoDeck) return;
    if (!window.confirm(t("pres.confirmarBaixarTudo", { n: acoes.length }))) return;
    setGerandoDeck({ feito: 0, total: acoes.length });
    try {
      const { baixarApresentacaoCompleta } = await import("./baixarDeck");
      await baixarApresentacaoCompleta(acoes, (feito, total) => setGerandoDeck({ feito, total }));
    } catch (e) {
      alert(`${t("common.error")}: ${e.message}`);
    } finally {
      setGerandoDeck(null);
    }
  }

  function aplicarMudancaLocal(no, campo, valor) {
    setAcoes((prev) => prev.map((a) => (a.no === no ? { ...a, [campo]: valor } : a)));
  }

  function acaoDeletada(no) {
    setAcoes((prev) => prev.filter((a) => a.no !== no));
    setEditando(null);
  }

  async function uploadFoto(no, slot, file) {
    setUploadingSlot(slot);
    const campo = slot === "before" ? "fotosBefore" : "fotosImprovement";
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("no", no);
      fd.append("slot", slot);
      const res = await fetch("/api/drive/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha no upload");
      setAcoes((prev) =>
        prev.map((a) => (a.no === no ? { ...a, [campo]: [...(a[campo] || []), data.fileId] } : a))
      );
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
      <Topbar title={t("pres.title")} sub={t("pres.sub", { n: acoes.length })}>
        <SlideZoomControl />
        <DownloadMenu
          onBaixarUm={baixarPpt}
          onBaixarTudo={baixarTudo}
          podeBaixarUm={Boolean(acaoAtual)}
          gerando={Boolean(gerandoDeck)}
        />
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
          <div className="pres-canvas-wrap" ref={fullscreenRef}>
            <Slide
              acao={acaoAtual}
              onUploadFoto={uploadFoto}
              onDeleteFoto={deletarFoto}
              onReorderFoto={reordenarFotos}
              onEditCaption={editarLegenda}
              uploadingSlot={uploadingSlot}
              onLightboxOpenChange={(aberto) => { lightboxAbertoRef.current = aberto; }}
            />
            {presenting && (
              <div className="present-hint">
                ← → · Esc · {selected + 1} / {filtradas.length}
              </div>
            )}
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
          onDeleted={acaoDeletada}
        />
      )}
    </>
  );
}
