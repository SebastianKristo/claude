/*
 * kd-media-card – pikselkopi av Claude Design «Media» (TV-fjernkontroll + musikk/høyttalere), med ekte data.
 *
 *   type: custom:kd-media-card            # alt annet er valgfritt («auto config»)
 *   tv: media_player.stue_tv              # Apple TV; fjernkontroll: remote.stue_tv
 *   hoyttalere: [{ entity: media_player.squeezebox_radio, navn: Sonos }, …]
 *   apper: [{ navn: Netflix, kilde: Netflix, ikon: movie, farge: 'oklch(…)' }, …]   # select_source på TV-en
 *   radio: [{ entity: button.squeezebox_radio_preset_1, navn: NRK P1 }, …]           # finnes også automatisk
 *   volum: media_player.rn602_stue       # volumknappene: entitet, 'fjernkontroll' eller 'skript' (standard: automatisk)
 *   volum_opp: script.volum_opp          # med volum: skript
 *   volum_ned: script.volum_ned
 * TV, volum, høyttalere og synlige apper kan også velges per bruker i «Tilpass oppsett» (brukerdata 'kd_media').
 * Albumbilder vises fra entity_picture. Kildene til musikkspilleren (source_list) vises som valg.
 */
(() => {
  const KD = window.KD;
  const C = { blue: 'oklch(0.8 0.12 250)', green: 'oklch(0.8 0.12 150)', red: 'oklch(0.72 0.15 25)' };
  const a = KD.a, PINK = KD.PINK;
  const OFF = ['off', 'standby', 'unavailable', 'unknown', ''];
  const APPS = [['Plex', 'play_circle', 'oklch(0.6 0.1 75)'], ['NRK TV', 'live_tv', 'oklch(0.55 0.07 220)'], ['Telia Play', 'smart_display', 'oklch(0.5 0.12 300)'], ['TV 2 Play', 'smart_display', 'oklch(0.5 0.09 260)'], ['YouTube', 'smart_display', 'oklch(0.5 0.14 25)'], ['Netflix', 'movie', 'oklch(0.45 0.14 25)']];
  const tm = (s) => { s = Math.max(0, Math.round(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? `${h}:${KD.hh(m)}` : `${m}`) + `:${KD.hh(x)}`; };
  const low = (x) => String(x || '').toLowerCase();

  class KDMediaCard extends KD.KDSheet {
    static head = ['music_note', 'Media', 'Høyttalere og TV'];
    static defaults = {
      tv: 'media_player.stue_tv',
      fjernkontroll: 'remote.stue_tv',
      tv_navn: 'Stue-TV',
      musikk: 'media_player.squeezebox_radio',
      hoyttalere: [
        { entity: 'media_player.squeezebox_radio', navn: 'Sonos' },
        { entity: 'media_player.kjokken_radio', navn: 'Kjøkken' },
        { entity: 'media_player.rn602_stue', navn: 'RN602' },
      ],
      apper: APPS.map(([navn, ikon, farge]) => ({ navn, ikon, farge })),
      radio: [
        { entity: 'button.squeezebox_radio_preset_1', navn: 'NRK P1' },
        { entity: 'button.squeezebox_radio_preset_2', navn: 'NRK JAZZ' },
        { entity: 'button.squeezebox_radio_preset_3', navn: 'NRK P3' },
        { entity: 'button.squeezebox_radio_preset_4', navn: 'P24-7 MIX' },
        { entity: 'button.squeezebox_radio_preset_5', navn: 'NRK mp3' },
        { entity: 'button.squeezebox_radio_preset_6', navn: 'Montebello' },
      ],
      vis_kilder: true,
    };
    static sheetCss = `.kd-md-key:active{transform:scale(0.92);background:#2a2a2d!important}.kd-md-vol:active{background:#2a2a2d!important}`;

    constructor() { super(); this.state = { tab: null, press: null }; }

    /* ----- data ----- */
    on(id) { return !!id && this.ok(id) && !OFF.includes(this.v(id)); }
    /** per bruker («Tilpass oppsett»): { tv, hoyttalere: [id…], skjul_apper: [navn…], volum, volum_opp, volum_ned } */
    U() { return KD.ud(this, 'kd_media') || {}; }
    uSave(patch) { const v = { ...this.U(), ...patch }; for (const k of Object.keys(v)) if (v[k] == null) delete v[k]; this.haptic('selection'); KD.udSave(this, 'kd_media', v); }
    tvId() { const u = this.U().tv; return u && this.st(u) ? u : this.config.tv; }
    cfgSpeakers() { return (Array.isArray(this.config.hoyttalere) ? this.config.hoyttalere : []).map(x => typeof x === 'string' ? { entity: x } : x); }
    speakers() {
      const cfg = this.cfgSpeakers(), u = this.U().hoyttalere;
      const list = Array.isArray(u) ? u.map(id => cfg.find(x => x.entity === id) || { entity: id }) : cfg;
      return list.filter(x => this.st(x.entity)).map(x => ({ ...x, navn: x.navn || this.fname(x.entity) }));
    }
    /** apper med indeks i config.apper (indeksen brukes av app()), uten de brukeren har skjult */
    appList() { const hid = new Set(this.U().skjul_apper || []); return (this.config.apper || []).map((x, i) => ({ ...x, i })).filter(x => !hid.has(x.navn)); }
    /** volumknappene: 'auto' | 'fjernkontroll' | 'skript' | media_player.* */
    volMode() {
      const u = this.U(), c = this.config, v = u.volum || c.volum;
      if (v === 'fjernkontroll' || v === 'skript' || v === 'auto') return v;
      if (v && /^media_player\./.test(v) && this.st(v)) return v;
      if (!v && (c.volum_opp || c.volum_ned)) return 'skript';
      return 'auto';
    }
    volScripts() { const u = this.U(), c = this.config; return { opp: u.volum_opp || c.volum_opp || null, ned: u.volum_ned || c.volum_ned || null }; }
    /** entiteten som volumlinjen viser */
    volTarget() { const m = this.volMode(); return /^media_player\./.test(m) ? m : this.tvId(); }
    hasVol(id) { return (Number(this.at(id, 'supported_features', 0)) & (4 | 8 | 1024)) !== 0 || this.at(id, 'volume_level') != null; }
    /** musikkspilleren: den første som spiller, ellers config.musikk */
    player() {
      const sp = this.speakers();
      const p = sp.find(x => this.v(x.entity) === 'playing');
      return p ? p.entity : (this.st(this.config.musikk) ? this.config.musikk : (sp[0] && sp[0].entity) || this.config.musikk);
    }
    radios() {
      const list = (Array.isArray(this.config.radio) ? this.config.radio : []).map(x => typeof x === 'string' ? { entity: x } : x);
      const known = new Set(list.map(x => x.entity));
      const pl = String(this.config.musikk || '').split('.')[1];
      if (pl) for (const id of this.find(new RegExp(`^button\\.${pl}_preset_\\d+$`))) if (!known.has(id)) list.push({ entity: id });
      return list.filter(x => this.st(x.entity)).map(x => ({ ...x, navn: x.navn || this.fname(x.entity) }));
    }
    appOf(tvA) {
      const cur = [tvA.app_name, tvA.source].map(low);
      return (this.config.apper || []).find(x => cur.includes(low(x.kilde || x.navn))) || null;
    }
    pos(id) {
      const A = (this.st(id) || {}).attributes || {};
      if (A.media_duration == null || A.media_position == null) return null;
      let p = A.media_position;
      if (this.v(id) === 'playing' && A.media_position_updated_at) p += (Date.now() - new Date(A.media_position_updated_at)) / 1000;
      return [Math.min(p, A.media_duration), A.media_duration];
    }

    /* ----- handlinger ----- */
    tab(e, k) { this.setState({ tab: k }); }
    flash(k) { this.setState({ press: k }); clearTimeout(this._pt); this._pt = setTimeout(() => this.setState({ press: null }), 160); }
    /** fjernkontrollen: config → remote.<tv> → en remote med samme navn som TV-en */
    remoteId() {
      const c = this.config, tvE = this.tvId(), tv = String(tvE || '').split('.')[1] || '';
      if (c.fjernkontroll && this.st(c.fjernkontroll) && tvE === c.tv) return c.fjernkontroll;
      if (tv && this.st('remote.' + tv)) return 'remote.' + tv;
      const nm = low(this.fname(tvE));
      return this.find(/^remote\./).find(id => nm && low(this.fname(id)) === nm) || this.find(/^remote\./).find(id => tv && id.includes(tv.split('_')[0])) || null;
    }
    send(cmd) {
      const r = this.remoteId();
      if (!r) { this.toast('Fant ingen fjernkontroll (remote.*) – sett «fjernkontroll» i kortet'); return; }
      const go = () => this.call('remote', 'send_command', { entity_id: r, command: cmd, hold_secs: 0 });
      if (this.v(r) === 'off' && cmd !== 'wakeup') { // Apple TV i dvale: vekk den først
        const now = Date.now(); if (now - (this._woke || 0) < 4000) return go();
        this._woke = now;
        return this.call('remote', 'turn_on', { entity_id: r }).then(() => new Promise(res => setTimeout(res, 600))).then(go);
      }
      return go();
    }
    /** Styreflaten: trykk på pil/midten, eller sveip (som ki-fjernkontroll-card) */
    _padInit() {
      const pad = this.$('[data-key="kd-pad"]'); if (!pad || pad._kd) return; pad._kd = true;
      const DIR = { up: 'up', down: 'down', left: 'left', right: 'right' }, ROT = 26, STEG = 46;
      let x0 = 0, y0 = 0, on = false, steg = 0, ret = null, moved = false;
      const zone = (x, y) => { const r = pad.getBoundingClientRect(), dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2); if (Math.hypot(dx, dy) < r.width * 0.2) return 'ok'; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); };
      pad.addEventListener('pointerdown', ev => { if (ev.button > 0) return; x0 = ev.clientX; y0 = ev.clientY; on = true; steg = 0; ret = null; moved = false; try { pad.setPointerCapture(ev.pointerId); } catch (e) { } });
      pad.addEventListener('pointermove', ev => {
        if (!on) return;
        const dx = ev.clientX - x0, dy = ev.clientY - y0, l = Math.hypot(dx, dy);
        if (l > 8) moved = true;
        if (l < ROT) return;
        const ny = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        if (ny !== ret) { ret = ny; steg = 0; x0 = ev.clientX; y0 = ev.clientY; }
        const vil = Math.max(1, Math.floor(Math.abs(Math.abs(dx) > Math.abs(dy) ? dx : dy) / STEG));
        while (steg < vil) { steg++; this.flash(ny); this.haptic('selection'); this.send(DIR[ny]); }
      });
      const end = ev => {
        if (!on) return; on = false;
        if (ev.type === 'pointercancel') return;
        if (!moved) { const z = zone(ev.clientX, ev.clientY); this.flash(z); this.haptic('light'); this.send(z === 'ok' ? 'select' : DIR[z]); }
        else if (ret && steg === 0) { this.flash(ret); this.send(DIR[ret]); }
      };
      pad.addEventListener('pointerup', end);
      pad.addEventListener('pointercancel', end);
    }
    pad(e, k) { this.flash(k); this.send(k === 'ok' ? 'select' : k); }
    powerTv() { const id = this.tvId(); this.call('media_player', this.on(id) ? 'turn_off' : 'turn_on', { entity_id: id }); }
    key(e, k) {
      if (k === 'power') return this.powerTv();
      if (k === 'back') { this.flash('back'); return this.send('menu'); }
      if (k === 'home') return this.send('home');
      if (k === 'mic') return this.send('siri');
      if (k === 'playpause') return this.call('media_player', 'media_play_pause', { entity_id: this.tvId() });
    }
    canSet(id) { return (Number(this.at(id, 'supported_features', 0)) & 4) === 4 && this.at(id, 'volume_level') != null; }
    volStep(id, dir) {
      if (this.canSet(id)) {
        const v = KD.clamp(Math.round(this.at(id, 'volume_level', 0) * 100) + (dir === 'up' ? 2 : -2), 0, 100);
        return this.call('media_player', 'volume_set', { entity_id: id, volume_level: v / 100 });
      }
      return this.call('media_player', dir === 'up' ? 'volume_up' : 'volume_down', { entity_id: id });
    }
    vol(e, dir) {
      const m = this.volMode(), id = this.tvId();
      if (m === 'fjernkontroll') return this.send(dir === 'up' ? 'volume_up' : 'volume_down');
      if (m === 'skript') {
        const sc = this.volScripts()[dir === 'up' ? 'opp' : 'ned'];
        if (!sc) { this.toast('Velg skript for volum ' + (dir === 'up' ? 'opp' : 'ned') + ' i «Tilpass oppsett»'); return; }
        return this.call('script', 'turn_on', { entity_id: sc });
      }
      if (m !== 'auto') return this.volStep(m, dir);
      if (this.canSet(id)) return this.volStep(id, dir);
      if (this.config.fjernkontroll && this.st(this.config.fjernkontroll) && id === this.config.tv) return this.send(dir === 'up' ? 'volume_up' : 'volume_down');
      this.call('media_player', dir === 'up' ? 'volume_up' : 'volume_down', { entity_id: id });
    }
    mute() {
      const m = this.volMode();
      if (m === 'fjernkontroll') return this.send('mute');
      const id = this.volTarget();
      this.call('media_player', 'volume_mute', { entity_id: id, is_volume_muted: !this.at(id, 'is_volume_muted', false) });
    }
    app(e, i) {
      const x = (this.config.apper || [])[+i]; if (!x) return;
      if (x.skript) return this.call('script', 'turn_on', { entity_id: x.skript });
      const list = this.at(this.tvId(), 'source_list', []) || [];
      const want = x.kilde || x.navn;
      const src = list.find(s => low(s) === low(want)) || want;
      this.call('media_player', 'select_source', { entity_id: this.tvId(), source: src });
    }
    powerMusic() { const id = this.player(); this.call('media_player', this.v(id) === 'playing' ? 'media_pause' : this.on(id) ? 'turn_off' : 'turn_on', { entity_id: id }); }
    playPause() { this.call('media_player', 'media_play_pause', { entity_id: this.player() }); }
    prev() { this.call('media_player', 'media_previous_track', { entity_id: this.player() }); }
    next() { this.call('media_player', 'media_next_track', { entity_id: this.player() }); }
    grouped(id) { const main = this.player(); const g = this.at(main, 'group_members'); return Array.isArray(g) && g.length > 0 && Array.isArray(this.at(id, 'group_members')); }
    inGroup(id) { const main = this.player(); if (id === main) return this.on(id); const g = this.at(main, 'group_members') || []; return g.includes(id); }
    toggleSpeaker(e, id) {
      const main = this.player();
      if (id !== main && this.grouped(id)) {
        if (this.inGroup(id)) return this.call('media_player', 'unjoin', { entity_id: id });
        return this.call('media_player', 'join', { entity_id: main, group_members: [id] });
      }
      this.call('media_player', this.on(id) ? 'turn_off' : 'turn_on', { entity_id: id });
    }
    setVol(e, id, el) {
      const r = el.getBoundingClientRect();
      const v = Math.round(Math.max(0, Math.min(1, (e.clientX - r.left - 46) / (r.width - 46))) * 100);
      this.call('media_player', 'volume_set', { entity_id: id, volume_level: v / 100 });
    }
    radio(e, id) { this.press(id); }
    source(e, src) { this.call('media_player', 'select_source', { entity_id: this.player(), source: src }); }
    openMore(e, id) { this.more(id); }

    /* ----- «Tilpass oppsett»: TV, volumknapper, høyttalere og apper (per bruker, 'kd_media') ----- */
    mdSet(e, arg) {
      const i = String(arg).indexOf('|'), k = String(arg).slice(0, i), v = String(arg).slice(i + 1);
      const cur = k === 'tv' ? this.tvId() : k === 'volum' ? this.volMode() : k === 'volum_opp' ? this.volScripts().opp : k === 'volum_ned' ? this.volScripts().ned : null;
      if (k === 'tv') return this.uSave({ tv: v === this.config.tv ? null : v });
      if (k === 'volum') return this.uSave({ volum: v });
      if (k === 'volum_opp' || k === 'volum_ned') return this.uSave({ [k]: cur === v ? null : v });
    }
    mdTog(e, arg) {
      const i = String(arg).indexOf('|'), k = String(arg).slice(0, i), v = String(arg).slice(i + 1);
      if (k === 'app') {
        const hid = new Set(this.U().skjul_apper || []);
        hid.has(v) ? hid.delete(v) : hid.add(v);
        return this.uSave({ skjul_apper: hid.size ? [...hid] : null });
      }
      if (k === 'spk') {
        const cur = this.speakers().map(x => x.entity);
        const nxt = cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v];
        const def = this.cfgSpeakers().map(x => x.entity).filter(x => this.st(x));
        return this.uSave({ hoyttalere: nxt.join() === def.join() ? null : nxt });
      }
    }
    mdReset() { this.haptic('selection'); KD.udSave(this, 'kd_media', {}); }
    tilpassHTML() {
      const e = KD.e, S = KD.S, P = 'oklch(0.78 0.13 350';
      const head = (t) => `<div style="padding:10px 12px 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8e8d89">${e(t)}</div>`;
      const chip = (fn, arg, label, on, icon) => `<button data-on-click="${fn}" data-arg="${e(arg)}" style="${S({ flex: 'none', height: 34, padding: icon ? '0 14px 0 10px' : '0 14px', borderRadius: 17, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap', color: on ? '#f4f3ef' : '#c9c7c2', background: on ? `${P} / 0.2)` : 'rgba(255,255,255,0.06)', boxShadow: on ? `inset 0 0 0 1.5px ${P} / 0.7)` : 'none' })}">${icon ? `<span class="ms" style="font-size:17px">${icon}</span>` : ''}<span>${e(label)}</span></button>`;
      const chips = (items) => `<div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 8px 8px">${items.join('')}</div>`;
      const tog = (on) => `<span style="position:relative;flex:none;width:44px;height:26px;border-radius:13px;background:${on ? `${P})` : '#3a3a3d'};transition:background .2s"><span style="position:absolute;top:3px;left:${on ? 21 : 3}px;width:20px;height:20px;border-radius:10px;background:#f4f3ef;transition:left .2s"></span></span>`;
      const row = (arg, label, sub, on) => `<button data-on-click="mdTog" data-arg="${e(arg)}" style="width:100%;min-height:44px;padding:0 12px;border-radius:14px;display:flex;align-items:center;gap:10px;text-align:left">
        <span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(label)}</span>${sub ? `<span style="font-size:11px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(sub)}</span>` : ''}</span>${tog(on)}</button>`;
      const mps = this.find(/^media_player\./).filter(id => this.st(id));
      const isTv = (id) => this.at(id, 'device_class') === 'tv';
      const tvId = this.tvId();
      // TV-er: device_class tv først, så resten (valgt/standard alltid med)
      const tvs = [...mps.filter(isTv), ...mps.filter(id => !isTv(id))];
      const vm = this.volMode(), sc = this.volScripts();
      const volOpts = mps.filter(id => id !== tvId && this.hasVol(id));
      const scripts = this.find(/^script\./).filter(id => this.st(id));
      const spkOn = new Set(this.speakers().map(x => x.entity));
      const cfgSp = this.cfgSpeakers();
      const spkAll = [...cfgSp.map(x => x.entity).filter(id => this.st(id)), ...mps.filter(id => !isTv(id) && id !== tvId && !cfgSp.some(x => x.entity === id))];
      const spkName = (id) => (cfgSp.find(x => x.entity === id) || {}).navn || this.fname(id);
      const hidApps = new Set(this.U().skjul_apper || []);
      const scriptPick = (k, label, cur) => `<div style="padding:6px 12px 0;font-size:12px;color:#a9a7a2">${e(label)}</div>
        <div data-hscroll="1" style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:4px 8px 8px">${scripts.length ? scripts.map(id => chip('mdSet', k + '|' + id, this.fname(id), cur === id)).join('') : '<span style="font-size:12px;color:#6d6c69;padding:8px 4px">Fant ingen skript</span>'}</div>`;
      return `<div data-key="kd-md-tilpass" style="display:flex;flex-direction:column">
        ${head('TV-fanen styrer')}
        ${chips(tvs.map(id => chip('mdSet', 'tv|' + id, this.fname(id), id === tvId, isTv(id) ? 'tv' : 'speaker')))}
        ${head('Volumknapper på fjernkontrollen')}
        ${chips([chip('mdSet', 'volum|auto', 'Automatisk', vm === 'auto', 'auto_mode'), chip('mdSet', 'volum|fjernkontroll', 'Fjernkontroll', vm === 'fjernkontroll', 'settings_remote'),
          ...volOpts.map(id => chip('mdSet', 'volum|' + id, this.fname(id), vm === id, 'speaker')), chip('mdSet', 'volum|skript', 'Skript', vm === 'skript', 'description')])}
        ${vm === 'skript' ? scriptPick('volum_opp', 'Volum opp', sc.opp) + scriptPick('volum_ned', 'Volum ned', sc.ned) : ''}
        ${spkAll.length ? head('Høyttalere i Musikk') + spkAll.map(id => row('spk|' + id, spkName(id), id, spkOn.has(id))).join('') : ''}
        ${(this.config.apper || []).length ? head('App-snarveier') + this.config.apper.map(x => row('app|' + x.navn, x.navn, x.kilde && x.kilde !== x.navn ? x.kilde : x.skript || '', !hidApps.has(x.navn))).join('') : ''}
        ${Object.keys(this.U()).length ? `<div style="display:flex;justify-content:flex-end;padding:4px 8px 6px"><button data-on-click="mdReset" style="height:34px;padding:0 12px;border-radius:17px;font-size:12px;color:#a9a7a2;background:rgba(255,255,255,0.06)">Tilbakestill media</button></div>` : ''}
      </div>`;
    }

    afterRender() {
      this._padInit();
      // oppdater avspillingstiden hvert sekund mens noe spilles
      clearTimeout(this._tick);
      if (this._connected && this._playingPos) this._tick = setTimeout(() => this._queue(), 1000);
    }

    body() {
      const s = this.state, cf = this.config, e = KD.e, S = KD.S;
      const tvId = this.tvId(), tvA = (this.st(tvId) || {}).attributes || {};
      const tvOn = this.on(tvId);
      const pl = this.player(), plA = (this.st(pl) || {}).attributes || {};
      const playing = this.v(pl) === 'playing';
      if (!s.tab) s.tab = !tvOn && playing ? 'music' : 'tv';
      const tv = s.tab === 'tv';
      const app = tvOn ? this.appOf(tvA) : null;
      const speakers = this.speakers();
      const act = speakers.filter(x => this.inGroup(x.entity));
      const tvPos = tvOn ? this.pos(tvId) : null;
      this._playingPos = (tv && tvPos && this.v(tvId) === 'playing');
      const tvState = this.v(tvId);
      let now;
      if (tv) {
        const title = !this.ok(tvId) ? 'Utilgjengelig' : !tvOn ? 'Av' : tvA.media_title || (app ? app.navn : tvA.app_name || tvA.source || 'Hjem-skjerm');
        const verb = tvState === 'playing' ? 'Spiller' : tvState === 'paused' ? 'Pause' : '';
        const sub = !tvOn ? 'Trykk på av/på for å starte'
          : verb && tvPos ? `${verb} · ${tm(tvPos[0])} av ${tm(tvPos[1])}`
            : verb ? [verb, tvA.media_title ? (app ? app.navn : tvA.app_name) : ''].filter(Boolean).join(' · ')
              : app || tvA.app_name ? (app ? app.navn : tvA.app_name) : 'Velg en app';
        now = { device: (tvId === cf.tv && cf.tv_navn) || this.fname(tvId), title, sub, icon: app ? app.ikon || 'smart_display' : 'tv', pic: tvOn ? tvA.entity_picture : null };
      } else {
        const on = playing || this.v(pl) === 'paused';
        const artist = [plA.media_artist, plA.media_album_name].filter(Boolean).join(' · ');
        now = { device: `${act.length} høyttalere`, title: on && plA.media_title ? plA.media_title : playing ? (plA.media_channel || plA.source || 'Spiller') : 'Ingenting spilles',
          sub: on ? (artist || plA.media_channel || plA.source || plA.app_name || '') : (plA.source || plA.app_name || (this.st(pl) ? this.fname(pl) : '–')), icon: 'music_note', pic: on ? plA.entity_picture : null };
        this._playingPos = false;
      }
      const artBg = tv && app ? (app.farge || '#2a2a2d') : !tv && playing ? 'oklch(0.55 0.1 60)' : '#2a2a2d';
      const art = { width: 64, height: 64, borderRadius: 18, flex: 'none', display: 'grid', placeItems: 'center', background: artBg, color: '#f2f1ee', transition: 'background .3s' };
      if (now.pic) Object.assign(art, { backgroundImage: `url('${String(now.pic).replace(/["'()\s]/g, c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))}')`, backgroundSize: 'cover', backgroundPosition: 'center' });
      const powOn = tv ? tvOn : playing;
      const powerBtn = { width: 44, height: 44, borderRadius: 22, flex: 'none', display: 'grid', placeItems: 'center', background: powOn ? a(C.green, 0.2) : '#232326', color: powOn ? C.green : C.red };
      const tabF = (k, l, icon) => ({ k, label: l, icon, style: { height: 40, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 500, background: s.tab === k ? PINK : 'transparent', color: s.tab === k ? '#2a1720' : '#a9a7a2' } });
      const tabs = [tabF('tv', 'TV', 'tv'), tabF('music', 'Musikk', 'music_note')];
      const padBtn = (k, icon, pos) => ({ k, icon, style: { position: 'absolute', ...pos, width: 64, height: 64, borderRadius: 32, display: 'grid', placeItems: 'center', color: s.press === k ? '#f2f1ee' : '#a9a7a2', background: s.press === k ? 'rgba(255,255,255,0.08)' : 'transparent', transition: 'background .15s' } });
      const pad = [padBtn('up', 'keyboard_arrow_up', { left: 93, top: 6 }), padBtn('down', 'keyboard_arrow_down', { left: 93, bottom: 6 }), padBtn('left', 'keyboard_arrow_left', { left: 6, top: 93 }), padBtn('right', 'keyboard_arrow_right', { right: 6, top: 93 })];
      const ok = { position: 'absolute', inset: 75, borderRadius: '50%', background: s.press === 'ok' ? '#333336' : '#232326', boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 8px 20px rgba(0,0,0,0.3)', fontSize: 15, fontWeight: 600, color: '#c9c7c2', transition: 'background .15s' };
      const keys = [['power_settings_new', 'power', C.red], ['undo', 'back'], ['home', 'home'], ['mic', 'mic'], ['play_pause', 'playpause']].map(([icon, k, col]) => ({ icon, k, iconStyle: { fontSize: 24, color: col || '#f2f1ee' } }));
      const vA = (this.st(this.volTarget()) || {}).attributes || {};
      const muted = !!vA.is_volume_muted;
      const volN = vA.volume_level != null ? Math.round(vA.volume_level * 100) : null;
      const muteIcon = muted ? 'volume_off' : 'volume_mute', volLabel = muted ? 'Dempet' : volN == null ? '–' : `${volN}`;
      const volBar = { width: `${muted || volN == null ? 0 : volN}%`, height: '100%', borderRadius: 2, background: '#f2f1ee', transition: 'width .2s' };
      const apps = this.appList().map(x => ({ i: x.i, name: x.navn, icon: x.ikon || 'smart_display',
        style: { height: 76, borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: x.farge || '#2a2a2d', boxShadow: app && app.navn === x.navn ? 'inset 0 0 0 2px #f2f1ee' : 'none', color: '#f2f1ee' } }));
      const playIcon = playing ? 'pause' : 'play_arrow';
      const speakerMeta = `${act.length} av ${speakers.length} i gruppen`;
      const spk = speakers.map((sp, i) => {
        const id = sp.entity, on = this.inGroup(id), grp = this.grouped(id) || id === pl;
        const st = this.v(id);
        const lv = this.at(id, 'volume_level');
        const vol = lv == null ? null : Math.round(lv * 100);
        return { id, name: sp.navn,
          sub: on ? (st === 'playing' || playing ? 'Spiller' : grp ? 'I gruppen' : 'På') : (!this.ok(id) ? 'Utilgjengelig' : grp ? 'Ikke med' : 'Av'),
          vol: vol == null ? '–' : `${vol} %`,
          row: { display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 4px', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none', opacity: on ? 1 : 0.55 },
          iconWrap: { width: 34, height: 34, borderRadius: 17, flex: 'none', display: 'grid', placeItems: 'center', background: on ? a(C.blue, 0.2) : '#1f1f22', color: on ? C.blue : '#6d6c69' },
          fill: { position: 'absolute', left: 0, top: 0, bottom: 0, width: `${vol || 0}%`, borderRadius: 3, background: on ? '#f2f1ee' : '#6d6c69' } };
      });
      // tillegg: radiokanaler og kilder (ikke i designet – samme stil som designets valgbrikker)
      const cur = low(plA.media_channel || plA.media_title || plA.source);
      const chip = (on) => ({ flex: 'none', height: 40, padding: '0 14px 0 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', background: on ? a(C.blue, 0.14) : '#1c1c1f', color: on ? '#f2f1ee' : '#c9c7c2', boxShadow: on ? `inset 0 0 0 1px ${a(C.blue, 0.45)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)' });
      const radios = this.radios().map(r => ({ ...r, style: chip(playing && !!cur && (cur.includes(low(r.navn)) || low(r.navn).includes(cur))) }));
      const sources = cf.vis_kilder === false ? [] : (plA.source_list || []).map(src => ({ src, style: chip(low(src) === low(plA.source)) }));
      const secHead = (t) => `<div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:0 4px"><span>${e(t)}</span></div>`;
      const chipRow = (items, fn) => `<div data-hscroll="1" style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 calc(-1 * var(--kd-kant,10px));padding:0 var(--kd-kant,10px)">${items.map(fn).join('')}</div>`;

      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:20px">
  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Media</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section data-on-click="openMore" data-arg="${e(tv ? tvId : pl)}" style="display:flex;align-items:center;gap:16px;padding:16px;border-radius:24px;background:#1c1c1f;cursor:pointer">
    <div style="${S(art)}"><span class="ms" style="font-size:30px;font-variation-settings:'FILL' 1;${now.pic ? 'opacity:0' : ''}"><span>${e(now.icon)}</span></span></div>
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px">
      <div style="font-size:12px;color:#8e8d89;white-space:nowrap"><span>${e(now.device)}</span></div>
      <div style="font-size:18px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(now.title)}</span></div>
      <div style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(now.sub)}</span></div>
    </div>
    <button data-on-click="${tv ? 'powerTv' : 'powerMusic'}" style="${S(powerBtn)}"><span class="ms" style="font-size:22px">power_settings_new</span></button>
  </section>

  <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:2px;padding:4px;border-radius:20px;background:#1c1c1f">
    ${tabs.map(t => `<button data-on-click="tab" data-arg="${t.k}" style="${S(t.style)}"><span class="ms" style="font-size:18px"><span>${t.icon}</span></span><span>${e(t.label)}</span></button>`).join('')}
  </div>

  ${tv ? `
    <section style="display:flex;justify-content:center">
      <div data-key="kd-pad" role="group" aria-label="Styreflate" style="position:relative;width:250px;height:250px;border-radius:50%;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05);touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;cursor:pointer">
        ${pad.map(p => `<span data-arg="${p.k}" style="${S({ ...p.style, pointerEvents: 'none' })}"><span class="ms" style="font-size:28px"><span>${p.icon}</span></span></span>`).join('')}
        <span data-arg="ok" style="${S({ ...ok, display: 'grid', placeItems: 'center', pointerEvents: 'none' })}">OK</span>
      </div>
    </section>
    <section style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">
      ${keys.map(k => `<button class="kd-md-key" data-on-click="key" data-arg="${k.k}" style="height:56px;border-radius:28px;background:#1c1c1f;display:grid;place-items:center"><span class="ms" style="${S(k.iconStyle)}"><span>${k.icon}</span></span></button>`).join('')}
    </section>
    <section style="display:flex;align-items:center;gap:8px;height:60px;padding:0 6px;border-radius:30px;background:#1c1c1f">
      <button class="kd-md-vol" data-on-click="vol" data-arg="down" style="width:48px;height:48px;border-radius:24px;display:grid;place-items:center"><span class="ms" style="font-size:24px">volume_down</span></button>
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px">
        <div style="height:4px;width:100%;border-radius:2px;background:#2e2e31;overflow:hidden"><div style="${S(volBar)}"></div></div>
        <button data-on-click="mute" style="font-size:12px;color:#a9a7a2;display:flex;align-items:center;gap:4px;font-variant-numeric:tabular-nums"><span class="ms" style="font-size:15px"><span>${muteIcon}</span></span><span>${e(volLabel)}</span></button>
      </div>
      <button class="kd-md-vol" data-on-click="vol" data-arg="up" style="width:48px;height:48px;border-radius:24px;display:grid;place-items:center"><span class="ms" style="font-size:24px">volume_up</span></button>
    </section>
    ${apps.length ? `<section style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
      ${apps.map(p => `<button data-on-click="app" data-arg="${p.i}" style="${S(p.style)}"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1"><span>${e(p.icon)}</span></span><span style="font-size:12px;font-weight:600"><span>${e(p.name)}</span></span></button>`).join('')}
    </section>` : ''}` : `
    <section style="display:flex;align-items:center;justify-content:center;gap:22px">
      <button data-on-click="prev" style="width:48px;height:48px;border-radius:24px;display:grid;place-items:center;color:#c9c7c2"><span class="ms" style="font-size:28px;font-variation-settings:'FILL' 1">skip_previous</span></button>
      <button data-on-click="playPause" style="width:68px;height:68px;border-radius:34px;background:#f2f1ee;color:#141416;display:grid;place-items:center"><span class="ms" style="font-size:36px;font-variation-settings:'FILL' 1"><span>${playIcon}</span></span></button>
      <button data-on-click="next" style="width:48px;height:48px;border-radius:24px;display:grid;place-items:center;color:#c9c7c2"><span class="ms" style="font-size:28px;font-variation-settings:'FILL' 1">skip_next</span></button>
    </section>
    ${spk.length ? `<section style="display:flex;flex-direction:column;gap:2px">
      <div style="display:flex;justify-content:space-between;padding:0 4px 8px">
        <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Høyttalere</div>
        <div style="font-size:12px;color:#6d6c69"><span>${e(speakerMeta)}</span></div>
      </div>
      ${spk.map(sp => `
        <div style="${S(sp.row)}">
          <div style="display:flex;align-items:center;gap:12px">
            <button data-on-click="toggleSpeaker" data-arg="${e(sp.id)}" style="${S(sp.iconWrap)}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">speaker</span></button>
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
              <span style="font-size:14px;font-weight:500"><span>${e(sp.name)}</span></span>
              <span style="font-size:12px;color:#8e8d89"><span>${e(sp.sub)}</span></span>
            </div>
            <span style="font-size:12px;color:#a9a7a2;font-variant-numeric:tabular-nums"><span>${e(sp.vol)}</span></span>
          </div>
          <div data-on-pointerdown="setVol" data-arg="${e(sp.id)}" style="height:24px;display:flex;align-items:center;cursor:pointer;padding-left:46px">
            <div style="position:relative;width:100%;height:5px;border-radius:3px;background:#2e2e31"><div style="${S(sp.fill)}"></div></div>
          </div>
        </div>`).join('')}
    </section>` : ''}
    ${radios.length ? `<section style="display:flex;flex-direction:column;gap:8px">
      ${secHead('Radio')}
      ${chipRow(radios, r => `<button data-on-click="radio" data-arg="${e(r.entity)}" style="${S(r.style)}"><span class="ms" style="font-size:17px">radio</span><span>${e(r.navn)}</span></button>`)}
    </section>` : ''}
    ${sources.length ? `<section style="display:flex;flex-direction:column;gap:8px">
      ${secHead('Kilde')}
      ${chipRow(sources, x => `<button data-on-click="source" data-arg="${e(x.src)}" style="${S(x.style)}"><span class="ms" style="font-size:17px">input</span><span>${e(x.src)}</span></button>`)}
    </section>` : ''}`}
</div>`;
    }
  }

  KD.define('kd-media-card', KDMediaCard, 'KD Media', 'Høyttalere og TV – pikselkopi av Claude Design');
  KD.sheet('media', 'kd-media-card');
})();
