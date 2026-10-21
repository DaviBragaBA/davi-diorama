import { animate } from "motion/mini";
import { stagger } from "motion";

export type Loader = {
  /** Report a stage: progress 0..1 when the stage ends, and a short label. */
  stage: (to: number, label: string) => void;
  done: () => Promise<void>;
  fail: (msg: string) => void;
  whenReady: Promise<void>;
  isReady: () => boolean;
  /** True when the visitor already asked to enter while the room was still loading. */
  wanted: () => boolean;
};

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function splitWords(el: HTMLElement) {
  const words = el.textContent!.trim().split(/\s+/);
  el.replaceChildren();
  words.forEach((w, i) => {
    if (i) el.append(" ");
    const outer = document.createElement("span");
    outer.className = "w";
    const inner = document.createElement("span");
    inner.textContent = w;
    outer.append(inner);
    el.append(outer);
  });
  return [...el.querySelectorAll<HTMLElement>(".w > span")];
}

/**
 * The intro doubles as the loading screen. The bar follows real stages (engine download,
 * room build, shader compile, first frame) and creeps forward while a stage is pending,
 * so it never sits still and never lies about being done.
 */
export function bootLoader(intro: HTMLElement): Loader {
  const bar = intro.querySelector<HTMLElement>(".load i")!;
  const pct = intro.querySelector<HTMLElement>(".load-n")!;
  const label = intro.querySelector<HTMLElement>(".load-t")!;
  const box = intro.querySelector<HTMLElement>(".load")!;
  const cta = intro.querySelector<HTMLButtonElement>(".cta")!;
  cta.setAttribute("aria-busy", "true");
  let shown = 0;
  let floor = 0;
  let ceil = 0.08;
  let ready = false;
  let raf = 0;
  let resolveReady!: () => void;
  const whenReady = new Promise<void>((r) => (resolveReady = r));

  // "entrar" answers at once, even before the 3D engine has arrived: the wish is kept and the
  // button pulses until the room is ready, then the tour starts by itself
  let wanted = false;
  const want = () => {
    if (ready || wanted) return;
    wanted = true;
    intro.classList.add("waiting");
    label.textContent = "já vai";
  };
  cta.addEventListener("click", want);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") want();
  };
  window.addEventListener("keydown", onKey);

  const words = [...intro.querySelectorAll<HTMLElement>("h1 span, .sub")].flatMap((el) => splitWords(el));
  if (!reduced()) {
    animate(words, { transform: ["translateY(110%)", "translateY(0%)"] }, { delay: stagger(0.04, { startDelay: 0.15 }), duration: 0.9, ease: [0.16, 1, 0.3, 1] });
    animate(box, { opacity: [0, 1], transform: ["translateY(8px)", "translateY(0px)"] }, { duration: 0.6, delay: 0.7 });
  } else {
    box.style.opacity = "1";
  }

  const paint = () => {
    const n = Math.round(shown * 100);
    bar.style.transform = `scaleX(${shown.toFixed(4)})`;
    pct.textContent = String(n).padStart(2, "0");
    box.setAttribute("aria-valuenow", String(n));
  };
  const tick = () => {
    raf = requestAnimationFrame(tick);
    // creep towards the ceiling of the pending stage, fast at first, then patient
    floor += (ceil - floor) * 0.012;
    shown += (Math.max(floor, shown) - shown) * 0.18;
    paint();
  };
  tick();

  return {
    whenReady,
    isReady: () => ready,
    wanted: () => wanted,
    stage: (to, text) => {
      floor = Math.max(floor, ceil);
      ceil = Math.max(ceil, Math.min(0.99, to));
      label.textContent = text;
    },
    fail: (msg) => {
      cancelAnimationFrame(raf);
      label.textContent = msg;
      box.classList.add("err");
    },
    done: async () => {
      cancelAnimationFrame(raf);
      label.textContent = "pronto";
      const from = shown;
      const dur = reduced() ? 100 : 450;
      const t0 = performance.now();
      await new Promise<void>((res) => {
        const step = () => {
          const k = Math.min(1, (performance.now() - t0) / dur);
          shown = from + (1 - from) * (1 - Math.pow(1 - k, 3));
          paint();
          if (k < 1) requestAnimationFrame(step);
          else res();
        };
        step();
      });
      ready = true;
      window.removeEventListener("keydown", onKey);
      intro.classList.add("ready");
      cta.removeAttribute("aria-busy");
      if (!reduced()) {
        animate(box, { opacity: 0, transform: "translateY(-6px)" }, { duration: 0.35 });
        animate(cta, { transform: ["scale(0.92)", "scale(1)"], opacity: [0.6, 1] }, { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] });
      } else {
        box.style.opacity = "0";
      }
      resolveReady();
    },
  };
}
