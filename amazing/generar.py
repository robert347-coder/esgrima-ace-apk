"""Genera las 4 apps de Amazing Fencing a partir de fuente/index.html.

Cada app muestra solo sus secciones, con su nombre, icono e identificador
de Android propios. Para cambiar el reparto, edita APPS y vuelve a ejecutar:
    python3 generar.py
"""
import json, os, re, shutil
from PIL import Image, ImageDraw, ImageFont

BASE = os.path.dirname(os.path.abspath(__file__))
FUENTE = os.path.join(BASE, 'fuente', 'index.html')

APPS = [
    dict(id='entrena', acento=('#1D4E89', '#8DB4EA'), intro=[('plan', 'Tu plan hasta la competición', 'Pon la fecha y la app reparte las semanas en ciclos de carga y descarga.'), ('fisico', 'Entrena como los mejores', 'Rutinas con y sin pesas de velocistas, boxeadores y karatecas, adaptadas a la esgrima.'), ('dieta', 'Come para rendir', 'Tu dieta según objetivo y nivel, y suplementos con sus límites.')],
         nombre='AF Entrena', sub='Técnica · Calentamiento · Juegos', color='#1D4E89', letra='E',
         vistas=[('home', 'Inicio'), ('plan', 'Mi plan'), ('fisico', 'Físico'), ('dieta', 'Nutrición'), ('learn', 'Aprender'), ('warm', 'Calentar'), ('tabata', 'Tabata'), ('games', 'Juegos')],
         js=['suplementos', 'entrena-plus'], css=['entrena-plus'], notificaciones=True,
         titulo='Entrena <span>y</span> aprende',
         texto='Tu plan hasta la competición con ciclos y objetivos, rutinas con y sin pesas de velocistas, boxeadores y karatecas, nutrición según tu objetivo, y la técnica de las grandes escuelas.',
         videos=True),
    dict(id='arbitro', acento=('#C62839', '#FF7A88'), intro=[('ref', 'Arbitra con el marcador', 'Tiempo, tocados, tarjetas y antijuego según el reglamento FIE 2026-27.'), ('bank', 'Practica el reglamento', 'Cientos de preguntas para entrenar y simulacros de examen.'), ('learn', 'Órdenes y gestos', 'En garde, prêts, allez: la guía del árbitro siempre a mano.')],
         nombre='AF Árbitro', sub='Marcador · Reglamento FIE', color='#D02B3F', letra='A',
         vistas=[('home', 'Inicio'), ('ref', 'Arbitrar'), ('bank', 'Preguntas')],
         titulo='Arbitra <span>sin dudas</span>',
         texto='Marcador de arbitraje completo con el reglamento FIE 2026-27, órdenes del árbitro y un banco de preguntas para practicar y examinarte.',
         videos=False),
    dict(id='entrenador', acento=('#8F6512', '#E7BB55'), intro=[('coach', 'Fórmate como técnico', 'Temario de los niveles I, II y III de entrenador de esgrima.'), ('bank', 'Simulacros con tiempo', 'Ponte a prueba como en el examen y repasa tus fallos.'), ('learn', 'Requisitos claros', 'Qué te piden en cada nivel y cómo prepararlo.')],
         nombre='AF Entrenador', sub='Titulaciones · Niveles I, II y III', color='#B8871F', letra='M',
         vistas=[('home', 'Inicio'), ('coach', 'Entrenador')],
         titulo='Fórmate <span>como técnico</span>',
         texto='Temario oficial de los niveles I, II y III, requisitos de cada titulación y simulacros de examen con tiempo.',
         videos=False),
    dict(id='peso', acento=('#6E3591', '#C69AE6'), intro=[('alimentos', 'Come lo que te gusta', 'Marca tus alimentos favoritos y los que no, y la app monta tu menú con ellos.'), ('menu', 'Cantidades y calorías', 'Cada comida con sus gramos y calorías. Si no te apetece algo, cámbialo por otro equivalente.'), ('peso', 'Sigue tu progreso', 'Tu peso, tu tendencia y un aviso diario. Sin prisas: lo saludable es lo que dura.')],
         nombre='AF Peso', sub='Dieta · Peso · Suplementos', color='#7A3E9D', letra='P',
         vistas=[('home', 'Hoy'), ('menu', 'Mi dieta'), ('alimentos', 'Alimentos'), ('peso', 'Mi peso'), ('suple', 'Suplementos'), ('perfil', 'Mis datos')],
         titulo='Come lo que <span>te gusta</span>',
         texto='Calorías, cantidades y alternativas para cada comida.',
         pie='AF Peso orienta, no sustituye a un dietista-nutricionista ni a tu médico. Calorías calculadas con la ecuación de Mifflin-St Jeor; suplementos según la ISSN, el Australian Institute of Sport y los límites de la EFSA. Si la comida o el peso te generan ansiedad, pide ayuda profesional.',
         js=['suplementos', 'af-peso'], css=['entrena-plus', 'af-peso'], notificaciones=True, videos=False),
    dict(id='competicion', acento=('#0B6E6D', '#4FD1CF'), intro=[('comp', 'Monta tu competición', 'Poules, orden de asaltos, clasificación y cuadro en minutos.'), ('dt', 'Dirige como un profesional', 'Todo lo que hace el director técnico, paso a paso.'), ('plan', 'El día de la competición', 'Lista de comprobación para que nada falle.')],
         nombre='AF Competición', sub='Poules · Cuadro · Dirección técnica', color='#0E7C7B', letra='C',
         vistas=[('home', 'Inicio'), ('comp', 'Competición'), ('dt', 'Director técnico')],
         titulo='Organiza <span>tu competición</span>',
         texto='Monta las poules, el orden de asaltos, la clasificación y el cuadro de eliminación, y aprende a dirigir una competición de principio a fin.',
         videos=False),
]


