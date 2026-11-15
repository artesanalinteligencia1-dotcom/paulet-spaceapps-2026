// NASA data and resources behind the game (criterion "Relevance"): what each source is, where it is used in the game
// and a link. Only what the game really uses is listed as "used"; the rest of the challenge's resources are listed as
// further reading. URLs checked on 2026-11-15. Text only: no NASA logos or insignia anywhere in the game.

export type SourceKind = 'data' | 'method' | 'challenge' | 'reading'
type Bi = { en: string; es: string }

export interface NasaSource {
  id: string
  title: string
  publisher: string
  url: string
  kind: SourceKind
  /** what the game takes from it */
  used: Bi
  /** where in the game */
  where: Bi[]
}

const W = {
  deck: { en: 'Launch flight deck', es: 'Cabina de lanzamiento' },
  map: { en: 'Flight deck · Map view', es: 'Cabina · vista Mapa' },
  orbit: { en: 'Orbit & Launch tab', es: 'Pestaña Órbita y lanzamiento' },
  comms: { en: 'Ground & Comms tab', es: 'Pestaña Tierra y comunicaciones' },
  spacecraft: { en: 'Spacecraft tab', es: 'Pestaña Nave' },
  review: { en: 'Review tab', es: 'Pestaña Revisión' },
  trade: { en: 'Trade study', es: 'Trade study' },
  workbench: { en: 'Rocket workbench', es: 'Taller del cohete' },
  learnRocket: { en: 'Learn · Rockets', es: 'Aprender · Cohetes' },
  learnStaging: { en: 'Learn · Staging', es: 'Aprender · Etapas' },
  learnOrbit: { en: 'Learn · Orbits', es: 'Aprender · Órbitas' },
  mars: { en: 'Act 3 · Mars missions', es: 'Acto 3 · misiones a Marte' },
  redHorizon: { en: 'Red Horizon (orbiter)', es: 'Red Horizon (orbitador)' },
  stranded: { en: 'Stranded (landing)', es: 'Stranded (aterrizaje)' },
  oxygen: { en: 'Breathing Mars (oxygen)', es: 'Breathing Mars (oxígeno)' },
  tabs: { en: 'The six design steps', es: 'Los seis pasos del diseño' },
}

