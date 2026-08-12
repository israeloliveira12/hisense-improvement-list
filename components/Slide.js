"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../lib/i18n";

// `tipos` = mesmo mapa que vem de acao.fotosBeforeMeta/fotosImprovementMeta
// ({ [fileId]: { tipo, nome } }) -- so entra quem NAO e foto (esparso).
function PhotoLightbox({ ids, rotacoes, tipos, startIndex, onClose }) {
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
  const isVideo = tipos?.[id]?.tipo === "video";

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
        {isVideo ? (
          <video src={`/api/drive/file/${id}?v=${id}`} controls autoPlay />
        ) : (
          <img
            src={`/api/drive/file/${id}?v=${id}`}
            alt=""
            style={{ transform: `rotate(${rotacoes?.[id] || 0}deg) scale(${zoom})` }}
          />
        )}
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
      {!isVideo && (
        <div className="lightbox-zoom" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}>−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}>+</button>
        </div>
      )}
    </div>
  );
}

const MAX_FOTOS_POR_LADO = 8;

// BRL continua em pt-BR em qualquer idioma -- e a moeda do valor, nao um
// rotulo de interface.
function formatBRL(v) {
  return "R$ " + (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Aceita foto, video e um punhado de formatos de documento comuns no
// mesmo campo de upload -- o Drive/o proxy que ja serve o conteudo
// (/api/drive/file/[id]) sao agnosticos de tipo, entao nao precisa de
// pipeline novo nenhum pra guardar/servir, so pra EXIBIR direito.
const ACCEPT_ANEXO = "image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt";

function detectarTipoArquivo(file) {
  if (file.type.startsWith("image/")) return "foto";
  if (file.type.startsWith("video/")) return "video";
  return "doc";
}

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
        accept={ACCEPT_ANEXO}
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

// Uma foto/video (principal grande ou miniatura), com os controles de
// mover (troca de posicao com a vizinha -- promove miniatura a principal
// quando move o suficiente pra esquerda, e vice-versa), excluir e ver em
// tela grande. `podeMoverEsq`/`podeMoverDir` desabilitam nas pontas da
// lista. Video nao mostra imagem nenhuma (nao da pra gerar thumbnail sem
// processar o arquivo no servidor) -- so um retangulo escuro com um
// triangulo de play; o video de verdade so toca ao clicar (lightbox).
function FotoItem({ id, tipo, grande, rotacao, podeMoverEsq, podeMoverDir, onMover, onDelete, onExpand, onRotate }) {
  const { t } = useLanguage();
  const isVideo = tipo === "video";
  return (
    <div className={grande ? "drop drop-photo" : "ba-thumb"}>
      {isVideo ? (
        <div className={(grande ? "drop-photo-img" : "ba-thumb-img") + " ba-video-tile"} onClick={onExpand}>
          <span className="ba-video-play">▶</span>
        </div>
      ) : (
        <div
          className={grande ? "drop-photo-img" : "ba-thumb-img"}
          style={{ backgroundImage: `url(/api/drive/file/${id}?v=${id})`, transform: rotacao ? `rotate(${rotacao}deg)` : undefined }}
          onClick={onExpand}
        />
      )}
      <div className="foto-controls">
        {podeMoverEsq && (
          <button type="button" title={t("pres.moverEsquerda")} onClick={(e) => { e.stopPropagation(); onMover(-1); }}>
            ‹
          </button>
        )}
        {grande && !isVideo && (
          <button type="button" title={t("pres.rotacionarFoto")} onClick={(e) => { e.stopPropagation(); onRotate(); }}>
            ⟳
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

// Chip pequeno pra documento anexado -- bem menor que os tiles de
// foto/video de proposito (pedido explicito do usuario: um documento nao
// tem conteudo visual pra mostrar em miniatura, entao nao faz sentido
// ocupar o mesmo espaco). Clique abre/baixa o arquivo original via o
// mesmo proxy que ja serve fotos.
function DocChip({ id, nome, onDelete }) {
  const { t } = useLanguage();
  return (
    <div className="doc-chip">
      <a
        className="doc-chip-link"
        href={`/api/drive/file/${id}`}
        target="_blank"
        rel="noopener noreferrer"
        title={nome || t("pres.documento")}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="doc-chip-nome">{nome || t("pres.documento")}</span>
      </a>
      <button
        type="button"
        className="doc-chip-remove"
        title={t("pres.excluirFoto")}
        onClick={() => { if (window.confirm(t("pres.confirmarExclusao"))) onDelete(); }}
      >
        ✕
      </button>
    </div>
  );
}

// Grupo completo de anexos de um lado (Before OU After): ate 2 fotos/videos
// "principais" lado a lado (grandes, sem cortar -- os 2 primeiros da
// lista, contando so foto+video), o resto de foto/video em miniatura
// embaixo, e documentos numa fileira propria e pequena por baixo de tudo
// (nunca entram na ordem de principal/miniatura -- nao tem conteudo
// visual pra mostrar em destaque). Mover uma foto reescreve so a ordem
// das midias visuais; documentos ficam sempre no fim da lista guardada
// (posicao deles no array nao importa, ja que sempre renderizam na
// propria fileira separada).
function PhotoGroup({ ids, rotacoes, meta, slot, no, uploading, onFile, onDelete, onExpand, onReorder, onRotate }) {
  const { t } = useLanguage();
  const lista = ids || [];
  const tipoDe = (id) => meta?.[id]?.tipo || "foto";
  const midia = lista.filter((id) => tipoDe(id) !== "doc");
  const documentos = lista.filter((id) => tipoDe(id) === "doc");
  const principais = midia.slice(0, 2);
  const extras = midia.slice(2);
  const podeAdicionar = lista.length < MAX_FOTOS_POR_LADO;

  function mover(index, delta) {
    const alvo = index + delta;
    if (alvo < 0 || alvo >= midia.length) return;
    const novaMidia = [...midia];
    [novaMidia[index], novaMidia[alvo]] = [novaMidia[alvo], novaMidia[index]];
    onReorder(no, slot, [...novaMidia, ...documentos]);
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
            tipo={tipoDe(id)}
            grande
            rotacao={rotacoes?.[id]}
            podeMoverEsq={i > 0}
            podeMoverDir={i < midia.length - 1}
            onMover={(delta) => mover(i, delta)}
            onDelete={() => onDelete(no, slot, id)}
            onExpand={() => onExpand(id)}
            onRotate={() => onRotate(no, slot, id)}
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
                tipo={tipoDe(id)}
                rotacao={rotacoes?.[id]}
                podeMoverEsq
                podeMoverDir={i < midia.length - 1}
                onMover={(delta) => mover(i, delta)}
                onDelete={() => onDelete(no, slot, id)}
                onExpand={() => onExpand(id)}
                onRotate={() => onRotate(no, slot, id)}
              />
            );
          })}
          {podeAdicionar && (
            <UploadTile className="ba-thumb-add" uploading={false} onFile={(file) => onFile(no, slot, file)} />
          )}
        </div>
      )}
      {documentos.length > 0 && (
        <div className="doc-chip-row">
          {documentos.map((id) => (
            <DocChip key={id} id={id} nome={meta?.[id]?.nome} onDelete={() => onDelete(no, slot, id)} />
          ))}
        </div>
      )}
    </>
  );
}

