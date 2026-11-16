import { useOnline } from '../store/online'
import { launcherOf } from '../online/room'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { prefersReducedMotion } from '../store/settings'
import { audio, useMusic } from '../audio/audio'
import { getOrbit, getScenario } from '../engine/catalog'
import { resolveLauncher } from '../engine/launch'
import { evaluateDesign } from '../engine/evaluate'
import { fmt } from '../i18n/en'
import { randomSeed, useGame } from '../store/game'
import { LaunchSequence, type LaunchOutcome } from './launch/LaunchSequence'
import { SpacecraftSprite } from './spacecraft/SpacecraftSprite'
import { useT, useTx } from '../i18n'

type Phase = 'ready' | 'flying' | 'success' | 'failure'

export function LaunchScreen() {
  const design = useGame((s) => s.design)!
  const seed = useGame((s) => s.seed)
  const challenge = useGame((s) => s.challenge)
  const setSeed = useGame((s) => s.setSeed)
  const launch = useGame((s) => s.launch)
  const startFlight = useGame((s) => s.startFlight)
  const showResults = useGame((s) => s.showResults)
  const backToDesign = useGame((s) => s.backToDesign)
  const mission = useGame((s) => s.mission)
  const t = useT()
  const tx = useTx()
  const scenario = getScenario(design.scenarioId)
  const report = useMemo(() => evaluateDesign(design, scenario), [design, scenario])
  const launcher = resolveLauncher(design)
  const orbit = getOrbit(design.orbitId)
  const [phase, setPhase] = useState<Phase>('ready')
  const [skip, setSkip] = useState(false)
  // Silence during the countdown so mission control is heard; music B starts at liftoff (LaunchSequence).
  useMusic(phase === 'ready' ? 'design' : phase === 'success' ? 'launch' : 'none')

  const failed = mission?.endReason === 'launch_failure'
  const go = () => {
    launch()
    audio.unlock()
    setSkip(prefersReducedMotion())
    setPhase('flying')
  }
  const onDone = useCallback((o: LaunchOutcome) => setPhase(o), [])
  // online: the host's launch reaches every device; the countdown starts by itself
  const autoLaunch = useOnline((st) => st.autoLaunch)
  const onlineRoom = useOnline((st) => st.room)
  const canLaunch = !onlineRoom || launcherOf(onlineRoom) === useOnline.getState().me
  const directorName = onlineRoom ? onlineRoom.players?.[launcherOf(onlineRoom)]?.name ?? '' : ''
  useEffect(() => {
    if (autoLaunch && phase === 'ready') {
      useOnline.getState().consumeAutoLaunch()
      go()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLaunch, phase])

  const ready = (
    <div className="deck-panel w-[660px]">
      <header className="deck-head">
        <h2>{t('launch.title', { name: tx(`scenario.${scenario.id}.name`, scenario.name) })}</h2>
        <span className="text-[12px] uppercase tracking-[0.14em] text-[#8a8f98]">{t('launch.seedRule')}</span>
      </header>
      {challenge && challenge.scenarioId === design.scenarioId && (
        <p className={`mx-3 mt-2 border px-2 py-1 text-sm ${challenge.seed === seed ? 'border-violet-400/50 text-violet-200' : 'border-amber-400/50 text-amber-200'}`}>
          {challenge.seed === seed ? t('challenge.active', { name: challenge.name || t('challenge.anon'), score: challenge.score }) : t('challenge.seedChanged', { seed: challenge.seed })}
        </p>
      )}
      <div className="flex items-center gap-4 px-3 py-2">
        <div className="shrink-0 rounded bg-black/40 p-1">
          <SpacecraftSprite design={design} size={64} deployed={false} />
        </div>
        <dl className="grid flex-1 grid-cols-4 gap-x-3 gap-y-0.5 text-[14px]">
          <dt className="text-[#8a8f98]">{t('launch.wetMass')}</dt>
          <dd>{fmt(report.mass.wetKg)} kg</dd>
          <dt className="text-[#8a8f98]">{t('launch.capacity')}</dt>
          <dd>{fmt(report.mass.capacityKg)} kg</dd>
          <dt className="text-[#8a8f98]">{t('launch.reliability')}</dt>
          <dd>{fmt(launcher.reliability * 100)}%</dd>
          <dt className="text-[#8a8f98]">{t('dashboard.risk.label')}</dt>
          <dd>{fmt(report.risk.successProbability * 100)}%</dd>
          <dt className="text-[#8a8f98]">{t('launch.target')}</dt>
          <dd className="truncate">{tx(`component.${orbit.id}.name`, orbit.name)}</dd>
          <dt className="text-[#8a8f98]">{t('launch.plannedLife')}</dt>
          <dd>{fmt(design.designLifeYears, 1)} yr</dd>
        </dl>
      </div>
      <div className="flex items-center gap-2 border-t border-[#3a3f47] px-3 py-2">
        <label className="flex items-center gap-2 text-[13px] uppercase tracking-wider text-[#8a8f98]">
          {t('launch.missionSeed')}
          <input type="number" className="w-28 border border-[#3a3f47] bg-[#0d0f12] px-2 py-1 font-mono text-[#e8e0cc]" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
        </label>
        <button type="button" className="deck-btn" onClick={() => setSeed(randomSeed())} aria-label={t('launch.randomSeed')}>
          🎲
        </button>
        {onlineRoom && !canLaunch ? (
          <span className="ml-auto text-[15px] text-amber-200">{t('online.waitingDirector', { name: directorName })}</span>
        ) : (
        <button type="button" onClick={onlineRoom ? () => useOnline.getState().launchTogether() : go} disabled={!!onlineRoom && onlineRoom.review?.result !== 'passed'} className="btn-primary ml-auto px-8 py-2.5 text-xl disabled:opacity-40">
          {t('launch.launchBtn')}
        </button>
        )}
      </div>
    </div>
  )

  const outcome =
    phase === 'success' ? (
      <div className="deck-panel flex w-[560px] items-center gap-4 px-4 py-3">
        <div>
          <div className="text-[13px] uppercase tracking-[0.16em] text-[#d9b46a]">{t('launch.stage.orbit')}</div>
          <div className="text-[22px]">{tx(`scenario.${scenario.id}.name`, scenario.name)}</div>
        </div>
        <button type="button" onClick={startFlight} className="btn-primary ml-auto px-6 py-3 text-lg">
          {t('launch.startMission')}
        </button>
      </div>
    ) : phase === 'failure' ? (
      <div className="deck-panel flex w-[560px] items-center gap-4 px-4 py-3">
        <div className="text-[18px] uppercase tracking-[0.12em] text-[#ff3d7f]">Vehicle lost</div>
        <button type="button" onClick={showResults} className="btn-secondary ml-auto px-6 py-3 text-lg">
          {t('launch.seeReport')}
        </button>
      </div>
    ) : undefined

  return (
    <main className="absolute inset-0 overflow-hidden">
      <LaunchSequence
        deck
        design={design}
        running={phase !== 'ready'}
        failed={failed}
        seed={seed}
        onDone={onDone}
        skipTo={skip}
        boosterLanded={mission?.boosterLanded ?? null}
        prelaunch={ready}
        outcome={outcome}
        onSkip={() => setSkip(true)}
        onBack={backToDesign}
      />
    </main>
  )
}
