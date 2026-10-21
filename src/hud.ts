import { animate, animateValue, hover, press, spring, stagger } from "./anim";
import { fichaHTML, SLIDES, type Card, type Slide } from "./copy";
import { personal } from "./data";
import { mountLive } from "./live";

export type Hud = {
  show: (slide: Slide, dir: number) => void;
  open: (card: Card) => void;
  close: () => void;
  toast: (msg: string) => void;
  copyMail: () => void;
  isOpen: () => boolean;
  onJump: (fn: (id: string) => void) => void;
  onChip: (fn: (kind: string, id: string) => void) => void;
  onClose: (fn: () => void) => void;
  setSound: (on: boolean) => void;
  setFocus: (on: boolean) => void;
  setProgress: (p: number) => void;
  tip: (label: string | null, x?: number, y?: number) => void;
  dismissIntro: () => Promise<void>;
};

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EASE_IN: [number, number, number, number] = [0.7, 0, 0.84, 0];
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const isPhone = () => matchMedia("(max-width: 900px)").matches;

/** Words keep their spacing; letters ride inside a mask so they can rise from below the baseline. */
function splitChars(el: HTMLElement) {
  const text = el.textContent!.trim();
  el.innerHTML = text
    .split(/\s+/)
    .map((w) => `<span class="w" aria-hidden="true">${[...w].map((ch) => `<span class="c">${ch}</span>`).join("")}</span>`)
    .join(" ");
  return [...el.querySelectorAll<HTMLElement>(".c")];
}

/**
 * Shrinks a title until it fits: whole lines on desktop (they may run a little past the column,
 * never into the room on the right), the longest word on phones ("CONVERSAR" at 390 px).
 */
function fitTitle(h: HTMLElement) {
  h.style.fontSize = "";
  const col = h.clientWidth;
  if (!col) return;
  const lines = [...h.querySelectorAll<HTMLElement>(".l1, .l2")];
  const nowrap = lines[0] && getComputedStyle(lines[0]).whiteSpace === "nowrap";
  const avail = nowrap ? Math.max(col, Math.min(innerWidth * 0.5, col * 1.3)) : col;
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;font:inherit;letter-spacing:inherit;text-transform:inherit";
  h.appendChild(probe);
  let widest = 0;
  const parts = nowrap ? lines.map((l) => l.textContent ?? "") : (h.textContent ?? "").split(/\s+/);
  for (const w of parts) {
    probe.textContent = w;
    widest = Math.max(widest, probe.getBoundingClientRect().width);
  }
  probe.remove();
  if (widest > avail) h.style.fontSize = `${(parseFloat(getComputedStyle(h).fontSize) * avail * 0.97) / widest}px`;
}

/** Spring press + gentle lift on hover for every button the HUD creates. */
export function microButtons(root: ParentNode, selector: string) {
  const els = [...root.querySelectorAll<HTMLElement>(selector)].filter((el) => !el.dataset.micro);
  els.forEach((el) => (el.dataset.micro = "1"));
  if (!els.length || reduced()) return;
  press(els, (el) => {
    animate(el, { scale: 0.94 }, { type: spring, stiffness: 600, damping: 30 });
    return () => void animate(el, { scale: 1 }, { type: spring, stiffness: 420, damping: 16 });
  });
}

/** Magnetic pull towards the cursor, for the few big buttons. */
export function magnetic(el: HTMLElement, pull = 0.28) {
  if (reduced() || matchMedia("(pointer: coarse)").matches) return;
  hover(el, (target) => {
    const move = (e: PointerEvent) => {
      const r = (target as HTMLElement).getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      animate(target, { translate: `${(dx * pull).toFixed(1)}px ${(dy * pull).toFixed(1)}px` }, { type: spring, stiffness: 260, damping: 18, mass: 0.6 });
    };
    target.addEventListener("pointermove", move as EventListener);
    return () => {
      target.removeEventListener("pointermove", move as EventListener);
      animate(target, { translate: "0px 0px" }, { type: spring, stiffness: 260, damping: 14 });
    };
  });
}

