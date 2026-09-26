/*
 * kd-stromregning-card – «Strømregning» fra Claude Design, med ekte data.
 *
 *   Regningen:     forbruk per time fra langtidsstatistikken (energisensoren) × strømpris (Norgespris / spot per time)
 *                  + nettleie (energiledd per kWh + effektledd fra månedens tre høyeste døgnmakser) + avgifter per kWh.
 *                  Inneværende periode anslås lineært for hele perioden; faste månedsbeløp regnes forholdsmessig.
 *   Effekttrinn:   KI Energi (sensor.ki_nettleie: registrert snitt, topp tre, trinn og tarifftabell),
 *                  ellers regnet ut fra timestatistikken med tarifftabellen.
 *   Effektledd:    trinnet for hver måned i år, regnet ut fra timestatistikken (inneværende måned fra KI Energi).
 *
 * Minimal config:  type: custom:kd-stromregning-card
 */
(() => {
  const KD = window.KD;
  if (!KD || customElements.get('kd-stromregning-card')) return;

  const PINK = 'linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20))';
  const C = { blue: 'oklch(0.8 0.12 250)', orange: 'oklch(0.8 0.13 60)', purple: 'oklch(0.75 0.1 300)', amber: 'oklch(0.82 0.12 75)', red: 'oklch(0.72 0.15 25)', green: 'oklch(0.8 0.12 150)' };
  const S = KD.S;
  const E = (x) => `<span>${KD.e(x)}</span>`;               // {{ x }} = eget <span> i designet
  const nf = (n, d = 0) => (n == null || isNaN(n) ? '–' : Number(n).toLocaleString('nb-NO', { minimumFractionDigits: d, maximumFractionDigits: d }));
  const nfk = (n) => (n == null || isNaN(n) ? '–' : Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : nf(n, 1));
  const num = (x, d = null) => { if (x == null || x === '' || typeof x === 'boolean') return d; const v = parseFloat(String(x).replace(',', '.')); return isNaN(v) ? d : v; };
  const ML = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const MN = ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'];
  const MND = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
  // Standard tarifftabell (samme som KI Energi): øvre grense kW → kr/mnd
  const TARIFF_STD = [[2, 150], [5, 250], [10, 420], [15, 585], [20, 755]];
  const PERIODS = [['day', 'Dag'], ['week', 'Uke'], ['month', 'Måned'], ['year', 'År']];

  const dayKey = (d) => d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
  const isoWeek = (d0) => { const d = new Date(Date.UTC(d0.getFullYear(), d0.getMonth(), d0.getDate())); const wd = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - wd); const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.ceil(((d - y0) / 86400e3 + 1) / 7); };
  const parseTab = (t) => {
    let out = [];
    if (Array.isArray(t)) out = t.map((x) => Array.isArray(x) ? [num(x[0]), num(x[1])] : x && typeof x === 'object' ? [num(x.kw ?? x.grense), num(x.kr)] : [null, null]);
    else if (typeof t === 'string') out = t.replace(/;/g, ',').split(',').map((p) => p.split(':')).map(([g, k]) => [num(g), num(k)]);
    out = out.filter(([g, k]) => g != null && k != null).sort((a, b) => a[0] - b[0]);
    return out.length ? out : null;
  };
  const trinn = (snitt, tab) => {
    if (snitt == null || !tab) return null;
    let fra = 0;
    for (let i = 0; i < tab.length; i++) { if (snitt < tab[i][0]) return { kr: tab[i][1], fra, til: tab[i][0], i }; fra = tab[i][0]; }
    return { kr: null, fra, til: null, i: tab.length };
  };

  class KDStromregningCard extends KD.KDSheet {
    static head = ['receipt_long', 'Strømregning', 'Estimat og effekttrinn'];
    static defaults = {
      energi: 'sensor.strommaler_powercalc_energy_daily',   // kWh (total_increasing) – timeforbruk fra langtidsstatistikken
      nettleie: 'sensor.ki_nettleie',                       // KI Energi: topp tre, registrert snitt/trinn, tarifftabell
      strom_profil: 'auto',                                 // no | se | auto (KD.stromProfil)
      strompris: null,                                      // kr/kWh fast, eller 'spot'. Tom = Norgespris i Norge, spot per time ellers
      norgespris: 0.5,                                      // kr/kWh inkl. mva (40 øre + mva)
      spotpris: null,                                       // tom = profilens Nord Pool-sensor (brukes når det ikke er fastpris)
      paslag: 0,                                            // kr/kWh påslag på spot
      fastbelop: 0,                                         // kr/mnd til strømleverandøren
      energiledd: 0.36,                                     // kr/kWh nettleie energiledd (dag), inkl. mva
      energiledd_natt: null,                                // kr/kWh natt (22–06) og helg – tom = samme som dag
      nettleie_fast: 0,                                     // kr/mnd fastledd utenom effekttrinnet
      elavgift: 0.0975,                                     // kr/kWh inkl. mva
      enova: 0.0125,                                        // kr/kWh inkl. mva (1 øre + mva)
      effekttrinn: null,                                    // '2:150,5:250,…' eller [[kW, kr], …] – tom = fra KI Energi, ellers standardtabellen
      periode: 'month',                                     // day | week | month | year
    };
    static sheetCss = `[data-seg="periode"] [data-seg-b]{padding:0 16px !important;font-weight:500 !important}
[data-seg="periode"] [data-seg-b]:not([style*="#2a1720"]){color:#c9c7c2 !important}
[data-seg="periode"] [data-seg-thumb]{border-radius:19px !important;box-shadow:none !important;backdrop-filter:none !important;-webkit-backdrop-filter:none !important}`;

    constructor() { super(); this.state = { period: null, prev: false, month: null }; }
    now() { return new Date(window.__kdMockNowRegning || Date.now()); }

    /* ---------- handlinger ---------- */
    goPeriod(ev, k) { this.setState({ period: k, prev: false }); }
    togglePrev() { this.setState({ prev: !this.state.prev }); }
    goMonth(ev, k) { this.setState({ month: +k }); }
    afterRender() {
      // designets fanevelger har innholdsbredde – legg glassboblen over valgt knapp
      const seg = this.shadowRoot.querySelector('[data-seg="periode"]'); if (!seg) return;
      const b = seg.querySelectorAll('[data-seg-b]')[+seg.getAttribute('data-seg-i')], th = seg.querySelector('[data-seg-thumb]');
      if (b && th && b.offsetWidth) { th.style.left = b.offsetLeft + 'px'; th.style.width = b.offsetWidth + 'px'; }
      if (!this._fontsHooked && document.fonts) { this._fontsHooked = true; document.fonts.ready.then(() => this.afterRender()); }
    }

    /* ---------- data ---------- */
    get P() { return KD.stromProfil(this); }
    _tab() {
      const c = this.config;
      if (c.effekttrinn === false) return null;
      return parseTab(c.effekttrinn) || parseTab(this.at(c.nettleie, 'tabell')) || (this.P.key === 'se' ? null : TARIFF_STD);
    }
    /** Timestatistikk for ett år: { t: [ms], v: [kWh] } (null mens den lastes / mangler) */
    _year(y) {
      const id = this.config.energi; if (!id || !this.st(id)) return null;
      const now = this.now(), s = new Date(y, 0, 1), e = new Date(Math.min(new Date(y + 1, 0, 1).getTime(), now.getTime()));
      if (e <= s) return { t: [], v: [] };
      const f = /^wh$/i.test(this.unit(id)) ? 0.001 : 1, cur = y === now.getFullYear();
      return this.cached(`kd-sr|${id}|${y}`, cur ? 10 * 60e3 : 6 * 3600e3, () => this.ws({ type: 'recorder/statistics_during_period', start_time: s.toISOString(), end_time: e.toISOString(), statistic_ids: [id], period: 'hour', types: ['change'] })
        .then((r) => {
          const t = [], v = [];
          for (const p of (r && r[id]) || []) { const ts = typeof p.start === 'number' ? p.start : Date.parse(p.start), c = num(p.change); if (!isNaN(ts) && c != null) { t.push(ts); v.push(Math.max(0, c * f)); } }
          return { t, v };
        }), null);
    }
    /** Spotpris per time (kr/kWh inkl. mva og påslag) for ett år: Map(ms → kr) */
    _spotYear(y) {
      const id = this.config.spotpris || this.P.pris_spot; if (!id || !this.st(id)) return null;
      const now = this.now(), s = new Date(y, 0, 1), e = new Date(Math.min(new Date(y + 1, 0, 1).getTime(), now.getTime()));
      const st = this.st(id), ore = KD.isOre(this.unit(id), st.attributes), mva = this.P.spot_mva === false ? 1.25 : 1, add = num(this.config.paslag, 0);
      return this.cached(`kd-sr-spot|${id}|${y}`, y === now.getFullYear() ? 30 * 60e3 : 6 * 3600e3, () => this.ws({ type: 'recorder/statistics_during_period', start_time: s.toISOString(), end_time: e.toISOString(), statistic_ids: [id], period: 'hour', types: ['mean'] })
        .then((r) => {
          const m = new Map();
          for (const p of (r && r[id]) || []) { const ts = typeof p.start === 'number' ? p.start : Date.parse(p.start), v = num(p.mean); if (!isNaN(ts) && v != null) m.set(ts, (ore ? v / 100 : v) * mva + add); }
          return m;
        }), null);
    }
    /** Pris-oppsett: { fast: kr/kWh } eller { spot: true } */
    _prisModus() {
      const c = this.config, v = num(c.strompris);
      if (v != null) return { fast: v, navn: null };
      if (String(c.strompris || '').toLowerCase() !== 'spot' && this.P.fast_navn) return { fast: num(c.norgespris, 0.5), navn: this.P.fast_navn };
      return { spot: true };
    }
    /** Timer i [s, e): [[ms, kWh], …] inkl. inneværende (uferdige) time. null = mangler data */
    _hours(s, e) {
      const now = this.now(), out = [];
      for (let y = new Date(s).getFullYear(); y <= new Date(e - 1).getFullYear(); y++) {
        if (new Date(y, 0, 1) > now) break;
        const H = this._year(y); if (!H) return null;
        for (let i = 0; i < H.t.length; i++) if (H.t[i] >= s && H.t[i] < e) out.push([H.t[i], H.v[i]]);
      }
      // inneværende time: dagens måler minus timene som alt er i statistikken
      if (now >= s && now < e) {
        const mid = new Date(now); mid.setHours(0, 0, 0, 0);
        const tot = this.n(this.config.energi), H = this._year(now.getFullYear());
        if (tot != null && H) {
          let sum = 0, last = 0;
          for (let i = 0; i < H.t.length; i++) if (H.t[i] >= mid.getTime()) { sum += H.v[i]; last = Math.max(last, H.t[i] + 3600e3); }
          const f = /^wh$/i.test(this.unit(this.config.energi)) ? 0.001 : 1;
          const rest = tot * f - sum;
          if (rest > 0) out.push([Math.max(last, Math.floor(now / 3600e3) * 3600e3), rest]);
        }
      }
      return out;
    }
    /** Døgnmakser per måned for et år: [{ dager: Map(dayKey → {kwh, ts}) }] (12 stk). Bufres per datasett. */
    _dogn(y) {
      const H = this._year(y); if (!H) return null;
      this._dognC = this._dognC || new WeakMap();
      let r = this._dognC.get(H); if (r) return r;
      r = Array.from({ length: 12 }, () => new Map());
      for (let i = 0; i < H.t.length; i++) {
        const d = new Date(H.t[i]), k = dayKey(d), m = r[d.getMonth()], o = m.get(k);
        if (!o || H.v[i] > o.kwh) m.set(k, { kwh: H.v[i], ts: H.t[i] });
      }
      this._dognC.set(H, r);
      return r;
    }
    /** Effekttrinn for en måned: { kr, fra, til, i, snitt, topper: [{ts|dato, time, kwh}] } */
    _trinn(y, m) {
      const now = this.now(), tab = this._tab(), c = this.config;
      if (new Date(y, m, 1) > now) return null;
      if (y === now.getFullYear() && m === now.getMonth()) {
        const kr = num(this.at(c.nettleie, 'registrert_trinn_kr')), snitt = num(this.at(c.nettleie, 'registrert_snitt'));
        const tt = this.at(c.nettleie, 'topp_tre');
        if (snitt != null || kr != null) {
          const t = trinn(snitt, tab) || {};
          const fra = num(this.at(c.nettleie, 'registrert_trinn_fra'), t.fra), til = num(this.at(c.nettleie, 'registrert_trinn_til'), t.til);
          const i = tab ? tab.findIndex((x) => x[0] === til) : -1;
          return { kr: kr != null ? kr : t.kr, fra, til, i: i >= 0 ? i : t.i, snitt, topper: (Array.isArray(tt) ? tt : []).map((x) => ({ dato: x.dato, time: x.time, kwh: num(x.kwh) })).filter((x) => x.kwh != null) };
        }
      }
      const D = this._dogn(y); if (!D) return null;
      const top = [...D[m].values()].sort((a, b) => b.kwh - a.kwh).slice(0, 3);
      if (!top.length) return null;
      const snitt = top.reduce((a, x) => a + x.kwh, 0) / top.length, t = trinn(snitt, tab);
      return { ...(t || { kr: null, fra: null, til: null, i: -1 }), snitt, topper: top.map((x) => ({ ts: x.ts, kwh: x.kwh })) };
    }
    /** Periodens start/slutt (ms) */
    _range(kind, prev) {
      const now = this.now(), s = new Date(now); s.setHours(0, 0, 0, 0);
      let e;
      if (kind === 'day') { if (prev) s.setDate(s.getDate() - 1); e = new Date(s); e.setDate(e.getDate() + 1); }
      else if (kind === 'week') { s.setDate(s.getDate() - ((s.getDay() + 6) % 7) - (prev ? 7 : 0)); e = new Date(s); e.setDate(e.getDate() + 7); }
      else if (kind === 'year') { s.setMonth(0, 1); if (prev) s.setFullYear(s.getFullYear() - 1); e = new Date(s); e.setFullYear(e.getFullYear() + 1); }
      else { s.setDate(1); if (prev) s.setMonth(s.getMonth() - 1); e = new Date(s); e.setMonth(e.getMonth() + 1); }
      return [s.getTime(), e.getTime()];
    }
    /** Regningen for en periode */
    _bill(kind, prev) {
      const c = this.config, now = this.now().getTime(), [s, e] = this._range(kind, prev), est = !prev;
      const end = Math.min(e, now);
      const hours = this._hours(s, end);
      if (!hours || !hours.length) return null;
      const PM = this._prisModus();
      const spot = PM.spot ? new Map() : null;
      if (PM.spot) for (let y = new Date(s).getFullYear(); y <= new Date(end - 1).getFullYear(); y++) { const m = this._spotYear(y); if (!m) return null; m.forEach((v, k) => spot.set(k, v)); }
      const ed = num(c.energiledd, 0), en = num(c.energiledd_natt, ed), avg = num(c.elavgift, 0) + num(c.enova, 0);
      let kwh = 0, strom = 0, nett = 0, spotKwh = 0, lastSpot = null;
      for (const [ts, k] of hours) {
        const d = new Date(ts), h = d.getHours(), natt = h >= 22 || h < 6 || d.getDay() === 0 || d.getDay() === 6;
        let p = PM.fast;
        if (spot) { const hs = Math.floor(ts / 3600e3) * 3600e3; p = spot.has(hs) ? spot.get(hs) : lastSpot; if (spot.has(hs)) lastSpot = p; }
        kwh += k; nett += k * (natt ? en : ed);
        if (p != null) { strom += k * p; spotKwh += k; }
      }
      if (spot && spotKwh < kwh && spotKwh > 0) strom *= kwh / spotKwh; // timer uten pris: snittpris
      // faste månedsbeløp (effekttrinn + fastledd + fastbeløp), forholdsmessig for delen av måneden perioden dekker
      const cur = this._trinn(new Date(now).getFullYear(), new Date(now).getMonth());
      const fS = num(c.fastbelop, 0), fN = num(c.nettleie_fast, 0);
      let fixS = 0, fixN = 0, soFarS = 0, soFarN = 0;
      for (let m0 = new Date(new Date(s).getFullYear(), new Date(s).getMonth(), 1); m0.getTime() < e; m0.setMonth(m0.getMonth() + 1)) {
        const m1 = new Date(m0); m1.setMonth(m1.getMonth() + 1);
        const part = (Math.min(e, m1.getTime()) - Math.max(s, m0.getTime())) / (m1 - m0);
        if (part <= 0) continue;
        const started = m0.getTime() <= now;
        const t = started ? this._trinn(m0.getFullYear(), m0.getMonth()) : cur;
        if (started && !this._year(m0.getFullYear())) return null;
        const capKr = (t && t.kr) || 0;
        fixS += fS * part; fixN += (capKr + fN) * part;
        if (started) { soFarS += fS * part; soFarN += (capKr + fN) * part; }
      }
      const f = est ? Math.max(1e-6, (end - s) / (e - s)) : 1;
      const vals = [strom / f + fixS, nett / f + fixN, (kwh * avg) / f];
      const hittil = strom + nett + kwh * avg + soFarS + soFarN;
      return { vals, kwh: kwh / f, hittil, est, s, spotSnitt: spotKwh ? strom / kwh : null, PM };
    }

    /* ---------- visning ---------- */
    body() {
      const st = this.state, c = this.config, now = this.now();
      const period = st.period || (PERIODS.some((p) => p[0] === c.periode) ? c.periode : 'month'), prev = !!st.prev, est = !prev;
      const P = this.P, se = P.key === 'se';
      const B = this._bill(period, prev);
      const vals = B ? B.vals : [null, null, null];
      const total = B ? vals.reduce((x, y) => x + y, 0) : null;
      const [s0] = this._range(period, prev), sd = new Date(s0);
      const title = period === 'day' ? (prev ? 'i går' : 'i dag') : period === 'week' ? `uke ${isoWeek(sd)}` : period === 'year' ? String(sd.getFullYear()) : MN[sd.getMonth()].toLowerCase();
      const SUB = { day: ['Anslått for hele døgnet', 'Hele døgnet'], week: ['Anslått for hele uken', 'Hele uken'], month: ['Hele måneden, anslått', 'Hele måneden'], year: ['Hele året, anslått', 'Hele året'] }[period];
      const totalSub = est ? `${SUB[0]}${(period === 'month' || period === 'year') && B ? ` · hittil ${nf(B.hittil)} kr` : ''}` : SUB[1];
      const PM = this._prisModus();
      const stromSub = PM.fast != null ? `${PM.navn || 'Fastpris'} ${nf(PM.fast * 100)} ${P.ore || 'øre'}/kWh` : `Spotpris${B && B.spotSnitt != null ? ` snitt ${nf(B.spotSnitt * 100)} ${P.ore || 'øre'}/kWh` : ''}`;
      const parts = [['Strøm', stromSub, C.blue], ['Nettleie', 'Energiledd og effektledd', C.orange], ['Avgifter', se ? 'Energiskatt' : 'Elavgift og Enova-avgift', C.purple]].map(([label, sub, col], k) => ({
        label, sub, kr: nf(vals[k]),
        bar: { flex: vals[k] != null ? vals[k] : 1, borderRadius: 6, background: col, transition: 'flex .4s' },
        dot: { width: 10, height: 10, borderRadius: 5, background: col, flex: 'none' } }));
      const calBtn = { width: 46, height: 46, borderRadius: 23, display: 'grid', placeItems: 'center', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.14)', background: prev ? '#262629' : 'transparent', color: prev ? 'oklch(0.78 0.13 350)' : '#c9c7c2' };

      // effekttrinn denne måneden
      const tab = this._tab(), T = this._trinn(now.getFullYear(), now.getMonth());
      const hasT = T && T.snitt != null;
      const til = hasT ? (T.til != null ? T.til : Math.max(T.snitt * 1.2, T.fra || 0)) : null;
      const barW = hasT && til ? Math.min(100, T.snitt / til * 100) : 0, markL = hasT && til ? Math.min(100, (T.fra || 0) / til * 100) : 50;
      const trinnTxt = hasT && T.til != null ? `${nfk(T.fra)}–${nfk(T.til)} kW · ${T.kr != null ? nf(T.kr) : '–'} kr/mnd` : hasT ? `over ${nfk(T.fra)} kW` : '–';
      const margin = hasT && T.til != null ? `${nf(T.til - T.snitt, 1)} kW margin` : '– kW margin';
      const pcol = [C.red, C.amber, C.blue];
      const peaks = (hasT ? T.topper : []).slice(0, 3).map((p, k) => {
        let d = null, h = null;
        if (p.ts != null) { d = new Date(p.ts); h = d.getHours(); }
        else if (p.dato) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(p.dato); if (m) d = new Date(+m[1], +m[2] - 1, +m[3]); h = num(p.time); }
        const when = d ? `${d.getDate()}. ${MND[d.getMonth()]}${h != null ? ` ${h}–${(h + 1) % 24}` : ''}` : 'udatert';
        return { n: k + 1, kw: nf(p.kwh, 1), when, numStyle: { color: pcol[k], fontWeight: 600 } };
      });
      const nxt = hasT && tab && T.i >= 0 && T.i + 1 < tab.length ? tab[T.i + 1] : null;
      const nextTxt = nxt ? `Neste trinn ${nfk(tab[T.i][0])}–${nfk(nxt[0])} kW` : hasT ? 'Høyeste trinn' : 'Neste trinn';
      const nextKr = nxt && T.kr != null ? `+${nf(nxt[1] - T.kr)} kr/mnd` : '–';

      // effektledd per måned (i år)
      const y = now.getFullYear(), curM = now.getMonth(), selM = st.month != null ? st.month : curM;
      const CAPT = Array.from({ length: 12 }, (_, m) => (m <= curM ? this._trinn(y, m) : null));
      const CAP = CAPT.map((t) => (t && t.kr != null ? t.kr : null));
      const done = CAP.filter((v) => v != null);
      const scale = Math.max(600, Math.ceil(Math.max(0, ...done) * 1.07 / 50) * 50);
      const cm = CAP[selM], ct = CAPT[selM];
      const capSub = cm == null ? `${MN[selM]} · ingen data` : `${MN[selM]}${selM === curM ? ' (nå)' : ''} · ${ct.til != null ? `${nfk(ct.fra)}–${nfk(ct.til)} kW` : `over ${nfk(ct.fra)} kW`}`;
      const months = ML.map((l, k) => { const v = CAP[k], act = k === selM; return { l, k,
        bar: { height: v == null ? 4 : `${v / scale * 100}%`, borderRadius: 8, background: v == null ? '#262629' : act ? (k === curM ? C.amber : '#f2f1ee') : k === curM ? 'oklch(0.82 0.12 75 / 0.45)' : '#3a3a3d', transition: 'background .2s' },
        lbl: { flex: 1, textAlign: 'center', fontSize: 11, color: act ? '#f2f1ee' : '#6d6c69' } }; });

      const seg = KD.segHTML('periode', PERIODS, period, 'goPeriod', { pink: true, h: 38, r: 22, bg: 'transparent', style: 'gap:2px;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.14);grid-template-columns:repeat(4,auto)' });

      return `<div style="box-sizing:border-box;width:100%;max-width:420px;min-height:100vh;margin:0 auto;background:#141416;padding:20px 18px 40px;display:flex;flex-direction:column;gap:12px">
  <header style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:6px">
    <div style="font-size:30px;font-weight:600;letter-spacing:-0.03em">Strømregning</div>
    <button data-on-click="closeSheet" style="width:44px;height:44px;border-radius:22px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:22px">close</span></button>
  </header>

  <div data-lay-skip="1" style="display:flex;gap:8px;align-items:center;justify-content:center;margin-bottom:4px">
    ${seg}
    <button data-on-click="togglePrev" title="Forrige periode" style="${S(calBtn)}"><span class="ms" style="font-size:20px">calendar_month</span></button>
  </div>

  <section data-lay="regning" data-lay-navn="Strømregning" style="padding:16px;border-radius:28px;background:#1c1c1f;display:flex;flex-direction:column;gap:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
      <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#c9c7c2;white-space:nowrap"><span class="ms" style="font-size:18px">receipt_long</span>${E(`Strømregning · ${title}`)}</div>
      <span style="height:24px;padding:0 10px;border-radius:12px;background:#262629;font-size:11px;color:#8e8d89;display:flex;align-items:center">${E(est ? 'estimat' : 'faktisk')}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:4px">
      <div style="display:flex;align-items:baseline;gap:6px"><span style="font-size:44px;font-weight:300;letter-spacing:-0.04em;line-height:1;font-variant-numeric:tabular-nums">${E(nf(total))}</span><span style="font-size:15px;color:#8e8d89">kr</span></div>
      <span style="font-size:12px;color:#8e8d89">${E(totalSub)}</span>
    </div>
    <div style="display:flex;gap:3px;height:12px">
      ${parts.map((p) => `<span style="${S(p.bar)}"></span>`).join('')}
    </div>
    <div style="display:flex;flex-direction:column;gap:2px">
      ${parts.map((p) => `<div style="display:flex;align-items:center;gap:10px;padding:7px 0">
          <span style="${S(p.dot)}"></span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:1px"><span style="font-size:14px">${E(p.label)}</span><span style="font-size:11px;color:#6d6c69">${E(p.sub)}</span></span>
          <span style="font-size:14px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap">${E(p.kr)} kr</span>
        </div>`).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;padding-top:10px;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:#8e8d89"><span>Forbruk</span><span style="color:#f2f1ee;font-variant-numeric:tabular-nums">${E(B ? nf(B.kwh) : '–')} kWh · snitt ${E(B && B.kwh > 0 ? nf(total / B.kwh, 2) : '–')} kr/kWh</span></div>
  </section>

  <section data-lay="effekttrinn" data-lay-navn="Effekttrinn" style="padding:16px;border-radius:28px;background:#1c1c1f;display:flex;flex-direction:column;gap:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
      <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#c9c7c2"><span class="ms" style="font-size:18px">speed</span>Effekttrinn</div>
      <span style="font-size:12px;color:#8e8d89">${KD.e(trinnTxt)}</span>
    </div>
    <div style="display:flex;align-items:baseline;gap:6px"><span style="font-size:36px;font-weight:300;letter-spacing:-0.04em;line-height:1;font-variant-numeric:tabular-nums">${KD.e(hasT ? nf(T.snitt, 1) : '–')}</span><span style="font-size:13px;color:#8e8d89">kW snitt av 3 topper</span></div>
    <div style="display:flex;flex-direction:column;gap:6px">
      <div style="position:relative;height:12px;border-radius:6px;background:#262629;overflow:hidden">
        <span style="position:absolute;left:0;top:0;bottom:0;width:${barW}%;border-radius:6px;background:linear-gradient(90deg, oklch(0.8 0.12 150), oklch(0.82 0.12 75))"></span>
        <span style="position:absolute;left:${markL}%;top:0;bottom:0;width:2px;background:#141416"></span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#6d6c69"><span>0 kW</span><span>${KD.e(hasT ? nfk(T.fra) : '–')} kW</span><span style="color:#c9c7c2">${KD.e(margin)}</span><span>${KD.e(til != null ? nfk(til) : '–')} kW</span></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px">
      ${peaks.map((p) => `<div style="padding:10px 12px;border-radius:18px;background:#262629;display:flex;flex-direction:column;gap:3px">
          <span style="font-size:13px;white-space:nowrap"><span style="${S(p.numStyle)}">#${E(p.n)}</span> ${E(p.kw)} kW</span>
          <span style="font-size:11px;color:#8e8d89;white-space:nowrap">${E(p.when)}</span>
        </div>`).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid rgba(255,255,255,0.06);font-size:12px">
      <span style="color:#8e8d89">${KD.e(nextTxt)}</span>
      <span style="color:oklch(0.72 0.15 25);font-variant-numeric:tabular-nums">${KD.e(nextKr)}</span>
    </div>
  </section>

  <section data-lay="effektledd" data-lay-navn="Effektledd per måned" style="padding:16px;border-radius:28px;background:#1c1c1f;display:flex;flex-direction:column;gap:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
      <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#c9c7c2"><span class="ms" style="font-size:18px">bar_chart</span>Effektledd per måned</div>
      <span style="font-size:12px;color:#8e8d89;font-variant-numeric:tabular-nums">i år ${E(done.length ? nf(done.reduce((a, b) => a + b, 0)) : '–')} kr</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">
      <div style="display:flex;align-items:baseline;gap:6px"><span style="font-size:36px;font-weight:300;letter-spacing:-0.04em;line-height:1;font-variant-numeric:tabular-nums">${E(cm == null ? '–' : nf(cm))}</span><span style="font-size:13px;color:#8e8d89">kr</span></div>
      <span style="font-size:12px;color:#8e8d89;white-space:nowrap">${E(capSub)}</span>
    </div>
    <div style="display:flex;gap:6px;align-items:flex-end;height:110px">
      ${months.map((m) => `<button data-on-click="goMonth" data-arg="${m.k}" style="flex:1;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end"><span style="${S(m.bar)}"></span></button>`).join('')}
    </div>
    <div style="display:flex;gap:6px">
      ${months.map((m) => `<span style="${S(m.lbl)}">${E(m.l)}</span>`).join('')}
    </div>
  </section>
</div>`;
    }
  }

  KD.define('kd-stromregning-card', KDStromregningCard, 'KD Strømregning', 'Estimat for strømregningen og effekttrinn');
  KD.sheet('bill', 'kd-stromregning-card');
})();
