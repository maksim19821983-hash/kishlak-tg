"""Аватар канала «Аф» — 512×512, в палитре приложения."""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

PAPER = (237, 231, 220)
INK = (19, 18, 17)
CREAM = (241, 237, 230)
COPPER = (140, 83, 52)
DIM = (150, 142, 132)
DARK = (11, 11, 12)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
A = os.path.join(ROOT, 'design', 'assets')
OUT = os.path.join(ROOT, 'design', 'bot')


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


def centered(d, text, f, fill, cy):
    box = d.textbbox((0, 0), text, font=f)
    w = box[2] - box[0]
    h = box[3] - box[1]
    d.text(((512 - w) / 2 - box[0], cy - h / 2 - box[1]), text, font=f, fill=fill)


def base(bg):
    return Image.new('RGB', (512, 512), bg)


def variant_a():
    img = base(PAPER)
    d = ImageDraw.Draw(img)
    centered(d, 'Аф', fnt('unbounded.ttf', 190, 'Black'), INK, 238)
    d.ellipse([253, 358, 259, 364], fill=COPPER)
    f = fnt('jbmono-medium.ttf', 15)
    w = tw(d, '11:11', f, 4)
    tracked(d, ((512 - w) / 2, 384), '11:11', f, (120, 112, 102), 4)
    return grain(img)


def variant_b():
    img = base(PAPER)
    d = ImageDraw.Draw(img)
    d.ellipse([48, 48, 464, 464], outline=(160, 151, 140), width=2)
    centered(d, 'Аф', fnt('unbounded.ttf', 158, 'Black'), INK, 244)
    f = fnt('jbmono-medium.ttf', 14)
    w = tw(d, '11:11', f, 5)
    tracked(d, ((512 - w) / 2, 372), '11:11', f, (120, 112, 102), 5)
    return grain(img)


def variant_c():
    img = base(DARK)
    d = ImageDraw.Draw(img)
    centered(d, 'Аф', fnt('unbounded.ttf', 190, 'Black'), CREAM, 238)
    d.ellipse([253, 358, 259, 364], fill=COPPER)
    f = fnt('jbmono-medium.ttf', 15)
    w = tw(d, '11:11', f, 4)
    tracked(d, ((512 - w) / 2, 384), '11:11', f, (150, 142, 132), 4)
    return grain(img)


if __name__ == '__main__':
    for name, img in [('channel-a', variant_a()), ('channel-b', variant_b()), ('channel-c', variant_c())]:
        img.save(os.path.join(OUT, f'{name}.png'))
        img.save(os.path.join(OUT, f'{name}.jpg'), quality=94)
        img.resize((64, 64), Image.LANCZOS).save(os.path.join(OUT, f'{name}-64.png'))
    print('ok')
