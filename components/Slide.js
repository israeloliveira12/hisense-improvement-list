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

const MAX_FOTOS_POR_LADO = 8;

function UploadTile({ className, uploading, label, onFile, dropavel }) {
  const inputRef = useRef(null);
  const { t } = useLanguage();

  return (
    <div
      className={className}
      onClick={() => inputRef.current?.click()}
      onDragOver={dropavel ? (e) => e.preventDefault() : undefined}
      onDrop={
        dropavel
          ? (e) => {
              e.preventDefault();
              if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
            }
          : undefined
      }
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
      ) : label ? (
        <>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <span>{t("pres.enviarFoto")}</span>
        </>
      ) : (
        "+"
      )}
    </div>
  );
}

// Uma foto (principal grande ou miniatura), com os controles de mover
// (troca de posicao com a vizinha -- promove miniatura a principal quando
// move o suficiente pra esquerda, e vice-versa), excluir e ver em tela
// grande. `podeMoverEsq`/`podeMoverDir` desabilitam nas pontas da lista.
function FotoItem({ id, grande, podeMoverEsq, podeMoverDir, onMover, onDelete, onExpand }) {
  const { t } = useLanguage();
  return (
    <div className={grande ? "drop drop-photo" : "ba-thumb"}>
      <div
        className={grande ? "drop-photo-img" : "ba-thumb-img"}
        style={{ backgroundImage: `url(/api/drive/file/${id}?v=${id})` }}
        onClick={onExpand}
      />
      <div className="foto-controls">
        {podeMoverEsq && (
          <button type="button" title={t("pres.moverEsquerda")} onClick={(e) => { e.stopPropagation(); onMover(-1); }}>
            ‹
          </button>
        )}
        <button
          type="button"
          className="foto-controls-remove"
          title={t("pres.excluirFoto")}
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(t("pres.confirmarExclusao"))) onDelete();
          }}
        >
          ✕
        </button>
        {podeMoverDir && (
          <button type="button" title={t("pres.moverDireita")} onClick={(e) => { e.stopPropagation(); onMover(1); }}>
            ›
          </button>
        )}
      </div>
      {grande && (
        <button type="button" className="drop-photo-expand" title={t("pres.verGrande")} onClick={(e) => { e.stopPropagation(); onExpand(); }}>
          ⛶
        </button>
      )}
    </div>
  );
}

// Grupo completo de fotos de um lado (Before OU After): ate 2 "principais"
// lado a lado (grandes, sem cortar -- os 2 primeiros IDs da lista), e o
// resto em miniatura embaixo. Mover uma foto reescreve a lista inteira na
// ordem nova -- e isso, sozinho, decide quem e principal e quem e miniatura.
function PhotoGroup({ ids, slot, no, uploading, onFile, onDelete, onExpand, onReorder }) {
  const { t } = useLanguage();
  const lista = ids || [];
  const principais = lista.slice(0, 2);
  const extras = lista.slice(2);
  const podeAdicionar = lista.length < MAX_FOTOS_POR_LADO;

  function mover(index, delta) {
    const alvo = index + delta;
    if (alvo < 0 || alvo >= lista.length) return;
    const nova = [...lista];
    [nova[index], nova[alvo]] = [nova[alvo], nova[index]];
    onReorder(no, slot, nova);
  }

  if (lista.length === 0) {
    return (
      <UploadTile
        className="drop"
        uploading={uploading}
        label
        dropavel
        onFile={(file) => onFile(no, slot, file)}
      />
    );
  }

  return (
    <>
      <div className="ba-primaries">
        {principais.map((id, i) => (
          <FotoItem
            key={id}
            id={id}
            grande
            podeMoverEsq={i > 0}
            podeMoverDir={i < lista.length - 1}
            onMover={(delta) => mover(i, delta)}
            onDelete={() => onDelete(no, slot, id)}
            onExpand={() => onExpand(id)}
          />
        ))}
      </div>
      {(extras.length > 0 || podeAdicionar) && (
        <div className="ba-thumbs">
          {extras.map((id, j) => {
            const i = j + principais.length;
            return (
              <FotoItem
                key={id}
                id={id}
                podeMoverEsq
                podeMoverDir={i < lista.length - 1}
                onMover={(delta) => mover(i, delta)}
                onDelete={() => onDelete(no, slot, id)}
                onExpand={() => onExpand(id)}
              />
            );
          })}
          {podeAdicionar && (
            <UploadTile className="ba-thumb-add" uploading={false} onFile={(file) => onFile(no, slot, file)} />
          )}
        </div>
      )}
    </>
  );
}

