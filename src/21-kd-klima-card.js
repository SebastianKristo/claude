/*
 * kd-klima-card – «Klima v2» fra Claude Design, med ekte data fra KI Energi (ki_energi).
 *
 * Alt leses fra entitetene integrasjonen lager (faste ID-er): sensor.ki_energi_status (budsjett, personer, flagg),
 * sensor.ki_laster (soner), sensor.ki_nettleie, sensor.ki_prognose, sensor.ki_bereder, sensor.ki_hanklevarmer,
 * sensor.ki_sparing, sensor.ki_besparelse, sensor.ki_tidskonstanter, sensor.ki_beslutningslogg, sensor.ki_lys,
 * sensor.ki_prognoselaering, sensor.ki_vvb_billige_timer + switch/number/time-hjelperne.
 * Soner, personer, lysregler, bereder og håndklevarmer oppdages automatisk.
 *
 * Minimal config:  type: custom:kd-klima-card
 */
(() => {
  const KD = window.KD;
  if (!KD || customElements.get('kd-klima-card')) return;

  const PINK = 'linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20))';
  const P = 'oklch(0.78 0.13 350)', G = 'oklch(0.8 0.14 150)', A = 'oklch(0.82 0.12 75)', R = 'oklch(0.72 0.15 25)', B = 'oklch(0.78 0.1 245)';
  const PURPLE = 'oklch(0.72 0.12 300)', ORANGE = 'oklch(0.72 0.15 50)';
  const al = KD.a, nf = KD.nf, S = KD.S;
  const E = (x) => `<span>${KD.e(x)}</span>`;            // {{ x }} = eget <span> i designet
  const num = (x) => { const v = parseFloat(x); return isNaN(v) ? null : v; };
  const nfk = (n) => (n == null ? '–' : Number.isInteger(Math.round(n * 100) / 100) ? String(Math.round(n)) : nf(n, 1));
  const pad = (h) => String(h).padStart(2, '0');
  const T = [['ov', 'Oversikt', 'dashboard'], ['so', 'Soner', 'roofing'], ['en', 'Energi', 'bolt'], ['vb', 'Vann og bad', 'water_heater'], ['ta', 'Tanker', 'psychology'], ['op', 'Oppsett', 'tune'], ['av', 'Avansert', 'build']];
  const SONE_TEKST = { gronn: 'God margin', gul: 'Nærmer seg grensen', oransje: 'Liten margin', rod: 'Fare for ny topp', kritisk: 'Kritisk', fallback: 'Trygg fallback', av: 'Motoren er av' };
  const SONE_FARGE = { gronn: G, gul: A, oransje: A, rod: R, kritisk: R, fallback: A, info: B };
  const HANDLING = { normal: ['Normal', G], senket: ['Senket', A], vindu: ['Vindu åpent', R], venter: ['Venter på tur', A], manuell: ['Manuell', '#a9a7a2'], utilgjengelig: ['Utilgjengelig', R], utsatt: ['Utsatt', A], 'på': ['På', G], av: ['Av', '#a9a7a2'] };
  const TYPE_NAVN = { panel: 'Panelovn', gulv: 'Gulvvarme', vannbaaren: 'Oljefyr', varmepumpe: 'Varmepumpe' };
  const DAG = ['søn', 'man', 'tir', 'ons', 'tor', 'fre', 'lør'], MND = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
  const MND_LANG = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
  // Første setning som tittel, resten som undertekst («Ferdig for i natt. Neste vindu …»)
  const split = (t) => { t = String(t || '').trim(); const m = t.match(/^(.+?)\.\s+(?=[A-ZÆØÅ])(.+)$/); return m ? [m[1], m[2]] : [t.replace(/\.$/, ''), '']; };

  class KDKlimaCard extends KD.KDSheet {
    static head = ['thermostat', 'Klima', 'Energimotoren'];
    static defaults = {
      status: 'sensor.ki_energi_status', laster: 'sensor.ki_laster', logg: 'sensor.ki_beslutningslogg',
      prognose: 'sensor.ki_prognose', nettleie: 'sensor.ki_nettleie', bereder: 'sensor.ki_bereder',
      hanklevarmer: 'sensor.ki_hanklevarmer', sparing: 'sensor.ki_sparing', besparelse: 'sensor.ki_besparelse',
      tidskonstanter: 'sensor.ki_tidskonstanter', prognoselaering: 'sensor.ki_prognoselaering', lys: 'sensor.ki_lys',
      billige_timer: 'sensor.ki_vvb_billige_timer', vvb_forklaring: 'sensor.ki_vvb_forklaring',
      uregulert: 'sensor.ki_uregulert_effekt', styrt: 'sensor.ki_styrt_effekt',
      fane: 'ov',                 // ov | so | en | vb | ta | op | av
      logg_antall: 5,
      sone_ikoner: {},            // { sonenøkkel: 'material-ikon' }
    };
    static sheetCss = `.kd-kl-p:active{transform:scale(0.97)}.kd-kl-p2:active{transform:scale(0.92)}.kd-kl-row{cursor:pointer}`;

    constructor() { super(); this.state = { tab: null, zone: null, set: {}, dur: {}, water: 'ber' }; }
    now() { return new Date(window.__kdMockNowKlima || Date.now()); }

    /* ---------- små lesere ---------- */
    sa(k, d) { return this.at(this.config.status, k, d); }
    tm(id) { const s = this.v(id); const m = /^(\d{1,2}):(\d{2})/.exec(s); return m ? `${pad(m[1])}:${m[2]}` : '–'; }
    th(id) { const s = this.v(id); const m = /^(\d{1,2}):(\d{2})/.exec(s); return m ? Number(m[1]) + Number(m[2]) / 60 : null; }
    ts(id) { const s = this.tm(id); return s.endsWith(':00') ? s.slice(0, 2) : s; }     // «19» / «05:30»
    nv(id, d, unit = '') { const v = this.n(id); return v == null ? '–' : nf(v, d) + unit; }
    dato(iso) {
      const d = iso ? new Date(iso) : null; if (!d || isNaN(d)) return '–';
      const t0 = this.now(); const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(t0.getFullYear(), t0.getMonth(), t0.getDate())) / 86400e3);
      const naar = diff === 0 ? 'i dag' : diff === 1 ? 'i morgen' : diff === -1 ? 'i går' : `${DAG[d.getDay()]} ${d.getDate()}. ${MND[d.getMonth()]}`;
      return `${naar} ${KD.hm(d)}`;
    }
    dag(iso) { const d = iso ? new Date(iso) : null; return !d || isNaN(d) ? '–' : `${DAG[d.getDay()]} ${d.getDate()}. ${MND[d.getMonth()]}`; }
    laster() { return this.at(this.config.laster, 'laster', []) || []; }
    zones() { return this.laster().filter((l) => l && l.type !== 'bryter' && l.key !== 'vvb'); }
    zoneIcon(l) {
      const ic = (this.config.sone_ikoner || {})[l.key]; if (ic) return ic;
      const s = `${l.key} ${l.navn} ${l.rom || ''}`.toLowerCase();
      if (/stue/.test(s)) return 'weekend';
      if (/trapp/.test(s)) return 'stairs';
      if (/bad/.test(s)) return 'floor_lamp';
      if (l.type === 'gulv') return 'floor';
      if (l.type === 'varmepumpe') return 'heat_pump';
      return 'heat';
    }
    isMan(l) { return l.handling === 'manuell' || (l.styr && this.st(l.styr) && !this.isOn(l.styr)); }
    remaining(l) {
      const d = l.overstyrt_til ? new Date(l.overstyrt_til) : null; if (!d || isNaN(d)) return null;
      const m = Math.max(0, Math.round((d - this.now()) / 60000));
      return { min: m, t: m >= 60 ? `${Math.round(m / 60)} t` : `${m} min` };
    }
    climates(l) { return (l.entiteter || []).filter((e) => /^climate\./.test(e)); }
    powerW(l) { const ids = (l.entiteter || []).filter((e) => /^sensor\./.test(e) && /power|effekt|_w$/i.test(e)); if (!ids.length) return null; return ids.reduce((t, e) => t + (this.n(e) || 0), 0); }

    /* ---------- byggesteiner (designets row/card/sw) ---------- */
    sw(on) {
      return { track: { position: 'relative', width: 44, height: 26, borderRadius: 13, flex: 'none', background: on ? P : '#3a3a3d', transition: 'background .2s' }, knob: { position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: 10, background: '#f4f3ef', transition: 'left .2s' } };
    }
    // o: { dot, sub, v, pill, chip:[t,c], tog: entity (bryter), on (overstyr av/på), go: [metode, arg] }
    row(k, o = {}, i = 0) {
      const on = o.tog ? (o.on != null ? o.on : this.isOn(o.tog)) : null;
      const chipS = (c) => ({ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 7, background: al(c, 0.18), color: c, whiteSpace: 'nowrap' });
      const go = o.tog ? ['togRow', o.tog] : o.go || null;
      const row = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', width: '100%', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: go ? 'pointer' : 'default' };
      const dot = { display: o.dot ? 'block' : 'none', width: 7, height: 7, borderRadius: 4, flex: 'none', background: o.dot || 'transparent' };
      const chip = o.chip ? chipS(o.chip[1]) : { display: 'none' };
      const subStyle = { display: o.sub ? 'block' : 'none', fontSize: 11, color: '#8e8d89', textWrap: 'pretty' };
      const vStyle = { display: o.v ? 'block' : 'none', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', padding: o.pill ? '6px 11px' : 0, borderRadius: 12, background: o.pill ? '#262629' : 'transparent' };
      const w = this.sw(on);
      const track = { ...w.track, display: on == null ? 'none' : 'block' };
      return `<button ${go ? `data-on-click="${go[0]}" data-arg="${KD.e(go[1] || '')}"` : ''} style="${S(row)}">
            <span style="${S(dot)}"></span>
            <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;text-align:left">
              <span style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:13px;font-weight:500">${E(k)}<span style="${S(chip)}">${E(o.chip ? o.chip[0] : '')}</span></span>
              <span style="${S(subStyle)}">${E(o.sub || '')}</span>
            </span>
            <span style="${S(vStyle)}">${E(o.v || '')}</span>
            <span style="${S(track)}"><span style="${S(w.knob)}"></span></span>
          </button>`;
    }
    // o: { rows:[[k,o]], stats:[[v,k]], note, bars:[{v, on}], lines:[[navn, [[a,b,t,c]]]] }
    card(icon, title, meta, o = {}) {
      const now = this.now(), nowPct = (now.getHours() + now.getMinutes() / 60) / 24 * 100;
      const stats = o.stats || [];
      const grid = { display: 'grid', gridTemplateColumns: `repeat(${stats.length === 4 ? 4 : 3},1fr)`, gap: 6 };
      const nowLine = { position: 'absolute', top: 0, bottom: 0, left: `${nowPct}%`, width: 2, background: '#f2f1ee' };
      const seg = ([a0, b0, t, c]) => `<span style="${S({ position: 'absolute', top: 2, bottom: 2, left: `${a0 / 24 * 100}%`, width: `${(b0 - a0) / 24 * 100}%`, borderRadius: 6, background: al(c, 0.55), color: '#f2f1ee', fontSize: 9, fontWeight: 600, display: 'flex', alignItems: 'center', paddingLeft: 5, overflow: 'hidden', whiteSpace: 'nowrap', boxSizing: 'border-box' })}">${E(t)}</span>`;
      return `<section style="display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:28px;background:#1c1c1f">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">
        <span style="display:flex;align-items:center;gap:8px;font-size:15px;font-weight:500"><span class="ms" style="font-size:18px;color:#a9a7a2">${E(icon)}</span>${E(title)}</span>
        <span style="font-size:12px;color:#8e8d89;text-align:right">${E(meta)}</span>
      </div>
      ${o.stats ? `<div style="${S(grid)}">${stats.map(([v, k]) => `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:12px 4px;border-radius:18px;background:#262629;text-align:center"><span style="font-size:17px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap">${E(v)}</span><span style="font-size:10px;color:#8e8d89">${E(k)}</span></div>`).join('')}</div>` : ''}
      ${o.lines ? `${o.lines.map(([name, segs]) => `<div style="display:flex;align-items:center;gap:8px">
            <span style="width:72px;flex:none;font-size:11px;color:#c9c7c2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(name)}</span>
            <div style="position:relative;flex:1;height:22px;border-radius:8px;background:#262629;overflow:hidden">
              ${segs.map(seg).join('')}
              <span style="${S(nowLine)}"></span>
            </div>
          </div>`).join('')}
        <div style="display:flex;justify-content:space-between;padding-left:80px;font-size:9px;color:#6d6c69;font-variant-numeric:tabular-nums"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>` : ''}
      ${o.bars ? `<div style="display:flex;align-items:flex-end;gap:2px;height:80px">${o.bars.map((b) => `<span style="${S(b)}"></span>`).join('')}</div>` : ''}
      <div style="display:flex;flex-direction:column">${(o.rows || []).map(([k, x], i) => this.row(k, x, i)).join('')}</div>
      ${o.note ? `<div style="font-size:11px;line-height:1.5;color:#8e8d89;text-wrap:pretty">${E(o.note)}</div>` : ''}
    </section>`;
    }
    pillRow(id, icon, label, sub, c, on, handler = 'togRow') {
      if (on == null) on = this.isOn(id);
      const w = this.sw(on);
      const pill = { display: 'flex', alignItems: 'center', gap: 12, minHeight: 62, padding: '6px 14px 6px 6px', borderRadius: 31, background: '#1c1c1f', width: '100%', boxSizing: 'border-box' };
      const iconWrap = { width: 50, height: 50, borderRadius: 25, flex: 'none', display: 'grid', placeItems: 'center', background: on ? c : '#2a2a2d', color: on ? '#141416' : '#8e8d89', transition: 'background .25s' };
      return `<button data-on-click="${handler}" data-arg="${KD.e(id)}" style="${S(pill)}">
          <span style="${S(iconWrap)}"><span class="ms" style="font-size:20px;font-variation-settings:'FILL' 1">${E(icon)}</span></span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column;text-align:left"><span style="font-size:14px;font-weight:500">${E(label)}</span><span style="font-size:11px;color:#8e8d89">${E(sub)}</span></span>
          <span style="${S(w.track)}"><span style="${S(w.knob)}"></span></span>
        </button>`;
    }

    /* ---------- handlinger ---------- */
    tab(e, k) { this.setState({ tab: k }); }
    togRow(e, id) { if (!id) return; const d = id.split('.')[0]; if (d === 'switch' || d === 'input_boolean') this.call(d, this.isOn(id) ? 'turn_off' : 'turn_on', { entity_id: id }); else this.more(id); }
    moreId(e, id) { this.more(id); }
    toggleAway() { this.togRow(null, 'switch.ki_helgemodus'); }
    mode(e, id) {
      if (/^binary_sensor\./.test(id)) return this.more(id);
      if (id === 'switch.ki_hjemkomst_aktiv') return this.call('ki_energi', this.isOn(id) ? 'hjemkomst_ferdig' : 'hjemkomst', {});
      this.togRow(e, id);
    }
    bed(e, key) { const l = this.laster().find((x) => x.key === key); if (l) this.call('ki_energi', 'leggetid', { sone: key, avbryt: !!l.leggetid }); }
    pickZone(e, key) { this.setState({ zone: this.state.zone === key ? null : key }); }
    closeZone() { this.setState({ zone: null }); }
    step(e, dir) {
      const l = this.zones().find((x) => x.key === this.state.zone); if (!l) return;
      const cur = this._zoneSet(l); const v = Math.round((cur + Number(dir) * 0.5) * 2) / 2;
      if (this.isMan(l)) { const cl = this.climates(l); if (cl.length) this.call('climate', 'set_temperature', { entity_id: cl, temperature: v }); this.setState({ set: { ...this.state.set, [l.key]: v } }); return; }
      if (l.overstyrt) { const r = this.remaining(l); this.call('ki_energi', 'overstyr', { sone: l.key, temp: v, minutter: Math.max(5, r ? r.min : 60) }); this.setState({ set: { ...this.state.set, [l.key]: null } }); return; }
      this.setState({ set: { ...this.state.set, [l.key]: v } });
    }
    dur(e, t) {
      const l = this.zones().find((x) => x.key === this.state.zone); if (!l) return;
      const active = l.overstyrt && this.state.dur[l.key] === t;
      if (active) { this.call('ki_energi', 'fjern_overstyring', { sone: l.key }); this.setState({ dur: { ...this.state.dur, [l.key]: null } }); return; }
      this.call('ki_energi', 'overstyr', { sone: l.key, temp: this._zoneSet(l), minutter: { '1 t': 60, '2 t': 120, '6 t': 360 }[t] || 60 });
      this.setState({ dur: { ...this.state.dur, [l.key]: t }, set: { ...this.state.set, [l.key]: null } });
    }
    water(e, k) { this.setState({ water: k }); }
    boost() { this.call('ki_energi', this.isOn('binary_sensor.ki_vvb_boost_aktiv') ? 'vvb_avbryt_boost' : 'vvb_boost', {}); }
    force() { this.call('ki_energi', 'vvb_tving_syklus', {}); }
    motor() { this.togRow(null, 'switch.ki_skyggemodus'); }
    hkSwitch(e, id) { if (id) this.call('switch', this.v(id) === 'on' ? 'turn_off' : 'turn_on', { entity_id: id }); }

    _zoneSet(l) {
      const p = this.state.set[l.key];
      if (p != null) return p;
      if (l.overstyrt && l.overstyrt_temp != null) return Number(l.overstyrt_temp);
      if (this.isMan(l)) { const cl = this.climates(l)[0]; const t = cl ? num(this.at(cl, 'temperature')) : null; if (t != null) return t; }
      return l.mal != null ? Number(l.mal) : 22;
    }

    /** Effekt siste 6 timer i 18 bøtter à 20 min (uregulert + styrt, kW) */
    _effekt6() {
      const c = this.config, end = this.now(), start = new Date(end - 6 * 3600e3);
      const ids = [c.uregulert, c.styrt];
      const key = `kd-klima-eff6|${ids.join(',')}|${Math.floor(end / 120e3)}`;
      return this.cached(key, 120e3, () => this.ws({ type: 'history/history_during_period', start_time: start.toISOString(), end_time: end.toISOString(), entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false })
        .then((r) => {
          const bucket = (id) => {
            const pts = ((r && r[id]) || []).map((p) => [(p.lu || p.lc) * 1000, parseFloat(p.s)]).filter((p) => !isNaN(p[1])).sort((x, y) => x[0] - y[0]);
            const out = []; let last = pts.length ? pts[0][1] : 0, j = 0;
            for (let i = 0; i < 18; i++) {
              const b0 = start.getTime() + i * 1200e3, b1 = b0 + 1200e3; let sum = 0, n = 0;
              while (j < pts.length && pts[j][0] < b0) last = pts[j++][1];
              let k = j; while (k < pts.length && pts[k][0] < b1) { sum += pts[k][1]; n++; last = pts[k][1]; k++; }
              out.push(n ? sum / n : last);
            }
            return out;
          };
          return { u: bucket(c.uregulert), s: bucket(c.styrt) };
        }), null);
    }

    /* ---------- faner: ekstrakort (designets extraVals) ---------- */
    extras(tab) {
      const c = this.config;
      const out = [];
      if (tab === 'ov') {
        if (this.st(c.bereder)) out.push(this._vvbCard());
        const auto = this.isOn('switch.ki_helg_auto');
        out.push(this.card('luggage', 'Bortemodus', auto ? 'slår seg på automatisk' : 'bare manuelt', { stats: [
          [`${nfk(this.n('number.ki_helg_auto_timer'))} t`, 'før auto'], [`${nfk(this.n('number.ki_temp_helg'))}°`, 'panelovn'],
          [`${nfk(this.n('number.ki_temp_helg_gulvvarme'))}°`, 'gulv'], [`${nfk(this.n('number.ki_temp_helg_bad'))}°`, 'bad']] }));
      }
      if (tab === 'en') {
        const e6 = this._effekt6();
        const u = this.n(c.uregulert), st = this.n(c.styrt);
        const vals = e6 ? e6.u.map((x, i) => ((x || 0) + (e6.s[i] || 0)) / 1000) : [];
        const top = Math.max(2.7, ...vals);
        out.push(this.card('ssid_chart', 'Effekt siste 6 timer', 'uregulert mot styrt', {
          bars: vals.map((v, i) => ({ flex: 1, height: `${Math.max(3, v / top * 100)}%`, borderRadius: 3, background: (e6.s[i] || 0) >= 50 ? A : al(A, 0.5) })),
          note: `Oransje = styrt varme. Nå ${nf((u || 0) / 1000)} + ${nf((st || 0) / 1000)} kW.` }));
        out.push(this.card('rule', 'Grenser', '', { rows: [
          ['Absolutt timegrense', { v: this.nv('number.ki_maks_time_kwh', 2, ' kWh'), pill: 1, go: ['moreId', 'number.ki_maks_time_kwh'] }],
          ['Ønsket trinn: snitt under', { v: this.nv('number.ki_mal_trinn_kw', 1, ' kW'), pill: 1, go: ['moreId', 'number.ki_mal_trinn_kw'] }],
          ['Reserve mot neste trinn', { v: this.nv('number.ki_reserve_topp_kwh', 2, ' kWh'), pill: 1, go: ['moreId', 'number.ki_reserve_topp_kwh'] }],
          ['Laveste timegrense', { v: this.nv('number.ki_min_time_kwh', 1, ' kWh'), pill: 1, go: ['moreId', 'number.ki_min_time_kwh'] }],
          ['Reserve uregulert', { v: this.nv('number.ki_reserve_uregulert_kwh', 2, ' kWh'), pill: 1, go: ['moreId', 'number.ki_reserve_uregulert_kwh'] }],
          ['Maks senking gulvvarme', { v: this.nv('number.ki_shed_gulv_maks', 1, ' °C'), pill: 1, go: ['moreId', 'number.ki_shed_gulv_maks'] }],
          ['Maks senking panelovn', { v: this.nv('number.ki_shed_panel_maks', 1, ' °C'), pill: 1, go: ['moreId', 'number.ki_shed_panel_maks'] }],
          ['Komfortvekt', { v: this.nv('number.ki_komfort_vekt', 0), pill: 1, go: ['moreId', 'number.ki_komfort_vekt'] }]] }));
      }
      if (tab === 'vb' && this.state.water === 'bad') {
        const H = (k, d) => this.at(c.hanklevarmer, k, d);
        const hb = H('bryter', '');
        if (hb) {
          const pa = this.v(hb) === 'on', styr = this.isOn('switch.ki_styr_hanklevarmer');
          const ew = num(H('effekt_w'));
          out.push(this.card('dry_cleaning', 'Håndklevarmer', pa ? 'På' : 'Av', { rows: [
            [pa ? 'Varmer nå' : 'Står av', { dot: pa ? G : '#5d5c5a', sub: H('forklaring', ''), v: ew != null ? `${nf(ew, 0)} W` : '–' }],
            ['Bryteren nå', { sub: styr ? (H('i_vindu') ? 'I dusjvindu — styres av KI' : 'Manuell bruk slås av etter maks på-tid') : 'Slås på igjen automatisk', tog: hb, on: pa }],
            ['KI styrer håndklevarmeren', { sub: 'Av = står på konstant', tog: 'switch.ki_styr_hanklevarmer' }]] }));
          out.push(this.card('savings', 'KI sparer', `${nf(num(H('spart_kr_maned', 0)), 0)} kr denne måneden`, {
            stats: [[nf(num(H('spart_kwh_i_dag', 0))), 'kWh spart i dag'], [`${nf(num(H('spart_kr_maned', 0)), 0)} kr`, 'spart denne mnd'], [`${nf(num(H('spart_kr_ar', 0)), 0)} kr`, 'per år med dagens vinduer']],
            note: `Mot å la den stå på hele døgnet: ${nf(num(H('effekt_nominell_w', 46)), 0)} W × ${nf(24 - (num(H('pa_min_i_dag', 0)) || 0) / 60, 1)} t av i dag. Effekten læres fra målingen.` }));
          const ms = this.th('time.ki_hanklevarmer_morgen_start'), me = this.th('time.ki_hanklevarmer_morgen_slutt');
          const ks = this.th('time.ki_hanklevarmer_kveld_start'), ke = this.th('time.ki_hanklevarmer_kveld_slutt');
          const segs = [];
          if (ms != null && me != null) segs.push([ms, me, `Morgen ${this.ts('time.ki_hanklevarmer_morgen_start')}–${this.ts('time.ki_hanklevarmer_morgen_slutt')}`, G]);
          if (ks != null && ke != null) segs.push([ks, ke, `Kveld ${this.ts('time.ki_hanklevarmer_kveld_start')}–${this.ts('time.ki_hanklevarmer_kveld_slutt')}`, G]);
          out.push(this.card('shower', 'Dusjvinduer', `${this.tm('time.ki_hanklevarmer_morgen_start')}–${this.tm('time.ki_hanklevarmer_morgen_slutt')} · ${this.tm('time.ki_hanklevarmer_kveld_start')}–${this.tm('time.ki_hanklevarmer_kveld_slutt')}`, { lines: [['Håndklevarmer', segs]] }));
        }
        const bad = this.zones().find((l) => /bad/i.test(`${l.key} ${l.rom || ''}`) && l.type === 'gulv') || this.zones().find((l) => /bad/i.test(`${l.key} ${l.rom || ''}`));
        if (bad) {
          const [k, sub] = split(bad.forklaring);
          const h = HANDLING[bad.venter ? 'venter' : bad.handling] || ['', '#5d5c5a'];
          const w = this.powerW(bad);
          out.push(this.card(bad.type === 'gulv' ? 'floor' : 'heat', bad.navn, `${bad.naa != null ? nf(bad.naa, 1) : '–'}° · mål ${nfk(bad.mal)}°`, { rows: [[k || h[0], { dot: h[1], sub, v: w != null ? `${nf(w, 0)} W` : `${nf(bad.effekt || 0)} kW` }]] }));
        }
      }
      if (tab === 'ta') {
        const L = this.laster();
        out.push(this.card('checklist', 'Vurdering per sone', 'sortert som motoren prioriterer', { rows: L.map((l) => {
          const h = HANDLING[l.venter ? 'venter' : l.handling] || [l.handling || '–', '#a9a7a2'];
          const grey = h[1] === '#a9a7a2';
          return [l.navn, { dot: grey ? '#5d5c5a' : h[1], chip: [h[0], h[1]], sub: l.forklaring || '', v: `${nf(l.effekt || 0)} kW` }];
        }) }));
        const tau = this.at(c.tidskonstanter, 'soner', {}) || {};
        if (Object.keys(tau).length) out.push(this.card('timer', 'Innlærte tidskonstanter', 'treghet · oppvarming', { rows: Object.entries(tau).map(([navn, v]) => [navn, { sub: `${v.malinger || 0} målinger`, v: `${v.tau_timer != null ? nf(v.tau_timer, 1) : '–'} t · ${v.grader_per_time != null ? nf(v.grader_per_time, 1) : '–'} °C/t` }]),
          note: 'Tidskonstanten er hvor lenge rommet holder på overtemperaturen. Lang konstant betyr at nattsenking sjelden lønner seg.' }));
      }
      if (tab === 'op') {
        const regler = this.at(c.lys, 'regler', []) || [];
        if (regler.length) out.push(this.card('lightbulb', 'Lys', `${nf(num(this.at(c.lys, 'spart_kr_maned', 0)), 0)} kr spart denne måneden`, { rows: regler.map((r) => {
          const demp = r.type === 'demp';
          return [`${demp ? 'Natt' : 'Glemt'} · ${r.navn || r.key}`, { chip: demp ? ['nattdemping', '#a9a7a2'] : ['glemt lys', G], sub: r.tekst || '', tog: `switch.ki_lys_${r.key}`, on: this.st(`switch.ki_lys_${r.key}`) ? undefined : !!r.aktiv }];
        }) }));
        out.push(this.card('notifications', 'Varslinger', '', { rows: [
          ['Effektgrense', { sub: 'Når en time ender over grensen', tog: 'switch.ki_varsel_effekt' }], ['Helg', { sub: 'Fredags- og søndagsspørsmål', tog: 'switch.ki_varsel_helg' }],
          ['Hjemkomst', { sub: 'Når oppvarming starter', tog: 'switch.ki_varsel_hjemkomst' }], ['Sommermodus', { sub: 'Når den slås av/på automatisk', tog: 'switch.ki_varsel_sommer' }],
          ['Varmtvann', { sub: 'Feil og forfalt legionella varsles alltid', tog: 'switch.ki_varsel_vvb' }], ['Håndklevarmer', { sub: 'Sikkerhetsavstenging', tog: 'switch.ki_varsel_hanklevarmer' }]] }));
        const pers = (this.sa('personer', []) || []).filter((p) => p && p.type !== 'voksen');
        const span = (a0, b0, t, col) => (a0 == null || b0 == null ? [] : b0 >= a0 ? [[a0, b0, t, col]] : [[a0, 24, t, col], [0, b0, '', col]]);
        const tl = [['Huset', span(this.th('time.ki_tid_dag_start'), this.th('time.ki_tid_natt_start'), `Dag ${this.tm('time.ki_tid_dag_start')}–${this.tm('time.ki_tid_natt_start')}`, G)]];
        pers.forEach((p) => {
          const k = p.key, fra = p.type === 'barn' ? `time.ki_${k}_dag` : `time.ki_${k}_vekking`, til = `time.ki_${k}_natt`;
          tl.push([p.navn, span(this.th(fra), this.th(til), `Våken ${this.tm(fra)}–${this.tm(til)}`, p.type === 'barn' ? PURPLE : B)]);
        });
        const sr = this.th('time.ki_stue_reduksjon_fra');
        if (sr != null) tl.push(['Stue', [[sr, 24, '', A]]]);
        out.push(this.card('schedule', 'Tider', 'døgnet i huset', { lines: tl }));
        const t = (id) => ({ v: this.tm(id), pill: 1, go: ['moreId', id] });
        out.push(this.card('wb_twilight', 'Dag og natt', `${this.tm('time.ki_tid_dag_start')}–${this.tm('time.ki_tid_natt_start')}`, { rows: [['Dag starter', t('time.ki_tid_dag_start')], ['Natt starter', t('time.ki_tid_natt_start')], ['Nattsenk kun under', { v: this.nv('number.ki_natt_senk_ute_grense', 0, ' °C'), pill: 1, go: ['moreId', 'number.ki_natt_senk_ute_grense'] }]] }));
        pers.forEach((p) => {
          const k = p.key;
          if (p.type === 'barn') out.push(this.card('person', p.navn, `${this.tm(`time.ki_${k}_dag`)}–${this.tm(`time.ki_${k}_natt`)}`, { rows: [['Opp', t(`time.ki_${k}_dag`)], ['Legger seg', t(`time.ki_${k}_natt`)], ['Borte fra', t(`time.ki_${k}_borte_fra`)], ['Hjemme igjen', t(`time.ki_${k}_borte_til`)]] }));
          else out.push(this.card('person', p.navn, `${this.tm(`time.ki_${k}_vekking`)}–${this.tm(`time.ki_${k}_natt`)}`, { rows: [['Vekking', t(`time.ki_${k}_vekking`)], ['Vekking helg', t(`time.ki_${k}_vekking_helg`)], ['Legger seg', t(`time.ki_${k}_natt`)]] }));
        });
        const nr = (id, d, u) => ({ v: this.nv(id, d, u), pill: 1, go: ['moreId', id] });
        out.push(this.card('weekend', 'Stue og vindu', '', { rows: [['Stue reduksjon fra', t('time.ki_stue_reduksjon_fra')], ['Stue reduksjon', nr('number.ki_stue_reduksjon', 1, ' °C')], ['Vindu: vent før senking', nr('number.ki_vindu_forsinkelse_min', 0, ' min')], ['Vindu: hold temperatur', nr('number.ki_vindu_temp', 1, ' °C')]] }));
      }
      if (tab === 'av') {
        const nr = (id, d, u) => ({ v: this.nv(id, d, u), pill: 1, go: ['moreId', id] });
        out.push(this.card('palette', 'Terskler for fargesonene', 'prosent av tillatt effekt', { rows: [['Gul fra', { dot: A, ...nr('number.ki_sone_gul', 0, ' %') }], ['Oransje fra', { dot: ORANGE, ...nr('number.ki_sone_oransje', 0, ' %') }], ['Rød fra', { dot: R, ...nr('number.ki_sone_rod', 0, ' %') }]],
          note: 'Motoren senker først når den ikke får plass i budsjettet. Fargene styrer varsling og hvor tidlig varmtvannet må vike, ikke selve utkoblingen.' }));
        const pl = this.st(c.prognoselaering), pa = (pl && pl.attributes) || {};
        const pst = pl ? ({ laerer: 'lærer', aktiv: 'adaptiv margin aktiv', usikkert_grunnlag: 'usikkert grunnlag', av: 'fast reserve' }[pl.state] || pl.state) : 'ingen data';
        const t = (a0, b0) => `${this.tm(a0)}–${this.tm(b0)}`;
        out.push(this.card('query_stats', 'Prognose og reserver', pst, {
          stats: [[nf(num(pa.forventet_slutt_kwh)), 'forventet (kWh)'], [`+${nf(num(pa.kwh))}`, 'usikkerhet (kWh)'], [nf(num(pa.strategisk_reserve_kwh)), 'strategisk reserve']],
          rows: [['Fast reserve (fallback)', nr('number.ki_reserve_uregulert_kwh', 2, ' kWh')], ['Margin minimum', nr('number.ki_prognose_margin_min', 2, ' kWh')], ['Margin maksimum', nr('number.ki_prognose_margin_maks', 2, ' kWh')],
            ['Minste grunnlag', nr('number.ki_prognose_min_obs', 0, ' obs')], ['Reserve frokost', nr('number.ki_reserve_frokost_kwh', 1, ' kW')], ['Reserve middag', nr('number.ki_reserve_middag_kwh', 1, ' kW')],
            ['Frokost', { v: t('time.ki_frokost_start', 'time.ki_frokost_slutt'), pill: 1, go: ['moreId', 'time.ki_frokost_start'] }], ['Middag', { v: t('time.ki_middag_start', 'time.ki_middag_slutt'), pill: 1, go: ['moreId', 'time.ki_middag_start'] }]],
          note: pa.grunn || '' }));
        out.push(this.card('event_repeat', 'Moduser og unntak', '', { rows: [['Helgetemperatur', nr('number.ki_temp_helg', 1, ' °C')], ['Helg gulvvarme', nr('number.ki_temp_helg_gulvvarme', 1, ' °C')], ['Helg bad', nr('number.ki_temp_helg_bad', 1, ' °C')],
          ['Sommertemperatur', nr('number.ki_temp_sommer', 1, ' °C')], ['Sommer fra måned', nr('number.ki_sommer_start_maned', 0)], ['Sommer til måned', nr('number.ki_sommer_slutt_maned', 0)],
          ['Sommer når ute over', nr('number.ki_sommer_ute_grense', 0, ' °C')], ['Helg auto etter', nr('number.ki_helg_auto_timer', 0, ' t borte')]] }));
        const th = (id) => this.th(id);
        const one = (id, lbl, col) => { const h = th(id); return h == null ? [] : [[h, Math.min(24, h + 1), lbl, col]]; };
        const sq = th('time.ki_helg_sporsmal_tid'), fr = th('time.ki_helg_frist_tid'), hj = th('time.ki_hjemkomst_tid');
        const sun = [];
        if (sq != null && fr != null) sun.push([sq, fr, 'Svarfrist', A]);
        if (fr != null && hj != null) sun.push([fr, hj, 'Oppvarm.', G]);
        const venter = this.isOn('switch.ki_helg_venter_svar');
        out.push(this.card('forum', 'Helgevarsler', 'torsdag, fredag og søndag', {
          lines: [['Torsdag', one('time.ki_helg_varsel_tid_torsdag', `Spør ${this.tm('time.ki_helg_varsel_tid_torsdag')}`, B)], ['Fredag', one('time.ki_helg_varsel_tid', `Spør ${this.tm('time.ki_helg_varsel_tid')}`, B)], ['Søndag', sun]],
          rows: [['Spør torsdag', { v: this.tm('time.ki_helg_varsel_tid_torsdag'), tog: 'switch.ki_helg_spor_torsdag' }], ['Spør fredag', { v: this.tm('time.ki_helg_varsel_tid'), tog: 'switch.ki_helg_spor_fredag' }],
            ['Forventet hjemkomst', { v: this.tm('time.ki_hjemkomst_tid'), pill: 1, go: ['moreId', 'time.ki_hjemkomst_tid'] }], ['Venter på svar', { dot: venter ? A : '#5d5c5a', v: venter ? 'Ja' : 'Nei' }]] }));
      }
      return out.join('');
    }

    _vvbCard() {
      const c = this.config, V = (k, d) => this.at(c.bereder, k, d);
      const varmer = !!V('varmer'), bryterPa = !!V('bryter_pa');
      const [meta, sub] = split(this.v(c.vvb_forklaring) || V('forklaring', ''));
      const ew = num(V('effekt_w'));
      const leg = this._leg();
      return this.card('water_heater', 'Varmtvann', meta || this.v(c.bereder), { rows: [
        [!V('bryter') ? 'Ikke satt opp' : varmer ? 'Varmer nå' : bryterPa ? 'Bryter på, trekker ikke effekt' : 'Står stille', { dot: varmer ? G : '#5d5c5a', sub, v: ew != null ? `${nf(ew, 0)} W` : '–', go: V('bryter') ? ['moreId', V('bryter')] : null }],
        [`Legionella: ${leg.kort}`, { dot: leg.col, sub: `Sist sikret ${this.dato(V('siste_syklus'))} · frist ${this.dag(V('neste_frist'))}`, go: ['tab', 'vb'] }]] });
    }
    _leg() {
      const V = (k, d) => this.at(this.config.bereder, k, d);
      if (!V('legionella_aktiv', true)) return { kort: 'Av', lang: 'Legionellasikring av', col: '#8e8d89', icon: 'shield' };
      if (V('forfalt')) return { kort: 'Forfalt', lang: 'Legionella forfalt', col: R, icon: 'gpp_bad' };
      if (V('sikret')) return { kort: 'Sikret', lang: 'Legionella sikret', col: G, icon: 'verified_user' };
      return { kort: 'Bør kjøres', lang: 'Legionella bør kjøres', col: A, icon: 'shield' };
    }

    /* ---------- render ---------- */
    body() {
      const s = this.state, c = this.config;
      const tabK = s.tab || (T.some(([k]) => k === c.fane) ? c.fane : 'ov');
      const st = this.st(c.status);
      const now = num(this.sa('forventet_effekt_kw')), lim = num(this.sa('tillatt_effekt_kw'));
      const frac = now != null && lim ? now / lim : 0;
      const col = (st && SONE_FARGE[st.state]) || (frac > 0.97 ? R : frac > 0.75 ? A : G);
      const away = this.isOn('switch.ki_helgemodus');
      const statusT = st ? (SONE_TEKST[st.state] || st.state) : 'Venter på motoren';
      const mins = num(this.sa('minutter_igjen'));

      const glow = { position: 'absolute', left: '50%', top: -40, width: 320, height: 240, marginLeft: -160, borderRadius: '50%', background: `radial-gradient(closest-side, ${al(col, 0.2)}, transparent)`, pointerEvents: 'none' };
      const arcTrack = { position: 'absolute', left: 0, top: 0, width: 250, height: 250, borderRadius: '50%', background: 'conic-gradient(from -90deg, #2a2a2d 0 180deg, transparent 180deg)', WebkitMask: 'radial-gradient(circle, transparent 98px, #000 99px)', mask: 'radial-gradient(circle, transparent 98px, #000 99px)' };
      const arcFill = { position: 'absolute', left: 0, top: 0, width: 250, height: 250, borderRadius: '50%', background: `conic-gradient(from -90deg, ${col} 0 ${Math.max(4, Math.min(1, frac) * 180)}deg, transparent 0)`, WebkitMask: 'radial-gradient(circle, transparent 98px, #000 99px)', mask: 'radial-gradient(circle, transparent 98px, #000 99px)', filter: `drop-shadow(0 0 8px ${al(col, 0.6)})` };
      const statusTag = { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: col };
      const heroStats = [[nf(num(this.sa('igjen_kwh'))), 'kWh igjen'], [nf(num(this.sa('ledig_kw'))), 'kW ledig'], [mins != null ? `${Math.round(mins)} min` : '–', 'igjen av timen']];
      const awayPill = { position: 'relative', height: 36, padding: '0 14px', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', background: away ? al(B, 0.22) : '#262629', color: away ? '#e6eef8' : '#c9c7c2', transition: 'background .3s' };

      // Moduser (bare de som finnes). Ungdom får egen feriebryter fra KI Energi.
      const pers = this.sa('personer', []) || [];
      const short = (n) => (String(n).length > 6 ? String(n).slice(0, 3) + '.' : n);
      const modes = [['switch.ki_helgemodus', 'luggage', 'Borte'], ['binary_sensor.ki_alle_borte', 'logout', 'Alle borte'], ['switch.ki_hjemkomst_aktiv', 'home', 'Hjemkomst'], ['switch.ki_sommermodus', 'light_mode', 'Sommer'],
        ...pers.filter((p) => p && p.type === 'ungdom').map((p) => [`switch.ki_${p.key}_ferie`, 'school', `${short(p.navn)} ferie`])].filter(([id]) => this.st(id));
      const modesHtml = modes.map(([id, icon, label]) => {
        const on = this.isOn(id);
        const bubble = { width: 58, height: 58, borderRadius: 29, display: 'grid', placeItems: 'center', background: on ? PINK : '#1c1c1f', color: on ? '#2a1720' : '#c9c7c2', boxShadow: on ? '0 6px 18px rgba(240,140,190,0.3)' : 'inset 0 0 0 1px rgba(255,255,255,0.05)', transform: on ? 'scale(1.06)' : 'scale(1)', transition: 'transform .35s cubic-bezier(.34,1.8,.64,1), background .25s' };
        const iconStyle = { fontSize: 24, fontVariationSettings: `'FILL' ${on ? 1 : 0}` };
        const labelStyle = { fontSize: 11, fontWeight: 500, color: on ? '#f2f1ee' : '#8e8d89', whiteSpace: 'nowrap' };
        return `<button data-on-click="mode" data-arg="${id}" style="flex:none;display:flex;flex-direction:column;align-items:center;gap:6px;width:66px">
        <span style="${S(bubble)}"><span class="ms" style="${S(iconStyle)}">${E(icon)}</span></span>
        <span style="${S(labelStyle)}">${E(label)}</span>
      </button>`;
      }).join('');

      const tabs = T.map(([k, label, icon]) => {
        const act = tabK === k;
        const st2 = { height: 54, borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, background: act ? PINK : 'transparent', color: act ? '#2a1720' : '#a9a7a2', transition: 'background .25s' };
        return `<button data-on-click="tab" data-arg="${k}" style="${S(st2)}"><span class="ms" style="${S({ fontSize: 20, fontVariationSettings: `'FILL' ${act ? 1 : 0}` })}">${E(icon)}</span><span style="font-size:9.5px;font-weight:500;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis">${E(label)}</span></button>`;
      }).join('');

      let main = '';
      if (tabK === 'ov') main = this._ov(lim);
      else if (tabK === 'so') main = this._so();
      else if (tabK === 'en') main = this._en();
      else if (tabK === 'vb') main = this._vb();
      else if (tabK === 'ta') main = this._ta();
      else if (tabK === 'op') main = this._op();

      return `<div style="box-sizing:border-box;width:100%;max-width:420px;min-height:100vh;margin:0 auto;background:#141416;padding:20px 14px 40px;display:flex;flex-direction:column;gap:16px">
  <header style="display:flex;align-items:center;gap:12px;padding:0 4px">
    <span style="width:40px;height:40px;border-radius:20px;background:#e9e8e4;color:#141416;display:grid;place-items:center;flex:none"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">thermostat</span></span>
    <div style="flex:1;font-size:26px;font-weight:500;letter-spacing:-0.02em">Klima</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section style="position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;padding:20px 16px 16px;border-radius:32px;background:#1c1c1f;overflow:hidden">
    <div style="${S(glow)}"></div>
    <div style="position:relative;width:250px;height:136px">
      <div style="position:absolute;inset:0;overflow:hidden"><div style="${S(arcTrack)}"></div><div style="${S(arcFill)}"></div></div>
      <div style="position:absolute;left:-20px;right:-20px;bottom:6px;display:flex;flex-direction:column;align-items:center;gap:0">
        <span style="${S(statusTag)}">${E(statusT)}</span>
        <span style="font-size:44px;font-weight:300;letter-spacing:-0.04em;line-height:1.05;font-variant-numeric:tabular-nums;white-space:nowrap">${E(nf(now))}<span style="font-size:15px;color:#8e8d89;letter-spacing:0"> kW</span></span>
        <span style="font-size:12px;color:#8e8d89;white-space:nowrap">av ${E(nf(lim))} kW tillatt</span>
      </div>
    </div>
    <div style="position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:100%">
      ${heroStats.map(([v, k]) => `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 4px;border-radius:18px;background:#262629"><span style="font-size:17px;font-weight:600;font-variant-numeric:tabular-nums">${E(v)}</span><span style="font-size:10px;color:#8e8d89">${E(k)}</span></div>`).join('')}
    </div>
    ${this.st('switch.ki_helgemodus') ? `<button data-on-click="toggleAway" style="${S(awayPill)}"><span class="ms" style="font-size:16px;font-variation-settings:'FILL' 1">${E(away ? 'luggage' : 'home')}</span>${E(away ? 'Borte · helgemodus' : 'Hjemme · normal komfort')}</button>` : ''}
  </section>

  <section data-hscroll="1" style="display:flex;gap:12px;overflow-x:auto;scrollbar-width:none;margin:0 -14px;padding:2px 18px">${modesHtml}</section>

  <nav style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px;padding:4px;border-radius:24px;background:#1c1c1f">${tabs}</nav>
  ${main}
  ${this.extras(tabK)}
</div>`;
    }

    /* ----- Oversikt ----- */
    _ov() {
      const c = this.config, N = (k, d) => this.at(c.nettleie, k, d);
      const grense = num(this.sa('grense_kwh'));
      const rows = (N('timer_siste_12', []) || []).map((t) => ({ start: t.start, kwh: num(t.kwh) }));
      const cur = num(this.sa('forbrukt_kwh'));
      if (cur != null) rows.push({ start: Math.floor(this.now() / 3600e3) * 3600, kwh: cur, naa: true });
      const H = rows.slice(-12);
      const L = grense || Math.max(0.5, ...H.map((r) => r.kwh || 0));
      const hist = H.map((r) => ({ flex: 1, height: Math.min(96, Math.max(3, (r.kwh || 0) / L * 88)), borderRadius: 6, background: r.naa ? G : (r.kwh || 0) > L ? R : '#3a3a3d' }));
      const labels = H.map((r) => pad(new Date(r.start * 1000).getHours()));
      const PA = (k) => { const v = num(this.at(c.prognose, k)); return v != null ? v : num(this.sa(k.replace('om_', 'prognose_').replace('_min_kw', '_kw'))); };
      const lim = num(this.sa('tillatt_effekt_kw')) || L;
      const fc = [['om_15_min_kw', '15 min'], ['om_30_min_kw', '30 min'], ['om_60_min_kw', '1 t'], ['om_120_min_kw', '2 t']].map(([k, lbl]) => [PA(k), lbl]);
      const peak = fc.reduce((m, x) => (x[0] != null && (m == null || x[0] > m[0]) ? x : m), null);
      const fMeta = !peak ? '–' : peak[0] <= lim ? 'ingen topp i sikte' : `topp om ${peak[1]}`;
      const bedL = this.laster().filter((l) => l.person && (l.person_type === 'barn' || l.person_type === 'ungdom')).sort((x, y) => String(x.person).localeCompare(String(y.person)));
      return `<section style="display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:28px;background:#1c1c1f">
      <div style="display:flex;justify-content:space-between"><span style="font-size:15px;font-weight:500">Siste 12 timer</span><span style="font-size:12px;color:#8e8d89">grense ${E(nf(grense))} kWh</span></div>
      <div style="position:relative;display:flex;align-items:flex-end;gap:4px;height:96px">
        <span style="position:absolute;left:0;right:0;bottom:88px;border-top:1px dashed #5d5c5a"></span>
        ${hist.map((b) => `<span style="${S(b)}"></span>`).join('')}
      </div>
      <div style="display:flex;gap:4px">${labels.map((x) => `<span style="flex:1;text-align:center;font-size:9px;color:#6d6c69;font-variant-numeric:tabular-nums">${E(x)}</span>`).join('')}</div>
    </section>
    <section style="display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:28px;background:#1c1c1f">
      <div style="display:flex;justify-content:space-between"><span style="font-size:15px;font-weight:500">Forventet effekt</span><span style="font-size:12px;color:#8e8d89">${E(fMeta)}</span></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
        ${fc.map(([v, k]) => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 4px;border-radius:18px;background:#262629">
            <span style="position:relative;width:8px;height:44px;border-radius:4px;background:#1c1c1f;overflow:hidden"><span style="${S({ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${Math.min(100, (v || 0) / lim * 100 + 6)}%`, background: v != null && v > lim ? R : G, borderRadius: 4 })}"></span></span>
            <span style="font-size:14px;font-weight:600;font-variant-numeric:tabular-nums">${E(v != null ? nf(v, 1) : '–')}</span>
            <span style="font-size:10px;color:#8e8d89">${E(k)}</span>
          </div>`).join('')}
      </div>
    </section>
    ${bedL.length ? `<section style="display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;justify-content:space-between;padding:0 6px"><span style="font-size:15px;font-weight:500">Leggetid</span><span style="font-size:12px;color:#8e8d89">trykk når noen legger seg</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${bedL.map((l) => {
          const on = !!l.leggetid;
          const pill = { display: 'flex', alignItems: 'center', gap: 10, height: 62, padding: '0 12px 0 6px', borderRadius: 31, background: on ? PINK : '#1c1c1f', color: on ? '#2a1720' : '#f2f1ee', transition: 'background .25s, transform .2s' };
          const iconWrap = { width: 50, height: 50, borderRadius: 25, flex: 'none', display: 'grid', placeItems: 'center', background: on ? 'rgba(42,23,32,0.12)' : '#2a2a2d' };
          return `<button class="kd-kl-p" data-on-click="bed" data-arg="${KD.e(l.key)}" style="${S(pill)}">
            <span style="${S(iconWrap)}"><span class="ms" style="font-size:20px;font-variation-settings:'FILL' 1">bed</span></span>
            <span style="display:flex;flex-direction:column;text-align:left"><span style="font-size:14px;font-weight:500">${E(l.person)}</span><span style="font-size:11px;opacity:0.7">${E(on ? 'Nattsenking aktiv' : TYPE_NAVN[l.type] || l.navn)}</span></span>
          </button>`;
        }).join('')}
      </div>
    </section>` : ''}`;
    }

    /* ----- Soner ----- */
    _so() {
      const s = this.state, Z = this.zones();
      const z = Z.find((l) => l.key === s.zone);
      let detail = '';
      if (z) {
        const man = this.isMan(z), set = this._zoneSet(z), r = z.overstyrt ? this.remaining(z) : null;
        const ai = z.styr ? this.isOn(z.styr) : !man, w = this.sw(ai), dur = z.overstyrt ? (s.dur[z.key] || null) : null;
        const pending = s.set[z.key] != null && !man && !z.overstyrt;
        const iconWrap = { width: 48, height: 48, borderRadius: 24, flex: 'none', display: 'grid', placeItems: 'center', background: man ? '#2a2a2d' : G, color: man ? '#a9a7a2' : '#141416' };
        const sub = man ? (z.forklaring || '') : `${z.forklaring || ''} · nå ${z.naa != null ? nf(z.naa, 1) : '–'}°`;
        const setSub = z.overstyrt ? `overstyrt i ${r ? r.t : '–'}` : pending ? 'velg varighet for å overstyre' : man ? 'manuelt settpunkt' : `mål fra motoren ${nfk(z.mal)}°`;
        detail = `<section style="display:flex;flex-direction:column;gap:14px;padding:16px;border-radius:28px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.06)">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="${S(iconWrap)}"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">${E(this.zoneIcon(z))}</span></span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:16px;font-weight:600">${E(z.navn)}</span><span style="font-size:12px;color:#8e8d89;text-wrap:pretty">${E(sub)}</span></span>
          <button data-on-click="closeZone" style="width:36px;height:36px;border-radius:18px;background:#262629;display:grid;place-items:center;flex:none"><span class="ms" style="font-size:18px">close</span></button>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px;border-radius:30px;background:#262629">
          <button class="kd-kl-p2" data-on-click="step" data-arg="-1" style="width:48px;height:48px;border-radius:24px;background:#1c1c1f;display:grid;place-items:center"><span class="ms" style="font-size:22px">remove</span></button>
          <span style="display:flex;flex-direction:column;align-items:center"><span style="font-size:30px;font-weight:300;letter-spacing:-0.03em;font-variant-numeric:tabular-nums">${E(nf(set, 1))}°</span><span style="font-size:11px;color:#8e8d89">${E(setSub)}</span></span>
          <button class="kd-kl-p2" data-on-click="step" data-arg="1" style="width:48px;height:48px;border-radius:24px;background:#1c1c1f;display:grid;place-items:center"><span class="ms" style="font-size:22px">add</span></button>
        </div>
        <div style="display:flex;gap:6px">
          ${['1 t', '2 t', '6 t'].map((t) => `<button data-on-click="dur" data-arg="${t}" style="${S({ flex: 1, height: 38, borderRadius: 19, fontSize: 13, fontWeight: 500, background: dur === t ? PINK : '#262629', color: dur === t ? '#2a1720' : '#c9c7c2' })}">${E(t)}</button>`).join('')}
        </div>
        ${z.styr ? `<button data-on-click="togRow" data-arg="${KD.e(z.styr)}" style="display:flex;align-items:center;gap:12px;text-align:left">
          <span class="ms" style="font-size:20px;color:#a9a7a2">smart_toy</span>
          <span style="flex:1;display:flex;flex-direction:column"><span style="font-size:14px;font-weight:500">KI styrer sonen</span><span style="font-size:11px;color:#8e8d89">Av = motoren rører den ikke</span></span>
          <span style="${S(w.track)}"><span style="${S(w.knob)}"></span></span>
        </button>` : ''}
      </section>`;
      }
      return `${detail}
    <section style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${Z.map((l) => {
        const act = s.zone === l.key, man = this.isMan(l), over = l.overstyrt ? (this.remaining(l) || { t: 'Manuell' }).t : null;
        const goalV = s.set[l.key] != null ? s.set[l.key] : l.overstyrt && l.overstyrt_temp != null ? Number(l.overstyrt_temp) : l.mal;
        const tagT = over || (man ? 'Manuell' : (l.styr && this.st(l.styr) ? this.isOn(l.styr) : true) ? 'KI' : 'Av');
        const card = { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 26, background: act ? al(G, 0.12) : '#1c1c1f', boxShadow: act ? `inset 0 0 0 1px ${al(G, 0.45)}` : 'none', transition: 'background .25s, transform .2s' };
        const iconWrap = { width: 38, height: 38, borderRadius: 19, display: 'grid', placeItems: 'center', background: man ? '#2a2a2d' : al(G, 0.2), color: man ? '#8e8d89' : G };
        const tag = { fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 8, background: over ? al(P, 0.2) : '#262629', color: over ? P : '#a9a7a2' };
        return `<button class="kd-kl-p" data-on-click="pickZone" data-arg="${KD.e(l.key)}" style="${S(card)}">
          <span style="display:flex;justify-content:space-between;align-items:center;width:100%">
            <span style="${S(iconWrap)}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">${E(this.zoneIcon(l))}</span></span>
            <span style="${S(tag)}">${E(tagT)}</span>
          </span>
          <span style="font-size:26px;font-weight:300;letter-spacing:-0.03em;font-variant-numeric:tabular-nums">${E(l.naa != null ? nf(l.naa, 1) : '–')}°</span>
          <span style="display:flex;flex-direction:column;gap:1px;text-align:left;min-width:0;width:100%"><span style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(l.navn)}</span><span style="font-size:11px;color:#8e8d89">${E(man ? 'Manuell' : `mål ${nfk(goalV)}°`)}</span></span>
        </button>`;
      }).join('')}
    </section>`;
    }

    /* ----- Energi ----- */
    _en() {
      const c = this.config, N = (k, d) => this.at(c.nettleie, k, d);
      const grense = num(this.sa('grense_kwh'));
      const til = num(N('registrert_trinn_til'));
      const tid = N('dagens_maks_time');
      const topp = (N('topp_tre', []) || []).map((t) => num(t.kwh)).filter((v) => v != null);
      const hvorfor = N('hvorfor', this.sa('grense_grunn', '')) || '';
      const note = `${hvorfor}${topp.length ? `${hvorfor ? ' ' : ''}Topp tre denne måneden: ${topp.map((v) => nf(v)).join(' / ')} kWh.` : ''}`;
      const enStats = [[nf(num(N('dagens_maks_kwh'))), `døgnmaks${tid != null ? ` kl. ${pad(tid)}` : ''}`], [nf(num(N('registrert_snitt'))), 'snitt topp 3'], [nf(num(N('forventet_time_kwh'))), 'forventet nå']];
      const sp = this.st(c.sparing), poster = (sp && sp.attributes.poster) || {};
      const PN = [['motor', 'thermostat', 'Varmestyring'], ['bereder', 'water_heater', 'Bereder'], ['hanklevarmer', 'dry_cleaning', 'Håndklevarmer'], ['gardiner', 'curtains', 'Gardiner'], ['lys', 'lightbulb', 'Lys']].filter(([k]) => poster[k]);
      const maxKr = Math.max(0.0001, ...PN.map(([k]) => num(poster[k].kr) || 0));
      const month = MND_LANG[this.now().getMonth()];
      const flyttet = num(this.at(c.besparelse, 'flyttet_kwh'));
      const monthStats = [[this.nv('number.ki_stat_unngatte_topper', 0), 'unngåtte topper'], [this.nv('number.ki_stat_shed_hendelser', 0), 'utkoblinger'], [this.nv('number.ki_stat_flyttet_kwh', 2), 'kWh flyttet'],
        [this.nv(c.besparelse, 0), 'kr spart (est.)'], [nf(num(this.at(c.besparelse, 'spart_nettleie_kr')), 0), 'kr nettleie'], [this.nv('number.ki_stat_komfortavvik', 1), '°Ct komfortavvik']];
      return `<section style="display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:28px;background:#1c1c1f">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-size:15px;font-weight:500">Dynamisk grense</span><span style="font-size:12px;color:#8e8d89">${E(til != null ? `neste trinn ved ${nfk(til)} kW` : '–')}</span></div>
      <div style="display:flex;align-items:baseline;gap:6px"><span style="font-size:40px;font-weight:300;letter-spacing:-0.04em">${E(nf(grense))}</span><span style="font-size:14px;color:#8e8d89">kWh denne timen</span></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
        ${enStats.map(([v, k]) => `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 4px;border-radius:18px;background:#262629"><span style="font-size:16px;font-weight:600;font-variant-numeric:tabular-nums">${E(v)}</span><span style="font-size:10px;color:#8e8d89;text-align:center">${E(k)}</span></div>`).join('')}
      </div>
      <div style="font-size:12px;color:#8e8d89;text-wrap:pretty">${E(note)}</div>
    </section>
    ${sp ? `<section style="display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:28px;background:#1c1c1f">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-size:15px;font-weight:500">KI sparer</span><span style="font-size:12px;color:#8e8d89">${E(flyttet != null ? `${nf(flyttet, 1)} kWh flyttet` : '')}</span></div>
      <div style="display:flex;align-items:baseline;gap:6px"><span style="font-size:40px;font-weight:300;letter-spacing:-0.04em">${E(nf(num(sp.attributes.total_kr_maned != null ? sp.attributes.total_kr_maned : sp.state), 0))}</span><span style="font-size:14px;color:#8e8d89">kr spart i ${E(month)}</span></div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${PN.map(([k, icon, label]) => { const v = num(poster[k].kr) || 0; return `<div style="display:flex;flex-direction:column;gap:5px">
            <div style="display:flex;justify-content:space-between;font-size:13px"><span style="display:flex;align-items:center;gap:8px"><span class="ms" style="font-size:17px;color:#a9a7a2">${E(icon)}</span>${E(label)}</span><span style="font-weight:600;font-variant-numeric:tabular-nums">${E(`${nf(v, 0)} kr`)}</span></div>
            <div style="height:8px;border-radius:4px;background:#262629;overflow:hidden"><div style="${S({ width: `${v / maxKr * 100}%`, height: '100%', borderRadius: 4, background: G })}"></div></div>
          </div>`; }).join('')}
      </div>
    </section>` : ''}
    <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
      ${monthStats.map(([v, k]) => `<div style="display:flex;flex-direction:column;gap:2px;padding:12px;border-radius:20px;background:#1c1c1f"><span style="font-size:18px;font-weight:600;font-variant-numeric:tabular-nums">${E(v)}</span><span style="font-size:10px;color:#8e8d89">${E(k)}</span></div>`).join('')}
    </section>`;
    }

    /* ----- Vann og bad ----- */
    _vb() {
      const s = this.state, c = this.config, V = (k, d) => this.at(c.bereder, k, d);
      const seg = [['ber', 'Bereder', 'water_heater'], ['bad', 'Bad', 'bathtub']].map(([k, label, icon]) => `<button data-on-click="water" data-arg="${k}" style="${S({ height: 48, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, fontWeight: 500, background: s.water === k ? PINK : 'transparent', color: s.water === k ? '#2a1720' : '#a9a7a2', transition: 'background .25s' })}"><span class="ms" style="font-size:19px">${E(icon)}</span>${E(label)}</button>`).join('');
      let ber = '';
      if (s.water === 'ber') {
        const leg = this._leg();
        const dager = this.n('sensor.ki_vvb_dager_siden_siste_syklus', num(V('dager_siden_syklus')));
        const intervall = num(V('intervall_dager', 3)) || 3;
        const legRing = { position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(${leg.col} 0 ${Math.min(1, (dager || 0) / intervall) * 360}deg, #2a2a2d 0)`, WebkitMask: 'radial-gradient(circle, transparent 37px, #000 38px)', mask: 'radial-gradient(circle, transparent 37px, #000 38px)' };
        const varmer = !!V('varmer'), bryterPa = !!V('bryter_pa');
        const frist = V('neste_frist');
        const forkl = this.v(c.vvb_forklaring) || V('forklaring', '');
        const title = !V('bryter') && !V('effekt_sensor') ? 'Bereder ikke satt opp' : varmer ? 'Bereder varmer nå' : bryterPa ? 'Bryter på, trekker ikke effekt' : 'Bereder står stille';
        const doegn = this.at(c.billige_timer, 'doegn', []) || [];
        const pr = doegn.map((x) => num(x.pris)).filter((v) => v != null);
        const maxP = pr.length ? Math.max(...pr) : 0;
        const boost = this.isOn('binary_sensor.ki_vvb_boost_aktiv');
        const bars = doegn.map((x, i) => ({ flex: 1, height: `${maxP > 0 && num(x.pris) != null ? num(x.pris) / (maxP * 0.72 / 0.7) * 100 : 55}%`, borderRadius: 3, background: x.valgt || (boost && i === 0) ? G : '#3a3a3d', transition: 'background .3s' }));
        const lbl = [0, 6, 12, 18, 23].map((i) => (doegn[i] ? pad(doegn[i].t) : ''));
        const bryter = V('bryter', '');
        const btn = (icon, label, handler, on) => `<button class="kd-kl-p" data-on-click="${handler}" style="${S({ height: 52, borderRadius: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 600, background: on ? PINK : '#1c1c1f', color: on ? '#2a1720' : '#f2f1ee', transition: 'background .25s, transform .2s' })}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">${E(icon)}</span>${E(label)}</button>`;
        ber = `<section style="display:flex;align-items:center;gap:16px;padding:16px;border-radius:28px;background:#1c1c1f">
      <div style="position:relative;width:96px;height:96px;flex:none">
        <div style="${S(legRing)}"></div>
        <div style="position:absolute;inset:10px;border-radius:50%;background:#1c1c1f;display:flex;flex-direction:column;align-items:center;justify-content:center"><span class="ms" style="${S({ fontSize: 22, color: leg.col, fontVariationSettings: "'FILL' 1" })}">${E(leg.icon)}</span><span style="font-size:10px;color:#8e8d89">${E(`${dager != null ? nf(dager, 1) : '–'} / ${nfk(intervall)} d`)}</span></div>
      </div>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">
        <span style="${S({ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: leg.col })}">${E(leg.lang)}</span>
        <span style="font-size:16px;font-weight:600">${E(title)}</span>
        <span style="font-size:12px;color:#8e8d89;text-wrap:pretty">${E(`${forkl}${frist ? ` Frist ${this.dag(frist)} ${KD.hm(frist)}.` : ''}`.trim())}</span>
      </div>
    </section>
    ${doegn.length ? `<section style="display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:28px;background:#1c1c1f">
      <div style="display:flex;justify-content:space-between"><span style="font-size:15px;font-weight:500">Prisstyring</span><span style="font-size:12px;color:#8e8d89">grønn = bereder kjører</span></div>
      <div style="display:flex;align-items:flex-end;gap:2px;height:70px">${bars.map((b) => `<span style="${S(b)}"></span>`).join('')}</div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:#6d6c69;font-variant-numeric:tabular-nums">${lbl.map((x) => `<span>${x}</span>`).join('')}</div>
    </section>` : ''}
    <section style="display:flex;flex-direction:column;gap:8px">
      ${bryter ? this.pillRow(bryter, 'power', 'Bryteren nå', `${bryterPa ? 'På' : 'Av'} · vindu ${V('vindu', '–')}`, A, bryterPa, 'hkSwitch') : ''}
      ${this.pillRow('switch.ki_vvb_prisstyring', 'savings', 'VVB prisstyring', 'Velger de billigste timene', G)}
      ${this.pillRow('switch.ki_vvb_legionella_aktiv', 'coronavirus', 'Legionellasikring', 'Kan ikke blokkeres av sparing', G)}
    </section>
    ${bryter ? `<section style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${btn('bolt', 'Boost nå', 'boost', boost)}${btn('sync', 'Tving syklus', 'force', this.isOn('switch.ki_vvb_tvungen_syklus_aktiv'))}</section>` : ''}`;
      }
      return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;padding:4px;border-radius:26px;background:#1c1c1f">${seg}</div>${ber}`;
    }

    /* ----- Tanker ----- */
    _ta() {
      const c = this.config, a = (k) => num(this.sa(k));
      const think = [
        ['Grensen denne timen', this.sa('grense_grunn', '') || '', `${nf(a('grense_kwh'))} kWh`],
        ['Brukt så langt', this.sa('malekilde', '') ? `Fra ${String(this.sa('malekilde')).replace(/^fra\s+/i, '')}` : 'Fra energimåler', `${nf(a('forbrukt_kwh'))} kWh`],
        ['Tillatt snitt resten av timen', `${a('minutter_igjen') != null ? Math.round(a('minutter_igjen')) : '–'} minutter igjen`, `${nf(a('tillatt_effekt_kw'))} kW`],
        ['Uregulert last nå', `Om en time: ${nf(a('uregulert_60_kw'))} kW`, `${nf(a('uregulert_kw'))} kW`],
        ['Ledig til varme', 'Etter reserver og prioriterte laster', `${nf(a('ledig_kw'))} kW`],
      ];
      const linjer = this.at(c.logg, 'linjer', []) || [];
      const LOG = linjer.slice(0, Number(c.logg_antall) || 5);
      return `<section style="display:flex;flex-direction:column;gap:4px;padding:16px;border-radius:28px;background:#1c1c1f">
      <div style="font-size:15px;font-weight:500;padding-bottom:6px">Slik tenker motoren nå</div>
      ${think.map(([k, sub, v]) => `<div style="display:flex;align-items:center;gap:10px;padding:6px 0">
          <span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:13px">${E(k)}</span><span style="font-size:11px;color:#6d6c69">${E(sub)}</span></span>
          <span style="font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap">${E(v)}</span>
        </div>`).join('')}
    </section>
    <section style="display:flex;flex-direction:column;gap:0;padding:16px;border-radius:28px;background:#1c1c1f">
      <div style="display:flex;justify-content:space-between;padding-bottom:10px"><span style="font-size:15px;font-weight:500">Beslutningslogg</span><span style="font-size:12px;color:#8e8d89">${E(`${linjer.length} oppføringer`)}</span></div>
      ${LOG.map((l, i) => {
        // «God margin. Bruker …» → tittel + undertekst. Én setning: hele som tittel, tiltakene under.
        const [title, sub0] = split(l.forklaring);
        const sub = sub0 || (Array.isArray(l.tiltak) ? l.tiltak.join(' · ') : '');
        const col = SONE_FARGE[l.sone] || B;
        const dot = { width: 10, height: 10, borderRadius: 5, marginTop: 4, background: col, boxShadow: `0 0 0 3px ${al(col, 0.2)}`, flex: 'none' };
        const line = { flex: 1, width: 2, background: i === LOG.length - 1 ? 'transparent' : '#2a2a2d', marginTop: 4 };
        return `<div style="display:flex;gap:12px">
          <span style="display:flex;flex-direction:column;align-items:center;width:12px;flex:none"><span style="${S(dot)}"></span><span style="${S(line)}"></span></span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;padding-bottom:14px">
            <span style="display:flex;gap:8px;align-items:baseline"><span style="font-size:12px;color:#8e8d89;font-variant-numeric:tabular-nums">${E(String(l.tid || '').slice(11, 16))}</span><span style="font-size:13px;font-weight:500">${E(title)}</span></span>
            <span style="font-size:11px;color:#8e8d89;text-wrap:pretty">${E(sub)}</span>
          </span>
        </div>`;
      }).join('')}
    </section>`;
    }

    /* ----- Oppsett ----- */
    _op() {
      // «Motoren styrer ovnene» = hovedbryter på og skyggemodus av (samme som i ki-klima-strom-kort)
      const hoved = this.st('switch.ki_energi_hovedbryter') ? this.isOn('switch.ki_energi_hovedbryter') : true;
      const motorOn = hoved && !this.isOn('switch.ki_skyggemodus');
      return `<section style="display:flex;flex-direction:column;gap:8px">
      <div style="font-size:15px;font-weight:500;padding:0 6px">Motor og vann</div>
      ${this.pillRow('switch.ki_skyggemodus', 'heat', 'Motoren styrer ovnene', 'Skriver settpunkt til soner på KI', G, motorOn, 'motor')}
      ${this.pillRow('switch.ki_adaptiv_reserve', 'query_stats', 'Adaptiv reserve', 'Lærer usikkerhetsmargin per time', B)}
      ${this.pillRow('switch.ki_styr_hanklevarmer', 'dry_cleaning', 'Styr håndklevarmer', 'Dusjvinduer og sikkerhetsavstenging', A)}
      ${this.pillRow('switch.ki_tillat_dyrere_trinn', 'trending_up', 'Tillat dyrere trinn', 'Komfort foran fastledd', R)}
      ${this.pillRow('switch.ki_varsel_effekt', 'notifications', 'Varsel ved effektgrense', 'Når en time ender over grensen', P)}
    </section>`;
    }
  }

  KD.define('kd-klima-card', KDKlimaCard, 'KD Klima', 'Klima og energimotoren (KI Energi) – Klima v2');
  KD.sheet('klima', 'kd-klima-card');
})();
