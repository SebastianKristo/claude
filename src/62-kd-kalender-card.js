/*
 * kd-kalender-card – pikselkopi av Claude Design «Kalender» (Kalender · Hytta · Framover · Bursdager · Posten).
 *
 *   type: custom:kd-kalender-card        # virker uten mer
 *   kalendere:                           # standard: disse + alle andre calendar.* som finnes (auto: true)
 *     - { entity: calendar.sebastian_kristo_no, navn: Sebastian }
 *     - { entity: calendar.oslomet_timeplan, navn: OsloMet }
 *     - { entity: calendar.helligdager_i_norge, navn: Helligdager }
 *     - { entity: calendar.birthdays, navn: Bursdager }
 *     - { entity: calendar.open_home_foundation_devs, navn: HassOs }
 *   ekskluder: [calendar.posten_calendar]
 *   bare_i_maned: [calendar.oslomet_timeplan]   # timeplanen vises i månedsvisningen, ikke i «Kommende»
 *   dager: 14                            # hvor langt fram «Kommende» ser
 *   bursdager: calendar.birthdays
 *   post: sensor.nar_kommer_posten_posten_sensor_next    post_kalender: calendar.posten_calendar   postnummer: ''
 *   serier: sensor.sonarr_sonarr_upcoming_media   filmer: sensor.radarr_radarr_upcoming_media
 *   plex_serier: sensor.d_day_darling_plex_recently_added_show   plex_filmer: sensor.d_day_darling_plex_recently_added_movie
 *   hytter: []                           # sensor.<sted>_oversikt fra KI Hyttebesøk (tom = finnes selv)
 *
 * Farger: kalendere som heter som en person (Rune, Cybele, Sebastian) eller «Familie» får designets farger.
 * Hytta leser KI Hyttebesøk (sensor.<sted>_oversikt: her_naa, dager, opphold, kommende, per_maaned …).
 * Pakker finnes i entitetsregisteret (Norwegian Parcel Tracker).
 */
