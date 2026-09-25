/*
 * kd-sovn-card — «Søvn» fra Claude Design, som Home Assistant-kort.
 *
 * type: custom:kd-sovn-card          # virker uten konfig
 * personer:                          # standard: brukerens tre personer (under). Personer fra ki_sovn legges til automatisk.
 *   - { navn: Sebastian, sover: binary_sensor.sebastian_sovn_sover, bryter: switch.homey_logic_sebastian_sovn_vaken }
 * vekking: []                        # prefikser for vekkealarmer (f.eks. soverom_vekking). Tom = finn alle fra ki_sovn / *_vekking_neste_alarm
 * nattmodus: switch.nattmodus        # ki_nattmodus – brukes i teksten for den som sover
 * timer: 24                          # lengden på tidslinjen «Siste 24 timer»
 *
 * Søvn: binary_sensor.<navn>_sovn_sover (ki_sovn, attr obs_vindu_åpent, siden, prefix, bryter). Bryteren i raden trykker
 * button.<prefix>_sett_sover / _sett_vaken når de finnes, ellers veksles Homey-bryteren (on = sover).
 * Vekking: sensor.<p>_neste_alarm, switch.<p>_aktiv, switch.<p>_<dag>_aktiv, time.<p>_<dag>, number.<p>_fade_opp.
 */
