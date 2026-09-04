import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const mats = new Map<string, THREE.MeshStandardMaterial>();

/** Massinha fosca sob luz real: standard + roughness alta. */
export function clay(hex: string): THREE.MeshStandardMaterial {
  let m = mats.get(hex);
  if (m) return m;
  m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.82, metalness: 0.0 });
  mats.set(hex, m);
  return m;
}

export const G = {
  sphere: (r: number, seg = 32) => new THREE.SphereGeometry(r, seg, seg),
  cap: (r: number, len: number) => new THREE.CapsuleGeometry(r, Math.max(0.001, len), 8, 16),
  cyl: (a: number, b: number, h: number, s = 24, open = false) => new THREE.CylinderGeometry(a, b, h, s, 1, open),
  rbox: (w: number, h: number, d: number, r = 0.1) => new RoundedBoxGeometry(w, h, d, 4, r),
  plane: (w: number, h: number) => new THREE.PlaneGeometry(w, h),
  torus: (r: number, t: number) => new THREE.TorusGeometry(r, t, 10, 28),
};

export function mesh(geo: THREE.BufferGeometry, hex: string, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, clay(hex));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function bone(r: number, len: number, hex: string): THREE.Mesh {
  const m = new THREE.Mesh(G.cap(r, len - r * 2), clay(hex));
  m.position.y = -len / 2;
  m.castShadow = true;
  return m;
}

export function blobShadow(r: number, a = 0.22): THREE.Mesh {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  g.addColorStop(0, `rgba(0,0,0,${a})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
  const m = new THREE.Mesh(G.plane(r * 2, r * 2), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.006;
  return m;
}

export function glow(hex: string, k = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), toneMapped: false });
}

export function emissive(hex: string, k = 1.6): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: hex, emissive: new THREE.Color(hex), emissiveIntensity: k, roughness: 0.4 });
}

/** Brindle: fawn + listras verticais escuras irregulares, como o Banguela. */
export function brindleTex(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#b8895a";
  ctx.fillRect(0, 0, s, s);
  const grad = ctx.createLinearGradient(0, 0, 0, s);
  grad.addColorStop(0, "rgba(0,0,0,0.25)");
  grad.addColorStop(0.5, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.3)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, s, s);
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * s;
    ctx.strokeStyle = rnd() > 0.6 ? "#1e120a" : "#3a2414";
    ctx.lineWidth = 4 + rnd() * 9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, -10);
    ctx.bezierCurveTo(x + (rnd() - 0.5) * 60, s * 0.33, x + (rnd() - 0.5) * 60, s * 0.66, x + (rnd() - 0.5) * 40, s + 10);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1.4, 1);
  t.anisotropy = 4;
  return t;
}

export const INK = "#0a0c11";

export const P = {
  skin: "#d9a67e",
  skin2: "#c48f66",
  hair: "#1d120c",
  shirt: "#ece6da",
  shirt2: "#d8ff3d",
  pants: "#3a4150",
  shoe: "#efe9dc",
  eye: "#fffaf3",
  iris: "#2a1a12",
  wood: "#6f5238",
  wood2: "#3d2c1e",
  desk: "#e9e2d4",
  chair: "#15161a",
  chairSeat: "#22242a",
  wall: "#2a2c33",
  wallLight: "#3a3d46",
  floor: "#1c1e25",
  floorWood: "#4a3626",
  rug: "#8d3f2a",
  rug2: "#b8783a",
  sofa: "#2c4a63",
  sofa2: "#213a4f",
  plant: "#3f8a4c",
  pot: "#7a4a30",
  screen: "#0d1117",
  metal: "#8a8f9a",
  black: "#0f1013",
  dog: "#c9a27a",
  dogStripe: "#1a0f08",
  dogWhite: "#f3eee4",
  dog2: "#2c1a0e",
  bandana: "#22b3ae",
  accent: "#d8ff3d",
  paper: "#f2ede4",
};
