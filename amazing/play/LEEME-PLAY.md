# Publicar las 5 apps de Amazing Fencing en Google Play

Cada carpeta (`entrena`, `arbitro`, `entrenador`, `competicion`, `peso`) contiene lo necesario para su ficha:
- `ficha.txt`: nombre, descripciones y categoría;
- `icono-512.png`;
- `grafico-destacado-1024x500.png`;
- capturas de pantalla.

Los archivos para subir (`AF-*.aab`, ya firmados) van aparte.

## 0. Antes de empezar (importante)
1. **Derechos de los contenidos.** La app AF Entrena incluye dos vídeos: uno de entrenamiento del Club de Esgrima de Alicante (2018) y un asalto en Murcia. Para publicarlos necesitas **permiso escrito** de quien los grabó o de los clubes. Sin ese permiso, quítalos (se cambia en `generar.py`: `videos=False`). Lo mismo vale para cualquier foto o vídeo de terceros.
   El personaje «Bob» y los textos propios son tuyos. Las preguntas del repositorio «q-n-a» tienen licencia MIT y la atribución ya aparece en la app.
2. **Política de privacidad.** Google exige una dirección web pública.
   - Rellena los corchetes de `privacidad.html` (nombre, dirección y correo).
   - Publícala, por ejemplo, con Google Sites (gratis) o con un documento de Google «Publicado en la web».
   - Usa la misma dirección para las 5 apps.
3. **Tipo de cuenta de desarrollador** (pago único de 25 $):
   - **Personal:** antes de pasar a producción, **cada app** debe superar una prueba cerrada con **12 probadores durante 14 días seguidos**. Con 5 apps, organiza a las mismas 12 personas (familias del club, por ejemplo) para que se apunten a las 5.
   - **Organización:** si lo publicáis a nombre del club o de una entidad, no hay que hacer esa prueba. Necesita un número **D-U-N-S** (gratuito, lo da Dun & Bradstreet en unos días).

## 1. Crear cada app (Play Console → Crear aplicación)
- Idioma predeterminado: Español (España). Tipo: Aplicación. Gratuita.
- Nombre: el de `ficha.txt`.

## 2. Contenido de la aplicación (menú «Política»)
| Apartado | Qué responder |
|---|---|
| Política de privacidad | La dirección pública de `privacidad.html` |
| Acceso a la aplicación | Todas las funciones están disponibles sin acceso especial |
| Anuncios | No contiene anuncios |
| Clasificación del contenido | Cuestionario IARC. Categoría «Referencia, noticias o educativa» (Árbitro, Entrenador) o «Otra». Responde «No» a violencia, sexo, drogas, apuestas, interacción entre usuarios y compras. Saldrá PEGI 3 o similar. |
| Público objetivo | **13 años o más** para Entrena, Árbitro, Entrenador y Competición; **18 años o más** para Peso y Dieta. Así no entra en el programa «Familias», que tiene requisitos extra. |
| Seguridad de los datos | Ver apartado 3 |
| Apps de salud | Entrena y Peso y Dieta: rellena la **declaración de apps de salud** marcando «Nutrición y control del peso» o «Fitness/actividad física». No son dispositivos médicos. |
| Aplicación gubernamental / financiera / noticias | No |

## 3. Seguridad de los datos (igual para las 5)
- ¿Tu app recoge o comparte alguno de los tipos de datos de usuario requeridos? **No**.
  Los datos se guardan solo en el dispositivo y Google no considera «recogida» lo que no sale del móvil. Las tipografías van dentro de la app, así que no hay conexiones a terceros.
- Prácticas de seguridad: no aplica cifrado en tránsito porque no se transmiten datos. Los usuarios pueden borrar sus datos desde los ajustes de Android.

## 4. Ficha de Play Store (Presencia en tienda → Ficha principal)
Copia los textos de `ficha.txt` y sube:
- el icono;
- el gráfico destacado;
- entre 2 y 8 capturas de teléfono.

Correo de contacto: pon uno que estés dispuesto a mostrar en público.

## 5. Subir la versión
1. **Pruebas → Prueba cerrada** (o **Prueba interna** para probar tú primero) → Crear versión.
2. Acepta **Firma de aplicaciones de Play** (recomendado). Google guarda la llave definitiva; la tuya es la «llave de subida».
3. Sube `AF-<app>.aab`. Nota de la versión: «Primera versión».
4. Añade a los probadores con una lista de correos y comparte con ellos el enlace de participación.
5. Si tu cuenta es personal, después de 14 días con 12 probadores aparece el botón para **solicitar acceso a producción**.

## 6. Actualizaciones
Cada vez que se suban cambios a GitHub se genera una versión con número mayor. Hay que firmar el `.aab` con tu llave de subida (o configurar los secretos de GitHub, ver más abajo) y subirlo como nueva versión.

## La llave de subida (`af-subida.jks`)
- Guárdala con su contraseña en **dos sitios seguros**: un gestor de contraseñas y una copia fuera del ordenador.
- Si la pierdes, con la Firma de aplicaciones de Play puedes pedir a Google que la cambie (Play Console → Integridad de la app). Aun así, evita perderla.
- **Firma automática en GitHub (opcional):** en el repositorio ve a Settings → Secrets and variables → Actions → New repository secret y crea estos tres secretos:
  - `AF_KEYSTORE_B64`: el contenido de `af-subida.jks.base64.txt`;
  - `AF_KEYSTORE_PASS`: la contraseña;
  - `AF_KEY_ALIAS`: `amazingfencing`.

  A partir de entonces, GitHub entrega los `.aab` ya firmados.
