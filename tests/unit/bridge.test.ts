import { beforeAll, describe, expect, it } from "vitest";
import type { SceneApi } from "../../src/story";
import { createSceneBridge } from "../../src/talk/bridge";

/** A stand-in for story.ts sceneApi(): records calls; the chapter flips a moment after goToChapter. */
function fakeApi() {
  const calls: string[] = [];
  let cur = "desk";
  const api: SceneApi = {
    chapters: ["desk", "war", "flash", "studio", "lab", "balcony"],
    current: () => cur,
    goToChapter: (id) => {
      calls.push(`go:${id}`);
      setTimeout(() => (cur = id), 120);
      return true;
    },
    focusObject: (id, opts) => {
      calls.push(`focus:${id}:${opts?.panel ? "panel" : "full"}`);
      return true;
    },
    openCard: (kind, id) => {
      calls.push(`card:${kind}:${id}`);
      return true;
    },
    puppet: () => null,
  };
  return { api, calls };
}

const stage = { querySelector: () => null, querySelectorAll: () => [], classList: { contains: () => false } } as unknown as HTMLElement;

beforeAll(() => {
  const g = globalThis as Record<string, unknown>;
  g.window ??= globalThis;
  g.document ??= { activeElement: null };
  g.requestAnimationFrame ??= (fn: () => void) => setTimeout(fn, 16);
  g.CSS ??= { escape: (s: string) => s };
});

describe("SceneBridge over sceneApi()", () => {
  it("travels through the tour and resolves only after the chapter has changed", async () => {
    const { api, calls } = fakeApi();
    const bridge = createSceneBridge(() => api, stage);
    bridge.setReduced(true);
    const t0 = Date.now();
    await expect(bridge.goToChapter("war")).resolves.toBe(true);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(100);
    expect(api.current()).toBe("war");
    await expect(bridge.goToChapter("war")).resolves.toBe(true);
    expect(calls).toEqual(["go:war"]);
  });

  it("maps card ids to copy.ts kinds and asks the tour to frame focus around the panel", () => {
    const { api, calls } = fakeApi();
    const bridge = createSceneBridge(() => api, stage);
    expect(bridge.openCard("experience:nubank")).toBe(true);
    expect(bridge.focusObject("nubank")).toBe(true);
    expect(bridge.snapshot().focus).toBe("nubank");
    bridge.setStage({ getBoundingClientRect: () => ({ left: 0, right: 430, top: 80, bottom: 740, width: 430, height: 660 }), contains: () => false } as unknown as HTMLElement);
    expect(bridge.focusObject("tcc")).toBe(true);
    bridge.setStage(null);
    expect(calls).toEqual(["card:experience:nubank", "focus:nubank:full", "focus:tcc:panel"]);
  });

  it("never passes an id outside the whitelist to the scene", async () => {
    const { api, calls } = fakeApi();
    const bridge = createSceneBridge(() => api, stage);
    await expect(bridge.goToChapter("kitchen")).resolves.toBe(false);
    expect(bridge.focusObject("system_prompt")).toBe(false);
    expect(bridge.openCard("experience:nope")).toBe(false);
    expect(bridge.openCard("nubank")).toBe(false);
    expect(calls).toEqual([]);
  });

  it("degrades quietly without the 3D (no sceneApi yet, no puppet)", async () => {
    const bridge = createSceneBridge(() => null, stage);
    await expect(bridge.goToChapter("war")).resolves.toBe(false);
    expect(bridge.focusObject("nubank")).toBe(false);
    expect(bridge.openCard("contact:card")).toBe(false);
    bridge.setTalking(true);
    expect(bridge.snapshot()).toEqual({ chapter: null, focus: null, avatar: "talking" });
  });
});
