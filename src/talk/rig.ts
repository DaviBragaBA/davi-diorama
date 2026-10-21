import * as THREE from "three";
import gsap from "gsap";
import type { Davi } from "../puppet";
import type { Emote } from "./catalog";

/**
 * Talk layer for the clay avatar, built from the existing puppet joints.
 * Runs after Davi.update() on every frame (scene.onBeforeRender), so it only bends what the
 * walk and sit timelines already set: face the viewer, talk loop, mouth and the four gestures.
 */

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAngle = (a: number, b: number, t: number) => a + wrap(b - a) * t;
const damp = (cur: number, target: number, rate: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const MOUTH_COLOR = "9a4540";

function findMouth(head: THREE.Object3D): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  head.children.forEach((c) => {
    const m = c as THREE.Mesh;
    const mat = m.material as THREE.MeshStandardMaterial | undefined;
    if (!found && m.isMesh && mat?.color?.getHexString() === MOUTH_COLOR) found = m;
  });
  return found;
}

export type AvatarRig = ReturnType<typeof createAvatarRig>;

export function createAvatarRig(davi: Davi, chair: THREE.Object3D, camera: THREE.Camera) {
  const mouth = findMouth(davi.head);
  const w = { talk: 0, face: 0, energy: 0, mouth: 0, wave: 0, nod: 0, think: 0, point: 0 };
  const camPos = new THREE.Vector3();
  let talking = false;
  let facing = false;
  let reduced = false;
  let aim: THREE.Vector3 | null = null;

  const emote = (kind: Emote, target?: THREE.Vector3 | null) => {
    if (reduced) return;
    aim = kind === "point" && target ? target.clone() : kind === "point" ? null : aim;
    const hold = { wave: 1.5, nod: 1.0, think: 1.8, point: 1.7 }[kind];
    gsap.killTweensOf(w, kind);
    gsap
      .timeline()
      .to(w, { [kind]: 1, duration: 0.38, ease: "power2.out" })
      .to(w, { [kind]: 0, duration: 0.5, ease: "power2.inOut" }, hold);
  };

  /** Called while text is revealed: letters open the mouth, pauses close it. */
  const pulse = (e: number) => {
    w.energy = Math.max(w.energy, e);
  };

  const apply = (dt: number, t: number) => {
    const p = davi.pose;
    const seated = clamp01(p.seated);
    const walk = clamp01(p.walk) * (1 - seated);
    const still = 1 - walk;

    w.talk = damp(w.talk, talking ? 1 : 0, 5, dt);
    w.face = damp(w.face, facing ? still : 0, reduced ? 60 : 3.2, dt);
    w.energy *= Math.exp(-dt * 9);
    w.mouth = damp(w.mouth, talking ? w.energy : 0, 22, dt);

    const busy = w.talk + w.face + w.mouth + w.wave + w.nod + w.think + w.point;
    if (busy < 1e-3) {
      if (chair.rotation.y !== 0) chair.rotation.y = 0;
      if (mouth && mouth.scale.x !== 1) mouth.scale.x = 1;
      return;
    }

    // Body: turn to the viewer (and swivel the chair when seated), or toward what he points at.
    const P = davi.root.position;
    camera.getWorldPosition(camPos);
    const yawCam = Math.atan2(camPos.x - P.x, camPos.z - P.z);
    let yaw = lerpAngle(p.facing, yawCam, w.face);
    if (aim && w.point > 0) {
      const toAim = wrap(Math.atan2(aim.x - P.x, aim.z - P.z) - yawCam);
      yaw = lerpAngle(yaw, yawCam + THREE.MathUtils.clamp(toAim, -1.3, 1.3), w.point * still);
    }
    davi.root.rotation.y = yaw;
    chair.rotation.y = wrap(yaw - p.facing) * seated;

    // Head: look at the viewer, small talk bob, nod and the thinking tilt.
    const h = davi.head;
    const f = w.face * still;
    const bob = reduced ? 0 : w.talk * still;
    h.rotation.y = lerp(h.rotation.y, 0, f * 0.85);
    h.rotation.x = lerp(h.rotation.x, -0.05 - seated * 0.04, f * 0.85);
    h.rotation.x += bob * (Math.sin(t * 5.3) * 0.035 + Math.sin(t * 8.9 + 1.3) * 0.015 + w.mouth * 0.05);
    h.rotation.x += w.nod * Math.sin(t * 10.5) * 0.24 - w.think * 0.07;
    h.rotation.z = bob * Math.sin(t * 1.7) * 0.05 + w.think * 0.13;
    davi.neck.rotation.y += bob * Math.sin(t * 1.1) * 0.05;
    davi.eyeL.rotation.x -= w.think * 0.22;
    davi.eyeL.rotation.y *= 1 - f;
    davi.eyeR.rotation.copy(davi.eyeL.rotation);
    if (mouth) mouth.scale.x = 1 + w.mouth * (reduced ? 0.9 : 1.1 + 1.3 * Math.abs(Math.sin(t * 12.5)));

    // Arms: hands talk while he speaks; gestures take over the right arm.
    const g = bob * (1 - Math.max(w.wave, w.think, w.point));
    if (g > 0) {
      const sit = seated;
      davi.shR.rotation.x = lerp(davi.shR.rotation.x, lerp(-0.5, -0.95, sit) + Math.sin(t * 2.3) * 0.2 + w.mouth * 0.1, g);
      davi.shR.rotation.z = lerp(davi.shR.rotation.z, lerp(-0.22, -0.3, sit) + Math.sin(t * 1.6) * 0.05, g);
      davi.elR.rotation.x = lerp(davi.elR.rotation.x, lerp(-1.1, -1.3, sit) + Math.sin(t * 3.4 + 0.6) * 0.28, g);
      davi.shL.rotation.x = lerp(davi.shL.rotation.x, lerp(-0.18, -0.9, sit) + Math.sin(t * 1.9 + 2) * 0.1, g * 0.7);
      davi.elL.rotation.x = lerp(davi.elL.rotation.x, lerp(-0.5, -0.7, sit) + Math.sin(t * 2.6) * 0.14, g * 0.7);
    }
    if (w.wave > 0) {
      davi.shR.rotation.x = lerp(davi.shR.rotation.x, -0.25, w.wave);
      davi.shR.rotation.z = lerp(davi.shR.rotation.z, -2.35, w.wave);
      davi.elR.rotation.x = lerp(davi.elR.rotation.x, -0.95 + Math.sin(t * 9) * 0.45, w.wave);
    }
    if (w.think > 0) {
      davi.shR.rotation.x = lerp(davi.shR.rotation.x, -1.2, w.think);
      davi.shR.rotation.z = lerp(davi.shR.rotation.z, -0.42, w.think);
      davi.elR.rotation.x = lerp(davi.elR.rotation.x, -2.3, w.think);
    }
    if (w.point > 0) {
      davi.shR.rotation.x = lerp(davi.shR.rotation.x, -1.85, w.point);
      davi.shR.rotation.z = lerp(davi.shR.rotation.z, -0.12, w.point);
      davi.elR.rotation.x = lerp(davi.elR.rotation.x, -0.12, w.point);
    }

    davi.root.updateMatrixWorld(true);
    chair.updateMatrixWorld(true);
  };

  return {
    emote,
    pulse,
    apply,
    setTalking: (on: boolean) => {
      talking = on;
    },
    setFacing: (on: boolean) => {
      facing = on;
    },
    setReduced: (on: boolean) => {
      reduced = on;
    },
    /** True while any layer still moves the puppet (the frame hook keeps running until it settles). */
    active: () => talking || facing || w.talk + w.face + w.mouth + w.wave + w.nod + w.think + w.point > 1e-3,
    state: () => (talking ? "talking" : "idle"),
  };
}
