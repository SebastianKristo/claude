/*
 * kd-sikkerhet-card — «Sikkerhet v2» fra Claude Design, som ark-kort.
 *
 * Ringen har én strek per sensor rundt alarmens modus. Streken lyser oransje når en dør/et vindu står
 * åpent eller en lås er ulåst, blå når en sensor ser bevegelse. Hold inne en modus i 0,9 s for å bytte;
 * krever alarmen kode, kommer et kodetastatur og koden sendes med alarm_control_panel.alarm_disarm/arm_*.
 *
 * type: custom:kd-sikkerhet-card          # virker uten mer konfig
 * entity: alarm_control_panel.alarm
 * kode_lengde: 6                          # antall sifre før koden sendes
 * batteri_grense: 20                      # lavt batteri havner under «Krever oppmerksomhet» (0 = av)
 * ansikt: sensor.ansiktsgjenkjenning_dorlas_sist_last_opp_av
 * hendelser: 5                            # rader i «Siste hendelser» (0 = skjul)
 * dager: 2                                # hvor langt tilbake loggboka leses
 * zones:                                  # standard = brukerens sensorer (se DEFAULT_ZONES). To former støttes:
 *   - { entity: binary_sensor.inngangsdor, name: Dør, rom: Inngang, type: door, battery: sensor.inngangsdor_battery }
 *   - title: Vinduer                      # ki-alarm-format (kind: opening|motion|lock, items: [...])
 *     kind: opening
 *     items: [{ entity: binary_sensor.kjokken_vindu, name: Vindu, rom: Kjøkken }]
 * type: door | window | lock | motion | presence (gjettes ut fra domene/device_class/tittel når den mangler).
 * Sensorer som ikke finnes i HA hoppes over. Batteri gjettes som sensor.<objekt>_battery når det finnes.
 */
