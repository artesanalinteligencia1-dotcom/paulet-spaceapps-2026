import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { toggleFullscreen } from '../platform/desktop'
import { useGame } from '../store/game'
import { useReducedMotion } from '../store/settings'
import { DesignScreen } from './DesignScreen'
import { FlightScreen } from './FlightScreen'
import { LaunchScreen } from './LaunchScreen'
import { ResultsScreen } from './ResultsScreen'
import { ScenarioSelect } from './ScenarioSelect'
import { SoundToggle } from './SoundToggle'
import { CampaignScreen } from './hub/CampaignScreen'
import { FirstLightScreen } from './hub/FirstLightScreen'
import { HomeScreen, MenuBackdrop } from './hub/HomeScreen'
import { IntroScreen } from './hub/IntroScreen'
import { LearnScreen } from './hub/LearnScreen'
import { GuideDock } from './guide/GuideDock'
import { JoinRoom } from './online/OnlinePanel'
import { NextProposal } from './online/NextProposal'
import { startOnlinePush } from '../store/online'
import { MockScreen, mockFromUrl } from './mock/MockScreen'
import { useT } from '../i18n'
import { RocketScreen } from './rocket/RocketScreen'
import { AstroScreen } from './astro/AstroScreen'
import { BootScreen } from './shell/BootScreen'
import { SettingsPanel } from './shell/SettingsPanel'
import { Stage } from './shell/Stage'

function CurrentScreen() {
  const design = useGame((s) => s.design)
  const screen = useGame((s) => s.screen)
  const mission = useGame((s) => s.mission)
  const campaign = useGame((s) => s.campaign)
  switch (screen) {
    case 'home':
      return <HomeScreen />
    case 'campaign':
      return campaign ? <CampaignScreen /> : <HomeScreen />
    case 'free':
      return <ScenarioSelect />
    case 'intro':
      return <IntroScreen />
    case 'learn':
      return <LearnScreen />
    case 'firstlight':
      return <FirstLightScreen />
    case 'rocket':
      return <RocketScreen />
    case 'astro':
      return <AstroScreen />
    default:
      break
  }
  if (!design) return <HomeScreen />
  if (screen === 'launch') return <LaunchScreen />
  if (screen === 'flight' && mission) return <FlightScreen />
  if (screen === 'results' && mission) return <ResultsScreen />
  return <DesignScreen design={design} />
}

const MOCK = mockFromUrl()

export function App() {
  const t = useT()
  const screen = useGame((s) => s.screen)
  const settingsOpen = useGame((s) => s.settingsOpen)
  const openSettings = useGame((s) => s.openSettings)
  const reduce = useReducedMotion()
  const [booted, setBooted] = useState(false)
  const start = useCallback(() => setBooted(true), [])

  useEffect(() => startOnlinePush(), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault()
        void toggleFullscreen()
      } else if (e.key === 'Escape' && booted && !document.querySelector('[role="dialog"]:not(#settings-dialog)')) {
        openSettings(!useGame.getState().settingsOpen)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [booted, openSettings])

  if (MOCK) {
    return (
      <Stage>
        <MockScreen n={MOCK} />
      </Stage>
    )
  }

  return (
    <Stage>
      <div className={`hud relative h-full ${reduce ? 'reduce-motion' : ''}`}>
        {/* The launch site, blurred and darkened, sits behind every screen except the menu (which shows it sharp). */}
        {booted && screen !== 'home' && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute inset-0 scale-110 blur-md">
              <MenuBackdrop />
            </div>
            <div className="mc-grid absolute inset-0 opacity-[0.93]" />
          </div>
        )}
        {!booted ? (
          <BootScreen onStart={start} />
        ) : (
          <>
            {/* screen changes: the old view blurs away, the new one comes into focus, a scan line sweeps the frame */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={screen}
                className="stage-scroll relative h-full overflow-y-auto"
                initial={reduce ? false : { opacity: 0, y: 12, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] }, transitionEnd: { filter: 'none', transform: 'none' } }}
                exit={reduce ? undefined : { opacity: 0, scale: 0.985, filter: 'blur(6px)', transition: { duration: 0.2, ease: 'easeIn' } }}
              >
                <CurrentScreen />
              </motion.div>
            </AnimatePresence>
            {!reduce && <div key={`wipe-${screen}`} className="screen-wipe pointer-events-none absolute inset-x-0 top-0 z-30 h-[2px]" aria-hidden="true" />}
            {/* sound and settings: in a corner, except on the flight deck, which has them in its header */}
            {screen !== 'launch' && (
            <div data-box="corner-buttons" className="absolute bottom-4 right-4 z-40 flex gap-2">
              <SoundToggle />
              <button
                type="button"
                onClick={() => openSettings(true)}
                className="btn-secondary h-9 w-9 text-sm"
                aria-label={t('settings.title')}
                title={t('settings.titleEsc')}
              >
                ⚙
              </button>
            </div>
            )}
            <GuideDock />
            <JoinRoom />
            <NextProposal />
            {settingsOpen && <SettingsPanel onClose={() => openSettings(false)} />}
          </>
        )}
      </div>
    </Stage>
  )
}
