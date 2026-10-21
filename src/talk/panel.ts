import gsap from "gsap";
import "./talk.css";
import type { SceneApi } from "../story";
import { createSceneBridge, type FreeArea } from "./bridge";
import { CATALOG, labelOf, toSceneAction } from "./catalog";
import { UI, pickLang } from "./i18n";
import { playAnswer, type Playback } from "./player";
import { OPENING, entryOf, type Lang, type QaAction, type QaEntry } from "./qa";
import { createSpeech } from "./speech";

/**
 * "Fale com o Davi": a guided panel with ready-made questions (no free text, nothing generated).
 * Side sheet on desktop, bottom sheet on phones; keyboard focus stays inside while it is open,
 * and the tour under it holds still: no wheel, scroll or keys reach it until the panel closes.
 * Loaded lazily by boot.ts on first open.
 */

export type TalkPanel = {
  open: (opener: HTMLElement | null) => void;
  close: () => void;
  isOpen: () => boolean;
};

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Next index for Tab / Shift+Tab inside a focus trap of `len` elements (current -1 = outside). */
export function trapIndex(len: number, current: number, back: boolean) {
  if (len <= 0) return -1;
  if (current < 0) return back ? len - 1 : 0;
  return back ? (current - 1 + len) % len : (current + 1) % len;
}

const phone = () => innerWidth <= 900;
const visible = (el: HTMLElement) => !el.closest("[hidden]") && el.getClientRects().length > 0;
const langAttr = (l: Lang) => (l === "pt" ? "pt-BR" : "en");

type Current = { entry: QaEntry; play: Playback; cancelActions: () => void; turn: HTMLElement };

