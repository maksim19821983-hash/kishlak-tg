import os
OUT = "/Users/maksimremezov/Desktop/kishlak-tg/design"

def i(name, size=24, cls="ic"):
    p = {
        "play": '<path d="M8 5.2v13.6L19 12z" fill="currentColor" stroke="none"/>',
        "pause": '<rect x="8" y="5.5" width="3" height="13" rx="1" fill="currentColor" stroke="none"/><rect x="13" y="5.5" width="3" height="13" rx="1" fill="currentColor" stroke="none"/>',
        "prev": '<path d="M18 6v12L9.5 12z" fill="currentColor" stroke="none"/><rect x="6" y="6" width="1.8" height="12" fill="currentColor" stroke="none"/>',
        "next": '<path d="M6 6v12l8.5-6z" fill="currentColor" stroke="none"/><rect x="16.2" y="6" width="1.8" height="12" fill="currentColor" stroke="none"/>',
        "dots": '<circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
        "chev": '<path d="M6 9l6 6 6-6"/>',
        "back": '<path d="M15 5l-7 7 7 7"/>',
        "heart": '<path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z"/>',
        "search": '<circle cx="11" cy="11" r="6"/><path d="M15.5 15.5 20 20"/>',
        "shuffle": '<path d="M4 7h4l8 10h4M4 17h4l2-2.5M14 9.5 16 7h4"/><path d="M17 4l3 3-3 3M17 14l3 3-3 3"/>',
    }[name]
    return (f'<svg class="{cls}" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" '
            f'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">{p}</svg>')

def statusbar(dark=False):
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

BASE = '''
@font-face{font-family:'U';src:url('assets/unbounded.ttf') format('truetype');font-weight:200 900;font-display:block}
@font-face{font-family:'M';src:url('assets/jbmono-regular.ttf') format('truetype');font-weight:400;font-display:block}
@font-face{font-family:'M';src:url('assets/jbmono-medium.ttf') format('truetype');font-weight:500;font-display:block}
*{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased}
body{background:#141416;display:flex;gap:40px;padding:40px;width:max-content;font-family:'U',sans-serif;color:#F2EFEA}
.cell{display:flex;flex-direction:column;gap:12px;align-items:center}
.cap{font-family:'M';font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#6E6A66}
.screen{position:relative;width:390px;height:844px;overflow:hidden;border-radius:24px;display:flex;flex-direction:column}
.status{position:relative;height:46px;display:flex;align-items:center;justify-content:space-between;padding:0 26px 0 30px;font-family:'M';font-size:12px;letter-spacing:.05em}
.sb{display:flex;gap:6px;align-items:center}
.ic{display:block}
.mono{font-family:'M';font-weight:500;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase}
.grain{position:absolute;inset:0;pointer-events:none;opacity:.05;mix-blend-mode:overlay;
background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
'''

