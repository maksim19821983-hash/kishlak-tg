import os, re
OUT = "/Users/maksimremezov/Desktop/kishlak-tg/design"

lrc = open("/Users/maksimremezov/Desktop/kishlak-tg/vdps/01-intro.lrc", encoding="utf-8").read()
rows = []
for line in lrc.splitlines():
    m = re.match(r"^\[(\d{1,2}):(\d{2})[.:](\d{1,3})\](.*)$", line.strip())
    if not m:
        continue
    mm, ss, cs, body = m.groups()
    t = int(mm) * 60 + int(ss) + int(cs) / 100
    body = body.strip()
    section = re.fullmatch(r"\[(.+)\]", body)
    rows.append({"t": t, "text": section.group(1) if section else body, "section": bool(section)})

ACTIVE = 62.53  # «Мама, не плачь, я вырос»
idx = max(i for i, r in enumerate(rows) if r["t"] <= ACTIVE)
start = max(0, idx - 4)
view = rows[start:start + 9]


def fmt(t):
    return f"{int(t // 60)}:{int(t % 60):02d}"


def insert_lines():
    out = []
    for r in view:
        cls = "lyr"
        if r["section"]:
            cls += " sec-mark"
        if abs(r["t"] - ACTIVE) < 0.01:
            cls += " on"
        out.append(f'<div class="{cls}">{r["text"]}</div>')
    return "".join(out)


def player_lines():
    out = []
    for r in rows[idx - 1: idx + 2]:
        cls = "lyr on" if r["text"] == "Мама, не плачь, я вырос" else "lyr"
        out.append(f'<div class="{cls}">{r["text"]}</div>')
    return "".join(out)


