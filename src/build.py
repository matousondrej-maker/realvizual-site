#!/usr/bin/env python3
"""Generátor webu realvizual.cz.

Zdroj: src/ (šablona v tomto souboru, styly site.css, skript site.js, obsah stránek src/pages/*.html).
Výstup: public/ (to Netlify servíruje). Spuštění: python3 src/build.py
"""
import os, re, json, shutil, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, OUT = os.path.join(ROOT, 'src'), os.path.join(ROOT, 'public')
SITE = 'https://realvizual.cz'

# ── Nastavení ─────────────────────────────────────────────
EMAIL = 'info@realvizual.cz'      # dřív info@indigofilms.cz – před ostrým nasazením zprovoznit schránku
PHONE = '+420 605 207 392'
PHONE_RAW = '+420605207392'
WHATSAPP = '420605207392'
CLARITY_ID = ''                    # ID projektu z clarity.microsoft.com; prázdné = Clarity se nenačte
INSTAGRAM = ''                     # [DOPLNIT] odkaz na Instagram
YOUTUBE = ''                       # [DOPLNIT] odkaz na YouTube
YEAR = '2026'

# ── Stránky: (soubor obsahu, adresa, sekce menu, titulek, popis) ──
PAGES = [
  ('uvod',            '/',                    '',        'RealVizual – foto, video a reels nemovitostí | Ondřej Matouš, Brno',
   'Fotografie, videoprohlídky, reels a půdorysy pro realitní makléře v Brně a na jižní Moravě. Ondřej Matouš, kameraman od roku 2014. Ceník s kalkulačkou online.'),
  ('sluzby',          '/sluzby',              'sluzby',  'Služby pro realitní makléře | RealVizual',
   'Co přesně dostanete: fotografie, videoprohlídka, filmové reels, komentovaný průchod, pozemky z dronu, půdorysy a videa na sítě z ateliéru. Ceny a rozdíly mezi službami.'),
  ('ukazky',          '/ukazky',              'ukazky',  'Ukázky práce – fotky, videa, reels | RealVizual',
   'Ukázky fotografií, videoprohlídek, reels, půdorysů a videí na sítě pro realitní makléře.'),
  ('fotografie',      '/fotografie',          'ukazky',  'Fotografie nemovitostí Brno | RealVizual',
   'Profesionální fotografie nemovitostí včetně záběrů z dronu. Ukázky, co dostanete a cena 4 300 Kč bez DPH.'),
  ('video',           '/video',               'ukazky',  'Videoprohlídky nemovitostí Brno | RealVizual',
   'Videoprohlídky nemovitostí s dronem, scénářem a licencovanou hudbou. Ukázky, co dostanete a cena 12 700 Kč bez DPH.'),
  ('reels',           '/reels',               'ukazky',  'Reels nemovitostí – filmové reels a komentovaný průchod | RealVizual',
   'Krátká vertikální videa nemovitostí pro Instagram, Facebook a TikTok. Filmové reels 7 800 Kč, komentovaný průchod jako doplněk.'),
  ('pozemky',         '/pozemky-a-exteriery', 'ukazky',  'Pozemky a exteriéry z dronu | RealVizual',
   'Fotografie pozemků, chalup a exteriérů z dronu za 2 800 Kč bez DPH. Pro pozemky a nemovitosti, kde není potřeba fotit interiér.'),
  ('pudorys',         '/pudorys',             'ukazky',  'Půdorysy nemovitostí | RealVizual',
   'Přehledné půdorysy nemovitostí za 900 Kč za patro. Ukázky a co dostanete.'),
  ('site',            '/videa-na-site',       'ukazky',  'Videa na sítě z ateliéru pro makléře | RealVizual',
   'Natáčení videí pro sociální sítě v ateliéru v Brně se čtecím zařízením na dvě kamery. Za 2 hodiny 30–60 hotových videí. 4 300 Kč za hodinu.'),
  ('cenik',           '/cenik',               'cenik',   'Ceník a kalkulačka | RealVizual',
   'Spočítejte si cenu focení a natáčení nemovitosti včetně dopravy z Brna. Doporučené sestavy, balíček Prodej na klíč se slevou 10 %, poptávka i přes WhatsApp.'),
  ('o-mne',           '/o-mne',               'o-mne',   'O mně – Ondřej Matouš, kameraman a fotograf nemovitostí | RealVizual',
   'Ondřej Matouš: kameraman od roku 2014, realitní video od roku 2020. Brno a jižní Morava. Za RealVizual stojí jeden člověk, takže kvalita je pokaždé stejná.'),
  ('reference',       '/reference',           'o-mne',   'Reference a případové studie | RealVizual',
   'Co říkají makléři, se kterými spolupracuji, a jak se nemovitosti s mými fotkami a videi prodaly.'),
  ('jak-to-probiha',  '/jak-to-probiha',      'o-mne',   'Jak to probíhá a termíny dodání | RealVizual',
   'Od objednávky po předání: jak probíhá focení a natáčení nemovitosti, kdy dostanete fotky a video a jak se fakturuje.'),
  ('pro-kancelare',   '/pro-kancelare',       'sluzby',  'Pro realitní kanceláře – rámcová spolupráce | RealVizual',
   'Jednotný standard prezentací pro celou pobočku, rámcová cena od 5 zakázek měsíčně se slevou 10 %, jedna faktura a jeden kontakt.'),
  ('pro-developery',  '/pro-developery',      'sluzby',  'Pro developery – vzorové byty, dron, video ze stavby | RealVizual',
   'Fotografie vzorových bytů, záběry z dronu a video z průběhu stavby pro prodej developerských projektů.'),
  ('pro-prodavajici', '/jak-pripravit-nemovitost', 'sluzby', 'Jak připravit nemovitost na focení – rady pro prodávající | RealVizual',
   'Praktický návod pro prodávající: jak připravit byt nebo dům na focení a natáčení, aby nemovitost na fotkách vypadala co nejlépe.'),
  ('novinky',         '/novinky',             'o-mne',   'Co je nového od 1. 1. 2027 | RealVizual',
   'Novinky v RealVizual od 1. 1. 2027: scénář na míru, verze videa na výšku, podklady k inzerátu a brief pro prodávající.'),
  ('kontakt',         '/kontakt',             'kontakt', 'Kontakt | RealVizual',
   'Telefon, WhatsApp a e-mail. Ondřej Matouš, RealVizual (IFVP s.r.o.), Heršpická 813/5, Brno.'),
]
NAV = [('sluzby', '/sluzby', 'Služby'), ('ukazky', '/ukazky', 'Ukázky'), ('cenik', '/cenik', 'Ceník'),
       ('o-mne', '/o-mne', 'O mně'), ('kontakt', '/kontakt', 'Kontakt')]
