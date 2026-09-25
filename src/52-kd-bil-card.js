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
  };

  /** Bilscenen (designets CarScene) som SVG/HTML-streng */
  function carScene(s) {
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
    return `<div style="position:absolute;right:6px;bottom:8px;width:230px;height:118px;pointer-events:none">`
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
.kd-car-act:active{transform:scale(0.94)}`;

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
      const batId = this.auto('batteri'), climId = this.auto('klima'), sentryId = this.auto('sentry');
      const batt = this.n(batId), limit = this.n(cf.ladegrense), range = this.n(cf.rekkevidde);
      const kw = this.kw();
      const lsId = this.auto('ladestatus'), ls = String(this.v(lsId)).toLowerCase();
      const charging = this.isOn(cf.lader) || (/charging|starting/.test(ls) && !/not|complete|stopped|disconnected/.test(ls)) || (kw != null && kw > 0.3);
      const locked = !this.unlocked();
      const climate = climId ? (this.ok(climId) && this.v(climId) !== 'off') : this.isOn(cf.defrost);
      const climTemp = climId ? this.at(climId, 'temperature') : null;
      const frunk = this.isOpen(cf.frunk), trunk = this.isOpen(cf.bagasje), windowOpen = this.isOpen(cf.vindu);
      const sentry = sentryId ? this.isOn(sentryId) : false;
      const sc = { climate, charging, sentry, locked, frunk, trunk, window: windowOpen };
      const b = batt == null ? null : Math.floor(batt);
      const lim = limit == null ? null : Math.round(limit);
      const sw = (on) => ({ track: { position: 'relative', width: 46, height: 28, borderRadius: 14, flex: 'none', background: on ? 'oklch(0.72 0.14 150)' : 'rgba(255,255,255,0.18)', transition: 'background .2s' }, knob: { position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: 11, background: '#f4f3ef', transition: 'left .2s' } });
      const act = (k, icon, label, on, col) => ({ k, icon, label,
        style: { height: 72, borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: on ? a(col, 0.16) : '#1c1c1f', boxShadow: on ? `inset 0 0 0 1px ${a(col, 0.45)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)', color: on ? '#f2f1ee' : '#c9c7c2', transition: 'background .2s' },
        iconStyle: { fontSize: 24, color: on ? col : '#c9c7c2', fontVariationSettings: `'FILL' ${on ? 1 : 0}` } });
      const cap = cf.kapasitet || 75;
      const need = batt != null && limit != null ? Math.max(0, limit - batt) / 100 * cap : null;
      let mins = null;
      if (charging && this.n(cf.ladetid, 0) > 0) mins = Math.round(this.n(cf.ladetid));
      else if (need != null) mins = Math.round(need / (charging && kw > 0.3 ? kw : (cf.ladeeffekt_kw || 11)) * 60);
      const eta = mins == null ? '–' : mins ? (mins >= 60 ? `${Math.floor(mins / 60)} t ${mins % 60} min` : `${mins} min`) : 'ferdig';
      const strom = this.n(cf.strompris);
      const cost = this.ok(cf.ladepris) ? Math.round(this.n(cf.ladepris)) : need != null && strom != null ? Math.round(need * strom) : '–';
      const last = this.ok(cf.forrige_lading) ? Math.round(this.n(cf.forrige_lading)) : '–';
      const tabF = (k, l) => ({ k, label: l, style: { height: 38, borderRadius: 16, fontSize: 13, fontWeight: 500, background: s.tab === k ? PINK : 'transparent', color: s.tab === k ? '#2a1720' : '#a9a7a2' } });
      const ch = sw(charging), smartOn = this.isOn(cf.smartlading), sm = sw(smartOn);
      const til = /^\d{1,2}:\d{2}/.test(this.v(cf.nattlading_til)) && this.isOn(cf.nattlading) ? this.v(cf.nattlading_til).slice(0, 5) : null;
      const sceneCard = { position: 'relative', overflow: 'hidden', minHeight: 196, padding: 18, borderRadius: 30, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: climate ? 'radial-gradient(120% 90% at 75% 60%, #3a2a24 0%, #1f1f24 55%, #18181b 100%)' : charging ? 'radial-gradient(120% 90% at 75% 80%, #1c2e27 0%, #1c1f24 55%, #18181b 100%)' : 'radial-gradient(120% 90% at 75% 70%, #262b33 0%, #1c1e22 55%, #18181b 100%)', transition: 'background .8s' };
      const sentryPill = { pointerEvents: 'auto', height: 32, padding: '0 12px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, background: sentry ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)', color: sentry ? '#f2f1ee' : '#8e8d89' };
      const badgeList = [[charging, 'bolt', 'Lader', C.green], [climate, 'heat', climTemp != null ? `Varmer ${Math.round(climTemp)}°` : 'Varmer', C.amber], [windowOpen, 'window', 'Vindu åpent', C.blue], [frunk, 'garage', 'Frunk åpen', C.blue], [trunk, 'local_shipping', 'Bagasje åpen', C.blue]].filter(x => x[0]).map(([, icon, t, c]) => ({ icon, t, style: { height: 22, padding: '0 8px', borderRadius: 11, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, background: a(c, 0.18), color: c, whiteSpace: 'nowrap' } }));
      const winBtn = { position: 'absolute', right: 14, top: 14, zIndex: 2, width: 36, height: 36, borderRadius: 18, display: 'grid', placeItems: 'center', background: windowOpen ? a(C.blue, 0.25) : 'rgba(255,255,255,0.08)', color: windowOpen ? C.blue : '#c9c7c2' };
      const batBar = { position: 'absolute', left: 0, top: 0, bottom: 0, width: `${batt == null ? 0 : KD.clamp(batt, 0, 100)}%`, borderRadius: 7, background: charging ? `repeating-linear-gradient(-45deg, ${C.green} 0 10px, oklch(0.74 0.12 150) 10px 20px)` : C.green, transition: 'width 1s' };
      const limitMark = { position: 'absolute', top: -2, bottom: -2, left: `${lim == null ? 100 : lim}%`, width: 2, background: '#f2f1ee', transition: 'left .3s', display: lim == null ? 'none' : '' };
      const actions = [
        act('lock', locked ? 'lock' : 'lock_open', locked ? 'Låst' : 'Ulåst', !locked, C.amber),
        act('horn', 'campaign', 'Tut', s.flash === 'horn', C.blue),
        act('climate', 'heat', climate ? (climTemp != null ? `${Math.round(climTemp)}°` : 'På') : 'Klima', climate, C.red),
        act('frunk', 'garage', 'Frunk', frunk, C.blue),
        act('trunk', 'local_shipping', 'Bagasje', trunk, C.blue),
      ];
      const tabs = [tabF('charge', 'Lading'), tabF('drive', 'Kjøring'), tabF('save', 'Sparing')];
      const chargeCard = { height: 120, borderRadius: 22, padding: 16, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start', background: charging ? PINK : '#1c1c1f', color: charging ? '#2a1720' : '#f2f1ee', textAlign: 'left', transition: 'background .25s' };
      const limits = [50, 60, 70, 80, 100].map(v => ({ v, label: `${v} %`, style: { height: 44, borderRadius: 14, fontSize: 13, fontWeight: 500, background: lim === v ? PINK : 'transparent', color: lim === v ? '#2a1720' : '#a9a7a2' } }));
      const smartSub = smartOn ? 'Lader i billigste timer' + (til ? ` · ferdig ${til}` : '') : 'Lader med en gang bilen kobles til';

      // kjøring
      const fb = this.auto('forbruk');
      const kmToday = this.n(cf.i_dag), odo = this.n(cf.km_stand);
      const driveStats = [['I dag', kmToday == null ? '–' : `${Math.round(kmToday).toLocaleString('nb-NO')} km`], ['Forbruk', fb && this.ok(fb) ? `${Math.round(this.n(fb))} ${this.unit(fb) || 'Wh/km'}` : '–'], ['Km-stand', odo == null ? '–' : Math.round(odo).toLocaleString('nb-NO')]].map(([label, v]) => ({ label, v }));
      const dur = (ms) => { const m = Math.round(ms / 60e3); return m >= 60 ? `${Math.floor(m / 60)} t ${m % 60} min` : `${m} min`; };
      const whenW = (d) => { const t0 = new Date(); t0.setHours(0, 0, 0, 0); const diff = Math.round((t0 - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400e3); if (diff <= 0) return 'I dag'; if (diff === 1) return 'I går'; const w = d.toLocaleDateString('nb-NO', { weekday: 'short' }).replace('.', ''); return w.charAt(0).toUpperCase() + w.slice(1); };
      const trips = s.tab === 'drive' ? this.trips().map((t, i) => ({ route: `${t.from} → ${t.to}`,
        meta: [t.km != null ? `${Math.round(t.km).toLocaleString('nb-NO')} km` : '', dur(t.d1 - t.d0), t.kwh != null ? `${t.kwh < 10 ? nf(t.kwh, 1) : Math.round(t.kwh)} kWh` : ''].filter(Boolean).join(' · '),
        when: whenW(t.d1), row: { display: 'flex', gap: 14, padding: '12px 4px', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' } })) : [];

      // sparing
      const pctOf = (id) => { const d = Number(this.at(id, 'diesel_ville_kostet')), el = Number(this.at(id, 'strom_kostet')); return d > 0 && !isNaN(el) ? KD.clamp(Math.round((1 - el / d) * 100), 0, 100) : null; };
      const saveCards = [['Spart denne måneden', cf.spart_maned, C.green], ['Spart i år', cf.spart_ar, C.amber]].map(([label, id, c]) => {
        const p = pctOf(id);
        return { label, id, v: this.ok(id) ? Math.round(this.n(id)).toLocaleString('nb-NO') : '–', pct: p == null ? '–' : `${p} %`,
          fill: { width: (p || 0) + '%', height: '100%', background: c, transition: 'width 1.2s cubic-bezier(.2,.9,.3,1)' },
          hatch: { flex: 1, height: '100%', background: 'repeating-linear-gradient(-45deg, ' + c + ' 0 2px, transparent 2px 6px)', opacity: 0.8 } };
      });
      const num = (id, fn) => this.ok(id) ? fn(this.n(id)) : '–';
      const saveStats = [['electric_car', num(cf.kr_mil_el, v => nf(v, 2)), 'Tesla · kr/mil', cf.kr_mil_el], ['directions_car', num(cf.kr_mil_diesel, v => nf(v, 2)), 'Audi A6 · kr/mil', cf.kr_mil_diesel],
        ['local_gas_station', num(cf.diesel_liter, v => `${Math.round(v).toLocaleString('nb-NO')} L`), 'Diesel ikke fylt', cf.diesel_liter], ['co2', num(cf.co2, v => `${Math.round(v).toLocaleString('nb-NO')} kg`), 'CO₂ spart', cf.co2],
        ['oil_barrel', num(cf.dieselpris, v => nf(v, 2)), 'Diesel · kr/L', cf.dieselpris], ['ev_charger', num(cf.strompris, v => nf(v, 2)), 'Strøm · kr/kWh', cf.strompris]].map(([icon, v, k, id]) => ({ icon, v, k, id }));
      const kjort = Number(this.at(cf.spart_ar, 'kjort_km'));
      const yearKm = isNaN(kjort) ? '–' : `${Math.round(kjort).toLocaleString('nb-NO')} km`;
      const yearKr = this.ok(cf.spart_ar) ? `${Math.round(this.n(cf.spart_ar)).toLocaleString('nb-NO')} kroner` : '–';
      const inc = s.tab === 'save' ? this.dailySaved() : null;
      const maxInc = inc ? Math.max(...inc, 0.001) : 1;
      const daily = (inc || []).map((v, i) => ({ flex: 1, height: Math.max(4, v / maxInc * 100) + '%', borderRadius: '4px 4px 0 0', background: C.green, transition: 'height .9s cubic-bezier(.2,.9,.3,1) ' + (i * 0.02) + 's' }));
      const dailySum = inc ? nf(inc.reduce((x, y) => x + y, 0), 1) : '–';
      const pill = 'display:inline-flex;align-items:center;height:30px;padding:0 11px;border-radius:15px;background:#232326;font-weight:500;vertical-align:middle;white-space:nowrap';
      const pill2 = 'display:inline-block;padding:0 10px;border-radius:14px;background:#f2f1ee;color:#141416;font-weight:500;line-height:1.6';

      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,560px);min-height:100vh;margin:0 auto;background:#141416;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:20px">
  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89"><span>${e(cf.navn)}</span></div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section data-on-click="openMore" data-arg="${e(batId || cf.lader || '')}" style="${S(sceneCard)}">
    ${carScene(sc)}
    <div style="position:relative;z-index:1;display:flex;flex-direction:column;gap:10px;align-items:flex-start;pointer-events:none">
      <span style="font-size:14px;font-weight:500;color:#c9c7c2"><span>${e(cf.navn)}</span></span>
      ${sentryId ? `<button data-on-click="toggleSentry" style="${S(sentryPill)}"><span class="ms" style="font-size:16px;font-variation-settings:'FILL' 1"><span>${sentry ? 'videocam' : 'videocam_off'}</span></span><span>${sentry ? 'Sentry på' : 'Sentry av'}</span></button>` : ''}
      <div style="display:flex;gap:5px;flex-wrap:wrap;max-width:170px">${badgeList.map(x => `<span style="${S(x.style)}"><span class="ms" style="font-size:13px;font-variation-settings:'FILL' 1"><span>${x.icon}</span></span><span>${e(x.t)}</span></span>`).join('')}</div>
    </div>
    <div style="position:relative;z-index:1;display:flex;flex-direction:column;gap:4px;pointer-events:none">
      <span style="font-size:40px;font-weight:300;letter-spacing:-0.04em;line-height:1;font-variant-numeric:tabular-nums"><span>${b == null ? '–' : b}</span><span style="font-size:16px;color:#8e8d89"> %</span></span>
      <span style="font-size:12px;color:#8e8d89;white-space:nowrap"><span>${range == null ? '–' : Math.round(range)}</span> km · grense <span>${lim == null ? '–' : lim}</span> %</span>
    </div>
    ${cf.vindu && this.st(cf.vindu) ? `<button data-on-click="toggleWindow" title="Vindu" style="${S(winBtn)}"><span class="ms" style="font-size:18px">window</span></button>` : ''}
  </section>

  <section style="display:flex;flex-direction:column;gap:14px">
    <div style="position:relative;height:14px;border-radius:7px;background:#1f1f22;overflow:hidden">
      <div style="${S(batBar)}"></div>
      <span style="${S(limitMark)}"></span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#6d6c69"><span>0 %</span><span><span>${lim == null ? '' : `Grense ${lim} %`}</span></span></div>
  </section>

  <section style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">
    ${actions.map(c => `
      <button class="kd-car-act" data-on-click="act" data-arg="${c.k}" style="${S(c.style)}">
        <span class="ms" style="${S(c.iconStyle)}"><span>${c.icon}</span></span>
        <span style="font-size:10px;font-weight:500;white-space:nowrap"><span>${e(c.label)}</span></span>
      </button>`).join('')}
  </section>

  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2px;padding:4px;border-radius:20px;background:#1c1c1f">
    ${tabs.map(t => `<button data-on-click="tab" data-arg="${t.k}" style="${S(t.style)}"><span>${e(t.label)}</span></button>`).join('')}
  </div>

  ${s.tab === 'charge' ? `
    <section style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
      <button data-on-click="toggleCharge" style="${S(chargeCard)}">
        <div style="display:flex;justify-content:space-between;width:100%;align-items:center">
          <span class="ms" style="font-size:24px;font-variation-settings:'FILL' 1">ev_station</span>
          <span style="${S(ch.track)}"><span style="${S(ch.knob)}"></span></span>
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;align-items:flex-start">
          <span style="font-size:12px;opacity:0.75">Lading</span>
          <span style="font-size:26px;font-weight:400;letter-spacing:-0.02em"><span>${charging ? 'På' : 'Av'}</span></span>
        </div>
      </button>
      <div data-on-click="openMore" data-arg="${e(cf.ladeeffekt || '')}" style="height:120px;border-radius:22px;padding:16px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;background:#1c1c1f">
        <span class="ms" style="font-size:24px;color:#a9a7a2;font-variation-settings:'FILL' 1">bolt</span>
        <div style="display:flex;flex-direction:column;gap:2px">
          <span style="font-size:12px;color:#8e8d89">Ladeeffekt</span>
          <span style="font-size:26px;font-weight:300;letter-spacing:-0.02em;font-variant-numeric:tabular-nums"><span>${nf(kw == null ? null : kw, 1)}</span><span style="font-size:13px;color:#8e8d89"> kW</span></span>
        </div>
      </div>
    </section>
    ${cf.ladegrense && this.st(cf.ladegrense) ? `<section style="display:flex;flex-direction:column;gap:8px">
      <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:0 4px">Ladegrense</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:2px;padding:4px;border-radius:18px;background:#1c1c1f">
        ${limits.map(l => `<button data-on-click="setLimit" data-arg="${l.v}" style="${S(l.style)}"><span>${e(l.label)}</span></button>`).join('')}
      </div>
    </section>` : ''}
    <div style="font-size:18px;line-height:1.8;text-wrap:pretty;padding:0 4px">Det tar ca. <span style="${pill}"><span>${e(eta)}</span></span> å lade til <span style="display:inline-flex;align-items:center;height:30px;padding:0 11px;border-radius:15px;background:oklch(0.78 0.13 350 / 0.2);box-shadow:inset 0 0 0 1px oklch(0.78 0.13 350 / 0.45);font-weight:500;vertical-align:middle;white-space:nowrap"><span>${lim == null ? '–' : lim}</span> %</span> og koster ca. <span style="${pill}"><span>${e(cost)}</span> kr</span>. Sist lading kostet <span style="${pill}">${e(last)} kr</span>.</div>
    ${cf.smartlading && this.st(cf.smartlading) ? `<button data-on-click="toggleSmart" style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:22px;background:#1c1c1f;text-align:left">
      <span class="ms" style="font-size:22px;color:oklch(0.8 0.12 150);font-variation-settings:'FILL' 1">schedule</span>
      <div style="flex:1;display:flex;flex-direction:column;gap:2px">
        <span style="font-size:14px;font-weight:500">Smartlading</span>
        <span style="font-size:12px;color:#8e8d89"><span>${e(smartSub)}</span></span>
      </div>
      <span style="${S(sm.track)}"><span style="${S(sm.knob)}"></span></span>
    </button>` : ''}` : ''}

  ${s.tab === 'drive' ? `
    <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
      ${driveStats.map(t => `
        <div style="display:flex;flex-direction:column;gap:4px;padding:12px 14px;border-radius:18px;background:#1c1c1f">
          <div style="font-size:11px;color:#8e8d89;white-space:nowrap"><span>${e(t.label)}</span></div>
          <div style="font-size:16px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap"><span>${e(t.v)}</span></div>
        </div>`).join('')}
    </section>
    ${trips.length ? `<section style="display:flex;flex-direction:column;gap:2px">
      <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:0 4px 8px">Siste turer</div>
      ${trips.map(t => `
        <div style="${S(t.row)}">
          <div style="display:flex;flex-direction:column;align-items:center;width:10px;flex:none;padding-top:5px;gap:3px"><span style="width:8px;height:8px;border-radius:4px;background:#8e8d89"></span><span style="width:1px;height:14px;background:#48474a"></span><span style="width:8px;height:8px;border-radius:4px;background:oklch(0.8 0.12 150)"></span></div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
            <span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(t.route)}</span></span>
            <span style="font-size:12px;color:#8e8d89"><span>${e(t.meta)}</span></span>
          </div>
          <span style="font-size:12px;color:#8e8d89;white-space:nowrap"><span>${e(t.when)}</span></span>
        </div>`).join('')}
    </section>` : ''}` : ''}

  ${s.tab === 'save' ? `
    <section style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
      ${saveCards.map(c => `
        <div data-on-click="openMore" data-arg="${e(c.id)}" style="position:relative;overflow:hidden;display:flex;flex-direction:column;gap:6px;padding:16px 16px 30px;border-radius:26px;background:#1c1c1f">
          <span style="width:44px;height:44px;border-radius:22px;background:#262629;display:grid;place-items:center;margin-bottom:26px"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">savings</span></span>
          <span style="font-size:12px;color:#c9c7c2"><span>${e(c.label)}</span></span>
          <span style="display:flex;align-items:baseline;gap:4px;flex-wrap:wrap"><span style="font-size:30px;font-weight:300;letter-spacing:-0.03em;line-height:1;font-variant-numeric:tabular-nums;white-space:nowrap"><span>${e(c.v)}</span></span><span style="font-size:11px;color:#8e8d89">kr</span><span style="font-size:11px;color:#c9c7c2;margin-left:auto;white-space:nowrap"><span>${e(c.pct)}</span> billigere</span></span>
          <span style="position:absolute;left:0;right:0;bottom:0;height:22px;display:flex"><span style="${S(c.fill)}"></span><span style="${S(c.hatch)}"></span></span>
        </div>`).join('')}
    </section>
    <section style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
      ${saveStats.map(x => `
        <div data-on-click="openMore" data-arg="${e(x.id)}" style="display:flex;align-items:center;gap:10px;height:60px;padding:0 12px 0 5px;border-radius:30px;background:#1c1c1f">
          <span style="width:50px;height:50px;border-radius:25px;flex:none;background:#262629;display:grid;place-items:center"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1"><span>${x.icon}</span></span></span>
          <span style="display:flex;flex-direction:column;min-width:0"><span style="font-size:14px;font-weight:600;font-variant-numeric:tabular-nums"><span>${e(x.v)}</span></span><span style="font-size:11px;color:#a9a7a2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(x.k)}</span></span></span>
        </div>`).join('')}
    </section>
    <div style="font-size:18px;line-height:1.9;padding:0 4px;text-wrap:pretty">Så langt i år har dere kjørt <span style="${pill2}">${e(yearKm)}</span> og spart <span style="${pill2}">${e(yearKr)}</span> mot den gamle dieselen.</div>
    <section style="position:relative;overflow:hidden;display:flex;flex-direction:column;gap:6px;padding:16px 0 0;border-radius:26px;background:#1c1c1f">
      <span style="font-size:12px;color:#8e8d89;padding:0 16px">Spart per dag siste 30 dager</span>
      <span style="font-size:30px;font-weight:300;letter-spacing:-0.03em;padding:0 16px;font-variant-numeric:tabular-nums">${e(dailySum)}<span style="font-size:12px;color:#8e8d89"> kr</span></span>
      <div style="display:flex;align-items:flex-end;gap:3px;height:120px;padding:0 10px">${daily.map(x => `<span style="${S(x)}"></span>`).join('')}</div>
    </section>` : ''}
</div>`;
    }
  }

  KD.define('kd-bil-card', KDBilCard, 'KD Bil', 'Tesla Model Y – pikselkopi av Claude Design');
  KD.sheet('car', 'kd-bil-card');
})();
