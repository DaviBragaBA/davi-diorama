import gsap from "gsap";
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
  setSound: (on: boolean) => void;
  dismissIntro: () => Promise<void>;
};

function splitWords(el: HTMLElement) {
  const words = el.textContent!.trim().split(/\s+/);
  el.innerHTML = words.map((w) => `<span class="w"><span>${w}</span></span>`).join(" ");
  return [...el.querySelectorAll<HTMLElement>(".w > span")];
}

export function bindHud(root: HTMLElement): Hud {
  const slideEl = root.querySelector<HTMLElement>("#slide")!;
  const dossier = root.querySelector<HTMLElement>("#dossier")!;
  const sheet = root.querySelector<HTMLElement>("#dossier-sheet")!;
  const body = root.querySelector<HTMLElement>("#dossier-body")!;
  const toastEl = root.querySelector<HTMLElement>("#toast")!;
  const rail = root.querySelector<HTMLElement>("#rail")!;
  const counter = root.querySelector<HTMLElement>("#counter")!;
  const soundBtn = root.querySelector<HTMLButtonElement>("#sound")!;
  const intro = root.querySelector<HTMLElement>("#intro")!;
  let jump = (_id: string) => {};
  let chip = (_kind: string, _id: string) => {};
  let unlive: (() => void) | null = null;

  rail.innerHTML = SLIDES.map((s) => `<button type="button" data-rail="${s.id}"><i>${s.num}</i><span>${s.title.join(" ")}</span></button>`).join("");
  rail.querySelectorAll<HTMLButtonElement>("[data-rail]").forEach((b) => b.addEventListener("click", () => jump(b.dataset.rail!)));

  const show = (s: Slide, dir: number) => {
    rail.querySelectorAll<HTMLButtonElement>("[data-rail]").forEach((b) => b.classList.toggle("on", b.dataset.rail === s.id));
    counter.innerHTML = `<b>${s.num}</b><span>/ ${SLIDES[SLIDES.length - 1].num}</span>`;
    const old = slideEl.firstElementChild as HTMLElement | null;
    if (old) {
      gsap.to(old, { y: -18 * dir, opacity: 0, duration: 0.32, ease: "power2.in", onComplete: () => old.remove() });
    }
    const art = document.createElement("article");
    art.className = "sl";
    art.innerHTML = `
      <p class="kicker"><i>${s.num}</i>${s.kicker}</p>
      <h1><span class="l1">${s.title[0]}</span><span class="l2">${s.title[1]}</span></h1>
      <p class="lead">${s.lead}</p>
      <div class="metrics">${s.metrics
        .map((m) => `<div class="m"><b data-v="${m.value}" data-d="${m.decimals ?? 0}">${m.prefix ?? ""}0${m.suffix ?? ""}</b><span>${m.label}</span></div>`)
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
    const l1 = splitWords(art.querySelector(".l1")!);
    const l2 = splitWords(art.querySelector(".l2")!);
    const lead = art.querySelector(".lead")!;
    const ms = [...art.querySelectorAll<HTMLElement>(".m")];
    const chips = [...art.querySelectorAll<HTMLElement>(".chips button, .more")];
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(art.querySelector(".kicker"), { y: 14, opacity: 0, duration: 0.5 }, 0.05);
    tl.from([...l1, ...l2], { yPercent: 110, duration: 0.8, stagger: 0.06, ease: "power4.out" }, 0.1);
    tl.from(lead, { y: 18, opacity: 0, duration: 0.6 }, 0.35);
    tl.from(ms, { y: 16, opacity: 0, duration: 0.5, stagger: 0.07 }, 0.45);
    tl.from(chips, { y: 12, opacity: 0, duration: 0.45, stagger: 0.05 }, 0.6);
    ms.forEach((m) => {
      const b = m.querySelector("b")!;
      const v = Number(b.dataset.v);
      const d = Number(b.dataset.d);
      const met = s.metrics.find((x) => x.value === v)!;
      const o = { n: 0 };
      gsap.to(o, {
        n: v,
        duration: 1.2,
        delay: 0.5,
        ease: "power2.out",
        onUpdate: () => {
          b.textContent = `${met.prefix ?? ""}${o.n.toFixed(d)}${met.suffix ?? ""}`;
        },
      });
    });
  };

  const open = (card: Card) => {
    unlive?.();
    body.innerHTML = fichaHTML(card);
    unlive = mountLive(body);
    dossier.classList.add("open");
    const mob = matchMedia("(max-width: 900px)").matches;
    gsap.fromTo(sheet, mob ? { y: 72, x: 0, opacity: 1 } : { x: 40, y: 0, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.45, ease: "power3.out" });
    gsap.from(body.children, { y: 14, opacity: 0, duration: 0.45, stagger: 0.05, ease: "power2.out", delay: 0.1 });
    body.querySelectorAll<HTMLButtonElement>("[data-jump]").forEach((b) => {
      b.addEventListener("click", () => {
        close();
        jump(b.dataset.jump!);
      });
    });
  };
  const close = () => {
    if (!dossier.classList.contains("open")) return;
    unlive?.();
    unlive = null;
    const mob = matchMedia("(max-width: 900px)").matches;
    gsap.to(sheet, {
      x: mob ? 0 : 30,
      y: mob ? 48 : 0,
      opacity: mob ? 1 : 0,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => {
        dossier.classList.remove("open");
        gsap.set(sheet, { x: 0, y: 0, opacity: 1 });
      },
    });
  };

  let tHide = 0;
  const toast = (msg: string) => {
    toastEl.textContent = msg;
    toastEl.classList.add("on");
    window.clearTimeout(tHide);
    tHide = window.setTimeout(() => toastEl.classList.remove("on"), 2200);
  };

  const copyMail = () => {
    navigator.clipboard?.writeText(personal.email).catch(() => {});
    toast("e-mail copiado · " + personal.email);
  };

  root.querySelector("#dossier-close")?.addEventListener("click", close);
  dossier.addEventListener("click", (e) => {
    if (e.target === dossier) close();
  });

  const dismissIntro = () =>
    new Promise<void>((res) => {
      if (intro.classList.contains("gone")) return res();
      intro.classList.add("gone");
      gsap.to(intro.querySelectorAll(".w > span"), { yPercent: -110, duration: 0.5, stagger: 0.03, ease: "power3.in" });
      gsap.to(intro, { opacity: 0, duration: 0.6, delay: 0.35, ease: "power2.inOut", onComplete: () => {
        intro.style.display = "none";
        res();
      } });
    });
  const introWords = [...intro.querySelectorAll<HTMLElement>("h1 span, .sub")].flatMap((el) => splitWords(el));
  gsap.from(introWords, { yPercent: 110, duration: 0.9, stagger: 0.04, ease: "power4.out", delay: 0.2 });
  gsap.from(intro.querySelector(".cta"), { opacity: 0, y: 10, duration: 0.6, delay: 1.1 });

  return {
    show,
    open,
    close,
    toast,
    copyMail,
    isOpen: () => dossier.classList.contains("open"),
    onJump: (fn) => {
      jump = fn;
    },
    onChip: (fn) => {
      chip = fn;
    },
    setSound: (on) => soundBtn.classList.toggle("on", on),
    dismissIntro,
  };
}
