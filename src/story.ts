import * as THREE from "three";
import gsap from "gsap";
import { INK } from "./clay";
import { inspectCard, pickLabel, SLIDES, slideOf } from "./copy";
import { bindHud, magnetic, microButtons } from "./hud";
import { Banguela, Davi } from "./puppet";
import { buildWorld, type World } from "./world";
import { assertTourClear, assertWalkRoute, daviAt, F, TOUR_SPOTS } from "./path";
import { musicOn, sfxBark, sfxClick, sfxPop, sfxWhoosh, toggleMusic } from "./audio";
import { Adaptive, detectTier, downTier, isPhone, type Tier } from "./quality";
import { batchStatic } from "./batch";
import { CameraPath, createTour, ESTABLISH, SHOTS, type Pose } from "./tour";
import type { Loader } from "./loader";
import type { Post } from "./post";

const phone = isPhone;
const ACTS = SLIDES.map((s) => s.id);
const ACC = new THREE.Color("#d8ff3d");
const ROOM_X = [0.3, 6.15, 11.2, 16.15, 21.2, 26.4];
const KEY_DIR = new THREE.Vector3(14, -9, -8).normalize();
/** Minimum framing radius per clickable, so a click on the duck frames the desk, not a yellow blur. */
/** Where the camera looks from when it frames these desk props, so Davi's head is not in the way. */
const FOCUS_DIR: Record<string, [number, number, number]> = { monitor: [-0.7, 0.5, 0.75], mug: [0.75, 0.55, 0.7], duck: [-0.55, 0.6, 0.8], trophy: [-0.6, 0.55, 0.8], speaker: [0.35, 0.55, 1], lamp: [-0.1, 0.25, 1] };
const FOCUS_R: Record<string, number> = { ball: 1.4, lights: 1.1, mug: 0.62, duck: 0.62, trophy: 0.62, monitor: 0.66, speaker: 0.62, vinyl: 0.62, plant: 0.62, clock: 0.62, photo: 0.62, badge: 0.55, lamp: 0.95, window: 0.9 };

let stopPrev: (() => void) | null = null;

// talk-bridge: a small, stable surface for integrations (a chat assistant, tests). Nothing else is exported.
export type SceneApi = {
  chapters: readonly string[];
  current: () => string;
  goToChapter: (id: string) => boolean;
  focusObject: (id: string) => boolean;
  openCard: (kind: string, id: string) => boolean;
};
let api: SceneApi | null = null;
export const sceneApi = () => api;

const lerp = THREE.MathUtils.lerp;
const damp = (a: number, b: number, k: number, dt: number) => lerp(a, b, 1 - Math.exp(-k * dt));
const dampAngle = (a: number, b: number, k: number, dt: number) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * (1 - Math.exp(-k * dt));
};
const yieldTask = () =>
  new Promise<void>((r) => {
    const s = (globalThis as unknown as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
    if (s?.yield) return void s.yield().then(r);
    setTimeout(r, 0);
  });

function probeGL() {
  try {
    const c = document.createElement("canvas");
    return (c.getContext("webgl2") ?? c.getContext("webgl")) as WebGL2RenderingContext | WebGLRenderingContext | null;
  } catch {
    return null;
  }
}

type Scene3D = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  world: World;
  davi: Davi;
  dog: Banguela;
  roots: THREE.Object3D[];
  rootOf: Map<THREE.Object3D, THREE.Object3D>;
  byPick: Map<string, THREE.Object3D>;
  tier: Tier;
  post: Post | null;
  batched: { before: number; after: number };
};

async function build3D(canvas: HTMLCanvasElement, loader: Loader): Promise<Scene3D | null> {
  const probe = probeGL();
  if (!probe) return null;
  const { tier } = detectTier(probe);
  (probe.getExtension("WEBGL_lose_context") as { loseContext?: () => void } | null)?.loseContext?.();

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !tier.post, alpha: false, stencil: false, powerPreference: phone() ? "default" : "high-performance" });
  } catch {
    return null;
  }
  renderer.setPixelRatio(tier.dprMax);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // with post-processing, ACES runs once in the final pass; without it, in every material
  renderer.toneMapping = tier.post ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = tier.softShadows ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  renderer.setClearColor(INK, 1);
  renderer.info.autoReset = false;

  // the post-processing chunk downloads while the room is being built
  const postMod = tier.post ? import("./post") : null;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(INK);
  scene.fog = new THREE.Fog(INK, 12, 34);
  const camera = new THREE.PerspectiveCamera(phone() ? 56 : 34, 1, 0.05, 80);

  loader.stage(0.62, "montando a casa");
  const world = await buildWorld(yieldTask);
  scene.add(world.group);

  loader.stage(0.7, "chamando o Davi e o Banguela");
  await yieldTask();
  const davi = new Davi();
  davi.root.position.set(F.chair.x, 0, F.chair.z);
  davi.pose.facing = Math.PI;
  davi.pose.seated = 1;
  davi.root.userData.pick = { kind: "egg", id: "davi" };
  scene.add(davi.root);
  await yieldTask();
  const dog = new Banguela();
  dog.root.position.set(F.dog.x, 0, F.dog.z);
  dog.root.rotation.y = 0.3;
  dog.root.userData.pick = { kind: "egg", id: "banguela" };
  scene.add(dog.root);

  assertWalkRoute(world.spots);
  if (import.meta.env.DEV) assertTourClear();
  await yieldTask();

  // Shadow casters: only what can throw a visible shadow. Floors, back walls and anything flat
  // against them cast nothing anyone can see, and neither do the puppets' eyes, brows and chain links.
  const bb = new THREE.Box3();
  const sz = new THREE.Vector3();
  world.group.updateMatrixWorld(true);
  world.group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.castShadow) return;
    bb.setFromObject(m).getSize(sz);
    if (bb.max.y < 0.02 || (bb.min.z < -2.7 && sz.z < 0.3 && bb.max.z < -2.6)) m.castShadow = false;
  });
  for (const r of [davi.root, dog.root]) {
    r.updateMatrixWorld(true);
    r.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      bb.setFromObject(m).getSize(sz);
      if (Math.max(sz.x, sz.y, sz.z) < 0.09) m.castShadow = false;
    });
  }

  const keep: THREE.Object3D[] = [world.chair, world.mug, world.lamp, world.knapsack, world.steam, world.speaker, world.vinyl, world.ball, world.badge, world.monitor, ...world.packItems, ...world.plants, ...world.bulbs, ...world.sky, ...world.pickables];
  const batched = batchStatic(world.group, keep);

  // shadows: a frustum around the rooms on screen, re-rendered only when something moves
  const key = world.key;
  key.shadow.mapSize.set(tier.shadowSize, tier.shadowSize);
  key.shadow.autoUpdate = false;
  key.shadow.needsUpdate = true;
  world.pendant.shadow.autoUpdate = false;
  world.pendant.shadow.needsUpdate = true;
  if (tier.name !== "high") world.pendant.shadow.mapSize.set(512, 512);
  if (!tier.shadows) {
    // low tier: one static shadow map over the whole apartment, drawn once; the puppets keep their blob shadows
    davi.root.traverse((o) => (o.castShadow = false));
    dog.root.traverse((o) => (o.castShadow = false));
  }

  const roots = [...world.pickables, davi.root, dog.root];
  const rootOf = new Map<THREE.Object3D, THREE.Object3D>();
  const byPick = new Map<string, THREE.Object3D>();
  for (const r of roots) {
    r.traverse((o) => rootOf.set(o, r));
    const p = r.userData.pick as { kind: string; id: string } | undefined;
    if (p && !byPick.has(`${p.kind}:${p.id}`)) byPick.set(`${p.kind}:${p.id}`, r);
  }

  loader.stage(0.8, "acendendo as luzes");
  let post: Post | null = null;
  if (postMod) {
    try {
      const { createPost } = await postMod;
      post = createPost(renderer, scene, camera, tier);
    } catch {
      post = null;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
    }
  }
  return { renderer, scene, camera, world, davi, dog, roots, rootOf, byPick, tier, post, batched };
}

