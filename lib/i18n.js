"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const LANGUAGES = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
  { code: "zh", label: "中文" },
];

const DICT = {
  pt: {
    nav: { apresentacao: "Apresentação", banco: "Banco de Dados", dashboard: "Dashboard", tag: "Improvement List · Hisense", mostrarMenu: "Mostrar menu", ocultarMenu: "Ocultar menu" },
    common: { sair: "Sair", demo: "Dados de demonstração", live: "Conectado ao Google Sheets", saving: "Salvando…", saved: "Salvo", error: "Erro ao salvar",
      sim: "Sim", nao: "Não", semInvestimento: "Sem investimento",
      semDepartamento: "Sem departamento", semResponsavel: "Sem responsável", semAuditor: "Sem auditor" },
    config: { title: "Google Sheets ainda não conectado", desc: "Configure GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY e GOOGLE_SHEET_ID nas variáveis de ambiente da Vercel (ver README.md)." },
    theme: { light: "Tema claro", dark: "Tema escuro", system: "Seguir o sistema" },
    pres: {
      title: "Apresentação", sub: "{n} ações · (Hisense) Improvement List",
      baixar: "Baixar", baixarPpt: "Baixar PPT", baixarTudo: "Baixar tudo", apresentar: "Apresentar", buscar: "Buscar ação…",
      confirmarBaixarTudo: "Gerar a apresentação completa ({n} ações) pode levar um tempo. Continuar?",
      baixarFiltro: "Baixar com filtro ({n})",
      confirmarBaixarFiltrados: "Gerar a apresentação com as {n} ações do filtro atual pode levar um tempo. Continuar?",
      slidePersonInCharge: "LÍDER DA AÇÃO", slideOccurDate: "DATA DE OCORRÊNCIA", slideDeadline: "PRAZO",
      slideInvestment: "INVESTIMENTO", slideDescription: "DESCRIÇÃO", slideExpectation: "EXPECTATIVA",
      slideAbrangency: "ABRANGÊNCIA", slideActionPlan: "PLANO DE AÇÃO", slideColAction: "Ação",
      slideColOwner: "Responsável", slideColDate: "Data", slideColStatus: "Status",
      slideBefore: "ANTES", slideAfter: "DEPOIS",
      slideFactoryComment: "COMENTÁRIO DA FÁBRICA", slideHisenseComment: "COMENTÁRIO HISENSE",
      slideNew: "NOVO",
      gerandoDeck: "Gerando… {feito}/{total}",
      hint: "← → pra navegar · Esc pra sair · {i} / {n}",
      pptEmBreve: "A geração do arquivo .pptx ainda está na próxima etapa do projeto — o template do slide precisa ser reconstruído no novo layout antes disso ficar pronto.",
      enviarFoto: "Clique ou arraste pra enviar", enviando: "Enviando…",
      excluirFoto: "Excluir foto", confirmarExclusao: "Excluir esta foto? Isso remove do Drive e não pode ser desfeito.",
      editarAcao: "Editar ação",
      ajustarFoto: "Ajustar enquadramento", zoom: "Zoom", horizontal: "Horiz.", vertical: "Vert.",
      cancelar: "Cancelar", salvarAjuste: "Salvar",
      tamanhoTexto: "Tamanho do slide/texto", adicionarFoto: "+ Adicionar foto",
      excluirPasso: "Remover passo", adicionarPasso: "+ Adicionar passo (máx. 10)",
      verGrande: "Ver em tela grande", fechar: "Fechar",
      moverEsquerda: "Mover para a esquerda", moverDireita: "Mover para a direita",
      rotacionarFoto: "Girar 90°",
      salvarEFechar: "Salvar e fechar",
      excluirAcao: "Excluir ação",
      confirmarExcluirAcao: 'Excluir a ação {no} ("{item}") por completo? Isso remove ela, o plano de ação, comentários e fotos vinculadas da planilha. Não pode ser desfeito.',
      filtros: "Filtros", somenteOpen: "Somente ações abertas", somenteInvestimento: "Somente com investimento", departamento: "Departamento",
      todosDeptos: "Todos os departamentos", limparFiltros: "Limpar filtros",
    },
    pptDeck: {
      coverTag: "LISTA DE MELHORIAS · 2026", coverTitle: "Ações de Melhoria de Desempenho",
      coverSubtitle: "Após avaliações recentes, a Hisense compartilhou percepções valiosas para fortalecer o desempenho e a competitividade da unidade da Multi em Manaus.",
      dividerInvestment: "Plano de Ação (Com Investimento)", dividerNoInvestment: "Plano de Ação (Sem Investimento)",
      actionsSuffix: "ações", thankYou: "Obrigado!",
      overviewTitle: "Visão Geral das Melhorias", overviewSubtitle: "Resumo geral — {n} ações",
      overviewTotal: "Total de ações", overviewClosed: "Fechadas", overviewOpen: "Em aberto", overviewDelayed: "Atrasadas",
      overviewStatusTitle: "Status das ações", overviewDeptTitle: "Ações abertas por departamento",
      overviewInvestTitle: "Investimento", overviewNeedInvest: "Precisam de investimento",
    },
    excel: {
      nomeArquivo: "Lista_de_Melhorias_Auditoria",
      sheetAcoes: "Ações", sheetPassos: "Plano de Ação — Passo a Passo", sheetInvestimentos: "Investimentos",
      colNo: "Nº", colItem: "Item", colDescription: "Descrição", colProcess: "Processo", colDept: "Departamento",
      colLeader: "Líder da Ação", colAuditor: "Auditor", colStatus: "Status", colTarget: "Target",
      colOccur: "Data de Ocorrência", colDeadlineOriginal: "Prazo Original", colDeadlineNew: "Novo Prazo",
      colDelayReason: "Motivo do Atraso", colNeedsInvestment: "Precisa Investimento",
      colInvestmentTotal: "Valor Investido (R$)", colInvestmentStatus: "Situação do Investimento",
      colExpectation: "Expectativa", colAbrangency: "Abrangência",
      colFactoryComment: "Comentário da Fábrica", colHisenseComment: "Comentário Hisense",
      colTotalSteps: "Total de Passos", colClosedSteps: "Passos Fechados", colOpenSteps: "Passos em Aberto", colPctDone: "% Concluído",
      colStepNo: "Nº do Passo", colStepAction: "Ação do Passo", colStepOwner: "Responsável pelo Passo",
      colStepDeadline: "Prazo do Passo", colStepStatus: "Status do Passo", colLate: "Atrasado?", colParentStatus: "Status Geral da Ação",
      colInvestItem: "Item Investido", colType: "Tipo", colQuantity: "Quantidade", colUnitCost: "Custo Unitário (R$)",
      colTotalCost: "Custo Total (R$)", colSupplier: "Fornecedor", colApproval: "Aprovação", colStage: "Etapa", colRemark: "Observação",
    },
    edit: {
      acaoNo: "AÇÃO Nº",
      tabGeral: "Geral", tabDescricao: "Descrição", tabPlano: "Plano de Ação", tabInvestimento: "Investimento",
      fieldId: "ID (No.)", fieldItem: "Item", fieldDept: "Dept. in charge", fieldPerson: "Líder da Ação",
      fieldAudit: "Audit", fieldProcess: "Process", fieldOccur: "Occur. date",
      fieldDeadlineOriginal: "Deadline original", fieldNewDeadline: "New deadline", fieldDelayReason: "Delay reason",
      confirmChangeId: 'Alterar o ID de "{atual}" para "{novo}"? Fotos, plano de ação e comentários continuam vinculados a essa ação.',
      fieldDescription: "Description", fieldExpectation: "Expectation", fieldAbrangency: "Abrangency",
      fieldFactoryComment: "Factory Comment", fieldHisenseComment: "Hisense Comment",
      semPassos: "Nenhum passo cadastrado ainda.",
      colAcao: "Ação", colResponsavel: "Responsável", colPrazo: "Prazo", colStatus: "Status",
      limitePassos: "Limite de {n} passos atingido.",
      semInvestimento: "Nenhum item de investimento lançado pra essa ação ainda.",
      colItem: "Item", colQtd: "Qtd", colCustoUn: "Custo un. (R$)", colFornecedor: "Fornecedor",
      colAprovacao: "Aprovação", colEtapa: "Etapa",
      etapaRequerAprovacao: "Disponível depois que a aprovação virar \"Approved\"",
      etapaAntiga: "valor antigo",
      notaInvestimento: "Essa ação já tem item de investimento. Pra adicionar mais um, edite direto na planilha por enquanto — o site só cria o primeiro item.",
      salvandoId: "Trocando o ID…", confirmandoSalvamento: "Confirmando o salvamento…",
      confirmarDescartar: "Descartar as alterações que você fez e fechar sem salvar?",
      fieldItemRequired: "Item *", fieldDeadline: "Deadline",
      addInvestimento: "+ Adicionar item de investimento", addInvestimentoTitulo: "Novo item de investimento",
      invItemPlaceholder: "Nome do item a comprar", invSalvar: "Adicionar item",
    },
    db: {
      title: "Banco de Dados", sub: 'aba "Improvement List"',
      abrirSheets: "Abrir no Google Sheets", novaAcao: "+ Nova ação", baixarExcel: "Baixar Excel (auditoria)",
      buscar: "Buscar por nº, item ou responsável…",
      todas: "Todas", open: "Aberta", closed: "Fechada", onHold: "Em espera", comInvestimento: "Com investimento",
      syncNote: "Editar aqui atualiza o Google Sheets instantaneamente",
      novaAcaoEmBreve: "Criar ação nova pelo site ainda não está pronto — por enquanto, adicione a linha direto na planilha.",
      novaAcaoSub: "Preenche o essencial — o resto (auditor, descrição, plano de ação) você edita depois no painel de detalhes.",
      novaAcaoItemPlaceholder: "Título curto do achado/ação",
      novaAcaoItemObrigatorio: "Preencha o campo Item.",
      novaAcaoCriar: "Criar ação",
      novaAcaoNota: "O número oficial (auditoria Hisense) ainda não existe pra essa ação — um identificador temporário é usado até você atualizar depois.",
      col: { no: "No.", item: "Item", dept: "Dept. in charge", process: "Processo", person: "Líder da Ação", status: "Status", deadline: "Deadline", investment: "Investment" },
      carregando: "Carregando dados da planilha…",
    },
    dash: {
      title: "Dashboard", sub: 'calculado ao vivo, direto do Google Sheets',
      atualizar: "Atualizar",
      tabPrincipal: "Principal", tabInvestimentos: "Investimentos", tabForecast: "Forecast",
      tabAuditor: "Auditor", tabAging: "Aging", tabDepartamentos: "Departamentos",
      auditorTitulo: "Ações por auditor", auditorSub: "Quem abriu, e a taxa de fechamento de cada um",
      auditorTaxa: "Taxa de fechamento", auditorNota: "% ao lado de cada barra = ações fechadas ÷ total daquele auditor.",
      agingMedia: "Dias em aberto (média)", agingMediaSub: "das ações ainda não fechadas",
      agingTotal: "Ações em aberto", agingTotalSub: "com data de ocorrência definida",
      agingHistTitulo: "Distribuição de tempo em aberto", agingHistSub: "quantas ações em cada faixa de dias",
      agingTopTitulo: "Mais antigas em aberto", agingTopSub: "as que estão paradas há mais tempo",
      deptTaxaFechamento: "Taxa de fechamento",
      semAbertasPorDepto: "Nenhuma ação em aberto no momento.",
      deptResponsaveis: "Responsáveis pelas ações deste departamento",
      deptAcoesCount: "{n} ação(ões)",
      filtroStatus: "Status", filtroStatusTodas: "Todas",
      filtroInvestimento: "Investimento", filtroInvestTodos: "Todas", filtroInvestSim: "Só com investimento", filtroInvestNao: "Sem investimento",
      kanbanTitulo: "Acompanhamento por etapa", kanbanSub: "Itens de investimento aprovados, agrupados por onde estão no processo de compra",
      kanbanDecisaoTitulo: "Ainda sem decisão", kanbanPipelineTitulo: "Compra em andamento",
      etapaPreparing: "Em preparação", etapaInTransit: "Em trânsito", etapaDelivered: "Entregue",
      quanto: "Quanto", quando: "Quando", fornecedor: "Fornecedor", pendenteAprovacao: "Pendente",
      total: "Total de ações", fechadas: "Fechadas", abertas: "Em aberto", atrasadas: "Atrasadas",
      anoBase: "Ano-base 2026", doTotal: "% do total", foraDoPrazo: "Fora do prazo hoje",
      statusAcoes: "Status das ações", openVsClosed: "Open vs. Closed",
      porDepto: "Ações Abertas por Departamento", deptSub: "Dept. in charge",
      investimento: "Investimento — aprovado vs. recusado vs. pendente",
      itensSolicitados: "{n} itens · {valor} solicitados no total",
      aprovado: "Aprovado", recusado: "Recusado", pendente: "Pendente",
      footerNote: 'Calculado ao vivo a partir do Google Sheets a cada carregamento — nunca fica desatualizado esperando um "Atualizar tudo" manual.',
      carregando: "Calculando a partir da planilha…",
      facilFechar: "Facilidade de fechamento (Target)",
      facilFecharSub: "Target = ações sem necessidade de investimento, com investimento já aprovado, ou já fechadas",
      targetExplica: 'Uma ação vira "Target" quando fica mais fácil de fechar: ou não precisa de investimento, ou o investimento já foi aprovado, ou ela já está fechada.',
      podeFechar: "Dá pra fechar",
      potencialNota: "{n} ações abertas não dependem de nova aprovação de investimento. Fechá-las levaria a conclusão de {pctAtual}% para {pctPotencial}%.",
      resumoInvestimento: "Investimento — resumo",
      valorTotal: "Valor total solicitado", itens: "itens",
      precisaInvestimento: "Ações que precisam de investimento",
      deQuantasAcoes: "de {n} ações no total",
      precisamLabel: "Precisam", naoPrecisamLabel: "Não precisam",
      forecastAtrasadas: "Atrasadas", forecastAtrasadasSub: "prazo já passou, ainda abertas",
      forecastProximas: "A vencer", forecastProximasSub: "próximas semanas, ainda abertas",
      forecastTitulo: "Previsão de fechamento por semana",
      forecastSub: "Ações em aberto, agrupadas pela semana do prazo (New Deadline)",
      forecastVazio: "Nenhuma ação em aberto com prazo definido.",
      forecastMatrizTitulo: "Previsão por semana e departamento", forecastMatrizSub: "Mesma janela de 12 semanas, quebrada por departamento — vermelho = atrasado",
    },
  },
  en: {
    nav: { apresentacao: "Presentation", banco: "Database", dashboard: "Dashboard", tag: "Improvement List · Hisense", mostrarMenu: "Show menu", ocultarMenu: "Hide menu" },
    common: { sair: "Log out", demo: "Demo data", live: "Connected to Google Sheets", saving: "Saving…", saved: "Saved", error: "Failed to save",
      sim: "Yes", nao: "No", semInvestimento: "No investment",
      semDepartamento: "No department", semResponsavel: "No owner", semAuditor: "No auditor" },
    config: { title: "Google Sheets not connected yet", desc: "Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY and GOOGLE_SHEET_ID in the Vercel environment variables (see README.md)." },
    theme: { light: "Light theme", dark: "Dark theme", system: "Follow system" },
    pres: {
      title: "Presentation", sub: "{n} actions · (Hisense) Improvement List",
      baixar: "Download", baixarPpt: "Download PPT", baixarTudo: "Download all", apresentar: "Present", buscar: "Search action…",
      confirmarBaixarTudo: "Generating the full presentation ({n} actions) may take a while. Continue?",
      baixarFiltro: "Download filtered ({n})",
      confirmarBaixarFiltrados: "Generating the presentation with the {n} filtered actions may take a while. Continue?",
      slidePersonInCharge: "ACTION LEADER", slideOccurDate: "OCCUR. DATE", slideDeadline: "DEADLINE",
      slideInvestment: "INVESTMENT", slideDescription: "DESCRIPTION", slideExpectation: "EXPECTATION",
      slideAbrangency: "ABRANGENCY", slideActionPlan: "ACTION PLAN", slideColAction: "Action",
      slideColOwner: "Owner", slideColDate: "Date", slideColStatus: "Status",
      slideBefore: "BEFORE", slideAfter: "AFTER",
      slideFactoryComment: "FACTORY COMMENT", slideHisenseComment: "HISENSE COMMENT",
      slideNew: "NEW",
      gerandoDeck: "Generating… {feito}/{total}",
      hint: "← → to navigate · Esc to exit · {i} / {n}",
      pptEmBreve: "Generating the .pptx file is still the next step of this project — the slide template needs to be rebuilt in the new layout before this is ready.",
      enviarFoto: "Click or drag to upload", enviando: "Uploading…",
      excluirFoto: "Delete photo", confirmarExclusao: "Delete this photo? This removes it from Drive and can't be undone.",
      editarAcao: "Edit action",
      ajustarFoto: "Adjust framing", zoom: "Zoom", horizontal: "Horiz.", vertical: "Vert.",
      cancelar: "Cancel", salvarAjuste: "Save",
      tamanhoTexto: "Slide/text size", adicionarFoto: "+ Add photo",
      excluirPasso: "Remove step", adicionarPasso: "+ Add step (max. 10)",
      verGrande: "View full size", fechar: "Close",
      moverEsquerda: "Move left", moverDireita: "Move right",
      rotacionarFoto: "Rotate 90°",
      salvarEFechar: "Save and close",
      excluirAcao: "Delete action",
      confirmarExcluirAcao: 'Delete action {no} ("{item}") entirely? This removes it, its action plan, comments and linked photos from the spreadsheet. This cannot be undone.',
      filtros: "Filters", somenteOpen: "Open actions only", somenteInvestimento: "With investment only", departamento: "Department",
      todosDeptos: "All departments", limparFiltros: "Clear filters",
    },
    pptDeck: {
      coverTag: "IMPROVEMENT LIST · 2026", coverTitle: "Performance Improvement Actions",
      coverSubtitle: "Following recent assessments, Hisense shared valuable insights to strengthen the performance and competitiveness of Multi's Manaus facility.",
      dividerInvestment: "Action Plan (Investment)", dividerNoInvestment: "Action Plan (No Investment)",
      actionsSuffix: "actions", thankYou: "Thank You!",
      overviewTitle: "Improvement Overview", overviewSubtitle: "Overall summary — {n} actions",
      overviewTotal: "Total actions", overviewClosed: "Closed", overviewOpen: "Open", overviewDelayed: "Delayed",
      overviewStatusTitle: "Action status", overviewDeptTitle: "Open actions by department",
      overviewInvestTitle: "Investment", overviewNeedInvest: "Need investment",
    },
    excel: {
      nomeArquivo: "Improvement_List_Audit",
      sheetAcoes: "Actions", sheetPassos: "Action Plan — Step by Step", sheetInvestimentos: "Investments",
      colNo: "No.", colItem: "Item", colDescription: "Description", colProcess: "Process", colDept: "Department",
      colLeader: "Action Leader", colAuditor: "Auditor", colStatus: "Status", colTarget: "Target",
      colOccur: "Occurrence Date", colDeadlineOriginal: "Original Deadline", colDeadlineNew: "New Deadline",
      colDelayReason: "Delay Reason", colNeedsInvestment: "Needs Investment",
      colInvestmentTotal: "Invested Amount (R$)", colInvestmentStatus: "Investment Status",
      colExpectation: "Expectation", colAbrangency: "Abrangency",
      colFactoryComment: "Factory Comment", colHisenseComment: "Hisense Comment",
      colTotalSteps: "Total Steps", colClosedSteps: "Closed Steps", colOpenSteps: "Open Steps", colPctDone: "% Done",
      colStepNo: "Step No.", colStepAction: "Step Action", colStepOwner: "Step Owner",
      colStepDeadline: "Step Deadline", colStepStatus: "Step Status", colLate: "Late?", colParentStatus: "Overall Action Status",
      colInvestItem: "Investment Item", colType: "Type", colQuantity: "Quantity", colUnitCost: "Unit Cost (R$)",
      colTotalCost: "Total Cost (R$)", colSupplier: "Supplier", colApproval: "Approval", colStage: "Stage", colRemark: "Remark",
    },
    edit: {
      acaoNo: "ACTION No.",
      tabGeral: "General", tabDescricao: "Description", tabPlano: "Action Plan", tabInvestimento: "Investment",
      fieldId: "ID (No.)", fieldItem: "Item", fieldDept: "Dept. in charge", fieldPerson: "Action Leader",
      fieldAudit: "Audit", fieldProcess: "Process", fieldOccur: "Occur. date",
      fieldDeadlineOriginal: "Original deadline", fieldNewDeadline: "New deadline", fieldDelayReason: "Delay reason",
      confirmChangeId: 'Change the ID from "{atual}" to "{novo}"? Photos, action plan and comments stay linked to this action.',
      fieldDescription: "Description", fieldExpectation: "Expectation", fieldAbrangency: "Abrangency",
      fieldFactoryComment: "Factory Comment", fieldHisenseComment: "Hisense Comment",
      semPassos: "No steps added yet.",
      colAcao: "Action", colResponsavel: "Owner", colPrazo: "Date", colStatus: "Status",
      limitePassos: "Limit of {n} steps reached.",
      semInvestimento: "No investment item logged for this action yet.",
      colItem: "Item", colQtd: "Qty", colCustoUn: "Unit cost (R$)", colFornecedor: "Supplier",
      colAprovacao: "Approval", colEtapa: "Stage",
      etapaRequerAprovacao: 'Available once Approval is set to "Approved"',
      etapaAntiga: "legacy value",
      notaInvestimento: "This action already has an investment item. To add another one, edit directly in the spreadsheet for now — the site only creates the first item.",
      salvandoId: "Changing the ID…", confirmandoSalvamento: "Confirming the save…",
      confirmarDescartar: "Discard your changes and close without saving?",
      fieldItemRequired: "Item *", fieldDeadline: "Deadline",
      addInvestimento: "+ Add investment item", addInvestimentoTitulo: "New investment item",
      invItemPlaceholder: "Name of the item to buy", invSalvar: "Add item",
    },
    db: {
      title: "Database", sub: '"Improvement List" tab',
      abrirSheets: "Open in Google Sheets", novaAcao: "+ New action", baixarExcel: "Download Excel (audit)",
      buscar: "Search by no., item or owner…",
      todas: "All", open: "Open", closed: "Closed", onHold: "On hold", comInvestimento: "With investment",
      syncNote: "Editing here updates Google Sheets instantly",
      novaAcaoEmBreve: "Creating a new action from the site isn't ready yet — for now, add the row directly in the spreadsheet.",
      novaAcaoSub: "Fill in the essentials — the rest (auditor, description, action plan) you edit later in the details panel.",
      novaAcaoItemPlaceholder: "Short title of the finding/action",
      novaAcaoItemObrigatorio: "Fill in the Item field.",
      novaAcaoCriar: "Create action",
      novaAcaoNota: "The official number (Hisense audit) doesn't exist for this action yet — a temporary identifier is used until you update it later.",
      col: { no: "No.", item: "Item", dept: "Dept. in charge", process: "Process", person: "Action Leader", status: "Status", deadline: "Deadline", investment: "Investment" },
      carregando: "Loading data from the spreadsheet…",
    },
    dash: {
      title: "Dashboard", sub: "computed live, straight from Google Sheets",
      atualizar: "Refresh",
      tabPrincipal: "Main", tabInvestimentos: "Investment", tabForecast: "Forecast",
      tabAuditor: "Auditor", tabAging: "Aging", tabDepartamentos: "Departments",
      auditorTitulo: "Actions by auditor", auditorSub: "Who opened them, and each one's closing rate",
      auditorTaxa: "Closing rate", auditorNota: "% next to each bar = closed actions ÷ that auditor's total.",
      agingMedia: "Days open (average)", agingMediaSub: "of actions not yet closed",
      agingTotal: "Open actions", agingTotalSub: "with an occurrence date set",
      agingHistTitulo: "Time-open distribution", agingHistSub: "how many actions in each day range",
      agingTopTitulo: "Oldest still open", agingTopSub: "the ones stuck the longest",
      deptTaxaFechamento: "Closing rate",
      semAbertasPorDepto: "No open actions right now.",
      deptResponsaveis: "People responsible for this department's actions",
      deptAcoesCount: "{n} action(s)",
      filtroStatus: "Status", filtroStatusTodas: "All",
      filtroInvestimento: "Investment", filtroInvestTodos: "All", filtroInvestSim: "With investment only", filtroInvestNao: "Without investment",
      kanbanTitulo: "Stage tracking", kanbanSub: "Approved investment items, grouped by where they stand in the purchasing process",
      kanbanDecisaoTitulo: "Not yet decided", kanbanPipelineTitulo: "Purchase in progress",
      etapaPreparing: "Preparing", etapaInTransit: "In transit", etapaDelivered: "Delivered",
      quanto: "Amount", quando: "When", fornecedor: "Supplier", pendenteAprovacao: "Pending",
      total: "Total actions", fechadas: "Closed", abertas: "Open", atrasadas: "Delayed",
      anoBase: "Base year 2026", doTotal: "% of total", foraDoPrazo: "Past deadline today",
      statusAcoes: "Action status", openVsClosed: "Open vs. Closed",
      porDepto: "Open Actions by Department", deptSub: "Dept. in charge",
      investimento: "Investment — approved vs. declined vs. pending",
      itensSolicitados: "{n} items · {valor} requested in total",
      aprovado: "Approved", recusado: "Declined", pendente: "Pending",
      footerNote: 'Computed live from Google Sheets on every load — never goes stale waiting on a manual "Refresh All".',
      carregando: "Computing from the spreadsheet…",
      facilFechar: "Ease of closing (Target)",
      facilFecharSub: "Target = actions with no investment needed, already-approved investment, or already closed",
      targetExplica: 'An action becomes "Target" when it\'s easier to close: no investment needed, investment already approved, or already closed.',
      podeFechar: "Can be closed",
      potencialNota: "{n} open actions don't depend on new investment approval. Closing them would raise completion from {pctAtual}% to {pctPotencial}%.",
      resumoInvestimento: "Investment — summary",
      valorTotal: "Total amount requested", itens: "items",
      precisaInvestimento: "Actions that need investment",
      deQuantasAcoes: "out of {n} actions total",
      precisamLabel: "Need it", naoPrecisamLabel: "Don't need it",
      forecastAtrasadas: "Overdue", forecastAtrasadasSub: "past deadline, still open",
      forecastProximas: "Upcoming", forecastProximasSub: "next weeks, still open",
      forecastTitulo: "Closing forecast by week",
      forecastSub: "Open actions, grouped by deadline week (New Deadline)",
      forecastVazio: "No open actions with a deadline set.",
      forecastMatrizTitulo: "Forecast by week and department", forecastMatrizSub: "Same 12-week window, broken down by department — red = overdue",
    },
  },
  zh: {
    nav: { apresentacao: "演示", banco: "数据库", dashboard: "仪表盘", tag: "Improvement List · 海信", mostrarMenu: "显示菜单", ocultarMenu: "隐藏菜单" },
    common: { sair: "退出登录", demo: "演示数据", live: "已连接 Google Sheets", saving: "保存中…", saved: "已保存", error: "保存失败",
      sim: "是", nao: "否", semInvestimento: "无投资",
      semDepartamento: "无部门", semResponsavel: "无负责人", semAuditor: "无审核员" },
    config: { title: "尚未连接 Google Sheets", desc: "请在 Vercel 环境变量中设置 GOOGLE_SERVICE_ACCOUNT_EMAIL、GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY 和 GOOGLE_SHEET_ID（详见 README.md）。" },
    theme: { light: "浅色主题", dark: "深色主题", system: "跟随系统" },
    pres: {
      title: "演示", sub: "{n} 项行动 · (海信) 改善清单",
      baixar: "下载", baixarPpt: "下载 PPT", baixarTudo: "下载全部", apresentar: "开始演示", buscar: "搜索行动…",
      confirmarBaixarTudo: "生成完整演示文稿（{n} 项行动）可能需要一些时间。是否继续？",
      baixarFiltro: "下载筛选结果（{n}）",
      confirmarBaixarFiltrados: "生成当前筛选的 {n} 项行动的演示文稿可能需要一些时间。是否继续？",
      slidePersonInCharge: "行动负责人", slideOccurDate: "发生日期", slideDeadline: "截止日期",
      slideInvestment: "投资", slideDescription: "描述", slideExpectation: "预期",
      slideAbrangency: "覆盖范围", slideActionPlan: "行动计划", slideColAction: "行动",
      slideColOwner: "执行人", slideColDate: "日期", slideColStatus: "状态",
      slideBefore: "之前", slideAfter: "之后",
      slideFactoryComment: "工厂评论", slideHisenseComment: "海信评论",
      slideNew: "新增",
      gerandoDeck: "生成中… {feito}/{total}",
      hint: "← → 切换 · Esc 退出 · {i} / {n}",
      pptEmBreve: "生成 .pptx 文件是项目的下一步 — 需要先按新版布局重建幻灯片模板才能完成此功能。",
      enviarFoto: "点击或拖拽上传", enviando: "上传中…",
      excluirFoto: "删除照片", confirmarExclusao: "删除这张照片？将从 Drive 中移除，且无法撤销。",
      editarAcao: "编辑行动",
      ajustarFoto: "调整取景", zoom: "缩放", horizontal: "水平", vertical: "垂直",
      cancelar: "取消", salvarAjuste: "保存",
      tamanhoTexto: "幻灯片/文字大小", adicionarFoto: "+ 添加照片",
      excluirPasso: "移除步骤", adicionarPasso: "+ 添加步骤（最多10个）",
      verGrande: "查看大图", fechar: "关闭",
      moverEsquerda: "左移", moverDireita: "右移",
      rotacionarFoto: "旋转 90°",
      excluirAcao: "删除行动",
      confirmarExcluirAcao: '彻底删除行动 {no}（"{item}"）？这将从表格中移除该行动、行动计划、评论和相关照片。此操作无法撤销。',
      filtros: "筛选", somenteOpen: "仅显示进行中的行动", somenteInvestimento: "仅含投资", departamento: "部门",
      todosDeptos: "所有部门", limparFiltros: "清除筛选",
    },
    pptDeck: {
      coverTag: "改善清单 · 2026年", coverTitle: "绩效改善行动",
      coverSubtitle: "根据近期的评估结果，海信分享了宝贵的意见，以加强多利（Multi）玛瑙斯工厂的绩效和竞争力。",
      dividerInvestment: "行动计划（需要投资）", dividerNoInvestment: "行动计划（无需投资）",
      actionsSuffix: "项行动", thankYou: "谢谢！",
      overviewTitle: "改善总览", overviewSubtitle: "总体概览 — 共 {n} 项行动",
      overviewTotal: "行动总数", overviewClosed: "已完成", overviewOpen: "进行中", overviewDelayed: "已延期",
      overviewStatusTitle: "行动状态", overviewDeptTitle: "各部门进行中行动",
      overviewInvestTitle: "投资", overviewNeedInvest: "需要投资",
    },
    excel: {
      nomeArquivo: "改善清单_审计",
      sheetAcoes: "行动清单", sheetPassos: "行动计划——逐步执行", sheetInvestimentos: "投资",
      colNo: "编号", colItem: "项目", colDescription: "描述", colProcess: "工序", colDept: "部门",
      colLeader: "行动负责人", colAuditor: "审核员", colStatus: "状态", colTarget: "Target",
      colOccur: "发生日期", colDeadlineOriginal: "原始截止日期", colDeadlineNew: "新截止日期",
      colDelayReason: "延误原因", colNeedsInvestment: "是否需要投资",
      colInvestmentTotal: "投资金额 (R$)", colInvestmentStatus: "投资状态",
      colExpectation: "预期", colAbrangency: "覆盖范围",
      colFactoryComment: "工厂评论", colHisenseComment: "海信评论",
      colTotalSteps: "步骤总数", colClosedSteps: "已完成步骤", colOpenSteps: "进行中步骤", colPctDone: "完成百分比",
      colStepNo: "步骤编号", colStepAction: "步骤内容", colStepOwner: "步骤负责人",
      colStepDeadline: "步骤截止日期", colStepStatus: "步骤状态", colLate: "是否延误？", colParentStatus: "行动总体状态",
      colInvestItem: "投资项目", colType: "类型", colQuantity: "数量", colUnitCost: "单价 (R$)",
      colTotalCost: "总价 (R$)", colSupplier: "供应商", colApproval: "审批", colStage: "阶段", colRemark: "备注",
    },
    edit: {
      acaoNo: "行动编号",
      tabGeral: "基本信息", tabDescricao: "描述", tabPlano: "行动计划", tabInvestimento: "投资",
      fieldId: "编号 (No.)", fieldItem: "项目", fieldDept: "负责部门", fieldPerson: "行动负责人",
      fieldAudit: "审核员", fieldProcess: "工序", fieldOccur: "发生日期",
      fieldDeadlineOriginal: "原始截止日期", fieldNewDeadline: "新截止日期", fieldDelayReason: "延迟原因",
      confirmChangeId: '将编号从 "{atual}" 改为 "{novo}"？照片、行动计划和评论仍会关联到这项行动。',
      fieldDescription: "描述", fieldExpectation: "预期", fieldAbrangency: "覆盖范围",
      fieldFactoryComment: "工厂评论", fieldHisenseComment: "海信评论",
      semPassos: "尚未添加步骤。",
      colAcao: "行动", colResponsavel: "执行人", colPrazo: "日期", colStatus: "状态",
      limitePassos: "已达到 {n} 个步骤的上限。",
      semInvestimento: "该行动尚未登记投资项目。",
      colItem: "项目", colQtd: "数量", colCustoUn: "单价 (R$)", colFornecedor: "供应商",
      colAprovacao: "审批", colEtapa: "阶段",
      etapaRequerAprovacao: "审批状态变为「Approved」后才可设置",
      etapaAntiga: "旧值",
      notaInvestimento: "该行动已经有投资项目。要添加更多项目，请直接在表格中编辑 — 网站目前只能创建第一个项目。",
      salvandoId: "正在更改编号…", confirmandoSalvamento: "正在确认保存…",
      confirmarDescartar: "放弃所做的更改并关闭而不保存？",
      fieldItemRequired: "项目 *", fieldDeadline: "截止日期",
      addInvestimento: "+ 添加投资项目", addInvestimentoTitulo: "新投资项目",
      invItemPlaceholder: "要采购的项目名称", invSalvar: "添加项目",
    },
    db: {
      title: "数据库", sub: '"Improvement List" 工作表',
      abrirSheets: "在 Google Sheets 中打开", novaAcao: "+ 新建行动", baixarExcel: "下载 Excel（审计用）",
      buscar: "按编号、项目或负责人搜索…",
      todas: "全部", open: "进行中", closed: "已完成", onHold: "暂停", comInvestimento: "含投资",
      syncNote: "在此编辑会立即更新 Google Sheets",
      novaAcaoEmBreve: "尚不支持在网站上创建新行动 — 目前请直接在表格中添加。",
      novaAcaoSub: "先填基本信息 — 其余内容（审核员、描述、行动计划）之后可在详情面板中编辑。",
      novaAcaoItemPlaceholder: "问题/行动的简短标题",
      novaAcaoItemObrigatorio: "请填写 Item 字段。",
      novaAcaoCriar: "创建行动",
      novaAcaoNota: "这项行动还没有海信审核的正式编号 — 之后更新前先使用一个临时标识。",
      col: { no: "编号", item: "项目", dept: "负责部门", process: "工序", person: "行动负责人", status: "状态", deadline: "截止日期", investment: "投资" },
      carregando: "正在从表格加载数据…",
    },
    dash: {
      title: "仪表盘", sub: "实时计算，直接来自 Google Sheets",
      atualizar: "刷新",
      tabPrincipal: "主要", tabInvestimentos: "投资", tabForecast: "预测",
      tabAuditor: "审核员", tabAging: "滞留时长", tabDepartamentos: "部门",
      auditorTitulo: "按审核员统计的行动", auditorSub: "谁提出的，以及各自的关闭率",
      auditorTaxa: "关闭率", auditorNota: "每条柱状图旁的百分比 = 该审核员已关闭行动 ÷ 总数。",
      agingMedia: "平均滞留天数", agingMediaSub: "尚未关闭的行动",
      agingTotal: "进行中的行动", agingTotalSub: "已设置发生日期",
      agingHistTitulo: "滞留时长分布", agingHistSub: "各天数区间的行动数量",
      agingTopTitulo: "滞留最久的行动", agingTopSub: "停滞时间最长的几项",
      deptTaxaFechamento: "关闭率",
      semAbertasPorDepto: "目前没有进行中的行动。",
      deptResponsaveis: "该部门行动的负责人",
      deptAcoesCount: "{n} 项行动",
      filtroStatus: "状态", filtroStatusTodas: "全部",
      filtroInvestimento: "投资", filtroInvestTodos: "全部", filtroInvestSim: "仅含投资", filtroInvestNao: "不含投资",
      kanbanTitulo: "按阶段跟踪", kanbanSub: "已批准的投资项目，按采购流程所处阶段分组",
      kanbanDecisaoTitulo: "尚未决定", kanbanPipelineTitulo: "采购进行中",
      etapaPreparing: "准备中", etapaInTransit: "运输中", etapaDelivered: "已交付",
      quanto: "金额", quando: "时间", fornecedor: "供应商", pendenteAprovacao: "待审批",
      total: "行动总数", fechadas: "已完成", abertas: "进行中", atrasadas: "已延期",
      anoBase: "基准年 2026", doTotal: "占总数", foraDoPrazo: "今日已超期",
      statusAcoes: "行动状态", openVsClosed: "进行中 vs. 已完成",
      porDepto: "按部门统计的进行中行动", deptSub: "负责部门",
      investimento: "投资 — 批准 vs. 拒绝 vs. 待定",
      itensSolicitados: "{n} 项 · 共申请 {valor}",
      aprovado: "已批准", recusado: "已拒绝", pendente: "待定",
      footerNote: "每次加载都直接从 Google Sheets 实时计算 — 无需手动“全部刷新”，永不过时。",
      carregando: "正在从表格计算…",
      facilFechar: "关闭难易度（Target）",
      facilFecharSub: "Target = 不需要投资、投资已批准、或已关闭的行动",
      targetExplica: "当一项行动更容易关闭时会标记为 Target：不需要投资，或投资已获批准，或已经关闭。",
      podeFechar: "可以关闭",
      potencialNota: "{n} 项在办行动无需新的投资审批。关闭后完成率将从 {pctAtual}% 提升至 {pctPotencial}%。",
      resumoInvestimento: "投资概览",
      valorTotal: "申请总金额", itens: "项",
      precisaInvestimento: "需要投资的行动",
      deQuantasAcoes: "共 {n} 项行动中",
      precisamLabel: "需要", naoPrecisamLabel: "不需要",
      forecastAtrasadas: "已逾期", forecastAtrasadasSub: "已超过截止日期，仍未关闭",
      forecastProximas: "即将到期", forecastProximasSub: "未来几周，仍未关闭",
      forecastTitulo: "按周预测关闭情况",
      forecastSub: "进行中的行动，按截止日期（New Deadline）所在周分组",
      forecastVazio: "没有设置截止日期的进行中行动。",
      forecastMatrizTitulo: "按周和部门预测", forecastMatrizSub: "同样的12周窗口，按部门细分 — 红色表示已逾期",
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

// Datas trafegam do servidor sempre em ISO (YYYY-MM-DD, formato do valor de
// <input type="date"> e tambem o unico formato que o Google Sheets aceita
// via USER_ENTERED sem ambiguidade de locale) -- so a EXIBICAO muda conforme
// o idioma da interface. "en" e "zh" ja mostram ISO (passthrough); so "pt"
// reformata pra DD/MM/AAAA.
export const DATE_INPUT_LANG = { pt: "pt-BR", en: "en-CA", zh: "zh-CN" };

// Valores que o SISTEMA gera (nao sao dado digitado por ninguem): status,
// aprovacao e os rotulos de "campo vazio" que o servidor usa como chave de
// agrupamento. Ficam em ingles/pt fixo NA PLANILHA de proposito (formato
// interno gravado), mas tanto na tela quanto no .pptx baixado precisam
// aparecer no idioma escolhido -- use `tv()` (componentes) ou `translateValue`
// (fora de React, ex. lib/pptSlides.js) pra isso.
const VALORES_DO_SISTEMA = {
  Open: "db.open",
  Closed: "db.closed",
  "On Hold": "db.onHold",
  OPEN: "db.open",
  CLOSED: "db.closed",
  "ON HOLD": "db.onHold",
  Approved: "dash.aprovado",
  Declined: "dash.recusado",
  Pending: "dash.pendente",
  "Sem departamento": "common.semDepartamento",
  "Sem responsável": "common.semResponsavel",
  "Sem auditor": "common.semAuditor",
};

export function formatDateISO(iso, lang) {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso; // valor legado/nao reconhecido -- mostra como veio em vez de sumir
  const [, y, mo, d] = m;
  return lang === "pt" ? `${d}/${mo}/${y}` : iso;
}

// Versoes de t()/tv() que recebem o idioma como parametro em vez de ler do
// React Context -- pra uso FORA de componente, ex. lib/pptSlides.js (roda
// tanto no servidor quanto no navegador, gerando o .pptx baixado, que agora
// tambem segue o idioma escolhido na tela em vez de ficar sempre em ingles).
export function translate(lang, key, vars) {
  const val = getByPath(DICT[lang], key) ?? getByPath(DICT.pt, key) ?? key;
  return typeof val === "string" ? interpolate(val, vars) : val;
}

export function translateValue(lang, valorBruto) {
  const chave = VALORES_DO_SISTEMA[String(valorBruto ?? "").trim()];
  return chave ? translate(lang, chave) : valorBruto;
}

const LanguageContext = createContext({ lang: "pt", setLang: () => {}, t: (k) => k, tv: (v) => v, formatDate: (iso) => iso || "", dateInputLang: "pt-BR" });

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
    return translate(lang, key, vars);
  }

  function formatDate(iso) {
    return formatDateISO(iso, lang);
  }

  // traduz um VALOR gerado pelo sistema (Open/Closed/Approved/"Sem
  // departamento"...). Qualquer coisa que nao esteja no mapa e dado
  // digitado pelo usuario e volta intacta.
  function tv(valor) {
    return translateValue(lang, valor);
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tv, formatDate, dateInputLang: DATE_INPUT_LANG[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
