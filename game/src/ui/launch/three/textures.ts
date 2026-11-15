import * as THREE from 'three'
import dayUrl from '../../../assets/textures/earth-day-4k.jpg'
import nightUrl from '../../../assets/textures/earth-night-4k.jpg'

// Textures for the 3D launch: the NASA Earth maps (Blue Marble NG day, Black Marble 2016 night; see assets/textures/SOURCES.md),
// loaded once and shared while a scene uses them, and small procedural canvases (smoke puffs, dirt, concrete, rocket skin,
// lens dirt). Everything procedural is seeded, so the scene looks the same on every run.

let earth: { day: THREE.Texture; night: THREE.Texture; users: number } | null = null

/** The NASA day/night Earth maps. Call `release` when the scene unmounts; the last user frees them. */
export function acquireEarthTextures(renderer: THREE.WebGLRenderer) {
  if (!earth) {
    const loader = new THREE.TextureLoader()
    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    const load = (url: string) => {
      const t = loader.load(url)
      t.colorSpace = THREE.SRGBColorSpace
      t.wrapS = THREE.RepeatWrapping // no seam at the date line
      t.anisotropy = aniso
      return t
    }
    earth = { day: load(dayUrl), night: load(nightUrl), users: 0 }
  }
  earth.users++
  const mine = earth
  let done = false
  return {
    day: mine.day,
    night: mine.night,
    release: () => {
      if (done) return
      done = true
      if (--mine.users === 0) {
        mine.day.dispose()
        mine.night.dispose()
        if (earth === mine) earth = null
      }
    },
  }
}

// ---- seeded value noise (periodic, so canvases tile) ----
function hash(x: number, y: number, s: number) {
  let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}
function vnoise(x: number, y: number, period: number, seed: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const p = (a: number) => ((a % period) + period) % period
  const a = hash(p(xi), p(yi), seed)
  const b = hash(p(xi + 1), p(yi), seed)
  const c = hash(p(xi), p(yi + 1), seed)
  const d = hash(p(xi + 1), p(yi + 1), seed)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
/** fBm in 0..1, tiling with `period` lattice cells over the unit square scaled by `period`. */
export function fbm(x: number, y: number, period: number, seed: number, octaves = 4) {
  let s = 0
  let a = 0.5
  let f = 1
  let n = 0
  for (let i = 0; i < octaves; i++) {
    s += a * vnoise(x * f, y * f, period * f, seed + i * 17)
    n += a
    a *= 0.5
    f *= 2
  }
  return s / n
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return { c, x: c.getContext('2d')! }
}
function finish(c: HTMLCanvasElement, srgb = true, repeat = false) {
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 4
  return t
}

/** Four billowy smoke puffs in a 2×2 atlas (red = density). */
export function puffAtlas() {
  const S = 128
  const { c, x } = canvas(S * 2, S * 2)
  const img = x.createImageData(S * 2, S * 2)
  for (let tile = 0; tile < 4; tile++) {
    const ox = (tile % 2) * S
    const oy = Math.floor(tile / 2) * S
    for (let j = 0; j < S; j++) {
      for (let i = 0; i < S; i++) {
        const u = (i + 0.5) / S - 0.5
        const v = (j + 0.5) / S - 0.5
        const r = Math.hypot(u, v) * 2
        const n = fbm(u * 4 + tile * 7.3, v * 4 + tile * 3.1, 64, 5 + tile, 5)
        // a soft round body with a lumpy edge
        const edge = 1 - Math.min(1, Math.max(0, (r - 0.35 - (n - 0.5) * 0.7) / 0.45))
        const d = Math.max(0, edge * edge * (0.55 + 0.75 * n))
        const k = ((oy + j) * S * 2 + ox + i) * 4
        img.data[k] = img.data[k + 1] = img.data[k + 2] = Math.min(255, d * 255)
        img.data[k + 3] = 255
      }
    }
  }
  x.putImageData(img, 0, 0)
  return finish(c, false)
}

/** Tiling dry altiplano soil: dust, gravel and darker patches (sRGB, tinted by the material colour). */
export function soilTexture() {
  const S = 256
  const { c, x } = canvas(S, S)
  const img = x.createImageData(S, S)
  for (let j = 0; j < S; j++) {
    for (let i = 0; i < S; i++) {
      const big = fbm(i / S * 4, j / S * 4, 4, 3, 4)
      const fine = hash(i, j, 9)
      const v = 0.8 + (big - 0.5) * 0.22 + (fine - 0.5) * 0.14
      const k = (j * S + i) * 4
      img.data[k] = Math.min(255, v * 238)
      img.data[k + 1] = Math.min(255, v * 228)
      img.data[k + 2] = Math.min(255, v * 214)
      img.data[k + 3] = 255
    }
  }
  x.putImageData(img, 0, 0)
  // pebbles
  for (let i = 0; i < 900; i++) {
    const px = hash(i, 1, 21) * S
    const py = hash(i, 2, 21) * S
    const g = 120 + hash(i, 3, 21) * 110
    x.fillStyle = `rgba(${g},${g * 0.95},${g * 0.9},0.5)`
    x.fillRect(px, py, 1 + hash(i, 4, 21) * 2, 1 + hash(i, 5, 21) * 2)
  }
  return finish(c, true, true)
}

/** Concrete slabs with joints, stains and scorch marks (for the pad hardstand; tiles every slab grid). */
export function concreteTexture() {
  const S = 256
  const { c, x } = canvas(S, S)
  const img = x.createImageData(S, S)
  for (let j = 0; j < S; j++) {
    for (let i = 0; i < S; i++) {
      const n = fbm(i / S * 8, j / S * 8, 8, 31, 4)
      const fine = hash(i, j, 33)
      const v = 0.78 + (n - 0.5) * 0.3 + (fine - 0.5) * 0.08
      const k = (j * S + i) * 4
      img.data[k] = Math.min(255, v * 226)
      img.data[k + 1] = Math.min(255, v * 222)
      img.data[k + 2] = Math.min(255, v * 214)
      img.data[k + 3] = 255
    }
  }
  x.putImageData(img, 0, 0)
  x.strokeStyle = 'rgba(40,38,36,0.55)'
  x.lineWidth = 2
  for (let k = 0; k <= S; k += S / 4) {
    x.beginPath()
    x.moveTo(k, 0)
    x.lineTo(k, S)
    x.moveTo(0, k)
    x.lineTo(S, k)
    x.stroke()
  }
  return finish(c, true, true)
}

/**
 * Rocket skin: welded panels and stringer lines on painted metal. Colour map (near white, multiplied by the paint) and the
 * same canvas as a bump map, so the seams catch the low sun.
 */
export function skinTexture() {
  const W = 256
  const H = 512
  const { c, x } = canvas(W, H)
  const img = x.createImageData(W, H)
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const n = fbm(i / W * 4, j / H * 8, 4, 41, 3)
      const v = 0.94 + (n - 0.5) * 0.08
      const k = (j * W + i) * 4
      img.data[k] = img.data[k + 1] = img.data[k + 2] = Math.min(255, v * 255)
      img.data[k + 3] = 255
    }
  }
  x.putImageData(img, 0, 0)
  // circumferential welds (panel rings) and a few vertical seams
  x.fillStyle = 'rgba(70,74,80,0.55)'
  for (let y = 0; y < H; y += 64) x.fillRect(0, y, W, 2)
  x.fillStyle = 'rgba(90,94,100,0.35)'
  for (let i = 0; i < 8; i++) x.fillRect(i * 32, 0, 1, H)
  // rivet rows next to the welds
  x.fillStyle = 'rgba(80,84,90,0.5)'
  for (let y = 0; y < H; y += 64) for (let i = 0; i < W; i += 6) x.fillRect(i, y + 5, 1, 1)
  return finish(c, true, true)
}

