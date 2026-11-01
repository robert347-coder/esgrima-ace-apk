"""Descarga las tipografías de Google Fonts dentro de la app para que
funcione sin conexión y no se conecte a terceros (útil para el formulario
de «Seguridad de los datos» de Google Play). Se ejecuta en GitHub Actions:
    python3 fuentes_locales.py apps/<app>/www
"""
import os, re, sys, urllib.request

www = sys.argv[1]
idx = os.path.join(www, 'index.html')
s = open(idx, encoding='utf-8').read()
m = re.search(r'<link[^>]+href="(https://fonts\.googleapis\.com/css2[^"]+)"[^>]*>', s)
if not m:
    print('Sin Google Fonts'); sys.exit(0)
url = m.group(1).replace('&amp;', '&')
ua = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36'
css = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': ua})).read().decode()
os.makedirs(os.path.join(www, 'fonts'), exist_ok=True)
def bajar(mm):
    u = mm.group(1); nombre = re.sub(r'[^\w.-]', '_', u.split('/')[-1])
    open(os.path.join(www, 'fonts', nombre), 'wb').write(urllib.request.urlopen(u).read())
    return 'url(fonts/' + nombre + ')'
css = re.sub(r'url\((https://fonts\.gstatic\.com/[^)]+)\)', bajar, css)
s = s.replace(m.group(0), '<style>\n' + css + '\n</style>')
s = re.sub(r'<link[^>]+rel="preconnect"[^>]*>\s*', '', s)
open(idx, 'w', encoding='utf-8').write(s)
print('Fuentes locales:', len(os.listdir(os.path.join(www, 'fonts'))), 'archivos')
