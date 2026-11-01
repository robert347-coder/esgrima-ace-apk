/* =====================================================================
   SUPLEMENTOS · módulo compartido (AF Entrena y AF Peso)
   Basado en las posiciones de la ISSN, el marco del Australian Institute
   of Sport (grupo A = evidencia sólida) y los límites de la EFSA.
   window.AF_SUPLEMENTOS(perfil) devuelve el HTML de la sección.
   perfil = { peso: kg, edad: años o null }
   ===================================================================== */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function n(x, d) { return (Math.round(x * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toString().replace('.', ','); }

  // dosis(peso) devuelve el texto de la dosis personalizada para adultos
  var SUP = [
    { id: 'creatina', t: 'Creatina monohidrato', ev: 'A', c: 'var(--green)',
      para: 'Esfuerzos cortos e intensos repetidos (ataques, fondos, sprints) y ganancia de fuerza y masa muscular.',
      dosis: function (p) { return '<b>3-5 g al día</b>, todos los días, también los de descanso' + (p ? ' (para ' + n(p) + ' kg: unos ' + n(Math.min(5, Math.max(3, p * 0.05))) + ' g)' : '') + '.'; },
      uso: ['Con cualquier comida; da igual la hora. Lo importante es tomarla a diario.', 'La «fase de carga» (20 g/día durante 5-7 días) no hace falta: con 3-5 g diarios llegas al mismo punto en 3-4 semanas.', 'Elige monohidrato, con sello de calidad (por ejemplo, Creapure®).'],
      limites: ['Es normal subir 1-2 kg de peso por agua dentro del músculo los primeros días.', 'No hacen falta descansos ni ciclos.', 'Con enfermedad renal o medicación que afecte al riñón: solo con permiso médico.'] },
    { id: 'proteina', t: 'Proteína en polvo (whey o vegetal)', ev: 'A', c: 'var(--green)',
      para: 'Llegar a la proteína diaria cuando con la comida no alcanzas. Es comida en polvo, no algo «extra».',
      dosis: function (p) { return '<b>20-40 g por toma</b>' + (p ? ' (para ' + n(p) + ' kg: ' + Math.round(p * 0.3 / 5) * 5 + ' g aprox.)' : '') + ', 1-2 tomas al día como máximo. Total diario contando la comida: 1,6-2,2 g por kg' + (p ? ' (' + Math.round(p * 1.6) + '-' + Math.round(p * 2.2) + ' g)' : '') + '.'; },
      uso: ['Después de entrenar o en una comida pobre en proteína (desayuno, merienda).', 'Con intolerancia a la lactosa: whey aislada o proteína vegetal (guisante, soja).', 'Si ya llegas a tu proteína con la comida, no aporta nada más.'],
      limites: ['Más de 2,2 g/kg al día no mejora el resultado en personas sanas.', 'No sustituyas comidas completas por batidos de forma habitual.'] },
    { id: 'cafeina', t: 'Cafeína', ev: 'A', c: 'var(--gold)',
      para: 'Atención, tiempo de reacción y sensación de menos fatiga. Útil en competiciones largas.',
      dosis: function (p) { return p ? '<b>' + Math.round(p * 1) + '-' + Math.min(200, Math.round(p * 3)) + ' mg por toma</b> (1-3 mg/kg), 30-60 min antes. Empieza por lo bajo. <b>Nunca más de 400 mg al día</b> ni más de 200 mg de golpe.' : '<b>1-3 mg por kg</b>, 30-60 min antes. Máximo 400 mg al día y 200 mg por toma.'; },
      uso: ['Un café expreso tiene unos 60-80 mg; una lata de bebida energética, unos 80 mg; un gel con cafeína, 25-100 mg.', 'En un torneo de esgrima: tomas pequeñas antes de poules y antes de la eliminatoria, mejor que una grande.', 'Pruébala en entrenamientos, nunca por primera vez en una competición.'],
      limites: ['No por la tarde-noche: empeora el sueño y la recuperación.', 'Evítala con hipertensión, arritmias, ansiedad o embarazo, salvo indicación médica.', 'Más dosis no es mejor: por encima de 6 mg/kg aparecen temblores, nervios y malestar.'] },
    { id: 'betaalanina', t: 'Beta-alanina', ev: 'A', c: 'var(--gold)',
      para: 'Esfuerzos de 1 a 4 minutos muy intensos. En esgrima, el beneficio es moderado.',
      dosis: function () { return '<b>3,2-6,4 g al día</b> repartidos en tomas de 1,6 g, durante al menos 4 semanas.'; },
      uso: ['Repartida con las comidas para evitar el hormigueo (parestesia), que es inofensivo.', 'Funciona por acumulación: tomarla justo antes no sirve.'],
      limites: ['El hormigueo en cara y manos es normal; si molesta, reduce cada toma.', 'Prioridad baja: antes asegúrate de dormir, comer y entrenar bien.'] },
    { id: 'electrolitos', t: 'Bebida isotónica / electrolitos', ev: 'A', c: 'var(--navy)',
      para: 'Entrenamientos o competiciones de más de 90 minutos o con mucho calor y sudor.',
      dosis: function () { return '<b>400-800 ml por hora</b> a sorbos, con 300-600 mg de sodio por litro.'; },
      uso: ['En competición, entre asaltos y entre poules.', 'Casera: 1 litro de agua, 200 ml de zumo, 1 pizca de sal (unos 1-1,5 g) y 2 cucharadas de azúcar o miel.'],
      limites: ['En sesiones cortas basta con agua.', 'Las bebidas «energéticas» no son isotónicas: llevan cafeína y mucho azúcar.'] },
    { id: 'omega3', t: 'Omega-3 (EPA + DHA)', ev: 'B', c: 'var(--steel)',
      para: 'Solo si comes poco pescado azul (menos de 2 veces por semana).',
      dosis: function () { return '<b>1-2 g de EPA+DHA al día</b> con una comida. La EFSA considera seguro hasta 5 g al día.'; },
      uso: ['Mejor comer pescado azul 2-3 veces por semana (salmón, sardina, caballa).'],
      limites: ['Con anticoagulantes, consulta antes con el médico.'] },
    { id: 'vitd', t: 'Vitamina D', ev: 'B', c: 'var(--steel)',
      para: 'Solo si un análisis muestra niveles bajos (habitual en invierno o si entrenas siempre en interior).',
      dosis: function () { return '<b>La que indique tu médico</b> según el análisis. Límite seguro de la EFSA: 4.000 UI (100 µg) al día.'; },
      uso: ['Se absorbe mejor con una comida con algo de grasa.'],
      limites: ['El exceso se acumula y es tóxico: no tomes dosis altas sin análisis.'] },
    { id: 'hierro', t: 'Hierro', ev: 'B', c: 'var(--steel)',
      para: 'Solo con análisis que demuestre déficit (más frecuente en mujeres deportistas).',
      dosis: function () { return '<b>Siempre con prescripción médica.</b>'; },
      uso: ['Se absorbe mejor con vitamina C (un zumo de naranja) y lejos del café, el té y los lácteos.'],
      limites: ['El exceso de hierro es peligroso. Nunca «por si acaso».'] }
  ];

  var EVITAR = ['«Quemagrasas» y termogénicos: poco efecto y muchos llevan estimulantes peligrosos.', 'Prohormonas, «potenciadores de testosterona» y productos que prometen resultados rápidos: riesgo para la salud y de dar positivo.', 'BCAA y aminoácidos sueltos: si comes proteína suficiente, no aportan nada.', 'Cualquier producto comprado por internet sin marca fiable ni etiqueta clara.'];

  window.AF_SUPLEMENTOS = function (perfil) {
    perfil = perfil || {};
    var peso = +perfil.peso || 0, edad = perfil.edad;
    var menor = edad != null && edad < 18;
    var cab = '<section class="card stack"><div class="eyebrow">Suplementos</div><h3 style="font-size:28px">Primero la comida, después (quizá) el bote</h3>' +
      '<p class="muted" style="margin:0">Solo aparecen los que tienen pruebas sólidas (grupo A) o un uso concreto (grupo B). Las cantidades son para <b>adultos sanos</b>' + (peso && !menor ? ' y están calculadas para tus ' + n(peso, 1) + ' kg' : '') + '. Si tomas medicación, tienes alguna enfermedad o estás embarazada, consulta antes con tu médico.</p></section>';
    var anti = '<section class="card stack" style="border-left:6px solid var(--red)"><h3 style="font-size:24px">Antidopaje: la responsabilidad es tuya</h3>' +
      '<p style="margin:0">Algunos suplementos vienen contaminados con sustancias prohibidas, y un positivo cuenta aunque no lo supieras. Si compites con licencia federativa:</p>' +
      '<ul class="ap-lista"><li>Usa solo productos con certificado antidopaje por lotes (<b>Informed Sport</b>, <b>Kölner Liste</b> o similar).</li><li>Guarda el envase y el número de lote.</li><li>Ante la duda, consulta la lista de la AMA/WADA y a la CELAD (Comisión Española para la Lucha Antidopaje en el Deporte).</li></ul></section>';
    if (menor) {
      return '<div class="stack">' + cab +
        '<section class="card stack" style="border-left:6px solid var(--gold)"><h3 style="font-size:24px">Menores de 18 años: sin suplementos</h3>' +
        '<p style="margin:0">A tu edad no se recomiendan creatina, cafeína, proteína en polvo ni otros suplementos, salvo que los indique un médico (por ejemplo, hierro o vitamina D tras un análisis). Una dieta variada te da todo lo que necesitas para rendir y crecer.</p>' +
        '<ul class="ap-lista"><li>¿Quieres más fuerza? Entrena bien la técnica y duerme 9 horas.</li><li>¿Más proteína? Leche, yogur, huevos, legumbres, pescado y carne en tus comidas.</li><li>¿Más energía en competición? Fruta, bocadillo y agua.</li></ul></section>' + anti + '</div>';
    }
    return '<div class="stack">' + cab + '<div class="grid2">' + SUP.map(function (s) {
      return '<section class="card stack" style="border-top:5px solid ' + s.c + '"><div class="row" style="justify-content:space-between;align-items:baseline"><h3 style="font-size:24px">' + esc(s.t) + '</h3><span class="tag">Evidencia ' + s.ev + '</span></div>' +
        '<p style="margin:0"><b>Para qué:</b> ' + esc(s.para) + '</p><p style="margin:0">' + s.dosis(peso) + '</p>' +
        '<details><summary>Cómo tomarlo</summary><ul class="ap-lista">' + s.uso.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></details>' +
        '<details><summary>Límites y precauciones</summary><ul class="ap-lista">' + s.limites.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></details></section>';
    }).join('') + '</div>' +
      '<section class="card stack"><h3 style="font-size:24px">Mejor evitar</h3><ul class="ap-lista">' + EVITAR.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></section>' + anti + '</div>';
  };
})();