# ---------------- A. ПЕЧАТЬ ----------------
A_CSS = '''
.p-a{background:var(--bgv);color:var(--inkv)}
.p-a.light{--bgv:#EDE7DC;--inkv:#131211;--linev:rgba(19,18,17,.18);--dimv:rgba(19,18,17,.55)}
.p-a.dark{--bgv:#0B0B0C;--inkv:#F1EDE6;--linev:rgba(241,237,230,.16);--dimv:rgba(241,237,230,.5)}
.p-a .hrow{display:flex;align-items:center;justify-content:space-between;padding:0 24px;height:40px;color:var(--dimv)}
.p-a .big{font-weight:800;font-size:34px;line-height:34px;letter-spacing:-.02em;padding:4px 24px 0}
.p-a .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px;padding:14px 24px 0}
.p-a .sleeve{border:1px solid var(--linev)}
.p-a .sleeve img{display:block;width:100%;aspect-ratio:1;object-fit:cover}
.p-a .t{font-weight:600;font-size:13px;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.p-a .y{font-family:'M';font-size:9.5px;letter-spacing:.14em;color:var(--dimv);margin-top:2px}
.p-a .cover-wrap{padding:26px 24px 0}
.p-a .cover-wrap img{display:block;width:100%;aspect-ratio:1;object-fit:cover;border:1px solid var(--linev)}
.p-a .ptitle{font-weight:800;font-size:30px;line-height:32px;letter-spacing:-.02em;padding:20px 24px 0}
.p-a .pmeta{font-family:'M';font-size:10px;letter-spacing:.16em;color:var(--dimv);padding:8px 24px 0}
.p-a .bottom{margin-top:auto;padding:0 24px 18px}
.p-a .track{position:relative;height:1px;background:var(--linev);margin-bottom:0}
.p-a .track .fill{position:absolute;left:0;top:-1px;height:3px;background:var(--inkv)}
.p-a .track .knob{position:absolute;top:-4px;width:9px;height:9px;border-radius:9px;background:var(--inkv);transform:translateX(-4px)}
.p-a .times{display:flex;justify-content:space-between;font-family:'M';font-size:10px;letter-spacing:.1em;color:var(--dimv);margin-top:10px}
.p-a .transport{display:flex;align-items:center;justify-content:space-between;margin-top:20px}
.p-a .pl{width:62px;height:62px;border-radius:62px;background:var(--inkv);color:var(--bgv);display:flex;align-items:center;justify-content:center}
.p-a .plain{color:var(--inkv);display:flex;align-items:center;justify-content:center;width:44px;height:44px}
.p-a .txt-link{font-family:'M';font-size:10px;letter-spacing:.16em;border-bottom:1px solid var(--linev);padding-bottom:3px}
.p-a .lyr{padding:34px 24px 0;font-family:'M';font-size:13px;line-height:30px;color:var(--dimv)}
.p-a .lyr .on{color:var(--inkv);font-family:'U';font-weight:600;font-size:16px;line-height:30px}
.p-a .mini{position:relative;display:flex;align-items:center;gap:10px;padding:12px 20px 8px;border-top:1px solid var(--linev);margin-top:auto}
.p-a .mini img{width:36px;height:36px;object-fit:cover;border:1px solid var(--linev)}
.p-a .mini .mt{font-weight:600;font-size:12px;flex:1}
.p-a .mini .ms{font-family:'M';font-size:9px;letter-spacing:.14em;color:var(--dimv)}
'''

def A_home():
    cells = [("vdps","ВДПС","2026"),("shiz2","СХИК2","2023"),("boleyu","Болею тобой","2023"),
             ("apnoe","Апноэ","2023"),("stigmata","STIGMATA","2024"),("lava","lava","2021")]
    g = "".join(f'<div><div class="sleeve"><img src="assets/real/{c}.jpg"></div>'
                f'<div class="t">{t}</div><div class="y">{y}</div></div>' for c,t,y in cells)
    return f'''<div class="screen p-a light">
  {statusbar(dark=True)}
  <div class="hrow"><span class="mono">Кишлак</span><span class="mono">12 релизов</span></div>
  <div class="big">КАТАЛОГ</div>
  <div class="grid">{g}</div>
  <div class="mini"><img src="assets/real/vdps.jpg"><div class="mt">ВДПС<span class="ms" style="display:block;margin-top:2px">КИШЛАК</span></div><span>{'%s' % i("pause",20)}</span></div>
  {grain()}
</div>'''

def A_player(cover, title, year, mode):
    return f'''<div class="screen p-a {mode}">
  {statusbar(dark=(mode=="light"))}
  <div class="hrow"><span class="mono">01 / 12</span>{i("dots",20)}</div>
  <div class="cover-wrap"><img src="assets/real/{cover}.jpg"></div>
  <div class="ptitle">{title}</div>
  <div class="pmeta">КИШЛАК · {year} · СИНГЛ</div>
  <div class="lyr">я вырос там, где свет не достаёт<br><span class="on">болею тобой</span><br>и мне не холодно</div>
  <div class="bottom">
    <div class="track"><div class="fill" style="width:34%"></div><div class="knob" style="left:34%"></div></div>
    <div class="times"><span>0:42</span><span>−1:38</span></div>
    <div class="transport">
      <span class="plain">{i("prev",26)}</span>
      <span class="pl">{i("pause",26)}</span>
      <span class="plain">{i("next",26)}</span>
    </div>
    <div style="display:flex;justify-content:center;margin-top:16px"><span class="txt-link">ТЕКСТ ПЕСНИ</span></div>
  </div>
  {grain()}
</div>'''

