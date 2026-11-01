#!/usr/bin/env python3
"""Сборка релиза из папки с аудио: теги, длительности, обложка, палитра, LRC, release.json.

Запуск:
    tools/.venv/bin/python tools/ingest.py "путь/к/папке" \
        --id vdps-2026 --title "ВДПС" --year 2026 --type single

Что делает:
  • находит аудиофайлы, сортирует по имени;
  • читает теги (title/artist/year) и обложку из файлов;
  • конвертирует всё в MP3 320;
  • делает cover.jpg 1400 и cover-400.jpg;
  • считает палитру (полярность + акцент) и пишет в release.json;
  • подхватывает .lrc с теми же именами и проверяет таймкоды;
  • переименовывает файлы в 01-slug.mp3 / 01-slug.lrc;
  • пишет content/releases/<id>/release.json.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

AUDIO_EXT = {".mp3", ".m4a", ".aac", ".acc", ".wav", ".flac", ".aiff", ".aif", ".ogg"}

TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
    "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "h", "ц": "c", "ч": "ch", "ш": "sh", "щ": "sch", "ъ": "",
    "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
}


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = "".join(TRANSLIT.get(ch, ch) for ch in text)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "track"


def natural_key(path: Path):
    return [int(p) if p.isdigit() else p for p in re.split(r"(\d+)", path.name.lower())]


def ffmpeg_exe() -> str:
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


def ffprobe_duration(path: Path) -> float:
    """Длительность через ffmpeg -i (парсим stderr), если mutagen не справился."""
    proc = subprocess.run([ffmpeg_exe(), "-i", str(path)], capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", proc.stderr)
    if not m:
        return 0.0
    h, mi, s = m.groups()
    return int(h) * 3600 + int(mi) * 60 + float(s)


def read_meta(path: Path):
    """Возвращает (title, artist, album, year, duration, cover_bytes)."""
    title = artist = album = year = ""
    duration = 0.0
    cover = None
    try:
        import mutagen
        f = mutagen.File(path, easy=True)
        if f is not None:
            tags = f.tags or {}
            def g(key):
                v = tags.get(key)
                return str(v[0]) if v else ""
            title, artist, album = g("title"), g("artist"), g("album")
            year = g("date")[:4]
            duration = float(getattr(f.info, "length", 0.0) or 0.0)
            cover = extract_cover(path)
    except Exception as exc:
        print(f"  ! теги не прочитаны: {exc}")
    if not duration:
        duration = ffprobe_duration(path)
    return title, artist, album, year, duration, cover


def extract_cover(path: Path):
    try:
        from mutagen.id3 import ID3
        from mutagen.mp4 import MP4
        from mutagen.flac import FLAC
    except Exception:
        return None

    suffix = path.suffix.lower()
    try:
        if suffix == ".mp3":
            tags = ID3(path)
            for tag in tags.values():
                if tag.FrameID == "APIC":
                    return bytes(tag.data)
        elif suffix in (".m4a", ".aac", ".acc"):
            f = MP4(path)
            covers = f.tags.get("covr") if f.tags else None
            if covers:
                return bytes(covers[0])
        elif suffix == ".flac":
            f = FLAC(path)
            if f.pictures:
                return bytes(f.pictures[0].data)
    except Exception:
        return None
    return None


def to_mp3(src: Path, dst: Path) -> None:
    if src.suffix.lower() == ".mp3":
        shutil.copy2(src, dst)
        return
    cmd = [
        ffmpeg_exe(), "-y", "-i", str(src),
        "-codec:a", "libmp3lame", "-b:a", "320k",
        "-map_metadata", "0", str(dst),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg не смог конвертировать {src.name}: {proc.stderr[-300:]}")


def make_covers(cover_bytes, out_dir: Path, fallback: Path | None) -> Path | None:
    from PIL import Image
    import io

    if cover_bytes:
        img = Image.open(io.BytesIO(cover_bytes)).convert("RGB")
    elif fallback and fallback.exists():
        img = Image.open(fallback).convert("RGB")
    else:
        return None

    side = min(img.size)
    left = (img.width - side) // 2
    top = (img.height - side) // 2
    img = img.crop((left, top, left + side, top + side))

    big = out_dir / "cover.jpg"
    img.resize((1400, 1400), Image.LANCZOS).save(big, quality=90)
    img.resize((400, 400), Image.LANCZOS).save(out_dir / "cover-400.jpg", quality=88)
    return big


def write_tags(path: Path, title: str, artist: str, album: str, year, track_no: int, total: int, cover: Path | None):
    """Прописывает ID3 в готовый mp3: плеер и Telegram покажут название и обложку."""
    try:
        from mutagen.id3 import ID3, TIT2, TPE1, TALB, TDRC, TRCK, APIC, ID3NoHeaderError
    except Exception:
        return
    try:
        tags = ID3(path)
    except ID3NoHeaderError:
        tags = ID3()
    tags.delall("TIT2"); tags.delall("TPE1"); tags.delall("TALB"); tags.delall("TDRC"); tags.delall("TRCK"); tags.delall("APIC")
    tags.add(TIT2(encoding=3, text=title))
    if artist:
        tags.add(TPE1(encoding=3, text=artist))
    if album:
        tags.add(TALB(encoding=3, text=album))
    if year:
        tags.add(TDRC(encoding=3, text=str(year)))
    tags.add(TRCK(encoding=3, text=f"{track_no}/{total}"))
    if cover and cover.exists():
        tags.add(APIC(encoding=3, mime="image/jpeg", type=3, desc="Cover", data=cover.read_bytes()))
    tags.save(path)


def palette_from_cover(cover: Path):
    from PIL import Image
    import colorsys

    img = Image.open(cover).convert("RGB").resize((16, 16), Image.LANCZOS)
    pixels = list(img.getdata())

    def lum(px):
        r, g, b = (v / 255 for v in px)
        return 0.2126 * r + 0.7152 * g + 0.0722 * b

    mean_lum = sum(lum(p) for p in pixels) / len(pixels)
    mode = "paper" if mean_lum >= 0.55 else "dark"

    use, sin_sum, cos_sum, s_sum, l_sum = [], 0.0, 0.0, 0.0, 0.0
    for px in pixels:
        r, g, b = (v / 255 for v in px)
        h, l, s = colorsys.rgb_to_hls(r, g, b)
        if l < 0.10 or l > 0.92 or s < 0.18:
            continue
        use.append(px)
        sin_sum += __import__("math").sin(2 * 3.141592653589793 * h)
        cos_sum += __import__("math").cos(2 * 3.141592653589793 * h)
        s_sum += s
        l_sum += l

    if not use:
        return {"mode": mode, "accent": "#8C5334"}

    import math
    h = (math.atan2(sin_sum, cos_sum) / (2 * math.pi)) % 1.0
    s = min(0.60, max(0.35, s_sum / len(use)))
    l = min(0.55, max(0.38, l_sum / len(use)))
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    accent = "#{:02X}{:02X}{:02X}".format(int(r * 255), int(g * 255), int(b * 255))
    return {"mode": mode, "accent": accent}


def norm_stem(name: str) -> str:
    s = name.lower()
    s = re.sub(r"\.(lrc|mp3|m4a|aac|wav|flac|aiff?|ogg)$", "", s)
    s = re.sub(r"^\d+[\s._-]*", "", s)
    return re.sub(r"[^0-9a-zа-яё]+", "", s)


def find_lrc(folder: Path, stem: str, title: str):
    targets = {norm_stem(stem), norm_stem(title)}
    for path in folder.glob("*.lrc"):
        if norm_stem(path.name) in targets:
            return path
    return None


def check_lrc(path: Path):
    text = path.read_text(encoding="utf-8-sig", errors="replace")
    times = re.findall(r"\[(\d{1,2}):(\d{2})[.:](\d{1,2})\]", text)
    lines = len([ln for ln in text.splitlines() if ln.strip()])
    return lines, len(times)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder", type=Path, help="папка с аудиофайлами")
    ap.add_argument("--id", required=True, help="id релиза, латиницей: vdps-2026")
    ap.add_argument("--title", required=True, help="название релиза")
    ap.add_argument("--year", type=int, default=None)
    ap.add_argument("--date", default=None, help="дата выхода YYYY-MM-DD — по ней сортируется каталог")
    ap.add_argument("--type", default="single", choices=["album", "ep", "single"])
    ap.add_argument("--artist-id", default="kishlak")
    ap.add_argument("--out", type=Path, default=Path("content/releases"))
    ap.add_argument("--cover", type=Path, default=None, help="обложка релиза, если её нет в тегах")
    ap.add_argument("--titles", type=Path, default=None, help="JSON {имя файла без расширения: название}")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    folder: Path = args.folder
    if not folder.is_dir():
        sys.exit(f"нет такой папки: {folder}")

    all_audio = sorted([p for p in folder.iterdir() if p.suffix.lower() in AUDIO_EXT], key=natural_key)
    zero_size = [p for p in all_audio if p.stat().st_size == 0]
    files = [p for p in all_audio if p.stat().st_size > 0]
    title_map = {}
    if args.titles and args.titles.exists():
        title_map = json.loads(args.titles.read_text(encoding="utf-8"))
        print(f"названий из {args.titles.name}: {len(title_map)}")
    if zero_size:
        print("⚠ файлы нулевого размера (пропущены):")
        for z in zero_size:
            print(f"  • {z.name}")
    if not files:
        sys.exit("в папке нет аудиофайлов")

    out_dir = args.out / args.id
    print(f"релиз: {args.title} ({args.id}) → {out_dir}")
    print(f"треков найдено: {len(files)}\n")

    cover_bytes = None
    rows = []
    for idx, src in enumerate(files, start=1):
        title, artist, album, year, duration, cov = read_meta(src)
        if not title:
            title = title_map.get(src.stem) or title_map.get(src.name)
        title = title or re.sub(r"^\d+[\s._-]*", "", src.stem).replace("_", " ").strip()
        if cov and not cover_bytes:
            cover_bytes = cov
        rows.append({
            "idx": idx, "src": src, "title": title, "artist": artist,
            "duration": duration, "slug": slugify(title),
        })
        print(f"  {idx:02d}  {src.name}  →  {title}  [{duration:.1f} c]  «{artist or '—'}»")

    if args.dry_run:
        print("\n--dry-run: файлы не пишутся")
        return

    out_dir.mkdir(parents=True, exist_ok=True)
    tracks_dir = out_dir / "tracks"
    tracks_dir.mkdir(exist_ok=True)
    fallback_cover = args.cover or (folder / "cover.jpg")
    cover_path = make_covers(cover_bytes, out_dir, fallback_cover)
    palette = palette_from_cover(cover_path) if cover_path else {"mode": "paper", "accent": "#8C5334"}
    print(f"\nобложка: {'cover.jpg' if cover_path else 'НЕ НАЙДЕНА'}")
    print(f"палитра: {palette['mode']} / {palette['accent']}")

    rows_for_tags = (rows,)
    tracks = []
    problems = []
    for row in rows:
        num = f"{row['idx']:02d}"
        mp3_name = f"{num}-{row['slug']}.mp3"
        to_mp3(row["src"], tracks_dir / mp3_name)
        write_tags(tracks_dir / mp3_name, row["title"], "Кишлак", args.title, args.year, row["idx"], len(rows), cover_path)

        lrc_src = find_lrc(folder, row["src"].stem, row["title"])
        if lrc_src is None:
            existing = tracks_dir / f"{num}-{row['slug']}.lrc"
            if existing.exists():
                lrc_src = existing
        lrc_rel = None
        if lrc_src:
            lrc_name = f"{num}-{row['slug']}.lrc"
            shutil.copy2(lrc_src, tracks_dir / lrc_name)
            lrc_rel = lrc_name
            lines, stamps = check_lrc(lrc_src)
            if stamps < 2:
                problems.append(f"{row['title']}: в LRC почти нет таймкодов ({stamps})")
        else:
            problems.append(f"{row['title']}: нет .lrc")

        tracks.append({
            "id": f"{args.id}-{num}",
            "title": row["title"],
            "duration": int(round(row["duration"])),
            "audio": f"tracks/{mp3_name}",
            "lrc": f"tracks/{lrc_rel}" if lrc_rel else None,
        })

    release = {
        "id": args.id,
        "title": args.title,
        "artistId": args.artist_id,
        "year": args.year,
        **({"releasedAt": args.date} if args.date else {}),
        "type": args.type,
        "cover": "cover.jpg",
        "coverSmall": "cover-400.jpg",
        "palette": palette,
        "tracks": tracks,
    }
    if release["year"] is None:
        release.pop("year")

    (out_dir / "release.json").write_text(
        json.dumps(release, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(f"\nготово: {out_dir}/release.json")
    if problems:
        print("\nнадо посмотреть руками:")
        for p in problems:
            print(f"  • {p}")


if __name__ == "__main__":
    main()
