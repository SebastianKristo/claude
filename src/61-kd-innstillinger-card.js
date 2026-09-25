/*
 * kd-innstillinger-card – pikselkopi av Claude Design «Innstillinger».
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
 * deles i «Automasjoner» (lås, dør, lys) og «Push-varsler» (resten); KI Utelys, vekking og kioskmodus
 * legges til automasjonene; «Strøm» er KI Energi-bryterne for prisstyring og energivarsler.
 */
(() => {
  const KD = window.KD; if (!KD) return;
  const C = { green: 'oklch(0.8 0.12 150)', blue: 'oklch(0.72 0.12 270)', red: 'oklch(0.72 0.15 25)' };
  const a = (c, o) => c.replace(')', ` / ${o})`);
  const PINK = 'linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20))';
  const e = KD.e, S = KD.S;

  /* Kjente regler: navn, forklaring og ikon (fra ki-varsling-card, med Material Symbols) */
  const KNOWN = [
    [/ki_utelys_auto/, 'Utelys automatikk', 'Styrer utelysene etter solhøyden', 'wb_twilight', 'auto'],
    [/ki_utelys_morgen/, 'Utelys morgen', 'Lys om morgenen til det lysner', 'wb_twilight', 'auto'],
    [/ki_utelys_kveld/, 'Utelys kveld', 'Lys om kvelden når det blir mørkt', 'wb_twilight', 'auto'],
    [/vekking|vekke/, 'Vekking', 'Lys og lyd på vekketidspunkt', 'alarm', 'auto'],
    [/ansikt|face/, 'Ansiktsgjenkjenning', 'Låser opp ved gjenkjent ansikt', 'face', 'auto'],
    [/autolas|autolås/, 'Autolås', 'Låser døra automatisk etter lukking', 'lock_clock', 'auto'],
    [/kamerabilde|door_camera|dor_.*kamera|dør.*kamera/, 'Dør låst/åpnet med kamerabilde', 'Sender bilde ved hver hendelse', 'doorbell', 'auto'],
    [/fastkjort|fastkjørt|jammed/, 'Fastkjørt lås', 'Varsel hvis låsen ikke går i lås', 'lock_reset', 'auto'],
    [/blink|dorlys|dørlys/, 'Dørlys', 'Blinker med lyset når døra åpnes', 'highlight', 'auto'],
    [/heimdall|alarmo/, 'Heimdall', 'Synk mellom Heimdall og Alarmo', 'sync', 'auto'],
    [/familie|hjemme.?borte|ankomst|avreise/, 'Ankomst og avreise', 'Når noen kommer eller går', 'person_pin_circle', 'push'],
    [/^alarm|alarm_/, 'Alarm', 'Varsel når alarmen går eller slås av', 'notifications_active', 'push'],
    [/vann|lekkasje|leak/, 'Vannlekkasje', 'Kritisk varsel til alle', 'water_damage', 'push'],
    [/pakke|parcel|package/, 'Pakke levert', 'Når kamera ser en pakke ved døra', 'package_2', 'push'],
    [/soppel|søppel|avfall|tomming/, 'Søppeltømming', 'Kvelden før henting', 'delete', 'push'],
    [/batteri|battery/, 'Lavt batteri', 'Sensorer under 15 %', 'battery_alert', 'push'],
    [/ruter|skolen/, 'Ruter fra skolen', 'Avgangstider hjem etter forelesning', 'directions_bus', 'push'],
    [/planter/, 'Planter', 'Varsel når plantene trenger vann', 'potted_plant', 'push'],
    [/stovsug|støvsug|roborock|vacuum/, 'Støvsuger', 'Varsel om feil og fullført runde', 'cleaning_services', 'push'],
    [/home.?assistant|oppstart|startet/, 'Home Assistant', 'Varsel etter omstart av HA', 'restart_alt', 'push'],
    [/vaermelding|værmelding|vaer_ai/, 'Værmelding', 'Daglig værvarsel fra AI', 'partly_cloudy_day', 'push'],
    [/stromforbruk|strømforbruk|forbruk.?rapport/, 'Strømforbruk', 'Daglig rapport', 'bar_chart', 'push'],
    [/ki_vvb_prisstyring/, 'Prisstyring varmtvann', 'Slår av i de dyreste timene', 'bolt', 'strom'],
    [/ki_nattsenk_okonomi/, 'Prisstyring nattsenking', 'Senker varmen når strømmen er dyr', 'heat', 'strom'],
    [/ki_lading_automatikk|ki_elbil/, 'Smartlading bil', 'Lader i billigste timer', 'ev_station', 'strom'],
    [/ki_dynamisk_grense/, 'Effektvakt', 'Holder timen under kapasitetstrinnet', 'speed', 'strom'],
    [/ki_energi_varsler/, 'Energivarsler', 'Hovedbryter for alle energivarsler', 'notifications', 'strom'],
    [/ki_varsel_effekt/, 'Varsel ved effektgrense', 'Når timen nærmer seg grensen', 'notifications', 'strom'],
    [/kiosk/, 'Kioskmodus', 'Skjuler topp- og sidefeltet på dashbordet', 'fullscreen', 'auto'],
  ];
  const known = (t) => KNOWN.find(k => k[0].test(t));
  const hhmm = (t) => { const m = String(t || '').match(/(\d{1,2}):(\d{2})/); return m ? `${m[1].padStart(2, '0')}:${m[2]}` : ''; };
  const mins = (t) => { const m = String(t || '').match(/(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : null; };

  const STARS = [[56, 8, 1.5, .4], [62, 40, 2.5, .9], [50, 52, 1, 1.8], [70, 60, 1.5, .5], [88, 64, 1, .3], [58, 70, 1.5, 2.1], [80, 76, 2, 1.3], [92, 48, 1, 1.1]];
  const nightFx = ({ on, morning, ripple }) => {
    const m = on && morning;
    return `<span style="${S({ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 'inherit', overflow: 'hidden' })}">`
      + `<span style="${S({ position: 'absolute', inset: 0, background: 'linear-gradient(170deg, #1d2150 0%, #2a2466 55%, #4a2f6e 100%)', opacity: on ? 1 : 0, transition: 'opacity .7s ease' })}"></span>`
      + `<span style="${S({ position: 'absolute', inset: 0, background: 'linear-gradient(170deg, #2e2c66 0%, #a4557f 55%, #f2a064 100%)', opacity: m ? 1 : 0, transition: 'opacity 1.4s ease' })}"></span>`
      + `<span style="${S({ position: 'absolute', right: 70, bottom: m ? -18 : -80, width: 70, height: 70, borderRadius: '50%', background: 'radial-gradient(circle, #ffe6a8 0 45%, #ffb870 70%, rgba(255,184,112,0) 72%)', boxShadow: '0 0 60px 20px rgba(255,190,120,0.45)', opacity: m ? 1 : 0, transition: 'bottom 1.6s cubic-bezier(.2,.9,.3,1), opacity 1s' })}"></span>`
      + `<span style="${S({ position: 'absolute', left: -20, right: -20, bottom: -30, height: 70, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,170,200,0.28), transparent)', opacity: on ? 1 : 0, transition: 'opacity 1.2s ease .2s' })}"></span>`
      + STARS.map(([x, y, r, d], i) => `<span style="${S({ position: 'absolute', left: x + '%', top: y + '%', width: r * 2, height: r * 2, borderRadius: '50%', background: '#fff', boxShadow: '0 0 6px rgba(255,255,255,0.8)', opacity: on && !m ? 1 : 0, transform: on ? 'translateY(0)' : 'translateY(10px)', transition: `opacity .6s ease ${.15 + i * .05}s, transform .8s cubic-bezier(.2,.9,.3,1.2) ${.1 + i * .05}s` })}"><span style="${S({ position: 'absolute', inset: 0, borderRadius: '50%', background: '#fff', animation: on ? `twinkle ${2 + (i % 3)}s ease-in-out ${d}s infinite` : 'none' })}"></span></span>`).join('')
      + `<span style="${S({ position: 'absolute', right: 58, top: m ? 170 : on ? 58 : 170, width: 30, height: 30, borderRadius: '50%', boxShadow: 'inset -8px -3px 0 0 #f4ecd6', filter: 'drop-shadow(0 0 10px rgba(244,236,214,0.55))', opacity: on && !m ? 1 : 0, transform: on ? 'rotate(-18deg)' : 'rotate(40deg)', transition: 'top .9s cubic-bezier(.2,1.1,.3,1), opacity .5s, transform .9s cubic-bezier(.2,1.1,.3,1)' })}"></span>`
      + (ripple ? `<span data-key="r${ripple.id}" style="${S({ position: 'absolute', left: ripple.x, top: ripple.y, width: 420, height: 420, borderRadius: '50%', background: on ? 'rgba(160,150,255,0.45)' : 'rgba(255,255,255,0.18)', animation: 'ripple .8s ease-out forwards' })}"></span>` : '')
      + `</span>`;
  };
  const privFx = ({ on, ripple, cams }) => `<span style="${S({ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 'inherit', overflow: 'hidden' })}">`
    + `<span style="${S({ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #3a1418, #1f0c10 70%)', opacity: on ? 1 : 0, transition: 'opacity .6s ease' })}"></span>`
    + `<span style="${S({ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 4px)', opacity: on ? 1 : 0, transition: 'opacity .6s' })}"></span>`
    + `<span style="${S({ position: 'absolute', left: 0, right: 0, top: 0, height: '40%', background: 'linear-gradient(180deg, transparent, rgba(255,90,90,0.16), transparent)', opacity: on ? 1 : 0, animation: on ? 'scan 3.2s linear infinite' : 'none' })}"></span>`
    + `<span style="${S({ position: 'absolute', left: 16, bottom: 17, display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'oklch(0.78 0.15 25)', opacity: on ? 1 : 0, transform: on ? 'none' : 'translateY(6px)', transition: 'opacity .4s .35s, transform .4s .35s' })}"><span style="${S({ width: 6, height: 6, borderRadius: 3, background: 'oklch(0.72 0.18 25)', boxShadow: '0 0 8px oklch(0.72 0.18 25)', animation: on ? 'breathe 1.6s ease-in-out infinite' : 'none' })}"></span>${e(cams ? `${cams} KAMERA AV` : 'KAMERA AV')}</span>`
    + (ripple ? `<span data-key="r${ripple.id}" style="${S({ position: 'absolute', left: ripple.x, top: ripple.y, width: 420, height: 420, borderRadius: '50%', background: on ? 'rgba(255,90,90,0.4)' : 'rgba(255,255,255,0.18)', animation: 'ripple .8s ease-out forwards' })}"></span>` : '')
    + `</span>`;

  class KDInnstillingerCard extends KD.KDSheet {
    static head = ['tune', 'Innstillinger', 'Dashbord'];
    static defaults = {
      natt: 'switch.nattmodus', privat: 'input_boolean.innendors_privace_mode', vekking: 'sensor.soverom_vekking_neste_alarm', kiosk: 'input_boolean.kiosk_mode',
      morgen_fra: '05:00', morgen_til: '12:00', innekameraer: null,
      tekst_natt_av: 'Dimmer lys, låser, alarm natt', tekst_natt_pa: 'Privatmodus inkludert · lys dimmet · dører låst · alarm natt', tekst_privat: 'Innendørskamera av',
      automasjoner: null, push: null,
      strom: ['switch.ki_vvb_prisstyring', 'switch.ki_nattsenk_okonomi', 'switch.ki_lading_automatikk', 'switch.ki_dynamisk_grense', 'switch.ki_varsel_effekt'],
      plattform: ['ki_notifications'],
    };
    static sheetCss = `
@keyframes twinkle{0%,100%{opacity:.25;transform:scale(.7)}50%{opacity:1;transform:scale(1)}}
@keyframes ripple{from{transform:translate(-50%,-50%) scale(0);opacity:.55}to{transform:translate(-50%,-50%) scale(1);opacity:0}}
@keyframes scan{from{transform:translateY(-100%)}to{transform:translateY(160%)}}
@keyframes breathe{0%,100%{opacity:.55}50%{opacity:1}}
.kd-inn-mode:active{transform:scale(0.96)}`;
    constructor() { super(); this.state = { tab: 'auto', rip: {} }; }

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
      if (k) { navn = k[1]; tekst = k[2]; ikon = k[3]; }
      else if (!tekst && devName && full.toLowerCase().startsWith(devName.toLowerCase() + ' ')) { navn = devName; tekst = full.slice(devName.length + 1); }
      return { id, navn: over.navn || navn, tekst: over.tekst || tekst, ikon: over.ikon || ikon || 'toggle_on', kind: k ? k[4] : 'push', on: st.state === 'on' };
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
    _lists() {
      const c = this.config;
      const notif = (c.automasjoner && c.push) ? [] : this._notif();
      let auto, push;
      if (c.automasjoner) auto = this._fromCfg(c.automasjoner);
      else {
        auto = notif.filter(r => r.kind === 'auto');
        for (const id of this.find(/^switch\.ki_utelys_auto$/)) if (!auto.some(r => r.id === id)) { const r = this._row(id); if (r) auto.push(r); }
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
        if (c.kiosk && this.st(c.kiosk)) auto.push(this._row(c.kiosk));
      }
      push = c.push ? this._fromCfg(c.push) : notif.filter(r => r.kind !== 'auto' && r.kind !== 'strom');
      const strom = this._fromCfg(c.strom);
      return { auto, push, strom };
    }
    _cams() {
      const c = this.config;
      if (Array.isArray(c.innekameraer)) return c.innekameraer.length;
      return this.find(/^camera\./).filter(id => !/ute|inngang|ringeklokke|doorbell|entry|garasje|veranda|hage|carport|utendors|outdoor/i.test(id + ' ' + this.fname(id))).length;
    }

    /* ---------- hendelser ---------- */
    _tap(ev, k, el, id) {
      const r = el.getBoundingClientRect();
      this.setState(st => ({ rip: { ...st.rip, [k]: { id: Date.now(), x: ev.clientX - r.left, y: ev.clientY - r.top } } }));
      if (id) this.toggle(id);
    }
    tapNight(ev, a, el) { this._tap(ev, 'night', el, this.config.natt); }
    tapPriv(ev, a, el) { this._tap(ev, 'priv', el, this.config.privat); }
    goTab(ev, k) { this.setState({ tab: k }); }
    tog(ev, id) { if (id) this.toggle(id); }

    body() {
      const s = this.state, c = this.config;
      const night = this.isOn(c.natt), priv = this.isOn(c.privat);
      const now = new Date(), cur = now.getHours() * 60 + now.getMinutes();
      const mf = mins(c.morgen_fra) ?? 300, mt = mins(c.morgen_til) ?? 720;
      const morning = night && cur >= mf && cur < mt;
      const end = hhmm(this.at(c.natt, 'tid_av', '')) || (/^\d/.test(this.v(c.vekking)) ? hhmm(this.v(c.vekking)) : '');
      const cams = this._cams();
      const sw = (on) => ({ track: { position: 'relative', width: 46, height: 28, borderRadius: 14, flex: 'none', background: on ? 'oklch(0.72 0.14 150)' : 'rgba(255,255,255,0.16)', transition: 'background .2s' }, knob: { position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: 11, background: '#f4f3ef', transition: 'left .2s' } });
      const mode = (k, title, icon, col, sub, handler) => {
        const cover = k === 'night' && night, under = k === 'priv' && night, on = (k === 'night' ? night : priv) || under;
        return { k, title, icon, sub, handler,
          fx: k === 'night' ? nightFx({ on, morning, ripple: s.rip.night }) : privFx({ on, ripple: s.rip.priv, cams }),
          roll: { display: 'flex', flexDirection: 'column', transform: `translateY(${k === 'night' && morning ? -68 : on ? 0 : -34}px)`, transition: 'transform .45s cubic-bezier(.34,1.5,.64,1)' },
          iconStyle: { fontSize: 22, fontVariationSettings: "'FILL' 1", display: 'block', transform: on ? 'rotate(0deg) scale(1)' : 'rotate(-30deg) scale(0.9)', transition: 'transform .6s cubic-bezier(.34,1.8,.64,1)' },
          card: { position: 'relative', zIndex: cover ? 2 : 1, width: cover ? 'calc(200% + 8px)' : '100%', opacity: under ? 0 : 1, pointerEvents: under ? 'none' : 'auto', overflow: 'hidden', isolation: 'isolate', height: 150, borderRadius: 24, padding: 16, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'left', background: '#1c1c1f', boxShadow: on ? `inset 0 0 0 1px ${a(col, 0.55)}, 0 10px 30px ${a(col, 0.25)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)', transition: 'box-shadow .5s, transform .2s cubic-bezier(.34,1.8,.64,1), width .7s cubic-bezier(.34,1.25,.64,1), opacity .4s ease .25s' },
          iconWrap: { width: 44, height: 44, borderRadius: 22, display: 'grid', placeItems: 'center', background: on ? 'rgba(255,255,255,0.14)' : '#2a2a2d', color: on ? '#f2f1ee' : '#a9a7a2', backdropFilter: 'blur(6px)', transition: 'background .4s' },
          subStyle: { opacity: k === 'priv' && on ? 0 : 1, transition: 'opacity .3s', fontSize: 11, color: on ? '#e6e4df' : '#8e8d89', whiteSpace: 'nowrap' } };
      };
      const modes = [
        mode('night', 'Nattmodus', morning ? 'wb_twilight' : 'bedtime', C.blue, morning ? `${end ? `Nattmodus slutter kl. ${end}` : 'Nattmodus er på'} · lysene tennes gradvis` : night ? c.tekst_natt_pa : c.tekst_natt_av, 'tapNight'),
        mode('priv', 'Privatmodus', priv ? 'videocam_off' : 'videocam', C.red, c.tekst_privat, 'tapPriv'),
      ];
      const L = this._lists();
      const tabs = [['auto', 'Automasjoner'], ['push', 'Push-varsler'], ['strom', 'Strøm']].map(([k, l]) => ({ k, label: l, style: { height: 38, borderRadius: 16, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', background: s.tab === k ? PINK : 'transparent', color: s.tab === k ? '#2a1720' : '#a9a7a2' } }));
      const items = (L[s.tab] || []).map((r, i) => { const w = sw(r.on); return { ...r, track: w.track, knob: w.knob,
        row: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px', width: '100%', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' },
        iconWrap: { width: 40, height: 40, borderRadius: 20, flex: 'none', display: 'grid', placeItems: 'center', background: '#1c1c1f', color: r.on ? '#f2f1ee' : '#6d6c69' } }; });
      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,560px);min-height:100vh;margin:0 auto;background:#141416;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:20px">
  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Innstillinger</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
    ${modes.map(m => `<button class="kd-inn-mode" data-on-click="${m.handler}" style="${S(m.card)}">${m.fx}<div style="position:relative;z-index:1;display:flex;justify-content:space-between;align-items:flex-start;width:100%">
          <span style="font-size:13px;font-weight:500"><span>${e(m.title)}</span></span>
          <span style="${S(m.iconWrap)}"><span class="ms" style="${S(m.iconStyle)}">${e(m.icon)}</span></span>
        </div>
        <div style="position:relative;z-index:1;display:flex;flex-direction:column;gap:2px;align-items:flex-start">
          <span style="height:34px;overflow:hidden;display:block;min-width:0">
            <span style="${S(m.roll)}"><span style="height:34px;line-height:34px;font-size:28px;letter-spacing:-0.02em">På</span><span style="height:34px;line-height:34px;font-size:28px;letter-spacing:-0.02em">Av</span><span style="height:34px;line-height:34px;font-size:28px;letter-spacing:-0.02em;white-space:nowrap">God morgen</span></span>
          </span>
          <span style="${S(m.subStyle)}"><span>${e(m.sub)}</span></span>
        </div>
      </button>`).join('')}
  </section>

  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2px;padding:4px;border-radius:20px;background:#1c1c1f">
    ${tabs.map(t => `<button data-on-click="goTab" data-arg="${t.k}" style="${S(t.style)}"><span>${e(t.label)}</span></button>`).join('')}
  </div>

  <section style="display:flex;flex-direction:column">
    ${items.map(i => `<button data-on-click="tog" data-arg="${e(i.id)}" data-key="${e(i.id)}" style="${S(i.row)}">
        <span style="${S(i.iconWrap)}"><span class="ms" style="font-size:20px">${e(i.ikon)}</span></span>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;text-align:left">
          <span style="font-size:14px;font-weight:500"><span>${e(i.navn)}</span></span>
          <span style="font-size:12px;color:#8e8d89;text-wrap:pretty"><span>${e(i.tekst)}</span></span>
        </div>
        <span style="${S(i.track)}"><span style="${S(i.knob)}"></span></span>
      </button>`).join('')}
  </section>
</div>`;
    }
  }

  KD.define('kd-innstillinger-card', KDInnstillingerCard, 'KD Innstillinger', 'Nattmodus, privatmodus, automasjoner og varsler – pikselkopi av Claude Design «Innstillinger»');
  KD.sheet('settings', 'kd-innstillinger-card');
})();
