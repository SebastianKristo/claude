/*
 * kd-planter-card — «Planter» fra Claude Design, som Home Assistant-kort.
 *
 * type: custom:kd-planter-card      # virker uten konfig: finner alle planter fra ki_planter selv
 * sted: Sebastians soverom          # valgfritt: bare planter fra dette stedet (delstreng, uten store/små bokstaver)
 * fukt_spenn: 25                    # målområdet for jordfukt er [fuktighet_min, fuktighet_min + fukt_spenn] %
 * planter:                          # valgfritt per plante (nøkkel = plante_id eller entitetsprefiks, f.eks. arekapalme)
 *   arekapalme: { navn: Arekapalme, fukt: sensor.x, fukt_maks: 60, lys: sensor.x_illuminance, temp: sensor.x_temperature, naering: sensor.x_conductivity }
 *
 * Data (ki_planter): binary_sensor.<plante>_trenger_vann (integrasjon: ki_planter, type: plante) med attributtene
 * navn, latin, intervall_dager, sist_vannet, dager_siden, dager_igjen, fuktighet, fuktighet_min, fuktighet_sensor,
 * sesong, daglengde_timer. «Merk som vannet» trykker button.<plante>_vannet_na.
 * Lys/temperatur/næring (Avansert) finnes automatisk som søsken-sensorer av fuktsensoren
 * (…_moisture → …_illuminance / …_temperature / …_conductivity).
 */
