const WALK_Z = 1.08;
const F = {
  dog: { x: -3.15, z: -0.82 },
  sofa: { x: -2.15, z: -1.58 },
  coffee: { x: -1.45, z: -0.62 },
  desk: { x: 1.15, z: -0.78 },
  chair: { x: 1.15, z: 0.22 },
  lamp: { x: 2.55, z: -1.72 },
  flashTable: { x: 11.2, z: -0.72 },
  studioTable: { x: 16.45, z: -0.85 },
};
const SPOTS = {
  living: { x: -1.35, z: WALK_Z },
  war: { x: 7.3, z: WALK_Z },
  flash: { x: 12.35, z: WALK_Z },
  studio: { x: 17.3, z: WALK_Z },
  lab: { x: 22.3, z: WALK_Z },
  balcony: { x: 27.4, z: WALK_Z },
};
const BLOCKS = [
  { name: "banguela", x: F.dog.x, z: F.dog.z, r: 0.62 },
  { name: "sofa", x: F.sofa.x, z: F.sofa.z, r: 1.05 },
  { name: "coffee", x: F.coffee.x, z: F.coffee.z, r: 0.52 },
  { name: "desk", x: F.desk.x, z: F.desk.z, r: 0.92 },
  { name: "chair", x: F.chair.x, z: F.chair.z, r: 0.34 },
  { name: "lamp", x: F.lamp.x, z: F.lamp.z, r: 0.28 },
  { name: "flashTable", x: F.flashTable.x, z: F.flashTable.z, r: 0.82 },
  { name: "studioTable", x: F.studioTable.x, z: F.studioTable.z, r: 0.78 },
];

function hit(x, z, pad = 0.22) {
  return BLOCKS.find((b) => Math.hypot(x - b.x, z - b.z) < b.r + pad) ?? null;
}

const hits = [];
const xs = [F.chair.x, SPOTS.living.x, SPOTS.war.x, SPOTS.flash.x, SPOTS.studio.x, SPOTS.lab.x, SPOTS.balcony.x];
for (let i = 0; i < xs.length - 1; i++) {
  for (let s = 0; s <= 16; s++) {
    const t = s / 16;
    const x = xs[i] + (xs[i + 1] - xs[i]) * t;
    const h = hit(x, WALK_Z, 0.18);
    if (h) hits.push(`${h.name} @ ${x.toFixed(2)}`);
  }
}
for (const [name, p] of Object.entries(SPOTS)) {
  const h = hit(p.x, p.z);
  if (h) hits.push(`spot ${name} @ ${h.name}`);
}
if (hits.length) {
  console.error("FAIL", [...new Set(hits)].join(" | "));
  process.exit(1);
}
console.log("path ok · corredor livre");
