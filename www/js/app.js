/* =====================================================================
   ALMORADÍ CLUB DE ESGRIMA · APLICACIÓN
   ---------------------------------------------------------------------
   Toda la lógica de pantallas. Funciona igual con el almacén de demo y
   con el de Firebase; solo cambia de dónde salen los datos.

   Mapa del archivo:
     1. Utilidades (fechas, textos seguros, avisos)
     2. Estado y carga de datos
     3. Pantallas de acceso (login, verificación)
     4. Vista FAMILIA / DEPORTISTA
     5. Vista ADMINISTRACIÓN
     6. Ventanas emergentes (IBAN, confirmaciones...)
     7. Gestión de clics y formularios
     8. Arranque
   ===================================================================== */
(function () {
  'use strict';
  const C = window.ACE_CONFIG;
  const G = C.grupos;
  let S = null; // almacén de datos activo (demo o Firebase)

  /* =================================================================
     1. UTILIDADES
     ================================================================= */

  // Escapa texto para meterlo en HTML sin riesgo (evita inyección de código)
  const h = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const z = (n) => String(n).padStart(2, '0');
  const isoDe = (d) => d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
  const hoyISO = () => isoDe(new Date());
  const fechaDe = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); };
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const fechaLarga = (iso) => { const d = fechaDe(iso); return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()]; };
  const fechaCorta = (iso) => { const d = fechaDe(iso.slice(0, 10)); return z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear(); };
  const capital = (t) => t.charAt(0).toUpperCase() + t.slice(1);

  function haceCuanto(iso) {
    const dias = Math.round((fechaDe(hoyISO()) - fechaDe(iso.slice(0, 10))) / 86400000);
    if (dias <= 0) return 'Hoy';
    if (dias === 1) return 'Ayer';
    if (dias < 30) return 'Hace ' + dias + ' días';
    return fechaCorta(iso);
  }

  function edad(isoNac) {
    if (!isoNac) return null;
    const n = fechaDe(isoNac), h0 = new Date();
    let e = h0.getFullYear() - n.getFullYear();
    if (h0.getMonth() < n.getMonth() || (h0.getMonth() === n.getMonth() && h0.getDate() < n.getDate())) e--;
    return e;
  }
  const grupoPorEdad = (e) => (e == null ? 'infantil' : e < 12 ? 'infantil' : e < 18 ? 'junior' : 'senior');
  const esMenor = (s) => { const e = edad(s.fechaNacimiento); return e == null ? s.grupo !== 'senior' : e < 18; };

  // Trimestre en curso según el mes (julio-septiembre: no hay cuota)
  function trimestreActual() {
    const m = new Date().getMonth() + 1;
    return C.trimestres.find((t) => t.meses.includes(m)) || null;
  }

  const nombreCompleto = (s) => s.nombre + ' ' + s.apellidos;
  const iniciales = (s) => (s.nombre[0] || '') + (s.apellidos[0] || '');
  const nuevoIdSocio = () => 'ACE-' + new Date().getFullYear() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  const euros = (n) => (Number(n) || 0).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' €';

  function aviso(texto, tipo) {
    const t = document.getElementById('toast');
    t.textContent = texto;
    t.className = 'toast visible ' + (tipo || '');
    clearTimeout(aviso._t);
    aviso._t = setTimeout(() => { t.className = 'toast'; }, 2600);
  }

  // Traduce los errores de Firebase a algo comprensible
  function mensajeError(e) {
    const c = (e && e.code) || '';
    const mapa = {
      'auth/invalid-credential': 'Correo o contraseña incorrectos.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/user-not-found': 'No hay ninguna cuenta con ese correo.',
      'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Prueba a entrar o a recuperar la contraseña.',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
      'auth/invalid-email': 'Ese correo no parece válido.',
      'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
      'permission-denied': 'No tienes permiso para hacer esto.',
      'unavailable': 'Sin conexión. Revisa tu internet.'
    };
    return mapa[c] || (e && e.message) || 'Ha ocurrido un error.';
  }

  async function intentar(fn, ok) {
    try { await fn(); if (ok) aviso(ok, 'ok'); return true; }
    catch (e) { console.error(e); aviso(mensajeError(e), 'error'); return false; }
  }

  /* =================================================================
     2. ESTADO Y CARGA DE DATOS
     ================================================================= */
  const st = {
    cargando: true,
    usuario: null,
    socios: [], eventos: [], noticias: [], ajustes: {},
    vista: '',                 // pantalla actual
    socioSel: null,            // familia: deportista seleccionado
    fichaId: null,             // admin: socio abierto
    filtro: { texto: '', grupo: '', estado: '' },
    lista: { fecha: hoyISO(), grupo: '' },
    mesCal: null,              // calendario: primer día del mes mostrado
    modoAcceso: 'entrar',      // entrar | registrar | recuperar
    competiciones: [],         // sala: competiciones internas
    compId: null, compTab: '',
    mensajes: [],              // contacto con el maestro
    chatSocio: null            // admin: conversación abierta
  };

  async function cargarDatos() {
    const [socios, eventos, noticias, ajustes, competiciones, mensajes] = await Promise.all([
      S.listarSocios(), S.listar('eventos'), S.listar('noticias'), S.leerAjustes(),
      S.listar('competiciones').catch(() => []), S.listarMensajes().catch(() => [])
    ]);
    socios.sort((a, b) => (a.apellidos + a.nombre).localeCompare(b.apellidos + b.nombre, 'es'));
    eventos.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    noticias.sort((a, b) => b.fecha.localeCompare(a.fecha));
    mensajes.sort((a, b) => a.fecha.localeCompare(b.fecha));
    Object.assign(st, { socios, eventos, noticias, ajustes: ajustes || {}, competiciones, mensajes });
    if (!st.socioSel || !socios.find((s) => s.id === st.socioSel)) st.socioSel = socios[0] ? socios[0].id : null;
  }

  // Aplica un cambio en memoria para que la pantalla responda al instante
  function cambioLocal(id, cambios) {
    const s = st.socios.find((x) => x.id === id);
    if (!s) return;
    Object.keys(cambios).forEach((ruta) => {
      const p = ruta.split('.');
      let o = s;
      for (let i = 0; i < p.length - 1; i++) { if (!o[p[i]] || typeof o[p[i]] !== 'object') o[p[i]] = {}; o = o[p[i]]; }
      if (cambios[ruta] === null && p.length > 1) delete o[p[p.length - 1]]; else o[p[p.length - 1]] = cambios[ruta];
    });
  }

  async function actualizar(id, cambios, ok) {
    const copiaAntes = JSON.stringify(st.socios);
    cambioLocal(id, cambios); render();
    const bien = await intentar(() => S.actualizarSocio(id, cambios), ok);
    if (!bien) { st.socios = JSON.parse(copiaAntes); render(); }
  }

  const proximosEventos = (grupo) => st.eventos.filter((e) => e.fecha >= hoyISO() && (!grupo || (e.grupos || []).includes(grupo)));

  /* =================================================================
     PIEZAS COMUNES DE INTERFAZ
     ================================================================= */
  const LOGO = '<img class="logo" src="img/logo.png" alt="Escudo del Almoradí Club de Esgrima">';

  function cabecera(subtitulo, extra) {
    return `
      <header class="top">
        <div class="top-in">
          <div class="marca">${LOGO}
            <div><div class="marca-1">ALMORADÍ</div><div class="marca-2">${h(subtitulo)}</div></div>
          </div>
          <div class="top-acc">
            ${S.modo === 'demo' ? '<span class="chip-demo" title="Datos de ejemplo guardados solo en este navegador">DEMO</span>' : ''}
            ${extra || ''}
            <button class="btn-txt" data-act="salir">Salir</button>
          </div>
        </div>
      </header>`;
  }

  function pie() {
    return `
      <footer class="pie">
        <a href="${h(C.club.blog)}" target="_blank" rel="noopener"><span class="pie-et">Visita nuestro blog</span><span class="pie-url">${h(C.club.blogTexto)}</span></a>
        <div class="redes">
          <a href="${h(C.club.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">IG</a>
          <a href="${h(C.club.facebook)}" target="_blank" rel="noopener" aria-label="Facebook">FB</a>
        </div>
      </footer>`;
  }

  function navInferior(items) {
    const activo = (id) => st.vista === id || (id === 'socios' && (st.vista === 'ficha' || st.vista === 'alta')) || (id === 'sala' && st.vista === 'competicion');
    return `<nav class="nav" aria-label="Secciones">${items.map(([id, txt, ico, badge]) =>
      `<a href="#${id}" class="${activo(id) ? 'act' : ''}">${ICONOS[ico]}<span>${txt}</span>${badge ? `<b class="badge">${badge}</b>` : ''}</a>`).join('')}</nav>`;
  }

  // Iconos de trazo sencillos (sin dependencias externas)
  const svg = (p) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const ICONOS = {
    casa: svg('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>'),
    euro: svg('<path d="M17 6a7 7 0 1 0 0 12"/><path d="M4 10h9M4 14h9"/>'),
    cal: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
    carnet: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="12" r="2.5"/><path d="M14 10h4M14 14h4"/>'),
    panel: svg('<rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="5"/><rect x="13" y="10" width="8" height="11"/><rect x="3" y="13" width="8" height="8"/>'),
    socios: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>'),
    lista: svg('<path d="M9 6h12M9 12h12M9 18h12"/><path d="M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/>'),
    evento: svg('<path d="M4 20L20 4M14 4h6v6"/><path d="M4 4l6 6"/>'),
    noticia: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>'),
    sala: svg('<path d="M4 4l11 11M20 4L9 15"/><path d="M13 17l2-2 2 2-2 2zM11 17l-2-2-2 2 2 2z"/><path d="M5 19l2-2M19 19l-2-2"/>'),
    reloj: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M10 2h4M12 2v3"/>'),
    mensaje: svg('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>'),
    ajustes: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 15H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>')
  };

  const pill = (ok, txtOk, txtNo) => `<span class="pill ${ok ? 'ok' : 'pend'}">${ok ? '✓ ' + (txtOk || 'Pagado') : (txtNo || 'Pendiente')}</span>`;

  /* =================================================================
     3. PANTALLAS DE ACCESO
     ================================================================= */
  function vistaAcceso() {
    const demo = S.modo === 'demo';
    const m = st.modoAcceso;
    return `
      <main class="acceso">
        <div class="acceso-caja">
          <img class="acceso-logo" src="img/logo.png" alt="">
          <h1>ALMORADÍ<small>Club de Esgrima</small></h1>
          ${demo ? `
            <p class="nota">Versión de demostración con datos inventados. Lo que cambies se guarda solo en este navegador.</p>
            <div class="pila">
              <button class="btn" data-act="demo-familia">Entrar como familia</button>
              <button class="btn sec" data-act="demo-admin">Entrar como administración</button>
            </div>` : `
            <form data-form="${m}" class="pila" novalidate>
              <label>Correo electrónico<input id="acc-email" name="email" type="email" autocomplete="email" required></label>
              ${m !== 'recuperar' ? `<label>Contraseña<input id="acc-pass" name="pass" type="password" minlength="6" autocomplete="${m === 'registrar' ? 'new-password' : 'current-password'}" required></label>` : ''}
              <button class="btn" type="submit">${m === 'entrar' ? 'Entrar' : m === 'registrar' ? 'Crear cuenta' : 'Enviar enlace'}</button>
            </form>
            <div class="acceso-links">
              ${m !== 'entrar' ? '<button class="btn-txt" data-act="modo-entrar">Ya tengo cuenta</button>' : '<button class="btn-txt" data-act="modo-registrar">Primera vez: crear cuenta</button>'}
              ${m !== 'recuperar' ? '<button class="btn-txt" data-act="modo-recuperar">He olvidado mi contraseña</button>' : ''}
            </div>
            ${m === 'registrar' ? '<p class="nota">Usa el mismo correo que diste al club. Así la app te mostrará automáticamente a tus deportistas.</p>' : ''}`}
        </div>
      </main>`;
  }

  function vistaVerificar() {
    return `
      <main class="acceso"><div class="acceso-caja">
        <img class="acceso-logo" src="img/logo.png" alt="">
        <h2>Confirma tu correo</h2>
        <p>Te hemos enviado un enlace a <strong>${h(st.usuario.email)}</strong>. Ábrelo y vuelve aquí. Mira también en la carpeta de spam.</p>
        <div class="pila">
          <button class="btn" data-act="ya-verificado">Ya lo he confirmado</button>
          <button class="btn sec" data-act="reenviar">Reenviar correo</button>
          <button class="btn-txt" data-act="salir">Salir</button>
        </div>
      </div></main>`;
  }

  /* =================================================================
     4. VISTA FAMILIA / DEPORTISTA
     ================================================================= */
  function socioActual() { return st.socios.find((s) => s.id === st.socioSel); }

  function selectorDeportista() {
    if (st.socios.length < 2) return '';
    return `<div class="selector" role="tablist" aria-label="Deportista">${st.socios.map((s) =>
      `<button role="tab" aria-selected="${s.id === st.socioSel}" class="${s.id === st.socioSel ? 'act' : ''}" data-act="sel-socio" data-id="${h(s.id)}">${h(s.nombre.split(' ')[0])}</button>`).join('')}</div>`;
  }

  function vistaFamilia() {
    const s = socioActual();
    let cuerpo;
    if (!s) {
      cuerpo = `<section class="vacio"><h2>Aún no vemos a tu deportista</h2>
        <p>Tu correo <strong>${h(st.usuario.email)}</strong> no está vinculado a ninguna ficha. Pide al club que lo añada en la ficha del deportista y vuelve a entrar.</p></section>`;
    } else if (!consentimientoOk(s)) {
      cuerpo = bloqueConsentimiento(s);
    } else {
      const v = st.vista;
      cuerpo = v === 'pagos' ? famPagos(s) : v === 'calendario' ? famCalendario(s) : v === 'carnet' ? famCarnet(s)
        : v === 'sala' ? window.ACE_SALA.vistaFamilia(s) : v === 'contacto' ? famContacto(s) : famInicio(s);
    }
    const sinLeer = st.mensajes.filter((m) => m.autor === 'maestro' && !m.leidoFamilia).length;
    return `
      ${cabecera('Club de Esgrima')}
      <main class="cont fam">
        <div class="saludo"><h1>Hola${s && !esMenor(s) ? ', ' + h(s.nombre.split(' ')[0]) : ''}</h1>${selectorDeportista()}</div>
        ${cuerpo}
      </main>
      ${pie()}
      ${s && consentimientoOk(s) ? navInferior([['inicio', 'Inicio', 'casa'], ['pagos', 'Pagos', 'euro'], ['calendario', 'Agenda', 'cal'], ['sala', 'Sala', 'sala'], ['carnet', 'Carnet', 'carnet'], ['contacto', 'Maestro', 'mensaje', sinLeer]]) : ''}`;
  }

  /* ---------- Contacto con el maestro (familia) ---------- */
  function famContacto(s) {
    const c = st.ajustes.contacto || {};
    const hilo = st.mensajes.filter((m) => m.socioId === s.id);
    // marcar como leídos los mensajes del maestro
    const nuevos = hilo.filter((m) => m.autor === 'maestro' && !m.leidoFamilia);
    if (nuevos.length) setTimeout(() => nuevos.forEach((m) => { m.leidoFamilia = true; S.actualizarDoc('mensajes', m.id, { leidoFamilia: true }).catch(() => {}); }), 300);
    const dato = (et, val, href) => val ? `<div class="dato-copia"><span>${et}</span><code>${href ? `<a href="${h(href)}">${h(val)}</a>` : h(val)}</code><button class="btn peq sec" data-act="copiar" data-v="${h(val)}">Copiar</button></div>` : '';
    return `
      <section>
        <h2 class="sec-t">Contactar con el maestro</h2>
        <div class="tarjeta">
          <div class="maestro-cab"><div class="avatar">${h((c.nombre || G[s.grupo].entrenador).replace(/^(Prof\.|Mtro\.)\s*/, '').slice(0, 2))}</div>
            <div><strong>${h(c.nombre || G[s.grupo].entrenador)}</strong><span class="nota">${h(c.horario || 'Horario de atención: consulta en sala')}</span></div></div>
          ${dato('Teléfono', c.telefono, c.telefono ? 'tel:' + c.telefono.replace(/\s/g, '') : '')}
          ${dato('Correo', c.email, c.email ? 'mailto:' + c.email : '')}
          ${!c.telefono && !c.email ? '<p class="nota">El club aún no ha publicado un teléfono o correo. Puedes escribir aquí abajo.</p>' : ''}
        </div>
      </section>
      <section>
        <h2 class="sec-t">Mensajes <span class="sub">sobre ${h(s.nombre.split(' ')[0])} · solo los ve el club</span></h2>
        <div class="tarjeta chat">
          ${hilo.length ? hilo.map(burbuja('familia')).join('') : '<p class="nota">Aún no hay mensajes. Escribe tu consulta: ausencias, dudas técnicas, material, competiciones…</p>'}
          <form data-form="msg-familia" data-id="${h(s.id)}" class="chat-form">
            <textarea id="msg-texto" name="texto" rows="2" maxlength="1500" placeholder="Escribe al maestro…" required></textarea>
            <button class="btn" type="submit">Enviar</button>
          </form>
        </div>
        <p class="nota">Para urgencias durante el entrenamiento, llama por teléfono. Los mensajes se responden en el horario de atención.</p>
      </section>`;
  }

  const burbuja = (yo) => (m) => `
    <div class="msg ${m.autor === yo ? 'mio' : 'suyo'}">
      <p>${h(m.texto)}</p>
      <span class="meta">${m.autor === 'maestro' ? h(m.firma || 'Maestro') : h(m.autorEmail || 'Familia')} · ${h(haceCuanto(m.fecha))}${m.fecha ? ' ' + h(m.fecha.slice(11, 16)) : ''}</span>
    </div>`;

  /* ---------- Mensajes (administración) ---------- */
  function admMensajes() {
    const porSocio = {};
    st.mensajes.forEach((m) => { (porSocio[m.socioId] = porSocio[m.socioId] || []).push(m); });
    const conv = Object.keys(porSocio).map((id) => {
      const l = porSocio[id], ult = l[l.length - 1];
      return { id, ult, sinLeer: l.filter((m) => m.autor === 'familia' && !m.leidoMaestro).length, nombre: (st.socios.find((s) => s.id === id) ? nombreCompleto(st.socios.find((s) => s.id === id)) : l[0].socioNombre) };
    }).sort((a, b) => b.ult.fecha.localeCompare(a.ult.fecha));
    const abierta = st.chatSocio && (porSocio[st.chatSocio] || st.socios.find((x) => x.id === st.chatSocio)) ? st.chatSocio : null;
    let hilo = '';
    if (abierta) {
      const l = porSocio[abierta] || [], s = st.socios.find((x) => x.id === abierta);
      const nuevos = l.filter((m) => m.autor === 'familia' && !m.leidoMaestro);
      if (nuevos.length) setTimeout(() => { nuevos.forEach((m) => { m.leidoMaestro = true; S.actualizarDoc('mensajes', m.id, { leidoMaestro: true }).catch(() => {}); }); render(); }, 400);
      hilo = `
        <section class="tarjeta chat">
          <div class="tit-fila"><h2 class="sec-t">${h(s ? nombreCompleto(s) : (l[0] || {}).socioNombre)}</h2>
            ${s ? `<button class="btn-txt peq" data-act="abrir-ficha" data-id="${h(s.id)}">Ver ficha</button>` : ''}</div>
          ${s && s.tutor && s.tutor.telefono ? `<p class="nota">Tutor: ${h(s.tutor.nombre)} · ${h(s.tutor.telefono)}</p>` : ''}
          ${l.length ? l.map(burbuja('maestro')).join('') : '<p class="nota">Aún no hay mensajes con esta familia. Escribe el primero.</p>'}
          <form data-form="msg-maestro" data-id="${h(abierta)}" class="chat-form">
            <textarea id="rep-texto" name="texto" rows="2" maxlength="1500" placeholder="Responder a la familia…" required></textarea>
            <button class="btn" type="submit">Responder</button>
          </form>
        </section>`;
    }
    return `
      <h1 class="tit">Mensajes de las familias</h1>
      <div class="rejilla">
        <section class="tarjeta">
          ${conv.length ? conv.map((c) => `
            <button class="fila boton-fila ${c.id === abierta ? 'sel' : ''}" data-act="abrir-chat" data-id="${h(c.id)}">
              <div class="avatar">${h(c.nombre.split(' ').map((x) => x[0]).slice(0, 2).join(''))}</div>
              <div class="fila-txt"><strong>${h(c.nombre)}</strong><span>${c.ult.autor === 'maestro' ? 'Tú: ' : ''}${h(c.ult.texto)}</span></div>
              ${c.sinLeer ? `<b class="badge en-linea">${c.sinLeer}</b>` : `<span class="meta">${h(haceCuanto(c.ult.fecha))}</span>`}
            </button>`).join('') : '<p class="nota">No hay mensajes todavía. Cuando una familia escriba desde «Maestro», aparecerá aquí.</p>'}
          <p class="nota">Para escribir tú primero, abre la ficha del deportista y pulsa «Escribir a la familia».</p>
        </section>
        ${hilo || '<section class="tarjeta"><p class="nota">Elige una conversación.</p></section>'}
      </div>`;
  }

  const consentimientoOk = (s) => s.consentimiento && s.consentimiento.aceptado && s.consentimiento.version === C.club.versionConsentimiento;

  function bloqueConsentimiento(s) {
    const menor = esMenor(s);
    return `
      <section class="tarjeta consent">
        <h2>Antes de empezar</h2>
        <p>${menor
          ? `Como tutor/a legal de <strong>${h(nombreCompleto(s))}</strong>, necesitamos tu autorización para gestionar sus datos en la app.`
          : 'Necesitamos tu autorización para gestionar tus datos en la app.'}</p>
        <form data-form="consentir" data-id="${h(s.id)}" class="pila">
          <label class="check"><input id="cons-${h(s.id)}" type="checkbox" name="ok" required> <span>${h(C.club.textoConsentimiento)}</span></label>
          <p class="nota">Puedes consultar, corregir o pedir que se borren estos datos en cualquier momento hablando con la directiva del club.</p>
          <button class="btn" type="submit">Aceptar y continuar</button>
        </form>
      </section>`;
  }

  function famInicio(s) {
    const g = G[s.grupo];
    const t = trimestreActual();
    const ev = proximosEventos(s.grupo).slice(0, 3);
    const notas = (s.notas || []).slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 2);
    return `
      <section>
        <h2 class="sec-t">Mi grupo</h2>
        <div class="tarjeta grupo">
          <div class="grupo-cab cat-${h(s.grupo)}">${h(g.nombre)} · ${h(g.categoria)}</div>
          <dl class="datos">
            <div><dt>Horario</dt><dd>${h(g.dias)}, ${h(g.horario)}</dd></div>
            <div><dt>Entrenador</dt><dd>${h(g.entrenador)}</dd></div>
            <div><dt>Ubicación</dt><dd>${h(g.sala)}</dd></div>
            <div><dt>Arma</dt><dd>${h(s.arma || '—')} · ${h(s.manoHabil || '')}</dd></div>
          </dl>
        </div>
      </section>

      <section>
        <h2 class="sec-t">Confirmar asistencia</h2>
        <div class="tarjeta">
          ${ev.length ? ev.map((e) => filaEvento(e, s)).join('') : '<p class="nota">No hay eventos próximos para tu grupo.</p>'}
          <a class="btn sec ancho" href="#calendario">Ver calendario completo</a>
        </div>
      </section>

      <section>
        <h2 class="sec-t">Mis pagos</h2>
        <div class="tarjeta pago-res">
          ${t ? `
            <div class="pago-lin"><div><div class="pago-t">Cuota ${h(t.id)} · ${h(t.nombre)}</div>
              <div class="nota">${euros((st.ajustes.cuotas || {})[s.grupo])}</div></div>${pill(s.cuotas && s.cuotas[t.id])}</div>`
            : '<p class="nota">En verano no hay cuota trimestral.</p>'}
          <div class="fila-btn">
            <a class="btn sec" href="#pagos">Ver historial</a>
            <button class="btn" data-act="ver-iban">Datos de pago / IBAN</button>
          </div>
        </div>
      </section>

      ${notas.length ? `
      <section>
        <h2 class="sec-t">Muro personal <span class="sub">solo lo ves tú</span></h2>
        <div class="tarjeta">${notas.map((n) => `
          <article class="nota-maestro"><p>${h(n.texto)}</p><div class="meta">${h(n.autor || 'Maestro de armas')} · ${h(haceCuanto(n.fecha))}</div></article>`).join('')}
        </div>
      </section>` : ''}

      <section>
        <h2 class="sec-t">Tablón de noticias</h2>
        <div class="tarjeta">${st.noticias.length ? st.noticias.slice(0, 4).map(itemNoticia).join('') : '<p class="nota">Sin noticias por ahora.</p>'}</div>
      </section>`;
  }

  function filaEvento(e, s) {
    const r = s.eventos ? s.eventos[e.id] : undefined;
    return `
      <div class="evento">
        <div class="ev-fecha"><span>${fechaDe(e.fecha).getDate()}</span>${MESES[fechaDe(e.fecha).getMonth()].slice(0, 3)}</div>
        <div class="ev-txt"><strong>${h(e.titulo)}</strong><span>${h(capital(DIAS[fechaDe(e.fecha).getDay()]))} · ${h(e.hora || '')} · ${h(e.lugar || '')}</span></div>
        <div class="sino" role="group" aria-label="¿Asistirás a ${h(e.titulo)}?">
          <button class="${r === true ? 'si' : ''}" aria-pressed="${r === true}" data-act="responder" data-ev="${h(e.id)}" data-v="1">Iré</button>
          <button class="${r === false ? 'no' : ''}" aria-pressed="${r === false}" data-act="responder" data-ev="${h(e.id)}" data-v="0">No</button>
        </div>
      </div>`;
  }

  const itemNoticia = (n) => `
    <article class="noticia"><div class="not-cab"><strong>${h(n.titulo)}</strong><span class="meta">${h(haceCuanto(n.fecha))}</span></div>
    ${n.texto ? `<p>${h(n.texto)}</p>` : ''}</article>`;

  function famPagos(s) {
    const t = trimestreActual();
    const cuota = (st.ajustes.cuotas || {})[s.grupo];
    const otros = s.otrosPagos || [];
    return `
      <section>
        <h2 class="sec-t">Cuotas trimestrales · ${h(C.club.temporada)}</h2>
        <div class="tarjeta">
          ${C.trimestres.map((x) => `
            <div class="pago-lin ${t && t.id === x.id ? 'actual' : ''}">
              <div><div class="pago-t">${h(x.id)} · ${h(x.nombre)} ${t && t.id === x.id ? '<span class="etq">Actual</span>' : ''}</div>
              <div class="nota">${euros(cuota)}</div></div>
              ${pill(s.cuotas && s.cuotas[x.id])}
            </div>`).join('')}
        </div>
      </section>
      <section>
        <h2 class="sec-t">Otros pagos</h2>
        <div class="tarjeta">
          ${otros.length ? otros.map((p) => `
            <div class="pago-lin"><div><div class="pago-t">${h(p.concepto)}</div><div class="nota">${euros(p.importe)} · ${h(fechaCorta(p.fecha))}</div></div>${pill(p.pagado)}</div>`).join('')
            : '<p class="nota">No hay pagos puntuales anotados (licencias, equipación...).</p>'}
        </div>
      </section>
      <button class="btn ancho grande" data-act="ver-iban">Ver datos de pago / IBAN del club</button>
      <p class="nota centro">El club marca la cuota como pagada cuando recibe la transferencia o el Bizum. Puede tardar unos días.</p>`;
  }

  function famCalendario(s) {
    const g = G[s.grupo];
    if (!st.mesCal) { const d = new Date(); st.mesCal = new Date(d.getFullYear(), d.getMonth(), 1); }
    const m = st.mesCal;
    const inicio = (m.getDay() + 6) % 7; // lunes = 0
    const diasMes = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const hoy = hoyISO();
    const evs = st.eventos.filter((e) => (e.grupos || []).includes(s.grupo));
    let celdas = '', entrenos = 0, asistidos = 0;
    for (let i = 0; i < inicio; i++) celdas += '<div></div>';
    for (let d = 1; d <= diasMes; d++) {
      const f = new Date(m.getFullYear(), m.getMonth(), d), iso = isoDe(f);
      const entreno = g.diasSemana.includes(f.getDay());
      const fue = s.asistencias && s.asistencias[iso];
      const ev = evs.find((e) => e.fecha === iso);
      let cls = '';
      if (entreno && iso <= hoy) { entrenos++; if (fue) asistidos++; cls = fue ? 'fue' : 'falta'; }
      else if (entreno) cls = 'prox';
      if (fue && !entreno) cls = 'fue';
      celdas += `<div class="dia ${cls} ${iso === hoy ? 'hoy' : ''} ${ev ? 'ev' : ''}" title="${ev ? h(ev.titulo) : ''}">${d}</div>`;
    }
    const evMes = evs.filter((e) => e.fecha.slice(0, 7) === isoDe(m).slice(0, 7));
    return `
      <section>
        <div class="cal-cab">
          <button class="btn-ico" data-act="mes" data-d="-1" aria-label="Mes anterior">‹</button>
          <h2>${capital(MESES[m.getMonth()])} ${m.getFullYear()}</h2>
          <button class="btn-ico" data-act="mes" data-d="1" aria-label="Mes siguiente">›</button>
        </div>
        <div class="tarjeta">
          <div class="cal">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((x) => `<div class="cal-d">${x}</div>`).join('')}${celdas}</div>
          <div class="leyenda"><span><i class="l-fue"></i>Asistió</span><span><i class="l-falta"></i>No asistió</span><span><i class="l-prox"></i>Entreno</span><span><i class="l-ev"></i>Evento</span></div>
          ${entrenos ? `<p class="resumen">Asistencia este mes: <strong>${asistidos} de ${entrenos}</strong> entrenamientos</p>` : ''}
        </div>
      </section>
      ${evMes.length ? `<section><h2 class="sec-t">Eventos del mes</h2><div class="tarjeta">${evMes.map((e) => filaEvento(e, s)).join('')}</div></section>` : ''}`;
  }

  function famCarnet(s) {
    const g = G[s.grupo];
    setTimeout(() => pintarQR('qr-carnet', s.id), 0);
    return `
      <section class="carnet-wrap">
        <div class="carnet cat-${h(s.grupo)}">
          <div class="carnet-cab">${LOGO}<div><strong>ALMORADÍ</strong><span>Club de Esgrima</span></div><span class="carnet-temp">${h(C.club.temporada)}</span></div>
          <div class="carnet-cuerpo">
            <div class="avatar grande">${h(iniciales(s))}</div>
            <div class="carnet-datos">
              <div class="carnet-nombre">${h(s.nombre)}<br>${h(s.apellidos)}</div>
              <div class="carnet-id">${h(s.id)}</div>
              <div class="carnet-meta">${h(s.arma || '')} · ${h(s.manoHabil || '')}</div>
            </div>
          </div>
          <div class="carnet-qr"><div id="qr-carnet" class="qr" aria-label="Código QR del carnet"></div></div>
          <div class="carnet-banda">${h(g.categoria)} · ${h(g.nombre)}</div>
        </div>
        <p class="nota centro">Enseña este carnet en sala o en torneos. El código solo contiene tu número de socio.</p>
      </section>`;
  }

  function pintarQR(idEl, texto) {
    const el = document.getElementById(idEl);
    if (!el) return;
    if (typeof window.qrcode !== 'function') { el.innerHTML = `<div class="qr-alt">${h(texto)}</div>`; return; }
    const q = window.qrcode(0, 'M'); q.addData(texto); q.make();
    el.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  }

  /* =================================================================
     5. VISTA ADMINISTRACIÓN
     ================================================================= */
  function vistaAdmin() {
    const v = st.vista;
    if (v === 'marcador') return window.ACE_SALA.vista('marcador'); // pantalla completa
    const sinLeer = st.mensajes.filter((m) => m.autor === 'familia' && !m.leidoMaestro).length;
    const cuerpo = (v === 'sala' || v === 'competicion') ? window.ACE_SALA.vista(v) : v === 'mensajes' ? admMensajes() : v === 'socios' ? admSocios() : v === 'ficha' ? admFicha() : v === 'alta' ? admFormSocio(null)
      : v === 'lista' ? admLista() : v === 'eventos' ? admEventos() : v === 'noticias' ? admNoticias()
      : v === 'ajustes' ? admAjustes() : admPanel();
    return `
      ${cabecera('Administración')}
      <div class="adm">
        ${navInferior([['panel', 'Panel', 'panel'], ['socios', 'Socios', 'socios'], ['lista', 'Lista', 'lista'], ['sala', 'Sala', 'sala'], ['mensajes', 'Mensajes', 'mensaje', sinLeer], ['eventos', 'Eventos', 'evento'], ['noticias', 'Avisos', 'noticia'], ['ajustes', 'Ajustes', 'ajustes']])}
        <main class="cont adm-cont">${cuerpo}</main>
      </div>`;
  }

  function admPanel() {
    const t = trimestreActual();
    const activos = st.socios.filter((s) => s.activo !== false);
    const pagados = t ? activos.filter((s) => s.cuotas && s.cuotas[t.id]) : [];
    const pendientes = t ? activos.filter((s) => !(s.cuotas && s.cuotas[t.id])) : [];
    const sinConsent = activos.filter((s) => !consentimientoOk(s) && !s.consentimientoPapel);
    const prox = proximosEventos()[0];
    const hoyDia = new Date().getDay();
    const hoyEntrenan = Object.keys(G).filter((k) => G[k].diasSemana.includes(hoyDia));
    const porGrupo = Object.keys(G).map((k) => [k, activos.filter((s) => s.grupo === k).length]);
    return `
      <h1 class="tit">Panel del club</h1>
      <div class="kpis">
        <div class="kpi"><span>Socios activos</span><strong>${activos.length}</strong><small>${porGrupo.map(([k, n]) => G[k].categoria.slice(0, 3) + ' ' + n).join(' · ')}</small></div>
        <div class="kpi ok"><span>Cuotas al día ${t ? '· ' + t.id : ''}</span><strong>${t ? pagados.length + '/' + activos.length : '—'}</strong><small>${t ? h(t.nombre) : 'Verano'}</small></div>
        <div class="kpi ${pendientes.length ? 'alerta' : ''}"><span>Recibos pendientes</span><strong>${pendientes.length}</strong><small>${t ? euros(pendientes.reduce((a, s) => a + (Number((st.ajustes.cuotas || {})[s.grupo]) || 0), 0)) + ' por cobrar' : ''}</small></div>
        <div class="kpi"><span>Próximo evento</span><strong>${prox ? Object.values(st.socios).filter((s) => s.eventos && s.eventos[prox.id] === true).length : '—'}</strong><small>${prox ? 'confirmados · ' + h(prox.titulo) : 'Sin eventos'}</small></div>
      </div>

      <div class="rejilla">
        <section class="tarjeta">
          <h2 class="sec-t">Cuotas pendientes ${t ? '· ' + h(t.id) + ' ' + h(t.nombre) : ''}</h2>
          ${pendientes.length ? pendientes.map((s) => `
            <div class="fila">
              <div class="avatar">${h(iniciales(s))}</div>
              <div class="fila-txt"><strong>${h(nombreCompleto(s))}</strong><span>${h(G[s.grupo].categoria)} · ${euros((st.ajustes.cuotas || {})[s.grupo])}</span></div>
              <button class="btn peq" data-act="cuota" data-id="${h(s.id)}" data-t="${t.id}" data-v="1">Marcar pagado</button>
            </div>`).join('') : '<p class="nota">Todo al día. Buen trabajo.</p>'}
        </section>

        <div class="pila">
          <section class="tarjeta">
            <h2 class="sec-t">Hoy, ${h(fechaLarga(hoyISO()))}</h2>
            ${hoyEntrenan.length ? hoyEntrenan.map((k) => `
              <div class="fila"><div class="fila-txt"><strong>${h(G[k].nombre)}</strong><span>${h(G[k].horario)} · ${activos.filter((s) => s.grupo === k).length} deportistas</span></div>
              <button class="btn peq sec" data-act="ir-lista" data-g="${k}">Pasar lista</button></div>`).join('') : '<p class="nota">Hoy no hay entrenamientos.</p>'}
          </section>
          ${st.mensajes.some((m) => m.autor === 'familia' && !m.leidoMaestro) ? `
          <section class="tarjeta aviso-msg">
            <h2 class="sec-t">Mensajes sin leer</h2>
            ${[...new Set(st.mensajes.filter((m) => m.autor === 'familia' && !m.leidoMaestro).map((m) => m.socioId))].map((id) => {
              const m = st.mensajes.filter((x) => x.socioId === id).pop();
              return `<button class="fila boton-fila" data-act="abrir-chat" data-id="${h(id)}"><div class="fila-txt"><strong>${h(m.socioNombre)}</strong><span>${h(m.texto)}</span></div><span>›</span></button>`;
            }).join('')}
          </section>` : ''}
          ${sinConsent.length ? `
          <section class="tarjeta aviso-rgpd">
            <h2 class="sec-t">Sin consentimiento de datos</h2>
            <p class="nota">Estas familias aún no han aceptado la cláusula en la app ni consta firma en papel:</p>
            ${sinConsent.map((s) => `<a class="fila enlace" href="#ficha" data-act="abrir-ficha" data-id="${h(s.id)}"><div class="fila-txt"><strong>${h(nombreCompleto(s))}</strong></div><span>›</span></a>`).join('')}
          </section>` : ''}
          <section class="tarjeta">
            <h2 class="sec-t">Próximos eventos</h2>
            ${proximosEventos().slice(0, 3).map((e) => resumenEvento(e)).join('') || '<p class="nota">No hay eventos programados.</p>'}
          </section>
        </div>
      </div>`;
  }

  function respuestas(e) {
    const si = [], no = [], nada = [];
    st.socios.filter((s) => s.activo !== false && (e.grupos || []).includes(s.grupo)).forEach((s) => {
      const r = s.eventos ? s.eventos[e.id] : undefined;
      (r === true ? si : r === false ? no : nada).push(s);
    });
    return { si, no, nada };
  }

  function resumenEvento(e) {
    const r = respuestas(e);
    return `<div class="fila"><div class="fila-txt"><strong>${h(e.titulo)}</strong><span>${h(capital(fechaLarga(e.fecha)))} · ${h(e.hora || '')}</span></div>
      <button class="conteo" data-act="ver-respuestas" data-id="${h(e.id)}"><b class="c-si">${r.si.length}</b><b class="c-no">${r.no.length}</b><b class="c-nada">${r.nada.length}</b></button></div>`;
  }

  function sociosFiltrados() {
    const f = st.filtro, t = trimestreActual();
    const txt = f.texto.trim().toLowerCase();
    return st.socios.filter((s) => {
      if (f.grupo && s.grupo !== f.grupo) return false;
      if (f.estado === 'pendiente' && (!t || (s.cuotas && s.cuotas[t.id]))) return false;
      if (f.estado === 'aldia' && t && !(s.cuotas && s.cuotas[t.id])) return false;
      if (f.estado === 'baja' && s.activo !== false) return false;
      if (f.estado !== 'baja' && s.activo === false) return false;
      if (txt && !(nombreCompleto(s) + ' ' + s.id).toLowerCase().includes(txt)) return false;
      return true;
    });
  }

  function admSocios() {
    const lista = sociosFiltrados(), t = trimestreActual();
    return `
      <div class="tit-fila"><h1 class="tit">Socios <span class="cuenta">${lista.length}</span></h1>
        <a class="btn" href="#alta">+ Nuevo socio</a></div>
      <div class="filtros">
        <input id="f-texto" type="search" placeholder="Buscar por nombre o nº de socio" value="${h(st.filtro.texto)}" data-filtro="texto" aria-label="Buscar">
        <select id="f-grupo" data-filtro="grupo" aria-label="Grupo"><option value="">Todos los grupos</option>${Object.keys(G).map((k) => `<option value="${k}" ${st.filtro.grupo === k ? 'selected' : ''}>${h(G[k].nombre)}</option>`).join('')}</select>
        <select id="f-estado" data-filtro="estado" aria-label="Estado"><option value="">Todos los activos</option>
          <option value="pendiente" ${st.filtro.estado === 'pendiente' ? 'selected' : ''}>Cuota ${t ? t.id : ''} pendiente</option>
          <option value="aldia" ${st.filtro.estado === 'aldia' ? 'selected' : ''}>Al día</option>
          <option value="baja" ${st.filtro.estado === 'baja' ? 'selected' : ''}>Bajas</option></select>
      </div>
      <div class="tarjeta lista-socios">
        <div class="ls-cab"><span>Deportista</span><span>Cuotas ${h(C.club.temporada)}</span></div>
        ${lista.length ? lista.map((s) => `
          <div class="ls-fila">
            <button class="ls-persona" data-act="abrir-ficha" data-id="${h(s.id)}">
              <div class="avatar cat-${h(s.grupo)}">${h(iniciales(s))}</div>
              <div class="fila-txt"><strong>${h(s.apellidos)}, ${h(s.nombre)}</strong><span>${h(s.id)} · ${h(G[s.grupo].categoria)} · ${h(s.arma || '')} · ${h(s.manoHabil || '')}</span></div>
            </button>
            <div class="trims">${C.trimestres.map((x) => {
              const ok = s.cuotas && s.cuotas[x.id];
              return `<button class="trim ${ok ? 'ok' : ''} ${t && t.id === x.id ? 'actual' : ''}" aria-pressed="${!!ok}" title="${x.id} ${x.nombre}: ${ok ? 'pagado' : 'pendiente'}" data-act="cuota" data-id="${h(s.id)}" data-t="${x.id}" data-v="${ok ? 0 : 1}">${x.id}</button>`;
            }).join('')}</div>
          </div>`).join('') : '<p class="nota">No hay socios con estos filtros.</p>'}
      </div>
      <p class="nota">Pulsa T1, T2 o T3 para marcar o desmarcar una cuota como pagada. El trimestre en curso aparece recuadrado.</p>`;
  }

  function admFicha() {
    const s = st.socios.find((x) => x.id === st.fichaId);
    if (!s) return '<p>Socio no encontrado. <a href="#socios">Volver</a></p>';
    const asis = Object.keys(s.asistencias || {}).sort().reverse();
    const evs = st.eventos.filter((e) => s.eventos && s.eventos[e.id] !== undefined);
    return `
      <a class="volver" href="#socios">‹ Socios</a>
      <div class="ficha-cab">
        <div class="avatar grande cat-${h(s.grupo)}">${h(iniciales(s))}</div>
        <div><h1 class="tit">${h(nombreCompleto(s))}</h1>
        <p class="nota">${h(s.id)} · ${h(G[s.grupo].nombre)} (${h(G[s.grupo].categoria)}) · ${edad(s.fechaNacimiento) != null ? edad(s.fechaNacimiento) + ' años' : ''}</p>
        <p class="fila-btn"><button class="btn peq sec" data-act="abrir-chat" data-id="${h(s.id)}">Escribir a la familia</button></p>
        <p>${consentimientoOk(s) ? `<span class="pill ok">✓ Consentimiento en app · ${h(fechaCorta(s.consentimiento.fecha))}</span>` : s.consentimientoPapel ? '<span class="pill ok">✓ Consentimiento en papel</span>' : '<span class="pill pend">Sin consentimiento</span>'}</p></div>
      </div>

      <div class="rejilla">
        <div class="pila">
          <section class="tarjeta">
            <h2 class="sec-t">Cuotas trimestrales</h2>
            ${C.trimestres.map((x) => {
              const ok = s.cuotas && s.cuotas[x.id];
              return `<div class="pago-lin"><div class="pago-t">${x.id} · ${x.nombre}</div>
                <label class="interruptor"><input id="cu-${x.id}" type="checkbox" ${ok ? 'checked' : ''} data-act="cuota" data-id="${h(s.id)}" data-t="${x.id}" data-v="${ok ? 0 : 1}"><span></span>${ok ? 'Pagado' : 'Pendiente'}</label></div>`;
            }).join('')}
          </section>

          <section class="tarjeta">
            <h2 class="sec-t">Otros pagos</h2>
            ${(s.otrosPagos || []).map((p) => `
              <div class="pago-lin"><div><div class="pago-t">${h(p.concepto)}</div><div class="nota">${euros(p.importe)} · ${h(fechaCorta(p.fecha))}</div></div>
              <div class="fila-btn"><button class="pill ${p.pagado ? 'ok' : 'pend'} boton" data-act="otro-pago" data-id="${h(s.id)}" data-p="${h(p.id)}">${p.pagado ? '✓ Pagado' : 'Pendiente'}</button>
              <button class="btn-ico peq" aria-label="Borrar pago" data-act="borrar-pago" data-id="${h(s.id)}" data-p="${h(p.id)}">×</button></div></div>`).join('')}
            <form data-form="nuevo-pago" data-id="${h(s.id)}" class="mini-form">
              <input id="np-concepto" name="concepto" placeholder="Concepto (ej. Licencia federativa)" required>
              <input id="np-importe" name="importe" type="number" step="0.01" min="0" placeholder="€" required>
              <button class="btn peq" type="submit">Añadir</button>
            </form>
          </section>

          <section class="tarjeta">
            <h2 class="sec-t">Muro personal <span class="sub">lo ve solo esta familia</span></h2>
            ${(s.notas || []).slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).map((n) => `
              <article class="nota-maestro"><p>${h(n.texto)}</p><div class="meta">${h(n.autor || '')} · ${h(haceCuanto(n.fecha))}
              <button class="btn-txt peq" data-act="borrar-nota" data-id="${h(s.id)}" data-n="${h(n.id)}">Borrar</button></div></article>`).join('')}
            <form data-form="nueva-nota" data-id="${h(s.id)}" class="pila">
              <textarea id="nn-texto" name="texto" rows="3" placeholder="Indicaciones técnicas o notas para el deportista" required></textarea>
              <div class="mini-form"><input id="nn-autor" name="autor" value="${h(G[s.grupo].entrenador)}" aria-label="Firma"><button class="btn peq" type="submit">Publicar nota</button></div>
            </form>
          </section>

          <section class="tarjeta">
            <h2 class="sec-t">Asistencia · ${asis.length} entrenamientos</h2>
            <p class="nota">${asis.slice(0, 12).map((d) => fechaCorta(d)).join(' · ') || 'Sin asistencias registradas.'}</p>
            ${evs.length ? `<h3 class="sec-t peq">Eventos</h3>${evs.map((e) => `<p class="nota">${h(e.titulo)}: <strong>${s.eventos[e.id] ? 'Irá' : 'No irá'}</strong></p>`).join('')}` : ''}
          </section>
        </div>
        <div>${admFormSocio(s)}</div>
      </div>`;
  }

  function admFormSocio(s) {
    const n = !s;
    const v = s || { nombre: '', apellidos: '', fechaNacimiento: '', grupo: 'infantil', manoHabil: 'Diestro', arma: 'Espada', emailsAcceso: [], tutor: {}, telefonoEmergencia: '', consentimientoPapel: false, activo: true };
    const t = v.tutor || {};
    return `
      ${n ? '<a class="volver" href="#socios">‹ Socios</a><h1 class="tit">Alta de socio</h1>' : ''}
      <form data-form="socio" data-id="${n ? '' : h(v.id)}" class="tarjeta form" novalidate>
        ${n ? '' : '<h2 class="sec-t">Datos de la ficha</h2>'}
        <div class="campos">
          <label>Nombre *<input id="fs-nombre" name="nombre" value="${h(v.nombre)}" required></label>
          <label>Apellidos *<input id="fs-apellidos" name="apellidos" value="${h(v.apellidos)}" required></label>
          <label>Fecha de nacimiento *<input id="fs-nac" name="fechaNacimiento" type="date" value="${h(v.fechaNacimiento)}" required data-change="nac"></label>
          <label>Grupo *<select id="fs-grupo" name="grupo">${Object.keys(G).map((k) => `<option value="${k}" ${v.grupo === k ? 'selected' : ''}>${h(G[k].nombre)} (${h(G[k].categoria)})</option>`).join('')}</select></label>
          <label>Arma<select id="fs-arma" name="arma">${['Espada', 'Florete', 'Sable'].map((a) => `<option ${v.arma === a ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
          <label>Mano hábil<select id="fs-mano" name="manoHabil">${['Diestro', 'Zurdo'].map((a) => `<option ${v.manoHabil === a ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
        </div>
        <label>Correos con acceso a la app *<input id="fs-emails" name="emailsAcceso" value="${h((v.emailsAcceso || []).join(', '))}" placeholder="madre@correo.es, padre@correo.es" required>
          <small>Separados por comas. Para menores, el del tutor o tutores. Con ese correo se crean la cuenta y verán esta ficha.</small></label>

        <fieldset class="tutor">
          <legend>Tutor legal y urgencias <small>(obligatorio para menores de 18)</small></legend>
          <div class="campos">
            <label>Nombre del tutor<input id="fs-tnombre" name="tutorNombre" value="${h(t.nombre)}"></label>
            <label>Teléfono del tutor<input id="fs-ttel" name="tutorTelefono" type="tel" value="${h(t.telefono)}"></label>
            <label>Correo del tutor<input id="fs-temail" name="tutorEmail" type="email" value="${h(t.email)}"></label>
            <label>Teléfono de emergencia<input id="fs-urg" name="telefonoEmergencia" type="tel" value="${h(v.telefonoEmergencia)}"></label>
          </div>
        </fieldset>

        <label class="check"><input id="fs-papel" type="checkbox" name="consentimientoPapel" ${v.consentimientoPapel ? 'checked' : ''}> <span>La familia ha firmado la hoja de protección de datos en papel</span></label>
        <label class="check"><input id="fs-activo" type="checkbox" name="activo" ${v.activo !== false ? 'checked' : ''}> <span>Socio activo (desmárcalo para dar de baja sin borrar el historial)</span></label>
        <p class="error" id="fs-error" hidden></p>
        <div class="fila-btn">
          <button class="btn" type="submit">${n ? 'Dar de alta' : 'Guardar cambios'}</button>
          ${n ? '' : `<button class="btn peligro" type="button" data-act="pedir-borrar" data-id="${h(v.id)}">Borrar ficha</button>`}
        </div>
      </form>`;
  }

  function admLista() {
    const fecha = st.lista.fecha;
    const dia = fechaDe(fecha).getDay();
    if (!st.lista.grupo) st.lista.grupo = Object.keys(G).find((k) => G[k].diasSemana.includes(dia)) || 'infantil';
    const g = st.lista.grupo;
    const lista = st.socios.filter((s) => s.grupo === g && s.activo !== false);
    const presentes = lista.filter((s) => s.asistencias && s.asistencias[fecha]).length;
    return `
      <h1 class="tit">Pase de lista</h1>
      <div class="filtros">
        <input id="pl-fecha" type="date" value="${h(fecha)}" max="${hoyISO()}" data-change="lista-fecha" aria-label="Fecha">
        <select id="pl-grupo" data-change="lista-grupo" aria-label="Grupo">${Object.keys(G).map((k) => `<option value="${k}" ${g === k ? 'selected' : ''}>${h(G[k].nombre)}${G[k].diasSemana.includes(dia) ? ' · entrena este día' : ''}</option>`).join('')}</select>
      </div>
      <div class="tarjeta">
        <div class="lista-cab"><span>${h(capital(fechaLarga(fecha)))} · ${h(G[g].horario)}</span><strong>${presentes} / ${lista.length} presentes</strong></div>
        ${!G[g].diasSemana.includes(dia) ? '<p class="nota aviso">Este grupo no entrena este día de la semana. Puedes pasar lista igualmente (por ejemplo, para una recuperación).</p>' : ''}
        ${lista.map((s) => {
          const p = s.asistencias && s.asistencias[fecha];
          return `<button class="asis ${p ? 'si' : ''}" aria-pressed="${!!p}" data-act="asistencia" data-id="${h(s.id)}">
            <div class="avatar">${h(iniciales(s))}</div><div class="fila-txt"><strong>${h(nombreCompleto(s))}</strong><span>${h(s.arma || '')}</span></div>
            <span class="marca-asis">${p ? '✓ Presente' : 'Tocar si viene'}</span></button>`;
        }).join('') || '<p class="nota">No hay socios activos en este grupo.</p>'}
      </div>`;
  }

  function admEventos() {
    const prox = proximosEventos(), pas = st.eventos.filter((e) => e.fecha < hoyISO()).reverse();
    return `
      <h1 class="tit">Eventos</h1>
      <div class="rejilla">
        <form data-form="evento" class="tarjeta form">
          <h2 class="sec-t">Nuevo evento</h2>
          <label>Título *<input id="ev-titulo" name="titulo" required placeholder="Torneo interno, clase magistral, cena..."></label>
          <div class="campos">
            <label>Fecha *<input id="ev-fecha" name="fecha" type="date" min="${hoyISO()}" required></label>
            <label>Hora<input id="ev-hora" name="hora" type="time"></label>
          </div>
          <label>Lugar<input id="ev-lugar" name="lugar" value="Sala Central"></label>
          <fieldset><legend>Grupos convocados</legend><div class="checks">${Object.keys(G).map((k) => `<label class="check"><input id="ev-g-${k}" type="checkbox" name="grupos" value="${k}" checked> <span>${h(G[k].nombre)}</span></label>`).join('')}</div></fieldset>
          <label>Descripción<textarea id="ev-desc" name="descripcion" rows="3"></textarea></label>
          <button class="btn" type="submit">Publicar evento</button>
        </form>
        <div class="pila">
          <section class="tarjeta"><h2 class="sec-t">Próximos <span class="sub">verde: irán · rojo: no · gris: sin respuesta</span></h2>
            ${prox.map((e) => `${resumenEvento(e)}`).join('') || '<p class="nota">No hay eventos próximos.</p>'}</section>
          ${pas.length ? `<section class="tarjeta"><h2 class="sec-t">Pasados</h2>${pas.slice(0, 5).map(resumenEvento).join('')}</section>` : ''}
        </div>
      </div>`;
  }

  function admNoticias() {
    return `
      <h1 class="tit">Tablón de noticias</h1>
      <div class="rejilla">
        <form data-form="noticia" class="tarjeta form">
          <h2 class="sec-t">Publicar aviso</h2>
          <label>Título *<input id="no-titulo" name="titulo" required></label>
          <label>Texto<textarea id="no-texto" name="texto" rows="4"></textarea></label>
          <p class="nota">Lo verán todas las familias y deportistas. Para un mensaje a una sola persona usa el muro personal de su ficha.</p>
          <button class="btn" type="submit">Publicar</button>
        </form>
        <section class="tarjeta">
          ${st.noticias.map((n) => `<div class="noticia-adm">${itemNoticia(n)}<button class="btn-txt peq" data-act="borrar-noticia" data-id="${h(n.id)}">Borrar</button></div>`).join('') || '<p class="nota">No hay noticias publicadas.</p>'}
        </section>
      </div>`;
  }

  function admAjustes() {
    const a = st.ajustes, cu = a.cuotas || {};
    return `
      <h1 class="tit">Ajustes del club</h1>
      <div class="rejilla">
        <form data-form="ajustes" class="tarjeta form">
          <h2 class="sec-t">Datos de pago</h2>
          <p class="nota">Es lo que ven las familias al pulsar «Datos de pago / IBAN».</p>
          <label>Titular de la cuenta<input id="aj-titular" name="titular" value="${h(a.titular)}"></label>
          <label>IBAN<input id="aj-iban" name="iban" value="${h(a.iban)}" placeholder="ES00 0000 0000 0000 0000 0000"></label>
          <label>Teléfono o código Bizum<input id="aj-bizum" name="bizum" value="${h(a.bizum)}"></label>
          <h2 class="sec-t">Contacto del maestro</h2>
          <p class="nota">Aparece en la sección «Maestro» de las familias.</p>
          <div class="campos">
            <label>Nombre<input id="aj-mnom" name="mNombre" value="${h((a.contacto || {}).nombre)}" placeholder="Mtro. Almoradí"></label>
            <label>Teléfono<input id="aj-mtel" name="mTelefono" type="tel" value="${h((a.contacto || {}).telefono)}"></label>
            <label>Correo<input id="aj-memail" name="mEmail" type="email" value="${h((a.contacto || {}).email)}"></label>
            <label>Horario de atención<input id="aj-mhor" name="mHorario" value="${h((a.contacto || {}).horario)}" placeholder="L-J de 17:00 a 17:30"></label>
          </div>
          <h2 class="sec-t">Cuota trimestral por grupo (€)</h2>
          <div class="campos">${Object.keys(G).map((k) => `<label>${h(G[k].nombre)}<input id="aj-c-${k}" name="cuota-${k}" type="number" min="0" step="0.01" value="${h(cu[k] == null ? '' : cu[k])}"></label>`).join('')}</div>
          <button class="btn" type="submit">Guardar ajustes</button>
        </form>
        <section class="tarjeta">
          <h2 class="sec-t">Grupos y horarios</h2>
          ${Object.keys(G).map((k) => `<div class="fila"><div class="avatar cat-${k}">${G[k].categoria[0]}</div><div class="fila-txt"><strong>${h(G[k].nombre)} · ${h(G[k].categoria)}</strong><span>${h(G[k].dias)}, ${h(G[k].horario)} · ${h(G[k].entrenador)}</span></div></div>`).join('')}
          <p class="nota">Los grupos y horarios se cambian en el archivo <code>js/config.js</code>.</p>
          ${S.modo === 'demo' ? '<h2 class="sec-t">Demostración</h2><button class="btn sec" data-act="reiniciar-demo">Restaurar datos de ejemplo</button>'
            : '<h2 class="sec-t">Copia de seguridad</h2><button class="btn sec" data-act="exportar">Descargar socios (CSV)</button><p class="nota">Guárdala en un lugar seguro: contiene datos personales de menores.</p>'}
        </section>
      </div>`;
  }

  /* =================================================================
     6. VENTANAS EMERGENTES
     ================================================================= */
  function abrirModal(html) {
    const m = document.getElementById('modal');
    m.innerHTML = `<div class="modal-fondo" data-act="cerrar-modal"></div><div class="modal-caja" role="dialog" aria-modal="true">${html}<button class="modal-x" data-act="cerrar-modal" aria-label="Cerrar">×</button></div>`;
    m.hidden = false;
    const f = m.querySelector('button, input'); if (f) f.focus();
  }
  function cerrarModal() { const m = document.getElementById('modal'); m.hidden = true; m.innerHTML = ''; }

  function modalIban() {
    const a = st.ajustes, s = socioActual(), t = trimestreActual();
    const concepto = s ? `${s.id} ${t ? t.id : ''} ${s.nombre.split(' ')[0]} ${s.apellidos.split(' ')[0]}`.replace(/\s+/g, ' ') : '';
    const falta = !a.iban || /^ES00/.test(a.iban.replace(/\s/g, ''));
    const fila = (et, val) => `<div class="dato-copia"><span>${et}</span><code>${h(val)}</code><button class="btn peq sec" data-act="copiar" data-v="${h(val)}">Copiar</button></div>`;
    abrirModal(`
      <h2>Datos de pago del club</h2>
      ${falta ? '<p class="nota aviso">El club todavía no ha configurado su IBAN real. Estos datos son de ejemplo: no hagas ninguna transferencia.</p>' : ''}
      ${fila('Titular', a.titular || C.club.nombre)}
      ${fila('IBAN', a.iban || '—')}
      ${a.bizum ? fila('Bizum', a.bizum) : ''}
      ${s ? fila('Concepto', concepto) : ''}
      ${s ? `<p class="nota">Importe de la cuota de ${h(G[s.grupo].nombre)}: <strong>${euros((a.cuotas || {})[s.grupo])}</strong>. Pon el concepto tal cual para que el club identifique el pago.</p>` : ''}`);
  }

  function modalRespuestas(id) {
    const e = st.eventos.find((x) => x.id === id); if (!e) return;
    const r = respuestas(e);
    const bloque = (t, arr, cls) => `<h3 class="sec-t ${cls}">${t} · ${arr.length}</h3><p class="nota">${arr.map((s) => h(nombreCompleto(s))).join(', ') || '—'}</p>`;
    abrirModal(`<h2>${h(e.titulo)}</h2><p class="nota">${h(capital(fechaLarga(e.fecha)))} · ${h(e.hora || '')} · ${h(e.lugar || '')}</p>
      ${e.descripcion ? `<p>${h(e.descripcion)}</p>` : ''}
      ${bloque('Irán', r.si, 'c-si')}${bloque('No irán', r.no, 'c-no')}${bloque('Sin respuesta', r.nada, '')}
      ${e.fecha >= hoyISO() ? '' : ''}
      <button class="btn peligro peq" data-act="borrar-evento" data-id="${h(e.id)}">Borrar evento</button>`);
  }

  function modalBorrarSocio(id) {
    const s = st.socios.find((x) => x.id === id); if (!s) return;
    abrirModal(`<h2>¿Borrar la ficha de ${h(nombreCompleto(s))}?</h2>
      <p>Se eliminan sus datos, cuotas, notas y asistencias. No se puede deshacer.</p>
      <p class="nota">Si solo deja el club esta temporada, mejor desmarca «Socio activo»: conservas el historial.</p>
      <div class="fila-btn"><button class="btn peligro" data-act="borrar-socio" data-id="${h(id)}">Sí, borrar</button><button class="btn sec" data-act="cerrar-modal">Cancelar</button></div>`);
  }

  /* =================================================================
     7. CLICS Y FORMULARIOS
     ================================================================= */
  document.addEventListener('click', async (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el) return;
    const a = el.dataset.act, id = el.dataset.id;
    if (el.tagName === 'A' && a === 'abrir-ficha') ev.preventDefault();

    switch (a) {
      case 'demo-familia': await S.entrarDemo('familia'); break;
      case 'demo-admin': await S.entrarDemo('admin'); break;
      case 'modo-entrar': st.modoAcceso = 'entrar'; render(); break;
      case 'modo-registrar': st.modoAcceso = 'registrar'; render(); break;
      case 'modo-recuperar': st.modoAcceso = 'recuperar'; render(); break;
      case 'reenviar': await intentar(() => S.reenviarVerificacion(), 'Correo reenviado'); break;
      case 'ya-verificado': await intentar(() => S.recargarUsuario()); break;
      case 'salir': cerrarModal(); await S.salir(); break;

      case 'sel-socio': st.socioSel = id; render(); break;
      case 'responder': {
        const s = socioActual();
        const v = el.dataset.v === '1';
        const actual = s.eventos ? s.eventos[el.dataset.ev] : undefined;
        await actualizar(s.id, { ['eventos.' + el.dataset.ev]: actual === v ? null : v }, actual === v ? 'Respuesta quitada' : v ? '¡Apuntado!' : 'Anotado: no asistirás');
        break;
      }
      case 'mes': st.mesCal = new Date(st.mesCal.getFullYear(), st.mesCal.getMonth() + Number(el.dataset.d), 1); render(); break;
      case 'ver-iban': modalIban(); break;
      case 'copiar': {
        const v = el.dataset.v;
        try { await navigator.clipboard.writeText(v); aviso('Copiado', 'ok'); }
        catch (e) { const c = el.previousElementSibling; const r = document.createRange(); r.selectNodeContents(c); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); aviso('Selecciona y copia el texto'); }
        break;
      }
      case 'cerrar-modal': cerrarModal(); break;

      // --- Administración ---
      case 'abrir-ficha': st.fichaId = id; ir('ficha'); break;
      case 'cuota': {
        ev.preventDefault();
        const v = el.dataset.v === '1';
        const s = st.socios.find((x) => x.id === id);
        await actualizar(id, { ['cuotas.' + el.dataset.t]: v }, `${el.dataset.t} de ${s.nombre.split(' ')[0]}: ${v ? 'pagado' : 'pendiente'}`);
        break;
      }
      case 'otro-pago': {
        const s = st.socios.find((x) => x.id === id);
        const pagos = (s.otrosPagos || []).map((p) => p.id === el.dataset.p ? Object.assign({}, p, { pagado: !p.pagado }) : p);
        await actualizar(id, { otrosPagos: pagos }, 'Pago actualizado'); break;
      }
      case 'borrar-pago': {
        const s = st.socios.find((x) => x.id === id);
        await actualizar(id, { otrosPagos: (s.otrosPagos || []).filter((p) => p.id !== el.dataset.p) }, 'Pago borrado'); break;
      }
      case 'borrar-nota': {
        const s = st.socios.find((x) => x.id === id);
        await actualizar(id, { notas: (s.notas || []).filter((n) => n.id !== el.dataset.n) }, 'Nota borrada'); break;
      }
      case 'asistencia': {
        const s = st.socios.find((x) => x.id === id);
        const f = st.lista.fecha;
        await actualizar(id, { ['asistencias.' + f]: s.asistencias && s.asistencias[f] ? null : true });
        break;
      }
      case 'ir-lista': st.lista = { fecha: hoyISO(), grupo: el.dataset.g }; ir('lista'); break;
      case 'ver-respuestas': modalRespuestas(id); break;
      case 'borrar-evento':
        if (await intentar(() => S.borrar('eventos', id), 'Evento borrado')) { cerrarModal(); st.eventos = st.eventos.filter((e) => e.id !== id); render(); }
        break;
      case 'borrar-noticia':
        if (await intentar(() => S.borrar('noticias', id), 'Noticia borrada')) { st.noticias = st.noticias.filter((n) => n.id !== id); render(); }
        break;
      case 'pedir-borrar': modalBorrarSocio(id); break;
      case 'borrar-socio':
        if (await intentar(() => S.borrarSocio(id), 'Ficha borrada')) { cerrarModal(); st.socios = st.socios.filter((s) => s.id !== id); ir('socios'); }
        break;
      case 'reiniciar-demo': await S.reiniciarDemo(); await cargarDatos(); render(); aviso('Datos de ejemplo restaurados', 'ok'); break;
      case 'exportar': exportarCSV(); break;
      case 'abrir-chat': st.chatSocio = id; ir('mensajes'); break;
      default:
        if (window.ACE_SALA.acciones[a]) await window.ACE_SALA.acciones[a](el, ev);
    }
  });

  // Filtros de la lista de socios (al escribir)
  document.addEventListener('input', (ev) => {
    const f = ev.target.dataset && ev.target.dataset.filtro;
    if (!f) return;
    st.filtro[f] = ev.target.value;
    const pos = ev.target.selectionStart;
    render();
    const nuevo = document.querySelector(`[data-filtro="${f}"]`);
    if (nuevo && f === 'texto') { nuevo.focus(); try { nuevo.setSelectionRange(pos, pos); } catch (e) {} }
  });

  document.addEventListener('change', (ev) => {
    const c = ev.target.dataset && ev.target.dataset.change;
    if (c === 'lista-fecha') { st.lista.fecha = ev.target.value || hoyISO(); st.lista.grupo = ''; render(); }
    if (c === 'lista-grupo') { st.lista.grupo = ev.target.value; render(); }
    if (c && window.ACE_SALA.cambios[c]) window.ACE_SALA.cambios[c](ev.target);
    if (c === 'nac') { // sugiere el grupo según la edad
      const sel = document.getElementById('fs-grupo');
      if (sel && ev.target.value) sel.value = grupoPorEdad(edad(ev.target.value));
    }
  });

  document.addEventListener('submit', async (ev) => {
    const form = ev.target.closest('[data-form]');
    if (!form) return;
    ev.preventDefault();
    const tipo = form.dataset.form;
    const d = new FormData(form);
    const val = (k) => (d.get(k) || '').toString().trim();
    const boton = form.querySelector('[type="submit"]');
    if (boton) boton.disabled = true;
    try {
      switch (tipo) {
        case 'entrar': await intentar(() => S.login(val('email'), val('pass'))); break;
        case 'registrar': await intentar(() => S.registrar(val('email'), val('pass')), 'Cuenta creada. Revisa tu correo.'); break;
        case 'recuperar': if (await intentar(() => S.recuperar(val('email')), 'Te hemos enviado un enlace')) { st.modoAcceso = 'entrar'; render(); } break;

        case 'consentir':
          if (!d.get('ok')) { aviso('Marca la casilla para continuar', 'error'); break; }
          await actualizar(form.dataset.id, { consentimiento: { aceptado: true, fecha: new Date().toISOString(), version: C.club.versionConsentimiento, por: st.usuario.email } }, 'Gracias. Ya puedes usar la app.');
          break;

        case 'socio': await guardarFormSocio(form, d, val); break;

        case 'msg-familia': case 'msg-maestro': {
          const texto = val('texto');
          if (!texto) break;
          const s = st.socios.find((x) => x.id === form.dataset.id);
          const esMaestro = tipo === 'msg-maestro';
          const m = {
            socioId: s.id, socioNombre: nombreCompleto(s), emails: (s.emailsAcceso || []).slice(),
            autor: esMaestro ? 'maestro' : 'familia', autorEmail: st.usuario.email,
            firma: esMaestro ? ((st.ajustes.contacto || {}).nombre || G[s.grupo].entrenador) : '',
            texto: texto.slice(0, 1500), fecha: new Date().toISOString(),
            leidoMaestro: esMaestro, leidoFamilia: !esMaestro
          };
          await intentar(async () => { m.id = await S.anadir('mensajes', m); st.mensajes.push(m); render(); }, esMaestro ? 'Respuesta enviada' : 'Mensaje enviado al maestro');
          break;
        }
        default:
          if (window.ACE_SALA.formularios[tipo]) await window.ACE_SALA.formularios[tipo](form, d, val);

        case 'nuevo-pago': {
          const s = st.socios.find((x) => x.id === form.dataset.id);
          const p = { id: 'p' + Date.now().toString(36), concepto: val('concepto'), importe: Number(val('importe')) || 0, fecha: hoyISO(), pagado: false };
          if (!p.concepto) break;
          await actualizar(s.id, { otrosPagos: (s.otrosPagos || []).concat(p) }, 'Pago anotado');
          break;
        }
        case 'nueva-nota': {
          const s = st.socios.find((x) => x.id === form.dataset.id);
          const n = { id: 'n' + Date.now().toString(36), texto: val('texto'), autor: val('autor'), fecha: new Date().toISOString() };
          if (!n.texto) break;
          await actualizar(s.id, { notas: (s.notas || []).concat(n) }, 'Nota publicada');
          break;
        }
        case 'evento': {
          const e = { titulo: val('titulo'), fecha: val('fecha'), hora: val('hora'), lugar: val('lugar'), descripcion: val('descripcion'), grupos: d.getAll('grupos') };
          if (!e.titulo || !e.fecha) { aviso('Falta el título o la fecha', 'error'); break; }
          if (!e.grupos.length) { aviso('Marca al menos un grupo', 'error'); break; }
          await intentar(async () => { e.id = await S.anadir('eventos', e); st.eventos.push(e); st.eventos.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)); render(); }, 'Evento publicado');
          break;
        }
        case 'noticia': {
          const n = { titulo: val('titulo'), texto: val('texto'), fecha: new Date().toISOString() };
          if (!n.titulo) { aviso('Falta el título', 'error'); break; }
          await intentar(async () => { n.id = await S.anadir('noticias', n); st.noticias.unshift(n); render(); }, 'Noticia publicada');
          break;
        }
        case 'ajustes': {
          const cuotas = {};
          Object.keys(G).forEach((k) => { cuotas[k] = Number(val('cuota-' + k)) || 0; });
          const aj = { titular: val('titular'), iban: val('iban').toUpperCase(), bizum: val('bizum'), cuotas,
            contacto: { nombre: val('mNombre'), telefono: val('mTelefono'), email: val('mEmail').toLowerCase(), horario: val('mHorario') } };
          await intentar(async () => { await S.guardarAjustes(aj); st.ajustes = Object.assign({}, st.ajustes, aj); render(); }, 'Ajustes guardados');
          break;
        }
      }
    } finally { if (boton && document.body.contains(boton)) boton.disabled = false; }
  });

  async function guardarFormSocio(form, d, val) {
    const err = form.querySelector('#fs-error');
    const emails = val('emailsAcceso').split(/[,;\s]+/).map((x) => x.toLowerCase()).filter(Boolean);
    const datos = {
      nombre: val('nombre'), apellidos: val('apellidos'), fechaNacimiento: val('fechaNacimiento'),
      grupo: val('grupo'), arma: val('arma'), manoHabil: val('manoHabil'), emailsAcceso: emails,
      tutor: { nombre: val('tutorNombre'), telefono: val('tutorTelefono'), email: val('tutorEmail').toLowerCase() },
      telefonoEmergencia: val('telefonoEmergencia'),
      consentimientoPapel: !!d.get('consentimientoPapel'), activo: !!d.get('activo')
    };
    // Validaciones (incluye las exigencias del dossier para menores)
    const fallos = [];
    if (!datos.nombre || !datos.apellidos) fallos.push('nombre y apellidos');
    if (!datos.fechaNacimiento) fallos.push('fecha de nacimiento');
    if (!emails.length || emails.some((x) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x))) fallos.push('al menos un correo válido con acceso');
    if (esMenor(datos)) {
      if (!datos.tutor.nombre) fallos.push('nombre del tutor legal');
      if (!datos.tutor.telefono) fallos.push('teléfono del tutor');
      if (!datos.telefonoEmergencia) fallos.push('teléfono de emergencia');
    }
    if (fallos.length) { err.textContent = 'Falta: ' + fallos.join(', ') + '.'; err.hidden = false; return; }
    err.hidden = true;

    const id = form.dataset.id;
    if (id) {
      // Edición: solo se envían los campos del formulario (no se pisan cuotas ni asistencias)
      await intentar(async () => { await S.guardarSocio(Object.assign({ id }, datos)); Object.assign(st.socios.find((s) => s.id === id), datos); render(); }, 'Ficha guardada');
    } else {
      const nuevo = Object.assign({ id: nuevoIdSocio() }, datos, {
        cuotas: { T1: false, T2: false, T3: false }, otrosPagos: [], notas: [], asistencias: {}, eventos: {},
        consentimiento: null, creado: new Date().toISOString()
      });
      if (await intentar(() => S.guardarSocio(nuevo), 'Socio dado de alta')) {
        st.socios.push(nuevo); st.fichaId = nuevo.id; ir('ficha');
      }
    }
  }

  function exportarCSV() {
    const col = ['id', 'apellidos', 'nombre', 'fechaNacimiento', 'grupo', 'arma', 'manoHabil', 'emailsAcceso', 'tutor', 'telefonoTutor', 'telefonoEmergencia', 'T1', 'T2', 'T3', 'activo'];
    const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const filas = st.socios.map((s) => [s.id, s.apellidos, s.nombre, s.fechaNacimiento, s.grupo, s.arma, s.manoHabil, (s.emailsAcceso || []).join(' '),
      (s.tutor || {}).nombre, (s.tutor || {}).telefono, s.telefonoEmergencia, (s.cuotas || {}).T1 ? 'sí' : 'no', (s.cuotas || {}).T2 ? 'sí' : 'no', (s.cuotas || {}).T3 ? 'sí' : 'no', s.activo !== false ? 'sí' : 'no'].map(q).join(';'));
    const blob = new Blob(['﻿' + [col.join(';')].concat(filas).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'socios-ace-' + hoyISO() + '.csv'; a.click();
  }

  /* =================================================================
     NAVEGACIÓN (usa el #ancla de la dirección para que funcione "Atrás")
     ================================================================= */
  const VISTAS_FAM = ['inicio', 'pagos', 'calendario', 'carnet', 'sala', 'contacto'];
  const VISTAS_ADM = ['panel', 'socios', 'ficha', 'alta', 'lista', 'sala', 'competicion', 'marcador', 'mensajes', 'eventos', 'noticias', 'ajustes'];

  function ir(vista) {
    if (location.hash !== '#' + vista) location.hash = vista; // dispara hashchange → render
    else { st.vista = vista; render(); }
  }

  function vistaDesdeHash() {
    const v = location.hash.replace('#', '');
    const validas = st.usuario && st.usuario.esAdmin ? VISTAS_ADM : VISTAS_FAM;
    st.vista = validas.includes(v) ? v : validas[0];
    if (st.vista === 'ficha' && !st.fichaId) st.vista = 'socios';
    if (st.vista === 'competicion' && !st.compId) st.vista = 'sala';
  }

  window.addEventListener('hashchange', () => {
    const antes = st.vista;
    vistaDesdeHash(); cerrarModal();
    if (antes !== st.vista) window.ACE_SALA.alSalir(antes);
    render(); window.scrollTo(0, 0);
  });

  /* =================================================================
     RENDER
     ================================================================= */
  function render() {
    const app = document.getElementById('app');
    if (st.cargando) { app.innerHTML = '<div class="cargando"><img src="img/logo.png" alt=""><p>Cargando…</p></div>'; return; }
    if (!st.usuario) app.innerHTML = vistaAcceso();
    else if (!st.usuario.verificado) app.innerHTML = vistaVerificar();
    else app.innerHTML = st.usuario.esAdmin ? vistaAdmin() : vistaFamilia();
    document.body.dataset.rol = st.usuario ? (st.usuario.esAdmin ? 'admin' : 'familia') : 'fuera';
    document.body.classList.toggle('modo-marcador', st.vista === 'marcador' && !!st.usuario && st.usuario.esAdmin);
  }

  // Utilidades que usa sala.js
  window.ACE_APP = {
    st, h, render, ir, aviso, intentar, abrirModal, cerrarModal, G, C, ICONOS,
    get S() { return S; }, hoyISO, fechaCorta, fechaLarga, capital, nombreCompleto, iniciales
  };

  /* =================================================================
     8. ARRANQUE
     ================================================================= */
  async function arrancar() {
    render();
    try {
      S = C.firebase ? window.ACE_FirebaseStore : window.ACE_DemoStore;
      await S.init();
    } catch (e) {
      console.error(e);
      document.getElementById('app').innerHTML = '<div class="cargando"><p>No se pudo conectar con el servidor. Revisa tu conexión y recarga.</p></div>';
      return;
    }
    S.onAuth(async (u) => {
      st.usuario = u;
      st.cargando = true; render();
      if (u && u.verificado) {
        try { await cargarDatos(); await window.ACE_SALA.alCargar(); } catch (e) { console.error(e); aviso(mensajeError(e), 'error'); }
      } else { st.socios = []; }
      st.cargando = false;
      vistaDesdeHash();
      render();
    });
  }

  // Registro del service worker: permite instalar la app y abrirla sin conexión
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.ACE_SIN_SW) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  arrancar();
})();
