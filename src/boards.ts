import * as THREE from "three";
import { JUMPS } from "./copy";
import { personal } from "./data";

export type LiveBoard = { mesh: THREE.Mesh; update: (t: number) => void; pulse: () => void };

const ACC = "#d8ff3d";
const PAPER = "#f2ede4";
const MUTED = "#6b7280";

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.anisotropy = 8;
  return { c, ctx: c.getContext("2d")!, tex };
}

function screen(tex: THREE.CanvasTexture, w: number, h: number, x: number, y: number, z: number) {
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: "#ffffff", emissiveMap: tex, emissiveIntensity: 0.85, roughness: 0.6 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  return m;
}

function display(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, fill = PAPER) {
  ctx.font = `800 ${size}px Syne, sans-serif`;
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}
function mono(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, fill = MUTED) {
  ctx.font = `500 ${size}px "JetBrains Mono", monospace`;
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/** Índice de parede: placa escura, numerada, pouca coisa. Clique abre o sumário. */
export function corkBoard(x: number, y: number, z: number): THREE.Mesh {
  const { c, ctx, tex } = canvas(1400, 1000);
  ctx.fillStyle = "#0f1116";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = "#2a2e38";
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, c.width - 60, c.height - 60);
  mono(ctx, "ÍNDICE  ·  CLICA PRA NAVEGAR", 90, 130, 34, ACC);
  ctx.fillStyle = "#2a2e38";
  ctx.fillRect(90, 165, c.width - 180, 2);
  JUMPS.forEach((j, i) => {
    const yy = 270 + i * 118;
    mono(ctx, String(i + 1).padStart(2, "0"), 90, yy, 40, MUTED);
    display(ctx, j.label.split("·")[0].trim(), 190, yy, 66);
    mono(ctx, j.label.split("·")[1]?.trim() ?? "", 720, yy, 30, MUTED);
  });
  tex.needsUpdate = true;
  const m = screen(tex, 3.0, 2.14, x, y, z);
  m.name = "cork";
  m.userData.pick = { kind: "cork", id: "cv" };
  return m;
}

/** Painel de monitoria vivo: barras + linha + número grande, tudo mexendo. */
export function liveBars(title: string, sub: string, x: number, y: number, z: number, w = 2.4, h = 1.45, kpiLabel = "TESTE VS. CONTROLE", kpiBase = 12.4): LiveBoard {
  const { c, ctx, tex } = canvas(1280, 768);
  const m = screen(tex, w, h, x, y, z);
  let last = -1;
  let boost = 0;
  const N = 12;
  const update = (t: number) => {
    const f = (t * 24) | 0;
    if (f === last) return;
    last = f;
    boost *= 0.94;
    ctx.fillStyle = "#0b0e14";
    ctx.fillRect(0, 0, c.width, c.height);
    mono(ctx, sub.toUpperCase(), 56, 84, 28, ACC);
    display(ctx, title, 56, 170, 72);
    const kpi = kpiBase + Math.sin(t * 0.6) * 1.8 + boost * 6;
    ctx.textAlign = "right";
    mono(ctx, kpiLabel, c.width - 56, 84, 26);
    display(ctx, `+${kpi.toFixed(1)}%`, c.width - 56, 170, 64, ACC);
    ctx.textAlign = "left";
    ctx.fillStyle = "#1c212b";
    ctx.fillRect(56, 215, c.width - 112, 2);
    const baseY = 690;
    const bw = (c.width - 112) / N - 14;
    for (let i = 0; i < N; i++) {
      const v = 0.3 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 0.7)) + boost * 0.2;
      const bh = v * 380;
      const bx = 56 + i * (bw + 14);
      ctx.fillStyle = i === N - 1 ? ACC : i % 3 === 0 ? "#2f6d6a" : "#22303e";
      ctx.fillRect(bx, baseY - bh, bw, bh);
    }
    ctx.strokeStyle = PAPER;
    ctx.lineWidth = 5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const px = 56 + (i / 40) * (c.width - 112);
      const py = 440 - Math.sin(t * 0.9 + i * 0.35) * 50 - i * 3.2 - boost * 60;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
    const lx = c.width - 56;
    const ly = 440 - Math.sin(t * 0.9 + 40 * 0.35) * 50 - 40 * 3.2 - boost * 60;
    ctx.fillStyle = ACC;
    ctx.beginPath();
    ctx.arc(lx, ly, 12, 0, Math.PI * 2);
    ctx.fill();
    tex.needsUpdate = true;
  };
  update(0);
  return { mesh: m, update, pulse: () => (boost = 1) };
}

