import os
OUT = "/Users/maksimremezov/Desktop/kishlak-tg/design"

HTML = '''<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Карточка</title>
<style>
@font-face{font-family:'U';src:url('assets/unbounded.ttf') format('truetype');font-weight:200 900}
@font-face{font-family:'M';src:url('assets/jbmono-regular.ttf') format('truetype');font-weight:400}
@font-face{font-family:'M';src:url('assets/jbmono-medium.ttf') format('truetype');font-weight:500}
*{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased}
body{width:1080px;height:1350px;background:#EDE7DC;color:#131211;font-family:'U',sans-serif;position:relative;overflow:hidden}
.grain{position:absolute;inset:0;opacity:.06;mix-blend-mode:multiply;
background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.frame{position:absolute;inset:40px;border:1px solid rgba(19,18,17,.25)}
.top{position:absolute;left:72px;right:72px;top:78px;display:flex;justify-content:space-between}
.mono{font-family:'M';font-size:16px;letter-spacing:.22em;text-transform:uppercase;color:rgba(19,18,17,.55)}
.title{position:absolute;left:72px;right:72px;top:126px;font-weight:800;font-size:132px;line-height:124px;letter-spacing:-.045em}
.sub{position:absolute;left:72px;right:72px;top:300px;font-family:'M';font-size:21px;letter-spacing:.2em;color:rgba(19,18,17,.6)}
.cover{position:absolute;left:72px;top:360px;width:560px;height:560px;object-fit:cover;border:1px solid rgba(19,18,17,.25)}
.side{position:absolute;right:72px;top:360px;width:300px}
.side .k{font-family:'M';font-size:14px;letter-spacing:.2em;color:rgba(19,18,17,.45)}
.side .v{font-weight:700;font-size:26px;margin-top:10px;line-height:30px}
.side .row{padding:18px 0;border-bottom:1px solid rgba(19,18,17,.15)}
.side .row:first-child{border-top:0}
.quote{position:absolute;left:72px;right:72px;top:1002px;font-weight:700;font-size:44px;line-height:52px;letter-spacing:-.02em;max-width:760px}
.foot{position:absolute;left:72px;right:72px;bottom:86px;display:flex;align-items:flex-end;justify-content:space-between}
.foot .who{font-family:'M';font-size:18px;letter-spacing:.16em;color:rgba(19,18,17,.5)}
.logo{width:64px;height:64px;border-radius:64px;border:1px solid rgba(19,18,17,.35);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;letter-spacing:-.04em}
</style></head><body>
<div class="frame"></div>
<div class="top"><span class="mono">Кишлак · плеер</span><span class="mono">2026</span></div>
<div class="title">РЕЗИДЕНТ</div>
<div class="sub">ВДПС — 41% ТВОЕГО ВРЕМЕНИ</div>
<img class="cover" src="assets/real/vdps.jpg">
<div class="side">
  <div class="row"><div class="k">ТРЕКОВ</div><div class="v">34</div></div>
  <div class="row"><div class="k">МИНУТ</div><div class="v">1 240</div></div>
  <div class="row"><div class="k">ПОВТОРОВ</div><div class="v">57</div></div>
  <div class="row"><div class="k">ТОП-ТРЕК</div><div class="v" style="font-size:22px">Болею тобой</div></div>
</div>
<div class="quote">«город спит, а мы ещё нет»</div>
<div class="foot"><div class="who">@maxim · слушай в телеграме</div><div class="logo">К</div></div>
<div class="grain"></div>
</body></html>'''
open(os.path.join(OUT, "card.html"), "w").write(HTML)
print("ok")
