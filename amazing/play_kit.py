"""Genera el material gráfico de Google Play para las 5 apps:
icono 512x512 (32 bits) y gráfico destacado 1024x500. Ejecutar:
    python3 play_kit.py   (tras tener las capturas en play/<app>/)"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
BASE = os.path.dirname(os.path.abspath(__file__))
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FC = '/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf'
APPS = {
    'entrena': ('ENTRENA', 'Plan, físico y nutrición para esgrimistas', '#1D4E89', 'E'),
    'arbitro': ('ÁRBITRO', 'Marcador y reglamento FIE 2026-27', '#C62839', 'A'),
    'entrenador': ('ENTRENADOR', 'Prepara tu titulación de técnico', '#8F6512', 'M'),
    'competicion': ('COMPETICIÓN', 'Poules, cuadro y dirección técnica', '#0B6E6D', 'C'),
    'peso': ('PESO', 'Dieta con tus alimentos y control de peso', '#6E3591', 'P'),
}
def hexrgb(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
def mezcla(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
def degradado(w, h, c1, c2):
    im = Image.new('RGB', (w, h)); d = ImageDraw.Draw(im)
    for x in range(w): d.line([(x, 0), (x, h)], fill=mezcla(c1, c2, x / w))
    return im
def espadas(d, cx, cy, r, w, col='white'):
    d.line([cx - r, cy - r, cx + r, cy + r], fill=col, width=w); d.line([cx + r, cy - r, cx - r, cy + r], fill=col, width=w)
    for sx in (-1, 1): d.line([cx + sx * r * .55, cy + r * .9, cx + sx * r * 1.0, cy + r * .5], fill=col, width=int(w * 1.4))
def icono(app, acc):
    t = 1024; im = degradado(t, t, mezcla(acc, (15, 31, 58), .15), mezcla(acc, (0, 0, 0), .35)).convert('RGBA')
    d = ImageDraw.Draw(im); espadas(d, t / 2, t / 2 - 20, 250, 44)
    d.ellipse([t / 2 - 150, t / 2 - 170, t / 2 + 150, t / 2 + 130], fill=(15, 31, 58, 255), outline=(255, 255, 255, 255), width=14)
    d.text((t / 2, t / 2 - 20), APPS[app][3], fill='white', font=ImageFont.truetype(F, 190), anchor='mm')
    im.resize((512, 512), Image.LANCZOS).save(os.path.join(BASE, 'play', app, 'icono-512.png'))
def destacado(app, acc):
    W, H = 1024, 500; im = degradado(W, H, (15, 31, 58), mezcla(acc, (15, 31, 58), .1)); d = ImageDraw.Draw(im)
    espadas(d, 830, 250, 330, 10, col=mezcla(acc, (255, 255, 255), .25))
    d.text((60, 120), 'AMAZING FENCING', fill=mezcla(acc, (255, 255, 255), .6), font=ImageFont.truetype(F, 30))
    nombre, lema = APPS[app][0], APPS[app][1]
    tam = 104 if len(nombre) <= 8 else 84
    d.text((56, 160), nombre, fill='white', font=ImageFont.truetype(FC, tam))
    fl = ImageFont.truetype(F, 30); palabras = lema.split(); linea = ''; y = 160 + tam + 30
    for p in palabras:
        if d.textlength(linea + ' ' + p, font=fl) > 560: d.text((60, y), linea.strip(), fill=(230, 236, 245), font=fl); y += 42; linea = ''
        linea += ' ' + p
    d.text((60, y), linea.strip(), fill=(230, 236, 245), font=fl)
    cap = os.path.join(BASE, 'play', app, 'captura-1.png')
    if os.path.exists(cap):  # móvil inclinado con la primera captura
        s = Image.open(cap).convert('RGB').resize((230, 409)); marco = Image.new('RGBA', (250, 429), (12, 18, 30, 255))
        m = Image.new('L', (250, 429), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, 249, 428], 28, fill=255)
        marco.paste(s, (10, 10)); marco.putalpha(m); marco = marco.rotate(-8, expand=True, resample=Image.BICUBIC)
        sombra = Image.new('RGBA', marco.size, (0, 0, 0, 0)); sombra.putalpha(marco.split()[3].point(lambda a: a * .45)); sombra = sombra.filter(ImageFilter.GaussianBlur(14))
        im.paste((0, 0, 0), (700, 90), sombra); im.paste(marco, (680, 60), marco)
    im.save(os.path.join(BASE, 'play', app, 'grafico-destacado-1024x500.png'))
for app, (_, _, col, _) in APPS.items():
    os.makedirs(os.path.join(BASE, 'play', app), exist_ok=True)
    icono(app, hexrgb(col)); destacado(app, hexrgb(col)); print('Material de', app)
