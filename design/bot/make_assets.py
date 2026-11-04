"""Ассеты карточки бота «Кишлак — плеер».

Аватар 512, обложка мини-приложения 640×360, карточка приветствия 1080×1350.
Всё в палитре приложения: бумага, чернила, медь.

Запуск: python3 design/bot/make_assets.py
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

PAPER = (237, 231, 220)
INK = (19, 18, 17)
CREAM = (241, 237, 230)
BODY = (24, 22, 21)
LABEL = (235, 228, 216)
COPPER = (140, 83, 52)
DIM = (150, 142, 132)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
A = os.path.join(ROOT, 'design', 'assets')
OUT = os.path.join(ROOT, 'design', 'bot')
os.makedirs(OUT, exist_ok=True)


def fnt(name, size, variation=None):
    f = ImageFont.truetype(os.path.join(A, name), size)
    if variation:
        f.set_variation_by_name(variation)
    return f


def tracked(d, xy, text, f, fill, tr=0):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=f, fill=fill)
        x += d.textlength(ch, font=f) + tr


def tw(d, text, f, tr=0):
    return sum(d.textlength(c, font=f) for c in text) + tr * max(0, len(text) - 1)


def grain(img, amount=8, alpha=.045):
    w, h = img.size
    n = Image.effect_noise((w, h), amount).convert('L').filter(ImageFilter.GaussianBlur(.6))
    return Image.blend(img, Image.merge('RGB', (n, n, n)), alpha)


def k_square(side=900):
    """Квадрат постера вокруг знака K."""
    im = Image.open(os.path.join(A, 'poster.jpg')).convert('RGB')
    a = np.array(im.convert('L'))
    ys, xs = np.where(a > 150)
    cx, cy = (xs.min() + xs.max()) // 2, (ys.min() + ys.max()) // 2
    x0, y0 = cx - side // 2, cy - side // 2
    return im.crop((x0, y0, x0 + side, y0 + side))


def shadowed(layer, blur=26, dx=0, dy=14, alpha=.42, angle=0):
    canvas = Image.new('RGBA', layer.size, (0, 0, 0, 0))
    alpha_ch = layer.split()[3].filter(ImageFilter.GaussianBlur(blur))
    shadow = Image.new('RGBA', layer.size, (54, 37, 26, 0))
    shadow.putalpha(alpha_ch.point(lambda v: int(v * alpha)))
    if angle:
        layer = layer.rotate(angle, resample=Image.BICUBIC, expand=False)
        shadow = shadow.rotate(angle, resample=Image.BICUBIC, expand=False)
    canvas.alpha_composite(shadow, (int(dx), int(dy)))
    canvas.alpha_composite(layer)
    return canvas


def cassette_layer(w=560):
    """Кассета в стиле приложения на прозрачном фоне."""
    s = w / 420
    h = 248 * s
    W, H = int(w + 40 * s), int(h + 40 * s)
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0, y0 = 20 * s, 20 * s
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=16 * s, fill=BODY)
    for dx, dy in [(.035, .06), (.965, .06), (.035, .94), (.965, .94)]:
        px, py = x0 + w * dx, y0 + h * dy
        d.ellipse([px - 3.5 * s, py - 3.5 * s, px + 3.5 * s, py + 3.5 * s], fill=(78, 73, 68))

    lx, ly = x0 + 24 * s, y0 + 20 * s
    lw, lh = w - 48 * s, 100 * s
    d.rounded_rectangle([lx, ly, lx + lw, ly + lh], radius=5 * s, fill=LABEL)
    f = fnt('jbmono-medium.ttf', int(26 * s))
    tracked(d, (lx + 18 * s, ly + 14 * s), 'КИШЛАК', f, INK, 6 * s)
    f2 = fnt('jbmono-regular.ttf', int(15 * s))
    r = '11:11'
    tracked(d, (lx + lw - 18 * s - tw(d, r, f2, 2 * s), ly + 12 * s), r, f2, (95, 88, 80), 2 * s)
    f3 = fnt('jbmono-medium.ttf', int(12 * s))
    tracked(d, (lx + 18 * s, ly + 60 * s), 'ПЛЕЕР · АПФС · С-60', f3, (128, 119, 109), 3 * s)

    wx, wy = x0 + 24 * s, y0 + 138 * s
    ww, wh = w - 48 * s, 74 * s
    d.rounded_rectangle([wx, wy, wx + ww, wy + wh], radius=5 * s, fill=(11, 11, 12))
    for fx in (.27, .73):
        ccx, ccy = wx + ww * fx, wy + wh / 2
        rr = 30 * s
        d.ellipse([ccx - rr, ccy - rr, ccx + rr, ccy + rr], outline=COPPER, width=max(2, int(3 * s)))
        d.ellipse([ccx - 14 * s, ccy - 14 * s, ccx + 14 * s, ccy + 14 * s], fill=LABEL)
        d.ellipse([ccx - 5 * s, ccy - 5 * s, ccx + 5 * s, ccy + 5 * s], fill=BODY)
    d.line([wx + ww * .27, wy + wh / 2, wx + ww * .73, wy + wh / 2], fill=COPPER, width=max(2, int(2 * s)))

    f4 = fnt('jbmono-regular.ttf', int(12 * s))
    tracked(d, (x0 + 26 * s, y0 + h - 26 * s), 'С-60', f4, DIM, 2 * s)
    r = 'СТОРОНА А'
    tracked(d, (x0 + w - 26 * s - tw(d, r, f4, 2 * s), y0 + h - 26 * s), r, f4, DIM, 2 * s)
    return shadowed(layer, blur=12 * s, dy=10 * s, alpha=.4)


def paste_center(canvas, layer, cx, cy, angle=0, shadow_alpha=.4):
    layer = shadowed(layer, blur=24, dy=12, alpha=shadow_alpha, angle=angle)
    canvas.alpha_composite(layer, (int(cx - layer.width / 2), int(cy - layer.height / 2)))


def avatar(size=512):
    """Аватар из рисунка 11:11: чёрное поле, знак по центру."""
    src = Image.open(os.path.join(OUT, 'avatar-source-1111.jpg')).convert('RGB')
    a = np.array(src).astype(int)
    ys, xs = np.where(a.max(axis=2) > 40)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    # знак занимает ~78% ширины: в круге остаётся воздух по краям
    side = int(max(x1 - x0, y1 - y0) / .78)
    sq = src.crop((int(cx - side / 2), int(cy - side / 2), int(cx + side / 2), int(cy + side / 2)))
    # чистый чёрный запрещён системой — сдвигаем поле в #0B0B0C
    arr = np.array(sq)
    dark = arr.max(axis=2) < 12
    arr[dark] = (11, 11, 12)
    img = Image.fromarray(arr).resize((size, size), Image.LANCZOS)
    img.save(f'{OUT}/avatar-512.png')
    img.save(f'{OUT}/avatar-512.jpg', quality=94)
    img.resize((128, 128), Image.LANCZOS).save(f'{OUT}/avatar-128.png')
    img.resize((64, 64), Image.LANCZOS).save(f'{OUT}/avatar-64.png')
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
    prev = Image.new('RGB', (size, size), PAPER)
    prev.paste(img, (0, 0), mask)
    prev.save(f'{OUT}/avatar-circle-preview.png')


def app_card():
    W, H = 640, 360
    img = Image.new('RGBA', (W, H), PAPER)
    d = ImageDraw.Draw(img)

    f = fnt('unbounded.ttf', 42, 'Black')
    d.text((36, 74), 'КИШЛАК', font=f, fill=INK)
    fm = fnt('jbmono-medium.ttf', 14)
    tracked(d, (38, 140), 'ПЛЕЕР-КАССЕТА', fm, (90, 84, 78), 3.2)
    d.line([38, 178, 286, 178], fill=(19, 18, 17, 70), width=1)
    fl = fnt('jbmono-regular.ttf', 12)
    tracked(d, (38, 300), '31 КАССЕТА · 116 ПЕСЕН', fl, (120, 112, 102), 2.6)

    sleeve = Image.new('RGBA', (260, 260), (0, 0, 0, 0))
    sleeve.paste(k_square(900).resize((260, 260), Image.LANCZOS), (0, 0))
    paste_center(img, sleeve, 470, 150, angle=-5, shadow_alpha=.45)
    cass = cassette_layer(280)
    paste_center(img, cass, 500, 238, angle=5, shadow_alpha=.4)

    grain(img.convert('RGB'), 8, .04).save(f'{OUT}/app-card-640x360.png')


def welcome():
    W, H = 1080, 1350
    img = Image.new('RGBA', (W, H), PAPER)
    d = ImageDraw.Draw(img)
    m = 84
    f = fnt('jbmono-medium.ttf', 22)
    tracked(d, (m, 86), 'КИШЛАК · АПФС', f, (110, 103, 94), 6)
    r = '11:11'
    tracked(d, (W - m - tw(d, r, f, 4), 86), r, f, (110, 103, 94), 4)

    ft = fnt('unbounded.ttf', 112, 'Black')
    d.text((m - 6, 150), 'КИШЛАК', font=ft, fill=INK)
    fs = fnt('jbmono-medium.ttf', 22)
    tracked(d, (m, 300), 'ПЛЕЕР-КАССЕТА · 31 КАССЕТА · 116 ПЕСЕН', fs, (110, 103, 94), 3.5)

    # конверт и кассета
    sleeve = Image.new('RGBA', (640, 640), (0, 0, 0, 0))
    sleeve.paste(k_square(900).resize((640, 640), Image.LANCZOS), (0, 0))
    paste_center(img, sleeve, 520, 700, angle=-4, shadow_alpha=.5)
    cass = cassette_layer(620)
    paste_center(img, cass, 600, 985, angle=5, shadow_alpha=.45)

    d.line([m, 1190, W - m, 1190], fill=(19, 18, 17, 60), width=1)
    fw = fnt('unbounded.ttf', 30, 'SemiBold')
    d.text((m, 1218), 'ВЕСЬ АРХИВ', font=fw, fill=INK)
    fe = fnt('jbmono-regular.ttf', 18)
    tracked(d, (m, 1268), 'НАЖМИ «ОТКРЫТЬ ПЛЕЕР» — И СЛУШАЙ', fe, (120, 112, 102), 3)
    grain(img.convert('RGB'), 9, .05).save(f'{OUT}/welcome-1080x1350.jpg', quality=92)


if __name__ == '__main__':
    avatar()
    app_card()
    welcome()
    print('ok:', sorted(os.listdir(OUT)))
