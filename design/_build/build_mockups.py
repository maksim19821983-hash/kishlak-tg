import os, random

OUT = "/Users/maksimremezov/Desktop/kishlak-tg/design/mockups.html"

# ---------- icons ----------
def i(name, size=24, extra=""):
    p = {
        "play": '<path d="M8 5.2v13.6L19 12z" fill="currentColor" stroke="none"/>',
        "pause": '<rect x="8" y="5.5" width="3" height="13" rx="1" fill="currentColor" stroke="none"/><rect x="13" y="5.5" width="3" height="13" rx="1" fill="currentColor" stroke="none"/>',
        "prev": '<path d="M18 6v12L9.5 12z" fill="currentColor" stroke="none"/><rect x="6" y="6" width="1.8" height="12" fill="currentColor" stroke="none"/>',
        "next": '<path d="M6 6v12l8.5-6z" fill="currentColor" stroke="none"/><rect x="16.2" y="6" width="1.8" height="12" fill="currentColor" stroke="none"/>',
        "shuffle": '<path d="M4 7h4l8 10h4M4 17h4l2-2.5M14 9.5 16 7h4"/><path d="M17 4l3 3-3 3M17 14l3 3-3 3"/>',
        "repeat": '<path d="M5 9V8a3 3 0 0 1 3-3h8M19 15v1a3 3 0 0 1-3 3H8"/><path d="M14 2l3 3-3 3M10 22l-3-3 3-3"/>',
        "heart": '<path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z"/>',
        "plus": '<path d="M12 5v14M5 12h14"/>',
        "down": '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
        "dots": '<circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
        "search": '<circle cx="11" cy="11" r="6"/><path d="M15.5 15.5 20 20"/>',
        "chev": '<path d="M6 9l6 6 6-6"/>',
        "back": '<path d="M15 5l-7 7 7 7"/>',
        "lines": '<path d="M4 7h16M4 12h10M4 17h13"/>',
        "clock": '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
        "list": '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
        "text": '<path d="M5 6h14M5 11h9M5 16h12"/><path d="M18 14l2 2-2 2"/>',
        "star": '<path d="M12 4l2.2 5.2L20 10l-4 3.6 1 5.4-5-2.8-5 2.8 1-5.4L4 10l5.8-.8z"/>',
        "download": '<path d="M12 4v10M8 11l4 4 4-4M5 19h14"/>',
        "dotsv": '<circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none"/>',
    }[name]
    return (f'<svg class="ic" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" '
            f'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" {extra}>{p}</svg>')

def statusbar():
    return ('<div class="status"><span class="sb-time">16:34</span><span class="sb-right">'
            '<svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/>'
            '<rect x="5" y="6" width="3" height="6" rx="1" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor"/>'
            '<rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" opacity=".35"/></svg>'
            '<svg width="17" height="12" viewBox="0 0 17 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">'
            '<path d="M1.5 4.2a11 11 0 0 1 14 0"/><path d="M4 6.8a7.4 7.4 0 0 1 9 0"/><path d="M6.6 9.3a3.8 3.8 0 0 1 3.8 0"/></svg>'
            '<svg width="26" height="13" viewBox="0 0 26 13" fill="none" stroke="currentColor" stroke-width="1.2">'
            '<rect x="0.6" y="1.6" width="20" height="9.8" rx="2.6"/><rect x="2.2" y="3.2" width="14" height="6.6" rx="1.6" fill="currentColor" stroke="none"/>'
            '<path d="M23 5v3" stroke-width="2" stroke-linecap="round"/></svg>'
            '</span></div>')

def bars(seed, n=64, played=0.35):
    rnd = random.Random(seed)
    out = []
    for k in range(n):
        h = 4 + (rnd.random() ** 0.7) * 24
        cls = "b on" if k / n < played else "b"
        out.append(f'<span class="{cls}" style="height:{h:.0f}px"></span>')
    return '<div class="wave">' + "".join(out) + "</div>"

def trackrow(i, title, dur, playing=False, cover="cover-2.jpg"):
    cls = "row playing" if playing else "row"
    idx = f'<span class="num">{i:02d}</span>' if i else ""
    return (f'<div class="{cls}"><div class="row-l">{idx}'
            f'<img src="assets/{cover}" class="row-cov" alt=""><div class="row-t"><span class="row-title">{title}</span>'
            f'<span class="row-sub">Кишлак</span></div></div>'
            f'<div class="row-r"><span class="num">{dur}</span>{i( "heart", 20).replace("ic", "ic dim") if False else ""}'
            f'<svg class="ic dim" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">'
            f'<path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z"/></svg></div></div>')

