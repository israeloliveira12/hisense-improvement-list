"use client";

import { useRef, useState } from "react";
import { useLanguage } from "../lib/i18n";

function DropZone({ fotoId, ajuste, uploading, onFile, onDelete, onAdjustSave, label }) {
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
              className="drop-photo-remove"
              title={t("pres.excluirFoto")}
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(t("pres.confirmarExclusao"))) onDelete && onDelete();
              }}
            >
              ✕
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

function ExtraThumbs({ ids, slot, no, total, onFile, onDelete }) {
  const inputRef = useRef(null);
  const { t } = useLanguage();
  const podeAdicionar = total < 6;

  return (
    <div className="ba-thumbs">
      {ids.map((id) => (
        <div className="ba-thumb" key={id}>
          <img src={`/api/drive/file/${id}?v=${id}`} alt="" />
          <button type="button" onClick={() => onDelete(no, slot, id)}>✕</button>
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
  if (!acao) return null;

  return (
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
              label="Before"
            />
            <ExtraThumbs
              ids={acao.fotosBeforeExtra || []}
              slot="before"
              no={acao.no}
              total={(acao.fotoBeforeId ? 1 : 0) + (acao.fotosBeforeExtra?.length || 0)}
              onFile={onUploadFoto}
              onDelete={onDeleteFoto}
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
              label="After"
            />
            <ExtraThumbs
              ids={acao.fotosImprovementExtra || []}
              slot="improvement"
              no={acao.no}
              total={(acao.fotoImprovementId ? 1 : 0) + (acao.fotosImprovementExtra?.length || 0)}
              onFile={onUploadFoto}
              onDelete={onDeleteFoto}
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
  );
}
