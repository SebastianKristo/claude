/*
 * kd-media-card – pikselkopi av Claude Design «Media v3» (TV-fjernkontroll + musikk/høyttalere), med ekte data.
 *
 *   type: custom:kd-media-card            # alt annet er valgfritt («auto config»)
 *   tv: media_player.stue_tv              # Apple TV; fjernkontroll: remote.stue_tv
 *   hoyttalere: [{ entity: media_player.squeezebox_radio, navn: Sonos }, …]
 *   apper: [{ navn: Netflix, kilde: Netflix, ikon: movie, farge: 'oklch(…)' }, …]   # select_source på TV-en
 *   radio: [{ entity: button.squeezebox_radio_preset_1, navn: NRK P1, ikon: radio }, …]  # finnes også automatisk
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
  const PINK = KD.PINK;
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
  /** ikon for en radioflis (kan overstyres med «ikon» i config.radio) */
  const stIcon = (name) => /jazz|klassisk|classic|blues/.test(low(name)) ? 'music_note' : /mix|hits|pop|musikk/.test(low(name)) ? 'queue_music' : 'radio';
  const PAD_LBL = { up: 'Opp', down: 'Ned', left: 'Venstre', right: 'Høyre', ok: 'OK' };

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
        { entity: 'button.squeezebox_radio_preset_6', navn: 'Montebello' },
        { entity: 'button.squeezebox_radio_preset_1', navn: 'NRK P1' },
        { entity: 'button.squeezebox_radio_preset_2', navn: 'NRK Jazz' },
        { entity: 'button.squeezebox_radio_preset_3', navn: 'NRK P3' },
        { entity: 'button.squeezebox_radio_preset_4', navn: 'P24-7 Mix' },
        { entity: 'button.squeezebox_radio_preset_5', navn: 'NRK mP3' },
      ],
      vis_kilder: true,
    };
    static sheetCss = `.kd-md-key:active{transform:scale(0.93);color:#f2f1ee!important}
.kd-md-p90:active{transform:scale(0.9)}.kd-md-p93:active{transform:scale(0.93);color:#f2f1ee!important}.kd-md-p94:active{transform:scale(0.94)}.kd-md-p95:active{transform:scale(0.95)}
@keyframes kdmdeq{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}
@keyframes kdmdmq{from{transform:translateX(0)}to{transform:translateX(-50%)}}`;

    constructor() { super(); this.state = { tab: null, press: null, lastKey: null, kbOpen: null, kbDom: {} }; this._kbQ = {}; this._drag = null; }

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
    /** trykk-tilbakemelding på styreflaten: lys opp pila, vis navnet og send en rosa «ping»-ring */
    flash(k, label) {
      this.setState({ press: k, lastKey: label || PAD_LBL[k] || this.state.lastKey }); clearTimeout(this._pt); this._pt = setTimeout(() => this.setState({ press: null }), 160);
      const ring = this.$('[data-key="kd-pad-ring"]');
      if (ring && ring.animate && PAD_LBL[k]) ring.animate([{ transform: 'scale(.6)', opacity: 0.8 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 400, easing: 'ease-out' });
    }
    say(label) { this.setState({ lastKey: label }); }
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
      if (k === 'back') { this.say('Tilbake'); return this.send('menu'); }
      if (k === 'home') { this.say('Hjem'); return this.send('home'); }
      if (k === 'menu') { this.say('Meny'); return this.send('top_menu'); }
      if (k === 'mic') return this.siri();
      if (k === 'playpause') { this.say('Spill/pause'); return this.call('media_player', 'media_play_pause', { entity_id: this.tvId() }); }
    }
    /** langt trykk på «Meny»: Siri */
    siri() { this.say('Siri'); this.send('siri'); }
    tvNext() { this.say('Neste'); this.call('media_player', 'media_next_track', { entity_id: this.tvId() }); }
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
      this.say(`Åpner ${x.navn}`);
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
          <div style="display:flex;flex-wrap:wrap;gap:6px;min-width:0">${KB_T.map(([t, l, ic]) => chip('kbType', k + '|' + t, l, b.type === t, ic)).join('')}</div>
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
      this._segFit();
      // oppdater avspillingstiden hvert sekund mens noe spilles (brukes av TV-undertittelen)
      clearTimeout(this._tick);
      if (this._connected && this._playingPos) this._tick = setTimeout(() => this._queue(), 1000);
    }
    /** fanevelgeren har auto-brede kolonner (som designet): legg boblen over det valgte valget */
    _segFit() {
      const el = this.$('[data-seg="fane"]'); if (!el) return;
      const th = el.querySelector('[data-seg-thumb]'), b = el.querySelectorAll('[data-seg-b]')[+el.getAttribute('data-seg-i') || 0];
      if (!th || !b || !b.offsetWidth) return;
      th.style.left = b.offsetLeft + 'px'; th.style.width = b.offsetWidth + 'px';
    }

    /* ----- felles byggeklosser (Media v3) ----- */
    /** små equalizer-streker (animeres bare når noe spilles) */
    eqHTML(n, col, anim) {
      return Array.from({ length: n }, (_, i) => `<span style="width:2px;height:10px;border-radius:1px;background:${col};transform-origin:bottom;${anim ? `animation:kdmdeq ${0.7 + (i % 3) * 0.18}s ease-in-out ${i * 0.12}s infinite` : 'transform:scaleY(.3)'}"></span>`).join('');
    }
    /** «Spilles nå»-kortet øverst: m = { id, power, anim, icon, label, title, artist, pic, ph, powerFn, nextFn } */
    heroHTML(m) {
      const e = KD.e;
      const lv = [0.5, 0.7, 0.8, 0.9, 0.75, 0.6, 0.45, 0.3, 0.8, 0.95, 0.7, 0.55, 0.4, 0.3];
      const level = lv.map((h, i) => `<span style="flex:1;height:${h * 100}%;border-radius:2px;background:#6d6c69;transform-origin:center;${m.anim ? `animation:kdmdeq ${0.8 + (i % 4) * 0.15}s ease-in-out ${i * 0.07}s infinite` : 'transform:scaleY(.25)'}"></span>`).join('');
      const marquee = `display:inline-block;font-size:22px;font-weight:500;letter-spacing:-0.01em;white-space:pre;animation:${m.anim ? 'kdmdmq 14s linear infinite' : 'none'}`;
      const img = m.pic ? `background-image:${e(cssUrl(m.pic))};background-size:cover;background-position:center;` : '';
      return `<section data-lay="md-na" data-lay-navn="Spilles nå" data-more="${e(m.id)}" style="display:flex;gap:14px;padding:18px;border-radius:28px;background:radial-gradient(90% 120% at 20% 0%, #26262a, #1c1c1f 70%);box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04);opacity:${m.power ? 1 : 0.55};transition:opacity .3s;min-width:0">
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between;gap:14px">
      <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#8e8d89;white-space:nowrap;min-width:0">
        <span class="ms" style="font-size:16px;font-variation-settings:'FILL' 1">${e(m.icon)}</span><span style="min-width:0;overflow:hidden;text-overflow:ellipsis">${e(m.label)}</span>
        <span style="display:flex;gap:2px;align-items:flex-end;height:10px;flex:none">${this.eqHTML(4, '#8e8d89', m.anim)}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;min-width:0">
        <div style="overflow:hidden;white-space:nowrap;mask-image:linear-gradient(90deg,transparent,#000 6%,#000 90%,transparent);-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 90%,transparent)">
          <span style="${marquee}"><span>${e(m.title)}</span>      <span>${e(m.title)}</span>      </span>
        </div>
        <span style="font-size:13px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(m.artist)}</span></span>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="flex:1;min-width:0;display:flex;gap:3px;align-items:center;height:22px">${level}</div>
        <button data-on-click="${m.powerFn}" title="Av/på" style="width:40px;height:40px;border-radius:20px;flex:none;display:grid;place-items:center;background:${m.power ? '#262629' : 'oklch(0.72 0.15 25 / 0.2)'};color:${m.power ? '#f2f1ee' : 'oklch(0.72 0.15 25)'}"><span class="ms" style="font-size:20px">power_settings_new</span></button>
        <button class="kd-md-p90" data-on-click="${m.nextFn}" title="Neste" style="width:40px;height:40px;border-radius:20px;background:#262629;display:grid;place-items:center;flex:none"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">skip_next</span></button>
      </div>
    </div>
    <div data-on-click="openMore" data-arg="${e(m.id)}" style="position:relative;width:112px;height:112px;flex:none;border-radius:20px;overflow:hidden;background:#262629;${img}box-shadow:inset 0 0 0 1px rgba(255,255,255,0.08);display:grid;place-items:center;cursor:pointer">
      ${m.pic ? '' : `<span class="ms" style="font-size:40px;color:#6d6c69;font-variation-settings:'FILL' 1">${e(m.ph)}</span>`}
    </div>
  </section>`;
    }
    /** volumraden nederst. Glidebryter når volumet kan settes direkte, ellers −/+-knapper (fjernkontroll, skript, overstyrte knapper) */
    volRowHTML(id, muteFn, buttons) {
      const e = KD.e, P = 'oklch(0.78 0.13 350)';
      const v = this.volOf(id), muted = !!this.at(id, 'is_volume_muted'), x = muted || v == null ? 0 : KD.clamp(v, 0, 100);
      let mid;
      if (buttons) {
        const vb = (dir, icon, t) => `<button class="kd-md-p93" data-on-click="vol" data-arg="${dir}" title="${t}" style="flex:none;width:36px;height:36px;border-radius:18px;background:#1c1c1f;display:grid;place-items:center;color:#c9c7c2"><span class="ms" style="font-size:20px">${icon}</span></button>`;
        mid = `<div style="flex:1;min-width:0;height:36px;display:flex;align-items:center;gap:10px">
      ${vb('down', 'volume_down', 'Volum ned')}
      <div style="position:relative;flex:1;min-width:0;height:6px;border-radius:3px;background:#2a2a2d;overflow:hidden"><div style="position:absolute;left:0;top:0;bottom:0;width:${x}%;border-radius:3px;background:${PINK};transition:width .2s"></div></div>
      ${vb('up', 'volume_up', 'Volum opp')}
    </div>`;
      } else {
        mid = `<div ${v != null ? `data-on-pointerdown="volDrag" data-arg="${e(id)}"` : ''} role="slider" aria-label="Volum" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${x}" style="position:relative;flex:1;height:36px;cursor:pointer;touch-action:pan-y;user-select:none;-webkit-user-select:none">
      <div style="position:absolute;left:0;right:0;top:15px;height:6px;border-radius:3px;background:#2a2a2d;pointer-events:none"></div>
      <div style="position:absolute;left:0;top:15px;height:6px;border-radius:3px;width:${x}%;background:${PINK};pointer-events:none"></div>
      <span style="position:absolute;top:6px;left:calc(${x}% - 12px);width:24px;height:24px;border-radius:12px;background:#f4f3ef;box-shadow:0 2px 8px rgba(0,0,0,0.4);pointer-events:none"></span>
    </div>`;
      }
      return `<div data-lay="md-vol" data-lay-navn="Volum" style="display:flex;align-items:center;gap:14px;padding:6px 4px">
    <button data-on-click="${muteFn}" title="Demp" style="font-size:14px;color:${muted ? P : '#c9c7c2'};width:52px;flex:none;text-align:left">Volum</button>
    ${mid}
    <span style="font-size:14px;color:${muted ? P : '#c9c7c2'};width:40px;text-align:right;font-variant-numeric:tabular-nums;flex:none">${muted ? '<span class="ms" style="font-size:18px">volume_off</span>' : v == null ? '–' : `<span>${v}</span>%`}</span>
  </div>`;
    }

    /* ----- Musikk-fanen ----- */
    /** dra-bar volumlinje for høyttalerne; data-on-pointerdown på beholderen, sporet er første barn */
    sliderHTML(id, v, col) {
      const e = KD.e, x = KD.clamp(v || 0, 0, 100), h = 6, t = 16;
      return `<div data-on-pointerdown="volDrag" data-arg="${e(id)}" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${x}" style="flex:1;min-width:0;height:34px;padding:0 ${t / 2}px;display:flex;align-items:center;cursor:pointer;touch-action:pan-y;user-select:none;-webkit-user-select:none">
        <div style="position:relative;width:100%;height:${h}px;border-radius:${h}px;background:#2a2a2d;pointer-events:none">
          <div style="position:absolute;left:0;top:0;bottom:0;width:${x}%;border-radius:${h}px;background:${col}"></div>
          <div style="position:absolute;top:50%;left:${x}%;width:${t}px;height:${t}px;margin:-${t / 2}px 0 0 -${t / 2}px;border-radius:50%;background:#f4f3ef;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>
        </div>
      </div>`;
    }
    musicHTML(pl, plA, playing, speakers, act) {
      const e = KD.e, S = KD.S, cf = this.config, PC = 'oklch(0.78 0.13 350)';
      const anim = playing;
      const hrow = (inner, gap = 8) => `<div data-hscroll="1" style="display:flex;gap:${gap}px;overflow-x:auto;scrollbar-width:none;margin:0 calc(-1 * var(--kd-kant,10px));padding:0 var(--kd-kant,10px)">${inner}</div>`;
      const secHead = (t, meta) => `<div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:0 4px;min-width:0"><div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89"><span>${e(t)}</span></div>${meta ? `<div style="font-size:12px;color:#6d6c69;white-space:nowrap"><span>${e(meta)}</span></div>` : ''}</div>`;
      // radiokanaler (forhåndsvalg)
      const cur = low(plA.media_channel || plA.media_title || plA.source);
      const stations = this.radios().map(r => {
        const act1 = !!cur && (cur.includes(low(r.navn)) || low(r.navn).includes(cur)) && this.on(pl), on = act1 && anim;
        return `<button class="kd-md-p95" data-on-click="radio" data-arg="${e(r.entity)}" aria-label="${e(r.navn)}" style="position:relative;flex:none;width:88px;height:88px;border-radius:22px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:${act1 ? PINK : '#1c1c1f'};color:${act1 ? '#2a1720' : '#f2f1ee'};transition:background .2s, transform .12s">
          <span class="ms" style="font-size:24px;font-variation-settings:'FILL' 1">${e(r.ikon || stIcon(r.navn))}</span>
          <span style="font-size:11px;font-weight:600;white-space:nowrap;max-width:80px;overflow:hidden;text-overflow:ellipsis">${e(r.navn)}</span>
          ${on ? `<span style="position:absolute;right:10px;bottom:8px;display:flex;gap:2px;align-items:flex-end;height:10px">${this.eqHTML(3, '#2a1720', true)}</span>` : ''}
        </button>`;
      });
      const feat = Number(plA.supported_features || 0);
      const sh = (feat & 32768) || plA.shuffle != null, rp = (feat & 262144) || plA.repeat != null;
      const shOn = !!plA.shuffle, rpV = plA.repeat || 'off';
      const round = (fn, icon, act, t) => `<button data-on-click="${fn}" title="${t}" style="width:44px;height:44px;border-radius:22px;display:grid;place-items:center;color:${act ? PC : '#8e8d89'};background:${act ? 'oklch(0.78 0.13 350 / 0.14)' : 'transparent'};transition:color .2s"><span class="ms" style="font-size:22px">${icon}</span></button>`;
      const hold = '<span style="width:44px;height:44px"></span>';
      const transport = `<div data-lay="md-ctl" data-lay-navn="Avspilling" style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px">
      ${rp ? round('repeat', rpV === 'one' ? 'repeat_one' : 'repeat', rpV !== 'off', 'Gjenta') : hold}
      <button class="kd-md-p90" data-on-click="prev" title="Forrige" style="width:52px;height:52px;display:grid;place-items:center"><span class="ms" style="font-size:34px;font-variation-settings:'FILL' 1">skip_previous</span></button>
      <button class="kd-md-p94" data-on-click="playPause" title="Spill/pause" style="width:76px;height:76px;border-radius:38px;background:${PINK};color:#2a1720;display:grid;place-items:center;box-shadow:0 8px 24px oklch(0.78 0.13 350 / 0.3)"><span class="ms" style="font-size:36px;font-variation-settings:'FILL' 1">${playing ? 'pause' : 'play_arrow'}</span></button>
      <button class="kd-md-p90" data-on-click="next" title="Neste" style="width:52px;height:52px;display:grid;place-items:center"><span class="ms" style="font-size:34px;font-variation-settings:'FILL' 1">skip_next</span></button>
      ${sh ? round('shuffle', 'shuffle', shOn, 'Tilfeldig') : hold}
    </div>`;
      // høyttalere: kort med gruppe-bryter og volumlinje
      const spk = speakers.map(sp => {
        const id = sp.entity, on = this.inGroup(id), grp = this.grouped(id) || id === pl, main = id === pl;
        const st = this.v(id), vol = this.volOf(id), muted = !!this.at(id, 'is_volume_muted');
        const t = this.at(id, 'media_title');
        const sub = on ? (st === 'playing' || playing ? (id !== pl && t && st === 'playing' ? 'Spiller · ' + t : 'Spiller') : grp ? 'I gruppen' : 'På') : (!this.ok(id) ? 'Utilgjengelig' : grp ? 'Ikke med' : 'Av');
        return `<div data-key="md-sp-${e(id)}" style="padding:12px 12px ${vol != null ? 4 : 12}px 12px;border-radius:22px;background:#1c1c1f;box-shadow:${on ? 'inset 0 0 0 1px oklch(0.78 0.13 350 / 0.25)' : 'inset 0 0 0 1px rgba(255,255,255,0.04)'};display:flex;flex-direction:column;gap:2px;min-width:0;transition:box-shadow .2s">
        <div style="display:flex;align-items:center;gap:12px;min-width:0">
          <span style="flex:none;width:40px;height:40px;border-radius:20px;display:grid;place-items:center;background:${on ? 'oklch(0.78 0.13 350 / 0.14)' : '#232326'};color:${on ? PC : '#6d6c69'};transition:background .2s,color .2s"><span class="ms" style="font-size:20px;font-variation-settings:'FILL' 1">${on && (st === 'playing' || playing) ? 'graphic_eq' : 'speaker'}</span></span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
            <div style="display:flex;align-items:center;gap:6px;min-width:0"><span style="min-width:0;font-size:15px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(sp.navn)}</span>${main && speakers.length > 1 ? '<span style="flex:none;font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:8px;background:rgba(255,255,255,0.08);color:#c9c7c2">Hoved</span>' : ''}</div>
            <span style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(sub)}</span>
          </div>
          <button data-on-click="toggleSpeaker" data-arg="${e(id)}" role="switch" aria-checked="${on}" aria-label="${e((grp && !main ? 'Gruppe: ' : 'Av/på: ') + sp.navn)}" style="flex:none;position:relative;width:50px;height:30px;border-radius:15px;background:${on ? PC : '#3a3a3d'};transition:background .2s"><span style="position:absolute;top:3px;left:${on ? 23 : 3}px;width:24px;height:24px;border-radius:12px;background:#f4f3ef;box-shadow:0 2px 4px rgba(0,0,0,0.3);transition:left .2s;display:grid;place-items:center"><span class="ms" style="font-size:14px;color:${on ? 'oklch(0.45 0.1 350)' : '#8e8d89'}">${grp && !main ? (on ? 'link' : 'add') : 'power_settings_new'}</span></span></button>
        </div>
        ${vol != null ? `<div style="display:flex;align-items:center;gap:4px;padding-left:44px;min-width:0;opacity:${on ? 1 : 0.5};transition:opacity .2s">
          ${this.sliderHTML(id, muted ? 0 : vol, on ? PINK : '#8e8d89')}
          <span style="flex:none;width:30px;text-align:right;font-size:12px;color:#a9a7a2;font-variant-numeric:tabular-nums">${muted ? '<span class="ms" style="font-size:15px">volume_off</span>' : vol}</span>
        </div>` : ''}
      </div>`;
      });
      const chip = (on) => ({ flex: 'none', height: 40, padding: '0 16px 0 12px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', background: on ? PINK : '#1c1c1f', color: on ? '#2a1720' : '#c9c7c2' });
      const sources = cf.vis_kilder === false ? [] : (plA.source_list || []).map(src => { const on = low(src) === low(plA.source); return `<button data-on-click="source" data-arg="${e(src)}" style="${S(chip(on))}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' ${on ? 1 : 0}">${srcIcon(src)}</span><span>${e(src)}</span></button>`; });
      return {
        top: `${stations.length ? `<div data-lay="md-radio" data-lay-navn="Radio">${hrow(stations.join(''))}</div>` : ''}
  ${transport}`,
        bottom: `${spk.length ? `<section data-lay="md-spk" data-lay-navn="Høyttalere" style="display:flex;flex-direction:column;gap:8px;min-width:0;margin-top:6px">
      ${secHead('Høyttalere', `${act.length} av ${speakers.length} i gruppen`)}
      ${spk.join('')}
    </section>` : ''}
    ${sources.length ? `<section data-lay="md-src" data-lay-navn="Kilde" style="display:flex;flex-direction:column;gap:10px;min-width:0;margin-top:6px">
      ${secHead('Kilde')}
      ${hrow(sources.join(''), 6)}
    </section>` : ''}`,
      };
    }

    /* ----- TV-fanen ----- */
    tvHTML(app) {
      const e = KD.e, s = this.state;
      const apps = this.appList().map(x => { const on = !!app && app.navn === x.navn; return `<button class="kd-md-p95" data-on-click="app" data-arg="${x.i}" style="height:64px;border-radius:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;background:${on ? PINK : '#1c1c1f'};color:${on ? '#2a1720' : '#f2f1ee'};transition:background .2s, transform .12s;min-width:0">
          <span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">${e(x.ikon || 'smart_display')}</span>
          <span style="font-size:12px;font-weight:600;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;padding:0 6px;box-sizing:border-box">${e(x.navn)}</span>
        </button>`; });
      const arrow = (k, icon, pos) => `<span style="position:absolute;${pos};width:56px;height:56px;display:grid;place-items:center;color:${s.press === k ? '#f2f1ee' : '#c9c7c2'};pointer-events:none"><span class="ms" style="font-size:30px">${icon}</span></span>`;
      const keys = [['arrow_back', 'Tilbake', 'back'], ['home', 'Hjem', 'home'], ['menu', 'Meny', 'menu'], ['play_pause', 'Spill/pause', 'playpause']];
      const rid = this.remoteId();
      const last = s.lastKey || [this.tvName(), rid ? this.fname(rid) : ''].filter(Boolean).join(' · ');
      return `${apps.length ? `<div data-lay="md-apps" data-lay-navn="Apper" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">${apps.join('')}</div>` : ''}
  <div data-lay="md-remote" data-lay-navn="Fjernkontroll" style="display:flex;align-items:center;gap:14px">
    <div data-key="kd-pad" role="group" aria-label="Styreflate" style="position:relative;width:188px;height:188px;flex:none;border-radius:94px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.06);touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;cursor:pointer">
      ${arrow('up', 'keyboard_arrow_up', 'left:66px;top:4px')}
      ${arrow('down', 'keyboard_arrow_down', 'left:66px;bottom:4px')}
      ${arrow('left', 'keyboard_arrow_left', 'top:66px;left:4px')}
      ${arrow('right', 'keyboard_arrow_right', 'top:66px;right:4px')}
      <span style="position:absolute;left:59px;top:59px;width:70px;height:70px;border-radius:35px;background:#262629;font-size:14px;font-weight:600;display:grid;place-items:center;pointer-events:none;transform:scale(${s.press === 'ok' ? 0.92 : 1});transition:transform .12s">OK</span>
      <span data-key="kd-pad-ring" style="position:absolute;inset:0;border-radius:94px;box-shadow:inset 0 0 0 2px oklch(0.78 0.13 350);pointer-events:none"></span>
    </div>
    <div style="flex:1;min-width:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
      ${keys.map(([icon, label, k]) => `<button class="kd-md-key" data-on-click="key" data-arg="${k}" ${k === 'menu' ? 'data-hold="siri"' : ''} title="${label}" style="height:56px;border-radius:20px;background:#1c1c1f;display:grid;place-items:center;color:#c9c7c2"><span class="ms" style="font-size:24px">${icon}</span></button>`).join('')}
      <div style="grid-column:1 / -1;font-size:11px;color:#6d6c69;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(last)}</span></div>
    </div>
  </div>`;
    }
    tvName() { const c = this.config, id = this.tvId(); return (id === c.tv && c.tv_navn) || this.fname(id); }
    /** volumknappene i TV-fanen: glidebryter bare når volumet kan settes direkte og ingen knapp er overstyrt */
    tvVolButtons() {
      const m = this.volMode(); if (m === 'fjernkontroll' || m === 'skript') return true;
      if (['opp', 'ned'].some(k => this.btn(k).type !== 'auto')) return true;
      const id = this.volTarget();
      if (m === 'auto' && id === this.config.tv && this.config.fjernkontroll && this.st(this.config.fjernkontroll) && !this.canSet(id)) return true;
      return !this.canSet(id);
    }

    body() {
      const s = this.state;
      const tvId = this.tvId(), tvA = (this.st(tvId) || {}).attributes || {};
      const tvOn = this.on(tvId);
      const pl = this.player(), plA = (this.st(pl) || {}).attributes || {};
      const playing = this.v(pl) === 'playing';
      if (!s.tab) s.tab = !tvOn && playing ? 'music' : 'tv';
      const music = s.tab === 'music';
      const speakers = this.speakers();
      const act = speakers.filter(x => this.inGroup(x.entity));
      const head = `<header style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:6px">
    <div style="font-size:30px;font-weight:600;letter-spacing:-0.03em">Media</div>
    <button data-on-click="closeSheet" style="width:44px;height:44px;border-radius:22px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:22px">close</span></button>
  </header>`;
      // fanevelger: felles glass-fanevelger, stylet som designets ramme med auto-brede valg
      const seg = KD.segHTML('fane', [['tv', 'TV'], ['music', 'Musikk']], s.tab, 'tab', { pink: true, bg: 'transparent', r: 22, style: 'gap:2px;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.14);align-self:center;margin:4px 0' })
        .replace(/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/, 'grid-template-columns:repeat(2,auto)')
        .replace(/box-shadow:0 4px 14px rgba\(0,0,0,0\.28\), inset 0 1px 0 rgba\(255,255,255,0\.35\)/, 'box-shadow:none')
        .replace(/border-radius:18px/g, 'border-radius:19px')
        .replace(/padding:0 6px/g, 'padding:0 18px')
        .replace(/font-weight:600/g, 'font-weight:500');

      let hero, content, vol, extra = '';
      if (music) {
        const active = playing || this.v(pl) === 'paused';
        const nm = (speakers.find(x => x.entity === pl) || {}).navn || this.fname(pl);
        const dev = act.length > 1 ? `${nm} + ${act.length - 1}` : nm;
        const chan = plA.media_channel || plA.source || plA.app_name || '';
        const title = active && plA.media_title ? plA.media_title : playing ? (plA.media_channel || plA.source || 'Spiller') : !this.st(pl) ? 'Fant ingen musikkspiller' : 'Ingenting spilles';
        const artist = active ? ([plA.media_artist, plA.media_album_name].filter(Boolean).join(' · ') || plA.media_channel || plA.source || plA.app_name || '')
          : (plA.source || plA.app_name || (this.st(pl) ? 'Velg en radiokanal eller kilde' : '–'));
        hero = this.heroHTML({ id: pl, power: this.on(pl) || playing, anim: playing, icon: act.length > 1 ? 'speaker_group' : 'speaker', label: chan ? `${dev} · ${chan}` : dev,
          title, artist, pic: active ? plA.entity_picture : null, ph: 'music_note', powerFn: 'powerMusic', nextFn: 'next' });
        const m = this.musicHTML(pl, plA, playing, speakers, act);
        content = m.top; extra = m.bottom;
        vol = this.volRowHTML(pl, 'muteMusic', false);
        this._playingPos = false;
      } else {
        const app = tvOn ? this.appOf(tvA) : null;
        const tvPos = tvOn ? this.pos(tvId) : null;
        this._playingPos = !!(tvPos && this.v(tvId) === 'playing');
        const tvState = this.v(tvId), appName = app ? app.navn : tvA.app_name || tvA.source || '';
        const title = !this.ok(tvId) ? 'Utilgjengelig' : !tvOn ? 'Av' : tvA.media_title || appName || 'Hjem-skjerm';
        const ep = tvA.media_season != null && tvA.media_episode != null ? `Sesong ${tvA.media_season} · episode ${tvA.media_episode}` : '';
        const verb = tvState === 'playing' ? 'Spiller' : tvState === 'paused' ? 'Pause' : '';
        const sub = !tvOn ? 'Trykk på av/på for å starte'
          : ep || tvA.media_artist || tvA.media_channel || (verb && tvPos ? `${verb} · ${tm(tvPos[0])} av ${tm(tvPos[1])}`
            : verb ? [verb, tvA.media_title ? appName : ''].filter(Boolean).join(' · ') : appName || 'Velg en app');
        hero = this.heroHTML({ id: tvId, power: tvOn, anim: tvOn && tvState === 'playing', icon: 'tv', label: tvOn && appName ? `${this.tvName()} · ${appName}` : this.tvName(),
          title, artist: sub, pic: tvOn ? tvA.entity_picture : null, ph: app ? app.ikon || 'smart_display' : 'tv', powerFn: 'powerTv', nextFn: 'tvNext' });
        content = this.tvHTML(app);
        vol = this.volRowHTML(this.volTarget(), 'mute', this.tvVolButtons());
      }
      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:14px">
  ${head}
  ${hero}
  ${seg}
  ${content}
  ${vol}
  ${extra}
</div>`;
    }
  }

  KD.define('kd-media-card', KDMediaCard, 'KD Media', 'Høyttalere og TV – pikselkopi av Claude Design');
  KD.sheet('media', 'kd-media-card');
})();
