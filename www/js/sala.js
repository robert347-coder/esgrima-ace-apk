/* =====================================================================
   SALA · Competiciones internas (poules + eliminatoria) y MARCADOR
   ---------------------------------------------------------------------
   - Competición: se eligen tiradores, se sortean las poules, se anotan
     los asaltos (a mano o arbitrando con el marcador), se calcula la
     clasificación según la FIE (V/M, índice, tocados dados), se genera
     el tablón de eliminación directa y la clasificación final.
   - Marcador: cronómetro y tanteo para las tres armas. Las reglas
     están en reglas.js.
   Todo lo de la competición se guarda en un único documento:
   competiciones/{id}
   ===================================================================== */
(function () {
  'use strict';
  const R = window.ACE_REGLAS;
  const A = () => window.ACE_APP;       // utilidades de app.js (se rellena al arrancar)
  const h = (v) => A().h(v);

  /* =================================================================
     LÓGICA DE COMPETICIÓN (sin pantallas)
     ================================================================= */

  function barajar(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // Orden de asaltos: evita que alguien tire dos asaltos seguidos y reparte el descanso
  function ordenAsaltos(n) {
    const pend = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pend.push([i, j]);
    const ultimo = new Array(n).fill(-10), hechos = new Array(n).fill(0), orden = [];
    let paso = 0;
    while (pend.length) {
      let mejor = 0, puntos = -Infinity;
      pend.forEach(([a, b], k) => {
        const descanso = Math.min(paso - ultimo[a], paso - ultimo[b]);
        const p = Math.min(descanso, 3) * 100 - (hechos[a] + hechos[b]) * 10 - k * 0.01;
        if (p > puntos) { puntos = p; mejor = k; }
      });
      const [a, b] = pend.splice(mejor, 1)[0];
      orden.push([a, b]); ultimo[a] = ultimo[b] = paso; hechos[a]++; hechos[b]++; paso++;
    }
    return orden;
  }

  // Reparto en serpentina (1-2-3-3-2-1...) para equilibrar las poules
  function crearPoules(ids, numPoules) {
    const poules = Array.from({ length: numPoules }, (_, i) => ({ n: i + 1, tiradores: [], asaltos: [] }));
    ids.forEach((id, i) => {
      const vuelta = Math.floor(i / numPoules), pos = i % numPoules;
      poules[vuelta % 2 === 0 ? pos : numPoules - 1 - pos].tiradores.push(id);
    });
    poules.forEach((p) => {
      p.asaltos = ordenAsaltos(p.tiradores.length).map(([a, b]) => ({ a: p.tiradores[a], b: p.tiradores[b], ta: null, tb: null, ganador: null }));
    });
    return poules;
  }

  const excluido = (c, id) => { const t = c.tiradores.find((x) => x.id === id); return !!(t && t.excluido); };
  const nombreT = (c, id) => { const t = c.tiradores.find((x) => x.id === id); return t ? t.nombre : '—'; };
  const hecho = (b) => b.ganador != null;

  // Estadísticas de un tirador en las poules (sin contar asaltos contra excluidos: sus resultados se anulan)
  function estadisticas(c, id) {
    const e = { id, v: 0, m: 0, td: 0, tr: 0 };
    c.poules.forEach((p) => p.asaltos.forEach((b) => {
      if (!hecho(b) || (b.a !== id && b.b !== id)) return;
      const rival = b.a === id ? b.b : b.a;
      if (excluido(c, rival)) return;
      const mios = b.a === id ? b.ta : b.tb, suyos = b.a === id ? b.tb : b.ta;
      e.m++; e.td += mios; e.tr += suyos; if (b.ganador === id) e.v++;
    }));
    e.vm = e.m ? e.v / e.m : 0; e.ind = e.td - e.tr;
    return e;
  }

  // Clasificación tras poules (FIE: V/M, después índice, después tocados dados)
  function clasificacionPoules(c, soloPoule) {
    const ids = (soloPoule ? soloPoule.tiradores : c.tiradores.map((t) => t.id)).filter((id) => !excluido(c, id));
    const lista = ids.map((id) => estadisticas(c, id));
    lista.sort((x, y) => (y.vm - x.vm) || (y.ind - x.ind) || (y.td - x.td) || nombreT(c, x.id).localeCompare(nombreT(c, y.id), 'es'));
    lista.forEach((e, i) => {
      const prev = lista[i - 1];
      e.puesto = prev && prev.vm === e.vm && prev.ind === e.ind && prev.td === e.td ? prev.puesto : i + 1;
      e.empate = !!(prev && prev.puesto === e.puesto) || !!(lista[i + 1] && lista[i + 1].vm === e.vm && lista[i + 1].ind === e.ind && lista[i + 1].td === e.td);
    });
    return lista;
  }

  const poulesTerminadas = (c) => c.poules.every((p) => p.asaltos.every((b) => hecho(b) || excluido(c, b.a) || excluido(c, b.b)));

  // Posiciones del cuadro: 1 contra el último, y el 1 y el 2 solo se cruzan en la final
  function ordenCuadro(tam) {
    let o = [1, 2];
    while (o.length < tam) { const n = o.length * 2; o = o.reduce((acc, s) => acc.concat([s, n + 1 - s]), []); }
    return o;
  }

  function generarED(c) {
    const semillas = clasificacionPoules(c).map((e) => e.id);
    let tam = 2; while (tam < semillas.length) tam *= 2;
    c.ed = { semillas, tam, resultados: {} };
    c.estado = 'ed';
  }

  const rondas = (c) => Math.round(Math.log2(c.ed.tam));
  function nombreRonda(c, r) {
    const n = c.ed.tam / Math.pow(2, r);
    return n === 2 ? 'Final' : n === 4 ? 'Semifinales' : n === 8 ? 'Cuartos' : 'Tablón de ' + n;
  }

  // Quién tira el combate m de la ronda r (null = exento / por decidir)
  function participantes(c, r, m) {
    if (r === 0) {
      const o = ordenCuadro(c.ed.tam);
      const s = (k) => c.ed.semillas[o[k] - 1] || null;
      return [s(2 * m), s(2 * m + 1)];
    }
    return [ganadorED(c, r - 1, 2 * m), ganadorED(c, r - 1, 2 * m + 1)];
  }
  function ganadorED(c, r, m) {
    const [a, b] = participantes(c, r, m);
    if (a && !b) return r === 0 ? a : (ganadorED(c, r - 1, 2 * m + 1) === null && esExento(c, r - 1, 2 * m + 1) ? a : null);
    if (!a && b) return r === 0 ? b : (ganadorED(c, r - 1, 2 * m) === null && esExento(c, r - 1, 2 * m) ? b : null);
    if (!a || !b) return null;
    const res = c.ed.resultados[r + '-' + m];
    if (res && res.a === a && res.b === b) return res.ganador;
    if (excluido(c, a) && !excluido(c, b)) return b;
    if (excluido(c, b) && !excluido(c, a)) return a;
    return null;
  }
  // Un hueco vacío definitivo (nadie llegará): para propagar los exentos
  function esExento(c, r, m) {
    if (r === 0) { const [a, b] = participantes(c, 0, m); return !a && !b; }
    return esExento(c, r - 1, 2 * m) && esExento(c, r - 1, 2 * m + 1);
  }
  const semillaDe = (c, id) => c.ed ? c.ed.semillas.indexOf(id) + 1 : 0;

  // Clasificación final: 1.º, 2.º, dos 3.º y después por ronda alcanzada y puesto tras poules
  function clasificacionFinal(c) {
    if (!c.ed) return [];
    const nR = rondas(c);
    const campeon = ganadorED(c, nR - 1, 0);
    if (!campeon) return [];
    const eliminadoEn = {};
    for (let r = 0; r < nR; r++) {
      for (let m = 0; m < c.ed.tam / Math.pow(2, r + 1); m++) {
        const [a, b] = participantes(c, r, m), g = ganadorED(c, r, m);
        if (a && b && g) eliminadoEn[g === a ? b : a] = r;
      }
    }
    const lista = [{ id: campeon, puesto: 1 }];
    const resto = Object.keys(eliminadoEn).filter((id) => !excluido(c, id))
      .sort((x, y) => (eliminadoEn[y] - eliminadoEn[x]) || (semillaDe(c, x) - semillaDe(c, y)));
    resto.forEach((id, i) => {
      const r = eliminadoEn[id];
      const puesto = r === nR - 1 ? 2 : r === nR - 2 ? 3 : i + 2;
      lista.push({ id, puesto });
    });
    c.tiradores.filter((t) => t.excluido).forEach((t) => lista.push({ id: t.id, puesto: null }));
    return lista;
  }

  /* =================================================================
     PANTALLAS DE ADMINISTRACIÓN
     ================================================================= */
  const armaNombre = (a) => (R.ARMAS[a] || {}).nombre || a;
  const comp = () => A().st.competiciones.find((c) => c.id === A().st.compId);

  function vistaSala() {
    const st = A().st, G = A().G;
    const lista = st.competiciones.slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
    const activos = st.socios.filter((s) => s.activo !== false);
    return `
      <div class="tit-fila"><h1 class="tit">Sala</h1>
        <button class="btn sec" data-act="marcador-libre">${A().ICONOS.reloj}<span>Marcador libre</span></button></div>
      <div class="rejilla">
        <section class="tarjeta">
          <h2 class="sec-t">Competiciones</h2>
          ${lista.length ? lista.map((c) => `
            <button class="fila boton-fila" data-act="abrir-comp" data-id="${h(c.id)}">
              <div class="arma-chip arma-${h(c.arma)}">${h(armaNombre(c.arma).slice(0, 1))}</div>
              <div class="fila-txt"><strong>${h(c.nombre)}</strong><span>${h(A().fechaCorta(c.fecha))} · ${h(armaNombre(c.arma))} · ${c.tiradores.length} tiradores</span></div>
              <span class="pill ${c.estado === 'terminada' ? 'ok' : 'pend'}">${c.estado === 'poules' ? 'Poules' : c.estado === 'ed' ? 'Eliminatoria' : 'Terminada'}</span>
            </button>`).join('') : '<p class="nota">Todavía no hay competiciones. Crea la primera con el formulario.</p>'}
        </section>

        <form data-form="nueva-comp" class="tarjeta form">
          <h2 class="sec-t">Nueva competición</h2>
          <label>Nombre *<input id="nc-nombre" name="nombre" required placeholder="Torneo interno de noviembre"></label>
          <div class="campos">
            <label>Fecha<input id="nc-fecha" name="fecha" type="date" value="${A().hoyISO()}"></label>
            <label>Arma<select id="nc-arma" name="arma" data-change="nc-arma">${Object.keys(R.ARMAS).map((k) => `<option value="${k}">${R.ARMAS[k].nombre}</option>`).join('')}</select></label>
          </div>
          <div class="campos">
            <label>Tocados en poule<input id="nc-tp" name="toquesPoule" type="number" min="1" max="15" value="5"></label>
            <label>Tocados en eliminatoria<input id="nc-te" name="toquesED" type="number" min="1" max="45" value="15"></label>
            <label>Minutos por periodo<input id="nc-min" name="minutos" type="number" min="1" max="9" step="0.5" value="3"></label>
          </div>
          <p class="nota">Reglamento FIE: 5 tocados / 3 min en poule y 15 tocados / 3×3 min en eliminatoria. Para los más pequeños puedes reducirlos.</p>
          <fieldset><legend>Tiradores del club</legend>
            <div class="checks-col" id="nc-lista">
              ${Object.keys(G).map((g) => {
                const del = activos.filter((s) => s.grupo === g);
                if (!del.length) return '';
                return `<div class="grupo-sel"><strong>${h(G[g].nombre)}</strong>${del.map((s) => `
                  <label class="check"><input id="nc-s-${h(s.id)}" type="checkbox" name="tiradores" value="${h(s.id)}" data-arma="${h((s.arma || '').toLowerCase())}"> <span>${h(A().nombreCompleto(s))} <small>${h(s.arma || '')}</small></span></label>`).join('')}</div>`;
              }).join('')}
            </div>
            <div class="fila-btn"><button type="button" class="btn-txt peq" data-act="nc-marcar-arma">Marcar los de esta arma</button><button type="button" class="btn-txt peq" data-act="nc-desmarcar">Quitar todos</button></div>
          </fieldset>
          <label>Invitados (uno por línea)<textarea id="nc-inv" name="invitados" rows="2" placeholder="Nombre Apellido (Club)"></textarea></label>
          <label>Número de poules<input id="nc-np" name="numPoules" type="number" min="1" max="12" placeholder="Automático (máx. 7 por poule)"></label>
          <button class="btn" type="submit">Crear y sortear poules</button>
        </form>
      </div>`;
  }

  function vistaCompeticion() {
    const c = comp();
    if (!c) return '<p>Competición no encontrada. <a href="#sala">Volver</a></p>';
    const st = A().st;
    const tabs = [['poules', 'Poules'], ['clasif', 'Clasificación poules']];
    if (c.ed) tabs.push(['ed', 'Eliminatoria']);
    if (c.estado === 'terminada') tabs.push(['final', 'Clasificación final']);
    if (!tabs.find((t) => t[0] === st.compTab)) st.compTab = c.estado === 'terminada' ? 'final' : c.estado === 'ed' ? 'ed' : 'poules';
    const cuerpo = st.compTab === 'clasif' ? tabClasif(c) : st.compTab === 'ed' ? tabED(c) : st.compTab === 'final' ? tabFinal(c) : tabPoules(c);
    return `
      <a class="volver" href="#sala">‹ Sala</a>
      <div class="tit-fila"><div><h1 class="tit">${h(c.nombre)}</h1>
        <p class="nota">${h(A().capital(A().fechaLarga(c.fecha)))} · ${h(armaNombre(c.arma))} · ${c.tiradores.length} tiradores · Poule a ${c.config.toquesPoule}, eliminatoria a ${c.config.toquesED}</p></div>
        <button class="btn-txt peq" data-act="pedir-borrar-comp">Borrar competición</button></div>
      <div class="pestanas" role="tablist">${tabs.map(([k, t]) => `<button role="tab" aria-selected="${st.compTab === k}" class="${st.compTab === k ? 'act' : ''}" data-act="comp-tab" data-t="${k}">${t}</button>`).join('')}</div>
      ${cuerpo}`;
  }

  function celda(c, p, i, j) {
    if (i === j) return '<td class="diag"></td>';
    const a = p.tiradores[i], b = p.tiradores[j];
    const bout = p.asaltos.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
    if (!bout || !hecho(bout)) return '<td></td>';
    const mios = bout.a === a ? bout.ta : bout.tb;
    const gano = bout.ganador === a;
    return `<td class="${gano ? 'v' : 'd'}">${gano ? 'V' + (mios === c.config.toquesPoule ? '' : mios) : mios}</td>`;
  }

  function tabPoules(c) {
    const terminadas = poulesTerminadas(c);
    return `
      ${c.estado === 'poules' ? `<div class="aviso-barra ${terminadas ? 'ok' : ''}">${terminadas
        ? '<span>Todas las poules están completas.</span><button class="btn" data-act="generar-ed">Generar eliminatoria</button>'
        : `<span>Asaltos completados: <strong>${c.poules.reduce((n, p) => n + p.asaltos.filter(hecho).length, 0)} de ${c.poules.reduce((n, p) => n + p.asaltos.length, 0)}</strong></span>
           <button class="btn-txt peq" data-act="resortear">Volver a sortear</button>`}</div>` : ''}
      ${c.poules.map((p, pi) => {
        const cl = clasificacionPoules(c, p);
        const puesto = (id) => { const e = cl.find((x) => x.id === id); return e ? e.puesto : '—'; };
        return `
        <section class="tarjeta">
          <h2 class="sec-t">Poule ${p.n}</h2>
          <div class="tabla-scroll"><table class="matriz">
            <thead><tr><th>#</th><th class="izq">Tirador</th>${p.tiradores.map((_, k) => `<th>${k + 1}</th>`).join('')}<th>V</th><th>V/M</th><th>TD</th><th>TR</th><th>Ind</th><th>Pto</th></tr></thead>
            <tbody>${p.tiradores.map((id, i) => {
              const e = estadisticas(c, id);
              return `<tr class="${excluido(c, id) ? 'excl' : ''}"><td>${i + 1}</td><td class="izq nom">${h(nombreT(c, id))}${excluido(c, id) ? ' <span class="pill pend">Excluido</span>' : ''}</td>
                ${p.tiradores.map((_, j) => celda(c, p, i, j)).join('')}
                <td>${e.v}</td><td>${e.m ? e.vm.toFixed(2).replace('.', ',') : '—'}</td><td>${e.td}</td><td>${e.tr}</td><td>${e.ind > 0 ? '+' : ''}${e.ind}</td><td><strong>${excluido(c, id) ? '—' : puesto(id)}</strong></td></tr>`;
            }).join('')}</tbody>
          </table></div>
          <h3 class="sec-t peq">Orden de asaltos</h3>
          <ol class="asaltos">${p.asaltos.map((b, bi) => {
            const ia = p.tiradores.indexOf(b.a) + 1, ib = p.tiradores.indexOf(b.b) + 1;
            const anulado = excluido(c, b.a) || excluido(c, b.b);
            return `<li class="${hecho(b) ? 'hecho' : ''} ${anulado ? 'anulado' : ''}">
              <span class="par"><b>${ia}-${ib}</b> ${h(nombreT(c, b.a))} <span class="vs">vs</span> ${h(nombreT(c, b.b))}</span>
              ${hecho(b) ? `<span class="res">${b.ganador === b.a ? 'V' : ''}${b.ta} – ${b.ganador === b.b ? 'V' : ''}${b.tb}</span>` : ''}
              ${c.estado === 'poules' && !anulado ? `<span class="acc">
                <button class="btn peq" data-act="arbitrar" data-tipo="poule" data-p="${pi}" data-b="${bi}">${A().ICONOS.reloj}<span>Arbitrar</span></button>
                <button class="btn peq sec" data-act="anotar" data-tipo="poule" data-p="${pi}" data-b="${bi}">${hecho(b) ? 'Corregir' : 'Anotar'}</button></span>` : ''}
            </li>`;
          }).join('')}</ol>
        </section>`;
      }).join('')}`;
  }

  function tablaClasif(c, lista, cab) {
    return `<div class="tabla-scroll"><table class="clasif"><thead><tr><th>Pto</th><th class="izq">Tirador</th>${cab}</tr></thead><tbody>${lista}</tbody></table></div>`;
  }

  function tabClasif(c) {
    const cl = clasificacionPoules(c);
    return `<section class="tarjeta">
      <p class="nota">Orden FIE: 1.º victorias/asaltos (V/M), 2.º índice (TD − TR), 3.º tocados dados. Los empates totales aparecen con «=». Los resultados de los excluidos se anulan.</p>
      ${tablaClasif(c, cl.map((e) => `<tr><td><strong>${e.puesto}${e.empate ? '=' : ''}</strong></td><td class="izq nom">${h(nombreT(c, e.id))}</td><td>${e.v}/${e.m}</td><td>${e.vm.toFixed(3).replace('.', ',')}</td><td>${e.ind > 0 ? '+' : ''}${e.ind}</td><td>${e.td}</td></tr>`).join(''),
        '<th>V/M</th><th>Índice V/M</th><th>Ind</th><th>TD</th>')}
    </section>`;
  }

  function tabED(c) {
    const nR = rondas(c);
    let html = '<div class="cuadro">';
    for (let r = 0; r < nR; r++) {
      const n = c.ed.tam / Math.pow(2, r + 1);
      html += `<section class="ronda"><h2 class="sec-t">${nombreRonda(c, r)}</h2>`;
      for (let m = 0; m < n; m++) {
        const [a, b] = participantes(c, r, m);
        const g = ganadorED(c, r, m);
        const res = c.ed.resultados[r + '-' + m];
        const valido = res && res.a === a && res.b === b;
        const linea = (id, toques) => id
          ? `<div class="ed-t ${g === id ? 'gana' : g ? 'pierde' : ''}"><span class="sem">${semillaDe(c, id)}</span><span class="nom">${h(nombreT(c, id))}</span><span class="tq">${valido ? toques : ''}</span></div>`
          : `<div class="ed-t vacio"><span class="sem"></span><span class="nom">${r === 0 ? 'Exento' : 'Por decidir'}</span><span class="tq"></span></div>`;
        html += `<div class="combate">${linea(a, valido ? res.ta : '')}${linea(b, valido ? res.tb : '')}
          ${a && b && c.estado !== 'terminada' ? `<div class="acc">
            <button class="btn peq" data-act="arbitrar" data-tipo="ed" data-r="${r}" data-m="${m}">${A().ICONOS.reloj}<span>Arbitrar</span></button>
            <button class="btn peq sec" data-act="anotar" data-tipo="ed" data-r="${r}" data-m="${m}">${g ? 'Corregir' : 'Anotar'}</button></div>` : ''}
        </div>`;
      }
      html += '</section>';
    }
    return html + '</div>';
  }

  function tabFinal(c) {
    const l = clasificacionFinal(c);
    return `<section class="tarjeta podio-t">
      ${l.slice(0, 4).length ? `<div class="podio">${l.filter((x) => x.puesto && x.puesto <= 3).map((x) => `<div class="p${x.puesto}"><span>${x.puesto}.º</span><strong>${h(nombreT(c, x.id))}</strong></div>`).join('')}</div>` : ''}
      ${tablaClasif(c, l.map((x) => `<tr class="${x.puesto ? '' : 'excl'}"><td><strong>${x.puesto || '—'}</strong></td><td class="izq nom">${h(nombreT(c, x.id))}</td><td>${x.puesto ? semillaDe(c, x.id) : 'Excluido'}</td></tr>`).join(''), '<th>Tras poules</th>')}
    </section>`;
  }

  /* ---------- Anotar resultado a mano ---------- */
  function datosCombate(c, d) {
    if (d.tipo === 'poule') {
      const b = c.poules[+d.p].asaltos[+d.b];
      return { a: b.a, b: b.b, ta: b.ta, tb: b.tb, ganador: b.ganador, objetivo: c.config.toquesPoule };
    }
    const [a, b] = participantes(c, +d.r, +d.m);
    const res = c.ed.resultados[d.r + '-' + d.m];
    const v = res && res.a === a && res.b === b ? res : {};
    return { a, b, ta: v.ta, tb: v.tb, ganador: v.ganador, objetivo: c.config.toquesED };
  }

  function modalAnotar(d) {
    const c = comp(), x = datosCombate(c, d);
    A().abrirModal(`
      <h2>Anotar resultado</h2>
      <form data-form="anotar" class="pila" data-tipo="${h(d.tipo)}" data-p="${h(d.p || '')}" data-b="${h(d.b || '')}" data-r="${h(d.r || '')}" data-m="${h(d.m || '')}">
        <div class="anotar">
          <label>${h(nombreT(c, x.a))}<input id="an-ta" name="ta" type="number" min="0" max="${x.objetivo}" value="${x.ta == null ? '' : x.ta}" required></label>
          <span class="guion">–</span>
          <label>${h(nombreT(c, x.b))}<input id="an-tb" name="tb" type="number" min="0" max="${x.objetivo}" value="${x.tb == null ? '' : x.tb}" required></label>
        </div>
        <label>Ganador<select id="an-g" name="ganador">
          <option value="">Automático (quien tenga más tocados)</option>
          <option value="a" ${x.ganador === x.a ? 'selected' : ''}>${h(nombreT(c, x.a))}</option>
          <option value="b" ${x.ganador === x.b ? 'selected' : ''}>${h(nombreT(c, x.b))}</option></select>
          <small>Elígelo solo si hay empate (prioridad o P negra).</small></label>
        <label>Incidencia<select id="an-inc" name="incidencia">
          <option value="">Ninguna</option>
          <option value="a">${h(nombreT(c, x.a))}: tarjeta negra o abandono</option>
          <option value="b">${h(nombreT(c, x.b))}: tarjeta negra o abandono</option></select>
          <small>Se le excluye de la competición y se anulan sus resultados de poule.</small></label>
        <p class="error" id="an-error" hidden></p>
        <button class="btn" type="submit">Guardar</button>
      </form>`);
  }

  async function guardarResultado(d, ta, tb, ganadorLado, incidencia) {
    const c = comp();
    const x = datosCombate(c, d);
    const ganador = ganadorLado === 'a' ? x.a : x.b;
    if (incidencia) {
      const t = c.tiradores.find((y) => y.id === (incidencia === 'a' ? x.a : x.b));
      if (t) t.excluido = true;
    }
    if (d.tipo === 'poule') Object.assign(c.poules[+d.p].asaltos[+d.b], { ta, tb, ganador });
    else {
      c.ed.resultados[d.r + '-' + d.m] = { a: x.a, b: x.b, ta, tb, ganador };
      // al cambiar un resultado, se borran los combates posteriores que ya no cuadran (ganadorED los ignora)
      if (ganadorED(c, rondas(c) - 1, 0)) c.estado = 'terminada'; else c.estado = 'ed';
    }
    return guardarComp(c);
  }

  async function guardarComp(c) {
    return A().intentar(() => A().S.guardarDoc('competiciones', c.id, c), 'Resultado guardado');
  }

  /* =================================================================
     MARCADOR / CRONÓMETRO
     ================================================================= */
  let M = null;            // estado del asalto
  let historial = [];      // para deshacer
  let origen = null;       // de qué combate viene (para guardar el resultado)
  let ultimoTick = 0, reloj = null, claveRender = '', wakeLock = null;

  function prepararMarcador(op, org) {
    M = R.nuevoAsalto(op); historial = []; origen = org || null; claveRender = '';
  }

  function abrirDesdeCombate(d) {
    const c = comp(), x = datosCombate(c, d);
    const ed = d.tipo === 'ed';
    prepararMarcador({
      arma: c.arma, tipo: ed ? 'ed' : 'poule',
      objetivo: ed ? c.config.toquesED : c.config.toquesPoule,
      periodos: ed ? 3 : 1, minPeriodo: c.config.minutos || 3,
      izq: { id: x.a, nombre: nombreT(c, x.a) }, der: { id: x.b, nombre: nombreT(c, x.b) },
      mejorSemilla: ed ? (semillaDe(c, x.a) <= semillaDe(c, x.b) ? 'izq' : 'der') : 'izq'
    }, Object.assign({ compId: c.id }, d));
    A().ir('marcador');
  }

  function crearLibre() {
    prepararMarcador({ arma: 'espada', tipo: 'ed', objetivo: 15, periodos: 3, minPeriodo: 3, izq: { nombre: 'Izquierda' }, der: { nombre: 'Derecha' } }, null);
    M.config = true; // muestra el panel de ajustes antes de empezar
  }
  function abrirLibre() { crearLibre(); A().ir('marcador'); }

  function accion(fn) {
    historial.push(JSON.stringify(M));
    if (historial.length > 200) historial.shift();
    const antes = M.aviso;
    M = fn(M);
    if (M.aviso && M.aviso !== antes) pitar(M.fin ? 3 : 2);
    pintarMarcador(true);
  }

  // Bucle del cronómetro: 10 veces por segundo
  function arrancarReloj() {
    if (reloj) return;
    ultimoTick = performance.now();
    reloj = setInterval(() => {
      const ahora = performance.now(), dt = ahora - ultimoTick; ultimoTick = ahora;
      if (!M || !M.corriendo) return;
      const antes = M.aviso, estabaCorriendo = M.corriendo;
      M = R.avanzar(M, dt);
      if (M.aviso && M.aviso !== antes) pitar(M.fin ? 3 : 2);
      if (estabaCorriendo && !M.corriendo) pedirPantalla(false);
      pintarMarcador(false);
    }, 100);
  }

  function pitar(veces) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
      pitar.ctx = pitar.ctx || new Ctx();
      const ctx = pitar.ctx;
      for (let i = 0; i < veces; i++) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.28;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        o.start(t); o.stop(t + 0.24);
      }
    } catch (e) { /* sin sonido */ }
    try { if (navigator.vibrate) navigator.vibrate(200); } catch (e) {}
  }

  // Mantiene la pantalla encendida mientras corre el tiempo (si el móvil lo permite)
  async function pedirPantalla(si) {
    try {
      if (si && 'wakeLock' in navigator && !wakeLock) wakeLock = await navigator.wakeLock.request('screen');
      if (!si && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (e) { wakeLock = null; }
  }

  const mmss = (ms) => {
    const t = Math.max(0, ms), s = Math.ceil(t / 1000);
    if (t < 10000 && t > 0) return '0:0' + (t / 1000).toFixed(1).replace('.', ',');
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  // Actualiza solo el reloj si no ha cambiado nada más (para no redibujar 10 veces por segundo)
  function pintarMarcador(forzar) {
    if (A().st.vista !== 'marcador') return;
    const clave = JSON.stringify([M.izq, M.der, M.periodo, M.descanso, M.fin, M.minutoExtra, M.aviso, M.corriendo, M.log.length, M.config]);
    if (forzar || clave !== claveRender) { claveRender = clave; A().render(); return; }
    const t = document.getElementById('mc-tiempo');
    if (t) t.textContent = M.descanso ? mmss(M.descansoMs) : mmss(M.restanteMs);
    const b = document.getElementById('mc-anti');
    if (b) { b.style.width = Math.min(100, M.sinTocadoMs / 600) + '%'; }
    const bt = document.getElementById('mc-anti-txt');
    if (bt) bt.textContent = Math.floor(M.sinTocadoMs / 1000) + ' s';
  }

  function chipsTarjetas(f) {
    let x = '';
    if (f.amarilla) x += '<i class="tj am" title="Amarilla"></i>';
    for (let i = 0; i < f.rojas; i++) x += '<i class="tj ro" title="Roja"></i>';
    if (f.negra) x += '<i class="tj ne" title="Negra"></i>';
    if (f.pRoja) x += '<i class="tj ro p" title="P roja">P</i>';
    if (f.pNegra) x += '<i class="tj ne p" title="P negra">P</i>';
    return x;
  }

  function vistaMarcador() {
    if (!M) crearLibre();
    arrancarReloj();
    const arma = R.ARMAS[M.arma];
    const lado = (l) => {
      const f = M[l];
      return `
        <div class="mc-lado ${l} ${M.ganador === l ? 'gana' : ''} ${M.prioridad === l ? 'prio' : ''}">
          <div class="mc-nombre">${h(f.nombre || (l === 'izq' ? 'Izquierda' : 'Derecha'))}${M.prioridad === l ? '<span class="mc-prio">Prioridad</span>' : ''}</div>
          <div class="mc-tarjetas">${chipsTarjetas(f)}</div>
          <button class="mc-toques" data-act="mc-tocado" data-l="${l}" ${M.fin ? 'disabled' : ''} aria-label="Tocado para ${h(f.nombre || l)}">${f.toques}</button>
          <div class="mc-fila">
            <button class="mc-mini" data-act="mc-corregir" data-l="${l}" aria-label="Restar un tocado">−1</button>
            <button class="mc-mini" data-act="mc-tarjeta" data-l="${l}" ${M.fin ? 'disabled' : ''}>Tarjeta</button>
          </div>
        </div>`;
    };
    const tiempo = M.descanso ? M.descansoMs : M.restanteMs;
    const etiquetaPeriodo = M.descanso ? 'DESCANSO' : M.minutoExtra ? 'MINUTO EXTRA' : (M.periodos > 1 ? 'PERIODO ' + M.periodo + ' / ' + M.periodos : (M.tipo === 'poule' ? 'POULE' : ''));
    return `
      <div class="marcador arma-${h(M.arma)}">
        <div class="mc-barra">
          <button class="mc-salir" data-act="mc-salir">‹ ${origen ? 'Volver a la competición' : 'Sala'}</button>
          <span class="mc-info">${h(arma.nombre)} · ${M.tipo === 'poule' ? 'Poule' : 'Eliminación directa'} a ${M.objetivo}</span>
          ${!origen ? '<button class="mc-salir" data-act="mc-config">Ajustes</button>' : '<span></span>'}
        </div>

        ${M.aviso ? `<div class="mc-aviso ${M.fin ? 'fin' : ''}" role="alert">${h(M.aviso)}</div>` : ''}

        <div class="mc-pista">
          ${lado('izq')}
          <div class="mc-centro">
            <div class="mc-periodo">${etiquetaPeriodo}</div>
            <div id="mc-tiempo" class="mc-tiempo ${M.corriendo && !M.descanso ? 'corre' : ''}">${mmss(tiempo)}</div>
            ${M.antijuego && M.tipo === 'ed' && !M.minutoExtra && !M.fin ? `
              <div class="mc-anti" title="Minuto de esgrima sin tocado (antijuego, t.124)">
                <div class="mc-anti-et"><span>Sin tocado</span><span id="mc-anti-txt">${Math.floor(M.sinTocadoMs / 1000)} s</span></div>
                <div class="mc-anti-bar"><i id="mc-anti" style="width:${Math.min(100, M.sinTocadoMs / 600)}%"></i></div>
                <div class="mc-anti-et"><span>${M.pAplicadas === 0 ? 'Siguiente: P roja a ambos' : 'Siguiente: P negra'}</span></div>
              </div>` : ''}
          </div>
          ${lado('der')}
        </div>

        <div class="mc-mandos">
          ${arma.doble ? `<button class="mc-btn sec" data-act="mc-doble" ${M.fin ? 'disabled' : ''}>Golpe doble</button>` : ''}
          ${arma.fueraBlanco ? `<button class="mc-btn sec" data-act="mc-fuera" ${M.fin ? 'disabled' : ''}>Fuera de blanco</button>` : ''}
          <button class="mc-btn grande ${M.corriendo ? 'parar' : ''}" data-act="mc-marcha" ${M.fin ? 'disabled' : ''}>${M.descanso ? 'Terminar descanso' : M.corriendo ? 'ALTO' : 'ADELANTE'}</button>
          <button class="mc-btn sec" data-act="mc-deshacer" ${historial.length ? '' : 'disabled'}>Deshacer</button>
        </div>
        <p class="mc-ayuda">Toca el número grande para dar el tocado (para el reloj). Barra espaciadora: adelante / alto.</p>

        ${M.fin ? `
          <div class="mc-final">
            <strong>Gana ${h(M[M.ganador].nombre || M.ganador)} · ${M.izq.toques} – ${M.der.toques}</strong>
            <span>${h(M.motivo)}</span>
            <div class="fila-btn">
              ${origen ? '<button class="btn" data-act="mc-guardar">Guardar en la competición</button>' : '<button class="btn" data-act="mc-nuevo">Nuevo asalto</button>'}
              <button class="btn sec" data-act="mc-deshacer">Deshacer último</button>
            </div>
          </div>` : ''}

        <details class="mc-log"><summary>Acta del asalto (${M.log.length})</summary>
          <ol>${M.log.map((x) => `<li><b>${h(x.m)}</b> ${h(x.t)}</li>`).join('')}</ol>
        </details>
        ${M.config ? panelConfig() : ''}
      </div>`;
  }

  function panelConfig() {
    return `
      <div class="mc-config-fondo"></div>
      <form class="mc-config" data-form="mc-config">
        <h2>Ajustes del asalto</h2>
        <div class="campos">
          <label>Arma<select id="mc-arma" name="arma">${Object.keys(R.ARMAS).map((k) => `<option value="${k}" ${M.arma === k ? 'selected' : ''}>${R.ARMAS[k].nombre}</option>`).join('')}</select></label>
          <label>Tipo<select id="mc-tipo" name="tipo" data-change="mc-tipo">
            <option value="poule" ${M.tipo === 'poule' ? 'selected' : ''}>Poule (5 tocados, 3 min)</option>
            <option value="ed" ${M.tipo === 'ed' ? 'selected' : ''}>Eliminación directa (15, 3×3 min)</option></select></label>
          <label>Tocados<input id="mc-obj" name="objetivo" type="number" min="1" max="45" value="${M.objetivo}"></label>
          <label>Periodos<input id="mc-per" name="periodos" type="number" min="1" max="3" value="${M.periodos}"></label>
          <label>Minutos por periodo<input id="mc-min" name="minutos" type="number" min="0.5" max="9" step="0.5" value="${M.durMs / 60000}"></label>
        </div>
        <div class="campos">
          <label>Tirador izquierda<input id="mc-ni" name="izq" value="${h(M.izq.nombre)}"></label>
          <label>Tirador derecha<input id="mc-nd" name="der" value="${h(M.der.nombre)}"></label>
        </div>
        <label>Mejor clasificación inicial (para la P negra en caso de empate)<select id="mc-sem" name="mejorSemilla">
          <option value="izq" ${M.mejorSemilla === 'izq' ? 'selected' : ''}>Izquierda</option><option value="der" ${M.mejorSemilla === 'der' ? 'selected' : ''}>Derecha</option></select></label>
        <p class="nota">El antijuego (P roja y P negra) solo se aplica en eliminación directa, como marca el reglamento.</p>
        <button class="btn" type="submit">Empezar asalto</button>
      </form>`;
  }

  function modalTarjeta(l) {
    const f = M[l];
    const prev = (g) => { const x = R.tarjeta(M, l, g); return x.ultimaTarjeta.color; };
    const nombreColor = { amarilla: 'Amarilla', roja: 'Roja (+1 rival)', negra: 'Negra (exclusión)' };
    const op = (g, t, ej) => { const col = prev(g); return `
      <button class="tj-op" data-act="mc-dar-tarjeta" data-l="${l}" data-g="${g}">
        <i class="tj ${col === 'amarilla' ? 'am' : col === 'roja' ? 'ro' : 'ne'}"></i>
        <span><strong>${t} → ${nombreColor[col]}</strong><small>${ej}</small></span></button>`; };
    A().abrirModal(`
      <h2>Tarjeta para ${h(f.nombre || l)}</h2>
      <p class="nota">Elige el grupo de la falta (t.170). La app decide el color según las tarjetas que ya tiene en este asalto.</p>
      <div class="pila">
        ${op(1, 'Grupo 1', 'Faltas leves. 1.ª vez amarilla; si ya tiene tarjeta, roja.')}
        ${op(2, 'Grupo 2', 'Siempre roja.')}
        ${op(3, 'Grupo 3', 'Conducta antideportiva. 1.ª vez roja; la 2.ª, negra.')}
        ${op(4, 'Grupo 4', 'Faltas graves. Negra directa.')}
      </div>`);
  }

  async function guardarDesdeMarcador() {
    const c = A().st.competiciones.find((x) => x.id === origen.compId);
    if (!c || !M.fin) return;
    A().st.compId = c.id;
    const incid = M.izq.negra ? 'a' : M.der.negra ? 'b' : '';
    const ok = await guardarResultado(origen, M.izq.toques, M.der.toques, M.ganador === 'izq' ? 'a' : 'b', incid);
    if (ok) { M = null; origen = null; A().st.compTab = A().st.compTab || 'poules'; A().ir('competicion'); }
  }

  document.addEventListener('keydown', (e) => {
    if (A() && A().st.vista === 'marcador' && M && e.code === 'Space' && !/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement.tagName)) {
      e.preventDefault(); accion(R.marchaParo);
    }
  });

  /* =================================================================
     VISTA FAMILIA: resultados de la sala
     ================================================================= */
  function vistaFamilia(s) {
    const st = A().st;
    const mias = st.competiciones.filter((c) => c.tiradores.some((t) => t.id === s.id)).sort((a, b) => b.fecha.localeCompare(a.fecha));
    if (!mias.length) return `<section><h2 class="sec-t">Competiciones en la sala</h2><div class="tarjeta"><p class="nota">${h(s.nombre.split(' ')[0])} todavía no ha participado en ninguna competición interna.</p></div></section>`;
    return `<section><h2 class="sec-t">Competiciones en la sala</h2>${mias.map((c) => {
      const cl = clasificacionPoules(c), fin = clasificacionFinal(c);
      const enPoule = cl.find((x) => x.id === s.id), enFinal = fin.find((x) => x.id === s.id);
      const asaltos = [];
      c.poules.forEach((p) => p.asaltos.forEach((b) => { if (hecho(b) && (b.a === s.id || b.b === s.id)) asaltos.push(b); }));
      if (c.ed) Object.values(c.ed.resultados).forEach((b) => { if (b.a === s.id || b.b === s.id) asaltos.push(Object.assign({ ed: true }, b)); });
      return `
        <div class="tarjeta">
          <div class="comp-cab"><div><strong>${h(c.nombre)}</strong><span class="nota">${h(A().fechaCorta(c.fecha))} · ${h(armaNombre(c.arma))}</span></div>
            ${enFinal && enFinal.puesto ? `<div class="puesto"><span>${enFinal.puesto}.º</span>de ${c.tiradores.length}</div>` : enPoule ? `<div class="puesto peq"><span>${enPoule.puesto}.º</span>tras poules</div>` : ''}</div>
          ${enPoule ? `<p class="nota">Poules: ${enPoule.v} victorias de ${enPoule.m} · índice ${enPoule.ind > 0 ? '+' : ''}${enPoule.ind}</p>` : ''}
          <ul class="mis-asaltos">${asaltos.map((b) => {
            const yo = b.a === s.id, rival = yo ? b.b : b.a, mios = yo ? b.ta : b.tb, suyos = yo ? b.tb : b.ta;
            return `<li class="${b.ganador === s.id ? 'v' : 'd'}"><span>${b.ed ? 'Eliminatoria' : 'Poule'} · ${h(nombreT(c, rival))}</span><b>${b.ganador === s.id ? 'V' : 'D'} ${mios}-${suyos}</b></li>`;
          }).join('')}</ul>
          ${fin.length ? `<details><summary>Clasificación final</summary><ol class="clasif-lista">${fin.filter((x) => x.puesto).map((x) => `<li class="${x.id === s.id ? 'yo' : ''}"><b>${x.puesto}</b> ${h(nombreT(c, x.id))}</li>`).join('')}</ol></details>` : ''}
        </div>`;
    }).join('')}</section>`;
  }

  /* =================================================================
     CLICS, FORMULARIOS Y CAMBIOS
     ================================================================= */
  const acciones = {
    'marcador-libre': () => abrirLibre(),
    'abrir-comp': (el) => { A().st.compId = el.dataset.id; A().st.compTab = ''; A().ir('competicion'); },
    'comp-tab': (el) => { A().st.compTab = el.dataset.t; A().render(); },
    'nc-marcar-arma': () => {
      const arma = (document.getElementById('nc-arma').value || '');
      document.querySelectorAll('#nc-lista input[type=checkbox]').forEach((i) => { i.checked = i.dataset.arma === arma; });
    },
    'nc-desmarcar': () => document.querySelectorAll('#nc-lista input[type=checkbox]').forEach((i) => { i.checked = false; }),
    'resortear': async () => {
      const c = comp(); if (!c) return;
      if (c.poules.some((p) => p.asaltos.some(hecho))) { A().aviso('Ya hay resultados: no se puede volver a sortear', 'error'); return; }
      c.poules = crearPoules(barajar(c.tiradores.map((t) => t.id)), c.poules.length);
      if (await guardarComp(c)) A().render();
    },
    'generar-ed': async () => {
      const c = comp(); generarED(c);
      if (await guardarComp(c)) { A().st.compTab = 'ed'; A().render(); }
    },
    'anotar': (el) => modalAnotar(el.dataset),
    'arbitrar': (el) => abrirDesdeCombate(Object.assign({}, el.dataset)),
    'pedir-borrar-comp': () => {
      const c = comp();
      A().abrirModal(`<h2>¿Borrar «${h(c.nombre)}»?</h2><p>Se perderán todas las poules y resultados.</p>
        <div class="fila-btn"><button class="btn peligro" data-act="borrar-comp">Sí, borrar</button><button class="btn sec" data-act="cerrar-modal">Cancelar</button></div>`);
    },
    'borrar-comp': async () => {
      const c = comp();
      if (await A().intentar(() => A().S.borrar('competiciones', c.id), 'Competición borrada')) {
        A().st.competiciones = A().st.competiciones.filter((x) => x.id !== c.id); A().cerrarModal(); A().ir('sala');
      }
    },
    // --- marcador ---
    'mc-tocado': (el) => accion((s) => R.tocado(s, el.dataset.l)),
    'mc-corregir': (el) => accion((s) => R.corregir(s, el.dataset.l, -1)),
    'mc-doble': () => accion(R.doble),
    'mc-fuera': () => accion(R.fueraDeBlanco),
    'mc-marcha': () => { accion(R.marchaParo); pedirPantalla(M.corriendo); if (pitar.ctx && pitar.ctx.state === 'suspended') pitar.ctx.resume(); },
    'mc-tarjeta': (el) => { if (M.corriendo) accion(R.marchaParo); modalTarjeta(el.dataset.l); },
    'mc-dar-tarjeta': (el) => { A().cerrarModal(); accion((s) => R.tarjeta(s, el.dataset.l, +el.dataset.g)); },
    'mc-deshacer': () => { if (!historial.length) return; M = JSON.parse(historial.pop()); pintarMarcador(true); },
    'mc-config': () => { if (M.corriendo) M = R.marchaParo(M); M.config = true; pintarMarcador(true); },
    'mc-nuevo': () => {
      const v = M; prepararMarcador({ arma: v.arma, tipo: v.tipo, objetivo: v.objetivo, periodos: v.periodos, minPeriodo: v.durMs / 60000, izq: { nombre: v.izq.nombre }, der: { nombre: v.der.nombre }, mejorSemilla: v.mejorSemilla });
      pintarMarcador(true);
    },
    'mc-guardar': () => guardarDesdeMarcador(),
    'mc-salir': () => {
      if (M && M.corriendo) M = R.marchaParo(M);
      pedirPantalla(false);
      if (origen) { A().st.compId = origen.compId; A().ir('competicion'); } else A().ir('sala');
    }
  };

  const formularios = {
    'nueva-comp': async (form, d, val) => {
      const st = A().st;
      const sel = d.getAll('tiradores');
      const tiradores = sel.map((id) => { const s = st.socios.find((x) => x.id === id); return { id, nombre: A().nombreCompleto(s), socio: true }; });
      val('invitados').split('\n').map((x) => x.trim()).filter(Boolean).forEach((n, i) => tiradores.push({ id: 'inv-' + Date.now().toString(36) + i, nombre: n, socio: false }));
      if (!val('nombre')) { A().aviso('Pon un nombre a la competición', 'error'); return; }
      if (tiradores.length < 3) { A().aviso('Hacen falta al menos 3 tiradores', 'error'); return; }
      const np = Math.max(1, Math.min(Number(val('numPoules')) || Math.ceil(tiradores.length / 7), Math.floor(tiradores.length / 3)));
      const c = {
        id: 'c' + Date.now().toString(36), nombre: val('nombre'), fecha: val('fecha') || A().hoyISO(), arma: val('arma') || 'espada',
        config: { toquesPoule: Number(val('toquesPoule')) || 5, toquesED: Number(val('toquesED')) || 15, minutos: Number(val('minutos')) || 3 },
        tiradores, estado: 'poules', ed: null, creada: new Date().toISOString()
      };
      c.poules = crearPoules(barajar(tiradores.map((t) => t.id)), np);
      if (await A().intentar(() => A().S.guardarDoc('competiciones', c.id, c), 'Competición creada y poules sorteadas')) {
        st.competiciones.push(c); st.compId = c.id; st.compTab = 'poules'; A().ir('competicion');
      }
    },
    'anotar': async (form, d, val) => {
      const c = comp(), dat = form.dataset, x = datosCombate(c, dat);
      const err = form.querySelector('#an-error');
      const ta = Number(val('ta')), tb = Number(val('tb')), inc = val('incidencia');
      let g = val('ganador');
      const fallo = (t) => { err.textContent = t; err.hidden = false; };
      if (val('ta') === '' || val('tb') === '') return fallo('Escribe los tocados de los dos.');
      if (ta > x.objetivo || tb > x.objetivo) return fallo('El máximo es ' + x.objetivo + ' tocados.');
      if (inc) g = inc === 'a' ? 'b' : 'a';
      else if (!g) { if (ta === tb) return fallo('Hay empate: elige el ganador (prioridad o P negra).'); g = ta > tb ? 'a' : 'b'; }
      else if ((g === 'a' && ta < tb) || (g === 'b' && tb < ta)) return fallo('El ganador no puede tener menos tocados (salvo incidencia).');
      if (await guardarResultado(dat, ta, tb, g, inc)) { A().cerrarModal(); A().render(); }
    },
    'mc-config': (form, d, val) => {
      const tipo = val('tipo');
      prepararMarcador({
        arma: val('arma'), tipo, objetivo: Number(val('objetivo')) || 15, periodos: Number(val('periodos')) || 1,
        minPeriodo: Number(val('minutos')) || 3, izq: { nombre: val('izq') }, der: { nombre: val('der') }, mejorSemilla: val('mejorSemilla')
      });
      pintarMarcador(true);
    }
  };

  const cambios = {
    'mc-tipo': (el) => {
      const poule = el.value === 'poule';
      const f = el.form;
      f.objetivo.value = poule ? 5 : 15; f.periodos.value = poule ? 1 : 3;
    },
    'nc-arma': () => {}
  };

  /* Demo: crea una competición de ejemplo la primera vez */
  async function alCargar() {
    const S = A().S, st = A().st;
    if (S.modo !== 'demo' || !S.consumirSemillaSala || !st.usuario || !st.usuario.esAdmin) return;
    if (!(await S.consumirSemillaSala())) return;
    const esp = st.socios.filter((s) => s.activo !== false);
    if (esp.length < 6) return;
    const tiradores = esp.map((s) => ({ id: s.id, nombre: A().nombreCompleto(s), socio: true }));
    tiradores.push({ id: 'inv-1', nombre: 'Marina Soler (C.E. Elche)', socio: false }, { id: 'inv-2', nombre: 'Diego Ros (C.E. Orihuela)', socio: false });
    const d = new Date(); d.setDate(d.getDate() - 6);
    const c = { id: 'c-demo', nombre: 'Torneo interno de otoño · Espada', fecha: A().hoyISO().slice(0, 8) + String(d.getDate()).padStart(2, '0'), arma: 'espada',
      config: { toquesPoule: 5, toquesED: 15, minutos: 3 }, tiradores, estado: 'poules', ed: null, creada: d.toISOString() };
    c.fecha = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    c.poules = crearPoules(tiradores.map((t) => t.id), 2);
    // resultados inventados para la demo
    let k = 7;
    const rnd = () => { k = (k * 9301 + 49297) % 233280; return k / 233280; };
    c.poules.forEach((p) => p.asaltos.forEach((b) => {
      const ganaA = rnd() < 0.5, perd = Math.floor(rnd() * 5);
      b.ta = ganaA ? 5 : perd; b.tb = ganaA ? perd : 5; b.ganador = ganaA ? b.a : b.b;
    }));
    generarED(c);
    // primera ronda jugada, el resto pendiente
    const n0 = c.ed.tam / 2;
    for (let m = 0; m < n0; m++) {
      const [a, b] = participantes(c, 0, m);
      if (a && b) { const ta = 15, tb = 6 + Math.floor(rnd() * 8); c.ed.resultados['0-' + m] = { a, b, ta, tb, ganador: a }; }
    }
    await S.guardarDoc('competiciones', c.id, c);
    st.competiciones.push(c);
  }

  function alSalir(prev) {
    if (prev === 'marcador' && M && M.corriendo) { M = R.marchaParo(M); pedirPantalla(false); }
  }

  window.ACE_SALA = {
    vista(v) { return v === 'competicion' ? vistaCompeticion() : v === 'marcador' ? vistaMarcador() : vistaSala(); },
    vistaFamilia, acciones, formularios, cambios, alCargar, alSalir,
    // expuesto para pruebas
    _logica: { crearPoules, ordenAsaltos, clasificacionPoules, generarED, participantes, ganadorED, clasificacionFinal, ordenCuadro }
  };
})();
