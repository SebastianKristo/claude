/*
 * kd-kamera-card — «Kamera» fra Claude Design, som ark-kort.
 *
 * Finner alle camera.* selv (UniFi Protect: høy oppløsning foretrekkes, medium/low/insecure hoppes over).
 * Stillbilder hentes fra kameraets entity_picture (signert URL) og byttes jevnlig. Enkeltvisning bruker
 * HAs egen strøm (ha-camera-stream) når den finnes, ellers stillbilder.
 * Bevegelse/deteksjon: binary_sensor.<enhet>_motion, _person_detected, _vehicle_detected, _animal_detected,
 * _package_detected (UniFi) eller _person_occupancy/_car_occupancy (Frigate).
 * Hendelsesfanen: Frigate (ws frigate/events/get) når Frigate finnes, ellers deteksjonssensorenes historikk i dag.
 *
 * type: custom:kd-kamera-card
 * kameraer:                         # standard = brukerens fem (UniFi-strøm + Frigate-navn), se DEFAULT_CAMS
 *   - { entity: camera.y, frigate: stue, navn: Stue, ikon: weekend, bevegelse: binary_sensor.z, lys: light.a, snakk: switch.b, meta: '…' }
 *   - camera.x
 * auto: true                        # legg til andre camera.* som ikke står i lista (Frigate-kopier og medium/low hoppes over)
 * skjul: []                         # kamera-ID-er som ikke skal vises
 * navn: { ringeklokke: Inngang }    # nøkkelord i objekt-ID → navn
 * oppdater: 10                      # sek mellom stillbilder i rutenettet
 * oppdater_enkel: 2                 # sek mellom stillbilder i enkeltvisning
 * direkte: true                     # bruk ha-camera-stream i enkeltvisning
 * sirene: null                      # auto: første siren.*
 * bilde_mappe: /config/www/kamera   # camera.snapshot (må være i allowlist_external_dirs)
 * frigate: auto                     # true/false, eller instans-ID
 * lagring: null                     # auto: sensor.*_recording_capacity (sek) → «7 d»
 * fane: null                        # navn på fane 2 (auto: «Frigate» med Frigate, ellers «Hendelser»)
 * oppsett: liste                    # standardvisning: liste | rutenett | masonry | oversikt | fokus | 2x2 | 3kol
 *
 * Per bruker (HA-brukerdata 'kd_kamera'): { liste: [camera.*…], oppsett: 'masonry', bilde: { 'camera.x_high…': 'camera.x_low…' } }
 * «bilde» = egen entitet for stillbildene i oversikten (f.eks. lav oppløsning); strømmen/enkeltvisningen bruker hovedentiteten.
 */
