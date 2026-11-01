/* =====================================================================
   AF ENTRENA · Preparación física, nutrición y planificación
   ---------------------------------------------------------------------
   Tres pantallas nuevas que se enganchan a la app original:
     · plan    → Mi plan: macrociclo, mesociclos y microciclos hasta la
                 competición, carga semanal, objetivos y recordatorio diario
     · fisico  → Rutinas con y sin pesas inspiradas en velocistas de 100 y
                 200 m, boxeadores y karatecas, adaptadas a la esgrima
     · dieta   → Nutrición según objetivo y nivel (con salvaguardas)
   Todo se guarda en el propio móvil (localStorage «af-plus-v1»).
   ===================================================================== */
(function () {
  'use strict';
  var KEY = 'af-plus-v1';
  var P = { perfil: {}, plan: null, sesiones: [], objetivos: [], aviso: { activo: false, hora: '19:00' }, rut: { pesas: true, nivel: 2 } };
  try { var raw = localStorage.getItem(KEY); if (raw) { var p = JSON.parse(raw); for (var k in p) P[k] = p[k]; } } catch (e) {}
  function guardar() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} }

  var main = function () { return document.getElementById('main'); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function z(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }
  function deISO(s) { var a = s.split('-'); return new Date(+a[0], a[1] - 1, +a[2]); }
  function hoy() { return iso(new Date()); }
  function sumar(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function lunes(d) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); var w = (x.getDay() + 6) % 7; return sumar(x, -w); }
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  function corta(d) { return d.getDate() + ' ' + MESES[d.getMonth()]; }
  function aviso(t) { var el = document.querySelector('.toast'); if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); } el.setAttribute('role', 'status'); el.textContent = t; el.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(function () { el.hidden = true; }, 2600); }
  function pitido() { try { var C = window.AudioContext || window.webkitAudioContext; aviso.ctx = aviso.ctx || new C(); var c = aviso.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.value = 880; o.connect(g); g.connect(c.destination); g.gain.setValueAtTime(.25, c.currentTime); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .35); o.start(); o.stop(c.currentTime + .36); } catch (e) {} try { navigator.vibrate && navigator.vibrate(150); } catch (e) {} }
  function edad() { var f = P.perfil.nacimiento; if (!f) return null; var n = deISO(f), h = new Date(); var e = h.getFullYear() - n.getFullYear(); if (h < new Date(h.getFullYear(), n.getMonth(), n.getDate())) e--; return e; }
  function cabecera(eyebrow, titulo, texto) {
    return '<section class="card"><div class="eyebrow">' + eyebrow + '</div><h2 style="font-size:32px;margin-top:4px">' + titulo + '</h2>' + (texto ? '<p class="muted" style="margin:6px 0 0;max-width:72ch">' + texto + '</p>' : '') + '</section>';
  }
  function pestanas(actual, lista, accion) {
    return '<div class="chips ap-sub">' + lista.map(function (x) { return '<button class="chip" data-' + accion + '="' + x[0] + '" aria-pressed="' + (actual === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
  }

  /* =================================================================
     1. RUTINAS (con y sin pesas)
     Cada ejercicio: n nombre, s series, r repeticiones o distancia,
     t segundos (si es por tiempo), d descanso en segundos, c consejo.
     ================================================================= */
  var RUTINAS = [
    { id: 'v100', t: 'Velocista de 100 m', color: 'var(--red)', d: 'Aceleración, velocidad máxima y fuerza explosiva. Es lo que más se parece al primer paso de un ataque y a la salida del fondo.',
      esgrima: 'Mejora el primer metro: la flecha, el ataque con marcha y la recuperación rápida tras el fondo.',
      sesiones: [
        { t: 'A · Aceleración y potencia',
          pesas: [ex('Sentadilla trasera', 4, '4 rep', 0, 150, 'Bajada controlada y subida lo más rápida posible.'), ex('Cargada colgante (hang power clean)', 4, '3 rep', 0, 150, 'Solo con buena técnica; si no, sustitúyela por saltos con mancuernas.'), ex('Hip thrust con barra', 3, '6 rep', 0, 90), ex('Saltos al cajón', 4, '4 rep', 0, 90, 'Aterriza suave y bájate andando.'), ex('Sprints desde agachado', 6, '20 m', 0, 120, 'Máxima velocidad, descanso completo.')],
          libre: [ex('Sentadilla con salto', 4, '6 rep', 0, 90), ex('Zancadas alternas con salto', 3, '8 rep', 0, 90), ex('Saltos de rana encadenados', 4, '4 saltos', 0, 90), ex('Sprints en cuesta', 6, '15 m', 0, 120, 'Cuesta suave; vuelve andando.'), ex('Sprints desde agachado', 6, '20 m', 0, 120)] },
        { t: 'B · Velocidad máxima',
          pesas: [ex('Sprints lanzados', 4, '30 m (con 20 m de carrerilla)', 0, 180, 'Relajado y rápido: si te tensas, frenas.'), ex('Bounding (zancadas largas saltadas)', 4, '20 m', 0, 120), ex('Peso muerto rumano', 3, '5 rep', 0, 120), ex('Subida al banco con mancuernas', 3, '6 por pierna', 0, 90), ex('Curl nórdico', 3, '5 rep', 0, 120, 'Protege los isquiotibiales: baja lo más lento que puedas.')],
          libre: [ex('Sprints lanzados', 4, '30 m (con 20 m de carrerilla)', 0, 180), ex('Bounding', 4, '20 m', 0, 120), ex('Puente de glúteo a una pierna', 3, '10 por pierna', 0, 60), ex('Saltos pogo (tobillos)', 3, '', 20, 60, 'Rebotes cortos y rígidos, casi sin doblar rodillas.'), ex('Curl nórdico asistido', 3, '5 rep', 0, 90)] },
        { t: 'C · Fuerza y core',
          pesas: [ex('Sentadilla frontal', 4, '5 rep', 0, 150), ex('Press de banca', 3, '6 rep', 0, 120), ex('Remo con barra', 3, '8 rep', 0, 90), ex('Pallof press (antirrotación)', 3, '10 por lado', 0, 60), ex('Elevación de gemelos', 3, '12 rep', 0, 60)],
          libre: [ex('Flexiones', 4, 'máximo menos 2', 0, 90), ex('Remo invertido (o dominadas)', 4, '8 rep', 0, 90), ex('Plancha frontal', 3, '', 40, 45), ex('Gemelos a una pierna', 3, '15 por pierna', 0, 45), ex('Hollow hold', 3, '', 30, 45)] }
      ] },
    { id: 'v200', t: 'Velocista de 200 m', color: 'var(--gold)', d: 'Resistencia a la velocidad: mantener la potencia cuando aparece el cansancio, como en el final de un asalto a 15.',
      esgrima: 'Ayuda a llegar fresco al tercer periodo y a encadenar acciones explosivas sin perder la distancia.',
      sesiones: [
        { t: 'A · Resistencia a la velocidad',
          pesas: [ex('Repeticiones de 150 m al 90 %', 4, '150 m', 0, 360, 'Recuperación casi completa: la calidad manda.'), ex('Sentadilla trasera', 3, '6 rep', 0, 120), ex('Zancada caminando con mancuernas', 3, '8 por pierna', 0, 90), ex('Plancha lateral', 3, '', 30, 30)],
          libre: [ex('Repeticiones de 150 m al 90 %', 4, '150 m', 0, 360), ex('Sentadilla búlgara', 3, '8 por pierna', 0, 90), ex('Saltos de tijera', 3, '', 30, 60), ex('Plancha lateral', 3, '', 30, 30)] },
        { t: 'B · Velocidad y tempo',
          pesas: [ex('Aceleraciones', 3, '60 m', 0, 180), ex('Sprints largos', 2, '120 m', 0, 300), ex('Tempo al 70 %', 8, '100 m', 0, 45, 'Ritmo cómodo, técnica limpia.'), ex('Peso muerto con barra hexagonal', 3, '5 rep', 0, 120)],
          libre: [ex('Aceleraciones', 3, '60 m', 0, 180), ex('Sprints largos', 2, '120 m', 0, 300), ex('Tempo al 70 %', 8, '100 m', 0, 45), ex('Puente de glúteo', 3, '15 rep', 0, 45)] },
        { t: 'C · Circuito de fuerza-resistencia',
          pesas: [ex('Sentadilla goblet', 3, '12 rep', 0, 15), ex('Remo con mancuerna', 3, '12 por brazo', 0, 15), ex('Swing con kettlebell', 3, '15 rep', 0, 15), ex('Plancha', 3, '', 40, 90, 'Descanso largo al terminar cada vuelta.')],
          libre: [ex('Burpees', 4, '', 30, 30), ex('Sentadilla con salto', 4, '', 30, 30), ex('Flexiones', 4, '', 30, 30), ex('Escaladores (mountain climbers)', 4, '', 30, 90)] }
      ] },
    { id: 'box', t: 'Boxeo', color: 'var(--navy)', d: 'Asaltos de 3 minutos, cuerda, sombra y un tronco fuerte que transmite la fuerza. Trabajo por rondas como en la pista.',
      esgrima: 'Mejora la resistencia por periodos, la coordinación de piernas y brazo y la estabilidad del tronco en el fondo.',
      sesiones: [
        { t: 'A · Rondas de acondicionamiento',
          pesas: [ex('Comba', 3, '', 180, 60, 'Ritmo constante, sobre la punta de los pies.'), ex('Sombra con desplazamientos de esgrima', 4, '', 180, 60, 'Marcha, retirada, fondo y vuelta a guardia sin parar.'), ex('Press militar con mancuernas', 3, '8 rep', 0, 90), ex('Lanzamiento rotacional de balón medicinal', 4, '6 por lado', 0, 60), ex('Paseo del granjero', 3, '30 m', 0, 60)],
          libre: [ex('Comba', 3, '', 180, 60), ex('Sombra con desplazamientos de esgrima', 4, '', 180, 60), ex('Flexiones explosivas', 4, '6 rep', 0, 90), ex('Giros rusos', 3, '20 rep', 0, 45), ex('Plancha lateral', 3, '', 30, 30)] },
        { t: 'B · Intervalos tipo asalto',
          pesas: [ex('Rondas de trabajo (saco, sombra o comba)', 6, '', 120, 60, 'Simula un asalto: cambios de ritmo cada 20-30 segundos.'), ex('Crunch con giro', 3, '15 por lado', 0, 30), ex('Hollow hold', 3, '', 30, 30)],
          libre: [ex('Rondas de trabajo (sombra o comba)', 6, '', 120, 60), ex('Crunch con giro', 3, '15 por lado', 0, 30), ex('Hollow hold', 3, '', 30, 30)] },
        { t: 'C · Fuerza de tren superior y tronco',
          pesas: [ex('Peso muerto con barra hexagonal', 4, '5 rep', 0, 150), ex('Press de banca con mancuernas', 3, '8 rep', 0, 90), ex('Dominadas', 3, 'máximo', 0, 120), ex('Press landmine a un brazo', 3, '8 por brazo', 0, 60)],
          libre: [ex('Remo invertido o dominadas', 4, '8 rep', 0, 90), ex('Fondos en banco', 3, '12 rep', 0, 60), ex('Flexiones en pica', 3, '8 rep', 0, 60), ex('Superman', 3, '', 30, 30)] }
      ] },
    { id: 'kar', t: 'Karate (kumite)', color: 'var(--green)', d: 'Explosividad de cadera y piernas, reacción a la señal y movilidad para entrar y salir de distancia en décimas de segundo.',
      esgrima: 'Muy útil para la reacción al ataque del rival, la contraatacada y los cambios de dirección en la pista.',
      sesiones: [
        { t: 'A · Explosividad de piernas',
          pesas: [ex('Sentadilla búlgara con mancuernas', 3, '6 por pierna', 0, 90), ex('Hip thrust', 3, '8 rep', 0, 90), ex('Peso muerto rumano a una pierna', 3, '8 por pierna', 0, 60), ex('Saltos laterales (skater)', 4, '8 rep', 0, 60), ex('Saltos al cajón', 4, '4 rep', 0, 90)],
          libre: [ex('Sentadilla a una pierna asistida', 3, '6 por pierna', 0, 90), ex('Puente de glúteo a una pierna', 3, '10 por pierna', 0, 60), ex('Plancha de Copenhague', 3, '', 20, 45, 'Fortalece los aductores: protege la ingle en el fondo.'), ex('Saltos laterales (skater)', 4, '8 rep', 0, 60), ex('Sentadilla con salto', 4, '6 rep', 0, 90)] },
        { t: 'B · Movilidad y control',
          pesas: [ex('Movilidad de cadera 90/90', 2, '8 por lado', 0, 30), ex('Sentadilla cosaca con kettlebell', 3, '6 por lado', 0, 60), ex('Elevación lenta de pierna (patada controlada)', 3, '10 por lado', 0, 45), ex('Pallof press', 3, '10 por lado', 0, 45)],
          libre: [ex('Movilidad de cadera 90/90', 2, '8 por lado', 0, 30), ex('Sentadilla cosaca', 3, '6 por lado', 0, 60), ex('Elevación lenta de pierna', 3, '10 por lado', 0, 45), ex('Bird dog', 3, '10 por lado', 0, 30)] },
        { t: 'C · Velocidad de reacción',
          pesas: [ex('Salida a la señal desde guardia', 8, '5 m', 0, 45, 'Que un compañero dé la señal con palmada o luz.'), ex('Saltos laterales pliométricos', 3, '', 20, 60), ex('Lanzamiento de balón medicinal desde guardia', 4, '5 rep', 0, 60), ex('Reacción con pelota de tenis', 5, '', 30, 30, 'El compañero suelta la pelota y la atrapas antes del segundo bote.')],
          libre: [ex('Salida a la señal desde guardia', 8, '5 m', 0, 45), ex('Saltos laterales pliométricos', 3, '', 20, 60), ex('Fondos explosivos con vuelta a guardia', 4, '5 rep', 0, 60), ex('Reacción con pelota de tenis', 5, '', 30, 30)] }
      ] }
  ];
  function ex(n, s, r, t, d, c) { return { n: n, s: s, r: r, t: t, d: d, c: c || '' }; }
  var NIVELES = ['', 'Iniciación', 'Intermedio', 'Avanzado'];
  function seriesNivel(s, nivel) { return nivel === 1 ? Math.max(2, s - 1) : nivel === 3 ? s + 1 : s; }
  var INTENSIDAD = ['', 'Cargas ligeras y técnica perfecta (esfuerzo 6 de 10).', 'Cargas moderadas (esfuerzo 7-8 de 10).', 'Cargas exigentes (esfuerzo 8-9 de 10). Deja siempre 1-2 repeticiones en reserva.'];

  var rutSel = null, sesSel = 0, hechos = {}, reloj = null, inicioSesion = null;

  function vistaFisico(o) {
    var r = P.rut, menor = (edad() != null && edad() < 18);
    if (o) { if (o.rutina) { rutSel = o.rutina; sesSel = o.sesion || 0; } else rutSel = null; } // desde la pestaña: lista
    if (rutSel) return vistaSesion();
    main().innerHTML = '<div class="stack">' +
      cabecera('Preparación física', 'Rutinas con y sin pesas', 'Programas inspirados en cómo entrenan los velocistas de 100 y 200 m, los boxeadores y los karatecas, adaptados a lo que pide la esgrima. Calienta siempre 10-15 minutos antes (pestaña Calentar).') +
      '<section class="card stack"><div class="row" style="gap:16px;align-items:flex-end">' +
        '<div><div class="eyebrow" style="margin-bottom:6px">Material</div><div class="chips"><button class="chip" data-pesas="1" aria-pressed="' + r.pesas + '">Con pesas</button><button class="chip" data-pesas="0" aria-pressed="' + !r.pesas + '">Sin pesas</button></div></div>' +
        '<div><div class="eyebrow" style="margin-bottom:6px">Nivel</div><div class="chips">' + [1, 2, 3].map(function (n) { return '<button class="chip" data-nivel="' + n + '" aria-pressed="' + (r.nivel === n) + '">' + NIVELES[n] + '</button>'; }).join('') + '</div></div></div>' +
        '<p class="muted" style="margin:0;font-size:14px">' + INTENSIDAD[r.nivel] + (menor ? ' <b>Menores de 18:</b> trabaja la técnica con cargas ligeras y siempre con un entrenador delante.' : '') + '</p></section>' +
      '<div class="grid2">' + RUTINAS.map(function (x) {
        return '<section class="card stack ap-rut" style="border-top:5px solid ' + x.color + '"><h3 style="font-size:26px">' + esc(x.t) + '</h3><p style="margin:0">' + esc(x.d) + '</p><p class="muted" style="margin:0;font-size:14px"><b>En esgrima:</b> ' + esc(x.esgrima) + '</p>' +
          '<div class="stack" style="gap:6px">' + x.sesiones.map(function (s, i) { var l = r.pesas ? s.pesas : s.libre; return '<button class="routine" data-rutina="' + x.id + '" data-ses="' + i + '"><span class="tag">' + l.length + ' ejercicios · ~' + duracion(l, r.nivel) + ' min</span><h3>' + esc(s.t) + '</h3></button>'; }).join('') + '</div></section>';
      }).join('') + '</div>' +
      '<section class="card"><p class="muted" style="margin:0;font-size:14px">Si sientes dolor (no cansancio) para y consulta con un profesional sanitario. Deja al menos 48 horas entre sesiones intensas de piernas.</p></section></div>';
  }
  function duracion(l, nivel) { var t = 0; l.forEach(function (e) { var s = seriesNivel(e.s, nivel); t += s * ((e.t || 35) + e.d); }); return Math.round(t / 60 / 5) * 5 || 5; }

  function vistaSesion() {
    var x = RUTINAS.filter(function (r) { return r.id === rutSel; })[0]; if (!x) { rutSel = null; return vistaFisico(); }
    var s = x.sesiones[sesSel], l = P.rut.pesas ? s.pesas : s.libre, nivel = P.rut.nivel;
    if (!inicioSesion) inicioSesion = Date.now();
    main().innerHTML = '<div class="stack">' +
      '<button class="btn" data-ap="volver-rut" style="align-self:flex-start">‹ Rutinas</button>' +
      cabecera(esc(x.t) + ' · ' + (P.rut.pesas ? 'con pesas' : 'sin pesas') + ' · ' + NIVELES[nivel], esc(s.t), 'Marca cada serie al terminarla. Los ejercicios por tiempo y los descansos llevan cuenta atrás con pitido.') +
      '<section class="card ap-reloj" id="ap-reloj" hidden><div class="eyebrow" id="ap-reloj-t">Descanso</div><div class="ap-cifra" id="ap-reloj-c">0:00</div><button class="btn" data-ap="parar-reloj">Saltar</button></section>' +
      l.map(function (e, i) {
        var n = seriesNivel(e.s, nivel);
        return '<section class="card stack"><div class="row" style="justify-content:space-between;align-items:baseline"><h3 style="font-size:24px">' + (i + 1) + '. ' + esc(e.n) + '</h3><span class="tag">' + n + ' × ' + (e.t ? e.t + ' s' : esc(e.r)) + ' · descanso ' + fmt(e.d) + '</span></div>' +
          (e.c ? '<p class="muted" style="margin:0;font-size:14px">' + esc(e.c) + '</p>' : '') +
          '<div class="chips">' + Array.from({ length: n }, function (_, k) { var id = i + '-' + k; return '<button class="chip ap-serie" data-serie="' + id + '" data-t="' + (e.t || 0) + '" data-d="' + e.d + '" aria-pressed="' + !!hechos[id] + '">' + (hechos[id] ? '✓ ' : '') + 'Serie ' + (k + 1) + '</button>'; }).join('') + '</div></section>';
      }).join('') +
      '<section class="card stack"><h3 style="font-size:24px">Terminar y registrar</h3>' +
        '<div class="cfg"><label for="ap-min">Minutos<input id="ap-min" type="number" min="5" max="240" value="' + Math.max(10, Math.round((Date.now() - inicioSesion) / 60000) || duracion(l, nivel)) + '"></label>' +
        '<label for="ap-rpe">Esfuerzo percibido (1-10)<input id="ap-rpe" type="number" min="1" max="10" value="7"></label></div>' +
        '<p class="muted" style="margin:0;font-size:14px">El esfuerzo × minutos es tu «carga» de la sesión. Con ella la app sigue cómo vas respecto a lo planificado.</p>' +
        '<button class="btn red" data-ap="fin-sesion">Guardar sesión</button></section></div>';
  }
  function fmt(s) { return Math.floor(s / 60) + ':' + z(s % 60); }

  function cuentaAtras(seg, titulo, luego) {
    clearInterval(reloj);
    var box = document.getElementById('ap-reloj'); if (!box || !seg) { if (luego) luego(); return; }
    box.hidden = false; document.getElementById('ap-reloj-t').textContent = titulo;
    var fin = Date.now() + seg * 1000;
    function tic() {
      var r = Math.max(0, Math.round((fin - Date.now()) / 1000));
      var c = document.getElementById('ap-reloj-c'); if (!c) { clearInterval(reloj); return; }
      c.textContent = fmt(r);
      if (r <= 3 && r > 0) pitido();
      if (r === 0) { clearInterval(reloj); pitido(); setTimeout(pitido, 250); box.hidden = true; if (luego) luego(); }
    }
    tic(); reloj = setInterval(tic, 1000);
  }

  /* =================================================================
     2. PLANIFICACIÓN: macrociclo → mesociclos → microciclos
     ================================================================= */
  var FASES = {
    general: { n: 'Preparación general', c: '#1D4E89', obj: 'Base de fuerza, resistencia aeróbica y técnica. Volumen alto, intensidad moderada.', rut: [['v100', 2], ['box', 2], ['v200', 2], ['kar', 1]] },
    especifica: { n: 'Preparación específica', c: '#B8871F', obj: 'Convertir la fuerza en potencia y velocidad. Intervalos tipo asalto y mucha esgrima con intención táctica.', rut: [['v100', 0], ['box', 1], ['kar', 0], ['v200', 0]] },
    precomp: { n: 'Precompetitiva', c: '#D02B3F', obj: 'Velocidad, reacción y asaltos de competición. Menos volumen, máxima calidad.', rut: [['kar', 2], ['v100', 1], ['box', 1]] },
    taper: { n: 'Puesta a punto', c: '#11934A', obj: 'Bajar el volumen un 40-60 % manteniendo la intensidad para llegar fresco. Dormir bien y no probar nada nuevo.', rut: [['v100', 1], ['kar', 1]] },
    comp: { n: 'Competición', c: '#0E7C7B', obj: 'Activación corta, descanso y rutina de competición.', rut: [['kar', 1]] },
    trans: { n: 'Transición', c: '#8996A9', obj: 'Recuperación activa: otros deportes suaves, movilidad y descanso mental.', rut: [['kar', 1]] }
  };
  var MICRO = { carga: ['Carga', 1.0], choque: ['Choque', 1.15], descarga: ['Descarga', 0.6], taper: ['Puesta a punto', 0.5], comp: ['Competición', 0.4], trans: ['Transición', 0.4] };
  var CARGA_BASE = [0, 1200, 1800, 2400]; // carga semanal orientativa (esfuerzo × minutos) por nivel
  var DIAS_SESION = { 2: [2, 4], 3: [1, 3, 5], 4: [1, 2, 4, 6], 5: [1, 2, 3, 5, 6] };

  // Construye las semanas desde este lunes hasta la competición (+ transición)
  function construirPlan(plan) {
    var ini = lunes(deISO(plan.inicio)), comp = deISO(plan.fecha);
    var total = Math.max(1, Math.ceil((lunes(comp) - ini) / 6048e5) + 1); // incluye la semana de la competición
    var antes = total - 1, fases = [];
    var taper = antes >= 14 ? 2 : antes >= 3 ? 1 : 0, resto = antes - taper;
    var gen = 0, esp = 0, pre = 0;
    if (resto >= 10) { gen = Math.round(resto * 0.45); pre = Math.max(2, Math.round(resto * 0.2)); esp = resto - gen - pre; }
    else if (resto >= 5) { gen = Math.round(resto * 0.3); pre = Math.max(1, Math.round(resto * 0.25)); esp = resto - gen - pre; }
    else { esp = Math.ceil(resto / 2); pre = resto - esp; }
    function add(f, n) { if (n > 0) fases.push({ f: f, n: n }); }
    add('general', gen); add('especifica', esp); add('precomp', pre); add('taper', taper); add('comp', 1); add('trans', 2);
    var semanas = [], idx = 0;
    fases.forEach(function (fa, mi) {
      for (var k = 0; k < fa.n; k++) {
        var tipo = fa.f === 'taper' ? 'taper' : fa.f === 'comp' ? 'comp' : fa.f === 'trans' ? 'trans'
          : (k % 4 === 3 ? 'descarga' : k % 4 === 2 ? 'choque' : 'carga');
        if (fa.f !== 'taper' && fa.f !== 'comp' && fa.f !== 'trans' && k === fa.n - 1 && fa.n >= 3 && tipo !== 'descarga') tipo = 'descarga';
        semanas.push({ i: idx, lunes: iso(sumar(ini, idx * 7)), fase: fa.f, meso: mi + 1, micro: tipo, semMeso: k + 1, totMeso: fa.n });
        idx++;
      }
    });
    return { semanas: semanas, fases: fases };
  }
  function semanaDe(estr, fecha) { var l = iso(lunes(fecha)); return estr.semanas.filter(function (s) { return s.lunes === l; })[0] || null; }
  function cargaObjetivo(sem) { return Math.round(CARGA_BASE[P.plan.nivel || 2] * MICRO[sem.micro][1] / 50) * 50; }
  function sesionesSemana(l) { var a = l, b = iso(sumar(deISO(l), 7)); return P.sesiones.filter(function (s) { return s.fecha >= a && s.fecha < b; }); }
  function sesionPrevista(fecha) {
    if (!P.plan) return null;
    var e = construirPlan(P.plan), sem = semanaDe(e, fecha); if (!sem) return null;
    var dias = DIAS_SESION[P.plan.sesiones] || DIAS_SESION[3], d = fecha.getDay(), pos = dias.indexOf(d);
    if (sem.micro === 'comp' && iso(fecha) === P.plan.fecha) return { sem: sem, txt: '¡Día de competición! ' + P.plan.nombre };
    if (pos < 0) return { sem: sem, txt: 'Descanso o esgrima en sala. 10 minutos de movilidad.' };
    var lista = FASES[sem.fase].rut, r = lista[pos % lista.length], rut = RUTINAS.filter(function (x) { return x.id === r[0]; })[0];
    var nota = sem.micro === 'descarga' ? ' (descarga: una serie menos en cada ejercicio)' : sem.micro === 'taper' ? ' (puesta a punto: la mitad de series, máxima calidad)' : '';
    return { sem: sem, rutina: r[0], ses: r[1], txt: rut.t + ' · ' + rut.sesiones[r[1]].t + nota };
  }

  var subPlan = 'semana';
  function vistaPlan(o) {
    if (o && o.sub) subPlan = o.sub;
    var cuerpo;
    if (!P.plan || subPlan === 'configurar') cuerpo = formPlan();
    else if (subPlan === 'objetivos') cuerpo = vistaObjetivos();
    else if (subPlan === 'aviso') cuerpo = vistaAviso();
    else if (subPlan === 'ciclos') cuerpo = vistaCiclos();
    else cuerpo = vistaSemana();
    main().innerHTML = '<div class="stack">' +
      cabecera('Mi plan', 'Planificación y seguimiento', 'Macrociclo hasta tu competición, dividido en mesociclos y semanas (microciclos) de carga y descarga. Registra tus sesiones y verás cómo vas.') +
      (P.plan ? pestanas(subPlan, [['semana', 'Esta semana'], ['ciclos', 'Ciclos'], ['objetivos', 'Objetivos'], ['aviso', 'Recordatorio'], ['configurar', 'Ajustes']], 'subplan') : '') +
      cuerpo + '</div>';
  }

  function formPlan() {
    var p = P.plan || { nombre: '', fecha: iso(sumar(new Date(), 70)), sesiones: 3, nivel: 2 };
    return '<form class="card stack" id="ap-fplan"><h3 style="font-size:26px">' + (P.plan ? 'Ajustes del plan' : 'Crea tu plan') + '</h3>' +
      '<div class="cfg"><label for="ap-pn">Competición objetivo<input id="ap-pn" name="nombre" value="' + esc(p.nombre) + '" placeholder="Torneo territorial, Copa de España…" required></label>' +
      '<label for="ap-pf">Fecha<input id="ap-pf" name="fecha" type="date" value="' + esc(p.fecha) + '" min="' + hoy() + '" required></label>' +
      '<label for="ap-ps">Sesiones físicas por semana<select id="ap-ps" name="sesiones">' + [2, 3, 4, 5].map(function (n) { return '<option ' + (p.sesiones == n ? 'selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>' +
      '<label for="ap-pv">Nivel<select id="ap-pv" name="nivel">' + [1, 2, 3].map(function (n) { return '<option value="' + n + '" ' + (p.nivel == n ? 'selected' : '') + '>' + NIVELES[n] + '</option>'; }).join('') + '</select></label></div>' +
      '<p class="muted" style="margin:0;font-size:14px">Las sesiones físicas son aparte de los entrenamientos de esgrima en sala. Con 8-16 semanas por delante sale un ciclo completo; con menos, la app acorta la preparación general.</p>' +
      '<div class="row"><button class="btn red" type="submit">' + (P.plan ? 'Guardar cambios' : 'Crear plan') + '</button>' + (P.plan ? '<button class="btn" type="button" data-ap="borrar-plan">Borrar plan</button>' : '') + '</div></form>';
  }

  function vistaSemana() {
    var e = construirPlan(P.plan), ahora = new Date(), sem = semanaDe(e, ahora);
    var dias = Math.round((deISO(P.plan.fecha) - deISO(hoy())) / 864e5);
    if (!sem) return '<section class="card"><p>El plan ha terminado. Crea uno nuevo para tu próxima competición en «Ajustes».</p></section>';
    var f = FASES[sem.fase], ses = sesionesSemana(sem.lunes), carga = ses.reduce(function (a, s) { return a + s.min * s.rpe; }, 0), obj = cargaObjetivo(sem);
    var hechasFis = ses.filter(function (s) { return s.tipo === 'Físico'; }).length, prevSes = P.plan.sesiones;
    var pct = Math.min(130, Math.round(100 * carga / obj));
    var estado = pct < 60 ? ['Por debajo de lo previsto', 'var(--gold)'] : pct <= 110 ? ['En línea con el plan', 'var(--green)'] : ['Por encima: vigila la fatiga', 'var(--red)'];
    var prox = []; for (var k = 0; k < 7; k++) { var d = sumar(lunes(ahora), k), sp = sesionPrevista(d); prox.push({ d: d, sp: sp }); }
    return '<section class="card ap-cuenta" style="border-left:6px solid ' + f.c + '"><div><div class="eyebrow">' + esc(P.plan.nombre) + '</div><div class="ap-cifra">' + (dias > 0 ? dias + ' días' : dias === 0 ? '¡Hoy!' : 'Pasada') + '</div><div class="muted">' + corta(deISO(P.plan.fecha)) + '</div></div>' +
      '<div><div class="eyebrow">Mesociclo ' + sem.meso + ' · ' + esc(f.n) + '</div><h3 style="font-size:24px;margin:2px 0">Semana ' + sem.semMeso + ' de ' + sem.totMeso + ' · microciclo de ' + MICRO[sem.micro][0].toLowerCase() + '</h3><p class="muted" style="margin:0;font-size:14px">' + esc(f.obj) + '</p></div></section>' +
      '<div class="grid2"><section class="card stack"><div class="eyebrow">Carga de la semana</div><div class="row" style="justify-content:space-between;align-items:baseline"><b style="font-family:var(--f-display);font-size:34px">' + carga.toLocaleString('es-ES') + '</b><span class="muted">objetivo ' + obj.toLocaleString('es-ES') + '</span></div>' +
        '<div class="meter"><i style="width:' + Math.min(100, pct) + '%;background:' + estado[1] + '"></i></div><div style="color:' + estado[1] + ';font-weight:700">' + estado[0] + ' (' + pct + ' %)</div>' +
        '<div class="muted" style="font-size:14px">Sesiones físicas: <b>' + hechasFis + ' de ' + prevSes + '</b> · Total registradas: ' + ses.length + '</div></section>' +
      '<section class="card stack"><div class="eyebrow">Registrar entrenamiento</div><form id="ap-freg" class="cfg">' +
        '<label for="ap-rt">Tipo<select id="ap-rt" name="tipo"><option>Esgrima en sala</option><option>Físico</option><option>Competición</option><option>Otro</option></select></label>' +
        '<label for="ap-rm">Minutos<input id="ap-rm" name="min" type="number" min="5" max="600" value="90"></label>' +
        '<label for="ap-rr">Esfuerzo (1-10)<input id="ap-rr" name="rpe" type="number" min="1" max="10" value="6"></label>' +
        '<label for="ap-rf">Fecha<input id="ap-rf" name="fecha" type="date" value="' + hoy() + '" max="' + hoy() + '"></label>' +
        '<button class="btn red" type="submit">Añadir</button></form></section></div>' +
      '<section class="card stack"><div class="eyebrow">Previsto esta semana</div>' + prox.map(function (x) {
        var hecho = P.sesiones.some(function (s) { return s.fecha === iso(x.d); }), esHoy = iso(x.d) === hoy();
        return '<div class="ap-dia' + (esHoy ? ' hoy' : '') + '"><b>' + DIAS[x.d.getDay()].slice(0, 3) + ' ' + x.d.getDate() + '</b><span>' + esc(x.sp ? x.sp.txt : '') + '</span>' +
          (hecho ? '<span class="tag" style="background:var(--green-soft);color:var(--green)">Hecho</span>' : x.sp && x.sp.rutina && iso(x.d) >= hoy() ? '<button class="btn" data-go-rutina="' + x.sp.rutina + '" data-ses="' + x.sp.ses + '">Empezar</button>' : '<span></span>') + '</div>';
      }).join('') + '</section>' +
      graficaCargas(e) + ultimasSesiones();
  }

  // Barras de las últimas 8 semanas: previsto (contorno) y hecho (relleno)
  function graficaCargas(e) {
    var sems = e.semanas.filter(function (s) { return s.lunes <= iso(lunes(new Date())); }).slice(-8);
    if (sems.length < 2) return '';
    var W = 560, H = 180, pad = 28, bw = (W - pad * 2) / sems.length;
    var datos = sems.map(function (s) { var c = sesionesSemana(s.lunes).reduce(function (a, x) { return a + x.min * x.rpe; }, 0); return { s: s, c: c, o: cargaObjetivo(s) }; });
    var max = Math.max.apply(null, datos.map(function (d) { return Math.max(d.c, d.o); }).concat([100]));
    var y = function (v) { return H - 24 - (H - 40) * v / max; };
    var barras = datos.map(function (d, i) {
      var x = pad + i * bw + bw * 0.15, w = bw * 0.7;
      return '<rect x="' + x + '" y="' + y(d.o) + '" width="' + w + '" height="' + (H - 24 - y(d.o)) + '" fill="none" stroke="var(--steel)" stroke-dasharray="4 3" rx="3"/>' +
        '<rect x="' + (x + 4) + '" y="' + y(d.c) + '" width="' + (w - 8) + '" height="' + Math.max(0, H - 24 - y(d.c)) + '" fill="' + FASES[d.s.fase].c + '" rx="3"/>' +
        '<text x="' + (x + w / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="var(--muted)">' + corta(deISO(d.s.lunes)) + '</text>';
    }).join('');
    return '<section class="card stack"><div class="eyebrow">Carga de las últimas semanas</div><div class="scroll"><svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;min-width:420px;height:auto" role="img" aria-label="Carga semanal realizada frente a la prevista">' +
      '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + (H - 24) + '" y2="' + (H - 24) + '" stroke="var(--line)"/>' + barras + '</svg></div>' +
      '<p class="muted" style="margin:0;font-size:13px">Barra de color: lo que has hecho. Contorno discontinuo: lo previsto. Las semanas de descarga deben bajar: es parte del plan.</p></section>';
  }
  function ultimasSesiones() {
    var l = P.sesiones.slice().sort(function (a, b) { return b.fecha.localeCompare(a.fecha); }).slice(0, 8);
    if (!l.length) return '';
    return '<section class="card stack"><div class="eyebrow">Últimas sesiones</div><div class="scroll"><table class="tbl"><tr><th>Fecha</th><th>Tipo</th><th>Min</th><th>Esfuerzo</th><th>Carga</th><th></th></tr>' +
      l.map(function (s) { return '<tr><td>' + corta(deISO(s.fecha)) + '</td><td>' + esc(s.nombre || s.tipo) + '</td><td>' + s.min + '</td><td>' + s.rpe + '</td><td>' + s.min * s.rpe + '</td><td><button class="btn" style="padding:2px 10px" data-borrar-ses="' + s.id + '" aria-label="Borrar">×</button></td></tr>'; }).join('') + '</table></div></section>';
  }

  function vistaCiclos() {
    var e = construirPlan(P.plan), hoyL = iso(lunes(new Date()));
    var total = e.semanas.length;
    var barra = '<div class="ap-macro">' + e.fases.map(function (fa) { return '<div style="flex:' + fa.n + ';background:' + FASES[fa.f].c + '" title="' + esc(FASES[fa.f].n) + '"><span>' + esc(FASES[fa.f].n) + '</span></div>'; }).join('') + '</div>';
    var posHoy = e.semanas.findIndex(function (s) { return s.lunes === hoyL; });
    return '<section class="card stack"><div class="eyebrow">Macrociclo · ' + total + ' semanas</div>' + barra +
      (posHoy >= 0 ? '<div class="ap-hoy" style="margin-left:calc(' + ((posHoy + 0.5) / total * 100) + '% - 6px)">▲ hoy</div>' : '') + '</section>' +
      e.fases.map(function (fa, mi) {
        var ss = e.semanas.filter(function (s) { return s.meso === mi + 1; }), F = FASES[fa.f];
        return '<section class="card stack" style="border-left:6px solid ' + F.c + '"><div class="row" style="justify-content:space-between"><h3 style="font-size:24px">Mesociclo ' + (mi + 1) + ' · ' + esc(F.n) + '</h3><span class="tag">' + corta(deISO(ss[0].lunes)) + ' – ' + corta(sumar(deISO(ss[ss.length - 1].lunes), 6)) + '</span></div>' +
          '<p class="muted" style="margin:0">' + esc(F.obj) + '</p><div class="chips">' + ss.map(function (s) { return '<span class="chip" style="' + (s.lunes === hoyL ? 'outline:2px solid var(--red);' : '') + '">S' + (s.i + 1) + ' · ' + MICRO[s.micro][0] + '</span>'; }).join('') + '</div>' +
          '<p class="muted" style="margin:0;font-size:13px">Rutinas de este mesociclo: ' + F.rut.map(function (r) { var x = RUTINAS.filter(function (y) { return y.id === r[0]; })[0]; return esc(x.t + ' ' + x.sesiones[r[1]].t.split(' · ')[0]); }).join(', ') + '</p></section>';
      }).join('') +
      '<section class="card"><p class="muted" style="margin:0;font-size:14px"><b>Cómo se reparte:</b> cada mesociclo alterna semanas de carga, una de choque (más exigente) y una de descarga para asimilar el trabajo. Antes de la competición, la puesta a punto reduce el volumen para llegar fresco.</p></section>';
  }

  /* ---------- Objetivos (marcadores) ---------- */
  var PLANTILLAS = [
    ['Peso corporal', 'kg', 'bajar'], ['Sentadilla (1 repetición máxima)', 'kg', 'subir'], ['Sprint de 30 m', 's', 'bajar'], ['Salto vertical', 'cm', 'subir'],
    ['Flexiones seguidas', 'rep', 'subir'], ['Perímetro de cintura', 'cm', 'bajar'], ['Sesiones por semana', 'sesiones', 'subir']
  ];
  function progreso(o) {
    if (!o.valores.length) return 0;
    var act = o.valores[o.valores.length - 1].v, ini = o.inicio, fin = o.objetivo;
    if (fin === ini) return 100;
    return Math.max(0, Math.min(100, Math.round(100 * (act - ini) / (fin - ini))));
  }
  function vistaObjetivos() {
    return P.objetivos.map(function (o) {
      var pr = progreso(o), act = o.valores.length ? o.valores[o.valores.length - 1].v : o.inicio;
      return '<section class="card stack"><div class="row" style="justify-content:space-between;align-items:baseline"><h3 style="font-size:24px">' + esc(o.nombre) + '</h3><span class="tag">' + pr + ' %</span></div>' +
        '<div class="meter"><i style="width:' + pr + '%;background:' + (pr >= 100 ? 'var(--green)' : 'var(--gold)') + '"></i></div>' +
        '<div class="row" style="justify-content:space-between;font-size:14px" class="muted"><span>Inicio: <b>' + o.inicio + ' ' + esc(o.unidad) + '</b></span><span>Ahora: <b>' + act + ' ' + esc(o.unidad) + '</b></span><span>Objetivo: <b>' + o.objetivo + ' ' + esc(o.unidad) + '</b>' + (o.fecha ? ' (' + corta(deISO(o.fecha)) + ')' : '') + '</span></div>' +
        mini(o) +
        '<form class="row ap-fval" data-obj="' + o.id + '"><input name="v" type="number" step="0.01" placeholder="Nuevo valor (' + esc(o.unidad) + ')" required style="flex:1;min-width:140px"><button class="btn red" type="submit">Anotar</button><button class="btn" type="button" data-borrar-obj="' + o.id + '">Borrar</button></form>' +
        (pr >= 100 ? '<p style="margin:0;color:var(--green);font-weight:700">¡Objetivo conseguido! Ponte el siguiente.</p>' : '') + '</section>';
    }).join('') +
    '<form class="card stack" id="ap-fobj"><h3 style="font-size:24px">Nuevo objetivo</h3>' +
      '<div class="chips">' + PLANTILLAS.map(function (p, i) { return '<button class="chip" type="button" data-plantilla="' + i + '">' + esc(p[0]) + '</button>'; }).join('') + '</div>' +
      '<div class="cfg"><label for="ap-on">Nombre<input id="ap-on" name="nombre" required></label><label for="ap-ou">Unidad<input id="ap-ou" name="unidad" required></label>' +
      '<label for="ap-oi">Valor actual<input id="ap-oi" name="inicio" type="number" step="0.01" required></label><label for="ap-oo">Objetivo<input id="ap-oo" name="objetivo" type="number" step="0.01" required></label>' +
      '<label for="ap-of">Fecha límite<input id="ap-of" name="fecha" type="date" min="' + hoy() + '"></label></div>' +
      '<button class="btn red" type="submit">Añadir objetivo</button></form>';
  }
  function mini(o) {
    var v = [{ v: o.inicio }].concat(o.valores); if (v.length < 2) return '';
    var W = 300, H = 50, min = Math.min.apply(null, v.map(function (x) { return x.v; }).concat([o.objetivo])), max = Math.max.apply(null, v.map(function (x) { return x.v; }).concat([o.objetivo]));
    var rng = (max - min) || 1, X = function (i) { return 6 + i * (W - 12) / (v.length - 1); }, Y = function (x) { return H - 6 - (H - 12) * (x - min) / rng; };
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;max-width:420px;height:auto" aria-hidden="true"><line x1="0" x2="' + W + '" y1="' + Y(o.objetivo) + '" y2="' + Y(o.objetivo) + '" stroke="var(--green)" stroke-dasharray="4 3"/>' +
      '<polyline fill="none" stroke="var(--navy)" stroke-width="2.5" points="' + v.map(function (x, i) { return X(i) + ',' + Y(x.v); }).join(' ') + '"/><circle cx="' + X(v.length - 1) + '" cy="' + Y(v[v.length - 1].v) + '" r="4" fill="var(--red)"/></svg>';
  }

  /* ---------- Recordatorio diario ---------- */
  function LN() { var C = window.Capacitor; return C && C.Plugins && C.Plugins.LocalNotifications; }
  function vistaAviso() {
    var a = P.aviso, sp = sesionPrevista(new Date());
    return '<section class="card stack"><h3 style="font-size:24px">Recordatorio diario</h3>' +
      '<p class="muted" style="margin:0">Cada día a la hora que elijas te avisa de lo que toca y de cómo vas esa semana. Ejemplo de hoy:</p>' +
      '<div class="ap-noti"><b>AF Entrena</b><span>' + esc(textoAviso(new Date())) + '</span></div>' +
      '<div class="cfg"><label for="ap-ah">Hora<input id="ap-ah" type="time" value="' + esc(a.hora) + '"></label></div>' +
      '<div class="row"><button class="btn red" data-ap="activar-aviso">' + (a.activo ? 'Guardar y reprogramar' : 'Activar recordatorio') + '</button>' +
      (a.activo ? '<button class="btn" data-ap="desactivar-aviso">Desactivar</button>' : '') + '<button class="btn" data-ap="probar-aviso">Probar ahora</button></div>' +
      '<p class="muted" style="margin:0;font-size:13px">' + (LN() ? 'Si el móvil pregunta, permite las notificaciones. Algunos móviles retrasan unos minutos los avisos para ahorrar batería.' : 'En el navegador solo avisa con la página abierta. En la app instalada avisa aunque esté cerrada.') + '</p></section>';
  }
  function textoAviso(d) {
    var sp = sesionPrevista(d), partes = [];
    if (sp) {
      partes.push('Hoy: ' + sp.txt);
      var ses = sesionesSemana(sp.sem.lunes).filter(function (s) { return s.tipo === 'Físico'; }).length;
      partes.push('Semana ' + (sp.sem.i + 1) + ' (' + MICRO[sp.sem.micro][0].toLowerCase() + '): ' + ses + '/' + P.plan.sesiones + ' sesiones');
      var dias = Math.round((deISO(P.plan.fecha) - deISO(iso(d))) / 864e5);
      if (dias > 0) partes.push('faltan ' + dias + ' días para ' + P.plan.nombre);
    } else partes.push('Hoy toca moverse: elige una rutina en Físico o registra tu entrenamiento de sala.');
    var o = P.objetivos.filter(function (x) { return progreso(x) < 100; })[0];
    if (o) partes.push(o.nombre + ': ' + progreso(o) + ' %');
    return partes.join(' · ');
  }
  async function programarAvisos() {
    var ln = LN(); if (!ln) return false;
    try {
      var perm = await ln.checkPermissions();
      if (perm.display !== 'granted') perm = await ln.requestPermissions();
      if (perm.display !== 'granted') { aviso('Sin permiso para notificaciones. Actívalo en los ajustes del móvil.'); return false; }
      var pend = await ln.getPending(); if (pend.notifications.length) await ln.cancel({ notifications: pend.notifications.map(function (n) { return { id: n.id }; }) });
      if (!P.aviso.activo) return true;
      var hm = P.aviso.hora.split(':'), lista = [];
      for (var k = 0; k < 14; k++) {
        var d = sumar(new Date(), k); d.setHours(+hm[0], +hm[1], 0, 0);
        if (d <= new Date()) continue;
        lista.push({ id: 100 + k, title: 'AF Entrena · ' + DIAS[d.getDay()], body: textoAviso(d), largeBody: textoAviso(d), schedule: { at: d, allowWhileIdle: true } });
      }
      await ln.schedule({ notifications: lista });
      return true;
    } catch (e) { aviso('No se pudo programar el aviso: ' + (e.message || e)); return false; }
  }
  var avisoWeb = null;
  function programarWeb() {
    clearTimeout(avisoWeb); if (!P.aviso.activo || LN() || !('Notification' in window)) return;
    var hm = P.aviso.hora.split(':'), d = new Date(); d.setHours(+hm[0], +hm[1], 0, 0); if (d <= new Date()) d = sumar(d, 1);
    avisoWeb = setTimeout(function () { try { new Notification('AF Entrena', { body: textoAviso(new Date()) }); } catch (e) {} programarWeb(); }, d - new Date());
  }

  /* =================================================================
     3. NUTRICIÓN
     ================================================================= */
  var OBJETIVOS = { perder: 'Perder grasa', ganar: 'Ganar peso', tonificar: 'Tonificar (recomposición)', masa: 'Ganar masa muscular' };
  function calcular(pf) {
    var e = edad(), peso = +pf.peso, alt = +pf.altura;
    var tmb = 10 * peso + 6.25 * alt - 5 * e + (pf.sexo === 'h' ? 5 : -161); // Mifflin-St Jeor
    var fact = { 2: 1.375, 3: 1.465, 4: 1.55, 5: 1.64, 6: 1.725, 7: 1.8 }[pf.dias] || 1.55;
    var gasto = tmb * fact, nivel = +pf.nivel, kcal, prot, ritmo;
    if (pf.objetivo === 'perder') { kcal = gasto - Math.min(500, gasto * (nivel === 1 ? 0.2 : 0.15)); prot = 2.0; ritmo = 'entre 0,5 y 1 % de tu peso por semana'; }
    else if (pf.objetivo === 'ganar') { kcal = gasto * 1.1; prot = 1.6; ritmo = 'unos 0,25-0,5 kg por semana'; }
    else if (pf.objetivo === 'masa') { kcal = gasto * (nivel === 1 ? 1.1 : nivel === 2 ? 1.07 : 1.05); prot = nivel === 3 ? 2.0 : 1.8; ritmo = nivel === 1 ? 'unos 0,5-1 kg al mes' : 'unos 0,25-0,5 kg al mes'; }
    else { kcal = gasto * 0.95; prot = 1.8; ritmo = 'peso casi estable: cambia la composición, no la báscula'; }
    var suelo = Math.max(tmb * 1.1, pf.sexo === 'h' ? 1600 : 1300);
    kcal = Math.round(Math.max(kcal, suelo) / 10) * 10;
    var gP = Math.round(prot * peso), gG = Math.round(Math.max(0.8 * peso, kcal * 0.27 / 9)), gC = Math.max(0, Math.round((kcal - gP * 4 - gG * 9) / 4));
    return { tmb: Math.round(tmb), gasto: Math.round(gasto), kcal: kcal, gP: gP, gG: gG, gC: gC, ritmo: ritmo, agua: Math.round(peso * 35 / 100) / 10, imc: peso / Math.pow(alt / 100, 2) };
  }
  // Menú orientativo para 2.000 kcal; se escala a tu objetivo
  var MENU = [
    ['Desayuno', [['Copos de avena', 50, 'g'], ['Leche o bebida de soja', 250, 'ml'], ['Plátano', 1, 'unidad'], ['Nueces', 15, 'g']]],
    ['Media mañana', [['Yogur natural', 125, 'g', 1], ['Fruta de temporada', 150, 'g']]],
    ['Comida', [['Arroz, pasta o quinoa (en crudo)', 70, 'g'], ['Pollo, pescado o legumbre cocida', 130, 'g', 1], ['Verduras', 200, 'g'], ['Aceite de oliva virgen extra', 10, 'ml'], ['Pan integral', 40, 'g']]],
    ['Merienda (antes de entrenar)', [['Pan integral', 60, 'g'], ['Pavo o queso fresco', 50, 'g', 1], ['Fruta', 150, 'g']]],
    ['Cena (después de entrenar)', [['Patata o boniato', 200, 'g'], ['Huevos o pescado', 2, 'huevos / 150 g pescado', 1], ['Ensalada', 150, 'g'], ['Aceite de oliva virgen extra', 10, 'ml']]]
  ];
  function menu(r, peso) {
    var f = r.kcal / 2000, pf = Math.max(0.85, Math.min(1.6, r.gP / (95 * f)));
    return MENU.map(function (m) {
      return '<div class="ap-comida"><h4>' + m[0] + '</h4><ul>' + m[1].map(function (a) {
        var q = a[1] * f * (a[3] ? pf : 1);
        if (a[2] === 'unidad') { q = Math.max(1, Math.round(q * 2) / 2); q = String(q).replace('.', ',') + (q > 1 ? ' unidades' : ' unidad'); }
        else if (a[2].indexOf('huevos') === 0) q = Math.max(1, Math.round(q)) + ' huevos o ' + Math.round(150 * f * pf / 10) * 10 + ' g de pescado';
        else q = Math.round(q / 5) * 5 + ' ' + a[2];
        return '<li><span>' + esc(a[0]) + '</span><b>' + q + '</b></li>';
      }).join('') + '</ul></div>';
    }).join('');
  }
  var CONSEJOS = {
    perder: ['Déficit moderado: si bajas demasiado rápido pierdes músculo y velocidad.', 'Proteína alta en cada comida y fuerza 2-3 veces por semana para conservar el músculo.', 'No recortes los hidratos antes de entrenar: rinde y quema más en la sesión.'],
    ganar: ['Añade una comida más o un batido casero (leche, plátano, avena y crema de cacahuete).', 'Prioriza alimentos densos: frutos secos, aceite de oliva, legumbres, arroz.', 'Pésate una vez por semana, a la misma hora.'],
    tonificar: ['Calorías casi de mantenimiento y proteína alta: pierdes grasa y ganas músculo poco a poco.', 'La fuerza manda: sesiones con pesas 3 veces por semana.', 'Mide la cintura y fotos cada 2-3 semanas; la báscula apenas cambiará.'],
    masa: ['Superávit pequeño: más calorías no es más músculo, es más grasa.', 'Reparte la proteína en 4-5 tomas de 20-40 g.', 'Progresa en cargas cada semana y duerme 8 horas.']
  };
  var subDieta = 'plan';
  function vistaDieta(o) {
    if (o && o.sub) subDieta = o.sub;
    var pf = P.perfil, e = edad();
    var tabs = pestanas(subDieta, [['plan', 'Mi dieta'], ['entreno', 'Entreno y competición'], ['suple', 'Suplementos']], 'subdieta');
    var cuerpo;
    if (subDieta === 'entreno') cuerpo = vistaNutriComp();
    else if (subDieta === 'suple') cuerpo = window.AF_SUPLEMENTOS ? window.AF_SUPLEMENTOS({ peso: pf.peso, edad: e }) : '';
    else if (!pf.peso || !pf.altura || !pf.nacimiento || !pf.objetivo || pf.editar) cuerpo = formPerfil();
    else if (e < 18) cuerpo = vistaMenores();
    else {
      var r = calcular(pf);
      if (pf.objetivo === 'perder' && r.imc < 18.5) cuerpo = '<section class="card stack" style="border-left:6px solid var(--gold)"><h3 style="font-size:24px">No te recomendamos perder peso</h3><p style="margin:0">Tu índice de masa corporal (' + r.imc.toFixed(1).replace('.', ',') + ') ya está por debajo de lo saludable. Bajar más puede costarte salud y rendimiento. Habla con un médico o un dietista-nutricionista; si quieres, elige «Tonificar» o «Ganar masa muscular».</p><button class="btn" data-ap="editar-perfil">Cambiar mis datos</button></section>';
      else cuerpo = vistaDietaAdulto(pf, r);
    }
    main().innerHTML = '<div class="stack">' + cabecera('Nutrición', 'Tu dieta según tu objetivo', 'Cálculo orientativo con la ecuación de Mifflin-St Jeor y las recomendaciones de proteína para deportistas. No sustituye a un dietista-nutricionista.') + tabs + cuerpo + '</div>';
  }
  function formPerfil() {
    var p = P.perfil;
    return '<form class="card stack" id="ap-fperfil"><h3 style="font-size:24px">Tus datos</h3><div class="cfg">' +
      '<label for="ap-fs">Sexo<select id="ap-fs" name="sexo"><option value="h" ' + (p.sexo === 'h' ? 'selected' : '') + '>Hombre</option><option value="m" ' + (p.sexo === 'm' ? 'selected' : '') + '>Mujer</option></select></label>' +
      '<label for="ap-fn">Fecha de nacimiento<input id="ap-fn" name="nacimiento" type="date" value="' + esc(p.nacimiento || '') + '" max="' + hoy() + '" required></label>' +
      '<label for="ap-fp">Peso (kg)<input id="ap-fp" name="peso" type="number" step="0.1" min="25" max="200" value="' + esc(p.peso || '') + '" required></label>' +
      '<label for="ap-fa">Altura (cm)<input id="ap-fa" name="altura" type="number" min="120" max="220" value="' + esc(p.altura || '') + '" required></label>' +
      '<label for="ap-fd">Días de entrenamiento por semana<select id="ap-fd" name="dias">' + [2, 3, 4, 5, 6, 7].map(function (n) { return '<option ' + (p.dias == n ? 'selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>' +
      '<label for="ap-fv">Nivel<select id="ap-fv" name="nivel">' + [1, 2, 3].map(function (n) { return '<option value="' + n + '" ' + (p.nivel == n ? 'selected' : '') + '>' + NIVELES[n] + '</option>'; }).join('') + '</select></label></div>' +
      '<div><div class="eyebrow" style="margin-bottom:6px">Objetivo</div><div class="chips">' + Object.keys(OBJETIVOS).map(function (k) { return '<label class="chip ap-radio"><input type="radio" name="objetivo" value="' + k + '" ' + (p.objetivo === k ? 'checked' : '') + ' required> ' + OBJETIVOS[k] + '</label>'; }).join('') + '</div></div>' +
      '<button class="btn red" type="submit">Calcular mi dieta</button></form>';
  }
  function vistaDietaAdulto(pf, r) {
    var tot = r.gP * 4 + r.gG * 9 + r.gC * 4;
    var barra = function (t, g, kc, col) { return '<div><div class="row" style="justify-content:space-between"><span>' + t + '</span><b>' + g + ' g</b></div><div class="meter"><i style="width:' + Math.round(100 * kc / tot) + '%;background:' + col + '"></i></div></div>'; };
    return '<div class="grid2"><section class="card stack"><div class="eyebrow">' + OBJETIVOS[pf.objetivo] + ' · ' + NIVELES[pf.nivel] + '</div>' +
      '<div><b style="font-family:var(--f-display);font-size:48px;line-height:1">' + r.kcal.toLocaleString('es-ES') + '</b> <span class="muted">kcal al día</span></div>' +
      '<p class="muted" style="margin:0;font-size:14px">Metabolismo basal ' + r.tmb.toLocaleString('es-ES') + ' kcal · gasto con tu actividad ' + r.gasto.toLocaleString('es-ES') + ' kcal. Ritmo esperado: ' + r.ritmo + '.</p>' +
      barra('Proteína (' + (Math.round(r.gP / pf.peso * 10) / 10).toString().replace('.', ',') + ' g/kg)', r.gP, r.gP * 4, 'var(--red)') + barra('Hidratos de carbono', r.gC, r.gC * 4, 'var(--gold)') + barra('Grasas', r.gG, r.gG * 9, 'var(--navy)') +
      '<p style="margin:0">Agua: unos <b>' + r.agua.toString().replace('.', ',') + ' litros</b> al día, más 0,5-0,75 litros por hora de entrenamiento.</p>' +
      '<div class="row"><button class="btn" data-ap="editar-perfil">Cambiar mis datos</button><button class="btn" data-ap="peso-objetivo">Seguir mi peso en «Objetivos»</button></div></section>' +
      '<section class="card stack"><div class="eyebrow">Claves para tu objetivo</div><ul class="ap-lista">' + CONSEJOS[pf.objetivo].map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>' +
      '<p class="muted" style="margin:0;font-size:13px">Revisa cada 2-3 semanas: si el peso no se mueve como esperabas, ajusta 100-150 kcal. Consulta con un profesional si tienes alguna enfermedad, tomas medicación o notas cansancio persistente, mareos o que comer se vuelve una preocupación.</p></section></div>' +
      '<section class="card stack"><div class="eyebrow">Ejemplo de un día</div><div class="ap-menu">' + menu(r, pf.peso) + '</div>' +
      '<p class="muted" style="margin:0;font-size:13px">Cantidades orientativas. Cambia alimentos por otros del mismo grupo (arroz por pasta, pollo por pescado o legumbre…).</p></section>';
  }
  function vistaMenores() {
    return '<section class="card stack" style="border-left:6px solid var(--green)"><h3 style="font-size:24px">Alimentación para deportistas jóvenes</h3>' +
      '<p style="margin:0">Para menores de 18 años la app no calcula calorías ni propone dietas para perder o ganar peso: estáis creciendo y lo importante es comer suficiente y variado para rendir. Si te preocupa tu peso, coméntalo con tu familia, tu pediatra o un dietista-nutricionista.</p>' +
      '<ul class="ap-lista"><li>Cinco comidas al día, sin saltarte el desayuno.</li><li>En cada plato: la mitad verduras y fruta, un cuarto hidratos (arroz, pasta, patata, pan) y un cuarto proteína (huevo, pescado, carne, legumbre).</li><li>Lácteos o alternativas 2-3 veces al día, para los huesos.</li><li>Agua siempre en la bolsa de entrenamiento.</li><li>Merienda 1-2 horas antes de entrenar: bocadillo pequeño y fruta.</li><li>Fuerza y técnica sí; suplementos, no hacen falta.</li></ul>' +
      '<button class="btn" data-ap="editar-perfil">Cambiar mis datos</button></section>';
  }
  function vistaNutriComp() {
    var b = function (t, l) { return '<section class="card stack"><h3 style="font-size:24px">' + t + '</h3><ul class="ap-lista">' + l.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></section>'; };
    return '<div class="grid2">' +
      b('Antes de entrenar', ['2-3 h antes: comida normal con hidratos (pasta, arroz, pan) y poca grasa.', '30-60 min antes: algo ligero, como un plátano o una tostada con miel.', 'Bebe 400-500 ml de agua en las 2 horas previas.']) +
      b('Después de entrenar', ['En las 2 horas siguientes: proteína (20-40 g) e hidratos para recargar.', 'Ejemplos: yogur con fruta y avena, bocadillo de pavo, leche con cacao.', 'Repón líquidos: cerca de 1,5 veces lo que hayas perdido sudando.']) +
      b('Día de competición de esgrima', ['El día es largo: poules por la mañana y eliminatorias por la tarde.', 'Desayuno conocido 3 horas antes del primer asalto. No pruebes nada nuevo.', 'Entre poules: pequeños tentempiés cada 60-90 min (fruta, barritas de cereales, frutos secos, bocadillo pequeño).', 'Agua a sorbos todo el día; con calor o más de 2 h de asaltos, bebida isotónica.', 'Entre poules y eliminatoria: comida ligera y fácil de digerir (pasta, pan, pavo).']) +
      b('Semana de la competición', ['Mantén tus comidas de siempre; no hagas dieta esa semana.', 'Los 2 días previos, un poco más de hidratos y buena hidratación.', 'Duerme bien: vale más que cualquier suplemento.']) +
      '</div>';
  }

  /* =================================================================
     EVENTOS
     ================================================================= */
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('button,[data-plantilla]'); if (!b || !main().contains(b)) return;
    var d = b.dataset;
    if (d.pesas != null) { P.rut.pesas = d.pesas === '1'; guardar(); vistaFisico(); }
    else if (d.nivel) { P.rut.nivel = +d.nivel; guardar(); vistaFisico(); }
    else if (d.rutina) { rutSel = d.rutina; sesSel = +d.ses; hechos = {}; inicioSesion = null; vistaFisico(); window.scrollTo(0, 0); }
    else if (d.goRutina) { window.AF_go('fisico', { rutina: d.goRutina, sesion: +d.ses }); hechos = {}; inicioSesion = null; }
    else if (d.serie) {
      hechos[d.serie] = !hechos[d.serie];
      b.setAttribute('aria-pressed', !!hechos[d.serie]); b.textContent = (hechos[d.serie] ? '✓ ' : '') + b.textContent.replace('✓ ', '');
      if (hechos[d.serie]) { var t = +d.t, de = +d.d; if (t) cuentaAtras(t, 'Trabajo', function () { cuentaAtras(de, 'Descanso'); }); else cuentaAtras(de, 'Descanso'); }
    }
    else if (d.subplan) { subPlan = d.subplan; vistaPlan(); }
    else if (d.subdieta) { subDieta = d.subdieta; vistaDieta(); }
    else if (d.borrarSes) { P.sesiones = P.sesiones.filter(function (s) { return s.id !== d.borrarSes; }); guardar(); vistaPlan(); programarAvisos(); }
    else if (d.borrarObj) { P.objetivos = P.objetivos.filter(function (o) { return o.id !== d.borrarObj; }); guardar(); vistaPlan(); }
    else if (d.plantilla != null) { var pl = PLANTILLAS[+d.plantilla]; document.getElementById('ap-on').value = pl[0]; document.getElementById('ap-ou').value = pl[1]; if (pl[0] === 'Peso corporal' && P.perfil.peso) document.getElementById('ap-oi').value = P.perfil.peso; document.getElementById('ap-oi').focus(); }
    else if (d.ap) accion(d.ap);
  });
  async function accion(a) {
    if (a === 'volver-rut') { rutSel = null; clearInterval(reloj); vistaFisico(); }
    else if (a === 'parar-reloj') { clearInterval(reloj); document.getElementById('ap-reloj').hidden = true; }
    else if (a === 'fin-sesion') {
      var x = RUTINAS.filter(function (r) { return r.id === rutSel; })[0], s = x.sesiones[sesSel];
      P.sesiones.push({ id: 's' + Date.now().toString(36), fecha: hoy(), tipo: 'Físico', nombre: x.t + ' ' + s.t.split(' · ')[0], min: +document.getElementById('ap-min').value || 30, rpe: Math.min(10, Math.max(1, +document.getElementById('ap-rpe').value || 6)) });
      guardar(); rutSel = null; inicioSesion = null; clearInterval(reloj); aviso('Sesión guardada. ¡Buen trabajo!'); programarAvisos();
      window.AF_go('plan', { sub: 'semana' });
    }
    else if (a === 'borrar-plan') { P.plan = null; guardar(); subPlan = 'semana'; vistaPlan(); }
    else if (a === 'editar-perfil') { P.perfil.editar = true; vistaDieta(); }
    else if (a === 'peso-objetivo') {
      if (!P.objetivos.some(function (o) { return o.nombre === 'Peso corporal'; })) {
        var r = calcular(P.perfil), meta = P.perfil.objetivo === 'perder' ? Math.round(P.perfil.peso * 0.95 * 10) / 10 : P.perfil.objetivo === 'tonificar' ? +P.perfil.peso : Math.round(P.perfil.peso * 1.03 * 10) / 10;
        P.objetivos.push({ id: 'o' + Date.now().toString(36), nombre: 'Peso corporal', unidad: 'kg', inicio: +P.perfil.peso, objetivo: meta, fecha: '', valores: [] }); guardar();
      }
      window.AF_go('plan', { sub: 'objetivos' });
    }
    else if (a === 'activar-aviso' || a === 'desactivar-aviso') {
      P.aviso.hora = document.getElementById('ap-ah').value || '19:00'; P.aviso.activo = a === 'activar-aviso'; guardar();
      if (LN()) { var ok = await programarAvisos(); if (ok) aviso(P.aviso.activo ? 'Recordatorio programado a las ' + P.aviso.hora : 'Recordatorio desactivado'); }
      else { if (P.aviso.activo && 'Notification' in window && Notification.permission !== 'granted') { try { await Notification.requestPermission(); } catch (e) {} } programarWeb(); aviso(P.aviso.activo ? 'Recordatorio activado a las ' + P.aviso.hora : 'Recordatorio desactivado'); }
      vistaPlan();
    }
    else if (a === 'probar-aviso') {
      var ln = LN();
      if (ln) { try { var pm = await ln.requestPermissions(); if (pm.display === 'granted') { await ln.schedule({ notifications: [{ id: 99, title: 'AF Entrena', body: textoAviso(new Date()), schedule: { at: new Date(Date.now() + 3000) } }] }); aviso('Llegará en 3 segundos'); } } catch (e) { aviso('Error: ' + (e.message || e)); } }
      else if ('Notification' in window) { try { var pr = await Notification.requestPermission(); if (pr === 'granted') new Notification('AF Entrena', { body: textoAviso(new Date()) }); else aviso('El navegador no permite notificaciones'); } catch (e) { aviso('Este navegador no permite notificaciones'); } }
      else aviso('Este navegador no permite notificaciones');
    }
  }
  document.addEventListener('submit', function (ev) {
    var f = ev.target; if (!main().contains(f)) return;
    var fd = new FormData(f), v = function (k) { return (fd.get(k) || '').toString().trim(); };
    if (f.id === 'ap-fplan') { ev.preventDefault(); P.plan = { nombre: v('nombre') || 'Competición', fecha: v('fecha'), sesiones: +v('sesiones') || 3, nivel: +v('nivel') || 2, inicio: (P.plan && P.plan.inicio) || hoy() }; guardar(); subPlan = 'semana'; vistaPlan(); programarAvisos(); aviso('Plan creado'); }
    else if (f.id === 'ap-freg') { ev.preventDefault(); P.sesiones.push({ id: 's' + Date.now().toString(36), fecha: v('fecha') || hoy(), tipo: v('tipo'), min: +v('min') || 60, rpe: Math.min(10, Math.max(1, +v('rpe') || 6)) }); guardar(); vistaPlan(); programarAvisos(); aviso('Entrenamiento anotado'); }
    else if (f.id === 'ap-fobj') { ev.preventDefault(); P.objetivos.push({ id: 'o' + Date.now().toString(36), nombre: v('nombre'), unidad: v('unidad'), inicio: +v('inicio'), objetivo: +v('objetivo'), fecha: v('fecha'), valores: [] }); guardar(); vistaPlan(); aviso('Objetivo añadido'); }
    else if (f.classList.contains('ap-fval')) { ev.preventDefault(); var o = P.objetivos.filter(function (x) { return x.id === f.dataset.obj; })[0]; o.valores.push({ fecha: hoy(), v: +v('v') }); if (o.nombre === 'Peso corporal') P.perfil.peso = +v('v'); guardar(); vistaPlan(); }
    else if (f.id === 'ap-fperfil') { ev.preventDefault(); P.perfil = { sexo: v('sexo'), nacimiento: v('nacimiento'), peso: +v('peso'), altura: +v('altura'), dias: +v('dias'), nivel: +v('nivel'), objetivo: v('objetivo') }; guardar(); vistaDieta(); window.scrollTo(0, 0); }
  });

  // Registro en la app original
  window.AF_EXTRA = { plan: vistaPlan, fisico: vistaFisico, dieta: vistaDieta };
  // Al abrir la app se reprograman los avisos con los datos del día
  if (P.aviso.activo) { setTimeout(function () { if (LN()) programarAvisos(); else programarWeb(); }, 1500); }
})();
