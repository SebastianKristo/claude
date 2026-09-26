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
 *   volum_demp: script.tv_demp          # hver knapp (opp/ned/demp) kan også peke på egen entitet: script/button/scene,
 *                                        # media_player (volume_up/down/mute) eller remote (send_command)
 * TV, volum, høyttalere og synlige apper kan også velges per bruker i «Tilpass oppsett» (brukerdata 'kd_media').
 * Per bruker kan hver volumknapp overstyres: knapper: { opp|ned|demp: { type: auto|remote|entity|mp, entity, command } }.
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
  const cssUrl = (u) => `url('${String(u).replace(/["'()\s]/g, c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))}')`;
  /* volumknappene på fjernkontrollen: [nøkkel, navn, ikon, standardkommando] */
  const KB = [['opp', 'Volum opp', 'volume_up', 'volume_up'], ['ned', 'Volum ned', 'volume_down', 'volume_down'], ['demp', 'Demp', 'volume_off', 'mute']];
  const KB_CMD = { opp: 'volume_up', ned: 'volume_down', demp: 'mute' };
  const KB_T = [['auto', 'Automatisk', 'auto_mode'], ['remote', 'Fjernkontroll', 'settings_remote'], ['entity', 'Handling', 'bolt'], ['mp', 'Mediaspiller', 'speaker']];
  const ACT_DOM = ['script', 'button', 'scene', 'input_button'];
  const DOM_ICON = { script: 'description', button: 'radio_button_checked', input_button: 'radio_button_checked', scene: 'palette', media_player: 'speaker', remote: 'settings_remote' };
  const SRC_ICON = [[/airplay/, 'airplay'], [/bluetooth|bt\b/, 'bluetooth'], [/spotify|tidal|deezer|music|musikk/, 'library_music'], [/radio|tuner|fm|dab/, 'radio'], [/cd|phono|vinyl/, 'album'], [/optical|coax|hdmi|tv|arc/, 'settings_input_hdmi'], [/usb/, 'usb'], [/net|dlna|server/, 'lan']];
  const srcIcon = (s) => (SRC_ICON.find(([re]) => re.test(low(s))) || [0, 'input'])[1];
  const hue = (s) => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % 360; };
  /** radioflis: stort merke + liten tekst, f.eks. «NRK P1» → P1 / NRK */
  const badge = (name) => {
    const w = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (w.length > 1 && w[w.length - 1].length <= 4) return [w[w.length - 1], w.slice(0, -1).join(' ')];
    if (w.length > 1) return [(w[0][0] + w[1][0]).toUpperCase(), ''];
    const x = w[0] || '?';
    return [x.length <= 5 ? x : x[0].toUpperCase(), x.length <= 5 ? '' : x];
  };

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
    static sheetCss = `.kd-md-key:active{transform:scale(0.92);background:#2a2a2d!important}.kd-md-vol:active{background:#2a2a2d!important}
.kd-md-tr{transition:transform .15s,background .15s}.kd-md-tr:active{transform:scale(0.88)}
.kd-md-tile{transition:transform .18s}.kd-md-tile:active{transform:scale(0.94)}
@keyframes kdmdeq{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}
.kd-md-eq>span{display:block;width:3px;height:12px;border-radius:2px;background:#f2f1ee;transform-origin:bottom;animation:kdmdeq .9s ease-in-out infinite}
.kd-md-eq>span:nth-child(2){animation-delay:-.3s}.kd-md-eq>span:nth-child(3){animation-delay:-.6s}`;

    constructor() { super(); this.state = { tab: null, press: null, kbOpen: null, kbDom: {} }; this._kbQ = {}; this._drag = null; }

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
    volTarget() {
      const m = this.volMode(); if (/^media_player\./.test(m)) return m;
      for (const k of ['opp', 'demp', 'ned']) { const b = this.btn(k); if (b.type === 'mp' && b.entity && this.st(b.entity)) return b.entity; }
      return this.tvId();
    }
    /** handlingen for én volumknapp ('opp' | 'ned' | 'demp'): brukerens valg → config volum_<k> → { type: 'auto' } */
    btn(k) {
      const u = this.U(), x = (u.knapper || {})[k];
      if (x && KB_T.some(t => t[0] === x.type)) return x;
      const c = this.config['volum_' + k], cv = this.config.volum;
      if (!u.volum && typeof c === 'string' && /^[a-z_]+\.\w+$/.test(c) && (!cv || cv === 'skript')) {
        const d = c.split('.')[0];
        return d === 'media_player' ? { type: 'mp', entity: c, cfg: 1 } : d === 'remote' ? { type: 'remote', entity: c, command: KB_CMD[k], cfg: 1 } : { type: 'entity', entity: c, cfg: 1 };
      }
      return { type: 'auto' };
    }
    /** kjør en overstyrt volumknapp; false = bruk den automatiske oppførselen */
    runBtn(k) {
      const b = this.btn(k), nm = (KB.find(x => x[0] === k) || [])[1] || k;
      if (b.type === 'auto') return false;
      if (b.type === 'remote') { this.send(String(b.command || '').trim() || KB_CMD[k], b.entity && this.st(b.entity) ? b.entity : null); return true; }
      if (!b.entity || !this.st(b.entity)) { this.toast(`Velg ${b.type === 'mp' ? 'mediaspiller' : 'handling'} for «${nm}» i «Tilpass oppsett»`); return true; }
      if (b.type === 'entity') { this.press(b.entity); return true; }
      if (k === 'demp') this.call('media_player', 'volume_mute', { entity_id: b.entity, is_volume_muted: !this.at(b.entity, 'is_volume_muted', false) });
      else this.call('media_player', k === 'opp' ? 'volume_up' : 'volume_down', { entity_id: b.entity });
      return true;
    }
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
    send(cmd, rid) {
      const r = rid || this.remoteId();
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
      if (this.runBtn(dir === 'up' ? 'opp' : 'ned')) return;
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
      if (this.runBtn('demp')) return;
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
    /** volum 0–100 for en spiller (verdien som dras har forrang), null = ukjent */
    volOf(id) { if (this._drag && this._drag.id === id) return this._drag.v; const lv = this.at(id, 'volume_level'); return lv == null ? null : Math.round(lv * 100); }
    /** dra i en volumlinje (data-on-pointerdown på selve sporet): oppdaterer mens du drar, sender maks hvert 250 ms */
    volDrag(ev, id, el) {
      if (ev.button > 0 || !id) return;
      const r = el.getBoundingClientRect(); if (!r.width) return;
      let last = 0, sent = null, t = null;
      const val = (x) => Math.round(KD.clamp((x - r.left) / r.width, 0, 1) * 100);
      const push = (v) => { if (v === sent) return; sent = v; last = Date.now(); this.call('media_player', 'volume_set', { entity_id: id, volume_level: v / 100 }); };
      const set = (x, fin) => {
        const v = val(x); this._drag = { id, v }; this._queue();
        clearTimeout(t);
        if (fin || Date.now() - last > 250) push(v); else t = setTimeout(() => push(v), 250);
      };
      const move = (e2) => set(e2.clientX);
      const end = (e2) => {
        el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', end); el.removeEventListener('pointercancel', end);
        if (e2.type === 'pointerup') set(e2.clientX, true); else clearTimeout(t);
        clearTimeout(this._dragT); this._dragT = setTimeout(() => { this._drag = null; this._queue(); }, 1500);
      };
      clearTimeout(this._dragT);
      try { el.setPointerCapture(ev.pointerId); } catch (e) { }
      el.addEventListener('pointermove', move); el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
      this.haptic('selection');
      set(ev.clientX);
    }
    muteMusic() { const id = this.player(); this.call('media_player', 'volume_mute', { entity_id: id, is_volume_muted: !this.at(id, 'is_volume_muted', false) }); }
    shuffle() { const id = this.player(); this.call('media_player', 'shuffle_set', { entity_id: id, shuffle: !this.at(id, 'shuffle', false) }); }
    repeat() { const id = this.player(), cur = this.at(id, 'repeat', 'off'); this.call('media_player', 'repeat_set', { entity_id: id, repeat: cur === 'off' ? 'all' : cur === 'all' ? 'one' : 'off' }); }
    seek(e, arg, el) {
      const id = this.player(), p = this.pos(id); if (!p || !p[1]) return;
      const r = el.getBoundingClientRect(); if (!r.width) return;
      this.call('media_player', 'media_seek', { entity_id: id, seek_position: Math.round(KD.clamp((e.clientX - r.left) / r.width, 0, 1) * p[1]) });
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
    mdReset() { this.haptic('selection'); this._kbQ = {}; this.setState({ kbOpen: null }); KD.udSave(this, 'kd_media', {}); }
    /* volumknappene: type, kommando og entitet per knapp */
    kbSave(k, v) { const kn = { ...(this.U().knapper || {}) }; if (v) kn[k] = v; else delete kn[k]; this.uSave({ knapper: Object.keys(kn).length ? kn : null }); }
    kbType(e, arg) {
      const [k, t] = String(arg).split('|'), cur = this.btn(k);
      if (t === 'auto') { this.setState({ kbOpen: null }); return this.kbSave(k, this.config['volum_' + k] ? { type: 'auto' } : null); }
      if (t === 'remote') { this.setState({ kbOpen: null }); return this.kbSave(k, { type: 'remote', command: cur.type === 'remote' && cur.command || KB_CMD[k], ...(cur.type === 'remote' && cur.entity ? { entity: cur.entity } : {}) }); }
      const keep = cur.type === t && cur.entity ? cur.entity : null;
      this._kbQ[k] = ''; this.setState({ kbOpen: keep ? null : k });
      this.kbSave(k, { type: t, ...(keep ? { entity: keep } : {}) });
    }
    kbCmd(e, k, el) { const b = this.btn(k); this.kbSave(k, { ...b, cfg: undefined, type: 'remote', command: String(el.value || '').trim() || KB_CMD[k] }); }
    kbCmdSet(e, arg) { const [k, c] = String(arg).split('|'); const b = this.btn(k); this.kbSave(k, { ...b, cfg: undefined, type: 'remote', command: c }); }
    kbRemote(e, arg) { const i = String(arg).indexOf('|'), k = arg.slice(0, i), id = arg.slice(i + 1); const b = this.btn(k); const v = { ...b, cfg: undefined, type: 'remote' }; if (id) v.entity = id; else delete v.entity; this.kbSave(k, v); }
    kbEdit(e, k) { this._kbQ[k] = ''; this.setState({ kbOpen: this.state.kbOpen === k ? null : k }); }
    kbQ(e, k, el) { this._kbQ[k] = el.value; clearTimeout(this._kbT); this._kbT = setTimeout(() => this._queue(), 120); }
    kbDomSet(e, arg) { const [k, d] = String(arg).split('|'); this.setState({ kbDom: { ...this.state.kbDom, [k]: d } }); }
    kbPick(e, arg) { const i = String(arg).indexOf('|'), k = arg.slice(0, i), id = arg.slice(i + 1); const b = this.btn(k); this.setState({ kbOpen: null }); this.kbSave(k, { type: b.type === 'mp' ? 'mp' : 'entity', entity: id }); }
    kbTest(e, k) { if (!this.runBtn(k)) (k === 'demp' ? this.mute() : this.vol(e, k === 'opp' ? 'up' : 'down')); }
    /** tekst som beskriver hva en knapp gjør nå */
    kbDesc(k) {
      const b = this.btn(k), m = this.volMode();
      if (b.type === 'auto') return 'Automatisk · ' + (m === 'fjernkontroll' ? 'fjernkontroll' : m === 'skript' ? 'skript' : m === 'auto' ? 'følger TV-en' : this.fname(m));
      if (b.type === 'remote') return `${b.entity ? this.fname(b.entity) : 'Fjernkontroll'} · ${b.command || KB_CMD[k]}`;
      const ok = b.entity && this.st(b.entity);
      return ok ? this.fname(b.entity) + (b.cfg ? ' (kortoppsett)' : '') : b.type === 'mp' ? 'Velg mediaspiller' : 'Velg skript, knapp eller scene';
    }
    kbHTML() {
      const e = KD.e, S = KD.S, P = 'oklch(0.78 0.13 350', s = this.state;
      const chip = (fn, arg, label, on, icon, small) => `<button data-on-click="${fn}" data-arg="${e(arg)}" style="${S({ flex: 'none', height: small ? 30 : 34, padding: icon ? '0 12px 0 9px' : '0 12px', borderRadius: 17, display: 'flex', alignItems: 'center', gap: 5, fontSize: small ? 12 : 13, whiteSpace: 'nowrap', color: on ? '#f4f3ef' : '#c9c7c2', background: on ? `${P} / 0.2)` : 'rgba(255,255,255,0.06)', boxShadow: on ? `inset 0 0 0 1.5px ${P} / 0.7)` : 'none' })}">${icon ? `<span class="ms" style="font-size:16px">${icon}</span>` : ''}<span>${e(label)}</span></button>`;
      const hrow = (items) => `<div data-hscroll="1" style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;min-width:0">${items.join('')}</div>`;
      const field = 'height:36px;min-width:0;padding:0 14px;border-radius:18px;border:none;outline:none;background:#1c1c1f;color:#f2f1ee;font:inherit;font-size:13px;box-sizing:border-box';
      const remotes = this.find(/^remote\./).filter(id => this.st(id));
      return KB.map(([k, label, icon]) => {
        const b = this.btn(k), open = s.kbOpen === k || ((b.type === 'entity' || b.type === 'mp') && !b.entity);
        let det = '';
        if (b.type === 'remote') {
          det = `<div style="display:flex;flex-direction:column;gap:8px;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;min-width:0"><span style="flex:none;font-size:12px;color:#8e8d89">Kommando</span>
              <input data-key="kd-kbc-${k}" data-on-change="kbCmd" data-arg="${k}" value="${e(b.command || KB_CMD[k])}" placeholder="${KB_CMD[k]}" autocomplete="off" autocapitalize="off" spellcheck="false" style="${field};flex:1;width:100%"></div>
            ${hrow(['volume_up', 'volume_down', 'mute'].map(c => chip('kbCmdSet', k + '|' + c, c, (b.command || KB_CMD[k]) === c, null, true)))}
            ${remotes.length > 1 ? hrow([chip('kbRemote', k + '|', 'Auto (' + (this.remoteId() ? this.fname(this.remoteId()) : '–') + ')', !b.entity, 'auto_mode', true), ...remotes.map(id => chip('kbRemote', k + '|' + id, this.fname(id), b.entity === id, 'settings_remote', true))]) : ''}
          </div>`;
        } else if (b.type === 'entity' || b.type === 'mp') {
          const ok = b.entity && this.st(b.entity);
          const sel = ok ? `<button data-on-click="kbEdit" data-arg="${k}" style="width:100%;min-height:44px;padding:4px 8px 4px 10px;border-radius:14px;background:#1c1c1f;display:flex;align-items:center;gap:10px;text-align:left;min-width:0">
              <span class="ms" style="flex:none;font-size:19px;color:oklch(0.82 0.1 350)">${DOM_ICON[b.entity.split('.')[0]] || 'bolt'}</span>
              <span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(this.fname(b.entity))}</span><span style="font-size:11px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(b.entity)}</span></span>
              <span style="flex:none;font-size:12px;color:#a9a7a2;padding:0 6px">${open ? 'Lukk' : 'Endre'}</span></button>` : '';
          let pick = '';
          if (open) {
            const dom = b.type === 'mp' ? 'media_player' : (s.kbDom[k] || 'alle');
            const doms = b.type === 'mp' ? ['media_player'] : dom === 'alle' ? ACT_DOM : dom === 'button' ? ['button', 'input_button'] : [dom];
            const q = low(this._kbQ[k]);
            const ids = this.find(new RegExp(`^(${doms.join('|')})\\.`)).filter(id => this.st(id) && (!q || low(id + ' ' + this.fname(id)).includes(q)))
              .sort((x, y) => this.fname(x).localeCompare(this.fname(y), 'nb'));
            pick = `<div style="display:flex;flex-direction:column;gap:8px;min-width:0">
              ${b.type === 'entity' ? hrow([['alle', 'Alle', 'apps'], ['script', 'Skript', 'description'], ['button', 'Knapper', 'radio_button_checked'], ['scene', 'Scener', 'palette']].map(([d, l, ic]) => chip('kbDomSet', k + '|' + d, l, dom === d, ic, true))) : ''}
              <div style="display:flex;align-items:center;gap:8px;${field};padding:0 12px"><span class="ms" style="font-size:17px;color:#8e8d89">search</span>
                <input data-key="kd-kbq-${k}" data-keep="1" data-on-input="kbQ" data-arg="${k}" placeholder="Søk i ${e(doms.map(d => d + '.*').join(', '))}" autocomplete="off" style="flex:1;min-width:0;height:100%;border:0;outline:none;background:transparent;color:#f2f1ee;font:inherit;font-size:13px"></div>
              <div style="display:flex;flex-direction:column;gap:2px;max-height:216px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;min-width:0">
                ${ids.slice(0, 80).map(id => { const on = id === b.entity; return `<button data-on-click="kbPick" data-arg="${e(k + '|' + id)}" style="width:100%;min-height:40px;padding:3px 10px;border-radius:12px;display:flex;align-items:center;gap:10px;text-align:left;min-width:0;background:${on ? `${P} / 0.14)` : 'transparent'}">
                  <span class="ms" style="flex:none;font-size:18px;color:${on ? 'oklch(0.82 0.1 350)' : '#8e8d89'}">${DOM_ICON[id.split('.')[0]] || 'bolt'}</span>
                  <span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(this.fname(id))}</span><span style="font-size:11px;color:#6d6c69;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(id)}</span></span>
                  ${on ? '<span class="ms" style="flex:none;font-size:18px;color:oklch(0.82 0.1 350)">check</span>' : ''}</button>`; }).join('') || '<span style="font-size:12px;color:#6d6c69;padding:8px 10px">Ingen treff</span>'}
              </div></div>`;
          }
          det = sel + pick;
        }
        return `<div data-key="kd-kb-${k}" style="margin:2px 4px 6px;padding:10px;border-radius:20px;background:rgba(255,255,255,0.04);display:flex;flex-direction:column;gap:10px;min-width:0">
          <div style="display:flex;align-items:center;gap:10px;min-width:0">
            <span style="flex:none;width:36px;height:36px;border-radius:18px;display:grid;place-items:center;background:${b.type === 'auto' ? '#1c1c1f' : `${P} / 0.18)`};color:${b.type === 'auto' ? '#c9c7c2' : 'oklch(0.85 0.1 350)'}"><span class="ms" style="font-size:20px">${icon}</span></span>
            <span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:14px;font-weight:500">${e(label)}</span><span style="font-size:11px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(this.kbDesc(k))}</span></span>
            <button data-on-click="kbTest" data-arg="${k}" title="Test knappen" style="flex:none;height:30px;padding:0 10px;border-radius:15px;font-size:12px;color:#a9a7a2;background:rgba(255,255,255,0.06);display:flex;align-items:center;gap:4px"><span class="ms" style="font-size:15px">play_arrow</span>Test</button>
          </div>
          ${hrow(KB_T.map(([t, l, ic]) => chip('kbType', k + '|' + t, l, b.type === t, ic)))}
          ${det}
        </div>`;
      }).join('');
    }
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
        ${head('Knapper på fjernkontrollen')}
        ${this.kbHTML()}
        ${head('Volum – standard for «Automatisk»')}
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

    /* ----- Musikk-fanen ----- */
    /** dra-bar volumlinje; data-on-pointerdown på beholderen, sporet er første barn */
    sliderHTML(id, v, col, thick) {
      const e = KD.e, x = KD.clamp(v || 0, 0, 100), h = thick ? 7 : 6, t = thick ? 18 : 16;
      return `<div data-on-pointerdown="volDrag" data-arg="${e(id)}" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${x}" style="flex:1;min-width:0;height:34px;padding:0 ${t / 2}px;display:flex;align-items:center;cursor:pointer;touch-action:pan-y;user-select:none;-webkit-user-select:none">
        <div style="position:relative;width:100%;height:${h}px;border-radius:${h}px;background:rgba(255,255,255,0.14);pointer-events:none">
          <div style="position:absolute;left:0;top:0;bottom:0;width:${x}%;border-radius:${h}px;background:${col}"></div>
          <div style="position:absolute;top:50%;left:${x}%;width:${t}px;height:${t}px;margin:-${t / 2}px 0 0 -${t / 2}px;border-radius:50%;background:#f2f1ee;box-shadow:0 2px 8px rgba(0,0,0,0.45)"></div>
        </div>
      </div>`;
    }
    heroHTML(pl, plA, playing, act) {
      const e = KD.e, st = this.v(pl), active = playing || st === 'paused';
      const pic = active && plA.entity_picture ? plA.entity_picture : null;
      const feat = Number(plA.supported_features || 0);
      const title = active && plA.media_title ? plA.media_title : playing ? (plA.media_channel || plA.source || 'Spiller') : !this.st(pl) ? 'Fant ingen musikkspiller' : 'Ingenting spilles';
      const artist = active ? ([plA.media_artist, plA.media_album_name].filter(Boolean).join(' · ') || plA.media_channel || plA.source || plA.app_name || '')
        : (plA.source || plA.app_name || (this.st(pl) ? 'Velg en radiokanal eller kilde' : '–'));
      const p = active ? this.pos(pl) : null;
      this._playingPos = playing && !!p;
      const live = active && !p && !!(plA.media_channel || /radio|tuner|fm|dab/.test(low(plA.source)));
      const nm = (this.speakers().find(x => x.entity === pl) || {}).navn || this.fname(pl);
      const dev = act.length > 1 ? `${nm} + ${act.length - 1}` : nm;
      const h = hue(plA.media_title || plA.media_channel || plA.source || pl);
      const img = pic ? `background-image:${e(cssUrl(pic))};background-size:cover;background-position:center` : '';
      const glow = pic ? img : `background:radial-gradient(55% 45% at 28% 28%, oklch(0.62 0.15 ${h}) 0, transparent 72%),radial-gradient(60% 55% at 78% 72%, oklch(0.55 0.13 ${(h + 90) % 360}) 0, transparent 72%)`;
      const art = pic ? img : `background:linear-gradient(150deg, oklch(0.52 0.13 ${h}), oklch(0.3 0.08 ${(h + 60) % 360}))`;
      const plOn = this.on(pl) || playing;
      const dim = 'rgba(242,241,238,0.58)', PK = 'oklch(0.82 0.11 350)';
      const tb = (fn, icon, size, box, col, extra, lbl) => `<button class="kd-md-tr" data-on-click="${fn}" aria-label="${lbl}" style="flex:none;width:${box}px;height:${box}px;border-radius:50%;display:grid;place-items:center;color:${col};${extra || ''}"><span class="ms" style="font-size:${size}px;font-variation-settings:'FILL' 1">${icon}</span></button>`;
      const sh = (feat & 32768) || plA.shuffle != null, rp = (feat & 262144) || plA.repeat != null;
      const shOn = !!plA.shuffle, rpV = plA.repeat || 'off';
      const frac = p && p[1] ? KD.clamp(p[0] / p[1], 0, 1) * 100 : 0;
      const seekable = !!p && (feat & 2) === 2;
      const prog = live
        ? `<div style="display:flex;align-items:center;gap:10px;height:18px"><div style="flex:1;height:5px;border-radius:3px;background:linear-gradient(90deg, oklch(0.78 0.13 350 / 0.7), rgba(255,255,255,0.16))"></div><span style="flex:none;display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;letter-spacing:.08em;color:${PK}"><span style="width:6px;height:6px;border-radius:3px;background:${PK}"></span>DIREKTE</span></div>`
        : `<div ${seekable ? 'data-on-click="seek"' : ''} style="height:18px;display:flex;align-items:center;cursor:${seekable ? 'pointer' : 'default'}"><div style="position:relative;width:100%;height:5px;border-radius:3px;background:rgba(255,255,255,0.16);overflow:hidden;pointer-events:none"><div style="position:absolute;left:0;top:0;bottom:0;width:${frac}%;border-radius:3px;background:#f2f1ee;transition:width 1s linear"></div></div></div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:${dim};font-variant-numeric:tabular-nums;margin-top:-2px"><span>${p ? tm(p[0]) : '–:––'}</span><span>${p ? '-' + tm(p[1] - p[0]) : '–:––'}</span></div>`;
      const v = this.volOf(pl), muted = !!plA.is_volume_muted;
      return `<section data-lay="md-na" data-lay-navn="Spilles nå" style="position:relative;overflow:hidden;isolation:isolate;border-radius:28px;background:#1c1c1f;padding:14px 18px 12px;display:flex;flex-direction:column;gap:14px;min-width:0">
    <div aria-hidden="true" style="position:absolute;inset:-30%;z-index:-2;${glow};filter:blur(46px) saturate(1.5);opacity:${active ? 0.7 : 0.32};transform:scale(1.1);transition:opacity .6s"></div>
    <div aria-hidden="true" style="position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg, rgba(28,28,31,0.15) 0%, rgba(28,28,31,0.55) 55%, rgba(28,28,31,0.92) 100%)"></div>
    <div style="display:flex;align-items:center;gap:10px;min-width:0">
      <button data-on-click="openMore" data-arg="${e(pl)}" style="flex:1;min-width:0;display:flex;align-items:center;gap:8px;height:36px;text-align:left">
        <span class="ms" style="flex:none;font-size:18px;color:${dim}">${act.length > 1 ? 'speaker_group' : 'speaker'}</span>
        <span style="min-width:0;font-size:13px;font-weight:500;color:rgba(242,241,238,0.78);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(dev)}</span>
      </button>
      <button data-on-click="powerMusic" aria-label="Av/på" style="flex:none;width:36px;height:36px;border-radius:18px;display:grid;place-items:center;background:${plOn ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.25)'};color:${plOn ? C.green : C.red};backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)"><span class="ms" style="font-size:20px">power_settings_new</span></button>
    </div>
    <div data-on-click="openMore" data-arg="${e(pl)}" style="align-self:center;width:min(100%, 272px);aspect-ratio:1;border-radius:22px;${art};display:grid;place-items:center;color:rgba(255,255,255,0.85);box-shadow:0 24px 50px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08);transform:scale(${playing ? 1 : 0.86});transition:transform .55s cubic-bezier(.34,1.4,.5,1);cursor:pointer">
      ${pic ? '' : `<span class="ms" style="font-size:72px;font-variation-settings:'FILL' 1">${active || plOn ? 'music_note' : 'music_off'}</span>`}
    </div>
    <div style="display:flex;flex-direction:column;gap:3px;min-width:0;padding-top:2px">
      <div style="font-size:21px;font-weight:600;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(title)}</span></div>
      <div style="font-size:15px;color:${dim};white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(artist)}</span></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;min-width:0">${prog}</div>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) auto auto auto minmax(0,1fr);align-items:center;gap:4px">
      <div style="display:flex;justify-content:flex-start">${sh ? tb('shuffle', 'shuffle', 22, 42, shOn ? PK : dim, shOn ? 'background:oklch(0.78 0.13 350 / 0.16)' : '', 'Tilfeldig') : ''}</div>
      ${tb('prev', 'skip_previous', 40, 60, '#f2f1ee', '', 'Forrige')}
      ${tb('playPause', playing ? 'pause' : 'play_arrow', 42, 74, '#141416', 'background:#f2f1ee;box-shadow:0 10px 28px rgba(0,0,0,0.35);margin:0 6px', playing ? 'Pause' : 'Spill')}
      ${tb('next', 'skip_next', 40, 60, '#f2f1ee', '', 'Neste')}
      <div style="display:flex;justify-content:flex-end">${rp ? tb('repeat', rpV === 'one' ? 'repeat_one' : 'repeat', 22, 42, rpV !== 'off' ? PK : dim, rpV !== 'off' ? 'background:oklch(0.78 0.13 350 / 0.16)' : '', 'Gjenta') : ''}</div>
    </div>
    ${v != null ? `<div style="display:flex;align-items:center;gap:2px;min-width:0">
      <button data-on-click="muteMusic" aria-label="Demp" style="flex:none;width:34px;height:34px;display:grid;place-items:center;color:${muted ? PK : dim}"><span class="ms" style="font-size:20px">${muted ? 'volume_off' : 'volume_mute'}</span></button>
      ${this.sliderHTML(pl, muted ? 0 : v, 'rgba(242,241,238,0.92)', true)}
      <span class="ms" style="flex:none;width:34px;text-align:center;font-size:20px;color:${dim}">volume_up</span>
    </div>` : ''}
  </section>`;
    }
    musicHTML(pl, plA, playing, speakers, act) {
      const e = KD.e, S = KD.S, cf = this.config;
      const secHead = (t, meta) => `<div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:0 4px;min-width:0"><div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89"><span>${e(t)}</span></div>${meta ? `<div style="font-size:12px;color:#6d6c69;white-space:nowrap"><span>${e(meta)}</span></div>` : ''}</div>`;
      const hrow = (inner, gap = 8) => `<div data-hscroll="1" style="display:flex;gap:${gap}px;overflow-x:auto;scrollbar-width:none;margin:0 calc(-1 * var(--kd-kant,10px));padding:0 var(--kd-kant,10px)">${inner}</div>`;
      // høyttalere: kort med gruppe-bryter og volumlinje
      const spk = speakers.map(sp => {
        const id = sp.entity, on = this.inGroup(id), grp = this.grouped(id) || id === pl, main = id === pl;
        const st = this.v(id), vol = this.volOf(id), muted = !!this.at(id, 'is_volume_muted');
        const t = this.at(id, 'media_title');
        const sub = on ? (st === 'playing' || playing ? (id !== pl && t && st === 'playing' ? 'Spiller · ' + t : 'Spiller') : grp ? 'I gruppen' : 'På') : (!this.ok(id) ? 'Utilgjengelig' : grp ? 'Ikke med' : 'Av');
        return `<div data-key="md-sp-${e(id)}" style="padding:12px 12px ${vol != null ? 4 : 12}px 12px;border-radius:22px;background:#1c1c1f;box-shadow:${on ? `inset 0 0 0 1px ${a(C.blue, 0.22)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)'};display:flex;flex-direction:column;gap:2px;min-width:0;transition:box-shadow .2s">
        <div style="display:flex;align-items:center;gap:12px;min-width:0">
          <span style="flex:none;width:40px;height:40px;border-radius:20px;display:grid;place-items:center;background:${on ? a(C.blue, 0.18) : '#232326'};color:${on ? C.blue : '#6d6c69'};transition:background .2s,color .2s"><span class="ms" style="font-size:20px;font-variation-settings:'FILL' 1">${on && (st === 'playing' || playing) ? 'graphic_eq' : 'speaker'}</span></span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
            <div style="display:flex;align-items:center;gap:6px;min-width:0"><span style="min-width:0;font-size:15px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(sp.navn)}</span>${main && speakers.length > 1 ? '<span style="flex:none;font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:8px;background:rgba(255,255,255,0.08);color:#c9c7c2">Hoved</span>' : ''}</div>
            <span style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(sub)}</span>
          </div>
          <button data-on-click="toggleSpeaker" data-arg="${e(id)}" role="switch" aria-checked="${on}" aria-label="${e((grp && !main ? 'Gruppe: ' : 'Av/på: ') + sp.navn)}" style="flex:none;position:relative;width:50px;height:30px;border-radius:15px;background:${on ? C.blue : '#3a3a3d'};transition:background .2s"><span style="position:absolute;top:3px;left:${on ? 23 : 3}px;width:24px;height:24px;border-radius:12px;background:#f4f3ef;box-shadow:0 2px 4px rgba(0,0,0,0.3);transition:left .2s;display:grid;place-items:center"><span class="ms" style="font-size:14px;color:${on ? 'oklch(0.45 0.1 250)' : '#8e8d89'}">${grp && !main ? (on ? 'link' : 'add') : 'power_settings_new'}</span></span></button>
        </div>
        ${vol != null ? `<div style="display:flex;align-items:center;gap:4px;padding-left:44px;min-width:0;opacity:${on ? 1 : 0.5};transition:opacity .2s">
          ${this.sliderHTML(id, muted ? 0 : vol, on ? '#f2f1ee' : '#8e8d89')}
          <span style="flex:none;width:30px;text-align:right;font-size:12px;color:#a9a7a2;font-variant-numeric:tabular-nums">${muted ? '<span class="ms" style="font-size:15px">volume_off</span>' : vol}</span>
        </div>` : ''}
      </div>`;
      });
      // radiokanaler: kvadratiske fliser (logo fra entity_picture, ellers initialer på farget flate)
      const cur = low(plA.media_channel || plA.media_title || plA.source);
      const radios = this.radios().map(r => {
        const on = playing && !!cur && (cur.includes(low(r.navn)) || low(r.navn).includes(cur));
        const pic = r.bilde || this.at(r.entity, 'entity_picture');
        const [big, small] = badge(r.navn), h = hue(r.navn);
        return `<button class="kd-md-tile" data-on-click="radio" data-arg="${e(r.entity)}" aria-label="${e(r.navn)}" style="flex:none;width:100px;display:flex;flex-direction:column;gap:8px;text-align:left;min-width:0">
          <span style="position:relative;width:100px;height:100px;border-radius:24px;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;${pic ? `background:#232326 ${e(cssUrl(pic))} center/cover no-repeat` : `background:linear-gradient(150deg, oklch(0.6 0.13 ${h}), oklch(0.33 0.09 ${(h + 50) % 360}))`};color:#fff;box-shadow:${on ? 'inset 0 0 0 3px oklch(0.8 0.12 350)' : 'inset 0 0 0 1px rgba(255,255,255,0.07)'}">
            ${pic ? '' : `${small ? `<span style="max-width:84px;font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;opacity:.78;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(small)}</span>` : ''}<span style="max-width:84px;font-size:${big.length > 3 ? 22 : 28}px;font-weight:600;letter-spacing:-0.02em;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(big)}</span>`}
            <span aria-hidden="true" style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0) 45%);pointer-events:none"></span>
            ${on ? '<span class="kd-md-eq" style="position:absolute;right:8px;bottom:8px;width:26px;height:26px;border-radius:13px;background:rgba(0,0,0,0.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;gap:2px;padding-bottom:7px;box-sizing:border-box"><span></span><span></span><span></span></span>' : ''}
          </span>
          <span style="font-size:12px;font-weight:500;padding:0 2px;color:${on ? '#f2f1ee' : '#a9a7a2'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(r.navn)}</span>
        </button>`;
      });
      const chip = (on) => ({ flex: 'none', height: 40, padding: '0 16px 0 12px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', background: on ? a(C.blue, 0.16) : '#1c1c1f', color: on ? '#f2f1ee' : '#c9c7c2', boxShadow: on ? `inset 0 0 0 1px ${a(C.blue, 0.5)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)' });
      const sources = cf.vis_kilder === false ? [] : (plA.source_list || []).map(src => { const on = low(src) === low(plA.source); return `<button data-on-click="source" data-arg="${e(src)}" style="${S(chip(on))}"><span class="ms" style="font-size:18px;color:${on ? C.blue : '#8e8d89'}">${srcIcon(src)}</span><span>${e(src)}</span></button>`; });
      return `${spk.length ? `<section style="display:flex;flex-direction:column;gap:8px;min-width:0">
      ${secHead('Høyttalere', `${act.length} av ${speakers.length} i gruppen`)}
      ${spk.join('')}
    </section>` : ''}
    ${radios.length ? `<section style="display:flex;flex-direction:column;gap:10px;min-width:0">
      ${secHead('Radio')}
      ${hrow(radios.join(''), 12)}
    </section>` : ''}
    ${sources.length ? `<section style="display:flex;flex-direction:column;gap:10px;min-width:0">
      ${secHead('Kilde')}
      ${hrow(sources.join(''), 6)}
    </section>` : ''}`;
    }

    body() {
      const s = this.state, cf = this.config, e = KD.e, S = KD.S;
      const tvId = this.tvId(), tvA = (this.st(tvId) || {}).attributes || {};
      const tvOn = this.on(tvId);
      const pl = this.player(), plA = (this.st(pl) || {}).attributes || {};
      const playing = this.v(pl) === 'playing';
      if (!s.tab) s.tab = !tvOn && playing ? 'music' : 'tv';
      const tv = s.tab === 'tv';
      const speakers = this.speakers();
      const act = speakers.filter(x => this.inGroup(x.entity));
      const head = `<header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Media</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>`;
      const seg = KD.segHTML('fane', [['tv', 'TV', 'tv'], ['music', 'Musikk', 'music_note']], s.tab, 'tab', { pink: true });
      const wrap = (inner) => `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:20px">
  ${head}
  ${seg}
  ${inner}
</div>`;
      if (!tv) return wrap(this.heroHTML(pl, plA, playing, act) + this.musicHTML(pl, plA, playing, speakers, act));

      const app = tvOn ? this.appOf(tvA) : null;
      const tvPos = tvOn ? this.pos(tvId) : null;
      this._playingPos = !!(tvPos && this.v(tvId) === 'playing');
      const tvState = this.v(tvId);
      const title = !this.ok(tvId) ? 'Utilgjengelig' : !tvOn ? 'Av' : tvA.media_title || (app ? app.navn : tvA.app_name || tvA.source || 'Hjem-skjerm');
      const verb = tvState === 'playing' ? 'Spiller' : tvState === 'paused' ? 'Pause' : '';
      const sub = !tvOn ? 'Trykk på av/på for å starte'
        : verb && tvPos ? `${verb} · ${tm(tvPos[0])} av ${tm(tvPos[1])}`
          : verb ? [verb, tvA.media_title ? (app ? app.navn : tvA.app_name) : ''].filter(Boolean).join(' · ')
            : app || tvA.app_name ? (app ? app.navn : tvA.app_name) : 'Velg en app';
      const now = { device: (tvId === cf.tv && cf.tv_navn) || this.fname(tvId), title, sub, icon: app ? app.ikon || 'smart_display' : 'tv', pic: tvOn ? tvA.entity_picture : null };
      const artBg = app ? (app.farge || '#2a2a2d') : '#2a2a2d';
      const art = { width: 64, height: 64, borderRadius: 18, flex: 'none', display: 'grid', placeItems: 'center', background: artBg, color: '#f2f1ee', transition: 'background .3s' };
      if (now.pic) Object.assign(art, { backgroundImage: e(cssUrl(now.pic)), backgroundSize: 'cover', backgroundPosition: 'center' });
      const powerBtn = { width: 44, height: 44, borderRadius: 22, flex: 'none', display: 'grid', placeItems: 'center', background: tvOn ? a(C.green, 0.2) : '#232326', color: tvOn ? C.green : C.red };
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

      return wrap(`<section data-lay="md-na" data-lay-navn="Spilles nå" data-on-click="openMore" data-arg="${e(tvId)}" style="display:flex;align-items:center;gap:16px;padding:16px;border-radius:24px;background:#1c1c1f;cursor:pointer;min-width:0">
    <div style="${S(art)}"><span class="ms" style="font-size:30px;font-variation-settings:'FILL' 1;${now.pic ? 'opacity:0' : ''}"><span>${e(now.icon)}</span></span></div>
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px">
      <div style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(now.device)}</span></div>
      <div style="font-size:18px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(now.title)}</span></div>
      <div style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(now.sub)}</span></div>
    </div>
    <button data-on-click="powerTv" style="${S(powerBtn)}"><span class="ms" style="font-size:22px">power_settings_new</span></button>
  </section>
    <section style="display:flex;justify-content:center">
      <div data-key="kd-pad" role="group" aria-label="Styreflate" style="position:relative;width:250px;height:250px;border-radius:50%;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05);touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;cursor:pointer">
        ${pad.map(p => `<span data-arg="${p.k}" style="${S({ ...p.style, pointerEvents: 'none' })}"><span class="ms" style="font-size:28px"><span>${p.icon}</span></span></span>`).join('')}
        <span data-arg="ok" style="${S({ ...ok, display: 'grid', placeItems: 'center', pointerEvents: 'none' })}">OK</span>
      </div>
    </section>
    <section style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px">
      ${keys.map(k => `<button class="kd-md-key" data-on-click="key" data-arg="${k.k}" style="height:56px;border-radius:28px;background:#1c1c1f;display:grid;place-items:center"><span class="ms" style="${S(k.iconStyle)}"><span>${k.icon}</span></span></button>`).join('')}
    </section>
    <section style="display:flex;align-items:center;gap:8px;height:60px;padding:0 6px;border-radius:30px;background:#1c1c1f">
      <button class="kd-md-vol" data-on-click="vol" data-arg="down" style="width:48px;height:48px;border-radius:24px;display:grid;place-items:center"><span class="ms" style="font-size:24px">volume_down</span></button>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:6px">
        <div style="height:4px;width:100%;border-radius:2px;background:#2e2e31;overflow:hidden"><div style="${S(volBar)}"></div></div>
        <button data-on-click="mute" style="font-size:12px;color:#a9a7a2;display:flex;align-items:center;gap:4px;font-variant-numeric:tabular-nums"><span class="ms" style="font-size:15px"><span>${muteIcon}</span></span><span>${e(volLabel)}</span></button>
      </div>
      <button class="kd-md-vol" data-on-click="vol" data-arg="up" style="width:48px;height:48px;border-radius:24px;display:grid;place-items:center"><span class="ms" style="font-size:24px">volume_up</span></button>
    </section>
    ${apps.length ? `<section style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
      ${apps.map(p => `<button data-on-click="app" data-arg="${p.i}" style="${S(p.style)}"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1"><span>${e(p.icon)}</span></span><span style="font-size:12px;font-weight:600"><span>${e(p.name)}</span></span></button>`).join('')}
    </section>` : ''}`);
    }
  }

  KD.define('kd-media-card', KDMediaCard, 'KD Media', 'Høyttalere og TV – pikselkopi av Claude Design');
  KD.sheet('media', 'kd-media-card');
})();
