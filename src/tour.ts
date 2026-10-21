import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

export type Pose = { p: THREE.Vector3; t: THREE.Vector3 };
type Raw = { p: [number, number, number]; t: [number, number, number] };
type Shot = { desk: Raw; phone: Raw };

const v = (a: [number, number, number]) => new THREE.Vector3(...a);

/**
 * One camera shot per chapter, each anchored on the object that tells that part of the story:
 * the monitor with the experiment dashboard, the Core Limit board, the career wall, the diplomas,
 * the n8n board and the contact mural. Desktop frames leave the left column for the text;
 * phone frames leave the bottom half for the card.
 */
export const SHOTS: Record<string, Shot> = {
  desk: {
    desk: { p: [-1.2, 3.0, 7.6], t: [-0.7, 1.05, -1.0] },
    phone: { p: [-1.2, 3.0, 4.6], t: [1.0, 1.0, -0.9] },
  },
  war: {
    desk: { p: [4.2, 2.75, 8.3], t: [6.25, 1.45, -1.3] },
    phone: { p: [5.5, 2.5, 6.4], t: [6.6, 1.4, -1.3] },
  },
  flash: {
    desk: { p: [9.25, 2.75, 8.3], t: [11.3, 1.45, -1.3] },
    phone: { p: [10.55, 2.5, 6.4], t: [11.65, 1.4, -1.3] },
  },
  studio: {
    desk: { p: [14.2, 2.75, 8.3], t: [16.25, 1.45, -1.3] },
    phone: { p: [15.5, 2.5, 6.4], t: [16.6, 1.4, -1.3] },
  },
  lab: {
    desk: { p: [19.25, 2.75, 8.3], t: [21.3, 1.45, -1.3] },
    phone: { p: [20.55, 2.5, 6.4], t: [21.65, 1.4, -1.3] },
  },
  balcony: {
    desk: { p: [24.45, 2.75, 8.3], t: [26.5, 1.45, -1.3] },
    phone: { p: [25.75, 2.5, 6.4], t: [26.85, 1.4, -1.3] },
  },
};

/** Wide establishing shot behind the intro. */
export const ESTABLISH: Raw = { p: [0.2, 4.2, 9.5], t: [0.4, 1.2, -1.2] };

export class CameraPath {
  private pos!: THREE.CatmullRomCurve3;
  private tgt!: THREE.CatmullRomCurve3;
  readonly stops: Pose[] = [];
  constructor(
    private ids: string[],
    phone: boolean
  ) {
    this.build(phone);
  }

  build(phone: boolean) {
    const key = phone ? "phone" : "desk";
    const ps: THREE.Vector3[] = [];
    const ts: THREE.Vector3[] = [];
    this.stops.length = 0;
    this.ids.forEach((id, i) => {
      const s = SHOTS[id][key];
      const p = v(s.p);
      const t = v(s.t);
      this.stops.push({ p, t });
      ps.push(p);
      ts.push(t);
      const nextId = this.ids[i + 1];
      if (!nextId) return;
      const n = SHOTS[nextId][key];
      // Between rooms the camera cranes up and pulls back, so the walls slide past like a dolly shot.
      ps.push(p.clone().lerp(v(n.p), 0.5).add(new THREE.Vector3(0, phone ? 0.45 : 0.6, phone ? 1.3 : 1.7)));
      ts.push(t.clone().lerp(v(n.t), 0.5).add(new THREE.Vector3(0, -0.08, 0)));
    });
    this.pos = new THREE.CatmullRomCurve3(ps, false, "centripetal");
    this.tgt = new THREE.CatmullRomCurve3(ts, false, "centripetal");
  }

  /** s runs 0..n-1, one unit per chapter; integer s lands exactly on a shot. */
  at(s: number, out: Pose) {
    const u = THREE.MathUtils.clamp(s / (this.ids.length - 1), 0, 1);
    this.pos.getPoint(u, out.p);
    this.tgt.getPoint(u, out.t);
    return out;
  }
}

export type Tour = {
  rig: { s: number };
  goTo: (i: number, opts?: { instant?: boolean }) => void;
  next: () => void;
  prev: () => void;
  active: () => number;
  progress: () => number;
  setLocked: (on: boolean) => void;
  refresh: () => void;
  scroller: HTMLElement;
  onChapter: (fn: (i: number, from: number) => void) => void;
  onUserScroll: (fn: () => void) => void;
  kill: () => void;
};

