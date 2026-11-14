# HANDOFF — Paulet Delta-V · NASA Space Apps Challenge 2026

> **Léelo primero.** Este archivo es la memoria compartida del proyecto. El dueño trabaja desde varias cuentas y sesiones de
> Claude que no comparten historial: todo lo que hay que saber está aquí. **Al terminar cada tarea:** pásala a "Hecho" con
> fecha, actualiza "Pendiente" y "Siguiente paso exacto", y haz commit.
> Explicaciones al dueño en español; código, textos del juego y entrega en inglés.

Última actualización: 2026-11-14 (tarde).

---

## 1. Qué es
- **Equipo:** Paulet Delta-V. **Reto:** [Space Mission Design Game](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/)
  (dificultad Intermedia y Principiante/Juvenil, tema Juegos).
- **Qué piden:** un juego interactivo donde de 1 a 4 personas diseñan, gestionan y simulan una misión completa (objetivo,
  nave, instrumentos, lanzador, órbita, presupuesto, potencia, masa, comunicaciones, datos, vida útil), viendo cómo cada
  decisión afecta a las demás, con simulación, evaluación y explicación de por qué la misión funcionó o falló.
- **Nuestra propuesta:** una versión nueva para el concurso de *Paulet: Andes to Orbit*. Las ideas creativas son del dueño;
  se reutilizan el conocimiento y los recursos de la primera versión, declarados en Referencias.
- **Este repositorio** (`artesanalinteligencia1-dotcom/paulet-spaceapps-2026`, privado) es el del concurso.
  Hacerlo público antes de entregar si el enlace del proyecto final apunta aquí.
- **Dónde vive hoy el código del juego (2026-11-14):** en `artesanalinteligencia1-dotcom/PP.game`, rama `cloud/fase-1`,
  clon `C:\PPgame\PP.game`, último commit `c58b78b`. **Ojo:** los 4 últimos commits (`b4a191d`, `1cf10ed`, `8937f2f`,
  `c58b78b`) están solo en la PC del dueño hasta que él haga `git push origin cloud/fase-1` desde su terminal.
  **Decidido el 2026-11-14: el código del concurso vive en este repo, en `game/`.** Se trajo ese estado (commit
  `c58b78b` de PP.game) como base declarada; todo lo nuevo del concurso se hace aquí. Cómo correrlo: `cd game`,
  `npm ci`, `npm run dev` (puerto 5173), `npm test`. El historial y los documentos técnicos de la base están en
  `game/PROGRESS.md`, `game/DECISIONS.md`, `game/docs/model.md` y `game/HANDOFF.md` (este último es el de la primera
  versión; para el concurso manda este archivo).

## 2. Fechas (hora del evento local del equipo)
| Cuándo | Qué |
|---|---|
| Sáb 14 nov 2026, 9:00 | Abre la entrega: aparece la pestaña "Project" en la página del equipo |
| Dom 15 nov 2026, 23:59 | **Cierre.** Lo no enviado con "Submit for Judging" no se evalúa |
| 3 dic 2026 | Nominados globales |
| 17 dic 2026 | Finalistas globales y menciones |
| 26 ene 2027 | Ganadores globales |