export function bindHud(root: HTMLElement): Hud {
  const slideEl = root.querySelector<HTMLElement>("#slide")!;
  const dossier = root.querySelector<HTMLElement>("#dossier")!;
  const sheet = root.querySelector<HTMLElement>("#dossier-sheet")!;
  const body = root.querySelector<HTMLElement>("#dossier-body")!;
  const closeBtn = root.querySelector<HTMLButtonElement>("#dossier-close")!;
  const toastEl = root.querySelector<HTMLElement>("#toast")!;
  const rail = root.querySelector<HTMLElement>("#rail")!;
  const counter = root.querySelector<HTMLElement>("#counter")!;
  const soundBtn = root.querySelector<HTMLButtonElement>("#sound")!;
  const intro = root.querySelector<HTMLElement>("#intro")!;
  const progress = root.querySelector<HTMLElement>("#progress i");
  const tipEl = root.querySelector<HTMLElement>("#tip")!;
  let jump = (_id: string) => {};
  let chip = (_kind: string, _id: string) => {};
  const closeFns: (() => void)[] = [];
  let unlive: (() => void) | null = null;
  let opener: HTMLElement | null = null;
  let closing = false;

  rail.innerHTML =
    `<b class="rail-ind" aria-hidden="true"></b>` +
    SLIDES.map((s) => `<button type="button" data-rail="${s.id}" aria-label="${s.num} · ${s.title.join(" ")}"><i>${s.num}</i><span>${s.title.join(" ")}</span></button>`).join("");
  const railInd = rail.querySelector<HTMLElement>(".rail-ind")!;
  rail.querySelectorAll<HTMLButtonElement>("[data-rail]").forEach((b) => b.addEventListener("click", () => jump(b.dataset.rail!)));
  microButtons(rail, "[data-rail]");
  microButtons(root, "#open-index, #sound, #unfocus");
  const openIdx = root.querySelector<HTMLElement>("#open-index");
  if (openIdx) magnetic(openIdx, 0.22);
  magnetic(soundBtn, 0.3);

  const moveRail = (id: string) => {
    const on = rail.querySelector<HTMLElement>(`[data-rail="${id}"]`);
    if (!on) return;
    const phone = isPhone();
    const x = phone ? on.offsetLeft + on.offsetWidth / 2 - 3 : on.offsetLeft + on.offsetWidth + 8;
    const y = phone ? on.offsetTop - 7 : on.offsetTop + on.offsetHeight / 2 - 3;
    animate(railInd, { translate: `${x}px ${y}px`, opacity: 1 }, reduced() ? { duration: 0.01 } : { type: spring, stiffness: 380, damping: 30 });
  };

  let lastNum = "";
  const total = SLIDES[SLIDES.length - 1].num;
  const roll = counter.querySelector<HTMLElement>(".roll")!;
  const setCounter = (num: string, dir: number) => {
    if (num === lastNum) return;
    lastNum = num;
    counter.setAttribute("aria-label", `${num} de ${total}`);
    const olds = [...roll.querySelectorAll<HTMLElement>("b:not(.old)")];
    const nb = document.createElement("b");
    nb.textContent = num;
    if (reduced() || !olds.length) {
      roll.replaceChildren(nb);
      return;
    }
    olds.forEach((o) => {
      o.classList.add("old");
      animate(o, { transform: ["translateY(0%)", `translateY(${-100 * dir}%)`], opacity: [1, 0] }, { duration: 0.35, ease: EASE_IN }).then(() => o.remove());
    });
    roll.appendChild(nb);
    animate(nb, { transform: [`translateY(${100 * dir}%)`, "translateY(0%)"], opacity: [0, 1] }, { duration: 0.5, ease: EASE_OUT, delay: 0.06 });
  };

  const show = (s: Slide, dir: number) => {
    const rm = reduced();
    rail.querySelectorAll<HTMLButtonElement>("[data-rail]").forEach((b) => {
      const on = b.dataset.rail === s.id;
      b.classList.toggle("on", on);
      if (on) b.setAttribute("aria-current", "step");
      else b.removeAttribute("aria-current");
    });
    moveRail(s.id);
    setCounter(s.num, dir || 1);

    slideEl.querySelectorAll<HTMLElement>(".sl:not(.out)").forEach((old) => {
      old.classList.add("out");
      old.setAttribute("aria-hidden", "true");
      animate(old, rm ? { opacity: 0 } : { opacity: 0, transform: `translateY(${-22 * (dir || 1)}px)` }, { duration: rm ? 0.15 : 0.3, ease: EASE_IN }).then(() => old.remove());
    });

    const art = document.createElement("article");
    art.className = "sl";
    art.innerHTML = `
      <p class="kicker"><i>${s.num}</i>${s.kicker}</p>
      <h2 class="title"><span class="l1">${s.title[0]}</span><span class="l2">${s.title[1]}</span></h2>
      <p class="lead">${s.lead}</p>
      <div class="metrics">${s.metrics
        .map((m, i) => `<div class="m"><b data-i="${i}" aria-hidden="true">${m.prefix ?? ""}${(0).toFixed(m.decimals ?? 0)}${m.suffix ?? ""}</b><span class="vh">${m.prefix ?? ""}${m.value.toFixed(m.decimals ?? 0)}${m.suffix ?? ""} </span><span>${m.label}</span><i aria-hidden="true"></i></div>`)
        .join("")}</div>
      <div class="chips">${s.chips.map((c) => `<button type="button" data-kind="${c.kind}" data-id="${c.id}"><b>${c.label}</b>${c.meta ? `<span>${c.meta}</span>` : ""}</button>`).join("")}</div>
      ${s.more ? `<button type="button" class="more" data-kind="${s.more.kind}" data-id="${s.more.id}">${s.more.label} <i>→</i></button>` : ""}
    `;
    slideEl.appendChild(art);
    art.querySelectorAll<HTMLButtonElement>("[data-kind]").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        chip(b.dataset.kind!, b.dataset.id!);
      })
    );
    microButtons(art, ".chips button, .more");

    const h2 = art.querySelector<HTMLElement>(".title")!;
    h2.setAttribute("aria-label", s.title.join(" "));
    fitTitle(h2);
    const l1 = splitChars(art.querySelector<HTMLElement>(".l1")!);
    splitChars(art.querySelector<HTMLElement>(".l2")!);
    const l2 = art.querySelector<HTMLElement>(".l2")!;
    const kicker = art.querySelector<HTMLElement>(".kicker")!;
    const lead = art.querySelector<HTMLElement>(".lead")!;
    const ms = [...art.querySelectorAll<HTMLElement>(".m")];
    const bars = [...art.querySelectorAll<HTMLElement>(".m i")];
    const chips = [...art.querySelectorAll<HTMLElement>(".chips button, .more")];

    const fmt = (i: number, n: number) => {
      const m = s.metrics[i];
      return `${m.prefix ?? ""}${n.toFixed(m.decimals ?? 0)}${m.suffix ?? ""}`;
    };
    const nums = [...art.querySelectorAll<HTMLElement>(".m b")];

    if (rm) {
      nums.forEach((b, i) => (b.textContent = fmt(i, s.metrics[i].value)));
      animate(art, { opacity: [0, 1] }, { duration: 0.35 });
      bars.forEach((b) => (b.style.scale = "1 1"));
      return;
    }

    animate(kicker, { opacity: [0, 1], transform: ["translateX(-14px)", "translateX(0px)"] }, { duration: 0.6, ease: EASE_OUT, delay: 0.05 });
    animate(l1, { transform: ["translateY(108%) rotate(7deg)", "translateY(0%) rotate(0deg)"] }, { delay: stagger(0.028, { startDelay: 0.1 }), type: spring, stiffness: 210, damping: 22, mass: 0.9 });
    // the wipe ends past the right edge, so a line wider than its column is never clipped
    animate(l2, { clipPath: ["inset(-0.15em 100% -0.15em -0.1em)", "inset(-0.15em -0.3em -0.15em -0.1em)"], opacity: [0.4, 1] }, { duration: 0.95, ease: [0.65, 0, 0.25, 1], delay: 0.32 });
    animate(lead, { opacity: [0, 1], transform: ["translateY(16px)", "translateY(0px)"] }, { duration: 0.7, ease: EASE_OUT, delay: 0.42 });
    animate(ms, { opacity: [0, 1], transform: ["translateY(14px)", "translateY(0px)"] }, { duration: 0.6, ease: EASE_OUT, delay: stagger(0.09, { startDelay: 0.52 }) });
    animate(bars, { scale: ["0 1", "1 1"] }, { duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: stagger(0.09, { startDelay: 0.6 }) });
    nums.forEach((b, i) => {
      const m = s.metrics[i];
      // counters: a Motion value tween from zero to the number already in the slide copy
      animateValue({ keyframes: [0, m.value], duration: 1350, delay: 580 + i * 100, ease: EASE_OUT, onUpdate: (n: number) => (b.textContent = fmt(i, n)) });
    });
    animate(chips, { opacity: [0, 1], transform: ["translateY(12px) scale(0.94)", "translateY(0px) scale(1)"] }, { delay: stagger(0.045, { startDelay: 0.66 }), type: spring, stiffness: 320, damping: 24 });
  };

  const trap = (e: KeyboardEvent) => {
    if (e.key !== "Tab" || !dossier.classList.contains("open")) return;
    const f = [...sheet.querySelectorAll<HTMLElement>("button, a[href], input, [tabindex]:not([tabindex='-1'])")].filter((x) => !x.hasAttribute("disabled") && x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  document.addEventListener("keydown", trap);

  let openedAt = 0;
  const open = (card: Card) => {
    unlive?.();
    closing = false;
    openedAt = performance.now();
    if (!dossier.classList.contains("open")) opener = document.activeElement as HTMLElement | null;
    body.innerHTML = fichaHTML(card);
    unlive = mountLive(body);
    dossier.classList.add("open");
    sheet.setAttribute("aria-label", card.title);
    const mob = isPhone();
    const rm = reduced();
    animate(dossier, { opacity: [0, 1] }, { duration: rm ? 0.1 : 0.3 });
    animate(sheet, rm ? { opacity: [0, 1] } : mob ? { transform: ["translateY(100%)", "translateY(0%)"], opacity: [1, 1] } : { transform: ["translateX(56px)", "translateX(0px)"], opacity: [0, 1] }, rm ? { duration: 0.15 } : { type: spring, stiffness: 260, damping: 30 });
    if (!rm) animate([...body.children] as HTMLElement[], { opacity: [0, 1], transform: ["translateY(16px)", "translateY(0px)"] }, { duration: 0.55, ease: EASE_OUT, delay: stagger(0.05, { startDelay: 0.12 }) });
    body.querySelectorAll<HTMLButtonElement>("[data-jump]").forEach((b) => {
      b.addEventListener("click", () => {
        close();
        jump(b.dataset.jump!);
      });
    });
    microButtons(sheet, "#dossier-close, .jumps button, .live-go, .pk");
    requestAnimationFrame(() => closeBtn.focus({ preventScroll: true }));
  };

  const close = () => {
    if (!dossier.classList.contains("open") || closing) return;
    closing = true;
    unlive?.();
    unlive = null;
    const mob = isPhone();
    const rm = reduced();
    closeFns.forEach((f) => f());
    animate(dossier, { opacity: 0 }, { duration: rm ? 0.1 : 0.28, delay: rm ? 0 : 0.05 });
    animate(sheet, rm ? { opacity: 0 } : mob ? { transform: "translateY(100%)" } : { transform: "translateX(40px)", opacity: 0 }, { duration: rm ? 0.1 : 0.28, ease: EASE_IN }).then(() => {
      if (!closing) return;
      closing = false;
      dossier.classList.remove("open");
      sheet.style.transform = "";
      sheet.style.opacity = "";
      dossier.style.opacity = "";
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
      opener = null;
    });
  };

  let tHide = 0;
  const toast = (msg: string) => {
    toastEl.textContent = msg;
    toastEl.classList.add("on");
    window.clearTimeout(tHide);
    tHide = window.setTimeout(() => toastEl.classList.remove("on"), 2200);
  };

  // only say "copiado" when the clipboard really took it; otherwise show the address to copy by hand
  const copyMail = () => {
    const shown = () => toast("e-mail · " + personal.email);
    if (!navigator.clipboard?.writeText) return shown();
    navigator.clipboard.writeText(personal.email).then(() => toast("e-mail copiado · " + personal.email), shown);
  };

  closeBtn.addEventListener("click", close);
  dossier.addEventListener("click", (e) => {
    if (e.target === dossier && performance.now() - openedAt > 400) close();
  });

  const dismissIntro = () =>
    new Promise<void>((res) => {
      if (intro.classList.contains("gone")) return res();
      intro.classList.add("gone");
      const rm = reduced();
      const words = [...intro.querySelectorAll<HTMLElement>(".w > span")];
      if (!rm) animate(words, { transform: ["translateY(0%)", "translateY(-110%)"] }, { duration: 0.5, ease: EASE_IN, delay: stagger(0.025) });
      animate(intro, { opacity: 0 }, { duration: rm ? 0.3 : 0.7, delay: rm ? 0 : 0.3, ease: [0.4, 0, 0.2, 1] }).then(() => {
        intro.style.display = "none";
        res();
      });
    });

  let tipOn = false;
  const tip = (label: string | null, x = 0, y = 0) => {
    if (!label) {
      if (tipOn) {
        tipOn = false;
        animate(tipEl, { opacity: 0, scale: 0.9 }, { duration: 0.15 });
      }
      return;
    }
    if (tipEl.textContent !== label) tipEl.textContent = label;
    tipEl.style.left = `${x}px`;
    tipEl.style.top = `${y}px`;
    if (!tipOn) {
      tipOn = true;
      animate(tipEl, { opacity: [0, 1], scale: [0.9, 1] }, reduced() ? { duration: 0.1 } : { type: spring, stiffness: 500, damping: 28 });
    }
  };

  let lastP = -1;
  return {
    show,
    open,
    close,
    toast,
    copyMail,
    isOpen: () => dossier.classList.contains("open") && !closing,
    onJump: (fn) => {
      jump = fn;
    },
    onChip: (fn) => {
      chip = fn;
    },
    onClose: (fn) => closeFns.push(fn),
    setSound: (on) => {
      soundBtn.classList.toggle("on", on);
      soundBtn.setAttribute("aria-pressed", String(on));
    },
    setFocus: (on) => root.classList.toggle("focus", on),
    setProgress: (p) => {
      if (!progress || Math.abs(p - lastP) < 0.0005) return;
      lastP = p;
      progress.style.transform = `scaleX(${p.toFixed(4)})`;
    },
    tip,
    dismissIntro,
  };
}
