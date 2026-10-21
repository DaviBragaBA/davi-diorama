import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inspectCard, SLIDES } from "../../src/copy";
import { education, experiences, projects } from "../../src/data";
import { CARD_IDS, CATALOG, CHAPTER_IDS, OBJECT_IDS, cardTarget, toSceneAction } from "../../src/talk/catalog";

const src = (f: string) => readFileSync(new URL(`../../src/${f}`, import.meta.url), "utf8");

/** Every pick id the scene tags, read from the source the way world.ts and story.ts write them. */
function scenePickIds() {
  const code = ["world.ts", "story.ts", "boards.ts"].map(src).join("\n");
  const ids = new Set<string>();
  for (const m of code.matchAll(/tag\(\s*[\w.]+,\s*"\w+",\s*"([\w-]+)"\s*\)/g)) ids.add(m[1]);
  for (const m of code.matchAll(/userData\.pick = \{ kind: "\w+", id: "([\w-]+)" \}/g)) ids.add(m[1]);
  for (const m of code.matchAll(/k: "practice", id: "([\w-]+)"/g)) ids.add(m[1]);
  // Ids that world.ts takes from the data files.
  projects.slice(0, 4).forEach((p) => ids.add(p.id));
  experiences.slice(1, 7).forEach((e) => ids.add(e.id));
  for (const m of code.matchAll(/education\.find\(\(x\) => x\.id === "([\w-]+)"\)/g)) ids.add(education.find((e) => e.id === m[1])!.id);
  return ids;
}

describe("scene whitelist (src/talk/catalog.ts)", () => {
  it("lists the six chapters of the story, in order", () => {
    expect(CATALOG.chapters.map((c) => c.id)).toEqual(SLIDES.map((s) => s.id));
  });

  it("lists exactly the pickable ids of the 3D scene", () => {
    expect([...OBJECT_IDS].sort()).toEqual([...scenePickIds()].sort());
  });

  it("only lists dossier cards that copy.ts can build", () => {
    for (const id of CARD_IDS) {
      const t = cardTarget(id);
      expect(t, id).not.toBeNull();
      expect(inspectCard(t!.kind, t!.id), id).not.toBeNull();
    }
  });

  it("accepts whitelisted actions", () => {
    expect(toSceneAction({ name: "go_to_chapter", id: "war" })).toEqual({ name: "go_to_chapter", id: "war" });
    expect(toSceneAction({ name: "focus_object", id: "monitor" })).toEqual({ name: "focus_object", id: "monitor" });
    expect(toSceneAction({ name: "open_dossier", id: "contact:card" })).toEqual({ name: "open_dossier", id: "contact:card" });
    expect(toSceneAction({ name: "avatar_emote", kind: "wave" })).toEqual({ name: "avatar_emote", kind: "wave" });
  });

  it("ignores unknown names, unknown ids and malformed input", () => {
    const bad: unknown[] = [
      null,
      undefined,
      "go_to_chapter",
      [],
      { name: "go_to_chapter", id: "kitchen" },
      { name: "go_to_chapter", id: "WAR" },
      { name: "go_to_chapter", id: ["war"] },
      { name: "go_to_chapter" },
      { name: "focus_object", id: "../../etc/passwd" },
      { name: "focus_object", id: "toString" },
      { name: "open_dossier", id: "experience:nope" },
      { name: "open_dossier", id: "nubank" },
      { name: "avatar_emote", kind: "dance" },
      { name: "avatar_emote", id: "wave" },
      { name: "delete_site", id: "war" },
      { name: "__proto__", id: "war" },
      JSON.parse('{"__proto__": {"name": "go_to_chapter", "id": "war"}}'),
    ];
    for (const b of bad) expect(toSceneAction(b), JSON.stringify(b)).toBeNull();
    expect(CHAPTER_IDS.has("toString")).toBe(false);
  });
});
