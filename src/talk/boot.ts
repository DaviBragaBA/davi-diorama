import "./boot.css";
import type { SceneApi } from "../story";
import type { TalkPanel } from "./panel";

/**
 * Entry point for "Fale com o Davi": one button (in the HUD bar on desktop, top right on phones) and the T key.
 * This chunk is tiny; the panel (questions, answers, avatar layer) loads on first open.
 */

const LABEL = "Fale com o Davi";

let stageEl: HTMLElement | null = null;
let sceneApi: (() => SceneApi | null) | null = null;
let panel: TalkPanel | null = null;
let loading: Promise<TalkPanel> | null = null;
let fab: HTMLButtonElement | null = null;

/** The tour has begun ("entrar"): the HUD is live and the entry points may show. */
const started = () => !!stageEl?.classList.contains("started");

const setExpanded = (open: boolean) => {
  fab?.setAttribute("aria-expanded", String(open));
};

const loadPanel = () => {
  loading ??= import("./panel").then((m) => (panel = m.createTalkPanel(sceneApi!, stageEl!, { onToggle: setExpanded })));
  return loading;
};

const openPanel = async (opener: HTMLElement | null) => {
  if (!started()) return;
  (await loadPanel()).open(opener);
};

const editable = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el?.closest?.("input, textarea, select, [contenteditable='true']");
};

function entryButton(className: string, html: string) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = className;
  b.innerHTML = html;
  b.setAttribute("aria-haspopup", "dialog");
  b.setAttribute("aria-expanded", "false");
  b.setAttribute("aria-keyshortcuts", "T");
  // Space and Enter belong to the button, not to the tour's keyboard navigation (arrows still walk).
  b.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") e.stopPropagation();
  });
  b.addEventListener("pointerdown", (e) => e.stopPropagation());
  b.addEventListener("pointerenter", () => void loadPanel(), { once: true });
  b.addEventListener("focus", () => void loadPanel(), { once: true });
  b.addEventListener("click", () => void openPanel(b));
  return b;
}

function mount(stage: HTMLElement) {
  fab = entryButton(
    "talk-fab",
    `<span class="talk-fab-wave" aria-hidden="true"><i></i><i></i><i></i></span><span class="talk-fab-label">${LABEL}</span><kbd class="desk" aria-hidden="true">T</kbd>`
  );

  // one entry point: inside the bar's right group on desktop, floating top right on phones
  const desk = matchMedia("(min-width: 901px)");
  const dock = () => (desk.matches ? stage.querySelector("#bar .tools")?.prepend(fab!) : stage.append(fab!));
  desk.addEventListener("change", dock);
  dock();

  window.addEventListener("keydown", (e) => {
    if (e.key !== "t" && e.key !== "T") return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || editable(e.target)) return;
    if (!started() || panel?.isOpen()) return;
    e.preventDefault();
    void openPanel(fab);
  });

  const reveal = () => document.body.classList.toggle("talk-ready", started());
  new MutationObserver(reveal).observe(stage, { attributes: true, attributeFilter: ["class"] });
  reveal();
}

/** Called once by main.ts after the story is up, with story.ts sceneApi. */
export function bootTalk(stage: HTMLElement, api: () => SceneApi | null) {
  if (stageEl) return;
  stageEl = stage;
  sceneApi = api;
  mount(stage);
}