def minibar(cover="cover-1.jpg", title="Болею тобой", prog=0.35):
    return (f'<div class="mini"><img src="assets/{cover}" class="mini-cov" alt="">'
            f'<div class="mini-t"><span class="mini-title">{title}</span><span class="mini-sub">Кишлак</span></div>'
            f'<button class="mini-btn">{i("pause",20)}</button>'
            f'<div class="mini-line"><div class="mini-line-in" style="transform:scaleX({prog})"></div></div></div>')

def tabs(active="home"):
    items = [("home", "Главная", "lines"), ("heart", "Любимые", "heart"), ("search", "Поиск", "search")]
    out = []
    for key, label, ic in items:
        cls = "tab on" if key == active else "tab"
        out.append(f'<div class="{cls}"><div class="tab-ic">{i(ic,22)}</div><span>{label}</span></div>')
    return '<div class="tabs">' + "".join(out) + "</div>"

def section(title, right="→"):
    return f'<div class="sec"><span class="mono-label">{title}</span><span class="sec-r">{right}</span></div>'

def scene(cover, accent):
    return (f'<div class="scene" style="--accent:{accent}"><img class="scene-img" src="assets/{cover}" alt="">'
            f'<div class="scene-grad"></div></div>')

# ---------- screens ----------
def home():
    return f'''<div class="screen" style="--accent:#9A5B3A">
  {scene("cover-1.jpg", "#9A5B3A")}
  {statusbar()}
  <div class="top"><span class="mono-label">КИШЛАК / АПФС</span>{i("search",20)}</div>
  <div class="hero"><img src="assets/cover-1.jpg" alt=""></div>
  <div class="p-h">
    <div>
      <div class="h2">БОЛЕЮ ТОБОЙ</div>
      <div class="meta">КИШЛАК · ВДПС · 2025</div>
    </div>
  </div>
  {bars(11, 64, 0.34)}
  <div class="times"><span class="num">0:42</span><span class="num">−1:38</span></div>
  <div class="cta-row"><button class="round">{i("shuffle",20)}</button><button class="cta">{i("play",22)} СЛУШАТЬ</button></div>
  {section("НОВОЕ")}
  <div class="carousel">
    <div class="rel"><img src="assets/cover-2.jpg" alt=""><span class="rel-t">ВДПС</span><span class="rel-y">2025</span></div>
    <div class="rel"><img src="assets/cover-3.jpg" alt=""><span class="rel-t">АПФС</span><span class="rel-y">2024</span></div>
    <div class="rel"><img src="assets/cover-4.jpg" alt=""><span class="rel-t">Ночная смена</span><span class="rel-y">2023</span></div>
  </div>
  {section("ПОПУЛЯРНОЕ")}
  {trackrow(1,"Болею тобой","2:24",True)}
  {minibar()}
  {tabs("home")}
  <div class="grain"></div>
</div>'''

def player(cover="#", title="БОЛЕЮ ТОБОЙ", accent="#9A5B3A", art="cover-1.jpg", played=0.34):
    return f'''<div class="screen" style="--accent:{accent}">
  {scene(art, accent)}
  {statusbar()}
  <div class="ptop"><span class="ic-w">{i("chev",22)}</span><span class="ic-w">{i("dots",22)}</span></div>
  <div class="pcover"><img src="assets/{art}" alt=""></div>
  <div class="ptitle"><div class="display-l">{title}</div><div class="p-artist">Кишлак</div></div>
  {bars(hash(title)%1000, 64, played)}
  <div class="times"><span class="num">0:42</span><span class="num">−1:38</span></div>
  <div class="pill-row"><button class="pill">{i("text",18)} <span>ТЕКСТ ПЕСНИ</span></button></div>
  <div class="transport">
    <button class="rd on">{i("shuffle",20)}</button>
    <button class="rd">{i("prev",24)}</button>
    <button class="play">{i("pause",28)}</button>
    <button class="rd">{i("next",24)}</button>
    <button class="rd">{i("repeat",20)}</button>
  </div>
  <div class="actions">
    <button class="act">{i("heart",22)}</button>
    <button class="act">{i("plus",22)}</button>
    <button class="act">{i("download",22)}</button>
    <button class="act">{i("dots",22)}</button>
  </div>
  <div class="grain"></div>
</div>'''