export function createTalkPanel(api: () => SceneApi | null, stage: HTMLElement, opts: { onToggle: (open: boolean) => void }): TalkPanel {
  const bridge = createSceneBridge(api, stage);
  const speech = createSpeech();
  const mq = matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = mq.matches;
  let lang: Lang = pickLang(navigator.languages?.length ? navigator.languages : [navigator.language]);
  let voiceOn = false;
  let isOpen = false;
  let opener: HTMLElement | null = null;
  let current: Current | null = null;
  let choiceState: { kind: "home" } | { kind: "answering" } | { kind: "answered"; entry: QaEntry } = { kind: "home" };
  let subsTimer = 0;
  let stateTimer = 0;

  const root = document.createElement("div");
  root.id = "talk";
  root.className = "talk";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "talk-title");
  root.setAttribute("aria-describedby", "talk-note");
  root.innerHTML = `
    <div class="talk-sheet">
      <header class="talk-head">
        <div class="talk-top">
          <p class="talk-kicker"><i aria-hidden="true"></i><span data-t="kicker"></span></p>
          <div class="talk-tools">
            <div class="talk-lang" role="group">
              <button type="button" data-lang="pt" lang="pt-BR">PT</button><button type="button" data-lang="en" lang="en">EN</button>
            </div>
            <button type="button" class="talk-voice" aria-pressed="false" hidden><span class="talk-voice-ico" aria-hidden="true"><i></i><i></i><i></i></span><span data-t="voice"></span></button>
            <button type="button" class="talk-close"><span data-t="close"></span><kbd class="desk" aria-hidden="true">esc</kbd></button>
          </div>
        </div>
        <h2 id="talk-title"><span data-t="titleA"></span> <span class="o" data-t="titleB"></span></h2>
        <p id="talk-note" class="talk-note" data-t="note"></p>
      </header>
      <div class="talk-log">
        <p class="talk-empty" data-t="empty"></p>
      </div>
      <div class="talk-live" aria-live="polite"></div>
      <div class="talk-choices" role="group"></div>
    </div>`;

  const subs = document.createElement("div");
  subs.className = "talk-subs";
  subs.setAttribute("aria-hidden", "true");
  subs.innerHTML = `<p><b class="talk-subs-who"></b><span class="talk-subs-line"></span></p>`;
  stage.append(root, subs);

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const sheet = $(".talk-sheet");
  const log = $(".talk-log");
  const live = $(".talk-live");
  const choices = $(".talk-choices");
  const voiceBtn = $<HTMLButtonElement>(".talk-voice");
  const closeBtn = $<HTMLButtonElement>(".talk-close");
  const subsLine = subs.querySelector<HTMLElement>(".talk-subs-line")!;
  const subsWho = subs.querySelector<HTMLElement>(".talk-subs-who")!;
  voiceBtn.hidden = !speech.supported;

  // Keep the story's wheel, swipe, hover and click handlers out of the panel.
  for (const type of ["wheel", "pointerdown", "pointermove", "pointerup", "touchstart", "touchmove", "touchend", "mousedown", "click"]) {
    root.addEventListener(type, (e) => e.stopPropagation(), { passive: true });
  }

  /* ── text ─────────────────────────────── */
  const applyLang = () => {
    const T = UI[lang];
    root.lang = langAttr(lang);
    root.querySelectorAll<HTMLElement>("[data-t]").forEach((el) => {
      const v = T[el.dataset.t as keyof typeof T];
      if (typeof v === "string") el.textContent = v;
    });
    root.querySelector(".talk-lang")!.setAttribute("aria-label", T.lang);
    root.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    voiceBtn.setAttribute("aria-label", T.voiceLabel);
    closeBtn.setAttribute("aria-label", T.closeLabel);
    choices.setAttribute("aria-label", T.choices);
    subsWho.textContent = T.speaker;
  };

  const chip = (label: string, data: Record<string, string>, extra = "") => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `talk-chip ${extra}`.trim();
    b.textContent = label;
    Object.entries(data).forEach(([k, v]) => (b.dataset[k] = v));
    return b;
  };

  const renderChoices = () => {
    const T = UI[lang];
    const hadFocus = choices.contains(document.activeElement);
    const items: HTMLElement[] = [];
    if (choiceState.kind === "answering") {
      const skip = chip(`${T.skip} ⏭`, { skip: "1" }, "talk-chip--ghost");
      skip.setAttribute("aria-label", T.skipLabel);
      items.push(skip);
    } else {
      const ids = choiceState.kind === "home" ? OPENING : choiceState.entry.next;
      ids.forEach((id) => {
        const e = entryOf(id);
        if (e) items.push(chip(e.q[lang], { ask: id }));
      });
      if (choiceState.kind === "answered") items.push(chip(`↺ ${T.restart}`, { home: "1" }, "talk-chip--ghost"));
    }
    choices.replaceChildren(...items);
    if (!reduced && isOpen) gsap.from(items, { y: 10, opacity: 0, duration: 0.35, stagger: 0.05, ease: "power2.out", clearProps: "transform,opacity" });
    if (hadFocus) items[0]?.focus({ preventScroll: true });
  };

  const setChoices = (s: typeof choiceState) => {
    choiceState = s;
    root.dataset.state = s.kind;
    renderChoices();
  };

  /* ── subtitles ────────────────────────── */
  const showSub = (text: string) => {
    window.clearTimeout(subsTimer);
    subsLine.textContent = text;
    subs.classList.toggle("on", !!text && isOpen);
  };
  const hideSubLater = (ms: number) => {
    window.clearTimeout(subsTimer);
    subsTimer = window.setTimeout(() => subs.classList.remove("on"), ms);
  };
  bridge.onLayout((a: FreeArea, dossier: boolean) => {
    const p = phone();
    subs.style.left = `${a.l + (p ? 12 : 24)}px`;
    subs.style.width = `${Math.max(160, a.r - a.l - (p ? 24 : 48))}px`;
    subs.style.top = `${a.b - (p ? 10 : 18)}px`;
    subs.classList.toggle("hide", p && dossier);
  });

  /* ── turns ────────────────────────────── */
  const autoscroll = () => {
    if (log.scrollHeight - log.scrollTop - log.clientHeight < 140) log.scrollTop = log.scrollHeight;
  };

  const did = (turn: HTMLElement, kind: "go" | "focus" | "card", id: string) => {
    const T = UI[lang];
    const wrap = turn.querySelector<HTMLElement>(".talk-did")!;
    const list = kind === "go" ? CATALOG.chapters : kind === "focus" ? CATALOG.objects : CATALOG.cards;
    const label = labelOf(list, id);
    const icon = kind === "go" ? "→" : kind === "focus" ? "◎" : "▤";
    const text = kind === "card" && phone() ? `${icon} ${T.openCard}: ${label}` : `${icon} ${label}`;
    const b = chip(text, { did: kind, id }, `talk-did-chip${kind === "card" && phone() ? " is-cta" : ""}`);
    b.setAttribute("aria-label", kind === "go" ? T.go(label) : kind === "focus" ? T.focus(label) : T.card(label));
    wrap.append(b);
    wrap.hidden = false;
  };

  const runActions = (entry: QaEntry, play: Playback, turn: HTMLElement) => {
    let cancelled = false;
    const queue: QaAction[] = [...entry.actions].sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
    const reach = (at: number) =>
      new Promise<void>((resolve) => {
        const tick = () => (cancelled || play.progress() >= at ? resolve() : window.setTimeout(tick, 50));
        tick();
      });
    void (async () => {
      for (const step of queue) {
        await reach(step.at ?? 0);
        const a = toSceneAction(step);
        if (cancelled) return;
        if (!a) continue;
        if (a.name === "go_to_chapter") {
          did(turn, "go", a.id);
          if (reduced) bridge.hintChapter(a.id);
          else await bridge.goToChapter(a.id);
        } else if (a.name === "focus_object") {
          if (bridge.focusObject(a.id)) did(turn, "focus", a.id);
        } else if (a.name === "avatar_emote") {
          bridge.emote(a.kind);
        } else if (a.name === "open_dossier") {
          did(turn, "card", a.id);
          if (!phone()) bridge.openCard(a.id);
        }
        if (cancelled) return;
      }
    })();
    return () => {
      cancelled = true;
    };
  };

  /** Ends the answer in progress at once: full text in the transcript, its follow-ups as the next chips. */
  const stopCurrent = () => {
    if (!current) return;
    const { entry } = current;
    current.cancelActions();
    current.play.cancel();
    current.turn.classList.remove("is-typing");
    current = null;
    bridge.setTalking(false);
    if (choiceState.kind === "answering") setChoices({ kind: "answered", entry });
  };

  const ask = (id: string) => {
    const entry = entryOf(id);
    if (!entry) return;
    stopCurrent();
    const T = UI[lang];
    const L = lang;
    const answer = entry.a[L];
    root.querySelector(".talk-empty")?.remove();

    const turn = document.createElement("div");
    turn.className = "talk-turn is-typing";
    turn.dataset.id = entry.id;
    turn.innerHTML = `
      <p class="talk-q" lang="${langAttr(L)}"><span class="sr-only"></span></p>
      <div class="talk-a" lang="${langAttr(L)}">
        <p class="talk-who" aria-hidden="true"></p>
        <p class="talk-text" aria-hidden="true"><span class="talk-typed"></span><i class="talk-caret"></i></p>
        <p class="sr-only talk-full"></p>
        <div class="talk-did" hidden></div>
      </div>`;
    turn.querySelector(".talk-q .sr-only")!.textContent = `${T.you}: `;
    turn.querySelector(".talk-q")!.append(entry.q[L]);
    turn.querySelector(".talk-who")!.textContent = T.speaker;
    turn.querySelector(".talk-full")!.textContent = answer;
    log.append(turn);
    log.scrollTop = log.scrollHeight;
    if (!reduced) gsap.from(turn.querySelector(".talk-q"), { y: 12, opacity: 0, duration: 0.35, ease: "power2.out", clearProps: "transform,opacity" });

    // Re-set the live region so a repeated answer is announced again.
    live.textContent = "";
    window.setTimeout(() => (live.textContent = `${T.speaker}: ${answer}`), 30);
    const typed = turn.querySelector<HTMLElement>(".talk-typed")!;
    setChoices({ kind: "answering" });
    const play = playAnswer(answer, { reduced, speech: voiceOn ? speech : null, lang: L }, {
      reveal: (n) => {
        typed.textContent = answer.slice(0, n);
        autoscroll();
      },
      cue: (_i, shown) => showSub(shown),
      energy: (e) => bridge.pulse(e),
      talking: (on) => bridge.setTalking(on),
    });
    const cancelActions = runActions(entry, play, turn);
    current = { entry, play, cancelActions, turn };
    void play.done.then(() => {
      if (current?.play !== play) return;
      turn.classList.remove("is-typing");
      setChoices({ kind: "answered", entry });
      autoscroll();
    });
    void play.ended.then(() => {
      if (current?.play === play) bridge.setTalking(false);
      hideSubLater(reduced ? 1200 : 2600);
    });
  };

  /* ── clicks ───────────────────────────── */
  root.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (!b || !root.contains(b)) return;
    if (b.dataset.ask) return ask(b.dataset.ask);
    if (b.dataset.home) return setChoices({ kind: "home" });
    if (b.dataset.skip) return current?.play.skip();
    if (b.dataset.lang) {
      lang = b.dataset.lang as Lang;
      applyLang();
      return renderChoices();
    }
    if (b.dataset.did && b.dataset.id) {
      const id = b.dataset.id;
      if (b.dataset.did === "go") void bridge.goToChapter(id);
      else if (b.dataset.did === "focus") bridge.focusObject(id);
      else bridge.openCard(id);
      return;
    }
    if (b === voiceBtn) {
      voiceOn = !voiceOn;
      voiceBtn.setAttribute("aria-pressed", String(voiceOn));
      if (!voiceOn) {
        speech.cancel();
        current?.play.skip();
      }
      return;
    }
    if (b === closeBtn) close();
  });

  /* ── keyboard: Esc, focus trap, and no tour keys while open ── */
  const dossierSheet = () => stage.querySelector<HTMLElement>("#dossier-sheet");
  const focusables = () => {
    const list = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const ds = dossierSheet();
    if (bridge.cardOpen() && ds) list.push(...ds.querySelectorAll<HTMLElement>(FOCUSABLE));
    return list.filter(visible);
  };
  const focusInside = () => (choices.querySelector<HTMLElement>("button") ?? closeBtn).focus({ preventScroll: true });

  // Esc closes the panel first; a card it opened stays, and the next Esc is the tour's own.
  const onKey = (e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (e.key === "Tab") {
      const list = focusables();
      e.preventDefault();
      e.stopPropagation();
      const i = trapIndex(list.length, list.indexOf(document.activeElement as HTMLElement), e.shiftKey);
      list[i]?.focus();
      return;
    }
    e.stopPropagation();
  };

  // The wheel moves the transcript or a card, never the tour behind the panel.
  const onWheel = (e: WheelEvent) => {
    if (!isOpen) return;
    const t = e.target as HTMLElement | null;
    if (root.contains(t) || t?.closest?.("#dossier")) return;
    e.preventDefault();
    e.stopPropagation();
  };

  /* ── live state for tests and assistive tech ── */
  const syncState = () => {
    const s = bridge.snapshot();
    root.dataset.chapter = s.chapter ?? "";
    root.dataset.focus = s.focus ?? "";
    root.dataset.avatar = s.avatar;
    root.dataset.answer = current?.entry.id ?? "";
  };

  const onMotion = () => {
    reduced = mq.matches;
    bridge.setReduced(reduced);
  };
  mq.addEventListener?.("change", onMotion);

  const open = (from: HTMLElement | null) => {
    if (isOpen) return;
    isOpen = true;
    opener = from ?? (document.activeElement as HTMLElement | null);
    root.hidden = false;
    document.body.classList.add("talk-open");
    bridge.setReduced(reduced);
    bridge.setStage(sheet);
    applyLang();
    renderChoices();
    root.dataset.state = choiceState.kind;
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    window.clearInterval(stateTimer);
    stateTimer = window.setInterval(syncState, 150);
    syncState();
    opts.onToggle(true);
    gsap.killTweensOf(sheet);
    gsap.set(sheet, { clearProps: "transform,opacity" });
    if (!reduced) {
      gsap.fromTo(sheet, phone() ? { yPercent: 100 } : { x: -32, opacity: 0 }, { yPercent: 0, x: 0, opacity: 1, duration: 0.5, ease: "power3.out", clearProps: "transform,opacity" });
    }
    focusInside();
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    stopCurrent();
    speech.cancel();
    subs.classList.remove("on");
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("wheel", onWheel, { capture: true });
    window.clearInterval(stateTimer);
    bridge.setStage(null);
    document.body.classList.remove("talk-open");
    const done = () => {
      if (isOpen) return;
      root.hidden = true;
      syncState();
    };
    gsap.killTweensOf(sheet);
    if (reduced) done();
    else gsap.to(sheet, { ...(phone() ? { yPercent: 100 } : { x: -24, opacity: 0 }), duration: 0.28, ease: "power2.in", onComplete: () => (gsap.set(sheet, { clearProps: "transform,opacity" }), done()) });
    opts.onToggle(false);
    const back = opener && document.contains(opener) ? opener : stage.querySelector<HTMLElement>(".talk-fab");
    back?.focus({ preventScroll: true });
  };

  applyLang();
  setChoices({ kind: "home" });

  return { open, close, isOpen: () => isOpen };
}
