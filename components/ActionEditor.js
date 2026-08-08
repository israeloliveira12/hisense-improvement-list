"use client";

import { useRef, useState } from "react";
import { useLanguage } from "../lib/i18n";

// Status geral da acao: so Open/Closed (sem On Hold -- pedido explicito,
// "on hold" so faz sentido no nivel de passo do plano de acao).
const STATUS_OPTIONS = ["Open", "Closed"];
const APPROVAL_OPTIONS = ["", "Approved", "Declined"];
const STAGE_OPTIONS = ["", "Preparing", "In Transit", "Delivered"];
const STAGE_LABEL_KEYS = { Preparing: "dash.etapaPreparing", "In Transit": "dash.etapaInTransit", Delivered: "dash.etapaDelivered" };
const PASSO_STATUS_OPTIONS = ["Open", "Closed", "On Hold"];
const MAX_PASSOS = 10;

function SaveDot({ status }) {
  if (!status) return null;
  return <span className={"save-dot " + status} />;
}

// `steps` (formato de exibicao, array de arrays -- o que Slide.js/PPT
// consomem) precisa ser recalculado toda vez que `stepsEditable` (formato
// de edicao, usado so aqui no editor) muda, e mandado pro componente pai
// via onFieldChanged -- senao o slide por tras do editor e o PPT baixado
// ficam com os passos desatualizados (bug: editar/adicionar passo "nao
// salva" -- salvava no servidor, so o preview local que nao via a mudanca).
function stepsParaArray(stepsEditable) {
  return (stepsEditable || []).map((p) => [
    String(p.ordem ?? ""),
    p.acao || "",
    p.responsavel || "",
    p.prazo || "",
    String(p.status || "Open").toUpperCase(),
  ]);
}