export const NASA_SOURCES: NasaSource[] = [
  {
    id: 'blue-marble',
    title: 'Blue Marble: Next Generation (topography and bathymetry, July 2004)',
    publisher: 'NASA Earth Observatory',
    url: 'https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/',
    kind: 'data',
    used: { en: 'The daytime Earth on the flight-deck map and globes (real satellite imagery).', es: 'La Tierra de día en el mapa y los globos de la cabina (imagen satelital real).' },
    where: [W.map, W.deck],
  },
  {
    id: 'black-marble',
    title: 'Earth at Night — Black Marble 2016',
    publisher: 'NASA Earth Observatory',
    url: 'https://science.nasa.gov/earth/earth-observatory/earth-at-night/',
    kind: 'data',
    used: { en: 'City lights on the night side of the Earth, past the dawn line over Peru.', es: 'Las luces de las ciudades en el lado nocturno de la Tierra, pasado el amanecer sobre Perú.' },
    where: [W.map],
  },
  {
    id: 'nssdca-earth',
    title: 'Earth Fact Sheet',
    publisher: 'NASA NSSDCA (Goddard)',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html',
    kind: 'data',
    used: { en: "Earth's GM (μ = 398 600 km³/s²) and radius: orbital speed √(μ/r) and periods in the flight deck and the orbit choices.", es: 'GM de la Tierra (μ = 398 600 km³/s²) y su radio: velocidad orbital √(μ/r) y periodos en la cabina y las órbitas.' },
    where: [W.deck, W.orbit],
  },
  {
    id: 'glenn-rocket-eq',
    title: "Ideal Rocket Equation — Beginner's Guide to Aeronautics",
    publisher: 'NASA Glenn Research Center',
    url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/',
    kind: 'method',
    used: { en: 'Δv = Isp · g₀ · ln(m₀/m_f) for every stage and for the spacecraft propellant.', es: 'Δv = Isp · g₀ · ln(m₀/m_f) para cada etapa y para el propelente de la nave.' },
    where: [W.workbench, W.spacecraft, W.learnRocket, W.deck],
  },
  {
    id: 'glenn-isp',
    title: "Specific Impulse — Beginner's Guide to Aeronautics",
    publisher: 'NASA Glenn Research Center',
    url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/specific-impulse/',
    kind: 'method',
    used: { en: 'How efficient each engine is (Isp in seconds), which sets the propellant you need.', es: 'Qué tan eficiente es cada motor (Isp en segundos), que define el propelente necesario.' },
    where: [W.workbench, W.learnRocket],
  },
  {
    id: 'glenn-staging',
    title: "Multistage Rockets — Beginner's Guide to Aeronautics",
    publisher: 'NASA Glenn Research Center',
    url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/stage/',
    kind: 'method',
    used: { en: 'Why rockets drop empty stages, and how the stage Δv adds up.', es: 'Por qué los cohetes sueltan etapas vacías y cómo se suma el Δv de cada etapa.' },
    where: [W.workbench, W.learnStaging, W.deck],
  },
  {
    id: 'jpl-basics',
    title: 'Basics of Space Flight',
    publisher: 'NASA / JPL',
    url: 'https://science.nasa.gov/learn/basics-of-space-flight/',
    kind: 'method',
    used: { en: 'Orbits and transfers, the Mars launch window every 25.6 months, radio delay and solar conjunction.', es: 'Órbitas y transferencias, la ventana a Marte cada 25,6 meses, el retardo de radio y la conjunción solar.' },
    where: [W.orbit, W.comms, W.mars, W.learnOrbit],
  },
  {
    id: 'nssdca-mars',
    title: 'Mars Fact Sheet',
    publisher: 'NASA NSSDCA (Goddard)',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
    kind: 'data',
    used: { en: "Mars' gravity, atmosphere and distance from the Sun for the Act 3 missions.", es: 'La gravedad, atmósfera y distancia al Sol de Marte para las misiones del Acto 3.' },
    where: [W.mars],
  },
  {
    id: 'mro',
    title: 'Mars Reconnaissance Orbiter',
    publisher: 'NASA Science',
    url: 'https://science.nasa.gov/mission/mars-reconnaissance-orbiter/',
    kind: 'data',
    used: { en: 'Orbit insertion and aerobraking: dipping into the upper atmosphere to lower the orbit (2006).', es: 'Inserción orbital y aerofrenado: rozar la alta atmósfera para bajar la órbita (2006).' },
    where: [W.redHorizon],
  },
  {
    id: 'mars-edl',
    title: 'Mars 2020 Perseverance, Curiosity, Phoenix and Pathfinder landings',
    publisher: 'NASA Science',
    url: 'https://science.nasa.gov/mission/mars-2020-perseverance/',
    kind: 'data',
    used: { en: 'Entry, descent and landing: heat shield, parachute and retrorockets, and why heavy landers are hard.', es: 'Entrada, descenso y aterrizaje: escudo térmico, paracaídas y retrocohetes, y por qué aterrizar algo pesado es difícil.' },
    where: [W.stranded],
  },
  {
    id: 'moxie',
    title: 'MOXIE — Mars Oxygen In-Situ Resource Utilization Experiment',
    publisher: 'NASA Science (Mars 2020)',
    url: 'https://science.nasa.gov/mission/mars-2020-perseverance/science-instruments/',
    kind: 'data',
    used: { en: 'Oxygen made from Martian CO₂: up to 12 g per hour, 122 g in all (2021–2023), scaled up for a crew.', es: 'Oxígeno hecho del CO₂ de Marte: hasta 12 g por hora, 122 g en total (2021–2023), escalado para una tripulación.' },
    where: [W.oxygen],
  },
  {
    id: 'se-handbook',
    title: 'NASA Systems Engineering Handbook',
    publisher: 'NASA',
    url: 'https://www.nasa.gov/reference/systems-engineering-handbook/',
    kind: 'method',
    used: { en: 'Mass and power margins, and a design review that must pass before launch.', es: 'Márgenes de masa y energía, y una revisión de diseño que debe aprobarse antes de lanzar.' },
    where: [W.spacecraft, W.review],
  },
  {
    id: 'design-science-missions',
    title: 'Design and Develop Science Missions',
    publisher: 'NASA (challenge resource)',
    url: 'https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf',
    kind: 'challenge',
    used: { en: 'The design steps follow the mission segments: payload, space, launch, ground and the people who use the data.', es: 'Los pasos del diseño siguen los segmentos de una misión: carga útil, espacio, lanzamiento, tierra y quienes usan los datos.' },
    where: [W.tabs],
  },
  {
    id: 'mdl',
    title: 'Mission Design Lab (MDL)',
    publisher: 'NASA Goddard (challenge resource)',
    url: 'https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/',
    kind: 'challenge',
    used: { en: 'The trade study: save two options and compare them side by side, as a design lab does.', es: 'El trade study: guardar dos opciones y compararlas lado a lado, como hace un laboratorio de diseño.' },
    where: [W.trade, W.review],
  },
  {
    id: 'cml',
    title: 'Concept Maturity Levels (CMLs)',
    publisher: 'NASA JPL (challenge resource)',
    url: 'https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299',
    kind: 'reading',
    used: { en: 'How a mission idea matures, step by step, before it is built.', es: 'Cómo madura la idea de una misión, paso a paso, antes de construirla.' },
    where: [],
  },
  {
    id: 'gmat',
    title: 'General Mission Analysis Tool (GMAT)',
    publisher: 'NASA Goddard (challenge resource)',
    url: 'https://software.nasa.gov/software/GSC-19468-1',
    kind: 'reading',
    used: { en: 'The professional tool for trajectories, for anyone who wants to go further.', es: 'La herramienta profesional de trayectorias, para quien quiera ir más allá.' },
    where: [],
  },
  {
    id: 'mission-viz',
    title: 'NASA Mission Viz',
    publisher: 'NASA (challenge resource)',
    url: 'https://nasa.github.io/mission-viz/',
    kind: 'reading',
    used: { en: 'See real missions in 3D.', es: 'Ver misiones reales en 3D.' },
    where: [],
  },
  {
    id: 'cubesat-101',
    title: 'CubeSat 101 — Basic Concepts and Processes for First-Time CubeSat Developers',
    publisher: 'NASA CubeSat Launch Initiative (challenge resource)',
    url: 'https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf',
    kind: 'reading',
    used: { en: 'A first real satellite, from idea to orbit.', es: 'Un primer satélite real, de la idea a la órbita.' },
    where: [],
  },
  {
    id: 'webb-game',
    title: 'A Learning Game About Telescopes',
    publisher: 'NASA Webb (challenge resource)',
    url: 'https://science.nasa.gov/mission/webb/game-build-it-yourself/',
    kind: 'reading',
    used: { en: 'Build your own space telescope.', es: 'Construye tu propio telescopio espacial.' },
    where: [],
  },
]

export const nasaSource = (id: string) => NASA_SOURCES.find((s) => s.id === id)

/** The sources behind each design tab (plus the mission's own: Mars data, landing, oxygen, aerobraking). */
export function sourcesForTab(tab: string, scenarioId: string): string[] {
  const byTab: Record<string, string[]> = {
    mission: ['design-science-missions'],
    payload: [],
    spacecraft: ['se-handbook', 'glenn-rocket-eq'],
    orbit: ['jpl-basics', 'nssdca-earth'],
    comms: ['jpl-basics'],
    review: ['se-handbook', 'mdl'],
  }
  const ids = [...(byTab[tab] ?? [])]
  if (scenarioId.startsWith('mars')) {
    if (tab === 'orbit') ids.push('nssdca-mars')
    if (scenarioId === 'mars_orbiter' && (tab === 'orbit' || tab === 'mission')) ids.push('mro')
    if (scenarioId === 'mars_stranded' && (tab === 'payload' || tab === 'mission')) ids.push('mars-edl')
    if (scenarioId === 'mars_oxygen' && (tab === 'payload' || tab === 'mission')) ids.push('moxie')
  }
  return [...new Set(ids)]
}