/** Lens dirt for the onboard camera: soft blotches and specks, lit only by bright light. */
export function lensDirtTexture() {
  const W = 512
  const H = 288
  const { c, x } = canvas(W, H)
  x.fillStyle = '#000'
  x.fillRect(0, 0, W, H)
  for (let i = 0; i < 70; i++) {
    const px = hash(i, 1, 61) * W
    const py = hash(i, 2, 61) * H
    const r = 6 + hash(i, 3, 61) * 34
    const a = 0.08 + hash(i, 4, 61) * 0.22
    const g = x.createRadialGradient(px, py, 0, px, py, r)
    g.addColorStop(0, `rgba(255,255,255,${a})`)
    g.addColorStop(0.7, `rgba(255,255,255,${a * 0.6})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    x.fillStyle = g
    x.beginPath()
    x.arc(px, py, r, 0, Math.PI * 2)
    x.fill()
  }
  for (let i = 0; i < 260; i++) {
    x.fillStyle = `rgba(255,255,255,${0.2 + hash(i, 5, 63) * 0.5})`
    x.fillRect(hash(i, 6, 63) * W, hash(i, 7, 63) * H, 1.5, 1.5)
  }
  return finish(c, false)
}

/** A star-burst glare for the Sun (additive sprite). */
export function glareTexture() {
  const S = 256
  const { c, x } = canvas(S, S)
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.06, 'rgba(255,246,225,0.9)')
  g.addColorStop(0.2, 'rgba(255,214,160,0.25)')
  g.addColorStop(1, 'rgba(255,190,130,0)')
  x.fillStyle = g
  x.fillRect(0, 0, S, S)
  x.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 6; i++) {
    x.save()
    x.translate(S / 2, S / 2)
    x.rotate((i * Math.PI) / 6 + 0.2)
    const r = x.createLinearGradient(-S / 2, 0, S / 2, 0)
    r.addColorStop(0, 'rgba(255,230,200,0)')
    r.addColorStop(0.5, 'rgba(255,240,220,0.28)')
    r.addColorStop(1, 'rgba(255,230,200,0)')
    x.fillStyle = r
    x.fillRect(-S / 2, -1, S, 2)
    x.restore()
  }
  return finish(c)
}