def lyrics():
    lines = [
        ("p", "я вырос там, где свет не достаёт"),
        ("p", "где каждый шаг — как выстрел в темноту"),
        ("a", "БОЛЕЮ ТОБОЙ"),
        ("f", "и мне не холодно, и мне не больно"),
        ("f", "город спит, а мы ещё нет"),
        ("f", "город спит, а мы ещё нет"),
    ]
    body = "".join(f'<div class="lyr {c}">{t}</div>' for c, t in lines)
    return f'''<div class="screen" style="--accent:#9A5B3A">
  {scene("cover-1.jpg", "#9A5B3A")}
  {statusbar()}
  <div class="ltop"><span class="ic-w">{i("back",22)}</span><span class="mono-label">ТЕКСТ ПЕСНИ</span><span class="ic-w">{i("dots",22)}</span></div>
  <div class="lyrics"><div class="lyr-in">{body}</div></div>
  <div class="lbot">
    {bars(77, 48, 0.34)}
    <div class="times"><span class="num">0:42</span><span class="num">−1:38</span></div>
    <div class="transport sm">
      <button class="rd">{i("shuffle",18)}</button>
      <button class="rd">{i("prev",22)}</button>
      <button class="play sm">{i("pause",24)}</button>
      <button class="rd">{i("next",22)}</button>
      <button class="rd">{i("repeat",18)}</button>
    </div>
  </div>
  <div class="grain"></div>
</div>'''

def artist():
    rows = (trackrow(1,"Болею тобой","2:24",True,cover="cover-1.jpg") + trackrow(2,"Ночная смена","3:03",cover="cover-4.jpg")
          + trackrow(3,"Двинулся на тебе","2:56",cover="cover-3.jpg"))
    return f'''<div class="screen" style="--accent:#8C4A34">
  {scene("poster.jpg", "#8C4A34")}
  {statusbar()}
  <div class="ptop"><span class="ic-w">{i("back",22)}</span><span></span></div>
  <div class="poster"><img src="assets/poster.jpg" alt=""><div class="poster-grad"></div>
    <div class="poster-b">
      <div class="display-xl">КИШЛАК</div>
      <div class="meta">34 812 ПРОСЛУШИВАНИЙ · 4 РЕЛИЗА</div>
    </div>
  </div>
  <div class="cta-row pad">
    <button class="cta">{i("play",20)} СЛУШАТЬ</button>
    <button class="round">{i("shuffle",20)}</button>
    <button class="round">{i("heart",20)}</button>
  </div>
  {section("ПОПУЛЯРНОЕ")}
  {rows}
  <div class="fade"></div>
  {minibar()}
  {tabs("home")}
  <div class="grain"></div>
</div>'''

def release():
    rows = "".join(trackrow(k, t, d, k == 1) for k, t, d in [
        (1,"Болею тобой","2:24"),(2,"Ночная смена","3:03"),(3,"Двинулся на тебе","2:56"),
        (4,"Музыка","2:24"),(5,"В тишине","3:31")])
    return f'''<div class="screen" style="--accent:#8C2E2E">
  {scene("cover-2.jpg", "#8C2E2E")}
  {statusbar()}
  <div class="ptop"><span class="ic-w">{i("back",22)}</span><span class="ic-w">{i("dots",22)}</span></div>
  <div class="rel-cover"><img src="assets/cover-2.jpg" alt=""></div>
  <div class="rel-head">
    <div class="h1">ВДПС</div>
    <div class="meta">КИШЛАК · 2025 · 11 ТРЕКОВ</div>
  </div>
  <div class="cta-row pad"><button class="cta">{i("play",20)} СЛУШАТЬ</button><button class="round">{i("shuffle",20)}</button><button class="round">{i("down",20)}</button></div>
  <div class="rows">{rows}</div>
  <div class="grain"></div>
</div>'''

def search():
    return f'''<div class="screen" style="--accent:#9A5B3A">
  {scene("cover-4.jpg", "#9A5B3A")}
  {statusbar()}
  <div class="s-top"><div class="h1">ПОИСК</div>
    <div class="field">{i("search",20)}<span>Что послушаем?</span></div>
    <div class="chips"><span class="chip on">Все</span><span class="chip">Треки</span><span class="chip">Релизы</span></div>
  </div>
  {section("ТРЕКИ")}
  {trackrow(1,"Болею тобой","2:24",True,cover="cover-1.jpg")}
  {trackrow(2,"Ночная смена","3:03",cover="cover-4.jpg")}
  {trackrow(3,"Музыка","2:24",cover="cover-2.jpg")}
  {trackrow(4,"АПФС","3:18",cover="cover-3.jpg")}
  {trackrow(5,"В тишине","3:31",cover="cover-2.jpg")}
  {minibar()}
  {tabs("search")}
  <div class="grain"></div>
</div>'''

