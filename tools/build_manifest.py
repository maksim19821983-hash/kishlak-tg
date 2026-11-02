#!/usr/bin/env python3
"""Собирает манифест каталога для приложения из content/releases/*/release.json.

Что делает:
  • читает все релизы в content/releases/;
  • копирует обложки, аудио и LRC в public/content/ (туда смотрит приложение);
  • пишет public/content/manifest.json — единственный файл, который читает клиент.

Запуск:
    tools/.venv/bin/python tools/build_manifest.py
    tools/.venv/bin/python tools/build_manifest.py --watch   # для разработки (пересборка по изменению)
"""

from __future__ import annotations

import argparse
import json
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content" / "releases"
PUBLIC = ROOT / "public" / "content"
ARTIST = {
    "id": "kishlak",
    "name": "Кишлак",
    "aliases": ["АПФС"],
}


def copy(src: Path, dst: Path) -> str:
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    return "/" + str(dst.relative_to(ROOT / "public")).replace("\\", "/")


def build() -> dict:
    releases = []
    for release_file in sorted(CONTENT.glob("*/release.json")):
        src_dir = release_file.parent
        data = json.loads(release_file.read_text(encoding="utf-8"))
        rid = data["id"]

        cover = src_dir / data.get("cover", "cover.jpg")
        cover_small = src_dir / data.get("coverSmall", "cover-400.jpg")
        out = {
            "id": rid,
            "title": data["title"],
            "artistId": data.get("artistId", ARTIST["id"]),
            "year": data.get("year"),
            **({"releasedAt": data["releasedAt"]} if data.get("releasedAt") else {}),
            "type": data.get("type", "single"),
            "palette": data.get("palette", {"mode": "paper", "accent": "#8C5334"}),
            "cover": copy(cover, PUBLIC / "covers" / f"{rid}.jpg") if cover.exists() else None,
            "coverSmall": copy(cover_small, PUBLIC / "covers" / f"{rid}-400.jpg") if cover_small.exists() else None,
            "tracks": [],
        }

        for track in data.get("tracks", []):
            t_out = {
                "id": track["id"],
                "title": track["title"],
                **({"cover": f"/content/covers/{rid}.jpg"} if cover.exists() else {}),
                "duration": track.get("duration", 0),
                "releaseId": rid,
                "artistId": out["artistId"],
            }
            audio_src = src_dir / track.get("audio", "")
            if audio_src.exists():
                t_out["audio"] = copy(audio_src, PUBLIC / "audio" / rid / audio_src.name)
            lrc = track.get("lrc")
            if lrc:
                lrc_src = src_dir / lrc
                if lrc_src.exists():
                    t_out["lrc"] = copy(lrc_src, PUBLIC / "lrc" / rid / lrc_src.name)
            out["tracks"].append(t_out)

        releases.append(out)

    manifest = {
        "artist": ARTIST,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "releases": releases,
        "stats": {
            "releases": len(releases),
            "tracks": sum(len(r["tracks"]) for r in releases),
            "withLyrics": sum(1 for r in releases for t in r["tracks"] if t.get("lrc")),
        },
    }
    PUBLIC.mkdir(parents=True, exist_ok=True)
    (PUBLIC / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return manifest


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--watch", action="store_true", help="пересобирать при изменении content/")
    args = ap.parse_args()

    m = build()
    print(
        f"манифест: релизов {m['stats']['releases']}, "
        f"треков {m['stats']['tracks']}, с текстом {m['stats']['withLyrics']}"
    )
    for r in m["releases"]:
        marks = "".join("+" if t.get("lrc") else "·" for t in r["tracks"])
        print(f"  {r['title']:20} {r['palette']['mode']:5} {r['palette']['accent']}  [{marks}]")
    print(f"→ {PUBLIC / 'manifest.json'}")

    if args.watch:
        print("следим за content/ … (Ctrl+C чтобы выйти)")
        stamp = {p: p.stat().st_mtime for p in CONTENT.rglob("*") if p.is_file()}
        while True:
            time.sleep(2)
            now = {p: p.stat().st_mtime for p in CONTENT.rglob("*") if p.is_file()}
            if now != stamp:
                stamp = now
                m = build()
                print(f"[{time.strftime('%H:%M:%S')}] пересобрано: {m['stats']['tracks']} треков")


if __name__ == "__main__":
    main()
