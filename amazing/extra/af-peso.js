/* =====================================================================
   AF PESO · Control de peso y dieta personalizada
   ---------------------------------------------------------------------
   Pantallas: Hoy · Mi dieta · Alimentos · Mi peso · Suplementos · Mis datos
   - Calcula calorías y macronutrientes según objetivo y nivel.
   - Monta el menú del día SOLO con alimentos que te gustan, con gramos y
     calorías de cada alimento, y deja cambiar cualquiera por otro
     equivalente.
   - Registra el peso, dibuja la tendencia y avisa si vas demasiado rápido.
   - Recordatorio diario para pesarse.
   Salvaguardas: menores de 18 sin calorías ni dietas de pérdida de peso;
   IMC bajo sin opción de perder peso; nunca por debajo de un mínimo.
   Datos solo en el móvil (localStorage «af-peso-v1»).
   ===================================================================== */
(function () {
  'use strict';
  var KEY = 'af-peso-v1';
  var P = { perfil: {}, gustos: {}, pesos: [], menu: { semilla: 1, cambios: {} }, cumplido: {}, agua: {}, aviso: { activo: false, hora: '08:00' } };
  try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); for (var k in o) P[k] = o[k]; } } catch (e) {}
  function guardar() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} }
  var main = function () { return document.getElementById('main'); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function z(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }
  function deISO(s) { var a = s.split('-'); return new Date(+a[0], a[1] - 1, +a[2]); }
  function hoy() { return iso(new Date()); }
  function sumar(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function corta(d) { return d.getDate() + ' ' + MESES[d.getMonth()]; }
  function num(x, d) { return Number(x).toLocaleString('es-ES', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function aviso(t) { var el = document.querySelector('.toast'); if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); } el.textContent = t; el.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(function () { el.hidden = true; }, 2600); }
  function cabecera(eb, t, x) { return '<section class="card"><div class="eyebrow">' + eb + '</div><h2 style="font-size:32px;margin-top:4px">' + t + '</h2>' + (x ? '<p class="muted" style="margin:6px 0 0;max-width:72ch">' + x + '</p>' : '') + '</section>'; }
  function edad() { var f = P.perfil.nacimiento; if (!f) return null; var n = deISO(f), h = new Date(), e = h.getFullYear() - n.getFullYear(); if (h < new Date(h.getFullYear(), n.getMonth(), n.getDate())) e--; return e; }
  function menor() { var e = edad(); return e != null && e < 18; }
  function pesoActual() { return P.pesos.length ? P.pesos[P.pesos.length - 1].kg : +P.perfil.peso || 0; }
  function perfilListo() { var p = P.perfil; return p.peso && p.altura && p.nacimiento && p.objetivo && p.sexo; }

  /* =================================================================
     ALIMENTOS (por 100 g: kcal, proteína, hidratos, grasa)
     m: en qué comidas encaja (d desayuno, a almuerzo/comida, m merienda, c cena)
     u: peso de una unidad, para mostrarla además de los gramos
     ================================================================= */
  var GRUPOS = { prot: 'Proteínas', hc: 'Hidratos de carbono', ver: 'Verduras', fru: 'Frutas', lac: 'Lácteos y alternativas', gra: 'Grasas saludables' };
  var A = [
    // id, nombre, grupo, kcal, P, HC, G, comidas, unidad
    ['pollo', 'Pechuga de pollo', 'prot', 110, 23, 0, 1.5, 'ac'], ['pavo', 'Pechuga de pavo', 'prot', 105, 24, 0, 1, 'acm'], ['ternera', 'Ternera magra', 'prot', 130, 21, 0, 5, 'ac'],
    ['cerdo', 'Lomo de cerdo', 'prot', 150, 21, 0, 7, 'ac'], ['merluza', 'Merluza', 'prot', 75, 17, 0, 0.8, 'ac'], ['salmon', 'Salmón', 'prot', 200, 20, 0, 13, 'ac'],
    ['atun', 'Atún al natural (lata)', 'prot', 110, 25, 0, 1, 'acm'], ['gambas', 'Gambas o langostinos', 'prot', 85, 19, 0, 1, 'ac'], ['huevo', 'Huevos', 'prot', 145, 12.5, 0.7, 10, 'dacm', ['huevo', 'huevos', 60]],
    ['tofu', 'Tofu firme', 'prot', 120, 13, 2, 7, 'ac'], ['lentejas', 'Lentejas cocidas', 'prot', 115, 9, 20, 0.4, 'a'], ['garbanzos', 'Garbanzos cocidos', 'prot', 165, 9, 27, 2.6, 'a'],
    ['qfresco', 'Queso fresco batido 0 %', 'prot', 50, 8, 4, 0.2, 'dm'], ['jamon', 'Jamón serrano sin grasa', 'prot', 160, 31, 0, 4, 'dm'],
    ['arroz', 'Arroz (en crudo)', 'hc', 350, 7, 77, 0.6, 'ac'], ['pasta', 'Pasta (en crudo)', 'hc', 355, 12, 72, 1.5, 'ac'], ['patata', 'Patata', 'hc', 80, 2, 17, 0.1, 'ac'],
    ['boniato', 'Boniato', 'hc', 86, 1.6, 20, 0.1, 'ac'], ['quinoa', 'Quinoa (en crudo)', 'hc', 365, 14, 64, 6, 'ac'], ['cuscus', 'Cuscús (en crudo)', 'hc', 360, 12, 73, 0.6, 'ac'],
    ['pan', 'Pan integral', 'hc', 245, 9, 43, 3.4, 'dacm'], ['avena', 'Copos de avena', 'hc', 370, 13, 60, 7, 'dm'], ['tortitas', 'Tortitas de arroz o maíz', 'hc', 380, 8, 80, 3, 'dm', ['tortita', 'tortitas', 8]],
    ['brocoli', 'Brócoli', 'ver', 35, 2.8, 4, 0.4, 'ac'], ['calabacin', 'Calabacín', 'ver', 17, 1.2, 3, 0.3, 'ac'], ['espinacas', 'Espinacas', 'ver', 23, 2.9, 1.4, 0.4, 'ac'],
    ['tomate', 'Tomate', 'ver', 18, 0.9, 3.5, 0.2, 'ac'], ['judias', 'Judías verdes', 'ver', 31, 1.8, 4.5, 0.2, 'ac'], ['pimiento', 'Pimiento', 'ver', 25, 1, 4.5, 0.3, 'ac'],
    ['ensalada', 'Ensalada variada', 'ver', 17, 1.3, 2.5, 0.2, 'ac'], ['champi', 'Champiñones', 'ver', 22, 3, 1, 0.3, 'ac'], ['zanahoria', 'Zanahoria', 'ver', 40, 0.9, 8, 0.2, 'ac'],
    ['platano', 'Plátano', 'fru', 90, 1.1, 21, 0.3, 'dm', ['plátano', 'plátanos', 120]], ['manzana', 'Manzana', 'fru', 52, 0.3, 12, 0.2, 'dm', ['manzana', 'manzanas', 180]], ['naranja', 'Naranja', 'fru', 47, 0.9, 10, 0.1, 'dm', ['naranja', 'naranjas', 200]],
    ['fresas', 'Fresas', 'fru', 32, 0.7, 6, 0.3, 'dm'], ['kiwi', 'Kiwi', 'fru', 61, 1.1, 13, 0.5, 'dm', ['kiwi', 'kiwis', 90]], ['pera', 'Pera', 'fru', 57, 0.4, 13, 0.1, 'dm', ['pera', 'peras', 170]],
    ['arandanos', 'Arándanos', 'fru', 57, 0.7, 12, 0.3, 'dm'], ['melon', 'Melón o sandía', 'fru', 34, 0.8, 7.5, 0.2, 'dm'],
    ['yogur', 'Yogur natural', 'lac', 61, 3.5, 4.7, 3.3, 'dm', ['yogur', 'yogures', 125]], ['skyr', 'Yogur griego 0 % o skyr', 'lac', 60, 10, 4, 0.2, 'dm'], ['leche', 'Leche semidesnatada', 'lac', 46, 3.2, 4.8, 1.6, 'dm'],
    ['soja', 'Bebida de soja', 'lac', 40, 3.3, 2, 1.8, 'dm'], ['kefir', 'Kéfir', 'lac', 55, 3.5, 4, 2.5, 'dm'],
    ['aove', 'Aceite de oliva virgen extra', 'gra', 884, 0, 0, 100, 'dac'], ['aguacate', 'Aguacate', 'gra', 160, 2, 2, 15, 'dac'], ['nueces', 'Nueces', 'gra', 650, 15, 7, 65, 'dm'],
    ['almendras', 'Almendras', 'gra', 580, 21, 9, 50, 'dm'], ['cacahuete', 'Crema de cacahuete', 'gra', 590, 25, 15, 50, 'dm'], ['aceitunas', 'Aceitunas', 'gra', 145, 1, 4, 15, 'ac']
  ].map(function (x) { return { id: x[0], n: x[1], g: x[2], kcal: x[3], p: x[4], c: x[5], f: x[6], m: x[7], u: x[8] || null }; });
  var POR_ID = {}; A.forEach(function (a) { POR_ID[a.id] = a; });

  /* =================================================================
     CÁLCULO DE CALORÍAS Y MACRONUTRIENTES
     ================================================================= */
  var OBJ = { perder: 'Perder grasa', mantener: 'Mantener peso', tonificar: 'Tonificar (recomposición)', masa: 'Ganar masa muscular', ganar: 'Ganar peso' };
  var NIV = ['', 'Iniciación', 'Intermedio', 'Avanzado'];
  var ACT = { 1: ['Sedentario (sin entrenar)', 1.2], 2: ['1-2 días de ejercicio', 1.375], 3: ['3-4 días', 1.55], 4: ['5-6 días', 1.725], 5: ['Doble sesión o trabajo físico', 1.9] };
  function calcular() {
    var p = P.perfil, peso = pesoActual(), alt = +p.altura, e = edad(), nivel = +p.nivel || 1;
    var tmb = 10 * peso + 6.25 * alt - 5 * e + (p.sexo === 'h' ? 5 : -161);
    var gasto = tmb * (ACT[p.actividad] || ACT[3])[1], kcal, prot, ritmo;
    switch (p.objetivo) {
      case 'perder': kcal = gasto - Math.min(500, gasto * (nivel === 1 ? 0.2 : 0.15)); prot = 2.0; ritmo = 'perder entre 0,5 y 1 % de tu peso por semana'; break;
      case 'tonificar': kcal = gasto * 0.95; prot = 1.8; ritmo = 'peso casi estable mientras cambias grasa por músculo'; break;
      case 'masa': kcal = gasto * (nivel === 1 ? 1.1 : nivel === 2 ? 1.07 : 1.05); prot = nivel === 3 ? 2.0 : 1.8; ritmo = nivel === 1 ? 'ganar 0,5-1 kg al mes' : 'ganar 0,25-0,5 kg al mes'; break;
      case 'ganar': kcal = gasto * 1.12; prot = 1.6; ritmo = 'ganar 0,25-0,5 kg por semana'; break;
      default: kcal = gasto; prot = 1.6; ritmo = 'mantener tu peso (±1 kg)';
    }
    var suelo = Math.max(tmb * 1.1, p.sexo === 'h' ? 1600 : 1300);
    kcal = Math.round(Math.max(kcal, suelo) / 10) * 10;
    var gP = Math.round(prot * peso), gG = Math.round(Math.max(0.8 * peso, kcal * 0.27 / 9)), gC = Math.max(0, Math.round((kcal - gP * 4 - gG * 9) / 4));
    return { tmb: Math.round(tmb), gasto: Math.round(gasto), kcal: kcal, gP: gP, gG: gG, gC: gC, ritmo: ritmo, imc: peso / Math.pow(alt / 100, 2), agua: Math.round(peso * 35 / 100) / 10, kgSemana: (kcal - gasto) * 7 / 7700 };
  }

  /* =================================================================
     GENERADOR DE MENÚ CON TUS ALIMENTOS
     Cada comida tiene «huecos» con un papel: proteína, hidrato, grasa,
     verdura o fruta (cantidad fija). Las cantidades se calculan para
     acercarse a las calorías y la proteína de esa comida.
     ================================================================= */
  var COMIDAS = [
    { id: 'd', n: 'Desayuno', pct: 0.25, huecos: [['lac', 'prot'], ['hc', 'hc'], ['fru', 'fijo', 120], ['gra', 'gra']] },
    { id: 'mm', n: 'Media mañana', pct: 0.10, huecos: [['lac', 'prot'], ['fru', 'fijo', 150]], m: 'm' },
    { id: 'a', n: 'Comida', pct: 0.30, huecos: [['prot', 'prot'], ['hc', 'hc'], ['ver', 'fijo', 200], ['gra', 'gra']] },
    { id: 'm', n: 'Merienda', pct: 0.15, huecos: [['hc', 'hc'], ['prot', 'prot'], ['fru', 'fijo', 120]] },
    { id: 'c', n: 'Cena', pct: 0.20, huecos: [['prot', 'prot'], ['ver', 'fijo', 200], ['hc', 'hc'], ['gra', 'gra']] }
  ];
  function opciones(grupo, momento) {
    var cand = A.filter(function (a) { return a.g === grupo && a.m.indexOf(momento) >= 0 && P.gustos[a.id] !== -1; });
    var fav = cand.filter(function (a) { return P.gustos[a.id] === 1; });
    return fav.length ? fav : cand;
  }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function macros(a, g) { return { kcal: a.kcal * g / 100, p: a.p * g / 100, c: a.c * g / 100, f: a.f * g / 100 }; }
  function redondear(a, g) { if (a.u && a.g !== 'fru') return Math.max(1, Math.round(g / a.u[2])) * a.u[2]; return Math.max(5, Math.round(g / 5) * 5); }

  function montarComida(com, r) {
    var obj = { kcal: r.kcal * com.pct, p: r.gP * com.pct, f: r.gG * com.pct }, items = [], tot = { kcal: 0, p: 0, c: 0, f: 0 };
    var momento = com.m || com.id.charAt(0);
    function sumarT(m) { tot.kcal += m.kcal; tot.p += m.p; tot.c += m.c; tot.f += m.f; }
    function elegir(h, k) {
      var ops = opciones(h[0], momento); if (!ops.length) return null;
      var slot = com.id + k, i = (hash(P.menu.semilla + slot) + (P.menu.cambios[slot] || 0)) % ops.length;
      return { a: ops[i], slot: slot, n: ops.length };
    }
    var orden = ['fijo', 'prot', 'gra', 'hc'];
    var elegidos = com.huecos.map(function (h, k) { return { h: h, k: k, e: elegir(h, k) }; });
    orden.forEach(function (rol) {
      elegidos.filter(function (x) { return x.h[1] === rol && x.e; }).forEach(function (x) {
        var a = x.e.a, g;
        if (rol === 'fijo') g = x.h[2];
        else if (rol === 'prot') { var falta = obj.p * 0.85 - tot.p; g = a.p ? falta / (a.p / 100) : 100; g = Math.min(a.g === 'lac' ? 250 : 250, Math.max(a.g === 'lac' ? 125 : 50, g)); }
        else if (rol === 'gra') { var fg = obj.f - tot.f; g = Math.min(a.id === 'aove' ? 20 : 40, fg / (a.f / 100)); if (g < 4) return; }
        else { var fk = obj.kcal - tot.kcal; g = Math.min(400, fk / (a.kcal / 100)); if (g < 15) return; }
        g = redondear(a, g);
        var m = macros(a, g); sumarT(m);
        items.push({ a: a, g: g, m: m, slot: x.e.slot, alternativas: x.e.n, k: x.k });
      });
    });
    items.sort(function (x, y) { return x.k - y.k; });
    return { com: com, items: items, tot: tot, obj: obj };
  }
  function cantidad(a, g) {
    if (a.u && a.g === 'fru') { var uf = Math.round(g / a.u[2] * 2) / 2; return g + ' g <span class="muted">(≈ ' + num(Math.max(0.5, uf), uf % 1 ? 1 : 0) + ' ' + (uf > 1 ? a.u[1] : a.u[0]) + ')</span>'; }
    if (a.u) { var u = Math.round(g / a.u[2]); return u + ' ' + (u === 1 ? a.u[0] : a.u[1]) + ' <span class="muted">(' + g + ' g)</span>'; }
    if (a.id === 'aove') return g + ' ml <span class="muted">(' + num(g / 10, 1) + ' cucharadas)</span>';
    if (a.g === 'lac' && (a.id === 'leche' || a.id === 'soja' || a.id === 'kefir')) return g + ' ml';
    return g + ' g';
  }

  /* =================================================================
     PANTALLAS
     ================================================================= */
  function sinPerfil() { return '<section class="card stack"><h3 style="font-size:24px">Empieza por tus datos</h3><p style="margin:0">Con tu peso, altura, edad, actividad y objetivo calculamos tus calorías y tu menú.</p><button class="btn red" data-pv="perfil">Rellenar mis datos</button></section>'; }
  function bloqueMenor() {
    return '<section class="card stack" style="border-left:6px solid var(--green)"><h3 style="font-size:24px">Para menores de 18 años</h3><p style="margin:0">Mientras creces, la app no calcula calorías ni propone dietas para perder o ganar peso. Lo importante es comer suficiente y variado. Si te preocupa tu peso, habla con tu familia, tu pediatra o un dietista-nutricionista.</p>' +
      '<ul class="ap-lista"><li>Cinco comidas al día, sin saltarte el desayuno.</li><li>En el plato: la mitad verdura y fruta, un cuarto hidratos y un cuarto proteína.</li><li>Lácteos 2-3 veces al día y agua siempre a mano.</li></ul></section>';
  }

  function vistaHoy() {
    if (!perfilListo()) { main().innerHTML = '<div class="stack">' + heroPeso() + sinPerfil() + '</div>'; return; }
    var h = hoy(), r = menor() ? null : calcular(), ag = P.agua[h] || 0, vasos = r ? Math.round(r.agua / 0.25) : 8;
    var racha = 0; for (var d = new Date(); P.cumplido[iso(d)]; d = sumar(d, -1)) racha++;
    var ritmo = ritmoSemanal(), alerta = alertaRitmo(ritmo);
    var proxima = (function () { var hr = new Date().getHours(); return hr < 10 ? 0 : hr < 12 ? 1 : hr < 16 ? 2 : hr < 19 ? 3 : 4; })();
    main().innerHTML = '<div class="stack">' + heroPeso() +
      (alerta ? '<section class="card" style="border-left:6px solid var(--gold)"><b>' + alerta + '</b></section>' : '') +
      '<div class="grid2">' +
        '<section class="card stack"><div class="eyebrow">' + esc(OBJ[P.perfil.objetivo]) + '</div>' + (r ? '<div><b style="font-family:var(--f-display);font-size:48px;line-height:1">' + num(r.kcal) + '</b> <span class="muted">kcal hoy</span></div><div class="muted">Proteína ' + r.gP + ' g · Hidratos ' + r.gC + ' g · Grasas ' + r.gG + ' g</div>' : '<p style="margin:0">Come variado y suficiente.</p>') +
          pesoResumen() + '<div class="row"><button class="btn red" data-pv="peso">Registrar peso</button><button class="btn" data-pv="menu">Ver mi menú</button></div></section>' +
        '<section class="card stack"><div class="eyebrow">Agua de hoy</div><div class="ap-vasos">' + Array.from({ length: vasos }, function (_, i) { return '<span class="' + (i < ag ? 'lleno' : '') + '"></span>'; }).join('') + '</div>' +
          '<div class="row"><button class="btn" data-agua="-1" aria-label="Quitar un vaso">−</button><b>' + ag + ' de ' + vasos + ' vasos (250 ml)</b><button class="btn red" data-agua="1" aria-label="Añadir un vaso">+ vaso</button></div>' +
          '<div class="eyebrow" style="margin-top:8px">¿Has seguido tu plan hoy?</div><div class="row"><button class="btn ' + (P.cumplido[h] ? 'red' : '') + '" data-cumplido="1">' + (P.cumplido[h] ? '✓ Sí, hoy cumplido' : 'Marcar como cumplido') + '</button><span class="muted">Racha: <b>' + racha + ' ' + (racha === 1 ? 'día' : 'días') + '</b></span></div></section></div>' +
      (r && !(P.perfil.objetivo === 'perder' && r.imc < 18.5) ? '<section class="card stack"><div class="eyebrow">Tu próxima comida</div>' + tarjetaComida(montarComida(COMIDAS[proxima], r), true) + '</section>' : '') +
      '</div>';
  }
  function heroPeso() {
    return '<section class="hero" style="grid-template-columns:1fr"><div><div class="eyebrow" style="color:#E2C7F0">Control de peso · dieta con tus alimentos</div><h1>Come lo que <span>te gusta</span></h1><p>Calorías, cantidades y alternativas para cada comida, seguimiento de tu peso y suplementos con sus límites.</p></div></section>';
  }
  function pesoResumen() {
    var ini = P.pesos.length ? P.pesos[0].kg : +P.perfil.peso, act = pesoActual(), meta = +P.perfil.pesoObjetivo;
    var dif = act - ini, txt = (dif > 0 ? '+' : '') + num(dif, 1) + ' kg desde el inicio';
    var pr = meta && meta !== ini ? Math.max(0, Math.min(100, Math.round(100 * (act - ini) / (meta - ini)))) : null;
    return '<div><div class="row" style="justify-content:space-between"><span>Peso actual <b>' + num(act, 1) + ' kg</b></span>' + (meta ? '<span>Objetivo <b>' + num(meta, 1) + ' kg</b></span>' : '') + '</div>' +
      (pr != null ? '<div class="meter" style="margin:6px 0"><i style="width:' + pr + '%;background:var(--green)"></i></div>' : '') + '<div class="muted" style="font-size:14px">' + txt + (pr != null ? ' · ' + pr + ' % del objetivo' : '') + '</div></div>';
  }

  function tarjetaComida(x, compacta) {
    return '<div class="ap-comida pv-comida"><div class="row" style="justify-content:space-between;align-items:baseline"><h4>' + esc(x.com.n) + '</h4><span class="tag">' + num(x.tot.kcal) + ' kcal · ' + Math.round(x.tot.p) + ' g prot.</span></div><ul>' +
      x.items.map(function (it) {
        return '<li><span>' + esc(it.a.n) + '<br><small class="muted">' + num(it.m.kcal) + ' kcal</small></span><b>' + cantidad(it.a, it.g) + '</b>' +
          (!compacta && it.alternativas > 1 ? '<button class="btn pv-cambiar" data-cambiar="' + it.slot + '" title="Cambiar por otra opción que te guste" aria-label="Cambiar ' + esc(it.a.n) + '">↻</button>' : '<span></span>') + '</li>';
      }).join('') + '</ul></div>';
  }

  function vistaMenu() {
    if (!perfilListo()) { main().innerHTML = '<div class="stack">' + cabecera('Mi dieta', 'Tu menú del día', '') + sinPerfil() + '</div>'; return; }
    if (menor()) { main().innerHTML = '<div class="stack">' + cabecera('Mi dieta', 'Tu menú del día', '') + bloqueMenor() + '</div>'; return; }
    var r = calcular();
    if (P.perfil.objetivo === 'perder' && r.imc < 18.5) { main().innerHTML = '<div class="stack">' + cabecera('Mi dieta', 'Tu menú del día', '') + bloqueImcBajo(r) + '</div>'; return; }
    var dia = COMIDAS.map(function (c) { return montarComida(c, r); });
    var T = dia.reduce(function (a, x) { a.kcal += x.tot.kcal; a.p += x.tot.p; a.c += x.tot.c; a.f += x.tot.f; return a; }, { kcal: 0, p: 0, c: 0, f: 0 });
    var barra = function (t, v, o, col, u) { var pc = Math.round(100 * v / o); return '<div><div class="row" style="justify-content:space-between"><span>' + t + '</span><span><b>' + num(v) + '</b> / ' + num(o) + ' ' + u + '</span></div><div class="meter"><i style="width:' + Math.min(100, pc) + '%;background:' + col + '"></i></div></div>'; };
    main().innerHTML = '<div class="stack">' + cabecera('Mi dieta · ' + esc(OBJ[P.perfil.objetivo]) + ' · ' + NIV[P.perfil.nivel || 1], 'Tu menú de hoy', 'Montado solo con alimentos que no has marcado como «no me gusta» (y, si tienes favoritos, con ellos). Pulsa ↻ para cambiar cualquier alimento por otro equivalente.') +
      '<div class="grid2"><section class="card stack"><div class="eyebrow">Objetivo diario</div><div><b style="font-family:var(--f-display);font-size:44px;line-height:1">' + num(r.kcal) + '</b> <span class="muted">kcal</span></div>' +
        barra('Calorías del menú', T.kcal, r.kcal, 'var(--gold)', 'kcal') + barra('Proteína', T.p, r.gP, 'var(--red)', 'g') + barra('Hidratos', T.c, r.gC, 'var(--navy)', 'g') + barra('Grasas', T.f, r.gG, 'var(--green)', 'g') +
        '<p class="muted" style="margin:0;font-size:13px">Gasto estimado ' + num(r.gasto) + ' kcal (metabolismo basal ' + num(r.tmb) + '). Ritmo esperado: ' + r.ritmo + '.</p></section>' +
        '<section class="card stack"><div class="eyebrow">Opciones</div><button class="btn red" data-otro-menu="1">↻ Proponer otro menú completo</button><button class="btn" data-pv="alimentos">Elegir mis alimentos</button>' +
        '<p class="muted" style="margin:0;font-size:13px">Pesa los alimentos en crudo, salvo legumbres (cocidas). El aceite, mejor medido con cuchara: 1 cucharada ≈ 10 ml ≈ 90 kcal. Cantidades orientativas: si tienes hambre o te sobra comida durante una semana, ajusta 100-150 kcal.</p></section></div>' +
      '<div class="ap-menu">' + dia.map(function (x) { return tarjetaComida(x, false); }).join('') + '</div></div>';
  }
  function bloqueImcBajo(r) { return '<section class="card stack" style="border-left:6px solid var(--gold)"><h3 style="font-size:24px">No te recomendamos perder peso</h3><p style="margin:0">Tu índice de masa corporal (' + num(r.imc, 1) + ') está por debajo de lo saludable. Habla con un médico o un dietista-nutricionista. Puedes elegir «Mantener», «Tonificar» o «Ganar masa muscular» en Mis datos.</p><button class="btn" data-pv="perfil">Cambiar mi objetivo</button></section>'; }

  var eqSel = 'pollo', eqG = 100;
  function vistaAlimentos() {
    var gustan = Object.keys(P.gustos).filter(function (k) { return P.gustos[k] === 1; }).length, no = Object.keys(P.gustos).filter(function (k) { return P.gustos[k] === -1; }).length;
    var a = POR_ID[eqSel];
    var base = a.g === 'prot' ? 'p' : a.g === 'hc' ? 'c' : 'kcal';
    var eq = A.filter(function (x) { return x.g === a.g && x.id !== a.id && x[base] > 0; }).map(function (x) { return { x: x, g: Math.round(eqG * a[base] / x[base] / 5) * 5 }; });
    main().innerHTML = '<div class="stack">' + cabecera('Alimentos', 'Lo que te gusta y lo que no', 'Toca un alimento una vez para marcarlo como favorito (♥), otra para «no me gusta» (✕) y otra para dejarlo neutro. El menú usará tus favoritos y nunca lo que no te gusta.') +
      '<section class="card"><div class="row" style="gap:16px"><span>♥ Favoritos: <b>' + gustan + '</b></span><span>✕ No me gusta: <b>' + no + '</b></span><button class="btn" data-pv="menu">Ver mi menú</button></div></section>' +
      Object.keys(GRUPOS).map(function (g) {
        return '<section class="card stack"><h3 style="font-size:22px">' + GRUPOS[g] + '</h3><div class="chips">' + A.filter(function (x) { return x.g === g; }).map(function (x) {
          var v = P.gustos[x.id] || 0;
          return '<button class="chip pv-gusto ' + (v === 1 ? 'si' : v === -1 ? 'no' : '') + '" data-gusto="' + x.id + '" aria-label="' + esc(x.n) + ': ' + (v === 1 ? 'favorito' : v === -1 ? 'no me gusta' : 'neutro') + '">' + (v === 1 ? '♥ ' : v === -1 ? '✕ ' : '') + esc(x.n) + ' <small>' + x.kcal + ' kcal</small></button>';
        }).join('') + '</div></section>';
      }).join('') +
      '<section class="card stack"><h3 style="font-size:24px">Equivalencias: cambia un alimento por otro</h3>' +
        '<div class="cfg"><label for="pv-eqa">Alimento<select id="pv-eqa">' + A.map(function (x) { return '<option value="' + x.id + '" ' + (x.id === eqSel ? 'selected' : '') + '>' + esc(x.n) + '</option>'; }).join('') + '</select></label>' +
        '<label for="pv-eqg">Cantidad (g)<input id="pv-eqg" type="number" min="5" max="1000" step="5" value="' + eqG + '"></label></div>' +
        '<p class="muted" style="margin:0;font-size:14px">' + eqG + ' g de ' + esc(a.n.toLowerCase()) + ' aportan ' + num(a.kcal * eqG / 100) + ' kcal y ' + num(a.p * eqG / 100, 1) + ' g de proteína. Equivalen' + (base === 'p' ? ' (por proteína)' : base === 'c' ? ' (por hidratos)' : ' (por calorías)') + ' a:</p>' +
        '<div class="scroll"><table class="tbl"><tr><th>Alimento</th><th>Cantidad</th><th>kcal</th></tr>' + eq.map(function (e) { return '<tr><td>' + esc(e.x.n) + (P.gustos[e.x.id] === 1 ? ' ♥' : P.gustos[e.x.id] === -1 ? ' ✕' : '') + '</td><td><b>' + e.g + ' g</b></td><td>' + num(e.x.kcal * e.g / 100) + '</td></tr>'; }).join('') + '</table></div></section></div>';
  }

  /* ---------- Peso ---------- */
  function media7(i) { var l = P.pesos.slice(Math.max(0, i - 6), i + 1); return l.reduce(function (a, x) { return a + x.kg; }, 0) / l.length; }
  function ritmoSemanal() {
    var l = P.pesos.filter(function (x) { return x.fecha >= iso(sumar(new Date(), -21)); }); if (l.length < 3) return null;
    var t0 = deISO(l[0].fecha), xs = l.map(function (x) { return (deISO(x.fecha) - t0) / 864e5; }), ys = l.map(function (x) { return x.kg; });
    var mx = xs.reduce(function (a, b) { return a + b; }, 0) / xs.length, my = ys.reduce(function (a, b) { return a + b; }, 0) / ys.length;
    var num_ = 0, den = 0; xs.forEach(function (x, i) { num_ += (x - mx) * (ys[i] - my); den += (x - mx) * (x - mx); });
    if (!den || xs[xs.length - 1] < 6) return null;
    return num_ / den * 7; // kg por semana
  }
  function alertaRitmo(rs) {
    if (rs == null) return '';
    var pct = rs / pesoActual() * 100, r = perfilListo() && !menor() ? calcular() : null;
    if (r && r.imc < 18.5 && rs < 0) return 'Tu IMC ya está por debajo de 18,5 y sigues bajando de peso. Para aquí y consulta con un profesional sanitario.';
    if (pct < -1) return 'Estás perdiendo más de un 1 % de tu peso por semana. Es demasiado rápido: puedes perder músculo y rendimiento. Sube 150-200 kcal al día.';
    if (P.perfil.objetivo === 'masa' && pct > 0.5) return 'Estás subiendo más de lo necesario para ganar músculo. Baja 100-150 kcal al día.';
    return '';
  }
  function vistaPeso() {
    var l = P.pesos, rs = ritmoSemanal(), meta = +P.perfil.pesoObjetivo, act = pesoActual();
    var proy = '';
    if (rs && meta && ((meta < act && rs < -0.05) || (meta > act && rs > 0.05))) { var sem = (meta - act) / rs; proy = 'A este ritmo llegarías a ' + num(meta, 1) + ' kg hacia el <b>' + corta(sumar(new Date(), Math.round(sem * 7))) + '</b>.'; }
    main().innerHTML = '<div class="stack">' + cabecera('Mi peso', 'Seguimiento', 'Pésate en ayunas, después de ir al baño y con la misma ropa. El peso sube y baja 0,5-1 kg de un día a otro: fíjate en la tendencia (línea roja), no en el dato suelto.') +
      (alertaRitmo(rs) ? '<section class="card" style="border-left:6px solid var(--gold)"><b>' + alertaRitmo(rs) + '</b></section>' : '') +
      '<div class="grid2"><form class="card stack" id="pv-fpeso"><div class="eyebrow">Registrar peso</div><div class="cfg"><label for="pv-kg">Peso (kg)<input id="pv-kg" name="kg" type="number" step="0.1" min="25" max="250" value="' + (act || '') + '" required></label><label for="pv-fecha">Fecha<input id="pv-fecha" name="fecha" type="date" value="' + hoy() + '" max="' + hoy() + '"></label></div><button class="btn red" type="submit">Guardar</button></form>' +
      '<section class="card stack"><div class="eyebrow">Resumen</div>' + pesoResumen() + (rs != null ? '<div>Tendencia: <b>' + (rs > 0 ? '+' : '') + num(rs, 2) + ' kg por semana</b></div>' : '<div class="muted">Con 3 registros en 1-3 semanas verás tu tendencia.</div>') + (proy ? '<div>' + proy + '</div>' : '') + '</section></div>' +
      grafica() +
      (l.length ? '<section class="card stack"><div class="eyebrow">Registros</div><div class="scroll"><table class="tbl"><tr><th>Fecha</th><th>Peso</th><th>Media 7 reg.</th><th></th></tr>' + l.map(function (x, i) { return { x: x, i: i }; }).reverse().slice(0, 30).map(function (o) { return '<tr><td>' + corta(deISO(o.x.fecha)) + '</td><td>' + num(o.x.kg, 1) + ' kg</td><td>' + num(media7(o.i), 1) + '</td><td><button class="btn" style="padding:2px 10px" data-borrar-peso="' + o.x.fecha + '" aria-label="Borrar">×</button></td></tr>'; }).join('') + '</table></div></section>' : '') +
      vistaAviso() + '</div>';
  }
  function grafica() {
    var l = P.pesos.slice(-60); if (l.length < 2) return '';
    var meta = +P.perfil.pesoObjetivo, W = 600, H = 220, pl = 40, pr = 12, pt = 12, pb = 26;
    var vs = l.map(function (x) { return x.kg; }).concat(meta ? [meta] : []), min = Math.floor(Math.min.apply(null, vs) - 0.5), max = Math.ceil(Math.max.apply(null, vs) + 0.5);
    var t0 = deISO(l[0].fecha), t1 = deISO(l[l.length - 1].fecha), rng = Math.max(1, (t1 - t0) / 864e5);
    var X = function (f) { return pl + (W - pl - pr) * ((deISO(f) - t0) / 864e5) / rng; }, Y = function (v) { return pt + (H - pt - pb) * (max - v) / (max - min); };
    var off = P.pesos.length - l.length, ticks = [], paso = Math.max(1, Math.round((max - min) / 4));
    for (var v = min; v <= max; v += paso) ticks.push(v);
    return '<section class="card stack"><div class="eyebrow">Evolución</div><div class="scroll"><svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;min-width:420px;height:auto" role="img" aria-label="Gráfica de peso">' +
      ticks.map(function (v) { return '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="var(--line)"/><text x="' + (pl - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + v + '</text>'; }).join('') +
      (meta ? '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(meta) + '" y2="' + Y(meta) + '" stroke="var(--green)" stroke-dasharray="5 4"/><text x="' + (W - pr) + '" y="' + (Y(meta) - 5) + '" text-anchor="end" font-size="11" fill="var(--green)">objetivo</text>' : '') +
      l.map(function (x) { return '<circle cx="' + X(x.fecha) + '" cy="' + Y(x.kg) + '" r="3.5" fill="var(--steel)"/>'; }).join('') +
      '<polyline fill="none" stroke="var(--red)" stroke-width="3" points="' + l.map(function (x, i) { return X(x.fecha) + ',' + Y(media7(i + off)); }).join(' ') + '"/>' +
      '<text x="' + pl + '" y="' + (H - 6) + '" font-size="11" fill="var(--muted)">' + corta(t0) + '</text><text x="' + (W - pr) + '" y="' + (H - 6) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + corta(t1) + '</text></svg></div>' +
      '<p class="muted" style="margin:0;font-size:13px">Puntos: cada pesada. Línea roja: media de los últimos 7 registros. Línea verde: tu objetivo.</p></section>';
  }

  /* ---------- Recordatorio ---------- */
  function LN() { var C = window.Capacitor; return C && C.Plugins && C.Plugins.LocalNotifications; }
  function textoAviso() {
    var t = ['Pésate antes de desayunar y anótalo'];
    if (perfilListo() && !menor()) t.push('objetivo de hoy: ' + num(calcular().kcal) + ' kcal');
    var ini = P.pesos.length ? P.pesos[0].kg : null; if (ini != null) { var d = pesoActual() - ini; t.push('llevas ' + (d > 0 ? '+' : '') + num(d, 1) + ' kg'); }
    return t.join(' · ');
  }
  function vistaAviso() {
    var a = P.aviso;
    return '<section class="card stack"><div class="eyebrow">Recordatorio diario</div><div class="ap-noti"><b>AF Peso</b><span>' + esc(textoAviso()) + '</span></div>' +
      '<div class="cfg"><label for="pv-hora">Hora<input id="pv-hora" type="time" value="' + esc(a.hora) + '"></label></div>' +
      '<div class="row"><button class="btn red" data-aviso="on">' + (a.activo ? 'Guardar hora' : 'Activar') + '</button>' + (a.activo ? '<button class="btn" data-aviso="off">Desactivar</button>' : '') + '<button class="btn" data-aviso="test">Probar</button></div></section>';
  }
  async function programar() {
    var ln = LN(); if (!ln) return false;
    try {
      var pm = await ln.checkPermissions(); if (pm.display !== 'granted') pm = await ln.requestPermissions();
      if (pm.display !== 'granted') { aviso('Sin permiso para notificaciones. Actívalo en los ajustes del móvil.'); return false; }
      var pend = await ln.getPending(); if (pend.notifications.length) await ln.cancel({ notifications: pend.notifications.map(function (n) { return { id: n.id }; }) });
      if (!P.aviso.activo) return true;
      var hm = P.aviso.hora.split(':'), l = [];
      for (var k = 0; k < 14; k++) { var d = sumar(new Date(), k); d.setHours(+hm[0], +hm[1], 0, 0); if (d > new Date()) l.push({ id: 200 + k, title: 'AF Peso', body: textoAviso(), schedule: { at: d, allowWhileIdle: true } }); }
      await ln.schedule({ notifications: l }); return true;
    } catch (e) { aviso('No se pudo programar: ' + (e.message || e)); return false; }
  }

  /* ---------- Mis datos ---------- */
  function vistaPerfil() {
    var p = P.perfil, e = edad();
    main().innerHTML = '<div class="stack">' + cabecera('Mis datos', 'Tu perfil y tu objetivo', 'Con estos datos se calculan tus calorías (ecuación de Mifflin-St Jeor) y tu menú. Todo se queda en tu móvil.') +
      '<form class="card stack" id="pv-fperfil"><div class="cfg">' +
      '<label for="pv-s">Sexo<select id="pv-s" name="sexo"><option value="h" ' + (p.sexo === 'h' ? 'selected' : '') + '>Hombre</option><option value="m" ' + (p.sexo === 'm' ? 'selected' : '') + '>Mujer</option></select></label>' +
      '<label for="pv-n">Fecha de nacimiento<input id="pv-n" name="nacimiento" type="date" value="' + esc(p.nacimiento || '') + '" max="' + hoy() + '" required></label>' +
      '<label for="pv-p">Peso actual (kg)<input id="pv-p" name="peso" type="number" step="0.1" min="25" max="250" value="' + esc(pesoActual() || '') + '" required></label>' +
      '<label for="pv-a">Altura (cm)<input id="pv-a" name="altura" type="number" min="120" max="230" value="' + esc(p.altura || '') + '" required></label>' +
      '<label for="pv-act">Actividad<select id="pv-act" name="actividad">' + Object.keys(ACT).map(function (k) { return '<option value="' + k + '" ' + ((p.actividad || 3) == k ? 'selected' : '') + '>' + ACT[k][0] + '</option>'; }).join('') + '</select></label>' +
      '<label for="pv-niv">Nivel de entrenamiento<select id="pv-niv" name="nivel">' + [1, 2, 3].map(function (n) { return '<option value="' + n + '" ' + ((p.nivel || 1) == n ? 'selected' : '') + '>' + NIV[n] + '</option>'; }).join('') + '</select></label>' +
      '<label for="pv-po">Peso objetivo (kg, opcional)<input id="pv-po" name="pesoObjetivo" type="number" step="0.1" min="30" max="250" value="' + esc(p.pesoObjetivo || '') + '"></label></div>' +
      '<div><div class="eyebrow" style="margin-bottom:6px">Objetivo</div><div class="chips">' + Object.keys(OBJ).map(function (k) { return '<label class="chip ap-radio"><input type="radio" name="objetivo" value="' + k + '" ' + (p.objetivo === k ? 'checked' : '') + ' required> ' + OBJ[k] + '</label>'; }).join('') + '</div></div>' +
      '<p class="error" id="pv-err" hidden style="color:var(--red);font-weight:700;margin:0"></p>' +
      '<button class="btn red" type="submit">Guardar y calcular</button></form>' +
      (e != null && e < 18 ? bloqueMenor() : '') +
      '<section class="card"><p class="muted" style="margin:0;font-size:14px">Esta app orienta, no sustituye a un dietista-nutricionista ni a tu médico. Si tienes alguna enfermedad, estás embarazada, tomas medicación, o notas que la comida o el peso te generan ansiedad, pide ayuda profesional.</p></section></div>';
  }

  /* =================================================================
     EVENTOS
     ================================================================= */
  document.addEventListener('click', async function (ev) {
    var b = ev.target.closest('button'); if (!b || !main().contains(b)) return;
    var d = b.dataset;
    if (d.pv) window.AF_go(d.pv);
    else if (d.agua) { var h = hoy(); P.agua[h] = Math.max(0, (P.agua[h] || 0) + +d.agua); guardar(); vistaHoy(); }
    else if (d.cumplido) { var h2 = hoy(); if (P.cumplido[h2]) delete P.cumplido[h2]; else P.cumplido[h2] = true; guardar(); vistaHoy(); }
    else if (d.cambiar) { P.menu.cambios[d.cambiar] = (P.menu.cambios[d.cambiar] || 0) + 1; guardar(); var y = window.scrollY; vistaMenu(); window.scrollTo(0, y); }
    else if (d.otroMenu) { P.menu = { semilla: (P.menu.semilla || 1) + 1, cambios: {} }; guardar(); vistaMenu(); aviso('Nuevo menú propuesto'); }
    else if (d.gusto) { var v = P.gustos[d.gusto] || 0; v = v === 0 ? 1 : v === 1 ? -1 : 0; if (v) P.gustos[d.gusto] = v; else delete P.gustos[d.gusto]; guardar(); var y2 = window.scrollY; vistaAlimentos(); window.scrollTo(0, y2); }
    else if (d.borrarPeso) { P.pesos = P.pesos.filter(function (x) { return x.fecha !== d.borrarPeso; }); guardar(); vistaPeso(); }
    else if (d.aviso) {
      var hr = document.getElementById('pv-hora'); if (hr) P.aviso.hora = hr.value || '08:00';
      if (d.aviso === 'test') {
        var ln = LN();
        if (ln) { try { var pm = await ln.requestPermissions(); if (pm.display === 'granted') { await ln.schedule({ notifications: [{ id: 199, title: 'AF Peso', body: textoAviso(), schedule: { at: new Date(Date.now() + 3000) } }] }); aviso('Llegará en 3 segundos'); } } catch (e) { aviso('Error: ' + (e.message || e)); } }
        else if ('Notification' in window) { try { if ((await Notification.requestPermission()) === 'granted') new Notification('AF Peso', { body: textoAviso() }); else aviso('El navegador no permite notificaciones'); } catch (e) { aviso('Este navegador no permite notificaciones'); } }
        return;
      }
      P.aviso.activo = d.aviso === 'on'; guardar();
      if (LN()) { if (await programar()) aviso(P.aviso.activo ? 'Recordatorio a las ' + P.aviso.hora : 'Recordatorio desactivado'); }
      else aviso(P.aviso.activo ? 'Activado (en el navegador solo avisa con la página abierta)' : 'Recordatorio desactivado');
      vistaPeso();
    }
  });
  document.addEventListener('change', function (ev) {
    if (ev.target.id === 'pv-eqa') { eqSel = ev.target.value; vistaAlimentos(); }
    if (ev.target.id === 'pv-eqg') { eqG = Math.max(5, +ev.target.value || 100); vistaAlimentos(); }
  });
  document.addEventListener('submit', function (ev) {
    var f = ev.target; if (!main().contains(f)) return;
    var fd = new FormData(f), v = function (k) { return (fd.get(k) || '').toString().trim(); };
    if (f.id === 'pv-fpeso') {
      ev.preventDefault(); var kg = +v('kg'), fe = v('fecha') || hoy();
      if (!kg) return; P.pesos = P.pesos.filter(function (x) { return x.fecha !== fe; }); P.pesos.push({ fecha: fe, kg: kg }); P.pesos.sort(function (a, b) { return a.fecha.localeCompare(b.fecha); });
      P.perfil.peso = pesoActual(); guardar(); vistaPeso(); aviso('Peso guardado'); if (P.aviso.activo) programar();
    }
    if (f.id === 'pv-fperfil') {
      ev.preventDefault();
      var nuevo = { sexo: v('sexo'), nacimiento: v('nacimiento'), peso: +v('peso'), altura: +v('altura'), actividad: +v('actividad'), nivel: +v('nivel'), objetivo: v('objetivo'), pesoObjetivo: +v('pesoObjetivo') || '' };
      var err = document.getElementById('pv-err'), imcMeta = nuevo.pesoObjetivo ? nuevo.pesoObjetivo / Math.pow(nuevo.altura / 100, 2) : null;
      if (imcMeta && imcMeta < 18.5) { err.textContent = 'Ese peso objetivo daría un IMC de ' + num(imcMeta, 1) + ', por debajo de lo saludable (18,5). Elige un objetivo más alto.'; err.hidden = false; return; }
      P.perfil = nuevo;
      if (!P.pesos.some(function (x) { return x.fecha === hoy(); })) { P.pesos.push({ fecha: hoy(), kg: nuevo.peso }); P.pesos.sort(function (a, b) { return a.fecha.localeCompare(b.fecha); }); }
      guardar(); aviso('Datos guardados'); window.AF_go('home');
    }
  });

  window.AF_EXTRA = {
    home: vistaHoy, menu: vistaMenu, alimentos: vistaAlimentos, peso: vistaPeso, perfil: vistaPerfil,
    suple: function () { main().innerHTML = window.AF_SUPLEMENTOS({ peso: pesoActual(), edad: edad() }); }
  };
  if (P.aviso.activo) setTimeout(programar, 1500);
  // La app original pinta su inicio antes de cargar este módulo: lo sustituimos por «Hoy»
  if (window.AF_go) window.AF_go('home');
})();
