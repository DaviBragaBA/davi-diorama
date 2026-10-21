import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Room borders along x, so batches stay small enough for frustum culling. */
const ROOM_EDGES = [3.55, 8.7, 13.85, 18.9, 23.85];
const roomOf = (x: number) => ROOM_EDGES.filter((e) => x > e).length;

function matKey(m: THREE.Material) {
  const s = m as THREE.MeshStandardMaterial;
  if (!s.isMeshStandardMaterial) return m.uuid;
  return [s.type, s.color.getHexString(), s.emissive.getHexString(), s.emissiveIntensity.toFixed(3), s.roughness.toFixed(2), s.metalness.toFixed(2), s.side, s.transparent ? 1 : 0].join(":");
}

/**
 * Static batching. Every mesh that never moves and is not clickable gets merged with its
 * siblings of the same material in the same room: hundreds of draw calls become a few dozen.
 * Clickable objects, animated parts and anything with a texture are left alone.
 */
export async function batchStatic(root: THREE.Object3D, keep: Iterable<THREE.Object3D>, pause: () => Promise<void> = async () => {}) {
  const protect = new Set(keep);
  root.updateMatrixWorld(true);
  const locked = (o: THREE.Object3D) => {
    for (let p: THREE.Object3D | null = o; p && p !== root; p = p.parent) {
      if (protect.has(p) || p.userData.pick) return true;
    }
    return false;
  };
  const buckets = new Map<string, { mat: THREE.Material; cast: boolean; recv: boolean; meshes: THREE.Mesh[] }>();
  const tmp = new THREE.Vector3();
  const inv = root.matrixWorld.clone().invert();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || Array.isArray(m.material) || locked(m)) return;
    const mat = m.material as THREE.MeshStandardMaterial;
    if (mat.map || mat.emissiveMap || mat.transparent) return;
    m.getWorldPosition(tmp);
    const key = `${matKey(mat)}|${m.castShadow ? 1 : 0}${m.receiveShadow ? 1 : 0}|${roomOf(tmp.x)}`;
    let b = buckets.get(key);
    if (!b) buckets.set(key, (b = { mat, cast: m.castShadow, recv: m.receiveShadow, meshes: [] }));
    b.meshes.push(m);
  });
  let before = 0;
  let after = 0;
  let work = 0;
  for (const b of buckets.values()) {
    // merging is the heaviest part of the start-up: hand the thread back every few buckets
    if ((work += b.meshes.length) > 40) {
      work = 0;
      await pause();
    }
    before += b.meshes.length;
    if (b.meshes.length < 2) {
      after += b.meshes.length;
      continue;
    }
    const geos = b.meshes.map((m) => {
      const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()) as THREE.BufferGeometry;
      for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal" && name !== "uv") g.deleteAttribute(name);
      if (!g.attributes.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((g.attributes.position.count) * 2), 2));
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
      return g;
    });
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) {
      after += b.meshes.length;
      continue;
    }
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    const mesh = new THREE.Mesh(merged, b.mat);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.recv;
    mesh.matrixAutoUpdate = false;
    mesh.name = "batch";
    root.add(mesh);
    b.meshes.forEach((m) => {
      m.parent?.remove(m);
      m.geometry.dispose();
    });
    after++;
  }
  return { before, after };
}
