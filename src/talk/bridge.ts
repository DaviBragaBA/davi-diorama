import type * as THREE from "three";
import type { SceneApi } from "../story";
import { CARD_IDS, CHAPTER_IDS, OBJECT_IDS, cardTarget, type Emote } from "./catalog";
import { createAvatarRig, type AvatarRig } from "./rig";

/**
 * The only door between "Fale com o Davi" and the 3D story. Travel, focus and cards go through
 * story.ts sceneApi() (the same surface the tour uses); the avatar layer reads sceneApi().puppet().
 * Without WebGL the puppet is null: the panel still travels the tour and opens the cards.
 */

export type FreeArea = { l: number; r: number; t: number; b: number };

export interface SceneBridge {
  /** Tour glide to a chapter; resolves once the chapter has changed (or it gave up). */
  goToChapter(id: string): Promise<boolean>;
  /** Reduced motion: no travel, the chapter is only highlighted in the section rail. */
  hintChapter(id: string): void;
  focusObject(id: string): boolean;
  openCard(cardId: string): boolean;
  cardOpen(): boolean;
  emote(kind: Emote): void;
  setTalking(on: boolean): void;
  pulse(energy: number): void;
  /** The panel is open: Davi faces the viewer, and the free part of the screen is measured. */
  setStage(panel: HTMLElement | null): void;
  setReduced(on: boolean): void;
  onLayout(fn: (area: FreeArea, card: boolean) => void): void;
  snapshot(): { chapter: string | null; focus: string | null; avatar: string };
}

const wait = (cond: () => boolean, ms: number) =>
  new Promise<boolean>((resolve) => {
    const t0 = performance.now();
    const tick = () => {
      if (cond()) return resolve(true);
      if (performance.now() - t0 > ms) return resolve(false);
      window.setTimeout(tick, 60);
    };
    tick();
  });
const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

const phone = () => innerWidth <= 900;

