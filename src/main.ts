import "./style.css";
import { bootLoader } from "./loader";

const canvas = document.querySelector<HTMLCanvasElement>("#view")!;
const stage = document.querySelector<HTMLElement>("#stage")!;
const intro = document.querySelector<HTMLElement>("#intro")!;

// The first paint only needs the intro and the loader; the 3D engine arrives as a separate chunk.
const loader = bootLoader(intro);
loader.stage(0.4, "carregando o motor 3D");

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const fonts = Promise.race([
  Promise.all([
    document.fonts?.load('800 64px "Syne"'),
    document.fonts?.load('500 32px "JetBrains Mono"'),
    document.fonts?.load('italic 32px "Instrument Serif"'),
  ]).catch(() => undefined),
  wait(3000),
]);

// the engine starts downloading right after the first paint, so it never delays it
const afterPaint = () => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0)));

afterPaint()
  .then(() => import("./story"))
  .then(async (m) => {
    loader.stage(0.48, "montando a casa");
    await fonts;
    await m.startStory(canvas, stage, loader);
    // "Fale com o Davi": a tiny entry chunk now, the panel itself only on first open
    void import("./talk/boot").then((talk) => talk.bootTalk(stage, m.sceneApi), () => {});
  })
  .catch((err) => {
    loader.fail("o 3D não abriu neste navegador");
    console.warn(err);
  });
