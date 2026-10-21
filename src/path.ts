/** Mobília e corredor — uma fonte. Davi nunca passa por cima. */
export const WALK_Z = 1.08;

export const F = {
  dog: { x: -3.15, z: -0.82 },
  sofa: { x: -2.15, z: -1.58 },
  coffee: { x: -1.45, z: -0.62 },
  desk: { x: 1.15, z: -0.78 },
  chair: { x: 1.15, z: 0.22 },
  lamp: { x: 2.55, z: -1.72 },
  flashTable: { x: 11.2, z: -0.72 },
  studioTable: { x: 16.45, z: -0.85 },
  knapsack: { x: 16.45, z: -0.85 },
} as const;

export const SPOTS_XZ = {
  living: { x: -1.35, z: WALK_Z },
  war: { x: 7.3, z: WALK_Z },
  flash: { x: 12.35, z: WALK_Z },
  studio: { x: 17.3, z: WALK_Z },
  lab: { x: 22.3, z: WALK_Z },
  balcony: { x: 27.4, z: WALK_Z },
} as const;

export const BLOCKS = [
  { name: "banguela", x: F.dog.x, z: F.dog.z, r: 0.62 },
  { name: "sofa", x: F.sofa.x, z: F.sofa.z, r: 1.05 },
  { name: "coffee", x: F.coffee.x, z: F.coffee.z, r: 0.52 },
  { name: "desk", x: F.desk.x, z: F.desk.z, r: 0.92 },
  { name: "chair", x: F.chair.x, z: F.chair.z, r: 0.34 },
  { name: "lamp", x: F.lamp.x, z: F.lamp.z, r: 0.28 },
  { name: "flashTable", x: F.flashTable.x, z: F.flashTable.z, r: 0.82 },
  { name: "studioTable", x: F.studioTable.x, z: F.studioTable.z, r: 0.78 },
] as const;

export function hitBlock(x: number, z: number, pad = 0.22) {
  return BLOCKS.find((b) => Math.hypot(x - b.x, z - b.z) < b.r + pad) ?? null;
}

export function clearFloor(x: number, z: number, pad = 0.22) {
  return !hitBlock(x, z, pad);
}

function sampleSeg(a: { x: number; z: number }, b: { x: number; z: number }, n = 16) {
  const out: { x: number; z: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
  }
  return out;
}

/** Rota de pé: sai da cadeira → corredor → cada sala. Sem sentar. */
export function walkPolyline(spots: Record<string, { x: number; z: number }>) {
  const corridor = (x: number) => ({ x, z: WALK_Z });
  return [
    corridor(F.chair.x),
    corridor(spots.living.x),
    corridor(spots.war.x),
    corridor(spots.flash.x),
    corridor(spots.studio.x),
    corridor(spots.lab.x),
    corridor(spots.balcony.x),
  ];
}

export function assertWaypoints(pts: { name: string; x: number; z: number }[]) {
  const bad = pts.filter((p) => !clearFloor(p.x, p.z));
  if (bad.length) throw new Error("walk hits furniture: " + bad.map((b) => `${b.name}@${hitBlock(b.x, b.z)?.name}`).join(", "));
}

export function assertWalkRoute(spots: Record<string, { x: number; z: number }>) {
  const poly = walkPolyline(spots);
  const hits: string[] = [];
  for (let i = 0; i < poly.length - 1; i++) {
    for (const p of sampleSeg(poly[i], poly[i + 1])) {
      const h = hitBlock(p.x, p.z, 0.18);
      if (h) hits.push(`${h.name} @ ${p.x.toFixed(2)},${p.z.toFixed(2)}`);
    }
  }
  assertWaypoints(
    ["living", "war", "flash", "studio", "lab", "balcony"].map((id) => ({
      name: id,
      x: spots[id].x,
      z: spots[id].z,
    }))
  );
  if (hits.length) throw new Error("corridor clips: " + [...new Set(hits)].join(" | "));
}

/** Where Davi stands in each chapter, in tour order: the desk chair, then one spot per room. */
export const TOUR_SPOTS = [{ x: F.chair.x, z: F.chair.z }, SPOTS_XZ.war, SPOTS_XZ.flash, SPOTS_XZ.studio, SPOTS_XZ.lab, SPOTS_XZ.balcony] as const;

const sstep = (a: number, b: number, u: number) => {
  const x = Math.min(1, Math.max(0, (u - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

export type DaviPose = { x: number; z: number; seated: number; chairZ: number };

/**
 * Davi's pose as a pure function of tour progress s (0..5, one unit per chapter).
 * Leaving the desk he stands up, steps back to the corridor and walks; every other leg is a
 * walk along the corridor. Scrolling back replays it in reverse, and he sits down again.
 */
export function daviAt(s: number): DaviPose {
  const n = TOUR_SPOTS.length;
  s = Math.min(n - 1, Math.max(0, s));
  const tuck = F.desk.z + 0.5;
  if (s < 1) {
    const stand = sstep(0, 0.16, s);
    const out = sstep(0.1, 0.26, s);
    const w = sstep(0.24, 0.88, s);
    return {
      x: F.chair.x + (TOUR_SPOTS[1].x - F.chair.x) * w,
      z: F.chair.z + (WALK_Z - F.chair.z) * out,
      seated: 1 - stand,
      chairZ: F.chair.z + (tuck - F.chair.z) * sstep(0.04, 0.2, s),
    };
  }
  const k = Math.min(n - 2, Math.floor(s));
  const u = s - k;
  const w = sstep(0.1, 0.88, u);
  const a = TOUR_SPOTS[k];
  const b = TOUR_SPOTS[k + 1];
  return { x: a.x + (b.x - a.x) * w, z: WALK_Z, seated: 0, chairZ: tuck };
}

/** Samples the whole tour: once Davi has left the chair he never overlaps a piece of furniture. */
export function assertTourClear(samples = 500) {
  const hits: string[] = [];
  const last = TOUR_SPOTS.length - 1;
  for (let i = 0; i <= samples; i++) {
    const s = (i / samples) * last;
    if (s < 0.26) continue;
    const p = daviAt(s);
    const h = hitBlock(p.x, p.z, 0.18);
    if (h) hits.push(`${h.name} @ s=${s.toFixed(3)}`);
  }
  if (hits.length) throw new Error("tour clips: " + [...new Set(hits)].join(" | "));
}
