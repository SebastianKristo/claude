/*
 * kd-innstillinger-card – pikselkopi av Claude Design «Innstillinger v2».
 *
 *   type: custom:kd-innstillinger-card     # virker uten mer
 *   natt: switch.nattmodus                  # KI Nattmodus (attributter tid_pa / tid_av)
 *   privat: input_boolean.innendors_privace_mode
 *   vekking: sensor.soverom_vekking_neste_alarm   # neste alarm (ki_vekking); bryteren finnes selv (switch.*_vekking_aktiv)
 *   kiosk: input_boolean.kiosk_mode
 *   morgen_fra: '05:00'   morgen_til: '12:00'   # når nattkortet viser «God morgen»
 *   innekameraer: []                        # kameraene privatmodus slår av (tom = camera.* som ikke er ute)
 *   automasjoner / push / strom: [entity | {entity, navn, tekst, ikon}]   # overstyr listene
 *
 * Listene finnes selv: brytere fra KI Varslinger og sikkerhet (ki_notifications, én hovedbryter per regel)
 * og KI Energi-bryterne i `strom` deles i «Automasjoner» og «Push-varsler» etter kjent type. Designets rader
 * (ansikt, utelys, borte-modus, effektvakt / ringeklokke, bevegelse, vaskemaskin, strømpris, søppel) kommer først;
 * privatmodus, vekking og kioskmodus legges til sist i automasjonene. Langt trykk = mer info.
 */
