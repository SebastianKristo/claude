/*
 * kd-printer-card – pikselkopi av Claude Design «3D-printer» (Creality K2), med ekte data.
 *
 *   type: custom:kd-printer-card      # alt annet er valgfritt («auto config»)
 *   prefiks: creality_k2              # entitetene bygges/letes opp ut fra prefikset
 * Status, fremdrift, lag, tid igjen, temperaturer og mål, vifter, CFS-spor (filament/farge/rest),
 * kamera (camera.<prefiks>_printer_camera) og knapper (pause/fortsett/stopp) finnes automatisk.
 */
(() => {
  const KD = window.KD;
  const AMBER = 'oklch(0.82 0.12 75)', GREEN = 'oklch(0.8 0.12 150)', RED = 'oklch(0.72 0.15 25)', BLUE = 'oklch(0.8 0.12 250)';
  const a = KD.a, PINK = KD.PINK;
  const PRINTING = ['printing', 'running', 'busy'], PAUSED = ['paused', 'pausing'], HEATING = ['preheating', 'heating'], DONE = ['complete', 'completed', 'finished'];
  const low = (x) => String(x || '').toLowerCase();

  /** Sekunder, «H:MM:SS» eller minutter (med enhet) → minutter */
  const minutes = (st) => {
    if (!st || KD.BAD.has(st.state)) return null;
    const raw = st.state, u = st.attributes.unit_of_measurement;
    if (String(raw).includes(':')) { const d = String(raw).split(':').map(Number); return d.length === 3 ? d[0] * 60 + d[1] + d[2] / 60 : d[0] + d[1] / 60; }
    const n = Number(raw); if (!isFinite(n)) return null;
    return u === 'min' ? n : u === 'h' ? n * 60 : n / 60;
  };
  const dur = (m) => { m = Math.max(0, Math.round(m)); return m >= 60 ? `${Math.floor(m / 60)} t ${m % 60} min` : `${m} min`; };
  /** farge fra sensor («#FF0000», «FF0000», «255,0,0», css-farge) */
  const colorOf = (raw) => {
    const s = String(raw || '').trim();
    if (!s || KD.BAD.has(s)) return null;
    if (/^[0-9a-f]{6,8}$/i.test(s)) return '#' + s.slice(0, 6);
    if (/^#[0-9a-f]{7,8}$/i.test(s)) return s.slice(0, 7);
    if (/^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/.test(s)) return `rgb(${s})`;
    return (window.CSS && CSS.supports && CSS.supports('color', s)) ? s : null;
  };
  /** mørk farge → lys tekst */
  const isDark = (c) => {
    if (!c) return false;
    let m = /^oklch\(\s*([\d.]+)/i.exec(c); if (m) return parseFloat(m[1]) < 0.5;
    m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(c);
    if (m) { const [r, g, b] = m.slice(1).map(x => parseInt(x, 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.4; }
    m = /^rgb\((\d+),\s*(\d+),\s*(\d+)/.exec(c); if (m) return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255 < 0.4;
    return false;
  };

  class KDPrinterCard extends KD.KDSheet {
    static head = ['print', '3D-printer', 'Creality K2'];
    static defaults = {
      prefiks: 'creality_k2',
      navn: 'Creality K2',
      strom: null,               // auto: switch.<prefiks>
      homey_bryter: 'button.homey_flows_02_creality_k2_bryter',   // brukes når strømbryteren mangler
      lys: 'light.creality_k2_light',
      romvifte: 'fan.baderomsvifte',
      energi: 'sensor.creality_k2_energy_daily',
      start_jobb: null,          // knapp/skript som skriver ut siste jobb (vises bare når den finnes)
      cfs_spor: 4,
      spole_gram: 1000,
    };
    static sheetCss = `button:disabled{cursor:default}`;

    constructor() { super(); this.state = { tab: 'simple' }; }

    /* ----- entiteter ----- */
    get p() { return this.config.prefiks || 'creality_k2'; }
    s(n) { return `sensor.${this.p}_${n}`; }
    /** første entitet som finnes blant kandidatene (id eller regex) */
    pick(...cands) {
      for (const c of cands) {
        if (!c) continue;
        if (c instanceof RegExp) { const f = this.find(c)[0]; if (f) return f; } else if (this.st(c)) return c;
      }
      return null;
    }
    ids() {
      const p = this.p, cf = this.config, re = (x) => new RegExp(`^sensor\\.${p}_.*(${x})`);
      return {
        status: this.pick(this.s('print_status'), re('print_?stat|_status$|_state$')),
        prog: this.pick(this.s('print_progress'), re('progress')),
        left: this.pick(this.s('print_time_left'), re('time_left|remain')),
        layer: this.pick(this.s('working_layer'), re('current_?layer|working_layer')),
        layers: this.pick(this.s('total_layers'), re('total_?layers')),
        file: this.pick(this.s('current_object'), this.s('print_file_name'), re('file|print_?name|current_object')),
        power: this.pick(cf.strom, `switch.${p}`, `switch.${p}_power`),
        light: this.pick(cf.lys, `light.${p}_light`),
        pause: this.pick(`button.${p}_pause_print`), resume: this.pick(`button.${p}_resume_print`), stop: this.pick(`button.${p}_stop_print`),
        cam: this.pick(`camera.${p}_printer_camera`, new RegExp(`^camera\\.${p}`)),
        speed: this.pick(this.s('print_speed'), re('speed')),
        partFan: this.pick(`fan.${p}_model_fan`, new RegExp(`^fan\\.${p}_.*(model|part)`)),
        caseFan: this.pick(`fan.${p}_case_fan`, new RegExp(`^fan\\.${p}_.*(case|chamber)`)),
        zoff: this.pick(this.s('z_offset'), re('z_?offset')),
        layerH: this.pick(this.s('layer_height'), re('layer_height|lagtykkelse')),
        cfsT: this.pick(this.s('cfs_box_1_temperature')), cfsH: this.pick(this.s('cfs_box_1_humidity')),
        slot: this.pick(this.s('active_filament_slot')),
        start: this.pick(cf.start_jobb, new RegExp(`^button\\.${p}_.*(reprint|print_again|restart_print|print_last)`)),
      };
    }
    job(I) {
      const powerKnown = I.power && this.ok(I.power);
      const st = low(this.v(I.status));
      const power = powerKnown ? this.isOn(I.power) : (!!I.status && this.ok(I.status) && !['off', 'offline'].includes(st));
      if (!power) return { power, job: 'off' };
      if (PRINTING.includes(st)) return { power, job: 'printing' };
      if (PAUSED.includes(st)) return { power, job: 'paused' };
      if (HEATING.includes(st)) return { power, job: 'heating' };
      if (DONE.includes(st)) return { power, job: 'done' };
      if (st === 'error') return { power, job: 'error' };
      return { power, job: 'idle' };
    }

    /* ----- handlinger ----- */
    tab(e, k) { this.setState({ tab: k }); }
    ctl(e, k) {
      const I = this.ids();
      if (k === 'light' && I.light) return this.call('light', 'toggle', { entity_id: I.light });
      if (k === 'power') {
        if (I.power) return this.call(I.power.split('.')[0] === 'input_boolean' ? 'input_boolean' : 'switch', 'toggle', { entity_id: I.power });
        if (this.config.homey_bryter && this.st(this.config.homey_bryter)) return this.press(this.config.homey_bryter);
        return;
      }
      const id = I[k]; if (id) this.press(id);
    }
    startJob() { const I = this.ids(); if (I.start) this.toggle(I.start); }
    openMore(e, id) { if (id) this.more(id); }
    toggleFan(e, id) { if (id) this.call(id.split('.')[0] === 'switch' ? 'switch' : 'fan', 'toggle', { entity_id: id }); }

    body() {
      const s = this.state, cf = this.config, e = KD.e, S = KD.S, I = this.ids();
      const { power, job } = this.job(I);
      const p = job === 'printing', paused = job === 'paused';
      const st = !power ? ['Av', '#8e8d89'] : job === 'heating' ? ['Varmer opp', AMBER] : p ? ['Skriver ut', GREEN] : paused ? ['Pause', AMBER] : job === 'done' ? ['Ferdig', GREEN] : job === 'error' ? ['Feil', RED] : ['Klar', BLUE];
      const ctrl = (k, icon, label, col, disabled, on) => ({ k, icon, label, disabled,
        style: { height: 74, borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: on ? a(col, 0.18) : '#1c1c1f', boxShadow: on ? `inset 0 0 0 1px ${a(col, 0.45)}` : 'none', color: disabled ? '#48474a' : '#f2f1ee', opacity: disabled ? 0.6 : 1 },
        iconStyle: { fontSize: 24, color: disabled ? '#48474a' : col, fontVariationSettings: "'FILL' 1" } });
      const prog = I.prog ? KD.clamp(this.n(I.prog, 0), 0, 100) : 0;
      const file = I.file && this.ok(I.file) && !/^none$/i.test(this.v(I.file)) ? this.v(I.file) : null;
      const leftMin = minutes(this.st(I.left));
      const layer = this.n(I.layer), layers = this.n(I.layers);
      // CFS-spor
      const n = KD.clamp(Number(cf.cfs_spor) || 4, 1, 4);
      const activeSlot = I.slot ? parseInt(this.v(I.slot), 10) : NaN;
      const slots = [];
      for (let i = 1; i <= n; i++) {
        const f = this.s(`cfs_box_1_slot_${i}_filament`), c = this.s(`cfs_box_1_slot_${i}_color`), r = this.s(`cfs_box_1_slot_${i}_remaining`);
        if (!this.st(f) && !this.st(r)) continue;
        slots.push({ i, f, name: this.ok(f) ? this.v(f) : '–', col: colorOf(this.v(c)), pct: this.ok(r) ? KD.clamp(Math.round(this.n(r)), 0, 100) : null });
      }
      const slotName = (slots.find(x => x.i === activeSlot) || {}).name;
      const headline = !power ? 'Printeren er av' : p || paused ? (file || 'Utskrift pågår') : job === 'heating' ? 'Varmer dyse og plate' : job === 'done' ? 'Utskriften er ferdig' : job === 'error' ? 'Printeren melder feil' : 'Klar til utskrift';
      const subline = p ? [layer != null && layers ? `Lag ${Math.round(layer)} av ${Math.round(layers)}` : '', leftMin != null ? `ca. ${dur(leftMin)} igjen` : ''].filter(Boolean).join(' · ') || 'Skriver ut'
        : paused ? 'Satt på pause' : !power ? 'Slå på for å varme opp og se kamera' : slotName && slotName !== '–' ? `${slotName} valgt` : file && job === 'done' ? file : '–';
      const showProg = p || paused || job === 'done';
      const progBar = { width: `${prog}%`, height: '100%', borderRadius: 4, background: paused ? AMBER : GREEN, transition: 'width 1s' };
      const lightOn = I.light ? this.isOn(I.light) : false;
      const camStyle = { position: 'relative', height: 200, borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: power ? (lightOn ? '#26262a' : '#1c1c1f') : '#18181a', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)', transition: 'background .3s' };
      const camPic = power && I.cam && this.ok(I.cam) ? this.at(I.cam, 'entity_picture') : null;
      const camSrc = camPic ? String(camPic).replace('/api/camera_proxy/', '/api/camera_proxy_stream/') : null;
      if (camPic) camStyle.overflow = 'hidden';
      const camLive = { position: 'absolute', left: 12, top: 12, display: power ? 'block' : 'none', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 8, background: RED, color: '#fff', zIndex: 1 };
      const controls = [
        ctrl('pause', 'pause', 'Pause', AMBER, !p || !I.pause),
        ctrl('resume', 'play_arrow', 'Fortsett', GREEN, !paused || !I.resume),
        ctrl('stop', 'stop', 'Stopp', RED, !(p || paused || job === 'heating') || !I.stop),
        ctrl('light', 'lightbulb', 'Lys', AMBER, !power || !I.light, lightOn),
        ctrl('power', 'power_settings_new', 'Strøm', power ? GREEN : '#f2f1ee', !I.power && !this.st(cf.homey_bryter), power),
      ];
      const canStart = power && (job === 'idle' || job === 'done') && !!I.start;
      const tabs = [['simple', 'Enkel'], ['adv', 'Avansert']].map(([k, label]) => ({ k, label, style: { height: 40, borderRadius: 16, fontSize: 13, fontWeight: 500, background: s.tab === k ? PINK : 'transparent', color: s.tab === k ? '#2a1720' : '#a9a7a2' } }));
      const temp = (icon, label, cur, tgt, maxId, maxDef, col) => {
        const v = this.ok(cur) ? this.n(cur) : null, t = this.n(tgt), max = this.n(maxId, maxDef) || maxDef;
        return { icon, label, id: cur, v: v != null ? `${Math.round(v)}°` : '–', target: v != null && t > 0 ? `/ ${Math.round(t)}°` : '',
          iconStyle: { fontSize: 15, color: col }, bar: { width: `${v != null ? Math.min(100, v / max * 100) : 0}%`, height: '100%', background: col, transition: 'width 1s' } };
      };
      const P = this.p;
      const temps = [temp('local_fire_department', 'Dyse', this.s('nozzle_temperature'), `number.${P}_nozzle_target`, this.s('max_nozzle_temperature'), 300, RED),
        temp('square', 'Plate', this.s('bed_temperature'), `number.${P}_bed_target`, this.s('max_bed_temperature'), 110, AMBER),
        temp('home', 'Kammer', this.s('chamber_temperature'), `number.${P}_chamber_target`, this.s('max_chamber_temperature'), 60, BLUE)];
      const fanV = (id) => { if (!this.ok(id)) return '–'; const pc = this.at(id, 'percentage'); return this.isOn(id) ? (pc != null ? `${Math.round(pc)} %` : 'På') : '0 %'; };
      const numV = (id, d, unitDef) => { if (!this.ok(id)) return '–'; const u = this.unit(id) || unitDef; return `${KD.nf(this.n(id), d).replace('-', '−')}${u ? ' ' + u : ''}`; };
      const adv = [['speed', 'Hastighet', I.speed, () => numV(I.speed, 0, '')], ['mode_fan', 'Delkjølevifte', I.partFan, () => fanV(I.partFan)], ['air', 'Kammervifte', I.caseFan, () => fanV(I.caseFan)],
        ['height', 'Z-offset', I.zoff, () => numV(I.zoff, 2, 'mm')], ['layers', 'Lagtykkelse', I.layerH, () => numV(I.layerH, 1, 'mm')],
        ['heat_pump', 'Baderomsvifte', cf.romvifte && this.st(cf.romvifte) ? cf.romvifte : null, () => fanV(cf.romvifte), 'toggleFan'],
        ['bolt', 'Energi i dag', cf.energi && this.st(cf.energi) ? cf.energi : null, () => numV(cf.energi, 2, 'kWh')]]
        .filter(r => r[2]).map(([icon, k, id, fn, act], i) => ({ icon, k, id, v: fn(), act: act || 'openMore', row: { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 4px', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'pointer' } }));
      const cfsMeta = [I.cfsT && this.ok(I.cfsT) ? `${Math.round(this.n(I.cfsT))} °C` : '', I.cfsH && this.ok(I.cfsH) ? `${Math.round(this.n(I.cfsH))} % RF` : ''].filter(Boolean).join(' · ') || '–';
      const slotRows = slots.map((x) => {
        const act = x.i === activeSlot, pct = x.pct;
        return { ...x, left: pct == null ? '–' : `${pct} % · ca. ${Math.round(pct / 100 * (cf.spole_gram || 1000))} g`,
          row: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px', borderRadius: 16, width: '100%', background: act ? '#1c1c1f' : 'transparent', boxShadow: act ? 'inset 0 0 0 1px rgba(255,255,255,0.08)' : 'none' },
          swatch: { width: 34, height: 34, borderRadius: 10, flex: 'none', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 600, background: x.col || '#2a2a2d', color: !x.col || isDark(x.col) ? '#f2f1ee' : '#1a1a1c', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)' },
          bar: { width: `${pct || 0}%`, height: '100%', background: pct != null && pct < 15 ? AMBER : '#c9c7c2' } };
      });

      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:20px">
  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89"><span>${e(cf.navn)}</span></div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section data-on-click="openMore" data-arg="${e(I.status || '')}" style="display:flex;flex-direction:column;gap:10px;padding:0 4px">
    <div style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;color:#c9c7c2"><span style="${S({ width: 8, height: 8, borderRadius: 4, background: st[1], boxShadow: power ? `0 0 10px ${st[1]}` : 'none' })}"></span><span>${e(st[0])}</span></div>
    <div style="font-size:24px;font-weight:500;letter-spacing:-0.015em"><span>${e(headline)}</span></div>
    <div style="font-size:14px;color:#8e8d89"><span>${e(subline)}</span></div>
    ${showProg ? `<div style="display:flex;align-items:center;gap:10px;padding-top:4px">
        <div style="flex:1;height:8px;border-radius:4px;background:#1f1f22;overflow:hidden"><div style="${S(progBar)}"></div></div>
        <span style="font-size:13px;font-weight:500;font-variant-numeric:tabular-nums"><span>${Math.round(prog)}</span> %</span>
      </div>` : ''}
  </section>

  <section data-on-click="openMore" data-arg="${e(I.cam || '')}" style="${S(camStyle)}">
    ${camSrc ? `<img src="${e(camSrc)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">` : ''}
    <span class="ms" style="font-size:32px;color:#48474a"><span>${power ? 'videocam' : 'videocam_off'}</span></span>
    <span style="font-size:12px;color:#6d6c69"><span>${power ? (I.cam ? 'Kamerastrøm' : 'Fant ikke kamera') : 'Kamera er av'}</span></span>
    <span style="${S(camLive)}">Live</span>
  </section>

  <section style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">
    ${controls.map(c => `
      <button data-on-click="ctl" data-arg="${c.k}" ${c.disabled ? 'disabled' : ''} style="${S(c.style)}">
        <span class="ms" style="${S(c.iconStyle)}"><span>${c.icon}</span></span>
        <span style="font-size:11px;font-weight:500"><span>${e(c.label)}</span></span>
      </button>`).join('')}
  </section>

  ${canStart ? `<button data-on-click="startJob" style="height:56px;border-radius:28px;background:oklch(0.82 0.12 75);color:#1a1408;font-size:15px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">print</span><span>${e(file ? `Skriv ut siste jobb · ${file}` : 'Skriv ut siste jobb')}</span></button>` : ''}

  ${KD.segHTML('fane', [['simple', 'Enkel'], ['adv', 'Avansert']], s.tab, 'tab', { pink: true })}

  <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
    ${temps.map(t => `
      <div data-on-click="openMore" data-arg="${e(t.id)}" style="display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:18px;background:#1c1c1f">
        <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:#8e8d89"><span class="ms" style="${S(t.iconStyle)}"><span>${t.icon}</span></span><span>${e(t.label)}</span></span>
        <span style="font-size:20px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap"><span>${e(t.v)}</span><span style="font-size:11px;color:#6d6c69;font-weight:400"> <span>${e(t.target)}</span></span></span>
        <div style="height:3px;border-radius:2px;background:#2a2a2d;overflow:hidden"><div style="${S(t.bar)}"></div></div>
      </div>`).join('')}
  </section>

  ${s.tab === 'adv' && adv.length ? `
    <section style="display:flex;flex-direction:column">
      ${adv.map(r => `
        <div data-on-click="${r.act}" data-arg="${e(r.id)}" style="${S(r.row)}"><span class="ms" style="font-size:18px;color:#8e8d89;width:24px"><span>${r.icon}</span></span><span style="flex:1;font-size:14px"><span>${e(r.k)}</span></span><span style="font-size:13px;color:#c9c7c2;font-variant-numeric:tabular-nums"><span>${e(r.v)}</span></span></div>`).join('')}
    </section>` : ''}

  ${slotRows.length ? `<section style="display:flex;flex-direction:column;gap:2px">
    <div style="display:flex;justify-content:space-between;padding:0 4px 8px">
      <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Filament · CFS</div>
      <div style="font-size:12px;color:#6d6c69"><span>${e(cfsMeta)}</span></div>
    </div>
    ${slotRows.map(f => `
      <button data-on-click="openMore" data-arg="${e(f.f)}" style="${S(f.row)}">
        <span style="${S(f.swatch)}"><span>${f.i}</span></span>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px;text-align:left">
          <div style="display:flex;justify-content:space-between;gap:10px">
            <span style="font-size:14px;font-weight:500"><span>${e(f.name)}</span></span>
            <span style="font-size:12px;color:#8e8d89;font-variant-numeric:tabular-nums"><span>${e(f.left)}</span></span>
          </div>
          <div style="height:4px;border-radius:2px;background:#2a2a2d;overflow:hidden"><div style="${S(f.bar)}"></div></div>
        </div>
      </button>`).join('')}
  </section>` : ''}
</div>`;
    }
  }

  KD.define('kd-printer-card', KDPrinterCard, 'KD 3D-printer', 'Creality K2 – pikselkopi av Claude Design');
  KD.sheet('printer', 'kd-printer-card');
})();
