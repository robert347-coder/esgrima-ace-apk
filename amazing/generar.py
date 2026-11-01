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
    dict(id='entrena', nombre='AF Entrena', sub='Técnica · Calentamiento · Juegos', color='#1D4E89', letra='E',
         vistas=[('home', 'Inicio'), ('learn', 'Aprender'), ('warm', 'Calentar'), ('tabata', 'Tabata'), ('games', 'Juegos')],
         titulo='Entrena <span>y</span> aprende',
         texto='Escuelas cubana, estadounidense, italiana, francesa y española; calentamientos, tabatas de piernas y juegos para pasar de Básico a Maestro.',
         videos=True),
    dict(id='arbitro', nombre='AF Árbitro', sub='Marcador · Reglamento FIE', color='#D02B3F', letra='A',
         vistas=[('home', 'Inicio'), ('ref', 'Arbitrar'), ('bank', 'Preguntas')],
         titulo='Arbitra <span>sin dudas</span>',
         texto='Marcador de arbitraje completo con el reglamento FIE 2026-27, órdenes del árbitro y un banco de preguntas para practicar y examinarte.',
         videos=False),
    dict(id='entrenador', nombre='AF Entrenador', sub='Titulaciones · Niveles I, II y III', color='#B8871F', letra='M',
         vistas=[('home', 'Inicio'), ('coach', 'Entrenador')],
         titulo='Fórmate <span>como técnico</span>',
         texto='Temario oficial de los niveles I, II y III, requisitos de cada titulación y simulacros de examen con tiempo.',
         videos=False),
    dict(id='competicion', nombre='AF Competición', sub='Poules · Cuadro · Dirección técnica', color='#0E7C7B', letra='C',
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
                   'android': {'backgroundColor': '#13294B'}},
                  open(os.path.join(dest, 'capacitor.config.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        json.dump({'name': 'amazing-fencing-' + app['id'], 'version': '1.0.0', 'private': True,
                   'dependencies': {'@capacitor/android': '6.1.2', '@capacitor/core': '6.1.2', '@capacitor/app': '6.0.1'},
                   'devDependencies': {'@capacitor/cli': '6.1.2', '@capacitor/assets': '3.0.5'}},
                  open(os.path.join(dest, 'package.json'), 'w', encoding='utf-8'), indent=2)
        for n in ('icon-only.png', 'icon-foreground.png'):
            icono(app, os.path.join(dest, 'assets', n))
        Image.new('RGB', (1024, 1024), '#13294B').save(os.path.join(dest, 'assets', 'icon-background.png'))
        sp = Image.new('RGB', (2732, 2732), '#13294B'); ic = Image.open(os.path.join(dest, 'assets', 'icon-only.png')).resize((700, 700))
        sp.paste(ic, (1016, 1016)); sp.save(os.path.join(dest, 'assets', 'splash.png')); sp.save(os.path.join(dest, 'assets', 'splash-dark.png'))
        print('Generada', app['nombre'])


if __name__ == '__main__':
    main()