(() => {
  const KD = window.KD; if (!KD) return;
  const C = { green: 'oklch(0.8 0.12 150)', yellow: 'oklch(0.86 0.12 95)', purple: 'oklch(0.72 0.12 295)', blue: 'oklch(0.8 0.12 250)', red: 'oklch(0.72 0.15 25)', pink: 'oklch(0.78 0.13 350)', amber: 'oklch(0.82 0.12 75)' };
  const a = (c, o) => c.replace(')', ` / ${o})`);
  const PINK = 'linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20))';
  const e = KD.e, S = KD.S;
  const DAY = 864e5;
  const WHO = [[/rune/i, C.blue], [/cybele/i, C.pink], [/sebastian/i, C.amber], [/famil/i, C.green], [/oslomet|skole|timeplan/i, C.green], [/bursdag|birthday/i, C.pink], [/hellig/i, C.red]];
  const PALETTE = [C.blue, C.yellow, C.purple, C.pink, C.amber, C.green, C.red];
  const HPC = [[/oslo/i, 'oklch(0.8 0.13 160)', 'linear-gradient(160deg, #1f3a44, #15252b)'], [/str[oøö]mstad/i, 'oklch(0.86 0.12 90)', 'linear-gradient(160deg, #2c5a45, #193428)'], [/toten/i, 'oklch(0.78 0.1 65)', 'linear-gradient(160deg, #4a3a28, #2a2118)']];
  const HP_FALL = [['oklch(0.76 0.11 245)', 'linear-gradient(160deg, #26304a, #181d2f)'], ['oklch(0.78 0.13 350)', 'linear-gradient(160deg, #4a2838, #2a1820)'], ['oklch(0.72 0.12 295)', 'linear-gradient(160deg, #35284a, #1f182f)']];
  const PERSC = [[/cybele/i, 'oklch(0.8 0.13 160)'], [/rune/i, 'oklch(0.76 0.11 245)'], [/sebastian/i, 'oklch(0.86 0.12 90)']];
  const PERS_FALL = ['oklch(0.78 0.13 350)', 'oklch(0.82 0.12 75)', 'oklch(0.72 0.12 295)', 'oklch(0.8 0.12 150)'];
  const MND = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
  const ini = t => String(t || '').split(/[\s:.-]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const pad = n => String(n).padStart(2, '0');
  const isoL = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const day0 = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const parseD = v => { if (!v) return null; const d = new Date(String(v).length === 10 ? v + 'T00:00' : v); return isNaN(d) ? null : d; };
  const dmon = d => `${d.getDate()}. ${MND[d.getMonth()]}`;
  const cap = s => String(s).replace(/^./, c => c.toUpperCase());
  const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const hash = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
  const bdName = s => String(s || '').replace(/\(\s*\d{4}\s*\)/g, '').replace(/[_-]+/g, ' ').replace(/\b(bursdag|birthday|fodselsdag|fødselsdag)\b/gi, '').replace(/[’']\s*s\b/gi, '').replace(/\s{2,}/g, ' ').replace(/^[\s.,·-]+|[\s.,·-]+$/g, '').replace(/^./, c => c.toUpperCase());

  class KDKalenderCard extends KD.KDSheet {
    static head = ['calendar_month', 'Kalender', 'Familie og skole'];
    static defaults = {
      kalendere: [{ entity: 'calendar.sebastian_kristo_no', navn: 'Sebastian' }, { entity: 'calendar.oslomet_timeplan', navn: 'OsloMet' }, { entity: 'calendar.helligdager_i_norge', navn: 'Helligdager' }, { entity: 'calendar.birthdays', navn: 'Bursdager' }, { entity: 'calendar.open_home_foundation_devs', navn: 'HassOs' }],
      auto: true, ekskluder: ['calendar.posten_calendar'], bare_i_maned: ['calendar.oslomet_timeplan'], dager: 14,
      bursdager: 'calendar.birthdays',
      post: 'sensor.nar_kommer_posten_posten_sensor_next', post_kalender: 'calendar.posten_calendar', postnummer: '',
      serier: 'sensor.sonarr_sonarr_upcoming_media', filmer: 'sensor.radarr_radarr_upcoming_media',
      plex_serier: 'sensor.d_day_darling_plex_recently_added_show', plex_filmer: 'sensor.d_day_darling_plex_recently_added_movie',
      hytter: null,
    };
    constructor() {
      super();
      const t = new Date();
      this.state = { tab: 'cal', view: 'list', month: [t.getFullYear(), t.getMonth()], filter: 'alle', sel: `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`, hut: 0, hsub: 'cal', hplace: 'alle', search: false, q: '' };
    }

    /* ================= data ================= */
    _cals() {
      const c = this.config, ex = new Set(c.ekskluder || []), out = [];
      let fi = 0;
      const col = (navn, id) => { const w = WHO.find(x => x[0].test(navn + ' ' + id)); return w ? w[1] : PALETTE[fi++ % PALETTE.length]; };
      for (const k of (Array.isArray(c.kalendere) ? c.kalendere : [])) { const id = typeof k === 'string' ? k : k && k.entity; if (!id || ex.has(id) || !this.st(id)) continue; const navn = (k && k.navn) || this.fname(id); out.push({ id, navn, col: (k && k.farge) || col(navn, id) }); }
      if (c.auto !== false) for (const id of this.find(/^calendar\./)) { if (ex.has(id) || out.some(x => x.id === id) || this._hutCalIds().includes(id)) continue; const navn = this.fname(id); out.push({ id, navn, col: col(navn, id) }); }
      return out;
    }
    _events(cals, days, from, key) {
      if (!cals.length) return [];
      const ids = cals.map(k => k.id);
      const raw = this.cached(`kd-kal-${key}-${ids.join(',')}-${isoL(from)}-${days}`, 5 * 60e3, () => this.calendar(ids, days, from), null) || [];
      return raw.map(ev => { const k = cals.find(x => x.id === ev.cal) || {}; return { ...ev, navn: k.navn || '', col: k.col || C.blue }; });
    }
    _time(ev) { if (ev.allDay) return 'Hele dagen'; const s = hm(ev.start); return ev.end && ev.end - ev.start > 60e3 ? `${s}–${hm(ev.end)}` : s; }

    _hutSensors() {
      const c = this.config;
      if (Array.isArray(c.hytter) && c.hytter.length) return c.hytter.filter(id => this.st(id));
      const S0 = this.all(); return Object.keys(S0).filter(id => id.startsWith('sensor.') && S0[id].attributes && S0[id].attributes.integrasjon === 'ki_hyttebesok' && S0[id].attributes.type === 'oversikt');
    }
    _hutCalIds() { return this._hutSensors().map(id => this.at(id, 'kalender', '')).filter(Boolean); }
    _places() {
      let fi = 0;
      const ps = this._hutSensors().map(id => {
        const at = this.st(id).attributes, name = at.sted || this.fname(id).replace(/\s*oversikt\s*$/i, '');
        const hp = HPC.find(x => x[0].test(name)); const fb = hp ? null : HP_FALL[fi++ % HP_FALL.length];
        return { id, name, rolle: at.rolle || 'hytte', col: hp ? hp[1] : fb[0], bg: hp ? hp[2] : fb[1], at };
      });
      return ps.sort((x, y) => (x.rolle === 'hjem' ? 0 : 1) - (y.rolle === 'hjem' ? 0 : 1) || x.name.localeCompare(y.name, 'nb'));
    }
    _pcol(name) { const p = PERSC.find(x => x[0].test(name)); if (p) return p[1]; this._pc = this._pc || {}; if (!this._pc[name]) this._pc[name] = PERS_FALL[Object.keys(this._pc).length % PERS_FALL.length]; return this._pc[name]; }

    _upcoming() {
      const c = this.config;
      const read = (id, type) => {
        const st = this.st(id); if (!st) return [];
        let d = st.attributes.data; if (typeof d === 'string') { try { d = JSON.parse(d); } catch (x) { d = null; } }
        if (!Array.isArray(d)) return [];
        return d.filter(x => x && (x.airdate || x.aired) && x.title).map(x => ({ type, src: id, title: x.title, episode: x.episode && x.episode !== 'TBA' ? x.episode : '', number: x.number || '', when: new Date(x.airdate || x.aired), studio: x.studio || '', kino: !!x.flag }));
      };
      const key = x => { const r = String(x.title).toLowerCase().replace(/\(\d{4}\)/g, '').replace(/[^a-z0-9æøå]+/g, ''); return x.type === 'serie' ? (x.number ? `s|${r}|${String(x.number).toUpperCase().replace(/[^SE0-9]/g, '')}` : '') : `f|${r}`; };
      const plex = new Set([...read(c.plex_serier, 'serie'), ...read(c.plex_filmer, 'film')].map(key).filter(Boolean));
      const t0 = day0(new Date());
      return [...read(c.serier, 'serie'), ...read(c.filmer, 'film')].filter(x => !isNaN(x.when) && x.when >= t0).map(x => ({ ...x, plex: plex.has(key(x)) })).sort((p, q) => p.when - q.when);
    }
    _bdays() {
      const id = this.config.bursdager; if (!id || !this.st(id)) return [];
      const t0 = day0(new Date());
      const raw = this.cached(`kd-kal-bd-${id}-${isoL(t0)}`, 30 * 60e3, () => this.calendar([id], 367), null) || [];
      const seen = new Set(), out = [];
      for (const ev of raw) {
        const d = day0(ev.start); if (d < t0) continue;
        const name = bdName(ev.summary); if (!name || seen.has(name)) continue; seen.add(name);
        const txt = `${ev.description || ''} ${ev.summary || ''}`;
        const full = txt.match(/(\d{4})-(\d{2})-(\d{2})/), bare = txt.match(/(?:f\.?|født|fodt|\()\s*(\d{4})/i);
        const by = full ? +full[1] : bare ? +bare[1] : null;
        out.push({ name, date: d, age: by ? d.getFullYear() - by : null, days: Math.round((d - t0) / DAY) });
      }
      return out.sort((p, q) => p.days - q.days);
    }
    _parcels() {
      const R = (this._hass && this._hass.entities) || {}, out = [];
      for (const id in R) {
        if (R[id].platform !== 'norwegian_parcel_tracker' || !/^sensor\..+_status$/.test(id)) continue;
        const st = this.st(id); if (!st) continue;
        const at = st.attributes || {}, t = String(st.state || '').toLowerCase();
        const levert = /levert|delivered|utlevert/.test(t), klar = !levert && /hentes|ready|klar|pickup|utleveringssted|hentested/.test(t);
        const transport = /transport|underveis|transit|sortert|på vei|out for/.test(t);
        if (levert) continue;
        out.push({ id, name: String(at.friendly_name || id.slice(7)).replace(/\s*status\s*$/i, '').trim() || 'Pakke', state: st.state, klar, step: klar ? 3 : transport ? 2 : 1,
          hentested: at.pickup_point || at.hentested || '', eta: at.estimated_delivery || at.forventet_levering || '', siste: at.latest_event || at.siste_hendelse || '' });
      }
      return out.sort((p, q) => q.step - p.step || p.name.localeCompare(q.name, 'nb'));
    }

    /* ================= hendelser ================= */
    goTab(ev, k) { this.setState({ tab: k }); }
    goView(ev, k) { this.setState({ view: k }); }
    prevMonth() { const [y, m] = this.state.month; this.setState({ month: m === 0 ? [y - 1, 11] : [y, m - 1] }); }
    nextMonth() { const [y, m] = this.state.month; this.setState({ month: m === 11 ? [y + 1, 0] : [y, m + 1] }); }
    goToday() { const t = new Date(); this.setState({ month: [t.getFullYear(), t.getMonth()], sel: `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}` }); }
    pick(ev, k) { if (k) this.setState({ sel: k }); }
    goFilter(ev, k) { this.setState({ filter: k }); }
    goSub(ev, k) { this.setState({ hsub: k }); }
    goPlace(ev, k) { this.setState({ hplace: k }); }
    toggleSearch() { this.setState(s => ({ search: !s.search, q: '', hsub: s.search ? s.hsub : 'stays' })); }
    setQ(ev) { this.setState({ q: ev.target.value, hsub: 'stays' }); }
    hutScroll(ev, a0, el) { el = el || ev.target; const w = el.firstElementChild ? el.firstElementChild.offsetWidth + 10 : 1; const i = Math.round(el.scrollLeft / w); if (i !== this.state.hut && i >= 0 && i < (this._nPages || 1)) this.setState({ hut: i }); }
    hutDot(ev, i) { i = +i; const el = this.$('[data-kd-hut]'); if (el && el.firstElementChild) el.scrollTo({ left: i * (el.firstElementChild.offsetWidth + 10), behavior: 'smooth' }); this.setState({ hut: i }); }

    /* ================= visninger ================= */
    _calTab(cals) {
      const s = this.state, c = this.config, TODAY = day0(new Date());
      const only = new Set(c.bare_i_maned || []);
      const listCals = cals.filter(k => !only.has(k.id));
      const evs = this._events(listCals, Number(c.dager) || 14, TODAY, 'list');
      const byDay = new Map();
      for (const ev of evs) { const d = day0(ev.start < TODAY ? TODAY : ev.start); const k = isoL(d); if (!byDay.has(k)) byDay.set(k, { d, items: [] }); byDay.get(k).items.push(ev); }
      const agenda = [...byDay.values()].sort((x, y) => x.d - y.d).map((g, i) => { const today = isoL(g.d) === isoL(TODAY); return {
        wd: today ? 'I dag' : g.d.toLocaleDateString('nb-NO', { weekday: 'long' }), date: g.d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }).replace('.', ''),
        dateStyle: { fontSize: 22, fontWeight: today ? 500 : 300, letterSpacing: '-0.02em', whiteSpace: 'nowrap' },
        row: { display: 'flex', gap: 14, padding: '14px 4px', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' },
        items: g.items.map(ev => ({ title: ev.summary || '', meta: `${this._time(ev)} · ${ev.navn}`, dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flex: 'none', background: ev.col } })) }; });
      // måned
      const [y, m] = s.month;
      const f1 = new Date(y, m, 1), off = (f1.getDay() + 6) % 7;
      const cells = Array.from({ length: 42 }, (_, i) => new Date(y, m, 1 - off + i));
      const mev = s.view === 'month' ? this._events(cals, 42, cells[0], 'm') : [];
      const dayEvents = d => { const a0 = day0(d).getTime(), a1 = a0 + DAY; return mev.filter(ev => ev.start.getTime() < a1 && (ev.end ? ev.end.getTime() : ev.start.getTime() + 1) > a0).sort((p, q) => (p.allDay === q.allDay ? p.start - q.start : p.allDay ? 1 : -1)); };
      const [sy, sm, sd] = s.sel.split('-').map(Number), sel = new Date(sy, sm, sd);
      const items = s.view === 'month' ? dayEvents(sel) : [];
      const isToday = sel.toDateString() === TODAY.toDateString();
      return {
        agenda,
        calHead: s.view === 'month' ? 'Måned' : 'Kommende',
        calViews: [['list', 'Liste', 'view_agenda'], ['month', 'Måned', 'calendar_month']].map(([k, label, icon]) => ({ k, label, icon, style: { height: 34, padding: '0 12px', borderRadius: 13, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, background: s.view === k ? PINK : 'transparent', color: s.view === k ? '#2a1720' : '#a9a7a2', transition: 'background .2s' } })),
        monthLabel: cap(f1.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' })),
        mcells: s.view !== 'month' ? [] : cells.map(d => { const inM = d.getMonth() === m, ev = inM ? dayEvents(d) : [], k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, act = k === s.sel, today = d.toDateString() === TODAY.toDateString();
          const hasFam = ev.some(x => x.col !== C.green);
          return { n: d.getDate(), count: ev.length || '', k: inM ? k : '',
            style: { position: 'relative', aspectRatio: '1', borderRadius: '50%', display: 'grid', placeItems: 'center', background: act ? PINK : inM ? '#1c1c1f' : 'transparent', boxShadow: today && !act ? 'inset 0 0 0 1.5px #f2f1ee' : 'none', opacity: inM ? 1 : 0.3, transition: 'background .2s' },
            num: { fontSize: 14, fontWeight: act || today ? 600 : 500, color: act ? '#2a1720' : '#f2f1ee', fontVariantNumeric: 'tabular-nums' },
            badge: { position: 'absolute', left: -2, top: -2, minWidth: 18, height: 18, borderRadius: 9, display: ev.length ? 'grid' : 'none', placeItems: 'center', fontSize: 10, fontWeight: 700, background: hasFam ? C.pink : C.green, color: '#141416', boxShadow: '0 0 0 2px #141416' } }; }),
        selTitle: cap(sel.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })),
        selMeta: isToday ? 'i dag' : `${items.length} hendelser`,
        selItems: items.map(ev => ({ time: this._time(ev), title: ev.summary || '', where: ev.location || ev.navn, row: { display: 'flex', gap: 10, padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }, bar: { width: 3, borderRadius: 2, alignSelf: 'stretch', flex: 'none', background: ev.col } })),
      };
    }

    _hutVals(places) {
      const s = this.state, [y, m] = s.month, TODAY = day0(new Date());
      const pages = [{ k: 'alle', title: 'Alle steder', bg: 'linear-gradient(160deg, #22324a, #18222f)' }, ...places.map(p => ({ k: p.id, title: p.name, bg: p.bg, p }))];
      this._nPages = pages.length;
      const hi = Math.min(s.hut, pages.length - 1), page = pages[hi], pk = page.k;
      const byId = Object.fromEntries(places.map(p => [p.id, p]));
      const f1 = new Date(y, m, 1), off = (f1.getDay() + 6) % 7;
      const cells = Array.from({ length: 42 }, (_, i) => new Date(y, m, 1 - off + i));
      const dager = p => p.at.dager || {};
      const codesOf = d => {
        if (d.getMonth() !== m) return [];
        const k = isoL(d);
        if (pk === 'alle') return places.filter(p => (dager(p)[k] || []).length).map(p => ({ col: p.col }));
        return (dager(byId[pk])[k] || []).map(n => ({ col: this._pcol(n) }));
      };
      const wk = (() => { const d = new Date(TODAY); d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7); const w1 = new Date(d.getFullYear(), 0, 4); return 1 + Math.round(((d - w1) / DAY - 3 + (w1.getDay() + 6) % 7) / 7); })();
      const here = (p) => (p.at.her_naa || []).map(h => typeof h === 'string' ? h : h.navn).filter(Boolean);
      const names = l => l.length <= 1 ? (l[0] || '') : `${l.slice(0, -1).join(', ')} og ${l[l.length - 1]}`;
      const heroes = pages.map(pg => {
        let nights, visits, who;
        if (pg.k === 'alle') { nights = places.reduce((t, p) => t + (Number(p.at.netter_i_aar) || 0), 0); visits = places.reduce((t, p) => t + (Number(p.at.besok_i_aar) || 0), 0); who = places.filter(p => p.rolle !== 'hjem').flatMap(p => here(p).map(n => ({ n, col: p.col }))); }
        else { nights = Number(pg.p.at.netter_i_aar) || 0; visits = Number(pg.p.at.besok_i_aar) || 0; who = here(pg.p).map(n => ({ n, col: this._pcol(n) })); }
        return { title: pg.title, nights, visits, here: who.length ? `${names(who.map(w => w.n))} er her` : 'Ingen her nå',
          who: who.map(w => ({ i: w.n[0], style: { width: 28, height: 28, borderRadius: 14, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, background: w.col, color: '#1a1a1c', boxShadow: '0 0 0 2px rgba(255,255,255,0.25)' } })),
          chips: pg.k === 'alle' ? places.map(p => ({ label: `${p.name} ${Number(p.at.netter_i_aar) || 0}`, dot: { width: 8, height: 8, borderRadius: 4, background: p.col } })) : [],
          card: { position: 'relative', overflow: 'hidden', flex: 'none', width: '100%', scrollSnapAlign: 'center', boxSizing: 'border-box', minHeight: 190, padding: 18, borderRadius: 28, display: 'flex', flexDirection: 'column', gap: 6, background: pg.bg, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' } };
      });
      const sub = (k, l) => ({ k, label: l, style: { height: 38, padding: '0 16px', borderRadius: 19, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', background: s.hsub === k ? PINK : 'transparent', color: s.hsub === k ? '#2a1720' : '#c9c7c2' } });
      const pf = s.hplace, q = s.q.trim().toLowerCase();
      // opphold (+ planlagte)
      const stays = [];
      for (const p of places) {
        for (const o of [...(p.at.kommende || []).map(x => ({ ...x, plan: true })), ...(p.at.opphold || [])]) {
          const st = parseD(o.start); if (!st) continue;
          const n = Number(o.netter) || Math.max(1, Math.round((parseD(o.slutt) - st) / DAY)) || 1;
          stays.push({ who: o.person || 'Ukjent', place: p, start: st, n, plan: !!o.plan });
        }
      }
      stays.sort((x, y2) => y2.start - x.start);
      const shownStays = stays.filter(r => (pf === 'alle' || r.place.id === pf) && (!q || r.who.toLowerCase().includes(q) || r.place.name.toLowerCase().includes(q)));
      const mSum = Array.from({ length: 12 }, (_, i) => places.map(p => Number(((p.at.per_maaned || [])[i] || {}).netter) || 0));
      const mMax = Math.max(1, ...mSum.map(r => r.reduce((t, v) => t + v, 0)));
      const lest = (() => { const ts = (pk === 'alle' ? places : [byId[pk]]).map(p => parseD(p.at.sist_lest)).filter(Boolean).sort((x, y2) => y2 - x)[0]; return ts ? ` · lest ${hm(ts)}` : ''; })();
      const people = pk === 'alle' ? [] : ((byId[pk].at.kjente_personer && byId[pk].at.kjente_personer.length ? byId[pk].at.kjente_personer : (byId[pk].at.personer || []).map(x => x.navn)).filter(Boolean));
      return {
        heroes, dots: pages.map((_, i) => ({ i, style: { width: i === hi ? 18 : 7, height: 7, borderRadius: 4, background: i === hi ? '#f2f1ee' : '#48474a', transition: 'width .3s, background .3s' } })),
        subs: [sub('cal', 'Kalender'), sub('stays', 'Opphold'), sub('stats', 'Statistikk')],
        isCal: s.hsub === 'cal', isStays: s.hsub === 'stays', isStats: s.hsub === 'stats', searching: s.search, q: s.q,
        searchBtn: { width: 46, height: 46, borderRadius: 23, display: 'grid', placeItems: 'center', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)', background: s.search ? PINK : 'transparent', color: s.search ? '#2a1720' : '#f2f1ee' },
        week: `Uke ${wk}`, lest,
        cells: cells.map(d => { const inM = d.getMonth() === m, cs = codesOf(d), planned = d > TODAY && cs.length, isT = d.toDateString() === TODAY.toDateString();
          const bg = !cs.length ? (inM ? '#141416' : 'transparent') : planned ? 'transparent' : cs.length === 1 ? cs[0].col : `linear-gradient(90deg, ${cs.map((c2, i) => `${c2.col} ${i / cs.length * 100}% ${(i + 1) / cs.length * 100}%`).join(', ')})`;
          return { n: d.getDate(), style: { aspectRatio: '1', borderRadius: 12, display: 'grid', placeItems: 'center', background: bg, border: planned ? `2px dashed ${cs[0].col}` : '2px solid transparent', boxSizing: 'border-box', boxShadow: isT ? 'inset 0 0 0 2px #f2f1ee' : 'none', opacity: inM ? 1 : 0.3 },
            num: { fontSize: 13, fontWeight: 600, color: cs.length && !planned ? '#1a1a1c' : inM ? '#e6e4df' : '#6d6c69', fontVariantNumeric: 'tabular-nums' } }; }),
        legend: (pk === 'alle' ? places.map(p => [p.name, p.col]) : people.map(n => [n, this._pcol(n)])).map(([name, col]) => ({ name, dot: { width: 10, height: 10, borderRadius: 3, background: col } })),
        placeFilters: [['alle', 'Alle', null], ...places.map(p => [p.id, p.name, p.col])].map(([k, label, col]) => ({ k, label,
          style: { height: 36, padding: '0 12px', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', background: pf === k ? PINK : 'transparent', color: pf === k ? '#2a1720' : '#c9c7c2' },
          dot: { display: k === 'alle' ? 'none' : 'block', width: 7, height: 7, borderRadius: 4, background: col || 'transparent' } })),
        noStays: !shownStays.length,
        stays: shownStays.slice(0, 60).map((r, i) => ({ i: r.who[0], name: r.who, place: r.place.name, dates: r.n === 1 ? dmon(r.start) : `${dmon(r.start)} – ${dmon(new Date(r.start.getTime() + (r.n - 1) * DAY))}`, nights: (r.plan ? 'planlagt · ' : '') + (r.n === 1 ? '1 natt' : `${r.n} netter`),
          row: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderTop: i ? '1px solid rgba(255,255,255,0.06)' : 'none' },
          avatar: { width: 28, height: 28, borderRadius: 14, flex: 'none', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, background: this._pcol(r.who), color: '#1a1a1c' },
          tag: { fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 6, background: '#2a2a2d', color: r.place.col } })),
        months: MND.map((k, i) => { const vals = mSum[i], v = vals.reduce((t, x) => t + x, 0); return { k, v: v || '', segs: vals.map((n, j) => [n, places[j].col]).filter(x => x[0]).map(([n, col]) => ({ width: `${n / mMax * 100}%`, height: '100%', background: col })) }; }),
        placeCards: places.map(p => { const si = p.at.siste; const ls = si && parseD(si.start) ? new Date(parseD(si.start).getTime() + Math.max(0, (Number(si.netter) || 1) - 1) * DAY) : null; return { i: p.name[0], name: p.name, sub: `${Number(p.at.besok_i_aar) || 0} besøk i år${ls ? ` · sist ${dmon(ls)}` : ''}`, nights: Number(p.at.netter_i_aar) || 0,
          avatar: { width: 28, height: 28, borderRadius: 14, flex: 'none', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, background: p.col, color: '#1a1a1c' } }; }),
      };
    }

    body() {
      const s = this.state, c = this.config, TODAY = day0(new Date());
      const cals = this._cals(), places = this._places();
      const has = { cal: true, cabin: places.length > 0, up: !!(this.st(c.serier) || this.st(c.filmer)), bday: !!(c.bursdager && this.st(c.bursdager)), post: !!(this.st(c.post) || this.st(c.post_kalender)) };
      const tabDefs = [['cal', 'Kalender', 'event'], ['cabin', 'Hytta', 'cottage'], ['up', 'Framover', 'movie'], ['bday', 'Bursdager', 'cake'], ['post', 'Posten', 'mail']].filter(t => has[t[0]]);
      const tabK = tabDefs.some(t => t[0] === s.tab) ? s.tab : 'cal';
      const tabs = tabDefs.map(([k, l, icon]) => ({ k, label: l, icon, style: { flex: 'none', height: 38, padding: '0 12px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', background: tabK === k ? PINK : 'transparent', color: tabK === k ? '#2a1720' : '#a9a7a2' } }));
      const isCalTab = tabK === 'cal', isCal = isCalTab && s.view === 'list', isMonth = isCalTab && s.view === 'month';
      const CV = isCalTab ? this._calTab(cals) : null;
      const H = tabK === 'cabin' ? this._hutVals(places) : null;
      const [y, m] = s.month;
      const monthLabel = cap(new Date(y, m, 1).toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' }));
      let html = '';
      // ---- Framover
      let up = null;
      if (tabK === 'up') {
        const all = this._upcoming();
        const ups = all.filter(u => s.filter === 'alle' || (s.filter === 'plex' ? u.plex : u.type === s.filter));
        const col = u => `oklch(0.45 0.08 ${hash(u.title) % 360})`;
        const dayS = d => { const n = Math.round((day0(d) - TODAY) / DAY); return n < 8 ? cap(d.toLocaleDateString('nb-NO', { weekday: 'short' }).replace('.', '')) : dmon(d); };
        const subOf = u => (u.type === 'serie' ? [u.episode, u.number, u.plex ? 'på Plex' : u.studio] : [u.kino ? 'Kino' : 'Film', u.plex ? 'på Plex' : u.studio]).filter(Boolean).join(' · ');
        const F = ups[0];
        up = { filters: [['alle', 'Alle'], ['serie', 'Serier'], ['film', 'Filmer'], ['plex', 'Plex']].map(([k, l]) => ({ k, label: l, style: { height: 34, padding: '0 14px', borderRadius: 17, fontSize: 13, fontWeight: 500, background: s.filter === k ? '#f4f3ef' : '#1c1c1f', color: s.filter === k ? '#1a1a1c' : '#c9c7c2' } })),
          featured: F ? { title: F.title, sub: subOf(F), when: `${dayS(F.when)} kl. ${hm(F.when)}`, tag: s.filter === 'plex' ? 'Plex' : F.type === 'serie' ? 'Sonarr' : 'Radarr', initials: ini(F.title),
            card: { display: 'flex', gap: 14, alignItems: 'center', padding: 14, borderRadius: 24, background: `linear-gradient(120deg, ${col(F)}, #1c1c1f 85%)` },
            poster: { width: 84, height: 120, borderRadius: 12, flex: 'none', display: 'grid', placeItems: 'center', padding: 8, boxSizing: 'border-box', background: `linear-gradient(160deg, ${col(F)}, #111)`, boxShadow: '0 8px 20px rgba(0,0,0,0.4)' } } : null,
          list: ups.slice(1, 40).map((u, i) => ({ title: u.title, sub: subOf(u), day: dayS(u.when), time: hm(u.when), initials: ini(u.title),
            row: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' },
            poster: { width: 40, height: 56, borderRadius: 8, flex: 'none', display: 'grid', placeItems: 'center', background: `linear-gradient(160deg, ${col(u)}, #111)` },
            okStyle: { fontSize: 15, color: C.green, fontVariationSettings: "'FILL' 1", display: u.plex ? 'inline' : 'none' } })) };
      }
      // ---- Bursdager
      let bd = null;
      if (tabK === 'bday') {
        const bl = this._bdays(), nb = bl[0];
        const fy = b => b.age != null ? `Fyller ${b.age}` : 'Bursdag';
        bd = { next: nb ? { name: nb.name, when: nb.days === 0 ? 'I dag' : nb.days === 1 ? 'I morgen' : `Om ${nb.days} dager`, sub: `${fy(nb)} · ${nb.date.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })}` } : { name: 'Ingen bursdager', when: 'Bursdager', sub: 'Fant ingen i kalenderen det neste året' },
          list: bl.slice(1).map((b, i) => ({ name: b.name, initial: b.name[0], sub: `${fy(b)} · ${b.date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' })}`, days: `${b.days} d`,
            row: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 4px', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' },
            avatar: { width: 36, height: 36, borderRadius: 18, flex: 'none', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 600, background: '#232326', color: '#c9c7c2' },
            daysStyle: { fontSize: 12, fontWeight: 500, padding: '4px 9px', borderRadius: 10, background: b.days < 30 ? a(C.pink, 0.18) : '#1f1f22', color: b.days < 30 ? '#f2f1ee' : '#8e8d89', fontVariantNumeric: 'tabular-nums' } })) };
      }
      // ---- Posten
      let po = null;
      if (tabK === 'post') {
        const nx = parseD(this.v(c.post));
        const base = nx && day0(nx) >= TODAY ? day0(nx) : TODAY;
        const mon = new Date(base); mon.setDate(mon.getDate() - (mon.getDay() + 6) % 7);
        const pcal = c.post_kalender && this.st(c.post_kalender) ? this._events([{ id: c.post_kalender, navn: 'Posten', col: C.red }], 14, mon, 'post') : [];
        const deliv = new Set(pcal.map(ev => isoL(day0(ev.start))));
        if (nx) deliv.add(isoL(day0(nx)));
        const days = Array.from({ length: 14 }, (_, i) => new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i));
        const at = (this.st(c.post) || {}).attributes || {};
        const pn = c.postnummer || [at.postal_code || at.postnummer || at.zip || '', at.city || at.poststed || ''].filter(Boolean).join(' ');
        const etaTxt = v => { const d = parseD(v); if (!d) return ''; const n = Math.round((day0(d) - TODAY) / DAY); return n === 0 ? 'I dag' : n === 1 ? 'I morgen' : n > 1 && n < 7 ? cap(d.toLocaleDateString('nb-NO', { weekday: 'short' }).replace('.', '')) : dmon(d); };
        po = { place: `Posten${pn ? ' · ' + pn : ''}`, head: nx ? `Neste levering ${nx.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'short' })}` : 'Ingen leveringsdato',
          days: days.map(d => { const on = deliv.has(isoL(d)), we = d.getDay() === 0 || d.getDay() === 6; return { n: d.getDate(), wd: d.toLocaleDateString('nb-NO', { weekday: 'short' }).replace('.', ''),
            cell: { height: 70, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, background: on ? a(C.red, 0.14) : '#1c1c1f', boxShadow: on ? `inset 0 0 0 1px ${a(C.red, 0.4)}` : 'none', opacity: we ? 0.4 : 1 },
            icon: { fontSize: 14, color: C.red, fontVariationSettings: "'FILL' 1", opacity: on ? 1 : 0 } }; }),
          parcels: this._parcels().map((p, i) => ({ name: p.name, icon: p.klar ? 'package_2' : p.step === 2 ? 'local_shipping' : 'inventory_2', status: p.klar && p.hentested ? `Til hentested · ${p.hentested}` : (p.siste || p.state), eta: etaTxt(p.eta),
            row: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 4px', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' },
            iconWrap: { width: 36, height: 36, borderRadius: 18, flex: 'none', display: 'grid', placeItems: 'center', background: a(C.red, 0.16), color: C.red },
            steps: [1, 2, 3, 4].map(k => ({ flex: 1, height: 4, borderRadius: 2, background: k <= p.step ? C.red : '#2a2a2d' })) })) };
      }

      html = `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:20px">
  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Kalender</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <div data-hscroll="1" style="display:flex;gap:2px;padding:4px;border-radius:20px;background:#1c1c1f;overflow-x:auto;scrollbar-width:none">
    ${tabs.map(t => `<button data-on-click="goTab" data-arg="${t.k}" style="${S(t.style)}"><span class="ms" style="font-size:17px">${e(t.icon)}</span><span>${e(t.label)}</span></button>`).join('')}
  </div>
${isCalTab ? `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 4px">
      <span style="font-size:15px;font-weight:500"><span>${e(CV.calHead)}</span></span>
      <div style="display:flex;gap:2px;padding:3px;border-radius:16px;background:#1c1c1f">
        ${CV.calViews.map(v => `<button data-on-click="goView" data-arg="${v.k}" title="${e(v.label)}" style="${S(v.style)}"><span class="ms" style="font-size:18px">${e(v.icon)}</span><span>${e(v.label)}</span></button>`).join('')}
      </div>
    </div>` : ''}
${isCal ? `
    <section style="display:flex;flex-direction:column">
      ${CV.agenda.map(d => `<div style="${S(d.row)}">
          <div style="width:64px;flex:none;display:flex;flex-direction:column;gap:2px">
            <span style="font-size:12px;color:#8e8d89"><span>${e(d.wd)}</span></span>
            <span style="${S(d.dateStyle)}"><span>${e(d.date)}</span></span>
          </div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:10px;padding-top:2px">
            ${d.items.map(it => `<div style="display:flex;gap:10px;align-items:flex-start">
                <span style="${S(it.dot)}"></span>
                <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
                  <span style="font-size:14px;font-weight:500"><span>${e(it.title)}</span></span>
                  <span style="font-size:12px;color:#8e8d89"><span>${e(it.meta)}</span></span>
                </div>
              </div>`).join('')}
          </div>
        </div>`).join('')}
      ${!CV.agenda.length ? `<div style="padding:30px 0;text-align:center;font-size:14px;color:#6d6c69">Ingen hendelser de neste ${Number(c.dager) || 14} dagene</div>` : ''}
    </section>` : ''}
${isMonth ? `
    <section style="display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <button data-on-click="prevMonth" style="width:36px;height:36px;border-radius:18px;background:#1c1c1f;display:grid;place-items:center"><span class="ms" style="font-size:22px">chevron_left</span></button>
        <button data-on-click="goToday" style="font-size:15px;font-weight:500;display:flex;align-items:center;gap:6px"><span>${e(CV.monthLabel)}</span><span style="font-size:11px;color:#8e8d89">i dag</span></button>
        <button data-on-click="nextMonth" style="width:36px;height:36px;border-radius:18px;background:#1c1c1f;display:grid;place-items:center"><span class="ms" style="font-size:22px">chevron_right</span></button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">
        ${['M', 'T', 'O', 'T', 'F', 'L', 'S'].map(w => `<div style="text-align:center;font-size:11px;color:#6d6c69;padding:2px 0"><span>${w}</span></div>`).join('')}
        ${CV.mcells.map(ce => `<button data-on-click="pick" data-arg="${ce.k}" style="${S(ce.style)}">
            <span style="${S(ce.num)}"><span>${ce.n}</span></span>
            <span style="${S(ce.badge)}"><span>${e(ce.count)}</span></span>
          </button>`).join('')}
      </div>
    </section>
    <section style="display:flex;flex-direction:column;gap:2px;padding:14px 16px;border-radius:24px;background:#1c1c1f">
      <div style="display:flex;align-items:baseline;gap:8px;padding-bottom:6px">
        <span style="font-size:15px;font-weight:500"><span>${e(CV.selTitle)}</span></span>
        <span style="font-size:12px;color:#8e8d89"><span>${e(CV.selMeta)}</span></span>
      </div>
      ${CV.selItems.map(it => `<div style="${S(it.row)}">
          <span style="${S(it.bar)}"></span>
          <span style="width:92px;flex:none;font-size:12px;color:#c9c7c2;font-variant-numeric:tabular-nums;padding-top:1px"><span>${e(it.time)}</span></span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
            <span style="font-size:14px;font-weight:500"><span>${e(it.title)}</span></span>
            <span style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(it.where)}</span></span>
          </div>
        </div>`).join('')}
      ${!CV.selItems.length ? `<div style="padding:14px 0;font-size:13px;color:#6d6c69">Ingen hendelser</div>` : ''}
    </section>` : ''}
${H ? `
    <div data-hscroll="1" data-kd-hut="1" data-on-scroll="hutScroll" style="display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;margin:0 calc(-1 * var(--kd-kant,10px));padding:0 var(--kd-kant,10px)">
      ${H.heroes.map(h => `<div style="${S(h.card)}">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:19px;font-weight:600;white-space:nowrap"><span>${e(h.title)}</span></span>
            ${h.who.map(w => `<span style="${S(w.style)}"><span>${e(w.i)}</span></span>`).join('')}
            <span style="flex:1"></span>
            <button data-on-click="goSub" data-arg="cal" style="width:34px;height:34px;border-radius:17px;background:rgba(255,255,255,0.12);display:grid;place-items:center"><span class="ms" style="font-size:18px">event_available</span></button>
          </div>
          <span style="font-size:13px;color:rgba(242,241,238,0.75)"><span>${e(h.here)}</span></span>
          <div style="display:flex;gap:26px;padding-top:6px">
            <div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:24px;font-weight:300;letter-spacing:-0.02em;line-height:1"><span>${e(h.nights)}</span></span><span style="font-size:11px;color:rgba(242,241,238,0.7)">netter i år</span></div>
            <div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:24px;font-weight:300;letter-spacing:-0.02em;line-height:1"><span>${e(h.visits)}</span></span><span style="font-size:11px;color:rgba(242,241,238,0.7)">besøk i år</span></div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;position:relative;z-index:1">
            ${h.chips.map(ch => `<span style="height:28px;padding:0 10px 0 8px;border-radius:14px;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;background:rgba(255,255,255,0.12);white-space:nowrap"><span style="${S(ch.dot)}"></span><span>${e(ch.label)}</span></span>`).join('')}
          </div>
          <span class="ms" style="position:absolute;right:14px;bottom:-6px;font-size:96px;color:rgba(255,255,255,0.22);font-variation-settings:'FILL' 1">cottage</span>
          <span style="position:absolute;right:52px;bottom:18px;display:flex;gap:10px"><span style="width:12px;height:10px;border-radius:2px;background:oklch(0.82 0.1 80 / 0.8)"></span><span style="width:12px;height:10px;border-radius:2px;background:oklch(0.82 0.1 80 / 0.8)"></span></span>
        </div>`).join('')}
    </div>
    <div style="display:flex;justify-content:center;gap:6px;margin-top:-8px">
      ${H.dots.map(d => `<button data-on-click="hutDot" data-arg="${d.i}" style="${S(d.style)}"></button>`).join('')}
    </div>

    <div style="display:flex;align-items:center;justify-content:center;gap:8px">
      <div style="display:flex;gap:2px;padding:4px;border-radius:22px;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.12)">
        ${H.subs.map(t => `<button data-on-click="goSub" data-arg="${t.k}" style="${S(t.style)}"><span>${e(t.label)}</span></button>`).join('')}
      </div>
      <button data-on-click="toggleSearch" style="${S(H.searchBtn)}"><span class="ms" style="font-size:20px">search</span></button>
    </div>
    ${H.searching ? `<input data-on-input="setQ" value="${e(H.q)}" placeholder="Søk etter person eller sted" style="height:46px;border-radius:23px;border:0;outline:none;padding:0 18px;background:#1c1c1f;color:#f2f1ee;font:inherit;font-size:14px">` : ''}
    ${H.isCal ? `<section style="display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:26px;background:#1c1c1f">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <button data-on-click="prevMonth" style="width:34px;height:34px;border-radius:17px;background:#141416;display:grid;place-items:center"><span class="ms" style="font-size:22px">chevron_left</span></button>
          <div style="display:flex;align-items:baseline;gap:8px"><span style="font-size:15px;font-weight:600"><span>${e(monthLabel)}</span></span><span style="font-size:11px;color:#8e8d89"><span>${e(H.week)}</span></span></div>
          <button data-on-click="nextMonth" style="width:34px;height:34px;border-radius:17px;background:#141416;display:grid;place-items:center"><span class="ms" style="font-size:22px">chevron_right</span></button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px">
          ${['ma', 'ti', 'on', 'to', 'fr', 'lø', 'sø'].map(w => `<div style="text-align:center;font-size:11px;color:#8e8d89;padding:2px 0"><span>${w}</span></div>`).join('')}
          ${H.cells.map(ce => `<div style="${S(ce.style)}"><span style="${S(ce.num)}"><span>${ce.n}</span></span></div>`).join('')}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding-top:4px">
          <div style="display:flex;gap:12px">${H.legend.map(l => `<span style="display:flex;align-items:center;gap:5px;font-size:11px;color:#c9c7c2"><span style="${S(l.dot)}"></span><span>${e(l.name)}</span></span>`).join('')}</div>
          <span style="font-size:11px;color:#8e8d89">stiplet = planlagt${e(H.lest)}</span>
        </div>
      </section>` : ''}
    ${H.isStays ? `<div style="display:flex;justify-content:center">
        <div style="display:flex;gap:2px;padding:4px;border-radius:20px;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.12)">
          ${H.placeFilters.map(p => `<button data-on-click="goPlace" data-arg="${e(p.k)}" style="${S(p.style)}"><span style="${S(p.dot)}"></span><span>${e(p.label)}</span></button>`).join('')}
        </div>
      </div>
      <section style="display:flex;flex-direction:column;border-radius:26px;background:#1c1c1f;overflow:hidden">
        ${H.stays.map(r => `<div style="${S(r.row)}">
            <span style="${S(r.avatar)}"><span>${e(r.i)}</span></span>
            <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
              <span style="display:flex;align-items:center;gap:6px;font-size:14px;font-weight:500"><span>${e(r.name)}</span><span style="${S(r.tag)}"><span>${e(r.place)}</span></span></span>
              <span style="font-size:12px;color:#8e8d89"><span>${e(r.dates)}</span></span>
            </span>
            <span style="font-size:13px;font-weight:600;white-space:nowrap"><span>${e(r.nights)}</span></span>
          </div>`).join('')}
        ${H.noStays ? `<div style="padding:24px;text-align:center;font-size:13px;color:#6d6c69">Ingen opphold</div>` : ''}
      </section>` : ''}
    ${H.isStats ? `<section style="display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:26px;background:#1c1c1f">
        <span style="font-size:12px;color:#8e8d89">Netter per måned i år</span>
        ${H.months.map(mo => `<div style="display:flex;align-items:center;gap:10px">
            <span style="width:30px;font-size:12px;color:#c9c7c2"><span>${e(mo.k)}</span></span>
            <div style="flex:1;height:10px;border-radius:5px;background:#262629;overflow:hidden;display:flex">${mo.segs.map(g => `<span style="${S(g)}"></span>`).join('')}</div>
            <span style="width:30px;text-align:right;font-size:12px;color:#c9c7c2;font-variant-numeric:tabular-nums"><span>${e(mo.v)}</span></span>
          </div>`).join('')}
      </section>
      ${H.placeCards.map(p => `<section style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-radius:26px;background:#1c1c1f">
          <span style="${S(p.avatar)}"><span>${e(p.i)}</span></span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:500"><span>${e(p.name)}</span></span><span style="font-size:12px;color:#a9a7a2"><span>${e(p.sub)}</span></span></span>
          <span style="display:flex;flex-direction:column;align-items:flex-end"><span style="font-size:24px;font-weight:300;letter-spacing:-0.02em"><span>${e(p.nights)}</span></span><span style="font-size:11px;color:#8e8d89">netter</span></span>
        </section>`).join('')}` : ''}` : ''}
${up ? `
    <div style="display:flex;gap:6px">
      ${up.filters.map(f => `<button data-on-click="goFilter" data-arg="${f.k}" style="${S(f.style)}"><span>${e(f.label)}</span></button>`).join('')}
    </div>
    ${up.featured ? `<section style="${S(up.featured.card)}">
        <div style="${S(up.featured.poster)}"><span style="font-size:22px;font-weight:600;letter-spacing:-0.02em;text-align:center;line-height:1"><span>${e(up.featured.initials)}</span></span></div>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span style="height:22px;padding:0 8px;border-radius:7px;background:rgba(0,0,0,0.35);display:flex;align-items:center;font-size:11px;font-weight:600;white-space:nowrap"><span>${e(up.featured.when)}</span></span>
            <span style="height:22px;padding:0 8px;border-radius:7px;background:rgba(0,0,0,0.35);display:flex;align-items:center;font-size:11px;font-weight:600;white-space:nowrap"><span>${e(up.featured.tag)}</span></span>
          </div>
          <span style="font-size:20px;font-weight:600;letter-spacing:-0.01em"><span>${e(up.featured.title)}</span></span>
          <span style="font-size:12px;color:#d9d6d0"><span>${e(up.featured.sub)}</span></span>
        </div>
      </section>` : ''}
    <section style="display:flex;flex-direction:column">
      ${up.list.map(u => `<div style="${S(u.row)}">
          <div style="${S(u.poster)}"><span style="font-size:12px;font-weight:600"><span>${e(u.initials)}</span></span></div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px">
            <span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:6px"><span>${e(u.title)}</span><span class="ms" style="${S(u.okStyle)}">check_circle</span></span>
            <span style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(u.sub)}</span></span>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex:none">
            <span style="font-size:13px;font-weight:500"><span>${e(u.day)}</span></span>
            <span style="font-size:11px;color:#8e8d89;font-variant-numeric:tabular-nums"><span>${e(u.time)}</span></span>
          </div>
        </div>`).join('')}
      ${!up.featured ? `<div style="padding:30px 0;text-align:center;font-size:14px;color:#6d6c69">Ingenting planlagt</div>` : ''}
    </section>` : ''}
${bd ? `
    <section style="display:flex;align-items:center;gap:16px;padding:18px;border-radius:24px;background:linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20));color:#2a1720">
      <div style="width:60px;height:60px;border-radius:30px;background:rgba(42,23,32,0.12);display:grid;place-items:center;flex:none"><span class="ms" style="font-size:30px;font-variation-settings:'FILL' 1">cake</span></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:3px">
        <span style="font-size:12px;font-weight:500"><span>${e(bd.next.when)}</span></span>
        <span style="font-size:22px;font-weight:600;letter-spacing:-0.01em"><span>${e(bd.next.name)}</span></span>
        <span style="font-size:13px"><span>${e(bd.next.sub)}</span></span>
      </div>
    </section>
    <section style="display:flex;flex-direction:column">
      ${bd.list.map(b => `<div style="${S(b.row)}">
          <span style="${S(b.avatar)}"><span>${e(b.initial)}</span></span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
            <span style="font-size:14px;font-weight:500"><span>${e(b.name)}</span></span>
            <span style="font-size:12px;color:#8e8d89"><span>${e(b.sub)}</span></span>
          </div>
          <span style="${S(b.daysStyle)}"><span>${e(b.days)}</span></span>
        </div>`).join('')}
    </section>` : ''}
${po ? `
    <section style="display:flex;flex-direction:column;gap:6px;padding:0 4px">
      <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#c9c7c2"><span class="ms" style="font-size:18px;color:oklch(0.72 0.15 25);font-variation-settings:'FILL' 1">mail</span>${e(po.place)}</div>
      <div style="font-size:24px;font-weight:500;letter-spacing:-0.015em"><span>${e(po.head)}</span></div>
      <div style="font-size:14px;color:#8e8d89">Posten leverer annenhver hverdag</div>
    </section>
    <section style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">
      ${po.days.map(d => `<div style="${S(d.cell)}">
          <span style="font-size:10px;color:#8e8d89"><span>${e(d.wd)}</span></span>
          <span style="font-size:15px;font-weight:500;font-variant-numeric:tabular-nums"><span>${d.n}</span></span>
          <span class="ms" style="${S(d.icon)}">mail</span>
        </div>`).join('')}
    </section>
    ${po.parcels.length ? `<section style="display:flex;flex-direction:column;gap:2px">
      <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:0 4px 8px">Pakker på vei</div>
      ${po.parcels.map(p => `<div style="${S(p.row)}">
          <span style="${S(p.iconWrap)}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">${e(p.icon)}</span></span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
            <div style="display:flex;justify-content:space-between;gap:10px">
              <span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(p.name)}</span></span>
              <span style="font-size:12px;color:#8e8d89;white-space:nowrap"><span>${e(p.eta)}</span></span>
            </div>
            <div style="display:flex;gap:3px">
              ${p.steps.map(st => `<span style="${S(st)}"></span>`).join('')}
            </div>
            <span style="font-size:12px;color:#8e8d89"><span>${e(p.status)}</span></span>
          </div>
        </div>`).join('')}
    </section>` : ''}` : ''}
</div>`;
      return html;
    }
  }

  KD.define('kd-kalender-card', KDKalenderCard, 'KD Kalender', 'Kalender, hytta, framover, bursdager og posten – pikselkopi av Claude Design «Kalender»');
  KD.sheet('cal', 'kd-kalender-card');
})();