def reemplazar(s, viejo, nuevo, veces=1):
    n = s.count(viejo)
    if n != veces:
        raise SystemExit(f'No encuentro el texto esperado ({n} veces): {viejo[:70]!r}')
    return s.replace(viejo, nuevo)


def generar_html(app, src):
    s = src
    vistas = json.dumps([list(v) for v in app['vistas']], ensure_ascii=False)
    # 1) Solo las secciones de esta app en la barra de pestañas
    s = re.sub(r'var VIEWS=\[\[.*?\]\];', 'var VIEWS=' + vistas.replace('\\', '\\\\') + ';', s, count=1, flags=re.S)
    # 2) Si algo intenta abrir una sección de otra app, vuelve al inicio
    s = reemplazar(s, 'function go(v,o){',
                   'function go(v,o){ if(!VIEWS.some(function(x){return x[0]===v;})){ v="home"; o={}; } ')
    # 3) Tras pintar cada pantalla, quita los botones que llevan a secciones de otras apps
    s = reemplazar(s, '[v](o||{}); }',
                   '[v](o||{}); afPodar(); }')
    s = reemplazar(s, 'function bindGo(root){',
                   'function afPodar(){ var ok={}; VIEWS.forEach(function(x){ok[x[0]]=1;}); '
                   'document.querySelectorAll("[data-go]").forEach(function(b){ if(!ok[b.dataset.go]) b.remove(); }); }\n'
                   'function bindGo(root){')
    # 3b) Pantallas añadidas (Mi plan, Físico, Nutrición): se enganchan con window.AF_EXTRA
    s = reemplazar(s, '({home:home,', 'if(window.AF_EXTRA&&window.AF_EXTRA[v]){ window.AF_EXTRA[v](o||{}); afPodar(); return; } ({home:home,')
    s = reemplazar(s, 'function afPodar(){', 'window.AF_go=function(v,o){ go(v,o); };\nfunction afPodar(){')
    if app['id'] == 'entrena':
        s = reemplazar(s, 'tile("learn",', 'tile("plan","Mi plan","Ciclos hasta tu competición, objetivos y aviso diario","#13294B")+'
                       'tile("fisico","Físico","Rutinas con y sin pesas: velocistas, boxeo y karate","#D02B3F")+'
                       'tile("dieta","Nutrición","Tu dieta según objetivo y nivel","#11934A")+tile("learn",')
    # Capa visual e interactiva común + pantallas propias de cada app
    claro, oscuro = app['acento']
    suave = lambda c, a: 'color-mix(in srgb, ' + c + ' ' + str(a) + '%, transparent)'
    colores = (':root{--acc:%s;--acc-ink:#fff;--acc-soft:%s}'
               '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--acc:%s;--acc-ink:#0A101B;--acc-soft:%s}}'
               ':root[data-theme="dark"]{--acc:%s;--acc-ink:#0A101B;--acc-soft:%s}') % (claro, suave(claro, 14), oscuro, suave(oscuro, 22), oscuro, suave(oscuro, 22))
    css = colores + '\n'.join(open(os.path.join(BASE, 'extra', c + '.css'), encoding='utf-8').read() for c in ['ui'] + app.get('css', []))
    cfg = 'window.AF_UI=' + json.dumps({'id': app['id'], 'nombre': app['nombre'], 'intro': app['intro']}, ensure_ascii=False) + ';'
    js = cfg + '\n' + '\n'.join(open(os.path.join(BASE, 'extra', j + '.js'), encoding='utf-8').read() for j in app.get('js', []) + ['ui'])
    s = s.replace('</head>', '<meta name="theme-color" content="' + claro + '">\n<style>\n' + css + '\n</style>\n</head>', 1)
    s = s.replace('</body>', '<script>\n' + js.replace('</script', '<\\/script') + '\n</script>\n</body>', 1)
    if app.get('pie'):
        s = re.sub(r'(<footer class="wrap">).*?(</footer>)', lambda m: m.group(1) + app['pie'] + m.group(2), s, count=1, flags=re.S)
    # 4) Portada, cabecera y título propios
    s = reemplazar(s, '<h1>Entrena, aprende<br>y <span>arbitra</span></h1>', '<h1>' + app['titulo'] + '</h1>')
    s = re.sub(r'<p>Escuelas cubana, estadounidense.*?arbitraje completo\.</p>', '<p>' + app['texto'] + '</p>', s, count=1)
    s = reemplazar(s, '<small>Florete · Espada · Sable</small>', '<small>' + app['sub'] + '</small>')
    s = reemplazar(s, '<title>Amazing Fencing</title>', '<title>' + app['nombre'] + '</title>')
    s = s.replace('<b>Amazing <span>Fencing</span></b>', '<b>' + app['nombre'].replace('AF ', 'AF <span>') + '</span></b>', 1)
    # 5) Botón «atrás» de Android: vuelve al inicio y, desde el inicio, sale de la app
    s = s.replace('</body>', '''<script>
(function(){
  var C = window.Capacitor, App = C && C.Plugins && C.Plugins.App;
  if (!App) return;
  App.addListener('backButton', function(){
    var b = document.querySelector('nav.tabs button[data-v="home"]');
    if (b && b.getAttribute('aria-current') !== 'page') b.click(); else App.exitApp();
  });
})();
</script>
</body>''', 1)
    return s


