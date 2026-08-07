"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../lib/i18n";

function PhotoLightbox({ ids, startIndex, onClose }) {
  const [index, setIndex] = useState(startIndex || 0);
  const [zoom, setZoom] = useState(1);
  const { t } = useLanguage();

  useEffect(() => setZoom(1), [index]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % ids.length);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + ids.length) % ids.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ids.length, onClose]);

  if (!ids || ids.length === 0) return null;
  const id = ids[index];

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button type="button" className="lightbox-close" onClick={onClose} title={t("pres.fechar")}>✕</button>
      {ids.length > 1 && <div className="lightbox-counter">{index + 1} / {ids.length}</div>}
      {ids.length > 1 && (
        <button
          type="button"
          className="lightbox-nav prev"
          onClick={(e) => { e.stopPropagation(); setIndex((i) => (i - 1 + ids.length) % ids.length); }}
        >
          ‹
        </button>
      )}
      <div className="lightbox-stage" onClick={(e) => e.stopPropagation()}>
        <img src={`/api/drive/file/${id}?v=${id}`} alt="" style={{ transform: `scale(${zoom})` }} />
      </div>
      {ids.length > 1 && (
        <button
          type="button"
          className="lightbox-nav next"
          onClick={(e) => { e.stopPropagation(); setIndex((i) => (i + 1) % ids.length); }}
        >
          ›
        </button>
      )}
      <div className="lightbox-zoom" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}>−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}>+</button>
      </div>
    </div>
  );
}

function DropZone({ fotoId, ajuste, uploading, onFile, onDelete, onAdjustSave, onExpand, label }) {
  const inputRef = useRef(null);
  const { t } = useLanguage();
  const [ajustando, setAjustando] = useState(false);
  const [preview, setPreview] = useState(null); // valor temporario enquanto arrasta os sliders

  if (fotoId) {
    const base = ajuste || { zoom: 100, x: 50, y: 50 };
    const a = ajustando && preview ? preview : base;

    return (
      <div className="drop drop-photo">
        <div
          className="drop-photo-img"
          style={{
            backgroundImage: `url(/api/drive/file/${fotoId}?v=${fotoId})`,
            backgroundSize: `${a.zoom}%`,
            backgroundPosition: `${a.x}% ${a.y}%`,
          }}
          onClick={() => !ajustando && inputRef.current?.click()}
        />
        {!ajustando && (
          <>
            <button
              type="button"
              className="drop-photo-expand"
              title={t("pres.verGrande")}
              onClick={(e) => {
                e.stopPropagation();
                onExpand && onExpand();
              }}
            >
              ⛶
            </button>
            <button
              type="button"
              className="drop-photo-adjust"
              title={t("pres.ajustarFoto")}
              onClick={(e) => {
                e.stopPropagation();
                setPreview(base);
                setAjustando(true);
              }}
            >
              ⤢
            </button>
            <button
              type="button"
              className="drop-photo-remove"
              title={t("pres.excluirFoto")}
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(t("pres.confirmarExclusao"))) onDelete && onDelete();
              }}
            >
              ✕
            </button>
          </>
        )}
        {ajustando && (
          <div className="adjust-panel" onClick={(e) => e.stopPropagation()}>
            <div className="adjust-row">
              <label>{t("pres.zoom")}</label>
              <input type="range" min="100" max="250" value={a.zoom} onChange={(e) => setPreview({ ...a, zoom: Number(e.target.value) })} />
            </div>
            <div className="adjust-row">
              <label>{t("pres.horizontal")}</label>
              <input type="range" min="0" max="100" value={a.x} onChange={(e) => setPreview({ ...a, x: Number(e.target.value) })} />
            </div>
            <div className="adjust-row">
              <label>{t("pres.vertical")}</label>
              <input type="range" min="0" max="100" value={a.y} onChange={(e) => setPreview({ ...a, y: Number(e.target.value) })} />
            </div>
            <div className="adjust-actions">
              <button type="button" className="adjust-btn ghost" onClick={() => { setAjustando(false); setPreview(null); }}>
                {t("pres.cancelar")}
              </button>
              <button
                type="button"
                className="adjust-btn primary"
                onClick={() => {
                  setAjustando(false);
                  onAdjustSave && onAdjustSave(a);
                }}
              >
                {t("pres.salvarAjuste")}
              </button>
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
        />
      </div>
    );
  }

  return (
    <div
      className="drop"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
      />
      {uploading ? (
        <span>{t("pres.enviando")}</span>
      ) : (
        <>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <span>{t("pres.enviarFoto")}</span>
        </>
      )}
    </div>
  );
}

function ExtraThumbs({ ids, slot, no, total, onFile, onDelete, onExpand }) {
  const inputRef = useRef(null);
  const { t } = useLanguage();
  const podeAdicionar = total < 6;

  return (
    <div className="ba-thumbs">
      {ids.map((id) => (
        <div className="ba-thumb" key={id}>
          <img src={`/api/drive/file/${id}?v=${id}`} alt="" onClick={() => onExpand && onExpand(id)} />
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(no, slot, id); }}>✕</button>
        </div>
      ))}
      {podeAdicionar && (
        <button type="button" className="ba-thumb-add" title={t("pres.adicionarFoto")} onClick={() => inputRef.current?.click()}>+</button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => e.target.files[0] && onFile(no, slot, e.target.files[0])}
      />
    </div>
  );
}