export function createSceneBridge(api: () => SceneApi | null, stage: HTMLElement): SceneBridge {
  let rig: AvatarRig | null = null;
  let rigScene: THREE.Scene | null = null;
  let prevHook: THREE.Object3D["onBeforeRender"] | null = null;
  let panel: HTMLElement | null = null;
  let reduced = false;
  let talking = false;
  let lastFocus: string | null = null;
  let layoutFn: ((area: FreeArea, card: boolean) => void) | null = null;
  let lastLayout = "";
  let layoutRaf = 0;
  let last = performance.now();

  const card = () => !!stage.querySelector("#dossier.open");

  /** Davi's talk layer runs inside the frame, right after the tour has posed him. */
  const ensureRig = () => {
    if (rig) return rig;
    const p = api()?.puppet();
    if (!p) return null;
    rig = createAvatarRig(p.davi, p.chair, p.camera);
    rig.setReduced(reduced);
    return rig;
  };
  const hook = () => {
    const r = ensureRig();
    const p = api()?.puppet();
    if (!r || !p || rigScene) return;
    rigScene = p.scene;
    prevHook = p.scene.onBeforeRender;
    const prev = prevHook;
    p.scene.onBeforeRender = function (...args: Parameters<THREE.Object3D["onBeforeRender"]>) {
      prev.apply(this, args);
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      r.apply(dt, now / 1000);
      if (!panel && !r.active()) unhook();
    };
  };
  const unhook = () => {
    if (!rigScene || !prevHook) return;
    rigScene.onBeforeRender = prevHook;
    rigScene = null;
  };

  const measure = (): FreeArea => {
    const p = phone();
    const a: FreeArea = { l: 0, r: innerWidth, t: 0, b: innerHeight };
    const pr = panel?.getBoundingClientRect();
    if (pr && pr.width > 0) {
      if (p) a.b = Math.min(a.b, pr.top);
      else a.l = Math.max(a.l, pr.right);
    }
    const sheet = card() ? stage.querySelector("#dossier-sheet")?.getBoundingClientRect() : null;
    if (sheet && sheet.width > 0) {
      if (p) a.b = Math.min(a.b, sheet.top);
      else a.r = Math.min(a.r, sheet.left);
    } else if (!p) {
      const rail = stage.querySelector("#rail")?.getBoundingClientRect();
      if (rail && rail.width > 0) a.r = Math.min(a.r, rail.left - 12);
    }
    const bar = stage.querySelector("#bar")?.getBoundingClientRect();
    if (!p && bar && bar.height > 0) a.b = Math.min(a.b, bar.top);
    // the tour's "voltar" button sits at the bottom while an object is in focus: subtitles go above it
    const back = stage.classList.contains("focus") ? stage.querySelector("#unfocus")?.getBoundingClientRect() : null;
    if (back && back.height > 0 && back.top < a.b) a.b = Math.min(a.b, back.top - 6);
    const brand = stage.querySelector("#brand")?.getBoundingClientRect();
    if (p && brand) a.t = brand.bottom;
    return a;
  };
  let frames = 0;
  const layoutLoop = () => {
    layoutRaf = 0;
    if (!panel) return;
    if (frames++ % 6 === 0 && layoutFn) {
      const a = measure();
      const key = `${Math.round(a.l)},${Math.round(a.r)},${Math.round(a.t)},${Math.round(a.b)},${card()}`;
      if (key !== lastLayout) layoutFn(a, card());
      lastLayout = key;
    }
    layoutRaf = requestAnimationFrame(layoutLoop);
  };

  return {
    async goToChapter(id) {
      const a = api();
      if (!a || !CHAPTER_IDS.has(id)) return false;
      if (a.current() === id) return true;
      if (!a.goToChapter(id)) return false;
      // The tour turns the page half-way through the glide; cards and focus must come after that.
      const ok = await wait(() => api()?.current() === id, 7000);
      if (ok && !reduced) await sleep(450);
      return ok;
    },
    hintChapter(id) {
      if (!CHAPTER_IDS.has(id)) return;
      const btn = stage.querySelector<HTMLElement>(`#rail [data-rail="${CSS.escape(id)}"]`);
      if (!btn) return;
      stage.querySelectorAll(".talk-hint").forEach((b) => b.classList.remove("talk-hint"));
      btn.classList.add("talk-hint");
      window.setTimeout(() => btn.classList.remove("talk-hint"), 6000);
    },
    focusObject(id) {
      if (!OBJECT_IDS.has(id)) return false;
      const ok = api()?.focusObject(id, { panel: !!panel }) ?? false;
      if (ok) lastFocus = id;
      return ok;
    },
    openCard(cardId) {
      const t = CARD_IDS.has(cardId) ? cardTarget(cardId) : null;
      const a = api();
      if (!t || !a) return false;
      const had = document.activeElement as HTMLElement | null;
      const ok = a.openCard(t.kind, t.id);
      // the card takes focus on its next frame; a keyboard user reading the answer keeps their place
      if (ok && had && panel?.contains(had)) requestAnimationFrame(() => requestAnimationFrame(() => had.isConnected && had.focus({ preventScroll: true })));
      return ok;
    },
    cardOpen: card,
    emote(kind) {
      hook();
      rig?.emote(kind);
    },
    setTalking(on) {
      talking = on;
      if (on) hook();
      rig?.setTalking(on);
    },
    pulse: (e) => rig?.pulse(e),
    setStage(el) {
      panel = el;
      if (el) hook();
      rig?.setFacing(!!el);
      if (!el) lastFocus = null;
      lastLayout = "";
      if (el && !layoutRaf) layoutRaf = requestAnimationFrame(layoutLoop);
    },
    setReduced(on) {
      reduced = on;
      rig?.setReduced(on);
    },
    onLayout(fn) {
      layoutFn = fn;
      lastLayout = "";
    },
    snapshot: () => ({ chapter: api()?.current() ?? null, focus: lastFocus, avatar: rig?.state() ?? (talking ? "talking" : "idle") }),
  };
}
