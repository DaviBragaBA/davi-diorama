import * as THREE from "three";
import { G, P, clay, emissive, mesh } from "./clay";
import { billboard, corkBoard, deskModes, idBadge, liveBars, namePlate, noteModes, type LiveBoard } from "./boards";
import { education, experiences, projects } from "./data";
import { F, SPOTS_XZ } from "./path";

export type PickHit = { kind: string; id: string };

export type World = {
  group: THREE.Group;
  chair: THREE.Group;
  pickables: THREE.Object3D[];
  boards: LiveBoard[];
  monitor: THREE.Mesh;
  /** The desk PC screen: redraws itself while on screen. */
  desk: { update: (t: number) => void; replay: () => void };
  cycleDesk: () => string;
  cycleNote: () => string;
  mug: THREE.Mesh;
  lamp: THREE.Group;
  lampLight: THREE.PointLight;
  /** The lamp's paper shade (its material may be swapped by the hover highlight, so keep the mesh). */
  lampShade: THREE.Mesh;
  pendant: THREE.PointLight;
  key: THREE.DirectionalLight;
  monLight: THREE.PointLight;
  /** The colored light of each room, for the room-by-room lighting of the tour. */
  roomLights: THREE.PointLight[];
  knapsack: THREE.Group;
  packItems: THREE.Mesh[];
  steam: THREE.Group;
  speaker: THREE.Group;
  vinyl: THREE.Group;
  ball: THREE.Mesh;
  plants: THREE.Group[];
  bulbs: THREE.Mesh[];
  badge: THREE.Group;
  sky: THREE.Mesh[];
  night: { on: boolean };
  /** Day/night blend (1 = daylight, the default) and the window "dusk" gag; `applyLook` paints both. */
  look: { day: number; dusk: number };
  applyLook: () => void;
  /** Drifting dust in the sun shafts (frozen when `still`). */
  updateDust: (t: number, still: boolean) => void;
  spots: Record<string, { x: number; z: number; cam: Cam }>;
};

export type Cam = { px: number; py: number; pz: number; tx: number; ty: number; tz: number };

function tag(o: THREE.Object3D, kind: string, id: string) {
  o.userData.pick = { kind, id } satisfies PickHit;
  o.traverse((c) => {
    c.userData.pick = o.userData.pick;
  });
  return o;
}

function plant(x: number, z: number, s = 1) {
  const g = new THREE.Group();
  g.add(mesh(G.cyl(0.14 * s, 0.11 * s, 0.24 * s, 16), P.pot, 0, 0.12 * s, 0));
  const leaves = new THREE.Group();
  leaves.position.y = 0.24 * s;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const leaf = mesh(G.cap(0.035 * s, 0.22 * s), P.plant, Math.cos(a) * 0.07 * s, 0.14 * s, Math.sin(a) * 0.07 * s);
    leaf.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    leaves.add(leaf);
  }
  leaves.add(mesh(G.cap(0.04 * s, 0.3 * s), P.plant, 0, 0.18 * s, 0));
  g.add(leaves);
  g.position.set(x, 0, z);
  tag(g, "egg", "plant");
  return g;
}

function starChair() {
  const chair = new THREE.Group();
  chair.add(mesh(G.rbox(0.52, 0.08, 0.52, 0.06), P.chairSeat, 0, 0.52, 0));
  chair.add(mesh(G.rbox(0.5, 0.56, 0.1, 0.05), P.chairSeat, 0, 0.86, 0.22));
  chair.add(mesh(G.cyl(0.045, 0.045, 0.42, 12), P.black, 0, 0.28, 0));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const arm = mesh(G.rbox(0.38, 0.045, 0.07, 0.02), P.black, Math.cos(a) * 0.16, 0.055, Math.sin(a) * 0.16);
    arm.rotation.y = -a;
    chair.add(arm);
    chair.add(mesh(G.sphere(0.055, 12), P.metal, Math.cos(a) * 0.34, 0.055, Math.sin(a) * 0.34));
  }
  return chair;
}

function table(w: number, d: number, h: number, x: number, z: number, top = P.wood, leg = P.black) {
  const g = new THREE.Group();
  g.add(mesh(G.rbox(w, 0.06, d, 0.03), top, x, h, z));
  const inset = 0.08;
  for (const [sx, sz] of [
    [-w / 2 + inset, -d / 2 + inset],
    [w / 2 - inset, -d / 2 + inset],
    [-w / 2 + inset, d / 2 - inset],
    [w / 2 - inset, d / 2 - inset],
  ]) {
    g.add(mesh(G.cyl(0.03, 0.035, h - 0.03, 10), leg, x + sx, (h - 0.03) / 2, z + sz));
  }
  return g;
}

/** Wall between two rooms: two posts and a tall header, so the doorway frames the next room. */
function divider(x: number, hex: string) {
  const g = new THREE.Group();
  g.add(mesh(G.rbox(0.16, 2.9, 1.7, 0.03), hex, x, 1.45, -2.15));
  g.add(mesh(G.rbox(0.16, 2.9, 1.1, 0.03), hex, x, 1.45, 1.85));
  g.add(mesh(G.rbox(0.16, 2.85, 4.3, 0.03), hex, x, 4.03, -0.85));
  return g;
}

