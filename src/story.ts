import * as THREE from "three";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { INK } from "./clay";
import { inspectCard, SLIDES, slideOf } from "./copy";
import { bindHud } from "./hud";
import { Banguela, Davi } from "./puppet";
import { buildWorld, type Cam } from "./world";
import { assertWalkRoute, F, WALK_Z } from "./path";
import { musicOn, sfxBark, sfxClick, sfxPop, sfxWhoosh, toggleMusic } from "./audio";

gsap.registerPlugin(Observer);

let stopPrev: (() => void) | null = null;

const ACTS = SLIDES.map((s) => s.id);

export function startStory(canvas: HTMLCanvasElement, stage: HTMLElement) {
  stopPrev?.();
  const ac = new AbortController();
  const { signal } = ac;
  const hud = bindHud(stage);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(INK, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(INK);
  scene.fog = new THREE.Fog(INK, 12, 34);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 80);

  const world = buildWorld();
  scene.add(world.group);

  const davi = new Davi();
  davi.root.position.set(F.chair.x, 0, F.chair.z);
  davi.pose.facing = Math.PI;
  davi.pose.seated = 1;
  davi.root.userData.pick = { kind: "egg", id: "davi" };
  scene.add(davi.root);

  const dog = new Banguela();
  dog.root.position.set(F.dog.x, 0, F.dog.z);
  dog.root.rotation.y = 0.3;
  dog.root.userData.pick = { kind: "egg", id: "banguela" };
  scene.add(dog.root);

  assertWalkRoute(world.spots);

  const pickables = [...world.pickables, davi.root, dog.root];
  const cam: Cam = { px: -4, py: 7, pz: 16, tx: 2, ty: 1, tz: -1 };
  const look = { x: 0, y: 0 };
  const lookX = gsap.quickTo(look, "x", { duration: 0.6, ease: "power3.out" });
  const lookY = gsap.quickTo(look, "y", { duration: 0.6, ease: "power3.out" });

  const D = davi.pose;
  const P = davi.root.position;
  const face = (x: number, z: number, x2: number, z2: number) => Math.atan2(x2 - x, z2 - z);

  let cur = -1;
  let busy = false;
  let started = false;
  let tl: gsap.core.Timeline | null = null;

  const goTo = (i: number) => {
    i = THREE.MathUtils.clamp(i, 0, ACTS.length - 1);
    if (i === cur || busy) return;
    const dir = i > cur ? 1 : -1;
    const from = cur;
    cur = i;
    busy = true;
    hud.close();
    const id = ACTS[i];
    const spot = world.spots[id];
    tl?.kill();
    tl = gsap.timeline({ defaults: { ease: "power2.inOut" }, onComplete: () => (busy = false) });

    const standing = D.seated < 0.5;
    let t = 0;
    if (from < 0) {
      tl.to(cam, { ...spot.cam, duration: 2.2, ease: "power3.inOut" }, 0);
      tl.call(() => hud.show(slideOf(id), 1), [], 1.1);
      sfxWhoosh();
      return;
    }
    sfxWhoosh();
    if (id === "desk") {
      if (standing) {
        const d1 = Math.abs(P.x - F.chair.x) / 3.6;
        tl.set(D, { walk: 1, facing: face(P.x, P.z, F.chair.x, WALK_Z), look: 0.2 }, 0);
        tl.to(P, { x: F.chair.x, z: WALK_Z, duration: Math.max(0.5, d1), ease: "none" }, 0);
        t = Math.max(0.5, d1);
        tl.set(D, { facing: Math.PI }, t);
        tl.to(P, { z: F.chair.z, duration: 0.35, ease: "power1.inOut" }, t);
        tl.to(D, { walk: 0, seated: 1, duration: 0.55 }, t + 0.25);
        tl.to(world.chair.position, { z: F.chair.z, duration: 0.4 }, t + 0.3);
      }
      tl.to(cam, { ...spot.cam, duration: Math.max(1.4, t + 0.6), ease: "power3.inOut" }, 0);
    } else {
      if (!standing) {
        tl.to(world.chair.position, { z: F.desk.z + 0.5, duration: 0.3 }, 0);
        tl.to(D, { seated: 0, duration: 0.5 }, 0.05);
        tl.to(P, { z: WALK_Z, duration: 0.4, ease: "power1.inOut" }, 0.3);
        t = 0.65;
      }
      const dist = Math.abs(P.x - spot.x);
      const wd = THREE.MathUtils.clamp(dist / 3.6, 0.45, 2.4);
      tl.set(D, { walk: 1, facing: face(P.x, WALK_Z, spot.x, spot.z), look: 0.15, wave: 0 }, t);
      tl.to(P, { x: spot.x, z: spot.z, duration: wd, ease: "none" }, t);
      const arrive = t + wd;
      const finalFacing = face(spot.x, spot.z, spot.cam.px, spot.cam.pz) + (id === "balcony" ? 0 : -0.3);
      tl.to(D, { walk: 0, facing: finalFacing, look: 1, wave: id === "balcony" ? 1 : 0, duration: 0.35 }, arrive);
      tl.to(cam, { ...spot.cam, duration: Math.max(1.4, arrive + 0.4), ease: "power3.inOut" }, 0);
      if (id === "war" && from === 0) tl.call(() => { dog.bark = 1; sfxBark(); }, [], t + 0.35);
    }
    tl.call(() => hud.show(slideOf(id), dir), [], Math.min(0.55, t + 0.3));
  };

  const jumpTo = (id: string) => goTo(ACTS.indexOf(id));
  if (import.meta.env.DEV) (window as unknown as { __d: unknown }).__d = { cam, dog, davi, goTo };
  hud.onJump(jumpTo);

  const begin = async () => {
    if (started) return;
    started = true;
    await hud.dismissIntro();
    goTo(0);
  };

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let mugHits = 0;
  let typed = "";
  let plantHits = 0;
  let ballBusy = false;

  const nightOn = () => {
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
    gsap.to(renderer, { toneMappingExposure: on ? 0.9 : 1.05, duration: 0.8 });
    hud.toast(on ? "modo noite · só o abajur" : "luz do dia");
    sfxPop(on ? 330 : 520);
  };

  const pack = () => {
    world.packItems.forEach((it, i) => {
      gsap.to(it.position, {
        x: world.knapsack.position.x,
        y: world.knapsack.position.y + 0.25,
        z: world.knapsack.position.z,
        duration: 0.5,
        delay: i * 0.08,
        ease: "back.in(1.4)",
        onComplete: () => gsap.to(it.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.2 }),
      });
    });
    gsap.fromTo(world.knapsack.scale, { x: 1, y: 1 }, { x: 1.12, y: 0.9, duration: 0.25, yoyo: true, repeat: 1, delay: 0.5 });
    hud.toast("TCC · leilão da mochila");
    sfxPop(440);
    const card = inspectCard("tcc", "tcc");
    if (card) hud.open(card);
  };

  const onPick = (kind: string, id: string) => {
    sfxClick();
    if (kind === "link") {
      window.open(id, "_blank", "noopener");
      return;
    }
    if (kind === "egg") {
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
          D.wave = 1;
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
            const c = world.night.on ? "#2a4a6e" : "#0b1020";
            gsap.to(m.color, { r: new THREE.Color(c).r, g: new THREE.Color(c).g, b: new THREE.Color(c).b, duration: 0.6 });
            gsap.to(m.emissive, { r: new THREE.Color(c).r, g: new THREE.Color(c).g, b: new THREE.Color(c).b, duration: 0.6 });
          });
          hud.toast("São Paulo lá fora");
          return;
        }
        case "lights": {
          world.bulbs.forEach((b, i) => gsap.fromTo((b.material as THREE.MeshStandardMaterial), { emissiveIntensity: 0 }, { emissiveIntensity: 1.8, duration: 0.3, delay: i * 0.05 }));
          hud.toast("luzinha da varanda");
          sfxPop(800);
          return;
        }
        case "ball": {
          if (ballBusy) return;
          ballBusy = true;
          gsap.timeline({ onComplete: () => (ballBusy = false) })
            .to(world.ball.position, { y: 1.1, duration: 0.35, ease: "power2.out" })
            .to(world.ball.position, { y: 0.14, duration: 0.4, ease: "bounce.out" });
          gsap.to(world.ball.rotation, { x: "+=6", duration: 0.75 });
          hud.toast("gol");
          return;
        }
      }
    }
    if (kind === "tcc") return pack();
    if (kind === "cork" || kind === "cv") {
      const card = inspectCard("cork", "cv");
      if (card) hud.open(card);
      return;
    }
    if (kind === "act") return jumpTo(id);
    if (kind === "experience" && id === "flash") world.cycleNote();
    const card = inspectCard(kind, id);
    if (card) hud.open(card);
  };
  hud.onChip(onPick);

  const uiHit = (e: Event) => !!(e.target as HTMLElement).closest?.("button, a, #dossier, #rail, #intro");

  const hitPick = (e: PointerEvent) => {
    if (uiHit(e)) {
      document.body.style.cursor = "";
      return;
    }
    ndc.set((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(pickables, true);
    let pick: { kind: string; id: string } | null = null;
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o) {
        if (o.userData.pick) {
          pick = o.userData.pick;
          break;
        }
        o = o.parent;
      }
      if (pick) break;
    }
    document.body.style.cursor = pick ? "pointer" : "";
    if (e.type === "pointerdown" && pick) onPick(pick.kind, pick.id);
  };

  window.addEventListener("pointermove", (e) => {
    lookX((e.clientX / innerWidth) * 2 - 1);
    lookY(-((e.clientY / innerHeight) * 2 - 1));
    davi.look.x = look.x;
    davi.look.y = look.y;
    if (started) hitPick(e);
  }, { signal });
  window.addEventListener("pointerdown", (e) => {
    if (!started) return void begin();
    hitPick(e);
  }, { signal });

  window.addEventListener("keydown", (e) => {
    if (!started) return void begin();
    if (e.key === "Escape") return hud.close();
    if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " " || e.key === "PageDown") {
      e.preventDefault();
      return goTo(cur + 1);
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      return goTo(cur - 1);
    }
    if (/^[1-6]$/.test(e.key)) return goTo(Number(e.key) - 1);
    if (e.key === "c" || e.key === "C") hud.copyMail();
    if (e.key === "m" || e.key === "M") onPick("cork", "cv");
    if (e.key === "s" || e.key === "S") onPick("egg", "speaker");
    typed = (typed + e.key.toLowerCase()).slice(-8);
    if (typed.includes("banguela")) {
      onPick("egg", "banguela");
      typed = "";
    }
  }, { signal });

  let lastWheel = 0;
  const uiScroll = (e: Event) => !!(e.target as HTMLElement | null)?.closest?.("#dossier, #dossier-sheet, #rail");
  const obs = Observer.create({
    type: "wheel,touch",
    wheelSpeed: -1,
    tolerance: 12,
    ignore: "#dossier, #dossier-sheet, #rail",
    ignoreCheck: (event) => hud.isOpen() || uiScroll(event),
    preventDefault: true,
    onUp: () => {
      if (hud.isOpen()) return;
      if (!started) return void begin();
      if (performance.now() - lastWheel < 700) return;
      lastWheel = performance.now();
      goTo(cur + 1);
    },
    onDown: () => {
      if (hud.isOpen()) return;
      if (!started) return void begin();
      if (performance.now() - lastWheel < 700) return;
      lastWheel = performance.now();
      goTo(cur - 1);
    },
  });
  stage.querySelector("#sound")?.addEventListener("click", () => onPick("egg", "speaker"), { signal });
  stage.querySelector("#open-index")?.addEventListener("click", () => onPick("cork", "cv"), { signal });
  stage.querySelector("#intro .cta")?.addEventListener("click", () => void begin(), { signal });

  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    if (innerWidth > 900) camera.setViewOffset(innerWidth, innerHeight, -innerWidth * 0.17, innerHeight * 0.02, innerWidth, innerHeight);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize, { signal });

  const clock = new THREE.Clock();
  const target = new THREE.Vector3();
  let raf = 0;
  let beat = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    davi.update(dt, t);
    dog.update(t);
    world.boards.forEach((b) => b.update(t));
    if (musicOn()) {
      const b = Math.floor(t * 2);
      if (b !== beat) {
        beat = b;
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
    target.set(cam.tx, cam.ty, cam.tz);
    camera.position.set(cam.px + look.x * 0.28, cam.py + look.y * 0.14, cam.pz);
    camera.lookAt(target);
    renderer.render(scene, camera);
  };
  loop();

  stopPrev = () => {
    cancelAnimationFrame(raf);
    ac.abort();
    obs.kill();
    tl?.kill();
    renderer.dispose();
  };
}
