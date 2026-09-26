/*
 * kd-bil-card – pikselkopi av Claude Design «Bil v3» (Tesla Model Y), med ekte data.
 *
 *   type: custom:kd-bil-card        # alt annet er valgfritt («auto config»)
 *   bilde: /local/tesla.png          # valgfritt sidebilde av bilen i toppkortet (ellers tegnet bil)
 *   faner: [lading, kjoring, klima, sparing]   # valgfritt; standard: alle som har data
 * Batterinivå, klima, sentry, ladeport, dekktrykk, setevarme, posisjon (device_tracker) og forbruk letes opp
 * automatisk blant entiteter med prefiksene i `prefiks` (standard: tesla_model_y, folkevogn).
 * «Daglig kjøring» kommer fra dagsstatistikken til kilometertelleren, «Siste turer» fra historikken
 * til posisjonen, kilometertelleren og batteriet. «Spart per dag» kommer fra langtidsstatistikken.
 * Langt trykk på ruter/kort åpner mer-info for entiteten bak.
 */
(() => {
  const KD = window.KD;
  const C = { green: 'oklch(0.8 0.12 150)', amber: 'oklch(0.82 0.12 75)', blue: 'oklch(0.8 0.12 250)', red: 'oklch(0.72 0.15 25)', orange: 'oklch(0.78 0.15 45)' };
  const a = KD.a, PINK = KD.PINK;
  const nf = (n, d = 1) => (n == null || isNaN(n)) ? '–' : Number(n).toLocaleString('nb-NO', { minimumFractionDigits: d, maximumFractionDigits: d });
  const AUTO = {
    batteri: [/^sensor\..*(batteri_batteriniva|battery_level|batteriniva|battery)$/],
    klima: [/^climate\./],
    sentry: [/^switch\..*sentry/],
    posisjon: [/^device_tracker\..*(location|posisjon|position)/, /^device_tracker\.(?!.*(route|destination|rute))/],
    forbruk: [/^sensor\..*(consumption|forbruk|wh_km|energy_per_km)/],
    ladestatus: [/^(select|sensor)\..*charging_state/],
    ladeport: [/^cover\..*charge_port/, /^(switch|lock)\..*charge_port/, /^(cover|switch)\..*ladeport/],
  };
  const SEAT = { off: 'Av', low: 'Lav', medium: 'Middels', high: 'Høy', '0': 'Av', '1': 'Lav', '2': 'Middels', '3': 'Høy', auto: 'Auto' };

  /** Bilscenen (designets CarScene) som SVG/HTML-streng */
  function carScene(s, outer) {
    const body = '#c9d3dc', shade = '#a7b3be', glass = s.climate ? 'rgba(255,150,90,0.55)' : 'rgba(40,52,64,0.9)';
    const ease = 'cubic-bezier(.34,1.3,.64,1)';
    const winD = 'M64,44 L82,29 C90,25 102,24 112,24 L146,24 C156,24 164,30 170,40 L170,44 Z';
    const S = KD.S;
    const wheels = [48, 160].map(cx => `<g><circle cx="${cx}" cy="66" r="12" fill="#16181b"></circle><circle cx="${cx}" cy="66" r="7" fill="#3a3f46"></circle><circle cx="${cx}" cy="66" r="2" fill="#8d949c"></circle></g>`).join('');
    const svg = `<svg viewBox="0 0 200 90" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible">`
      + `<defs><clipPath id="carWin"><path d="${winD}"></path></clipPath></defs>`
      + `<ellipse cx="102" cy="78" rx="94" ry="5" fill="rgba(0,0,0,0.45)"></ellipse>`
      + `<g style="${S({ transformOrigin: '146px 24px', transformBox: 'view-box', transform: s.trunk ? 'rotate(-28deg)' : 'none', transition: 'transform .8s ' + ease })}"><path d="M146,22 C160,22 172,30 182,40 L190,44 L190,50 L170,48 L146,24 Z" fill="${shade}"></path></g>`
      + `<path d="M10,60 C10,52 16,49 28,47 L62,44 C68,36 76,29 86,26 C96,23 108,22 120,22 L146,22 C160,22 172,30 182,40 L190,44 C195,46 196,52 196,58 L196,66 L10,66 Z" fill="${body}"></path>`
      + `<path d="${winD}" fill="rgba(20,24,30,0.95)"></path>`
      + `<g clip-path="url(#carWin)"><rect x="60" y="22" width="60" height="24" fill="${glass}" style="${S({ transform: s.window ? 'translateY(13px)' : 'none', transition: 'transform .9s ' + ease + ', fill .6s' })}"></rect>`
      + `<rect x="120" y="22" width="56" height="24" fill="${glass}" style="transition:fill .6s"></rect></g>`
      + `<rect x="118" y="24" width="3" height="20" fill="#1a1e24"></rect>`
      + `<path d="M40,55 L150,55" stroke="${shade}" stroke-width="1"></path>`
      + `<g style="${S({ transformOrigin: '62px 44px', transformBox: 'view-box', transform: s.frunk ? 'rotate(22deg)' : 'none', transition: 'transform .8s ' + ease })}"><path d="M12,52 C16,49 28,47 62,44 L62,46 C40,48 22,50 12,54 Z" fill="${shade}"></path></g>`
      + `<rect x="186" y="45" width="8" height="4" rx="2" fill="oklch(0.62 0.2 25)"></rect>`
      + `<rect x="11" y="51" width="9" height="3" rx="1.5" fill="#eef3f8"></rect>`
      + wheels
      + (s.charging ? `<circle cx="189" cy="51" r="3" fill="oklch(0.8 0.16 150)" style="animation:pulse 1.2s ease-in-out infinite"></circle>` : '')
      + (s.sentry ? `<circle cx="120" cy="34" r="1.6" fill="oklch(0.66 0.22 25)" style="animation:pulse 1.4s ease-in-out infinite"></circle>` : '')
      + `</svg>`;
    const heat = s.climate ? [0, 1, 2].map(i => `<span style="${S({ position: 'absolute', left: (44 + i * 10) + '%', top: '8%', width: 10, height: 22, borderRadius: 6, borderLeft: '2px solid oklch(0.78 0.15 45)', opacity: 0, animation: 'rise 2s ease-out ' + (i * 0.5) + 's infinite' })}"></span>`).join('') : '';
    return `<div style="${outer || 'position:absolute;right:6px;bottom:8px;width:230px;height:118px;pointer-events:none'}">`
      + `<span style="${S({ position: 'absolute', left: '26%', bottom: 4, width: '50%', height: 4, borderRadius: 2, background: s.charging ? 'repeating-linear-gradient(90deg, oklch(0.8 0.16 150) 0 14px, oklch(0.62 0.14 150) 14px 20px)' : 'transparent', backgroundSize: '40px 4px', boxShadow: s.charging ? '0 0 14px oklch(0.8 0.16 150 / 0.7)' : 'none', animation: s.charging ? 'flow .8s linear infinite' : 'none' })}"></span>`
      + `<div style="position:absolute;left:0;right:0;top:24px;bottom:0">${svg}${heat}</div>`
      + `<span data-key="${s.locked ? 'l' : 'u'}" style="${S({ position: 'absolute', left: '55%', top: 0, width: 26, height: 26, marginLeft: -13, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.1)', color: s.locked ? '#f2f1ee' : 'oklch(0.82 0.12 75)', animation: 'bob .5s ease-out' })}"><span class="ms" style="font-size:16px;font-variation-settings:'FILL' 1">${s.locked ? 'lock' : 'lock_open'}</span></span>`
      + (s.charging ? `<span style="position:absolute;right:4px;top:70px;width:10px;height:10px;border-radius:5px;border:2px solid oklch(0.8 0.16 150);animation:ring 1.4s ease-out infinite"></span>` : '')
      + `</div>`;
  }

  class KDBilCard extends KD.KDSheet {
    static head = ['directions_car', 'Bil', 'Tesla Model Y'];
    static defaults = {
      navn: 'Tesla Model Y',
      prefiks: ['tesla_model_y', 'folkevogn'],
      kapasitet: 75,            // kWh – for anslag av ladetid/kostnad og kWh per tur
      ladeeffekt_kw: 11,        // laderens effekt når den ikke lader nå (for anslaget)
      batteri: null,            // auto: sensor.tesla_model_y_batteri_batteriniva
      rekkevidde: 'sensor.tesla_model_y_batteri_estimert_batterirekkevidde',
      ladegrense: 'input_number.tesla_model_y_ladegrense',
      lader: 'switch.elbillader_charging',
      ladeeffekt: 'sensor.elbillader_charge_power',
      ladetid: 'sensor.ki_tesla_ladetid_gjenstaende',
      ladepris: 'sensor.ki_tesla_ladepris_estimat',
      forrige_lading: 'sensor.ki_tesla_forrige_lading_kostnad',
      smartlading: 'switch.ki_lading_automatikk',
      nattlading: 'switch.ki_elbil_natt',
      nattlading_til: 'time.ki_elbil_til',
      laas: 'switch.tesla_model_y_car_doors_locked',
      laas_omvendt: true,       // Tesla-brua: `on` på doors_locked betyr ÅPEN
      tut: 'button.folkevogn_honk_horn',
      defrost: 'switch.tesla_model_y_klima_climate_defrost',
      frunk: 'switch.tesla_model_y_car_trunk_front',
      bagasje: 'switch.tesla_model_y_car_trunk_rear',
      vindu: 'switch.tesla_model_y_klima_climate_window_vent',
      klima: null, sentry: null, posisjon: null, forbruk: null, faner: null, bilde: null,
      i_dag: 'sensor.tesla_model_y_daglig_kjoring',
      km_stand: 'sensor.tesla_model_y_kilometerteller',
      spart_maned: 'sensor.ki_drivstoff_spart_denne_maneden',
      spart_ar: 'sensor.ki_drivstoff_spart_i_ar',
      kr_mil_el: 'sensor.ki_drivstoff_kostnad_per_mil_tesla_model_y',
      kr_mil_diesel: 'sensor.ki_drivstoff_kostnad_per_mil_audi_a6_avant_2011',
      diesel_liter: 'sensor.ki_drivstoff_liter_diesel_spart_i_ar',
      co2: 'sensor.ki_drivstoff_co2_spart_i_ar',
      dieselpris: 'sensor.ki_drivstoff_dieselpris',
      strompris: 'sensor.ki_drivstoff_ladepris',
    };
    static sheetCss = `
@keyframes rise{0%{transform:translateY(6px);opacity:0}40%{opacity:.9}100%{transform:translateY(-16px);opacity:0}}
@keyframes pulse{0%,100%{opacity:.45}50%{opacity:1}}
@keyframes flow{from{background-position:0 0}to{background-position:40px 0}}
@keyframes ring{from{transform:scale(.6);opacity:.8}to{transform:scale(2.2);opacity:0}}
@keyframes bob{0%{transform:translateY(0)}35%{transform:translateY(-4px)}70%{transform:translateY(0)}}
.kd-car-t:active{transform:scale(0.94)}
.kd-car-l:active,.kd-car-p:active{transform:scale(0.95)}
[data-seg="car-tab"]>button{padding:0 18px!important;font-weight:500!important}
[data-seg="car-tab"] [data-seg-thumb]{box-shadow:none!important}
[data-seg="car-tab"][data-seg-i="0"]>button:not([data-seg-b="0"]),[data-seg="car-tab"][data-seg-i="1"]>button:not([data-seg-b="1"]),[data-seg="car-tab"][data-seg-i="2"]>button:not([data-seg-b="2"]),[data-seg="car-tab"][data-seg-i="3"]>button:not([data-seg-b="3"]){color:#c9c7c2!important}`;

    constructor() { super(); this.state = { tab: 'charge', flash: null, bump: null, day: 6 }; }

    /* ----- oppdagelse ----- */
    auto(key) {
      const c = this.config;
      if (c[key]) return c[key];
      if (key === 'batteri' && this.st('sensor.tesla_model_y_batteri_batteriniva')) return 'sensor.tesla_model_y_batteri_batteriniva';
      const pre = [].concat(c.prefiks || []);
      const ids = Object.keys(this.all()).filter(id => pre.some(p => id.includes(p)));
      for (const re of AUTO[key] || []) {
        const hit = ids.find(id => re.test(id) && !(key === 'batteri' && /range|rekkevidde|heater|charging/.test(id)));
        if (hit) return hit;
      }
      return null;
    }
    isOpen(id) { return !!id && ['on', 'open', 'opening'].includes(this.v(id)); }
    unlocked() {
      const st = this.v(this.config.laas);
      return st === 'unlocked' ? true : st === 'locked' ? false : st === 'on' ? this.config.laas_omvendt !== false : st === 'off' ? this.config.laas_omvendt === false : false;
    }
    kw() {
      const id = this.config.ladeeffekt; let v = this.n(id);
      if (v == null) return null;
      const u = this.unit(id);
      return u === 'W' || (!u && v > 100) ? v / 1000 : v;
    }

    /* ----- handlinger ----- */
    tab(e, k) { this.setState({ tab: k }); }
    toggleSentry() { const id = this.auto('sentry'); if (id) this.call('switch', 'toggle', { entity_id: id }); }
    toggleWindow() { const id = this.config.vindu; if (id && this.st(id)) this.toggle(id); }
    act(e, k) {
      const c = this.config;
      if (k === 'lock') { const id = c.laas; if (id.startsWith('lock.')) return this.toggle(id); return this.call(id.split('.')[0], 'toggle', { entity_id: id }); }
      if (k === 'horn') { this.setState({ flash: 'horn' }); clearTimeout(this._ft); this._ft = setTimeout(() => this.setState({ flash: null }), 700); return c.tut && this.press(c.tut); }
      if (k === 'climate') {
        const cl = this.auto('klima');
        if (cl) return this.call('climate', this.ok(cl) && this.v(cl) !== 'off' ? 'turn_off' : 'turn_on', { entity_id: cl });
        if (c.defrost) return this.toggle(c.defrost);
      }
      if (k === 'frunk' && c.frunk) return this.toggle(c.frunk);
      if (k === 'trunk' && c.bagasje) return this.toggle(c.bagasje);
      if (k === 'port') { const id = this.auto('ladeport'); if (id) return this.toggle(id); }
      if (k === 'window') return this.toggleWindow();
      if (k === 'sentry') return this.toggleSentry();
    }
    toggleDefrost() { const id = this.config.defrost; if (id && this.st(id)) this.toggle(id); }
    stepTemp(e, d) {
      const id = this.auto('klima'); if (!id) return;
      const cur = parseFloat(this.at(id, 'temperature')), step = parseFloat(this.at(id, 'target_temp_step')) || 0.5;
      const lo = parseFloat(this.at(id, 'min_temp')) || 15, hi = parseFloat(this.at(id, 'max_temp')) || 28;
      this.call('climate', 'set_temperature', { entity_id: id, temperature: KD.clamp(Math.round(((isNaN(cur) ? 21 : cur) + (+d) * step) * 10) / 10, lo, hi) });
    }
    selOpt(e, arg) { const i = String(arg).lastIndexOf('|'); if (i > 0) this.call('select', 'select_option', { entity_id: arg.slice(0, i), option: arg.slice(i + 1) }); }
    /** setevarme: select-entiteter med bilens prefiks (seat_heater / setevarme) */
    seats() {
      const pre = [].concat(this.config.prefiks || []);
      const ids = Array.isArray(this.config.seter) ? this.config.seter : Object.keys(this.all()).filter(id => /^select\./.test(id) && /seat_heat|setevarme/.test(id) && pre.some(p => id.includes(p)));
      return ids.filter(id => this.ok(id)).map(id => {
        let navn = this.fname(id); for (const p of pre) navn = navn.replace(new RegExp('^' + p.replace(/_/g, '[ _]') + '\\s*', 'i'), '');
        return { id, navn: navn.replace(/_/g, ' ') || 'Setevarme', opts: (this.at(id, 'options', []) || []).map(String) };
      }).filter(x => x.opts.length > 1 && x.opts.length <= 5).slice(0, 6);
    }
    /** dekktrykk: { fl, fr, rl, rr: { id, v, u, low }, low } – config `dekk: { fl: sensor.x, … }` overstyrer */
    tyres() {
      const pre = [].concat(this.config.prefiks || []), cfg = this.config.dekk || {};
      const ids = Object.keys(this.all()).filter(id => /^sensor\./.test(id) && /(tire|tyre|tpms|dekk)/.test(id) && pre.some(p => id.includes(p)) && !/warning|advarsel|last_seen/.test(id));
      const POS = { fl: /(front|foran)_?(left|venstre)|_fl$|_lf$/, fr: /(front|foran)_?(right|hoyre|høyre)|_fr$|_rf$/, rl: /(rear|bak)_?(left|venstre)|_rl$|_lr$/, rr: /(rear|bak)_?(right|hoyre|høyre)|_rr$|_rr$/ };
      const out = {}; let any = false, low = false;
      for (const k of ['fl', 'fr', 'rl', 'rr']) {
        const id = cfg[k] || ids.find(x => POS[k].test(x));
        const v = id ? this.n(id) : null; if (v == null) continue;
        const u = this.unit(id) || 'bar', lo = /psi/i.test(u) ? v < 36 : /kpa/i.test(u) ? v < 250 : v < 2.5;
        out[k] = { id, v, u, low: lo }; any = true; if (lo) low = true;
      }
      return any ? { ...out, low } : null;
    }
    toggleCharge() { const id = this.config.lader; if (id) this.call(id.split('.')[0] === 'input_boolean' ? 'input_boolean' : 'switch', 'toggle', { entity_id: id }); }
    setLimit(e, v) { this.setNum(this.config.ladegrense, +v); }
    toggleSmart() { const id = this.config.smartlading; if (id && this.st(id)) this.toggle(id); }
    openMore(e, id) { this.more(id); }

    /* ----- asynkrone data ----- */
    trips() {
      const tr = this.auto('posisjon'); if (!tr) return [];
      const odo = this.config.km_stand, bat = this.auto('batteri');
      const h = this.cached('kdcar-trips-' + tr, 10 * 60e3, () => this.history([tr, odo, bat].filter(Boolean), 24 * 7), null);
      if (!h) return [];
      const at = (arr, t) => { let v = null; for (const p of arr || []) { if (p.t <= t) { if (typeof p.v === 'number') v = p.v; } else break; } return v; };
      const first = (arr, t) => { for (const p of arr || []) if (p.t >= t && typeof p.v === 'number') return p.v; return null; };
      const pts = (h[tr] || []).filter(p => !KD.BAD.has(p.v));
      const zname = (z) => z === 'home' ? 'Hjem' : z === 'not_home' ? 'Borte' : String(z);
      const out = [];
      let from = null, dep = null;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (p.v === 'not_home') { if (from != null && dep == null) dep = p.t; continue; }
        if (from != null && (dep != null || p.v !== from)) {
          const d0 = dep || p.t, d1 = p.t;
          const o0 = at(h[odo], d0) ?? first(h[odo], d0), o1 = at(h[odo], d1);
          const b0 = at(h[bat], d0) ?? first(h[bat], d0), b1 = at(h[bat], d1);
          const km = o0 != null && o1 != null ? o1 - o0 : null;
          if (km == null || km >= 0.5) out.push({ from: zname(from), to: zname(p.v), d0, d1, km, kwh: b0 != null && b1 != null && b0 > b1 ? (b0 - b1) / 100 * (this.config.kapasitet || 75) : null });
        }
        from = p.v; dep = null;
      }
      return out.reverse().slice(0, 4);
    }
    dailySaved() {
      const id = this.config.spart_ar; if (!id || !this.st(id)) return null;
      const r = this.cached('kdcar-saved-' + id, 30 * 60e3, () => this.stats([id], 24 * 32, 'day', ['max', 'state', 'mean']), null);
      const rows = r && r[id]; if (!rows || !rows.length) return null;
      const vals = rows.map(x => x.state ?? x.max ?? x.mean).filter(v => v != null);
      const inc = [];
      for (let i = 1; i < vals.length; i++) { const d = vals[i] - vals[i - 1]; inc.push(d >= 0 ? d : vals[i]); }
      return inc.slice(-30);
    }

    /** Daglig kjøring siste 7 dager fra kilometertellerens dagsstatistikk: [{d: Date, km}] (eldst først, i dag sist) */
    weekDays() {
      const odo = this.config.km_stand; if (!odo || !this.st(odo)) return null;
      const r = this.cached('kdcar-week-' + odo, 30 * 60e3, () => this.stats([odo], 24 * 10, 'day', ['max', 'state']), null);
      const rows = r && r[odo]; if (!rows || !rows.length) return null;
      const endOf = new Map();
      for (const x of rows) { const v = x.max ?? x.state; if (v != null && !isNaN(v)) endOf.set(new Date(typeof x.start === 'number' && x.start < 1e12 ? x.start * 1000 : x.start).toDateString(), +v); }
      const t0 = new Date(); t0.setHours(0, 0, 0, 0);
      const dayAt = (i) => { const d = new Date(t0); d.setDate(d.getDate() - i); return d; };
      const cur = this.n(odo);
      const end = (i) => { if (i === 0 && cur != null) return cur; for (let k = i; k < i + 4; k++) { const v = endOf.get(dayAt(k).toDateString()); if (v != null) return v; } return null; };
      const out = [];
      for (let i = 6; i >= 0; i--) {
        const e1 = end(i), e0 = end(i + 1);
        let km = e1 != null && e0 != null ? Math.max(0, e1 - e0) : null;
        if (i === 0 && km == null && this.ok(this.config.i_dag)) km = this.n(this.config.i_dag);
        out.push({ d: dayAt(i), km: km == null ? 0 : km });
      }
      return out;
    }

    /* ----- handlinger (design v3) ----- */
    bump(k) { this.setState({ bump: k }); clearTimeout(this._bt); this._bt = setTimeout(() => this.setState({ bump: null }), 520); }
    tile(e, k) { this.bump(k); this.act(e, k); }
    holdTile(e, k) {
      const c = this.config;
      const id = { lock: c.laas, horn: c.tut, climate: this.auto('klima') || c.defrost, frunk: c.frunk, trunk: c.bagasje, port: this.auto('ladeport'), sentry: this.auto('sentry') }[k];
      if (id) this.more(id);
    }
    pickDay(e, i) { this.setState({ day: +i }); }
    toggleClimate() { this.act(null, 'climate'); }
    cycleSeat(e, id) {
      const opts = (this.at(id, 'options', []) || []).map(String); if (opts.length < 2) return;
      const i = opts.indexOf(String(this.v(id)));
      this.call('select', 'select_option', { entity_id: id, option: opts[(i + 1) % opts.length] });
    }

    body() {
      const s = this.state, cf = this.config, e = KD.e, S = KD.S;
      const batId = this.auto('batteri'), climId = this.auto('klima'), sentryId = this.auto('sentry'), portId = this.auto('ladeport'), trId = this.auto('posisjon');
      const batt = this.n(batId), limit = this.n(cf.ladegrense), range = this.n(cf.rekkevidde);
      const kw = this.kw();
      const lsId = this.auto('ladestatus'), ls = String(this.v(lsId)).toLowerCase();
      const charging = this.isOn(cf.lader) || (/charging|starting/.test(ls) && !/not|complete|stopped|disconnected/.test(ls)) || (kw != null && kw > 0.3);
      const locked = !this.unlocked();
      const climate = climId ? (this.ok(climId) && this.v(climId) !== 'off') : this.isOn(cf.defrost);
      const climTemp = climId ? parseFloat(this.at(climId, 'temperature')) : NaN;
      const inside = climId ? parseFloat(this.at(climId, 'current_temperature')) : NaN;
      const outside = climId ? parseFloat(this.at(climId, 'outside_temperature', this.at(climId, 'outside_temp'))) : NaN;
      const frunk = this.isOpen(cf.frunk), trunk = this.isOpen(cf.bagasje), windowOpen = this.isOpen(cf.vindu), portOpen = this.isOpen(portId);
      const sentry = sentryId ? this.isOn(sentryId) : false;
      const b = batt == null ? null : Math.floor(batt);
      const lim = limit == null ? null : Math.round(limit);
      const cap = cf.kapasitet || 75;
      const need = batt != null && limit != null ? Math.max(0, limit - batt) / 100 * cap : null;
      let mins = null;
      if (charging && this.n(cf.ladetid, 0) > 0) mins = Math.round(this.n(cf.ladetid));
      else if (need != null) mins = Math.round(need / (charging && kw > 0.3 ? kw : (cf.ladeeffekt_kw || 11)) * 60);
      const eta = mins == null || need === 0 && !charging ? '–' : mins >= 60 ? `${Math.floor(mins / 60)} t ${mins % 60} min` : `${mins} min`;
      const strom = this.n(cf.strompris);
      const cost = this.ok(cf.ladepris) ? Math.round(this.n(cf.ladepris)) : need != null && strom != null ? Math.round(need * strom) : '–';
      const last = this.ok(cf.forrige_lading) ? Math.round(this.n(cf.forrige_lading)) : '–';
      const smartOn = this.isOn(cf.smartlading);
      const til = /^\d{1,2}:\d{2}/.test(this.v(cf.nattlading_til)) && this.isOn(cf.nattlading) ? this.v(cf.nattlading_til).slice(0, 5) : null;
      const zoneRaw = trId ? this.v(trId) : '';
      const place = !zoneRaw || KD.BAD.has(zoneRaw) ? null : zoneRaw === 'home' ? 'Hjemme' : zoneRaw === 'not_home' ? 'Underveis' : zoneRaw;
      const sw = (on, col) => ({ track: { position: 'relative', width: 50, height: 30, borderRadius: 15, flex: 'none', background: on ? col : 'rgba(255,255,255,0.16)', transition: 'background .2s' }, knob: { position: 'absolute', top: 3, left: on ? 23 : 3, width: 24, height: 24, borderRadius: 12, background: '#f4f3ef', transition: 'left .22s cubic-bezier(.3,1.4,.6,1)' } });
      const swHTML = (on, col, h, arg = '') => { const x = sw(on, col); return `<button data-on-click="${h}"${arg ? ` data-arg="${e(arg)}"` : ''} style="${S(x.track)}"><span style="${S(x.knob)}"></span></button>`; };
      const iconC = (icon, fill = true) => `<span style="width:44px;height:44px;border-radius:22px;background:#262629;display:grid;place-items:center;color:#c9c7c2"><span class="ms" style="font-size:22px${fill ? ";font-variation-settings:'FILL' 1" : ''}">${icon}</span></span>`;
      const big = 'font-size:32px;font-weight:300;letter-spacing:-0.03em;line-height:1.05';
      const box150 = 'height:150px;box-sizing:border-box;padding:14px 16px 16px;border-radius:28px;background:#1c1c1f;display:flex;flex-direction:column;justify-content:space-between';
      const PILL3 = 'display:inline-flex;align-items:center;height:30px;padding:0 11px;border-radius:15px;background:#232326;font-weight:500;vertical-align:middle;white-space:nowrap';

      /* ---- helt (bilde til høyre, tekst til venstre) ---- */
      const chipSt = S({ height: 26, padding: '0 10px 0 8px', borderRadius: 13, display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', background: '#262629', color: sentry ? C.red : '#c9c7c2' });
      const chips = [sentry ? { icon: 'videocam', t: 'Sentry på', h: 'toggleSentry' } : { icon: locked ? 'lock' : 'lock_open', t: locked ? 'Låst' : 'Ulåst', h: sentryId ? 'toggleSentry' : '' }];
      if (portOpen) chips.push({ icon: 'ev_charger', t: 'Ladeport åpen', h: '', col: C.blue });
      const chipHTML = chips.map(c => `<span${c.h ? ` data-on-click="${c.h}" data-hold="holdTile" data-arg="sentry"` : ''} style="${chipSt}${c.col ? `;color:${c.col}` : ''}${c.h ? ';pointer-events:auto;cursor:pointer' : ''}"><span class="ms" style="font-size:14px;font-variation-settings:'FILL' 1">${c.icon}</span><span>${e(c.t)}</span></span>`).join('');
      const heroSub = `${range == null ? '–' : Math.round(range)} km · grense ${lim == null ? '–' : lim} %`;
      const photo = cf.bilde
        ? `<img src="${e(cf.bilde)}" alt="" style="position:absolute;right:0;top:0;bottom:0;width:60%;height:100%;object-fit:cover">`
        : carScene({ climate, charging, sentry, locked, frunk, trunk, window: windowOpen }, 'position:absolute;right:2px;top:44px;width:58%;height:118px;pointer-events:none');
      const hero = `<section data-on-click="openMore" data-arg="${e(batId || cf.lader || '')}" style="position:relative;height:184px;border-radius:28px;background:#1c1c1f;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04);cursor:pointer">
    ${photo}
    <div style="position:absolute;inset:0;background:linear-gradient(90deg, #1c1c1f 38%, rgba(28,28,31,0) 70%);pointer-events:none"></div>
    <div style="position:absolute;left:18px;top:18px;bottom:18px;display:flex;flex-direction:column;justify-content:space-between;pointer-events:none">
      <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-start">
        <span style="font-size:13px;color:#8e8d89">${e(cf.navn)}</span>
        <div style="display:flex;gap:6px">${chipHTML}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;align-items:baseline;gap:3px"><span style="font-size:40px;font-weight:300;letter-spacing:-0.04em;line-height:1;font-variant-numeric:tabular-nums">${b == null ? '–' : b}</span><span style="font-size:14px;color:#8e8d89">%</span></div>
        <span style="font-size:12px;color:#8e8d89;white-space:nowrap">${e(heroSub)}</span>
      </div>
    </div>
  </section>`;

      /* ---- hurtigknapper (5 ruter) ---- */
      const tile = (k, icon, label, on, col) => `<button class="kd-car-t" data-on-click="tile" data-hold="holdTile" data-arg="${k}" title="${e(label)}" style="${S({ aspectRatio: '1', borderRadius: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: on ? a(col, 0.16) : '#1c1c1f', boxShadow: on ? `inset 0 0 0 1px ${a(col, 0.45)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)', transition: 'background .25s, transform .12s' })}">
        <span class="ms" style="${S({ fontSize: 28, color: on ? col : '#f2f1ee', fontVariationSettings: `'FILL' ${on || k === 'lock' ? 1 : 0}`, animation: s.bump === k ? 'bob .5s ease-out' : 'none' })}">${icon}</span>
        <span style="font-size:10px;color:#8e8d89;white-space:nowrap">${e(label)}</span>
      </button>`;
      const tiles = [
        tile('lock', locked ? 'lock' : 'lock_open', locked ? 'Låst' : 'Ulåst', !locked, C.amber),
        cf.tut ? tile('horn', 'campaign', 'Tut', s.bump === 'horn', C.blue) : '',
        climId || (cf.defrost && this.st(cf.defrost)) ? tile('climate', 'heat', 'Klima', climate, C.orange) : '',
        cf.frunk && this.st(cf.frunk) ? tile('frunk', 'garage', 'Frunk', frunk, C.blue) : '',
        cf.bagasje && this.st(cf.bagasje) ? tile('trunk', 'luggage', 'Bagasje', trunk, C.blue) : '',
      ].filter(Boolean);
      const controls = `<section style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px">${tiles.join('')}</section>`;

      /* ---- faner ---- */
      const hasClim = !!(climId || (cf.defrost && this.st(cf.defrost)) || this.seats().length);
      const hasSave = !!(cf.spart_ar && this.st(cf.spart_ar) || cf.spart_maned && this.st(cf.spart_maned));
      const all = [['charge', 'Lading'], ['drive', 'Kjøring'], ...(hasClim ? [['climate', 'Klima']] : []), ...(hasSave ? [['save', 'Sparing']] : [])];
      const want = Array.isArray(cf.faner) ? cf.faner.map(x => ({ lading: 'charge', kjoring: 'drive', kjøring: 'drive', klima: 'climate', sparing: 'save' }[x] || x)) : null;
      const tabList = want ? all.filter(t => want.includes(t[0])) : all;
      const tab = tabList.some(t => t[0] === s.tab) ? s.tab : (tabList[0] || ['charge'])[0];
      const tabs = tabList.length > 1 ? KD.segHTML('car-tab', tabList, tab, 'tab', { pink: true, bg: 'transparent', r: 23, style: 'align-self:center;margin:4px 0;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.14)' }) : '';
      let tabHTML = '';

      if (tab === 'charge') {
        const steps = [50, 60, 70, 80, 100];
        if (lim != null && !steps.includes(lim)) { let bi = 0; steps.forEach((v, i) => { if (Math.abs(v - lim) < Math.abs(steps[bi] - lim)) bi = i; }); steps[bi] = lim; steps.sort((x, y) => x - y); }
        const ch = sw(charging, C.green);
        const chargeIcon = S({ width: 44, height: 44, borderRadius: 22, display: 'grid', placeItems: 'center', background: charging ? a(C.green, 0.2) : '#262629', color: charging ? C.green : '#c9c7c2', animation: charging ? 'pulse 1.6s ease-in-out infinite' : 'none' });
        const smartSub = smartOn ? 'Lader når strømmen er billigst' + (til ? ` · ferdig ${til}` : '') : 'Lader straks bilen kobles til';
        const hasLim = !!(cf.ladegrense && this.st(cf.ladegrense));
        tabHTML = `<div style="display:flex;flex-direction:column;gap:12px">
      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
        <div data-on-click="openMore" data-arg="${e(cf.lader || '')}" style="${box150}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="${chargeIcon}"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">ev_station</span></span>
            <button data-on-click="toggleCharge" style="${S(ch.track)}"><span style="${S(ch.knob)}"></span></button>
          </div>
          <div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:12px;color:#8e8d89">Lading</span><span style="${big}">${charging ? 'På' : 'Av'}</span></div>
        </div>
        <div data-on-click="openMore" data-arg="${e(cf.ladeeffekt || '')}" style="${box150}">
          ${iconC('bolt')}
          <div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:12px;color:#8e8d89">Ladeeffekt</span><div style="display:flex;align-items:baseline;gap:4px"><span style="${big};font-variant-numeric:tabular-nums">${e(kw == null ? '–' : nf(kw, 1))}</span><span style="font-size:13px;color:#8e8d89">kW</span></div></div>
        </div>
      </div>
      ${hasLim ? `<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px">
        ${steps.map(v => { const on = lim === v; return `<button class="kd-car-l" data-on-click="setLimit" data-arg="${v}" style="${S({ height: 80, borderRadius: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: on ? PINK : '#1c1c1f', color: on ? '#2a1720' : '#f2f1ee', transition: 'background .2s, transform .12s' })}">
            <span style="${S({ width: 28, height: 3, borderRadius: 2, background: on ? 'rgba(42,23,32,0.35)' : batt != null && v <= batt ? C.green : '#3a3a3d' })}"></span>
            <span style="font-size:14px;font-weight:600;font-variant-numeric:tabular-nums">${v}%</span>
          </button>`; }).join('')}
      </div>` : ''}
      <div style="font-size:19px;line-height:1.85;letter-spacing:-0.01em;padding:4px 4px;text-wrap:pretty">
        Det vil ta ca <span data-on-click="openMore" data-arg="${e(cf.ladetid || '')}" style="${PILL3};font-variant-numeric:tabular-nums"><span>${e(eta)}</span></span> å lade til <span style="${PILL3};background:oklch(0.78 0.13 350 / 0.16);box-shadow:inset 0 0 0 1px oklch(0.78 0.13 350 / 0.4);font-variant-numeric:tabular-nums"><span>${lim == null ? '–' : lim}</span><span>%</span></span>, og det vil koste ca <span data-on-click="openMore" data-arg="${e(cf.ladepris || '')}" style="${PILL3};font-variant-numeric:tabular-nums"><span>${e(cost)}</span><span>kr</span></span>. Sist lading kostet <span data-on-click="openMore" data-arg="${e(cf.forrige_lading || '')}" style="${PILL3}">${e(last)} kr</span>.
      </div>
      ${cf.smartlading && this.st(cf.smartlading) ? `<div data-on-click="openMore" data-arg="${e(cf.smartlading)}" style="height:150px;box-sizing:border-box;padding:16px;border-radius:28px;background:#1c1c1f;display:flex;flex-direction:column;justify-content:space-between">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <div style="display:flex;flex-direction:column;gap:3px"><span style="font-size:13px;color:#8e8d89">Smartlading</span><span style="font-size:12px;color:#6d6c69">${e(smartSub)}</span></div>
          ${iconC('schedule', false)}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end">
          <span style="font-size:32px;font-weight:300;letter-spacing:-0.03em;line-height:1">${smartOn ? 'På' : 'Av'}</span>
          ${swHTML(smartOn, C.green, 'toggleSmart')}
        </div>
      </div>` : ''}
      ${portId ? `<div data-on-click="openMore" data-arg="${e(portId)}" style="${box150}">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="${S({ width: 44, height: 44, borderRadius: 22, display: 'grid', placeItems: 'center', background: portOpen ? a(C.blue, 0.2) : '#262629', color: portOpen ? C.blue : '#c9c7c2' })}"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">ev_charger</span></span>
          ${swHTML(portOpen, C.blue, 'act', 'port')}
        </div>
        <div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:12px;color:#8e8d89">Ladeport</span><span style="${big}">${portOpen ? 'Åpen' : 'Lukket'}</span></div>
      </div>` : ''}
    </div>`;
      }

      if (tab === 'climate') {
        const seats = this.seats();
        const cl = sw(climate, 'oklch(0.7 0.14 45)');
        const climaSub = climate ? (isNaN(climTemp) ? 'Varmer kupé' : `Varmer kupé · ${nf(climTemp, 0)}°`) : [isNaN(inside) ? '' : `Kupé ${nf(inside, 0)}°`, isNaN(outside) ? '' : `ute ${nf(outside, 0)}°`].filter(Boolean).join(' · ') || 'Av';
        const chipB = (h, arg, icon, label, on) => `<button data-on-click="${h}" data-arg="${e(arg)}" style="${S({ height: 34, padding: '0 12px 0 9px', borderRadius: 17, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', background: on ? a(C.orange, 0.18) : '#262629', color: on ? C.orange : '#a9a7a2', boxShadow: on ? `inset 0 0 0 1px ${a(C.orange, 0.4)}` : 'none', transition: 'background .2s' })}"><span class="ms" style="font-size:16px;font-variation-settings:'FILL' 1">${icon}</span><span>${e(label)}</span></button>`;
        const chipsC = [
          ...seats.map(x => { const v = String(this.v(x.id)); const off = /^(off|0|av)$/i.test(v); return chipB('cycleSeat', x.id, 'airline_seat_recline_normal', off ? x.navn : `${x.navn} · ${SEAT[v.toLowerCase()] || v}`, !off); }),
          cf.defrost && this.st(cf.defrost) ? chipB('toggleDefrost', '', 'mode_heat', 'Avising', this.isOn(cf.defrost)) : '',
          cf.vindu && this.st(cf.vindu) ? chipB('toggleWindow', '', 'window', windowOpen ? 'Vinduer luftet' : 'Luft vinduer', windowOpen) : '',
        ].filter(Boolean);
        tabHTML = `<section style="${S({ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, borderRadius: 26, background: climate ? 'radial-gradient(120% 100% at 50% 0%, oklch(0.32 0.06 45), #1c1c1f 70%)' : '#1c1c1f', transition: 'background .6s' })}">
    <div data-on-click="openMore" data-arg="${e(climId || cf.defrost || '')}" style="display:flex;align-items:center;gap:12px">
      <span style="${S({ width: 44, height: 44, borderRadius: 22, flex: 'none', display: 'grid', placeItems: 'center', background: climate ? a(C.orange, 0.22) : '#262629', color: climate ? C.orange : '#a9a7a2', animation: climate ? 'pulse 2s ease-in-out infinite' : 'none' })}"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">heat</span></span>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
        <span style="font-size:15px;font-weight:500">Klima</span>
        <span style="font-size:12px;color:#8e8d89;white-space:nowrap">${e(climaSub)}</span>
      </div>
      <button data-on-click="toggleClimate" style="${S(cl.track)}"><span style="${S(cl.knob)}"></span></button>
    </div>
    ${climId ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
      <button class="kd-car-p" data-on-click="stepTemp" data-arg="-1" style="width:52px;height:52px;border-radius:26px;background:#262629;display:grid;place-items:center"><span class="ms" style="font-size:24px">remove</span></button>
      <div style="display:flex;align-items:baseline;gap:2px;font-variant-numeric:tabular-nums"><span style="font-size:40px;font-weight:300;letter-spacing:-0.04em;line-height:1">${isNaN(climTemp) ? '–' : nf(climTemp, climTemp % 1 ? 1 : 0)}</span><span style="font-size:18px;color:#8e8d89">°</span></div>
      <button class="kd-car-p" data-on-click="stepTemp" data-arg="1" style="width:52px;height:52px;border-radius:26px;background:#262629;display:grid;place-items:center"><span class="ms" style="font-size:24px">add</span></button>
    </div>` : ''}
    ${chipsC.length ? `<div style="display:flex;gap:6px;flex-wrap:wrap">${chipsC.join('')}</div>` : ''}
  </section>`;
      }

      if (tab === 'drive') {
        const odo = this.n(cf.km_stand);
        const days = this.weekDays() || [];
        const DN = ['Sø', 'Ma', 'Ti', 'On', 'To', 'Fr', 'Lø'], DL = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
        const sel = KD.clamp(s.day == null ? 6 : s.day, 0, Math.max(0, days.length - 1));
        const max = Math.max(1, ...days.map(x => x.km));
        const sd = days[sel];
        const fb = this.auto('forbruk'); let whkm = fb && this.ok(fb) ? this.n(fb) : null;
        if (whkm != null && /kwh\/100/i.test(this.unit(fb))) whkm *= 10; else if (whkm != null && /kwh\/km/i.test(this.unit(fb))) whkm *= 1000;
        const weekKm = days.reduce((x, y) => x + y.km, 0);
        const fmt = (v) => v == null ? '–' : Math.round(v).toLocaleString('nb-NO');
        const driveStats = [['road', 'Rekkevidde', fmt(range), cf.rekkevidde], ['speed', 'Kilometerstand', fmt(odo), cf.km_stand]];
        const dur = (ms) => { const m = Math.round(ms / 60e3); return m >= 60 ? `${Math.floor(m / 60)} t ${m % 60} min` : `${m} min`; };
        const whenW = (d) => { const t0 = new Date(); t0.setHours(0, 0, 0, 0); const diff = Math.round((t0 - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400e3); if (diff <= 0) return 'I dag'; if (diff === 1) return 'I går'; const w = d.toLocaleDateString('nb-NO', { weekday: 'short' }).replace('.', ''); return w.charAt(0).toUpperCase() + w.slice(1); };
        const trips = this.trips();
        const ty = this.tyres();
        const cardH = (title, right) => `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><span style="font-size:13px;color:#8e8d89">${e(title)}</span>${right || ''}</div>`;
        tabHTML = `<div style="display:flex;flex-direction:column;gap:12px">
      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
        ${driveStats.map(([icon, label, v, id]) => `<div data-on-click="openMore" data-arg="${e(id || '')}" style="${box150}">
            ${iconC(icon, false)}
            <div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:12px;color:#8e8d89">${e(label)}</span><div style="display:flex;align-items:baseline;gap:4px;white-space:nowrap"><span style="${big};font-variant-numeric:tabular-nums">${e(v)}</span><span style="font-size:13px;color:#8e8d89">km</span></div></div>
          </div>`).join('')}
      </div>
      ${days.length ? `<div style="box-sizing:border-box;padding:16px 16px 14px;border-radius:28px;background:#1c1c1f;display:flex;flex-direction:column;gap:14px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <div style="display:flex;flex-direction:column;gap:6px">
            <span style="font-size:13px;color:#8e8d89">Daglig kjøring siste 7 dager</span>
            <div style="display:flex;align-items:baseline;gap:4px"><span style="font-size:32px;font-weight:300;letter-spacing:-0.03em;line-height:1;font-variant-numeric:tabular-nums">${e(fmt(sd && sd.km))}</span><span style="font-size:13px;color:#8e8d89">km</span></div>
          </div>
          <span style="font-size:12px;color:#8e8d89;white-space:nowrap">${e(sd ? (sel === days.length - 1 ? 'I dag' : DL[sd.d.getDay()]) : '')}</span>
        </div>
        <div style="display:flex;gap:6px;align-items:flex-end;height:130px">
          ${days.map((x, i) => `<button data-on-click="pickDay" data-arg="${i}" style="flex:1;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:stretch"><span style="${S({ height: `${Math.max(4, x.km / max * 100)}%`, borderRadius: 10, background: i === sel ? C.blue : a(C.blue, 0.35), transition: 'background .2s, height .3s' })}"></span></button>`).join('')}
        </div>
        <div style="display:flex;gap:6px">
          ${days.map((x, i) => `<span style="${S({ flex: 1, textAlign: 'center', fontSize: 11, color: i === sel ? '#f2f1ee' : '#6d6c69' })}">${DN[x.d.getDay()]}</span>`).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;padding-top:10px;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:#8e8d89"><span>Uken totalt</span><span style="color:#f2f1ee;font-variant-numeric:tabular-nums"><span>${e(fmt(weekKm))}</span> km · <span>${e(whkm == null ? '–' : nf(weekKm * whkm / 1000, 0))}</span> kWh</span></div>
      </div>` : ''}
      ${ty ? `<div style="box-sizing:border-box;padding:16px;border-radius:28px;background:#1c1c1f;display:flex;flex-direction:column;gap:14px">
        ${cardH('Dekktrykk', ty.low ? `<span style="font-size:12px;color:${C.amber};white-space:nowrap">Sjekk trykket</span>` : `<span style="font-size:12px;color:#6d6c69;white-space:nowrap">Alt i orden</span>`)}
        <div style="position:relative;display:grid;grid-template-columns:minmax(0,1fr) 84px minmax(0,1fr);grid-template-rows:auto auto;gap:14px 10px;align-items:center">
          ${['fl', 'fr', 'rl', 'rr'].map((k, i) => { const t = ty[k]; const lo = t && t.low; return `<div data-on-click="openMore" data-arg="${e(t ? t.id : '')}" style="grid-column:${i % 2 ? 3 : 1};grid-row:${i < 2 ? 1 : 2};min-width:0;display:flex;flex-direction:column;align-items:${i % 2 ? 'flex-start' : 'flex-end'};gap:1px"><span style="display:flex;align-items:baseline;gap:3px;font-size:22px;font-weight:300;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;color:${lo ? C.amber : '#f2f1ee'}"><span>${t ? nf(t.v, t.u === 'psi' ? 0 : 1) : '–'}</span><span style="font-size:11px;color:#8e8d89">${e(t ? t.u : '')}</span></span><span style="font-size:11px;color:#8e8d89">${['Foran venstre', 'Foran høyre', 'Bak venstre', 'Bak høyre'][i]}</span></div>`; }).join('')}
          <svg viewBox="0 0 84 150" style="grid-column:2;grid-row:1 / span 2;width:84px;height:150px">
            <rect x="14" y="6" width="56" height="138" rx="24" fill="#262629" stroke="rgba(255,255,255,0.10)"></rect>
            <path d="M22 44 Q42 34 62 44 L60 62 Q42 56 24 62 Z" fill="#1a1d22"></path><path d="M24 104 Q42 98 60 104 L62 118 Q42 126 22 118 Z" fill="#1a1d22"></path>
            ${[[6, 26, 'fl'], [70, 26, 'fr'], [6, 98, 'rl'], [70, 98, 'rr']].map(([x, y, k]) => `<rect x="${x}" y="${y}" width="8" height="26" rx="4" fill="${ty[k] && ty[k].low ? C.amber : ty[k] ? C.green : '#48474a'}"></rect>`).join('')}
          </svg>
        </div>
      </div>` : ''}
      ${trips.length ? `<div style="box-sizing:border-box;padding:16px 16px 6px;border-radius:28px;background:#1c1c1f;display:flex;flex-direction:column;gap:4px">
        ${cardH('Siste turer', place ? `<span data-on-click="openMore" data-arg="${e(trId)}" style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(place)}</span>` : '')}
        ${trips.map((t, i) => `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;${i ? 'border-top:1px solid rgba(255,255,255,0.05)' : ''}">
          <span style="width:40px;height:40px;border-radius:20px;background:#262629;display:grid;place-items:center;flex:none"><span class="ms" style="font-size:20px;color:#a9a7a2">route</span></span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px">
            <span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(`${t.from} → ${t.to}`)}</span>
            <span style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e([t.km != null ? `${Math.round(t.km).toLocaleString('nb-NO')} km` : '', dur(t.d1 - t.d0), t.kwh != null ? `${t.kwh < 10 ? nf(t.kwh, 1) : Math.round(t.kwh)} kWh` : ''].filter(Boolean).join(' · '))}</span>
          </div>
          <span style="font-size:12px;color:#8e8d89;white-space:nowrap">${e(whenW(t.d1))}</span>
        </div>`).join('')}
      </div>` : ''}
    </div>`;
      }
      if (tab === 'save') {
        const pctOf = (id) => { const d = Number(this.at(id, 'diesel_ville_kostet')), el = Number(this.at(id, 'strom_kostet')); return d > 0 && !isNaN(el) ? KD.clamp(Math.round((1 - el / d) * 100), 0, 100) : null; };
        const saveCards = [['Spart denne måneden', cf.spart_maned, C.green], ['Spart i år', cf.spart_ar, C.amber]].map(([label, id, c]) => {
          const p = pctOf(id);
          return { label, id, c, v: this.ok(id) ? Math.round(this.n(id)).toLocaleString('nb-NO') : '–', pct: p == null ? '–' : `${p} %`, p: p || 0 };
        });
        const num = (id, fn) => this.ok(id) ? fn(this.n(id)) : '–';
        const saveStats = [['electric_car', num(cf.kr_mil_el, v => nf(v, 2)), 'Tesla · kr/mil', cf.kr_mil_el], ['directions_car', num(cf.kr_mil_diesel, v => nf(v, 2)), 'Audi A6 · kr/mil', cf.kr_mil_diesel],
          ['local_gas_station', num(cf.diesel_liter, v => `${Math.round(v).toLocaleString('nb-NO')} L`), 'Diesel ikke fylt', cf.diesel_liter], ['co2', num(cf.co2, v => `${Math.round(v).toLocaleString('nb-NO')} kg`), 'CO₂ spart', cf.co2],
          ['oil_barrel', num(cf.dieselpris, v => nf(v, 2)), 'Diesel · kr/L', cf.dieselpris], ['ev_charger', num(cf.strompris, v => nf(v, 2)), 'Strøm · kr/kWh', cf.strompris]];
        const kjort = Number(this.at(cf.spart_ar, 'kjort_km'));
        const yearKm = isNaN(kjort) ? '–' : `${Math.round(kjort).toLocaleString('nb-NO')} km`;
        const yearKr = this.ok(cf.spart_ar) ? `${Math.round(this.n(cf.spart_ar)).toLocaleString('nb-NO')} kroner` : '–';
        const inc = this.dailySaved();
        const maxInc = inc ? Math.max(...inc, 0.001) : 1;
        const dailySum = inc ? nf(inc.reduce((x, y) => x + y, 0), 1) : '–';
        const pill2 = 'display:inline-block;padding:0 10px;border-radius:14px;background:#f2f1ee;color:#141416;font-weight:500;line-height:1.6';
        tabHTML = `<section style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
      ${saveCards.map(c => `<div data-on-click="openMore" data-arg="${e(c.id)}" style="position:relative;overflow:hidden;min-width:0;display:flex;flex-direction:column;gap:6px;padding:16px 16px 30px;border-radius:26px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04)">
          <span style="width:44px;height:44px;border-radius:22px;background:${a(c.c, 0.16)};color:${c.c};display:grid;place-items:center;margin-bottom:22px"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">savings</span></span>
          <span style="font-size:12px;color:#c9c7c2">${e(c.label)}</span>
          <span style="display:flex;align-items:baseline;gap:4px;flex-wrap:wrap"><span style="font-size:30px;font-weight:300;letter-spacing:-0.03em;line-height:1;font-variant-numeric:tabular-nums;white-space:nowrap">${e(c.v)}</span><span style="font-size:11px;color:#8e8d89">kr</span><span style="font-size:11px;color:#c9c7c2;margin-left:auto;white-space:nowrap">${e(c.pct)} billigere</span></span>
          <span style="position:absolute;left:0;right:0;bottom:0;height:22px;display:flex"><span style="width:${c.p}%;height:100%;background:${c.c};transition:width 1.2s cubic-bezier(.2,.9,.3,1)"></span><span style="flex:1;height:100%;background:repeating-linear-gradient(-45deg, ${c.c} 0 2px, transparent 2px 6px);opacity:0.8"></span></span>
        </div>`).join('')}
    </section>
    <section style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
      ${saveStats.map(([icon, v, k, id]) => `<div data-on-click="openMore" data-arg="${e(id)}" style="min-width:0;display:flex;align-items:center;gap:10px;height:60px;padding:0 12px 0 5px;border-radius:30px;background:#1c1c1f">
          <span style="width:50px;height:50px;border-radius:25px;flex:none;background:#262629;display:grid;place-items:center"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">${icon}</span></span>
          <span style="display:flex;flex-direction:column;min-width:0"><span style="font-size:14px;font-weight:600;font-variant-numeric:tabular-nums">${e(v)}</span><span style="font-size:11px;color:#a9a7a2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(k)}</span></span>
        </div>`).join('')}
    </section>
    <div style="font-size:18px;line-height:1.9;padding:0 4px;text-wrap:pretty">Så langt i år har dere kjørt <span style="${pill2}">${e(yearKm)}</span> og spart <span style="${pill2}">${e(yearKr)}</span> mot den gamle dieselen.</div>
    <section style="position:relative;overflow:hidden;display:flex;flex-direction:column;gap:6px;padding:16px 0 0;border-radius:26px;background:#1c1c1f">
      <span style="font-size:12px;color:#8e8d89;padding:0 16px">Spart per dag siste 30 dager</span>
      <span style="font-size:30px;font-weight:300;letter-spacing:-0.03em;padding:0 16px;font-variant-numeric:tabular-nums">${e(dailySum)}<span style="font-size:12px;color:#8e8d89"> kr</span></span>
      <div style="display:flex;align-items:flex-end;gap:3px;height:120px;padding:0 10px">${(inc || []).map((v, i) => `<span style="flex:1;height:${Math.max(4, v / maxInc * 100)}%;border-radius:4px 4px 0 0;background:${C.green};transition:height .9s cubic-bezier(.2,.9,.3,1) ${i * 0.02}s"></span>`).join('')}</div>
    </section>`;
      }

      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:12px">
  <header style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:6px">
    <div style="font-size:30px;font-weight:600;letter-spacing:-0.03em">${e(cf.navn)}</div>
    <button data-on-click="closeSheet" style="width:44px;height:44px;border-radius:22px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:22px">close</span></button>
  </header>
  ${hero}
  ${controls}
  ${tabs}
  ${tabHTML}
</div>`;
    }
  }

  KD.define('kd-bil-card', KDBilCard, 'KD Bil', 'Tesla Model Y – pikselkopi av Claude Design «Bil v3»');
  KD.sheet('car', 'kd-bil-card');
})();
