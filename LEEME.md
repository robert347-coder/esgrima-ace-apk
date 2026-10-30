# Esgrima ACE: APK de prueba (modo demo)

Esta carpeta convierte la app en un **APK de Android** para probarla en el móvil sin crear nada en Firebase:
- Funciona en **modo demo**: datos inventados guardados solo en ese móvil.
- Puedes cambiar lo que quieras. Desinstalar la app borra los datos.
- Para empezar de cero sin desinstalar: Ajustes → «Restaurar datos de ejemplo».

## Opción A: que lo construya GitHub (sin instalar nada)
1. Crea una cuenta gratuita en https://github.com y un repositorio **privado** nuevo (por ejemplo `esgrima-ace-apk`).
2. En el repositorio, pulsa «Add file → Upload files» y arrastra **el contenido** de esta carpeta, incluida la carpeta oculta `.github`.
   > En Mac, para ver la carpeta oculta pulsa Cmd + Mayús + punto en el Finder.
3. Ve a la pestaña **Actions**. Verás «Construir APK» en marcha (tarda unos 5 minutos).
4. Cuando tenga el tic verde, entra y descarga **esgrima-ace-apk** (un .zip con el `app-debug.apk`).

## Opción B: en tu ordenador con Android Studio
1. Instala Node.js (LTS) y Android Studio.
2. En esta carpeta ejecuta: `npm install`, después `npx cap add android` y después `npx cap sync android`.
3. Ejecuta `npx cap open android`. En Android Studio, ve a Build → Build APK(s).

## Instalar el APK en el móvil
1. Pásalo al móvil (por correo, WhatsApp a ti mismo o cable) y ábrelo.
2. Android pedirá permitir «Instalar aplicaciones desconocidas» para esa app (Chrome, Archivos...). Acéptalo **solo para esta instalación**.
3. Es un APK **de pruebas** (firmado con una llave de desarrollo), así que no sirve para Google Play. Para la versión definitiva, sigue el apartado 9 del LEEME de la app.

## Pasar a datos reales
Rellena `firebase` en `www/js/config.js` (ver el LEEME principal) y vuelve a construir el APK.
