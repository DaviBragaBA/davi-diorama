import "./style.css";
import { startStory } from "./story";

const canvas = document.querySelector<HTMLCanvasElement>("#view")!;
const stage = document.querySelector<HTMLElement>("#stage")!;

document.fonts?.ready.then(() => startStory(canvas, stage)).catch(() => startStory(canvas, stage));
