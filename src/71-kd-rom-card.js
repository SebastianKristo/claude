/*
 * kd-rom-card – «Rom v2» fra Claude Design (pikselkopi) med ekte data.
 *
 *   type: custom:kd-rom-card
 *   rom: stue                 # ki_rom-/område-ID (standard: rommet i URL-hashen, ellers stue)
 *   navn / ikon / farge       # standard fra KD.ROOMS (ikon = Material Symbols-navn)
 *   temp / fukt / sett / lys  # overstyr sensorer, settpunkt (input_number/number) og lysgruppe
 *   skjul: [media_player.x, 'switch.pultvifte_*']            # skjul enheter (erstatter standardlista for rommet)
 *   effekt_par: { switch.vannkoker: sensor.vannkoker_power }  # bryter → effektsensor (legges over standard)
 *   gardin_inverter: false    # true hvis gardinens posisjon betyr «% lukket»
 *
 * Innholdet bygges fra ki_rom (`sensor.<rom>_oversikt`: lys, media, brytere, vifter, klima, gardiner, sensorer,
 * skript, scener, temperatur, fuktighet, lysniva, effekt). Uten ki_rom brukes HA-områdene (hass.entities/devices/areas).
 * Lysscenene er ki_rom-knappene (`button.<rom>_lys_<scene>` fra `sensor.<rom>_lys_oversikt`).
 * Krever KD.LYSH fra 70-kd-lys-card.js.
 */
