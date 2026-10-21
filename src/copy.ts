import { education, experiences, getAge, personal, personalProjects, projects, skillCategories, tcc } from "./data";

export type Card = { kicker: string; title: string; body: string; tags?: string[]; jumps?: { id: string; label: string }[]; list?: { kind: string; id: string; label: string; meta: string }[]; live?: string };

export type Metric = { value: number; suffix?: string; prefix?: string; label: string; decimals?: number };
export type Chip = { kind: string; id: string; label: string; meta?: string };
export type Slide = {
  id: string;
  num: string;
  kicker: string;
  title: [string, string];
  lead: string;
  metrics: Metric[];
  chips: Chip[];
  more?: { kind: string; id: string; label: string };
};

export const JUMPS = [
  { id: "desk", label: "Perfil · agora" },
  { id: "war", label: "Nubank · Core Limit" },
  { id: "flash", label: "Trajetória" },
  { id: "studio", label: "Formação · UNIFEI / ESPM" },
  { id: "lab", label: "Inteligência Artificial" },
  { id: "balcony", label: "Contato" },
];

const nubank = experiences[0];
const yearsData = new Date().getFullYear() - 2022 + 0.5;
const espm = education.find((e) => e.id === "espm")!;
const posIa = education.find((e) => e.id === "pos-ia")!;
const unifei = education.find((e) => e.id === "unifei")!;
const iaSkills = skillCategories.find((c) => c.id === "ia-engenharia")!;

export const SLIDES: Slide[] = [
  {
    id: "desk",
    num: "01",
    kicker: "São Paulo · agora",
    title: ["Davi", "Braga"],
    lead: `${nubank.role.replace(" (Excellence)", "")} no Nubank. Transformo experimento de limite em decisão: teste vs. controle, risco, receita e a história que explica os dois.`,
    metrics: [
      { value: getAge(), label: "anos" },
      { value: yearsData, decimals: 1, suffix: "+", label: "anos em dados" },
      { value: 6, label: "empresas" },
    ],
    chips: [
      { kind: "egg", id: "monitor", label: "PC", meta: "clica" },
      { kind: "egg", id: "speaker", label: "som", meta: "lo-fi" },
      { kind: "egg", id: "lamp", label: "luz", meta: "noite" },
    ],
    more: { kind: "cork", id: "cv", label: "abrir sumário" },
  },
  {
    id: "war",
    num: "02",
    kicker: `Nubank · ${nubank.period}`,
    title: ["Core Limit", "Policies"],
    lead: `${nubank.description} Teste vs. controle, volume de compras, saldo médio, utilização marginal, bandas de risco, Databricks e a história pra FP&A.`,
    metrics: [
      { value: 4, label: "projetos de política" },
      { value: 2, label: "grupos · teste vs. controle" },
      { value: 24, suffix: "/7", label: "monitoria Databricks" },
    ],
    chips: [
      { kind: "experience", id: "nubank", label: "teste vs. controle", meta: "experimento" },
      { kind: "project", id: "views-mensais-br-mx", label: "Databricks", meta: "views" },
      { kind: "project", id: "risk-band-dashboards", label: "bandas", meta: "risco" },
      { kind: "project", id: "compliance-mexico", label: "compliance", meta: "blocks" },
      { kind: "project", id: "metricas-losses-mx", label: "perdas", meta: "NPL" },
    ],
    more: { kind: "experience", id: "nubank", label: "ler a experiência" },
  },
  {
    id: "flash",
    num: "03",
    kicker: "Carreira · 2018 → 2025",
    title: ["Antes do", "Nubank"],
    lead: "Flash, Discover, Conta Simples, AIESEC, Câmara de Itajubá, UNIFEI e Atlética. Sempre o mesmo fio: dado que vira decisão comercial.",
    metrics: [
      { value: experiences.length - 1, label: "experiências" },
      { value: 7, label: "anos de trajetória" },
      { value: 3, label: "áreas · dados, vendas, CS" },
    ],
    chips: experiences.slice(1).map((e) => ({ kind: "experience", id: e.id, label: e.company.replace("Associação Atlética Acadêmica ", "Atlética ").replace("Estágio – ", ""), meta: e.period ?? "" })),
  },
  {
    id: "studio",
    num: "04",
    kicker: "Formação · concluída",
    title: ["UNIFEI", "ESPM"],
    lead: `${personal.formacaoEmUmaLinha} Na ESPM, o TCC saiu nota 10.`,
    metrics: [
      { value: 10, label: "nota do TCC · ESPM" },
      { value: 2023, label: "UNIFEI · Sistemas de Informação" },
      { value: 100, suffix: "%", label: "ESPM · Inteligência de Dados" },
    ],
    chips: [
      { kind: "education", id: espm.id, label: "ESPM", meta: "TCC nota 10" },
      { kind: "education", id: unifei.id, label: "UNIFEI", meta: unifei.period },
      { kind: "tcc", id: "tcc", label: "TCC UNIFEI", meta: "leilão da mochila" },
    ],
    more: { kind: "education", id: "espm", label: "ler a formação" },
  },
  {
    id: "lab",
    num: "05",
    kicker: "IA aplicada · agora",
    title: ["IA no", "dia a dia"],
    lead: "n8n, criação de skills e agentes. Três jeitos de tirar problema repetido do caminho — no trabalho e fora dele.",
    metrics: [
      { value: 3, label: "pilares · n8n, skills, agentes" },
      { value: 1, label: "fluxo · problema vira automação" },
      { value: 100, suffix: "%", label: "foco no dia a dia" },
    ],
    chips: [
      { kind: "practice", id: "n8n", label: "n8n", meta: "automação" },
      { kind: "practice", id: "skills-craft", label: "Skills", meta: "criar" },
      { kind: "practice", id: "agentes", label: "Agentes", meta: "no trabalho" },
      { kind: "practice", id: "flux", label: "Fluxos", meta: "pipeline" },
      { kind: "practice", id: "mcp", label: "MCP", meta: "tools" },
    ],
    more: { kind: "practice", id: "dia-a-dia", label: "como eu uso IA" },
  },
  {
    id: "balcony",
    num: "06",
    kicker: "Contato",
    title: ["Bora", "conversar"],
    lead: "Se você chegou até aqui, já sabe como eu penso. Me chama — respondo rápido.",
    metrics: [
      { value: 24, prefix: "<", suffix: "h", label: "pra responder" },
      { value: 100, suffix: "%", label: "aberto a conversa" },
      { value: 0, label: "enrolação" },
    ],
    chips: [
      { kind: "contact", id: "card", label: personal.email, meta: "copiar" },
      { kind: "link", id: personal.linkedin, label: "LinkedIn", meta: "abrir" },
      { kind: "contact", id: "card", label: "crachá", meta: "ping" },
    ],
  },
];

