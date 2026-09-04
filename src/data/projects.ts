// Projetos em Core Limit Policies — versão genérica para perfil público

export type Project = {
  id: string;
  title: string;
  context: string;
  description: string;
  tags: string[];
};

export const projects: Project[] = [
  {
    id: "views-mensais-br-mx",
    title: "Views mensais de monitoria para experimentos de aumento de limite",
    context: "Nubank · Core Limit Policies",
    description:
      "Criação de views de monitoria mensal (alinhadas a FP&A) para experimentos de aumento de limite: métricas por mês e banda de risco, com comparação teste vs. controle. Expansão das views e ajuste de dashboards para exibição correta por banda de risco.",
    tags: ["Databricks", "SQL", "Dashboards"],
  },
  {
    id: "metricas-losses-mx",
    title: "Métricas de perdas e monitoria de experimentos",
    context: "Nubank · Core Limit Policies",
    description:
      "Views de monitoria de experimentos de aumento de limite por tempo desde início do experimento. Refatoração para reutilizar lógica comum entre países, reduzindo duplicação. Inclui métricas de perdas, NPL e roll rate, com validação em ambiente de dados.",
    tags: ["Scala", "Métricas de risco"],
  },
  {
    id: "compliance-mexico",
    title: "Regras de compliance bancária na política de limite",
    context: "Nubank · Core Limit Policies",
    description:
      "Implementação de bloqueio temporal por status de compliance bancária, após migração regulatória. Criação e integração de blocks de decisão na política de limite e atualização de datasets de entrada, com validação para garantir que clientes não conformes fiquem bloqueados até conclusão do fluxo regulatório.",
    tags: ["Credit Policy", "Compliance", "Regulatório"],
  },
  {
    id: "risk-band-dashboards",
    title: "Monitoria por banda de risco e filtro dinâmico de políticas",
    context: "Nubank · Core Limit Policies",
    description:
      "Ajuste das monitorias de budget para usar banda de risco nas views de aumento de limite. Implementação de filtro dinâmico para exibir apenas as últimas versões de políticas e experimentos, em vez de listas fixas. Sincronização entre pipelines de dados e dashboards para exibição correta por risk band.",
    tags: ["Dashboards", "Risk band"],
  },
  {
    id: "business-month-views",
    title: "Views de mês de negócio",
    context: "Nubank · Core Limit Policies",
    description:
      "Desenvolvimento de views de mês de negócio para monitoria agregada em ambos os países: desenvolvimento, code review e integração com ferramentas de visualização. Base para acompanhamento de métricas por período de negócio.",
    tags: ["Dados"],
  },
  {
    id: "dashboard-experimentos",
    title: "Dashboard de experimentos de aumento de limite",
    context: "Nubank · Core Limit Policies",
    description:
      "Criação de dashboard para acompanhamento visual dos experimentos de aumento de limite, usando dados gerados pelos pipelines de monitoria. Migração de lógica de ambiente de notebooks para repositório de código e geração do dashboard em Python.",
    tags: ["Python", "Dashboards", "Experimentos"],
  },
  {
    id: "migracao-pipelines",
    title: "Migração de pipelines de monitoria para repositório versionado",
    context: "Nubank · Core Limit Policies",
    description:
      "Migração do código de monitoria de ambiente de notebooks para repositório versionado: ajustes, revisão de código, merge e configuração em ambiente de execução. Criação de dashboards a partir dos novos jobs para acompanhamento de políticas e experimentos.",
    tags: ["Migração", "Dashboards"],
  },
  {
    id: "onboarding-documentacao",
    title: "Onboarding e documentação em Core Limit Policies",
    context: "Nubank · Core Limit Policies",
    description:
      "Setup de ambiente de desenvolvimento, entendimento de ferramentas de dados e métricas de limite. Documentação do fluxo de onboarding, estrutura de monitorias, filtros e métricas utilizadas nas análises de política.",
    tags: ["Onboarding", "Databricks"],
  },
  {
    id: "monitoring-fup",
    title: "Monitoria de follow-up de políticas",
    context: "Nubank · Core Limit Policies",
    description:
      "Projeto de monitoria de follow-up: análise e infraestrutura de acompanhamento de políticas de limite no escopo de Core Limit Policies.",
    tags: [],
  },
];
