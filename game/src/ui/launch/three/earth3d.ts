import * as THREE from 'three'

// The real Earth for the 3D launch: NASA Blue Marble (day) and Black Marble (city lights) blended by the Sun direction,
// procedural clouds with their shadows, sun glint on the oceans and a Rayleigh-like atmosphere (rim on the disc and a
// glowing limb shell). Plus the geography of the launch: Arequipa, the launch azimuth and the ground track.
//
// Earth frame (the frame of three's SphereGeometry with an equirectangular map): +y = north pole, longitude 0 on +x,
// 90° E on −z. `geoVec` turns latitude/longitude into a unit vector of that frame.

export const SITE = { lat: -16.4, lon: -71.5 } // Arequipa, Peru
export const EARTH_KM = 6371

const D2R = Math.PI / 180

export function geoVec(latDeg: number, lonDeg: number, out = new THREE.Vector3()) {
  const la = latDeg * D2R
  const lo = lonDeg * D2R
  return out.set(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo))
}

/** Local east, north and up at a point `p` (unit vector) of the Earth frame. */
export function enu(p: THREE.Vector3) {
  const up = p.clone().normalize()
  const east = new THREE.Vector3(0, 1, 0).cross(up).normalize()
  const north = up.clone().cross(east).normalize()
  return { east, north, up }
}

/** Unit heading at the site for an azimuth in degrees (0 = north, 90 = east). */
export function headingAt(site: THREE.Vector3, azDeg: number) {
  const { east, north } = enu(site)
  return north.multiplyScalar(Math.cos(azDeg * D2R)).addScaledVector(east, Math.sin(azDeg * D2R)).normalize()
}

/** A point of the great circle from `site` along `head`, `angle` radians away (unit vector). */
export const trackPoint = (site: THREE.Vector3, head: THREE.Vector3, angle: number, out = new THREE.Vector3()) =>
  out.copy(site).multiplyScalar(Math.cos(angle)).addScaledVector(head, Math.sin(angle))
/** The direction of travel at that point. */
export const trackTangent = (site: THREE.Vector3, head: THREE.Vector3, angle: number, out = new THREE.Vector3()) =>
  out.copy(site).multiplyScalar(-Math.sin(angle)).addScaledVector(head, Math.cos(angle))

export type OrbitTarget = 'leo' | 'sso' | 'gto' | 'tli' | 'tmi'
/** What the launch aims for: the catalog launch target, the orbit's altitude, optionally an inclination. */
export interface OrbitInfo {
  target?: OrbitTarget
  altitudeKm?: number
  inclinationDeg?: number
}

/**
 * Launch azimuth from Arequipa (degrees from north). Sun-synchronous and polar orbits head south (slightly west for the
 * retrograde SSO, ≈ 188°); the others head east. With an inclination: sin(az) = cos(i) / cos(latitude).
 */
export function launchAzimuth(orbit?: OrbitInfo) {
  const target = orbit?.target ?? 'sso'
  const inc = orbit?.inclinationDeg ?? (target === 'sso' ? 97.9 : undefined)
  if (inc === undefined) return 90
  const s = Math.cos(inc * D2R) / Math.cos(SITE.lat * D2R)
  if (Math.abs(s) >= 1) return 90
  // the southern branch: polar and retrograde orbits fly south over the Pacific, prograde inclined ones south-east
  return 180 - Math.asin(s) / D2R
}

/** Sun direction in the Earth frame for the pad's light: dawn = low in the east, day = high, night = below the horizon. */
export function sunAtSite(light: 'dawn' | 'day' | 'night') {
  const site = geoVec(SITE.lat, SITE.lon)
  const { east, north, up } = enu(site)
  const el = (light === 'dawn' ? 4 : light === 'day' ? 62 : -38) * D2R
  const az = (light === 'dawn' ? 108 : light === 'day' ? 40 : 250) * D2R
  const h = north.multiplyScalar(Math.cos(az)).addScaledVector(east, Math.sin(az))
  return h.multiplyScalar(Math.cos(el)).addScaledVector(up, Math.sin(el)).normalize()
}

// ---- shaders ----

const NOISE = /* glsl */ `
float h31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm3(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { s += a * n3(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
`