(() => {
  const KD = window.KD;
  const { S, e } = KD;
  const MOON = 'oklch(0.72 0.1 275)', SUN = 'oklch(0.82 0.12 75)';
  const a = KD.a, PINK = KD.PINK;
  const pad = n => String(n).padStart(2, '0');
  const hm = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
  const DAYS = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];
  const DKEY = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lordag', 'sondag'];
  const toMin = (v) => { const m = String(v || '').match(/^(\d{1,2}):(\d{2})/); return m ? (+m[1]) * 60 + (+m[2]) : null; };

  const DEFAULT_PERSONS = [
    { navn: 'Cybele', sover: 'binary_sensor.cybele_sovn_sover', bryter: 'switch.homey_logic_cybele_sovn_vaken' },
    { navn: 'Rune', sover: 'binary_sensor.rune_sovn_sover', bryter: 'switch.homey_logic_rune_sovn_vaken' },
    { navn: 'Sebastian', sover: 'binary_sensor.sebastian_sovn_sover', bryter: 'switch.homey_logic_sebastian_sovn_vaken' },
  ];

  class KDSovnCard extends KD.KDSheet {
    static head = ['bedtime', 'Søvn', 'Søvn og vekking'];
    static defaults = { personer: DEFAULT_PERSONS, vekking: [], nattmodus: 'switch.nattmodus', timer: 24 };
    static sheetCss = `.kd-sv-row{transition:background .15s}.kd-sv-row:active{background:rgba(255,255,255,0.03)}`;

    constructor() { super(); this.state = { tab: 'sleep' }; }
    onConnect() { super.onConnect(); clearInterval(this._tick); this._tick = setInterval(() => this._queue(), 60e3); }
    onDisconnect() { super.onDisconnect(); clearInterval(this._tick); }

    /* ---------- personer ---------- */
    people() {
      const cfg = this.config, S0 = this.all();
      const list = (Array.isArray(cfg.personer) ? cfg.personer : DEFAULT_PERSONS).map(p => typeof p === 'string' ? { sover: p } : { ...p });
      const found = Object.keys(S0).filter(id => id.startsWith('binary_sensor.') && S0[id].attributes.integrasjon === 'ki_sovn' && S0[id].attributes.type === 'person');
      if (!found.length) found.push(...Object.keys(S0).filter(id => /^binary_sensor\..+_sovn_sover$/.test(id)));
      for (const id of found) {
        if (list.some(p => p.sover === id)) continue;
        const at = S0[id].attributes, nm = String(at.navn || '').toLowerCase();
        const m = list.find(p => !this.st(p.sover) && ((nm && String(p.navn || '').toLowerCase() === nm) || (p.bryter && p.bryter === at.bryter)));
        if (m) m.sover = id; else list.push({ sover: id });
      }
      return list.map(p => {
        const st = this.st(p.sover), at = st ? st.attributes : {};
        const bryter = p.bryter || at.bryter || null;
        const prefix = at.prefix || (p.sover ? p.sover.replace(/^binary_sensor\./, '').replace(/_sover$/, '') : '');
        const src = st ? p.sover : bryter;
        return { name: p.navn || at.navn || (p.sover ? this.fname(p.sover).replace(/ (søvn )?sover$/i, '') : ''), sover: p.sover, bryter, prefix, src,
          asleep: src ? this.v(src) === 'on' : false, window: at['obs_vindu_åpent'] === true, siden: at.siden, exists: !!src && !!this.st(src) };
      }).filter(p => p.exists);
    }

    /* Søvnperioder fra historikken: { id: [[startMs, sluttMs], …] } */
    periods(ids, hours) {
      const key = 'kd-sovn-' + ids.join(',') + '-' + hours;
      const h = this.cached(key, 5 * 60e3, () => this.history(ids, hours + 12), {});
      const out = {};
      for (const id of ids) {
        const pts = (h[id] || []).slice().sort((x, y) => x.t - y.t); const segs = []; let on = null;
        for (const p of pts) { if (p.v === 'on' && on === null) on = +p.t; else if (p.v !== 'on' && on !== null) { segs.push([on, +p.t]); on = null; } }
        if (on !== null) segs.push([on, Date.now()]);
        out[id] = segs;
      }
      return out;
    }

    toggleP(ev, i) {
      const p = this.people()[+i]; if (!p) return;
      const btn = `button.${p.prefix}_${p.asleep ? 'sett_vaken' : 'sett_sover'}`;
      if (p.prefix && this.st(btn)) return this.press(btn);
      if (p.bryter && this.st(p.bryter)) return this.call('switch', p.asleep ? 'turn_off' : 'turn_on', { entity_id: p.bryter });
      this.more(p.sover);
    }

    /* ---------- vekking ---------- */
    alarms(people) {
      const cfg = this.config, S0 = this.all();
      let pre = Array.isArray(cfg.vekking) && cfg.vekking.length ? cfg.vekking.slice() : [];
      if (!pre.length) {
        pre = Object.keys(S0).filter(id => id.startsWith('sensor.') && S0[id].attributes.integrasjon === 'ki_sovn' && S0[id].attributes.type === 'vekking').map(id => S0[id].attributes.prefix).filter(Boolean);
        for (const id of Object.keys(S0)) { const m = id.match(/^sensor\.(.+_vekking)_neste_alarm$/); if (m && !pre.includes(m[1])) pre.push(m[1]); }
      }
      return pre.map(p => {
        const n = this.st(`sensor.${p}_neste_alarm`), at = (n && n.attributes) || {};
        const person = at.person ? people.find(x => x.sover === at.person || x.bryter === at.person) : null;
        const on = this.v(`switch.${p}_aktiv`) === 'on';
        const days = DKEY.map(d => this.v(`switch.${p}_${d}_aktiv`) === 'on' ? 1 : 0);
        const times = DKEY.map(d => toMin(this.v(`time.${p}_${d}`)));
        let shown = toMin(n && n.state);
        if (shown == null) { const k = days.findIndex(x => x); shown = times[k >= 0 ? k : 0]; }
        const lys = Array.isArray(at.lys) ? at.lys : [];
        const fade = this.n(`number.${p}_fade_opp`);
        const when = at.neste_tidspunkt ? new Date(at.neste_tidspunkt) : null;
        return { p, name: person ? person.name : (at.navn || this.fname(`sensor.${p}_neste_alarm`).replace(/ neste alarm$/i, '') || p), on, days, times, shown,
          light: lys.length > 0, fade, stateMin: toMin(n && n.state), lys, when: when && !isNaN(when) && on && n && n.state !== 'Av' ? when : null, running: this.v(`binary_sensor.${p}_kjorer`) === 'on', skip: at.hopper_over };
      }).filter(w => this.st(`switch.${w.p}_aktiv`) || this.st(`sensor.${w.p}_neste_alarm`));
    }
    shift(ev, arg) {
      const [i, d] = String(arg).split('|'); const w = this.alarms(this.people())[+i]; if (!w || w.shown == null) return;
      const nv = (w.shown + (+d) + 1440) % 1440;
      // flytt alle aktive dager som har samme tid som den som vises (typisk samme vekketid hver ukedag)
      let ks = DKEY.map((_, k) => k).filter(k => w.days[k] && w.times[k] === w.shown);
      if (!ks.length) ks = DKEY.map((_, k) => k).filter(k => w.times[k] === w.shown);
      for (const k of ks) { const id = `time.${w.p}_${DKEY[k]}`; if (this.st(id)) this.call('time', 'set_value', { entity_id: id, time: `${hm(nv)}:00` }); }
    }
    alarmToggle(ev, p) { const id = `switch.${p}_aktiv`; if (this.st(id)) this.toggle(id); }
    dayToggle(ev, arg) { const [p, k] = String(arg).split('|'); const id = `switch.${p}_${DKEY[+k]}_aktiv`; if (this.st(id)) this.toggle(id); }
    tab(ev, k) { this.setState({ tab: k }); }

    body() {
      const s = this.state, cfg = this.config;
      const people = this.people(), n = people.length, asleep = people.filter(p => p.asleep).length;
      const alarms = this.alarms(people);
      const sw = on => ({ track: { position: 'relative', width: 46, height: 28, borderRadius: 14, flex: 'none', background: on ? MOON : '#3a3a3d', transition: 'background .2s' }, knob: { position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: 11, background: '#f4f3ef', transition: 'left .2s' } });
      const nextW = alarms.filter(w => w.when).sort((x, y) => x.when - y.when)[0];
      let nextAlarm = 'Ingen vekking satt';
      if (nextW) { const until = Math.max(0, Math.round((nextW.when - Date.now()) / 60e3)); nextAlarm = `Neste vekking ${hm(nextW.stateMin != null ? nextW.stateMin : nextW.when.getHours() * 60 + nextW.when.getMinutes())} · om ${Math.floor(until / 60)} t ${until % 60} min`; }
      const seg = n ? 360 / n : 120;
      const ring = people.map((p, i) => ({ position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(from ${i * seg + 4}deg, ${p.asleep ? MOON : '#2a2a2d'} 0 ${seg - 8}deg, transparent ${seg - 8}deg)`, WebkitMask: 'radial-gradient(circle, transparent 84px, #000 85px)', mask: 'radial-gradient(circle, transparent 84px, #000 85px)', transition: 'background .4s' }));
      const coreIcon = { fontSize: 28, color: asleep ? MOON : SUN, fontVariationSettings: "'FILL' 1" };
      const headline = !n ? 'Ingen personer' : asleep === 0 ? 'Alle er våkne' : asleep === n ? 'Alle sover' : `${people.filter(p => p.asleep).map(p => p.name).join(' og ')} sover`;
      const tabs = [['sleep', 'Søvn'], ['wake', 'Vekking']].map(([k, label]) => ({ k, label, style: { height: 40, borderRadius: 16, fontSize: 13, fontWeight: 500, background: s.tab === k ? PINK : 'transparent', color: s.tab === k ? '#2a1720' : '#a9a7a2' } }));

      // tidslinje: 24 t som slutter ved neste hele time
      const hours = Number(cfg.timer) || 24;
      const end = new Date(); end.setMinutes(0, 0, 0); if (end < Date.now()) end.setHours(end.getHours() + 1);
      const t1 = +end, t0 = t1 - hours * 3600e3;
      const per = s.tab === 'sleep' ? this.periods(people.map(p => p.src), hours) : {};
      const night = pr => { const segs = (per[pr.src] || []).filter(([x, y]) => y > t0 - 12 * 3600e3); return segs.length ? Math.max(...segs.map(([x, y]) => y - x)) / 3600e3 : null; };
      const natt = cfg.nattmodus && this.v(cfg.nattmodus) === 'on';

      const peopleHtml = people.map((p, i) => {
        const w = sw(p.asleep), dur = night(p);
        const sub = p.asleep ? `Sover · ${natt ? 'lys dimmet, varsler av' : p.siden ? 'siden ' + KD.hm(p.siden) : 'god natt'}` : dur != null ? `Våken · sov ${Math.floor(dur)} t ${Math.round((dur % 1) * 60)} min i natt` : 'Våken';
        const chip = { display: p.window ? 'inline-flex' : 'none', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 7, background: a('oklch(0.8 0.12 250)', 0.18), color: 'oklch(0.8 0.12 250)' };
        const row = { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px', width: '100%', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' };
        const iconWrap = { width: 42, height: 42, borderRadius: 21, flex: 'none', display: 'grid', placeItems: 'center', background: a(p.asleep ? MOON : SUN, 0.18), color: p.asleep ? MOON : SUN, transition: 'background .3s' };
        return `
        <button class="kd-sv-row" data-on-click="toggleP" data-arg="${i}" style="${S(row)}">
          <span style="${S(iconWrap)}"><span class="ms" style="font-size:20px;font-variation-settings:'FILL' 1"><span>${p.asleep ? 'bedtime' : 'light_mode'}</span></span></span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;text-align:left">
            <span style="font-size:15px;font-weight:500;display:flex;align-items:center;gap:6px"><span>${e(p.name)}</span><span style="${S(chip)}"><span>${p.window ? 'Vindu åpent' : ''}</span></span></span>
            <span style="font-size:12px;color:#8e8d89"><span>${e(sub)}</span></span>
          </div>
          <span style="${S(w.track)}"><span style="${S(w.knob)}"></span></span>
        </button>`;
      }).join('');
      const timeline = people.map(p => {
        const segs = (per[p.src] || []).filter(([x, y]) => y > t0 && x < t1).map(([x, y]) => {
          const st = Math.max(x, t0), en = Math.min(y, t1);
          return { position: 'absolute', top: 0, bottom: 0, left: `${(st - t0) / (t1 - t0) * 100}%`, width: `${(en - st) / (t1 - t0) * 100}%`, borderRadius: 8, background: MOON };
        });
        return `
        <div style="display:flex;align-items:center;gap:10px">
          <span style="width:70px;font-size:12px;color:#a9a7a2"><span>${e(p.name)}</span></span>
          <div style="position:relative;flex:1;height:16px;border-radius:8px;background:#1f1f22;overflow:hidden">
            ${segs.map(g => `<span style="${S(g)}"></span>`).join('')}
          </div>
        </div>`;
      }).join('');
      const labels = [0, 1, 2, 3, 4].map(k => pad(new Date(t0 + k * hours / 4 * 3600e3).getHours()));

      const alarmHtml = alarms.map((w, i) => {
        const t = sw(w.on);
        const card = { display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 24, background: '#1c1c1f', opacity: w.on ? 1 : 0.55, transition: 'opacity .2s' };
        const sub = w.running ? 'Vekker nå · lyset fader opp' : w.light ? `Soloppgang-lys ${w.fade != null ? w.fade : '–'} min før · ${w.lys.length} lys` : 'Uten lys';
        return `
        <div style="${S(card)}">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="flex:1;display:flex;flex-direction:column;gap:2px">
              <span style="font-size:13px;color:#8e8d89"><span>${e(w.name)}</span></span>
              <div style="display:flex;align-items:center;gap:6px">
                <button data-on-click="shift" data-arg="${i}|-15" style="width:32px;height:32px;border-radius:16px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:18px">remove</span></button>
                <span style="font-size:34px;font-weight:300;letter-spacing:-0.03em;font-variant-numeric:tabular-nums;min-width:96px;text-align:center"><span>${w.shown != null ? hm(w.shown) : '–'}</span></span>
                <button data-on-click="shift" data-arg="${i}|15" style="width:32px;height:32px;border-radius:16px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:18px">add</span></button>
              </div>
            </div>
            <button data-on-click="alarmToggle" data-arg="${e(w.p)}" style="${S(t.track)}"><span style="${S(t.knob)}"></span></button>
          </div>
          <div style="display:flex;gap:4px">
            ${DAYS.map((l, k) => `<button data-on-click="dayToggle" data-arg="${e(w.p)}|${k}" style="${S({ flex: 1, height: 32, borderRadius: 16, fontSize: 12, fontWeight: 600, background: w.days[k] ? a(MOON, 0.9) : '#232326', color: w.days[k] ? '#141416' : '#8e8d89' })}"><span>${l}</span></button>`).join('')}
          </div>
          <span style="font-size:12px;color:#8e8d89"><span>${e(sub)}</span></span>
        </div>`;
      }).join('');

      return `
<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,560px);min-height:100vh;margin:0 auto;background:#141416;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:22px">
  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Søvn</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section style="display:flex;flex-direction:column;align-items:center;gap:18px">
    <div style="position:relative;width:200px;height:200px">
      ${ring.map(r => `<div style="${S(r)}"></div>`).join('')}
      <div style="position:absolute;inset:26px;border-radius:50%;background:#1c1c1f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">
        <span class="ms" style="${S(coreIcon)}"><span>${asleep ? 'bedtime' : 'light_mode'}</span></span>
        <div style="font-size:30px;font-weight:500;letter-spacing:-0.03em;font-variant-numeric:tabular-nums"><span>${asleep}</span><span style="font-size:15px;color:#8e8d89;font-weight:400"> / <span>${n}</span></span></div>
        <div style="font-size:12px;color:#8e8d89">sover</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
      <div style="font-size:24px;font-weight:500;letter-spacing:-0.015em"><span>${e(headline)}</span></div>
      <div style="font-size:14px;color:#8e8d89"><span>${e(nextAlarm)}</span></div>
    </div>
  </section>

  <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:2px;padding:4px;border-radius:20px;background:#1c1c1f">
    ${tabs.map(t => `<button data-on-click="tab" data-arg="${t.k}" style="${S(t.style)}"><span>${t.label}</span></button>`).join('')}
  </div>

  ${s.tab === 'sleep' ? `
    <section style="display:flex;flex-direction:column">
      ${peopleHtml || `<div style="padding:12px 4px;font-size:13px;color:#8e8d89">Fant ingen personer fra KI Søvn &amp; Vekking.</div>`}
    </section>
    <section style="display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;justify-content:space-between;padding:0 4px">
        <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Siste ${hours} timer</div>
        <div style="font-size:12px;color:#6d6c69">hvem sov når</div>
      </div>
      ${timeline}
      <div style="display:flex;justify-content:space-between;padding-left:80px;font-size:10px;color:#6d6c69;font-variant-numeric:tabular-nums">${labels.map(l => `<span>${l}</span>`).join('')}</div>
    </section>` : ''}

  ${s.tab === 'wake' ? `
    <section style="display:flex;flex-direction:column;gap:8px">
      ${alarmHtml || `<div style="padding:16px;border-radius:24px;background:#1c1c1f;font-size:13px;color:#8e8d89">Fant ingen vekkealarm fra KI Søvn &amp; Vekking.</div>`}
    </section>` : ''}
</div>`;
    }
  }

  KD.define('kd-sovn-card', KDSovnCard, 'KD Søvn', 'Søvn og vekking fra KI Søvn & Vekking (pikselkopi av Claude Design)');
  KD.sheet('sleep', 'kd-sovn-card');
})();