def icono(app, ruta, tam=1024, fondo=True):
    img = Image.new('RGB', (tam, tam), '#13294B' if fondo else app['color'])
    d = ImageDraw.Draw(img)
    c = tam // 2
    if fondo:
        d.rounded_rectangle([tam * .14, tam * .14, tam * .86, tam * .86], radius=tam * .16, fill=app['color'])
    w = int(tam * .035)
    d.line([tam * .3, tam * .3, tam * .7, tam * .7], fill='white', width=w)
    d.line([tam * .7, tam * .3, tam * .3, tam * .7], fill='white', width=w)
    try:
        f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', int(tam * .22))
    except OSError:
        f = ImageFont.load_default()
    d.ellipse([c - tam * .14, c - tam * .14, c + tam * .14, c + tam * .14], fill='#13294B')
    d.text((c, c), app['letra'], fill='white', font=f, anchor='mm')
    img.save(ruta)


def main():
    src = open(FUENTE, encoding='utf-8').read()
    for app in APPS:
        dest = os.path.join(BASE, 'apps', app['id'])
        shutil.rmtree(dest, ignore_errors=True)
        os.makedirs(os.path.join(dest, 'www'))
        os.makedirs(os.path.join(dest, 'assets'))
        open(os.path.join(dest, 'www', 'index.html'), 'w', encoding='utf-8').write(generar_html(app, src))
        if app['videos']:
            shutil.copytree(os.path.join(BASE, 'fuente', 'videos'), os.path.join(dest, 'www', 'videos'))
        json.dump({'appId': 'es.amazingfencing.' + app['id'], 'appName': app['nombre'], 'webDir': 'www',
                   'android': {'backgroundColor': '#13294B'},
                   'plugins': {'SystemBars': {'insetsHandling': 'css', 'style': 'DEFAULT'},
                               'LocalNotifications': {'iconColor': app['acento'][0]}}},
                  open(os.path.join(dest, 'capacitor.config.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        json.dump({'name': 'amazing-fencing-' + app['id'], 'version': '1.0.0', 'private': True,
                   'dependencies': dict({'@capacitor/android': '^8.4.0', '@capacitor/core': '^8.4.0', '@capacitor/app': '^8.0.0', '@capacitor/haptics': '^8.0.0'},
                                        **({'@capacitor/local-notifications': '^8.0.0'} if app.get('notificaciones') else {})),
                   'devDependencies': {'@capacitor/cli': '^8.4.0', '@capacitor/assets': '^3.0.5'}},
                  open(os.path.join(dest, 'package.json'), 'w', encoding='utf-8'), indent=2)
        for n in ('icon-only.png', 'icon-foreground.png'):
            icono(app, os.path.join(dest, 'assets', n))
        Image.new('RGB', (1024, 1024), '#13294B').save(os.path.join(dest, 'assets', 'icon-background.png'))
        sp = Image.new('RGB', (2732, 2732), '#13294B'); ic = Image.open(os.path.join(dest, 'assets', 'icon-only.png')).resize((700, 700))
        sp.paste(ic, (1016, 1016)); sp.save(os.path.join(dest, 'assets', 'splash.png')); sp.save(os.path.join(dest, 'assets', 'splash-dark.png'))
        print('Generada', app['nombre'])


if __name__ == '__main__':
    main()
