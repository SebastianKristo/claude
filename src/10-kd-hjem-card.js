/*
 * kd-hjem-card — «Hjem mobil» fra Claude Design, som ett kort.
 *
 * type: custom:kd-hjem-card        # virker uten mer konfig (brukerens entiteter er standard)
 * ark: intern                       # intern (standard): arkene åpnes i kortets eget bunnark
 *                                   # bubble: bare naviger til #hash (bruk bubble-card-popups med kd-*-kort)
 * meg: sebastian                    # standard: personen som hører til innlogget bruker
 * personer: [...]                   # se DEFAULT_PERSONS
 * servere: [{ navn, server, ikon, sti }]  # som familiekortet: server = navnet i companion-appen
 * server_sti: dashboard-mysmarthome        # siden som åpnes på den andre serveren (standard: denne)
 * server_navn: Strömstad                   # overstyr hvilken server du står på (standard: location_name)
 * haptikk: false                           # slå av vibrasjon
 * hjem: { venstre: [stue, inngang, ute], hoyre: [pult, kjokken] }
 * etasjer: { '1': [...], '2': [...] }
 * rom: { stue: { navn, ikon, farge, temp, fukt, sett, lys } }   # overstyr KD.ROOMS
 * + entitets-nøklene i `defaults` under.
 */
