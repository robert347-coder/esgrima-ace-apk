/* =====================================================================
   ALMACÉN DE DATOS · MODO DEMO
   ---------------------------------------------------------------------
   Imita a Firebase pero guarda todo en el propio navegador
   (localStorage). Sirve para probar y enseñar la app sin crear nada en
   la nube. Los datos son INVENTADOS y solo los ve quien abre la demo.
   ===================================================================== */
(function () {
  const CLAVE = 'ace-demo-v2';
  const C = window.ACE_CONFIG;
  let memoria = null;      // copia en memoria (por si el navegador bloquea localStorage)
  let usuario = null;      // usuario "logueado" en la demo
  let avisarAuth = () => {};

  /* ---------- Utilidades ---------- */
  const iso = (d) => {
    const z = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
  };
  const sumarDias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const copia = (o) => JSON.parse(JSON.stringify(o));
  const nuevoId = (pref) => pref + Math.random().toString(36).slice(2, 8);

  /* Marca días de entrenamiento pasados (últimas 5 semanas) como asistidos,
     con algunas faltas para que el calendario sea realista. */
  function asistenciasEjemplo(grupo, semilla) {
    const dias = C.grupos[grupo].diasSemana;
    const res = {};
    for (let i = 1; i <= 35; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (dias.includes(d.getDay()) && ((i + semilla) % 5 !== 0)) res[iso(d)] = true;
    }
    return res;
  }

  function datosIniciales() {
    const hoy = new Date().toISOString();
    const consentido = { aceptado: true, fecha: hoy, version: C.club.versionConsentimiento, por: 'familia@demo.es' };
    const s = (id, nombre, apellidos, nac, grupo, mano, arma, cuotas, extra) => Object.assign({
      id, nombre, apellidos, fechaNacimiento: nac, grupo, manoHabil: mano, arma,
      emailsAcceso: [], tutor: { nombre: '', telefono: '', email: '' }, telefonoEmergencia: '',
      cuotas, otrosPagos: [], notas: [], asistencias: asistenciasEjemplo(grupo, id.length + nombre.length),
      eventos: {}, consentimiento: consentido, consentimientoPapel: false, activo: true, creado: hoy
    }, extra || {});

    const socios = [
      s('ACE-2026-9X2B', 'Carlos Javier', 'Belmonte Ruiz', '2016-03-14', 'infantil', 'Diestro', 'Espada',
        { T1: true, T2: false, T3: false }, {
          emailsAcceso: ['familia@demo.es'],
          tutor: { nombre: 'Ana Ruiz Sánchez', telefono: '600 111 222', email: 'familia@demo.es' },
          telefonoEmergencia: '600 111 222',
          otrosPagos: [{ id: 'p1', concepto: 'Licencia federativa 2026-2027', importe: 30, fecha: sumarDias(-20), pagado: true }],
          notas: [{ id: 'n1', texto: 'Muy buena evolución en la guardia. Esta semana trabajamos el ataque simple con fondo: practica la distancia en casa con el pie adelantado.', fecha: sumarDias(-3), autor: 'Prof. García' }],
          consentimiento: null
        }),
      s('ACE-2026-3M7V', 'Lucía', 'Belmonte Ruiz', '2012-07-02', 'junior', 'Zurdo', 'Florete',
        { T1: false, T2: false, T3: false }, {
          emailsAcceso: ['familia@demo.es'],
          tutor: { nombre: 'Ana Ruiz Sánchez', telefono: '600 111 222', email: 'familia@demo.es' },
          telefonoEmergencia: '600 111 222',
          otrosPagos: [{ id: 'p2', concepto: 'Chaquetilla de entrenamiento', importe: 55, fecha: sumarDias(-10), pagado: false }]
        }),
      s('ACE-2026-4K9L', 'Alejandro', 'Sanz Gómez', '1994-11-21', 'senior', 'Diestro', 'Espada', { T1: false, T2: false, T3: false }, { emailsAcceso: ['alejandro@demo.es'] }),
      s('ACE-2026-1P5X', 'Elena', 'Morente Cano', '2017-01-09', 'infantil', 'Diestro', 'Espada', { T1: true, T2: false, T3: false },
        { emailsAcceso: ['morente@demo.es'], tutor: { nombre: 'Pedro Morente', telefono: '611 222 333', email: 'morente@demo.es' }, telefonoEmergencia: '611 222 333' }),
      s('ACE-2026-7H2D', 'Mateo', 'López Ruiz', '2011-05-30', 'junior', 'Diestro', 'Sable', { T1: true, T2: false, T3: false },
        { emailsAcceso: ['lopez@demo.es'], tutor: { nombre: 'Marta Ruiz', telefono: '622 333 444', email: 'lopez@demo.es' }, telefonoEmergencia: '622 333 444' }),
      s('ACE-2026-5R8T', 'Sara', 'Gil Méndez', '2015-09-18', 'infantil', 'Zurdo', 'Florete', { T1: true, T2: false, T3: false },
        { emailsAcceso: ['gil@demo.es'], tutor: { nombre: 'Jorge Gil', telefono: '633 444 555', email: 'gil@demo.es' }, telefonoEmergencia: '633 444 555' }),
      s('ACE-2026-2W6Q', 'Hugo', 'Navarro Pérez', '2010-02-11', 'junior', 'Diestro', 'Espada', { T1: true, T2: false, T3: false },
        { emailsAcceso: ['navarro@demo.es'], tutor: { nombre: 'Laura Pérez', telefono: '644 555 666', email: 'navarro@demo.es' }, telefonoEmergencia: '644 555 666' }),
      s('ACE-2026-8N3F', 'Irene', 'Castillo Mora', '1988-06-04', 'senior', 'Diestro', 'Sable', { T1: true, T2: false, T3: false }, { emailsAcceso: ['irene@demo.es'] }),
      s('ACE-2026-6J4Z', 'Pablo', 'Ferrández Sola', '2001-12-27', 'senior', 'Zurdo', 'Espada', { T1: true, T2: false, T3: false }, { emailsAcceso: ['pablo@demo.es'] }),
      s('ACE-2026-0C1M', 'Noa', 'Pastor Ibáñez', '2018-04-15', 'infantil', 'Diestro', 'Espada', { T1: false, T2: false, T3: false },
        { emailsAcceso: ['pastor@demo.es'], tutor: { nombre: 'Rocío Ibáñez', telefono: '655 666 777', email: 'pastor@demo.es' }, telefonoEmergencia: '655 666 777' })
    ];

    // Respuestas de ejemplo a eventos
    const ev1 = 'ev-torneo', ev2 = 'ev-magistral', ev3 = 'ev-cena';
    socios.forEach((x, i) => {
      if (x.emailsAcceso.includes('familia@demo.es')) return;
      if (i % 3 !== 0) x.eventos[ev1] = i % 4 !== 1;
      if (x.grupo !== 'infantil' && i % 2 === 0) x.eventos[ev2] = true;
    });

    return {
      socios,
      eventos: [
        { id: ev1, titulo: 'Torneo Interno de Otoño', fecha: sumarDias(15), hora: '10:00', lugar: 'Sala Central', grupos: ['infantil', 'junior', 'senior'], descripcion: 'Asaltos por categorías. Trae tu equipación completa y careta revisada.' },
        { id: ev2, titulo: 'Clase magistral de espada', fecha: sumarDias(19), hora: '17:30', lugar: 'Sala Central', grupos: ['junior', 'senior'], descripcion: 'Sesión técnica con maestro invitado.' },
        { id: ev3, titulo: 'Cena de Navidad del club', fecha: sumarDias(49), hora: '21:00', lugar: 'Por confirmar', grupos: ['infantil', 'junior', 'senior'], descripcion: 'Familias y deportistas. Confirma cuántos vendréis en el comentario del grupo.' }
      ],
      noticias: [
        { id: 'nt1', titulo: 'Licencias federativas 2026-2027', texto: 'Ya podéis tramitar la licencia de la nueva temporada. El importe se anota en "Otros pagos" de cada deportista.', fecha: sumarDias(-1) },
        { id: 'nt2', titulo: '¡Nuevas equipaciones disponibles!', texto: 'Chaquetillas y pantalones de entrenamiento con el escudo del club. Pedidos en sala hasta fin de mes.', fecha: sumarDias(-2) },
        { id: 'nt3', titulo: 'Bienvenida a la temporada', texto: 'Arrancamos la temporada con los tres grupos en la Sala Central. Revisad horarios en "Mi grupo".', fecha: sumarDias(-25) }
      ],
      ajustes: {
        titular: 'Almoradí Club de Esgrima',
        iban: 'ES00 0000 0000 0000 0000 0000',
        bizum: '00000',
        cuotas: { infantil: 45, junior: 45, senior: 45 },
        contacto: { nombre: 'Mtro. Almoradí', telefono: '600 000 000', email: 'maestro@demo.es', horario: 'Lunes a jueves, de 17:00 a 17:30 en sala' }
      },
      competiciones: [],
      semillaSala: true,
      mensajes: [
        { id: 'm1', socioId: 'ACE-2026-9X2B', socioNombre: 'Carlos Javier Belmonte Ruiz', emails: ['familia@demo.es'], autor: 'familia', autorEmail: 'familia@demo.es',
          texto: 'Hola, ¿Carlos necesita ya careta propia o puede seguir usando la del club este trimestre?', fecha: sumarDias(-4) + 'T18:42:00.000Z', leidoMaestro: true, leidoFamilia: true },
        { id: 'm2', socioId: 'ACE-2026-9X2B', socioNombre: 'Carlos Javier Belmonte Ruiz', emails: ['familia@demo.es'], autor: 'maestro', autorEmail: 'admin@demo.es', firma: 'Prof. García',
          texto: 'Puede seguir con la del club hasta Navidad. Para el torneo de primavera os recomiendo una careta de 350N; os paso modelos en sala.', fecha: sumarDias(-3) + 'T09:15:00.000Z', leidoMaestro: true, leidoFamilia: false },
        { id: 'm3', socioId: 'ACE-2026-7H2D', socioNombre: 'Mateo López Ruiz', emails: ['lopez@demo.es'], autor: 'familia', autorEmail: 'lopez@demo.es',
          texto: 'Mateo no podrá venir el jueves por un examen. ¿Puede recuperar el lunes con el grupo senior?', fecha: sumarDias(-1) + 'T20:05:00.000Z', leidoMaestro: false, leidoFamilia: true }
      ]
    };
  }

  /* ---------- Persistencia (con red de seguridad) ---------- */
  function cargar() {
    if (memoria) return memoria;
    try {
      const txt = localStorage.getItem(CLAVE);
      memoria = txt ? JSON.parse(txt) : datosIniciales();
    } catch (e) { memoria = datosIniciales(); }
    return memoria;
  }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(memoria)); } catch (e) { /* sin almacenamiento: seguimos en memoria */ }
  }

  /* Aplica cambios del tipo { 'cuotas.T1': true, 'asistencias.2026-10-28': null } */
  function aplicarCambios(obj, cambios) {
    Object.keys(cambios).forEach((ruta) => {
      const partes = ruta.split('.');
      let o = obj;
      for (let i = 0; i < partes.length - 1; i++) {
        if (typeof o[partes[i]] !== 'object' || o[partes[i]] === null) o[partes[i]] = {};
        o = o[partes[i]];
      }
      const ultima = partes[partes.length - 1];
      if (cambios[ruta] === null && partes.length > 1) delete o[ultima];
      else o[ultima] = cambios[ruta];
    });
  }

  const pausa = () => new Promise((r) => setTimeout(r, 60)); // simula la red

  /* ---------- API pública (la misma que el almacén de Firebase) ---------- */
  window.ACE_DemoStore = {
    modo: 'demo',
    async init() { cargar(); },

    onAuth(cb) { avisarAuth = cb; cb(usuario); },
    async entrarDemo(rol) {
      usuario = rol === 'admin'
        ? { email: 'admin@demo.es', verificado: true, esAdmin: true }
        : { email: 'familia@demo.es', verificado: true, esAdmin: false };
      avisarAuth(usuario);
    },
    async login() { throw new Error('En modo demo usa los botones de acceso rápido.'); },
    async registrar() { throw new Error('En modo demo no se crean cuentas.'); },
    async recuperar() { throw new Error('En modo demo no hay contraseñas.'); },
    async reenviarVerificacion() {},
    async salir() { usuario = null; avisarAuth(null); },

    async listarSocios() {
      await pausa();
      const todos = cargar().socios;
      if (!usuario) return [];
      return copia(usuario.esAdmin ? todos : todos.filter((s) => (s.emailsAcceso || []).includes(usuario.email)));
    },
    async guardarSocio(socio) {
      await pausa();
      const d = cargar();
      const i = d.socios.findIndex((s) => s.id === socio.id);
      if (i >= 0) d.socios[i] = Object.assign(d.socios[i], copia(socio));
      else d.socios.push(copia(socio));
      guardar();
      return socio.id;
    },
    async actualizarSocio(id, cambios) {
      await pausa();
      const s = cargar().socios.find((x) => x.id === id);
      if (!s) throw new Error('Socio no encontrado');
      aplicarCambios(s, copia(cambios));
      guardar();
    },
    async borrarSocio(id) {
      await pausa();
      const d = cargar();
      d.socios = d.socios.filter((s) => s.id !== id);
      guardar();
    },

    async listar(coleccion) { await pausa(); return copia(cargar()[coleccion] || []); },
    async anadir(coleccion, datos) {
      await pausa();
      const item = Object.assign({ id: nuevoId(coleccion.slice(0, 2) + '-') }, copia(datos));
      const d = cargar(); d[coleccion] = d[coleccion] || []; d[coleccion].push(item); guardar();
      return item.id;
    },
    async borrar(coleccion, id) {
      await pausa();
      const d = cargar();
      d[coleccion] = d[coleccion].filter((x) => x.id !== id); guardar();
    },

    async guardarDoc(coleccion, id, datos) {
      await pausa();
      const d = cargar(); d[coleccion] = d[coleccion] || [];
      const i = d[coleccion].findIndex((x) => x.id === id);
      const doc = Object.assign(copia(datos), { id });
      if (i >= 0) d[coleccion][i] = doc; else d[coleccion].push(doc);
      guardar();
    },
    async actualizarDoc(coleccion, id, cambios) {
      const x = (cargar()[coleccion] || []).find((y) => y.id === id);
      if (x) { aplicarCambios(x, copia(cambios)); guardar(); }
    },
    async listarMensajes() {
      await pausa();
      const todos = cargar().mensajes || [];
      if (!usuario) return [];
      return copia(usuario.esAdmin ? todos : todos.filter((m) => (m.emails || []).includes(usuario.email)));
    },
    // La primera vez que entra la administración en la demo se crea una competición de ejemplo
    async consumirSemillaSala() {
      const d = cargar(); if (d.semillaSala === false) return false;
      d.semillaSala = false; guardar(); return true;
    },

    async leerAjustes() { return copia(cargar().ajustes); },
    async guardarAjustes(aj) { cargar().ajustes = Object.assign(cargar().ajustes, copia(aj)); guardar(); },

    // Solo demo: volver a los datos de ejemplo
    async reiniciarDemo() {
      memoria = datosIniciales(); guardar();
    }
  };
})();
