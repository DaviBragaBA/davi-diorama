import type { Lang } from "./qa";

/** Interface text of the panel. Nothing here is generated: the answers are ready-made (qa.ts). */
export const UI = {
  pt: {
    titleA: "Fale com o",
    titleB: "Davi",
    kicker: "perguntas",
    note: "Respostas prontas, escritas a partir do currículo do Davi.",
    close: "fechar",
    closeLabel: "Fechar o painel",
    voice: "voz",
    voiceLabel: "Ler as respostas em voz alta",
    lang: "Idioma",
    choices: "Perguntas",
    empty: "Escolha uma pergunta abaixo.",
    skip: "pular",
    skipLabel: "Mostrar a resposta inteira",
    restart: "voltar ao início",
    speaker: "Davi",
    you: "Você",
    go: (label: string) => `Ir para ${label}`,
    focus: (label: string) => `Destacar ${label}`,
    card: (label: string) => `Abrir o cartão: ${label}`,
    openCard: "abrir o cartão",
  },
  en: {
    titleA: "Talk to",
    titleB: "Davi",
    kicker: "questions",
    note: "Ready-made answers based on Davi's résumé.",
    close: "close",
    closeLabel: "Close the panel",
    voice: "voice",
    voiceLabel: "Read the answers aloud",
    lang: "Language",
    choices: "Questions",
    empty: "Pick a question below.",
    skip: "skip",
    skipLabel: "Show the whole answer",
    restart: "back to start",
    speaker: "Davi",
    you: "You",
    go: (label: string) => `Go to ${label}`,
    focus: (label: string) => `Highlight ${label}`,
    card: (label: string) => `Open the card: ${label}`,
    openCard: "open the card",
  },
} as const;

/** First Portuguese or English language in the visitor's preferences; Portuguese otherwise. */
export function pickLang(languages: readonly string[]): Lang {
  for (const l of languages) {
    const k = l.toLowerCase();
    if (k.startsWith("pt")) return "pt";
    if (k.startsWith("en")) return "en";
  }
  return "pt";
}
