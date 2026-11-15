import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource/barlow-condensed/400.css'
import '@fontsource/barlow-condensed/500.css'
import '@fontsource/barlow-condensed/600.css'
import './index.css'
import { App } from './ui/App'
import { setupOffline } from './platform/offline'
import { useSettings } from './store/settings'
import { useGame } from './store/game'

document.documentElement.lang = useSettings.getState().language

void setupOffline()

// development only: lets the browser console (and automated checks) jump between screens
if (import.meta.env.DEV) {
  ;(window as unknown as { __game: typeof useGame }).__game = useGame
  void import('./ui/dev/overlapAudit').then((m) => ((window as unknown as { __overlapAudit: typeof m.overlapAudit }).__overlapAudit = m.overlapAudit))
}

// Renderer prototypes (?proto=pixi | three) load on demand so the game bundle stays the same.
const proto = new URLSearchParams(window.location.search).get('proto')
const ProtoScreen = lazy(() => import('./ui/proto/ProtoScreen'))

const FlightHud = lazy(() => import('./ui/proto/FlightHud'))

const scene3d = new URLSearchParams(window.location.search).get('scene3d')
const SceneDebug = lazy(() => import('./ui/launch/three/SceneDebug'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {scene3d ? (
      <Suspense fallback={null}>
        <SceneDebug launcherId={scene3d} />
      </Suspense>
    ) : proto === 'flight' ? (
      <Suspense fallback={null}>
        <FlightHud />
      </Suspense>
    ) : proto === 'pixi' || proto === 'three' ? (
      <Suspense fallback={null}>
        <ProtoScreen kind={proto} />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