(() => {
  const KD = window.KD;
  if (!KD || customElements.get('kd-kamera-card')) return;
  const { S, e, a, PINK } = KD;
  const t = x => `<span>${e(x)}</span>`;
  const C = { green: KD.C.green, blue: KD.C.blue, amber: KD.C.amber, red: KD.C.red, pink: KD.C.pink };
  const OBJ = { person: ['Person', 'person', C.pink], car: ['Bil', 'directions_car', C.blue], package: ['Pakke', 'package_2', C.amber], animal: ['Dyr', 'pets', C.green] };
  const DET = {
    person: ['_person_detected', '_person_occupancy'], car: ['_vehicle_detected', '_car_occupancy'],
    animal: ['_animal_detected', '_cat_occupancy', '_dog_occupancy'], package: ['_package_detected', '_package_occupancy'],
  };
  const DEFAULT_CAMS = [
    { navn: 'Inngang', ikon: 'door_front', entity: 'camera.ringeklokke_g6_entry_high_resolution_channel', frigate: 'ringeklokke', bevegelse: 'binary_sensor.ringeklokke_g6_entry_motion' },
    { navn: 'Mellomgang', ikon: 'stairs', entity: 'camera.mellomgang_g5_turret_ultra_high_resolution_channel', frigate: 'mellomgang', bevegelse: 'binary_sensor.mellomgang_g5_turret_ultra_motion' },
    { navn: 'Veranda', ikon: 'deck', entity: 'camera.veranda_g6_bullet_high_resolution_channel', frigate: 'veranda', bevegelse: 'binary_sensor.veranda_g6_bullet_motion' },
    { navn: 'Stue', ikon: 'weekend', entity: 'camera.stue_g6_turret_high_resolution_channel', frigate: 'stue', bevegelse: 'binary_sensor.stue_g6_turret_motion' },
    { navn: 'Pakke', ikon: 'package_2', entity: 'camera.ringeklokke_g6_entry_package_camera', frigate: 'ringeklokke_pakke' },
  ];
  const LABEL = { person: 'person', car: 'car', vehicle: 'car', package: 'package', cat: 'animal', dog: 'animal', bird: 'animal', animal: 'animal', horse: 'animal' };
  const ICONS = [[/pakke|package/, 'package_2'], [/inngang|ringeklokke|doorbell|entry|d[øo]r/, 'door_front'], [/mellomgang|trapp|gang|hall|stair/, 'stairs'],
    [/veranda|terrasse|deck|balkong|patio/, 'deck'], [/stue|living/, 'weekend'], [/garasje|garage/, 'garage'], [/kj[øo]kken/, 'countertops'], [/hage|ute|yard|garden|innkj/, 'yard']];
  const slug = s => String(s || '').toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const mmss = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const UD = 'kd_kamera';
  const PINK_GRAD = 'linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20))';
  const RED_E = 'oklch(0.72 0.15 25)', GREEN_E = 'oklch(0.8 0.12 150)';
  const LAYOUTS = [['liste', 'Liste', 'view_agenda'], ['rutenett', 'Rutenett', 'grid_view'], ['masonry', 'Masonry', 'dashboard'], ['oversikt', 'Oversikt', 'view_quilt'], ['fokus', 'Fokus', 'crop_free'], ['2x2', '2×2', 'grid_on'], ['3kol', '3 kolonner', 'view_week']];
  const QUAL = id => /_high|_ultra_high/.test(id) ? 'Høy' : /_medium/.test(id) ? 'Middels' : /_low/.test(id) ? 'Lav' : /_insecure/.test(id) ? 'Usikret' : /_package/.test(id) ? 'Pakke' : '';
  const devOf = obj => obj.replace(/_(ultra_)?(high|medium|low)(_resolution_channel|_resolution|_res)?$/, '').replace(/_insecure$/, '').replace(/_package(_camera)?$/, '');
  const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

  class KDKameraCard extends KD.KDSheet {
    static head = function () { const n = this.cams().length; return ['videocam', 'Kamera', `${n} ${n === 1 ? 'kamera' : 'kameraer'}`]; };
    static defaults = { kameraer: DEFAULT_CAMS, auto: true, skjul: [], navn: { ringeklokke: 'Inngang' }, oppdater: 10, oppdater_enkel: 2, direkte: true, sirene: null, bilde_mappe: '/config/www/kamera', frigate: 'auto', lagring: null, fane: null };
    static sheetCss = `@keyframes kdpop{from{opacity:0;transform:translateY(-6px) scale(.96)}to{opacity:1;transform:none}}.kd-cam-ctl:active,.kd-cam-ev:active,.kd-cam-ed:active{filter:brightness(1.15)}.kd-cam-ed:disabled{opacity:.3}`;
    static getStubConfig() { return {}; }
    getCardSize() { return 14; }
    constructor() { super(); this.state = { tab: 'live', view: 'alle', obj: 'all', fav: {} }; this._tick = [0, 0]; }

    /* ---------- oppdagelse ---------- */
    /** Entitets-ID-er som matcher (uten å gjøre kortet avhengig av alle tilstander). Bufres til antallet entiteter endrer seg. */
    scan(re) {
      const st = this._hass ? this._hass.states : {}, ids = Object.keys(st);
      if (!this._scan || this._scan.n !== ids.length) this._scan = { n: ids.length, m: new Map() };
      const k = String(re);
      if (!this._scan.m.has(k)) this._scan.m.set(k, ids.filter(id => re.test(id)));
      return this._scan.m.get(k);
    }
    /** Brukerens egen liste (Tilpass kameraer), lagret i HA-brukerdata 'kd_kamera' → { liste: ['camera.a', …] }. null = ingen overstyring. */
    userList() {
      const u = KD.ud(this, UD) || {};
      return Array.isArray(u.liste) && u.liste.length ? u.liste.filter(x => typeof x === 'string' && x.startsWith('camera.')) : null;
    }
    cams() {
      const cfg = this.config, user = this.userList();
      const entries0 = (Array.isArray(cfg.kameraer) ? cfg.kameraer : []).map(x => typeof x === 'string' ? { entity: x } : { ...x }).filter(x => x && (x.entity || x.frigate));
      if (user) {
        // brukerlista bestemmer rekkefølge og utvalg; navn/ikon/bevegelse arves fra config-oppføringen for samme kamera
        const cfgFor = id => entries0.find(c => c.entity === id || (c.frigate && 'camera.' + c.frigate === id));
        return this._camInfo(user.filter(id => this.st(id)).map(id => ({ ...(cfgFor(id) || {}), entity: id })), false);
      }
      const hide = new Set(cfg.skjul || []);
      const entries = entries0;
      const used = new Set();
      for (const c of entries) { if (c.entity) used.add(c.entity); if (c.frigate) used.add('camera.' + c.frigate); }
      // UniFi-strømmen først; finnes den ikke, Frigate-kameraet med samme navn
      let list = entries.map(c => {
        const id = c.entity && this.st(c.entity) ? c.entity : c.frigate && this.st('camera.' + c.frigate) ? 'camera.' + c.frigate : null;
        return id ? { ...c, entity: id } : null;
      }).filter(Boolean);
      if (cfg.auto !== false) list = list.concat(this.scan(/^camera\./).filter(id => !used.has(id) && !/_(medium|low)(_resolution_channel|_res)?$|_insecure$|_(medium|low)_resolution/.test(id)).map(id => ({ entity: id })));
      list = list.filter(x => !hide.has(x.entity));
      return this._camInfo(list, true);
    }
    /** Beriker kameraoppføringer med navn, ikon og deteksjonssensorer. dedupe: én per enhet (auto-lista). */
    _camInfo(list, dedupe) {
      const cfg = this.config, seen = new Set(), bild = (KD.ud(this, UD) || {}).bilde || {};
      return list.map(c => {
        const id = c.entity, obj = id.split('.')[1];
        const pkg = /_package(_camera)?$/.test(obj) || /pakke|package/i.test(c.frigate || '');
        const dev = obj.replace(/_(high|medium|low)(_resolution_channel|_res)?$/, '').replace(/_package(_camera)?$/, '');
        const fn = String(this.at(id, 'friendly_name', '') || '');
        let name = c.navn || c.name;
        if (!name && pkg) name = 'Pakke';
        if (!name) for (const [k, v] of Object.entries(cfg.navn || {})) if (obj.includes(k)) { name = v; break; }
        if (!name) name = fn.replace(/\s*(high|medium|low)( resolution( channel)?)?$/i, '').replace(/\s+G\d\b.*$/i, '').trim() || (obj.replace(/_/g, ' ').replace(/^./, m => m.toUpperCase()));
        const hay = `${slug(name)} ${obj}`;
        const icon = c.ikon || c.icon || (ICONS.find(([re]) => re.test(hay)) || [0, 'videocam'])[1];
        const devs = [dev, c.frigate].filter(Boolean);
        const det = {};
        for (const [k, sufs] of Object.entries(DET)) {
          if (pkg && k !== 'package') continue;
          const hit = devs.flatMap(d => sufs.map(x => `binary_sensor.${d}${x}`)).find(x => this.st(x));
          if (hit) det[k] = hit;
        }
        const motion = c.bevegelse || (pkg ? null : devs.map(d => `binary_sensor.${d}_motion`).find(x => this.st(x)) || null);
        const key = dedupe ? dev + (pkg ? '_pkg' : '') : id;
        if (seen.has(key)) return null; seen.add(key);
        const snap = bild[id] && bild[id] !== id && this.st(bild[id]) ? bild[id] : null;
        return { ...c, id, obj, dev, pkg, name, icon, det, motion, snap, frigate: c.frigate || null, key: obj };
      }).filter(Boolean).map((c, i, all) => {
        // pakke-deteksjonen hører til pakkekameraet når enheten har et
        if (!c.pkg && c.det.package && all.some(x => x.pkg && x.dev === c.dev)) { const det = { ...c.det }; delete det.package; return { ...c, det }; }
        return c;
      });
    }
    frigateOn(cams) {
      const f = this.config.frigate;
      if (f === false) return false;
      if (f && f !== 'auto') return true;
      return (cams || this.cams()).some(c => c.frigate && this.st('camera.' + c.frigate)) || this.scan(/^(sensor|update)\.frigate/).length > 0;
    }
    storage() {
      const cfg = this.config;
      if (cfg.lagring) { if (/\./.test(cfg.lagring) && this.st(cfg.lagring)) { const v = this.n(cfg.lagring); return v == null ? '–' : `${Math.round(v / 86400)} d`; } return String(cfg.lagring); }
      const id = this.scan(/^sensor\..*_recording_capacity$/)[0];
      const v = id ? this.n(id) : null;
      return v == null ? '–' : `${Math.round((this.unit(id) === 'd' ? v * 86400 : this.unit(id) === 'h' ? v * 3600 : v) / 86400)} d`;
    }
    img(c, which) {
      const st = this.st(which === 0 && c.snap ? c.snap : c.id);
      if (!st || KD.BAD.has(st.state)) return null;
      const p = st.attributes.entity_picture;
      if (!p) return null;
      const url = this._hass && this._hass.hassUrl ? this._hass.hassUrl(p) : p;
      if (/^data:/.test(url)) return url;
      return url + (url.includes('?') ? '&' : '?') + 'kd=' + this._tick[which];
    }
    model(c) {
      if (c.meta) return c.meta;
      const at = (this.st(c.id) || {}).attributes || {};
      if (at.model_name) return at.model_name;
      const h = this._hass, ent = h && h.entities && h.entities[c.id], dev = ent && h.devices && h.devices[ent.device_id];
      return (dev && (dev.model || dev.name)) || at.brand || '';
    }
    active(c) {
      for (const k of ['person', 'car', 'animal', 'package']) if (c.det[k] && this.v(c.det[k]) === 'on') return k;
      if (c.motion && this.v(c.motion) === 'on') return 'motion';
      return null;
    }

    /* ---------- hendelser ---------- */
    events(cams) {
      const fr = this.frigateOn(cams);
      const ids = []; for (const c of cams) for (const [k, id] of Object.entries(c.det)) ids.push([c, k, id]);
      const sig = ids.map(([, , id]) => { const s = this.st(id); return s ? s.last_changed : ''; }).join(',');
      const key = 'kd-cam-ev|' + (fr ? 'frigate' : ids.map(x => x[2]).join(',')) + '|' + sig + '|' + Math.floor(Date.now() / 60e3);
      const start = dayStart();
      const raw = this.cached(key, 60e3, () => fr ? this.frigateEvents(cams, start) : ids.length ? this.ws({
        type: 'history/history_during_period', start_time: start.toISOString(), end_time: new Date().toISOString(),
        entity_ids: ids.map(x => x[2]), minimal_response: false, no_attributes: false, significant_changes_only: false,
      }).then(r => {
        const out = [];
        for (const [c, k, id] of ids) {
          const arr = (r && r[id]) || []; let on = null;
          const tm = p => p.lu != null ? p.lu * 1000 : p.lc != null ? p.lc * 1000 : new Date(p.last_updated || p.last_changed).getTime();
          const push = (endT) => { const at = on.a || {}; out.push({ id: `${id}@${on.t}`, cam: c.key, obj: k, t: on.t, dur: ((endT || Date.now()) - on.t) / 1000, live: !endT, score: at.event_score != null ? Math.round(at.event_score) : at.score != null ? Math.round(at.score * (at.score <= 1 ? 100 : 1)) : null, zone: Array.isArray(at.zones) ? at.zones.join(', ') : at.zone || at.zones || '' }); };
          for (const p of arr) {
            const s = p.s != null ? p.s : p.state, time = tm(p);
            if (s === 'on' && !on) on = { t: time, a: p.a || p.attributes };
            else if (s !== 'on' && on) { push(time); on = null; }
          }
          if (on && on.t >= start.getTime()) push(null);
        }
        return out.filter(x => x.t >= start.getTime()).sort((p, q) => q.t - p.t);
      }) : Promise.resolve([]), null);
      if (raw) this._lastEv = raw;
      return this._lastEv || [];
    }
    frigateEvents(cams, start) {
      const inst = this.config.frigate && this.config.frigate !== 'auto' && this.config.frigate !== true ? String(this.config.frigate) : 'frigate';
      return this.ws({ type: 'frigate/events/get', instance_id: inst, after: Math.floor(start.getTime() / 1000), limit: 100 }).then(r => {
        const list = typeof r === 'string' ? JSON.parse(r) : Array.isArray(r) ? r : [];
        return list.map(ev => {
          const obj = LABEL[ev.label]; if (!obj) return null;
          const c = cams.find(x => x.frigate === ev.camera) || cams.find(x => x.obj === ev.camera || x.dev === ev.camera || slug(x.name) === ev.camera);
          const sc = ev.top_score != null ? ev.top_score : ev.data && ev.data.top_score != null ? ev.data.top_score : ev.score;
          return { id: ev.id, frigate: true, kind: { cat: 'Katt', dog: 'Hund', bird: 'Fugl', horse: 'Hest' }[ev.label], cam: c ? c.key : ev.camera, camName: c ? c.name : ev.camera, obj, t: ev.start_time * 1000, dur: ((ev.end_time || Date.now() / 1000) - ev.start_time), live: !ev.end_time, score: sc != null ? Math.round(sc * (sc <= 1 ? 100 : 1)) : null, zone: (ev.zones || []).join(', '), fav: !!ev.retain_indefinitely };
        }).filter(Boolean).sort((p, q) => q.t - p.t);
      });
    }

    /* ---------- handlinger ---------- */
    go(ev, arg) {
      const [k, v] = arg.split(':');
      if (k === 'tab') this.setState({ tab: v, view: v === 'frigate' && this.state.view === 'logg' ? 'alle' : this.state.view });
      else if (k === 'view') this.setState({ view: v });
      else if (k === 'obj') this.setState({ obj: v });
    }
    pick(ev, id) {
      const list = this._lastEv || [], x = list.find(y => y.id === id); if (!x) return;
      const cur = this.state.fav[id] != null ? this.state.fav[id] : !!x.fav;
      this.setState({ fav: { ...this.state.fav, [id]: !cur } });
      this.haptic('light');
      if (x.frigate) {
        const inst = this.config.frigate && this.config.frigate !== 'auto' && this.config.frigate !== true ? String(this.config.frigate) : 'frigate';
        this.ws({ type: 'frigate/event/retain', instance_id: inst, event_id: id, retain: !cur }).catch(err => console.warn('kd-kamera retain', err));
      }
    }
    ctl(ev, arg) {
      const [k, id] = arg.split('|');
      if (k === 'bilde') {
        const d = new Date(), stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '_' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + String(d.getSeconds()).padStart(2, '0');
        const dir = String(this.config.bilde_mappe || '/config/www/kamera').replace(/\/$/, '');
        this.haptic('light');
        if (this._hass) this._hass.callService('camera', 'snapshot', { entity_id: id, filename: `${dir}/${id.split('.')[1]}_${stamp}.jpg` })
          .then(() => this.toast('Bilde lagret i ' + dir)).catch(err => this.toast('Fikk ikke lagret bildet: ' + ((err && err.message) || err)));
        return;
      }
      if (!id) { this.toast(k === 'lys' ? 'Ingen lys koblet til kameraet' : k === 'sirene' ? 'Ingen sirene funnet' : ''); return; }
      if (k === 'snakk' && id.startsWith('camera.')) { this.more(id); return; }
      this.toggle(id);
    }
    open(ev, id) { this.setState({ view: id }); }
    goTab(ev, v) { this.go(ev, 'tab:' + v); }

    /* ---------- visningsoppsett (per bruker) ---------- */
    camLayout() { const u = (KD.ud(this, UD) || {}).oppsett || this.config.oppsett; return LAYOUTS.some(x => x[0] === u) ? u : 'liste'; }
    setLayout(ev, v) { if (!LAYOUTS.some(x => x[0] === v) || v === this.camLayout()) return; KD.udSave(this, UD, { ...KD.ud(this, UD), oppsett: v }); this.setState({ pg: 0, fi: 0 }); this.haptic('selection'); }
    feat(ev, k) { if (this.state.feat === k) return; this.setState({ feat: k }); this.haptic('selection'); }
    pageGo(ev, d) { this.setState(s => ({ pg: Math.max(0, (s.pg || 0) + Number(d)) })); this.haptic('selection'); }
    fokScroll(ev, a0, el) {
      el = el || ev.target; const w = el.clientWidth || 1, i = Math.round(el.scrollLeft / w);
      if (i !== (this.state.fi || 0) && i >= 0 && i < el.children.length) this.setState({ fi: i });
    }
    fokGo(ev, d) {
      const el = this.$('[data-kd-fokus]'), n = el ? el.children.length : 0; if (!n) return;
      const i = Math.max(0, Math.min(n - 1, typeof d === 'string' && d[0] === '=' ? Number(d.slice(1)) : (this.state.fi || 0) + Number(d)));
      el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' }); this.setState({ fi: i }); this.haptic('selection');
    }
    layMenu() { this.setState({ layMenu: !this.state.layMenu }); }
    layPick(ev, v) { this.setState({ layMenu: false }); this.setLayout(ev, v); }
    /** Visning som nedtrekksmeny (glass) */
    layoutPickHTML() {
      const cur = this.camLayout(), L = LAYOUTS.find(x => x[0] === cur), open = !!this.state.layMenu;
      return `<div data-key="kam-lay" data-lay="Visning" data-lay-navn="Visning (oppsett)" style="position:relative;display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0;z-index:${open ? 6 : 1}">
    <span style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding-left:4px">Visning</span>
    <button data-on-click="layMenu" style="display:flex;align-items:center;gap:8px;height:38px;padding:0 10px 0 12px;border-radius:19px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.06);font-size:13px;font-weight:500;color:#f2f1ee;min-width:0">
      <span class="ms" style="font-size:18px;color:oklch(0.82 0.1 350)">${L[2]}</span><span style="white-space:nowrap">${e(L[1])}</span>
      <span class="ms" style="font-size:20px;color:#8e8d89;transition:transform .25s;transform:rotate(${open ? 180 : 0}deg)">expand_more</span>
    </button>
    ${open ? `<div data-key="kam-lay-bd" data-on-click="layMenu" style="position:fixed;inset:0;z-index:5"></div>
    <div data-key="kam-lay-menu" style="position:absolute;right:0;top:44px;z-index:6;min-width:200px;padding:6px;border-radius:20px;background:rgba(40,40,44,0.72);backdrop-filter:blur(22px) saturate(190%);-webkit-backdrop-filter:blur(22px) saturate(190%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.3),inset 0 0 0 0.5px rgba(255,255,255,0.18),0 18px 40px rgba(0,0,0,0.45);display:flex;flex-direction:column;gap:2px;animation:kdpop .22s cubic-bezier(.34,1.4,.64,1)">
      ${LAYOUTS.map(([k, label, icon]) => `<button data-on-click="layPick" data-arg="${k}" style="height:42px;padding:0 12px 0 10px;border-radius:14px;display:flex;align-items:center;gap:10px;font-size:14px;font-weight:500;white-space:nowrap;background:${k === cur ? 'rgba(255,255,255,0.1)' : 'transparent'}"><span class="ms" style="font-size:19px;color:${k === cur ? 'oklch(0.82 0.1 350)' : '#c9c7c2'}">${icon}</span><span style="flex:1;text-align:left">${e(label)}</span>${k === cur ? '<span class="ms" style="font-size:18px;color:oklch(0.82 0.1 350)">check</span>' : ''}</button>`).join('')}
    </div>` : ''}
  </div>`;
    }
    /** Én kameraflis. sz: lg | md | sm. tap: 'feat' gjør hele flisa til knapp som løfter kameraet fram. */
    tileHTML(f, o = {}) {
      const sz = o.sz || 'lg', lg = sz === 'lg', sm = sz === 'sm';
      const box = o.h ? `height:${o.h}` : `aspect-ratio:${o.ar || '16/9'}`;
      const badge = sm ? `<span style="display:flex;align-items:center;gap:4px">${f.act ? `<span style="width:18px;height:18px;border-radius:9px;display:grid;place-items:center;background:${a(C.pink, 0.95)};color:#2a1720"><span class="ms" style="font-size:12px;font-variation-settings:'FILL' 1">${e(f.motionIcon)}</span></span>` : `<span style="width:7px;height:7px;border-radius:4px;background:${f.avail ? C.red : '#6d6c69'};box-shadow:0 0 0 2px rgba(0,0,0,0.35)"></span>`}</span>`
        : `<span style="${S({ ...f.live, ...(lg ? {} : { fontSize: 9, padding: '2px 6px' }) })}">${t(f.liveT)}</span>
            <span style="${S({ ...f.motion, ...(lg ? {} : { fontSize: 9, padding: '2px 6px' }) })}"><span class="ms" style="font-size:${lg ? 13 : 11}px;font-variation-settings:'FILL' 1">${t(f.motionIcon)}</span>${lg ? t(f.motionT) : ''}</span>`;
      const tap = o.tap === 'feat' ? ` data-on-click="feat" data-arg="${e(f.key)}"` : '';
      return `<div data-key="${e((o.kp || '') + f.key)}"${tap} style="position:relative;${box};border-radius:${sm ? 14 : lg ? 20 : 18}px;overflow:hidden;background:#0c0c0d;min-width:0;${tap ? 'cursor:pointer;' : ''}${o.style || ''}">
          ${this.slotHTML(f.src, sm ? '' : f.ph)}
          ${o.live ? `<div data-keep data-cam-live="${e(f.id)}" style="position:absolute;inset:0"></div>` : ''}
          <div style="position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,0.35),transparent 30%,transparent 62%,rgba(0,0,0,0.55))"></div>
          <div style="position:absolute;left:${sm ? 7 : lg ? 12 : 10}px;top:${sm ? 7 : lg ? 10 : 9}px;display:flex;align-items:center;gap:${lg ? 6 : 4}px;pointer-events:none">${badge}</div>
          ${sm ? '' : `<button data-on-click="open" data-arg="${e(f.key)}" title="Åpne" style="position:absolute;right:${lg ? 10 : 8}px;top:${lg ? 8 : 6}px;width:${lg ? 34 : 30}px;height:${lg ? 34 : 30}px;border-radius:${lg ? 17 : 15}px;background:rgba(20,20,22,0.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:grid;place-items:center"><span class="ms" style="font-size:${lg ? 18 : 16}px">open_in_full</span></button>`}
          <span style="position:absolute;left:${sm ? 8 : lg ? 12 : 10}px;right:${lg ? '45%' : sm ? '6px' : '10px'};bottom:${sm ? 6 : lg ? 10 : 8}px;font-size:${sm ? 11 : lg ? 13 : 12}px;font-weight:600;pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t(f.name)}</span>
          ${lg ? `<span style="position:absolute;right:12px;bottom:10px;max-width:42%;font-size:11px;color:#c9c7c2;pointer-events:none;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t(f.meta)}</span>` : ''}
          ${o.ring ? `<div style="position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 2px oklch(0.78 0.13 350 / 0.9);pointer-events:none"></div>` : ''}
        </div>`;
    }
    /** Alle-visningen i valgt oppsett */
    gridHTML(feeds) {
      const s = this.state, L = this.camLayout(), n = feeds.length;
      const empty = `<div style="padding:24px 0;text-align:center;font-size:13px;color:#6d6c69">Ingen kameraer funnet</div>`;
      if (!n) return `<section data-lay="Kameraer" style="display:grid;grid-template-columns:minmax(0,1fr)">${empty}</section>`;
      const grid = (cols, html) => `<section data-lay="Kameraer" data-key="kam-grid-${L}" style="display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:8px;min-width:0">${html}</section>`;
      const nav = (btn, mid) => `<div style="display:flex;align-items:center;gap:8px;min-width:0">${btn('-1', 'chevron_left')}<div style="flex:1;min-width:0;display:flex;justify-content:center;align-items:center;gap:6px">${mid}</div>${btn('1', 'chevron_right')}</div>`;
      if (L === 'rutenett') return grid(2, feeds.map(f => this.tileHTML(f, { sz: 'md', ar: '4/3' })).join(''));
      if (L === '3kol') return grid(3, feeds.map(f => this.tileHTML(f, { sz: 'sm', ar: '16/9' })).join(''));
      if (L === 'masonry') {
        const col = c => `<div style="display:flex;flex-direction:column;gap:8px;min-width:0">${feeds.map((f, i) => [f, i]).filter(([, i]) => i % 2 === c).map(([f, i]) => this.tileHTML(f, { sz: 'md', ar: i % 4 === 0 || i % 4 === 3 ? '3/4' : '4/3' })).join('')}</div>`;
        return `<section data-lay="Kameraer" data-key="kam-grid-${L}" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;align-items:start;min-width:0">${col(0)}${col(1)}</section>`;
      }
      if (L === '2x2') {
        const pages = Math.ceil(n / 4), pg = Math.min(s.pg || 0, pages - 1);
        const btn = (d, icon) => { const dis = d < 0 ? pg === 0 : pg >= pages - 1; return `<button class="kd-cam-ed" data-on-click="pageGo" data-arg="${d}" ${dis ? 'disabled' : ''} style="width:40px;height:40px;border-radius:20px;background:#1c1c1f;display:grid;place-items:center;flex:none"><span class="ms" style="font-size:22px">${icon}</span></button>`; };
        return `<section data-lay="Kameraer" data-key="kam-grid-${L}" style="display:flex;flex-direction:column;gap:8px;min-width:0">
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;min-width:0">${feeds.slice(pg * 4, pg * 4 + 4).map(f => this.tileHTML(f, { sz: 'md', ar: '16/10' })).join('')}</div>
      ${pages > 1 ? nav(btn, Array.from({ length: pages }, (_, i) => `<span style="width:${i === pg ? 18 : 7}px;height:7px;border-radius:4px;background:${i === pg ? '#f2f1ee' : '#48474a'};transition:width .3s"></span>`).join('') + `<span style="font-size:12px;color:#8e8d89;margin-left:6px;font-variant-numeric:tabular-nums">${pg * 4 + 1}–${Math.min(n, pg * 4 + 4)} av ${n}</span>`) : ''}
    </section>`;
      }
      if (L === 'oversikt') {
        const F = feeds.find(f => f.key === s.feat) || feeds[0], rest = feeds.filter(f => f !== F);
        return `<section data-lay="Kameraer" data-key="kam-grid-${L}" style="display:flex;flex-direction:column;gap:8px;min-width:0">
      ${this.tileHTML(F, { sz: 'lg', ar: '16/10', live: true, kp: 'feat-' })}
      ${rest.length ? `<div style="display:grid;grid-template-columns:repeat(${rest.length > 4 ? 4 : 3},minmax(0,1fr));gap:6px;min-width:0">${rest.map(f => this.tileHTML(f, { sz: 'sm', ar: '16/10', tap: 'feat' })).join('')}</div>` : ''}
    </section>`;
      }
      if (L === 'fokus') {
        const fi = Math.min(s.fi || 0, n - 1), F = feeds[fi];
        const btn = (d, icon) => { const dis = d < 0 ? fi === 0 : fi >= n - 1; return `<button class="kd-cam-ed" data-on-click="fokGo" data-arg="${d}" ${dis ? 'disabled' : ''} style="width:44px;height:44px;border-radius:22px;background:#1c1c1f;display:grid;place-items:center;flex:none"><span class="ms" style="font-size:24px">${icon}</span></button>`; };
        return `<section data-lay="Kameraer" data-key="kam-grid-${L}" style="display:flex;flex-direction:column;gap:10px;min-width:0">
      <div data-hscroll="1" data-kd-fokus="1" data-on-scroll="fokScroll" style="display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;border-radius:24px;min-width:0">
        ${feeds.map((f, i) => `<div data-key="fok-${e(f.key)}" style="flex:none;width:100%;scroll-snap-align:center;scroll-snap-stop:always">${this.tileHTML(f, { sz: 'lg', ar: '3/4', live: i === fi, kp: 'fk-', style: 'border-radius:24px' })}</div>`).join('')}
      </div>
      ${nav(btn, `<span style="display:flex;flex-direction:column;align-items:center;min-width:0;gap:4px"><span style="font-size:14px;font-weight:500;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t(F.name)}</span><span style="display:flex;gap:5px">${feeds.map((f, i) => `<button data-on-click="fokGo" data-arg="=${i}" title="${e(f.name)}" style="width:${i === fi ? 18 : 7}px;height:7px;border-radius:4px;background:${i === fi ? '#f2f1ee' : f.act ? C.pink : '#48474a'};transition:width .3s"></button>`).join('')}</span></span>`)}
    </section>`;
      }
      return grid(1, feeds.map(f => this.tileHTML(f, { sz: 'lg' })).join(''));
    }

    /* ---------- tilpass kameraer (per bruker) ---------- */
    editTog() { this.setState({ edit: !this.state.edit, pickFor: null, tab: 'live', view: 'alle' }); this.haptic('selection'); }
    /** Lista som redigeres: brukerens egen, ellers det kortet viser nå. */
    editList() {
      const l = this.userList() || this.cams().map(c => c.id);
      return l.filter((x, i) => l.indexOf(x) === i);
    }
    _saveList(l) { KD.udSave(this, UD, { ...KD.ud(this, UD), liste: l }); this.haptic('selection'); }
    /** Andre camera.* for samme enhet (høy/middels/lav oppløsning, usikret …) – kandidater til stillbilde-entitet */
    siblings(id) {
      const h = this._hass, R = (h && h.entities) || {}, dv = R[id] && R[id].device_id, d0 = devOf(id.split('.')[1]);
      return this.find(/^camera\./).filter(x => x !== id && !/_package(_camera)?$/.test(x) && (dv ? R[x] && R[x].device_id === dv : devOf(x.split('.')[1]) === d0));
    }
    camSnap(ev, arg) {
      const k = arg.indexOf('|'), id = arg.slice(0, k), snap = arg.slice(k + 1), u = KD.ud(this, UD) || {}, b = { ...(u.bilde || {}) };
      if (!snap || snap === id) delete b[id]; else b[id] = snap;
      KD.udSave(this, UD, { ...u, bilde: b }); this.haptic('selection');
    }
    edSearch(ev) { this.setState({ edQ: ev.target.value }); }
    camMove(ev, arg) {
      const [i0, d] = arg.split('|'), i = Number(i0), j = i + (d === 'up' ? -1 : 1), l = this.editList();
      if (j < 0 || j >= l.length) return;
      [l[i], l[j]] = [l[j], l[i]];
      this.setState({ pickFor: null }); this._saveList(l);
    }
    camDel(ev, i) { const l = this.editList(); l.splice(Number(i), 1); this.setState({ pickFor: null }); this._saveList(l); }
    camAdd(ev, id) { const l = this.editList(); if (!l.includes(id)) l.push(id); this._saveList(l); }
    camPick(ev, i) { this.setState({ pickFor: this.state.pickFor === String(i) ? null : String(i), edQ: '' }); this.haptic('selection'); }
    camSet(ev, arg) {
      const k = arg.indexOf('|'), i = Number(arg.slice(0, k)), id = arg.slice(k + 1), l = this.editList();
      const j = l.indexOf(id);
      if (j >= 0 && j !== i) l[j] = l[i]; // valgt kamera står allerede i lista → bytt plass
      l[i] = id;
      this.setState({ pickFor: null }); this._saveList(l);
    }
    editReset() { const u = KD.ud(this, UD) || {}; KD.udSave(this, UD, u.oppsett ? { oppsett: u.oppsett } : {}); this.setState({ pickFor: null }); this.haptic('selection'); }
    editHTML() {
      const s = this.state, cfg = this.config, ids = this.editList();
      const cfgE = (Array.isArray(cfg.kameraer) ? cfg.kameraer : []).map(x => typeof x === 'string' ? { entity: x } : { ...x }).filter(Boolean);
      const cfgFor = id => cfgE.find(c => c.entity === id || (c.frigate && 'camera.' + c.frigate === id));
      const info = this._camInfo(ids.map(id => ({ ...(cfgFor(id) || {}), entity: id })), false);
      const all = this.find(/^camera\./).slice().sort((p, q) => {
        const lo = x => /_(medium|low)(_resolution|_res)|_insecure$/.test(x) ? 1 : 0;
        return lo(p) - lo(q) || String(this.fname(p)).localeCompare(String(this.fname(q)), 'nb');
      });
      const ico = (icon, col) => `<span class="ms" style="font-size:20px;color:${col || '#f2f1ee'}">${icon}</span>`;
      const sq = 'width:36px;height:36px;border-radius:18px;display:grid;place-items:center;flex:none;background:rgba(255,255,255,0.06)';
      // stillbilde-entitet: bare når enheten har flere camera.* (f.eks. høy/lav oppløsning)
      const sibs = c => {
        const sb = c.pkg ? [] : this.siblings(c.id); if (!sb.length) return '';
        const cur = c.snap || c.id;
        const chip = (id, label) => { const sel = id === cur; return `<button class="kd-cam-ed" data-on-click="camSnap" data-arg="${e(c.id + '|' + id)}" title="${e(id)}" style="${S({ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, maxWidth: '100%', height: 30, padding: '0 11px', borderRadius: 15, fontSize: 12, fontWeight: 500, background: sel ? 'oklch(0.78 0.13 350 / 0.2)' : 'rgba(255,255,255,0.06)', boxShadow: sel ? 'inset 0 0 0 1.5px oklch(0.78 0.13 350 / 0.7)' : 'none', color: sel ? '#f2f1ee' : '#c9c7c2' })}"><span style="min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(label)}</span></button>`; };
        return `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:0 2px 2px;min-width:0">
          <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:#8e8d89;flex:none"><span class="ms" style="font-size:14px">photo_library</span>Stillbilde</span>
          ${chip(c.id, 'Samme' + (QUAL(c.id) ? ' · ' + QUAL(c.id) : ''))}${sb.map(id => chip(id, QUAL(id) || this.fname(id))).join('')}
        </div>`;
      };
      const rows = info.map((c, i) => {
        const open = s.pickFor === String(i), src = this.img(c, 0), ok = !!this.st(c.id);
        return `<div data-key="ed-${e(c.id)}" style="display:flex;flex-direction:column;gap:10px;padding:8px;border-radius:20px;background:#1c1c1f;box-shadow:${open ? 'inset 0 0 0 1.5px oklch(0.78 0.13 350 / 0.55)' : 'none'};min-width:0">
        <div style="display:grid;grid-template-columns:64px minmax(0,1fr) auto;align-items:center;gap:10px;min-width:0">
          <span style="position:relative;width:64px;height:36px;border-radius:10px;overflow:hidden;background:#0c0c0d;display:grid;place-items:center">${src ? `<img src="${e(src)}" alt="" draggable="false" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">` : `<span class="ms" style="font-size:18px;color:#6d6c69">${e(c.icon)}</span>`}</span>
          <button class="kd-cam-ed" data-on-click="camPick" data-arg="${i}" title="Velg kamera" style="min-width:0;display:flex;align-items:center;gap:6px;text-align:left;padding:2px 0">
            <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
              <span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(c.name)}</span>
              <span style="display:flex;align-items:flex-start;gap:4px;min-width:0;font-size:11px;color:${ok ? '#8e8d89' : RED_E}"><span class="ms" style="font-size:13px;flex:none">videocam</span><span style="min-width:0;overflow:hidden;word-break:break-all;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.35;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${ok ? '' : 'Utilgjengelig · '}${e(c.id)}</span></span>
            </span>
            <span class="ms" style="font-size:18px;color:#8e8d89;flex:none">${open ? 'expand_less' : 'expand_more'}</span>
          </button>
          <span style="display:flex;gap:4px">
            <button class="kd-cam-ed" data-on-click="camMove" data-arg="${i}|up" title="Flytt opp" ${i ? '' : 'disabled'} style="${sq}">${ico('arrow_upward')}</button>
            <button class="kd-cam-ed" data-on-click="camMove" data-arg="${i}|down" title="Flytt ned" ${i < info.length - 1 ? '' : 'disabled'} style="${sq}">${ico('arrow_downward')}</button>
            <button class="kd-cam-ed" data-on-click="camDel" data-arg="${i}" title="Fjern" style="${sq}"><span class="ms" style="font-size:20px;color:${RED_E};font-variation-settings:'FILL' 1">remove_circle</span></button>
          </span>
        </div>
        ${sibs(c)}
        ${open ? `<div style="display:flex;flex-direction:column;gap:8px;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;height:40px;padding:0 14px;border-radius:20px;background:#232326;min-width:0"><span class="ms" style="font-size:18px;color:#8e8d89">search</span><input data-on-input="edSearch" value="${e(s.edQ || '')}" placeholder="Søk etter camera.*" style="flex:1;min-width:0;border:0;outline:none;background:transparent;color:#f2f1ee;font:inherit;font-size:13px"></div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;padding:2px 2px 4px;min-width:0">${all.filter(id => { const q = String(s.edQ || '').trim().toLowerCase(); return !q || id.toLowerCase().includes(q) || String(this.fname(id)).toLowerCase().includes(q); }).map(id => {
          const sel = id === c.id, used = !sel && ids.includes(id);
          return `<button class="kd-cam-ed" data-on-click="camSet" data-arg="${e(i + '|' + id)}" title="${e(id)}" style="${S({ display: 'flex', alignItems: 'center', gap: 6, maxWidth: '100%', minWidth: 0, height: 34, padding: '0 12px', borderRadius: 17, fontSize: 12, fontWeight: 500, background: sel ? 'oklch(0.78 0.13 350 / 0.2)' : 'rgba(255,255,255,0.06)', boxShadow: sel ? 'inset 0 0 0 1.5px oklch(0.78 0.13 350 / 0.7)' : 'none', color: sel ? '#f2f1ee' : used ? '#6d6c69' : '#c9c7c2' })}">${used ? '<span class="ms" style="font-size:14px">swap_vert</span>' : ''}<span style="min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(this.fname(id))}</span></button>`;
        }).join('')}</div></div>` : ''}
      </div>`;
      }).join('');
      const add = all.filter(id => !ids.includes(id));
      const head = x => `<div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:6px 4px 0">${x}</div>`;
      return `${this.layoutPickHTML()}
  ${head('Kameraer som vises')}
  <section style="display:flex;flex-direction:column;gap:8px;min-width:0">
    ${rows || `<div style="padding:24px 0;text-align:center;font-size:13px;color:#6d6c69">Ingen kameraer valgt</div>`}
  </section>
  ${add.length ? `${head('Legg til kamera')}
  <section style="display:flex;flex-direction:column;gap:6px;min-width:0">
    ${add.map(id => `<button class="kd-cam-ed" data-key="add-${e(id)}" data-on-click="camAdd" data-arg="${e(id)}" style="display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px;padding:10px 12px 10px 14px;border-radius:18px;background:#1c1c1f;text-align:left;width:100%;min-width:0">
        <span class="ms" style="font-size:20px;color:#8e8d89">videocam</span>
        <span style="min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(this.fname(id))}</span><span style="font-size:11px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(id)}</span></span>
        <span class="ms" style="font-size:24px;color:${GREEN_E};font-variation-settings:'FILL' 1">add_circle</span>
      </button>`).join('')}
  </section>` : ''}
  <div data-key="kd-edit-bar" style="position:fixed;left:var(--kd-kant,10px);right:var(--kd-kant,10px);bottom:calc(var(--kd-dokk-h, 14px) + 6px + env(safe-area-inset-bottom));z-index:30;max-width:620px;margin:0 auto;box-sizing:border-box;display:flex;align-items:center;gap:10px;padding:8px 8px 8px 16px;border-radius:30px;background:rgba(38,38,41,0.92);backdrop-filter:blur(18px) saturate(160%);-webkit-backdrop-filter:blur(18px) saturate(160%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.07),0 8px 24px rgba(0,0,0,0.35)">
    <span class="ms" style="font-size:20px;color:oklch(0.82 0.1 350);flex:none">tune</span>
    <span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Tilpass kameraer</span><span style="font-size:11px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this.userList() ? 'Din egen rekkefølge' : 'Trykk på navnet for å bytte'}</span></span>
    <button class="kd-cam-ed" data-on-click="editReset" style="height:40px;padding:0 14px;border-radius:20px;background:rgba(255,255,255,0.08);font-size:13px;font-weight:500;flex:none">Nullstill</button>
    <button class="kd-cam-ed" data-on-click="editTog" style="height:40px;padding:0 16px;border-radius:20px;background:${PINK_GRAD};color:#2a1720;font-size:13px;font-weight:600;flex:none">Ferdig</button>
  </div>`;
    }

    /* ---------- tidtaker for stillbilder ---------- */
    onConnect() {
      super.onConnect();
      clearInterval(this._timer);
      let last = [Date.now(), Date.now()];
      this._timer = setInterval(() => {
        if (document.hidden || !this._connected) return;
        const now = Date.now(), single = this.state.tab === 'live' && !['alle', 'logg'].includes(this.state.view);
        const periods = [Math.max(2, Number(this.config.oppdater) || 10) * 1000, Math.max(1, Number(this.config.oppdater_enkel) || 2) * 1000];
        const which = single ? 1 : 0;
        if (now - last[which] >= periods[which]) { last[which] = now; this._tick[which]++; this._queue(); }
      }, 500);
    }
    onDisconnect() { clearInterval(this._timer); super.onDisconnect(); }
    afterRender() {
      const host = this.$('[data-cam-live]');
      if (!host) return;
      const id = host.getAttribute('data-cam-live'), st = this._hass && this._hass.states[id];
      if (!st || !customElements.get('ha-camera-stream') || this.config.direkte === false) { host.innerHTML = ''; return; }
      let el = host.firstElementChild;
      if (!el || el._kdId !== id) {
        host.innerHTML = '';
        el = document.createElement('ha-camera-stream');
        el._kdId = id; el.muted = true; el.controls = false; el.allowExoPlayer = true;
        el.style.cssText = 'display:block;width:100%;height:100%';
        host.appendChild(el);
      }
      el.hass = this._hass;
      if (el.stateObj !== st) el.stateObj = st;
    }

    /* ---------- tom bilde-flate (samme som designets tomme bildefelt) ---------- */
    slotHTML(src, ph) {
      if (src) return `<img src="${e(src)}" alt="" draggable="false" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block">`;
      return `<div style="position:absolute;inset:0;overflow:hidden;background:rgba(127,127,127,.08);font:13px/1.3 system-ui,-apple-system,sans-serif">
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;padding:12px;box-sizing:border-box">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="opacity:.45"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          <div style="max-width:90%;font-weight:500;letter-spacing:.01em;opacity:.75">${e(ph)}</div>
        </div>
        <div style="position:absolute;inset:0;pointer-events:none;border:1.5px dashed currentColor;opacity:.35"></div>
      </div>`;
    }

    body() {
      const s = this.state, cfg = this.config;
      const CAMS = this.cams();
      const byKey = k => CAMS.find(c => c.key === k);
      const single = byKey(s.view);
      const isLive = s.tab === 'live';
      const fr = this.frigateOn(CAMS);
      const live = on => ({ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', padding: '3px 7px', borderRadius: 7, background: on ? C.red : 'rgba(20,20,22,0.6)', color: '#fff' });
      const chip = (k, label, icon, motion) => { const act = s.view === k; return { k, label, icon,
        style: { height: 36, padding: '0 12px', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', flex: 'none', background: act ? PINK : '#1c1c1f', color: act ? '#2a1720' : '#c9c7c2', transition: 'background .2s' },
        dot: { display: motion ? 'block' : 'none', width: 6, height: 6, borderRadius: 3, background: C.red, boxShadow: `0 0 6px ${C.red}` } }; };
      const allEv = this.events(CAMS);
      let ev = allEv.filter(x => (s.obj === 'all' || x.obj === s.obj) && (!single || x.cam === single.key));
      if (!single && isLive && s.view !== 'logg') ev = [];
      const ctrlStyle = (on, col, ok = true) => ({
        style: { height: 72, borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: on ? a(col, 0.18) : '#1c1c1f', boxShadow: on ? `inset 0 0 0 1px ${a(col, 0.5)}` : 'none', transition: 'background .2s', opacity: ok ? 1 : 0.45 },
        iconStyle: { fontSize: 24, color: on ? col : '#f2f1ee', fontVariationSettings: `'FILL' ${on ? 1 : 0}` } });
      const tabs = [['live', 'Direkte'], ['frigate', cfg.fane || (fr ? 'Frigate' : 'Hendelser')]].map(([k, label]) => ({ k, label }));
      const chips = [chip('alle', 'Alle', 'grid_view'), ...CAMS.map(c => chip(c.key, c.name, c.icon, !!this.active(c))), ...(isLive ? [chip('logg', 'Logg', 'list')] : [])];
      const feeds = CAMS.map(c => {
        const act = this.active(c), avail = this.ok(c.id), o = act && act !== 'motion' ? OBJ[act] : null;
        return { key: c.key, id: c.id, act: !!act, avail, name: c.name, src: this.img(c, 0), ph: avail ? `Stillbilde fra ${c.name}` : `${c.name} er utilgjengelig`, liveT: avail ? (this.v(c.id) === 'recording' ? '● OPPTAK' : 'LIVE') : 'AV', live: live(avail),
          motionT: act ? (o ? o[0] : 'Bevegelse') : '', motionIcon: o ? o[1] : 'directions_run',
          motion: { display: act ? 'flex' : 'none', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, padding: '3px 7px', borderRadius: 7, background: a(C.pink, 0.9), color: '#2a1720' },
          meta: act ? 'Bevegelse nå' : this.model(c) };
      });
      let one = {}, controls = [];
      if (single) {
        const avail = this.ok(single.id);
        one = { id: single.id, name: single.name, src: this.img(single, 1), ph: avail ? `Stillbilde fra ${single.name}` : `${single.name} er utilgjengelig`, liveT: !avail ? 'AV' : this.v(single.id) === 'recording' ? '● OPPTAK' : 'LIVE', live: live(avail), meta: this.model(single) };
        const nm = slug(single.name);
        const lys = single.lys || [`light.utelys_${nm}`, `light.${nm}_lys`, `light.${single.dev}_flood_light`, `light.${single.dev}_floodlight`].find(x => this.st(x)) || null;
        const sirene = cfg.sirene || this.scan(/^siren\./)[0] || null;
        const snakk = single.snakk || single.id;
        const on = id => !!id && !id.startsWith('camera.') && this.isOn(id);
        controls = [
          { k: 'snakk', id: snakk, icon: 'mic', label: 'Snakk', ...ctrlStyle(on(snakk), C.blue) },
          { k: 'lys', id: lys, icon: 'flashlight_on', label: 'Lys', ...ctrlStyle(on(lys), C.amber, !!lys) },
          { k: 'sirene', id: sirene, icon: 'campaign', label: 'Sirene', ...ctrlStyle(on(sirene), C.red, !!sirene) },
          { k: 'bilde', id: single.id, icon: 'photo_camera', label: 'Bilde', style: { height: 72, borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#1c1c1f' }, iconStyle: { fontSize: 24 } },
        ];
      }
      const objKeys = Object.keys(OBJ);
      const fStats = [[allEv.length, 'hendelser i dag'], [allEv.filter(x => x.obj === 'person').length, 'personer'], [this.storage(), 'opptak lagret']].map(([v, k]) => ({ v, k }));
      const objFilters = [['all', 'Alle', 'filter_list'], ...objKeys.map(k => [k, OBJ[k][0], OBJ[k][1]])].map(([k, label, icon]) => ({ k, label, icon,
        style: { height: 32, padding: '0 12px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, background: s.obj === k ? '#f4f3ef' : '#1c1c1f', color: s.obj === k ? '#1a1a1c' : '#c9c7c2' } }));
      const showEvents = !isLive || !!single || s.view === 'logg';
      const events = ev.map(x => { const [label0, icon, col] = OBJ[x.obj], label = x.kind || label0, fav = this.state.fav[x.id] != null ? this.state.fav[x.id] : !!x.fav; const c = byKey(x.cam); const d = new Date(x.t); return {
        id: x.id, label, icon, cam: c ? c.name : (x.camName || x.cam), time: `i dag ${KD.hm(d)}`, dur: x.live ? 'nå' : mmss(x.dur), scoreT: x.score != null ? `${x.score} %` : '', zoneT: x.zone || '',
        card: { display: 'flex', alignItems: 'center', gap: 12, padding: 8, paddingRight: 14, borderRadius: 20, background: '#1c1c1f', width: '100%' },
        thumbIcon: { fontSize: 26, color: col, fontVariationSettings: "'FILL' 1" },
        score: { fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 6, background: a(col, 0.18), color: col, display: x.score != null ? null : 'none' },
        zone: { alignSelf: 'flex-start', fontSize: 10, padding: '2px 7px', borderRadius: 6, background: '#262629', color: '#a9a7a2', display: x.zone ? null : 'none' },
        star: { fontSize: 20, color: fav ? C.amber : '#48474a', fontVariationSettings: `'FILL' ${fav ? 1 : 0}` } }; });
      const n = CAMS.length;

      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) ${s.edit ? 'calc(190px + env(safe-area-inset-bottom))' : '40px'};display:flex;flex-direction:column;gap:14px">
  <header style="display:flex;align-items:center;gap:12px;padding:0 4px">
    <span style="width:40px;height:40px;border-radius:20px;background:#e9e8e4;color:#141416;display:grid;place-items:center;flex:none"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">videocam</span></span>
    <div style="flex:1;font-size:26px;font-weight:500;letter-spacing:-0.02em">Kamera</div>
    <span style="font-size:12px;color:#8e8d89;white-space:nowrap">${t(`${n} ${n === 1 ? 'kamera' : 'kameraer'}`)}</span>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>
${s.edit ? this.editHTML() : `
  ${KD.segHTML('kam-fane', tabs.map(x => [x.k, x.label, x.k === 'live' ? 'videocam' : 'history']), s.tab, 'goTab', { pink: true, h: 40 })}

  <nav data-hscroll style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 calc(-1 * var(--kd-kant,10px));padding:0 var(--kd-kant,10px)">
    ${chips.map(c => `<button data-on-click="go" data-arg="view:${e(c.k)}" style="${S(c.style)}"><span class="ms" style="font-size:16px">${t(c.icon)}</span>${t(c.label)}<span style="${S(c.dot)}"></span></button>`).join('')}
  </nav>

  ${isLive && s.view === 'alle' ? this.layoutPickHTML() + this.gridHTML(feeds) : ''}

  ${isLive && single ? `<section data-key="one-${e(one.id)}" style="position:relative;aspect-ratio:4/3;border-radius:24px;overflow:hidden;background:#0c0c0d">
      ${this.slotHTML(one.src, one.ph)}
      <div data-keep data-cam-live="${e(one.id)}" style="position:absolute;inset:0"></div>
      <div style="position:absolute;left:12px;top:12px;display:flex;gap:6px;pointer-events:none"><span style="${S(one.live)}">${t(one.liveT)}</span></div>
      <span style="position:absolute;left:14px;bottom:12px;font-size:15px;font-weight:600;pointer-events:none">${t(one.name)}</span>
      <span style="position:absolute;right:14px;bottom:12px;font-size:11px;color:#c9c7c2;pointer-events:none;white-space:nowrap">${t(one.meta)}</span>
    </section>
    <section style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
      ${controls.map(c => `<button class="kd-cam-ctl" data-on-click="ctl" data-arg="${e(c.k + '|' + (c.id || ''))}" style="${S(c.style)}"><span class="ms" style="${S(c.iconStyle)}">${t(c.icon)}</span><span style="font-size:11px;font-weight:500">${t(c.label)}</span></button>`).join('')}
    </section>
    <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:6px 4px 0">Siste hendelser</div>` : ''}

  ${!isLive ? `<section style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
      ${fStats.map(x => `<div style="display:flex;flex-direction:column;gap:3px;padding:12px 14px;border-radius:18px;background:#1c1c1f"><span style="font-size:20px;font-weight:500;font-variant-numeric:tabular-nums">${t(x.v)}</span><span style="font-size:11px;color:#8e8d89">${t(x.k)}</span></div>`).join('')}
    </section>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${objFilters.map(o => `<button data-on-click="go" data-arg="obj:${o.k}" style="${S(o.style)}"><span class="ms" style="font-size:15px">${t(o.icon)}</span>${t(o.label)}</button>`).join('')}
    </div>` : ''}

  ${showEvents ? `<section style="display:flex;flex-direction:column;gap:8px">
      ${events.map(x => `<button class="kd-cam-ev" data-on-click="pick" data-arg="${e(x.id)}" style="${S(x.card)}">
          <span style="position:relative;width:96px;height:64px;border-radius:12px;overflow:hidden;flex:none;background:#0c0c0d;display:grid;place-items:center">
            <span class="ms" style="${S(x.thumbIcon)}">${t(x.icon)}</span>
            <span style="position:absolute;right:4px;bottom:4px;font-size:9px;font-weight:600;padding:1px 5px;border-radius:5px;background:rgba(0,0,0,0.6);font-variant-numeric:tabular-nums">${t(x.dur)}</span>
          </span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;text-align:left">
            <span style="display:flex;align-items:center;gap:6px;font-size:14px;font-weight:500">${t(x.label)}<span style="${S(x.score)}">${t(x.scoreT)}</span></span>
            <span style="font-size:12px;color:#8e8d89">${t(x.cam)} · ${t(x.time)}</span>
            <span style="${S(x.zone)}">${t(x.zoneT)}</span>
          </span>
          <span class="ms" style="${S(x.star)}">star</span>
        </button>`).join('')}
      ${!ev.length ? `<div style="padding:24px 0;text-align:center;font-size:13px;color:#6d6c69">Ingen hendelser</div>` : ''}
    </section>` : ''}

  ${isLive && s.view === 'alle' ? `<button class="kd-cam-ed" data-key="kd-edit-btn" data-on-click="editTog" style="display:flex;align-items:center;justify-content:center;gap:8px;height:48px;border-radius:24px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04);color:#a9a7a2;font-size:13px;font-weight:500"><span class="ms" style="font-size:18px">tune</span>Tilpass kameraer</button>` : ''}`}
</div>`;
    }
  }

  KD.define('kd-kamera-card', KDKameraCard, 'KD Kamera', 'Kamera: stillbilder fra alle kameraene, enkeltvisning med kontroller og hendelser fra Frigate/UniFi.');
  KD.sheet('cam', 'kd-kamera-card');
})();