export function slideOf(id: string) {
  return SLIDES.find((s) => s.id === id) ?? SLIDES[0];
}

const about: Card = {
  kicker: "Sobre",
  title: `${getAge()} anos · ${personal.birthCity} → ${personal.currentCity}`,
  body: `${personal.formacaoEmUmaLinha}\n\n${personal.personalidade} ${personal.idiomas}.\n\n${personal.motivacao}\n\n${personal.alunoDestaque}`,
  tags: ["Business Analyst", "Crédito", "Experimentos", "Databricks", "IA"],
};

export function inspectCard(kind: string, id: string): Card | null {
  if (kind === "experience") {
    const e = experiences.find((x) => x.id === id);
    if (!e) return null;
    return { kicker: `${e.company} · ${e.period ?? ""}`, title: e.role, body: `${e.description}\n\n${e.highlights.map((h) => "— " + h).join("\n\n")}`, tags: e.tags, live: e.id === "nubank" ? "limit" : undefined };
  }
  if (kind === "project") {
    const p = projects.find((x) => x.id === id) ?? personalProjects.find((x) => x.id === id);
    if (!p) return null;
    const extra = "context" in p ? p.context : "projeto";
    return { kicker: extra, title: p.title, body: p.description, tags: p.tags };
  }
  if (kind === "education") {
    const e = education.find((x) => x.id === id);
    if (!e) return null;
    const tccLine = e.id === "espm" ? "\n\nTCC nota 10." : "";
    return { kicker: `${e.institution} · ${e.period}`, title: e.degree, body: `${e.description ?? personal.formacaoEmUmaLinha}${tccLine}${e.activities ? "\n\n" + e.activities : ""}`, tags: e.tags };
  }
  if (kind === "tcc") {
    return { kicker: `${tcc.year} · ${tcc.institution}`, title: tcc.title, body: `${tcc.emUmaFrase}\n\n${tcc.sections[0].content}\n\n${tcc.sections[2].content}`, tags: tcc.technologies, live: "pack" };
  }
  if (kind === "skills") {
    const cat = skillCategories.find((c) => c.id === id);
    if (cat) return { kicker: "competências", title: cat.name, body: cat.skills.join(" · "), tags: cat.skills.slice(0, 6) };
    return {
      kicker: "competências",
      title: "O que eu uso",
      body: skillCategories.map((c) => `${c.name}\n${c.skills.join(" · ")}`).join("\n\n"),
    };
  }
  if (kind === "cv" || kind === "cork") {
    return {
      kicker: "Sumário",
      title: "Pula direto",
      body: "Cada item é uma seção do currículo. Clica e a câmera vai.",
      jumps: JUMPS,
    };
  }
  if (kind === "about") return about;
  if (kind === "practice") {
    if (id === "n8n") {
      return {
        kicker: "automação · dia a dia",
        title: "n8n",
        body: "Uso o n8n pra tirar trabalho repetido do caminho. Fluxos que ligam ferramenta, dado e aviso — o que eu fazia na mão, o n8n faz sozinho.",
        tags: ["n8n", "Automação", "Integrações"],
        live: "n8n",
      };
    }
    if (id === "skills-craft") {
      return {
        kicker: "criar o jeito de trabalhar",
        title: "Skills",
        body: "Crio skills — instruções e fluxos que o agente segue — pra não ter que explicar o mesmo problema toda vez. Clica em antes / depois.",
        tags: ["Skills", "Cursor", "Agentes"],
        live: "skill",
      };
    }
    if (id === "agentes") {
      return {
        kicker: "no trabalho, todo dia",
        title: "Agentes",
        body: "Agentes no expediente: pesquisam, rascunham, conferem. Mexe em contexto e tom — o rascunho muda.",
        tags: ["Agentes", "n8n", "Skills"],
        live: "agent",
      };
    }
    if (id === "flux") {
      return {
        kicker: "pipeline",
        title: "Fluxos",
        body: "O mesmo raciocínio do n8n, outro recorte: trigger, regra, dado, aviso, log.",
        tags: ["n8n", "Fluxos", "Databricks"],
        live: "flux",
      };
    }
    if (id === "mcp") {
      return {
        kicker: "Model Context Protocol",
        title: "MCP",
        body: "O agente não adivinha o banco. Ele chama a tool. Clica numa tool e vê o payload.",
        tags: ["MCP", "Tools", "SQL"],
        live: "mcp",
      };
    }
    return {
      kicker: "IA aplicada",
      title: "Skills, agentes e n8n",
      body: "Três coisas, o mesmo objetivo: o problema diário deixa de ser manual. n8n automatiza. Skills padronizam. Agentes executam no expediente.",
      tags: ["n8n", "Skills", "Agentes"],
      live: "n8n",
    };
  }
  if (kind === "lab") {
    return {
      kicker: posIa.period,
      title: posIa.degree,
      body: `${posIa.description}\n\n${posIa.activities ?? ""}\n\n${iaSkills.skills.join(" · ")}`,
      tags: posIa.tags,
      live: "n8n",
    };
  }
  if (kind === "contact") {
    return {
      kicker: "me chama",
      title: personal.fullName,
      body: `${personal.email}\n\nLinkedIn no botão. Ou tecla C. Ou o crachá na varanda.`,
      tags: ["e-mail", "LinkedIn", "< 24h"],
      live: "ping",
    };
  }
  return null;
}