const SURFACE_VS = /* glsl */ `
varying vec2 vUv;
varying vec3 vN;
varying vec3 vObj;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vObj = normalize(position);
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`

const SURFACE_FS = /* glsl */ `
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform float uReady;
uniform vec3 uSun;
uniform vec3 uAtmo;
uniform float uOpacity;
uniform float uTime;
uniform float uClouds;
uniform float uLights;
uniform float uCloudScale;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vObj;
varying vec3 vWorld;
${NOISE}
float cloudsAt(vec3 p) {
  vec3 q = p * uCloudScale + vec3(uTime * 0.004, 0.0, uTime * 0.002);
  float c = fbm3(q + 0.6 * vec3(fbm3(q * 0.5 + 3.1), 0.0, fbm3(q * 0.5 + 7.7)));
  // more cloud near the equator and at mid-latitudes, clear subtropical deserts
  float lat = abs(p.y);
  float belt = 0.55 + 0.25 * smoothstep(0.0, 0.15, lat) - 0.2 * smoothstep(0.2, 0.45, lat) * (1.0 - smoothstep(0.5, 0.75, lat)) + 0.15 * smoothstep(0.6, 0.85, lat);
  return smoothstep(0.62 - 0.12 * belt, 0.82 - 0.1 * belt, c) * uClouds;
}
void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 day = mix(vec3(0.02, 0.05, 0.12), texture2D(uDay, vUv).rgb, uReady);
  vec3 night = texture2D(uNight, vUv).rgb * uReady;
  float mu = dot(N, uSun);
  float lit = smoothstep(-0.08, 0.22, mu);
  float lum = dot(day, vec3(0.299, 0.587, 0.114));
  float water = smoothstep(1.1, 1.6, day.b / max(day.r, 0.004)) * (1.0 - smoothstep(0.08, 0.2, lum));
  // clouds and their shadows (the shadow is the cloud field shifted away from the Sun)
  float cl = cloudsAt(vObj);
  float sh = cloudsAt(normalize(vObj - uSun * 0.006));
  vec3 col = day * (0.012 + 1.05 * max(mu, 0.0)) * (1.0 - 0.45 * sh * lit);
  // sun glint on the water
  vec3 H = normalize(uSun + V);
  float spec = pow(max(dot(N, H), 0.0), 90.0) * 1.6 + pow(max(dot(N, H), 0.0), 12.0) * 0.06;
  col += vec3(1.0, 0.86, 0.66) * spec * water * (1.0 - cl) * smoothstep(0.0, 0.15, mu);
  // clouds: bright on the day side, faintly blue in twilight
  vec3 cloudCol = vec3(1.0) * (0.02 + 1.15 * max(mu, 0.0)) + vec3(0.25, 0.12, 0.05) * smoothstep(-0.1, 0.05, mu) * (1.0 - smoothstep(0.05, 0.25, mu));
  col = mix(col, cloudCol, cl * 0.92);
  // warm band along the terminator
  float twi = smoothstep(-0.12, 0.0, mu) * (1.0 - smoothstep(0.0, 0.22, mu));
  col += vec3(0.32, 0.1, 0.03) * twi * 0.25;
  // city lights on the night side, dimmed under clouds
  float dark = 1.0 - smoothstep(-0.06, 0.1, mu);
  col += pow(night, vec3(1.3)) * vec3(1.0, 0.72, 0.42) * 2.4 * dark * (1.0 - cl * 0.8) * uLights;
  // atmosphere seen through: blue haze towards the limb on the lit side
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.5);
  float aLit = smoothstep(-0.2, 0.35, mu);
  col = mix(col, uAtmo * (0.25 + 1.1 * aLit), clamp(fres * 0.85, 0.0, 1.0) * aLit) + uAtmo * 0.035 * aLit;
  gl_FragColor = vec4(col, uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

const ATMO_VS = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`

