import type { Lang } from "./qa";

/** Optional voice: the browser's own Web Speech API (free, offline voices when available). Off by default. */

export type SpeechHooks = { onStart: () => void; onBoundary: (charIndex: number) => void; onEnd: () => void };

export type Speech = {
  supported: boolean;
  speak: (text: string, lang: Lang, hooks: SpeechHooks) => void;
  cancel: () => void;
};

type VoiceLike = { lang: string; name: string; localService: boolean };

const WANT: Record<Lang, string[]> = { pt: ["pt-br", "pt"], en: ["en-us", "en-gb", "en"] };

/** Best voice for the language: exact locale first, then the language, then local voices. */
export function pickVoice<V extends VoiceLike>(voices: readonly V[], lang: Lang): V | null {
  let best: V | null = null;
  let bestScore = 0;
  for (const v of voices) {
    const l = v.lang.toLowerCase().replace("_", "-");
    const rank = WANT[lang].findIndex((w) => l === w || (w.length === 2 && l.startsWith(w + "-")));
    if (rank < 0) continue;
    const score = 10 - rank * 2 + (v.localService ? 1 : 0) + (/natural|neural|premium|enhanced/i.test(v.name) ? 0.5 : 0);
    if (score > bestScore) {
      best = v;
      bestScore = score;
    }
  }
  return best;
}

export function createSpeech(): Speech {
  const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
  const supported = !!synth && typeof SpeechSynthesisUtterance !== "undefined";
  let voices: SpeechSynthesisVoice[] = [];
  const load = () => {
    voices = synth?.getVoices() ?? [];
  };
  if (synth) {
    load();
    synth.addEventListener?.("voiceschanged", load);
  }
  /** Bumped on every new utterance and on cancel, so late events of an old utterance are ignored. */
  let spoken = 0;

  return {
    supported,
    speak(text, lang, hooks) {
      if (!synth) return hooks.onEnd();
      const mine = ++spoken;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === "pt" ? "pt-BR" : "en-US";
      const voice = pickVoice(voices, lang);
      if (voice) u.voice = voice;
      u.rate = 1.04;
      u.onstart = () => mine === spoken && hooks.onStart();
      u.onboundary = (e) => mine === spoken && hooks.onBoundary(e.charIndex);
      u.onend = () => mine === spoken && hooks.onEnd();
      u.onerror = () => mine === spoken && hooks.onEnd();
      synth.speak(u);
    },
    cancel() {
      spoken++;
      synth?.cancel();
    },
  };
}
