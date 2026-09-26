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
  // norske navn på valg i select-entiteter (moppeintensitet, moppemodus, rengjøringsmodus …)
  const OPT = { off: 'Av', on: 'På', mild: 'Mild', low: 'Lav', slight: 'Lav', moderate: 'Middels', medium: 'Middels', middle: 'Middels', intense: 'Intens', high: 'Høy',
    standard: 'Standard', normal: 'Normal', deep: 'Dyp', deep_plus: 'Dyp+', fast: 'Rask', custom: 'Egen', custom_water_flow: 'Egen', smart_mode: 'Smart', extreme: 'Ekstrem',
    sweeping: 'Støvsug', mopping: 'Mopp', sweeping_and_mopping: 'Begge', mopping_after_sweeping: 'Etter', vacuum: 'Støvsug', mop: 'Mopp', vacuum_and_mop: 'Begge',
    quiet: 'Stille', silent: 'Stille', balanced: 'Normal', turbo: 'Turbo', max: 'Maks', strong: 'Sterk' };
  const SNAVN = { mop_intensity: 'Vannmengde', water_box_mode: 'Vannmengde', water_level: 'Vannmengde', water_volume: 'Vannmengde', mop_mode: 'Moppemodus', mop_route: 'Moppemodus',
    cleaning_mode: 'Rengjøringsmodus', clean_mode: 'Rengjøringsmodus', suction_level: 'Sugenivå', mop_pad_humidity: 'Moppefukt' };

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
    static sheetCss = `.kd-vac-ctl:active{transform:scale(0.96)}
@keyframes kdvspin{to{transform:rotate(360deg)}}
@keyframes kdvpulse{0%,100%{opacity:1}50%{opacity:.35}}`;

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
        rom_na: this.pick('rom_na', `sensor.${b}_current_room`, `sensor.${b}_room`),
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
    /** select-entiteter for modus (moppeintensitet/-modus, rengjøringsmodus …) – config `valg: [select.x]` legger til egne */
    selects() {
      const b = this.base, E = this.ents();
      const ids = [E.mopp, ...(Array.isArray(this.config.valg) ? this.config.valg : []), ...Object.keys(SNAVN).map(k => `select.${b}_${k}`)];
      return [...new Set(ids.filter(Boolean))].filter(id => this.ok(id)).map(id => {
        const k = id.slice(`select.${b}_`.length);
        return { id, navn: SNAVN[k] || this.fname(id).replace(/^sir sweeps a lot\s*/i, ''), opts: (this.at(id, 'options', []) || []).map(String) };
      }).filter(x => x.opts.length > 1 && x.opts.length <= 7);
    }
    /** kartbilder: image./camera.-entiteter med robotens navn som har et bilde */
    maps() {
      const b = this.base;
      const ids = [...(Array.isArray(this.config.kart) ? this.config.kart : this.config.kart ? [this.config.kart] : []), ...this.find(new RegExp(`^(image|camera)\\.${b}_`))];
      return [...new Set(ids)].filter(id => this.ok(id) && this.at(id, 'entity_picture')).map(id => ({
        id, src: this.at(id, 'entity_picture'), navn: this.fname(id).replace(/^sir sweeps a lot\s*/i, '').replace(/_/g, ' ') || 'Kart' }));
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
    clearRooms() { this.setState({ zone: null }); for (const r of this.rooms()) if (r.on && r.entity) this.call('input_boolean', 'turn_off', { entity_id: r.entity }); }
    selOpt(e, arg) { const i = String(arg).lastIndexOf('|'); if (i > 0) this.call('select', 'select_option', { entity_id: arg.slice(0, i), option: arg.slice(i + 1) }); }
    pickMap(e, id) { this.setState({ map: id }); }
    openMap(e, id) { this.more(id); }
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
      const s = this.state, cf = this.config, E = this.ents(), st = this.status(), e = KD.e, S = KD.S;
      const vac = cf.entity;
      let bRaw = this.n(cf.batteri); if (bRaw == null) bRaw = parseFloat(this.at(vac, 'battery_level'));
      const hasB = bRaw != null && !isNaN(bRaw);
      const b = hasB ? Math.round(bRaw) : 0;
      const col = st === 'cleaning' ? C.green : st === 'paused' ? C.amber : st === 'returning' ? C.blue : st === 'error' || st === 'unavailable' ? C.red : C.green;
      const rooms = this.rooms(), zones = this.zones();
      const sel = rooms.filter(r => r.on && r.entity);
      const zone = zones.find(z => z.entity === s.zone) || null;
      const runZone = zones.find(z => z.entity === this._lastZone) || null;
      const target = runZone ? [runZone.navn] : sel.length ? sel.map(r => r.navn) : ['hele huset'];
      const charging = this.st(cf.lader) ? this.isOn(cf.lader) : (hasB && b < 100);
      const labels = { docked: charging ? 'Lader i dokken' : 'I dokken', cleaning: 'Støvsuger', paused: 'Pause', returning: 'På vei hjem', idle: 'Klar', error: 'Feil', unavailable: 'Utilgjengelig' };
      const errTxt = E.feil && this.ok(E.feil) && !/^(none|no.?error|ingen|0)$/i.test(this.v(E.feil)) ? this.v(E.feil) : this.at(vac, 'error', '');
      const curRoom = E.rom_na && this.ok(E.rom_na) ? String(this.v(E.rom_na)) : null;
      const headline = st === 'cleaning' ? (curRoom ? `Støvsuger ${curRoom.toLowerCase()}` : `Støvsuger ${target.join(', ').toLowerCase()}`) : st === 'paused' ? 'Satt på pause' : st === 'returning' ? 'Ferdig, kjører hjem'
        : st === 'error' ? 'Trenger hjelp' : st === 'unavailable' ? 'Ikke tilgjengelig' : 'Klar til å støvsuge';
      const prog = E.fremdrift ? this.n(E.fremdrift) : null;
      const minsOf = id => { const x = this.n(id); if (x == null) return null; const u = this.unit(id); return u === 's' ? x / 60 : u === 'h' ? x * 60 : x; };
      const elMin = minsOf(E.tid), area = this.ok(E.areal) ? Math.round(this.n(E.areal)) : null;
      const rest = st === 'cleaning' && prog != null && elMin != null && prog > 0 ? Math.max(1, Math.round(elMin * (100 - prog) / prog)) : null;
      const endS = E.slutt ? this.v(E.slutt) : '';
      const end = endS && !KD.BAD.has(endS) ? new Date(endS) : null;
      const endOk = end && !isNaN(end);
      let subline;
      if (st === 'cleaning') subline = [curRoom && sel.length > 1 ? `${sel.length} rom valgt` : '', prog != null ? `${Math.round(prog)} % ferdig` : '', rest != null ? `ca. ${rest} min igjen` : ''].filter(Boolean).join(' · ') || 'I gang';
      else if (st === 'error') subline = errTxt ? String(errTxt) : 'Sjekk roboten';
      else if (this.isOn(cf.vannmangel)) subline = 'Vanntanken er tom';
      else subline = endOk ? `Sist støvsuget ${this.dayWord(end)} ${KD.hm(end)}` : labels[st];

      // sugestyrke
      const fanNow = String(this.at(vac, 'fan_speed', '') || '').toLowerCase();
      const fanList = (this.at(vac, 'fan_speed_list', []) || []).map(String);
      const FICON = { quiet: 'volume_down', std: 'air', turbo: 'bolt', max: 'rocket_launch' };
      const suction = SUG.map(([k, l, vals]) => ({ k, l, val: fanList.find(f => vals.includes(f.toLowerCase())) || vals[0], on: vals.includes(fanNow) }));
      const fanCur = (suction.find(x => x.on) || {}).val || '';
      const fanLabel = (suction.find(x => x.on) || {}).l || (fanNow ? fanNow.charAt(0).toUpperCase() + fanNow.slice(1) : '–');

      // helt
      const ringV = st === 'cleaning' && prog != null ? KD.clamp(prog, 0, 100) : hasB ? b : 0;
      const ringC = st === 'cleaning' || st === 'paused' || st === 'returning' || st === 'error' || st === 'unavailable' ? col : b < 20 ? C.red : b < 40 ? C.amber : C.green;
      const RL = 2 * Math.PI * 86;
      const batIcon = charging ? 'battery_charging_full' : b > 90 ? 'battery_full' : b > 65 ? 'battery_5_bar' : b > 40 ? 'battery_4_bar' : b > 20 ? 'battery_2_bar' : 'battery_alert';
      const heroStats = st === 'cleaning' || st === 'paused'
        ? [['Fremdrift', prog != null ? `${Math.round(prog)} %` : '–'], ['Areal', area != null ? `${area} m²` : '–'], ['Tid', elMin != null ? `${Math.round(elMin)} min` : '–']]
        : [['Sugestyrke', fanLabel], ['Siste areal', area != null ? `${area} m²` : '–'], ['Siste tid', elMin != null ? `${Math.round(elMin)} min` : '–']];
      const moving = st === 'cleaning';
      const robot = `<svg viewBox="0 0 100 100" style="position:absolute;inset:30px;width:calc(100% - 60px);height:calc(100% - 60px);filter:drop-shadow(0 10px 18px rgba(0,0,0,0.5))">
        <defs><radialGradient id="kdvBody" cx="38%" cy="28%" r="85%"><stop offset="0" stop-color="#46464c"></stop><stop offset="0.55" stop-color="#2a2a2e"></stop><stop offset="1" stop-color="#1b1b1e"></stop></radialGradient></defs>
        <circle cx="50" cy="50" r="46" fill="url(#kdvBody)" stroke="rgba(255,255,255,0.10)" stroke-width="1"></circle>
        <path d="M13 40 A38 38 0 0 1 87 40" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="3" stroke-linecap="round"></path>
        <circle cx="50" cy="36" r="13" fill="#232327" stroke="rgba(255,255,255,0.14)" stroke-width="1"></circle>
        <circle cx="50" cy="36" r="5" fill="${ringC}"${moving ? ' style="animation:kdvpulse 1.4s ease-in-out infinite"' : ''}></circle>
        <rect x="38" y="64" width="24" height="5" rx="2.5" fill="rgba(255,255,255,0.14)"></rect>
      </svg>`;
      const hero = `<section style="position:relative;overflow:hidden;border-radius:30px;padding:16px 16px 14px;background:radial-gradient(120% 70% at 50% 0%, ${a(col, 0.16)} 0%, rgba(28,28,31,0) 62%), #1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05);display:flex;flex-direction:column;align-items:center;gap:12px">
    <div style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px">
      <span style="display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 12px;border-radius:15px;background:rgba(255,255,255,0.06);font-size:12px;font-weight:600;min-width:0"><span style="width:8px;height:8px;border-radius:4px;flex:none;background:${col};box-shadow:0 0 10px ${a(col, 0.8)}${moving ? ';animation:kdvpulse 1.4s ease-in-out infinite' : ''}"></span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(labels[st])}</span></span>
      <span style="display:inline-flex;align-items:center;gap:4px;height:30px;padding:0 10px 0 8px;border-radius:15px;background:rgba(255,255,255,0.06);font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;color:${b < 20 && hasB ? C.red : '#f2f1ee'}"><span class="ms" style="font-size:17px;transform:rotate(90deg);color:${charging ? C.green : 'inherit'};font-variation-settings:'FILL' 1">${batIcon}</span>${hasB ? b : '–'} %</span>
    </div>
    <div data-on-click="openMore" style="position:relative;width:196px;height:196px;cursor:pointer">
      ${moving ? `<span style="position:absolute;inset:22px;border-radius:50%;background:conic-gradient(from 0deg, ${a(col, 0)} 0deg, ${a(col, 0)} 250deg, ${a(col, 0.32)} 360deg);animation:kdvspin 2.6s linear infinite"></span>` : `<span style="position:absolute;inset:22px;border-radius:50%;background:radial-gradient(circle, ${a(ringC, 0.10)} 0%, rgba(0,0,0,0) 70%)"></span>`}
      <svg viewBox="0 0 196 196" style="position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg)">
        <circle cx="98" cy="98" r="86" fill="none" stroke="#2a2a2d" stroke-width="9"></circle>
        <circle cx="98" cy="98" r="86" fill="none" stroke="${ringC}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(RL * ringV / 100).toFixed(1)} ${RL.toFixed(1)}" style="transition:stroke-dasharray 1s cubic-bezier(.2,.9,.3,1), stroke .4s;filter:drop-shadow(0 0 6px ${a(ringC, 0.55)})"></circle>
      </svg>
      ${robot}
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:5px;text-align:center;max-width:100%;min-width:0">
      <div style="font-size:23px;font-weight:500;letter-spacing:-0.015em;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e(headline)}</div>
      <div style="font-size:13px;color:${st === 'error' ? C.red : '#8e8d89'};max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e(subline)}</div>
    </div>
    ${st === 'cleaning' && prog != null ? `<div style="width:100%;height:6px;border-radius:3px;background:#2a2a2d;overflow:hidden"><div style="width:${KD.clamp(prog, 0, 100)}%;height:100%;border-radius:3px;background:${col};transition:width 1s"></div></div>` : ''}
    <div style="width:100%;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-radius:20px;background:rgba(255,255,255,0.035);padding:10px 0">
      ${heroStats.map(([l, v], i) => `<div style="min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;padding:0 6px;${i ? 'border-left:1px solid rgba(255,255,255,0.06)' : ''}"><span style="font-size:11px;color:#8e8d89;white-space:nowrap">${e(l)}</span><span style="font-size:15px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${e(v)}</span></div>`).join('')}
    </div>
  </section>`;

      // handlinger
      const main = st === 'cleaning'
        ? { icon: 'pause', label: 'Pause', bg: a(C.amber, 0.16), fg: '#f2f1ee', sh: `inset 0 0 0 1px ${a(C.amber, 0.45)}` }
        : { icon: 'play_arrow', label: st === 'paused' ? 'Fortsett' : zone ? `Støvsug ${zone.navn.toLowerCase()}` : sel.length ? `Støvsug ${sel.length} rom` : 'Støvsug alt', bg: `linear-gradient(135deg, ${C.green}, oklch(0.88 0.09 160))`, fg: '#10231a', sh: `0 10px 26px ${a(C.green, 0.25)}, inset 0 1px 0 rgba(255,255,255,0.35)` };
      const tile = (k, icon, label, on, c) => `<button class="kd-vac-ctl" data-on-click="ctl" data-arg="${k}" style="min-width:0;height:60px;border-radius:22px;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 8px;background:${on ? a(c, 0.16) : '#1c1c1f'};box-shadow:${on ? `inset 0 0 0 1px ${a(c, 0.45)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)'};transition:transform .15s, background .2s">
          <span style="width:34px;height:34px;border-radius:17px;flex:none;display:grid;place-items:center;background:${on ? a(c, 0.25) : '#2a2a2e'};color:${on ? c : '#e4e2dd'}"><span class="ms" style="font-size:19px;font-variation-settings:'FILL' 1">${icon}</span></span>
          <span style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0">${e(label)}</span></button>`;
      const actions = `<section style="display:flex;flex-direction:column;gap:10px">
    <button class="kd-vac-ctl" data-on-click="main" data-haptic="medium" style="height:62px;border-radius:31px;display:flex;align-items:center;justify-content:center;gap:10px;padding:0 20px;font-size:16px;font-weight:600;background:${main.bg};color:${main.fg};box-shadow:${main.sh};transition:transform .15s"><span class="ms" style="font-size:26px;font-variation-settings:'FILL' 1">${main.icon}</span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(main.label)}</span></button>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
      ${tile('dock', 'home', st === 'returning' ? 'Kjører hjem' : 'Hjem', st === 'returning', C.blue)}${tile('locate', 'location_searching', 'Finn', false, C.blue)}${tile('empty', 'delete_sweep', 'Tøm', false, C.amber)}
    </div>
  </section>`;

      const tabs = KD.segHTML('vac-tab', [['clean', 'Rom', 'grid_view'], ['control', 'Modus', 'tune'], ['info', 'Status', 'monitoring'], ['map', 'Kart', 'map']], s.tab, 'tab', { pink: true });
      const lbl = (t, right = '') => `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 4px;min-height:22px"><div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;white-space:nowrap">${e(t)}</div>${right}</div>`;
      let tabHTML = '';

      if (s.tab === 'clean') {
        const selMeta = zone ? `Sone: ${zone.navn}` : sel.length ? `${sel.length} valgt` : 'Ingen valgt · hele huset';
        const tiles = rooms.filter(r => r.entity).map(r => {
          const on = r.on;
          return `<button data-on-click="toggleRoom" data-arg="${e(r.entity)}" style="position:relative;min-width:0;height:104px;border-radius:22px;padding:12px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;align-items:flex-start;text-align:left;background:${on ? `linear-gradient(160deg, ${a(C.green, 0.24)}, ${a(C.green, 0.08)})` : '#1c1c1f'};box-shadow:${on ? `inset 0 0 0 1.5px ${a(C.green, 0.55)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)'};transition:background .25s, box-shadow .25s">
            <span style="width:36px;height:36px;border-radius:18px;display:grid;place-items:center;background:${on ? a(C.green, 0.25) : '#2a2a2e'};color:${on ? C.green : '#c9c7c2'};transition:background .25s"><span class="ms" style="font-size:20px;font-variation-settings:'FILL' ${on ? 1 : 0}">${e(r.ikon)}</span></span>
            <span style="position:absolute;right:10px;top:10px;width:22px;height:22px;border-radius:11px;display:grid;place-items:center;box-sizing:border-box;background:${on ? C.green : 'transparent'};box-shadow:${on ? 'none' : 'inset 0 0 0 1.5px rgba(255,255,255,0.18)'};color:#10231a;transition:background .2s"><span class="ms" style="font-size:16px;opacity:${on ? 1 : 0};transform:scale(${on ? 1 : 0.4});transition:all .25s cubic-bezier(.34,1.5,.64,1)">check</span></span>
            <span style="display:flex;flex-direction:column;gap:1px;width:100%;min-width:0">
              <span style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(r.navn)}</span>
              <span style="font-size:11px;color:${on ? a(C.green, 0.9) : '#8e8d89'};white-space:nowrap">${e(r.areal != null ? `${r.areal} m²` : on ? 'Valgt' : 'Trykk for å velge')}</span>
            </span></button>`;
        }).join('');
        const any = sel.length || zone;
        tabHTML = `<section style="display:flex;flex-direction:column;gap:10px">
    ${lbl('Rom', `<div style="display:flex;align-items:center;gap:8px;min-width:0"><span style="font-size:12px;color:#6d6c69;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(selMeta)}</span>${any ? `<button data-on-click="clearRooms" style="height:26px;padding:0 10px;border-radius:13px;background:rgba(255,255,255,0.07);font-size:11px;font-weight:600;color:#c9c7c2;white-space:nowrap">Nullstill</button>` : ''}</div>`)}
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px">${tiles}</div>
    ${zones.length ? `<div style="display:flex;flex-direction:column;gap:8px;margin-top:6px">${lbl('Soner')}
      <div data-hscroll="1" style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 calc(-1 * var(--kd-kant,10px));padding:0 var(--kd-kant,10px)">
        ${zones.map(z => { const on = s.zone === z.entity; return `<button data-on-click="pickZone" data-arg="${e(z.entity)}" style="flex:none;height:40px;padding:0 14px 0 10px;border-radius:20px;display:flex;align-items:center;gap:7px;font-size:13px;font-weight:500;white-space:nowrap;background:${on ? a(C.green, 0.16) : '#1c1c1f'};color:${on ? '#f2f1ee' : '#c9c7c2'};box-shadow:${on ? `inset 0 0 0 1.5px ${a(C.green, 0.55)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)'}"><span class="ms" style="font-size:17px;color:${on ? C.green : 'inherit'};font-variation-settings:'FILL' ${on ? 1 : 0}">${e(z.ikon || 'table_restaurant')}</span><span>${e(z.navn)}</span></button>`; }).join('')}
      </div></div>` : ''}
    ${any ? `<button class="kd-vac-ctl" data-on-click="ctl" data-arg="start" data-haptic="medium" style="margin-top:4px;height:54px;border-radius:27px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:15px;font-weight:600;background:${PINK};color:#2a1720;box-shadow:0 8px 22px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.35);transition:transform .15s"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">cleaning_services</span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(zone ? `Rengjør ${zone.navn.toLowerCase()}` : `Rengjør valgte · ${sel.length} rom`)}</span></button>`
      : `<div style="font-size:12px;color:#6d6c69;text-align:center;padding:2px 0">Velg ett eller flere rom, så kan du rengjøre bare dem</div>`}
  </section>`;
      }

      if (s.tab === 'control') {
        const mopOn = E.mopp ? !['off', 'unknown', 'unavailable', ''].includes(this.v(E.mopp)) : false;
        const warn = this.isOn(cf.vannmangel) ? 'Vanntanken er tom' : (this.st(cf.vanntank) && this.v(cf.vanntank) === 'off') ? 'Vanntanken er ikke satt i' : '';
        const selects = this.selects().map(x => `<section style="display:flex;flex-direction:column;gap:8px">
      ${lbl(x.navn, x.id === E.mopp && warn ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:${C.amber};white-space:nowrap"><span class="ms" style="font-size:15px;font-variation-settings:'FILL' 1">water_drop</span>${e(warn)}</span>` : x.id === E.mopp && mopOn ? `<span style="font-size:12px;color:#6d6c69">Mopper etter støvsuging</span>` : '')}
      ${KD.segHTML('sel-' + x.id, x.opts.map(o => [x.id + '|' + o, OPT[String(o).toLowerCase()] || String(o).replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())]), x.id + '|' + this.v(x.id), 'selOpt', { small: x.opts.length > 4 })}
    </section>`).join('');
        const tm = id => { const v = this.v(id); return /^\d{1,2}:\d{2}/.test(v) ? v.slice(0, 5) : null; };
        const qFrom = tm(E.stille_fra), qTo = tm(E.stille_til), qOn = this.isOn(E.stille);
        tabHTML = `<section style="display:flex;flex-direction:column;gap:8px">
      ${lbl('Sugestyrke', `<span style="font-size:12px;color:#6d6c69">${e(fanLabel)}</span>`)}
      ${KD.segHTML('vac-fan', suction.map(x => [x.val, x.l, FICON[x.k]]), fanCur, 'fan', {})}
    </section>
    ${selects}
    ${E.stille ? `<section><button data-on-click="toggleOpt" data-arg="quiet" style="width:100%;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:22px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04);text-align:left">
      <span style="width:38px;height:38px;border-radius:19px;flex:none;display:grid;place-items:center;background:${qOn ? a(C.blue, 0.2) : '#2a2a2e'};color:${qOn ? C.blue : '#c9c7c2'}"><span class="ms" style="font-size:20px;font-variation-settings:'FILL' 1">bedtime</span></span>
      <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:14px;font-weight:600">Stille timer</span><span style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(qFrom && qTo ? `Ikke forstyrr ${qFrom}–${qTo}` : qOn ? 'På' : 'Av')}</span></span>
      ${this.sw(qOn)}</button></section>` : ''}`;
      }

      if (s.tab === 'info') {
        const hrs = this.hours(cf.tid_totalt);
        const last = [['event', 'Når', endOk ? `${this.dayWord(end).replace(/^./, c => c.toUpperCase())} ${KD.hm(end)}` : '–'], ['square_foot', 'Areal', area != null ? `${area} m²` : '–'], ['timer', 'Varighet', elMin != null ? `${Math.round(elMin)} min` : '–']];
        const tot = [['Tid', hrs == null ? '–' : `${Math.round(hrs).toLocaleString('nb-NO')} t`], ['Areal', this.ok(cf.areal_totalt) ? `${Math.round(this.n(cf.areal_totalt)).toLocaleString('nb-NO')} m²` : '–'], ['Turer', this.ok(E.turer) ? Math.round(this.n(E.turer)).toLocaleString('nb-NO') : '–']];
        const PICON = { main_brush: 'cleaning_services', side_brush: 'mode_fan', filter: 'filter_alt', sensor: 'sensors' };
        const parts = this.parts();
        tabHTML = `<section style="display:flex;flex-direction:column;gap:8px">
      ${lbl('Siste rengjøring')}
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
        ${last.map(([ic, l, v]) => `<div style="min-width:0;display:flex;flex-direction:column;gap:8px;padding:14px;border-radius:22px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04)"><span class="ms" style="font-size:20px;color:#8e8d89">${ic}</span><span style="display:flex;flex-direction:column;gap:2px;min-width:0"><span style="font-size:11px;color:#8e8d89">${e(l)}</span><span style="font-size:15px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(v)}</span></span></div>`).join('')}
      </div>
    </section>
    <section style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-radius:22px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04);padding:14px 0">
      ${tot.map(([l, v], i) => `<div style="min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;padding:0 6px;${i ? 'border-left:1px solid rgba(255,255,255,0.06)' : ''}"><span style="font-size:11px;color:#8e8d89">${e(l)} totalt</span><span style="font-size:17px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap">${e(v)}</span></div>`).join('')}
    </section>
    ${parts.length ? `<section style="display:flex;flex-direction:column;gap:8px">
      ${lbl('Slitedeler', parts.some(p => p.pct < 20) ? `<span style="font-size:12px;color:${C.amber}">${parts.filter(p => p.pct < 20).length} bør byttes</span>` : `<span style="font-size:12px;color:#6d6c69">Alt i orden</span>`)}
      <div style="display:flex;flex-direction:column;border-radius:24px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04);padding:4px 14px">
      ${parts.map((p, i) => { const low = p.pct < 20, c = low ? C.amber : p.pct < 40 ? 'oklch(0.86 0.12 95)' : C.green; const k = ((cf.deler || [])[i] || {}).nokkel; return `<div style="display:flex;align-items:center;gap:12px;padding:12px 0;${i ? 'border-top:1px solid rgba(255,255,255,0.05)' : ''}">
        <span style="width:38px;height:38px;border-radius:19px;flex:none;display:grid;place-items:center;background:${a(c, 0.14)};color:${c}"><span class="ms" style="font-size:20px">${PICON[k] || 'build'}</span></span>
        <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:7px">
          <span style="display:flex;justify-content:space-between;gap:8px;font-size:14px"><span style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(p.navn)}</span><span style="font-size:12px;color:${low ? C.amber : '#8e8d89'};font-variant-numeric:tabular-nums;white-space:nowrap">${Math.round(p.left)} t igjen · ${p.pct} %</span></span>
          <span style="height:6px;border-radius:3px;background:#2a2a2d;overflow:hidden"><span style="display:block;width:${p.pct}%;height:100%;border-radius:3px;background:${c};transition:width 1s"></span></span>
        </span>
        ${low && p.reset ? `<button data-on-click="resetPart" data-arg="${e(p.reset)}" title="Merk som byttet" style="height:32px;padding:0 12px;border-radius:16px;flex:none;background:${C.amber};color:#161618;font-size:12px;font-weight:600;white-space:nowrap">Byttet</button>` : ''}
      </div>`; }).join('')}
      </div>
    </section>` : ''}`;
      }

      if (s.tab === 'map') {
        const maps = this.maps();
        const cur = maps.find(m => m.id === s.map) || maps[0];
        const rp = (sel.find(r => r.kart) || rooms.find(r => r.kart) || { kart: [4, 4, 44, 34] }).kart;
        const t = (prog || 0) / 100, mv = st === 'cleaning' || st === 'paused';
        const dot = `left:calc(${mv ? rp[0] + rp[2] * (0.15 + 0.7 * ((t * 5) % 1)) : 9}% - 9px);top:calc(${mv ? rp[1] + rp[3] * (0.2 + 0.6 * t) : 82}% - 9px)`;
        tabHTML = `${cur ? `<section style="display:flex;flex-direction:column;gap:10px">
      ${maps.length > 1 ? KD.segHTML('vac-map', maps.map(m => [m.id, m.navn, 'layers']), cur.id, 'pickMap', { small: true }) : ''}
      <div data-on-click="openMap" data-arg="${e(cur.id)}" style="position:relative;border-radius:26px;overflow:hidden;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05);aspect-ratio:4 / 3;cursor:pointer">
        <img src="${e(cur.src)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain">
        <span style="position:absolute;left:12px;bottom:12px;height:28px;padding:0 10px;border-radius:14px;display:inline-flex;align-items:center;gap:6px;background:rgba(20,20,22,0.7);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-size:12px;font-weight:500"><span class="ms" style="font-size:15px">map</span>${e(cur.navn)}</span>
      </div>
    </section>` : ''}
    ${rooms.some(r => Array.isArray(r.kart)) ? `<section style="display:flex;flex-direction:column;gap:8px">
      ${lbl('Romvelger', `<span style="font-size:12px;color:#6d6c69">Trykk på et rom</span>`)}
      <div style="position:relative;height:300px;border-radius:26px;background:#1c1c1f;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05)">
        ${rooms.filter(r => Array.isArray(r.kart)).map(r => { const [x, y, w, h] = r.kart, on = r.on; return `<button data-on-click="toggleRoom" data-arg="${e(r.entity || '')}" style="position:absolute;left:${x}%;top:${y}%;width:${w}%;height:${h}%;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;background:${on ? a(C.green, 0.28) : '#262629'};box-shadow:${on ? `inset 0 0 0 1.5px ${C.green}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)'};color:${on ? '#f2f1ee' : '#a9a7a2'};transition:background .2s"><span class="ms" style="font-size:16px;color:${on ? C.green : '#6d6c69'}">${e(r.ikon)}</span><span style="font-size:11px;font-weight:500">${e(r.navn)}</span></button>`; }).join('')}
        <span style="position:absolute;left:8%;top:84%;width:18px;height:12px;border-radius:4px;background:#48474a"></span>
        <span style="position:absolute;${dot};width:18px;height:18px;border-radius:9px;background:#f2f1ee;box-shadow:0 0 0 4px ${a(col, 0.35)}, 0 0 16px ${a(col, 0.6)};transition:left .8s linear, top .8s linear"></span>
      </div>
    </section>` : ''}`;
      }

      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:18px">
  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89"><span>${e(cf.navn || 'Sir Sweeps')}</span></div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>
  ${hero}
  ${actions}
  ${tabs}
  ${tabHTML}
</div>`;
    }
    /** Bryter (spor + knott) */
    sw(on) { return `<span style="position:relative;width:46px;height:28px;border-radius:14px;flex:none;background:${on ? 'oklch(0.72 0.14 150)' : '#3a3a3d'};transition:background .2s"><span style="position:absolute;top:3px;left:${on ? 21 : 3}px;width:22px;height:22px;border-radius:11px;background:#f4f3ef;box-shadow:0 2px 6px rgba(0,0,0,0.3);transition:left .25s cubic-bezier(.34,1.4,.64,1)"></span></span>`; }
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
