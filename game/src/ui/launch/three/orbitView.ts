import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import type { Timeline } from '../LaunchSequence'
import { EARTH_KM, SITE, geoVec, headingAt, launchAzimuth, makeRealEarth, sunAtSite, trackPoint, trackTangent, type OrbitInfo } from './earth3d'
import { glareTexture } from './textures'

// The 'orbit' camera: the whole route on a real globe. A separate small scene (Earth radius 100) with the ascent from
// Arequipa as a glowing line over its ground track, the target orbit ring (altitude exaggerated), a dashed transfer arc
// for GTO / Moon / Mars, the rocket as a bright marker with a drop line to the ground, and a camera that starts right
// behind the rocket and pulls back until the whole Earth and the orbit are in frame.

export const RG = 100
const EXAG = 2.2
/** downrange at SECO (rad): ≈ 1,900 km */
const DOWNRANGE = 0.3

const smooth = (x: number) => {
  const t = Math.max(0, Math.min(1, x))
  return t * t * (3 - 2 * t)
}
const easeInOut = (x: number) => {
  const t = Math.max(0, Math.min(1, x))
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

function softDot() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const x = c.getContext('2d')!
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.8)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Where the rocket is on the globe at time t (Earth frame, scene units) and its direction of travel. */
export function routeAt(t: number, T: Timeline, orbit?: OrbitInfo) {
  const P = T.pace ?? 1
  const hKm = orbitAltitudeKm(orbit)
  const site = geoVec(SITE.lat, SITE.lon)
  const head = headingAt(site, launchAzimuth(orbit))
  const p = Math.max(0, Math.min(1, (t - T.liftoff) / (T.seco - T.liftoff)))
  const after = Math.max(0, t - T.seco)
  // ascent: an S-shaped climb and a downrange run that speeds up; then the orbit at its real rate (1 s ≈ 1 min at pace 1)
  const ang = DOWNRANGE * p ** 2.1 + ((2 * Math.PI) / 95) * (after / P)
  const alt = hKm * p * p * (3 - 2 * p)
  const r = RG * (1 + (alt * EXAG) / EARTH_KM)
  return { pos: trackPoint(site, head, ang).multiplyScalar(r), dir: trackTangent(site, head, ang), ang, p, alt, site, head }
}

export function orbitAltitudeKm(orbit?: OrbitInfo) {
  const target = orbit?.target ?? 'sso'
  if (target === 'gto' || target === 'tli' || target === 'tmi') return 300
  return Math.max(200, Math.min(2000, orbit?.altitudeKm ?? (target === 'sso' ? 700 : 500)))
}

export interface OrbitView {
  scene: THREE.Scene
  /** advance the route to scene time `t` */
  update: (t: number) => void
  /** place `cam` (pull-back progress `k`: 0 = right behind the rocket, 1 = the whole Earth) and size the lines for a view */
  frame: (cam: THREE.PerspectiveCamera, k: number, width: number, height: number) => void
  dispose: () => void
}

