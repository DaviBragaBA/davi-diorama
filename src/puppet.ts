import * as THREE from "three";
import { G, P, blobShadow, bone, brindleTex, clay, glow, mesh } from "./clay";

export type Pose = {
  seated: number;
  walk: number;
  facing: number;
  look: number;
  wave: number;
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Frente = +Z. Sentado: vira para a mesa em −Z (facing = Math.PI). */
export class Davi {
  root = new THREE.Group();
  pelvis = new THREE.Group();
  torso = new THREE.Group();
  neck = new THREE.Group();
  head = new THREE.Group();
  chest!: THREE.Mesh;
  shL = new THREE.Group();
  shR = new THREE.Group();
  elL = new THREE.Group();
  elR = new THREE.Group();
  hipL = new THREE.Group();
  hipR = new THREE.Group();
  knL = new THREE.Group();
  knR = new THREE.Group();
  eyeL = new THREE.Group();
  eyeR = new THREE.Group();
  look = { x: 0, y: 0 };
  pose: Pose = { seated: 1, walk: 0, facing: Math.PI, look: 1, wave: 0 };

  private phase = 0;
  private last = new THREE.Vector3();
  private blinkT = 0;
  private nextBlink = 2.2;

  constructor() {
    this.root.scale.setScalar(1.15);
    this.build();
    this.root.add(blobShadow(0.55, 0.28));
    this.last.copy(this.root.position);
  }

  private build() {
    this.root.add(this.pelvis);
    const hips = mesh(G.sphere(0.2), P.pants, 0, 0.03, 0);
    hips.scale.set(1.2, 0.82, 1.05);
    this.pelvis.add(hips);

    this.torso.position.y = 0.05;
    this.pelvis.add(this.torso);
    this.chest = new THREE.Mesh(G.cap(0.23, 0.3), clay(P.shirt));
    this.chest.position.y = 0.32;
    this.chest.scale.set(1.16, 1, 0.84);
    this.chest.castShadow = true;
    this.torso.add(this.chest);
    const collar = mesh(G.torus(0.13, 0.02), "#d8d2c6", 0, 0.56, 0.02);
    collar.rotation.x = Math.PI / 2;
    this.torso.add(collar);
    const badge = mesh(G.rbox(0.07, 0.07, 0.015, 0.012), P.shirt2, 0.1, 0.42, 0.2);
    this.torso.add(badge);

    this.neck.position.set(0, 0.6, 0.02);
    this.torso.add(this.neck);
    this.head.position.y = 0.12;
    this.neck.add(this.head);
    this.headParts();

    const arm = (side: 1 | -1, sh: THREE.Group, el: THREE.Group) => {
      sh.position.set(side * 0.27, 0.52, 0);
      this.torso.add(sh);
      sh.add(bone(0.075, 0.32, P.shirt));
      el.position.y = -0.3;
      sh.add(el);
      el.add(bone(0.06, 0.28, P.skin));
      const hand = mesh(G.sphere(0.07), P.skin, 0, -0.29, 0.02);
      hand.scale.set(1.05, 1.1, 0.8);
      el.add(hand);
    };
    arm(1, this.shL, this.elL);
    arm(-1, this.shR, this.elR);

    const leg = (side: 1 | -1, hip: THREE.Group, kn: THREE.Group) => {
      hip.position.set(side * 0.12, -0.02, 0);
      this.pelvis.add(hip);
      hip.add(bone(0.09, 0.42, P.pants));
      kn.position.y = -0.4;
      hip.add(kn);
      kn.add(bone(0.078, 0.4, P.pants));
      const foot = new THREE.Group();
      foot.position.y = -0.4;
      kn.add(foot);
      const shoe = mesh(G.cap(0.078, 0.13), P.shoe, 0, -0.02, 0.07);
      shoe.rotation.x = Math.PI / 2;
      foot.add(shoe);
    };
    leg(1, this.hipL, this.knL);
    leg(-1, this.hipR, this.knR);
  }

  private headParts() {
    const h = this.head;
    const skull = mesh(G.sphere(0.22, 36), P.skin, 0, 0.16, 0.02);
    skull.scale.set(0.94, 1.08, 0.96);
    h.add(skull);
    for (const s of [1, -1] as const) {
      const ear = mesh(G.sphere(0.048), P.skin2, s * 0.2, 0.15, -0.02);
      ear.scale.set(0.5, 1.05, 0.75);
      h.add(ear);
    }
    const nose = mesh(G.sphere(0.032), P.skin2, 0, 0.14, 0.205);
    nose.scale.set(0.9, 0.7, 1.1);
    h.add(nose);
    const bridge = mesh(G.cap(0.018, 0.06), P.skin, 0, 0.175, 0.185);
    bridge.rotation.x = 0.4;
    h.add(bridge);
    const mouth = mesh(G.cap(0.01, 0.04), "#9a4540", 0, 0.09, 0.2);
    mouth.rotation.z = Math.PI / 2;
    h.add(mouth);

    const eye = (side: 1 | -1, g: THREE.Group) => {
      g.position.set(side * 0.075, 0.2, 0.175);
      h.add(g);
      const w = mesh(G.sphere(0.046), P.eye);
      w.scale.set(1, 1, 0.7);
      g.add(w);
      g.add(mesh(G.sphere(0.024), P.iris, 0, 0, 0.026));
      g.add(mesh(G.sphere(0.012), "#0c0705", 0, 0, 0.042));
      const catchL = new THREE.Mesh(G.sphere(0.007, 8), glow("#ffffff"));
      catchL.position.set(side * -0.01, 0.012, 0.05);
      g.add(catchL);
      const brow = mesh(G.cap(0.01, 0.05), P.hair, 0, 0.052, 0.01);
      brow.rotation.z = Math.PI / 2 + side * 0.15;
      g.add(brow);
    };
    eye(1, this.eyeL);
    eye(-1, this.eyeR);

    const hair = mesh(G.sphere(0.225, 32), P.hair, 0, 0.28, -0.03);
    hair.scale.set(0.98, 0.72, 1.0);
    h.add(hair);
    for (const [x, y, z, sx, sy, sz] of [
      [0.02, 0.32, 0.16, 1.35, 0.48, 0.72],
      [-0.08, 0.3, 0.12, 0.9, 0.45, 0.7],
      [0.1, 0.28, 0.08, 0.85, 0.5, 0.65],
      [0, 0.34, -0.04, 1.1, 0.55, 0.8],
      [-0.12, 0.22, 0.02, 0.7, 0.7, 0.55],
    ] as const) {
      const clump = mesh(G.sphere(0.08), P.hair, x, y, z);
      clump.scale.set(sx, sy, sz);
      h.add(clump);
    }
  }

  update(dt: number, t: number) {
    const s = this.pose;
    const seated = THREE.MathUtils.clamp(s.seated, 0, 1);
    const stand = 1 - seated;
    const dx = this.root.position.x - this.last.x;
    const dz = this.root.position.z - this.last.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 1e-5) this.phase += (dist / 0.6) * Math.PI;
    this.last.copy(this.root.position);
    const walk = THREE.MathUtils.clamp(s.walk, 0, 1) * stand;
    const sw = Math.sin(this.phase);

    this.root.rotation.y = s.facing;
    this.pelvis.position.y = lerp(0.82, 0.48, seated) + walk * Math.abs(Math.sin(this.phase * 2)) * 0.03;

    const breath = Math.sin(t * 2.1) * 0.012;
    this.chest.scale.set(1.16 + breath, 1 + breath * 0.4, 0.84 + breath);
    this.torso.rotation.x = lerp(0.04, 0.18, seated);

    this.hipL.rotation.x = lerp(walk * sw * 0.6, -Math.PI / 2 + 0.12, seated);
    this.hipR.rotation.x = lerp(-walk * sw * 0.6, -Math.PI / 2 + 0.12, seated);
    this.knL.rotation.x = lerp(walk * Math.max(0, -sw) * 1.1, Math.PI / 2 - 0.04, seated);
    this.knR.rotation.x = lerp(walk * Math.max(0, sw) * 1.1, Math.PI / 2 - 0.04, seated);

    const wave = s.wave;
    this.shL.rotation.x = lerp(-walk * sw * 0.45, -1.05, seated);
    this.shL.rotation.z = lerp(0.12, 0.28, seated);
    this.elL.rotation.x = lerp(-0.25, -0.55, seated);
    this.shR.rotation.x = lerp(lerp(walk * sw * 0.45, -0.4, wave), -1.05, seated);
    this.shR.rotation.z = lerp(lerp(-0.12, -2.2, wave), -0.28, seated);
    this.elR.rotation.x = lerp(lerp(-0.25, -1.1 + Math.sin(t * 8) * 0.35, wave), -0.55, seated);

    const lk = s.look;
    this.head.rotation.y = -this.look.x * 0.55 * lk;
    this.head.rotation.x = -this.look.y * 0.3 * lk - seated * 0.06;
    this.neck.rotation.y = this.head.rotation.y * 0.4;
    this.neck.rotation.x = this.head.rotation.x * 0.35;
    this.eyeL.rotation.set(-this.look.y * 0.12 * lk, -this.look.x * 0.18 * lk, 0);
    this.eyeR.rotation.copy(this.eyeL.rotation);

    this.blinkT += dt;
    if (this.blinkT > this.nextBlink) {
      this.blinkT = 0;
      this.nextBlink = 2 + Math.random() * 2.5;
    }
    const blink = this.blinkT < 0.1 ? 1 - Math.abs(this.blinkT / 0.05 - 1) : 0;
    this.eyeL.scale.y = this.eyeR.scale.y = 1 - blink * 0.9;
  }

  wink() {
    this.blinkT = 0;
    this.nextBlink = 0;
  }
}


