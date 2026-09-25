/*
 * kd-person-card — «Person» (Tilstedeværelse) fra Claude Design, som ark-kort.
 *
 * Sone og «siden» fra person.*, mobil og helse fra telefonens sensorer (prefiks funnet via personens
 * device_trackers, f.eks. sensor.sebastian_iphone_17_pro_*), søvnvindu og «Våknet/Sovnet» fra søvnbryteren
 * (on = sover), «Soner i dag» fra personens historikk.
 *
 * type: custom:kd-person-card
 * person: sebastian            # sebastian | cybele | rune (designets personId) – eller en person.*-ID
 * personer: { sebastian: { navn, entity, posisjon, sovn, mobil, farge, sovn_rom } }   # overstyr/utvid tabellen
 * entity / posisjon / sovn / mobil / navn / farge / sovn_rom   # overstyr for valgt person direkte
 * soner: { skole: { navn: Skole, ikon: school, farge: 'oklch(…)', bestemt: skolen } }   # nøkkel = zone-objekt-ID
 * bilde: true                  # true = bruk personens entity_picture i avataren i stedet for forbokstaven
 * Mobil-sensorer (med prefiks): battery_level, battery_state, connection_type, ssid, geocoded_location, steps,
 * distance / walking_running_distance, sleep_duration, core_sleep, deep_sleep, rem_sleep, awake, sleep_score.
 */
