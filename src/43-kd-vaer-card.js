/*
 * kd-vaer-card — «Vær» fra Claude Design, som Home Assistant-kort.
 *
 * type: custom:kd-vaer-card            # virker uten konfig
 * sted: Strømstad                      # stedsnavn i toppen
 * vaer: weather.forecast_home          # værentitet: nå-verdier + time-/dagsprognose (weather/subscribe_forecast)
 * naa: sensor.weather_forecast_v2      # valgfri: attributtet current (feels_like, uv_index …) fyller hull
 * sol: sun.sun                         # soloppgang/-nedgang, daggry/skumring, høyde nå
 * maane: sensor.oslo_moon_phase        # månefase (tilstand); opplyst andel, opp/ned og neste fullmåne regnes ut
 * pollen: auto                         # auto = alle sensor.pollen_<type>_…_pollen_today|tomorrow|…, eller liste med entiteter
 * luft: { aqi, pm25, pm10, no2, o3, stasjon }   # luftkvalitet; tom = oppdages via device_class (aqi, pm25, pm10, nitrogen_dioxide, ozone)
 * timer: 12                            # antall timer i «Neste timer»
 * dager: 7                             # antall dager i «7 dager»
 */
(() => {
  const KD = window.KD;
  const { S, e } = KD;
  const BLUE = 'oklch(0.8 0.12 250)', SUN = 'oklch(0.86 0.12 95)';
  const nf1 = (n, d = 1) => Number(n).toLocaleString('nb-NO', { minimumFractionDigits: d, maximumFractionDigits: d });
  const cap = t => t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  const COND = {
    'clear-night': ['Klart', 'clear_night'], cloudy: ['Overskyet', 'cloud'], exceptional: ['Ekstremvær', 'warning'], fog: ['Tåke', 'foggy'],
    hail: ['Hagl', 'weather_hail'], lightning: ['Torden', 'thunderstorm'], 'lightning-rainy': ['Torden og regn', 'thunderstorm'],
    partlycloudy: ['Delvis skyet', 'partly_cloudy_day'], pouring: ['Kraftig regn', 'rainy'], rainy: ['Regn', 'rainy'], snowy: ['Snø', 'weather_snowy'],
    'snowy-rainy': ['Sludd', 'weather_mix'], sunny: ['Sol', 'sunny'], windy: ['Vind', 'air'], 'windy-variant': ['Vind', 'air'],
  };
  const icon = (c, night) => { const ic = (COND[c] || ['', 'cloud'])[1]; return night && ic === 'sunny' ? 'clear_night' : ic; };
  const col = ic => ic === 'sunny' || ic === 'partly_cloudy_day' ? SUN : /rain|thunder|weather_mix|weather_hail/.test(ic) ? BLUE : '#bdbbb6';
  const DIRS = [['N', 'nord'], ['NØ', 'nordøst'], ['Ø', 'øst'], ['SØ', 'sørøst'], ['S', 'sør'], ['SV', 'sørvest'], ['V', 'vest'], ['NV', 'nordvest']];
  const BFT = [[0.3, 'stille'], [1.6, 'flau vind'], [3.4, 'svak vind'], [5.5, 'lett bris'], [8, 'laber bris'], [10.8, 'frisk bris'], [13.9, 'liten kuling'], [17.2, 'stiv kuling'], [20.8, 'sterk kuling'], [24.5, 'liten storm'], [28.5, 'full storm'], [32.7, 'sterk storm'], [Infinity, 'orkan']];
  const UV = [[3, 'lav'], [6, 'moderat'], [8, 'høy'], [11, 'svært høy'], [Infinity, 'ekstrem']];
  const MOONNAME = { new_moon: 'Nymåne', waxing_crescent: 'Voksende månesigd', first_quarter: 'Første kvarter', waxing_gibbous: 'Voksende halvmåne',
    full_moon: 'Fullmåne', waning_gibbous: 'Minkende halvmåne', last_quarter: 'Siste kvarter', waning_crescent: 'Minkende månesigd' };
  const POLLEN = { birch: ['Bjørk', 'park'], bjork: ['Bjørk', 'park'], grass: ['Gress', 'grass'], gress: ['Gress', 'grass'], mugwort: ['Burot', 'eco'], burot: ['Burot', 'eco'],
    alder: ['Or', 'forest'], or: ['Or', 'forest'], hazel: ['Hassel', 'nature'], hassel: ['Hassel', 'nature'], salix: ['Salix', 'spa'], willow: ['Salix', 'spa'] };
  const PORDER = ['Bjørk', 'Gress', 'Burot', 'Or', 'Hassel', 'Salix'];
  const PDAY = { today: 0, i_dag: 0, idag: 0, tomorrow: 1, i_morgen: 1, imorgen: 1, day_after_tomorrow: 2, overmorgen: 2, in_2_days: 2 };
  const L = [['Ingen', '#3a3a3d'], ['Lite', 'oklch(0.8 0.14 150)'], ['Moderat', 'oklch(0.86 0.13 95)'], ['Kraftig', 'oklch(0.76 0.15 55)'], ['Ekstrem', 'oklch(0.66 0.2 25)']];

  /* ---------- sol og måne (kompakt port av SunCalc, © Vladimir Agafonkin, BSD-2) ---------- */
  const rad = Math.PI / 180, dayMs = 864e5, J1970 = 2440588, J2000 = 2451545, ob = rad * 23.4397;
  const toJ = d => d / dayMs - 0.5 + J1970, fromJ = j => new Date((j + 0.5 - J1970) * dayMs), toDays = d => toJ(d) - J2000;
  const raA = (l, b) => Math.atan2(Math.sin(l) * Math.cos(ob) - Math.tan(b) * Math.sin(ob), Math.cos(l));
  const decA = (l, b) => Math.asin(Math.sin(b) * Math.cos(ob) + Math.cos(b) * Math.sin(ob) * Math.sin(l));
  const sidT = (d, lw) => rad * (280.16 + 360.9856235 * d) - lw;
  const altA = (H, phi, dec) => Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const sMA = d => rad * (357.5291 + 0.98560028 * d);
  const eLon = M => M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI;
  const sunCoords = d => { const L0 = eLon(sMA(d)); return { dec: decA(L0, 0), ra: raA(L0, 0) }; };
  const sunTimes = (date, lat, lng) => {
    const lw = rad * -lng, phi = rad * lat, d = toDays(date), n = Math.round(d - 0.0009 - lw / (2 * Math.PI));
    const ds = 0.0009 + lw / (2 * Math.PI) + n, M = sMA(ds), Lc = eLon(M), dec = decA(Lc, 0);
    const Jnoon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * Lc);
    const at = h => { const w = Math.acos((Math.sin(h * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec))); if (isNaN(w)) return [null, null];
      const a = 0.0009 + (w + lw) / (2 * Math.PI) + n, Jset = J2000 + a + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * Lc); return [fromJ(Jnoon - (Jset - Jnoon)), fromJ(Jset)]; };
    const [rise, set] = at(-0.833), [dawn, dusk] = at(-6), [, golden] = at(6);
    return { rise, set, dawn, dusk, golden };
  };
  const moonCoords = d => { const Lm = rad * (218.316 + 13.176396 * d), M = rad * (134.963 + 13.064993 * d), F = rad * (93.272 + 13.229350 * d);
    const l = Lm + rad * 6.289 * Math.sin(M), b = rad * 5.128 * Math.sin(F), dt = 385001 - 20905 * Math.cos(M); return { ra: raA(l, b), dec: decA(l, b), dist: dt }; };
  const moonIllum = date => { const d = toDays(date), s = sunCoords(d), m = moonCoords(d), sd = 149598000;
    const phi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra));
    const inc = Math.atan2(sd * Math.sin(phi), m.dist - sd * Math.cos(phi));
    const angle = Math.atan2(Math.cos(s.dec) * Math.sin(s.ra - m.ra), Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra));
    return { fraction: (1 + Math.cos(inc)) / 2, phase: 0.5 + 0.5 * inc * (angle < 0 ? -1 : 1) / Math.PI }; };
  const moonAlt = (date, lat, lng) => { const lw = rad * -lng, phi = rad * lat, d = toDays(date), c = moonCoords(d), H = sidT(d, lw) - c.ra; let h = altA(H, phi, c.dec);
    h += rad * 0.017 / Math.tan(h + rad * 10.26 / (h + rad * 5.10)); return h; };
  const moonTimes = (date, lat, lng) => { // opp/ned innen døgnet (lokal tid) som starter ved date
    const t = new Date(date); t.setHours(0, 0, 0, 0); const hc = 0.133 * rad; let h0 = moonAlt(t, lat, lng) - hc, rise, set;
    const hA = h => new Date(+t + h * 3600e3);
    for (let i = 1; i <= 24; i += 2) {
      const h1 = moonAlt(hA(i), lat, lng) - hc, h2 = moonAlt(hA(i + 1), lat, lng) - hc;
      const a = (h0 + h2) / 2 - h1, b = (h2 - h0) / 2, xe = -b / (2 * a), ye = (a * xe + b) * xe + h1, dd = b * b - 4 * a * h1; let roots = 0, x1 = 0, x2 = 0;
      if (dd >= 0) { const dx = Math.sqrt(dd) / (Math.abs(a) * 2); x1 = xe - dx; x2 = xe + dx; if (Math.abs(x1) <= 1) roots++; if (Math.abs(x2) <= 1) roots++; if (x1 < -1) x1 = x2; }
      if (roots === 1) { if (h0 < 0) rise = i + x1; else set = i + x1; } else if (roots === 2) { rise = i + (ye < 0 ? x2 : x1); set = i + (ye < 0 ? x1 : x2); }
      if (rise && set) break; h0 = h2;
    }
    return { rise: rise ? hA(rise) : null, set: set ? hA(set) : null };
  };

  class KDVaerCard extends KD.KDSheet {
    static head() { return ['partly_cloudy_day', 'Vær', (this.config && this.config.sted) || 'Strømstad']; }
    static defaults = { sted: 'Strømstad', vaer: 'weather.forecast_home', naa: 'sensor.weather_forecast_v2', sol: 'sun.sun', maane: 'sensor.oslo_moon_phase', pollen: 'auto', luft: {}, timer: 12, dager: 7 };

    constructor() { super(); this._fc = {}; this._subs = []; }
    onConnect() { super.onConnect(); this._subscribe(); }
    onDisconnect() { super.onDisconnect(); this._unsub(); }
    _unsub() { for (const u of this._subs) { try { Promise.resolve(u).then(f => typeof f === 'function' && f()).catch(() => {}); } catch (x) { } } this._subs = []; this._subFor = null; }
    /* Prognoser: weather/subscribe_forecast (levende), med weather.get_forecasts som reserve */
    _subscribe() {
      const h = this.hass, id = this.config.vaer;
      if (!h || !id || !this._connected || this._subFor === id) return;
      this._unsub(); this._subFor = id;
      for (const type of ['hourly', 'daily']) {
        const fallback = () => this.ws({ type: 'call_service', domain: 'weather', service: 'get_forecasts', service_data: { type }, target: { entity_id: id }, return_response: true })
          .then(r => { const f = r && r.response && r.response[id]; if (f && f.forecast) { this._fc[type] = f.forecast; this._queue(); } }).catch(err => console.warn('kd-vaer forecast', err));
        if (h.connection && h.connection.subscribeMessage) {
          const p = h.connection.subscribeMessage(m => { this._fc[type] = (m && m.forecast) || []; this._queue(); }, { type: 'weather/subscribe_forecast', forecast_type: type, entity_id: id });
          this._subs.push(p);
          Promise.resolve(p).catch(fallback);
          setTimeout(() => { if (!this._fc[type]) fallback(); }, 4000);
        } else fallback();
      }
    }
    render() { this._subscribe(); return super.render(); }

    loc() { const c = this.hass && this.hass.config; return c && c.latitude != null ? [c.latitude, c.longitude] : null; }

    body() {
      const cfg = this.config, W = this.st(cfg.vaer), wa = (W && W.attributes) || {};
      const cur = this.at(cfg.naa, 'current', {}) || {};
      const sun = this.st(cfg.sol), sa = (sun && sun.attributes) || {};
      const night = sun ? sun.state === 'below_horizon' : false;
      const hourly = (this._fc.hourly || wa.forecast || []).filter(f => new Date(f.datetime) > Date.now() - 3600e3);
      const daily = this._fc.daily || [];
      const ms = (v, unit) => v == null || isNaN(v) ? null : /km/.test(unit || '') ? v / 3.6 : /mph/.test(unit || '') ? v * 0.44704 : v;
      const wu = wa.wind_speed_unit || 'km/h';
      const num = v => v == null || v === '' || isNaN(parseFloat(v)) ? null : parseFloat(v);

      // nå
      const T = num(wa.temperature) != null ? num(wa.temperature) : num(cur.temperature);
      const cond = W ? W.state : cur.condition;
      const nowIcon = icon(cond, night);
      const feels = num(wa.apparent_temperature) != null ? num(wa.apparent_temperature) : num(cur.feels_like);
      const today = daily[0];
      const now = { t: T == null ? '–' : nf1(T), desc: (COND[cond] || [cond || '–'])[0], icon: nowIcon,
        sub: [feels != null ? `Føles som ${Math.round(feels)}°` : '', today ? `H ${Math.round(today.temperature)}° L ${Math.round(today.templow)}°` : ''].filter(Boolean).join(' · ') || '–' };

      // regn neste timer
      const hrs = hourly.slice(0, Number(cfg.timer) || 12);
      const hh = d => KD.hh(new Date(d).getHours());
      const next24 = hourly.slice(0, 24);
      let rainNote = next24.length ? 'Ingen nedbør de neste 24 timene.' : 'Ingen prognose tilgjengelig ennå.';
      const wet = next24.map(f => (num(f.precipitation) || 0) >= 0.1);
      const fi = wet.indexOf(true);
      if (fi >= 0) {
        let li = fi; while (li + 1 < next24.length && wet[li + 1]) li++;
        let mx = fi; for (let i = fi; i <= li; i++) if ((num(next24[i].precipitation) || 0) > (num(next24[mx].precipitation) || 0)) mx = i;
        const kind = /snow/.test(next24[mx].condition || '') ? 'Snø' : /snowy-rainy/.test(next24[mx].condition || '') ? 'Sludd' : 'Regn';
        rainNote = `${fi === 0 ? `${kind} nå` : `${kind} fra rundt ${hh(next24[fi].datetime)}:00`}, mest ved ${hh(next24[mx].datetime)}. ` + (li + 1 < next24.length ? `Oppholdsvær igjen fra ${hh(next24[li + 1].datetime)}.` : 'Nedbør resten av døgnet.');
      }
      const maxMm = Math.max(0, ...hrs.map(f => num(f.precipitation) || 0));
      const hours = hrs.map((f, i) => { const mm = num(f.precipitation) || 0, dt = new Date(f.datetime), hr = dt.getHours();
        const n = sun && sa.next_rising ? this.isNightAt(dt, sa) : false; const ic = icon(f.condition, n);
        return { time: i ? KD.hh(hr) : 'Nå', t: Math.round(num(f.temperature)), icon: ic, mm: mm >= 0.05 ? nf1(mm) : '',
          card: { flex: 'none', width: 56, padding: '10px 0 8px', borderRadius: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: i ? '#1c1c1f' : '#2a2a2d' },
          iconStyle: { fontSize: 24, color: col(ic), fontVariationSettings: "'FILL' 1" },
          rain: { width: 8, height: mm >= 0.05 && maxMm ? `${Math.max(12, mm / maxMm * 100)}%` : 0, borderRadius: 4, background: BLUE } }; });

      // dager
      const dd = daily.slice(0, Number(cfg.dager) || 7);
      const lo = Math.min(...dd.map(d => num(d.templow) != null ? num(d.templow) : num(d.temperature))), hi = Math.max(...dd.map(d => num(d.temperature)));
      const span = hi - lo || 1;
      const days = dd.map((d, i) => { const dt = new Date(d.datetime), l = Math.round(num(d.templow) != null ? num(d.templow) : num(d.temperature)), h = Math.round(num(d.temperature)); const lv = num(d.templow) != null ? num(d.templow) : num(d.temperature), hv = num(d.temperature);
        const same = dt.toDateString() === new Date().toDateString();
        return { day: same || (!i && dt < Date.now()) ? 'I dag' : cap(dt.toLocaleDateString('nb-NO', { weekday: 'short' }).replace('.', '')), icon: icon(d.condition, false), lo: l, hi: h,
          row: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 4px', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' },
          iconStyle: { fontSize: 22, color: col(icon(d.condition, false)), fontVariationSettings: "'FILL' 1", width: 26 },
          range: { position: 'absolute', top: 0, bottom: 0, left: `${(lv - lo) / span * 100}%`, width: `${(hv - lv) / span * 100}%`, borderRadius: 3, background: `linear-gradient(90deg, ${BLUE}, ${SUN})` } }; });

      // detaljer
      const wind = ms(num(wa.wind_speed), wu), gust = ms(num(wa.wind_gust_speed), wu), bearing = num(wa.wind_bearing);
      const dir = bearing == null ? null : DIRS[Math.round(((bearing % 360) + 360) % 360 / 45) % 8];
      const uv = num(wa.uv_index) != null ? num(wa.uv_index) : num(cur.uv_index);
      const uvTxt = uv == null ? '–' : `${Math.round(uv)} · ${UV.find(([g]) => uv < g)[1]}`;
      const pres = num(wa.pressure);
      const loc = this.loc(), todayD = new Date();
      const st = loc ? sunTimes(todayD, loc[0], loc[1]) : {};
      const pick = (attr, calc) => { const v = sa[attr] ? new Date(sa[attr]) : null; return v && v.toDateString() === todayD.toDateString() ? v : calc || (v ? new Date(+v - dayMs) : null); };
      const rise = pick('next_rising', st.rise), set = pick('next_setting', st.set), dawn = pick('next_dawn', st.dawn), dusk = pick('next_dusk', st.dusk);
      const tm = d => d && !isNaN(d) ? KD.hm(d) : '–';
      const dayPrecip = today && num(today.precipitation) != null ? num(today.precipitation) : null;
      const sum24 = next24.length ? next24.reduce((t, f) => t + (num(f.precipitation) || 0), 0) : null;
      const details = [['air', 'Vind', wind == null ? '–' : `${Math.round(wind)} m/s${dir ? ' ' + dir[0] : ''}`], ['humidity_percentage', 'Fukt', num(wa.humidity) != null ? `${Math.round(num(wa.humidity))} %` : '–'],
        ['light_mode', 'UV', uvTxt], ['compress', 'Trykk', pres != null ? `${Math.round(pres)} hPa` : '–'], ['wb_twilight', 'Sol ned', tm(set)], ['water_drop', 'Nedbør i døgn', dayPrecip != null ? `${nf1(dayPrecip)} mm` : '–']];
      const p3 = hourly.find(f => num(f.pressure) != null && new Date(f.datetime) - Date.now() > 2.5 * 3600e3);
      const trend = pres == null || !p3 ? '–' : num(p3.pressure) - pres < -1 ? 'Synkende' : num(p3.pressure) - pres > 1 ? 'Stigende' : 'Stabil';
      const fog = num(wa.fog_area_fraction) != null ? num(wa.fog_area_fraction) : num(wa.fog);
      const more = [['dew_point', 'Duggpunkt', num(wa.dew_point) != null ? `${nf1(num(wa.dew_point))}°` : '–'], ['cloud', 'Skydekke', num(wa.cloud_coverage) != null ? `${Math.round(num(wa.cloud_coverage))} %` : '–'],
        ['visibility', 'Sikt', num(wa.visibility) != null ? `${Math.round(num(wa.visibility))} ${wa.visibility_unit || 'km'}` : '–'], ['trending_down', 'Trykk', trend],
        ['rainy', 'Nedbør 24 t', sum24 != null ? `${nf1(sum24)} mm` : '–'], ['foggy', 'Tåke', fog != null ? `${Math.round(fog)} %` : '–']];
      if (trend === 'Stigende') more[3][0] = 'trending_up'; else if (trend === 'Stabil') more[3][0] = 'trending_flat';

      const windV = { dir: dir ? dir[1] : '–', speed: wind == null ? '–' : nf1(wind), gust: gust == null ? '–' : nf1(gust), beaufort: wind == null ? '–' : BFT.find(([g]) => wind < g)[1],
        arrow: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', transform: `rotate(${bearing == null ? 0 : Math.round((bearing + 180) % 360)}deg)`, transition: 'transform 1.2s cubic-bezier(.34,1.3,.64,1)' },
        ticks: [['N', 50, 10], ['Ø', 90, 50], ['S', 50, 90], ['V', 10, 50]].map(([t, x, y]) => ({ t, style: { position: 'absolute', left: x + '%', top: y + '%', transform: 'translate(-50%,-50%)', fontSize: 10, fontWeight: 600, color: t === 'N' ? '#f2f1ee' : '#6d6c69' } })) };

      // sol
      const sunV = (() => {
        const len = rise && set ? (set - rise) / 60e3 : null;
        const p = rise && set ? Math.max(0, Math.min(1, (Date.now() - rise) / (set - rise))) : 0, up = sun ? sun.state === 'above_horizon' : false, ang = Math.PI * (1 - p);
        const el = num(sa.elevation);
        return { len: len == null ? '–' : `${Math.floor(len / 60)} t ${Math.round(len % 60)} min`,
          dot: { position: 'absolute', left: 'calc(' + (50 + Math.cos(ang) * 50) + '% - 10px)', top: (96 - Math.sin(ang) * 88 - 10) + 'px', width: 20, height: 20, borderRadius: 10, background: up ? 'oklch(0.86 0.14 85)' : '#5d5c5a', boxShadow: up ? '0 0 20px oklch(0.86 0.14 85 / 0.8)' : 'none' },
          rows: [['Soloppgang', tm(rise)], ['Solnedgang', tm(set)], ['Høyde nå', el == null ? '–' : `${el.toLocaleString('nb-NO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}°`], ['Daggry', tm(dawn)], ['Skumring', tm(dusk)], ['Gyllen time', tm(sa.golden_hour ? new Date(sa.golden_hour) : st.golden)]] };
      })();

      // måne
      const moonV = (() => {
        const mst = this.st(cfg.maane), ma = (mst && mst.attributes) || {};
        const il = moonIllum(new Date());
        const frac = num(ma.illumination) != null ? num(ma.illumination) / 100 : il.fraction;
        const waxing = mst && /waxing|first_quarter|new_moon/.test(mst.state) ? true : mst && /waning|last_quarter|full_moon/.test(mst.state) ? false : il.phase < 0.5;
        const name = mst ? (MOONNAME[mst.state] || cap(String(mst.state).replace(/_/g, ' '))) : (il.phase < 0.03 || il.phase > 0.97 ? 'Nymåne' : Math.abs(il.phase - 0.5) < 0.03 ? 'Fullmåne' : il.phase < 0.5 ? 'Voksende' : 'Minkende');
        let rs = { rise: ma.moonrise ? new Date(ma.moonrise) : null, set: ma.moonset ? new Date(ma.moonset) : null };
        if (loc && (!rs.rise || !rs.set)) { const mt = moonTimes(new Date(), loc[0], loc[1]); rs = { rise: rs.rise || mt.rise, set: rs.set || mt.set }; if (rs.set && rs.rise && rs.set < rs.rise) { const t2 = moonTimes(new Date(Date.now() + dayMs), loc[0], loc[1]); if (t2.set) rs.set = t2.set; } }
        let full = ma.next_full_moon ? new Date(ma.next_full_moon) : null;
        if (!full) { const syn = 29.530588853, ph = il.phase; let dd2 = ((0.5 - ph + 1) % 1) * syn; if (dd2 < 0.5) dd2 += syn; full = new Date(Date.now() + dd2 * dayMs); }
        const sub = [rs.rise ? `Opp ${KD.hm(rs.rise)}` : '', rs.set ? `ned ${KD.hm(rs.set)}` : '', full ? `fullmåne ${full.getDate()}. ${full.toLocaleDateString('nb-NO', { month: 'short' }).replace('.', '')}` : ''].filter(Boolean).join(' · ');
        const w = `${Math.round((1 - frac) * 100)}%`;
        return { name, illum: `${Math.round(frac * 100)} %`, sub,
          shadow: waxing ? { position: 'absolute', top: 0, bottom: 0, left: 0, width: w, background: '#16161a', boxShadow: '6px 0 14px rgba(0,0,0,0.5)' }
            : { position: 'absolute', top: 0, bottom: 0, right: 0, width: w, background: '#16161a', boxShadow: '-6px 0 14px rgba(0,0,0,0.5)' } };
      })();

      // luftkvalitet
      const aq = this.air();
      // pollen
      const pollen = this.pollen();

      return `
<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,560px);min-height:100vh;margin:0 auto;background:#141416;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:22px">
  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Vær · <span>${e(cfg.sted || '')}</span></div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section data-on-click="moreW" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 4px;cursor:pointer">
    <div style="display:flex;flex-direction:column;gap:6px">
      <div style="font-size:84px;font-weight:300;letter-spacing:-0.06em;line-height:0.85;font-variant-numeric:tabular-nums"><span>${e(now.t)}</span>°</div>
      <div style="font-size:18px;font-weight:500"><span>${e(now.desc)}</span></div>
      <div style="font-size:13px;color:#8e8d89;white-space:nowrap"><span>${e(now.sub)}</span></div>
    </div>
    <span class="ms" style="font-size:96px;color:#bdbbb6;font-variation-settings:'FILL' 1"><span>${e(now.icon)}</span></span>
  </section>

  <section style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:18px;background:oklch(0.8 0.12 250 / 0.12);box-shadow:inset 0 0 0 1px oklch(0.8 0.12 250 / 0.3)">
    <span class="ms" style="font-size:20px;color:oklch(0.8 0.12 250);font-variation-settings:'FILL' 1">umbrella</span>
    <span style="font-size:13px;line-height:1.35;text-wrap:pretty"><span>${e(rainNote)}</span></span>
  </section>

  <section style="display:flex;flex-direction:column;gap:8px">
    <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:0 4px">Neste timer</div>
    <div data-hscroll="1" style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 -18px;padding:0 18px">
      ${hours.map(h => `
        <div style="${S(h.card)}">
          <span style="font-size:11px;color:#8e8d89;font-variant-numeric:tabular-nums"><span>${h.time}</span></span>
          <span class="ms" style="${S(h.iconStyle)}"><span>${h.icon}</span></span>
          <span style="font-size:15px;font-weight:500;font-variant-numeric:tabular-nums"><span>${isNaN(h.t) ? '–' : h.t}</span>°</span>
          <div style="width:100%;height:28px;display:flex;align-items:flex-end;justify-content:center"><span style="${S(h.rain)}"></span></div>
          <span style="font-size:10px;color:oklch(0.8 0.12 250);font-variant-numeric:tabular-nums;height:12px"><span>${h.mm}</span></span>
        </div>`).join('') || `<div style="font-size:13px;color:#8e8d89;padding:12px 4px">Henter prognose …</div>`}
    </div>
  </section>

  <section style="display:flex;flex-direction:column;gap:2px">
    <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:0 4px 8px"><span>${days.length || 7}</span> dager</div>
    ${days.map(d => `
      <div style="${S(d.row)}">
        <span style="width:52px;font-size:14px;font-weight:500"><span>${e(d.day)}</span></span>
        <span class="ms" style="${S(d.iconStyle)}"><span>${d.icon}</span></span>
        <span style="width:30px;text-align:right;font-size:13px;color:#8e8d89;font-variant-numeric:tabular-nums"><span>${d.lo}</span>°</span>
        <div style="flex:1;position:relative;height:5px;border-radius:3px;background:#1f1f22"><span style="${S(d.range)}"></span></div>
        <span style="width:30px;font-size:13px;font-weight:500;font-variant-numeric:tabular-nums"><span>${d.hi}</span>°</span>
      </div>`).join('')}
  </section>

  <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
    ${details.map(([ic, label, v]) => `
      <div style="display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:18px;background:#1c1c1f">
        <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:#8e8d89;white-space:nowrap"><span class="ms" style="font-size:15px"><span>${ic}</span></span><span>${label}</span></span>
        <span style="font-size:17px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap"><span>${e(v)}</span></span>
      </div>`).join('')}
  </section>

  <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
    ${more.map(([ic, k, v]) => `
      <div style="display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:18px;background:#1c1c1f">
        <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:#8e8d89;white-space:nowrap"><span class="ms" style="font-size:15px"><span>${ic}</span></span><span>${k}</span></span>
        <span style="font-size:16px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap"><span>${e(v)}</span></span>
      </div>`).join('')}
  </section>

  <section style="display:flex;align-items:center;gap:16px;padding:16px;border-radius:26px;background:#1c1c1f">
    <div style="position:relative;width:104px;height:104px;flex:none;border-radius:50%;background:#262629;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05)">
      ${windV.ticks.map(k => `<span style="${S(k.style)}"><span>${k.t}</span></span>`).join('')}
      <div style="${S(windV.arrow)}"><span class="ms" style="font-size:30px;color:oklch(0.8 0.12 250);font-variation-settings:'FILL' 1">navigation</span></div>
    </div>
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
      <span style="font-size:12px;color:#8e8d89">Vind fra <span>${e(windV.dir)}</span></span>
      <span style="font-size:34px;font-weight:300;letter-spacing:-0.03em;line-height:1"><span>${e(windV.speed)}</span><span style="font-size:14px;color:#8e8d89"> m/s</span></span>
      <span style="font-size:12px;color:#a9a7a2">Kast opptil <span>${e(windV.gust)}</span> m/s · <span>${e(windV.beaufort)}</span></span>
    </div>
  </section>

  <section style="display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:26px;background:#1c1c1f">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><span style="font-size:15px;font-weight:500">Sol</span><span style="font-size:12px;color:#8e8d89"><span>${e(sunV.len)}</span> dagslys</span></div>
    <div style="position:relative;height:96px;margin:0 8px">
      <div style="position:absolute;left:0;right:0;top:8px;height:176px;border-radius:50%;border:1.5px dashed #3a3a3d;clip-path:inset(0 0 45% 0)"></div>
      <div style="position:absolute;left:-8px;right:-8px;top:96px;height:1px;background:#3a3a3d"></div>
      <div style="${S(sunV.dot)}"></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
      ${sunV.rows.map(([k, v]) => `<div style="display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:16px;background:#262629"><span style="font-size:10px;color:#8e8d89;white-space:nowrap"><span>${k}</span></span><span style="font-size:14px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap"><span>${e(v)}</span></span></div>`).join('')}
    </div>
  </section>

  <section style="display:flex;align-items:center;gap:18px;padding:16px;border-radius:26px;background:#1c1c1f">
    <div style="position:relative;width:84px;height:84px;flex:none;border-radius:50%;background:#e9e4d6;overflow:hidden;box-shadow:0 0 30px rgba(233,228,214,0.18)">
      <div style="${S(moonV.shadow)}"></div>
    </div>
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">
      <span style="font-size:12px;color:#8e8d89">Måne · <span>${e(moonV.illum)}</span> opplyst</span>
      <span style="font-size:18px;font-weight:500"><span>${e(moonV.name)}</span></span>
      <span style="font-size:12px;color:#a9a7a2"><span>${e(moonV.sub)}</span></span>
    </div>
  </section>

  ${aq ? `
  <section style="display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:26px;background:#1c1c1f">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><span style="font-size:15px;font-weight:500">Luftkvalitet</span><span style="font-size:12px;color:#8e8d89"><span>${e(aq.station)}</span></span></div>
    <div style="display:flex;align-items:baseline;gap:10px"><span style="font-size:34px;font-weight:300;letter-spacing:-0.03em;line-height:1"><span>${e(aq.aqi)}</span></span><span style="${S(aq.labelStyle)}"><span>${e(aq.label)}</span></span></div>
    <div style="position:relative;height:8px;border-radius:4px;background:linear-gradient(90deg, oklch(0.8 0.14 150), oklch(0.86 0.13 95), oklch(0.76 0.15 55), oklch(0.66 0.2 25), oklch(0.55 0.18 330))">
      <span style="${S(aq.marker)}"></span>
    </div>
    <div style="display:flex;flex-direction:column">
      ${aq.rows.map(r => `
        <div data-on-click="moreId" data-arg="${e(r.id)}" style="${S(r.row)}">
          <span style="width:52px;font-size:13px;font-weight:500"><span>${r.k}</span></span>
          <span style="flex:1;height:6px;border-radius:3px;background:#262629;overflow:hidden"><span style="${S(r.bar)}"></span></span>
          <span style="width:74px;text-align:right;font-size:12px;color:#c9c7c2;font-variant-numeric:tabular-nums;white-space:nowrap"><span>${e(r.v)}</span></span>
        </div>`).join('')}
    </div>
  </section>` : ''}

  ${pollen.length ? `
  <section style="display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:26px;background:#1c1c1f">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><span style="font-size:15px;font-weight:500">Pollen</span><span style="font-size:12px;color:#8e8d89">i dag · i morgen · overmorgen</span></div>
    <div style="display:flex;flex-direction:column">
      ${pollen.map(p => `
        <div data-on-click="moreId" data-arg="${e(p.id)}" style="${S(p.row)}">
          <span class="ms" style="font-size:18px;color:#8e8d89"><span>${p.icon}</span></span>
          <span style="flex:1;font-size:13px;font-weight:500"><span>${e(p.name)}</span></span>
          <span style="display:flex;gap:4px">${p.days.map(d => `<span style="${S(d)}"></span>`).join('')}</span>
          <span style="${S(p.chip)}"><span>${e(p.level)}</span></span>
        </div>`).join('')}
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:10px;color:#8e8d89">${L.slice(1).map(([t, c]) => `<span style="display:flex;align-items:center;gap:4px"><span style="${S({ width: 8, height: 8, borderRadius: 4, background: c })}"></span><span>${t}</span></span>`).join('')}</div>
  </section>` : ''}
</div>`;
    }

    isNightAt(dt, sa) {
      const loc = this.loc();
      if (loc) { const st = sunTimes(dt, loc[0], loc[1]); if (st.rise && st.set) return dt < st.rise || dt > st.set; }
      const h = dt.getHours(); return h < 6 || h >= 21;
    }
    moreW() { this.more(this.config.vaer); }
    moreId(ev, id) { if (id) this.more(id); }

    /* Luftkvalitet: fra config.luft eller oppdaget via device_class */
    air() {
      const c = this.config.luft || {}, S0 = this.all();
      const byDc = (dc) => Object.keys(S0).find(id => id.startsWith('sensor.') && S0[id].attributes.device_class === dc && !KD.BAD.has(S0[id].state));
      const ids = { aqi: c.aqi || byDc('aqi'), pm25: c.pm25 || byDc('pm25'), pm10: c.pm10 || byDc('pm10'), no2: c.no2 || byDc('nitrogen_dioxide'), o3: c.o3 || byDc('ozone') };
      if (!Object.values(ids).some(Boolean)) return null;
      const lims = [['PM2,5', 'pm25', 25], ['PM10', 'pm10', 50], ['NO₂', 'no2', 100], ['O₃', 'o3', 120]];
      const rows = lims.filter(([, k]) => ids[k] && this.ok(ids[k])).map(([k, key, lim], i) => { const v = this.n(ids[key]); const r = v / lim;
        return { k, id: ids[key], v: `${String(Math.round(v * 10) / 10).replace('.', ',')} µg/m³`, r,
          row: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'pointer' },
          bar: { display: 'block', width: Math.min(100, r * 100) + '%', height: '100%', borderRadius: 3, background: r < 1 ? 'oklch(0.8 0.14 150)' : r < 2 ? 'oklch(0.86 0.13 95)' : 'oklch(0.66 0.2 25)' } }; });
      let aqi = ids.aqi && this.ok(ids.aqi) ? this.n(ids.aqi) : null;
      if (aqi == null && rows.length) aqi = Math.round(Math.max(...rows.map(r => r.r)) * 50); // enkel indeks: 50 = grenseverdi
      const band = aqi == null ? null : aqi <= 50 ? ['God', 'oklch(0.8 0.14 150)'] : aqi <= 100 ? ['Moderat', 'oklch(0.86 0.13 95)'] : aqi <= 150 ? ['Dårlig', 'oklch(0.76 0.15 55)'] : ['Svært dårlig', 'oklch(0.66 0.2 25)'];
      const src = [ids.aqi, ids.pm25, ids.pm10, ids.no2, ids.o3].find(x => x && this.st(x));
      return { aqi: aqi == null ? '–' : Math.round(aqi), station: c.stasjon || (src ? this.at(src, 'attribution', '') || this.fname(src).replace(/\s*(AQI|PM2[.,]5|PM10).*$/i, '') : ''),
        label: band ? band[0] : '–', labelStyle: { fontSize: 13, fontWeight: 600, color: band ? band[1] : '#8e8d89' },
        marker: { position: 'absolute', top: -4, left: `calc(${Math.min(100, (aqi || 0) / 200 * 100)}% - 8px)`, width: 16, height: 16, borderRadius: 8, background: '#f4f3ef', boxShadow: '0 0 0 3px #1c1c1f' }, rows };
    }

    /* Pollen: sensor.pollen_<type>_<sted>_pollen_<dag> (index_value 0–5) */
    pollen() {
      const cfg = this.config, S0 = this.all();
      let ids = Array.isArray(cfg.pollen) ? cfg.pollen : cfg.pollen === false ? [] : Object.keys(S0).filter(id => /^sensor\.pollen_/.test(id));
      const types = {};
      for (const id of ids) {
        const m = id.match(/^sensor\.pollen_([a-z]+)_(?:.+_)?pollen_([a-z_0-9]+)$/) || id.match(/^sensor\.pollen_([a-z]+)_.*?(today|tomorrow|day_after_tomorrow|i_dag|i_morgen|overmorgen)?$/);
        if (!m) continue;
        const t = POLLEN[m[1]]; if (!t) continue;
        const day = m[2] && PDAY[m[2]] != null ? PDAY[m[2]] : 0;
        const at = (S0[id] || {}).attributes || {};
        let v = at.index_value != null ? Number(at.index_value) : parseFloat(S0[id] && S0[id].state);
        if (isNaN(v)) v = null;
        const o = types[t[0]] || (types[t[0]] = { name: t[0], icon: t[1], d: [null, null, null], id });
        if (day === 0) o.id = id;
        o.d[day] = v;
        // noen integrasjoner har prognosen i attributter
        if (day === 0 && at.tomorrow != null && o.d[1] == null) o.d[1] = Number(at.tomorrow.index_value != null ? at.tomorrow.index_value : at.tomorrow);
      }
      const lv = v => v == null ? null : Math.max(0, Math.min(4, Math.round(v)));
      return Object.values(types).sort((x, y) => PORDER.indexOf(x.name) - PORDER.indexOf(y.name)).map((p, i) => {
        const d0 = lv(p.d[0]) || 0;
        return { id: p.id, name: p.name, icon: p.icon, level: L[d0][0],
          row: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'pointer' },
          days: p.d.map((v, k) => ({ width: 10, height: 10, borderRadius: 5, background: L[lv(v) || 0][1], opacity: v == null ? 0.3 : k ? 0.7 : 1 })),
          chip: { minWidth: 58, textAlign: 'center', fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 9, background: d0 ? L[d0][1].replace(')', ' / 0.18)') : '#262629', color: d0 ? L[d0][1] : '#8e8d89' } };
      });
    }
  }

  KD.define('kd-vaer-card', KDVaerCard, 'KD Vær', 'Vær med timer, dager, sol, måne, luft og pollen (pikselkopi av Claude Design)');
  KD.sheet('vaer', 'kd-vaer-card');
})();
