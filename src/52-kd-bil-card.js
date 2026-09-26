/*
 * kd-bil-card – pikselkopi av Claude Design «Bil» (Tesla Model Y), med ekte data.
 *
 *   type: custom:kd-bil-card        # alt annet er valgfritt («auto config»)
 * Batterinivå, klima, sentry, posisjon (device_tracker) og forbruk letes opp automatisk blant entiteter
 * med prefiksene i `prefiks` (standard: tesla_model_y, folkevogn). «Siste turer» bygges fra historikken
 * til posisjonen, kilometertelleren og batteriet. «Spart per dag» kommer fra langtidsstatistikken.
 */
(() => {
  const KD = window.KD;
  const C = { green: 'oklch(0.8 0.12 150)', amber: 'oklch(0.82 0.12 75)', blue: 'oklch(0.8 0.12 250)', red: 'oklch(0.72 0.15 25)' };
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
  const PILL = 'display:inline-flex;align-items:center;height:30px;padding:0 11px;border-radius:15px;background:#232326;color:#f2f1ee;font-weight:500;vertical-align:middle;white-space:nowrap';
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
      klima: null, sentry: null, posisjon: null, forbruk: null,
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
@keyframes pulse{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes flow{from{background-position:0 0}to{background-position:40px 0}}
@keyframes ring{from{transform:scale(.6);opacity:.8}to{transform:scale(2.2);opacity:0}}
@keyframes bob{0%{transform:translateY(0)}30%{transform:translateY(-5px)}60%{transform:translateY(0)}}
.kd-car-act:active{transform:scale(0.95)}
@keyframes kdcflow{to{background-position:28.28px 0}}`;

    constructor() { super(); this.state = { tab: 'charge', flash: null }; }

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

    afterRender() {}

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
      const frunk = this.isOpen(cf.frunk), trunk = this.isOpen(cf.bagasje), windowOpen = this.isOpen(cf.vindu), portOpen = this.isOpen(portId);
      const sentry = sentryId ? this.isOn(sentryId) : false;
      const sc = { climate, charging, sentry, locked, frunk, trunk, window: windowOpen };
      const b = batt == null ? null : Math.floor(batt);
      const lim = limit == null ? null : Math.round(limit);
      const cap = cf.kapasitet || 75;
      const need = batt != null && limit != null ? Math.max(0, limit - batt) / 100 * cap : null;
      let mins = null;
      if (charging && this.n(cf.ladetid, 0) > 0) mins = Math.round(this.n(cf.ladetid));
      else if (need != null) mins = Math.round(need / (charging && kw > 0.3 ? kw : (cf.ladeeffekt_kw || 11)) * 60);
      const eta = mins == null ? '–' : mins ? (mins >= 60 ? `${Math.floor(mins / 60)} t ${mins % 60} min` : `${mins} min`) : 'ferdig';
      const strom = this.n(cf.strompris);
      const cost = this.ok(cf.ladepris) ? Math.round(this.n(cf.ladepris)) : need != null && strom != null ? Math.round(need * strom) : '–';
      const last = this.ok(cf.forrige_lading) ? Math.round(this.n(cf.forrige_lading)) : '–';
      const smartOn = this.isOn(cf.smartlading);
      const til = /^\d{1,2}:\d{2}/.test(this.v(cf.nattlading_til)) && this.isOn(cf.nattlading) ? this.v(cf.nattlading_til).slice(0, 5) : null;
      const zoneRaw = trId ? this.v(trId) : '';
      const place = !zoneRaw || KD.BAD.has(zoneRaw) ? null : zoneRaw === 'home' ? 'Hjemme' : zoneRaw === 'not_home' ? 'Underveis' : zoneRaw;
      const lbl = (t, right = '') => `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 4px;min-height:22px"><div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;white-space:nowrap">${e(t)}</div>${right}</div>`;
      const card = 'border-radius:24px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04)';

      /* ---- helt ---- */
      const heroBg = climate ? 'radial-gradient(110% 80% at 70% 45%, #3a2a24 0%, #1f1f24 55%, #18181b 100%)' : charging ? 'radial-gradient(110% 80% at 70% 55%, #1c3029 0%, #1c1f24 55%, #18181b 100%)' : 'radial-gradient(110% 80% at 70% 50%, #283039 0%, #1c1e22 55%, #18181b 100%)';
      const chips = [[locked, locked ? 'lock' : 'lock_open', locked ? 'Låst' : 'Ulåst', locked ? '#c9c7c2' : C.amber, !locked],
        [charging, 'bolt', kw != null && kw > 0.3 ? `Lader ${nf(kw, 1)} kW` : 'Lader', C.green, true], [climate, 'heat', !isNaN(climTemp) ? `Klima ${Math.round(climTemp)}°` : 'Klima på', C.amber, true],
        [windowOpen, 'window', 'Vindu åpent', C.blue, true], [frunk, 'garage', 'Frunk åpen', C.blue, true], [trunk, 'local_shipping', 'Bagasje åpen', C.blue, true], [portOpen, 'ev_charger', 'Ladeport åpen', C.blue, true]]
        .filter((x, i) => i === 0 || x[0]).map(([, icon, t, c, hi]) => `<span style="height:24px;padding:0 9px 0 7px;border-radius:12px;display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;white-space:nowrap;background:${hi ? a(c, 0.18) : 'rgba(255,255,255,0.07)'};color:${c}"><span class="ms" style="font-size:14px;font-variation-settings:'FILL' 1">${icon}</span>${e(t)}</span>`).join('');
      const batCol = b != null && b < 20 ? C.red : C.green;
      const heroRight = charging ? [`${eta === 'ferdig' ? 'Ferdig ladet' : `${eta} til ${lim == null ? '–' : lim} %`}`, kw != null && kw > 0.3 ? `${nf(kw, 1)} kW` : 'Lader'] : [zoneRaw === 'not_home' ? 'Underveis' : 'Parkert', lim != null ? `Ladegrense ${lim} %` : ''];
      const hero = `<section data-on-click="openMore" data-arg="${e(batId || cf.lader || '')}" style="position:relative;overflow:hidden;padding:18px 18px 16px;border-radius:30px;box-sizing:border-box;display:flex;flex-direction:column;gap:6px;background:${heroBg};box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05);transition:background .8s;cursor:pointer">
    <div style="position:relative;z-index:1;display:flex;align-items:flex-start;gap:10px">
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">
        <span style="font-size:18px;font-weight:600;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(cf.navn)}</span>
        ${place ? `<span data-on-click="openMore" data-arg="${e(trId)}" style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#a9a7a2;min-width:0"><span class="ms" style="font-size:15px;font-variation-settings:'FILL' 1">${zoneRaw === 'home' ? 'home' : 'location_on'}</span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(place)}</span></span>` : ''}
      </div>
      ${sentryId ? `<button data-on-click="toggleSentry" style="flex:none;height:32px;padding:0 12px 0 10px;border-radius:16px;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;background:${sentry ? a(C.red, 0.18) : 'rgba(255,255,255,0.07)'};color:${sentry ? C.red : '#a9a7a2'}"><span class="ms" style="font-size:16px;font-variation-settings:'FILL' 1">${sentry ? 'videocam' : 'videocam_off'}</span>Sentry</button>` : ''}
    </div>
    <div style="position:relative;z-index:1;display:flex;gap:5px;flex-wrap:wrap">${chips}</div>
    <div style="position:relative;height:150px;margin:0 -6px">
      ${cf.bilde ? `<img src="${e(cf.bilde)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 16px 20px rgba(0,0,0,0.5))">` : carScene(sc, 'position:absolute;left:50%;top:0;width:300px;max-width:100%;height:150px;transform:translateX(-50%);pointer-events:none')}
    </div>
    <div style="position:relative;z-index:1;display:flex;align-items:flex-end;justify-content:space-between;gap:10px">
      <div style="display:flex;flex-direction:column;gap:2px;min-width:0">
        <span style="font-size:52px;font-weight:300;letter-spacing:-0.045em;line-height:0.95;font-variant-numeric:tabular-nums">${b == null ? '–' : b}<span style="font-size:20px;color:#8e8d89;letter-spacing:0;margin-left:2px">%</span></span>
        <span style="font-size:13px;color:#a9a7a2;white-space:nowrap"><span style="color:#f2f1ee;font-weight:600">${range == null ? '–' : Math.round(range)} km</span> rekkevidde</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;min-width:0;text-align:right;padding-bottom:2px">
        <span style="font-size:13px;font-weight:600;color:${charging ? C.green : '#f2f1ee'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${e(heroRight[0])}</span>
        <span style="font-size:12px;color:#8e8d89;white-space:nowrap">${e(heroRight[1])}</span>
      </div>
    </div>
    <div style="position:relative;z-index:1;height:12px;border-radius:6px;background:rgba(255,255,255,0.08);margin-top:8px">
      <div style="position:absolute;left:0;top:0;bottom:0;width:${batt == null ? 0 : KD.clamp(batt, 0, 100)}%;border-radius:6px;background:${charging ? `repeating-linear-gradient(-45deg, ${C.green} 0 10px, oklch(0.72 0.12 150) 10px 20px)` : `linear-gradient(90deg, ${a(batCol, 0.75)}, ${batCol})`};box-shadow:0 0 14px ${a(batCol, 0.35)};transition:width 1s${charging ? ';animation:kdcflow .9s linear infinite' : ''}"></div>
      ${lim == null ? '' : `<span style="position:absolute;top:-4px;bottom:-4px;left:calc(${lim}% - 1px);width:2px;border-radius:1px;background:#f2f1ee;box-shadow:0 0 6px rgba(0,0,0,0.6);transition:left .3s"></span>`}
    </div>
  </section>`;

      /* ---- hurtigknapper ---- */
      const tile = (k, icon, label, sub, on, col, handler = 'act') => `<button class="kd-car-act" data-on-click="${handler}" data-arg="${k}" style="min-width:0;height:88px;border-radius:22px;padding:10px 4px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;background:${on ? a(col, 0.15) : '#1c1c1f'};box-shadow:${on ? `inset 0 0 0 1px ${a(col, 0.45)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)'};transition:transform .15s, background .25s">
        <span style="width:38px;height:38px;border-radius:19px;display:grid;place-items:center;background:${on ? a(col, 0.25) : '#2a2a2e'};color:${on ? col : '#e4e2dd'};transition:background .25s"><span class="ms" style="font-size:21px;font-variation-settings:'FILL' ${on ? 1 : 0}">${icon}</span></span>
        <span style="display:flex;flex-direction:column;align-items:center;gap:0;min-width:0;max-width:100%"><span style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${e(label)}</span><span style="font-size:10.5px;color:${on ? col : '#8e8d89'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${e(sub)}</span></span></button>`;
      const tiles = [
        tile('lock', locked ? 'lock' : 'lock_open', locked ? 'Låst' : 'Ulåst', locked ? 'Sikret' : 'Trykk for å låse', !locked, C.amber),
        tile('climate', 'heat', 'Klima', climate ? (!isNaN(climTemp) ? `På · ${Math.round(climTemp)}°` : 'På') : !isNaN(inside) ? `Av · ${Math.round(inside)}° inne` : 'Av', climate, C.amber),
        cf.frunk && this.st(cf.frunk) ? tile('frunk', 'garage', 'Frunk', frunk ? 'Åpen' : 'Lukket', frunk, C.blue) : '',
        cf.bagasje && this.st(cf.bagasje) ? tile('trunk', 'local_shipping', 'Bagasje', trunk ? 'Åpen' : 'Lukket', trunk, C.blue) : '',
        portId ? tile('port', 'ev_charger', 'Ladeport', portOpen ? 'Åpen' : 'Lukket', portOpen, C.green) : '',
        cf.vindu && this.st(cf.vindu) ? tile('window', 'window', 'Vinduer', windowOpen ? 'Luftes' : 'Lukket', windowOpen, C.blue) : '',
        sentryId ? tile('sentry', sentry ? 'videocam' : 'videocam_off', 'Sentry', sentry ? 'Overvåker' : 'Av', sentry, C.red) : '',
        cf.tut ? tile('horn', 'campaign', 'Tut', 'Blink og tut', s.flash === 'horn', C.blue) : '',
      ].filter(Boolean);
      const controls = `<section style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">${tiles.join('')}</section>`;

      const hasClim = !!(climId || (cf.defrost && this.st(cf.defrost)));
      const tabList = [['charge', 'Lading', 'bolt'], ...(hasClim ? [['climate', 'Klima', 'thermostat']] : []), ['drive', 'Kjøring', 'route'], ['save', 'Sparing', 'savings']];
      const tab = tabList.some(t => t[0] === s.tab) ? s.tab : 'charge';
      const tabs = KD.segHTML('car-tab', tabList, tab, 'tab', { pink: true });
      let tabHTML = '';

      if (tab === 'charge') {
        const steps = [50, 60, 70, 80, 90, 100];
        if (lim != null && !steps.includes(lim)) { steps.push(lim); steps.sort((x, y) => x - y); if (steps.length > 6) steps.splice(steps.indexOf(lim) === 0 ? 1 : 0, 1); }
        const cStats = [['Effekt', kw == null ? '–' : `${nf(kw, 1)} kW`, cf.ladeeffekt], ['Til grensen', eta, cf.ladetid], ['Kostnad', cost === '–' ? '–' : `${cost} kr`, cf.ladepris]];
        tabHTML = `<section style="position:relative;overflow:hidden;display:flex;flex-direction:column;gap:14px;padding:16px;border-radius:26px;background:${charging ? `linear-gradient(150deg, ${a(C.green, 0.2)}, ${a(C.green, 0.05)} 60%), #1c1c1f` : '#1c1c1f'};box-shadow:inset 0 0 0 1px ${charging ? a(C.green, 0.3) : 'rgba(255,255,255,0.04)'}">
      <button data-on-click="toggleCharge" style="display:flex;align-items:center;gap:12px;text-align:left;width:100%">
        <span style="width:46px;height:46px;border-radius:23px;flex:none;display:grid;place-items:center;background:${charging ? C.green : '#2a2a2e'};color:${charging ? '#10231a' : '#e4e2dd'}"><span class="ms" style="font-size:24px;font-variation-settings:'FILL' 1">ev_station</span></span>
        <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:16px;font-weight:600">${charging ? 'Lader nå' : 'Lading av'}</span><span style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(charging ? (eta === 'ferdig' ? 'Ladegrensen er nådd' : `Ferdig om ca. ${eta}`) : smartOn ? 'KI Lading styrer når bilen lader' : 'Trykk for å starte lading')}</span></span>
        ${this.sw(charging)}
      </button>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-radius:18px;background:rgba(255,255,255,0.04);padding:10px 0">
        ${cStats.map(([l, v, id], i) => `<div data-on-click="openMore" data-arg="${e(id || '')}" style="min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;padding:0 6px;${i ? 'border-left:1px solid rgba(255,255,255,0.06)' : ''}"><span style="font-size:11px;color:#8e8d89;white-space:nowrap">${e(l)}</span><span style="font-size:15px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${e(v)}</span></div>`).join('')}
      </div>
    </section>
    ${cf.ladegrense && this.st(cf.ladegrense) ? `<section style="display:flex;flex-direction:column;gap:8px">
      ${lbl('Ladegrense', `<span style="font-size:13px;font-weight:600;font-variant-numeric:tabular-nums">${lim == null ? '–' : lim} %</span>`)}
      ${KD.segHTML('car-lim', steps.map(v => [String(v), `${v} %`]), lim == null ? '' : String(lim), 'setLimit', {})}
      <div style="display:flex;justify-content:space-between;padding:0 6px;font-size:11px;color:#6d6c69"><span>Hverdag 70–80 %</span><span>Langtur 100 %</span></div>
    </section>` : ''}
    <div style="font-size:17px;line-height:1.85;text-wrap:pretty;padding:0 4px;color:#c9c7c2">Det tar ca. <span style="${PILL}">${e(eta)}</span> å lade til <span style="${PILL};background:oklch(0.78 0.13 350 / 0.2);box-shadow:inset 0 0 0 1px oklch(0.78 0.13 350 / 0.45)">${lim == null ? '–' : lim} %</span> og koster ca. <span style="${PILL}">${e(cost)} kr</span>. Sist lading kostet <span style="${PILL}">${e(last)} kr</span>.</div>
    ${cf.smartlading && this.st(cf.smartlading) ? `<section><button data-on-click="toggleSmart" style="width:100%;display:flex;align-items:center;gap:12px;padding:14px;border-radius:24px;text-align:left;background:${smartOn ? 'linear-gradient(135deg, oklch(0.78 0.13 350 / 0.16), oklch(0.9 0.05 20 / 0.06)), #1c1c1f' : '#1c1c1f'};box-shadow:inset 0 0 0 1px ${smartOn ? 'oklch(0.78 0.13 350 / 0.35)' : 'rgba(255,255,255,0.04)'}">
      <span style="width:42px;height:42px;border-radius:21px;flex:none;display:grid;place-items:center;background:${smartOn ? PINK : '#2a2a2e'};color:${smartOn ? '#2a1720' : '#e4e2dd'}"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">auto_awesome</span></span>
      <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:600">KI Lading</span><span style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(smartOn ? 'Lader i billigste timer' + (til ? ` · ferdig ${til}` : '') : 'Lader med en gang bilen kobles til')}</span></span>
      ${this.sw(smartOn)}
    </button></section>` : ''}`;
      }

      if (tab === 'climate') {
        const cOn = climate, cc = C.amber;
        const seats = this.seats();
        const tog = (h, icon, title, sub, on, col) => `<button data-on-click="${h}" style="width:100%;display:flex;align-items:center;gap:12px;padding:12px 14px;text-align:left;border-radius:22px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04)">
        <span style="width:38px;height:38px;border-radius:19px;flex:none;display:grid;place-items:center;background:${on ? a(col, 0.2) : '#2a2a2e'};color:${on ? col : '#c9c7c2'}"><span class="ms" style="font-size:20px;font-variation-settings:'FILL' 1">${icon}</span></span>
        <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:14px;font-weight:600">${e(title)}</span><span style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(sub)}</span></span>${this.sw(on)}</button>`;
        tabHTML = `${climId ? `<section style="position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;gap:14px;padding:18px 16px 16px;border-radius:26px;background:${cOn ? `radial-gradient(100% 90% at 50% 0%, ${a(cc, 0.22)}, rgba(0,0,0,0) 70%), #1c1c1f` : '#1c1c1f'};box-shadow:inset 0 0 0 1px ${cOn ? a(cc, 0.3) : 'rgba(255,255,255,0.04)'}">
      <div style="width:100%;display:flex;justify-content:space-between;align-items:center;gap:8px">
        <span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#a9a7a2"><span class="ms" style="font-size:16px">device_thermostat</span>Inne ${isNaN(inside) ? '–' : nf(inside, 0)}°</span>
        <button data-on-click="act" data-arg="climate" style="height:32px;padding:0 14px 0 10px;border-radius:16px;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;background:${cOn ? cc : 'rgba(255,255,255,0.08)'};color:${cOn ? '#2a1c0c' : '#e4e2dd'}"><span class="ms" style="font-size:17px;font-variation-settings:'FILL' 1">power_settings_new</span>${cOn ? 'På' : 'Av'}</button>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:22px">
        <button data-on-click="stepTemp" data-arg="-1" style="width:52px;height:52px;border-radius:26px;display:grid;place-items:center;background:#2a2a2e"><span class="ms" style="font-size:26px">remove</span></button>
        <span style="min-width:120px;text-align:center;font-size:58px;font-weight:300;letter-spacing:-0.04em;line-height:1;font-variant-numeric:tabular-nums;color:${cOn ? '#f2f1ee' : '#a9a7a2'}">${isNaN(climTemp) ? '–' : nf(climTemp, climTemp % 1 ? 1 : 0)}<span style="font-size:24px;color:#8e8d89">°</span></span>
        <button data-on-click="stepTemp" data-arg="1" style="width:52px;height:52px;border-radius:26px;display:grid;place-items:center;background:#2a2a2e"><span class="ms" style="font-size:26px">add</span></button>
      </div>
      <span style="font-size:12px;color:#8e8d89">${cOn ? 'Klimaanlegget går' : 'Forvarm bilen før du drar'}</span>
    </section>` : ''}
    ${cf.defrost && this.st(cf.defrost) || cf.vindu && this.st(cf.vindu) ? `<section style="display:flex;flex-direction:column;gap:8px">
      ${cf.defrost && this.st(cf.defrost) ? tog('toggleDefrost', 'ac_unit', 'Avising', this.isOn(cf.defrost) ? 'Maks varme på ruter og speil' : 'Av', this.isOn(cf.defrost), C.blue) : ''}
      ${cf.vindu && this.st(cf.vindu) ? tog('toggleWindow', 'window', 'Luft vinduene', windowOpen ? 'Vinduene står på gløtt' : 'Lukket', windowOpen, C.blue) : ''}
    </section>` : ''}
    ${seats.map(x => `<section style="display:flex;flex-direction:column;gap:8px">
      ${lbl(x.navn)}
      ${KD.segHTML('seat-' + x.id, x.opts.map(o => [x.id + '|' + o, SEAT[String(o).toLowerCase()] || o]), x.id + '|' + this.v(x.id), 'selOpt', { small: true })}
    </section>`).join('')}`;
      }

      if (tab === 'drive') {
        const fb = this.auto('forbruk');
        const kmToday = this.n(cf.i_dag), odo = this.n(cf.km_stand);
        const driveStats = [['route', 'I dag', kmToday == null ? '–' : `${Math.round(kmToday).toLocaleString('nb-NO')} km`, cf.i_dag], ['electric_bolt', 'Forbruk', fb && this.ok(fb) ? `${Math.round(this.n(fb))} ${this.unit(fb) || 'Wh/km'}` : '–', fb], ['speed', 'Km-stand', odo == null ? '–' : Math.round(odo).toLocaleString('nb-NO'), cf.km_stand]];
        const dur = (ms) => { const m = Math.round(ms / 60e3); return m >= 60 ? `${Math.floor(m / 60)} t ${m % 60} min` : `${m} min`; };
        const whenW = (d) => { const t0 = new Date(); t0.setHours(0, 0, 0, 0); const diff = Math.round((t0 - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400e3); if (diff <= 0) return 'I dag'; if (diff === 1) return 'I går'; const w = d.toLocaleDateString('nb-NO', { weekday: 'short' }).replace('.', ''); return w.charAt(0).toUpperCase() + w.slice(1); };
        const trips = this.trips();
        const ty = this.tyres();
        const trS = trId ? this.st(trId) : null;
        tabHTML = `${place ? `<section data-on-click="openMore" data-arg="${e(trId)}" style="display:flex;align-items:center;gap:12px;padding:14px;${card};cursor:pointer">
      <span style="position:relative;width:46px;height:46px;border-radius:23px;flex:none;display:grid;place-items:center;background:${a(C.blue, 0.16)};color:${C.blue}"><span class="ms" style="font-size:24px;font-variation-settings:'FILL' 1">${zoneRaw === 'home' ? 'home' : 'location_on'}</span></span>
      <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:11px;color:#8e8d89">Posisjon</span><span style="font-size:16px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(place)}</span><span style="font-size:12px;color:#6d6c69">${trS ? `Sist endret ${e(KD.ago(trS.last_changed))}` : ''}</span></span>
      <span class="ms" style="font-size:22px;color:#6d6c69">chevron_right</span>
    </section>` : ''}
    <section style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
      ${driveStats.map(([ic, l, v, id]) => `<div data-on-click="openMore" data-arg="${e(id || '')}" style="min-width:0;display:flex;flex-direction:column;gap:8px;padding:14px;${card}"><span class="ms" style="font-size:20px;color:#8e8d89">${ic}</span><span style="display:flex;flex-direction:column;gap:2px;min-width:0"><span style="font-size:11px;color:#8e8d89">${e(l)}</span><span style="font-size:15px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(v)}</span></span></div>`).join('')}
    </section>
    ${ty ? `<section style="display:flex;flex-direction:column;gap:8px">
      ${lbl('Dekktrykk', ty.low ? `<span style="font-size:12px;color:${C.amber}">Sjekk trykket</span>` : `<span style="font-size:12px;color:#6d6c69">Alt i orden</span>`)}
      <div style="position:relative;display:grid;grid-template-columns:minmax(0,1fr) 84px minmax(0,1fr);grid-template-rows:auto auto;gap:14px 10px;align-items:center;padding:16px;${card}">
        ${['fl', 'fr', 'rl', 'rr'].map((k, i) => { const t = ty[k]; const lo = t && t.low; return `<div data-on-click="openMore" data-arg="${e(t ? t.id : '')}" style="grid-column:${i % 2 ? 3 : 1};grid-row:${i < 2 ? 1 : 2};min-width:0;display:flex;flex-direction:column;align-items:${i % 2 ? 'flex-start' : 'flex-end'};gap:1px"><span style="font-size:22px;font-weight:400;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;color:${lo ? C.amber : '#f2f1ee'}">${t ? nf(t.v, t.u === 'psi' ? 0 : 1) : '–'}<span style="font-size:11px;color:#8e8d89;margin-left:3px">${e(t ? t.u : '')}</span></span><span style="font-size:11px;color:#8e8d89">${['Foran venstre', 'Foran høyre', 'Bak venstre', 'Bak høyre'][i]}</span></div>`; }).join('')}
        <svg viewBox="0 0 84 150" style="grid-column:2;grid-row:1 / span 2;width:84px;height:150px">
          <rect x="14" y="6" width="56" height="138" rx="24" fill="#2a2a2e" stroke="rgba(255,255,255,0.10)"></rect>
          <path d="M22 44 Q42 34 62 44 L60 62 Q42 56 24 62 Z" fill="#1a1d22"></path><path d="M24 104 Q42 98 60 104 L62 118 Q42 126 22 118 Z" fill="#1a1d22"></path>
          ${[[6, 26, 'fl'], [70, 26, 'fr'], [6, 98, 'rl'], [70, 98, 'rr']].map(([x, y, k]) => `<rect x="${x}" y="${y}" width="8" height="26" rx="4" fill="${ty[k] && ty[k].low ? C.amber : ty[k] ? C.green : '#48474a'}"></rect>`).join('')}
        </svg>
      </div>
    </section>` : ''}
    ${trips.length ? `<section style="display:flex;flex-direction:column;gap:8px">
      ${lbl('Siste turer')}
      <div style="display:flex;flex-direction:column;padding:2px 14px;${card}">
      ${trips.map((t, i) => `<div style="display:flex;gap:14px;padding:12px 0;${i ? 'border-top:1px solid rgba(255,255,255,0.05)' : ''}">
          <div style="display:flex;flex-direction:column;align-items:center;width:10px;flex:none;padding-top:5px;gap:3px"><span style="width:8px;height:8px;border-radius:4px;background:#8e8d89"></span><span style="width:1px;height:14px;background:#48474a"></span><span style="width:8px;height:8px;border-radius:4px;background:${C.green}"></span></div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
            <span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(`${t.from} → ${t.to}`)}</span>
            <span style="font-size:12px;color:#8e8d89">${e([t.km != null ? `${Math.round(t.km).toLocaleString('nb-NO')} km` : '', dur(t.d1 - t.d0), t.kwh != null ? `${t.kwh < 10 ? nf(t.kwh, 1) : Math.round(t.kwh)} kWh` : ''].filter(Boolean).join(' · '))}</span>
          </div>
          <span style="font-size:12px;color:#8e8d89;white-space:nowrap">${e(whenW(t.d1))}</span>
        </div>`).join('')}
      </div>
    </section>` : ''}`;
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

      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:18px">
  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89"><span>${e(cf.navn)}</span></div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>
  ${hero}
  ${controls}
  ${tabs}
  ${tabHTML}
</div>`;
    }
    /** Bryter (spor + knott) */
    sw(on) { return `<span style="position:relative;width:46px;height:28px;border-radius:14px;flex:none;background:${on ? 'oklch(0.72 0.14 150)' : 'rgba(255,255,255,0.18)'};transition:background .2s"><span style="position:absolute;top:3px;left:${on ? 21 : 3}px;width:22px;height:22px;border-radius:11px;background:#f4f3ef;box-shadow:0 2px 6px rgba(0,0,0,0.3);transition:left .25s cubic-bezier(.34,1.4,.64,1)"></span></span>`; }
  }

  KD.define('kd-bil-card', KDBilCard, 'KD Bil', 'Tesla Model Y – pikselkopi av Claude Design');
  KD.sheet('car', 'kd-bil-card');
})();
