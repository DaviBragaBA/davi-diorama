// Formação acadêmica — edite em src/data/education.ts

export type Education = {
  id: string;
  institution: string;
  degree: string;
  description?: string;
  tags: string[];
  period: string;
  activities?: string;
  logo?: string;
  /** Link para página com programa completo / sumário detalhado */
  detailUrl?: string;
  tccUrl?: string;
  /** Para barra de progresso (pós em andamento): início e fim em YYYY-MM */
  startDate?: string;
  endDate?: string;
};

export const education: Education[] = [
  {
    id: "espm",
    institution: "ESPM Escola Superior de Propaganda e Marketing",
    degree: "Inteligência de Dados em Negócios",
    description:
      "Formação voltada para a aplicação prática da inteligência de dados nos negócios, com disciplinas que abrangem marketing, finanças, estratégia corporativa, visualização de dados e ciência de dados aplicada. Foco em transformar dados em decisões estratégicas por meio de ferramentas como Tableau, Altair RapidMiner e conceitos como data storytelling, modelos preditivos e inteligência artificial. Concluída com TCC nota 10.",
    tags: ["Dados", "Inteligência de negócios (BI)", "Tableau", "Data storytelling", "Modelos preditivos", "TCC nota 10"],
    period: "abr 2025 – 2026 · concluída",
    startDate: "2025-04",
    endDate: "2026-08",
    activities:
      "TCC nota 10. Atividades em grupo, cases reais com professores do mercado e projeto de conclusão aplicado a negócios orientados por dados.",
    detailUrl: "/formation/pos",
  },
  {
    id: "pos-ia",
    institution: "Pós-Graduação Lato Sensu",
    degree: "Engenharia de Software em IA",
    description:
      "Especialização em Engenharia de Software e Inteligência Artificial. No dia a dia, o que já entrega resultado é prático: n8n pra automatizar fluxos, criação de skills e agentes que resolvem o problema repetido do expediente.",
    tags: ["n8n", "Skills", "Agentes", "LLMs", "MCP"],
    period: "fev 2026 - fev 2027",
    startDate: "2026-02",
    endDate: "2027-02",
    activities:
      "480h em 12 meses. O uso real agora: automação com n8n, skills que o agente segue, agentes no trabalho — o problema diário deixa de ser manual.",
    detailUrl: "/formation/pos-ia",
  },
  {
    id: "unifei",
    institution: "Universidade Federal de Itajubá",
    degree: "Bacharelado, Sistemas de Informação",
    tags: ["Habilidades analíticas", "Python"],
    period: "2018 - 2023",
    tccUrl: "/tcc",
  },
];
