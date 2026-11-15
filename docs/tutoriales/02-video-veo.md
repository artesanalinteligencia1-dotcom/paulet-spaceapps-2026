# Tutorial 2 — Video con Veo (dentro de Gemini)

**Para qué:** la intro "Goicochea y el cuaderno" en video (hoy existe una versión dibujada en código que la reemplaza
mientras tanto) y, si sobra tiempo, tomas cortas para el video del juego.
**Tiempo:** 30–45 minutos. **Costo:** incluido en Gemini Pro, pero **hay cupo diario de videos**: genera primero las
tomas 1 y 4, que son las más importantes.

## Pasos
1. En https://gemini.google.com elige la opción de **video (Veo)**.
2. **Sube como referencia** `style-ref.png` del tutorial 1 (y `portrait-goicochea.png` para las tomas con él) y escribe
   antes del prompt: *"Use this image as the visual reference for style and character."* Así las tomas se parecen entre sí.
3. Pega el prompt de cada toma. Cada video dura unos 8 s. Si una toma sale mal, cambia solo una cosa del prompt.
4. **Sin voz ni diálogo** (los videos del juego van solo con subtítulos). Si Veo agrega audio, no importa: Claude lo quita
   y pone la música del juego.
5. Descarga cada toma y guárdala como `intro-shot1.mp4` … `intro-shot4.mp4` en `C:\PPgame\media_raw\spaceapps\`.

## Prompts (8 s cada uno, 16:9)

**Toma 1 — Amanecer** 
> Slow cinematic push-in over the rooftops of Arequipa, Peru, at dawn. White sillar stone buildings, the snow-capped
> Misti volcano catching the first orange light, a calm deep-blue sky with fading stars. No people, no text, no logos.

**Toma 2 — El cuaderno**
> Close-up on a wooden table on a rooftop at dawn: an adult man's hands (a physicist in his 50s, cream linen sleeves)
> open an old leather notebook full of hand-drawn rocket engine sketches and equations. Warm light, dust in the air,
> shallow depth of field. No faces of children, no text that can be read, no logos.

**Toma 3 — Goicochea**
> Medium shot of Dr. Pedro Goicochea, a Peruvian physicist in his 50s with short grey hair and a cream linen jacket,
> reading the old notebook on the rooftop, then looking up at the Misti volcano with quiet determination. Dawn light,
> cinematic, slow camera move. Adult only. No text, no logos, no flags.

**Toma 4 — Kuntur**
> A small geometric robot condor made of flat dark panels with stepped wing feathers, a white zigzag collar and an
> orange stepped crest, standing on the edge of the table next to the open notebook. It spreads its wings, its small
> screen face lights up with two blue eyes, and it takes off towards the volcano at sunrise. Cinematic, no text, no logos.

## Qué hago yo (Claude) después
- Monto las cuatro tomas con HyperFrames (tutorial 4): subtítulos en inglés y español, música del juego y la marca
  **"AI-generated"** visible todo el tiempo.
- Lo cambio por la intro dibujada en código (o dejo las dos: video si existe, código como respaldo sin conexión).