export function makeOrbitView(tex: { day: THREE.Texture; night: THREE.Texture }, T: Timeline, light: 'dawn' | 'day' | 'night', orbit?: OrbitInfo): OrbitView {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000004)
  const disposables: { dispose: () => void }[] = []
  const keep = <D extends { dispose: () => void }>(d: D) => {
    disposables.push(d)
    return d
  }

  // stars of varied brightness and colour
  const starGeo = keep(new THREE.BufferGeometry())
  const sp: number[] = []
  const sc: number[] = []
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 4000; i++) {
    const u = rnd() * 2 - 1
    const a = rnd() * Math.PI * 2
    const s = Math.sqrt(1 - u * u)
    sp.push(Math.cos(a) * s * 4000, u * 4000, Math.sin(a) * s * 4000)
    const b = 0.25 + rnd() ** 4 * 1.6
    const warm = rnd()
    sc.push(b * (0.85 + 0.15 * warm), b * 0.9, b * (1 - 0.15 * warm))
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3))
  starGeo.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3))
  const stars = new THREE.Points(starGeo, keep(new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, depthWrite: false })))
  scene.add(stars)

  const sun = sunAtSite(light)
  const earth = makeRealEarth(tex, RG, { segments: 160, atmosphere: 0.028, cloudScale: 7 })
  keep(earth)
  earth.setSun(sun)
  scene.add(earth.group)
  // the Sun far away, with a glare
  const glareTex = keep(glareTexture())
  const glare = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glareTex, color: new THREE.Color(2.4, 2.2, 1.9), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })))
  glare.position.copy(sun).multiplyScalar(3500)
  glare.scale.setScalar(900)
  scene.add(glare)

  // ---- the route ----
  const N = 160
  const ascent: THREE.Vector3[] = []
  const ground: THREE.Vector3[] = []
  for (let i = 0; i <= N; i++) {
    const t = T.liftoff + (i / N) * (T.seco - T.liftoff)
    const r = routeAt(t, T, orbit)
    ascent.push(r.pos)
    ground.push(r.pos.clone().setLength(RG * 1.0015))
  }
  const r0 = routeAt(T.seco, T, orbit)
  const ringR = r0.pos.length()
  const ring: THREE.Vector3[] = []
  for (let i = 0; i <= 256; i++) ring.push(trackPoint(r0.site, r0.head, r0.ang + (i / 256) * Math.PI * 2).multiplyScalar(ringR))

  const lines: LineMaterial[] = []
  const lineMat = (color: THREE.Color, width: number, o: { dashed?: boolean; opacity?: number; additive?: boolean } = {}) => {
    const m = new LineMaterial({ color: 0xffffff, linewidth: width, dashed: !!o.dashed, dashSize: 1.6, gapSize: 1.2, transparent: true, opacity: o.opacity ?? 1, depthWrite: false })
    m.color.copy(color)
    if (o.additive) m.blending = THREE.AdditiveBlending
    lines.push(keep(m))
    return m
  }
  const line = (pts: THREE.Vector3[], m: LineMaterial, order = 2) => {
    const g = keep(new LineGeometry())
    g.setPositions(pts.flatMap((p) => [p.x, p.y, p.z]))
    const l = new Line2(g, m)
    if (m.dashed) l.computeLineDistances()
    l.renderOrder = order
    l.frustumCulled = false
    scene.add(l)
    return l
  }
  const orange = new THREE.Color(1, 0.55, 0.18)
  const gold = new THREE.Color(1, 0.8, 0.45)
  const cyan = new THREE.Color(0.3, 0.8, 1)
  // planned: dim dashed; flown: bright core over a wide additive glow
  line(ascent, lineMat(gold, 1.4, { dashed: true, opacity: 0.45 }))
  line(ground, lineMat(gold, 1, { dashed: true, opacity: 0.25 }))
  const flownGlow = line(ascent, lineMat(orange.clone().multiplyScalar(2.2), 9, { opacity: 0.35, additive: true }), 3)
  const flown = line(ascent, lineMat(gold.clone().multiplyScalar(3), 2.6), 4)
  const flownGround = line(ground, lineMat(orange.clone().multiplyScalar(1.4), 1.6, { opacity: 0.8 }), 3)
  const ringLine = line(ring, lineMat(cyan.clone().multiplyScalar(1.2), 1.6, { opacity: 0.55 }))
  const ringFlown = line(ring, lineMat(cyan.clone().multiplyScalar(3), 2.6), 4)
  const ringGlow = line(ring, lineMat(cyan.clone().multiplyScalar(1.6), 8, { opacity: 0.3, additive: true }), 3)
  const drop = line([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)], lineMat(gold.clone().multiplyScalar(1.5), 1, { opacity: 0.6 }), 3)

  // transfer orbit (dashed) for missions that leave LEO
  const target = orbit?.target ?? 'sso'
  let transfer: Line2 | null = null
  if (target === 'gto' || target === 'tli' || target === 'tmi') {
    const rp = ringR
    const ra = target === 'gto' ? RG * 2.7 : target === 'tli' ? RG * 6 : RG * 14
    const a = (rp + ra) / 2
    const e = (ra - rp) / (ra + rp)
    const nuMax = target === 'gto' ? Math.PI : 2.3
    const th0 = r0.ang + 0.5
    const pts = Array.from({ length: 121 }, (_, i) => {
      const nu = (i / 120) * nuMax
      const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu))
      return trackPoint(r0.site, r0.head, th0 + nu).multiplyScalar(r)
    })
    transfer = line(pts, lineMat(new THREE.Color(1, 0.45, 0.8).multiplyScalar(1.6), 1.8, { dashed: true, opacity: 0 }), 3)
  }

  // markers: the rocket (constant size on screen), the launch site
  const dotTex = keep(softDot())
  const sprite = (color: THREE.Color, size: number) => {
    const s = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: dotTex, color, sizeAttenuation: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending })))
    s.scale.setScalar(size)
    s.renderOrder = 6
    scene.add(s)
    return s
  }
  const rocketGlow = sprite(orange.clone().multiplyScalar(3), 0.07)
  const rocketCore = sprite(new THREE.Color(4, 3.6, 3), 0.022)
  const siteDot = sprite(cyan.clone().multiplyScalar(2.5), 0.03)
  siteDot.position.copy(r0.site).multiplyScalar(RG * 1.003)

  const setSegments = (l: Line2, segs: number) => ((l.geometry as LineGeometry).instanceCount = Math.max(0, segs))
  /** draw `count` whole segments, and move the end of the next one to `tip` (the line then ends exactly at the rocket) */
  const draw = (l: Line2, pts: THREE.Vector3[], f: number, tip: THREE.Vector3) => {
    const segs = pts.length - 1
    const whole = Math.min(segs, Math.floor(f * segs))
    const geo = l.geometry as LineGeometry
    const start = geo.getAttribute('instanceStart') as THREE.InterleavedBufferAttribute
    // restore the previous partial segment, then cut the current one
    const buf = start.data
    for (let i = 0; i < segs; i++) {
      const o = i * 6
      buf.array[o + 3] = pts[i + 1].x
      buf.array[o + 4] = pts[i + 1].y
      buf.array[o + 5] = pts[i + 1].z
    }
    if (whole < segs) {
      const o = whole * 6
      buf.array[o + 3] = tip.x
      buf.array[o + 4] = tip.y
      buf.array[o + 5] = tip.z
    }
    buf.needsUpdate = true
    setSegments(l, whole < segs ? whole + 1 : segs)
  }

  const state = { pos: new THREE.Vector3(), dir: new THREE.Vector3(1, 0, 0), site: r0.site.clone(), t: 0, orbitK: 0, ang: 0 }
  const normal = r0.site.clone().cross(r0.head).normalize()
  if (normal.dot(sun) < 0) normal.negate()
  const tmp = new THREE.Vector3()

  return {
    scene,
    update: (t) => {
      state.t = t
      const r = routeAt(t, T, orbit)
      state.pos.copy(r.pos)
      state.dir.copy(r.dir)
      state.ang = r.ang
      rocketGlow.position.copy(r.pos)
      rocketCore.position.copy(r.pos)
      const pulse = 0.8 + 0.2 * Math.sin(t * 5)
      rocketGlow.scale.setScalar(0.07 * pulse)
      const before = t < T.liftoff
      rocketGlow.visible = rocketCore.visible = true
      // flown ascent and its ground track
      draw(flown, ascent, r.p, r.pos)
      draw(flownGlow, ascent, r.p, r.pos)
      draw(flownGround, ground, r.p, tmp.copy(r.pos).setLength(RG * 1.0015))
      flown.visible = flownGlow.visible = flownGround.visible = !before
      // after SECO: the flown part of the orbit
      const ok = smooth((t - T.seco) / (0.6 * (T.pace ?? 1)))
      state.orbitK = ok
      const f = Math.max(0, (r.ang - r0.ang) / (Math.PI * 2))
      draw(ringFlown, ring, f, r.pos)
      draw(ringGlow, ring, f, r.pos)
      ringFlown.visible = ringGlow.visible = t > T.seco
      ;(ringLine.material as LineMaterial).opacity = 0.35 + 0.35 * ok
      if (transfer) (transfer.material as LineMaterial).opacity = 0.85 * smooth((t - T.deploy) / (1.5 * (T.pace ?? 1)))
      // drop line from the rocket to the ground
      const dropBuf = ((drop.geometry as LineGeometry).getAttribute('instanceStart') as THREE.InterleavedBufferAttribute).data
      dropBuf.array.set([r.pos.x, r.pos.y, r.pos.z, ...tmp.copy(r.pos).setLength(RG * 1.0015).toArray()], 0)
      dropBuf.needsUpdate = true
      drop.visible = !before && r.alt > 5
      earth.update(t)
    },
    frame: (cam, k, width, height) => {
      for (const m of lines) m.resolution.set(width, height)
      cam.aspect = width / height
      const e = easeInOut(k)
      // near: right behind the rocket, a little above, looking ahead along the route
      const up = tmp.copy(state.pos).normalize()
      const nearPos = state.pos.clone().addScaledVector(state.dir, -2.4).addScaledVector(up, 0.9)
      const nearLook = state.pos.clone().addScaledVector(state.dir, 2).addScaledVector(up, -0.3)
      // far: the whole globe and the orbit ring, seen from above the route and a little off the orbit plane
      const mid = state.site.clone().add(state.pos.clone().normalize()).normalize()
      const farDir = mid.clone().multiplyScalar(1).addScaledVector(normal, 0.62).addScaledVector(sun, 0.18).normalize()
      const fov = 38
      const vfov = (fov * Math.PI) / 180
      const hfov = 2 * Math.atan(Math.tan(vfov / 2) * cam.aspect)
      const need = Math.max(ringR, RG * 1.06) * 1.08
      const farDist = need / Math.sin(Math.min(vfov, hfov) / 2)
      const farLook = mid.clone().multiplyScalar(RG * 0.18)
      const d0 = nearPos.length()
      const dist = Math.exp(Math.log(d0) + (Math.log(farDist) - Math.log(d0)) * e)
      const dir = nearPos.clone().normalize().lerp(farDir, e).normalize()
      cam.position.copy(dir).multiplyScalar(dist)
      cam.up.copy(up).lerp(new THREE.Vector3(0, 1, 0), e).normalize()
      cam.fov = fov + (58 - fov) * (1 - e) * 0.6
      cam.near = Math.max(0.05, dist * 0.002)
      cam.far = 10000
      cam.lookAt(nearLook.lerp(farLook, e))
      cam.updateProjectionMatrix()
      // the marker reads larger up close, smaller far away
      rocketCore.scale.setScalar(0.022 - 0.006 * e)
    },
    dispose: () => disposables.forEach((d) => d.dispose()),
  }
}