URL = {p[0]: p[1] for p in PAGES}

WA_SVG = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16.04 3C9.08 3 3.4 8.62 3.4 15.53c0 2.21.59 4.37 1.7 6.27L3.3 28.5l6.9-1.8a12.7 12.7 0 0 0 5.84 1.42h.01c6.96 0 12.64-5.62 12.64-12.53S23 3 16.04 3zm0 22.9h-.01a10.5 10.5 0 0 1-5.38-1.47l-.39-.23-4.09 1.07 1.09-3.97-.25-.41a10.3 10.3 0 0 1-1.6-5.53c0-5.74 4.71-10.41 10.5-10.41 5.8 0 10.5 4.67 10.5 10.41 0 5.75-4.7 10.43-10.47 10.43zm5.76-7.8c-.32-.16-1.86-.91-2.15-1.02-.29-.1-.5-.16-.71.16-.21.31-.82 1.02-1 1.23-.18.21-.37.23-.68.08-.32-.16-1.33-.49-2.54-1.56-.94-.83-1.57-1.86-1.76-2.17-.18-.31-.02-.48.14-.64.14-.14.32-.37.47-.55.16-.18.21-.31.32-.52.1-.21.05-.39-.03-.55-.08-.16-.71-1.7-.97-2.33-.26-.61-.52-.53-.71-.54h-.61c-.21 0-.55.08-.84.39-.29.31-1.1 1.07-1.1 2.61s1.13 3.03 1.29 3.24c.16.21 2.22 3.36 5.37 4.71.75.32 1.34.52 1.8.66.76.24 1.44.2 1.99.12.61-.09 1.86-.75 2.12-1.48.26-.73.26-1.35.18-1.48-.08-.13-.29-.21-.6-.37z"/></svg>'