export function billboard(title: string, sub: string, x: number, y: number, z: number, w = 2.0, h = 1.05, bg = "#0f1116") {
  const { c, ctx, tex } = canvas(1024, 512);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  mono(ctx, sub.toUpperCase(), 48, 96, 30, ACC);
  let size = 150;
  ctx.font = `800 ${size}px Syne, sans-serif`;
  while (ctx.measureText(title).width > c.width - 96 && size > 60) {
    size -= 6;
    ctx.font = `800 ${size}px Syne, sans-serif`;
  }
  display(ctx, title, 48, 300, size);
  mono(ctx, "CLICA", 48, 430, 28);
  ctx.fillStyle = ACC;
  ctx.fillRect(c.width - 96, 400, 48, 48);
  tex.needsUpdate = true;
  return screen(tex, w, h, x, y, z);
}

export function namePlate(title: string, sub: string, x: number, y: number, z: number, w: number, h: number, bg = "#161a22") {
  const { c, ctx, tex } = canvas(640, 360);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  mono(ctx, sub.toUpperCase(), 40, 80, 26, ACC);
  display(ctx, title, 40, 230, title.length > 7 ? 78 : 104);
  ctx.fillStyle = "#2a2e38";
  ctx.fillRect(40, 290, c.width - 80, 2);
  tex.needsUpdate = true;
  return screen(tex, w, h, x, y, z);
}

export function deskModes() {
  const { c, ctx, tex } = canvas(1024, 576);
  const modes = ["limit", "sql", "mail", "experimento", "n8n", "notebook"] as const;
  let i = 0;
  const draw = () => {
    const mode = modes[i];
    ctx.fillStyle = "#0b0e14";
    ctx.fillRect(0, 0, c.width, c.height);
    if (mode === "limit") {
      mono(ctx, "LIMIT POLICY · MONITORIA", 44, 70, 26, ACC);
      display(ctx, "+12.4%", 44, 210, 120);
      mono(ctx, "volume de compras · teste vs. controle", 44, 260, 24);
      [0.82, 0.58, 0.71, 0.44].forEach((v, n) => {
        ctx.fillStyle = "#1c212b";
        ctx.fillRect(44, 310 + n * 58, 936, 36);
        ctx.fillStyle = n === 0 ? ACC : "#2f6d6a";
        ctx.fillRect(44, 310 + n * 58, 936 * v, 36);
      });
    } else if (mode === "sql") {
      mono(ctx, "databricks · notebook", 44, 70, 26, ACC);
      const lines = ["SELECT risk_band,", "  SUM(purchase_volume) AS vol,", "  AVG(daily_balance) AS bal", "FROM limit_experiments", "WHERE cohort = 'test'", "GROUP BY 1 ORDER BY 1;"];
      lines.forEach((l, n) => mono(ctx, l, 44, 140 + n * 62, 40, n === 0 || n === 3 ? PAPER : "#9aa3b2"));
    } else if (mode === "mail") {
      mono(ctx, "contato", 44, 70, 26, ACC);
      display(ctx, "me chama", 44, 220, 130);
      mono(ctx, personal.email, 44, 300, 34, PAPER);
      mono(ctx, "tecla C copia", 44, 360, 26);
    } else if (mode === "experimento") {
      mono(ctx, "lab · teste vs. controle", 44, 70, 26, ACC);
      display(ctx, "experimento", 44, 170, 88);
      mono(ctx, "ilustração · não é KPI publicado", 44, 220, 22);
      [
        ["teste", 0.74, ACC],
        ["controle", 0.51, "#2f6d6a"],
      ].forEach(([lab, v, col], n) => {
        mono(ctx, String(lab), 44, 290 + n * 110, 24, PAPER);
        ctx.fillStyle = "#1c212b";
        ctx.fillRect(44, 310 + n * 110, 936, 44);
        ctx.fillStyle = String(col);
        ctx.fillRect(44, 310 + n * 110, 936 * Number(v), 44);
      });
    } else if (mode === "n8n") {
      mono(ctx, "n8n · automação", 44, 70, 26, ACC);
      display(ctx, "fluxo", 44, 170, 100);
      const nodes = ["Webhook", "Filtro", "SQL", "Slack", "Done"];
      nodes.forEach((n, k) => {
        const x = 44 + k * 190;
        ctx.fillStyle = k === 2 ? "#161a10" : "#1c212b";
        ctx.strokeStyle = k === 2 ? ACC : "#2a2e38";
        ctx.lineWidth = 3;
        ctx.fillRect(x, 280, 160, 120);
        ctx.strokeRect(x, 280, 160, 120);
        mono(ctx, String(k + 1).padStart(2, "0"), x + 16, 320, 20, MUTED);
        display(ctx, n, x + 16, 370, 28);
        if (k < nodes.length - 1) {
          ctx.fillStyle = ACC;
          ctx.fillRect(x + 164, 332, 22, 4);
        }
      });
    } else {
      mono(ctx, "notebook · análise", 44, 70, 26, ACC);
      display(ctx, "In [3]", 44, 170, 72);
      const cells = ["# banda X · volume", "test.mean() - ctrl.mean()", "→ mesma direção", "próximo: NPL na janela"];
      cells.forEach((l, n) => {
        ctx.fillStyle = n === 1 ? "#12161c" : "#0e1218";
        ctx.fillRect(44, 220 + n * 78, 936, 68);
        mono(ctx, l, 64, 264 + n * 78, 28, n === 2 ? ACC : PAPER);
      });
    }
    tex.needsUpdate = true;
  };
  draw();
  return {
    tex,
    cycle() {
      i = (i + 1) % modes.length;
      draw();
      return modes[i];
    },
  };
}