export default function Slide({ acao, onUploadFoto, onDeleteFoto, onReorderFoto, onRotateFoto, onEditCaption, uploadingSlot, onLightboxOpenChange }) {
  const { t, tv, formatDate } = useLanguage();
  const [lightbox, setLightbox] = useState(null); // { ids, rotacoes, tipos, index }

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
        {acao.spmLink ? (
          <a
            className="slide-badge"
            href={acao.spmLink}
            target="_blank"
            rel="noopener noreferrer"
            title={t("edit.fieldSpmLink")}
            style={{ fontSize: String(acao.no).length > 9 ? 8 : String(acao.no).length > 6 ? 10 : 12.5 }}
          >
            {acao.no}
          </a>
        ) : (
          <div className="slide-badge" style={{ fontSize: String(acao.no).length > 9 ? 8 : String(acao.no).length > 6 ? 10 : 12.5 }}>
            {acao.no}
          </div>
        )}
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
          <div>
            {acao.investmentInfo ? formatBRL(acao.investmentInfo.total) : t("common.semInvestimento")}
          </div>
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
            {(acao.steps || []).map((st, i) => {
              const stStatus = String(st[4] || "").toUpperCase();
              const stClass = stStatus === "CLOSED" ? "is-closed" : stStatus === "ON HOLD" ? "is-on-hold" : "is-open";
              return (
              <tr key={i}>
                <td>{st[0]}</td>
                <td>{st[1]}</td>
                <td>{st[2]}</td>
                <td>{formatDate(st[3]) || st[3]}</td>
                <td className={"plan-status " + stClass}>{tv(st[4])}</td>
              </tr>
              );
            })}
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
              rotacoes={acao.fotosBeforeRotacao}
              meta={acao.fotosBeforeMeta}
              slot="before"
              no={acao.no}
              uploading={uploadingSlot === "before"}
              onFile={onUploadFoto}
              onDelete={onDeleteFoto}
              onExpand={(id) => setLightbox({ ids: beforeIds, rotacoes: acao.fotosBeforeRotacao, tipos: acao.fotosBeforeMeta, index: Math.max(0, beforeIds.indexOf(id)) })}
              onReorder={onReorderFoto}
              onRotate={onRotateFoto}
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
              rotacoes={acao.fotosImprovementRotacao}
              meta={acao.fotosImprovementMeta}
              slot="improvement"
              no={acao.no}
              uploading={uploadingSlot === "improvement"}
              onFile={onUploadFoto}
              onDelete={onDeleteFoto}
              onExpand={(id) => setLightbox({ ids: afterIds, rotacoes: acao.fotosImprovementRotacao, tipos: acao.fotosImprovementMeta, index: Math.max(0, afterIds.indexOf(id)) })}
              onReorder={onReorderFoto}
              onRotate={onRotateFoto}
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
      <PhotoLightbox ids={lightbox.ids} rotacoes={lightbox.rotacoes} tipos={lightbox.tipos} startIndex={lightbox.index} onClose={() => setLightbox(null)} />
    )}
    </>
  );
}

export { detectarTipoArquivo };
