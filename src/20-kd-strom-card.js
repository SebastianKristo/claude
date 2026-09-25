/*
 * kd-strom-card – «Strøm v3» fra Claude Design, med ekte data.
 *
 *   Ring:        timepriser i dag / i morgen (totalpris-sensor, faller tilbake på Nord Pool) eller forbruk per time i dag
 *   Kjerne:      effekt nå (strømmåler), valgt time, eller brukt i dag
 *   Nøkkeltall:  Norgespris, spart i dag, effekt
 *   Varsler:     varmtvann i dyr time (KI Energi-bereder), effekt over ønsket trinn
 *   Rom:         enheter med effektmåling per rom, funnet automatisk fra ki_rom (sensor.<rom>_oversikt)
 *   Hendelser:   logbok for enhetenes brytere + når spotprisen passerte varselgrensen
 *
 * Minimal config:  type: custom:kd-strom-card
 */
(() => {
  const KD = window.KD;
  if (!KD || customElements.get('kd-strom-card')) return;

  // Designets egne farger (NB: gul er 100 i dette arket, ikke 95 som i grunnmuren)
  const C = { amber: 'oklch(0.82 0.12 75)', green: 'oklch(0.8 0.12 150)', yellow: 'oklch(0.86 0.12 100)', red: 'oklch(0.72 0.15 25)', blue: 'oklch(0.8 0.12 250)' };
  const a = KD.a, nf = KD.nf, hh = KD.hh;
  // Designets runtime rendrer hver {{ x }} som eget <span> – gjør det samme så flex/gap blir likt
  const E = (x) => `<span>${KD.e(x)}</span>`;
  const VIEWS = [['pris', 'Pris i dag', 'payments'], ['morgen', 'I morgen', 'event'], ['forbruk', 'Forbruk', 'bolt']];
  const num = (x) => { const v = parseFloat(x); return isNaN(v) ? null : v; };
  const intl = (n) => Math.round(n).toLocaleString('nb-NO');
  // Tall uten desimaler når det er et heltall (5 kW), ellers én (5,5 kW)
  const nfk = (n) => (n == null ? '–' : Number.isInteger(n) ? String(n) : nf(n, 1));
  const glob = (p) => new RegExp('^' + String(p).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');

  // Ikon ut fra navn/entitet (Material Symbols, som i designet)
  const ICONS = [
    [/varmtvann|bereder|water_heater|vvb/, 'water_heater'], [/gulvvarme|panelovn|ovn|oljefyr|varme|heat|climate\./, 'heat'],
    [/server|rack|nas|proxmox/, 'dns'], [/\btv\b|tv_|_tv|fjernsyn|apple ?tv/, 'tv'], [/frys|kjøl|kjol|kjøleskap|fridge|freezer/, 'kitchen'],
    [/oppvask|dishwasher/, 'dishwasher_gen'], [/vaskemaskin|washer|washing/, 'local_laundry_service'], [/tørk|tork|dryer/, 'local_laundry_service'],
    [/pult|pc|computer|datamaskin|skjerm/, 'computer'], [/elbil|lader|charger|tesla|ev_/, 'ev_station'], [/kaffe|coffee/, 'coffee_maker'],
    [/vannkoker|kettle/, 'kettle'], [/brødrister|brodrister|toaster/, 'breakfast_dining'], [/mikro|microwave/, 'microwave'],
    [/komfyr|platetopp|stove|oven/, 'cooking'], [/vifte|fan\./, 'mode_fan'], [/printer|creality|3d/, 'print'], [/lys|lamp|light\./, 'light'],
    [/håndkle|hankle|handkle/, 'dry_cleaning'], [/router|switch_poe|nettverk|unifi/, 'router'],
  ];
  const iconFor = (s) => { s = String(s || '').toLowerCase(); for (const [re, ic] of ICONS) if (re.test(s)) return ic; return 'electrical_services'; };

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
      energi_i_dag: 'sensor.strommaler_powercalc_energy_daily',            // kWh i dag (timeforbruk fra statistikk)
      pris: 'sensor.totalpris_inkludert_grid_el_company_og_stromstotte',  // totalpris per time (raw_today/raw_tomorrow)
      spotpris: 'sensor.nordpool_kwh_no1_nok_3_10_025',                   // Nord Pool (reserve for ringen + spotvarsel)
      norgespris: 'sensor.norgespris_pris_na',                             // kr/kWh
      spart_i_dag: 'sensor.norgespris_besparelse_dag',                     // kr
      bereder: 'sensor.ki_bereder',                                        // KI Energi (attr bryter)
      varmtvann: '',                                                       // tom = fra KI Energi, ellers switch.varmtvannsbereder
      effekt_grense_kw: null,                                              // tom = number.ki_mal_trinn_kw, ellers 5
      dyr: 1.5, middels: 1.1,                                              // kr/kWh-terskler for fargene
      spot_varsel: 2,                                                      // kr/kWh – «Spotpris over 2 kr» i hendelsene
      rom: null,                                                           // liste med rom-ID-er (ki_rom) – tom = alle som har effektmåling
      enheter: null,                                                       // [{navn, rom, ikon, bryter, effekt}] – overstyrer oppdagelsen
      skjul: ['sensor.strommaler_*', 'sensor.*_kurs*', 'sensor.*totalt*', 'sensor.hele_huset*', 'switch.shelly_em', 'switch.*_child_lock',
        'switch.pultvifte_*', 'switch.stavifte_*', 'switch.alarm_alarm_heimdall_2', 'switch.trappegang_roykvarsler_alarm_siren', 'switch.ringeklokke_boks'],
      min_w: 3,                                                            // under dette regnes enheten som av
      logg_antall: 5,
    };
    static sheetCss = `.kd-sv-dev{cursor:pointer}`;

    constructor() { super(); this.state = { view: 'pris', sel: null }; }
    now() { return new Date(window.__kdMockNowStrom || Date.now()); }

    /* ---------- data ---------- */
    /** 24 timepriser i kr/kWh (null der det mangler) fra raw_today/raw_tomorrow eller today/tomorrow */
    _series(id, which) {
      const s = this.st(id); if (!s) return null;
      const at = s.attributes || {};
      const unit = String(at.unit_of_measurement || at.unit || '').toLowerCase();
      let raw = at['raw_' + which];
      const out = Array(24).fill(null), cnt = Array(24).fill(0);
      const base = this.now(); base.setHours(0, 0, 0, 0);
      if (which === 'tomorrow') base.setDate(base.getDate() + 1);
      if (Array.isArray(raw) && raw.length && typeof raw[0] === 'object') {
        for (const p of raw) {
          const d = new Date(p.start); const v = num(p.value);
          if (isNaN(d) || v == null || d.toDateString() !== base.toDateString()) continue;
          const h = d.getHours(); out[h] = (out[h] || 0) + v; cnt[h]++;
        }
      } else {
        raw = at[which];
        if (!Array.isArray(raw) || !raw.length) return null;
        const per = raw.length / 24;
        raw.forEach((v, i) => { v = num(v); if (v == null) return; const h = Math.min(23, Math.floor(i / per)); out[h] = (out[h] || 0) + v; cnt[h]++; });
      }
      if (!cnt.some(Boolean)) return null;
      const vals = out.map((v, h) => (cnt[h] ? v / cnt[h] : null));
      const known = vals.filter((v) => v != null).sort((x, y) => x - y);
      const ore = unit.includes('øre') || unit.includes('ore') || (!unit.includes('kr') && !unit.includes('nok') && known[Math.floor(known.length / 2)] > 10);
      return vals.map((v) => (v == null ? null : ore ? v / 100 : v));
    }
    _prices(which) { const c = this.config; return this._series(c.pris, which) || this._series(c.spotpris, which); }
    _kr(id) { const v = this.n(id); if (v == null) return null; const u = String(this.unit(id)).toLowerCase(); return u.includes('øre') ? v / 100 : v; }

    /** Forbruk per time i dag (kWh) fra langtidsstatistikken, med inneværende time regnet fra dagens total */
    _use(nowH) {
      const id = this.config.energi_i_dag;
      if (!id || !this.st(id)) return null;
      const mid = this.now(); mid.setHours(0, 0, 0, 0);
      const key = `kd-strom-use|${id}|${mid.toDateString()}`;
      const hours = this.cached(key, 5 * 60e3, () => this.ws({ type: 'recorder/statistics_during_period', start_time: mid.toISOString(), end_time: this.now().toISOString(), statistic_ids: [id], period: 'hour', types: ['change'] })
        .then((r) => {
          const arr = (r && r[id]) || [], out = Array(24).fill(null);
          for (const p of arr) { const d = new Date(typeof p.start === 'number' ? p.start : p.start); const v = num(p.change); if (!isNaN(d) && v != null && d.toDateString() === mid.toDateString()) out[d.getHours()] = Math.max(0, v); }
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
      const add = (roomName, ctl, pow, o = {}) => {
        if (hidden(ctl) || hidden(pow)) return;
        if (!this.st(ctl) && !this.st(pow)) return;
        const name = o.navn || clean(this.fname(ctl && this.st(ctl) ? ctl : pow), roomName);
        const w = pow ? watt(pow) : null;
        const sw = ctl && /^(switch|fan|light|input_boolean)\./.test(ctl) ? this.v(ctl) : null;
        const on = sw === 'off' ? false : w != null ? w >= minW : sw === 'on';
        list.push({ id: `${roomName}|${ctl || pow}`, room: roomName, ctl, pow, name, icon: o.ikon || iconFor(`${ctl || ''} ${pow || ''} ${name}`), w: w != null ? Math.round(w) : null, on });
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
        items.map((x, i) => [x, i]).sort((x, y) => (pos(x[0][1]) - pos(y[0][1])) || (x[1] - y[1])).forEach(([[ctl, pow]]) => add(rn, ctl, pow));
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
      const NORGES = this._kr(c.norgespris);
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
            if (kwh != null) { const pr = NORGES != null ? NORGES : (today && today[s0.getHours()] != null ? today[s0.getHours()] : null); w = `${nf(kwh, 1)} kWh${pr != null ? ` · ${nf(kwh * pr)} kr` : ''}`; }
          }
          ev.push({ t, text: `${name} ferdig`, who: w, kind: 'ok' });
          continue;
        }
        ev.push({ t, text: e.state === 'on' ? `${name} slått på` : `${name}${room} av`, who, kind: e.state });
      }
      // Spotpris over varselgrensen (siste gang den krysset i dag)
      const lim = Number(c.spot_varsel);
      if (spot && lim) {
        for (let h = nowH; h >= 0; h--) {
          if (spot[h] != null && spot[h] > lim && (h === 0 || spot[h - 1] == null || spot[h - 1] <= lim)) {
            const d = this.now(); d.setHours(h, 0, 0, 0);
            const sid = c.spotpris; const reg = String(this.at(sid, 'region', '') || (String(sid).match(/_(no\d|se\d|dk\d|fi)_/i) || [])[1] || '').toUpperCase();
            ev.push({ t: d, text: `Spotpris over ${nfk(lim)} kr`, who: `Nord Pool${reg ? ' · ' + reg : ''}`, kind: 'alert' });
            break;
          }
        }
      }
      return ev.filter((e) => !isNaN(e.t)).sort((x, y) => y.t - x.t).slice(0, Number(c.logg_antall) || 5);
    }

    /* ---------- handlinger ---------- */
    pick(e, h) { h = Number(h); this.setState({ sel: this.state.sel === h ? null : h }); }
    go(e, k) { this.setState({ view: k, sel: null }); }
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

    /* ---------- render ---------- */
    body() {
      const s = this.state, c = this.config;
      const now = this.now(), NOW_H = now.getHours();
      const lvl = (p) => (p == null ? '#2a2a2d' : p > c.dyr ? C.red : p > c.middels ? C.yellow : C.green);
      const today = this._prices('today'), tmr = this._prices('tomorrow');
      const isUse = s.view === 'forbruk', isToday = s.view !== 'morgen';
      const prices = (s.view === 'morgen' ? tmr : today) || Array(24).fill(null);
      const U = this._use(NOW_H);
      const USE = U && U.use ? U.use : Array(24).fill(null);
      const usedSum = U ? U.total : null;
      const maxU = Math.max(0.01, ...USE.filter((v) => v != null));
      const NORGES = this._kr(c.norgespris);
      const watt = this.n(c.effekt);
      const pNow = (today && today[NOW_H] != null) ? today[NOW_H] : this._kr(c.pris);
      const idx = prices.map((p, h) => [p, h]).filter(([p, h]) => p != null && (!isToday || h > NOW_H));
      const cheapest = idx.length ? idx.reduce((m, x) => (x[0] < m[0] ? x : m)) : [prices[0], 0];
      const upcoming = [...(today || []).map((p, h) => [p, h, 0]).filter(([p, h]) => p != null && h > NOW_H), ...(tmr || []).map((p, h) => [p, h, 1]).filter(([p]) => p != null)];
      const nextCheap = upcoming.length ? upcoming.reduce((m, x) => (x[0] < m[0] ? x : m)) : null;
      let saved = this.n(c.spart_i_dag);
      if (saved == null && today && NORGES != null && U && U.use) saved = U.use.reduce((t, k, h) => t + (k != null && today[h] != null ? (today[h] - NORGES) * k : 0), 0);
      const sel = s.sel;
      const tier = watt != null ? watt / 1000 : null;
      const tierLim = c.effekt_grense_kw != null ? Number(c.effekt_grense_kw) : this.n('number.ki_mal_trinn_kw', 5);

      // Varmtvann (KI Energi-bereder eller config)
      const heaterId = this._heaterId = c.varmtvann || this.at(c.bereder, 'bryter', '') || (this.st('switch.varmtvannsbereder') ? 'switch.varmtvannsbereder' : '');
      const alerts = [];
      if (heaterId && this.v(heaterId) === 'on' && pNow != null && pNow > c.middels) alerts.push({ icon: 'water_heater', text: 'Varmtvann går i dyr time', sub: `${nf(pNow)} kr/kWh nå${nextCheap ? ` · billigst kl. ${hh(nextCheap[1])}` : ''}`, action: 'Utsett', fix: 'fixHeater' });
      if (tier != null && tier > tierLim) alerts.push({ icon: 'speed', text: `Over ${nfk(tierLim)} kW nå`, sub: `${nf(tier, 1)} kW · neste effekttrinn koster mer`, action: 'Se rom', fix: 'fixRooms' });

      let coreValue, coreUnit, coreSub, coreIconName, coreCol;
      if (sel != null) {
        coreIconName = 'schedule'; coreCol = '#f2f1ee';
        if (isUse) { coreValue = USE[sel] != null ? nf(USE[sel], 1) : '–'; coreUnit = 'kWh'; } else { coreValue = prices[sel] != null ? nf(prices[sel]) : '–'; coreUnit = 'kr'; }
        coreSub = `Kl. ${hh(sel)}–${hh((sel + 1) % 24)}${isToday ? '' : ' i morgen'}`;
      } else if (isUse) { coreValue = usedSum != null ? nf(usedSum, 1) : '–'; coreUnit = 'kWh'; coreSub = 'Brukt i dag'; coreIconName = 'bolt'; coreCol = C.amber; }
      else { coreValue = watt != null ? intl(watt) : '–'; coreUnit = 'W'; coreSub = isToday ? `Nå · ${nf(NORGES)} kr/kWh` : 'Bruker nå'; coreIconName = 'bolt'; coreCol = C.amber; }

      const noTmr = s.view === 'morgen' && !tmr;
      const maxP = prices.filter((p) => p != null);
      const headline = isUse ? `${nf(usedSum, 1)} kWh så langt i dag` : noTmr ? 'Ingen priser for i morgen ennå' : isToday ? (pNow == null ? 'Ingen strømpris' : pNow > c.dyr ? 'Strømmen er dyr nå' : pNow > c.middels ? 'Strømmen er middels dyr' : 'Strømmen er billig nå') : `Billigst kl. ${hh(cheapest[1])} i morgen`;
      const subline = isUse ? `${NORGES != null && usedSum != null ? nf(usedSum * NORGES) : '–'} kr med Norgespris` : noTmr ? 'Nord Pool publiserer morgendagen rundt kl. 13' : isToday ? (idx.length ? `Billigst kl. ${hh(cheapest[1])} · ${nf(cheapest[0])} kr/kWh` : '–') : `${nf(cheapest[0])} kr · dyrest kl. ${hh(prices.indexOf(Math.max(...maxP)))}`;

      const ring = prices.map((p, h) => {
        const deg = h * 15 + 7.5;
        const past = isToday && h < NOW_H, nowB = isToday && h === NOW_H, picked = sel === h;
        let col, len = 32;
        if (isUse) { const u = USE[h]; col = u != null ? C.amber : '#2a2a2d'; len = u != null ? 12 + (u / maxU) * 28 : 10; } else col = lvl(p);
        const dim = !isUse && past && p != null;
        const title = `${hh(h)}: ${isUse ? (USE[h] != null ? nf(USE[h], 1) + ' kWh' : '–') : p != null ? nf(p) + ' kr' : '–'}`;
        const style = { position: 'absolute', left: 'calc(50% - 4px)', top: `calc(50% - ${len / 2}px)`, width: 8, height: len, borderRadius: 4, transform: `rotate(${deg}deg) translateY(-${110 - (32 - len) / 2}px)`, background: dim ? a(col, 0.28) : col, boxShadow: nowB || picked ? `0 0 0 2px #141416, 0 0 0 3.5px ${picked ? '#f2f1ee' : col}, 0 0 16px ${col.startsWith('#') ? col : a(col, 0.7)}` : 'none', transition: 'background .4s, height .4s, transform .4s' };
        return `<button data-on-click="pick" data-arg="${h}" title="${KD.e(title)}" style="${KD.S(style)}"></button>`;
      }).join('');
      const ringLabels = [['00', 50, 1], ['06', 99, 50], ['12', 50, 99], ['18', 1, 50]].map(([t, x, y]) => `<span style="${KD.S({ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)', fontSize: 10, color: '#6d6c69', fontVariantNumeric: 'tabular-nums', pointerEvents: 'none' })}">${E(t)}</span>`).join('');

      const views = VIEWS.map(([k, l, ic]) => {
        const act = s.view === k;
        const st = { height: 60, borderRadius: 17, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, background: act ? a(C.amber, 0.16) : 'transparent', boxShadow: act ? `inset 0 0 0 1px ${a(C.amber, 0.45)}` : 'none', color: act ? '#f2f1ee' : '#a9a7a2', transition: 'background .25s' };
        const ist = { fontSize: 21, color: act ? C.amber : '#a9a7a2', fontVariationSettings: `'FILL' ${act ? 1 : 0}` };
        return `<button data-on-click="go" data-arg="${k}" style="${KD.S(st)}">
        <span class="ms" style="${KD.S(ist)}">${E(ic)}</span>
        <span style="font-size:12px;font-weight:500;white-space:nowrap">${E(l)}</span>
      </button>`;
      }).join('');

      const stats = [
        ['Norgespris', NORGES != null ? `${nf(NORGES)} kr` : '–', '#f2f1ee'],
        ['Spart i dag', saved != null ? `${nf(saved, 0)} kr` : '–', C.green],
        ['Effekt', tier != null ? `${nf(tier, 1)} kW` : '–', tier != null && tier > tierLim ? C.amber : '#f2f1ee'],
      ].map(([label, v, col]) => `<div style="display:flex;flex-direction:column;gap:4px;padding:12px 14px;border-radius:18px;background:#1c1c1f">
        <div style="font-size:11px;color:#8e8d89;white-space:nowrap">${E(label)}</div>
        <div style="${KD.S({ fontSize: 17, fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: col })}">${E(v)}</div>
      </div>`).join('');

      const devices = this._devs = this._devices();
      const roomNames = [...new Set(devices.map((d) => d.room))];
      const roomsHtml = roomNames.map((room, i) => {
        const list = devices.filter((d) => d.room === room);
        const w = list.filter((d) => d.on).reduce((t, d) => t + (d.w || 0), 0);
        const rowStyle = { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 4px', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' };
        const dot = { width: 7, height: 7, borderRadius: 4, flex: 'none', background: w >= 800 ? C.amber : w ? a(C.amber, 0.5) : '#48474a' };
        const devs = list.map((d) => {
          const st = { height: 32, padding: '0 11px 0 8px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', background: d.on ? a(C.amber, 0.14) : '#1f1f22', color: d.on ? '#f2f1ee' : '#8e8d89', boxShadow: d.on ? `inset 0 0 0 1px ${a(C.amber, 0.35)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)', transition: 'background .2s' };
          const ist = { fontSize: 16, color: d.on ? C.amber : '#6d6c69', fontVariationSettings: `'FILL' ${d.on ? 1 : 0}` };
          const label = d.on && d.w != null ? `${d.name} · ${intl(d.w)} W` : d.name;
          return `<button class="kd-sv-dev" data-on-click="tapDev" data-hold="holdDev" data-arg="${KD.e(d.id)}" style="${KD.S(st)}"><span class="ms" style="${KD.S(ist)}">${E(d.icon)}</span>${E(label)}</button>`;
        }).join('');
        return `<div style="${KD.S(rowStyle)}">
        <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0;padding-top:6px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="${KD.S(dot)}"></span>
            <span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(room)}</span>
          </div>
          <span style="font-size:12px;color:#8e8d89;padding-left:15px;font-variant-numeric:tabular-nums;white-space:nowrap">${E(w ? `${intl(w)} W` : 'Av')}</span>
        </div>
        <div style="flex:none;max-width:64%;display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end">${devs}</div>
      </div>`;
      }).join('');

      const spot = this._series(c.spotpris, 'today');
      const log = this._log(devices, spot, NOW_H, today);
      const logHtml = log.map((e, i, arr) => {
        const col = e.kind === 'alert' ? C.red : e.kind === 'on' ? C.amber : e.kind === 'off' ? C.blue : C.green;
        const dot = { width: 9, height: 9, borderRadius: 5, marginTop: 5, background: col, flex: 'none' };
        const line = { flex: 1, width: 1, background: i < arr.length - 1 ? 'rgba(255,255,255,0.1)' : 'transparent', marginTop: 4 };
        return `<div style="display:flex;gap:14px;align-items:stretch">
          <div style="display:flex;flex-direction:column;align-items:center;width:10px;flex:none">
            <span style="${KD.S(dot)}"></span>
            <span style="${KD.S(line)}"></span>
          </div>
          <div style="flex:1;display:flex;justify-content:space-between;gap:12px;padding-bottom:14px">
            <div style="display:flex;flex-direction:column;gap:2px">
              <div style="font-size:14px">${E(e.text)}</div>
              <div style="font-size:12px;color:#8e8d89">${E(e.who)}</div>
            </div>
            <div style="font-size:12px;color:#8e8d89;font-variant-numeric:tabular-nums">${E(KD.hm(e.t))}</div>
          </div>
        </div>`;
      }).join('');

      const coreIcon = { fontSize: 26, color: coreCol, fontVariationSettings: "'FILL' 1" };
      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,560px);min-height:100vh;margin:0 auto;background:#141416;padding:20px var(--kd-kant,10px) 28px;display:flex;flex-direction:column;gap:22px">

  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Strøm</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section style="display:flex;flex-direction:column;align-items:center;gap:20px">
    <div style="position:relative;width:260px;height:260px">
      ${ring}${ringLabels}
      <div style="position:absolute;inset:44px;border-radius:50%;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">
        <span class="ms" style="${KD.S(coreIcon)}">${E(coreIconName)}</span>
        <div style="font-size:34px;font-weight:500;letter-spacing:-0.03em;line-height:1;font-variant-numeric:tabular-nums;white-space:nowrap">${E(coreValue)}<span style="font-size:14px;color:#8e8d89;font-weight:400"> ${E(coreUnit)}</span></div>
        <div style="font-size:12px;color:#8e8d89;white-space:nowrap">${E(coreSub)}</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
      <div style="font-size:24px;font-weight:500;letter-spacing:-0.015em;text-wrap:balance">${E(headline)}</div>
      <div style="font-size:14px;color:#8e8d89">${E(subline)}</div>
    </div>
  </section>

  <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:5px;border-radius:22px;background:#1c1c1f">${views}</section>

  <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${stats}</section>

  ${alerts.length ? `<section style="display:flex;flex-direction:column;gap:8px">
      <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:oklch(0.82 0.12 75);padding:0 4px">Krever oppmerksomhet</div>
      ${alerts.map((al) => `<div style="display:flex;align-items:center;gap:12px;padding:12px 12px 12px 14px;border-radius:20px;background:oklch(0.82 0.12 75 / 0.12);box-shadow:inset 0 0 0 1px oklch(0.82 0.12 75 / 0.35)">
          <span class="ms" style="font-size:22px;color:oklch(0.82 0.12 75)">${E(al.icon)}</span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
            <div style="font-size:15px;font-weight:500">${E(al.text)}</div>
            <div style="font-size:12px;color:#c9c7c2">${E(al.sub)}</div>
          </div>
          <button data-on-click="${al.fix}" style="height:36px;padding:0 14px;border-radius:18px;background:oklch(0.82 0.12 75);color:#161618;font-size:13px;font-weight:600;white-space:nowrap">${E(al.action)}</button>
        </div>`).join('')}
    </section>` : ''}

  ${devices.length ? `<section data-kd-rom style="display:flex;flex-direction:column;gap:2px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:0 4px 8px">
      <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Rom</div>
      <div style="font-size:12px;color:#6d6c69;white-space:nowrap">${E(`${devices.filter((d) => d.on).length} av ${devices.length} på`)}</div>
    </div>
    ${roomsHtml}
  </section>` : ''}

  ${log.length ? `<section style="display:flex;flex-direction:column;gap:8px">
    <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:0 4px">Siste hendelser</div>
    <div style="display:flex;flex-direction:column;padding-left:4px">${logHtml}</div>
  </section>` : ''}
</div>`;
    }
  }

  KD.define('kd-strom-card', KDStromCard, 'KD Strøm', 'Strømpriser, forbruk og effekt per rom (Strøm v3)');
  KD.sheet('strom', 'kd-strom-card');
})();
