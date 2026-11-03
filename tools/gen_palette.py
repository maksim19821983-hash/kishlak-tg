"""Палитра релиза из обложки: акцент — самый насыщенный заметный кластер,
вторичный цвет — второй по отличию оттенок. Монохромные обложки помечаются."""

from __future__ import annotations

import colorsys
import json
import random
from pathlib import Path

from PIL import Image

CONTENT = Path("content/releases")
random.seed(1)


def hsv(rgb: tuple[float, float, float]) -> tuple[float, float, float]:
    return colorsys.rgb_to_hsv(*(v / 255 for v in rgb))


def kmeans(pixels: list[tuple[int, int, int]], k: int = 7, iters: int = 16):
    centers = random.sample(pixels, k)
    buckets: list[list[tuple[int, int, int]]] = [[] for _ in range(k)]
    for _ in range(iters):
        buckets = [[] for _ in range(k)]
        for p in pixels:
            best, bd = 0, 1e18
            for i, c in enumerate(centers):
                d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2
                if d < bd:
                    bd, best = d, i
            buckets[best].append(p)
        for i, b in enumerate(buckets):
            if b:
                centers[i] = tuple(sum(p[j] for p in b) / len(b) for j in range(3))
    return centers, buckets


def normalize(rgb: tuple[float, float, float], min_s: float = 0.5) -> str:
    h, s, v = hsv(rgb)
    s = max(s, min_s)
    v = min(0.62, max(0.36, v))
    r, g, b = colorsys.hsv_to_rgb(h, min(s, 0.72), v)
    return "#%02X%02X%02X" % (round(r * 255), round(g * 255), round(b * 255))


def hue_gap(a: float, b: float) -> float:
    d = abs(a - b) % 360
    return min(d, 360 - d)


def analyze(cover: Path) -> dict:
    im = Image.open(cover).convert("RGB").resize((96, 96), Image.LANCZOS)
    pixels = list(im.getdata())
    colored = [p for p in pixels if hsv(p)[1] >= 0.15]
    pool = colored if len(colored) >= 150 else pixels

    centers, buckets = kmeans(pool, 7)
    stats = []
    for c, b in zip(centers, buckets):
        if len(b) < max(12, len(pool) * 0.02):
            continue
        h, s, v = hsv(c)
        weight = len(b) / len(pool)
        if v < 0.08 or v > 0.96:
            continue
        stats.append({"rgb": c, "h": h * 360, "s": s, "v": v, "w": weight})

    if not stats:
        return {"accent": "#8C5334", "secondary": "#B47F64", "mono": True}

    max_s = max(s["s"] for s in stats)
    ranked = sorted(stats, key=lambda s: (s["w"] ** 0.45) * (0.2 + s["s"]) ** 1.3, reverse=True)
    main = ranked[0]

    accent = normalize(main["rgb"], 0.5)

    second = None
    for cand in ranked[1:]:
        if hue_gap(cand["h"], main["h"]) >= 35 and cand["w"] >= 0.04:
            second = cand
            break
    secondary = normalize(second["rgb"], 0.42) if second else normalize(
        tuple(min(255, c * 1.35) for c in main["rgb"]), 0.42
    )

    return {"accent": accent, "secondary": secondary, "mono": max_s < 0.38}


def apply_overrides() -> None:
    """Ручные акценты из tools/palette_overrides.json перекрывают алгоритм."""
    path = Path("tools/palette_overrides.json")
    if not path.exists():
        return
    overrides = json.loads(path.read_text(encoding="utf-8"))
    for rid, spec in overrides.items():
        if rid.startswith("_"):
            continue
        release = CONTENT / rid / "release.json"
        if not release.exists():
            print(f"нет релиза {rid}")
            continue
        data = json.loads(release.read_text(encoding="utf-8"))
        palette = data.get("palette", {})
        palette["accent"] = spec["accent"]
        palette["secondary"] = spec["secondary"]
        palette["mono"] = spec.get("mono", False)
        palette["curated"] = True
        data["palette"] = palette
        release.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"ручной акцент: {data['title']} {spec['accent']}")


def main() -> None:
    changed = 0
    for path in sorted(CONTENT.glob("*/release.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        cover = path.parent / data.get("cover", "cover.jpg")
        if not cover.exists():
            continue
        palette = analyze(cover)
        old = data.get("palette", {})
        merged = {
            "mode": old.get("mode", "paper"),
            "accent": palette["accent"],
            "secondary": palette["secondary"],
            "mono": palette["mono"],
        }
        data["palette"] = merged
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        changed += 1
        flag = "моно" if palette["mono"] else "цвет"
        print(f"{data['title'][:24]:26} {merged['accent']} + {merged['secondary']}  {flag}")
    print(f"обновлено: {changed}")
    apply_overrides()


if __name__ == "__main__":
    main()