## 3. Reglas de la entrega (de las guías oficiales, leídas el 2026-11-14)
- Guías: [Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/) ·
  [Judging & Awards Guide](https://www.spaceappschallenge.org/resources/judging-awards-guide/).
- Equipo de 1 a 6, todos inscritos y confirmados en el **mismo evento local** (no en lista de espera).
- Campos: nombre, resumen, **enlace a la demo**, **enlace al proyecto final** (público, sin contraseña ni registro),
  descripción detallada, uso de IA ("Super Intelligence"), **datos de NASA usados** (mínimo uno para premio global),
  otras referencias (todo código, texto, imagen o dato externo, aunque sea abierto).
- **Demo = diapositivas** (decidido): máximo **7**, contando título e intro, en inglés. Si se pasa, queda fuera de la evaluación global.
  Debe mostrar: nombre del equipo, integrantes, reto, imagen del proyecto, experiencia del usuario, cómo los datos de NASA lo hacen posible.
- Todo en inglés (página y materiales enlazados).
- **IA:** imágenes y videos generados llevan **marca de agua visible**; audio, código y datos generados se declaran en el texto
  y en los metadatos. La IA no debe usarse para concebir la idea de solución.
- **Nada de logos, banderas ni identificadores de misión de NASA** en contenido generado.
- **Nada de imágenes, video, audio ni semejanza de menores de 18** en la demo ni en el proyecto.
- Sin material con derechos de autor sin permiso. Imágenes subidas a la página: JPG/PNG/GIF hasta 10 MB; videos y documentos solo por enlace.
- Si el juego vive en un dominio nuevo, pedir la clasificación de FortiGuard (opcional) para que los filtros de los jueces no lo bloqueen.
- Se puede guardar y reenviar todas las veces que se quiera antes del cierre; vale el último envío.

## 4. Cómo juzgan (1 a 5 cada uno)
| Criterio | Qué premia | Nuestro ángulo |
|---|---|---|
| Impact | Tamaño del problema y alcance | Educación gratuita, offline, bilingüe, para escuelas con poca conexión |
| Creativity | Originalidad | Diseñar bajo trade-offs reales con historia, roles y música |
| Validity | Ciencia sólida, factible, usable | Fórmulas documentadas y probadas; un juez entiende y juega en 60 s |
| Relevance | Responde de lleno al reto; datos de NASA como núcleo | Recursos de NASA visibles dentro del juego (ver §6) |
| Presentation | Historia clara y atractiva (demo + proyecto) | Nuestro punto fuerte |

Premios con más afinidad: Best Storytelling, Art & Technology, Best Mission Concept, Most Inspirational, Local Impact.

## 5. El reto frente a la primera versión
| Lo que pide el reto | Primera versión (PP.game) | Estado |
|---|---|---|
| Objetivo y requisitos de misión | Briefing, pestaña Mission, contratos | hecho |
| Nave: estructura, energía, baterías, comms, computadora, actitud; simple/avanzado | Pestaña Spacecraft | hecho |
| Instrumentos con masa, potencia, costo, datos, valor científico | Catálogo de 12+ instrumentos | hecho |
| Órbitas explicadas; lanzador compatible con masa y órbita | Orbit & Launch + revisión bloqueante | hecho |
| Recursos visibles (masa, potencia, presupuesto, datos, comms, tiempo) | Panel en vivo con deltas | hecho |
| Hasta 4 personas con roles que negocian | Modo equipo: reparto del dinero por áreas, metas por rol y de grupo, revisión con voto y veto, Kuntur en asientos vacíos; 100 puntos de negociación | hecho (2026-11-14) |
| Simulación, puntuación, análisis post-misión | Simulación con semilla, 0–1000, 3 causas | hecho |
| Dificultades, escenarios, eventos, sandbox | Cadete/Investigador/Director, contratos, sandbox | hecho |
| Guardar, compartir, comparar; ranking | Guardado, enlaces, retos por enlace, trade study de dos opciones y ranking por misión (solo / equipo / nombres de la sala) | hecho (2026-11-14) |
| Enseñar el por qué | Revisión explicada, lecciones | hecho |

## 6. Recursos oficiales del reto (pestaña Resources, publicados) y cómo usarlos
| Recurso | Uso propuesto en el juego |
|---|---|
| Design and Develop Science Missions (segmentos: lanzamiento, espacio, tierra, usuario) | Organizar pestañas y roles por segmento y nombrarlos así |
| Concept Maturity Levels (JPL) | Barra de madurez: la misión sube de CML 1 a CML 4 al cerrar decisiones |
| Mission Design Lab (NASA MDL) | Fases de la partida en equipo; "trade study" que compara dos diseños |
| GMAT | Validar Δv de transferencias y L2 del motor; citar cifras comparadas |
| NASA Mission Viz | Referencia visual de la vista de órbita; enlace "ver una misión real" |
| A Learning Game About Telescopes | Al final, mostrar la misión real de NASA más parecida a tu diseño |
| CubeSat 101 | Escenario de inicio con CubeSat para el nivel Cadete |
| Visualize a Space Mission Using VR (reto 2023) | Inspiración para la línea de tiempo de la misión |
| CSA — Digital Games and Activities | Citar como dato de socio espacial |

Fuentes de NASA ya usadas en la primera versión: NASA Glenn *Beginner's Guide to Aeronautics* (ecuación del cohete, Isp,
etapas), JPL *Basics of Space Flight*, NASA Mars Fact Sheet (NSSDCA), páginas de Mars Reconnaissance Orbiter,
*NASA Systems Engineering Handbook*.

