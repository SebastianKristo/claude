/*
 * kd-lys-card – «Lys v2» fra Claude Design (pikselkopi) med ekte data.
 *
 *   type: custom:kd-lys-card          # virker uten noe mer
 *   fane: out                         # out | f1 | f2 | on (startfane)
 *   utelys: light.ute_lys             # utelysgruppe (på/av-pillen i scenen)
 *   utelamper: [light.verandalamp, light.utelys_inngang]
 *   neste_paa / neste_av / auto / kveld / morgen   # KI Utelys (finnes automatisk)
 *   innstillinger: [number.ki_utelys_terskel_paa, …]         # rader i «Innstillinger» (standard: alle number/time/select.ki_utelys_*)
 *   sol: sun.sun
 *   hele_huset: sensor.hele_huset_lys # ki_rom – alle lys som er på
 *   effekt: sensor.lys_power          # effekt for belysning (ellers summen av sensor.<lys>_power)
 *   rom: { stue: { navn: 'Stuen' } }  # overstyr/utvid romtabellen (KD.ROOMS)
 *   etasjer: { f1: [stue, kjokken], f2: [pult, soverom] }   # overstyr etasjene
 *   skjul: [light.x, 'switch.pultvifte_*']                  # lys som ikke vises (erstatter standardlista)
 *
 * Lysene per rom hentes fra ki_rom (`sensor.<rom>_lys` → `entiteter`, `sensor.<rom>_lys_oversikt` → `lys`/`scener`),
 * ellers fra HA-områdene (hass.entities/devices/areas), ellers fra medlemmene i romgruppa (light.<rom>_lys).
 * Scenene bruker ki_rom sine knapper (`button.<rom>_lys_<scene>`) og faller tilbake til light.turn_on brightness_pct.
 *
 * KD.LYSH (felles lys-/romhjelpere) defineres her og brukes også av kd-rom-card (71).
 */