CSS = '''
@font-face{font-family:'Unbounded';src:url('assets/unbounded.ttf') format('truetype');font-weight:200 900;font-display:block}
@font-face{font-family:'JBM';src:url('assets/jbmono-regular.ttf') format('truetype');font-weight:400;font-display:block}
@font-face{font-family:'JBM';src:url('assets/jbmono-medium.ttf') format('truetype');font-weight:500;font-display:block}
*{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased}
:root{--void:#0B0B0C;--surface:#121214;--raised:#17171A;--press:#1F1F23;
--line:rgba(242,239,234,.08);--line2:rgba(242,239,234,.16);
--ink:#F2EFEA;--dim:#A29D96;--mute:#6B6660;--accent:#9A5B3A;--accent-hi:#C08155}
body{background:#17171A;font-family:'Unbounded',sans-serif;color:var(--ink);display:flex;gap:40px;padding:40px;width:max-content}
.cell{display:flex;flex-direction:column;gap:14px;align-items:center}
.cell .cap{font-family:'JBM';font-size:11px;letter-spacing:.14em;color:#6B6660;text-transform:uppercase}
.screen{position:relative;width:390px;height:844px;border-radius:26px;overflow:hidden;background:var(--void);
border:1px solid rgba(242,239,234,.10);display:flex;flex-direction:column}
.scene{position:absolute;inset:0;overflow:hidden}
.scene-img{position:absolute;inset:-15%;width:130%;height:130%;object-fit:cover;filter:blur(44px) saturate(1.15);opacity:.85}
.scene-grad{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(11,11,12,.55) 0%,rgba(11,11,12,.88) 46%,#0B0B0C 78%)}
.grain{position:absolute;inset:0;pointer-events:none;opacity:.055;mix-blend-mode:overlay;
background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.status{position:relative;height:46px;display:flex;align-items:center;justify-content:space-between;padding:0 26px 0 30px;font-family:'JBM';font-size:12px;letter-spacing:.04em}
.sb-right{display:flex;gap:6px;align-items:center;color:var(--ink)}
.top{position:relative;height:44px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;color:var(--dim)}
.mono-label{font-family:'JBM';font-weight:500;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}
.ic{display:block}
.ic-w{width:36px;height:36px;display:flex;align-items:center;justify-content:center;color:var(--ink)}
.hero{position:relative;margin:0 20px;height:224px;border-radius:16px;overflow:hidden;border:1px solid var(--line)}
.hero img{width:100%;height:100%;object-fit:cover}
.p-h{position:relative;padding:14px 20px 0;display:flex;justify-content:space-between;align-items:flex-start}
.h2{font-family:'Unbounded';font-weight:700;font-size:19px;line-height:24px;letter-spacing:-.01em}
.h1{font-family:'Unbounded';font-weight:700;font-size:24px;line-height:28px;letter-spacing:-.01em}
.meta{font-family:'JBM';font-size:10.5px;letter-spacing:.12em;color:var(--mute);margin-top:6px;text-transform:uppercase}
.wave{position:relative;display:flex;align-items:flex-end;gap:3px;height:32px;padding:0 20px;margin-top:14px}
.b{width:2px;border-radius:1px;background:rgba(107,102,96,.55)}
.b.on{background:var(--accent)}
.times{position:relative;display:flex;justify-content:space-between;padding:8px 20px 0}
.num{font-family:'JBM';font-size:11.5px;letter-spacing:.03em;color:var(--mute)}
.cta-row{position:relative;display:flex;gap:10px;align-items:center;padding:16px 20px 0}
.cta-row.pad{padding:14px 20px 0}
.cta{flex:1;height:54px;border:0;border-radius:999px;background:var(--ink);color:var(--void);display:flex;align-items:center;justify-content:center;gap:10px;
font-family:'Unbounded';font-weight:700;font-size:13px;letter-spacing:.08em}
.round{width:46px;height:46px;border-radius:999px;border:1px solid var(--line2);background:transparent;color:var(--ink);display:flex;align-items:center;justify-content:center}
.sec{position:relative;display:flex;align-items:center;justify-content:space-between;padding:22px 20px 10px}
.sec .mono-label{color:var(--dim)}
.sec-r{font-family:'JBM';font-size:12px;color:var(--mute)}
.carousel{position:relative;display:flex;gap:12px;padding:0 20px;overflow:hidden}
.fade{position:absolute;left:0;right:0;bottom:120px;height:110px;background:linear-gradient(to top,#0B0B0C 20%,rgba(11,11,12,0));pointer-events:none}
.rel{width:100px;flex:0 0 auto}
.rel img{width:100px;height:100px;border-radius:12px;object-fit:cover;border:1px solid var(--line)}
.rel-t{display:block;font-family:'Unbounded';font-weight:600;font-size:12px;margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rel-y{display:block;font-family:'JBM';font-size:10px;color:var(--mute);margin-top:2px}
.mini{position:absolute;left:0;right:0;bottom:56px;height:64px;background:var(--raised);border-top:1px solid var(--line);display:flex;align-items:center;gap:12px;padding:0 14px}
.mini-cov{width:40px;height:40px;border-radius:8px;object-fit:cover}
.mini-t{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
.mini-title{font-family:'Unbounded';font-weight:600;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mini-sub{font-family:'JBM';font-size:10px;color:var(--dim)}
.mini-btn{width:40px;height:40px;border-radius:999px;border:1px solid var(--line2);background:transparent;color:var(--ink);display:flex;align-items:center;justify-content:center}
.mini-line{position:absolute;left:0;right:0;bottom:0;height:2px;background:rgba(242,239,234,.10)}
.mini-line-in{height:100%;background:var(--accent);transform-origin:left}
.tabs{position:absolute;left:0;right:0;bottom:0;height:56px;display:flex;border-top:1px solid var(--line);background:#0B0B0C}
.tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:var(--mute);font-family:'JBM';font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;position:relative}
.tab.on{color:var(--ink)}
.tab.on:after{content:'';position:absolute;top:8px;width:4px;height:4px;border-radius:999px;background:var(--accent)}
.tab-ic{opacity:.9}
/* player */
.ptop{position:relative;height:44px;display:flex;align-items:center;justify-content:space-between;padding:0 12px}
.pcover{position:relative;margin:0 20px;height:350px;border-radius:16px;overflow:hidden;border:1px solid var(--line)}
.pcover img{width:100%;height:100%;object-fit:cover}
.ptitle{position:relative;padding:18px 20px 0}
.display-l{font-family:'Unbounded';font-weight:700;font-size:31px;line-height:34px;letter-spacing:-.02em}
.p-artist{font-family:'Unbounded';font-weight:400;font-size:14px;color:var(--dim);margin-top:6px}
.pill-row{position:relative;display:flex;justify-content:center;padding:16px 0 0}
.pill{height:38px;padding:0 18px;border-radius:999px;border:1px solid var(--line2);background:rgba(18,18,20,.6);color:var(--ink);
display:flex;align-items:center;gap:8px;font-family:'JBM';font-weight:500;font-size:10.5px;letter-spacing:.12em}
.pill .ic{color:var(--accent)}
.transport{position:relative;display:flex;align-items:center;justify-content:space-between;padding:22px 20px 0}
.transport.sm{padding:16px 46px 0}
.rd{width:44px;height:44px;border-radius:999px;border:0;background:transparent;color:var(--ink);display:flex;align-items:center;justify-content:center}
.rd.on{color:var(--accent)}
.play{width:72px;height:72px;border-radius:999px;border:0;background:var(--ink);color:var(--void);display:flex;align-items:center;justify-content:center}
.play.sm{width:56px;height:56px}
.actions{position:relative;display:flex;justify-content:space-between;padding:0 24px 26px;margin-top:auto}
.act{width:44px;height:44px;border:0;background:transparent;color:var(--dim);display:flex;align-items:center;justify-content:center}
/* lyrics */
.ltop{position:relative;height:44px;display:flex;align-items:center;justify-content:space-between;padding:0 12px}
.ltop .mono-label{color:var(--dim)}
.lyrics{position:relative;flex:1;margin:10px 24px 0;overflow:hidden;
-webkit-mask-image:linear-gradient(to bottom,transparent,#000 18%,#000 78%,transparent);
mask-image:linear-gradient(to bottom,transparent,#000 18%,#000 78%,transparent)}
.lyr-in{padding-top:64px;display:flex;flex-direction:column;gap:18px}
.lyr{font-family:'JBM';font-weight:500;font-size:15px;line-height:24px;color:rgba(107,102,96,.75)}
.lyr.p{color:var(--mute)}
.lyr.f{color:rgba(162,157,150,.55)}
.lyr.a{font-family:'Unbounded';font-weight:700;font-size:21px;line-height:29px;letter-spacing:-.01em;color:var(--accent);
text-shadow:0 0 26px rgba(154,91,58,.25)}
.lbot{position:relative;padding-bottom:14px}
/* artist */
.poster{position:relative;margin:6px 0 0;height:384px;overflow:hidden}
.poster img{width:100%;height:100%;object-fit:cover;object-position:center 30%}
.poster-grad{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(11,11,12,.25),rgba(11,11,12,0) 35%,rgba(11,11,12,.92) 92%,#0B0B0C)}
.poster-b{position:absolute;left:20px;right:20px;bottom:18px}
.display-xl{font-family:'Unbounded';font-weight:800;font-size:42px;line-height:44px;letter-spacing:-.02em}
/* release */
.rel-cover{position:relative;margin:6px 20px 0;height:270px;border-radius:16px;overflow:hidden;border:1px solid var(--line)}
.rel-cover img{width:100%;height:100%;object-fit:cover}
.rel-head{position:relative;padding:16px 20px 0}
.rows{position:relative;margin-top:10px;padding-bottom:10px}
.row{position:relative;display:flex;align-items:center;justify-content:space-between;padding:9px 20px;gap:12px}
.row.playing .row-title{color:var(--accent)}
.row.playing:before{content:'';position:absolute;left:8px;width:2px;height:18px;border-radius:1px;background:var(--accent)}
.row-l{display:flex;align-items:center;gap:12px;min-width:0}
.row-cov{width:44px;height:44px;border-radius:8px;object-fit:cover;border:1px solid var(--line)}
.row-t{display:flex;flex-direction:column;gap:2px;min-width:0}
.row-title{font-family:'Unbounded';font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px}
.row-sub{font-family:'JBM';font-size:10px;color:var(--mute)}
.row-r{display:flex;align-items:center;gap:10px}
.row .ic.dim{color:var(--mute)}
.row .num{min-width:26px;text-align:right}
/* search */
.s-top{position:relative;padding:10px 20px 0}
.field{margin-top:14px;height:46px;border-radius:12px;background:var(--surface);border:1px solid var(--line);display:flex;align-items:center;gap:10px;padding:0 14px;color:var(--mute);font-family:'JBM';font-size:13px}
.chips{display:flex;gap:8px;margin-top:12px}
.chip{height:30px;padding:0 14px;border-radius:999px;border:1px solid var(--line);display:flex;align-items:center;font-family:'JBM';font-size:10.5px;letter-spacing:.10em;text-transform:uppercase;color:var(--dim)}
.chip.on{background:var(--ink);color:var(--void);border-color:transparent}
'''
SCREENS = {"home": home, "player": player, "lyrics": lyrics, "artist": artist, "release": release, "search": search}

