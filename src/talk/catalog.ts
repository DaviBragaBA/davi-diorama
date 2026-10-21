/**
 * Scene catalog for "Fale com o Davi (IA)": the only ids the AI may use in scene actions.
 * Built from what the site already has (chapters, pickable objects, dossier cards), so the
 * server whitelist (generated into api/_lib/knowledge.generated.ts) and the browser agree.
 * Pure data: no DOM, no Three.js, safe to import from Node scripts.
 */
import { JUMPS } from "../copy";
import { education, experiences, personalProjects, projects, skillCategories } from "../data";

export type CatalogEntry = { id: string; label: string; chapter?: string | null };
export type Catalog = { chapters: CatalogEntry[]; objects: CatalogEntry[]; cards: CatalogEntry[]; emotes: string[] };

export const EMOTES = ["wave", "nod", "think", "point"] as const;
export type Emote = (typeof EMOTES)[number];

/** The six rooms, in the order of the site (01 → 06). */
const chapters: CatalogEntry[] = JUMPS.map((j, i) => ({ id: j.id, label: `${String(i + 1).padStart(2, "0")} ${j.label}` }));

/** Pickable objects of the 3D scene, keyed by their pick id (src/world.ts, src/story.ts, src/boards.ts). */
const objects: CatalogEntry[] = [
  { id: "davi", label: "o avatar do Davi", chapter: null },
  { id: "monitor", label: "PC da mesa, com telas de trabalho", chapter: "desk" },
  { id: "cv", label: "quadro-índice do currículo na parede", chapter: "desk" },
  { id: "lamp", label: "abajur (modo noite)", chapter: "desk" },
  { id: "speaker", label: "caixa de som (lo-fi)", chapter: "desk" },
  { id: "vinyl", label: "toca-discos", chapter: "desk" },
  { id: "mug", label: "caneca de café", chapter: "desk" },
  { id: "duck", label: "pato de borracha", chapter: "desk" },
  { id: "trophy", label: "troféu de aluno destaque", chapter: "desk" },
  { id: "photo", label: "foto do Banguela na parede", chapter: "desk" },
  { id: "banguela", label: "Banguela, o cachorro", chapter: "desk" },
  { id: "clock", label: "relógio", chapter: "desk" },
  { id: "window", label: "janelas", chapter: null },
  { id: "plant", label: "plantas", chapter: null },
  { id: experiences[0].id, label: `painel "Limit policy" e pôster do ${experiences[0].company}`, chapter: "war" },
  ...projects.slice(0, 4).map((p) => ({ id: p.id, label: `placa do projeto "${p.title}"`, chapter: "war" })),
  ...experiences.slice(1, 7).map((e) => ({ id: e.id, label: `placa ${e.company}${e.id === "flash" ? " (painel e notebook)" : ""}`, chapter: "flash" })),
  ...education
    .filter((e) => e.id === "unifei" || e.id === "espm")
    .map((e) => ({ id: e.id, label: `quadro e diploma ${e.id.toUpperCase()}`, chapter: "studio" })),
  { id: "tcc", label: "mochila do TCC (leilão da mochila)", chapter: "studio" },
  { id: "dia-a-dia", label: "painel de IA no dia a dia (n8n, skills, agentes)", chapter: "lab" },
  { id: "n8n", label: "placa n8n", chapter: "lab" },
  { id: "skills-craft", label: "placa Skills", chapter: "lab" },
  { id: "agentes", label: "placa Agentes", chapter: "lab" },
  { id: "flux", label: "placa Fluxos", chapter: "lab" },
  { id: "mcp", label: "placa MCP", chapter: "lab" },
  { id: "mail", label: 'mural "me chama" (contato)', chapter: "balcony" },
  { id: "badge", label: "crachá do Davi", chapter: "balcony" },
  { id: "ball", label: "bola", chapter: "balcony" },
  { id: "lights", label: "luzinhas da varanda", chapter: "balcony" },
];

/** Dossier cards that src/copy.ts inspectCard(kind, id) can build, as "kind:id". */
const cards: CatalogEntry[] = [
  ...experiences.map((e) => ({ id: `experience:${e.id}`, label: e.company, chapter: e.id === experiences[0].id ? "war" : "flash" })),
  ...projects.map((p) => ({ id: `project:${p.id}`, label: p.title, chapter: "war" })),
  ...personalProjects.map((p) => ({ id: `project:${p.id}`, label: p.title, chapter: null })),
  ...education.map((e) => ({ id: `education:${e.id}`, label: e.degree, chapter: e.id === "pos-ia" ? "lab" : "studio" })),
  { id: "tcc:tcc", label: "TCC · Uma Introdução ao Leilão da Mochila", chapter: "studio" },
  { id: "lab:pos-ia", label: "Pós em Engenharia de Software em IA", chapter: "lab" },
  { id: "practice:dia-a-dia", label: "como eu uso IA no dia a dia", chapter: "lab" },
  { id: "practice:n8n", label: "n8n · automação", chapter: "lab" },
  { id: "practice:skills-craft", label: "Skills · criar o jeito de trabalhar", chapter: "lab" },
  { id: "practice:agentes", label: "Agentes no trabalho", chapter: "lab" },
  { id: "practice:flux", label: "Fluxos · pipeline", chapter: "lab" },
  { id: "practice:mcp", label: "MCP · Model Context Protocol", chapter: "lab" },
  ...skillCategories.map((c) => ({ id: `skills:${c.id}`, label: `competências · ${c.name}`, chapter: null })),
  { id: "skills:all", label: "todas as competências", chapter: null },
  { id: "about:about", label: "sobre o Davi", chapter: "desk" },
  { id: "cv:cv", label: "sumário do currículo", chapter: "desk" },
  { id: "contact:card", label: "contato (e-mail e LinkedIn)", chapter: "balcony" },
];

export const CATALOG: Catalog = { chapters, objects, cards, emotes: [...EMOTES] };

export const CHAPTER_IDS = new Set(chapters.map((c) => c.id));
export const OBJECT_IDS = new Set(objects.map((o) => o.id));
export const CARD_IDS = new Set(cards.map((c) => c.id));
const EMOTE_IDS = new Set<string>(EMOTES);

export type SceneAction =
  | { name: "go_to_chapter"; id: string }
  | { name: "focus_object"; id: string }
  | { name: "open_dossier"; id: string }
  | { name: "avatar_emote"; kind: Emote };

/**
 * Browser-side whitelist: the server already drops unknown ids, and the client checks again.
 * Anything that is not exactly one of the catalog ids is ignored.
 */
export function toSceneAction(raw: unknown): SceneAction | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const { name, id, kind } = raw as { name?: unknown; id?: unknown; kind?: unknown };
  if (name === "avatar_emote") return typeof kind === "string" && EMOTE_IDS.has(kind) ? { name, kind: kind as Emote } : null;
  if (typeof id !== "string") return null;
  if (name === "go_to_chapter" && CHAPTER_IDS.has(id)) return { name, id };
  if (name === "focus_object" && OBJECT_IDS.has(id)) return { name, id };
  if (name === "open_dossier" && CARD_IDS.has(id)) return { name, id };
  return null;
}

export function labelOf(list: CatalogEntry[], id: string) {
  return list.find((e) => e.id === id)?.label ?? id;
}

/** "experience:nubank" → { kind: "experience", id: "nubank" } for copy.ts inspectCard. */
export function cardTarget(cardId: string) {
  const i = cardId.indexOf(":");
  return i < 0 ? null : { kind: cardId.slice(0, i), id: cardId.slice(i + 1) };
}
