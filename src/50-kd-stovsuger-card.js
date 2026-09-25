/*
 * kd-stovsuger-card – pikselkopi av Claude Design «Støvsuger» (Sir Sweeps / «Rolf»), med ekte data.
 *
 *   type: custom:kd-stovsuger-card        # alt annet er valgfritt («auto config»)
 *   entity: vacuum.sir_sweeps_a_lot
 *   rom:   [{ entity: input_boolean.x, navn: Soverom, ikon: bed, areal: 14, kart: [x, y, b, h] }, …]
 *   soner: [{ entity: script.rolf_zone_x, navn: Spisebord lite }, …]
 * Sensorer for fremdrift, siste runde, totaler, slitedeler, mopp og stille timer finnes automatisk
 * ut fra robotens navn (Roborock-navngiving: sensor.<robot>_cleaning_progress, _last_clean_end … ).
 */
(() => {
  const KD = window.KD;
  const C = KD.C, a = KD.a, PINK = KD.PINK;

  // [nøkkel i designet, tekst] → fan_speed-verdier som godtas (første som finnes i fan_speed_list brukes)
  const SUG = [['quiet', 'Stille', ['quiet', 'silent', 'low']], ['std', 'Standard', ['balanced', 'standard', 'medium', 'normal']],
    ['turbo', 'Turbo', ['turbo', 'strong', 'high']], ['max', 'Maks', ['max', 'max_plus', 'maximum', 'full']]];

  class KDStovsugerCard extends KD.KDSheet {
    static head = ['cleaning_services', 'Støvsuger', 'Sir Sweeps'];
    static defaults = {
      entity: 'vacuum.sir_sweeps_a_lot',
      batteri: 'sensor.sir_sweeps_a_lot_battery',
      lader: 'binary_sensor.sir_sweeps_a_lot_charging',
      vannmangel: 'binary_sensor.sir_sweeps_a_lot_water_shortage',
      vanntank: 'binary_sensor.sir_sweeps_a_lot_water_box_attached',
      start: 'script.stovsuger_start',
      start_rom: 'script.start_sir_sweeps_a_lot_room_select',
      pause: 'script.stovsuger_pause',
      hjem: 'script.stovsuger_retuner_hjem',
      tom: 'script.rolf_empty',
      areal_totalt: 'sensor.sir_sweeps_a_lot_total_cleaning_area',
      tid_totalt: 'sensor.sir_sweeps_a_lot_total_cleaning_time',
      rom: [
        { entity: 'input_boolean.sir_sweeps_a_lot_sebsatian_soverom', navn: 'Soverom', ikon: 'bed', kart: [4, 4, 44, 34] },
        { entity: 'input_boolean.sir_sweeps_a_lot_mamma_soverom', navn: 'Mamma', ikon: 'bed', kart: [52, 4, 44, 26] },
        { entity: 'input_boolean.sir_sweeps_a_lot_pappa_kontor', navn: 'Kontor', ikon: 'desk', kart: [52, 34, 44, 26] },
        { entity: 'input_boolean.sir_sweeps_a_lot_pappa_soverom', navn: 'Pappa', ikon: 'single_bed', kart: [4, 42, 44, 34] },
        { entity: 'input_boolean.sir_sweeps_a_lot_trappegang', navn: 'Trapp', ikon: 'stairs', kart: [52, 64, 44, 14] },
        { navn: 'Gang', ikon: 'door_front', kart: [4, 80, 92, 16] },
      ],
      soner: [
        { entity: 'script.rolf_zone_stuebord', navn: 'Spisebord lite' },
        { entity: 'script.rolf_zone_stuebord_mye', navn: 'Spisebord mye' },
        { entity: 'script.rolf_zone_stue_uten_spisebord', navn: 'Stue uten spisebord' },
        { entity: 'script.rolf_zone_teppe', navn: 'Teppe stue' },
        { entity: 'script.rolf_zone_kjokkenbord', navn: 'Kjøkkenbord' },
      ],
      // slitedeler: levetid i timer (Roborock-standard). entity/reset finnes automatisk når de ikke er satt.
      deler: [
        { navn: 'Hovedbørste', nokkel: 'main_brush', levetid: 300 },
        { navn: 'Sidebørste', nokkel: 'side_brush', levetid: 200 },
        { navn: 'Filter', nokkel: 'filter', levetid: 150 },
        { navn: 'Sensorer', nokkel: 'sensor', levetid: 30 },
      ],
      mopp_pa: 'moderate',
    };
    static sheetCss = `.kd-vac-ctl:active{transform:scale(0.95)}`;

    constructor() { super(); this.state = { tab: 'clean', zone: null }; }

    /* ----- oppdagelse ----- */
    get base() { return String(this.config.entity || '').split('.')[1] || 'sir_sweeps_a_lot'; }
    /** config-nøkkel hvis satt, ellers første kandidat som finnes */
    pick(key, ...cands) {
      if (this.config[key]) return this.config[key];
      for (const c of cands) { if (c instanceof RegExp) { const f = this.find(c)[0]; if (f) return f; } else if (this.st(c)) return c; }
      return null;
    }
    ents() {
      const b = this.base;
      return {
        fremdrift: this.pick('fremdrift', `sensor.${b}_cleaning_progress`, `sensor.${b}_clean_percent`, `sensor.${b}_progress`),
        tid: this.pick('rengjoringstid', `sensor.${b}_cleaning_time`),
        areal: this.pick('areal', `sensor.${b}_cleaning_area`, `sensor.${b}_last_clean_area`),
        slutt: this.pick('siste_runde', `sensor.${b}_last_clean_end`, `sensor.${b}_last_clean_begin`),
        turer: this.pick('turer', `sensor.${b}_total_cleaning_count`, `sensor.${b}_cleaning_count`),
        feil: this.pick('feil', `sensor.${b}_vacuum_error`, `sensor.${b}_last_error`),
        mopp: this.pick('mopp', `select.${b}_mop_intensity`, `select.${b}_water_box_mode`, `select.${b}_mop_mode`),
        stille: this.pick('stille', `switch.${b}_do_not_disturb`, `switch.${b}_dnd`),
        stille_fra: this.pick('stille_fra', `time.${b}_do_not_disturb_begin`),
        stille_til: this.pick('stille_til', `time.${b}_do_not_disturb_end`),
      };
    }
    rooms() {
      const b = this.base;
      const list = (Array.isArray(this.config.rom) ? this.config.rom : []).map(r => typeof r === 'string' ? { entity: r } : r);
      const known = new Set(list.map(r => r.entity).filter(Boolean));
      // flere rom-brytere med robotens navn oppdages automatisk
      for (const id of this.find(new RegExp(`^input_boolean\\.${b}_`))) if (!known.has(id)) list.push({ entity: id });
      return list.filter(r => !r.entity || this.st(r.entity)).map(r => ({
        ...r, navn: r.navn || (r.entity ? this.fname(r.entity).replace(/^sir sweeps a lot\s*/i, '') : ''), ikon: r.ikon || 'bed',
        on: r.entity ? this.v(r.entity) === 'on' : false,
      }));
    }
    zones() {
      const list = (Array.isArray(this.config.soner) ? this.config.soner : []).map(z => typeof z === 'string' ? { entity: z } : z);
      const known = new Set(list.map(z => z.entity));
      for (const id of this.find(/^script\.rolf_zone_/)) if (!known.has(id)) list.push({ entity: id });
      return list.filter(z => this.st(z.entity)).map(z => ({ ...z, navn: z.navn || this.fname(z.entity) }));
    }
    parts() {
      const b = this.base;
      return (Array.isArray(this.config.deler) ? this.config.deler : []).map(p => {
        const k = p.nokkel || '';
        const id = p.entity || this.pick('_', `sensor.${b}_${k}_time_left`, `sensor.${b}_${k}_left`);
        if (!id || !this.ok(id)) return null;
        let left = this.n(id); const u = this.unit(id);
        if (u === 's') left /= 3600; else if (u === 'min') left /= 60; else if (u === 'd') left *= 24;
        const life = p.levetid || 100;
        const reset = p.reset || this.find(new RegExp(`^button\\.${b}_reset_.*${k.replace('filter', '(air_)?filter')}`))[0] || null;
        return { navn: p.navn, id, left, life, pct: KD.clamp(Math.round(left / life * 100), 0, 100), reset };
      }).filter(Boolean);
    }
    /** total rengjøringstid → timer (støtter «HH:MM:SS», s, min, h) */
    hours(id) {
      const s = this.st(id); if (!s || KD.BAD.has(s.state)) return null;
      if (String(s.state).includes(':')) { const [h, m] = s.state.split(':').map(Number); return h + (m || 0) / 60; }
      const x = parseFloat(s.state); if (isNaN(x)) return null;
      const u = s.attributes.unit_of_measurement;
      return u === 's' ? x / 3600 : u === 'min' ? x / 60 : u === 'd' ? x * 24 : x;
    }

    /* ----- handlinger ----- */
    tab(e, k) { this.setState({ tab: k }); }
    toggleRoom(e, id) { if (!id) return; this.setState({ zone: null }); this.call('input_boolean', 'toggle', { entity_id: id }); }
    pickZone(e, id) {
      const on = this.state.zone === id;
      this.setState({ zone: on ? null : id });
      if (!on) for (const r of this.rooms()) if (r.on && r.entity) this.call('input_boolean', 'turn_off', { entity_id: r.entity });
    }
    runScript(id, fallback) {
      if (id && this.st(id)) return this.call('script', 'turn_on', { entity_id: id });
      if (fallback) return this.call('vacuum', fallback, { entity_id: this.config.entity });
    }
    start() {
      const st = this.status();
      if (st === 'paused') return this.call('vacuum', 'start', { entity_id: this.config.entity });
      if (this.state.zone && this.st(this.state.zone)) { this._lastZone = this.state.zone; return this.call('script', 'turn_on', { entity_id: this.state.zone }); }
      this._lastZone = null;
      if (this.rooms().some(r => r.on)) return this.runScript(this.config.start_rom, 'start');
      return this.runScript(this.config.start, 'start');
    }
    pauseIt() { this.runScript(this.config.pause, 'pause'); }
    dock() { this.runScript(this.config.hjem, 'return_to_base'); }
    locate() { this.call('vacuum', 'locate', { entity_id: this.config.entity }); }
    empty() { if (this.config.tom && this.st(this.config.tom)) this.call('script', 'turn_on', { entity_id: this.config.tom }); else this.more(this.config.entity); }
    ctl(e, k) { ({ start: () => this.start(), pause: () => this.pauseIt(), dock: () => this.dock(), locate: () => this.locate(), empty: () => this.empty() })[k](); }
    main() { this.status() === 'cleaning' ? this.pauseIt() : this.start(); }
    fan(e, v) { if (v) this.call('vacuum', 'set_fan_speed', { entity_id: this.config.entity, fan_speed: v }); }
    toggleOpt(e, k) {
      const E = this.ents();
      if (k === 'mop' && E.mopp) {
        const on = !['off', 'unknown', 'unavailable', ''].includes(this.v(E.mopp));
        const opts = this.at(E.mopp, 'options', []);
        const target = on ? 'off' : (opts.includes(this.config.mopp_pa) ? this.config.mopp_pa : opts.find(o => o !== 'off') || this.config.mopp_pa);
        this.call('select', 'select_option', { entity_id: E.mopp, option: target });
      } else if (k === 'quiet' && E.stille) this.call('switch', 'toggle', { entity_id: E.stille });
    }
    resetPart(e, id) { if (id) this.press(id); }
    openMore() { this.more(this.config.entity); }

    status() {
      const s = this.v(this.config.entity);
      if (s === 'cleaning') return 'cleaning';
      if (s === 'paused') return 'paused';
      if (s === 'returning') return 'returning';
      if (s === 'error') return 'error';
      if (s === 'idle') return 'idle';
      if (!this.ok(this.config.entity)) return 'unavailable';
      return 'docked';
    }

    body() {
      const s = this.state, cf = this.config, E = this.ents(), st = this.status();
      const vac = cf.entity;
      let bRaw = this.n(cf.batteri); if (bRaw == null) bRaw = parseFloat(this.at(vac, 'battery_level'));
      const hasB = bRaw != null && !isNaN(bRaw);
      const b = hasB ? Math.round(bRaw) : 0;
      const n = 24, filled = Math.round(b / 100 * n);
      const col = st === 'cleaning' ? C.green : st === 'paused' ? C.amber : st === 'returning' ? C.blue : st === 'error' || st === 'unavailable' ? C.red : C.green;
      const rooms = this.rooms(), zones = this.zones();
      const sel = rooms.filter(r => r.on && r.entity);
      const zone = zones.find(z => z.entity === s.zone) || null;
      const runZone = zones.find(z => z.entity === this._lastZone) || null;
      const target = runZone ? [runZone.navn] : sel.length ? sel.map(r => r.navn) : ['hele huset'];
      const charging = this.st(cf.lader) ? this.isOn(cf.lader) : (hasB && b < 100);
      const labels = { docked: charging ? 'Lader i dokken' : 'I dokken', cleaning: 'Støvsuger', paused: 'Pause', returning: 'På vei hjem', idle: 'Klar', error: 'Feil', unavailable: 'Utilgjengelig' };
      const errTxt = E.feil && this.ok(E.feil) && !/^(none|no.?error|ingen|0)$/i.test(this.v(E.feil)) ? this.v(E.feil) : this.at(vac, 'error', '');
      const headline = st === 'cleaning' ? `Støvsuger ${target.join(', ').toLowerCase()}` : st === 'paused' ? 'Satt på pause' : st === 'returning' ? 'Ferdig, kjører hjem'
        : st === 'error' ? 'Trenger hjelp' : st === 'unavailable' ? 'Ikke tilgjengelig' : 'Klar til å støvsuge';
      const prog = E.fremdrift ? this.n(E.fremdrift) : null;
      // underlinje
      let subline = '';
      if (st === 'cleaning') {
        const mins = this.n(E.tid); const tidU = E.tid ? this.unit(E.tid) : '';
        const el = mins == null ? null : tidU === 's' ? mins / 60 : tidU === 'h' ? mins * 60 : mins;
        if (prog != null) {
          const rest = el != null && prog > 0 ? Math.max(1, Math.round(el * (100 - prog) / prog)) : null;
          subline = `${Math.round(prog)} % ferdig` + (rest != null ? ` · ca. ${rest} min igjen` : '');
        } else {
          subline = [el != null ? `${Math.round(el)} min` : '', this.ok(E.areal) ? `${Math.round(this.n(E.areal))} m²` : ''].filter(Boolean).join(' · ') || labels.cleaning;
        }
      } else if (st === 'error' && errTxt) subline = String(errTxt);
      else if (this.isOn(cf.vannmangel)) subline = 'Vanntanken er tom';
      else {
        const endS = E.slutt ? this.v(E.slutt) : '';
        const end = endS && !KD.BAD.has(endS) ? new Date(endS) : null;
        const parts = [];
        if (end && !isNaN(end)) parts.push(`Sist støvsuget ${this.dayWord(end)} ${KD.hm(end)}`);
        if (this.ok(E.areal)) parts.push(`${Math.round(this.n(E.areal))} m²`);
        subline = parts.join(' · ') || '–';
      }
      const tab = (k, l) => ({ k, label: l, style: { height: 38, borderRadius: 16, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', background: s.tab === k ? PINK : 'transparent', color: s.tab === k ? '#2a1720' : '#a9a7a2' } });
      const sw = (on) => ({ track: { position: 'relative', width: 46, height: 28, borderRadius: 14, flex: 'none', background: on ? 'oklch(0.72 0.14 150)' : '#3a3a3d', transition: 'background .2s' }, knob: { position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: 11, background: '#f4f3ef', transition: 'left .2s' } });
      const rpRoom = sel.find(r => r.kart) || rooms.find(r => r.kart);
      const rp = rpRoom ? rpRoom.kart : [4, 4, 44, 34];
      const t = (prog || 0) / 100;
      const moving = st === 'cleaning' || st === 'paused';

      const ring = Array.from({ length: n }, (_, i) => ({ position: 'absolute', left: 'calc(50% - 4px)', top: 'calc(50% - 14px)', width: 8, height: 28, borderRadius: 4, transform: `rotate(${i * 15}deg) translateY(-102px)`, background: i < filled ? col : '#2a2a2d', boxShadow: i < filled && st === 'cleaning' ? `0 0 12px ${a(col, 0.6)}` : 'none', transition: 'background .4s' }));
      const coreIcon = { fontSize: 28, color: col, fontVariationSettings: "'FILL' 1" };
      const coreIconName = st === 'docked' ? 'battery_charging_full' : st === 'error' ? 'error' : 'robot_2';
      const tabs = [tab('clean', 'Renhold'), tab('control', 'Kontroll'), tab('info', 'Info'), tab('map', 'Kart')];
      const selMeta = sel.length ? `${sel.length} valgt` : 'Ingen valgt · hele huset';
      const roomCards = rooms.filter(r => r.entity).map(r => {
        const on = r.on;
        return { ...r, sub: r.areal != null ? `${r.areal} m²` : on ? 'Valgt' : 'Ikke valgt',
          style: { position: 'relative', height: 104, borderRadius: 22, padding: 16, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start', background: on ? a(C.green, 0.14) : '#1c1c1f', boxShadow: on ? `inset 0 0 0 1px ${a(C.green, 0.45)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)', transition: 'background .2s' },
          iconStyle: { fontSize: 24, color: on ? C.green : '#a9a7a2', fontVariationSettings: `'FILL' ${on ? 1 : 0}` },
          check: { position: 'absolute', right: 14, top: 14, fontSize: 20, color: C.green, opacity: on ? 1 : 0, fontVariationSettings: "'FILL' 1", transition: 'opacity .2s' } };
      });
      const zoneBtns = zones.map(z => {
        const on = s.zone === z.entity;
        return { ...z, style: { flex: 'none', height: 40, padding: '0 14px 0 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', background: on ? a(C.green, 0.14) : '#1c1c1f', color: on ? '#f2f1ee' : '#c9c7c2', boxShadow: on ? `inset 0 0 0 1px ${a(C.green, 0.45)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)' } };
      });
      const controls = [
        { icon: st === 'cleaning' ? 'pause' : 'play_arrow', label: st === 'cleaning' ? 'Pause' : 'Start', k: st === 'cleaning' ? 'pause' : 'start' },
        { icon: 'home', label: 'Dokk', k: 'dock' },
        { icon: 'location_searching', label: 'Finn', k: 'locate' },
        { icon: 'delete', label: 'Tøm', k: 'empty' },
      ];
      const fanNow = String(this.at(vac, 'fan_speed', '') || '').toLowerCase();
      const fanList = (this.at(vac, 'fan_speed_list', []) || []).map(String);
      const suction = SUG.map(([k, l, vals]) => {
        const val = fanList.find(f => vals.includes(f.toLowerCase())) || vals[0];
        const on = vals.includes(fanNow);
        return { label: l, val, style: { height: 38, borderRadius: 14, fontSize: 13, fontWeight: 500, background: on ? '#f4f3ef' : 'transparent', color: on ? '#1a1a1c' : '#a9a7a2' } };
      });
      const mopOn = E.mopp ? !['off', 'unknown', 'unavailable', ''].includes(this.v(E.mopp)) : false;
      const mopSub = this.isOn(cf.vannmangel) ? 'Vanntanken er tom' : (this.st(cf.vanntank) && this.v(cf.vanntank) === 'off') ? 'Vanntanken er ikke satt i' : 'Mopper etter støvsuging';
      const tm = id => { const v = this.v(id); return /^\d{1,2}:\d{2}/.test(v) ? v.slice(0, 5) : null; };
      const qFrom = tm(E.stille_fra), qTo = tm(E.stille_til);
      const toggleDefs = [];
      if (E.mopp) toggleDefs.push(['water_drop', 'Mopp', mopSub, 'mop', mopOn]);
      if (E.stille) toggleDefs.push(['do_not_disturb_on', 'Stille timer', qFrom && qTo ? `${qFrom}–${qTo}` : this.isOn(E.stille) ? 'På' : 'Av', 'quiet', this.isOn(E.stille)]);
      const toggles = toggleDefs.map(([icon, title, sub, k, on], i) => ({ icon, title, sub, k, ...sw(on),
        row: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px', width: '100%', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' } }));
      const hrs = this.hours(cf.tid_totalt);
      const stats = [['Totalt', hrs == null ? '–' : `${Math.round(hrs).toLocaleString('nb-NO')} t`],
        ['Areal', this.ok(cf.areal_totalt) ? `${Math.round(this.n(cf.areal_totalt)).toLocaleString('nb-NO')} m²` : '–'],
        ['Turer', this.ok(E.turer) ? Math.round(this.n(E.turer)).toLocaleString('nb-NO') : '–']].map(([label, v]) => ({ label, v }));
      const parts = this.parts().map((p, i) => {
        const low = p.pct < 20;
        return { ...p, low, val: `${p.pct} % · ${Math.round(p.left)} t`,
          row: { display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 4px', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' },
          valStyle: { fontSize: 12, color: low ? C.amber : '#8e8d89', fontVariantNumeric: 'tabular-nums' },
          bar: { width: `${p.pct}%`, height: '100%', borderRadius: 3, background: low ? C.amber : C.green } };
      });
      const mapRooms = rooms.filter(r => Array.isArray(r.kart)).map(r => {
        const [x, y, w, h] = r.kart, on = r.on;
        return { ...r, style: { position: 'absolute', left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`, borderRadius: 10, display: 'grid', placeItems: 'center', background: on ? a(C.green, 0.3) : '#2a2a2d', boxShadow: on ? `inset 0 0 0 1.5px ${C.green}` : 'none', color: on ? '#f2f1ee' : '#a9a7a2', transition: 'background .2s' } };
      });
      const robot = { position: 'absolute', left: `calc(${moving ? rp[0] + rp[2] * (0.15 + 0.7 * ((t * 5) % 1)) : 9}% - 9px)`, top: `calc(${moving ? rp[1] + rp[3] * (0.2 + 0.6 * t) : 82}% - 9px)`, width: 18, height: 18, borderRadius: 9, background: '#f2f1ee', boxShadow: `0 0 0 4px ${a(col, 0.35)}`, transition: 'left .8s linear, top .8s linear' };
      const main = st === 'cleaning'
        ? { icon: 'pause', label: 'Pause', style: { height: 64, borderRadius: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 16, fontWeight: 600, background: a(C.amber, 0.16), color: '#f2f1ee', boxShadow: `inset 0 0 0 1px ${a(C.amber, 0.45)}` } }
        : { icon: 'play_arrow', label: st === 'paused' ? 'Fortsett' : zone ? `Støvsug ${zone.navn.toLowerCase()}` : sel.length ? `Støvsug ${sel.length} rom` : 'Støvsug alt', style: { height: 64, borderRadius: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 16, fontWeight: 600, background: C.green, color: '#10231a' } };
      const e = KD.e, S = KD.S;

      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:22px">
  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89"><span>${e(cf.navn || 'Sir Sweeps')}</span></div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section style="display:flex;flex-direction:column;align-items:center;gap:18px">
    <div data-on-click="openMore" style="position:relative;width:240px;height:240px;cursor:pointer">
      ${ring.map(r => `<div style="${S(r)}"></div>`).join('')}
      <div style="position:absolute;inset:40px;border-radius:50%;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">
        <span class="ms" style="${S(coreIcon)}"><span>${e(coreIconName)}</span></span>
        <div style="font-size:34px;font-weight:500;letter-spacing:-0.03em;line-height:1;font-variant-numeric:tabular-nums"><span>${hasB ? b : '–'}</span><span style="font-size:14px;color:#8e8d89;font-weight:400"> %</span></div>
        <div style="font-size:12px;color:#8e8d89"><span>${e(labels[st])}</span></div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
      <div style="font-size:24px;font-weight:500;letter-spacing:-0.015em"><span>${e(headline)}</span></div>
      <div style="font-size:14px;color:#8e8d89"><span>${e(subline)}</span></div>
    </div>
  </section>

  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:2px;padding:4px;border-radius:20px;background:#1c1c1f">
    ${tabs.map(t => `<button data-on-click="tab" data-arg="${t.k}" style="${S(t.style)}"><span>${e(t.label)}</span></button>`).join('')}
  </div>

  ${s.tab === 'clean' ? `
    <section style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;justify-content:space-between;padding:0 4px">
        <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Rom</div>
        <div style="font-size:12px;color:#6d6c69"><span>${e(selMeta)}</span></div>
      </div>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
        ${roomCards.map(r => `
          <button data-on-click="toggleRoom" data-arg="${e(r.entity)}" style="${S(r.style)}">
            <span class="ms" style="${S(r.iconStyle)}"><span>${e(r.ikon)}</span></span>
            <div style="display:flex;flex-direction:column;gap:2px;align-items:flex-start">
              <span style="font-size:15px;font-weight:500"><span>${e(r.navn)}</span></span>
              <span style="font-size:12px;color:#8e8d89"><span>${e(r.sub)}</span></span>
            </div>
            <span class="ms" style="${S(r.check)}">check_circle</span>
          </button>`).join('')}
      </div>
    </section>
    ${zoneBtns.length ? `<section style="display:flex;flex-direction:column;gap:8px">
      <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:0 4px">Soner</div>
      <div data-hscroll="1" style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 calc(-1 * var(--kd-kant,10px));padding:0 var(--kd-kant,10px)">
        ${zoneBtns.map(z => `
          <button data-on-click="pickZone" data-arg="${e(z.entity)}" style="${S(z.style)}"><span class="ms" style="font-size:17px"><span>${e(z.ikon || 'table_restaurant')}</span></span><span>${e(z.navn)}</span></button>`).join('')}
      </div>
    </section>` : ''}` : ''}

  ${s.tab === 'control' ? `
    <section style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
      ${controls.map(c => `
        <button class="kd-vac-ctl" data-on-click="ctl" data-arg="${c.k}" style="height:76px;border-radius:20px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px">
          <span class="ms" style="font-size:24px;font-variation-settings:'FILL' 1"><span>${e(c.icon)}</span></span>
          <span style="font-size:12px;font-weight:500;white-space:nowrap"><span>${e(c.label)}</span></span>
        </button>`).join('')}
    </section>
    <section style="display:flex;flex-direction:column;gap:8px">
      <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:0 4px">Sugestyrke</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:2px;padding:4px;border-radius:18px;background:#1c1c1f">
        ${suction.map(p => `<button data-on-click="fan" data-arg="${e(p.val)}" style="${S(p.style)}"><span>${e(p.label)}</span></button>`).join('')}
      </div>
    </section>
    ${toggles.length ? `<section style="display:flex;flex-direction:column">
      ${toggles.map(t => `
        <button data-on-click="toggleOpt" data-arg="${t.k}" style="${S(t.row)}">
          <span class="ms" style="font-size:22px;color:#a9a7a2;width:28px"><span>${e(t.icon)}</span></span>
          <div style="flex:1;display:flex;flex-direction:column;gap:2px;text-align:left">
            <span style="font-size:14px;font-weight:500"><span>${e(t.title)}</span></span>
            <span style="font-size:12px;color:#8e8d89"><span>${e(t.sub)}</span></span>
          </div>
          <span style="${S(t.track)}"><span style="${S(t.knob)}"></span></span>
        </button>`).join('')}
    </section>` : ''}` : ''}

  ${s.tab === 'info' ? `
    <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
      ${stats.map(t => `
        <div style="display:flex;flex-direction:column;gap:4px;padding:12px 14px;border-radius:18px;background:#1c1c1f">
          <div style="font-size:11px;color:#8e8d89;white-space:nowrap"><span>${e(t.label)}</span></div>
          <div style="font-size:17px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap"><span>${e(t.v)}</span></div>
        </div>`).join('')}
    </section>
    ${parts.length ? `<section style="display:flex;flex-direction:column;gap:2px">
      <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:0 4px 8px">Slitedeler</div>
      ${parts.map(p => `
        <div style="${S(p.row)}">
          <div style="display:flex;justify-content:space-between;gap:10px;font-size:14px">
            <span style="font-weight:500"><span>${e(p.navn)}</span></span>
            <span style="${S(p.valStyle)}"><span>${e(p.val)}</span></span>
          </div>
          <div style="height:5px;border-radius:3px;background:#1f1f22;overflow:hidden"><div style="${S(p.bar)}"></div></div>
          ${p.low && p.reset ? `<button data-on-click="resetPart" data-arg="${e(p.reset)}" style="align-self:flex-start;height:30px;padding:0 12px;border-radius:15px;background:oklch(0.82 0.12 75);color:#161618;font-size:12px;font-weight:600">Merk som byttet</button>` : ''}
        </div>`).join('')}
    </section>` : ''}` : ''}

  ${s.tab === 'map' ? `
    <section style="position:relative;height:300px;border-radius:24px;background:#1c1c1f;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04)">
      ${mapRooms.map(m => `
        <button data-on-click="toggleRoom" data-arg="${e(m.entity || '')}" style="${S(m.style)}"><span style="font-size:11px;font-weight:500"><span>${e(m.navn)}</span></span></button>`).join('')}
      <span style="position:absolute;left:8%;top:84%;width:18px;height:12px;border-radius:4px;background:#48474a"></span>
      <span style="${S(robot)}"></span>
    </section>
    <div style="font-size:12px;color:#6d6c69;text-align:center">Trykk på et rom for å velge det</div>` : ''}

  <button data-on-click="main" style="${S(main.style)}"><span class="ms" style="font-size:24px;font-variation-settings:'FILL' 1"><span>${e(main.icon)}</span></span><span>${e(main.label)}</span></button>
</div>`;
    }
    /** «i dag» / «i går» / «mandag» / «12.9.» */
    dayWord(d) {
      const t0 = new Date(); t0.setHours(0, 0, 0, 0);
      const diff = Math.round((t0 - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400e3);
      if (diff <= 0) return 'i dag';
      if (diff === 1) return 'i går';
      if (diff < 7) return d.toLocaleDateString('nb-NO', { weekday: 'long' });
      return `${d.getDate()}.${d.getMonth() + 1}.`;
    }
  }

  KD.define('kd-stovsuger-card', KDStovsugerCard, 'KD Støvsuger', 'Robotstøvsuger (Sir Sweeps) – pikselkopi av Claude Design');
  KD.sheet('vac', 'kd-stovsuger-card');
})();