## 7. Global Offers (página leída con sesión el 2026-11-14)
| Oferta | Qué da | Cómo | ¿Pide tarjeta? | Para nosotros |
|---|---|---|---|---|
| Miro Board Templates | Hackathon Template Board y Project Coach Board | "Use Template" e iniciar sesión | No | **Pedir ya**: tablero del equipo |
| Miro Education | Gratis 2 años (estudiantes), siempre (educadores) | "Apply as student/educator" | No | Pedir si aplica |
| Miro Business | 14 días gratis | Desde la página de precios | **Sí**; cancelar antes del día 14 | No hace falta |
| GitHub Copilot Free | 2000 completados/mes + chat limitado | Iniciar sesión en GitHub, plan Free | No | Pedir: respaldo de código |
| Microsoft Copilot | Asistente de IA gratis | copilot.com | No | Opcional |
| Microsoft Teams Free | Reuniones de 60 min hasta 100 personas | Cuenta Microsoft | No | Si el equipo lo usa |
| Planetary Computer | Catálogo de datos ambientales y API STAC | Sin cuenta | No | Solo si usamos datos de Tierra |
| Microsoft Azure | USD 200 por 30 días (cuentas nuevas) | "Try Azure for Free" | **Sí**, verificación | Solo si hace falta servidor |
| Google Cloud | USD 300 por 90 días; Firebase, Maps | "Get started for free" | **Sí**, verificación; sin cobro automático | **Útil**: Firebase para ranking o multijugador en tiempo real |
| Meteomatics | 1000 consultas/día de clima, durante el hackathon | Formulario | No | No aplica al reto |
| Dominio + hosting (GoDaddy Registry, vía Porkbun) | Dominio no premium + 1 año de hosting + SSL | Buscar dominio, datos de contacto, código por correo | No | Opcional: dominio propio para el enlace |

La tarjeta, si se usa, la ingresa el dueño en la página del proveedor; nunca Claude.

