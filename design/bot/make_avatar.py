from PIL import Image, ImageDraw, ImageFont, ImageFilter
import random, math

PAPER = (237, 231, 220)
INK = (19, 18, 17)
BODY = (26, 24, 23)
LABEL = (233, 226, 214)
COPPER = (140, 83, 52)
DIM = (140, 133, 124)

U = 'design/assets/unbounded.ttf'
M = 'design/assets/jbmono-regular.ttf'
MB = 'design/assets/jbmono-medium.ttf'


def font(path, size, variation=None):
    f = ImageFont.truetype(path, size)
    if variation:
        f.set_variation_by_name(variation)
    return f


def tracked(draw, xy, text, f, fill, tracking=0, anchor_left=True):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=f, fill=fill)
        x += draw.textlength(ch, font=f) + tracking
    return x


def width_tracked(draw, text, f, tracking=0):
    return sum(draw.textlength(c, font=f) for c in text) + tracking * max(0, len(text) - 1)


def grain(img, amount=10):
    w, h = img.size
    noise = Image.effect_noise((w, h), amount).convert('L')
    noise = noise.filter(ImageFilter.GaussianBlur(0.4))
    img = Image.blend(img, Image.merge('RGB', (noise, noise, noise)), 0.045)
    return img


def cassette(draw, cx, cy, scale=1.0):
    w, h = 360 * scale, 212 * scale
    x0, y0 = cx - w / 2, cy - h / 2
    r = 14 * scale
    # body
    draw.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=r, fill=BODY)
    # screws
    for dx, dy in [(0.03, 0.04), (0.97, 0.04), (0.03, 0.96), (0.97, 0.96)]:
        px, py = x0 + w * dx, y0 + h * dy
        draw.ellipse([px - 3 * scale, py - 3 * scale, px + 3 * scale, py + 3 * scale], fill=(70, 66, 62))
    # label
    lx0, ly0 = x0 + 20 * scale, y0 + 16 * scale
    lw, lh = w - 40 * scale, 84 * scale
    draw.rounded_rectangle([lx0, ly0, lx0 + lw, ly0 + lh], radius=4 * scale, fill=LABEL)
    f = font(MB, int(21 * scale))
    tracked(draw, (lx0 + 16 * scale, ly0 + 13 * scale), 'КИШЛАК', f, INK, 5 * scale)
    f2 = font(M, int(13 * scale))
    right = '11:11'
    rw = width_tracked(draw, right, f2, 2 * scale)
    tracked(draw, (lx0 + lw - 16 * scale - rw, ly0 + 11 * scale), right, f2, (90, 84, 78), 2 * scale)
    f3 = font(MB, int(11 * scale))
    tracked(draw, (lx0 + 16 * scale, ly0 + 52 * scale), 'ПЛЕЕР', f3, (120, 112, 104), 3 * scale)
    # window
    wx0, wy0 = x0 + 20 * scale, y0 + 116 * scale
    ww, wh = w - 40 * scale, 62 * scale
    draw.rounded_rectangle([wx0, wy0, wx0 + ww, wy0 + wh], radius=4 * scale, fill=(11, 11, 12))
    # reels
    for fx, rr in [(0.28, 26), (0.72, 26)]:
        ccx, ccy = wx0 + ww * fx, wy0 + wh / 2
        draw.ellipse([ccx - rr * scale, ccy - rr * scale, ccx + rr * scale, ccy + rr * scale], outline=COPPER, width=int(2.5 * scale))
        draw.ellipse([ccx - 12 * scale, ccy - 12 * scale, ccx + 12 * scale, ccy + 12 * scale], fill=LABEL)
        draw.ellipse([ccx - 4 * scale, ccy - 4 * scale, ccx + 4 * scale, ccy + 4 * scale], fill=BODY)
    # tape
    draw.line([wx0 + ww * 0.28, wy0 + wh / 2, wx0 + ww * 0.72, wy0 + wh / 2], fill=COPPER, width=int(2 * scale))
    # bottom captions
    f4 = font(M, int(11 * scale))
    tracked(draw, (x0 + 22 * scale, y0 + h - 24 * scale), 'С-60', f4, (150, 143, 134), 2 * scale)
    right = 'СТОРОНА А'
    rw = width_tracked(draw, right, f4, 2 * scale)
    tracked(draw, (x0 + w - 22 * scale - rw, y0 + h - 24 * scale), right, f4, (150, 143, 134), 2 * scale)


def avatar(size=512):
    img = Image.new('RGB', (size, size), PAPER)
    d = ImageDraw.Draw(img)
    cassette(d, size / 2, size / 2 + 6, size / 512)
    img = grain(img)
    return img


if __name__ == '__main__':
    a = avatar()
    a.save('design/bot/avatar-512.png')
    a.resize((128, 128), Image.LANCZOS).save('design/bot/avatar-128.png')
    print('ok')