BASE = '''
@font-face{font-family:'U';src:url('assets/unbounded.ttf') format('truetype');font-weight:200 900}
@font-face{font-family:'M';src:url('assets/jbmono-regular.ttf') format('truetype');font-weight:400}
@font-face{font-family:'M';src:url('assets/jbmono-medium.ttf') format('truetype');font-weight:500}
*{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased}
:root{--acc:#64A4B4;--acc-text:#3A6C78}
body{background:#141416;display:flex;gap:36px;padding:36px;width:max-content;font-family:'U',sans-serif;color:#F2EFEA}
.cell{display:flex;flex-direction:column;gap:10px;width:390px}
.cap{font-family:'M';font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:#6E6A66}
.notes{font-family:'M';font-size:10.5px;line-height:17px;color:#8A857F}
.notes b{color:#C9C3BB;font-weight:500}
.screen{position:relative;width:390px;height:844px;overflow:hidden;border-radius:24px;display:flex;flex-direction:column;background:#EDE7DC;color:#131211}
.status{position:relative;height:46px;display:flex;align-items:center;justify-content:space-between;padding:0 26px 0 30px;font-family:'M';font-size:12px}
.sb{display:flex;gap:6px;align-items:center}
.mono{font-family:'M';font-weight:500;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase}
.grain{position:absolute;inset:0;pointer-events:none;opacity:.05;mix-blend-mode:multiply;
background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.top{display:flex;align-items:center;justify-content:space-between;padding:0 24px;height:40px;color:rgba(0,0,0,.5)}
.ins{padding:6px 24px 0;flex:1;overflow:hidden}
.ins h2{font-weight:800;font-size:26px;line-height:28px;letter-spacing:-.02em}
.rule{height:1px;background:rgba(0,0,0,.18);margin:14px 0}
.lyr{font-family:'M';font-size:13px;line-height:32px;color:rgba(0,0,0,.55)}
.lyr.on{font-family:'U';font-weight:600;font-size:16px;line-height:34px;color:var(--acc-text)}
.lyr.sec-mark{font-family:'M';font-size:9.5px;letter-spacing:.2em;color:rgba(0,0,0,.38);line-height:26px}
.tl{margin-top:4px}
.tl div{display:flex;align-items:baseline;gap:10px;padding:5px 0;border-bottom:1px solid rgba(0,0,0,.08);font-weight:600;font-size:13px}
.tl .n{font-family:'M';font-size:9.5px;color:rgba(0,0,0,.4);width:18px}
.tl .d{margin-left:auto;font-family:'M';font-size:9.5px;color:rgba(0,0,0,.4)}
.tl .cur{color:var(--acc-text)}
.bottom{padding:14px 24px 20px;background:#EDE7DC;border-top:1px solid rgba(0,0,0,.10)}
.fold{border:1px solid rgba(0,0,0,.25);height:48px;display:flex;align-items:center;justify-content:center;font-family:'M';font-size:10.5px;letter-spacing:.18em}
/* кассета */
.c-top{display:flex;align-items:center;justify-content:space-between;padding:0 24px;height:40px;color:rgba(0,0,0,.5)}
.cass-wrap{padding:8px 24px 0}
.cassette{position:relative;width:100%;aspect-ratio:1.44;border-radius:10px;padding:14px 16px;background:linear-gradient(180deg,#1E1C1A,#141312 60%,#191817);border:1px solid rgba(255,255,255,.10);box-shadow:0 18px 30px -18px rgba(0,0,0,.55)}
.cass-lab{display:flex;align-items:baseline;justify-content:space-between;font-family:'M';font-size:8.5px;letter-spacing:.18em;color:rgba(241,237,230,.62)}
.cass-win{position:relative;margin-top:10px;height:92px;border-radius:6px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;padding:0 22px}
.reel{position:relative;width:72px;height:72px;border-radius:72px;border:2px solid rgba(241,237,230,.28);display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.25)}
.tape-disc{position:absolute;border-radius:50%;background:#8C5334}
.hub{position:relative;z-index:2;width:16px;height:16px;border-radius:50%;background:#171614;border:1px solid rgba(241,237,230,.35)}
.tape-path{position:absolute;left:70px;right:70px;top:50%;height:2px;background:#8C5334;opacity:.8}
.screw{position:absolute;width:5px;height:5px;border-radius:5px;background:rgba(241,237,230,.28)}
.cass-bot{display:flex;align-items:flex-end;justify-content:space-between;margin-top:10px}
.side{font-family:'M';font-size:9px;letter-spacing:.2em;color:rgba(241,237,230,.55)}
.c-title{font-weight:800;font-size:36px;line-height:38px;letter-spacing:-.025em;padding:28px 24px 0}
.c-meta{font-family:'M';font-size:10px;letter-spacing:.16em;color:rgba(0,0,0,.5);padding:10px 24px 0}
.c-lyr{padding:26px 24px 0;font-family:'M';font-size:13.5px;line-height:40px;color:rgba(0,0,0,.45)}
.c-lyr .on{font-family:'U';font-weight:600;font-size:16px;color:#131211}
.c-bottom{margin-top:auto;padding:0 24px 18px}
.c-bar{height:3px;background:rgba(0,0,0,.14);position:relative}
.c-bar i{position:absolute;left:0;top:0;height:3px;background:var(--acc);display:block}
.c-times{display:flex;justify-content:space-between;font-family:'M';font-size:10px;letter-spacing:.12em;color:rgba(0,0,0,.45);margin-top:9px}
.c-tr{display:flex;align-items:center;justify-content:space-between;margin-top:16px}
.c-pl{width:58px;height:58px;border-radius:58px;background:#131211;color:#EDE7DC;display:flex;align-items:center;justify-content:center}
.c-plain{width:44px;height:44px;display:flex;align-items:center;justify-content:center}
.c-flip{font-family:'M';font-size:9.5px;letter-spacing:.18em;border:1px solid rgba(0,0,0,.18);padding:9px 14px 8px;border-radius:999px}
'''

def insert_screen():
    tl = "".join(
        f'<div><span class="n">{i:02d}</span><span class="{"cur" if t == "Интро" else ""}">{t}</span><span class="d">{fmt(d)}</span></div>'
        for i, (t, d) in enumerate([
            ("Интро", 140), ("Гордыня", 211), ("Жадность", 185), ("Похоть", 168),
            ("Зависть", 164), ("Чревоугодие", 153), ("Гнев", 189), ("Лень", 189),
        ], start=1)
    )
    return f'''<div class="screen">
  {status('dark')}
  <div class="top"><span class="mono">ВКЛАДЫШ</span><span class="mono">A · 1/9</span></div>
  <div class="ins">
    <h2>ТЕКСТ ПЕСНИ</h2>
    <div class="rule"></div>
    {insert_lines()}
    <div class="rule"></div>
    <div class="tl">{tl}</div>
  </div>
  <div class="bottom"><div class="fold">СЛОЖИТЬ</div></div>
  {grain()}
</div>'''

