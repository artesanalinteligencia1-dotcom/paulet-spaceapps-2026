# HANDOFF — Paulet Delta-V · NASA Space Apps Challenge 2026

> **Léelo primero.** Este archivo es la memoria compartida del proyecto. El dueño trabaja desde varias cuentas y sesiones de
> Claude que no comparten historial: todo lo que hay que saber está aquí. **Al terminar cada tarea:** pásala a "Hecho" con
> fecha, actualiza "Pendiente" y "Siguiente paso exacto", y haz commit.
> Explicaciones al dueño en español; código, textos del juego y entrega en inglés.

Última actualización: 2026-11-15 (madrugada).

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
| 2026-11-14 | **Dirección visual: mezcla A + B.** "Mission control" (oscuro sobrio, cifras grandes, una acento naranja, etiquetas monoespaciadas) en el taller de diseño; "Paulet's notebook" (papel, tinta, serifa Fraunces, notas a mano, franja textil andina) en los momentos de historia: tutorial, sesión informativa y Carta a Paulet | Elegida por el dueño entre 3 prototipos (`game/proto-directions.html`); pedido 14 |
| 2026-11-14 | **Kuntur: cóndor geométrico andino** (líneas planas y escalonadas inspiradas en el arte textil y de piedra andino), animado con GSAP | Respuesta del dueño |
| 2026-11-14 | **Diapositiva 3: escena del equipo** (Goicochea, Chicho, Roberto y Franchesca, adultos, alrededor de la mesa con el juego), imagen con Gemini del dueño y marca "AI-generated" | Respuesta del dueño |
| 2026-11-14 | **Tono de la Carta a Paulet: personal y luego técnica**: dos líneas emotivas de Goicochea y después el porqué técnico del resultado | Respuesta del dueño |
| 2026-11-15 | **Estilo de consola de control** (imagen de referencia del dueño): paneles grafito con franja de título, crema y dorado, naranja para rutas y botones, magenta solo para alarmas, Barlow Condensed y el logo PAULET (E de tres barras). Reemplaza la mezcla A + B | Pedido del dueño: "que el videojuego se vea como la imagen de la izquierda" |
| 2026-11-15 | **Adiós a las hojas blancas:** los momentos de historia (tutorial, sesión informativa, intro y, cuando exista, la carta) son "transmisiones" del mismo estilo de consola | El dueño: "no tienen nada que ver con el diseño del juego" |
| 2026-11-15 | **Cabina de vuelo** en el lanzamiento real, con vuelo 4 veces más largo tras el despegue (ritmo 4), velocidades 1×/2×/4× y saltar | Pedido del dueño: ver todo el recorrido con varias cámaras |
| 2026-11-15 | **Realismo 3D separado como tarea para Fable** (sesión aparte que comparte la carpeta; solo toca `game/src/ui/launch/three/*`) | Pedido del dueño: "lo que necesites a Fable sepáralo como tarea" |
| 2026-11-15 | **Sin superposiciones:** cuadrícula fija para 1440×810, modales con fondo atenuado y una auditoría automática (`__overlapAudit()` en desarrollo) | Pedido del dueño: "revisa que no sobretoquen los objetos" |
| 2026-11-15 | **Carta a Paulet como transmisión de consola:** se escribe en vivo con el estilo nuevo, firmada con el valor dominante y con los números debajo (sin voz, sin costo) | Respuesta del dueño |
| 2026-11-15 | **Diapositiva 5: la vista Mapa del vuelo real** (Tierra Blue Marble/Black Marble, ruta desde Arequipa, órbita) con 3–4 etiquetas que señalan cada dato de NASA | Respuesta del dueño; Relevance |
| 2026-11-15 | **Si la misión falla: carta + reintento.** Goicochea escribe igual a Paulet (qué aprendió) y Kuntur ofrece reintentar con la misma semilla cambiando lo que falló | Respuesta del dueño; Storytelling y Validity |
| 2026-11-15 | **Nombre del proyecto en la entrega: "Paulet: A 130-Year Promise"** | Respuesta del dueño; conecta con el gancho de la diapositiva 2 |

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
- [x] 2026-11-14 (noche) · **Más contexto y un Kuntur que responde** (pedidos 15, 16 y 19, primera parte):
      tutorial de 11 pasos (cómo llegó Pedro, su equipo Chicho/Roberto/Franchesca, quién paga y qué son los
      inversionistas, qué son las estrellas) con botón **Atrás**; **sesión informativa por misión** la primera vez que se
      abre cada una (de qué trata en palabras simples, qué hay que entregar, por dónde empezar; textos `brief.<misión>`);
      **preguntas a Kuntur** en cada pestaña con respuestas calculadas del diseño, sin internet ("¿De qué trata esta
      misión?", "¿Qué hago ahora?", "¿Qué son las estrellas?", "¿Qué instrumento necesito?", "¿Tengo suficiente
      energía?", "¿Bajan suficientes datos?"…); **franja de contexto** arriba de cada pestaña: qué decides aquí, por qué
      importa y qué pide esta misión en esa pestaña (✔/○). Archivos: `game/src/ui/guide/lines.ts`, `GuideDock.tsx`,
      `game/src/ui/tabs/TabContext.tsx`. Probado en el navegador con Vigía de la Tierra. 247 pruebas en verde.
      **Falta que el dueño lo valide** jugando Vigía de la Tierra.
- [x] 2026-11-14 · **Trade study y ranking** (`game/src/engine/trade.ts`, `game/src/ui/tabs/TradeStudy.tsx`,
      `game/src/store/leaderboard.ts`): en Review se guarda el diseño como opción A o B y se comparan con el actual en 9
      métricas (requisitos, costo, margen del lanzador, margen de energía, datos, mes de lanzamiento, vida, ciencia,
      probabilidad de éxito), con el mejor en verde y "mejor en n". Ranking de los 5 mejores vuelos por misión en el
      dispositivo, visible en la pestaña Mission y en resultados, con quién voló (solo, equipo de n o los nombres de la
      sala). 247 pruebas en verde.
- [x] 2026-11-14 (noche) · **"Play online" desde el menú principal** (pedido 17): ventana con nombre, **crear sala eligiendo
      cualquiera de las 10 misiones** (entra directo al diseño compartido) o **unirse con el código de 6 letras** (también
      acepta pegar el enlace). `OnlineLobby` en `game/src/ui/online/OnlinePanel.tsx`, `parseRoomCode` en
      `game/src/online/room.ts`, prueba `game/tests/onlineLobby.test.ts`. Probado en el navegador sobre Firebase real con
      dos pestañas: sala de Storm Tracker creada desde el menú y segunda pestaña unida por código. 250 pruebas en verde.
- [x] 2026-11-14 (noche) · **Nuevo aspecto visual, mezcla A + B** (pedidos 14 y 18b, primera parte). A "Mission control" en
      todo el taller: fondo grafito con retícula, tarjetas de 16 px por cada sección (`Section` → `.mc-card`), etiquetas
      monoespaciadas naranjas, encabezado con el nombre grande y pasos numerados 01–06, texto más grande en las pestañas,
      barras redondeadas y cifras grandes (ciencia, probabilidad de éxito). B "Paulet's notebook" (`.paper`: papel, serifa
      Fraunces, franja textil andina) en el globo de Kuntur durante el tutorial y la sesión informativa de cada misión.
      **Kuntur redibujado como cóndor geométrico andino** (alas escalonadas, collar en zigzag, cresta escalonada) con GSAP:
      planea en reposo, aletea al cambiar de ánimo y asiente al hablar. **Coreografía GSAP** (`game/src/ui/motion.ts`):
      las tarjetas suben en cascada al cambiar de pestaña; en el informe, la tarjeta del puntaje entra, el puntaje cuenta
      hacia arriba, las barras se llenan y las causas aparecen en orden. Todo se apaga con "movimiento reducido".
      Fuentes nuevas (OFL): Fraunces, JetBrains Mono y Caveat cargadas en `main.tsx`. Revisado en el navegador (Earth
      Watch); el informe animado no se revisó a ojo todavía. 250 pruebas en verde.
- [x] 2026-11-14 (noche) · **Intro sin Goicochea niño** (punto 4): se quitó `game/src/assets/video/intro.mp4` del repo del
      concurso y "Watch intro" ahora es una escena hecha en código, "Goicochea y el cuaderno": amanecer en Arequipa, 5
      páginas del cuaderno de Paulet (estilo B) con GSAP, Kuntur entra volando al final. Sin personas en pantalla. Textos
      `intro.scene.*` e `intro.hand.*` (inglés y español). **Ojo:** el video viejo sigue en el historial de git; si el repo se
      hace público, decidir si se limpia el historial o se entrega otro enlace.
- [x] 2026-11-14 (noche) · **Prototipo del nuevo HUD de vuelo** (pedido 20), `?proto=flight` (`game/src/ui/proto/FlightHud.tsx`,
      `flightTelemetry.ts`, logo `game/src/ui/brand/PauletLogo.tsx`): marco grafito con el logo PAULET (E de tres barras),
      MET y fase, pausa/velocidad; paneles "Orbital telemetry" (con globo), "Ascent loads" (barras de calor), gráficas en
      vivo, "Propulsion & staging" (medidores Δv por etapa y propelente), registro de eventos; actitud con escalera de
      cabeceo y cintas de velocidad/altitud; **cámaras en vivo** Ground (teleobjetivo que sigue al cohete), Chase, Onboard
      (cámara en la etapa superior mirando hacia abajo) y Map (globo con trayectoria desde Arequipa y órbitas), más un
      **visor pequeño con una segunda cámara** (`LaunchScene3D` acepta `views`). Telemetría con cifras realistas de un
      ascenso a ~200 km (solo para mostrar). Probado en el navegador en las cuatro vistas. **Falta la aprobación del dueño**
      para integrarlo al juego. **Tutoriales de medios** en `docs/tutoriales/` (imágenes con Gemini, video con Veo, texturas
      de NASA Blue/Black Marble, montaje con HyperFrames).
- [x] 2026-11-15 · **Texturas reales de NASA** (descargadas con permiso del dueño): Blue Marble NG julio 2004 y Black Marble
      2016, reducidas en `game/src/assets/textures/` (1,5 MB; fuentes en `SOURCES.md`), en el caché sin conexión.
- [x] 2026-11-15 · **Cabina de vuelo en el lanzamiento real** (`game/src/ui/flight/`): telemetría hacia la órbita de cada
      misión (altitud, velocidad orbital √(μ/r), inclinación y rumbo desde Arequipa por trigonometría esférica), cargas
      del ascenso, gráficas, propulsión y etapas, eventos (con aterrizaje del propulsor y fallas), cintas de actitud,
      cámaras Ground/Chase/Onboard/Map (teclas 1–4) con interferencia al cambiar, segundo visor en vivo (ahí se ve el
      aterrizaje del propulsor), mapa del recorrido sobre la Tierra de NASA (día/noche, terminador del amanecer) y
      tarjetas de preparación y de resultado. Vuelo con ritmo 4 y velocidades 1×/2×/4× que reprograman los sonidos.
      Probado de punta a punta con Earth Watch: llega a 700 km y 7 508 m/s.
- [x] 2026-11-15 · **Estilo de consola en todo el juego** (logo PAULET en inicio y menú, paneles con franja de título,
      Barlow Condensed), **tarjetas de transmisión** en vez de papel, **intro sobre la plataforma 3D real** con texto que
      se decodifica y despegue final, **transiciones** entre pantallas (Motion) y modales.
- [x] 2026-11-15 · **Auditoría de superposiciones** (`game/src/ui/dev/overlapAudit.ts`): menú, taller (6 pestañas × 4
      posiciones de scroll), lanzamiento (antes, durante y al final), intro, learn, rocket, astro y sala en línea: 0
      superposiciones y 0 textos desbordados. Corregido además un desplazamiento de toda la pantalla (fondo al 110 %).
- [x] 2026-11-15 · **Sesión aparte para Fable** ("Fable: realistic 3D launch scene and orbit view"): Tierra con texturas
      NASA en 3D, vista que se aleja hasta la órbita, llama y humo realistas, luz y cámaras. Comparte la carpeta; hace
      commits solo de `game/src/ui/launch/three/*` y no hace push (lo hace la sesión principal).
- [x] 2026-11-15 · **Resumen de storytelling** en `docs/storytelling.md`.

## 10. Pendiente (en orden)
1. [ ] Confirmar el evento local, que todos estén inscritos ahí (no en espera) y la hora exacta de cierre.
2. [ ] Pedir ofertas: Miro Templates, GitHub Copilot Free; Google Cloud si haremos ranking o tiempo real.
3. [ ] **Enlace público en Vercel — TAREA PARA LA OTRA CUENTA DE CLAUDE** (la que tiene el conector de Vercel; esta no tiene sesión):
   1. Crear un proyecto nuevo en Vercel desde el repo de GitHub `artesanalinteligencia1-dotcom/paulet-spaceapps-2026`
      (rama `main`). **Root Directory: `game`.** Framework: Vite (se detecta solo); build `npm run build`; salida `dist`.
   2. No hace falta poner variables: la configuración pública de Firebase va en `game/.env.production` (en el repo).
   3. Desplegar a producción y anotar la URL aquí en §1 y §12. Nombre sugerido del proyecto: `paulet-spaceapps-2026`.
   4. Probar en ventana privada: menú, una misión libre completa, el modo equipo y una **sala en línea con dos
      dispositivos** (o dos navegadores): crear sala, unirse por enlace, votar, "Launch together".
   5. Probar en el teléfono. Si el dominio es nuevo, pedir la clasificación de FortiGuard (§3).
   6. No tocar el proyecto de Vercel de la primera versión (`paulet-andes-to-orbit`, rama `main` de PP.game).
4. [x] (2026-11-14, ver §9; queda decidir el historial de git) **Intro actual con Goicochea niño: no puede ir en la entrega** (regla de menores de 18). Hasta tener la nueva toma, quitarla o saltarla en la versión del concurso.
5. [ ] Historia en el juego (los personajes ya están en el panel del equipo): barras de valores, carta a Paulet en el informe, intro nueva.
6. [ ] **Recursos de NASA referenciados DENTRO del juego** (pedido del dueño, 2026-11-14; criterio Relevance):
   - Una pantalla o tarjeta "NASA resources" (desde el menú y desde Learn) que cite cada fuente con enlace y diga qué
     parte del juego se apoya en ella: NASA Glenn *Beginner's Guide to Rockets* (ecuación del cohete, Isp, etapas),
     JPL *Basics of Space Flight* (órbitas, ventanas a Marte), NSSDCA *Mars Fact Sheet*, *NASA Systems Engineering
     Handbook* (márgenes, revisiones), páginas de Mars Reconnaissance Orbiter (aerofrenado), Curiosity/Perseverance y
     Phoenix (aterrizaje), MOXIE (oxígeno), JPL Concept Maturity Levels, *Design and Develop Science Missions*
     (segmentos), Mission Design Lab (trade study), GMAT, CubeSat 101, NASA Mission Viz.
   - Citas en contexto: un "Source: NASA …" pequeño en cada panel que use esos números (Orbit & Launch, ruta a Marte,
     aterrizaje, planta de oxígeno, lecciones, trade study, revisión de diseño).
   - Lo que ya estaba previsto: barra de madurez CML 1–4 (JPL), los cuatro segmentos de una misión, "la misión real de
     NASA más parecida a tu diseño" en el informe, escenario CubeSat para Cadete, validar Δv con GMAT.
   - Sin logos ni insignias de NASA (solo texto y enlaces).
7. [ ] Nueva toma de la intro sin el niño; marca "AI-generated" en imágenes y videos generados.
8. [ ] Quitar cualquier logo o identificador de NASA de los recursos reutilizados.
9. [ ] Diapositivas (7) en inglés: título/equipo/integrantes/reto · problema · historia · cómo se juega · equipo de 4 · datos de NASA · futuro + enlace/QR.
10. [ ] Página del proyecto en inglés: resumen, descripción detallada, uso de IA, datos de NASA, referencias (incluida la primera versión, licencias de fuentes, música, voces).
11. [ ] **Guardar progreso desde el sábado; primer "Submit for Judging" el domingo temprano**; reenviar si mejora.
12. [ ] Hacer público el repo/enlace que se entregue y descargar el certificado de participación.

### Pedidos del dueño tras probar el juego (2026-11-14, noche) — en sus palabras, resumidos
14. [~] (2026-11-15: estilo de consola aplicado a inicio, menú, taller, lanzamiento, intro y Kuntur; falta revisar a ojo informe, campaña y lista de misiones) **Más atractivo visualmente:** "el juego parece aún muy años 2000". Rediseño visual (decidir mostrando 2–3 variantes, PLAYBOOK regla 3.3).
15. [~] (hecho en parte: franja de contexto, sesión por misión y preguntas; validar con el dueño) **Más contexto al elegir (de Carga útil a Revisión), sobre todo en la primera misión importante (Vigía de la Tierra / Earth Watch):** no quitar lo técnico, pero explicar qué elegir y para qué. El dueño no terminó Earth Watch porque no entendía de qué trataba y tuvo que probar hasta cumplir los requisitos.
16. [~] (hecho sin IA: botón Atrás y preguntas; la IA queda como propuesta, ver Investigación) **Kuntur:** poder volver atrás en los pasos de la guía y poder preguntarle (hoy solo muestra mensajes). Propuesta del dueño (opcional): usar la API de una IA para que ayude en el juego. **Nada de proveedores chinos** (p. ej. DeepSeek): el concurso lo prohíbe.
17. [x] (2026-11-14) **Multijugador también desde el inicio**, para jugar cualquier misión → hecho, ver §9.
18. [x] Investigado (ver "Investigación: animación" abajo). Falta **aplicarlo** (punto 14 y 18b).
18b. [~] (hecho: GSAP en pestañas, informe y Kuntur; falta: escenas 3D con mejor luz) Aplicar la investigación: coreografía con GSAP en briefing, informe y transiciones; Kuntur animado con GSAP; escenas 3D con mejor luz e ilustración.
19. [~] (hecho en texto: tutorial con historia + sesión por misión; faltan imágenes o video con Gemini) **Tutorial al comienzo de cada misión** (o al menos la primera): cómo funciona el juego, qué son los inversionistas, cómo llegó Pedro ahí, quiénes son sus amigos, qué son las estrellas. Se pueden usar imágenes o videos con IA: el dueño tiene **Gemini Pro** (marca "AI-generated" visible).

20. [~] (integrado al juego el 2026-11-15, ver §9; el realismo 3D lo hace la sesión de Fable) **Reestructuración del vuelo con referencias del dueño (2026-11-14):** HUD como su imagen 1 (logo
    PAULET, telemetría, propulsión) con los visores laterales de su imagen 2 (gráficas, barras de calor, alertas); abajo a
    la izquierda y el centro, rediseñados; recorrido completo del cohete con cámaras en vivo (suelo, seguimiento, a bordo,
    mapa) y visor pequeño. Mantener original: instrumentos aeroespaciales reales, sin copiar la interfaz de otro juego.

21. [ ] Traducir al español las etiquetas fijas de la cabina (hoy en inglés técnico: "Orbital telemetry", etc.).
22. [ ] Revisar a ojo el informe animado y la pantalla de operaciones de vuelo (`FlightScreen`) con el nuevo estilo.

### Investigación: animación y aspecto visual (2026-11-14)
- **Mantener Three.js + postprocessing** para las escenas 3D (ya instalados). Mejorar luz, materiales e ilustración antes
  que cambiar de motor. React Three Fiber solo si se reescriben las escenas (no antes del cierre).
- **GSAP** (gratis con todos sus plugins, incluidos SplitText, MorphSVG, MotionPath y Flip, también para uso comercial
  desde el 30-abr-2025; ya instalado): herramienta principal para coreografías de interfaz, cinemáticas del briefing,
  números que cuentan, trayectorias SVG y animar el SVG de Kuntur.
- **Motion** (MIT, ya instalado): transiciones entre pantallas y animaciones de layout en React.
- **Rive**: lo mejor para una mascota interactiva con máquinas de estado, pero exportar al juego requiere plan pago
  (Cadet, unos USD 9/mes según su documentación) → solo con aprobación del dueño; si no, Kuntur con GSAP.
- **Lottie / dotLottie** (MIT; renderizado WebGL/WebGPU desde mayo de 2026): iconos y microanimaciones; revisar la
  licencia de cada animación de LottieFiles.
- **Theatre.js**: mantenimiento incierto (repo público lento, editor AGPL) → no usar antes del cierre.
- **Spline**: marca de agua en el plan gratis → no.
- **Video y cinemáticas:** HyperFrames (local, gratis) + Gemini Pro del dueño (imágenes y Veo) con marca "AI-generated".
- "Años 2000" es sobre todo **diseño de interfaz** (tipografía, jerarquía, espacio, ilustración, profundidad): proponer
  2–3 direcciones visuales hechas en código y que el dueño elija (PLAYBOOK regla 3.3).
- **IA para Kuntur (propuesta del dueño, opcional):** proveedores no chinos: Gemini API (Google AI Studio, tiene nivel
  gratis), Claude API (Anthropic) u OpenAI. La clave nunca va en el navegador: haría falta una función de Vercel que la
  guarde y llame al modelo, con las preguntas sin internet como respaldo. Declarar el uso de IA en la entrega.

## 11. Siguiente paso exacto
1) **Recursos de NASA dentro del juego** (punto 6): pantalla "NASA resources" con enlaces y citas en contexto, incluida la
   Tierra de NASA Visible Earth. Es el criterio Relevance.
2) **Carta a Paulet** (transmisión de consola; si falla: carta + reintento con la misma semilla) y **barras de valores** (punto 5).
3) Cuando la sesión de Fable termine: revisar su informe y su diff en `game/src/ui/launch/three/`, probar el despegue
   completo en las cuatro cámaras, correr `__overlapAudit()` y hacer push.
4) Diapositivas (la 3 con la imagen del tutorial 1) y página del proyecto; la otra cuenta despliega en Vercel (punto 3).

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
