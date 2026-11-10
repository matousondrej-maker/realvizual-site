
(function () {
  'use strict';

  /* ══════════════════════════════════════
     KONFIGURACE — upravte dle potřeby
  ══════════════════════════════════════ */
  var CONFIG = {
    origin:      'Heršpická 813/5, Brno, Czech Republic',
    originLat:   49.1772663,
    originLon:   16.6042573,
    kmPrice:     8,        // Kč za každý ujetý km (tam i zpět)
    vatRate:     0.21,
    email:       'info@realvizual.cz',
    whatsapp:    '420605207392',
    bundleDiscount: 0.10, // Prodej na klíč: foto + video + půdorys + filmové reels
    services: {
      foto:    { label: 'Fotografie (vč. dronu)', price: 4300 },
      dron:    { label: 'Pozemky a exteriéry (dron)', price: 2800 },
      video:   { label: 'Videoprohlídka (vč. dronu)',      price: 12700 },
      reels:   { label: 'Filmové reels (vč. dronu)', price: 7800 },
      pruchod: { label: 'Komentovaný průchod (doplněk)', price: 2300 },
      pudorys: { label: 'Půdorysy',               pricePerFloor: 900 },
      studio:  { label: 'Videa na sítě z ateliéru', pricePerHour: 4300 }
    }
  };

  /* ══════════════════════════════════════
     STATE
  ══════════════════════════════════════ */
  var state = {
    floors: 1,
    hours: 1,
    distanceKm: null,
    distanceText: '',
    geocoding: false
  };

  // YouTube náhledy: když chybí vyšší rozlišení, zkus nižší; když není žádný, nech tmavou dlaždici
  document.querySelectorAll('.yt img').forEach(function (img) {
    img.addEventListener('error', function () {
      var id = img.closest('.yt').getAttribute('data-yt');
      var steps = ['maxresdefault', 'sddefault', 'hqdefault'];
      var cur = steps.findIndex(function (q) { return img.src.indexOf('/' + q + '.jpg') > -1; });
      var poster = img.closest('.yt').getAttribute('data-poster');
      if (cur > -1 && cur < steps.length - 1) img.src = 'https://i.ytimg.com/vi/' + id + '/' + steps[cur + 1] + '.jpg';
      else if (poster && img.getAttribute('src') !== poster) img.src = poster;
      else img.style.display = 'none';
    });
    // YouTube místo chybějícího náhledu někdy vrátí šedý obrázek 120×90
    function checkPlaceholder() { if (img.naturalWidth && img.naturalWidth <= 120 && img.src.indexOf('i.ytimg.com') > -1) img.dispatchEvent(new Event('error')); }
    img.addEventListener('load', checkPlaceholder);
    if (img.complete) checkPlaceholder();
  });

  // YouTube: přehrávač se načte až po kliknutí na ostrý náhled
  document.addEventListener('click', function (e) {
    var box = e.target.closest('.yt[data-yt]');
    if (!box || box.querySelector('iframe')) return;
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + box.getAttribute('data-yt') + '?autoplay=1&rel=0&playsinline=1';
    f.title = 'RealVizual video';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    f.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;';
    box.innerHTML = '';
    box.appendChild(f);
  });

  document.getElementById('hamburger').addEventListener('click', function () {
    document.getElementById('mobileMenu').classList.toggle('open');
  });

  /* ══════════════════════════════════════
     LIGHTBOX
  ══════════════════════════════════════ */
  document.querySelectorAll('[data-lightbox]').forEach(function (item) {
    item.addEventListener('click', function () {
      var img = item.querySelector('img');
      if (img) { document.getElementById('lightboxImg').src = img.src; document.getElementById('lightbox').classList.add('open'); }
    });
  });
  document.getElementById('lightboxClose').addEventListener('click', function () { document.getElementById('lightbox').classList.remove('open'); });
  document.getElementById('lightbox').addEventListener('click', function (e) { if (e.target === this) this.classList.remove('open'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') document.getElementById('lightbox').classList.remove('open'); });

  if (document.getElementById('svc-foto')) {
  /* ══════════════════════════════════════
     FLOORS STEPPER
  ══════════════════════════════════════ */
  var pudorysCheck = document.getElementById('svc-pudorys');
  var floorsRow    = document.getElementById('floors-row');

  pudorysCheck.addEventListener('change', function () {
    floorsRow.style.display = this.checked ? 'flex' : 'none';
    updateSummary();
  });

  document.getElementById('floors-minus').addEventListener('click', function () {
    if (state.floors > 1) { state.floors--; document.getElementById('floors-val').textContent = state.floors; updateSummary(); }
  });
  document.getElementById('floors-plus').addEventListener('click', function () {
    if (state.floors < 10) { state.floors++; document.getElementById('floors-val').textContent = state.floors; updateSummary(); }
  });

  var studioCheck = document.getElementById('svc-studio');
  var hoursRow    = document.getElementById('hours-row');
  studioCheck.addEventListener('change', function () {
    hoursRow.style.display = this.checked ? 'flex' : 'none';
    updateSummary();
  });
  document.getElementById('hours-minus').addEventListener('click', function () {
    if (state.hours > 1) { state.hours--; document.getElementById('hours-val').textContent = state.hours; updateSummary(); }
  });
  document.getElementById('hours-plus').addEventListener('click', function () {
    if (state.hours < 10) { state.hours++; document.getElementById('hours-val').textContent = state.hours; updateSummary(); }
  });

  /* ══════════════════════════════════════
     SERVICE CHECKBOXES → update summary
  ══════════════════════════════════════ */
  ['svc-foto','svc-dron','svc-video','svc-reels','svc-pruchod','svc-pudorys','svc-studio'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', updateSummary);
  });

  /* ══════════════════════════════════════
     DISTANCE — OpenStreetMap (Nominatim geokódování + OSRM trasa)
     Zdarma, bez API klíče.
  ══════════════════════════════════════ */
  var addrInput       = document.getElementById('q-addr');
  var addrStatus      = document.getElementById('addr-status');
  var suggestBox      = document.getElementById('addr-suggestions');
  var suggestTimer    = null;
  var geocodeTimer    = null;
  var selectedFromList = false;

  function closeSuggestions() {
    suggestBox.classList.remove('open');
    suggestBox.innerHTML = '';
  }

  function renderSuggestions(results) {
    if (!results.length) { closeSuggestions(); return; }
    suggestBox.innerHTML = results.map(function (r, i) {
      return '<div class="addr-suggestion-item" data-idx="' + i + '">' + r.display_name + '</div>';
    }).join('');
    suggestBox.classList.add('open');
    Array.prototype.forEach.call(suggestBox.querySelectorAll('.addr-suggestion-item'), function (el) {
      el.addEventListener('click', function () {
        var r = results[parseInt(el.getAttribute('data-idx'), 10)];
        selectedFromList = true;
        addrInput.value = r.display_name;
        closeSuggestions();
        calculateDistance(parseFloat(r.lat), parseFloat(r.lon));
      });
    });
  }

  function fetchSuggestions(query) {
    var url = 'https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=5&countrycodes=cz&q=' + encodeURIComponent(query);
    fetch(url, { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (results) {
        if (addrInput.value.trim() !== query) return; // odpověď na zastaralý dotaz
        renderSuggestions(results || []);
      })
      .catch(function () { /* nápověda adres není kritická */ });
  }

  addrInput.addEventListener('input', function () {
    selectedFromList = false;
    state.distanceKm = null;
    state.distanceText = '';
    addrStatus.textContent = '';
    addrStatus.className = 'addr-status';
    updateSummary();
    closeSuggestions();

    clearTimeout(suggestTimer);
    clearTimeout(geocodeTimer);
    var val = this.value.trim();
    if (val.length < 4) return;

    suggestTimer = setTimeout(function () { fetchSuggestions(val); }, 400);
    geocodeTimer = setTimeout(function () {
      if (!selectedFromList && val.length > 8) geocodeAddress(val);
    }, 1400);
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.addr-group')) closeSuggestions();
  });

  function geocodeAddress(address) {
    addrStatus.textContent = 'Počítám vzdálenost…';
    addrStatus.className = 'addr-status loading';
    var url = 'https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=1&countrycodes=cz&q=' + encodeURIComponent(address);
    fetch(url, { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (results) {
        if (!results || !results.length) {
          addrStatus.textContent = 'Adresu se nepodařilo najít. Zkontrolujte prosím zadání.';
          addrStatus.className = 'addr-status error';
          state.distanceKm = null;
          updateSummary();
          return;
        }
        calculateDistance(parseFloat(results[0].lat), parseFloat(results[0].lon));
      })
      .catch(function () {
        addrStatus.textContent = 'Chyba při výpočtu vzdálenosti.';
        addrStatus.className = 'addr-status error';
        state.distanceKm = null;
        updateSummary();
      });
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function calculateDistance(destLat, destLon) {
    addrStatus.textContent = 'Počítám vzdálenost…';
    addrStatus.className = 'addr-status loading';

    var url = 'https://router.project-osrm.org/route/v1/driving/' +
      CONFIG.originLon + ',' + CONFIG.originLat + ';' + destLon + ',' + destLat + '?overview=false';

    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.code !== 'Ok' || !data.routes || !data.routes.length) throw new Error('no route');
        applyDistance(data.routes[0].distance, false); // metry, jedna cesta, po silnici
      })
      .catch(function () {
        // Záložní výpočet: vzdušná čára × korekční koeficient, když trasový server neodpoví
        var straightKm = haversineKm(CONFIG.originLat, CONFIG.originLon, destLat, destLon);
        applyDistance(straightKm * 1000 * 1.3, true);
      });
  }

  function applyDistance(oneWayM, isEstimate) {
    var oneWayKm   = oneWayM / 1000;
    var totalKm    = Math.round((oneWayM * 2) / 1000);
    var oneWayText = oneWayKm.toLocaleString('cs-CZ', { maximumFractionDigits: 1 }) + ' km';
    state.distanceKm   = totalKm;
    state.distanceText = oneWayText;
    addrStatus.textContent = (isEstimate ? '≈ ' : '✓ ') + oneWayText +
      ' (jedna cesta' + (isEstimate ? ', odhad vzdušnou čarou' : '') + ') – doprava tam a zpět: ' + totalKm + ' km';
    addrStatus.className = 'addr-status ok';
    updateSummary();
  }

  /* ══════════════════════════════════════
     PRICE CALCULATION & SUMMARY UPDATE
  ══════════════════════════════════════ */
  function fmt(n) {
    return n.toLocaleString('cs-CZ') + ' Kč';
  }

  function updateSummary() {
    var lines  = [];
    var total  = 0;

    // Komentovaný průchod je jen doplněk k fotkám nebo videu
    var pr = document.getElementById('svc-pruchod');
    var base = document.getElementById('svc-foto').checked || document.getElementById('svc-video').checked;
    pr.disabled = !base;
    if (!base) pr.checked = false;
    pr.closest('.check-item').classList.toggle('locked', !base);

    // Services
    var svcMap = { foto: 'svc-foto', dron: 'svc-dron', video: 'svc-video', reels: 'svc-reels', pruchod: 'svc-pruchod', pudorys: 'svc-pudorys', studio: 'svc-studio' };
    var onSiteTotal = 0;
    Object.keys(svcMap).forEach(function (key) {
      if (document.getElementById(svcMap[key]).checked) {
        var svc = CONFIG.services[key];
        var price;
        if (key === 'pudorys') {
          price = svc.pricePerFloor * state.floors;
          lines.push({ label: svc.label + ' (' + state.floors + (state.floors === 1 ? ' patro' : state.floors < 5 ? ' patra' : ' pater') + ')', price: price });
          // update checkbox price label
          document.getElementById('pudorys-price').textContent = fmt(price);
        } else if (key === 'studio') {
          price = svc.pricePerHour * state.hours;
          lines.push({ label: svc.label + ' (' + state.hours + (state.hours === 1 ? ' hodina' : state.hours < 5 ? ' hodiny' : ' hodin') + ')', price: price });
          document.getElementById('studio-price').textContent = fmt(price);
        } else {
          price = svc.price;
          lines.push({ label: svc.label, price: price });
        }
        total += price;
        if (key !== 'studio') onSiteTotal += price;
      }
    });

    // Prodej na klíč: foto + video + půdorys + filmové reels se slevou
    var bundle = ['svc-foto','svc-video','svc-pudorys','svc-reels'].every(function (id) { return document.getElementById(id).checked; });
    var bundleNote = document.getElementById('bundle-note');
    if (bundle) {
      var bundleBase = CONFIG.services.foto.price + CONFIG.services.video.price + CONFIG.services.reels.price + CONFIG.services.pudorys.pricePerFloor * state.floors;
      var discount = Math.round(bundleBase * CONFIG.bundleDiscount);
      total -= discount; onSiteTotal -= discount;
      lines.push({ label: 'Sleva Prodej na klíč (−10 %)', price: -discount });
    }
    if (bundleNote) bundleNote.style.display = bundle ? 'none' : 'block';

    // Transport
    var transportEl = document.getElementById('transport-info');
    var transportText = document.getElementById('transport-text');
    if (state.distanceKm !== null && onSiteTotal > 0) {
      var transportCost = state.distanceKm * CONFIG.kmPrice;
      total += transportCost;
      lines.push({ label: 'Doprava (' + state.distanceKm + ' km × ' + CONFIG.kmPrice + ' Kč)', price: transportCost });
      transportEl.style.display = 'flex';
      transportText.innerHTML = state.distanceText + ' jedním směrem &mdash; doprava tam a zpět <strong>' + state.distanceKm + ' km</strong>';
    } else {
      transportEl.style.display = 'none';
    }

    // Render lines
    var linesEl = document.getElementById('summary-lines');
    if (lines.length === 0) {
      linesEl.innerHTML = '<div class="summary-empty">Vyberte služby a adresu nemovitosti.</div>';
      document.getElementById('total-ex').textContent = '— Kč';
      document.getElementById('total-inc').textContent = '— Kč vč. DPH (21 %)';
      state.lines = [];
      return;
    }

    state.lines = lines;
    linesEl.innerHTML = lines.map(function (l) {
      return '<div class="summary-line"><span>' + l.label + '</span><span>' + fmt(l.price) + '</span></div>';
    }).join('');

    var totalVat = Math.round(total * (1 + CONFIG.vatRate));
    document.getElementById('total-ex').textContent  = fmt(total);
    document.getElementById('total-inc').textContent = fmt(totalVat) + ' vč. DPH (21 %)';
  }

  /* ── Doporučené sestavy: tlačítka a odkazy /cenik?sestava=… ── */
  var PRESETS = {
    byt:     ['svc-foto', 'svc-pudorys'],
    premium: ['svc-foto', 'svc-video', 'svc-pudorys'],
    site:    ['svc-foto', 'svc-reels'],
    pozemek: ['svc-dron'],
    naklic:  ['svc-foto', 'svc-video', 'svc-pudorys', 'svc-reels']
  };
  function applyPreset(name) {
    if (!PRESETS[name]) return;
    ['svc-foto','svc-dron','svc-video','svc-reels','svc-pruchod','svc-pudorys','svc-studio'].forEach(function (id) {
      document.getElementById(id).checked = PRESETS[name].indexOf(id) > -1;
    });
    floorsRow.style.display = document.getElementById('svc-pudorys').checked ? 'flex' : 'none';
    hoursRow.style.display = 'none';
    document.querySelectorAll('[data-preset]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-preset') === name); });
    updateSummary();
  }
  document.querySelectorAll('[data-preset]').forEach(function (b) {
    b.addEventListener('click', function () { applyPreset(b.getAttribute('data-preset')); });
  });
  var presetParam = new URLSearchParams(location.search).get('sestava');

  /* ── Poslat kalkulaci na WhatsApp ── */
  var waBtn = document.getElementById('waSend');
  if (waBtn) waBtn.addEventListener('click', function () {
    var addr = document.getElementById('q-addr').value.trim();
    var txt = 'Dobrý den, posílám poptávku z kalkulačky na realvizual.cz.\n';
    if (state.lines && state.lines.length) {
      txt += state.lines.map(function (l) { return '• ' + l.label + ': ' + fmt(l.price); }).join('\n') + '\n';
      txt += 'Celkem bez DPH: ' + document.getElementById('total-ex').textContent + '\n';
    } else {
      txt += 'Služby ještě nemám vybrané, poradíte mi?\n';
    }
    if (addr) txt += 'Adresa: ' + addr + '\n';
    txt += 'Termín, který by mi vyhovoval: ';
    window.open('https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(txt), '_blank');
  });
  if (presetParam) applyPreset(presetParam);

  updateSummary();
  } // konec kalkulačky (část 1)

  /* ══════════════════════════════════════
     FORM SUBMIT — Netlify Forms
  ══════════════════════════════════════ */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function showThankYou(containerSel, heading, body) {
    document.querySelector(containerSel).innerHTML =
      '<div class="thankyou">' +
      '<div class="thankyou-icon">✓</div>' +
      '<h2>' + heading + '</h2>' +
      '<p>' + body + '</p>' +
      '</div>';
  }

  function submitForm(formData, btn, originalLabel, errEl, onSuccess) {
    btn.textContent = 'Odesílám…';
    btn.disabled = true;
    fetch('/', { method: 'POST', body: formData })
      .then(function (res) {
        if (!res.ok) throw new Error('bad status');
        onSuccess();
      })
      .catch(function () {
        btn.textContent = originalLabel;
        btn.disabled = false;
        errEl.innerHTML = 'Odeslání se nezdařilo. Zavolejte mi prosím na ' +
          '<a href="tel:+420605207392">+420 605 207 392</a> nebo napište na ' +
          '<a href="mailto:' + CONFIG.email + '">' + CONFIG.email + '</a>.';
        errEl.style.display = 'block';
      });
  }

  /* ── Nezávazná poptávka (ceník) ── */
  if (document.getElementById('requestToggle')) {
  var requestToggle = document.getElementById('requestToggle');
  var requestForm   = document.getElementById('requestForm');

  requestToggle.addEventListener('click', function () {
    requestForm.classList.add('open');
    requestToggle.style.display = 'none';
    document.querySelector('.request-hint').style.display = 'none';
    document.getElementById('q-name').focus();
  });

  document.getElementById('submitBtn').addEventListener('click', function () {
    var name  = document.getElementById('q-name').value.trim();
    var tel   = document.getElementById('q-tel').value.trim();
    var email = document.getElementById('q-email').value.trim();
    var addr  = document.getElementById('q-addr').value.trim();
    var note  = document.getElementById('q-note').value.trim();
    var errEl = document.getElementById('form-error');

    var services = [];
    if (document.getElementById('svc-foto').checked)    services.push('Fotografie');
    if (document.getElementById('svc-dron').checked)    services.push('Pozemky a exteriéry (dron)');
    if (document.getElementById('svc-video').checked)   services.push('Videoprohlídka');
    if (document.getElementById('svc-reels').checked)   services.push('Filmové reels');
    if (document.getElementById('svc-pruchod').checked) services.push('Komentovaný průchod');
    if (document.getElementById('svc-pudorys').checked) services.push('Půdorysy (' + state.floors + ' patr' + (state.floors===1?'o':state.floors<5?'a':'er') + ')');
    if (document.getElementById('svc-studio').checked)  services.push('Videa na sítě z ateliéru (' + state.hours + ' h)');

    if (!name || !tel || !email) {
      errEl.textContent = 'Vyplňte prosím jméno, telefon a e-mail.';
      errEl.style.display = 'block';
      return;
    }
    if (services.length === 0) {
      errEl.textContent = 'Vyberte prosím alespoň jednu službu v ceníku výše.';
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';

    var formData = new FormData();
    formData.append('form-name',    'poptavka');
    formData.append('Jméno',        name);
    formData.append('Telefon',      tel);
    formData.append('Email',        email);
    formData.append('Adresa',       addr || 'neuvedena');
    if (state.lines && state.lines.some(function (l) { return l.price < 0; })) services.push('sleva Prodej na klíč −10 %');
    formData.append('Služby',       services.join(', '));
    formData.append('Vzdálenost',   state.distanceKm ? state.distanceKm + ' km (tam+zpět)' : 'neuvedena');
    formData.append('Cena bez DPH', document.getElementById('total-ex').textContent);
    formData.append('Cena s DPH',   document.getElementById('total-inc').textContent);
    formData.append('Poznámka',     note);

    submitForm(formData, this, 'Odeslat poptávku', errEl, function () {
      showThankYou('.quote-layout', 'Poptávka odeslána!',
        'Děkuji, <strong>' + esc(name) + '</strong>. Ozvu se vám co nejdříve na <strong>' +
        esc(email) + '</strong> nebo telefonicky na <strong>' + esc(tel) + '</strong>.');
    });
  });

  } // konec poptávky

  /* ── Kontaktní formulář ── */
  if (document.getElementById('contactSubmitBtn')) {
  document.getElementById('contactSubmitBtn').addEventListener('click', function () {
    var name  = document.getElementById('c-name').value.trim();
    var tel   = document.getElementById('c-tel').value.trim();
    var email = document.getElementById('c-email').value.trim();
    var msg   = document.getElementById('c-msg').value.trim();
    var errEl = document.getElementById('contact-error');

    if (!name || !email || !msg) {
      errEl.textContent = 'Vyplňte prosím jméno, e-mail a zprávu.';
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';

    var formData = new FormData();
    formData.append('form-name', 'kontakt');
    formData.append('Jméno',     name);
    formData.append('Email',     email);
    formData.append('Telefon',   tel || 'neuveden');
    formData.append('Zpráva',    msg);

    submitForm(formData, this, 'Odeslat zprávu', errEl, function () {
      showThankYou('.contact-layout', 'Zpráva odeslána!',
        'Děkuji, <strong>' + esc(name) + '</strong>. Ozvu se vám co nejdříve na <strong>' +
        esc(email) + '</strong>.');
    });
  });
  } // konec kontaktu
}());
