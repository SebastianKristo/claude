/*
 * GUI-editor for alle kd-kortene (Home Assistants egen ha-form).
 *
 * Skjemaet bygges automatisk av kortets `static defaults`:
 *   entitet → entitetsvelger (med domene), liste av entiteter → flervalg, tall → tallfelt, av/på → bryter,
 *   tekst → tekstfelt, lister/objekter (soner, rom, kameraer …) → YAML-felt under «Avansert».
 * Standardverdien vises som hjelpetekst; tomme felt betyr «bruk standard», så konfigen holdes kort.
 * kd-hjem-card får i tillegg en «Popups»-seksjon med et eget skjema per ark (lagres i `ark_config`).
 */
(() => {
  const KD = window.KD;
  if (!KD || !KD.KDCard) return;

  /* ---------- tekster ---------- */
  const WORD = { las: 'lås', laas: 'lås', sovn: 'søvn', vaer: 'vær', strom: 'strøm', maane: 'måne', naa: 'nå', paa: 'på', gjoremal: 'gjøremål',
    soppel: 'søppel', hoyttalere: 'høyttalere', hoyre: 'høyre', maned: 'måned', ute: 'ute', tom: 'tøm', stovsuger: 'støvsuger', kjoring: 'kjøring',
    antall: 'antall', ki: 'KI', pve: 'Proxmox', ip: 'IP', isp: 'ISP', cpu: 'CPU', tv: 'TV', poe: 'PoE', vvb: 'VVB', qbit: 'qBittorrent', cfs: 'CFS', kw: 'kW', min: 'min', w: 'W', aqi: 'AQI' };
  const LABEL = {
    ark: 'Popup-modus', meg: 'Meg (person)', vaer: 'Vær-entitet', ute_temp: 'Utetemperatur', pris_total: 'Totalpris (graf)',
    pris_spot: 'Spotpris (graf)', pris_norges: 'Norgespris (graf)', lys_totalt: 'Lys på (teller)', kalender_sensor: 'Kalendersensor',
    kalendere: 'Kalendere', las: 'Dørlås', las_batteri: 'Dørlås batteri', las_sist: 'Sist låst av', autolas: 'Autolås-bryter', alarm: 'Alarm',
    alarm_gammel: 'Alarm (gammel select)', bevegelse: 'Bevegelsessensorer (kamera-flis)', gjoremal: 'Gjøremålsliste', soppel: 'Avfallssensorer',
    stovsuger_varsel: 'Støvsuger-varsler (rød prikk)', stovsuger_vannboks: 'Støvsuger vanntank', sover_nar: 'Søvnbryter betyr «sover» når',
    header: 'Vis topp-pille (frittstående)', tittel: 'Tittel i topp-pillen', undertittel: 'Undertekst i topp-pillen', entity: 'Hovedentitet', navn: 'Navn',
    ikon: 'Ikon (Material Symbols-navn)', farge: 'Farge (CSS)', temp: 'Temperatur', fukt: 'Fuktighet', sett: 'Settpunkt (± knapper)', lys: 'Lys',
    skjul: 'Skjul entiteter', rom: 'Rom', auto: 'Finn resten automatisk', fane: 'Startfane', person: 'Person', prefiks: 'Prefiks',
  };
  const LABEL_TAG = { 'kd-hjem-card': { pris: 'Strømpris (setningen)', effekt: 'Effekt nå' } };
  const human = (k, tag) => (LABEL_TAG[tag] || {})[k] || LABEL[k] || k.split('_').map(w => WORD[w] || w).join(' ').replace(/^./, c => c.toUpperCase());
  const show = v => v == null || v === '' ? '(automatisk)' : Array.isArray(v) ? (v.length && typeof v[0] !== 'object' ? v.join(', ') : `${v.length} oppføringer`) : typeof v === 'object' ? `${Object.keys(v).length} oppføringer` : String(v);

  const ENT = /^[a-z_]+\.[a-z0-9_]+$/;
  const isEnt = v => typeof v === 'string' && ENT.test(v) && !v.endsWith('_');
  const dom = v => v.split('.')[0];

  /** Selector fra én standardverdi */
  const selectorFor = (key, v) => {
    if (typeof v === 'boolean') return { boolean: {} };
    if (typeof v === 'number') return { number: { mode: 'box', step: 'any' } };
    if (isEnt(v)) return { entity: { domain: dom(v) } };
    if (Array.isArray(v)) {
      if (v.length && v.every(isEnt)) { const d = [...new Set(v.map(dom))]; return { entity: { multiple: true, ...(d.length === 1 ? { domain: d[0] } : { domain: d }) } }; }
      if (v.every(x => typeof x === 'string')) return { text: { multiple: true } };
      return { object: {} };
    }
    if (v && typeof v === 'object') return { object: {} };
    return { text: {} };
  };

  /* Ekstra felter / bedre velgere per kort */
  const ROOM_OPTS = () => Object.entries(KD.ROOMS || {}).map(([k, r]) => ({ value: k, label: r.navn || k }));
  const PERSON_OPTS = [{ value: 'sebastian', label: 'Sebastian' }, { value: 'cybele', label: 'Cybele' }, { value: 'rune', label: 'Rune' }];
  const sel = (opts, custom = false) => ({ select: { options: opts, mode: 'dropdown', custom_value: custom } });
  const EXTRA = {
    'kd-hjem-card': {
      ark: sel([{ value: 'intern', label: 'Intern – kortets eget bunnark' }, { value: 'bubble', label: 'Bubble-card – bare #hash' }]),
      meg: sel(PERSON_OPTS, true), sover_nar: sel([{ value: 'on', label: 'på (on)' }, { value: 'off', label: 'av (off)' }]),
      autolas: { entity: { domain: ['switch', 'select'] } },
    },
    'kd-rom-card': {
      rom: sel(ROOM_OPTS(), true), navn: { text: {} }, ikon: { text: {} }, farge: { text: {} },
      temp: { entity: { domain: 'sensor' } }, fukt: { entity: { domain: 'sensor' } }, sett: { entity: { domain: ['input_number', 'number', 'climate'] } },
      lys: { entity: { domain: 'light' } }, skjul: { entity: { multiple: true } }, effekt_par: { object: {} },
    },
    'kd-person-card': { person: sel(PERSON_OPTS, true) },
    'kd-lys-card': { skjul: { entity: { multiple: true } }, fane: sel([{ value: 'out', label: 'Utelys' }, { value: 'f1', label: '1. etg' }, { value: 'f2', label: '2. etg' }, { value: 'on', label: 'Lys på' }]) },
  };
  const SHEET_KEYS = ['header', 'tittel', 'undertittel'];

  /** Skjema for et kort-tag. withHeader: vis topp-pille-feltene (frittstående kort) */
  KD.editorSchema = (tag, withHeader = true) => {
    const cls = customElements.get(tag); if (!cls) return [];
    const extra = EXTRA[tag] || {};
    const defs = {}; // ekstra-feltene først (f.eks. «Rom» øverst), så resten i kortets rekkefølge
    for (const k of Object.keys(extra)) defs[k] = (cls.defaults || {})[k];
    Object.assign(defs, cls.defaults || {});
    const simple = [], adv = [];
    for (const [k, v] of Object.entries(defs)) {
      const selector = extra[k] || selectorFor(k, v);
      const item = { name: k, selector, _def: v, _label: human(k, tag) };
      (selector.object ? adv : simple).push(item);
    }
    const out = [...simple];
    if (withHeader && cls.prototype instanceof KD.KDSheet) out.push({ type: 'expandable', name: '_pille', flatten: true, title: 'Topp-pille', icon: 'mdi:page-layout-header', schema: [
      { name: 'header', selector: { boolean: {} }, _def: true }, { name: 'tittel', selector: { text: {} } }, { name: 'undertittel', selector: { text: {} } }] });
    if (adv.length) out.push({ type: 'expandable', name: '_avansert', flatten: true, title: 'Avansert (YAML)', icon: 'mdi:code-braces', schema: adv });
    return out;
  };

  const SHEET_TITLES = { strom: 'Strøm', klima: 'Klima', sik: 'Sikkerhet', cam: 'Kamera', person: 'Person', vann: 'Vanning', plants: 'Planter', sleep: 'Søvn',
    vaer: 'Vær', vac: 'Støvsuger', media: 'Media', car: 'Bil', printer: '3D-printer', server: 'Server', settings: 'Innstillinger', cal: 'Kalender',
    todo: 'Gjøremål', trash: 'Søppel', lys: 'Lys', rom: 'Rom (alle)' };
  const SHEET_ICON = { strom: 'mdi:flash', klima: 'mdi:thermostat', sik: 'mdi:shield-home', cam: 'mdi:cctv', person: 'mdi:account', vann: 'mdi:sprinkler',
    plants: 'mdi:sprout', sleep: 'mdi:sleep', vaer: 'mdi:weather-partly-cloudy', vac: 'mdi:robot-vacuum', media: 'mdi:music', car: 'mdi:car-electric',
    printer: 'mdi:printer-3d', server: 'mdi:server', settings: 'mdi:tune', cal: 'mdi:calendar', todo: 'mdi:checkbox-marked-outline', trash: 'mdi:delete',
    lys: 'mdi:lightbulb-group', rom: 'mdi:sofa' };
  const SHEET_TAG = { strom: 'kd-strom-card', klima: 'kd-klima-card', sik: 'kd-sikkerhet-card', cam: 'kd-kamera-card', person: 'kd-person-card', vann: 'kd-vanning-card',
    plants: 'kd-planter-card', sleep: 'kd-sovn-card', vaer: 'kd-vaer-card', vac: 'kd-stovsuger-card', media: 'kd-media-card', car: 'kd-bil-card',
    printer: 'kd-printer-card', server: 'kd-server-card', settings: 'kd-innstillinger-card', cal: 'kd-kalender-card', todo: 'kd-gjoremal-card',
    trash: 'kd-soppel-card', lys: 'kd-lys-card', rom: 'kd-rom-card' };

  const hjemSchema = () => {
    const base = KD.editorSchema('kd-hjem-card', false);
    const popups = Object.keys(SHEET_TAG).map(k => ({
      type: 'expandable', name: k, title: SHEET_TITLES[k], icon: SHEET_ICON[k],
      schema: KD.editorSchema(SHEET_TAG[k], false).filter(s => !(k === 'rom' && ['rom', 'navn', 'ikon', 'farge', 'temp', 'fukt', 'sett', 'lys'].includes(s.name))),
    }));
    const perRom = Object.entries(KD.ROOMS || {}).map(([id, r]) => ({ type: 'expandable', name: id, title: r.navn || id, icon: 'mdi:door',
      schema: KD.editorSchema('kd-rom-card', false).filter(s => s.name !== 'rom') }));
    popups.push({ type: 'expandable', name: 'rom_per', title: 'Rom – per rom', icon: 'mdi:floor-plan', schema: perRom });
    return [...base, { type: 'expandable', name: 'ark_config', title: 'Popups', icon: 'mdi:dock-bottom', schema: popups }];
  };

  /** Fjern tomme verdier (tomt felt = bruk standard) */
  const clean = (v) => {
    if (Array.isArray(v)) return v.length ? v : undefined;
    if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) { const c = clean(x); if (c !== undefined) o[k] = c; } return Object.keys(o).length ? o : undefined; }
    return v === '' || v === null ? undefined : v;
  };

  /* Sørg for at HAs skjemaelementer (ha-form, velgere) er lastet */
  let loading;
  const ensureForm = () => loading || (loading = (async () => {
    if (customElements.get('ha-form') && customElements.get('ha-entity-picker')) return;
    try {
      const h = await (window.loadCardHelpers ? window.loadCardHelpers() : null);
      if (h) { const c = await h.createCardElement({ type: 'entities', entities: [] }); if (c && c.constructor.getConfigElement) await c.constructor.getConfigElement(); }
    } catch (e) { /* ignorer – ha-form finnes som regel allerede i editoren */ }
    await Promise.race([customElements.whenDefined('ha-form'), new Promise(r => setTimeout(r, 4000))]);
  })());

  class KDEditor extends HTMLElement {
    setConfig(config) { this._config = { ...config }; this._render(); }
    set hass(h) { this._hass = h; if (this._form) this._form.hass = h; }
    connectedCallback() { this._render(); }
    _schema() {
      if (!this._schemaCache) this._schemaCache = this._tag === 'kd-hjem-card' ? hjemSchema() : KD.editorSchema(this._tag, true);
      return this._schemaCache;
    }
    _defFor(name) {
      const find = (list) => { for (const s of list) { if (s.name === name && '_def' in s) return s; if (s.schema) { const r = find(s.schema); if (r) return r; } } return null; };
      return find(this._schema());
    }
    async _render() {
      if (!this._config || !this.isConnected) return;
      if (!this._built) {
        this._built = true;
        this.innerHTML = `<style>.kd-ed-intro{font-size:13px;color:var(--secondary-text-color);margin:0 0 12px;line-height:1.45}</style>
          <p class="kd-ed-intro">Alle felt er valgfrie. Tomt felt = standardverdien (vist under feltet) eller automatisk oppdagelse.</p><div class="kd-ed-form"></div>`;
        await ensureForm();
        const f = document.createElement('ha-form');
        f.computeLabel = s => s.title || s._label || human(s.name);
        f.computeHelper = s => ('_def' in s) ? `Standard: ${show(s._def)}` : '';
        f.addEventListener('value-changed', ev => {
          ev.stopPropagation();
          const v = clean(ev.detail.value) || {};
          this._config = { type: this._config.type, ...v };
          this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
        });
        this.querySelector('.kd-ed-form').appendChild(f);
        this._form = f;
      }
      const { type, ...data } = this._config;
      this._form.hass = this._hass;
      this._form.schema = this._schema();
      this._form.data = data;
    }
  }
  if (!customElements.get('kd-card-editor')) customElements.define('kd-card-editor', KDEditor);

  /* Koble editoren til alle kd-kort */
  for (const c of (window.customCards || [])) {
    if (!/^kd-/.test(c.type)) continue;
    const cls = customElements.get(c.type); if (!cls) continue;
    const tag = c.type;
    cls.getConfigElement = () => { const el = document.createElement('kd-card-editor'); el._tag = tag; return el; };
    if (!Object.prototype.hasOwnProperty.call(cls, 'getStubConfig')) cls.getStubConfig = () => (tag === 'kd-rom-card' ? { rom: 'stue' } : {});
    c.preview = true;
  }
})();