(() => {
  const KD = window.KD;
  const { S, e } = KD;
  const GREEN = 'oklch(0.8 0.12 150)', AMBER = 'oklch(0.82 0.12 75)', BLUE = 'oklch(0.8 0.12 250)';
  const a = KD.a, PINK = KD.PINK;
  const SESONG = { vekst: 'Vekstsesong', vinter: 'Vinterhvile', 'høysommer': 'Høysommer', hoysommer: 'Høysommer', sommer: 'Sommer' };
  const FUKT_RE = /_(soil_moisture|moisture|jordfuktighet|fuktighet|fukt)$/;

  class KDPlanterCard extends KD.KDSheet {
    static head = ['potted_plant', 'Planter', 'Jordfukt og vanning'];
    static defaults = { sted: '', fukt_spenn: 25, planter: {} };
    static sheetCss = `.kd-pl-btn{transition:transform .12s}.kd-pl-btn:active{transform:scale(0.97)}`;

    constructor() { super(); this.state = { tab: 'enkel' }; }

    /* Søsken-sensor av fuktsensoren (samme enhet), f.eks. sensor.arekapalme_moisture → sensor.arekapalme_temperature */
    sibling(moist, suffixes) {
      if (!moist) return null;
      const base = moist.replace(FUKT_RE, '');
      if (base === moist) return null;
      for (const s of suffixes) { const id = `${base}_${s}`; if (this.st(id)) return id; }
      return null;
    }

    plants() {
      const cfg = this.config;
      const S0 = this.all();
      let ids = Object.keys(S0).filter(id => id.startsWith('binary_sensor.') && S0[id].attributes && S0[id].attributes.integrasjon === 'ki_planter' && S0[id].attributes.type === 'plante');
      if (!ids.length) ids = Object.keys(S0).filter(id => /^binary_sensor\..+_trenger_vann$/.test(id) && S0[id].attributes && S0[id].attributes.navn);
      if (cfg.sted) { const q = String(cfg.sted).toLowerCase(); ids = ids.filter(id => String(S0[id].attributes.sted || '').toLowerCase().includes(q)); }
      const over = cfg.planter || {};
      return ids.map(id => {
        const st = this.st(id), at = st.attributes, b = id.replace(/^binary_sensor\./, '').replace(/_trenger_vann$/, '');
        const o = over[at.plante_id] || over[b] || {};
        const moistId = o.fukt || at.fuktighet_sensor || null;
        const moistV = moistId && this.ok(moistId) ? this.n(moistId) : (at.fuktighet != null ? Number(at.fuktighet) : null);
        const lo = at.fuktighet_min != null ? Number(at.fuktighet_min) : null;
        const hi = o.fukt_maks != null ? Number(o.fukt_maks) : lo != null ? Math.min(100, lo + Number(cfg.fukt_spenn || 25)) : null;
        const every = Number(at.intervall_dager) || null;
        let days = at.dager_siden != null ? Number(at.dager_siden) : null;
        if (days == null && at.sist_vannet) days = Math.floor((Date.now() - new Date(at.sist_vannet)) / 864e5);
        const left = at.dager_igjen != null ? Number(at.dager_igjen) : (every != null && days != null ? every - days : null);
        const lux = o.lys || this.sibling(moistId, ['illuminance', 'lux', 'light', 'lysstyrke', 'belysningsstyrke']);
        const temp = o.temp || this.sibling(moistId, ['temperature', 'temperatur']);
        const ec = o.naering || this.sibling(moistId, ['conductivity', 'fertility', 'ledningsevne', 'naering']);
        return { id, b, name: o.navn || at.navn || this.fname(id), latin: at.latin || '', moist: moistV, hasMoist: moistV != null, lo, hi, every, days, left,
          pct: at.prosent != null ? Number(at.prosent) : null, on: st.state === 'on', water: `button.${b}_vannet_na`, lux, temp, ec,
          sesong: at.sesong, dagl: at.daglengde_timer };
      });
    }

    metric(id, kind) {
      if (!id || !this.ok(id)) return '–';
      const v = this.n(id);
      if (v == null) return this.v(id);
      if (kind === 'lux') return `${Math.round(v).toLocaleString('nb-NO')} lx`;
      if (kind === 'temp') return `${KD.nf(v, 1)}°`;
      return `${Math.round(v).toLocaleString('nb-NO')} µS`;
    }

    water(ev, id) { if (id && this.st(id)) this.press(id); else this.toast('Fant ikke ' + id); }
    tab(ev, k) { this.setState({ tab: k }); }

    body() {
      const s = this.state;
      const ps = this.plants();
      const info = p => ({ left: p.left, dry: p.hasMoist && p.lo != null && p.moist < p.lo, wet: p.hasMoist && p.hi != null && p.moist > p.hi });
      const all = ps.map(info);
      const needOf = (p, f) => p.on || f.dry;
      const dry = ps.filter((p, i) => needOf(p, all[i])).length;
      const lefts = ps.map((p, i) => needOf(p, all[i]) ? 0 : p.left).filter(x => x != null);
      const next = lefts.length ? Math.min(...lefts) : null;
      const col = dry ? AMBER : GREEN;
      const status = !ps.length ? 'Ingen planter' : dry ? `${dry} trenger vann` : 'Alt i orden';
      const statusStyle = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#c9c7c2' };
      const statusDot = { width: 8, height: 8, borderRadius: 4, background: col, boxShadow: `0 0 10px ${col}` };
      const headline = !ps.length ? 'Fant ingen planter' : next == null ? 'Ikke vannet ennå' : next <= 0 ? 'Vann i dag' : next === 1 ? 'Neste vanning i morgen' : `Neste vanning om ${next} dager`;
      const p0 = ps[0] || {};
      const sub = [p0.sesong ? (SESONG[p0.sesong] || String(p0.sesong).charAt(0).toUpperCase() + String(p0.sesong).slice(1)) : '', p0.dagl != null ? `${KD.nf(p0.dagl, 1)} t dagslys` : '', `${ps.length} planter`].filter(Boolean).join(' · ');
      const subHtml = e(sub.replace(/\d+ planter$/, '')) + (ps.length != null ? `<span>${ps.length}</span> planter` : '');
      const tabs = [['enkel', 'Enkel'], ['avansert', 'Avansert']].map(([k, label]) => ({ k, label, style: { height: 40, borderRadius: 16, fontSize: 13, fontWeight: 500, background: s.tab === k ? PINK : 'transparent', color: s.tab === k ? '#2a1720' : '#a9a7a2' } }));
      const cards = ps.map((p, i) => {
        const f = all[i], need = needOf(p, f);
        const due = need ? 'Trenger vann' : f.wet ? `Fuktig ${Math.round(p.moist)} %` : p.left == null ? 'Ikke vannet ennå' : p.left === 1 ? 'I morgen' : `Om ${p.left} dager`;
        const last = p.days == null ? 'Ikke vannet ennå' : p.days === 0 ? 'Vannet i dag' : `Vannet for ${p.days} d siden`;
        const dueStyle = { fontSize: 13, fontWeight: 600, color: need ? AMBER : f.wet ? BLUE : '#f2f1ee', whiteSpace: 'nowrap' };
        const iconWrap = { width: 44, height: 44, borderRadius: 22, flex: 'none', display: 'grid', placeItems: 'center', background: a(need ? AMBER : GREEN, 0.16), color: need ? AMBER : GREEN };
        // Uten fuktsensor: samme stolpe, men den viser hvor langt i vanningsintervallet planten er
        const barPct = p.hasMoist ? KD.clamp(p.moist, 0, 100) : KD.clamp(p.pct != null ? p.pct : (p.every && p.days != null ? p.days / p.every * 100 : 0), 0, 100);
        const band = p.hasMoist && p.lo != null && p.hi != null ? { position: 'absolute', top: 0, bottom: 0, left: `${p.lo}%`, width: `${p.hi - p.lo}%`, background: a(GREEN, 0.18), borderRadius: 4 } : { display: 'none' };
        const moistBar = { position: 'absolute', top: 0, bottom: 0, left: 0, width: `${barPct}%`, borderRadius: 4, background: need ? AMBER : f.wet ? BLUE : GREEN, transition: 'width .6s' };
        const label = p.hasMoist ? 'Jordfukt' : 'Vanningsintervall';
        const valHtml = p.hasMoist ? `<span>${Math.round(p.moist)}</span> % · mål <span>${p.lo != null ? `${p.lo}–${p.hi} %` : '–'}</span>` : `<span>${p.every ? `${p.days != null ? p.days : '–'} av ${p.every} dager` : '–'}</span>`;
        const metrics = [['light_mode', 'Lys', this.metric(p.lux, 'lux')], ['thermostat', 'Temp', this.metric(p.temp, 'temp')], ['science', 'Næring', this.metric(p.ec, 'ec')]];
        const btn = { height: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 600, background: need ? a(BLUE, 0.9) : '#232326', color: need ? '#141416' : '#c9c7c2' };
        return `
      <div data-key="${e(p.id)}" style="display:flex;flex-direction:column;gap:14px;padding:16px;border-radius:24px;background:#1c1c1f">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="${S(iconWrap)}"><span class="ms" style="font-size:24px;font-variation-settings:'FILL' 1">potted_plant</span></span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
            <span style="font-size:15px;font-weight:500"><span>${e(p.name)}</span></span>
            <span style="font-size:12px;color:#8e8d89;font-style:italic"><span>${e(p.latin)}</span></span>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px">
            <span style="${S(dueStyle)}"><span>${e(due)}</span></span>
            <span style="font-size:11px;color:#6d6c69"><span>${e(last)}</span></span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#8e8d89"><span>${label}</span><span style="font-variant-numeric:tabular-nums">${valHtml}</span></div>
          <div style="position:relative;height:8px;border-radius:4px;background:#2a2a2d">
            <span style="${S(band)}"></span>
            <span style="${S(moistBar)}"></span>
          </div>
        </div>
        ${s.tab === 'avansert' ? `
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
            ${metrics.map(([icon, lab, v]) => `
              <div style="display:flex;flex-direction:column;gap:3px;padding:10px 12px;border-radius:14px;background:#141416">
                <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:#8e8d89;white-space:nowrap"><span class="ms" style="font-size:14px">${icon}</span><span>${lab}</span></span>
                <span style="font-size:14px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap"><span>${e(v)}</span></span>
              </div>`).join('')}
          </div>` : ''}
        <button class="kd-pl-btn" data-on-click="water" data-arg="${e(p.water)}" style="${S(btn)}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">water_drop</span><span>${p.days === 0 ? 'Vannet i dag' : 'Merk som vannet'}</span></button>
      </div>`;
      }).join('');
      return `
<div style="box-sizing:border-box;width:100%;max-width:420px;min-height:100vh;margin:0 auto;background:#141416;padding:20px 18px 40px;display:flex;flex-direction:column;gap:22px">
  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Planter</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section style="display:flex;flex-direction:column;gap:6px;padding:0 4px">
    <div style="${S(statusStyle)}"><span style="${S(statusDot)}"></span><span>${e(status)}</span></div>
    <div style="font-size:24px;font-weight:500;letter-spacing:-0.015em"><span>${e(headline)}</span></div>
    <div style="font-size:14px;color:#8e8d89">${subHtml}</div>
  </section>

  <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:2px;padding:4px;border-radius:20px;background:#1c1c1f">
    ${tabs.map(t => `<button data-on-click="tab" data-arg="${t.k}" style="${S(t.style)}"><span>${t.label}</span></button>`).join('')}
  </div>

  <section style="display:flex;flex-direction:column;gap:8px">
    ${cards || `<div style="padding:16px;border-radius:24px;background:#1c1c1f;font-size:13px;color:#8e8d89">Legg til planter i KI Planter-integrasjonen.</div>`}
  </section>
</div>`;
    }
  }

  KD.define('kd-planter-card', KDPlanterCard, 'KD Planter', 'Planter fra KI Planter – jordfukt og vanning (pikselkopi av Claude Design)');
  KD.sheet('plants', 'kd-planter-card');
})();
