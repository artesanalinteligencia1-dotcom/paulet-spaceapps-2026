import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { BlendFunction, BloomEffect, EffectComposer, EffectPass, RenderPass, TextureEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect } from 'postprocessing'
import type { RocketDesign } from '../../../engine/rocket'
import { launchDisplayScale, rocketLayout } from '../../../engine/rocketLayout'
import { mulberry32 } from '../../../engine/rng'
import type { Timeline } from '../LaunchSequence'
import type { SceneryStyle } from '../LaunchScenery'
import type { SpacecraftVisual } from '../../spacecraft/visual'
import { LANDING_TOUCH, ascentAt, boosterLandingAt, customStagingAt, hasSideBoosters, isReusableLauncher, rocketMetres, stagingTimes } from './ascent'
import { LIGHTS, addStars, makeEnvironment, softTexture } from './common'
import { geoVec, makeRealEarth, sunAtSite, trackPoint, trackTangent, type OrbitInfo } from './earth3d'
import { makePlume, makeSmoke, type SmokeLight } from './exhaust'
import { buildCatalogRocket, trackWear, wearCustomRocket, type Wear } from './launchRocket'
import { LensEffect } from './lensEffect'
import { makeOrbitView, routeAt } from './orbitView'
import { buildPadComplex } from './padComplex'
import { buildRocket3D } from './rocket3d'
import { makeSky } from './sky'
import { buildSpacecraft } from './spacecraft3d'
import { makeTerrain } from './terrain'
import { acquireEarthTextures, lensDirtTexture, skinTexture } from './textures'

/**
 * The launch in Three.js (loaded on demand). Driven by the game timeline through `tRef` (seconds after pressing Launch);
 * the HUD, captions, countdown digits and every sound stay in LaunchSequence; the spacecraft is built from the design.
 * With `rocket` (Rocket Engineer pad) the launcher is the player's own design, built from its parts: boosters and stages
 * drop in the design's order, on the same timeline.
 *
 * What is drawn: a detailed launch complex below the volcanoes of Arequipa under a scattering sky, a PBR rocket (soot after
 * liftoff, frost on the oxygen tanks before it), a shader plume with shock diamonds that opens into a vacuum plume, one
 * lit smoke system (pad clouds, trail, venting, staging), the real Earth from NASA maps once the sky turns black, and an
 * `orbit` camera that pulls back to the whole globe with the route and the target orbit.
 */

interface Props {
  launcherId: string
  light: SceneryStyle
  T: Timeline
  tRef: { current: number }
  failAt: number | null
  /** the player's spacecraft (`spacecraftVisual(design)`) */
  visual: SpacecraftVisual
  /** reusable launchers: whether the booster lands on the drone ship (mission roll); drawn in a 3D inset */
  landed?: boolean
  /** a player-built rocket: drawn from its parts instead of the catalog shape of `launcherId` */
  rocket?: RocketDesign
  /** switchable cameras and a second live view (flight HUD); without it the scene keeps its scripted camera */
  views?: CameraViews
  /** the target orbit: launch azimuth (south for sun-synchronous, east otherwise) and the ring of the 'orbit' camera */
  orbit?: OrbitInfo
}

/**
 * Cameras the player can switch between while the rocket flies: `chase` (scripted follow), `ground` (long lens at the
 * spectators' site), `onboard` (wide lens on the upper stage looking down), `payload` (on the upper stage looking at the
 * fairing, then the spacecraft) and `orbit` (pulls back to the whole Earth with the route and the orbit).
 */
export type CamView = 'chase' | 'ground' | 'onboard' | 'orbit' | 'payload'

/** A live camera choice for the main view and an optional picture-in-picture (CSS px from the bottom-left corner). */
export interface CameraViews {
  main: { current: CamView }
  pip?: { current: CamView | null }
  pipRect?: { left?: number; right?: number; bottom: number; widthFrac: number; aspect: number }
  /** a box of the HUD the second view is drawn into (it wins over `pipRect`); the booster landing also plays there */
  pipEl?: { current: HTMLElement | null }
}

/** Booster-recovery inset, in CSS pixels from the bottom-right corner (LaunchSequence puts its labels on the same box). */
export const LANDING_INSET = { right: 12, bottom: 64, widthFrac: 0.26, aspect: 0.6 }

/** Radius of the Earth under the rocket once the sky turns black (world metres; small so the curve shows). */
const EARTH_R = 6000
const BLEND_MS = 750
const PULLBACK_MS = 4200

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x))
const smooth = (x: number) => {
  const t = clamp(x)
  return t * t * (3 - 2 * t)
}

