import type { Lang } from "./qa";
import type { Speech } from "./speech";

/**
 * Plays one ready-made answer: a typing effect for the transcript, subtitle cues for the scene,
 * mouth energy for the avatar and, when the voice toggle is on, the browser's speech synthesis.
 * With reduced motion the text appears at once and the subtitles change without animation.
 */

export type Cue = { start: number; end: number };

const ABBREV = new Set(["vs", "ex", "eg", "ie", "sr", "sra", "dr"]);
const END = /[.!?…]/;
const SOFT = /[,;:—]/;

/** Splits text into contiguous subtitle cues: sentences, and long sentences at commas or semicolons. */
export function splitCues(text: string, max = 110): Cue[] {
  const sentences: Cue[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (!END.test(text[i])) continue;
    const next = text[i + 1];
    if (next !== undefined && next !== " " && next !== "\n" && next !== "”" && next !== '"') continue;
    const word = text.slice(start, i).split(/\s+/).pop()?.replace(/[^\p{L}.]/gu, "").replace(/\./g, "").toLowerCase() ?? "";
    if (text[i] === "." && ABBREV.has(word)) continue;
    let end = i + 1;
    while (end < text.length && /["”\s]/.test(text[end])) end++;
    sentences.push({ start, end });
    start = end;
  }
  if (start < text.length) sentences.push({ start, end: text.length });

  const cues: Cue[] = [];
  for (const s of sentences) {
    let a = s.start;
    while (s.end - a > max) {
      let cut = -1;
      for (let i = a + max; i > a + max * 0.4; i--) {
        if (SOFT.test(text[i]) && text[i + 1] === " ") {
          cut = i + 2;
          break;
        }
      }
      if (cut < 0) {
        cut = text.lastIndexOf(" ", a + max);
        if (cut <= a) break;
        cut += 1;
      }
      cues.push({ start: a, end: cut });
      a = cut;
    }
    cues.push({ start: a, end: s.end });
  }
  return cues;
}

/** Seconds the typing effect spends on character i (pauses after punctuation). */
export function charCost(text: string, i: number, cps: number) {
  const ch = text[i];
  const after = text[i + 1];
  const ends = after === undefined || after === " ";
  let t = 1 / cps;
  if (ends && END.test(ch)) t += 0.22;
  else if (ends && SOFT.test(ch)) t += 0.09;
  return t;
}

export type PlayHooks = {
  reveal: (n: number) => void;
  cue: (index: number, shown: string) => void;
  energy: (e: number) => void;
  talking: (on: boolean) => void;
};

export type Playback = {
  /** All text is visible. */
  done: Promise<void>;
  /** Subtitles and voice are over. */
  ended: Promise<void>;
  progress: () => number;
  skip: () => void;
  cancel: () => void;
};

export function playAnswer(text: string, opts: { reduced: boolean; speech: Speech | null; lang: Lang; cps?: number }, hooks: PlayHooks): Playback {
  const cues = splitCues(text);
  const cps = opts.cps ?? 55;
  let n = 0;
  let cueIndex = -1;
  let stopped = false;
  let raf = 0;
  let timer = 0;
  let resolveDone!: () => void;
  let resolveEnded!: () => void;
  const done = new Promise<void>((r) => (resolveDone = r));
  const ended = new Promise<void>((r) => (resolveEnded = r));

  const cueAt = (pos: number) => {
    const p = Math.max(0, Math.min(text.length - 1, pos));
    const i = cues.findIndex((c) => p >= c.start && p < c.end);
    return i < 0 ? cues.length - 1 : i;
  };
  // A subtitle shows its whole line as soon as the voice (or the typing) reaches it, like film subtitles.
  const showCue = (i: number) => {
    const c = cues[i];
    if (!c || i === cueIndex) return;
    cueIndex = i;
    hooks.cue(i, text.slice(c.start, c.end).trim());
  };
  const setN = (next: number, pulse = !opts.reduced) => {
    const m = Math.max(n, Math.min(text.length, next));
    if (m === n) return;
    if (pulse && /[\p{L}\p{N}]/u.test(text.slice(n, m))) hooks.energy(1);
    n = m;
    hooks.reveal(n);
    showCue(cueAt(n - 1));
    if (n >= text.length) resolveDone();
  };
  const finish = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    hooks.talking(false);
    resolveDone();
    resolveEnded();
  };

  // Typing at a fixed pace, from character `from` to `to`.
  const type = (to: number, pace: number, then: () => void) => {
    let last = performance.now();
    let budget = 0;
    const step = (now: number) => {
      if (stopped) return;
      budget += Math.min(0.5, (now - last) / 1000);
      last = now;
      let next = n;
      while (next < to && budget >= charCost(text, next, pace)) {
        budget -= charCost(text, next, pace);
        next++;
      }
      setN(next);
      if (n >= to) return then();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };

  const speech = opts.speech?.supported ? opts.speech : null;

  // Voice: one utterance per cue; typing follows the voice (boundary events when the voice sends them).
  const speakFrom = (i: number) => {
    if (stopped) return;
    if (i >= cues.length) {
      setN(text.length);
      timer = window.setTimeout(finish, 250);
      return;
    }
    const c = cues[i];
    const spoken = text.slice(c.start, c.end);
    let started = false;
    showCue(i);
    timer = window.setTimeout(() => {
      if (started || stopped) return;
      speech!.cancel();
      if (opts.reduced) return finishReducedCues(i);
      type(text.length, cps, () => (timer = window.setTimeout(finish, 300)));
    }, 1600);
    speech!.speak(spoken, opts.lang, {
      onStart: () => {
        started = true;
        clearTimeout(timer);
        if (!opts.reduced) type(c.end, 15, () => {});
      },
      onBoundary: (ci) => {
        if (opts.reduced) return hooks.energy(1);
        const wordEnd = text.slice(c.start + ci).search(/[\s,.;:!?]/);
        setN(c.start + ci + (wordEnd < 0 ? 0 : wordEnd));
      },
      onEnd: () => {
        if (stopped) return;
        cancelAnimationFrame(raf);
        if (!opts.reduced) setN(c.end);
        speakFrom(i + 1);
      },
    });
  };

  // Reduced motion without voice: the whole text at once, subtitles step through the cues.
  const finishReducedCues = (from: number) => {
    let i = from;
    const next = () => {
      if (stopped) return;
      if (i >= cues.length) return finish();
      const c = cues[i];
      showCue(i);
      const read = Math.max(1.8, (c.end - c.start) / 17);
      i++;
      timer = window.setTimeout(next, read * 1000);
    };
    next();
  };

  hooks.talking(true);
  if (opts.reduced) {
    setN(text.length);
    if (speech) speakFrom(0);
    else finishReducedCues(0);
  } else if (speech) {
    speakFrom(0);
  } else {
    type(text.length, cps, () => (timer = window.setTimeout(finish, 350)));
  }

  return {
    done,
    ended,
    progress: () => (text.length ? n / text.length : 1),
    skip: () => {
      if (stopped) return;
      speech?.cancel();
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      setN(text.length);
      if (cueIndex >= 0) showCue(cues.length - 1);
      finish();
    },
    cancel: () => {
      if (stopped) return;
      speech?.cancel();
      setN(text.length);
      finish();
    },
  };
}
