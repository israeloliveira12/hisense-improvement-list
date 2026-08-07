"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import Slide from "./Slide";
import Topbar from "./Topbar";
import ActionEditor from "./ActionEditor";
import { useLanguage } from "../lib/i18n";

export default function PresentationClient({ acoes: initialAcoes, error }) {
  const { t } = useLanguage();
  const [acoes, setAcoes] = useState(initialAcoes);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [editando, setEditando] = useState(null);
  const fullscreenRef = useRef(null);

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
      if (!presenting) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") irPara(1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") irPara(-1);
      if (e.key === "Escape" && document.fullscreenElement) document.exitFullscreen();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting, irPara]);

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
    alert(t("pres.pptEmBreve"));
  }

  function aplicarMudancaLocal(no, campo, valor) {
    setAcoes((prev) => prev.map((a) => (a.no === no ? { ...a, [campo]: valor } : a)));
  }

  async function uploadFoto(no, slot, file) {
    setUploadingSlot(slot);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("no", no);
      fd.append("slot", slot);
      const res = await fetch("/api/drive/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha no upload");
      setAcoes((prev) =>
        prev.map((a) =>
          a.no === no
            ? { ...a, [slot === "before" ? "fotoBeforeId" : "fotoImprovementId"]: data.fileId }
            : a
        )
      );
    } catch (e) {
      alert(t("common.error") + ": " + e.message);
    } finally {
      setUploadingSlot(null);
    }
  }

  async function deletarFoto(no, slot, fileId) {
    if (!fileId) return;
    try {
      const res = await fetch("/api/drive/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ no, slot, fileId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setAcoes((prev) =>
        prev.map((a) =>
          a.no === no ? { ...a, [slot === "before" ? "fotoBeforeId" : "fotoImprovementId"]: null } : a
        )
      );
    } catch (e) {
      alert(t("common.error") + ": " + e.message);
    }
  }

  async function ajustarFoto(no, slot, val) {
    const campo = slot === "before" ? "fotoBeforeAjuste" : "fotoImprovementAjuste";
    setAcoes((prev) => prev.map((a) => (a.no === no ? { ...a, [campo]: val } : a)));
    try {
      const res = await fetch(`/api/detalhes/${encodeURIComponent(no)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: campo, value: val }),
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
        <button className="btn btn-ghost" onClick={baixarPpt}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 4v12m0 0l-4-4m4 4l4-4M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t("pres.baixarPpt")}
        </button>
        <button className="btn btn-primary" onClick={apresentar} disabled={!acaoAtual}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M5 3l16 9-16 9V3z" fill="currentColor" />
          </svg>
          {t("pres.apresentar")}
        </button>
      </Topbar>

      {error && (
        <div className="config-banner">
          <b>{t("config.title")}</b>
          {t("config.desc")}
          <code className="config-raw">{error}</code>
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
            <Slide acao={acaoAtual} onUploadFoto={uploadFoto} onDeleteFoto={deletarFoto} onAdjustFoto={ajustarFoto} uploadingSlot={uploadingSlot} />
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
        />
      )}
    </>
  );
}
