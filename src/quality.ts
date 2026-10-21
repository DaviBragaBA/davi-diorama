/** Quality tiers and adaptive pixel ratio. One place decides how heavy the frame is. */

export type TierName = "low" | "mid" | "high";

export type Tier = {
  name: TierName;
  /** Pixel ratio bounds for the adaptive controller. */
  dprMax: number;
  dprMin: number;
  /** MSAA samples on the composer input buffer (0 = off). */
  msaa: number;
  shadows: boolean;
  shadowSize: number;
  softShadows: boolean;
  /** Post-processing (bloom, tone mapping, vignette, grain). Off = direct render + CSS overlays. */
  post: boolean;
  bloom: boolean;
  /** Depth of field while an object is in focus. */
  dof: boolean;
};

const PHONE = 900;
export const isPhone = () => innerWidth <= PHONE;

function gpuName(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  try {
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  } catch {
    return "unknown";
  }
}

function make(name: TierName, phone: boolean): Tier {
  const dpr = Math.max(1, devicePixelRatio || 1);
  if (name === "high") {
    return { name, dprMax: Math.min(dpr, 2), dprMin: 1, msaa: 4, shadows: true, shadowSize: 2048, softShadows: true, post: true, bloom: true, dof: true };
  }
  if (name === "mid") {
    return {
      name,
      dprMax: Math.min(dpr, phone ? 1.6 : 1.5),
      dprMin: phone ? 0.9 : 1,
      msaa: phone ? 0 : 2,
      shadows: true,
      shadowSize: 1024,
      softShadows: false,
      post: true,
      bloom: true,
      dof: false,
    };
  }
  return { name, dprMax: Math.min(dpr, 1.25), dprMin: 0.75, msaa: 0, shadows: false, shadowSize: 512, softShadows: false, post: false, bloom: false, dof: false };
}

/** First guess from the device; the adaptive controller corrects it from real frame times. */
export function detectTier(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  const gpu = gpuName(gl);
  const phone = isPhone() || (matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) <= PHONE);
  const nav = navigator as Navigator & { deviceMemory?: number };
  const mem = nav.deviceMemory ?? 8;
  const cores = nav.hardwareConcurrency ?? 8;
  const soft = /swiftshader|llvmpipe|software|basic render/i.test(gpu);
  const weak = /mali-(t\d|g[1-6]\d\b)|adreno \(tm\) [2-5]\d\d|adreno [2-5]\d\d|powervr|intel.*hd graphics [2-5]\d\d\b|intel\(r\) hd graphics\b(?! [6-9])/i.test(gpu);
  const igpu = /intel/i.test(gpu) && !/arc/i.test(gpu);
  const forced = new URLSearchParams(location.search).get("q") as TierName | null;
  let name: TierName;
  let reason: string;
  if (forced === "low" || forced === "mid" || forced === "high") {
    name = forced;
    reason = "url";
  } else if (soft) {
    name = "low";
    reason = "software gl";
  } else if (phone) {
    name = weak || mem <= 3 || cores <= 4 ? "low" : "mid";
    reason = "phone";
  } else if (weak || igpu) {
    name = "mid";
    reason = "integrated gpu";
  } else {
    name = "high";
    reason = "desktop";
  }
  return { tier: make(name, phone), gpu, reason };
}

export function downTier(t: Tier): Tier | null {
  if (t.name === "high") return make("mid", isPhone());
  if (t.name === "mid") return make("low", isPhone());
  return null;
}

/**
 * Watches frame intervals in one-second windows. The display's own cadence (60, 120, or 30 Hz
 * on a phone in low-power mode) is read from the fastest frames, so a 30 Hz cap is not mistaken
 * for overload. Missing frames twice in a row: lower the pixel ratio, then drop a tier.
 * Smooth for a while: give some resolution back, never above the last level that struggled.
 */
export class Adaptive {
  dpr: number;
  private ceiling: number;
  private win: number[] = [];
  private t0 = 0;
  private bad = 0;
  private good = 0;
  private lastChange = 0;
  locked = false;
  history: { t: number; p50: number; refresh: number; dpr: number; tier: TierName }[] = [];

  constructor(
    public tier: Tier,
    private applyDpr: (dpr: number) => void,
    private dropTier: () => Tier | null
  ) {
    this.dpr = tier.dprMax;
    this.ceiling = tier.dprMax;
  }

  reset(now: number) {
    this.win.length = 0;
    this.t0 = now;
  }

  sample(dtMs: number, now: number) {
    if (dtMs > 250) return this.reset(now);
    this.win.push(dtMs);
    if (now - this.t0 < 1000 || this.win.length < 20) return;
    const d = this.win.slice().sort((a, b) => a - b);
    const p10 = d[Math.floor(d.length * 0.1)];
    const p50 = d[Math.floor(d.length * 0.5)];
    const refresh = Math.max(6.5, p10);
    this.reset(now);
    this.history.push({ t: Math.round(now), p50: +p50.toFixed(2), refresh: +refresh.toFixed(2), dpr: +this.dpr.toFixed(2), tier: this.tier.name });
    if (this.history.length > 60) this.history.shift();
    if (this.locked || now - this.lastChange < 1500) return;
    if (p50 > Math.max(19.5, refresh * 1.3)) {
      this.bad++;
      this.good = 0;
    } else if (p50 < refresh * 1.08) {
      this.good++;
      this.bad = 0;
    } else {
      this.bad = 0;
      this.good = 0;
    }
    if (this.bad >= 2) {
      this.bad = 0;
      this.lastChange = now;
      this.ceiling = Math.max(this.tier.dprMin, this.dpr * 0.95);
      if (this.dpr > this.tier.dprMin + 0.01) {
        this.dpr = Math.max(this.tier.dprMin, this.dpr * 0.82);
        this.applyDpr(this.dpr);
      } else {
        const next = this.dropTier();
        if (next) {
          this.tier = next;
          this.dpr = Math.min(this.dpr, next.dprMax);
          this.ceiling = Math.min(this.ceiling, next.dprMax);
          this.applyDpr(this.dpr);
        }
      }
    } else if (this.good >= 4 && this.dpr < this.ceiling - 0.01) {
      this.good = 0;
      this.lastChange = now;
      this.dpr = Math.min(this.ceiling, this.dpr * 1.1);
      this.applyDpr(this.dpr);
    }
  }
}
