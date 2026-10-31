import os
OUT = "/Users/maksimremezov/Desktop/kishlak-tg/design"

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

BASE = '''
@font-face{font-family:'U';src:url('assets/unbounded.ttf') format('truetype');font-weight:200 900}
@font-face{font-family:'M';src:url('assets/jbmono-regular.ttf') format('truetype');font-weight:400}
@font-face{font-family:'M';src:url('assets/jbmono-medium.ttf') format('truetype');font-weight:500}
*{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased}
body{background:#141416;display:flex;gap:36px;padding:36px;width:max-content;font-family:'U',sans-serif;color:#F2EFEA}
.cell{display:flex;flex-direction:column;gap:10px;width:390px}
.cap{font-family:'M';font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:#6E6A66}
.notes{font-family:'M';font-size:10.5px;line-height:17px;color:#8A857F}
.notes b{color:#C9C3BB;font-weight:500}
.screen{position:relative;width:390px;height:844px;overflow:hidden;border-radius:24px;display:flex;flex-direction:column;background:#EDE7DC;color:#131211}
.status{position:relative;height:46px;display:flex;align-items:center;justify-content:space-between;padding:0 26px 0 30px;font-family:'M';font-size:12px;letter-spacing:.05em}
.sb{display:flex;gap:6px;align-items:center}
.mono{font-family:'M';font-weight:500;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase}
.grain{position:absolute;inset:0;pointer-events:none;opacity:.05;mix-blend-mode:overlay;
background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.top{display:flex;align-items:center;justify-content:space-between;padding:0 24px;height:40px;color:rgba(0,0,0,.5)}
.me-btn{width:30px;height:30px;border-radius:30px;border:1px solid rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;font-family:'M';font-size:11px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 14px;padding:14px 24px 0}
.sv{position:relative;border:1px solid rgba(0,0,0,.18);overflow:hidden}
.sv img{display:block;width:100%;aspect-ratio:1;object-fit:cover}
.sv .gray{filter:grayscale(1) brightness(.92)}
.sv .fill{position:absolute;left:0;right:0;bottom:0;overflow:hidden}
.sv .fill img{position:absolute;left:0;bottom:0;width:100%;height:auto}
.sv.locked{border-style:dashed}
.stamp{position:absolute;right:-6px;top:-6px;width:30px;height:30px;background:#131211;color:#EDE7DC;display:flex;align-items:center;justify-content:center;font-family:'M';font-size:10px}
.kt{font-weight:600;font-size:13px;margin-top:7px}
.ky{font-family:'M';font-size:9.5px;letter-spacing:.14em;color:rgba(0,0,0,.45);margin-top:2px}
.h1{font-weight:800;font-size:32px;line-height:34px;letter-spacing:-.025em;padding:6px 24px 0}
.hint{font-family:'M';font-size:10px;letter-spacing:.14em;color:rgba(0,0,0,.45);padding:8px 24px 0}
/* A. лента */
.strip-a{position:absolute;left:0;right:0;bottom:0;height:46px;display:flex;align-items:center;gap:11px;padding:0 18px 2px;border-top:1px solid rgba(0,0,0,.16);background:#EDE7DC}
.strip-a img{width:28px;height:28px;object-fit:cover;border:1px solid rgba(0,0,0,.2)}
.strip-a .st{font-weight:600;font-size:12px}
.strip-a .ss{font-family:'M';font-size:8.5px;letter-spacing:.14em;color:rgba(0,0,0,.45);margin-top:2px}
.strip-a .sp{margin-left:auto;width:34px;height:34px;display:flex;align-items:center;justify-content:center}
.strip-a .line{position:absolute;left:0;right:0;bottom:0;height:2px;background:rgba(0,0,0,.10)}
.strip-a .line i{position:absolute;left:0;top:0;height:2px;background:#8C5334;width:34%}
.ticks{position:absolute;left:0;right:0;bottom:0;height:3px;display:flex;gap:6px;padding:0 18px;opacity:.25}
.ticks span{width:2px;height:3px;background:currentColor}
/* B. торец */
.strip-b{position:absolute;left:0;right:0;bottom:0;height:58px;display:flex;align-items:center;gap:12px;padding:0 18px;border-top:1px solid rgba(0,0,0,.18);background:#E4DDD0}
.strip-b .cass{width:40px;height:26px;border:1px solid rgba(0,0,0,.35);border-radius:3px;position:relative;display:flex;align-items:center;justify-content:space-around}
.strip-b .cass .r{width:9px;height:9px;border-radius:9px;border:1px solid rgba(0,0,0,.45)}
.strip-b .cass .r.on{background:#8C5334;border-color:#8C5334}
.strip-b .st{font-weight:600;font-size:12px}
.strip-b .ss{font-family:'M';font-size:8.5px;letter-spacing:.14em;color:rgba(0,0,0,.45);margin-top:2px}
.strip-b .sp{margin-left:auto;width:34px;height:34px;display:flex;align-items:center;justify-content:center}
.strip-b .line{position:absolute;left:0;right:0;bottom:0;height:2px;background:rgba(0,0,0,.10)}
.strip-b .line i{position:absolute;left:0;top:0;height:2px;background:#8C5334;width:34%}
/* C. тихий */
.quiet{display:flex;align-items:center;justify-content:space-between;padding:0 24px;height:40px}
.quiet .now{display:flex;align-items:center;gap:9px}
.quiet .dot{width:6px;height:6px;border-radius:6px;background:#8C5334}
.quiet .sp{width:32px;height:32px;display:flex;align-items:center;justify-content:center}
.qline{height:2px;margin:0 24px;background:rgba(0,0,0,.12);position:relative}
.qline i{position:absolute;left:0;top:0;height:2px;width:34%;background:#8C5334}
'''