/** The limb: for each view ray, the density at its closest approach to the centre, coloured by the Sun there. */
const ATMO_FS = /* glsl */ `
uniform vec3 uCenter;
uniform float uR;
uniform float uTop;
uniform vec3 uSun;
uniform vec3 uRay;
uniform vec3 uSunset;
uniform float uOpacity;
varying vec3 vWorld;
void main() {
  vec3 ro = cameraPosition - uCenter;
  vec3 rd = normalize(vWorld - cameraPosition);
  float tc = max(-dot(ro, rd), 0.0);
  vec3 pc = ro + rd * tc;
  float h = length(pc);
  float alt = (h - uR) / (uTop - uR);
  if (alt > 1.0) discard;
  float dens = exp(-max(alt, 0.0) * 3.6) * smoothstep(1.0, 0.7, alt);
  vec3 n = pc / max(h, 1e-4);
  float mu = dot(n, uSun);
  float lit = smoothstep(-0.25, 0.3, mu);
  float sunset = smoothstep(-0.32, -0.04, mu) * (1.0 - smoothstep(-0.04, 0.28, mu));
  float fwd = pow(max(dot(rd, uSun), 0.0), 6.0);
  vec3 col = (uRay * lit + uSunset * sunset * 0.9) * (1.0 + 1.6 * fwd);
  gl_FragColor = vec4(col * dens * uOpacity, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export interface RealEarth {
  group: THREE.Group
  /** the sphere (its material's uniforms are public) */
  surface: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>
  /** world direction to the Sun */
  setSun: (dirWorld: THREE.Vector3) => void
  setOpacity: (k: number) => void
  update: (time: number) => void
  dispose: () => void
}

/**
 * A real Earth of radius `R` (world units). `atmosphere` is the height of the glowing shell in units of R (≈ 0.02).
 * `cloudScale` is the noise frequency of the clouds over the unit sphere (higher = smaller clouds).
 */
export function makeRealEarth(tex: { day: THREE.Texture; night: THREE.Texture }, R: number, opts: { segments?: number; atmosphere?: number; cloudScale?: number } = {}): RealEarth {
  const seg = opts.segments ?? 160
  const top = R * (1 + (opts.atmosphere ?? 0.022))
  const atmoColor = new THREE.Color(0.32, 0.56, 1.0)
  const uniforms = {
    uDay: { value: tex.day },
    uNight: { value: tex.night },
    uReady: { value: tex.day.image ? 1 : 0 },
    uSun: { value: new THREE.Vector3(1, 0, 0) },
    uAtmo: { value: atmoColor },
    uOpacity: { value: 1 },
    uTime: { value: 0 },
    uClouds: { value: 1 },
    uLights: { value: 1 },
    uCloudScale: { value: opts.cloudScale ?? 7 },
  }
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: SURFACE_VS, fragmentShader: SURFACE_FS, transparent: true })
  const surface = new THREE.Mesh(new THREE.SphereGeometry(R, seg, seg / 2), mat)
  surface.renderOrder = -2
  const atmoU = {
    uCenter: { value: new THREE.Vector3() },
    uR: { value: R },
    uTop: { value: top },
    uSun: uniforms.uSun,
    uRay: { value: new THREE.Color(0.28, 0.55, 1.35) },
    uSunset: { value: new THREE.Color(1.4, 0.45, 0.12) },
    uOpacity: { value: 1 },
  }
  const atmoMat = new THREE.ShaderMaterial({ uniforms: atmoU, vertexShader: ATMO_VS, fragmentShader: ATMO_FS, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  const shell = new THREE.Mesh(new THREE.SphereGeometry(top, 96, 48), atmoMat)
  shell.renderOrder = -1
  const group = new THREE.Group()
  group.add(surface, shell)
  const sunW = new THREE.Vector3()
  return {
    group,
    surface,
    setSun: (d) => sunW.copy(d).normalize(),
    setOpacity: (k) => {
      group.visible = k > 0.01
      uniforms.uOpacity.value = k
      atmoU.uOpacity.value = k
    },
    update: (time) => {
      uniforms.uTime.value = time
      uniforms.uReady.value = tex.day.image ? 1 : 0
      uniforms.uSun.value.copy(sunW)
      group.getWorldPosition(atmoU.uCenter.value)
    },
    dispose: () => {
      surface.geometry.dispose()
      mat.dispose()
      shell.geometry.dispose()
      atmoMat.dispose()
    },
  }
}
