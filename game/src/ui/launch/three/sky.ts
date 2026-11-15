import * as THREE from 'three'
import type { SceneLight } from './common'
import { glareTexture } from './textures'

// The sky over the pad: a dome that follows the camera, with a horizon-to-zenith gradient, a Mie halo and a warm band
// towards the Sun (dawn), the Sun's disc, haze under the horizon, and a fade to black with altitude. Plus a soft glare
// sprite on the Sun that the mountains hide when they are in front of it.

const VS = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww; // on the far plane
}`

const FS = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform vec3 uGlow;
uniform float uSpace;
uniform float uSunDisc;
uniform float uCityGlow;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float y = d.y;
  float t = pow(max(y, 0.0), 0.42);
  vec3 col = mix(uHorizon, uZenith, t);
  float mu = max(dot(d, uSunDir), 0.0);
  // Mie halo and the warm band along the horizon on the Sun's side
  col += uSunColor * (pow(mu, 6.0) * 0.28 + pow(mu, 48.0) * 0.9);
  float band = pow(max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(uSunDir.x, 0.0, uSunDir.z))), 0.0), 3.0);
  col += uGlow * band * exp(-max(y, 0.0) * 9.0);
  // the Sun's disc
  col += uSunColor * smoothstep(0.99955, 0.9998, mu) * uSunDisc;
  // the city's light dome on the horizon at night (Arequipa is behind the camera's left)
  float city = pow(max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(-0.7, 0.0, 0.7))), 0.0), 4.0);
  col += vec3(0.9, 0.45, 0.18) * city * exp(-max(y, 0.0) * 14.0) * uCityGlow;
  // below the horizon: haze, then the ground's colour
  col = mix(col, uGround, smoothstep(0.0, -0.12, y));
  col *= 1.0 - uSpace;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export function makeSky(L: SceneLight, light: 'dawn' | 'day' | 'night') {
  const c = (hex: string | number) => new THREE.Color(hex)
  // a deeper, more saturated zenith and a glowing horizon than the flat 2D palette
  const zenith = light === 'dawn' ? c('#2b2a6b') : light === 'day' ? c('#2a63c9') : c('#03081a')
  const horizon = light === 'dawn' ? c('#f4a77c') : light === 'day' ? c('#cfe2f6') : c('#1a2650')
  const glow = light === 'dawn' ? c('#ff9a52').multiplyScalar(1.4) : light === 'day' ? c('#fff4dc').multiplyScalar(0.25) : c('#000000')
  const sunColor = c(L.sunColor).multiplyScalar(light === 'night' ? 0 : light === 'dawn' ? 2.2 : 1.6)
  const uniforms = {
    uZenith: { value: zenith },
    uHorizon: { value: horizon },
    uGround: { value: c(L.fog).multiplyScalar(0.8) },
    uSunColor: { value: sunColor },
    uSunDir: { value: new THREE.Vector3(...L.sun).normalize() },
    uGlow: { value: glow },
    uSpace: { value: 0 },
    uSunDisc: { value: light === 'night' ? 0 : 40 },
    uCityGlow: { value: light === 'night' ? 0.5 : light === 'dawn' ? 0.06 : 0 },
  }
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VS, fragmentShader: FS, side: THREE.BackSide, depthWrite: false, fog: false })
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), mat)
  dome.frustumCulled = false
  dome.renderOrder = -10

  // glare on the Sun, far away so terrain occludes it
  const glareTex = glareTexture()
  const glare = new THREE.Sprite(new THREE.SpriteMaterial({ map: glareTex, color: c(L.sunColor).multiplyScalar(light === 'dawn' ? 2.6 : 1.6), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }))
  glare.visible = light !== 'night'
  const sunDir = new THREE.Vector3(...L.sun).normalize()

  return {
    dome,
    glare,
    uniforms,
    /** keep the dome and the glare around the camera; `space` 0..1 fades the sky to black */
    update: (camera: THREE.Camera, space: number, sunWorld: THREE.Vector3) => {
      dome.position.copy(camera.position)
      uniforms.uSpace.value = space
      uniforms.uSunDir.value.copy(sunWorld).normalize()
      sunDir.copy(uniforms.uSunDir.value)
      glare.position.copy(camera.position).addScaledVector(sunDir, 18000)
      glare.scale.setScalar(light === 'dawn' ? 5200 : 3600)
      ;(glare.material as THREE.SpriteMaterial).opacity = light === 'night' ? 0 : 0.8 * (1 - space * 0.6)
    },
    dispose: () => {
      dome.geometry.dispose()
      mat.dispose()
      glareTex.dispose()
      glare.material.dispose()
    },
  }
}