/** Pitbull sentado, proporções da foto: cabeça larga e quadrada, peito largo com mancha branca, patas dianteiras retas com meias, orelhas rose, corrente e bandana. */
export class Banguela {
  root = new THREE.Group();
  private tail: THREE.Group;
  private head: THREE.Group;
  private neck: THREE.Group;
  private mouth: THREE.Mesh;
  bark = 0;
  constructor() {
    const r = this.root;
    r.name = "banguela";
    r.scale.setScalar(1.35);
    const fur = clay(P.dog).clone();
    fur.color.set("#ffffff");
    fur.map = brindleTex();
    fur.needsUpdate = true;
    const furM = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(geo, fur);
      m.position.set(x, y, z);
      m.castShadow = m.receiveShadow = true;
      return m;
    };

    const rump = furM(G.sphere(0.21), 0, 0.21, -0.2);
    rump.scale.set(1.25, 1, 1.15);
    r.add(rump);
    const back = furM(G.cap(0.15, 0.2), 0, 0.36, -0.02);
    back.rotation.x = 1.05;
    back.scale.set(1.25, 1, 1);
    r.add(back);
    const chest = furM(G.sphere(0.19), 0, 0.4, 0.15);
    chest.scale.set(1.28, 1.12, 1.0);
    r.add(chest);
    const bib = mesh(G.sphere(0.13), P.dogWhite, 0, 0.36, 0.25);
    bib.scale.set(1.05, 1.25, 0.5);
    r.add(bib);