// Mesma logica de investimentoDisplay() do servidor (lib/googleSheets.js),
// reaproveitada aqui pro resumo (acao.investment) tambem ficar em dia
// depois de editar um item pelo editor, sem precisar recarregar a pagina.
function investimentoDisplayClient(itens) {
  if (!itens || !itens.length) return null;
  const total = itens.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitCost) || 0), 0);
  const situacao = { Approved: "Approved", Declined: "Declined" }[itens[0].requestApproval] || "Pending";
  const totalBRL = "R$ " + (total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${totalBRL} · ${situacao}`;
}

export default function ActionEditor({ acao, onClose, onFieldChanged, onSaved, onDeleted }) {
  const { t, dateInputLang } = useLanguage();
  const [tab, setTab] = useState("geral");
  const [status, setStatus] = useState({}); // { [key]: "saving"|"saved"|"error" }
  const [local, setLocal] = useState(acao);
  const [excluindo, setExcluindo] = useState(false);
  const [novoInv, setNovoInv] = useState(null); // null = form fechado; objeto = form aberto com os valores digitados
  const [salvando, setSalvando] = useState(null); // texto do passo atual do salvamento, ou null
  // NADA sai do editor (nem PATCH pro servidor, nem propagacao pro
  // componente pai/apresentacao) antes de "Salvar e fechar" -- pedido
  // explicito do usuario, em duas rodadas: primeiro so os campos de texto,
  // depois tambem adicionar/remover passo e item de investimento (que antes
  // ficavam IMEDIATOS, e por isso um passo novo ja aparecia na apresentacao
  // por tras do editor antes de salvar).
  const idOriginalRef = useRef(acao.no); // congela o ID de quando o editor abriu -- PATCHes usam sempre este, nunca local.no (que pode ter sido editado nessa mesma sessao, mas so vira de verdade no servidor na hora do flush)
  const pendentesRef = useRef({}); // { statusKey: {url, body} } -- edicoes de campo simples (acao/detalhe/passo existente/investimento existente)
  const parentUpdatesRef = useRef({}); // { field: value } -- o que propagar pro componente pai no flush
  const passosRemovidosRef = useRef(new Set()); // rows (reais, >0) de passos marcados pra excluir no flush
  const passosSujoRef = useRef(false); // true = precisa recalcular "steps" (formato de exibicao) no flush
  const investimentoSujoRef = useRef(false); // true = precisa recalcular "investment" (resumo) no flush
  const tempIdRef = useRef(0); // gera IDs temporarios negativos pra passo/item ainda nao criado no servidor

  if (!local) return null;

  async function excluirAcao() {
    if (!window.confirm(t("pres.confirmarExcluirAcao", { no: local.no, item: local.item || "" }))) return;
    setExcluindo(true);
    try {
      // usa o ID original (do servidor), nao local.no -- se o usuario tiver
      // editado o ID nessa mesma sessao sem salvar ainda, a linha no Sheets
      // ainda esta sob o ID antigo.
      const res = await fetch(`/api/acoes/${encodeURIComponent(idOriginalRef.current)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      onDeleted && onDeleted(idOriginalRef.current);
    } catch (e) {
      alert(`${t("common.error")}: ${e.message}`);
      setExcluindo(false);
    }
  }

  // So agenda o PATCH (guarda no ref) -- nao manda pro servidor ainda.
  // "pending" e um status novo do SaveDot (bolinha cinza: "mudou, ainda nao
  // salvou"), diferente de "saving"/"saved" que so aparecem durante o
  // flush de verdade (ver salvarPendentes).
  function agendar(url, statusKey, body) {
    pendentesRef.current[statusKey] = { url, body };
    setStatus((s) => ({ ...s, [statusKey]: "pending" }));
  }

  // So marca o que precisa propagar pro componente pai quando flushar --
  // NUNCA chama onFieldChanged na hora (isso e exatamente o que fazia um
  // passo novo, ou qualquer campo editado, ja aparecer na apresentacao por
  // tras do editor antes de "Salvar e fechar").
  function marcarParaPai(field, value) {
    parentUpdatesRef.current[field] = value;
  }

  // Manda tudo que ficou pendente pro servidor, na ordem certa, e só DEPOIS
  // propaga pro componente pai -- chamado só ao fechar o editor (X, clicar
  // fora, ou "Salvar e fechar"), nunca por um onBlur/clique individual.
  // Devolve false se algo falhou, pra quem chamou decidir NAO fechar (evita
  // perder a edicao silenciosamente).
  async function salvarPendentes() {
    // FASE 0 -- troca de ID PRIMEIRO, nao por ultimo.
    // Antes o rename era a ultima etapa e todo o resto usava o ID antigo;
    // bastava a planilha ja ter sido tocada por outro caminho pra alguma
    // chamada cair em "ação não encontrada" no meio do lote. Renomeando
    // antes de tudo, existe UM unico ID valido dali pra frente (o novo) e
    // todas as etapas seguintes usam ele. renameAcaoId (servidor) leva
    // junto PPT_Detalhes (fotos, comentarios) e PPT_Passos, entao nada
    // "descola" da acao.
    const renomeio = pendentesRef.current["acao.no"];
    delete pendentesRef.current["acao.no"];
    const noOriginal = idOriginalRef.current;
    if (renomeio) {
      setSalvando(t("edit.salvandoId"));
      try {
        const res = await fetch(renomeio.url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(renomeio.body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        // ja vale a partir daqui -- se uma etapa seguinte falhar e o
        // usuario tentar salvar de novo, nao tenta renomear duas vezes
        idOriginalRef.current = data.no || renomeio.body.value;
        setStatus((s) => ({ ...s, "acao.no": "saved" }));
      } catch (e) {
        setStatus((s) => ({ ...s, "acao.no": "error" }));
        alert(`${t("common.error")}: ${e.message}`);
        return false;
      }
    }

    const no = idOriginalRef.current;

    // FASE 1 -- passos marcados pra excluir (ja existiam no servidor).
    setSalvando(t("common.saving"));
    for (const row of passosRemovidosRef.current) {
      try {
        const res = await fetch(`/api/passos/${row}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      } catch (e) {
        alert(`${t("common.error")}: ${e.message}`);
        return false;
      }
    }
    passosRemovidosRef.current = new Set();

    // FASE 2 -- passos novos (row temporario < 0): cria no servidor e troca
    // o row temporario pelo real. Atualiza o local JA AQUI (mesmo que uma
    // criacao seguinte falhe) pra uma nova tentativa de salvar nao recriar
    // o que ja foi criado com sucesso.
    let stepsAtual = local.stepsEditable || [];
    const novosPassos = stepsAtual.filter((p) => p.row < 0);
    if (novosPassos.length) {
      const mapa = {};
      let erro = null;
      for (const p of novosPassos) {
        try {
          const res = await fetch("/api/passos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ no, ordem: p.ordem, acao: p.acao, responsavel: p.responsavel, prazo: p.prazo, status: p.status || "Open" }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
          mapa[p.row] = data.row;
        } catch (e) {
          erro = e.message;
          break;
        }
      }
      stepsAtual = stepsAtual.map((p) => (mapa[p.row] ? { ...p, row: mapa[p.row] } : p));
      if (Object.keys(mapa).length) setLocal((prev) => ({ ...prev, stepsEditable: stepsAtual }));
      if (erro) {
        alert(`${t("common.error")}: ${erro}`);
        return false;
      }
    }

    // FASE 3 -- item de investimento novo (no maximo 1, mesmo limite de
    // addInvestimentoItem no servidor).
    let itensAtual = local.itensInvestimento || [];
    let investimentoCriado = false;
    const novosItens = itensAtual.filter((it) => it.row < 0);
    if (novosItens.length) {
      for (const it of novosItens) {
        try {
          const res = await fetch("/api/investimento", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ no, item: it.item, quantity: it.quantity, unitCost: it.unitCost, supplier: it.supplier }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
          itensAtual = itensAtual.map((x) => (x.row === it.row ? { ...x, row: data.row } : x));
          investimentoCriado = true;
        } catch (e) {
          setLocal((prev) => ({ ...prev, itensInvestimento: itensAtual }));
          alert(`${t("common.error")}: ${e.message}`);
          return false;
        }
      }
      setLocal((prev) => ({ ...prev, itensInvestimento: itensAtual }));
    }

    // FASE 4 -- edicoes de campo simples (acao/detalhe/passo/investimento JA
    // existentes). O ID ja foi resolvido la na FASE 0, entao aqui basta
    // reapontar as URLs que tinham sido agendadas com o ID antigo.
    const entradas = Object.entries(pendentesRef.current).map(([k, v]) => [
      k,
      renomeio ? { ...v, url: v.url.replace(encodeURIComponent(noOriginal), encodeURIComponent(no)) } : v,
    ]);
    pendentesRef.current = {};

    if (entradas.length) {
      setStatus((s) => {
        const next = { ...s };
        entradas.forEach(([k]) => (next[k] = "saving"));
        return next;
      });
      const resultados = await Promise.all(
        entradas.map(async ([statusKey, { url, body }]) => {
          try {
            const res = await fetch(url, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            return { statusKey, ok: true };
          } catch (e) {
            return { statusKey, ok: false, error: e.message };
          }
        })
      );
      setStatus((s) => {
        const next = { ...s };
        resultados.forEach(({ statusKey, ok }) => { next[statusKey] = ok ? "saved" : "error"; });
        return next;
      });
      const erros = resultados.filter((r) => !r.ok);
      if (erros.length) {
        alert(`${t("common.error")}: ${erros.map((e) => e.error).join("; ")}`);
        return false;
      }
      setTimeout(() => {
        setStatus((s) => {
          const next = { ...s };
          resultados.forEach(({ statusKey }) => { if (next[statusKey] === "saved") next[statusKey] = undefined; });
          return next;
        });
      }, 1500);
    }

    // FASE 5 -- CONFIRMACAO: le a acao de volta da planilha e usa ESSE
    // resultado como verdade, em vez de remendar o estado da tela campo a
    // campo torcendo pra ter dado certo. E isso que garante que reabrir o
    // editor logo depois mostre o texto novo, e nao o antigo: tela, slide e
    // PPT passam todos a refletir o que de fato ficou gravado.
    setSalvando(t("edit.confirmandoSalvamento"));
    let fresca = null;
    try {
      const res = await fetch(`/api/acoes/${encodeURIComponent(no)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      fresca = data.acao;
    } catch (e) {
      // O gravar em si ja deu certo -- so a releitura falhou (rede caindo,
      // etc). Nao trava o usuario: cai pro remendo campo a campo e segue.
      console.error("Releitura de confirmacao falhou", e);
    }

    // FASE 6 -- SO AGORA propaga pro componente pai (Apresentacao/Banco de
    // Dados). Nada disso aparecia la antes de chegar aqui.
    if (fresca) {
      setLocal(fresca);
      onSaved && onSaved(noOriginal, fresca);
    } else {
      if (renomeio) onFieldChanged && onFieldChanged(noOriginal, "no", no);
      Object.entries(parentUpdatesRef.current).forEach(([field, value]) => {
        onFieldChanged && onFieldChanged(no, field, value);
      });
      if (passosSujoRef.current) onFieldChanged && onFieldChanged(no, "steps", stepsParaArray(stepsAtual));
      if (investimentoSujoRef.current || investimentoCriado) {
        onFieldChanged && onFieldChanged(no, "investment", investimentoDisplayClient(itensAtual) || "Sem investimento");
      }
      if (investimentoCriado) onFieldChanged && onFieldChanged(no, "investmentFlag", "yes");
    }
    parentUpdatesRef.current = {};
    passosSujoRef.current = false;
    investimentoSujoRef.current = false;
    return true;
  }

  // Fecha o editor SEMPRE passando por aqui (X, clicar fora, "Salvar e
  // fechar") -- garante que nenhum caminho de fechar descarta uma edicao
  // pendente. Da blur no campo focado primeiro (garante que o ultimo valor
  // digitado, ainda nao "commitado" via onBlur, entra na fila) e so fecha
  // de verdade se o flush inteiro deu certo.
  // Tem edicao de rascunho ainda nao enviada? (campo alterado, passo
  // adicionado/removido, item de investimento em digitacao...)
  function temPendencias() {
    return (
      Object.keys(pendentesRef.current).length > 0 ||
      passosRemovidosRef.current.size > 0 ||
      passosSujoRef.current ||
      investimentoSujoRef.current ||
      Boolean(novoInv && Object.values(novoInv).some((v) => String(v || "").trim()))
    );
  }

  // X = CANCELAR. Descarta o rascunho e fecha sem gravar nada -- so o
  // "Salvar e fechar" grava. Como nada sai do editor antes do flush (ver
  // salvarPendentes), cancelar e literalmente jogar fora as pendencias:
  // a planilha nunca chegou a ser tocada.
  async function cancelarEFechar() {
    if (salvando) return;
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
    // deixa o onBlur do campo focado rodar antes de medir o que ha pendente
    await new Promise((r) => setTimeout(r, 0));
    if (temPendencias() && !window.confirm(t("edit.confirmarDescartar"))) return;
    pendentesRef.current = {};
    parentUpdatesRef.current = {};
    passosRemovidosRef.current = new Set();
    passosSujoRef.current = false;
    investimentoSujoRef.current = false;
    onClose();
  }

  async function salvarEFechar() {
    if (salvando) return; // ja esta salvando -- clique duplo nao dispara um 2o lote
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
    // deixa o onBlur acima rodar (ele agenda o campo que estava focado)
    // antes de ler a fila de pendencias
    await new Promise((r) => setTimeout(r, 0));
    setSalvando(t("common.saving"));
    try {
      const ok = await salvarPendentes();
      if (ok) onClose();
    } finally {
      setSalvando(null);
    }
  }

  function salvarAcao(field, value) {
    setLocal((prev) => ({ ...prev, [field]: value }));
    marcarParaPai(field, value);
    agendar(`/api/acoes/${encodeURIComponent(idOriginalRef.current)}`, "acao." + field, { field, value });
  }

  function salvarStatus(value) {
    const novoStatus = value === "Closed" ? "closed" : "open";
    setLocal((prev) => ({ ...prev, statusRaw: value, status: novoStatus }));
    marcarParaPai("status", novoStatus);
    agendar(`/api/acoes/${encodeURIComponent(idOriginalRef.current)}`, "acao.status", { field: "status", value });
  }

  function salvarDetalhe(field, value) {
    setLocal((prev) => ({ ...prev, [field]: value }));
    marcarParaPai(field, value);
    agendar(`/api/detalhes/${encodeURIComponent(idOriginalRef.current)}`, "det." + field, { field, value });
  }

  function salvarInvestimento(row, field, value) {
    const novosItens = local.itensInvestimento.map((it) => (it.row === row ? { ...it, [field]: value } : it));
    setLocal((prev) => ({ ...prev, itensInvestimento: novosItens }));
    investimentoSujoRef.current = true;
    if (row > 0) agendar(`/api/investimento/${row}`, "inv." + row + "." + field, { field, value });
  }

  function salvarPasso(row, field, value) {
    const novosSteps = local.stepsEditable.map((p) => (p.row === row ? { ...p, [field]: value } : p));
    setLocal((prev) => ({ ...prev, stepsEditable: novosSteps }));
    passosSujoRef.current = true;
    if (row > 0) agendar(`/api/passos/${row}`, "passo." + row + "." + field, { field, value });
  }

  // Adiciona so localmente -- nada e criado no servidor ate o flush.
  function adicionarPasso() {
    if ((local.stepsEditable?.length || 0) >= MAX_PASSOS) return;
    const ordem = (local.stepsEditable?.length || 0) + 1;
    const tempRow = --tempIdRef.current;
    const novosSteps = [...(local.stepsEditable || []), { row: tempRow, ordem, acao: "", responsavel: "", prazo: "", status: "Open" }];
    setLocal((prev) => ({ ...prev, stepsEditable: novosSteps }));
    passosSujoRef.current = true;
  }

  function removerPasso(row) {
    if (!window.confirm(t("pres.excluirPasso") + "?")) return;
    const novosSteps = local.stepsEditable.filter((p) => p.row !== row);
    setLocal((prev) => ({ ...prev, stepsEditable: novosSteps }));
    passosSujoRef.current = true;
    if (row > 0) {
      // ja existe no servidor -- so exclui de verdade no flush.
      passosRemovidosRef.current.add(row);
    }
    // descarta qualquer edicao de campo ja agendada pra esse passo (seja
    // ele novo ou existente) -- nao faz sentido salvar campo de um passo
    // que nao vai mais existir.
    Object.keys(pendentesRef.current).forEach((k) => {
      if (k.startsWith("passo." + row + ".")) delete pendentesRef.current[k];
    });
  }

  // Adiciona so localmente -- funciona pro PRIMEIRO item de investimento da
  // acao (escreve na propria linha-ancora, que fica livre nesse caso, no
  // flush) -- ver o aviso em addInvestimentoItem (lib/googleSheets.js)
  // sobre o limite de 1.
  function adicionarInvestimento() {
    if (!novoInv?.item?.trim()) return;
    const tempRow = --tempIdRef.current;
    const novoItem = {
      row: tempRow,
      item: novoInv.item,
      quantity: novoInv.quantity || "",
      unitCost: novoInv.unitCost || "",
      supplier: novoInv.supplier || "",
      requestApproval: "",
      stage: "",
      status: "",
      remark: "",
    };
    const novosItens = [...(local.itensInvestimento || []), novoItem];
    setLocal((prev) => ({ ...prev, itensInvestimento: novosItens }));
    investimentoSujoRef.current = true;
    setNovoInv(null);
  }

  return (
    // Clicar FORA do popup nao fecha nada, de proposito: ja aconteceu de um
    // clique fora sem querer fechar o editor no meio de uma edicao. So o X e
    // o "Salvar e fechar" fecham.
    <div className="editor-overlay">
      <div className="editor-drawer" onClick={(e) => e.stopPropagation()}>
        {salvando && (
          <div className="editor-salvando" role="status" aria-live="polite">
            <span className="editor-salvando-spinner" />
            {salvando}
          </div>
        )}
        <div className="editor-head">
          <div>
            <div className="editor-no">{t("edit.acaoNo")} {local.no}</div>
            <h4>{local.item}</h4>
          </div>
          <button type="button" className="editor-close" title={t("pres.cancelar")} onClick={cancelarEFechar} disabled={Boolean(salvando)}>✕</button>
        </div>

        <div className="editor-status-row">
          <span className={"slide-status-pill " + local.status}>{local.status === "closed" ? t("db.closed") : t("db.open")}</span>
          <select
            value={STATUS_OPTIONS.includes(local.statusRaw) ? local.statusRaw : "Open"}
            onChange={(e) => salvarStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <SaveDot status={status["acao.status"]} />
        </div>

        <div className="editor-tabs">
          <button className={tab === "geral" ? "active" : ""} onClick={() => setTab("geral")}>{t("edit.tabGeral")}</button>
          <button className={tab === "descricao" ? "active" : ""} onClick={() => setTab("descricao")}>{t("edit.tabDescricao")}</button>
          <button className={tab === "plano" ? "active" : ""} onClick={() => setTab("plano")}>
            {t("edit.tabPlano")} {local.stepsEditable?.length ? `(${local.stepsEditable.length})` : ""}
          </button>
          <button className={tab === "investimento" ? "active" : ""} onClick={() => setTab("investimento")}>
            {t("edit.tabInvestimento")} {local.itensInvestimento?.length ? `(${local.itensInvestimento.length})` : ""}
          </button>
        </div>

        <div className="editor-body">
          {tab === "geral" && (
            <>
              <div className="editor-field">
                <label>{t("edit.fieldId")} <SaveDot status={status["acao.no"]} /></label>
                <input
                  defaultValue={local.no}
                  onBlur={(e) => {
                    const novo = e.target.value.trim();
                    if (!novo || novo === local.no) {
                      e.target.value = local.no;
                      return;
                    }
                    if (window.confirm(t("edit.confirmChangeId", { atual: local.no, novo }))) {
                      salvarAcao("no", novo);
                    } else {
                      e.target.value = local.no;
                    }
                  }}
                />
              </div>
              <div className="editor-field">
                <label>{t("edit.fieldItem")} <SaveDot status={status["acao.item"]} /></label>
                <input defaultValue={local.item} onBlur={(e) => salvarAcao("item", e.target.value)} />
              </div>
              <div className="editor-row2">
                <div className="editor-field">
                  <label>{t("edit.fieldDept")} <SaveDot status={status["acao.dept"]} /></label>
                  <input defaultValue={local.dept} onBlur={(e) => salvarAcao("dept", e.target.value)} />
                </div>
                <div className="editor-field">
                  <label>{t("edit.fieldPerson")} <SaveDot status={status["acao.person"]} /></label>
                  <input defaultValue={local.person} onBlur={(e) => salvarAcao("person", e.target.value)} />
                </div>
              </div>
              <div className="editor-row2">
                <div className="editor-field">
                  <label>{t("edit.fieldAudit")} <SaveDot status={status["acao.audit"]} /></label>
                  <input defaultValue={local.audit} onBlur={(e) => salvarAcao("audit", e.target.value)} />
                </div>
                <div className="editor-field">
                  <label>{t("edit.fieldProcess")} <SaveDot status={status["acao.process"]} /></label>
                  <input defaultValue={local.process} onBlur={(e) => salvarAcao("process", e.target.value)} />
                </div>
              </div>
              {/* O campo "Target" saiu daqui: era o unico so-leitura no meio
                  de campos editaveis e ja e calculado sozinho (ver
                  computeTarget no servidor) -- quem precisa dele ve no
                  Dashboard. Os campos foram reagrupados em pares. */}
              <div className="editor-row2">
                <div className="editor-field">
                  <label>{t("edit.fieldOccur")} <SaveDot status={status["acao.occur"]} /></label>
                  <input type="date" lang={dateInputLang} defaultValue={local.occur} onChange={(e) => salvarAcao("occur", e.target.value)} />
                </div>
                <div className="editor-field">
                  <label>{t("edit.fieldDeadlineOriginal")} <SaveDot status={status["acao.deadlineOriginal"]} /></label>
                  <input type="date" lang={dateInputLang} defaultValue={local.deadlineOriginal} onChange={(e) => salvarAcao("deadlineOriginal", e.target.value)} />
                </div>
              </div>
              <div className="editor-row2">
                <div className="editor-field">
                  <label>{t("edit.fieldNewDeadline")} <SaveDot status={status["acao.deadline"]} /></label>
                  <input type="date" lang={dateInputLang} defaultValue={local.deadline} onChange={(e) => salvarAcao("deadline", e.target.value)} />
                </div>
                <div className="editor-field">
                  <label>{t("edit.fieldDelayReason")} <SaveDot status={status["acao.delayReason"]} /></label>
                  <input defaultValue={local.delayReason} onBlur={(e) => salvarAcao("delayReason", e.target.value)} />
                </div>
              </div>
            </>
          )}

          {tab === "descricao" && (
            <>
              <div className="editor-field">
                <label>{t("edit.fieldDescription")} <SaveDot status={status["det.description"]} /></label>
                <textarea defaultValue={local.description} onBlur={(e) => salvarDetalhe("description", e.target.value)} />
              </div>
              <div className="editor-field">
                <label>{t("edit.fieldExpectation")} <SaveDot status={status["det.expectation"]} /></label>
                <textarea defaultValue={local.expectation} onBlur={(e) => salvarDetalhe("expectation", e.target.value)} />
              </div>
              <div className="editor-field">
                <label>{t("edit.fieldAbrangency")} <SaveDot status={status["det.abrangency"]} /></label>
                <textarea defaultValue={local.abrangency} onBlur={(e) => salvarDetalhe("abrangency", e.target.value)} />
              </div>
              <div className="editor-field">
                <label>{t("edit.fieldFactoryComment")} <SaveDot status={status["det.factory"]} /></label>
                <textarea defaultValue={local.factory} onBlur={(e) => salvarDetalhe("factory", e.target.value)} />
              </div>
              <div className="editor-field">
                <label>{t("edit.fieldHisenseComment")} <SaveDot status={status["det.hisense"]} /></label>
                <textarea defaultValue={local.hisense} onBlur={(e) => salvarDetalhe("hisense", e.target.value)} />
              </div>
            </>
          )}

          {tab === "plano" && (
            <>
              {(!local.stepsEditable || local.stepsEditable.length === 0) && (
                <p className="editor-empty">{t("edit.semPassos")}</p>
              )}
              {local.stepsEditable && local.stepsEditable.length > 0 && (
                <table className="editor-inv-table editor-plano-table">
                  <thead>
                    <tr><th style={{ width: 28 }}>#</th><th>{t("edit.colAcao")}</th><th style={{ width: 130 }}>{t("edit.colResponsavel")}</th><th style={{ width: 80 }}>{t("edit.colPrazo")}</th><th style={{ width: 90 }}>{t("edit.colStatus")}</th><th></th></tr>
                  </thead>
                  <tbody>
                    {local.stepsEditable.map((p) => (
                      <tr key={p.row}>
                        <td><input defaultValue={p.ordem} style={{ width: 24 }} onBlur={(e) => salvarPasso(p.row, "ordem", e.target.value)} /></td>
                        <td><textarea rows={2} defaultValue={p.acao} onBlur={(e) => salvarPasso(p.row, "acao", e.target.value)} /></td>
                        <td><input defaultValue={p.responsavel} onBlur={(e) => salvarPasso(p.row, "responsavel", e.target.value)} /></td>
                        <td><input type="date" lang={dateInputLang} defaultValue={p.prazo} onChange={(e) => salvarPasso(p.row, "prazo", e.target.value)} /></td>
                        <td>
                          <select
                            defaultValue={PASSO_STATUS_OPTIONS.includes(p.status) ? p.status : "Open"}
                            onChange={(e) => salvarPasso(p.row, "status", e.target.value)}
                            style={{ color: p.status === "Closed" ? "var(--green)" : p.status === "On Hold" ? "var(--red)" : "var(--amber)", fontWeight: 700 }}
                          >
                            {PASSO_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                        <td>
                          <button type="button" className="editor-remove-row" title={t("pres.excluirPasso")} onClick={() => removerPasso(p.row)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {(local.stepsEditable?.length || 0) < MAX_PASSOS ? (
                <div className="m-add-row-real" onClick={adicionarPasso}>
                  {t("pres.adicionarPasso")}
                </div>
              ) : (
                <p className="editor-note">{t("edit.limitePassos", { n: MAX_PASSOS })}</p>
              )}
            </>
          )}

          {tab === "investimento" && (
            <>
              {(!local.itensInvestimento || local.itensInvestimento.length === 0) && (
                <p className="editor-empty">{t("edit.semInvestimento")}</p>
              )}
              {local.itensInvestimento && local.itensInvestimento.length > 0 && (
                <table className="editor-inv-table">
                  <thead>
                    <tr><th>{t("edit.colItem")}</th><th>{t("edit.colQtd")}</th><th>{t("edit.colCustoUn")}</th><th>{t("edit.colFornecedor")}</th><th>{t("edit.colAprovacao")}</th><th>{t("edit.colEtapa")}</th></tr>
                  </thead>
                  <tbody>
                    {local.itensInvestimento.map((it) => (
                      <tr key={it.row}>
                        <td><input defaultValue={it.item} onBlur={(e) => salvarInvestimento(it.row, "item", e.target.value)} /></td>
                        <td><input defaultValue={it.quantity} style={{ width: 40 }} onBlur={(e) => salvarInvestimento(it.row, "quantity", e.target.value)} /></td>
                        <td><input defaultValue={it.unitCost} style={{ width: 70 }} onBlur={(e) => salvarInvestimento(it.row, "unitCost", e.target.value)} /></td>
                        <td><input defaultValue={it.supplier} onBlur={(e) => salvarInvestimento(it.row, "supplier", e.target.value)} /></td>
                        <td>
                          <select defaultValue={it.requestApproval} onChange={(e) => salvarInvestimento(it.row, "requestApproval", e.target.value)}>
                            {APPROVAL_OPTIONS.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
                          </select>
                        </td>
                        <td>
                          {it.requestApproval === "Approved" ? (
                            <select defaultValue={it.stage || ""} onChange={(e) => salvarInvestimento(it.row, "stage", e.target.value)}>
                              {STAGE_OPTIONS.map((o) => <option key={o} value={o}>{o ? t(STAGE_LABEL_KEYS[o]) : "—"}</option>)}
                              {it.stage && !STAGE_OPTIONS.includes(it.stage) && (
                                <option value={it.stage}>{it.stage} ({t("edit.etapaAntiga")})</option>
                              )}
                            </select>
                          ) : (
                            <span className="editor-etapa-disabled" title={t("edit.etapaRequerAprovacao")}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {local.itensInvestimento && local.itensInvestimento.length > 0 ? (
                <p className="editor-note">{t("edit.notaInvestimento")}</p>
              ) : novoInv ? (
                <div className="editor-add-inv-form">
                  <input
                    placeholder={t("edit.invItemPlaceholder")}
                    value={novoInv.item || ""}
                    onChange={(e) => setNovoInv((f) => ({ ...f, item: e.target.value }))}
                    autoFocus
                  />
                  <div className="editor-row2">
                    <input
                      placeholder={t("edit.colQtd")}
                      value={novoInv.quantity || ""}
                      onChange={(e) => setNovoInv((f) => ({ ...f, quantity: e.target.value }))}
                    />
                    <input
                      placeholder={t("edit.colCustoUn")}
                      value={novoInv.unitCost || ""}
                      onChange={(e) => setNovoInv((f) => ({ ...f, unitCost: e.target.value }))}
                    />
                  </div>
                  <input
                    placeholder={t("edit.colFornecedor")}
                    value={novoInv.supplier || ""}
                    onChange={(e) => setNovoInv((f) => ({ ...f, supplier: e.target.value }))}
                  />
                  <div className="editor-row2">
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ justifyContent: "center" }}
                      onClick={adicionarInvestimento}
                      disabled={!novoInv.item?.trim()}
                    >
                      {t("edit.invSalvar")}
                    </button>
                    <button type="button" className="btn btn-ghost" style={{ justifyContent: "center" }} onClick={() => setNovoInv(null)}>
                      {t("pres.cancelar")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="m-add-row-real" onClick={() => setNovoInv({})}>
                  {t("edit.addInvestimento")}
                </div>
              )}
            </>
          )}
        </div>

        <div className="editor-footer">
          <button type="button" className="btn btn-primary editor-save-btn" onClick={salvarEFechar} disabled={Boolean(salvando)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
            </svg>
            {salvando || t("pres.salvarEFechar")}
          </button>
        </div>

        <div className="editor-danger-zone">
          <button type="button" className="editor-delete-full" onClick={excluirAcao} disabled={excluindo}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z" />
            </svg>
            {t("pres.excluirAcao")}
          </button>
        </div>
      </div>
    </div>
  );
}
