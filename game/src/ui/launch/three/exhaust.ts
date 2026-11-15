import * as THREE from 'three'
import { puffAtlas } from './textures'

// Rocket exhaust for the 3D launch: a shader plume (bright core with shock diamonds low in the atmosphere that opens into a
// wide, faint vacuum plume with altitude) and a single instanced smoke system for everything soft — the steam and smoke
// cloud at the pad, the exhaust trail, venting oxygen, staging puffs, the cloud deck and the explosion. One draw call,
// sorted back to front, lit by the Sun (only above `sunlitFrom` at dawn, so the high trail glows while the pad is in
// shadow) and by the flame.

const PLUME_VS = /* glsl */ `
uniform float uLen;
uniform float uR;
uniform float uExpand;
uniform float uTime;
varying float vS;
varying vec3 vN;
varying vec3 vV;
void main() {
  float s = clamp(-position.y, 0.0, 1.0);
  float ang = atan(position.z, position.x);
  float rSea = uR * (0.92 + 0.35 * s) * (1.0 - 0.35 * smoothstep(0.75, 1.0, s));
  float rVac = uR * (1.0 + 9.0 * pow(s, 0.6));
  float r = mix(rSea, rVac, uExpand);
  r *= 1.0 + 0.06 * sin(s * 23.0 - uTime * 47.0 + ang * 3.0) * (0.3 + s);
  vec3 p = vec3(cos(ang) * r, -s * uLen, sin(ang) * r);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vS = s;
  vN = normalize(normalMatrix * vec3(cos(ang), 0.15, sin(ang)));
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`

