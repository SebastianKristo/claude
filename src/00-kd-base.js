/*
 * KD (KI Hjem Design) – felles grunnmur for alle kd-*-kortene.
 * Pikselkopi av Claude Design-prosjektet «Home Assistant sikkerhetspanel».
 *
 * Et kort arver KDCard og implementerer render() som returnerer en HTML-streng.
 * Grunnmuren morpher DOM-en (beholder elementer, scroll og CSS-overganger),
 * sporer hvilke entiteter som ble lest, og rendrer bare på nytt når de endrer seg.
 *
 * Hendelser:  <button data-on-click="metode" data-arg="x">  → this.metode(e, "x", el)
 *   Støttet: click, dblclick, scroll, pointermove, pointerdown, pointerup, pointerleave,
 *   pointercancel, input, change, keydown, contextmenu, wheel. Innerste element med attributtet vinner
 *   (tilsvarer stopPropagation i designet). scroll/pointerleave må stå på selve elementet.
 *   Langt trykk: data-hold="metode" (500 ms) – kalles i stedet for click.
 */
(() => {
  if (window.KD && window.KD.__v) return;
  const KD = (window.KD = window.KD || {});
  KD.__v = '1.0.0';

  /* ---------- Farger og konstanter fra designet ---------- */
  KD.C = {
    amber: 'oklch(0.82 0.12 75)', green: 'oklch(0.8 0.12 150)', yellow: 'oklch(0.86 0.12 95)',
    red: 'oklch(0.72 0.15 25)', blue: 'oklch(0.8 0.12 250)', pink: 'oklch(0.78 0.13 350)',
    purple: 'oklch(0.72 0.12 295)',
  };
  KD.PINK = 'linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20))';
  /** a('oklch(0.8 0.12 150)', 0.2) → 'oklch(0.8 0.12 150 / 0.2)' (samme som designets a()) */
  KD.a = (c, o) => String(c).replace(')', ` / ${o})`);

  /* ---------- Fonter (Space Grotesk + Material Symbols Rounded) ---------- */
  KD.loadFonts = () => {
    if (document.getElementById('kd-fonts-sg')) return;
    const add = (id, href) => { const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); };
    add('kd-fonts-sg', 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&display=swap');
    add('kd-fonts-ms', 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..500,0..1,0&display=block');
  };

  /* ---------- Hjelpere ---------- */
  const UNITLESS = new Set(['animationIterationCount', 'aspectRatio', 'columnCount', 'columns', 'flex', 'flexGrow', 'flexShrink', 'flexPositive', 'flexNegative', 'flexOrder', 'fontWeight', 'gridArea', 'gridRow', 'gridRowEnd', 'gridRowSpan', 'gridRowStart', 'gridColumn', 'gridColumnEnd', 'gridColumnSpan', 'gridColumnStart', 'lineClamp', 'lineHeight', 'opacity', 'order', 'orphans', 'scale', 'tabSize', 'widows', 'zIndex', 'zoom', 'fillOpacity', 'floodOpacity', 'stopOpacity', 'strokeDasharray', 'strokeDashoffset', 'strokeMiterlimit', 'strokeOpacity', 'strokeWidth']);
  const kebab = k => k.startsWith('--') ? k : k.replace(/^(Webkit|Moz|ms)/, m => '-' + m.toLowerCase()).replace(/[A-Z]/g, m => '-' + m.toLowerCase());
  /** Stilobjekt (React-form) → CSS-streng. Tall får px, som i React. Strenger sendes rett gjennom. */
  KD.S = (o) => {
    if (o == null || o === false) return '';
    if (typeof o === 'string') return o;
    let s = '';
    for (const k in o) {
      const v = o[k];
      if (v == null || v === false || v === '') continue;
      s += kebab(k) + ':' + (typeof v === 'number' && v !== 0 && !UNITLESS.has(k) ? v + 'px' : v) + ';';
    }
    return s;
  };
  /** HTML-escape */
  KD.e = (v) => v == null ? '' : String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /** Tallformat nb-NO (samme som designets nf) */
  KD.nf = (n, d = 2) => (n == null || isNaN(n)) ? '–' : Number(n).toLocaleString('nb-NO', { minimumFractionDigits: d, maximumFractionDigits: d });
  KD.hh = h => String(h).padStart(2, '0');
  KD.hm = (d) => { d = d instanceof Date ? d : new Date(d); return isNaN(d) ? '–' : d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }); };
  KD.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  KD.BAD = new Set(['unknown', 'unavailable', 'none', '', undefined, null]);
  /** "for 5 min siden" o.l. */
  KD.ago = (d) => {
    d = d instanceof Date ? d : new Date(d); const s = (Date.now() - d) / 1000;
    if (isNaN(s)) return '–';
    if (s < 60) return 'nå';
    if (s < 3600) return `${Math.round(s / 60)} min siden`;
    if (s < 86400) return `${Math.round(s / 3600)} t siden`;
    return `${Math.round(s / 86400)} d siden`;
  };

  /* ---------- Felles CSS i hver shadow root ---------- */
  KD.BASE_CSS = `
:host{display:block;color:#f2f1ee;font-family:'Space Grotesk',system-ui,sans-serif;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent}
a{color:#f2f1ee}a:hover{color:oklch(0.82 0.12 75)}
button{font:inherit;color:inherit;border:0;background:none;padding:0;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent;text-align:center}
input,select,textarea{font:inherit;color:inherit}
.ms{font-family:'Material Symbols Rounded';font-weight:400;font-style:normal;line-height:1;white-space:nowrap;-webkit-font-feature-settings:'liga';font-feature-settings:'liga';font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;user-select:none;display:inline-block;letter-spacing:normal;text-transform:none;direction:ltr}
[data-snap]::-webkit-scrollbar,[data-hscroll]::-webkit-scrollbar,[data-sheet-scroll]::-webkit-scrollbar{display:none}
.kd-embedded header{display:none!important}
@keyframes pop{from{transform:translate(-50%,-46%) scale(.9);opacity:0}}
@keyframes fadein{from{opacity:0}}
`;

  /* ---------- DOM-morph ---------- */
  const tplCache = document.createElement('template');
  function syncAttrs(f, t) {
    const fa = f.attributes, ta = t.attributes;
    for (let i = fa.length - 1; i >= 0; i--) { const n = fa[i].name; if (!t.hasAttribute(n)) f.removeAttribute(n); }
    for (let i = 0; i < ta.length; i++) { const { name, value } = ta[i]; if (f.getAttribute(name) !== value) f.setAttribute(name, value); }
  }
  const keyOf = n => n.nodeType === 1 ? n.getAttribute('data-key') : null;
  const keepOf = n => n.nodeType === 1 && n.hasAttribute('data-keep');
  function morphChildren(from, to) {
    const tc = Array.from(to.childNodes);
    let keyed = null;
    for (let i = 0; i < tc.length; i++) {
      const t = tc[i], tk = keyOf(t);
      let f = from.childNodes[i];
      // nøkkel (data-key): flytt et eksisterende element med samme nøkkel hit i stedet for å matche på indeks
      if (tk != null && (!f || keyOf(f) !== tk)) {
        if (!keyed) { keyed = new Map(); for (const c of from.childNodes) { const k = keyOf(c); if (k != null) keyed.set(k, c); } }
        const m = keyed.get(tk);
        if (m && m.parentNode === from && m !== f) { from.insertBefore(m, f || null); f = m; }
      }
      if (!f) { from.appendChild(t); continue; }
      if (f.nodeType !== t.nodeType || f.nodeName !== t.nodeName || keyOf(f) !== tk || keepOf(f) !== keepOf(t)) { from.replaceChild(t, f); continue; }
      if (f.nodeType !== 1) { if (f.nodeValue !== t.nodeValue) f.nodeValue = t.nodeValue; continue; }
      const keep = f.hasAttribute('data-keep');
      syncAttrs(f, t);
      if (keep) continue; // barnet eies av noen andre (f.eks. innebygd kort)
      if ((f.tagName === 'INPUT' || f.tagName === 'TEXTAREA' || f.tagName === 'SELECT')) {
        if (f.getRootNode().activeElement !== f && f.value !== (t.value ?? t.getAttribute('value') ?? '')) f.value = t.getAttribute('value') ?? '';
        if (f.tagName !== 'SELECT') continue;
      }
      morphChildren(f, t);
    }
    while (from.childNodes.length > tc.length) from.removeChild(from.lastChild);
  }
  KD.morph = (el, html) => {
    const tpl = tplCache.cloneNode(false);
    tpl.innerHTML = html;
    morphChildren(el, tpl.content);
  };

  /* ---------- Asynkron hurtigbuffer (historikk, kalendere, gjøremål …) ---------- */
  const CACHE = new Map();

  /* ---------- Grunnklassen ---------- */
  const EVENTS = ['click', 'dblclick', 'scroll', 'pointermove', 'pointerdown', 'pointerup', 'pointerleave', 'pointercancel', 'input', 'change', 'keydown', 'contextmenu', 'wheel'];
  const DIRECT = new Set(['scroll', 'pointerleave']);

  class KDCard extends HTMLElement {
    constructor() {
      super();
      this.state = {};
      this.config = {};
      this._used = null; this._usedAll = false;
      this.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = KD.BASE_CSS + (this.constructor.css || '');
      this.shadowRoot.appendChild(style);
      this._root = document.createElement('div');
      this._root.className = 'kd-root';
      this.shadowRoot.appendChild(this._root);
      for (const type of EVENTS) this.shadowRoot.addEventListener(type, ev => this._dispatch(type, ev), { capture: true, passive: type !== 'click' && type !== 'contextmenu' && type !== 'keydown' && type !== 'wheel' ? true : false });
      this.shadowRoot.addEventListener('pointerdown', ev => this._holdStart(ev), { capture: true, passive: true });
      for (const t of ['pointerup', 'pointercancel', 'pointerleave']) this.shadowRoot.addEventListener(t, () => clearTimeout(this._holdT), { capture: true, passive: true });
      KD.loadFonts();
    }

    /* ----- livssyklus ----- */
    setConfig(config) {
      this.config = Object.assign({}, this.constructor.defaults || {}, config || {});
      // kant: sidemarg (px) – arves av innebygde ark via CSS-variabelen
      if (config && config.kant != null || this.constructor.defaults && this.constructor.defaults.kant != null) this.style.setProperty('--kd-kant', parseFloat(this.config.kant) + 'px');
      this._force = true; this._queue();
    }
    set hass(h) {
      const old = this._hass; this._hass = h;
      if (!old || this._force || this._usedAll || !this._used) return this._queue();
      for (const id of this._used) if (old.states[id] !== h.states[id]) return this._queue();
    }
    get hass() { return this._hass; }
    connectedCallback() { this._connected = true; this._force = true; this._queue(); if (this.onConnect) this.onConnect(); }
    disconnectedCallback() { this._connected = false; if (this.onDisconnect) this.onDisconnect(); }
    getCardSize() { return 12; }
    getGridOptions() { return { columns: 'full', rows: 'auto' }; }

    setState(patch) {
      const p = typeof patch === 'function' ? patch(this.state) : patch;
      if (!p) return;
      this.state = Object.assign({}, this.state, p);
      this._queue();
    }
    _queue() { if (this._raf) return; this._raf = requestAnimationFrame(() => { this._raf = null; this._render(); }); }
    /** Rendre synkront nå (f.eks. før en animasjon) */
    flush() { if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; } this._render(); }
    _render() {
      if (!this._hass && !this.constructor.noHass) return;
      this._force = false;
      this._used = new Set(); this._usedAll = false;
      let html;
      try { html = this.render(); } catch (err) { console.error(this.localName, err); html = `<div style="padding:16px;color:#f2f1ee;background:#3a1c1c;border-radius:16px;font:13px system-ui">${KD.e(this.localName)}: ${KD.e(err && err.message)}</div>`; }
      this._root.className = 'kd-root' + (this.config.header === false || this.config.embedded ? ' kd-embedded' : '');
      KD.morph(this._root, html);
      if (this.afterRender) this.afterRender();
    }
    /** Finn element i kortet */
    $(sel) { return this.shadowRoot.querySelector(sel); }
    $$(sel) { return Array.from(this.shadowRoot.querySelectorAll(sel)); }

    /* ----- hendelser ----- */
    _dispatch(type, ev) {
      if (type === 'click' && this._holdFired) { this._holdFired = false; ev.stopPropagation(); ev.preventDefault(); return; }
      const attr = 'data-on-' + type;
      let el = ev.composedPath ? ev.composedPath()[0] : ev.target;
      if (DIRECT.has(type)) { if (!(el && el.getAttribute && el.hasAttribute(attr))) return; }
      else { el = el && el.closest ? el.closest('[' + attr + ']') : null; if (!el || !this.shadowRoot.contains(el)) return; }
      const name = el.getAttribute(attr), fn = this[name];
      if (typeof fn !== 'function') { console.warn(this.localName, 'mangler handler', name); return; }
      if (type === 'click' && !el.hasAttribute('data-no-haptic')) this.haptic(el.getAttribute('data-haptic') || 'light');
      fn.call(this, ev, el.getAttribute('data-arg'), el);
    }
    _holdStart(ev) {
      const el = ev.target && ev.target.closest ? ev.target.closest('[data-hold]') : null;
      clearTimeout(this._holdT); this._holdFired = false;
      if (!el) return;
      const x = ev.clientX, y = ev.clientY;
      const move = e => { if (Math.abs(e.clientX - x) > 10 || Math.abs(e.clientY - y) > 10) { clearTimeout(this._holdT); this.shadowRoot.removeEventListener('pointermove', move, true); } };
      this.shadowRoot.addEventListener('pointermove', move, true);
      this._holdT = setTimeout(() => {
        this.shadowRoot.removeEventListener('pointermove', move, true);
        const fn = this[el.getAttribute('data-hold')];
        if (typeof fn === 'function') { this._holdFired = true; this.haptic('heavy'); fn.call(this, ev, el.getAttribute('data-arg'), el); }
      }, 500);
    }

    /* ----- Home Assistant-hjelpere (sporer lesing) ----- */
    /** state-objekt eller undefined */
    st(id) { if (!id) return undefined; if (this._used) this._used.add(id); return this._hass && this._hass.states[id]; }
    /** state-streng ('' hvis mangler) */
    v(id) { const s = this.st(id); return s ? s.state : ''; }
    /** tall eller def */
    n(id, def = null) { const s = this.st(id); const x = s ? parseFloat(s.state) : NaN; return isNaN(x) ? def : x; }
    /** attributt */
    at(id, attr, def = undefined) { const s = this.st(id); return s && s.attributes[attr] !== undefined ? s.attributes[attr] : def; }
    /** er entiteten «på» (on/open/unlocked/playing/home/cleaning …) */
    isOn(id) { const v = this.v(id); return ['on', 'open', 'opening', 'unlocked', 'playing', 'home', 'cleaning', 'heat', 'active', 'true'].includes(v); }
    ok(id) { const s = this.st(id); return !!s && !KD.BAD.has(s.state); }
    /** navn (friendly_name) */
    fname(id, def = '') { return this.at(id, 'friendly_name', def || id); }
    /** unit */
    unit(id) { return this.at(id, 'unit_of_measurement', ''); }
    /** Alle states (markerer kortet som «leser alt» – rendres ved hver endring, men maks hvert sekund) */
    all() { this._usedAll = true; return this._hass ? this._hass.states : {}; }
    /** Entiteter som matcher prefiks/regex */
    find(pattern) { const re = pattern instanceof RegExp ? pattern : new RegExp('^' + String(pattern).replace(/[.]/g, '\\.').replace(/\*/g, '.*') + '$'); return Object.keys(this.all()).filter(id => re.test(id)); }

    call(domain, service, data = {}, target) {
      this.haptic('light');
      if (!this._hass) return Promise.resolve();
      return this._hass.callService(domain, service, data, target).catch(e => { console.warn('kd call', domain, service, e); this.toast(e.message || String(e)); });
    }
    toggle(id) {
      const d = id.split('.')[0];
      if (d === 'lock') return this.call('lock', this.v(id) === 'locked' ? 'unlock' : 'lock', { entity_id: id });
      if (d === 'cover') return this.call('cover', 'toggle', { entity_id: id });
      if (d === 'script' || d === 'scene') return this.call(d, 'turn_on', { entity_id: id });
      if (d === 'button' || d === 'input_button') return this.call(d, 'press', { entity_id: id });
      if (d === 'automation') return this.call('automation', 'trigger', { entity_id: id });
      return this.call('homeassistant', 'toggle', { entity_id: id });
    }
    press(id) { const d = id.split('.')[0]; return this.call(d === 'input_button' ? 'input_button' : d === 'script' ? 'script' : d === 'scene' ? 'scene' : 'button', d === 'script' || d === 'scene' ? 'turn_on' : 'press', { entity_id: id }); }
    setNum(id, value) { const d = id.split('.')[0]; return this.call(d === 'number' ? 'number' : 'input_number', 'set_value', { entity_id: id, value }); }
    more(id) { if (!id) return; this.fire('hass-more-info', { entityId: id }); }
    nav(path) {
      if (!path) return;
      if (/^https?:/.test(path)) { window.open(path, '_blank'); return; }
      const url = path.startsWith('#') ? location.pathname + location.search + path : path;
      history.pushState(null, '', url);
      window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } }));
    }
    fire(type, detail, opts = {}) { const ev = new Event(type, { bubbles: true, composed: true, cancelable: false, ...opts }); ev.detail = detail; this.dispatchEvent(ev); return ev; }
    /** Haptikk: HA-appen fanger «haptic»-hendelsen (iOS/Android). Maks én vibrasjon per trykk. */
    haptic(kind = 'light') {
      if (this.config && this.config.haptikk === false) return;
      const t = performance.now();
      if (t - (this._lastHaptic || 0) < 120 && kind === 'light') return;
      this._lastHaptic = t;
      this.fire('haptic', kind);
      try { if (navigator.vibrate) navigator.vibrate(kind === 'heavy' ? 20 : kind === 'selection' ? 4 : 8); } catch (e) { }
    }
    toast(message) { this.fire('hass-notification', { message }); }
    /** websocket-kall */
    ws(msg) { return this._hass ? this._hass.callWS(msg) : Promise.reject(new Error('no hass')); }
    api(method, path, data) { return this._hass ? this._hass.callApi(method, path, data) : Promise.reject(new Error('no hass')); }

    /**
     * Hent asynkrone data med hurtigbuffer. Returnerer siste kjente verdi (eller def) med en gang,
     * starter henting i bakgrunnen og rendrer kortet når svaret kommer.
     *   const hist = this.cached('temp-'+id, 5*60e3, () => this.history([id], 24), []);
     */
    cached(key, ttl, loader, def = undefined) {
      const now = Date.now(), c = CACHE.get(key);
      if (c && (c.pending || now - c.t < ttl)) { if (c.pending) (c.waiters = c.waiters || new Set()).add(this); return c.val !== undefined ? c.val : def; }
      const entry = { t: now, pending: true, val: c ? c.val : undefined, waiters: new Set([this]) };
      CACHE.set(key, entry);
      Promise.resolve().then(loader).then(val => { entry.val = val; }).catch(e => { console.warn('kd cached', key, e); })
        .finally(() => { entry.pending = false; entry.t = Date.now(); for (const w of entry.waiters) w._queue(); entry.waiters.clear(); });
      return entry.val !== undefined ? entry.val : def;
    }
    /** Glem hurtigbuffer (prefiks) */
    invalidate(prefix) { for (const k of CACHE.keys()) if (k.startsWith(prefix)) CACHE.delete(k); }
    /** Historikk: { id: [{t: Date, v: number|string}] } siste `hours` timer */
    history(ids, hours = 24) {
      const end = new Date(), start = new Date(end - hours * 3600e3);
      return this.ws({ type: 'history/history_during_period', start_time: start.toISOString(), end_time: end.toISOString(), entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false })
        .then(r => { const out = {}; for (const id of ids) out[id] = (r[id] || []).map(p => ({ t: new Date((p.lu || p.lc || 0) * 1000), v: isNaN(parseFloat(p.s)) ? p.s : parseFloat(p.s) })); return out; });
    }
    /** Langtidsstatistikk: period 'hour'|'day'|'month', types ['mean','max','min','sum','change','state'] */
    stats(ids, hours = 24 * 7, period = 'hour', types = ['mean', 'min', 'max', 'change', 'sum', 'state']) {
      const end = new Date(), start = new Date(end - hours * 3600e3);
      return this.ws({ type: 'recorder/statistics_during_period', start_time: start.toISOString(), end_time: end.toISOString(), statistic_ids: ids, period, types });
    }
    /** Kalenderhendelser fra flere kalendere: [{cal, summary, start: Date, end: Date, allDay, location, description}] */
    calendar(ids, days = 14, fromDate) {
      const s = fromDate ? new Date(fromDate) : new Date(); s.setHours(0, 0, 0, 0);
      const e = new Date(s.getTime() + days * 86400e3);
      return Promise.all(ids.map(id => this.api('GET', `calendars/${id}?start=${encodeURIComponent(s.toISOString())}&end=${encodeURIComponent(e.toISOString())}`)
        .then(list => list.map(ev => { const allDay = !!ev.start.date; return { cal: id, summary: ev.summary, start: new Date(ev.start.dateTime || ev.start.date + 'T00:00'), end: new Date(ev.end.dateTime || ev.end.date + 'T00:00'), allDay, location: ev.location, description: ev.description }; }))
        .catch(() => [])))
        .then(r => r.flat().sort((a, b) => a.start - b.start));
    }
    /** Gjøremål: [{uid, summary, status:'needs_action'|'completed', due, description}] */
    todos(id) { return this.ws({ type: 'todo/item/list', entity_id: id }).then(r => r.items || []); }

    /* ----- ark-integrasjon ----- */
    /** Lukk arket/popupen dette kortet står i (fjerner hash og sender kd-close) */
    closeSheet() {
      const ev = this.fire('kd-close', {});
      if (location.hash) { history.replaceState(null, '', location.pathname + location.search); window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: true } })); window.dispatchEvent(new HashChangeEvent('hashchange')); }
      return ev;
    }
    /** Topp til arket (brukes av Hjem og i frittstående modus). [ikon, tittel, undertekst] – kan overstyres av kortet. */
    sheetHead() { const h = this.constructor.head; return typeof h === 'function' ? h.call(this) : (h || ['home', '', '']); }
  }
  KD.KDCard = KDCard;

  /* ---------- Arkets topp-pille (fra «Hjem mobil») ---------- */
  KD.SHEET_CSS = `
.kd-sheet-top{position:sticky;top:0;left:0;right:0;z-index:3;padding:8px 12px 18px;display:flex;flex-direction:column;align-items:center;gap:8px;background:linear-gradient(180deg,#141416 0,#141416 72%,rgba(20,20,22,0) 100%);pointer-events:none;box-sizing:border-box}
.kd-sheet-top .kd-grip{width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,0.22)}
`;
  /** HTML for topp-pillen. Bruk KD.sheetTopHTML(ikon, tittel, sub) og KD.animateSheetTop(root) */
  KD.sheetTopHTML = (icon, title, sub, closeHandler = 'closeSheet', extraStyle = '') => `
<div class="kd-sheet-top" style="${extraStyle}">
  <span class="kd-grip"></span>
  <div data-bh="pill" style="position:relative;overflow:hidden;width:100%;box-sizing:border-box;height:60px;padding:0 8px;border-radius:30px;background:rgba(38,38,41,0.82);backdrop-filter:blur(18px) saturate(160%);-webkit-backdrop-filter:blur(18px) saturate(160%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.07),0 8px 24px rgba(0,0,0,0.35);display:flex;align-items:center;gap:12px;pointer-events:auto">
    <span data-bh="sheen" style="position:absolute;top:0;bottom:0;left:0;width:60%;background:linear-gradient(100deg,transparent,rgba(255,255,255,0.10),transparent);transform:translateX(-120%);pointer-events:none"></span>
    <span data-bh="iconwrap" style="position:relative;width:44px;height:44px;flex:none;transform-origin:center">
      <span data-bh="glow" style="position:absolute;inset:0;border-radius:22px;background:oklch(0.78 0.13 350);opacity:0;pointer-events:none"></span>
      <span data-bh="icon" style="position:relative;width:44px;height:44px;border-radius:22px;display:grid;place-items:center;background:linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20));color:#2a1720"><span data-bh="glyph" class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">${KD.e(icon)}</span></span>
    </span>
    <span style="position:relative;flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;text-align:left">
      <span data-bh="title" style="font-size:16px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${KD.e(title)}</span>
      <span data-bh="sub" style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-height:16px">${KD.e(sub)}</span>
    </span>
    <button data-bh="close" data-on-click="${closeHandler}" title="Lukk" style="position:relative;width:44px;height:44px;border-radius:22px;flex:none;background:rgba(255,255,255,0.08);display:grid;place-items:center"><span class="ms" style="font-size:22px">close</span></button>
  </div>
</div>`;
  /** Inngangsanimasjonen til pillen (kopiert fra designets bhAnim) */
  KD.animateSheetTop = (root) => {
    const q = k => root.querySelector('[data-bh="' + k + '"]');
    const pill = q('pill'); if (!pill || !pill.animate) return;
    const host = root.host || root; // topp_animasjon: false (config eller «Tilpass rommet») slår av animasjonen
    if ((host.config && host.config.topp_animasjon === false) || (KD._udMap.kd_innst || (host.cached ? KD.ud(host, 'kd_innst') : {})).topp_animasjon === false) { KD.scrollSheetTop(root, 0); return; }
    const sp = 'cubic-bezier(.2,.9,.25,1.25)', out = 'cubic-bezier(.2,.8,.2,1)';
    const run = (k, kf, o) => { const el = q(k); if (el) el.animate(kf, { fill: 'backwards', ...o }); };
    run('pill', [{ transform: 'translateY(-28px) scale(0.9)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 560, easing: sp });
    run('icon', [{ transform: 'scale(0.2) rotate(-120deg)' }, { transform: 'none' }], { duration: 700, delay: 110, easing: sp });
    run('glyph', [{ transform: 'scale(0.4)', opacity: 0 }, { transform: 'scale(1.25)', opacity: 1, offset: 0.6 }, { transform: 'none' }], { duration: 620, delay: 260, easing: out });
    run('title', [{ transform: 'translateX(-14px)', opacity: 0, filter: 'blur(4px)' }, { transform: 'none', opacity: 1, filter: 'blur(0)' }], { duration: 480, delay: 170, easing: out });
    run('sub', [{ transform: 'translateX(-14px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 480, delay: 250, easing: out });
    run('close', [{ transform: 'scale(0.3) rotate(90deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 560, delay: 220, easing: sp });
    run('sheen', [{ transform: 'translateX(-120%)' }, { transform: 'translateX(260%)' }], { duration: 1100, delay: 320, easing: 'ease-in-out' });
    const g = q('glow'); if (g) { if (g._kdGlow) g._kdGlow.cancel(); g._kdGlow = g.animate([{ transform: 'scale(1)', opacity: 0.45 }, { transform: 'scale(1.55)', opacity: 0 }], { duration: 2400, delay: 900, iterations: Infinity, easing: 'ease-out' }); }
    KD.scrollSheetTop(root, 0);
  };
  /** Stopp gløden i alle topp-piller under et element (også i shadow roots) */
  KD.stopSheetTop = (el) => {
    const walk = n => { if (!n) return; if (n.getAttribute && n.getAttribute('data-bh') === 'glow' && n._kdGlow) { n._kdGlow.cancel(); n._kdGlow = null; }
      if (n.shadowRoot) walk(n.shadowRoot); for (const c of n.children || []) walk(c); };
    walk(el);
  };
  /** Pillen krymper når arket scrolles (designets bhScroll) */
  KD.scrollSheetTop = (root, y) => {
    const q = k => root.querySelector('[data-bh="' + k + '"]');
    const pill = q('pill'); if (!pill) return;
    const t = Math.min(1, Math.max(0, y / 90));
    pill.style.height = (60 - 10 * t) + 'px';
    pill.style.background = 'rgba(38,38,41,' + (0.82 + 0.12 * t) + ')';
    const iw = q('iconwrap'); if (iw) iw.style.transform = 'scale(' + (1 - 0.18 * t) + ')';
    const sub = q('sub'); if (sub) { sub.style.opacity = String(1 - t); sub.style.maxHeight = (16 * (1 - t)) + 'px'; }
    const ti = q('title'); if (ti) ti.style.fontSize = (16 - t) + 'px';
  };

  /**
   * Ark-kort: arver KDCard. Kortet implementerer body() (innholdet fra designfilen, med rot-diven).
   * - header !== false (frittstående, f.eks. i bubble-card): rendrer topp-pillen øverst (sticky) + innholdet.
   * - header: false (inne i kd-hjem-card sitt ark): bare innholdet.
   * Designets egne <header>-elementer skjules alltid (som i designet: [data-sheet-scroll] header{display:none}).
   */
  class KDSheet extends KDCard {
    static get css() { return KD.SHEET_CSS + (this.sheetCss || ''); }
    render() {
      const body = this.body() + this._layHTML();
      if (this.config.header === false || this.config.embedded) return body;
      const [icon, title, sub] = this.sheetHead();
      return `<div style="background:#141416;min-height:100%">${KD.sheetTopHTML(icon, this.config.tittel || title, this.config.undertittel || sub)}<div class="kd-sheet-body" style="margin-top:-8px">${body}</div></div>`;
    }

    /* ----- «Tilpass oppsett»: rekkefølge og synlighet for seksjonene i alle popups (per bruker, 'kd_ark') -----
       Seksjonene er barna til arkets rot-div. De flyttes med CSS order og skjules med display:none (DOM-en røres ikke,
       så morph fungerer som før). Et kort kan legge til egne innstillinger i panelet med tilpassHTML(). */
    layKey() { return this.localName; }
    _layData() { return (KD.ud(this, 'kd_ark') || {})[this.layKey()] || {}; }
    _laySave(v) { const all = { ...KD.ud(this, 'kd_ark') }; if (v) all[this.layKey()] = v; else delete all[this.layKey()]; this.haptic('selection'); KD.udSave(this, 'kd_ark', all); }
    layTog() { this.setState({ lay: !this.state.lay }); }
    layReset() { this._laySave(null); }
    layOp(ev, arg) {
      const i = String(arg).lastIndexOf('|'), sig = String(arg).slice(0, i), op = String(arg).slice(i + 1);
      const list = (this._secs || []).map(x => ({ s: x.sig, n: x.n, h: x.hid }));
      const k = list.findIndex(x => x.s === sig); if (k < 0) return;
      if (op === 'skjul') list[k].h = !list[k].h;
      else { const j = k + (op === 'opp' ? -1 : 1); if (j < 0 || j >= list.length) return; [list[k], list[j]] = [list[j], list[k]]; }
      this._laySave({ rekkefolge: list.map(x => ({ s: x.s, n: x.n })), skjul: list.filter(x => x.h).map(x => ({ s: x.s, n: x.n })) });
    }
    _layRoot() { const b = this._root.querySelector('.kd-sheet-body'); return (b || this._root).firstElementChild; }
    _applyLay() {
      if (this.constructor.noLayout) return;
      const root = this._layRoot(); if (!root) return;
      const D = this._layData(), edit = !!this.state.lay;
      const seen = {}, secs = [];
      for (const el of root.children) {
        if (el.tagName === 'HEADER' || el.hasAttribute('data-lay-skip') || el.style.position === 'fixed') continue;
        // signatur: første faste tekst i seksjonen (uten ikon-ligaturer og tall), så den tåler endrede verdier
        const texts = [], tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = tw.nextNode(); n && texts.length < 3; n = tw.nextNode()) {
          if (n.parentElement && n.parentElement.closest('.ms')) continue;
          const t = n.textContent.replace(/[\d.,:;%°–\-+·/()]+/g, ' ').replace(/\s+/g, ' ').trim();
          if (t.length > 1) texts.push(t);
        }
        let sig = el.getAttribute('data-lay') || (texts[0] || el.tagName.toLowerCase()).slice(0, 28);
        seen[sig] = (seen[sig] || 0) + 1; if (seen[sig] > 1) sig += ' #' + seen[sig];
        secs.push({ el, sig, label: el.getAttribute('data-lay-navn') || texts.slice(0, 2).join(' · ').slice(0, 40) || sig });
      }
      // lagrede oppføringer {s: signatur, n: naturlig plass}: finn på signatur, ellers på plass (tekst som endrer seg, f.eks. «Borte»/«Hjemme»)
      secs.forEach((x, n) => { x.n = n; });
      const R = (D.rekkefolge || []).map(x => typeof x === 'string' ? { s: x } : x), H = (D.skjul || []).map(x => typeof x === 'string' ? { s: x } : x);
      const bySig = new Set(secs.map(x => x.sig));
      const keyOf = (e) => bySig.has(e.s) ? e.s : (e.n != null && secs[e.n] && ![...R, ...H].some(o => o.s === secs[e.n].sig) ? secs[e.n].sig : null);
      const pos = new Map(), skjul = new Set();
      R.forEach((e, i) => { const k = keyOf(e); if (k && !pos.has(k)) pos.set(k, i); });
      H.forEach(e => { const k = keyOf(e); if (k) skjul.add(k); });
      const known = secs.filter(x => pos.has(x.sig)).sort((a, b) => pos.get(a.sig) - pos.get(b.sig));
      const out = []; let ki = 0;
      secs.forEach(x => { out.push(pos.has(x.sig) ? known[ki++] : x); });
      out.forEach((x, i) => {
        x.el.style.order = String(i);
        const hid = skjul.has(x.sig);
        if (hid && !edit) x.el.style.display = 'none';
        if (edit) { x.el.style.outline = hid ? '1px dashed rgba(255,255,255,0.18)' : '1.5px solid oklch(0.78 0.13 350 / 0.45)'; x.el.style.outlineOffset = '3px'; x.el.style.opacity = hid ? '0.35' : ''; }
      });
      const list = out.map(x => ({ sig: x.sig, n: x.n, label: x.label, hid: skjul.has(x.sig) }));
      const js = JSON.stringify(list);
      if (js !== this._secsJs) { this._secsJs = js; this._secs = list; if (edit) this._queue(); }
    }
    _layHTML() {
      if (this.constructor.noLayout || this.config.tilpass === false) return '';
      const s = this.state, e = KD.e, SS = KD.S;
      if (!s.lay) return `<div data-key="kd-lay-btn" data-lay-skip="1" style="display:flex;justify-content:center;padding:4px var(--kd-kant,10px) calc(28px + env(safe-area-inset-bottom))">
        <button data-on-click="layTog" style="display:flex;align-items:center;gap:8px;height:40px;padding:0 16px;border-radius:20px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05);color:#8e8d89;font-size:12px;font-weight:500"><span class="ms" style="font-size:17px">dashboard_customize</span>Tilpass oppsett</button></div>`;
      const secs = this._secs || [];
      const ib = (arg, icon, title, col, dis) => `<button data-on-click="layOp" data-arg="${e(arg)}" title="${title}" style="${SS({ width: 34, height: 34, borderRadius: 17, flex: 'none', display: 'grid', placeItems: 'center', color: col || '#8e8d89', opacity: dis ? 0.25 : 1, pointerEvents: dis ? 'none' : null })}"><span class="ms" style="font-size:20px">${icon}</span></button>`;
      const extra = typeof this.tilpassHTML === 'function' ? this.tilpassHTML() : '';
      return `<div data-key="kd-lay-pad" data-lay-skip="1" style="height:calc(46vh + 110px)"></div>
  <div data-key="kd-lay-panel" data-lay-skip="1" style="position:fixed;left:var(--kd-kant,10px);right:var(--kd-kant,10px);bottom:calc(100px + env(safe-area-inset-bottom));z-index:30;max-width:620px;margin:0 auto;max-height:46vh;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;box-sizing:border-box;padding:8px;border-radius:26px;background:rgba(38,38,41,0.94);backdrop-filter:blur(22px) saturate(170%);-webkit-backdrop-filter:blur(22px) saturate(170%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.12),0 18px 40px rgba(0,0,0,0.5);display:flex;flex-direction:column;gap:2px">
    <div style="position:sticky;top:-8px;z-index:1;display:flex;align-items:center;gap:8px;padding:6px 4px 6px 12px;margin:-8px -8px 0;border-radius:26px 26px 0 0;background:rgba(38,38,41,0.98)">
      <span class="ms" style="font-size:20px;color:oklch(0.82 0.1 350)">dashboard_customize</span><span style="flex:1;font-size:15px;font-weight:600">Tilpass oppsett</span>
      <button data-on-click="layReset" style="height:34px;padding:0 12px;border-radius:17px;font-size:12px;color:#a9a7a2;background:rgba(255,255,255,0.06)">Nullstill</button>
      <button data-on-click="layTog" style="height:34px;padding:0 14px;margin-right:8px;border-radius:17px;font-size:13px;font-weight:600;background:linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20));color:#2a1720">Ferdig</button></div>
    ${extra}
    ${secs.length ? `<div style="padding:10px 12px 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8e8d89">Seksjoner</div>` : ''}
    ${secs.map((x, i) => `<div data-key="kd-lay-${e(x.sig)}" style="min-height:44px;padding:0 4px 0 12px;border-radius:14px;display:flex;align-items:center;gap:8px;opacity:${x.hid ? 0.45 : 1}">
      <span style="flex:1;min-width:0;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(x.label)}</span>
      ${ib(x.sig + '|opp', 'arrow_upward', 'Flytt opp', null, i === 0)}${ib(x.sig + '|ned', 'arrow_downward', 'Flytt ned', null, i === secs.length - 1)}
      ${ib(x.sig + '|skjul', x.hid ? 'visibility_off' : 'visibility', x.hid ? 'Vis' : 'Skjul', x.hid ? '#6d6c69' : 'oklch(0.82 0.1 350)')}
    </div>`).join('')}
  </div>`;
    }
    _render() {
      const first = !this._didFirst;
      super._render();
      this._applyLay();
      this._root.classList.add('kd-embedded'); // designets <header> skjules alltid i arkmodus
      if (first && this._root.querySelector('[data-bh="pill"]')) { this._didFirst = true; requestAnimationFrame(() => KD.animateSheetTop(this.shadowRoot)); }
    }
    onConnect() {
      if (this.config.header === false) return;
      // krymp pillen når nærmeste scroll-forelder scrolles
      this._scrollH = (e) => { const t = e.composedPath ? e.composedPath()[0] : e.target; const y = t === document ? window.scrollY : (t && t.scrollTop) || 0; cancelAnimationFrame(this._sr); this._sr = requestAnimationFrame(() => KD.scrollSheetTop(this.shadowRoot, y)); };
      window.addEventListener('scroll', this._scrollH, { capture: true, passive: true });
      this._didFirst = false;
    }
    onDisconnect() { if (this._scrollH) window.removeEventListener('scroll', this._scrollH, { capture: true }); }
  }
  KD.KDSheet = KDSheet;

  /** Registrer kort */
  KD.define = (tag, cls, name, description) => {
    if (customElements.get(tag)) return;
    customElements.define(tag, cls);
    window.customCards = window.customCards || [];
    window.customCards.push({ type: tag, name: name || tag, description: description || 'KI Hjem Design', preview: false });
  };

  /**
   * Romtabell (standard). ikon = Material Symbols-navn (som i designet), farge = designets aksent.
   * temp/fukt/sett/lys er brukerens entiteter; ki_rom-sensoren `sensor.<id>_oversikt` brukes først når den finnes.
   * Overstyres/utvides i config: `rom: { stue: { navn: 'Stuen', ikon: 'weekend', ... } }`.
   */
  KD.ROOMS = {
    stue: { navn: 'Stue', ikon: 'weekend', farge: KD.C.green, etasje: '1', temp: 'sensor.stue_meter_pro_temperature', fukt: 'sensor.stue_meter_pro_humidity', sett: 'input_number.stue_panelovn_teller', lys: 'light.stue_lys', hash: '#stue' },
    kjokken: { navn: 'Kjøkken', ikon: 'countertops', farge: KD.C.blue, etasje: '1', temp: 'sensor.kjokken_meter_pro_temperature', fukt: 'sensor.kjokken_meter_pro_humidity', sett: 'input_number.kjokken_gulvvarme_teller', lys: 'light.kjokken_lys', hash: '#kjokken' },
    inngang: { navn: 'Gang', ikon: 'door_front', farge: KD.C.yellow, etasje: '1', temp: 'sensor.inngang_temp_og_fukt_temperature', fukt: 'sensor.inngang_temp_og_fukt_humidity', lys: 'light.inngang_lys', hash: '#gang' },
    do: { navn: 'Do', ikon: 'wc', farge: KD.C.blue, etasje: '1', temp: 'sensor.do_klimasensor_temperatur', fukt: 'sensor.do_klimasensor_luftfuktighet', lys: 'light.do_lys', hash: '#do' },
    vaskegang: { navn: 'Vaskegang', ikon: 'local_laundry_service', farge: KD.C.blue, etasje: '1', lys: 'light.vaskegang_lys', hash: '#vaskegang' },
    ute: { navn: 'Ute', ikon: 'park', farge: KD.C.blue, etasje: '0', temp: 'sensor.vaervarsel_temperature', fukt: 'sensor.vaervarsel_humidity', lys: 'light.ute_lys', hash: '#ute' },
    pult: { navn: 'Pult', ikon: 'computer', farge: KD.C.amber, etasje: '2', temp: 'sensor.pult_hub_2_temperature', fukt: 'sensor.pult_hub_2_humidity', lys: 'light.pult_lys', hash: '#pult' },
    soverom: { navn: 'Soverom', ikon: 'bed', farge: 'oklch(0.72 0.12 295)', etasje: '2', temp: 'sensor.pult_hub_2_temperature', fukt: 'sensor.pult_hub_2_humidity', sett: 'input_number.sebastian_panelovn_teller', lys: 'light.soverom_lys', hash: '#soverom' },
    bad: { navn: 'Bad', ikon: 'bathtub', farge: KD.C.pink, etasje: '2', temp: 'sensor.trappegang_meter_pro_temperature', fukt: 'sensor.trappegang_meter_pro_humidity', sett: 'input_number.bad_gulvvarme_teller', lys: 'light.bad_lys', hash: '#bad' },
    cybele_soverom: { navn: 'Cybele', ikon: 'bed', farge: KD.C.pink, etasje: '2', temp: 'sensor.trappegang_meter_pro_temperature', fukt: 'sensor.trappegang_meter_pro_humidity', lys: 'light.cybele_soverom_lys', hash: '#cybele' },
    rune_soverom: { navn: 'Rune soverom', ikon: 'king_bed', farge: KD.C.blue, etasje: '2', temp: 'sensor.trappegang_meter_pro_temperature', fukt: 'sensor.trappegang_meter_pro_humidity', lys: 'light.rune_soverom_lys', hash: '#rune' },
    rune_kontor: { navn: 'Rune kontor', ikon: 'desk', farge: KD.C.yellow, etasje: '2', temp: 'sensor.trappegang_meter_pro_temperature', fukt: 'sensor.trappegang_meter_pro_humidity', hash: '#kontor' },
    trappegang: { navn: 'Trappegang', ikon: 'stairs', farge: KD.C.yellow, etasje: '2', temp: 'sensor.trappegang_meter_pro_temperature', fukt: 'sensor.trappegang_meter_pro_humidity', lys: 'light.trappegang_lys', hash: '#gang' },
  };
  /** Slå sammen standardrom med config.rom (objekt) */
  KD.rooms = (cfgRooms) => {
    const out = {};
    for (const [id, r] of Object.entries(KD.ROOMS)) out[id] = { id, ...r };
    if (cfgRooms && typeof cfgRooms === 'object' && !Array.isArray(cfgRooms)) for (const [id, r] of Object.entries(cfgRooms)) out[id] = { id, ...(out[id] || {}), ...(r || {}) };
    return out;
  };
  /**
   * Levende romdata: { temp, hum, set, setId, lightsOn, lightId, lightsCount } for et rom.
   * Bruker ki_rom (`sensor.<id>_oversikt` / `sensor.<id>_lys`) når det finnes, ellers tabellen.
   */
  /**
   * Finn en KI Rom-sensor for et rom: først `sensor.<rom>_<type>`, ellers sensoren med integrasjon ki_rom og area_id = rommet
   * (som ki-rom-card i ki-cards). type: 'oversikt' | 'lys' | 'effekt' … Bufres per rom.
   */
  const KIROM = new Map();
  KD.kiRom = (card, id, type = 'oversikt') => {
    const h = card._hass; if (!h || !id) return null;
    const key = id + '|' + type, S = h.states;
    const ok = x => S[x] && S[x].attributes.integrasjon === 'ki_rom';
    let f = KIROM.get(key);
    if (!f || !S[f]) {
      f = ok(`sensor.${id}_${type}`) ? `sensor.${id}_${type}` : null;
      if (!f) f = Object.keys(S).find(x => x.startsWith('sensor.') && x.endsWith('_' + type) && !x.endsWith('_lys_' + type) && ok(x) && S[x].attributes.area_id === id) || null;
      if (!f && type !== 'oversikt') { const ov = KD.kiRom(card, id, 'oversikt'); if (ov) { const g = ov.entity_id.replace(/_oversikt$/, '_' + type); if (S[g]) f = g; } }
      KIROM.set(key, f);
    }
    return f ? card.st(f) : null;
  };
  /* ----- Brukervalg per rom (lagres som HA-brukerdata, følger brukeren på alle enheter) -----
   * { <rom>: { skjul: [id], vis: [id], temp: id, fukt: id } } */
  /* ----- Strømprofiler (Norge / Sverige) ----- */
  // pris: pris nå (kr/kWh eller øre) · pris_total: totalpris med raw_today/raw_tomorrow · pris_spot: Nord Pool
  // pris_fast: fastpris med today/tomorrow (Norgespris) · spart: spart i dag (kr)
  KD.STROM_PROFILER = {
    no: { navn: 'Norge', land: 'NO', ore: 'øre', mva: 'mva',
      pris: 'sensor.norgespris_total_strompris_norgespris', pris_total: 'sensor.totalpris_inkludert_grid_el_company_og_stromstotte',
      pris_spot: 'sensor.nordpool_kwh_no1_nok_3_10_025', pris_fast: 'sensor.norgespris_pris_na', fast_navn: 'Norgespris', fast_tekst: 'Norgespris 50 øre + nettleie', spart: 'sensor.norgespris_besparelse_dag' },
    se: { navn: 'Sverige', land: 'SE', ore: 'öre', mva: 'moms',
      pris: 'sensor.stromstad_totalpris_kwh_sek', pris_total: 'sensor.stromstad_totalpris_kwh_ore',
      pris_spot: 'sensor.nordpool_kwh_se3_sek_3_10_0', pris_fast: null, fast_navn: null, fast_tekst: null, spart: null },
  };
  /** Aktiv strømprofil: config.strom_profil (no | se | auto) + config.strom_profiler (egne/overstyrte profiler) */
  KD.stromProfil = (card) => {
    const c = card.config || {}, h = card.hass || {}, P = { ...KD.STROM_PROFILER };
    for (const [k, v] of Object.entries(c.strom_profiler || {})) P[k] = { ...(P[k] || {}), ...v };
    let key = String(c.strom_profil || 'auto').toLowerCase();
    if (!P[key]) {
      const land = String((h.config && h.config.country) || '').toLowerCase();
      const has = k => P[k] && [P[k].pris_total, P[k].pris_spot, P[k].pris].some(id => id && h.states && h.states[id]);
      const order = [land, ...Object.keys(P)].filter((k, i, a) => P[k] && a.indexOf(k) === i);
      key = order.find(has) || (P[land] ? land : 'no');
    }
    const out = { key, ...P[key] };
    // Nord Pool-sensorens navn: nordpool_kwh_<område>_<valuta>_<presisjon>_<lav>_<mva>
    const m = String(out.pris_spot || '').match(/nordpool_kwh_([a-z]{2}\d?)_([a-z]{3})(?:_\d+_\d+_(\d+))?/i);
    const A = (h.states && h.states[out.pris_spot] || {}).attributes || {};
    out.region = String(A.region || (m && m[1]) || '').toUpperCase();
    out.spot_mva = m && m[3] != null ? /[1-9]/.test(m[3]) : null;
    return out;
  };
  /** Er verdien i øre/öre/cent? (enhet eller Nord Pool sin price_in_cents) */
  KD.isOre = (unit, attrs) => (attrs && attrs.price_in_cents === true) || /øre|öre|\bore\b|cent/i.test(String(unit || ''));

  KD.UD_KEY = 'kd_rom_skjul';
  KD.userData = (card) => KD._udOverride || card.cached('kd-ud-' + KD.UD_KEY, 5 * 60e3,
    () => card.ws({ type: 'frontend/get_user_data', key: KD.UD_KEY }).then(r => (r && r.value) || {}).catch(() => ({})), {});
  KD.saveUserData = (card, map) => {
    KD._udOverride = map; card.invalidate('kd-ud-');
    return card.ws({ type: 'frontend/set_user_data', key: KD.UD_KEY, value: map }).catch(e => card.toast('Kunne ikke lagre: ' + (e.message || e)));
  };
  /** Generell brukerlagring i HA (frontend/set_user_data) per nøkkel – f.eks. 'kd_kamera', 'kd_alarm', 'kd_hjem' */
  KD._udMap = {};
  KD.ud = (card, key) => KD._udMap[key] || card.cached('kd-udk-' + key, 5 * 60e3,
    () => card.ws({ type: 'frontend/get_user_data', key }).then(r => (r && r.value) || {}).catch(() => ({})), {}) || {};
  KD.udSave = (card, key, value) => {
    KD._udMap[key] = value; card.invalidate('kd-udk-' + key);
    if (card._queue) card._queue();
    return card.ws({ type: 'frontend/set_user_data', key, value }).catch(e => card.toast('Kunne ikke lagre: ' + (e.message || e)));
  };
  KD.userRoom = (card, id) => (KD.userData(card) || {})[id] || {};

  const entId = x => typeof x === 'string' ? x : x && (x.entity || x.entity_id);

  KD.roomLive = (card, r) => {
    const ov = KD.kiRom(card, r.id, 'oversikt');
    const A = (ov && ov.attributes) || {};
    const list = x => (Array.isArray(x) ? x : x ? [x] : []).map(entId).filter(Boolean);
    // første kandidat som finnes og har et tall (config/tabell først, så KI Rom-områdets sensorer)
    const firstNum = (...ids) => { for (const id of ids) { if (id && card.n(id) != null) return id; } return ids.find(Boolean) || null; };
    const U = KD.userRoom(card, r.id);
    // valgt i «Tilpass rommet» → KI Rom sine sensorer → tabellen/config
    const tId = firstNum(U.temp, ...list(A.temperatur), r.temp), hId = firstNum(U.fukt, ...list(A.fuktighet), r.fukt);
    const temp = card.n(tId), hum = card.n(hId);
    // settpunkt: KI Energis romtall → input_number/number i tabellen → første termostat i rommet
    const kiNum = `number.ki_rom_${r.id}_temp`;
    const clim = list(A.klima).find(id => String(id).startsWith('climate.') && card.st(id));
    let setId = null, set = null;
    if (card.st(kiNum)) { setId = kiNum; set = card.n(kiNum); }
    else if (r.sett && card.st(r.sett)) { setId = r.sett; set = r.sett.startsWith('climate.') ? parseFloat(card.at(r.sett, 'temperature')) : card.n(r.sett); }
    else if (clim) { setId = clim; set = parseFloat(card.at(clim, 'temperature')); }
    if (set != null && isNaN(set)) set = null;
    // lys: romgruppa hvis den finnes, ellers KI Rom-telleren
    const lysS = KD.kiRom(card, r.id, 'lys');
    const lightId = r.lys && card.st(r.lys) ? r.lys : null;
    const lysListe = lysS ? list(lysS.attributes.entiteter).filter(id => String(id).startsWith('light.')) : [];
    const lightsOn = lightId ? card.v(lightId) === 'on' : lysS ? parseFloat(lysS.state) > 0 : false;
    return { tempValg: [...new Set([...list(A.temperatur), r.temp].filter(id => id && card.st(id)))], humValg: [...new Set([...list(A.fuktighet), r.fukt].filter(id => id && card.st(id)))], temp, hum, set, setId: set != null ? setId : null, lightsOn, lightId, lysListe, lightsCount: lysS ? parseFloat(lysS.state) || 0 : null, tempId: tId, humId: hId };
  };

  /** Juster et settpunkt (number/input_number/climate) med ett steg */
  KD.stepSet = (card, id, dir) => {
    if (!id) return;
    if (id.startsWith('climate.')) {
      const cur = parseFloat(card.at(id, 'temperature')), step = card.at(id, 'target_temp_step', 0.5) || 0.5;
      return card.call('climate', 'set_temperature', { entity_id: id, temperature: (isNaN(cur) ? 20 : cur) + dir * step });
    }
    const step = card.at(id, 'step', 1) || 1, cur = card.n(id, 0);
    const lo = card.at(id, 'min', -Infinity), hi = card.at(id, 'max', Infinity);
    return card.setNum(id, KD.clamp(Math.round((cur + dir * step) * 100) / 100, lo, hi));
  };

  /** Ark-register: kd-hjem-card slår opp ark her (nøkkel → { tag, head }) */
  KD.SHEETS = KD.SHEETS || {};
  KD.sheet = (key, tag) => { KD.SHEETS[key] = tag; };
})();
