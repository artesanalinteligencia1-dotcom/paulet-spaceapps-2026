# Paulet: Andes to Orbit — game

The game itself (React + TypeScript + Vite). See the [main README](../README.md) for what it is and how to play.

```bash
npm ci
npm run dev        # http://localhost:5173
npm test           # vitest
npm run build      # production build (installable, offline after the first visit)
```

- `src/engine/` — pure, deterministic simulation (design evaluation, launch, mission, events, score, report);
  formulas and constants in [`docs/model.md`](docs/model.md).
- `src/ui/` — screens; `src/store/` — game, team and online state; `src/online/` — rooms (Firebase Realtime Database,
  or `?roomBackend=local` to test between tabs of one browser).
- `src/i18n/strings/` — English and Spanish texts.
- `public/videos/` — the films with English and Spanish subtitles; `public/deck/` — the 7-slide demo.
- Online rooms need the `VITE_FIREBASE_*` variables (see `.env.example`).

Credits: [`CREDITS.md`](CREDITS.md). License: MIT ([`LICENSE`](LICENSE)).
