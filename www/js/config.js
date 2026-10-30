/* =====================================================================
   CONFIGURACIÓN DEL CLUB  ·  Almoradí Club de Esgrima
   ---------------------------------------------------------------------
   Este es el ÚNICO archivo que necesitas tocar para poner la app en
   marcha. Todo lo demás funciona solo.
   ===================================================================== */

window.ACE_CONFIG = {

  /* 1) CONEXIÓN CON FIREBASE (la "base de datos en la nube")
     -----------------------------------------------------------------
     Mientras esto valga null, la app funciona en MODO DEMO: datos de
     ejemplo guardados solo en el navegador de quien la abre.
     Cuando crees tu proyecto en Firebase (ver LEEME.md, paso 2),
     sustituye null por el bloque que te da Firebase, por ejemplo:

     firebase: {
       apiKey: "AIza...",
       authDomain: "almoradi-esgrima.firebaseapp.com",
       projectId: "almoradi-esgrima",
       storageBucket: "almoradi-esgrima.appspot.com",
       messagingSenderId: "1234567890",
       appId: "1:1234567890:web:abcdef"
     },
  */
  firebase: null,

  /* 2) DATOS DEL CLUB (aparecen en pantalla) */
  club: {
    nombre: 'Almoradí Club de Esgrima',
    siglas: 'ACE',
    temporada: '2026-2027',
    blog: 'https://almoradiclubesgrima.blogspot.com',
    blogTexto: 'almoradiclubesgrima.blogspot.com',
    instagram: 'https://www.instagram.com/AlmoradiEsgrima',
    facebook: 'https://www.facebook.com/search/top?q=Almorad%C3%AD%20Club%20Esgrima',
    // Versión del texto de consentimiento. Si cambias el texto, sube el
    // número: la app volverá a pedir la aceptación a todas las familias.
    versionConsentimiento: '2026-1',
    textoConsentimiento:
      'Doy mi consentimiento para que el Almoradí Club de Esgrima trate los datos facilitados ' +
      'exclusivamente para la gestión interna (asistencia, cobros y comunicaciones). ' +
      'Los datos no se cederán a terceros ajenos a la actividad deportiva.'
  },

  /* 3) GRUPOS DE ENTRENAMIENTO (según el dossier de especificaciones)
     diasSemana: 0=domingo, 1=lunes, 2=martes, 3=miércoles, 4=jueves... */
  grupos: {
    infantil: {
      nombre: 'Escuela Base', categoria: 'INFANTIL', edad: 'Menores de 12 años',
      dias: 'Lunes y Miércoles', diasSemana: [1, 3], horario: '17:30 - 18:30',
      entrenador: 'Prof. García', sala: 'Sala Central', requiereTutor: true
    },
    junior: {
      nombre: 'Desarrollo Deportivo', categoria: 'JUNIOR', edad: '12 a 17 años',
      dias: 'Martes y Jueves', diasSemana: [2, 4], horario: '18:00 - 19:30',
      entrenador: 'Mtro. Almoradí', sala: 'Sala Central', requiereTutor: true
    },
    senior: {
      nombre: 'Ocio y Competición', categoria: 'SENIOR', edad: '18 años o más',
      dias: 'Lunes a Jueves', diasSemana: [1, 2, 3, 4], horario: '20:00 - 21:30',
      entrenador: 'Mtro. Almoradí', sala: 'Sala Central', requiereTutor: false
    }
  },

  /* 4) TRIMESTRES DE COBRO */
  trimestres: [
    { id: 'T1', nombre: 'Oct-Dic', meses: [10, 11, 12] },
    { id: 'T2', nombre: 'Ene-Mar', meses: [1, 2, 3] },
    { id: 'T3', nombre: 'Abr-Jun', meses: [4, 5, 6] }
  ]
};
