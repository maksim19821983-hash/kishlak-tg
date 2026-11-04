"""Ассеты для карточки бота: аватар 512, обложка мини-приложения 640x360, карточка приветствия 1080x1350.
Запуск: python3 design/bot/make.py
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

PAPER = (237, 231, 220)
INK = (19, 18, 17)
BODY = (24, 22, 21)
LABEL = (235, 228, 216)
COPPER = (140, 83, 52)
DIM = (150, 142, 132)

U = 'design/assets/unbounded.ttf'
M = 'design/assets/jbmono-regular.ttf'
MB = 'design/assets/jbmono-medium.ttf'
OUT = 'design/bot'


def fnt(path, size, variation=None):
    f = ImageFont.truetype(path, size)
    if variation:
        f.set_variation_by_name(variation)
    return f


def tracked(d, xy, text, f, fill, tracking=0):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=f, fill=fill)
        x += d.textlength(ch, font=f) + tracking


def tw(d, text, f, tracking=0):
    return sum(d.textlength(c, font=f) for c in text) + tracking * max(0, len(text) - 1)


def grain(img, amount=9):
    w, h = img.size
    n = Image.effect_noise((w, h), amount).convert('L').filter(ImageFilter.GaussianBlur(.5))
    return Image.blend(img, Image.merge('RGB', (n, n, n)), .05)


def cassette(d, cx, cy, s=1.0, big=False):
    """Кассета в стиле приложения: тёмный корпус, бумажная наклейка, окно с катушками."""
    w, h = 420 * s, 248 * s
    x0, y0 = cx - w / 2, cy - h / 2
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=16 * s, fill=BODY)
    # винты
    for dx, dy in [(0.035, 0.06), (0.965, 0.06), (0.035, 0.94), (0.965, 0.94)]:
        px, py = x0 + w * dx, y0 + h * dy
        d.ellipse([px - 3.5 * s, py - 3.5 * s, px + 3.5 * s, py + 3.5 * s], fill=(78, 73, 68))

    lx, ly = x0 + 24 * s, y0 + 20 * s
    lw, lh = w - 48 * s, 100 * s
    d.rounded_rectangle([lx, ly, lx + lw, ly + lh], radius=5 * s, fill=LABEL)
    f = fnt(MB, int(26 * s))
    tracked(d, (lx + 18 * s, ly + 14 * s), 'КИШЛАК', f, INK, 6 * s)
    f2 = fnt(M, int(15 * s))
    r = '11:11'
    tracked(d, (lx + lw - 18 * s - tw(d, r, f2, 2 * s), ly + 12 * s), r, f2, (95, 88, 80), 2 * s)
    f3 = fnt(MB, int(12 * s))
    tracked(d, (lx + 18 * s, ly + 60 * s), 'ПЛЕЕР · АПФС · С-60', f3, (128, 119, 109), 3 * s)

    wx, wy = x0 + 24 * s, y0 + 138 * s
    ww, wh = w - 48 * s, 74 * s
    d.rounded_rectangle([wx, wy, wx + ww, wy + wh], radius=5 * s, fill=(11, 11, 12))
    for fx in (0.27, 0.73):
        ccx, ccy = wx + ww * fx, wy + wh / 2
        rr = 30 * s
        d.ellipse([ccx - rr, ccy - rr, ccx + rr, ccy + rr], outline=COPPER, width=max(2, int(3 * s)))
        d.ellipse([ccx - 14 * s, ccy - 14 * s, ccx + 14 * s, ccy + 14 * s], fill=LABEL)
        d.ellipse([ccx - 5 * s, ccy - 5 * s, ccx + 5 * s, ccy + 5 * s], fill=BODY)
    d.line([wx + ww * 0.27, wy + wh / 2, wx + ww * 0.73, wy + wh / 2], fill=COPPER, width=max(2, int(2 * s)))

    f4 = fnt(M, int(12 * s))
    tracked(d, (x0 + 26 * s, y0 + h - 26 * s), 'С-60', f4, DIM, 2 * s)
    r = 'СТОРОНА А'
    tracked(d, (x0 + w - 26 * s - tw(d, r, f4, 2 * s), y0 + h - 26 * s), r, f4, DIM, 2 * s)


def with_shadow(canvas, draw_fn, angle=0, shadow=26):
    """Рисует объект на прозрачном слое, добавляет тень и поворачивает."""
    pad = 80
    layer = Image.new('RGBA', (canvas.width + pad * 2, canvas.height + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    draw_fn(d, pad, pad)
    sh = layer.split()[3].filter(ImageFilter.GaussianBlur(shadow))
    shadow_img = Image.new('RGBA', layer.size, (0, 0, 0, 0))
    shadow_img.putalpha(sh.point(lambda v: int(v * .38)))
    shadow_img = Image.composite(Image.new('RGBA', layer.size, (60, 40, 25, 255)), Image.new('RGBA', layer.size, (0, 0, 0, 0)), sh)
    if angle:
        layer = layer.rotate(angle, resample=Image.BICUBIC, expand=False)
        shadow_img = shadow_img.rotate(angle, resample=Image.BICUBIC, expand=False)
    out = Image.new('RGBA', layer.size, (0, 0, 0, 0))
    out.alpha_composite(shadow_img, (0, 10))
    out.alpha_composite(layer)
    return out.crop((pad, pad, pad + canvas.width, pad + canvas.height))


def avatar(size=512):
    base = Image.new('RGB', (size, size), PAPER)
    s = size / 512
    obj = with_shadow(base, lambda d, ox, oy: cassette(d, ox + size / 2, oy + size / 2 + 4, 1.02 * s), angle=-3, shadow=10 * s)
    img = base.convert('RGBA')
    img.alpha_composite(obj)
    img = grain(img.convert('RGB'))
    # предпросмотр круга
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
    circle = Image.new('RGB', (size, size), PAPER)
    circle.paste(img, (0, 0), mask)
    circle.save(f'{OUT}/avatar-circle-preview.png')
    return img


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    a = avatar()
    a.save(f'{OUT}/avatar-512.png')
    a.resize((128, 128), Image.LANCZOS).save(f'{OUT}/avatar-128.png')
    a.resize((64, 64), Image.LANCZOS).save(f'{OUT}/avatar-64.png')
    print('avatar ok')
