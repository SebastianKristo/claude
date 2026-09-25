/*
 * kd-vanning-card — «Vanning v2» fra Claude Design, som Home Assistant-kort.
 *
 * type: custom:kd-vanning-card        # virker uten konfig
 * ki_vanning: ''                      # oversiktssensoren fra KI Vanning (integrasjon: ki_vanning, ki_type: oversikt); tom = finn selv
 * prefiks: ''                         # OpenSprinkler-prefiks (f.eks. ute_opensprinkler); tom = finn selv (…_sNN_…_station_running)
 * historikk: ''                       # sensor med kumulativt forbruk (statistikk per døgn); tom = KI Vannings «Forbruk totalt»
 * vann_prefiks: sensor.hjemme_        # KI Vann: utendørsforbruk i dag og vannpris (kr_per_m3) som reserve
 * vinter: ''                          # valgfri vintermodus-bryter (på = anlegget regnes som av)
 * standard_min: 10                    # minutter når en sone startes for hånd og ingen program sier noe annet
 * rate: 8                             # L/min for soner som ikke er kalibrert i KI Vanning
 * spenning: 24                        # ventilspenning (V) for å regne strømtrekk (mA) om til watt
 * historikk_dager: 120                # hvor langt tilbake kalenderen henter statistikk
 *
 * Tjenester: ki_vanning.kjor / stopp / kjor_program / hopp_over / sett_regnpause / nullstill_regnpause / sett_anlegg / lag_program,
 * med OpenSprinkler (opensprinkler.run_station / stop / run_program / set_rain_delay) som reserve uten KI Vanning.
 */