function boombox() {
  const g = new THREE.Group();
  g.add(mesh(G.rbox(0.46, 0.24, 0.2, 0.04), "#15161a", 0, 0.14, 0));
  for (const sx of [-0.13, 0.13]) {
    g.add(mesh(G.cyl(0.075, 0.075, 0.03, 20), "#2a2c33", sx, 0.14, 0.1));
    g.add(mesh(G.cyl(0.03, 0.03, 0.035, 12), P.accent, sx, 0.14, 0.105));
  }
  g.add(mesh(G.rbox(0.1, 0.04, 0.02, 0.008), P.accent, 0, 0.2, 0.105));
  tag(g, "egg", "speaker");
  return g;
}

function vinyl() {
  const g = new THREE.Group();
  g.add(mesh(G.rbox(0.42, 0.06, 0.36, 0.02), P.wood2, 0, 0.03, 0));
  const disc = new THREE.Group();
  disc.name = "disc";
  disc.position.y = 0.07;
  disc.add(mesh(G.cyl(0.15, 0.15, 0.012, 32), "#0f1013", 0, 0, 0));
  disc.add(mesh(G.cyl(0.05, 0.05, 0.014, 20), P.accent, 0, 0.002, 0));
  g.add(disc);
  const arm = mesh(G.rbox(0.02, 0.015, 0.2, 0.005), P.metal, 0.15, 0.1, -0.06);
  arm.rotation.y = -0.4;
  g.add(arm);
  tag(g, "egg", "vinyl");
  return g;
}

function windowPane(x: number, y: number, z: number, w: number, h: number) {
  const g = new THREE.Group();
  g.add(mesh(G.rbox(w + 0.14, h + 0.14, 0.08, 0.02), P.wood2, x, y, z - 0.01));
  const sky = new THREE.Mesh(G.plane(w, h), emissive("#2a4a6e", 0.7));
  sky.position.set(x, y, z + 0.035);
  sky.name = "sky";
  g.add(sky);
  g.add(mesh(G.rbox(0.035, h, 0.05, 0.005), P.wood2, x, y, z + 0.04));
  g.add(mesh(G.rbox(w, 0.035, 0.05, 0.005), P.wood2, x, y, z + 0.04));
  tag(g, "egg", "window");
  return g;
}

/** Back wall rises well above the camera's top edge, so no empty band shows over the room. */
export const WALL_H = 5.5;
function room(g: THREE.Group, x: number, w: number, floor: string, wall: string, beam: string) {
  g.add(mesh(G.rbox(w, 0.14, 7.4, 0.04), floor, x, -0.07, 0.15));
  g.add(mesh(G.rbox(w, WALL_H, 0.18, 0.03), wall, x, WALL_H / 2 - 0.03, -3.12));
  // a wooden beam with a warm LED strip under it: the glow along the wall is a light fixture, not a seam
  g.add(mesh(G.rbox(w, 0.14, 0.36, 0.03), beam, x, 3.12, -2.9));
  const led = new THREE.Mesh(G.rbox(w - 0.5, 0.035, 0.06, 0.01), emissive("#ffe2a8", 1.5));
  led.position.set(x, 3.02, -2.78);
  g.add(led);
  const base = mesh(G.rbox(w, 0.12, 0.05, 0.01), "#0f1013", x, 0.06, -3.0);
  g.add(base);
}

/** A soft shaft of light from a window to the floor: one additive quad with a fading gradient. */
function sunShaft(x: number, y: number, z: number, w: number, h: number, reach: number, lean: number) {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const gr = ctx.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, "rgba(255,226,170,0)");
  gr.addColorStop(0.5, "rgba(255,226,170,0.5)");
  gr.addColorStop(1, "rgba(255,226,170,0.95)");
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, 4, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.BufferGeometry();
  const x0 = x - w / 2;
  const x1 = x + w / 2;
  const top = y + h / 2;
  const bot = y - h / 2;
  // the top edge sits on the window, the foot lands on the floor `reach` further into the room and `lean` to the right
  geo.setAttribute("position", new THREE.Float32BufferAttribute([x0, top, z, x1, top, z, x0 + lean, 0.03, z + reach, x1 + lean, 0.03, z + reach, x0, bot, z, x1, bot, z], 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1], 2));
  geo.setIndex([0, 1, 2, 1, 3, 2]);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false }));
  m.name = "shaft";
  m.renderOrder = 2;
  return m;
}

/**
 * Builds the apartment. `pause` is awaited between rooms so the browser can paint the loader
 * and answer input instead of running one long task.
 */
