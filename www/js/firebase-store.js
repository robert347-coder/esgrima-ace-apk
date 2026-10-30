/* =====================================================================
   ALMACÉN DE DATOS · FIREBASE (versión real)
   ---------------------------------------------------------------------
   Se usa automáticamente cuando rellenas "firebase" en config.js.
   - Firebase Authentication: cuentas con correo + contraseña.
   - Cloud Firestore: base de datos. Colecciones:
       socios/{ID}        ficha de cada deportista (cuotas, asistencias,
                          notas privadas, respuestas a eventos...)
       eventos/{id}       torneos, clases especiales, cenas
       noticias/{id}      tablón general
       ajustes/club       IBAN, Bizum, importes de cuotas, contacto del maestro
       competiciones/{id} competiciones de sala (poules + eliminatoria)
       mensajes/{id}      conversaciones familia <-> maestro
       admins/{correo}    quién es administrador (se crea a mano)
   Quién puede leer o escribir cada cosa lo deciden las REGLAS
   (archivo firestore.rules), no esta app.
   ===================================================================== */
(function () {
  const V = '10.12.2'; // versión del SDK de Firebase
  const URL = 'https://www.gstatic.com/firebasejs/' + V + '/';
  let fb = {};        // funciones de Firebase cargadas
  let auth, db;
  let usuarioActual = null;

  window.ACE_FirebaseStore = {
    modo: 'firebase',

    async init() {
      // Carga las librerías de Firebase solo cuando hacen falta
      const [appMod, authMod, fsMod] = await Promise.all([
        import(URL + 'firebase-app.js'),
        import(URL + 'firebase-auth.js'),
        import(URL + 'firebase-firestore.js')
      ]);
      fb = Object.assign({}, appMod, authMod, fsMod);
      const app = fb.initializeApp(window.ACE_CONFIG.firebase);
      auth = fb.getAuth(app);
      auth.languageCode = 'es';
      db = fb.getFirestore(app);
    },

    onAuth(cb) {
      fb.onAuthStateChanged(auth, async (u) => {
        if (!u) { usuarioActual = null; return cb(null); }
        const email = (u.email || '').toLowerCase();
        let esAdmin = false;
        if (u.emailVerified) {
          try { esAdmin = (await fb.getDoc(fb.doc(db, 'admins', email))).exists(); } catch (e) { esAdmin = false; }
        }
        usuarioActual = { email, verificado: u.emailVerified, esAdmin };
        cb(usuarioActual);
      });
    },

    async login(email, pass) { await fb.signInWithEmailAndPassword(auth, email.trim(), pass); },
    async registrar(email, pass) {
      const cred = await fb.createUserWithEmailAndPassword(auth, email.trim(), pass);
      await fb.sendEmailVerification(cred.user);
    },
    async recuperar(email) { await fb.sendPasswordResetEmail(auth, email.trim()); },
    async reenviarVerificacion() { if (auth.currentUser) await fb.sendEmailVerification(auth.currentUser); },
    async recargarUsuario() {
      if (!auth.currentUser) return;
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true); // refresca "email verificado" para las reglas
      location.reload();
    },
    async salir() { await fb.signOut(auth); },

    /* ---------- Socios ---------- */
    async listarSocios() {
      if (!usuarioActual) return [];
      const col = fb.collection(db, 'socios');
      const q = usuarioActual.esAdmin
        ? col
        : fb.query(col, fb.where('emailsAcceso', 'array-contains', usuarioActual.email));
      const snap = await fb.getDocs(q);
      return snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
    },
    async guardarSocio(socio) {
      const datos = Object.assign({}, socio); delete datos.id;
      await fb.setDoc(fb.doc(db, 'socios', socio.id), datos, { merge: true });
      return socio.id;
    },
    // cambios = { 'cuotas.T1': true, 'asistencias.2026-10-28': null }  (null = borrar)
    async actualizarSocio(id, cambios) {
      const datos = {};
      Object.keys(cambios).forEach((k) => { datos[k] = cambios[k] === null ? fb.deleteField() : cambios[k]; });
      await fb.updateDoc(fb.doc(db, 'socios', id), datos);
    },
    async borrarSocio(id) { await fb.deleteDoc(fb.doc(db, 'socios', id)); },

    /* ---------- Eventos y noticias ---------- */
    async listar(coleccion) {
      const snap = await fb.getDocs(fb.collection(db, coleccion));
      return snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
    },
    async anadir(coleccion, datos) { return (await fb.addDoc(fb.collection(db, coleccion), datos)).id; },
    async borrar(coleccion, id) { await fb.deleteDoc(fb.doc(db, coleccion, id)); },
    // Guarda un documento completo con un id elegido (competiciones)
    async guardarDoc(coleccion, id, datos) {
      const d = JSON.parse(JSON.stringify(datos)); delete d.id;
      await fb.setDoc(fb.doc(db, coleccion, id), d);
    },
    async actualizarDoc(coleccion, id, cambios) { await fb.updateDoc(fb.doc(db, coleccion, id), cambios); },

    /* ---------- Mensajes con el maestro ---------- */
    async listarMensajes() {
      if (!usuarioActual) return [];
      const col = fb.collection(db, 'mensajes');
      const q = usuarioActual.esAdmin ? col : fb.query(col, fb.where('emails', 'array-contains', usuarioActual.email));
      const snap = await fb.getDocs(q);
      return snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
    },

    /* ---------- Ajustes del club ---------- */
    async leerAjustes() {
      const s = await fb.getDoc(fb.doc(db, 'ajustes', 'club'));
      return s.exists() ? s.data() : { titular: '', iban: '', bizum: '', cuotas: {} };
    },
    async guardarAjustes(aj) { await fb.setDoc(fb.doc(db, 'ajustes', 'club'), aj, { merge: true }); }
  };
})();