## 8. Decisiones tomadas
| Fecha | Decisión | Por qué |
|---|---|---|
| 2026-11-14 | Reto: Space Mission Design Game | Encaja punto por punto con la primera versión |
| 2026-11-14 | Demo en diapositivas (7 máx.); el video vive dentro del juego | El video de 30 s es muy corto para mostrar el juego |
| 2026-11-14 | Repositorio nuevo para el concurso, reutilizando la primera versión con referencias declaradas | Originalidad y orden; la primera versión sigue aparte |
| 2026-11-14 | Nueva toma de la intro sin Goicochea niño | Regla de menores de 18 |
| 2026-11-14 | Marca "AI-generated" visible en imágenes y video; declaración de IA en texto y metadatos | Regla de la entrega |
| 2026-11-14 | Reparto: el dueño hace la parte creativa; Claude código, datos y página de entrega en inglés | Pedido del dueño |
| 2026-11-14 | **El código del concurso vive en este repo**, en `game/`: se trae el estado actual de *Paulet: Andes to Orbit* (PP.game, commit `c58b78b`) como base declarada y lo nuevo del concurso se hace aquí; despliegue aparte en Vercel | Respuesta del dueño; originalidad y orden |
| 2026-11-14 | **Equipo de 4: se combinan los tres mecanismos.** (1) Votación con veto en las decisiones grandes y en la revisión antes de lanzar; (2) el dinero se reparte por áreas según lo que más importa en cada misión (cambia de misión a misión); (3) cada rol tiene metas propias y además hay una meta de grupo | Respuesta del dueño; hueco más grande frente al reto, pesa en Creativity |
| 2026-11-14 | **Si juega una sola persona:** puede llevar varios roles, o Kuntur lleva uno o varios | Respuesta del dueño (ya estaba en la idea original) |
| 2026-11-14 | **Arco de una partida corta (5–10 min): "Una promesa a Paulet".** Goicochea adulto recibe en Arequipa un contrato que termina lo que Paulet empezó; diseñas, lanzas y el informe final se lee como una carta o bitácora | Respuesta del dueño; Presentation y Best Storytelling |
| 2026-11-14 | **Legado: "Valores de Goicochea".** Tres valores (rigor, audacia, servicio a la gente); cada decisión inclina uno, y el informe dice qué Goicochea fuiste y qué habría pensado Paulet (sus hechos siempre como "afirmados") | Respuesta del dueño; Creativity y Validity |
| 2026-11-14 | **Roles en la ficción: "El equipo de Goicochea".** Cada rol es un personaje del instituto de Goicochea en Arequipa, con una línea de motivación que explica su meta propia; Kuntur ocupa los asientos vacíos | Respuesta del dueño; Creativity y Best Storytelling |
| 2026-11-14 | **Informe final: "Carta a Paulet".** Goicochea escribe a la memoria de Paulet qué salió bien, qué falló y por qué, firmada con el valor que dominó (rigor, audacia o servicio); los números van debajo | Respuesta del dueño; el reto pide explicar el porqué (Validity, Presentation) |
| 2026-11-14 | **Nueva intro: "Goicochea y el cuaderno".** Amanecer en una azotea de Arequipa con el Misti detrás; Goicochea adulto abre el cuaderno de Paulet, Kuntur despliega sus alas y le pasa la misión al jugador. Sin menores; marca "AI-generated" si hay imagen o video generado | Respuesta del dueño; regla de menores de 18 |
| 2026-11-14 | **Diapositiva 2 (gancho): "Una promesa de 130 años".** Paulet afirmó en 1895 haber probado un motor de combustible líquido (siempre "afirmado"): ¿qué haría falta para terminar hoy lo que empezó? El juego es la respuesta | Respuesta del dueño; Presentation |
| 2026-11-14 | **Multijugador en línea con Firebase** (Realtime Database, plan gratis Spark, proyecto creado por el dueño): uno crea la sala e invita con un enlace; cada uno pone su nombre y elige su perfil (rol); juegan juntos. Se mantiene también el modo de un solo dispositivo | Pedido del dueño; hueco más grande frente al reto |
| 2026-11-14 | **Personajes del equipo de Goicochea:** Goicochea (Director de misión), **Chicho** (Ingeniero de la nave), **Roberto** (Astrofísico), **Franchesca** (Astrobióloga). Todos adultos y ficticios | Respuesta del dueño |
| 2026-11-14 | **Ranking:** comparación lado a lado de dos diseños ("trade study", como el Mission Design Lab de NASA) + ranking por misión en el dispositivo, compartible con los retos por enlace; sin servidor | Respuesta del dueño; Relevance |
| 2026-11-14 | **Valores de Goicochea visibles:** tres barras en vivo en el panel del diseño (rigor, audacia, servicio) y la carta a Paulet firmada con el valor que dominó | Respuesta del dueño; Creativity |
| 2026-11-14 | **Diapositivas:** 1 título, equipo, integrantes y reto · 2 "Una promesa de 130 años" · 3 el juego en una imagen · 4 cómo negocia un equipo de 4 · 5 datos y recursos de NASA dentro del juego · 6 impacto (gratis, sin conexión, bilingüe) · 7 equipo, enlace y QR | Respuesta del dueño; Presentation |

## 9. Hecho
- [x] 2026-11-14 · Lectura de las guías de entrega y jurado, del reto, sus recursos y las Global Offers.
- [x] 2026-11-14 · Manual técnico de la primera versión (historia, herramientas, física, método con IA, reglas del concurso):
      `C:\PPgame\MANUAL_TECNICO_PAULET.html`, publicado en https://claude.ai/artifact/F6c9mVkKBPLeQ24E2UaK3d (privado).
