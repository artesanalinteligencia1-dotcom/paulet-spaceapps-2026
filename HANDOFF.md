# HANDOFF — Paulet Delta-V · NASA Space Apps Challenge 2026

> **Léelo primero.** Este archivo es la memoria compartida del proyecto. El dueño trabaja desde varias cuentas y sesiones de
> Claude que no comparten historial: todo lo que hay que saber está aquí. **Al terminar cada tarea:** pásala a "Hecho" con
> fecha, actualiza "Pendiente" y "Siguiente paso exacto", y haz commit.
> Explicaciones al dueño en español; código, textos del juego y entrega en inglés.

Última actualización: 2026-11-14 (madrugada, antes de que abra la entrega).

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
| Hasta 4 personas con roles que negocian | 4 roles en un dispositivo, bots, retos por enlace | **reforzar** |
| Simulación, puntuación, análisis post-misión | Simulación con semilla, 0–1000, 3 causas | hecho |
| Dificultades, escenarios, eventos, sandbox | Cadete/Investigador/Director, contratos, sandbox | hecho |
| Guardar, compartir, comparar; ranking | Guardado y enlaces; **sin ranking** | **falta ranking** |
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

## 9. Hecho
- [x] 2026-11-14 · Lectura de las guías de entrega y jurado, del reto, sus recursos y las Global Offers.
- [x] 2026-11-14 · Manual técnico de la primera versión (historia, herramientas, física, método con IA, reglas del concurso):
      `C:\PPgame\MANUAL_TECNICO_PAULET.html`, publicado en https://claude.ai/artifact/F6c9mVkKBPLeQ24E2UaK3d (privado).
- [x] 2026-11-14 · Repositorio del concurso creado (privado) con este HANDOFF.
- [x] (otra sesión, en curso) · Versión nueva del juego para el concurso. **La sesión que la lleva debe anotar aquí dónde vive su código y qué terminó.**

## 10. Pendiente (en orden)
1. [ ] Confirmar el evento local, que todos estén inscritos ahí (no en espera) y la hora exacta de cierre.
2. [ ] Decidir dónde vive el código nuevo (este repo o el que use la otra sesión) y anotarlo en §1.
3. [ ] Pedir ofertas: Miro Templates, GitHub Copilot Free; Google Cloud si haremos ranking o tiempo real.
4. [ ] Cerrar huecos del reto: colaboración real de 4 personas (decisiones negociadas) y ranking/comparación de diseños.
5. [ ] Recursos de NASA dentro del juego: barra CML, segmentos de misión, "misión real más parecida", escenario CubeSat; validar Δv con GMAT.
6. [ ] Nueva toma de la intro sin el niño; marca "AI-generated" en imágenes y videos generados.
7. [ ] Quitar cualquier logo o identificador de NASA de los recursos reutilizados.
8. [ ] Desplegar el enlace público (Vercel) y probarlo en ventana privada y en el teléfono.
9. [ ] Diapositivas (7) en inglés: título/equipo/integrantes/reto · problema · historia · cómo se juega · equipo de 4 · datos de NASA · futuro + enlace/QR.
10. [ ] Página del proyecto en inglés: resumen, descripción detallada, uso de IA, datos de NASA, referencias (incluida la primera versión, licencias de fuentes, música, voces).
11. [ ] **Guardar progreso desde el sábado; primer "Submit for Judging" el domingo temprano**; reenviar si mejora.
12. [ ] Hacer público el repo/enlace que se entregue y descargar el certificado de participación.

## 11. Siguiente paso exacto
Punto 1 y 2 de la lista: confirmar evento y hora de cierre; decidir y anotar dónde vive el código nuevo.

## 12. Dónde está cada cosa
- Primera versión: repo `artesanalinteligencia1-dotcom/PP.game` (rama `cloud/fase-1`), clon `C:\PPgame\PP.game`,
  demo https://paulet-andes-to-orbit.vercel.app/. Su contexto: `docs/PLAYBOOK.md`, `docs/HANDOFF.md`, `docs/model.md`
  (todas las fórmulas), `PROGRESS.md`, `DECISIONS.md`.
- Medios: `C:\PPgame\{intro-a, trailer, trailer-final, trailer-test, soundtrack, media_raw}`.
- Repo antiguo del grupo: `artesanalinteligencia1-dotcom/NASA-Hackathon` (privado, solo README del 2026-11-01).
- Este repo: `C:\PPgame\paulet-spaceapps-2026`.
- Memoria de Claude Code (solo en esta PC): `C:\Users\roone\.claude\projects\C--PPgame\memory\`.