export default function Slide({ acao, onUploadFoto, onDeleteFoto, onReorderFoto, onEditCaption, uploadingSlot, onLightboxOpenChange }) {
  const { t, formatDate } = useLanguage();
  const [lightbox, setLightbox] = useState(null); // { ids, index }

  useEffect(() => {
    onLightboxOpenChange && onLightboxOpenChange(Boolean(lightbox));
  }, [lightbox, onLightboxOpenChange]);

  if (!acao) return null;

  const beforeIds = (acao.fotosBefore || []).filter(Boolean);
  const afterIds = (acao.fotosImprovement || []).filter(Boolean);

  return (
    <>
    <div className="slide">
      <div className="slide-head">
        <div className="slide-badge">{acao.no}</div>
        <div className="slide-head-txt">
          <h2>{acao.item}</h2>
          <p>{acao.process}</p>
        </div>
        <div className={"slide-status-pill " + acao.status}>
          {acao.status === "closed" ? t("db.closed") : t("db.open")}
        </div>
        {acao.isNew && <div className="new-badge">{t("pres.slideNew")}</div>}
      </div>

      <div className="slide-meta">
        <div className="m">
          <label>{t("pres.slidePersonInCharge")}</label>
          <div>
            {acao.person || "—"} {acao.dept ? `(${acao.dept})` : ""}
          </div>
        </div>
        <div className="m">
          <label>{t("pres.slideOccurDate")}</label>
          <div>{formatDate(acao.occur) || "—"}</div>
        </div>
        <div className="m">
          <label>{t("pres.slideDeadline")}</label>
          <div>{formatDate(acao.deadline) || "—"}</div>
        </div>
        <div className="m">
          <label>{t("pres.slideInvestment")}</label>
          <div>{acao.investment || "—"}</div>
        </div>
      </div>

      <div className="slide-body">
        <div className="desc-row">
          <div className="desc-col wide">
            <label>{t("pres.slideDescription")}</label>
            <div className="desc-box">{acao.description || "—"}</div>
          </div>
          <div className="desc-col">
            <label>{t("pres.slideExpectation")}</label>
            <div className="desc-box">{acao.expectation || "—"}</div>
          </div>
          <div className="desc-col">
            <label>{t("pres.slideAbrangency")}</label>
            <div className="desc-box">{acao.abrangency || "—"}</div>
          </div>
        </div>

        <div className="plan-label">{t("pres.slideActionPlan")}</div>
        <table className="plan-table">
          <tbody>
            <tr>
              <th style={{ width: 24 }}>#</th>
              <th>{t("pres.slideColAction")}</th>
              <th style={{ width: 80 }}>{t("pres.slideColOwner")}</th>
              <th style={{ width: 56 }}>{t("pres.slideColDate")}</th>
              <th style={{ width: 60 }}>{t("pres.slideColStatus")}</th>
            </tr>
            {(acao.steps || []).map((st, i) => (
              <tr key={i}>
                <td>{st[0]}</td>
                <td>{st[1]}</td>
                <td>{st[2]}</td>
                <td>{st[3]}</td>
                <td className={"plan-status " + (String(st[4]).toUpperCase() === "CLOSED" ? "is-closed" : "is-open")}>{st[4]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ba-band">
          <span>{t("pres.slideBefore")}</span>
          <span>{t("pres.slideAfter")}</span>
        </div>
        <div className="ba-photos">
          <div className="ba-col">
            <PhotoGroup
              ids={beforeIds}
              slot="before"
              no={acao.no}
              uploading={uploadingSlot === "before"}
              onFile={onUploadFoto}
              onDelete={onDeleteFoto}
              onExpand={(id) => setLightbox({ ids: beforeIds, index: Math.max(0, beforeIds.indexOf(id)) })}
              onReorder={onReorderFoto}
            />
            <div className="ba-caption">
              <b>{t("pres.slideFactoryComment")}</b>
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
            <PhotoGroup
              ids={afterIds}
              slot="improvement"
              no={acao.no}
              uploading={uploadingSlot === "improvement"}
              onFile={onUploadFoto}
              onDelete={onDeleteFoto}
              onExpand={(id) => setLightbox({ ids: afterIds, index: Math.max(0, afterIds.indexOf(id)) })}
              onReorder={onReorderFoto}
            />
            <div className="ba-caption">
              <b>{t("pres.slideHisenseComment")}</b>
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
