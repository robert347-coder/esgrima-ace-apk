/* =====================================================================
   MOTOR DE REGLAS DEL ASALTO · Reglamento Técnico FIE (ed. 1-ago-2026)
   ---------------------------------------------------------------------
   Este archivo no dibuja nada: solo decide qué pasa en el asalto
   (tocados, tiempo, tarjetas, antijuego). Así se puede probar aparte.

   Resumen de lo que aplica:
   · Duración (t.38 / t.39)
       - Poule: 5 tocados o 3 min de tiempo efectivo.
       - Eliminación directa: 15 tocados o 3 periodos de 3 min con
         1 min de descanso. En SABLE el 1.er periodo termina también
         cuando un tirador llega a 8 tocados.
       - Fin del tiempo con empate: sorteo de prioridad y 1 minuto
         extra; el primer tocado gana; si sigue el empate, gana quien
         tiene la prioridad.
   · Golpe doble (solo ESPADA): cuenta para los dos, salvo cuando
     ambos están a un tocado del final (4-4 / 14-14) o en el minuto
     extra: entonces NO cuenta (t.38.1.b).
   · Tarjetas (t.158-t.170), válidas para el asalto:
       - Grupo 1: amarilla la primera vez; si ya tenía tarjeta, roja.
       - Grupo 2: roja.
       - Grupo 3: roja la primera vez; la segunda, negra.
       - Grupo 4: negra.
       Roja = tocado para el rival. Negra = exclusión (pierde).
   · Antijuego (t.124, versión 2026, sin P amarilla):
       - Solo eliminación directa (no en poules).
       - 1 minuto de esgrima sin tocado (el contador se reinicia con
         cada tocado, tocado fuera de blanco, tocado de castigo y al
         empezar cada periodo).
       - 1.ª vez: P ROJA a ambos tiradores (un tocado para cada rival).
       - 2.ª vez: P NEGRA al que va perdiendo; si empatan, al de peor
         clasificación inicial. Pierde el asalto.
       - Nunca se da P a 14-14.
   ===================================================================== */
