// Orthographic Earth for the flight deck (map view and the telemetry inset), painted from NASA imagery:
// Blue Marble Next Generation (day) and Black Marble 2016 (city lights on the night side). Pure math here; the pixels
// are drawn into a canvas once per size and view (no per-frame cost).
import dayUrl from '../../assets/textures/earth-day-1k.jpg'
import nightUrl from '../../assets/textures/earth-night-4k.jpg'

const D2R = Math.PI / 180
export const R_EARTH_KM = 6371

export interface View {
  /** centre of the view, radians */
  lat0: number
  lon0: number
}

/** Forward orthographic projection on the unit disk; `front` is false for the far hemisphere. */
export function project(lat: number, lon: number, v: View, r = 1): { x: number; y: number; front: boolean } {
  const cosc = Math.sin(v.lat0) * Math.sin(lat) + Math.cos(v.lat0) * Math.cos(lat) * Math.cos(lon - v.lon0)
  const x = Math.cos(lat) * Math.sin(lon - v.lon0)
  const y = Math.cos(v.lat0) * Math.sin(lat) - Math.sin(v.lat0) * Math.cos(lat) * Math.cos(lon - v.lon0)
  return { x: x * r, y: y * r, front: cosc > 0 }
}

/** The point reached from (lat, lon) going `distKm` along a great circle with initial azimuth `azDeg`. Radians out. */
export function greatCircle(latDeg: number, lonDeg: number, azDeg: number, distKm: number): { lat: number; lon: number } {
  const p1 = latDeg * D2R
  const l1 = lonDeg * D2R
  const a = azDeg * D2R
  const d = distKm / R_EARTH_KM
  const lat = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(a))
  const lon = l1 + Math.atan2(Math.sin(a) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(lat))
  return { lat, lon }
}

/** Where the Sun is overhead for a launch at dawn, by day or at night over Arequipa (mid-November declination). */
export function subsolar(light: 'dawn' | 'day' | 'night', siteLonDeg: number): { lat: number; lon: number } {
  const off = light === 'dawn' ? 92 : light === 'day' ? 20 : 180
  return { lat: -18.5 * D2R, lon: (siteLonDeg + off) * D2R }
}

let images: Promise<{ day: ImageData; night: ImageData }> | null = null

/** Both NASA maps as 1024 × 512 pixel arrays (loaded once). */
export function loadEarthImages(): Promise<{ day: ImageData; night: ImageData }> {
  if (images) return images
  const read = (url: string) =>
    new Promise<ImageData>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const c = document.createElement('canvas')
        c.width = 1024
        c.height = 512
        const g = c.getContext('2d', { willReadFrequently: true })!
        g.drawImage(img, 0, 0, 1024, 512)
        resolve(g.getImageData(0, 0, 1024, 512))
      }
      img.onerror = reject
      img.src = url
    })
  images = Promise.all([read(dayUrl), read(nightUrl)]).then(([day, night]) => ({ day, night }))
  return images
}

/** Paint the globe into `ctx` (size × size): day map, city lights past the terminator, limb darkening, twilight band. */
export function paintEarth(ctx: CanvasRenderingContext2D, size: number, v: View, maps: { day: ImageData; night: ImageData }, sun: { lat: number; lon: number }) {
  const out = ctx.createImageData(size, size)
  const R = size / 2 - 1
  const c = size / 2
  const W = maps.day.width
  const H = maps.day.height
  const sx = Math.cos(sun.lat) * Math.cos(sun.lon)
  const sy = Math.cos(sun.lat) * Math.sin(sun.lon)
  const sz = Math.sin(sun.lat)
  const sinL0 = Math.sin(v.lat0)
  const cosL0 = Math.cos(v.lat0)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = (px - c) / R
      const y = (c - py) / R
      const r2 = x * x + y * y
      if (r2 > 1) continue
      const z = Math.sqrt(1 - r2)
      const lat = Math.asin(z * sinL0 + y * cosL0)
      const lon = v.lon0 + Math.atan2(x, z * cosL0 - y * sinL0)
      const u = ((lon / (2 * Math.PI) + 0.5) % 1 + 1) % 1
      const tx = Math.min(W - 1, Math.floor(u * W))
      const ty = Math.min(H - 1, Math.max(0, Math.floor((0.5 - lat / Math.PI) * H)))
      const i = (ty * W + tx) * 4
      // sunlight: cosine between the surface normal and the subsolar direction, softened into a twilight band
      const nx = Math.cos(lat) * Math.cos(lon)
      const ny = Math.cos(lat) * Math.sin(lon)
      const nz = Math.sin(lat)
      const cosSun = nx * sx + ny * sy + nz * sz
      const day = Math.min(1, Math.max(0, (cosSun + 0.08) / 0.22))
      const limb = 0.55 + 0.45 * z
      const o = (py * size + px) * 4
      const d = maps.day.data
      const n = maps.night.data
      // Black Marble: the dark land and sea stay dark; only the brightest pixels are city lights
      const lights = Math.min(1, Math.max(0, (n[i] + n[i + 1] + n[i + 2] - 110) / 260)) * (1 - day)
      out.data[o] = (d[i] * (0.08 + 0.92 * day) * limb + 255 * lights * 0.95) | 0
      out.data[o + 1] = (d[i + 1] * (0.09 + 0.91 * day) * limb + 205 * lights * 0.95) | 0
      out.data[o + 2] = (d[i + 2] * (0.14 + 0.86 * day) * limb + 120 * lights * 0.95) | 0
      out.data[o + 3] = 255
    }
  }
  ctx.putImageData(out, 0, 0)
}
