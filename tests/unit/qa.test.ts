import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CATALOG, toSceneAction } from "../../src/talk/catalog";
import { OPENING, QA, entryOf } from "../../src/talk/qa";

const dataDir = new URL("../../src/data/", import.meta.url);
const dataText = readdirSync(dataDir)
  .map((f) => readFileSync(new URL(f, dataDir), "utf8"))
  .join("\n");
const words = (s: string) => s.trim().split(/\s+/).length;
const langs = ["pt", "en"] as const;

describe("ready-made questions (src/talk/qa.ts)", () => {
  it("has 10 to 14 entries with unique ids", () => {
    expect(QA.length).toBeGreaterThanOrEqual(10);
    expect(QA.length).toBeLessThanOrEqual(14);
    expect(new Set(QA.map((e) => e.id)).size).toBe(QA.length);
  });

  it("opens with 3 or 4 questions that exist", () => {
    expect(OPENING.length).toBeGreaterThanOrEqual(3);
    expect(OPENING.length).toBeLessThanOrEqual(4);
    for (const id of OPENING) expect(entryOf(id), id).not.toBeNull();
  });

  it("has Portuguese and English for every question and answer", () => {
    for (const e of QA) {
      for (const l of langs) {
        expect(e.q[l]?.trim(), `${e.id}.q.${l}`).toBeTruthy();
        expect(e.a[l]?.trim(), `${e.id}.a.${l}`).toBeTruthy();
      }
      expect(e.q.pt).not.toBe(e.q.en);
      expect(e.a.pt).not.toBe(e.a.en);
      expect(e.q.pt.endsWith("?") && e.q.en.endsWith("?"), e.id).toBe(true);
    }
  });

  it("keeps every answer within 80 words", () => {
    for (const e of QA) for (const l of langs) expect(words(e.a[l]), `${e.id}.${l}`).toBeLessThanOrEqual(80);
  });

  it("offers 2 or 3 follow-ups that exist", () => {
    for (const e of QA) {
      expect(e.next.length, e.id).toBeGreaterThanOrEqual(2);
      expect(e.next.length, e.id).toBeLessThanOrEqual(3);
      expect(new Set(e.next).size, e.id).toBe(e.next.length);
      for (const id of e.next) {
        expect(id, e.id).not.toBe(e.id);
        expect(entryOf(id), `${e.id} → ${id}`).not.toBeNull();
      }
    }
  });

  it("reaches every question from the opening chips", () => {
    const seen = new Set<string>(OPENING);
    const queue = [...OPENING];
    while (queue.length) {
      const e = entryOf(queue.shift()!)!;
      for (const id of e.next) if (!seen.has(id)) seen.add(id) && queue.push(id);
    }
    expect([...seen].sort()).toEqual(QA.map((e) => e.id).sort());
  });

  it("runs only whitelisted scene actions", () => {
    for (const e of QA) {
      expect(e.actions.length, e.id).toBeGreaterThan(0);
      for (const a of e.actions) {
        expect(toSceneAction(a), `${e.id}: ${JSON.stringify(a)}`).not.toBeNull();
        expect(a.at ?? 0).toBeGreaterThanOrEqual(0);
        expect(a.at ?? 0).toBeLessThanOrEqual(1);
      }
      expect(e.actions.filter((a) => a.name === "go_to_chapter").length, e.id).toBeLessThanOrEqual(1);
      expect(e.actions.filter((a) => a.name === "open_dossier").length, e.id).toBeLessThanOrEqual(1);
    }
  });

  it("lights up objects that stand in the chapter the camera goes to", () => {
    for (const e of QA) {
      const go = e.actions.find((a) => a.name === "go_to_chapter");
      if (!go || go.name !== "go_to_chapter") continue;
      for (const a of e.actions) {
        if (a.name !== "focus_object") continue;
        const where = CATALOG.objects.find((o) => o.id === a.id)?.chapter ?? null;
        expect(where === null || where === go.id, `${e.id}: ${a.id} is in ${where}, camera goes to ${go.id}`).toBe(true);
      }
    }
  });

  it("uses only numbers that already exist in src/data", () => {
    for (const e of QA)
      for (const l of langs)
        for (const n of e.a[l].match(/\d+/g) ?? []) expect(dataText.includes(n), `${e.id}.${l}: ${n}`).toBe(true);
  });

  it("never labels anything as AI-generated and never repeats contact data", () => {
    for (const e of QA)
      for (const l of langs) {
        const text = `${e.q[l]} ${e.a[l]}`;
        expect(text).not.toMatch(/\((IA|AI)\)/);
        expect(text).not.toMatch(/@|https?:|www\.|hotmail|gmail/i);
      }
  });
});