- [x] 2026-11-14 · Repositorio del concurso creado (privado) con este HANDOFF.
- [x] 2026-11-13 · (en `PP.game`, rama `cloud/fase-1`) Taller del Ingeniero de cohetes: piezas, masa / empuje / Δv en vivo, vista 3D, tu cohete en misiones y carrera.
- [x] 2026-11-13 · (en `PP.game`) Laboratorio del Astrobiólogo con vista 3D de seis mundos.
- [x] 2026-11-13 · (en `PP.game`) Multijugador asíncrono: "retos por enlace" (mismo escenario y semilla, gana el mejor puntaje).
- [x] 2026-11-13/14 · (en `PP.game`) Acto 3, Marte, jugable completo: ventanas de lanzamiento cada 25,6 meses, retardo de radio,
      conjunción, aerofrenado; misiones "Red Horizon" (orbitador), "Stranded" (aterrizaje con escudo, paracaídas y
      retrocohetes) y "Breathing Mars" (planta de oxígeno del CO₂, referencia MOXIE). Fórmulas en `PP.game/docs/model.md` §22–24.
- [x] 2026-11-14 · (en `PP.game`) Robot guía **Kuntur** (elegido por el dueño entre tres): pistas en el diseño, explicación
      del resultado tras cada misión y tutorial de la primera misión, en inglés y español.
- [x] 2026-11-14 · `PP.game`: 229 pruebas en verde; build de producción correcto.
- [x] 2026-11-14 · Código traído a este repo en `game/` (base declarada: PP.game `c58b78b`); 229 pruebas en verde aquí.
- [x] 2026-11-14 · **Modo equipo de hasta 4** (`game/src/engine/team.ts`, `game/src/store/team.ts`, `game/src/ui/team/`):
      en la pestaña Mission se elige 1–4 jugadores y quién lleva cada rol (o Kuntur); el dinero se reparte por áreas según
      las prioridades de la misión (se puede renegociar con deslizadores); cada rol ve su meta en privado ("show my goal",
      se pasa el dispositivo) y hay una meta de grupo; antes de lanzar, revisión de diseño con aprobar / rechazar / vetar
      (3 de 4 y sin veto). El informe suma "Team negotiation" (0–100) y muestra la tabla del equipo. Fórmulas en
      `game/docs/model.md` §25. Probado en el navegador de punta a punta (2 jugadores + Kuntur: 3 de 4 aprobaron, misión
      completa, 73/100 de negociación). Capturas: `docs/screenshots/team-panel.jpg`, `docs/screenshots/team-design-review.jpg`.
      239 pruebas en verde.
- [x] 2026-11-14 · Entrevista creativa, tres rondas (decisiones en §8).
- [x] 2026-11-14 · **Multijugador en línea** (`game/src/online/`, `game/src/store/online.ts`, `game/src/ui/online/`): crear sala,
      enlace `?room=CODE`, unirse con nombre, tomar un rol (personajes Goicochea, Chicho, Roberto y Franchesca, con su frase),
      diseño y reparto compartidos en vivo, metas privadas por jugador, votación en línea (cada uno vota sus roles) y
      "Launch together": todos vuelan la misma misión. Probado con dos pestañas (backend local): misma semilla, mismo
      puntaje (866) y 83/100 de negociación. **Falta solo conectar Firebase** (configuración del dueño). Reglas en
      `game/database.rules.json`, plantilla en `game/.env.example`. 244 pruebas en verde.
- [x] 2026-11-14 · **Firebase conectado** (proyecto `paulet-spaceapps`, plan Spark gratis, Realtime Database en us-central1,
      `https://paulet-spaceapps-default-rtdb.firebaseio.com`). La configuración está en `game/.env.local` (no se sube; no es
      secreta). Probado con dos pestañas sobre Firebase real: unirse por enlace, tomar roles, diseño compartido, votación
      3 de 4 y "Launch together"; los dos vieron la misma misión (semilla 766479, 807 puntos). El dueño publicó las reglas.
- [x] 2026-11-14 · **Trade study y ranking** (`game/src/engine/trade.ts`, `game/src/ui/tabs/TradeStudy.tsx`,
      `game/src/store/leaderboard.ts`): en Review se guarda el diseño como opción A o B y se comparan con el actual en 9
      métricas (requisitos, costo, margen del lanzador, margen de energía, datos, mes de lanzamiento, vida, ciencia,
      probabilidad de éxito), con el mejor en verde y "mejor en n". Ranking de los 5 mejores vuelos por misión en el
      dispositivo, visible en la pestaña Mission y en resultados, con quién voló (solo, equipo de n o los nombres de la
      sala). 247 pruebas en verde.

