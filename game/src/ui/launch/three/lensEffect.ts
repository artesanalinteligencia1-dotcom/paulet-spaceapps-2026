import * as THREE from 'three'
import { BlendFunction, Effect, EffectAttribute } from 'postprocessing'

// Camera looks, after tone mapping: heat shimmer and haze for the long lens of the ground camera, and the small wide
// lens bolted to the rocket (barrel distortion, colour fringes, a strong round vignette and dirt on the glass that lights
// up when the Sun or the flame is in view).

const FRAG = /* glsl */ `
uniform float uShimmer;
uniform float uHaze;
uniform vec3 uHazeColor;
uniform float uOnboard;
uniform float uClock;
uniform sampler2D uDirt;
float lh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float lvn(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(lh(i), lh(i + vec2(1.0, 0.0)), f.x), mix(lh(i + vec2(0.0, 1.0)), lh(i + vec2(1.0, 1.0)), f.x), f.y);
}
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 c = uv - 0.5;
  float r2 = dot(c, c);
  vec2 q = 0.5 + c * (1.0 - uOnboard * 0.16 * r2 * 2.0);
  vec2 n = vec2(lvn(uv * vec2(34.0, 62.0) + vec2(0.0, uClock * 2.6)), lvn(uv * vec2(39.0, 58.0) + vec2(13.0, uClock * 2.1))) - 0.5;
  q += n * uShimmer * 0.0045;
  vec3 col;
  if (uOnboard > 0.001 || uShimmer > 0.001) {
    float ca = uOnboard * 0.004 * (0.25 + r2 * 4.0);
    col = vec3(texture2D(inputBuffer, q + c * ca).r, texture2D(inputBuffer, q).g, texture2D(inputBuffer, q - c * ca).b);
  } else {
    col = inputColor.rgb;
  }
  col = mix(col, uHazeColor, uHaze);
  if (uOnboard > 0.001) {
    // how much bright light falls on the lens: a few wide samples
    vec3 s = texture2D(inputBuffer, vec2(0.5, 0.5)).rgb + texture2D(inputBuffer, vec2(0.25, 0.3)).rgb + texture2D(inputBuffer, vec2(0.75, 0.3)).rgb
           + texture2D(inputBuffer, vec2(0.25, 0.75)).rgb + texture2D(inputBuffer, vec2(0.75, 0.75)).rgb + texture2D(inputBuffer, uv).rgb * 2.0;
    float glow = smoothstep(0.35, 1.2, dot(s / 7.0, vec3(0.333)) * 1.6);
    col += texture2D(uDirt, uv).rgb * uOnboard * (0.006 + 0.22 * glow) * vec3(1.0, 0.93, 0.85);
    float v = smoothstep(0.78, 0.18, length(c * vec2(1.0, 0.78)) * 1.12);
    col *= mix(1.0, v, uOnboard * 0.9);
  }
  outputColor = vec4(col, inputColor.a);
}`

export class LensEffect extends Effect {
  constructor(dirt: THREE.Texture) {
    super('LensEffect', FRAG, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, THREE.Uniform>([
        ['uShimmer', new THREE.Uniform(0)],
        ['uHaze', new THREE.Uniform(0)],
        ['uHazeColor', new THREE.Uniform(new THREE.Color(0.8, 0.8, 0.85))],
        ['uOnboard', new THREE.Uniform(0)],
        ['uClock', new THREE.Uniform(0)],
        ['uDirt', new THREE.Uniform(dirt)],
      ]),
    })
  }
  set(shimmer: number, haze: number, hazeColor: THREE.Color, onboard: number, clock: number) {
    this.uniforms.get('uShimmer')!.value = shimmer
    this.uniforms.get('uHaze')!.value = haze
    ;(this.uniforms.get('uHazeColor')!.value as THREE.Color).copy(hazeColor)
    this.uniforms.get('uOnboard')!.value = onboard
    this.uniforms.get('uClock')!.value = clock
  }
}
