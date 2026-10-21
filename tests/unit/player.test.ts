import { describe, expect, it } from "vitest";
import { pickLang } from "../../src/talk/i18n";
import { trapIndex } from "../../src/talk/panel";
import { charCost, splitCues } from "../../src/talk/player";
import { QA } from "../../src/talk/qa";
import { pickVoice } from "../../src/talk/speech";

describe("subtitle cues", () => {
  it("cover every answer without gaps and stay short", () => {
    for (const e of QA)
      for (const text of [e.a.pt, e.a.en]) {
        const cues = splitCues(text);
        expect(cues[0].start).toBe(0);
        expect(cues.at(-1)!.end).toBe(text.length);
        cues.forEach((c, i) => {
          if (i) expect(c.start).toBe(cues[i - 1].end);
          expect(c.end - c.start).toBeLessThanOrEqual(112);
          expect(text.slice(c.start, c.end).trim().length).toBeGreaterThan(0);
        });
      }
  });

  it("splits at sentence ends but not after abbreviations like vs.", () => {
    const text = "Analiso teste vs. controle. Depois calculo métricas! E pronto?";
    const lines = splitCues(text).map((c) => text.slice(c.start, c.end).trim());
    expect(lines).toEqual(["Analiso teste vs. controle.", "Depois calculo métricas!", "E pronto?"]);
  });

  it("breaks long sentences at commas or semicolons", () => {
    const text = "Primeiro item longo o bastante para ocupar espaço, segundo item também longo o bastante; terceiro item que fecha a frase sem pressa nenhuma.";
    const cues = splitCues(text, 60);
    expect(cues.length).toBeGreaterThan(1);
    expect(text.slice(cues[0].start, cues[0].end).trim()).toMatch(/[,;]$/);
  });

  it("pauses the typing after punctuation", () => {
    const text = "Oi, tudo bem. Sim";
    expect(charCost(text, 0, 50)).toBeCloseTo(0.02);
    expect(charCost(text, 2, 50)).toBeGreaterThan(charCost(text, 0, 50));
    expect(charCost(text, 12, 50)).toBeGreaterThan(charCost(text, 2, 50));
  });
});

describe("language and voice", () => {
  it("follows the visitor's first Portuguese or English preference", () => {
    expect(pickLang(["pt-BR", "en-US"])).toBe("pt");
    expect(pickLang(["en-US", "pt-BR"])).toBe("en");
    expect(pickLang(["fr-FR", "en-GB"])).toBe("en");
    expect(pickLang(["de-DE"])).toBe("pt");
    expect(pickLang([])).toBe("pt");
  });

  it("picks a voice for the answer's language", () => {
    const voices = [
      { lang: "en-US", name: "Samantha", localService: true },
      { lang: "pt-PT", name: "Joana", localService: true },
      { lang: "pt-BR", name: "Luciana", localService: false },
      { lang: "pt_BR", name: "Felipe", localService: true },
    ];
    expect(pickVoice(voices, "pt")?.name).toBe("Felipe");
    expect(pickVoice(voices, "en")?.name).toBe("Samantha");
    expect(pickVoice([{ lang: "fr-FR", name: "Amélie", localService: true }], "pt")).toBeNull();
  });
});

describe("focus trap order", () => {
  it("wraps forward and backward", () => {
    expect(trapIndex(4, 3, false)).toBe(0);
    expect(trapIndex(4, 0, true)).toBe(3);
    expect(trapIndex(4, 1, false)).toBe(2);
    expect(trapIndex(4, -1, false)).toBe(0);
    expect(trapIndex(4, -1, true)).toBe(3);
    expect(trapIndex(0, -1, false)).toBe(-1);
  });
});