# ---------------- B. СЦЕНА ----------------
B_CSS = '''
.p-b{background:#0B0B0C;color:#fff}
.p-b .bg{position:absolute;inset:0}
.p-b .bg img{width:100%;height:100%;object-fit:cover;display:block}
.p-b .scrim{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.45) 0%,rgba(0,0,0,.05) 24%,rgba(0,0,0,.42) 52%,rgba(0,0,0,.93) 88%,#000 100%)}
.p-b .top{position:relative;display:flex;align-items:center;justify-content:space-between;padding:0 22px;height:40px;color:rgba(255,255,255,.8)}
.p-b .wrap{position:relative;margin-top:auto;padding:0 24px 22px;color:#fff}
.p-b .kicker{font-family:'M';font-size:10px;letter-spacing:.2em;color:rgba(255,255,255,.62);margin-bottom:10px}
.p-b .h{font-weight:800;font-size:36px;line-height:38px;letter-spacing:-.025em;text-shadow:0 1px 24px rgba(0,0,0,.35)}
.p-b .sub{font-family:'M';font-size:11px;letter-spacing:.16em;color:rgba(255,255,255,.68);margin-top:10px}
.p-b .bar{margin-top:22px;height:2px;background:rgba(255,255,255,.28);position:relative}
.p-b .bar .f{position:absolute;left:0;top:0;height:2px;background:#fff}
.p-b .times{display:flex;justify-content:space-between;font-family:'M';font-size:10px;letter-spacing:.12em;color:rgba(255,255,255,.62);margin-top:8px}
.p-b .tr{display:flex;align-items:center;justify-content:space-between;margin-top:16px;color:#fff}
.p-b .tr .big{width:58px;height:58px;border-radius:58px;border:1.5px solid rgba(255,255,255,.75);display:flex;align-items:center;justify-content:center}
.p-b .hint{font-family:'M';font-size:9.5px;letter-spacing:.2em;color:rgba(255,255,255,.5)}
'''

def B_screen(cover, title, kicker, scrim=True, hint=None):
    return f'''<div class="screen p-b">
  <div class="bg"><img src="assets/real/{cover}.jpg"></div>
  {('<div class="scrim"></div>' if scrim else '')}
  {statusbar()}
  <div class="top"><span class="mono">{kicker}</span>{i("dots",20)}</div>
  <div class="wrap">
    <div class="h">{title}</div>
    <div class="sub">КИШЛАК · 2026</div>
    <div class="bar"><div class="f" style="width:34%"></div></div>
    <div class="times"><span>0:42</span><span>−1:38</span></div>
    <div class="tr">
      <span>{i("shuffle",20)}</span>
      <span>{i("prev",30)}</span>
      <span class="big">{i("pause",24)}</span>
      <span>{i("next",30)}</span>
      <span>{i("heart",20)}</span>
    </div>
    {f'<div class="hint" style="margin-top:14px">{hint}</div>' if hint else ''}
  </div>
  {grain()}
</div>'''

# ---------------- C. ЗИН ----------------
C_CSS = '''
.p-c{background:#0B0B0C;color:#EFEAE2}
.p-c .top{display:flex;align-items:center;justify-content:space-between;padding:0 24px;height:40px;color:rgba(239,234,226,.55)}
.p-c .brand{font-weight:800;font-size:44px;line-height:44px;letter-spacing:-.03em;padding:8px 24px 0}
.p-c .sub{font-family:'M';font-size:10px;letter-spacing:.18em;color:rgba(239,234,226,.5);padding:10px 24px 18px}
.p-c .idx{margin:0 24px;border-top:1px solid rgba(239,234,226,.18)}
.p-c .row{display:flex;align-items:center;gap:14px;padding:11px 0;border-bottom:1px solid rgba(239,234,226,.1)}
.p-c .n{font-family:'M';font-size:10px;letter-spacing:.1em;color:rgba(239,234,226,.42);width:18px}
.p-c .thumb{width:44px;height:44px;object-fit:cover;border:1px solid rgba(239,234,226,.14)}
.p-c .rt{font-weight:600;font-size:14px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.p-c .ry{font-family:'M';font-size:9.5px;letter-spacing:.12em;color:rgba(239,234,226,.42)}
.p-c .nowrow{border-left:2px solid var(--accv);padding-left:12px;margin-left:-14px}
.p-c .coverrow{display:flex;gap:16px;padding:0 24px;align-items:flex-start}
.p-c .stamp{width:96px;height:96px;object-fit:cover;border:1px solid rgba(239,234,226,.18);flex:0 0 auto}
.p-c .k{font-family:'M';font-size:9.5px;letter-spacing:.2em;color:rgba(239,234,226,.45)}
.p-c .title{font-weight:800;font-size:38px;line-height:38px;letter-spacing:-.025em;padding:18px 24px 0}
.p-c .rule{margin:26px 24px 0;height:1px;background:rgba(239,234,226,.22);position:relative}
.p-c .rule .f{position:absolute;left:0;top:-1px;height:3px;background:var(--accv)}
.p-c .times{display:flex;justify-content:space-between;font-family:'M';font-size:10px;letter-spacing:.12em;color:rgba(239,234,226,.5);margin:10px 24px 0}
.p-c .tr{display:flex;align-items:center;justify-content:space-between;margin:22px 24px 0}
.p-c .pl{width:56px;height:56px;border-radius:56px;background:#EFEAE2;color:#0B0B0C;display:flex;align-items:center;justify-content:center}
.p-c .plain{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:#EFEAE2}
.p-c .foot{margin-top:auto;padding:0 24px 22px}
.p-c .foot .l{font-family:'M';font-size:9.5px;letter-spacing:.18em;color:rgba(239,234,226,.45);display:flex;justify-content:space-between}
'''