(function (root) {
  'use strict';

  const ARMAS = {
    espada: { nombre: 'Espada', doble: true, fueraBlanco: false, descansoEn: null },
    florete: { nombre: 'Florete', doble: false, fueraBlanco: true, descansoEn: null },
    sable: { nombre: 'Sable', doble: false, fueraBlanco: false, descansoEn: 8 }
  };
  const MINUTO = 60000;
  const otro = (l) => (l === 'izq' ? 'der' : 'izq');

  /* Crea un asalto nuevo.
     op = { arma, tipo: 'poule'|'ed'|'libre', objetivo, periodos, minPeriodo,
            izq: {id, nombre}, der: {id, nombre}, mejorSemilla: 'izq'|'der',
            antijuego: true|false }   */
  function nuevoAsalto(op) {
    const tipo = op.tipo || 'ed';
    const tirador = (t) => ({
      id: t && t.id || null, nombre: (t && t.nombre) || '', toques: 0,
      amarilla: false, rojas: 0, grupo3: 0, negra: false, pRoja: false, pNegra: false
    });
    return {
      arma: ARMAS[op.arma] ? op.arma : 'espada',
      tipo,
      objetivo: op.objetivo || (tipo === 'poule' ? 5 : 15),
      periodos: op.periodos || (tipo === 'poule' ? 1 : 3),
      durMs: Math.round((op.minPeriodo || 3) * MINUTO),
      // El antijuego solo existe en eliminación directa
      antijuego: op.antijuego != null ? !!op.antijuego : tipo === 'ed',
      mejorSemilla: op.mejorSemilla || 'izq',
      periodo: 1,
      restanteMs: Math.round((op.minPeriodo || 3) * MINUTO),
      corriendo: false,
      descanso: false, descansoMs: 0, descansoSableHecho: false,
      sinTocadoMs: 0, pAplicadas: 0,
      minutoExtra: false, prioridad: null,
      fin: false, ganador: null, motivo: '',
      izq: tirador(op.izq), der: tirador(op.der),
      log: [], aviso: null
    };
  }

  const copiar = (s) => JSON.parse(JSON.stringify(s));
  function anotar(s, texto, importante) {
    s.log.unshift({ t: texto, m: s.izq.toques + '-' + s.der.toques });
    if (importante) s.aviso = texto;
  }
  function terminar(s, lado, motivo) {
    s.fin = true; s.ganador = lado; s.corriendo = false; s.descanso = false; s.motivo = motivo;
    anotar(s, 'FIN: gana ' + (s[lado].nombre || (lado === 'izq' ? 'izquierda' : 'derecha')) + ' · ' + motivo, true);
  }

  // Tras cualquier cambio de marcador: ¿se acabó?, ¿descanso del sable?
  function comprobar(s) {
    if (s.fin) return s;
    const a = s.izq.toques, b = s.der.toques;
    if (s.minutoExtra && a !== b) { terminar(s, a > b ? 'izq' : 'der', 'Tocado decisivo en el minuto extra'); return s; }
    if (a >= s.objetivo || b >= s.objetivo) { terminar(s, a > b ? 'izq' : 'der', 'Llega a ' + s.objetivo + ' tocados'); return s; }
    // Sable en eliminación directa: descanso cuando alguien llega a 8 en el 1.er periodo (t.39)
    const arma = ARMAS[s.arma];
    if (arma.descansoEn && s.tipo === 'ed' && s.periodos > 1 && s.periodo === 1 && !s.descansoSableHecho && Math.max(a, b) >= arma.descansoEn) {
      s.descansoSableHecho = true;
      empezarDescanso(s, 'Sable: un tirador llega a ' + arma.descansoEn + ' tocados. Descanso de 1 minuto.');
    }
    return s;
  }

  function empezarDescanso(s, texto) {
    s.descanso = true; s.descansoMs = MINUTO; s.corriendo = true;
    s.periodo += 1; s.restanteMs = s.durMs; s.sinTocadoMs = 0;
    anotar(s, texto, true);
  }

  /* ---------------- Acciones del árbitro ---------------- */

  function tocado(s0, lado) {
    const s = copiar(s0); if (s.fin) return s;
    s.corriendo = false; s.aviso = null;
    s[lado].toques += 1; s.sinTocadoMs = 0;
    anotar(s, 'Tocado ' + (lado === 'izq' ? 'izquierda' : 'derecha'));
    return comprobar(s);
  }

  function doble(s0) {
    const s = copiar(s0); if (s.fin) return s;
    s.corriendo = false; s.aviso = null; s.sinTocadoMs = 0;
    if (!ARMAS[s.arma].doble) { anotar(s, 'El golpe doble solo existe en espada', true); return s; }
    if (s.minutoExtra) { anotar(s, 'Doble en el minuto extra: no cuenta (t.38)', true); return s; }
    if (s.izq.toques === s.objetivo - 1 && s.der.toques === s.objetivo - 1) {
      anotar(s, 'Doble a ' + (s.objetivo - 1) + '-' + (s.objetivo - 1) + ': no cuenta, se sigue (t.38)', true); return s;
    }
    s.izq.toques += 1; s.der.toques += 1;
    anotar(s, 'Golpe doble: tocado para ambos');
    return comprobar(s);
  }

  function fueraDeBlanco(s0) {
    const s = copiar(s0); if (s.fin) return s;
    s.corriendo = false; s.sinTocadoMs = 0; s.aviso = null;
    anotar(s, 'Tocado fuera de blanco (se reinicia el minuto de antijuego)');
    return s;
  }

  // grupo: 1, 2, 3 o 4 (t.170). Devuelve el estado y deja en s.ultimaTarjeta el color aplicado.
  function tarjeta(s0, lado, grupo) {
    const s = copiar(s0); if (s.fin) return s;
    s.corriendo = false; s.aviso = null;
    const f = s[lado], r = otro(lado);
    let color;
    if (grupo === 1) color = (f.amarilla || f.rojas > 0) ? 'roja' : 'amarilla';
    else if (grupo === 2) color = 'roja';
    else if (grupo === 3) { f.grupo3 += 1; color = f.grupo3 >= 2 ? 'negra' : 'roja'; }
    else color = 'negra';
    s.ultimaTarjeta = { lado, color, grupo };
    const quien = f.nombre || (lado === 'izq' ? 'izquierda' : 'derecha');
    if (color === 'amarilla') { f.amarilla = true; anotar(s, 'Tarjeta AMARILLA (grupo 1) a ' + quien + ': aviso válido para todo el asalto', true); return s; }
    if (color === 'roja') {
      f.rojas += 1; s[r].toques += 1; s.sinTocadoMs = 0;
      anotar(s, 'Tarjeta ROJA (grupo ' + grupo + ') a ' + quien + ': tocado para el rival' +
        (grupo === 1 ? ' (ya tenía tarjeta)' : ''), true);
      return comprobar(s);
    }
    f.negra = true;
    anotar(s, 'Tarjeta NEGRA (grupo ' + grupo + (grupo === 3 ? ', reincidencia' : '') + ') a ' + quien + ': exclusión', true);
    terminar(s, r, 'Tarjeta negra al rival (exclusión)');
    return s;
  }

  // Aplica el antijuego cuando se cumple el minuto sin tocado (t.124)
  function aplicarAntijuego(s) {
    s.corriendo = false; s.sinTocadoMs = 0;
    const a = s.izq.toques, b = s.der.toques, tope = s.objetivo - 1;
    if (a === tope && b === tope) { anotar(s, 'Minuto sin tocado a ' + tope + '-' + tope + ': no se da tarjeta P (t.124.3)', true); return s; }
    if (s.pAplicadas === 0) {
      s.pAplicadas = 1;
      s.izq.pRoja = true; s.der.pRoja = true;
      s.izq.toques += 1; s.der.toques += 1;
      anotar(s, 'ANTIJUEGO: 1 minuto sin tocado. P ROJA a ambos: un tocado para cada uno', true);
      return comprobar(s);
    }
    s.pAplicadas = 2;
    let castigado;
    if (a !== b) castigado = a < b ? 'izq' : 'der';
    else castigado = otro(s.mejorSemilla); // empate: peor clasificación inicial
    s[castigado].pNegra = true;
    anotar(s, 'ANTIJUEGO por segunda vez: P NEGRA a ' + (s[castigado].nombre || castigado) +
      (a === b ? ' (empate: peor clasificación inicial)' : ' (va perdiendo)'), true);
    terminar(s, otro(castigado), 'P negra al rival por antijuego');
    return s;
  }

  function finDeTiempo(s, azar) {
    s.corriendo = false; s.restanteMs = 0;
    const a = s.izq.toques, b = s.der.toques;
    if (s.minutoExtra) { terminar(s, s.prioridad, 'Fin del minuto extra: gana quien tenía la prioridad'); return s; }
    if (s.periodo < s.periodos) { empezarDescanso(s, 'Fin del periodo ' + (s.periodo) + '. Descanso de 1 minuto.'); return s; }
    if (a !== b) { terminar(s, a > b ? 'izq' : 'der', 'Fin del tiempo'); return s; }
    // Empate al acabar el tiempo: sorteo de prioridad y minuto extra
    s.prioridad = (azar || Math.random)() < 0.5 ? 'izq' : 'der';
    s.minutoExtra = true; s.restanteMs = MINUTO; s.sinTocadoMs = 0;
    anotar(s, 'Empate al final del tiempo. Sorteo: prioridad para ' + (s[s.prioridad].nombre || s.prioridad) + '. Minuto extra: el primer tocado gana', true);
    return s;
  }

  // Avanza el reloj dtMs milisegundos (lo llama el cronómetro)
  function avanzar(s0, dtMs, azar) {
    if (!s0.corriendo || s0.fin) return s0;
    const s = copiar(s0);
    if (s.descanso) {
      s.descansoMs -= dtMs;
      if (s.descansoMs <= 0) { s.descansoMs = 0; s.descanso = false; s.corriendo = false; anotar(s, 'Fin del descanso. A la guardia.', true); }
      return s;
    }
    s.restanteMs -= dtMs;
    if (s.antijuego && s.tipo === 'ed' && !s.minutoExtra) s.sinTocadoMs += dtMs;
    if (s.restanteMs <= 0) return finDeTiempo(s, azar);
    if (s.antijuego && s.tipo === 'ed' && !s.minutoExtra && s.sinTocadoMs >= MINUTO) return aplicarAntijuego(s);
    return s;
  }

  function marchaParo(s0) {
    const s = copiar(s0); if (s.fin) return s;
    s.aviso = null;
    if (s.descanso) { s.descanso = false; s.corriendo = false; anotar(s, 'Descanso terminado por el árbitro'); return s; }
    s.corriendo = !s.corriendo;
    return s;
  }

  // Corrección manual (+1 / -1) por error del árbitro
  function corregir(s0, lado, delta) {
    const s = copiar(s0);
    s[lado].toques = Math.max(0, s[lado].toques + delta);
    if (s.fin && delta < 0) { s.fin = false; s.ganador = null; s.motivo = ''; }
    anotar(s, 'Corrección ' + (lado === 'izq' ? 'izquierda' : 'derecha') + ' ' + (delta > 0 ? '+1' : '-1'));
    return delta > 0 ? comprobar(s) : s;
  }

  const API = { ARMAS, nuevoAsalto, tocado, doble, fueraDeBlanco, tarjeta, avanzar, marchaParo, corregir, aplicarAntijuego, finDeTiempo };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.ACE_REGLAS = API;
})(typeof window !== 'undefined' ? window : this);
