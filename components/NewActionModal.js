"use client";

import { useState } from "react";
import { useLanguage } from "../lib/i18n";

export default function NewActionModal({ onClose, onCreated }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    item: "", dept: "", person: "", occur: "", deadline: "", investmentFlag: "no",
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  function campo(k) {
    return { value: form[k], onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })) };
  }

  async function salvar() {
    setErro("");
    if (!form.item.trim()) {
      setErro(t("db.novaAcaoItemObrigatorio"));
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/acoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status: "Open" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      onCreated && onCreated(data.no);
      onClose();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="editor-overlay" onClick={onClose}>
      <div className="editor-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="editor-head">
          <div>
            <div className="editor-no">{t("db.novaAcao").toUpperCase()}</div>
            <h4>{t("db.novaAcaoSub")}</h4>
          </div>
          <button type="button" className="editor-close" onClick={onClose}>✕</button>
        </div>

        <div className="editor-body">
          <div className="editor-field">
            <label>Item *</label>
            <input {...campo("item")} placeholder={t("db.novaAcaoItemPlaceholder")} autoFocus />
          </div>
          <div className="editor-row2">
            <div className="editor-field">
              <label>Dept. in charge</label>
              <input {...campo("dept")} />
            </div>
            <div className="editor-field">
              <label>Person in charge</label>
              <input {...campo("person")} />
            </div>
          </div>
          <div className="editor-row2">
            <div className="editor-field">
              <label>Occur. date</label>
              <input {...campo("occur")} placeholder="DD/MM/AAAA" />
            </div>
            <div className="editor-field">
              <label>Deadline</label>
              <input {...campo("deadline")} placeholder="DD/MM/AAAA" />
            </div>
          </div>
          <div className="editor-field">
            <label>Investment</label>
            <select value={form.investmentFlag} onChange={(e) => setForm((f) => ({ ...f, investmentFlag: e.target.value }))}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>

          {erro && <p style={{ color: "var(--red)", fontSize: 12.5 }}>{erro}</p>}

          <button type="button" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} onClick={salvar} disabled={salvando}>
            {salvando ? t("common.saving") : t("db.novaAcaoCriar")}
          </button>
          <p className="editor-note">{t("db.novaAcaoNota")}</p>
        </div>
      </div>
    </div>
  );
}
