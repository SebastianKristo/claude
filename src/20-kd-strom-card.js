/*
 * kd-strom-card – «Strøm v5» fra Claude Design, med ekte data.
 *
 *   Topp:        effekt nå (strømmåler), spotprisnivå nå, dagens forbruk/kostnad, spotpriser i dag som søyler
 *   Priser:      pris nå, strømregning (åpner #stromregning), billigst i dag, Norgespris; kurve per kvarter i dag / i morgen,
 *                eksempler (dusj, vask …) og av/på for nettleie, strømselskap og moms i prisene
 *   Forbruk:     effekt nå, i dag / måned / år (langtidsstatistikk + kostnadssensorer), kWh per time for valgt dag,
 *                kilder (sensor.*_kurs_energy_daily) med kostnad
 *   Kurser:      hovedsikring og faser (strømsensorer), kurser (config) eller rom med effektmåling fra ki_rom,
 *                varsler (varmtvann i dyr time, over effekttrinn) og siste hendelser (logbok)
 *
 * Minimal config:  type: custom:kd-strom-card
 */
(() => {
  const KD = window.KD;
  if (!KD || customElements.get('kd-strom-card')) return;

  // Designets farger
  const PINK = 'linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20))';
  const C = { green: 'oklch(0.8 0.12 150)', amber: 'oklch(0.82 0.12 75)', red: 'oklch(0.72 0.15 25)', blue: 'oklch(0.8 0.12 250)', teal: 'oklch(0.75 0.09 200)', purple: 'oklch(0.75 0.1 300)', orange: 'oklch(0.8 0.13 60)' };
  const a = KD.a, hh = KD.hh;
  const nf = (n, d = 0) => KD.nf(n, d);
  // Designets runtime rendrer hver {{ x }} som eget <span> – gjør det samme så flex/gap blir likt
  const E = (x) => `<span>${KD.e(x)}</span>`;
  const num = (x) => { const v = parseFloat(x); return isNaN(v) ? null : v; };
  const nfk = (n) => (n == null ? '–' : Number.isInteger(n) ? String(n) : nf(n, 1));
  const glob = (p) => new RegExp('^' + String(p).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
  const MONTHS = ['jan.', 'feb.', 'mars', 'apr.', 'mai', 'juni', 'juli', 'aug.', 'sep.', 'okt.', 'nov.', 'des.'];
  const MONTHS_FULL = ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'];
  const SRC_COL = [C.blue, C.teal, C.green, C.purple, C.orange, C.amber];
  // Eksempler (typisk energibruk – ikke husets data): [ikon, navn, tekst, kWh, timer]
  const EX = [['shower', 'Dusj 10 min', '≈ 4 kWh varmtvann', 4, 1], ['local_laundry_service', 'Vaskemaskin 40°', '≈ 0,9 kWh', 0.9, 2], ['dishwasher', 'Oppvaskmaskin', '≈ 1,1 kWh', 1.1, 2], ['ev_station', 'Lade bilen 20–80 %', '≈ 45 kWh', 45, 5], ['oven_gen', 'Stekeovn 1 time', '≈ 1,5 kWh', 1.5, 1]];
  const SPARKS = [[14, 0], [26, 1.2], [38, 0.5], [50, 2], [62, 0.8], [72, 1.6], [82, 0.3], [90, 2.4], [44, 3], [68, 2.8], [20, 2.2], [56, 3.4]];

  // Ikon ut fra navn/entitet (Material Symbols, som i designet)
  const ICONS = [
    [/varmtvann|bereder|water_heater|vvb/, 'water_heater'], [/varmepumpe|heat_pump/, 'heat_pump'], [/gulvvarme|panelovn|ovn|oljefyr|varme|heat|climate\./, 'heat'],
    [/server|rack|nas|proxmox/, 'dns'], [/\btv\b|tv_|_tv|fjernsyn|apple ?tv/, 'tv'], [/frys|kjøl|kjol|kjøleskap|fridge|freezer/, 'kitchen'],
    [/oppvask|dishwasher/, 'dishwasher_gen'], [/vaskemaskin|washer|washing|vaskerom/, 'local_laundry_service'], [/tørk|tork|dryer/, 'local_laundry_service'],
    [/pult|pc|computer|datamaskin|skjerm/, 'computer'], [/elbil|lader|charger|tesla|ev_/, 'ev_station'], [/kaffe|coffee/, 'coffee_maker'],
    [/vannkoker|kettle/, 'kettle'], [/brødrister|brodrister|toaster/, 'breakfast_dining'], [/mikro|microwave/, 'microwave'],
    [/komfyr|platetopp|stove|oven/, 'cooking'], [/vifte|fan\./, 'mode_fan'], [/printer|creality|3d/, 'print'], [/lys|lamp|light\./, 'light'],
    [/håndkle|hankle|handkle/, 'dry_cleaning'], [/router|switch_poe|nettverk|unifi/, 'router'],
    [/kjøkken|kjokken/, 'kitchen'], [/stue/, 'living'], [/soverom|seng/, 'bed'], [/garasje|ute/, 'garage'], [/bad/, 'bathtub'],
  ];
  const iconFor = (s, def = 'electrical_services') => { s = String(s || '').toLowerCase(); for (const [re, ic] of ICONS) if (re.test(s)) return ic; return def; };

  // Kjente enheter hos brukeren (brukes bare når ki_rom ikke finnes): [bryter, effekt, rom]
  const FALLBACK = [
    ['switch.varmtvannsbereder', 'sensor.varmtvannsbereder_power', 'Vaskegang'],
    ['switch.fryseskap', 'sensor.fryseskap_power', 'Vaskegang'], ['switch.vaskemaskin', 'sensor.vaskemaskin_power', 'Vaskegang'],
    ['switch.kjoleskap', 'sensor.kjoleskap_power', 'Kjøkken'], ['switch.oppvaskmaskin', 'sensor.oppvaskmaskin_power', 'Kjøkken'],
    ['switch.kaffetrakter', 'sensor.kaffetrakter_power', 'Kjøkken'], ['switch.vannkoker', 'sensor.vannkoker_power', 'Kjøkken'],
    ['switch.brodrister', 'sensor.brodrister_power', 'Kjøkken'], ['switch.mikrobolgeovn', 'sensor.mikrobolgeovn_power', 'Kjøkken'],
    ['climate.bad_gulvvarme', 'sensor.bad_gulvvarme_power', 'Bad'], ['climate.kjokken_gulvvarme', 'sensor.kjokken_gulvvarme_power', 'Kjøkken'],
    ['switch.hanklevarmer', 'sensor.hanklevarmer_power', 'Bad'],
  ];

  class KDStromCard extends KD.KDSheet {
    static head = ['bolt', 'Strøm', 'Forbruk og priser'];
    static defaults = {
      effekt: 'sensor.strommaler_effekt',                                   // W nå
      energi_i_dag: 'sensor.strommaler_powercalc_energy_daily',            // kWh i dag (timeforbruk, måned og år fra statistikken)
      strom_profil: 'auto',                                                // no | se | auto – prissensorene under kommer fra profilen
      pris: null,                                                          // totalpris (raw_today/raw_tomorrow, time eller kvarter)
      spotpris: null,                                                      // Nord Pool (spotprisnivå, søylene og prisene når noe er slått av)
      spot_mva: null,                                                      // er spotprisen med mva? tom = fra Nord Pool-sensorens navn
      norgespris: null,                                                    // fastpris kr/kWh (Norgespris) – finnes ikke i Sverige
      spart_i_dag: null,                                                   // kr
      regning: null,                                                       // strømregning denne måneden (kr) – tom = finnes automatisk
      kostnad_maned: null,                                                 // kostnad hittil i måneden (kr) – tom = finnes automatisk
      kostnad_ar: null,                                                    // kostnad hittil i år (kr) – tom = finnes automatisk
      nettleie_dag: 'sensor.nettleie_elvia_energiledd_dag',                // kr/kWh inkl. mva (tall eller entitet)
      nettleie_natt: 'sensor.nettleie_elvia_energiledd_natt_helg',         // kr/kWh inkl. mva (tall eller entitet)
      nettleie_helg: true,                                                 // nattsats hele helgen
      paslag: null,                                                        // strømselskapets påslag, kr/kWh inkl. mva
      mva: 0.25,
      kilder: null,                                                        // kWh-sensorer per kilde – tom = sensor.*_kurs_energy_daily
      hovedsikring: 40, faser_antall: 3,
      faser: null,                                                         // strømsensorer (A) per fase – tom = finnes automatisk
      kurser: null,                                                        // [{navn, ikon, a, fase, effekt}] – tom = rom med effektmåling (ki_rom)
      bereder: 'sensor.ki_bereder',                                        // KI Energi (attr bryter)
      varmtvann: '',                                                       // tom = fra KI Energi, ellers switch.varmtvannsbereder
      effekt_grense_kw: null,                                              // tom = number.ki_mal_trinn_kw, ellers 5
      dyr: 1.5, middels: 1.1,                                              // kr/kWh-terskler for varselet om varmtvann
      spot_varsel: 2,                                                      // kr/kWh – «Spotpris over 2 kr» i hendelsene
      rom: null,                                                           // liste med rom-ID-er (ki_rom) – tom = alle som har effektmåling
      enheter: null,                                                       // [{navn, rom, ikon, bryter, effekt}] – overstyrer oppdagelsen
      skjul: ['sensor.strommaler_*', 'sensor.*_kurs*', 'sensor.*totalt*', 'sensor.hele_huset*', 'switch.shelly_em', 'switch.*_child_lock',
        'switch.pultvifte_*', 'switch.stavifte_*', 'switch.alarm_alarm_heimdall_2', 'switch.trappegang_roykvarsler_alarm_siren', 'switch.ringeklokke_boks'],
      min_w: 3,                                                            // under dette regnes enheten som av
      logg_antall: 5,
    };
    static sheetCss = `[data-hs]::-webkit-scrollbar{display:none}
@keyframes kdsv-rise{0%{transform:translateY(0);opacity:0}15%{opacity:1}100%{transform:translateY(-120px);opacity:0}}
@keyframes kdsv-boltglow{0%,100%{opacity:.8;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}
@keyframes kdsv-blink{0%,100%{opacity:1}50%{opacity:.35}}
.kd-sv-press{transition:background .2s, transform .12s}.kd-sv-press:active{transform:scale(0.97)}
.kd-sv-dev{cursor:pointer;-webkit-user-select:none;user-select:none}.kd-sv-dev:active{transform:scale(.985)}
[data-seg^="strom-"] [data-seg-thumb]{box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border-radius:19px!important}
[data-seg^="strom-"] [data-seg-b]{padding:0 16px!important;font-weight:500!important;border-radius:19px!important;color:#c9c7c2!important;transition:color .2s}
[data-seg^="strom-"] [data-seg-b][style*="font-weight:600"]{color:#2a1720!important}`;

    constructor() { super(); this.state = { tab: 'pris', sub: 'today', page: 0, inc: { net: true, co: true, vat: true }, scrub: null, dayOff: 0, hourSel: null, open: {} }; }
    setConfig(config) { super.setConfig({ ...(window.__kdMockCfgStrom || {}), ...(config || {}) }); }
    now() { return new Date(window.__kdMockNowStrom || Date.now()); }

    /* ---------- data ---------- */
    /** 96 kvarterpriser i kr/kWh (null der det mangler) fra raw_today/raw_tomorrow eller today/tomorrow. Timepriser fylles ut per kvarter. */
    _q96(id, which) {
      const s = this.st(id); if (!s) return null;
      const at = s.attributes || {};
      const unit = String(at.unit_of_measurement || at.unit || '').toLowerCase();
      const base = this.now(); base.setHours(0, 0, 0, 0);
      if (which === 'tomorrow') base.setDate(base.getDate() + 1);
      const t0 = base.getTime(), out = Array(96).fill(null);
      let raw = at['raw_' + which];
      if (Array.isArray(raw) && raw.length && typeof raw[0] === 'object') {
        const pts = raw.map((p) => [new Date(p.start).getTime(), p.end ? new Date(p.end).getTime() : null, num(p.value)]).filter((p) => !isNaN(p[0]) && p[2] != null).sort((x, y) => x[0] - y[0]);
        pts.forEach((p, k) => {
          const end = p[1] && p[1] > p[0] ? p[1] : pts[k + 1] ? pts[k + 1][0] : p[0] + 3600e3;
          for (let t = p[0]; t < end; t += 900e3) { const q = Math.floor((t - t0) / 900e3); if (q >= 0 && q < 96) out[q] = p[2]; }
        });
      } else {
        raw = at[which];
        if (!Array.isArray(raw) || !raw.length) return null;
        const per = 96 / raw.length;
        raw.forEach((v, i) => { v = num(v); if (v == null) return; for (let q = Math.floor(i * per); q < Math.floor((i + 1) * per) && q < 96; q++) out[q] = v; });
      }
      const known = out.filter((v) => v != null).sort((x, y) => x - y);
      if (!known.length) return null;
      const ore = KD.isOre(unit, at) || (!/kr|nok|sek|dkk|eur/.test(unit) && known[Math.floor(known.length / 2)] > 10);
      return out.map((v) => (v == null ? null : ore ? v / 100 : v));
    }
    /** Timesnitt (24) av en kvarterserie */
    _hourly(q) {
      if (!q) return null;
      return Array.from({ length: 24 }, (_, h) => { const v = q.slice(h * 4, h * 4 + 4).filter((x) => x != null); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; });
    }
    /** sensorene fra strømprofilen (Norge/Sverige), overstyrt av config */
    get P() {
      const c = this.config, P = KD.stromProfil(this);
      return { ...P, pris: c.pris || P.pris_total, spotpris: c.spotpris || P.pris_spot, fast: c.norgespris || P.pris_fast, spart: c.spart_i_dag || P.spart, prisNa: P.pris };
    }
    _kr(id) { const v = this.n(id); if (v == null) return null; return KD.isOre(this.unit(id), (this.st(id) || {}).attributes) ? v / 100 : v; }
    /** Tall eller entitet → kr/kWh (null hvis ukjent) */
    _sats(x) {
      if (x == null || x === '') return null;
      if (typeof x === 'number') return x;
      const n = Number(x); if (!isNaN(n)) return n;
      return this._kr(String(x));
    }
    _first(...ids) { return ids.flat().find((id) => id && this.st(id)) || null; }

    /** Pris-modellen: (spot + nettleie + påslag) × mva, med av/på fra fanen «Priser». Uten avslåtte deler brukes totalprisen rett. */
    _model() {
      const c = this.config, P = this.P, vat = c.mva != null && c.mva !== '' ? Number(c.mva) : 0.25;
      const nd = this._sats(c.nettleie_dag), nn = this._sats(c.nettleie_natt);
      const co = (this._sats(c.paslag) || 0) / (1 + vat);
      const spotMva = c.spot_mva != null ? !!c.spot_mva : !!P.spot_mva;
      const d0 = this.now(); d0.setHours(0, 0, 0, 0);
      const net = (h, which) => {
        const d = new Date(d0); if (which === 'tomorrow') d.setDate(d.getDate() + 1);
        const helg = c.nettleie_helg !== false && (d.getDay() === 0 || d.getDay() === 6);
        const v = !helg && h >= 6 && h < 22 ? nd : (nn != null ? nn : nd);
        return (v || 0) / (1 + vat);
      };
      const T = { today: this._q96(P.pris, 'today'), tomorrow: this._q96(P.pris, 'tomorrow') };
      const S = { today: this._q96(P.spotpris, 'today'), tomorrow: this._q96(P.spotpris, 'tomorrow') };
      const inc = this.state.inc || {};
      const allOn = inc.net !== false && inc.co !== false && inc.vat !== false;
      const price = (which, i) => {
        const tot = T[which], sp = S[which];
        if (allOn && tot && tot[i] != null) return tot[i];
        const h = Math.floor(i / 4), n = net(h, which);
        // energiprisen uten mva: helst fra totalprisen (samme oppløsning), ellers Nord Pool
        const se = tot && tot[i] != null ? tot[i] / (1 + vat) - n - co : sp && sp[i] != null ? (spotMva ? sp[i] / (1 + vat) : sp[i]) : null;
        if (se == null) return null;
        return (se + (inc.net !== false ? n : 0) + (inc.co !== false ? co : 0)) * (inc.vat !== false ? 1 + vat : 1);
      };
      const has = (which) => !!(T[which] || S[which]);
      const series = (which) => (has(which) ? Array.from({ length: 96 }, (_, i) => price(which, i)) : null);
      return { T, S, price, series, vat, spotMva };
    }

    /** Forbruk per time i dag (kWh) fra langtidsstatistikken, med inneværende time regnet fra dagens total */
    _use(nowH) {
      const id = this.config.energi_i_dag;
      if (!id || !this.st(id)) return null;
      const mid = this.now(); mid.setHours(0, 0, 0, 0);
      const key = `kd-strom-use|${id}|${mid.toDateString()}`;
      const hours = this.cached(key, 5 * 60e3, () => this.ws({ type: 'recorder/statistics_during_period', start_time: mid.toISOString(), end_time: this.now().toISOString(), statistic_ids: [id], period: 'hour', types: ['change'] })
        .then((r) => {
          const arr = (r && r[id]) || [], out = Array(24).fill(null);
          for (const p of arr) { const d = new Date(p.start); const v = num(p.change); if (!isNaN(d) && v != null && d.toDateString() === mid.toDateString()) out[d.getHours()] = Math.max(0, v); }
          return out;
        }), null);
      const use = Array(24).fill(null);
      if (hours) hours.forEach((v, h) => { if (h < nowH && v != null) use[h] = v; });
      const total = this.n(id);
      const sum = use.reduce((t, v) => t + (v || 0), 0);
      if (total != null) {
        if (!hours) return { use: null, total };
        use[nowH] = Math.max(0, total - sum);
        for (let h = 0; h < nowH; h++) if (use[h] == null) use[h] = 0;
      }
      return { use, total: total != null ? total : sum };
    }
    /** Timeforbruk, kilder og timepris for en tidligere dag (statistikk) */
    _day(off, srcIds) {
      const c = this.config, P = this.P;
      const d0 = this.now(); d0.setHours(0, 0, 0, 0); d0.setDate(d0.getDate() + off);
      const ids = [...new Set([c.energi_i_dag, ...srcIds, P.pris].filter(Boolean))];
      const key = `kd-strom-dag|${d0.toDateString()}|${ids.join(',')}`;
      const ore = KD.isOre(this.unit(P.pris), (this.st(P.pris) || {}).attributes);
      return this.cached(key, 30 * 60e3, () => this.ws({ type: 'recorder/statistics_during_period', start_time: d0.toISOString(), end_time: new Date(d0.getTime() + 86400e3).toISOString(), statistic_ids: ids, period: 'hour', types: ['change', 'mean'] })
        .then((r) => {
          const per = (id, k) => { const out = Array(24).fill(null); for (const p of (r && r[id]) || []) { const d = new Date(p.start), v = num(p[k]); if (!isNaN(d) && v != null && d.toDateString() === d0.toDateString()) out[d.getHours()] = v; } return out; };
          const use = per(c.energi_i_dag, 'change').map((v) => (v == null ? null : Math.max(0, v)));
          const price = per(P.pris, 'mean').map((v) => (v == null ? null : ore || v > 10 ? v / 100 : v));
          const src = Object.fromEntries(srcIds.map((id) => [id, per(id, 'change').reduce((t, v) => t + Math.max(0, v || 0), 0)]));
          return { use, price, src };
        }), null);
    }
    /** kWh denne måneden og i år (månedsstatistikk for energi_i_dag) */
    _year() {
      const id = this.config.energi_i_dag; if (!id || !this.st(id)) return null;
      const now = this.now(), y0 = new Date(now.getFullYear(), 0, 1);
      const key = `kd-strom-ar|${id}|${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      return this.cached(key, 30 * 60e3, () => this.ws({ type: 'recorder/statistics_during_period', start_time: y0.toISOString(), end_time: now.toISOString(), statistic_ids: [id], period: 'month', types: ['change'] })
        .then((r) => {
          let month = 0, year = 0;
          for (const p of (r && r[id]) || []) { const d = new Date(p.start), v = Math.max(0, num(p.change) || 0); if (isNaN(d) || d.getFullYear() !== now.getFullYear()) continue; year += v; if (d.getMonth() === now.getMonth()) month += v; }
          return { month, year };
        }), null);
    }
    /** Kilder: [{id, navn, farge}] fra config eller sensor.*_kurs_energy_daily */
    _sources() {
      const c = this.config;
      let list = Array.isArray(c.kilder) ? c.kilder.map((x) => (typeof x === 'string' ? { energi: x } : x)) : Object.keys(this.all()).filter((id) => /^sensor\..+_kurs_energy_daily$/.test(id)).sort().map((id) => ({ energi: id }));
      list = list.filter((x) => x && x.energi && this.st(x.energi));
      return list.map((x, i) => {
        let navn = x.navn || String(this.fname(x.energi)).replace(/\s*(kurs)?\s*(energy|energi)\s*(daily|i dag|dag)?\s*$/i, '').replace(/\s+kurs$/i, '').trim();
        navn = navn ? navn[0].toUpperCase() + navn.slice(1) : x.energi;
        return { id: x.energi, navn, farge: x.farge || null };
      });
    }
    /** Strøm per fase (A): config faser eller sensor.*_current_l1..3 */
    _phases() {
      const c = this.config;
      let ids = Array.isArray(c.faser) ? c.faser : Object.keys(this.all()).filter((id) => /^sensor\.[a-z0-9_]*(current|strom)_(l|fase_?|phase_?)[123]$/.test(id)).sort().slice(0, 3);
      return ids.filter((id) => this.st(id)).map((id, i) => ({ id, name: (String(id).match(/([123])$/) || [])[1] ? 'L' + String(id).match(/([123])$/)[1] : 'L' + (i + 1), a: this.n(id) }));
    }

    /** Enheter med effektmåling, gruppert på rom */
    _devices() {
      const c = this.config, minW = Number(c.min_w) || 0;
      const skjul = (c.skjul || []).map(glob);
      const hidden = (id) => !!id && skjul.some((re) => re.test(id));
      const watt = (id) => { const v = this.n(id); if (v == null) return null; return String(this.unit(id)).toLowerCase() === 'kw' ? v * 1000 : v; };
      const rooms = KD.rooms(c.rom && !Array.isArray(c.rom) ? c.rom : null);
      const clean = (s, room) => {
        s = String(s || '').replace(/\s+(power|effekt|current power|strøm|forbruk)$/i, '').trim();
        if (room && s.toLowerCase().startsWith(room.toLowerCase() + ' ')) s = s.slice(room.length + 1);
        return s ? s[0].toUpperCase() + s.slice(1) : s;
      };
      const list = [];
      const add = (roomName, ctl, pow, o = {}, rid = null) => {
        if (hidden(ctl) || hidden(pow)) return;
        if (!this.st(ctl) && !this.st(pow)) return;
        const name = o.navn || clean(this.fname(ctl && this.st(ctl) ? ctl : pow), roomName);
        const w = pow ? watt(pow) : null;
        const sw = ctl && /^(switch|fan|light|input_boolean)\./.test(ctl) ? this.v(ctl) : null;
        const on = sw === 'off' ? false : w != null ? w >= minW : sw === 'on';
        const rIcon = (rid && rooms[rid] && rooms[rid].ikon) || iconFor(roomName, 'meeting_room');
        list.push({ id: `${roomName}|${ctl || pow}`, room: roomName, rIcon, ctl, pow, name, icon: o.ikon || iconFor(`${ctl || ''} ${pow || ''} ${name}`), w: w != null ? Math.round(w) : null, on });
      };
      if (Array.isArray(c.enheter) && c.enheter.length) {
        for (const e of c.enheter) add(e.rom || 'Hjem', e.bryter || e.entity || null, e.effekt || null, e);
        return list;
      }
      const all = this.all();
      let ids = Array.isArray(c.rom) ? c.rom.slice() : Object.keys(all).filter((id) => /^sensor\..+_oversikt$/.test(id) && all[id].attributes && Array.isArray(all[id].attributes.brytere)).map((id) => id.slice(7, -9));
      ids = ids.filter((id) => id !== 'totalt' && (all[`sensor.${id}_oversikt`] || {}).attributes?.area_id !== 'totalt');
      for (const rid of ids) {
        const ov = this.st(`sensor.${rid}_oversikt`); if (!ov) continue;
        const at = ov.attributes;
        const rn = (rooms[rid] && rooms[rid].navn) || String(at.friendly_name || rid).replace(/\s*oversikt$/i, '').trim();
        // Rekkefølgen følger rommets effektsensorer (ki_rom `effekt`), så brytere og termostater står slik de er satt opp
        const order = Array.isArray(at.effekt) ? at.effekt : [];
        const pos = (p) => { const i = order.indexOf(p); return i < 0 ? 1e6 : i; };
        const items = [...(at.brytere || []), ...(at.klima || []), ...(at.vifter || [])].filter((d) => d && d.effekt).map((d) => [d.entity, d.effekt])
          .concat((at.effekt_andre || []).map((p) => [null, p]));
        items.map((x, i) => [x, i]).sort((x, y) => (pos(x[0][1]) - pos(y[0][1])) || (x[1] - y[1])).forEach(([[ctl, pow]]) => add(rn, ctl, pow, {}, rid));
      }
      if (!list.length) for (const [ctl, pow, rn] of FALLBACK) add(rn, ctl, pow);
      return list;
    }

    /** Logbok for enhetenes brytere (siste døgn) */
    _log(devices, spot, nowH, today) {
      const c = this.config;
      const ids = [...new Set(devices.map((d) => d.ctl).filter((id) => id && /^(switch|fan|light|input_boolean|climate)\./.test(id)))];
      const byId = Object.fromEntries(devices.filter((d) => d.ctl).map((d) => [d.ctl, d]));
      const end = this.now(), start = new Date(end - 24 * 3600e3);
      const key = `kd-strom-log|${ids.join(',')}`;
      const raw = ids.length ? this.cached(key, 60e3, () => this.ws({ type: 'logbook/get_events', start_time: start.toISOString(), end_time: end.toISOString(), entity_ids: ids }), []) : [];
      const ev = [], lastOn = {};
      const list = (Array.isArray(raw) ? raw : []).slice().sort((x, y) => (x.when > y.when ? 1 : -1));
      const NORGES = this._kr(this.P.fast);
      for (const e0 of list) {
        // Termostater: alt annet enn «off» (heat/auto …) regnes som på
        const e = /^climate\./.test(e0.entity_id) && e0.state && e0.state !== 'off' && !KD.BAD.has(e0.state) ? { ...e0, state: 'on' } : e0;
        if (e.state === 'on') lastOn[e.entity_id] = e.when;
        if (e.state !== 'on' && e.state !== 'off') continue;
        const d = byId[e.entity_id]; const name = d ? d.name : (e.name || e.entity_id);
        const cname = e.context_entity_id_name || e.context_name || '';
        const who = e.context_domain === 'automation' && cname ? `Automasjon · ${cname.toLowerCase()}` : cname ? cname : e.context_user_id ? 'Manuelt' : (d ? d.room : '');
        const room = d && d.room && !name.toLowerCase().includes(d.room.toLowerCase()) ? ' ' + d.room.toLowerCase() : '';
        const t = new Date((typeof e.when === 'number' ? e.when * 1000 : e.when));
        // Vaskemaskin/oppvask som går av = programmet er ferdig
        if (d && /dishwasher|laundry/.test(d.icon)) {
          if (e.state !== 'off') continue;
          // Energi i programmet: effekthistorikk fra forrige «på» til «av»
          let w = who;
          const t0 = lastOn[e.entity_id];
          if (t0 != null && d.pow) {
            const s0 = new Date(typeof t0 === 'number' ? t0 * 1000 : t0);
            const kwh = this.cached(`kd-strom-cyc|${d.pow}|${s0.getTime()}|${t.getTime()}`, 12 * 3600e3, () => this.ws({ type: 'history/history_during_period', start_time: s0.toISOString(), end_time: t.toISOString(), entity_ids: [d.pow], minimal_response: true, no_attributes: true, significant_changes_only: false })
              .then((r) => {
                const pts = ((r && r[d.pow]) || []).map((p) => [(p.lu || p.lc) * 1000, parseFloat(p.s)]).filter((p) => !isNaN(p[1])).sort((x, y) => x[0] - y[0]);
                let wh = 0; for (let i = 0; i < pts.length; i++) { const tA = Math.max(pts[i][0], s0.getTime()), tB = i + 1 < pts.length ? pts[i + 1][0] : t.getTime(); if (tB > tA) wh += pts[i][1] * (tB - tA) / 3600e3; }
                return wh / 1000;
              }), null);
            if (kwh != null) { const pr = NORGES != null ? NORGES : (today && today[s0.getHours()] != null ? today[s0.getHours()] : null); w = `${nf(kwh, 1)} kWh${pr != null ? ` · ${nf(kwh * pr, 2)} kr` : ''}`; }
          }
          ev.push({ t, text: `${name} ferdig`, who: w, kind: 'ok', icon: d.icon });
          continue;
        }
        ev.push({ t, text: e.state === 'on' ? `${name} slått på` : `${name}${room} av`, who, kind: e.state, icon: d ? d.icon : null });
      }
      // Spotpris over varselgrensen (siste gang den krysset i dag)
      const lim = Number(c.spot_varsel);
      if (spot && lim) {
        for (let h = nowH; h >= 0; h--) {
          if (spot[h] != null && spot[h] > lim && (h === 0 || spot[h - 1] == null || spot[h - 1] <= lim)) {
            const d = this.now(); d.setHours(h, 0, 0, 0);
            const reg = this.P.region;
            ev.push({ t: d, text: `Spotpris over ${nfk(lim)} kr`, who: `Nord Pool${reg ? ' · ' + reg : ''}`, kind: 'alert' });
            break;
          }
        }
      }
      return ev.filter((e) => !isNaN(e.t)).sort((x, y) => y.t - x.t).slice(0, Number(c.logg_antall) || 5);
    }

    /* ---------- handlinger ---------- */
    goTab(e, k) { if (k && k !== this.state.tab) this.setState({ tab: k }); }
    goSub(e, k) { if (k && k !== this.state.sub) this.setState({ sub: k, scrub: null }); }
    cardScroll(e, arg, el) { const p = Math.round(el.scrollLeft / Math.max(1, el.clientWidth)); if (p !== this.state.page) this.setState({ page: p }); }
    togInc(e, k) { this.setState({ inc: { ...this.state.inc, [k]: this.state.inc[k] === false } }); }
    _pos(e, el) { const r = el.getBoundingClientRect(); return Math.max(0, Math.min(95, Math.round((e.clientX - r.left) / r.width * 95))); }
    scrub(e, a, el) { this.setState({ scrub: this._pos(e, el) }); }
    scrubMove(e, a, el) { if (e.buttons || e.pointerType === 'mouse') { const p = this._pos(e, el); if (p !== this.state.scrub) this.setState({ scrub: p }); } }
    scrubEnd() { if (this.state.scrub != null) this.setState({ scrub: null }); }
    goToday() { this.setState({ dayOff: 0, hourSel: null }); }
    dayPrev() { this.setState({ dayOff: this.state.dayOff - 1, hourSel: null }); }
    dayNext() { if (this.state.dayOff < 0) this.setState({ dayOff: this.state.dayOff + 1, hourSel: null }); }
    pickHour(e, h) { h = Number(h); this.setState({ hourSel: this.state.hourSel === h ? null : h }); }
    openBill() {
      // Strømregning-arket i Hjem (#stromregning); uten det: mer-info for regningssensoren
      if (customElements.get('kd-stromregning-card')) return this.nav('#stromregning');
      if (this._billId) this.more(this._billId);
    }
    openRoom(e, r) { const o = { ...(this.state.open || {}) }; o[r] = !o[r]; this.setState({ open: o }); }
    tapDev(e, id) {
      const d = (this._devs || []).find((x) => x.id === id); if (!d) return;
      if (d.ctl && /^(switch|fan|light|input_boolean)\./.test(d.ctl)) this.toggle(d.ctl); else this.more(d.ctl || d.pow);
    }
    holdDev(e, id) { const d = (this._devs || []).find((x) => x.id === id); if (d) this.more(d.ctl || d.pow); }
    fixHeater() {
      const id = this._heaterId; if (!id) return;
      if (this.isOn('binary_sensor.ki_vvb_boost_aktiv')) this.call('ki_energi', 'vvb_avbryt_boost', {});
      this.call('switch', 'turn_off', { entity_id: id });
    }
    fixRooms() { const el = this.$('[data-kd-rom]'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    /** Fanevelgerne har innholdsbredde (som i designet): legg boblen over valgt knapp */
    afterRender() {
      this._segFix();
      // mål på nytt når fontene er lastet (bredden på knappene endres)
      if (!this._fontWait && document.fonts && document.fonts.status !== 'loaded') { this._fontWait = true; document.fonts.ready.then(() => { this._fontWait = false; this._segFix(); }); }
    }
    _segFix() {
      if ((this.faneOpts() || {}).bredde) return;
      for (const el of this.$$('[data-seg^="strom-"]')) {
        const th = el.querySelector('[data-seg-thumb]'), b = el.querySelectorAll('[data-seg-b]')[+el.getAttribute('data-seg-i')];
        if (!th || !b || !b.offsetWidth) continue;
        const r0 = el.getBoundingClientRect(), r = b.getBoundingClientRect(), sc = el.offsetWidth ? r0.width / el.offsetWidth : 1;
        th.style.left = ((r.left - r0.left) / sc - el.clientLeft) + 'px'; th.style.width = (r.width / sc) + 'px';
      }
    }

    /* ---------- render ---------- */
    body() {
      const s = this.state, c = this.config, P = this.P;
      const d = this.now(), nowH = d.getHours() + d.getMinutes() / 60, nowQ = Math.min(95, Math.floor(nowH * 4)), nowHi = Math.floor(nowH);
      const M = this._model();
      const prToday = M.series('today'), prTom = M.series('tomorrow');
      const hrToday = this._hourly(prToday);
      const spotH = this._hourly(M.S.today) || this._hourly(M.T.today);
      const watt = this.n(c.effekt);
      const pNow = prToday && prToday[nowQ] != null ? prToday[nowQ] : this._kr(P.prisNa) ?? this._kr(P.pris);
      const U = this._use(nowHi);
      const kwhToday = U ? U.total : null;
      const krToday = U && U.use && hrToday ? U.use.reduce((t, k, h) => t + (k != null && hrToday[h] != null ? k * hrToday[h] : 0), 0) : null;
      const NORGES = this._kr(P.fast);
      const FAST = P.fast_navn || 'Norgespris';

      // ---- nivå (spotpris nå mot resten av dagen) ----
      const sk = (spotH || []).filter((v) => v != null).sort((x, y) => x - y);
      const lo = sk.length ? sk[Math.floor(sk.length / 3)] : null, hi = sk.length ? sk[Math.floor(sk.length * 2 / 3)] : null;
      const lvl = (v) => (v == null || lo == null ? ['–', '#8e8d89'] : v <= lo ? ['billig', C.green] : v >= hi ? ['dyr', C.red] : ['middels', C.amber]);
      const [lvlLabel, lvlCol] = lvl(spotH ? spotH[nowHi] : null);
      const sMin = sk.length ? sk[0] : null, sMax = sk.length ? sk[sk.length - 1] : null;
      const heroCard = { position: 'relative', height: 184, borderRadius: 28, overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)', transition: 'background 1s',
        background: lvlLabel === 'dyr' ? 'linear-gradient(180deg, #2a1a1c, #3a2226 70%, #4a2a2c)' : lvlLabel === 'billig' ? 'linear-gradient(180deg, #16241e, #1d3028 70%, #243a30)' : 'linear-gradient(180deg, #26211a, #332b1f 70%, #413524)' };
      const w0 = watt != null ? watt : 0;
      const sparks = SPARKS.map(([x, del], i) => ({ position: 'absolute', left: `${x}%`, bottom: -4, width: i % 3 ? 2 : 3, height: i % 3 ? 2 : 3, borderRadius: 2, background: lvlCol, boxShadow: `0 0 6px ${lvlCol}`, animation: `kdsv-rise ${Math.max(1.6, 4.6 - w0 / 1200) + (i % 3) * 0.5}s linear ${del}s infinite` }));
      const heroBolt = { position: 'absolute', right: 86, top: 34, fontSize: 38, color: lvlCol, fontVariationSettings: "'FILL' 1", filter: `drop-shadow(0 0 14px ${lvlCol.startsWith('#') ? lvlCol : a(lvlCol, 0.7)})`, animation: 'kdsv-boltglow 2.4s ease-in-out infinite' };
      const spark = (spotH || Array(24).fill(null)).map((v, i) => ({ flex: 1, height: v == null || sMax == null ? 0 : `${25 + (v - sMin) / (((sMax - sMin) || 1) / 0.98) * 75}%`, borderRadius: 1, background: lvl(v)[1], opacity: i === nowHi ? 1 : i < nowHi ? 0.35 : 0.7, animation: i === nowHi ? 'kdsv-blink 1.6s ease-in-out infinite' : 'none' }));
      const spotRange = sMin != null ? `${nf(sMin, 2)}–${nf(sMax, 2)} kr` : '–';
      const lvlChip = { height: 26, padding: '0 10px 0 9px', borderRadius: 13, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', background: lvlCol.startsWith('#') ? 'rgba(255,255,255,0.08)' : a(lvlCol, 0.18), color: lvlCol };
      const lvlDot = { width: 7, height: 7, borderRadius: 4, background: lvlCol };

      const segOpts = (margin) => ({ pink: true, h: 38, r: 22, bg: 'transparent', style: `align-self:center;margin:${margin};box-shadow:inset 0 0 0 1px rgba(255,255,255,0.14);column-gap:2px;grid-template-columns:repeat(3,auto)` });
      const tabs = KD.segHTML('strom-tab', [['pris', 'Priser'], ['bruk', 'Forbruk'], ['kurs', 'Kurser']], s.tab, 'goTab', segOpts('4px 0'));

      const card = (x) => `<div${x.more ? ` data-more="${KD.e(x.more)}"` : ''}${x.go ? ` data-on-click="${x.go}" role="button" class="kd-sv-press"` : ''} style="height:150px;box-sizing:border-box;padding:14px 16px 16px;border-radius:28px;background:#1c1c1f;display:flex;flex-direction:column;justify-content:space-between${x.go ? ';cursor:pointer;text-align:left' : ''}">
                  <span style="width:44px;height:44px;border-radius:22px;background:#262629;display:grid;place-items:center;color:#c9c7c2"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">${E(x.icon)}</span></span>
                  <div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:12px;color:#8e8d89">${E(x.label)}</span><div style="display:flex;align-items:baseline;gap:4px;white-space:nowrap"><span style="font-size:32px;font-weight:300;letter-spacing:-0.03em;line-height:1.05;font-variant-numeric:tabular-nums">${E(x.value)}</span><span style="font-size:12px;color:#8e8d89">${E(x.unit)}</span></div></div>
                </div>`;

      let pris = '', bruk = '', kurs = '';
      /* ================= PRISER ================= */
      if (s.tab === 'pris') {
        const billId = this._billId = this._first(c.regning, 'sensor.total_stromregning_maned_norgespris', 'sensor.manedlig_forbruk_akkumulert_stromkostnad', 'sensor.stromregning_estimate', 'sensor.um_monthly_cost_strommaler');
        const minToday = prToday ? Math.min(...prToday.filter((v) => v != null)) : null;
        const maxToday = prToday ? Math.max(...prToday.filter((v) => v != null)) : null;
        const pages = [[{ icon: 'bolt', label: 'Pris nå', value: pNow != null ? nf(pNow, 2) : '–', unit: 'kr/kWh', more: P.pris },
          billId ? { icon: 'receipt_long', label: `Strømregning ${MONTHS[d.getMonth()]}`, value: nf(this._kr(billId)), unit: 'kr', go: 'openBill', more: billId }
            : { icon: 'receipt_long', label: 'Kostnad i dag', value: krToday != null ? nf(krToday) : '–', unit: 'kr', go: customElements.get('kd-stromregning-card') ? 'openBill' : null }],
        [{ icon: 'trending_down', label: 'Billigst i dag', value: minToday != null && isFinite(minToday) ? nf(minToday, 2) : '–', unit: 'kr/kWh' },
          NORGES != null || P.fast ? { icon: 'shield', label: FAST, value: NORGES != null ? nf(NORGES, 2) : '–', unit: 'kr/kWh', more: P.fast }
            : { icon: 'trending_up', label: 'Dyrest i dag', value: maxToday != null && isFinite(maxToday) ? nf(maxToday, 2) : '–', unit: 'kr/kWh' }]];
        const cardDots = pages.map((_, i) => ({ width: 8, height: 8, borderRadius: 4, background: i === s.page ? '#8e8d89' : '#3a3a3d', transition: 'background .2s' }));
        const subTabs = KD.segHTML('strom-sub', [['today', 'Time for time'], ['tom', 'I morgen'], ['ex', 'Eksempler']], s.sub, 'goSub', segOpts('2px 0'));

        let chart = '';
        if (s.sub !== 'ex') {
          const isTom = s.sub === 'tom';
          const pr = (isTom ? prTom : prToday) || Array(96).fill(null);
          const ore = pr.map((v) => (v == null ? null : v * 100));
          const known = ore.filter((v) => v != null);
          const mn = known.length ? Math.floor(Math.min(...known) / 10) * 10 : 0, mx0 = known.length ? Math.ceil(Math.max(...known) / 10) * 10 : 100, mx = mx0 > mn ? mx0 : mn + 10;
          const X = (i) => (i / 95 * 300).toFixed(1), Y = (v) => (100 - (v - mn) / (mx - mn) * 100).toFixed(1);
          const pts = ore.map((v, i) => (v == null ? null : `${X(i)},${Y(v)}`)).filter(Boolean);
          const line = pts.join(' ');
          const firstI = ore.findIndex((v) => v != null), lastI = ore.length - 1 - [...ore].reverse().findIndex((v) => v != null);
          const area = pts.length ? `${X(firstI)},100 ${line} ${X(lastI)},100` : '';
          let sel = s.scrub != null ? s.scrub : (!isTom ? nowQ : null);
          if (sel != null && ore[sel] == null) sel = null;
          const hhmm = (i) => `${hh(Math.floor(i / 4))}:${hh((i % 4) * 15)}`;
          const hint = sel != null ? `${hhmm(sel)} · ${nf(pr[sel], 2)} kr` : known.length ? `snitt ${nf(known.reduce((x, y) => x + y, 0) / known.length / 100, 2)} kr` : isTom ? 'kommer ca. kl. 13' : '–';
          const yTicks = [0, 1, 2, 3].map((k) => ({ label: nf(mx - (mx - mn) * k / 3), line: { position: 'absolute', left: 0, right: 0, top: `${k / 3 * 100}%`, borderTop: k === 3 ? '1px solid #3a3a3d' : '1px dashed #2e2e32' } }));
          const nowLine = sel == null ? {} : { position: 'absolute', top: 0, bottom: 0, left: `${sel / 95 * 100}%`, borderLeft: `1px dashed ${C.amber}`, pointerEvents: 'none' };
          const nowDot = sel == null ? {} : { position: 'absolute', left: -6, top: `calc(${Y(ore[sel])}% - 5px)`, width: 10, height: 10, borderRadius: 5, background: '#f4f3ef', boxShadow: `0 0 0 3px ${a(C.blue, 0.5)}` };
          chart = `<div data-key="strom-chart" style="position:relative;height:290px;box-sizing:border-box;border-radius:28px;background:#1c1c1f">
          <div style="position:absolute;left:16px;right:16px;top:14px;display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:12px;color:#8e8d89;white-space:nowrap">${E(`${isTom ? 'I morgen' : 'I dag'} · øre/kWh`)}<span style="color:#f2f1ee;font-variant-numeric:tabular-nums">${E(hint)}</span></div>
          <div style="position:absolute;left:52px;right:14px;top:44px;bottom:36px">
            ${yTicks.map((y) => `<div style="${KD.S(y.line)}"><span style="position:absolute;right:calc(100% + 8px);top:-7px;font-size:10px;color:#8e8d89;font-variant-numeric:tabular-nums">${E(y.label)}</span></div>`).join('')}
            <svg viewBox="0 0 300 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible">
              <polyline points="${area}" fill="oklch(0.8 0.12 250 / 0.1)" stroke="none"></polyline>
              <polyline points="${line}" fill="none" stroke="oklch(0.8 0.12 250)" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"></polyline>
            </svg>
            ${sel != null ? `<div style="${KD.S(nowLine)}"><span style="position:absolute;left:-12px;top:-4px;height:24px;width:24px;border-radius:6px;background:oklch(0.82 0.12 75);color:#2a1d08;font-size:9px;font-weight:600;display:grid;place-items:center;writing-mode:vertical-rl;transform:rotate(180deg)">Nå</span><span style="${KD.S(nowDot)}"></span></div>` : ''}
            <div data-on-pointerdown="scrub" data-on-pointermove="scrubMove" data-on-pointerleave="scrubEnd" style="position:absolute;inset:0;touch-action:none;cursor:crosshair"></div>
            <div style="position:absolute;left:0;right:0;top:calc(100% + 10px);display:flex;justify-content:space-between;font-size:10px;color:#8e8d89"><span>00</span><span>04</span><span>08</span><span>12</span><span>16</span><span>20</span><span>24</span></div>
          </div>
        </div>`;
        }
        let examples = '';
        if (s.sub === 'ex') {
          const H = hrToday || Array(24).fill(null);
          examples = `<div data-key="strom-ex" style="border-radius:28px;background:#1c1c1f;padding:6px 16px">
          ${EX.map(([icon, name, sub, kwh, dur], i) => {
            let best = null, bh = 0;
            for (let h = nowHi; h <= 24 - dur; h++) { const win = H.slice(h, h + dur); if (win.some((v) => v == null)) continue; const cst = win.reduce((x, y) => x + y, 0) / dur; if (best == null || cst < best) { best = cst; bh = h; } }
            const row = { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' };
            return `<div style="${KD.S(row)}">
              <span style="width:40px;height:40px;border-radius:20px;background:#262629;display:grid;place-items:center;flex:none;color:#c9c7c2"><span class="ms" style="font-size:20px">${E(icon)}</span></span>
              <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:14px;font-weight:500">${E(name)}</span><span style="font-size:11px;color:#8e8d89">${E(sub)}</span></span>
              <span style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;white-space:nowrap"><span style="font-size:14px;font-weight:500;font-variant-numeric:tabular-nums">${E(pNow != null ? nf(kwh * pNow, 2) : '–')} kr</span><span style="font-size:11px;color:oklch(0.8 0.12 150);font-variant-numeric:tabular-nums">${E(best != null ? `${nf(kwh * best, 2)} kr kl. ${hh(bh)}` : '–')}</span></span>
            </div>`;
          }).join('')}
        </div>`;
        }
        const incRow = (k, icon, label) => {
          const on = s.inc[k] !== false;
          const style = { height: 64, borderRadius: 32, padding: '0 16px 0 8px', display: 'flex', alignItems: 'center', gap: 12, background: on ? PINK : '#1c1c1f', color: on ? '#2a1720' : '#f2f1ee' };
          const iconWrap = { width: 48, height: 48, borderRadius: 24, flex: 'none', display: 'grid', placeItems: 'center', background: on ? 'rgba(42,23,32,0.12)' : '#262629' };
          return `<button class="kd-sv-press" data-on-click="togInc" data-arg="${k}" style="${KD.S(style)}">
            <span style="${KD.S(iconWrap)}"><span class="ms" style="font-size:22px">${E(icon)}</span></span>
            <span style="display:flex;flex-direction:column;gap:1px;text-align:left;min-width:0"><span style="font-size:14px;font-weight:600;white-space:nowrap">${E(label)}</span><span style="font-size:11px;opacity:0.75;white-space:nowrap">${E(on ? 'Inkludert' : 'Ikke inkludert')}</span></span>
          </button>`;
        };
        pris = `<div data-key="strom-pris" data-lay="Priser" data-lay-navn="Priser" style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;flex-direction:column;gap:10px;align-items:center">
        <div data-hs="1" data-on-scroll="cardScroll" style="width:100%;display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none">
          ${pages.map((pg) => `<div style="flex:none;width:100%;scroll-snap-align:start;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">${pg.map(card).join('')}</div>`).join('')}
        </div>
        <div style="display:flex;gap:7px;height:8px;align-items:center">${cardDots.map((x) => `<span style="${KD.S(x)}"></span>`).join('')}</div>
      </div>
      ${subTabs}
      ${chart}${examples}
      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
        ${incRow('net', 'electric_meter', 'Nettleie')}${incRow('co', 'storefront', 'Strømselskap')}${incRow('vat', 'account_balance', 'Moms')}
      </div>
    </div>`;
      }

      /* ================= FORBRUK ================= */
      if (s.tab === 'bruk') {
        const srcs = this._sources();
        const Y = this._year();
        const mKr = this._kr(this._first(c.kostnad_maned, 'sensor.um_monthly_cost_strommaler_norgespris', 'sensor.manedlig_forbruk_akkumulert_stromkostnad', 'sensor.total_stromregning_maned_norgespris', 'sensor.um_monthly_cost_strommaler'));
        const yId = this._first(c.kostnad_ar, 'sensor.total_stromregning_ar_med_historikk_norgespris');
        const sums = [['I dag', kwhToday, krToday, c.energi_i_dag], [MONTHS_FULL[d.getMonth()], Y ? Y.month : null, mKr, null], [String(d.getFullYear()), Y ? Y.year : null, yId ? this._kr(yId) : null, yId]];
        const off = s.dayOff, dd = new Date(d); dd.setDate(d.getDate() + off);
        let dayUse, dayPrice, srcKwh;
        if (off === 0) {
          dayUse = U && U.use ? U.use.map((v, i) => (i <= nowHi ? v : null)) : Array(24).fill(null);
          dayPrice = hrToday || Array(24).fill(null);
          srcKwh = Object.fromEntries(srcs.map((x) => [x.id, this.n(x.id)]));
        } else {
          const D = this._day(off, srcs.map((x) => x.id));
          dayUse = D ? D.use : Array(24).fill(null); dayPrice = D ? D.price : Array(24).fill(null); srcKwh = D ? D.src : {};
        }
        const dayKwh = dayUse.reduce((x, y) => x + (y || 0), 0);
        const dayKr = dayUse.reduce((x, y, i) => x + (y || 0) * (dayPrice[i] || 0), 0);
        const hasKr = dayPrice.some((v) => v != null);
        const kMax = Math.max(2.5, Math.ceil(Math.max(0, ...dayUse.filter((v) => v != null)) * 2) / 2);
        const useCards = [{ icon: 'home', label: 'Forbruk nå', value: watt != null ? nf(watt) : '–', unit: 'W', more: c.effekt }, { icon: 'bolt', label: 'Dagens forbruk', value: kwhToday != null ? nf(kwhToday, 1) : '–', unit: 'kWh', more: c.energi_i_dag }];
        const nowChip = { height: 34, padding: '0 14px', borderRadius: 17, fontSize: 13, fontWeight: 600, background: off === 0 ? a(C.blue, 0.18) : '#1c1c1f', color: off === 0 ? C.blue : '#c9c7c2' };
        const nextBtn = { width: 40, height: 40, borderRadius: 20, display: 'grid', placeItems: 'center', background: '#1c1c1f', opacity: off < 0 ? 1 : 0.35 };
        const hs = s.hourSel;
        const hourHint = hs != null && dayUse[hs] != null ? `${hh(hs)}–${hh(hs + 1)} · ${nf(dayUse[hs], 2)} kWh` : `${nf(dayKwh, 1)} kWh · ${hasKr ? nf(dayKr) : '–'} kr`;
        const kTicks = [0, 1, 2, 3].map((k) => ({ label: nf(kMax - kMax * k / 3, 1), line: { position: 'absolute', left: 0, right: 0, top: `${k / 3 * 100}%`, borderTop: k === 3 ? '1px solid #3a3a3d' : '1px dashed #2e2e32' } }));
        const hours = dayUse.map((v, i) => ({ bar: { display: 'block', height: v == null ? 0 : `${Math.min(100, v / kMax * 100)}%`, borderRadius: 4, background: i === hs ? '#f2f1ee' : off === 0 && i === nowHi ? C.amber : a(C.blue, 0.75), transition: 'height .3s, background .2s' } }));
        const krOf = (k) => (hasKr && dayKwh > 0 && k != null ? nf(dayKr * k / dayKwh, 2) : '–');
        const known = srcs.map((x, i) => ({ ...x, i, kwh: srcKwh[x.id] != null ? Math.max(0, srcKwh[x.id]) : null })).sort((x, y) => ((y.kwh || 0) - (x.kwh || 0)) || (x.i - y.i));
        const rest = dayKwh - known.reduce((t, x) => t + (x.kwh || 0), 0);
        const srcRows = [...known.map((x, k) => ({ name: x.navn, kwh: x.kwh, col: x.farge || SRC_COL[k % SRC_COL.length], more: x.id })),
          ...(srcs.length && rest > 0.005 ? [{ name: 'Øvrig forbruk', kwh: rest, col: '#8e8d89' }] : []),
          { name: 'Strømnett totalt', kwh: dayKwh, col: null, bold: true, more: c.energi_i_dag }];
        const srcRow = { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 72px 72px', gap: 8, alignItems: 'center', fontSize: 13, padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.05)' };
        bruk = `<div data-key="strom-bruk" data-lay="Forbruk" data-lay-navn="Forbruk" style="display:flex;flex-direction:column;gap:12px">
      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">${useCards.map(card).join('')}</div>
      <div style="border-radius:28px;background:#1c1c1f;padding:6px 16px">
        ${sums.map(([label, kwh, kr, more], i) => `<div${more ? ` data-more="${KD.e(more)}"` : ''} style="${KD.S({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' })}"><span style="font-size:14px;color:#c9c7c2">${E(label)}</span><span style="font-size:14px;font-variant-numeric:tabular-nums;white-space:nowrap">${E(kwh != null ? nf(kwh, i ? 0 : 1) : '–')} kWh <span style="color:#8e8d89">· ${E(kr != null ? nf(kr) : '–')} kr</span></span></div>`).join('')}
      </div>
      <div style="display:flex;align-items:center;gap:8px;padding:4px 2px 0">
        <span class="ms" style="font-size:22px;color:#c9c7c2">calendar_today</span>
        <span style="flex:1;font-size:18px;font-weight:500">${E(`${dd.getDate()}. ${MONTHS[dd.getMonth()]}${off === 0 ? ' · i dag' : ''}`)}</span>
        <button data-on-click="goToday" style="${KD.S(nowChip)}">Nå</button>
        <button data-on-click="dayPrev" style="width:40px;height:40px;border-radius:20px;display:grid;place-items:center;background:#1c1c1f"><span class="ms" style="font-size:22px">chevron_left</span></button>
        <button data-on-click="dayNext" style="${KD.S(nextBtn)}"><span class="ms" style="font-size:22px">chevron_right</span></button>
      </div>
      <div style="position:relative;height:250px;box-sizing:border-box;border-radius:28px;background:#1c1c1f">
        <div style="position:absolute;left:16px;right:16px;top:14px;display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:12px;color:#8e8d89;white-space:nowrap"><span>kWh per time</span><span style="color:#f2f1ee;font-variant-numeric:tabular-nums">${E(hourHint)}</span></div>
        <div style="position:absolute;left:44px;right:14px;top:44px;bottom:36px">
          ${kTicks.map((y) => `<div style="${KD.S(y.line)}"><span style="position:absolute;right:calc(100% + 8px);top:-7px;font-size:10px;color:#8e8d89;font-variant-numeric:tabular-nums">${E(y.label)}</span></div>`).join('')}
          <div style="position:absolute;inset:0;display:flex;gap:2px;align-items:flex-end">
            ${hours.map((x, i) => `<button data-on-click="pickHour" data-arg="${i}" style="flex:1;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end"><span style="${KD.S(x.bar)}"></span></button>`).join('')}
          </div>
          <div style="position:absolute;left:0;right:0;top:calc(100% + 10px);display:flex;justify-content:space-between;font-size:10px;color:#8e8d89"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
        </div>
      </div>
      <div style="border-radius:28px;background:#1c1c1f;padding:14px 16px 8px;display:flex;flex-direction:column">
        <div style="display:grid;grid-template-columns:minmax(0,1fr) 72px 72px;gap:8px;font-size:12px;color:#8e8d89;padding-bottom:6px"><span>Kilde</span><span style="text-align:right">Energi</span><span style="text-align:right">Kostnad</span></div>
        ${srcRows.map((r) => `<div${r.more ? ` data-more="${KD.e(r.more)}"` : ''} style="${KD.S(srcRow)}">
            <span style="display:flex;align-items:center;gap:10px;min-width:0"><span style="${KD.S({ width: 10, height: 10, borderRadius: r.col ? 5 : null, background: r.col, flex: 'none' })}"></span><span style="${KD.S({ fontSize: 13, fontWeight: r.bold ? 600 : null })}">${E(r.name)}</span></span>
            <span style="text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap">${E(r.kwh != null ? nf(r.kwh, 2) : '–')} kWh</span>
            <span style="text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap">${E(krOf(r.kwh))} kr</span>
          </div>`).join('')}
      </div>
    </div>`;
      }

      /* ================= KURSER ================= */
      const devices = this._devs = this._devices();
      if (s.tab === 'kurs') {
        const A = Number(c.hovedsikring) || 40, NF = Number(c.faser_antall) || 3;
        const mainPct = watt != null ? Math.round(watt / (NF === 1 ? 230 * A : 230 * A * NF * 0.58) * 100) : null;
        const phases = this._phases().map((p) => ({ ...p, bar: { display: 'block', height: '100%', width: `${p.a != null ? Math.min(100, p.a / A * 100) : 0}%`, borderRadius: 5, background: p.a != null && p.a > A * 0.8 ? C.red : C.green, transition: 'width .6s' } }));
        const minW = Number(c.min_w) || 0;
        const canSw = (x) => !!x.ctl && /^(switch|fan|light|input_boolean)\./.test(x.ctl);
        const onW = (x) => (x.on && x.w != null ? x.w : 0);
        const wOf = (ids) => { let t = null; for (const id of [].concat(ids || [])) { const v = this.n(id); if (v != null) t = (t || 0) + (String(this.unit(id)).toLowerCase() === 'kw' ? v * 1000 : v); } return t; };
        const iconWrap = (on) => ({ width: 48, height: 48, borderRadius: 24, flex: 'none', display: 'grid', placeItems: 'center', background: '#262629', color: on ? '#f2f1ee' : '#6d6c69' });
        const barCol = (f) => (f > 0.8 ? C.red : f > 0.5 ? C.amber : C.blue);
        let circuits;
        if (Array.isArray(c.kurser) && c.kurser.length) {
          circuits = c.kurser.map((k, i) => {
            const w = Math.max(0, Math.round(wOf(k.effekt) || 0)), amp = Number(k.a) || 16, f = w / (amp * 230), on = w > 0;
            const ids = [].concat(k.effekt || []);
            return { key: 'k' + i, icon: k.ikon || iconFor(k.navn, 'electrical_services'), name: k.navn || this.fname(ids[0]), w, on, more: ids[0],
              sub: `${amp} A${k.fase ? ` · ${k.fase}` : ''}${on ? ` · ${Math.round(f * 100)} % av kursen` : ' · ingen last'}`, f, col: barCol(f) };
          });
        } else {
          const list = [...new Set(devices.map((x) => x.room))].map((room, i) => {
            const ds = devices.filter((x) => x.room === room).map((x, j) => [x, j]).sort((x, y) => (onW(y[0]) - onW(x[0])) || ((y[0].on ? 1 : 0) - (x[0].on ? 1 : 0)) || (x[1] - y[1])).map((x) => x[0]);
            return { room, i, list: ds, icon: ds[0].rIcon, w: ds.reduce((t, x) => t + onW(x), 0), on: ds.filter((x) => x.on).length };
          }).sort((x, y) => (y.w - x.w) || (y.on - x.on) || (x.i - y.i));
          const devSum = list.reduce((t, r) => t + r.w, 0), houseW = Math.max(devSum, watt || 0);
          circuits = list.map((r) => {
            const f = houseW > 0 ? r.w / houseW : 0;
            return { key: 'r-' + r.room, room: r.room, list: r.list, icon: r.icon, name: r.room, w: r.w, on: r.w > 0, f, col: C.blue,
              sub: `${r.on} av ${r.list.length} på${r.w > 0 ? ` · ${Math.round(f * 100)} % av huset` : ' · ingen last'}` };
          });
        }
        const devRow = (x, roomW) => {
          const sw = canSw(x), isOn = !!x.on, w = x.w, swOn = sw && this.v(x.ctl) === 'on';
          const val = w != null && (isOn || w > 0 || swOn) ? nf(w) : isOn ? 'På' : 'Av';
          const sub = isOn && w != null && roomW > 0 ? `${Math.round(w / roomW * 100)} % av rommet` : isOn ? (w != null && w < minW ? 'Standby' : 'På') : swOn ? (w ? `Standby · ${nf(w)} W` : 'Standby') : w != null && w > 0 ? `Standby · ${nf(w)} W` : (/^climate\./.test(x.ctl || '') ? 'Varmer ikke' : 'Av');
          const tg = sw ? `<span style="position:relative;flex:none;width:40px;height:24px;border-radius:12px;background:${swOn ? C.amber : '#3a3a3e'};transition:background .25s;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05)">
              <span style="position:absolute;top:3px;left:${swOn ? 19 : 3}px;width:18px;height:18px;border-radius:9px;background:${swOn ? '#161618' : '#a9a7a2'};box-shadow:0 1px 3px rgba(0,0,0,0.35);transition:left .3s cubic-bezier(.34,1.4,.64,1),background .25s"></span></span>`
            : `<span class="ms" style="flex:none;width:40px;text-align:center;font-size:20px;color:#6d6c69">chevron_right</span>`;
          return `<div class="kd-sv-dev" data-key="dev-${KD.e(x.id)}" data-on-click="tapDev" data-hold="holdDev" data-arg="${KD.e(x.id)}" role="button" style="display:flex;align-items:center;gap:12px;min-width:0;padding:8px 8px 8px 6px;border-radius:20px;background:${isOn ? '#232326' : 'transparent'};transition:background .25s">
            <span style="flex:none;width:36px;height:36px;border-radius:18px;display:grid;place-items:center;background:${isOn ? a(C.amber, 0.16) : '#262629'}">
              <span class="ms" style="font-size:19px;color:${isOn ? C.amber : '#6d6c69'};font-variation-settings:'FILL' ${isOn ? 1 : 0}">${E(x.icon)}</span>
            </span>
            <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:1px">
              <span style="font-size:14px;font-weight:500;color:${isOn ? '#f2f1ee' : '#a9a7a2'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(x.name)}</span>
              <span style="font-size:11px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(sub)}</span>
            </span>
            <span style="flex:none;font-size:13px;font-variant-numeric:tabular-nums;white-space:nowrap;color:${isOn && w ? '#f2f1ee' : '#6d6c69'}">${E(val)}${w != null && (isOn || w > 0 || swOn) ? `<span style="color:#8e8d89"> W</span>` : ''}</span>
            ${tg}
          </div>`;
        };

        // Varmtvann (KI Energi-bereder eller config) og effekttrinn
        const heaterId = this._heaterId = c.varmtvann || this.at(c.bereder, 'bryter', '') || (this.st('switch.varmtvannsbereder') ? 'switch.varmtvannsbereder' : '');
        const upcoming = [...(hrToday || []).map((p, h) => [p, h]).filter(([p, h]) => p != null && h > nowHi), ...(this._hourly(prTom) || []).map((p, h) => [p, h]).filter(([p]) => p != null)];
        const nextCheap = upcoming.length ? upcoming.reduce((m, x) => (x[0] < m[0] ? x : m)) : null;
        const tier = watt != null ? watt / 1000 : null;
        const tierLim = c.effekt_grense_kw != null ? Number(c.effekt_grense_kw) : this.n('number.ki_mal_trinn_kw', 5);
        const alerts = [];
        if (heaterId && this.v(heaterId) === 'on' && pNow != null && pNow > c.middels) alerts.push({ icon: 'water_heater', text: 'Varmtvann går i dyr time', sub: `${nf(pNow, 2)} kr/kWh nå${nextCheap ? ` · billigst kl. ${hh(nextCheap[1])}` : ''}`, action: 'Utsett', fix: 'fixHeater' });
        if (tier != null && tier > tierLim) alerts.push({ icon: 'speed', text: `Over ${nfk(tierLim)} kW nå`, sub: `${nf(tier, 1)} kW · neste effekttrinn koster mer`, action: 'Se kurser', fix: 'fixRooms' });

        const log = this._log(devices, spotH, nowHi, hrToday);
        const rel = (t) => {
          const m = Math.round((d - t) / 60e3);
          if (m < 1) return 'nå'; if (m < 60) return `${m} min siden`;
          const h = Math.floor(m / 60), r = m % 60;
          return h < 6 && r ? `${h} t ${r} min siden` : `${h} t siden`;
        };
        const logHtml = log.map((e, i, arr) => {
          const col = e.kind === 'alert' ? C.red : e.kind === 'on' ? C.amber : e.kind === 'off' ? C.blue : C.green;
          const ic = e.kind === 'alert' ? 'trending_up' : e.kind === 'ok' ? 'check_circle' : (e.icon || (e.kind === 'on' ? 'power' : 'power_off'));
          const badge = e.kind === 'on' ? 'Slått på' : e.kind === 'off' ? 'Slått av' : e.kind === 'ok' ? 'Ferdig' : 'Pris';
          const last = i === arr.length - 1;
          return `<div data-key="ev-${i}" style="display:flex;gap:12px;align-items:stretch;min-width:0">
            <div style="display:flex;flex-direction:column;align-items:center;width:40px;flex:none">
              <span style="width:40px;height:40px;border-radius:20px;flex:none;display:grid;place-items:center;background:${a(col, 0.14)}">
                <span class="ms" style="font-size:20px;color:${col};font-variation-settings:'FILL' 1">${E(ic)}</span>
              </span>
              <span style="flex:1;width:2px;min-height:10px;margin:4px 0;border-radius:1px;background:${last ? 'transparent' : `linear-gradient(${a(col, 0.35)}, rgba(255,255,255,0.06))`}"></span>
            </div>
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;padding:2px 0 ${last ? 0 : 14}px">
              <div style="display:flex;align-items:baseline;gap:10px;min-width:0">
                <div style="flex:1;min-width:0;font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(e.text)}</div>
                <div style="flex:none;font-size:11px;color:#8e8d89;font-variant-numeric:tabular-nums;white-space:nowrap">${E(KD.hm(e.t))}</div>
              </div>
              <div style="display:flex;align-items:center;gap:8px;min-width:0;font-size:11px;color:#8e8d89">
                <span style="flex:none;padding:1px 7px;border-radius:7px;font-size:10.5px;font-weight:600;letter-spacing:0.02em;color:${col};background:${a(col, 0.12)}">${E(badge)}</span>
                <span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E([rel(e.t), e.who].filter(Boolean).join(' · '))}</span>
              </div>
            </div>
          </div>`;
        }).join('');

        kurs = `<div data-key="strom-kurs" data-lay="Kurser" data-lay-navn="Kurser" style="display:flex;flex-direction:column;gap:12px">
      <div data-more="${KD.e(c.effekt)}" style="border-radius:28px;background:#1c1c1f;padding:16px;display:flex;flex-direction:column;gap:14px">
        <div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-size:13px;color:#c9c7c2;white-space:nowrap">${E(`Hovedsikring ${NF} × ${A} A`)}</span><span style="font-size:12px;color:#8e8d89;white-space:nowrap;font-variant-numeric:tabular-nums">${E(mainPct != null ? mainPct : '–')} % belastet</span></div>
        ${phases.map((p) => `<div data-more="${KD.e(p.id)}" style="display:flex;align-items:center;gap:12px">
            <span style="width:22px;font-size:12px;color:#8e8d89">${E(p.name)}</span>
            <div style="flex:1;height:10px;border-radius:5px;background:#262629;overflow:hidden"><span style="${KD.S(p.bar)}"></span></div>
            <span style="width:48px;text-align:right;font-size:13px;font-variant-numeric:tabular-nums">${E(p.a != null ? nf(p.a, 1) : '–')} A</span>
          </div>`).join('')}
      </div>
      <div data-kd-rom style="display:flex;flex-direction:column;gap:8px">
        ${circuits.map((k) => {
          const open = k.room && !!(s.open || {})[k.room];
          const bar = { display: 'block', height: '100%', width: `${Math.min(100, Math.max(k.on ? 2 : 0, k.f * 100))}%`, borderRadius: 3, background: k.col, transition: 'width .6s' };
          return `<div data-key="kurs-${KD.e(k.key)}" style="display:flex;flex-direction:column;border-radius:28px;background:#1c1c1f">
            <div${k.room ? ` data-on-click="openRoom" data-arg="${KD.e(k.room)}" role="button" class="kd-sv-dev"` : k.more ? ` data-more="${KD.e(k.more)}"` : ''} style="display:flex;align-items:center;gap:14px;padding:10px 16px 10px 10px">
              <span style="${KD.S(iconWrap(k.on))}"><span class="ms" style="font-size:22px">${E(k.icon)}</span></span>
              <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
                <div style="display:flex;justify-content:space-between;gap:8px"><span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(k.name)}</span><span style="font-size:13px;font-variant-numeric:tabular-nums;white-space:nowrap">${E(nf(k.w))} W</span></div>
                <div style="height:6px;border-radius:3px;background:#262629;overflow:hidden"><span style="${KD.S(bar)}"></span></div>
                <span style="font-size:11px;color:#8e8d89">${E(k.sub)}</span>
              </div>
            </div>
            ${open ? `<div style="display:flex;flex-direction:column;gap:2px;padding:0 8px 8px">${k.list.map((x) => devRow(x, k.w)).join('')}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
      ${alerts.map((al) => `<div style="display:flex;align-items:center;gap:12px;padding:10px 10px 10px 10px;border-radius:28px;background:oklch(0.82 0.12 75 / 0.12);box-shadow:inset 0 0 0 1px oklch(0.82 0.12 75 / 0.3)">
          <span style="width:48px;height:48px;border-radius:24px;flex:none;display:grid;place-items:center;background:oklch(0.82 0.12 75 / 0.18);color:oklch(0.82 0.12 75)"><span class="ms" style="font-size:22px">${E(al.icon)}</span></span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
            <div style="font-size:14px;font-weight:500">${E(al.text)}</div>
            <div style="font-size:11px;color:#c9c7c2">${E(al.sub)}</div>
          </div>
          <button data-on-click="${al.fix}" style="height:38px;padding:0 16px;border-radius:19px;background:oklch(0.82 0.12 75);color:#2a1d08;font-size:13px;font-weight:600;white-space:nowrap">${E(al.action)}</button>
        </div>`).join('')}
      ${log.length ? `<div style="display:flex;flex-direction:column;padding:16px;border-radius:28px;background:#1c1c1f;min-width:0;gap:12px">
        <div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-size:13px;color:#c9c7c2">Siste hendelser</span><span style="font-size:12px;color:#8e8d89;white-space:nowrap">Siste døgn</span></div>
        <div style="display:flex;flex-direction:column;min-width:0">${logHtml}</div>
      </div>` : ''}
    </div>`;
      }

      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:12px">
  <header style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:6px">
    <div style="font-size:30px;font-weight:600;letter-spacing:-0.03em">Strøm</div>
    <button data-on-click="closeSheet" style="width:44px;height:44px;border-radius:22px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:22px">close</span></button>
  </header>

  <section data-lay="Strøm nå" data-lay-navn="Strøm nå" data-more="${KD.e(c.effekt)}" style="${KD.S(heroCard)}">
    ${sparks.map((p) => `<span style="${KD.S(p)}"></span>`).join('')}
    <span class="ms" style="${KD.S(heroBolt)}">bolt</span>
    <span style="position:absolute;right:16px;top:16px;width:48px;height:48px;border-radius:24px;background:rgba(255,255,255,0.1);display:grid;place-items:center"><span class="ms" style="font-size:24px;color:#f2f1ee">electric_meter</span></span>
    <div style="position:absolute;right:14px;bottom:12px;width:132px;display:flex;flex-direction:column;gap:3px">
      <div style="display:flex;justify-content:space-between;font-size:8px;color:#8e8d89;white-space:nowrap"><span>spot i dag</span>${E(spotRange)}</div>
      <div style="position:relative;display:flex;gap:1px;align-items:flex-end;height:18px">
        ${spark.map((b) => `<span style="${KD.S(b)}"></span>`).join('')}
      </div>
    </div>
    <div style="position:absolute;left:18px;top:18px;bottom:18px;display:flex;flex-direction:column;justify-content:space-between;pointer-events:none">
      <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-start">
        <span style="font-size:13px;color:#8e8d89">Strøm</span>
        <span style="${KD.S(lvlChip)}"><span style="${KD.S(lvlDot)}"></span>Spotpris ${E(lvlLabel)}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;align-items:baseline;gap:4px;white-space:nowrap"><span style="font-size:40px;font-weight:300;letter-spacing:-0.04em;line-height:1;font-variant-numeric:tabular-nums">${E(watt != null ? nf(watt) : '–')}</span><span style="font-size:14px;color:#8e8d89">W</span></div>
        <span style="font-size:12px;color:#8e8d89;white-space:nowrap">i dag ${E(krToday != null ? nf(krToday) : '–')} kr · ${E(kwhToday != null ? nf(kwhToday, 1) : '–')} kWh</span>
      </div>
    </div>
  </section>

  ${tabs}
  ${pris}${bruk}${kurs}
</div>`;
    }
  }

  KD.define('kd-strom-card', KDStromCard, 'KD Strøm', 'Strømpriser, forbruk og kurser (Strøm v5)');
  KD.sheet('strom', 'kd-strom-card');
})();
