/**
 * Motion, trimmed to what the HUD uses: the small WAAPI `animate` for elements (hardware
 * accelerated, springs through `spring`), staggers, hover/press gestures, and a JS value
 * tween for the counters. About half the size of the full `animate`.
 */
export { animate } from "motion/mini";
export { animateValue, hover, press, spring, stagger } from "motion";
