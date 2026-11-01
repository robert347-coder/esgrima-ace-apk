/* =====================================================================
   CAPA INTERACTIVA COMÚN · Amazing Fencing (las 5 apps)
   - Iconos en las pestañas y barra inferior en el móvil (máx. 5 huecos;
     el resto va a una hoja «Más»).
   - Entrada animada de cada pantalla, onda y vibración suave al pulsar.
   - Bienvenida guiada la primera vez (deslizable).
   Configuración por app en window.AF_UI = { id, nombre, intro: [[icono, título, texto], ...] }
   ===================================================================== */
(function () {
  'use strict';
  var CFG = window.AF_UI || { id: 'app', intro: [] };
  var S = function (p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
  var ICO = {
    home: S('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>'),
    learn: S('<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 21.5V4.5M8 7h8M8 11h6"/>'),
    warm: S('<path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8a7 7 0 0 0 7 7z"/>'),
    tabata: S('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>'),
    games: S('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
    bank: S('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/>'),
    coach: S('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>'),
    comp: S('<path d="M3 5h5v4H3zM3 15h5v4H3zM8 7h3v10H8M11 12h4M15 9h6v6h-6z"/>'),
    dt: S('<path d="M5 21V4h12l-2 4 2 4H5"/>'),
    ref: S('<path d="M3 12h11a4 4 0 1 1-4 4"/><path d="M14 8h7v4M3 12V8h6"/><circle cx="10" cy="16" r="1"/>'),
    plan: S('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 15l2.5 2.5L16 13"/>'),
    fisico: S('<path d="M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12"/>'),
    dieta: S('<path d="M12 7c-1-3-4-4-6-3 0 3 2 5 6 3z"/><path d="M12 7c3-2 8-1 8 5s-4 10-8 8c-4 2-8-2-8-8 0-4 3-6 8-5z"/>'),
    menu: S('<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 2-3 5s1 4 3 4v9"/>'),
    alimentos: S('<path d="M20.8 6.6a5 5 0 0 0-8.8-2.4 5 5 0 0 0-8.8 2.4C2 11 7 15.5 12 20c5-4.5 10-9 8.8-13.4z"/>'),
    peso: S('<rect x="3" y="4" width="18" height="17" rx="4"/><path d="M8 9a6 6 0 0 1 8 0l-3 3"/>'),
    suple: S('<rect x="3" y="9" width="18" height="7" rx="3.5" transform="rotate(-35 12 12.5)"/><path d="M9 8l5 8"/>'),
    perfil: S('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    mas: S('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'),
    sable: S('<path d="M4 20L18 6M15 4l5 5M6 15l3 3"/>'),
    reloj: S('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>')
  };
  window.AF_ICO = ICO;
  var movil = function () { return window.matchMedia('(max-width: 820px)').matches; };

  /* ---------- Pestañas: iconos, barra inferior y «Más» ---------- */
  var tabs = document.getElementById('tabs'), obs = null;
  var OPC = { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-current'] };
  function arreglarPestanas() {
    if (!tabs) return;
    if (obs) obs.disconnect(); // nuestros propios cambios no deben volver a disparar el arreglo
    var bs = Array.prototype.slice.call(tabs.querySelectorAll('button[data-v]'));
    bs.forEach(function (b) {
      if (!b.querySelector('svg')) { var t = b.textContent; b.innerHTML = (ICO[b.dataset.v] || ICO.home) + '<span class="af-et">' + t + '</span>'; b.setAttribute('aria-label', t); }
      b.classList.remove('af-oculto');
    });
    var mas = tabs.querySelector('.af-mas'); if (mas) mas.remove();
    if (movil() && bs.length > 5) {
      var visibles = 4, actual = bs.findIndex(function (b) { return b.getAttribute('aria-current') === 'page'; });
      bs.forEach(function (b, i) { if (i >= visibles) b.classList.add('af-oculto'); });
      var m = document.createElement('button');
      m.type = 'button'; m.className = 'af-mas'; m.innerHTML = ICO.mas + '<span class="af-et">Más</span>'; m.setAttribute('aria-label', 'Más secciones');
      if (actual >= visibles) { m.setAttribute('aria-current', 'page'); m.innerHTML = (ICO[bs[actual].dataset.v] || ICO.mas) + '<span class="af-et">' + bs[actual].querySelector('.af-et').textContent + '</span>'; }
      m.addEventListener('click', function () { abrirHoja(bs.slice(visibles)); });
      tabs.appendChild(m);
    }
    if (obs) obs.observe(tabs, OPC);
  }
  function abrirHoja(lista) {
    cerrarHoja();
    var f = document.createElement('div'); f.className = 'af-hoja-fondo';
    var h = document.createElement('div'); h.className = 'af-hoja'; h.setAttribute('role', 'dialog'); h.setAttribute('aria-label', 'Más secciones');
    h.innerHTML = '<h2>Más secciones</h2><div class="af-hoja-grid">' + lista.map(function (b) {
      return '<button data-ir="' + b.dataset.v + '"' + (b.getAttribute('aria-current') === 'page' ? ' aria-current="page"' : '') + '>' + (ICO[b.dataset.v] || ICO.home) + b.querySelector('.af-et').textContent + '</button>';
    }).join('') + '</div>';
    f.addEventListener('click', cerrarHoja);
    h.addEventListener('click', function (e) { var x = e.target.closest('[data-ir]'); if (!x) return; cerrarHoja(); var o = tabs.querySelector('button[data-v="' + x.dataset.ir + '"]'); if (o) o.click(); });
    document.body.appendChild(f); document.body.appendChild(h);
    var p = h.querySelector('button'); if (p) p.focus();
  }
  function cerrarHoja() { document.querySelectorAll('.af-hoja,.af-hoja-fondo').forEach(function (x) { x.remove(); }); }
  if (tabs) {
    obs = new MutationObserver(function (recs) {
      // la onda al pulsar no cuenta como cambio de pestañas
      var real = recs.some(function (r) {
        if (r.type === 'attributes') return true;
        var nodos = Array.prototype.slice.call(r.addedNodes).concat(Array.prototype.slice.call(r.removedNodes));
        return nodos.some(function (n) { return !(n.classList && n.classList.contains('af-onda')); });
      });
      if (real) arreglarPestanas();
    });
    window.matchMedia('(max-width: 820px)').addEventListener('change', arreglarPestanas);
    arreglarPestanas();
  }

  /* ---------- Entrada animada de cada pantalla ---------- */
  var main = document.getElementById('main'), ultimo = '';
  if (main) new MutationObserver(function () {
    var vista = (tabs && tabs.querySelector('[aria-current="page"]') || {}).dataset;
    var clave = vista ? vista.v : '';
    if (clave !== ultimo) { ultimo = clave; main.classList.remove('af-entra'); void main.offsetWidth; main.classList.add('af-entra'); }
  }).observe(main, { childList: true });

  /* ---------- Sombra de la cabecera al desplazarse ---------- */
  var top = document.querySelector('.top');
  window.addEventListener('scroll', function () { if (top) top.classList.toggle('af-sombra', window.scrollY > 6); }, { passive: true });

  /* ---------- Onda y vibración al pulsar ---------- */
  var ultimaVib = 0;
  function vibrar() {
    var t = Date.now(); if (t - ultimaVib < 60) return; ultimaVib = t;
    try { var H = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics; if (H) { H.impact({ style: 'LIGHT' }); return; } } catch (e) {}
    try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {}
  }
  document.addEventListener('pointerdown', function (e) {
    var b = e.target.closest('.btn, .tile, .routine, .tabs button, .af-hoja-grid button'); if (!b) return;
    vibrar();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var r = b.getBoundingClientRect(), d = Math.max(r.width, r.height), o = document.createElement('span');
    o.className = 'af-onda'; o.style.width = o.style.height = d + 'px'; o.style.left = (e.clientX - r.left - d / 2) + 'px'; o.style.top = (e.clientY - r.top - d / 2) + 'px';
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    b.style.overflow = 'hidden'; b.appendChild(o); setTimeout(function () { o.remove(); }, 520);
  }, { passive: true });

  /* ---------- Bienvenida guiada (solo la primera vez) ---------- */
  var CLAVE = 'af-ui-intro-' + CFG.id;
  function yaVista() { try { return localStorage.getItem(CLAVE) === '1'; } catch (e) { return true; } }
  function marcarVista() { try { localStorage.setItem(CLAVE, '1'); } catch (e) {} }
  function intro() {
    if (!CFG.intro || !CFG.intro.length || yaVista()) return;
    var paso = 0, el = document.createElement('div');
    el.className = 'af-intro'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Bienvenida');
    function pintar() {
      var p = CFG.intro[paso], ult = paso === CFG.intro.length - 1;
      el.innerHTML = '<button class="af-intro-saltar" data-i="fin">Saltar</button>' +
        '<div class="af-intro-pasos"><div class="af-intro-paso"><div class="af-intro-ico">' + (ICO[p[0]] || ICO.home) + '</div><h2>' + p[1] + '</h2><p>' + p[2] + '</p></div></div>' +
        '<div class="af-intro-pie"><div class="af-puntos">' + CFG.intro.map(function (_, i) { return '<i class="' + (i === paso ? 'act' : '') + '"></i>'; }).join('') + '</div>' +
        '<button class="btn" data-i="' + (ult ? 'fin' : 'sig') + '">' + (ult ? 'Empezar' : 'Siguiente') + '</button></div>';
    }
    function cerrar() { marcarVista(); el.style.transition = 'opacity .25s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 260); }
    el.addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (!b) return; vibrar(); if (b.dataset.i === 'fin') cerrar(); else { paso++; pintar(); } });
    var x0 = null;
    el.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', function (e) {
      if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (dx < -50 && paso < CFG.intro.length - 1) { paso++; pintar(); } else if (dx > 50 && paso > 0) { paso--; pintar(); }
    });
    pintar(); document.body.appendChild(el);
  }
  // La guía «Bob» de la app original aparece la primera vez: esperamos a que acabe la bienvenida
  intro();
})();