(() => {
  const KD = window.KD;
  if (!KD || !KD.KDSheet) return;
  const S = KD.S, E = KD.e;

  /* ======================================================================
   * KD.LYSH – felles hjelpere for lys og rom (ki_rom + HA-områder)
   * ==================================================================== */
  const H = KD.LYSH = KD.LYSH || {};
  H.Y = 'oklch(0.86 0.12 95)';
  const BADS = new Set(['unknown', 'unavailable', '', 'none']);

  /** Standard «skjul» per rom (fra brukerens gamle rom-popuper). Glob med * er lov. */
  H.SKJUL = {
    stue: ['media_player.tv_stue_a75_3'],
    pult: ['light.pultvifte_led', 'switch.pultvifte_*'],
    soverom: ['light.stavifte_led', 'light.sebastian_taklampe_1', 'light.sebastian_taklampe_2', 'light.sebastian_taklampe_3', 'light.sebastian_taklampe_4', 'switch.stavifte_*'],
    do: ['light.creality_k2_light', 'light.do_klimasensor_status_led'],
    inngang: ['switch.alarm_alarm_heimdall_2', 'switch.trappegang_roykvarsler_alarm_siren', 'switch.ringeklokke_boks', 'switch.shelly_em'],
    kjokken: ['switch.*gulvvarme*', '*_tuya_child_lock'],
    vaskegang: ['switch.*gulvvarme*', '*_tuya_child_lock'],
  };
  /** Standard effekt-par (bryter → effektsensor) */
  H.EFFEKT_PAR = {
    kjokken: { 'switch.brodrister': 'sensor.brodrister_power', 'switch.vannkoker': 'sensor.vannkoker_power', 'switch.kjoleskap': 'sensor.kjoleskap_power', 'switch.mikrobolgeovn': 'sensor.mikrobolgeovn_power', 'switch.kaffetrakter': 'sensor.kaffetrakter_power', 'switch.oppvaskmaskin': 'sensor.oppvaskmaskin_power' },
    vaskegang: { 'switch.fryseskap': 'sensor.fryseskap_power', 'switch.vaskemaskin': 'sensor.vaskemaskin_power' },
  };

  /** Glob-liste → test-funksjon */
  H.matcher = (list) => {
    const res = [].concat(list || []).filter(Boolean).map(p => new RegExp('^' + String(p).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'));
    return id => res.some(re => re.test(id));
  };
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  /** «Stue Grønn sofalampe» → «Grønn sofalampe» */
  H.strip = (name, rooms) => {
    let n = String(name || '');
    for (const r of [].concat(rooms || []).filter(Boolean).map(x => String(x).toLowerCase()).sort((a, b) => b.length - a.length)) {
      if (n.toLowerCase().startsWith(r + ' ')) n = n.slice(r.length + 1);
      if (n.toLowerCase().endsWith(' ' + r)) n = n.slice(0, -(r.length + 1));
    }
    n = n.trim();
    return cap(n) || name;
  };
  H.slug = s => String(s || '').toLowerCase().replace(/ø|ö/g, 'o').replace(/æ|ä|å/g, 'a').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  /* ---- ki_rom-sensorer ---- */
  let OV = null, OV_T = 0, OV_H = null;
  /** alle sensor.*_oversikt fra ki_rom (bufret 30 s) */
  H.ovIds = (hass) => {
    const now = Date.now();
    if (!OV || OV_H !== hass.states && now - OV_T > 30000 || OV.some(id => !hass.states[id])) {
      OV = Object.keys(hass.states).filter(id => id.startsWith('sensor.') && id.endsWith('_oversikt') && hass.states[id].attributes.integrasjon === 'ki_rom' && hass.states[id].attributes.area_id !== 'totalt');
      OV_T = now; OV_H = hass.states;
    }
    return OV;
  };
  const LO_CACHE = new Map(), LO_MISS = new Map();
  /** ki_rom sin romoversikt (sensor.<rom>_oversikt) */
  H.ov = (card, id) => {
    const h = card.hass; if (!h) return null;
    let st = card.st(`sensor.${id}_oversikt`);
    if (st && st.attributes.integrasjon === 'ki_rom') return st;
    const f = H.ovIds(h).find(x => h.states[x].attributes.area_id === id);
    return f ? card.st(f) : null;
  };
  /** lysscene-oversikten (sensor.<slug>_lys_oversikt, integrasjon ki_lys/ki_rom, ki_type oversikt) */
  H.lysOv = (card, id) => {
    const h = card.hass; if (!h) return null;
    const hit = LO_CACHE.get(id);
    if (hit && h.states[hit]) return card.st(hit);
    const ok = x => { const a = h.states[x] && h.states[x].attributes; return a && a.ki_type === 'oversikt' && (a.integrasjon === 'ki_lys' || a.integrasjon === 'ki_rom'); };
    let f = ok(`sensor.${id}_lys_oversikt`) ? `sensor.${id}_lys_oversikt` : null;
    const miss = LO_MISS.get(id);
    if (!f && miss && Date.now() - miss < 30000) return null; // fullt søk maks hvert 30. s
    if (!f) f = Object.keys(h.states).find(x => x.startsWith('sensor.') && x.endsWith('_lys_oversikt') && ok(x) && (h.states[x].attributes.area_id === id || (h.states[x].attributes.area_ids || []).length === 1 && h.states[x].attributes.area_ids[0] === id));
    if (f) { LO_CACHE.set(id, f); LO_MISS.delete(id); return card.st(f); }
    LO_MISS.set(id, Date.now());
    return null;
  };

  /* ---- HA-registeret (hass.entities / hass.devices / hass.areas) ---- */
  const AREA_MAP = new WeakMap();
  /** { area_id: [entity_id] } fra registeret (entitetens område, ellers enhetens) */
  H.areaMap = (hass) => {
    const ents = hass && hass.entities;
    if (!ents) return {};
    let m = AREA_MAP.get(ents);
    if (m) return m;
    m = {};
    const devs = hass.devices || {};
    for (const [id, e] of Object.entries(ents)) {
      if (!e || e.hidden || e.hidden_by || e.disabled_by || e.entity_category) continue;
      const aid = e.area_id || (e.device_id && devs[e.device_id] && devs[e.device_id].area_id);
      if (aid) (m[aid] = m[aid] || []).push(id);
    }
    for (const k in m) m[k].sort();
    AREA_MAP.set(ents, m);
    return m;
  };
  H.areaName = (hass, id) => (hass && hass.areas && hass.areas[id] && hass.areas[id].name) || null;
  H.areaOf = (hass, id) => {
    const e = hass && hass.entities && hass.entities[id]; if (!e) return null;
    return e.area_id || (e.device_id && hass.devices && hass.devices[e.device_id] && hass.devices[e.device_id].area_id) || null;
  };
  const isPower = (st) => {
    if (!st) return false;
    const u = String(st.attributes.unit_of_measurement || '');
    if (/wh$/i.test(u)) return false;
    return st.attributes.device_class === 'power' || /^w$|^kw$/i.test(u);
  };
  /** Finn effektsensor for en bryter/klima: samme enhet i registeret, ellers navnemønster */
  H.findPower = (hass, id) => {
    if (!hass || !id) return null;
    const slug = id.split('.')[1];
    const ent = hass.entities && hass.entities[id];
    if (ent && ent.device_id) {
      const same = Object.values(hass.entities).filter(x => x.device_id === ent.device_id && x.entity_id.startsWith('sensor.') && isPower(hass.states[x.entity_id]))
        .map(x => x.entity_id).sort((a, b) => (/(daily|total|energy)/.test(a) ? 1 : 0) - (/(daily|total|energy)/.test(b) ? 1 : 0));
      if (same.length) return same[0];
    }
    for (const c of [`sensor.${slug}_power`, `sensor.${slug}_effekt`, `sensor.${slug}_current_power_w`, `sensor.${slug}_power_w`, `sensor.${slug}_watt`]) if (isPower(hass.states[c])) return c;
    return null;
  };
  /** Romoversikt i ki_rom-format bygget fra HA-registeret (når ki_rom mangler) */
  H.areaOverview = (hass, areaId) => {
    const ids = (H.areaMap(hass)[areaId] || []).filter(id => hass.states[id]);
    const dom = d => ids.filter(id => id.startsWith(d + '.'));
    const dc = id => hass.states[id].attributes.device_class;
    const withP = l => l.map(id => ({ entity: id, effekt: H.findPower(hass, id) }));
    const bin = ['motion', 'occupancy', 'presence', 'moving', 'vibration', 'door', 'window', 'opening', 'garage_door', 'sound'];
    const sens = dom('sensor');
    return {
      integrasjon: null, area_id: areaId, rom: H.areaName(hass, areaId),
      lys: dom('light'), media: dom('media_player'), brytere: withP(dom('switch')), vifter: withP(dom('fan')), klima: withP(dom('climate')),
      gardiner: dom('cover'), sensorer: dom('binary_sensor').filter(id => bin.includes(dc(id))).map(id => ({ entity: id, klasse: dc(id) })),
      skript: dom('script'), scener: dom('scene'),
      temperatur: sens.filter(id => dc(id) === 'temperature'), fuktighet: sens.filter(id => dc(id) === 'humidity'),
      lysniva: sens.filter(id => dc(id) === 'illuminance'), effekt: sens.filter(id => isPower(hass.states[id])),
    };
  };

  /**
   * Lysene i et rom (r = rad fra KD.rooms). Rekkefølge: ki_rom-telleren, ki_rom-lysoversikten,
   * HA-området, medlemmene i romgruppa. Grupper fjernes når medlemmene er med. skjul = test-funksjon.
   */
  H.lights = (card, r, skjul) => {
    const h = card.hass; if (!h) return [];
    let ids = [];
    const cnt = card.st(`sensor.${r.id}_lys`);
    if (cnt && Array.isArray(cnt.attributes.entiteter)) ids.push(...cnt.attributes.entiteter);
    const lo = H.lysOv(card, r.id);
    if (lo && Array.isArray(lo.attributes.lys)) ids.push(...lo.attributes.lys);
    if (!ids.length) ids.push(...(H.areaMap(h)[r.id] || []).filter(id => id.startsWith('light.')));
    if (!ids.length && r.lys) { const g = h.states[r.lys]; const mem = g && g.attributes.entity_id; ids.push(...(Array.isArray(mem) && mem.length ? mem : [r.lys])); }
    ids = [...new Set(ids)].filter(id => h.states[id] && !(skjul && skjul(id)));
    const set = new Set(ids);
    ids = ids.filter(id => { const m = h.states[id].attributes.entity_id; return !(Array.isArray(m) && m.length && m.some(x => set.has(x))); });
    return ids;
  };
  /** Romnavn-varianter som strippes fra lysnavn */
  H.roomWords = (card, r) => {
    const out = [r.navn, r.id.replace(/_/g, ' '), H.areaName(card.hass, r.id)];
    const ov = H.ov(card, r.id); if (ov && ov.attributes.rom) out.push(ov.attributes.rom);
    return out;
  };
  H.nameOf = (card, id, words) => H.strip(card.at(id, 'friendly_name') || id.split('.')[1].replace(/_/g, ' '), words);

  /** Lysnivå i prosent: 0 = av, null = utilgjengelig. { v, dim } */
  H.level = (card, id) => {
    const st = card.st(id);
    if (!st || BADS.has(st.state)) return { v: 0, bad: true, dim: false };
    const modes = st.attributes.supported_color_modes || [];
    const dim = id.startsWith('light.') && (st.attributes.brightness != null || modes.some(m => m !== 'onoff'));
    if (st.state !== 'on') return { v: 0, dim };
    const b = st.attributes.brightness;
    return { v: b != null ? Math.max(1, Math.round(b / 255 * 100)) : 100, dim, onoff: b == null };
  };
  /** Prosentverdi slik den vises nå (drag/optimistisk verdi først) */
  H.shown = (card, id) => {
    const d = card.state.drag;
    if (d && d.id === id) return { v: d.v, dim: true, drag: true };
    const p = card._pend && card._pend[id];
    const lv = H.level(card, id);
    if (p && card.hass.states[id] === p.ref && Date.now() - p.t < 5000) return { ...lv, v: p.v, onoff: false };
    return lv;
  };
  H.valText = (lv) => lv.bad ? '–' : lv.v ? (lv.onoff ? 'På' : `${lv.v} %`) : 'Av';

  /** Designets lys-pille (brukes av både Lys- og Rom-arket). rom=true gir Rom-variantens små forskjeller. */
  H.pill = (card, id, name, rom) => {
    const lv = H.shown(card, id), v = lv.v, Y = H.Y, a = KD.a;
    const moving = card._d && card._d.moved;
    const pill = { position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 8, height: 56, padding: '0 12px 0 6px', borderRadius: 28, background: '#1c1c1f', touchAction: 'none', cursor: 'pointer', userSelect: 'none' };
    const fill = { position: 'absolute', left: 0, top: 0, bottom: 0, width: `${v}%`, background: `linear-gradient(90deg, ${a(Y, 0.18)}, ${a(Y, 0.42)})`, transition: moving ? 'none' : 'width .35s cubic-bezier(.34,1.2,.64,1)' };
    const iconWrap = { position: 'relative', width: 44, height: 44, borderRadius: 22, flex: 'none', display: 'grid', placeItems: 'center', background: v ? Y : '#2a2a2d', color: v ? '#141416' : '#6d6c69', transition: 'background .25s' };
    const valStyle = rom ? { fontSize: 11, color: v ? '#e6e4df' : '#6d6c69', fontVariantNumeric: 'tabular-nums' } : { fontSize: 11, color: v ? '#e6e4df' : '#6d6c69' };
    return `<div data-key="${E(id)}" data-arg="${E(id)}" data-on-pointerdown="lDown" data-on-pointermove="lMove" data-on-pointerup="lUp" data-on-pointercancel="lCancel" data-on-contextmenu="lMenu" style="${S(pill)}">
              <span style="${S(fill)}"></span>
              <span style="${S(iconWrap)}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">lightbulb</span></span>
              <span style="position:relative;flex:1;min-width:0;display:flex;flex-direction:column${rom ? ';gap:0' : ''}">
                <span style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(name)}</span>
                <span style="${S(valStyle)}">${E(H.valText(lv))}</span>
              </span>
            </div>`;
  };

  /** Metoder for dimming ved dra / av-på ved trykk. Blandes inn i kortklassene. */
  H.mixin = {
    lDown(ev, id, el) { try { el.setPointerCapture(ev.pointerId); } catch (e) { /* ok */ } this._d = { id, x: ev.clientX, moved: false, el }; },
    lMove(ev, id) {
      const d = this._d; if (!d || d.id !== id) return;
      if (Math.abs(ev.clientX - d.x) > 5) d.moved = true;
      if (!d.moved) return;
      const r = d.el.getBoundingClientRect();
      const v = Math.round(KD.clamp((ev.clientX - r.left) / r.width, 0, 1) * 100);
      if (!this.state.drag || this.state.drag.v !== v || this.state.drag.id !== id) this.setState({ drag: { id, v } });
    },
    lUp(ev, id) {
      const d = this._d; this._d = null;
      if (!d || d.id !== id) return;
      if (!d.moved) this.lightTap(id);
      else if (this.state.drag) this.setLight(id, this.state.drag.v);
      this.setState({ drag: null });
    },
    lCancel() { this._d = null; if (this.state.drag) this.setState({ drag: null }); },
    lMenu(ev, id) { ev.preventDefault(); this._d = null; this.more(id); },
    /** sett lysstyrke (0 = av) – optimistisk visning til HA svarer */
    setLight(id, v) {
      this._pend = this._pend || {};
      this._pend[id] = { v, t: Date.now(), ref: this.hass && this.hass.states[id] };
      setTimeout(() => this._queue(), 5100);
      if (this.onLightChange) this.onLightChange(id);
      const d = id.split('.')[0];
      if (!v) return this.call(d === 'light' ? 'light' : 'homeassistant', 'turn_off', { entity_id: id });
      if (d !== 'light') return this.call('homeassistant', 'turn_on', { entity_id: id });
      return this.call('light', 'turn_on', { entity_id: id, brightness_pct: v });
    },
    lightTap(id) {
      const on = this.v(id) === 'on', d = id.split('.')[0];
      if (this.onLightChange) this.onLightChange(id);
      if (on) { this._pend = this._pend || {}; this._pend[id] = { v: 0, t: Date.now(), ref: this.hass && this.hass.states[id] }; setTimeout(() => this._queue(), 5100); }
      return this.call(d === 'light' ? 'light' : 'homeassistant', on ? 'turn_off' : 'turn_on', { entity_id: id });
    },
    /** slå mange av/på (blandet domene) */
    setMany(ids, on) { if (!ids.length) return; if (this.onLightChange) this.onLightChange(null); return this.call('homeassistant', on ? 'turn_on' : 'turn_off', { entity_id: ids }); },
  };

  /** Klokkeslett + dagord («i dag», «i morgen», ukedag) fra ISO-tid eller «HH:MM» */
  H.when = (val) => {
    if (val == null || BADS.has(String(val))) return null;
    const d = new Date(val);
    if (isNaN(d)) return { dag: '', kl: String(val) };
    const n = new Date(), m = new Date(n); m.setDate(n.getDate() + 1);
    const kl = KD.hm(d);
    if (d.toDateString() === n.toDateString()) return { dag: 'i dag', kl, d };
    if (d.toDateString() === m.toDateString()) return { dag: 'i morgen', kl, d };
    return { dag: d.toLocaleDateString('nb-NO', { weekday: 'long' }), kl, d };
  };

  /** mdi-ikon (HA-område) → Material Symbols */
  H.msIcon = (mdi, def = 'home') => {
    const k = String(mdi || '').replace(/^mdi:/, '');
    const M = [[/sofa|couch/, 'weekend'], [/bed-king|bed-double/, 'king_bed'], [/bed/, 'bed'], [/silverware|stove|countertop|fridge|kitchen|chef/, 'countertops'], [/shower|bath/, 'bathtub'], [/toilet/, 'wc'],
      [/desk|office/, 'desk'], [/door/, 'door_front'], [/stair/, 'stairs'], [/garage/, 'garage'], [/tree|forest|flower|grass|nature/, 'park'], [/washing|laundry/, 'local_laundry_service'],
      [/television|tv/, 'tv'], [/laptop|monitor|desktop/, 'computer'], [/baby|child|teddy/, 'child_care'], [/balcony|deck|patio|umbrella/, 'deck'], [/home|house/, 'home']];
    for (const [re, ic] of M) if (re.test(k)) return ic;
    return def;
  };

  /* ======================================================================
   * kd-lys-card
   * ==================================================================== */
  const Y = H.Y, G = 'oklch(0.72 0.14 150)', PINK = KD.PINK, a = KD.a;
  const STARS = [[8, 14], [18, 30], [30, 10], [40, 24], [52, 8], [60, 34], [70, 16], [84, 28], [92, 12], [24, 46], [46, 44], [78, 42]];
  /** Designets natt-scene (Scene({ on })) som HTML */
  const scene = (on) => `<div style="position:absolute;inset:0;pointer-events:none">`
    + STARS.map(([x, y], i) => `<span style="${S({ position: 'absolute', left: x + '%', top: y + '%', width: i % 3 ? 2 : 3, height: i % 3 ? 2 : 3, borderRadius: 2, background: '#fff', animation: 'tw ' + (2 + i % 3) + 's ease-in-out ' + (i * 0.3) + 's infinite' })}"></span>`).join('')
    + `<span style="${S({ position: 'absolute', left: '24%', right: '-10%', top: '46%', height: 180, borderRadius: '50%', border: '1.5px dashed rgba(255,255,255,0.18)' })}"></span>`
    + `<span style="${S({ position: 'absolute', right: '26%', top: '28%', width: 18, height: 18, borderRadius: '50%', boxShadow: 'inset -5px -2px 0 0 #f1ecd9', transform: 'rotate(-20deg)', filter: 'drop-shadow(0 0 8px rgba(241,236,217,0.6))' })}"></span>`
    + `<span style="${S({ position: 'absolute', left: 0, right: 0, bottom: 0, height: 44, background: '#0f1612' })}"></span>`
    + `<span style="${S({ position: 'absolute', right: 18, bottom: 44, width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: '24px solid #0b120f' })}"></span>`
    + `<span style="${S({ position: 'absolute', right: 80, bottom: 44, width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: '20px solid #0b120f' })}"></span>`
    + `<span style="${S({ position: 'absolute', right: 30, bottom: 44, width: 58, height: 30, background: '#1e2433' })}"></span>`
    + `<span style="${S({ position: 'absolute', right: 24, bottom: 74, width: 0, height: 0, borderLeft: '35px solid transparent', borderRight: '35px solid transparent', borderBottom: '20px solid #262d3d' })}"></span>`
    + [40, 64].map(r => `<span style="${S({ position: 'absolute', right: r, bottom: 58, width: 9, height: 7, borderRadius: 1, background: on ? '#f3c96b' : '#2d3446', boxShadow: on ? '0 0 8px #f3c96b' : 'none', transition: 'background .6s, box-shadow .6s' })}"></span>`).join('')
    + [96, 22].map(r => `<span style="${S({ position: 'absolute', right: r, bottom: 44 })}">`
      + `<span style="${S({ position: 'absolute', left: -1, bottom: 0, width: 2, height: 14, background: '#3a4150' })}"></span>`
      + `<span style="${S({ position: 'absolute', left: -3, bottom: 14, width: 6, height: 6, borderRadius: 3, background: on ? '#ffe3a0' : '#3a4150', boxShadow: on ? '0 0 10px 3px rgba(255,210,120,0.8)' : 'none', transition: 'all .6s', animation: on ? 'glow 3s ease-in-out infinite' : 'none' })}"></span>`
      + `<span style="${S({ position: 'absolute', left: -18, bottom: -4, width: 36, height: 10, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,210,120,0.55), transparent)', opacity: on ? 1 : 0, transition: 'opacity .6s' })}"></span></span>`).join('')
    + `</div>`;

  /* Designets scener → ki_rom-scener (button.<rom>_lys_<id>) og nivå for reserve-dimming */
  const SC = [['max', 'Maks', 'light_mode', 100, 'maks'], ['kveld', 'Kveld', 'weekend', 45, 'komfort'], ['dim', 'Dempet', 'brightness_4', 20, 'mindre'], ['natt', 'Natt', 'bedtime', 5, 'natt'], ['av', 'Alt av', 'dark_mode', 0, 'av']];
  /* Kjente KI Utelys-innstillinger med designets tekster */
  const INST = [[/terskel_(paa|på|on)$/, 'Tenn når lysnivå under'], [/terskel_(av|off)$/, 'Slukk når lysnivå over'], [/minst_morke$/, 'Minste mørketid'], [/forskyv.*kveld|kveld.*forskyv/, 'Forskyvning kveld'], [/morgen_fra$/, 'Morgen fra'], [/slukk_senest$/, 'Slukk senest']];

  class KDLysCard extends KD.KDSheet {
    static get sheetCss() {
      return `@keyframes tw{0%,100%{opacity:.25}50%{opacity:1}}@keyframes glow{0%,100%{opacity:.75}50%{opacity:1}}
.kdl-a97:active{transform:scale(0.97)}.kdl-a96:active{transform:scale(0.96)}
a:hover{color:oklch(0.86 0.12 95)}`;
    }

    /** registeret (områder/enheter) kan komme eller endres uten at noen state endres */
    set hass(h) { const old = this._hass; super.hass = h; if (old && h && (old.entities !== h.entities || old.devices !== h.devices || old.areas !== h.areas)) this._queue(); }
    get hass() { return this._hass; }
    /* ----- entitetsoppslag ----- */
    _has(id) { return !!(id && this.hass && this.hass.states[id]); }
    /** config-verdi hvis den finnes, ellers første entitet som matcher mønsteret */
    _pick(key, re) {
      const c = this.config[key];
      if (this._has(c)) return c;
      this._pk = this._pk || {};
      const p = this._pk[key];
      if (p && (p.id ? this._has(p.id) : Date.now() - p.t < 30000)) return p.id; // søk maks hvert 30. s
      const f = re ? Object.keys(this.hass.states).find(id => re.test(id)) : null;
      this._pk[key] = { id: f || null, t: Date.now() };
      return f || null;
    }
    _skjul() {
      if (!this._skjulFn || this._skjulSrc !== this.config.skjul) {
        this._skjulSrc = this.config.skjul;
        this._skjulFn = H.matcher(this.config.skjul != null ? this.config.skjul : Object.values(H.SKJUL).flat().filter(x => /^light\./.test(x)));
      }
      return this._skjulFn;
    }

    /** Rom per fane: { f1: [{r, lights}], f2: [...], out: [...] } */
    _floors() {
      const h = this.hass, cfg = this.config;
      const rooms = KD.rooms(cfg.rom);
      // ki_rom-rom som ikke står i tabellen
      for (const id of H.ovIds(h)) {
        const at = h.states[id].attributes, aid = at.area_id;
        if (aid && !rooms[aid]) rooms[aid] = { id: aid, navn: at.rom || H.areaName(h, aid) || cap(aid.replace(/_/g, ' ')), ikon: H.msIcon(at.ikon), _niva: at.etasje_niva };
      }
      // HA-områder med lys (når ki_rom mangler)
      if (!H.ovIds(h).length && h.areas) {
        const am = H.areaMap(h);
        for (const aid of Object.keys(h.areas)) if (!rooms[aid] && (am[aid] || []).some(x => x.startsWith('light.'))) rooms[aid] = { id: aid, navn: h.areas[aid].name || aid, ikon: H.msIcon(h.areas[aid].icon) };
      }
      const niva = (r) => {
        if (r._niva != null) return r._niva;
        const ov = h.states[`sensor.${r.id}_oversikt`];
        if (ov && ov.attributes.etasje_niva != null) return ov.attributes.etasje_niva;
        const ar = h.areas && h.areas[r.id], fl = ar && ar.floor_id && h.floors && h.floors[ar.floor_id];
        return fl ? fl.level : null;
      };
      const explicit = cfg.etasjer && typeof cfg.etasjer === 'object' ? cfg.etasjer : null;
      const lvlTab = {};
      if (!explicit) for (const r of Object.values(rooms)) { const l = niva(r); if (l != null && (r.etasje === '1' || r.etasje === '2')) lvlTab[l] = lvlTab[l] || (r.etasje === '1' ? 'f1' : 'f2'); }
      const out = { f1: [], f2: [], out: [] };
      const skjul = this._skjul();
      const add = (tab, r) => { const lights = H.lights(this, r, skjul); if (lights.length) out[tab].push({ r, lights }); };
      if (explicit) {
        for (const tab of ['f1', 'f2']) for (const id of [].concat(explicit[tab] || [])) if (rooms[id]) add(tab, rooms[id]);
        return out;
      }
      for (const r of Object.values(rooms)) {
        if (r.etasje === '0' || r.id === 'ute') continue;
        const tab = r.etasje === '1' ? 'f1' : r.etasje === '2' ? 'f2' : (lvlTab[niva(r)] || 'f1');
        add(tab, r);
      }
      return out;
    }

    /* ----- handlinger ----- */
    tab(ev, k) { this.setState({ tab: k }); }
    onLightChange() { if (this.state.scene) this.setState({ scene: null }); }
    toggleOut() {
      const ids = this._outIds();
      const on = ids.some(id => this.v(id) === 'on');
      if (on) return this.setMany(ids.filter(id => this.v(id) === 'on'), false);
      const g = this.config.utelys;
      return this.setMany(this._has(g) ? [g] : ids, true);
    }
    autoTog(ev, id) { this.toggle(id); }
    lampTog(ev, id) { this.toggle(id); }
    fold(ev, k) { this.setState(st => ({ fold: { ...(st.fold || {}), [k]: !(st.fold || {})[k] } })); }
    rowMore(ev, id) { this.more(id); }
    roomAll(ev, arg) {
      const [tab, i] = arg.split(':'); const g = this._fl && this._fl[tab] && this._fl[tab][+i]; if (!g) return;
      const on = g.lights.filter(id => this.v(id) === 'on');
      this.setState({ scene: null });
      return this.setMany(on.length ? on : g.lights, !on.length);
    }
    sceneGo(ev, k) {
      const sc = SC.find(x => x[0] === k); if (!sc) return;
      const floor = this.state.tab === 'f2' ? 'f2' : 'f1';
      const groups = (this._fl && this._fl[floor]) || [];
      for (const g of groups) {
        const lo = H.lysOv(this, g.r.id);
        const list = lo && Array.isArray(lo.attributes.scener) ? lo.attributes.scener : [];
        const btn = (list.find(s => s.id === sc[4]) || {}).entity || `button.${g.r.id}_lys_${sc[4]}`;
        if (this._has(btn)) { this.press(btn); continue; }
        // reserve: sett nivået direkte
        const lvl = sc[3];
        if (!lvl) this.call('homeassistant', 'turn_off', { entity_id: g.lights });
        else {
          const dim = g.lights.filter(id => id.startsWith('light.')), rest = g.lights.filter(id => !id.startsWith('light.'));
          if (dim.length) this.call('light', 'turn_on', { entity_id: dim, brightness_pct: lvl });
          if (rest.length) this.call('homeassistant', 'turn_on', { entity_id: rest });
        }
      }
      this.setState({ scene: k });
    }
    allOff() {
      const ids = (this._onList || []).map(l => l.id);
      this.setState({ scene: 'av' });
      return this.setMany(ids, false);
    }
    offOne(ev, id) { this.setLight(id, 0); }

    _outIds() {
      const c = this.config, h = this.hass;
      const lamps = [].concat(c.utelamper || []).filter(id => this._has(id));
      const g = this._has(c.utelys) ? c.utelys : null;
      let ids = [...lamps];
      if (!ids.length && g) { const m = h.states[g].attributes.entity_id; if (Array.isArray(m)) ids = m.filter(x => this._has(x)); }
      if (!ids.length) ids = H.lights(this, { id: 'ute', lys: g }, this._skjul());
      if (g && !ids.includes(g)) ids = [g, ...ids];
      return ids;
    }

    /* ----- innhold ----- */
    body() {
      const s = this.state, c = this.config, h = this.hass;
      const tab = s.tab || c.fane || 'out';
      const tabDef = (k, l) => ({ k, label: l, style: { height: 38, padding: '0 14px', borderRadius: 19, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', background: tab === k ? PINK : 'transparent', color: tab === k ? '#2a1720' : '#c9c7c2', transition: 'background .2s' } });
      const tabs = [tabDef('out', 'Utelys'), tabDef('f1', 'Første etg'), tabDef('f2', 'Andre etg'), tabDef('on', 'Lys på')];
      const fl = this._fl = this._floors();

      let inner = '';
      if (tab === 'out') inner = this._out();
      else if (tab === 'f1' || tab === 'f2') inner = this._floor(tab, fl[tab]);
      else inner = this._on(fl);

      return `<div style="box-sizing:border-box;width:100%;max-width:420px;min-height:100vh;margin:0 auto;background:#141416;padding:20px 14px 40px;display:flex;flex-direction:column;gap:12px">
  <header style="display:flex;align-items:center;gap:12px;padding:0 4px">
    <span style="width:40px;height:40px;border-radius:20px;background:#e9e8e4;color:#141416;display:grid;place-items:center;flex:none"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">lightbulb</span></span>
    <div style="flex:1;font-size:26px;font-weight:500;letter-spacing:-0.02em">Lys</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <div style="display:flex;justify-content:center">
    <div style="display:flex;gap:2px;padding:4px;border-radius:22px;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.12)">
      ${tabs.map(t => `<button data-on-click="tab" data-arg="${t.k}" style="${S(t.style)}">${E(t.label)}</button>`).join('')}
    </div>
  </div>
${inner}
</div>`;
    }

    _out() {
      const c = this.config, h = this.hass;
      const ids = this._outIds();
      const out = ids.some(id => this.v(id) === 'on');
      const nPaa = this._pick('neste_paa', /^sensor\.(ki_)?utelys.*neste_(paa|på|on)$/), nAv = this._pick('neste_av', /^sensor\.(ki_)?utelys.*neste_(av|off)$/);
      const wPaa = H.when(nPaa && this.v(nPaa)), wAv = H.when(nAv && this.v(nAv));
      const sol = this._has(c.sol) ? c.sol : 'sun.sun';
      const rise = H.when(this.at(sol, 'next_rising')), set = H.when(this.at(sol, 'next_setting')), dusk = H.when(this.at(sol, 'next_dusk'));
      const outPill = { height: 28, padding: '0 10px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, background: out ? 'rgba(243,201,107,0.22)' : 'rgba(255,255,255,0.1)', color: out ? '#f3d58f' : '#c3c8d6' };
      const nw = out ? wAv : wPaa;
      const nextLabel = (out ? 'slukkes' : 'tennes') + (nw && nw.dag ? ' ' + nw.dag : '');
      const nextTime = nw ? nw.kl : '–';
      const kl = w => w ? w.kl : '–';
      const times = [['emoji_objects', 'Tennes' + (wPaa && wPaa.dag ? ' ' + wPaa.dag : ''), kl(wPaa)], ['light_off', 'Slukkes' + (wAv && wAv.dag ? ' ' + wAv.dag : ''), kl(wAv)]];
      const sw = on => ({ track: { position: 'relative', width: 46, height: 28, borderRadius: 14, flex: 'none', background: on ? G : '#3a3a3d', transition: 'background .2s' }, knob: { position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: 11, background: '#1c1c1f', transition: 'left .2s' } });
      const autoPill = { display: 'flex', alignItems: 'center', gap: 14, height: 64, padding: '0 16px 0 5px', borderRadius: 32, background: '#1c1c1f', width: '100%', boxSizing: 'border-box' };
      const autoIcon = { width: 54, height: 54, borderRadius: 27, flex: 'none', display: 'grid', placeItems: 'center', background: '#262629' };
      const autos = [
        [this._pick('auto', /^switch\.(ki_)?utelys.*_(auto|automatikk)$/), 'smart_toy', 'Automatikk', out ? 'Utelyset er på' : 'Utelyset er av'],
        [this._pick('kveld', /^switch\.(ki_)?utelys.*_kveld$/), 'wb_twilight', 'Kveld', 'Tenn i skumringen'],
        [this._pick('morgen', /^switch\.(ki_)?utelys.*_morgen$/), 'sunny', 'Morgen', 'Tenn før det lysner'],
      ].filter(x => x[0]);
      const lamps = [].concat(c.utelamper || []).filter(id => this._has(id));
      const lampList = lamps.length ? lamps : ids.filter(id => id !== c.utelys);
      // dagslengde
      let dagl = '–';
      if (rise && set && rise.d && set.d) {
        let ms = set.d - rise.d; if (ms < 0) ms += 86400e3; if (ms > 86400e3) ms -= 86400e3;
        const m = Math.round(ms / 60000); dagl = `${Math.floor(m / 60)} t ${m % 60} min`;
      }
      const st = this.state.fold || {};
      const foldDef = (k, icon, title, meta, rows) => {
        const open = !!st[k];
        return { k, icon, title, meta, open, chev: { fontSize: 22, color: '#a9a7a2', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .25s' },
          rows: rows.map(([k2, v, id], i) => ({ k: k2, v, id, row: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' } })) };
      };
      // innstillinger: config eller alle KI Utelys-tall/tider
      let instIds = [].concat(c.innstillinger || []).filter(id => this._has(id));
      if (!c.innstillinger) instIds = Object.keys(h.states).filter(id => /^(number|input_number|time|input_datetime|select)\.(ki_)?utelys_/.test(id)).sort((x, y) => {
        const ix = INST.findIndex(([re]) => re.test(x)), iy = INST.findIndex(([re]) => re.test(y));
        return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy) || x.localeCompare(y);
      });
      const instRows = instIds.map(id => {
        const hit = INST.find(([re]) => re.test(id));
        const label = hit ? hit[1] : H.strip(this.fname(id).replace(/^KI Utelys\s*/i, ''), []);
        const stt = this.st(id); let v = stt ? stt.state : '–';
        if (stt && !isNaN(parseFloat(v)) && /^(number|input_number)\./.test(id)) { const n = parseFloat(v); v = (n < 0 ? '−' : '') + KD.nf(Math.abs(n), Number.isInteger(n) ? 0 : 1) + (this.unit(id) ? ' ' + this.unit(id) : ''); }
        else if (stt && /^time\./.test(id)) v = String(v).slice(0, 5);
        else if (!stt || KD.BAD.has(v)) v = '–';
        return [label, v, id];
      });
      const folds = [foldDef('sol', 'light_mode', 'Sola', `↑ ${kl(rise)} ↓ ${kl(set)}`, [['Soloppgang', kl(rise)], ['Solnedgang', kl(set)], ['Borgerlig skumring', kl(dusk)], ['Dagslengde', dagl]])];
      if (instRows.length) folds.push(foldDef('inst', 'tune', 'Innstillinger', 'terskler og mørketid', instRows));

      return `
    <section style="position:relative;overflow:hidden;height:176px;border-radius:28px;background:linear-gradient(180deg,#0e1330 0%,#1a1f3d 70%,#131a1a 100%)">
      ${scene(out)}
      <div style="position:absolute;left:18px;top:18px;display:flex;flex-direction:column;gap:8px;align-items:flex-start">
        <span style="font-size:13px;font-weight:500;color:#dfe3ee">Utelys</span>
        <button data-on-click="toggleOut" style="${S(outPill)}"><span class="ms" style="font-size:15px;font-variation-settings:'FILL' 1">${out ? 'wb_twilight' : 'dark_mode'}</span><span>${out ? 'På' : 'Av'}</span></button>
      </div>
      <div style="position:absolute;left:18px;bottom:16px;display:flex;flex-direction:column;gap:6px">
        <span style="display:flex;align-items:baseline;gap:8px"><span style="font-size:13px;color:#c3c8d6">${E(nextLabel)}</span><span style="font-size:28px;font-weight:300;letter-spacing:-0.02em;font-variant-numeric:tabular-nums">${E(nextTime)}</span></span>
        <span style="font-size:12px;color:#c3c8d6">Sol opp ${E(kl(rise))} · ned ${E(kl(set))}</span>
      </div>
    </section>

    <section style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${times.map(([icon, k, v], i) => `<div data-on-click="rowMore" data-arg="${E((i ? nAv : nPaa) || '')}" style="display:flex;flex-direction:column;gap:6px;padding:12px 16px 16px 12px;border-radius:28px;background:#1c1c1f">
          <span style="width:50px;height:50px;border-radius:25px;background:#262629;display:grid;place-items:center;margin-bottom:22px"><span class="ms" style="font-size:24px">${icon}</span></span>
          <span style="font-size:13px;color:#c9c7c2;padding-left:4px">${E(k)}</span>
          <span style="font-size:32px;font-weight:300;letter-spacing:-0.03em;line-height:1;padding-left:4px;font-variant-numeric:tabular-nums">${E(v)}</span>
        </div>`).join('')}
    </section>

    ${autos.length ? `<section style="display:flex;flex-direction:column;gap:8px">
      ${autos.map(([id, icon, k, sub]) => { const w = sw(this.isOn(id)); return `<button data-on-click="autoTog" data-arg="${E(id)}" style="${S(autoPill)}">
          <span style="${S(autoIcon)}"><span class="ms" style="font-size:24px">${icon}</span></span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column;text-align:left"><span style="font-size:15px;font-weight:500">${E(k)}</span><span style="font-size:12px;color:#a9a7a2">${E(sub)}</span></span>
          <span style="${S(w.track)}"><span style="${S(w.knob)}"></span></span>
        </button>`; }).join('')}
    </section>` : ''}

    ${lampList.length ? `<section style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${lampList.map(id => { const lit = this.v(id) === 'on'; const name = H.strip(this.fname(id), ['ute']);
        const st2 = { height: 72, padding: '0 20px', borderRadius: 36, display: 'flex', alignItems: 'center', gap: 14, background: lit ? Y : '#1c1c1f', color: lit ? '#1a1a1c' : '#c9c7c2', boxShadow: lit ? '0 8px 24px oklch(0.86 0.12 95 / 0.25)' : 'none', transition: 'background .3s, box-shadow .3s' };
        return `<button class="kdl-a97" data-on-click="lampTog" data-arg="${E(id)}" data-hold="rowMore" style="${S(st2)}"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">${/veranda/i.test(name + id) ? 'light' : 'lightbulb'}</span><span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(name)}</span></button>`; }).join('')}
    </section>` : ''}

    ${folds.map(d => `<section style="display:flex;flex-direction:column;border-radius:28px;background:#1c1c1f;overflow:hidden">
        <button data-on-click="fold" data-arg="${d.k}" style="display:flex;align-items:center;gap:12px;height:58px;padding:0 18px;text-align:left">
          <span class="ms" style="font-size:22px">${d.icon}</span>
          <span style="flex:1;font-size:15px;font-weight:500">${E(d.title)}</span>
          <span style="font-size:12px;color:#a9a7a2;white-space:nowrap">${E(d.meta)}</span>
          <span class="ms" style="${S(d.chev)}">expand_more</span>
        </button>
        ${d.open ? `<div style="display:flex;flex-direction:column;padding:0 18px 10px">
            ${d.rows.map(r => `<div ${r.id ? `data-on-click="rowMore" data-arg="${E(r.id)}" ` : ''}style="${S(r.row)}"><span style="flex:1;font-size:13px">${E(r.k)}</span><span style="font-size:12px;font-weight:600;padding:6px 11px;border-radius:12px;background:#262629;font-variant-numeric:tabular-nums">${E(r.v)}</span></div>`).join('')}
          </div>` : ''}
      </section>`).join('')}`;
    }

    _floor(tab, groups) {
      const s = this.state;
      const scenes = SC.map(([k, label, icon]) => { const act = s.scene === k; return { k, label, icon,
        bubble: { width: 58, height: 58, borderRadius: 29, display: 'grid', placeItems: 'center', background: act ? PINK : '#1c1c1f', color: act ? '#2a1720' : '#c9c7c2', transform: act ? 'scale(1.06)' : 'scale(1)', transition: 'transform .35s cubic-bezier(.34,1.8,.64,1), background .25s' },
        iconStyle: { fontSize: 24, fontVariationSettings: `'FILL' ${act ? 1 : 0}` }, labelStyle: { fontSize: 11, fontWeight: 500, color: act ? '#f2f1ee' : '#8e8d89' } }; });
      return `
    <section data-hscroll="1" style="display:flex;gap:12px;overflow-x:auto;scrollbar-width:none;margin:0 -14px;padding:2px 18px">
      ${scenes.map(c => `<button data-on-click="sceneGo" data-arg="${c.k}" style="flex:none;display:flex;flex-direction:column;align-items:center;gap:6px;width:62px">
          <span style="${S(c.bubble)}"><span class="ms" style="${S(c.iconStyle)}">${c.icon}</span></span>
          <span style="${S(c.labelStyle)}">${E(c.label)}</span>
        </button>`).join('')}
    </section>
    ${groups.map((g, gi) => {
      const words = H.roomWords(this, g.r);
      const n = g.lights.filter(id => H.shown(this, id).v > 0).length;
      const allStyle = { height: 30, padding: '0 12px', borderRadius: 15, fontSize: 12, fontWeight: 600, background: n ? '#262629' : a(Y, 0.18), color: n ? '#c9c7c2' : Y };
      const lights = g.lights.map(id => ({ id, name: H.nameOf(this, id, words) })).sort((x, y) => x.name.localeCompare(y.name, 'nb'));
      return `<section data-key="${E(g.r.id)}" style="display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;align-items:center;gap:10px;padding:4px 6px 0">
          <span class="ms" style="font-size:18px;color:#a9a7a2">${E(g.r.ikon || 'home')}</span>
          <span style="flex:1;font-size:15px;font-weight:500">${E(g.r.navn)}</span>
          <span style="font-size:12px;color:#8e8d89;white-space:nowrap">${n ? `${n} på` : 'alle av'}</span>
          <button data-on-click="roomAll" data-arg="${tab}:${gi}" style="${S(allStyle)}">${n ? 'Av' : 'På'}</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${lights.map(l => H.pill(this, l.id, l.name, false)).join('')}
        </div>
      </section>`; }).join('')}`;
    }

    _on(fl) {
      const h = this.hass, c = this.config;
      const seen = new Map();
      for (const tab of ['f1', 'f2']) for (const g of fl[tab]) for (const id of g.lights) if (!seen.has(id)) seen.set(id, g.r);
      const outs = new Set(this._outIds()); // utelyset styres i sin egen fane (som i designet)
      const hh = this._has(c.hele_huset) ? c.hele_huset : null;
      const skjul = this._skjul();
      if (hh) for (const id of [].concat(this.at(hh, 'aktiv_liste') || [])) if (!seen.has(id) && !outs.has(id) && this._has(id) && !skjul(id)) { const aid = H.areaOf(h, id); seen.set(id, { id: aid || '', navn: (aid && (H.areaName(h, aid) || (KD.ROOMS[aid] && KD.ROOMS[aid].navn))) || '' }); }
      const on = [];
      for (const [id, r] of seen) {
        const lv = H.shown(this, id);
        if (lv.v > 0 && !(h.states[id].attributes.entity_id && Array.isArray(h.states[id].attributes.entity_id) && h.states[id].attributes.entity_id.some(x => seen.has(x)))) on.push({ id, r, lv, name: H.nameOf(this, id, r.id ? H.roomWords(this, r) : []) });
      }
      this._onList = on;
      // effekt: egen sensor, ellers summen av lysenes egne effektsensorer
      let watt = null;
      if (this.ok(c.effekt)) watt = Math.round(this.n(c.effekt, 0) * (/^kw$/i.test(this.unit(c.effekt)) ? 1000 : 1));
      else { let sum = 0, any = false; for (const l of on) { const p = `sensor.${l.id.split('.')[1]}_power`; if (this.ok(p)) { sum += this.n(p, 0); any = true; } } if (any) watt = Math.round(sum); }
      return `
    <section style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-radius:28px;background:#1c1c1f">
      <span style="display:flex;flex-direction:column;flex:1"><span style="font-size:34px;font-weight:300;letter-spacing:-0.03em;line-height:1">${on.length}</span><span style="font-size:12px;color:#8e8d89">lys på${watt != null ? ` · ca. ${watt} W` : ''}</span></span>
      <button class="kdl-a96" data-on-click="allOff" style="height:48px;padding:0 20px;border-radius:24px;background:#f2f1ee;color:#141416;font-size:14px;font-weight:600;display:flex;align-items:center;gap:6px"><span class="ms" style="font-size:20px">dark_mode</span>Slå av alle</button>
    </section>
    <section style="display:flex;flex-direction:column;gap:8px">
      ${on.map(l => `<button data-key="${E(l.id)}" data-on-click="offOne" data-arg="${E(l.id)}" data-hold="rowMore" style="display:flex;align-items:center;gap:12px;height:60px;padding:0 16px 0 6px;border-radius:30px;background:#1c1c1f;text-align:left">
          <span style="width:48px;height:48px;border-radius:24px;flex:none;display:grid;place-items:center;background:oklch(0.86 0.12 95);color:#141416"><span class="ms" style="font-size:20px;font-variation-settings:'FILL' 1">lightbulb</span></span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:14px;font-weight:500">${E(l.name)}</span><span style="font-size:11px;color:#8e8d89">${E([l.r.navn, H.valText(l.lv)].filter(Boolean).join(' · '))}</span></span>
          <span class="ms" style="font-size:20px;color:#8e8d89">power_settings_new</span>
        </button>`).join('')}
      ${!on.length ? `<div style="padding:30px;text-align:center;font-size:13px;color:#6d6c69">Alle lys er av</div>` : ''}
    </section>`;
    }
  }
  KDLysCard.head = ['lightbulb', 'Lys', 'Alle rom'];
  KDLysCard.defaults = {
    fane: 'out',
    utelys: 'light.ute_lys',
    utelamper: ['light.verandalamp', 'light.utelys_inngang'],
    neste_paa: 'sensor.ki_utelys_neste_paa',
    neste_av: 'sensor.ki_utelys_neste_av',
    auto: 'switch.ki_utelys_auto',
    kveld: 'switch.ki_utelys_kveld',
    morgen: 'switch.ki_utelys_morgen',
    sol: 'sun.sun',
    hele_huset: 'sensor.hele_huset_lys',
    effekt: 'sensor.lys_power',
  };
  Object.assign(KDLysCard.prototype, H.mixin);

  KD.define('kd-lys-card', KDLysCard, 'KD Lys', 'Utelys, lys per etasje og rom (dra for å dimme), og alle lys som er på – fra ki_rom/ki_utelys.');
  KD.sheet('lys', 'kd-lys-card');
})();