export default function Slide({ acao, onUploadFoto, onDeleteFoto, onAdjustFoto, onEditCaption, uploadingSlot }) {
  const [lightbox, setLightbox] = useState(null); // { ids, index }

  if (!acao) return null;

  const beforeIds = [acao.fotoBeforeId, ...(acao.fotosBeforeExtra || [])].filter(Boolean);
  const afterIds = [acao.fotoImprovementId, ...(acao.fotosImprovementExtra || [])].filter(Boolean);

  return (
    <>
    <div className="slide">
      <div className="slide-head">
        <div className="slide-badge">{acao.no}</div>
        <div className="slide-head-txt">
          <h2>{acao.item}</h2>
          <p>
            {acao.dept}
            {acao.auditor ? ` · Auditor: ${acao.auditor}` : ""}
          </p>
        </div>
        <div className={"slide-status-pill " + acao.status}>
          {acao.status === "closed" ? "CLOSED" : "OPEN"}
        </div>
        {acao.isNew && <div className="new-badge">NEW</div>}
      </div>

      <div className="slide-meta">
        <div className="m">
          <label>PERSON IN CHARGE</label>
          <div>
            {acao.person || "—"} {acao.dept ? `(${acao.dept})` : ""}
          </div>
        </div>
        <div className="m">
          <label>OCCUR. DATE</label>
          <div>{acao.occur || "—"}</div>
        </div>
        <div className="m">
          <label>DEADLINE</label>
          <div>{acao.deadline || "—"}</div>
        </div>
        <div className="m">
          <label>INVESTMENT</label>
          <div>{acao.investment || "—"}</div>
        </div>
      </div>

      <div className="slide-body">
        <div className="desc-row">
          <div className="desc-col wide">
            <label>DESCRIPTION</label>
            <div className="desc-box">{acao.description || "—"}</div>
          </div>
          <div className="desc-col">
            <label>EXPECTATION</label>
            <div className="desc-box">{acao.expectation || "—"}</div>
          </div>
          <div className="desc-col">
            <label>ABRANGENCY</label>
            <div className="desc-box">{acao.abrangency || "—"}</div>
          </div>
        </div>

        <div className="plan-label">ACTION PLAN</div>
        <table className="plan-table">
          <tbody>
            <tr>
              <th style={{ width: 24 }}>#</th>
              <th>Action</th>
              <th style={{ width: 80 }}>Owner</th>
              <th style={{ width: 56 }}>Due</th>
              <th style={{ width: 60 }}>Status</th>
            </tr>
            {(acao.steps || []).map((st, i) => (
              <tr key={i}>
                <td>{st[0]}</td>
                <td>{st[1]}</td>
                <td>{st[2]}</td>
                <td>{st[3]}</td>
                <td className="chip">{st[4]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ba-band">
          <span>BEFORE</span>
          <span>AFTER</span>
        </div>
        <div className="ba-photos">
          <div className="ba-col">
            <DropZone
              fotoId={acao.fotoBeforeId}
              ajuste={acao.fotoBeforeAjuste}
              uploading={uploadingSlot === "before"}
              onFile={(file) => onUploadFoto && onUploadFoto(acao.no, "before", file)}
              onDelete={() => onDeleteFoto && onDeleteFoto(acao.no, "before", acao.fotoBeforeId)}
              onAdjustSave={(val) => onAdjustFoto && onAdjustFoto(acao.no, "before", val)}
              onExpand={() => beforeIds.length && setLightbox({ ids: beforeIds, index: 0 })}
              label="Before"
            />
            <ExtraThumbs
              ids={acao.fotosBeforeExtra || []}
              slot="before"
              no={acao.no}
              total={(acao.fotoBeforeId ? 1 : 0) + (acao.fotosBeforeExtra?.length || 0)}
              onFile={onUploadFoto}
              onDelete={onDeleteFoto}
              onExpand={(id) => setLightbox({ ids: beforeIds, index: Math.max(0, beforeIds.indexOf(id)) })}
            />
            <div className="ba-caption">
              <b>FACTORY COMMENT</b>
              <span
                className="ba-caption-editable"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => onEditCaption && onEditCaption(acao.no, "factory", e.currentTarget.textContent)}
              >
                {acao.factory || "—"}
              </span>
            </div>
          </div>
          <div className="ba-col">
            <DropZone
              fotoId={acao.fotoImprovementId}
              ajuste={acao.fotoImprovementAjuste}
              uploading={uploadingSlot === "improvement"}
              onFile={(file) => onUploadFoto && onUploadFoto(acao.no, "improvement", file)}
              onDelete={() => onDeleteFoto && onDeleteFoto(acao.no, "improvement", acao.fotoImprovementId)}
              onAdjustSave={(val) => onAdjustFoto && onAdjustFoto(acao.no, "improvement", val)}
              onExpand={() => afterIds.length && setLightbox({ ids: afterIds, index: 0 })}
              label="After"
            />
            <ExtraThumbs
              ids={acao.fotosImprovementExtra || []}
              slot="improvement"
              no={acao.no}
              total={(acao.fotoImprovementId ? 1 : 0) + (acao.fotosImprovementExtra?.length || 0)}
              onFile={onUploadFoto}
              onDelete={onDeleteFoto}
              onExpand={(id) => setLightbox({ ids: afterIds, index: Math.max(0, afterIds.indexOf(id)) })}
            />
            <div className="ba-caption">
              <b>HISENSE COMMENT</b>
              <span
                className="ba-caption-editable"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => onEditCaption && onEditCaption(acao.no, "hisense", e.currentTarget.textContent)}
              >
                {acao.hisense || "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    {lightbox && (
      <PhotoLightbox ids={lightbox.ids} startIndex={lightbox.index} onClose={() => setLightbox(null)} />
    )}
    </>
  );
}