(() => {
  const KD = window.KD;
  if (!KD || !KD.KDSheet) return;
  const H = KD.LYSH;
  if (!H) { console.error('kd-rom-card: KD.LYSH mangler (70-kd-lys-card.js må lastes først)'); return; }
  const S = KD.S, E = KD.e, C = KD.C, a = KD.a, PINK = KD.PINK;
  const nf = (n, d = 1) => KD.nf(n, d);
  const OVERRIDES = ['navn', 'ikon', 'farge', 'temp', 'fukt', 'sett', 'lys'];
  const LIST_KEYS = ['lys', 'media', 'brytere', 'vifter', 'klima', 'gardiner', 'sensorer', 'skript', 'scener', 'temperatur', 'fuktighet', 'lysniva', 'effekt'];
  /* ki_rom-scene-id → designets tekst og ikon */
  const KI_SC = { maks: ['Maks', 'light_mode'], komfort: ['Komfort', 'weekend'], middag: ['Middag', 'restaurant'], tv: ['TV-kveld', 'tv'], mindre: ['Dempet', 'brightness_4'], natt: ['Natt', 'bedtime'], av: ['Alt av', 'dark_mode'] };
  /* reserve uten ki_rom: designets scener og nivåer */
  const SCENES = [['max', 'Maks', 'light_mode'], ['komfort', 'Komfort', 'weekend'], ['middag', 'Middag', 'restaurant'], ['tv', 'TV-kveld', 'tv'], ['dim', 'Dempet', 'brightness_4'], ['av', 'Alt av', 'dark_mode']];
  const sceneLevel = (k, i, name) => ({ max: 100, komfort: [60, 45, 0, 50, 40, 70, 0, 55, 30][i % 9], middag: /spise/i.test(name) ? 85 : i % 2 ? 25 : 0, tv: i % 3 === 0 ? 15 : 0, dim: 30, av: 0 })[k];
  /* binary_sensor-klasse → [på-tekst, av-tekst, ikon] */
  const BIN = {
    door: ['Åpen', 'Lukket', 'door_front'], window: ['Åpen', 'Lukket', 'window'], opening: ['Åpen', 'Lukket', 'sensor_door'], garage_door: ['Åpen', 'Lukket', 'garage'],
    motion: ['Bevegelse', 'Stille', 'directions_walk'], occupancy: ['Noen her', 'Stille', 'sensor_occupied'], presence: ['Noen her', 'Stille', 'sensor_occupied'],
    moving: ['Bevegelse', 'Stille', 'directions_run'], vibration: ['Vibrerer', 'Stille', 'vibration'], sound: ['Lyd', 'Stille', 'graphic_eq'],
  };
  /* enhetsikon gjettet fra navnet */
  const DEV_ICON = [[/server|rack|nas\b|ruter|router|switch_poe/, 'dns'], [/\btv\b|fjernsyn/, 'tv'], [/\bpc\b|desktop|datamaskin/, 'desktop_windows'], [/skjerm|monitor/, 'monitor'],
    [/kaffe/, 'coffee_maker'], [/kjøleskap|kjoleskap|fryse/, 'kitchen'], [/oppvask/, 'dishwasher_gen'], [/vaskemaskin|tørketrommel|torketrommel/, 'local_laundry_service'],
    [/håndkle|hankle|handkle/, 'dry_cleaning'], [/vannkoker/, 'kettle'], [/brødrister|brodrister/, 'breakfast_dining'], [/mikro/, 'microwave'], [/printer|creality|3d/, 'print'],
    [/vifte|fan/, 'mode_fan'], [/stikkontakt|uttak|outlet/, 'outlet'], [/lampe|lys\b/, 'lightbulb'], [/varme|ovn|heater/, 'heat'], [/lader|charger/, 'power']];
  const devIcon = (id, name) => { const t = String(name).toLowerCase(); const hit = DEV_ICON.find(([re]) => re.test(t)); return hit ? hit[1] : id.startsWith('fan.') ? 'mode_fan' : 'power'; };
  const eid = x => typeof x === 'string' ? x : x && x.entity;

  class KDRomCard extends KD.KDSheet {
    static get sheetCss() {
      return `.kdr-a97:active{transform:scale(0.97)}.kdr-a92:active{transform:scale(0.92)}
.kd-editing .kd-ent{position:relative;padding-right:36px!important;box-shadow:inset 0 0 0 1.5px oklch(0.78 0.13 350 / 0.55)!important;transition:opacity .2s}
.kd-editing .kd-ent.kd-hid{opacity:.38;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.12)!important}
.kd-editing .kd-ent::after{content:'visibility';font-family:'Material Symbols Rounded';font-size:18px;line-height:1;position:absolute;right:10px;top:50%;transform:translateY(-50%);color:oklch(0.82 0.1 350);pointer-events:none;-webkit-font-feature-settings:'liga';font-feature-settings:'liga'}
.kd-editing .kd-ent.kd-hid::after{content:'visibility_off';color:#f2f1ee}`;
    }
    /** registeret (områder/enheter) kan komme eller endres uten at noen state endres */
    set hass(h) { const old = this._hass; super.hass = h; if (old && h && (old.entities !== h.entities || old.devices !== h.devices || old.areas !== h.areas)) this._queue(); }
    get hass() { return this._hass; }
    onConnect() {
      super.onConnect();
      this._hashH = () => { if (!this.config.rom) this._queue(); };
      window.addEventListener('hashchange', this._hashH);
      window.addEventListener('location-changed', this._hashH);
    }
    onDisconnect() {
      super.onDisconnect();
      window.removeEventListener('hashchange', this._hashH);
      window.removeEventListener('location-changed', this._hashH);
    }
    _has(id) { return !!(id && this.hass && this.hass.states[id]); }

    /* ----- rommet ----- */
    _room() {
      const c = this.config, h = this.hass;
      let id = c.rom;
      if (!id && location.hash) { const hit = Object.entries(KD.ROOMS).find(([k, r]) => r.hash === location.hash || '#' + k === location.hash); if (hit) id = hit[0]; }
      id = id || 'stue';
      const r = { id, ...(KD.rooms()[id] || {}) };
      for (const k of OVERRIDES) if (c[k] != null && c[k] !== '') r[k] = c[k];
      const ov = h ? H.ov(this, id) : null;
      if (!r.navn) r.navn = (ov && ov.attributes.rom) || (h && H.areaName(h, id)) || (id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' '));
      if (!r.ikon) r.ikon = H.msIcon((ov && ov.attributes.ikon) || (h && h.areas && h.areas[id] && h.areas[id].icon), 'home');
      if (!r.farge) r.farge = C.green;
      return r;
    }
    _live(r, o) {
      const L = KD.roomLive(this, r);
      if (!L.tempId && o && o.temperatur[0]) { L.tempId = o.temperatur[0]; L.temp = this.n(L.tempId); }
      if (!L.humId && o && o.fuktighet[0]) { L.humId = o.fuktighet[0]; L.hum = this.n(L.humId); }
      const ids = xs => xs.map(x => typeof x === 'string' ? x : x && x.entity).filter(Boolean);
      if (o) {
        L.tempValg = [...new Set([...(L.tempValg || []), ...ids(o.temperatur)])];
        L.humValg = [...new Set([...(L.humValg || []), ...ids(o.fuktighet)])];
      }
      return L;
    }
    /** romoversikt i ki_rom-format, med skjul og effekt-par brukt */
    _ov(r) {
      const c = this.config, h = this.hass;
      const st = H.ov(this, r.id);
      const src = st ? st.attributes : H.areaOverview(h, r.id);
      const baseHide = H.matcher(c.skjul != null ? c.skjul : (H.SKJUL[r.id] || []));
      const hideAll = H.hideFn(this, baseHide, r.id);
      this._hideNow = hideAll;
      const hide = this.state.edit ? (id => /_child_lock$|_status_led$/.test(id) && baseHide(id)) : hideAll; // i tilpass-modus vises alt
      const o = {};
      for (const k of LIST_KEYS) o[k] = [].concat(src[k] || []).filter(x => eid(x) && h.states[eid(x)] && !hide(eid(x))).map(x => typeof x === 'string' ? x : { ...x });
      o.lys = H.lights(this, r, hide);
      o.ki = !!st;
      // effekt-par: config > standard > ki_rom > gjetting
      const par = { ...(H.EFFEKT_PAR[r.id] || {}), ...(c.effekt_par || {}) };
      const used = new Set();
      for (const d of [...o.brytere, ...o.vifter, ...o.klima]) {
        if (Object.prototype.hasOwnProperty.call(par, d.entity)) d.effekt = par[d.entity] || null;
        else if (!d.effekt || !h.states[d.effekt]) d.effekt = H.findPower(h, d.entity);
        if (d.effekt && used.has(d.effekt)) d.effekt = null;
        if (d.effekt) used.add(d.effekt);
      }
      return o;
    }
    _w(id) {
      if (!this.ok(id)) return null;
      const v = this.n(id, 0), u = this.unit(id);
      return /^kw$/i.test(u) ? v * 1000 : /^mw$/i.test(u) ? v / 1000 : v;
    }

    /* ----- handlinger ----- */
    onLightChange() { if (this.state.scene) this.setState({ scene: null }); }
    lightsAll() {
      const ids = this._lights || []; if (!ids.length) return;
      const on = ids.filter(id => this.v(id) === 'on');
      this.setState({ scene: null });
      return this.setMany(on.length ? on : ids, !on.length);
    }
    curtain(ev, id) {
      const pos = this.at(id, 'current_position', null);
      if (pos == null) return this.call('cover', 'toggle', { entity_id: id });
      const inv = !!this.config.gardin_inverter, cv = inv ? 100 - pos : pos;
      const nv = cv >= 100 ? 0 : cv >= 50 ? 100 : 50;
      return this.call('cover', 'set_cover_position', { entity_id: id, position: inv ? 100 - nv : nv });
    }
    mediaTog(ev, id) {
      if (this.state.edit) return this.hideTog(ev, id);
      const s = this.v(id);
      return this.call('media_player', ['off', 'standby', 'unavailable'].includes(s) ? 'turn_on' : 'media_play_pause', { entity_id: id });
    }
    moreInfo(ev, id) { if (this.state.edit && id && id.includes('.')) return this.hideTog(ev, id); this.more(id); }
    devTog(ev, id) { if (this.state.edit) return this.hideTog(ev, id); this.toggle(id); }
    /* ----- tilpass rommet (skjul/vis i UI) ----- */
    /** «Tilpass rommet» ved siden av «Tilpass oppsett» (base setter inn stilen) */
    tilpassKnapp() { return this.state.edit ? '' : `<button class="kdr-a97" data-key="kd-edit-btn" data-on-click="editTog" style="%STIL%"><span class="ms" style="font-size:18px">tune</span>Tilpass rommet</button>`; }
    editTog() { this.setState({ edit: !this.state.edit }); }
    hideTog(ev, id) {
      if (!id) return;
      const r = this._room(), ud = JSON.parse(JSON.stringify(H.userHideNow(this) || {}));
      const row = ud[r.id] = ud[r.id] || { skjul: [], vis: [] };
      row.skjul = row.skjul || []; row.vis = row.vis || [];
      const hidden = this._hideNow ? this._hideNow(id) : row.skjul.includes(id);
      row.skjul = row.skjul.filter(x => x !== id); row.vis = row.vis.filter(x => x !== id);
      if (!hidden) row.skjul.push(id); else row.vis.push(id);
      this.haptic('selection');
      H.saveUserHide(this, ud);
      this._queue();
    }
    /** velg hvilken sensor rommet henter temperatur/fukt fra (lagres per bruker, brukes også i Hjem) */
    sensorPick(ev, arg) {
      const [k, id] = String(arg).split('|'); if (!k || !id) return;
      const r = this._room(), ud = JSON.parse(JSON.stringify(KD.userData(this) || {}));
      const row = ud[r.id] = ud[r.id] || {};
      if (row[k] === id) delete row[k]; else row[k] = id;
      this.haptic('selection');
      KD.saveUserData(this, ud);
      this._queue();
    }
    editReset() {
      const r = this._room(), ud = JSON.parse(JSON.stringify(H.userHideNow(this) || {}));
      delete ud[r.id]; H.saveUserHide(this, ud); this._queue();
    }
    /* ----- tilpass fliser og scener (per bruker, i romraden: fliser/scener { skjul, vis, rekkefolge, navn, ekstra }) ----- */
    _udRow(kind, fn) {
      const r = this._room(), ud = JSON.parse(JSON.stringify(KD.userData(this) || {}));
      const row = ud[r.id] = ud[r.id] || {};
      const g = row[kind] = row[kind] || {};
      fn(g);
      for (const k of Object.keys(g)) if ((Array.isArray(g[k]) && !g[k].length) || (g[k] && typeof g[k] === 'object' && !Array.isArray(g[k]) && !Object.keys(g[k]).length)) delete g[k];
      if (!Object.keys(g).length) delete row[kind];
      this.haptic('selection');
      KD.saveUserData(this, ud);
      this._queue();
    }
    tileTog(ev, key) { this.edHide(ev, 'fliser|' + key); }
    sceneHide(ev, key) { this.edHide(ev, 'scener|' + key); }
    edHide(ev, arg) {
      const i = String(arg).indexOf('|'), kind = arg.slice(0, i), key = arg.slice(i + 1);
      const hidden = kind === 'fliser' ? (this._tileHid ? this._tileHid(key) : false) : !!((this._scenes || []).find(x => x.key === key) || {}).hid;
      this._udRow(kind, g => {
        g.skjul = (g.skjul || []).filter(x => x !== key);
        if (kind === 'fliser') { g.vis = (g.vis || []).filter(x => x !== key); if (!hidden) g.skjul.push(key); else g.vis.push(key); }
        else if (!hidden) g.skjul.push(key);
      });
    }
    edMove(ev, arg) {
      const [kind, key, d] = String(arg).split('|');
      const list = [...((kind === 'fliser' ? this._tileOrder : this._sceneOrder) || [])];
      const i = list.indexOf(key), j = i + (+d); if (i < 0 || j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      this._udRow(kind, g => { g.rekkefolge = list; });
    }
    edName(ev, arg, el) {
      const i = String(arg).indexOf('|'), kind = arg.slice(0, i), key = arg.slice(i + 1), v = String((el && el.value) || '').trim();
      const def = (el && el.getAttribute('placeholder')) || '';
      this._udRow(kind, g => { g.navn = { ...(g.navn || {}) }; if (!v || v === def) delete g.navn[key]; else g.navn[key] = v.slice(0, 30); });
    }
    edKey(ev) { if (ev.key === 'Enter') { ev.preventDefault(); ev.target.blur(); } }
    scDel(ev, key) {
      this._udRow('scener', g => { g.ekstra = (g.ekstra || []).filter(x => x !== key); g.skjul = (g.skjul || []).filter(x => x !== key); g.rekkefolge = (g.rekkefolge || []).filter(x => x !== key); if (g.navn) delete g.navn[key]; });
    }
    scAddTog() { this.setState({ scAdd: !this.state.scAdd, scQ: '' }); }
    scQ(ev, arg, el) { this._scQ = el.value; clearTimeout(this._scqT); this._scqT = setTimeout(() => this.setState({ scQ: this._scQ }), 150); }
    scAddGo(ev, id) {
      if (!id) return;
      this._udRow('scener', g => { g.ekstra = [...(g.ekstra || []).filter(x => x !== id), id]; g.skjul = (g.skjul || []).filter(x => x !== id); });
    }
    /** redigeringspanel for fliser/scener: gi nytt navn, flytt, skjul/vis (+ legg til scene/skript) */
    _edPanel(kind, title, icon, items, navn) {
      const s = this.state, n = items.length;
      const ib = (on, arg, ic, tip, col, dis) => `<button class="kdr-a92" data-on-click="${on}" data-arg="${E(arg)}" title="${tip}" style="${S({ width: 34, height: 34, borderRadius: 17, flex: 'none', display: 'grid', placeItems: 'center', color: col || '#8e8d89', opacity: dis ? 0.25 : 1, pointerEvents: dis ? 'none' : null })}"><span class="ms" style="font-size:19px">${ic}</span></button>`;
      const rows = items.map((x, i) => `<div data-key="ed-${kind}-${E(x.key)}" style="display:flex;align-items:center;gap:2px;min-height:48px;border-top:${i ? '1px solid rgba(255,255,255,0.05)' : 'none'}">
          <span style="${S({ width: 34, height: 34, borderRadius: 17, flex: 'none', display: 'grid', placeItems: 'center', marginRight: 6, background: x.hid ? '#262629' : 'oklch(0.78 0.13 350 / 0.18)', color: x.hid ? '#6d6c69' : 'oklch(0.85 0.09 350)' })}"><span class="ms" style="font-size:18px">${E(x.icon)}</span></span>
          <input data-on-change="edName" data-on-keydown="edKey" data-arg="${E(kind + '|' + x.key)}" value="${E(x.label)}" placeholder="${E(x.def)}" maxlength="30" enterkeyhint="done" autocomplete="off" style="${S({ flex: 1, minWidth: 0, height: 36, padding: '0 10px', borderRadius: 12, border: 'none', outline: 'none', background: 'rgba(255,255,255,0.04)', color: x.hid ? '#8e8d89' : '#f2f1ee', font: 'inherit', fontSize: 13, boxSizing: 'border-box', textDecoration: x.hid ? 'line-through' : 'none' })}">
          ${ib('edMove', `${kind}|${x.key}|-1`, 'arrow_upward', 'Flytt fram', null, i === 0)}${ib('edMove', `${kind}|${x.key}|1`, 'arrow_downward', 'Flytt bak', null, i === n - 1)}
          ${ib('edHide', `${kind}|${x.key}`, x.hid ? 'visibility_off' : 'visibility', x.hid ? 'Vis' : 'Skjul', x.hid ? '#6d6c69' : 'oklch(0.82 0.1 350)')}
          ${x.extra ? ib('scDel', x.key, 'delete', 'Fjern', 'oklch(0.72 0.15 25)') : ''}
        </div>`).join('');
      let add = '';
      if (kind === 'scener') {
        const have = new Set(items.map(x => x.key)), q = String(s.scQ || '').toLowerCase(), r = this._r || this._room(), w = String(r.navn || r.id).toLowerCase();
        const cand = s.scAdd ? Object.keys(this.all()).filter(id => /^(scene|script)\./.test(id) && !have.has(id) && (!q || (id + ' ' + this.fname(id)).toLowerCase().includes(q)))
          .sort((x, y) => ((y.includes(r.id) || this.fname(y).toLowerCase().includes(w)) - (x.includes(r.id) || this.fname(x).toLowerCase().includes(w))) || (y.startsWith('scene.') - x.startsWith('scene.')) || this.fname(x).localeCompare(this.fname(y), 'nb')) : [];
        add = `<button class="kdr-a92" data-on-click="scAddTog" style="display:flex;align-items:center;justify-content:center;gap:6px;height:40px;margin-top:6px;border-radius:20px;font-size:13px;font-weight:500;background:${s.scAdd ? 'oklch(0.78 0.13 350 / 0.2)' : 'rgba(255,255,255,0.06)'};color:#e6e4df"><span class="ms" style="font-size:18px">${s.scAdd ? 'expand_less' : 'add'}</span>${s.scAdd ? 'Lukk' : 'Legg til scene eller skript'}</button>
        ${s.scAdd ? `<input data-key="kd-scq" data-keep="1" data-on-input="scQ" placeholder="Søk etter scene eller skript …" autocomplete="off" style="height:38px;margin-top:8px;padding:0 14px;border-radius:19px;border:none;outline:none;background:#262629;color:#f2f1ee;font:inherit;font-size:13px;box-sizing:border-box;width:100%">
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;max-height:240px;overflow-y:auto;overscroll-behavior:contain">${cand.slice(0, 40).map(id => `<button class="kdr-a92" data-key="kd-sca-${E(id)}" data-on-click="scAddGo" data-arg="${E(id)}" style="${S({ display: 'flex', alignItems: 'center', gap: 6, maxWidth: '100%', minWidth: 0, height: 34, padding: '0 12px 0 8px', borderRadius: 17, fontSize: 12, fontWeight: 500, background: 'rgba(255,255,255,0.06)', color: '#c9c7c2' })}"><span class="ms" style="font-size:16px;flex:none">${id.startsWith('script.') ? 'play_circle' : 'palette'}</span><span style="min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(this.fname(id))}</span></button>`).join('') || '<span style="font-size:12px;color:#6d6c69">Ingen scener eller skript funnet</span>'}</div>
        ${cand.length > 40 ? `<span style="display:block;margin-top:6px;font-size:11px;color:#6d6c69">${cand.length - 40} til – søk for å snevre inn</span>` : ''}` : ''}`;
      }
      return `<div data-key="kd-ed-${kind}" style="display:flex;flex-direction:column;padding:12px 10px 10px 12px;border-radius:24px;background:#1c1c1f;box-shadow:inset 0 0 0 1px oklch(0.78 0.13 350 / 0.25)">
      <div style="display:flex;align-items:center;gap:8px;padding:0 4px 6px;font-size:12px;color:#8e8d89"><span class="ms" style="font-size:16px">${icon}</span><span style="flex:1">${E(title)} · gi nytt navn, flytt eller skjul</span></div>
      ${rows || '<span style="padding:8px 4px;font-size:12px;color:#6d6c69">Ingen ennå</span>'}${add}
    </div>`;
    }
    sensorAll(ev, k) { this.setState({ sensAll: this.state.sensAll === k ? null : k, sensQ: '' }); }
    sensorQ(ev, arg, el) { this._sensQ = el.value; clearTimeout(this._sqT); this._sqT = setTimeout(() => this.setState({ sensQ: this._sensQ }), 150); }
    /** Animasjonen i topp-pillen (innflyging + pulserende glød) – av/på per bruker, gjelder alle popups */
    animTog() {
      const v = { ...KD.ud(this, 'kd_innst') }; v.topp_animasjon = v.topp_animasjon === false;
      this.haptic('selection'); KD.udSave(this, 'kd_innst', v);
      if (v.topp_animasjon === false) KD.stopSheetTop(document.body);
    }
    /** alle temperatur-/fuktsensorer i HA (enhet/device_class), rommets egne først */
    _allSensors(k, r) {
      const all = this.all(), words = String(r.navn || r.id).toLowerCase().split(/\s+/)[0];
      const ok = id => { if (!id.startsWith('sensor.')) return false; const A = all[id].attributes || {}, u = String(A.unit_of_measurement || '');
        return k === 'temp' ? (A.device_class === 'temperature' || /°\s*[cf]/i.test(u)) : (A.device_class === 'humidity' || (u === '%' && /fukt|humid/i.test(id + ' ' + (A.friendly_name || '')))); };
      const q = String(this.state.sensQ || '').toLowerCase();
      return Object.keys(all).filter(ok).filter(id => !q || (id + ' ' + this.fname(id)).toLowerCase().includes(q))
        .sort((x, y) => (y.includes(r.id) || this.fname(y).toLowerCase().includes(words)) - (x.includes(r.id) || this.fname(x).toLowerCase().includes(words)) || this.fname(x).localeCompare(this.fname(y), 'nb'));
    }
    _sensorPicker(r, L) {
      const U = KD.userRoom(this, r.id), s = this.state;
      const chip = (k, id, cur, unit) => {
        const sel = id === cur, fixed = U[k] === id, v = this.n(id);
        return `<button class="kdr-a92" data-key="kd-sv-${k}-${E(id)}" data-on-click="sensorPick" data-arg="${E(k + '|' + id)}" style="${S({ display: 'flex', alignItems: 'center', gap: 6, maxWidth: '100%', minWidth: 0, height: 34, padding: '0 12px', borderRadius: 17, fontSize: 12, fontWeight: 500, background: sel ? 'oklch(0.78 0.13 350 / 0.2)' : 'rgba(255,255,255,0.06)', boxShadow: sel ? 'inset 0 0 0 1.5px oklch(0.78 0.13 350 / 0.7)' : 'none', color: sel ? '#f2f1ee' : '#a9a7a2' })}">${fixed ? '<span class="ms" style="font-size:14px">push_pin</span>' : ''}<span style="min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(this.fname(id))}</span><span style="color:#8e8d89;white-space:nowrap">${v != null ? E(nf(v, unit === '%' ? 0 : 1) + (unit === '%' ? ' %' : '°')) : '–'}</span></button>`;
      };
      const row = (k, title, icon, list0, cur, unit) => {
        const list = [...new Set([...(U[k] ? [U[k]] : []), ...list0])];
        const open = s.sensAll === k, more = open ? this._allSensors(k, r).filter(id => !list.includes(id)) : [];
        return `<div style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#8e8d89"><span class="ms" style="font-size:16px">${icon}</span><span style="flex:1">${title}</span>
        <button class="kdr-a92" data-on-click="sensorAll" data-arg="${k}" style="height:28px;padding:0 10px;border-radius:14px;font-size:11px;font-weight:500;background:${open ? 'oklch(0.78 0.13 350 / 0.2)' : 'rgba(255,255,255,0.06)'};color:#c9c7c2;display:flex;align-items:center;gap:4px"><span class="ms" style="font-size:15px">${open ? 'expand_less' : 'search'}</span>${open ? 'Lukk' : 'Alle sensorer'}</button></div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${list.map(id => chip(k, id, cur, unit)).join('') || '<span style="font-size:12px;color:#6d6c69">Ingen forslag i rommet – søk i alle sensorer</span>'}</div>
      ${open ? `<input data-key="kd-sq-${k}" data-keep="1" data-on-input="sensorQ" placeholder="Søk etter sensor …" autocomplete="off" style="height:38px;padding:0 14px;border-radius:19px;border:none;outline:none;background:#262629;color:#f2f1ee;font:inherit;font-size:13px;box-sizing:border-box;width:100%">
      <div style="display:flex;flex-wrap:wrap;gap:6px;max-height:260px;overflow-y:auto;overscroll-behavior:contain">${more.slice(0, 60).map(id => chip(k, id, cur, unit)).join('') || '<span style="font-size:12px;color:#6d6c69">Ingen treff</span>'}</div>
      ${more.length > 60 ? `<span style="font-size:11px;color:#6d6c69">${more.length - 60} til – søk for å snevre inn</span>` : ''}` : ''}
    </div>`;
      };
      const t = row('temp', 'Temperatur fra', 'device_thermostat', L.tempValg || [], L.tempId, '°');
      const f = row('fukt', 'Fukt fra', 'humidity_percentage', L.humValg || [], L.humId, '%');
      const anim = KD.ud(this, 'kd_innst').topp_animasjon !== false;
      return `<section data-key="kd-sensorvalg" style="display:flex;flex-direction:column;gap:14px;padding:14px 16px;border-radius:24px;background:#1c1c1f">${t}${f}
      <button class="kdr-a92" data-on-click="animTog" style="display:flex;align-items:center;gap:10px;min-height:44px;text-align:left">
        <span class="ms" style="font-size:18px;color:#8e8d89">animation</span>
        <span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:13px;font-weight:500">Animasjon i toppen</span><span style="font-size:11px;color:#8e8d89">Innflyging og glød i topp-pillen (alle popups)</span></span>
        <span style="${S({ width: 44, height: 26, borderRadius: 13, flex: 'none', position: 'relative', background: anim ? 'oklch(0.78 0.13 350)' : '#3a3a3d', transition: 'background .2s' })}"><span style="${S({ position: 'absolute', top: 3, left: anim ? 21 : 3, width: 20, height: 20, borderRadius: 10, background: '#f4f3ef', transition: 'left .25s cubic-bezier(.34,1.56,.64,1)' })}"></span></span>
      </button></section>`;
    }
    afterRender() {
      const root = this.$('.kd-root > div, .kd-sheet-body > div');
      const edit = !!this.state.edit, hide = this._hideNow;
      this.$$('[data-key]').forEach(el => {
        const k = el.getAttribute('data-key');
        const ent = /^[a-z_]+\.[a-z0-9_]+$/.test(k) && !/^(button|script|scene)\./.test(k);
        el.classList.toggle('kd-ent', edit && ent);
        el.classList.toggle('kd-hid', edit && ent && !!hide && hide(k));
      });
      this._root.classList.toggle('kd-editing', edit);
    }
    sceneGo(ev, key) {
      const sc = (this._scenes || []).find(x => x.key === key); if (!sc) return;
      if (sc.ent) this.toggle(sc.ent);
      else {
        // reserve: designets nivåer per lys
        (this._lightRows || []).forEach((l, i) => { const lvl = sceneLevel(sc.fb, i, l.name); this.setLight(l.id, lvl); });
      }
      this.setState({ scene: key });
    }
    step(ev, dir) {
      const k = this._k; if (!k) return;
      const nv = KD.clamp(Math.round((k.set + (+dir) * k.step) * 100) / 100, k.min, k.max);
      this._setPend = { v: nv, ref: this.hass.states[k.id], t: Date.now() };
      setTimeout(() => this._queue(), 5100);
      this.setState({});
      if (k.kind === 'climate') return this.call('climate', 'set_temperature', { entity_id: k.id, temperature: nv });
      return this.setNum(k.id, nv);
    }
    /* volum: dra på streken */
    mDown(ev, id, el) { this._md = { id, x: ev.clientX, y: ev.clientY, moved: false, scroll: false, el, pid: ev.pointerId }; }
    mMove(ev, id) {
      const d = this._md; if (!d || d.id !== id || d.scroll) return;
      const dx = ev.clientX - d.x, dy = ev.clientY - d.y;
      if (!d.moved) {
        if (Math.abs(dy) > 8 && Math.abs(dy) >= Math.abs(dx)) { d.scroll = true; return; }
        if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) { d.moved = true; try { d.el.setPointerCapture(d.pid); } catch (e) { /* ok */ } } else return;
      }
      const r = d.el.getBoundingClientRect(), v = Math.round(KD.clamp((ev.clientX - r.left) / r.width, 0, 1) * 100);
      if (!this.state.vol || this.state.vol.v !== v) this.setState({ vol: { id, v } });
    }
    mUp(ev, id) {
      const d = this._md; this._md = null;
      if (!d || !d.moved || !this.state.vol) return;
      const v = this.state.vol.v;
      this._volPend = { id, v, ref: this.hass.states[id], t: Date.now() };
      setTimeout(() => this._queue(), 5100);
      this.setState({ vol: null });
      return this.call('media_player', 'volume_set', { entity_id: id, volume_level: v / 100 });
    }
    mCancel() { this._md = null; if (this.state.vol) this.setState({ vol: null }); }

    /* ----- klima ----- */
    _klima(r, o, temp, words) {
      const h = this.hass;
      const cl = o.klima[0] || null;
      let id = r.sett && this._has(r.sett) ? r.sett : null;
      if (!id && this._has(`number.ki_rom_${r.id}_temp`)) id = `number.ki_rom_${r.id}_temp`;
      if (!id && this._has(`number.ki_rom_${H.slug(r.navn)}_temp`)) id = `number.ki_rom_${H.slug(r.navn)}_temp`;
      let kind = 'num', set = null, step = 0.5, min = 5, max = 35;
      if (id) { set = this.n(id); step = Number(this.at(id, 'step', 0.5)) || 0.5; min = Number(this.at(id, 'min', 5)); max = Number(this.at(id, 'max', 35)); }
      else if (cl) { kind = 'climate'; id = cl.entity; set = this.at(id, 'temperature', null); step = Number(this.at(id, 'target_temp_step', 0.5)) || 0.5; min = Number(this.at(id, 'min_temp', 5)); max = Number(this.at(id, 'max_temp', 35)); }
      if (set == null || isNaN(set)) return null;
      set = Number(set);
      const p = this._setPend;
      if (p && p.ref === h.states[id] && Date.now() - p.t < 5000) set = p.v;
      // navn og effekt: fra settpunktets «base» (input_number.stue_oljefyr_teller → climate/switch.stue_oljefyr), ellers klimaenheten
      const base = kind === 'num' ? id.split('.')[1].replace(/_teller$|_temp$/, '') : null;
      let name, power = null, heatId = null;
      if (base && this._has('climate.' + base)) heatId = 'climate.' + base;
      else if (base && this._has('switch.' + base)) heatId = 'switch.' + base;
      else if (kind === 'climate' || (cl && !base)) heatId = cl.entity;
      if (heatId) name = H.strip(this.fname(heatId), words);
      else if (this.at(id, 'friendly_name')) name = H.strip(String(this.fname(id)).replace(/\s*(teller|temp|temperatur)$/i, ''), words);
      else name = H.strip((base || id.split('.')[1]).replace(/_/g, ' '), words);
      const kd = heatId && o.klima.concat(o.brytere).find(d => d.entity === heatId);
      power = (kd && kd.effekt) || (base && H.findPower(h, 'x.' + base)) || (heatId && H.findPower(h, heatId)) || (cl && cl.effekt) || null;
      const w = power ? this._w(power) : null;
      const climId = heatId && heatId.startsWith('climate.') ? heatId : cl ? cl.entity : null;
      const heating = w != null ? w > 10 : climId && this.at(climId, 'hvac_action') ? this.at(climId, 'hvac_action') === 'heating' : temp != null && set > temp;
      return { id, kind, set, step, min: isNaN(min) ? 5 : min, max: isNaN(max) ? 35 : max, name, w: w != null ? Math.round(w) : null, heating, power };
    }

    /* ----- innhold ----- */
    body() {
      const s = this.state, c = this.config, h = this.hass;
      const r = this._r = this._room();
      const o = this._ov(r);
      const L = this._live(r, o);
      const words = H.roomWords(this, r);
      const col = r.farge || C.green;
      const temp = L.temp, hum = L.hum;

      // historikk (24 t) → 25 timepunkter som i designet
      let temps = null;
      if (L.tempId) {
        const hist = this.cached('kdrom-t-' + L.tempId, 5 * 60e3, () => this.history([L.tempId], 24), null);
        const pts = ((hist && hist[L.tempId]) || []).filter(p => typeof p.v === 'number');
        if (pts.length) {
          const t0 = Date.now() - 24 * 3600e3;
          temps = Array.from({ length: 25 }, (_, i) => { const t = t0 + i * 3600e3; let v = pts[0].v; for (const p of pts) { if (+p.t <= t) v = p.v; else break; } return v; });
        }
      }
      const mn = temps ? Math.min(...temps) : null, mx = temps ? Math.max(...temps) : null;
      const line = temps ? temps.map((t, i) => `${i ? 'L' : 'M'}${(i / 24 * 384).toFixed(1)},${(56 - (t - mn) / (mx - mn || 1) * 48).toFixed(1)}`).join(' ') : '';
      const tempRange = temps ? `${nf(mn)}–${nf(mx)}°` : '–';

      // lys
      const lightRows = this._lightRows = o.lys.map(id => ({ id, name: H.nameOf(this, id, words) })).sort((x, y) => x.name.localeCompare(y.name, 'nb'));
      this._lights = o.lys;
      const on = o.lys.filter(id => H.shown(this, id).v > 0).length;

      // klima
      const k = this._k = this._klima(r, o, temp, words);

      // enheter (brytere + vifter)
      const devices = [...o.brytere, ...o.vifter].map(d => {
        const isOn = this.v(d.entity) === 'on', w = d.effekt ? this._w(d.effekt) : null, name = H.strip(this.fname(d.entity), words);
        return { ...d, name, on: isOn, w: w != null ? Math.round(w) : 0, bad: !this.ok(d.entity), icon: devIcon(d.entity, name) };
      });
      // effekt i rommet: alle unike effektsensorer (parede + rommets egne)
      const pw = new Set([...devices.map(d => d.effekt), ...o.klima.map(d => d.effekt), k && k.power, ...o.effekt].filter(Boolean));
      let watt = 0; for (const id of pw) { const w = this._w(id); if (w != null && w > 0) watt += w; }
      watt = Math.round(watt);

      // gardin, media, sensorer
      const cover = o.gardiner[0] || null;
      let cv = null;
      if (cover) { const pos = this.at(cover, 'current_position', null); cv = pos != null ? (c.gardin_inverter ? 100 - pos : pos) : (['open', 'opening'].includes(this.v(cover)) ? 100 : 0); cv = Math.round(cv); }
      const media = o.media.map(id => {
        const st = this.st(id), state = st ? st.state : 'unavailable', playing = state === 'playing';
        const vp = this._volPend, drag = s.vol && s.vol.id === id;
        let vol = st && st.attributes.volume_level != null ? Math.round(st.attributes.volume_level * 100) : null;
        if (vp && vp.id === id && vp.ref === st && Date.now() - vp.t < 5000) vol = vp.v;
        if (drag) vol = s.vol.v;
        const src = st && (st.attributes.app_name || st.attributes.source || st.attributes.media_title);
        const off = ['off', 'standby', 'unavailable', 'unknown'].includes(state);
        const parts = [playing ? 'Spiller' : off ? 'Av' : 'Pauset'];
        if (playing && src) parts.push(src);
        if (vol != null && !off) parts.push(`${vol} %`);
        return { id, name: this.fname(id), sub: parts.join(' · '), playing, vol: vol || 0, tv: st && st.attributes.device_class === 'tv' };
      });
      const m0 = media[0];
      const sensors = o.sensorer.map(x => {
        const id = eid(x), cls = (typeof x === 'object' && x.klasse) || this.at(id, 'device_class') || '';
        const b = BIN[cls] || ['Aktiv', 'Stille', 'sensors'];
        const ok = this.ok(id), onS = this.v(id) === 'on';
        let icon = b[2]; const name = H.strip(this.fname(id), words);
        if (cls === 'motion' && /g\d|turret|kamera|camera|doorbell|ringeklokke/i.test(id + ' ' + name)) icon = 'videocam';
        return { id, name, icon, state: ok ? (onS ? b[0] : b[1]) : '–', hot: ok && onS, pres: /occupancy|presence|motion/.test(cls) };
      }).concat(o.lysniva.map(id => ({ id, name: o.lysniva.length > 1 ? H.strip(this.fname(id), words) : 'Lysnivå', icon: 'light_mode', state: this.ok(id) ? `${nf(this.n(id, 0), 1)} lx` : '–', hot: false, pres: false })));
      const act = sensors.filter(z => z.hot).length;

      // fliser (designets tile())
      const tile = (key, icon, label, sub, cc, actv, go, arg, fillPct) => ({ key, icon, label, sub, go, arg,
        style: { position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 10, height: 66, padding: '0 12px 0 8px', borderRadius: 33, background: '#1c1c1f', boxShadow: actv ? `inset 0 0 0 1px ${a(cc, 0.35)}` : 'none', transition: 'box-shadow .3s, transform .2s' },
        fill: { position: 'absolute', left: 0, top: 0, bottom: 0, width: `${fillPct ?? (actv ? 100 : 0)}%`, background: a(cc, 0.16), transition: 'width .5s cubic-bezier(.34,1.2,.64,1)' },
        iconWrap: { position: 'relative', width: 50, height: 50, borderRadius: 25, flex: 'none', display: 'grid', placeItems: 'center', background: actv ? cc : '#2a2a2d', color: actv ? '#141416' : '#a9a7a2', transition: 'background .3s' },
        subStyle: { fontSize: 12, color: actv ? '#e6e4df' : '#8e8d89', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } });
      const presOn = sensors.some(z => z.pres && z.hot);
      const tStrom = () => tile('strom', 'bolt', 'Strøm', `${watt} W nå`, C.amber, watt > 0, 'moreInfo', o.effekt[0] || '');
      const presS = sensors.find(z => z.pres);
      const TF = { // alle mulige fliser (nøkkel → bygger)
        lys: () => tile('lys', 'lightbulb', 'Lys', on ? `${on} av ${o.lys.length} på` : 'Alle av', C.yellow, on > 0, 'lightsAll', ''),
        gardin: cover ? () => tile('gardin', 'curtains', 'Gardiner', cv ? `${cv} % åpen` : 'Lukket', C.pink, cv > 0, 'curtain', cover, cv) : null,
        media: m0 ? () => tile('media', m0.tv ? 'tv' : 'speaker', 'Media', m0.playing ? 'Spiller' : 'Pauset', C.green, m0.playing, 'mediaTog', m0.id) : null,
        tilstede: presS || !m0 ? () => tile('tilstede', 'sensor_occupied', 'Tilstede', presOn ? 'Noen her' : 'Tomt', C.blue, act > 0, 'moreInfo', (presS || {}).id || '') : null,
        strom: tStrom,
        fukt: () => tile('fukt', 'water_drop', 'Fukt', `${hum != null ? nf(hum, 0) : '–'} %`, C.blue, false, 'moreInfo', L.humId || ''),
        klima: k ? () => tile('klima', 'heat', 'Klima', `${Number.isInteger(k.set) ? k.set : nf(k.set, 1)}° · ${k.heating ? 'varmer' : 'holder'}`, C.red, !!k.heating, 'moreInfo', k.power || k.id) : null,
      };
      const U = KD.userRoom(this, r.id), UF = U.fliser || {}, US = U.scener || {};
      const tDef = ['lys', cover ? 'gardin' : 'strom', m0 ? 'media' : 'tilstede', cover ? 'strom' : 'fukt'];
      const tAll = [...tDef, ...Object.keys(TF).filter(x => !tDef.includes(x))].filter(x => TF[x]);
      const ordered = (all, rek) => [...(rek || []).filter(x => all.includes(x)), ...all.filter(x => !(rek || []).includes(x))].filter((x, i, arr) => arr.indexOf(x) === i);
      const tOrder = this._tileOrder = ordered(tAll, UF.rekkefolge);
      const tHid = x => (UF.skjul || []).includes(x) || (!tDef.includes(x) && !(UF.vis || []).includes(x));
      this._tileHid = tHid;
      const tilesAll = tOrder.map(x => { const t = TF[x](); t.def = t.label; if (UF.navn && UF.navn[x]) t.label = UF.navn[x]; t.hid = tHid(x); return t; });
      const tiles = s.edit ? tilesAll : tilesAll.filter(t => !t.hid);

      // scener
      const lo = H.lysOv(this, r.id);
      let scenes = [];
      if (lo && Array.isArray(lo.attributes.scener)) scenes = lo.attributes.scener.filter(x => x && this._has(x.entity)).map(x => { const m = KI_SC[x.id]; return { key: x.entity, ent: x.entity, label: m ? m[0] : x.navn, icon: m ? m[1] : H.msIcon(x.ikon, 'auto_awesome') }; });
      else for (const id of Object.keys(KI_SC)) { const b = `button.${r.id}_lys_${id}`; if (this._has(b)) scenes.push({ key: b, ent: b, label: KI_SC[id][0], icon: KI_SC[id][1] }); }
      for (const id of [...o.skript, ...o.scener]) scenes.push({ key: id, ent: id, label: H.strip(this.fname(id), words), icon: id.startsWith('script.') ? 'play_circle' : 'palette' });
      if (!scenes.length && o.lys.length) scenes = SCENES.map(([key, label, icon]) => ({ key: 'fb:' + key, fb: key, label, icon }));
      for (const id of [].concat(US.ekstra || [])) if (this._has(id) && !scenes.some(x => x.key === id)) scenes.push({ key: id, ent: id, label: H.strip(this.fname(id), words), icon: id.startsWith('script.') ? 'play_circle' : 'palette', extra: true });
      const sHid = x => (US.skjul || []).includes(x);
      const sOrder = this._sceneOrder = ordered(scenes.map(x => x.key), US.rekkefolge);
      scenes = sOrder.map(key => { const x = scenes.find(y => y.key === key); return { ...x, def: x.label, label: (US.navn && US.navn[key]) || x.label, hid: sHid(key) }; });
      this._scenes = scenes;
      const scShown = s.edit ? scenes : scenes.filter(x => !x.hid);

      const humBar = { display: 'block', width: `${hum != null ? KD.clamp(hum, 0, 100) : 0}%`, height: '100%', borderRadius: 3, background: hum > 60 ? C.amber : C.blue };
      const headIcon = { width: 40, height: 40, borderRadius: 20, flex: 'none', display: 'grid', placeItems: 'center', background: col, color: '#141416' };
      const climIcon = k ? { width: 52, height: 52, borderRadius: 26, flex: 'none', display: 'grid', placeItems: 'center', background: k.heating ? C.red : '#2a2a2d', color: k.heating ? '#141416' : '#a9a7a2', transition: 'background .3s' } : null;
      const modeLabel = k ? (k.heating ? (k.w != null ? `Varmer · ${k.w} W` : 'Varmer') : 'Holder temperaturen') : '';
      const setVal = k ? (Number.isInteger(k.set) ? String(k.set) : nf(k.set, 1)) : '';
      this._headVals = [r.ikon, r.navn, `${temp != null ? nf(temp, 1) : '–'}° · ${hum != null ? nf(hum, 0) : '–'} %`];

      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) ${s.edit ? 'calc(190px + env(safe-area-inset-bottom))' : '40px'};display:flex;flex-direction:column;gap:18px">
  <header style="display:flex;align-items:center;gap:12px;padding:0 4px">
    <span style="${S(headIcon)}"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">${E(r.ikon)}</span></span>
    <div style="flex:1;font-size:26px;font-weight:500;letter-spacing:-0.02em">${E(r.navn)}</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section style="display:flex;align-items:center;gap:16px;padding:18px 20px;border-radius:30px;background:#1c1c1f">
    <div data-on-click="moreInfo" data-arg="${E(L.tempId || '')}" style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">
      <span style="display:flex;align-items:center;gap:6px;font-size:12px;color:#8e8d89"><span class="ms" style="font-size:17px;color:oklch(0.82 0.12 75);font-variation-settings:'FILL' 1">thermostat</span>Temperatur</span>
      <span style="font-size:46px;font-weight:300;letter-spacing:-0.05em;line-height:1;font-variant-numeric:tabular-nums;white-space:nowrap"><span>${E(temp != null ? nf(temp) : '–')}</span><span style="font-size:22px;color:#8e8d89">°</span></span>
      <span style="font-size:11px;color:#8e8d89;white-space:nowrap"><span>${E(tempRange)}</span> siste døgn</span>
    </div>
    <span style="width:1px;align-self:stretch;background:rgba(255,255,255,0.07)"></span>
    <div data-on-click="moreInfo" data-arg="${E(L.humId || '')}" style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">
      <span style="display:flex;align-items:center;gap:6px;font-size:12px;color:#8e8d89"><span class="ms" style="font-size:17px;color:oklch(0.8 0.12 250);font-variation-settings:'FILL' 1">water_drop</span>Fukt</span>
      <span style="font-size:46px;font-weight:300;letter-spacing:-0.05em;line-height:1;font-variant-numeric:tabular-nums;white-space:nowrap"><span>${E(hum != null ? nf(hum, 0) : '–')}</span><span style="font-size:22px;color:#8e8d89"> %</span></span>
      <span style="display:block;height:6px;border-radius:3px;background:#2a2a2d;overflow:hidden;margin-top:5px"><span style="${S(humBar)}"></span></span>
    </div>
  </section>

  <section style="display:flex;flex-direction:column;gap:12px"><div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
    ${tiles.map(t => `<button class="kdr-a97" data-key="${t.key}" data-on-click="${s.edit ? 'tileTog' : t.go}" data-arg="${E(s.edit ? t.key : t.arg)}" ${s.edit ? '' : 'data-hold="moreInfo" '}style="${S({ ...t.style, ...(s.edit ? { opacity: t.hid ? 0.38 : 1, boxShadow: t.hid ? 'inset 0 0 0 1px rgba(255,255,255,0.12)' : 'inset 0 0 0 1.5px oklch(0.78 0.13 350 / 0.55)' } : {}) })}">
        <span style="${S(t.fill)}"></span>
        <span style="${S(t.iconWrap)}"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">${t.icon}</span></span>
        <span style="position:relative;display:flex;flex-direction:column;gap:1px;min-width:0;text-align:left">
          <span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(t.label)}</span>
          <span style="${S(t.subStyle)}">${E(t.sub)}</span>
        </span>
        ${s.edit ? `<span class="ms" style="position:relative;margin-left:auto;font-size:18px;color:${t.hid ? '#f2f1ee' : 'oklch(0.82 0.1 350)'}">${t.hid ? 'visibility_off' : 'visibility'}</span>` : ''}
      </button>`).join('')}
  </div>${s.edit ? this._edPanel('fliser', 'Fliser', 'grid_view', tilesAll.map(t => ({ key: t.key, icon: t.icon, label: t.label, def: t.def, hid: t.hid })), UF.navn) : ''}</section>

  ${scShown.length || s.edit ? `<section style="display:flex;flex-direction:column;gap:12px">${scShown.length ? `<div data-hscroll="1" style="display:flex;gap:14px;overflow-x:auto;scrollbar-width:none;margin:0 calc(-1 * var(--kd-kant,10px));padding:2px var(--kd-kant,10px)">
    ${scShown.map(x => { const act = s.scene === x.key && !s.edit;
      const bubble = { width: 58, height: 58, borderRadius: 29, display: 'grid', placeItems: 'center', background: act ? PINK : '#1c1c1f', color: act ? '#2a1720' : '#c9c7c2', boxShadow: act ? '0 6px 18px rgba(240,140,190,0.3)' : 'inset 0 0 0 1px rgba(255,255,255,0.05)', transform: act ? 'scale(1.06)' : 'scale(1)', transition: 'transform .35s cubic-bezier(.34,1.8,.64,1), background .25s' };
      if (s.edit) Object.assign(bubble, { opacity: x.hid ? 0.38 : 1, boxShadow: x.hid ? 'inset 0 0 0 1px rgba(255,255,255,0.12)' : 'inset 0 0 0 1.5px oklch(0.78 0.13 350 / 0.55)' });
      return `<button data-key="${E(x.key)}" data-on-click="${s.edit ? 'sceneHide' : 'sceneGo'}" data-arg="${E(x.key)}" style="flex:none;display:flex;flex-direction:column;align-items:center;gap:6px;width:62px">
        <span style="${S(bubble)}"><span class="ms" style="${S({ fontSize: 24, fontVariationSettings: `'FILL' ${act ? 1 : 0}` })}">${E(x.icon)}</span></span>
        <span style="${S({ fontSize: 11, fontWeight: 500, color: act ? '#f2f1ee' : '#8e8d89', whiteSpace: 'nowrap', maxWidth: 66, overflow: 'hidden', textOverflow: 'ellipsis', opacity: s.edit && x.hid ? 0.5 : 1 })}">${E(x.label)}</span>
      </button>`; }).join('')}
  </div>` : ''}${s.edit ? this._edPanel('scener', 'Scener', 'auto_awesome', scenes.map(x => ({ key: x.key, icon: x.icon, label: x.label, def: x.def, hid: x.hid, extra: x.extra })), US.navn) : ''}</section>` : ''}

  ${lightRows.length ? `<section style="display:flex;flex-direction:column;gap:8px">
    <div style="display:flex;justify-content:space-between;padding:0 6px"><span style="font-size:15px;font-weight:500">Lys</span><span style="font-size:12px;color:#8e8d89">${on} på · dra for å dimme</span></div>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
      ${lightRows.map(l => H.pill(this, l.id, l.name, true)).join('')}
    </div>
  </section>` : ''}

  ${devices.length ? `<section style="display:flex;flex-direction:column;gap:8px">
    <div style="display:flex;justify-content:space-between;padding:0 6px"><span style="font-size:15px;font-weight:500">Enheter</span><span style="font-size:12px;color:#8e8d89">${watt} W</span></div>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
      ${devices.map(d => {
        const pill = { display: 'flex', alignItems: 'center', gap: 8, height: 56, padding: '0 12px 0 6px', borderRadius: 28, background: d.on ? a(C.amber, 0.12) : '#1c1c1f', transition: 'background .25s, transform .2s' };
        const iw = { width: 44, height: 44, borderRadius: 22, flex: 'none', display: 'grid', placeItems: 'center', background: d.on ? C.amber : '#2a2a2d', color: d.on ? '#141416' : '#6d6c69', transition: 'background .25s' };
        const sub = d.bad ? '–' : d.on ? (d.w ? `${d.w} W` : 'På') : 'Av';
        return `<button class="kdr-a97" data-key="${E(d.entity)}" data-on-click="devTog" data-arg="${E(d.entity)}" data-hold="moreInfo" style="${S(pill)}">
          <span style="${S(iw)}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">${d.icon}</span></span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column;text-align:left">
            <span style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(d.name)}</span>
            <span style="${S({ fontSize: 11, color: d.on ? '#e6e4df' : '#6d6c69' })}">${E(sub)}</span>
          </span>
        </button>`; }).join('')}
    </div>
  </section>` : ''}

  ${k ? `<section style="display:flex;flex-direction:column;gap:8px">
    <div style="display:flex;justify-content:space-between;padding:0 6px"><span style="font-size:15px;font-weight:500">Klima</span><span style="font-size:12px;color:#8e8d89">${E(modeLabel)}</span></div>
    <div style="display:flex;align-items:center;gap:10px;padding:6px;border-radius:34px;background:#1c1c1f">
    <span data-on-click="moreInfo" data-arg="${E(k.power || k.id)}" style="${S(climIcon)}"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">heat</span></span>
    <span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:14px;font-weight:500;white-space:nowrap">${E(k.name)}</span><span style="font-size:11px;color:#8e8d89">${E(modeLabel)}</span></span>
    <button class="kdr-a92" data-on-click="step" data-arg="-1" style="width:44px;height:44px;border-radius:22px;background:#262629;display:grid;place-items:center;flex:none"><span class="ms" style="font-size:20px">remove</span></button>
    <span style="min-width:48px;text-align:center;font-size:17px;font-weight:500;font-variant-numeric:tabular-nums">${E(setVal)}°</span>
    <button class="kdr-a92" data-on-click="step" data-arg="1" style="width:44px;height:44px;border-radius:22px;background:#262629;display:grid;place-items:center;flex:none"><span class="ms" style="font-size:20px">add</span></button>
  </div>
  </section>` : ''}

  ${media.map(m => {
    const card = { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px 10px 10px', borderRadius: 36, background: m.playing ? `linear-gradient(90deg, ${a(C.green, 0.16)}, #1c1c1f)` : '#1c1c1f', transition: 'background .4s' };
    const art = { width: 52, height: 52, borderRadius: 26, flex: 'none', display: 'grid', placeItems: 'center', background: m.playing ? C.green : '#2a2a2d', color: m.playing ? '#141416' : '#a9a7a2' };
    const fill = { position: 'absolute', left: 0, top: 0, bottom: 0, width: `${m.vol}%`, borderRadius: 3, background: '#f2f1ee' };
    return `<section data-key="${E(m.id)}" style="${S(card)}">
    <span data-on-click="moreInfo" data-arg="${E(m.id)}" style="${S(art)}"><span class="ms" style="font-size:24px;font-variation-settings:'FILL' 1">${m.tv ? 'tv' : 'speaker'}</span></span>
    <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
      <span data-on-click="moreInfo" data-arg="${E(m.id)}" style="display:flex;flex-direction:column"><span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(m.name)}</span><span style="font-size:12px;color:#8e8d89">${E(m.sub)}</span></span>
      <span data-arg="${E(m.id)}" data-on-pointerdown="mDown" data-on-pointermove="mMove" data-on-pointerup="mUp" data-on-pointercancel="mCancel" style="position:relative;display:block;height:6px;border-radius:3px;background:rgba(255,255,255,0.12);touch-action:pan-y;cursor:pointer"><span style="${S(fill)}"></span></span>
    </span>
    <button class="kdr-a92" data-on-click="mediaTog" data-arg="${E(m.id)}" style="width:48px;height:48px;border-radius:24px;flex:none;background:#f2f1ee;color:#141416;display:grid;place-items:center"><span class="ms" style="font-size:26px;font-variation-settings:'FILL' 1">${m.playing ? 'pause' : 'play_arrow'}</span></button>
  </section>`; }).join('')}

  ${sensors.length ? `<section style="display:flex;flex-direction:column;gap:8px">
    <div style="display:flex;justify-content:space-between;padding:0 6px"><span style="font-size:15px;font-weight:500">Sensorer</span><span style="font-size:12px;color:#8e8d89">${act} aktiv</span></div>
    <div style="display:flex;flex-direction:column;padding:4px 14px;border-radius:24px;background:#1c1c1f">
      ${sensors.map((z, i) => `<div data-key="${E(z.id)}" data-on-click="moreInfo" data-arg="${E(z.id)}" style="${S({ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' })}">
          <span class="ms" style="${S({ fontSize: 18, color: z.hot ? C.blue : '#6d6c69' })}">${z.icon}</span>
          <span style="flex:1;min-width:0;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(z.name)}</span>
          <span style="${S({ fontSize: 12, fontWeight: 500, padding: '4px 9px', borderRadius: 10, whiteSpace: 'nowrap', background: z.hot ? a(C.blue, 0.16) : '#262629', color: z.hot ? '#f2f1ee' : '#8e8d89' })}">${E(z.state)}</span>
        </div>`).join('')}
    </div>
  </section>` : ''}

  ${s.edit ? `<div data-key="kd-edit-bar" style="position:fixed;left:var(--kd-kant,10px);right:var(--kd-kant,10px);bottom:calc(var(--kd-dokk-h, 14px) + 6px + env(safe-area-inset-bottom));z-index:30;max-width:620px;margin:0 auto;display:flex;align-items:center;gap:10px;padding:8px 8px 8px 16px;border-radius:30px;background:rgba(38,38,41,0.92);backdrop-filter:blur(18px) saturate(160%);-webkit-backdrop-filter:blur(18px) saturate(160%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.07),0 8px 24px rgba(0,0,0,0.35)">
    <span class="ms" style="font-size:20px;color:oklch(0.82 0.1 350)">visibility</span>
    <span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:14px;font-weight:500">Tilpass rommet</span><span style="font-size:11px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Trykk for å skjule eller vise</span></span>
    <button class="kdr-a92" data-on-click="editReset" style="height:40px;padding:0 14px;border-radius:20px;background:rgba(255,255,255,0.08);font-size:13px;font-weight:500">Nullstill</button>
    <button class="kdr-a92" data-on-click="editTog" style="height:40px;padding:0 16px;border-radius:20px;background:linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20));color:#2a1720;font-size:13px;font-weight:600">Ferdig</button>
  </div>` : ''}

  <section data-on-click="moreInfo" data-arg="${E(L.tempId || '')}" style="display:flex;flex-direction:column;gap:6px;padding:14px 16px;border-radius:24px;background:#1c1c1f">
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#8e8d89"><span>Temperatur siste døgn</span><span>${E(tempRange)}</span></div>
    <svg viewBox="0 0 384 60" preserveAspectRatio="none" style="width:100%;height:56px;display:block">
      <path d="${line ? line + ' L384,60 L0,60 Z' : ''}" fill="oklch(0.82 0.12 75 / 0.12)"></path>
      <path d="${line}" fill="none" stroke="oklch(0.82 0.12 75)" stroke-width="1.5" vector-effect="non-scaling-stroke"></path>
    </svg>
  </section>
  ${s.edit ? this._sensorPicker(r, L) : ''}

</div>`;
    }
  }
  KDRomCard.head = function () {
    if (this._headVals) return this._headVals; // satt av body() (som alltid kjører først)
    const r = this._room(), L = this._live(r, null);
    return [r.ikon, r.navn, `${L.temp != null ? nf(L.temp, 1) : '–'}° · ${L.hum != null ? nf(L.hum, 0) : '–'} %`];
  };
  KDRomCard.defaults = { gardin_inverter: false };
  Object.assign(KDRomCard.prototype, H.mixin);

  KD.define('kd-rom-card', KDRomCard, 'KD Rom', 'Ett rom: temperatur, lys (dra for å dimme), scener, enheter, klima, media og sensorer – bygget automatisk fra ki_rom.');
  KD.sheet('rom', 'kd-rom-card');
})();