(() => {
  const KD = window.KD; if (!KD) return;
  const e = KD.e, S = KD.S;

  /* Kjente regler: navn, forklaring, ikon og fane (fra ki-varsling-card, med Material Symbols) */
  const KNOWN = [
    // i designets rekkefølge (Automasjoner, så Push-varsler) – listene sorteres etter denne tabellen
    [/ansikt|face/, 'Ansiktsgjenkjenning', 'Låser opp ved gjenkjent ansikt', 'face', 'auto'],
    [/ki_utelys_auto/, 'Utelys automatikk', 'Styrer utelysene etter solhøyden', 'wb_twilight', 'auto'],
    [/ki_helg_auto/, 'Borte-modus', 'Slår av lys og senker varmen når alle har dratt', 'directions_walk', 'auto'],
    [/ki_dynamisk_grense/, 'Effektvakt', 'Pauser varmtvann og lading før neste effekttrinn', 'bolt', 'auto'],
    [/ringeklokke|doorbell/, 'Ringeklokke', 'Varsel og bilde når noen ringer på', 'doorbell', 'push'],
    [/bevegelse|motion/, 'Bevegelse ute', 'Varsel ved bevegelse ute', 'directions_run', 'push'],
    [/vaskemaskin|washer|washing/, 'Vaskemaskin ferdig', 'Når programmet er ferdig', 'local_laundry_service', 'push'],
    [/strompris|strømpris|hoy_pris|høy_pris|spotpris/, 'Høy strømpris', 'Når strømprisen er høy', 'trending_up', 'push'],
    [/soppel|søppel|avfall|tomming/, 'Søppeltømming', 'Kvelden før tømming', 'delete', 'push'],
    // resten (vises etter designets rader)
    [/ki_utelys_morgen/, 'Utelys morgen', 'Lys om morgenen til det lysner', 'wb_twilight', 'auto'],
    [/ki_utelys_kveld/, 'Utelys kveld', 'Lys om kvelden når det blir mørkt', 'wb_twilight', 'auto'],
    [/vekking|vekke/, 'Vekking', 'Lys og lyd på vekketidspunkt', 'alarm', 'auto'],
    [/autolas|autolås/, 'Autolås', 'Låser døra automatisk etter lukking', 'lock_clock', 'auto'],
    [/kamerabilde|door_camera|dor_.*kamera|dør.*kamera/, 'Dør låst/åpnet med kamerabilde', 'Sender bilde ved hver hendelse', 'doorbell', 'auto'],
    [/fastkjort|fastkjørt|jammed/, 'Fastkjørt lås', 'Varsel hvis låsen ikke går i lås', 'lock_reset', 'auto'],
    [/blink|dorlys|dørlys/, 'Dørlys', 'Blinker med lyset når døra åpnes', 'highlight', 'auto'],
    [/heimdall|alarmo/, 'Heimdall', 'Synk mellom Heimdall og Alarmo', 'sync', 'auto'],
    [/ki_vvb_prisstyring/, 'Prisstyring varmtvann', 'Slår av i de dyreste timene', 'bolt', 'auto'],
    [/ki_nattsenk_okonomi/, 'Prisstyring nattsenking', 'Senker varmen når strømmen er dyr', 'heat', 'auto'],
    [/ki_lading_automatikk|ki_elbil/, 'Smartlading bil', 'Lader i billigste timer', 'ev_station', 'auto'],
    [/kiosk/, 'Kioskmodus', 'Skjuler topp- og sidefeltet på dashbordet', 'fullscreen', 'auto'],
    [/familie|hjemme.?borte|ankomst|avreise/, 'Ankomst og avreise', 'Når noen kommer eller går', 'person_pin_circle', 'push'],
    [/^alarm|alarm_/, 'Alarm', 'Varsel når alarmen går eller slås av', 'notifications_active', 'push'],
    [/vann|lekkasje|leak/, 'Vannlekkasje', 'Kritisk varsel til alle', 'water_damage', 'push'],
    [/pakke|parcel|package/, 'Pakke levert', 'Når kamera ser en pakke ved døra', 'package_2', 'push'],
    [/batteri|battery/, 'Lavt batteri', 'Sensorer under 15 %', 'battery_alert', 'push'],
    [/ruter|skolen/, 'Ruter fra skolen', 'Avgangstider hjem etter forelesning', 'directions_bus', 'push'],
    [/planter/, 'Planter', 'Varsel når plantene trenger vann', 'potted_plant', 'push'],
    [/stovsug|støvsug|roborock|vacuum/, 'Støvsuger', 'Varsel om feil og fullført runde', 'cleaning_services', 'push'],
    [/home.?assistant|oppstart|startet/, 'Home Assistant', 'Varsel etter omstart av HA', 'restart_alt', 'push'],
    [/vaermelding|værmelding|vaer_ai/, 'Værmelding', 'Daglig værvarsel fra AI', 'partly_cloudy_day', 'push'],
    [/stromforbruk|strømforbruk|forbruk.?rapport/, 'Strømforbruk', 'Daglig rapport', 'bar_chart', 'push'],
    [/ki_energi_varsler/, 'Energivarsler', 'Hovedbryter for alle energivarsler', 'notifications', 'push'],
    [/ki_varsel_effekt/, 'Varsel ved effektgrense', 'Når timen nærmer seg grensen', 'notifications', 'push'],
  ];
  const known = (t) => KNOWN.find(k => k[0].test(t));
  const rank = (r) => r.rank == null ? 999 : r.rank;
  const hhmm = (t) => { const m = String(t || '').match(/(\d{1,2}):(\d{2})/); return m ? `${m[1].padStart(2, '0')}:${m[2]}` : ''; };
  const mins = (t) => { const m = String(t || '').match(/(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : null; };

  const GREEN = 'oklch(0.8 0.12 150)';
  const STARS = [[12, 30], [22, 62], [34, 18], [48, 44], [58, 14], [66, 70], [74, 34], [18, 84], [42, 76], [84, 22], [52, 58], [28, 40]];
  const sw = on => ({ track: { position: 'relative', display: 'block', width: 50, height: 30, borderRadius: 15, flex: 'none', background: on ? GREEN : 'rgba(255,255,255,0.16)', transition: 'background .2s' }, knob: { position: 'absolute', top: 3, left: on ? 23 : 3, width: 24, height: 24, borderRadius: 12, background: '#f4f3ef', transition: 'left .22s cubic-bezier(.3,1.4,.6,1)' } });

  class KDInnstillingerCard extends KD.KDSheet {
    static head = ['tune', 'Innstillinger', 'Dashbord'];
    static defaults = {
      natt: 'switch.nattmodus', privat: 'input_boolean.innendors_privace_mode', vekking: 'sensor.soverom_vekking_neste_alarm', kiosk: 'input_boolean.kiosk_mode',
      morgen_fra: '05:00', morgen_til: '12:00', innekameraer: null,
      tekst_natt_av: 'Dimmer lys, låser dører og demper varsler', tekst_natt_pa: 'Dimmer lys, låser dører og demper varsler', tekst_privat: 'Innendørskamera av',
      automasjoner: null, push: null,
      strom: ['switch.ki_helg_auto', 'switch.ki_dynamisk_grense', 'switch.ki_vvb_prisstyring', 'switch.ki_nattsenk_okonomi', 'switch.ki_lading_automatikk', 'switch.ki_energi_varsler', 'switch.ki_varsel_effekt'],
      plattform: ['ki_notifications'],
    };
    static sheetCss = `
@keyframes twinkle{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes zz{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
.kd-inn-row:active{transform:scale(0.985)}
[data-seg="inn-tab"] [data-seg-b]{padding:0 18px!important;font-weight:500!important;transition:color .25s}`;
    constructor() { super(); this.state = { tab: 'auto' }; }

    /* ---------- data ---------- */
    _row(id, over = {}) {
      const st = this.st(id); if (!st) return null;
      const slug = id.split('.')[1] || id;
      const R = (this._hass.entities || {})[id] || {}, dev = ((this._hass.devices || {})[R.device_id] || {});
      const devName = dev.name_by_user || dev.name || '';
      const full = String(st.attributes.friendly_name || slug);
      const parts = full.split(' - ');
      let navn = parts[0].trim(), tekst = parts.length > 1 ? parts.slice(1).join(' - ').trim() : '', ikon = null;
      const k = known(`${slug} ${devName} ${full}`.toLowerCase());
      if (k) { navn = k[1]; tekst = tekst || k[2]; ikon = k[3]; }
      else if (!tekst && devName && full.toLowerCase().startsWith(devName.toLowerCase() + ' ')) { navn = devName; tekst = full.slice(devName.length + 1); }
      return { id, navn: over.navn || navn, tekst: over.tekst || tekst, ikon: over.ikon || ikon || 'toggle_on', kind: k ? k[4] : 'push', rank: k ? KNOWN.indexOf(k) : null, on: st.state === 'on' };
    }
    _fromCfg(list) { return (Array.isArray(list) ? list : []).map(x => typeof x === 'string' ? this._row(x) : x && x.entity ? this._row(x.entity, x) : null).filter(Boolean); }
    /** Hovedbryterne fra KI Varslinger (én per regel) */
    _notif() {
      const R = (this._hass && this._hass.entities) || {}, D = (this._hass && this._hass.devices) || {};
      const pl = [].concat(this.config.plattform || []);
      const per = new Map();
      for (const id in R) {
        const r = R[id]; if (!r || !pl.includes(r.platform) || r.hidden) continue;
        if (!id.startsWith('switch.') && !id.startsWith('input_boolean.')) continue;
        if (!this._hass.states[id]) continue;
        const k = r.device_id || id;
        if (!per.has(k)) per.set(k, []);
        per.get(k).push(id);
      }
      const out = [];
      for (const [dev, ids] of per) {
        if (ids.length === 1) { out.push(ids[0]); continue; }
        const d = D[dev] || {}; const dslug = String(d.name_by_user || d.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const m = ids.filter(id => /alle[ _-]?varsler|_aktivert$|_varsling$|_aktiv$|_auto$|_automatikk$/.test(id) || id.split('.')[1] === dslug);
        out.push(...(m.length ? m : ids));
      }
      this.all(); // lista kan endre seg når entiteter legges til
      return out.map(id => this._row(id)).filter(Boolean);
    }
    /** Automasjoner / Push-varsler. Designets rader først (i designets rekkefølge), så resten. */
    _lists() {
      const c = this.config;
      const notif = (c.automasjoner && c.push) ? [] : this._notif();
      const strom = this._fromCfg(c.strom).filter(r => !notif.some(n => n.id === r.id));
      const sort = l => l.map((r, i) => [r, i]).sort((x, y) => rank(x[0]) - rank(y[0]) || x[1] - y[1]).map(x => x[0]);
      let auto, push;
      if (c.automasjoner) auto = this._fromCfg(c.automasjoner);
      else {
        auto = [...notif, ...strom].filter(r => r.kind === 'auto');
        for (const id of this.find(/^switch\.ki_utelys_auto$/)) if (!auto.some(r => r.id === id)) { const r = this._row(id); if (r) auto.push(r); }
        auto = sort(auto);
        // privatmodus (innendørskameraer av)
        if (c.privat && this.st(c.privat)) {
          const on = this.isOn(c.privat), n = this._cams();
          auto.push(this._row(c.privat, { navn: 'Privatmodus', tekst: `${c.tekst_privat}${n ? ` · ${n} kamera` : ''}`, ikon: on ? 'videocam_off' : 'videocam' }));
        }
        // vekking (ki_vekking): én hovedbryter per vekking, med neste alarm som undertekst
        const own = String(c.vekking || '').replace(/^sensor\.|_vekking_neste_alarm$/g, '');
        const vks = this.find(/^switch\..+_vekking_aktiv$/).sort((x, y) => (y.includes(own + '_') ? 1 : 0) - (x.includes(own + '_') ? 1 : 0));
        for (const id of vks) {
          if (auto.some(r => r.id === id)) continue;
          const r = this._row(id); if (!r) continue;
          const pre = id.slice(7).replace(/_vekking_aktiv$/, '');
          if (vks.length > 1) r.navn = `Vekking ${pre.replace(/_/g, ' ').replace(/(^|\s)\S/g, x => x.toUpperCase())}`;
          const sen = pre === own ? c.vekking : `sensor.${pre}_vekking_neste_alarm`;
          if (this.ok(sen)) { const nd = this.at(sen, 'neste_dag', ''); const t = this.v(sen); r.tekst = /^\d/.test(t) ? `Neste alarm ${nd ? nd + ' ' : ''}kl. ${t}` : 'Ingen alarm satt'; }
          auto.push(r);
        }
        if (c.kiosk && this.st(c.kiosk) && !auto.some(r => r.id === c.kiosk)) auto.push(this._row(c.kiosk));
      }
      push = c.push ? this._fromCfg(c.push) : sort([...notif, ...strom].filter(r => r.kind !== 'auto'));
      return { auto, push };
    }
    _cams() {
      const c = this.config;
      if (Array.isArray(c.innekameraer)) return c.innekameraer.length;
      return this.find(/^camera\./).filter(id => !/ute|inngang|ringeklokke|doorbell|entry|garasje|veranda|hage|carport|utendors|outdoor/i.test(id + ' ' + this.fname(id))).length;
    }

    /* ---------- hendelser ---------- */
    toggleNight() { if (this.config.natt) this.toggle(this.config.natt); }
    goTab(ev, k) { this.setState({ tab: k }); }
    tog(ev, id) { if (id) this.toggle(id); }
    /** Fanevelgeren har automatisk bredde per fane (som designet): legg glassboblen over valgt knapp */
    afterRender() {
      const el = this.$('[data-seg="inn-tab"]'); if (!el) return;
      // mål på nytt når skrifta er lastet / bredden endres
      if (!el._innRO && window.ResizeObserver) { el._innRO = new ResizeObserver(() => this.afterRender()); el._innRO.observe(el); }
      const i = +el.getAttribute('data-seg-i'), th = el.querySelector('[data-seg-thumb]');
      el.querySelectorAll('[data-seg-b]').forEach((b, j) => {
        b.style.color = j === i ? '#2a1720' : '#c9c7c2';
        if (j === i && th) { th.style.left = b.offsetLeft + 'px'; th.style.width = b.offsetWidth + 'px'; }
      });
    }

    body() {
      const s = this.state, c = this.config;
      const n = this.isOn(c.natt), ns = sw(n);
      const now = new Date(), cur = now.getHours() * 60 + now.getMinutes();
      const mf = mins(c.morgen_fra) ?? 300, mt = mins(c.morgen_til) ?? 720;
      const morning = n && cur >= mf && cur < mt;
      const end = hhmm(this.at(c.natt, 'tid_av', '')) || (/^\d/.test(this.v(c.vekking)) ? hhmm(this.v(c.vekking)) : '');
      const start = hhmm(this.at(c.natt, 'tid_pa', ''));
      const nightCard = { position: 'relative', height: 184, borderRadius: 28, overflow: 'hidden', cursor: 'pointer', background: n ? 'linear-gradient(180deg, #1a1838, #2b2752 70%, #3a335f)' : 'linear-gradient(180deg, #24243a, #2e2c48 70%, #37345a)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)', transition: 'background .6s' };
      const stars = STARS.map(([x, y], i) => ({ position: 'absolute', left: `${x}%`, top: `${y}%`, width: i % 3 ? 2 : 3, height: i % 3 ? 2 : 3, borderRadius: 2, background: '#fff', opacity: n ? 0.9 : 0.35, animation: n ? `twinkle ${2 + (i % 4) * 0.6}s ease-in-out ${i * 0.3}s infinite` : 'none', transition: 'opacity .6s' }));
      const skyIcon = morning ? 'wb_twilight' : 'dark_mode';
      const moon = { position: 'absolute', right: 86, top: 38, fontSize: 34, color: n ? 'oklch(0.92 0.08 95)' : '#8f8ca6', fontVariationSettings: "'FILL' 1", filter: n ? 'drop-shadow(0 0 12px oklch(0.92 0.08 95 / 0.6))' : 'none', transition: 'color .6s, filter .6s' };
      const zzStyle = { fontSize: 24, color: '#e6e4f2', fontVariationSettings: `'FILL' ${n ? 1 : 0}`, animation: n ? 'zz 2.4s ease-in-out infinite' : 'none' };
      const nightSub = morning ? `${end ? `Slutter kl. ${end}` : 'Nattmodus er på'} · lysene tennes gradvis` : n ? c.tekst_natt_pa : start ? `Starter automatisk kl. ${start}` : c.tekst_natt_av;
      const nightState = morning ? 'God morgen' : n ? 'På' : 'Av';
      const L = this._lists();
      const tab = s.tab === 'push' ? 'push' : 'auto';
      const rows = L[tab].map(r => { const t = sw(r.on); return { ...r, track: t.track, knob: t.knob,
        iconWrap: { width: 52, height: 52, borderRadius: 26, flex: 'none', display: 'grid', placeItems: 'center', background: r.on ? '#2c2c30' : '#262629', color: r.on ? '#f2f1ee' : '#8e8d89', transition: 'color .2s' } }; });
      const seg = KD.segHTML('inn-tab', [['auto', 'Automasjoner'], ['push', 'Push-varsler']], tab, 'goTab',
        { pink: true, h: 38, r: 23, bg: 'transparent', style: 'display:grid;grid-template-columns:repeat(2,auto);gap:2px;border-radius:22px;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.14);align-self:center;margin:4px 0' });
      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:14px">
  <header style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:6px">
    <div style="font-size:30px;font-weight:600;letter-spacing:-0.03em">Innstillinger</div>
    <button data-on-click="closeSheet" style="width:44px;height:44px;border-radius:22px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:22px">close</span></button>
  </header>

  <section data-on-click="toggleNight" data-arg="${e(c.natt || '')}" style="${S(nightCard)}">
    ${stars.map(st => `<span style="${S(st)}"></span>`).join('')}
    <span class="ms" style="${S(moon)}">${e(skyIcon)}</span>
    <div style="position:absolute;left:18px;top:18px;display:flex;flex-direction:column;gap:3px">
      <span style="font-size:13px;color:#c9c7d8">Nattmodus</span>
      <span style="font-size:12px;color:#8f8ca6"><span>${e(nightSub)}</span></span>
    </div>
    <span style="position:absolute;right:16px;top:16px;width:48px;height:48px;border-radius:24px;background:rgba(255,255,255,0.1);display:grid;place-items:center"><span class="ms" style="${S(zzStyle)}">bedtime</span></span>
    <span style="position:absolute;left:18px;bottom:16px;font-size:32px;font-weight:300;letter-spacing:-0.03em;line-height:1"><span>${e(nightState)}</span></span>
    <span style="position:absolute;right:16px;bottom:16px"><span style="${S(ns.track)}"><span style="${S(ns.knob)}"></span></span></span>
  </section>

  ${seg}

  <div style="display:flex;flex-direction:column;gap:8px">
    ${rows.map(r => `<button class="kd-inn-row" data-on-click="tog" data-arg="${e(r.id)}" data-key="${e(r.id)}" style="display:flex;align-items:center;gap:14px;padding:10px 16px 10px 10px;border-radius:28px;background:#1c1c1f;text-align:left;width:100%;box-sizing:border-box">
        <span style="${S(r.iconWrap)}"><span class="ms" style="font-size:24px">${e(r.ikon)}</span></span>
        <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px">
          <span style="font-size:15px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(r.navn)}</span></span>
          <span style="font-size:12px;color:#8e8d89;text-wrap:pretty"><span>${e(r.tekst)}</span></span>
        </span>
        <span style="${S(r.track)}"><span style="${S(r.knob)}"></span></span>
      </button>`).join('')}
  </div>
</div>`;
    }
  }

  KD.define('kd-innstillinger-card', KDInnstillingerCard, 'KD Innstillinger', 'Nattmodus, automasjoner og varsler – pikselkopi av Claude Design «Innstillinger v2»');
  KD.sheet('settings', 'kd-innstillinger-card');
})();
