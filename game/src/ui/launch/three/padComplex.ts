import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { concreteTexture } from './textures'

// The launch complex around the rocket, built from simple shapes merged into a few meshes (one per material):
// a concrete hardstand with a flame trench and deflector, the launch mount with hold-downs and a tail service mast, a
// lattice umbilical tower with platforms, an elevator shaft, a hammerhead crane and swing arms with umbilical hoses,
// four lightning masts with catenary wires, the sound-suppression water tower, the propellant farm (liquid-oxygen sphere,
// kerosene tanks, helium bottles, pipes), the integration hangar with its rails, a blockhouse, a tracking antenna, flood
// lights, roads and the perimeter fence. The rocket's nozzle sits at (0, 4.8, 0); the pad deck is at y = 4.

const Y = new THREE.Vector3(0, 1, 0)

/** Collects geometry per material, baked into world positions, and merges it at the end. */
class Kit {
  private buckets = new Map<THREE.Material, THREE.BufferGeometry[]>()
  private m = new THREE.Matrix4()
  private q = new THREE.Quaternion()
  private e = new THREE.Euler()
  private one = new THREE.Vector3(1, 1, 1)
  private p = new THREE.Vector3()
  put(mat: THREE.Material, geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    this.q.setFromEuler(this.e.set(rx, ry, rz))
    geo.applyMatrix4(this.m.compose(this.p.set(x, y, z), this.q, this.one))
    const list = this.buckets.get(mat) ?? []
    list.push(geo)
    this.buckets.set(mat, list)
    return geo
  }
  box(mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0) {
    return this.put(mat, new THREE.BoxGeometry(w, h, d), x, y, z, 0, ry, 0)
  }
  /** a square bar (t × t) or a round tube (r = t / 2) from a to b */
  bar(mat: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, t: number, round = false) {
    const d = b.clone().sub(a)
    const len = d.length()
    const geo = round ? new THREE.CylinderGeometry(t / 2, t / 2, len, 8, 1) : new THREE.BoxGeometry(t, len, t)
    this.q.setFromUnitVectors(Y, d.normalize())
    geo.applyMatrix4(this.m.compose(this.p.copy(a).add(b).multiplyScalar(0.5), this.q, this.one))
    const list = this.buckets.get(mat) ?? []
    list.push(geo)
    this.buckets.set(mat, list)
  }
  /** a pipe or cable through `pts` */
  tube(mat: THREE.Material, pts: THREE.Vector3[], r: number, seg = 32) {
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 6, false)
    const list = this.buckets.get(mat) ?? []
    list.push(geo)
    this.buckets.set(mat, list)
  }
  build(parent: THREE.Object3D, shadows: { cast: boolean }, uvScale?: Map<THREE.Material, number>) {
    const out: THREE.Mesh[] = []
    for (const [mat, list] of this.buckets) {
      const geo = mergeGeometries(list, false)
      list.forEach((g) => g.dispose())
      if (!geo) continue
      const s = uvScale?.get(mat)
      if (s) boxUv(geo, s)
      const mesh = new THREE.Mesh(geo, mat)
      mesh.castShadow = shadows.cast
      mesh.receiveShadow = true
      parent.add(mesh)
      out.push(mesh)
    }
    this.buckets.clear()
    return out
  }
}

/** Planar UVs from world positions along each face's main axis, so tiling textures keep their size on every box. */
function boxUv(geo: THREE.BufferGeometry, scale: number) {
  const p = geo.getAttribute('position')
  const n = geo.getAttribute('normal')
  const uv = geo.getAttribute('uv')
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i))
    const ay = Math.abs(n.getY(i))
    const az = Math.abs(n.getZ(i))
    if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i) / scale, p.getZ(i) / scale)
    else if (ax >= az) uv.setXY(i, p.getZ(i) / scale, p.getY(i) / scale)
    else uv.setXY(i, p.getX(i) / scale, p.getY(i) / scale)
  }
  uv.needsUpdate = true
}

function scorchTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const x = c.getContext('2d')!
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 64)
  g.addColorStop(0, 'rgba(18,14,12,0.85)')
  g.addColorStop(0.5, 'rgba(30,24,20,0.5)')
  g.addColorStop(1, 'rgba(40,32,26,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export interface PadComplex {
  group: THREE.Group
  /** swing arms (pivot groups on the tower face; rotate about y to swing them clear) */
  arms: THREE.Group[]
  /** the hose of the tail service mast: drops away at liftoff */
  tailHose: THREE.Mesh
  /** aircraft-warning lights to blink */
  beacons: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[]
  /** flood lights aimed at the rocket (add them to the scene at night) */
  spots: THREE.SpotLight[]
  /** where the flame trench opens, in world coordinates (the exhaust cloud comes out there) */
  trenchExit: THREE.Vector3
  trenchHalfWidth: number
  dispose: () => void
}

export function buildPadComplex(opts: { R: number; RH: number; light: 'dawn' | 'day' | 'night' }): PadComplex {
  const { R, RH, light } = opts
  const group = new THREE.Group()
  const near = new Kit()
  const far = new Kit()
  const conc = concreteTexture()
  const scorch = scorchTexture()
  const lampI = light === 'night' ? 7 : light === 'dawn' ? 2.2 : 0
  const M = {
    concrete: new THREE.MeshStandardMaterial({ map: conc, color: 0xd2ccc4, roughness: 0.93 }),
    burnt: new THREE.MeshStandardMaterial({ color: 0x35302c, roughness: 1 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xb7bfc8, metalness: 0.6, roughness: 0.42 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x3b4149, metalness: 0.55, roughness: 0.5 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x202327, roughness: 0.75 }),
    tank: new THREE.MeshStandardMaterial({ color: 0xeef1f4, metalness: 0.12, roughness: 0.3 }),
    building: new THREE.MeshStandardMaterial({ color: 0xd8dbdf, roughness: 0.78 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.55, roughness: 0.45 }),
    asphalt: new THREE.MeshStandardMaterial({ color: 0x3a3634, roughness: 0.97 }),
    gravel: new THREE.MeshStandardMaterial({ map: conc, color: 0x8f877e, roughness: 1 }),
    rail: new THREE.MeshStandardMaterial({ color: 0x9aa1a8, metalness: 0.85, roughness: 0.3 }),
    paint: new THREE.MeshStandardMaterial({ color: 0xd9682b, roughness: 0.55 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, emissive: 0xfff1c9, emissiveIntensity: lampI }),
    window: new THREE.MeshStandardMaterial({ color: 0x1b2430, emissive: 0xffd9a0, emissiveIntensity: lampI * 0.25, roughness: 0.15, metalness: 0.5 }),
    grating: new THREE.MeshStandardMaterial({ color: 0x8e969f, metalness: 0.7, roughness: 0.5 }),
  }
  const uvScale = new Map<THREE.Material, number>([[M.concrete, 12], [M.gravel, 20]])
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

  // ---- hardstand, flame trench and deflector ----
  const slot = Math.max(4.5, R * 1.7) // trench half width
  const xE = 36
  const xW = -48
  const zS = 30
  near.box(M.concrete, xE - xW, 4, zS - slot, (xE + xW) / 2, 2, (zS + slot) / 2)
  near.box(M.concrete, xE - xW, 4, zS - slot, (xE + xW) / 2, 2, -(zS + slot) / 2)
  near.box(M.concrete, xE - (R + 2.5), 4, slot * 2, (xE + R + 2.5) / 2, 2, 0)
  near.box(M.burnt, R + 2.5 - xW, 0.3, slot * 2, (R + 2.5 + xW) / 2, 0.15, 0)
  const defl = Math.hypot(R + 2.5 + 9, 3.7)
  near.put(M.burnt, new THREE.BoxGeometry(defl, 1.2, slot * 2 - 0.2), (R + 2.5 - 9) / 2, 1.9, 0, 0, 0, Math.atan2(3.7, R + 11.5))
  // a parapet along the trench edges and a gravel apron around the hardstand
  for (const s of [-1, 1]) near.box(M.concrete, xE - xW - 6, 0.9, 0.6, (xE + xW) / 2 + 3, 4.45, s * (slot + 0.3))
  far.box(M.gravel, 150, 0.08, 110, -10, 0.04, 0)

  // ---- launch mount: a frame over the trench on four pedestals, hold-downs, tail service mast ----
  const inner = R + 0.8
  const outer = R + 3.2
  const w = outer - inner
  for (const s of [-1, 1]) {
    near.box(M.dark, outer * 2, 1.4, w, 0, 4.1, s * (inner + w / 2))
    near.box(M.dark, w, 1.4, inner * 2, s * (inner + w / 2), 4.1, 0)
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) near.box(M.concrete, 1.8, 3.4, 1.8, sx * (inner + w / 2), 1.9, sz * (inner + w / 2))
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4
    near.box(M.steel, 0.7, 1.5, 1, Math.cos(a) * (R + 0.35), 5.5, Math.sin(a) * (R + 0.35), -a)
  }
  const tsmZ = -(R + 3.6)
  near.box(M.steel, 2, 9, 2, 0, 8.5, tsmZ)
  near.box(M.dark, 2.6, 0.5, 2.6, 0, 13.2, tsmZ)
  const hoseKit = new Kit()
  hoseKit.tube(M.rubber, [V(0, 11, tsmZ + 1), V(0, 9.5, tsmZ * 0.6), V(0, 7.2, -R - 0.05)], 0.22, 16)
  const hoseGroup = new THREE.Group()
  const tailHose = hoseKit.build(hoseGroup, { cast: true })[0]
  group.add(hoseGroup)

  // ---- the umbilical tower ----
  const H = Math.max(46, Math.ceil((RH + 14) / 4) * 4)
  const x0 = R + 4.2
  const x1 = x0 + 8
  const zs = [-4, 4]
  for (const x of [x0, x1]) for (const z of zs) near.box(M.steel, 0.8, H, 0.8, x, 4 + H / 2, z)
  const bayH = 4
  for (let y = 4; y < 4 + H - 0.1; y += bayH) {
    const y1 = Math.min(y + bayH, 4 + H)
    // the four faces: a horizontal bar and an X brace each
    const faces: [THREE.Vector3, THREE.Vector3][] = [
      [V(x0, 0, -4), V(x1, 0, -4)],
      [V(x0, 0, 4), V(x1, 0, 4)],
      [V(x0, 0, -4), V(x0, 0, 4)],
      [V(x1, 0, -4), V(x1, 0, 4)],
    ]
    for (const [a, b] of faces) {
      near.bar(M.steel, a.clone().setY(y), b.clone().setY(y), 0.32)
      near.bar(M.steel, a.clone().setY(y), b.clone().setY(y1), 0.22)
      near.bar(M.steel, b.clone().setY(y), a.clone().setY(y1), 0.22)
    }
  }
  near.box(M.steel, 8.8, 0.6, 8.8, (x0 + x1) / 2, 4 + H, 0)
  // elevator shaft and the pipe up the tower
  near.box(M.dark, 2.6, H + 2, 2.6, x1 + 1.6, 4 + (H + 2) / 2, 2)
  near.bar(M.tank, V(x0 + 0.6, 0.8, -4.6), V(x0 + 0.6, 4 + H * 0.8, -4.6), 0.7, true)
  // hammerhead crane and a lightning rod on top
  const top = 4 + H
  near.box(M.paint, 2, 5, 2, (x0 + x1) / 2, top + 2.8, 0)
  near.box(M.paint, 26, 1.3, 1.3, (x0 + x1) / 2 - 6, top + 5.8, 0)
  near.box(M.dark, 3, 2.4, 2.4, (x0 + x1) / 2 + 6, top + 5.4, 0)
  near.bar(M.steel, V((x0 + x1) / 2, top + 5.3, 0), V((x0 + x1) / 2 - 18, top + 6.4, 0), 0.12)
  near.bar(M.steel, V((x0 + x1) / 2 - 18, top + 6.4, 0), V((x0 + x1) / 2 - 18, top + 1, 0), 0.06)
  near.bar(M.steel, V(x1, top, 4), V(x1, top + 16, 4), 0.35, true)
  // arm levels: along the rocket (the top one is the crew / payload access arm)
  const armYs = [0.36, 0.64, 0.87].map((f) => Math.min(top - 2, 4.8 + RH * f))
  for (const y of armYs) near.box(M.grating, 9.4, 0.3, 9.4, (x0 + x1) / 2, y - 1.4, 0)
  // more platforms between
  for (let y = 4 + 12; y < top - 4; y += 12) near.box(M.grating, 8.6, 0.25, 8.6, (x0 + x1) / 2, y, 0)

  // swing arms: trusses from the tower face to the skin, each with an umbilical hose (they swing away before ignition)
  const armLen = x0 - R - 0.25
  const arms = armYs.map((y, i) => {
    const pivot = new THREE.Group()
    pivot.position.set(x0, y, 0)
    const k = new Kit()
    const hgt = i === 2 ? 2.6 : 1.4
    for (const zz of [-0.7, 0.7]) {
      k.bar(M.steel, V(0, 0, zz), V(-armLen, 0, zz), 0.22)
      k.bar(M.steel, V(0, -hgt, zz), V(-armLen, -hgt, zz), 0.22)
      for (let s = 0; s < armLen - 0.4; s += 1.2) {
        k.bar(M.steel, V(-s, -hgt, zz), V(-s, 0, zz), 0.12)
        k.bar(M.steel, V(-s, -hgt, zz), V(-s - 1.2, 0, zz), 0.1)
      }
    }
    k.box(M.grating, armLen, 0.15, 1.6, -armLen / 2, -hgt, 0)
    if (i === 2) k.box(M.building, 2.2, 2.8, 2.4, -armLen + 1.1, -hgt / 2 - 0.1, 0) // the white room
    else k.tube(M.rubber, [V(-armLen * 0.6, -hgt, 0.4), V(-armLen * 0.85, -hgt - 1.6, 0.3), V(-armLen - 0.05, -hgt - 1.2, 0.2)], 0.16, 12)
    k.build(pivot, { cast: true })
    group.add(pivot)
    return pivot
  })

  // warning lights on the tower and the masts
  const beaconGeo = new THREE.SphereGeometry(0.45, 10, 8)
  const beacons: PadComplex['beacons'] = []
  const beacon = (x: number, y: number, z: number) => {
    const b = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({ color: 0xff3b3b }))
    b.position.set(x, y, z)
    group.add(b)
    beacons.push(b)
  }
  beacon(x0, top + 0.8, -4)
  beacon(x1, top + 16.4, 4)

  // ---- lightning protection: four masts with catenary wires ----
  const mastH = top + 22
  const masts = [V(-58, 0, -50), V(48, 0, -50), V(50, 0, 48), V(-84, 0, 38)] // the front-left one stays out of the opening shot
  for (const m of masts) {
    near.put(M.steel, new THREE.CylinderGeometry(0.3, 0.75, mastH, 10), m.x, mastH / 2, m.z)
    near.box(M.concrete, 3, 1.2, 3, m.x, 0.6, m.z)
    beacon(m.x, mastH + 0.5, m.z)
  }
  for (let i = 0; i < 4; i++) {
    const a = masts[i].clone().setY(mastH - 0.5)
    const b = masts[(i + 1) % 4].clone().setY(mastH - 0.5)
    const sag = a.distanceTo(b) * 0.07
    const pts = Array.from({ length: 13 }, (_, j) => {
      const t = j / 12
      return a.clone().lerp(b, t).setY(a.y - sag * 4 * t * (1 - t))
    })
    near.tube(M.dark, pts, 0.07, 24)
    // a wire down to the tower top
    const mid = V((x0 + x1) / 2, top + 16, 0)
    far.tube(M.dark, [a, a.clone().lerp(mid, 0.5).setY((a.y + mid.y) / 2 - 6), mid], 0.06, 16)
  }

  // ---- sound-suppression water tower ----
  const wt = V(-78, 0, -118)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) far.bar(M.steel, V(wt.x + sx * 6, 0, wt.z + sz * 6), V(wt.x + sx * 3.6, 40, wt.z + sz * 3.6), 0.7)
  for (let y = 6; y < 40; y += 8) {
    const r = 6 - (2.4 * y) / 40
    for (const [a, b] of [[V(-r, y, -r), V(r, y, -r)], [V(r, y, -r), V(r, y, r)], [V(r, y, r), V(-r, y, r)], [V(-r, y, r), V(-r, y, -r)]]) far.bar(M.steel, a.add(wt), b.add(wt), 0.3)
  }
  far.put(M.tank, new THREE.CylinderGeometry(8, 8, 13, 28), wt.x, 47, wt.z)
  far.put(M.tank, new THREE.SphereGeometry(8, 28, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), wt.x, 40.5, wt.z)
  far.put(M.tank, new THREE.ConeGeometry(8.2, 3, 28), wt.x, 55, wt.z)
  far.put(M.paint, new THREE.CylinderGeometry(8.05, 8.05, 1.6, 28, 1, true), wt.x, 50, wt.z)
  far.tube(M.tank, [V(wt.x + 2, 40, wt.z + 2), V(wt.x + 3, 1, wt.z + 4), V(-40, 1, -20), V(xW + 4, 1.2, -slot - 2)], 0.8, 40)

  // ---- propellant farm ----
  const lox = V(64, 0, -66)
  far.put(M.tank, new THREE.SphereGeometry(8.5, 32, 20), lox.x, 13, lox.z)
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3
    far.bar(M.steel, V(lox.x + Math.cos(a) * 8.6, 0, lox.z + Math.sin(a) * 8.6), V(lox.x + Math.cos(a) * 7.2, 12.5, lox.z + Math.sin(a) * 7.2), 0.6, true)
  }
  far.bar(M.steel, V(lox.x + 10, 0, lox.z), V(lox.x + 10, 26, lox.z), 0.8, true) // vent stack
  for (const z of [-40, -32]) {
    far.put(M.tank, new THREE.CylinderGeometry(2.7, 2.7, 17, 24), 74, 3.6, z, 0, 0, Math.PI / 2)
    for (const s of [-1, 1]) far.put(M.tank, new THREE.SphereGeometry(2.7, 18, 12), 74 + s * 8.5, 3.6, z)
    for (const s of [-1, 0, 1]) far.box(M.concrete, 1.2, 1.4, 5, 74 + s * 6, 0.7, z)
  }
  for (let i = 0; i < 6; i++) far.put(M.steel, new THREE.CylinderGeometry(0.95, 0.95, 9, 14), 44 + (i % 3) * 2.3, 4.5, -54 - Math.floor(i / 3) * 2.3)
  // pipes to the pad
  far.tube(M.steel, [V(lox.x - 6, 1.2, lox.z + 4), V(40, 1.2, -40), V(x1 + 4, 1.2, -6), V(x0 + 0.6, 1.2, -4.6)], 0.45, 40)
  far.tube(M.steel, [V(66, 1, -36), V(50, 1, -30), V(x1 + 4, 1, -5), V(x0 + 1.4, 1, -4.6)], 0.35, 40)

  // ---- integration hangar, rails, blockhouse, tracking antenna ----
  const hg = V(-170, 0, -150)
  const hgRot = Math.atan2(-hg.z, -hg.x) // its door faces the pad
  const hk = new THREE.Group()
  const hKit = new Kit()
  hKit.box(M.building, 70, 18, 38, 0, 9, 0)
  hKit.put(M.roof, new THREE.CylinderGeometry(19, 19, 70, 32, 1, false, -Math.PI / 2, Math.PI), 0, 18, 0, 0, 0, Math.PI / 2)
  hKit.box(M.dark, 0.6, 15, 26, 35.2, 7.5, 0)
  hKit.box(M.window, 0.3, 1.4, 34, -35.2, 13, 0)
  hKit.box(M.window, 50, 1.4, 0.3, -6, 13, 19.1)
  hKit.build(hk, { cast: false })
  hk.position.copy(hg)
  hk.rotation.y = -hgRot
  group.add(hk)
  const railFrom = hg.clone().add(V(Math.cos(hgRot) * 36, 0, Math.sin(hgRot) * 36))
  const railTo = V(xW - 2, 0, 0)
  const side = V(-(railTo.z - railFrom.z), 0, railTo.x - railFrom.x).normalize()
  for (const s of [-1.6, 1.6]) far.bar(M.rail, railFrom.clone().addScaledVector(side, s).setY(0.18), railTo.clone().addScaledVector(side, s).setY(0.18), 0.28)
  // roads
  const road = (a: THREE.Vector3, b: THREE.Vector3, wid: number) => {
    const d = b.clone().sub(a)
    far.box(M.asphalt, wid, 0.06, d.length(), (a.x + b.x) / 2, 0.05, (a.z + b.z) / 2, Math.atan2(d.x, d.z))
  }
  road(V(10, 0, zS), V(110, 0, 92), 9)
  road(V(110, 0, 92), V(-260, 0, 220), 9)
  road(V(-20, 0, zS), V(-190, 0, -90), 9)
  // blockhouse with lit windows, and a tracking antenna
  far.box(M.concrete, 22, 6.5, 14, 118, 3.25, 96, 0.4)
  far.box(M.window, 18, 1.1, 0.3, 118 - Math.sin(0.4) * 7.2, 4.4, 96 - Math.cos(0.4) * 7.2, 0.4)
  far.box(M.roof, 23, 0.6, 15, 118, 6.8, 96, 0.4)
  const ant = V(150, 0, 128)
  far.put(M.building, new THREE.CylinderGeometry(1.4, 2.2, 10, 14), ant.x, 5, ant.z)
  far.put(M.tank, new THREE.SphereGeometry(7, 28, 10, 0, Math.PI * 2, 0, 0.75), ant.x, 16.5, ant.z, -0.75, 0.6, 0)
  far.bar(M.steel, V(ant.x, 11, ant.z), V(ant.x - 2.5, 18.5, ant.z - 2.5), 0.25)

  // ---- flood lights around the pad ----
  const spots: THREE.SpotLight[] = []
  for (const [x, z] of [[-88, 26], [56, 56], [-64, -56], [56, -56]]) {
    far.put(M.steel, new THREE.CylinderGeometry(0.35, 0.6, 30, 8), x, 15, z)
    const face = Math.atan2(-x, -z)
    far.box(M.dark, 4.6, 2.6, 0.8, x, 30.5, z, face)
    far.box(M.lamp, 4.2, 2.2, 0.2, x - Math.sin(face) * -0.5, 30.5, z - Math.cos(face) * -0.5, face)
    const s = new THREE.SpotLight(0xfff1c9, 600, 320, 0.33, 0.55, 1.3)
    s.position.set(x, 30, z)
    s.target.position.set(0, 26, 0)
    spots.push(s)
  }

  // ---- perimeter fence ----
  const F = 190
  for (const [a, b] of [[V(-F, 0, -F), V(F, 0, -F)], [V(F, 0, -F), V(F, 0, F)], [V(F, 0, F), V(-F, 0, F)], [V(-F, 0, F), V(-F, 0, -F)]]) {
    const len = a.distanceTo(b)
    for (let s = 0; s <= len; s += 9) {
      const p = a.clone().lerp(b, s / len)
      far.box(M.steel, 0.14, 2.6, 0.14, p.x, 1.3, p.z)
    }
    for (const y of [1.2, 2.4]) far.bar(M.steel, a.clone().setY(y), b.clone().setY(y), 0.05)
  }

  near.build(group, { cast: true }, uvScale)
  far.build(group, { cast: false }, uvScale)

  // soot at the trench exit
  const scorchMat = new THREE.MeshStandardMaterial({ map: scorch, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 })
  const scorchMesh = new THREE.Mesh(new THREE.PlaneGeometry(70, 46), scorchMat)
  scorchMesh.rotation.x = -Math.PI / 2
  scorchMesh.position.set(xW - 24, 0.1, 0)
  scorchMesh.receiveShadow = true
  group.add(scorchMesh)

  return {
    group,
    arms,
    tailHose,
    beacons,
    spots,
    trenchExit: V(xW, 2, 0),
    trenchHalfWidth: slot,
    dispose: () => {
      conc.dispose()
      scorch.dispose()
      beaconGeo.dispose()
      group.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.isMesh && m.geometry !== beaconGeo) m.geometry.dispose()
      })
      Object.values(M).forEach((m) => m.dispose())
      scorchMat.dispose()
      beacons.forEach((b) => b.material.dispose())
      spots.forEach((s) => s.dispose())
    },
  }
}
