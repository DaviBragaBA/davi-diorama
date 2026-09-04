// Competências principais — edite em src/data/skills.ts

export type SkillCategory = {
  id: string;
  name: string;
  nameEn: string;
  skills: string[];
  skillsEn: string[];
};

export const skillCategories: SkillCategory[] = [
  {
    id: "credito-politica",
    name: "Crédito e política",
    nameEn: "Credit & policy",
    skills: [
      "Risco de crédito",
      "Política de crédito",
      "Métricas de cartão de crédito",
      "Políticas de limite",
      "Compliance bancário",
      "Risk Adjusted Margin",
      "Modelagem financeira",
    ],
    skillsEn: [
      "Credit risk",
      "Credit policy",
      "Credit card metrics",
      "Limit policies",
      "Banking compliance",
      "Risk adjusted margin",
      "Financial modeling",
    ],
  },
  {
    id: "dados-experimentos",
    name: "Dados e experimentos",
    nameEn: "Data & experiments",
    skills: [
      "Experimentos / A/B Testing",
      "Análise de dados",
      "Databricks",
      "SQL",
      "Python",
      "PL/SQL",
      "Pipelines de monitoria",
    ],
    skillsEn: [
      "Experiments / A/B testing",
      "Data analysis",
      "Databricks",
      "SQL",
      "Python",
      "PL/SQL",
      "Monitoring pipelines",
    ],
  },
  {
    id: "visualizacao",
    name: "Visualização e monitoria",
    nameEn: "Visualization & monitoring",
    skills: [
      "Dashboards",
      "Visualização de dados",
      "Metabase",
      "FP&A e budget",
      "KPIs e OKRs",
    ],
    skillsEn: [
      "Dashboards",
      "Data visualization",
      "Metabase",
      "FP&A and budget",
      "KPIs and OKRs",
    ],
  },
  {
    id: "ia-engenharia",
    name: "IA e engenharia de software",
    nameEn: "AI & software engineering",
    skills: [
      "n8n",
      "Criação de skills",
      "Agentes no dia a dia",
      "LLMs",
      "RAG",
      "MCP (Model Context Protocol)",
      "APIs generativas",
    ],
    skillsEn: [
      "n8n",
      "Skill creation",
      "Everyday agents",
      "LLMs",
      "RAG",
      "MCP (Model Context Protocol)",
      "Generative APIs",
    ],
  },
  {
    id: "negocio-comunicacao",
    name: "Negócio e comunicação",
    nameEn: "Business & communication",
    skills: [
      "Trabalho em equipe",
      "Comunicação",
      "Resolução de problemas",
      "Habilidades analíticas",
      "Customer Success",
      "Data storytelling",
      "Documentação técnica",
      "Qualificação de leads",
    ],
    skillsEn: [
      "Teamwork",
      "Communication",
      "Problem solving",
      "Analytical skills",
      "Customer success",
      "Data storytelling",
      "Technical documentation",
      "Lead qualification",
    ],
  },
  {
    id: "idiomas",
    name: "Idiomas",
    nameEn: "Languages",
    skills: ["Inglês (intermediário/avançado)"],
    skillsEn: ["English (intermediate/advanced)"],
  },
];