export async function startStory(canvas: HTMLCanvasElement, stage: HTMLElement, loader: Loader) {
  stopPrev?.();
  const ac = new AbortController();
  const { signal } = ac;
  const mq = matchMedia("(prefers-reduced-motion: reduce)");
  const rm = () => mq.matches;
  const hud = bindHud(stage);
  const scroller = stage.querySelector<HTMLElement>("#tour")!;
  const intro = stage.querySelector<HTMLElement>("#intro")!;
  const hudEls = [...stage.querySelectorAll<HTMLElement>("#brand, #slide, #rail, #bar")];
  const tour = createTour(scroller, ACTS.length, { reduced: rm, phone });
  tour.setLocked(true);
  hudEls.forEach((el) => (el.inert = true));

  let started = false;
  let wantStart = false;
  let introBlend = { amt: 0 };
  let sleeping = true;
  let staticFrames = 0;
  let raf = 0;
  let last = performance.now();
  let W = innerWidth;
  let H = innerHeight;

  // -------------------------------------------------------------- 3D
  const s3 = await build3D(canvas, loader).catch((err) => {
    if (import.meta.env.DEV) console.error(err);
    return null;
  });
  if (!s3) stage.classList.add("flat");
  else if (s3.post) stage.classList.add("post");
  const camera = s3?.camera ?? new THREE.PerspectiveCamera();
  const path = new CameraPath(ACTS, phone());
  let layoutPhone = phone();
  const adaptive: Adaptive | null = s3
    ? new Adaptive(
        s3.tier,
        (dpr) => {
          s3.renderer.setPixelRatio(dpr);
          s3.renderer.setSize(W, H, false);
          s3.post?.setSize(W, H);
        },
        () => {
          const next = downTier(adaptive!.tier);
          if (next) s3.post?.lighten(next);
          return next;
        }
      )
    : null;
  // Room-by-room lighting: screens and colored lights of rooms away from the camera dim down,
  // so each chapter's room is the lit one and the rest of the apartment waits in the dark.
  const screens: { mesh: THREE.Mesh; x: number; base: number; root: THREE.Object3D | undefined }[] = [];
  const lights: { l: THREE.PointLight; x: number; base: number }[] = [];
  if (s3) {
    const v = new THREE.Vector3();
    s3.world.group.updateMatrixWorld(true);
    s3.world.group.traverse((o) => {
      const m = o as THREE.Mesh;
      const mat = m.material as THREE.MeshStandardMaterial | undefined;
      if (!m.isMesh || !mat?.emissiveMap) return;
      m.getWorldPosition(v);
      screens.push({ mesh: m, x: v.x, base: mat.emissiveIntensity, root: s3.rootOf.get(m) });
    });
    for (const l of s3.world.roomLights) lights.push({ l, x: l.position.x, base: l.intensity });
  }
  const scr = new THREE.Vector3();
  const roomW = (x: number, cx: number) => THREE.MathUtils.clamp(1 - (Math.abs(x - cx) - 2.6) / 2.4, 0, 1);

  // ?q=low|mid|high pins the quality tier (screenshots, support); otherwise it adapts to the device
  if (adaptive && new URLSearchParams(location.search).has("q")) adaptive.locked = true;
  const progressTick = () => hud.setProgress(tour.progress());
  gsap.ticker.add(progressTick);

  // -------------------------------------------------------------- picking, hover, focus
  type Pick = { kind: string; id: string };
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const box = new THREE.Box3();
  const sphere = new THREE.Sphere();
  const focus = { amt: 0, p: new THREE.Vector3(), t: new THREE.Vector3(), sx: 0, sy: 0, dist: 3, root: null as THREE.Object3D | null };
  let focusTw: gsap.core.Tween | null = null;
  let dynamicUntil = 0;
  const poke = (sec = 2.5) => (dynamicUntil = Math.max(dynamicUntil, performance.now() + sec * 1000));

  type HL = { mats: { m: THREE.MeshStandardMaterial; e: THREE.Color; i: number }[]; v: number };
  const hl = new Map<THREE.Object3D, HL>();
  const prepHL = (root: THREE.Object3D) => {
    let h = hl.get(root);
    if (h) return h;
    h = { mats: [], v: 0 };
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || Array.isArray(m.material)) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (!mat.isMeshStandardMaterial) return;
      const c = mat.clone();
      m.material = c;
      h!.mats.push({ m: c, e: c.emissive.clone(), i: c.emissiveIntensity });
    });
    hl.set(root, h);
    return h;
  };
  const paintHL = (h: HL) => {
    for (const x of h.mats) if (!x.m.emissiveMap) x.m.emissive.copy(x.e).lerp(ACC, 0.2 * h.v);
  };
  let hoverRoot: THREE.Object3D | null = null;
  const setHover = (root: THREE.Object3D | null) => {
    if (root === hoverRoot) return;
    if (hoverRoot) {
      const h = prepHL(hoverRoot);
      gsap.to(h, { v: 0, duration: 0.35, ease: "power2.out", onUpdate: () => paintHL(h), overwrite: true });
    }
    hoverRoot = root;
    if (root) {
      const h = prepHL(root);
      gsap.to(h, { v: 1, duration: rm() ? 0.01 : 0.22, ease: "power2.out", onUpdate: () => paintHL(h), overwrite: true });
    }
  };
  const flash = (root: THREE.Object3D) => {
    const h = prepHL(root);
    gsap.fromTo(h, { v: 1.4 }, { v: hoverRoot === root ? 1 : 0, duration: 0.6, ease: "power2.out", onUpdate: () => paintHL(h), overwrite: true });
  };

  // the room sits right of the text column on desktop, and above the card on phones
  const DESK_SHIFT = { sx: 0.17, sy: 0.02 };
  const PHONE_SHIFT = { sx: 0, sy: 0.2 };

  const focusOn = (root: THREE.Object3D) => {
    if (!s3) return;
    flash(root);
    if (rm()) return;
    const pick = root.userData.pick as Pick | undefined;
    const sheet = hud.isOpen();
    box.setFromObject(root);
    box.getBoundingSphere(sphere);
    const r = Math.max(sphere.radius, FOCUS_R[pick?.id ?? ""] ?? 0.5);
    const c = sphere.center.clone();
    const hint = FOCUS_DIR[pick?.id ?? ""];
    const dir = hint ? new THREE.Vector3(...hint).normalize() : new THREE.Vector3(camera.position.x - c.x, 0, camera.position.z - c.z).normalize();
    if (!hint) {
      dir.lerp(new THREE.Vector3(0, 0, 1), 0.55).normalize();
      dir.y = 0.14;
      dir.normalize();
    }
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const fit = Math.min(vfov, hfov);
    const d = (r / Math.sin(fit / 2)) * (phone() ? (sheet ? 1.75 : 1.15) : 1.22);
    const p = c.clone().addScaledVector(dir, d);
    p.z = Math.min(p.z, 7);
    // stay under the ceiling strip, or it slices the top off the boards on the back wall
    p.y = THREE.MathUtils.clamp(p.y, 0.6, 2.55);
    focus.sx = phone() ? 0 : sheet ? -0.2 : 0;
    focus.sy = phone() ? (sheet ? 0.34 : 0.1) : 0;
    focus.dist = d;
    focus.root = root;
    if (focus.amt < 0.02) {
      focus.p.copy(p);
      focus.t.copy(c);
    } else {
      gsap.to(focus.p, { x: p.x, y: p.y, z: p.z, duration: 1, ease: "power3.inOut", overwrite: true });
      gsap.to(focus.t, { x: c.x, y: c.y, z: c.z, duration: 1, ease: "power3.inOut", overwrite: true });
    }
    focusTw?.kill();
    focusTw = gsap.to(focus, { amt: 1, duration: 1.15, ease: "power3.inOut" });
    hud.setFocus(true);
  };
  const release = () => {
    if (!focus.root && focus.amt <= 0) return;
    focus.root = null;
    focusTw?.kill();
    focusTw = gsap.to(focus, { amt: 0, duration: 0.95, ease: "power3.inOut" });
    hud.setFocus(false);
  };

  // -------------------------------------------------------------- actions (unchanged eggs)
  let mugHits = 0;
  let typed = "";
  let plantHits = 0;
  let ballBusy = false;
  let waveUntil = 0;

  const nightOn = () => {
    if (!s3) return;
    const { world, scene, renderer } = s3;
    world.night.on = !world.night.on;
    const on = world.night.on;
    const col = new THREE.Color(on ? "#05060a" : INK);
    gsap.to(scene.background as THREE.Color, { r: col.r, g: col.g, b: col.b, duration: 0.8 });
    gsap.to(scene.fog!.color, { r: col.r, g: col.g, b: col.b, duration: 0.8 });
    world.group.traverse((o) => {
      if (o instanceof THREE.DirectionalLight) gsap.to(o, { intensity: on ? 0.25 : o.userData.base ?? (o.userData.base = o.intensity), duration: 0.8 });
      if (o instanceof THREE.HemisphereLight) gsap.to(o, { intensity: on ? 0.12 : 0.55, duration: 0.8 });
    });
    gsap.to(world.lampLight, { intensity: on ? 14 : 8, duration: 0.6 });
    gsap.to(world.pendant, { intensity: on ? 16 : 10, duration: 0.6 });
    gsap.to(world.lampShade, { emissiveIntensity: on ? 0.9 : 0.32, duration: 0.6 });
    gsap.to(renderer, { toneMappingExposure: on ? 0.9 : 1.05, duration: 0.8 });
    hud.toast(on ? "modo noite · só o abajur" : "luz do dia");
    sfxPop(on ? 330 : 520);
    poke(1);
  };

  const pack = () => {
    if (s3) {
      const { world } = s3;
      world.packItems.forEach((it, i) => {
        gsap.to(it.position, {
          x: world.knapsack.position.x,
          y: world.knapsack.position.y + 0.25,
          z: world.knapsack.position.z,
          duration: 0.5,
          delay: i * 0.08,
          ease: "back.in(1.4)",
          onComplete: () => void gsap.to(it.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.2 }),
        });
      });
      gsap.fromTo(world.knapsack.scale, { x: 1, y: 1 }, { x: 1.12, y: 0.9, duration: 0.25, yoyo: true, repeat: 1, delay: 0.5 });
      poke(1.5);
    }
    hud.toast("TCC · leilão da mochila");
    sfxPop(440);
    const card = inspectCard("tcc", "tcc");
    if (card) hud.open(card);
  };

  const egg = (id: string) => {
    if (!s3) {
      // without WebGL the chips still answer, with words instead of the 3D gag
      if (id === "speaker") {
        const on = toggleMusic();
        hud.setSound(on);
        hud.toast(on ? "lo-fi ligado" : "silêncio");
      } else hud.toast("o 3D não abriu neste navegador · o resto funciona");
      return;
    }
    const { world, dog, davi } = s3;
    poke();
    switch (id) {
      case "monitor": {
        const mode = world.cycleDesk();
        const labels: Record<string, string> = {
          limit: "monitoria de limite",
          sql: "query no Databricks",
          mail: "contato no PC",
          experimento: "teste vs. controle · lab",
          n8n: "fluxo n8n no PC",
          notebook: "notebook de análise",
        };
        hud.toast(labels[mode] ?? mode);
        gsap.fromTo(world.monitor.scale, { x: 0.96, y: 0.96 }, { x: 1, y: 1, duration: 0.3, ease: "back.out(2)" });
        return;
      }
      case "lamp":
        return nightOn();
      case "speaker": {
        const on = toggleMusic();
        hud.setSound(on);
        hud.toast(on ? "lo-fi ligado · quadros pulsam no beat" : "silêncio");
        gsap.fromTo(world.speaker.scale, { y: 0.8 }, { y: 1, duration: 0.4, ease: "elastic.out(1, 0.4)" });
        return;
      }
      case "vinyl": {
        const on = musicOn() || toggleMusic();
        hud.setSound(on);
        gsap.fromTo(world.vinyl.rotation, { y: 0 }, { y: Math.PI * 4, duration: 1.6, ease: "power2.out" });
        hud.toast("lado B · o Banguela gosta");
        dog.bark = 0.6;
        return;
      }
      case "mug": {
        mugHits++;
        gsap.fromTo(world.mug.scale, { y: 0.7 }, { y: 1, duration: 0.35, ease: "elastic.out(1, 0.5)" });
        world.steam.visible = mugHits >= 2;
        hud.toast(["primeiro café", "segundo café · agora sim", "terceiro · Databricks não dorme", "quarto · vai dar ruim"][Math.min(mugHits - 1, 3)]);
        sfxPop(600 + mugHits * 60);
        return;
      }
      case "banguela": {
        dog.bark = 1;
        sfxBark();
        gsap.fromTo(dog.root.position, { y: 0 }, { y: 0.16, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" });
        hud.toast(["au!", "Banguela · pitbull · 100% amor", "ele quer o vinil", "au au"][Math.floor(Math.random() * 4)]);
        return;
      }
      case "photo": {
        hud.toast("é ele. brindle, peito branco, corrente e bandana.");
        gsap.to(dog.root.rotation, { y: 0.3, duration: 0.5 });
        dog.bark = 0.5;
        return;
      }
      case "davi": {
        davi.wink();
        hud.toast("oi. usa ← → pra andar pela casa");
        gsap.fromTo(davi.root.scale, { y: 1.15 }, { y: 1.15 * 1.03, duration: 0.15, yoyo: true, repeat: 1 });
        return;
      }
      case "mail": {
        hud.copyMail();
        world.bulbs.forEach((b, i) => gsap.fromTo(b.material as THREE.MeshStandardMaterial, { emissiveIntensity: 0 }, { emissiveIntensity: 1.8, duration: 0.3, delay: i * 0.05 }));
        waveUntil = performance.now() + 2500;
        sfxPop(700);
        const card = inspectCard("contact", "card");
        if (card) hud.open(card);
        return;
      }
      case "badge": {
        hud.copyMail();
        gsap.fromTo(world.badge.scale, { x: 0.92, y: 1.08 }, { x: 1, y: 1, duration: 0.35, ease: "back.out(2)" });
        const card = inspectCard("contact", "card");
        if (card) hud.open(card);
        sfxPop(720);
        return;
      }
      case "plant": {
        plantHits++;
        world.plants.forEach((p) => gsap.to(p.children[1].scale, { x: 1 + plantHits * 0.15, y: 1 + plantHits * 0.2, z: 1 + plantHits * 0.15, duration: 0.6, ease: "elastic.out(1, 0.5)" }));
        hud.toast(plantHits > 3 ? "regou demais" : "cresceu");
        sfxPop(380 + plantHits * 40);
        return;
      }
      case "clock": {
        const now = new Date();
        hud.toast(`agora são ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")} em São Paulo`);
        return;
      }
      case "duck": {
        hud.toast("pato de débito · não pergunta");
        sfxPop(900);
        return;
      }
      case "trophy": {
        hud.toast("aluno destaque · 2º e 3º ano do ensino médio");
        sfxPop(660);
        return;
      }
      case "window": {
        world.sky.forEach((s) => {
          const m = s.material as THREE.MeshStandardMaterial;
          const c = new THREE.Color(world.night.on ? "#2a4a6e" : "#0b1020");
          gsap.to(m.color, { r: c.r, g: c.g, b: c.b, duration: 0.6 });
          gsap.to(m.emissive, { r: c.r, g: c.g, b: c.b, duration: 0.6 });
        });
        hud.toast("São Paulo lá fora");
        return;
      }
      case "lights": {
        world.bulbs.forEach((b, i) => gsap.fromTo(b.material as THREE.MeshStandardMaterial, { emissiveIntensity: 0 }, { emissiveIntensity: 1.8, duration: 0.3, delay: i * 0.05 }));
        hud.toast("luzinha da varanda");
        sfxPop(800);
        return;
      }
      case "ball": {
        if (ballBusy) return;
        ballBusy = true;
        gsap
          .timeline({ onComplete: () => void (ballBusy = false) })
          .to(world.ball.position, { y: 1.1, duration: 0.35, ease: "power2.out" })
          .to(world.ball.position, { y: 0.14, duration: 0.4, ease: "bounce.out" });
        gsap.to(world.ball.rotation, { x: "+=6", duration: 0.75 });
        hud.toast("gol");
        return;
      }
    }
  };

  /** One entry point for every click: 3D objects, chips, keys. `src` is the 3D object to frame, if any. */
  const onPick = (kind: string, id: string, src?: THREE.Object3D | null) => {
    sfxClick();
    if (kind === "link") {
      window.open(id, "_blank", "noopener");
      return;
    }
    if (kind === "act") return void tour.goTo(ACTS.indexOf(id));
    if (kind === "egg") egg(id);
    else if (kind === "tcc") pack();
    else if (kind === "cork" || kind === "cv") {
      const card = inspectCard("cork", "cv");
      if (card) hud.open(card);
    } else {
      if (kind === "experience" && id === "flash") s3?.world.cycleNote();
      const card = inspectCard(kind, id);
      if (card) hud.open(card);
    }
    if (src) focusOn(src);
  };

  /** A chip in the slide frames its object when that object is in the room on screen. */
  const chipTarget = (kind: string, id: string) => {
    if (!s3) return null;
    const key = kind === "contact" ? "egg:mail" : `${kind}:${id}`;
    const o = s3.byPick.get(key);
    if (!o) return null;
    o.getWorldPosition(sphere.center);
    return Math.abs(sphere.center.x - ROOM_X[tour.active()]) < 3.4 ? o : null;
  };
  hud.onChip((kind, id) => onPick(kind, id, chipTarget(kind, id)));
  hud.onJump((id) => tour.goTo(ACTS.indexOf(id)));
  hud.onClose(() => release());

  const pickAt = (x: number, y: number): { pick: Pick; root: THREE.Object3D } | null => {
    if (!s3) return null;
    ndc.set((x / innerWidth) * 2 - 1, -((y / innerHeight) * 2 - 1));
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(s3.roots, true);
    for (const h of hits) {
      for (let o: THREE.Object3D | null = h.object; o; o = o.parent) {
        if (o.userData.pick) return { pick: o.userData.pick as Pick, root: s3.rootOf.get(h.object) ?? o };
      }
    }
    return null;
  };

  const uiHit = (e: Event) => !!(e.target as HTMLElement).closest?.("button, a, input, label, #dossier, #rail, #intro, #bar, #slide, #brand");

  // -------------------------------------------------------------- begin
  const begin = async () => {
    if (started) return;
    if (!loader.isReady()) {
      wantStart = true;
      intro.classList.add("waiting");
      return;
    }
    started = true;
    stage.classList.add("started");
    wake();
    hudEls.forEach((el) => (el.inert = false));
    const intro0 = { amt: 0 };
    introBlend = intro0;
    sfxWhoosh();
    await hud.dismissIntro();
    tour.setLocked(false);
    hud.show(slideOf(ACTS[0]), 1);
    s3?.world.desk.replay();
    if (rm()) intro0.amt = 1;
    else gsap.to(intro0, { amt: 1, duration: 2.4, ease: "power3.inOut" });
    if (phone()) hud.toast("desliza pra andar · toca no 3D");
  };

  tour.onChapter((i, from) => {
    hud.close();
    release();
    hud.show(slideOf(ACTS[i]), i > from ? 1 : -1);
    sfxWhoosh();
    if (ACTS[i] === "war" && from === 0 && s3) {
      const dog = s3.dog;
      gsap.delayedCall(0.35, () => {
        dog.bark = 1;
        sfxBark();
      });
    }
    if (i === 0) s3?.world.desk.replay();
    if (rm()) cut();
  });
  tour.onUserScroll(() => {
    if (focus.root) release();
  });

  // reduced motion: chapters cut with a short fade instead of flying
  const fade = stage.querySelector<HTMLElement>("#fade");
  const cut = () => {
    if (!fade) return;
    fade.classList.remove("on");
    void fade.offsetWidth;
    fade.classList.add("on");
  };

  // -------------------------------------------------------------- input
  const hint = (e: PointerEvent) => {
    if (!s3 || !started || layoutPhone) return;
    if (uiHit(e)) {
      setHover(null);
      hud.tip(null);
      document.body.style.cursor = "";
      return;
    }
    const hit = pickAt(e.clientX, e.clientY);
    setHover(hit?.root ?? null);
    document.body.style.cursor = hit ? "pointer" : "";
    hud.tip(hit ? pickLabel(hit.pick.kind, hit.pick.id) : null, e.clientX, e.clientY);
  };
  let hoverQueued: PointerEvent | null = null;
  const look = { x: 0, y: 0 };
  const lookX = gsap.quickTo(look, "x", { duration: 0.6, ease: "power3.out" });
  const lookY = gsap.quickTo(look, "y", { duration: 0.6, ease: "power3.out" });

  window.addEventListener(
    "pointermove",
    (e) => {
      if (layoutPhone || e.pointerType === "touch") return;
      lookX((e.clientX / innerWidth) * 2 - 1);
      lookY(-((e.clientY / innerHeight) * 2 - 1));
      hoverQueued = e;
    },
    { signal }
  );

  const clickAt = (e: PointerEvent) => {
    if (uiHit(e)) return;
    const hit = pickAt(e.clientX, e.clientY);
    if (hit) onPick(hit.pick.kind, hit.pick.id, hit.root);
    else if (focus.root) release();
  };
  const ptr = { x: 0, y: 0, t: 0, type: "mouse" };
  window.addEventListener(
    "pointerdown",
    (e) => {
      ptr.x = e.clientX;
      ptr.y = e.clientY;
      ptr.t = performance.now();
      ptr.type = e.pointerType;
      if (!started) {
        if (!(e.target as HTMLElement).closest?.("a")) void begin();
        return;
      }
      if (!phone() && e.button === 0 && e.pointerType !== "touch") clickAt(e);
    },
    { signal }
  );
  // touch: act on the click that follows a tap (the browser drops it after a swipe), so the
  // card that opens is not closed again by that same click landing on its backdrop
  window.addEventListener(
    "click",
    (e) => {
      if (!started || hud.isOpen()) return;
      if (!(phone() || ptr.type === "touch")) return;
      if (Math.hypot(e.clientX - ptr.x, e.clientY - ptr.y) > 16) return;
      if (performance.now() - ptr.t > 700) return;
      clickAt(e as PointerEvent);
    },
    { signal }
  );

  window.addEventListener(
    "keydown",
    (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!started) {
        if (e.key === "Tab" || e.key === "Shift") return;
        if (e.key === " " || e.key === "Enter") e.preventDefault();
        return void begin();
      }
      const t = e.target as HTMLElement;
      if (t?.closest?.("input, textarea")) return;
      if (e.key === "Escape") {
        if (hud.isOpen()) return hud.close();
        return release();
      }
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " " || e.key === "PageDown") {
        if (e.key === " " && t?.closest?.("button, a")) return;
        e.preventDefault();
        hud.close();
        return tour.next();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        hud.close();
        return tour.prev();
      }
      if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        hud.close();
        return tour.goTo(e.key === "Home" ? 0 : ACTS.length - 1);
      }
      if (/^[1-6]$/.test(e.key)) {
        hud.close();
        return tour.goTo(Number(e.key) - 1);
      }
      if (e.key === "c" || e.key === "C") hud.copyMail();
      if (e.key === "m" || e.key === "M") onPick("cork", "cv");
      if (e.key === "s" || e.key === "S") onPick("egg", "speaker");
      typed = (typed + e.key.toLowerCase()).slice(-8);
      if (typed.includes("banguela")) {
        onPick("egg", "banguela");
        typed = "";
      }
    },
    { signal }
  );

  // wheel over the text column or the toolbar still drives the tour
  stage.addEventListener(
    "wheel",
    (e) => {
      if (e.ctrlKey) return;
      const t = e.target as HTMLElement;
      if (!started) {
        if (Math.abs(e.deltaY) > 2) void begin();
        return;
      }
      if (t.closest?.("#tour, #dossier")) return;
      e.preventDefault();
      const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
      scroller.scrollBy({ top: e.deltaY * k });
    },
    { signal, passive: false }
  );
  intro.addEventListener(
    "touchmove",
    () => {
      if (!started) void begin();
    },
    { signal, passive: true }
  );

  stage.querySelector("#sound")?.addEventListener("click", () => onPick("egg", "speaker"), { signal });
  stage.querySelector("#open-index")?.addEventListener("click", () => onPick("cork", "cv"), { signal });
  stage.querySelector("#unfocus")?.addEventListener(
    "click",
    () => {
      hud.close();
      release();
    },
    { signal }
  );
  stage.querySelector("#intro .cta")?.addEventListener("click", () => void begin(), { signal });

  // -------------------------------------------------------------- frame loop
  const tp: Pose = { p: new THREE.Vector3(), t: new THREE.Vector3() };
  const est: Pose = { p: new THREE.Vector3(...ESTABLISH.p), t: new THREE.Vector3(...ESTABLISH.t) };
  const camP = new THREE.Vector3();
  const camT = new THREE.Vector3();
  const lightRight = new THREE.Vector3().crossVectors(KEY_DIR, new THREE.Vector3(0, 1, 0)).normalize();
  const lightUp = new THREE.Vector3().crossVectors(lightRight, KEY_DIR).normalize();
  const davState = { x: F.chair.x as number, z: F.chair.z as number, walk: 0 };
  let shadowRoom = -1;
  let frame = 0;
  let elapsed = 0;
  let beat = 0;

  const aimKey = (room: number) => {
    if (!s3) return;
    const { key } = s3.world;
    const tier = adaptive!.tier;
    const span = tier.shadows ? 9.5 : 17;
    const cx = tier.shadows ? ROOM_X[room] : 12;
    const c = new THREE.Vector3(cx, 0.6, -0.6);
    // snap the frustum to whole shadow-map texels so the shadows never shimmer
    const texel = (span * 2) / key.shadow.mapSize.x;
    const r = Math.round(c.dot(lightRight) / texel) * texel;
    const u = Math.round(c.dot(lightUp) / texel) * texel;
    const f = c.dot(KEY_DIR);
    c.copy(lightRight).multiplyScalar(r).addScaledVector(lightUp, u).addScaledVector(KEY_DIR, f);
    key.target.position.copy(c);
    key.position.copy(c).addScaledVector(KEY_DIR, -22);
    const cam = key.shadow.camera;
    cam.left = -span;
    cam.right = span;
    cam.top = span * 0.8;
    cam.bottom = -span * 0.8;
    cam.near = 4;
    cam.far = 44;
    cam.updateProjectionMatrix();
    key.target.updateMatrixWorld();
    key.updateMatrixWorld();
    key.shadow.needsUpdate = true;
  };

  function wake() {
    if (!s3) return;
    staticFrames = 4;
    if (sleeping) {
      sleeping = false;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  }

  function loop() {
    if (!s3) return;
    const now = performance.now();
    const dtMs = now - last;
    last = now;
    // behind the opaque intro there is nothing to animate: draw a few frames, then sleep until "entrar"
    if (!started) {
      if (staticFrames <= 0 || !loader.isReady()) {
        sleeping = true;
        return;
      }
      staticFrames--;
    }
    raf = requestAnimationFrame(loop);
    const { renderer, scene, world, davi, dog, post } = s3;
    renderer.info.reset();
    const dt = Math.min(dtMs / 1000, 0.05);
    elapsed += dt;
    const t = elapsed;
    frame++;

    // ---- tour pose
    const sRaw = tour.rig.s;
    const sEff = rm() ? Math.round(sRaw) : sRaw;
    path.at(sEff, tp);
    const ib = introBlend.amt;
    camP.copy(est.p).lerp(tp.p, ib);
    camT.copy(est.t).lerp(tp.t, ib);
    if (focus.amt > 0) {
      camP.lerp(focus.p, focus.amt);
      camT.lerp(focus.t, focus.amt);
    }
    const lookAmt = layoutPhone ? 0 : 1 - focus.amt * 0.7;
    camera.position.set(camP.x + look.x * 0.28 * lookAmt, camP.y + look.y * 0.14 * lookAmt, camP.z);
    camera.lookAt(camT);
    const ts = layoutPhone ? PHONE_SHIFT : DESK_SHIFT;
    const sx = lerp(ts.sx, focus.sx, focus.amt) * ib;
    const sy = lerp(ts.sy, focus.sy, focus.amt) * ib + (layoutPhone ? 0.12 * (1 - ib) : 0);
    camera.setViewOffset(W, H, -W * sx, H * sy, W, H);

    // ---- Davi follows the same number
    const pose = daviAt(sEff);
    const P = davi.root.position;
    const vx = (pose.x - davState.x) / Math.max(dt, 1e-3);
    const vz = (pose.z - davState.z) / Math.max(dt, 1e-3);
    davState.x = pose.x;
    davState.z = pose.z;
    P.set(pose.x, 0, pose.z);
    world.chair.position.z = pose.chairZ;
    const D = davi.pose;
    D.seated = pose.seated;
    const speed = Math.hypot(vx, vz);
    const moving = speed > 0.12 && !rm();
    davState.walk = damp(davState.walk, moving ? THREE.MathUtils.clamp(speed / 0.9, 0.35, 1) : 0, 12, dt);
    D.walk = davState.walk;
    const ch = tour.active();
    const stop = path.stops[ch];
    const idleFacing = ch === 0 ? Math.PI : Math.atan2(stop.p.x - TOUR_SPOTS[ch].x, stop.p.z - TOUR_SPOTS[ch].z) + (ACTS[ch] === "balcony" ? 0 : -0.3);
    const wantFacing = pose.seated > 0.5 ? Math.PI : moving ? Math.atan2(vx, vz) : idleFacing;
    D.facing = rm() ? wantFacing : dampAngle(D.facing, wantFacing, moving ? 10 : 5, dt);
    D.look = damp(D.look, moving ? 0.15 : 1, 6, dt);
    D.wave = damp(D.wave, (!moving && ACTS[ch] === "balcony") || now < waveUntil ? 1 : 0, 5, dt);
    davi.look.x = look.x;
    davi.look.y = look.y;
    davi.update(dt, t);
    dog.update(t);

    // ---- screens: only the ones on screen redraw
    if (sEff < 0.85 || focus.root === world.monitor) world.desk.update(t);
    for (const b of world.boards) if (Math.abs(b.mesh.position.x - camT.x) < 6.5) b.update(t);
    if (musicOn()) {
      const bt = Math.floor(t * 2);
      if (bt !== beat) {
        beat = bt;
        world.boards.forEach((x) => x.pulse());
        gsap.fromTo(world.speaker.scale, { x: 1.06, y: 0.94 }, { x: 1, y: 1, duration: 0.35, ease: "power2.out" });
      }
      world.vinyl.getObjectByName("disc")!.rotation.y += dt * 2.4;
    }
    if (world.steam.visible) {
      world.steam.children.forEach((c, i) => {
        c.position.y = 0.1 + ((t * 0.35 + i * 0.12) % 0.4);
        (c as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material.opacity = 0.5 - ((t * 0.35 + i * 0.12) % 0.4);
      });
    }
    world.bulbs.forEach((b, i) => {
      (b.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5 + Math.sin(t * 3 + i) * 0.4;
    });
    world.monLight.intensity = 2.2 + Math.sin(t * 2.3) * 0.12;
    for (const sc of screens) {
      const h = sc.root ? hl.get(sc.root) : undefined;
      let w = roomW(sc.x, camT.x);
      if (!layoutPhone && w < 1) {
        // a screen that lands behind the text column fades further, so the words stay clean
        sc.mesh.getWorldPosition(scr).project(camera);
        w *= THREE.MathUtils.smoothstep(scr.x, -0.25, 0.1);
      }
      const mat = sc.mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = sc.base * (0.1 + 0.9 * w) * (1 + 0.55 * (h?.v ?? 0));
      mat.color.setScalar(0.16 + 0.84 * w);
    }
    for (const L of lights) L.l.intensity = L.base * (0.22 + 0.78 * roomW(L.x, camT.x));

    // ---- shadows: follow the room on screen, redraw only when something moves
    const tier = adaptive!.tier;
    const room = THREE.MathUtils.clamp(Math.round(sEff), 0, ROOM_X.length - 1);
    if (shadowRoom < 0 || (tier.shadows && room !== shadowRoom)) {
      shadowRoom = room;
      aimKey(room);
    }
    const busy = moving || D.seated % 1 !== 0 || now < dynamicUntil;
    if (tier.shadows && (busy || frame % 10 === 0)) world.key.shadow.needsUpdate = true;
    if (tier.name === "high" && sEff < 1.2 && busy) world.pendant.shadow.needsUpdate = true;

    // ---- depth of field while something is in focus
    post?.setFocus(focus.amt, focus.dist, Math.max(0.8, focus.dist * 0.35));
    if (post) post.render(rm() ? 0 : dt);
    else renderer.render(scene, camera);

    if (hoverQueued) {
      hint(hoverQueued);
      hoverQueued = null;
    }
    if (started && document.visibilityState === "visible") adaptive!.sample(dtMs, now);
  }

  // -------------------------------------------------------------- layout
  const fovFor = (w: number, h: number) => {
    if (!phone()) return 34;
    // portrait: keep ~31° across so a whole wall board fits, then let the height follow
    const a = w / h;
    return THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(15.5)) / a)), 44, 64);
  };
  const resize = () => {
    W = stage.clientWidth || innerWidth;
    H = stage.clientHeight || innerHeight;
    const p = phone();
    if (p !== layoutPhone) {
      layoutPhone = p;
      path.build(p);
      tour.refresh();
    }
    if (s3) {
      s3.renderer.setPixelRatio(adaptive?.dpr ?? s3.tier.dprMax);
      s3.renderer.setSize(W, H, false);
      s3.post?.setSize(W, H);
      camera.aspect = W / H;
      camera.fov = fovFor(W, H);
      camera.updateProjectionMatrix();
      if (!started) wake();
    }
  };
  resize();
  window.addEventListener("resize", resize, { signal });
  visualViewport?.addEventListener("resize", resize, { signal });

  // -------------------------------------------------------------- warm up, then wait at the door
  if (s3) {
    loader.stage(0.93, "compilando os shaders");
    path.at(0, tp);
    camera.position.copy(est.p);
    camera.lookAt(est.t);
    try {
      await s3.renderer.compileAsync(s3.scene, camera);
    } catch {
      /* compile on first draw instead */
    }
    await yieldTask();
    // upload every canvas texture now, so the first look at a room does not stall on a big upload
    const seen = new Set<THREE.Texture>();
    s3.scene.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      for (const t of [mat?.map, mat?.emissiveMap]) if (t && !seen.has(t)) seen.add(t);
    });
    seen.forEach((t) => s3.renderer.initTexture(t));
    await yieldTask();
    // and compile the depth-of-field pass once, behind the intro, instead of on the first click
    if (s3.post) {
      s3.post.setFocus(1, 6, 2);
      s3.post.render(0);
      s3.post.setFocus(0, 6, 2);
    }
    loader.stage(0.98, "primeiro quadro");
    staticFrames = 4;
    sleeping = true;
    last = performance.now();
  }
  await loader.done();
  const cta = intro.querySelector<HTMLElement>(".cta");
  if (cta) magnetic(cta, 0.25);
  microButtons(intro, ".cta");
  if (s3) wake();
  if (wantStart || loader.wanted()) void begin();

  if (import.meta.env.DEV || new URLSearchParams(location.search).has("probe")) {
    (window as unknown as { __diorama: unknown }).__diorama = {
      chapter: () => tour.active(),
      s: () => tour.rig.s,
      started: () => started,
      flat: () => !s3,
      tier: () => adaptive?.tier.name,
      dpr: () => adaptive?.dpr,
      adaptive: () => adaptive?.history,
      info: () => (s3 ? { ...s3.renderer.info.render, batched: s3.batched } : null),
      focus: () => (focus.root?.userData.pick as Pick | undefined) ?? null,
      focusAmt: () => focus.amt,
      focusOn: (id: string) => api?.focusObject(id),
      screens: () => screens.map((sc) => { const m = sc.mesh.material as THREE.MeshStandardMaterial; return [+sc.x.toFixed(1), +m.emissiveIntensity.toFixed(2), +m.color.r.toFixed(2)]; }),
      night: () => s3?.world.night.on,
      davi: () => (s3 ? { x: s3.davi.root.position.x, z: s3.davi.root.position.z, seated: s3.davi.pose.seated } : null),
      shot: (id: string, mode: "desk" | "phone", p: [number, number, number], t: [number, number, number]) => {
        if (!import.meta.env.DEV) return;
        SHOTS[id][mode] = { p, t };
        path.build(phone());
      },
      est: (p: [number, number, number], t: [number, number, number]) => {
        if (!import.meta.env.DEV) return;
        est.p.set(...p);
        est.t.set(...t);
        wake();
      },
      project: (kind: string, id: string) => {
        if (!s3) return null;
        const o = s3.byPick.get(`${kind}:${id}`);
        if (!o) return null;
        box.setFromObject(o);
        const v = box.getCenter(new THREE.Vector3()).project(camera);
        return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, onScreen: Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1 };
      },
    };
  }

  api = {
    chapters: ACTS,
    current: () => ACTS[tour.active()],
    goToChapter: (id) => {
      const i = ACTS.indexOf(id);
      if (i < 0) return false;
      tour.goTo(i);
      return true;
    },
    focusObject: (id) => {
      if (!s3) return false;
      const o = [...s3.byPick.entries()].find(([k]) => k.endsWith(`:${id}`))?.[1];
      if (!o) return false;
      focusOn(o);
      return true;
    },
    openCard: (kind, id) => {
      const card = inspectCard(kind, id);
      if (!card) return false;
      hud.open(card);
      return true;
    },
  };

  stopPrev = () => {
    cancelAnimationFrame(raf);
    gsap.ticker.remove(progressTick);
    ac.abort();
    tour.kill();
    s3?.post?.dispose();
    s3?.renderer.dispose();
    api = null;
  };
}
