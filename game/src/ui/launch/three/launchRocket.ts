import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Rocket3D } from './rocket3d'
import { hasSideBoosters, isReusableLauncher } from './ascent'

// The catalog launchers in 3D with PBR detail (welded panels on the paint, a raceway, the interstage, engine clusters
// with real bell profiles, grid fins and folded legs on reusable first stages, strap-on boosters) and a "wear" patch for
// every stage material: soot creeping up from the engines after liftoff and frost on the oxygen tank before launch. The
// patch also dresses the player's own rocket (`wearCustomRocket`). Origin: the first-stage nozzle exits; +y is up.

/** Uniforms of one stage's wear (shared by all its materials). */
export interface Wear {
  uWorldToLocal: { value: THREE.Matrix4 }
  uSoot: { value: number }
  uSootTop: { value: number }
  uFrost: { value: number }
  uFrost0: { value: number }
  uFrost1: { value: number }
}
export function makeWear(sootTop: number, frost0: number, frost1: number): Wear {
  return { uWorldToLocal: { value: new THREE.Matrix4() }, uSoot: { value: 0 }, uSootTop: { value: sootTop }, uFrost: { value: 1 }, uFrost0: { value: frost0 }, uFrost1: { value: frost1 } }
}
/** Point the wear at its stage group (its local frame is the rocket's frame). */
export function trackWear(w: Wear, stage: THREE.Object3D) {
  w.uWorldToLocal.value.copy(stage.matrixWorld).invert()
}

