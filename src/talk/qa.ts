/**
 * "Fale com o Davi": ready-made questions and answers, in Portuguese and English.
 * Every answer is written in the first person ONLY from facts already in src/data/*.
 * No new facts, numbers or opinions; tests/unit/qa.test.ts checks ids, follow-ups,
 * the action whitelist, both languages, the 80-word limit and that every number exists in src/data.
 */
import type { SceneAction } from "./catalog";

export type Lang = "pt" | "en";

/** `at` (0–1): how far into the answer the action may start; actions also wait for the camera to arrive. */
export type QaAction = SceneAction & { at?: number };

export type QaEntry = {
  id: string;
  q: Record<Lang, string>;
  a: Record<Lang, string>;
  actions: QaAction[];
  next: string[];
};

/** Opening chips, shown when the panel opens and after "voltar ao início". */
export const OPENING = ["who", "nubank", "ai", "contact"];

export const QA: QaEntry[] = [
  {
    id: "who",
    q: { pt: "Quem é você?", en: "Who are you?" },
    a: {
      pt: "Sou o Davi Braga, de Varginha, morando em São Paulo. Hoje sou Business Analyst em Core Limit Policies no Nubank. Sou formado em Sistemas de Informação pela UNIFEI, concluí a pós em Inteligência de Dados em Negócios na ESPM, com TCC nota 10, e estou cursando Engenharia de Software em IA. Tenho interesse em análise de dados e números, e sou extrovertido e conversador.",
      en: "I'm Davi Braga, from Varginha, living in São Paulo. Today I'm a Business Analyst in Core Limit Policies at Nubank. I have a degree in Information Systems from UNIFEI, I completed Business Data Intelligence at ESPM with a thesis graded 10, and I'm studying Software Engineering in AI. I'm interested in data analysis and numbers, and I'm extroverted and conversational.",
    },
    actions: [
      { name: "go_to_chapter", id: "desk" },
      { name: "avatar_emote", kind: "wave", at: 0.05 },
    ],
    next: ["nubank", "education", "why"],
  },
  {
    id: "nubank",
    q: { pt: "O que você faz no Nubank?", en: "What do you do at Nubank?" },
    a: {
      pt: "Desde jun 2025 sou Business Analyst em Core Limit Policies no Nubank. Trabalho com políticas de limite de cartão em múltiplos países: analiso experimentos de aumento de limite com teste vs. controle, calculo métricas de cartão, desenvolvo pipelines de monitoria em Databricks e crio dashboards internos. Também participo da implementação de regras de política em produção e documento análises para stakeholders técnicos e de negócio.",
      en: "Since Jun 2025 I've been a Business Analyst in Core Limit Policies at Nubank. I work on credit card limit policies across multiple countries: I analyze limit-increase experiments with test vs. control, calculate card metrics, build monitoring pipelines in Databricks and create internal dashboards. I also help implement policy rules in production and document analyses for technical and business stakeholders.",
    },
    actions: [
      { name: "go_to_chapter", id: "war" },
      { name: "focus_object", id: "nubank", at: 0.15 },
      { name: "avatar_emote", kind: "point", at: 0.2 },
    ],
    next: ["experiments", "nubank-projects", "career"],
  },
  {
    id: "experiments",
    q: { pt: "Como funcionam os experimentos de limite?", en: "How do the limit experiments work?" },
    a: {
      pt: "Comparo grupos de teste e controle em experimentos de aumento de limite de cartão. Meço o impacto em volume de compras, saldo médio diário que rende juros, saldo em aberto e limite. Depois calculo as diferenças entre os grupos e a utilização marginal, como o volume de compras extra por real de limite extra, para entender se o aumento está sendo saudável em uso, receita e risco.",
      en: "I compare test and control groups in credit card limit-increase experiments. I measure the impact on purchase volume, average daily interest-bearing balance, outstanding balance and limit. Then I calculate the differences between the groups and the marginal utilization, such as the extra purchase volume per extra real of limit, to see whether the increase is healthy in terms of usage, revenue and risk.",
    },
    actions: [
      { name: "go_to_chapter", id: "war" },
      { name: "avatar_emote", kind: "think", at: 0.1 },
      { name: "open_dossier", id: "experience:nubank", at: 0.45 },
    ],
    next: ["nubank-projects", "skills", "contact"],
  },
  {
    id: "nubank-projects",
    q: { pt: "Que projetos você fez por lá?", en: "Which projects have you worked on there?" },
    a: {
      pt: "Alguns exemplos: views mensais de monitoria para experimentos de aumento de limite, alinhadas a FP&A e por banda de risco; métricas de perdas, como NPL e roll rate; um bloqueio por status de compliance bancária na política de limite, depois de uma migração regulatória; e a migração dos pipelines de monitoria de notebooks para um repositório versionado, com dashboards gerados a partir dos novos jobs.",
      en: "A few examples: monthly monitoring views for limit-increase experiments, aligned with FP&A and split by risk band; loss metrics such as NPL and roll rate; a time-based block by banking compliance status in the limit policy, after a regulatory migration; and moving the monitoring pipelines from notebooks to a versioned repository, with dashboards built from the new jobs.",
    },
    actions: [
      { name: "go_to_chapter", id: "war" },
      { name: "focus_object", id: "views-mensais-br-mx", at: 0.05 },
      { name: "focus_object", id: "metricas-losses-mx", at: 0.32 },
      { name: "focus_object", id: "compliance-mexico", at: 0.5 },
      { name: "avatar_emote", kind: "point", at: 0.08 },
    ],
    next: ["experiments", "skills", "contact"],
  },
  {
    id: "ai",
    q: { pt: "Como você usa IA no dia a dia?", en: "How do you use AI day to day?" },
    a: {
      pt: "Na prática, em três frentes: n8n para automatizar fluxos, criação de skills, que são instruções que o agente segue, e agentes que resolvem o problema repetido do expediente. O objetivo é simples: o problema diário deixa de ser manual. Também trabalho com LLMs, RAG, MCP e APIs generativas, e estou cursando uma pós em Engenharia de Software em IA.",
      en: "In practice, on three fronts: n8n to automate workflows, building skills, which are instructions the agent follows, and agents that solve the repetitive problems of the workday. The goal is simple: everyday problems stop being manual. I also work with LLMs, RAG, MCP and generative APIs, and I'm taking a graduate program in Software Engineering in AI.",
    },
    actions: [
      { name: "go_to_chapter", id: "lab" },
      { name: "focus_object", id: "dia-a-dia", at: 0.1 },
      { name: "avatar_emote", kind: "point", at: 0.12 },
      { name: "open_dossier", id: "practice:n8n", at: 0.55 },
    ],
    next: ["ai-study", "skills", "contact"],
  },
  {
    id: "ai-study",
    q: { pt: "O que você estuda em IA?", en: "What are you studying in AI?" },
    a: {
      pt: "Estou na pós-graduação lato sensu em Engenharia de Software em IA, de fev 2026 a fev 2027: são 480h em 12 meses. É uma especialização em Engenharia de Software e Inteligência Artificial, com n8n, skills, agentes, LLMs e MCP. O que já entrega resultado no meu dia a dia é prático: automação com n8n, skills que o agente segue e agentes no trabalho.",
      en: "I'm in a graduate specialization in Software Engineering in AI, from Feb 2026 to Feb 2027: 480 hours over 12 months. It covers Software Engineering and Artificial Intelligence, with n8n, skills, agents, LLMs and MCP. What already delivers results in my day to day is practical: automation with n8n, skills the agent follows and agents at work.",
    },
    actions: [
      { name: "go_to_chapter", id: "lab" },
      { name: "avatar_emote", kind: "nod", at: 0.1 },
      { name: "open_dossier", id: "lab:pos-ia", at: 0.4 },
    ],
    next: ["ai", "education", "contact"],
  },
  {
    id: "education",
    q: { pt: "Qual é a sua formação?", en: "What is your education?" },
    a: {
      pt: "Sou bacharel em Sistemas de Informação pela Universidade Federal de Itajubá, a UNIFEI, de 2018 a 2023. Depois concluí a pós em Inteligência de Dados em Negócios na ESPM, com TCC nota 10, focada em transformar dados em decisões estratégicas, com Tableau, data storytelling e modelos preditivos. Agora curso a pós em Engenharia de Software em IA.",
      en: "I have a bachelor's degree in Information Systems from the Federal University of Itajubá, UNIFEI, from 2018 to 2023. Then I completed a graduate program in Business Data Intelligence at ESPM, with a thesis graded 10, focused on turning data into strategic decisions with Tableau, data storytelling and predictive models. Now I'm taking a graduate program in Software Engineering in AI.",
    },
    actions: [
      { name: "go_to_chapter", id: "studio" },
      { name: "focus_object", id: "unifei", at: 0.08 },
      { name: "focus_object", id: "espm", at: 0.4 },
      { name: "avatar_emote", kind: "point", at: 0.1 },
    ],
    next: ["tcc", "ai-study", "career"],
  },
  {
    id: "tcc",
    q: { pt: "Sobre o que foi o seu TCC?", en: "What was your thesis about?" },
    a: {
      pt: "Meu TCC na UNIFEI, em 2023, foi “Uma Introdução ao Leilão da Mochila”, sobre Teoria dos Jogos, Design de Mecanismos e o Problema da Mochila. Implementei em C++ quatro abordagens: algoritmo guloso, algoritmo ½-aproximado, programação dinâmica e programação linear inteira com CPLEX. O guloso e o aproximado foram muito mais rápidos que os métodos exatos, com soluções próximas da ótima.",
      en: "My thesis at UNIFEI, in 2023, was “An Introduction to the Knapsack Auction”, about Game Theory, Mechanism Design and the Knapsack Problem. I implemented four approaches in C++: a greedy algorithm, a ½-approximation algorithm, dynamic programming and integer linear programming with CPLEX. The greedy and the approximate ones were much faster than the exact methods, with solutions close to the optimum.",
    },
    actions: [
      { name: "go_to_chapter", id: "studio" },
      { name: "focus_object", id: "tcc", at: 0.1 },
      { name: "avatar_emote", kind: "think", at: 0.15 },
      { name: "open_dossier", id: "tcc:tcc", at: 0.5 },
    ],
    next: ["education", "skills", "contact"],
  },
  {
    id: "career",
    q: { pt: "O que você fez antes do Nubank?", en: "What did you do before Nubank?" },
    a: {
      pt: "Antes do Nubank fui Analista de Negócios na Flash, Analista Comercial na Discover e estagiário de Sales Ops na Conta Simples. Também fui Account Manager na AIESEC, estagiei na Câmara Municipal de Itajubá e na UNIFEI, e fui vice-diretor de eventos da Atlética da UNIFEI. Na Flash, por exemplo, transformava dados operacionais e de receita em análises para as áreas Comercial e de Customer Success.",
      en: "Before Nubank I was a Business Analyst at Flash, a Commercial Analyst at Discover and a Sales Ops intern at Conta Simples. I was also an Account Manager at AIESEC, an intern at the Itajubá City Council and at UNIFEI, and vice-director of events at UNIFEI's athletics association. At Flash, for example, I turned operational and revenue data into analyses for the Commercial and Customer Success teams.",
    },
    actions: [
      { name: "go_to_chapter", id: "flash" },
      { name: "focus_object", id: "flash", at: 0.08 },
      { name: "avatar_emote", kind: "point", at: 0.1 },
      { name: "focus_object", id: "discover", at: 0.2 },
      { name: "focus_object", id: "conta-simples", at: 0.3 },
    ],
    next: ["flash", "nubank", "why"],
  },
  {
    id: "flash",
    q: { pt: "O que você fazia na Flash?", en: "What did you do at Flash?" },
    a: {
      pt: "Na Flash, de jan 2024 a jun 2025, fui Analista de Negócios: a ponte entre dados e negócio para as áreas Comercial e de Customer Success. Criei e mantive dashboards no Metabase com KPIs, funil de vendas e indicadores de receita, automatizei relatórios com SQL e PL/SQL e ajudei a identificar gargalos operacionais, propondo soluções orientadas a dados.",
      en: "At Flash, from Jan 2024 to Jun 2025, I was a Business Analyst: the bridge between data and business for the Commercial and Customer Success teams. I built and maintained Metabase dashboards with KPIs, the sales funnel and revenue indicators, automated reports with SQL and PL/SQL, and helped identify operational bottlenecks, proposing data-driven solutions.",
    },
    actions: [
      { name: "go_to_chapter", id: "flash" },
      { name: "avatar_emote", kind: "nod", at: 0.1 },
      { name: "open_dossier", id: "experience:flash", at: 0.4 },
    ],
    next: ["career", "skills", "contact"],
  },
  {
    id: "skills",
    q: { pt: "Quais ferramentas você usa?", en: "Which tools do you use?" },
    a: {
      pt: "Para dados: SQL, Python, PL/SQL e Databricks, com pipelines de monitoria e experimentos A/B. Para visualização: dashboards e Metabase. Em IA: n8n, criação de skills, agentes, LLMs, RAG e MCP. No negócio, trabalho com métricas de cartão de crédito, risco e política de crédito, FP&A e budget. E falo inglês em nível intermediário/avançado.",
      en: "For data: SQL, Python, PL/SQL and Databricks, with monitoring pipelines and A/B experiments. For visualization: dashboards and Metabase. In AI: n8n, skill creation, agents, LLMs, RAG and MCP. On the business side, I work with credit card metrics, credit risk and policy, FP&A and budget. And I speak intermediate/advanced English.",
    },
    actions: [
      { name: "avatar_emote", kind: "nod", at: 0.05 },
      { name: "open_dossier", id: "skills:all", at: 0.3 },
    ],
    next: ["experiments", "ai", "contact"],
  },
  {
    id: "why",
    q: { pt: "Por que te contratar?", en: "Why should we hire you?" },
    a: {
      pt: "O que eu trago: experiência com experimentos de limite de cartão no Nubank, do teste vs. controle aos pipelines de monitoria e dashboards; uma trajetória transformando dados em análises para as áreas Comercial e de Customer Success; e automação com n8n, skills e agentes. Gosto de ambientes que exigem adaptação e aprendizado contínuo, e busco problemas que ainda não domino, porque é onde mais aprendo.",
      en: "What I bring: experience with credit card limit experiments at Nubank, from test vs. control to monitoring pipelines and dashboards; a track record of turning data into analyses for Commercial and Customer Success teams; and automation with n8n, skills and agents. I like environments that demand adaptation and continuous learning, and I look for problems I don't master yet, because that's where I learn the most.",
    },
    actions: [
      { name: "go_to_chapter", id: "desk" },
      { name: "avatar_emote", kind: "nod", at: 0.1 },
    ],
    next: ["nubank", "ai", "contact"],
  },
  {
    id: "contact",
    q: { pt: "Como falo com você?", en: "How can I reach you?" },
    a: {
      pt: "Pelo e-mail ou pelo LinkedIn: os dois estão no cartão de contato, aqui na varanda, o último capítulo da casa. Abri o cartão pra você. É só me chamar por lá.",
      en: "By e-mail or LinkedIn: both are on the contact card, here on the balcony, the last chapter of the apartment. I've opened the card for you. Just reach out there.",
    },
    actions: [
      { name: "go_to_chapter", id: "balcony" },
      { name: "avatar_emote", kind: "wave", at: 0.1 },
      { name: "focus_object", id: "mail", at: 0.15 },
      { name: "open_dossier", id: "contact:card", at: 0.45 },
    ],
    next: ["who", "why", "nubank"],
  },
];

export function entryOf(id: string) {
  return QA.find((e) => e.id === id) ?? null;
}