export function noteModes() {
  const { c, ctx, tex } = canvas(768, 480);
  const modes = ["metabase", "sql", "funil"] as const;
  let i = 0;
  const draw = () => {
    const mode = modes[i];
    ctx.fillStyle = "#0b0e14";
    ctx.fillRect(0, 0, c.width, c.height);
    if (mode === "metabase") {
      mono(ctx, "METABASE · FLASH", 28, 48, 22, ACC);
      display(ctx, "pipeline", 28, 130, 64);
      [0.78, 0.62, 0.44, 0.31].forEach((v, n) => {
        ctx.fillStyle = "#1c212b";
        ctx.fillRect(28, 180 + n * 68, 712, 44);
        ctx.fillStyle = n === 0 ? ACC : "#2f6d6a";
        ctx.fillRect(28, 180 + n * 68, 712 * v, 44);
      });
    } else if (mode === "sql") {
      mono(ctx, "SQL · CS", 28, 48, 22, ACC);
      ["SELECT stage, COUNT(*)", "FROM pipeline", "WHERE month = current", "GROUP BY 1;"].forEach((l, n) => mono(ctx, l, 28, 130 + n * 70, 32, n === 0 ? ACC : PAPER));
    } else {
      mono(ctx, "FUNIL · MÊS", 28, 48, 22, ACC);
      display(ctx, "leads → win", 28, 120, 52);
      [0.92, 0.64, 0.41, 0.18].forEach((v, n) => {
        const w = 712 * v;
        const x = 28 + (712 - w) / 2;
        ctx.fillStyle = n === 3 ? ACC : "#22303e";
        ctx.fillRect(x, 170 + n * 70, w, 52);
      });
    }
    tex.needsUpdate = true;
  };
  draw();
  return {
    tex,
    cycle() {
      i = (i + 1) % modes.length;
      draw();
      return modes[i];
    },
  };
}

export function idBadge(x: number, y: number, z: number, w = 0.58, h = 0.4) {
  const { c, ctx, tex } = canvas(640, 440);
  ctx.fillStyle = "#141820";
  ctx.fillRect(0, 0, c.width, c.height);
  const pal = ["#d8ff3d", "#2f6d6a", "#8ab4ff", "#e07d4a"];
  pal.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(36 + (i % 2) * 88, 48 + Math.floor(i / 2) * 88, 80, 80);
  });
  mono(ctx, "CONTATO", 236, 70, 22, ACC);
  display(ctx, "Davi Braga", 236, 160, 48);
  mono(ctx, personal.email, 236, 220, 18, PAPER);
  mono(ctx, "LinkedIn · clica", 236, 270, 20, MUTED);
  ctx.fillStyle = ACC;
  ctx.fillRect(36, 380, c.width - 72, 8);
  tex.needsUpdate = true;
  return screen(tex, w, h, x, y, z);
}