## 10. Pendiente (en orden)
1. [ ] Confirmar el evento local, que todos estén inscritos ahí (no en espera) y la hora exacta de cierre.
2. [ ] Pedir ofertas: Miro Templates, GitHub Copilot Free; Google Cloud si haremos ranking o tiempo real.
3. [ ] **Enlace público (lo hace el dueño, Claude no tiene sesión en Vercel):** vercel.com → Add New → Project → importar `paulet-spaceapps-2026` (dar acceso de GitHub si lo pide) → **Root Directory: `game`** (Vite se detecta solo) → Environment Variables: las 5 `VITE_FIREBASE_*` de `game/.env.local` → Deploy. Luego probar en ventana privada y con dos dispositivos reales (sala en línea). Alternativa: `npx vercel login` en la terminal del dueño y Claude despliega.
4. [ ] **Intro actual con Goicochea niño: no puede ir en la entrega** (regla de menores de 18). Hasta tener la nueva toma, quitarla o saltarla en la versión del concurso.
5. [ ] Historia en el juego (los personajes ya están en el panel del equipo): barras de valores, carta a Paulet en el informe, intro nueva.
6. [ ] Recursos de NASA dentro del juego: barra CML, segmentos de misión, "misión real más parecida", escenario CubeSat; validar Δv con GMAT.
7. [ ] Nueva toma de la intro sin el niño; marca "AI-generated" en imágenes y videos generados.
8. [ ] Quitar cualquier logo o identificador de NASA de los recursos reutilizados.
9. [ ] Diapositivas (7) en inglés: título/equipo/integrantes/reto · problema · historia · cómo se juega · equipo de 4 · datos de NASA · futuro + enlace/QR.
10. [ ] Página del proyecto en inglés: resumen, descripción detallada, uso de IA, datos de NASA, referencias (incluida la primera versión, licencias de fuentes, música, voces).
11. [ ] **Guardar progreso desde el sábado; primer "Submit for Judging" el domingo temprano**; reenviar si mejora.
12. [ ] Hacer público el repo/enlace que se entregue y descargar el certificado de participación.

## 11. Siguiente paso exacto
El dueño prueba el juego como jurado (local: `cd game && npm run dev`, o el enlace de Vercel cuando lo despliegue) y dicta sus mejoras; se anotan aquí como pendientes. En paralelo: desplegar (§10, punto 3), resolver la intro con el niño (punto 4), historia en el juego (barras de valores, carta a Paulet), recursos de NASA dentro del juego, diapositivas y página del proyecto.

## 12. Dónde está cada cosa
- Primera versión: repo `artesanalinteligencia1-dotcom/PP.game` (rama `cloud/fase-1`), clon `C:\PPgame\PP.game`,
  demo https://paulet-andes-to-orbit.vercel.app/. Su contexto: `docs/PLAYBOOK.md`, `docs/HANDOFF.md`, `docs/model.md`
  (todas las fórmulas), `PROGRESS.md`, `DECISIONS.md`.
- Medios: `C:\PPgame\{intro-a, trailer, trailer-final, trailer-test, soundtrack, media_raw}`.
- Repo antiguo del grupo: `artesanalinteligencia1-dotcom/NASA-Hackathon` (privado, solo README del 2026-11-01).
- Este repo: `C:\PPgame\paulet-spaceapps-2026`.
- Memoria de Claude Code (solo en esta PC): `C:\Users\roone\.claude\projects\C--PPgame\memory\`.
- **Firebase (multijugador en línea), pasos para el dueño:** console.firebase.google.com → Crear proyecto `paulet-spaceapps`
  (sin Analytics) → Compilación → Realtime Database → Crear base de datos (Estados Unidos, modo de prueba) → Configuración
  del proyecto → Tus apps → Web `</>` → apodo `paulet-game`, Registrar → copiar `firebaseConfig` y pasarlo a Claude.
  Va como variables `VITE_FIREBASE_*` en `game/.env.local` y en Vercel (no es un secreto: lo protegen las reglas).