export default function LaunchScene3D({ launcherId, light, T, tRef, failAt, visual, landed = true, rocket: rocketDesign, views, orbit }: Props) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = host.current!
    const L = LIGHTS[light]
    const P = T.pace ?? 1
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    // the game stage is scaled with CSS zoom: render at the size it is shown, crisp on any screen
    const pixelRatio = () => {
      const r = el.getBoundingClientRect()
      const zoom = el.clientWidth > 0 && r.width > 0 ? r.width / el.clientWidth : 1
      return clamp(window.devicePixelRatio * zoom, 0.5, 2)
    }
    renderer.setPixelRatio(pixelRatio())
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.setClearColor(0x000000)
    el.appendChild(renderer.domElement)
    const bin: { dispose: () => void }[] = []
    const keep = <D extends { dispose: () => void }>(d: D) => {
      bin.push(d)
      return d
    }

    const scene = new THREE.Scene()
    const fogDensity = light === 'night' ? 0.00012 : light === 'day' ? 0.00006 : 0.000085
    const fog = new THREE.FogExp2(L.fog, fogDensity)
    scene.fog = fog
    const camera = new THREE.PerspectiveCamera(38, 16 / 9, 1, 40000)
    const env = keep(makeEnvironment(renderer, L))
    scene.environment = env.texture
    const earthTex = acquireEarthTextures(renderer)
    bin.push({ dispose: earthTex.release })

    // ---- post-processing: crossfade between scenes, bloom, filmic tone mapping, then the lens looks and a vignette ----
    let composer: EffectComposer | null = null
    let renderPass: RenderPass | null = null
    let fadeFx: TextureEffect | null = null
    let lens: LensEffect | null = null
    const fadeRT = keep(new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType }))
    const dirt = keep(lensDirtTexture())
    try {
      composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType, multisampling: 4 })
      renderPass = new RenderPass(scene, camera)
      composer.addPass(renderPass)
      fadeFx = new TextureEffect({ blendFunction: BlendFunction.NORMAL, texture: fadeRT.texture })
      fadeFx.blendMode.opacity.value = 0
      composer.addPass(new EffectPass(camera, fadeFx, new BloomEffect({ mipmapBlur: true, luminanceThreshold: 1.0, luminanceSmoothing: 0.25, intensity: 0.9, radius: 0.72 }), new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })))
      lens = new LensEffect(dirt)
      composer.addPass(new EffectPass(camera, lens, new VignetteEffect({ offset: 0.32, darkness: 0.42 })))
    } catch {
      composer = null
    }
    const rnd = mulberry32(11)

    // ---- sky, light ----
    const sunPad = light === 'dawn' ? new THREE.Vector3(1500, 520, -5200) : new THREE.Vector3(...L.sun)
    const sky = keep(makeSky({ ...L, sun: [sunPad.x, sunPad.y, sunPad.z] }, light))
    scene.add(sky.dome, sky.glare)
    const sun = new THREE.DirectionalLight(L.sunColor, L.sunI)
    sun.position.copy(sunPad)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.bias = -0.0004
    sun.shadow.normalBias = 0.5
    Object.assign(sun.shadow.camera, { left: -130, right: 130, top: 140, bottom: -50, near: 10, far: 12000 })
    // soft fill from the camera side, so a rocket lit from behind (dawn) still reads
    const fill = new THREE.DirectionalLight(0xdfe6ff, light === 'day' ? 0.45 : light === 'dawn' ? 0.8 : 0.5)
    fill.position.set(-400, 250, 700)
    const hemi = new THREE.HemisphereLight(...L.hemi)
    scene.add(sun, sun.target, fill, hemi)
    const flameLight = new THREE.PointLight(0xffa64d, 0, 600, 1.4)
    scene.add(flameLight)

    // ---- land, stars ----
    const terrain = keep(makeTerrain(L.ground))
    scene.add(terrain.group)
    const starMat = addStars(scene, rnd, L.stars)

    // ---- the rocket ----
    const custom = rocketDesign ? buildRocket3D(rocketLayout(rocketDesign, launchDisplayScale(rocketLayout(rocketDesign).heightM))) : null
    if (custom) bin.push(custom)
    const CL = custom?.layout ?? null
    const stageCount = CL ? CL.stages.length : 2
    const RH = CL ? CL.heightM : rocketMetres(launcherId)
    const R = CL ? CL.stages[0].diameterM / 2 : launcherId === 'light' ? 1.4 : 1.8
    const h1 = CL ? CL.stages[0].lengthM : RH * 0.6
    const hf = CL ? (CL.fairing?.lengthM ?? 0) : RH * 0.2
    const h2 = CL ? RH - h1 - hf : RH * 0.2
    const reusable = CL ? CL.reusable && stageCount > 1 : isReusableLauncher(launcherId)
    const Rs = CL ? (CL.boosters?.diameterM ?? 0) / 2 : R * 0.55
    const skin = keep(skinTexture())
    const rocket = new THREE.Group()
    let stages: THREE.Group[]
    let halves: THREE.Group[]
    let wears: Wear[]
    let hot: THREE.MeshStandardMaterial[] = []
    let nozzle2: THREE.Object3D | null = null
    let boosterParts: { group: THREE.Group; home: THREE.Vector3; out: THREE.Vector3 }[]
    if (custom) {
      const w = keep(wearCustomRocket(custom, skin))
      stages = custom.stages
      halves = custom.fairing
      wears = w.wears
      boosterParts = custom.boosters
    } else {
      const cat = keep(buildCatalogRocket(launcherId, { R, h1, h2, hf, Rs }, skin))
      stages = cat.stages
      halves = cat.fairing
      wears = cat.wear
      hot = cat.hot
      nozzle2 = cat.nozzle2
      boosterParts = cat.boosters
    }
    const s1 = stages[0]
    /** what reaches orbit: it carries the spacecraft and the fairing */
    const top = stages[stages.length - 1]
    /** player-built rockets with three stages: the ones that drop between MECO and SECO */
    const mids = stages.slice(1, -1)
    stages.forEach((g) => rocket.add(g))
    const sides = boosterParts.map((b) => {
      const plume = makePlume()
      keep(plume)
      plume.group.position.y = -1.2
      b.group.add(plume.group)
      rocket.add(b.group)
      return { g: b.group, home: b.home.clone(), drift: b.out.clone().multiplyScalar(7).setY(-0.7), plume }
    })
    const hasBoosters = sides.length > 0 || (!CL && hasSideBoosters(launcherId))
    // the player's spacecraft (procedural, from the design) stowed inside the fairing
    const Rf = CL?.fairing ? CL.fairing.diameterM / 2 : R
    const busM = Rf * (0.55 + 0.5 * Math.min(1, Math.max(0, (visual.bus - 16) / 14)))
    const sc = buildSpacecraft(visual, busM)
    const craft = sc.group
    const below = (visual.instruments.some((i) => i.shape === 'telescope') ? 19 : visual.instruments.some((i) => i.shape === 'bigCamera') ? 13 : 9) * (busM / visual.bus)
    const craftHome = new THREE.Vector3(0, h1 + h2 + 0.3 + below + busM / 2, 0)
    craft.position.copy(craftHome)
    top.add(craft)
    rocket.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true
    })
    rocket.position.y = 4.8
    scene.add(rocket)
    /** each half hinges on its outer base edge: that edge is this far from the axis (the half's depth, from its own geometry) */
    const hingeR = halves.map((h) => {
      const b = new THREE.Box3()
      h.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        m.geometry.computeBoundingBox()
        b.union(m.geometry.boundingBox!)
      })
      return Math.max(0.3, b.max.z - b.min.z)
    })
    // the halves are built split front/back (±z); turn them a quarter so they open to the left and right of the
    // side-on cameras, i.e. along the flight direction (±x), and hinge them about z (order ZYX: turn, then hinge)
    halves.forEach((h) => {
      h.rotation.order = 'ZYX'
      h.rotation.y += Math.PI / 2
    })
    const halfHome = halves.map((h) => ({ parent: h.parent!, pos: h.position.clone(), rot: h.rotation.clone(), v: new THREE.Vector3(), w: new THREE.Vector3() }))

    // ---- the launch complex ----
    const pad = keep(buildPadComplex({ R: R + (hasBoosters ? Rs * 2 : 0), RH, light }))
    scene.add(pad.group)
    if (L.floods) pad.spots.forEach((s) => scene.add(s, s.target))

    // ---- exhaust: plume, smoke, flash, explosion, Max-Q vapour ----
    const plume = keep(makePlume())
    rocket.add(plume.group)
    const smoke = keep(makeSmoke(2800))
    scene.add(smoke.mesh)
    const flashTex = keep(softTexture('255,236,210'))
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0, color: new THREE.Color(3, 2.6, 2.2) }))
    scene.add(flash)
    const boomTex = keep(softTexture('255,150,60'))
    const boom = new THREE.Sprite(new THREE.SpriteMaterial({ map: boomTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0, color: new THREE.Color(3, 2, 1.2) }))
    scene.add(boom)
    const vapor = new THREE.Mesh(new THREE.ConeGeometry(R * 1.9, 9, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }))
    vapor.position.y = h1 + h2 - 3
    rocket.add(vapor)
    // the cloud deck around 650 m (static puffs of the smoke system)
    const cloudColor = new THREE.Color(light === 'night' ? 0x56607e : light === 'day' ? 0xffffff : 0xf6e2da)
    const cloudPuffs = Array.from({ length: 90 }, () => {
      const a = rnd() * Math.PI * 2
      const d = 160 + rnd() * 2400
      return smoke.add({ x: Math.cos(a) * d, y: 610 + rnd() * 110, z: Math.sin(a) * d, size: 260 + rnd() * 380, max: 1, fixed: true, a0: 0.5, r: cloudColor.r, g: cloudColor.g, b: cloudColor.b, tile: Math.floor(rnd() * 4), rot: rnd() * 6 })
    })

    // ---- the real Earth below the rocket once the sky turns black ----
    const earth = keep(makeRealEarth(earthTex, EARTH_R, { segments: 220, atmosphere: 0.02, cloudScale: 9, haze: 0.35 }))
    scene.add(earth.group)
    const sunGeo = sunAtSite(light === 'night' ? 'night' : light)
    // the orbit camera's globe
    const ov = keep(makeOrbitView(earthTex, T, light === 'night' ? 'night' : light, orbit))
    const orbitCam = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 10000)
    const pipOrbitCam = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 10000)

    // ---- booster recovery (reusable launchers): a second small scene drawn in an inset ----
    const recovery = reusable
      ? (() => {
          const ls = new THREE.Scene()
          ls.background = new THREE.Color(light === 'night' ? 0x0b1430 : light === 'day' ? 0x7fb2e8 : 0xb98aa8)
          ls.fog = new THREE.Fog(ls.background as THREE.Color, 200, 900)
          ls.add(new THREE.HemisphereLight(0xffffff, 0x223344, light === 'night' ? 0.8 : 1.4))
          const key = new THREE.DirectionalLight(0xffffff, light === 'night' ? 0.9 : 2)
          key.position.set(-60, 120, 160)
          ls.add(key)
          const dark = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 })
          const sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ color: light === 'night' ? 0x0d2547 : 0x1f5f99, roughness: 0.35, metalness: 0.1 }))
          sea.rotation.x = -Math.PI / 2
          ls.add(sea)
          const ship = new THREE.Group()
          const deck = new THREE.Mesh(new THREE.BoxGeometry(36, 2.4, 22), new THREE.MeshStandardMaterial({ color: 0x3f4652, roughness: 0.8 }))
          deck.position.y = 1.2
          const mark = new THREE.Mesh(new THREE.RingGeometry(5, 6.2, 32), new THREE.MeshBasicMaterial({ color: 0xfacc15 }))
          mark.rotation.x = -Math.PI / 2
          mark.position.y = 2.45
          ship.add(deck, mark)
          for (const z of [-11.5, 11.5]) {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(36, 1.2, 0.4), new THREE.MeshStandardMaterial({ color: 0x9aa3ad }))
            rail.position.set(0, 3, z)
            ship.add(rail)
          }
          ls.add(ship)
          const bh = h1
          const b = new THREE.Group()
          const legs: THREE.Group[] = []
          // a player-built first stage: built again from the same layout and shown at the inset's usual size
          const again = CL ? buildRocket3D(CL) : null
          const insetK = CL ? Math.min(30 / h1, 2.6 / R) : 1
          if (again) {
            const stage = again.stages[0]
            stage.scale.setScalar(insetK)
            stage.position.y = (CL!.legs?.footDropM ?? 0) * insetK
            b.add(stage)
          } else {
            const tube = new THREE.Mesh(new THREE.CylinderGeometry(R, R, bh, 20), new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.6 }))
            tube.position.y = bh / 2
            const cap = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 1.2, 20), dark)
            cap.position.y = bh + 0.6
            b.add(tube, cap)
            legs.push(
              ...[0, 1, 2, 3].map((i) => {
                const a = (i * Math.PI) / 2 + Math.PI / 4
                const pivot = new THREE.Group()
                pivot.position.set(Math.cos(a) * R, 6, Math.sin(a) * R)
                pivot.rotation.y = -a
                const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 9, 0.4), dark)
                leg.position.y = -4.5
                pivot.add(leg)
                b.add(pivot)
                return pivot
              }),
            )
            for (let i = 0; i < 4; i++) {
              const a = (i * Math.PI) / 2 + Math.PI / 4
              const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.6, 1.8), dark)
              fin.position.set(Math.cos(a) * (R + 0.9), bh - 3, Math.sin(a) * (R + 0.9))
              fin.rotation.y = -a
              b.add(fin)
            }
          }
          const setLegs = again ? again.setLegs : (k: number) => legs.forEach((p) => (p.rotation.z = k * 0.55))
          const burnTex = softTexture('255,190,100')
          const burn = new THREE.Mesh(new THREE.ConeGeometry(R * insetK * 0.7, 9, 14, 1, true), new THREE.MeshBasicMaterial({ map: burnTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))
          burn.rotation.x = Math.PI
          burn.position.y = -4.5
          b.add(burn)
          ls.add(b)
          const blastTex = softTexture('255,150,60')
          const blast = new THREE.Sprite(new THREE.SpriteMaterial({ map: blastTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }))
          ls.add(blast)
          const cam = new THREE.PerspectiveCamera(32, 1 / LANDING_INSET.aspect, 1, 3000)
          cam.position.set(-70, 22, 95)
          cam.lookAt(0, 22, 0)
          return { ls, b, setLegs, burn, blast, cam, again, textures: [burnTex, blastTex] }
        })()
      : null

    // ---- size ----
    const resize = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (!w || !h) return
      if (composer) composer.setSize(w, h, false)
      else renderer.setSize(w, h, false)
      const db = renderer.getDrawingBufferSize(new THREE.Vector2())
      fadeRT.setSize(db.x, db.y)
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    let prCheck = 0

    // ---- constants of the frame loop ----
    const ENV_I = 0.5
    const black = new THREE.Color(0x02040c)
    const white3 = new THREE.Color(0xffffff)
    const spaceSky = new THREE.Color(0x0b0e18)
    const earthShine = new THREE.Color(0x86a6cf)
    const fogBase = new THREE.Color(L.fog)
    const OPEN_CAM = new THREE.Vector3(-70, 22, 130)
    const GROUND_CAM = new THREE.Vector3(-340, 6, 660)
    const pipCam = new THREE.PerspectiveCamera(50, 16 / 9, 0.3, 40000)
    const prevCam = new THREE.PerspectiveCamera(38, 16 / 9, 1, 40000)
    const chasePos = new THREE.Vector3()
    const chaseTarget = new THREE.Vector3()
    const aim = new THREE.Vector3()
    const tmp = new THREE.Vector3()
    const tmp2 = new THREE.Vector3()
    const up = new THREE.Vector3(0, 1, 0)
    const outward = new THREE.Vector3()
    const mBasis = new THREE.Matrix4()
    const site = geoVec(-16.4, -71.5)
    const smokeLight: SmokeLight = {
      sunView: new THREE.Vector3(),
      sunColor: new THREE.Color(L.sunColor).multiplyScalar(light === 'night' ? 0 : light === 'dawn' ? 2.3 : 2.6),
      ambient: new THREE.Color(light === 'night' ? 0x1a2238 : light === 'day' ? 0xb4c6dd : 0x7b6f9a),
      shade: new THREE.Color(light === 'night' ? 0x0c1020 : light === 'day' ? 0x8b97a8 : 0x4a4466),
      sunlit: light === 'dawn' ? [60, 520] : light === 'day' ? [-20, -10] : [1e6, 1e6 + 1],
      flameWorld: new THREE.Vector3(),
      flameColor: new THREE.Color(1, 0.55, 0.25),
      flameI: 0,
      fogColor: new THREE.Color(),
      fog: [300, 14000],
      space: 0,
    }
    const exhaustColor = new THREE.Color(light === 'night' ? 0x9aa3b6 : 0xe9e5e2)
    const steamColor = new THREE.Color(0xf4f6f8)
    const wind = new THREE.Vector3(-1.5, 0, 2.2)
    const prand = mulberry32(42)

    /** Where the second view goes, in canvas pixels from the bottom-left corner. */
    const pipBox = (): { x: number; y: number; w: number; h: number } | null => {
      const box = views?.pipEl?.current
      if (box) {
        const a = box.getBoundingClientRect()
        const c = el.getBoundingClientRect()
        if (a.width < 8 || a.height < 8 || c.width < 8) return null
        // the game stage is scaled with CSS zoom: client rects are zoomed, the renderer works in layout pixels
        const k = el.clientWidth / c.width
        return { x: Math.round((a.left - c.left) * k), y: Math.round((c.bottom - a.bottom) * k), w: Math.round(a.width * k), h: Math.round(a.height * k) }
      }
      if (!views?.pipRect) return views?.pip ? { x: 16, y: 16, w: Math.round(el.clientWidth * 0.24), h: Math.round(el.clientWidth * 0.24 * 0.56) } : null
      const pr = views.pipRect
      const w = Math.round(el.clientWidth * pr.widthFrac)
      const h = Math.round(w * pr.aspect)
      return { x: pr.right !== undefined ? el.clientWidth - w - pr.right : (pr.left ?? 16), y: pr.bottom, w, h }
    }

    // smoothed aim of the tracking camera, per camera
    const tracked = new Map<THREE.Camera, THREE.Vector3>()
    let fairingOff = false
    /** Put `cam` where `view` looks from (every view but 'orbit', which lives in its own scene). */
    const applyView = (cam: THREE.PerspectiveCamera, view: CamView, time: number, shake: number, dt: number) => {
      cam.near = 1
      if (view === 'ground') {
        aim.copy(rocket.position).addScaledVector(up, (h1 + h2) * 0.5)
        const s = tracked.get(cam) ?? tracked.set(cam, aim.clone()).get(cam)!
        // a tracking mount that keeps up with the rocket (only a little hand on top)
        s.copy(aim)
        void dt
        const dist = GROUND_CAM.distanceTo(s)
        // a long lens that keeps the rocket about the same size as it climbs, like a real tracking camera
        cam.fov = clamp((2 * Math.atan((RH * 0.95) / dist) * 180) / Math.PI, 0.45, 40)
        cam.position.copy(GROUND_CAM)
        cam.up.set(0, 1, 0)
        cam.lookAt(tmp.copy(s).add(tmp2.set(Math.sin(time * 1.7) * 0.0006 * dist, Math.sin(time * 2.3) * 0.0005 * dist, 0)))
      } else if (view === 'onboard' || (view === 'payload' && !fairingOff)) {
        // bolted to the upper stage, looking down the body at the flame and the Earth falling away
        const yCam = CL ? CL.stages[stageCount - 1].y0 + CL.stages[stageCount - 1].lengthM * 0.55 : h1 + h2 * 0.62
        const rT = CL ? CL.stages[stageCount - 1].diameterM / 2 : R
        if (view === 'payload') {
          // the fairing until it opens
          cam.fov = 70
          cam.position.copy(top.localToWorld(tmp.set(rT + 1.1, h1 + h2 - 0.6, rT * 0.9)))
          outward.set(1, 0, 0).applyQuaternion(rocket.quaternion)
          cam.up.copy(outward)
          cam.lookAt(top.localToWorld(tmp.set(0, h1 + h2 + hf * 0.55, 0)))
        } else {
          cam.fov = 88
          cam.position.copy(top.localToWorld(tmp.set(rT + 0.9, yCam, rT * 0.35)))
          outward.set(1, 0, 0.3).normalize().applyQuaternion(rocket.quaternion)
          cam.up.copy(outward)
          cam.lookAt(top.localToWorld(tmp.set(rT * 0.6 + 4, yCam - 400, rT * 0.15)))
        }
        // vibration: a fast shiver plus the bigger shake of liftoff and Max-Q
        const j = 0.0015 + shake * 0.006
        cam.rotateX(j * Math.sin(time * 91))
        cam.rotateY(j * Math.cos(time * 77))
        cam.near = 0.1
      } else if (view === 'payload') {
        // on the payload adapter, looking up at the spacecraft as it leaves and opens its arrays
        const rT = CL ? CL.stages[stageCount - 1].diameterM / 2 : R
        cam.fov = 66
        cam.position.copy(top.localToWorld(tmp.set(rT * 1.25, h1 + h2 - 0.3, rT * 1.1)))
        outward.set(0, 1, 0).applyQuaternion(rocket.quaternion)
        cam.up.copy(outward)
        cam.lookAt(craft.getWorldPosition(tmp))
        const j = 0.001
        cam.rotateX(j * Math.sin(time * 61))
        cam.near = 0.1
      } else {
        cam.fov = 38
        cam.up.set(0, 1, 0)
        cam.position.copy(chasePos)
        cam.lookAt(chaseTarget)
      }
      cam.updateProjectionMatrix()
    }

    // ---- state of the loop ----
    const camPos = OPEN_CAM.clone()
    const camOff = OPEN_CAM.clone().sub(new THREE.Vector3(0, 4.8, 0))
    let last = -1
    let prev = performance.now()
    let sepDone = false
    let sideDone = false
    let raf = 0
    const separates = stageCount > 1
    const sepTimes = custom ? stagingTimes(T, stageCount) : [T.meco]
    const midDone = mids.map(() => false)
    const sepPuffed = sepTimes.map(() => false)
    let fairPuffed = false
    let lastNozzle: THREE.Vector3 | null = null
    let ventAcc = 0
    // cameras: the current main view and a transition from the previous one
    let curView: CamView = views?.main.current ?? 'chase'
    let fromView: CamView = curView
    let transAt = -1e9
    let transKind: 'blend' | 'fade' | 'cut' = 'cut'
    let orbitSince = performance.now()
    const lensNow = { shimmer: 0, haze: 0, onboard: 0 }
    const hazeColor = new THREE.Color()
    const lensOf = (view: CamView, dist: number) =>
      view === 'ground'
        ? { shimmer: 0.25 + 0.75 * smooth((dist - 700) / 2500), haze: 0.16 * smooth((dist - 1200) / 4000), onboard: 0 }
        : view === 'onboard'
          ? { shimmer: 0, haze: 0, onboard: 1 }
          : view === 'payload'
            ? { shimmer: 0, haze: 0, onboard: 0.65 }
            : { shimmer: 0, haze: 0, onboard: 0 }

    const emitPad = (thrust: number, dts: number, alt: number) => {
      const P0 = pad.trenchExit
      const k = thrust * (1 - smooth((alt - 30) / 90))
      // the trench spits a rolling cloud of steam and smoke
      const n = Math.min(14, Math.round(dts * 60 * k + prand() * 0.8 * k))
      for (let i = 0; i < n; i++) {
        const big = 9 + prand() * 9
        smoke.add({ x: P0.x - prand() * 6, y: 3 + prand() * 4, z: (prand() - 0.5) * pad.trenchHalfWidth * 1.6, vx: -(22 + prand() * 34), vy: 2 + prand() * 7, vz: (prand() - 0.5) * 46, size: big, grow: 5 + prand() * 5, max: 10 + prand() * 7, a0: 0.62, heat: 0.35, cool: 0.5, drag: 0.6, lift: 1.6, spin: (prand() - 0.5) * 0.4, rot: prand() * 6, r: steamColor.r, g: steamColor.g, b: steamColor.b, tile: Math.floor(prand() * 4) })
      }
      // the deluge boils off around the mount
      const m = Math.min(6, Math.round(dts * 22 * k + prand() * 0.5))
      for (let i = 0; i < m; i++) {
        const a = prand() * Math.PI * 2
        const d = R + 3 + prand() * 6
        smoke.add({ x: Math.cos(a) * d, y: 5 + prand() * 2, z: Math.sin(a) * d, vx: Math.cos(a) * (14 + prand() * 16), vy: 4 + prand() * 6, vz: Math.sin(a) * (14 + prand() * 16), size: 5 + prand() * 5, grow: 5, max: 6 + prand() * 4, a0: 0.5, heat: 0.2, cool: 0.6, drag: 0.8, lift: 1.5, rot: prand() * 6, r: steamColor.r, g: steamColor.g, b: steamColor.b, tile: Math.floor(prand() * 4) })
      }
    }

    const frame = (now: number) => {
      const wall = (now - prev) / 1000
      const dt = Math.min(0.05, wall)
      prev = now
      const time = tRef.current
      if (time < last - 0.01) {
        // clock went back (new launch): reset the one-way changes
        smoke.clear()
        lastNozzle = null
        if (sepDone) {
          rocket.add(s1)
          s1.position.set(0, 0, 0)
          s1.rotation.set(0, 0, 0)
          sepDone = false
        }
        if (sideDone) {
          sides.forEach((s) => {
            rocket.add(s.g)
            s.g.position.copy(s.home)
            s.g.rotation.set(0, 0, 0)
          })
          sideDone = false
        }
        mids.forEach((m, i) => {
          if (!midDone[i]) return
          rocket.add(m)
          m.position.set(0, 0, 0)
          m.rotation.set(0, 0, 0)
          midDone[i] = false
        })
        halves.forEach((h, i) => {
          halfHome[i].parent.add(h)
          h.position.copy(halfHome[i].pos)
          h.rotation.copy(halfHome[i].rot)
          h.visible = true
        })
        fairingOff = false
        sepPuffed.fill(false)
        fairPuffed = false
        camOff.copy(OPEN_CAM).sub(tmp.set(0, 4.8, 0))
      }
      // "Skip animation" moves the clock much further than the wall clock did: settle instantly. Slow frames are not skips.
      const jumped = time - last > Math.max(1.5, wall + 0.5)
      const dts = jumped ? 0 : clamp(time - last, 0, 0.1)
      last = time
      const exploded = failAt !== null && time >= failAt
      // after a failure everything stays where it broke up (the camera does not keep climbing)
      const tt = exploded ? failAt! : time
      const r = ascentAt(tt, T)
      // player-built rockets: which stage burns, and the short coast while an upper stage drops
      const cs = custom ? customStagingAt(tt, T, stageCount) : null
      const thrust = r.thrust * (cs?.throttle ?? 1)
      const burnY = CL && cs ? CL.stages[cs.stage].y0 : null

      rocket.position.set(r.down, 4.8 + r.alt, 0)
      rocket.rotation.z = -r.pitch
      rocket.visible = !exploded
      up.set(Math.sin(r.pitch), Math.cos(r.pitch), 0)
      pad.arms.forEach((a, i) => (a.rotation.y = r.arms * (1.15 + i * 0.12)))
      pad.tailHose.visible = time < T.liftoff + 0.05
      const blink = Math.floor(time * 1.5) % 2 === 0
      pad.beacons.forEach((b) => b.material.color.setHex(blink ? 0xff2a2a : 0x3a0a0a))
      ;(vapor.material as THREE.MeshBasicMaterial).opacity = r.vapor * 0.3

      // stage separation: the first stage stays in the world and falls away
      if (r.stage === 2 && !sepDone && separates) {
        sepDone = true
        scene.attach(s1)
      }
      if (sepDone && s1.parent === scene) {
        const k = time - T.meco
        s1.position.y -= (6 + (k * 40) / P) * dts
        s1.position.x -= 8 * dts
        s1.rotation.z += (0.5 / Math.sqrt(P)) * dts
      }
      mids.forEach((m, i) => {
        if (cs && cs.stage > i + 1 && !midDone[i]) {
          midDone[i] = true
          scene.attach(m)
        }
        if (midDone[i] && m.parent === scene) {
          const k = time - sepTimes[i + 1]
          m.position.y -= (6 + (k * 40) / P) * dts
          m.position.x -= 8 * dts
          m.rotation.z += 0.5 * dts
        }
      })
      const thin = clamp(r.alt / 900)
      const flick = 0.88 + 0.24 * Math.abs(Math.sin(time * 37)) * Math.abs(Math.cos(time * 23))
      // side boosters burn out and swing away just before MECO
      if (sides.length && time >= T.meco - 0.4 && !sideDone) {
        sideDone = true
        sides.forEach((s) => scene.attach(s.g))
      }
      for (const s of sides) {
        const on = !sideDone && thrust > 0.02 && !exploded
        s.plume.set(RH * (0.45 + thin * 0.9), Rs * 0.85, smooth((r.alt - 150) / 2400), on ? thrust * flick : 0, false, time)
        if (sideDone && s.g.parent === scene) {
          const k = time - (T.meco - 0.4)
          s.g.position.addScaledVector(s.drift, dts)
          s.g.position.y -= (4 + (k * 35) / P) * dts
          s.g.rotation.z += 0.4 * dts
        }
      }
      if (nozzle2) nozzle2.visible = sepDone
      // deployment: the spacecraft pushes off the upper stage, turns slowly and unfolds its arrays
      const dk = clamp((time - T.deploy) / (3.5 * Math.sqrt(P)))
      const de = 1 - (1 - dk) ** 2
      craft.position.set(craftHome.x + de * busM * 1.2, craftHome.y + de * busM * 4, craftHome.z + de * busM * 2.5)
      craft.rotation.set(de * 0.3, de * 0.25, -de * 0.15)
      sc.setDeploy((time - T.deploy - 0.6 * Math.sqrt(P)) / (1.6 * Math.sqrt(P)))

      // fairing: like a clamshell, each half swings outward on a hinge at its base (the pyrotechnic seam fires first),
      // the spacecraft appears with its arrays folded, then the halves let go, keep turning outward and fall behind
      const FAIR_OPEN = 0.6
      if (r.fairing >= FAIR_OPEN && !fairingOff && !exploded) {
        fairingOff = true
        const vel = tmp.set(0, 0, 0)
        const a0 = ascentAt(tt - 0.05, T)
        vel.set((r.down - a0.down) / 0.05, (r.alt - a0.alt) / 0.05, 0)
        halves.forEach((h, i) => {
          scene.attach(h)
          const s = i === 0 ? 1 : -1
          halfHome[i].v.copy(vel).add(tmp2.set(s * (3 + prand() * 1.5), 0, (prand() - 0.5) * 0.6).applyQuaternion(rocket.quaternion))
          halfHome[i].w.set((prand() - 0.5) * 0.1, (prand() - 0.5) * 0.15, -s * (0.7 + prand() * 0.3))
        })
      }
      if (!fairingOff) {
        const a = smooth(r.fairing / FAIR_OPEN) * 0.62
        halves.forEach((g, i) => {
          // halves[0] was the +z half, now the +x half: it tips toward +x about a hinge at (s·hr, base, 0)
          const s = i === 0 ? 1 : -1
          const hr = hingeR[i]
          g.rotation.z = halfHome[i].rot.z - s * a
          g.position.set(halfHome[i].pos.x + s * hr * (1 - Math.cos(a)), halfHome[i].pos.y + hr * Math.sin(a), halfHome[i].pos.z)
        })
      } else {
        halves.forEach((h, i) => {
          if (h.parent !== scene) return
          const hh = halfHome[i]
          hh.v.y -= 9.8 * 0.35 * dts
          h.position.addScaledVector(hh.v, dts)
          h.rotation.x += hh.w.x * dts
          h.rotation.y += hh.w.y * dts
          h.rotation.z += hh.w.z * dts
          h.visible = time < T.fairing + 14 * Math.sqrt(P)
        })
      }
      // staging flash and a puff of gas at every separation
      let flashK = 0
      let flashY = h1 + 0.5
      sepTimes.forEach((x, i) => {
        const fk = Math.max(0, 1 - Math.abs(time - x - 0.12) / 0.3)
        if (time >= x && !sepPuffed[i] && !jumped && !exploded) {
          sepPuffed[i] = true
          const y = (CL ? CL.stages[i + 1].y0 : h1) + 0.5
          const c = rocket.localToWorld(tmp.set(0, y, 0))
          for (let j = 0; j < 26; j++) {
            const a = (j / 26) * Math.PI * 2
            const o = tmp2.set(Math.cos(a), 0, Math.sin(a)).applyQuaternion(rocket.quaternion)
            smoke.add({ x: c.x + o.x * R, y: c.y + o.y * R, z: c.z + o.z * R, vx: o.x * 14, vy: o.y * 14, vz: o.z * 14, size: 1.5 + prand() * 2, grow: 3, max: 2.2, a0: 0.55, heat: 0.6, cool: 1.2, drag: 1.2, rot: prand() * 6, r: 1, g: 1, b: 1, tile: j % 4 })
          }
        }
        if (fk <= flashK) return
        flashK = fk
        flashY = (CL ? CL.stages[i + 1].y0 : h1) + 0.5
      })
      if (r.fairing > 0 && !fairPuffed && !jumped && !exploded) {
        // the separation charges fire along both vertical seams (where the halves meet) and around the base
        fairPuffed = true
        const seam = hingeR[0] ?? R
        for (let j = 0; j < 28; j++) {
          const side = j % 2 ? 1 : -1
          const base = j >= 22
          // after the quarter turn the seams face the cameras (±z)
          const o = tmp2.set(0, 0, side).applyQuaternion(rocket.quaternion)
          const c = rocket.localToWorld(tmp.set((prand() - 0.5) * 0.3, h1 + h2 + (base ? 0.2 : prand() * hf * 0.8), side * seam))
          smoke.add({ x: c.x, y: c.y, z: c.z, vx: o.x * 6 + (prand() - 0.5) * 3, vy: o.y * 6 + (prand() - 0.5) * 3, vz: o.z * 6 + (prand() - 0.5) * 3, size: 0.5 + prand() * 0.7, grow: 1.4, max: 1.4, a0: 0.6, heat: 0.5, cool: 1.5, rot: prand() * 6, tile: j % 4 })
        }
      }
      flash.position.copy(rocket.position).addScaledVector(up, flashY)
      flash.scale.setScalar(3 + flashK * 22)
      ;(flash.material as THREE.SpriteMaterial).opacity = exploded ? 0 : flashK

      // plume: tight with shock diamonds at sea level, a wide, faint vacuum plume higher up; bluish on the upper stage
      const upper = burnY !== null ? (cs?.stage ?? 0) > 0 : r.stage === 2
      const burnAt = burnY !== null ? burnY : upper ? h1 - 2.5 : -1.2
      const plumeR = upper ? (CL && cs ? CL.stages[cs.stage].diameterM * 0.4 : R * 0.78) : CL ? CL.stages[0].diameterM * 0.42 : R * 0.88
      const expand = upper ? 1 : smooth((r.alt - 150) / 2400)
      const plumeLen = (upper ? RH * (0.7 + thin * 0.8) : RH * (0.55 + thin * 1.1)) * (0.6 + 0.4 * thrust)
      plume.group.position.set(0, burnAt, 0)
      plume.set(plumeLen, plumeR, expand, exploded ? 0 : thrust * flick, upper, time)
      hot.forEach((m, i) => (m.emissiveIntensity = (i === (upper ? 1 : 0) ? thrust : 0) * 2.2 * flick))
      const nozzleW = rocket.localToWorld(new THREE.Vector3(0, burnAt, 0))
      flameLight.position.copy(nozzleW).addScaledVector(up, -8)
      flameLight.intensity = exploded ? 0 : thrust * (upper ? 400 : 9000) * flick * (1 - r.space * 0.7)

      // wear: soot creeps up after liftoff, the frost sheds during the climb
      const soot = smooth((time - T.liftoff) / (2.6 * P))
      const frost = 1 - smooth((time - T.ignition) / (3.2 * P))
      rocket.updateMatrixWorld()
      stages.forEach((g, i) => {
        g.updateMatrixWorld()
        const w = wears[i]
        if (!w) return
        trackWear(w, g)
        w.uSoot.value = i === 0 ? soot : soot * 0.15
        w.uFrost.value = custom && CL!.stages[i].fuel === 'hydrogen' ? 0 : frost
      })

      // explosion
      const bk = exploded ? time - failAt! : -1
      boom.visible = bk >= 0 && bk < 1.8
      if (boom.visible) {
        boom.position.copy(rocket.position).addScaledVector(up, RH * 0.5)
        const bf = r.stage === 2 ? 0.18 : 1 // the camera is close to the upper stage: a smaller blast fills the frame enough
        boom.scale.setScalar((10 + bk * 90) * bf)
        ;(boom.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - bk / 1.6)
        if (bk < 0.5 && !jumped) {
          for (let i = 0; i < 8; i++) {
            const g = 0.18 + prand() * 0.2
            smoke.add({ x: boom.position.x, y: boom.position.y, z: boom.position.z, vx: (prand() - 0.5) * 70 * bf, vy: (prand() - 0.3) * 50 * bf, vz: (prand() - 0.5) * 70 * bf, size: (6 + prand() * 8) * bf, grow: 8 * bf, max: 4 + prand() * 3, a0: 0.8, heat: 1, cool: 0.8, drag: 0.9, lift: 2, rot: prand() * 6, r: g, g: g * 0.95, b: g * 0.9, tile: i % 4 })
          }
        }
      }

      // smoke: pad cloud, the exhaust trail, oxygen venting before ignition
      if (!exploded && !jumped) {
        if (thrust > 0.05 && r.alt < 140 && r.stage === 1) emitPad(thrust, dts, r.alt)
        if (thrust > 0.1 && r.alt > 6 && r.alt < 3200 && !upper) {
          // a continuous trail: puffs placed along the path since the last frame
          const sizeAt = (alt: number) => 4 + alt * 0.022
          const from = lastNozzle ?? nozzleW.clone()
          const seg = nozzleW.distanceTo(from)
          const sp = sizeAt(r.alt) * 0.32
          const n = Math.min(70, Math.floor(seg / sp))
          for (let i = 1; i <= n; i++) {
            const p = tmp.copy(from).lerp(nozzleW, i / n)
            const alt = p.y - 4.8
            const thinA = smooth((alt - 900) / 2200)
            smoke.add({ x: p.x + (prand() - 0.5) * 1.5, y: p.y - 3, z: p.z + (prand() - 0.5) * 1.5, vx: -up.x * 5 + (prand() - 0.5) * 2, vy: -up.y * 5, vz: (prand() - 0.5) * 2, size: sizeAt(alt) * (0.85 + prand() * 0.3), grow: 0.5 + alt * 0.0025, max: 34 + prand() * 10, a0: 0.42 * (1 - thinA * 0.65), heat: 0.55, cool: 1.6, drag: 0.4, rot: prand() * 6, spin: (prand() - 0.5) * 0.05, r: exhaustColor.r, g: exhaustColor.g, b: exhaustColor.b, tile: Math.floor(prand() * 4) })
          }
          if (n > 0 || !lastNozzle) lastNozzle = nozzleW.clone()
        } else lastNozzle = null
        if (time < T.ignition && time > 0.5) {
          ventAcc += dts * 14
          while (ventAcc >= 1) {
            ventAcc -= 1
            for (const vy of [h1 - 3.6, h1 + h2 * 0.55]) {
              const a = Math.PI * 0.75 + (prand() - 0.5) * 0.8
              const p = rocket.localToWorld(tmp.set(Math.cos(a) * R * 1.05, vy, Math.sin(a) * R * 1.05))
              smoke.add({ x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * 2.2, vy: -1.2 - prand(), vz: Math.sin(a) * 2.2, size: 1.2 + prand() * 1.2, grow: 1.4, max: 2.6 + prand(), a0: 0.4, drag: 0.6, lift: -0.6, rot: prand() * 6, r: 1, g: 1, b: 1, tile: Math.floor(prand() * 4) })
            }
          }
        }
      }
      smoke.step(dts, wind)
      for (const c of cloudPuffs) if (c) c.a0 = 0.5 * (1 - r.space * 0.85)

      // ---- the scripted chase camera ----
      const close = clamp((time - T.meco - 0.2 * P) / (2 * Math.sqrt(P)))
      const target = new THREE.Vector3(r.down * 0.9, 25 + r.alt, 0)
      const want = new THREE.Vector3(-70 + r.down * 0.6, 22 + r.alt * 0.92, 130 + r.alt * 0.12)
      if (time < T.liftoff) want.lerp(tmp.set(-58, 18, 108), clamp(time / T.liftoff))
      if (close > 0) {
        const near = rocket.position.clone().addScaledVector(up, h1 + h2 * 0.5)
        target.lerp(near, close)
        want.lerp(near.clone().add(tmp.set(-17, 7, 28)), close) // slightly above, so the Earth's curve shows below
      }
      if (dk > 0) {
        // close-up on the spacecraft while it unfolds its arrays
        const cw = craft.getWorldPosition(new THREE.Vector3())
        const k = Math.min(1, dk * 1.6)
        target.lerp(cw, k)
        want.lerp(cw.clone().add(tmp.set(-busM * 1.2, busM * 1.2, busM * 8.5)), k)
      }
      // smooth the framing (offset from the rocket), not the position: the rocket climbs too fast for a lagging camera
      const wantOff = want.sub(rocket.position)
      if (jumped) camOff.copy(wantOff)
      else camOff.lerp(wantOff, 1 - Math.exp(-dt * 2.5))
      camPos.copy(rocket.position).add(camOff)
      const sh = r.shake * 0.35
      chasePos.set(camPos.x + sh * Math.sin(time * 71), camPos.y + sh * Math.cos(time * 53), camPos.z)
      chaseTarget.copy(target)

      // ---- the main camera: blend between views in the same scene, crossfade to and from the orbit view, cut to the onboard ones ----
      const want3 = views?.main.current ?? 'chase'
      if (want3 !== curView) {
        fromView = curView
        curView = want3
        transAt = now
        const physical = (v: CamView) => v === 'onboard' || v === 'payload'
        transKind = fromView === 'orbit' || curView === 'orbit' ? (composer ? 'fade' : 'cut') : physical(fromView) || physical(curView) ? 'cut' : 'blend'
        if (curView === 'orbit') orbitSince = now
      }
      const te = transKind === 'cut' ? 1 : smooth((now - transAt) / BLEND_MS)
      const e = te * te * (3 - 2 * te)
      if (curView !== 'orbit') applyView(camera, curView, time, r.shake, dt)
      if (transKind === 'blend' && e < 1 && fromView !== 'orbit') {
        prevCam.aspect = camera.aspect
        applyView(prevCam, fromView, time, r.shake, dt)
        camera.position.lerpVectors(prevCam.position, camera.position, e)
        camera.quaternion.slerpQuaternions(prevCam.quaternion, camera.quaternion, e)
        camera.fov = Math.exp(Math.log(prevCam.fov) + (Math.log(camera.fov) - Math.log(prevCam.fov)) * e)
        camera.near = Math.min(prevCam.near, camera.near)
        camera.updateProjectionMatrix()
      }
      camera.updateMatrixWorld()

      // ---- sky, light, Earth ----
      fog.color.copy(fogBase).lerp(black, r.space)
      fog.density = fogDensity * (1 - r.space)
      scene.environmentIntensity = ENV_I * (1 - r.space * 0.6)
      starMat.opacity = Math.max(L.stars, r.space)
      // the Earth turns under the rocket along the ground track (Arequipa at liftoff)
      const route = routeAt(tt, T, orbit)
      const S = trackPoint(site, route.head, route.ang, tmp)
      const A = trackTangent(site, route.head, route.ang, tmp2)
      const Z = A.clone().cross(S)
      mBasis.makeBasis(A, S, Z).transpose()
      earth.group.quaternion.setFromRotationMatrix(mBasis)
      earth.group.position.set(rocket.position.x, rocket.position.y - 150 - EARTH_R, 0)
      const earthSun = sunGeo.clone().applyMatrix4(mBasis)
      if (light === 'dawn') earthSun.add(tmp.set(0, 0.55, 0)).normalize() // morning light under the rocket, the night still in view
      earth.setSun(earthSun)
      const earthK = clamp((r.space - 0.35) / 0.45)
      earth.setOpacity(earthK)
      earth.update(time)
      terrain.group.visible = pad.group.visible = earthK < 0.3
      // above the atmosphere the Sun lights the rocket fully: from the Earth's Sun, turned towards the camera side to read
      const spaceKey = tmp.copy(earthSun).multiplyScalar(0.55).add(tmp2.set(-0.3, 0.45, 0.85).multiplyScalar(0.6)).normalize().multiplyScalar(6000)
      sun.intensity = L.sunI + (2.8 - L.sunI) * r.space
      sun.position.lerpVectors(sunPad, spaceKey, r.space)
      sun.color.setHex(L.sunColor).lerp(white3, r.space)
      // earthshine: in orbit the bright Earth below lights everything from underneath
      hemi.intensity = L.hemi[2] * (1 - r.space) + 1.15 * r.space
      hemi.color.setHex(L.hemi[0]).lerp(spaceSky, r.space)
      hemi.groundColor.setHex(L.hemi[1]).lerp(earthShine, r.space)
      sky.update(camera, r.space, sun.position)

      // ---- smoke lighting for this camera ----
      const sunDirW = tmp.copy(sun.position).normalize()
      smokeLight.sunView.copy(sunDirW).transformDirection(camera.matrixWorldInverse)
      smokeLight.sunlit = light === 'dawn' ? [60 + r.space * -1000, 520] : smokeLight.sunlit
      smokeLight.flameWorld.copy(nozzleW)
      smokeLight.flameI = exploded ? 0 : thrust * (upper ? 0.4 : 2.6) * flick
      smokeLight.fogColor.copy(fog.color)
      smokeLight.space = r.space
      smoke.upload(camera, smokeLight)

      // ---- lens: heat shimmer and haze on the long lens, the onboard glass ----
      const lensWant = lensOf(curView, GROUND_CAM.distanceTo(rocket.position))
      const lensFrom = lensOf(fromView, GROUND_CAM.distanceTo(rocket.position))
      const lk = transKind === 'cut' ? 1 : e
      lensNow.shimmer = lensFrom.shimmer + (lensWant.shimmer - lensFrom.shimmer) * lk
      lensNow.haze = lensFrom.haze + (lensWant.haze - lensFrom.haze) * lk
      lensNow.onboard = lensFrom.onboard + (lensWant.onboard - lensFrom.onboard) * lk
      if (curView === 'orbit' && transKind !== 'blend') lensNow.shimmer = lensNow.haze = lensNow.onboard = curView === 'orbit' && e >= 1 ? 0 : lensNow.onboard
      hazeColor.copy(fog.color).multiplyScalar(1.1)
      lens?.set(lensNow.shimmer * (1 - r.space * 0.5), lensNow.haze * (1 - r.space), hazeColor, lensNow.onboard, now / 1000)

      // ---- render the main view ----
      ov.update(tt)
      const W = el.clientWidth
      const Hh = el.clientHeight
      if (curView === 'orbit') {
        orbitCam.aspect = camera.aspect
        ov.frame(orbitCam, clamp((now - orbitSince) / PULLBACK_MS), W, Hh)
      }
      const mainScene = curView === 'orbit' ? ov.scene : scene
      const mainCam = curView === 'orbit' ? orbitCam : camera
      if (composer && renderPass && fadeFx) {
        const fading = transKind === 'fade' && e < 1
        if (fading) {
          // the outgoing view, live, into a texture the composer blends over the incoming one
          let fromScene: THREE.Scene = scene
          let fromCam: THREE.Camera = prevCam
          if (fromView === 'orbit') {
            fromScene = ov.scene
            fromCam = pipOrbitCam
            pipOrbitCam.aspect = camera.aspect
            ov.frame(pipOrbitCam, 1, W, Hh)
          } else {
            prevCam.aspect = camera.aspect
            applyView(prevCam, fromView, time, r.shake, dt)
            prevCam.updateMatrixWorld()
            smoke.upload(prevCam, smokeLight)
          }
          renderer.setRenderTarget(fadeRT)
          renderer.clear()
          renderer.render(fromScene, fromCam)
          renderer.setRenderTarget(null)
          if (curView === 'orbit') ov.frame(orbitCam, clamp((now - orbitSince) / PULLBACK_MS), W, Hh)
        }
        fadeFx.blendMode.opacity.value = fading ? 1 - e : 0
        renderPass.mainScene = mainScene
        renderPass.mainCamera = mainCam
        composer.render(dt)
      } else renderer.render(mainScene, mainCam)

      // ---- a second live camera in a small window (flight HUD); the booster landing takes it over while it happens ----
      const box = pipBox()
      const lt0 = time - T.meco - 0.4
      const landingNow = !!recovery && !exploded && lt0 >= 0 && lt0 < 6.1
      const pipView = views?.pip?.current
      if (box && pipView && !(landingNow && views?.pipEl)) {
        let pScene: THREE.Scene = scene
        let pCam: THREE.PerspectiveCamera = pipCam
        if (pipView === 'orbit') {
          pipOrbitCam.aspect = box.w / box.h
          ov.frame(pipOrbitCam, 1, box.w, box.h)
          pScene = ov.scene
          pCam = pipOrbitCam
        } else {
          pipCam.aspect = box.w / box.h
          applyView(pipCam, pipView, time, r.shake, dt)
          pipCam.updateMatrixWorld()
          smoke.upload(pipCam, smokeLight)
          sky.update(pipCam, r.space, sun.position)
        }
        renderer.setScissorTest(true)
        renderer.setScissor(box.x, box.y, box.w, box.h)
        renderer.setViewport(box.x, box.y, box.w, box.h)
        renderer.clear()
        renderer.render(pScene, pCam)
        renderer.setScissorTest(false)
        renderer.setViewport(0, 0, el.clientWidth, el.clientHeight)
      }

      // ---- booster-recovery inset: from MECO + 0.4 s for 6 s ----
      const lt = time - T.meco - 0.4
      if (recovery && !exploded && lt >= 0 && lt < 6.1) {
        const st = boosterLandingAt(lt, landed)
        const { b, setLegs, burn, blast, cam, ls } = recovery
        b.visible = !st.crashed
        b.position.set(0, 2.4 + st.y, 0)
        b.rotation.z = st.tilt
        setLegs(st.legs)
        burn.visible = st.burning
        burn.scale.y = 0.8 + 0.4 * Math.abs(Math.sin(time * 37))
        const bk2 = lt - LANDING_TOUCH
        blast.visible = st.crashed && bk2 < 1.6
        blast.position.set(0, 4, 0)
        blast.scale.setScalar(6 + bk2 * 40)
        ;(blast.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - bk2 / 1.5)
        cam.lookAt(0, 14 + Math.min(st.y, 60) * 0.5, 0)
        const Wd = el.clientWidth
        const hud = views?.pipEl ? box : null
        const w = hud ? hud.w : Math.round(Wd * LANDING_INSET.widthFrac)
        const h = hud ? hud.h : Math.round(w * LANDING_INSET.aspect)
        const x = hud ? hud.x : Wd - w - LANDING_INSET.right
        const y = hud ? hud.y : LANDING_INSET.bottom
        if (hud) {
          cam.aspect = w / h
          cam.updateProjectionMatrix()
        }
        renderer.setScissorTest(true)
        renderer.setScissor(x, y, w, h)
        renderer.setViewport(x, y, w, h)
        renderer.clear() // the composer turns the renderer's own clearing off
        renderer.render(ls, cam)
        renderer.setScissorTest(false)
        renderer.setViewport(0, 0, el.clientWidth, el.clientHeight)
      }

      // the stage may be zoomed: keep the pixel ratio matched about once a second
      prCheck += wall
      if (prCheck > 1) {
        prCheck = 0
        const pr = pixelRatio()
        if (Math.abs(pr - renderer.getPixelRatio()) > 0.05) {
          renderer.setPixelRatio(pr)
          resize()
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      // stages and halves may be in the scene or in the rocket: collect everything once
      const geos = new Set<THREE.BufferGeometry>()
      const mats = new Set<THREE.Material>()
      const collect = (root: THREE.Object3D) =>
        root.traverse((o) => {
          const m = o as THREE.Mesh
          if (m.geometry) geos.add(m.geometry)
          const mat = m.material as THREE.Material | THREE.Material[] | undefined
          if (Array.isArray(mat)) mat.forEach((x) => mats.add(x))
          else if (mat) mats.add(mat)
        })
      collect(scene)
      if (recovery) collect(recovery.ls)
      geos.forEach((g) => g.dispose())
      mats.forEach((m) => m.dispose())
      recovery?.textures.forEach((t) => t.dispose())
      recovery?.again?.dispose()
      bin.forEach((d) => d.dispose())
      composer?.dispose()
      renderer.dispose()
      el.removeChild(renderer.domElement)
    }
  }, [launcherId, light, T, tRef, failAt, visual, landed, rocketDesign, views, orbit])
  return <div ref={host} className="absolute inset-0" />
}
