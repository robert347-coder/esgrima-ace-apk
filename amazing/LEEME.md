# Amazing Fencing en 5 apps

| App | Secciones | Identificador Android |
|---|---|---|
| AF Entrena | Mi plan (ciclos, objetivos, recordatorio), Físico (rutinas con y sin pesas), Nutrición (dieta y suplementos), Aprender, Calentar, Tabata, Juegos | es.amazingfencing.entrena |
| AF Árbitro | Arbitrar, Preguntas | es.amazingfencing.arbitro |
| AF Entrenador | Entrenador (niveles I-III) | es.amazingfencing.entrenador |
| AF Competición | Competición, Director técnico | es.amazingfencing.competicion |
| AF Peso | Hoy, Mi dieta (con tus alimentos), Alimentos y equivalencias, Mi peso, Suplementos, Mis datos | es.amazingfencing.peso |

Las pantallas nuevas están en `extra/`: `entrena-plus.js`, `af-peso.js` y `suplementos.js` (compartido).

- `fuente/index.html` es la app original completa. Todo sale de ahí: si se mejora la fuente, mejoran las cuatro.
- Para cambiar qué sección va en cada app, edita `APPS` en `generar.py` y ejecuta `python3 generar.py`.
- Al subir los cambios, GitHub compila las 4 apps y las publica en «Releases» como `amazing-N`.
