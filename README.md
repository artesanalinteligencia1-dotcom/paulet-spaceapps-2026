# Paulet: Andes to Orbit

A free, browser-based **Space Mission Design Game** for one to four players, made by team **Paulet Delta-V** for the
NASA Space Apps Challenge 2026 (challenge: *Space Mission Design Game*).

- **Play:** https://paulet-spaceapps-2026.vercel.app (English and Spanish, no account, works offline after the first visit;
  on phones and tablets it plays in landscape)
- **Demo (7 slides):** https://paulet-spaceapps-2026.vercel.app/deck/

## The game
You are Dr. Pedro Goicochea, a fictional Peruvian physicist who sets out to finish what the Peruvian pioneer Pedro Paulet
claimed to have started in the 1890s: a liquid-fuel rocket engine. Guided by Kuntur, a condor robot, your team designs a
whole mission (objective, spacecraft, instruments, orbit and launcher), negotiates a shared budget, votes on the design,
launches it in a 3D flight deck and flies it through a seeded simulation with random events. Every choice moves at
least two resources (mass, power, data, budget, schedule and lifetime), and the final report explains why the mission
worked or failed.

## How to play
- **New career:** fly the Paulet-1 sounding rocket, then take contracts from investors across four acts.
- **Free mission:** pick any mission and design it alone or as a team on one screen.
- **Play online:** create a room, share the link with up to three friends; each player takes a role (Mission Director,
  Spacecraft Engineer, Astrophysicist, Astrobiologist), votes in the design review and decides the in-flight events of
  their own role. The Mission Director launches for everyone.
- **Learn** and **NASA data:** the physics behind the game and the NASA sources it uses.

## Run it locally
```bash
cd game
npm ci
npm run dev      # http://localhost:5173
npm test         # engine and game-logic tests
npm run build
```
The code is in [`game/`](game/): a pure, deterministic simulation engine in `game/src/engine/` (formulas in
[`game/docs/model.md`](game/docs/model.md)) and the React interface in `game/src/ui/`.

## NASA sources
NASA Earth Observatory (Blue Marble and Black Marble textures), NSSDCA Earth and Mars Fact Sheets, NASA Glenn
*Beginner's Guide to Aeronautics* (rocket equation, specific impulse, staging), NASA Science *Basics of Space Flight*,
Mars Reconnaissance Orbiter, Perseverance, Curiosity, Phoenix, Pathfinder and MOXIE, the *NASA Systems Engineering
Handbook*, and the challenge resources (Design and Develop Science Missions, JPL Concept Maturity Levels, Goddard
Mission Design Lab, GMAT, NASA Mission Viz, CubeSat 101). Each is cited inside the game. No NASA logos or insignia are used.

## Credits and use of AI
The idea, story, characters, game design and creative decisions are the team's. AI tools helped produce it:
the code was written with Claude Code (Anthropic) and reviewed and tested by the team; illustrations and video clips
were generated with Google Gemini and Veo and are marked "AI-generated"; the songs were generated locally with the
open ACE-Step 1.5 model from lyrics we wrote; film voices use Kokoro (local); some loops and sound effects were made with
ElevenLabs. Full list in [`game/CREDITS.md`](game/CREDITS.md).

The game values are a simplified educational model, not real engineering data. Pedro Goicochea and the other
characters are fictional; Pedro Paulet's 1890s engine tests are his own claims.

## License
MIT — see [`game/LICENSE`](game/LICENSE).
