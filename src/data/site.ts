/**
 * Dados iterativos do site: atualize lastUpdated e adicione itens em updates
 * quando fizer mudanças. Opcional: preencha agora para uma linha "Agora: …" na home.
 */

export const lastUpdated = "fev 2025";

/** Uma linha curta do que você está fazendo agora (opcional). Deixe vazio para não exibir. */
export const agora = "";

/** Itens da tela de abertura (splash). category aparece no hover. */
export type SplashHighlight = { text: string; category: string };

export const splashHighlights: SplashHighlight[] = [
  { text: "Business Analyst", category: "Profissão" },
  { text: "UNIFEI · ESPM · UNIPDS", category: "Formações" },
  { text: "Sistemas de Informação", category: "Formação" },
  { text: "Inteligência de Dados em Negócios", category: "Formação" },
  { text: "Engenharia de Software em IA", category: "Formação" },
  { text: "Negócios", category: "Área" },
  { text: "IA", category: "Área" },
  { text: "Software", category: "Área" },
  { text: "SQL · Databricks", category: "Ferramentas" },
  { text: "Critical Thinker", category: "Perfil" },
  { text: "Ownership", category: "Perfil" },
];

export type SiteUpdate = {
  date: string;
  title: string;
  summary: string;
};

/** Changelog: adicione novos itens no topo. Últimas entradas aparecem na home. */
export const updates: SiteUpdate[] = [
  {
    date: "fev 2025",
    title: "Site no ar",
    summary: "Portfólio com formação, experiência, projetos, TCC e competências.",
  },
];

const HOW_MANY_UPDATES_ON_HOME = 3;

export function getRecentUpdates(count = HOW_MANY_UPDATES_ON_HOME): SiteUpdate[] {
  return updates.slice(0, count);
}