(() => {
  const KD = window.KD;
  if (!KD || customElements.get('kd-person-card')) return;
  const { S, e, a } = KD;
  const t = x => `<span>${e(x)}</span>`;
  const C = { green: 'oklch(0.8 0.12 150)', blue: 'oklch(0.8 0.12 250)', purple: 'oklch(0.68 0.2 285)', amber: 'oklch(0.82 0.12 75)', pink: 'oklch(0.78 0.13 350)' };
  const PERSONS = {
    sebastian: { navn: 'Sebastian', entity: 'person.sebastian_kristo_jemtland', posisjon: 'switch.sebastian_posisjon_hjemme_borte', sovn: 'switch.homey_logic_sebastian_sovn_vaken', farge: 'oklch(0.55 0.08 40)', mobil: 'sensor.sebastian_iphone_17_pro_' },
    cybele: { navn: 'Cybele', entity: 'person.cybele_kristo', posisjon: 'switch.cybele_posisjon_hjemme_borte', sovn: 'switch.homey_logic_cybele_sovn_vaken', farge: 'oklch(0.5 0.08 350)' },
    rune: { navn: 'Rune', entity: 'person.rune_jemtland', posisjon: 'switch.rune_posisjon_hjemme_borte', sovn: 'switch.homey_logic_rune_sovn_vaken', farge: 'oklch(0.5 0.05 250)' },
  };
  // [navn, ikon, farge, bestemt form («Forlot skolen»)]
  const ZONES = {
    home: ['Hjemme', 'home', C.green, 'hjemmet'], not_home: ['Borte', 'logout', C.purple, 'borte'],
    skole: ['Skole', 'school', C.amber, 'skolen'], stromstad: ['Strømstad', 'cottage', C.amber, 'Strømstad'], toten: ['Toten', 'cottage', C.amber, 'Toten'],
    mormor: ['Mormor', 'family_home', C.pink, 'mormor'], oslo_revmatologipraksis: ['Revmatologen', 'medical_services', C.blue, 'revmatologen'], kor: ['Kor', 'music_note', C.blue, 'koret'],
  };
  const STAGES = [['Våken', '#8e8d89'], ['Lett', 'oklch(0.72 0.1 250)'], ['Dyp', 'oklch(0.55 0.14 275)'], ['REM', 'oklch(0.75 0.13 330)']];
  // Designets typiske natt – brukes som mal for rekkefølgen når bare fase-totalene er kjent.
  const SEQ = [1, 2, 2, 1, 3, 1, 2, 1, 3, 0, 1, 3, 1, 3, 0];
  const WD = ['sø', 'ma', 'ti', 'on', 'to', 'fr', 'lø'];
  const WDL = ['søn.', 'man.', 'tir.', 'ons.', 'tor.', 'fre.', 'lør.'];
  const slug = s => String(s || '').toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const isToday = d => new Date(d).toDateString() === new Date().toDateString();
  const dayStart = (off = 0) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + off); return d; };

  /** Fordel N blokker på fasene etter minutter (største rest), i designets rekkefølge. */
  function hypnogram(mins, n = SEQ.length) {
    const tot = mins.reduce((p, q) => p + q, 0); if (!tot) return [];
    const raw = mins.map(m => m / tot * n), cnt = raw.map(Math.floor);
    let rest = n - cnt.reduce((p, q) => p + q, 0);
    raw.map((r, i) => [r - Math.floor(r), i]).sort((p, q) => q[0] - p[0]).forEach(([, i]) => { if (rest > 0) { cnt[i]++; rest--; } });
    const left = cnt.slice(), out = [];
    for (const want of SEQ.slice(0, n)) {
      let k = left[want] > 0 ? want : left.indexOf(Math.max(...left));
      left[k]--; out.push(k);
    }
    return out;
  }

  class KDPersonCard extends KD.KDSheet {
    static head = ['person', 'Tilstedeværelse', 'Mobil, sone og søvn'];
    static defaults = { person: 'sebastian', personer: null, soner: null, bilde: true, sovn_rom: 'Soverom' };
    static getStubConfig() { return { person: 'sebastian' }; }
    getCardSize() { return 14; }

    /* ---------- oppslag ---------- */
    who() {
      const cfg = this.config, table = { ...PERSONS };
      for (const [k, v] of Object.entries(cfg.personer || {})) table[k] = { ...(table[k] || {}), ...(v || {}) };
      let key = String(cfg.person || 'sebastian'), p;
      if (key.startsWith('person.')) { p = Object.values(table).find(x => x.entity === key); if (!p) { const fn = this.fname(key, key); p = { navn: String(fn).split(' ')[0], entity: key }; } }
      else p = table[key] || table.sebastian;
      p = { ...p };
      for (const k of ['entity', 'posisjon', 'sovn', 'mobil', 'navn', 'farge']) if (cfg[k]) p[k] = cfg[k];
      p.key = slug(String(p.navn || '').split(' ')[0]) || 'person';
      p.navn = p.navn || this.fname(p.entity, p.key);
      p.farge = p.farge || 'oklch(0.5 0.05 250)';
      p.prefix = this.phonePrefix(p);
      return p;
    }
    phonePrefix(p) {
      if (p.mobil) { const m = String(p.mobil).replace(/^sensor\./, ''); return 'sensor.' + (m.endsWith('_') ? m : m + '_'); }
      const trs = this.at(p.entity, 'device_trackers', []) || [];
      for (const tr of trs) { const o = String(tr).split('.')[1]; if (o && this.st(`sensor.${o}_battery_level`)) return `sensor.${o}_`; }
      if (!this._pfx || this._pfx.k !== p.key) {
        const id = Object.keys(this._hass ? this._hass.states : {}).find(x => x.startsWith(`sensor.${p.key}_`) && x.endsWith('_battery_level'));
        this._pfx = { k: p.key, v: id ? id.replace(/battery_level$/, '') : null };
      }
      return this._pfx.v;
    }
    zones() {
      const z = { ...ZONES };
      for (const [k, v] of Object.entries(this.config.soner || {})) { const o = z[k] || [k, 'location_on', C.blue, k]; z[k] = [v.navn || o[0], v.ikon || o[1], v.farge || o[2], v.bestemt || v.navn || o[3]]; }
      return z;
    }
    zoneKey(state) {
      if (!state || KD.BAD.has(state)) return null;
      if (state === 'home' || state === 'not_home') return state;
      const states = this._hass ? this._hass.states : {};
      const hit = Object.keys(states).find(id => id.startsWith('zone.') && (states[id].attributes.friendly_name === state || id === 'zone.' + slug(state)));
      return hit ? hit.split('.')[1] : slug(state);
    }
    zoneInfo(key, state) {
      const z = this.zones();
      if (z[key]) return z[key];
      const nm = this.fname('zone.' + key, state || key);
      return [nm, 'location_on', C.blue, nm];
    }
    zoneName(key) {
      if (key === 'home') return this.fname('zone.home', 'Hjem');
      if (key === 'not_home') return '';
      return this.fname('zone.' + key, this.zoneInfo(key)[0]);
    }
    /** tall i timer ut fra enheten */
    hours(id) { const v = this.n(id); if (v == null) return null; const u = String(this.unit(id)).toLowerCase(); return u === 'min' ? v / 60 : u === 's' ? v / 3600 : u === 'h' || u === 't' ? v : v > 24 ? v / 60 : v; }
    mins(id) { const h = this.hours(id); return h == null ? null : h * 60; }
    firstOk(ids) { return ids.find(id => this.ok(id)) || null; }

    /* ---------- innhold ---------- */
    body() {
      const cfg = this.config, p = this.who(), px = p.prefix || 'sensor.__none_';
      const pst = this.st(p.entity);
      const useSwitch = (!pst || KD.BAD.has(pst.state)) && this.ok(p.posisjon);
      const state = useSwitch ? (this.v(p.posisjon) === 'on' ? 'home' : 'not_home') : pst ? pst.state : '';
      const zkey = this.zoneKey(state);
      const [zl, zi, zc] = zkey ? this.zoneInfo(zkey, state) : ['Ukjent', 'location_off', '#8e8d89', ''];
      const since = useSwitch ? (this.st(p.posisjon) || {}).last_changed : pst && pst.last_changed;
      const geo = this.at(px + 'geocoded_location', 'Locality') ? this.st(px + 'geocoded_location').attributes : {};
      const place = zkey === 'home' ? (geo.Locality || this.fname('zone.home', '')) : zkey === 'not_home' ? (geo['Sub Locality'] || geo.Locality || '') : zkey ? this.zoneName(zkey) : '';
      const sinceD = since ? new Date(since) : null;
      const sinceTxt = sinceD && !isNaN(sinceD) ? `${zl} siden ${isToday(sinceD) ? '' : WDL[sinceD.getDay()] + ' '}${KD.hm(sinceD)}${zkey === 'not_home' && geo.Locality ? ` · ${geo.Locality}` : ''}` : '';
      const away = zkey !== 'home';

      // aktivitet
      const steps = this.n(px + 'steps');
      const distId = this.firstOk([px + 'distance', px + 'walking_running_distance']);
      let dist = distId ? this.n(distId) : null;
      if (dist != null) { const u = String(this.unit(distId)).toLowerCase(); if (u === 'm' || (!u && distId.endsWith('_distance') && !distId.includes('walking') && dist > 100)) dist /= 1000; }
      const scoreId = this.firstOk([px + 'sleep_score', `sensor.${p.key}_sovn_score`, `sensor.${p.key}_sleep_score`]);
      const score = scoreId ? Math.round(this.n(scoreId)) : null;

      // søvn
      const stIds = [px + 'awake', px + 'core_sleep', px + 'deep_sleep', px + 'rem_sleep'];
      const stMin = stIds.map(id => this.mins(id));
      let dur = this.hours(px + 'sleep_duration');
      if (dur == null && stMin[1] != null && stMin[2] != null && stMin[3] != null) dur = (stMin[1] + stMin[2] + stMin[3]) / 60;
      const logH = this.cached(`kd-person-log|${p.entity}|${p.sovn}|${pst && pst.last_changed}|${(this.st(p.sovn) || {}).last_changed}|${dayStart().getTime()}`, 5 * 60e3,
        () => this.history([p.entity, p.sovn].filter(Boolean), (Date.now() - dayStart(-1).getTime() + 6 * 3600e3) / 3600e3), null);
      if (logH) this._logH = logH;
      const H = this._logH || {};
      // søvnvinduet: siste periode bryteren var «on»
      const sw = (H[p.sovn] || []).filter(x => typeof x.v === 'string' && !KD.BAD.has(x.v));
      let win = null;
      for (let i = 0; i < sw.length; i++) if (sw[i].v === 'on' && (i === 0 || sw[i - 1].v !== 'on')) { const end = sw.slice(i + 1).find(x => x.v !== 'on'); win = [sw[i].t, end ? end.t : null]; }
      if (!win && this.v(p.sovn) === 'on') { const lc = (this.st(p.sovn) || {}).last_changed; if (lc) win = [new Date(lc), null]; }
      if (dur == null && win) dur = ((win[1] || new Date()) - win[0]) / 3600e3;
      const totMin = dur != null ? Math.round(dur * 60) : null;
      const haveStages = stMin.every(x => x != null);
      const seq = haveStages ? hypnogram(stMin) : [];
      const good = score != null ? score >= 80 : dur != null && dur >= 7;
      const ok = score != null ? score >= 70 : dur != null && dur >= 6;
      const wkRaw = this.cached(`kd-person-wk|${px}sleep_duration|${dayStart().getTime()}|${(this.st(px + 'sleep_duration') || {}).last_changed}`, 30 * 60e3,
        () => this.st(px + 'sleep_duration') ? this.history([px + 'sleep_duration'], (Date.now() - dayStart(-6).getTime()) / 3600e3) : Promise.resolve({}), null);
      if (wkRaw) this._wk = wkRaw;
      const wkPts = ((this._wk || {})[px + 'sleep_duration'] || []).filter(x => typeof x.v === 'number');
      const uMul = (() => { const u = String(this.unit(px + 'sleep_duration')).toLowerCase(); return u === 'min' ? 1 / 60 : u === 's' ? 1 / 3600 : 1; })();
      const wk = this.st(px + 'sleep_duration') ? Array.from({ length: 7 }, (_, i) => {
        const d0 = dayStart(i - 6).getTime(), d1 = d0 + 864e5;
        const vals = wkPts.filter(x => x.t >= d0 && x.t < d1).map(x => x.v * uMul);
        const v = i === 6 && dur != null ? dur : vals.length ? Math.max(...vals) : 0;
        return { v, d: i === 6 ? 'i n' : WD[new Date(d0).getDay()] };
      }) : [];
      const wmax = Math.max(0.01, ...wk.map(x => x.v));

      // mobil
      const bat = this.n(px + 'battery_level');
      const bst = String(this.v(px + 'battery_state')).toLowerCase();
      const charging = ['charging', 'full', 'lader', 'fulladet'].includes(bst) || this.v(`binary_sensor.${px.slice(7)}is_charging`) === 'on';
      const conn = this.v(px + 'connection_type');
      const wifi = /wi-?fi/i.test(conn), cell = /cell|mobil/i.test(conn);
      const netShort = wifi ? 'Wi-Fi' : cell ? 'Mobildata' : conn && !KD.BAD.has(conn) ? conn : '';
      const ssid = this.ok(px + 'ssid') ? this.v(px + 'ssid') : '';
      const tech = this.at(px + 'connection_type', 'Cellular Technology', '') || this.at(px + 'connection_type', 'cellular_technology', '');
      const net = charging ? ['Lader', netShort].filter(Boolean).join(' · ') : wifi ? ['Wi-Fi', ssid || zl].join(' · ') : cell ? ['Mobildata', tech].filter(Boolean).join(' · ') : netShort;
      const trackers = this.at(p.entity, 'device_trackers', []) || [];
      const tracker = trackers.find(x => String(x).includes(px.slice(7, -1))) || trackers[0];
      const trName = tracker ? this.fname(tracker, '') : '';
      const first = String(p.navn).split(' ')[0];
      let model = trName && trName !== tracker ? trName.replace(new RegExp(`^${first}s?\\s+`, 'i'), '').replace(/\s*\(.*\)$/, '').trim() : '';
      if (!model && p.prefix) model = p.prefix.slice(7, -1).replace(new RegExp(`^${p.key}_`), '').split('_').map(w => w === 'iphone' ? 'iPhone' : w === 'ipad' ? 'iPad' : /^\d/.test(w) ? w : w[0].toUpperCase() + w.slice(1)).join(' ');
      const focusId = `binary_sensor.${px.slice(7)}focus`;
      const chips = [[charging ? 'battery_charging_full' : 'battery_5_bar', charging ? 'Lader' : 'På batteri'], netShort ? [wifi ? 'wifi' : 'signal_cellular_alt', netShort] : null,
        this.st(focusId) ? ['do_not_disturb_on', this.v(focusId) === 'on' ? 'Fokus på' : 'Fokus av'] : null,
        tracker ? ['location_on', this.ok(tracker) ? 'Posisjon deles' : 'Posisjon av'] : null].filter(Boolean).map(([icon, label]) => ({ icon, label }));
      const hasPhone = bat != null || !!p.prefix && this.st(px + 'battery_level');

      // soner i dag
      const log = [];
      const hist = (H[p.entity] || []).filter(x => typeof x.v === 'string' && !KD.BAD.has(x.v));
      const t0 = dayStart().getTime();
      for (let i = 1; i < hist.length; i++) {
        const prev = hist[i - 1].v, cur = hist[i].v, when = hist[i].t;
        if (prev === cur || when < t0) continue;
        const pk = this.zoneKey(prev), ck = this.zoneKey(cur);
        if (pk && pk !== 'not_home') { const zi2 = this.zoneInfo(pk, prev); log.push([pk === 'home' ? 'Forlot hjemmet' : `Forlot ${zi2[3]}`, this.zoneName(pk), when, pk === 'home' ? 'not_home' : pk]); }
        if (ck && ck !== 'not_home') { const zi2 = this.zoneInfo(ck, cur); log.push([ck === 'home' ? 'Kom hjem' : `Ankom ${zi2[3]}`, this.zoneName(ck), when, ck]); }
      }
      const sl = (H[p.sovn] || []).filter(x => typeof x.v === 'string' && !KD.BAD.has(x.v));
      for (let i = 1; i < sl.length; i++) if (sl[i].v !== sl[i - 1].v && sl[i].t >= t0) log.push([sl[i].v === 'on' ? 'Sovnet' : 'Våknet', cfg.sovn_rom || 'Soverom', sl[i].t, 'home']);
      log.sort((x, y) => y[2] - x[2]);

      const vals = {
        name: p.navn, initial: String(p.navn).trim()[0] || '?',
        halo: { position: 'absolute', inset: -8, borderRadius: '50%', boxShadow: `0 0 0 2px ${a(zc, 0.55)}, 0 0 40px ${a(zc, 0.25)}` },
        avatar: { width: 132, height: 132, borderRadius: 66, display: 'grid', placeItems: 'center', fontSize: 48, fontWeight: 600, background: p.farge, opacity: zkey === 'not_home' ? 0.75 : 1 },
        zoneBadge: { position: 'absolute', right: 0, bottom: 4, width: 38, height: 38, borderRadius: 19, display: 'grid', placeItems: 'center', background: '#232326', color: zc, boxShadow: '0 0 0 3px #141416' },
        zone: { label: [zl, place && place !== zl ? place : ''].filter(Boolean).join(' · '), icon: zi, since: sinceTxt },
        zoneLine: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, color: '#e6e4df' },
        zoneDot: { width: 8, height: 8, borderRadius: 4, background: zc, boxShadow: `0 0 10px ${zc}` },
        stats: [['directions_walk', steps != null ? Math.round(steps).toLocaleString('nb-NO') : '–', 'skritt', C.green, px + 'steps'],
          ['route', dist != null ? `${dist < 10 && Math.round(dist * 10) % 10 ? KD.nf(dist, 1) : Math.round(dist)} km` : '–', 'reist i dag', C.blue, distId],
          ['bedtime', score != null ? `${score}` : '–', 'søvnscore', 'oklch(0.72 0.1 275)', scoreId]].map(([icon, v, label, col, id]) => ({ icon, v, label, id, iconStyle: { fontSize: 20, color: col, fontVariationSettings: "'FILL' 1" } })),
        sleep: {
          h: totMin != null ? Math.floor(totMin / 60) : '–', m: totMin != null ? totMin % 60 : '–',
          window: win ? `${KD.hm(win[0])}–${win[1] ? KD.hm(win[1]) : 'nå'}` : '–',
          score: good ? 'God natt' : ok ? 'Grei natt' : 'Urolig natt', hasScore: score != null || dur != null,
          scoreStyle: { fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 10, background: a(good ? C.green : C.amber, 0.16), color: good ? C.green : C.amber, whiteSpace: 'nowrap' },
          blocks: seq.map((k, i) => ({ flex: 1 + (i % 3) * 0.5, background: STAGES[k][1], opacity: k === 0 ? 0.5 : 1, alignSelf: 'flex-end', height: `${[35, 60, 100, 80][k]}%`, borderRadius: 4 })),
          legend: STAGES.map(([label, c], k) => ({ label, v: stMin[k] != null ? `${Math.round(stMin[k])} min` : '–', dot: { width: 8, height: 8, borderRadius: 4, background: c } })),
          week: wk.map((w, i) => ({ d: w.d, bar: { width: '100%', maxWidth: 26, height: `${w.v / wmax * 100}%`, borderRadius: 6, background: i === 6 ? 'oklch(0.72 0.1 275)' : a('oklch(0.72 0.1 275)', 0.35) } })),
        },
        phone: { model: model || 'Mobil', bat: bat != null ? Math.round(bat) : '–', sub: net || '–', id: px + 'battery_level',
          bar: { width: `${bat != null ? bat : 0}%`, height: '100%', borderRadius: 3, background: bat != null && bat < 20 ? 'oklch(0.72 0.15 25)' : charging ? C.green : '#f2f1ee' }, chips },
        log: log.map(([text, sub, time, z], i, arr) => ({ text, sub, time: KD.hm(time), dot: { width: 9, height: 9, borderRadius: 5, marginTop: 5, background: this.zoneInfo(z)[2], flex: 'none' }, line: { flex: 1, width: 1, background: i < arr.length - 1 ? 'rgba(255,255,255,0.1)' : 'transparent', marginTop: 4 } })),
      };
      const pic = cfg.bilde && this.at(p.entity, 'entity_picture');
      if (pic) Object.assign(vals.avatar, { backgroundImage: `url('${KD.e(String(this._hass.hassUrl ? this._hass.hassUrl(pic) : pic).replace(/'/g, '%27'))}')`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' });
      const v = vals;

      return `<div style="box-sizing:border-box;width:100%;max-width:420px;min-height:100vh;margin:0 auto;background:#141416;padding:20px 18px 40px;display:flex;flex-direction:column;gap:22px">
  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Tilstedeværelse</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section style="display:flex;flex-direction:column;align-items:center;gap:14px">
    <div data-on-click="info" data-arg="${e(p.entity)}" style="position:relative;width:132px;height:132px;cursor:pointer">
      <div style="${S(v.halo)}"></div>
      <div style="${S(v.avatar)}">${pic ? '' : t(v.initial)}</div>
      <span style="${S(v.zoneBadge)}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">${t(v.zone.icon)}</span></span>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
      <div style="font-size:26px;font-weight:500;letter-spacing:-0.015em">${t(v.name)}</div>
      <div style="${S(v.zoneLine)}"><span style="${S(v.zoneDot)}"></span>${t(v.zone.label)}</div>
      <div style="font-size:13px;color:#8e8d89">${t(v.zone.since)}</div>
    </div>
  </section>

  <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
    ${v.stats.map(x => `<div data-on-click="info" data-arg="${e(x.id || '')}" style="display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:18px;background:#1c1c1f">
        <span class="ms" style="${S(x.iconStyle)}">${t(x.icon)}</span>
        <div style="display:flex;flex-direction:column;gap:1px">
          <span style="font-size:17px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap">${t(x.v)}</span>
          <span style="font-size:11px;color:#8e8d89;white-space:nowrap">${t(x.label)}</span>
        </div>
      </div>`).join('')}
  </section>

  <section style="display:flex;flex-direction:column;gap:12px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:0 4px">
      <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Søvn i natt</div>
      <div style="font-size:12px;color:#6d6c69;font-variant-numeric:tabular-nums">${t(v.sleep.window)}</div>
    </div>
    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:0 4px">
      <div style="font-size:44px;font-weight:300;letter-spacing:-0.04em;line-height:1;font-variant-numeric:tabular-nums;white-space:nowrap">${t(v.sleep.h)}<span style="font-size:15px;color:#8e8d89"> t </span>${t(v.sleep.m)}<span style="font-size:15px;color:#8e8d89"> min</span></div>
      ${v.sleep.hasScore ? `<div style="${S(v.sleep.scoreStyle)}">${t(v.sleep.score)}</div>` : ''}
    </div>
    <div style="display:flex;height:40px;border-radius:12px;overflow:hidden;gap:2px">
      ${v.sleep.blocks.map(b => `<span style="${S(b)}"></span>`).join('')}
    </div>
    <div style="display:flex;gap:14px;flex-wrap:wrap;padding:0 4px">
      ${v.sleep.legend.map(l => `<span style="display:flex;align-items:center;gap:6px;font-size:12px;color:#a9a7a2;white-space:nowrap"><span style="${S(l.dot)}"></span>${t(l.label)}<span style="color:#6d6c69;font-variant-numeric:tabular-nums">${t(l.v)}</span></span>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;height:64px;align-items:end;padding-top:6px">
      ${v.sleep.week.map(w => `<div style="display:flex;flex-direction:column;align-items:center;gap:5px;height:100%;justify-content:flex-end">
          <div style="${S(w.bar)}"></div>
          <span style="font-size:10px;color:#6d6c69">${t(w.d)}</span>
        </div>`).join('')}
    </div>
  </section>

  ${hasPhone ? `<section style="display:flex;flex-direction:column;gap:8px">
    <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:0 4px">Mobil</div>
    <div data-on-click="info" data-arg="${e(v.phone.id)}" style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:22px;background:#1c1c1f;cursor:pointer">
      <span style="width:40px;height:40px;border-radius:20px;background:#232326;display:grid;place-items:center;flex:none"><span class="ms" style="font-size:22px">smartphone</span></span>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;justify-content:space-between;gap:10px">
          <span style="font-size:14px;font-weight:500;white-space:nowrap">${t(v.phone.model)}</span>
          <span style="font-size:13px;font-weight:500;font-variant-numeric:tabular-nums">${t(v.phone.bat)} %</span>
        </div>
        <div style="height:5px;border-radius:3px;background:#2a2a2d;overflow:hidden"><div style="${S(v.phone.bar)}"></div></div>
        <span style="font-size:12px;color:#8e8d89">${t(v.phone.sub)}</span>
      </div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${v.phone.chips.map(c => `<span style="height:30px;padding:0 11px 0 8px;border-radius:15px;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:500;background:#1c1c1f;color:#c9c7c2;white-space:nowrap"><span class="ms" style="font-size:16px;color:#8e8d89">${t(c.icon)}</span>${t(c.label)}</span>`).join('')}
    </div>
  </section>` : ''}

  <section style="display:flex;flex-direction:column;gap:8px">
    <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:0 4px">Soner i dag</div>
    <div style="display:flex;flex-direction:column;padding-left:4px">
      ${v.log.map(x => `<div style="display:flex;gap:14px;align-items:stretch">
          <div style="display:flex;flex-direction:column;align-items:center;width:10px;flex:none">
            <span style="${S(x.dot)}"></span>
            <span style="${S(x.line)}"></span>
          </div>
          <div style="flex:1;display:flex;justify-content:space-between;gap:12px;padding-bottom:14px">
            <div style="display:flex;flex-direction:column;gap:2px">
              <div style="font-size:14px">${t(x.text)}</div>
              <div style="font-size:12px;color:#8e8d89">${t(x.sub)}</div>
            </div>
            <div style="font-size:12px;color:#8e8d89;font-variant-numeric:tabular-nums">${t(x.time)}</div>
          </div>
        </div>`).join('')}
      ${!v.log.length && this._logH ? `<div style="padding:4px 0 8px;font-size:13px;color:#6d6c69">Ingen soneendringer i dag</div>` : ''}
    </div>
  </section>
</div>`;
    }
    info(ev, id) { if (id) this.more(id); }
  }

  KD.define('kd-person-card', KDPersonCard, 'KD Person', 'Tilstedeværelse: sone, aktivitet, søvn i natt, mobil og soner i dag for én person.');
  KD.sheet('person', 'kd-person-card');
})();
