import * as THREE from "three";
import {
  BloomEffect,
  DepthOfFieldEffect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from "postprocessing";
import type { Tier } from "./quality";

export type Post = {
  render: (dt: number) => void;
  setSize: (w: number, h: number) => void;
  /** 0..1 depth of field strength, focus distance in world units. */
  setFocus: (amount: number, distance: number, range: number) => void;
  setBloom: (k: number) => void;
  /** Called by the adaptive controller when it drops a tier: no new scene shaders, only lighter passes. */
  lighten: (next: Tier) => void;
  dispose: () => void;
};

/**
 * One HDR buffer, one merged effect pass: bloom on what is brighter than white
 * (bulbs, monitor, boards), then ACES, then a soft vignette and a little grain.
 * Depth of field is a second pass that only runs while an object is in focus.
 */
export function createPost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, tier: Tier): Post {
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType, multisampling: tier.msaa });
  composer.addPass(new RenderPass(scene, camera));

  let dof: DepthOfFieldEffect | null = null;
  let dofPass: EffectPass | null = null;
  if (tier.dof) {
    dof = new DepthOfFieldEffect(camera, { focusDistance: 3, focusRange: 1.6, bokehScale: 0, resolutionScale: 0.5 });
    dofPass = new EffectPass(camera, dof);
    dofPass.enabled = false;
    composer.addPass(dofPass);
  }

  const bloom = tier.bloom
    ? new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.92, luminanceSmoothing: 0.22, intensity: 1.05, radius: 0.68, levels: tier.name === "high" ? 7 : 5 })
    : null;
  const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
  const vignette = new VignetteEffect({ offset: 0.28, darkness: 0.58 });
  const noise = new NoiseEffect({ premultiply: true });
  noise.blendMode.opacity.value = 0.32;
  const effects = [bloom, tone, vignette, noise].filter(Boolean) as (BloomEffect | ToneMappingEffect | VignetteEffect | NoiseEffect)[];
  let finalPass = new EffectPass(camera, ...effects);
  composer.addPass(finalPass);

  const baseBloom = bloom?.intensity ?? 0;
  let dofOn = !!dof;

  return {
    render: (dt) => composer.render(dt),
    setSize: (w, h) => composer.setSize(w, h, false),
    setFocus: (amount, distance, range) => {
      if (!dof || !dofPass || !dofOn) return;
      const on = amount > 0.02;
      dofPass.enabled = on;
      if (!on) return;
      dof.cocMaterial.focusDistance = distance;
      dof.cocMaterial.focusRange = range;
      dof.bokehScale = 2.6 * amount;
    },
    setBloom: (k) => {
      if (bloom) bloom.intensity = baseBloom * k;
    },
    lighten: (next) => {
      if (!next.dof && dofPass) {
        dofOn = false;
        dofPass.enabled = false;
      }
      if (composer.multisampling !== next.msaa) composer.multisampling = next.msaa;
      if (!next.bloom && bloom) {
        composer.removePass(finalPass);
        bloom.dispose();
        const n = new NoiseEffect({ premultiply: true });
        n.blendMode.opacity.value = noise.blendMode.opacity.value;
        finalPass = new EffectPass(camera, new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }), new VignetteEffect({ offset: 0.28, darkness: 0.58 }), n);
        composer.addPass(finalPass);
      }
    },
    dispose: () => composer.dispose(),
  };
}
