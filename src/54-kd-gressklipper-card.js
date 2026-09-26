/*
 * kd-gressklipper-card – robotgressklipper (lawn_mower.*) i samme designspråk som støvsugerarket.
 *
 *   type: custom:kd-gressklipper-card     # alt annet er valgfritt («auto config»)
 *   entity: lawn_mower.robbie              # standard: første lawn_mower.* som finnes
 *   navn: Robbie
 * Ekstra entiteter finnes automatisk ut fra klipperens objekt-id (og samme enhet når hass.entities finnes),
 * med navngiving fra Husqvarna Automower, Worx Landroid og Segway Navimow. Alle kan overstyres:
 *   batteri, lading, modus, sone, soner: [switch./select./script./button. …], klippehoyde, tidsplan, neste_start,
 *   feil, bekreft_feil, kantklipp, fest, parker, kniv, kniv_levetid (t, standard 200), kart: [image./camera.], posisjon
 */
(() => {
  const KD = window.KD;
  const C = KD.C, a = KD.a;
  const G = C.green;

  // norske navn på kjente tilstander / valg
  const OPT = {
    main_area: 'Hovedområde', secondary_area: 'Sekundært', home: 'Hjem', demo: 'Demo', poi: 'Punkt',
    always_on: 'Alltid på', always_off: 'Alltid av', evening_only: 'Kveld', evening_and_night: 'Kveld og natt',
    on: 'På', off: 'Av', auto: 'Auto', manual: 'Manuell', eco: 'Eco', normal: 'Normal', low: 'Lav', medium: 'Middels', high: 'Høy',
  };
  const REASON = {
    week_schedule: 'Venter på tidsplan', park_override: 'Parkert til videre', sensor: 'Venter på værsensor', daily_limit: 'Dagens klipping er ferdig',
    fota: 'Oppdaterer programvare', frost: 'Frost – venter', all_work_areas_completed: 'Alle soner er klippet', external: 'Stoppet eksternt',
    rain_delay: 'Regnforsinkelse', rain: 'Regn – venter', searching_for_satellites: 'Søker etter satellitter',
  };
  const ERR = {
    outside_working_area: 'Utenfor arbeidsområdet', no_loop_signal: 'Ingen signal fra kantledningen', wrong_loop_signal: 'Feil kantledningssignal',
    trapped: 'Sitter fast', mower_lifted: 'Klipperen er løftet', lifted: 'Klipperen er løftet', mower_tilted: 'Klipperen står skjevt', upside_down: 'Klipperen ligger opp ned',
    collision_sensor_problem: 'Feil på kollisjonssensoren', stop_button_problem: 'Stoppknappen er trykket inn', stuck_in_charging_station: 'Sitter fast i ladestasjonen',
    wheel_motor_blocked_left: 'Venstre hjulmotor blokkert', wheel_motor_blocked_right: 'Høyre hjulmotor blokkert', wheel_motor_overloaded_left: 'Venstre hjulmotor overbelastet',
    wheel_motor_overloaded_right: 'Høyre hjulmotor overbelastet', cutting_system_blocked: 'Klippesystemet er blokkert', blade_motor_blocked: 'Knivmotoren er blokkert',
    low_battery: 'Lavt batteri', battery_problem: 'Batteriproblem', charging_system_problem: 'Feil på ladesystemet', no_drive: 'Kommer seg ikke fram',
    alarm_mower_lifted: 'Alarm: klipperen er løftet', alarm_mower_stopped: 'Alarm: klipperen er stoppet', alarm_outside_geofence: 'Alarm: utenfor geogjerdet',
    guide_1_not_found: 'Finner ikke guidekabel 1', rain: 'Regn', locked: 'Låst', pin_code_required: 'PIN-kode kreves', unexpected_error: 'Uventet feil',
  };
  const SNAVN = { headlight_mode: 'Frontlys', headlight: 'Frontlys', mode: 'Modus', mower_mode: 'Modus', cutting_mode: 'Klippemodus', rain_delay: 'Regnforsinkelse', raindelay: 'Regnforsinkelse', time_extension: 'Tidsforlengelse' };
  const NOERR = /^(none|no.?error|ingen|0|ok|unknown|unavailable)$/i;
  const cap = s => String(s || '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
  const opt = o => OPT[String(o).toLowerCase()] || cap(o);

  class KDGressklipperCard extends KD.KDSheet {
    static head() { return ['grass', 'Gressklipper', this.navn()]; }
    static defaults = { kniv_levetid: 200 };
    static sheetCss = `.kd-mow-ctl:active{transform:scale(0.96)}
@keyframes kdmspin{to{transform:rotate(360deg)}}
@keyframes kdmpulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes kdmblade{to{transform:rotate(360deg)}}`;

    constructor() { super(); this.state = { tab: 'zones' }; }

    /* ----- oppdagelse ----- */
    get ent() { return this.config.entity || this.find(/^lawn_mower\./)[0] || ''; }
    get base() { return String(this.ent).split('.')[1] || 'gressklipper'; }
    navn() { return this.config.navn || (this.ent ? this.fname(this.ent, '').trim() : '') || 'Gressklipper'; }
    /** entiteter som hører til klipperen: samme objekt-id-prefiks, eller samme enhet i entitetsregisteret */
    sibs() {
      if (this._sibs) return this._sibs;
      const b = this.base, ids = new Set(this.find(new RegExp(`^[a-z_]+\\.${b}_`)));
      const reg = this._hass && this._hass.entities, me = reg && reg[this.ent];
      if (me && me.device_id) for (const [id, r] of Object.entries(reg)) if (r && r.device_id === me.device_id && this.st(id)) ids.add(id);
      ids.delete(this.ent);
      return (this._sibs = [...ids]);
    }
    /** første søsken-entitet i domenet med objekt-id som slutter på et av navnene */
    by(dom, alts, not) {
      const re = new RegExp(`(^|_)(${alts.join('|')})$`);
      return this.sibs().find(id => id.startsWith(dom + '.') && re.test(id.split('.')[1]) && !(not && not.test(id))) || null;
    }
    pick(key, dom, alts, not) { const c = this.config[key]; if (c) return this.st(c) ? c : null; return this.by(dom, alts, not); }
    ents() {
      const b = this.base;
      const hoyde = this.config.klippehoyde || (this.st(`number.${b}_cutting_height`) ? `number.${b}_cutting_height` : null)
        || this.sibs().find(id => /^number\./.test(id) && /(cutting|cut|mowing|blade)_height$/.test(id) && this.unit(id) !== '%') || null;
      return {
        batteri: this.pick('batteri', 'sensor', ['battery', 'battery_level', 'battery_percent']),
        lading: this.pick('lading', 'binary_sensor', ['charging', 'battery_charging', 'is_charging']),
        modus: this.pick('modus', 'sensor', ['mode', 'mower_mode']),
        sone: this.pick('sone', 'sensor', ['work_area', 'current_zone', 'zone', 'current_area', 'area']),
        soneValg: this.pick('sone_valg', 'select', ['work_area', 'current_zone', 'zone', 'area', 'work_zone']),
        hoyde,
        tidsplan: this.pick('tidsplan', 'switch', ['enable_schedule', 'schedule', 'schedule_enabled', 'auto_schedule']),
        neste: this.pick('neste_start', 'sensor', ['next_start', 'next_scheduled_start', 'next_schedule', 'next_start_time']),
        feil: this.pick('feil', 'sensor', ['error', 'last_error', 'error_code', 'mower_error']),
        grunn: this.pick('grunn', 'sensor', ['restricted_reason', 'inactive_reason', 'status_reason']),
        bekreft: this.pick('bekreft_feil', 'button', ['confirm_error', 'clear_error', 'reset_error']),
        kant: this.pick('kantklipp', 'button', ['edgecut', 'edge_cut', 'start_edgecut', 'start_cutting_edge', 'cutting_edge', 'border_cut']),
        fest: this.pick('fest', 'switch', ['party_mode', 'partymode']),
        las: this.pick('las', 'switch', ['locked', 'lock', 'child_lock']),
        parker: this.config.parker && this.st(this.config.parker) ? this.config.parker : null,
        kniv: this.pick('kniv', 'sensor', ['cutting_blade_usage_time', 'blades_current_on_time', 'blade_usage_time', 'blades_current_on', 'blade_time', 'blades_usage']),
        knivReset: this.pick('kniv_reset', 'button', ['reset_blade_time', 'reset_blades', 'reset_blade', 'reset_blade_usage']),
        posisjon: this.config.posisjon || this.sibs().find(id => id.startsWith('device_tracker.')) || (this.st(`device_tracker.${b}`) ? `device_tracker.${b}` : null),
      };
    }
    /** soner: arbeidsområder (Husqvarna: number.<b>_<sone>_cutting_height + switch.<b>_<sone>) og config `soner` */
    zones(E) {
      const b = this.base, name = this.navn().toLowerCase(), out = [], seen = new Set();
      const clean = (s) => String(s || '').replace(new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'i'), '').replace(/\s*(cutting height|klippehøyde|work area|arbeidsområde)$/i, '').trim();
      const cur = E.sone && this.ok(E.sone) ? String(this.v(E.sone)).toLowerCase() : '';
      for (const id of this.sibs().filter(x => /^number\./.test(x) && /_cutting_height$/.test(x) && x !== E.hoyde)) {
        const slug = id.split('.')[1].replace(new RegExp(`^${b}_`), '').replace(/_cutting_height$/, '');
        const sw = [`switch.${b}_${slug}`, `switch.${b}_${slug}_work_area`].find(x => this.st(x)) || null;
        const navn = clean(this.fname(id, '')) || cap(slug);
        out.push({ key: id, navn, sw, hoyde: id, on: sw ? this.isOn(sw) : true, cur: cur && (cur === navn.toLowerCase() || cur === slug) });
        if (sw) seen.add(sw); seen.add(id);
      }
      for (const id of this.sibs().filter(x => /^switch\./.test(x) && /_work_area$/.test(x) && !seen.has(x))) {
        const navn = clean(this.fname(id, '')) || cap(id.split('.')[1].replace(new RegExp(`^${b}_`), '').replace(/_work_area$/, ''));
        out.push({ key: id, navn, sw: id, on: this.isOn(id), cur: cur === navn.toLowerCase() }); seen.add(id);
      }
      for (const z of (Array.isArray(this.config.soner) ? this.config.soner : [])) {
        const o = typeof z === 'string' ? { entity: z } : z || {};
        if (!o.entity || seen.has(o.entity) || !this.st(o.entity)) continue;
        const d = o.entity.split('.')[0], navn = o.navn || clean(this.fname(o.entity, '')) || o.entity;
        out.push({ key: o.entity, navn, ikon: o.ikon, sw: d === 'switch' || d === 'input_boolean' ? o.entity : null, run: d === 'script' || d === 'button' || d === 'scene' ? o.entity : null,
          hoyde: o.klippehoyde || null, on: d === 'switch' || d === 'input_boolean' ? this.isOn(o.entity) : false, cur: cur === navn.toLowerCase() });
      }
      return out;
    }
    /** unngå-soner (Husqvarna stay-out zones: switch.<b>_avoid_*) */
    avoid() { return this.sibs().filter(id => /^switch\./.test(id) && /(_avoid_|stay_out)/.test(id)); }
    selects(E) {
      const extra = Array.isArray(this.config.valg) ? this.config.valg : [];
      return [...new Set([...extra, ...this.sibs().filter(id => /^select\./.test(id))])].filter(id => id !== E.soneValg && this.ok(id))
        .map(id => ({ id, navn: this.shortName(id), opts: (this.at(id, 'options', []) || []).map(String) })).filter(x => x.opts.length > 1 && x.opts.length <= 6);
    }
    switches(E, zones) {
      const known = new Set([E.tidsplan, E.fest, E.las, ...zones.map(z => z.sw), ...this.avoid()].filter(Boolean));
      return this.sibs().filter(id => /^switch\./.test(id) && !known.has(id) && this.ok(id));
    }
    numbers(E, zones) {
      const known = new Set([E.hoyde, ...zones.map(z => z.hoyde)].filter(Boolean));
      return this.sibs().filter(id => /^number\./.test(id) && !known.has(id) && !/_cutting_height$/.test(id) && this.ok(id));
    }
    maps() {
      const cfg = Array.isArray(this.config.kart) ? this.config.kart : this.config.kart ? [this.config.kart] : [];
      const ids = [...cfg, ...this.sibs().filter(id => /^(image|camera)\./.test(id))];
      return [...new Set(ids)].filter(id => this.ok(id) && this.at(id, 'entity_picture')).map(id => ({ id, src: this.at(id, 'entity_picture'), navn: this.shortName(id) || 'Kart' }));
    }
    shortName(id) {
      const k = id.split('.')[1].replace(new RegExp(`^${this.base}_`), '');
      if (SNAVN[k]) return SNAVN[k];
      const n = this.navn().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return String(this.fname(id, '') || '').replace(new RegExp('^' + n + '\\s*', 'i'), '').trim() || cap(id.split('.')[1].replace(new RegExp(`^${this.base}_`), ''));
    }
    /** varighet → timer (støtter «HH:MM:SS», s, min, h, d) */
    hours(id) {
      const s = this.st(id); if (!s || KD.BAD.has(s.state)) return null;
      if (String(s.state).includes(':')) { const [h, m] = s.state.split(':').map(Number); return h + (m || 0) / 60; }
      const x = parseFloat(s.state); if (isNaN(x)) return null;
      const u = s.attributes.unit_of_measurement;
      return u === 's' ? x / 3600 : u === 'min' ? x / 60 : u === 'd' ? x * 24 : x;
    }
    /** klippehøyde som tekst: «5 cm» eller «5 av 9» (nivåer uten enhet) */
    heightTxt(id) {
      if (!id || !this.ok(id)) return null;
      const v = this.n(id), u = this.unit(id), max = this.at(id, 'max');
      if (v == null) return null;
      const vs = String(Math.round(v * 10) / 10).replace('.', ',');
      return u ? `${vs} ${u}` : max != null && max <= 12 ? `${vs} av ${max}` : vs;
    }

    /* ----- handlinger ----- */
    tab(e, k) { this.setState({ tab: k }); }
    mow(svc) { return this.call('lawn_mower', svc, { entity_id: this.ent }); }
    main() { const st = this.status(); st === 'mowing' ? this.mow('pause') : this.mow('start_mowing'); }
    ctl(e, k) {
      const E = this.ents();
      if (k === 'dock') return this.mow('dock');
      if (k === 'edge' && E.kant) return this.press(E.kant);
      if (k === 'park' && E.parker) return this.press(E.parker);
      if (k === 'schedule' && E.tidsplan) return this.call('switch', 'toggle', { entity_id: E.tidsplan });
      if (k === 'confirm' && E.bekreft) return this.press(E.bekreft);
      if (k === 'more') return this.more(this.ent);
    }
    toggleSw(e, id) { if (id) this.call(id.split('.')[0] === 'input_boolean' ? 'input_boolean' : 'switch', 'toggle', { entity_id: id }); }
    zoneTap(e, key) {
      const z = this.zones(this.ents()).find(x => x.key === key); if (!z) return;
      if (z.run) return this.press(z.run);
      if (z.sw) return this.toggleSw(e, z.sw);
    }
    selOpt(e, arg) { const i = String(arg).lastIndexOf('|'); if (i > 0) this.call('select', 'select_option', { entity_id: arg.slice(0, i), option: arg.slice(i + 1) }); }
    step(e, arg) { const i = String(arg).lastIndexOf('|'); if (i > 0) KD.stepSet(this, arg.slice(0, i), +arg.slice(i + 1)); }
    setH(e, arg) { const i = String(arg).lastIndexOf('|'); if (i > 0) this.setNum(arg.slice(0, i), +arg.slice(i + 1)); }
    resetBlade() { const E = this.ents(); if (E.knivReset) this.press(E.knivReset); }
    pickMap(e, id) { this.setState({ map: id }); }
    openIt(e, id) { this.more(id || this.ent); }

    status() {
      const s = this.v(this.ent);
      if (['mowing', 'paused', 'returning', 'error', 'docked'].includes(s)) return s;
      if (!this.ent || !this.ok(this.ent)) return 'unavailable';
      return 'docked';
    }

    body() {
      this._sibs = null;
      const s = this.state, cf = this.config, E = this.ents(), st = this.status(), e = KD.e;
      const ent = this.ent;
      if (!ent) return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:18px">
  <section>${this.empty('grass', 'Fant ingen gressklipper', 'Legg til en lawn_mower-entitet i Home Assistant, eller sett «entity» i kortet.')}</section></div>`;
      let bRaw = this.n(E.batteri); if (bRaw == null) bRaw = parseFloat(this.at(ent, 'battery_level'));
      const hasB = bRaw != null && !isNaN(bRaw);
      const b = hasB ? Math.round(bRaw) : 0;
      const col = st === 'mowing' ? G : st === 'paused' ? C.amber : st === 'returning' ? C.blue : st === 'error' || st === 'unavailable' ? C.red : G;
      const charging = E.lading ? this.isOn(E.lading) : st === 'docked' && hasB && b < 100;
      const zones = this.zones(E);
      const zoneNow = E.sone && this.ok(E.sone) ? String(this.v(E.sone)) : (zones.find(z => z.cur) || {}).navn || null;
      const errRaw = E.feil && this.ok(E.feil) && !NOERR.test(this.v(E.feil)) ? this.v(E.feil) : (this.at(ent, 'error') || '');
      const errTxt = errRaw ? (ERR[String(errRaw).toLowerCase()] || cap(errRaw)) : '';
      const reasonRaw = E.grunn && this.ok(E.grunn) && !/^(none|not_applicable|no_reason)$/i.test(this.v(E.grunn)) ? String(this.v(E.grunn)) : '';
      const reason = reasonRaw ? (REASON[reasonRaw.toLowerCase()] || cap(reasonRaw)) : '';
      const nextS = E.neste ? this.v(E.neste) : '';
      const next = nextS && !KD.BAD.has(nextS) ? new Date(nextS) : null;
      const nextOk = next && !isNaN(next);
      const nextTxt = nextOk ? `${this.dayWord(next)} ${KD.hm(next)}` : null;
      const hTxt = this.heightTxt(E.hoyde);
      const schedOn = E.tidsplan ? this.isOn(E.tidsplan) : null;
      const knivH = E.kniv ? this.hours(E.kniv) : null;
      const labels = { docked: charging ? 'Lader' : 'I laderen', mowing: 'Klipper', paused: 'Pause', returning: 'På vei hjem', error: 'Feil', unavailable: 'Utilgjengelig' };
      const headline = st === 'mowing' ? (zoneNow ? `Klipper ${zoneNow.toLowerCase()}` : 'Klipper plenen') : st === 'paused' ? 'Satt på pause' : st === 'returning' ? 'Kjører til laderen'
        : st === 'error' ? 'Trenger hjelp' : st === 'unavailable' ? 'Ikke tilgjengelig' : charging ? 'Lader i laderen' : 'Parkert i laderen';
      let subline;
      if (st === 'error') subline = errTxt || 'Sjekk klipperen';
      else if (st === 'mowing') subline = [E.modus && this.ok(E.modus) ? opt(this.v(E.modus)) : '', schedOn === true ? 'Følger tidsplanen' : schedOn === false ? 'Startet manuelt' : '', hasB && b < 25 ? 'Lavt batteri' : ''].filter(Boolean).join(' · ') || 'I gang';
      else if (st === 'returning') subline = hasB && b < 30 ? 'Lavt batteri – skal lade' : 'Ferdig for nå';
      else if (reason && !(nextTxt && reasonRaw === 'week_schedule')) subline = reason + (nextTxt ? ` · neste ${nextTxt}` : '');
      else subline = nextTxt ? `Neste start ${nextTxt}` : schedOn === false ? 'Tidsplanen er av' : labels[st];

      // helt
      const ringV = hasB ? b : 0;
      const ringC = st === 'docked' ? (b < 20 ? C.red : b < 40 ? C.amber : G) : col;
      const RL = 2 * Math.PI * 86;
      const batIcon = charging ? 'battery_charging_full' : b > 90 ? 'battery_full' : b > 65 ? 'battery_5_bar' : b > 40 ? 'battery_4_bar' : b > 20 ? 'battery_2_bar' : 'battery_alert';
      const moving = st === 'mowing';
      const statCand = st === 'mowing' || st === 'paused'
        ? [['Sone', zoneNow], ['Klippehøyde', hTxt], ['Knivtid', knivH != null ? `${Math.round(knivH)} t` : null], ['Neste start', nextTxt]]
        : [['Klippehøyde', hTxt], ['Sone', zoneNow], ['Knivtid', knivH != null ? `${Math.round(knivH)} t` : null], ['Batteri', hasB ? `${b} %` : null]];
      const heroStats = statCand.filter(x => x[1]).slice(0, 3);
      const mower = `<svg viewBox="0 0 100 100" style="position:absolute;inset:34px;width:calc(100% - 68px);height:calc(100% - 68px);filter:drop-shadow(0 10px 18px rgba(0,0,0,0.5))">
        <defs>
          <linearGradient id="kdmBody" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="#4a4a50"></stop><stop offset="0.5" stop-color="#2c2c30"></stop><stop offset="1" stop-color="#1b1b1e"></stop></linearGradient>
          <linearGradient id="kdmTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3a3f"></stop><stop offset="1" stop-color="#222226"></stop></linearGradient>
        </defs>
        <ellipse cx="50" cy="92" rx="34" ry="5" fill="rgba(0,0,0,0.35)"></ellipse>
        <rect x="1" y="50" width="15" height="36" rx="6" fill="#121214" stroke="rgba(255,255,255,0.10)"></rect>
        <rect x="84" y="50" width="15" height="36" rx="6" fill="#121214" stroke="rgba(255,255,255,0.10)"></rect>
        <path d="M3 56h11M3 61h11M3 66h11M3 71h11M3 76h11M3 81h11M86 56h11M86 61h11M86 66h11M86 71h11M86 76h11M86 81h11" stroke="rgba(255,255,255,0.09)" stroke-width="1.8"></path>
        <path d="M50 4 C68 4 82 16 85 36 L88 68 C89 84 78 94 62 94 L38 94 C22 94 11 84 12 68 L15 36 C18 16 32 4 50 4 Z" fill="url(#kdmBody)" stroke="rgba(255,255,255,0.14)" stroke-width="1"></path>
        <path d="M22 26 C30 12 40 9 50 9 C60 9 70 12 78 26" fill="none" stroke="${a(G, 0.55)}" stroke-width="2.2" stroke-linecap="round"></path>
        <g style="transform-origin:50px 58px;${moving ? 'animation:kdmblade .45s linear infinite' : ''}" opacity="${moving ? 0.6 : 0.3}">
          <circle cx="50" cy="58" r="19" fill="none" stroke="${a(G, 0.5)}" stroke-width="1" stroke-dasharray="3 3"></circle>
          <path d="M50 41v6M50 69v6M33 58h6M61 58h6" stroke="${G}" stroke-width="2.2" stroke-linecap="round"></path>
        </g>
        <path d="M50 17 C63 17 72 26 73 39 L74 62 C74 72 67 79 58 79 L42 79 C33 79 26 72 26 62 L27 39 C28 26 37 17 50 17 Z" fill="url(#kdmTop)" stroke="rgba(255,255,255,0.10)" stroke-width="1" opacity="0.93"></path>
        <path d="M33 34 C36 26 42 22 50 22 C58 22 64 26 67 34" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2" stroke-linecap="round"></path>
        <rect x="37" y="42" width="26" height="16" rx="5" fill="#141416" stroke="rgba(255,255,255,0.12)" stroke-width="1"></rect>
        <circle cx="50" cy="50" r="3.2" fill="${ringC}"${moving ? ' style="animation:kdmpulse 1.4s ease-in-out infinite"' : ''}></circle>
        <rect x="41" y="66" width="18" height="4" rx="2" fill="${a(ringC, 0.8)}"></rect>
        <rect x="46" y="84" width="8" height="5" rx="2" fill="rgba(255,255,255,0.12)"></rect>
      </svg>`;
      const grass = (() => { // små gresstrå rundt ringen
        let p = '';
        for (let i = 0; i < 36; i++) {
          const ang = i / 36 * Math.PI * 2, r0 = 96, h = 3 + ((i * 7) % 5);
          const x = 98 + Math.cos(ang) * r0, y = 98 + Math.sin(ang) * r0, x2 = 98 + Math.cos(ang + 0.03) * (r0 + h), y2 = 98 + Math.sin(ang + 0.03) * (r0 + h);
          p += `M${x.toFixed(1)} ${y.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
        }
        return `<path d="${p}" stroke="${a(G, 0.22)}" stroke-width="1.6" stroke-linecap="round" fill="none"></path>`;
      })();
      const hero = `<section style="position:relative;overflow:hidden;border-radius:30px;padding:16px 16px 14px;background:radial-gradient(120% 70% at 50% 0%, ${a(col, 0.16)} 0%, rgba(28,28,31,0) 62%), #1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05);display:flex;flex-direction:column;align-items:center;gap:12px">
    <div style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px">
      <span style="display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 12px;border-radius:15px;background:rgba(255,255,255,0.06);font-size:12px;font-weight:600;min-width:0"><span style="width:8px;height:8px;border-radius:4px;flex:none;background:${col};box-shadow:0 0 10px ${a(col, 0.8)}${moving ? ';animation:kdmpulse 1.4s ease-in-out infinite' : ''}"></span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(labels[st])}</span></span>
      ${hasB ? `<span style="display:inline-flex;align-items:center;gap:4px;height:30px;padding:0 10px 0 8px;border-radius:15px;background:rgba(255,255,255,0.06);font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;color:${b < 20 ? C.red : '#f2f1ee'}"><span class="ms" style="font-size:17px;transform:rotate(90deg);color:${charging ? G : 'inherit'};font-variation-settings:'FILL' 1">${batIcon}</span>${b} %</span>` : ''}
    </div>
    <div data-on-click="openIt" style="position:relative;width:196px;height:196px;cursor:pointer">
      ${moving ? `<span style="position:absolute;inset:22px;border-radius:50%;background:conic-gradient(from 0deg, ${a(col, 0)} 0deg, ${a(col, 0)} 250deg, ${a(col, 0.32)} 360deg);animation:kdmspin 2.6s linear infinite"></span>` : `<span style="position:absolute;inset:22px;border-radius:50%;background:radial-gradient(circle, ${a(ringC, 0.10)} 0%, rgba(0,0,0,0) 70%)"></span>`}
      <svg viewBox="0 0 196 196" style="position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg);overflow:visible">
        ${grass}
        <circle cx="98" cy="98" r="86" fill="none" stroke="#2a2a2d" stroke-width="9"></circle>
        <circle cx="98" cy="98" r="86" fill="none" stroke="${ringC}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(RL * ringV / 100).toFixed(1)} ${RL.toFixed(1)}" style="transition:stroke-dasharray 1s cubic-bezier(.2,.9,.3,1), stroke .4s;filter:drop-shadow(0 0 6px ${a(ringC, 0.55)})"></circle>
      </svg>
      ${mower}
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:5px;text-align:center;max-width:100%;min-width:0">
      <div style="font-size:23px;font-weight:500;letter-spacing:-0.015em;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e(headline)}</div>
      <div style="font-size:13px;color:${st === 'error' ? C.red : '#8e8d89'};max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e(subline)}</div>
    </div>
    ${heroStats.length ? `<div style="width:100%;display:grid;grid-template-columns:repeat(${heroStats.length},minmax(0,1fr));border-radius:20px;background:rgba(255,255,255,0.035);padding:10px 0">
      ${heroStats.map(([l, v], i) => `<div style="min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;padding:0 6px;${i ? 'border-left:1px solid rgba(255,255,255,0.06)' : ''}"><span style="font-size:11px;color:#8e8d89;white-space:nowrap">${e(l)}</span><span style="font-size:15px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${e(v)}</span></div>`).join('')}
    </div>` : ''}
  </section>`;

      // handlinger
      const main = st === 'mowing'
        ? { icon: 'pause', label: 'Pause', bg: a(C.amber, 0.16), fg: '#f2f1ee', sh: `inset 0 0 0 1px ${a(C.amber, 0.45)}` }
        : { icon: 'play_arrow', label: st === 'paused' ? 'Fortsett' : 'Start klipping', bg: `linear-gradient(135deg, ${G}, oklch(0.88 0.1 135))`, fg: '#10231a', sh: `0 10px 26px ${a(G, 0.25)}, inset 0 1px 0 rgba(255,255,255,0.35)` };
      const tile = (k, icon, label, on, c) => `<button class="kd-mow-ctl" data-on-click="ctl" data-arg="${k}" style="min-width:0;height:60px;border-radius:22px;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 8px;background:${on ? a(c, 0.16) : '#1c1c1f'};box-shadow:${on ? `inset 0 0 0 1px ${a(c, 0.45)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)'};transition:transform .15s, background .2s">
          <span style="width:34px;height:34px;border-radius:17px;flex:none;display:grid;place-items:center;background:${on ? a(c, 0.25) : '#2a2a2e'};color:${on ? c : '#e4e2dd'}"><span class="ms" style="font-size:19px;font-variation-settings:'FILL' 1">${icon}</span></span>
          <span style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0">${e(label)}</span></button>`;
      const tiles = [tile('dock', 'home', st === 'returning' ? 'Kjører hjem' : 'Hjem', st === 'returning', C.blue)];
      if (st === 'error' && E.bekreft) tiles.unshift(tile('confirm', 'task_alt', 'Bekreft feil', true, C.red));
      if (E.kant) tiles.push(tile('edge', 'border_style', 'Kant', false, G));
      if (E.parker) tiles.push(tile('park', 'local_parking', 'Parkér til neste', false, C.blue));
      if (E.tidsplan) tiles.push(tile('schedule', schedOn ? 'event_available' : 'event_busy', schedOn ? 'Tidsplan' : 'Plan av', schedOn, G));
      if (tiles.length < 3) tiles.push(tile('more', 'more_horiz', 'Detaljer', false, G));
      const cols = tiles.length === 4 ? 2 : Math.min(3, tiles.length);
      const actions = `<section style="display:flex;flex-direction:column;gap:10px">
    <button class="kd-mow-ctl" data-on-click="main" data-haptic="medium" style="height:62px;border-radius:31px;display:flex;align-items:center;justify-content:center;gap:10px;padding:0 20px;font-size:16px;font-weight:600;background:${main.bg};color:${main.fg};box-shadow:${main.sh};transition:transform .15s"><span class="ms" style="font-size:26px;font-variation-settings:'FILL' 1">${main.icon}</span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(main.label)}</span></button>
    <div style="display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:8px">${tiles.join('')}</div>
  </section>`;

      const tabs = KD.segHTML('mow-tab', [['zones', 'Soner'], ['settings', 'Innstillinger'], ['info', 'Status'], ['map', 'Kart']], s.tab, 'tab', { pink: true });
      const lbl = (t, right = '') => `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 4px;min-height:22px"><div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;white-space:nowrap">${e(t)}</div>${right}</div>`;
      const meta = t => `<span style="font-size:12px;color:#6d6c69;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0">${e(t)}</span>`;
      const swRow = (id, icon, title, sub, c = G) => { const on = this.isOn(id); return `<button data-on-click="toggleSw" data-arg="${e(id)}" style="width:100%;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:22px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04);text-align:left">
      <span style="width:38px;height:38px;border-radius:19px;flex:none;display:grid;place-items:center;background:${on ? a(c, 0.2) : '#2a2a2e'};color:${on ? c : '#c9c7c2'}"><span class="ms" style="font-size:20px;font-variation-settings:'FILL' 1">${icon}</span></span>
      <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(title)}</span><span style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(sub != null ? sub : on ? 'På' : 'Av')}</span></span>
      ${this.sw(on)}</button>`; };
      const stepper = (id, small) => {
        const v = this.n(id), u = this.unit(id), lo = this.at(id, 'min', 0), hi = this.at(id, 'max', 100);
        const pct = v == null || hi === lo ? 0 : KD.clamp((v - lo) / (hi - lo) * 100, 0, 100);
        const bt = (dir, ic) => `<button class="kd-mow-ctl" data-on-click="step" data-arg="${e(id)}|${dir}" style="width:${small ? 32 : 40}px;height:${small ? 32 : 40}px;border-radius:${small ? 16 : 20}px;flex:none;display:grid;place-items:center;background:#2a2a2e;color:#e4e2dd;transition:transform .15s"><span class="ms" style="font-size:${small ? 18 : 20}px">${ic}</span></button>`;
        return `<span style="display:flex;align-items:center;gap:8px;flex:none">${bt(-1, 'remove')}<span style="min-width:${small ? 44 : 56}px;display:flex;flex-direction:column;align-items:center;gap:4px"><span style="font-size:${small ? 13 : 15}px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap">${v == null ? '–' : String(Math.round(v * 10) / 10).replace('.', ',')}${u ? ` ${e(u)}` : ''}</span><span style="width:100%;height:4px;border-radius:2px;background:#2a2a2d;overflow:hidden"><span style="display:block;width:${pct}%;height:100%;background:${G}"></span></span></span>${bt(1, 'add')}</span>`;
      };
      let tabHTML = '';

      if (s.tab === 'zones') {
        const avoid = this.avoid();
        const zsel = E.soneValg ? (this.at(E.soneValg, 'options', []) || []).map(String) : [];
        const active = zones.filter(z => z.sw && z.on).length;
        const tilesZ = zones.map(z => {
          const on = z.sw ? z.on : z.cur, now = z.cur && (st === 'mowing' || st === 'paused');
          const sub = now ? 'Klippes nå' : z.run ? 'Trykk for å starte' : z.sw ? (on ? 'Aktiv – klippes etter plan' : 'Av – hoppes over') : z.hoyde ? `Klippehøyde ${this.heightTxt(z.hoyde) || '–'}` : 'Sone';
          return `<div style="position:relative;min-width:0;border-radius:22px;padding:12px;box-sizing:border-box;display:flex;flex-direction:column;gap:10px;background:${on ? `linear-gradient(160deg, ${a(G, 0.22)}, ${a(G, 0.06)})` : '#1c1c1f'};box-shadow:${now ? `inset 0 0 0 1.5px ${G}` : on ? `inset 0 0 0 1.5px ${a(G, 0.45)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)'};transition:background .25s, box-shadow .25s">
            <button data-on-click="zoneTap" data-arg="${e(z.key)}" style="display:flex;align-items:center;gap:10px;text-align:left;min-width:0">
              <span style="width:36px;height:36px;border-radius:18px;flex:none;display:grid;place-items:center;background:${on ? a(G, 0.25) : '#2a2a2e'};color:${on ? G : '#c9c7c2'}"><span class="ms" style="font-size:20px;font-variation-settings:'FILL' ${on ? 1 : 0}${now ? ';animation:kdmpulse 1.6s ease-in-out infinite' : ''}">${e(z.ikon || (now ? 'agriculture' : 'yard'))}</span></span>
              <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:1px"><span style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(z.navn)}</span><span style="font-size:11px;color:${on ? a(G, 0.9) : '#8e8d89'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(sub)}</span></span>
              ${z.sw ? this.sw(on) : ''}
            </button>
            ${z.hoyde && this.ok(z.hoyde) ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.06)"><span style="font-size:12px;color:#8e8d89;white-space:nowrap">Klippehøyde</span>${stepper(z.hoyde, true)}</div>` : ''}
          </div>`;
        }).join('');
        const none = !zones.length && !zsel.length && !avoid.length;
        tabHTML = none ? `<section>${this.empty('yard', 'Ingen soner funnet', 'Klipperen har ingen arbeidsområder i Home Assistant. Legg dem til med «soner» i kortet.')}</section>` : `${zones.length ? `<section style="display:flex;flex-direction:column;gap:10px">
    ${lbl('Arbeidsområder', meta(zones.some(z => z.sw) ? `${active} av ${zones.filter(z => z.sw).length} aktive` : `${zones.length} soner`))}
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:8px">${tilesZ}</div>
  </section>` : ''}
    ${zsel.length ? `<section style="display:flex;flex-direction:column;gap:8px">
    ${lbl(zones.length ? 'Klipp i sone' : 'Sone', meta(opt(this.v(E.soneValg))))}
    <div data-hscroll="1" style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 calc(-1 * var(--kd-kant,10px));padding:0 var(--kd-kant,10px)">
      ${zsel.map(o => { const on = this.v(E.soneValg) === o; return `<button data-on-click="selOpt" data-arg="${e(E.soneValg + '|' + o)}" style="flex:none;height:40px;padding:0 14px 0 10px;border-radius:20px;display:flex;align-items:center;gap:7px;font-size:13px;font-weight:500;white-space:nowrap;background:${on ? a(G, 0.16) : '#1c1c1f'};color:${on ? '#f2f1ee' : '#c9c7c2'};box-shadow:${on ? `inset 0 0 0 1.5px ${a(G, 0.55)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)'}"><span class="ms" style="font-size:17px;color:${on ? G : 'inherit'};font-variation-settings:'FILL' ${on ? 1 : 0}">yard</span><span>${e(opt(o))}</span></button>`; }).join('')}
    </div>
  </section>` : ''}
    ${avoid.length ? `<section style="display:flex;flex-direction:column;gap:8px">
    ${lbl('Unngå-soner', meta(`${avoid.filter(id => this.isOn(id)).length} aktive`))}
    ${avoid.map(id => swRow(id, 'block', this.shortName(id).replace(/^avoid\s*/i, ''), this.isOn(id) ? 'Klipperen holder seg unna' : 'Klippes som vanlig', C.amber)).join('')}
  </section>` : ''}`;
      }

      if (s.tab === 'settings') {
        let heightHTML = '';
        if (E.hoyde && this.ok(E.hoyde)) {
          const id = E.hoyde, v = this.n(id, 0), lo = this.at(id, 'min', 1), hi = this.at(id, 'max', 9), stp = this.at(id, 'step', 1) || 1;
          const n = Math.round((hi - lo) / stp) + 1;
          const bars = n >= 2 && n <= 12 ? Array.from({ length: n }, (_, i) => {
            const val = Math.round((lo + i * stp) * 100) / 100, on = val <= v + 1e-9, curB = Math.abs(val - v) < 1e-9;
            return `<button data-on-click="setH" data-arg="${e(id)}|${val}" title="${val}" style="flex:1;min-width:0;height:100%;display:flex;align-items:flex-end;justify-content:center;padding:0 1px"><span style="display:block;width:100%;max-width:22px;height:${24 + (i / Math.max(1, n - 1)) * 76}%;border-radius:8px 8px 4px 4px;background:${on ? (curB ? G : a(G, 0.45)) : '#2a2a2d'};box-shadow:${curB ? `0 0 14px ${a(G, 0.5)}` : 'none'};transition:background .25s, height .3s"></span></button>`;
          }).join('') : '';
          heightHTML = `<section style="display:flex;flex-direction:column;gap:8px">
      ${lbl('Klippehøyde', meta(this.heightTxt(id) || ''))}
      <div style="display:flex;flex-direction:column;gap:14px;padding:16px;border-radius:24px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04)">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
          <span style="display:flex;align-items:baseline;gap:6px;min-width:0"><span style="font-size:40px;font-weight:500;letter-spacing:-0.03em;font-variant-numeric:tabular-nums;line-height:1">${String(Math.round(v * 10) / 10).replace('.', ',')}</span><span style="font-size:13px;color:#8e8d89;white-space:nowrap">${e(this.unit(id) || (hi <= 12 ? `av ${hi}` : ''))}</span></span>
          <span style="display:flex;gap:8px">
            <button class="kd-mow-ctl" data-on-click="step" data-arg="${e(id)}|-1" style="width:44px;height:44px;border-radius:22px;display:grid;place-items:center;background:#2a2a2e;color:#e4e2dd;transition:transform .15s"><span class="ms" style="font-size:22px">remove</span></button>
            <button class="kd-mow-ctl" data-on-click="step" data-arg="${e(id)}|1" style="width:44px;height:44px;border-radius:22px;display:grid;place-items:center;background:${a(G, 0.18)};color:${G};transition:transform .15s"><span class="ms" style="font-size:22px">add</span></button>
          </span>
        </div>
        ${bars ? `<div style="display:flex;align-items:flex-end;gap:4px;height:64px">${bars}</div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#6d6c69"><span>Kort</span><span>Langt</span></div>` : ''}
      </div>
    </section>`;
        }
        const modeHTML = E.modus && this.ok(E.modus) ? `<section style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
      ${[['tune', 'Modus', opt(this.v(E.modus))], reason ? ['info', 'Status', reason] : ['schedule', 'Neste start', nextTxt || '–']].map(([ic, l, v]) => `<div style="min-width:0;display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:22px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04)"><span class="ms" style="font-size:20px;color:#8e8d89">${ic}</span><span style="display:flex;flex-direction:column;gap:2px;min-width:0"><span style="font-size:11px;color:#8e8d89">${e(l)}</span><span style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(v)}</span></span></div>`).join('')}
    </section>` : '';
        const selects = this.selects(E).map(x => `<section style="display:flex;flex-direction:column;gap:8px">
      ${lbl(x.navn)}
      ${KD.segHTML('sel-' + x.id, x.opts.map(o => [x.id + '|' + o, opt(o)]), x.id + '|' + this.v(x.id), 'selOpt', { small: x.opts.length > 3 })}
    </section>`).join('');
        const sws = [
          E.tidsplan ? swRow(E.tidsplan, 'calendar_month', 'Tidsplan', schedOn ? (nextTxt ? `Neste start ${nextTxt}` : 'Klipper etter tidsplan') : 'Klipper bare når du starter') : '',
          E.fest ? swRow(E.fest, 'celebration', 'Festmodus', this.isOn(E.fest) ? 'Tidsplanen er satt på vent' : 'Pauser tidsplanen midlertidig', C.pink) : '',
          E.las ? swRow(E.las, 'lock', 'Barnesikring', null, C.amber) : '',
          ...this.switches(E, zones).map(id => swRow(id, 'toggle_on', this.shortName(id))),
        ].filter(Boolean);
        const nums = this.numbers(E, zones).map(id => `<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:22px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04)">
      <span style="width:38px;height:38px;border-radius:19px;flex:none;display:grid;place-items:center;background:#2a2a2e;color:#c9c7c2"><span class="ms" style="font-size:20px">${/rain/.test(id) ? 'rainy' : /time|extension/.test(id) ? 'more_time' : 'tune'}</span></span>
      <span style="flex:1;min-width:0;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(this.shortName(id))}</span>
      ${stepper(id, true)}</div>`);
        tabHTML = heightHTML + modeHTML + selects
          + (sws.length ? `<section style="display:flex;flex-direction:column;gap:8px">${lbl('Brytere')}${sws.join('')}</section>` : '')
          + (nums.length ? `<section style="display:flex;flex-direction:column;gap:8px">${lbl('Justeringer')}${nums.join('')}</section>` : '');
        if (!tabHTML.trim()) tabHTML = `<section>${this.empty('tune', 'Ingen innstillinger', 'Fant ingen klippehøyde, modus eller brytere for denne klipperen.')}</section>`;
      }

      if (s.tab === 'info') {
        const life = +cf.kniv_levetid || 200;
        const kpct = knivH != null ? KD.clamp(Math.round((1 - knivH / life) * 100), 0, 100) : null;
        const kc = kpct == null ? G : kpct < 15 ? C.red : kpct < 35 ? C.amber : G;
        const cnt = id => { const x = this.n(id); return x == null ? null : Math.round(x).toLocaleString('nb-NO'); };
        const hrs = id => { const h = this.hours(id); return h == null ? null : `${Math.round(h).toLocaleString('nb-NO')} t`; };
        const km = id => { const x = this.n(id); if (x == null) return null; const u = this.unit(id); const k = u === 'm' ? x / 1000 : u === 'mi' ? x * 1.609 : x; return `${Math.round(k).toLocaleString('nb-NO')} km`; };
        const T = [
          ['content_cut', 'Klippetid', ['total_cutting_time', 'blades_total_on_time', 'total_mowing_time', 'cutting_time_total'], hrs],
          ['schedule', 'Driftstid', ['total_running_time', 'total_worked_time', 'work_time_total', 'total_work_time'], hrs],
          ['battery_charging_full', 'Ladetid', ['total_charging_time'], hrs],
          ['autorenew', 'Ladesykluser', ['number_of_charging_cycles', 'charging_cycles', 'battery_charge_cycles', 'battery_cycles_total', 'battery_cycles', 'charge_cycles'], cnt],
          ['route', 'Kjørt', ['total_drive_distance', 'distance_total', 'total_distance', 'distance'], km],
          ['car_crash', 'Kollisjoner', ['number_of_collisions', 'collisions'], cnt],
          ['travel_explore', 'Søketid', ['total_searching_time'], hrs],
        ].map(([ic, l, alts, f]) => { const id = this.by('sensor', alts); const v = id && this.ok(id) ? f(id) : null; return v ? [ic, l, v, id] : null; }).filter(Boolean).slice(0, 6);
        const errNow = st === 'error' || !!errTxt;
        const errStamp = E.feil ? this.at(E.feil, 'error_timestamp') || this.at(E.feil, 'timestamp') : null;
        tabHTML = `${knivH != null ? `<section style="display:flex;flex-direction:column;gap:8px">
      ${lbl('Kniver', `<span style="font-size:12px;color:${kpct < 35 ? kc : '#6d6c69'};white-space:nowrap">${kpct < 15 ? 'Bør byttes nå' : kpct < 35 ? 'Bytt snart' : 'I god stand'}</span>`)}
      <div style="display:flex;align-items:center;gap:12px;padding:14px;border-radius:24px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04)">
        <span style="width:42px;height:42px;border-radius:21px;flex:none;display:grid;place-items:center;background:${a(kc, 0.14)};color:${kc}"><span class="ms" style="font-size:22px">content_cut</span></span>
        <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:8px">
          <span style="display:flex;justify-content:space-between;gap:8px;font-size:14px"><span style="font-weight:600;white-space:nowrap">Knivbruk</span><span style="font-size:12px;color:#8e8d89;font-variant-numeric:tabular-nums;white-space:nowrap">${Math.round(knivH)} t av ${life} t · ${kpct} % igjen</span></span>
          <span style="height:6px;border-radius:3px;background:#2a2a2d;overflow:hidden"><span style="display:block;width:${kpct}%;height:100%;border-radius:3px;background:${kc};transition:width 1s"></span></span>
        </span>
        ${E.knivReset ? `<button data-on-click="resetBlade" title="Merk som byttet" style="height:32px;padding:0 12px;border-radius:16px;flex:none;background:${kpct < 35 ? kc : '#2a2a2e'};color:${kpct < 35 ? '#161618' : '#e4e2dd'};font-size:12px;font-weight:600;white-space:nowrap">Byttet</button>` : ''}
      </div>
    </section>` : ''}
    ${T.length ? `<section style="display:flex;flex-direction:column;gap:8px">
      ${lbl('Totalt')}
      <div style="display:grid;grid-template-columns:repeat(${T.length === 4 ? 2 : Math.min(3, T.length)},minmax(0,1fr));gap:8px">
        ${T.map(([ic, l, v, id]) => `<button data-on-click="openIt" data-arg="${e(id)}" style="min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:14px;border-radius:22px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04);text-align:left"><span class="ms" style="font-size:20px;color:#8e8d89">${ic}</span><span style="display:flex;flex-direction:column;gap:2px;min-width:0;max-width:100%"><span style="font-size:11px;color:#8e8d89">${e(l)}</span><span style="font-size:15px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(v)}</span></span></button>`).join('')}
      </div>
    </section>` : ''}
    ${E.feil || errNow ? `<section style="display:flex;flex-direction:column;gap:8px">
      ${lbl('Feil')}
      <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:22px;background:${errNow ? a(C.red, 0.10) : '#1c1c1f'};box-shadow:inset 0 0 0 1px ${errNow ? a(C.red, 0.35) : 'rgba(255,255,255,0.04)'}">
        <span style="width:38px;height:38px;border-radius:19px;flex:none;display:grid;place-items:center;background:${errNow ? a(C.red, 0.2) : a(G, 0.14)};color:${errNow ? C.red : G}"><span class="ms" style="font-size:20px;font-variation-settings:'FILL' 1">${errNow ? 'error' : 'check_circle'}</span></span>
        <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(errNow ? errTxt || 'Ukjent feil' : 'Ingen feil')}</span><span style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(errStamp && !isNaN(new Date(errStamp)) ? `${this.dayWord(new Date(errStamp))} ${KD.hm(new Date(errStamp))}` : errNow ? 'Sjekk klipperen' : 'Alt fungerer som det skal')}</span></span>
        ${errNow && E.bekreft ? `<button data-on-click="ctl" data-arg="confirm" style="height:32px;padding:0 12px;border-radius:16px;flex:none;background:${C.red};color:#161618;font-size:12px;font-weight:600;white-space:nowrap">Bekreft</button>` : ''}
      </div>
    </section>` : ''}`;
        if (!tabHTML.trim()) tabHTML = `<section>${this.empty('monitoring', 'Ingen statistikk', 'Klipperen rapporterer ikke knivtid, klippetid eller feil til Home Assistant.')}</section>`;
      }

      if (s.tab === 'map') {
        const maps = this.maps();
        const tr = E.posisjon && this.st(E.posisjon) ? E.posisjon : null;
        const lat = tr ? parseFloat(this.at(tr, 'latitude')) : NaN, lon = tr ? parseFloat(this.at(tr, 'longitude')) : NaN;
        const hasPos = !isNaN(lat) && !isNaN(lon);
        const items = [...maps.map(m => [m.id, m.navn, 'layers']), ...(hasPos ? [['pos', 'Posisjon', 'location_on']] : [])];
        const cur = items.find(x => x[0] === s.map) || items[0];
        let view = '';
        if (cur && cur[0] !== 'pos') {
          const m = maps.find(x => x.id === cur[0]);
          view = `<div data-on-click="openIt" data-arg="${e(m.id)}" style="position:relative;border-radius:26px;overflow:hidden;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05);aspect-ratio:4 / 3;cursor:pointer">
        <img src="${e(m.src)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain">
        <span style="position:absolute;left:12px;bottom:12px;height:28px;padding:0 10px;border-radius:14px;display:inline-flex;align-items:center;gap:6px;background:rgba(20,20,22,0.7);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-size:12px;font-weight:500"><span class="ms" style="font-size:15px">map</span>${e(m.navn)}</span>
      </div>`;
        } else if (cur) {
          // OpenStreetMap-fliser (3×3) med klipperen i midten
          const z = +cf.kart_zoom || 18, nT = 2 ** z;
          const fx = (lon + 180) / 360 * nT, fy = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * nT;
          const tx = Math.floor(fx), ty = Math.floor(fy), ox = (fx - tx) * 256, oy = (fy - ty) * 256;
          let imgs = '';
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) imgs += `<img src="https://tile.openstreetmap.org/${z}/${tx + dx}/${ty + dy}.png" alt="" loading="lazy" onerror="this.style.visibility='hidden'" style="position:absolute;width:256px;height:256px;left:${(dx + 1) * 256}px;top:${(dy + 1) * 256}px">`;
          const acc = this.at(tr, 'gps_accuracy');
          view = `<div data-on-click="openIt" data-arg="${e(tr)}" style="position:relative;border-radius:26px;overflow:hidden;aspect-ratio:4 / 3;cursor:pointer;background:repeating-linear-gradient(135deg, oklch(0.36 0.07 145) 0 14px, oklch(0.39 0.08 145) 14px 28px);box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05)">
        <div style="position:absolute;left:50%;top:50%;width:768px;height:768px;transform:translate(${-(256 + ox)}px, ${-(256 + oy)}px);filter:saturate(0.75) brightness(0.8)">${imgs}</div>
        <span style="position:absolute;left:50%;top:50%;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;background:${a(col, 0.22)};${moving ? 'animation:kdmpulse 1.6s ease-in-out infinite' : ''}"></span>
        <span style="position:absolute;left:50%;top:50%;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:15px;display:grid;place-items:center;background:#f2f1ee;color:#10231a;box-shadow:0 0 0 4px ${a(col, 0.5)}, 0 6px 16px rgba(0,0,0,0.45)"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">grass</span></span>
        <span style="position:absolute;left:12px;bottom:12px;height:28px;padding:0 10px;border-radius:14px;display:inline-flex;align-items:center;gap:6px;background:rgba(20,20,22,0.72);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-size:12px;font-weight:500;font-variant-numeric:tabular-nums"><span class="ms" style="font-size:15px">location_on</span>${lat.toFixed(5)}, ${lon.toFixed(5)}${acc ? ` · ±${Math.round(acc)} m` : ''}</span>
        <span style="position:absolute;right:10px;bottom:6px;font-size:9px;color:rgba(255,255,255,0.55)">© OpenStreetMap</span>
      </div>`;
        }
        tabHTML = cur ? `<section style="display:flex;flex-direction:column;gap:10px">
      ${items.length > 1 ? KD.segHTML('mow-map', items, cur[0], 'pickMap', { small: true }) : ''}
      ${view}
    </section>` : `<section>${this.empty('map', 'Ingen kart', tr ? 'Posisjonen til klipperen er ikke kjent akkurat nå.' : 'Klipperen har verken kartbilde eller posisjon i Home Assistant.')}</section>`;
      }

      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:18px">
  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89"><span>${e(this.navn())}</span></div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>
  ${hero}
  ${actions}
  ${tabs}
  ${tabHTML}
</div>`;
    }
    /** tom tilstand */
    empty(icon, title, text) {
      const e = KD.e;
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:28px 20px;border-radius:24px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04);text-align:center">
      <span style="width:52px;height:52px;border-radius:26px;display:grid;place-items:center;background:${a(G, 0.12)};color:${G}"><span class="ms" style="font-size:26px">${icon}</span></span>
      <span style="font-size:15px;font-weight:600">${e(title)}</span><span style="font-size:13px;color:#8e8d89;max-width:300px;line-height:1.4">${e(text)}</span></div>`;
    }
    /** Bryter (spor + knott) */
    sw(on) { return `<span style="position:relative;width:46px;height:28px;border-radius:14px;flex:none;background:${on ? 'oklch(0.72 0.14 150)' : '#3a3a3d'};transition:background .2s"><span style="position:absolute;top:3px;left:${on ? 21 : 3}px;width:22px;height:22px;border-radius:11px;background:#f4f3ef;box-shadow:0 2px 6px rgba(0,0,0,0.3);transition:left .25s cubic-bezier(.34,1.4,.64,1)"></span></span>`; }
    /** «i dag» / «i morgen» / «i går» / «mandag» / «12.9.» (kort: «man.») */
    dayWord(d, short) {
      const t0 = new Date(); t0.setHours(0, 0, 0, 0);
      const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - t0) / 86400e3);
      if (diff === 0) return 'i dag';
      if (diff === 1) return 'i morgen';
      if (diff === -1) return 'i går';
      if (Math.abs(diff) < 7) return d.toLocaleDateString('nb-NO', { weekday: short ? 'short' : 'long' });
      return `${d.getDate()}.${d.getMonth() + 1}.`;
    }
  }

  KD.define('kd-gressklipper-card', KDGressklipperCard, 'KD Gressklipper', 'Robotgressklipper (lawn_mower) – soner, klippehøyde, kniver og kart i samme stil som støvsugeren');
  KD.sheet('mower', 'kd-gressklipper-card');
})();