/**
 * The tour is one GSAP timeline scrubbed by ScrollTrigger over a native scroller.
 * The timeline only moves rig.s (0..n-1) with an ease per chapter; the camera, Davi and the HUD
 * are all derived from that one number, so scrolling back plays everything in reverse.
 */
export function createTour(scroller: HTMLElement, count: number, opts: { reduced: () => boolean; phone: () => boolean }): Tour {
  const track = scroller.querySelector<HTMLElement>(".track")!;
  const rig = { s: 0 };
  const tl = gsap.timeline({ paused: true, defaults: { ease: "sine.inOut", duration: 1 } });
  for (let k = 0; k < count - 1; k++) {
    tl.addLabel(`c${k}`, k);
    tl.to(rig, { s: k + 1 }, k);
  }
  tl.addLabel(`c${count - 1}`, count - 1);

  const sizeTrack = () => {
    const per = opts.phone() ? 1.25 : 1.0;
    track.style.height = `${(1 + (count - 1) * per) * 100}%`;
  };
  sizeTrack();

  let st: ScrollTrigger;
  const make = () => {
    st = ScrollTrigger.create({
      scroller,
      trigger: track,
      start: "top top",
      end: "bottom bottom",
      animation: tl,
      scrub: opts.reduced() ? true : 0.85,
      snap: {
        snapTo: "labelsDirectional",
        duration: { min: 0.35, max: 0.9 },
        delay: 0.08,
        ease: "power2.inOut",
        inertia: false,
      },
    });
  };
  make();

  let cur = 0;
  let target = 0;
  let navTween: gsap.core.Tween | null = null;
  const chapterFns: ((i: number, from: number) => void)[] = [];
  const userFns: (() => void)[] = [];

  const scrollFor = (i: number) => st.start + (st.end - st.start) * (i / (count - 1));

  const goTo = (i: number, o: { instant?: boolean } = {}) => {
    i = THREE.MathUtils.clamp(Math.round(i), 0, count - 1);
    target = i;
    navTween?.kill();
    const y = scrollFor(i);
    if (o.instant || opts.reduced()) {
      scroller.scrollTop = y;
      if (o.instant) {
        tl.progress(i / (count - 1));
        st.update();
      }
      return;
    }
    const dist = Math.abs(scroller.scrollTop - y) / Math.max(1, st.end - st.start) * (count - 1);
    navTween = gsap.to(scroller, {
      scrollTo: { y, autoKill: true },
      duration: THREE.MathUtils.clamp(0.75 + dist * 0.32, 0.75, 2.1),
      ease: "power2.inOut",
      onComplete: () => (navTween = null),
      onInterrupt: () => (navTween = null),
    });
  };

  // Chapter changes follow the smoothed timeline, not the raw scroll, so text and camera agree.
  const tick = () => {
    const i = THREE.MathUtils.clamp(Math.round(rig.s), 0, count - 1);
    if (i !== cur) {
      const from = cur;
      cur = i;
      if (!navTween) target = i;
      chapterFns.forEach((f) => f(i, from));
    }
  };
  gsap.ticker.add(tick);

  let lastTop = scroller.scrollTop;
  const onScroll = () => {
    const d = Math.abs(scroller.scrollTop - lastTop);
    lastTop = scroller.scrollTop;
    if (!navTween && d > 1) userFns.forEach((f) => f());
  };
  scroller.addEventListener("scroll", onScroll, { passive: true });

  return {
    rig,
    goTo,
    next: () => goTo((navTween ? target : cur) + 1),
    prev: () => goTo((navTween ? target : cur) - 1),
    active: () => cur,
    progress: () => tl.progress(),
    setLocked: (on) => scroller.classList.toggle("locked", on),
    refresh: () => {
      const keep = cur;
      sizeTrack();
      ScrollTrigger.refresh();
      scroller.scrollTop = scrollFor(keep);
    },
    scroller,
    onChapter: (fn) => chapterFns.push(fn),
    onUserScroll: (fn) => userFns.push(fn),
    kill: () => {
      gsap.ticker.remove(tick);
      scroller.removeEventListener("scroll", onScroll);
      navTween?.kill();
      st.kill();
      tl.kill();
    },
  };
}
