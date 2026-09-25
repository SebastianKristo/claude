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
      strom_profil: 'auto',                                                // no | se | auto – sensorene under kommer fra profilen
      pris: null,                                                          // totalpris per time (raw_today/raw_tomorrow)
      spotpris: null,                                                      // Nord Pool (reserve for ringen + spotvarsel)
      norgespris: null,                                                    // fastpris kr/kWh (Norgespris) – finnes ikke i Sverige
      spart_i_dag: null,                                                   // kr
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
    static sheetCss = `.kd-sv-dev{cursor:pointer;-webkit-user-select:none;user-select:none}.kd-sv-dev:active{transform:scale(.985)}
.kd-sv-seg [data-seg-thumb]{background:linear-gradient(180deg, oklch(0.82 0.12 75 / 0.30), oklch(0.82 0.12 75 / 0.14)) !important;box-shadow:inset 0 0 0 1px oklch(0.82 0.12 75 / 0.45), inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 14px rgba(0,0,0,0.3) !important}
.kd-sv-seg [data-seg-b] .ms{transition:color .25s}.kd-sv-seg [data-seg-b][style*="font-weight:600"] .ms{color:oklch(0.82 0.12 75)}`;

    constructor() { super(); this.state = { view: 'pris', sel: null, open: {} }; }
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
      const ore = KD.isOre(unit, at) || (!/kr|nok|sek|dkk|eur/.test(unit) && known[Math.floor(known.length / 2)] > 10);
      return vals.map((v) => (v == null ? null : ore ? v / 100 : v));
    }
    /** sensorene fra strømprofilen (Norge/Sverige), overstyrt av config */
    get P() {
      const c = this.config, P = KD.stromProfil(this);
      return { ...P, pris: c.pris || P.pris_total, spotpris: c.spotpris || P.pris_spot, fast: c.norgespris || P.pris_fast, spart: c.spart_i_dag || P.spart, prisNa: P.pris };
    }
    _prices(which) { const P = this.P; return this._series(P.pris, which) || this._series(P.spotpris, which); }
    _kr(id) { const v = this.n(id); if (v == null) return null; return KD.isOre(this.unit(id), (this.st(id) || {}).attributes) ? v / 100 : v; }

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
            if (kwh != null) { const pr = NORGES != null ? NORGES : (today && today[s0.getHours()] != null ? today[s0.getHours()] : null); w = `${nf(kwh, 1)} kWh${pr != null ? ` · ${nf(kwh * pr)} kr` : ''}`; }
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
            const sid = this.P.spotpris; const reg = String(this.at(sid, 'region', '') || (String(sid).match(/_(no\d|se\d|dk\d|fi)_/i) || [])[1] || '').toUpperCase();
            ev.push({ t: d, text: `Spotpris over ${nfk(lim)} kr`, who: `Nord Pool${reg ? ' · ' + reg : ''}`, kind: 'alert' });
            break;
          }
        }
      }
      return ev.filter((e) => !isNaN(e.t)).sort((x, y) => y.t - x.t).slice(0, Number(c.logg_antall) || 5);
    }

    /* ---------- handlinger ---------- */
    pick(e, h) { h = Number(h); this.setState({ sel: this.state.sel === h ? null : h }); }
    go(e, k) { if (k && k !== this.state.view) this.setState({ view: k, sel: null }); }
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
      const NORGES = this._kr(this.P.fast);
      const watt = this.n(c.effekt);
      const pNow = (today && today[NOW_H] != null) ? today[NOW_H] : this._kr(this.P.prisNa) ?? this._kr(this.P.pris);
      const idx = prices.map((p, h) => [p, h]).filter(([p, h]) => p != null && (!isToday || h > NOW_H));
      const cheapest = idx.length ? idx.reduce((m, x) => (x[0] < m[0] ? x : m)) : [prices[0], 0];
      const upcoming = [...(today || []).map((p, h) => [p, h, 0]).filter(([p, h]) => p != null && h > NOW_H), ...(tmr || []).map((p, h) => [p, h, 1]).filter(([p]) => p != null)];
      const nextCheap = upcoming.length ? upcoming.reduce((m, x) => (x[0] < m[0] ? x : m)) : null;
      let saved = this.P.spart ? this.n(this.P.spart) : null;
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
      else { coreValue = watt != null ? intl(watt) : '–'; coreUnit = 'W'; coreSub = isToday ? `Nå · ${nf(NORGES ?? pNow)} kr/kWh` : 'Bruker nå'; coreIconName = 'bolt'; coreCol = C.amber; }

      const noTmr = s.view === 'morgen' && !tmr;
      const maxP = prices.filter((p) => p != null);
      const headline = isUse ? `${nf(usedSum, 1)} kWh så langt i dag` : noTmr ? 'Ingen priser for i morgen ennå' : isToday ? (pNow == null ? 'Ingen strømpris' : pNow > c.dyr ? 'Strømmen er dyr nå' : pNow > c.middels ? 'Strømmen er middels dyr' : 'Strømmen er billig nå') : `Billigst kl. ${hh(cheapest[1])} i morgen`;
      const FAST = this.P.fast_navn || 'Norgespris';
      const costToday = U && U.use && today ? U.use.reduce((t, k, h) => t + (k != null && today[h] != null ? k * today[h] : 0), 0) : null;
      const subline = isUse ? (NORGES != null ? `${usedSum != null ? nf(usedSum * NORGES) : '–'} kr med ${FAST}` : `${costToday != null ? nf(costToday) : '–'} kr så langt i dag`) : noTmr ? 'Nord Pool publiserer morgendagen rundt kl. 13' : isToday ? (idx.length ? `Billigst kl. ${hh(cheapest[1])} · ${nf(cheapest[0])} kr/kWh` : '–') : `${nf(cheapest[0])} kr · dyrest kl. ${hh(prices.indexOf(Math.max(...maxP)))}`;

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

      const views = KD.segHTML('view', VIEWS, s.view, 'go', { h: 44, r: 22, style: 'margin:0' });

      const stats = [
        ...(NORGES != null || this.P.fast ? [[FAST, NORGES != null ? `${nf(NORGES)} kr` : '–', '#f2f1ee'], ['Spart i dag', saved != null ? `${nf(saved, 0)} kr` : '–', C.green]]
          : [['Pris nå', pNow != null ? `${nf(pNow)} kr` : '–', '#f2f1ee'], ['Kostet i dag', costToday != null ? `${nf(costToday, costToday < 10 ? 1 : 0)} kr` : '–', C.green]]),
        ['Effekt', tier != null ? `${nf(tier, 1)} kW` : '–', tier != null && tier > tierLim ? C.amber : '#f2f1ee'],
      ].map(([label, v, col]) => `<div style="display:flex;flex-direction:column;gap:4px;padding:12px 14px;border-radius:18px;background:#1c1c1f">
        <div style="font-size:11px;color:#8e8d89;white-space:nowrap">${E(label)}</div>
        <div style="${KD.S({ fontSize: 17, fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: col })}">${E(v)}</div>
      </div>`).join('');

      const devices = this._devs = this._devices();
      const minW = Number(c.min_w) || 0;
      const canSw = (d) => !!d.ctl && /^(switch|fan|light|input_boolean)\./.test(d.ctl);
      const onW = (d) => (d.on && d.w != null ? d.w : 0);
      const rooms = [...new Set(devices.map((d) => d.room))].map((room, i) => {
        const list = devices.filter((d) => d.room === room).map((d, j) => [d, j]).sort((x, y) => (onW(y[0]) - onW(x[0])) || ((y[0].on ? 1 : 0) - (x[0].on ? 1 : 0)) || (x[1] - y[1])).map((x) => x[0]);
        return { room, i, list, w: list.reduce((t, d) => t + onW(d), 0), on: list.filter((d) => d.on).length };
      }).sort((x, y) => (y.w - x.w) || (y.on - x.on) || (x.i - y.i));
      const devSum = rooms.reduce((t, r) => t + r.w, 0);
      const houseW = Math.max(devSum, watt != null ? watt : 0);
      const restW = Math.max(0, houseW - devSum);
      const roomCol = (k) => a(C.amber, [1, 0.72, 0.52, 0.38, 0.28, 0.22][Math.min(5, k)]);
      const litRooms = rooms.filter((r) => r.w > 0);
      const mixBar = houseW > 0 ? `<div style="display:flex;gap:3px;height:10px;border-radius:5px;overflow:hidden">
        ${litRooms.map((r, k) => `<span title="${KD.e(r.room)}" style="flex:${r.w} 1 0;min-width:4px;background:${roomCol(k)};transition:flex .5s"></span>`).join('')}
        ${restW > 0 ? `<span title="Annet" style="flex:${restW} 1 0;min-width:4px;background:#3a3a3e"></span>` : ''}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px 14px;font-size:11.5px;color:#8e8d89;min-width:0">
        ${litRooms.slice(0, 5).map((r, k) => `<span style="display:inline-flex;align-items:center;gap:6px;min-width:0;white-space:nowrap"><span style="width:8px;height:8px;border-radius:3px;background:${roomCol(k)};flex:none"></span>${E(r.room)}<span style="color:#6d6c69;font-variant-numeric:tabular-nums">${E(Math.round(r.w / houseW * 100) + ' %')}</span></span>`).join('')}
        ${restW > 0 ? `<span style="display:inline-flex;align-items:center;gap:6px;white-space:nowrap"><span style="width:8px;height:8px;border-radius:3px;background:#3a3a3e;flex:none"></span>${E('Annet')}<span style="color:#6d6c69;font-variant-numeric:tabular-nums">${E(Math.round(restW / houseW * 100) + ' %')}</span></span>` : ''}
      </div>` : '';

      const devRow = (d, roomW) => {
        const sw = canSw(d), isOn = !!d.on, w = d.w, swOn = sw && this.v(d.ctl) === 'on';
        const val = w != null && (isOn || w > 0 || swOn) ? intl(w) : isOn ? 'På' : 'Av';
        const sub = isOn && w != null && roomW > 0 ? `${Math.round(w / roomW * 100)} % av rommet` : isOn ? (w != null && w < minW ? 'Standby' : 'På') : swOn ? (w ? `Standby · ${intl(w)} W` : 'Standby') : w != null && w > 0 ? `Standby · ${intl(w)} W` : (/^climate\./.test(d.ctl || '') ? 'Varmer ikke' : 'Av');
        const tg = sw ? `<span style="position:relative;flex:none;width:40px;height:24px;border-radius:12px;background:${swOn ? C.amber : '#3a3a3e'};transition:background .25s;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05)">
            <span style="position:absolute;top:3px;left:${swOn ? 19 : 3}px;width:18px;height:18px;border-radius:9px;background:${swOn ? '#161618' : '#a9a7a2'};box-shadow:0 1px 3px rgba(0,0,0,0.35);transition:left .3s cubic-bezier(.34,1.4,.64,1),background .25s"></span></span>`
          : `<span class="ms" style="flex:none;width:40px;text-align:center;font-size:20px;color:#6d6c69">chevron_right</span>`;
        return `<div class="kd-sv-dev" data-key="dev-${KD.e(d.id)}" data-on-click="tapDev" data-hold="holdDev" data-arg="${KD.e(d.id)}" role="button" style="display:flex;align-items:center;gap:12px;min-width:0;padding:9px 10px 9px 8px;border-radius:16px;background:${isOn ? '#232326' : 'transparent'};transition:background .25s">
          <span style="flex:none;width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:${isOn ? a(C.amber, 0.16) : '#232326'}">
            <span class="ms" style="font-size:19px;color:${isOn ? C.amber : '#6d6c69'};font-variation-settings:'FILL' ${isOn ? 1 : 0}">${E(d.icon)}</span>
          </span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:1px">
            <span style="font-size:14px;font-weight:500;color:${isOn ? '#f2f1ee' : '#a9a7a2'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(d.name)}</span>
            <span style="font-size:11.5px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(sub)}</span>
          </span>
          <span style="flex:none;font-size:14px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap;color:${isOn && w ? '#f2f1ee' : '#6d6c69'}">${E(val)}${w != null && (isOn || w > 0 || swOn) ? `<span style="font-size:11px;color:#8e8d89;font-weight:400"> W</span>` : ''}</span>
          ${tg}
        </div>`;
      };
      const roomsHtml = rooms.map((r, k) => {
        const open = !!(s.open || {})[r.room], TOP = 3;
        const shown = open ? r.list : r.list.slice(0, TOP);
        const pct = houseW > 0 ? r.w / houseW * 100 : 0;
        const lit = r.w > 0;
        return `<div data-key="room-${KD.e(r.room)}" style="display:flex;flex-direction:column;gap:10px;min-width:0;padding:14px 10px 10px;border-radius:24px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04)">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;padding:0 6px">
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
              <div style="font-size:16px;font-weight:500;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(r.room)}</div>
              <div style="font-size:11.5px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(`${r.on} av ${r.list.length} på${lit && houseW ? ` · ${Math.round(pct)} % av huset` : ''}`)}</div>
            </div>
            <div style="flex:none;font-size:22px;font-weight:500;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;white-space:nowrap;color:${lit ? '#f2f1ee' : '#6d6c69'}">${E(lit ? intl(r.w) : '0')}<span style="font-size:12px;color:#8e8d89;font-weight:400"> W</span></div>
          </div>
          <div style="margin:0 6px;height:6px;border-radius:3px;background:#2a2a2d;overflow:hidden">
            <div style="height:100%;width:${lit ? Math.max(2, pct).toFixed(1) : 0}%;border-radius:3px;background:linear-gradient(90deg, ${a(C.amber, 0.55)}, ${roomCol(k < litRooms.length ? k : 5)});box-shadow:0 0 12px ${a(C.amber, 0.35)};transition:width .6s cubic-bezier(.3,1,.4,1)"></div>
          </div>
          <div style="display:flex;flex-direction:column;gap:2px;min-width:0">${shown.map((d) => devRow(d, r.w)).join('')}</div>
          ${r.list.length > TOP ? `<button data-on-click="openRoom" data-arg="${KD.e(r.room)}" style="align-self:stretch;height:36px;border-radius:14px;background:#232326;display:flex;align-items:center;justify-content:center;gap:6px;font-size:12.5px;font-weight:500;color:#c9c7c2">
            ${E(open ? 'Vis færre' : `Vis alle ${r.list.length}`)}<span class="ms" style="font-size:18px;transition:transform .3s;transform:rotate(${open ? 180 : 0}deg)">expand_more</span></button>` : ''}
        </div>`;
      }).join('');

      const spot = this._series(this.P.spotpris, 'today');
      const log = this._log(devices, spot, NOW_H, today);
      const rel = (t) => {
        const m = Math.round((now - t) / 60e3);
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
          <div style="display:flex;flex-direction:column;align-items:center;width:34px;flex:none">
            <span style="width:34px;height:34px;border-radius:12px;flex:none;display:grid;place-items:center;background:${a(col, 0.14)};box-shadow:inset 0 0 0 1px ${a(col, 0.3)}">
              <span class="ms" style="font-size:18px;color:${col};font-variation-settings:'FILL' 1">${E(ic)}</span>
            </span>
            <span style="flex:1;width:2px;min-height:10px;margin:4px 0;border-radius:1px;background:${last ? 'transparent' : `linear-gradient(${a(col, 0.35)}, rgba(255,255,255,0.06))`}"></span>
          </div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;padding:2px 0 ${last ? 0 : 14}px">
            <div style="display:flex;align-items:baseline;gap:10px;min-width:0">
              <div style="flex:1;min-width:0;font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(e.text)}</div>
              <div style="flex:none;font-size:11.5px;color:#8e8d89;font-variant-numeric:tabular-nums;white-space:nowrap">${E(KD.hm(e.t))}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;min-width:0;font-size:12px;color:#8e8d89">
              <span style="flex:none;padding:1px 7px;border-radius:7px;font-size:10.5px;font-weight:600;letter-spacing:0.02em;color:${col};background:${a(col, 0.12)}">${E(badge)}</span>
              <span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E([rel(e.t), e.who].filter(Boolean).join(' · '))}</span>
            </div>
          </div>
        </div>`;
      }).join('');

      const coreIcon = { fontSize: 26, color: coreCol, fontVariationSettings: "'FILL' 1" };
      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 28px;display:flex;flex-direction:column;gap:22px">

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

  <section class="kd-sv-seg">${views}</section>

  <section style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">${stats}</section>

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

  ${devices.length ? `<section data-kd-rom style="display:flex;flex-direction:column;gap:10px;min-width:0">
    <div style="display:flex;flex-direction:column;gap:10px;padding:0 4px 4px;min-width:0">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">
        <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Rom</div>
        <div style="font-size:12px;color:#8e8d89;white-space:nowrap;font-variant-numeric:tabular-nums">${E(`${devices.filter((d) => d.on).length} av ${devices.length} på${houseW ? ` · ${intl(houseW)} W` : ''}`)}</div>
      </div>
      ${mixBar}
    </div>
    ${roomsHtml}
  </section>` : ''}

  ${log.length ? `<section style="display:flex;flex-direction:column;gap:10px;min-width:0">
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:0 4px">
      <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Siste hendelser</div>
      <div style="font-size:12px;color:#6d6c69;white-space:nowrap">Siste døgn</div>
    </div>
    <div style="display:flex;flex-direction:column;padding:16px 14px;border-radius:24px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04);min-width:0">${logHtml}</div>
  </section>` : ''}
</div>`;
    }
  }

  KD.define('kd-strom-card', KDStromCard, 'KD Strøm', 'Strømpriser, forbruk og effekt per rom (Strøm v3)');
  KD.sheet('strom', 'kd-strom-card');
})();