export async function buildWorld(pause: () => Promise<void> = async () => {}): Promise<World> {
  const g = new THREE.Group();
  const pickables: THREE.Object3D[] = [];
  const boards: LiveBoard[] = [];
  const plants: THREE.Group[] = [];
  const addPick = (o: THREE.Object3D) => {
    pickables.push(o);
    g.add(o);
    return o;
  };

  // each surface is registered with a day colour (warm, the default) and the original night colour
  const themed: { m: THREE.MeshStandardMaterial; day: THREE.Color; night: THREE.Color }[] = [];
  const th = (day: string, night: string) => {
    if (!themed.some((t) => t.m === clay(day))) themed.push({ m: clay(day), day: new THREE.Color(day), night: new THREE.Color(night) });
    return day;
  };
  room(g, -0.6, 9.2, th("#a8794a", P.floorWood), th("#ead6b6", P.wall), th("#b98d5c", P.wallLight));
  room(g, 6.15, 5.2, th("#a8887a", "#161a24"), th("#dccfe4", "#1d2231"), th("#9f86b4", "#252c40"));
  room(g, 11.2, 5.2, th("#b4865c", "#1f1a18"), th("#f2d2ac", "#2a221e"), th("#cf8f5a", "#362b26"));
  room(g, 16.15, 5.2, th("#aa9668", "#161d1a"), th("#d3e0be", "#1c2622"), th("#86a56f", "#26332d"));
  room(g, 21.2, 5.2, th("#8eaa9c", "#0e1a1c"), th("#c4e3da", "#122428"), th("#5fb0a2", "#1a3338"));
  room(g, 26.4, 5.4, th("#b89c62", "#121419"), th("#f4dfa8", "#181b22"), th("#d8a93f", "#242831"));
  g.add(mesh(G.rbox(0.18, WALL_H, 4.6, 0.03), th("#ead6b6", P.wall), -5.3, WALL_H / 2 - 0.03, -0.9));
  g.add(mesh(G.rbox(0.22, WALL_H, 4.8, 0.03), th("#e8d4a4", "#181b22"), 29.05, WALL_H / 2 - 0.03, -0.7));
  g.add(divider(3.55, th("#d9bd96", P.wallLight)));
  g.add(divider(8.7, th("#cdbfd9", "#1d2231")));
  g.add(divider(13.85, th("#e3c19a", "#2a221e")));
  g.add(divider(18.9, th("#c3d3ae", "#1c2622")));
  g.add(divider(23.85, th("#b6d6cc", "#122428")));

  // Light plan: every light has a daylight and a night value; `applyLook` blends them by look.day.
  // Night is the old moody look (cool low hemisphere, small colored lamps in each room).
  const lightPlan: { l: THREE.Light; i: [number, number]; c: [string, string]; g?: [string, string] }[] = [];
  const plan = <T extends THREE.Light>(l: T, i: [number, number], c: [string, string], gc?: [string, string]) => {
    lightPlan.push({ l, i, c, g: gc });
    return l;
  };
  const hemi = plan(new THREE.HemisphereLight("#fff4e2", "#d2b48e", 1.15), [1.15, 0.55], ["#fff4e2", "#8fa3c4"], ["#d2b48e", "#1a1410"]);
  g.add(hemi);
  const key = plan(new THREE.DirectionalLight("#ffe0b0", 2.4), [2.4, 2.1], ["#ffe0b0", "#ffe7c8"]);
  key.position.set(-6, 9, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -16;
  key.shadow.camera.right = 24;
  key.shadow.camera.top = 10;
  key.shadow.camera.bottom = -6;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 52;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.04;
  key.target.position.set(8, 0, -1);
  g.add(key, key.target);
  const fill = plan(new THREE.DirectionalLight("#ffd6a8", 0.3), [0.3, 0.35], ["#ffd6a8", "#6f86ff"]);
  fill.position.set(10, 4, -6);
  g.add(fill);
  // rim from behind and above: a sun glow by day, a cool edge light at night, so the clay figures stay apart from the walls
  const rim = plan(new THREE.DirectionalLight("#ffe9cf", 0.45), [0.45, 0.6], ["#ffe9cf", "#9fb4ff"]);
  rim.position.set(4, 2.6, -9);
  rim.target.position.set(6, 1, 2);
  g.add(rim, rim.target);
  const roomLights: THREE.PointLight[] = [];
  // the room's hue is mixed with warm window light by day, so rooms read as colored daylight, not as backlight
  const WARM = new THREE.Color("#ffd9a8");
  for (const [x, c] of [
    [-2.6, "#ffcf9a"],
    [6.15, "#7c5cff"],
    [11.2, "#ff9a5c"],
    [16.15, "#5cffb1"],
    [21.2, "#4df0d0"],
    [26.4, "#ffd85c"],
  ] as const) {
    const night = x > 24 ? 11 : 6;
    const pl = plan(new THREE.PointLight(c, night, 7, 1.8), [night * 1.1, night], ["#" + new THREE.Color(c).lerp(WARM, 0.62).getHexString(), c]);
    pl.position.set(x, 2.5, -1.2);
    pl.distance = 10;
    g.add(pl);
    roomLights.push(pl);
  }

  const cork = corkBoard(-2.35, 1.72, -3.0);
  addPick(cork);
  g.add(mesh(G.rbox(3.14, 2.28, 0.05, 0.015), "#0f1013", -2.35, 1.72, -3.04));

  const photo = new THREE.TextureLoader().load("/fotos/cachorro.jpeg");
  photo.colorSpace = THREE.SRGBColorSpace;
  const frame = new THREE.Mesh(G.plane(0.78, 0.98), new THREE.MeshStandardMaterial({ map: photo, roughness: 0.7 }));
  frame.position.set(-0.28, 1.7, -3.0);
  tag(frame, "egg", "photo");
  addPick(frame);
  g.add(mesh(G.rbox(0.9, 1.1, 0.05, 0.015), P.paper, -0.28, 1.7, -3.04));

  const win = windowPane(-4.55, 1.85, -3.02, 1.15, 1.05);
  addPick(win);
  const shafts: THREE.Mesh[] = [sunShaft(-4.55, 1.85, -2.98, 1.15, 1.05, 2.2, 1.4)];
  await pause();

  const sofaX = F.sofa.x;
  g.add(mesh(G.rbox(2.15, 0.42, 0.92, 0.1), P.sofa, sofaX, 0.38, F.sofa.z));
  g.add(mesh(G.rbox(2.15, 0.52, 0.24, 0.08), P.sofa2, sofaX, 0.78, F.sofa.z - 0.35));
  for (const sx of [-0.95, 0.95]) g.add(mesh(G.rbox(0.22, 0.34, 0.9, 0.08), P.sofa2, sofaX + sx, 0.62, F.sofa.z));
  g.add(mesh(G.rbox(0.38, 0.28, 0.16, 0.06), P.accent, sofaX - 0.5, 0.74, F.sofa.z + 0.07));
  g.add(mesh(G.rbox(0.38, 0.28, 0.16, 0.06), P.paper, sofaX + 0.45, 0.74, F.sofa.z + 0.07));
  g.add(mesh(G.cyl(1.25, 1.25, 0.02, 48), P.rug, sofaX - 0.3, 0.01, -0.75));
  g.add(table(0.95, 0.55, 0.38, F.coffee.x, F.coffee.z, P.wood, P.black));
  const p1 = plant(-4.1, -1.7, 1.2);
  plants.push(p1);
  addPick(p1);

  const clock = billboard("21:47", "hora de rolar", -5.18, 1.9, 0.35, 0.9, 0.5, "#11141b");
  clock.rotation.y = Math.PI / 2;
  tag(clock, "egg", "clock");
  addPick(clock);

  const disc = vinyl();
  disc.position.set(F.coffee.x + 0.1, 0.41, F.coffee.z);
  addPick(disc);

  await pause();
  const deskX = F.desk.x;
  const deskZ = F.desk.z;
  g.add(mesh(G.rbox(1.95, 0.07, 0.98, 0.03), P.desk, deskX, 0.76, deskZ));
  for (const [sx, sz] of [
    [-0.85, -0.4],
    [0.85, -0.4],
    [-0.85, 0.4],
    [0.85, 0.4],
  ]) {
    g.add(mesh(G.rbox(0.07, 0.72, 0.07, 0.015), P.black, deskX + sx, 0.36, deskZ + sz));
  }
  g.add(mesh(G.rbox(1.78, 0.04, 0.05, 0.01), P.black, deskX, 0.2, deskZ - 0.4));
  g.add(mesh(G.rbox(1.78, 0.04, 0.05, 0.01), P.black, deskX, 0.2, deskZ + 0.4));

  g.add(mesh(G.rbox(1.02, 0.62, 0.05, 0.02), P.screen, deskX + 0.08, 1.24, deskZ - 0.3));
  g.add(mesh(G.rbox(0.08, 0.2, 0.08, 0.01), P.black, deskX + 0.08, 0.86, deskZ - 0.3));
  g.add(mesh(G.rbox(0.3, 0.02, 0.16, 0.005), P.black, deskX + 0.08, 0.8, deskZ - 0.3));
  const desk = deskModes();
  const monitor = new THREE.Mesh(G.plane(0.92, 0.52), new THREE.MeshStandardMaterial({ map: desk.tex, emissive: "#ffffff", emissiveMap: desk.tex, emissiveIntensity: 1.25, roughness: 0.5 }));
  monitor.position.set(deskX + 0.08, 1.24, deskZ - 0.272);
  tag(monitor, "egg", "monitor");
  addPick(monitor);
  const monLight = new THREE.PointLight("#8fb4ff", 2.2, 2.8, 2);
  monLight.position.set(deskX + 0.08, 1.2, deskZ + 0.2);
  g.add(monLight);
  g.add(mesh(G.rbox(0.56, 0.02, 0.2, 0.01), "#2a2c33", deskX - 0.22, 0.8, deskZ + 0.16));
  const mug = mesh(G.cyl(0.05, 0.045, 0.1, 18), P.accent, deskX + 0.58, 0.84, deskZ + 0.2);
  tag(mug, "egg", "mug");
  addPick(mug);
  const steam = new THREE.Group();
  steam.position.copy(mug.position);
  steam.visible = false;
  for (let i = 0; i < 5; i++) steam.add(new THREE.Mesh(G.sphere(0.016, 8), new THREE.MeshBasicMaterial({ color: "#f2ede4", transparent: true, opacity: 0.5 })));
  steam.children.forEach((c, i) => c.position.set((i - 2) * 0.02, 0.12, 0));
  g.add(steam);

  const chair = starChair();
  chair.position.set(F.chair.x, 0, F.chair.z);
  g.add(chair);
  g.add(mesh(G.cyl(1.15, 1.15, 0.02, 48), P.rug2, deskX, 0.01, 0.05));
  g.add(mesh(G.cyl(0.78, 0.78, 0.022, 48), P.rug, deskX, 0.014, 0.05));
  const p2 = plant(deskX - 1.55, 0.55, 0.75);
  plants.push(p2);
  addPick(p2);

  const lamp = new THREE.Group();
  lamp.position.set(F.lamp.x, 0, F.lamp.z);
  lamp.add(mesh(G.cyl(0.2, 0.22, 0.05, 20), P.black, 0, 0.025, 0));
  lamp.add(mesh(G.cyl(0.022, 0.022, 1.5, 10), P.metal, 0, 0.8, 0));
  // the shade glows a little, as paper does with a bulb inside; bloom picks it up
  const lampShade = new THREE.MeshStandardMaterial({ color: P.paper, roughness: 0.9, side: THREE.DoubleSide, emissive: new THREE.Color("#ffd9a0"), emissiveIntensity: 0.32 });
  const shade = new THREE.Mesh(G.cyl(0.2, 0.3, 0.32, 24, true), lampShade);
  shade.position.y = 1.6;
  shade.castShadow = true;
  lamp.add(shade);
  const bulb = new THREE.Mesh(G.sphere(0.05, 12), emissive("#ffe2a8", 3.2));
  bulb.position.y = 1.55;
  lamp.add(bulb);
  const lampLight = plan(new THREE.PointLight("#ffd9a0", 4, 6, 1.6), [4, 14], ["#ffd9a0", "#ffd9a0"]);
  lampLight.position.set(0, 1.5, 0);
  lampLight.castShadow = false;
  lamp.add(lampLight);
  tag(lamp, "egg", "lamp");
  addPick(lamp);

  g.add(mesh(G.cyl(0.01, 0.01, 0.62), P.metal, deskX, 2.62, deskZ));
  const pendShade = new THREE.Mesh(G.cyl(0.12, 0.24, 0.2, 24, true), new THREE.MeshStandardMaterial({ color: "#15161a", roughness: 0.6, side: THREE.DoubleSide }));
  pendShade.position.set(deskX, 2.3, deskZ);
  g.add(pendShade);
  g.add(new THREE.Mesh(G.sphere(0.04, 12), emissive("#ffe2a8", 3.4)).translateX(deskX).translateY(2.27).translateZ(deskZ));
  const pendant = plan(new THREE.PointLight("#ffe2a8", 5, 5.5, 1.6), [5, 16], ["#ffe2a8", "#ffe2a8"]);
  pendant.position.set(deskX, 2.2, deskZ);
  pendant.castShadow = true;
  pendant.shadow.mapSize.set(1024, 1024);
  pendant.shadow.bias = -0.002;
  g.add(pendant);

  await pause();
  const speaker = boombox();
  speaker.position.set(deskX + 1.25, 0, -0.2);
  addPick(speaker);

  const duck = mesh(G.sphere(0.06), "#f0c56e", deskX - 0.55, 0.84, deskZ + 0.22);
  duck.add(mesh(G.sphere(0.04), "#f0c56e", 0, 0.05, 0.03));
  duck.add(mesh(G.cyl(0.012, 0.02, 0.03, 8), "#e07d4a", 0, 0.045, 0.075).rotateX(Math.PI / 2));
  tag(duck, "egg", "duck");
  addPick(duck);

  const trophy = new THREE.Group();
  trophy.position.set(deskX - 0.78, 0.8, deskZ + 0.02);
  trophy.add(mesh(G.cyl(0.05, 0.06, 0.03, 12), P.black, 0, 0.015, 0));
  trophy.add(mesh(G.cyl(0.012, 0.012, 0.06, 8), "#e8b84a", 0, 0.06, 0));
  trophy.add(mesh(G.cyl(0.045, 0.02, 0.08, 14), "#e8b84a", 0, 0.13, 0));
  tag(trophy, "egg", "trophy");
  addPick(trophy);

  await pause();
  const warX = 6.15;
  const limit = liveBars("Limit policy", "monitoria · core limit", warX, 1.85, -3.0, 2.7, 1.62);
  tag(limit.mesh, "experience", "nubank");
  addPick(limit.mesh);
  boards.push(limit);
  g.add(mesh(G.rbox(2.82, 1.74, 0.05, 0.015), "#0f1013", warX, 1.85, -3.05));
  const short = ["Views", "Perdas", "Regras", "Bandas"];
  projects.slice(0, 4).forEach((p, i) => {
    const plate = namePlate(short[i], p.tags[0], warX - 1.1 + i * 0.74, 0.86, -3.0, 0.66, 0.37);
    tag(plate, "project", p.id);
    addPick(plate);
  });
  const p3 = plant(warX + 1.75, 0.15, 0.8);
  plants.push(p3);
  addPick(p3);
  const poster = namePlate("nu", "core limit", warX - 2.0, 1.75, -3.0, 0.7, 0.9, "#4a1a8a");
  tag(poster, "experience", "nubank");
  addPick(poster);
  const server = new THREE.Group();
  server.position.set(warX + 2.05, 0, -2.5);
  server.add(mesh(G.rbox(0.6, 1.9, 0.6, 0.03), "#11141b", 0, 0.95, 0));
  for (let i = 0; i < 8; i++) server.add(new THREE.Mesh(G.rbox(0.04, 0.04, 0.02, 0.005), emissive(i % 3 ? P.accent : "#ff5c5c", 2)).translateX(-0.2 + (i % 4) * 0.13).translateY(1.6 - Math.floor(i / 4) * 0.2).translateZ(0.31));
  g.add(server);

  await pause();
  const flashX = 11.2;
  g.add(mesh(G.cyl(1.1, 1.1, 0.02, 48), "#3a2a24", flashX, 0.01, 0.1));
  const flash = liveBars("Sales & CS", "flash · metabase", flashX, 1.85, -3.0, 2.5, 1.5, "PIPELINE · MÊS", 31.2);
  tag(flash.mesh, "experience", "flash");
  addPick(flash.mesh);
  boards.push(flash);
  g.add(mesh(G.rbox(2.62, 1.62, 0.05, 0.015), "#0f1013", flashX, 1.85, -3.05));
  const jobs = experiences.slice(1, 7);
  jobs.forEach((e, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const card = namePlate(e.company.split(" ")[0].replace("Associação", "Atlética").replace("Estágio", "UNIFEI"), e.period ?? "", flashX - 1.05 + col * 0.92, 0.9 - row * 0.5, -2.98, 0.84, 0.42, "#1a1614");
    tag(card, "experience", e.id);
    addPick(card);
  });
  g.add(table(1.3, 0.65, 0.74, F.flashTable.x, F.flashTable.z, P.desk, P.black));
  const laptop = new THREE.Group();
  laptop.position.set(F.flashTable.x, 0.77, F.flashTable.z);
  laptop.add(mesh(G.rbox(0.42, 0.02, 0.28, 0.005), "#2a2c33", 0, 0.01, 0));
  const lid = mesh(G.rbox(0.42, 0.28, 0.02, 0.005), "#2a2c33", 0, 0.15, -0.14);
  lid.rotation.x = -0.25;
  laptop.add(lid);
  const note = noteModes();
  const lidScreen = new THREE.Mesh(G.plane(0.38, 0.24), new THREE.MeshStandardMaterial({ map: note.tex, emissive: "#ffffff", emissiveMap: note.tex, emissiveIntensity: 0.95, roughness: 0.45 }));
  lidScreen.position.set(0, 0.15, -0.128);
  lidScreen.rotation.x = -0.25;
  laptop.add(lidScreen);
  tag(laptop, "experience", "flash");
  addPick(laptop);

  await pause();
  const stuX = 16.15;
  const edu = billboard("UNIFEI", "ESPM · formação", stuX, 1.85, -3.0, 2.3, 1.25, "#0f1116");
  tag(edu, "education", "unifei");
  addPick(edu);
  g.add(mesh(G.rbox(2.42, 1.37, 0.05, 0.015), "#0f1013", stuX, 1.85, -3.05));
  const skills = billboard("ESPM", "TCC nota 10", stuX + 1.95, 1.7, -3.0, 1.7, 1.0, "#11141b");
  tag(skills, "education", "espm");
  addPick(skills);
  const shelf = new THREE.Group();
  shelf.position.set(stuX - 1.6, 0, -2.6);
  shelf.add(mesh(G.rbox(1.2, 1.9, 0.3, 0.02), P.wood2, 0, 0.95, 0));
  for (let s = 0; s < 3; s++) {
    shelf.add(mesh(G.rbox(1.1, 0.03, 0.28, 0.005), P.wood, 0, 0.4 + s * 0.55, 0));
    ["#c45c38", "#2d3d52", "#d8ff3d", "#4d7f9c", "#8a5a32", "#2f6d48", "#f2ede4"].forEach((c, i) => {
      if ((i + s) % 3 === 0) return;
      shelf.add(mesh(G.rbox(0.09, 0.3 + (i % 3) * 0.05, 0.22, 0.01), c, -0.45 + i * 0.15, 0.58 + s * 0.55 + (i % 3) * 0.025, 0));
    });
  }
  g.add(shelf);
  [
    { e: education.find((x) => x.id === "espm")!, short: "ESPM", sub: "TCC 10" },
    { e: education.find((x) => x.id === "unifei")!, short: "SI", sub: "2018–23" },
    { e: education.find((x) => x.id === "pos-ia")!, short: "UNIPDS", sub: "2026–27" },
  ].forEach((d, i) => {
    const dip = namePlate(d.short, d.sub, stuX - 0.6 + i * 0.8, 0.92, -2.98, 0.76, 0.4, "#141a17");
    tag(dip, "education", d.e.id);
    addPick(dip);
  });

  const knapsack = new THREE.Group();
  knapsack.position.set(F.knapsack.x, 0.5, F.knapsack.z);
  knapsack.add(mesh(G.rbox(0.42, 0.4, 0.28, 0.07), "#3d4a38", 0, 0.22, 0));
  knapsack.add(mesh(G.rbox(0.2, 0.14, 0.24, 0.04), "#2a3328", 0, 0.46, 0));
  knapsack.add(mesh(G.rbox(0.3, 0.18, 0.06, 0.03), "#2a3328", 0, 0.16, 0.16));
  knapsack.add(namePlate("TCC", "clica", 0, 0.28, 0.155, 0.3, 0.16, "#1a2218"));
  tag(knapsack, "tcc", "tcc");
  addPick(knapsack);
  const packItems: THREE.Mesh[] = [];
  ["#e07d4a", "#7ee2c9", "#d8ff3d", "#8ab4ff"].forEach((c, i) => {
    const it = mesh(G.rbox(0.12, 0.12, 0.12, 0.03), c, F.studioTable.x - 0.3 + i * 0.17, 0.58, F.studioTable.z + 0.24);
    packItems.push(it);
    g.add(it);
  });
  g.add(table(1.2, 0.6, 0.5, F.studioTable.x, F.studioTable.z, P.wood, P.black));

  await pause();
  const labX = 21.2;
  const labBoard = liveBars("n8n", "skills · agentes · dia a dia", labX, 1.85, -3.0, 2.55, 1.5, "FLUXOS NO AR", 24);
  tag(labBoard.mesh, "practice", "dia-a-dia");
  addPick(labBoard.mesh);
  boards.push(labBoard);
  g.add(mesh(G.rbox(2.68, 1.62, 0.05, 0.015), "#0f1013", labX, 1.85, -3.05));
  const labPlates = [
    { t: "n8n", s: "automação", k: "practice", id: "n8n" },
    { t: "Skills", s: "criar", k: "practice", id: "skills-craft" },
    { t: "Agentes", s: "dia a dia", k: "practice", id: "agentes" },
    { t: "Fluxos", s: "pipeline", k: "practice", id: "flux" },
    { t: "MCP", s: "tools", k: "practice", id: "mcp" },
    { t: "Lab", s: "dia a dia", k: "practice", id: "dia-a-dia" },
  ] as const;
  labPlates.forEach((p, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const plate = namePlate(p.t, p.s, labX - 1.05 + col * 0.92, 0.9 - row * 0.48, -2.98, 0.84, 0.4, "#0d1c1e");
    tag(plate, p.k, p.id);
    addPick(plate);
  });
  const models = new THREE.Group();
  models.position.set(labX + 1.85, 0, -0.35);
  ["#4df0d0", "#d8ff3d", "#8ab4ff", "#ff9a5c"].forEach((c, i) => {
    const box = new THREE.Mesh(G.rbox(0.28, 0.22, 0.28, 0.04), emissive(c, 1.1));
    box.position.set(0, 0.16 + i * 0.24, 0);
    box.castShadow = true;
    models.add(box);
  });
  tag(models, "practice", "dia-a-dia");
  addPick(models);
  const pLab = plant(labX - 1.85, 0.2, 0.75);
  plants.push(pLab);
  addPick(pLab);

  await pause();
  const balX = 26.4;
  g.add(mesh(G.rbox(3.6, 0.08, 0.08, 0.02), P.black, balX, 1.05, 1.6));
  for (let i = 0; i <= 10; i++) g.add(mesh(G.cyl(0.015, 0.015, 1.02, 8), P.black, balX - 1.7 + i * 0.34, 0.52, 1.6));
  const sky: THREE.Mesh[] = [];
  for (let i = 0; i < 9; i++) {
    const h = 1.2 + ((i * 7) % 5) * 0.4;
    const b = mesh(G.rbox(0.6 + (i % 3) * 0.2, h, 0.5, 0.02), i % 2 ? "#1a1e28" : "#151820", balX - 3.2 + i * 0.8, h / 2 - 0.2, -4.6 - (i % 2) * 0.6);
    g.add(b);
    for (let w = 0; w < 6; w++) {
      const lit = new THREE.Mesh(G.rbox(0.07, 0.09, 0.02, 0.005), emissive((i + w) % 4 ? "#ffd27a" : "#8fb4ff", 1.2));
      lit.position.set(b.position.x - 0.18 + (w % 3) * 0.18, 0.2 + Math.floor(w / 3) * 0.4 + (i % 2) * 0.3, b.position.z + 0.26);
      g.add(lit);
    }
  }
  const mural = billboard("me chama", "e-mail · linkedin", balX, 1.75, -3.0, 2.6, 1.45, "#0f1116");
  tag(mural, "egg", "mail");
  addPick(mural);
  const badge = new THREE.Group();
  badge.name = "badge";
  badge.position.set(balX - 0.85, 1.42, -2.52);
  badge.add(mesh(G.rbox(0.1, 0.04, 0.03, 0.008), P.metal, 0, 0.24, 0));
  badge.add(mesh(G.cyl(0.008, 0.008, 0.12, 8), P.metal, 0, 0.3, 0));
  badge.add(idBadge(0, 0, 0.02, 0.56, 0.38));
  tag(badge, "egg", "badge");
  addPick(badge);
  const fim = namePlate("fim", "obrigado", balX + 1.95, 1.55, -3.0, 0.8, 0.6, "#2a1f0a");
  tag(fim, "egg", "mail");
  addPick(fim);
  addPick(windowPane(balX - 1.9, 1.75, -3.02, 0.9, 1.1));
  shafts.push(sunShaft(balX - 1.9, 1.75, -2.98, 0.9, 1.1, 2.2, 1.2));
  shafts.forEach((m) => g.add(m));
  // dust motes drifting through the shafts (one Points per shaft, a few dozen specks each)
  const dusts = shafts.map((m) => {
    const n = 36;
    const base = new Float32Array(n * 3);
    const bb = new THREE.Box3().setFromObject(m);
    for (let i = 0; i < n; i++) {
      const u = (i * 0.618034) % 1;
      const v = (i * 0.414214) % 1;
      base[i * 3] = bb.min.x + (bb.max.x - bb.min.x) * (0.1 + 0.8 * u) * 0.9 + 0.2;
      base[i * 3 + 1] = 0.5 + (bb.max.y - 0.7) * v;
      base[i * 3 + 2] = bb.min.z + (bb.max.z - bb.min.z) * (((i * 0.7548) % 1) * 0.8 + 0.1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(base.slice(), 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: "#fff1cf", size: 0.05, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    pts.frustumCulled = false;
    g.add(pts);
    return { pts, base };
  });
  const p4 = plant(balX + 1.45, 0.5, 0.85);
  plants.push(p4);
  addPick(p4);
  const ball = mesh(G.sphere(0.14), P.accent, balX - 0.95, 0.14, 0.4);
  tag(ball, "egg", "ball");
  addPick(ball);
  const bulbs: THREE.Mesh[] = [];
  g.add(mesh(G.cyl(0.006, 0.006, 3.4, 6), P.black, balX, 2.42, -2.6).rotateZ(Math.PI / 2));
  for (let i = 0; i < 9; i++) {
    const bulbM = new THREE.Mesh(G.sphere(0.04, 12), emissive(i % 2 ? "#ffd27a" : P.accent, 1.8));
    bulbM.position.set(balX - 1.6 + i * 0.4, 2.32, -2.6);
    tag(bulbM, "egg", "lights");
    g.add(bulbM);
    pickables.push(bulbM);
    bulbs.push(bulbM);
  }
  const string = plan(new THREE.PointLight("#ffd27a", 4, 5, 1.8), [5, 4], ["#ffd27a", "#ffd27a"]);
  string.position.set(balX, 2.2, -2.2);
  g.add(string);
  roomLights.push(string);

  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && !(o as THREE.Mesh).castShadow) (o as THREE.Mesh).receiveShadow = true;
  });

  const night = { on: false };
  g.traverse((o) => {
    if (o.name === "sky") sky.push(o as THREE.Mesh);
  });

  const look = { day: 1, dusk: 0 };
  const C = new THREE.Color();
  const SKY: [string, string] = ["#9fd3ee", "#2a4a6e"];
  const lerp = THREE.MathUtils.lerp;
  const applyLook = () => {
    const d = look.day;
    for (const { l, i, c, g: gc } of lightPlan) {
      l.intensity = lerp(i[1], i[0], d);
      l.color.set(c[1]).lerp(C.set(c[0]), d);
      if (gc) (l as THREE.HemisphereLight).groundColor.set(gc[1]).lerp(C.set(gc[0]), d);
      l.userData.base = l.intensity;
    }
    for (const t of themed) t.m.color.copy(t.night).lerp(t.day, d);
    (shade.material as THREE.MeshStandardMaterial).emissiveIntensity = lerp(0.9, 0.2, d);
    for (const sh of shafts) (sh.material as THREE.MeshBasicMaterial).opacity = 0.11 * d;
    for (const dust of dusts) dust.pts.visible = d > 0.05;
    for (const s2 of sky) {
      const m = s2.material as THREE.MeshStandardMaterial;
      m.color.set(SKY[1]).lerp(C.set(SKY[0]), d).lerp(C.set("#0b1020"), look.dusk);
      m.emissive.copy(m.color);
    }
  };
  const updateDust = (t: number, still: boolean) => {
    if (still || look.day < 0.05) return;
    for (const { pts, base } of dusts) {
      const a = pts.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < a.count; i++) {
        a.setXYZ(i, base[i * 3] + Math.sin(t * 0.3 + i * 1.7) * 0.18, base[i * 3 + 1] + Math.sin(t * 0.21 + i * 2.3) * 0.14 + ((t * 0.02 * (1 + (i % 3))) % 0.3), base[i * 3 + 2] + Math.cos(t * 0.27 + i) * 0.16);
      }
      a.needsUpdate = true;
    }
  };
  applyLook();

  return {
    group: g,
    chair,
    pickables,
    boards,
    monitor,
    desk: { update: (t) => desk.update(t), replay: () => desk.replay() },
    cycleDesk: () => desk.cycle(),
    cycleNote: () => note.cycle(),
    mug,
    lamp,
    lampLight,
    lampShade: shade,
    pendant,
    key,
    monLight,
    roomLights,
    knapsack,
    packItems,
    steam,
    speaker,
    vinyl: disc,
    ball,
    plants,
    bulbs,
    badge,
    sky,
    night,
    look,
    applyLook,
    updateDust,
    spots: {
      desk: { x: F.chair.x, z: F.chair.z, cam: { px: -1.4, py: 2.7, pz: 6.2, tx: 0.3, ty: 1.15, tz: -0.9 } },
      living: { ...SPOTS_XZ.living, cam: { px: -4.6, py: 2.5, pz: 6.4, tx: -2.7, ty: 0.85, tz: -1.0 } },
      war: { ...SPOTS_XZ.war, cam: { px: 5.1, py: 2.6, pz: 6.2, tx: 6.7, ty: 1.3, tz: -1.6 } },
      flash: { ...SPOTS_XZ.flash, cam: { px: 10.2, py: 2.6, pz: 6.2, tx: 11.7, ty: 1.25, tz: -1.5 } },
      studio: { ...SPOTS_XZ.studio, cam: { px: 15.1, py: 2.6, pz: 6.2, tx: 16.7, ty: 1.25, tz: -1.4 } },
      lab: { ...SPOTS_XZ.lab, cam: { px: 20.1, py: 2.6, pz: 6.2, tx: 21.7, ty: 1.25, tz: -1.4 } },
      balcony: { ...SPOTS_XZ.balcony, cam: { px: 25.1, py: 2.4, pz: 6.4, tx: 26.8, ty: 1.25, tz: -1.2 } },
    },
  };
}