def C_home():
    rows = [("01","vdps","ВДПС","2026","СИНГЛ"),("02","boleyu","Болею тобой","2023","СИНГЛ"),
            ("03","shiz2","СХИК2","2023","АЛЬБОМ"),("04","apnoe","Апноэ","2023","СИНГЛ"),
            ("05","stigmata","STIGMATA","2024","СИНГЛ"),("06","lava","lava","2021","СИНГЛ"),
            ("07","jazz","Я уёбываю в джаз","2021","СИНГЛ")]
    body = "".join(f'<div class="row"><span class="n">{n}</span><img class="thumb" src="assets/real/{c}.jpg">'
                   f'<span class="rt">{t}</span><span class="ry">{y}</span></div>' for n,c,t,y,k in rows)
    return f'''<div class="screen p-c" style="--accv:#4FB3A6">
  {statusbar()}
  <div class="top"><span class="mono">Каталог</span><span class="mono">28 релизов</span></div>
  <div class="brand">КИШЛАК</div>
  <div class="sub">2019 — 2026 · 28 РЕЛИЗОВ · 132 ТРЕКА</div>
  <div class="idx">{body}</div>
  {grain()}
</div>'''

def C_player(cover, title, acc, mode=None):
    return f'''<div class="screen p-c" style="--accv:{acc}">
  {statusbar()}
  <div class="top"><span class="mono">Сейчас играет</span>{i("dots",20)}</div>
  <div class="coverrow">
    <img class="stamp" src="assets/real/{cover}.jpg">
    <div style="padding-top:2px">
      <div class="k">РЕЛИЗ</div>
      <div style="font-weight:600;font-size:14px;margin-top:6px">ВДПС</div>
      <div class="k" style="margin-top:6px">КИШЛАК · 2026</div>
    </div>
  </div>
  <div class="title">{title}</div>
  <div class="rule"><div class="f" style="width:34%"></div></div>
  <div class="times"><span>0:42</span><span>−1:38</span></div>
  <div class="tr">
    <span class="plain">{i("prev",26)}</span>
    <span class="pl">{i("pause",24)}</span>
    <span class="plain">{i("next",26)}</span>
  </div>
  <div class="foot">
    <div class="l"><span>ТЕКСТ ПЕСНИ</span><span>ОЧЕРЕДЬ</span></div>
  </div>
  {grain()}
</div>'''

sheets = {
 "c-a": ("ПЕЧАТЬ · полярность от обложки", [
    ("Каталог · светлая обложка → бумага", A_home()),
    ("Светлая обложка → светлая сцена", A_player("vdps","ВДПС","2026","light")),
    ("Тёмная обложка → тёмная сцена", A_player("shiz2","СХИК2","2023","dark")),
 ]),
 "c-b": ("СЦЕНА · обложка во весь экран", [
    ("Каталог · обложка = экран", B_screen("vdps","ВДПС","01 / 12", True, "ЛИСТАЙ ВВЕРХ")),
    ("Светлая обложка · белый хром", B_screen("boleyu","БОЛЕЮ ТОБОЙ","02 / 12", True)),
    ("Тёмная обложка · тот же хром", B_screen("shiz2","СХИК2","03 / 12", True)),
 ]),
 "c-c": ("ЗИН · типографика и штампы", [
    ("Каталог · индекс релизов", C_home()),
    ("Плеер · бирюза из обложки", C_player("vdps","ВДПС","#4FB3A6")),
    ("Плеер · красный из обложки", C_player("shiz2","СХИК2","#B23A3A")),
 ]),
}

CSS_ALL = BASE + A_CSS + B_CSS + C_CSS
for key, (title, items) in sheets.items():
    cells = "".join(f'<div class="cell"><div class="cap">{c}</div>{h}</div>' for c, h in items)
    html = f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>{title}</title>
<style>{CSS_ALL}</style></head><body>{cells}</body></html>'''
    open(os.path.join(OUT, f"sheet-{key}.html"), "w").write(html)
    print("wrote", key, title)
