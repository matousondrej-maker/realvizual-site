# realvizual.cz

Web pro RealVizual (Ondřej Matouš, IFVP s.r.o.). Statický web na Netlify.

- **Zdroj:** `src/` – `build.py` (šablona hlavičky, menu a patičky, seznam stránek, nastavení),
  `site.css`, `site.js` (kalkulačka, formuláře, videa), `pages/*.html` (obsah stránek),
  `static/` (obrázky, favicony), `static-legal/` (obchodní podmínky, zásady).
- **Sestavení:** `python3 src/build.py` → vygeneruje `public/` (výstup je v gitu, Netlify nic nebuilduje).
- **Nastavení v `src/build.py`:** `EMAIL`, `CLARITY_ID` (Microsoft Clarity se načte až po souhlasu
  návštěvníka), `INSTAGRAM`, `YOUTUBE`. Novou stránku přidat do `PAGES` a vytvořit `src/pages/<klíč>.html`.
- **Zástupné texty** `[DOPLNIT: …]` se na webu zvýrazní žlutě, před spuštěním je nahradit.
- Formuláře: Netlify Forms (`poptavka`, `kontakt`), skryté definice jsou v `pages/cenik.html` a `pages/kontakt.html`.
- Texty v 1. osobě jednotného čísla, nikdy „my“.