export function fichaHTML(card: Card) {
  const tags = card.tags?.length ? `<p class="tags">${card.tags.map((t) => `<span>${t}</span>`).join("")}</p>` : "";
  const jumps = card.jumps?.length
    ? `<div class="jumps">${card.jumps.map((j, i) => `<button type="button" data-jump="${j.id}"><i>${String(i + 1).padStart(2, "0")}</i><b>${j.label.split("·")[0].trim()}</b><span>${j.label.split("·")[1]?.trim() ?? ""}</span></button>`).join("")}</div>`
    : "";
  return `<p class="kicker">${card.kicker}</p><h2>${card.title}</h2><div class="body">${card.body
    .split("\n\n")
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("")}</div>${card.live ? `<div class="live" data-live="${card.live}"></div>` : ""}${tags}${jumps}`;
}

const EGG_LABELS: Record<string, string> = {
  monitor: "PC · troca a tela",
  lamp: "abajur · modo noite",
  speaker: "som · lo-fi",
  vinyl: "vinil · lado B",
  mug: "café",
  banguela: "Banguela",
  photo: "foto do Banguela",
  davi: "Davi",
  mail: "me chama · e-mail",
  badge: "crachá · contato",
  plant: "planta",
  clock: "relógio",
  duck: "pato",
  trophy: "troféu",
  window: "janela",
  lights: "luzinhas",
  ball: "bola",
};

const PRACTICE_LABELS: Record<string, string> = {
  n8n: "n8n · automação",
  "skills-craft": "Skills · criar",
  agentes: "Agentes · dia a dia",
  flux: "Fluxos · pipeline",
  mcp: "MCP · tools",
  "dia-a-dia": "IA no dia a dia",
};

const shortCompany = (c: string) => c.replace("Associação Atlética Acadêmica ", "Atlética ").replace("Estágio – ", "");

/** Short name for the hover tip: what it is, and what a click does. Built from the same data as the cards. */
export function pickLabel(kind: string, id: string): string {
  if (kind === "egg") return EGG_LABELS[id] ?? id;
  if (kind === "experience") {
    const e = experiences.find((x) => x.id === id);
    return e ? `${shortCompany(e.company)} · ${e.period ?? ""}`.trim() : id;
  }
  if (kind === "project") {
    const p = projects.find((x) => x.id === id) ?? personalProjects.find((x) => x.id === id);
    return p ? p.title : id;
  }
  if (kind === "education") {
    const e = education.find((x) => x.id === id);
    return e ? `${e.id === "unifei" ? "UNIFEI" : e.id === "espm" ? "ESPM" : e.institution} · ${e.degree}` : id;
  }
  if (kind === "tcc") return "TCC · leilão da mochila";
  if (kind === "practice") return PRACTICE_LABELS[id] ?? "IA aplicada";
  if (kind === "cork" || kind === "cv") return "índice · sumário";
  if (kind === "act") return JUMPS.find((j) => j.id === id)?.label ?? id;
  if (kind === "contact") return "contato";
  if (kind === "link") return "LinkedIn";
  return id;
}