def jsonld():
    data = {
        "@context": "https://schema.org", "@type": "LocalBusiness", "@id": SITE + "/#firma",
        "name": "RealVizual", "legalName": "IFVP s.r.o.",
        "description": "Fotografie, videoprohlídky, reels a půdorysy nemovitostí pro realitní makléře.",
        "url": SITE + "/", "image": SITE + "/img/og.jpg", "logo": SITE + "/img/logo.svg",
        "telephone": PHONE_RAW, "email": EMAIL, "priceRange": "Kč",
        "founder": {"@type": "Person", "name": "Ondřej Matouš"},
        "address": {"@type": "PostalAddress", "streetAddress": "Heršpická 813/5", "addressLocality": "Brno",
                    "postalCode": "639 00", "addressCountry": "CZ"},
        "geo": {"@type": "GeoCoordinates", "latitude": 49.1772663, "longitude": 16.6042573},
        "areaServed": [{"@type": "City", "name": "Brno"}, {"@type": "AdministrativeArea", "name": "Jihomoravský kraj"}],
        "vatID": "CZ06967574", "taxID": "06967574",
    }
    same = [u for u in (INSTAGRAM, YOUTUBE) if u]
    if same: data["sameAs"] = same
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False) + '</script>'

def clarity():
    if not CLARITY_ID:
        return '<!-- Microsoft Clarity: po doplnění CLARITY_ID v src/build.py se načte až po souhlasu návštěvníka -->'
    return ('<div class="consent" id="consent">Pro zlepšování webu bych rád měřil, jak ho návštěvníci používají '
            '(Microsoft Clarity, anonymně). Souhlasíte? <a href="/ochrana-osobnich-udaju">Více</a>'
            '<div class="consent-btns"><button class="consent-yes" id="consentYes">Souhlasím</button>'
            '<button class="consent-no" id="consentNo">Nesouhlasím</button></div></div>\n'
            '<script>(function(){var K="rv-consent";function load(){(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};'
            't=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);'
            '})(window,document,"clarity","script","' + CLARITY_ID + '");window.clarity("consent");}'
            'var v=null;try{v=localStorage.getItem(K)}catch(e){}if(v==="yes")load();else if(v!=="no")document.getElementById("consent").classList.add("show");'
            'document.getElementById("consentYes").onclick=function(){try{localStorage.setItem(K,"yes")}catch(e){}document.getElementById("consent").classList.remove("show");load();};'
            'document.getElementById("consentNo").onclick=function(){try{localStorage.setItem(K,"no")}catch(e){}document.getElementById("consent").classList.remove("show");};})();</script>')

def nav(active):
    items = ''.join(f'<li><a href="{u}" class="{"nav-cta " if k=="kontakt" else ""}{"nav-active" if k==active else ""}">{t}</a></li>' for k, u, t in NAV)
    mob = ''.join(f'<a href="{u}">{t}</a>' for k, u, t in NAV)
    return f'''<nav>
  <a href="/"><img src="/img/logo.svg" alt="RealVizual" class="logo"></a>
  <ul class="nav-links">
    <li><a href="tel:{PHONE_RAW}" class="nav-tel">{PHONE}</a></li>
    {items}
  </ul>
  <button class="hamburger" id="hamburger" aria-label="Menu"><span></span><span></span><span></span></button>
</nav>
<div class="mobile-menu" id="mobileMenu">{mob}<a href="tel:{PHONE_RAW}">{PHONE}</a></div>'''

def footer():
    soc = ''.join(f'<a href="{u}" target="_blank" rel="noopener">{n}</a>' for n, u in (('Instagram', INSTAGRAM), ('YouTube', YOUTUBE)) if u)
    return f'''<footer class="site-footer">
  <div class="footer-cols">
    <div><h4>RealVizual</h4><span>Ondřej Matouš</span><span>Foto, video a reels nemovitostí</span><span>Brno a jižní Morava</span>
      <a href="tel:{PHONE_RAW}">{PHONE}</a><a href="https://wa.me/{WHATSAPP}" target="_blank" rel="noopener">WhatsApp</a><a href="mailto:{EMAIL}">{EMAIL}</a>{soc}</div>
    <div><h4>Služby</h4><a href="{URL['sluzby']}">Přehled služeb</a><a href="{URL['fotografie']}">Fotografie</a><a href="{URL['video']}">Videoprohlídky</a><a href="{URL['reels']}">Reels</a><a href="{URL['pozemky']}">Pozemky a exteriéry</a><a href="{URL['pudorys']}">Půdorysy</a><a href="{URL['site']}">Videa na sítě</a></div>
    <div><h4>Pro koho</h4><a href="{URL['pro-kancelare']}">Realitní kanceláře</a><a href="{URL['pro-developery']}">Developeři</a><a href="{URL['pro-prodavajici']}">Prodávající</a><a href="{URL['cenik']}">Ceník a kalkulačka</a></div>
    <div><h4>O mně</h4><a href="{URL['o-mne']}">Kdo jsem</a><a href="{URL['reference']}">Reference</a><a href="{URL['jak-to-probiha']}">Jak to probíhá</a><a href="{URL['novinky']}">Novinky 2027</a></div>
    <div><h4>Kontakt</h4><a href="{URL['kontakt']}">Napište mi</a><span>IFVP s.r.o.</span><span>IČ 06967574</span><span>Heršpická 813/5, Brno</span></div>
  </div>
  <div class="footer-bottom"><span>© {YEAR} RealVizual / IFVP s.r.o.</span><span><a href="/vop">Obchodní podmínky</a><a href="/ochrana-osobnich-udaju">Ochrana osobních údajů</a></span></div>
</footer>'''

