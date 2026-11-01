# Amazing Fencing en 4 apps

| App | Secciones | Identificador Android |
|---|---|---|
| AF Entrena | Aprender, Calentar, Tabata, Juegos (con los vídeos) | es.amazingfencing.entrena |
| AF Árbitro | Arbitrar, Preguntas | es.amazingfencing.arbitro |
| AF Entrenador | Entrenador (niveles I-III) | es.amazingfencing.entrenador |
| AF Competición | Competición, Director técnico | es.amazingfencing.competicion |

- `fuente/index.html` es la app original completa. Todo sale de ahí: si se mejora la fuente, mejoran las cuatro.
- Para cambiar qué sección va en cada app, edita `APPS` en `generar.py` y ejecuta `python3 generar.py`.
- Al subir los cambios, GitHub compila las 4 apps y las publica en «Releases» como `amazing-N`.
