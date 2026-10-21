let ctx: AudioContext | null = null;
let playing = false;
let master: GainNode | null = null;
let timer = 0;

function ac() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state !== "running") ctx.resume().catch(() => {});
  return ctx;
}

/** Sound effects only after the visitor has interacted: browsers block audio before that anyway. */
function canSound() {
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  return !ua || ua.hasBeenActive;
}

function tone(freq: number, t0: number, dur: number, gain: number, type: OscillatorType, out: AudioNode) {
  const c = ac();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(out);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** Lo-fi: acorde de 4 notas em triangle + baixo + tick de hi-hat filtrado. */
export function toggleMusic(): boolean {
  const c = ac();
  if (playing) {
    window.clearInterval(timer);
    master?.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.4);
    playing = false;
    return false;
  }
  master = c.createGain();
  master.gain.value = 0.0001;
  master.gain.linearRampToValueAtTime(0.16, c.currentTime + 0.8);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1800;
  master.connect(lp);
  lp.connect(c.destination);
  const chords = [
    [220, 261.6, 329.6, 392],
    [196, 246.9, 293.7, 349.2],
    [174.6, 220, 261.6, 329.6],
    [164.8, 196, 246.9, 311.1],
  ];
  const bass = [110, 98, 87.3, 82.4];
  let bar = 0;
  const step = () => {
    const t0 = c.currentTime + 0.05;
    const ch = chords[bar % chords.length];
    ch.forEach((f, i) => tone(f, t0 + i * 0.04, 1.9, 0.22, "triangle", master!));
    tone(bass[bar % bass.length], t0, 1.6, 0.35, "sine", master!);
    for (let i = 0; i < 4; i++) {
      const n = c.createBufferSource();
      const buf = c.createBuffer(1, 1200, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / d.length);
      n.buffer = buf;
      const g = c.createGain();
      g.gain.value = i % 2 ? 0.05 : 0.09;
      n.connect(g);
      g.connect(master!);
      n.start(t0 + i * 0.5);
    }
    bar++;
  };
  step();
  timer = window.setInterval(step, 2000);
  playing = true;
  return true;
}

export function musicOn() {
  return playing;
}

export function sfxClick() {
  if (!canSound()) return;
  const c = ac();
  tone(880, c.currentTime, 0.08, 0.08, "square", c.destination);
}

export function sfxWhoosh() {
  if (!canSound()) return;
  const c = ac();
  const n = c.createBufferSource();
  const buf = c.createBuffer(1, c.sampleRate * 0.35, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * Math.sin((k / d.length) * Math.PI) ** 2;
  n.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.setValueAtTime(400, c.currentTime);
  f.frequency.exponentialRampToValueAtTime(2400, c.currentTime + 0.3);
  const g = c.createGain();
  g.gain.value = 0.12;
  n.connect(f);
  f.connect(g);
  g.connect(c.destination);
  n.start();
}

export function sfxBark() {
  if (!canSound()) return;
  const c = ac();
  const t0 = c.currentTime;
  [0, 0.14].forEach((off) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(160, t0 + off);
    osc.frequency.exponentialRampToValueAtTime(90, t0 + off + 0.12);
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t0 + off);
    g.gain.exponentialRampToValueAtTime(0.35, t0 + off + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 0.13);
    osc.connect(f);
    f.connect(g);
    g.connect(c.destination);
    osc.start(t0 + off);
    osc.stop(t0 + off + 0.16);
  });
}

export function sfxPop(freq = 520) {
  if (!canSound()) return;
  const c = ac();
  tone(freq, c.currentTime, 0.14, 0.12, "sine", c.destination);
  tone(freq * 1.5, c.currentTime + 0.03, 0.12, 0.06, "sine", c.destination);
}