const PLUME_FS = /* glsl */ `
uniform float uExpand;
uniform float uThrottle;
uniform float uTime;
uniform float uDiamonds;
uniform float uHot;
uniform vec3 uCore;
uniform vec3 uMid;
uniform vec3 uTail;
varying float vS;
varying vec3 vN;
varying vec3 vV;
float h11(float p){ return fract(sin(p * 127.1) * 43758.5453); }
void main() {
  float facing = abs(dot(normalize(vN), normalize(vV)));
  float core = pow(facing, mix(1.6, 3.2, uExpand));
  float along = exp(-vS * mix(2.4, 1.6, uExpand)) * smoothstep(0.0, 0.03, vS);
  float dia = pow(0.5 + 0.5 * cos(vS * uDiamonds * 6.2831 - 0.6), 10.0) * (1.0 - uExpand) * exp(-vS * 3.0) * smoothstep(0.03, 0.1, vS);
  float flick = 0.85 + 0.15 * h11(floor(uTime * 30.0) + floor(vS * 12.0));
  vec3 col = mix(uTail, uMid, exp(-vS * 3.0));
  col = mix(col, uCore, exp(-vS * 9.0) * uHot);
  float I = (along * core * (1.0 - 0.75 * uExpand) + dia * core * 2.4) * uThrottle * flick;
  gl_FragColor = vec4(col * I, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export interface Plume {
  group: THREE.Group
  /** length (m), radius at the nozzle (m), 0 = sea level .. 1 = vacuum, throttle 0..1, upper stage (bluer, cleaner) */
  set: (len: number, r: number, expand: number, throttle: number, upper: boolean, time: number) => void
  dispose: () => void
}

export function makePlume(): Plume {
  const geo = new THREE.CylinderGeometry(1, 1, 1, 40, 48, true)
  geo.translate(0, -0.5, 0)
  const mk = (core: number, mid: number, tail: number, hot: number, diamonds: number) =>
    new THREE.ShaderMaterial({
      uniforms: {
        uLen: { value: 10 },
        uR: { value: 1 },
        uExpand: { value: 0 },
        uTime: { value: 0 },
        uThrottle: { value: 1 },
        uDiamonds: { value: diamonds },
        uHot: { value: hot },
        uCore: { value: new THREE.Color(core).multiplyScalar(6) },
        uMid: { value: new THREE.Color(mid).multiplyScalar(3.2) },
        uTail: { value: new THREE.Color(tail).multiplyScalar(1.2) },
      },
      vertexShader: PLUME_VS,
      fragmentShader: PLUME_FS,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  const inner = new THREE.Mesh(geo, mk(0xfff6e0, 0xffd28a, 0xff8a3a, 1, 5.5))
  const outer = new THREE.Mesh(geo, mk(0xffc070, 0xff9a40, 0xc0502a, 0.4, 0))
  inner.frustumCulled = outer.frustumCulled = false
  inner.renderOrder = outer.renderOrder = 5
  const group = new THREE.Group()
  group.add(outer, inner)
  const mats = [inner.material, outer.material]
  const seaInner = { core: new THREE.Color(0xfff6e0).multiplyScalar(6), mid: new THREE.Color(0xffd28a).multiplyScalar(3.2), tail: new THREE.Color(0xff8a3a).multiplyScalar(1.2) }
  const vacInner = { core: new THREE.Color(0xf4f6ff).multiplyScalar(5), mid: new THREE.Color(0xb8c8ff).multiplyScalar(1.6), tail: new THREE.Color(0x6f86d8).multiplyScalar(0.6) }
  return {
    group,
    set: (len, r, expand, throttle, upper, time) => {
      group.visible = throttle > 0.02
      const iu = inner.material.uniforms
      iu.uLen.value = len * (upper ? 0.9 : 0.55)
      iu.uR.value = r * 0.62
      iu.uExpand.value = expand
      iu.uThrottle.value = throttle
      iu.uTime.value = time
      const ou = outer.material.uniforms
      ou.uLen.value = len
      ou.uR.value = r * (1 + expand * 0.4)
      ou.uExpand.value = expand
      ou.uThrottle.value = throttle * (upper ? 0.35 : 0.55 + 0.25 * (1 - expand))
      ou.uTime.value = time
      const k = upper ? 1 : expand * 0.6
      iu.uCore.value.copy(seaInner.core).lerp(vacInner.core, k)
      iu.uMid.value.copy(seaInner.mid).lerp(vacInner.mid, k)
      iu.uTail.value.copy(seaInner.tail).lerp(vacInner.tail, k)
      iu.uDiamonds.value = upper ? 0 : 5.5
    },
    dispose: () => {
      geo.dispose()
      mats.forEach((m) => m.dispose())
    },
  }
}

// ---- smoke ----

const SMOKE_VS = /* glsl */ `
attribute vec3 iPos;
attribute vec4 iData;   // size, alpha, heat, rotation
attribute vec4 iColor;  // rgb, tile
varying vec2 vUv;
varying vec2 vQ;
varying vec4 vData;
varying vec3 vColor;
varying vec3 vView;
varying float vAlt;
void main() {
  vec4 mv = viewMatrix * vec4(iPos, 1.0);
  float c = cos(iData.w), s = sin(iData.w);
  vec2 q = position.xy;
  vec2 rq = vec2(q.x * c - q.y * s, q.x * s + q.y * c);
  mv.xy += rq * iData.x;
  float tile = iColor.w;
  vUv = uv * 0.5 + vec2(mod(tile, 2.0), floor(tile / 2.0)) * 0.5;
  vQ = rq * 2.0;
  vData = iData;
  vColor = iColor.rgb;
  vView = mv.xyz;
  vAlt = iPos.y;
  gl_Position = projectionMatrix * mv;
}`

const SMOKE_FS = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec3 uSunView;
uniform vec3 uSunColor;
uniform vec3 uAmbient;
uniform vec3 uShade;
uniform vec2 uSunlit;
uniform vec3 uFlameView;
uniform vec3 uFlameColor;
uniform float uFlameI;
uniform vec3 uFogColor;
uniform vec2 uFog;
uniform float uSpace;
varying vec2 vUv;
varying vec2 vQ;
varying vec4 vData;
varying vec3 vColor;
varying vec3 vView;
varying float vAlt;
void main() {
  float d = texture2D(uAtlas, vUv).r;
  float a = d * vData.y;
  if (a < 0.004) discard;
  // a ball-shaped normal for the puff: the side towards the Sun is bright, the far side takes the sky's colour
  float r2 = dot(vQ, vQ);
  vec3 n = normalize(vec3(vQ, sqrt(max(0.0, 1.0 - min(r2, 1.0))) + 0.25));
  float ndl = clamp(dot(n, uSunView) * 0.6 + 0.4, 0.0, 1.0);
  float lit = smoothstep(uSunlit.x, uSunlit.y, vAlt);
  vec3 light = mix(uShade, uAmbient, 0.4 + 0.6 * lit) + uSunColor * ndl * lit;
  // the flame lights the cloud from inside
  float fd = length(vView - uFlameView);
  light += uFlameColor * uFlameI / (1.0 + fd * fd * 0.0016);
  vec3 col = vColor * light * (0.75 + 0.35 * d);
  col = mix(col, vec3(1.0, 0.62, 0.3) * 4.0, vData.z * d);
  float f = smoothstep(uFog.x, uFog.y, -vView.z) * (1.0 - uSpace);
  col = mix(col, uFogColor, f);
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

interface P {
  x: number; y: number; z: number
  vx: number; vy: number; vz: number
  size: number; grow: number
  life: number; max: number
  a0: number; heat: number; cool: number
  drag: number; lift: number
  rot: number; spin: number
  r: number; g: number; b: number
  tile: number
  /** static (cloud deck): never ages */
  fixed: boolean
  /** depth along the view, for sorting */
  d: number
}

export interface SmokeLight {
  sunView: THREE.Vector3
  sunColor: THREE.Color
  ambient: THREE.Color
  shade: THREE.Color
  /** altitude band where puffs turn from shaded to sunlit */
  sunlit: [number, number]
  flameWorld: THREE.Vector3
  flameColor: THREE.Color
  flameI: number
  fogColor: THREE.Color
  fog: [number, number]
  space: number
}

export function makeSmoke(max = 2600) {
  const atlas = puffAtlas()
  const quad = new THREE.PlaneGeometry(1, 1)
  const geo = new THREE.InstancedBufferGeometry()
  geo.index = quad.index
  geo.setAttribute('position', quad.getAttribute('position'))
  geo.setAttribute('uv', quad.getAttribute('uv'))
  const iPos = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3)
  const iData = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4)
  const iColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4)
  for (const a of [iPos, iData, iColor]) a.setUsage(THREE.DynamicDrawUsage)
  geo.setAttribute('iPos', iPos)
  geo.setAttribute('iData', iData)
  geo.setAttribute('iColor', iColor)
  geo.instanceCount = 0
  const uniforms = {
    uAtlas: { value: atlas },
    uSunView: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color(1, 1, 1) },
    uAmbient: { value: new THREE.Color(0.5, 0.5, 0.6) },
    uShade: { value: new THREE.Color(0.3, 0.3, 0.4) },
    uSunlit: { value: new THREE.Vector2(-10, -5) },
    uFlameView: { value: new THREE.Vector3() },
    uFlameColor: { value: new THREE.Color(1, 0.6, 0.3) },
    uFlameI: { value: 0 },
    uFogColor: { value: new THREE.Color() },
    uFog: { value: new THREE.Vector2(1000, 9000) },
    uSpace: { value: 0 },
  }
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: SMOKE_VS, fragmentShader: SMOKE_FS, transparent: true, depthWrite: false })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.frustumCulled = false
  mesh.renderOrder = 4
  const ps: P[] = []
  const drop = (i: number) => {
    ps[i] = ps[ps.length - 1]
    ps.pop()
  }

  const add = (p: Partial<P> & { x: number; y: number; z: number; size: number; max: number }) => {
    if (ps.length >= max) return
    ps.push({ vx: 0, vy: 0, vz: 0, grow: 0, life: 0, a0: 0.6, heat: 0, cool: 1, drag: 0.5, lift: 0, rot: 0, spin: 0, r: 1, g: 1, b: 1, tile: 0, fixed: false, d: 0, ...p })
  }
  const tmp = new THREE.Vector3()
  return {
    mesh,
    add,
    count: () => ps.length,
    /** remove every moving puff (the clock went back) */
    clear: () => {
      for (let i = ps.length - 1; i >= 0; i--) if (!ps[i].fixed) drop(i)
    },
    /** age and move the puffs by `dt` scene seconds; `wind` in m/s */
    step: (dt: number, wind: THREE.Vector3) => {
      if (dt <= 0) return
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i]
        if (p.fixed) continue
        p.life += dt
        if (p.life >= p.max) {
          drop(i)
          continue
        }
        const k = Math.max(0, 1 - p.drag * dt)
        p.vx = p.vx * k + wind.x * (1 - k)
        p.vy = p.vy * k + p.lift * dt
        p.vz = p.vz * k + wind.z * (1 - k)
        p.x += p.vx * dt
        p.y = Math.max(p.y + p.vy * dt, p.size * 0.28)
        p.z += p.vz * dt
        p.size += p.grow * dt * (1 - 0.6 * (p.life / p.max))
        p.rot += p.spin * dt
        p.heat = Math.max(0, p.heat - dt * p.cool)
      }
    },
    /** sort back to front for `camera` and upload */
    upload: (camera: THREE.Camera, L: SmokeLight) => {
      camera.getWorldDirection(tmp)
      const cx = camera.position.x
      const cy = camera.position.y
      const cz = camera.position.z
      for (const p of ps) p.d = (p.x - cx) * tmp.x + (p.y - cy) * tmp.y + (p.z - cz) * tmp.z
      ps.sort((a, b) => b.d - a.d)
      let n = 0
      for (const p of ps) {
        if (p.d < -p.size) continue // behind the camera
        const k = p.life / p.max
        const fade = p.fixed ? 1 : (1 - k) * (1 - k) * Math.min(1, k / 0.06)
        iPos.array[n * 3] = p.x
        iPos.array[n * 3 + 1] = p.y
        iPos.array[n * 3 + 2] = p.z
        iData.array[n * 4] = p.size
        iData.array[n * 4 + 1] = p.a0 * fade
        iData.array[n * 4 + 2] = p.heat
        iData.array[n * 4 + 3] = p.rot
        iColor.array[n * 4] = p.r
        iColor.array[n * 4 + 1] = p.g
        iColor.array[n * 4 + 2] = p.b
        iColor.array[n * 4 + 3] = p.tile
        n++
      }
      geo.instanceCount = n
      for (const a of [iPos, iData, iColor]) {
        a.clearUpdateRanges()
        a.addUpdateRange(0, n * a.itemSize)
        a.needsUpdate = true
      }
      const u = uniforms
      u.uSunView.value.copy(L.sunView)
      u.uSunColor.value.copy(L.sunColor)
      u.uAmbient.value.copy(L.ambient)
      u.uShade.value.copy(L.shade)
      u.uSunlit.value.set(L.sunlit[0], L.sunlit[1])
      u.uFlameView.value.copy(L.flameWorld).applyMatrix4(camera.matrixWorldInverse)
      u.uFlameColor.value.copy(L.flameColor)
      u.uFlameI.value = L.flameI
      u.uFogColor.value.copy(L.fogColor)
      u.uFog.value.set(L.fog[0], L.fog[1])
      u.uSpace.value = L.space
    },
    dispose: () => {
      atlas.dispose()
      quad.dispose()
      geo.dispose()
      mat.dispose()
    },
  }
}
export type Smoke = ReturnType<typeof makeSmoke>