    this.neck = new THREE.Group();
    this.neck.position.set(0, 0.54, 0.2);
    r.add(this.neck);
    const neck = furM(G.cyl(0.115, 0.14, 0.16, 20), 0, 0.02, 0);
    neck.rotation.x = -0.35;
    this.neck.add(neck);

    this.head = new THREE.Group();
    this.head.position.set(0, 0.14, 0.05);
    this.neck.add(this.head);
    const skull = furM(G.rbox(0.3, 0.22, 0.24, 0.11), 0, 0.02, -0.01);
    this.head.add(skull);
    for (const s of [1, -1] as const) {
      const cheek = furM(G.sphere(0.075), s * 0.11, -0.04, 0.06);
      cheek.scale.set(0.95, 0.85, 1);
      this.head.add(cheek);
    }
    const brow = furM(G.rbox(0.28, 0.06, 0.12, 0.025), 0, 0.09, 0.07);
    this.head.add(brow);
    const muzzle = mesh(G.rbox(0.17, 0.12, 0.15, 0.065), P.dogWhite, 0, -0.045, 0.165);
    this.head.add(muzzle);
    const chin = mesh(G.rbox(0.15, 0.06, 0.12, 0.03), P.dogWhite, 0, -0.105, 0.14);
    this.head.add(chin);
    const blaze = mesh(G.rbox(0.05, 0.17, 0.035, 0.015), P.dogWhite, 0, 0.055, 0.125);
    blaze.rotation.x = -0.32;
    this.head.add(blaze);
    const nose = mesh(G.sphere(0.034), "#0c0a0a", 0, -0.015, 0.245);
    nose.scale.set(1.25, 0.8, 0.8);
    this.head.add(nose);
    this.mouth = mesh(G.rbox(0.09, 0.02, 0.04, 0.008), "#1a0e0c", 0, -0.085, 0.235);
    this.head.add(this.mouth);
    const tongue = mesh(G.rbox(0.04, 0.012, 0.05, 0.005), "#c7565f", 0, -0.095, 0.245);
    tongue.visible = false;
    tongue.name = "tongue";
    this.head.add(tongue);