/** Patch a standard material in place: darken towards the base with soot streaks, whiten and roughen the frost band. */
export function applyWear(m: THREE.MeshStandardMaterial, w: Wear, sootK = 1) {
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, w, { uSootK: { value: sootK } })
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uWorldToLocal;\nvarying vec3 vLocalP;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvLocalP = (uWorldToLocal * modelMatrix * vec4(transformed, 1.0)).xyz;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uSoot, uSootTop, uFrost, uFrost0, uFrost1, uSootK;\nvarying vec3 vLocalP;')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        float wAng = atan(vLocalP.z, vLocalP.x);
        float wStreak = 0.5 + 0.5 * sin(wAng * 23.0 + sin(wAng * 7.0 + vLocalP.y * 0.4) * 2.0);
        float wSoot = uSoot * uSootK * smoothstep(uSootTop, 0.0, vLocalP.y) * (0.5 + 0.5 * wStreak);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.045, 0.04), clamp(wSoot, 0.0, 0.9));
        float wBand = smoothstep(uFrost0, uFrost0 + 1.2, vLocalP.y) * smoothstep(uFrost1, uFrost1 - 1.2, vLocalP.y);
        vec2 wCell = floor(vec2(wAng * 26.0, vLocalP.y * 5.0));
        float wN = fract(sin(dot(wCell, vec2(12.9898, 78.233))) * 43758.5453);
        float wFrost = uFrost * wBand * (0.55 + 0.45 * wN);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.95, 1.0), wFrost * 0.8);`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.92, clamp(max(wFrost, wSoot * 0.85), 0.0, 1.0));')
  }
  m.customProgramCacheKey = () => 'launch-wear'
  m.needsUpdate = true
}

/** Repeat a texture by metres: `u` turns around the body, `v` is scaled to `lengthM`. */
function scaleUv(geo: THREE.BufferGeometry, su: number, sv: number) {
  const uv = geo.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv)
  return geo
}

/** An engine bell, exit at y = 0, throat at y = h (lathe profile), plus the chamber above. */
function bellGeometry(exitR: number, h: number) {
  const rt = exitR * 0.34
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= 10; i++) {
    const s = i / 10 // 0 = exit, 1 = throat
    pts.push(new THREE.Vector2(rt + (exitR - rt) * (1 - s) ** 0.62 * (1 - 0.06 * s), s * h))
  }
  const bell = new THREE.LatheGeometry(pts, 28)
  const chamber = new THREE.CylinderGeometry(rt * 1.35, rt * 1.1, h * 0.42, 16)
  chamber.translate(0, h * 1.18, 0)
  bell.deleteAttribute('uv')
  chamber.deleteAttribute('uv')
  return mergeGeometries([bell.toNonIndexed(), chamber.toNonIndexed()])!
}

export interface CatalogRocket {
  stages: THREE.Group[]
  boosters: { group: THREE.Group; home: THREE.Vector3; out: THREE.Vector3 }[]
  fairing: THREE.Group[]
  /** the upper stage's vacuum bell (hidden in the interstage until separation) */
  nozzle2: THREE.Object3D
  /** emissive glow inside the bells, per stage (0 = first): set from the throttle */
  hot: THREE.MeshStandardMaterial[]
  wear: Wear[]
  dispose: () => void
}

export function buildCatalogRocket(launcherId: string, dims: { R: number; h1: number; h2: number; hf: number; Rs: number }, skin: THREE.Texture): CatalogRocket {
  const { R, h1, h2, hf, Rs } = dims
  const geos: THREE.BufferGeometry[] = []
  const mats: THREE.Material[] = []
  const reusable = isReusableLauncher(launcherId)
  const add = <G extends THREE.BufferGeometry>(parent: THREE.Object3D, g: G, m: THREE.Material, y = 0, x = 0, z = 0) => {
    geos.push(g)
    const mesh = new THREE.Mesh(g, m)
    mesh.position.set(x, y, z)
    parent.add(mesh)
    return mesh
  }
  const wear = [makeWear(h1 * 0.38, h1 * 0.46, h1 - 3.2), makeWear(h1 + 1.5, h1 + 1.2, h1 + h2 * 0.55)]
  const paint = (color: number, w: Wear, roughness = 0.36, sootK = 1) => {
    const m = new THREE.MeshStandardMaterial({ color, map: skin, bumpMap: skin, bumpScale: 0.6, roughness, metalness: 0.05 })
    applyWear(m, w, sootK)
    mats.push(m)
    return m
  }
  const plain = (color: number, metalness: number, roughness: number, w?: Wear) => {
    const m = new THREE.MeshStandardMaterial({ color, metalness, roughness })
    if (w) applyWear(m, w)
    mats.push(m)
    return m
  }
  const white1 = paint(0xf3f5f8, wear[0])
  const white2 = paint(0xf3f5f8, wear[1])
  const black1 = paint(0x23272d, wear[0], 0.5)
  const black2 = paint(0x23272d, wear[1], 0.5)
  const orange = paint(0xf97316, wear[0], 0.45)
  const metal = plain(0x50565e, 0.85, 0.32)
  const niobium = plain(0x8a8f96, 0.9, 0.28)
  const fin = plain(0x3a4047, 0.7, 0.4, wear[0])
  const hot = [0, 1].map(() => {
    const m = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff8a3a, emissiveIntensity: 0, side: THREE.BackSide, roughness: 1 })
    mats.push(m)
    return m
  })
  const C = 64

  // ---- first stage ----
  const s1 = new THREE.Group()
  const skirt = 1.8
  const interH = 3.1
  const tankH = h1 - skirt - (interH - 0.6)
  add(s1, scaleUv(new THREE.CylinderGeometry(R, R, tankH, C, 1, true), 3, tankH / 14), white1, skirt + tankH / 2)
  add(s1, scaleUv(new THREE.CylinderGeometry(R, R * 1.02, skirt, C, 1, true), 3, skirt / 14), black1, skirt / 2)
  add(s1, new THREE.CircleGeometry(R, C).rotateX(Math.PI / 2), metal, 0.25)
  add(s1, scaleUv(new THREE.CylinderGeometry(R * 1.004, R * 1.004, interH, C, 1, true), 3, interH / 14), black1, h1 - interH / 2 + 0.6)
  add(s1, scaleUv(new THREE.CylinderGeometry(R * 1.006, R * 1.006, 1.4, C, 1, true), 3, 0.1), orange, h1 * 0.62)
  // raceway (cable tunnel) along the side
  add(s1, new THREE.BoxGeometry(0.22, tankH - 1, 0.5), white1, skirt + tankH / 2, -(R + 0.08), 0)
  // engines: a cluster under a heat shield
  const n1 = launcherId === 'light' ? 1 : reusable ? 9 : 7
  const spots = n1 === 1 ? [[0, 0]] : [[0, 0], ...Array.from({ length: n1 - 1 }, (_, i) => [Math.cos((i / (n1 - 1)) * Math.PI * 2) * R * 0.64, Math.sin((i / (n1 - 1)) * Math.PI * 2) * R * 0.64])]
  const exitR = n1 === 1 ? R * 0.72 : Math.min(R * 0.64 * Math.sin(Math.PI / (n1 - 1)), R * 0.32) * 0.96
  const bellH = exitR * 2.1
  const bells = mergeGeometries(spots.map(([x, z]) => bellGeometry(exitR, bellH).translate(x, -1.2, z)))!
  add(s1, bells, metal)
  const glow1 = new THREE.Mesh(bells, hot[0])
  glow1.scale.set(0.97, 1, 0.97)
  glow1.position.y = 0.02
  s1.add(glow1)
  if (reusable) {
    // folded landing legs and grid fins
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4
      const leg = add(s1, new THREE.BoxGeometry(0.42, 9.5, 0.7), fin, 5.6, Math.cos(a) * (R + 0.22), Math.sin(a) * (R + 0.22))
      leg.rotation.y = -a
      add(s1, new THREE.BoxGeometry(0.3, 6, 0.3), metal, 4.2, Math.cos(a) * (R + 0.5), Math.sin(a) * (R + 0.5))
      const gp = new THREE.Group()
      gp.position.set(Math.cos(a) * (R + 0.95), h1 - 4.2, Math.sin(a) * (R + 0.95))
      gp.rotation.y = -a
      const bars: THREE.BufferGeometry[] = []
      for (let k = 0; k <= 5; k++) {
        bars.push(new THREE.BoxGeometry(1.5, 0.06, 0.06).translate(0, -0.75 + k * 0.3, 0))
        bars.push(new THREE.BoxGeometry(0.06, 1.5, 0.06).translate(-0.75 + k * 0.3, 0, 0))
      }
      bars.push(new THREE.BoxGeometry(1.6, 1.6, 0.04).translate(0, 0, -0.08))
      const grid = mergeGeometries(bars.map((b) => b.toNonIndexed()))!
      bars.forEach((b) => b.dispose())
      add(gp, grid, fin).rotation.y = Math.PI / 2
      s1.add(gp)
    }
  } else {
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2
      const f = add(s1, new THREE.BoxGeometry(0.22, 3.6, 2.2), fin, 2.4, Math.cos(a) * (R + 0.75), Math.sin(a) * (R + 0.75))
      f.rotation.y = -a
    }
  }

  // ---- strap-on boosters ----
  const hs = h1 * 0.72
  const boosters = hasSideBoosters(launcherId)
    ? [0.6, Math.PI + 0.6].map((a) => {
        const g = new THREE.Group()
        add(g, scaleUv(new THREE.CylinderGeometry(Rs, Rs, hs, 40, 1, true), 2, hs / 14), white1, hs / 2)
        add(g, new THREE.ConeGeometry(Rs, Rs * 2.6, 40), orange, hs + Rs * 1.3)
        add(g, bellGeometry(Rs * 0.78, Rs * 1.5).translate(0, -1.2, 0), metal)
        add(g, scaleUv(new THREE.CylinderGeometry(Rs * 1.01, Rs * 1.01, 1.2, 40, 1, true), 2, 0.1), black1, hs * 0.85)
        const home = new THREE.Vector3(Math.cos(a) * (R + Rs + 0.15), 0.2, Math.sin(a) * (R + Rs + 0.15))
        g.position.copy(home)
        return { group: g, home, out: new THREE.Vector3(Math.cos(a), 0, Math.sin(a)) }
      })
    : []

  // ---- second stage, vacuum engine, fairing ----
  const s2 = new THREE.Group()
  const body2 = h2 - 0.6
  add(s2, scaleUv(new THREE.CylinderGeometry(R, R, body2, C, 1, true), 3, body2 / 14), white2, h1 + 0.6 + body2 / 2)
  add(s2, new THREE.CircleGeometry(R, C).rotateX(Math.PI / 2), metal, h1 + 0.62)
  add(s2, scaleUv(new THREE.CylinderGeometry(R * 1.003, R * 1.003, 0.7, C, 1, true), 3, 0.05), black2, h1 + h2 - 0.35)
  const nozzle2 = new THREE.Group()
  const vb = bellGeometry(R * 0.78, 2.6)
  add(nozzle2, vb, niobium)
  const glow2 = new THREE.Mesh(vb, hot[1])
  glow2.scale.set(0.97, 1, 0.97)
  nozzle2.add(glow2)
  nozzle2.position.y = h1 - 2.5
  nozzle2.visible = false
  s2.add(nozzle2)
  const fairingMat = new THREE.MeshStandardMaterial({ color: 0xf6f7f9, map: skin, bumpMap: skin, bumpScale: 0.5, roughness: 0.34, metalness: 0.05, side: THREE.DoubleSide })
  mats.push(fairingMat)
  const rf = R + 0.25
  const prof = [new THREE.Vector2(R, 0), new THREE.Vector2(rf, 0.5), new THREE.Vector2(rf, hf * 0.42)]
  for (let i = 1; i <= 14; i++) prof.push(new THREE.Vector2(i === 14 ? 0.001 : rf * Math.cos((i / 14) * (Math.PI / 2)) ** 0.75, hf * (0.42 + 0.58 * (i / 14))))
  const fairing = [-Math.PI / 2, Math.PI / 2].map((phi) => {
    const g = new THREE.Group()
    const geo = new THREE.LatheGeometry(prof, 32, phi, Math.PI)
    scaleUv(geo, 1.5, hf / 14)
    add(g, geo, fairingMat)
    add(g, new THREE.LatheGeometry([new THREE.Vector2(rf * 1.004, 0.55), new THREE.Vector2(rf * 1.004, 1.2)], 32, phi, Math.PI), black2)
    g.position.y = h1 + h2
    s2.add(g)
    return g
  })

  return {
    stages: [s1, s2],
    boosters,
    fairing,
    nozzle2,
    hot,
    wear,
    dispose: () => {
      geos.forEach((g) => g.dispose())
      mats.forEach((m) => m.dispose())
    },
  }
}

/**
 * Dress a player-built rocket for the launch: every stage gets its own copies of its materials with the wear patch (soot
 * by fuel, frost on the upper part of its tanks) and the skin texture on painted parts. Returns one Wear per stage.
 */
export function wearCustomRocket(r: Rocket3D, skin: THREE.Texture) {
  const clones: THREE.Material[] = []
  const wears = r.layout.stages.map((s, i) => {
    const tanks = s.tankLengthM * s.tanks
    const w = makeWear(s.tankY0 + Math.min(tanks * 0.45, s.diameterM * 4), s.tankY0 + tanks * 0.45, s.tankY0 + tanks)
    const sootK = s.fuel === 'kerosene' ? 1 : s.fuel === 'methane' ? 0.35 : s.fuel === 'hydrogen' ? 0 : 0.5
    if (s.fuel === 'hydrogen') w.uFrost.value = 0
    const map = new Map<THREE.Material, THREE.MeshStandardMaterial>()
    r.stages[i].traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const m0 = mesh.material as THREE.MeshStandardMaterial
      let m = map.get(m0)
      if (!m) {
        m = m0.clone()
        if (m.metalness < 0.4) {
          m.bumpMap = skin
          m.bumpScale = 0.4
        }
        applyWear(m, w, sootK)
        map.set(m0, m)
        clones.push(m)
      }
      mesh.material = m
    })
    return w
  })
  return { wears, dispose: () => clones.forEach((m) => m.dispose()) }
}