def status(dark=False):
    c = "#0E0E0F" if dark else "#F2EFEA"
    return (f'<div class="status" style="color:{c}"><span>16:34</span><span class="sb">'
            f'<svg width="18" height="12" viewBox="0 0 18 12" fill="{c}"><rect x="0" y="8" width="3" height="4" rx="1"/>'
            f'<rect x="5" y="6" width="3" height="6" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/>'
            f'<rect x="15" y="0" width="3" height="12" rx="1" opacity=".4"/></svg>'
            f'<svg width="17" height="12" viewBox="0 0 17 12" fill="none" stroke="{c}" stroke-width="1.5" stroke-linecap="round">'
            f'<path d="M1.5 4.2a11 11 0 0 1 14 0"/><path d="M4 6.8a7.4 7.4 0 0 1 9 0"/><path d="M6.6 9.3a3.8 3.8 0 0 1 3.8 0"/></svg>'
            f'<svg width="26" height="13" viewBox="0 0 26 13" fill="none" stroke="{c}" stroke-width="1.2">'
            f'<rect x="0.6" y="1.6" width="20" height="9.8" rx="2.6"/><rect x="2.2" y="3.2" width="14" height="6.6" rx="1.6" fill="{c}" stroke="none"/>'
            f'<path d="M23 5v3" stroke-width="2" stroke-linecap="round"/></svg></span></div>')

def grain():
    return '<div class="grain"></div>'

def cassette_screen():
    return f'''<div class="screen">
  {status('dark')}
  <div class="c-top"><span class="mono">01 / 09</span><span class="mono">КИШЛАК</span></div>
  <div class="cass-wrap">
    <div class="cassette">
      <span class="screw" style="left:8px;top:8px"></span><span class="screw" style="right:8px;top:8px"></span>
      <span class="screw" style="left:8px;bottom:8px"></span><span class="screw" style="right:8px;bottom:8px"></span>
      <div class="cass-lab"><span>КИШЛАК — ВДПС</span><span>№ 0341</span></div>
      <div class="cass-win">
        <span class="tape-path"></span>
        <div class="reel"><span class="tape-disc" style="width:46px;height:46px"></span><span class="hub"></span></div>
        <div class="reel"><span class="tape-disc" style="width:24px;height:24px"></span><span class="hub"></span></div>
      </div>
      <div class="cass-bot"><span class="side">СТОРОНА A</span><span class="side">C-60 · 2026</span></div>
    </div>
  </div>
  <div class="c-title">Интро</div>
  <div class="c-meta">КИШЛАК · ВДПС · 2026</div>
  <div class="c-lyr">{player_lines()}</div>
  <div class="c-bottom">
    <div class="c-bar"><i style="width:45%"></i></div>
    <div class="c-times"><span>1:02</span><span>−1:18</span></div>
    <div class="c-tr">
      <span class="c-plain"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6v12L9.5 12z" fill="currentColor" stroke="none"/><rect x="6" y="6" width="1.8" height="12" fill="currentColor" stroke="none"/></svg></span>
      <span class="c-pl"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="8" y="5.5" width="3" height="13" rx="1"/><rect x="13" y="5.5" width="3" height="13" rx="1"/></svg></span>
      <span class="c-plain"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6v12l8.5-6z" fill="currentColor" stroke="none"/><rect x="16.2" y="6" width="1.8" height="12" fill="currentColor" stroke="none"/></svg></span>
      <span class="c-flip">ПЕРЕВЕРНУТЬ</span>
    </div>
  </div>
  {grain()}
</div>'''

cells = [
    ("Вкладыш · настоящий текст", insert_screen(),
     "<b>1</b> активная строка — Unbounded, акцентом<br><b>2</b> [Куплет] и [Припев] — метки секций<br><b>3</b> трек-лист стороны A"),
    ("Плеер · превью текста", cassette_screen(),
     "<b>1</b> три строки вокруг активной<br><b>2</b> кассета — предмет, не панель<br><b>3</b> тап по строке — перемотка"),
]

html = f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Вкладыш</title>
<style>{BASE}</style></head><body>
{''.join(f'<div class="cell"><div class="cap">{c}</div>{h}<div class="notes">{n}</div></div>' for c,h,n in cells)}
</body></html>'''
open(os.path.join(OUT, "sheet-insert.html"), "w").write(html)
print("ok", len(rows), "строк")
