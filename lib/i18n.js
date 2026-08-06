"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const LANGUAGES = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
  { code: "zh", label: "中文" },
];

const DICT = {
  pt: {
    nav: { apresentacao: "Apresentação", banco: "Banco de Dados", dashboard: "Dashboard", tag: "Improvement List · Hisense" },
    common: { sair: "Sair", demo: "Dados de demonstração", live: "Conectado ao Google Sheets", saving: "Salvando…", saved: "Salvo", error: "Erro ao salvar" },
    config: { title: "Google Sheets ainda não conectado", desc: "Configure GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY e GOOGLE_SHEET_ID nas variáveis de ambiente da Vercel (ver README.md)." },
    theme: { light: "Tema claro", dark: "Tema escuro", system: "Seguir o sistema" },
    pres: {
      title: "Apresentação", sub: "{n} ações · (Hisense) Improvement List",
      baixarPpt: "Baixar PPT", apresentar: "Apresentar", buscar: "Buscar ação…",
      hint: "← → pra navegar · Esc pra sair · {i} / {n}",
      pptEmBreve: "A geração do arquivo .pptx ainda está na próxima etapa do projeto — o template do slide precisa ser reconstruído no novo layout antes disso ficar pronto.",
      enviarFoto: "Clique ou arraste pra enviar", enviando: "Enviando…",
    },
    db: {
      title: "Banco de Dados", sub: 'aba "Improvement List"',
      abrirSheets: "Abrir no Google Sheets", novaAcao: "+ Nova ação",
      buscar: "Buscar por nº, item ou responsável…",
      todas: "Todas", open: "Open", closed: "Closed", comInvestimento: "Com investimento",
      syncNote: "Editar aqui atualiza o Google Sheets instantaneamente",
      novaAcaoEmBreve: "Criar ação nova pelo site ainda não está pronto — por enquanto, adicione a linha direto na planilha.",
      col: { no: "No.", item: "Item", dept: "Dept. in charge", person: "Person in charge", status: "Status", deadline: "Deadline", investment: "Investment" },
      carregando: "Carregando dados da planilha…",
    },
    dash: {
      title: "Dashboard", sub: 'calculado ao vivo, direto do Google Sheets',
      atualizar: "Atualizar",
      total: "Total de ações", fechadas: "Fechadas", abertas: "Em aberto", atrasadas: "Atrasadas",
      anoBase: "Ano-base 2026", doTotal: "% do total", foraDoPrazo: "Fora do prazo hoje",
      statusAcoes: "Status das ações", openVsClosed: "Open vs. Closed",
      porDepto: "Ações por departamento", deptSub: "Dept. in charge",
      investimento: "Investimento — aprovado vs. recusado",
      itensSolicitados: "{n} itens · {valor} solicitados no total",
      aprovado: "Aprovado", recusado: "Recusado",
      footerNote: 'Calculado ao vivo a partir do Google Sheets a cada carregamento — nunca fica desatualizado esperando um "Atualizar tudo" manual.',
      carregando: "Calculando a partir da planilha…",
    },
  },
  en: {
    nav: { apresentacao: "Presentation", banco: "Database", dashboard: "Dashboard", tag: "Improvement List · Hisense" },
    common: { sair: "Log out", demo: "Demo data", live: "Connected to Google Sheets", saving: "Saving…", saved: "Saved", error: "Failed to save" },
    config: { title: "Google Sheets not connected yet", desc: "Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY and GOOGLE_SHEET_ID in the Vercel environment variables (see README.md)." },
    theme: { light: "Light theme", dark: "Dark theme", system: "Follow system" },
    pres: {
      title: "Presentation", sub: "{n} actions · (Hisense) Improvement List",
      baixarPpt: "Download PPT", apresentar: "Present", buscar: "Search action…",
      hint: "← → to navigate · Esc to exit · {i} / {n}",
      pptEmBreve: "Generating the .pptx file is still the next step of this project — the slide template needs to be rebuilt in the new layout before this is ready.",
      enviarFoto: "Click or drag to upload", enviando: "Uploading…",
    },
    db: {
      title: "Database", sub: '"Improvement List" tab',
      abrirSheets: "Open in Google Sheets", novaAcao: "+ New action",
      buscar: "Search by no., item or owner…",
      todas: "All", open: "Open", closed: "Closed", comInvestimento: "With investment",
      syncNote: "Editing here updates Google Sheets instantly",
      novaAcaoEmBreve: "Creating a new action from the site isn't ready yet — for now, add the row directly in the spreadsheet.",
      col: { no: "No.", item: "Item", dept: "Dept. in charge", person: "Person in charge", status: "Status", deadline: "Deadline", investment: "Investment" },
      carregando: "Loading data from the spreadsheet…",
    },
    dash: {
      title: "Dashboard", sub: "computed live, straight from Google Sheets",
      atualizar: "Refresh",
      total: "Total actions", fechadas: "Closed", abertas: "Open", atrasadas: "Delayed",
      anoBase: "Base year 2026", doTotal: "% of total", foraDoPrazo: "Past deadline today",
      statusAcoes: "Action status", openVsClosed: "Open vs. Closed",
      porDepto: "Actions by department", deptSub: "Dept. in charge",
      investimento: "Investment — approved vs. declined",
      itensSolicitados: "{n} items · {valor} requested in total",
      aprovado: "Approved", recusado: "Declined",
      footerNote: 'Computed live from Google Sheets on every load — never goes stale waiting on a manual "Refresh All".',
      carregando: "Computing from the spreadsheet…",
    },
  },
  zh: {
    nav: { apresentacao: "演示", banco: "数据库", dashboard: "仪表盘", tag: "Improvement List · 海信" },
    common: { sair: "退出登录", demo: "演示数据", live: "已连接 Google Sheets", saving: "保存中…", saved: "已保存", error: "保存失败" },
    config: { title: "尚未连接 Google Sheets", desc: "请在 Vercel 环境变量中设置 GOOGLE_SERVICE_ACCOUNT_EMAIL、GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY 和 GOOGLE_SHEET_ID（详见 README.md）。" },
    theme: { light: "浅色主题", dark: "深色主题", system: "跟随系统" },
    pres: {
      title: "演示", sub: "{n} 项行动 · (海信) 改善清单",
      baixarPpt: "下载 PPT", apresentar: "开始演示", buscar: "搜索行动…",
      hint: "← → 切换 · Esc 退出 · {i} / {n}",
      pptEmBreve: "生成 .pptx 文件是项目的下一步 — 需要先按新版布局重建幻灯片模板才能完成此功能。",
      enviarFoto: "点击或拖拽上传", enviando: "上传中…",
    },
    db: {
      title: "数据库", sub: '"Improvement List" 工作表',
      abrirSheets: "在 Google Sheets 中打开", novaAcao: "+ 新建行动",
      buscar: "按编号、项目或负责人搜索…",
      todas: "全部", open: "进行中", closed: "已完成", comInvestimento: "含投资",
      syncNote: "在此编辑会立即更新 Google Sheets",
      novaAcaoEmBreve: "尚不支持在网站上创建新行动 — 目前请直接在表格中添加。",
      col: { no: "编号", item: "项目", dept: "负责部门", person: "负责人", status: "状态", deadline: "截止日期", investment: "投资" },
      carregando: "正在从表格加载数据…",
    },
    dash: {
      title: "仪表盘", sub: "实时计算，直接来自 Google Sheets",
      atualizar: "刷新",
      total: "行动总数", fechadas: "已完成", abertas: "进行中", atrasadas: "已延期",
      anoBase: "基准年 2026", doTotal: "占总数", foraDoPrazo: "今日已超期",
      statusAcoes: "行动状态", openVsClosed: "进行中 vs. 已完成",
      porDepto: "按部门统计", deptSub: "负责部门",
      investimento: "投资 — 批准 vs. 拒绝",
      itensSolicitados: "{n} 项 · 共申请 {valor}",
      aprovado: "已批准", recusado: "已拒绝",
      footerNote: "每次加载都直接从 Google Sheets 实时计算 — 无需手动“全部刷新”，永不过时。",
      carregando: "正在从表格计算…",
    },
  },
};

function getByPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
}

const LanguageContext = createContext({ lang: "pt", setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("pt");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("hisense-lang") : null;
    if (saved && DICT[saved]) setLangState(saved);
  }, []);

  function setLang(next) {
    setLangState(next);
    try {
      localStorage.setItem("hisense-lang", next);
    } catch (e) {}
  }

  function t(key, vars) {
    const val = getByPath(DICT[lang], key) ?? getByPath(DICT.pt, key) ?? key;
    return typeof val === "string" ? interpolate(val, vars) : val;
  }

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
