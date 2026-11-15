# Tutorial 1 — Imágenes con Gemini

**Para qué:** la diapositiva 3 ("el juego en una imagen": el equipo de Goicochea alrededor de la mesa), retratos de los
cuatro personajes para el panel del equipo y un fondo de Arequipa al amanecer.
**Tiempo:** 20–30 minutos. **Costo:** incluido en tu Gemini Pro.

## Pasos
1. Abre https://gemini.google.com con tu cuenta Pro. Elige el modelo con generación de imágenes (el que diga "imagen"
   o el modelo por defecto de Gemini Pro; si te pregunta, elige la mejor calidad).
2. **Primero fija el estilo** con la imagen de referencia de estilo (prompt A). Cuando te guste una, úsala como
   referencia en las siguientes: súbela con el botón "+" y escribe "Use the same art style as this image".
3. Pega cada prompt tal cual. Si sale algo raro (manos, texto ilegible, logos), pide: *"Same image, but remove any text
   and logos, and fix the hands."*
4. Descarga en la máxima resolución (botón de descarga) y renombra según la tabla.
5. Revisa con esta lista antes de guardar: ¿todos se ven adultos? ¿no hay logos ni banderas? ¿no hay texto inventado?

## Prompts

**A · Referencia de estilo** → `style-ref.png`
> Cinematic digital painting, warm dawn light, Arequipa (Peru) rooftop with the snow-capped Misti volcano in the
> background, white volcanic sillar stone walls, a small engineering workshop with a wooden table, sketches of rockets
> and satellites pinned on a board, an old leather notebook open on the table. Muted graphite and cream palette with
> orange and gold accents. Semi-realistic, clean shapes, no text, no logos, no flags. 16:9.

**B · Diapositiva 3, escena del equipo** → `slide3-team.png` (16:9)
> Same art style. Four adult scientists (all in their 30s to 50s) gathered around a wooden table on an Arequipa
> rooftop at dawn, the Misti volcano behind them. They look at a laptop showing a dark spacecraft-design interface with
> orange and gold charts. Dr. Pedro Goicochea, a Peruvian physicist in his 50s with short grey hair and a cream linen
> jacket, points at the screen; Chicho, a spacecraft engineer in his 30s with rolled-up sleeves and safety glasses on
> his head; Roberto, an astrophysicist in his 40s with glasses and a dark sweater; Franchesca, an astrobiologist in her
> 30s with a ponytail and a field vest. An open old notebook with rocket sketches lies on the table. A small geometric
> condor-shaped robot with stepped wings perches on the table edge. Warm, hopeful, cinematic. No text, no logos, no
> flags, no agency insignia.

**C · Retratos (uno por personaje, cuadrados 1:1)** → `portrait-goicochea.png`, `portrait-chicho.png`,
`portrait-roberto.png`, `portrait-franchesca.png`
> Same art style. Bust portrait of {DESCRIPCIÓN DEL PERSONAJE DEL PROMPT B}, three-quarter view, soft dawn rim light,
> plain dark graphite background, friendly confident expression. Adult. No text, no logos. Square 1:1.

**D · Fondo del menú (opcional)** → `bg-arequipa-dawn.png` (16:9, sin personas)
> Same art style. Wide view of Arequipa at dawn from a rooftop, the Misti volcano centered, a small launch tower far
> away on the high plain, first sunlight on the snow, deep blue to orange sky. No people, no text, no logos. 16:9.

## Qué hago yo (Claude) después
- Pongo la marca "AI-generated" visible en la esquina, recorto y optimizo (WebP) para el juego y las diapositivas.
- Declaro las imágenes y sus prompts en la sección de IA de la página del proyecto.