def cell(name, key, **kw):
    return f'<div class="cell"><div class="cap">{name}</div>{SCREENS[key](**kw)}</div>'

sheets = {
    "a": [cell("Главная", "home"), cell("Плеер", "player"), cell("Текст", "lyrics")],
    "b": [cell("Артист", "artist"), cell("Релиз", "release"), cell("Поиск", "search")],
    "c": [cell("Медь · базовый акцент", "player", art="cover-1.jpg", title="БОЛЕЮ ТОБОЙ", accent="#9A5B3A"),
          cell("Сталь · из обложки", "player", art="cover-3.jpg", title="АПФС", accent="#4E7A8C", played=0.62),
          cell("Олива · из обложки", "player", art="cover-4.jpg", title="НОЧНАЯ СМЕНА", accent="#7C8C4C", played=0.18)],
}

html = f'''<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>Кишлак Player — макеты</title><style>{CSS}</style></head><body>
{''.join(sheets["a"])}
</body></html>'''
open(OUT, "w").write(html)

# отдельные файлы под каждый лист
for key, cells in sheets.items():
    doc = f'''<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>mock {key}</title><style>{CSS}</style></head><body>{''.join(cells)}</body></html>'''
    open(OUT.replace("mockups.html", f"sheet-{key}.html"), "w").write(doc)
print("ok", OUT)