def page(key, path, active, title, desc, body):
    canon = SITE + (path if path != '/' else '/')
    ld = jsonld() if key in ('uvod', 'kontakt') else ''
    body = re.sub(r'\[DOPLNIT:([^\]]*)\]', lambda m: '<mark class="todo">[DOPLNIT:' + m.group(1) + ']</mark>', body)
    body = body.replace('@@EMAIL@@', EMAIL).replace('@@PHONE@@', PHONE).replace('@@PHONE_RAW@@', PHONE_RAW).replace('@@WA@@', WHATSAPP)
    for k, u in URL.items(): body = body.replace('@@' + k + '@@', u)
    t, d = html.escape(title), html.escape(desc)
    return f'''<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{t}</title>
<meta name="description" content="{d}">
<link rel="canonical" href="{canon}">
<meta property="og:type" content="website">
<meta property="og:locale" content="cs_CZ">
<meta property="og:site_name" content="RealVizual">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{SITE}/img/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/site.css">
{ld}
</head>
<body class="page-{key}">
{nav(active)}
<main>
{body}
</main>
{footer()}
<a class="wa-float" href="https://wa.me/{WHATSAPP}?text={'Dobrý%20den%2C%20píšu%20z%20webu%20realvizual.cz.'}" target="_blank" rel="noopener" aria-label="Napsat na WhatsApp">{WA_SVG}</a>
<div class="lightbox" id="lightbox"><button class="lightbox-close" id="lightboxClose">×</button><img id="lightboxImg" src="" alt=""></div>
<script src="/site.js"></script>
{clarity()}
</body>
</html>
'''

def main():
    if os.path.isdir(OUT): shutil.rmtree(OUT)
    os.makedirs(OUT)
    for f in ('img',): shutil.copytree(os.path.join(SRC, 'static', f), os.path.join(OUT, f))
    for f in os.listdir(os.path.join(SRC, 'static')):
        p = os.path.join(SRC, 'static', f)
        if os.path.isfile(p): shutil.copy(p, OUT)
    shutil.copy(os.path.join(SRC, 'site.css'), OUT)
    js = open(os.path.join(SRC, 'site.js')).read().replace('@@EMAIL@@', EMAIL)
    open(os.path.join(OUT, 'site.js'), 'w').write(js)
    urls = []
    for key, path, active, title, desc in PAGES:
        body = open(os.path.join(SRC, 'pages', key + '.html')).read()
        name = 'index.html' if path == '/' else path.strip('/') + '.html'
        open(os.path.join(OUT, name), 'w').write(page(key, path, active, title, desc, body))
        urls.append(SITE + path)
    # právní stránky (samostatná šablona) – sjednotit e-mail a rok
    for f in ('vop.html', 'ochrana-osobnich-udaju.html'):
        s = open(os.path.join(SRC, 'static-legal', f)).read().replace('info@indigofilms.cz', EMAIL)
        s = s.replace('<span>© RealVizual / IFVP s.r.o.</span>', f'<span>© {YEAR} RealVizual / IFVP s.r.o.</span>')
        slug = f[:-5]
        s = s.replace('</title>', '</title>\n<link rel="canonical" href="' + SITE + '/' + slug + '">\n<meta property="og:type" content="website">\n<meta property="og:image" content="' + SITE + '/img/og.jpg">', 1)
        open(os.path.join(OUT, f), 'w').write(s)
        urls.append(SITE + '/' + f[:-5])
    open(os.path.join(OUT, 'sitemap.xml'), 'w').write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        ''.join(f'  <url><loc>{u}</loc></url>\n' for u in urls) + '</urlset>\n')
    open(os.path.join(OUT, 'robots.txt'), 'w').write(f'User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n')
    print('hotovo:', len(urls), 'adres')

if __name__ == '__main__':
    main()