(() => {
  const KD = window.KD;
  const { S, e } = KD;
  const B = 'oklch(0.8 0.12 235)', AMBER = 'oklch(0.82 0.12 75)', GREEN = 'oklch(0.8 0.12 150)', RED = 'oklch(0.72 0.14 25)';
  const al = KD.a;
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dt = s => new Date(s + 'T12:00:00');
  const nf = n => Math.round(Number(n) || 0).toLocaleString('nb-NO');
  const cap = t => t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  const fmt = sec => `${Math.floor(sec / 60)}:${pad(Math.floor(sec % 60))}`;
  const toMin = v => { const m = String(v || '').match(/(\d{1,2}):(\d{2})/); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  const hmm = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
  const DKEY = ['man', 'tir', 'ons', 'tor', 'fre', 'lor', 'son'];
  const DFULL = { man: 'Mandag', tir: 'Tirsdag', ons: 'Onsdag', tor: 'Torsdag', fre: 'Fredag', lor: 'Lørdag', son: 'Søndag' };
  const DSHORT = { man: 'man', tir: 'tir', ons: 'ons', tor: 'tor', fre: 'fre', lor: 'lør', son: 'søn' };
  const kind = z => z.type === 'drypp' ? `Drypp${z.box ? ' B' + z.box : ''}` : z.type === 'spreder' ? `Spreder${z.box ? ' B' + z.box : ''}` : z.type === 'slange' ? `${String(z.rate).replace('.', ',')} L/min` : (z.metode || 'Sone');
  const icon = z => z.type === 'drypp' ? 'water_drop' : z.type === 'spreder' ? 'sprinkler' : 'water';
  const dayName = d => { const t = new Date(); t.setHours(12, 0, 0, 0); const diff = Math.round((dt(d) - t) / 864e5); return diff === 0 ? 'I dag' : diff === 1 ? 'I morgen' : cap(dt(d).toLocaleDateString('nb-NO', { weekday: 'long' })); };
  const dm = d => dt(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
  const dm2 = d => dm(d).replace(/\.$/, '');

  class KDVanningCard extends KD.KDSheet {
    static head = ['sprinkler', 'Vanning', 'Hage og plen'];
    static defaults = { ki_vanning: '', prefiks: '', historikk: '', vann_prefiks: 'sensor.hjemme_', vinter: '', standard_min: 10, rate: 8, spenning: 24, historikk_dager: 120 };
    static sheetCss = `.kd-va-b{transition:transform .12s}.kd-va-b:active{transform:scale(0.96)}`;

    constructor() {
      super();
      const t = new Date();
      this.state = { tab: 'now', showDisabled: false, period: 'dag', month: [t.getFullYear(), t.getMonth()], sel: iso(t), skipped: null };
    }
    onConnect() { super.onConnect(); clearInterval(this._tick); this._tick = setInterval(() => { if (this._running) this._queue(); }, 1000); }
    onDisconnect() { super.onDisconnect(); clearInterval(this._tick); }

    /* ---------- oppdagelse ---------- */
    ki() {
      const S0 = this.all(), cfg = this.config;
      let id = cfg.ki_vanning;
      if (!id) id = Object.keys(S0).find(x => x.startsWith('sensor.') && S0[x].attributes.integrasjon === 'ki_vanning' && S0[x].attributes.ki_type === 'oversikt') || (S0['sensor.ki_vanning_oversikt'] ? 'sensor.ki_vanning_oversikt' : null);
      const st = id && this.st(id);
      return st ? { id, ...st.attributes } : null;
    }
    kiEnt(type, re) {
      const S0 = this.all();
      return Object.keys(S0).find(id => S0[id].attributes.integrasjon === 'ki_vanning' && S0[id].attributes.ki_type === type) || (re ? Object.keys(S0).find(id => re.test(id) && /vanning/.test(id)) : null) || null;
    }
    prefix(ki) {
      if (this.config.prefiks) return this.config.prefiks;
      if (ki && ki.modus === 'ventiler') return ki.prefiks || 'ki_vanning';
      if (ki && ki.prefiks) return ki.prefiks;
      const t = Object.keys(this.all()).find(id => /^binary_sensor\..+_s\d\d.*_station_running$/.test(id));
      return t ? t.replace(/^binary_sensor\./, '').replace(/_s\d\d.*_station_running$/, '') : null;
    }
    services() { const s = this.hass && this.hass.services; return s ? s.ki_vanning || null : undefined; }
    useKi(ki, svc) { if (!ki) return false; const s = this.services(); return s === undefined ? true : !!(s && (!svc || s[svc])); }

    zones(ki, p) {
      const cfg = this.config, S0 = this.all(), kz = (ki && Array.isArray(ki.soner)) ? ki.soner : [];
      const typeOf = (m, n) => /drypp/i.test(m) ? 'drypp' : /spreder|spr\b/i.test(m) ? 'spreder' : /slange/i.test(m + ' ' + n) ? 'slange' : m ? 'annet' : 'spreder';
      let list = [];
      if (ki && ki.modus === 'ventiler') {
        list = kz.filter(z => Number(z.nr) !== 0).map(z => ({ nr: pad(z.nr), navn: z.navn, metode: z.metode || '', box: String(z.boks || (String(z.metode || '').match(/B(\d)/i) || [])[1] || ''), bryter: z.bryter, gaar: z.gaar || z.bryter, status: z.status || null, enabled: z.aktiv !== false, ubrukt: false }));
      } else if (p) {
        const re = new RegExp('^switch\\.' + p + '_s(\\d\\d)(.*)_station_enabled$');
        list = Object.keys(S0).map(id => {
          const m = id.match(re); if (!m) return null;
          const nr = m[1], tail = m[2] || '';
          const tekst = String(S0[id].attributes.friendly_name || '').replace(/^.*?\bS\d\d\b\s*/i, '').replace(/\s*Station Enabled$/i, '').trim();
          const ubrukt = !tekst || /^S?\d+$/.test(tekst);
          const [navn, metode = ''] = tekst.split('·').map(x => x.trim());
          return { nr, navn: navn || 'Sone ' + nr, metode, box: (metode.match(/B(\d)/i) || [])[1] || '', ubrukt, enabled: S0[id].state === 'on',
            bryter: id, gaar: `binary_sensor.${p}_s${nr}${tail}_station_running`, status: `sensor.${p}_s${nr}${tail}_station_status` };
        }).filter(Boolean).sort((x, y) => x.nr.localeCompare(y.nr));
      }
      const hs = kz.find(z => Number(z.nr) === 0);
      if (hs) list.push({ nr: '00', navn: hs.navn || 'Hageslange', metode: 'slange', box: '', bryter: hs.bryter || hs.entity || null, gaar: hs.gaar || null, status: null, enabled: true, ubrukt: false, hs: true });
      const hist = (ki && ki.program_historikk) || [];
      return list.map(z => {
        const k = kz.find(x => Number(x.nr) === Number(z.nr) || String(x.navn).toLowerCase() === String(z.navn).toLowerCase()) || {};
        let min = null;
        for (const pr of hist) { const f = (pr.soner || []).find(s => (z.bryter && s.entity === z.bryter) || String(s.navn || '').toLowerCase() === String(z.navn).toLowerCase() || Number(s.nr) === Number(z.nr)); if (f && f.min) { min = Number(f.min); break; } }
        const type = z.hs ? 'slange' : typeOf(z.metode, z.navn);
        const rate = k.rate ? Number(k.rate) : Number(cfg.rate) || 8;
        return { ...z, id: z.hs ? 'HS' : `S${z.nr}`, code: z.hs ? '' : `S${z.nr}`, name: z.navn, type, rate, min: min || Number(cfg.standard_min) || 10, k,
          running: z.gaar ? this.v(z.gaar) === 'on' : false, queued: z.status ? /wait|queue|kø/i.test(this.v(z.status)) : false };
      });
    }

    /* Program: slik de er satt opp (KI Vanning), ellers OpenSprinklers programbrytere */
    programs(ki, p, zones) {
      const S0 = this.all(), out = [];
      const zoneOf = s => zones.find(z => (s.entity && z.bryter === s.entity) || (s.nr != null && Number(z.nr) === Number(s.nr) && !z.hs) || String(z.name).toLowerCase() === String(s.navn || '').toLowerCase());
      const osRe = p ? new RegExp('^switch\\.' + p + '_(.+)_program_enabled$') : null;
      const os = osRe ? Object.keys(S0).map(id => { const m = id.match(osRe); return m ? { id, slug: m[1], navn: String(S0[id].attributes.friendly_name || m[1]).replace(/\s*Program Enabled$/i, '').trim() } : null; }).filter(Boolean) : [];
      for (const pr of (ki && ki.program_historikk) || []) {
        const o = os.find(x => x.navn.toLowerCase() === String(pr.navn).toLowerCase());
        out.push({ navn: pr.navn, tid: pr.tid, dager: pr.dager || [], intervall: pr.intervall || 0, start_dato: pr.start_dato, samtidig: !!pr.samtidig,
          on: o ? this.v(o.id) === 'on' : pr.aktiv !== false, sw: o ? o.id : null, raw: pr, zones: (pr.soner || []).map(s => ({ z: zoneOf(s), min: Number(s.min) || 0, navn: s.navn })).filter(x => x.z) });
      }
      for (const o of os) {
        if (out.some(x => x.sw === o.id)) continue;
        const tid = this.v(`time.${p}_${o.slug}_start_time`).slice(0, 5);
        const iv = this.n(`number.${p}_${o.slug}_interval_days`);
        out.push({ navn: o.navn, tid, dager: [], intervall: iv && iv > 1 ? iv : 0, on: this.v(o.id) === 'on', sw: o.id, zones: [], os: true });
      }
      return out;
    }

    /* Kommende kjøringer: { 'YYYY-MM-DD': [{ time, min: minutter fra midnatt, z, mins, liters, prog, start: Date }] } */
    schedule(ki, zones, progs) {
      const out = {}, now = Date.now();
      const zoneOf = s => zones.find(z => (s.nr != null && Number(z.nr) === Number(s.nr) && !z.hs) || String(z.name).toLowerCase() === String(s.navn || '').toLowerCase() || (s.entity && z.bryter === s.entity));
      const addRun = (start, navn, list, samtidig) => {
        const k = iso(start); let t = start.getHours() * 60 + start.getMinutes();
        for (const s of list) {
          const z = s.z || zoneOf(s); if (!z) continue;
          const mins = Number(s.min) || z.min;
          (out[k] = out[k] || []).push({ time: hmm(t), t, z, mins, liters: mins * z.rate, prog: navn, start: new Date(+start + (t - start.getHours() * 60 - start.getMinutes()) * 60e3) });
          if (!samtidig) t += mins;
        }
      };
      let horizon = null; const seen = new Set();
      for (const r of (ki && ki.programmer) || []) {
        const start = r.start ? new Date(r.start) : null;
        if (!start || isNaN(start) || (r.minutter_til != null && r.minutter_til < 0)) continue;
        const pr = progs.find(x => String(x.navn).toLowerCase() === String(r.navn).toLowerCase());
        const list = (r.soner && r.soner.length) ? r.soner : pr ? pr.zones.map(x => ({ z: x.z, min: x.min })) : [];
        addRun(start, r.navn, list, pr && pr.samtidig);
        seen.add(r.navn + '|' + iso(start));
        if (!horizon || start > horizon) horizon = start;
      }
      // fram i tid etter det integrasjonen har planlagt: ukedagene (eller intervallet) til programmene som står på
      const from = horizon ? new Date(horizon) : new Date(); from.setHours(0, 0, 0, 0); if (horizon) from.setDate(from.getDate() + 1);
      for (let i = 0; i < 70; i++) {
        const d = new Date(from); d.setDate(from.getDate() + i);
        for (const pr of progs) {
          if (!pr.on || !pr.zones.length) continue;
          const tm = toMin(pr.tid); if (tm == null) continue;
          let hit = false;
          if (pr.intervall && pr.start_dato) { const diff = Math.round((new Date(iso(d) + 'T12:00') - new Date(String(pr.start_dato).slice(0, 10) + 'T12:00')) / 864e5); hit = diff >= 0 && diff % pr.intervall === 0; }
          else if (!pr.intervall) hit = !pr.dager.length || pr.dager.includes(DKEY[(d.getDay() + 6) % 7]);
          if (!hit || seen.has(pr.navn + '|' + iso(d))) continue;
          const start = new Date(d); start.setHours(Math.floor(tm / 60), tm % 60, 0, 0);
          if (+start < now) continue;
          addRun(start, pr.navn, pr.zones.map(x => ({ z: x.z, min: x.min })), pr.samtidig);
        }
      }
      for (const k in out) out[k].sort((x, y) => x.t - y.t);
      return out;
    }

    /* Døgnforbruk fra langtidsstatistikken: { 'YYYY-MM-DD': liter } */
    daily(ki) {
      const cfg = this.config, S0 = this.all();
      let id = cfg.historikk || Object.keys(S0).find(x => x.startsWith('sensor.') && S0[x].attributes.integrasjon === 'ki_vanning' && S0[x].attributes.ki_type === 'total')
        || Object.keys(S0).find(x => /^sensor\..*(ki_vanning|vanning).*forbruk_totalt$/.test(x));
      if (!id && this.st(`${cfg.vann_prefiks}utendors_i_dag`)) id = `${cfg.vann_prefiks}utendors_i_dag`;
      if (!id) return { id: null, days: {} };
      const hours = 24 * Math.max(20, Number(cfg.historikk_dager) || 120);
      const r = this.cached('kd-vann-stat-' + id + hours, 30 * 60e3, () => this.stats([id], hours, 'day', ['change', 'sum']), {});
      const rows = (r && r[id]) || [], days = {}; let prev = null;
      for (const x of rows) {
        let v = x.change; if (v == null) { v = prev == null ? null : Number(x.sum) - prev; prev = Number(x.sum); }
        if (v == null) continue;
        const d = new Date(typeof x.start === 'number' ? x.start : x.start); days[iso(d)] = Math.max(0, Number(v));
      }
      return { id, days };
    }

    /* ---------- handlinger ---------- */
    ctx() { const ki = this.ki(), p = this.prefix(ki); return { ki, p, zones: this.zones(ki, p) }; }
    stopAll() {
      const { ki, p } = this.ctx();
      if (this.useKi(ki, 'stopp')) return this.call('ki_vanning', 'stopp', {});
      if (p) return this.call('opensprinkler', 'stop', {}, { entity_id: `switch.${p}_enabled` });
    }
    rainToggle() {
      const { ki, p } = this.ctx(), on = this.rainOn(ki, p);
      if (this.useKi(ki, 'sett_regnpause')) return on ? this.call('ki_vanning', 'nullstill_regnpause', {}) : this.call('ki_vanning', 'sett_regnpause', { timer: 24 });
      if (p) return this.call('opensprinkler', 'set_rain_delay', { rain_delay: on ? 0 : 24 }, { entity_id: `switch.${p}_enabled` });
    }
    resetAll() {
      const { ki, p } = this.ctx();
      this.setState({ skipped: null });
      if (this.rainOn(ki, p)) {
        if (this.useKi(ki, 'nullstill_regnpause')) return this.call('ki_vanning', 'nullstill_regnpause', {});
        if (p) return this.call('opensprinkler', 'set_rain_delay', { rain_delay: 0 }, { entity_id: `switch.${p}_enabled` });
      }
      this.haptic('light');
    }
    systemToggle() {
      const { ki, p } = this.ctx(), id = this.systemId(ki, p);
      if (id) return this.toggle(id);
      if (ki) return this.call('ki_vanning', 'sett_anlegg', { pa: ki.anlegg === false });
    }
    runZone(ev, id) {
      const { ki, zones } = this.ctx(), z = zones.find(x => x.id === id); if (!z) return;
      if (!this.systemOn(ki, this.prefix(ki))) return this.toast('Anlegget er av');
      if (z.running) {
        if (this.useKi(ki, 'stopp') && (ki.modus === 'ventiler' || !z.bryter)) return this.call('ki_vanning', 'stopp', {});
        return z.bryter ? this.call('opensprinkler', 'stop', {}, { entity_id: z.bryter }) : this.call('ki_vanning', 'stopp', {});
      }
      if (this.useKi(ki, 'kjor')) return this.call('ki_vanning', 'kjor', { sone: z.bryter || z.name, minutter: z.min });
      if (z.bryter) return this.call('opensprinkler', 'run_station', { run_seconds: z.min * 60 }, { entity_id: z.bryter });
    }
    runProg(ev, navn) {
      const { ki, p, zones } = this.ctx(), pr = this.programs(ki, p, zones).find(x => x.navn === navn);
      if (this.useKi(ki, 'kjor_program')) return this.call('ki_vanning', 'kjor_program', { program: navn });
      if (pr && pr.sw) return this.call('opensprinkler', 'run_program', {}, { entity_id: pr.sw });
    }
    progToggle(ev, navn) {
      const { ki, p, zones } = this.ctx(), pr = this.programs(ki, p, zones).find(x => x.navn === navn); if (!pr) return;
      if (pr.sw) return this.toggle(pr.sw);
      this.call('ki_vanning', 'lag_program', { ...pr.raw, navn, aktiv: !pr.on });
    }
    skip(ev, key) {
      const svc = this.services();
      if (this.state.skipped === key) {
        const undo = svc && ['angre_hopp_over', 'angre_hopp', 'ikke_hopp_over'].find(k => svc[k]);
        if (undo) this.call('ki_vanning', undo, { program: key.split('|')[0] });
        return this.setState({ skipped: null });
      }
      this.setState({ skipped: key });
      if (this.useKi(this.ki(), 'hopp_over')) this.call('ki_vanning', 'hopp_over', { program: key.split('|')[0] });
    }
    tab(ev, k) { this.setState({ tab: k }); }
    period(ev, k) { this.setState({ period: k }); }
    toggleDisabled() { this.setState({ showDisabled: !this.state.showDisabled }); }
    pick(ev, k) { this.setState({ sel: k }); }
    prevMonth() { const [y, m] = this.state.month; this.setState({ month: m === 0 ? [y - 1, 11] : [y, m - 1] }); }
    nextMonth() { const [y, m] = this.state.month; this.setState({ month: m === 11 ? [y + 1, 0] : [y, m + 1] }); }
    moreId(ev, id) { if (id) this.more(id); }

    /* ---------- tilstand ---------- */
    rainOn(ki, p) { return !!(ki && ki.regnpause) || (p ? this.v(`binary_sensor.${p}_rain_delay_active`) === 'on' : false); }
    systemId(ki, p) { if (this.config.vinter) return this.config.vinter; if (ki && ki.modus === 'ventiler') return this.kiEnt('anlegg', /^switch\..*anlegg/); return p && this.st(`switch.${p}_enabled`) ? `switch.${p}_enabled` : this.kiEnt('anlegg', /^switch\..*anlegg/); }
    systemOn(ki, p) {
      if (this.config.vinter) return this.v(this.config.vinter) !== 'on';
      const id = this.systemId(ki, p);
      if (id && this.st(id)) return this.v(id) === 'on';
      return !(ki && ki.anlegg === false);
    }

    body() {
      const s = this.state, cfg = this.config;
      const ki = this.ki(), p = this.prefix(ki), zones = this.zones(ki, p);
      const progs = this.programs(ki, p, zones);
      const SCHED = this.schedule(ki, zones, progs);
      const { days: HIST } = this.daily(ki);
      const today = new Date(), TODAY = iso(today);
      const system = this.systemOn(ki, p), rain = this.rainOn(ki, p);
      const pl = (ki && ki.planlegger) || {};

      // hva vanner nå
      let run = zones.find(z => z.running) || null;
      if (!run && pl.kjorer && ki.aktiv_sone) run = zones.find(z => String(z.name).toLowerCase() === String(ki.aktiv_sone).toLowerCase().replace(/^s\d\d\s+/, '')) || null;
      let left = 0;
      if (run) {
        let sec = pl.kjorer && Number(pl.sekunder_igjen) > 0 ? Number(pl.sekunder_igjen) : null;
        const st = run.status ? this.st(run.status) : null;
        if (sec == null && st) { const m = String(st.state).match(/(\d+):(\d\d)(?::(\d\d))?/); if (m) sec = m[3] ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : (+m[1]) * 60 + (+m[2]);
          const a = st.attributes || {}; if (sec == null && Number(a.seconds_remaining ?? a.remaining ?? a.sekunder_igjen) > 0) sec = Number(a.seconds_remaining ?? a.remaining ?? a.sekunder_igjen);
          if (sec == null && (a.end_time || a.slutt)) sec = Math.max(0, (new Date(a.end_time || a.slutt) - Date.now()) / 1000); }
        const key = run.id + '|' + (st ? st.last_changed : '');
        if (sec != null && (!this._end || this._endKey !== key || Math.abs((this._end - Date.now()) / 1000 - sec) > 3)) { this._end = Date.now() + sec * 1000; this._endKey = key; }
        if (sec == null && this._endKey && !this._endKey.startsWith(run.id + '|')) this._end = null;
        left = this._end ? Math.max(0, Math.round((this._end - Date.now()) / 1000)) : 0;
      } else { this._end = null; this._endKey = null; }
      this._running = !!run;
      const queue = [];
      for (const q of pl.i_koe || []) { const nm = typeof q === 'string' ? q : (q && (q.navn || q.sone)) || ''; const z = zones.find(x => String(x.name).toLowerCase() === String(nm).toLowerCase() || (q && q.nr != null && Number(x.nr) === Number(q.nr))); if (z && z !== run) queue.push(z); }
      zones.filter(z => z.queued && z !== run && !queue.includes(z)).forEach(z => queue.push(z));
      const total = run ? Math.max(run.min * 60, left) : 1;

      const usedToday = ki && ki.i_dag != null ? Number(ki.i_dag) : this.n(`${cfg.vann_prefiks}utendors_i_dag`, 0);
      const upcoming = Object.keys(SCHED).sort().filter(d => d >= TODAY && SCHED[d].some(x => +x.start > Date.now()));
      const todayPlan = (SCHED[TODAY] || []).reduce((t, x) => t + x.liters, 0);
      const planned = ki && ki.estimat_i_dag != null ? Number(ki.estimat_i_dag) : todayPlan;

      // neste kjøring (hopp over hopper til dagen etter)
      const runKey = d => d && SCHED[d] ? `${SCHED[d][0].prog}|${d}` : null;
      const nextDay = upcoming.find(d => runKey(d) !== s.skipped) || null;
      const skippedDay = s.skipped ? s.skipped.split('|')[1] : null;
      const nextItems = nextDay ? SCHED[nextDay].filter(x => +x.start > Date.now() - 60e3) : [];
      const first = nextItems[0];
      const pris = ki && ki.pris_m3 ? Number(ki.pris_m3) : this.at(`${cfg.vann_prefiks}vannkostnad_i_dag`, 'kr_per_m3', null);
      const KR = pris ? pris / 1000 : null;
      const rainLeft = ki && ki.regnpause_minutter ? Math.max(1, Math.round(ki.regnpause_minutter / 60)) : (() => { const t = p ? this.v(`sensor.${p}_rain_delay_stop_time`) : ''; const d = new Date(t); return t && !isNaN(d) ? Math.max(1, Math.round((d - Date.now()) / 3600e3)) : 24; })();

      const status = !system ? ['Anlegget er av', '#8e8d89'] : run ? ['Vanner nå', B] : rain ? [`Regnpause ${rainLeft} t`, AMBER] : ['Klar', GREEN];
      const headline = !system ? 'Vanning er slått av' : run ? `${run.name} vannes` : rain ? 'Vanning er satt på pause' : 'Hagen er tørr og klar';
      const subline = run ? `${fmt(left)} igjen${queue.length ? ` · ${queue.length} soner i kø` : ''}`
        : first ? `Neste: ${first.z.code ? first.z.code + ' ' : ''}${first.z.name} · ${kind(first.z)} · ${dayName(nextDay).toLowerCase()} ${first.time}${rain ? ' (utsettes)' : ''}` : 'Ingen vanning planlagt';
      const ctrl = (ic, label, on, col, go, iconCol) => ({ icon: ic, label, go,
        style: { height: 68, borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: on ? al(col, 0.16) : '#1c1c1f', boxShadow: on ? `inset 0 0 0 1px ${al(col, 0.45)}` : 'inset 0 0 0 1px rgba(255,255,255,0.05)', transition: 'background .2s' },
        iconStyle: { fontSize: 22, color: on ? col : iconCol || '#c9c7c2', fontVariationSettings: `'FILL' ${on ? 1 : 0}` } });
      const controls = [
        ctrl('stop_circle', 'Stopp alt', false, RED, 'stopAll', run ? RED : null),
        ctrl('rainy', 'Regn 24t', rain, AMBER, 'rainToggle'),
        ctrl('restart_alt', 'Nullstill', false, B, 'resetAll'),
        ctrl('power_settings_new', system ? 'Anlegg på' : 'Anlegg av', system, GREEN, 'systemToggle'),
      ];
      const tabs = [['now', 'Nå', 'water_drop'], ['zones', 'Soner', 'sprinkler'], ['prog', 'Program', 'event_repeat'], ['use', 'Forbruk', 'bar_chart'], ['hist', 'Historikk', 'calendar_month']].map(([k, label, ic]) => ({ k, label, icon: ic,
        style: { height: 52, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11, fontWeight: 500, background: s.tab === k ? '#323235' : 'transparent', color: s.tab === k ? '#f2f1ee' : '#8e8d89', transition: 'background .2s' },
        iconStyle: { fontSize: 20, color: s.tab === k ? B : '#8e8d89', fontVariationSettings: `'FILL' ${s.tab === k ? 1 : 0}` } }));
      const ticks = Array.from({ length: 48 }, (_, i) => ({ flex: 1, borderRadius: 2, background: planned && i < Math.round(usedToday / planned * 48) ? B : '#29292c', transition: 'background .3s' }));

      let html = '';
      /* ---------- NÅ ---------- */
      if (s.tab === 'now') {
        if (run) {
          const runFill = { position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(1 - left / total) * 100}%`, background: `linear-gradient(90deg, ${al(B, 0.05)}, ${al(B, 0.16)})`, transition: 'width 1s linear' };
          const used = run.k && run.k.i_dag != null ? Number(run.k.i_dag) : null;
          html += `
    <div style="position:relative;overflow:hidden;background:#1c1c1f;border-radius:24px;padding:18px;box-shadow:inset 0 0 0 1px oklch(0.8 0.12 235 / 0.45);display:flex;flex-direction:column;gap:14px">
      <div style="${S(runFill)}"></div>
      <div style="position:relative;display:flex;align-items:flex-start;gap:12px">
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px">
          <div style="font-size:12px;color:oklch(0.8 0.12 235)">Vanner nå</div>
          <div style="font-size:18px;font-weight:500"><span>${e(`${run.code ? run.code + ' ' : ''}${run.name}`)}</span></div>
          <div style="font-size:12px;color:#a9a7a2"><span>${e(`${kind(run)}${queue.length ? ` · neste: ${queue[0].name}` : ''}`)}</span></div>
        </div>
        <div style="font-size:40px;font-weight:300;letter-spacing:-0.03em;font-variant-numeric:tabular-nums;line-height:1"><span>${fmt(left)}</span></div>
      </div>
      <div style="position:relative;display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:13px;color:#c9c7c2;font-variant-numeric:tabular-nums"><span>${used != null ? `${nf(used)} av ca. ${nf(run.min * run.rate)} L` : `ca. ${nf(run.min * run.rate)} L`}</span></div>
        <button class="kd-va-b" data-on-click="stopAll" style="height:36px;padding:0 14px 0 10px;border-radius:18px;background:oklch(0.8 0.12 235);color:#141416;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">stop</span>Stopp</button>
      </div>
    </div>`;
        }
        const nextWhen = nextDay ? `${dayName(nextDay)} ${dm(nextDay)}${rain ? ' · utsettes' : ''}` : 'Ingen planlagt';
        const items = nextItems.slice(0, 3).map((x, i) => ({ name: `${x.z.code ? x.z.code + ' ' : ''}${x.z.name}`, kind: `${x.time} · ${kind(x.z)}`, icon: icon(x.z), amount: `${x.mins} min · ${nf(x.liters)} L`,
          row: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i ? '1px solid rgba(255,255,255,0.06)' : 'none' },
          iconWrap: { width: 34, height: 34, borderRadius: 17, flex: 'none', display: 'grid', placeItems: 'center', background: al(B, 0.12), color: B } }));
        const wk = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); const k = iso(d); const v = (SCHED[k] || []).filter(x => +x.start > Date.now()).reduce((t, x) => t + x.liters, 0);
          return { k, v, d: i ? cap(d.toLocaleDateString('nb-NO', { weekday: 'short' }).replace('.', '')) : 'I dag' }; });
        const wkMax = Math.max(...wk.map(w => w.v), 1);
        const hi = 1; // som i designet: i morgen fremheves
        const cur = p ? this.st(`sensor.${p}_current_draw`) : null;
        let power = '–';
        if (cur && !KD.BAD.has(cur.state) && !isNaN(parseFloat(cur.state))) { let mA = parseFloat(cur.state); if ((cur.attributes.unit_of_measurement || 'mA') === 'A') mA *= 1000; const W = mA / 1000 * (Number(cfg.spenning) || 24); power = `${Math.round(mA)} mA · ca. ${W.toLocaleString('nb-NO', { maximumFractionDigits: W < 10 && W > 0 ? 1 : 0 })} W`; }
        const lastK = Object.keys(HIST).sort().reverse().find(k => HIST[k] > 0.5);
        const lastRun = p ? this.st(`sensor.${p}_last_run`) : null;
        const sist = lastK ? `${dm2(lastK)} · ${nf(HIST[lastK])} L` : lastRun && !KD.BAD.has(lastRun.state) && !isNaN(new Date(lastRun.state)) ? new Date(lastRun.state).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }) : '–';
        const skKey = nextDay ? runKey(nextDay) : null;
        html += `
    <div style="background:#1c1c1f;border:1px solid rgba(255,255,255,0.05);border-radius:24px;padding:18px;display:flex;flex-direction:column;gap:16px">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px">
        <div style="display:flex;flex-direction:column;gap:4px;min-width:0">
          <div style="font-size:12px;color:#8e8d89">Neste vanning</div>
          <div style="font-size:15px;font-weight:500;white-space:nowrap"><span>${e(nextWhen)}</span></div>
        </div>
        <div style="font-size:52px;font-weight:300;letter-spacing:-0.04em;line-height:0.9;font-variant-numeric:tabular-nums"><span>${first ? first.time : '––:––'}</span></div>
      </div>
      <div style="display:flex;flex-direction:column">
        ${items.map(i => `
          <div style="${S(i.row)}">
            <span style="${S(i.iconWrap)}"><span class="ms" style="font-size:17px"><span>${i.icon}</span></span></span>
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
              <div style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(i.name)}</span></div>
              <div style="font-size:12px;color:#8e8d89"><span>${e(i.kind)}</span></div>
            </div>
            <div style="font-size:12px;color:#a9a7a2;white-space:nowrap;font-variant-numeric:tabular-nums"><span>${e(i.amount)}</span></div>
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:8px">
        <button class="kd-va-b" data-on-click="runProg" data-arg="${e(first ? first.prog : '')}" style="flex:1;height:44px;border-radius:16px;background:#2a2a2d;display:flex;align-items:center;justify-content:center;gap:6px;font-size:14px;font-weight:500"><span class="ms" style="font-size:20px;font-variation-settings:'FILL' 1">play_arrow</span>Kjør nå</button>
        <button class="kd-va-b" data-on-click="skip" data-arg="${e(s.skipped || skKey || '')}" style="flex:1;height:44px;border-radius:16px;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;gap:6px;font-size:14px;font-weight:500;color:#c9c7c2"><span class="ms" style="font-size:20px">skip_next</span><span>${s.skipped ? 'Angre hopp' : 'Hopp over'}</span></button>
      </div>
    </div>

    <div style="background:#1c1c1f;border:1px solid rgba(255,255,255,0.05);border-radius:24px;padding:16px 18px 14px;display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;white-space:nowrap">
        <div style="font-size:12px;color:#8e8d89">Neste 7 dager</div>
        <div style="font-size:12px;color:#8e8d89;font-variant-numeric:tabular-nums"><span>${nf(wk.reduce((t, w) => t + w.v, 0))} L planlagt</span></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;align-items:end;height:96px">
        ${wk.map((w, i) => `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:6px;height:100%">
            <div style="${S({ width: '100%', maxWidth: 34, height: w.v ? `${Math.max(8, w.v / wkMax * 64)}px` : '4px', borderRadius: 8, background: w.v ? (w.k === skippedDay ? '#2e2e31' : al(B, i === hi ? 0.9 : 0.45)) : '#29292c' })}"></div>
            <div style="${S({ fontSize: 11, color: i ? '#8e8d89' : '#f2f1ee', whiteSpace: 'nowrap' })}"><span>${w.d}</span></div>
          </div>`).join('')}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
      <div data-on-click="moreId" data-arg="${e(p ? `sensor.${p}_current_draw` : '')}" style="background:#1c1c1f;border:1px solid rgba(255,255,255,0.05);border-radius:20px;padding:14px 16px;display:flex;flex-direction:column;gap:4px">
        <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#8e8d89"><span class="ms" style="font-size:16px;color:oklch(0.82 0.12 90)">bolt</span>Strøm</div>
        <div style="font-size:16px;font-weight:500;font-variant-numeric:tabular-nums"><span>${e(power)}</span></div>
      </div>
      <div data-on-click="tab" data-arg="hist" style="background:#1c1c1f;border:1px solid rgba(255,255,255,0.05);border-radius:20px;padding:14px 16px;display:flex;flex-direction:column;gap:4px">
        <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#8e8d89"><span class="ms" style="font-size:16px;color:oklch(0.8 0.12 235)">history</span>Sist vannet</div>
        <div style="font-size:16px;font-weight:500"><span>${e(sist)}</span></div>
      </div>
    </div>`;
      }

      /* ---------- SONER ---------- */
      const active = zones.filter(z => z.enabled && !z.ubrukt), disabled = zones.filter(z => !z.enabled || z.ubrukt);
      if (s.tab === 'zones') {
        const boxes = [...new Set(active.filter(z => z.box).map(z => z.box))].sort();
        const groups = boxes.map(b => ({ name: `Boks ${b}`, list: active.filter(z => z.box === b) })).concat(active.some(z => !z.box) ? [{ name: boxes.length ? 'Øvrige' : 'Soner', list: active.filter(z => !z.box) }] : []);
        const zoneRow = (z, i) => {
          const on = run === z, queued = queue.includes(z), tot = Math.max(z.min * 60, left || 1);
          const sub = on ? `Vanner · ${fmt(left)} igjen` : queued ? 'I kø' : `${kind(z)} · ${z.min} min · ca. ${nf(z.min * z.rate)} L`;
          return `
            <div style="${S({ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i ? '1px solid rgba(255,255,255,0.06)' : 'none' })}">
              <div style="${S({ position: 'absolute', left: -14, top: 0, bottom: 0, width: on ? `calc(${(1 - left / tot) * 100}% + 14px)` : 0, background: al(B, 0.1), transition: 'width 1s linear' })}"></div>
              <span style="${S({ position: 'relative', width: 36, height: 36, borderRadius: 18, flex: 'none', display: 'grid', placeItems: 'center', background: on ? B : al(B, 0.12), color: on ? '#141416' : B })}"><span class="ms" style="font-size:18px"><span>${icon(z)}</span></span></span>
              <div style="position:relative;flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
                <div style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span style="color:#8e8d89;font-variant-numeric:tabular-nums"><span>${z.code}</span></span> <span>${e(z.name)}</span></div>
                <div style="${S({ fontSize: 12, color: on ? B : queued ? '#c9c7c2' : '#8e8d89', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })}"><span>${e(sub)}</span></div>
              </div>
              <button class="kd-va-b" data-on-click="runZone" data-arg="${z.id}" style="${S({ position: 'relative', width: 40, height: 40, borderRadius: 20, flex: 'none', display: 'grid', placeItems: 'center', background: on ? B : '#2a2a2d', color: on ? '#141416' : system ? '#f2f1ee' : '#5d5c5a' })}"><span class="ms" style="font-size:20px;font-variation-settings:'FILL' 1"><span>${on ? 'stop' : 'play_arrow'}</span></span></button>
            </div>`;
        };
        html += groups.map(g => `
    <div style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;white-space:nowrap;padding:0 4px">
        <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89"><span>${g.name}</span></div>
        <div style="font-size:12px;color:#6d6c69"><span>${g.list.length} ${g.list.length === 1 ? 'sone' : 'soner'}</span></div>
      </div>
      <div style="background:#1c1c1f;border:1px solid rgba(255,255,255,0.05);border-radius:22px;padding:4px 12px 4px 14px">
        ${g.list.map(zoneRow).join('')}
      </div>
    </div>`).join('') || `<div style="padding:16px;border-radius:22px;background:#1c1c1f;font-size:13px;color:#8e8d89">Fant ingen soner. Sjekk OpenSprinkler / KI Vanning, eller sett prefiks.</div>`;
        if (disabled.length) {
          html += `
    <button data-on-click="toggleDisabled" style="height:48px;border-radius:18px;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;gap:8px;font-size:13px;font-weight:500;color:#a9a7a2"><span class="ms" style="${S({ fontSize: 20, transform: s.showDisabled ? 'rotate(180deg)' : 'none', transition: 'transform .2s' })}">expand_more</span><span>${disabled.length} deaktiverte soner</span></button>
    ${s.showDisabled ? `
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${disabled.map(z => `<div style="height:32px;padding:0 12px;border-radius:16px;background:#1a1a1c;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05);display:flex;align-items:center;font-size:12px;color:#6d6c69;font-variant-numeric:tabular-nums"><span>${e(z.ubrukt ? z.code : `${z.code} ${z.name}`)}</span></div>`).join('')}
      </div>` : ''}`;
        }
      }

      /* ---------- PROGRAM ---------- */
      if (s.tab === 'prog') {
        const daysLabel = pr => pr.intervall ? `Hver ${pr.intervall}. dag` : !pr.dager.length || pr.dager.length === 7 ? 'Hver dag' : pr.dager.length === 1 ? DFULL[pr.dager[0]] || pr.dager[0] : cap(pr.dager.map(d => DSHORT[d] || d).join(', '));
        html += `
    <div style="display:flex;flex-direction:column;gap:8px">
      ${progs.map(pr => {
        const mins = pr.zones.reduce((t, x) => t + (x.min || x.z.min), 0), L = pr.zones.reduce((t, x) => t + (x.min || x.z.min) * x.z.rate, 0);
        const sub = [pr.zones.length === 1 ? `${pr.zones[0].z.code ? pr.zones[0].z.code + ' ' : ''}${pr.zones[0].z.name}` : pr.zones.length ? `${pr.zones.length} soner` : '', mins ? `${mins} min` : '', L ? `ca. ${nf(L)} L` : ''].filter(Boolean).join(' · ');
        return `
        <div style="${S({ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px 14px 16px', borderRadius: 20, background: '#1c1c1f', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)', opacity: pr.on ? 1 : 0.55, transition: 'opacity .2s' })}">
          <div style="display:flex;flex-direction:column;align-items:flex-start;width:64px;flex:none">
            <div style="font-size:24px;font-weight:300;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;line-height:1"><span>${e(pr.tid || '––:––')}</span></div>
            <div style="font-size:11px;color:#8e8d89;padding-top:4px;white-space:nowrap"><span>${e(daysLabel(pr))}</span></div>
          </div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px">
            <div style="font-size:15px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(pr.navn)}</span></div>
            <div style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(sub)}</span></div>
          </div>
          <button class="kd-va-b" data-on-click="runProg" data-arg="${e(pr.navn)}" title="Kjør nå" style="width:38px;height:38px;border-radius:19px;background:#2a2a2d;display:grid;place-items:center;flex:none"><span class="ms" style="font-size:20px;font-variation-settings:'FILL' 1">play_arrow</span></button>
          <button data-on-click="progToggle" data-arg="${e(pr.navn)}" style="${S({ position: 'relative', width: 44, height: 26, borderRadius: 13, flex: 'none', background: pr.on ? GREEN : '#38383b', transition: 'background .2s' })}"><span style="${S({ position: 'absolute', top: 3, left: pr.on ? 21 : 3, width: 20, height: 20, borderRadius: 10, background: pr.on ? '#141416' : '#bdbbb6', transition: 'left .2s' })}"></span></button>
        </div>`; }).join('') || `<div style="padding:16px;border-radius:20px;background:#1c1c1f;font-size:13px;color:#8e8d89">Ingen programmer ennå.</div>`}
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:0 4px">Kommende vanninger</div>
      <div style="background:#1c1c1f;border:1px solid rgba(255,255,255,0.05);border-radius:22px;padding:4px 16px">
        ${upcoming.filter(d => d <= iso(new Date(Date.now() + 7 * 864e5))).map((d, i) => { const items = SCHED[d].filter(x => +x.start > Date.now()); const tot = items.reduce((t, x) => t + x.liters, 0);
          return `
          <div style="${S({ padding: '12px 0', borderTop: i ? '1px solid rgba(255,255,255,0.06)' : 'none', opacity: d === skippedDay ? 0.4 : 1 })}">
            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;white-space:nowrap;padding-bottom:6px">
              <div style="font-size:14px;font-weight:500"><span>${e(`${dayName(d)} ${dm(d)}`)}</span></div>
              <div style="font-size:12px;color:#8e8d89;font-variant-numeric:tabular-nums"><span>${items.length} ${items.length === 1 ? 'sone' : 'soner'} · ${nf(tot)} L</span></div>
            </div>
            ${items.map(x => `
              <div style="display:flex;align-items:center;gap:12px;padding:5px 0">
                <div style="width:40px;flex:none;font-size:13px;color:#c9c7c2;font-variant-numeric:tabular-nums"><span>${x.time}</span></div>
                <span style="${S({ width: 6, height: 6, borderRadius: 3, flex: 'none', background: x.z.type === 'spreder' ? B : al(B, 0.5) })}"></span>
                <div style="flex:1;min-width:0;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(`${x.z.code ? x.z.code + ' ' : ''}${x.z.name}`)}</span></div>
                <div style="font-size:12px;color:#8e8d89;white-space:nowrap;font-variant-numeric:tabular-nums"><span>${x.mins} min · ${nf(x.liters)} L</span></div>
              </div>`).join('')}
          </div>`; }).join('') || `<div style="padding:12px 0;font-size:13px;color:#8e8d89">Ingen planlagte vanninger.</div>`}
      </div>
    </div>`;
      }

      /* ---------- FORBRUK ---------- */
      if (s.tab === 'use') {
        const kz = (ki && ki.soner) || [];
        const zUsed = (z, key) => { const k = z.k || {}; const v = k[key]; return v != null ? Number(v) : 0; };
        const now = new Date();
        const endWeek = new Date(now); endWeek.setDate(now.getDate() + (7 - ((now.getDay() + 6) % 7)) - 1); const ew = iso(endWeek);
        const mPref = iso(now).slice(0, 7);
        const estFrom = (pred) => { const o = {}; for (const d of Object.keys(SCHED)) if (pred(d)) for (const x of SCHED[d]) if (+x.start > Date.now()) o[x.z.id] = (o[x.z.id] || 0) + x.liters; return o; };
        const estToday = (() => { const o = {}; let any = false; for (const z of zones) if (z.k && z.k.estimat_i_dag != null) { o[z.id] = Number(z.k.estimat_i_dag); any = true; } return any ? o : estFrom(d => d === TODAY); })();
        const P = {
          dag: { label: 'Brukt i dag', key: 'i_dag', est: estToday, estLabel: 'estimat i dag' },
          uke: { label: 'Brukt denne uken', key: 'uke', est: estFrom(d => d >= TODAY && d <= ew), estLabel: 'planlagt resten av uken' },
          maned: { label: `Brukt i ${now.toLocaleDateString('nb-NO', { month: 'long' })}`, key: 'maaned', est: estFrom(d => d.startsWith(mPref)), estLabel: 'planlagt resten av måneden' },
          ar: { label: `Brukt i ${now.getFullYear()}`, key: 'aar', est: {}, estLabel: `sesongen ${now.getFullYear()}` },
        }[s.period];
        const rowsAll = zones.filter(z => !z.ubrukt).map(z => ({ z, u: zUsed(z, P.key), e: P.est[z.id] || 0 }));
        let usedSum = rowsAll.reduce((t, r) => t + r.u, 0);
        if (!kz.length && ki && ki[P.key] != null) usedSum = Number(ki[P.key]);
        const estSum = Object.values(P.est).reduce((t, v) => t + v, 0);
        const rows = rowsAll.filter(r => r.u || r.e).sort((x, y) => (y.u - x.u) || (y.e - x.e));
        const idle = rowsAll.length - rows.length + zones.filter(z => z.ubrukt).length;
        const maxR = Math.max(1, ...rows.map(r => Math.max(r.u, r.e)));
        const stack = rows.filter(r => r.u).map((r, i) => ({ width: `${r.u / Math.max(usedSum, estSum, 1) * 100}%`, background: al(B, 1 - i * 0.08) })).concat(estSum ? [{ width: `${estSum / Math.max(usedSum, estSum) * 100}%`, background: al(B, 0.18) }] : []);
        html += `
    ${KD.segHTML('periode', [['dag', 'I dag'], ['uke', 'Uke'], ['maned', 'Måned'], ['ar', 'År']], s.period, 'period', { small: true })}
    <div style="background:#1c1c1f;border:1px solid rgba(255,255,255,0.05);border-radius:24px;padding:18px;display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px">
        <div style="flex:none;display:flex;flex-direction:column;gap:4px;white-space:nowrap">
          <div style="font-size:12px;color:#8e8d89"><span>${e(P.label)}</span></div>
          <div style="font-size:34px;font-weight:300;letter-spacing:-0.025em;font-variant-numeric:tabular-nums;line-height:1"><span>${nf(usedSum)}</span><span style="font-size:15px;color:#8e8d89"> L</span></div>
        </div>
        <div style="flex:none;display:flex;flex-direction:column;gap:4px;text-align:right;white-space:nowrap">
          <div style="font-size:15px;font-weight:500;font-variant-numeric:tabular-nums"><span>${KR ? `${(usedSum * KR).toFixed(2).replace('.', ',')} kr` : '–'}</span></div>
          <div style="font-size:12px;color:#8e8d89"><span>${e(estSum ? `${nf(estSum)} L ${P.estLabel}` : P.estLabel)}</span></div>
        </div>
      </div>
      <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;background:#2a2a2d;gap:2px">
        ${stack.map(x => `<span style="${S(x)}"></span>`).join('')}
      </div>
    </div>
    <div style="background:#1c1c1f;border:1px solid rgba(255,255,255,0.05);border-radius:22px;padding:4px 16px">
      ${rows.map((r, i) => `
        <div style="${S({ display: 'flex', padding: '11px 0', borderTop: i ? '1px solid rgba(255,255,255,0.06)' : 'none' })}">
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
            <div style="display:flex;justify-content:space-between;gap:10px;font-size:13px">
              <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span style="color:#8e8d89;font-variant-numeric:tabular-nums"><span>${r.z.code}</span></span> <span>${e(r.z.name)}</span></span>
              <span style="${S({ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: r.u ? '#f2f1ee' : '#8e8d89' })}"><span>${r.u ? `${nf(r.u)} L` : `ca. ${nf(r.e)} L`}</span></span>
            </div>
            <div style="position:relative;height:4px;border-radius:2px;background:#29292c;overflow:hidden">
              <div style="${S({ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${r.e / maxR * 100}%`, background: al(B, 0.22), borderRadius: 2 })}"></div>
              <div style="${S({ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${r.u / maxR * 100}%`, background: B, borderRadius: 2, transition: 'width .4s' })}"></div>
            </div>
          </div>
        </div>`).join('')}
      <div style="${S({ padding: '12px 0', borderTop: rows.length ? '1px solid rgba(255,255,255,0.06)' : 'none', fontSize: 12, color: '#6d6c69', textAlign: 'center' })}"><span>${rows.length ? `${idle} soner uten forbruk` : 'Ingen forbruk i perioden'}</span></div>
    </div>`;
      }

      /* ---------- HISTORIKK ---------- */
      if (s.tab === 'hist') {
        const [y, m] = s.month;
        const f1 = new Date(y, m, 1), off = (f1.getDay() + 6) % 7;
        const cal = Array.from({ length: 42 }, (_, i) => new Date(y, m, 1 - off + i));
        const selItems = SCHED[s.sel] || [];
        const selD = dt(s.sel);
        const hist14 = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); return { k: iso(d), v: HIST[iso(d)] || 0 }; });
        const sum14 = hist14.reduce((t, h) => t + h.v, 0), max14 = Math.max(1, ...hist14.map(h => h.v)), n14 = hist14.filter(h => h.v > 0.5).length;
        html += `
    <div style="background:#1c1c1f;border:1px solid rgba(255,255,255,0.05);border-radius:24px;padding:14px 14px 16px;display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <button data-on-click="prevMonth" style="width:36px;height:36px;border-radius:18px;display:grid;place-items:center"><span class="ms" style="font-size:22px">chevron_left</span></button>
        <div style="font-size:15px;font-weight:500"><span>${e(cap(f1.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' })))}</span></div>
        <button data-on-click="nextMonth" style="width:36px;height:36px;border-radius:18px;display:grid;place-items:center"><span class="ms" style="font-size:22px">chevron_right</span></button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">
        ${['M', 'T', 'O', 'T', 'F', 'L', 'S'].map(w => `<div style="text-align:center;font-size:11px;color:#6d6c69;padding:4px 0"><span>${w}</span></div>`).join('')}
        ${cal.map(d => { const k = iso(d), inM = d.getMonth() === m, w = HIST[k] > 0.5, pp = SCHED[k] && SCHED[k].length, sel = s.sel === k, td = k === TODAY;
          return `<button data-on-click="pick" data-arg="${k}" style="${S({ height: 46, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, background: sel ? '#2c2c2f' : 'transparent', boxShadow: td ? 'inset 0 0 0 1px rgba(255,255,255,0.35)' : 'none', opacity: inM ? 1 : 0.3 })}">
            <span style="${S({ width: 28, height: 28, borderRadius: 14, display: 'grid', placeItems: 'center', fontSize: 14, fontVariantNumeric: 'tabular-nums', background: w ? B : 'transparent', color: w ? '#141416' : '#f2f1ee', fontWeight: w || td ? 600 : 400 })}"><span>${d.getDate()}</span></span>
            <span style="${S({ width: 5, height: 5, borderRadius: 3, background: pp && !w ? GREEN : 'transparent' })}"></span>
          </button>`; }).join('')}
      </div>
      <div style="display:flex;gap:14px;font-size:11px;color:#8e8d89;padding:0 6px">
        <span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:4px;background:oklch(0.8 0.12 235)"></span>Vannet</span>
        <span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:4px;box-shadow:inset 0 0 0 1.5px oklch(0.8 0.12 150)"></span>Planlagt</span>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.06);padding:12px 6px 0;display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;justify-content:space-between;gap:10px">
          <div style="font-size:14px;font-weight:500"><span>${e(cap(selD.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })))}</span></div>
          <div style="font-size:13px;color:#a9a7a2;white-space:nowrap"><span>${HIST[s.sel] > 0.5 ? `${nf(HIST[s.sel])} L vannet` : selItems.length ? `Planlagt · ${nf(selItems.reduce((t, x) => t + x.liters, 0))} L` : 'Ingen vanning'}</span></div>
        </div>
        ${selItems.map(x => `<div style="display:flex;gap:12px;font-size:12px;color:#a9a7a2"><span style="width:38px;font-variant-numeric:tabular-nums"><span>${x.time}</span></span><span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(`${x.z.code ? x.z.code + ' ' : ''}${x.z.name}`)}</span></span><span style="white-space:nowrap"><span>${x.mins} min</span></span></div>`).join('')}
      </div>
    </div>
    <div style="background:#1c1c1f;border:1px solid rgba(255,255,255,0.05);border-radius:24px;padding:18px;display:flex;flex-direction:column;gap:16px">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px">
        <div style="flex:none;display:flex;flex-direction:column;gap:4px;white-space:nowrap">
          <div style="font-size:12px;color:#8e8d89">Siste 14 døgn</div>
          <div style="font-size:34px;font-weight:300;letter-spacing:-0.025em;line-height:1"><span>${nf(sum14)}</span><span style="font-size:15px;color:#8e8d89"> L</span></div>
        </div>
        <div style="flex:none;display:flex;flex-direction:column;gap:4px;text-align:right;white-space:nowrap">
          <div style="font-size:15px;font-weight:500"><span>${KR ? `${(sum14 * KR).toFixed(2).replace('.', ',')} kr` : '–'}</span></div>
          <div style="font-size:12px;color:#8e8d89"><span>${n14} av 14 døgn med vanning</span></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(14,1fr);gap:4px;height:110px;align-items:end">
        ${hist14.map((h, i) => `<div title="${h.k}: ${Math.round(h.v)} L" style="${S({ height: h.v > 0.5 ? `${h.v / max14 * 100}%` : '4px', borderRadius: 6, background: h.v > 0.5 ? B : i === 13 ? '#3a3a3d' : '#29292c' })}"></div>`).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#6d6c69"><span>${e(dm2(hist14[0].k))}</span><span>I dag</span></div>
    </div>`;
      }

      return `
<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 28px;display:flex;flex-direction:column;gap:16px">

  <header style="display:flex;align-items:center;gap:10px">
    <div style="flex:1;font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Vanning</div>
    <button title="Innstillinger" data-on-click="moreId" data-arg="${e(ki ? ki.id : '')}" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:19px">settings</span></button>
    <button title="Lukk" data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section style="display:flex;flex-direction:column;gap:10px;padding:2px 2px 0">
    <div style="${S({ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: status[1] })}"><span style="${S({ width: 8, height: 8, borderRadius: 4, background: status[1], boxShadow: `0 0 10px ${status[1]}` })}"></span><span>${e(status[0])}</span></div>
    <div style="font-size:30px;font-weight:400;letter-spacing:-0.025em;line-height:1.12;text-wrap:balance"><span>${e(headline)}</span></div>
    <div style="font-size:14px;color:#a9a7a2;text-wrap:pretty"><span>${e(subline)}</span></div>
    <div style="display:flex;flex-direction:column;gap:6px;padding-top:6px">
      <div style="display:flex;gap:3px;height:6px">
        ${ticks.map(u => `<span style="${S(u)}"></span>`).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;gap:12px;white-space:nowrap;font-size:12px;color:#8e8d89;font-variant-numeric:tabular-nums">
        <span><span>${nf(usedToday)} L brukt i dag</span></span><span><span>${nf(planned)} L planlagt</span></span>
      </div>
    </div>
  </section>

  <section style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
    ${controls.map(c => `
      <button class="kd-va-b" data-on-click="${c.go}" style="${S(c.style)}">
        <span class="ms" style="${S(c.iconStyle)}"><span>${c.icon}</span></span>
        <span style="font-size:12px;font-weight:500;white-space:nowrap"><span>${c.label}</span></span>
      </button>`).join('')}
  </section>

  ${KD.segHTML('fane', [['now', 'Nå', 'water_drop'], ['zones', 'Soner', 'sprinkler'], ['prog', 'Program', 'event_repeat'], ['use', 'Forbruk', 'bar_chart'], ['hist', 'Historikk', 'calendar_month']], s.tab, 'tab', { stack: true, style: 'position:sticky;top:8px;z-index:2;box-shadow:0 8px 20px rgba(0,0,0,0.35)' })}
  ${html}
</div>`;
    }
  }

  KD.define('kd-vanning-card', KDVanningCard, 'KD Vanning', 'Vanning med KI Vanning / OpenSprinkler (pikselkopi av Claude Design)');
  KD.sheet('vann', 'kd-vanning-card');
})();
