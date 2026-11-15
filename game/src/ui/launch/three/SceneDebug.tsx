import { useEffect, useMemo, useRef } from 'react'
import { getScenario } from '../../../engine/catalog'
import { ROCKET_PRESETS } from '../../../engine/catalog/rocketParts'
import { flySounding } from '../../../engine/sounding'
import { useRocket, type RocketPreset } from '../../../store/rocket'
import { soundingTimeline } from '../../hub/soundingProfile'
import { spacecraftVisual } from '../../spacecraft/visual'
import { makeTimeline } from '../LaunchSequence'
import type { SceneryStyle } from '../LaunchScenery'
import LaunchScene3D, { type CamView, type CameraViews } from './LaunchScene3D'
import type { OrbitTarget } from './earth3d'
import SoundingScene3D from './SoundingScene3D'

/**
 * Developer view of the 3D launch: `?scene3d=heavy&pad=night&t=6` plays the launch from t seconds (loops at the end).
 * `&fail=<seconds>` explodes the rocket then; `&landed=0` loses the booster at sea.
 * `&mission=<scenarioId>&inst=<id,id>&array=deployable&area=6` sets the spacecraft in the fairing (default: Lagrange Observatory with an IR telescope
 * and radio antennas). `?scene3d=paulet&t=12` shows the Paulet-1 prologue instead (`&fail=1` for a failed flight).
 * `?scene3d=custom` launches the rocket on the workbench (Rocket Engineer pad); `&preset=light|medium|reusable_medium|heavy`
 * launches that starting design instead.
 * Cameras: `&view=chase|ground|onboard|payload|orbit` for the main view, `&pip=<view>` for a second view in the corner,
 * `&orbit=leo|sso|gto|tli|tmi` for the target (route direction and ring), `&pace=4` for the flight deck's longer flight,
 * `&switch=orbit@15` to change the main camera at t = 15 s (checks the blends and crossfades).
 */
export default function SceneDebug({ launcherId }: { launcherId: string }) {
  const params = new URLSearchParams(window.location.search)
  const light = (['dawn', 'day', 'night'].includes(params.get('pad') ?? '') ? params.get('pad') : 'day') as SceneryStyle
  const start = Number(params.get('t') ?? 0)
  const T = useMemo(() => makeTimeline(10, Number(params.get('pace') ?? 1)), [])
  const views = useMemo<CameraViews | undefined>(() => (params.has('view') || params.has('pip') ? { main: { current: (params.get('view') ?? 'chase') as CamView }, pip: { current: (params.get('pip') as CamView | null) ?? null }, pipRect: { right: 24, bottom: 24, widthFrac: 0.26, aspect: 0.56 } } : undefined), [])
  const orbit = useMemo(() => (params.has('orbit') ? { target: params.get('orbit') as OrbitTarget } : undefined), [])
  const ST = useMemo(() => soundingTimeline(10), [])
  const sounding = useMemo(() => ({ ...flySounding(['magnetometer'], 3), failed: params.has('fail') }), [])
  const visual = useMemo(() => {
    const base = getScenario(params.get('mission') ?? 'lagrange_observatory').baseDesign
    const ids = (params.get('inst') ?? 'ir_telescope,radio_array').split(',').filter(Boolean)
    const array = params.get('array') // body | deployable | tracking, with `&area=` m²
    const arrays = array ? { arrayId: array, arrayAreaM2: Number(params.get('area') ?? 6) } : {}
    return spacecraftVisual({ ...base, ...arrays, instruments: ids.map((id) => ({ id, duty: 0.1 })) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const preset = params.get('preset') ?? ''
  const workbench = useRocket((s) => s.design)
  const rocket = launcherId === 'custom' ? (preset in ROCKET_PRESETS ? ROCKET_PRESETS[preset as RocketPreset] : workbench) : undefined
  const tRef = useRef(start)
  useEffect(() => {
    let prev = performance.now()
    let raf = 0
    const tick = (now: number) => {
      tRef.current += (now - prev) / 1000
      prev = now
      const sw = params.get('switch')?.split('@')
      if (sw && views && tRef.current >= Number(sw[1])) views.main.current = sw[0] as CamView
      if (tRef.current > (launcherId === 'paulet' ? ST.end + 2 : T.seco + 6)) tRef.current = start
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [T, ST, start, launcherId])
  return (
    <div className="fixed inset-0 bg-black">
      {launcherId === 'paulet' ? <SoundingScene3D T={ST} tRef={tRef} result={sounding} /> : <LaunchScene3D launcherId={launcherId} light={light} T={T} tRef={tRef} failAt={params.has('fail') ? Number(params.get('fail')) : null} visual={visual} landed={params.get('landed') !== '0'} rocket={rocket} views={views} orbit={orbit} />}
    </div>
  )
}
