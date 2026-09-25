/*
 * kd-soppel-card – pikselkopi av Claude Design «Søppel».
 *
 *   type: custom:kd-soppel-card          # virker uten mer
 *   fraksjoner: [sensor.restavfall, sensor.plastemballasje, sensor.papir_og_papp, sensor.glass_og_metallemballasje]
 *   auto: true                            # ta med andre sensorer som har days_to_pickup
 *   dager_attributt: days_to_pickup       dato_attributt: raw_date
 *   intervall: 14                         # dager mellom tømminger (brukes til å framskrive datoer)
 *   intervaller: { sensor.papir_og_papp: 28 }   # per fraksjon
 *   varsel: ''                            # bryter/automasjon for «Varsle kvelden før» (tom = finnes selv)
 *   varsel_tekst: 'Påminnelse kvelden før tømming'
 *
 * Neste dato per fraksjon er ekte (raw_date / days_to_pickup). Datoene ellers i kalenderen er framskrevet
 * fra intervallet.
 */
(() => {
  const KD = window.KD; if (!KD) return;
  const PINK = 'linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20))';
  const e = KD.e, S = KD.S;
  const DAY = 864e5;
  const SLAG = [
    [/glass|metall/i, 'liquor', 'oklch(0.78 0.13 160)'],
    [/plast/i, 'recycling', 'oklch(0.72 0.12 300)'],
    [/papir|papp|kartong/i, 'newspaper', 'oklch(0.75 0.12 245)'],
    [/mat|bio|kompost/i, 'compost', 'oklch(0.8 0.12 70)'],
    [/hage|park/i, 'yard', 'oklch(0.78 0.12 135)'],
    [/farlig|spesial|el-?avfall/i, 'warning', 'oklch(0.72 0.15 25)'],
    [/rest/i, 'delete', '#a9a7a2'],
  ];
  const day0 = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const fmt = d => d.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, c => c.toUpperCase());
  const short = d => d.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' });
  const same = (x, y) => x.toDateString() === y.toDateString();

  class KDSoppelCard extends KD.KDSheet {
    static head = ['delete', 'Søppel', 'Tømmeplan'];
    static defaults = {
      fraksjoner: ['sensor.restavfall', 'sensor.plastemballasje', 'sensor.papir_og_papp', 'sensor.glass_og_metallemballasje'],
      auto: true, dager_attributt: 'days_to_pickup', dato_attributt: 'raw_date', intervall: 14, intervaller: {},
      varsel: '', varsel_tekst: 'Påminnelse kvelden før tømming',
    };
    constructor() { super(); const t = new Date(); this.state = { tab: 'list', open: null, month: [t.getFullYear(), t.getMonth()] }; }

    _ids() {
      const c = this.config, out = [];
      for (const id of (Array.isArray(c.fraksjoner) ? c.fraksjoner : [])) if (this.st(id)) out.push(id);
      if (c.auto !== false) { const S0 = this.all(); for (const id in S0) if (id.startsWith('sensor.') && !out.includes(id) && S0[id].attributes && S0[id].attributes[c.dager_attributt] != null) out.push(id); }
      return out;
    }
    _fractions() {
      const c = this.config, today = day0(new Date());
      return this._ids().map(id => {
        const st = this.st(id), at = st.attributes || {};
        let next = null;
        const raw = at[c.dato_attributt];
        if (raw) { const d = new Date(String(raw).length === 10 ? raw + 'T00:00' : raw); if (!isNaN(d)) next = day0(d); }
        if (!next) { let dd = at[c.dager_attributt]; if (dd == null || dd === '') dd = parseFloat(st.state); dd = parseFloat(dd); if (!isNaN(dd)) next = new Date(today.getTime() + Math.round(dd) * DAY); }
        if (!next || next < today || next - today > 730 * DAY) return null;
        const name = at.friendly_name || id.slice(7).replace(/_/g, ' ');
        const sl = SLAG.find(s => s[0].test(name + ' ' + id)) || [null, 'delete', '#a9a7a2'];
        const step = Number((c.intervaller || {})[id]) || Number(at.interval_days || at.intervall) || Number(c.intervall) || 14;
        return { id, name, icon: sl[1], col: sl[2], next, step };
      }).filter(Boolean);
    }
    _dates(f) { return Array.from({ length: 16 }, (_, i) => new Date(f.next.getTime() + (i - 4) * f.step * DAY)).map(day0); }
    _varsel() {
      const c = this.config;
      if (c.varsel) return this.st(c.varsel) ? c.varsel : null;
      return this.find(/^(switch|input_boolean|automation)\..*(soppel|søppel|avfall|tomming|tømming|renovasjon)/)[0] || null;
    }

    goTab(ev, k) { this.setState({ tab: k }); }
    toggleOpen(ev, k) { this.setState({ open: this.state.open === k ? null : k }); }
    toggleNotify() { const id = this._varsel(); if (id) this.toggle(id); }
    prev() { const [y, m] = this.state.month; this.setState({ month: m ? [y, m - 1] : [y - 1, 11] }); }
    next() { const [y, m] = this.state.month; this.setState({ month: m < 11 ? [y, m + 1] : [y + 1, 0] }); }

    body() {
      const s = this.state, TODAY = day0(new Date());
      const F = this._fractions();
      const diff = d => Math.round((d - TODAY) / DAY);
      const all = F.slice().sort((x, y) => x.next - y.next);
      const first = all[0], n = first ? diff(first.next) : null;
      const [y, m] = s.month, off = (new Date(y, m, 1).getDay() + 6) % 7;
      const vId = this._varsel(), notify = vId ? this.isOn(vId) : false;
      const hero = first ? { icon: first.icon, names: first.name, days: n === 0 ? 'I dag' : n, unit: n === 0 ? '' : n === 1 ? 'dag' : 'dager', date: fmt(first.next) } : { icon: 'delete', names: 'Ingen tømming funnet', days: '–', unit: '', date: '' };
      const heroIcon = { fontSize: 22, color: '#e9e8e4' };
      const heroBar = { position: 'absolute', left: 0, top: 0, bottom: 0, width: `${first ? Math.max(6, 100 - n / first.step * 100) : 0}%`, background: PINK };
      const tabs = [['list', 'Fraksjoner', 'format_list_bulleted'], ['cal', 'Kalender', 'calendar_month']].map(([k, label, icon]) => ({ k, label, icon,
        style: { height: 52, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15, fontWeight: 500, background: s.tab === k ? PINK : 'transparent', color: s.tab === k ? '#2a1720' : '#a9a7a2', boxShadow: s.tab === k ? '0 6px 18px rgba(0,0,0,0.3)' : 'none', transition: 'background .25s' } }));
      const fractions = all.filter(f => f !== first).map(f => { const d = diff(f.next), open = s.open === f.id; return {
        id: f.id, name: f.name, icon: f.icon, date: fmt(f.next), days: d === 0 ? 'I dag' : d, unit: d === 0 ? '' : d === 1 ? 'dag' : 'dager', open,
        every: `${f.step % 7 === 0 ? `Hver ${f.step / 7}. uke` : `Hver ${f.step}. dag`} · ${f.next.toLocaleDateString('nb-NO', { weekday: 'long' })}`,
        upcoming: this._dates(f).filter(x => x >= TODAY).slice(0, 4).map(short),
        card: { display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 18px 14px 14px', borderRadius: 24, background: '#1c1c1f', width: '100%', boxShadow: open ? 'inset 0 0 0 1px rgba(255,255,255,0.08)' : 'none' },
        iconWrap: { width: 52, height: 52, borderRadius: 26, flex: 'none', display: 'grid', placeItems: 'center', background: '#2a2a2d', color: f.col } }; });
      const notifyTrack = { position: 'relative', width: 46, height: 28, borderRadius: 14, flex: 'none', background: notify ? 'oklch(0.78 0.13 350)' : '#3a3a3d', transition: 'background .2s' };
      const notifyKnob = { position: 'absolute', top: 3, left: notify ? 21 : 3, width: 22, height: 22, borderRadius: 11, background: '#f4f3ef', transition: 'left .2s' };
      const monthLabel = new Date(y, m, 1).toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase());
      const DL = F.map(f => ({ f, d: this._dates(f) }));
      const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(y, m, 1 - off + i), inM = d.getMonth() === m, hits = inM ? DL.filter(x => x.d.some(z => same(z, d))).map(x => x.f) : [], t = same(d, TODAY);
        return { n: d.getDate(), dots: hits.map(f => ({ width: 6, height: 6, borderRadius: 3, background: f.col })),
          style: { aspectRatio: '1', borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: hits.length ? '#262629' : 'transparent', boxShadow: t ? 'inset 0 0 0 1.5px #f2f1ee' : 'none', opacity: inM ? 1 : 0.25 },
          num: { fontSize: 13, fontWeight: t ? 600 : 500, fontVariantNumeric: 'tabular-nums' } }; });
      const legend = F.map(f => ({ name: f.name.split(' ')[0], dot: { width: 8, height: 8, borderRadius: 4, background: f.col } }));
      return `<div style="box-sizing:border-box;width:100%;max-width:420px;min-height:100vh;margin:0 auto;background:#141416;padding:20px 18px 40px;display:flex;flex-direction:column;gap:16px">
  <header style="display:flex;align-items:center;gap:12px">
    <span style="width:40px;height:40px;border-radius:20px;background:#e9e8e4;color:#141416;display:grid;place-items:center;flex:none"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">delete</span></span>
    <div style="flex:1;font-size:26px;font-weight:500;letter-spacing:-0.02em">Søppel</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section style="position:relative;overflow:hidden;display:flex;gap:14px;padding:18px;border-radius:26px;background:#1c1c1f;min-height:170px">
    <span style="width:44px;height:44px;border-radius:22px;background:#2a2a2d;display:grid;place-items:center;flex:none"><span class="ms" style="${S(heroIcon)}">${e(hero.icon)}</span></span>
    <div style="display:flex;flex-direction:column;gap:4px;position:relative;z-index:1">
      <span style="font-size:12px;color:#8e8d89">Neste tømming</span>
      <span style="font-size:16px;font-weight:600"><span>${e(hero.names)}</span></span>
      <span style="font-size:44px;font-weight:500;letter-spacing:-0.03em;line-height:1.05;font-variant-numeric:tabular-nums"><span>${e(hero.days)}</span><span style="font-size:16px;color:#8e8d89;font-weight:400;letter-spacing:0"> <span>${e(hero.unit)}</span></span></span>
      <span style="font-size:13px;color:#8e8d89"><span>${e(hero.date)}</span></span>
    </div>
    <span class="ms" style="position:absolute;right:-6px;bottom:-18px;font-size:130px;color:#262629;font-variation-settings:'FILL' 1">delete</span>
    <span style="position:absolute;left:0;right:0;bottom:0;height:4px;background:#2a2a2d"><span style="${S(heroBar)}"></span></span>
  </section>

  <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:2px;padding:4px;border-radius:22px;background:#1c1c1f">
    ${tabs.map(t => `<button data-on-click="goTab" data-arg="${t.k}" style="${S(t.style)}"><span class="ms" style="font-size:20px">${e(t.icon)}</span><span>${e(t.label)}</span></button>`).join('')}
  </div>

  ${s.tab === 'list' ? `<section style="display:flex;flex-direction:column;gap:8px">
      ${fractions.map(f => `<button data-on-click="toggleOpen" data-arg="${e(f.id)}" data-key="${e(f.id)}" style="${S(f.card)}">
          <span style="display:flex;align-items:center;gap:14px;width:100%">
            <span style="${S(f.iconWrap)}"><span class="ms" style="font-size:24px;font-variation-settings:'FILL' 1">${e(f.icon)}</span></span>
            <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;text-align:left">
              <span style="font-size:15px;font-weight:500"><span>${e(f.name)}</span></span>
              <span style="font-size:13px;color:#8e8d89"><span>${e(f.date)}</span></span>
            </span>
            <span style="font-size:24px;font-weight:500;font-variant-numeric:tabular-nums"><span>${e(f.days)}</span><span style="font-size:12px;color:#8e8d89;font-weight:400"> <span>${e(f.unit)}</span></span></span>
          </span>
          ${f.open ? `<span style="display:flex;flex-direction:column;gap:10px;width:100%;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);text-align:left">
              <span style="font-size:12px;color:#8e8d89"><span>${e(f.every)}</span></span>
              <span style="display:flex;gap:6px;flex-wrap:wrap">
                ${f.upcoming.map(u => `<span style="height:28px;padding:0 10px;border-radius:14px;background:#232326;display:flex;align-items:center;font-size:12px;white-space:nowrap"><span>${e(u)}</span></span>`).join('')}
              </span>
            </span>` : ''}
        </button>`).join('')}
    </section>
    ${vId ? `<button data-on-click="toggleNotify" style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:22px;background:#1c1c1f;text-align:left">
      <span class="ms" style="font-size:22px;color:#8e8d89">notifications</span>
      <span style="flex:1;display:flex;flex-direction:column;gap:2px"><span style="font-size:14px;font-weight:500">Varsle kvelden før</span><span style="font-size:12px;color:#8e8d89">${e(this.config.varsel_tekst)}</span></span>
      <span style="${S(notifyTrack)}"><span style="${S(notifyKnob)}"></span></span>
    </button>` : ''}` : ''}

  ${s.tab === 'cal' ? `<section style="display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:24px;background:#1c1c1f">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <button data-on-click="prev" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:22px">chevron_left</span></button>
        <span style="font-size:15px;font-weight:500"><span>${e(monthLabel)}</span></span>
        <button data-on-click="next" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:22px">chevron_right</span></button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
        ${['M', 'T', 'O', 'T', 'F', 'L', 'S'].map(w => `<div style="text-align:center;font-size:11px;color:#6d6c69;padding-bottom:4px"><span>${w}</span></div>`).join('')}
        ${cells.map(c => `<div style="${S(c.style)}">
            <span style="${S(c.num)}"><span>${c.n}</span></span>
            <span style="display:flex;gap:3px;height:6px">${c.dots.map(d => `<span style="${S(d)}"></span>`).join('')}</span>
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;padding-top:4px">
        ${legend.map(l => `<span style="display:flex;align-items:center;gap:6px;font-size:12px;color:#a9a7a2"><span style="${S(l.dot)}"></span><span>${e(l.name)}</span></span>`).join('')}
      </div>
    </section>` : ''}
</div>`;
    }
  }

  KD.define('kd-soppel-card', KDSoppelCard, 'KD Søppel', 'Tømmeplan for avfallsfraksjonene – pikselkopi av Claude Design «Søppel»');
  KD.sheet('trash', 'kd-soppel-card');
})();
