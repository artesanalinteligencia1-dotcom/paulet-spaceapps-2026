import * as THREE from 'three'
import { fbm, soilTexture } from './textures'

// The land around the pad: the altiplano floor (soil texture with large colour patches) and a ring of displaced terrain
// rising to the volcanoes of Arequipa behind the pad from the opening camera — El Misti (a near-perfect snow-capped
// cone), Chachani to its left and the Pichu Pichu ridge to its right — and lower Andean ridges all around.

/** View axis of the opening shot, from the camera at (-70, 22, 130) towards the pad. */
const FWD = new THREE.Vector3(70, 0, -130).normalize()
const RIGHT = new THREE.Vector3(-FWD.z, 0, FWD.x)
const at = (dist: number, side: number) => new THREE.Vector3(-70, 0, 130).addScaledVector(FWD, dist).addScaledVector(RIGHT, side)

const MISTI = at(6300, -900)
const CHACHANI = [at(7600, -4700), at(8200, -3900), at(7000, -5600)]
const PICHU = [at(7400, 3300), at(7700, 4300), at(7300, 5200)]

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Ground height (m) at (x, z). */
export function terrainHeight(x: number, z: number) {
  const r = Math.hypot(x, z)
  const ridge = (u: number, v: number) => 1 - Math.abs(fbm(u, v, 64, 7, 5) * 2 - 1)
  // distant ridges everywhere, taller towards the east (−z, behind the volcanoes)
  const east = smooth(-0.3, 0.7, -z / Math.max(r, 1))
  let h = smooth(2200, 7000, r) * (180 + 520 * east) * ridge(x / 2600 + 20, z / 2600 + 20) ** 1.6
  h += smooth(900, 3000, r) * 60 * fbm(x / 700 + 5, z / 700 + 5, 64, 3, 4)
  // El Misti: a steep cone with a small crater
  const dm = Math.hypot(x - MISTI.x, z - MISTI.z)
  const cone = Math.max(0, 1 - dm / 2700)
  h += 2350 * cone ** 1.35 * (1 - 0.05 * smooth(0.93, 1, cone))
  // Chachani: a broad massif of several summits
  for (const [i, c] of CHACHANI.entries()) {
    const d = Math.hypot(x - c.x, z - c.z)
    h += (1500 - i * 260) * Math.max(0, 1 - d / 2600) ** 1.8 * (0.85 + 0.3 * fbm(x / 500, z / 500, 64, 11, 3))
  }
  // Pichu Pichu: a long eroded ridge
  for (const [i, c] of PICHU.entries()) {
    const d = Math.hypot(x - c.x, z - c.z)
    h += (1150 - i * 120) * Math.max(0, 1 - d / 2300) ** 1.6 * (0.8 + 0.4 * ridge(x / 400, z / 400))
  }
  return h
}

export function makeTerrain(groundColor: number) {
  const soil = soilTexture()
  soil.repeat.set(520, 520)
  // the flat floor: a large plane with soft colour patches
  const floorGeo = new THREE.PlaneGeometry(44000, 44000, 90, 90)
  floorGeo.rotateX(-Math.PI / 2)
  const fc = new Float32Array(floorGeo.getAttribute('position').count * 3)
  const pos = floorGeo.getAttribute('position')
  const base = new THREE.Color(groundColor)
  const sand = new THREE.Color(0xb59a78)
  const tmp = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const n = fbm(pos.getX(i) / 3000 + 50, pos.getZ(i) / 3000 + 50, 64, 13, 4)
    tmp.copy(base).lerp(sand, 0.25 + 0.4 * n).multiplyScalar(0.85 + 0.3 * n)
    fc.set([tmp.r, tmp.g, tmp.b], i * 3)
  }
  floorGeo.setAttribute('color', new THREE.BufferAttribute(fc, 3))
  const floorMat = new THREE.MeshStandardMaterial({ map: soil, vertexColors: true, roughness: 1 })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.receiveShadow = true

  // the mountains: a polar grid from 1.8 km to 18 km, finer near the inner edge
  const NA = 440
  const NR = 120
  const r0 = 1800
  const r1 = 18000
  const verts: number[] = []
  const cols: number[] = []
  const rock = new THREE.Color(0x6e6158)
  const dark = new THREE.Color(0x4e4643)
  const snow = new THREE.Color(0xf4f6fa)
  const soilC = new THREE.Color(groundColor).lerp(sand, 0.3)
  for (let j = 0; j < NR; j++) {
    const r = r0 * (r1 / r0) ** (j / (NR - 1))
    for (let i = 0; i <= NA; i++) {
      const a = (i / NA) * Math.PI * 2
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      const h = j === 0 ? 0 : terrainHeight(x, z)
      verts.push(x, h - 2, z)
      const n = fbm(x / 300, z / 300, 64, 17, 3)
      tmp.copy(soilC).lerp(rock, smooth(40, 500, h)).lerp(dark, 0.35 * n)
      // snow above ~1650 m, patchy at its edge
      const s = smooth(1550 + n * 260, 1800 + n * 200, h)
      tmp.lerp(snow, s)
      cols.push(tmp.r, tmp.g, tmp.b)
    }
  }
  const idx: number[] = []
  const W = NA + 1
  for (let j = 0; j < NR - 1; j++) {
    for (let i = 0; i < NA; i++) {
      const a = j * W + i
      const b = a + 1
      const c = a + W
      const d = c + 1
      idx.push(a, b, c, b, d, c)
    }
  }
  const mGeo = new THREE.BufferGeometry()
  mGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  mGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3))
  mGeo.setIndex(idx)
  mGeo.computeVertexNormals()
  const mMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 })
  const mountains = new THREE.Mesh(mGeo, mMat)

  const group = new THREE.Group()
  group.add(floor, mountains)
  return {
    group,
    floor,
    mountains,
    dispose: () => {
      soil.dispose()
      floorGeo.dispose()
      floorMat.dispose()
      mGeo.dispose()
      mMat.dispose()
    },
  }
}
