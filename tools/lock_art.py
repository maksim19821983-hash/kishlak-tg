"""Постеры для локскрина: обложка релиза + альбом и год.

Название трека и подписи сверху нет: обложки у Кишлака часто сами содержат
рукописный текст, и любая наша строка поверх начинает с ней спорить.
Размер 1080×1080, поля не меньше 80 px: iOS скругляет края картинки.
"""

from __future__ import annotations

import random
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageEnhance, ImageFont
except ImportError:  # Pillow нужен только для генерации постеров
    Image = None

SIZE = 1080
FONT_MONO = "design/assets/jbmono-regular.ttf"
ACCENT = (180, 127, 100)
CREAM = (240, 236, 228)


def _grain(img, amount: int = 5) -> None:
    px = img.load()
    for _ in range(int(SIZE * SIZE * 0.012)):
        x, y = random.randrange(SIZE), random.randrange(SIZE)
        r, g, b = px[x, y][:3]
        d = random.randint(-amount, amount)
        px[x, y] = (
            max(0, min(255, r + d)),
            max(0, min(255, g + d)),
            max(0, min(255, b + d)),
        )


def make_poster(cover_path: Path, album: str, year: int | str, out_path: Path) -> bool:
    if Image is None or not cover_path.exists():
        return False

    img = Image.open(cover_path).convert("RGB").resize((SIZE, SIZE), Image.LANCZOS)
    img = ImageEnhance.Color(img).enhance(0.72)

    scrim = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(scrim)
    for y in range(SIZE):
        bottom = int(255 * (max(0.0, y - SIZE * 0.45) / (SIZE * 0.55)) ** 1.5)
        draw.line([(0, y), (SIZE, y)], fill=(6, 6, 6, bottom))

    img = Image.alpha_composite(img.convert("RGBA"), scrim).convert("RGB")
    draw = ImageDraw.Draw(img)

    font_path = Path(FONT_MONO)
    if not font_path.exists():
        return False

    sub = f"{album.upper()} · {year}"
    size = 40
    font = ImageFont.truetype(str(font_path), size)
    while draw.textlength(sub, font=font) > SIZE - 200 and size > 22:
        size -= 2
        font = ImageFont.truetype(str(font_path), size)
    draw.text((80, SIZE - 190), sub, font=font, fill=CREAM)

    draw.rectangle([80, SIZE - 120, 300, SIZE - 112], fill=ACCENT)

    _grain(img)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, quality=90)
    return True


def generate_all(manifest: dict, content_dir: Path, public_dir: Path) -> int:
    """Генерирует постеры для всех треков. Возвращает число созданных файлов."""
    if Image is None:
        print("постеры: Pillow не установлен — пропускаю")
        return 0

    created = 0
    covers = public_dir / "covers"
    out_dir = public_dir / "lockart"

    for release in manifest.get("releases", []):
        cover = covers / f"{release['id']}.jpg"
        if not cover.exists():
            legacy = content_dir / release["id"] / "cover.jpg"
            cover = legacy if legacy.exists() else cover
        for track in release.get("tracks", []):
            out = out_dir / f"{track['id']}.jpg"
            if make_poster(cover, release["title"], release.get("year", ""), out):
                track["lockArt"] = f"/content/lockart/{track['id']}.jpg"
                created += 1
    return created