(() => {
  const KD = window.KD;
  const { S, e, nf, hh, C, a, PINK } = KD;

  const DEFAULT_PERSONS = [
    { id: 'sebastian', navn: 'Sebastian', person: 'person.sebastian_kristo_jemtland', hjemme: 'switch.sebastian_posisjon_hjemme_borte', sovn: 'switch.homey_logic_sebastian_sovn_vaken', farge: 'oklch(0.55 0.08 40)' },
    { id: 'cybele', navn: 'Cybele', person: 'person.cybele_kristo', hjemme: 'switch.cybele_posisjon_hjemme_borte', sovn: 'switch.homey_logic_cybele_sovn_vaken', farge: 'oklch(0.5 0.08 350)' },
    { id: 'rune', navn: 'Rune', person: 'person.rune_jemtland', hjemme: 'switch.rune_posisjon_hjemme_borte', sovn: 'switch.homey_logic_rune_sovn_vaken', farge: 'oklch(0.5 0.05 250)' },
  ];
  // Som familiekortet i ki-cards: navn = det som vises, server = navnet serveren har i companion-appen.
  const DEFAULT_SERVERS = [
    { navn: 'Oslo' },
    { navn: 'Strömstad', server: 'Strømstad' },
    { navn: 'Toten' },
  ];
  const vask = t => String(t || '').toLowerCase().replace(/ö/g, 'ø').replace(/ä/g, 'æ').trim();
  const SERVER_IKON = [[/oslo/, 'location_city'], [/str[øo]mstad/, 'sailing'], [/toten/, 'agriculture'], [/hytt/, 'cottage']];
  const FLOORS = [['hjem', 'Hjem'], ['1', '1. etg'], ['2', '2. etg'], ['aktuelt', 'Aktuelt']];
  const COND = {
    'clear-night': ['Klart', 'clear_night'], cloudy: ['Skyet', 'cloud'], exceptional: ['Ekstremvær', 'warning'], fog: ['Tåke', 'foggy'],
    hail: ['Hagl', 'weather_hail'], lightning: ['Torden', 'thunderstorm'], 'lightning-rainy': ['Torden og regn', 'thunderstorm'],
    partlycloudy: ['Delvis skyet', 'partly_cloudy_day'], pouring: ['Kraftig regn', 'rainy'], rainy: ['Regn', 'rainy'], snowy: ['Snø', 'weather_snowy'],
    'snowy-rainy': ['Sludd', 'weather_mix'], sunny: ['Sol', 'sunny'], windy: ['Vind', 'air'], 'windy-variant': ['Vind', 'air'],
  };
  // hash → ark-nøkkel
  const HASH = { strom: 'strom', alarm: 'sik', sikkerhet: 'sik', vanning: 'vann', rolf: 'vac', stovsuger: 'vac', media: 'media', tesla: 'car', bil: 'car', server: 'server', settings: 'settings', innstillinger: 'settings', kalender: 'cal', personer: 'person', person: 'person', weather: 'vaer', vaer: 'vaer', lys: 'lys', kamera: 'cam', klima: 'klima', soppel: 'trash', gjoremal: 'todo', planter: 'plants', sovn: 'sleep', '3d': 'printer', printer: 'printer', gressklipper: 'mower', plen: 'mower' };
  const SHEET_HASH = { strom: 'strom', sik: 'alarm', vann: 'vanning', vac: 'rolf', media: 'media', car: 'tesla', server: 'server', settings: 'settings', cal: 'kalender', person: 'personer', vaer: 'weather', lys: 'lys', cam: 'kamera', klima: 'klima', trash: 'soppel', todo: 'gjoremal', plants: 'planter', sleep: 'sovn', printer: '3d', mower: 'gressklipper' };
  const HEADS = { strom: ['bolt', 'Strøm', 'Forbruk og priser'], sik: ['shield', 'Sikkerhet', ''], vann: ['sprinkler', 'Vanning', 'Hage og plen'], vac: ['cleaning_services', 'Støvsuger', 'Sir Sweeps'], media: ['music_note', 'Media', 'Høyttalere og TV'], car: ['directions_car', 'Bil', 'Tesla Model Y'], server: ['dns', 'Server', 'Proxmox · UniFi'], settings: ['tune', 'Innstillinger', 'Dashbord'], cal: ['calendar_month', 'Kalender', 'Familie og skole'], person: ['person', 'Tilstedeværelse', 'Mobil, sone og søvn'], vaer: ['partly_cloudy_day', 'Vær', 'Strømstad'], lys: ['lightbulb', 'Lys', 'Alle rom'], cam: ['videocam', 'Kamera', ''], klima: ['thermostat', 'Klima', 'Energimotoren'], trash: ['delete', 'Søppel', 'Tømmeplan'], todo: ['checklist', 'Gjøremål', 'Store og personlige'], plants: ['potted_plant', 'Planter', 'Jordfukt og vanning'], sleep: ['bedtime', 'Søvn', 'Søvn og vekking'], printer: ['print', '3D-printer', 'Creality K2'], mower: ['grass', 'Gressklipper', 'Robotklipper'] };
  const TAGS = { strom: 'kd-strom-card', sik: 'kd-sikkerhet-card', vann: 'kd-vanning-card', vac: 'kd-stovsuger-card', media: 'kd-media-card', car: 'kd-bil-card', server: 'kd-server-card', settings: 'kd-innstillinger-card', cal: 'kd-kalender-card', person: 'kd-person-card', vaer: 'kd-vaer-card', lys: 'kd-lys-card', cam: 'kd-kamera-card', klima: 'kd-klima-card', trash: 'kd-soppel-card', todo: 'kd-gjoremal-card', plants: 'kd-planter-card', sleep: 'kd-sovn-card', printer: 'kd-printer-card', rom: 'kd-rom-card', mower: 'kd-gressklipper-card' };
  const FRACTION = {
    restavfall: ['Restavfall', '#8e8d89'], plastemballasje: ['Plastavfall', 'oklch(0.76 0.13 350)'], plast: ['Plastavfall', 'oklch(0.76 0.13 350)'],
    papir_og_papp: ['Papp og papir', 'oklch(0.8 0.12 250)'], papir: ['Papp og papir', 'oklch(0.8 0.12 250)'], glass_og_metallemballasje: ['Glass og metall', 'oklch(0.8 0.12 150)'], matavfall: ['Matavfall', 'oklch(0.82 0.12 75)'],
  };
  const DAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];

  // Timepriser fra [{start, end, value}] (time eller kvarter) → { 'YYYY-MM-DD': [24 × snitt] }
  const hourly = (list, mul = 1) => {
    const out = {};
    if (!Array.isArray(list)) return out;
    for (const p of list) {
      if (!p || p.value == null) continue;
      const d = new Date(p.start || p.startsAt || p.time); if (isNaN(d)) continue;
      const k = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(), h = d.getHours();
      const day = out[k] || (out[k] = Array.from({ length: 24 }, () => [0, 0]));
      day[h][0] += Number(p.value) * mul; day[h][1]++;
    }
    for (const k in out) out[k] = out[k].map(([s, n]) => n ? s / n : null);
    return out;
  };
  const dayKey = (d) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  const isOre = (u, A) => KD.isOre(u, A);
  // Tilpass Hjem: seksjoner, fliser og delene av setningen øverst
  const SEK_KEYS = ['personer', 'prosa', 'rom', 'soppel', 'strom'];
  const PROSA_KEYS = ['ute', 'strom', 'effekt', 'lys', 'hendelser'];
  const TILE_V = ['las', 'romV', 'alarm'], TILE_H = ['romH', 'kamera', 'gjoremal'];
  const HLABEL = {
    sek: { personer: ['group', 'Personer'], prosa: ['notes', 'Setningen øverst'], rom: ['meeting_room', 'Rom og fliser'], soppel: ['delete', 'Søppel'], strom: ['bolt', 'Strømpriser'] },
    flis: { las: ['key', 'Dørlås'], romV: ['weekend', 'Romkort (venstre)'], alarm: ['shield', 'Alarm'], romH: ['desk', 'Romkort (høyre)'], kamera: ['videocam', 'Kamera'], gjoremal: ['handyman', 'Gjøremål'] },
    prosa: { ute: ['thermostat', 'Ute-temperatur'], strom: ['payments', 'Strømpris'], effekt: ['bolt', 'Effekt (W)'], lys: ['lightbulb', 'Lys på'], hendelser: ['event', 'Hendelser i dag'] },
  };
  /** brukerens rekkefølge, men bare gyldige nøkler og alle med */
  const norm = (list, def) => { const out = (Array.isArray(list) ? list : []).filter((k, i, a) => def.includes(k) && a.indexOf(k) === i); for (const k of def) if (!out.includes(k)) out.push(k); return out; };

  class KDHjem extends KD.KDCard {
    static defaults = {
      ark: 'intern',
      vaer: 'weather.forecast_home',
      ute_temp: 'sensor.vaervarsel_temperature',
      strom_profil: 'auto',   // no | se | auto (landet i HA / sensorene som finnes). pris, pris_total, pris_spot, pris_norges overstyrer profilen
      effekt: 'sensor.strommaler_effekt',
      lys_totalt: 'sensor.hele_huset_lys',
      kalender_sensor: 'sensor.alle_kalendere',
      kalendere: ['calendar.sebastian_kristo_no', 'calendar.oslomet_timeplan', 'calendar.birthdays'],
      las: 'lock.dorlas_blatann',
      las_batteri: 'sensor.dorlas_wifi_battery',
      las_sist: 'sensor.ansiktsgjenkjenning_dorlas_sist_last_opp_av',
      autolas: null,
      alarm: 'alarm_control_panel.alarm',
      alarm_gammel: 'select.alarm_homealarm_state',
      bevegelse: ['binary_sensor.stue_g6_turret_motion', 'binary_sensor.mellomgang_g5_turret_ultra_motion', 'binary_sensor.ringeklokke_g6_entry_motion'],
      gjoremal: 'todo.gjoremal',
      soppel: ['sensor.restavfall', 'sensor.papir_og_papp', 'sensor.plastemballasje', 'sensor.glass_og_metallemballasje'],
      hjem: { venstre: ['stue', 'inngang', 'ute'], hoyre: ['pult', 'kjokken'] },
      etasjer: { '1': ['stue', 'kjokken', 'inngang', 'do', 'vaskegang'], '2': ['pult', 'soverom', 'bad', 'cybele_soverom', 'rune_soverom', 'rune_kontor'] },
      sover_nar: 'on',
      kant: 10,
      dokk_stil: 'bred',  // bred (fyller bredden, som Apple Music) | kompakt (designets glassdokk)
      dokk_navn: true,    // vis navn under ikonene i dokken (kan også slås av/på i «Tilpass dokken»)
      dokk_krymp: true,   // krymp dokken når man scroller nedover
      dokk: [
        { ikon: 'home', navn: 'Hjem', hjem: true },
        { ikon: 'power', navn: 'Strøm', ark: 'strom' },
        { ikon: 'music_note', navn: 'Musikk', ark: 'media' },
        { ikon: 'directions_car', navn: 'Bil', ark: 'car' },
        { ikon: 'dns', navn: 'Server', ark: 'server' },
        { ikon: 'tune', navn: 'Innstillinger', ark: 'settings' },
      ],
      meny: [
        { ikon: 'cleaning_services', navn: 'Støvsuger', ark: 'vac', farge: 'oklch(0.8 0.12 150)', prikk: ['binary_sensor.sir_sweeps_a_lot_water_shortage'], prikk_av: ['binary_sensor.sir_sweeps_a_lot_water_box_attached'] },
        { ikon: 'thermostat', navn: 'Klima', ark: 'klima', farge: 'oklch(0.72 0.15 25)' },
        { ikon: 'delete', navn: 'Søppel', ark: 'trash', farge: '#c9c7c2' },
        { ikon: 'sprinkler', navn: 'Vanning', ark: 'vann', farge: 'oklch(0.8 0.12 235)' },
        { ikon: 'calendar_month', navn: 'Kalender', ark: 'cal', farge: 'oklch(0.78 0.13 350)' },
        { ikon: 'potted_plant', navn: 'Planter', ark: 'plants', farge: 'oklch(0.8 0.12 150)' },
        { ikon: 'bedtime', navn: 'Søvn', ark: 'sleep', farge: 'oklch(0.72 0.1 275)' },
        { ikon: 'print', navn: '3D-printer', ark: 'printer', farge: 'oklch(0.82 0.12 75)' },
        { ikon: 'checklist', navn: 'Gjøremål', ark: 'todo', farge: '#c9c7c2' },
        { ikon: 'grass', navn: 'Gressklipper', ark: 'mower', farge: 'oklch(0.8 0.12 150)' },
      ],
      bilde: true,
    };
    static getStubConfig() { return {}; }

    constructor() {
      super();
      this.state = { floor: 'hjem', tab: 0 };
      this._onLoc = () => this._syncHash();
    }
    onConnect() {
      window.addEventListener('location-changed', this._onLoc);
      window.addEventListener('hashchange', this._onLoc);
      window.addEventListener('popstate', this._onLoc);
      this.lastY = window.scrollY;
      this._onWinScroll = () => { const y = window.scrollY, d = y - this.lastY; if (Math.abs(d) > 6) { if (!this.dockOpts().krymp) { this.lastY = y; if (this.state.compact) this.setState({ compact: false }); return; } const c = d > 0 && y > 60; if (c !== this.state.compact) this.setState({ compact: c }); this.lastY = y; } };
      window.addEventListener('scroll', this._onWinScroll, { passive: true });
      this._dockDragInit();
      this._onSheetScroll = (ev) => { const t = ev.composedPath()[0]; if (t && t.matches && t.matches('[data-sheet-scroll]')) { cancelAnimationFrame(this._bhRaf); this._bhRaf = requestAnimationFrame(() => KD.scrollSheetTop(this.shadowRoot, t.scrollTop)); } };
      this.shadowRoot.addEventListener('scroll', this._onSheetScroll, { capture: true, passive: true });
      this._onChildClose = (ev) => { if (ev.composedPath().includes(this._sheetEl)) { ev.stopPropagation(); this.closeSheet(); } };
      this.shadowRoot.addEventListener('kd-close', this._onChildClose, true);
      setTimeout(() => this._syncHash(), 0);
      this._paintPage(true);
    }
    /* Samme bakgrunn over hele siden (også bak skjult topp og statuslinje), så kortet ikke har synlige kanter.
       bakgrunn: false slår det av; en farge overstyrer. Settes tilbake når kortet forsvinner. */
    _paintPage(on) {
      const col = this.config.bakgrunn === false ? null : (this.config.bakgrunn || '#141416');
      const root = document.documentElement, VARS = ['--lovelace-background', '--primary-background-color', '--app-header-background-color', '--kiosk-header-color', '--view-background', '--secondary-background-color'];
      const meta = document.querySelector('meta[name="theme-color"]');
      // Tema kan være satt direkte på elementer nærmere kortet (home-assistant, hui-root, hui-view …) – sett variablene
      // på hele kjeden opp fra kortet, ellers vinner temaet og det blir en fargekant mellom kortet og siden.
      const chain = () => { const out = [root]; let n = this; while (n) { n = n.parentNode || n.host; if (n && n.nodeType === 1 && n.style) out.push(n); } return out; };
      if (on && col) {
        if (!this._oldVars) {
          this._painted = chain();
          this._oldVars = this._painted.map(el => [el, VARS.map(v => [v, el.style.getPropertyValue(v)]), el.style.background]);
          this._oldMeta = meta && meta.getAttribute('content'); this._oldBody = document.body.style.background;
        }
        for (const el of this._painted) VARS.forEach(v => el.style.setProperty(v, col));
        for (const el of this._painted) if (/^(HUI-VIEW|HUI-PANEL-VIEW|HUI-MASONRY-VIEW|HUI-SECTIONS-VIEW|HUI-VIEW-CONTAINER|HUI-VIEW-BACKGROUND)$/.test(el.tagName)) el.style.background = col;
        document.body.style.background = col;
        if (meta) meta.setAttribute('content', col);
      } else if (this._oldVars) {
        for (const [el, vars, bg] of this._oldVars) { vars.forEach(([v, x]) => x ? el.style.setProperty(v, x) : el.style.removeProperty(v)); if (el !== root) el.style.background = bg || ''; }
        document.body.style.background = this._oldBody || '';
        if (meta && this._oldMeta != null) meta.setAttribute('content', this._oldMeta);
        this._oldVars = null; this._painted = null;
      }
    }
    onDisconnect() {
      window.removeEventListener('location-changed', this._onLoc);
      window.removeEventListener('hashchange', this._onLoc);
      window.removeEventListener('popstate', this._onLoc);
      window.removeEventListener('scroll', this._onWinScroll);
      this._paintPage(false);
    }
    set hass(h) { super.hass = h; if (this._sheetEl) this._sheetEl.hass = h; }
    get hass() { return this._hass; }

    /* ---------- konfig ---------- */
    /** alle personer: config/standard + person.*-entiteter brukeren har lagt til */
    get personsAll() {
      const base = (this.config.personer || DEFAULT_PERSONS).map(p => ({ ...(DEFAULT_PERSONS.find(d => d.id === p.id) || {}), ...p }));
      const PAL = ['oklch(0.55 0.08 40)', 'oklch(0.5 0.08 350)', 'oklch(0.5 0.05 250)', 'oklch(0.55 0.08 150)', 'oklch(0.55 0.09 90)', 'oklch(0.5 0.08 300)'];
      const known = new Set(base.map(p => p.person));
      const extra = Object.keys(this.all()).filter(id => id.startsWith('person.') && !known.has(id))
        .map((id, i) => ({ id, navn: String(this.fname(id) || id.slice(7)).split(' ')[0], person: id, farge: PAL[(base.length + i) % PAL.length], _ekstra: true }));
      return [...base, ...extra];
    }
    /** personene som vises (Tilpass Hjem → Personer; standard = config/standardlisten) */
    get persons() {
      const all = this.personsAll, HU = KD.ud(this, 'kd_hjem');
      if (!Array.isArray(HU.personer)) return all.filter(p => !p._ekstra);
      return HU.personer.map(id => all.find(p => p.id === id)).filter(Boolean);
    }
    get meId() {
      if (this.config.meg) return this.config.meg;
      const all = this.personsAll, uid = this._hass && this._hass.user && this._hass.user.id;
      const hit = all.find(p => uid && this.at(p.person, 'user_id') === uid);
      return hit ? hit.id : all[0].id;
    }
    /** Hvor personen er, som familiekortet i ki-cards: hjemme (søvn/våken), en sone med sonens eget ikon, eller borte (fly) */
    placeOf(p) {
      const ps = this.personState(p), v = this.v(p.person);
      if (ps.home) return ps.sleep ? { navn: 'Sover', ms: 'bedtime', col: 'oklch(0.75 0.12 275)' } : { navn: 'Hjemme', ms: 'home', col: 'oklch(0.8 0.12 150)' };
      if (!v || ['not_home', 'unknown', 'unavailable'].includes(v)) return { navn: 'Borte', ms: 'flight', col: 'oklch(0.68 0.2 285)' };
      const all = this.all();
      const z = Object.keys(all).find(id => id.startsWith('zone.') && (all[id].attributes.friendly_name === v || id === 'zone.' + v));
      return { navn: v, mdi: z && all[z].attributes.icon, ms: 'location_on', col: 'oklch(0.75 0.12 245)' };
    }
    placeIcon(pl, size) { return pl.mdi ? `<ha-icon icon="${e(pl.mdi)}" style="--mdc-icon-size:${size}px;width:${size}px;height:${size}px;display:flex;color:${pl.col}"></ha-icon>` : `<span class="ms" style="font-size:${size}px;color:${pl.col};font-variation-settings:'FILL' 1">${pl.ms}</span>`; }
    personState(p) {
      const home = p.hjemme && this.st(p.hjemme) ? this.v(p.hjemme) === 'on' : this.v(p.person) === 'home';
      const sleep = p.sovn && this.st(p.sovn) ? this.v(p.sovn) === (this.config.sover_nar || 'on') : false;
      return { home, sleep };
    }
    get roomsAll() { return KD.rooms(this.config.rom); }
    /** Profilbilde (entity_picture) som bakgrunn; forbokstaven skjules når bildet finnes */
    pic(p) {
      if (this.config.bilde === false) return '';
      const u = p.bilde || this.at(p.person, 'entity_picture');
      if (!u) return '';
      const url = this._hass && this._hass.hassUrl ? this._hass.hassUrl(u) : u;
      return `background-image:url('${e(String(url).replace(/'/g, '%27'))}');background-size:cover;background-position:center;color:transparent;`;
    }

    /* ---------- ark ---------- */
    _syncHash() {
      if (this.config.ark === 'bubble') return;
      const h = decodeURIComponent((location.hash || '').slice(1));
      if (!h) { this._pushedHash = false; if (this.state.sheetOpen) this.setState({ sheetOpen: false }); return; }
      let key = HASH[h], room = null, pid = null;
      if (!key && /^person-/.test(h)) { key = 'person'; pid = h.slice(7); }
      if (!key) { const r = Object.values(this.roomsAll).find(r => (r.hash || '#' + r.id) === '#' + h || r.id === h); if (r) { key = 'rom'; room = r.id; } }
      if (!key) return;
      const q = new URLSearchParams(location.search);
      const personId = key === 'person' ? (pid || q.get('person') || this.state.personId || this.meId) : this.state.personId;
      if (this.state.sheetOpen && this.state.sheetFile === key && (key !== 'rom' || this.state.sheetRoomId === room) && (key !== 'person' || this.state.personId === personId)) return;
      this.openSheet(key, { roomId: room, personId, fromHash: true });
    }
    openSheet(file, opts = {}) {
      if (this.config.ark === 'bubble') { if (this.state.menu || this.state.serverMenu || this.state.dockEdit) this.setState({ menu: false, serverMenu: false, dockEdit: false }); this.nav('#' + (file === 'rom' ? ((this.roomsAll[opts.roomId] || {}).hash || '#' + opts.roomId).slice(1) : file === 'person' && opts.personId ? 'person-' + opts.personId : SHEET_HASH[file] || file)); return; }
      const patch = { sheetFile: file, menu: false, serverMenu: false, dockEdit: false };
      if (opts.roomId) patch.sheetRoomId = opts.roomId;
      if (opts.personId) patch.personId = opts.personId;
      if (file !== this.state.sheetFile || opts.roomId !== undefined) { const sc = this.$('[data-sheet-scroll]'); if (sc) sc.scrollTop = 0; }
      this.setState(patch);
      this._mountSheet(file, patch.sheetRoomId || this.state.sheetRoomId, patch.personId || this.state.personId);
      if (!opts.fromHash) {
        const hash = file === 'rom' ? (this.roomsAll[patch.sheetRoomId] || {}).hash || '#' + patch.sheetRoomId : file === 'person' && patch.personId ? '#person-' + patch.personId : '#' + (SHEET_HASH[file] || file);
        history.pushState(null, '', location.pathname + location.search + hash); this._pushedHash = true;
      }
      setTimeout(() => { this.setState({ sheetOpen: true }); this._animHead = true; }, 30);
    }
    closeSheet() {
      this.setState({ sheetOpen: false });
      if (!location.hash) return;
      if (this._pushedHash) { this._pushedHash = false; history.back(); return; } // vi la til hashen → tilbake fjerner den
      history.replaceState(null, '', location.pathname + location.search);
      window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: true } }));
    }
    _mountSheet(file, roomId, personId) {
      const tag = KD.SHEETS[file] || TAGS[file] || ('kd-' + file + '-card');
      const key = file + '|' + (roomId || '') + '|' + (personId || '');
      if (this._sheetKey === key && this._sheetEl) return;
      this._sheetKey = key;
      const host = () => this.$('[data-sheet-host]');
      const mount = () => {
        const h = host(); if (!h) return requestAnimationFrame(mount);
        h.innerHTML = '';
        if (!customElements.get(tag)) {
          h.innerHTML = `<div style="padding:40px 20px;color:#8e8d89;font-size:14px;text-align:center">Kortet ${e(tag)} er ikke lastet.</div>`; this._sheetEl = null;
          customElements.whenDefined(tag).then(() => { if (this._sheetKey === key) { this._sheetKey = null; this._mountSheet(file, roomId, personId); } });
          return;
        }
        const el = document.createElement(tag);
        const base = (this.config.ark_config || {})[file] || {};
        const cfg = { ...base, header: false, embedded: true };
        if (file === 'rom') { const r = this.roomsAll[roomId] || { id: roomId }; Object.assign(cfg, { rom: roomId, navn: r.navn, ikon: r.ikon, farge: r.farge, temp: r.temp, fukt: r.fukt, sett: r.sett, lys: r.lys }, ((this.config.ark_config || {}).rom_per || {})[roomId] || {}); }
        if (file === 'person') cfg.person = personId || this.meId;
        el.setConfig(cfg);
        if (this._hass) el.hass = this._hass;
        h.appendChild(el);
        this._sheetEl = el;
        this._queue();
      };
      mount();
    }
    sheetHeadVals() {
      const s = this.state;
      if (s.sheetFile === 'rom') {
        const r = this.roomsAll[s.sheetRoomId] || {}; const L = r.id ? KD.roomLive(this, r) : {};
        return { icon: r.ikon || 'meeting_room', title: r.navn || 'Rom', sub: L.temp != null ? `${Math.round(L.temp)}° · ${L.hum != null ? Math.round(L.hum) : '–'} %` : '' };
      }
      let h = HEADS[s.sheetFile] || ['home', '', ''];
      if (this._sheetEl && this._sheetEl.sheetHead) { try { const x = this._sheetEl.sheetHead(); if (x && x[1]) h = x; } catch (err) { } }
      return { icon: h[0], title: h[1], sub: h[2] };
    }

    /* ---------- handlinger ---------- */
    toggleServer() {
      // dobbelttrykk på navnet → innstillinger (config.dobbeltrykk, standard /config)
      const t = Date.now();
      if (t - (this._titleTap || 0) < 380) { this._titleTap = 0; this.setState({ serverMenu: false }); return this.nav(this.config.dobbeltrykk || '/config'); }
      this._titleTap = t;
      this.setState({ serverMenu: !this.state.serverMenu });
    }
    /* Serverlista normalisert (tekst «Oslo, Strömstad=Strømstad» eller liste) */
    servers() {
      let l = this.config.servere || DEFAULT_SERVERS;
      if (typeof l === 'string') l = l.split(',').map(d => d.trim()).filter(Boolean).map(d => { const [navn, server] = d.split('=').map(x => x.trim()); return { navn, server: server || navn }; });
      return (Array.isArray(l) ? l : []).map(x => typeof x === 'string' ? { navn: x, server: x } : { ...x, navn: x.navn || x.server, server: x.server || x.navn }).filter(x => x.navn);
    }
    /* Serveren vi står på: installasjonens navn (location_name) sammenlignet med lista. server_navn overstyrer. */
    currentServer(list) {
      const her = this.config.server_navn || (this._hass && this._hass.config && this._hass.config.location_name) || '';
      const i = list.findIndex(x => vask(x.navn) === vask(her) || vask(x.server) === vask(her));
      return { i, navn: i >= 0 ? list[i].navn : her };
    }
    pickServer(ev, i) {
      const list = this.servers(), srv = list[+i];
      this.setState({ serverMenu: false });
      if (!srv || +i === this.currentServer(list).i) return;
      this.haptic('selection');
      if (srv.url) { window.open(srv.url, '_self'); return; }
      /* Companion-appen bytter server med homeassistant://navigate/<sti>?server=<navn>, og bare via window.open
         (samme som tap_action: url). Standardsti: dashbordet du står i nå. */
      const naa = String(location.pathname || '').split('/').filter(Boolean)[0];
      const sti = String(srv.sti || this.config.server_sti || naa || 'lovelace').replace(/^\/+/, '');
      const navn = String(srv.server).replace(/[&?#%\s]/g, t => encodeURIComponent(t));
      window.open(`homeassistant://navigate/${sti}?server=${navn}`);
    }
    openWeather() { this.openSheet('vaer'); }
    openMe() { this.openSheet('person', { personId: this.meId }); }
    openPerson(ev, id) { this.openSheet('person', { personId: id }); }
    quickPerson(ev, id) { this.setState({ quickId: id || this.meId }); }
    quickClose() { this.setState({ quickId: null }); }
    quickSet(ev, arg) {
      const [what, val] = arg.split(':'), p = this.persons.find(x => x.id === this.state.quickId); if (!p) return;
      const on = val === '1';
      if (what === 'home' && p.hjemme) this.call('switch', on ? 'turn_on' : 'turn_off', { entity_id: p.hjemme });
      if (what === 'sleep' && p.sovn) { const sleepOn = (this.config.sover_nar || 'on') === 'on'; this.call('switch', on === sleepOn ? 'turn_on' : 'turn_off', { entity_id: p.sovn }); }
    }
    quickDetails() { const q = this.state.quickId; this.setState({ quickId: null }); this.openSheet('person', { personId: q }); }
    goPower() { this.setState({ pcHour: null }); this.openSheet('strom'); }
    showLights() { this.openSheet('lys'); }
    openCal() { this.openSheet('cal'); }
    openTrash() { this.openSheet('trash'); }
    goFloor(ev, k) { this.setState({ floor: k, iL: 0, iR: 0 }); this.$$('[data-snap]').forEach(el => el.scrollLeft = 0); }
    snapScroll(ev, key, el) { const n = Math.round(el.scrollLeft / el.clientWidth); if (n !== (this.state[key] || 0)) this.setState({ [key]: n }); }
    openRoom(ev, id) { this.openSheet('rom', { roomId: id }); }
    roomToggle(ev, id) {
      const r = this.roomsAll[id]; if (!r) return;
      const L = KD.roomLive(this, r);
      if (L.lightId) return this.call('light', 'toggle', { entity_id: L.lightId });
      if (L.lysListe.length) return this.call('light', L.lightsOn ? 'turn_off' : 'turn_on', { entity_id: L.lysListe });
      this.openRoom(ev, id);
    }
    roomSet(ev, arg) {
      const [id, dir] = arg.split(':'), r = this.roomsAll[id]; if (!r) return;
      KD.stepSet(this, KD.roomLive(this, r).setId, dir === 'up' ? 1 : -1);
    }
    lockOpen() { this.setState({ lockOpen: true }); }
    lockClose() { this.setState({ lockOpen: false }); }
    lockSet(ev, v) { const id = this.config.las; this.call('lock', v === '1' ? 'lock' : 'unlock', { entity_id: id }); this.setState({ lockSpin: (this.state.lockSpin || 0) + 1 }); }
    lockToggle() { this.lockSet(null, this.v(this.config.las) === 'locked' ? '0' : '1'); }
    lockAuto() { const id = this.autolasId(); if (id) this.toggle(id); }
    openSik() { this.openSheet('sik'); }
    openCam() { this.openSheet('cam'); }
    openTodo() { this.openSheet('todo'); }
    pcMode(ev, k) { this.setState({ pcMode: k }); }
    pcMove(ev, arg, el) { const r = el.getBoundingClientRect(); const i = KD.clamp(Math.floor((ev.clientX - r.left) / r.width * 48), 0, 47); if (i !== this.state.pcHour) this.setState({ pcHour: i }); }
    pcLeave() { this.setState({ pcHour: null }); }
    closeMenu() { this.setState({ menu: false, dockEdit: false }); }
    menuGo(ev, i) {
      const it = this.dockLayout().menu[+i];
      this.setState({ menu: false, dockEdit: false });
      this.flush(); // lukk menyen før arket/popupen åpnes (også med bubble-card)
      this.runItem(it);
    }
    /** Utfør en dokk-/menyknapp: ark | hash | sti | url | entity (+ handling: toggle/more-info) */
    runItem(it) {
      if (!it) return;
      if (it.hjem) { // tilbake til Hjem: lukk arket/popupen og rull til toppen
        this.setState({ menu: false });
        if (this.state.sheetOpen) this.closeSheet();
        else if (location.hash) { history.replaceState(null, '', location.pathname + location.search); window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: true } })); }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return this._queue();
      }
      if (it.ark) return this.openSheet(it.ark, it.ark === 'rom' ? { roomId: it.rom } : it.ark === 'person' ? { personId: it.person } : {});
      if (it.hash) return this.nav(it.hash.startsWith('#') ? it.hash : '#' + it.hash);
      if (it.sti) return this.nav(it.sti);
      if (it.url) return window.open(it.url);
      if (it.entity) return it.handling === 'more-info' || it.handling === 'mer-info' ? this.more(it.entity) : this.toggle(it.entity);
    }

    /* ----- dokk: oppsett per bruker (lagres i HA) ----- */
    /** alle knapper fra dokk + meny, med en stabil nøkkel */
    dockPool() {
      const c = this.config, seen = new Set(), out = [];
      const key = it => it.id || it.hjem && 'hjem' || it.ark && (it.ark + (it.rom ? ':' + it.rom : '') + (it.person ? ':' + it.person : '')) || it.hash || it.sti || it.url || it.entity || it.navn;
      [...(c.dokk || []), ...(c.meny || [])].filter(Boolean).forEach((it, i) => {
        const k = String(key(it) || 'i' + i); if (seen.has(k)) return; seen.add(k);
        out.push({ ...it, _k: k, _dock: i < (c.dokk || []).filter(Boolean).length });
      });
      for (const it of (this.dockUd().egne || [])) if (it && it.id && !seen.has(it.id)) { seen.add(it.id); out.push({ ...it, _k: it.id, _egen: true }); }
      return out;
    }
    dockUd() {
      if (this._dockUdLocal) return this._dockUdLocal;
      return this.cached('kd-dokk-ud', 5 * 60e3, () => this.ws({ type: 'frontend/get_user_data', key: 'kd_dokk' }).then(r => (r && r.value) || {}).catch(() => ({})), {}) || {};
    }
    dockSave(patch) {
      const v = { ...this.dockUd(), ...patch };
      this._dockUdLocal = v;
      this.ws({ type: 'frontend/set_user_data', key: 'kd_dokk', value: v }).catch(err => console.warn('kd-hjem: kunne ikke lagre dokk', err));
      this.setState({ tab: 0, prevTab: 0 });
    }
    dockOpts() {
      const u = this.dockUd(), c = this.config;
      return { bred: u.bred != null ? !!u.bred : c.dokk_stil !== 'kompakt', navn: u.navn != null ? !!u.navn : c.dokk_navn !== false, krymp: u.krymp != null ? !!u.krymp : c.dokk_krymp !== false };
    }
    dockLayout() {
      const pool = this.dockPool(), u = this.dockUd();
      let dock;
      if (Array.isArray(u.dokk)) dock = u.dokk.map(k => pool.find(p => p._k === k)).filter(Boolean);
      else dock = pool.filter(p => p._dock);
      const inDock = new Set(dock.map(p => p._k)), skjult = new Set(u.skjult || []);
      dock = dock.filter(p => !skjult.has(p._k));
      return { pool, dock, menu: pool.filter(p => !inDock.has(p._k) && !skjult.has(p._k)), hidden: pool.filter(p => skjult.has(p._k)) };
    }
    dockItems() { return this.dockLayout().dock; }
    /** etasjefanene som vises (Tilpass Hjem → Etasjer) */
    floorsVis() { const v = KD.ud(this, 'kd_hjem').etasjer_vis; return Array.isArray(v) ? FLOORS.filter(f => v.includes(f[0])) : FLOORS; }
    /** rommene i en etasje: brukerens valg → config.etasjer → rommets etasje (hjem: config.hjem venstre+høyre) */
    floorRooms(k) {
      const E = KD.ud(this, 'kd_hjem').etasjer || {}, c = this.config, rooms = this.roomsAll;
      if (Array.isArray(E[k])) return E[k].filter(id => rooms[id]);
      if (k === 'hjem') { const h = c.hjem || {}, L = h.venstre || [], R = h.hoyre || [], out = []; for (let i = 0; i < Math.max(L.length, R.length); i++) { if (L[i]) out.push(L[i]); if (R[i]) out.push(R[i]); } return out; }
      return ((c.etasjer || {})[k]) || Object.keys(rooms).filter(id => rooms[id].etasje === k);
    }
    hjemSet(ev, arg) {
      const i = String(arg).indexOf('|'), k = arg.slice(0, i), raw = arg.slice(i + 1);
      const v = raw === 'true' ? true : raw === 'false' ? false : raw === '' ? undefined : isNaN(+raw) ? raw : +raw;
      const HU = { ...KD.ud(this, 'kd_hjem') }; if (v === undefined) delete HU[k]; else HU[k] = v;
      this.haptic('selection'); KD.udSave(this, 'kd_hjem', HU);
    }
    hjemHilsen(ev, arg, el) { const HU = { ...KD.ud(this, 'kd_hjem') }; const v = String(el.value || '').trim(); if (v) HU.hilsen = v; else delete HU.hilsen; KD.udSave(this, 'kd_hjem', HU); }
    hjemPers(ev, arg) {
      const [id, op] = String(arg).split('|'), HU = { ...KD.ud(this, 'kd_hjem') };
      const list = this.persons.map(p => p.id), i = list.indexOf(id);
      if (op === 'vis' && i < 0) list.push(id); else if (op === 'skjul' && i >= 0) list.splice(i, 1);
      else if (op === 'opp' && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]]; else return;
      HU.personer = list; this.haptic('selection'); KD.udSave(this, 'kd_hjem', HU);
    }
    hjemEtg(ev, arg) {
      const [k, op, rid] = String(arg).split('|'), HU = { ...KD.ud(this, 'kd_hjem') };
      if (op === 'apne') return this.setState({ etgOpen: this.state.etgOpen === k ? null : k });
      if (op === 'skjul') { const v = this.floorsVis().map(f => f[0]); const j = v.indexOf(k); j >= 0 ? v.splice(j, 1) : v.push(k); HU.etasjer_vis = FLOORS.map(f => f[0]).filter(x => v.includes(x)); }
      if (op === 'rom') { const E = { ...(HU.etasjer || {}) }, list = this.floorRooms(k).slice(), j = list.indexOf(rid); j >= 0 ? list.splice(j, 1) : list.push(rid); E[k] = list; HU.etasjer = E; }
      this.haptic('selection'); KD.udSave(this, 'kd_hjem', HU);
    }
    /* ----- Tilpass Hjem ----- */
    hjemCols(HU) {
      const all = [...TILE_V, ...TILE_H];
      const V = (Array.isArray(HU.venstre) ? HU.venstre : TILE_V).filter((k, i, a) => all.includes(k) && a.indexOf(k) === i);
      const H = (Array.isArray(HU.hoyre) ? HU.hoyre : TILE_H).filter((k, i, a) => all.includes(k) && !V.includes(k) && a.indexOf(k) === i);
      for (const k of all) if (!V.includes(k) && !H.includes(k)) (TILE_V.includes(k) ? V : H).push(k);
      return [V, H];
    }
    hjemEditOpen() { this.setState({ hjemEdit: true, menu: false, dockEdit: false }); }
    hjemEditClose() { this.setState({ hjemEdit: false }); }
    hjemReset() { this.haptic('selection'); KD.udSave(this, 'kd_hjem', {}); }
    /** arg: gruppe|nøkkel|handling – gruppe: sek | prosa | venstre | hoyre, handling: opp | ned | skjul | bytt */
    hjemOp(ev, arg) {
      const [g, k, op] = String(arg).split('|');
      const HU = JSON.parse(JSON.stringify(KD.ud(this, 'kd_hjem') || {}));
      const skjul = new Set(HU.skjul || []);
      const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return false; [arr[i], arr[j]] = [arr[j], arr[i]]; return true; };
      if (g === 'venstre' || g === 'hoyre') {
        const [V, H] = this.hjemCols(HU), A = g === 'venstre' ? V : H, B = g === 'venstre' ? H : V, i = A.indexOf(k);
        if (i < 0) return;
        if (op === 'skjul') { skjul.has('flis:' + k) ? skjul.delete('flis:' + k) : skjul.add('flis:' + k); }
        else if (op === 'bytt') { A.splice(i, 1); B.push(k); }
        else if (!move(A, i, op === 'opp' ? -1 : 1)) return;
        HU.venstre = V; HU.hoyre = H;
      } else {
        const field = g === 'sek' ? 'seksjoner' : 'prosa', list = norm(HU[field], g === 'sek' ? SEK_KEYS : PROSA_KEYS), i = list.indexOf(k);
        if (i < 0) return;
        if (op === 'skjul') { const t = g + ':' + k; skjul.has(t) ? skjul.delete(t) : skjul.add(t); }
        else if (!move(list, i, op === 'opp' ? -1 : 1)) return;
        HU[field] = list;
      }
      HU.skjul = [...skjul];
      this.haptic('selection');
      KD.udSave(this, 'kd_hjem', HU);
    }
    dockEditOpen() { this.setState({ dockEdit: true, menu: false }); }
    dockEditClose() { this.setState({ dockEdit: false }); }
    dockMove(ev, arg) {
      const [op, k] = String(arg).split('|'), keys = this.dockLayout().dock.map(p => p._k);
      const i = keys.indexOf(k);
      if (op === 'ut' && i >= 0) keys.splice(i, 1);
      else if (op === 'inn' && i < 0) { if (keys.length >= 7) return; keys.push(k); }
      else if (op === 'opp' && i > 0) [keys[i - 1], keys[i]] = [keys[i], keys[i - 1]];
      else if (op === 'skjul' || op === 'vis') {
        const sk = new Set(this.dockUd().skjult || []); op === 'skjul' ? sk.add(k) : sk.delete(k);
        if (i >= 0) keys.splice(i, 1);
        this.haptic('selection'); return this.dockSave({ dokk: keys, skjult: [...sk] });
      }
      else if (op === 'slett') {
        if (i >= 0) keys.splice(i, 1);
        this.haptic('selection'); return this.dockSave({ dokk: keys, egne: (this.dockUd().egne || []).filter(x => x.id !== k) });
      }
      else return;
      this.haptic('selection');
      this.dockSave({ dokk: keys });
    }
    /* ----- ny knapp i dokken/menyen: popup, rom, person eller side (navigate) ----- */
    nyType(ev, t) { this._ny = { type: t }; this.setState({ ny: t, nyVal: null }); }
    nyVal(ev, v) { const [navn, ikon] = this.nyDefaults(this.state.ny, v); this._ny = { ...(this._ny || {}), type: this.state.ny, val: v, navn, ikon }; this.setState({ nyVal: v }); const f = this.$('[data-key="ny-navn"]'), g = this.$('[data-key="ny-ikon"]'); if (f) f.value = navn; if (g) g.value = ikon; }
    nyInput(ev, k, el) { this._ny = { ...(this._ny || {}), [k]: el.value }; if (k === 'sti') this.setState({ nyVal: el.value }); }
    nyDefaults(t, v) {
      if (t === 'ark') { const h = HEADS[v] || []; return [h[1] || v, h[0] || 'circle']; }
      if (t === 'rom') { const r = this.roomsAll[v] || {}; return [r.navn || v, r.ikon || 'meeting_room']; }
      if (t === 'person') { const p = this.persons.find(x => x.id === v) || {}; return [p.navn || v, 'person']; }
      return ['Side', 'link'];
    }
    nyAdd() {
      const n = this._ny || {}, t = this.state.ny, v = t === 'sti' ? (n.sti || '').trim() : this.state.nyVal;
      if (!t || !v) return;
      const [dn, di] = this.nyDefaults(t, v);
      const it = { id: 'egen_' + Date.now().toString(36), navn: (n.navn || '').trim() || dn, ikon: (n.ikon || '').trim() || di };
      if (t === 'ark') it.ark = v; else if (t === 'rom') { it.ark = 'rom'; it.rom = v; } else if (t === 'person') { it.ark = 'person'; it.person = v; }
      else if (v.startsWith('#')) it.hash = v; else if (/^https?:/.test(v)) it.url = v; else it.sti = v.startsWith('/') ? v : '/' + v;
      const u = this.dockUd(), keys = this.dockLayout().dock.map(p => p._k);
      if (keys.length < 7) keys.push(it.id);
      this._ny = null; this.haptic('selection');
      this.dockSave({ egne: [...(u.egne || []), it], dokk: keys });
      this.setState({ ny: null, nyVal: null });
    }
    dockOpt(ev, k) { this.haptic('selection'); this.dockSave({ [k]: !this.dockOpts()[k] }); }
    dockReset() { this._dockUdLocal = {}; this.ws({ type: 'frontend/set_user_data', key: 'kd_dokk', value: {} }).catch(() => { }); this.setState({ tab: 0, prevTab: 0 }); }

    navMove(ev, arg, el) { if (this._drag && this._drag.moved) return; const r = el.getBoundingClientRect(); this.setState({ lx: (ev.clientX - r.left) / r.width * 100 }); }
    navLeave() { if (!this._drag) this.setState({ lx: null }); }
    dockGo(ev, i) {
      if (performance.now() - (this._dragEnd || 0) < 350) return; // klikket etter en dra-bevegelse
      i = +i;
      const items = this.dockItems();
      if (i >= items.length) return this.setState({ menu: !this.state.menu, dockEdit: false });
      const it = items[i];
      if (this.state.menu) this.setState({ menu: false });
      this.setState({ compact: false });
      this.runItem(it);
    }
    /** Dra fingeren langs dokken: glasslinsen følger fingeren, slipp for å velge */
    _dockDragInit() {
      if (this._dragInit) return; this._dragInit = true;
      const R = this.shadowRoot;
      const geo = () => {
        const nav = this.$('nav[data-key="nav"]'); if (!nav) return null;
        const btns = Array.from(nav.querySelectorAll('button[data-arg]'));
        return { nav, btns, ind: nav.querySelector('[data-ind]'), rect: nav.getBoundingClientRect() };
      };
      const idxAt = (g, x) => { let best = 0, bd = 1e9; g.btns.forEach((b, i) => { const r = b.getBoundingClientRect(), d = Math.abs(x - (r.left + r.width / 2)); if (d < bd) { bd = d; best = i; } }); return best; };
      R.addEventListener('pointerdown', ev => {
        const nav = ev.composedPath().find(n => n.getAttribute && n.getAttribute('data-key') === 'nav');
        if (!nav || ev.button > 0) return;
        this._drag = { x0: ev.clientX, y0: ev.clientY, id: ev.pointerId, moved: false, idx: -1 };
      }, { capture: true, passive: true });
      R.addEventListener('pointermove', ev => {
        const d = this._drag; if (!d || ev.pointerId !== d.id) return;
        if (!d.moved) {
          if (Math.abs(ev.clientX - d.x0) < 8) return;
          d.moved = true;
          const g = geo(); if (!g) return;
          try { g.nav.setPointerCapture(ev.pointerId); } catch (e) { }
          if (g.ind) { g.ind.style.transition = 'left .14s cubic-bezier(.3,1.3,.6,1), transform .3s cubic-bezier(.34,1.8,.64,1), top .3s, height .3s'; g.ind.style.transform = g.ind.offsetWidth > 64 ? 'scale(1.06, 1.1)' : 'scale(1.18)'; }
          g.nav.style.transform = g.nav.style.transform.replace(/scale\([^)]*\)/, 'scale(1.03)');
        }
        const g = geo(); if (!g || !g.ind) return;
        const w = g.ind.offsetWidth, first = g.btns[0].getBoundingClientRect(), last = g.btns[g.btns.length - 1].getBoundingClientRect();
        const left = KD.clamp(ev.clientX - g.rect.left - w / 2, first.left - g.rect.left, last.left - g.rect.left);
        g.ind.style.left = left + 'px';
        const sheen = g.nav.querySelector('[data-sheen]');
        if (sheen) { sheen.style.opacity = 1; sheen.style.background = `radial-gradient(120px 60px at ${(ev.clientX - g.rect.left) / g.rect.width * 100}% 0%, rgba(255,255,255,0.28), transparent 70%)`; }
        const i = idxAt(g, ev.clientX);
        if (i !== d.idx) {
          d.idx = i; this.haptic('selection');
          g.btns.forEach((b, j) => { const ic = b.querySelector('.ms'); if (ic) { ic.style.opacity = j === i ? 1 : 0.72; ic.style.transform = j === i ? 'scale(1.18)' : 'scale(1)'; } });
        }
      }, { capture: true, passive: true });
      const end = ev => {
        const d = this._drag; if (!d || ev.pointerId !== d.id) return;
        this._drag = null;
        if (!d.moved) return;
        this._dragEnd = performance.now();
        const g = geo(); if (!g) return;
        const i = ev.type === 'pointercancel' ? -1 : idxAt(g, ev.clientX);
        if (g.ind) g.ind.style.transition = 'left .45s cubic-bezier(.34,1.4,.64,1), transform .45s cubic-bezier(.34,1.8,.64,1)';
        this._force = true;
        if (i >= 0) { this._dragEnd = 0; this.dockGo(null, i); this._dragEnd = performance.now(); }
        this.setState({ lx: null });
        this.flush();
      };
      R.addEventListener('pointerup', end, true);
      R.addEventListener('pointercancel', end, true);
    }
    pickTab(i) {
      if (i === this.state.tab) return this.setState({ compact: false });
      this.setState({ tab: i, prevTab: this.state.tab, moving: true, compact: false });
      clearTimeout(this.mt); this.mt = setTimeout(() => this.setState({ moving: false }), 260);
    }
    autolasId() {
      if (this.config.autolas) return this.config.autolas;
      const base = (this.config.las || '').split('.')[1] || '';
      return Object.keys(this.all()).find(id => /^(switch|select)\./.test(id) && id.includes(base.split('_')[0]) && /auto.?(las|lock|relock)/i.test(id)) || null;
    }

    afterRender() {
      // HA kan legge temaet på nytt (navigasjon/tema-bytte) – mal over igjen hvis noe er overskrevet
      if (this._painted && this._painted.some(el => el.style.getPropertyValue('--lovelace-background') !== (this.config.bakgrunn || '#141416'))) { const col = this.config.bakgrunn || '#141416'; for (const el of this._painted) ['--lovelace-background', '--primary-background-color', '--view-background'].forEach(v => el.style.setProperty(v, col)); }
      if (this._animHead && this.state.sheetOpen) { this._animHead = false; requestAnimationFrame(() => KD.animateSheetTop(this.shadowRoot)); }
    }

    /* ---------- data ---------- */
    weather() {
      const c = this.config, w = this.st(c.vaer);
      const wt = w ? parseFloat(w.attributes.temperature) : NaN;
      const t = this.n(c.ute_temp, isNaN(wt) ? null : wt);
      const cond = COND[w && w.state] || [w ? w.state : '–', 'cloud'];
      return { t, head: isNaN(wt) ? t : wt, cond: cond[0], icon: cond[1] };
    }
    priceKr(id) { const v = this.n(id); if (v == null) return null; return isOre(this.unit(id), this.st(id).attributes) ? v / 100 : v; }
    /** strømprofil + eventuelle overstyringer i config */
    sp() {
      const c = this.config, P = KD.stromProfil(this);
      return { ...P, pris: c.pris || P.pris, pris_total: c.pris_total || P.pris_total, pris_spot: c.pris_spot || P.pris_spot, pris_fast: c.pris_norges || P.pris_fast };
    }
    priceSeries() {
      const c = this.sp(), now = new Date(), tmr = new Date(now.getTime() + 86400e3);
      const get = (id, attrs, forceMul) => {
        const s = this.st(id); if (!s) return null;
        const mul = forceMul != null ? forceMul : isOre(s.attributes.unit_of_measurement, s.attributes) ? 1 : 100; // alt i øre
        const A = s.attributes;
        const all = hourly([...(A[attrs[0]] || []), ...(A[attrs[1]] || [])], mul);
        return [...(all[dayKey(now)] || Array(24).fill(null)), ...(all[dayKey(tmr)] || Array(24).fill(null))];
      };
      const tot = get(c.pris_total, ['raw_today', 'raw_tomorrow']);
      const spot = get(c.pris_spot, ['raw_today', 'raw_tomorrow']);
      const norges = c.pris_fast ? get(c.pris_fast, ['today', 'tomorrow']) : null;
      return { tot, spot, norges };
    }
    events() {
      const c = this.config, s = this.st(c.kalender_sensor);
      const today = new Date(); today.setHours(0, 0, 0, 0); const end = new Date(today.getTime() + 86400e3);
      if (s && Array.isArray(s.attributes.events)) return s.attributes.events.filter(ev => { const d = new Date(ev.start); return d >= today && d < end || (new Date(ev.start) < today && new Date(ev.end) > today); }).length;
      const list = this.cached('hjem-cal-' + (c.kalendere || []).join(','), 10 * 60e3, () => this.calendar(c.kalendere || [], 1), null);
      return list ? list.length : null;
    }
    trash() {
      const list = (this.config.soppel || []).map(id => {
        const s = this.st(id); if (!s) return null;
        let days = parseFloat(s.attributes.days_to_pickup ?? s.attributes.days ?? s.state);
        const raw = s.attributes.raw_date || s.attributes.date || s.attributes.next_date;
        if (isNaN(days) && raw) days = Math.round((new Date(raw) - new Date().setHours(0, 0, 0, 0)) / 86400e3);
        if (isNaN(days)) return null;
        const key = id.split('.')[1];
        const f = FRACTION[key] || [this.fname(id), '#8e8d89'];
        return { id, days, raw, name: f[0], col: f[1] };
      }).filter(Boolean);
      if (!list.length) return null;
      const min = Math.min(...list.map(x => x.days));
      const due = list.filter(x => x.days === min);
      const d = due[0].raw ? new Date(due[0].raw) : new Date(Date.now() + min * 86400e3);
      const when = min === 0 ? 'i dag' : min === 1 ? 'i morgen' : DAYS[d.getDay()];
      return { days: min, when, due };
    }

    /* ---------- render ---------- */
    render() {
      const s = this.state, c = this.config;
      const PERS = this.persons, PALL = this.personsAll, meId = this.meId, me = PALL.find(p => p.id === meId) || PALL[0];
      const GREEN = 'oklch(0.8 0.12 150)', BLUE = 'oklch(0.75 0.12 245)', AMBER = 'oklch(0.8 0.12 70)', PURP = 'oklch(0.68 0.2 285)';
      const badge = p => ({ show: !p.home || p.sleep, icon: p.sleep ? 'bedtime' : 'logout', style: { fontSize: 15, color: p.sleep ? 'oklch(0.75 0.12 275)' : PURP, fontVariationSettings: "'FILL' 1" } });
      const meS = this.personState(me), meB = badge(meS);
      const FAM = (KD.ud(this, 'kd_hjem').topp || c.topp) === 'familie';
      const HUP = KD.ud(this, 'kd_hjem'), PNAVN = HUP.person_navn !== false, PSTED = HUP.person_sted !== false && PNAVN, PIKON = !!HUP.person_ikon;
      const meRing = HUP.person_ring === false ? 'none' : `0 0 0 3px #141416,0 0 0 4.5px ${meS.home ? 'oklch(0.8 0.12 150 / 0.7)' : 'oklch(0.68 0.2 285 / 0.7)'}`;
      const people = PERS.filter(p => p.id !== meId).map(p => { const ps = this.personState(p); return { p, ps, b: badge(ps), avatar: { width: 46, height: 46, borderRadius: 23, display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 600, background: p.farge, opacity: ps.home ? 1 : 0.6, transition: 'opacity .3s' } }; });

      const W = this.weather();
      const SP = this.sp();
      const pNow = this.priceKr(SP.pris) ?? this.priceKr(SP.pris_total);
      const lvl = p => p > 1.5 ? C.red : p > 1.1 ? C.yellow : C.green;
      const pl = lvl(pNow ?? 0);
      const pricePill = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 11px', borderRadius: 16, background: a(pl, 0.16), boxShadow: `inset 0 0 0 1px ${a(pl, 0.4)}`, fontSize: 22, fontWeight: 500, verticalAlign: 'middle', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };
      const priceDot = { width: 8, height: 8, borderRadius: 4, background: pl };
      const wattV = this.n(c.effekt);
      const watt = wattV == null ? '–' : Math.round(wattV).toLocaleString('nb-NO');
      let lightsOn = this.n(c.lys_totalt);
      if (lightsOn == null) { const st = this.all(); lightsOn = Object.keys(st).filter(id => id.startsWith('light.') && st[id].state === 'on' && !st[id].attributes.entity_id).length; }
      const nEv = this.events();

      /* ----- rom ----- */
      const rooms = this.roomsAll;
      const live = id => { const r = rooms[id]; if (!r) return null; const L = KD.roomLive(this, r); const ms = KD.kiRom(this, id, 'media'); const media = ms ? parseFloat(ms.state) > 0 : false; return { ...r, ...L, media }; };
      const HUR = KD.ud(this, 'kd_hjem'), ETG = HUR.etasjer || {};
      const FL = this.floorsVis(), floor = FL.some(f => f[0] === s.floor) ? s.floor : (FL[0] || ['hjem'])[0];
      const RK = { stor: [220, 40, 120], middels: [170, 34, 96], liten: [130, 28, 0] }[HUR.romkort || c.romkort || 'stor'] || [220, 40, 120];
      const KLIMA = HUR.klimaknapp != null ? HUR.klimaknapp !== false : c.klimaknapp !== false;
      let left, right;
      if (floor === 'hjem' && !Array.isArray(ETG.hjem)) { left = ((c.hjem || {}).venstre || []).map(live).filter(Boolean); right = ((c.hjem || {}).hoyre || []).map(live).filter(Boolean); }
      else {
        let list;
        if (floor === 'aktuelt') list = Object.keys(rooms).map(live).filter(r => r && (r.lightsOn || r.media));
        else list = (this.floorRooms(floor)).map(live).filter(Boolean);
        left = list.filter((r, i) => i % 2 === 0); right = list.filter((r, i) => i % 2 === 1);
      }
      const carousel = (list, key) => {
        const idx = Math.min(s[key] || 0, Math.max(0, list.length - 1));
        const dots = list.length > 1 ? list.map((_, i) => ({ width: 8, height: 8, borderRadius: 4, background: i === idx ? '#8e8d89' : '#3a3a3d', transition: 'background .2s' })) : [];
        const cards = list.map(r => {
          const iconWrap = { position: 'absolute', right: 6, top: 6, width: 58, height: 58, borderRadius: 29, display: 'grid', placeItems: 'center', background: r.lightsOn ? r.farge : '#2a2a2d', color: r.lightsOn ? '#141416' : '#8e8d89', transition: 'background .25s' };
          const hasSet = r.set != null;
          return `<div data-key="${e(r.id)}" data-on-click="openRoom" data-arg="${e(r.id)}" style="position:relative;cursor:pointer;flex:none;width:100%;height:${RK[0]}px;box-sizing:border-box;scroll-snap-align:start;border-radius:28px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04)">
                <div style="position:absolute;left:18px;top:18px;right:70px;font-size:15px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(r.navn)}</div>
                <button data-on-click="roomToggle" data-arg="${e(r.id)}" title="Lys" style="${S(iconWrap)}"><span class="ms" style="font-size:24px;font-variation-settings:'FILL' 1">${e(r.ikon)}</span></button>
                <div style="position:absolute;left:18px;bottom:16px;display:flex;align-items:baseline;gap:4px;white-space:nowrap">
                  <span style="font-size:${RK[1]}px;font-weight:300;letter-spacing:-0.04em;line-height:1;font-variant-numeric:tabular-nums">${r.temp != null ? Math.round(r.temp) : '–'}°</span>
                  <span style="font-size:12px;color:#8e8d89">${r.hum != null ? Math.round(r.hum) : '–'} %</span>
                </div>
                ${hasSet && KLIMA && RK[2] ? `<div style="position:absolute;right:8px;bottom:8px;width:44px;height:${RK[2]}px;border-radius:22px;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.12);display:flex;flex-direction:column;align-items:center;justify-content:space-between">
                    <button data-on-click="roomSet" data-arg="${e(r.id)}:up" style="width:44px;height:${RK[2] / 3}px;display:grid;place-items:center;color:#c9c7c2"><span class="ms" style="font-size:20px">expand_less</span></button>
                    <span style="font-size:14px;font-variant-numeric:tabular-nums">${Math.round(r.set)}°</span>
                    <button data-on-click="roomSet" data-arg="${e(r.id)}:down" style="width:44px;height:${RK[2] / 3}px;display:grid;place-items:center;color:#c9c7c2"><span class="ms" style="font-size:20px">expand_more</span></button>
                  </div>` : hasSet && KLIMA ? `<div style="position:absolute;right:8px;bottom:8px;height:34px;border-radius:17px;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.12);display:flex;align-items:center">
                    <button data-on-click="roomSet" data-arg="${e(r.id)}:down" style="width:30px;height:34px;display:grid;place-items:center;color:#c9c7c2"><span class="ms" style="font-size:18px">remove</span></button>
                    <span style="font-size:13px;font-variant-numeric:tabular-nums">${Math.round(r.set)}°</span>
                    <button data-on-click="roomSet" data-arg="${e(r.id)}:up" style="width:30px;height:34px;display:grid;place-items:center;color:#c9c7c2"><span class="ms" style="font-size:18px">add</span></button>
                  </div>` : ''}
              </div>`;
        }).join('');
        return `<div style="display:flex;flex-direction:column;gap:10px;align-items:center">
          <div data-snap="1" data-on-scroll="snapScroll" data-arg="${key}" style="width:100%;display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;border-radius:28px">${cards}</div>
          <div style="display:flex;gap:7px;height:8px;align-items:center">${dots.map(d => `<span style="${S(d)}"></span>`).join('')}</div>
        </div>`;
      };

      /* ----- fliser ----- */
      const tileV = (icon, title, sub, tap, col, pink) => ({
        icon, title, sub, tap,
        style: { display: 'flex', alignItems: 'center', gap: 12, height: 72, padding: '0 14px 0 6px', borderRadius: 36, width: '100%', boxSizing: 'border-box', background: pink ? PINK : col ? a(col, 0.14) : '#1c1c1f', color: pink ? '#2a1720' : '#f2f1ee', boxShadow: pink ? 'none' : col ? `inset 0 0 0 1px ${a(col, 0.4)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)', transition: 'background .25s' },
        iconWrap: { width: 60, height: 60, borderRadius: 30, flex: 'none', display: 'grid', placeItems: 'center', background: pink ? 'rgba(42,23,32,0.1)' : col ? a(col, 0.2) : '#2a2a2d' },
        iconStyle: { fontSize: 24, color: pink ? '#2a1720' : col || '#f2f1ee', fontVariationSettings: "'FILL' 1" },
        subStyle: { fontSize: 12, color: pink ? 'rgba(42,23,32,0.7)' : '#8e8d89', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
      });
      const tileHTML = t => `<button data-on-click="${t.tap}" style="${S(t.style)}">
            <span style="${S(t.iconWrap)}"><span class="ms" style="${S(t.iconStyle)}">${e(t.icon)}</span></span>
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;text-align:left">
              <span style="font-size:15px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(t.title)}</span>
              <span style="${S(t.subStyle)}">${e(t.sub)}</span>
            </div>
          </button>`;
      const lockS = this.v(c.las), locked = lockS === 'locked' || lockS === 'locking' || !lockS;
      const alarmS = this.v(c.alarm) || this.v(c.alarm_gammel);
      const armed = /^armed/.test(alarmS) || alarmS === 'armed' || alarmS === 'triggered';
      const motion = (c.bevegelse || []).some(id => this.v(id) === 'on');
      const todoItems = c.gjoremal ? this.cached('hjem-todo-' + c.gjoremal + '-' + (this.st(c.gjoremal) || {}).state, 60e3, () => this.todos(c.gjoremal), null) : null;
      const nTodo = todoItems ? todoItems.length : this.n(c.gjoremal, this.n('sensor.todo_oppgaver_count', 0));
      const nDone = todoItems ? todoItems.filter(t => t.status === 'completed').length : 0;
      const lockTile = tileV(locked ? 'key' : 'lock_open', locked ? 'Låst' : 'Ulåst', 'Dørlås', 'lockOpen', locked ? null : C.amber);
      const alarmTile = tileV('shield', armed ? 'Armert' : 'Av', 'Alarm', 'openSik', null, armed);
      const camTile = tileV('videocam', 'Kamera', motion ? 'Bevegelse nå' : 'Ingen bevegelse', 'openCam', motion ? C.blue : null);
      const todoTile = tileV('handyman', `${nTodo} gjøremål`, `${nDone} ferdige`, 'openTodo', null);

      /* ----- strømgraf ----- */
      const NOW_H = new Date().getHours();
      const ser = this.priceSeries();
      const MODES = [['total', 'Total', ser.tot], ['spot', 'Spot', ser.spot], ['norges', SP.fast_navn || 'Fastpris', ser.norges]].filter(([k, , v], i) => i === 0 || v);
      const mode = MODES.some(m => m[0] === s.pcMode) ? s.pcMode : 'total';
      const tot48 = ser.tot || Array(48).fill(null);
      const spot48 = ser.spot || Array(48).fill(null);
      const norges48 = ser.norges || Array(48).fill(null);
      const all48 = mode === 'spot' ? spot48 : mode === 'norges' ? norges48 : tot48;
      const valid = arr => arr.filter(v => v != null);
      const maxRef = Math.max(0, ...valid(mode === 'norges' ? tot48.concat(norges48) : all48));
      const top = Math.ceil(maxRef / 100) * 100 + 100, Y = v => 150 - v / top * 150, X = i => i * 10;
      const stepPath = arr => { let d = '', pen = false; arr.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? `L${X(i)},${Y(v).toFixed(1)}` : `M${X(i)},${Y(v).toFixed(1)}`) + `L${X(i + 1)},${Y(v).toFixed(1)}`; pen = true; }); return d || 'M0,150'; };
      const areaPath = arr => { let d = '', start = null; const out = []; arr.forEach((v, i) => { if (v == null) { if (start != null) { out.push(d + `L${X(i)},150L${X(start)},150Z`); d = ''; start = null; } return; } if (start == null) { start = i; d = `M${X(i)},${Y(v).toFixed(1)}`; } else d += `L${X(i)},${Y(v).toFixed(1)}`; d += `L${X(i + 1)},${Y(v).toFixed(1)}`; }); if (start != null) out.push(d + `L${X(arr.length)},150L${X(start)},150Z`); return out.join('') || 'M0,150'; };
      const ln = stepPath(all48);
      const thrV = mode === 'spot' ? 120 : 200;
      let selI = s.pcHour ?? NOW_H; if (all48[selI] == null) selI = NOW_H;
      const selV = all48[selI];
      const pc = {
        yl: Array.from({ length: 5 }, (_, i) => Math.round(top - i * top / 4)), grid: Array.from({ length: 5 }, (_, i) => i * 37.5),
        line: ln, area: areaPath(all48), thrA: KD.clamp((Y(thrV) - 8) / 150, 0, 1), thrB: KD.clamp((Y(thrV) + 8) / 150, 0, 1),
        cmp: mode === 'norges' ? stepPath(tot48) : 'M0,0',
        caption: mode === 'spot' ? `Nord Pool${SP.region ? ' ' + SP.region : ''} · ${SP.ore}/kWh${SP.spot_mva == null ? '' : SP.spot_mva ? ' inkl. ' + SP.mva : ' eks. ' + SP.mva}` : mode === 'norges' ? `${SP.fast_tekst || SP.fast_navn || 'Fastpris'} · ${SP.ore}/kWh` : `Totalpris inkl. ${SP.mva}, påslag og nettleie · ${SP.ore}`,
        legend: { display: mode === 'norges' ? 'flex' : 'none', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' },
        modes: MODES.map(([k, label]) => ({ k, label, style: { height: 28, padding: '0 10px', borderRadius: 11, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', background: mode === k ? PINK : 'transparent', color: mode === k ? '#2a1720' : '#a9a7a2', transition: 'background .2s' } })),
        pastW: NOW_H * 10,
        selBand: { position: 'absolute', top: 0, bottom: 0, left: `${selI / 48 * 100}%`, width: `${100 / 48}%`, background: 'rgba(255,255,255,0.12)', borderRadius: 2, pointerEvents: 'none', transition: 'left .15s' },
        halo: { position: 'absolute', left: `${(selI + 0.5) / 48 * 100}%`, top: `${(selV != null ? Y(selV) : 150) / 150 * 100}%`, width: 34, height: 34, margin: -17, borderRadius: 17, background: selV > thrV ? 'oklch(0.74 0.17 55 / 0.3)' : 'oklch(0.78 0.13 175 / 0.3)', pointerEvents: 'none', transition: 'left .15s, top .15s', display: selV == null ? 'none' : null },
        dot: { position: 'absolute', left: `${(selI + 0.5) / 48 * 100}%`, top: `${(selV != null ? Y(selV) : 150) / 150 * 100}%`, width: 12, height: 12, margin: -6, borderRadius: 6, background: selV > thrV ? 'oklch(0.74 0.17 55)' : 'oklch(0.78 0.13 175)', boxShadow: '0 0 0 3px #141416', pointerEvents: 'none', transition: 'left .15s, top .15s', display: selV == null ? 'none' : null },
      };
      const slot = i => `${i >= 24 ? 'I morgen' : 'I dag'} kl. ${hh(i % 24)}–${hh((i + 1) % 24)}`;
      let priceHead;
      if (mode !== 'total') {
        const i = selI;
        const save = tot48.slice(NOW_H, 48).reduce((t, v, k) => t + ((v != null && norges48[NOW_H + k] != null) ? v - norges48[NOW_H + k] : 0), 0);
        const tmrSpot = valid(spot48.slice(24));
        priceHead = { label: s.pcHour != null ? slot(i) : mode === 'spot' ? 'Spot nå' : `${SP.fast_navn || 'Fastpris'} nå`, v: all48[i] != null ? nf(all48[i] / 100) : '–', meta: mode === 'norges' ? `${save >= 0 ? 'Sparer' : 'Taper'} ca. ${nf(Math.abs(save) / 100)} kr/kWh-time mot spot` : tmrSpot.length ? `Snitt i morgen ${nf(tmrSpot.reduce((x, y) => x + y, 0) / tmrSpot.length / 100)} kr` : '' };
      } else if (s.pcHour != null) {
        priceHead = { label: slot(s.pcHour), v: tot48[s.pcHour] != null ? nf(tot48[s.pcHour] / 100) : '–', meta: s.pcHour < NOW_H ? 'Tidligere i dag' : '' };
      } else {
        let fut = tot48.map((p, h) => [p, h]).filter(([p, h]) => p != null && h > NOW_H && h < 24);
        if (!fut.length) fut = tot48.map((p, h) => [p, h]).filter(([p, h]) => p != null && h > NOW_H);
        const cheap = fut.length ? fut.reduce((m, x) => x[0] < m[0] ? x : m) : null;
        const now = tot48[NOW_H];
        priceHead = { label: 'Nå', v: now != null ? nf(now / 100) : '–', meta: cheap ? `Billigst kl. ${hh(cheap[1] % 24)} · ${nf(cheap[0] / 100)} kr` : '' };
      }

      /* ----- søppel ----- */
      const T = this.trash();

      /* ----- dokk ----- */
      const compact = !!s.compact;
      const arr = x => Array.isArray(x) ? x : x ? [x] : [];
      const dotOf = it => arr(it.prikk).some(id => ['on', 'open', 'unlocked', 'problem', 'playing'].includes(this.v(id))) || arr(it.prikk_av).some(id => this.v(id) === 'off');
      const LAY = this.dockLayout(), OPT = this.dockOpts(), NAVN = OPT.navn, BRED = OPT.bred, ACC = 'oklch(0.8 0.13 350)';
      // aktiv fane = åpent ark (eller #hash med bubble-card); ingen ark → Hjem-knappen; ark fra «Mer» → Mer
      const hashKey = HASH[(location.hash || '').slice(1)] || (location.hash && Object.values(this.roomsAll || {}).some(r => r.hash === location.hash) ? 'rom' : null);
      const curKey = s.sheetOpen && s.sheetFile ? s.sheetFile : c.ark === 'bubble' ? hashKey : null;
      const curRoom = curKey === 'rom' ? s.sheetRoomId : null;
      const hitIt = it => it.ark === curKey && (curKey !== 'rom' || !it.rom || it.rom === curRoom) || (it.hash && location.hash === (it.hash.startsWith('#') ? it.hash : '#' + it.hash));
      let tab = curKey ? LAY.dock.findIndex(hitIt) : LAY.dock.findIndex(it => it.hjem);
      if (tab < 0 && curKey && LAY.menu.some(hitIt)) tab = LAY.dock.length; // «Mer»
      if (tab !== this._lastTab) { this._prevTab = this._lastTab ?? tab; this._lastTab = tab; this._movingT = Date.now(); clearTimeout(this._mvT); this._mvT = setTimeout(() => this._queue(), 300); }
      const moving = Date.now() - (this._movingT || 0) < 260;
      const ITEMS = LAY.dock.map(it => [it.ikon || 'circle', it.navn || '', dotOf(it)]);
      ITEMS.push(['more_horiz', 'Mer', LAY.menu.some(dotOf)]);
      const GAP = 2, PAD = 6, AVAIL = Math.min(window.innerWidth || 460, 560) - 16 - 2 * PAD, FIT = Math.floor((AVAIL - GAP * (ITEMS.length - 1)) / ITEMS.length);
      const SZ = Math.max(38, Math.min(NAVN ? 58 : 44, FIT)), SH = BRED ? (NAVN ? 58 : 50) : NAVN ? 52 : 44, N = ITEMS.length, MB = 18 + SH + 2 * PAD + 10;
      const CELL = `((100% - ${2 * PAD}px - ${(N - 1) * GAP}px) / ${N})`, dist = Math.abs(tab - (this._prevTab ?? tab)), lx = s.lx;
      const navStyle = {
        position: 'fixed', left: '50%', bottom: 18, zIndex: 24, display: 'flex', gap: GAP, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', maxWidth: 'calc(100vw - 16px)', padding: PAD, borderRadius: BRED ? (SH + 2 * PAD) / 2 : NAVN ? 32 : 30, overflow: 'hidden', isolation: 'isolate',
        ...(BRED ? { width: 'min(calc(100vw - 2 * var(--kd-kant,10px)), 640px)', boxSizing: 'border-box' } : {}),
        background: BRED ? 'rgba(36,36,39,0.72)' : 'rgba(40,40,44,0.38)', backdropFilter: 'blur(22px) saturate(190%) brightness(1.1)', WebkitBackdropFilter: 'blur(22px) saturate(190%) brightness(1.1)',
        boxShadow: BRED ? 'inset 0 0 0 0.5px rgba(255,255,255,0.14), inset 0 1px 0 rgba(255,255,255,0.1), 0 18px 40px rgba(0,0,0,0.5)' : '0 18px 40px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.25)',
        transform: `translateX(-50%) scale(${compact ? 0.8 : 1}) translateY(${compact ? 8 : 0}px)`, transformOrigin: 'bottom center',
        transition: 'transform .55s cubic-bezier(.34,1.56,.64,1)',
      };
      const navSheen = { position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none', opacity: lx == null ? 0 : 1, transition: 'opacity .3s', background: `radial-gradient(120px 60px at ${lx ?? 50}% 0%, rgba(255,255,255,0.28), transparent 70%)` };
      const indicator = {
        position: 'absolute', top: PAD, pointerEvents: 'none', opacity: tab < 0 ? 0 : 1,
        ...(BRED ? { left: `calc(${PAD}px + ${Math.max(0, Math.min(tab, N - 1))} * (${CELL} + ${GAP}px))`, width: `calc(${CELL})`, height: SH, borderRadius: SH / 2,
          background: 'rgba(0,0,0,0.42)', boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.06), inset 0 1px 2px rgba(0,0,0,0.3)' }
          : { left: PAD + Math.max(0, Math.min(tab, N - 1)) * (SZ + GAP), width: SZ, height: SH, borderRadius: NAVN ? 26 : 22,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.34), rgba(255,255,255,0.14))',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 1px rgba(255,255,255,0.15), 0 4px 14px rgba(0,0,0,0.25)' }),
        backdropFilter: 'blur(6px) saturate(200%)', WebkitBackdropFilter: 'blur(6px) saturate(200%)',
        transform: moving ? `scaleX(${1 + Math.min(dist, 4) * 0.12}) scaleY(${1 - Math.min(dist, 4) * 0.04})` : 'scale(1)',
        transition: 'left .5s cubic-bezier(.34,1.4,.64,1), transform .45s cubic-bezier(.34,1.8,.64,1), opacity .25s',
      };
      const dock = ITEMS.map(([icon, title, dot], i) => { const act = i === tab; return { i, icon, title,
        style: { position: 'relative', zIndex: 1, ...(BRED ? { flex: '1 1 0', minWidth: 0 } : { flex: 'none', width: SZ }), height: SH, borderRadius: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, color: '#f2f1ee', transition: 'transform .35s cubic-bezier(.34,1.8,.64,1)', WebkitTapHighlightColor: 'transparent' },
        label: BRED ? { maxWidth: 'calc(100% - 6px)', fontSize: 11, fontWeight: 600, lineHeight: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: act ? ACC : '#f2f1ee', transition: 'color .25s' }
          : { maxWidth: SZ - 6, fontSize: 10, fontWeight: 500, lineHeight: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: act ? 1 : 0.62, transition: 'opacity .2s' },
        iconStyle: BRED ? { fontSize: 24, color: act ? ACC : '#f2f1ee', transform: act ? 'scale(1.06)' : 'scale(1)', fontVariationSettings: "'FILL' 1", transition: 'transform .4s cubic-bezier(.34,1.8,.64,1), color .25s' } : { fontSize: 22, opacity: act ? 1 : 0.72, transform: act ? 'scale(1.08)' : 'scale(1)', fontVariationSettings: `'FILL' ${act ? 1 : 0}`, transition: 'transform .4s cubic-bezier(.34,1.8,.64,1), opacity .2s', textShadow: '0 1px 2px rgba(0,0,0,0.3)' },
        dot: { position: 'absolute', right: BRED ? 'calc(50% - 16px)' : NAVN ? 13 : 9, top: NAVN ? 5 : 9, width: 7, height: 7, borderRadius: 4, background: dot ? C.red : 'transparent', boxShadow: dot ? '0 0 0 1.5px rgba(30,30,34,0.6)' : 'none' } }; });
      const menuItems = LAY.menu.map((m, i) => [m.ikon || 'circle', m.navn || '', i, m.farge || '#c9c7c2', dotOf(m)]);
      const hjemEditHTML = () => {
        const HU = KD.ud(this, 'kd_hjem'), SK = new Set(HU.skjul || []), [V, H] = this.hjemCols(HU);
        const ib = (arg, icon, title, col, dis) => `<button class="kd-press" data-on-click="hjemOp" data-arg="${e(arg)}" title="${title}" style="${S({ width: 34, height: 34, borderRadius: 17, flex: 'none', display: 'grid', placeItems: 'center', color: col || '#8e8d89', opacity: dis ? 0.25 : 1, pointerEvents: dis ? 'none' : null })}"><span class="ms" style="font-size:20px">${icon}</span></button>`;
        const rows = (g, keys, lab, hideKey) => keys.map((k, i) => { const hid = SK.has(hideKey + ':' + k), [icon, name] = lab[k];
          return `<div data-key="he-${g}-${k}" style="min-height:46px;padding:0 4px 0 12px;border-radius:16px;display:flex;align-items:center;gap:10px;opacity:${hid ? 0.45 : 1}">
            <span class="ms" style="font-size:20px;color:#c9c7c2">${icon}</span>
            <span style="flex:1;min-width:0;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(name)}</span>
            ${ib(g + '|' + k + '|opp', 'arrow_upward', 'Flytt opp', null, i === 0)}${ib(g + '|' + k + '|ned', 'arrow_downward', 'Flytt ned', null, i === keys.length - 1)}
            ${g === 'venstre' || g === 'hoyre' ? ib(g + '|' + k + '|bytt', 'swap_horiz', 'Bytt kolonne') : ''}
            ${ib(g + '|' + k + '|skjul', hid ? 'visibility_off' : 'visibility', hid ? 'Vis' : 'Skjul', hid ? '#6d6c69' : 'oklch(0.82 0.1 350)')}
          </div>`; }).join('');
        const head = t => `<div style="padding:12px 14px 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8e8d89">${t}</div>`;
        const chipH = (on, arg, fn, label, icon) => `<button class="kd-press" data-on-click="${fn}" data-arg="${e(arg)}" style="${S({ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 17, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', background: on ? 'oklch(0.78 0.13 350 / 0.2)' : 'rgba(255,255,255,0.06)', boxShadow: on ? 'inset 0 0 0 1.5px oklch(0.78 0.13 350 / 0.7)' : 'none', color: on ? '#f2f1ee' : '#a9a7a2' })}">${icon ? `<span class="ms" style="font-size:16px">${e(icon)}</span>` : ''}${e(label)}</button>`;
        const ib2 = (fn, arg, icon, title, col, dis) => `<button class="kd-press" data-on-click="${fn}" data-arg="${e(arg)}" title="${title}" style="${S({ width: 34, height: 34, borderRadius: 17, flex: 'none', display: 'grid', placeItems: 'center', color: col || '#8e8d89', opacity: dis ? 0.25 : 1, pointerEvents: dis ? 'none' : null })}"><span class="ms" style="font-size:20px">${icon}</span></button>`;
        const shown = this.persons.map(p => p.id), PA = this.personsAll;
        const persRows = [...shown.map(id => PA.find(p => p.id === id)).filter(Boolean), ...PA.filter(p => !shown.includes(p.id))].map(p => { const on = shown.includes(p.id), i = shown.indexOf(p.id);
          return `<div data-key="he-p-${e(p.id)}" style="min-height:46px;padding:0 4px 0 12px;border-radius:16px;display:flex;align-items:center;gap:10px;opacity:${on ? 1 : 0.5}">
            <span style="width:26px;height:26px;border-radius:13px;flex:none;display:grid;place-items:center;font-size:12px;font-weight:600;background:${e(p.farge || '#2a2a2d')};${this.pic(p)}">${e((p.navn || '?')[0])}</span>
            <span style="flex:1;min-width:0;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(p.navn)}${p.id === this.meId ? ' <span style="color:#6d6c69;font-size:12px">(deg)</span>' : ''}</span>
            ${on ? ib2('hjemPers', p.id + '|opp', 'arrow_upward', 'Flytt opp', null, i === 0) : ''}
            ${ib2('hjemPers', p.id + (on ? '|skjul' : '|vis'), on ? 'remove_circle' : 'add_circle', on ? 'Fjern' : 'Legg til', on ? C.red : C.green)}
          </div>`; }).join('');
        const visF = this.floorsVis().map(f => f[0]), allRooms = Object.values(this.roomsAll);
        const etgRows = FLOORS.map(([k, label]) => { const on = visF.includes(k), open = s.etgOpen === k, rs = k === 'aktuelt' ? null : this.floorRooms(k);
          return `<div data-key="he-e-${k}" style="border-radius:16px;${open ? 'background:rgba(255,255,255,0.04);' : ''}">
            <div style="min-height:46px;padding:0 4px 0 12px;display:flex;align-items:center;gap:10px;opacity:${on ? 1 : 0.5}">
              <span class="ms" style="font-size:20px;color:#c9c7c2">${k === 'hjem' ? 'home' : k === 'aktuelt' ? 'bolt' : 'stairs'}</span>
              <span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:14px">${e(label)}</span><span style="font-size:11px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${rs ? e(rs.map(id => (this.roomsAll[id] || {}).navn || id).join(', ') || 'Ingen rom') : 'Rom med lys eller media på'}</span></span>
              ${rs ? ib2('hjemEtg', k + '|apne', open ? 'expand_less' : 'edit', 'Velg rom') : ''}
              ${ib2('hjemEtg', k + '|skjul', on ? 'visibility' : 'visibility_off', on ? 'Skjul' : 'Vis', on ? 'oklch(0.82 0.1 350)' : '#6d6c69')}
            </div>
            ${open ? `<div style="display:flex;flex-wrap:wrap;gap:6px;padding:0 10px 10px">${allRooms.map(r => chipH(rs.includes(r.id), k + '|rom|' + r.id, 'hjemEtg', r.navn, r.ikon)).join('')}</div>` : ''}
          </div>`; }).join('');
        return `<div data-key="he-bd" data-on-click="hjemEditClose" style="position:fixed;inset:0;z-index:27;background:rgba(0,0,0,0.35)"></div>
    <div data-key="he-panel" style="position:fixed;left:50%;transform:translateX(-50%);bottom:${MB}px;z-index:28;width:min(420px, calc(100vw - 24px));max-height:calc(100vh - ${MB + 40}px);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;box-sizing:border-box;padding:8px;border-radius:26px;background:rgba(40,40,44,0.78);backdrop-filter:blur(26px) saturate(190%);-webkit-backdrop-filter:blur(26px) saturate(190%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.3),inset 0 0 0 0.5px rgba(255,255,255,0.18),0 18px 40px rgba(0,0,0,0.5);display:flex;flex-direction:column;gap:2px">
      <div style="display:flex;align-items:center;gap:8px;padding:6px 6px 6px 14px"><span style="flex:1;font-size:16px;font-weight:600">Tilpass Hjem</span>
        <button class="kd-hov8" data-on-click="hjemReset" style="height:34px;padding:0 12px;border-radius:17px;font-size:12px;color:#a9a7a2">Nullstill</button>
        <button data-on-click="hjemEditClose" style="height:34px;padding:0 14px;border-radius:17px;font-size:13px;font-weight:600;background:linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20));color:#2a1720">Ferdig</button></div>
      ${head('Topp-oppsett')}<div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 10px 6px">${[['standard', 'Standard', 'view_agenda'], ['familie', 'Familie', 'family_restroom']].map(([v, l, ic]) => chipH((HU.topp || c.topp || 'standard') === v, 'topp|' + v, 'hjemSet', l, ic)).join('')}</div>
      ${(HU.topp || c.topp) === 'familie' ? `<div style="display:flex;flex-direction:column;gap:4px;padding:2px 10px 8px"><input data-key="he-hilsen" data-keep="1" data-on-change="hjemHilsen" value="${e(HU.hilsen || c.hilsen || '👋 {navn}!')}" placeholder="👋 {navn}!" autocomplete="off" style="height:38px;padding:0 14px;border-radius:19px;border:none;outline:none;background:#262629;color:#f2f1ee;font:inherit;font-size:13px"><span style="font-size:11px;color:#6d6c69;padding-left:6px">{navn} = ditt fornavn, {server} = servernavnet</span></div>` : ''}
      ${head('Tittel øverst')}<div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 10px 6px">${[['server', 'Servernavn', 'dns'], ['person', 'Mitt navn', 'person']].map(([v, l, ic]) => chipH(((HU.tittel || c.tittel || 'server') === v), 'tittel|' + v, 'hjemSet', l, ic)).join('')}</div>
      ${head('Seksjoner')}${rows('sek', norm(HU.seksjoner, SEK_KEYS), HLABEL.sek, 'sek')}
      ${head('Personer på toppen')}<div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 10px 6px">
        ${chipH(HU.person_navn !== false, 'person_navn|' + (HU.person_navn === false), 'hjemSet', 'Navn', 'badge')}
        ${chipH(HU.person_sted !== false, 'person_sted|' + (HU.person_sted === false), 'hjemSet', 'Sted', 'location_on')}
        ${chipH(!!HU.person_ikon, 'person_ikon|' + !HU.person_ikon, 'hjemSet', 'Ikon foran navn', 'home_pin')}
        ${chipH(HU.person_ring !== false, 'person_ring|' + (HU.person_ring === false), 'hjemSet', 'Ring rundt meg', 'radio_button_unchecked')}
      </div>${persRows}
      ${head('Etasjer')}${etgRows}
      ${head('Romkort')}<div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 10px 6px">${[['stor', 'Stor'], ['middels', 'Middels'], ['liten', 'Liten']].map(([v, l]) => chipH((HU.romkort || c.romkort || 'stor') === v, 'romkort|' + v, 'hjemSet', l)).join('')}
        ${chipH(HU.klimaknapp != null ? HU.klimaknapp !== false : c.klimaknapp !== false, 'klimaknapp|' + (HU.klimaknapp != null ? HU.klimaknapp === false : c.klimaknapp === false), 'hjemSet', 'Klimaknapp', 'thermostat')}</div>
      ${head('Avstand under strømpriser')}<div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 10px 6px">${[[0, 'Ingen'], [24, 'Liten'], [60, 'Middels'], [120, 'Stor']].map(([v, l]) => chipH(+(HU.gap_strom || 0) === v, 'gap_strom|' + v, 'hjemSet', l)).join('')}</div>
      ${head('Setningen øverst')}${rows('prosa', norm(HU.prosa, PROSA_KEYS), HLABEL.prosa, 'prosa')}
      ${head('Fliser – venstre kolonne')}${rows('venstre', V, HLABEL.flis, 'flis')}
      ${head('Fliser – høyre kolonne')}${rows('hoyre', H, HLABEL.flis, 'flis')}
    </div>`;
      };
      const dockEditHTML = () => {
        const sw = on => `<span style="${S({ width: 44, height: 26, borderRadius: 13, flex: 'none', position: 'relative', background: on ? 'oklch(0.78 0.13 350)' : '#3a3a3d', transition: 'background .2s' })}"><span style="${S({ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: 10, background: '#f4f3ef', transition: 'left .25s cubic-bezier(.34,1.56,.64,1)' })}"></span></span>`;
        const opt = (k, label, sub, on) => `<button class="kd-hov8" data-on-click="dockOpt" data-arg="${k}" style="min-height:52px;padding:6px 10px 6px 14px;border-radius:16px;display:flex;align-items:center;gap:12px;text-align:left"><span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:14px;font-weight:500">${label}</span><span style="font-size:11px;color:#8e8d89">${sub}</span></span>${sw(on)}</button>`;
        const row = (it, i, inDock) => `<div data-key="de-${e(it._k)}" style="min-height:48px;padding:0 6px 0 12px;border-radius:16px;display:flex;align-items:center;gap:12px">
            <span class="ms" style="font-size:20px;color:${inDock === true ? '#f2f1ee' : e(it.farge || '#c9c7c2')}">${e(it.ikon || 'circle')}</span>
            <span style="flex:1;min-width:0;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(it.navn || it._k)}</span>
            ${inDock === true && i > 0 ? `<button class="kd-press" data-on-click="dockMove" data-arg="${e('opp|' + it._k)}" title="Flytt til venstre" style="width:36px;height:36px;border-radius:18px;display:grid;place-items:center;color:#8e8d89"><span class="ms" style="font-size:20px">arrow_upward</span></button>` : ''}
            ${inDock === 'skjult' ? '' : `<button class="kd-press" data-on-click="dockMove" data-arg="${e((inDock ? 'ut|' : 'inn|') + it._k)}" title="${inDock ? 'Flytt til «Mer»' : 'Legg i dokken'}" style="${S({ width: 36, height: 36, borderRadius: 18, display: 'grid', placeItems: 'center', color: inDock ? C.red : C.green, opacity: !inDock && LAY.dock.length >= 7 ? 0.3 : 1 })}"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">${inDock ? 'remove_circle' : 'add_circle'}</span></button>`}
            ${it._egen ? `<button class="kd-press" data-on-click="dockMove" data-arg="${e('slett|' + it._k)}" title="Slett knappen" style="width:36px;height:36px;border-radius:18px;display:grid;place-items:center;color:#8e8d89"><span class="ms" style="font-size:20px">delete</span></button>`
              : `<button class="kd-press" data-on-click="dockMove" data-arg="${e((inDock === 'skjult' ? 'vis|' : 'skjul|') + it._k)}" title="${inDock === 'skjult' ? 'Vis igjen' : 'Skjul helt'}" style="width:36px;height:36px;border-radius:18px;display:grid;place-items:center;color:${inDock === 'skjult' ? 'oklch(0.82 0.1 350)' : '#8e8d89'}"><span class="ms" style="font-size:20px">${inDock === 'skjult' ? 'visibility' : 'visibility_off'}</span></button>`}
          </div>`;
        const chipB = (on, arg, fn, label, icon) => `<button class="kd-press" data-on-click="${fn}" data-arg="${e(arg)}" style="${S({ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 17, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', background: on ? 'oklch(0.78 0.13 350 / 0.2)' : 'rgba(255,255,255,0.06)', boxShadow: on ? 'inset 0 0 0 1.5px oklch(0.78 0.13 350 / 0.7)' : 'none', color: on ? '#f2f1ee' : '#a9a7a2' })}">${icon ? `<span class="ms" style="font-size:16px">${e(icon)}</span>` : ''}${e(label)}</button>`;
        const inp = (k, ph, v) => `<input data-key="ny-${k}" data-keep="1" data-on-input="nyInput" data-arg="${k}" placeholder="${ph}" value="${e(v || '')}" autocomplete="off" style="height:38px;min-width:0;flex:1;padding:0 14px;border-radius:19px;border:none;outline:none;background:#262629;color:#f2f1ee;font:inherit;font-size:13px;box-sizing:border-box">`;
        const nyT = s.ny, nyV = s.nyVal;
        const valg = nyT === 'ark' ? Object.keys(TAGS).filter(k => k !== 'rom').map(k => chipB(nyV === k, k, 'nyVal', (HEADS[k] || [])[1] || k, (HEADS[k] || [])[0]))
          : nyT === 'rom' ? Object.values(this.roomsAll).map(r => chipB(nyV === r.id, r.id, 'nyVal', r.navn, r.ikon))
          : nyT === 'person' ? this.persons.map(p => chipB(nyV === p.id, p.id, 'nyVal', p.navn, 'person')) : [];
        const nyHTML = `<div style="padding:12px 14px 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8e8d89">Ny knapp</div>
      <div style="display:flex;flex-direction:column;gap:8px;padding:4px 8px 8px">
        <div style="display:flex;flex-wrap:wrap;gap:6px">${[['ark', 'Popup', 'web_asset'], ['rom', 'Rom', 'meeting_room'], ['person', 'Person', 'person'], ['sti', 'Side / URL', 'link']].map(([k, l, ic]) => chipB(nyT === k, k, 'nyType', l, ic)).join('')}</div>
        ${nyT === 'sti' ? `<div style="display:flex">${inp('sti', '/lovelace/2, #hash eller https://…', (this._ny || {}).sti)}</div>` : valg.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;max-height:180px;overflow-y:auto">${valg.join('')}</div>` : ''}
        ${nyT ? `<div style="display:flex;gap:6px">${inp('navn', 'Navn', (this._ny || {}).navn)}${inp('ikon', 'Ikon (f.eks. bolt)', (this._ny || {}).ikon)}</div>
        <button data-on-click="nyAdd" style="${S({ height: 40, borderRadius: 20, fontSize: 13, fontWeight: 600, background: nyV ? 'linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20))' : 'rgba(255,255,255,0.06)', color: nyV ? '#2a1720' : '#6d6c69' })}">Legg til</button>` : ''}
      </div>`;
        return `<div data-key="de-bd" data-on-click="dockEditClose" style="position:fixed;inset:0;z-index:27;background:rgba(0,0,0,0.35)"></div>
    <div data-key="de-panel" style="position:fixed;left:50%;transform:translateX(-50%);bottom:${MB}px;z-index:28;width:min(400px, calc(100vw - 24px));max-height:calc(100vh - 140px);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;box-sizing:border-box;padding:8px;border-radius:26px;background:rgba(40,40,44,0.72);backdrop-filter:blur(26px) saturate(190%);-webkit-backdrop-filter:blur(26px) saturate(190%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.3),inset 0 0 0 0.5px rgba(255,255,255,0.18),0 18px 40px rgba(0,0,0,0.5);display:flex;flex-direction:column;gap:2px">
      <div style="display:flex;align-items:center;gap:8px;padding:6px 6px 6px 14px"><span style="flex:1;font-size:16px;font-weight:600">Tilpass dokken</span>
        <button class="kd-hov8" data-on-click="dockReset" style="height:34px;padding:0 12px;border-radius:17px;font-size:12px;color:#a9a7a2">Nullstill</button>
        <button data-on-click="dockEditClose" style="height:34px;padding:0 14px;border-radius:17px;font-size:13px;font-weight:600;background:linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20));color:#2a1720">Ferdig</button></div>
      ${opt('bred', 'Bred dokk', 'Fyller bredden, som Apple Music', OPT.bred)}
      ${opt('navn', 'Vis navn', 'Navn under ikonene i dokken', OPT.navn)}
      ${opt('krymp', 'Krymp ved scrolling', 'Dokken blir mindre når du scroller ned', OPT.krymp)}
      <div style="padding:12px 14px 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8e8d89">I dokken</div>
      ${LAY.dock.map((it, i) => row(it, i, true)).join('') || '<div style="padding:8px 14px;font-size:13px;color:#6d6c69">Ingen – alt ligger i «Mer»</div>'}
      <div style="padding:12px 14px 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8e8d89">Bak de tre prikkene</div>
      ${LAY.menu.map((it, i) => row(it, i, false)).join('') || '<div style="padding:8px 14px;font-size:13px;color:#6d6c69">Tom</div>'}
      ${LAY.hidden.length ? `<div style="padding:12px 14px 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8e8d89">Skjult</div>${LAY.hidden.map((it, i) => row(it, i, 'skjult')).join('')}` : ''}
      ${nyHTML}
    </div>`;
      };

      /* ----- servere ----- */
      const SERV = this.servers();
      const CUR = this.currentServer(SERV), curServer = CUR.i;
      const srvIkon = v => v.ikon || (SERVER_IKON.find(([m]) => m.test(vask(v.navn))) || [0, 'home'])[1];
      const serverChev = { fontSize: 30, color: '#c9c7c2', fontVariationSettings: "'FILL' 1", transform: s.serverMenu ? 'rotate(180deg)' : 'none', transition: 'transform .25s' };

      /* ----- ark ----- */
      const sheetBackdrop = { position: 'fixed', inset: 0, zIndex: 20, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', opacity: s.sheetOpen ? 1 : 0, pointerEvents: s.sheetOpen ? 'auto' : 'none', transition: 'opacity .35s' };
      const sheetPanel = { position: 'fixed', left: '50%', bottom: 0, zIndex: 21, width: '100%', maxWidth: 'var(--kd-ark-bredde, 100%)', height: 'calc(100vh - 52px)', display: 'flex', flexDirection: 'column', borderRadius: '38px 38px 0 0', overflow: 'hidden', background: '#141416', boxShadow: '0 -20px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)', transform: `translateX(-50%) translateY(${s.sheetOpen ? 0 : 105}%)`, transition: 'transform .5s cubic-bezier(.32,1.2,.5,1)' };
      const sh = this.sheetHeadVals();

      /* ----- dialoger ----- */
      const quickHTML = () => {
        const q = s.quickId, p = PALL.find(x => x.id === q); if (!p) return '';
        const qp = this.personState(p);
        const opt = (on, icon, label, col, arg) => `<button data-on-click="quickSet" data-arg="${arg}" style="${S({ height: 48, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, fontWeight: 600, background: on ? col : 'transparent', color: on ? '#141416' : '#c9c7c2', transition: 'background .25s, color .25s' })}"><span class="ms" style="${S({ fontSize: 20, fontVariationSettings: `'FILL' ${on ? 1 : 0}` })}">${icon}</span>${label}</button>`;
        const av = { position: 'absolute', left: '50%', top: -48, transform: 'translateX(-50%)', width: 96, height: 96, borderRadius: 48, display: 'grid', placeItems: 'center', fontSize: 36, fontWeight: 600, background: p.farge, boxShadow: `0 0 0 4px #141416, 0 0 0 6px ${qp.home ? GREEN : PURP}` };
        return `<div data-key="quick-bd" data-on-click="quickClose" style="position:fixed;inset:0;z-index:30;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:fadein .25s ease-out"></div>
    <div style="position:fixed;left:50%;top:50%;z-index:31;width:300px;max-width:calc(100vw - 40px);box-sizing:border-box;padding:62px 14px 14px;border-radius:30px;background:#232326;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08),0 30px 60px rgba(0,0,0,0.5);display:flex;flex-direction:column;gap:10px;transform:translate(-50%,-50%);animation:pop .4s cubic-bezier(.34,1.56,.64,1)">
      <div style="${S(av)}${this.pic(p)}">${e(p.navn[0])}</div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px;padding-bottom:4px">
        <div style="font-size:22px;font-weight:600;letter-spacing:-0.01em">${e(p.navn)}</div>
        <div style="font-size:13px;color:#8e8d89">${qp.home ? 'Hjemme' : 'Borte'} · ${qp.sleep ? 'Sover' : 'Våken'}</div>
      </div>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:4px;padding:4px;border-radius:26px;background:#1a1a1c">${opt(qp.home, 'home', 'Hjemme', GREEN, 'home:1')}${opt(!qp.home, 'logout', 'Borte', BLUE, 'home:0')}</div>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:4px;padding:4px;border-radius:26px;background:#1a1a1c">${opt(!qp.sleep, 'light_mode', 'Våken', AMBER, 'sleep:0')}${opt(qp.sleep, 'bedtime', 'Sover', 'oklch(0.72 0.1 275)', 'sleep:1')}</div>
      <button data-on-click="quickClose" style="height:52px;border-radius:26px;background:linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20));color:#2a1720;font-size:15px;font-weight:600">Ferdig</button>
      <button data-on-click="quickDetails" style="height:36px;display:flex;align-items:center;justify-content:center;gap:4px;font-size:13px;color:#a9a7a2">Mobil, soner og søvn<span class="ms" style="font-size:18px">chevron_right</span></button>
    </div>`;
      };
      const lockHTML = () => {
        if (!s.lockOpen) return '';
        const L = locked, G = 'oklch(0.8 0.12 150)', A = 'oklch(0.82 0.12 75)', col = L ? G : A;
        const autoId = this.autolasId(), auto = autoId ? this.isOn(autoId) : null;
        const opt = (on, icon, label, c2, arg) => `<button data-on-click="lockSet" data-arg="${arg}" style="${S({ height: 48, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14, fontWeight: 500, background: on ? c2.replace(')', ' / 0.18)') : 'transparent', color: on ? '#f2f1ee' : '#a9a7a2', boxShadow: on ? `inset 0 0 0 1px ${c2.replace(')', ' / 0.4)')}` : 'none', transition: 'background .25s' })}"><span class="ms" style="${S({ fontSize: 19, color: on ? c2 : '#8e8d89', fontVariationSettings: "'FILL' 1" })}">${icon}</span>${label}</button>`;
        const orb = { position: 'absolute', left: '50%', top: -48, transform: 'translateX(-50%)', width: 96, height: 96, borderRadius: 48, display: 'grid', placeItems: 'center', background: col.replace(')', ' / 0.2)'), boxShadow: `0 0 0 6px #232326, 0 12px 30px ${col.replace(')', ' / 0.35)')}`, transition: 'background .4s, box-shadow .4s' };
        const ring = { position: 'absolute', inset: 6, borderRadius: '50%', background: `conic-gradient(${col} ${L ? 360 : 90}deg, transparent 0)`, WebkitMask: 'radial-gradient(circle, transparent 38px, #000 39px)', mask: 'radial-gradient(circle, transparent 38px, #000 39px)', transform: `rotate(${(s.lockSpin || 0) * 360}deg)`, transition: 'transform .8s cubic-bezier(.34,1.3,.64,1), background .4s' };
        const iconStyle = { position: 'relative', fontSize: 40, color: col, fontVariationSettings: "'FILL' 1", transform: L ? 'scale(1)' : 'scale(1.08) rotate(-8deg)', transition: 'transform .5s cubic-bezier(.34,1.8,.64,1), color .3s' };
        const autoTrack = { position: 'relative', width: 44, height: 26, borderRadius: 13, flex: 'none', background: auto ? 'oklch(0.78 0.13 350)' : '#3a3a3d', transition: 'background .2s' };
        const autoKnob = { position: 'absolute', top: 3, left: auto ? 21 : 3, width: 20, height: 20, borderRadius: 10, background: '#f4f3ef', transition: 'left .2s' };
        const bat = this.n(c.las_batteri);
        const who = this.ok(c.las_sist) ? this.v(c.las_sist) : '';
        const lockEnt = this.st(c.las);
        const last = (L ? 'Låst' : 'Låst opp') + (who ? ' av ' + who : '');
        const lastT = lockEnt ? KD.hm(lockEnt.last_changed) : '–';
        const autoMin = autoId ? (this.at(autoId, 'auto_relock_time') || this.at(autoId, 'minutter')) : null;
        return `<div data-key="lock-bd" data-on-click="lockClose" style="position:fixed;inset:0;z-index:30;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:fadein .25s ease-out"></div>
    <div style="position:fixed;left:50%;top:50%;z-index:31;width:300px;max-width:calc(100vw - 40px);box-sizing:border-box;padding:62px 14px 14px;border-radius:30px;background:#232326;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08),0 30px 60px rgba(0,0,0,0.5);display:flex;flex-direction:column;gap:10px;transform:translate(-50%,-50%);animation:pop .4s cubic-bezier(.34,1.56,.64,1)">
      <button data-on-click="lockToggle" style="${S(orb)}">
        <span style="${S(ring)}"></span>
        <span class="ms" style="${S(iconStyle)}">${L ? 'lock' : 'lock_open'}</span>
      </button>
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px;padding-bottom:4px">
        <div style="font-size:22px;font-weight:600;letter-spacing:-0.01em">${L ? 'Låst' : 'Ulåst'}</div>
        <div style="font-size:13px;color:#8e8d89">Inngangsdør · ${L ? 'sikret' : 'åpen for inngang'}</div>
      </div>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:4px;padding:4px;border-radius:26px;background:#1a1a1c">${opt(L, 'lock', 'Lås', G, '1')}${opt(!L, 'lock_open', 'Lås opp', A, '0')}</div>
      <div style="display:flex;flex-direction:column;padding:4px 10px;border-radius:22px;background:#1a1a1c">
        ${autoId ? `<button data-on-click="lockAuto" style="display:flex;align-items:center;gap:10px;height:48px;text-align:left"><span class="ms" style="font-size:20px;color:#a9a7a2">lock_clock</span><span style="flex:1;font-size:14px">${autoMin ? `Autolås etter ${e(autoMin)} min` : 'Autolås'}</span><span style="${S(autoTrack)}"><span style="${S(autoKnob)}"></span></span></button>` : ''}
        <div style="display:flex;align-items:center;gap:10px;height:44px;${autoId ? 'border-top:1px solid rgba(255,255,255,0.05)' : ''}"><span class="ms" style="font-size:20px;color:#a9a7a2">${bat == null ? 'battery_unknown' : bat > 80 ? 'battery_full' : bat > 60 ? 'battery_5_bar' : bat > 40 ? 'battery_4_bar' : bat > 20 ? 'battery_3_bar' : 'battery_1_bar'}</span><span style="flex:1;font-size:14px">Batteri</span><span style="font-size:13px;color:#c9c7c2">${bat == null ? '–' : Math.round(bat) + ' %'}</span></div>
        <div style="display:flex;align-items:center;gap:10px;height:44px;border-top:1px solid rgba(255,255,255,0.05)"><span class="ms" style="font-size:20px;color:#a9a7a2">history</span><span style="flex:1;font-size:14px">${e(last)}</span><span style="font-size:13px;color:#c9c7c2">${e(lastT)}</span></div>
      </div>
      <button data-on-click="lockClose" style="height:52px;border-radius:26px;background:linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20));color:#2a1720;font-size:15px;font-weight:600">Ferdig</button>
    </div>`;
      };

      /* ----- Tilpass Hjem: rekkefølge/synlighet (per bruker, 'kd_hjem') ----- */
      const HU = KD.ud(this, 'kd_hjem'), HSKJUL = new Set(HU.skjul || []);
      const P_UTE = `<button data-on-click="openWeather" style="display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 11px;border-radius:16px;background:#232326;font-weight:500;vertical-align:middle;white-space:nowrap"><span class="ms" style="font-size:18px;color:#bdbbb6">${W.icon}</span>${W.t != null ? nf(W.t, 1) : '–'}°</button>`, P_PRIS = `<button data-on-click="goPower" style="${S(pricePill)}"><span style="${S(priceDot)}"></span><span>${pNow != null ? nf(pNow) : '–'}</span> kr</button>`, P_WATT = `<span style="display:inline-flex;align-items:center;height:32px;padding:0 11px;border-radius:16px;background:#232326;font-weight:500;vertical-align:middle;white-space:nowrap;font-variant-numeric:tabular-nums"><span>${watt}</span> W</span>`, P_LYS = `<button data-on-click="showLights" style="display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 11px;border-radius:16px;background:oklch(0.86 0.12 95 / 0.16);box-shadow:inset 0 0 0 1px oklch(0.86 0.12 95 / 0.4);font-weight:500;vertical-align:middle;white-space:nowrap"><span class="ms" style="font-size:18px;color:oklch(0.86 0.12 95);font-variation-settings:'FILL' 1">lightbulb</span><span>${lightsOn}</span> lys</button>`, P_CAL = `<button data-on-click="openCal" style="display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 11px;border-radius:16px;background:#232326;font-weight:500;vertical-align:middle;white-space:nowrap"><span class="ms" style="font-size:18px;color:oklch(0.8 0.12 250)">event</span>${nEv == null ? '–' : nEv} ${nEv === 1 ? 'hendelse' : 'hendelser'}</button>`;
      const PROSA_DEL = { ute: () => `Ute er det ${P_UTE}.`, strom: () => `Strømmen koster ${P_PRIS}.`, effekt: () => `Vi bruker ${P_WATT}.`, lys: () => `Det er ${P_LYS} på.`, hendelser: () => `Vi har ${P_CAL} i dag.` };
      const PR = norm(HU.prosa, PROSA_KEYS), prVis = PR.filter(k => !HSKJUL.has('prosa:' + k));
      const prosaTxt = prVis.join() === PROSA_KEYS.join() ? `Ute er det ${P_UTE}. Strømmen koster ${P_PRIS} og vi bruker ${P_WATT} med ${P_LYS} på. Vi har ${P_CAL} i dag.` : prVis.map(k => PROSA_DEL[k]()).join(' ');
      const TILE = { las: () => tileHTML(lockTile), romV: () => carousel(left, 'iL'), alarm: () => tileHTML(alarmTile), romH: () => carousel(right, 'iR'), kamera: () => tileHTML(camTile), gjoremal: () => tileHTML(todoTile) };
      const [COLV0, COLH0] = this.hjemCols(HU);
      const COLV = COLV0.filter(k => !HSKJUL.has('flis:' + k)), COLH = COLH0.filter(k => !HSKJUL.has('flis:' + k));
      const SEK = {
        personer: () => FAM ? '' : `    <div data-key="h-personer" style="display:flex;gap:14px;flex-wrap:wrap;margin-top:-6px">
      ${people.map(({ p, avatar }) => { const pl = this.placeOf(p); return `<button data-key="pers-${e(p.id)}" data-on-click="quickPerson" data-hold="openPerson" data-arg="${e(p.id)}" title="${e(p.navn)} · ${e(pl.navn)}" style="position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;max-width:72px">
          <span style="${S(avatar)}${this.pic(p)}">${e(p.navn[0])}</span>
          <span style="position:absolute;left:30px;top:-5px;width:24px;height:24px;border-radius:12px;background:#232326;box-shadow:0 0 0 2px #141416;display:grid;place-items:center">${this.placeIcon(pl, 15)}</span>
          ${PNAVN ? `<span style="display:flex;align-items:center;gap:3px;font-size:11px;color:#c9c7c2;white-space:nowrap;max-width:72px">${PIKON ? this.placeIcon(pl, 12) : ''}<span style="min-width:0;overflow:hidden;text-overflow:ellipsis">${e(p.navn)}</span></span>` : ''}
          ${PSTED ? `<span style="margin-top:-3px;font-size:10px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:72px">${e(pl.navn)}</span>` : ''}
        </button>`; }).join('')}
    </div>`,
        prosa: () => prVis.length ? `<div data-key="h-prosa" style="font-size:22px;font-weight:400;line-height:1.75;letter-spacing:-0.01em;text-wrap:pretty;margin-top:-6px">
      ${prosaTxt}
    </div>` : '',
        rom: () => `  <section data-key="h-rom" style="display:flex;flex-direction:column;gap:12px">
    ${KD.segHTML('etg', FL.map(([k, label]) => [k, label]), floor, 'goFloor', { pink: true, bg: 'transparent', style: 'align-self:flex-start;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.14);max-width:100%' })}
    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;align-items:start">
      <div style="display:flex;flex-direction:column;gap:8px;min-width:0">${COLV.map(k => TILE[k]()).join('')}</div>
      <div style="display:flex;flex-direction:column;gap:8px;min-width:0">${COLH.map(k => TILE[k]()).join('')}</div>
    </div>
  </section>`,
        soppel: () => `  ${T ? `<section data-on-click="openTrash" style="display:flex;align-items:center;gap:16px;padding:16px 18px;border-radius:22px;background:#1c1c1f;cursor:pointer">
    <div style="width:56px;height:56px;border-radius:18px;background:#141416;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.06);display:flex;flex-direction:column;align-items:center;justify-content:center;flex:none">
      <span style="font-size:26px;font-weight:500;line-height:1;font-variant-numeric:tabular-nums">${T.days}</span>
      <span style="font-size:10px;color:#8e8d89">${T.days === 1 ? 'dag' : 'dager'}</span>
    </div>
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
      <div style="font-size:15px;font-weight:500">Søppeltømming ${e(T.when)}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${T.due.map(f => `<span style="height:26px;padding:0 10px 0 8px;border-radius:13px;display:flex;align-items:center;gap:5px;font-size:12px;background:#232326;white-space:nowrap"><span style="width:8px;height:8px;border-radius:4px;background:${f.col}"></span>${e(f.name)}</span>`).join('')}
      </div>
    </div>
  </section>` : ''}`,
        strom: () => `  <section data-key="h-strom" style="display:flex;flex-direction:column;gap:12px;margin-bottom:${+(HUR.gap_strom || c.gap_strom || 0)}px">
    <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:0 4px">Strømpriser</div>
    ${KD.segHTML('pris', MODES.map(([k, label]) => [k, label, { total: 'receipt_long', spot: 'show_chart', norges: 'verified' }[k]]), mode, 'pcMode', { pink: true })}
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;padding:0 4px">
      <div style="display:flex;flex-direction:column;gap:3px">
        <div style="font-size:12px;color:#8e8d89">${e(priceHead.label)}</div>
        <div style="font-size:28px;font-weight:300;letter-spacing:-0.025em;line-height:1;font-variant-numeric:tabular-nums;white-space:nowrap">${e(priceHead.v)}<span style="font-size:13px;color:#8e8d89"> kr/kWh</span></div>
      </div>
      <div style="font-size:12px;color:#a9a7a2;text-align:right;white-space:nowrap">${e(priceHead.meta)}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;padding:4px 0 0">
      <div style="display:flex;align-items:center;gap:10px;font-size:11px;color:#6d6c69;padding-left:26px"><span>${e(pc.caption)}</span><span style="${S(pc.legend)}"><span style="width:14px;border-top:1.5px dashed rgba(255,255,255,0.45)"></span>Spot totalpris</span></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#8e8d89;padding-left:26px"><span style="flex:1;text-align:center">I dag</span><span style="flex:1;text-align:center">I morgen</span></div>
      <div style="display:flex;gap:6px">
        <div style="display:flex;flex-direction:column;justify-content:space-between;font-size:9px;color:#6d6c69;font-variant-numeric:tabular-nums;height:150px;width:20px;text-align:right">
          ${pc.yl.map(y => `<span style="line-height:0">${y}</span>`).join('')}
        </div>
        <div data-on-pointermove="pcMove" data-on-pointerdown="pcMove" data-on-pointerleave="pcLeave" style="position:relative;flex:1;height:150px;touch-action:pan-y;cursor:crosshair">
          <svg viewBox="0 0 480 150" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible">
            <defs>
              <linearGradient id="pcStroke" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="150">
                <stop offset="0" stop-color="oklch(0.74 0.17 55)"></stop>
                <stop offset="${pc.thrA}" stop-color="oklch(0.74 0.17 55)"></stop>
                <stop offset="${pc.thrB}" stop-color="oklch(0.78 0.13 175)"></stop>
                <stop offset="1" stop-color="oklch(0.78 0.13 175)"></stop>
              </linearGradient>
              <linearGradient id="pcFill" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="150">
                <stop offset="0" stop-color="oklch(0.74 0.17 55 / 0.28)"></stop>
                <stop offset="${pc.thrA}" stop-color="oklch(0.74 0.17 55 / 0.12)"></stop>
                <stop offset="${pc.thrB}" stop-color="oklch(0.78 0.13 175 / 0.14)"></stop>
                <stop offset="1" stop-color="oklch(0.78 0.13 175 / 0)"></stop>
              </linearGradient>
            </defs>
            ${pc.grid.map(g => `<line x1="0" x2="480" y1="${g}" y2="${g}" stroke="rgba(255,255,255,0.07)" stroke-width="1" vector-effect="non-scaling-stroke"></line>`).join('')}
            <line x1="240" x2="240" y1="0" y2="150" stroke="rgba(255,255,255,0.22)" stroke-width="1" vector-effect="non-scaling-stroke"></line>
            <path d="${pc.area}" fill="url(#pcFill)"></path>
            <path d="${pc.cmp}" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"></path>
            <path d="${pc.line}" fill="none" stroke="url(#pcStroke)" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path>
            <rect x="0" y="0" width="${pc.pastW}" height="150" fill="rgba(20,20,22,0.5)"></rect>
          </svg>
          <span style="${S(pc.selBand)}"></span>
          <span style="${S(pc.halo)}"></span>
          <span style="${S(pc.dot)}"></span>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:9px;color:#6d6c69;font-variant-numeric:tabular-nums;padding-left:26px"><span>04</span><span>08</span><span>12</span><span>16</span><span>20</span><span style="color:#a9a7a2">00</span><span>04</span><span>08</span><span>12</span><span>16</span><span>20</span></div>
    </div>
  </section>`,
      };
      const SECS = norm(HU.seksjoner, SEK_KEYS).filter(k => !HSKJUL.has('sek:' + k)).map(k => SEK[k]()).join('\n\n');


      const stdHead = () => `  <header style="display:flex;flex-direction:column;gap:16px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
      <div style="display:flex;flex-direction:column;gap:6px;min-width:0">
        <button data-on-click="toggleServer" data-no-haptic="1" style="display:flex;align-items:center;gap:4px;max-width:100%;font-size:36px;font-weight:600;letter-spacing:-0.03em;line-height:1;white-space:nowrap"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis">${e(KD.ud(this, 'kd_hjem').tittel === 'person' || c.tittel === 'person' ? me.navn : (CUR.navn || 'Hjem'))}</span><span class="ms" style="${S(serverChev)}">arrow_drop_down</span></button>
        <button data-on-click="openWeather" style="font-size:16px;color:#8e8d89;white-space:nowrap;text-align:left">${W.head != null ? Math.round(W.head) : '–'} °C · ${e(W.cond)}</button>
      </div>
      <button data-on-click="quickPerson" data-hold="openMe" title="${e(me.navn)} · ${e(this.placeOf(me).navn)}" style="position:relative;width:60px;height:60px;border-radius:30px;flex:none;display:grid;place-items:center;font-size:22px;font-weight:600;background:${e(me.farge)};box-shadow:${meRing};${this.pic(me)}">${e(me.navn[0])}<span style="position:absolute;right:-6px;top:-4px;width:24px;height:24px;border-radius:12px;background:#232326;box-shadow:0 0 0 2px #141416;display:grid;place-items:center">${this.placeIcon(this.placeOf(me), 15)}</span></button>
    </div>
  </header>`;
      /* Familie-oppsett (som familiekortet i ki-cards): «👋 Navn!» + serverpil til venstre, profilbildene med stedsmerke til høyre */
      const famHead = () => {
        const HUF = KD.ud(this, 'kd_hjem'), navn = (me.navn || '').split(' ')[0];
        const txt = String(HUF.hilsen || c.hilsen || '👋 {navn}!').replace(/\{navn\}/g, navn).replace(/\{server\}/g, CUR.navn || '');
        const alle = [me, ...PERS.filter(p => p.id !== me.id)];
        return `<header data-key="h-fam" style="display:flex;flex-direction:column;gap:6px">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0">
      <button data-on-click="toggleServer" data-no-haptic="1" style="display:flex;align-items:center;gap:6px;min-width:0;font-size:clamp(22px, 6.6vw, 34px);font-weight:600;letter-spacing:-0.03em;line-height:1.1;white-space:nowrap"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis">${e(txt)}</span><span class="ms" style="${S(serverChev)};flex:none">arrow_drop_down</span></button>
      <div style="display:flex;gap:8px;flex:none">
        ${alle.map(p => { const pl = this.placeOf(p); return `<button data-key="fam-${e(p.id)}" data-on-click="quickPerson" data-hold="openPerson" data-arg="${e(p.id)}" title="${e(p.navn)} · ${e(pl.navn)}" style="position:relative;width:50px;height:50px;border-radius:25px;flex:none;display:grid;place-items:center;font-size:18px;font-weight:600;background:${e(p.farge || '#2a2a2d')};opacity:${this.personState(p).home ? 1 : 0.75};${this.pic(p)}">${e((p.navn || '?')[0])}
          <span style="position:absolute;right:-4px;top:-4px;width:22px;height:22px;border-radius:11px;display:grid;place-items:center;background:${pl.col};box-shadow:0 0 4px rgba(0,0,0,0.3)">${pl.mdi ? `<ha-icon icon="${e(pl.mdi)}" style="--mdc-icon-size:13px;width:13px;height:13px;display:flex;color:#fff"></ha-icon>` : `<span class="ms" style="font-size:13px;color:#fff;font-variation-settings:'FILL' 1">${pl.ms}</span>`}</span>
        </button>`; }).join('')}
      </div>
    </div>
    <button data-on-click="openWeather" style="font-size:15px;color:#8e8d89;white-space:nowrap;text-align:left;padding-left:2px">${W.head != null ? Math.round(W.head) : '–'} °C · ${e(W.cond)}</button>
  </header>`;
      };
      return `<div style="position:relative;box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;--kd-dokk-h:${MB - 10}px;padding:20px var(--kd-kant,10px) calc(${MB + 24}px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:22px">

  ${FAM ? famHead() : stdHead()}

  ${SECS}

  ${s.menu ? `<div data-key="menu-bd" data-on-click="closeMenu" style="position:fixed;inset:0;z-index:25"></div>
    <div style="position:fixed;right:max(12px, calc(50% - 198px));bottom:${MB}px;z-index:26;min-width:180px;max-height:calc(100vh - 120px);overflow-y:auto;scrollbar-width:none;box-sizing:border-box;padding:6px;border-radius:22px;background:rgba(40,40,44,0.5);backdrop-filter:blur(22px) saturate(190%);-webkit-backdrop-filter:blur(22px) saturate(190%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.3),inset 0 0 0 0.5px rgba(255,255,255,0.18),0 18px 40px rgba(0,0,0,0.45);display:flex;flex-direction:column;gap:2px">
      ${menuItems.map(([icon, label, k, col, dot]) => `<button class="kd-hov" data-on-click="menuGo" data-arg="${k}" style="height:44px;padding:0 14px 0 10px;border-radius:16px;display:flex;align-items:center;gap:10px;font-size:14px;font-weight:500;white-space:nowrap"><span class="ms" style="font-size:20px;color:${e(col)}">${e(icon)}</span><span style="flex:1;text-align:left">${e(label)}</span>${dot ? `<span style="width:7px;height:7px;border-radius:4px;background:${C.red}"></span>` : ''}</button>`).join('')}
      ${menuItems.length ? '<div style="height:1px;margin:4px 10px;background:rgba(255,255,255,0.08)"></div>' : ''}
      <button class="kd-hov" data-on-click="dockEditOpen" style="height:44px;padding:0 14px 0 10px;border-radius:16px;display:flex;align-items:center;gap:10px;font-size:14px;font-weight:500;white-space:nowrap;color:#a9a7a2"><span class="ms" style="font-size:20px">edit</span>Tilpass dokken</button>
      <button class="kd-hov" data-on-click="hjemEditOpen" style="height:44px;padding:0 14px 0 10px;border-radius:16px;display:flex;align-items:center;gap:10px;font-size:14px;font-weight:500;white-space:nowrap;color:#a9a7a2"><span class="ms" style="font-size:20px">dashboard_customize</span>Tilpass Hjem</button>
    </div>` : ''}
  ${s.dockEdit ? dockEditHTML() : ''}
  ${s.hjemEdit ? hjemEditHTML() : ''}

  ${s.quickId ? quickHTML() : ''}
  ${lockHTML()}

  ${s.serverMenu ? `<div data-key="srv-bd" data-on-click="toggleServer" style="position:fixed;inset:0;z-index:8"></div>
    <div style="position:absolute;left:14px;top:70px;z-index:9;min-width:240px;padding:6px;border-radius:22px;background:rgba(40,40,44,0.55);backdrop-filter:blur(22px) saturate(190%);-webkit-backdrop-filter:blur(22px) saturate(190%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.3),inset 0 0 0 0.5px rgba(255,255,255,0.18),0 18px 40px rgba(0,0,0,0.45);display:flex;flex-direction:column;gap:2px">
      ${SERV.map((v, i) => { const act = i === curServer, online = true; return `<button class="kd-hov8" data-on-click="pickServer" data-arg="${i}" style="min-height:52px;padding:6px 12px 6px 10px;border-radius:16px;display:flex;align-items:center;gap:12px;text-align:left">
          <span style="${S({ width: 34, height: 34, borderRadius: 17, flex: 'none', display: 'grid', placeItems: 'center', background: act ? 'oklch(0.78 0.13 350 / 0.22)' : 'rgba(255,255,255,0.08)', color: act ? 'oklch(0.82 0.1 350)' : '#c9c7c2' })}"><span class="ms" style="font-size:19px;font-variation-settings:'FILL' 1">${e(srvIkon(v))}</span></span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
            <span style="font-size:15px;font-weight:500;white-space:nowrap">${e(v.navn)}</span>
            <span style="${S({ fontSize: 12, color: online ? '#8e8d89' : 'oklch(0.72 0.15 25)', whiteSpace: 'nowrap' })}">${e(v.sub || (act ? 'Du er her' : 'Bytt til ' + v.navn))}</span>
          </div>
          <span class="ms" style="${S({ fontSize: 20, color: '#f2f1ee', opacity: act ? 1 : 0 })}">check</span>
        </button>`; }).join('')}
    </div>` : ''}

  ${c.ark === 'bubble' ? '' : `<div data-key="sheet-bd" data-on-click="closeSheet" style="${S(sheetBackdrop)}"></div>
  <div data-key="sheet" style="${S(sheetPanel)}">
    <div style="position:absolute;top:0;left:0;right:0;z-index:3;padding:8px 12px 18px;display:flex;flex-direction:column;align-items:center;gap:8px;background:linear-gradient(180deg,#141416 0,#141416 72%,rgba(20,20,22,0) 100%);pointer-events:none">
      <span style="width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,0.22)"></span>
      <div data-bh="pill" data-keep style="position:relative;overflow:hidden;width:100%;box-sizing:border-box;height:60px;padding:0 8px;border-radius:30px;background:rgba(38,38,41,0.82);backdrop-filter:blur(18px) saturate(160%);-webkit-backdrop-filter:blur(18px) saturate(160%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.07),0 8px 24px rgba(0,0,0,0.35);display:flex;align-items:center;gap:12px;pointer-events:auto" data-head="${e(sh.icon + '|' + sh.title + '|' + sh.sub)}"></div>
    </div>
    <div data-snap="1" data-sheet-scroll="1" style="flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;touch-action:pan-y;overscroll-behavior:contain;scrollbar-width:none;padding-top:84px;padding-bottom:110px">
      <div data-sheet-host data-keep></div>
    </div>
  </div>`}

  <nav data-key="nav" data-on-pointermove="navMove" data-on-pointerleave="navLeave" style="${S(navStyle)}">
    <span style="position:absolute;inset:0;border-radius:inherit;background:linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.02) 45%,rgba(255,255,255,0.06));pointer-events:none"></span>
    <span data-sheen="1" style="${S(navSheen)}"></span>
    <span style="position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 1px 0 rgba(255,255,255,0.35),inset 0 -1px 0 rgba(255,255,255,0.08),inset 0 0 0 0.5px rgba(255,255,255,0.18);pointer-events:none"></span>
    <span data-ind="1" style="${S(indicator)}"></span>
    ${dock.map(d => `<button class="kd-press" title="${e(d.title)}" data-on-click="dockGo" data-arg="${d.i}" style="${S(d.style)}">
        <span class="ms" style="${S(d.iconStyle)}">${e(d.icon)}</span>${NAVN ? `<span style="${S(d.label)}">${e(d.title)}</span>` : ''}
        <span style="${S(d.dot)}"></span>
      </button>`).join('')}
  </nav>
</div>`;
    }

    /* Pillen i arket eies av oss (data-keep) så animasjonene ikke nullstilles – fyll den her */
    _render() {
      super._render();
      const pill = this.$('[data-bh="pill"]');
      if (pill) {
        const key = pill.getAttribute('data-head');
        if (pill._kdKey !== key) {
          const [icon, title, sub] = key.split('|');
          const fresh = !pill._kdKey || pill._kdIcon !== icon;
          pill._kdKey = key; pill._kdIcon = icon;
          const tmp = document.createElement('div');
          tmp.innerHTML = KD.sheetTopHTML(icon, title, sub);
          const src = tmp.querySelector('[data-bh="pill"]');
          if (fresh) pill.innerHTML = src.innerHTML;
          else { pill.querySelector('[data-bh="title"]').textContent = title; pill.querySelector('[data-bh="sub"]').textContent = sub; }
        }
        const sc = this.$('[data-sheet-scroll]'); // morph nullstiller pillens stil – legg scroll-krympingen på igjen
        if (sc && sc.scrollTop) KD.scrollSheetTop(this.shadowRoot, sc.scrollTop);
      }
    }
    openMeSheet() { this.openSheet('person', { personId: this.meId }); }
    addServer() { this.nav('/config/dashboard'); }
  }
  KDHjem.css = `
.kd-hov:hover{background:rgba(255,255,255,0.1)}
.kd-hov8:hover{background:rgba(255,255,255,0.08)}
.kd-press:active{transform:scale(0.84)}
[data-bh="close"]:active{transform:scale(0.92)}
`;
  KD.define('kd-hjem-card', KDHjem, 'KD Hjem', 'Hjem mobil – pikselkopi av Claude Design');
})();