(() => {
  const KD = window.KD;
  if (!KD || customElements.get('kd-sikkerhet-card')) return;
  const { S, e, a } = KD;
  const C = { amber: KD.C.amber, green: KD.C.green, blue: KD.C.blue, red: KD.C.red, mute: '#8e8d89' };
  // [nøkkel, navn, ikon, farge, HA-tilstand, tjeneste]
  const MODES = [
    ['av', 'Av', 'remove_moderator', '#bdbbb6', 'disarmed', 'alarm_disarm'],
    ['hjemme', 'Hjemme', 'home', C.green, 'armed_home', 'alarm_arm_home'],
    ['borte', 'Borte', 'shield_lock', C.amber, 'armed_away', 'alarm_arm_away'],
    ['natt', 'Natt', 'bedtime', C.blue, 'armed_night', 'alarm_arm_night'],
  ];
  const DEFAULT_ZONES = [
    { entity: 'binary_sensor.inngangsdor', rom: 'Inngang', type: 'door', name: 'Dør', battery: 'sensor.inngangsdor_battery' },
    { entity: 'lock.dorlas_blatann', rom: 'Inngang', type: 'lock', name: 'Dørlås', battery: 'sensor.dorlas_wifi_battery' },
    { entity: 'binary_sensor.trappegang_bevegelsessensor_occupancy', rom: 'Inngang', type: 'motion', name: 'Trapp', battery: 'sensor.trappegang_bevegelsessensor_battery' },
    { entity: 'binary_sensor.verandador', rom: 'Veranda', type: 'door', name: 'Dør', battery: 'sensor.verandador_battery' },
    { entity: 'binary_sensor.stue_g6_turret_motion', rom: 'Stue', type: 'motion', name: 'Bevegelse' },
    { entity: 'binary_sensor.everything_presence_lite_occupancy', rom: 'Stue', type: 'presence', name: 'Tilstede' },
    { entity: 'binary_sensor.kjokken_vindu', rom: 'Kjøkken', type: 'window', name: 'Vindu' },
    { entity: 'binary_sensor.bad_bevegelsesensor_motion', rom: 'Bad', type: 'motion', name: 'Bevegelse', battery: 'sensor.bad_bevegelsesensor_battery' },
    { entity: 'binary_sensor.mellomgang_g5_turret_ultra_motion', rom: 'Mellomgang', type: 'motion', name: 'Bevegelse' },
    { entity: 'binary_sensor.pult_aqara_fp2_motion', rom: 'Pult', type: 'motion', name: 'Bevegelse' },
    { entity: 'binary_sensor.cybele_soverom_vindu', rom: 'Cybele soverom', type: 'window', name: 'Vindu' },
    { entity: 'binary_sensor.rune_kontorvindu', rom: 'Rune kontor', type: 'window', name: 'Vindu' },
    { entity: 'binary_sensor.rune_soveromsvindu', rom: 'Rune soverom', type: 'window', name: 'Vindu' },
    { entity: 'binary_sensor.soveromsvindu_venstre', rom: 'Soverom venstre', type: 'window', name: 'Vindu' },
    { entity: 'binary_sensor.soveromsvindu_hoyre', rom: 'Soverom høyre', type: 'window', name: 'Vindu' },
    { entity: 'lock.boddor', rom: 'Bod', type: 'lock', name: 'Boddør' },
  ];
  const LOCK_ON = ['unlocked', 'open', 'opening', 'unlocking', 'jammed'];
  const WHO = { door: 'Dørsensor', window: 'Vindussensor', lock: 'Dørlås', motion: 'Sensor', presence: 'Sensor' };
  const WD = ['søn.', 'man.', 'tir.', 'ons.', 'tor.', 'fre.', 'lør.'];
  const t = x => `<span>${e(x)}</span>`;
  const today = d => new Date(d).toDateString() === new Date().toDateString();
  const when = d => { d = new Date(d); return isNaN(d) ? '' : today(d) ? KD.hm(d) : `${WD[d.getDay()]} ${KD.hm(d)}`; };

  class KDSikkerhetCard extends KD.KDSheet {
    static head = function () {
      const s = this.v(this.config.entity);
      return ['shield', 'Sikkerhet', s && s !== 'disarmed' && !KD.BAD.has(s) ? 'Alarm armert' : 'Alarm av'];
    };
    static defaults = {
      entity: 'alarm_control_panel.alarm', kode_lengde: 6, batteri_grense: 20,
      ansikt: 'sensor.ansiktsgjenkjenning_dorlas_sist_last_opp_av', hendelser: 5, dager: 2, zones: DEFAULT_ZONES,
    };
    static sheetCss = `.kd-sik-key:active{background:#2c2c30!important}.kd-sik-chip:active{filter:brightness(1.2)}.kd-sik-fix:active{transform:scale(.95)}`;
    static getStubConfig() { return {}; }
    getCardSize() { return 16; }

    /* ---------- sensorlista ---------- */
    typeOf(z, it) {
      if (it.type) return it.type;
      const id = String(it.entity || ''), dom = id.split('.')[0];
      if (dom === 'lock' || z.kind === 'lock') return 'lock';
      const dc = this.at(id, 'device_class', '');
      if (dc === 'window') return 'window';
      if (['door', 'garage_door', 'opening'].includes(dc)) return 'door';
      if (['occupancy', 'presence'].includes(dc) && /presence|tilstede/i.test(`${id} ${it.name || ''}`)) return 'presence';
      if (['motion', 'occupancy', 'presence', 'moving'].includes(dc) || z.kind === 'motion') return 'motion';
      return /vindu|window/i.test(`${z.title || ''} ${z.icon || ''} ${id}`) ? 'window' : 'door';
    }
    sensorList() {
      const flat = [];
      for (const z of this.config.zones || []) {
        if (!z) continue;
        if (Array.isArray(z.items)) for (const it of z.items) { if (it && it.entity) flat.push([z, it]); }
        else if (z.entity) flat.push([{}, z]);
      }
      const out = [];
      flat.forEach(([z, it], i) => {
        const st = this.st(it.entity);
        if (!st) return; // finnes ikke i HA → skjul
        const type = this.typeOf(z, it);
        const avail = !KD.BAD.has(st.state);
        const on = avail && (type === 'lock' ? LOCK_ON.includes(st.state) : st.state === 'on' || st.state === 'open');
        let batId = it.battery || it.batteri;
        if (!batId) { const guess = 'sensor.' + it.entity.split('.')[1] + '_battery'; if (this.st(guess)) batId = guess; }
        const bat = batId ? this.n(batId) : null;
        out.push({ id: it.entity, key: 's' + i, room: it.rom || it.room || it.name || 'Annet', type, name: it.name || it.navn || this.fname(it.entity), on, avail, bat: bat == null ? null : Math.round(bat), batId });
      });
      return out;
    }
    isAlert(x) { return (x.type === 'door' || x.type === 'window' || x.type === 'lock') && x.on; }

    /* ---------- alarm ---------- */
    alarmAttrs() { return (this.st(this.config.entity) || {}).attributes || {}; }
    curMode() {
      const s = this.v(this.config.entity);
      return MODES.find(m => m[4] === s) || (['armed_vacation', 'armed_custom_bypass'].includes(s) ? MODES[2] : MODES[0]);
    }
    needsCode(k) {
      const at = this.alarmAttrs();
      if (!at.code_format) return false;
      return k === 'av' ? true : at.code_arm_required !== false;
    }
    startHold(ev, k) {
      if (this.state.code) return;
      const cur = this.curMode();
      if (k === cur[0] && !['arming', 'pending', 'triggered'].includes(this.v(this.config.entity))) return;
      cancelAnimationFrame(this._holdRaf);
      this.haptic('light');
      const t0 = performance.now();
      const step = () => {
        const p = Math.min(1, (performance.now() - t0) / 900);
        this.setState({ hold: k, prog: p });
        if (p < 1) this._holdRaf = requestAnimationFrame(step);
        else { this.setState({ hold: null, prog: 0 }); this.choose(k); }
      };
      this._holdRaf = requestAnimationFrame(step);
    }
    cancelHold() { cancelAnimationFrame(this._holdRaf); if (this.state.hold) this.setState({ hold: null, prog: 0 }); }
    choose(k) {
      this.haptic('heavy');
      if (this.needsCode(k)) { this.setState({ code: { mode: k, val: '', err: false } }); return; }
      this.send(k);
    }
    send(k, code) {
      const m = MODES.find(x => x[0] === k);
      const data = { entity_id: this.config.entity };
      if (code) data.code = code;
      if (!this._hass) return;
      this._hass.callService('alarm_control_panel', m[5], data)
        .then(() => { if (this.state.code) this.setState({ code: null }); })
        .catch(err => {
          console.warn('kd-sikkerhet', m[5], err);
          if (this.state.code) { this.haptic('heavy'); this.setState({ code: { ...this.state.code, val: '', err: true } }); }
          else this.toast((err && err.message) || String(err));
        });
    }
    codeLen() { return Math.max(1, Number(this.config.kode_lengde) || 6); }
    key(ev, k) {
      const c = this.state.code; if (!c) return;
      this.haptic('light');
      if (k === 'lukk') { this.setState({ code: null }); return; }
      let val = c.err ? '' : c.val;
      if (k === 'slett') val = val.slice(0, -1);
      else if (val.length < this.codeLen()) val += k;
      this.setState({ code: { ...c, val, err: false } });
      if (val.length === this.codeLen()) this.send(c.mode, val);
    }

    /* ---------- handlinger ---------- */
    fix(ev, id) { if (id.startsWith('lock.')) this.call('lock', 'lock', { entity_id: id }); else this.more(id); }
    info(ev, id) { this.more(id); }

    /* ---------- loggboka ---------- */
    userName(uid) {
      if (!uid) return null;
      const p = Object.values(this._hass.states).find(s => s.entity_id.startsWith('person.') && s.attributes.user_id === uid);
      if (p) return String(p.attributes.friendly_name || '').split(' ')[0];
      if (this._hass.user && this._hass.user.id === uid) return String(this._hass.user.name || 'Deg').split(' ')[0];
      return 'Bruker';
    }
    logRows(list) {
      const cfg = this.config, max = Number(cfg.hendelser) || 0;
      if (!max) return [];
      const alarm = this.st(cfg.entity), sig = [alarm && alarm.last_changed];
      for (const x of list) if (x.type !== 'motion' && x.type !== 'presence') { const s = this.st(x.id); sig.push(s && s.last_changed); }
      const ids = [cfg.entity, ...list.map(x => x.id), cfg.ansikt].filter(Boolean);
      const key = 'kd-sik-log|' + ids.join(',') + '|' + sig.join(',') + '|' + Math.floor(Date.now() / 60e3);
      const start = new Date(Date.now() - (Number(cfg.dager) || 2) * 864e5).toISOString();
      const raw = this.cached(key, 60e3, () => this.ws({ type: 'logbook/get_events', start_time: start, entity_ids: ids }), null);
      if (raw) this._lastLog = raw;
      const evs = (Array.isArray(this._lastLog) ? this._lastLog : []).map(x => ({ ...x, t: typeof x.when === 'number' ? x.when * 1000 : new Date(x.when).getTime() }))
        .filter(x => !isNaN(x.t)).sort((p, q) => q.t - p.t);
      const faces = evs.filter(x => x.entity_id === cfg.ansikt && x.state && !KD.BAD.has(x.state));
      const out = [];
      for (const ev of evs) {
        if (out.length >= max) break;
        let text, who, kind;
        const user = this.userName(ev.context_user_id);
        if (ev.entity_id === cfg.entity) {
          if (['arming', 'pending'].includes(ev.state) || KD.BAD.has(ev.state)) continue;
          const m = MODES.find(x => x[4] === ev.state);
          text = ev.state === 'triggered' ? 'Alarmen ble utløst' : ev.state === 'disarmed' ? 'Alarm slått av' : m ? `Alarm satt til ${m[1]}` : `Alarm: ${ev.state}`;
          who = user ? `${user} · app` : ev.context_entity_id ? 'Automatisk' : 'Alarmsystemet';
          kind = ev.state === 'triggered' ? 'alert' : 'mode';
        } else {
          const s = list.find(x => x.id === ev.entity_id);
          if (!s || KD.BAD.has(ev.state)) continue;
          const on = s.type === 'lock' ? LOCK_ON.includes(ev.state) : ev.state === 'on' || ev.state === 'open';
          if (!on && s.type !== 'lock') continue; // «lukket» og «ingen bevegelse» er støy
          if (s.type === 'lock') text = `${s.room} ${on ? 'låst opp' : 'låst'}`;
          else if (s.type === 'motion' || s.type === 'presence') text = `Bevegelse i ${s.room.toLowerCase()}`;
          else text = `${s.room} åpnet`;
          who = user ? `${user} · app` : ev.context_entity_id ? 'Automatisk' : WHO[s.type];
          if (s.type === 'lock' && on) { const f = faces.find(x => ev.t - x.t >= -30e3 && ev.t - x.t <= 120e3); if (f) who = `${f.state} · ansikt`; }
          kind = s.type === 'lock' ? (on ? 'alert' : 'ok') : s.type === 'motion' || s.type === 'presence' ? 'motion' : 'alert';
        }
        if (out.length && out[out.length - 1][0] === text) continue; // slå sammen like hendelser på rad
        out.push([text, who, when(ev.t), kind]);
      }
      return out;
    }

    /* ---------- tastatur (finnes ikke i skissen – tegnet i samme formspråk) ---------- */
    keypadHTML() {
      const c = this.state.code, m = MODES.find(x => x[0] === c.mode), len = this.codeLen();
      const dots = Array.from({ length: len }, (_, i) => {
        const f = i < c.val.length, col = c.err ? C.red : '#f2f1ee';
        return `<span style="${S({ width: 10, height: 10, borderRadius: 5, background: f ? col : 'transparent', boxShadow: `inset 0 0 0 1.5px ${f ? col : c.err ? a(C.red, 0.6) : 'rgba(255,255,255,0.25)'}`, transition: 'background .15s' })}"></span>`;
      }).join('');
      const kst = { height: 56, borderRadius: 17, background: '#232326', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 500, fontVariantNumeric: 'tabular-nums', touchAction: 'manipulation' };
      const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(k => `<button class="kd-sik-key" data-on-click="key" data-arg="${k}" style="${S(kst)}">${k}</button>`).join('');
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:18px 5px 5px;border-radius:22px;background:#1c1c1f">
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center">
          <div style="font-size:15px;font-weight:500;color:${c.err ? C.red : '#f2f1ee'}">${c.err ? 'Feil kode' : `Tast kode for ${e(m[1].toLowerCase())}`}</div>
          <div style="font-size:12px;color:#8e8d89">${c.err ? 'Prøv på nytt' : 'Sendes når alle sifrene er tastet'}</div>
        </div>
        <div style="display:flex;gap:12px">${dots}</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:100%">${keys}
          <button class="kd-sik-key" data-on-click="key" data-arg="lukk" title="Avbryt" style="${S({ ...kst, background: 'transparent', color: '#a9a7a2' })}"><span class="ms" style="font-size:22px">close</span></button>
          <button class="kd-sik-key" data-on-click="key" data-arg="0" style="${S(kst)}">0</button>
          <button class="kd-sik-key" data-on-click="key" data-arg="slett" title="Slett" style="${S({ ...kst, background: 'transparent', color: '#a9a7a2' })}"><span class="ms" style="font-size:22px">backspace</span></button>
        </div>
      </div>`;
    }

    /* ---------- innhold ---------- */
    body() {
      const s = this.state, cfg = this.config;
      const alarm = this.st(cfg.entity), ast = alarm ? alarm.state : '';
      const cur = this.curMode();
      const armed = cur[0] !== 'av';
      const trig = ast === 'triggered', trans = ast === 'arming' || ast === 'pending';
      const sensors = this.sensorList();
      const alerts = sensors.filter(x => this.isAlert(x));
      const motion = sensors.filter(x => (x.type === 'motion' || x.type === 'presence') && x.on);
      const n = sensors.length;
      const icon = x => ({ door: x.on ? 'door_open' : 'door_front', window: x.on ? 'sensor_window' : 'window', lock: x.on ? 'lock_open' : 'lock', motion: x.on ? 'directions_run' : 'directions_walk', presence: 'person' })[x.type];
      const label = x => ({ door: x.on ? 'Åpen' : x.name, window: x.on ? 'Åpent' : x.name, lock: x.on ? `${x.name} ulåst` : x.name, motion: x.on ? 'Bevegelse nå' : x.name, presence: x.on ? 'Noen her' : x.name })[x.type];
      const colorOf = x => this.isAlert(x) ? C.amber : x.on ? C.blue : null;
      const roomsOrder = [...new Set(sensors.map(x => x.room))];
      const plural = (k, one, many) => `${k} ${k === 1 ? one : many}`;
      const words = { door: ['dør', 'dører'], window: ['vindu', 'vinduer'], lock: ['lås', 'låser'] };
      const headline = trig ? 'Alarmen er utløst!' : alerts.length
        ? `${alerts.map(x => x.type).filter((v, i, arr) => arr.indexOf(v) === i).map(t => { const k = alerts.filter(x => x.type === t).length; return plural(k, ...words[t]); }).join(' og ')} ${alerts.some(x => x.type === 'lock') && alerts.every(x => x.type === 'lock') ? 'er ulåst' : 'er åpen'}`
        : 'Alt er lukket og låst';
      const since = alarm && alarm.last_changed ? when(alarm.last_changed) : '–';
      const coreCol = trig ? C.red : cur[3];
      const lowBat = Number(cfg.batteri_grense) > 0 ? sensors.filter(x => x.bat != null && x.bat <= Number(cfg.batteri_grense)) : [];

      const ring = sensors.map((x, i) => {
        const col = colorOf(x);
        const deg = (360 / n) * i;
        return { title: `${x.room} · ${x.name}`, style: { position: 'absolute', left: 'calc(50% - 4px)', top: 'calc(50% - 16px)', width: 8, height: 32, borderRadius: 4, transform: `rotate(${deg}deg) translateY(-110px)`, background: col || (armed ? a(cur[3], 0.55) : '#38383b'), boxShadow: col ? `0 0 14px ${a(col, 0.7)}` : 'none', transition: 'background .4s, box-shadow .4s' } };
      });
      const core = { position: 'absolute', inset: 44, borderRadius: '50%', background: armed || trig ? `radial-gradient(circle at 50% 35%, ${a(coreCol, 0.16)}, #1c1c1f 70%)` : '#1c1c1f', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'background .4s', cursor: 'pointer' };
      const coreIcon = { fontSize: 30, color: coreCol, fontVariationSettings: "'FILL' 1" };
      const modeIcon = trig ? 'notifications_active' : trans ? 'hourglass_top' : cur[2];
      const modeLabel = trig ? 'Utløst' : ast === 'arming' ? 'Aktiverer' : ast === 'pending' ? 'Venter' : alarm && KD.BAD.has(ast) ? 'Utilgjengelig' : cur[1];
      const modeSince = armed ? `Aktivert ${since}` : `Avslått ${since}`;
      const subline = `${motion.length ? plural(motion.length, 'sensor', 'sensorer') + ' registrerer bevegelse' : 'Ingen bevegelse'} · ${n - alerts.length - motion.length} i ro`;
      const holdHint = s.hold ? `Hold for å sette ${MODES.find(m => m[0] === s.hold)[1].toLowerCase()}…` : 'Hold inne for å bytte modus';
      const modes = MODES.map(([k, l, ic, col]) => {
        const act = cur[0] === k && !trans, holding = s.hold === k;
        return {
          k, label: l, icon: ic,
          style: { position: 'relative', overflow: 'hidden', height: 64, borderRadius: 17, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, background: act ? a(col, 0.18) : 'transparent', boxShadow: act ? `inset 0 0 0 1px ${a(col, 0.45)}` : 'none', color: act ? '#f2f1ee' : '#a9a7a2', touchAction: 'pan-y', userSelect: 'none', WebkitUserSelect: 'none', transition: 'background .25s' },
          fill: { position: 'absolute', left: 0, bottom: 0, top: 0, width: `${holding ? s.prog * 100 : 0}%`, background: a(col, 0.28) },
          iconStyle: { position: 'relative', fontSize: 21, color: act || holding ? col : '#a9a7a2', fontVariationSettings: `'FILL' ${act ? 1 : 0}` },
        };
      });
      const alertRows = [
        ...alerts.map(x => ({ id: x.id, icon: icon(x), text: x.type === 'lock' ? `${x.name} er ulåst` : `${x.name} er ${x.type === 'window' ? 'åpent' : 'åpen'}`, room: x.room, action: x.type === 'lock' ? 'Lås' : 'Vis' })),
        ...lowBat.map(x => ({ id: x.batId, icon: 'battery_alert', text: `Lavt batteri · ${x.bat} %`, room: `${x.room} · ${x.name}`, action: 'Vis' })),
      ];
      const rooms = roomsOrder.map((room, i) => {
        const list = sensors.filter(x => x.room === room);
        const al = list.some(x => this.isAlert(x)), mv = list.some(x => x.on && !this.isAlert(x));
        return {
          name: room,
          rowStyle: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 4px', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' },
          dot: { width: 7, height: 7, borderRadius: 4, flex: 'none', background: al ? C.amber : mv ? C.blue : '#48474a' },
          sensors: list.map(x => {
            const col = colorOf(x);
            return {
              id: x.id, icon: icon(x),
              label: !x.avail ? `${x.name} · utilgj.` : x.type === 'lock' && !x.on ? (x.bat != null ? `${x.name} · ${x.bat} %` : x.name) : label(x),
              style: { height: 32, padding: '0 11px 0 8px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', background: col ? a(col, 0.16) : '#1f1f22', color: col ? '#f2f1ee' : '#c9c7c2', boxShadow: col ? `inset 0 0 0 1px ${a(col, 0.4)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)', transition: 'background .2s', opacity: x.avail ? 1 : 0.5 },
              iconStyle: { fontSize: 16, color: col || '#8e8d89' },
            };
          }),
        };
      });
      const log = this.logRows(sensors).map(([text, who, time, kind], i, arr) => {
        const col = kind === 'alert' ? C.amber : kind === 'motion' ? C.blue : kind === 'mode' ? '#f2f1ee' : C.green;
        return { text, who, time, dot: { width: 9, height: 9, borderRadius: 5, marginTop: 5, background: col, flex: 'none' }, line: { flex: 1, width: 1, background: i < arr.length - 1 ? 'rgba(255,255,255,0.1)' : 'transparent', marginTop: 4 } };
      });

      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,560px);min-height:100vh;margin:0 auto;background:#141416;padding:20px var(--kd-kant,16px) 28px;display:flex;flex-direction:column;gap:22px">

  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Sikkerhet</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section style="display:flex;flex-direction:column;align-items:center;gap:20px">
    <div style="position:relative;width:260px;height:260px">
      ${ring.map(r => `<div title="${e(r.title)}" style="${S(r.style)}"></div>`).join('')}
      <div data-on-click="info" data-arg="${e(cfg.entity)}" style="${S(core)}">
        <span class="ms" style="${S(coreIcon)}">${t(modeIcon)}</span>
        <div style="font-size:26px;font-weight:500;letter-spacing:-0.02em">${t(modeLabel)}</div>
        <div style="font-size:12px;color:#8e8d89">${t(modeSince)}</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
      <div style="font-size:24px;font-weight:500;letter-spacing:-0.015em;text-wrap:balance">${t(headline)}</div>
      <div style="font-size:14px;color:#8e8d89">${t(subline)}</div>
    </div>
  </section>

  <section style="display:flex;flex-direction:column;gap:8px">
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:5px;border-radius:22px;background:#1c1c1f">
      ${modes.map(m => `<button data-on-pointerdown="startHold" data-on-pointerup="cancelHold" data-on-pointerleave="cancelHold" data-on-pointercancel="cancelHold" data-on-contextmenu="noMenu" data-arg="${m.k}" style="${S(m.style)}">
          <div style="${S(m.fill)}"></div>
          <span class="ms" style="${S(m.iconStyle)}">${t(m.icon)}</span>
          <span style="position:relative;font-size:12px;font-weight:500">${t(m.label)}</span>
        </button>`).join('')}
    </div>
    ${s.code ? this.keypadHTML() : `<div style="font-size:11px;color:#6d6c69;text-align:center">${t(holdHint)}</div>`}
  </section>

  ${alertRows.length ? `<section style="display:flex;flex-direction:column;gap:8px">
      <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:oklch(0.82 0.12 75);padding:0 4px">Krever oppmerksomhet</div>
      ${alertRows.map(x => `<div style="display:flex;align-items:center;gap:12px;padding:12px 12px 12px 14px;border-radius:20px;background:oklch(0.82 0.12 75 / 0.12);box-shadow:inset 0 0 0 1px oklch(0.82 0.12 75 / 0.35)">
          <span class="ms" style="font-size:22px;color:oklch(0.82 0.12 75)">${t(x.icon)}</span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
            <div style="font-size:15px;font-weight:500">${t(x.text)}</div>
            <div style="font-size:12px;color:#c9c7c2">${t(x.room)}</div>
          </div>
          <button class="kd-sik-fix" data-on-click="fix" data-arg="${e(x.id)}" style="height:36px;padding:0 14px;border-radius:18px;background:oklch(0.82 0.12 75);color:#161618;font-size:13px;font-weight:600;white-space:nowrap;transition:transform .12s">${t(x.action)}</button>
        </div>`).join('')}
    </section>` : ''}

  <section style="display:flex;flex-direction:column;gap:2px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:0 4px 8px">
      <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Rom</div>
      <div style="font-size:12px;color:#6d6c69;white-space:nowrap"><span>${n} sensorer</span></div>
    </div>
    ${rooms.map(room => `<div style="${S(room.rowStyle)}">
        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;padding-top:7px">
          <span style="${S(room.dot)}"></span>
          <span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t(room.name)}</span>
        </div>
        <div style="flex:none;max-width:62%;display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end">
          ${room.sensors.map(x => `<button class="kd-sik-chip" data-on-click="info" data-arg="${e(x.id)}" style="${S(x.style)}"><span class="ms" style="${S(x.iconStyle)}">${t(x.icon)}</span>${t(x.label)}</button>`).join('')}
        </div>
      </div>`).join('')}
  </section>

  ${Number(cfg.hendelser) ? `<section style="display:flex;flex-direction:column;gap:8px">
    <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:0 4px">Siste hendelser</div>
    <div style="display:flex;flex-direction:column;padding-left:4px">
      ${log.map(x => `<div style="display:flex;gap:14px;align-items:stretch">
          <div style="display:flex;flex-direction:column;align-items:center;width:10px;flex:none">
            <span style="${S(x.dot)}"></span>
            <span style="${S(x.line)}"></span>
          </div>
          <div style="flex:1;display:flex;justify-content:space-between;gap:12px;padding-bottom:14px">
            <div style="display:flex;flex-direction:column;gap:2px">
              <div style="font-size:14px">${t(x.text)}</div>
              <div style="font-size:12px;color:#8e8d89">${t(x.who)}</div>
            </div>
            <div style="font-size:12px;color:#8e8d89;font-variant-numeric:tabular-nums">${t(x.time)}</div>
          </div>
        </div>`).join('')}
      ${!log.length && this._lastLog ? `<div style="padding:4px 0 8px;font-size:13px;color:#6d6c69">Ingen hendelser</div>` : ''}
    </div>
  </section>` : ''}
</div>`;
    }
    noMenu(ev) { ev.preventDefault(); }
    onDisconnect() { cancelAnimationFrame(this._holdRaf); super.onDisconnect(); }
  }

  KD.define('kd-sikkerhet-card', KDSikkerhetCard, 'KD Sikkerhet', 'Sikkerhet v2: ring med alle sensorene, hold-for-å-bytte alarmmodus med kodetastatur, rommene og siste hendelser.');
  KD.sheet('sik', 'kd-sikkerhet-card');
})();