def grain():
    return '<div class="grain"></div>'

def sleeve(cover, title, year, progress, num=None):
    gray = "gray" if progress < 1 else ""
    locked = " locked" if progress == 0 else ""
    fill = (f'<div class="fill" style="height:{int(progress*100)}%"><img src="assets/real/{cover}.jpg"></div>'
            if 0 < progress < 1 else "")
    stamp = f'<span class="stamp">{num}</span>' if progress >= 1 else ""
    return (f'<div><div class="sv{locked}"><img class="{gray}" src="assets/real/{cover}.jpg">{fill}{stamp}</div>'
            f'<div class="kt">{title}</div><div class="ky">{year} · {int(progress*11)}/11</div></div>')

def grid(count=6):
    items = [("vdps","ВДПС","2026",1.0,"01"),("shiz2","СХИК2","2023",0.62,None),
             ("boleyu","Болею тобой","2023",0.36,None),("apnoe","Апноэ","2023",0.12,None),
             ("stigmata","STIGMATA","2024",0.0,None),("lava","lava","2021",0.0,None)]
    return "".join(sleeve(*it) for it in items[:count])

def head(quiet=False):
    if quiet:
        return f'''<div class="quiet">
      <span class="now"><span class="dot"></span><span class="mono">ВДПС · 0:42</span></span>
      <span style="display:flex;align-items:center;gap:10px">
        <span class="sp"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="5.5" width="3.4" height="13" rx="1"/><rect x="13.6" y="5.5" width="3.4" height="13" rx="1"/></svg></span>
        <span class="me-btn">Р</span>
      </span>
    </div><div class="qline"><i></i></div>'''
    return f'''<div class="top"><span class="mono">КИШЛАК</span><span style="display:flex;align-items:center;gap:12px"><span class="mono">12 / 28</span><span class="me-btn">Р</span></span></div>'''

def strip_a():
    ticks = "".join('<span></span>' for _ in range(26))
    return f'''<div class="strip-a">
  <img src="assets/real/vdps.jpg">
  <div><div class="st">ВДПС</div><div class="ss">КИШЛАК · 0:42 / 2:12</div></div>
  <span class="sp"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="5.5" width="3.4" height="13" rx="1"/><rect x="13.6" y="5.5" width="3.4" height="13" rx="1"/></svg></span>
  <div class="line"><i></i></div>
</div>'''

def strip_b():
    return f'''<div class="strip-b">
  <div class="cass"><span class="r on"></span><span class="r"></span></div>
  <div><div class="st">ВДПС</div><div class="ss">КИШЛАК · 0:42 / 2:12</div></div>
  <span class="sp"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="5.5" width="3.4" height="13" rx="1"/><rect x="13.6" y="5.5" width="3.4" height="13" rx="1"/></svg></span>
  <div class="line"><i></i></div>
</div>'''

def screen_a():
    return f'''<div class="screen">{statusbar(dark=True)}{head()}
  <div class="h1">КАТАЛОГ</div><div class="hint">ПРОЯВЛЯЕТСЯ ПО МЕРЕ ПРОСЛУШИВАНИЯ</div>
  <div class="grid">{grid(6)}</div>{grain()}{strip_a()}</div>'''

def screen_b():
    return f'''<div class="screen">{statusbar(dark=True)}{head()}
  <div class="h1">КАТАЛОГ</div><div class="hint">ПРОЯВЛЯЕТСЯ ПО МЕРЕ ПРОСЛУШИВАНИЯ</div>
  <div class="grid">{grid(6)}</div>{grain()}{strip_b()}</div>'''

def screen_c():
    return f'''<div class="screen">{statusbar(dark=True)}{head(quiet=True)}
  <div class="h1">КАТАЛОГ</div><div class="hint">ПРОЯВЛЯЕТСЯ ПО МЕРЕ ПРОСЛУШИВАНИЯ</div>
  <div class="grid">{grid(6)}</div>{grain()}</div>'''

cells = [
 ("A · «Лента» · 46 px", screen_a(),
  "<b>1</b> тонкая полоса, не панель<br><b>2</b> по низу ползёт лента-прогресс<br><b>3</b> тап — открыть кассету"),
 ("B · «Торец кассеты» · 58 px", screen_b(),
  "<b>1</b> мини-кассета слева, катушки крутятся<br><b>2</b> ближе к предмету, но тяжелее<br><b>3</b> занимает место у сетки"),
 ("C · «Тихий» · без плашки", screen_c(),
  "<b>1</b> играющее живёт в шапке<br><b>2</b> прогресс — линия под шапкой<br><b>3</b> ничего не закрывает контент"),
]
html = f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Мини-плеер</title>
<style>{BASE}</style></head><body>
{''.join(f'<div class="cell"><div class="cap">{c}</div>{h}<div class="notes">{n}</div></div>' for c,h,n in cells)}
</body></html>'''
open(os.path.join(OUT, "sheet-mini.html"), "w").write(html)
print("ok")