    for (const s of [1, -1] as const) {
      const socket = mesh(G.sphere(0.032), P.dog2, s * 0.07, 0.03, 0.115);
      socket.scale.set(1, 0.8, 0.5);
      this.head.add(socket);
      const eye = mesh(G.sphere(0.021), "#140c08", s * 0.07, 0.03, 0.128);
      this.head.add(eye);
      const catchL = new THREE.Mesh(G.sphere(0.0035, 8), glow("#ffffff"));
      catchL.position.set(s * 0.064, 0.036, 0.148);
      this.head.add(catchL);

      const ear = new THREE.Group();
      ear.position.set(s * 0.15, 0.12, -0.01);
      ear.rotation.set(-0.25, s * 0.2, s * 1.05);
      const flap = mesh(G.rbox(0.065, 0.12, 0.03, 0.02), P.dog2, 0, 0.03, 0);
      ear.add(flap);
      const fold = mesh(G.rbox(0.045, 0.06, 0.02, 0.01), "#b8836c", 0, 0.045, 0.012);
      ear.add(fold);
      this.head.add(ear);
    }

    for (const s of [1, -1] as const) {
      const shoulder = furM(G.sphere(0.095), s * 0.15, 0.36, 0.1);
      shoulder.scale.set(1, 1.2, 1);
      r.add(shoulder);
      const upper = furM(G.cyl(0.05, 0.055, 0.14, 14), s * 0.13, 0.25, 0.2);
      r.add(upper);
      const fore = mesh(G.cyl(0.045, 0.05, 0.2, 14), P.dogWhite, s * 0.13, 0.11, 0.22);
      r.add(fore);
      const paw = mesh(G.rbox(0.1, 0.05, 0.13, 0.025), P.dogWhite, s * 0.13, 0.025, 0.26);
      r.add(paw);
      const thigh = furM(G.sphere(0.11), s * 0.17, 0.17, -0.12);
      thigh.scale.set(0.9, 1, 1.35);
      r.add(thigh);
      const hock = furM(G.cyl(0.04, 0.045, 0.16, 12), s * 0.18, 0.06, 0.02);
      hock.rotation.x = Math.PI / 2 - 0.15;
      r.add(hock);
      const hpaw = furM(G.rbox(0.09, 0.045, 0.12, 0.02), s * 0.18, 0.022, 0.1);
      r.add(hpaw);
    }

    this.tail = new THREE.Group();
    this.tail.position.set(0, 0.2, -0.36);
    r.add(this.tail);
    const t1 = furM(G.cap(0.03, 0.14), 0, -0.07, -0.03);
    t1.rotation.x = 0.35;
    this.tail.add(t1);
    const t2 = furM(G.cap(0.022, 0.12), 0, -0.19, 0.0);
    t2.rotation.x = -0.4;
    this.tail.add(t2);

    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const link = new THREE.Mesh(G.torus(0.02, 0.006), new THREE.MeshStandardMaterial({ color: "#c9ccd2", metalness: 0.9, roughness: 0.3 }));
      link.position.set(Math.cos(a) * 0.15, 0.56 + Math.sin(a) * 0.015 - 0.02, 0.2 + Math.sin(a) * 0.11);
      link.rotation.set(a, 0.6, 0);
      link.castShadow = true;
      r.add(link);
    }
    const band = mesh(G.rbox(0.26, 0.05, 0.03, 0.012), P.bandana, 0, 0.53, 0.31);
    band.rotation.x = 0.2;
    r.add(band);
    const kerchief = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.2, 3), clay(P.bandana));
    kerchief.position.set(0, 0.42, 0.31);
    kerchief.rotation.set(Math.PI + 0.35, Math.PI / 6, 0);
    kerchief.castShadow = true;
    r.add(kerchief);
    r.add(mesh(G.cyl(0.02, 0.02, 0.01, 12), "#e8b84a", 0.03, 0.46, 0.36));
    r.add(blobShadow(0.5, 0.4));
  }
  update(t: number) {
    const wag = 5 + this.bark * 8;
    this.tail.rotation.z = Math.sin(t * wag) * (0.45 + this.bark * 0.4);
    this.neck.rotation.y = Math.sin(t * 0.55) * 0.18;
    this.head.rotation.z = Math.sin(t * 0.9) * 0.05;
    this.head.rotation.x = -0.05 + this.bark * -0.25;
    this.mouth.scale.y = 1 + this.bark * 6;
    const tongue = this.head.getObjectByName("tongue");
    if (tongue) tongue.visible = this.bark > 0.3;
    this.bark *= 0.92;
  }
}
