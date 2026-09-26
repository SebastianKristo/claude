/* KI Hjem Design – pikselkopi av Claude Design «Home Assistant sikkerhetspanel». Bygget 2026-09-26T00:04Z. */

/* ===== 00-kd-base.js ===== */
try {
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
      KD.segInit(this);
    }
    /** Finn element i kortet */
    $(sel) { return this.shadowRoot.querySelector(sel); }
    $$(sel) { return Array.from(this.shadowRoot.querySelectorAll(sel)); }

    /* ----- hendelser ----- */
    _dispatch(type, ev) {
      if (type === 'click') { const p0 = ev.composedPath ? ev.composedPath()[0] : ev.target, sg = p0 && p0.closest && p0.closest('[data-seg]'); if (sg && performance.now() - (sg._segDragEnd || 0) < 350) return; } // klikk etter dra i fanevelger
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
  /* ----- Liquid glass-fanevelger (felles for alle kort) -----
     KD.segHTML(key, items, cur, method, opts) → HTML. items: [[verdi, tekst, ikon?], …]. Trykk kaller this[method](ev, verdi).
     Glassboblen glir og strekkes når valget endres, og kan dras med fingeren mellom valgene (slipp velger).
     opts: { pink: true (rosa boble, mørk tekst), h: høyde (38), r: radius, bg, gap, style: ekstra stil på rammen, small: true } */
  KD.segHTML = (key, items, cur, method, o = {}) => {
    const n = Math.max(1, items.length), i = Math.max(0, items.findIndex(x => x[0] === cur)), h = o.h || (o.stack ? 54 : o.small ? 32 : 38), P = 4;
    const r = o.r != null ? o.r : Math.round((h + 2 * P) / 2);
    const cell = `((100% - ${2 * P}px) / ${n})`;
    const thumbBg = o.pink ? KD.PINK : 'linear-gradient(180deg, rgba(255,255,255,0.26), rgba(255,255,255,0.10))';
    const thumbSh = o.pink ? '0 4px 14px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.35)' : 'inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 1px rgba(255,255,255,0.10), 0 4px 14px rgba(0,0,0,0.28)';
    const on = o.pink ? '#2a1720' : '#f2f1ee', off = '#a9a7a2';
    return `<div data-key="seg-${KD.e(key)}" data-seg="${KD.e(key)}" data-seg-on="${KD.e(method)}" data-seg-i="${i}" data-seg-n="${n}" style="position:relative;display:grid;grid-template-columns:repeat(${n},minmax(0,1fr));padding:${P}px;border-radius:${r}px;background:${o.bg || '#1c1c1f'};box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04);touch-action:pan-y;user-select:none;-webkit-user-select:none;isolation:isolate;${o.style || ''}">
  <span data-seg-thumb="1" style="position:absolute;z-index:0;top:${P}px;bottom:${P}px;left:calc(${P}px + ${i} * ${cell});width:calc(${cell});border-radius:${Math.max(4, r - P)}px;background:${thumbBg};box-shadow:${thumbSh};backdrop-filter:blur(8px) saturate(180%);-webkit-backdrop-filter:blur(8px) saturate(180%);transition:left .5s cubic-bezier(.34,1.35,.64,1), transform .35s cubic-bezier(.34,1.8,.64,1);pointer-events:none"></span>
  ${items.map(([k, label, icon], j) => `<button data-on-click="${KD.e(method)}" data-arg="${KD.e(k)}" data-seg-b="${j}" style="position:relative;z-index:1;height:${h}px;min-width:0;border-radius:${Math.max(4, r - P)}px;display:flex;flex-direction:${o.stack ? 'column' : 'row'};align-items:center;justify-content:center;gap:${o.stack ? 3 : 6}px;padding:0 ${o.stack ? 2 : 6}px;font-size:${o.stack ? 10 : o.small ? 12 : 13}px;font-weight:${j === i ? 600 : 500};white-space:nowrap;color:${j === i ? on : off};transition:color .25s">${icon ? `<span class="ms" style="font-size:${o.stack ? 20 : o.small ? 15 : 17}px;font-variation-settings:'FILL' ${j === i ? 1 : 0}">${KD.e(icon)}</span>` : ''}<span style="min-width:0;overflow:hidden;text-overflow:ellipsis">${KD.e(label)}</span></button>`).join('')}
</div>`;
  };
  /** Kobler dra-støtte og strekk-animasjon til alle [data-seg] i kortet (kalles etter hver rendring) */
  KD.segInit = (card) => {
    const root = card.shadowRoot; if (!root) return;
    for (const el of root.querySelectorAll('[data-seg]')) {
      const i = +el.getAttribute('data-seg-i'), th = el.querySelector('[data-seg-thumb]');
      // strekk («flytende glass») når valget endres
      if (el._segI != null && el._segI !== i && th && th.animate && !el._segDragged) {
        const d = Math.min(3, Math.abs(i - el._segI));
        th.animate([{ transform: 'scale(1,1)' }, { transform: `scale(${1 + 0.14 * d},${1 - 0.06 * d})`, offset: 0.35 }, { transform: 'scale(0.98,1.02)', offset: 0.7 }, { transform: 'scale(1,1)' }], { duration: 520, easing: 'ease-out' });
      }
      el._segI = i; el._segDragged = false;
      if (el._segInit) continue; el._segInit = true;
      let d = null;
      const btns = () => [...el.querySelectorAll('[data-seg-b]')];
      const idxAt = x => { let best = 0, bd = 1e9; btns().forEach((b, j) => { const r = b.getBoundingClientRect(), dd = Math.abs(x - (r.left + r.width / 2)); if (dd < bd) { bd = dd; best = j; } }); return best; };
      el.addEventListener('pointerdown', ev => { if (ev.button > 0) return; d = { x0: ev.clientX, y0: ev.clientY, id: ev.pointerId, moved: false, j: -1 }; });
      el.addEventListener('pointermove', ev => {
        if (!d || ev.pointerId !== d.id) return;
        const t = el.querySelector('[data-seg-thumb]'); if (!t) return;
        if (!d.moved) {
          if (Math.abs(ev.clientY - d.y0) > 10 && Math.abs(ev.clientY - d.y0) > Math.abs(ev.clientX - d.x0)) { d = null; return; }
          if (Math.abs(ev.clientX - d.x0) < 8) return;
          d.moved = true; try { el.setPointerCapture(ev.pointerId); } catch (e) { }
          t.style.transition = 'left .12s cubic-bezier(.3,1.3,.6,1), transform .3s cubic-bezier(.34,1.8,.64,1)';
          t.style.transform = 'scale(1.08,1.12)';
        }
        const r = el.getBoundingClientRect(), w = t.offsetWidth, first = btns()[0].getBoundingClientRect(), last = btns()[btns().length - 1].getBoundingClientRect();
        t.style.left = KD.clamp(ev.clientX - r.left - w / 2, first.left - r.left, last.left - r.left) + 'px';
        const j = idxAt(ev.clientX);
        if (j !== d.j) { d.j = j; card.haptic && card.haptic('selection'); btns().forEach((b, k) => { b.style.color = k === j ? '' : ''; }); }
      });
      const end = ev => {
        if (!d || ev.pointerId !== d.id) return;
        const dd = d; d = null;
        if (!dd.moved) return;
        el._segDragEnd = performance.now(); el._segDragged = true;
        const t = el.querySelector('[data-seg-thumb]');
        if (t) { t.style.transition = ''; t.style.transform = ''; }
        const j = ev.type === 'pointercancel' ? -1 : idxAt(ev.clientX), b = btns()[j];
        const fn = card[el.getAttribute('data-seg-on')];
        if (b && typeof fn === 'function') fn.call(card, ev, b.getAttribute('data-arg'), b);
        card._force = true; card._queue && card._queue();
      };
      el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    }
  };

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
} catch (e) { console.error('ki-hjem-design: 00-kd-base.js', e); }

/* ===== 10-kd-hjem-card.js ===== */
try {
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
  const HASH = { strom: 'strom', alarm: 'sik', sikkerhet: 'sik', vanning: 'vann', rolf: 'vac', stovsuger: 'vac', media: 'media', tesla: 'car', bil: 'car', server: 'server', settings: 'settings', innstillinger: 'settings', kalender: 'cal', personer: 'person', person: 'person', weather: 'vaer', vaer: 'vaer', lys: 'lys', kamera: 'cam', klima: 'klima', soppel: 'trash', gjoremal: 'todo', planter: 'plants', sovn: 'sleep', '3d': 'printer', printer: 'printer' };
  const SHEET_HASH = { strom: 'strom', sik: 'alarm', vann: 'vanning', vac: 'rolf', media: 'media', car: 'tesla', server: 'server', settings: 'settings', cal: 'kalender', person: 'personer', vaer: 'weather', lys: 'lys', cam: 'kamera', klima: 'klima', trash: 'soppel', todo: 'gjoremal', plants: 'planter', sleep: 'sovn', printer: '3d' };
  const HEADS = { strom: ['bolt', 'Strøm', 'Forbruk og priser'], sik: ['shield', 'Sikkerhet', ''], vann: ['sprinkler', 'Vanning', 'Hage og plen'], vac: ['cleaning_services', 'Støvsuger', 'Sir Sweeps'], media: ['music_note', 'Media', 'Høyttalere og TV'], car: ['directions_car', 'Bil', 'Tesla Model Y'], server: ['dns', 'Server', 'Proxmox · UniFi'], settings: ['tune', 'Innstillinger', 'Dashbord'], cal: ['calendar_month', 'Kalender', 'Familie og skole'], person: ['person', 'Tilstedeværelse', 'Mobil, sone og søvn'], vaer: ['partly_cloudy_day', 'Vær', 'Strømstad'], lys: ['lightbulb', 'Lys', 'Alle rom'], cam: ['videocam', 'Kamera', ''], klima: ['thermostat', 'Klima', 'Energimotoren'], trash: ['delete', 'Søppel', 'Tømmeplan'], todo: ['checklist', 'Gjøremål', 'Store og personlige'], plants: ['potted_plant', 'Planter', 'Jordfukt og vanning'], sleep: ['bedtime', 'Søvn', 'Søvn og vekking'], printer: ['print', '3D-printer', 'Creality K2'] };
  const TAGS = { strom: 'kd-strom-card', sik: 'kd-sikkerhet-card', vann: 'kd-vanning-card', vac: 'kd-stovsuger-card', media: 'kd-media-card', car: 'kd-bil-card', server: 'kd-server-card', settings: 'kd-innstillinger-card', cal: 'kd-kalender-card', person: 'kd-person-card', vaer: 'kd-vaer-card', lys: 'kd-lys-card', cam: 'kd-kamera-card', klima: 'kd-klima-card', trash: 'kd-soppel-card', todo: 'kd-gjoremal-card', plants: 'kd-planter-card', sleep: 'kd-sovn-card', printer: 'kd-printer-card', rom: 'kd-rom-card' };
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
        personer: () => `    <div data-key="h-personer" style="display:flex;gap:14px;flex-wrap:wrap;margin-top:-6px">
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


      return `<div style="position:relative;box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) calc(${MB + 24}px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:22px">

  <header style="display:flex;flex-direction:column;gap:16px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
      <div style="display:flex;flex-direction:column;gap:6px;min-width:0">
        <button data-on-click="toggleServer" data-no-haptic="1" style="display:flex;align-items:center;gap:4px;max-width:100%;font-size:36px;font-weight:600;letter-spacing:-0.03em;line-height:1;white-space:nowrap"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis">${e(KD.ud(this, 'kd_hjem').tittel === 'person' || c.tittel === 'person' ? me.navn : (CUR.navn || 'Hjem'))}</span><span class="ms" style="${S(serverChev)}">arrow_drop_down</span></button>
        <button data-on-click="openWeather" style="font-size:16px;color:#8e8d89;white-space:nowrap;text-align:left">${W.head != null ? Math.round(W.head) : '–'} °C · ${e(W.cond)}</button>
      </div>
      <button data-on-click="quickPerson" data-hold="openMe" title="${e(me.navn)} · ${e(this.placeOf(me).navn)}" style="position:relative;width:60px;height:60px;border-radius:30px;flex:none;display:grid;place-items:center;font-size:22px;font-weight:600;background:${e(me.farge)};box-shadow:${meRing};${this.pic(me)}">${e(me.navn[0])}<span style="position:absolute;right:-6px;top:-4px;width:24px;height:24px;border-radius:12px;background:#232326;box-shadow:0 0 0 2px #141416;display:grid;place-items:center">${this.placeIcon(this.placeOf(me), 15)}</span></button>
    </div>
  </header>

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
} catch (e) { console.error('ki-hjem-design: 10-kd-hjem-card.js', e); }

/* ===== 20-kd-strom-card.js ===== */
try {
/*
 * kd-strom-card – «Strøm v3» fra Claude Design, med ekte data.
 *
 *   Ring:        timepriser i dag / i morgen (totalpris-sensor, faller tilbake på Nord Pool) eller forbruk per time i dag
 *   Kjerne:      effekt nå (strømmåler), valgt time, eller brukt i dag
 *   Nøkkeltall:  Norgespris, spart i dag, effekt
 *   Varsler:     varmtvann i dyr time (KI Energi-bereder), effekt over ønsket trinn
 *   Rom:         enheter med effektmåling per rom, funnet automatisk fra ki_rom (sensor.<rom>_oversikt)
 *   Hendelser:   logbok for enhetenes brytere + når spotprisen passerte varselgrensen
 *
 * Minimal config:  type: custom:kd-strom-card
 */
(() => {
  const KD = window.KD;
  if (!KD || customElements.get('kd-strom-card')) return;

  // Designets egne farger (NB: gul er 100 i dette arket, ikke 95 som i grunnmuren)
  const C = { amber: 'oklch(0.82 0.12 75)', green: 'oklch(0.8 0.12 150)', yellow: 'oklch(0.86 0.12 100)', red: 'oklch(0.72 0.15 25)', blue: 'oklch(0.8 0.12 250)' };
  const a = KD.a, nf = KD.nf, hh = KD.hh;
  // Designets runtime rendrer hver {{ x }} som eget <span> – gjør det samme så flex/gap blir likt
  const E = (x) => `<span>${KD.e(x)}</span>`;
  const VIEWS = [['pris', 'Pris i dag', 'payments'], ['morgen', 'I morgen', 'event'], ['forbruk', 'Forbruk', 'bolt']];
  const num = (x) => { const v = parseFloat(x); return isNaN(v) ? null : v; };
  const intl = (n) => Math.round(n).toLocaleString('nb-NO');
  // Tall uten desimaler når det er et heltall (5 kW), ellers én (5,5 kW)
  const nfk = (n) => (n == null ? '–' : Number.isInteger(n) ? String(n) : nf(n, 1));
  const glob = (p) => new RegExp('^' + String(p).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');

  // Ikon ut fra navn/entitet (Material Symbols, som i designet)
  const ICONS = [
    [/varmtvann|bereder|water_heater|vvb/, 'water_heater'], [/gulvvarme|panelovn|ovn|oljefyr|varme|heat|climate\./, 'heat'],
    [/server|rack|nas|proxmox/, 'dns'], [/\btv\b|tv_|_tv|fjernsyn|apple ?tv/, 'tv'], [/frys|kjøl|kjol|kjøleskap|fridge|freezer/, 'kitchen'],
    [/oppvask|dishwasher/, 'dishwasher_gen'], [/vaskemaskin|washer|washing/, 'local_laundry_service'], [/tørk|tork|dryer/, 'local_laundry_service'],
    [/pult|pc|computer|datamaskin|skjerm/, 'computer'], [/elbil|lader|charger|tesla|ev_/, 'ev_station'], [/kaffe|coffee/, 'coffee_maker'],
    [/vannkoker|kettle/, 'kettle'], [/brødrister|brodrister|toaster/, 'breakfast_dining'], [/mikro|microwave/, 'microwave'],
    [/komfyr|platetopp|stove|oven/, 'cooking'], [/vifte|fan\./, 'mode_fan'], [/printer|creality|3d/, 'print'], [/lys|lamp|light\./, 'light'],
    [/håndkle|hankle|handkle/, 'dry_cleaning'], [/router|switch_poe|nettverk|unifi/, 'router'],
  ];
  const iconFor = (s) => { s = String(s || '').toLowerCase(); for (const [re, ic] of ICONS) if (re.test(s)) return ic; return 'electrical_services'; };

  // Kjente enheter hos brukeren (brukes bare når ki_rom ikke finnes): [bryter, effekt, rom]
  const FALLBACK = [
    ['switch.varmtvannsbereder', 'sensor.varmtvannsbereder_power', 'Vaskegang'],
    ['switch.fryseskap', 'sensor.fryseskap_power', 'Vaskegang'], ['switch.vaskemaskin', 'sensor.vaskemaskin_power', 'Vaskegang'],
    ['switch.kjoleskap', 'sensor.kjoleskap_power', 'Kjøkken'], ['switch.oppvaskmaskin', 'sensor.oppvaskmaskin_power', 'Kjøkken'],
    ['switch.kaffetrakter', 'sensor.kaffetrakter_power', 'Kjøkken'], ['switch.vannkoker', 'sensor.vannkoker_power', 'Kjøkken'],
    ['switch.brodrister', 'sensor.brodrister_power', 'Kjøkken'], ['switch.mikrobolgeovn', 'sensor.mikrobolgeovn_power', 'Kjøkken'],
    ['climate.bad_gulvvarme', 'sensor.bad_gulvvarme_power', 'Bad'], ['climate.kjokken_gulvvarme', 'sensor.kjokken_gulvvarme_power', 'Kjøkken'],
    ['switch.hanklevarmer', 'sensor.hanklevarmer_power', 'Bad'],
  ];

  class KDStromCard extends KD.KDSheet {
    static head = ['bolt', 'Strøm', 'Forbruk og priser'];
    static defaults = {
      effekt: 'sensor.strommaler_effekt',                                   // W nå
      energi_i_dag: 'sensor.strommaler_powercalc_energy_daily',            // kWh i dag (timeforbruk fra statistikk)
      strom_profil: 'auto',                                                // no | se | auto – sensorene under kommer fra profilen
      pris: null,                                                          // totalpris per time (raw_today/raw_tomorrow)
      spotpris: null,                                                      // Nord Pool (reserve for ringen + spotvarsel)
      norgespris: null,                                                    // fastpris kr/kWh (Norgespris) – finnes ikke i Sverige
      spart_i_dag: null,                                                   // kr
      bereder: 'sensor.ki_bereder',                                        // KI Energi (attr bryter)
      varmtvann: '',                                                       // tom = fra KI Energi, ellers switch.varmtvannsbereder
      effekt_grense_kw: null,                                              // tom = number.ki_mal_trinn_kw, ellers 5
      dyr: 1.5, middels: 1.1,                                              // kr/kWh-terskler for fargene
      spot_varsel: 2,                                                      // kr/kWh – «Spotpris over 2 kr» i hendelsene
      rom: null,                                                           // liste med rom-ID-er (ki_rom) – tom = alle som har effektmåling
      enheter: null,                                                       // [{navn, rom, ikon, bryter, effekt}] – overstyrer oppdagelsen
      skjul: ['sensor.strommaler_*', 'sensor.*_kurs*', 'sensor.*totalt*', 'sensor.hele_huset*', 'switch.shelly_em', 'switch.*_child_lock',
        'switch.pultvifte_*', 'switch.stavifte_*', 'switch.alarm_alarm_heimdall_2', 'switch.trappegang_roykvarsler_alarm_siren', 'switch.ringeklokke_boks'],
      min_w: 3,                                                            // under dette regnes enheten som av
      logg_antall: 5,
    };
    static sheetCss = `.kd-sv-dev{cursor:pointer;-webkit-user-select:none;user-select:none}.kd-sv-dev:active{transform:scale(.985)}
.kd-sv-seg [data-seg-thumb]{background:linear-gradient(180deg, oklch(0.82 0.12 75 / 0.30), oklch(0.82 0.12 75 / 0.14)) !important;box-shadow:inset 0 0 0 1px oklch(0.82 0.12 75 / 0.45), inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 14px rgba(0,0,0,0.3) !important}
.kd-sv-seg [data-seg-b] .ms{transition:color .25s}.kd-sv-seg [data-seg-b][style*="font-weight:600"] .ms{color:oklch(0.82 0.12 75)}`;

    constructor() { super(); this.state = { view: 'pris', sel: null, open: {} }; }
    now() { return new Date(window.__kdMockNowStrom || Date.now()); }

    /* ---------- data ---------- */
    /** 24 timepriser i kr/kWh (null der det mangler) fra raw_today/raw_tomorrow eller today/tomorrow */
    _series(id, which) {
      const s = this.st(id); if (!s) return null;
      const at = s.attributes || {};
      const unit = String(at.unit_of_measurement || at.unit || '').toLowerCase();
      let raw = at['raw_' + which];
      const out = Array(24).fill(null), cnt = Array(24).fill(0);
      const base = this.now(); base.setHours(0, 0, 0, 0);
      if (which === 'tomorrow') base.setDate(base.getDate() + 1);
      if (Array.isArray(raw) && raw.length && typeof raw[0] === 'object') {
        for (const p of raw) {
          const d = new Date(p.start); const v = num(p.value);
          if (isNaN(d) || v == null || d.toDateString() !== base.toDateString()) continue;
          const h = d.getHours(); out[h] = (out[h] || 0) + v; cnt[h]++;
        }
      } else {
        raw = at[which];
        if (!Array.isArray(raw) || !raw.length) return null;
        const per = raw.length / 24;
        raw.forEach((v, i) => { v = num(v); if (v == null) return; const h = Math.min(23, Math.floor(i / per)); out[h] = (out[h] || 0) + v; cnt[h]++; });
      }
      if (!cnt.some(Boolean)) return null;
      const vals = out.map((v, h) => (cnt[h] ? v / cnt[h] : null));
      const known = vals.filter((v) => v != null).sort((x, y) => x - y);
      const ore = KD.isOre(unit, at) || (!/kr|nok|sek|dkk|eur/.test(unit) && known[Math.floor(known.length / 2)] > 10);
      return vals.map((v) => (v == null ? null : ore ? v / 100 : v));
    }
    /** sensorene fra strømprofilen (Norge/Sverige), overstyrt av config */
    get P() {
      const c = this.config, P = KD.stromProfil(this);
      return { ...P, pris: c.pris || P.pris_total, spotpris: c.spotpris || P.pris_spot, fast: c.norgespris || P.pris_fast, spart: c.spart_i_dag || P.spart, prisNa: P.pris };
    }
    _prices(which) { const P = this.P; return this._series(P.pris, which) || this._series(P.spotpris, which); }
    _kr(id) { const v = this.n(id); if (v == null) return null; return KD.isOre(this.unit(id), (this.st(id) || {}).attributes) ? v / 100 : v; }

    /** Forbruk per time i dag (kWh) fra langtidsstatistikken, med inneværende time regnet fra dagens total */
    _use(nowH) {
      const id = this.config.energi_i_dag;
      if (!id || !this.st(id)) return null;
      const mid = this.now(); mid.setHours(0, 0, 0, 0);
      const key = `kd-strom-use|${id}|${mid.toDateString()}`;
      const hours = this.cached(key, 5 * 60e3, () => this.ws({ type: 'recorder/statistics_during_period', start_time: mid.toISOString(), end_time: this.now().toISOString(), statistic_ids: [id], period: 'hour', types: ['change'] })
        .then((r) => {
          const arr = (r && r[id]) || [], out = Array(24).fill(null);
          for (const p of arr) { const d = new Date(typeof p.start === 'number' ? p.start : p.start); const v = num(p.change); if (!isNaN(d) && v != null && d.toDateString() === mid.toDateString()) out[d.getHours()] = Math.max(0, v); }
          return out;
        }), null);
      const use = Array(24).fill(null);
      if (hours) hours.forEach((v, h) => { if (h < nowH && v != null) use[h] = v; });
      const total = this.n(id);
      const sum = use.reduce((t, v) => t + (v || 0), 0);
      if (total != null) {
        if (!hours) return { use: null, total };
        use[nowH] = Math.max(0, total - sum);
        for (let h = 0; h < nowH; h++) if (use[h] == null) use[h] = 0;
      }
      return { use, total: total != null ? total : sum };
    }

    /** Enheter med effektmåling, gruppert på rom */
    _devices() {
      const c = this.config, minW = Number(c.min_w) || 0;
      const skjul = (c.skjul || []).map(glob);
      const hidden = (id) => !!id && skjul.some((re) => re.test(id));
      const watt = (id) => { const v = this.n(id); if (v == null) return null; return String(this.unit(id)).toLowerCase() === 'kw' ? v * 1000 : v; };
      const rooms = KD.rooms(c.rom && !Array.isArray(c.rom) ? c.rom : null);
      const clean = (s, room) => {
        s = String(s || '').replace(/\s+(power|effekt|current power|strøm|forbruk)$/i, '').trim();
        if (room && s.toLowerCase().startsWith(room.toLowerCase() + ' ')) s = s.slice(room.length + 1);
        return s ? s[0].toUpperCase() + s.slice(1) : s;
      };
      const list = [];
      const add = (roomName, ctl, pow, o = {}) => {
        if (hidden(ctl) || hidden(pow)) return;
        if (!this.st(ctl) && !this.st(pow)) return;
        const name = o.navn || clean(this.fname(ctl && this.st(ctl) ? ctl : pow), roomName);
        const w = pow ? watt(pow) : null;
        const sw = ctl && /^(switch|fan|light|input_boolean)\./.test(ctl) ? this.v(ctl) : null;
        const on = sw === 'off' ? false : w != null ? w >= minW : sw === 'on';
        list.push({ id: `${roomName}|${ctl || pow}`, room: roomName, ctl, pow, name, icon: o.ikon || iconFor(`${ctl || ''} ${pow || ''} ${name}`), w: w != null ? Math.round(w) : null, on });
      };
      if (Array.isArray(c.enheter) && c.enheter.length) {
        for (const e of c.enheter) add(e.rom || 'Hjem', e.bryter || e.entity || null, e.effekt || null, e);
        return list;
      }
      const all = this.all();
      let ids = Array.isArray(c.rom) ? c.rom.slice() : Object.keys(all).filter((id) => /^sensor\..+_oversikt$/.test(id) && all[id].attributes && Array.isArray(all[id].attributes.brytere)).map((id) => id.slice(7, -9));
      ids = ids.filter((id) => id !== 'totalt' && (all[`sensor.${id}_oversikt`] || {}).attributes?.area_id !== 'totalt');
      for (const rid of ids) {
        const ov = this.st(`sensor.${rid}_oversikt`); if (!ov) continue;
        const at = ov.attributes;
        const rn = (rooms[rid] && rooms[rid].navn) || String(at.friendly_name || rid).replace(/\s*oversikt$/i, '').trim();
        // Rekkefølgen følger rommets effektsensorer (ki_rom `effekt`), så brytere og termostater står slik de er satt opp
        const order = Array.isArray(at.effekt) ? at.effekt : [];
        const pos = (p) => { const i = order.indexOf(p); return i < 0 ? 1e6 : i; };
        const items = [...(at.brytere || []), ...(at.klima || []), ...(at.vifter || [])].filter((d) => d && d.effekt).map((d) => [d.entity, d.effekt])
          .concat((at.effekt_andre || []).map((p) => [null, p]));
        items.map((x, i) => [x, i]).sort((x, y) => (pos(x[0][1]) - pos(y[0][1])) || (x[1] - y[1])).forEach(([[ctl, pow]]) => add(rn, ctl, pow));
      }
      if (!list.length) for (const [ctl, pow, rn] of FALLBACK) add(rn, ctl, pow);
      return list;
    }

    /** Logbok for enhetenes brytere (siste døgn) */
    _log(devices, spot, nowH, today) {
      const c = this.config;
      const ids = [...new Set(devices.map((d) => d.ctl).filter((id) => id && /^(switch|fan|light|input_boolean|climate)\./.test(id)))];
      const byId = Object.fromEntries(devices.filter((d) => d.ctl).map((d) => [d.ctl, d]));
      const end = this.now(), start = new Date(end - 24 * 3600e3);
      const key = `kd-strom-log|${ids.join(',')}`;
      const raw = ids.length ? this.cached(key, 60e3, () => this.ws({ type: 'logbook/get_events', start_time: start.toISOString(), end_time: end.toISOString(), entity_ids: ids }), []) : [];
      const ev = [], lastOn = {};
      const list = (Array.isArray(raw) ? raw : []).slice().sort((x, y) => (x.when > y.when ? 1 : -1));
      const NORGES = this._kr(this.P.fast);
      for (const e0 of list) {
        // Termostater: alt annet enn «off» (heat/auto …) regnes som på
        const e = /^climate\./.test(e0.entity_id) && e0.state && e0.state !== 'off' && !KD.BAD.has(e0.state) ? { ...e0, state: 'on' } : e0;
        if (e.state === 'on') lastOn[e.entity_id] = e.when;
        if (e.state !== 'on' && e.state !== 'off') continue;
        const d = byId[e.entity_id]; const name = d ? d.name : (e.name || e.entity_id);
        const cname = e.context_entity_id_name || e.context_name || '';
        const who = e.context_domain === 'automation' && cname ? `Automasjon · ${cname.toLowerCase()}` : cname ? cname : e.context_user_id ? 'Manuelt' : (d ? d.room : '');
        const room = d && d.room && !name.toLowerCase().includes(d.room.toLowerCase()) ? ' ' + d.room.toLowerCase() : '';
        const t = new Date((typeof e.when === 'number' ? e.when * 1000 : e.when));
        // Vaskemaskin/oppvask som går av = programmet er ferdig
        if (d && /dishwasher|laundry/.test(d.icon)) {
          if (e.state !== 'off') continue;
          // Energi i programmet: effekthistorikk fra forrige «på» til «av»
          let w = who;
          const t0 = lastOn[e.entity_id];
          if (t0 != null && d.pow) {
            const s0 = new Date(typeof t0 === 'number' ? t0 * 1000 : t0);
            const kwh = this.cached(`kd-strom-cyc|${d.pow}|${s0.getTime()}|${t.getTime()}`, 12 * 3600e3, () => this.ws({ type: 'history/history_during_period', start_time: s0.toISOString(), end_time: t.toISOString(), entity_ids: [d.pow], minimal_response: true, no_attributes: true, significant_changes_only: false })
              .then((r) => {
                const pts = ((r && r[d.pow]) || []).map((p) => [(p.lu || p.lc) * 1000, parseFloat(p.s)]).filter((p) => !isNaN(p[1])).sort((x, y) => x[0] - y[0]);
                let wh = 0; for (let i = 0; i < pts.length; i++) { const tA = Math.max(pts[i][0], s0.getTime()), tB = i + 1 < pts.length ? pts[i + 1][0] : t.getTime(); if (tB > tA) wh += pts[i][1] * (tB - tA) / 3600e3; }
                return wh / 1000;
              }), null);
            if (kwh != null) { const pr = NORGES != null ? NORGES : (today && today[s0.getHours()] != null ? today[s0.getHours()] : null); w = `${nf(kwh, 1)} kWh${pr != null ? ` · ${nf(kwh * pr)} kr` : ''}`; }
          }
          ev.push({ t, text: `${name} ferdig`, who: w, kind: 'ok', icon: d.icon });
          continue;
        }
        ev.push({ t, text: e.state === 'on' ? `${name} slått på` : `${name}${room} av`, who, kind: e.state, icon: d ? d.icon : null });
      }
      // Spotpris over varselgrensen (siste gang den krysset i dag)
      const lim = Number(c.spot_varsel);
      if (spot && lim) {
        for (let h = nowH; h >= 0; h--) {
          if (spot[h] != null && spot[h] > lim && (h === 0 || spot[h - 1] == null || spot[h - 1] <= lim)) {
            const d = this.now(); d.setHours(h, 0, 0, 0);
            const sid = this.P.spotpris; const reg = String(this.at(sid, 'region', '') || (String(sid).match(/_(no\d|se\d|dk\d|fi)_/i) || [])[1] || '').toUpperCase();
            ev.push({ t: d, text: `Spotpris over ${nfk(lim)} kr`, who: `Nord Pool${reg ? ' · ' + reg : ''}`, kind: 'alert' });
            break;
          }
        }
      }
      return ev.filter((e) => !isNaN(e.t)).sort((x, y) => y.t - x.t).slice(0, Number(c.logg_antall) || 5);
    }

    /* ---------- handlinger ---------- */
    pick(e, h) { h = Number(h); this.setState({ sel: this.state.sel === h ? null : h }); }
    go(e, k) { if (k && k !== this.state.view) this.setState({ view: k, sel: null }); }
    openRoom(e, r) { const o = { ...(this.state.open || {}) }; o[r] = !o[r]; this.setState({ open: o }); }
    tapDev(e, id) {
      const d = (this._devs || []).find((x) => x.id === id); if (!d) return;
      if (d.ctl && /^(switch|fan|light|input_boolean)\./.test(d.ctl)) this.toggle(d.ctl); else this.more(d.ctl || d.pow);
    }
    holdDev(e, id) { const d = (this._devs || []).find((x) => x.id === id); if (d) this.more(d.ctl || d.pow); }
    fixHeater() {
      const id = this._heaterId; if (!id) return;
      if (this.isOn('binary_sensor.ki_vvb_boost_aktiv')) this.call('ki_energi', 'vvb_avbryt_boost', {});
      this.call('switch', 'turn_off', { entity_id: id });
    }
    fixRooms() { const el = this.$('[data-kd-rom]'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

    /* ---------- render ---------- */
    body() {
      const s = this.state, c = this.config;
      const now = this.now(), NOW_H = now.getHours();
      const lvl = (p) => (p == null ? '#2a2a2d' : p > c.dyr ? C.red : p > c.middels ? C.yellow : C.green);
      const today = this._prices('today'), tmr = this._prices('tomorrow');
      const isUse = s.view === 'forbruk', isToday = s.view !== 'morgen';
      const prices = (s.view === 'morgen' ? tmr : today) || Array(24).fill(null);
      const U = this._use(NOW_H);
      const USE = U && U.use ? U.use : Array(24).fill(null);
      const usedSum = U ? U.total : null;
      const maxU = Math.max(0.01, ...USE.filter((v) => v != null));
      const NORGES = this._kr(this.P.fast);
      const watt = this.n(c.effekt);
      const pNow = (today && today[NOW_H] != null) ? today[NOW_H] : this._kr(this.P.prisNa) ?? this._kr(this.P.pris);
      const idx = prices.map((p, h) => [p, h]).filter(([p, h]) => p != null && (!isToday || h > NOW_H));
      const cheapest = idx.length ? idx.reduce((m, x) => (x[0] < m[0] ? x : m)) : [prices[0], 0];
      const upcoming = [...(today || []).map((p, h) => [p, h, 0]).filter(([p, h]) => p != null && h > NOW_H), ...(tmr || []).map((p, h) => [p, h, 1]).filter(([p]) => p != null)];
      const nextCheap = upcoming.length ? upcoming.reduce((m, x) => (x[0] < m[0] ? x : m)) : null;
      let saved = this.P.spart ? this.n(this.P.spart) : null;
      if (saved == null && today && NORGES != null && U && U.use) saved = U.use.reduce((t, k, h) => t + (k != null && today[h] != null ? (today[h] - NORGES) * k : 0), 0);
      const sel = s.sel;
      const tier = watt != null ? watt / 1000 : null;
      const tierLim = c.effekt_grense_kw != null ? Number(c.effekt_grense_kw) : this.n('number.ki_mal_trinn_kw', 5);

      // Varmtvann (KI Energi-bereder eller config)
      const heaterId = this._heaterId = c.varmtvann || this.at(c.bereder, 'bryter', '') || (this.st('switch.varmtvannsbereder') ? 'switch.varmtvannsbereder' : '');
      const alerts = [];
      if (heaterId && this.v(heaterId) === 'on' && pNow != null && pNow > c.middels) alerts.push({ icon: 'water_heater', text: 'Varmtvann går i dyr time', sub: `${nf(pNow)} kr/kWh nå${nextCheap ? ` · billigst kl. ${hh(nextCheap[1])}` : ''}`, action: 'Utsett', fix: 'fixHeater' });
      if (tier != null && tier > tierLim) alerts.push({ icon: 'speed', text: `Over ${nfk(tierLim)} kW nå`, sub: `${nf(tier, 1)} kW · neste effekttrinn koster mer`, action: 'Se rom', fix: 'fixRooms' });

      let coreValue, coreUnit, coreSub, coreIconName, coreCol;
      if (sel != null) {
        coreIconName = 'schedule'; coreCol = '#f2f1ee';
        if (isUse) { coreValue = USE[sel] != null ? nf(USE[sel], 1) : '–'; coreUnit = 'kWh'; } else { coreValue = prices[sel] != null ? nf(prices[sel]) : '–'; coreUnit = 'kr'; }
        coreSub = `Kl. ${hh(sel)}–${hh((sel + 1) % 24)}${isToday ? '' : ' i morgen'}`;
      } else if (isUse) { coreValue = usedSum != null ? nf(usedSum, 1) : '–'; coreUnit = 'kWh'; coreSub = 'Brukt i dag'; coreIconName = 'bolt'; coreCol = C.amber; }
      else { coreValue = watt != null ? intl(watt) : '–'; coreUnit = 'W'; coreSub = isToday ? `Nå · ${nf(NORGES ?? pNow)} kr/kWh` : 'Bruker nå'; coreIconName = 'bolt'; coreCol = C.amber; }

      const noTmr = s.view === 'morgen' && !tmr;
      const maxP = prices.filter((p) => p != null);
      const headline = isUse ? `${nf(usedSum, 1)} kWh så langt i dag` : noTmr ? 'Ingen priser for i morgen ennå' : isToday ? (pNow == null ? 'Ingen strømpris' : pNow > c.dyr ? 'Strømmen er dyr nå' : pNow > c.middels ? 'Strømmen er middels dyr' : 'Strømmen er billig nå') : `Billigst kl. ${hh(cheapest[1])} i morgen`;
      const FAST = this.P.fast_navn || 'Norgespris';
      const costToday = U && U.use && today ? U.use.reduce((t, k, h) => t + (k != null && today[h] != null ? k * today[h] : 0), 0) : null;
      const subline = isUse ? (NORGES != null ? `${usedSum != null ? nf(usedSum * NORGES) : '–'} kr med ${FAST}` : `${costToday != null ? nf(costToday) : '–'} kr så langt i dag`) : noTmr ? 'Nord Pool publiserer morgendagen rundt kl. 13' : isToday ? (idx.length ? `Billigst kl. ${hh(cheapest[1])} · ${nf(cheapest[0])} kr/kWh` : '–') : `${nf(cheapest[0])} kr · dyrest kl. ${hh(prices.indexOf(Math.max(...maxP)))}`;

      const ring = prices.map((p, h) => {
        const deg = h * 15 + 7.5;
        const past = isToday && h < NOW_H, nowB = isToday && h === NOW_H, picked = sel === h;
        let col, len = 32;
        if (isUse) { const u = USE[h]; col = u != null ? C.amber : '#2a2a2d'; len = u != null ? 12 + (u / maxU) * 28 : 10; } else col = lvl(p);
        const dim = !isUse && past && p != null;
        const title = `${hh(h)}: ${isUse ? (USE[h] != null ? nf(USE[h], 1) + ' kWh' : '–') : p != null ? nf(p) + ' kr' : '–'}`;
        const style = { position: 'absolute', left: 'calc(50% - 4px)', top: `calc(50% - ${len / 2}px)`, width: 8, height: len, borderRadius: 4, transform: `rotate(${deg}deg) translateY(-${110 - (32 - len) / 2}px)`, background: dim ? a(col, 0.28) : col, boxShadow: nowB || picked ? `0 0 0 2px #141416, 0 0 0 3.5px ${picked ? '#f2f1ee' : col}, 0 0 16px ${col.startsWith('#') ? col : a(col, 0.7)}` : 'none', transition: 'background .4s, height .4s, transform .4s' };
        return `<button data-on-click="pick" data-arg="${h}" title="${KD.e(title)}" style="${KD.S(style)}"></button>`;
      }).join('');
      const ringLabels = [['00', 50, 1], ['06', 99, 50], ['12', 50, 99], ['18', 1, 50]].map(([t, x, y]) => `<span style="${KD.S({ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)', fontSize: 10, color: '#6d6c69', fontVariantNumeric: 'tabular-nums', pointerEvents: 'none' })}">${E(t)}</span>`).join('');

      const views = KD.segHTML('view', VIEWS, s.view, 'go', { h: 44, r: 22, style: 'margin:0' });

      const stats = [
        ...(NORGES != null || this.P.fast ? [[FAST, NORGES != null ? `${nf(NORGES)} kr` : '–', '#f2f1ee'], ['Spart i dag', saved != null ? `${nf(saved, 0)} kr` : '–', C.green]]
          : [['Pris nå', pNow != null ? `${nf(pNow)} kr` : '–', '#f2f1ee'], ['Kostet i dag', costToday != null ? `${nf(costToday, costToday < 10 ? 1 : 0)} kr` : '–', C.green]]),
        ['Effekt', tier != null ? `${nf(tier, 1)} kW` : '–', tier != null && tier > tierLim ? C.amber : '#f2f1ee'],
      ].map(([label, v, col]) => `<div style="display:flex;flex-direction:column;gap:4px;padding:12px 14px;border-radius:18px;background:#1c1c1f">
        <div style="font-size:11px;color:#8e8d89;white-space:nowrap">${E(label)}</div>
        <div style="${KD.S({ fontSize: 17, fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: col })}">${E(v)}</div>
      </div>`).join('');

      const devices = this._devs = this._devices();
      const minW = Number(c.min_w) || 0;
      const canSw = (d) => !!d.ctl && /^(switch|fan|light|input_boolean)\./.test(d.ctl);
      const onW = (d) => (d.on && d.w != null ? d.w : 0);
      const rooms = [...new Set(devices.map((d) => d.room))].map((room, i) => {
        const list = devices.filter((d) => d.room === room).map((d, j) => [d, j]).sort((x, y) => (onW(y[0]) - onW(x[0])) || ((y[0].on ? 1 : 0) - (x[0].on ? 1 : 0)) || (x[1] - y[1])).map((x) => x[0]);
        return { room, i, list, w: list.reduce((t, d) => t + onW(d), 0), on: list.filter((d) => d.on).length };
      }).sort((x, y) => (y.w - x.w) || (y.on - x.on) || (x.i - y.i));
      const devSum = rooms.reduce((t, r) => t + r.w, 0);
      const houseW = Math.max(devSum, watt != null ? watt : 0);
      const restW = Math.max(0, houseW - devSum);
      const roomCol = (k) => a(C.amber, [1, 0.72, 0.52, 0.38, 0.28, 0.22][Math.min(5, k)]);
      const litRooms = rooms.filter((r) => r.w > 0);
      const mixBar = houseW > 0 ? `<div style="display:flex;gap:3px;height:10px;border-radius:5px;overflow:hidden">
        ${litRooms.map((r, k) => `<span title="${KD.e(r.room)}" style="flex:${r.w} 1 0;min-width:4px;background:${roomCol(k)};transition:flex .5s"></span>`).join('')}
        ${restW > 0 ? `<span title="Annet" style="flex:${restW} 1 0;min-width:4px;background:#3a3a3e"></span>` : ''}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px 14px;font-size:11.5px;color:#8e8d89;min-width:0">
        ${litRooms.slice(0, 5).map((r, k) => `<span style="display:inline-flex;align-items:center;gap:6px;min-width:0;white-space:nowrap"><span style="width:8px;height:8px;border-radius:3px;background:${roomCol(k)};flex:none"></span>${E(r.room)}<span style="color:#6d6c69;font-variant-numeric:tabular-nums">${E(Math.round(r.w / houseW * 100) + ' %')}</span></span>`).join('')}
        ${restW > 0 ? `<span style="display:inline-flex;align-items:center;gap:6px;white-space:nowrap"><span style="width:8px;height:8px;border-radius:3px;background:#3a3a3e;flex:none"></span>${E('Annet')}<span style="color:#6d6c69;font-variant-numeric:tabular-nums">${E(Math.round(restW / houseW * 100) + ' %')}</span></span>` : ''}
      </div>` : '';

      const devRow = (d, roomW) => {
        const sw = canSw(d), isOn = !!d.on, w = d.w, swOn = sw && this.v(d.ctl) === 'on';
        const val = w != null && (isOn || w > 0 || swOn) ? intl(w) : isOn ? 'På' : 'Av';
        const sub = isOn && w != null && roomW > 0 ? `${Math.round(w / roomW * 100)} % av rommet` : isOn ? (w != null && w < minW ? 'Standby' : 'På') : swOn ? (w ? `Standby · ${intl(w)} W` : 'Standby') : w != null && w > 0 ? `Standby · ${intl(w)} W` : (/^climate\./.test(d.ctl || '') ? 'Varmer ikke' : 'Av');
        const tg = sw ? `<span style="position:relative;flex:none;width:40px;height:24px;border-radius:12px;background:${swOn ? C.amber : '#3a3a3e'};transition:background .25s;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05)">
            <span style="position:absolute;top:3px;left:${swOn ? 19 : 3}px;width:18px;height:18px;border-radius:9px;background:${swOn ? '#161618' : '#a9a7a2'};box-shadow:0 1px 3px rgba(0,0,0,0.35);transition:left .3s cubic-bezier(.34,1.4,.64,1),background .25s"></span></span>`
          : `<span class="ms" style="flex:none;width:40px;text-align:center;font-size:20px;color:#6d6c69">chevron_right</span>`;
        return `<div class="kd-sv-dev" data-key="dev-${KD.e(d.id)}" data-on-click="tapDev" data-hold="holdDev" data-arg="${KD.e(d.id)}" role="button" style="display:flex;align-items:center;gap:12px;min-width:0;padding:9px 10px 9px 8px;border-radius:16px;background:${isOn ? '#232326' : 'transparent'};transition:background .25s">
          <span style="flex:none;width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:${isOn ? a(C.amber, 0.16) : '#232326'}">
            <span class="ms" style="font-size:19px;color:${isOn ? C.amber : '#6d6c69'};font-variation-settings:'FILL' ${isOn ? 1 : 0}">${E(d.icon)}</span>
          </span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:1px">
            <span style="font-size:14px;font-weight:500;color:${isOn ? '#f2f1ee' : '#a9a7a2'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(d.name)}</span>
            <span style="font-size:11.5px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(sub)}</span>
          </span>
          <span style="flex:none;font-size:14px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap;color:${isOn && w ? '#f2f1ee' : '#6d6c69'}">${E(val)}${w != null && (isOn || w > 0 || swOn) ? `<span style="font-size:11px;color:#8e8d89;font-weight:400"> W</span>` : ''}</span>
          ${tg}
        </div>`;
      };
      const roomsHtml = rooms.map((r, k) => {
        const open = !!(s.open || {})[r.room], TOP = 3;
        const shown = open ? r.list : r.list.slice(0, TOP);
        const pct = houseW > 0 ? r.w / houseW * 100 : 0;
        const lit = r.w > 0;
        return `<div data-key="room-${KD.e(r.room)}" style="display:flex;flex-direction:column;gap:10px;min-width:0;padding:14px 10px 10px;border-radius:24px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04)">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;padding:0 6px">
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
              <div style="font-size:16px;font-weight:500;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(r.room)}</div>
              <div style="font-size:11.5px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(`${r.on} av ${r.list.length} på${lit && houseW ? ` · ${Math.round(pct)} % av huset` : ''}`)}</div>
            </div>
            <div style="flex:none;font-size:22px;font-weight:500;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;white-space:nowrap;color:${lit ? '#f2f1ee' : '#6d6c69'}">${E(lit ? intl(r.w) : '0')}<span style="font-size:12px;color:#8e8d89;font-weight:400"> W</span></div>
          </div>
          <div style="margin:0 6px;height:6px;border-radius:3px;background:#2a2a2d;overflow:hidden">
            <div style="height:100%;width:${lit ? Math.max(2, pct).toFixed(1) : 0}%;border-radius:3px;background:linear-gradient(90deg, ${a(C.amber, 0.55)}, ${roomCol(k < litRooms.length ? k : 5)});box-shadow:0 0 12px ${a(C.amber, 0.35)};transition:width .6s cubic-bezier(.3,1,.4,1)"></div>
          </div>
          <div style="display:flex;flex-direction:column;gap:2px;min-width:0">${shown.map((d) => devRow(d, r.w)).join('')}</div>
          ${r.list.length > TOP ? `<button data-on-click="openRoom" data-arg="${KD.e(r.room)}" style="align-self:stretch;height:36px;border-radius:14px;background:#232326;display:flex;align-items:center;justify-content:center;gap:6px;font-size:12.5px;font-weight:500;color:#c9c7c2">
            ${E(open ? 'Vis færre' : `Vis alle ${r.list.length}`)}<span class="ms" style="font-size:18px;transition:transform .3s;transform:rotate(${open ? 180 : 0}deg)">expand_more</span></button>` : ''}
        </div>`;
      }).join('');

      const spot = this._series(this.P.spotpris, 'today');
      const log = this._log(devices, spot, NOW_H, today);
      const rel = (t) => {
        const m = Math.round((now - t) / 60e3);
        if (m < 1) return 'nå'; if (m < 60) return `${m} min siden`;
        const h = Math.floor(m / 60), r = m % 60;
        return h < 6 && r ? `${h} t ${r} min siden` : `${h} t siden`;
      };
      const logHtml = log.map((e, i, arr) => {
        const col = e.kind === 'alert' ? C.red : e.kind === 'on' ? C.amber : e.kind === 'off' ? C.blue : C.green;
        const ic = e.kind === 'alert' ? 'trending_up' : e.kind === 'ok' ? 'check_circle' : (e.icon || (e.kind === 'on' ? 'power' : 'power_off'));
        const badge = e.kind === 'on' ? 'Slått på' : e.kind === 'off' ? 'Slått av' : e.kind === 'ok' ? 'Ferdig' : 'Pris';
        const last = i === arr.length - 1;
        return `<div data-key="ev-${i}" style="display:flex;gap:12px;align-items:stretch;min-width:0">
          <div style="display:flex;flex-direction:column;align-items:center;width:34px;flex:none">
            <span style="width:34px;height:34px;border-radius:12px;flex:none;display:grid;place-items:center;background:${a(col, 0.14)};box-shadow:inset 0 0 0 1px ${a(col, 0.3)}">
              <span class="ms" style="font-size:18px;color:${col};font-variation-settings:'FILL' 1">${E(ic)}</span>
            </span>
            <span style="flex:1;width:2px;min-height:10px;margin:4px 0;border-radius:1px;background:${last ? 'transparent' : `linear-gradient(${a(col, 0.35)}, rgba(255,255,255,0.06))`}"></span>
          </div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;padding:2px 0 ${last ? 0 : 14}px">
            <div style="display:flex;align-items:baseline;gap:10px;min-width:0">
              <div style="flex:1;min-width:0;font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(e.text)}</div>
              <div style="flex:none;font-size:11.5px;color:#8e8d89;font-variant-numeric:tabular-nums;white-space:nowrap">${E(KD.hm(e.t))}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;min-width:0;font-size:12px;color:#8e8d89">
              <span style="flex:none;padding:1px 7px;border-radius:7px;font-size:10.5px;font-weight:600;letter-spacing:0.02em;color:${col};background:${a(col, 0.12)}">${E(badge)}</span>
              <span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E([rel(e.t), e.who].filter(Boolean).join(' · '))}</span>
            </div>
          </div>
        </div>`;
      }).join('');

      const coreIcon = { fontSize: 26, color: coreCol, fontVariationSettings: "'FILL' 1" };
      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 28px;display:flex;flex-direction:column;gap:22px">

  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Strøm</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section style="display:flex;flex-direction:column;align-items:center;gap:20px">
    <div style="position:relative;width:260px;height:260px">
      ${ring}${ringLabels}
      <div style="position:absolute;inset:44px;border-radius:50%;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">
        <span class="ms" style="${KD.S(coreIcon)}">${E(coreIconName)}</span>
        <div style="font-size:34px;font-weight:500;letter-spacing:-0.03em;line-height:1;font-variant-numeric:tabular-nums;white-space:nowrap">${E(coreValue)}<span style="font-size:14px;color:#8e8d89;font-weight:400"> ${E(coreUnit)}</span></div>
        <div style="font-size:12px;color:#8e8d89;white-space:nowrap">${E(coreSub)}</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
      <div style="font-size:24px;font-weight:500;letter-spacing:-0.015em;text-wrap:balance">${E(headline)}</div>
      <div style="font-size:14px;color:#8e8d89">${E(subline)}</div>
    </div>
  </section>

  <section class="kd-sv-seg">${views}</section>

  <section style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">${stats}</section>

  ${alerts.length ? `<section style="display:flex;flex-direction:column;gap:8px">
      <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:oklch(0.82 0.12 75);padding:0 4px">Krever oppmerksomhet</div>
      ${alerts.map((al) => `<div style="display:flex;align-items:center;gap:12px;padding:12px 12px 12px 14px;border-radius:20px;background:oklch(0.82 0.12 75 / 0.12);box-shadow:inset 0 0 0 1px oklch(0.82 0.12 75 / 0.35)">
          <span class="ms" style="font-size:22px;color:oklch(0.82 0.12 75)">${E(al.icon)}</span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
            <div style="font-size:15px;font-weight:500">${E(al.text)}</div>
            <div style="font-size:12px;color:#c9c7c2">${E(al.sub)}</div>
          </div>
          <button data-on-click="${al.fix}" style="height:36px;padding:0 14px;border-radius:18px;background:oklch(0.82 0.12 75);color:#161618;font-size:13px;font-weight:600;white-space:nowrap">${E(al.action)}</button>
        </div>`).join('')}
    </section>` : ''}

  ${devices.length ? `<section data-kd-rom style="display:flex;flex-direction:column;gap:10px;min-width:0">
    <div style="display:flex;flex-direction:column;gap:10px;padding:0 4px 4px;min-width:0">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">
        <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Rom</div>
        <div style="font-size:12px;color:#8e8d89;white-space:nowrap;font-variant-numeric:tabular-nums">${E(`${devices.filter((d) => d.on).length} av ${devices.length} på${houseW ? ` · ${intl(houseW)} W` : ''}`)}</div>
      </div>
      ${mixBar}
    </div>
    ${roomsHtml}
  </section>` : ''}

  ${log.length ? `<section style="display:flex;flex-direction:column;gap:10px;min-width:0">
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:0 4px">
      <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Siste hendelser</div>
      <div style="font-size:12px;color:#6d6c69;white-space:nowrap">Siste døgn</div>
    </div>
    <div style="display:flex;flex-direction:column;padding:16px 14px;border-radius:24px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04);min-width:0">${logHtml}</div>
  </section>` : ''}
</div>`;
    }
  }

  KD.define('kd-strom-card', KDStromCard, 'KD Strøm', 'Strømpriser, forbruk og effekt per rom (Strøm v3)');
  KD.sheet('strom', 'kd-strom-card');
})();
} catch (e) { console.error('ki-hjem-design: 20-kd-strom-card.js', e); }

/* ===== 21-kd-klima-card.js ===== */
try {
/*
 * kd-klima-card – «Klima v2» fra Claude Design, med ekte data fra KI Energi (ki_energi).
 *
 * Alt leses fra entitetene integrasjonen lager (faste ID-er): sensor.ki_energi_status (budsjett, personer, flagg),
 * sensor.ki_laster (soner), sensor.ki_nettleie, sensor.ki_prognose, sensor.ki_bereder, sensor.ki_hanklevarmer,
 * sensor.ki_sparing, sensor.ki_besparelse, sensor.ki_tidskonstanter, sensor.ki_beslutningslogg, sensor.ki_lys,
 * sensor.ki_prognoselaering, sensor.ki_vvb_billige_timer + switch/number/time-hjelperne.
 * Soner, personer, lysregler, bereder og håndklevarmer oppdages automatisk.
 *
 * Minimal config:  type: custom:kd-klima-card
 */
(() => {
  const KD = window.KD;
  if (!KD || customElements.get('kd-klima-card')) return;

  const PINK = 'linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20))';
  const P = 'oklch(0.78 0.13 350)', G = 'oklch(0.8 0.14 150)', A = 'oklch(0.82 0.12 75)', R = 'oklch(0.72 0.15 25)', B = 'oklch(0.78 0.1 245)';
  const PURPLE = 'oklch(0.72 0.12 300)', ORANGE = 'oklch(0.72 0.15 50)';
  const al = KD.a, nf = KD.nf, S = KD.S;
  const E = (x) => `<span>${KD.e(x)}</span>`;            // {{ x }} = eget <span> i designet
  const num = (x) => { const v = parseFloat(x); return isNaN(v) ? null : v; };
  const nfk = (n) => (n == null ? '–' : Number.isInteger(Math.round(n * 100) / 100) ? String(Math.round(n)) : nf(n, 1));
  const pad = (h) => String(h).padStart(2, '0');
  const T = [['ov', 'Oversikt', 'dashboard'], ['so', 'Soner', 'roofing'], ['en', 'Energi', 'bolt'], ['vb', 'Vann og bad', 'water_heater'], ['ta', 'Tanker', 'psychology'], ['op', 'Oppsett', 'tune'], ['av', 'Avansert', 'build']];
  const SONE_TEKST = { gronn: 'God margin', gul: 'Nærmer seg grensen', oransje: 'Liten margin', rod: 'Fare for ny topp', kritisk: 'Kritisk', fallback: 'Trygg fallback', av: 'Motoren er av' };
  const SONE_FARGE = { gronn: G, gul: A, oransje: A, rod: R, kritisk: R, fallback: A, info: B };
  const HANDLING = { normal: ['Normal', G], senket: ['Senket', A], vindu: ['Vindu åpent', R], venter: ['Venter på tur', A], manuell: ['Manuell', '#a9a7a2'], utilgjengelig: ['Utilgjengelig', R], utsatt: ['Utsatt', A], 'på': ['På', G], av: ['Av', '#a9a7a2'] };
  const TYPE_NAVN = { panel: 'Panelovn', gulv: 'Gulvvarme', vannbaaren: 'Oljefyr', varmepumpe: 'Varmepumpe' };
  const DAG = ['søn', 'man', 'tir', 'ons', 'tor', 'fre', 'lør'], MND = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
  const MND_LANG = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
  // Første setning som tittel, resten som undertekst («Ferdig for i natt. Neste vindu …»)
  const split = (t) => { t = String(t || '').trim(); const m = t.match(/^(.+?)\.\s+(?=[A-ZÆØÅ])(.+)$/); return m ? [m[1], m[2]] : [t.replace(/\.$/, ''), '']; };

  class KDKlimaCard extends KD.KDSheet {
    static head = ['thermostat', 'Klima', 'Energimotoren'];
    static defaults = {
      status: 'sensor.ki_energi_status', laster: 'sensor.ki_laster', logg: 'sensor.ki_beslutningslogg',
      prognose: 'sensor.ki_prognose', nettleie: 'sensor.ki_nettleie', bereder: 'sensor.ki_bereder',
      hanklevarmer: 'sensor.ki_hanklevarmer', sparing: 'sensor.ki_sparing', besparelse: 'sensor.ki_besparelse',
      tidskonstanter: 'sensor.ki_tidskonstanter', prognoselaering: 'sensor.ki_prognoselaering', lys: 'sensor.ki_lys',
      billige_timer: 'sensor.ki_vvb_billige_timer', vvb_forklaring: 'sensor.ki_vvb_forklaring',
      uregulert: 'sensor.ki_uregulert_effekt', styrt: 'sensor.ki_styrt_effekt',
      fane: 'ov',                 // ov | so | en | vb | ta | op | av
      logg_antall: 5,
      sone_ikoner: {},            // { sonenøkkel: 'material-ikon' }
    };
    static sheetCss = `.kd-kl-p:active{transform:scale(0.97)}.kd-kl-p2:active{transform:scale(0.92)}.kd-kl-row{cursor:pointer}`;

    constructor() { super(); this.state = { tab: null, zone: null, set: {}, dur: {}, water: 'ber' }; }
    now() { return new Date(window.__kdMockNowKlima || Date.now()); }

    /* ---------- små lesere ---------- */
    sa(k, d) { return this.at(this.config.status, k, d); }
    tm(id) { const s = this.v(id); const m = /^(\d{1,2}):(\d{2})/.exec(s); return m ? `${pad(m[1])}:${m[2]}` : '–'; }
    th(id) { const s = this.v(id); const m = /^(\d{1,2}):(\d{2})/.exec(s); return m ? Number(m[1]) + Number(m[2]) / 60 : null; }
    ts(id) { const s = this.tm(id); return s.endsWith(':00') ? s.slice(0, 2) : s; }     // «19» / «05:30»
    nv(id, d, unit = '') { const v = this.n(id); return v == null ? '–' : nf(v, d) + unit; }
    dato(iso) {
      const d = iso ? new Date(iso) : null; if (!d || isNaN(d)) return '–';
      const t0 = this.now(); const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(t0.getFullYear(), t0.getMonth(), t0.getDate())) / 86400e3);
      const naar = diff === 0 ? 'i dag' : diff === 1 ? 'i morgen' : diff === -1 ? 'i går' : `${DAG[d.getDay()]} ${d.getDate()}. ${MND[d.getMonth()]}`;
      return `${naar} ${KD.hm(d)}`;
    }
    dag(iso) { const d = iso ? new Date(iso) : null; return !d || isNaN(d) ? '–' : `${DAG[d.getDay()]} ${d.getDate()}. ${MND[d.getMonth()]}`; }
    laster() { return this.at(this.config.laster, 'laster', []) || []; }
    zones() { return this.laster().filter((l) => l && l.type !== 'bryter' && l.key !== 'vvb'); }
    zoneIcon(l) {
      const ic = (this.config.sone_ikoner || {})[l.key]; if (ic) return ic;
      const s = `${l.key} ${l.navn} ${l.rom || ''}`.toLowerCase();
      if (/stue/.test(s)) return 'weekend';
      if (/trapp/.test(s)) return 'stairs';
      if (/bad/.test(s)) return 'floor_lamp';
      if (l.type === 'gulv') return 'floor';
      if (l.type === 'varmepumpe') return 'heat_pump';
      return 'heat';
    }
    isMan(l) { return l.handling === 'manuell' || (l.styr && this.st(l.styr) && !this.isOn(l.styr)); }
    remaining(l) {
      const d = l.overstyrt_til ? new Date(l.overstyrt_til) : null; if (!d || isNaN(d)) return null;
      const m = Math.max(0, Math.round((d - this.now()) / 60000));
      return { min: m, t: m >= 60 ? `${Math.round(m / 60)} t` : `${m} min` };
    }
    climates(l) { return (l.entiteter || []).filter((e) => /^climate\./.test(e)); }
    powerW(l) { const ids = (l.entiteter || []).filter((e) => /^sensor\./.test(e) && /power|effekt|_w$/i.test(e)); if (!ids.length) return null; return ids.reduce((t, e) => t + (this.n(e) || 0), 0); }

    /* ---------- byggesteiner (designets row/card/sw) ---------- */
    sw(on) {
      return { track: { position: 'relative', width: 44, height: 26, borderRadius: 13, flex: 'none', background: on ? P : '#3a3a3d', transition: 'background .2s' }, knob: { position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: 10, background: '#f4f3ef', transition: 'left .2s' } };
    }
    // o: { dot, sub, v, pill, chip:[t,c], tog: entity (bryter), on (overstyr av/på), go: [metode, arg] }
    row(k, o = {}, i = 0) {
      const on = o.tog ? (o.on != null ? o.on : this.isOn(o.tog)) : null;
      const chipS = (c) => ({ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 7, background: al(c, 0.18), color: c, whiteSpace: 'nowrap' });
      const go = o.tog ? ['togRow', o.tog] : o.go || null;
      const row = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', width: '100%', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: go ? 'pointer' : 'default' };
      const dot = { display: o.dot ? 'block' : 'none', width: 7, height: 7, borderRadius: 4, flex: 'none', background: o.dot || 'transparent' };
      const chip = o.chip ? chipS(o.chip[1]) : { display: 'none' };
      const subStyle = { display: o.sub ? 'block' : 'none', fontSize: 11, color: '#8e8d89', textWrap: 'pretty' };
      const vStyle = { display: o.v ? 'block' : 'none', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', padding: o.pill ? '6px 11px' : 0, borderRadius: 12, background: o.pill ? '#262629' : 'transparent' };
      const w = this.sw(on);
      const track = { ...w.track, display: on == null ? 'none' : 'block' };
      return `<button ${go ? `data-on-click="${go[0]}" data-arg="${KD.e(go[1] || '')}"` : ''} style="${S(row)}">
            <span style="${S(dot)}"></span>
            <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;text-align:left">
              <span style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:13px;font-weight:500">${E(k)}<span style="${S(chip)}">${E(o.chip ? o.chip[0] : '')}</span></span>
              <span style="${S(subStyle)}">${E(o.sub || '')}</span>
            </span>
            <span style="${S(vStyle)}">${E(o.v || '')}</span>
            <span style="${S(track)}"><span style="${S(w.knob)}"></span></span>
          </button>`;
    }
    // o: { rows:[[k,o]], stats:[[v,k]], note, bars:[{v, on}], lines:[[navn, [[a,b,t,c]]]] }
    card(icon, title, meta, o = {}) {
      const now = this.now(), nowPct = (now.getHours() + now.getMinutes() / 60) / 24 * 100;
      const stats = o.stats || [];
      const grid = { display: 'grid', gridTemplateColumns: `repeat(${stats.length === 4 ? 4 : 3},1fr)`, gap: 6 };
      const nowLine = { position: 'absolute', top: 0, bottom: 0, left: `${nowPct}%`, width: 2, background: '#f2f1ee' };
      const seg = ([a0, b0, t, c]) => `<span style="${S({ position: 'absolute', top: 2, bottom: 2, left: `${a0 / 24 * 100}%`, width: `${(b0 - a0) / 24 * 100}%`, borderRadius: 6, background: al(c, 0.55), color: '#f2f1ee', fontSize: 9, fontWeight: 600, display: 'flex', alignItems: 'center', paddingLeft: 5, overflow: 'hidden', whiteSpace: 'nowrap', boxSizing: 'border-box' })}">${E(t)}</span>`;
      return `<section style="display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:28px;background:#1c1c1f">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">
        <span style="display:flex;align-items:center;gap:8px;font-size:15px;font-weight:500"><span class="ms" style="font-size:18px;color:#a9a7a2">${E(icon)}</span>${E(title)}</span>
        <span style="font-size:12px;color:#8e8d89;text-align:right">${E(meta)}</span>
      </div>
      ${o.stats ? `<div style="${S(grid)}">${stats.map(([v, k]) => `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:12px 4px;border-radius:18px;background:#262629;text-align:center"><span style="font-size:17px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap">${E(v)}</span><span style="font-size:10px;color:#8e8d89">${E(k)}</span></div>`).join('')}</div>` : ''}
      ${o.lines ? `${o.lines.map(([name, segs]) => `<div style="display:flex;align-items:center;gap:8px">
            <span style="width:72px;flex:none;font-size:11px;color:#c9c7c2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(name)}</span>
            <div style="position:relative;flex:1;height:22px;border-radius:8px;background:#262629;overflow:hidden">
              ${segs.map(seg).join('')}
              <span style="${S(nowLine)}"></span>
            </div>
          </div>`).join('')}
        <div style="display:flex;justify-content:space-between;padding-left:80px;font-size:9px;color:#6d6c69;font-variant-numeric:tabular-nums"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>` : ''}
      ${o.bars ? `<div style="display:flex;align-items:flex-end;gap:2px;height:80px">${o.bars.map((b) => `<span style="${S(b)}"></span>`).join('')}</div>` : ''}
      <div style="display:flex;flex-direction:column">${(o.rows || []).map(([k, x], i) => this.row(k, x, i)).join('')}</div>
      ${o.note ? `<div style="font-size:11px;line-height:1.5;color:#8e8d89;text-wrap:pretty">${E(o.note)}</div>` : ''}
    </section>`;
    }
    pillRow(id, icon, label, sub, c, on, handler = 'togRow') {
      if (on == null) on = this.isOn(id);
      const w = this.sw(on);
      const pill = { display: 'flex', alignItems: 'center', gap: 12, minHeight: 62, padding: '6px 14px 6px 6px', borderRadius: 31, background: '#1c1c1f', width: '100%', boxSizing: 'border-box' };
      const iconWrap = { width: 50, height: 50, borderRadius: 25, flex: 'none', display: 'grid', placeItems: 'center', background: on ? c : '#2a2a2d', color: on ? '#141416' : '#8e8d89', transition: 'background .25s' };
      return `<button data-on-click="${handler}" data-arg="${KD.e(id)}" style="${S(pill)}">
          <span style="${S(iconWrap)}"><span class="ms" style="font-size:20px;font-variation-settings:'FILL' 1">${E(icon)}</span></span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column;text-align:left"><span style="font-size:14px;font-weight:500">${E(label)}</span><span style="font-size:11px;color:#8e8d89">${E(sub)}</span></span>
          <span style="${S(w.track)}"><span style="${S(w.knob)}"></span></span>
        </button>`;
    }

    /* ---------- handlinger ---------- */
    tab(e, k) { this.setState({ tab: k }); }
    togRow(e, id) { if (!id) return; const d = id.split('.')[0]; if (d === 'switch' || d === 'input_boolean') this.call(d, this.isOn(id) ? 'turn_off' : 'turn_on', { entity_id: id }); else this.more(id); }
    moreId(e, id) { this.more(id); }
    toggleAway() { this.togRow(null, 'switch.ki_helgemodus'); }
    mode(e, id) {
      if (/^binary_sensor\./.test(id)) return this.more(id);
      if (id === 'switch.ki_hjemkomst_aktiv') return this.call('ki_energi', this.isOn(id) ? 'hjemkomst_ferdig' : 'hjemkomst', {});
      this.togRow(e, id);
    }
    bed(e, key) { const l = this.laster().find((x) => x.key === key); if (l) this.call('ki_energi', 'leggetid', { sone: key, avbryt: !!l.leggetid }); }
    pickZone(e, key) { this.setState({ zone: this.state.zone === key ? null : key }); }
    closeZone() { this.setState({ zone: null }); }
    step(e, dir) {
      const l = this.zones().find((x) => x.key === this.state.zone); if (!l) return;
      const cur = this._zoneSet(l); const v = Math.round((cur + Number(dir) * 0.5) * 2) / 2;
      if (this.isMan(l)) { const cl = this.climates(l); if (cl.length) this.call('climate', 'set_temperature', { entity_id: cl, temperature: v }); this.setState({ set: { ...this.state.set, [l.key]: v } }); return; }
      if (l.overstyrt) { const r = this.remaining(l); this.call('ki_energi', 'overstyr', { sone: l.key, temp: v, minutter: Math.max(5, r ? r.min : 60) }); this.setState({ set: { ...this.state.set, [l.key]: null } }); return; }
      this.setState({ set: { ...this.state.set, [l.key]: v } });
    }
    dur(e, t) {
      const l = this.zones().find((x) => x.key === this.state.zone); if (!l) return;
      const active = l.overstyrt && this.state.dur[l.key] === t;
      if (active) { this.call('ki_energi', 'fjern_overstyring', { sone: l.key }); this.setState({ dur: { ...this.state.dur, [l.key]: null } }); return; }
      this.call('ki_energi', 'overstyr', { sone: l.key, temp: this._zoneSet(l), minutter: { '1 t': 60, '2 t': 120, '6 t': 360 }[t] || 60 });
      this.setState({ dur: { ...this.state.dur, [l.key]: t }, set: { ...this.state.set, [l.key]: null } });
    }
    water(e, k) { this.setState({ water: k }); }
    boost() { this.call('ki_energi', this.isOn('binary_sensor.ki_vvb_boost_aktiv') ? 'vvb_avbryt_boost' : 'vvb_boost', {}); }
    force() { this.call('ki_energi', 'vvb_tving_syklus', {}); }
    motor() { this.togRow(null, 'switch.ki_skyggemodus'); }
    hkSwitch(e, id) { if (id) this.call('switch', this.v(id) === 'on' ? 'turn_off' : 'turn_on', { entity_id: id }); }

    _zoneSet(l) {
      const p = this.state.set[l.key];
      if (p != null) return p;
      if (l.overstyrt && l.overstyrt_temp != null) return Number(l.overstyrt_temp);
      if (this.isMan(l)) { const cl = this.climates(l)[0]; const t = cl ? num(this.at(cl, 'temperature')) : null; if (t != null) return t; }
      return l.mal != null ? Number(l.mal) : 22;
    }

    /** Effekt siste 6 timer i 18 bøtter à 20 min (uregulert + styrt, kW) */
    _effekt6() {
      const c = this.config, end = this.now(), start = new Date(end - 6 * 3600e3);
      const ids = [c.uregulert, c.styrt];
      const key = `kd-klima-eff6|${ids.join(',')}|${Math.floor(end / 120e3)}`;
      return this.cached(key, 120e3, () => this.ws({ type: 'history/history_during_period', start_time: start.toISOString(), end_time: end.toISOString(), entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false })
        .then((r) => {
          const bucket = (id) => {
            const pts = ((r && r[id]) || []).map((p) => [(p.lu || p.lc) * 1000, parseFloat(p.s)]).filter((p) => !isNaN(p[1])).sort((x, y) => x[0] - y[0]);
            const out = []; let last = pts.length ? pts[0][1] : 0, j = 0;
            for (let i = 0; i < 18; i++) {
              const b0 = start.getTime() + i * 1200e3, b1 = b0 + 1200e3; let sum = 0, n = 0;
              while (j < pts.length && pts[j][0] < b0) last = pts[j++][1];
              let k = j; while (k < pts.length && pts[k][0] < b1) { sum += pts[k][1]; n++; last = pts[k][1]; k++; }
              out.push(n ? sum / n : last);
            }
            return out;
          };
          return { u: bucket(c.uregulert), s: bucket(c.styrt) };
        }), null);
    }

    /* ---------- faner: ekstrakort (designets extraVals) ---------- */
    extras(tab) {
      const c = this.config;
      const out = [];
      if (tab === 'ov') {
        if (this.st(c.bereder)) out.push(this._vvbCard());
        const auto = this.isOn('switch.ki_helg_auto');
        out.push(this.card('luggage', 'Bortemodus', auto ? 'slår seg på automatisk' : 'bare manuelt', { stats: [
          [`${nfk(this.n('number.ki_helg_auto_timer'))} t`, 'før auto'], [`${nfk(this.n('number.ki_temp_helg'))}°`, 'panelovn'],
          [`${nfk(this.n('number.ki_temp_helg_gulvvarme'))}°`, 'gulv'], [`${nfk(this.n('number.ki_temp_helg_bad'))}°`, 'bad']] }));
      }
      if (tab === 'en') {
        const e6 = this._effekt6();
        const u = this.n(c.uregulert), st = this.n(c.styrt);
        const vals = e6 ? e6.u.map((x, i) => ((x || 0) + (e6.s[i] || 0)) / 1000) : [];
        const top = Math.max(2.7, ...vals);
        out.push(this.card('ssid_chart', 'Effekt siste 6 timer', 'uregulert mot styrt', {
          bars: vals.map((v, i) => ({ flex: 1, height: `${Math.max(3, v / top * 100)}%`, borderRadius: 3, background: (e6.s[i] || 0) >= 50 ? A : al(A, 0.5) })),
          note: `Oransje = styrt varme. Nå ${nf((u || 0) / 1000)} + ${nf((st || 0) / 1000)} kW.` }));
        out.push(this.card('rule', 'Grenser', '', { rows: [
          ['Absolutt timegrense', { v: this.nv('number.ki_maks_time_kwh', 2, ' kWh'), pill: 1, go: ['moreId', 'number.ki_maks_time_kwh'] }],
          ['Ønsket trinn: snitt under', { v: this.nv('number.ki_mal_trinn_kw', 1, ' kW'), pill: 1, go: ['moreId', 'number.ki_mal_trinn_kw'] }],
          ['Reserve mot neste trinn', { v: this.nv('number.ki_reserve_topp_kwh', 2, ' kWh'), pill: 1, go: ['moreId', 'number.ki_reserve_topp_kwh'] }],
          ['Laveste timegrense', { v: this.nv('number.ki_min_time_kwh', 1, ' kWh'), pill: 1, go: ['moreId', 'number.ki_min_time_kwh'] }],
          ['Reserve uregulert', { v: this.nv('number.ki_reserve_uregulert_kwh', 2, ' kWh'), pill: 1, go: ['moreId', 'number.ki_reserve_uregulert_kwh'] }],
          ['Maks senking gulvvarme', { v: this.nv('number.ki_shed_gulv_maks', 1, ' °C'), pill: 1, go: ['moreId', 'number.ki_shed_gulv_maks'] }],
          ['Maks senking panelovn', { v: this.nv('number.ki_shed_panel_maks', 1, ' °C'), pill: 1, go: ['moreId', 'number.ki_shed_panel_maks'] }],
          ['Komfortvekt', { v: this.nv('number.ki_komfort_vekt', 0), pill: 1, go: ['moreId', 'number.ki_komfort_vekt'] }]] }));
      }
      if (tab === 'vb' && this.state.water === 'bad') {
        const H = (k, d) => this.at(c.hanklevarmer, k, d);
        const hb = H('bryter', '');
        if (hb) {
          const pa = this.v(hb) === 'on', styr = this.isOn('switch.ki_styr_hanklevarmer');
          const ew = num(H('effekt_w'));
          out.push(this.card('dry_cleaning', 'Håndklevarmer', pa ? 'På' : 'Av', { rows: [
            [pa ? 'Varmer nå' : 'Står av', { dot: pa ? G : '#5d5c5a', sub: H('forklaring', ''), v: ew != null ? `${nf(ew, 0)} W` : '–' }],
            ['Bryteren nå', { sub: styr ? (H('i_vindu') ? 'I dusjvindu — styres av KI' : 'Manuell bruk slås av etter maks på-tid') : 'Slås på igjen automatisk', tog: hb, on: pa }],
            ['KI styrer håndklevarmeren', { sub: 'Av = står på konstant', tog: 'switch.ki_styr_hanklevarmer' }]] }));
          out.push(this.card('savings', 'KI sparer', `${nf(num(H('spart_kr_maned', 0)), 0)} kr denne måneden`, {
            stats: [[nf(num(H('spart_kwh_i_dag', 0))), 'kWh spart i dag'], [`${nf(num(H('spart_kr_maned', 0)), 0)} kr`, 'spart denne mnd'], [`${nf(num(H('spart_kr_ar', 0)), 0)} kr`, 'per år med dagens vinduer']],
            note: `Mot å la den stå på hele døgnet: ${nf(num(H('effekt_nominell_w', 46)), 0)} W × ${nf(24 - (num(H('pa_min_i_dag', 0)) || 0) / 60, 1)} t av i dag. Effekten læres fra målingen.` }));
          const ms = this.th('time.ki_hanklevarmer_morgen_start'), me = this.th('time.ki_hanklevarmer_morgen_slutt');
          const ks = this.th('time.ki_hanklevarmer_kveld_start'), ke = this.th('time.ki_hanklevarmer_kveld_slutt');
          const segs = [];
          if (ms != null && me != null) segs.push([ms, me, `Morgen ${this.ts('time.ki_hanklevarmer_morgen_start')}–${this.ts('time.ki_hanklevarmer_morgen_slutt')}`, G]);
          if (ks != null && ke != null) segs.push([ks, ke, `Kveld ${this.ts('time.ki_hanklevarmer_kveld_start')}–${this.ts('time.ki_hanklevarmer_kveld_slutt')}`, G]);
          out.push(this.card('shower', 'Dusjvinduer', `${this.tm('time.ki_hanklevarmer_morgen_start')}–${this.tm('time.ki_hanklevarmer_morgen_slutt')} · ${this.tm('time.ki_hanklevarmer_kveld_start')}–${this.tm('time.ki_hanklevarmer_kveld_slutt')}`, { lines: [['Håndklevarmer', segs]] }));
        }
        const bad = this.zones().find((l) => /bad/i.test(`${l.key} ${l.rom || ''}`) && l.type === 'gulv') || this.zones().find((l) => /bad/i.test(`${l.key} ${l.rom || ''}`));
        if (bad) {
          const [k, sub] = split(bad.forklaring);
          const h = HANDLING[bad.venter ? 'venter' : bad.handling] || ['', '#5d5c5a'];
          const w = this.powerW(bad);
          out.push(this.card(bad.type === 'gulv' ? 'floor' : 'heat', bad.navn, `${bad.naa != null ? nf(bad.naa, 1) : '–'}° · mål ${nfk(bad.mal)}°`, { rows: [[k || h[0], { dot: h[1], sub, v: w != null ? `${nf(w, 0)} W` : `${nf(bad.effekt || 0)} kW` }]] }));
        }
      }
      if (tab === 'ta') {
        const L = this.laster();
        out.push(this.card('checklist', 'Vurdering per sone', 'sortert som motoren prioriterer', { rows: L.map((l) => {
          const h = HANDLING[l.venter ? 'venter' : l.handling] || [l.handling || '–', '#a9a7a2'];
          const grey = h[1] === '#a9a7a2';
          return [l.navn, { dot: grey ? '#5d5c5a' : h[1], chip: [h[0], h[1]], sub: l.forklaring || '', v: `${nf(l.effekt || 0)} kW` }];
        }) }));
        const tau = this.at(c.tidskonstanter, 'soner', {}) || {};
        if (Object.keys(tau).length) out.push(this.card('timer', 'Innlærte tidskonstanter', 'treghet · oppvarming', { rows: Object.entries(tau).map(([navn, v]) => [navn, { sub: `${v.malinger || 0} målinger`, v: `${v.tau_timer != null ? nf(v.tau_timer, 1) : '–'} t · ${v.grader_per_time != null ? nf(v.grader_per_time, 1) : '–'} °C/t` }]),
          note: 'Tidskonstanten er hvor lenge rommet holder på overtemperaturen. Lang konstant betyr at nattsenking sjelden lønner seg.' }));
      }
      if (tab === 'op') {
        const regler = this.at(c.lys, 'regler', []) || [];
        if (regler.length) out.push(this.card('lightbulb', 'Lys', `${nf(num(this.at(c.lys, 'spart_kr_maned', 0)), 0)} kr spart denne måneden`, { rows: regler.map((r) => {
          const demp = r.type === 'demp';
          return [`${demp ? 'Natt' : 'Glemt'} · ${r.navn || r.key}`, { chip: demp ? ['nattdemping', '#a9a7a2'] : ['glemt lys', G], sub: r.tekst || '', tog: `switch.ki_lys_${r.key}`, on: this.st(`switch.ki_lys_${r.key}`) ? undefined : !!r.aktiv }];
        }) }));
        out.push(this.card('notifications', 'Varslinger', '', { rows: [
          ['Effektgrense', { sub: 'Når en time ender over grensen', tog: 'switch.ki_varsel_effekt' }], ['Helg', { sub: 'Fredags- og søndagsspørsmål', tog: 'switch.ki_varsel_helg' }],
          ['Hjemkomst', { sub: 'Når oppvarming starter', tog: 'switch.ki_varsel_hjemkomst' }], ['Sommermodus', { sub: 'Når den slås av/på automatisk', tog: 'switch.ki_varsel_sommer' }],
          ['Varmtvann', { sub: 'Feil og forfalt legionella varsles alltid', tog: 'switch.ki_varsel_vvb' }], ['Håndklevarmer', { sub: 'Sikkerhetsavstenging', tog: 'switch.ki_varsel_hanklevarmer' }]] }));
        const pers = (this.sa('personer', []) || []).filter((p) => p && p.type !== 'voksen');
        const span = (a0, b0, t, col) => (a0 == null || b0 == null ? [] : b0 >= a0 ? [[a0, b0, t, col]] : [[a0, 24, t, col], [0, b0, '', col]]);
        const tl = [['Huset', span(this.th('time.ki_tid_dag_start'), this.th('time.ki_tid_natt_start'), `Dag ${this.tm('time.ki_tid_dag_start')}–${this.tm('time.ki_tid_natt_start')}`, G)]];
        pers.forEach((p) => {
          const k = p.key, fra = p.type === 'barn' ? `time.ki_${k}_dag` : `time.ki_${k}_vekking`, til = `time.ki_${k}_natt`;
          tl.push([p.navn, span(this.th(fra), this.th(til), `Våken ${this.tm(fra)}–${this.tm(til)}`, p.type === 'barn' ? PURPLE : B)]);
        });
        const sr = this.th('time.ki_stue_reduksjon_fra');
        if (sr != null) tl.push(['Stue', [[sr, 24, '', A]]]);
        out.push(this.card('schedule', 'Tider', 'døgnet i huset', { lines: tl }));
        const t = (id) => ({ v: this.tm(id), pill: 1, go: ['moreId', id] });
        out.push(this.card('wb_twilight', 'Dag og natt', `${this.tm('time.ki_tid_dag_start')}–${this.tm('time.ki_tid_natt_start')}`, { rows: [['Dag starter', t('time.ki_tid_dag_start')], ['Natt starter', t('time.ki_tid_natt_start')], ['Nattsenk kun under', { v: this.nv('number.ki_natt_senk_ute_grense', 0, ' °C'), pill: 1, go: ['moreId', 'number.ki_natt_senk_ute_grense'] }]] }));
        pers.forEach((p) => {
          const k = p.key;
          if (p.type === 'barn') out.push(this.card('person', p.navn, `${this.tm(`time.ki_${k}_dag`)}–${this.tm(`time.ki_${k}_natt`)}`, { rows: [['Opp', t(`time.ki_${k}_dag`)], ['Legger seg', t(`time.ki_${k}_natt`)], ['Borte fra', t(`time.ki_${k}_borte_fra`)], ['Hjemme igjen', t(`time.ki_${k}_borte_til`)]] }));
          else out.push(this.card('person', p.navn, `${this.tm(`time.ki_${k}_vekking`)}–${this.tm(`time.ki_${k}_natt`)}`, { rows: [['Vekking', t(`time.ki_${k}_vekking`)], ['Vekking helg', t(`time.ki_${k}_vekking_helg`)], ['Legger seg', t(`time.ki_${k}_natt`)]] }));
        });
        const nr = (id, d, u) => ({ v: this.nv(id, d, u), pill: 1, go: ['moreId', id] });
        out.push(this.card('weekend', 'Stue og vindu', '', { rows: [['Stue reduksjon fra', t('time.ki_stue_reduksjon_fra')], ['Stue reduksjon', nr('number.ki_stue_reduksjon', 1, ' °C')], ['Vindu: vent før senking', nr('number.ki_vindu_forsinkelse_min', 0, ' min')], ['Vindu: hold temperatur', nr('number.ki_vindu_temp', 1, ' °C')]] }));
      }
      if (tab === 'av') {
        const nr = (id, d, u) => ({ v: this.nv(id, d, u), pill: 1, go: ['moreId', id] });
        out.push(this.card('palette', 'Terskler for fargesonene', 'prosent av tillatt effekt', { rows: [['Gul fra', { dot: A, ...nr('number.ki_sone_gul', 0, ' %') }], ['Oransje fra', { dot: ORANGE, ...nr('number.ki_sone_oransje', 0, ' %') }], ['Rød fra', { dot: R, ...nr('number.ki_sone_rod', 0, ' %') }]],
          note: 'Motoren senker først når den ikke får plass i budsjettet. Fargene styrer varsling og hvor tidlig varmtvannet må vike, ikke selve utkoblingen.' }));
        const pl = this.st(c.prognoselaering), pa = (pl && pl.attributes) || {};
        const pst = pl ? ({ laerer: 'lærer', aktiv: 'adaptiv margin aktiv', usikkert_grunnlag: 'usikkert grunnlag', av: 'fast reserve' }[pl.state] || pl.state) : 'ingen data';
        const t = (a0, b0) => `${this.tm(a0)}–${this.tm(b0)}`;
        out.push(this.card('query_stats', 'Prognose og reserver', pst, {
          stats: [[nf(num(pa.forventet_slutt_kwh)), 'forventet (kWh)'], [`+${nf(num(pa.kwh))}`, 'usikkerhet (kWh)'], [nf(num(pa.strategisk_reserve_kwh)), 'strategisk reserve']],
          rows: [['Fast reserve (fallback)', nr('number.ki_reserve_uregulert_kwh', 2, ' kWh')], ['Margin minimum', nr('number.ki_prognose_margin_min', 2, ' kWh')], ['Margin maksimum', nr('number.ki_prognose_margin_maks', 2, ' kWh')],
            ['Minste grunnlag', nr('number.ki_prognose_min_obs', 0, ' obs')], ['Reserve frokost', nr('number.ki_reserve_frokost_kwh', 1, ' kW')], ['Reserve middag', nr('number.ki_reserve_middag_kwh', 1, ' kW')],
            ['Frokost', { v: t('time.ki_frokost_start', 'time.ki_frokost_slutt'), pill: 1, go: ['moreId', 'time.ki_frokost_start'] }], ['Middag', { v: t('time.ki_middag_start', 'time.ki_middag_slutt'), pill: 1, go: ['moreId', 'time.ki_middag_start'] }]],
          note: pa.grunn || '' }));
        out.push(this.card('event_repeat', 'Moduser og unntak', '', { rows: [['Helgetemperatur', nr('number.ki_temp_helg', 1, ' °C')], ['Helg gulvvarme', nr('number.ki_temp_helg_gulvvarme', 1, ' °C')], ['Helg bad', nr('number.ki_temp_helg_bad', 1, ' °C')],
          ['Sommertemperatur', nr('number.ki_temp_sommer', 1, ' °C')], ['Sommer fra måned', nr('number.ki_sommer_start_maned', 0)], ['Sommer til måned', nr('number.ki_sommer_slutt_maned', 0)],
          ['Sommer når ute over', nr('number.ki_sommer_ute_grense', 0, ' °C')], ['Helg auto etter', nr('number.ki_helg_auto_timer', 0, ' t borte')]] }));
        const th = (id) => this.th(id);
        const one = (id, lbl, col) => { const h = th(id); return h == null ? [] : [[h, Math.min(24, h + 1), lbl, col]]; };
        const sq = th('time.ki_helg_sporsmal_tid'), fr = th('time.ki_helg_frist_tid'), hj = th('time.ki_hjemkomst_tid');
        const sun = [];
        if (sq != null && fr != null) sun.push([sq, fr, 'Svarfrist', A]);
        if (fr != null && hj != null) sun.push([fr, hj, 'Oppvarm.', G]);
        const venter = this.isOn('switch.ki_helg_venter_svar');
        out.push(this.card('forum', 'Helgevarsler', 'torsdag, fredag og søndag', {
          lines: [['Torsdag', one('time.ki_helg_varsel_tid_torsdag', `Spør ${this.tm('time.ki_helg_varsel_tid_torsdag')}`, B)], ['Fredag', one('time.ki_helg_varsel_tid', `Spør ${this.tm('time.ki_helg_varsel_tid')}`, B)], ['Søndag', sun]],
          rows: [['Spør torsdag', { v: this.tm('time.ki_helg_varsel_tid_torsdag'), tog: 'switch.ki_helg_spor_torsdag' }], ['Spør fredag', { v: this.tm('time.ki_helg_varsel_tid'), tog: 'switch.ki_helg_spor_fredag' }],
            ['Forventet hjemkomst', { v: this.tm('time.ki_hjemkomst_tid'), pill: 1, go: ['moreId', 'time.ki_hjemkomst_tid'] }], ['Venter på svar', { dot: venter ? A : '#5d5c5a', v: venter ? 'Ja' : 'Nei' }]] }));
      }
      return out.join('');
    }

    _vvbCard() {
      const c = this.config, V = (k, d) => this.at(c.bereder, k, d);
      const varmer = !!V('varmer'), bryterPa = !!V('bryter_pa');
      const [meta, sub] = split(this.v(c.vvb_forklaring) || V('forklaring', ''));
      const ew = num(V('effekt_w'));
      const leg = this._leg();
      return this.card('water_heater', 'Varmtvann', meta || this.v(c.bereder), { rows: [
        [!V('bryter') ? 'Ikke satt opp' : varmer ? 'Varmer nå' : bryterPa ? 'Bryter på, trekker ikke effekt' : 'Står stille', { dot: varmer ? G : '#5d5c5a', sub, v: ew != null ? `${nf(ew, 0)} W` : '–', go: V('bryter') ? ['moreId', V('bryter')] : null }],
        [`Legionella: ${leg.kort}`, { dot: leg.col, sub: `Sist sikret ${this.dato(V('siste_syklus'))} · frist ${this.dag(V('neste_frist'))}`, go: ['tab', 'vb'] }]] });
    }
    _leg() {
      const V = (k, d) => this.at(this.config.bereder, k, d);
      if (!V('legionella_aktiv', true)) return { kort: 'Av', lang: 'Legionellasikring av', col: '#8e8d89', icon: 'shield' };
      if (V('forfalt')) return { kort: 'Forfalt', lang: 'Legionella forfalt', col: R, icon: 'gpp_bad' };
      if (V('sikret')) return { kort: 'Sikret', lang: 'Legionella sikret', col: G, icon: 'verified_user' };
      return { kort: 'Bør kjøres', lang: 'Legionella bør kjøres', col: A, icon: 'shield' };
    }

    /* ---------- render ---------- */
    body() {
      const s = this.state, c = this.config;
      const tabK = s.tab || (T.some(([k]) => k === c.fane) ? c.fane : 'ov');
      const st = this.st(c.status);
      const now = num(this.sa('forventet_effekt_kw')), lim = num(this.sa('tillatt_effekt_kw'));
      const frac = now != null && lim ? now / lim : 0;
      const col = (st && SONE_FARGE[st.state]) || (frac > 0.97 ? R : frac > 0.75 ? A : G);
      const away = this.isOn('switch.ki_helgemodus');
      const statusT = st ? (SONE_TEKST[st.state] || st.state) : 'Venter på motoren';
      const mins = num(this.sa('minutter_igjen'));

      const glow = { position: 'absolute', left: '50%', top: -40, width: 320, height: 240, marginLeft: -160, borderRadius: '50%', background: `radial-gradient(closest-side, ${al(col, 0.2)}, transparent)`, pointerEvents: 'none' };
      const arcTrack = { position: 'absolute', left: 0, top: 0, width: 250, height: 250, borderRadius: '50%', background: 'conic-gradient(from -90deg, #2a2a2d 0 180deg, transparent 180deg)', WebkitMask: 'radial-gradient(circle, transparent 98px, #000 99px)', mask: 'radial-gradient(circle, transparent 98px, #000 99px)' };
      const arcFill = { position: 'absolute', left: 0, top: 0, width: 250, height: 250, borderRadius: '50%', background: `conic-gradient(from -90deg, ${col} 0 ${Math.max(4, Math.min(1, frac) * 180)}deg, transparent 0)`, WebkitMask: 'radial-gradient(circle, transparent 98px, #000 99px)', mask: 'radial-gradient(circle, transparent 98px, #000 99px)', filter: `drop-shadow(0 0 8px ${al(col, 0.6)})` };
      const statusTag = { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: col };
      const heroStats = [[nf(num(this.sa('igjen_kwh'))), 'kWh igjen'], [nf(num(this.sa('ledig_kw'))), 'kW ledig'], [mins != null ? `${Math.round(mins)} min` : '–', 'igjen av timen']];
      const awayPill = { position: 'relative', height: 36, padding: '0 14px', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', background: away ? al(B, 0.22) : '#262629', color: away ? '#e6eef8' : '#c9c7c2', transition: 'background .3s' };

      // Moduser (bare de som finnes). Ungdom får egen feriebryter fra KI Energi.
      const pers = this.sa('personer', []) || [];
      const short = (n) => (String(n).length > 6 ? String(n).slice(0, 3) + '.' : n);
      const modes = [['switch.ki_helgemodus', 'luggage', 'Borte'], ['binary_sensor.ki_alle_borte', 'logout', 'Alle borte'], ['switch.ki_hjemkomst_aktiv', 'home', 'Hjemkomst'], ['switch.ki_sommermodus', 'light_mode', 'Sommer'],
        ...pers.filter((p) => p && p.type === 'ungdom').map((p) => [`switch.ki_${p.key}_ferie`, 'school', `${short(p.navn)} ferie`])].filter(([id]) => this.st(id));
      const modesHtml = modes.map(([id, icon, label]) => {
        const on = this.isOn(id);
        const bubble = { width: 58, height: 58, borderRadius: 29, display: 'grid', placeItems: 'center', background: on ? PINK : '#1c1c1f', color: on ? '#2a1720' : '#c9c7c2', boxShadow: on ? '0 6px 18px rgba(240,140,190,0.3)' : 'inset 0 0 0 1px rgba(255,255,255,0.05)', transform: on ? 'scale(1.06)' : 'scale(1)', transition: 'transform .35s cubic-bezier(.34,1.8,.64,1), background .25s' };
        const iconStyle = { fontSize: 24, fontVariationSettings: `'FILL' ${on ? 1 : 0}` };
        const labelStyle = { fontSize: 11, fontWeight: 500, color: on ? '#f2f1ee' : '#8e8d89', whiteSpace: 'nowrap' };
        return `<button data-on-click="mode" data-arg="${id}" style="flex:none;display:flex;flex-direction:column;align-items:center;gap:6px;width:66px">
        <span style="${S(bubble)}"><span class="ms" style="${S(iconStyle)}">${E(icon)}</span></span>
        <span style="${S(labelStyle)}">${E(label)}</span>
      </button>`;
      }).join('');

      const tabs = T.map(([k, label, icon]) => {
        const act = tabK === k;
        const st2 = { height: 54, borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, background: act ? PINK : 'transparent', color: act ? '#2a1720' : '#a9a7a2', transition: 'background .25s' };
        return `<button data-on-click="tab" data-arg="${k}" style="${S(st2)}"><span class="ms" style="${S({ fontSize: 20, fontVariationSettings: `'FILL' ${act ? 1 : 0}` })}">${E(icon)}</span><span style="font-size:9.5px;font-weight:500;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis">${E(label)}</span></button>`;
      }).join('');

      let main = '';
      if (tabK === 'ov') main = this._ov(lim);
      else if (tabK === 'so') main = this._so();
      else if (tabK === 'en') main = this._en();
      else if (tabK === 'vb') main = this._vb();
      else if (tabK === 'ta') main = this._ta();
      else if (tabK === 'op') main = this._op();

      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:16px">
  <header style="display:flex;align-items:center;gap:12px;padding:0 4px">
    <span style="width:40px;height:40px;border-radius:20px;background:#e9e8e4;color:#141416;display:grid;place-items:center;flex:none"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">thermostat</span></span>
    <div style="flex:1;font-size:26px;font-weight:500;letter-spacing:-0.02em">Klima</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section style="position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;padding:20px 16px 16px;border-radius:32px;background:#1c1c1f;overflow:hidden">
    <div style="${S(glow)}"></div>
    <div style="position:relative;width:250px;height:136px">
      <div style="position:absolute;inset:0;overflow:hidden"><div style="${S(arcTrack)}"></div><div style="${S(arcFill)}"></div></div>
      <div style="position:absolute;left:-20px;right:-20px;bottom:6px;display:flex;flex-direction:column;align-items:center;gap:0">
        <span style="${S(statusTag)}">${E(statusT)}</span>
        <span style="font-size:44px;font-weight:300;letter-spacing:-0.04em;line-height:1.05;font-variant-numeric:tabular-nums;white-space:nowrap">${E(nf(now))}<span style="font-size:15px;color:#8e8d89;letter-spacing:0"> kW</span></span>
        <span style="font-size:12px;color:#8e8d89;white-space:nowrap">av ${E(nf(lim))} kW tillatt</span>
      </div>
    </div>
    <div style="position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:100%">
      ${heroStats.map(([v, k]) => `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 4px;border-radius:18px;background:#262629"><span style="font-size:17px;font-weight:600;font-variant-numeric:tabular-nums">${E(v)}</span><span style="font-size:10px;color:#8e8d89">${E(k)}</span></div>`).join('')}
    </div>
    ${this.st('switch.ki_helgemodus') ? `<button data-on-click="toggleAway" style="${S(awayPill)}"><span class="ms" style="font-size:16px;font-variation-settings:'FILL' 1">${E(away ? 'luggage' : 'home')}</span>${E(away ? 'Borte · helgemodus' : 'Hjemme · normal komfort')}</button>` : ''}
  </section>

  <section data-hscroll="1" style="display:flex;gap:12px;overflow-x:auto;scrollbar-width:none;margin:0 calc(-1 * var(--kd-kant,10px));padding:2px var(--kd-kant,10px)">${modesHtml}</section>

  ${KD.segHTML('fane', T, tabK, 'tab', { pink: true, stack: true })}
  ${main}
  ${this.extras(tabK)}
</div>`;
    }

    /* ----- Oversikt ----- */
    _ov() {
      const c = this.config, N = (k, d) => this.at(c.nettleie, k, d);
      const grense = num(this.sa('grense_kwh'));
      const rows = (N('timer_siste_12', []) || []).map((t) => ({ start: t.start, kwh: num(t.kwh) }));
      const cur = num(this.sa('forbrukt_kwh'));
      if (cur != null) rows.push({ start: Math.floor(this.now() / 3600e3) * 3600, kwh: cur, naa: true });
      const H = rows.slice(-12);
      const L = grense || Math.max(0.5, ...H.map((r) => r.kwh || 0));
      const hist = H.map((r) => ({ flex: 1, height: Math.min(96, Math.max(3, (r.kwh || 0) / L * 88)), borderRadius: 6, background: r.naa ? G : (r.kwh || 0) > L ? R : '#3a3a3d' }));
      const labels = H.map((r) => pad(new Date(r.start * 1000).getHours()));
      const PA = (k) => { const v = num(this.at(c.prognose, k)); return v != null ? v : num(this.sa(k.replace('om_', 'prognose_').replace('_min_kw', '_kw'))); };
      const lim = num(this.sa('tillatt_effekt_kw')) || L;
      const fc = [['om_15_min_kw', '15 min'], ['om_30_min_kw', '30 min'], ['om_60_min_kw', '1 t'], ['om_120_min_kw', '2 t']].map(([k, lbl]) => [PA(k), lbl]);
      const peak = fc.reduce((m, x) => (x[0] != null && (m == null || x[0] > m[0]) ? x : m), null);
      const fMeta = !peak ? '–' : peak[0] <= lim ? 'ingen topp i sikte' : `topp om ${peak[1]}`;
      const bedL = this.laster().filter((l) => l.person && (l.person_type === 'barn' || l.person_type === 'ungdom')).sort((x, y) => String(x.person).localeCompare(String(y.person)));
      return `<section style="display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:28px;background:#1c1c1f">
      <div style="display:flex;justify-content:space-between"><span style="font-size:15px;font-weight:500">Siste 12 timer</span><span style="font-size:12px;color:#8e8d89">grense ${E(nf(grense))} kWh</span></div>
      <div style="position:relative;display:flex;align-items:flex-end;gap:4px;height:96px">
        <span style="position:absolute;left:0;right:0;bottom:88px;border-top:1px dashed #5d5c5a"></span>
        ${hist.map((b) => `<span style="${S(b)}"></span>`).join('')}
      </div>
      <div style="display:flex;gap:4px">${labels.map((x) => `<span style="flex:1;text-align:center;font-size:9px;color:#6d6c69;font-variant-numeric:tabular-nums">${E(x)}</span>`).join('')}</div>
    </section>
    <section style="display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:28px;background:#1c1c1f">
      <div style="display:flex;justify-content:space-between"><span style="font-size:15px;font-weight:500">Forventet effekt</span><span style="font-size:12px;color:#8e8d89">${E(fMeta)}</span></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
        ${fc.map(([v, k]) => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 4px;border-radius:18px;background:#262629">
            <span style="position:relative;width:8px;height:44px;border-radius:4px;background:#1c1c1f;overflow:hidden"><span style="${S({ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${Math.min(100, (v || 0) / lim * 100 + 6)}%`, background: v != null && v > lim ? R : G, borderRadius: 4 })}"></span></span>
            <span style="font-size:14px;font-weight:600;font-variant-numeric:tabular-nums">${E(v != null ? nf(v, 1) : '–')}</span>
            <span style="font-size:10px;color:#8e8d89">${E(k)}</span>
          </div>`).join('')}
      </div>
    </section>
    ${bedL.length ? `<section style="display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;justify-content:space-between;padding:0 6px"><span style="font-size:15px;font-weight:500">Leggetid</span><span style="font-size:12px;color:#8e8d89">trykk når noen legger seg</span></div>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
        ${bedL.map((l) => {
          const on = !!l.leggetid;
          const pill = { display: 'flex', alignItems: 'center', gap: 10, height: 62, padding: '0 12px 0 6px', borderRadius: 31, background: on ? PINK : '#1c1c1f', color: on ? '#2a1720' : '#f2f1ee', transition: 'background .25s, transform .2s' };
          const iconWrap = { width: 50, height: 50, borderRadius: 25, flex: 'none', display: 'grid', placeItems: 'center', background: on ? 'rgba(42,23,32,0.12)' : '#2a2a2d' };
          return `<button class="kd-kl-p" data-on-click="bed" data-arg="${KD.e(l.key)}" style="${S(pill)}">
            <span style="${S(iconWrap)}"><span class="ms" style="font-size:20px;font-variation-settings:'FILL' 1">bed</span></span>
            <span style="display:flex;flex-direction:column;text-align:left"><span style="font-size:14px;font-weight:500">${E(l.person)}</span><span style="font-size:11px;opacity:0.7">${E(on ? 'Nattsenking aktiv' : TYPE_NAVN[l.type] || l.navn)}</span></span>
          </button>`;
        }).join('')}
      </div>
    </section>` : ''}`;
    }

    /* ----- Soner ----- */
    _so() {
      const s = this.state, Z = this.zones();
      const z = Z.find((l) => l.key === s.zone);
      let detail = '';
      if (z) {
        const man = this.isMan(z), set = this._zoneSet(z), r = z.overstyrt ? this.remaining(z) : null;
        const ai = z.styr ? this.isOn(z.styr) : !man, w = this.sw(ai), dur = z.overstyrt ? (s.dur[z.key] || null) : null;
        const pending = s.set[z.key] != null && !man && !z.overstyrt;
        const iconWrap = { width: 48, height: 48, borderRadius: 24, flex: 'none', display: 'grid', placeItems: 'center', background: man ? '#2a2a2d' : G, color: man ? '#a9a7a2' : '#141416' };
        const sub = man ? (z.forklaring || '') : `${z.forklaring || ''} · nå ${z.naa != null ? nf(z.naa, 1) : '–'}°`;
        const setSub = z.overstyrt ? `overstyrt i ${r ? r.t : '–'}` : pending ? 'velg varighet for å overstyre' : man ? 'manuelt settpunkt' : `mål fra motoren ${nfk(z.mal)}°`;
        detail = `<section style="display:flex;flex-direction:column;gap:14px;padding:16px;border-radius:28px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.06)">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="${S(iconWrap)}"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">${E(this.zoneIcon(z))}</span></span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:16px;font-weight:600">${E(z.navn)}</span><span style="font-size:12px;color:#8e8d89;text-wrap:pretty">${E(sub)}</span></span>
          <button data-on-click="closeZone" style="width:36px;height:36px;border-radius:18px;background:#262629;display:grid;place-items:center;flex:none"><span class="ms" style="font-size:18px">close</span></button>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px;border-radius:30px;background:#262629">
          <button class="kd-kl-p2" data-on-click="step" data-arg="-1" style="width:48px;height:48px;border-radius:24px;background:#1c1c1f;display:grid;place-items:center"><span class="ms" style="font-size:22px">remove</span></button>
          <span style="display:flex;flex-direction:column;align-items:center"><span style="font-size:30px;font-weight:300;letter-spacing:-0.03em;font-variant-numeric:tabular-nums">${E(nf(set, 1))}°</span><span style="font-size:11px;color:#8e8d89">${E(setSub)}</span></span>
          <button class="kd-kl-p2" data-on-click="step" data-arg="1" style="width:48px;height:48px;border-radius:24px;background:#1c1c1f;display:grid;place-items:center"><span class="ms" style="font-size:22px">add</span></button>
        </div>
        <div style="display:flex;gap:6px">
          ${['1 t', '2 t', '6 t'].map((t) => `<button data-on-click="dur" data-arg="${t}" style="${S({ flex: 1, height: 38, borderRadius: 19, fontSize: 13, fontWeight: 500, background: dur === t ? PINK : '#262629', color: dur === t ? '#2a1720' : '#c9c7c2' })}">${E(t)}</button>`).join('')}
        </div>
        ${z.styr ? `<button data-on-click="togRow" data-arg="${KD.e(z.styr)}" style="display:flex;align-items:center;gap:12px;text-align:left">
          <span class="ms" style="font-size:20px;color:#a9a7a2">smart_toy</span>
          <span style="flex:1;display:flex;flex-direction:column"><span style="font-size:14px;font-weight:500">KI styrer sonen</span><span style="font-size:11px;color:#8e8d89">Av = motoren rører den ikke</span></span>
          <span style="${S(w.track)}"><span style="${S(w.knob)}"></span></span>
        </button>` : ''}
      </section>`;
      }
      return `${detail}
    <section style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
      ${Z.map((l) => {
        const act = s.zone === l.key, man = this.isMan(l), over = l.overstyrt ? (this.remaining(l) || { t: 'Manuell' }).t : null;
        const goalV = s.set[l.key] != null ? s.set[l.key] : l.overstyrt && l.overstyrt_temp != null ? Number(l.overstyrt_temp) : l.mal;
        const tagT = over || (man ? 'Manuell' : (l.styr && this.st(l.styr) ? this.isOn(l.styr) : true) ? 'KI' : 'Av');
        const card = { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 26, background: act ? al(G, 0.12) : '#1c1c1f', boxShadow: act ? `inset 0 0 0 1px ${al(G, 0.45)}` : 'none', transition: 'background .25s, transform .2s' };
        const iconWrap = { width: 38, height: 38, borderRadius: 19, display: 'grid', placeItems: 'center', background: man ? '#2a2a2d' : al(G, 0.2), color: man ? '#8e8d89' : G };
        const tag = { fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 8, background: over ? al(P, 0.2) : '#262629', color: over ? P : '#a9a7a2' };
        return `<button class="kd-kl-p" data-on-click="pickZone" data-arg="${KD.e(l.key)}" style="${S(card)}">
          <span style="display:flex;justify-content:space-between;align-items:center;width:100%">
            <span style="${S(iconWrap)}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">${E(this.zoneIcon(l))}</span></span>
            <span style="${S(tag)}">${E(tagT)}</span>
          </span>
          <span style="font-size:26px;font-weight:300;letter-spacing:-0.03em;font-variant-numeric:tabular-nums">${E(l.naa != null ? nf(l.naa, 1) : '–')}°</span>
          <span style="display:flex;flex-direction:column;gap:1px;text-align:left;min-width:0;width:100%"><span style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(l.navn)}</span><span style="font-size:11px;color:#8e8d89">${E(man ? 'Manuell' : `mål ${nfk(goalV)}°`)}</span></span>
        </button>`;
      }).join('')}
    </section>`;
    }

    /* ----- Energi ----- */
    _en() {
      const c = this.config, N = (k, d) => this.at(c.nettleie, k, d);
      const grense = num(this.sa('grense_kwh'));
      const til = num(N('registrert_trinn_til'));
      const tid = N('dagens_maks_time');
      const topp = (N('topp_tre', []) || []).map((t) => num(t.kwh)).filter((v) => v != null);
      const hvorfor = N('hvorfor', this.sa('grense_grunn', '')) || '';
      const note = `${hvorfor}${topp.length ? `${hvorfor ? ' ' : ''}Topp tre denne måneden: ${topp.map((v) => nf(v)).join(' / ')} kWh.` : ''}`;
      const enStats = [[nf(num(N('dagens_maks_kwh'))), `døgnmaks${tid != null ? ` kl. ${pad(tid)}` : ''}`], [nf(num(N('registrert_snitt'))), 'snitt topp 3'], [nf(num(N('forventet_time_kwh'))), 'forventet nå']];
      const sp = this.st(c.sparing), poster = (sp && sp.attributes.poster) || {};
      const PN = [['motor', 'thermostat', 'Varmestyring'], ['bereder', 'water_heater', 'Bereder'], ['hanklevarmer', 'dry_cleaning', 'Håndklevarmer'], ['gardiner', 'curtains', 'Gardiner'], ['lys', 'lightbulb', 'Lys']].filter(([k]) => poster[k]);
      const maxKr = Math.max(0.0001, ...PN.map(([k]) => num(poster[k].kr) || 0));
      const month = MND_LANG[this.now().getMonth()];
      const flyttet = num(this.at(c.besparelse, 'flyttet_kwh'));
      const monthStats = [[this.nv('number.ki_stat_unngatte_topper', 0), 'unngåtte topper'], [this.nv('number.ki_stat_shed_hendelser', 0), 'utkoblinger'], [this.nv('number.ki_stat_flyttet_kwh', 2), 'kWh flyttet'],
        [this.nv(c.besparelse, 0), 'kr spart (est.)'], [nf(num(this.at(c.besparelse, 'spart_nettleie_kr')), 0), 'kr nettleie'], [this.nv('number.ki_stat_komfortavvik', 1), '°Ct komfortavvik']];
      return `<section style="display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:28px;background:#1c1c1f">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-size:15px;font-weight:500">Dynamisk grense</span><span style="font-size:12px;color:#8e8d89">${E(til != null ? `neste trinn ved ${nfk(til)} kW` : '–')}</span></div>
      <div style="display:flex;align-items:baseline;gap:6px"><span style="font-size:40px;font-weight:300;letter-spacing:-0.04em">${E(nf(grense))}</span><span style="font-size:14px;color:#8e8d89">kWh denne timen</span></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
        ${enStats.map(([v, k]) => `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 4px;border-radius:18px;background:#262629"><span style="font-size:16px;font-weight:600;font-variant-numeric:tabular-nums">${E(v)}</span><span style="font-size:10px;color:#8e8d89;text-align:center">${E(k)}</span></div>`).join('')}
      </div>
      <div style="font-size:12px;color:#8e8d89;text-wrap:pretty">${E(note)}</div>
    </section>
    ${sp ? `<section style="display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:28px;background:#1c1c1f">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-size:15px;font-weight:500">KI sparer</span><span style="font-size:12px;color:#8e8d89">${E(flyttet != null ? `${nf(flyttet, 1)} kWh flyttet` : '')}</span></div>
      <div style="display:flex;align-items:baseline;gap:6px"><span style="font-size:40px;font-weight:300;letter-spacing:-0.04em">${E(nf(num(sp.attributes.total_kr_maned != null ? sp.attributes.total_kr_maned : sp.state), 0))}</span><span style="font-size:14px;color:#8e8d89">kr spart i ${E(month)}</span></div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${PN.map(([k, icon, label]) => { const v = num(poster[k].kr) || 0; return `<div style="display:flex;flex-direction:column;gap:5px">
            <div style="display:flex;justify-content:space-between;font-size:13px"><span style="display:flex;align-items:center;gap:8px"><span class="ms" style="font-size:17px;color:#a9a7a2">${E(icon)}</span>${E(label)}</span><span style="font-weight:600;font-variant-numeric:tabular-nums">${E(`${nf(v, 0)} kr`)}</span></div>
            <div style="height:8px;border-radius:4px;background:#262629;overflow:hidden"><div style="${S({ width: `${v / maxKr * 100}%`, height: '100%', borderRadius: 4, background: G })}"></div></div>
          </div>`; }).join('')}
      </div>
    </section>` : ''}
    <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
      ${monthStats.map(([v, k]) => `<div style="display:flex;flex-direction:column;gap:2px;padding:12px;border-radius:20px;background:#1c1c1f"><span style="font-size:18px;font-weight:600;font-variant-numeric:tabular-nums">${E(v)}</span><span style="font-size:10px;color:#8e8d89">${E(k)}</span></div>`).join('')}
    </section>`;
    }

    /* ----- Vann og bad ----- */
    _vb() {
      const s = this.state, c = this.config, V = (k, d) => this.at(c.bereder, k, d);
      const seg = [['ber', 'Bereder', 'water_heater'], ['bad', 'Bad', 'bathtub']].map(([k, label, icon]) => `<button data-on-click="water" data-arg="${k}" style="${S({ height: 48, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, fontWeight: 500, background: s.water === k ? PINK : 'transparent', color: s.water === k ? '#2a1720' : '#a9a7a2', transition: 'background .25s' })}"><span class="ms" style="font-size:19px">${E(icon)}</span>${E(label)}</button>`).join('');
      let ber = '';
      if (s.water === 'ber') {
        const leg = this._leg();
        const dager = this.n('sensor.ki_vvb_dager_siden_siste_syklus', num(V('dager_siden_syklus')));
        const intervall = num(V('intervall_dager', 3)) || 3;
        const legRing = { position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(${leg.col} 0 ${Math.min(1, (dager || 0) / intervall) * 360}deg, #2a2a2d 0)`, WebkitMask: 'radial-gradient(circle, transparent 37px, #000 38px)', mask: 'radial-gradient(circle, transparent 37px, #000 38px)' };
        const varmer = !!V('varmer'), bryterPa = !!V('bryter_pa');
        const frist = V('neste_frist');
        const forkl = this.v(c.vvb_forklaring) || V('forklaring', '');
        const title = !V('bryter') && !V('effekt_sensor') ? 'Bereder ikke satt opp' : varmer ? 'Bereder varmer nå' : bryterPa ? 'Bryter på, trekker ikke effekt' : 'Bereder står stille';
        const doegn = this.at(c.billige_timer, 'doegn', []) || [];
        const pr = doegn.map((x) => num(x.pris)).filter((v) => v != null);
        const maxP = pr.length ? Math.max(...pr) : 0;
        const boost = this.isOn('binary_sensor.ki_vvb_boost_aktiv');
        const bars = doegn.map((x, i) => ({ flex: 1, height: `${maxP > 0 && num(x.pris) != null ? num(x.pris) / (maxP * 0.72 / 0.7) * 100 : 55}%`, borderRadius: 3, background: x.valgt || (boost && i === 0) ? G : '#3a3a3d', transition: 'background .3s' }));
        const lbl = [0, 6, 12, 18, 23].map((i) => (doegn[i] ? pad(doegn[i].t) : ''));
        const bryter = V('bryter', '');
        const btn = (icon, label, handler, on) => `<button class="kd-kl-p" data-on-click="${handler}" style="${S({ height: 52, borderRadius: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 600, background: on ? PINK : '#1c1c1f', color: on ? '#2a1720' : '#f2f1ee', transition: 'background .25s, transform .2s' })}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">${E(icon)}</span>${E(label)}</button>`;
        ber = `<section style="display:flex;align-items:center;gap:16px;padding:16px;border-radius:28px;background:#1c1c1f">
      <div style="position:relative;width:96px;height:96px;flex:none">
        <div style="${S(legRing)}"></div>
        <div style="position:absolute;inset:10px;border-radius:50%;background:#1c1c1f;display:flex;flex-direction:column;align-items:center;justify-content:center"><span class="ms" style="${S({ fontSize: 22, color: leg.col, fontVariationSettings: "'FILL' 1" })}">${E(leg.icon)}</span><span style="font-size:10px;color:#8e8d89">${E(`${dager != null ? nf(dager, 1) : '–'} / ${nfk(intervall)} d`)}</span></div>
      </div>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">
        <span style="${S({ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: leg.col })}">${E(leg.lang)}</span>
        <span style="font-size:16px;font-weight:600">${E(title)}</span>
        <span style="font-size:12px;color:#8e8d89;text-wrap:pretty">${E(`${forkl}${frist ? ` Frist ${this.dag(frist)} ${KD.hm(frist)}.` : ''}`.trim())}</span>
      </div>
    </section>
    ${doegn.length ? `<section style="display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:28px;background:#1c1c1f">
      <div style="display:flex;justify-content:space-between"><span style="font-size:15px;font-weight:500">Prisstyring</span><span style="font-size:12px;color:#8e8d89">grønn = bereder kjører</span></div>
      <div style="display:flex;align-items:flex-end;gap:2px;height:70px">${bars.map((b) => `<span style="${S(b)}"></span>`).join('')}</div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:#6d6c69;font-variant-numeric:tabular-nums">${lbl.map((x) => `<span>${x}</span>`).join('')}</div>
    </section>` : ''}
    <section style="display:flex;flex-direction:column;gap:8px">
      ${bryter ? this.pillRow(bryter, 'power', 'Bryteren nå', `${bryterPa ? 'På' : 'Av'} · vindu ${V('vindu', '–')}`, A, bryterPa, 'hkSwitch') : ''}
      ${this.pillRow('switch.ki_vvb_prisstyring', 'savings', 'VVB prisstyring', 'Velger de billigste timene', G)}
      ${this.pillRow('switch.ki_vvb_legionella_aktiv', 'coronavirus', 'Legionellasikring', 'Kan ikke blokkeres av sparing', G)}
    </section>
    ${bryter ? `<section style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">${btn('bolt', 'Boost nå', 'boost', boost)}${btn('sync', 'Tving syklus', 'force', this.isOn('switch.ki_vvb_tvungen_syklus_aktiv'))}</section>` : ''}`;
      }
      return `<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:2px;padding:4px;border-radius:26px;background:#1c1c1f">${seg}</div>${ber}`;
    }

    /* ----- Tanker ----- */
    _ta() {
      const c = this.config, a = (k) => num(this.sa(k));
      const think = [
        ['Grensen denne timen', this.sa('grense_grunn', '') || '', `${nf(a('grense_kwh'))} kWh`],
        ['Brukt så langt', this.sa('malekilde', '') ? `Fra ${String(this.sa('malekilde')).replace(/^fra\s+/i, '')}` : 'Fra energimåler', `${nf(a('forbrukt_kwh'))} kWh`],
        ['Tillatt snitt resten av timen', `${a('minutter_igjen') != null ? Math.round(a('minutter_igjen')) : '–'} minutter igjen`, `${nf(a('tillatt_effekt_kw'))} kW`],
        ['Uregulert last nå', `Om en time: ${nf(a('uregulert_60_kw'))} kW`, `${nf(a('uregulert_kw'))} kW`],
        ['Ledig til varme', 'Etter reserver og prioriterte laster', `${nf(a('ledig_kw'))} kW`],
      ];
      const linjer = this.at(c.logg, 'linjer', []) || [];
      const LOG = linjer.slice(0, Number(c.logg_antall) || 5);
      return `<section style="display:flex;flex-direction:column;gap:4px;padding:16px;border-radius:28px;background:#1c1c1f">
      <div style="font-size:15px;font-weight:500;padding-bottom:6px">Slik tenker motoren nå</div>
      ${think.map(([k, sub, v]) => `<div style="display:flex;align-items:center;gap:10px;padding:6px 0">
          <span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:13px">${E(k)}</span><span style="font-size:11px;color:#6d6c69">${E(sub)}</span></span>
          <span style="font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap">${E(v)}</span>
        </div>`).join('')}
    </section>
    <section style="display:flex;flex-direction:column;gap:0;padding:16px;border-radius:28px;background:#1c1c1f">
      <div style="display:flex;justify-content:space-between;padding-bottom:10px"><span style="font-size:15px;font-weight:500">Beslutningslogg</span><span style="font-size:12px;color:#8e8d89">${E(`${linjer.length} oppføringer`)}</span></div>
      ${LOG.map((l, i) => {
        // «God margin. Bruker …» → tittel + undertekst. Én setning: hele som tittel, tiltakene under.
        const [title, sub0] = split(l.forklaring);
        const sub = sub0 || (Array.isArray(l.tiltak) ? l.tiltak.join(' · ') : '');
        const col = SONE_FARGE[l.sone] || B;
        const dot = { width: 10, height: 10, borderRadius: 5, marginTop: 4, background: col, boxShadow: `0 0 0 3px ${al(col, 0.2)}`, flex: 'none' };
        const line = { flex: 1, width: 2, background: i === LOG.length - 1 ? 'transparent' : '#2a2a2d', marginTop: 4 };
        return `<div style="display:flex;gap:12px">
          <span style="display:flex;flex-direction:column;align-items:center;width:12px;flex:none"><span style="${S(dot)}"></span><span style="${S(line)}"></span></span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;padding-bottom:14px">
            <span style="display:flex;gap:8px;align-items:baseline"><span style="font-size:12px;color:#8e8d89;font-variant-numeric:tabular-nums">${E(String(l.tid || '').slice(11, 16))}</span><span style="font-size:13px;font-weight:500">${E(title)}</span></span>
            <span style="font-size:11px;color:#8e8d89;text-wrap:pretty">${E(sub)}</span>
          </span>
        </div>`;
      }).join('')}
    </section>`;
    }

    /* ----- Oppsett ----- */
    _op() {
      // «Motoren styrer ovnene» = hovedbryter på og skyggemodus av (samme som i ki-klima-strom-kort)
      const hoved = this.st('switch.ki_energi_hovedbryter') ? this.isOn('switch.ki_energi_hovedbryter') : true;
      const motorOn = hoved && !this.isOn('switch.ki_skyggemodus');
      return `<section style="display:flex;flex-direction:column;gap:8px">
      <div style="font-size:15px;font-weight:500;padding:0 6px">Motor og vann</div>
      ${this.pillRow('switch.ki_skyggemodus', 'heat', 'Motoren styrer ovnene', 'Skriver settpunkt til soner på KI', G, motorOn, 'motor')}
      ${this.pillRow('switch.ki_adaptiv_reserve', 'query_stats', 'Adaptiv reserve', 'Lærer usikkerhetsmargin per time', B)}
      ${this.pillRow('switch.ki_styr_hanklevarmer', 'dry_cleaning', 'Styr håndklevarmer', 'Dusjvinduer og sikkerhetsavstenging', A)}
      ${this.pillRow('switch.ki_tillat_dyrere_trinn', 'trending_up', 'Tillat dyrere trinn', 'Komfort foran fastledd', R)}
      ${this.pillRow('switch.ki_varsel_effekt', 'notifications', 'Varsel ved effektgrense', 'Når en time ender over grensen', P)}
    </section>`;
    }
  }

  KD.define('kd-klima-card', KDKlimaCard, 'KD Klima', 'Klima og energimotoren (KI Energi) – Klima v2');
  KD.sheet('klima', 'kd-klima-card');
})();
} catch (e) { console.error('ki-hjem-design: 21-kd-klima-card.js', e); }

/* ===== 30-kd-sikkerhet-card.js ===== */
try {
/*
 * kd-sikkerhet-card — «Sikkerhet v2» fra Claude Design, som ark-kort.
 *
 * Ringen har én strek per sensor rundt alarmens modus. Streken lyser oransje når en dør/et vindu står
 * åpent eller en lås er ulåst, blå når en sensor ser bevegelse. Hold inne en modus i 0,9 s for å bytte;
 * krever alarmen kode, kommer et kodetastatur og koden sendes med alarm_control_panel.alarm_disarm/arm_*.
 *
 * type: custom:kd-sikkerhet-card          # virker uten mer konfig
 * entity: alarm_control_panel.alarm
 * kode_lengde: 6                          # antall sifre før koden sendes
 * batteri_grense: 20                      # lavt batteri havner under «Krever oppmerksomhet» (0 = av)
 * ansikt: sensor.ansiktsgjenkjenning_dorlas_sist_last_opp_av
 * hendelser: 5                            # rader i «Siste hendelser» (0 = skjul)
 * dager: 2                                # hvor langt tilbake loggboka leses
 * zones:                                  # standard = brukerens sensorer (se DEFAULT_ZONES). To former støttes:
 *   - { entity: binary_sensor.inngangsdor, name: Dør, rom: Inngang, type: door, battery: sensor.inngangsdor_battery }
 *   - title: Vinduer                      # ki-alarm-format (kind: opening|motion|lock, items: [...])
 *     kind: opening
 *     items: [{ entity: binary_sensor.kjokken_vindu, name: Vindu, rom: Kjøkken }]
 * type: door | window | lock | motion | presence (gjettes ut fra domene/device_class/tittel når den mangler).
 * Sensorer som ikke finnes i HA hoppes over. Batteri gjettes som sensor.<objekt>_battery når det finnes.
 */
(() => {
  const KD = window.KD;
  if (!KD || customElements.get('kd-sikkerhet-card')) return;
  const { S, e, a } = KD;
  const C = { amber: KD.C.amber, green: KD.C.green, blue: KD.C.blue, red: KD.C.red, mute: '#8e8d89' };
  // [nøkkel, navn, ikon, farge, HA-tilstand, tjeneste]
  const MODES = [
    ['av', 'Av', 'remove_moderator', '#bdbbb6', 'disarmed', 'alarm_disarm'],
    ['hjemme', 'Hjemme', 'home', C.green, 'armed_home', 'alarm_arm_home'],
    ['borte', 'Borte', 'shield_lock', C.amber, 'armed_away', 'alarm_arm_away'],
    ['natt', 'Natt', 'bedtime', C.blue, 'armed_night', 'alarm_arm_night'],
  ];
  const DEFAULT_ZONES = [
    { entity: 'binary_sensor.inngangsdor', rom: 'Inngang', type: 'door', name: 'Dør', battery: 'sensor.inngangsdor_battery' },
    { entity: 'lock.dorlas_blatann', rom: 'Inngang', type: 'lock', name: 'Dørlås', battery: 'sensor.dorlas_wifi_battery' },
    { entity: 'binary_sensor.trappegang_bevegelsessensor_occupancy', rom: 'Inngang', type: 'motion', name: 'Trapp', battery: 'sensor.trappegang_bevegelsessensor_battery' },
    { entity: 'binary_sensor.verandador', rom: 'Veranda', type: 'door', name: 'Dør', battery: 'sensor.verandador_battery' },
    { entity: 'binary_sensor.stue_g6_turret_motion', rom: 'Stue', type: 'motion', name: 'Bevegelse' },
    { entity: 'binary_sensor.everything_presence_lite_occupancy', rom: 'Stue', type: 'presence', name: 'Tilstede' },
    { entity: 'binary_sensor.kjokken_vindu', rom: 'Kjøkken', type: 'window', name: 'Vindu' },
    { entity: 'binary_sensor.bad_bevegelsesensor_motion', rom: 'Bad', type: 'motion', name: 'Bevegelse', battery: 'sensor.bad_bevegelsesensor_battery' },
    { entity: 'binary_sensor.mellomgang_g5_turret_ultra_motion', rom: 'Mellomgang', type: 'motion', name: 'Bevegelse' },
    { entity: 'binary_sensor.pult_aqara_fp2_motion', rom: 'Pult', type: 'motion', name: 'Bevegelse' },
    { entity: 'binary_sensor.cybele_soverom_vindu', rom: 'Cybele soverom', type: 'window', name: 'Vindu' },
    { entity: 'binary_sensor.rune_kontorvindu', rom: 'Rune kontor', type: 'window', name: 'Vindu' },
    { entity: 'binary_sensor.rune_soveromsvindu', rom: 'Rune soverom', type: 'window', name: 'Vindu' },
    { entity: 'binary_sensor.soveromsvindu_venstre', rom: 'Soverom venstre', type: 'window', name: 'Vindu' },
    { entity: 'binary_sensor.soveromsvindu_hoyre', rom: 'Soverom høyre', type: 'window', name: 'Vindu' },
    { entity: 'lock.boddor', rom: 'Bod', type: 'lock', name: 'Boddør' },
  ];
  const LOCK_ON = ['unlocked', 'open', 'opening', 'unlocking', 'jammed'];
  const WHO = { door: 'Dørsensor', window: 'Vindussensor', lock: 'Dørlås', motion: 'Sensor', presence: 'Sensor', safety: 'Sensor' };
  const SAFETY = ['smoke', 'moisture', 'tamper', 'vibration', 'gas', 'safety', 'carbon_monoxide'];
  // «Legg til»-kandidater: device_class som hører hjemme i alarmoversikten
  const ADD_DC = ['door', 'window', 'garage_door', 'opening', 'motion', 'occupancy', 'presence', 'smoke', 'moisture', 'tamper', 'vibration'];
  const TYPE_ROOM = { door: 'Dører', window: 'Vinduer', lock: 'Låser', motion: 'Bevegelse', presence: 'Bevegelse', safety: 'Sikkerhet' };
  const SAFETY_ICON = { smoke: 'detector_smoke', moisture: 'water_drop', tamper: 'warning', vibration: 'vibration', gas: 'detector_co', carbon_monoxide: 'detector_co' };
  const UD = 'kd_alarm'; // brukerdata: { soner: [{ entity, name, rom, type, battery? }, …] } – samme flate form som zones
  const WD = ['søn.', 'man.', 'tir.', 'ons.', 'tor.', 'fre.', 'lør.'];
  const t = x => `<span>${e(x)}</span>`;
  const today = d => new Date(d).toDateString() === new Date().toDateString();
  const when = d => { d = new Date(d); return isNaN(d) ? '' : today(d) ? KD.hm(d) : `${WD[d.getDay()]} ${KD.hm(d)}`; };

  class KDSikkerhetCard extends KD.KDSheet {
    static head = function () {
      const s = this.v(this.config.entity);
      return ['shield', 'Sikkerhet', s && s !== 'disarmed' && !KD.BAD.has(s) ? 'Alarm armert' : 'Alarm av'];
    };
    static defaults = {
      entity: 'alarm_control_panel.alarm', kode_lengde: 6, batteri_grense: 20,
      ansikt: 'sensor.ansiktsgjenkjenning_dorlas_sist_last_opp_av', hendelser: 5, dager: 2, zones: DEFAULT_ZONES,
    };
    static sheetCss = `.kd-sik-key:active{background:#2c2c30!important}.kd-sik-chip:active{filter:brightness(1.2)}.kd-sik-fix:active{transform:scale(.95)}`;
    static getStubConfig() { return {}; }
    getCardSize() { return 16; }

    /* ---------- sensorlista ---------- */
    typeOf(z, it) {
      if (it.type) return it.type;
      const id = String(it.entity || ''), dom = id.split('.')[0];
      if (dom === 'lock' || z.kind === 'lock') return 'lock';
      const dc = this.at(id, 'device_class', '');
      if (dc === 'window') return 'window';
      if (['door', 'garage_door', 'opening', 'garage'].includes(dc) || dom === 'cover') return 'door';
      if (SAFETY.includes(dc)) return 'safety';
      if (['occupancy', 'presence'].includes(dc) && /presence|tilstede/i.test(`${id} ${it.name || ''}`)) return 'presence';
      if (['motion', 'occupancy', 'presence', 'moving'].includes(dc) || z.kind === 'motion') return 'motion';
      return /vindu|window/i.test(`${z.title || ''} ${z.icon || ''} ${id}`) ? 'window' : 'door';
    }
    /** brukerens egen liste (kd_alarm.soner) om den finnes, ellers config/standard */
    zonesSrc() { const u = KD.ud(this, UD); return u && Array.isArray(u.soner) ? u.soner : this.config.zones || []; }
    flatZones(zones = this.zonesSrc()) {
      const flat = [];
      for (const z of zones || []) {
        if (!z) continue;
        if (Array.isArray(z.items)) for (const it of z.items) { if (it && it.entity) flat.push([z, it]); }
        else if (z.entity) flat.push([{}, z]);
      }
      return flat;
    }
    /** redigerbar flat liste: [{ entity, name, rom, type, battery }] i visningsrekkefølge (gruppert per rom) */
    editList() {
      const list = this.flatZones().map(([z, it]) => {
        const o = { entity: it.entity, type: this.typeOf(z, it) };
        const name = it.name || it.navn, rom = it.rom || it.room, bat = it.battery || it.batteri;
        if (name) o.name = name;
        if (rom) o.rom = rom;
        if (bat) o.battery = bat;
        return o;
      });
      const roomOf = o => o.rom || o.name || 'Annet', order = [...new Set(list.map(roomOf))];
      return order.flatMap(r => list.filter(o => roomOf(o) === r));
    }
    saveZones(list) {
      const u = KD.ud(this, UD) || {};
      this.haptic('selection');
      KD.udSave(this, UD, { ...u, soner: list });
    }
    editTog() { this.setState({ edit: !this.state.edit, q: '' }); }
    editReset() {
      const u = { ...(KD.ud(this, UD) || {}) }; delete u.soner;
      this.haptic('selection');
      KD.udSave(this, UD, u);
    }
    zMove(ev, arg) {
      const [i, d] = String(arg).split('|').map(Number), list = this.editList(), j = i + d;
      if (!list[i] || !list[j]) return;
      [list[i], list[j]] = [list[j], list[i]];
      this.saveZones(list);
    }
    zDel(ev, i) { const list = this.editList(); list.splice(Number(i), 1); this.saveZones(list); }
    areaOf(id) {
      const h = this._hass, en = h && h.entities && h.entities[id]; if (!en) return null;
      const aid = en.area_id || (en.device_id && h.devices && h.devices[en.device_id] && h.devices[en.device_id].area_id);
      return (aid && h.areas && h.areas[aid] && h.areas[aid].name) || null;
    }
    zAdd(ev, id) {
      if (!id || !this.st(id)) return;
      const list = this.editList();
      if (list.some(o => o.entity === id)) return;
      const type = this.typeOf({}, { entity: id }), area = this.areaOf(id);
      const rom = area || TYPE_ROOM[type] || 'Annet';
      let name = String(this.fname(id));
      if (area && name.toLowerCase().startsWith(area.toLowerCase() + ' ')) name = name.slice(area.length + 1);
      const o = { entity: id, name: name.charAt(0).toUpperCase() + name.slice(1), rom, type };
      const last = list.map(x => x.rom || x.name || 'Annet').lastIndexOf(rom); // samme rom → legg etter de andre der
      if (last >= 0) list.splice(last + 1, 0, o); else list.push(o);
      this.saveZones(list);
    }
    setQ(ev) { this.setState({ q: ev.target.value }); }
    candidates(have) {
      const S0 = (this._hass && this._hass.states) || {}, q = String(this.state.q || '').trim().toLowerCase();
      const out = [];
      for (const id of Object.keys(S0)) {
        if (have.has(id)) continue;
        const dom = id.split('.')[0], dc = (S0[id].attributes || {}).device_class;
        const ok = dom === 'lock' || (dom === 'binary_sensor' && ADD_DC.includes(dc)) || (dom === 'cover' && (dc === 'garage' || /garasje|garage/i.test(id)));
        if (!ok) continue;
        const name = String((S0[id].attributes || {}).friendly_name || id), area = this.areaOf(id) || '';
        if (q && !`${id} ${name} ${area}`.toLowerCase().includes(q)) continue;
        out.push({ id, name, area, type: this.typeOf({}, { entity: id }), dc });
      }
      return out.sort((p, r) => p.name.localeCompare(r.name, 'nb'));
    }
    sensorList() {
      const flat = this.flatZones();
      const out = [];
      flat.forEach(([z, it], i) => {
        const st = this.st(it.entity);
        if (!st) return; // finnes ikke i HA → skjul
        const type = this.typeOf(z, it);
        const avail = !KD.BAD.has(st.state);
        const on = avail && (type === 'lock' ? LOCK_ON.includes(st.state) : st.state === 'on' || st.state === 'open');
        let batId = it.battery || it.batteri;
        if (!batId) { const guess = 'sensor.' + it.entity.split('.')[1] + '_battery'; if (this.st(guess)) batId = guess; }
        const bat = batId ? this.n(batId) : null;
        out.push({ id: it.entity, key: 's' + i, room: it.rom || it.room || it.name || 'Annet', type, dc: st.attributes.device_class, name: it.name || it.navn || this.fname(it.entity), on, avail, bat: bat == null ? null : Math.round(bat), batId });
      });
      return out;
    }
    isAlert(x) { return (x.type === 'door' || x.type === 'window' || x.type === 'lock') && x.on; }

    /* ---------- alarm ---------- */
    alarmAttrs() { return (this.st(this.config.entity) || {}).attributes || {}; }
    curMode() {
      const s = this.v(this.config.entity);
      return MODES.find(m => m[4] === s) || (['armed_vacation', 'armed_custom_bypass'].includes(s) ? MODES[2] : MODES[0]);
    }
    needsCode(k) {
      const at = this.alarmAttrs();
      if (!at.code_format) return false;
      return k === 'av' ? true : at.code_arm_required !== false;
    }
    startHold(ev, k) {
      if (this.state.code) return;
      const cur = this.curMode();
      if (k === cur[0] && !['arming', 'pending', 'triggered'].includes(this.v(this.config.entity))) return;
      cancelAnimationFrame(this._holdRaf);
      this.haptic('light');
      const t0 = performance.now();
      const step = () => {
        const p = Math.min(1, (performance.now() - t0) / 900);
        this.setState({ hold: k, prog: p });
        if (p < 1) this._holdRaf = requestAnimationFrame(step);
        else { this.setState({ hold: null, prog: 0 }); this.choose(k); }
      };
      this._holdRaf = requestAnimationFrame(step);
    }
    cancelHold() { cancelAnimationFrame(this._holdRaf); if (this.state.hold) this.setState({ hold: null, prog: 0 }); }
    choose(k) {
      this.haptic('heavy');
      if (this.needsCode(k)) { this.setState({ code: { mode: k, val: '', err: false } }); return; }
      this.send(k);
    }
    send(k, code) {
      const m = MODES.find(x => x[0] === k);
      const data = { entity_id: this.config.entity };
      if (code) data.code = code;
      if (!this._hass) return;
      this._hass.callService('alarm_control_panel', m[5], data)
        .then(() => { if (this.state.code) this.setState({ code: null }); })
        .catch(err => {
          console.warn('kd-sikkerhet', m[5], err);
          if (this.state.code) { this.haptic('heavy'); this.setState({ code: { ...this.state.code, val: '', err: true } }); }
          else this.toast((err && err.message) || String(err));
        });
    }
    codeLen() { return Math.max(1, Number(this.config.kode_lengde) || 6); }
    key(ev, k) {
      const c = this.state.code; if (!c) return;
      this.haptic('light');
      if (k === 'lukk') { this.setState({ code: null }); return; }
      let val = c.err ? '' : c.val;
      if (k === 'slett') val = val.slice(0, -1);
      else if (val.length < this.codeLen()) val += k;
      this.setState({ code: { ...c, val, err: false } });
      if (val.length === this.codeLen()) this.send(c.mode, val);
    }

    /* ---------- handlinger ---------- */
    fix(ev, id) { if (id.startsWith('lock.')) this.call('lock', 'lock', { entity_id: id }); else this.more(id); }
    info(ev, id) { this.more(id); }

    /* ---------- loggboka ---------- */
    userName(uid) {
      if (!uid) return null;
      const p = Object.values(this._hass.states).find(s => s.entity_id.startsWith('person.') && s.attributes.user_id === uid);
      if (p) return String(p.attributes.friendly_name || '').split(' ')[0];
      if (this._hass.user && this._hass.user.id === uid) return String(this._hass.user.name || 'Deg').split(' ')[0];
      return 'Bruker';
    }
    logRows(list) {
      const cfg = this.config, max = Number(cfg.hendelser) || 0;
      if (!max) return [];
      const alarm = this.st(cfg.entity), sig = [alarm && alarm.last_changed];
      for (const x of list) if (x.type !== 'motion' && x.type !== 'presence') { const s = this.st(x.id); sig.push(s && s.last_changed); }
      const ids = [cfg.entity, ...list.map(x => x.id), cfg.ansikt].filter(Boolean);
      const key = 'kd-sik-log|' + ids.join(',') + '|' + sig.join(',') + '|' + Math.floor(Date.now() / 60e3);
      const start = new Date(Date.now() - (Number(cfg.dager) || 2) * 864e5).toISOString();
      const raw = this.cached(key, 60e3, () => this.ws({ type: 'logbook/get_events', start_time: start, entity_ids: ids }), null);
      if (raw) this._lastLog = raw;
      const evs = (Array.isArray(this._lastLog) ? this._lastLog : []).map(x => ({ ...x, t: typeof x.when === 'number' ? x.when * 1000 : new Date(x.when).getTime() }))
        .filter(x => !isNaN(x.t)).sort((p, q) => q.t - p.t);
      const faces = evs.filter(x => x.entity_id === cfg.ansikt && x.state && !KD.BAD.has(x.state));
      const out = [];
      for (const ev of evs) {
        if (out.length >= max) break;
        let text, who, kind;
        const user = this.userName(ev.context_user_id);
        if (ev.entity_id === cfg.entity) {
          if (['arming', 'pending'].includes(ev.state) || KD.BAD.has(ev.state)) continue;
          const m = MODES.find(x => x[4] === ev.state);
          text = ev.state === 'triggered' ? 'Alarmen ble utløst' : ev.state === 'disarmed' ? 'Alarm slått av' : m ? `Alarm satt til ${m[1]}` : `Alarm: ${ev.state}`;
          who = user ? `${user} · app` : ev.context_entity_id ? 'Automatisk' : 'Alarmsystemet';
          kind = ev.state === 'triggered' ? 'alert' : 'mode';
        } else {
          const s = list.find(x => x.id === ev.entity_id);
          if (!s || KD.BAD.has(ev.state)) continue;
          const on = s.type === 'lock' ? LOCK_ON.includes(ev.state) : ev.state === 'on' || ev.state === 'open';
          if (!on && s.type !== 'lock') continue; // «lukket» og «ingen bevegelse» er støy
          if (s.type === 'lock') text = `${s.room} ${on ? 'låst opp' : 'låst'}`;
          else if (s.type === 'safety') text = `${s.room}: ${s.name.toLowerCase()} utløst`;
          else if (s.type === 'motion' || s.type === 'presence') text = `Bevegelse i ${s.room.toLowerCase()}`;
          else text = `${s.room} åpnet`;
          who = user ? `${user} · app` : ev.context_entity_id ? 'Automatisk' : WHO[s.type];
          if (s.type === 'lock' && on) { const f = faces.find(x => ev.t - x.t >= -30e3 && ev.t - x.t <= 120e3); if (f) who = `${f.state} · ansikt`; }
          kind = s.type === 'lock' ? (on ? 'alert' : 'ok') : s.type === 'motion' || s.type === 'presence' ? 'motion' : 'alert';
        }
        if (out.length && out[out.length - 1][0] === text) continue; // slå sammen like hendelser på rad
        out.push([text, who, when(ev.t), kind]);
      }
      return out;
    }

    /* ---------- tastatur (finnes ikke i skissen – tegnet i samme formspråk) ---------- */
    keypadHTML() {
      const c = this.state.code, m = MODES.find(x => x[0] === c.mode), len = this.codeLen();
      const dots = Array.from({ length: len }, (_, i) => {
        const f = i < c.val.length, col = c.err ? C.red : '#f2f1ee';
        return `<span style="${S({ width: 10, height: 10, borderRadius: 5, background: f ? col : 'transparent', boxShadow: `inset 0 0 0 1.5px ${f ? col : c.err ? a(C.red, 0.6) : 'rgba(255,255,255,0.25)'}`, transition: 'background .15s' })}"></span>`;
      }).join('');
      const kst = { height: 56, borderRadius: 17, background: '#232326', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 500, fontVariantNumeric: 'tabular-nums', touchAction: 'manipulation' };
      const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(k => `<button class="kd-sik-key" data-on-click="key" data-arg="${k}" style="${S(kst)}">${k}</button>`).join('');
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:18px 5px 5px;border-radius:22px;background:#1c1c1f">
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center">
          <div style="font-size:15px;font-weight:500;color:${c.err ? C.red : '#f2f1ee'}">${c.err ? 'Feil kode' : `Tast kode for ${e(m[1].toLowerCase())}`}</div>
          <div style="font-size:12px;color:#8e8d89">${c.err ? 'Prøv på nytt' : 'Sendes når alle sifrene er tastet'}</div>
        </div>
        <div style="display:flex;gap:12px">${dots}</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:100%">${keys}
          <button class="kd-sik-key" data-on-click="key" data-arg="lukk" title="Avbryt" style="${S({ ...kst, background: 'transparent', color: '#a9a7a2' })}"><span class="ms" style="font-size:22px">close</span></button>
          <button class="kd-sik-key" data-on-click="key" data-arg="0" style="${S(kst)}">0</button>
          <button class="kd-sik-key" data-on-click="key" data-arg="slett" title="Slett" style="${S({ ...kst, background: 'transparent', color: '#a9a7a2' })}"><span class="ms" style="font-size:22px">backspace</span></button>
        </div>
      </div>`;
    }

    /* ---------- innhold ---------- */
    body() {
      const s = this.state, cfg = this.config;
      const alarm = this.st(cfg.entity), ast = alarm ? alarm.state : '';
      const cur = this.curMode();
      const armed = cur[0] !== 'av';
      const trig = ast === 'triggered', trans = ast === 'arming' || ast === 'pending';
      const sensors = this.sensorList();
      const alerts = sensors.filter(x => this.isAlert(x));
      const motion = sensors.filter(x => (x.type === 'motion' || x.type === 'presence') && x.on);
      const n = sensors.length;
      const icon = x => x.id.startsWith('cover.') ? (x.on ? 'garage_open' : 'garage') : ({ door: x.on ? 'door_open' : 'door_front', window: x.on ? 'sensor_window' : 'window', lock: x.on ? 'lock_open' : 'lock', motion: x.on ? 'directions_run' : 'directions_walk', presence: 'person', safety: SAFETY_ICON[x.dc] || 'sensors' })[x.type] || 'sensors';
      const label = x => ({ door: x.on ? 'Åpen' : x.name, window: x.on ? 'Åpent' : x.name, lock: x.on ? `${x.name} ulåst` : x.name, motion: x.on ? 'Bevegelse nå' : x.name, presence: x.on ? 'Noen her' : x.name, safety: x.on ? `${x.name} utløst` : x.name })[x.type] || x.name;
      const colorOf = x => this.isAlert(x) || (x.type === 'safety' && x.on) ? C.amber : x.on ? C.blue : null;
      const roomsOrder = [...new Set(sensors.map(x => x.room))];
      const plural = (k, one, many) => `${k} ${k === 1 ? one : many}`;
      const words = { door: ['dør', 'dører'], window: ['vindu', 'vinduer'], lock: ['lås', 'låser'] };
      const headline = trig ? 'Alarmen er utløst!' : alerts.length
        ? `${alerts.map(x => x.type).filter((v, i, arr) => arr.indexOf(v) === i).map(t => { const k = alerts.filter(x => x.type === t).length; return plural(k, ...words[t]); }).join(' og ')} ${alerts.some(x => x.type === 'lock') && alerts.every(x => x.type === 'lock') ? 'er ulåst' : 'er åpen'}`
        : 'Alt er lukket og låst';
      const since = alarm && alarm.last_changed ? when(alarm.last_changed) : '–';
      const coreCol = trig ? C.red : cur[3];
      const lowBat = Number(cfg.batteri_grense) > 0 ? sensors.filter(x => x.bat != null && x.bat <= Number(cfg.batteri_grense)) : [];

      const ring = sensors.map((x, i) => {
        const col = colorOf(x);
        const deg = (360 / n) * i;
        return { title: `${x.room} · ${x.name}`, style: { position: 'absolute', left: 'calc(50% - 4px)', top: 'calc(50% - 16px)', width: 8, height: 32, borderRadius: 4, transform: `rotate(${deg}deg) translateY(-110px)`, background: col || (armed ? a(cur[3], 0.55) : '#38383b'), boxShadow: col ? `0 0 14px ${a(col, 0.7)}` : 'none', transition: 'background .4s, box-shadow .4s' } };
      });
      const core = { position: 'absolute', inset: 44, borderRadius: '50%', background: armed || trig ? `radial-gradient(circle at 50% 35%, ${a(coreCol, 0.16)}, #1c1c1f 70%)` : '#1c1c1f', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'background .4s', cursor: 'pointer' };
      const coreIcon = { fontSize: 30, color: coreCol, fontVariationSettings: "'FILL' 1" };
      const modeIcon = trig ? 'notifications_active' : trans ? 'hourglass_top' : cur[2];
      const modeLabel = trig ? 'Utløst' : ast === 'arming' ? 'Aktiverer' : ast === 'pending' ? 'Venter' : alarm && KD.BAD.has(ast) ? 'Utilgjengelig' : cur[1];
      const modeSince = armed ? `Aktivert ${since}` : `Avslått ${since}`;
      const subline = `${motion.length ? plural(motion.length, 'sensor', 'sensorer') + ' registrerer bevegelse' : 'Ingen bevegelse'} · ${n - alerts.length - motion.length} i ro`;
      const holdHint = s.hold ? `Hold for å sette ${MODES.find(m => m[0] === s.hold)[1].toLowerCase()}…` : 'Hold inne for å bytte modus';
      const modes = MODES.map(([k, l, ic, col]) => {
        const act = cur[0] === k && !trans, holding = s.hold === k;
        return {
          k, label: l, icon: ic,
          style: { position: 'relative', overflow: 'hidden', height: 64, borderRadius: 17, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, background: act ? a(col, 0.18) : 'transparent', boxShadow: act ? `inset 0 0 0 1px ${a(col, 0.45)}` : 'none', color: act ? '#f2f1ee' : '#a9a7a2', touchAction: 'pan-y', userSelect: 'none', WebkitUserSelect: 'none', transition: 'background .25s' },
          fill: { position: 'absolute', left: 0, bottom: 0, top: 0, width: `${holding ? s.prog * 100 : 0}%`, background: a(col, 0.28) },
          iconStyle: { position: 'relative', fontSize: 21, color: act || holding ? col : '#a9a7a2', fontVariationSettings: `'FILL' ${act ? 1 : 0}` },
        };
      });
      const alertRows = [
        ...alerts.map(x => ({ id: x.id, icon: icon(x), text: x.type === 'lock' ? `${x.name} er ulåst` : `${x.name} er ${x.type === 'window' ? 'åpent' : 'åpen'}`, room: x.room, action: x.type === 'lock' ? 'Lås' : 'Vis' })),
        ...sensors.filter(x => x.type === 'safety' && x.on).map(x => ({ id: x.id, icon: icon(x), text: `${x.name} utløst`, room: x.room, action: 'Vis' })),
        ...lowBat.map(x => ({ id: x.batId, icon: 'battery_alert', text: `Lavt batteri · ${x.bat} %`, room: `${x.room} · ${x.name}`, action: 'Vis' })),
      ];
      const rooms = roomsOrder.map((room, i) => {
        const list = sensors.filter(x => x.room === room);
        const al = list.some(x => this.isAlert(x)), mv = list.some(x => x.on && !this.isAlert(x));
        return {
          name: room,
          rowStyle: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 4px', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' },
          dot: { width: 7, height: 7, borderRadius: 4, flex: 'none', background: al ? C.amber : mv ? C.blue : '#48474a' },
          sensors: list.map(x => {
            const col = colorOf(x);
            return {
              id: x.id, icon: icon(x),
              label: !x.avail ? `${x.name} · utilgj.` : x.type === 'lock' && !x.on ? (x.bat != null ? `${x.name} · ${x.bat} %` : x.name) : label(x),
              style: { height: 32, padding: '0 11px 0 8px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', background: col ? a(col, 0.16) : '#1f1f22', color: col ? '#f2f1ee' : '#c9c7c2', boxShadow: col ? `inset 0 0 0 1px ${a(col, 0.4)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)', transition: 'background .2s', opacity: x.avail ? 1 : 0.5 },
              iconStyle: { fontSize: 16, color: col || '#8e8d89' },
            };
          }),
        };
      });
      const log = this.logRows(sensors).map(([text, who, time, kind], i, arr) => {
        const col = kind === 'alert' ? C.amber : kind === 'motion' ? C.blue : kind === 'mode' ? '#f2f1ee' : C.green;
        return { text, who, time, dot: { width: 9, height: 9, borderRadius: 5, marginTop: 5, background: col, flex: 'none' }, line: { flex: 1, width: 1, background: i < arr.length - 1 ? 'rgba(255,255,255,0.1)' : 'transparent', marginTop: 4 } };
      });

      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) ${s.edit ? 'calc(120px + env(safe-area-inset-bottom))' : '28px'};display:flex;flex-direction:column;gap:22px">

  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Sikkerhet</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section style="display:flex;flex-direction:column;align-items:center;gap:20px">
    <div style="position:relative;width:260px;height:260px">
      ${ring.map(r => `<div title="${e(r.title)}" style="${S(r.style)}"></div>`).join('')}
      <div data-on-click="info" data-arg="${e(cfg.entity)}" style="${S(core)}">
        <span class="ms" style="${S(coreIcon)}">${t(modeIcon)}</span>
        <div style="font-size:26px;font-weight:500;letter-spacing:-0.02em">${t(modeLabel)}</div>
        <div style="font-size:12px;color:#8e8d89">${t(modeSince)}</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
      <div style="font-size:24px;font-weight:500;letter-spacing:-0.015em;text-wrap:balance">${t(headline)}</div>
      <div style="font-size:14px;color:#8e8d89">${t(subline)}</div>
    </div>
  </section>

  <section style="display:flex;flex-direction:column;gap:8px">
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:5px;border-radius:22px;background:#1c1c1f">
      ${modes.map(m => `<button data-on-pointerdown="startHold" data-on-pointerup="cancelHold" data-on-pointerleave="cancelHold" data-on-pointercancel="cancelHold" data-on-contextmenu="noMenu" data-arg="${m.k}" style="${S(m.style)}">
          <div style="${S(m.fill)}"></div>
          <span class="ms" style="${S(m.iconStyle)}">${t(m.icon)}</span>
          <span style="position:relative;font-size:12px;font-weight:500">${t(m.label)}</span>
        </button>`).join('')}
    </div>
    ${s.code ? this.keypadHTML() : `<div style="font-size:11px;color:#6d6c69;text-align:center">${t(holdHint)}</div>`}
  </section>

  ${alertRows.length ? `<section style="display:flex;flex-direction:column;gap:8px">
      <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:oklch(0.82 0.12 75);padding:0 4px">Krever oppmerksomhet</div>
      ${alertRows.map(x => `<div style="display:flex;align-items:center;gap:12px;padding:12px 12px 12px 14px;border-radius:20px;background:oklch(0.82 0.12 75 / 0.12);box-shadow:inset 0 0 0 1px oklch(0.82 0.12 75 / 0.35)">
          <span class="ms" style="font-size:22px;color:oklch(0.82 0.12 75)">${t(x.icon)}</span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
            <div style="font-size:15px;font-weight:500">${t(x.text)}</div>
            <div style="font-size:12px;color:#c9c7c2">${t(x.room)}</div>
          </div>
          <button class="kd-sik-fix" data-on-click="fix" data-arg="${e(x.id)}" style="height:36px;padding:0 14px;border-radius:18px;background:oklch(0.82 0.12 75);color:#161618;font-size:13px;font-weight:600;white-space:nowrap;transition:transform .12s">${t(x.action)}</button>
        </div>`).join('')}
    </section>` : ''}

  ${s.edit ? this.editHTML() : `<section style="display:flex;flex-direction:column;gap:2px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:0 4px 8px">
      <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Rom</div>
      <div style="font-size:12px;color:#6d6c69;white-space:nowrap"><span>${n} sensorer</span></div>
    </div>
    ${rooms.map(room => `<div style="${S(room.rowStyle)}">
        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;padding-top:7px">
          <span style="${S(room.dot)}"></span>
          <span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t(room.name)}</span>
        </div>
        <div style="flex:none;max-width:62%;display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end">
          ${room.sensors.map(x => `<button class="kd-sik-chip" data-on-click="info" data-arg="${e(x.id)}" style="${S(x.style)}"><span class="ms" style="${S(x.iconStyle)}">${t(x.icon)}</span>${t(x.label)}</button>`).join('')}
        </div>
      </div>`).join('')}
  </section>`}

  ${Number(cfg.hendelser) ? `<section style="display:flex;flex-direction:column;gap:8px">
    <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:0 4px">Siste hendelser</div>
    <div style="display:flex;flex-direction:column;padding-left:4px">
      ${log.map(x => `<div style="display:flex;gap:14px;align-items:stretch">
          <div style="display:flex;flex-direction:column;align-items:center;width:10px;flex:none">
            <span style="${S(x.dot)}"></span>
            <span style="${S(x.line)}"></span>
          </div>
          <div style="flex:1;display:flex;justify-content:space-between;gap:12px;padding-bottom:14px">
            <div style="display:flex;flex-direction:column;gap:2px">
              <div style="font-size:14px">${t(x.text)}</div>
              <div style="font-size:12px;color:#8e8d89">${t(x.who)}</div>
            </div>
            <div style="font-size:12px;color:#8e8d89;font-variant-numeric:tabular-nums">${t(x.time)}</div>
          </div>
        </div>`).join('')}
      ${!log.length && this._lastLog ? `<div style="padding:4px 0 8px;font-size:13px;color:#6d6c69">Ingen hendelser</div>` : ''}
    </div>
  </section>` : ''}
  ${s.edit ? `<div data-key="kd-sik-editbar" style="position:fixed;left:var(--kd-kant,10px);right:var(--kd-kant,10px);bottom:calc(100px + env(safe-area-inset-bottom));z-index:30;max-width:var(--kd-bredde,100%);overflow-x:clip;margin:0 auto;box-sizing:border-box;display:flex;align-items:center;gap:10px;padding:8px 8px 8px 16px;border-radius:30px;background:rgba(38,38,41,0.92);backdrop-filter:blur(18px) saturate(160%);-webkit-backdrop-filter:blur(18px) saturate(160%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.07),0 8px 24px rgba(0,0,0,0.35)">
    <span class="ms" style="font-size:20px;color:oklch(0.82 0.1 350)">tune</span>
    <span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Tilpass sensorene</span><span style="font-size:11px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Flytt, fjern eller legg til</span></span>
    <button class="kd-sik-fix" data-on-click="editReset" style="height:40px;padding:0 14px;border-radius:20px;background:rgba(255,255,255,0.08);font-size:13px;font-weight:500;flex:none">Nullstill</button>
    <button class="kd-sik-fix" data-on-click="editTog" style="height:40px;padding:0 16px;border-radius:20px;background:linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20));color:#2a1720;font-size:13px;font-weight:600;flex:none">Ferdig</button>
  </div>` : `<button class="kd-sik-fix" data-key="kd-sik-editbtn" data-on-click="editTog" style="display:flex;align-items:center;justify-content:center;gap:8px;height:48px;border-radius:24px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04);color:#a9a7a2;font-size:13px;font-weight:500"><span class="ms" style="font-size:18px">tune</span>Tilpass sensorene</button>`}
</div>`;
    }

    /* ---------- tilpass-modus: flytt / fjern / legg til sensorer (lagres per bruker i kd_alarm) ---------- */
    editHTML() {
      const list = this.editList(), have = new Set(list.map(o => o.entity));
      const custom = Array.isArray((KD.ud(this, UD) || {}).soner);
      const roomOf = o => o.rom || o.name || 'Annet';
      const ic = (type, dc, id) => (id || '').startsWith('cover.') ? 'garage' : ({ door: 'door_front', window: 'window', lock: 'lock', motion: 'directions_walk', presence: 'person', safety: SAFETY_ICON[dc] || 'sensors' })[type] || 'sensors';
      const ibtn = (fn, arg, icon, col, off, title) => `<button class="kd-sik-fix" data-on-click="${fn}" data-arg="${e(arg)}" title="${title}" ${off ? 'disabled' : ''} style="width:34px;height:34px;border-radius:17px;display:grid;place-items:center;flex:none;color:${col};opacity:${off ? 0.25 : 1};transition:transform .12s"><span class="ms" style="font-size:20px">${icon}</span></button>`;
      let prev = null;
      const rows = list.map((o, i) => {
        const room = roomOf(o), head = room !== prev; prev = room;
        const first = i === 0 || roomOf(list[i - 1]) !== room, last = i === list.length - 1 || roomOf(list[i + 1]) !== room;
        const st = this.st(o.entity), name = o.name || (st ? this.fname(o.entity) : o.entity);
        const sub = st ? o.entity : `${o.entity} · finnes ikke`;
        return `${head ? `<div data-key="kd-sik-eh-${e(room)}" style="font-size:12px;font-weight:500;color:#8e8d89;padding:${i ? 12 : 2}px 6px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t(room)}</div>` : ''}
        <div data-key="kd-sik-e-${e(o.entity)}" style="display:grid;grid-template-columns:28px minmax(0,1fr) auto;align-items:center;gap:8px;padding:6px 4px 6px 12px;border-radius:18px;background:#1c1c1f;opacity:${st ? 1 : 0.5}">
          <span class="ms" style="font-size:19px;color:#8e8d89">${ic(o.type, st && st.attributes.device_class, o.entity)}</span>
          <div style="min-width:0;display:flex;flex-direction:column;gap:1px">
            <span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t(name)}</span>
            <span style="font-size:11px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t(sub)}</span>
          </div>
          <div style="display:flex;align-items:center">
            ${ibtn('zMove', `${i}|-1`, 'arrow_upward', '#c9c7c2', first, 'Flytt opp')}
            ${ibtn('zMove', `${i}|1`, 'arrow_downward', '#c9c7c2', last, 'Flytt ned')}
            ${ibtn('zDel', String(i), 'remove_circle', 'oklch(0.72 0.15 25)', false, 'Fjern')}
          </div>
        </div>`;
      }).join('');
      const MAX = 40, cand = this.candidates(have);
      const add = cand.slice(0, MAX).map(c => `<div data-key="kd-sik-a-${e(c.id)}" style="display:grid;grid-template-columns:28px minmax(0,1fr) auto;align-items:center;gap:8px;padding:6px 4px 6px 12px;border-radius:18px;background:#1c1c1f">
          <span class="ms" style="font-size:19px;color:#8e8d89">${ic(c.type, c.dc, c.id)}</span>
          <div style="min-width:0;display:flex;flex-direction:column;gap:1px">
            <span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t(c.name)}</span>
            <span style="font-size:11px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t([c.area, c.id].filter(Boolean).join(' · '))}</span>
          </div>
          ${ibtn('zAdd', c.id, 'add_circle', 'oklch(0.8 0.12 150)', false, 'Legg til')}
        </div>`).join('');
      return `<section data-key="kd-sik-edit" style="display:flex;flex-direction:column;gap:6px;min-width:0">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:0 4px 4px">
      <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Sensorer</div>
      <div style="font-size:12px;color:#6d6c69;white-space:nowrap">${t(`${list.length} · ${custom ? 'din liste' : 'standard'}`)}</div>
    </div>
    ${rows || `<div style="padding:8px 6px;font-size:13px;color:#6d6c69">Ingen sensorer</div>`}
  </section>
  <section data-key="kd-sik-add" style="display:flex;flex-direction:column;gap:6px;min-width:0">
    <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:0 4px 4px">Legg til</div>
    <label style="display:flex;align-items:center;gap:8px;height:42px;padding:0 14px;border-radius:21px;background:#1c1c1f;min-width:0">
      <span class="ms" style="font-size:18px;color:#8e8d89">search</span>
      <input data-key="kd-sik-q" data-on-input="setQ" value="${e(this.state.q || '')}" placeholder="Søk etter sensor, lås eller rom" style="flex:1;min-width:0;height:100%;border:0;outline:none;background:transparent;color:#f2f1ee;font:inherit;font-size:14px">
    </label>
    ${add || `<div style="padding:8px 6px;font-size:13px;color:#6d6c69">${this.state.q ? 'Ingen treff' : 'Ingen flere sensorer å legge til'}</div>`}
    ${cand.length > MAX ? `<div style="padding:4px 6px;font-size:12px;color:#6d6c69">${t(`${cand.length - MAX} til – søk for å snevre inn`)}</div>` : ''}
  </section>`;
    }
    noMenu(ev) { ev.preventDefault(); }
    onDisconnect() { cancelAnimationFrame(this._holdRaf); super.onDisconnect(); }
  }

  KD.define('kd-sikkerhet-card', KDSikkerhetCard, 'KD Sikkerhet', 'Sikkerhet v2: ring med alle sensorene, hold-for-å-bytte alarmmodus med kodetastatur, rommene og siste hendelser.');
  KD.sheet('sik', 'kd-sikkerhet-card');
})();
} catch (e) { console.error('ki-hjem-design: 30-kd-sikkerhet-card.js', e); }

/* ===== 31-kd-kamera-card.js ===== */
try {
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
    static sheetCss = `.kd-cam-ctl:active,.kd-cam-ev:active,.kd-cam-ed:active{filter:brightness(1.15)}.kd-cam-ed:disabled{opacity:.3}`;
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
    layout() { const u = (KD.ud(this, UD) || {}).oppsett || this.config.oppsett; return LAYOUTS.some(x => x[0] === u) ? u : 'liste'; }
    setLayout(ev, v) { if (!LAYOUTS.some(x => x[0] === v) || v === this.layout()) return; KD.udSave(this, UD, { ...KD.ud(this, UD), oppsett: v }); this.setState({ pg: 0, fi: 0 }); this.haptic('selection'); }
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
    layoutPickHTML() {
      const cur = this.layout(), L = LAYOUTS.find(x => x[0] === cur);
      return `<div data-key="kam-lay" data-lay="Visning" data-lay-navn="Visning (oppsett)" style="display:flex;flex-direction:column;gap:6px;min-width:0">
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:0 4px;min-width:0">
      <span style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Visning</span>
      <span style="font-size:12px;color:#c9c7c2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(L[1])}</span>
    </div>
    ${KD.segHTML('kam-oppsett', LAYOUTS.map(([k, , icon]) => [k, '', icon]), cur, 'setLayout', { small: true })}
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
      const s = this.state, L = this.layout(), n = feeds.length;
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
  <div data-key="kd-edit-bar" style="position:fixed;left:var(--kd-kant,10px);right:var(--kd-kant,10px);bottom:calc(100px + env(safe-area-inset-bottom));z-index:30;max-width:620px;margin:0 auto;box-sizing:border-box;display:flex;align-items:center;gap:10px;padding:8px 8px 8px 16px;border-radius:30px;background:rgba(38,38,41,0.92);backdrop-filter:blur(18px) saturate(160%);-webkit-backdrop-filter:blur(18px) saturate(160%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.07),0 8px 24px rgba(0,0,0,0.35)">
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
} catch (e) { console.error('ki-hjem-design: 31-kd-kamera-card.js', e); }

/* ===== 32-kd-person-card.js ===== */
try {
/*
 * kd-person-card — «Person» (Tilstedeværelse) fra Claude Design, som ark-kort.
 *
 * Sone og «siden» fra person.*, mobil og helse fra telefonens sensorer (prefiks funnet via personens
 * device_trackers, f.eks. sensor.sebastian_iphone_17_pro_*), søvnvindu og «Våknet/Sovnet» fra søvnbryteren
 * (on = sover), «Soner i dag» fra personens historikk.
 *
 * type: custom:kd-person-card
 * person: sebastian            # sebastian | cybele | rune (designets personId) – eller en person.*-ID
 * personer: { sebastian: { navn, entity, posisjon, sovn, mobil, farge, sovn_rom } }   # overstyr/utvid tabellen
 * entity / posisjon / sovn / mobil / navn / farge / sovn_rom   # overstyr for valgt person direkte
 * soner: { skole: { navn: Skole, ikon: school, farge: 'oklch(…)', bestemt: skolen } }   # nøkkel = zone-objekt-ID
 * bilde: true                  # true = bruk personens entity_picture i avataren i stedet for forbokstaven
 * Mobil-sensorer (med prefiks): battery_level, battery_state, connection_type, ssid, geocoded_location, steps,
 * distance / walking_running_distance, sleep_duration, core_sleep, deep_sleep, rem_sleep, awake, sleep_score.
 */
(() => {
  const KD = window.KD;
  if (!KD || customElements.get('kd-person-card')) return;
  const { S, e, a } = KD;
  const t = x => `<span>${e(x)}</span>`;
  const C = { green: 'oklch(0.8 0.12 150)', blue: 'oklch(0.8 0.12 250)', purple: 'oklch(0.68 0.2 285)', amber: 'oklch(0.82 0.12 75)', pink: 'oklch(0.78 0.13 350)' };
  const PERSONS = {
    sebastian: { navn: 'Sebastian', entity: 'person.sebastian_kristo_jemtland', posisjon: 'switch.sebastian_posisjon_hjemme_borte', sovn: 'switch.homey_logic_sebastian_sovn_vaken', farge: 'oklch(0.55 0.08 40)', mobil: 'sensor.sebastian_iphone_17_pro_' },
    cybele: { navn: 'Cybele', entity: 'person.cybele_kristo', posisjon: 'switch.cybele_posisjon_hjemme_borte', sovn: 'switch.homey_logic_cybele_sovn_vaken', farge: 'oklch(0.5 0.08 350)' },
    rune: { navn: 'Rune', entity: 'person.rune_jemtland', posisjon: 'switch.rune_posisjon_hjemme_borte', sovn: 'switch.homey_logic_rune_sovn_vaken', farge: 'oklch(0.5 0.05 250)' },
  };
  // [navn, ikon, farge, bestemt form («Forlot skolen»)]
  const ZONES = {
    home: ['Hjemme', 'home', C.green, 'hjemmet'], not_home: ['Borte', 'logout', C.purple, 'borte'],
    skole: ['Skole', 'school', C.amber, 'skolen'], stromstad: ['Strømstad', 'cottage', C.amber, 'Strømstad'], toten: ['Toten', 'cottage', C.amber, 'Toten'],
    mormor: ['Mormor', 'family_home', C.pink, 'mormor'], oslo_revmatologipraksis: ['Revmatologen', 'medical_services', C.blue, 'revmatologen'], kor: ['Kor', 'music_note', C.blue, 'koret'],
  };
  const STAGES = [['Våken', '#8e8d89'], ['Lett', 'oklch(0.72 0.1 250)'], ['Dyp', 'oklch(0.55 0.14 275)'], ['REM', 'oklch(0.75 0.13 330)']];
  // Designets typiske natt – brukes som mal for rekkefølgen når bare fase-totalene er kjent.
  const SEQ = [1, 2, 2, 1, 3, 1, 2, 1, 3, 0, 1, 3, 1, 3, 0];
  const WD = ['sø', 'ma', 'ti', 'on', 'to', 'fr', 'lø'];
  const WDL = ['søn.', 'man.', 'tir.', 'ons.', 'tor.', 'fre.', 'lør.'];
  const slug = s => String(s || '').toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const isToday = d => new Date(d).toDateString() === new Date().toDateString();
  const dayStart = (off = 0) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + off); return d; };

  /** Fordel N blokker på fasene etter minutter (største rest), i designets rekkefølge. */
  function hypnogram(mins, n = SEQ.length) {
    const tot = mins.reduce((p, q) => p + q, 0); if (!tot) return [];
    const raw = mins.map(m => m / tot * n), cnt = raw.map(Math.floor);
    let rest = n - cnt.reduce((p, q) => p + q, 0);
    raw.map((r, i) => [r - Math.floor(r), i]).sort((p, q) => q[0] - p[0]).forEach(([, i]) => { if (rest > 0) { cnt[i]++; rest--; } });
    const left = cnt.slice(), out = [];
    for (const want of SEQ.slice(0, n)) {
      let k = left[want] > 0 ? want : left.indexOf(Math.max(...left));
      left[k]--; out.push(k);
    }
    return out;
  }

  class KDPersonCard extends KD.KDSheet {
    static head = ['person', 'Tilstedeværelse', 'Mobil, sone og søvn'];
    static defaults = { person: 'sebastian', personer: null, soner: null, bilde: true, sovn_rom: 'Soverom' };
    static getStubConfig() { return { person: 'sebastian' }; }
    getCardSize() { return 14; }

    /* ---------- oppslag ---------- */
    who() {
      const cfg = this.config, table = { ...PERSONS };
      for (const [k, v] of Object.entries(cfg.personer || {})) table[k] = { ...(table[k] || {}), ...(v || {}) };
      let key = String(cfg.person || 'sebastian'), p;
      if (key.startsWith('person.')) { p = Object.values(table).find(x => x.entity === key); if (!p) { const fn = this.fname(key, key); p = { navn: String(fn).split(' ')[0], entity: key }; } }
      else p = table[key] || table.sebastian;
      p = { ...p };
      for (const k of ['entity', 'posisjon', 'sovn', 'mobil', 'navn', 'farge']) if (cfg[k]) p[k] = cfg[k];
      p.key = slug(String(p.navn || '').split(' ')[0]) || 'person';
      p.navn = p.navn || this.fname(p.entity, p.key);
      p.farge = p.farge || 'oklch(0.5 0.05 250)';
      p.prefix = this.phonePrefix(p);
      return p;
    }
    phonePrefix(p) {
      if (p.mobil) { const m = String(p.mobil).replace(/^sensor\./, ''); return 'sensor.' + (m.endsWith('_') ? m : m + '_'); }
      const trs = this.at(p.entity, 'device_trackers', []) || [];
      for (const tr of trs) { const o = String(tr).split('.')[1]; if (o && this.st(`sensor.${o}_battery_level`)) return `sensor.${o}_`; }
      if (!this._pfx || this._pfx.k !== p.key) {
        const id = Object.keys(this._hass ? this._hass.states : {}).find(x => x.startsWith(`sensor.${p.key}_`) && x.endsWith('_battery_level'));
        this._pfx = { k: p.key, v: id ? id.replace(/battery_level$/, '') : null };
      }
      return this._pfx.v;
    }
    zones() {
      const z = { ...ZONES };
      for (const [k, v] of Object.entries(this.config.soner || {})) { const o = z[k] || [k, 'location_on', C.blue, k]; z[k] = [v.navn || o[0], v.ikon || o[1], v.farge || o[2], v.bestemt || v.navn || o[3]]; }
      return z;
    }
    zoneKey(state) {
      if (!state || KD.BAD.has(state)) return null;
      if (state === 'home' || state === 'not_home') return state;
      const states = this._hass ? this._hass.states : {};
      const hit = Object.keys(states).find(id => id.startsWith('zone.') && (states[id].attributes.friendly_name === state || id === 'zone.' + slug(state)));
      return hit ? hit.split('.')[1] : slug(state);
    }
    zoneInfo(key, state) {
      const z = this.zones();
      if (z[key]) return z[key];
      const nm = this.fname('zone.' + key, state || key);
      return [nm, 'location_on', C.blue, nm];
    }
    zoneName(key) {
      if (key === 'home') return this.fname('zone.home', 'Hjem');
      if (key === 'not_home') return '';
      return this.fname('zone.' + key, this.zoneInfo(key)[0]);
    }
    /** tall i timer ut fra enheten */
    hours(id) { const v = this.n(id); if (v == null) return null; const u = String(this.unit(id)).toLowerCase(); return u === 'min' ? v / 60 : u === 's' ? v / 3600 : u === 'h' || u === 't' ? v : v > 24 ? v / 60 : v; }
    mins(id) { const h = this.hours(id); return h == null ? null : h * 60; }
    firstOk(ids) { return ids.find(id => this.ok(id)) || null; }

    /* ---------- innhold ---------- */
    body() {
      const cfg = this.config, p = this.who(), px = p.prefix || 'sensor.__none_';
      const pst = this.st(p.entity);
      const useSwitch = (!pst || KD.BAD.has(pst.state)) && this.ok(p.posisjon);
      const state = useSwitch ? (this.v(p.posisjon) === 'on' ? 'home' : 'not_home') : pst ? pst.state : '';
      const zkey = this.zoneKey(state);
      const [zl, zi, zc] = zkey ? this.zoneInfo(zkey, state) : ['Ukjent', 'location_off', '#8e8d89', ''];
      const since = useSwitch ? (this.st(p.posisjon) || {}).last_changed : pst && pst.last_changed;
      const geo = this.at(px + 'geocoded_location', 'Locality') ? this.st(px + 'geocoded_location').attributes : {};
      const place = zkey === 'home' ? (geo.Locality || this.fname('zone.home', '')) : zkey === 'not_home' ? (geo['Sub Locality'] || geo.Locality || '') : zkey ? this.zoneName(zkey) : '';
      const sinceD = since ? new Date(since) : null;
      const sinceTxt = sinceD && !isNaN(sinceD) ? `${zl} siden ${isToday(sinceD) ? '' : WDL[sinceD.getDay()] + ' '}${KD.hm(sinceD)}${zkey === 'not_home' && geo.Locality ? ` · ${geo.Locality}` : ''}` : '';
      const away = zkey !== 'home';

      // aktivitet
      const steps = this.n(px + 'steps');
      const distId = this.firstOk([px + 'distance', px + 'walking_running_distance']);
      let dist = distId ? this.n(distId) : null;
      if (dist != null) { const u = String(this.unit(distId)).toLowerCase(); if (u === 'm' || (!u && distId.endsWith('_distance') && !distId.includes('walking') && dist > 100)) dist /= 1000; }
      const scoreId = this.firstOk([px + 'sleep_score', `sensor.${p.key}_sovn_score`, `sensor.${p.key}_sleep_score`]);
      const score = scoreId ? Math.round(this.n(scoreId)) : null;

      // søvn
      const stIds = [px + 'awake', px + 'core_sleep', px + 'deep_sleep', px + 'rem_sleep'];
      const stMin = stIds.map(id => this.mins(id));
      let dur = this.hours(px + 'sleep_duration');
      if (dur == null && stMin[1] != null && stMin[2] != null && stMin[3] != null) dur = (stMin[1] + stMin[2] + stMin[3]) / 60;
      const logH = this.cached(`kd-person-log|${p.entity}|${p.sovn}|${pst && pst.last_changed}|${(this.st(p.sovn) || {}).last_changed}|${dayStart().getTime()}`, 5 * 60e3,
        () => this.history([p.entity, p.sovn].filter(Boolean), (Date.now() - dayStart(-1).getTime() + 6 * 3600e3) / 3600e3), null);
      if (logH) this._logH = logH;
      const H = this._logH || {};
      // søvnvinduet: siste periode bryteren var «on»
      const sw = (H[p.sovn] || []).filter(x => typeof x.v === 'string' && !KD.BAD.has(x.v));
      let win = null;
      for (let i = 0; i < sw.length; i++) if (sw[i].v === 'on' && (i === 0 || sw[i - 1].v !== 'on')) { const end = sw.slice(i + 1).find(x => x.v !== 'on'); win = [sw[i].t, end ? end.t : null]; }
      if (!win && this.v(p.sovn) === 'on') { const lc = (this.st(p.sovn) || {}).last_changed; if (lc) win = [new Date(lc), null]; }
      if (dur == null && win) dur = ((win[1] || new Date()) - win[0]) / 3600e3;
      const totMin = dur != null ? Math.round(dur * 60) : null;
      const haveStages = stMin.every(x => x != null);
      const seq = haveStages ? hypnogram(stMin) : [];
      const good = score != null ? score >= 80 : dur != null && dur >= 7;
      const ok = score != null ? score >= 70 : dur != null && dur >= 6;
      const wkRaw = this.cached(`kd-person-wk|${px}sleep_duration|${dayStart().getTime()}|${(this.st(px + 'sleep_duration') || {}).last_changed}`, 30 * 60e3,
        () => this.st(px + 'sleep_duration') ? this.history([px + 'sleep_duration'], (Date.now() - dayStart(-6).getTime()) / 3600e3) : Promise.resolve({}), null);
      if (wkRaw) this._wk = wkRaw;
      const wkPts = ((this._wk || {})[px + 'sleep_duration'] || []).filter(x => typeof x.v === 'number');
      const uMul = (() => { const u = String(this.unit(px + 'sleep_duration')).toLowerCase(); return u === 'min' ? 1 / 60 : u === 's' ? 1 / 3600 : 1; })();
      const wk = this.st(px + 'sleep_duration') ? Array.from({ length: 7 }, (_, i) => {
        const d0 = dayStart(i - 6).getTime(), d1 = d0 + 864e5;
        const vals = wkPts.filter(x => x.t >= d0 && x.t < d1).map(x => x.v * uMul);
        const v = i === 6 && dur != null ? dur : vals.length ? Math.max(...vals) : 0;
        return { v, d: i === 6 ? 'i n' : WD[new Date(d0).getDay()] };
      }) : [];
      const wmax = Math.max(0.01, ...wk.map(x => x.v));

      // mobil
      const bat = this.n(px + 'battery_level');
      const bst = String(this.v(px + 'battery_state')).toLowerCase();
      const charging = ['charging', 'full', 'lader', 'fulladet'].includes(bst) || this.v(`binary_sensor.${px.slice(7)}is_charging`) === 'on';
      const conn = this.v(px + 'connection_type');
      const wifi = /wi-?fi/i.test(conn), cell = /cell|mobil/i.test(conn);
      const netShort = wifi ? 'Wi-Fi' : cell ? 'Mobildata' : conn && !KD.BAD.has(conn) ? conn : '';
      const ssid = this.ok(px + 'ssid') ? this.v(px + 'ssid') : '';
      const tech = this.at(px + 'connection_type', 'Cellular Technology', '') || this.at(px + 'connection_type', 'cellular_technology', '');
      const net = charging ? ['Lader', netShort].filter(Boolean).join(' · ') : wifi ? ['Wi-Fi', ssid || zl].join(' · ') : cell ? ['Mobildata', tech].filter(Boolean).join(' · ') : netShort;
      const trackers = this.at(p.entity, 'device_trackers', []) || [];
      const tracker = trackers.find(x => String(x).includes(px.slice(7, -1))) || trackers[0];
      const trName = tracker ? this.fname(tracker, '') : '';
      const first = String(p.navn).split(' ')[0];
      let model = trName && trName !== tracker ? trName.replace(new RegExp(`^${first}s?\\s+`, 'i'), '').replace(/\s*\(.*\)$/, '').trim() : '';
      if (!model && p.prefix) model = p.prefix.slice(7, -1).replace(new RegExp(`^${p.key}_`), '').split('_').map(w => w === 'iphone' ? 'iPhone' : w === 'ipad' ? 'iPad' : /^\d/.test(w) ? w : w[0].toUpperCase() + w.slice(1)).join(' ');
      const focusId = `binary_sensor.${px.slice(7)}focus`;
      const chips = [[charging ? 'battery_charging_full' : 'battery_5_bar', charging ? 'Lader' : 'På batteri'], netShort ? [wifi ? 'wifi' : 'signal_cellular_alt', netShort] : null,
        this.st(focusId) ? ['do_not_disturb_on', this.v(focusId) === 'on' ? 'Fokus på' : 'Fokus av'] : null,
        tracker ? ['location_on', this.ok(tracker) ? 'Posisjon deles' : 'Posisjon av'] : null].filter(Boolean).map(([icon, label]) => ({ icon, label }));
      const hasPhone = bat != null || !!p.prefix && this.st(px + 'battery_level');

      // soner i dag
      const log = [];
      const hist = (H[p.entity] || []).filter(x => typeof x.v === 'string' && !KD.BAD.has(x.v));
      const t0 = dayStart().getTime();
      for (let i = 1; i < hist.length; i++) {
        const prev = hist[i - 1].v, cur = hist[i].v, when = hist[i].t;
        if (prev === cur || when < t0) continue;
        const pk = this.zoneKey(prev), ck = this.zoneKey(cur);
        if (pk && pk !== 'not_home') { const zi2 = this.zoneInfo(pk, prev); log.push([pk === 'home' ? 'Forlot hjemmet' : `Forlot ${zi2[3]}`, this.zoneName(pk), when, pk === 'home' ? 'not_home' : pk]); }
        if (ck && ck !== 'not_home') { const zi2 = this.zoneInfo(ck, cur); log.push([ck === 'home' ? 'Kom hjem' : `Ankom ${zi2[3]}`, this.zoneName(ck), when, ck]); }
      }
      const sl = (H[p.sovn] || []).filter(x => typeof x.v === 'string' && !KD.BAD.has(x.v));
      for (let i = 1; i < sl.length; i++) if (sl[i].v !== sl[i - 1].v && sl[i].t >= t0) log.push([sl[i].v === 'on' ? 'Sovnet' : 'Våknet', cfg.sovn_rom || 'Soverom', sl[i].t, 'home']);
      log.sort((x, y) => y[2] - x[2]);

      const vals = {
        name: p.navn, initial: String(p.navn).trim()[0] || '?',
        halo: { position: 'absolute', inset: -8, borderRadius: '50%', boxShadow: `0 0 0 2px ${a(zc, 0.55)}, 0 0 40px ${a(zc, 0.25)}` },
        avatar: { width: 132, height: 132, borderRadius: 66, display: 'grid', placeItems: 'center', fontSize: 48, fontWeight: 600, background: p.farge, opacity: zkey === 'not_home' ? 0.75 : 1 },
        zoneBadge: { position: 'absolute', right: 0, bottom: 4, width: 38, height: 38, borderRadius: 19, display: 'grid', placeItems: 'center', background: '#232326', color: zc, boxShadow: '0 0 0 3px #141416' },
        zone: { label: [zl, place && place !== zl ? place : ''].filter(Boolean).join(' · '), icon: zi, since: sinceTxt },
        zoneLine: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, color: '#e6e4df' },
        zoneDot: { width: 8, height: 8, borderRadius: 4, background: zc, boxShadow: `0 0 10px ${zc}` },
        stats: [['directions_walk', steps != null ? Math.round(steps).toLocaleString('nb-NO') : '–', 'skritt', C.green, px + 'steps'],
          ['route', dist != null ? `${dist < 10 && Math.round(dist * 10) % 10 ? KD.nf(dist, 1) : Math.round(dist)} km` : '–', 'reist i dag', C.blue, distId],
          ['bedtime', score != null ? `${score}` : '–', 'søvnscore', 'oklch(0.72 0.1 275)', scoreId]].map(([icon, v, label, col, id]) => ({ icon, v, label, id, iconStyle: { fontSize: 20, color: col, fontVariationSettings: "'FILL' 1" } })),
        sleep: {
          h: totMin != null ? Math.floor(totMin / 60) : '–', m: totMin != null ? totMin % 60 : '–',
          window: win ? `${KD.hm(win[0])}–${win[1] ? KD.hm(win[1]) : 'nå'}` : '–',
          score: good ? 'God natt' : ok ? 'Grei natt' : 'Urolig natt', hasScore: score != null || dur != null,
          scoreStyle: { fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 10, background: a(good ? C.green : C.amber, 0.16), color: good ? C.green : C.amber, whiteSpace: 'nowrap' },
          blocks: seq.map((k, i) => ({ flex: 1 + (i % 3) * 0.5, background: STAGES[k][1], opacity: k === 0 ? 0.5 : 1, alignSelf: 'flex-end', height: `${[35, 60, 100, 80][k]}%`, borderRadius: 4 })),
          legend: STAGES.map(([label, c], k) => ({ label, v: stMin[k] != null ? `${Math.round(stMin[k])} min` : '–', dot: { width: 8, height: 8, borderRadius: 4, background: c } })),
          week: wk.map((w, i) => ({ d: w.d, bar: { width: '100%', maxWidth: 26, height: `${w.v / wmax * 100}%`, borderRadius: 6, background: i === 6 ? 'oklch(0.72 0.1 275)' : a('oklch(0.72 0.1 275)', 0.35) } })),
        },
        phone: { model: model || 'Mobil', bat: bat != null ? Math.round(bat) : '–', sub: net || '–', id: px + 'battery_level',
          bar: { width: `${bat != null ? bat : 0}%`, height: '100%', borderRadius: 3, background: bat != null && bat < 20 ? 'oklch(0.72 0.15 25)' : charging ? C.green : '#f2f1ee' }, chips },
        log: log.map(([text, sub, time, z], i, arr) => ({ text, sub, time: KD.hm(time), dot: { width: 9, height: 9, borderRadius: 5, marginTop: 5, background: this.zoneInfo(z)[2], flex: 'none' }, line: { flex: 1, width: 1, background: i < arr.length - 1 ? 'rgba(255,255,255,0.1)' : 'transparent', marginTop: 4 } })),
      };
      const pic = cfg.bilde && this.at(p.entity, 'entity_picture');
      if (pic) Object.assign(vals.avatar, { backgroundImage: `url('${KD.e(String(this._hass.hassUrl ? this._hass.hassUrl(pic) : pic).replace(/'/g, '%27'))}')`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' });
      const v = vals;

      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:22px">
  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Tilstedeværelse</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section style="display:flex;flex-direction:column;align-items:center;gap:14px">
    <div data-on-click="info" data-arg="${e(p.entity)}" style="position:relative;width:132px;height:132px;cursor:pointer">
      <div style="${S(v.halo)}"></div>
      <div style="${S(v.avatar)}">${pic ? '' : t(v.initial)}</div>
      <span style="${S(v.zoneBadge)}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">${t(v.zone.icon)}</span></span>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
      <div style="font-size:26px;font-weight:500;letter-spacing:-0.015em">${t(v.name)}</div>
      <div style="${S(v.zoneLine)}"><span style="${S(v.zoneDot)}"></span>${t(v.zone.label)}</div>
      <div style="font-size:13px;color:#8e8d89">${t(v.zone.since)}</div>
    </div>
  </section>

  <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
    ${v.stats.map(x => `<div data-on-click="info" data-arg="${e(x.id || '')}" style="display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:18px;background:#1c1c1f">
        <span class="ms" style="${S(x.iconStyle)}">${t(x.icon)}</span>
        <div style="display:flex;flex-direction:column;gap:1px">
          <span style="font-size:17px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap">${t(x.v)}</span>
          <span style="font-size:11px;color:#8e8d89;white-space:nowrap">${t(x.label)}</span>
        </div>
      </div>`).join('')}
  </section>

  <section style="display:flex;flex-direction:column;gap:12px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:0 4px">
      <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Søvn i natt</div>
      <div style="font-size:12px;color:#6d6c69;font-variant-numeric:tabular-nums">${t(v.sleep.window)}</div>
    </div>
    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:0 4px">
      <div style="font-size:44px;font-weight:300;letter-spacing:-0.04em;line-height:1;font-variant-numeric:tabular-nums;white-space:nowrap">${t(v.sleep.h)}<span style="font-size:15px;color:#8e8d89"> t </span>${t(v.sleep.m)}<span style="font-size:15px;color:#8e8d89"> min</span></div>
      ${v.sleep.hasScore ? `<div style="${S(v.sleep.scoreStyle)}">${t(v.sleep.score)}</div>` : ''}
    </div>
    <div style="display:flex;height:40px;border-radius:12px;overflow:hidden;gap:2px">
      ${v.sleep.blocks.map(b => `<span style="${S(b)}"></span>`).join('')}
    </div>
    <div style="display:flex;gap:14px;flex-wrap:wrap;padding:0 4px">
      ${v.sleep.legend.map(l => `<span style="display:flex;align-items:center;gap:6px;font-size:12px;color:#a9a7a2;white-space:nowrap"><span style="${S(l.dot)}"></span>${t(l.label)}<span style="color:#6d6c69;font-variant-numeric:tabular-nums">${t(l.v)}</span></span>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;height:64px;align-items:end;padding-top:6px">
      ${v.sleep.week.map(w => `<div style="display:flex;flex-direction:column;align-items:center;gap:5px;height:100%;justify-content:flex-end">
          <div style="${S(w.bar)}"></div>
          <span style="font-size:10px;color:#6d6c69">${t(w.d)}</span>
        </div>`).join('')}
    </div>
  </section>

  ${hasPhone ? `<section style="display:flex;flex-direction:column;gap:8px">
    <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:0 4px">Mobil</div>
    <div data-on-click="info" data-arg="${e(v.phone.id)}" style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:22px;background:#1c1c1f;cursor:pointer">
      <span style="width:40px;height:40px;border-radius:20px;background:#232326;display:grid;place-items:center;flex:none"><span class="ms" style="font-size:22px">smartphone</span></span>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;justify-content:space-between;gap:10px">
          <span style="font-size:14px;font-weight:500;white-space:nowrap">${t(v.phone.model)}</span>
          <span style="font-size:13px;font-weight:500;font-variant-numeric:tabular-nums">${t(v.phone.bat)} %</span>
        </div>
        <div style="height:5px;border-radius:3px;background:#2a2a2d;overflow:hidden"><div style="${S(v.phone.bar)}"></div></div>
        <span style="font-size:12px;color:#8e8d89">${t(v.phone.sub)}</span>
      </div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${v.phone.chips.map(c => `<span style="height:30px;padding:0 11px 0 8px;border-radius:15px;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:500;background:#1c1c1f;color:#c9c7c2;white-space:nowrap"><span class="ms" style="font-size:16px;color:#8e8d89">${t(c.icon)}</span>${t(c.label)}</span>`).join('')}
    </div>
  </section>` : ''}

  <section style="display:flex;flex-direction:column;gap:8px">
    <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:0 4px">Soner i dag</div>
    <div style="display:flex;flex-direction:column;padding-left:4px">
      ${v.log.map(x => `<div style="display:flex;gap:14px;align-items:stretch">
          <div style="display:flex;flex-direction:column;align-items:center;width:10px;flex:none">
            <span style="${S(x.dot)}"></span>
            <span style="${S(x.line)}"></span>
          </div>
          <div style="flex:1;display:flex;justify-content:space-between;gap:12px;padding-bottom:14px">
            <div style="display:flex;flex-direction:column;gap:2px">
              <div style="font-size:14px">${t(x.text)}</div>
              <div style="font-size:12px;color:#8e8d89">${t(x.sub)}</div>
            </div>
            <div style="font-size:12px;color:#8e8d89;font-variant-numeric:tabular-nums">${t(x.time)}</div>
          </div>
        </div>`).join('')}
      ${!v.log.length && this._logH ? `<div style="padding:4px 0 8px;font-size:13px;color:#6d6c69">Ingen soneendringer i dag</div>` : ''}
    </div>
  </section>
</div>`;
    }
    info(ev, id) { if (id) this.more(id); }
  }

  KD.define('kd-person-card', KDPersonCard, 'KD Person', 'Tilstedeværelse: sone, aktivitet, søvn i natt, mobil og soner i dag for én person.');
  KD.sheet('person', 'kd-person-card');
})();
} catch (e) { console.error('ki-hjem-design: 32-kd-person-card.js', e); }

/* ===== 40-kd-vanning-card.js ===== */
try {
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
} catch (e) { console.error('ki-hjem-design: 40-kd-vanning-card.js', e); }

/* ===== 41-kd-planter-card.js ===== */
try {
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
<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:22px">
  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Planter</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section style="display:flex;flex-direction:column;gap:6px;padding:0 4px">
    <div style="${S(statusStyle)}"><span style="${S(statusDot)}"></span><span>${e(status)}</span></div>
    <div style="font-size:24px;font-weight:500;letter-spacing:-0.015em"><span>${e(headline)}</span></div>
    <div style="font-size:14px;color:#8e8d89">${subHtml}</div>
  </section>

  ${KD.segHTML('fane', [['enkel', 'Enkel'], ['avansert', 'Avansert']], s.tab, 'tab', { pink: true })}

  <section style="display:flex;flex-direction:column;gap:8px">
    ${cards || `<div style="padding:16px;border-radius:24px;background:#1c1c1f;font-size:13px;color:#8e8d89">Legg til planter i KI Planter-integrasjonen.</div>`}
  </section>
</div>`;
    }
  }

  KD.define('kd-planter-card', KDPlanterCard, 'KD Planter', 'Planter fra KI Planter – jordfukt og vanning (pikselkopi av Claude Design)');
  KD.sheet('plants', 'kd-planter-card');
})();
} catch (e) { console.error('ki-hjem-design: 41-kd-planter-card.js', e); }

/* ===== 42-kd-sovn-card.js ===== */
try {
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
<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:22px">
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

  ${KD.segHTML('fane', [['sleep', 'Søvn'], ['wake', 'Vekking']], s.tab, 'tab', { pink: true })}

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
} catch (e) { console.error('ki-hjem-design: 42-kd-sovn-card.js', e); }

/* ===== 43-kd-vaer-card.js ===== */
try {
/*
 * kd-vaer-card — «Vær» fra Claude Design, som Home Assistant-kort.
 *
 * type: custom:kd-vaer-card            # virker uten konfig
 * sted: Strømstad                      # stedsnavn i toppen
 * vaer: weather.forecast_home          # værentitet: nå-verdier + time-/dagsprognose (weather/subscribe_forecast)
 * naa: sensor.weather_forecast_v2      # valgfri: attributtet current (feels_like, uv_index …) fyller hull
 * sol: sun.sun                         # soloppgang/-nedgang, daggry/skumring, høyde nå
 * maane: sensor.oslo_moon_phase        # månefase (tilstand); opplyst andel, opp/ned og neste fullmåne regnes ut
 * pollen: auto                         # auto = alle sensor.pollen_<type>_…_pollen_today|tomorrow|…, eller liste med entiteter
 * luft: { aqi, pm25, pm10, no2, o3, stasjon }   # luftkvalitet; tom = oppdages via device_class (aqi, pm25, pm10, nitrogen_dioxide, ozone)
 * timer: 12                            # antall timer i «Neste timer»
 * dager: 7                             # antall dager i «7 dager»
 */
(() => {
  const KD = window.KD;
  const { S, e } = KD;
  const BLUE = 'oklch(0.8 0.12 250)', SUN = 'oklch(0.86 0.12 95)';
  const nf1 = (n, d = 1) => Number(n).toLocaleString('nb-NO', { minimumFractionDigits: d, maximumFractionDigits: d });
  const cap = t => t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  const COND = {
    'clear-night': ['Klart', 'clear_night'], cloudy: ['Overskyet', 'cloud'], exceptional: ['Ekstremvær', 'warning'], fog: ['Tåke', 'foggy'],
    hail: ['Hagl', 'weather_hail'], lightning: ['Torden', 'thunderstorm'], 'lightning-rainy': ['Torden og regn', 'thunderstorm'],
    partlycloudy: ['Delvis skyet', 'partly_cloudy_day'], pouring: ['Kraftig regn', 'rainy'], rainy: ['Regn', 'rainy'], snowy: ['Snø', 'weather_snowy'],
    'snowy-rainy': ['Sludd', 'weather_mix'], sunny: ['Sol', 'sunny'], windy: ['Vind', 'air'], 'windy-variant': ['Vind', 'air'],
  };
  const icon = (c, night) => { const ic = (COND[c] || ['', 'cloud'])[1]; return night && ic === 'sunny' ? 'clear_night' : ic; };
  const col = ic => ic === 'sunny' || ic === 'partly_cloudy_day' ? SUN : /rain|thunder|weather_mix|weather_hail/.test(ic) ? BLUE : '#bdbbb6';
  const DIRS = [['N', 'nord'], ['NØ', 'nordøst'], ['Ø', 'øst'], ['SØ', 'sørøst'], ['S', 'sør'], ['SV', 'sørvest'], ['V', 'vest'], ['NV', 'nordvest']];
  const BFT = [[0.3, 'stille'], [1.6, 'flau vind'], [3.4, 'svak vind'], [5.5, 'lett bris'], [8, 'laber bris'], [10.8, 'frisk bris'], [13.9, 'liten kuling'], [17.2, 'stiv kuling'], [20.8, 'sterk kuling'], [24.5, 'liten storm'], [28.5, 'full storm'], [32.7, 'sterk storm'], [Infinity, 'orkan']];
  const UV = [[3, 'lav'], [6, 'moderat'], [8, 'høy'], [11, 'svært høy'], [Infinity, 'ekstrem']];
  const MOONNAME = { new_moon: 'Nymåne', waxing_crescent: 'Voksende månesigd', first_quarter: 'Første kvarter', waxing_gibbous: 'Voksende halvmåne',
    full_moon: 'Fullmåne', waning_gibbous: 'Minkende halvmåne', last_quarter: 'Siste kvarter', waning_crescent: 'Minkende månesigd' };
  const POLLEN = { birch: ['Bjørk', 'park'], bjork: ['Bjørk', 'park'], grass: ['Gress', 'grass'], gress: ['Gress', 'grass'], mugwort: ['Burot', 'eco'], burot: ['Burot', 'eco'],
    alder: ['Or', 'forest'], or: ['Or', 'forest'], hazel: ['Hassel', 'nature'], hassel: ['Hassel', 'nature'], salix: ['Salix', 'spa'], willow: ['Salix', 'spa'] };
  const PORDER = ['Bjørk', 'Gress', 'Burot', 'Or', 'Hassel', 'Salix'];
  const PDAY = { today: 0, i_dag: 0, idag: 0, tomorrow: 1, i_morgen: 1, imorgen: 1, day_after_tomorrow: 2, overmorgen: 2, in_2_days: 2 };
  const L = [['Ingen', '#3a3a3d'], ['Lite', 'oklch(0.8 0.14 150)'], ['Moderat', 'oklch(0.86 0.13 95)'], ['Kraftig', 'oklch(0.76 0.15 55)'], ['Ekstrem', 'oklch(0.66 0.2 25)']];

  /* ---------- sol og måne (kompakt port av SunCalc, © Vladimir Agafonkin, BSD-2) ---------- */
  const rad = Math.PI / 180, dayMs = 864e5, J1970 = 2440588, J2000 = 2451545, ob = rad * 23.4397;
  const toJ = d => d / dayMs - 0.5 + J1970, fromJ = j => new Date((j + 0.5 - J1970) * dayMs), toDays = d => toJ(d) - J2000;
  const raA = (l, b) => Math.atan2(Math.sin(l) * Math.cos(ob) - Math.tan(b) * Math.sin(ob), Math.cos(l));
  const decA = (l, b) => Math.asin(Math.sin(b) * Math.cos(ob) + Math.cos(b) * Math.sin(ob) * Math.sin(l));
  const sidT = (d, lw) => rad * (280.16 + 360.9856235 * d) - lw;
  const altA = (H, phi, dec) => Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const sMA = d => rad * (357.5291 + 0.98560028 * d);
  const eLon = M => M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI;
  const sunCoords = d => { const L0 = eLon(sMA(d)); return { dec: decA(L0, 0), ra: raA(L0, 0) }; };
  const sunTimes = (date, lat, lng) => {
    const lw = rad * -lng, phi = rad * lat, d = toDays(date), n = Math.round(d - 0.0009 - lw / (2 * Math.PI));
    const ds = 0.0009 + lw / (2 * Math.PI) + n, M = sMA(ds), Lc = eLon(M), dec = decA(Lc, 0);
    const Jnoon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * Lc);
    const at = h => { const w = Math.acos((Math.sin(h * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec))); if (isNaN(w)) return [null, null];
      const a = 0.0009 + (w + lw) / (2 * Math.PI) + n, Jset = J2000 + a + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * Lc); return [fromJ(Jnoon - (Jset - Jnoon)), fromJ(Jset)]; };
    const [rise, set] = at(-0.833), [dawn, dusk] = at(-6), [, golden] = at(6);
    return { rise, set, dawn, dusk, golden };
  };
  const moonCoords = d => { const Lm = rad * (218.316 + 13.176396 * d), M = rad * (134.963 + 13.064993 * d), F = rad * (93.272 + 13.229350 * d);
    const l = Lm + rad * 6.289 * Math.sin(M), b = rad * 5.128 * Math.sin(F), dt = 385001 - 20905 * Math.cos(M); return { ra: raA(l, b), dec: decA(l, b), dist: dt }; };
  const moonIllum = date => { const d = toDays(date), s = sunCoords(d), m = moonCoords(d), sd = 149598000;
    const phi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra));
    const inc = Math.atan2(sd * Math.sin(phi), m.dist - sd * Math.cos(phi));
    const angle = Math.atan2(Math.cos(s.dec) * Math.sin(s.ra - m.ra), Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra));
    return { fraction: (1 + Math.cos(inc)) / 2, phase: 0.5 + 0.5 * inc * (angle < 0 ? -1 : 1) / Math.PI }; };
  const moonAlt = (date, lat, lng) => { const lw = rad * -lng, phi = rad * lat, d = toDays(date), c = moonCoords(d), H = sidT(d, lw) - c.ra; let h = altA(H, phi, c.dec);
    h += rad * 0.017 / Math.tan(h + rad * 10.26 / (h + rad * 5.10)); return h; };
  const moonTimes = (date, lat, lng) => { // opp/ned innen døgnet (lokal tid) som starter ved date
    const t = new Date(date); t.setHours(0, 0, 0, 0); const hc = 0.133 * rad; let h0 = moonAlt(t, lat, lng) - hc, rise, set;
    const hA = h => new Date(+t + h * 3600e3);
    for (let i = 1; i <= 24; i += 2) {
      const h1 = moonAlt(hA(i), lat, lng) - hc, h2 = moonAlt(hA(i + 1), lat, lng) - hc;
      const a = (h0 + h2) / 2 - h1, b = (h2 - h0) / 2, xe = -b / (2 * a), ye = (a * xe + b) * xe + h1, dd = b * b - 4 * a * h1; let roots = 0, x1 = 0, x2 = 0;
      if (dd >= 0) { const dx = Math.sqrt(dd) / (Math.abs(a) * 2); x1 = xe - dx; x2 = xe + dx; if (Math.abs(x1) <= 1) roots++; if (Math.abs(x2) <= 1) roots++; if (x1 < -1) x1 = x2; }
      if (roots === 1) { if (h0 < 0) rise = i + x1; else set = i + x1; } else if (roots === 2) { rise = i + (ye < 0 ? x2 : x1); set = i + (ye < 0 ? x1 : x2); }
      if (rise && set) break; h0 = h2;
    }
    return { rise: rise ? hA(rise) : null, set: set ? hA(set) : null };
  };

  class KDVaerCard extends KD.KDSheet {
    static head() { return ['partly_cloudy_day', 'Vær', (this.config && this.config.sted) || 'Strømstad']; }
    static defaults = { sted: 'Strømstad', vaer: 'weather.forecast_home', naa: 'sensor.weather_forecast_v2', sol: 'sun.sun', maane: 'sensor.oslo_moon_phase', pollen: 'auto', luft: {}, timer: 12, dager: 7 };

    constructor() { super(); this._fc = {}; this._subs = []; }
    onConnect() { super.onConnect(); this._subscribe(); }
    onDisconnect() { super.onDisconnect(); this._unsub(); }
    _unsub() { for (const u of this._subs) { try { Promise.resolve(u).then(f => typeof f === 'function' && f()).catch(() => {}); } catch (x) { } } this._subs = []; this._subFor = null; }
    /* Prognoser: weather/subscribe_forecast (levende), med weather.get_forecasts som reserve */
    _subscribe() {
      const h = this.hass, id = this.config.vaer;
      if (!h || !id || !this._connected || this._subFor === id) return;
      this._unsub(); this._subFor = id;
      for (const type of ['hourly', 'daily']) {
        const fallback = () => this.ws({ type: 'call_service', domain: 'weather', service: 'get_forecasts', service_data: { type }, target: { entity_id: id }, return_response: true })
          .then(r => { const f = r && r.response && r.response[id]; if (f && f.forecast) { this._fc[type] = f.forecast; this._queue(); } }).catch(err => console.warn('kd-vaer forecast', err));
        if (h.connection && h.connection.subscribeMessage) {
          const p = h.connection.subscribeMessage(m => { this._fc[type] = (m && m.forecast) || []; this._queue(); }, { type: 'weather/subscribe_forecast', forecast_type: type, entity_id: id });
          this._subs.push(p);
          Promise.resolve(p).catch(fallback);
          setTimeout(() => { if (!this._fc[type]) fallback(); }, 4000);
        } else fallback();
      }
    }
    render() { this._subscribe(); return super.render(); }

    loc() { const c = this.hass && this.hass.config; return c && c.latitude != null ? [c.latitude, c.longitude] : null; }

    body() {
      const cfg = this.config, W = this.st(cfg.vaer), wa = (W && W.attributes) || {};
      const cur = this.at(cfg.naa, 'current', {}) || {};
      const sun = this.st(cfg.sol), sa = (sun && sun.attributes) || {};
      const night = sun ? sun.state === 'below_horizon' : false;
      const hourly = (this._fc.hourly || wa.forecast || []).filter(f => new Date(f.datetime) > Date.now() - 3600e3);
      const daily = this._fc.daily || [];
      const ms = (v, unit) => v == null || isNaN(v) ? null : /km/.test(unit || '') ? v / 3.6 : /mph/.test(unit || '') ? v * 0.44704 : v;
      const wu = wa.wind_speed_unit || 'km/h';
      const num = v => v == null || v === '' || isNaN(parseFloat(v)) ? null : parseFloat(v);

      // nå
      const T = num(wa.temperature) != null ? num(wa.temperature) : num(cur.temperature);
      const cond = W ? W.state : cur.condition;
      const nowIcon = icon(cond, night);
      const feels = num(wa.apparent_temperature) != null ? num(wa.apparent_temperature) : num(cur.feels_like);
      const today = daily[0];
      const now = { t: T == null ? '–' : nf1(T), desc: (COND[cond] || [cond || '–'])[0], icon: nowIcon,
        sub: [feels != null ? `Føles som ${Math.round(feels)}°` : '', today ? `H ${Math.round(today.temperature)}° L ${Math.round(today.templow)}°` : ''].filter(Boolean).join(' · ') || '–' };

      // regn neste timer
      const hrs = hourly.slice(0, Number(cfg.timer) || 12);
      const hh = d => KD.hh(new Date(d).getHours());
      const next24 = hourly.slice(0, 24);
      let rainNote = next24.length ? 'Ingen nedbør de neste 24 timene.' : 'Ingen prognose tilgjengelig ennå.';
      const wet = next24.map(f => (num(f.precipitation) || 0) >= 0.1);
      const fi = wet.indexOf(true);
      if (fi >= 0) {
        let li = fi; while (li + 1 < next24.length && wet[li + 1]) li++;
        let mx = fi; for (let i = fi; i <= li; i++) if ((num(next24[i].precipitation) || 0) > (num(next24[mx].precipitation) || 0)) mx = i;
        const kind = /snow/.test(next24[mx].condition || '') ? 'Snø' : /snowy-rainy/.test(next24[mx].condition || '') ? 'Sludd' : 'Regn';
        rainNote = `${fi === 0 ? `${kind} nå` : `${kind} fra rundt ${hh(next24[fi].datetime)}:00`}, mest ved ${hh(next24[mx].datetime)}. ` + (li + 1 < next24.length ? `Oppholdsvær igjen fra ${hh(next24[li + 1].datetime)}.` : 'Nedbør resten av døgnet.');
      }
      const maxMm = Math.max(0, ...hrs.map(f => num(f.precipitation) || 0));
      const hours = hrs.map((f, i) => { const mm = num(f.precipitation) || 0, dt = new Date(f.datetime), hr = dt.getHours();
        const n = sun && sa.next_rising ? this.isNightAt(dt, sa) : false; const ic = icon(f.condition, n);
        return { time: i ? KD.hh(hr) : 'Nå', t: Math.round(num(f.temperature)), icon: ic, mm: mm >= 0.05 ? nf1(mm) : '',
          card: { flex: 'none', width: 56, padding: '10px 0 8px', borderRadius: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: i ? '#1c1c1f' : '#2a2a2d' },
          iconStyle: { fontSize: 24, color: col(ic), fontVariationSettings: "'FILL' 1" },
          rain: { width: 8, height: mm >= 0.05 && maxMm ? `${Math.max(12, mm / maxMm * 100)}%` : 0, borderRadius: 4, background: BLUE } }; });

      // dager
      const dd = daily.slice(0, Number(cfg.dager) || 7);
      const lo = Math.min(...dd.map(d => num(d.templow) != null ? num(d.templow) : num(d.temperature))), hi = Math.max(...dd.map(d => num(d.temperature)));
      const span = hi - lo || 1;
      const days = dd.map((d, i) => { const dt = new Date(d.datetime), l = Math.round(num(d.templow) != null ? num(d.templow) : num(d.temperature)), h = Math.round(num(d.temperature)); const lv = num(d.templow) != null ? num(d.templow) : num(d.temperature), hv = num(d.temperature);
        const same = dt.toDateString() === new Date().toDateString();
        return { day: same || (!i && dt < Date.now()) ? 'I dag' : cap(dt.toLocaleDateString('nb-NO', { weekday: 'short' }).replace('.', '')), icon: icon(d.condition, false), lo: l, hi: h,
          row: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 4px', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' },
          iconStyle: { fontSize: 22, color: col(icon(d.condition, false)), fontVariationSettings: "'FILL' 1", width: 26 },
          range: { position: 'absolute', top: 0, bottom: 0, left: `${(lv - lo) / span * 100}%`, width: `${(hv - lv) / span * 100}%`, borderRadius: 3, background: `linear-gradient(90deg, ${BLUE}, ${SUN})` } }; });

      // detaljer
      const wind = ms(num(wa.wind_speed), wu), gust = ms(num(wa.wind_gust_speed), wu), bearing = num(wa.wind_bearing);
      const dir = bearing == null ? null : DIRS[Math.round(((bearing % 360) + 360) % 360 / 45) % 8];
      const uv = num(wa.uv_index) != null ? num(wa.uv_index) : num(cur.uv_index);
      const uvTxt = uv == null ? '–' : `${Math.round(uv)} · ${UV.find(([g]) => uv < g)[1]}`;
      const pres = num(wa.pressure);
      const loc = this.loc(), todayD = new Date();
      const st = loc ? sunTimes(todayD, loc[0], loc[1]) : {};
      const pick = (attr, calc) => { const v = sa[attr] ? new Date(sa[attr]) : null; return v && v.toDateString() === todayD.toDateString() ? v : calc || (v ? new Date(+v - dayMs) : null); };
      const rise = pick('next_rising', st.rise), set = pick('next_setting', st.set), dawn = pick('next_dawn', st.dawn), dusk = pick('next_dusk', st.dusk);
      const tm = d => d && !isNaN(d) ? KD.hm(d) : '–';
      const dayPrecip = today && num(today.precipitation) != null ? num(today.precipitation) : null;
      const sum24 = next24.length ? next24.reduce((t, f) => t + (num(f.precipitation) || 0), 0) : null;
      const details = [['air', 'Vind', wind == null ? '–' : `${Math.round(wind)} m/s${dir ? ' ' + dir[0] : ''}`], ['humidity_percentage', 'Fukt', num(wa.humidity) != null ? `${Math.round(num(wa.humidity))} %` : '–'],
        ['light_mode', 'UV', uvTxt], ['compress', 'Trykk', pres != null ? `${Math.round(pres)} hPa` : '–'], ['wb_twilight', 'Sol ned', tm(set)], ['water_drop', 'Nedbør i døgn', dayPrecip != null ? `${nf1(dayPrecip)} mm` : '–']];
      const p3 = hourly.find(f => num(f.pressure) != null && new Date(f.datetime) - Date.now() > 2.5 * 3600e3);
      const trend = pres == null || !p3 ? '–' : num(p3.pressure) - pres < -1 ? 'Synkende' : num(p3.pressure) - pres > 1 ? 'Stigende' : 'Stabil';
      const fog = num(wa.fog_area_fraction) != null ? num(wa.fog_area_fraction) : num(wa.fog);
      const more = [['dew_point', 'Duggpunkt', num(wa.dew_point) != null ? `${nf1(num(wa.dew_point))}°` : '–'], ['cloud', 'Skydekke', num(wa.cloud_coverage) != null ? `${Math.round(num(wa.cloud_coverage))} %` : '–'],
        ['visibility', 'Sikt', num(wa.visibility) != null ? `${Math.round(num(wa.visibility))} ${wa.visibility_unit || 'km'}` : '–'], ['trending_down', 'Trykk', trend],
        ['rainy', 'Nedbør 24 t', sum24 != null ? `${nf1(sum24)} mm` : '–'], ['foggy', 'Tåke', fog != null ? `${Math.round(fog)} %` : '–']];
      if (trend === 'Stigende') more[3][0] = 'trending_up'; else if (trend === 'Stabil') more[3][0] = 'trending_flat';

      const windV = { dir: dir ? dir[1] : '–', speed: wind == null ? '–' : nf1(wind), gust: gust == null ? '–' : nf1(gust), beaufort: wind == null ? '–' : BFT.find(([g]) => wind < g)[1],
        arrow: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', transform: `rotate(${bearing == null ? 0 : Math.round((bearing + 180) % 360)}deg)`, transition: 'transform 1.2s cubic-bezier(.34,1.3,.64,1)' },
        ticks: [['N', 50, 10], ['Ø', 90, 50], ['S', 50, 90], ['V', 10, 50]].map(([t, x, y]) => ({ t, style: { position: 'absolute', left: x + '%', top: y + '%', transform: 'translate(-50%,-50%)', fontSize: 10, fontWeight: 600, color: t === 'N' ? '#f2f1ee' : '#6d6c69' } })) };

      // sol
      const sunV = (() => {
        const len = rise && set ? (set - rise) / 60e3 : null;
        const p = rise && set ? Math.max(0, Math.min(1, (Date.now() - rise) / (set - rise))) : 0, up = sun ? sun.state === 'above_horizon' : false, ang = Math.PI * (1 - p);
        const el = num(sa.elevation);
        return { len: len == null ? '–' : `${Math.floor(len / 60)} t ${Math.round(len % 60)} min`,
          dot: { position: 'absolute', left: 'calc(' + (50 + Math.cos(ang) * 50) + '% - 10px)', top: (96 - Math.sin(ang) * 88 - 10) + 'px', width: 20, height: 20, borderRadius: 10, background: up ? 'oklch(0.86 0.14 85)' : '#5d5c5a', boxShadow: up ? '0 0 20px oklch(0.86 0.14 85 / 0.8)' : 'none' },
          rows: [['Soloppgang', tm(rise)], ['Solnedgang', tm(set)], ['Høyde nå', el == null ? '–' : `${el.toLocaleString('nb-NO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}°`], ['Daggry', tm(dawn)], ['Skumring', tm(dusk)], ['Gyllen time', tm(sa.golden_hour ? new Date(sa.golden_hour) : st.golden)]] };
      })();

      // måne
      const moonV = (() => {
        const mst = this.st(cfg.maane), ma = (mst && mst.attributes) || {};
        const il = moonIllum(new Date());
        const frac = num(ma.illumination) != null ? num(ma.illumination) / 100 : il.fraction;
        const waxing = mst && /waxing|first_quarter|new_moon/.test(mst.state) ? true : mst && /waning|last_quarter|full_moon/.test(mst.state) ? false : il.phase < 0.5;
        const name = mst ? (MOONNAME[mst.state] || cap(String(mst.state).replace(/_/g, ' '))) : (il.phase < 0.03 || il.phase > 0.97 ? 'Nymåne' : Math.abs(il.phase - 0.5) < 0.03 ? 'Fullmåne' : il.phase < 0.5 ? 'Voksende' : 'Minkende');
        let rs = { rise: ma.moonrise ? new Date(ma.moonrise) : null, set: ma.moonset ? new Date(ma.moonset) : null };
        if (loc && (!rs.rise || !rs.set)) { const mt = moonTimes(new Date(), loc[0], loc[1]); rs = { rise: rs.rise || mt.rise, set: rs.set || mt.set }; if (rs.set && rs.rise && rs.set < rs.rise) { const t2 = moonTimes(new Date(Date.now() + dayMs), loc[0], loc[1]); if (t2.set) rs.set = t2.set; } }
        let full = ma.next_full_moon ? new Date(ma.next_full_moon) : null;
        if (!full) { const syn = 29.530588853, ph = il.phase; let dd2 = ((0.5 - ph + 1) % 1) * syn; if (dd2 < 0.5) dd2 += syn; full = new Date(Date.now() + dd2 * dayMs); }
        const sub = [rs.rise ? `Opp ${KD.hm(rs.rise)}` : '', rs.set ? `ned ${KD.hm(rs.set)}` : '', full ? `fullmåne ${full.getDate()}. ${full.toLocaleDateString('nb-NO', { month: 'short' }).replace('.', '')}` : ''].filter(Boolean).join(' · ');
        const w = `${Math.round((1 - frac) * 100)}%`;
        return { name, illum: `${Math.round(frac * 100)} %`, sub,
          shadow: waxing ? { position: 'absolute', top: 0, bottom: 0, left: 0, width: w, background: '#16161a', boxShadow: '6px 0 14px rgba(0,0,0,0.5)' }
            : { position: 'absolute', top: 0, bottom: 0, right: 0, width: w, background: '#16161a', boxShadow: '-6px 0 14px rgba(0,0,0,0.5)' } };
      })();

      // luftkvalitet
      const aq = this.air();
      // pollen
      const pollen = this.pollen();

      return `
<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:22px">
  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Vær · <span>${e(cfg.sted || '')}</span></div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section data-on-click="moreW" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 4px;cursor:pointer">
    <div style="display:flex;flex-direction:column;gap:6px">
      <div style="font-size:84px;font-weight:300;letter-spacing:-0.06em;line-height:0.85;font-variant-numeric:tabular-nums"><span>${e(now.t)}</span>°</div>
      <div style="font-size:18px;font-weight:500"><span>${e(now.desc)}</span></div>
      <div style="font-size:13px;color:#8e8d89;white-space:nowrap"><span>${e(now.sub)}</span></div>
    </div>
    <span class="ms" style="font-size:96px;color:#bdbbb6;font-variation-settings:'FILL' 1"><span>${e(now.icon)}</span></span>
  </section>

  <section style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:18px;background:oklch(0.8 0.12 250 / 0.12);box-shadow:inset 0 0 0 1px oklch(0.8 0.12 250 / 0.3)">
    <span class="ms" style="font-size:20px;color:oklch(0.8 0.12 250);font-variation-settings:'FILL' 1">umbrella</span>
    <span style="font-size:13px;line-height:1.35;text-wrap:pretty"><span>${e(rainNote)}</span></span>
  </section>

  <section style="display:flex;flex-direction:column;gap:8px">
    <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:0 4px">Neste timer</div>
    <div data-hscroll="1" style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 calc(-1 * var(--kd-kant,10px));padding:0 var(--kd-kant,10px)">
      ${hours.map(h => `
        <div style="${S(h.card)}">
          <span style="font-size:11px;color:#8e8d89;font-variant-numeric:tabular-nums"><span>${h.time}</span></span>
          <span class="ms" style="${S(h.iconStyle)}"><span>${h.icon}</span></span>
          <span style="font-size:15px;font-weight:500;font-variant-numeric:tabular-nums"><span>${isNaN(h.t) ? '–' : h.t}</span>°</span>
          <div style="width:100%;height:28px;display:flex;align-items:flex-end;justify-content:center"><span style="${S(h.rain)}"></span></div>
          <span style="font-size:10px;color:oklch(0.8 0.12 250);font-variant-numeric:tabular-nums;height:12px"><span>${h.mm}</span></span>
        </div>`).join('') || `<div style="font-size:13px;color:#8e8d89;padding:12px 4px">Henter prognose …</div>`}
    </div>
  </section>

  <section style="display:flex;flex-direction:column;gap:2px">
    <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:0 4px 8px"><span>${days.length || 7}</span> dager</div>
    ${days.map(d => `
      <div style="${S(d.row)}">
        <span style="width:52px;font-size:14px;font-weight:500"><span>${e(d.day)}</span></span>
        <span class="ms" style="${S(d.iconStyle)}"><span>${d.icon}</span></span>
        <span style="width:30px;text-align:right;font-size:13px;color:#8e8d89;font-variant-numeric:tabular-nums"><span>${d.lo}</span>°</span>
        <div style="flex:1;position:relative;height:5px;border-radius:3px;background:#1f1f22"><span style="${S(d.range)}"></span></div>
        <span style="width:30px;font-size:13px;font-weight:500;font-variant-numeric:tabular-nums"><span>${d.hi}</span>°</span>
      </div>`).join('')}
  </section>

  <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
    ${details.map(([ic, label, v]) => `
      <div style="display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:18px;background:#1c1c1f">
        <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:#8e8d89;white-space:nowrap"><span class="ms" style="font-size:15px"><span>${ic}</span></span><span>${label}</span></span>
        <span style="font-size:17px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap"><span>${e(v)}</span></span>
      </div>`).join('')}
  </section>

  <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
    ${more.map(([ic, k, v]) => `
      <div style="display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:18px;background:#1c1c1f">
        <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:#8e8d89;white-space:nowrap"><span class="ms" style="font-size:15px"><span>${ic}</span></span><span>${k}</span></span>
        <span style="font-size:16px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap"><span>${e(v)}</span></span>
      </div>`).join('')}
  </section>

  <section style="display:flex;align-items:center;gap:16px;padding:16px;border-radius:26px;background:#1c1c1f">
    <div style="position:relative;width:104px;height:104px;flex:none;border-radius:50%;background:#262629;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05)">
      ${windV.ticks.map(k => `<span style="${S(k.style)}"><span>${k.t}</span></span>`).join('')}
      <div style="${S(windV.arrow)}"><span class="ms" style="font-size:30px;color:oklch(0.8 0.12 250);font-variation-settings:'FILL' 1">navigation</span></div>
    </div>
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
      <span style="font-size:12px;color:#8e8d89">Vind fra <span>${e(windV.dir)}</span></span>
      <span style="font-size:34px;font-weight:300;letter-spacing:-0.03em;line-height:1"><span>${e(windV.speed)}</span><span style="font-size:14px;color:#8e8d89"> m/s</span></span>
      <span style="font-size:12px;color:#a9a7a2">Kast opptil <span>${e(windV.gust)}</span> m/s · <span>${e(windV.beaufort)}</span></span>
    </div>
  </section>

  <section style="display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:26px;background:#1c1c1f">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><span style="font-size:15px;font-weight:500">Sol</span><span style="font-size:12px;color:#8e8d89"><span>${e(sunV.len)}</span> dagslys</span></div>
    <div style="position:relative;height:96px;margin:0 8px">
      <div style="position:absolute;left:0;right:0;top:8px;height:176px;border-radius:50%;border:1.5px dashed #3a3a3d;clip-path:inset(0 0 45% 0)"></div>
      <div style="position:absolute;left:-8px;right:-8px;top:96px;height:1px;background:#3a3a3d"></div>
      <div style="${S(sunV.dot)}"></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
      ${sunV.rows.map(([k, v]) => `<div style="display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:16px;background:#262629"><span style="font-size:10px;color:#8e8d89;white-space:nowrap"><span>${k}</span></span><span style="font-size:14px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap"><span>${e(v)}</span></span></div>`).join('')}
    </div>
  </section>

  <section style="display:flex;align-items:center;gap:18px;padding:16px;border-radius:26px;background:#1c1c1f">
    <div style="position:relative;width:84px;height:84px;flex:none;border-radius:50%;background:#e9e4d6;overflow:hidden;box-shadow:0 0 30px rgba(233,228,214,0.18)">
      <div style="${S(moonV.shadow)}"></div>
    </div>
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">
      <span style="font-size:12px;color:#8e8d89">Måne · <span>${e(moonV.illum)}</span> opplyst</span>
      <span style="font-size:18px;font-weight:500"><span>${e(moonV.name)}</span></span>
      <span style="font-size:12px;color:#a9a7a2"><span>${e(moonV.sub)}</span></span>
    </div>
  </section>

  ${aq ? `
  <section style="display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:26px;background:#1c1c1f">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><span style="font-size:15px;font-weight:500">Luftkvalitet</span><span style="font-size:12px;color:#8e8d89"><span>${e(aq.station)}</span></span></div>
    <div style="display:flex;align-items:baseline;gap:10px"><span style="font-size:34px;font-weight:300;letter-spacing:-0.03em;line-height:1"><span>${e(aq.aqi)}</span></span><span style="${S(aq.labelStyle)}"><span>${e(aq.label)}</span></span></div>
    <div style="position:relative;height:8px;border-radius:4px;background:linear-gradient(90deg, oklch(0.8 0.14 150), oklch(0.86 0.13 95), oklch(0.76 0.15 55), oklch(0.66 0.2 25), oklch(0.55 0.18 330))">
      <span style="${S(aq.marker)}"></span>
    </div>
    <div style="display:flex;flex-direction:column">
      ${aq.rows.map(r => `
        <div data-on-click="moreId" data-arg="${e(r.id)}" style="${S(r.row)}">
          <span style="width:52px;font-size:13px;font-weight:500"><span>${r.k}</span></span>
          <span style="flex:1;height:6px;border-radius:3px;background:#262629;overflow:hidden"><span style="${S(r.bar)}"></span></span>
          <span style="width:74px;text-align:right;font-size:12px;color:#c9c7c2;font-variant-numeric:tabular-nums;white-space:nowrap"><span>${e(r.v)}</span></span>
        </div>`).join('')}
    </div>
  </section>` : ''}

  ${pollen.length ? `
  <section style="display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:26px;background:#1c1c1f">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><span style="font-size:15px;font-weight:500">Pollen</span><span style="font-size:12px;color:#8e8d89">i dag · i morgen · overmorgen</span></div>
    <div style="display:flex;flex-direction:column">
      ${pollen.map(p => `
        <div data-on-click="moreId" data-arg="${e(p.id)}" style="${S(p.row)}">
          <span class="ms" style="font-size:18px;color:#8e8d89"><span>${p.icon}</span></span>
          <span style="flex:1;font-size:13px;font-weight:500"><span>${e(p.name)}</span></span>
          <span style="display:flex;gap:4px">${p.days.map(d => `<span style="${S(d)}"></span>`).join('')}</span>
          <span style="${S(p.chip)}"><span>${e(p.level)}</span></span>
        </div>`).join('')}
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:10px;color:#8e8d89">${L.slice(1).map(([t, c]) => `<span style="display:flex;align-items:center;gap:4px"><span style="${S({ width: 8, height: 8, borderRadius: 4, background: c })}"></span><span>${t}</span></span>`).join('')}</div>
  </section>` : ''}
</div>`;
    }

    isNightAt(dt, sa) {
      const loc = this.loc();
      if (loc) { const st = sunTimes(dt, loc[0], loc[1]); if (st.rise && st.set) return dt < st.rise || dt > st.set; }
      const h = dt.getHours(); return h < 6 || h >= 21;
    }
    moreW() { this.more(this.config.vaer); }
    moreId(ev, id) { if (id) this.more(id); }

    /* Luftkvalitet: fra config.luft eller oppdaget via device_class */
    air() {
      const c = this.config.luft || {}, S0 = this.all();
      const byDc = (dc) => Object.keys(S0).find(id => id.startsWith('sensor.') && S0[id].attributes.device_class === dc && !KD.BAD.has(S0[id].state));
      const ids = { aqi: c.aqi || byDc('aqi'), pm25: c.pm25 || byDc('pm25'), pm10: c.pm10 || byDc('pm10'), no2: c.no2 || byDc('nitrogen_dioxide'), o3: c.o3 || byDc('ozone') };
      if (!Object.values(ids).some(Boolean)) return null;
      const lims = [['PM2,5', 'pm25', 25], ['PM10', 'pm10', 50], ['NO₂', 'no2', 100], ['O₃', 'o3', 120]];
      const rows = lims.filter(([, k]) => ids[k] && this.ok(ids[k])).map(([k, key, lim], i) => { const v = this.n(ids[key]); const r = v / lim;
        return { k, id: ids[key], v: `${String(Math.round(v * 10) / 10).replace('.', ',')} µg/m³`, r,
          row: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'pointer' },
          bar: { display: 'block', width: Math.min(100, r * 100) + '%', height: '100%', borderRadius: 3, background: r < 1 ? 'oklch(0.8 0.14 150)' : r < 2 ? 'oklch(0.86 0.13 95)' : 'oklch(0.66 0.2 25)' } }; });
      let aqi = ids.aqi && this.ok(ids.aqi) ? this.n(ids.aqi) : null;
      if (aqi == null && rows.length) aqi = Math.round(Math.max(...rows.map(r => r.r)) * 50); // enkel indeks: 50 = grenseverdi
      const band = aqi == null ? null : aqi <= 50 ? ['God', 'oklch(0.8 0.14 150)'] : aqi <= 100 ? ['Moderat', 'oklch(0.86 0.13 95)'] : aqi <= 150 ? ['Dårlig', 'oklch(0.76 0.15 55)'] : ['Svært dårlig', 'oklch(0.66 0.2 25)'];
      const src = [ids.aqi, ids.pm25, ids.pm10, ids.no2, ids.o3].find(x => x && this.st(x));
      return { aqi: aqi == null ? '–' : Math.round(aqi), station: c.stasjon || (src ? this.at(src, 'attribution', '') || this.fname(src).replace(/\s*(AQI|PM2[.,]5|PM10).*$/i, '') : ''),
        label: band ? band[0] : '–', labelStyle: { fontSize: 13, fontWeight: 600, color: band ? band[1] : '#8e8d89' },
        marker: { position: 'absolute', top: -4, left: `calc(${Math.min(100, (aqi || 0) / 200 * 100)}% - 8px)`, width: 16, height: 16, borderRadius: 8, background: '#f4f3ef', boxShadow: '0 0 0 3px #1c1c1f' }, rows };
    }

    /* Pollen: sensor.pollen_<type>_<sted>_pollen_<dag> (index_value 0–5) */
    pollen() {
      const cfg = this.config, S0 = this.all();
      let ids = Array.isArray(cfg.pollen) ? cfg.pollen : cfg.pollen === false ? [] : Object.keys(S0).filter(id => /^sensor\.pollen_/.test(id));
      const types = {};
      for (const id of ids) {
        const m = id.match(/^sensor\.pollen_([a-z]+)_(?:.+_)?pollen_([a-z_0-9]+)$/) || id.match(/^sensor\.pollen_([a-z]+)_.*?(today|tomorrow|day_after_tomorrow|i_dag|i_morgen|overmorgen)?$/);
        if (!m) continue;
        const t = POLLEN[m[1]]; if (!t) continue;
        const day = m[2] && PDAY[m[2]] != null ? PDAY[m[2]] : 0;
        const at = (S0[id] || {}).attributes || {};
        let v = at.index_value != null ? Number(at.index_value) : parseFloat(S0[id] && S0[id].state);
        if (isNaN(v)) v = null;
        const o = types[t[0]] || (types[t[0]] = { name: t[0], icon: t[1], d: [null, null, null], id });
        if (day === 0) o.id = id;
        o.d[day] = v;
        // noen integrasjoner har prognosen i attributter
        if (day === 0 && at.tomorrow != null && o.d[1] == null) o.d[1] = Number(at.tomorrow.index_value != null ? at.tomorrow.index_value : at.tomorrow);
      }
      const lv = v => v == null ? null : Math.max(0, Math.min(4, Math.round(v)));
      return Object.values(types).sort((x, y) => PORDER.indexOf(x.name) - PORDER.indexOf(y.name)).map((p, i) => {
        const d0 = lv(p.d[0]) || 0;
        return { id: p.id, name: p.name, icon: p.icon, level: L[d0][0],
          row: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'pointer' },
          days: p.d.map((v, k) => ({ width: 10, height: 10, borderRadius: 5, background: L[lv(v) || 0][1], opacity: v == null ? 0.3 : k ? 0.7 : 1 })),
          chip: { minWidth: 58, textAlign: 'center', fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 9, background: d0 ? L[d0][1].replace(')', ' / 0.18)') : '#262629', color: d0 ? L[d0][1] : '#8e8d89' } };
      });
    }
  }

  KD.define('kd-vaer-card', KDVaerCard, 'KD Vær', 'Vær med timer, dager, sol, måne, luft og pollen (pikselkopi av Claude Design)');
  KD.sheet('vaer', 'kd-vaer-card');
})();
} catch (e) { console.error('ki-hjem-design: 43-kd-vaer-card.js', e); }

/* ===== 50-kd-stovsuger-card.js ===== */
try {
/*
 * kd-stovsuger-card – pikselkopi av Claude Design «Støvsuger» (Sir Sweeps / «Rolf»), med ekte data.
 *
 *   type: custom:kd-stovsuger-card        # alt annet er valgfritt («auto config»)
 *   entity: vacuum.sir_sweeps_a_lot
 *   rom:   [{ entity: input_boolean.x, navn: Soverom, ikon: bed, areal: 14, kart: [x, y, b, h] }, …]
 *   soner: [{ entity: script.rolf_zone_x, navn: Spisebord lite }, …]
 * Sensorer for fremdrift, siste runde, totaler, slitedeler, mopp og stille timer finnes automatisk
 * ut fra robotens navn (Roborock-navngiving: sensor.<robot>_cleaning_progress, _last_clean_end … ).
 */
(() => {
  const KD = window.KD;
  const C = KD.C, a = KD.a, PINK = KD.PINK;

  // [nøkkel i designet, tekst] → fan_speed-verdier som godtas (første som finnes i fan_speed_list brukes)
  const SUG = [['quiet', 'Stille', ['quiet', 'silent', 'low']], ['std', 'Standard', ['balanced', 'standard', 'medium', 'normal']],
    ['turbo', 'Turbo', ['turbo', 'strong', 'high']], ['max', 'Maks', ['max', 'max_plus', 'maximum', 'full']]];
  // norske navn på valg i select-entiteter (moppeintensitet, moppemodus, rengjøringsmodus …)
  const OPT = { off: 'Av', on: 'På', mild: 'Mild', low: 'Lav', slight: 'Lav', moderate: 'Middels', medium: 'Middels', middle: 'Middels', intense: 'Intens', high: 'Høy',
    standard: 'Standard', normal: 'Normal', deep: 'Dyp', deep_plus: 'Dyp+', fast: 'Rask', custom: 'Egen', custom_water_flow: 'Egen', smart_mode: 'Smart', extreme: 'Ekstrem',
    sweeping: 'Støvsug', mopping: 'Mopp', sweeping_and_mopping: 'Begge', mopping_after_sweeping: 'Etter', vacuum: 'Støvsug', mop: 'Mopp', vacuum_and_mop: 'Begge',
    quiet: 'Stille', silent: 'Stille', balanced: 'Normal', turbo: 'Turbo', max: 'Maks', strong: 'Sterk' };
  const SNAVN = { mop_intensity: 'Vannmengde', water_box_mode: 'Vannmengde', water_level: 'Vannmengde', water_volume: 'Vannmengde', mop_mode: 'Moppemodus', mop_route: 'Moppemodus',
    cleaning_mode: 'Rengjøringsmodus', clean_mode: 'Rengjøringsmodus', suction_level: 'Sugenivå', mop_pad_humidity: 'Moppefukt' };

  class KDStovsugerCard extends KD.KDSheet {
    static head = ['cleaning_services', 'Støvsuger', 'Sir Sweeps'];
    static defaults = {
      entity: 'vacuum.sir_sweeps_a_lot',
      batteri: 'sensor.sir_sweeps_a_lot_battery',
      lader: 'binary_sensor.sir_sweeps_a_lot_charging',
      vannmangel: 'binary_sensor.sir_sweeps_a_lot_water_shortage',
      vanntank: 'binary_sensor.sir_sweeps_a_lot_water_box_attached',
      start: 'script.stovsuger_start',
      start_rom: 'script.start_sir_sweeps_a_lot_room_select',
      pause: 'script.stovsuger_pause',
      hjem: 'script.stovsuger_retuner_hjem',
      tom: 'script.rolf_empty',
      areal_totalt: 'sensor.sir_sweeps_a_lot_total_cleaning_area',
      tid_totalt: 'sensor.sir_sweeps_a_lot_total_cleaning_time',
      rom: [
        { entity: 'input_boolean.sir_sweeps_a_lot_sebsatian_soverom', navn: 'Soverom', ikon: 'bed', kart: [4, 4, 44, 34] },
        { entity: 'input_boolean.sir_sweeps_a_lot_mamma_soverom', navn: 'Mamma', ikon: 'bed', kart: [52, 4, 44, 26] },
        { entity: 'input_boolean.sir_sweeps_a_lot_pappa_kontor', navn: 'Kontor', ikon: 'desk', kart: [52, 34, 44, 26] },
        { entity: 'input_boolean.sir_sweeps_a_lot_pappa_soverom', navn: 'Pappa', ikon: 'single_bed', kart: [4, 42, 44, 34] },
        { entity: 'input_boolean.sir_sweeps_a_lot_trappegang', navn: 'Trapp', ikon: 'stairs', kart: [52, 64, 44, 14] },
        { navn: 'Gang', ikon: 'door_front', kart: [4, 80, 92, 16] },
      ],
      soner: [
        { entity: 'script.rolf_zone_stuebord', navn: 'Spisebord lite' },
        { entity: 'script.rolf_zone_stuebord_mye', navn: 'Spisebord mye' },
        { entity: 'script.rolf_zone_stue_uten_spisebord', navn: 'Stue uten spisebord' },
        { entity: 'script.rolf_zone_teppe', navn: 'Teppe stue' },
        { entity: 'script.rolf_zone_kjokkenbord', navn: 'Kjøkkenbord' },
      ],
      // slitedeler: levetid i timer (Roborock-standard). entity/reset finnes automatisk når de ikke er satt.
      deler: [
        { navn: 'Hovedbørste', nokkel: 'main_brush', levetid: 300 },
        { navn: 'Sidebørste', nokkel: 'side_brush', levetid: 200 },
        { navn: 'Filter', nokkel: 'filter', levetid: 150 },
        { navn: 'Sensorer', nokkel: 'sensor', levetid: 30 },
      ],
      mopp_pa: 'moderate',
    };
    static sheetCss = `.kd-vac-ctl:active{transform:scale(0.96)}
@keyframes kdvspin{to{transform:rotate(360deg)}}
@keyframes kdvpulse{0%,100%{opacity:1}50%{opacity:.35}}`;

    constructor() { super(); this.state = { tab: 'clean', zone: null }; }

    /* ----- oppdagelse ----- */
    get base() { return String(this.config.entity || '').split('.')[1] || 'sir_sweeps_a_lot'; }
    /** config-nøkkel hvis satt, ellers første kandidat som finnes */
    pick(key, ...cands) {
      if (this.config[key]) return this.config[key];
      for (const c of cands) { if (c instanceof RegExp) { const f = this.find(c)[0]; if (f) return f; } else if (this.st(c)) return c; }
      return null;
    }
    ents() {
      const b = this.base;
      return {
        fremdrift: this.pick('fremdrift', `sensor.${b}_cleaning_progress`, `sensor.${b}_clean_percent`, `sensor.${b}_progress`),
        tid: this.pick('rengjoringstid', `sensor.${b}_cleaning_time`),
        areal: this.pick('areal', `sensor.${b}_cleaning_area`, `sensor.${b}_last_clean_area`),
        slutt: this.pick('siste_runde', `sensor.${b}_last_clean_end`, `sensor.${b}_last_clean_begin`),
        turer: this.pick('turer', `sensor.${b}_total_cleaning_count`, `sensor.${b}_cleaning_count`),
        feil: this.pick('feil', `sensor.${b}_vacuum_error`, `sensor.${b}_last_error`),
        mopp: this.pick('mopp', `select.${b}_mop_intensity`, `select.${b}_water_box_mode`, `select.${b}_mop_mode`),
        stille: this.pick('stille', `switch.${b}_do_not_disturb`, `switch.${b}_dnd`),
        stille_fra: this.pick('stille_fra', `time.${b}_do_not_disturb_begin`),
        stille_til: this.pick('stille_til', `time.${b}_do_not_disturb_end`),
        rom_na: this.pick('rom_na', `sensor.${b}_current_room`, `sensor.${b}_room`),
      };
    }
    rooms() {
      const b = this.base;
      const list = (Array.isArray(this.config.rom) ? this.config.rom : []).map(r => typeof r === 'string' ? { entity: r } : r);
      const known = new Set(list.map(r => r.entity).filter(Boolean));
      // flere rom-brytere med robotens navn oppdages automatisk
      for (const id of this.find(new RegExp(`^input_boolean\\.${b}_`))) if (!known.has(id)) list.push({ entity: id });
      return list.filter(r => !r.entity || this.st(r.entity)).map(r => ({
        ...r, navn: r.navn || (r.entity ? this.fname(r.entity).replace(/^sir sweeps a lot\s*/i, '') : ''), ikon: r.ikon || 'bed',
        on: r.entity ? this.v(r.entity) === 'on' : false,
      }));
    }
    zones() {
      const list = (Array.isArray(this.config.soner) ? this.config.soner : []).map(z => typeof z === 'string' ? { entity: z } : z);
      const known = new Set(list.map(z => z.entity));
      for (const id of this.find(/^script\.rolf_zone_/)) if (!known.has(id)) list.push({ entity: id });
      return list.filter(z => this.st(z.entity)).map(z => ({ ...z, navn: z.navn || this.fname(z.entity) }));
    }
    parts() {
      const b = this.base;
      return (Array.isArray(this.config.deler) ? this.config.deler : []).map(p => {
        const k = p.nokkel || '';
        const id = p.entity || this.pick('_', `sensor.${b}_${k}_time_left`, `sensor.${b}_${k}_left`);
        if (!id || !this.ok(id)) return null;
        let left = this.n(id); const u = this.unit(id);
        if (u === 's') left /= 3600; else if (u === 'min') left /= 60; else if (u === 'd') left *= 24;
        const life = p.levetid || 100;
        const reset = p.reset || this.find(new RegExp(`^button\\.${b}_reset_.*${k.replace('filter', '(air_)?filter')}`))[0] || null;
        return { navn: p.navn, id, left, life, pct: KD.clamp(Math.round(left / life * 100), 0, 100), reset };
      }).filter(Boolean);
    }
    /** select-entiteter for modus (moppeintensitet/-modus, rengjøringsmodus …) – config `valg: [select.x]` legger til egne */
    selects() {
      const b = this.base, E = this.ents();
      const ids = [E.mopp, ...(Array.isArray(this.config.valg) ? this.config.valg : []), ...Object.keys(SNAVN).map(k => `select.${b}_${k}`)];
      return [...new Set(ids.filter(Boolean))].filter(id => this.ok(id)).map(id => {
        const k = id.slice(`select.${b}_`.length);
        return { id, navn: SNAVN[k] || this.fname(id).replace(/^sir sweeps a lot\s*/i, ''), opts: (this.at(id, 'options', []) || []).map(String) };
      }).filter(x => x.opts.length > 1 && x.opts.length <= 7);
    }
    /** kartbilder: image./camera.-entiteter med robotens navn som har et bilde */
    maps() {
      const b = this.base;
      const ids = [...(Array.isArray(this.config.kart) ? this.config.kart : this.config.kart ? [this.config.kart] : []), ...this.find(new RegExp(`^(image|camera)\\.${b}_`))];
      return [...new Set(ids)].filter(id => this.ok(id) && this.at(id, 'entity_picture')).map(id => ({
        id, src: this.at(id, 'entity_picture'), navn: this.fname(id).replace(/^sir sweeps a lot\s*/i, '').replace(/_/g, ' ') || 'Kart' }));
    }
    /** total rengjøringstid → timer (støtter «HH:MM:SS», s, min, h) */
    hours(id) {
      const s = this.st(id); if (!s || KD.BAD.has(s.state)) return null;
      if (String(s.state).includes(':')) { const [h, m] = s.state.split(':').map(Number); return h + (m || 0) / 60; }
      const x = parseFloat(s.state); if (isNaN(x)) return null;
      const u = s.attributes.unit_of_measurement;
      return u === 's' ? x / 3600 : u === 'min' ? x / 60 : u === 'd' ? x * 24 : x;
    }

    /* ----- handlinger ----- */
    tab(e, k) { this.setState({ tab: k }); }
    toggleRoom(e, id) { if (!id) return; this.setState({ zone: null }); this.call('input_boolean', 'toggle', { entity_id: id }); }
    pickZone(e, id) {
      const on = this.state.zone === id;
      this.setState({ zone: on ? null : id });
      if (!on) for (const r of this.rooms()) if (r.on && r.entity) this.call('input_boolean', 'turn_off', { entity_id: r.entity });
    }
    runScript(id, fallback) {
      if (id && this.st(id)) return this.call('script', 'turn_on', { entity_id: id });
      if (fallback) return this.call('vacuum', fallback, { entity_id: this.config.entity });
    }
    start() {
      const st = this.status();
      if (st === 'paused') return this.call('vacuum', 'start', { entity_id: this.config.entity });
      if (this.state.zone && this.st(this.state.zone)) { this._lastZone = this.state.zone; return this.call('script', 'turn_on', { entity_id: this.state.zone }); }
      this._lastZone = null;
      if (this.rooms().some(r => r.on)) return this.runScript(this.config.start_rom, 'start');
      return this.runScript(this.config.start, 'start');
    }
    pauseIt() { this.runScript(this.config.pause, 'pause'); }
    dock() { this.runScript(this.config.hjem, 'return_to_base'); }
    locate() { this.call('vacuum', 'locate', { entity_id: this.config.entity }); }
    empty() { if (this.config.tom && this.st(this.config.tom)) this.call('script', 'turn_on', { entity_id: this.config.tom }); else this.more(this.config.entity); }
    ctl(e, k) { ({ start: () => this.start(), pause: () => this.pauseIt(), dock: () => this.dock(), locate: () => this.locate(), empty: () => this.empty() })[k](); }
    main() { this.status() === 'cleaning' ? this.pauseIt() : this.start(); }
    fan(e, v) { if (v) this.call('vacuum', 'set_fan_speed', { entity_id: this.config.entity, fan_speed: v }); }
    toggleOpt(e, k) {
      const E = this.ents();
      if (k === 'mop' && E.mopp) {
        const on = !['off', 'unknown', 'unavailable', ''].includes(this.v(E.mopp));
        const opts = this.at(E.mopp, 'options', []);
        const target = on ? 'off' : (opts.includes(this.config.mopp_pa) ? this.config.mopp_pa : opts.find(o => o !== 'off') || this.config.mopp_pa);
        this.call('select', 'select_option', { entity_id: E.mopp, option: target });
      } else if (k === 'quiet' && E.stille) this.call('switch', 'toggle', { entity_id: E.stille });
    }
    resetPart(e, id) { if (id) this.press(id); }
    clearRooms() { this.setState({ zone: null }); for (const r of this.rooms()) if (r.on && r.entity) this.call('input_boolean', 'turn_off', { entity_id: r.entity }); }
    selOpt(e, arg) { const i = String(arg).lastIndexOf('|'); if (i > 0) this.call('select', 'select_option', { entity_id: arg.slice(0, i), option: arg.slice(i + 1) }); }
    pickMap(e, id) { this.setState({ map: id }); }
    openMap(e, id) { this.more(id); }
    openMore() { this.more(this.config.entity); }

    status() {
      const s = this.v(this.config.entity);
      if (s === 'cleaning') return 'cleaning';
      if (s === 'paused') return 'paused';
      if (s === 'returning') return 'returning';
      if (s === 'error') return 'error';
      if (s === 'idle') return 'idle';
      if (!this.ok(this.config.entity)) return 'unavailable';
      return 'docked';
    }

    body() {
      const s = this.state, cf = this.config, E = this.ents(), st = this.status(), e = KD.e, S = KD.S;
      const vac = cf.entity;
      let bRaw = this.n(cf.batteri); if (bRaw == null) bRaw = parseFloat(this.at(vac, 'battery_level'));
      const hasB = bRaw != null && !isNaN(bRaw);
      const b = hasB ? Math.round(bRaw) : 0;
      const col = st === 'cleaning' ? C.green : st === 'paused' ? C.amber : st === 'returning' ? C.blue : st === 'error' || st === 'unavailable' ? C.red : C.green;
      const rooms = this.rooms(), zones = this.zones();
      const sel = rooms.filter(r => r.on && r.entity);
      const zone = zones.find(z => z.entity === s.zone) || null;
      const runZone = zones.find(z => z.entity === this._lastZone) || null;
      const target = runZone ? [runZone.navn] : sel.length ? sel.map(r => r.navn) : ['hele huset'];
      const charging = this.st(cf.lader) ? this.isOn(cf.lader) : (hasB && b < 100);
      const labels = { docked: charging ? 'Lader i dokken' : 'I dokken', cleaning: 'Støvsuger', paused: 'Pause', returning: 'På vei hjem', idle: 'Klar', error: 'Feil', unavailable: 'Utilgjengelig' };
      const errTxt = E.feil && this.ok(E.feil) && !/^(none|no.?error|ingen|0)$/i.test(this.v(E.feil)) ? this.v(E.feil) : this.at(vac, 'error', '');
      const curRoom = E.rom_na && this.ok(E.rom_na) ? String(this.v(E.rom_na)) : null;
      const headline = st === 'cleaning' ? (curRoom ? `Støvsuger ${curRoom.toLowerCase()}` : `Støvsuger ${target.join(', ').toLowerCase()}`) : st === 'paused' ? 'Satt på pause' : st === 'returning' ? 'Ferdig, kjører hjem'
        : st === 'error' ? 'Trenger hjelp' : st === 'unavailable' ? 'Ikke tilgjengelig' : 'Klar til å støvsuge';
      const prog = E.fremdrift ? this.n(E.fremdrift) : null;
      const minsOf = id => { const x = this.n(id); if (x == null) return null; const u = this.unit(id); return u === 's' ? x / 60 : u === 'h' ? x * 60 : x; };
      const elMin = minsOf(E.tid), area = this.ok(E.areal) ? Math.round(this.n(E.areal)) : null;
      const rest = st === 'cleaning' && prog != null && elMin != null && prog > 0 ? Math.max(1, Math.round(elMin * (100 - prog) / prog)) : null;
      const endS = E.slutt ? this.v(E.slutt) : '';
      const end = endS && !KD.BAD.has(endS) ? new Date(endS) : null;
      const endOk = end && !isNaN(end);
      let subline;
      if (st === 'cleaning') subline = [curRoom && sel.length > 1 ? `${sel.length} rom valgt` : '', prog != null ? `${Math.round(prog)} % ferdig` : '', rest != null ? `ca. ${rest} min igjen` : ''].filter(Boolean).join(' · ') || 'I gang';
      else if (st === 'error') subline = errTxt ? String(errTxt) : 'Sjekk roboten';
      else if (this.isOn(cf.vannmangel)) subline = 'Vanntanken er tom';
      else subline = endOk ? `Sist støvsuget ${this.dayWord(end)} ${KD.hm(end)}` : labels[st];

      // sugestyrke
      const fanNow = String(this.at(vac, 'fan_speed', '') || '').toLowerCase();
      const fanList = (this.at(vac, 'fan_speed_list', []) || []).map(String);
      const FICON = { quiet: 'volume_down', std: 'air', turbo: 'bolt', max: 'rocket_launch' };
      const suction = SUG.map(([k, l, vals]) => ({ k, l, val: fanList.find(f => vals.includes(f.toLowerCase())) || vals[0], on: vals.includes(fanNow) }));
      const fanCur = (suction.find(x => x.on) || {}).val || '';
      const fanLabel = (suction.find(x => x.on) || {}).l || (fanNow ? fanNow.charAt(0).toUpperCase() + fanNow.slice(1) : '–');

      // helt
      const ringV = st === 'cleaning' && prog != null ? KD.clamp(prog, 0, 100) : hasB ? b : 0;
      const ringC = st === 'cleaning' || st === 'paused' || st === 'returning' || st === 'error' || st === 'unavailable' ? col : b < 20 ? C.red : b < 40 ? C.amber : C.green;
      const RL = 2 * Math.PI * 86;
      const batIcon = charging ? 'battery_charging_full' : b > 90 ? 'battery_full' : b > 65 ? 'battery_5_bar' : b > 40 ? 'battery_4_bar' : b > 20 ? 'battery_2_bar' : 'battery_alert';
      const heroStats = st === 'cleaning' || st === 'paused'
        ? [['Fremdrift', prog != null ? `${Math.round(prog)} %` : '–'], ['Areal', area != null ? `${area} m²` : '–'], ['Tid', elMin != null ? `${Math.round(elMin)} min` : '–']]
        : [['Sugestyrke', fanLabel], ['Siste areal', area != null ? `${area} m²` : '–'], ['Siste tid', elMin != null ? `${Math.round(elMin)} min` : '–']];
      const moving = st === 'cleaning';
      const robot = `<svg viewBox="0 0 100 100" style="position:absolute;inset:30px;width:calc(100% - 60px);height:calc(100% - 60px);filter:drop-shadow(0 10px 18px rgba(0,0,0,0.5))">
        <defs><radialGradient id="kdvBody" cx="38%" cy="28%" r="85%"><stop offset="0" stop-color="#46464c"></stop><stop offset="0.55" stop-color="#2a2a2e"></stop><stop offset="1" stop-color="#1b1b1e"></stop></radialGradient></defs>
        <circle cx="50" cy="50" r="46" fill="url(#kdvBody)" stroke="rgba(255,255,255,0.10)" stroke-width="1"></circle>
        <path d="M13 40 A38 38 0 0 1 87 40" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="3" stroke-linecap="round"></path>
        <circle cx="50" cy="36" r="13" fill="#232327" stroke="rgba(255,255,255,0.14)" stroke-width="1"></circle>
        <circle cx="50" cy="36" r="5" fill="${ringC}"${moving ? ' style="animation:kdvpulse 1.4s ease-in-out infinite"' : ''}></circle>
        <rect x="38" y="64" width="24" height="5" rx="2.5" fill="rgba(255,255,255,0.14)"></rect>
      </svg>`;
      const hero = `<section style="position:relative;overflow:hidden;border-radius:30px;padding:16px 16px 14px;background:radial-gradient(120% 70% at 50% 0%, ${a(col, 0.16)} 0%, rgba(28,28,31,0) 62%), #1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05);display:flex;flex-direction:column;align-items:center;gap:12px">
    <div style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px">
      <span style="display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 12px;border-radius:15px;background:rgba(255,255,255,0.06);font-size:12px;font-weight:600;min-width:0"><span style="width:8px;height:8px;border-radius:4px;flex:none;background:${col};box-shadow:0 0 10px ${a(col, 0.8)}${moving ? ';animation:kdvpulse 1.4s ease-in-out infinite' : ''}"></span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(labels[st])}</span></span>
      <span style="display:inline-flex;align-items:center;gap:4px;height:30px;padding:0 10px 0 8px;border-radius:15px;background:rgba(255,255,255,0.06);font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;color:${b < 20 && hasB ? C.red : '#f2f1ee'}"><span class="ms" style="font-size:17px;transform:rotate(90deg);color:${charging ? C.green : 'inherit'};font-variation-settings:'FILL' 1">${batIcon}</span>${hasB ? b : '–'} %</span>
    </div>
    <div data-on-click="openMore" style="position:relative;width:196px;height:196px;cursor:pointer">
      ${moving ? `<span style="position:absolute;inset:22px;border-radius:50%;background:conic-gradient(from 0deg, ${a(col, 0)} 0deg, ${a(col, 0)} 250deg, ${a(col, 0.32)} 360deg);animation:kdvspin 2.6s linear infinite"></span>` : `<span style="position:absolute;inset:22px;border-radius:50%;background:radial-gradient(circle, ${a(ringC, 0.10)} 0%, rgba(0,0,0,0) 70%)"></span>`}
      <svg viewBox="0 0 196 196" style="position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg)">
        <circle cx="98" cy="98" r="86" fill="none" stroke="#2a2a2d" stroke-width="9"></circle>
        <circle cx="98" cy="98" r="86" fill="none" stroke="${ringC}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(RL * ringV / 100).toFixed(1)} ${RL.toFixed(1)}" style="transition:stroke-dasharray 1s cubic-bezier(.2,.9,.3,1), stroke .4s;filter:drop-shadow(0 0 6px ${a(ringC, 0.55)})"></circle>
      </svg>
      ${robot}
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:5px;text-align:center;max-width:100%;min-width:0">
      <div style="font-size:23px;font-weight:500;letter-spacing:-0.015em;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e(headline)}</div>
      <div style="font-size:13px;color:${st === 'error' ? C.red : '#8e8d89'};max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e(subline)}</div>
    </div>
    ${st === 'cleaning' && prog != null ? `<div style="width:100%;height:6px;border-radius:3px;background:#2a2a2d;overflow:hidden"><div style="width:${KD.clamp(prog, 0, 100)}%;height:100%;border-radius:3px;background:${col};transition:width 1s"></div></div>` : ''}
    <div style="width:100%;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-radius:20px;background:rgba(255,255,255,0.035);padding:10px 0">
      ${heroStats.map(([l, v], i) => `<div style="min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;padding:0 6px;${i ? 'border-left:1px solid rgba(255,255,255,0.06)' : ''}"><span style="font-size:11px;color:#8e8d89;white-space:nowrap">${e(l)}</span><span style="font-size:15px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${e(v)}</span></div>`).join('')}
    </div>
  </section>`;

      // handlinger
      const main = st === 'cleaning'
        ? { icon: 'pause', label: 'Pause', bg: a(C.amber, 0.16), fg: '#f2f1ee', sh: `inset 0 0 0 1px ${a(C.amber, 0.45)}` }
        : { icon: 'play_arrow', label: st === 'paused' ? 'Fortsett' : zone ? `Støvsug ${zone.navn.toLowerCase()}` : sel.length ? `Støvsug ${sel.length} rom` : 'Støvsug alt', bg: `linear-gradient(135deg, ${C.green}, oklch(0.88 0.09 160))`, fg: '#10231a', sh: `0 10px 26px ${a(C.green, 0.25)}, inset 0 1px 0 rgba(255,255,255,0.35)` };
      const tile = (k, icon, label, on, c) => `<button class="kd-vac-ctl" data-on-click="ctl" data-arg="${k}" style="min-width:0;height:60px;border-radius:22px;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 8px;background:${on ? a(c, 0.16) : '#1c1c1f'};box-shadow:${on ? `inset 0 0 0 1px ${a(c, 0.45)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)'};transition:transform .15s, background .2s">
          <span style="width:34px;height:34px;border-radius:17px;flex:none;display:grid;place-items:center;background:${on ? a(c, 0.25) : '#2a2a2e'};color:${on ? c : '#e4e2dd'}"><span class="ms" style="font-size:19px;font-variation-settings:'FILL' 1">${icon}</span></span>
          <span style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0">${e(label)}</span></button>`;
      const actions = `<section style="display:flex;flex-direction:column;gap:10px">
    <button class="kd-vac-ctl" data-on-click="main" data-haptic="medium" style="height:62px;border-radius:31px;display:flex;align-items:center;justify-content:center;gap:10px;padding:0 20px;font-size:16px;font-weight:600;background:${main.bg};color:${main.fg};box-shadow:${main.sh};transition:transform .15s"><span class="ms" style="font-size:26px;font-variation-settings:'FILL' 1">${main.icon}</span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(main.label)}</span></button>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
      ${tile('dock', 'home', st === 'returning' ? 'Kjører hjem' : 'Hjem', st === 'returning', C.blue)}${tile('locate', 'location_searching', 'Finn', false, C.blue)}${tile('empty', 'delete_sweep', 'Tøm', false, C.amber)}
    </div>
  </section>`;

      const tabs = KD.segHTML('vac-tab', [['clean', 'Rom', 'grid_view'], ['control', 'Modus', 'tune'], ['info', 'Status', 'monitoring'], ['map', 'Kart', 'map']], s.tab, 'tab', { pink: true });
      const lbl = (t, right = '') => `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 4px;min-height:22px"><div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;white-space:nowrap">${e(t)}</div>${right}</div>`;
      let tabHTML = '';

      if (s.tab === 'clean') {
        const selMeta = zone ? `Sone: ${zone.navn}` : sel.length ? `${sel.length} valgt` : 'Ingen valgt · hele huset';
        const tiles = rooms.filter(r => r.entity).map(r => {
          const on = r.on;
          return `<button data-on-click="toggleRoom" data-arg="${e(r.entity)}" style="position:relative;min-width:0;height:104px;border-radius:22px;padding:12px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;align-items:flex-start;text-align:left;background:${on ? `linear-gradient(160deg, ${a(C.green, 0.24)}, ${a(C.green, 0.08)})` : '#1c1c1f'};box-shadow:${on ? `inset 0 0 0 1.5px ${a(C.green, 0.55)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)'};transition:background .25s, box-shadow .25s">
            <span style="width:36px;height:36px;border-radius:18px;display:grid;place-items:center;background:${on ? a(C.green, 0.25) : '#2a2a2e'};color:${on ? C.green : '#c9c7c2'};transition:background .25s"><span class="ms" style="font-size:20px;font-variation-settings:'FILL' ${on ? 1 : 0}">${e(r.ikon)}</span></span>
            <span style="position:absolute;right:10px;top:10px;width:22px;height:22px;border-radius:11px;display:grid;place-items:center;box-sizing:border-box;background:${on ? C.green : 'transparent'};box-shadow:${on ? 'none' : 'inset 0 0 0 1.5px rgba(255,255,255,0.18)'};color:#10231a;transition:background .2s"><span class="ms" style="font-size:16px;opacity:${on ? 1 : 0};transform:scale(${on ? 1 : 0.4});transition:all .25s cubic-bezier(.34,1.5,.64,1)">check</span></span>
            <span style="display:flex;flex-direction:column;gap:1px;width:100%;min-width:0">
              <span style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(r.navn)}</span>
              <span style="font-size:11px;color:${on ? a(C.green, 0.9) : '#8e8d89'};white-space:nowrap">${e(r.areal != null ? `${r.areal} m²` : on ? 'Valgt' : 'Trykk for å velge')}</span>
            </span></button>`;
        }).join('');
        const any = sel.length || zone;
        tabHTML = `<section style="display:flex;flex-direction:column;gap:10px">
    ${lbl('Rom', `<div style="display:flex;align-items:center;gap:8px;min-width:0"><span style="font-size:12px;color:#6d6c69;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(selMeta)}</span>${any ? `<button data-on-click="clearRooms" style="height:26px;padding:0 10px;border-radius:13px;background:rgba(255,255,255,0.07);font-size:11px;font-weight:600;color:#c9c7c2;white-space:nowrap">Nullstill</button>` : ''}</div>`)}
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px">${tiles}</div>
    ${zones.length ? `<div style="display:flex;flex-direction:column;gap:8px;margin-top:6px">${lbl('Soner')}
      <div data-hscroll="1" style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 calc(-1 * var(--kd-kant,10px));padding:0 var(--kd-kant,10px)">
        ${zones.map(z => { const on = s.zone === z.entity; return `<button data-on-click="pickZone" data-arg="${e(z.entity)}" style="flex:none;height:40px;padding:0 14px 0 10px;border-radius:20px;display:flex;align-items:center;gap:7px;font-size:13px;font-weight:500;white-space:nowrap;background:${on ? a(C.green, 0.16) : '#1c1c1f'};color:${on ? '#f2f1ee' : '#c9c7c2'};box-shadow:${on ? `inset 0 0 0 1.5px ${a(C.green, 0.55)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)'}"><span class="ms" style="font-size:17px;color:${on ? C.green : 'inherit'};font-variation-settings:'FILL' ${on ? 1 : 0}">${e(z.ikon || 'table_restaurant')}</span><span>${e(z.navn)}</span></button>`; }).join('')}
      </div></div>` : ''}
    ${any ? `<button class="kd-vac-ctl" data-on-click="ctl" data-arg="start" data-haptic="medium" style="margin-top:4px;height:54px;border-radius:27px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:15px;font-weight:600;background:${PINK};color:#2a1720;box-shadow:0 8px 22px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.35);transition:transform .15s"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">cleaning_services</span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(zone ? `Rengjør ${zone.navn.toLowerCase()}` : `Rengjør valgte · ${sel.length} rom`)}</span></button>`
      : `<div style="font-size:12px;color:#6d6c69;text-align:center;padding:2px 0">Velg ett eller flere rom, så kan du rengjøre bare dem</div>`}
  </section>`;
      }

      if (s.tab === 'control') {
        const mopOn = E.mopp ? !['off', 'unknown', 'unavailable', ''].includes(this.v(E.mopp)) : false;
        const warn = this.isOn(cf.vannmangel) ? 'Vanntanken er tom' : (this.st(cf.vanntank) && this.v(cf.vanntank) === 'off') ? 'Vanntanken er ikke satt i' : '';
        const selects = this.selects().map(x => `<section style="display:flex;flex-direction:column;gap:8px">
      ${lbl(x.navn, x.id === E.mopp && warn ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:${C.amber};white-space:nowrap"><span class="ms" style="font-size:15px;font-variation-settings:'FILL' 1">water_drop</span>${e(warn)}</span>` : x.id === E.mopp && mopOn ? `<span style="font-size:12px;color:#6d6c69">Mopper etter støvsuging</span>` : '')}
      ${KD.segHTML('sel-' + x.id, x.opts.map(o => [x.id + '|' + o, OPT[String(o).toLowerCase()] || String(o).replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())]), x.id + '|' + this.v(x.id), 'selOpt', { small: x.opts.length > 4 })}
    </section>`).join('');
        const tm = id => { const v = this.v(id); return /^\d{1,2}:\d{2}/.test(v) ? v.slice(0, 5) : null; };
        const qFrom = tm(E.stille_fra), qTo = tm(E.stille_til), qOn = this.isOn(E.stille);
        tabHTML = `<section style="display:flex;flex-direction:column;gap:8px">
      ${lbl('Sugestyrke', `<span style="font-size:12px;color:#6d6c69">${e(fanLabel)}</span>`)}
      ${KD.segHTML('vac-fan', suction.map(x => [x.val, x.l, FICON[x.k]]), fanCur, 'fan', {})}
    </section>
    ${selects}
    ${E.stille ? `<section><button data-on-click="toggleOpt" data-arg="quiet" style="width:100%;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:22px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04);text-align:left">
      <span style="width:38px;height:38px;border-radius:19px;flex:none;display:grid;place-items:center;background:${qOn ? a(C.blue, 0.2) : '#2a2a2e'};color:${qOn ? C.blue : '#c9c7c2'}"><span class="ms" style="font-size:20px;font-variation-settings:'FILL' 1">bedtime</span></span>
      <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:14px;font-weight:600">Stille timer</span><span style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(qFrom && qTo ? `Ikke forstyrr ${qFrom}–${qTo}` : qOn ? 'På' : 'Av')}</span></span>
      ${this.sw(qOn)}</button></section>` : ''}`;
      }

      if (s.tab === 'info') {
        const hrs = this.hours(cf.tid_totalt);
        const last = [['event', 'Når', endOk ? `${this.dayWord(end).replace(/^./, c => c.toUpperCase())} ${KD.hm(end)}` : '–'], ['square_foot', 'Areal', area != null ? `${area} m²` : '–'], ['timer', 'Varighet', elMin != null ? `${Math.round(elMin)} min` : '–']];
        const tot = [['Tid', hrs == null ? '–' : `${Math.round(hrs).toLocaleString('nb-NO')} t`], ['Areal', this.ok(cf.areal_totalt) ? `${Math.round(this.n(cf.areal_totalt)).toLocaleString('nb-NO')} m²` : '–'], ['Turer', this.ok(E.turer) ? Math.round(this.n(E.turer)).toLocaleString('nb-NO') : '–']];
        const PICON = { main_brush: 'cleaning_services', side_brush: 'mode_fan', filter: 'filter_alt', sensor: 'sensors' };
        const parts = this.parts();
        tabHTML = `<section style="display:flex;flex-direction:column;gap:8px">
      ${lbl('Siste rengjøring')}
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
        ${last.map(([ic, l, v]) => `<div style="min-width:0;display:flex;flex-direction:column;gap:8px;padding:14px;border-radius:22px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04)"><span class="ms" style="font-size:20px;color:#8e8d89">${ic}</span><span style="display:flex;flex-direction:column;gap:2px;min-width:0"><span style="font-size:11px;color:#8e8d89">${e(l)}</span><span style="font-size:15px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(v)}</span></span></div>`).join('')}
      </div>
    </section>
    <section style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-radius:22px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04);padding:14px 0">
      ${tot.map(([l, v], i) => `<div style="min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;padding:0 6px;${i ? 'border-left:1px solid rgba(255,255,255,0.06)' : ''}"><span style="font-size:11px;color:#8e8d89">${e(l)} totalt</span><span style="font-size:17px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap">${e(v)}</span></div>`).join('')}
    </section>
    ${parts.length ? `<section style="display:flex;flex-direction:column;gap:8px">
      ${lbl('Slitedeler', parts.some(p => p.pct < 20) ? `<span style="font-size:12px;color:${C.amber}">${parts.filter(p => p.pct < 20).length} bør byttes</span>` : `<span style="font-size:12px;color:#6d6c69">Alt i orden</span>`)}
      <div style="display:flex;flex-direction:column;border-radius:24px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04);padding:4px 14px">
      ${parts.map((p, i) => { const low = p.pct < 20, c = low ? C.amber : p.pct < 40 ? 'oklch(0.86 0.12 95)' : C.green; const k = ((cf.deler || [])[i] || {}).nokkel; return `<div style="display:flex;align-items:center;gap:12px;padding:12px 0;${i ? 'border-top:1px solid rgba(255,255,255,0.05)' : ''}">
        <span style="width:38px;height:38px;border-radius:19px;flex:none;display:grid;place-items:center;background:${a(c, 0.14)};color:${c}"><span class="ms" style="font-size:20px">${PICON[k] || 'build'}</span></span>
        <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:7px">
          <span style="display:flex;justify-content:space-between;gap:8px;font-size:14px"><span style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(p.navn)}</span><span style="font-size:12px;color:${low ? C.amber : '#8e8d89'};font-variant-numeric:tabular-nums;white-space:nowrap">${Math.round(p.left)} t igjen · ${p.pct} %</span></span>
          <span style="height:6px;border-radius:3px;background:#2a2a2d;overflow:hidden"><span style="display:block;width:${p.pct}%;height:100%;border-radius:3px;background:${c};transition:width 1s"></span></span>
        </span>
        ${low && p.reset ? `<button data-on-click="resetPart" data-arg="${e(p.reset)}" title="Merk som byttet" style="height:32px;padding:0 12px;border-radius:16px;flex:none;background:${C.amber};color:#161618;font-size:12px;font-weight:600;white-space:nowrap">Byttet</button>` : ''}
      </div>`; }).join('')}
      </div>
    </section>` : ''}`;
      }

      if (s.tab === 'map') {
        const maps = this.maps();
        const cur = maps.find(m => m.id === s.map) || maps[0];
        const rp = (sel.find(r => r.kart) || rooms.find(r => r.kart) || { kart: [4, 4, 44, 34] }).kart;
        const t = (prog || 0) / 100, mv = st === 'cleaning' || st === 'paused';
        const dot = `left:calc(${mv ? rp[0] + rp[2] * (0.15 + 0.7 * ((t * 5) % 1)) : 9}% - 9px);top:calc(${mv ? rp[1] + rp[3] * (0.2 + 0.6 * t) : 82}% - 9px)`;
        tabHTML = `${cur ? `<section style="display:flex;flex-direction:column;gap:10px">
      ${maps.length > 1 ? KD.segHTML('vac-map', maps.map(m => [m.id, m.navn, 'layers']), cur.id, 'pickMap', { small: true }) : ''}
      <div data-on-click="openMap" data-arg="${e(cur.id)}" style="position:relative;border-radius:26px;overflow:hidden;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05);aspect-ratio:4 / 3;cursor:pointer">
        <img src="${e(cur.src)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain">
        <span style="position:absolute;left:12px;bottom:12px;height:28px;padding:0 10px;border-radius:14px;display:inline-flex;align-items:center;gap:6px;background:rgba(20,20,22,0.7);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-size:12px;font-weight:500"><span class="ms" style="font-size:15px">map</span>${e(cur.navn)}</span>
      </div>
    </section>` : ''}
    ${rooms.some(r => Array.isArray(r.kart)) ? `<section style="display:flex;flex-direction:column;gap:8px">
      ${lbl('Romvelger', `<span style="font-size:12px;color:#6d6c69">Trykk på et rom</span>`)}
      <div style="position:relative;height:300px;border-radius:26px;background:#1c1c1f;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05)">
        ${rooms.filter(r => Array.isArray(r.kart)).map(r => { const [x, y, w, h] = r.kart, on = r.on; return `<button data-on-click="toggleRoom" data-arg="${e(r.entity || '')}" style="position:absolute;left:${x}%;top:${y}%;width:${w}%;height:${h}%;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;background:${on ? a(C.green, 0.28) : '#262629'};box-shadow:${on ? `inset 0 0 0 1.5px ${C.green}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)'};color:${on ? '#f2f1ee' : '#a9a7a2'};transition:background .2s"><span class="ms" style="font-size:16px;color:${on ? C.green : '#6d6c69'}">${e(r.ikon)}</span><span style="font-size:11px;font-weight:500">${e(r.navn)}</span></button>`; }).join('')}
        <span style="position:absolute;left:8%;top:84%;width:18px;height:12px;border-radius:4px;background:#48474a"></span>
        <span style="position:absolute;${dot};width:18px;height:18px;border-radius:9px;background:#f2f1ee;box-shadow:0 0 0 4px ${a(col, 0.35)}, 0 0 16px ${a(col, 0.6)};transition:left .8s linear, top .8s linear"></span>
      </div>
    </section>` : ''}`;
      }

      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:18px">
  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89"><span>${e(cf.navn || 'Sir Sweeps')}</span></div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>
  ${hero}
  ${actions}
  ${tabs}
  ${tabHTML}
</div>`;
    }
    /** Bryter (spor + knott) */
    sw(on) { return `<span style="position:relative;width:46px;height:28px;border-radius:14px;flex:none;background:${on ? 'oklch(0.72 0.14 150)' : '#3a3a3d'};transition:background .2s"><span style="position:absolute;top:3px;left:${on ? 21 : 3}px;width:22px;height:22px;border-radius:11px;background:#f4f3ef;box-shadow:0 2px 6px rgba(0,0,0,0.3);transition:left .25s cubic-bezier(.34,1.4,.64,1)"></span></span>`; }
    /** «i dag» / «i går» / «mandag» / «12.9.» */
    dayWord(d) {
      const t0 = new Date(); t0.setHours(0, 0, 0, 0);
      const diff = Math.round((t0 - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400e3);
      if (diff <= 0) return 'i dag';
      if (diff === 1) return 'i går';
      if (diff < 7) return d.toLocaleDateString('nb-NO', { weekday: 'long' });
      return `${d.getDate()}.${d.getMonth() + 1}.`;
    }
  }

  KD.define('kd-stovsuger-card', KDStovsugerCard, 'KD Støvsuger', 'Robotstøvsuger (Sir Sweeps) – pikselkopi av Claude Design');
  KD.sheet('vac', 'kd-stovsuger-card');
})();
} catch (e) { console.error('ki-hjem-design: 50-kd-stovsuger-card.js', e); }

/* ===== 51-kd-media-card.js ===== */
try {
/*
 * kd-media-card – pikselkopi av Claude Design «Media» (TV-fjernkontroll + musikk/høyttalere), med ekte data.
 *
 *   type: custom:kd-media-card            # alt annet er valgfritt («auto config»)
 *   tv: media_player.stue_tv              # Apple TV; fjernkontroll: remote.stue_tv
 *   hoyttalere: [{ entity: media_player.squeezebox_radio, navn: Sonos }, …]
 *   apper: [{ navn: Netflix, kilde: Netflix, ikon: movie, farge: 'oklch(…)' }, …]   # select_source på TV-en
 *   radio: [{ entity: button.squeezebox_radio_preset_1, navn: NRK P1 }, …]           # finnes også automatisk
 *   volum: media_player.rn602_stue       # volumknappene: entitet, 'fjernkontroll' eller 'skript' (standard: automatisk)
 *   volum_opp: script.volum_opp          # med volum: skript
 *   volum_ned: script.volum_ned
 * TV, volum, høyttalere og synlige apper kan også velges per bruker i «Tilpass oppsett» (brukerdata 'kd_media').
 * Albumbilder vises fra entity_picture. Kildene til musikkspilleren (source_list) vises som valg.
 */
(() => {
  const KD = window.KD;
  const C = { blue: 'oklch(0.8 0.12 250)', green: 'oklch(0.8 0.12 150)', red: 'oklch(0.72 0.15 25)' };
  const a = KD.a, PINK = KD.PINK;
  const OFF = ['off', 'standby', 'unavailable', 'unknown', ''];
  const APPS = [['Plex', 'play_circle', 'oklch(0.6 0.1 75)'], ['NRK TV', 'live_tv', 'oklch(0.55 0.07 220)'], ['Telia Play', 'smart_display', 'oklch(0.5 0.12 300)'], ['TV 2 Play', 'smart_display', 'oklch(0.5 0.09 260)'], ['YouTube', 'smart_display', 'oklch(0.5 0.14 25)'], ['Netflix', 'movie', 'oklch(0.45 0.14 25)']];
  const tm = (s) => { s = Math.max(0, Math.round(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? `${h}:${KD.hh(m)}` : `${m}`) + `:${KD.hh(x)}`; };
  const low = (x) => String(x || '').toLowerCase();

  class KDMediaCard extends KD.KDSheet {
    static head = ['music_note', 'Media', 'Høyttalere og TV'];
    static defaults = {
      tv: 'media_player.stue_tv',
      fjernkontroll: 'remote.stue_tv',
      tv_navn: 'Stue-TV',
      musikk: 'media_player.squeezebox_radio',
      hoyttalere: [
        { entity: 'media_player.squeezebox_radio', navn: 'Sonos' },
        { entity: 'media_player.kjokken_radio', navn: 'Kjøkken' },
        { entity: 'media_player.rn602_stue', navn: 'RN602' },
      ],
      apper: APPS.map(([navn, ikon, farge]) => ({ navn, ikon, farge })),
      radio: [
        { entity: 'button.squeezebox_radio_preset_1', navn: 'NRK P1' },
        { entity: 'button.squeezebox_radio_preset_2', navn: 'NRK JAZZ' },
        { entity: 'button.squeezebox_radio_preset_3', navn: 'NRK P3' },
        { entity: 'button.squeezebox_radio_preset_4', navn: 'P24-7 MIX' },
        { entity: 'button.squeezebox_radio_preset_5', navn: 'NRK mp3' },
        { entity: 'button.squeezebox_radio_preset_6', navn: 'Montebello' },
      ],
      vis_kilder: true,
    };
    static sheetCss = `.kd-md-key:active{transform:scale(0.92);background:#2a2a2d!important}.kd-md-vol:active{background:#2a2a2d!important}`;

    constructor() { super(); this.state = { tab: null, press: null }; }

    /* ----- data ----- */
    on(id) { return !!id && this.ok(id) && !OFF.includes(this.v(id)); }
    /** per bruker («Tilpass oppsett»): { tv, hoyttalere: [id…], skjul_apper: [navn…], volum, volum_opp, volum_ned } */
    U() { return KD.ud(this, 'kd_media') || {}; }
    uSave(patch) { const v = { ...this.U(), ...patch }; for (const k of Object.keys(v)) if (v[k] == null) delete v[k]; this.haptic('selection'); KD.udSave(this, 'kd_media', v); }
    tvId() { const u = this.U().tv; return u && this.st(u) ? u : this.config.tv; }
    cfgSpeakers() { return (Array.isArray(this.config.hoyttalere) ? this.config.hoyttalere : []).map(x => typeof x === 'string' ? { entity: x } : x); }
    speakers() {
      const cfg = this.cfgSpeakers(), u = this.U().hoyttalere;
      const list = Array.isArray(u) ? u.map(id => cfg.find(x => x.entity === id) || { entity: id }) : cfg;
      return list.filter(x => this.st(x.entity)).map(x => ({ ...x, navn: x.navn || this.fname(x.entity) }));
    }
    /** apper med indeks i config.apper (indeksen brukes av app()), uten de brukeren har skjult */
    appList() { const hid = new Set(this.U().skjul_apper || []); return (this.config.apper || []).map((x, i) => ({ ...x, i })).filter(x => !hid.has(x.navn)); }
    /** volumknappene: 'auto' | 'fjernkontroll' | 'skript' | media_player.* */
    volMode() {
      const u = this.U(), c = this.config, v = u.volum || c.volum;
      if (v === 'fjernkontroll' || v === 'skript' || v === 'auto') return v;
      if (v && /^media_player\./.test(v) && this.st(v)) return v;
      if (!v && (c.volum_opp || c.volum_ned)) return 'skript';
      return 'auto';
    }
    volScripts() { const u = this.U(), c = this.config; return { opp: u.volum_opp || c.volum_opp || null, ned: u.volum_ned || c.volum_ned || null }; }
    /** entiteten som volumlinjen viser */
    volTarget() { const m = this.volMode(); return /^media_player\./.test(m) ? m : this.tvId(); }
    hasVol(id) { return (Number(this.at(id, 'supported_features', 0)) & (4 | 8 | 1024)) !== 0 || this.at(id, 'volume_level') != null; }
    /** musikkspilleren: den første som spiller, ellers config.musikk */
    player() {
      const sp = this.speakers();
      const p = sp.find(x => this.v(x.entity) === 'playing');
      return p ? p.entity : (this.st(this.config.musikk) ? this.config.musikk : (sp[0] && sp[0].entity) || this.config.musikk);
    }
    radios() {
      const list = (Array.isArray(this.config.radio) ? this.config.radio : []).map(x => typeof x === 'string' ? { entity: x } : x);
      const known = new Set(list.map(x => x.entity));
      const pl = String(this.config.musikk || '').split('.')[1];
      if (pl) for (const id of this.find(new RegExp(`^button\\.${pl}_preset_\\d+$`))) if (!known.has(id)) list.push({ entity: id });
      return list.filter(x => this.st(x.entity)).map(x => ({ ...x, navn: x.navn || this.fname(x.entity) }));
    }
    appOf(tvA) {
      const cur = [tvA.app_name, tvA.source].map(low);
      return (this.config.apper || []).find(x => cur.includes(low(x.kilde || x.navn))) || null;
    }
    pos(id) {
      const A = (this.st(id) || {}).attributes || {};
      if (A.media_duration == null || A.media_position == null) return null;
      let p = A.media_position;
      if (this.v(id) === 'playing' && A.media_position_updated_at) p += (Date.now() - new Date(A.media_position_updated_at)) / 1000;
      return [Math.min(p, A.media_duration), A.media_duration];
    }

    /* ----- handlinger ----- */
    tab(e, k) { this.setState({ tab: k }); }
    flash(k) { this.setState({ press: k }); clearTimeout(this._pt); this._pt = setTimeout(() => this.setState({ press: null }), 160); }
    /** fjernkontrollen: config → remote.<tv> → en remote med samme navn som TV-en */
    remoteId() {
      const c = this.config, tvE = this.tvId(), tv = String(tvE || '').split('.')[1] || '';
      if (c.fjernkontroll && this.st(c.fjernkontroll) && tvE === c.tv) return c.fjernkontroll;
      if (tv && this.st('remote.' + tv)) return 'remote.' + tv;
      const nm = low(this.fname(tvE));
      return this.find(/^remote\./).find(id => nm && low(this.fname(id)) === nm) || this.find(/^remote\./).find(id => tv && id.includes(tv.split('_')[0])) || null;
    }
    send(cmd) {
      const r = this.remoteId();
      if (!r) { this.toast('Fant ingen fjernkontroll (remote.*) – sett «fjernkontroll» i kortet'); return; }
      const go = () => this.call('remote', 'send_command', { entity_id: r, command: cmd, hold_secs: 0 });
      if (this.v(r) === 'off' && cmd !== 'wakeup') { // Apple TV i dvale: vekk den først
        const now = Date.now(); if (now - (this._woke || 0) < 4000) return go();
        this._woke = now;
        return this.call('remote', 'turn_on', { entity_id: r }).then(() => new Promise(res => setTimeout(res, 600))).then(go);
      }
      return go();
    }
    /** Styreflaten: trykk på pil/midten, eller sveip (som ki-fjernkontroll-card) */
    _padInit() {
      const pad = this.$('[data-key="kd-pad"]'); if (!pad || pad._kd) return; pad._kd = true;
      const DIR = { up: 'up', down: 'down', left: 'left', right: 'right' }, ROT = 26, STEG = 46;
      let x0 = 0, y0 = 0, on = false, steg = 0, ret = null, moved = false;
      const zone = (x, y) => { const r = pad.getBoundingClientRect(), dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2); if (Math.hypot(dx, dy) < r.width * 0.2) return 'ok'; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); };
      pad.addEventListener('pointerdown', ev => { if (ev.button > 0) return; x0 = ev.clientX; y0 = ev.clientY; on = true; steg = 0; ret = null; moved = false; try { pad.setPointerCapture(ev.pointerId); } catch (e) { } });
      pad.addEventListener('pointermove', ev => {
        if (!on) return;
        const dx = ev.clientX - x0, dy = ev.clientY - y0, l = Math.hypot(dx, dy);
        if (l > 8) moved = true;
        if (l < ROT) return;
        const ny = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        if (ny !== ret) { ret = ny; steg = 0; x0 = ev.clientX; y0 = ev.clientY; }
        const vil = Math.max(1, Math.floor(Math.abs(Math.abs(dx) > Math.abs(dy) ? dx : dy) / STEG));
        while (steg < vil) { steg++; this.flash(ny); this.haptic('selection'); this.send(DIR[ny]); }
      });
      const end = ev => {
        if (!on) return; on = false;
        if (ev.type === 'pointercancel') return;
        if (!moved) { const z = zone(ev.clientX, ev.clientY); this.flash(z); this.haptic('light'); this.send(z === 'ok' ? 'select' : DIR[z]); }
        else if (ret && steg === 0) { this.flash(ret); this.send(DIR[ret]); }
      };
      pad.addEventListener('pointerup', end);
      pad.addEventListener('pointercancel', end);
    }
    pad(e, k) { this.flash(k); this.send(k === 'ok' ? 'select' : k); }
    powerTv() { const id = this.tvId(); this.call('media_player', this.on(id) ? 'turn_off' : 'turn_on', { entity_id: id }); }
    key(e, k) {
      if (k === 'power') return this.powerTv();
      if (k === 'back') { this.flash('back'); return this.send('menu'); }
      if (k === 'home') return this.send('home');
      if (k === 'mic') return this.send('siri');
      if (k === 'playpause') return this.call('media_player', 'media_play_pause', { entity_id: this.tvId() });
    }
    canSet(id) { return (Number(this.at(id, 'supported_features', 0)) & 4) === 4 && this.at(id, 'volume_level') != null; }
    volStep(id, dir) {
      if (this.canSet(id)) {
        const v = KD.clamp(Math.round(this.at(id, 'volume_level', 0) * 100) + (dir === 'up' ? 2 : -2), 0, 100);
        return this.call('media_player', 'volume_set', { entity_id: id, volume_level: v / 100 });
      }
      return this.call('media_player', dir === 'up' ? 'volume_up' : 'volume_down', { entity_id: id });
    }
    vol(e, dir) {
      const m = this.volMode(), id = this.tvId();
      if (m === 'fjernkontroll') return this.send(dir === 'up' ? 'volume_up' : 'volume_down');
      if (m === 'skript') {
        const sc = this.volScripts()[dir === 'up' ? 'opp' : 'ned'];
        if (!sc) { this.toast('Velg skript for volum ' + (dir === 'up' ? 'opp' : 'ned') + ' i «Tilpass oppsett»'); return; }
        return this.call('script', 'turn_on', { entity_id: sc });
      }
      if (m !== 'auto') return this.volStep(m, dir);
      if (this.canSet(id)) return this.volStep(id, dir);
      if (this.config.fjernkontroll && this.st(this.config.fjernkontroll) && id === this.config.tv) return this.send(dir === 'up' ? 'volume_up' : 'volume_down');
      this.call('media_player', dir === 'up' ? 'volume_up' : 'volume_down', { entity_id: id });
    }
    mute() {
      const m = this.volMode();
      if (m === 'fjernkontroll') return this.send('mute');
      const id = this.volTarget();
      this.call('media_player', 'volume_mute', { entity_id: id, is_volume_muted: !this.at(id, 'is_volume_muted', false) });
    }
    app(e, i) {
      const x = (this.config.apper || [])[+i]; if (!x) return;
      if (x.skript) return this.call('script', 'turn_on', { entity_id: x.skript });
      const list = this.at(this.tvId(), 'source_list', []) || [];
      const want = x.kilde || x.navn;
      const src = list.find(s => low(s) === low(want)) || want;
      this.call('media_player', 'select_source', { entity_id: this.tvId(), source: src });
    }
    powerMusic() { const id = this.player(); this.call('media_player', this.v(id) === 'playing' ? 'media_pause' : this.on(id) ? 'turn_off' : 'turn_on', { entity_id: id }); }
    playPause() { this.call('media_player', 'media_play_pause', { entity_id: this.player() }); }
    prev() { this.call('media_player', 'media_previous_track', { entity_id: this.player() }); }
    next() { this.call('media_player', 'media_next_track', { entity_id: this.player() }); }
    grouped(id) { const main = this.player(); const g = this.at(main, 'group_members'); return Array.isArray(g) && g.length > 0 && Array.isArray(this.at(id, 'group_members')); }
    inGroup(id) { const main = this.player(); if (id === main) return this.on(id); const g = this.at(main, 'group_members') || []; return g.includes(id); }
    toggleSpeaker(e, id) {
      const main = this.player();
      if (id !== main && this.grouped(id)) {
        if (this.inGroup(id)) return this.call('media_player', 'unjoin', { entity_id: id });
        return this.call('media_player', 'join', { entity_id: main, group_members: [id] });
      }
      this.call('media_player', this.on(id) ? 'turn_off' : 'turn_on', { entity_id: id });
    }
    setVol(e, id, el) {
      const r = el.getBoundingClientRect();
      const v = Math.round(Math.max(0, Math.min(1, (e.clientX - r.left - 46) / (r.width - 46))) * 100);
      this.call('media_player', 'volume_set', { entity_id: id, volume_level: v / 100 });
    }
    radio(e, id) { this.press(id); }
    source(e, src) { this.call('media_player', 'select_source', { entity_id: this.player(), source: src }); }
    openMore(e, id) { this.more(id); }

    /* ----- «Tilpass oppsett»: TV, volumknapper, høyttalere og apper (per bruker, 'kd_media') ----- */
    mdSet(e, arg) {
      const i = String(arg).indexOf('|'), k = String(arg).slice(0, i), v = String(arg).slice(i + 1);
      const cur = k === 'tv' ? this.tvId() : k === 'volum' ? this.volMode() : k === 'volum_opp' ? this.volScripts().opp : k === 'volum_ned' ? this.volScripts().ned : null;
      if (k === 'tv') return this.uSave({ tv: v === this.config.tv ? null : v });
      if (k === 'volum') return this.uSave({ volum: v });
      if (k === 'volum_opp' || k === 'volum_ned') return this.uSave({ [k]: cur === v ? null : v });
    }
    mdTog(e, arg) {
      const i = String(arg).indexOf('|'), k = String(arg).slice(0, i), v = String(arg).slice(i + 1);
      if (k === 'app') {
        const hid = new Set(this.U().skjul_apper || []);
        hid.has(v) ? hid.delete(v) : hid.add(v);
        return this.uSave({ skjul_apper: hid.size ? [...hid] : null });
      }
      if (k === 'spk') {
        const cur = this.speakers().map(x => x.entity);
        const nxt = cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v];
        const def = this.cfgSpeakers().map(x => x.entity).filter(x => this.st(x));
        return this.uSave({ hoyttalere: nxt.join() === def.join() ? null : nxt });
      }
    }
    mdReset() { this.haptic('selection'); KD.udSave(this, 'kd_media', {}); }
    tilpassHTML() {
      const e = KD.e, S = KD.S, P = 'oklch(0.78 0.13 350';
      const head = (t) => `<div style="padding:10px 12px 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8e8d89">${e(t)}</div>`;
      const chip = (fn, arg, label, on, icon) => `<button data-on-click="${fn}" data-arg="${e(arg)}" style="${S({ flex: 'none', height: 34, padding: icon ? '0 14px 0 10px' : '0 14px', borderRadius: 17, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap', color: on ? '#f4f3ef' : '#c9c7c2', background: on ? `${P} / 0.2)` : 'rgba(255,255,255,0.06)', boxShadow: on ? `inset 0 0 0 1.5px ${P} / 0.7)` : 'none' })}">${icon ? `<span class="ms" style="font-size:17px">${icon}</span>` : ''}<span>${e(label)}</span></button>`;
      const chips = (items) => `<div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 8px 8px">${items.join('')}</div>`;
      const tog = (on) => `<span style="position:relative;flex:none;width:44px;height:26px;border-radius:13px;background:${on ? `${P})` : '#3a3a3d'};transition:background .2s"><span style="position:absolute;top:3px;left:${on ? 21 : 3}px;width:20px;height:20px;border-radius:10px;background:#f4f3ef;transition:left .2s"></span></span>`;
      const row = (arg, label, sub, on) => `<button data-on-click="mdTog" data-arg="${e(arg)}" style="width:100%;min-height:44px;padding:0 12px;border-radius:14px;display:flex;align-items:center;gap:10px;text-align:left">
        <span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(label)}</span>${sub ? `<span style="font-size:11px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(sub)}</span>` : ''}</span>${tog(on)}</button>`;
      const mps = this.find(/^media_player\./).filter(id => this.st(id));
      const isTv = (id) => this.at(id, 'device_class') === 'tv';
      const tvId = this.tvId();
      // TV-er: device_class tv først, så resten (valgt/standard alltid med)
      const tvs = [...mps.filter(isTv), ...mps.filter(id => !isTv(id))];
      const vm = this.volMode(), sc = this.volScripts();
      const volOpts = mps.filter(id => id !== tvId && this.hasVol(id));
      const scripts = this.find(/^script\./).filter(id => this.st(id));
      const spkOn = new Set(this.speakers().map(x => x.entity));
      const cfgSp = this.cfgSpeakers();
      const spkAll = [...cfgSp.map(x => x.entity).filter(id => this.st(id)), ...mps.filter(id => !isTv(id) && id !== tvId && !cfgSp.some(x => x.entity === id))];
      const spkName = (id) => (cfgSp.find(x => x.entity === id) || {}).navn || this.fname(id);
      const hidApps = new Set(this.U().skjul_apper || []);
      const scriptPick = (k, label, cur) => `<div style="padding:6px 12px 0;font-size:12px;color:#a9a7a2">${e(label)}</div>
        <div data-hscroll="1" style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:4px 8px 8px">${scripts.length ? scripts.map(id => chip('mdSet', k + '|' + id, this.fname(id), cur === id)).join('') : '<span style="font-size:12px;color:#6d6c69;padding:8px 4px">Fant ingen skript</span>'}</div>`;
      return `<div data-key="kd-md-tilpass" style="display:flex;flex-direction:column">
        ${head('TV-fanen styrer')}
        ${chips(tvs.map(id => chip('mdSet', 'tv|' + id, this.fname(id), id === tvId, isTv(id) ? 'tv' : 'speaker')))}
        ${head('Volumknapper på fjernkontrollen')}
        ${chips([chip('mdSet', 'volum|auto', 'Automatisk', vm === 'auto', 'auto_mode'), chip('mdSet', 'volum|fjernkontroll', 'Fjernkontroll', vm === 'fjernkontroll', 'settings_remote'),
          ...volOpts.map(id => chip('mdSet', 'volum|' + id, this.fname(id), vm === id, 'speaker')), chip('mdSet', 'volum|skript', 'Skript', vm === 'skript', 'description')])}
        ${vm === 'skript' ? scriptPick('volum_opp', 'Volum opp', sc.opp) + scriptPick('volum_ned', 'Volum ned', sc.ned) : ''}
        ${spkAll.length ? head('Høyttalere i Musikk') + spkAll.map(id => row('spk|' + id, spkName(id), id, spkOn.has(id))).join('') : ''}
        ${(this.config.apper || []).length ? head('App-snarveier') + this.config.apper.map(x => row('app|' + x.navn, x.navn, x.kilde && x.kilde !== x.navn ? x.kilde : x.skript || '', !hidApps.has(x.navn))).join('') : ''}
        ${Object.keys(this.U()).length ? `<div style="display:flex;justify-content:flex-end;padding:4px 8px 6px"><button data-on-click="mdReset" style="height:34px;padding:0 12px;border-radius:17px;font-size:12px;color:#a9a7a2;background:rgba(255,255,255,0.06)">Tilbakestill media</button></div>` : ''}
      </div>`;
    }

    afterRender() {
      this._padInit();
      // oppdater avspillingstiden hvert sekund mens noe spilles
      clearTimeout(this._tick);
      if (this._connected && this._playingPos) this._tick = setTimeout(() => this._queue(), 1000);
    }

    body() {
      const s = this.state, cf = this.config, e = KD.e, S = KD.S;
      const tvId = this.tvId(), tvA = (this.st(tvId) || {}).attributes || {};
      const tvOn = this.on(tvId);
      const pl = this.player(), plA = (this.st(pl) || {}).attributes || {};
      const playing = this.v(pl) === 'playing';
      if (!s.tab) s.tab = !tvOn && playing ? 'music' : 'tv';
      const tv = s.tab === 'tv';
      const app = tvOn ? this.appOf(tvA) : null;
      const speakers = this.speakers();
      const act = speakers.filter(x => this.inGroup(x.entity));
      const tvPos = tvOn ? this.pos(tvId) : null;
      this._playingPos = (tv && tvPos && this.v(tvId) === 'playing');
      const tvState = this.v(tvId);
      let now;
      if (tv) {
        const title = !this.ok(tvId) ? 'Utilgjengelig' : !tvOn ? 'Av' : tvA.media_title || (app ? app.navn : tvA.app_name || tvA.source || 'Hjem-skjerm');
        const verb = tvState === 'playing' ? 'Spiller' : tvState === 'paused' ? 'Pause' : '';
        const sub = !tvOn ? 'Trykk på av/på for å starte'
          : verb && tvPos ? `${verb} · ${tm(tvPos[0])} av ${tm(tvPos[1])}`
            : verb ? [verb, tvA.media_title ? (app ? app.navn : tvA.app_name) : ''].filter(Boolean).join(' · ')
              : app || tvA.app_name ? (app ? app.navn : tvA.app_name) : 'Velg en app';
        now = { device: (tvId === cf.tv && cf.tv_navn) || this.fname(tvId), title, sub, icon: app ? app.ikon || 'smart_display' : 'tv', pic: tvOn ? tvA.entity_picture : null };
      } else {
        const on = playing || this.v(pl) === 'paused';
        const artist = [plA.media_artist, plA.media_album_name].filter(Boolean).join(' · ');
        now = { device: `${act.length} høyttalere`, title: on && plA.media_title ? plA.media_title : playing ? (plA.media_channel || plA.source || 'Spiller') : 'Ingenting spilles',
          sub: on ? (artist || plA.media_channel || plA.source || plA.app_name || '') : (plA.source || plA.app_name || (this.st(pl) ? this.fname(pl) : '–')), icon: 'music_note', pic: on ? plA.entity_picture : null };
        this._playingPos = false;
      }
      const artBg = tv && app ? (app.farge || '#2a2a2d') : !tv && playing ? 'oklch(0.55 0.1 60)' : '#2a2a2d';
      const art = { width: 64, height: 64, borderRadius: 18, flex: 'none', display: 'grid', placeItems: 'center', background: artBg, color: '#f2f1ee', transition: 'background .3s' };
      if (now.pic) Object.assign(art, { backgroundImage: `url('${String(now.pic).replace(/["'()\s]/g, c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))}')`, backgroundSize: 'cover', backgroundPosition: 'center' });
      const powOn = tv ? tvOn : playing;
      const powerBtn = { width: 44, height: 44, borderRadius: 22, flex: 'none', display: 'grid', placeItems: 'center', background: powOn ? a(C.green, 0.2) : '#232326', color: powOn ? C.green : C.red };
      const tabF = (k, l, icon) => ({ k, label: l, icon, style: { height: 40, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 500, background: s.tab === k ? PINK : 'transparent', color: s.tab === k ? '#2a1720' : '#a9a7a2' } });
      const tabs = [tabF('tv', 'TV', 'tv'), tabF('music', 'Musikk', 'music_note')];
      const padBtn = (k, icon, pos) => ({ k, icon, style: { position: 'absolute', ...pos, width: 64, height: 64, borderRadius: 32, display: 'grid', placeItems: 'center', color: s.press === k ? '#f2f1ee' : '#a9a7a2', background: s.press === k ? 'rgba(255,255,255,0.08)' : 'transparent', transition: 'background .15s' } });
      const pad = [padBtn('up', 'keyboard_arrow_up', { left: 93, top: 6 }), padBtn('down', 'keyboard_arrow_down', { left: 93, bottom: 6 }), padBtn('left', 'keyboard_arrow_left', { left: 6, top: 93 }), padBtn('right', 'keyboard_arrow_right', { right: 6, top: 93 })];
      const ok = { position: 'absolute', inset: 75, borderRadius: '50%', background: s.press === 'ok' ? '#333336' : '#232326', boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 8px 20px rgba(0,0,0,0.3)', fontSize: 15, fontWeight: 600, color: '#c9c7c2', transition: 'background .15s' };
      const keys = [['power_settings_new', 'power', C.red], ['undo', 'back'], ['home', 'home'], ['mic', 'mic'], ['play_pause', 'playpause']].map(([icon, k, col]) => ({ icon, k, iconStyle: { fontSize: 24, color: col || '#f2f1ee' } }));
      const vA = (this.st(this.volTarget()) || {}).attributes || {};
      const muted = !!vA.is_volume_muted;
      const volN = vA.volume_level != null ? Math.round(vA.volume_level * 100) : null;
      const muteIcon = muted ? 'volume_off' : 'volume_mute', volLabel = muted ? 'Dempet' : volN == null ? '–' : `${volN}`;
      const volBar = { width: `${muted || volN == null ? 0 : volN}%`, height: '100%', borderRadius: 2, background: '#f2f1ee', transition: 'width .2s' };
      const apps = this.appList().map(x => ({ i: x.i, name: x.navn, icon: x.ikon || 'smart_display',
        style: { height: 76, borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: x.farge || '#2a2a2d', boxShadow: app && app.navn === x.navn ? 'inset 0 0 0 2px #f2f1ee' : 'none', color: '#f2f1ee' } }));
      const playIcon = playing ? 'pause' : 'play_arrow';
      const speakerMeta = `${act.length} av ${speakers.length} i gruppen`;
      const spk = speakers.map((sp, i) => {
        const id = sp.entity, on = this.inGroup(id), grp = this.grouped(id) || id === pl;
        const st = this.v(id);
        const lv = this.at(id, 'volume_level');
        const vol = lv == null ? null : Math.round(lv * 100);
        return { id, name: sp.navn,
          sub: on ? (st === 'playing' || playing ? 'Spiller' : grp ? 'I gruppen' : 'På') : (!this.ok(id) ? 'Utilgjengelig' : grp ? 'Ikke med' : 'Av'),
          vol: vol == null ? '–' : `${vol} %`,
          row: { display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 4px', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none', opacity: on ? 1 : 0.55 },
          iconWrap: { width: 34, height: 34, borderRadius: 17, flex: 'none', display: 'grid', placeItems: 'center', background: on ? a(C.blue, 0.2) : '#1f1f22', color: on ? C.blue : '#6d6c69' },
          fill: { position: 'absolute', left: 0, top: 0, bottom: 0, width: `${vol || 0}%`, borderRadius: 3, background: on ? '#f2f1ee' : '#6d6c69' } };
      });
      // tillegg: radiokanaler og kilder (ikke i designet – samme stil som designets valgbrikker)
      const cur = low(plA.media_channel || plA.media_title || plA.source);
      const chip = (on) => ({ flex: 'none', height: 40, padding: '0 14px 0 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', background: on ? a(C.blue, 0.14) : '#1c1c1f', color: on ? '#f2f1ee' : '#c9c7c2', boxShadow: on ? `inset 0 0 0 1px ${a(C.blue, 0.45)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)' });
      const radios = this.radios().map(r => ({ ...r, style: chip(playing && !!cur && (cur.includes(low(r.navn)) || low(r.navn).includes(cur))) }));
      const sources = cf.vis_kilder === false ? [] : (plA.source_list || []).map(src => ({ src, style: chip(low(src) === low(plA.source)) }));
      const secHead = (t) => `<div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:0 4px"><span>${e(t)}</span></div>`;
      const chipRow = (items, fn) => `<div data-hscroll="1" style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 calc(-1 * var(--kd-kant,10px));padding:0 var(--kd-kant,10px)">${items.map(fn).join('')}</div>`;

      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:20px">
  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Media</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section data-on-click="openMore" data-arg="${e(tv ? tvId : pl)}" style="display:flex;align-items:center;gap:16px;padding:16px;border-radius:24px;background:#1c1c1f;cursor:pointer">
    <div style="${S(art)}"><span class="ms" style="font-size:30px;font-variation-settings:'FILL' 1;${now.pic ? 'opacity:0' : ''}"><span>${e(now.icon)}</span></span></div>
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px">
      <div style="font-size:12px;color:#8e8d89;white-space:nowrap"><span>${e(now.device)}</span></div>
      <div style="font-size:18px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(now.title)}</span></div>
      <div style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(now.sub)}</span></div>
    </div>
    <button data-on-click="${tv ? 'powerTv' : 'powerMusic'}" style="${S(powerBtn)}"><span class="ms" style="font-size:22px">power_settings_new</span></button>
  </section>

  ${KD.segHTML('fane', [['tv', 'TV', 'tv'], ['music', 'Musikk', 'music_note']], s.tab, 'tab', { pink: true })}

  ${tv ? `
    <section style="display:flex;justify-content:center">
      <div data-key="kd-pad" role="group" aria-label="Styreflate" style="position:relative;width:250px;height:250px;border-radius:50%;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05);touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;cursor:pointer">
        ${pad.map(p => `<span data-arg="${p.k}" style="${S({ ...p.style, pointerEvents: 'none' })}"><span class="ms" style="font-size:28px"><span>${p.icon}</span></span></span>`).join('')}
        <span data-arg="ok" style="${S({ ...ok, display: 'grid', placeItems: 'center', pointerEvents: 'none' })}">OK</span>
      </div>
    </section>
    <section style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">
      ${keys.map(k => `<button class="kd-md-key" data-on-click="key" data-arg="${k.k}" style="height:56px;border-radius:28px;background:#1c1c1f;display:grid;place-items:center"><span class="ms" style="${S(k.iconStyle)}"><span>${k.icon}</span></span></button>`).join('')}
    </section>
    <section style="display:flex;align-items:center;gap:8px;height:60px;padding:0 6px;border-radius:30px;background:#1c1c1f">
      <button class="kd-md-vol" data-on-click="vol" data-arg="down" style="width:48px;height:48px;border-radius:24px;display:grid;place-items:center"><span class="ms" style="font-size:24px">volume_down</span></button>
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px">
        <div style="height:4px;width:100%;border-radius:2px;background:#2e2e31;overflow:hidden"><div style="${S(volBar)}"></div></div>
        <button data-on-click="mute" style="font-size:12px;color:#a9a7a2;display:flex;align-items:center;gap:4px;font-variant-numeric:tabular-nums"><span class="ms" style="font-size:15px"><span>${muteIcon}</span></span><span>${e(volLabel)}</span></button>
      </div>
      <button class="kd-md-vol" data-on-click="vol" data-arg="up" style="width:48px;height:48px;border-radius:24px;display:grid;place-items:center"><span class="ms" style="font-size:24px">volume_up</span></button>
    </section>
    ${apps.length ? `<section style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
      ${apps.map(p => `<button data-on-click="app" data-arg="${p.i}" style="${S(p.style)}"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1"><span>${e(p.icon)}</span></span><span style="font-size:12px;font-weight:600"><span>${e(p.name)}</span></span></button>`).join('')}
    </section>` : ''}` : `
    <section style="display:flex;align-items:center;justify-content:center;gap:22px">
      <button data-on-click="prev" style="width:48px;height:48px;border-radius:24px;display:grid;place-items:center;color:#c9c7c2"><span class="ms" style="font-size:28px;font-variation-settings:'FILL' 1">skip_previous</span></button>
      <button data-on-click="playPause" style="width:68px;height:68px;border-radius:34px;background:#f2f1ee;color:#141416;display:grid;place-items:center"><span class="ms" style="font-size:36px;font-variation-settings:'FILL' 1"><span>${playIcon}</span></span></button>
      <button data-on-click="next" style="width:48px;height:48px;border-radius:24px;display:grid;place-items:center;color:#c9c7c2"><span class="ms" style="font-size:28px;font-variation-settings:'FILL' 1">skip_next</span></button>
    </section>
    ${spk.length ? `<section style="display:flex;flex-direction:column;gap:2px">
      <div style="display:flex;justify-content:space-between;padding:0 4px 8px">
        <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Høyttalere</div>
        <div style="font-size:12px;color:#6d6c69"><span>${e(speakerMeta)}</span></div>
      </div>
      ${spk.map(sp => `
        <div style="${S(sp.row)}">
          <div style="display:flex;align-items:center;gap:12px">
            <button data-on-click="toggleSpeaker" data-arg="${e(sp.id)}" style="${S(sp.iconWrap)}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">speaker</span></button>
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
              <span style="font-size:14px;font-weight:500"><span>${e(sp.name)}</span></span>
              <span style="font-size:12px;color:#8e8d89"><span>${e(sp.sub)}</span></span>
            </div>
            <span style="font-size:12px;color:#a9a7a2;font-variant-numeric:tabular-nums"><span>${e(sp.vol)}</span></span>
          </div>
          <div data-on-pointerdown="setVol" data-arg="${e(sp.id)}" style="height:24px;display:flex;align-items:center;cursor:pointer;padding-left:46px">
            <div style="position:relative;width:100%;height:5px;border-radius:3px;background:#2e2e31"><div style="${S(sp.fill)}"></div></div>
          </div>
        </div>`).join('')}
    </section>` : ''}
    ${radios.length ? `<section style="display:flex;flex-direction:column;gap:8px">
      ${secHead('Radio')}
      ${chipRow(radios, r => `<button data-on-click="radio" data-arg="${e(r.entity)}" style="${S(r.style)}"><span class="ms" style="font-size:17px">radio</span><span>${e(r.navn)}</span></button>`)}
    </section>` : ''}
    ${sources.length ? `<section style="display:flex;flex-direction:column;gap:8px">
      ${secHead('Kilde')}
      ${chipRow(sources, x => `<button data-on-click="source" data-arg="${e(x.src)}" style="${S(x.style)}"><span class="ms" style="font-size:17px">input</span><span>${e(x.src)}</span></button>`)}
    </section>` : ''}`}
</div>`;
    }
  }

  KD.define('kd-media-card', KDMediaCard, 'KD Media', 'Høyttalere og TV – pikselkopi av Claude Design');
  KD.sheet('media', 'kd-media-card');
})();
} catch (e) { console.error('ki-hjem-design: 51-kd-media-card.js', e); }

/* ===== 52-kd-bil-card.js ===== */
try {
/*
 * kd-bil-card – pikselkopi av Claude Design «Bil» (Tesla Model Y), med ekte data.
 *
 *   type: custom:kd-bil-card        # alt annet er valgfritt («auto config»)
 * Batterinivå, klima, sentry, posisjon (device_tracker) og forbruk letes opp automatisk blant entiteter
 * med prefiksene i `prefiks` (standard: tesla_model_y, folkevogn). «Siste turer» bygges fra historikken
 * til posisjonen, kilometertelleren og batteriet. «Spart per dag» kommer fra langtidsstatistikken.
 */
(() => {
  const KD = window.KD;
  const C = { green: 'oklch(0.8 0.12 150)', amber: 'oklch(0.82 0.12 75)', blue: 'oklch(0.8 0.12 250)', red: 'oklch(0.72 0.15 25)' };
  const a = KD.a, PINK = KD.PINK;
  const nf = (n, d = 1) => (n == null || isNaN(n)) ? '–' : Number(n).toLocaleString('nb-NO', { minimumFractionDigits: d, maximumFractionDigits: d });
  const AUTO = {
    batteri: [/^sensor\..*(batteri_batteriniva|battery_level|batteriniva|battery)$/],
    klima: [/^climate\./],
    sentry: [/^switch\..*sentry/],
    posisjon: [/^device_tracker\..*(location|posisjon|position)/, /^device_tracker\.(?!.*(route|destination|rute))/],
    forbruk: [/^sensor\..*(consumption|forbruk|wh_km|energy_per_km)/],
    ladestatus: [/^(select|sensor)\..*charging_state/],
    ladeport: [/^cover\..*charge_port/, /^(switch|lock)\..*charge_port/, /^(cover|switch)\..*ladeport/],
  };
  const PILL = 'display:inline-flex;align-items:center;height:30px;padding:0 11px;border-radius:15px;background:#232326;color:#f2f1ee;font-weight:500;vertical-align:middle;white-space:nowrap';
  const SEAT = { off: 'Av', low: 'Lav', medium: 'Middels', high: 'Høy', '0': 'Av', '1': 'Lav', '2': 'Middels', '3': 'Høy', auto: 'Auto' };

  /** Bilscenen (designets CarScene) som SVG/HTML-streng */
  function carScene(s, outer) {
    const body = '#c9d3dc', shade = '#a7b3be', glass = s.climate ? 'rgba(255,150,90,0.55)' : 'rgba(40,52,64,0.9)';
    const ease = 'cubic-bezier(.34,1.3,.64,1)';
    const winD = 'M64,44 L82,29 C90,25 102,24 112,24 L146,24 C156,24 164,30 170,40 L170,44 Z';
    const S = KD.S;
    const wheels = [48, 160].map(cx => `<g><circle cx="${cx}" cy="66" r="12" fill="#16181b"></circle><circle cx="${cx}" cy="66" r="7" fill="#3a3f46"></circle><circle cx="${cx}" cy="66" r="2" fill="#8d949c"></circle></g>`).join('');
    const svg = `<svg viewBox="0 0 200 90" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible">`
      + `<defs><clipPath id="carWin"><path d="${winD}"></path></clipPath></defs>`
      + `<ellipse cx="102" cy="78" rx="94" ry="5" fill="rgba(0,0,0,0.45)"></ellipse>`
      + `<g style="${S({ transformOrigin: '146px 24px', transformBox: 'view-box', transform: s.trunk ? 'rotate(-28deg)' : 'none', transition: 'transform .8s ' + ease })}"><path d="M146,22 C160,22 172,30 182,40 L190,44 L190,50 L170,48 L146,24 Z" fill="${shade}"></path></g>`
      + `<path d="M10,60 C10,52 16,49 28,47 L62,44 C68,36 76,29 86,26 C96,23 108,22 120,22 L146,22 C160,22 172,30 182,40 L190,44 C195,46 196,52 196,58 L196,66 L10,66 Z" fill="${body}"></path>`
      + `<path d="${winD}" fill="rgba(20,24,30,0.95)"></path>`
      + `<g clip-path="url(#carWin)"><rect x="60" y="22" width="60" height="24" fill="${glass}" style="${S({ transform: s.window ? 'translateY(13px)' : 'none', transition: 'transform .9s ' + ease + ', fill .6s' })}"></rect>`
      + `<rect x="120" y="22" width="56" height="24" fill="${glass}" style="transition:fill .6s"></rect></g>`
      + `<rect x="118" y="24" width="3" height="20" fill="#1a1e24"></rect>`
      + `<path d="M40,55 L150,55" stroke="${shade}" stroke-width="1"></path>`
      + `<g style="${S({ transformOrigin: '62px 44px', transformBox: 'view-box', transform: s.frunk ? 'rotate(22deg)' : 'none', transition: 'transform .8s ' + ease })}"><path d="M12,52 C16,49 28,47 62,44 L62,46 C40,48 22,50 12,54 Z" fill="${shade}"></path></g>`
      + `<rect x="186" y="45" width="8" height="4" rx="2" fill="oklch(0.62 0.2 25)"></rect>`
      + `<rect x="11" y="51" width="9" height="3" rx="1.5" fill="#eef3f8"></rect>`
      + wheels
      + (s.charging ? `<circle cx="189" cy="51" r="3" fill="oklch(0.8 0.16 150)" style="animation:pulse 1.2s ease-in-out infinite"></circle>` : '')
      + (s.sentry ? `<circle cx="120" cy="34" r="1.6" fill="oklch(0.66 0.22 25)" style="animation:pulse 1.4s ease-in-out infinite"></circle>` : '')
      + `</svg>`;
    const heat = s.climate ? [0, 1, 2].map(i => `<span style="${S({ position: 'absolute', left: (44 + i * 10) + '%', top: '8%', width: 10, height: 22, borderRadius: 6, borderLeft: '2px solid oklch(0.78 0.15 45)', opacity: 0, animation: 'rise 2s ease-out ' + (i * 0.5) + 's infinite' })}"></span>`).join('') : '';
    return `<div style="${outer || 'position:absolute;right:6px;bottom:8px;width:230px;height:118px;pointer-events:none'}">`
      + `<span style="${S({ position: 'absolute', left: '26%', bottom: 4, width: '50%', height: 4, borderRadius: 2, background: s.charging ? 'repeating-linear-gradient(90deg, oklch(0.8 0.16 150) 0 14px, oklch(0.62 0.14 150) 14px 20px)' : 'transparent', backgroundSize: '40px 4px', boxShadow: s.charging ? '0 0 14px oklch(0.8 0.16 150 / 0.7)' : 'none', animation: s.charging ? 'flow .8s linear infinite' : 'none' })}"></span>`
      + `<div style="position:absolute;left:0;right:0;top:24px;bottom:0">${svg}${heat}</div>`
      + `<span data-key="${s.locked ? 'l' : 'u'}" style="${S({ position: 'absolute', left: '55%', top: 0, width: 26, height: 26, marginLeft: -13, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.1)', color: s.locked ? '#f2f1ee' : 'oklch(0.82 0.12 75)', animation: 'bob .5s ease-out' })}"><span class="ms" style="font-size:16px;font-variation-settings:'FILL' 1">${s.locked ? 'lock' : 'lock_open'}</span></span>`
      + (s.charging ? `<span style="position:absolute;right:4px;top:70px;width:10px;height:10px;border-radius:5px;border:2px solid oklch(0.8 0.16 150);animation:ring 1.4s ease-out infinite"></span>` : '')
      + `</div>`;
  }

  class KDBilCard extends KD.KDSheet {
    static head = ['directions_car', 'Bil', 'Tesla Model Y'];
    static defaults = {
      navn: 'Tesla Model Y',
      prefiks: ['tesla_model_y', 'folkevogn'],
      kapasitet: 75,            // kWh – for anslag av ladetid/kostnad og kWh per tur
      ladeeffekt_kw: 11,        // laderens effekt når den ikke lader nå (for anslaget)
      batteri: null,            // auto: sensor.tesla_model_y_batteri_batteriniva
      rekkevidde: 'sensor.tesla_model_y_batteri_estimert_batterirekkevidde',
      ladegrense: 'input_number.tesla_model_y_ladegrense',
      lader: 'switch.elbillader_charging',
      ladeeffekt: 'sensor.elbillader_charge_power',
      ladetid: 'sensor.ki_tesla_ladetid_gjenstaende',
      ladepris: 'sensor.ki_tesla_ladepris_estimat',
      forrige_lading: 'sensor.ki_tesla_forrige_lading_kostnad',
      smartlading: 'switch.ki_lading_automatikk',
      nattlading: 'switch.ki_elbil_natt',
      nattlading_til: 'time.ki_elbil_til',
      laas: 'switch.tesla_model_y_car_doors_locked',
      laas_omvendt: true,       // Tesla-brua: `on` på doors_locked betyr ÅPEN
      tut: 'button.folkevogn_honk_horn',
      defrost: 'switch.tesla_model_y_klima_climate_defrost',
      frunk: 'switch.tesla_model_y_car_trunk_front',
      bagasje: 'switch.tesla_model_y_car_trunk_rear',
      vindu: 'switch.tesla_model_y_klima_climate_window_vent',
      klima: null, sentry: null, posisjon: null, forbruk: null,
      i_dag: 'sensor.tesla_model_y_daglig_kjoring',
      km_stand: 'sensor.tesla_model_y_kilometerteller',
      spart_maned: 'sensor.ki_drivstoff_spart_denne_maneden',
      spart_ar: 'sensor.ki_drivstoff_spart_i_ar',
      kr_mil_el: 'sensor.ki_drivstoff_kostnad_per_mil_tesla_model_y',
      kr_mil_diesel: 'sensor.ki_drivstoff_kostnad_per_mil_audi_a6_avant_2011',
      diesel_liter: 'sensor.ki_drivstoff_liter_diesel_spart_i_ar',
      co2: 'sensor.ki_drivstoff_co2_spart_i_ar',
      dieselpris: 'sensor.ki_drivstoff_dieselpris',
      strompris: 'sensor.ki_drivstoff_ladepris',
    };
    static sheetCss = `
@keyframes rise{0%{transform:translateY(6px);opacity:0}40%{opacity:.9}100%{transform:translateY(-16px);opacity:0}}
@keyframes pulse{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes flow{from{background-position:0 0}to{background-position:40px 0}}
@keyframes ring{from{transform:scale(.6);opacity:.8}to{transform:scale(2.2);opacity:0}}
@keyframes bob{0%{transform:translateY(0)}30%{transform:translateY(-5px)}60%{transform:translateY(0)}}
.kd-car-act:active{transform:scale(0.95)}
@keyframes kdcflow{to{background-position:28.28px 0}}`;

    constructor() { super(); this.state = { tab: 'charge', flash: null }; }

    /* ----- oppdagelse ----- */
    auto(key) {
      const c = this.config;
      if (c[key]) return c[key];
      if (key === 'batteri' && this.st('sensor.tesla_model_y_batteri_batteriniva')) return 'sensor.tesla_model_y_batteri_batteriniva';
      const pre = [].concat(c.prefiks || []);
      const ids = Object.keys(this.all()).filter(id => pre.some(p => id.includes(p)));
      for (const re of AUTO[key] || []) {
        const hit = ids.find(id => re.test(id) && !(key === 'batteri' && /range|rekkevidde|heater|charging/.test(id)));
        if (hit) return hit;
      }
      return null;
    }
    isOpen(id) { return !!id && ['on', 'open', 'opening'].includes(this.v(id)); }
    unlocked() {
      const st = this.v(this.config.laas);
      return st === 'unlocked' ? true : st === 'locked' ? false : st === 'on' ? this.config.laas_omvendt !== false : st === 'off' ? this.config.laas_omvendt === false : false;
    }
    kw() {
      const id = this.config.ladeeffekt; let v = this.n(id);
      if (v == null) return null;
      const u = this.unit(id);
      return u === 'W' || (!u && v > 100) ? v / 1000 : v;
    }

    /* ----- handlinger ----- */
    tab(e, k) { this.setState({ tab: k }); }
    toggleSentry() { const id = this.auto('sentry'); if (id) this.call('switch', 'toggle', { entity_id: id }); }
    toggleWindow() { const id = this.config.vindu; if (id && this.st(id)) this.toggle(id); }
    act(e, k) {
      const c = this.config;
      if (k === 'lock') { const id = c.laas; if (id.startsWith('lock.')) return this.toggle(id); return this.call(id.split('.')[0], 'toggle', { entity_id: id }); }
      if (k === 'horn') { this.setState({ flash: 'horn' }); clearTimeout(this._ft); this._ft = setTimeout(() => this.setState({ flash: null }), 700); return c.tut && this.press(c.tut); }
      if (k === 'climate') {
        const cl = this.auto('klima');
        if (cl) return this.call('climate', this.ok(cl) && this.v(cl) !== 'off' ? 'turn_off' : 'turn_on', { entity_id: cl });
        if (c.defrost) return this.toggle(c.defrost);
      }
      if (k === 'frunk' && c.frunk) return this.toggle(c.frunk);
      if (k === 'trunk' && c.bagasje) return this.toggle(c.bagasje);
      if (k === 'port') { const id = this.auto('ladeport'); if (id) return this.toggle(id); }
      if (k === 'window') return this.toggleWindow();
      if (k === 'sentry') return this.toggleSentry();
    }
    toggleDefrost() { const id = this.config.defrost; if (id && this.st(id)) this.toggle(id); }
    stepTemp(e, d) {
      const id = this.auto('klima'); if (!id) return;
      const cur = parseFloat(this.at(id, 'temperature')), step = parseFloat(this.at(id, 'target_temp_step')) || 0.5;
      const lo = parseFloat(this.at(id, 'min_temp')) || 15, hi = parseFloat(this.at(id, 'max_temp')) || 28;
      this.call('climate', 'set_temperature', { entity_id: id, temperature: KD.clamp(Math.round(((isNaN(cur) ? 21 : cur) + (+d) * step) * 10) / 10, lo, hi) });
    }
    selOpt(e, arg) { const i = String(arg).lastIndexOf('|'); if (i > 0) this.call('select', 'select_option', { entity_id: arg.slice(0, i), option: arg.slice(i + 1) }); }
    /** setevarme: select-entiteter med bilens prefiks (seat_heater / setevarme) */
    seats() {
      const pre = [].concat(this.config.prefiks || []);
      const ids = Array.isArray(this.config.seter) ? this.config.seter : Object.keys(this.all()).filter(id => /^select\./.test(id) && /seat_heat|setevarme/.test(id) && pre.some(p => id.includes(p)));
      return ids.filter(id => this.ok(id)).map(id => {
        let navn = this.fname(id); for (const p of pre) navn = navn.replace(new RegExp('^' + p.replace(/_/g, '[ _]') + '\\s*', 'i'), '');
        return { id, navn: navn.replace(/_/g, ' ') || 'Setevarme', opts: (this.at(id, 'options', []) || []).map(String) };
      }).filter(x => x.opts.length > 1 && x.opts.length <= 5).slice(0, 6);
    }
    /** dekktrykk: { fl, fr, rl, rr: { id, v, u, low }, low } – config `dekk: { fl: sensor.x, … }` overstyrer */
    tyres() {
      const pre = [].concat(this.config.prefiks || []), cfg = this.config.dekk || {};
      const ids = Object.keys(this.all()).filter(id => /^sensor\./.test(id) && /(tire|tyre|tpms|dekk)/.test(id) && pre.some(p => id.includes(p)) && !/warning|advarsel|last_seen/.test(id));
      const POS = { fl: /(front|foran)_?(left|venstre)|_fl$|_lf$/, fr: /(front|foran)_?(right|hoyre|høyre)|_fr$|_rf$/, rl: /(rear|bak)_?(left|venstre)|_rl$|_lr$/, rr: /(rear|bak)_?(right|hoyre|høyre)|_rr$|_rr$/ };
      const out = {}; let any = false, low = false;
      for (const k of ['fl', 'fr', 'rl', 'rr']) {
        const id = cfg[k] || ids.find(x => POS[k].test(x));
        const v = id ? this.n(id) : null; if (v == null) continue;
        const u = this.unit(id) || 'bar', lo = /psi/i.test(u) ? v < 36 : /kpa/i.test(u) ? v < 250 : v < 2.5;
        out[k] = { id, v, u, low: lo }; any = true; if (lo) low = true;
      }
      return any ? { ...out, low } : null;
    }
    toggleCharge() { const id = this.config.lader; if (id) this.call(id.split('.')[0] === 'input_boolean' ? 'input_boolean' : 'switch', 'toggle', { entity_id: id }); }
    setLimit(e, v) { this.setNum(this.config.ladegrense, +v); }
    toggleSmart() { const id = this.config.smartlading; if (id && this.st(id)) this.toggle(id); }
    openMore(e, id) { this.more(id); }

    /* ----- asynkrone data ----- */
    trips() {
      const tr = this.auto('posisjon'); if (!tr) return [];
      const odo = this.config.km_stand, bat = this.auto('batteri');
      const h = this.cached('kdcar-trips-' + tr, 10 * 60e3, () => this.history([tr, odo, bat].filter(Boolean), 24 * 7), null);
      if (!h) return [];
      const at = (arr, t) => { let v = null; for (const p of arr || []) { if (p.t <= t) { if (typeof p.v === 'number') v = p.v; } else break; } return v; };
      const first = (arr, t) => { for (const p of arr || []) if (p.t >= t && typeof p.v === 'number') return p.v; return null; };
      const pts = (h[tr] || []).filter(p => !KD.BAD.has(p.v));
      const zname = (z) => z === 'home' ? 'Hjem' : z === 'not_home' ? 'Borte' : String(z);
      const out = [];
      let from = null, dep = null;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (p.v === 'not_home') { if (from != null && dep == null) dep = p.t; continue; }
        if (from != null && (dep != null || p.v !== from)) {
          const d0 = dep || p.t, d1 = p.t;
          const o0 = at(h[odo], d0) ?? first(h[odo], d0), o1 = at(h[odo], d1);
          const b0 = at(h[bat], d0) ?? first(h[bat], d0), b1 = at(h[bat], d1);
          const km = o0 != null && o1 != null ? o1 - o0 : null;
          if (km == null || km >= 0.5) out.push({ from: zname(from), to: zname(p.v), d0, d1, km, kwh: b0 != null && b1 != null && b0 > b1 ? (b0 - b1) / 100 * (this.config.kapasitet || 75) : null });
        }
        from = p.v; dep = null;
      }
      return out.reverse().slice(0, 4);
    }
    dailySaved() {
      const id = this.config.spart_ar; if (!id || !this.st(id)) return null;
      const r = this.cached('kdcar-saved-' + id, 30 * 60e3, () => this.stats([id], 24 * 32, 'day', ['max', 'state', 'mean']), null);
      const rows = r && r[id]; if (!rows || !rows.length) return null;
      const vals = rows.map(x => x.state ?? x.max ?? x.mean).filter(v => v != null);
      const inc = [];
      for (let i = 1; i < vals.length; i++) { const d = vals[i] - vals[i - 1]; inc.push(d >= 0 ? d : vals[i]); }
      return inc.slice(-30);
    }

    afterRender() {}

    body() {
      const s = this.state, cf = this.config, e = KD.e, S = KD.S;
      const batId = this.auto('batteri'), climId = this.auto('klima'), sentryId = this.auto('sentry'), portId = this.auto('ladeport'), trId = this.auto('posisjon');
      const batt = this.n(batId), limit = this.n(cf.ladegrense), range = this.n(cf.rekkevidde);
      const kw = this.kw();
      const lsId = this.auto('ladestatus'), ls = String(this.v(lsId)).toLowerCase();
      const charging = this.isOn(cf.lader) || (/charging|starting/.test(ls) && !/not|complete|stopped|disconnected/.test(ls)) || (kw != null && kw > 0.3);
      const locked = !this.unlocked();
      const climate = climId ? (this.ok(climId) && this.v(climId) !== 'off') : this.isOn(cf.defrost);
      const climTemp = climId ? parseFloat(this.at(climId, 'temperature')) : NaN;
      const inside = climId ? parseFloat(this.at(climId, 'current_temperature')) : NaN;
      const frunk = this.isOpen(cf.frunk), trunk = this.isOpen(cf.bagasje), windowOpen = this.isOpen(cf.vindu), portOpen = this.isOpen(portId);
      const sentry = sentryId ? this.isOn(sentryId) : false;
      const sc = { climate, charging, sentry, locked, frunk, trunk, window: windowOpen };
      const b = batt == null ? null : Math.floor(batt);
      const lim = limit == null ? null : Math.round(limit);
      const cap = cf.kapasitet || 75;
      const need = batt != null && limit != null ? Math.max(0, limit - batt) / 100 * cap : null;
      let mins = null;
      if (charging && this.n(cf.ladetid, 0) > 0) mins = Math.round(this.n(cf.ladetid));
      else if (need != null) mins = Math.round(need / (charging && kw > 0.3 ? kw : (cf.ladeeffekt_kw || 11)) * 60);
      const eta = mins == null ? '–' : mins ? (mins >= 60 ? `${Math.floor(mins / 60)} t ${mins % 60} min` : `${mins} min`) : 'ferdig';
      const strom = this.n(cf.strompris);
      const cost = this.ok(cf.ladepris) ? Math.round(this.n(cf.ladepris)) : need != null && strom != null ? Math.round(need * strom) : '–';
      const last = this.ok(cf.forrige_lading) ? Math.round(this.n(cf.forrige_lading)) : '–';
      const smartOn = this.isOn(cf.smartlading);
      const til = /^\d{1,2}:\d{2}/.test(this.v(cf.nattlading_til)) && this.isOn(cf.nattlading) ? this.v(cf.nattlading_til).slice(0, 5) : null;
      const zoneRaw = trId ? this.v(trId) : '';
      const place = !zoneRaw || KD.BAD.has(zoneRaw) ? null : zoneRaw === 'home' ? 'Hjemme' : zoneRaw === 'not_home' ? 'Underveis' : zoneRaw;
      const lbl = (t, right = '') => `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 4px;min-height:22px"><div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;white-space:nowrap">${e(t)}</div>${right}</div>`;
      const card = 'border-radius:24px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04)';

      /* ---- helt ---- */
      const heroBg = climate ? 'radial-gradient(110% 80% at 70% 45%, #3a2a24 0%, #1f1f24 55%, #18181b 100%)' : charging ? 'radial-gradient(110% 80% at 70% 55%, #1c3029 0%, #1c1f24 55%, #18181b 100%)' : 'radial-gradient(110% 80% at 70% 50%, #283039 0%, #1c1e22 55%, #18181b 100%)';
      const chips = [[locked, locked ? 'lock' : 'lock_open', locked ? 'Låst' : 'Ulåst', locked ? '#c9c7c2' : C.amber, !locked],
        [charging, 'bolt', kw != null && kw > 0.3 ? `Lader ${nf(kw, 1)} kW` : 'Lader', C.green, true], [climate, 'heat', !isNaN(climTemp) ? `Klima ${Math.round(climTemp)}°` : 'Klima på', C.amber, true],
        [windowOpen, 'window', 'Vindu åpent', C.blue, true], [frunk, 'garage', 'Frunk åpen', C.blue, true], [trunk, 'local_shipping', 'Bagasje åpen', C.blue, true], [portOpen, 'ev_charger', 'Ladeport åpen', C.blue, true]]
        .filter((x, i) => i === 0 || x[0]).map(([, icon, t, c, hi]) => `<span style="height:24px;padding:0 9px 0 7px;border-radius:12px;display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;white-space:nowrap;background:${hi ? a(c, 0.18) : 'rgba(255,255,255,0.07)'};color:${c}"><span class="ms" style="font-size:14px;font-variation-settings:'FILL' 1">${icon}</span>${e(t)}</span>`).join('');
      const batCol = b != null && b < 20 ? C.red : C.green;
      const heroRight = charging ? [`${eta === 'ferdig' ? 'Ferdig ladet' : `${eta} til ${lim == null ? '–' : lim} %`}`, kw != null && kw > 0.3 ? `${nf(kw, 1)} kW` : 'Lader'] : [zoneRaw === 'not_home' ? 'Underveis' : 'Parkert', lim != null ? `Ladegrense ${lim} %` : ''];
      const hero = `<section data-on-click="openMore" data-arg="${e(batId || cf.lader || '')}" style="position:relative;overflow:hidden;padding:18px 18px 16px;border-radius:30px;box-sizing:border-box;display:flex;flex-direction:column;gap:6px;background:${heroBg};box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05);transition:background .8s;cursor:pointer">
    <div style="position:relative;z-index:1;display:flex;align-items:flex-start;gap:10px">
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">
        <span style="font-size:18px;font-weight:600;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(cf.navn)}</span>
        ${place ? `<span data-on-click="openMore" data-arg="${e(trId)}" style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#a9a7a2;min-width:0"><span class="ms" style="font-size:15px;font-variation-settings:'FILL' 1">${zoneRaw === 'home' ? 'home' : 'location_on'}</span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(place)}</span></span>` : ''}
      </div>
      ${sentryId ? `<button data-on-click="toggleSentry" style="flex:none;height:32px;padding:0 12px 0 10px;border-radius:16px;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;background:${sentry ? a(C.red, 0.18) : 'rgba(255,255,255,0.07)'};color:${sentry ? C.red : '#a9a7a2'}"><span class="ms" style="font-size:16px;font-variation-settings:'FILL' 1">${sentry ? 'videocam' : 'videocam_off'}</span>Sentry</button>` : ''}
    </div>
    <div style="position:relative;z-index:1;display:flex;gap:5px;flex-wrap:wrap">${chips}</div>
    <div style="position:relative;height:150px;margin:0 -6px">
      ${cf.bilde ? `<img src="${e(cf.bilde)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 16px 20px rgba(0,0,0,0.5))">` : carScene(sc, 'position:absolute;left:50%;top:0;width:300px;max-width:100%;height:150px;transform:translateX(-50%);pointer-events:none')}
    </div>
    <div style="position:relative;z-index:1;display:flex;align-items:flex-end;justify-content:space-between;gap:10px">
      <div style="display:flex;flex-direction:column;gap:2px;min-width:0">
        <span style="font-size:52px;font-weight:300;letter-spacing:-0.045em;line-height:0.95;font-variant-numeric:tabular-nums">${b == null ? '–' : b}<span style="font-size:20px;color:#8e8d89;letter-spacing:0;margin-left:2px">%</span></span>
        <span style="font-size:13px;color:#a9a7a2;white-space:nowrap"><span style="color:#f2f1ee;font-weight:600">${range == null ? '–' : Math.round(range)} km</span> rekkevidde</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;min-width:0;text-align:right;padding-bottom:2px">
        <span style="font-size:13px;font-weight:600;color:${charging ? C.green : '#f2f1ee'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${e(heroRight[0])}</span>
        <span style="font-size:12px;color:#8e8d89;white-space:nowrap">${e(heroRight[1])}</span>
      </div>
    </div>
    <div style="position:relative;z-index:1;height:12px;border-radius:6px;background:rgba(255,255,255,0.08);margin-top:8px">
      <div style="position:absolute;left:0;top:0;bottom:0;width:${batt == null ? 0 : KD.clamp(batt, 0, 100)}%;border-radius:6px;background:${charging ? `repeating-linear-gradient(-45deg, ${C.green} 0 10px, oklch(0.72 0.12 150) 10px 20px)` : `linear-gradient(90deg, ${a(batCol, 0.75)}, ${batCol})`};box-shadow:0 0 14px ${a(batCol, 0.35)};transition:width 1s${charging ? ';animation:kdcflow .9s linear infinite' : ''}"></div>
      ${lim == null ? '' : `<span style="position:absolute;top:-4px;bottom:-4px;left:calc(${lim}% - 1px);width:2px;border-radius:1px;background:#f2f1ee;box-shadow:0 0 6px rgba(0,0,0,0.6);transition:left .3s"></span>`}
    </div>
  </section>`;

      /* ---- hurtigknapper ---- */
      const tile = (k, icon, label, sub, on, col, handler = 'act') => `<button class="kd-car-act" data-on-click="${handler}" data-arg="${k}" style="min-width:0;height:88px;border-radius:22px;padding:10px 4px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;background:${on ? a(col, 0.15) : '#1c1c1f'};box-shadow:${on ? `inset 0 0 0 1px ${a(col, 0.45)}` : 'inset 0 0 0 1px rgba(255,255,255,0.04)'};transition:transform .15s, background .25s">
        <span style="width:38px;height:38px;border-radius:19px;display:grid;place-items:center;background:${on ? a(col, 0.25) : '#2a2a2e'};color:${on ? col : '#e4e2dd'};transition:background .25s"><span class="ms" style="font-size:21px;font-variation-settings:'FILL' ${on ? 1 : 0}">${icon}</span></span>
        <span style="display:flex;flex-direction:column;align-items:center;gap:0;min-width:0;max-width:100%"><span style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${e(label)}</span><span style="font-size:10.5px;color:${on ? col : '#8e8d89'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${e(sub)}</span></span></button>`;
      const tiles = [
        tile('lock', locked ? 'lock' : 'lock_open', locked ? 'Låst' : 'Ulåst', locked ? 'Sikret' : 'Trykk for å låse', !locked, C.amber),
        tile('climate', 'heat', 'Klima', climate ? (!isNaN(climTemp) ? `På · ${Math.round(climTemp)}°` : 'På') : !isNaN(inside) ? `Av · ${Math.round(inside)}° inne` : 'Av', climate, C.amber),
        cf.frunk && this.st(cf.frunk) ? tile('frunk', 'garage', 'Frunk', frunk ? 'Åpen' : 'Lukket', frunk, C.blue) : '',
        cf.bagasje && this.st(cf.bagasje) ? tile('trunk', 'local_shipping', 'Bagasje', trunk ? 'Åpen' : 'Lukket', trunk, C.blue) : '',
        portId ? tile('port', 'ev_charger', 'Ladeport', portOpen ? 'Åpen' : 'Lukket', portOpen, C.green) : '',
        cf.vindu && this.st(cf.vindu) ? tile('window', 'window', 'Vinduer', windowOpen ? 'Luftes' : 'Lukket', windowOpen, C.blue) : '',
        sentryId ? tile('sentry', sentry ? 'videocam' : 'videocam_off', 'Sentry', sentry ? 'Overvåker' : 'Av', sentry, C.red) : '',
        cf.tut ? tile('horn', 'campaign', 'Tut', 'Blink og tut', s.flash === 'horn', C.blue) : '',
      ].filter(Boolean);
      const controls = `<section style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">${tiles.join('')}</section>`;

      const hasClim = !!(climId || (cf.defrost && this.st(cf.defrost)));
      const tabList = [['charge', 'Lading', 'bolt'], ...(hasClim ? [['climate', 'Klima', 'thermostat']] : []), ['drive', 'Kjøring', 'route'], ['save', 'Sparing', 'savings']];
      const tab = tabList.some(t => t[0] === s.tab) ? s.tab : 'charge';
      const tabs = KD.segHTML('car-tab', tabList, tab, 'tab', { pink: true });
      let tabHTML = '';

      if (tab === 'charge') {
        const steps = [50, 60, 70, 80, 90, 100];
        if (lim != null && !steps.includes(lim)) { steps.push(lim); steps.sort((x, y) => x - y); if (steps.length > 6) steps.splice(steps.indexOf(lim) === 0 ? 1 : 0, 1); }
        const cStats = [['Effekt', kw == null ? '–' : `${nf(kw, 1)} kW`, cf.ladeeffekt], ['Til grensen', eta, cf.ladetid], ['Kostnad', cost === '–' ? '–' : `${cost} kr`, cf.ladepris]];
        tabHTML = `<section style="position:relative;overflow:hidden;display:flex;flex-direction:column;gap:14px;padding:16px;border-radius:26px;background:${charging ? `linear-gradient(150deg, ${a(C.green, 0.2)}, ${a(C.green, 0.05)} 60%), #1c1c1f` : '#1c1c1f'};box-shadow:inset 0 0 0 1px ${charging ? a(C.green, 0.3) : 'rgba(255,255,255,0.04)'}">
      <button data-on-click="toggleCharge" style="display:flex;align-items:center;gap:12px;text-align:left;width:100%">
        <span style="width:46px;height:46px;border-radius:23px;flex:none;display:grid;place-items:center;background:${charging ? C.green : '#2a2a2e'};color:${charging ? '#10231a' : '#e4e2dd'}"><span class="ms" style="font-size:24px;font-variation-settings:'FILL' 1">ev_station</span></span>
        <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:16px;font-weight:600">${charging ? 'Lader nå' : 'Lading av'}</span><span style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(charging ? (eta === 'ferdig' ? 'Ladegrensen er nådd' : `Ferdig om ca. ${eta}`) : smartOn ? 'KI Lading styrer når bilen lader' : 'Trykk for å starte lading')}</span></span>
        ${this.sw(charging)}
      </button>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-radius:18px;background:rgba(255,255,255,0.04);padding:10px 0">
        ${cStats.map(([l, v, id], i) => `<div data-on-click="openMore" data-arg="${e(id || '')}" style="min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;padding:0 6px;${i ? 'border-left:1px solid rgba(255,255,255,0.06)' : ''}"><span style="font-size:11px;color:#8e8d89;white-space:nowrap">${e(l)}</span><span style="font-size:15px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${e(v)}</span></div>`).join('')}
      </div>
    </section>
    ${cf.ladegrense && this.st(cf.ladegrense) ? `<section style="display:flex;flex-direction:column;gap:8px">
      ${lbl('Ladegrense', `<span style="font-size:13px;font-weight:600;font-variant-numeric:tabular-nums">${lim == null ? '–' : lim} %</span>`)}
      ${KD.segHTML('car-lim', steps.map(v => [String(v), `${v} %`]), lim == null ? '' : String(lim), 'setLimit', {})}
      <div style="display:flex;justify-content:space-between;padding:0 6px;font-size:11px;color:#6d6c69"><span>Hverdag 70–80 %</span><span>Langtur 100 %</span></div>
    </section>` : ''}
    <div style="font-size:17px;line-height:1.85;text-wrap:pretty;padding:0 4px;color:#c9c7c2">Det tar ca. <span style="${PILL}">${e(eta)}</span> å lade til <span style="${PILL};background:oklch(0.78 0.13 350 / 0.2);box-shadow:inset 0 0 0 1px oklch(0.78 0.13 350 / 0.45)">${lim == null ? '–' : lim} %</span> og koster ca. <span style="${PILL}">${e(cost)} kr</span>. Sist lading kostet <span style="${PILL}">${e(last)} kr</span>.</div>
    ${cf.smartlading && this.st(cf.smartlading) ? `<section><button data-on-click="toggleSmart" style="width:100%;display:flex;align-items:center;gap:12px;padding:14px;border-radius:24px;text-align:left;background:${smartOn ? 'linear-gradient(135deg, oklch(0.78 0.13 350 / 0.16), oklch(0.9 0.05 20 / 0.06)), #1c1c1f' : '#1c1c1f'};box-shadow:inset 0 0 0 1px ${smartOn ? 'oklch(0.78 0.13 350 / 0.35)' : 'rgba(255,255,255,0.04)'}">
      <span style="width:42px;height:42px;border-radius:21px;flex:none;display:grid;place-items:center;background:${smartOn ? PINK : '#2a2a2e'};color:${smartOn ? '#2a1720' : '#e4e2dd'}"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">auto_awesome</span></span>
      <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:600">KI Lading</span><span style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(smartOn ? 'Lader i billigste timer' + (til ? ` · ferdig ${til}` : '') : 'Lader med en gang bilen kobles til')}</span></span>
      ${this.sw(smartOn)}
    </button></section>` : ''}`;
      }

      if (tab === 'climate') {
        const cOn = climate, cc = C.amber;
        const seats = this.seats();
        const tog = (h, icon, title, sub, on, col) => `<button data-on-click="${h}" style="width:100%;display:flex;align-items:center;gap:12px;padding:12px 14px;text-align:left;border-radius:22px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04)">
        <span style="width:38px;height:38px;border-radius:19px;flex:none;display:grid;place-items:center;background:${on ? a(col, 0.2) : '#2a2a2e'};color:${on ? col : '#c9c7c2'}"><span class="ms" style="font-size:20px;font-variation-settings:'FILL' 1">${icon}</span></span>
        <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:14px;font-weight:600">${e(title)}</span><span style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(sub)}</span></span>${this.sw(on)}</button>`;
        tabHTML = `${climId ? `<section style="position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;gap:14px;padding:18px 16px 16px;border-radius:26px;background:${cOn ? `radial-gradient(100% 90% at 50% 0%, ${a(cc, 0.22)}, rgba(0,0,0,0) 70%), #1c1c1f` : '#1c1c1f'};box-shadow:inset 0 0 0 1px ${cOn ? a(cc, 0.3) : 'rgba(255,255,255,0.04)'}">
      <div style="width:100%;display:flex;justify-content:space-between;align-items:center;gap:8px">
        <span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#a9a7a2"><span class="ms" style="font-size:16px">device_thermostat</span>Inne ${isNaN(inside) ? '–' : nf(inside, 0)}°</span>
        <button data-on-click="act" data-arg="climate" style="height:32px;padding:0 14px 0 10px;border-radius:16px;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;background:${cOn ? cc : 'rgba(255,255,255,0.08)'};color:${cOn ? '#2a1c0c' : '#e4e2dd'}"><span class="ms" style="font-size:17px;font-variation-settings:'FILL' 1">power_settings_new</span>${cOn ? 'På' : 'Av'}</button>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:22px">
        <button data-on-click="stepTemp" data-arg="-1" style="width:52px;height:52px;border-radius:26px;display:grid;place-items:center;background:#2a2a2e"><span class="ms" style="font-size:26px">remove</span></button>
        <span style="min-width:120px;text-align:center;font-size:58px;font-weight:300;letter-spacing:-0.04em;line-height:1;font-variant-numeric:tabular-nums;color:${cOn ? '#f2f1ee' : '#a9a7a2'}">${isNaN(climTemp) ? '–' : nf(climTemp, climTemp % 1 ? 1 : 0)}<span style="font-size:24px;color:#8e8d89">°</span></span>
        <button data-on-click="stepTemp" data-arg="1" style="width:52px;height:52px;border-radius:26px;display:grid;place-items:center;background:#2a2a2e"><span class="ms" style="font-size:26px">add</span></button>
      </div>
      <span style="font-size:12px;color:#8e8d89">${cOn ? 'Klimaanlegget går' : 'Forvarm bilen før du drar'}</span>
    </section>` : ''}
    ${cf.defrost && this.st(cf.defrost) || cf.vindu && this.st(cf.vindu) ? `<section style="display:flex;flex-direction:column;gap:8px">
      ${cf.defrost && this.st(cf.defrost) ? tog('toggleDefrost', 'ac_unit', 'Avising', this.isOn(cf.defrost) ? 'Maks varme på ruter og speil' : 'Av', this.isOn(cf.defrost), C.blue) : ''}
      ${cf.vindu && this.st(cf.vindu) ? tog('toggleWindow', 'window', 'Luft vinduene', windowOpen ? 'Vinduene står på gløtt' : 'Lukket', windowOpen, C.blue) : ''}
    </section>` : ''}
    ${seats.map(x => `<section style="display:flex;flex-direction:column;gap:8px">
      ${lbl(x.navn)}
      ${KD.segHTML('seat-' + x.id, x.opts.map(o => [x.id + '|' + o, SEAT[String(o).toLowerCase()] || o]), x.id + '|' + this.v(x.id), 'selOpt', { small: true })}
    </section>`).join('')}`;
      }

      if (tab === 'drive') {
        const fb = this.auto('forbruk');
        const kmToday = this.n(cf.i_dag), odo = this.n(cf.km_stand);
        const driveStats = [['route', 'I dag', kmToday == null ? '–' : `${Math.round(kmToday).toLocaleString('nb-NO')} km`, cf.i_dag], ['electric_bolt', 'Forbruk', fb && this.ok(fb) ? `${Math.round(this.n(fb))} ${this.unit(fb) || 'Wh/km'}` : '–', fb], ['speed', 'Km-stand', odo == null ? '–' : Math.round(odo).toLocaleString('nb-NO'), cf.km_stand]];
        const dur = (ms) => { const m = Math.round(ms / 60e3); return m >= 60 ? `${Math.floor(m / 60)} t ${m % 60} min` : `${m} min`; };
        const whenW = (d) => { const t0 = new Date(); t0.setHours(0, 0, 0, 0); const diff = Math.round((t0 - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400e3); if (diff <= 0) return 'I dag'; if (diff === 1) return 'I går'; const w = d.toLocaleDateString('nb-NO', { weekday: 'short' }).replace('.', ''); return w.charAt(0).toUpperCase() + w.slice(1); };
        const trips = this.trips();
        const ty = this.tyres();
        const trS = trId ? this.st(trId) : null;
        tabHTML = `${place ? `<section data-on-click="openMore" data-arg="${e(trId)}" style="display:flex;align-items:center;gap:12px;padding:14px;${card};cursor:pointer">
      <span style="position:relative;width:46px;height:46px;border-radius:23px;flex:none;display:grid;place-items:center;background:${a(C.blue, 0.16)};color:${C.blue}"><span class="ms" style="font-size:24px;font-variation-settings:'FILL' 1">${zoneRaw === 'home' ? 'home' : 'location_on'}</span></span>
      <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:11px;color:#8e8d89">Posisjon</span><span style="font-size:16px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(place)}</span><span style="font-size:12px;color:#6d6c69">${trS ? `Sist endret ${e(KD.ago(trS.last_changed))}` : ''}</span></span>
      <span class="ms" style="font-size:22px;color:#6d6c69">chevron_right</span>
    </section>` : ''}
    <section style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
      ${driveStats.map(([ic, l, v, id]) => `<div data-on-click="openMore" data-arg="${e(id || '')}" style="min-width:0;display:flex;flex-direction:column;gap:8px;padding:14px;${card}"><span class="ms" style="font-size:20px;color:#8e8d89">${ic}</span><span style="display:flex;flex-direction:column;gap:2px;min-width:0"><span style="font-size:11px;color:#8e8d89">${e(l)}</span><span style="font-size:15px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(v)}</span></span></div>`).join('')}
    </section>
    ${ty ? `<section style="display:flex;flex-direction:column;gap:8px">
      ${lbl('Dekktrykk', ty.low ? `<span style="font-size:12px;color:${C.amber}">Sjekk trykket</span>` : `<span style="font-size:12px;color:#6d6c69">Alt i orden</span>`)}
      <div style="position:relative;display:grid;grid-template-columns:minmax(0,1fr) 84px minmax(0,1fr);grid-template-rows:auto auto;gap:14px 10px;align-items:center;padding:16px;${card}">
        ${['fl', 'fr', 'rl', 'rr'].map((k, i) => { const t = ty[k]; const lo = t && t.low; return `<div data-on-click="openMore" data-arg="${e(t ? t.id : '')}" style="grid-column:${i % 2 ? 3 : 1};grid-row:${i < 2 ? 1 : 2};min-width:0;display:flex;flex-direction:column;align-items:${i % 2 ? 'flex-start' : 'flex-end'};gap:1px"><span style="font-size:22px;font-weight:400;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;color:${lo ? C.amber : '#f2f1ee'}">${t ? nf(t.v, t.u === 'psi' ? 0 : 1) : '–'}<span style="font-size:11px;color:#8e8d89;margin-left:3px">${e(t ? t.u : '')}</span></span><span style="font-size:11px;color:#8e8d89">${['Foran venstre', 'Foran høyre', 'Bak venstre', 'Bak høyre'][i]}</span></div>`; }).join('')}
        <svg viewBox="0 0 84 150" style="grid-column:2;grid-row:1 / span 2;width:84px;height:150px">
          <rect x="14" y="6" width="56" height="138" rx="24" fill="#2a2a2e" stroke="rgba(255,255,255,0.10)"></rect>
          <path d="M22 44 Q42 34 62 44 L60 62 Q42 56 24 62 Z" fill="#1a1d22"></path><path d="M24 104 Q42 98 60 104 L62 118 Q42 126 22 118 Z" fill="#1a1d22"></path>
          ${[[6, 26, 'fl'], [70, 26, 'fr'], [6, 98, 'rl'], [70, 98, 'rr']].map(([x, y, k]) => `<rect x="${x}" y="${y}" width="8" height="26" rx="4" fill="${ty[k] && ty[k].low ? C.amber : ty[k] ? C.green : '#48474a'}"></rect>`).join('')}
        </svg>
      </div>
    </section>` : ''}
    ${trips.length ? `<section style="display:flex;flex-direction:column;gap:8px">
      ${lbl('Siste turer')}
      <div style="display:flex;flex-direction:column;padding:2px 14px;${card}">
      ${trips.map((t, i) => `<div style="display:flex;gap:14px;padding:12px 0;${i ? 'border-top:1px solid rgba(255,255,255,0.05)' : ''}">
          <div style="display:flex;flex-direction:column;align-items:center;width:10px;flex:none;padding-top:5px;gap:3px"><span style="width:8px;height:8px;border-radius:4px;background:#8e8d89"></span><span style="width:1px;height:14px;background:#48474a"></span><span style="width:8px;height:8px;border-radius:4px;background:${C.green}"></span></div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
            <span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(`${t.from} → ${t.to}`)}</span>
            <span style="font-size:12px;color:#8e8d89">${e([t.km != null ? `${Math.round(t.km).toLocaleString('nb-NO')} km` : '', dur(t.d1 - t.d0), t.kwh != null ? `${t.kwh < 10 ? nf(t.kwh, 1) : Math.round(t.kwh)} kWh` : ''].filter(Boolean).join(' · '))}</span>
          </div>
          <span style="font-size:12px;color:#8e8d89;white-space:nowrap">${e(whenW(t.d1))}</span>
        </div>`).join('')}
      </div>
    </section>` : ''}`;
      }

      if (tab === 'save') {
        const pctOf = (id) => { const d = Number(this.at(id, 'diesel_ville_kostet')), el = Number(this.at(id, 'strom_kostet')); return d > 0 && !isNaN(el) ? KD.clamp(Math.round((1 - el / d) * 100), 0, 100) : null; };
        const saveCards = [['Spart denne måneden', cf.spart_maned, C.green], ['Spart i år', cf.spart_ar, C.amber]].map(([label, id, c]) => {
          const p = pctOf(id);
          return { label, id, c, v: this.ok(id) ? Math.round(this.n(id)).toLocaleString('nb-NO') : '–', pct: p == null ? '–' : `${p} %`, p: p || 0 };
        });
        const num = (id, fn) => this.ok(id) ? fn(this.n(id)) : '–';
        const saveStats = [['electric_car', num(cf.kr_mil_el, v => nf(v, 2)), 'Tesla · kr/mil', cf.kr_mil_el], ['directions_car', num(cf.kr_mil_diesel, v => nf(v, 2)), 'Audi A6 · kr/mil', cf.kr_mil_diesel],
          ['local_gas_station', num(cf.diesel_liter, v => `${Math.round(v).toLocaleString('nb-NO')} L`), 'Diesel ikke fylt', cf.diesel_liter], ['co2', num(cf.co2, v => `${Math.round(v).toLocaleString('nb-NO')} kg`), 'CO₂ spart', cf.co2],
          ['oil_barrel', num(cf.dieselpris, v => nf(v, 2)), 'Diesel · kr/L', cf.dieselpris], ['ev_charger', num(cf.strompris, v => nf(v, 2)), 'Strøm · kr/kWh', cf.strompris]];
        const kjort = Number(this.at(cf.spart_ar, 'kjort_km'));
        const yearKm = isNaN(kjort) ? '–' : `${Math.round(kjort).toLocaleString('nb-NO')} km`;
        const yearKr = this.ok(cf.spart_ar) ? `${Math.round(this.n(cf.spart_ar)).toLocaleString('nb-NO')} kroner` : '–';
        const inc = this.dailySaved();
        const maxInc = inc ? Math.max(...inc, 0.001) : 1;
        const dailySum = inc ? nf(inc.reduce((x, y) => x + y, 0), 1) : '–';
        const pill2 = 'display:inline-block;padding:0 10px;border-radius:14px;background:#f2f1ee;color:#141416;font-weight:500;line-height:1.6';
        tabHTML = `<section style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
      ${saveCards.map(c => `<div data-on-click="openMore" data-arg="${e(c.id)}" style="position:relative;overflow:hidden;min-width:0;display:flex;flex-direction:column;gap:6px;padding:16px 16px 30px;border-radius:26px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04)">
          <span style="width:44px;height:44px;border-radius:22px;background:${a(c.c, 0.16)};color:${c.c};display:grid;place-items:center;margin-bottom:22px"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">savings</span></span>
          <span style="font-size:12px;color:#c9c7c2">${e(c.label)}</span>
          <span style="display:flex;align-items:baseline;gap:4px;flex-wrap:wrap"><span style="font-size:30px;font-weight:300;letter-spacing:-0.03em;line-height:1;font-variant-numeric:tabular-nums;white-space:nowrap">${e(c.v)}</span><span style="font-size:11px;color:#8e8d89">kr</span><span style="font-size:11px;color:#c9c7c2;margin-left:auto;white-space:nowrap">${e(c.pct)} billigere</span></span>
          <span style="position:absolute;left:0;right:0;bottom:0;height:22px;display:flex"><span style="width:${c.p}%;height:100%;background:${c.c};transition:width 1.2s cubic-bezier(.2,.9,.3,1)"></span><span style="flex:1;height:100%;background:repeating-linear-gradient(-45deg, ${c.c} 0 2px, transparent 2px 6px);opacity:0.8"></span></span>
        </div>`).join('')}
    </section>
    <section style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
      ${saveStats.map(([icon, v, k, id]) => `<div data-on-click="openMore" data-arg="${e(id)}" style="min-width:0;display:flex;align-items:center;gap:10px;height:60px;padding:0 12px 0 5px;border-radius:30px;background:#1c1c1f">
          <span style="width:50px;height:50px;border-radius:25px;flex:none;background:#262629;display:grid;place-items:center"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">${icon}</span></span>
          <span style="display:flex;flex-direction:column;min-width:0"><span style="font-size:14px;font-weight:600;font-variant-numeric:tabular-nums">${e(v)}</span><span style="font-size:11px;color:#a9a7a2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(k)}</span></span>
        </div>`).join('')}
    </section>
    <div style="font-size:18px;line-height:1.9;padding:0 4px;text-wrap:pretty">Så langt i år har dere kjørt <span style="${pill2}">${e(yearKm)}</span> og spart <span style="${pill2}">${e(yearKr)}</span> mot den gamle dieselen.</div>
    <section style="position:relative;overflow:hidden;display:flex;flex-direction:column;gap:6px;padding:16px 0 0;border-radius:26px;background:#1c1c1f">
      <span style="font-size:12px;color:#8e8d89;padding:0 16px">Spart per dag siste 30 dager</span>
      <span style="font-size:30px;font-weight:300;letter-spacing:-0.03em;padding:0 16px;font-variant-numeric:tabular-nums">${e(dailySum)}<span style="font-size:12px;color:#8e8d89"> kr</span></span>
      <div style="display:flex;align-items:flex-end;gap:3px;height:120px;padding:0 10px">${(inc || []).map((v, i) => `<span style="flex:1;height:${Math.max(4, v / maxInc * 100)}%;border-radius:4px 4px 0 0;background:${C.green};transition:height .9s cubic-bezier(.2,.9,.3,1) ${i * 0.02}s"></span>`).join('')}</div>
    </section>`;
      }

      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:18px">
  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89"><span>${e(cf.navn)}</span></div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>
  ${hero}
  ${controls}
  ${tabs}
  ${tabHTML}
</div>`;
    }
    /** Bryter (spor + knott) */
    sw(on) { return `<span style="position:relative;width:46px;height:28px;border-radius:14px;flex:none;background:${on ? 'oklch(0.72 0.14 150)' : 'rgba(255,255,255,0.18)'};transition:background .2s"><span style="position:absolute;top:3px;left:${on ? 21 : 3}px;width:22px;height:22px;border-radius:11px;background:#f4f3ef;box-shadow:0 2px 6px rgba(0,0,0,0.3);transition:left .25s cubic-bezier(.34,1.4,.64,1)"></span></span>`; }
  }

  KD.define('kd-bil-card', KDBilCard, 'KD Bil', 'Tesla Model Y – pikselkopi av Claude Design');
  KD.sheet('car', 'kd-bil-card');
})();
} catch (e) { console.error('ki-hjem-design: 52-kd-bil-card.js', e); }

/* ===== 53-kd-printer-card.js ===== */
try {
/*
 * kd-printer-card – pikselkopi av Claude Design «3D-printer» (Creality K2), med ekte data.
 *
 *   type: custom:kd-printer-card      # alt annet er valgfritt («auto config»)
 *   prefiks: creality_k2              # entitetene bygges/letes opp ut fra prefikset
 * Status, fremdrift, lag, tid igjen, temperaturer og mål, vifter, CFS-spor (filament/farge/rest),
 * kamera (camera.<prefiks>_printer_camera) og knapper (pause/fortsett/stopp) finnes automatisk.
 */
(() => {
  const KD = window.KD;
  const AMBER = 'oklch(0.82 0.12 75)', GREEN = 'oklch(0.8 0.12 150)', RED = 'oklch(0.72 0.15 25)', BLUE = 'oklch(0.8 0.12 250)';
  const a = KD.a, PINK = KD.PINK;
  const PRINTING = ['printing', 'running', 'busy'], PAUSED = ['paused', 'pausing'], HEATING = ['preheating', 'heating'], DONE = ['complete', 'completed', 'finished'];
  const low = (x) => String(x || '').toLowerCase();

  /** Sekunder, «H:MM:SS» eller minutter (med enhet) → minutter */
  const minutes = (st) => {
    if (!st || KD.BAD.has(st.state)) return null;
    const raw = st.state, u = st.attributes.unit_of_measurement;
    if (String(raw).includes(':')) { const d = String(raw).split(':').map(Number); return d.length === 3 ? d[0] * 60 + d[1] + d[2] / 60 : d[0] + d[1] / 60; }
    const n = Number(raw); if (!isFinite(n)) return null;
    return u === 'min' ? n : u === 'h' ? n * 60 : n / 60;
  };
  const dur = (m) => { m = Math.max(0, Math.round(m)); return m >= 60 ? `${Math.floor(m / 60)} t ${m % 60} min` : `${m} min`; };
  /** farge fra sensor («#FF0000», «FF0000», «255,0,0», css-farge) */
  const colorOf = (raw) => {
    const s = String(raw || '').trim();
    if (!s || KD.BAD.has(s)) return null;
    if (/^[0-9a-f]{6,8}$/i.test(s)) return '#' + s.slice(0, 6);
    if (/^#[0-9a-f]{7,8}$/i.test(s)) return s.slice(0, 7);
    if (/^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/.test(s)) return `rgb(${s})`;
    return (window.CSS && CSS.supports && CSS.supports('color', s)) ? s : null;
  };
  /** mørk farge → lys tekst */
  const isDark = (c) => {
    if (!c) return false;
    let m = /^oklch\(\s*([\d.]+)/i.exec(c); if (m) return parseFloat(m[1]) < 0.5;
    m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(c);
    if (m) { const [r, g, b] = m.slice(1).map(x => parseInt(x, 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.4; }
    m = /^rgb\((\d+),\s*(\d+),\s*(\d+)/.exec(c); if (m) return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255 < 0.4;
    return false;
  };

  class KDPrinterCard extends KD.KDSheet {
    static head = ['print', '3D-printer', 'Creality K2'];
    static defaults = {
      prefiks: 'creality_k2',
      navn: 'Creality K2',
      strom: null,               // auto: switch.<prefiks>
      homey_bryter: 'button.homey_flows_02_creality_k2_bryter',   // brukes når strømbryteren mangler
      lys: 'light.creality_k2_light',
      romvifte: 'fan.baderomsvifte',
      energi: 'sensor.creality_k2_energy_daily',
      start_jobb: null,          // knapp/skript som skriver ut siste jobb (vises bare når den finnes)
      cfs_spor: 4,
      spole_gram: 1000,
    };
    static sheetCss = `button:disabled{cursor:default}`;

    constructor() { super(); this.state = { tab: 'simple' }; }

    /* ----- entiteter ----- */
    get p() { return this.config.prefiks || 'creality_k2'; }
    s(n) { return `sensor.${this.p}_${n}`; }
    /** første entitet som finnes blant kandidatene (id eller regex) */
    pick(...cands) {
      for (const c of cands) {
        if (!c) continue;
        if (c instanceof RegExp) { const f = this.find(c)[0]; if (f) return f; } else if (this.st(c)) return c;
      }
      return null;
    }
    ids() {
      const p = this.p, cf = this.config, re = (x) => new RegExp(`^sensor\\.${p}_.*(${x})`);
      return {
        status: this.pick(this.s('print_status'), re('print_?stat|_status$|_state$')),
        prog: this.pick(this.s('print_progress'), re('progress')),
        left: this.pick(this.s('print_time_left'), re('time_left|remain')),
        layer: this.pick(this.s('working_layer'), re('current_?layer|working_layer')),
        layers: this.pick(this.s('total_layers'), re('total_?layers')),
        file: this.pick(this.s('current_object'), this.s('print_file_name'), re('file|print_?name|current_object')),
        power: this.pick(cf.strom, `switch.${p}`, `switch.${p}_power`),
        light: this.pick(cf.lys, `light.${p}_light`),
        pause: this.pick(`button.${p}_pause_print`), resume: this.pick(`button.${p}_resume_print`), stop: this.pick(`button.${p}_stop_print`),
        cam: this.pick(`camera.${p}_printer_camera`, new RegExp(`^camera\\.${p}`)),
        speed: this.pick(this.s('print_speed'), re('speed')),
        partFan: this.pick(`fan.${p}_model_fan`, new RegExp(`^fan\\.${p}_.*(model|part)`)),
        caseFan: this.pick(`fan.${p}_case_fan`, new RegExp(`^fan\\.${p}_.*(case|chamber)`)),
        zoff: this.pick(this.s('z_offset'), re('z_?offset')),
        layerH: this.pick(this.s('layer_height'), re('layer_height|lagtykkelse')),
        cfsT: this.pick(this.s('cfs_box_1_temperature')), cfsH: this.pick(this.s('cfs_box_1_humidity')),
        slot: this.pick(this.s('active_filament_slot')),
        start: this.pick(cf.start_jobb, new RegExp(`^button\\.${p}_.*(reprint|print_again|restart_print|print_last)`)),
      };
    }
    job(I) {
      const powerKnown = I.power && this.ok(I.power);
      const st = low(this.v(I.status));
      const power = powerKnown ? this.isOn(I.power) : (!!I.status && this.ok(I.status) && !['off', 'offline'].includes(st));
      if (!power) return { power, job: 'off' };
      if (PRINTING.includes(st)) return { power, job: 'printing' };
      if (PAUSED.includes(st)) return { power, job: 'paused' };
      if (HEATING.includes(st)) return { power, job: 'heating' };
      if (DONE.includes(st)) return { power, job: 'done' };
      if (st === 'error') return { power, job: 'error' };
      return { power, job: 'idle' };
    }

    /* ----- handlinger ----- */
    tab(e, k) { this.setState({ tab: k }); }
    ctl(e, k) {
      const I = this.ids();
      if (k === 'light' && I.light) return this.call('light', 'toggle', { entity_id: I.light });
      if (k === 'power') {
        if (I.power) return this.call(I.power.split('.')[0] === 'input_boolean' ? 'input_boolean' : 'switch', 'toggle', { entity_id: I.power });
        if (this.config.homey_bryter && this.st(this.config.homey_bryter)) return this.press(this.config.homey_bryter);
        return;
      }
      const id = I[k]; if (id) this.press(id);
    }
    startJob() { const I = this.ids(); if (I.start) this.toggle(I.start); }
    openMore(e, id) { if (id) this.more(id); }
    toggleFan(e, id) { if (id) this.call(id.split('.')[0] === 'switch' ? 'switch' : 'fan', 'toggle', { entity_id: id }); }

    body() {
      const s = this.state, cf = this.config, e = KD.e, S = KD.S, I = this.ids();
      const { power, job } = this.job(I);
      const p = job === 'printing', paused = job === 'paused';
      const st = !power ? ['Av', '#8e8d89'] : job === 'heating' ? ['Varmer opp', AMBER] : p ? ['Skriver ut', GREEN] : paused ? ['Pause', AMBER] : job === 'done' ? ['Ferdig', GREEN] : job === 'error' ? ['Feil', RED] : ['Klar', BLUE];
      const ctrl = (k, icon, label, col, disabled, on) => ({ k, icon, label, disabled,
        style: { height: 74, borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: on ? a(col, 0.18) : '#1c1c1f', boxShadow: on ? `inset 0 0 0 1px ${a(col, 0.45)}` : 'none', color: disabled ? '#48474a' : '#f2f1ee', opacity: disabled ? 0.6 : 1 },
        iconStyle: { fontSize: 24, color: disabled ? '#48474a' : col, fontVariationSettings: "'FILL' 1" } });
      const prog = I.prog ? KD.clamp(this.n(I.prog, 0), 0, 100) : 0;
      const file = I.file && this.ok(I.file) && !/^none$/i.test(this.v(I.file)) ? this.v(I.file) : null;
      const leftMin = minutes(this.st(I.left));
      const layer = this.n(I.layer), layers = this.n(I.layers);
      // CFS-spor
      const n = KD.clamp(Number(cf.cfs_spor) || 4, 1, 4);
      const activeSlot = I.slot ? parseInt(this.v(I.slot), 10) : NaN;
      const slots = [];
      for (let i = 1; i <= n; i++) {
        const f = this.s(`cfs_box_1_slot_${i}_filament`), c = this.s(`cfs_box_1_slot_${i}_color`), r = this.s(`cfs_box_1_slot_${i}_remaining`);
        if (!this.st(f) && !this.st(r)) continue;
        slots.push({ i, f, name: this.ok(f) ? this.v(f) : '–', col: colorOf(this.v(c)), pct: this.ok(r) ? KD.clamp(Math.round(this.n(r)), 0, 100) : null });
      }
      const slotName = (slots.find(x => x.i === activeSlot) || {}).name;
      const headline = !power ? 'Printeren er av' : p || paused ? (file || 'Utskrift pågår') : job === 'heating' ? 'Varmer dyse og plate' : job === 'done' ? 'Utskriften er ferdig' : job === 'error' ? 'Printeren melder feil' : 'Klar til utskrift';
      const subline = p ? [layer != null && layers ? `Lag ${Math.round(layer)} av ${Math.round(layers)}` : '', leftMin != null ? `ca. ${dur(leftMin)} igjen` : ''].filter(Boolean).join(' · ') || 'Skriver ut'
        : paused ? 'Satt på pause' : !power ? 'Slå på for å varme opp og se kamera' : slotName && slotName !== '–' ? `${slotName} valgt` : file && job === 'done' ? file : '–';
      const showProg = p || paused || job === 'done';
      const progBar = { width: `${prog}%`, height: '100%', borderRadius: 4, background: paused ? AMBER : GREEN, transition: 'width 1s' };
      const lightOn = I.light ? this.isOn(I.light) : false;
      const camStyle = { position: 'relative', height: 200, borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: power ? (lightOn ? '#26262a' : '#1c1c1f') : '#18181a', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)', transition: 'background .3s' };
      const camPic = power && I.cam && this.ok(I.cam) ? this.at(I.cam, 'entity_picture') : null;
      const camSrc = camPic ? String(camPic).replace('/api/camera_proxy/', '/api/camera_proxy_stream/') : null;
      if (camPic) camStyle.overflow = 'hidden';
      const camLive = { position: 'absolute', left: 12, top: 12, display: power ? 'block' : 'none', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 8, background: RED, color: '#fff', zIndex: 1 };
      const controls = [
        ctrl('pause', 'pause', 'Pause', AMBER, !p || !I.pause),
        ctrl('resume', 'play_arrow', 'Fortsett', GREEN, !paused || !I.resume),
        ctrl('stop', 'stop', 'Stopp', RED, !(p || paused || job === 'heating') || !I.stop),
        ctrl('light', 'lightbulb', 'Lys', AMBER, !power || !I.light, lightOn),
        ctrl('power', 'power_settings_new', 'Strøm', power ? GREEN : '#f2f1ee', !I.power && !this.st(cf.homey_bryter), power),
      ];
      const canStart = power && (job === 'idle' || job === 'done') && !!I.start;
      const tabs = [['simple', 'Enkel'], ['adv', 'Avansert']].map(([k, label]) => ({ k, label, style: { height: 40, borderRadius: 16, fontSize: 13, fontWeight: 500, background: s.tab === k ? PINK : 'transparent', color: s.tab === k ? '#2a1720' : '#a9a7a2' } }));
      const temp = (icon, label, cur, tgt, maxId, maxDef, col) => {
        const v = this.ok(cur) ? this.n(cur) : null, t = this.n(tgt), max = this.n(maxId, maxDef) || maxDef;
        return { icon, label, id: cur, v: v != null ? `${Math.round(v)}°` : '–', target: v != null && t > 0 ? `/ ${Math.round(t)}°` : '',
          iconStyle: { fontSize: 15, color: col }, bar: { width: `${v != null ? Math.min(100, v / max * 100) : 0}%`, height: '100%', background: col, transition: 'width 1s' } };
      };
      const P = this.p;
      const temps = [temp('local_fire_department', 'Dyse', this.s('nozzle_temperature'), `number.${P}_nozzle_target`, this.s('max_nozzle_temperature'), 300, RED),
        temp('square', 'Plate', this.s('bed_temperature'), `number.${P}_bed_target`, this.s('max_bed_temperature'), 110, AMBER),
        temp('home', 'Kammer', this.s('chamber_temperature'), `number.${P}_chamber_target`, this.s('max_chamber_temperature'), 60, BLUE)];
      const fanV = (id) => { if (!this.ok(id)) return '–'; const pc = this.at(id, 'percentage'); return this.isOn(id) ? (pc != null ? `${Math.round(pc)} %` : 'På') : '0 %'; };
      const numV = (id, d, unitDef) => { if (!this.ok(id)) return '–'; const u = this.unit(id) || unitDef; return `${KD.nf(this.n(id), d).replace('-', '−')}${u ? ' ' + u : ''}`; };
      const adv = [['speed', 'Hastighet', I.speed, () => numV(I.speed, 0, '')], ['mode_fan', 'Delkjølevifte', I.partFan, () => fanV(I.partFan)], ['air', 'Kammervifte', I.caseFan, () => fanV(I.caseFan)],
        ['height', 'Z-offset', I.zoff, () => numV(I.zoff, 2, 'mm')], ['layers', 'Lagtykkelse', I.layerH, () => numV(I.layerH, 1, 'mm')],
        ['heat_pump', 'Baderomsvifte', cf.romvifte && this.st(cf.romvifte) ? cf.romvifte : null, () => fanV(cf.romvifte), 'toggleFan'],
        ['bolt', 'Energi i dag', cf.energi && this.st(cf.energi) ? cf.energi : null, () => numV(cf.energi, 2, 'kWh')]]
        .filter(r => r[2]).map(([icon, k, id, fn, act], i) => ({ icon, k, id, v: fn(), act: act || 'openMore', row: { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 4px', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'pointer' } }));
      const cfsMeta = [I.cfsT && this.ok(I.cfsT) ? `${Math.round(this.n(I.cfsT))} °C` : '', I.cfsH && this.ok(I.cfsH) ? `${Math.round(this.n(I.cfsH))} % RF` : ''].filter(Boolean).join(' · ') || '–';
      const slotRows = slots.map((x) => {
        const act = x.i === activeSlot, pct = x.pct;
        return { ...x, left: pct == null ? '–' : `${pct} % · ca. ${Math.round(pct / 100 * (cf.spole_gram || 1000))} g`,
          row: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px', borderRadius: 16, width: '100%', background: act ? '#1c1c1f' : 'transparent', boxShadow: act ? 'inset 0 0 0 1px rgba(255,255,255,0.08)' : 'none' },
          swatch: { width: 34, height: 34, borderRadius: 10, flex: 'none', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 600, background: x.col || '#2a2a2d', color: !x.col || isDark(x.col) ? '#f2f1ee' : '#1a1a1c', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)' },
          bar: { width: `${pct || 0}%`, height: '100%', background: pct != null && pct < 15 ? AMBER : '#c9c7c2' } };
      });

      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:20px">
  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89"><span>${e(cf.navn)}</span></div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section data-on-click="openMore" data-arg="${e(I.status || '')}" style="display:flex;flex-direction:column;gap:10px;padding:0 4px">
    <div style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;color:#c9c7c2"><span style="${S({ width: 8, height: 8, borderRadius: 4, background: st[1], boxShadow: power ? `0 0 10px ${st[1]}` : 'none' })}"></span><span>${e(st[0])}</span></div>
    <div style="font-size:24px;font-weight:500;letter-spacing:-0.015em"><span>${e(headline)}</span></div>
    <div style="font-size:14px;color:#8e8d89"><span>${e(subline)}</span></div>
    ${showProg ? `<div style="display:flex;align-items:center;gap:10px;padding-top:4px">
        <div style="flex:1;height:8px;border-radius:4px;background:#1f1f22;overflow:hidden"><div style="${S(progBar)}"></div></div>
        <span style="font-size:13px;font-weight:500;font-variant-numeric:tabular-nums"><span>${Math.round(prog)}</span> %</span>
      </div>` : ''}
  </section>

  <section data-on-click="openMore" data-arg="${e(I.cam || '')}" style="${S(camStyle)}">
    ${camSrc ? `<img src="${e(camSrc)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">` : ''}
    <span class="ms" style="font-size:32px;color:#48474a"><span>${power ? 'videocam' : 'videocam_off'}</span></span>
    <span style="font-size:12px;color:#6d6c69"><span>${power ? (I.cam ? 'Kamerastrøm' : 'Fant ikke kamera') : 'Kamera er av'}</span></span>
    <span style="${S(camLive)}">Live</span>
  </section>

  <section style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">
    ${controls.map(c => `
      <button data-on-click="ctl" data-arg="${c.k}" ${c.disabled ? 'disabled' : ''} style="${S(c.style)}">
        <span class="ms" style="${S(c.iconStyle)}"><span>${c.icon}</span></span>
        <span style="font-size:11px;font-weight:500"><span>${e(c.label)}</span></span>
      </button>`).join('')}
  </section>

  ${canStart ? `<button data-on-click="startJob" style="height:56px;border-radius:28px;background:oklch(0.82 0.12 75);color:#1a1408;font-size:15px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">print</span><span>${e(file ? `Skriv ut siste jobb · ${file}` : 'Skriv ut siste jobb')}</span></button>` : ''}

  ${KD.segHTML('fane', [['simple', 'Enkel'], ['adv', 'Avansert']], s.tab, 'tab', { pink: true })}

  <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
    ${temps.map(t => `
      <div data-on-click="openMore" data-arg="${e(t.id)}" style="display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:18px;background:#1c1c1f">
        <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:#8e8d89"><span class="ms" style="${S(t.iconStyle)}"><span>${t.icon}</span></span><span>${e(t.label)}</span></span>
        <span style="font-size:20px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap"><span>${e(t.v)}</span><span style="font-size:11px;color:#6d6c69;font-weight:400"> <span>${e(t.target)}</span></span></span>
        <div style="height:3px;border-radius:2px;background:#2a2a2d;overflow:hidden"><div style="${S(t.bar)}"></div></div>
      </div>`).join('')}
  </section>

  ${s.tab === 'adv' && adv.length ? `
    <section style="display:flex;flex-direction:column">
      ${adv.map(r => `
        <div data-on-click="${r.act}" data-arg="${e(r.id)}" style="${S(r.row)}"><span class="ms" style="font-size:18px;color:#8e8d89;width:24px"><span>${r.icon}</span></span><span style="flex:1;font-size:14px"><span>${e(r.k)}</span></span><span style="font-size:13px;color:#c9c7c2;font-variant-numeric:tabular-nums"><span>${e(r.v)}</span></span></div>`).join('')}
    </section>` : ''}

  ${slotRows.length ? `<section style="display:flex;flex-direction:column;gap:2px">
    <div style="display:flex;justify-content:space-between;padding:0 4px 8px">
      <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Filament · CFS</div>
      <div style="font-size:12px;color:#6d6c69"><span>${e(cfsMeta)}</span></div>
    </div>
    ${slotRows.map(f => `
      <button data-on-click="openMore" data-arg="${e(f.f)}" style="${S(f.row)}">
        <span style="${S(f.swatch)}"><span>${f.i}</span></span>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px;text-align:left">
          <div style="display:flex;justify-content:space-between;gap:10px">
            <span style="font-size:14px;font-weight:500"><span>${e(f.name)}</span></span>
            <span style="font-size:12px;color:#8e8d89;font-variant-numeric:tabular-nums"><span>${e(f.left)}</span></span>
          </div>
          <div style="height:4px;border-radius:2px;background:#2a2a2d;overflow:hidden"><div style="${S(f.bar)}"></div></div>
        </div>
      </button>`).join('')}
  </section>` : ''}
</div>`;
    }
  }

  KD.define('kd-printer-card', KDPrinterCard, 'KD 3D-printer', 'Creality K2 – pikselkopi av Claude Design');
  KD.sheet('printer', 'kd-printer-card');
})();
} catch (e) { console.error('ki-hjem-design: 53-kd-printer-card.js', e); }

/* ===== 60-kd-server-card.js ===== */
try {
/*
 * kd-server-card – Server-popup (Proxmox · Unraid · UniFi · Nettverk) med oversikt, helsevarsler og styring.
 *
 *   type: custom:kd-server-card        # virker uten mer: alt under er standardverdier
 *   pve_node: sensor.1_node_pve_       # foretrukket Proxmox-node (andre noder finnes selv)
 *   unraid: d_day_darling              # prefiks for Unraid-integrasjonen (uten «sensor.»)
 *   unifi_gateway: ''                  # slug for ruteren; tom = finnes selv (den med *_wan_latency)
 *   speedtest_ned / speedtest_opp / speedtest_ping, qbit_sparefart
 *   pve_ip, unraid_ip, isp, pve_cpu_navn, unraid_cpu_navn, pve_effekt, unraid_effekt, pve_temp
 *   navn_map: { "102": "Plex" }        # penere navn på gjester/containere (vmid eller nøkkel)
 *   blokker: [switch.x]                # UniFi-klienter som kan blokkeres (tom = finnes selv)
 *   faner: [oversikt, pve, unraid, unifi, ha]   # hvilke faner (tom = de som har data). «ha» = Nettverk
 *   grense_cpu: 85, grense_ram: 90, grense_disk: 85, grense_temp: 70, grense_disktemp: 50   # varselgrenser
 *
 * Oppdager selv: Proxmox-noder og -gjester (Proxmox Extended Sensors: sensor.N_node_…, sensor.N_ct_/vm_…_status
 * + knapper, og «Proxmox VE»-integrasjonen (proxmoxve) via entitetsregisteret), lagring (sensor.N_storage_*_usage),
 * Unraid-array/paritet/disker/containere/VM-er/UPS, UniFi-enheter (device_tracker + *_uptime, *_restart, update.*),
 * Wi-Fi-nett, PoE-porter, blokk-brytere og klienter. Faner uten data skjules.
 * Handlinger som stopper noe (slå av, omstart, PoE av, fastvare …) må bekreftes (trykk → bekreft-rad).
 */
(() => {
  const KD = window.KD; if (!KD) return;
  const C = { green: 'oklch(0.8 0.12 150)', blue: 'oklch(0.8 0.12 250)', amber: 'oklch(0.82 0.12 75)', red: 'oklch(0.72 0.15 25)', pink: 'oklch(0.78 0.13 350)' };
  const a = (c, o) => String(c).startsWith('#') ? `color-mix(in srgb, ${c} ${Math.round(o * 100)}%, transparent)` : String(c).replace(')', ` / ${o})`);
  const PINK = 'linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20))';
  const nf = (n, d = 0) => (n == null || isNaN(n)) ? '–' : Number(n).toLocaleString('nb-NO', { minimumFractionDigits: d, maximumFractionDigits: d });
  const nf1 = (n) => (n == null || isNaN(n)) ? '–' : Number(n).toLocaleString('nb-NO', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const e = KD.e, S = KD.S;
  const dom = id => id.slice(0, id.indexOf('.'));
  const obj = id => id.slice(id.indexOf('.') + 1);
  const PRETTY = { qbittorrent: 'qBittorrent', qbittorrentvpn: 'qBittorrent', sabnzbd: 'SABnzbd', pihole: 'Pi-hole', adguard: 'AdGuard', zigbee2mqtt: 'Zigbee2MQTT', mqtt: 'MQTT', nzbget: 'NZBGet', unifi: 'UniFi' };
  const title = t => String(t || '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ').map(w => PRETTY[w.toLowerCase()] || w.replace(/^./, c => c.toUpperCase())).join(' ');

  /** Tall bare når hele tilstanden er et tall («6.12.4-pve» er ikke et tall) */
  const num = (s) => { if (!s || KD.BAD.has(s.state)) return null; const r = String(s.state).trim(); if (!/^-?\d+([.,]\d+)?$/.test(r)) return null; return parseFloat(r.replace(',', '.')); };
  /** Sekunder oppe fra tidsstempel eller tall med enhet */
  const upSec = (s) => {
    if (!s || KD.BAD.has(s.state)) return null;
    const r = String(s.state).trim(), at = s.attributes || {};
    if (/^-?\d+(\.\d+)?$/.test(r) && at.device_class !== 'timestamp') {
      const u = String(at.unit_of_measurement || 's'), n = parseFloat(r);
      return /^min/i.test(u) ? n * 60 : /^(h|t)/i.test(u) ? n * 3600 : /^(d|day|dag)/i.test(u) ? n * 86400 : n;
    }
    const d = new Date(r); return isNaN(d) ? null : Math.max(0, (Date.now() - d) / 1000);
  };
  const upLong = (sec) => { if (sec == null) return ''; const d = Math.floor(sec / 86400); if (d >= 1) return `${d} ${d === 1 ? 'dag' : 'dager'}`; const h = Math.floor(sec / 3600); if (h >= 1) return `${h} t`; return `${Math.max(1, Math.floor(sec / 60))} min`; };
  const upShort = (sec) => { if (sec == null) return ''; const d = Math.floor(sec / 86400); if (d >= 1) return `${d} d`; const h = Math.floor(sec / 3600); if (h >= 1) return `${h} t`; return `${Math.max(1, Math.floor(sec / 60))} min`; };
  /** Byte-verdi fra sensor med enhet → «4 GB» / «512 MB» */
  const UNIT = { b: 1, kb: 1e3, kib: 1024, mb: 1e6, mib: 1048576, gb: 1e9, gib: 1073741824, tb: 1e12, tib: 1099511627776 };
  const bytes = (s) => { const v = num(s); if (v == null) return null; const u = String((s.attributes || {}).unit_of_measurement || 'B').toLowerCase().replace(/\s/g, ''); return v * (UNIT[u] || 1); };
  const fmtB = (b) => { if (b == null) return ''; const [f, u] = b >= 1e12 ? [1e12, 'TB'] : b >= 1e9 ? [1e9, 'GB'] : b >= 1e6 ? [1e6, 'MB'] : [1e3, 'kB']; return `${nf1(b / f)} ${u}`; };
  const fmtBs = (b) => { if (b == null) return ''; const [f, u] = b >= 1e12 ? [1e12, 'TB'] : b >= 1e9 ? [1e9, 'GB'] : b >= 1e6 ? [1e6, 'MB'] : [1e3, 'kB']; return [nf1(b / f), u]; };
  const hm = d => { d = new Date(d); return isNaN(d) ? '' : d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }); };
  const agoTxt = (d) => { const s = Math.max(0, Math.round((Date.now() - new Date(d)) / 1000)); if (isNaN(s)) return ''; return s < 60 ? `${s} s siden` : s < 3600 ? `${Math.round(s / 60)} min siden` : s < 86400 ? `${Math.round(s / 3600)} t siden` : `${Math.round(s / 86400)} d siden`; };

  /** Ikon ut fra navnet (Material Symbols) */
  const ICONS = [[/home ?assistant|haos|\bha\b/i, 'home'], [/frigate|kamera|nvr|camera/i, 'videocam'], [/plex|jellyfin|emby/i, 'play_circle'], [/sonarr/i, 'tv'], [/radarr|arr|prowlarr|bazarr|readarr|seerr|overseerr/i, 'movie'],
    [/zigbee|z2m|mqtt|zwave|matter/i, 'hub'], [/nextcloud|cloud/i, 'cloud'], [/vault|bitwarden|pass/i, 'key'], [/pi-?hole|adguard|dns/i, 'shield'], [/qbit|torrent|download|sabnzbd|nzb/i, 'download'],
    [/immich|photo|foto/i, 'photo_library'], [/dispatch|iptv|tvh/i, 'live_tv'], [/docker|portainer|dockge/i, 'deployed_code'], [/unifi/i, 'router'], [/postgres|mysql|maria|influx|db\b|redis/i, 'database'],
    [/grafana|monitor|uptime|kuma/i, 'monitoring'], [/nginx|proxy|traefik|caddy|tunnel/i, 'lan'], [/windows|win\d/i, 'desktop_windows'], [/ubuntu|debian|linux|alpine/i, 'terminal'], [/flaresolverr|solver/i, 'bolt']];
  const iconFor = (name, def) => { for (const [re, ic] of ICONS) if (re.test(name)) return ic; return def; };
  /** Handlingstyper for Proxmox-knapper: [tekst, ikon, farge, må bekreftes] */
  const ACT = {
    start: ['Start', 'play_arrow', C.green, false], resume: ['Fortsett', 'play_arrow', C.green, false],
    shutdown: ['Slå av', 'power_settings_new', C.amber, true], reboot: ['Omstart', 'restart_alt', C.blue, true],
    suspend: ['Pause', 'pause', C.amber, true], hibernate: ['Dvale', 'bedtime', C.amber, true],
    stop: ['Tving stopp', 'stop_circle', C.red, true], reset: ['Tilbakestill', 'device_reset', C.red, true],
    start_all: ['Start alle', 'play_circle', C.green, true], stop_all: ['Stopp alle', 'stop_circle', C.red, true],
  };
  const actOf = (rest) => {
    const r = String(rest || '');
    if (/^start_?all/.test(r)) return 'start_all'; if (/^(stop|shutdown)_?all/.test(r)) return 'stop_all';
    const m = r.match(/^(start|shutdown|stop|reboot|restart|suspend|pause|resume|hibernate|reset)/); if (!m) return null;
    return { restart: 'reboot', pause: 'suspend' }[m[1]] || m[1];
  };
  const prefixOf = (list) => { if (!list.length) return ''; let p = list.reduce((x, y) => { let i = 0; while (i < x.length && x[i] === y[i]) i++; return x.slice(0, i); }, list[0]); return p.slice(0, p.lastIndexOf('_') + 1); };
  /** Størrelse fra attributt («4.0 TB», 4000000000) → byte */
  const sizeAttr = (v) => { if (v == null || v === '') return null; if (typeof v === 'number') return v; const m = String(v).match(/(-?\d+(?:[.,]\d+)?)\s*([kmgt]i?b)?/i); if (!m) return null; return parseFloat(m[1].replace(',', '.')) * (UNIT[(m[2] || 'b').toLowerCase()] || 1); };
  const pctCol = (p, warn = 85, bad = 95, def = C.blue) => p == null ? def : p >= bad ? C.red : p >= warn ? C.amber : def;
  const tempCol = (t, warn, bad) => t == null ? '#8e8d89' : t >= bad ? C.red : t >= warn ? C.amber : C.green;
  const LVL = [C.blue, C.amber, C.red];

  class KDServerCard extends KD.KDSheet {
    static head = ['dns', 'Server', 'Proxmox · Unraid · UniFi'];
    static defaults = {
      pve_node: 'sensor.1_node_pve_', pve_temp: '', pve_effekt: 'sensor.server_rack_power', pve_ip: '', pve_cpu_navn: '',
      unraid: 'd_day_darling', unraid_effekt: '', unraid_ip: '', unraid_cpu_navn: '',
      unifi_gateway: '', isp: '', klienter_maks: 80, ping_mal: 'cloudflare',
      speedtest_ned: 'sensor.speedtest_download', speedtest_opp: 'sensor.speedtest_upload', speedtest_ping: 'sensor.speedtest_ping',
      qbit_sparefart: 'switch.qbittorrent_alternative_speed', qbit: 'sensor.qbittorrent_',
      navn_map: {}, blokker: null, faner: null, poe_maks: 8,
      grense_cpu: 85, grense_ram: 90, grense_disk: 85, grense_temp: 70, grense_disktemp: 50,
    };
    constructor() { super(); this.state = { tab: null, open: null, conf: null, gf: 'alle', gs: 'id', df: 'alle' }; this._cm = {}; this._mi = {}; }

    /* ---------------- oppdagelse ---------------- */
    _ids() { const S = this.all(); if (this._idsN !== this._hass.states) { this._idsN = this._hass.states; this._idList = Object.keys(S); } return this._idList; }
    _reg() { return (this._hass && this._hass.entities) || {}; }
    _devs() { return (this._hass && this._hass.devices) || {}; }
    _nm(k, def) { const m = this.config.navn_map || {}; return m[k] || def; }
    _devName(id) { const R = this._reg(), d = this._devs()[(R[id] || {}).device_id]; return d ? (d.name_by_user || d.name || '') : ''; }

    /** Proxmox-noder: sensor.N_node_<navn>_* (Proxmox Extended Sensors) + proxmoxve-integrasjonen */
    _pveNodes() {
      if (this._pnS === this._hass.states && this._pnC) return this._pnC;
      this._pnS = this._hass.states;
      const ids = this._ids(), keys = [], out = [];
      for (const id of ids) { const m = id.match(/^sensor\.(\d+_node_.+?)_(cpu_usage|uptime|memory_usage)$/); if (m && !keys.includes(m[1])) keys.push(m[1]); }
      const pref = (this.config.pve_node || '').replace(/^sensor\./, '').replace(/_$/, '');
      keys.sort((x, y) => (y === pref) - (x === pref) || x.localeCompare(y));
      for (const k of keys) {
        const P = `sensor.${k}_`, name = k.replace(/^\d+_node_/, '');
        const btns = {};
        for (const b of ids) if (b.startsWith(`button.${k}_`)) { const a = actOf(b.slice(8 + k.length)); if (a && !btns[a]) btns[a] = b; }
        const f = (sfx) => this._hass.states[P + sfx] ? P + sfx : null;
        out.push({ key: k, name: this._nm(name, name), P, cpu: f('cpu_usage'), mem: f('memory_usage'), memUsed: f('memory_used'), memTotal: f('memory_total'), disk: f('root_filesystem_usage') || f('disk_usage'),
          up: f('uptime'), load1: f('load_average_1m'), load5: f('load_average_5m'), load15: f('load_average_15m'), swap: f('swap_usage'), iowait: f('io_wait'),
          ver: f('pve_version'), kernel: f('kernel_version'), upd: f('node_updates'), status: f('status') || (this._hass.states[`binary_sensor.${k}_status`] ? `binary_sensor.${k}_status` : null),
          temp: (k === pref && this.config.pve_temp) || ids.find(id => id.startsWith(P) && /temp/.test(id)) || null,
          stress: ids.filter(id => id.startsWith(`binary_sensor.${k}_`) && /stress|overload/.test(id)), btns, src: 'pes' });
      }
      // proxmoxve (HACS/kjerne): grupper registerentiteter per enhet
      for (const g of this._pveRegGroups()) if (g.type === 'node') {
        const L = g.ids, fnd = (re, d = 'sensor') => L.find(id => id.startsWith(d + '.') && re.test(obj(id))) || null;
        const btns = {}; for (const b of L) if (dom(b) === 'button') { const a = actOf(obj(b).slice(g.pre.length)); if (a && !btns[a]) btns[a] = b; }
        out.push({ key: g.dev, name: g.name, P: '', cpu: fnd(/cpu_(usage|used)$/), mem: fnd(/memory_(usage|used_percentage)$/), memUsed: fnd(/memory_used$/), memTotal: fnd(/memory_(total|free)$/), disk: fnd(/disk_(usage|used_percentage)$/),
          up: fnd(/uptime$/), load1: null, load5: null, load15: null, swap: fnd(/swap_(usage|used_percentage)$/), iowait: null, ver: fnd(/version$/), kernel: null, upd: fnd(/updates?$/),
          status: fnd(/status$/, 'binary_sensor') || fnd(/status$/), temp: fnd(/temp/), stress: [], btns, src: 'reg' });
      }
      return (this._pnC = out);
    }
    /** proxmoxve-registerentiteter gruppert per enhet: [{dev, type, name, vmid, ids, pre}] */
    _pveRegGroups() {
      if (this._prS === this._hass.states && this._prC) return this._prC;
      this._prS = this._hass.states;
      const R = this._reg(), D = this._devs(), per = {};
      for (const id in R) { const r = R[id]; if (!r || !/^proxmox(ve)?$/.test(r.platform) || r.hidden || !this._hass.states[id]) continue; (per[r.device_id || 'x'] = per[r.device_id || 'x'] || []).push(id); }
      const out = [];
      for (const [dev, ids] of Object.entries(per)) {
        const objs = ids.map(obj), pre = prefixOf(objs), d = D[dev] || {};
        const hint = `${pre} ${d.model || ''} ${d.name || ''}`.toLowerCase();
        const type = /(^|[\s_])(lxc|ct|container)/.test(hint) ? 'lxc' : /(^|[\s_])(qemu|vm|virtual)/.test(hint) ? 'vm' : /storage/.test(hint) ? 'storage' : /node/.test(hint) ? 'node' : null;
        if (!type) continue;
        const vmid = (hint.match(/\b(\d{3,})\b|_(\d{3,})_/) || []).slice(1).find(Boolean) || '';
        const raw = pre.replace(/^(node|qemu|lxc|vm|ct|storage)_/, '').replace(/_?\d{3,}_?$/, '').replace(/_$/, '');
        let name = String(d.name_by_user || d.name || '').replace(/^(node|qemu|lxc|vm|ct|storage)\s*[:-]?\s*/i, '').replace(/\(?\b\d{3,}\b\)?/g, '').trim() || title(raw);
        name = this._nm(vmid, this._nm(raw, name));
        out.push({ dev, type, name, vmid, ids, pre, raw });
      }
      return (this._prC = out);
    }
    /** Proxmox-gjester (struktur) */
    _pveGuests() {
      if (this._pgS === this._hass.states && this._pgC) return this._pgC;
      this._pgS = this._hass.states;
      const out = [], ids = this._ids();
      const mk = (kind, vmid, key, name, L, pre) => {
        const fnd = (re, doms = ['sensor']) => L.find(id => doms.includes(dom(id)) && re.test(obj(id).slice(pre.length))) || null;
        const btns = {}; for (const b of L) if (dom(b) === 'button') { const a = actOf(obj(b).slice(pre.length)); if (a && !btns[a]) btns[a] = b; }
        return { k: `pve-${kind}-${vmid || key}`, kind, vmid, key, name, status: fnd(/^status$/, ['sensor', 'binary_sensor']) || fnd(/status$/, ['sensor', 'binary_sensor']),
          cpu: fnd(/^cpu_(usage|used)$/), memPct: fnd(/^(memory|ram)_(usage|used_percentage)$/), memUsed: fnd(/^(memory|ram)_used$/), memTotal: fnd(/^(memory|ram)_total$/),
          disk: fnd(/^disk_(usage|used_percentage)$/), up: fnd(/^uptime$/), btns };
      };
      const groups = {};
      for (const id of ids) {
        const m = id.match(/^sensor\.(\d+)_(ct|lxc|vm|qemu)_(.+)_status$/); if (!m) continue;
        const [, n, k, key] = m, base = `${n}_${k}_${key}_`;
        const vmid = (key.match(/_(\d{2,})$/) || [])[1] || '', raw = key.replace(/_\d{2,}$/, '');
        let name = String(this.at(id, 'friendly_name', '') || '').replace(/\s*status\s*$/i, '').replace(/\(?\b\d{3,}\b\)?/g, '').replace(/^\s*(lxc|ct|vm|qemu)\b\s*[-:]?\s*/i, '').trim() || title(raw);
        name = this._nm(vmid, this._nm(raw, name));
        groups[base] = { kind: /ct|lxc/.test(k) ? 'lxc' : 'vm', vmid, raw, name };
      }
      if (Object.keys(groups).length) {
        const by = {}; for (const b of Object.keys(groups)) by[b] = [];
        for (const id of ids) { const o = obj(id); if (!/^\d+_(ct|lxc|vm|qemu)_/.test(o)) continue; for (const b in by) if (o.startsWith(b)) { by[b].push(id); break; } }
        for (const b in groups) { const g = groups[b]; out.push(mk(g.kind, g.vmid, g.raw, g.name, by[b], b)); }
      }
      for (const g of this._pveRegGroups()) if (g.type === 'lxc' || g.type === 'vm') out.push(mk(g.type, g.vmid, g.raw, g.name, g.ids, g.pre));
      return (this._pgC = out);
    }
    _pveStorage() {
      const out = [];
      for (const id of this._ids()) {
        const m = id.match(/^sensor\.(\d+)_storage_(.+)_usage$/); if (!m) continue;
        const base = `sensor.${m[1]}_storage_${m[2]}_`;
        const name = this._nm(m[2], String(this.at(id, 'friendly_name', '') || '').replace(/\s*(usage|bruk)\s*$/i, '').replace(/^\s*storage\s*/i, '').trim() || m[2].replace(/_/g, '-'));
        out.push({ id, name, used: base + 'used', total: base + 'total' });
      }
      for (const g of this._pveRegGroups()) if (g.type === 'storage') { const u = g.ids.find(id => /disk_(usage|used_percentage)$|_usage$/.test(id)); if (u) out.push({ id: u, name: g.name, used: g.ids.find(id => /_used$/.test(id)), total: g.ids.find(id => /_total$/.test(id)) }); }
      return out;
    }
    /** Unraid */
    _unraid() {
      const u = this.config.unraid; if (!u) return null;
      const P = `sensor.${u}_`, ids = this._ids();
      if (!ids.some(id => id.startsWith(P) || id.startsWith(`switch.${u}_`))) return null;
      const cont = ids.filter(id => id.startsWith(`switch.${u}_container_`)).map(id => {
        const k = id.slice(`switch.${u}_container_`.length);
        const nm = this._nm(k, title(k.replace(/^binhex_/, '')));
        return { id, key: k, name: nm, upd: `update.${obj(id)}_update`, restart: ids.find(b => b.startsWith(`button.${u}_container_${k}_`) && /restart/.test(b)) || null, cpu: `sensor.${u}_container_${k}_cpu_usage`, mem: `sensor.${u}_container_${k}_memory_usage` };
      }).sort((x, y) => x.name.localeCompare(y.name, 'nb'));
      const vms = ids.filter(id => id.startsWith(`switch.${u}_vm_`)).map(id => ({ id, name: this._nm(id.slice(`switch.${u}_vm_`.length), title(id.slice(`switch.${u}_vm_`.length))) }));
      const disks = {};
      for (const id of ids) {
        if (!id.startsWith(P)) continue;
        const m = id.slice(P.length).match(/^(disk_?\d+|parity_?\d*|cache[a-z0-9_]*?)_(usage|temperature|temp)$/); if (!m) continue;
        (disks[m[1]] = disks[m[1]] || { key: m[1] })[m[2] === 'usage' ? 'use' : 'temp'] = id;
      }
      const dl = Object.values(disks).map(d => ({ ...d, name: /^disk/.test(d.key) ? 'Disk ' + d.key.replace(/\D/g, '') : /^parity/.test(d.key) ? ('Parity ' + d.key.replace(/\D/g, '')).trim() : title(d.key.replace(/_/g, ' ')).replace(/^Cache$/, 'Cache (NVMe)') }))
        .sort((x, y) => (/^Parity/.test(x.name) ? -1 : 0) - (/^Parity/.test(y.name) ? -1 : 0) || (/^Cache/.test(x.name) ? 1 : 0) - (/^Cache/.test(y.name) ? 1 : 0) || x.name.localeCompare(y.name, 'nb', { numeric: true }));
      const first = (re, d = 'switch') => ids.find(id => id.startsWith(`${d}.${u}_`) && re.test(id.slice(d.length + u.length + 2)));
      return { u, P, cont, vms, disks: dl, parity: first(/parit/), mover: first(/mover/) || first(/mover/, 'button'), check: first(/check_container_updates/, 'button') };
    }
    /** UniFi-enheter: device_tracker.<slug> med sensor.<slug>_uptime(_2) */
    _unifi() {
      const ids = this._ids(), S = this._hass.states, out = [];
      for (const id of ids) {
        if (!id.startsWith('device_tracker.')) continue;
        const slug = id.slice(15);
        const sfx = S[`sensor.${slug}_uptime_2`] ? '_2' : S[`sensor.${slug}_uptime`] ? '' : null;
        if (sfx === null) continue;
        const cpu = S[`sensor.${slug}_cpu_utilisation${sfx}`] ? `sensor.${slug}_cpu_utilisation${sfx}` : S[`sensor.${slug}_cpu_utilization${sfx}`] ? `sensor.${slug}_cpu_utilization${sfx}` : null;
        if (!cpu) continue;
        const name = String(this.at(id, 'friendly_name', '') || this.at(`sensor.${slug}_uptime${sfx}`, 'friendly_name', '') || '').replace(/\s*(uptime|oppetid)\s*$/i, '').trim() || title(slug);
        const lav = `${name} ${slug}`.toLowerCase();
        const type = /dream|udm|gateway|udr|ucg|uxg|usg/.test(lav) || ids.includes(`sensor.${slug}_google_wan_latency`) || ids.includes(`sensor.${slug}_cloudflare_wan_latency`) ? 0 : /usw|switch|flex|\bus[- ]?\d/.test(lav) ? 1 : 2;
        const memId = [`sensor.${slug}_memory_utilisation${sfx}`, `sensor.${slug}_memory_utilization${sfx}`].find(x => S[x]) || `sensor.${slug}_memory_utilisation${sfx}`;
        const temp = [`sensor.${slug}_cpu_temperature${sfx}`, `sensor.${slug}_temperature${sfx}`, `sensor.${slug}_cpu_temperature`, `sensor.${slug}_temperature`].find(x => S[x]) || null;
        const restart = [`button.${slug}_restart`, `button.${slug}_restart_2`].find(x => S[x]) || null;
        const ports = ids.filter(p => p.startsWith(`switch.${slug}_port_`) && /_port_\d+(_poe)?$/.test(p)).sort((x, y) => +x.match(/_port_(\d+)/)[1] - +y.match(/_port_(\d+)/)[1]);
        const cycles = ids.filter(p => p.startsWith(`button.${slug}_port_`) && /power_cycle$/.test(p));
        out.push({ slug, name, type, tracker: id, up: `sensor.${slug}_uptime${sfx}`, cpu, mem: memId, clients: `sensor.${slug}_clients`, fw: `update.${slug}_firmware`, temp, restart, ports, cycles });
      }
      out.sort((x, y) => x.type - y.type || x.name.localeCompare(y.name, 'nb'));
      const gws = this.config.unifi_gateway;
      const gw = (gws && out.find(d => d.slug === gws)) || out.find(d => d.type === 0) || null;
      const gwSlug = gws || (gw && gw.slug) || ((ids.find(id => /_(google|cloudflare)_wan_latency$/.test(id)) || '').replace(/^sensor\.|_(google|cloudflare)_wan_latency$/g, ''));
      return { list: out, gw, gwSlug };
    }
    /** Entiteter fra UniFi-integrasjonen (krever entitetsregisteret) */
    _unifiReg() {
      const R = this._reg(), out = [];
      for (const id in R) if (R[id] && R[id].platform === 'unifi' && !R[id].hidden && this._hass.states[id]) out.push(id);
      return out;
    }
    /** Wi-Fi-nett (WLAN-brytere): enheter med QR-bilde eller id med wlan/wifi/ssid */
    _wlans() {
      const R = this._reg(), reg = this._unifiReg();
      const qrDev = new Set(reg.filter(id => dom(id) === 'image').map(id => (R[id] || {}).device_id).filter(Boolean));
      return reg.filter(id => dom(id) === 'switch' && !/port_\d/.test(id) && (qrDev.has((R[id] || {}).device_id) || /wlan|wifi|wi_fi|ssid/.test(obj(id))));
    }

    /* ---------------- modeller (verdier) ---------------- */
    _gV(g) {
      const raw = this.v(g.status).toLowerCase();
      const state = dom(g.status || 'x.x') === 'binary_sensor' ? (raw === 'on' ? 'running' : raw === 'off' ? 'stopped' : raw) : raw;
      const on = state === 'running', paused = /pause|suspend/.test(state);
      const mu = bytes(this.st(g.memUsed)), mt = bytes(this.st(g.memTotal));
      const memP = this.n(g.memPct) ?? (mu != null && mt ? mu / mt * 100 : null);
      return { ...g, state, on, paused, cpuV: this.n(g.cpu), memV: memP, mu, mt, diskV: this.n(g.disk), upS: upSec(this.st(g.up)) };
    }
    _nV(N) {
      const mu = bytes(this.st(N.memUsed)), mt = bytes(this.st(N.memTotal));
      const st = this.v(N.status).toLowerCase();
      const online = !N.status || ['online', 'on', 'running', 'ok'].includes(st) || (!KD.BAD.has(st) && !/off|down|unknown/.test(st));
      return { ...N, online, cpuV: this.n(N.cpu), memV: this.n(N.mem) ?? (mu != null && mt ? mu / mt * 100 : null), mu, mt, diskV: this.n(N.disk), upS: upSec(this.st(N.up)),
        loads: [this.n(N.load1), this.n(N.load5), this.n(N.load15)], swapV: this.n(N.swap), ioV: this.n(N.iowait), tempV: N.temp ? this.n(N.temp) : null,
        verV: (String(this.v(N.ver)).match(/\d+\.\d+(\.\d+)?/) || [])[0] || '', updV: this.n(N.upd), stressOn: N.stress.filter(id => this.v(id) === 'on') };
    }
    _urV(U) {
      const P = U.P, u = U.u;
      const dockers = U.cont.map(d => ({ ...d, on: this.v(d.id) === 'on', gone: !this.ok(d.id), hasUpd: this.v(d.upd) === 'on', cpuV: this.n(d.cpu), memV: this.n(d.mem) }));
      const parRun = this.v(`binary_sensor.${u}_parity_check_running`) === 'on';
      const parP = this.n(`sensor.${u}_parity_check_progress`, this.n(`sensor.${u}_parity_progress`));
      const parity = parRun || (parP != null && parP > 0 && parP < 100) || (U.parity && this.v(U.parity) === 'on');
      const arrState = this.v(P + 'array_state') || this.v(P + 'array_status');
      const arrOn = this.st(`binary_sensor.${u}_array_started`) ? this.v(`binary_sensor.${u}_array_started`) === 'on' : !/stop/i.test(arrState);
      const disks = U.disks.map(d => {
        const s = this.st(d.use), at = (s && s.attributes) || {}, t = this.n(d.temp), bar = this.n(d.use), par = /^Parity/.test(d.name);
        const tot = sizeAttr(at.total_size ?? at.disk_size ?? at.size ?? at.total), used = sizeAttr(at.used_space ?? at.used), free = sizeAttr(at.free_space ?? at.free);
        const spun = at.spin_down === true || /standby|spun|sleep/i.test(String(at.disk_status || at.status || at.spin_state || '')) || (d.temp && !this.ok(d.temp) && !!this.st(d.temp));
        return { ...d, par, cache: /^Cache/.test(d.name), t, bar, tot, used: used ?? (tot != null && free != null ? tot - free : null), spun, model: at.model || at.device || '', fs: at.filesystem || at.fs_type || '' };
      });
      return { dockers, parRun: parity, parP, arrOn, arrState, disks, cpu: this.n(P + 'cpu_usage'), ram: this.n(P + 'ram_usage'), arr: this.n(P + 'array_usage'), temp: this.n(P + 'cpu_temperature'),
        mobo: this.n(P + 'motherboard_temperature'), parErr: this.n(P + 'parity_check_errors', this.n(P + 'parity_errors')), upsStatus: this.v(P + 'ups_status'),
        upsB: this.n(P + 'ups_battery', this.n(P + 'ups_battery_charge')), upsRt: this.n(P + 'ups_runtime', this.n(P + 'ups_battery_runtime')), upsLoad: this.n(P + 'ups_load', this.n(P + 'ups_load_percentage')) };
    }
    _ufV(UF) {
      return UF.list.map(d => {
        const tr = this.st(d.tracker), on = !tr || tr.state === 'home';
        return { ...d, on, kl: this.n(d.clients), cpuV: this.n(d.cpu), memV: this.n(d.mem), tempV: d.temp ? this.n(d.temp) : null, upS: upSec(this.st(d.up)), fwV: this.at(d.fw, 'installed_version', ''), fwNew: this.v(d.fw) === 'on' ? this.at(d.fw, 'latest_version', '') || 'ny' : '' };
      });
    }

    /* ---------------- hendelser ---------------- */
    goTab(ev, k) { this.setState({ tab: k, open: null, conf: null }); }
    setGf(ev, v) { this.setState({ gf: v, open: null }); }
    setGs(ev, v) { this.setState({ gs: v }); }
    setDf(ev, v) { this.setState({ df: v, open: null }); }
    openRow(ev, k) { this.setState({ open: this.state.open === k ? null : k, conf: null }); }
    moreInfo(ev, k) { const id = this._mi[k] || k; if (id && id.includes('.')) this.more(id); }
    _run(id) {
      if (!id) return; const d = dom(id);
      if (d === 'button') this.press(id); else if (d === 'update') this.call('update', 'install', { entity_id: id }); else this.toggle(id);
    }
    /** Trykk på handling: bekreft først hvis den kan stoppe noe */
    ask(ev, id) { if (!id) return; const m = this._cm[id]; if (m && m.confirm) { clearTimeout(this._cT); this._cT = setTimeout(() => this.state.conf === id && this.setState({ conf: null }), 9000); this.setState({ conf: id }); } else this._run(id); }
    yesConf(ev, id) { clearTimeout(this._cT); this.haptic('heavy'); this._run(id); this.setState({ conf: null }); }
    noConf() { this.setState({ conf: null }); }
    /* bakoverkompatible navn */
    act(ev, id) { this.ask(ev, id); }
    tog(ev, id) { this.ask(ev, id); }
    /** Registrer handling for bekreftelse: rad-nøkkel, verb («Slå av»), tekst, bekreft? */
    _A(id, row, verb, what, confirm, col) { if (id) this._cm[id] = { row, verb, what, confirm: !!confirm, col: col || C.red }; return id; }

    /* ---------------- byggeklosser (HTML) ---------------- */
    _chip(t, col) { return t ? `<span style="display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 8px;border-radius:10px;flex:none;font-size:11px;font-weight:600;white-space:nowrap;background:${a(col, 0.16)};color:${col}"><span style="width:6px;height:6px;border-radius:3px;background:${col}"></span>${e(t)}</span>` : ''; }
    _mbar(label, p, col, txt) {
      const w = p == null || isNaN(p) ? 0 : Math.max(0, Math.min(100, p));
      return `<div style="display:flex;align-items:center;gap:8px;min-width:0;font-size:11px;color:#8e8d89;font-variant-numeric:tabular-nums">
        <span style="width:34px;flex:none">${e(label)}</span>
        <span style="flex:1;min-width:0;height:4px;border-radius:2px;background:#2a2a2d;overflow:hidden"><span style="display:block;height:100%;width:${w}%;border-radius:2px;background:${col};transition:width .5s"></span></span>
        <span style="flex:none;min-width:38px;text-align:right;color:#c9c7c2">${e(txt != null ? txt : p == null ? '–' : nf(p) + ' %')}</span></div>`;
    }
    _stats(list) {
      const L = list.filter(x => x && x[1] != null && x[1] !== '');
      return L.length ? `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px">${L.map(([l, v, col]) => `<div style="min-width:0;padding:9px 11px;border-radius:16px;background:#232326;display:flex;flex-direction:column;gap:2px">
        <span style="font-size:11px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(l)}</span>
        <span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;${col ? 'color:' + col : ''}">${e(v)}</span></div>`).join('')}</div>` : '';
    }
    /** Handlingsknapp (pille) – med bekreftelse når må */
    _btn(id, row, act, what, label, icon, col, confirm) {
      if (!id) return '';
      this._A(id, row, label, what, confirm, col);
      const on = this.state.conf === id;
      return `<button data-on-click="ask" data-arg="${e(id)}" style="height:36px;padding:0 13px 0 10px;border-radius:18px;display:inline-flex;align-items:center;gap:6px;flex:none;font-size:13px;font-weight:500;white-space:nowrap;background:${on ? a(col, 0.22) : '#232326'};color:${col};box-shadow:inset 0 0 0 1px ${on ? a(col, 0.5) : 'rgba(255,255,255,0.04)'}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">${e(icon)}</span>${e(label)}</button>`;
    }
    _btns(list) { const h = list.filter(Boolean).join(''); return h ? `<div style="display:flex;flex-wrap:wrap;gap:6px">${h}</div>` : ''; }
    /** Bekreft-rad for en rad (vises når en av radens handlinger venter) */
    _confHTML(row) {
      const id = this.state.conf, m = id && this._cm[id];
      if (!m || m.row !== row) return '';
      return `<div data-key="cf-${e(row)}" style="display:flex;align-items:center;gap:8px;padding:8px 8px 8px 12px;border-radius:20px;background:${a(m.col, 0.12)};box-shadow:inset 0 0 0 1px ${a(m.col, 0.3)};animation:fadein .2s">
        <span class="ms" style="font-size:20px;color:${m.col};flex:none">warning</span>
        <span style="flex:1;min-width:0;font-size:13px;line-height:1.3"><b style="font-weight:600">${e(m.verb)}</b> ${e(m.what)}?</span>
        <button data-on-click="noConf" style="height:34px;padding:0 12px;border-radius:17px;flex:none;background:#2a2a2d;font-size:13px">Avbryt</button>
        <button data-on-click="yesConf" data-arg="${e(id)}" data-no-haptic="1" style="height:34px;padding:0 14px;border-radius:17px;flex:none;background:${m.col};color:#161414;font-size:13px;font-weight:600;white-space:nowrap">${e(m.verb)}</button></div>`;
    }
    _toggleHTML(id, row, on, what, confirmOff, col = C.pink, verbs = ['Slå på', 'Slå av']) {
      this._A(id, row, on ? verbs[1] : verbs[0], what, on && confirmOff, on ? C.red : C.green);
      return `<button data-on-click="ask" data-arg="${e(id)}" style="position:relative;width:44px;height:26px;border-radius:13px;flex:none;background:${on ? col : '#3a3a3d'};transition:background .2s"><span style="position:absolute;top:3px;left:${on ? 21 : 3}px;width:20px;height:20px;border-radius:10px;background:#f4f3ef;transition:left .2s"></span></button>`;
    }
    /** Generisk rad. o: {k, name, icon, col, on, tag, chip:[t,col], sub, warn, bar, bars:[[l,p,col,txt]], v, act, actIcon, actCol, actVerb, actConfirm, tog, togOn, togConfirm, togCol, detail(fn), more} */
    _row(o, i) {
      const on = o.on ?? true, col = o.col || C.blue, k = o.k || o.act || o.tog || o.name, open = !!o.detail && this.state.open === k;
      if (o.more) this._mi[k] = o.more;
      const bar = o.bar != null ? `<span style="display:block;height:4px;border-radius:2px;background:#2a2a2d;overflow:hidden"><span style="display:block;width:${Math.max(0, Math.min(100, o.bar))}%;height:100%;border-radius:2px;background:${o.barCol || pctCol(o.bar, 85, 95, col)};transition:width .5s"></span></span>` : '';
      const bars = (o.bars || []).filter(Boolean).map(b => this._mbar(...b)).join('');
      let actB = '';
      if (o.act) { this._A(o.act, k, o.actVerb || 'Utfør', o.name, o.actConfirm, o.actCol && o.actConfirm ? o.actCol : C.red); actB = `<button data-on-click="ask" data-arg="${e(o.act)}" style="width:36px;height:36px;border-radius:18px;flex:none;display:grid;place-items:center;background:${this.state.conf === o.act ? a(C.red, 0.2) : '#232326'};color:${o.actCol || '#c9c7c2'}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">${e(o.actIcon || 'play_arrow')}</span></button>`; }
      const togB = o.tog ? this._toggleHTML(o.tog, k, !!o.togOn, o.name, o.togConfirm, o.togCol, o.togVerbs) : '';
      const detail = open ? o.detail() : '';
      const conf = this._confHTML(k);
      return `<div data-key="r-${e(k)}" style="display:flex;flex-direction:column;gap:${open || conf ? 10 : 0}px;padding:${open ? '12px 12px 14px' : '10px 4px'};margin:${open ? '4px -4px' : '0'};border-radius:${open ? 22 : 0}px;background:${open ? '#1c1c1f' : 'transparent'};border-top:${i && !open ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent'};transition:background .25s,padding .25s,margin .25s,border-radius .25s">
        <div ${o.detail ? `data-on-click="openRow" data-arg="${e(k)}"` : ''} ${o.more ? `data-hold="moreInfo" data-arg="${e(k)}"` : ''} style="display:flex;align-items:center;gap:12px;min-width:0;${o.detail ? 'cursor:pointer' : ''}">
          <span style="width:36px;height:36px;border-radius:12px;flex:none;display:grid;place-items:center;background:${on ? a(col, 0.16) : '#1f1f22'};color:${on ? col : '#6d6c69'}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">${e(o.icon)}</span></span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:5px">
            <span style="display:flex;align-items:center;gap:6px;min-width:0;font-size:14px;font-weight:500"><span style="min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(o.name)}</span>${o.tag ? `<span style="flex:none;font-size:10px;font-weight:600;padding:2px 6px;border-radius:6px;background:${o.tagCol ? a(o.tagCol, 0.18) : '#2a2a2d'};color:${o.tagCol || '#a9a7a2'};text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap">${e(o.tag)}</span>` : ''}${o.chip ? this._chip(o.chip[0], o.chip[1]) : ''}</span>
            ${o.sub ? `<span style="font-size:12px;color:${o.warn ? C.red : '#8e8d89'};font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(o.sub)}</span>` : ''}
            ${bar}${bars ? `<div style="display:flex;flex-direction:column;gap:3px">${bars}</div>` : ''}
          </div>
          ${o.v ? `<span style="flex:none;font-size:13px;font-weight:500;color:${o.vCol || '#c9c7c2'};font-variant-numeric:tabular-nums;white-space:nowrap">${e(o.v)}</span>` : ''}
          ${o.detail ? `<span class="ms" style="flex:none;font-size:20px;color:#6d6c69;transition:transform .25s;transform:rotate(${open ? 180 : 0}deg)">expand_more</span>` : ''}
          ${actB}${togB}
        </div>
        ${detail}${conf}
      </div>`;
    }
    _sec(title, meta, inner, opts = {}) {
      if (!inner) return '';
      return `<section data-key="sec-${e(opts.key || title)}" data-lay="${e(opts.key || title)}" data-lay-navn="${e(title)}" style="display:flex;flex-direction:column;gap:${opts.gap ?? 4}px;min-width:0">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:0 4px 6px">
        <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;white-space:nowrap">${e(title)}</div>
        <div style="font-size:12px;color:#6d6c69;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(meta || '')}</div>
      </div>${inner}</section>`;
    }
    _rows(list) { return list.filter(Boolean).map((o, i) => this._row(o, i)).join(''); }
    _gauge(label, v, max, unit, sub, col) {
      const vv = v == null || isNaN(v) ? 0 : v;
      return { label, sub, v: v == null || isNaN(v) ? '–' : `${nf(v)}${unit}`, deg: Math.max(0, Math.min(1, vv / max)) * 360, col };
    }
    _gaugesHTML(G) {
      return `<section data-lay="maalere" data-lay-navn="Målere" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
    ${G.map(g => `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 6px 14px;border-radius:22px;background:#1c1c1f;min-width:0">
        <div style="position:relative;width:72px;height:72px;border-radius:50%;background:conic-gradient(${g.col} ${g.deg}deg, #2a2a2d 0);transition:background .6s"><div style="position:absolute;inset:8px;border-radius:50%;background:#1c1c1f;display:grid;place-items:center"><span style="font-size:17px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap">${e(g.v)}</span></div></div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:1px;text-align:center;min-width:0;max-width:100%"><span style="font-size:13px;font-weight:500">${e(g.label)}</span><span style="font-size:11px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${e(g.sub)}</span></div>
      </div>`).join('')}
  </section>`;
    }
    _heroHTML(V) {
      return `<section data-lay="status" data-lay-navn="Status" style="display:flex;flex-direction:column;gap:6px;padding:0 4px;min-width:0">
    <div style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;color:#c9c7c2;min-width:0"><span style="width:8px;height:8px;border-radius:4px;flex:none;background:${V.ok};box-shadow:0 0 10px ${V.ok}"></span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(V.status)}</span></div>
    <div style="font-size:24px;font-weight:500;letter-spacing:-0.015em">${e(V.headline)}</div>
    <div style="font-size:14px;color:#8e8d89">${e(V.subline)}</div>
  </section>`;
    }
    _speedHTML() {
      const sp = this._speed(); if (!sp) return '';
      const bars = (arr, col) => { const m = Math.max(1, ...arr); return arr.map((v, i) => `<span style="flex:1;height:${v / m * 100}%;border-radius:2px;background:${i === arr.length - 1 ? col : a(col, 0.45)}"></span>`).join(''); };
      return `<section data-lay="fart" data-lay-navn="Hastighet" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
      ${[['Ned', 'south', sp.down, C.green], ['Opp', 'north', sp.up, C.blue]].map(([label, icon, arr, col]) => `<div style="display:flex;flex-direction:column;gap:6px;padding:16px;border-radius:22px;background:#1c1c1f;min-width:0">
          <span style="display:flex;align-items:center;gap:6px;font-size:12px;color:#8e8d89"><span class="ms" style="font-size:16px;color:${col}">${icon}</span><span>${label}</span></span>
          <span style="font-size:28px;font-weight:300;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;white-space:nowrap">${e(nf(arr[arr.length - 1] || 0))}<span style="font-size:13px;color:#8e8d89"> Mbit/s</span></span>
          <div style="display:flex;align-items:flex-end;gap:2px;height:32px">${bars(arr, col)}</div>
        </div>`).join('')}
    </section>`;
    }
    _speed() {
      const c = this.config, ids = [c.speedtest_ned, c.speedtest_opp].filter(id => this.st(id));
      if (!ids.length) return null;
      const hist = this.cached('kd-srv-speed-' + ids.join(','), 10 * 60e3, () => this.history(ids, 48), {});
      const series = (id) => {
        if (!id || !this.st(id)) return [];
        const pts = ((hist && hist[id]) || []).map(p => p.v).filter(v => typeof v === 'number');
        const cur = this.n(id), arr = pts.slice(-20);
        if (cur != null && (!arr.length || arr[arr.length - 1] !== cur)) { arr.push(cur); if (arr.length > 20) arr.shift(); }
        return arr;
      };
      return { down: series(c.speedtest_ned), up: series(c.speedtest_opp) };
    }

    /* ---------------- helse (varsler) ---------------- */
    _health(M) {
      const c = this.config, out = [], G = { cpu: +c.grense_cpu || 85, ram: +c.grense_ram || 90, disk: +c.grense_disk || 85, temp: +c.grense_temp || 70, dt: +c.grense_disktemp || 50 };
      const add = (lvl, icon, text, sub, tab, k) => out.push({ lvl, icon, text, sub, tab, k: k || text });
      if (M.pve) {
        for (const n of M.pve.nodes) {
          if (!n.online) add(2, 'dns', `${n.name} er frakoblet`, 'Proxmox-node', 'pve');
          if (n.cpuV != null && n.cpuV >= G.cpu) add(n.cpuV >= 95 ? 2 : 1, 'speed', `Høy CPU på ${n.name}`, `${nf(n.cpuV)} %`, 'pve');
          if (n.memV != null && n.memV >= G.ram) add(n.memV >= 97 ? 2 : 1, 'memory', `Lite minne på ${n.name}`, `${nf(n.memV)} % brukt`, 'pve');
          if (n.diskV != null && n.diskV >= G.disk) add(n.diskV >= 95 ? 2 : 1, 'hard_drive', `Rot-disken på ${n.name} er nesten full`, `${nf(n.diskV)} %`, 'pve');
          if (n.tempV != null && n.tempV >= G.temp) add(n.tempV >= G.temp + 10 ? 2 : 1, 'thermostat', `Varm CPU på ${n.name}`, `${nf(n.tempV)}°`, 'pve');
          for (const s of n.stressOn) add(1, 'warning', this.fname(s), 'Proxmox', 'pve');
          if (n.updV) add(0, 'system_update', `${nf(n.updV)} pakkeoppdateringer på ${n.name}`, 'Proxmox VE', 'pve');
        }
        const off = M.pve.guests.filter(g => !g.on);
        if (off.length) add(0, 'deployed_code', off.length === 1 ? `${off[0].name} er ${off[0].paused ? 'pauset' : 'stoppet'}` : `${off.length} gjester er stoppet`, 'Proxmox · ' + off.map(g => g.name).join(', '), 'pve');
        for (const g of M.pve.guests) if (g.on && g.cpuV != null && g.cpuV >= G.cpu) add(1, 'speed', `${g.name} bruker mye CPU`, `${nf(g.cpuV)} %`, 'pve');
        for (const g of M.pve.guests) if (g.diskV != null && g.diskV >= G.disk) add(g.diskV >= 95 ? 2 : 1, 'hard_drive', `Disken til ${g.name} er nesten full`, `${nf(g.diskV)} %`, 'pve');
        for (const s of M.pve.store) if (s.bar != null && s.bar >= G.disk) add(s.bar >= 95 ? 2 : 1, 'database', `Lagring ${s.name} er nesten full`, `${nf(s.bar)} %`, 'pve');
      }
      if (M.ur) {
        const R = M.ur;
        if (!R.arrOn) add(2, 'storage', 'Unraid-arrayet er stoppet', R.arrState || '', 'unraid');
        if (R.parRun) add(0, 'fact_check', 'Paritetssjekk pågår', R.parP != null ? `${nf(R.parP)} %` : '', 'unraid');
        if (R.parErr) add(2, 'error', `Paritetsfeil: ${nf(R.parErr)}`, 'Siste paritetssjekk', 'unraid');
        for (const d of R.disks) {
          if (!d.par && d.bar != null && d.bar >= G.disk) add(d.bar >= 95 ? 2 : 1, 'hard_drive', `${d.name} er nesten full`, `${nf(d.bar)} %`, 'unraid');
          if (d.t != null && d.t >= G.dt) add(d.t >= G.dt + 5 ? 2 : 1, 'device_thermostat', `${d.name} er varm`, `${nf(d.t)}°`, 'unraid');
        }
        if (R.cpu != null && R.cpu >= G.cpu) add(1, 'speed', 'Høy CPU på Unraid', `${nf(R.cpu)} %`, 'unraid');
        if (R.ram != null && R.ram >= G.ram) add(1, 'memory', 'Lite minne på Unraid', `${nf(R.ram)} %`, 'unraid');
        if (R.temp != null && R.temp >= G.temp) add(1, 'thermostat', 'Varm CPU på Unraid', `${nf(R.temp)}°`, 'unraid');
        if (/batt|onbatt/i.test(R.upsStatus)) add(2, 'battery_alert', 'UPS går på batteri', R.upsRt != null ? `${nf(R.upsRt)} min igjen` : '', 'unraid');
        const stop = R.dockers.filter(d => !d.on);
        if (stop.length) add(0, 'deployed_code', stop.length === 1 ? `${stop[0].name} er stoppet` : `${stop.length} containere er stoppet`, 'Docker · ' + stop.map(d => d.name).join(', '), 'unraid');
      }
      if (M.uf) {
        for (const d of M.uf.devs) {
          if (!d.on) add(2, 'wifi_off', `${d.name} svarer ikke`, 'UniFi-enhet', 'unifi');
          else if (d.cpuV != null && d.cpuV >= G.cpu) add(1, 'speed', `Høy CPU på ${d.name}`, `${nf(d.cpuV)} %`, 'unifi');
        }
        if (M.uf.ping != null && M.uf.ping > 100) add(1, 'network_ping', 'Høy latens på WAN', `${nf(M.uf.ping)} ms`, 'unifi');
      }
      if (M.upds.length) add(1, 'system_update', M.upds.length === 1 ? `Oppdatering klar: ${M.upds[0].name}` : `${M.upds.length} oppdateringer klare`, M.upds.map(u => u.name).slice(0, 4).join(', '), 'oversikt', 'upd');
      return out.sort((x, y) => y.lvl - x.lvl);
    }
    /** Alle update.* som venter (UniFi-fastvare og Unraid-containere) */
    _updates(U, UF) {
      const R = this._reg(), set = new Set();
      for (const d of UF.list) set.add(d.fw);
      for (const id of this._unifiReg()) if (dom(id) === 'update') set.add(id);
      if (U) for (const d of U.cont) set.add(d.upd);
      for (const id in R) if (R[id] && /^proxmox(ve)?$/.test(R[id].platform) && dom(id) === 'update') set.add(id);
      return [...set].filter(id => this.v(id) === 'on').map(id => ({ id, name: this.fname(id).replace(/\s*(firmware|fastvare|update|oppdatering)\s*$/i, '').trim(), from: this.at(id, 'installed_version', ''), to: this.at(id, 'latest_version', ''), busy: !!this.at(id, 'in_progress', false) }));
    }
    _updRows(list) {
      return list.map(u => ({ k: 'upd-' + u.id, name: u.name, icon: 'system_update', col: C.amber, more: u.id, sub: u.busy ? 'Installerer …' : [u.from, u.to].filter(Boolean).join(' → ') || 'Ny versjon',
        act: u.busy ? null : u.id, actIcon: 'download', actCol: C.amber, actVerb: 'Installer', actConfirm: true }));
    }

    /* ---------------- faner ---------------- */
    _tabOversikt(M, H) {
      const red = H.filter(x => x.lvl === 2).length, amb = H.filter(x => x.lvl === 1).length;
      const ok = red ? C.red : amb ? C.amber : C.green;
      const sys = [];
      if (M.pve) {
        const n = M.pve.nodes[0], run = M.pve.guests.filter(g => g.on).length;
        sys.push({ tab: 'pve', icon: 'deployed_code', name: 'Proxmox', col: C.blue, line: M.pve.guests.length ? `${run} av ${M.pve.guests.length} gjester kjører` : `${M.pve.nodes.length} ${M.pve.nodes.length === 1 ? 'node' : 'noder'}`, bars: n ? [['CPU', n.cpuV, pctCol(n.cpuV, 70, 90)], ['RAM', n.memV, pctCol(n.memV)]] : [] });
      }
      if (M.ur) sys.push({ tab: 'unraid', icon: 'storage', name: 'Unraid', col: C.amber, line: `${M.ur.arrOn ? 'Array startet' : 'Array stoppet'} · ${M.ur.dockers.filter(d => d.on).length}/${M.ur.dockers.length} Docker`, bars: [['Array', M.ur.arr, pctCol(M.ur.arr, 85, 95, C.amber)], ['CPU', M.ur.cpu, pctCol(M.ur.cpu, 70, 90)]] });
      if (M.uf) { const on = M.uf.devs.filter(d => d.on).length; sys.push({ tab: 'unifi', icon: 'router', name: 'UniFi', col: C.green, line: `${on}/${M.uf.devs.length} enheter · ${M.uf.clients != null ? nf(M.uf.clients) + ' klienter' : ''}`, bars: [['Ping', M.uf.ping != null ? Math.min(100, M.uf.ping / 40 * 100) : null, C.green, M.uf.ping != null ? `${nf(M.uf.ping)} ms` : '–'], M.uf.gwD ? ['GW', M.uf.gwD.cpuV, pctCol(M.uf.gwD.cpuV, 70, 90)] : null].filter(Boolean) });
      }
      const alertN = (t) => H.filter(x => x.tab === t && x.lvl > 0).length;
      const tiles = sys.map((s, i) => { const n = alertN(s.tab); return `<button data-on-click="goTab" data-arg="${s.tab}" style="min-width:0;${sys.length % 2 && i === sys.length - 1 ? 'grid-column:1/-1;' : ''}display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:24px;background:#1c1c1f;text-align:left">
          <span style="display:flex;align-items:center;gap:10px;min-width:0;width:100%"><span style="width:34px;height:34px;border-radius:12px;flex:none;display:grid;place-items:center;background:${a(s.col, 0.16)};color:${s.col}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">${s.icon}</span></span>
            <span style="flex:1;min-width:0;font-size:15px;font-weight:500">${e(s.name)}</span>${n ? `<span style="flex:none;min-width:20px;height:20px;padding:0 6px;box-sizing:border-box;border-radius:10px;display:grid;place-items:center;font-size:11px;font-weight:600;background:${a(C.amber, 0.2)};color:${C.amber}">${n}</span>` : `<span class="ms" style="flex:none;font-size:18px;color:${C.green};font-variation-settings:'FILL' 1">check_circle</span>`}</span>
          <span style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%">${e(s.line)}</span>
          <span style="display:flex;flex-direction:column;gap:4px;width:100%">${s.bars.map(b => this._mbar(...b)).join('')}</span></button>`; }).join('');
      const alerts = H.filter(x => x.k !== 'upd').map(x => ({ k: 'al-' + x.k, name: x.text, sub: x.sub, icon: x.icon, col: LVL[x.lvl], chip: [['Info', 'Advarsel', 'Kritisk'][x.lvl], LVL[x.lvl]], act: null, _tab: x.tab }));
      const alertHTML = alerts.map((o, i) => `<button data-on-click="goTab" data-arg="${e(o._tab)}" style="display:block;width:100%;text-align:left">${this._row({ ...o }, i)}</button>`).join('');
      return `${this._heroHTML({ ok, status: `Helse · ${sys.length} ${sys.length === 1 ? 'system' : 'systemer'}`, headline: red ? `${red} ${red === 1 ? 'kritisk varsel' : 'kritiske varsler'}` : amb ? `${amb} ${amb === 1 ? 'ting' : 'ting'} å se på` : 'Alt ser bra ut', subline: [M.pve ? `${M.pve.guests.filter(g => g.on).length} gjester` : '', M.ur ? `${M.ur.dockers.filter(d => d.on).length} containere` : '', M.uf ? `${M.uf.devs.filter(d => d.on).length} nettverksenheter` : '', M.upds.length ? `${M.upds.length} oppdateringer` : ''].filter(Boolean).join(' · ') })}
  ${tiles ? `<section data-lay="systemer" data-lay-navn="Systemer" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">${tiles}</section>` : ''}
  ${this._sec('Varsler', alerts.length ? `${alerts.length} aktive` : 'ingen', alerts.length ? alertHTML : `<div style="display:flex;align-items:center;gap:10px;padding:14px;border-radius:20px;background:#1c1c1f;color:#8e8d89;font-size:13px"><span class="ms" style="color:${C.green};font-variation-settings:'FILL' 1">verified</span>Ingen varsler – alt kjører som det skal</div>`, { key: 'varsler' })}
  ${this._sec('Oppdateringer', `${M.upds.length} klare`, this._rows(this._updRows(M.upds)), { key: 'oppd' })}`;
    }

    _tabPve(M) {
      const c = this.config, s = this.state, nodes = M.nodes, N = nodes[0] || null;
      const guests0 = M.guests, running = guests0.filter(g => g.on).length;
      const W = c.pve_effekt ? this.n(c.pve_effekt) : null;
      const V = {
        status: `${N ? N.name : 'Proxmox'} · Proxmox VE${N && N.verV ? ' ' + N.verV : ''}${nodes.length > 1 ? ` · ${nodes.length} noder` : ''}`, ok: nodes.some(n => !n.online) ? C.red : guests0.length && running === guests0.length ? C.green : C.amber,
        headline: !guests0.length ? (N ? 'Noden kjører' : 'Fant ingen Proxmox-node') : running === guests0.length ? 'Alle gjester kjører' : `${running} av ${guests0.length} gjester kjører`,
        subline: [N && N.upS != null ? `Oppe i ${upLong(N.upS)}` : '', W != null ? `${nf(W)} W` : '', c.pve_ip].filter(Boolean).join(' · '),
      };
      const G = N ? [
        this._gauge('CPU', N.cpuV, 100, ' %', c.pve_cpu_navn || (N.loads[0] != null ? `load ${nf(N.loads[0], 2)}` : ''), N.cpuV > 70 ? C.amber : C.blue),
        this._gauge('Minne', N.memV, 100, ' %', N.mu != null && N.mt != null ? `${fmtBs(N.mu)[0]} av ${fmtBs(N.mt).join(' ')}` : N.swapV != null ? `swap ${nf(N.swapV)} %` : '', N.memV > 90 ? C.amber : C.blue),
        N.temp ? this._gauge('Temp', N.tempV, 90, '°', 'CPU-pakke', N.tempV > 58 ? C.red : C.green) : this._gauge('Disk', N.diskV, 100, ' %', 'rot-FS', N.diskV > 85 ? C.amber : C.green),
      ] : null;
      // noder
      const nodeHTML = nodes.map(n => {
        const k = 'node-' + n.key, what = `noden ${n.name}`;
        const acts = this._btns([this._btn(n.btns.reboot, k, 'reboot', what, 'Omstart', 'restart_alt', C.blue, true), this._btn(n.btns.shutdown, k, 'shutdown', what, 'Slå av', 'power_settings_new', C.red, true),
          this._btn(n.btns.start_all, k, 'start_all', `alle gjester på ${n.name}`, 'Start alle', 'play_circle', C.green, true), this._btn(n.btns.stop_all, k, 'stop_all', `alle gjester på ${n.name}`, 'Stopp alle', 'stop_circle', C.red, true)]);
        const lds = n.loads.filter(x => x != null), load = lds.length ? lds.map(x => nf(x, lds.length > 1 ? 1 : 2)).join(' / ') : null;
        return `<div data-key="${e(k)}" style="display:flex;flex-direction:column;gap:12px;padding:14px;border-radius:24px;background:#1c1c1f;min-width:0">
          <div data-hold="moreInfo" data-arg="${e(n.cpu || n.status || '')}" style="display:flex;align-items:center;gap:10px;min-width:0">
            <span style="width:36px;height:36px;border-radius:12px;flex:none;display:grid;place-items:center;background:${a(C.blue, 0.16)};color:${C.blue}"><span class="ms" style="font-size:19px;font-variation-settings:'FILL' 1">dns</span></span>
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(n.name)}</span><span style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(['Proxmox VE' + (n.verV ? ' ' + n.verV : ''), (String(this.v(n.kernel)).match(/^[\d.]+-\d+/) || [])[0] ? 'kjerne ' + String(this.v(n.kernel)).match(/^[\d.]+-\d+/)[0] : ''].filter(Boolean).join(' · '))}</span></div>
            ${this._chip(n.online ? 'Online' : 'Frakoblet', n.online ? C.green : C.red)}
          </div>
          <div style="display:flex;flex-direction:column;gap:5px">${this._mbar('CPU', n.cpuV, pctCol(n.cpuV, 70, 90))}${this._mbar('RAM', n.memV, pctCol(n.memV, 85, 95), n.mu != null && n.mt != null ? `${fmtBs(n.mu)[0]}/${fmtB(n.mt)}` : null)}${n.diskV != null ? this._mbar('Disk', n.diskV, pctCol(n.diskV, 85, 95, C.green)) : ''}${n.swapV != null ? this._mbar('Swap', n.swapV, pctCol(n.swapV, 50, 80, C.blue)) : ''}</div>
          ${this._stats([['Oppetid', n.upS != null ? upLong(n.upS) : null], [n.loads.filter(x => x != null).length > 1 ? 'Load 1/5/15' : 'Load', load], ['Temp', n.tempV != null ? `${nf(n.tempV)}°` : null, tempCol(n.tempV, 60, 75)], ['IO-vent', n.ioV != null ? `${nf1(n.ioV)} %` : null], ['Oppdateringer', n.updV != null ? (n.updV ? `${nf(n.updV)} pakker` : 'Ingen') : null, n.updV ? C.amber : null], ['Varsler', n.stress.length ? (n.stressOn.length ? n.stressOn.length + ' aktive' : 'Ingen') : null, n.stressOn.length ? C.red : null]])}
          ${acts}${this._confHTML(k)}
        </div>`;
      }).join('');
      // gjester: filter og sortering
      const cnt = { alle: guests0.length, on: running, off: guests0.length - running };
      let guests = guests0.filter(g => s.gf === 'on' ? g.on : s.gf === 'off' ? !g.on : true);
      guests = guests.slice().sort(s.gs === 'cpu' ? (x, y) => (y.cpuV ?? -1) - (x.cpuV ?? -1) : s.gs === 'ram' ? (x, y) => (y.mu ?? y.memV ?? -1) - (x.mu ?? x.memV ?? -1) : (x, y) => (+x.vmid || 1e9) - (+y.vmid || 1e9) || x.name.localeCompare(y.name, 'nb'));
      const gRows = guests.map(g => {
        const chip = g.on ? ['Kjører', C.green] : g.paused ? ['Pauset', C.amber] : [g.state && !KD.BAD.has(g.state) && g.state !== 'stopped' ? title(g.state) : 'Stoppet', C.red];
        const what = `${g.kind === 'vm' ? 'VM' : 'LXC'} ${g.name}`, b = g.btns;
        return { k: g.k, name: g.name, icon: iconFor(g.name, g.kind === 'vm' ? 'computer' : 'deployed_code'), tag: `${g.kind}${g.vmid ? ' ' + g.vmid : ''}`, on: g.on || g.paused, col: g.paused ? C.amber : C.blue, chip, more: g.status,
          sub: g.on ? [g.upS != null ? `oppe ${upShort(g.upS)}` : '', g.mu != null ? fmtB(g.mu) + (g.mt ? ` av ${fmtB(g.mt)}` : '') : ''].filter(Boolean).join(' · ') : '',
          bars: g.on ? [['CPU', g.cpuV, pctCol(g.cpuV, 70, 90)], g.memV != null ? ['RAM', g.memV, pctCol(g.memV, 85, 95)] : null] : null,
          act: !g.on && !g.paused ? b.start : null, actIcon: 'play_arrow', actCol: C.green, actVerb: 'Start',
          detail: () => `${this._stats([['Status', title(g.state || '–')], ['Oppetid', g.upS != null ? upLong(g.upS) : null], ['CPU', g.cpuV != null ? `${nf1(g.cpuV)} %` : null], ['Minne', g.mu != null ? fmtB(g.mu) : g.memV != null ? `${nf(g.memV)} %` : null], ['Disk', g.diskV != null ? `${nf(g.diskV)} %` : null, pctCol(g.diskV, 85, 95, null)], ['VMID', g.vmid || null]])}
            ${this._btns(g.on ? [this._btn(b.shutdown, g.k, 'shutdown', what, 'Slå av', 'power_settings_new', C.amber, true), this._btn(b.reboot, g.k, 'reboot', what, 'Omstart', 'restart_alt', C.blue, true), this._btn(b.suspend, g.k, 'suspend', what, 'Pause', 'pause', C.amber, true), this._btn(b.stop, g.k, 'stop', what, 'Tving stopp', 'stop_circle', C.red, true)]
              : g.paused ? [this._btn(b.resume, g.k, 'resume', what, 'Fortsett', 'play_arrow', C.green, false), this._btn(b.stop, g.k, 'stop', what, 'Tving stopp', 'stop_circle', C.red, true)]
              : [this._btn(b.start, g.k, 'start', what, 'Start', 'play_arrow', C.green, false)])}` };
      });
      const filt = guests0.length > 3 ? `<div style="display:flex;gap:8px;padding:0 0 6px;min-width:0"><div style="flex:3;min-width:0">${KD.segHTML('srv-gf', [['alle', `Alle ${cnt.alle}`], ['on', `Kjører ${cnt.on}`], ['off', `Stoppet ${cnt.off}`]], s.gf, 'setGf', { small: true })}</div><div style="flex:2;min-width:0">${KD.segHTML('srv-gs', [['id', 'ID'], ['cpu', 'CPU'], ['ram', 'RAM']], s.gs, 'setGs', { small: true })}</div></div>` : '';
      const store = M.store.map(x => ({ k: 'st-' + x.id, name: x.name, icon: 'hard_drive', more: x.id, sub: x.u != null && x.t != null ? `${fmtB(x.u)} av ${fmtB(x.t)} · ${fmtB(x.t - x.u)} ledig` : '', bar: x.bar, v: x.bar == null ? '' : `${Math.round(x.bar)} %`, vCol: x.bar >= 85 ? C.amber : null }));
      const bk = [];
      const P = N && N.P;
      if (P) {
        const bp = this.st(P + 'backup_progress');
        if (bp && !KD.BAD.has(bp.state)) { const v = num(bp); bk.push({ name: 'Sikkerhetskopi', icon: 'backup', sub: v != null ? (v > 0 && v < 100 ? `Pågår · ${nf(v)} %` : `Sist oppdatert kl. ${hm(bp.last_changed)}`) : String(bp.state), v: v != null && v > 0 && v < 100 ? `${nf(v)} %` : 'OK', col: C.green, bar: v > 0 && v < 100 ? v : null }); }
        const lt = this.st(P + 'last_task');
        if (lt && !KD.BAD.has(lt.state)) { const bad = /error|fail|feil/i.test(lt.state); bk.push({ name: 'Siste oppgave', icon: 'verified', sub: `${lt.state} · kl. ${hm(lt.last_changed)}`, v: bad ? 'Feil' : 'OK', vCol: bad ? C.red : C.green, col: bad ? C.red : C.green }); }
      }
      return `${this._heroHTML(V)}
  ${G ? this._gaugesHTML(G) : ''}
  ${nodeHTML ? `<section data-lay="noder" data-lay-navn="Noder" style="display:flex;flex-direction:column;gap:8px">${nodeHTML}</section>` : ''}
  ${this._sec('VM og LXC', `${running} av ${guests0.length} kjører`, guests0.length ? filt + (this._rows(gRows) || `<div style="padding:14px 4px;font-size:13px;color:#8e8d89">Ingen gjester i dette utvalget</div>`) : '', { key: 'gjester' })}
  ${this._sec('Lagring', `${store.length} ${store.length === 1 ? 'område' : 'områder'}`, this._rows(store), { key: 'lagring' })}
  ${this._sec('Sikkerhetskopi', 'Proxmox VE', this._rows(bk), { key: 'backup' })}`;
    }

    _tabUnraid(U, R) {
      const c = this.config, s = this.state, P = U.P, u = U.u;
      const nameS = String(this.at(P + 'cpu_usage', 'friendly_name', '') || '').replace(/\s*cpu.*$/i, '').trim() || title(u);
      const ver = (String(this.v(P + 'unraid_version')).match(/\d+(\.\d+)*/) || [])[0];
      const upS = this.st(P + 'up_since') || this.st(P + 'uptime');
      const Wid = c.unraid_effekt || [P + 'ups_power', P + 'ups_load_power', P + 'ups_current_power'].find(id => this.st(id));
      const W = Wid ? this.n(Wid) : null;
      const ramU = bytes(this.st(P + 'ram_used')), ramT = bytes(this.st(P + 'ram_total'));
      const arU = bytes(this.st(P + 'array_used')) ?? bytes(this.st(P + 'array_usage_used')), arT = bytes(this.st(P + 'array_total')) ?? bytes(this.st(P + 'array_size'));
      const V = {
        status: `${nameS} · Unraid${ver ? ' ' + ver : ''}`, ok: !R.arrOn ? C.red : R.dockers.every(d => d.on) ? C.green : C.amber,
        headline: R.parRun ? 'Paritetssjekk pågår' : R.arrOn ? 'Arrayet er startet' : 'Arrayet er stoppet',
        subline: R.parRun ? [R.parP != null ? `${nf(R.parP)} %` : '', 'paritetssjekk'].filter(Boolean).join(' · ') : [upS && !KD.BAD.has(upS.state) ? `Oppe i ${upLong(upSec(upS))}` : '', W != null ? `${nf(W)} W` : '', c.unraid_ip].filter(Boolean).join(' · '),
      };
      const G = [
        this._gauge('CPU', R.cpu, 100, ' %', c.unraid_cpu_navn || (R.temp != null ? `${nf(R.temp)}° CPU` : ''), C.blue),
        this._gauge('Minne', R.ram, 100, ' %', ramU != null && ramT != null ? `${fmtBs(ramU)[0]} av ${fmtBs(ramT).join(' ')}` : '', C.blue),
        this._gauge('Array', R.arr, 100, ' %', arU != null && arT != null ? `${fmtBs(arU)[0]} av ${fmtBs(arT).join(' ')}` : '', R.arr >= 90 ? C.red : C.amber),
      ];
      // array + paritet
      const lastP = this.v(P + 'last_parity_check'), lastD = lastP && !isNaN(new Date(lastP)) ? new Date(lastP) : null;
      const dur = this.st(P + 'parity_check_duration') || this.st(P + 'last_parity_check_duration');
      const durV = dur && !KD.BAD.has(dur.state) ? (num(dur) != null ? upLong(upSec(dur)) : String(dur.state)) : null;
      const nextP = this.v(P + 'next_parity_check'), nextD = nextP && !isNaN(new Date(nextP)) ? new Date(nextP) : null;
      const speed = this.st(P + 'parity_check_speed');
      const dt = d => d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
      const parK = 'ur-parity', parOn = U.parity && this.v(U.parity) === 'on';
      const arrHTML = `<div data-key="ur-array" style="display:flex;flex-direction:column;gap:12px;padding:14px;border-radius:24px;background:#1c1c1f;min-width:0">
        <div style="display:flex;align-items:center;gap:10px;min-width:0">
          <span style="width:36px;height:36px;border-radius:12px;flex:none;display:grid;place-items:center;background:${a(C.amber, 0.16)};color:${C.amber}"><span class="ms" style="font-size:19px;font-variation-settings:'FILL' 1">storage</span></span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:500">Array</span><span style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e([arU != null && arT != null ? `${fmtB(arU)} av ${fmtB(arT)}` : '', `${R.disks.filter(d => !d.par && !d.cache).length} datadisker`].filter(Boolean).join(' · '))}</span></div>
          ${this._chip(R.arrOn ? (R.arrState && !/start/i.test(R.arrState) && !KD.BAD.has(R.arrState) ? title(R.arrState) : 'Startet') : 'Stoppet', R.arrOn ? C.green : C.red)}
        </div>
        ${R.arr != null ? this._mbar('Bruk', R.arr, pctCol(R.arr, 85, 95, C.amber)) : ''}
        <div style="display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:18px;background:#232326">
          <div style="display:flex;align-items:center;gap:10px;min-width:0"><span class="ms" style="font-size:18px;color:${R.parErr ? C.red : R.parRun ? C.amber : C.green};font-variation-settings:'FILL' 1">fact_check</span>
            <span style="flex:1;min-width:0;font-size:14px;font-weight:500">Paritet</span>
            ${this._chip(R.parRun ? 'Pågår' : R.parErr ? `${nf(R.parErr)} feil` : 'Gyldig', R.parRun ? C.amber : R.parErr ? C.red : C.green)}
            ${U.parity && dom(U.parity) === 'switch' ? this._toggleHTML(U.parity, parK, parOn, 'paritetssjekk', true, C.amber, ['Start', 'Avbryt']) : ''}</div>
          ${R.parRun && R.parP != null ? this._mbar('Fremdr.', R.parP, C.amber) : ''}
          ${this._stats([['Sist kjørt', lastD ? dt(lastD) : null], ['Feil', R.parErr != null ? nf(R.parErr) : null, R.parErr ? C.red : null], ['Varighet', durV], ['Fart', speed && !KD.BAD.has(speed.state) ? `${speed.state} ${speed.attributes.unit_of_measurement || ''}`.trim() : null], ['Neste', nextD ? dt(nextD) : null]]).replace(/#232326/g, '#2a2a2d')}
        </div>
        ${this._confHTML(parK)}
      </div>`;
      if (U.parity && dom(U.parity) === 'switch') this._cm[U.parity].confirm = true; // både start og avbryt bekreftes
      const DT = +c.grense_disktemp || 50;
      const disks = R.disks.map(d => ({ k: 'disk-' + d.key, name: d.name, icon: d.cache ? 'memory' : d.par ? 'shield' : 'hard_drive', col: d.par ? '#8e8d89' : d.cache ? C.blue : C.amber, on: !d.spun, more: d.use || d.temp,
        chip: d.t != null ? [`${nf(d.t)}°`, tempCol(d.t, DT - 5, DT)] : d.spun ? ['Hviler', '#8e8d89'] : null,
        sub: d.par ? ['Paritet', d.tot != null ? fmtB(d.tot) : '', d.model].filter(Boolean).join(' · ') : [d.used != null && d.tot != null ? `${fmtB(d.used)} av ${fmtB(d.tot)}` : d.tot != null ? fmtB(d.tot) : '', d.fs, d.spun ? 'spunnet ned' : ''].filter(Boolean).join(' · '),
        bar: d.par ? null : d.bar, barCol: pctCol(d.bar, 85, 95, d.cache ? C.blue : C.amber), v: d.par ? '' : d.bar == null ? '' : `${Math.round(d.bar)} %`, vCol: d.bar >= 85 ? C.amber : null }));
      // Docker
      const qb = c.qbit || 'sensor.qbittorrent_';
      const qbSub = () => { const d = this.st(qb + 'download_speed'), up = this.st(qb + 'upload_speed'); if (!d || KD.BAD.has(d.state)) return ''; const rate = s => { const v = num(s); if (v == null) return '–'; const uu = String(s.attributes.unit_of_measurement || 'B/s').toLowerCase(); const f = uu.startsWith('gi') ? 1073741824 : uu.startsWith('mi') ? 1048576 : uu.startsWith('ki') ? 1024 : uu.startsWith('g') ? 1e9 : uu.startsWith('m') ? 1e6 : uu.startsWith('k') ? 1e3 : 1; const b = v * (uu.includes('bit') ? f / 8 : f); return b >= 1e6 ? `${nf1(b / 1e6)} MB/s` : `${nf(b / 1e3)} kB/s`; }; return `↓ ${rate(d)} · ↑ ${rate(up)}`; };
      const dOn = R.dockers.filter(d => d.on).length;
      const dl = R.dockers.filter(d => s.df === 'on' ? d.on : s.df === 'off' ? !d.on : true);
      const dRows = dl.map(d => ({ k: 'dk-' + d.key, name: d.name, icon: iconFor(d.key + ' ' + d.name, 'deployed_code'), on: d.on, more: d.id,
        chip: d.hasUpd ? ['Oppdatering', C.amber] : null,
        sub: d.gone ? 'Svarer ikke' : d.on ? ([/qbit|torrent/i.test(d.key) ? qbSub() : ''].filter(Boolean).join(' · ') || (d.cpuV == null && d.memV == null ? 'Kjører' : '')) : 'Stoppet', warn: !d.on,
        bars: d.on && (d.cpuV != null || d.memV != null) ? [d.cpuV != null ? ['CPU', d.cpuV, pctCol(d.cpuV, 70, 90), `${nf1(d.cpuV)} %`] : null, d.memV != null ? ['RAM', d.memV, pctCol(d.memV, 85, 95), `${nf1(d.memV)} %`] : null] : null,
        tog: d.id, togOn: d.on, togConfirm: true, togCol: C.green, togVerbs: ['Start', 'Stopp'],
        detail: (d.restart || d.hasUpd) ? () => this._btns([d.on ? this._btn(d.restart, 'dk-' + d.key, 'reboot', `containeren ${d.name}`, 'Omstart', 'restart_alt', C.blue, true) : '', d.hasUpd ? this._btn(d.upd, 'dk-' + d.key, 'upd', `${d.name} (${this.at(d.upd, 'latest_version', 'ny versjon')})`, 'Oppdater', 'download', C.amber, true) : '']) : null }));
      const dFilt = R.dockers.length > 4 ? `<div style="padding:0 0 6px">${KD.segHTML('srv-df', [['alle', `Alle ${R.dockers.length}`], ['on', `Kjører ${dOn}`], ['off', `Stoppet ${R.dockers.length - dOn}`]], s.df, 'setDf', { small: true })}</div>` : '';
      // VM-er
      const vmRows = U.vms.map(vm => { const on = this.v(vm.id) === 'on'; return { k: 'uvm-' + vm.id, name: vm.name, icon: iconFor(vm.name, 'computer'), tag: 'vm', chip: on ? ['Kjører', C.green] : ['Stoppet', C.red], on, more: vm.id, tog: vm.id, togOn: on, togConfirm: true, togCol: C.green, togVerbs: ['Start', 'Stopp'] }; });
      // system / UPS / handlinger
      const sys = this._stats([['CPU-temp', R.temp != null ? `${nf(R.temp)}°` : null, tempCol(R.temp, 60, 75)], ['Hovedkort', R.mobo != null ? `${nf(R.mobo)}°` : null, tempCol(R.mobo, 50, 65)], ['Oppetid', upS && !KD.BAD.has(upS.state) ? upLong(upSec(upS)) : null], ['Flash', this.n(P + 'flash_usage') != null ? `${nf(this.n(P + 'flash_usage'))} %` : null], ['Logg', this.n(P + 'log_usage') != null ? `${nf(this.n(P + 'log_usage'))} %` : null], ['Effekt', W != null ? `${nf(W)} W` : null]]);
      const ups = (R.upsB != null || R.upsStatus) ? `<div style="display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:24px;background:#1c1c1f">
          <div style="display:flex;align-items:center;gap:10px"><span class="ms" style="font-size:20px;color:${C.green};font-variation-settings:'FILL' 1">battery_charging_full</span><span style="flex:1;font-size:14px;font-weight:500">UPS</span>${this._chip(R.upsStatus && !KD.BAD.has(R.upsStatus) ? R.upsStatus : 'Tilkoblet', /batt/i.test(R.upsStatus) ? C.red : C.green)}</div>
          ${this._mbar('Batteri', R.upsB, R.upsB != null && R.upsB < 30 ? C.red : C.green)}${R.upsLoad != null ? this._mbar('Last', R.upsLoad, pctCol(R.upsLoad, 70, 90)) : ''}
          ${this._stats([['Kjøretid', R.upsRt != null ? `${nf(R.upsRt)} min` : null], ['Effekt', W != null ? `${nf(W)} W` : null]])}</div>` : '';
      const acts = [];
      if (U.mover) { const on = this.v(U.mover) === 'on'; acts.push(dom(U.mover) === 'button' ? { name: 'Mover', icon: 'move_down', sub: 'Flytt fra cache til array', col: C.blue, act: U.mover, actIcon: 'play_arrow', actCol: C.blue, actVerb: 'Start', actConfirm: true } : { name: 'Mover', icon: 'move_down', sub: on ? 'Flytter fra cache til array' : 'Venter', col: C.blue, on, tog: U.mover, togOn: on, togConfirm: true }); }
      if (this.st(c.qbit_sparefart)) { const on = this.v(c.qbit_sparefart) === 'on'; acts.push({ name: 'Sparefart', icon: 'speed', sub: on ? 'qBittorrent · alternativ hastighet på' : 'qBittorrent · full hastighet', col: C.amber, on, tog: c.qbit_sparefart, togOn: on }); }
      if (U.check) acts.push({ name: 'Se etter oppdateringer', icon: 'update', sub: 'Docker-containere', col: C.blue, act: U.check, actIcon: 'refresh', actCol: C.blue, actVerb: 'Sjekk' });
      return `${this._heroHTML(V)}
  ${this._gaugesHTML(G)}
  <section data-lay="array" data-lay-navn="Array og paritet" style="display:flex;flex-direction:column;gap:8px">${arrHTML}</section>
  ${this._sec('Disker', `${R.disks.length} ${R.disks.length === 1 ? 'disk' : 'disker'}`, this._rows(disks), { key: 'disker' })}
  ${this._sec('Docker', `${dOn} av ${R.dockers.length} kjører`, R.dockers.length ? dFilt + this._rows(dRows) : '', { key: 'docker' })}
  ${this._sec('Virtuelle maskiner', `${U.vms.filter(v => this.v(v.id) === 'on').length} kjører`, this._rows(vmRows), { key: 'vm' })}
  ${this._sec('System', 'temperatur og oppetid', sys, { key: 'system', gap: 0 })}
  ${ups ? `<section data-lay="ups" data-lay-navn="UPS">${ups}</section>` : ''}
  ${this._sec('Handlinger', 'unraid-integrasjon', this._rows(acts), { key: 'handl' })}`;
    }

    _tabUnifi(UF, M) {
      const c = this.config, gw = UF.gw, g = UF.gwSlug, devs = M.devs;
      const down = devs.filter(d => !d.on).length;
      const lat = { cloudflare: this.n(`sensor.${g}_cloudflare_wan_latency`), google: this.n(`sensor.${g}_google_wan_latency`) };
      const sd = this.n(c.speedtest_ned), su = this.n(c.speedtest_opp);
      const apCl = devs.filter(d => d.type === 2).reduce((s, d) => s + (d.kl || 0), 0);
      const V = {
        status: `UniFi Network${gw ? ' · ' + gw.name : ''}`, ok: !devs.length ? C.amber : down ? C.red : C.green,
        headline: !devs.length ? 'Fant ingen UniFi-enheter' : down ? `${down} ${down === 1 ? 'enhet svarer' : 'enheter svarer'} ikke` : M.ping != null && M.ping > 100 ? 'Høy latens på WAN' : 'Nettet er friskt',
        subline: [M.gwD && M.gwD.upS != null ? `WAN oppe ${upLong(M.gwD.upS)}` : '', [c.isp, sd != null && su != null ? `${nf(sd)}/${nf(su)}` : ''].filter(Boolean).join(' ')].filter(Boolean).join(' · '),
      };
      const G = [
        this._gauge('Klienter', M.clients, Number(c.klienter_maks) || 80, '', apCl ? `${nf(apCl)} trådløst` : 'tilkoblet', C.blue),
        this._gauge('Ping', M.ping, 40, ' ms', M.pk === 'cloudflare' ? '1.1.1.1' : M.pk === 'google' ? '8.8.8.8' : 'Speedtest', M.ping > 100 ? C.red : C.green),
        this._gauge('Gateway', M.gwD ? M.gwD.cpuV : null, 100, ' %', 'CPU', C.blue),
      ];
      const wan = this._stats([['Cloudflare', lat.cloudflare != null ? `${nf(lat.cloudflare)} ms` : null], ['Google', lat.google != null ? `${nf(lat.google)} ms` : null], ['Speedtest-ping', this.n(c.speedtest_ping) != null ? `${nf(this.n(c.speedtest_ping))} ms` : null],
        ['Ned', sd != null ? `${nf(sd)} Mbit/s` : null], ['Opp', su != null ? `${nf(su)} Mbit/s` : null], ['WAN-IP', this.ok(`sensor.${g}_wan_ip`) ? this.v(`sensor.${g}_wan_ip`) : null]]);
      const TYP = ['Gateway', 'Switch', 'Aksesspunkt'];
      const dRows = devs.map(d => {
        const k = 'uf-' + d.slug, what = d.name;
        return { k, name: d.name, icon: ['router', 'lan', 'wifi'][d.type], on: d.on, col: C.green, more: d.tracker,
          chip: !d.on ? ['Frakoblet', C.red] : d.fwNew ? ['Oppdatering', C.amber] : null,
          sub: !d.on ? 'Svarer ikke' : [TYP[d.type], d.kl != null ? `${nf(d.kl)} klienter` : '', d.upS != null ? `oppe ${upShort(d.upS)}` : ''].filter(Boolean).join(' · '),
          bars: d.on ? [['CPU', d.cpuV, pctCol(d.cpuV, 70, 90, C.green)], d.memV != null ? ['RAM', d.memV, pctCol(d.memV, 85, 95, C.green)] : null] : null,
          detail: () => {
            const ports = d.ports.slice(0, Math.max(Number(c.poe_maks) || 8, 24)).map(p => {
              const on = this.v(p) === 'on', n = (p.match(/_port_(\d+)/) || [])[1], w = this.n(`sensor.${obj(p).replace(/_poe$/, '')}_poe_power`);
              this._A(p, k, on ? 'Slå av PoE' : 'Slå på PoE', `på port ${n} (${this.fname(p).replace(/\s*poe\s*$/i, '')})`, on, on ? C.red : C.green);
              return `<button data-on-click="ask" data-arg="${e(p)}" data-hold="moreInfo" style="min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:8px 10px;border-radius:14px;background:${on ? a(C.amber, 0.14) : '#232326'};box-shadow:${this.state.conf === p ? `inset 0 0 0 1px ${C.red}` : 'none'};text-align:left">
                <span style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:${on ? C.amber : '#8e8d89'}"><span class="ms" style="font-size:14px;font-variation-settings:'FILL' ${on ? 1 : 0}">bolt</span>${e(n)}</span>
                <span style="font-size:11px;color:#8e8d89;font-variant-numeric:tabular-nums;white-space:nowrap">${on ? (w != null ? `${nf1(w)} W` : 'PoE på') : 'av'}</span></button>`;
            }).join('');
            return `${this._stats([['Type', TYP[d.type]], ['Klienter', d.kl != null ? nf(d.kl) : null], ['Oppetid', d.upS != null ? upLong(d.upS) : null], ['CPU', d.cpuV != null ? `${nf(d.cpuV)} %` : null], ['Minne', d.memV != null ? `${nf(d.memV)} %` : null], ['Temp', d.tempV != null ? `${nf(d.tempV)}°` : null, tempCol(d.tempV, 70, 85)], ['Fastvare', d.fwV || null], ['Ny versjon', d.fwNew || null, C.amber]])}
              ${ports ? `<div style="display:flex;flex-direction:column;gap:6px"><span style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8e8d89">PoE-porter · trykk for å slå av/på</span><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px">${ports}</div></div>` : ''}
              ${this._btns([this._btn(d.restart, k, 'restart', what, 'Omstart', 'restart_alt', C.blue, true), d.fwNew ? this._btn(d.fw, k, 'fw', `fastvare ${d.fwNew} på ${what}`, 'Installer fastvare', 'download', C.amber, true) : ''])}`;
          } };
      });
      const wl = this._wlans().map(id => { const on = this.v(id) === 'on', cl = this.n(`sensor.${obj(id)}_clients`); return { k: 'wl-' + id, name: this.fname(id), icon: on ? 'wifi' : 'wifi_off', col: C.blue, on, more: id, sub: on ? (cl != null ? `${nf(cl)} klienter` : 'Sender') : 'Av', tog: id, togOn: on, togConfirm: true, togCol: C.green }; });
      const upd = M.upds.filter(u => devs.some(d => d.fw === u.id) || (this._reg()[u.id] || {}).platform === 'unifi');
      return `${this._heroHTML(V)}
  ${this._gaugesHTML(G)}
  ${this._speedHTML()}
  ${this._sec('WAN', gw ? gw.name : 'ruter', wan, { key: 'wan', gap: 0 })}
  ${this._sec('Enheter', `${devs.length - down} av ${devs.length} tilkoblet`, this._rows(dRows), { key: 'enheter' })}
  ${this._sec('Wi-Fi-nett', `${wl.filter(w => w.on).length} aktive`, this._rows(wl), { key: 'wifi' })}
  ${this._sec('Fastvare', `${upd.length} klare`, this._rows(this._updRows(upd)), { key: 'fastvare' })}`;
    }
    /** Klienter med rx/tx-sensorer fra UniFi (valgfrie, av som standard i HA) */
    _topClients() {
      const R = this._reg(), per = {};
      for (const id of this._unifiReg()) {
        if (dom(id) !== 'sensor') continue;
        const m = obj(id).match(/^(.+)_(rx|tx)$/); if (!m) continue;
        const k = R[id].device_id || m[1];
        const p = (per[k] = per[k] || { key: m[1], sum: 0, unit: this.unit(id) });
        p.sum += this.n(id, 0); p.id = p.id || id;
      }
      return Object.values(per).filter(p => p.sum > 0).sort((x, y) => y.sum - x.sum).slice(0, 4).map(p => {
        const dev = this._devs()[(R[p.id] || {}).device_id]; const name = (dev && (dev.name_by_user || dev.name)) || title(p.key);
        return { name, icon: iconFor(name, /iphone|phone|pixel|galaxy/i.test(name) ? 'smartphone' : /mac|laptop|book/i.test(name) ? 'laptop_mac' : /tv/i.test(name) ? 'tv' : 'devices'), sub: 'Klient', v: `${nf1(p.sum)} ${p.unit}` };
      });
    }

    _tabNett(UF) {
      const c = this.config, R = this._reg(), S = this._hass.states;
      const reg = this._unifiReg();
      const infra = new Set(UF.list.map(d => d.tracker));
      const infraDev = new Set(UF.list.map(d => (R[d.tracker] || {}).device_id).filter(Boolean));
      const isUnifiTr = id => id && S[id] && !infra.has(id) && ((R[id] && R[id].platform === 'unifi') || ['essid', 'ap_mac', 'is_wired'].some(k => k in (S[id].attributes || {})));
      let phones = [];
      for (const pid of this._ids().filter(id => id.startsWith('person.'))) for (const t of (this.at(pid, 'device_trackers', []) || [])) if (isUnifiTr(t) && !phones.includes(t)) phones.push(t);
      if (!phones.length) phones = reg.filter(id => dom(id) === 'device_tracker' && !infra.has(id) && /iphone|phone|pixel|galaxy|android/i.test(this.fname(id)));
      const clientTr = reg.filter(id => dom(id) === 'device_tracker' && !infra.has(id));
      const macName = {};
      for (const d of UF.list) { const mac = this.at(d.tracker, 'mac', ''); if (mac) macName[String(mac).toLowerCase()] = d.name; }
      const pres = phones.map(id => {
        const on = this.v(id) === 'home', at = (this.st(id) || {}).attributes || {};
        const ap = at.ap_mac ? macName[String(at.ap_mac).toLowerCase()] : '';
        return { k: 'pr-' + id, name: this.fname(id), icon: 'smartphone', on, col: C.green, more: id, chip: on ? ['Hjemme', C.green] : ['Borte', '#8e8d89'], sub: on ? ([ap, at.essid].filter(Boolean).join(' · ') || (at.is_wired ? 'Kablet' : 'Tilkoblet')) : `Sist sett kl. ${hm((this.st(id) || {}).last_changed)}` };
      });
      const wl = new Set(this._wlans());
      const sw = reg.filter(id => dom(id) === 'switch');
      const pn = id => +((id.match(/_port_(\d+)/) || [])[1] || 0), poe = sw.filter(id => /port_\d+_poe$|_poe$/.test(obj(id))).sort((x, y) => x.slice(0, x.indexOf('_port_')).localeCompare(y.slice(0, y.indexOf('_port_'))) || pn(x) - pn(y));
      const blocks = Array.isArray(c.blokker) ? c.blokker.filter(id => this.st(id)) : sw.filter(id => !poe.includes(id) && !wl.has(id) && !infraDev.has((R[id] || {}).device_id) && !/wlan|wifi|ssid|dpi|restrict|forward|traffic|rule|outlet|led|vpn|port_\d/.test(obj(id)));
      const last = reg.reduce((m, id) => Math.max(m, new Date((S[id] || {}).last_updated || 0).getTime()), 0);
      const poeDev = (() => { const id = poe[0]; const dev = id && this._devs()[(R[id] || {}).device_id]; return (dev && (dev.name_by_user || dev.name)) || 'UniFi'; })();
      const poeW = id => { const p = this.n(`sensor.${obj(id).replace(/_poe$/, '')}_poe_power`); return p != null ? ` · ${nf1(p)} W` : ''; };
      const alive = reg.some(id => this.ok(id));
      const home = clientTr.filter(id => this.v(id) === 'home').length;
      const V = {
        status: 'UniFi Network · integrasjon i Home Assistant', ok: alive ? C.green : C.amber,
        headline: !reg.length ? 'Fant ikke UniFi-integrasjonen' : `${nf(home)} ${home === 1 ? 'klient' : 'klienter'} tilkoblet`,
        subline: reg.length ? `Oppdatert for ${agoTxt(last)} · ${reg.length} entiteter` : 'Krever UniFi Network-integrasjonen',
      };
      const G = [
        this._gauge('Sporere', home, Math.max(1, clientTr.length), '', 'hjemme', C.green),
        this._gauge('Blokkert', blocks.filter(id => this.v(id) === 'off').length, Math.max(1, blocks.length), '', 'klienter', C.red),
        this._gauge('PoE', poe.filter(id => this.v(id) === 'on').length, Math.max(1, poe.length), '', 'porter på', C.amber),
      ];
      const top = this._topClients();
      return `${this._heroHTML(V)}
  ${this._gaugesHTML(G)}
  ${this._sec('Tilstedeværelse', 'device_tracker', this._rows(pres), { key: 'pres' })}
  ${this._sec('Blokker klient', `${blocks.filter(id => this.v(id) === 'off').length} blokkert`, this._rows(blocks.map(id => { const bl = this.v(id) === 'off'; return { k: 'bl-' + id, name: this.fname(id), icon: 'block', more: id, sub: bl ? 'Blokkert i UniFi' : 'Tillatt', on: bl, col: C.red, tog: id, togOn: bl, togCol: C.red, togConfirm: false }; })), { key: 'blokk' })}
  ${this._sec('PoE-porter', poeDev, this._rows(poe.slice(0, Number(c.poe_maks) || 8).map(id => { const on = this.v(id) === 'on'; return { k: 'poe-' + id, name: this.fname(id).replace(/\s*poe\s*$/i, ''), icon: 'power', more: id, sub: on ? `PoE på${poeW(id)}` : 'PoE av', on, col: C.amber, tog: id, togOn: on, togConfirm: true, togCol: C.amber }; })), { key: 'poe' })}
  ${this._sec('Topp klienter', 'nå', this._rows(top), { key: 'topp' })}`;
    }

    body() {
      const s = this.state, c = this.config;
      this._cm = {}; this._mi = {};
      const UF = this._unifi(), U = this._unraid(), nodes = this._pveNodes(), pg = this._pveGuests();
      const has = { pve: nodes.length > 0 || pg.length > 0, unraid: !!U, unifi: UF.list.length > 0 || !!UF.gwSlug, ha: this._unifiReg().length > 0 || UF.list.length > 0 };
      has.oversikt = (has.pve + has.unraid + has.unifi) >= 1;
      const all = [['oversikt', 'Oversikt', 'monitor_heart'], ['pve', 'Proxmox', 'deployed_code'], ['unraid', 'Unraid', 'storage'], ['unifi', 'UniFi', 'router'], ['ha', 'Nettverk', 'lan']];
      const want = Array.isArray(c.faner) && c.faner.length ? c.faner.map(x => x === 'nett' ? 'ha' : x) : null;
      let tabs = want ? all.filter(t => want.includes(t[0])) : all.filter(t => has[t[0]]);
      if (!tabs.length) tabs = [all[1]];
      const tabK = tabs.some(t => t[0] === s.tab) ? s.tab : tabs[0][0];
      // modeller (bare det som trengs)
      const needAll = tabK === 'oversikt';
      const M = {};
      if (has.pve && (needAll || tabK === 'pve')) M.pve = { nodes: nodes.map(n => this._nV(n)), guests: pg.map(g => this._gV(g)), store: this._pveStorage().map(x => ({ ...x, bar: this.n(x.id), u: bytes(this.st(x.used)), t: bytes(this.st(x.total)) })) };
      if (U && (needAll || tabK === 'unraid')) M.ur = this._urV(U);
      if ((UF.list.length || UF.gwSlug) && (needAll || tabK === 'unifi')) {
        const devs = this._ufV(UF), g = UF.gwSlug;
        const lat = { cloudflare: this.n(`sensor.${g}_cloudflare_wan_latency`), google: this.n(`sensor.${g}_google_wan_latency`) };
        const pk = (c.ping_mal === 'google' ? ['google', 'cloudflare'] : ['cloudflare', 'google']).find(k => lat[k] != null);
        const gwD = devs.find(d => UF.gw && d.slug === UF.gw.slug);
        const gwCl = gwD && gwD.kl != null ? gwD.kl : this.n(`sensor.${g}_clients`);
        M.uf = { devs, gwD, pk, ping: pk ? lat[pk] : this.n(c.speedtest_ping), clients: gwCl != null ? gwCl : devs.reduce((x, d) => x + (d.kl || 0), 0) };
      }
      M.upds = this._updates(U, UF);
      if (M.uf) M.uf.upds = M.upds;
      let content;
      if (tabK === 'oversikt') content = this._tabOversikt(M, this._health(M));
      else if (tabK === 'unraid' && U) content = this._tabUnraid(U, M.ur);
      else if (tabK === 'unifi') content = this._tabUnifi(UF, M.uf || { devs: [], clients: null, ping: null, upds: [] }) ;
      else if (tabK === 'ha') content = this._tabNett(UF);
      else content = this._tabPve(M.pve || { nodes: [], guests: [], store: [] });
      const tabBar = tabs.length > 1 ? `<div data-lay-skip="1" data-key="srv-tabs" style="min-width:0">${KD.segHTML('srv-tab', tabs.map(t => [t[0], t[1], tabs.length > 4 ? null : t[2]]), tabK, 'goTab', { pink: true, h: 40 })}</div>` : '';
      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:20px">
  <header style="display:flex;align-items:center;gap:12px">
    <span style="width:40px;height:40px;border-radius:20px;background:#e9e8e4;color:#141416;display:grid;place-items:center;flex:none"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">dns</span></span>
    <div style="flex:1;font-size:26px;font-weight:500;letter-spacing:-0.02em">Server</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>
  ${tabBar}
  ${content}
</div>`;
    }
  }

  KD.define('kd-server-card', KDServerCard, 'KD Server', 'Proxmox, Unraid, UniFi og nettverk – oversikt, helsevarsler og styring');
  KD.sheet('server', 'kd-server-card');
})();
} catch (e) { console.error('ki-hjem-design: 60-kd-server-card.js', e); }

/* ===== 61-kd-innstillinger-card.js ===== */
try {
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
      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:20px">
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
} catch (e) { console.error('ki-hjem-design: 61-kd-innstillinger-card.js', e); }

/* ===== 62-kd-kalender-card.js ===== */
try {
/*
 * kd-kalender-card – pikselkopi av Claude Design «Kalender» (Kalender · Hytta · Framover · Bursdager · Posten).
 *
 *   type: custom:kd-kalender-card        # virker uten mer
 *   kalendere:                           # standard: disse + alle andre calendar.* som finnes (auto: true)
 *     - { entity: calendar.sebastian_kristo_no, navn: Sebastian }
 *     - { entity: calendar.oslomet_timeplan, navn: OsloMet }
 *     - { entity: calendar.helligdager_i_norge, navn: Helligdager }
 *     - { entity: calendar.birthdays, navn: Bursdager }
 *     - { entity: calendar.open_home_foundation_devs, navn: HassOs }
 *   ekskluder: [calendar.posten_calendar]
 *   bare_i_maned: [calendar.oslomet_timeplan]   # timeplanen vises i månedsvisningen, ikke i «Kommende»
 *   dager: 14                            # hvor langt fram «Kommende» ser
 *   bursdager: calendar.birthdays
 *   post: sensor.nar_kommer_posten_posten_sensor_next    post_kalender: calendar.posten_calendar   postnummer: ''
 *   serier: sensor.sonarr_sonarr_upcoming_media   filmer: sensor.radarr_radarr_upcoming_media
 *   plex_serier: sensor.d_day_darling_plex_recently_added_show   plex_filmer: sensor.d_day_darling_plex_recently_added_movie
 *   hytter: []                           # sensor.<sted>_oversikt fra KI Hyttebesøk (tom = finnes selv)
 *
 * Hvilke kalendere som vises kan hver bruker velge i «Tilpass oppsett» (lagres i HA-brukerdata 'kd_kalender' = { kalendere: [id…] }).
 * Kildene (serier, filmer, plex_serier, plex_filmer, post, post_kalender, bursdager) kan også velges der
 * ('kd_kalender'.kilder = { serier: 'calendar.sonarr', post: '' (= ingen) … }); config er reserve.
 * Serier/filmer kan være en upcoming_media-sensor (attributtet data) eller en kalender (f.eks. Sonarr/Radarr-kalenderen).
 * Farger: kalendere som heter som en person (Rune, Cybele, Sebastian) eller «Familie» får designets farger.
 * Hytta leser KI Hyttebesøk (sensor.<sted>_oversikt: her_naa, dager, opphold, kommende, per_maaned …).
 * Pakker finnes i entitetsregisteret (Norwegian Parcel Tracker).
 */
(() => {
  const KD = window.KD; if (!KD) return;
  const C = { green: 'oklch(0.8 0.12 150)', yellow: 'oklch(0.86 0.12 95)', purple: 'oklch(0.72 0.12 295)', blue: 'oklch(0.8 0.12 250)', red: 'oklch(0.72 0.15 25)', pink: 'oklch(0.78 0.13 350)', amber: 'oklch(0.82 0.12 75)' };
  const a = (c, o) => c.replace(')', ` / ${o})`);
  const PINK = 'linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20))';
  const e = KD.e, S = KD.S;
  const DAY = 864e5;
  const WHO = [[/rune/i, C.blue], [/cybele/i, C.pink], [/sebastian/i, C.amber], [/famil/i, C.green], [/oslomet|skole|timeplan/i, C.green], [/bursdag|birthday/i, C.pink], [/hellig/i, C.red]];
  const PALETTE = [C.blue, C.yellow, C.purple, C.pink, C.amber, C.green, C.red];
  const HPC = [[/oslo/i, 'oklch(0.8 0.13 160)', 'linear-gradient(160deg, #1f3a44, #15252b)'], [/str[oøö]mstad/i, 'oklch(0.86 0.12 90)', 'linear-gradient(160deg, #2c5a45, #193428)'], [/toten/i, 'oklch(0.78 0.1 65)', 'linear-gradient(160deg, #4a3a28, #2a2118)']];
  const HP_FALL = [['oklch(0.76 0.11 245)', 'linear-gradient(160deg, #26304a, #181d2f)'], ['oklch(0.78 0.13 350)', 'linear-gradient(160deg, #4a2838, #2a1820)'], ['oklch(0.72 0.12 295)', 'linear-gradient(160deg, #35284a, #1f182f)']];
  const PERSC = [[/cybele/i, 'oklch(0.8 0.13 160)'], [/rune/i, 'oklch(0.76 0.11 245)'], [/sebastian/i, 'oklch(0.86 0.12 90)']];
  const PERS_FALL = ['oklch(0.78 0.13 350)', 'oklch(0.82 0.12 75)', 'oklch(0.72 0.12 295)', 'oklch(0.8 0.12 150)'];
  const MND = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
  const ini = t => String(t || '').split(/[\s:.-]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const pad = n => String(n).padStart(2, '0');
  const isoL = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const day0 = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const parseD = v => { if (!v) return null; const d = new Date(String(v).length === 10 ? v + 'T00:00' : v); return isNaN(d) ? null : d; };
  const dmon = d => `${d.getDate()}. ${MND[d.getMonth()]}`;
  const cap = s => String(s).replace(/^./, c => c.toUpperCase());
  const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const hash = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
  /* Kilder som kan velges i «Tilpass oppsett»: [nøkkel, navn, ikon, mønster, domener] */
  const SRC = [
    ['serier', 'Serier', 'live_tv', /sonarr/i, ['sensor', 'calendar'], 'Sonarr – upcoming-sensor eller kalender'],
    ['filmer', 'Filmer', 'movie', /radarr/i, ['sensor', 'calendar'], 'Radarr – upcoming-sensor eller kalender'],
    ['plex_serier', 'Plex · serier', 'smart_display', /plex/i, ['sensor'], 'Nylig lagt til (serier)'],
    ['plex_filmer', 'Plex · filmer', 'smart_display', /plex/i, ['sensor'], 'Nylig lagt til (filmer)'],
    ['post', 'Posten · neste levering', 'mail', /posten|post_?nord|nar_kommer/i, ['sensor'], 'Sensor med neste leveringsdato'],
    ['post_kalender', 'Posten · kalender', 'local_post_office', /posten|post/i, ['calendar'], 'Kalender med leveringsdager'],
    ['bursdager', 'Bursdager', 'cake', /birthday|bursdag|f[oø]dsel/i, ['calendar'], 'Kalender med bursdager'],
  ];
  const bdName = s => String(s || '').replace(/\(\s*\d{4}\s*\)/g, '').replace(/[_-]+/g, ' ').replace(/\b(bursdag|birthday|fodselsdag|fødselsdag)\b/gi, '').replace(/[’']\s*s\b/gi, '').replace(/\s{2,}/g, ' ').replace(/^[\s.,·-]+|[\s.,·-]+$/g, '').replace(/^./, c => c.toUpperCase());

  class KDKalenderCard extends KD.KDSheet {
    static head = ['calendar_month', 'Kalender', 'Familie og skole'];
    static defaults = {
      kalendere: [{ entity: 'calendar.sebastian_kristo_no', navn: 'Sebastian' }, { entity: 'calendar.oslomet_timeplan', navn: 'OsloMet' }, { entity: 'calendar.helligdager_i_norge', navn: 'Helligdager' }, { entity: 'calendar.birthdays', navn: 'Bursdager' }, { entity: 'calendar.open_home_foundation_devs', navn: 'HassOs' }],
      auto: true, ekskluder: ['calendar.posten_calendar'], bare_i_maned: ['calendar.oslomet_timeplan'], dager: 14,
      bursdager: 'calendar.birthdays',
      post: 'sensor.nar_kommer_posten_posten_sensor_next', post_kalender: 'calendar.posten_calendar', postnummer: '',
      serier: 'sensor.sonarr_sonarr_upcoming_media', filmer: 'sensor.radarr_radarr_upcoming_media',
      plex_serier: 'sensor.d_day_darling_plex_recently_added_show', plex_filmer: 'sensor.d_day_darling_plex_recently_added_movie',
      hytter: null,
    };
    constructor() {
      super();
      const t = new Date();
      this.state = { tab: 'cal', view: 'list', month: [t.getFullYear(), t.getMonth()], filter: 'alle', sel: `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`, hut: 0, hsub: 'cal', hplace: 'alle', search: false, q: '' };
    }

    /* ================= data ================= */
    /* Alle calendar.* med navn og farge. Standardutvalget (config kalendere + auto, minus ekskluder/hytta) får fargene først
       (samme som før), resten får farge etterpå, så fargene ikke hopper når brukeren slår kalendere av/på. */
    /** Valgte kilder: brukerens valg ('kd_kalender'.kilder; '' = ingen) → config */
    _src() {
      const u = (KD.ud(this, 'kd_kalender') || {}).kilder || {}, c = this.config, out = {};
      for (const [k] of SRC) out[k] = Object.prototype.hasOwnProperty.call(u, k) ? (u[k] || null) : (c[k] || null);
      return out;
    }
    _allCals() {
      const c = this.config, src = this._src(), ex = new Set([...(c.ekskluder || []), ...['serier', 'filmer', 'post_kalender'].map(k => src[k]).filter(id => id && id.startsWith('calendar.'))]), hut = this._hutCalIds(), out = [];
      let fi = 0;
      const col = (navn, id) => { const w = WHO.find(x => x[0].test(navn + ' ' + id)); return w ? w[1] : PALETTE[fi++ % PALETTE.length]; };
      const cfg = new Map();
      for (const k of (Array.isArray(c.kalendere) ? c.kalendere : [])) { const id = typeof k === 'string' ? k : k && k.entity; if (id && !cfg.has(id)) cfg.set(id, typeof k === 'string' ? {} : k); }
      for (const [id, k] of cfg) { if (ex.has(id) || !this.st(id)) continue; const navn = k.navn || this.fname(id); out.push({ id, navn, col: k.farge || col(navn, id), std: true }); }
      const rest = this.find(/^calendar\./).filter(id => !out.some(x => x.id === id));
      for (const id of rest) { if (ex.has(id) || hut.includes(id) || c.auto === false) continue; const navn = this.fname(id); out.push({ id, navn, col: col(navn, id), std: true }); }
      for (const id of [...cfg.keys(), ...rest]) { if (out.some(x => x.id === id) || !this.st(id)) continue; const k = cfg.get(id) || {}, navn = k.navn || this.fname(id); out.push({ id, navn, col: k.farge || col(navn, id), std: false }); }
      return out;
    }
    /** Brukerens valg (KD.ud 'kd_kalender' → { kalendere: [id…] }), ellers null (= config/auto). */
    _userCals() { const u = KD.ud(this, 'kd_kalender') || {}; return Array.isArray(u.kalendere) ? u.kalendere : null; }
    _cals() {
      const all = this._allCals(), u = this._userCals();
      if (!u) return all.filter(x => x.std);
      const set = new Set(u); return all.filter(x => set.has(x.id));
    }
    _events(cals, days, from, key) {
      if (!cals.length) return [];
      const ids = cals.map(k => k.id);
      const raw = this.cached(`kd-kal-${key}-${ids.join(',')}-${isoL(from)}-${days}`, 5 * 60e3, () => this.calendar(ids, days, from), null) || [];
      return raw.map(ev => { const k = cals.find(x => x.id === ev.cal) || {}; return { ...ev, navn: k.navn || '', col: k.col || C.blue }; });
    }
    _time(ev) { if (ev.allDay) return 'Hele dagen'; const s = hm(ev.start); return ev.end && ev.end - ev.start > 60e3 ? `${s}–${hm(ev.end)}` : s; }

    _hutSensors() {
      const c = this.config;
      if (Array.isArray(c.hytter) && c.hytter.length) return c.hytter.filter(id => this.st(id));
      const S0 = this.all(); return Object.keys(S0).filter(id => id.startsWith('sensor.') && S0[id].attributes && S0[id].attributes.integrasjon === 'ki_hyttebesok' && S0[id].attributes.type === 'oversikt');
    }
    _hutCalIds() { return this._hutSensors().map(id => this.at(id, 'kalender', '')).filter(Boolean); }
    _places() {
      let fi = 0;
      const ps = this._hutSensors().map(id => {
        const at = this.st(id).attributes, name = at.sted || this.fname(id).replace(/\s*oversikt\s*$/i, '');
        const hp = HPC.find(x => x[0].test(name)); const fb = hp ? null : HP_FALL[fi++ % HP_FALL.length];
        return { id, name, rolle: at.rolle || 'hytte', col: hp ? hp[1] : fb[0], bg: hp ? hp[2] : fb[1], at };
      });
      return ps.sort((x, y) => (x.rolle === 'hjem' ? 0 : 1) - (y.rolle === 'hjem' ? 0 : 1) || x.name.localeCompare(y.name, 'nb'));
    }
    _pcol(name) { const p = PERSC.find(x => x[0].test(name)); if (p) return p[1]; this._pc = this._pc || {}; if (!this._pc[name]) this._pc[name] = PERS_FALL[Object.keys(this._pc).length % PERS_FALL.length]; return this._pc[name]; }

    _upcoming() {
      const c = this._src();
      const read = (id, type) => {
        const st = this.st(id); if (!st) return [];
        if (id.startsWith('calendar.')) { // Sonarr/Radarr-kalender: «Serie - 1x03 - Episode» / «Film (Kino)»
          return this._events([{ id, navn: type, col: C.blue }], 60, day0(new Date()), 'src-' + type).map(ev => {
            const m = String(ev.summary || '').match(/^(.+?)\s+-\s+(S?\d+[xE]\d+)\s+-\s+(.+)$/i), kino = /\(?(kino|cinema|theatrical)\)?/i.test(ev.summary || '');
            return { type, src: id, title: (m ? m[1] : String(ev.summary || '').replace(/\s*\((kino|cinema|theatrical|physical|digital)[^)]*\)\s*$/i, '')).trim(), episode: m ? m[3] : '', number: m ? m[2].toUpperCase().replace(/^(\d+)X(\d+)$/, (x, a1, b1) => `S${pad(a1)}E${pad(b1)}`) : '', when: ev.start, studio: '', kino };
          }).filter(x => x.title);
        }
        let d = st.attributes.data; if (typeof d === 'string') { try { d = JSON.parse(d); } catch (x) { d = null; } }
        if (!Array.isArray(d)) return [];
        return d.filter(x => x && (x.airdate || x.aired) && x.title).map(x => ({ type, src: id, title: x.title, episode: x.episode && x.episode !== 'TBA' ? x.episode : '', number: x.number || '', when: new Date(x.airdate || x.aired), studio: x.studio || '', kino: !!x.flag }));
      };
      const key = x => { const r = String(x.title).toLowerCase().replace(/\(\d{4}\)/g, '').replace(/[^a-z0-9æøå]+/g, ''); return x.type === 'serie' ? (x.number ? `s|${r}|${String(x.number).toUpperCase().replace(/[^SE0-9]/g, '')}` : '') : `f|${r}`; };
      const plex = new Set([...read(c.plex_serier, 'serie'), ...read(c.plex_filmer, 'film')].map(key).filter(Boolean));
      const t0 = day0(new Date());
      return [...read(c.serier, 'serie'), ...read(c.filmer, 'film')].filter(x => !isNaN(x.when) && x.when >= t0).map(x => ({ ...x, plex: plex.has(key(x)) })).sort((p, q) => p.when - q.when);
    }
    _bdays() {
      const id = this._src().bursdager; if (!id || !this.st(id)) return [];
      const t0 = day0(new Date());
      const raw = this.cached(`kd-kal-bd-${id}-${isoL(t0)}`, 30 * 60e3, () => this.calendar([id], 367), null) || [];
      const seen = new Set(), out = [];
      for (const ev of raw) {
        const d = day0(ev.start); if (d < t0) continue;
        const name = bdName(ev.summary); if (!name || seen.has(name)) continue; seen.add(name);
        const txt = `${ev.description || ''} ${ev.summary || ''}`;
        const full = txt.match(/(\d{4})-(\d{2})-(\d{2})/), bare = txt.match(/(?:f\.?|født|fodt|\()\s*(\d{4})/i);
        const by = full ? +full[1] : bare ? +bare[1] : null;
        out.push({ name, date: d, age: by ? d.getFullYear() - by : null, days: Math.round((d - t0) / DAY) });
      }
      return out.sort((p, q) => p.days - q.days);
    }
    _parcels() {
      const R = (this._hass && this._hass.entities) || {}, out = [];
      for (const id in R) {
        if (R[id].platform !== 'norwegian_parcel_tracker' || !/^sensor\..+_status$/.test(id)) continue;
        const st = this.st(id); if (!st) continue;
        const at = st.attributes || {}, t = String(st.state || '').toLowerCase();
        const levert = /levert|delivered|utlevert/.test(t), klar = !levert && /hentes|ready|klar|pickup|utleveringssted|hentested/.test(t);
        const transport = /transport|underveis|transit|sortert|på vei|out for/.test(t);
        if (levert) continue;
        out.push({ id, name: String(at.friendly_name || id.slice(7)).replace(/\s*status\s*$/i, '').trim() || 'Pakke', state: st.state, klar, step: klar ? 3 : transport ? 2 : 1,
          hentested: at.pickup_point || at.hentested || '', eta: at.estimated_delivery || at.forventet_levering || '', siste: at.latest_event || at.siste_hendelse || '' });
      }
      return out.sort((p, q) => q.step - p.step || p.name.localeCompare(q.name, 'nb'));
    }

    /* ================= hendelser ================= */
    _setCals(ids) { this.haptic('selection'); KD.udSave(this, 'kd_kalender', ids ? { ...KD.ud(this, 'kd_kalender'), kalendere: ids } : {}); }
    kalTog(ev, id) {
      const all = this._allCals(), on = new Set(this._cals().map(x => x.id));
      if (on.has(id)) on.delete(id); else on.add(id);
      this._setCals(all.map(x => x.id).filter(x => on.has(x)));
    }
    kalAlle(ev, k) { this._setCals(k === 'alle' ? this._allCals().map(x => x.id) : k === 'ingen' ? [] : null); }

    /* ================= «Tilpass oppsett»: hvilke kalendere som vises ================= */
    srcPick(ev, k) { this.setState(s => ({ srcOpen: s.srcOpen === k ? null : k, srcQ: '' })); this.haptic('selection'); }
    srcQ(ev) { this.setState({ srcQ: ev.target.value }); }
    srcSet(ev, arg) {
      const i = arg.indexOf('|'), k = arg.slice(0, i), id = arg.slice(i + 1), u = KD.ud(this, 'kd_kalender') || {}, kil = { ...(u.kilder || {}) };
      if (id === '*') delete kil[k]; else kil[k] = id;
      this.haptic('selection'); this.setState({ srcOpen: null });
      KD.udSave(this, 'kd_kalender', { ...u, kilder: kil });
    }
    _srcHTML() {
      const s = this.state, src = this._src(), u = (KD.ud(this, 'kd_kalender') || {}).kilder || {}, ids = Object.keys((this._hass && this._hass.states) || {});
      const name = id => String(this.fname(id) || id);
      const rows = SRC.map(([k, label, icon, re, doms, hint]) => {
        const cur = src[k], open = s.srcOpen === k, own = Object.prototype.hasOwnProperty.call(u, k), ok = cur && this.st(cur);
        const sub = !cur ? 'Ingen valgt' : `${ok ? '' : 'Finnes ikke · '}${cur}`;
        let list = '';
        if (open) {
          const q = String(s.srcQ || '').trim().toLowerCase();
          const pool = ids.filter(id => doms.includes(id.split('.')[0]));
          const hit = id => !q || id.toLowerCase().includes(q) || name(id).toLowerCase().includes(q);
          const match = pool.filter(id => re.test(id) || re.test(name(id)));
          let cand = q ? pool.filter(hit).sort((x, y) => (re.test(y) ? 1 : 0) - (re.test(x) ? 1 : 0)) : [...match, ...(doms.includes('calendar') ? pool.filter(id => id.startsWith('calendar.') && !match.includes(id)) : [])];
          cand = cand.slice(0, 40);
          const opt = (id, t1, t2, sel, ic) => `<button data-key="src-${e(k)}-${e(id)}" data-on-click="srcSet" data-arg="${e(k + '|' + id)}" style="min-height:44px;padding:6px 12px;border-radius:14px;display:flex;align-items:center;gap:10px;width:100%;min-width:0;text-align:left;background:${sel ? 'oklch(0.78 0.13 350 / 0.16)' : 'transparent'};box-shadow:${sel ? 'inset 0 0 0 1.5px oklch(0.78 0.13 350 / 0.6)' : 'none'}">
            <span class="ms" style="font-size:18px;flex:none;color:${sel ? 'oklch(0.82 0.1 350)' : '#8e8d89'}">${ic}</span>
            <span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(t1)}</span>${t2 ? `<span style="font-size:11px;color:#6d6c69;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(t2)}</span>` : ''}</span>
            ${sel ? `<span class="ms" style="font-size:18px;flex:none;color:oklch(0.82 0.1 350)">check</span>` : ''}</button>`;
          list = `<div style="display:flex;flex-direction:column;gap:2px;padding:4px 0 6px;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;height:40px;margin:2px 4px 4px;padding:0 14px;border-radius:20px;background:#1c1c1f;min-width:0"><span class="ms" style="font-size:18px;color:#8e8d89">search</span><input data-on-input="srcQ" value="${e(s.srcQ || '')}" placeholder="Søk i ${doms.map(d => d + '.*').join(' og ')}" style="flex:1;min-width:0;border:0;outline:none;background:transparent;color:#f2f1ee;font:inherit;font-size:13px"></div>
          ${this.config[k] ? opt('*', 'Standard', this.config[k], !own, 'restart_alt') : ''}
          ${opt('', 'Ingen', 'Skjul denne delen', own && !u[k], 'block')}
          ${cand.map(id => opt(id, name(id), id, own && u[k] === id, id.startsWith('calendar.') ? 'calendar_month' : 'sensors')).join('')}
          ${!cand.length ? `<div style="padding:10px 12px;font-size:12px;color:#6d6c69">Fant ingen${q ? ` som matcher «${e(q)}»` : ` – søk etter ${doms.join('/')}`}</div>` : ''}
        </div>`;
        }
        return `<div data-key="kd-src-${k}" style="display:flex;flex-direction:column;min-width:0;border-radius:18px;background:${open ? 'rgba(255,255,255,0.05)' : 'transparent'}">
        <button data-on-click="srcPick" data-arg="${k}" style="min-height:52px;padding:4px 10px 4px 12px;border-radius:16px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;width:100%;text-align:left">
          <span style="width:32px;height:32px;border-radius:16px;display:grid;place-items:center;background:${cur ? 'oklch(0.78 0.13 350 / 0.16)' : 'rgba(255,255,255,0.06)'}"><span class="ms" style="font-size:18px;color:${cur ? 'oklch(0.82 0.1 350)' : '#8e8d89'}">${icon}</span></span>
          <span style="min-width:0;display:flex;flex-direction:column;gap:1px"><span style="font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(label)}${own ? '' : ' <span style="font-size:11px;color:#6d6c69">· standard</span>'}</span><span style="font-size:11px;color:${cur && !ok ? 'oklch(0.72 0.15 25)' : '#8e8d89'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${e(hint)}">${e(open ? hint : sub)}</span></span>
          <span class="ms" style="font-size:20px;color:#8e8d89">${open ? 'expand_less' : 'expand_more'}</span>
        </button>${list}</div>`;
      }).join('');
      return `<div style="padding:10px 12px 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8e8d89">Kilder</div>${rows}`;
    }
    tilpassHTML() {
      const all = this._allCals(); if (!all.length) return this._srcHTML();
      const on = new Set(this._cals().map(x => x.id)), user = !!this._userCals();
      const pill = (k, l, act) => `<button data-on-click="kalAlle" data-arg="${k}" style="height:30px;padding:0 12px;border-radius:15px;font-size:12px;font-weight:500;background:${act ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)'};color:${act ? '#f4f3ef' : '#a9a7a2'}">${l}</button>`;
      const allOn = all.every(x => on.has(x.id)), noneOn = !on.size;
      return `${this._srcHTML()}<div style="padding:10px 12px 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8e8d89">Kalendere</div>
    <div style="display:flex;align-items:center;gap:6px;padding:2px 8px 6px 12px">
      <span style="flex:1;font-size:12px;color:#8e8d89">${on.size} av ${all.length} vises${user ? '' : ' · standard'}</span>
      ${pill('alle', 'Alle', allOn)}${pill('ingen', 'Ingen', noneOn)}${user ? pill('std', 'Standard', false) : ''}
    </div>
    ${all.map(k => { const v = on.has(k.id); return `<button data-key="kd-kal-${e(k.id)}" data-on-click="kalTog" data-arg="${e(k.id)}" style="min-height:44px;padding:0 12px;border-radius:14px;display:flex;align-items:center;gap:10px;width:100%;text-align:left">
      <span style="width:10px;height:10px;border-radius:5px;flex:none;background:${k.col};opacity:${v ? 1 : 0.35}"></span>
      <span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${v ? '#f4f3ef' : '#8e8d89'}">${e(k.navn)}</span><span style="font-size:11px;color:#6d6c69;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(k.id)}</span></span>
      <span style="position:relative;width:44px;height:26px;border-radius:13px;flex:none;background:${v ? 'oklch(0.78 0.13 350)' : '#3a3a3d'};transition:background .2s"><span style="position:absolute;top:3px;left:${v ? 21 : 3}px;width:20px;height:20px;border-radius:10px;background:#f4f3ef;box-shadow:0 1px 3px rgba(0,0,0,0.35);transition:left .2s"></span></span>
    </button>`; }).join('')}`;
    }
    goTab(ev, k) { this.setState({ tab: k }); }
    goView(ev, k) { this.setState({ view: k }); }
    prevMonth() { const [y, m] = this.state.month; this.setState({ month: m === 0 ? [y - 1, 11] : [y, m - 1] }); }
    nextMonth() { const [y, m] = this.state.month; this.setState({ month: m === 11 ? [y + 1, 0] : [y, m + 1] }); }
    goToday() { const t = new Date(); this.setState({ month: [t.getFullYear(), t.getMonth()], sel: `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}` }); }
    pick(ev, k) { if (k) this.setState({ sel: k }); }
    goFilter(ev, k) { this.setState({ filter: k }); }
    goSub(ev, k) { this.setState({ hsub: k }); }
    goPlace(ev, k) { this.setState({ hplace: k }); }
    toggleSearch() { this.setState(s => ({ search: !s.search, q: '', hsub: s.search ? s.hsub : 'stays' })); }
    setQ(ev) { this.setState({ q: ev.target.value, hsub: 'stays' }); }
    hutScroll(ev, a0, el) { el = el || ev.target; const w = el.firstElementChild ? el.firstElementChild.offsetWidth + 10 : 1; const i = Math.round(el.scrollLeft / w); if (i !== this.state.hut && i >= 0 && i < (this._nPages || 1)) this.setState({ hut: i }); }
    hutDot(ev, i) { i = +i; const el = this.$('[data-kd-hut]'); if (el && el.firstElementChild) el.scrollTo({ left: i * (el.firstElementChild.offsetWidth + 10), behavior: 'smooth' }); this.setState({ hut: i }); }

    /* ================= visninger ================= */
    _calTab(cals) {
      const s = this.state, c = this.config, TODAY = day0(new Date());
      const only = new Set(c.bare_i_maned || []);
      const listCals = cals.filter(k => !only.has(k.id));
      const evs = this._events(listCals, Number(c.dager) || 14, TODAY, 'list');
      const byDay = new Map();
      for (const ev of evs) { const d = day0(ev.start < TODAY ? TODAY : ev.start); const k = isoL(d); if (!byDay.has(k)) byDay.set(k, { d, items: [] }); byDay.get(k).items.push(ev); }
      const agenda = [...byDay.values()].sort((x, y) => x.d - y.d).map((g, i) => { const today = isoL(g.d) === isoL(TODAY); return {
        wd: today ? 'I dag' : g.d.toLocaleDateString('nb-NO', { weekday: 'long' }), date: g.d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }).replace('.', ''),
        dateStyle: { fontSize: 22, fontWeight: today ? 500 : 300, letterSpacing: '-0.02em', whiteSpace: 'nowrap' },
        row: { display: 'flex', gap: 14, padding: '14px 4px', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' },
        items: g.items.map(ev => ({ title: ev.summary || '', meta: `${this._time(ev)} · ${ev.navn}`, dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flex: 'none', background: ev.col } })) }; });
      // måned
      const [y, m] = s.month;
      const f1 = new Date(y, m, 1), off = (f1.getDay() + 6) % 7;
      const cells = Array.from({ length: 42 }, (_, i) => new Date(y, m, 1 - off + i));
      const mev = s.view === 'month' ? this._events(cals, 42, cells[0], 'm') : [];
      const dayEvents = d => { const a0 = day0(d).getTime(), a1 = a0 + DAY; return mev.filter(ev => ev.start.getTime() < a1 && (ev.end ? ev.end.getTime() : ev.start.getTime() + 1) > a0).sort((p, q) => (p.allDay === q.allDay ? p.start - q.start : p.allDay ? 1 : -1)); };
      const [sy, sm, sd] = s.sel.split('-').map(Number), sel = new Date(sy, sm, sd);
      const items = s.view === 'month' ? dayEvents(sel) : [];
      const isToday = sel.toDateString() === TODAY.toDateString();
      return {
        agenda,
        calHead: s.view === 'month' ? 'Måned' : 'Kommende',
        calViews: [['list', 'Liste', 'view_agenda'], ['month', 'Måned', 'calendar_month']].map(([k, label, icon]) => ({ k, label, icon, style: { height: 34, padding: '0 12px', borderRadius: 13, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, background: s.view === k ? PINK : 'transparent', color: s.view === k ? '#2a1720' : '#a9a7a2', transition: 'background .2s' } })),
        monthLabel: cap(f1.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' })),
        mcells: s.view !== 'month' ? [] : cells.map(d => { const inM = d.getMonth() === m, ev = inM ? dayEvents(d) : [], k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, act = k === s.sel, today = d.toDateString() === TODAY.toDateString();
          const hasFam = ev.some(x => x.col !== C.green);
          return { n: d.getDate(), count: ev.length || '', k: inM ? k : '',
            style: { position: 'relative', aspectRatio: '1', borderRadius: '50%', display: 'grid', placeItems: 'center', background: act ? PINK : inM ? '#1c1c1f' : 'transparent', boxShadow: today && !act ? 'inset 0 0 0 1.5px #f2f1ee' : 'none', opacity: inM ? 1 : 0.3, transition: 'background .2s' },
            num: { fontSize: 14, fontWeight: act || today ? 600 : 500, color: act ? '#2a1720' : '#f2f1ee', fontVariantNumeric: 'tabular-nums' },
            badge: { position: 'absolute', left: -2, top: -2, minWidth: 18, height: 18, borderRadius: 9, display: ev.length ? 'grid' : 'none', placeItems: 'center', fontSize: 10, fontWeight: 700, background: hasFam ? C.pink : C.green, color: '#141416', boxShadow: '0 0 0 2px #141416' } }; }),
        selTitle: cap(sel.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })),
        selMeta: isToday ? 'i dag' : `${items.length} hendelser`,
        selItems: items.map(ev => ({ time: this._time(ev), title: ev.summary || '', where: ev.location || ev.navn, row: { display: 'flex', gap: 10, padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }, bar: { width: 3, borderRadius: 2, alignSelf: 'stretch', flex: 'none', background: ev.col } })),
      };
    }

    _hutVals(places) {
      const s = this.state, [y, m] = s.month, TODAY = day0(new Date());
      const pages = [{ k: 'alle', title: 'Alle steder', bg: 'linear-gradient(160deg, #22324a, #18222f)' }, ...places.map(p => ({ k: p.id, title: p.name, bg: p.bg, p }))];
      this._nPages = pages.length;
      const hi = Math.min(s.hut, pages.length - 1), page = pages[hi], pk = page.k;
      const byId = Object.fromEntries(places.map(p => [p.id, p]));
      const f1 = new Date(y, m, 1), off = (f1.getDay() + 6) % 7;
      const cells = Array.from({ length: 42 }, (_, i) => new Date(y, m, 1 - off + i));
      const dager = p => p.at.dager || {};
      const codesOf = d => {
        if (d.getMonth() !== m) return [];
        const k = isoL(d);
        if (pk === 'alle') return places.filter(p => (dager(p)[k] || []).length).map(p => ({ col: p.col }));
        return (dager(byId[pk])[k] || []).map(n => ({ col: this._pcol(n) }));
      };
      const wk = (() => { const d = new Date(TODAY); d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7); const w1 = new Date(d.getFullYear(), 0, 4); return 1 + Math.round(((d - w1) / DAY - 3 + (w1.getDay() + 6) % 7) / 7); })();
      const here = (p) => (p.at.her_naa || []).map(h => typeof h === 'string' ? h : h.navn).filter(Boolean);
      const names = l => l.length <= 1 ? (l[0] || '') : `${l.slice(0, -1).join(', ')} og ${l[l.length - 1]}`;
      const heroes = pages.map(pg => {
        let nights, visits, who;
        if (pg.k === 'alle') { nights = places.reduce((t, p) => t + (Number(p.at.netter_i_aar) || 0), 0); visits = places.reduce((t, p) => t + (Number(p.at.besok_i_aar) || 0), 0); who = places.filter(p => p.rolle !== 'hjem').flatMap(p => here(p).map(n => ({ n, col: p.col }))); }
        else { nights = Number(pg.p.at.netter_i_aar) || 0; visits = Number(pg.p.at.besok_i_aar) || 0; who = here(pg.p).map(n => ({ n, col: this._pcol(n) })); }
        return { title: pg.title, nights, visits, here: who.length ? `${names(who.map(w => w.n))} er her` : 'Ingen her nå',
          who: who.map(w => ({ i: w.n[0], style: { width: 28, height: 28, borderRadius: 14, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, background: w.col, color: '#1a1a1c', boxShadow: '0 0 0 2px rgba(255,255,255,0.25)' } })),
          chips: pg.k === 'alle' ? places.map(p => ({ label: `${p.name} ${Number(p.at.netter_i_aar) || 0}`, dot: { width: 8, height: 8, borderRadius: 4, background: p.col } })) : [],
          card: { position: 'relative', overflow: 'hidden', flex: 'none', width: '100%', scrollSnapAlign: 'center', boxSizing: 'border-box', minHeight: 190, padding: 18, borderRadius: 28, display: 'flex', flexDirection: 'column', gap: 6, background: pg.bg, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' } };
      });
      const sub = (k, l) => ({ k, label: l, style: { height: 38, padding: '0 16px', borderRadius: 19, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', background: s.hsub === k ? PINK : 'transparent', color: s.hsub === k ? '#2a1720' : '#c9c7c2' } });
      const pf = s.hplace, q = s.q.trim().toLowerCase();
      // opphold (+ planlagte)
      const stays = [];
      for (const p of places) {
        for (const o of [...(p.at.kommende || []).map(x => ({ ...x, plan: true })), ...(p.at.opphold || [])]) {
          const st = parseD(o.start); if (!st) continue;
          const n = Number(o.netter) || Math.max(1, Math.round((parseD(o.slutt) - st) / DAY)) || 1;
          stays.push({ who: o.person || 'Ukjent', place: p, start: st, n, plan: !!o.plan });
        }
      }
      stays.sort((x, y2) => y2.start - x.start);
      const shownStays = stays.filter(r => (pf === 'alle' || r.place.id === pf) && (!q || r.who.toLowerCase().includes(q) || r.place.name.toLowerCase().includes(q)));
      const mSum = Array.from({ length: 12 }, (_, i) => places.map(p => Number(((p.at.per_maaned || [])[i] || {}).netter) || 0));
      const mMax = Math.max(1, ...mSum.map(r => r.reduce((t, v) => t + v, 0)));
      const lest = (() => { const ts = (pk === 'alle' ? places : [byId[pk]]).map(p => parseD(p.at.sist_lest)).filter(Boolean).sort((x, y2) => y2 - x)[0]; return ts ? ` · lest ${hm(ts)}` : ''; })();
      const people = pk === 'alle' ? [] : ((byId[pk].at.kjente_personer && byId[pk].at.kjente_personer.length ? byId[pk].at.kjente_personer : (byId[pk].at.personer || []).map(x => x.navn)).filter(Boolean));
      return {
        heroes, dots: pages.map((_, i) => ({ i, style: { width: i === hi ? 18 : 7, height: 7, borderRadius: 4, background: i === hi ? '#f2f1ee' : '#48474a', transition: 'width .3s, background .3s' } })),
        subs: [sub('cal', 'Kalender'), sub('stays', 'Opphold'), sub('stats', 'Statistikk')],
        isCal: s.hsub === 'cal', isStays: s.hsub === 'stays', isStats: s.hsub === 'stats', searching: s.search, q: s.q,
        searchBtn: { width: 46, height: 46, borderRadius: 23, display: 'grid', placeItems: 'center', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)', background: s.search ? PINK : 'transparent', color: s.search ? '#2a1720' : '#f2f1ee' },
        week: `Uke ${wk}`, lest,
        cells: cells.map(d => { const inM = d.getMonth() === m, cs = codesOf(d), planned = d > TODAY && cs.length, isT = d.toDateString() === TODAY.toDateString();
          const bg = !cs.length ? (inM ? '#141416' : 'transparent') : planned ? 'transparent' : cs.length === 1 ? cs[0].col : `linear-gradient(90deg, ${cs.map((c2, i) => `${c2.col} ${i / cs.length * 100}% ${(i + 1) / cs.length * 100}%`).join(', ')})`;
          return { n: d.getDate(), style: { aspectRatio: '1', borderRadius: 12, display: 'grid', placeItems: 'center', background: bg, border: planned ? `2px dashed ${cs[0].col}` : '2px solid transparent', boxSizing: 'border-box', boxShadow: isT ? 'inset 0 0 0 2px #f2f1ee' : 'none', opacity: inM ? 1 : 0.3 },
            num: { fontSize: 13, fontWeight: 600, color: cs.length && !planned ? '#1a1a1c' : inM ? '#e6e4df' : '#6d6c69', fontVariantNumeric: 'tabular-nums' } }; }),
        legend: (pk === 'alle' ? places.map(p => [p.name, p.col]) : people.map(n => [n, this._pcol(n)])).map(([name, col]) => ({ name, dot: { width: 10, height: 10, borderRadius: 3, background: col } })),
        placeFilters: [['alle', 'Alle', null], ...places.map(p => [p.id, p.name, p.col])].map(([k, label, col]) => ({ k, label,
          style: { height: 36, padding: '0 12px', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', background: pf === k ? PINK : 'transparent', color: pf === k ? '#2a1720' : '#c9c7c2' },
          dot: { display: k === 'alle' ? 'none' : 'block', width: 7, height: 7, borderRadius: 4, background: col || 'transparent' } })),
        noStays: !shownStays.length,
        stays: shownStays.slice(0, 60).map((r, i) => ({ i: r.who[0], name: r.who, place: r.place.name, dates: r.n === 1 ? dmon(r.start) : `${dmon(r.start)} – ${dmon(new Date(r.start.getTime() + (r.n - 1) * DAY))}`, nights: (r.plan ? 'planlagt · ' : '') + (r.n === 1 ? '1 natt' : `${r.n} netter`),
          row: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderTop: i ? '1px solid rgba(255,255,255,0.06)' : 'none' },
          avatar: { width: 28, height: 28, borderRadius: 14, flex: 'none', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, background: this._pcol(r.who), color: '#1a1a1c' },
          tag: { fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 6, background: '#2a2a2d', color: r.place.col } })),
        months: MND.map((k, i) => { const vals = mSum[i], v = vals.reduce((t, x) => t + x, 0); return { k, v: v || '', segs: vals.map((n, j) => [n, places[j].col]).filter(x => x[0]).map(([n, col]) => ({ width: `${n / mMax * 100}%`, height: '100%', background: col })) }; }),
        placeCards: places.map(p => { const si = p.at.siste; const ls = si && parseD(si.start) ? new Date(parseD(si.start).getTime() + Math.max(0, (Number(si.netter) || 1) - 1) * DAY) : null; return { i: p.name[0], name: p.name, sub: `${Number(p.at.besok_i_aar) || 0} besøk i år${ls ? ` · sist ${dmon(ls)}` : ''}`, nights: Number(p.at.netter_i_aar) || 0,
          avatar: { width: 28, height: 28, borderRadius: 14, flex: 'none', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, background: p.col, color: '#1a1a1c' } }; }),
      };
    }

    body() {
      const s = this.state, c = { ...this.config, ...this._src() }, TODAY = day0(new Date());
      const cals = this._cals(), places = this._places();
      const has = { cal: true, cabin: places.length > 0, up: !!(this.st(c.serier) || this.st(c.filmer)), bday: !!(c.bursdager && this.st(c.bursdager)), post: !!(this.st(c.post) || this.st(c.post_kalender)) };
      const tabDefs = [['cal', 'Kalender', 'event'], ['cabin', 'Hytta', 'cottage'], ['up', 'Framover', 'movie'], ['bday', 'Bursdager', 'cake'], ['post', 'Posten', 'mail']].filter(t => has[t[0]]);
      const tabK = tabDefs.some(t => t[0] === s.tab) ? s.tab : 'cal';
      const tabs = tabDefs.map(([k, l, icon]) => ({ k, label: l, icon, style: { flex: 'none', height: 38, padding: '0 12px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', background: tabK === k ? PINK : 'transparent', color: tabK === k ? '#2a1720' : '#a9a7a2' } }));
      const isCalTab = tabK === 'cal', isCal = isCalTab && s.view === 'list', isMonth = isCalTab && s.view === 'month';
      const CV = isCalTab ? this._calTab(cals) : null;
      const H = tabK === 'cabin' ? this._hutVals(places) : null;
      const [y, m] = s.month;
      const monthLabel = cap(new Date(y, m, 1).toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' }));
      let html = '';
      // ---- Framover
      let up = null;
      if (tabK === 'up') {
        const all = this._upcoming();
        const ups = all.filter(u => s.filter === 'alle' || (s.filter === 'plex' ? u.plex : u.type === s.filter));
        const col = u => `oklch(0.45 0.08 ${hash(u.title) % 360})`;
        const dayS = d => { const n = Math.round((day0(d) - TODAY) / DAY); return n < 8 ? cap(d.toLocaleDateString('nb-NO', { weekday: 'short' }).replace('.', '')) : dmon(d); };
        const subOf = u => (u.type === 'serie' ? [u.episode, u.number, u.plex ? 'på Plex' : u.studio] : [u.kino ? 'Kino' : 'Film', u.plex ? 'på Plex' : u.studio]).filter(Boolean).join(' · ');
        const F = ups[0];
        up = { filters: [['alle', 'Alle'], ['serie', 'Serier'], ['film', 'Filmer'], ['plex', 'Plex']].filter(([k]) => k === 'alle' || (k === 'serie' ? this.st(c.serier) : k === 'film' ? this.st(c.filmer) : this.st(c.plex_serier) || this.st(c.plex_filmer))).map(([k, l]) => ({ k, label: l, style: { height: 34, padding: '0 14px', borderRadius: 17, fontSize: 13, fontWeight: 500, background: s.filter === k ? '#f4f3ef' : '#1c1c1f', color: s.filter === k ? '#1a1a1c' : '#c9c7c2' } })),
          featured: F ? { title: F.title, sub: subOf(F), when: `${dayS(F.when)} kl. ${hm(F.when)}`, tag: s.filter === 'plex' ? 'Plex' : F.type === 'serie' ? 'Sonarr' : 'Radarr', initials: ini(F.title),
            card: { display: 'flex', gap: 14, alignItems: 'center', padding: 14, borderRadius: 24, background: `linear-gradient(120deg, ${col(F)}, #1c1c1f 85%)` },
            poster: { width: 84, height: 120, borderRadius: 12, flex: 'none', display: 'grid', placeItems: 'center', padding: 8, boxSizing: 'border-box', background: `linear-gradient(160deg, ${col(F)}, #111)`, boxShadow: '0 8px 20px rgba(0,0,0,0.4)' } } : null,
          list: ups.slice(1, 40).map((u, i) => ({ title: u.title, sub: subOf(u), day: dayS(u.when), time: hm(u.when), initials: ini(u.title),
            row: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' },
            poster: { width: 40, height: 56, borderRadius: 8, flex: 'none', display: 'grid', placeItems: 'center', background: `linear-gradient(160deg, ${col(u)}, #111)` },
            okStyle: { fontSize: 15, color: C.green, fontVariationSettings: "'FILL' 1", display: u.plex ? 'inline' : 'none' } })) };
      }
      // ---- Bursdager
      let bd = null;
      if (tabK === 'bday') {
        const bl = this._bdays(), nb = bl[0];
        const fy = b => b.age != null ? `Fyller ${b.age}` : 'Bursdag';
        bd = { next: nb ? { name: nb.name, when: nb.days === 0 ? 'I dag' : nb.days === 1 ? 'I morgen' : `Om ${nb.days} dager`, sub: `${fy(nb)} · ${nb.date.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })}` } : { name: 'Ingen bursdager', when: 'Bursdager', sub: 'Fant ingen i kalenderen det neste året' },
          list: bl.slice(1).map((b, i) => ({ name: b.name, initial: b.name[0], sub: `${fy(b)} · ${b.date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' })}`, days: `${b.days} d`,
            row: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 4px', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' },
            avatar: { width: 36, height: 36, borderRadius: 18, flex: 'none', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 600, background: '#232326', color: '#c9c7c2' },
            daysStyle: { fontSize: 12, fontWeight: 500, padding: '4px 9px', borderRadius: 10, background: b.days < 30 ? a(C.pink, 0.18) : '#1f1f22', color: b.days < 30 ? '#f2f1ee' : '#8e8d89', fontVariantNumeric: 'tabular-nums' } })) };
      }
      // ---- Posten
      let po = null;
      if (tabK === 'post') {
        const nx = parseD(this.v(c.post));
        const base = nx && day0(nx) >= TODAY ? day0(nx) : TODAY;
        const mon = new Date(base); mon.setDate(mon.getDate() - (mon.getDay() + 6) % 7);
        const pcal = c.post_kalender && this.st(c.post_kalender) ? this._events([{ id: c.post_kalender, navn: 'Posten', col: C.red }], 14, mon, 'post') : [];
        const deliv = new Set(pcal.map(ev => isoL(day0(ev.start))));
        if (nx) deliv.add(isoL(day0(nx)));
        const days = Array.from({ length: 14 }, (_, i) => new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i));
        const at = (this.st(c.post) || {}).attributes || {};
        const pn = c.postnummer || [at.postal_code || at.postnummer || at.zip || '', at.city || at.poststed || ''].filter(Boolean).join(' ');
        const etaTxt = v => { const d = parseD(v); if (!d) return ''; const n = Math.round((day0(d) - TODAY) / DAY); return n === 0 ? 'I dag' : n === 1 ? 'I morgen' : n > 1 && n < 7 ? cap(d.toLocaleDateString('nb-NO', { weekday: 'short' }).replace('.', '')) : dmon(d); };
        po = { place: `Posten${pn ? ' · ' + pn : ''}`, head: nx ? `Neste levering ${nx.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'short' })}` : 'Ingen leveringsdato',
          days: days.map(d => { const on = deliv.has(isoL(d)), we = d.getDay() === 0 || d.getDay() === 6; return { n: d.getDate(), wd: d.toLocaleDateString('nb-NO', { weekday: 'short' }).replace('.', ''),
            cell: { height: 70, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, background: on ? a(C.red, 0.14) : '#1c1c1f', boxShadow: on ? `inset 0 0 0 1px ${a(C.red, 0.4)}` : 'none', opacity: we ? 0.4 : 1 },
            icon: { fontSize: 14, color: C.red, fontVariationSettings: "'FILL' 1", opacity: on ? 1 : 0 } }; }),
          parcels: this._parcels().map((p, i) => ({ name: p.name, icon: p.klar ? 'package_2' : p.step === 2 ? 'local_shipping' : 'inventory_2', status: p.klar && p.hentested ? `Til hentested · ${p.hentested}` : (p.siste || p.state), eta: etaTxt(p.eta),
            row: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 4px', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' },
            iconWrap: { width: 36, height: 36, borderRadius: 18, flex: 'none', display: 'grid', placeItems: 'center', background: a(C.red, 0.16), color: C.red },
            steps: [1, 2, 3, 4].map(k => ({ flex: 1, height: 4, borderRadius: 2, background: k <= p.step ? C.red : '#2a2a2d' })) })) };
      }

      html = `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:20px">
  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Kalender</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <div data-hscroll="1" style="display:flex;gap:2px;padding:4px;border-radius:20px;background:#1c1c1f;overflow-x:auto;scrollbar-width:none">
    ${tabs.map(t => `<button data-on-click="goTab" data-arg="${t.k}" style="${S(t.style)}"><span class="ms" style="font-size:17px">${e(t.icon)}</span><span>${e(t.label)}</span></button>`).join('')}
  </div>
${isCalTab ? `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 4px">
      <span style="font-size:15px;font-weight:500"><span>${e(CV.calHead)}</span></span>
      <div style="width:210px;max-width:60%;flex:none">${KD.segHTML('kal-view', CV.calViews.map(v => [v.k, v.label, v.icon]), s.view, 'goView', { pink: true, small: true })}</div>
    </div>` : ''}
${isCal ? `
    <section style="display:flex;flex-direction:column">
      ${CV.agenda.map(d => `<div style="${S(d.row)}">
          <div style="width:64px;flex:none;display:flex;flex-direction:column;gap:2px">
            <span style="font-size:12px;color:#8e8d89"><span>${e(d.wd)}</span></span>
            <span style="${S(d.dateStyle)}"><span>${e(d.date)}</span></span>
          </div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:10px;padding-top:2px">
            ${d.items.map(it => `<div style="display:flex;gap:10px;align-items:flex-start">
                <span style="${S(it.dot)}"></span>
                <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
                  <span style="font-size:14px;font-weight:500"><span>${e(it.title)}</span></span>
                  <span style="font-size:12px;color:#8e8d89"><span>${e(it.meta)}</span></span>
                </div>
              </div>`).join('')}
          </div>
        </div>`).join('')}
      ${!CV.agenda.length ? `<div style="padding:30px 0;text-align:center;font-size:14px;color:#6d6c69">Ingen hendelser de neste ${Number(c.dager) || 14} dagene</div>` : ''}
    </section>` : ''}
${isMonth ? `
    <section style="display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <button data-on-click="prevMonth" style="width:36px;height:36px;border-radius:18px;background:#1c1c1f;display:grid;place-items:center"><span class="ms" style="font-size:22px">chevron_left</span></button>
        <button data-on-click="goToday" style="font-size:15px;font-weight:500;display:flex;align-items:center;gap:6px"><span>${e(CV.monthLabel)}</span><span style="font-size:11px;color:#8e8d89">i dag</span></button>
        <button data-on-click="nextMonth" style="width:36px;height:36px;border-radius:18px;background:#1c1c1f;display:grid;place-items:center"><span class="ms" style="font-size:22px">chevron_right</span></button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">
        ${['M', 'T', 'O', 'T', 'F', 'L', 'S'].map(w => `<div style="text-align:center;font-size:11px;color:#6d6c69;padding:2px 0"><span>${w}</span></div>`).join('')}
        ${CV.mcells.map(ce => `<button data-on-click="pick" data-arg="${ce.k}" style="${S(ce.style)}">
            <span style="${S(ce.num)}"><span>${ce.n}</span></span>
            <span style="${S(ce.badge)}"><span>${e(ce.count)}</span></span>
          </button>`).join('')}
      </div>
    </section>
    <section style="display:flex;flex-direction:column;gap:2px;padding:14px 16px;border-radius:24px;background:#1c1c1f">
      <div style="display:flex;align-items:baseline;gap:8px;padding-bottom:6px">
        <span style="font-size:15px;font-weight:500"><span>${e(CV.selTitle)}</span></span>
        <span style="font-size:12px;color:#8e8d89"><span>${e(CV.selMeta)}</span></span>
      </div>
      ${CV.selItems.map(it => `<div style="${S(it.row)}">
          <span style="${S(it.bar)}"></span>
          <span style="width:92px;flex:none;font-size:12px;color:#c9c7c2;font-variant-numeric:tabular-nums;padding-top:1px"><span>${e(it.time)}</span></span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
            <span style="font-size:14px;font-weight:500"><span>${e(it.title)}</span></span>
            <span style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(it.where)}</span></span>
          </div>
        </div>`).join('')}
      ${!CV.selItems.length ? `<div style="padding:14px 0;font-size:13px;color:#6d6c69">Ingen hendelser</div>` : ''}
    </section>` : ''}
${H ? `
    <div data-hscroll="1" data-kd-hut="1" data-on-scroll="hutScroll" style="display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;margin:0 calc(-1 * var(--kd-kant,10px));padding:0 var(--kd-kant,10px)">
      ${H.heroes.map(h => `<div style="${S(h.card)}">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:19px;font-weight:600;white-space:nowrap"><span>${e(h.title)}</span></span>
            ${h.who.map(w => `<span style="${S(w.style)}"><span>${e(w.i)}</span></span>`).join('')}
            <span style="flex:1"></span>
            <button data-on-click="goSub" data-arg="cal" style="width:34px;height:34px;border-radius:17px;background:rgba(255,255,255,0.12);display:grid;place-items:center"><span class="ms" style="font-size:18px">event_available</span></button>
          </div>
          <span style="font-size:13px;color:rgba(242,241,238,0.75)"><span>${e(h.here)}</span></span>
          <div style="display:flex;gap:26px;padding-top:6px">
            <div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:24px;font-weight:300;letter-spacing:-0.02em;line-height:1"><span>${e(h.nights)}</span></span><span style="font-size:11px;color:rgba(242,241,238,0.7)">netter i år</span></div>
            <div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:24px;font-weight:300;letter-spacing:-0.02em;line-height:1"><span>${e(h.visits)}</span></span><span style="font-size:11px;color:rgba(242,241,238,0.7)">besøk i år</span></div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;position:relative;z-index:1">
            ${h.chips.map(ch => `<span style="height:28px;padding:0 10px 0 8px;border-radius:14px;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;background:rgba(255,255,255,0.12);white-space:nowrap"><span style="${S(ch.dot)}"></span><span>${e(ch.label)}</span></span>`).join('')}
          </div>
          <span class="ms" style="position:absolute;right:14px;bottom:-6px;font-size:96px;color:rgba(255,255,255,0.22);font-variation-settings:'FILL' 1">cottage</span>
          <span style="position:absolute;right:52px;bottom:18px;display:flex;gap:10px"><span style="width:12px;height:10px;border-radius:2px;background:oklch(0.82 0.1 80 / 0.8)"></span><span style="width:12px;height:10px;border-radius:2px;background:oklch(0.82 0.1 80 / 0.8)"></span></span>
        </div>`).join('')}
    </div>
    <div style="display:flex;justify-content:center;gap:6px;margin-top:-8px">
      ${H.dots.map(d => `<button data-on-click="hutDot" data-arg="${d.i}" style="${S(d.style)}"></button>`).join('')}
    </div>

    <div style="display:flex;align-items:center;justify-content:center;gap:8px">
      <div style="flex:1;min-width:0">${KD.segHTML('kal-hsub', H.subs.map(t => [t.k, t.label]), s.hsub, 'goSub', { pink: true })}</div>
      <button data-on-click="toggleSearch" style="${S(H.searchBtn)}"><span class="ms" style="font-size:20px">search</span></button>
    </div>
    ${H.searching ? `<input data-on-input="setQ" value="${e(H.q)}" placeholder="Søk etter person eller sted" style="height:46px;border-radius:23px;border:0;outline:none;padding:0 18px;background:#1c1c1f;color:#f2f1ee;font:inherit;font-size:14px">` : ''}
    ${H.isCal ? `<section style="display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:26px;background:#1c1c1f">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <button data-on-click="prevMonth" style="width:34px;height:34px;border-radius:17px;background:#141416;display:grid;place-items:center"><span class="ms" style="font-size:22px">chevron_left</span></button>
          <div style="display:flex;align-items:baseline;gap:8px"><span style="font-size:15px;font-weight:600"><span>${e(monthLabel)}</span></span><span style="font-size:11px;color:#8e8d89"><span>${e(H.week)}</span></span></div>
          <button data-on-click="nextMonth" style="width:34px;height:34px;border-radius:17px;background:#141416;display:grid;place-items:center"><span class="ms" style="font-size:22px">chevron_right</span></button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px">
          ${['ma', 'ti', 'on', 'to', 'fr', 'lø', 'sø'].map(w => `<div style="text-align:center;font-size:11px;color:#8e8d89;padding:2px 0"><span>${w}</span></div>`).join('')}
          ${H.cells.map(ce => `<div style="${S(ce.style)}"><span style="${S(ce.num)}"><span>${ce.n}</span></span></div>`).join('')}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding-top:4px">
          <div style="display:flex;gap:12px">${H.legend.map(l => `<span style="display:flex;align-items:center;gap:5px;font-size:11px;color:#c9c7c2"><span style="${S(l.dot)}"></span><span>${e(l.name)}</span></span>`).join('')}</div>
          <span style="font-size:11px;color:#8e8d89">stiplet = planlagt${e(H.lest)}</span>
        </div>
      </section>` : ''}
    ${H.isStays ? `<div style="display:flex;justify-content:center">
        <div style="display:flex;gap:2px;padding:4px;border-radius:20px;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.12)">
          ${H.placeFilters.map(p => `<button data-on-click="goPlace" data-arg="${e(p.k)}" style="${S(p.style)}"><span style="${S(p.dot)}"></span><span>${e(p.label)}</span></button>`).join('')}
        </div>
      </div>
      <section style="display:flex;flex-direction:column;border-radius:26px;background:#1c1c1f;overflow:hidden">
        ${H.stays.map(r => `<div style="${S(r.row)}">
            <span style="${S(r.avatar)}"><span>${e(r.i)}</span></span>
            <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
              <span style="display:flex;align-items:center;gap:6px;font-size:14px;font-weight:500"><span>${e(r.name)}</span><span style="${S(r.tag)}"><span>${e(r.place)}</span></span></span>
              <span style="font-size:12px;color:#8e8d89"><span>${e(r.dates)}</span></span>
            </span>
            <span style="font-size:13px;font-weight:600;white-space:nowrap"><span>${e(r.nights)}</span></span>
          </div>`).join('')}
        ${H.noStays ? `<div style="padding:24px;text-align:center;font-size:13px;color:#6d6c69">Ingen opphold</div>` : ''}
      </section>` : ''}
    ${H.isStats ? `<section style="display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:26px;background:#1c1c1f">
        <span style="font-size:12px;color:#8e8d89">Netter per måned i år</span>
        ${H.months.map(mo => `<div style="display:flex;align-items:center;gap:10px">
            <span style="width:30px;font-size:12px;color:#c9c7c2"><span>${e(mo.k)}</span></span>
            <div style="flex:1;height:10px;border-radius:5px;background:#262629;overflow:hidden;display:flex">${mo.segs.map(g => `<span style="${S(g)}"></span>`).join('')}</div>
            <span style="width:30px;text-align:right;font-size:12px;color:#c9c7c2;font-variant-numeric:tabular-nums"><span>${e(mo.v)}</span></span>
          </div>`).join('')}
      </section>
      ${H.placeCards.map(p => `<section style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-radius:26px;background:#1c1c1f">
          <span style="${S(p.avatar)}"><span>${e(p.i)}</span></span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:500"><span>${e(p.name)}</span></span><span style="font-size:12px;color:#a9a7a2"><span>${e(p.sub)}</span></span></span>
          <span style="display:flex;flex-direction:column;align-items:flex-end"><span style="font-size:24px;font-weight:300;letter-spacing:-0.02em"><span>${e(p.nights)}</span></span><span style="font-size:11px;color:#8e8d89">netter</span></span>
        </section>`).join('')}` : ''}` : ''}
${up ? `
    ${KD.segHTML('kal-upf', up.filters.map(f => [f.k, f.label]), s.filter, 'goFilter', { small: true })}
    ${up.featured ? `<section style="${S(up.featured.card)}">
        <div style="${S(up.featured.poster)}"><span style="font-size:22px;font-weight:600;letter-spacing:-0.02em;text-align:center;line-height:1"><span>${e(up.featured.initials)}</span></span></div>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span style="height:22px;padding:0 8px;border-radius:7px;background:rgba(0,0,0,0.35);display:flex;align-items:center;font-size:11px;font-weight:600;white-space:nowrap"><span>${e(up.featured.when)}</span></span>
            <span style="height:22px;padding:0 8px;border-radius:7px;background:rgba(0,0,0,0.35);display:flex;align-items:center;font-size:11px;font-weight:600;white-space:nowrap"><span>${e(up.featured.tag)}</span></span>
          </div>
          <span style="font-size:20px;font-weight:600;letter-spacing:-0.01em"><span>${e(up.featured.title)}</span></span>
          <span style="font-size:12px;color:#d9d6d0"><span>${e(up.featured.sub)}</span></span>
        </div>
      </section>` : ''}
    <section style="display:flex;flex-direction:column">
      ${up.list.map(u => `<div style="${S(u.row)}">
          <div style="${S(u.poster)}"><span style="font-size:12px;font-weight:600"><span>${e(u.initials)}</span></span></div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px">
            <span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:6px"><span>${e(u.title)}</span><span class="ms" style="${S(u.okStyle)}">check_circle</span></span>
            <span style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(u.sub)}</span></span>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex:none">
            <span style="font-size:13px;font-weight:500"><span>${e(u.day)}</span></span>
            <span style="font-size:11px;color:#8e8d89;font-variant-numeric:tabular-nums"><span>${e(u.time)}</span></span>
          </div>
        </div>`).join('')}
      ${!up.featured ? `<div style="padding:30px 0;text-align:center;font-size:14px;color:#6d6c69">Ingenting planlagt</div>` : ''}
    </section>` : ''}
${bd ? `
    <section style="display:flex;align-items:center;gap:16px;padding:18px;border-radius:24px;background:linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20));color:#2a1720">
      <div style="width:60px;height:60px;border-radius:30px;background:rgba(42,23,32,0.12);display:grid;place-items:center;flex:none"><span class="ms" style="font-size:30px;font-variation-settings:'FILL' 1">cake</span></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:3px">
        <span style="font-size:12px;font-weight:500"><span>${e(bd.next.when)}</span></span>
        <span style="font-size:22px;font-weight:600;letter-spacing:-0.01em"><span>${e(bd.next.name)}</span></span>
        <span style="font-size:13px"><span>${e(bd.next.sub)}</span></span>
      </div>
    </section>
    <section style="display:flex;flex-direction:column">
      ${bd.list.map(b => `<div style="${S(b.row)}">
          <span style="${S(b.avatar)}"><span>${e(b.initial)}</span></span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
            <span style="font-size:14px;font-weight:500"><span>${e(b.name)}</span></span>
            <span style="font-size:12px;color:#8e8d89"><span>${e(b.sub)}</span></span>
          </div>
          <span style="${S(b.daysStyle)}"><span>${e(b.days)}</span></span>
        </div>`).join('')}
    </section>` : ''}
${po ? `
    <section style="display:flex;flex-direction:column;gap:6px;padding:0 4px">
      <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#c9c7c2"><span class="ms" style="font-size:18px;color:oklch(0.72 0.15 25);font-variation-settings:'FILL' 1">mail</span>${e(po.place)}</div>
      <div style="font-size:24px;font-weight:500;letter-spacing:-0.015em"><span>${e(po.head)}</span></div>
      <div style="font-size:14px;color:#8e8d89">Posten leverer annenhver hverdag</div>
    </section>
    <section style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">
      ${po.days.map(d => `<div style="${S(d.cell)}">
          <span style="font-size:10px;color:#8e8d89"><span>${e(d.wd)}</span></span>
          <span style="font-size:15px;font-weight:500;font-variant-numeric:tabular-nums"><span>${d.n}</span></span>
          <span class="ms" style="${S(d.icon)}">mail</span>
        </div>`).join('')}
    </section>
    ${po.parcels.length ? `<section style="display:flex;flex-direction:column;gap:2px">
      <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;padding:0 4px 8px">Pakker på vei</div>
      ${po.parcels.map(p => `<div style="${S(p.row)}">
          <span style="${S(p.iconWrap)}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">${e(p.icon)}</span></span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
            <div style="display:flex;justify-content:space-between;gap:10px">
              <span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span>${e(p.name)}</span></span>
              <span style="font-size:12px;color:#8e8d89;white-space:nowrap"><span>${e(p.eta)}</span></span>
            </div>
            <div style="display:flex;gap:3px">
              ${p.steps.map(st => `<span style="${S(st)}"></span>`).join('')}
            </div>
            <span style="font-size:12px;color:#8e8d89"><span>${e(p.status)}</span></span>
          </div>
        </div>`).join('')}
    </section>` : ''}` : ''}
</div>`;
      return html;
    }
  }

  KD.define('kd-kalender-card', KDKalenderCard, 'KD Kalender', 'Kalender, hytta, framover, bursdager og posten – pikselkopi av Claude Design «Kalender»');
  KD.sheet('cal', 'kd-kalender-card');
})();
} catch (e) { console.error('ki-hjem-design: 62-kd-kalender-card.js', e); }

/* ===== 63-kd-gjoremal-card.js ===== */
try {
/*
 * kd-gjoremal-card – pikselkopi av Claude Design «Gjøremål».
 *
 *   type: custom:kd-gjoremal-card        # virker uten mer
 *   lister:                              # standard: disse to (om de finnes) + alle andre todo.* som finnes
 *     - { entity: todo.gjoremal, navn: Store oppgaver }
 *     - { entity: todo.personlig_seb, navn: Personlig }
 *   auto: true                           # ta med andre todo.*-lister automatisk
 *   ekskluder: []                        # todo.* som ikke skal vises
 *
 * Prioritet og hvem leses fra beskrivelsen («Prioritet: Høy», «Av: Rune»). Nye oppgaver får det samme
 * i beskrivelsen når lista støtter beskrivelser. Avhuking = todo.update_item, sletting = todo.remove_item,
 * ny = todo.add_item; lista hentes på nytt etter hver endring.
 */
(() => {
  const KD = window.KD; if (!KD) return;
  const PR = { h: ['Høy', 'oklch(0.72 0.15 25)'], m: ['Medium', 'oklch(0.8 0.12 70)'], l: ['Lav', 'oklch(0.8 0.12 250)'] };
  const a = (c, o) => c.replace(')', ` / ${o})`);
  const PINK = 'linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20))';
  const GREEN = 'oklch(0.8 0.12 150)';
  const e = KD.e, S = KD.S;
  const prioOf = (t) => { const m = String(t || '').match(/prio(?:ritet)?\s*[:=]\s*(høy|hoy|high|h|medium|middels|normal|m|lav|low|l)\b/i); if (!m) return null; const v = m[1].toLowerCase(); return /^(høy|hoy|high|h)$/.test(v) ? 'h' : /^(lav|low|l)$/.test(v) ? 'l' : 'm'; };
  const whoOf = (t) => { const m = String(t || '').match(/(?:^|\n)\s*(?:av|hvem|ansvarlig|who)\s*[:=]\s*([^\n,;]+)/i); return m ? m[1].trim() : ''; };
  const dueTxt = (d) => { if (!d) return ''; const x = new Date(String(d).length === 10 ? d + 'T00:00' : d); if (isNaN(x)) return ''; const t = new Date(); t.setHours(0, 0, 0, 0); const n = Math.round((new Date(x).setHours(0, 0, 0, 0) - t) / 864e5); return n === 0 ? 'frist i dag' : n === 1 ? 'frist i morgen' : n < 0 ? `forfalt ${x.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}` : `frist ${x.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}`; };

  class KDGjoremalCard extends KD.KDSheet {
    static head = ['checklist', 'Gjøremål', 'Store og personlige'];
    static defaults = { lister: [{ entity: 'todo.gjoremal', navn: 'Store oppgaver' }, { entity: 'todo.personlig_seb', navn: 'Personlig' }], auto: true, ekskluder: [] };
    constructor() { super(); this.state = { tab: null, filter: 'open', draft: '', prio: 'm' }; this._ovr = {}; }

    _lists() {
      const c = this.config, ex = new Set(c.ekskluder || []);
      const out = [];
      for (const l of (Array.isArray(c.lister) ? c.lister : [])) { const id = typeof l === 'string' ? l : l && l.entity; if (id && this.st(id) && !ex.has(id)) out.push({ id, navn: (l && l.navn) || this.fname(id) }); }
      if (c.auto !== false) for (const id of this.find(/^todo\./)) if (!ex.has(id) && !out.some(x => x.id === id)) out.push({ id, navn: this.fname(id) });
      return out;
    }
    _items(id) {
      const st = this.st(id); if (!st) return [];
      const raw = this.cached(`kd-todo-${id}|${st.state}|${st.last_updated}`, 5 * 60e3, () => this.todos(id), null);
      if (!raw) return this._last && this._last[id] ? this._last[id] : [];
      this._last = this._last || {};
      if (this._last[id] !== raw) { // ferske data: glem lokale (optimistiske) endringer for lista
        if (this._last[id]) for (const k of Object.keys(this._ovr)) if (k.startsWith(id + '|')) delete this._ovr[k];
        this._last[id] = raw;
      }
      return raw;
    }
    _norm(id, list) {
      return list.map(it => {
        const o = this._ovr[`${id}|${it.uid}`];
        if (o === 'deleted') return null;
        const status = o || it.status;
        return { uid: it.uid, list: id, text: it.summary || '', prio: prioOf(it.description) || prioOf(it.summary), who: whoOf(it.description), due: it.due, done: status === 'completed' };
      }).filter(Boolean);
    }
    _refresh(id) { setTimeout(() => { this.invalidate(`kd-todo-${id}|`); this._queue(); }, 400); }

    /* hendelser */
    goTab(ev, k) { this.setState({ tab: k }); }
    goFilter(ev, k) { this.setState({ filter: k }); }
    cyclePrio() { this.setState({ prio: { l: 'm', m: 'h', h: 'l' }[this.state.prio] }); }
    setDraft(ev) { this.state.draft = ev.target.value; }
    draftKey(ev) { if (ev.key === 'Enter') { ev.preventDefault(); this.add(); } }
    add(ev) {
      if (ev && ev.preventDefault) ev.preventDefault();
      const inp = this.$('input[data-kd-draft]'); const t = String((inp && inp.value) || this.state.draft || '').trim();
      const id = this._cur; if (!t || !id) return;
      const feat = Number(this.at(id, 'supported_features', 0)) || 0;
      const data = { entity_id: id, item: t };
      if (feat & 64) { const who = (this._hass.user && this._hass.user.name) || ''; data.description = `Prioritet: ${PR[this.state.prio][0]}${who ? `\nAv: ${who}` : ''}`; }
      this.call('todo', 'add_item', data).then(() => this._refresh(id));
      if (inp) inp.value = '';
      this.setState({ draft: '', filter: 'open' });
    }
    toggleItem(ev, key) {
      const [id, uid] = key.split('|'); const it = (this._shown || []).find(x => x.uid === uid && x.list === id); if (!it) return;
      const status = it.done ? 'needs_action' : 'completed';
      this._ovr[key] = status; this._queue();
      this.call('todo', 'update_item', { entity_id: id, item: uid, status }).then(() => this._refresh(id));
    }
    removeItem(ev, key) {
      const [id, uid] = key.split('|');
      this._ovr[key] = 'deleted'; this._queue();
      this.call('todo', 'remove_item', { entity_id: id, item: uid }).then(() => this._refresh(id));
    }

    body() {
      const s = this.state;
      const lists = this._lists();
      const cur = lists.some(l => l.id === s.tab) ? s.tab : lists.length ? lists[0].id : null;
      this._cur = cur;
      const data = {}; for (const l of lists) data[l.id] = this._norm(l.id, this._items(l.id));
      const inList = cur ? data[cur] : [];
      const done = inList.filter(x => x.done).length;
      const order = { h: 0, m: 1, l: 2 };
      const shown = inList.filter(x => s.filter === 'all' || (s.filter === 'open' ? !x.done : s.filter === 'done' ? x.done : x.prio === 'h' && !x.done)).sort((p, q) => (p.done - q.done) || ((order[p.prio] ?? 1.5) - (order[q.prio] ?? 1.5)));
      this._shown = shown;
      const tag = (p, full) => p ? ({ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 8, background: a(PR[p][1], full ? 0.9 : 0.18), color: full ? '#141416' : PR[p][1], whiteSpace: 'nowrap' }) : { display: 'none' };
      const headline = inList.length - done ? `${inList.length - done} gjenstår` : 'Alt er gjort';
      const subline = `${inList.length} oppgaver · ${done} fullført`;
      const progress = { width: `${inList.length ? done / inList.length * 100 : 0}%`, height: '100%', borderRadius: 3, background: GREEN, transition: 'width .4s' };
      const tabs = lists.map(l => { const act = cur === l.id, n = data[l.id].filter(x => !x.done).length; return { k: l.id, label: l.navn, count: n,
        style: { height: 40, borderRadius: 20, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 500, background: act ? PINK : '#1c1c1f', color: act ? '#2a1720' : '#a9a7a2' },
        countStyle: { minWidth: 20, height: 20, borderRadius: 10, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600, background: act ? 'rgba(42,23,32,0.14)' : '#2a2a2d' } }; });
      const draftPrio = { label: PR[s.prio][0], style: { ...tag(s.prio), height: 32, padding: '0 12px', borderRadius: 16, fontSize: 12 } };
      const filters = [['open', 'Åpne'], ['high', 'Høy'], ['done', 'Fullført'], ['all', 'Alle']].map(([k, label]) => ({ k, label, style: { height: 32, padding: '0 13px', borderRadius: 16, fontSize: 12, fontWeight: 500, background: s.filter === k ? '#f4f3ef' : '#1c1c1f', color: s.filter === k ? '#1a1a1c' : '#c9c7c2' } }));
      const items = shown.map((x, i) => ({ key: `${x.list}|${x.uid}`, text: x.text, prioLabel: x.prio ? PR[x.prio][0] : '', prio: tag(x.prio),
        meta: x.done ? ['Fullført', x.who].filter(Boolean).join(' · ') : [x.who, dueTxt(x.due)].filter(Boolean).join(' · '),
        row: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 4px', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none', opacity: x.done ? 0.55 : 1, transition: 'opacity .2s' },
        box: { width: 26, height: 26, borderRadius: 9, flex: 'none', marginTop: 1, display: 'grid', placeItems: 'center', background: x.done ? GREEN : 'transparent', boxShadow: x.done ? 'none' : 'inset 0 0 0 1.5px #5d5c5a', transition: 'background .2s' },
        check: { fontSize: 18, color: '#141416', opacity: x.done ? 1 : 0, fontVariationSettings: "'wght' 600" },
        textStyle: { fontSize: 14, lineHeight: 1.4, textWrap: 'pretty', textDecoration: x.done ? 'line-through' : 'none' } }));
      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:20px">
  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Gjøremål</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section style="display:flex;flex-direction:column;gap:6px;padding:0 4px">
    <div style="font-size:24px;font-weight:500;letter-spacing:-0.015em"><span>${e(headline)}</span></div>
    <div style="font-size:14px;color:#8e8d89"><span>${e(subline)}</span></div>
    <div style="height:6px;border-radius:3px;background:#1f1f22;overflow:hidden;margin-top:8px"><div style="${S(progress)}"></div></div>
  </section>

  ${tabs.length <= 3 && tabs.every(t => String(t.label).length <= (tabs.length > 2 ? 11 : 17)) ? KD.segHTML('lister', tabs.map(t => [t.k, t.count ? `${t.label} · ${t.count}` : t.label]), cur, 'goTab', { pink: true, h: 40 })
    : `<div data-key="tabs-rull" style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 calc(-1 * var(--kd-kant,10px));padding:0 var(--kd-kant,10px)">
    ${tabs.map(t => `<button data-key="tab-${e(t.k)}" data-on-click="goTab" data-arg="${e(t.k)}" style="${S({ ...t.style, flex: 'none', maxWidth: 200, padding: '0 8px 0 16px', whiteSpace: 'nowrap' })}"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis">${e(t.label)}</span><span style="${S({ ...t.countStyle, flex: 'none' })}"><span>${e(t.count)}</span></span></button>`).join('')}
  </div>`}

  <form style="display:flex;align-items:center;gap:10px;height:52px;padding:0 8px 0 16px;border-radius:26px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05)">
    <span class="ms" style="font-size:20px;color:#6d6c69">add</span>
    <input data-kd-draft="1" data-on-input="setDraft" data-on-keydown="draftKey" value="${e(s.draft)}" placeholder="Ny oppgave" enterkeyhint="done" style="flex:1;min-width:0;height:100%;font-size:14px">
    <button type="button" data-on-click="cyclePrio" style="${S(draftPrio.style)}"><span>${e(draftPrio.label)}</span></button>
  </form>

  <div style="display:flex;gap:6px">
    ${filters.map(f => `<button data-on-click="goFilter" data-arg="${f.k}" style="${S(f.style)}"><span>${e(f.label)}</span></button>`).join('')}
  </div>

  <section style="display:flex;flex-direction:column">
    ${items.map(i => `<div data-key="${e(i.key)}" style="${S(i.row)}">
        <button data-on-click="toggleItem" data-arg="${e(i.key)}" style="${S(i.box)}"><span class="ms" style="${S(i.check)}">check</span></button>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
          <span style="${S(i.textStyle)}"><span>${e(i.text)}</span></span>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            <span style="${S(i.prio)}"><span>${e(i.prioLabel)}</span></span>
            <span style="font-size:11px;color:#6d6c69"><span>${e(i.meta)}</span></span>
          </div>
        </div>
        <button data-on-click="removeItem" data-arg="${e(i.key)}" title="Slett" style="width:32px;height:32px;border-radius:16px;display:grid;place-items:center;color:#6d6c69;flex:none"><span class="ms" style="font-size:18px">close</span></button>
      </div>`).join('')}
    ${!shown.length ? `<div style="padding:30px 0;text-align:center;font-size:14px;color:#6d6c69">${lists.length ? 'Ingen oppgaver her' : 'Fant ingen gjøremålslister'}</div>` : ''}
  </section>
</div>`;
    }
    noop() { }
  }
  // Gjøremålskortet har egne input-regler (samme som designet)
  KDGjoremalCard.sheetCss = `input{font:inherit;color:inherit;border:0;background:none;padding:0;cursor:text;outline:none}input::placeholder{color:#6d6c69}`;

  KD.define('kd-gjoremal-card', KDGjoremalCard, 'KD Gjøremål', 'Gjøremålslister med prioritet – pikselkopi av Claude Design «Gjøremål»');
  KD.sheet('todo', 'kd-gjoremal-card');
})();
} catch (e) { console.error('ki-hjem-design: 63-kd-gjoremal-card.js', e); }

/* ===== 64-kd-soppel-card.js ===== */
try {
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
      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:16px">
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
} catch (e) { console.error('ki-hjem-design: 64-kd-soppel-card.js', e); }

/* ===== 70-kd-lys-card.js ===== */
try {
/*
 * kd-lys-card – «Lys v2» fra Claude Design (pikselkopi) med ekte data.
 *
 *   type: custom:kd-lys-card          # virker uten noe mer
 *   fane: out                         # out | f1 | f2 | on (startfane)
 *   utelys: light.ute_lys             # utelysgruppe (på/av-pillen i scenen)
 *   utelamper: [light.verandalamp, light.utelys_inngang]
 *   neste_paa / neste_av / auto / kveld / morgen   # KI Utelys (finnes automatisk)
 *   innstillinger: [number.ki_utelys_terskel_paa, …]         # rader i «Innstillinger» (standard: alle number/time/select.ki_utelys_*)
 *   sol: sun.sun
 *   hele_huset: sensor.hele_huset_lys # ki_rom – alle lys som er på
 *   effekt: sensor.lys_power          # effekt for belysning (ellers summen av sensor.<lys>_power)
 *   rom: { stue: { navn: 'Stuen' } }  # overstyr/utvid romtabellen (KD.ROOMS)
 *   etasjer: { f1: [stue, kjokken], f2: [pult, soverom] }   # overstyr etasjene
 *   skjul: [light.x, 'switch.pultvifte_*']                  # lys som ikke vises (erstatter standardlista)
 *
 * Lysene per rom hentes fra ki_rom (`sensor.<rom>_lys` → `entiteter`, `sensor.<rom>_lys_oversikt` → `lys`/`scener`),
 * ellers fra HA-områdene (hass.entities/devices/areas), ellers fra medlemmene i romgruppa (light.<rom>_lys).
 * Scenene bruker ki_rom sine knapper (`button.<rom>_lys_<scene>`) og faller tilbake til light.turn_on brightness_pct.
 *
 * KD.LYSH (felles lys-/romhjelpere) defineres her og brukes også av kd-rom-card (71).
 */
(() => {
  const KD = window.KD;
  if (!KD || !KD.KDSheet) return;
  const S = KD.S, E = KD.e;

  /* ======================================================================
   * KD.LYSH – felles hjelpere for lys og rom (ki_rom + HA-områder)
   * ==================================================================== */
  const H = KD.LYSH = KD.LYSH || {};
  H.Y = 'oklch(0.86 0.12 95)';
  const BADS = new Set(['unknown', 'unavailable', '', 'none']);

  /** Standard «skjul» per rom (fra brukerens gamle rom-popuper). Glob med * er lov. */
  H.SKJUL = {
    stue: ['media_player.tv_stue_a75_3'],
    pult: ['light.pultvifte_led', 'switch.pultvifte_*'],
    soverom: ['light.stavifte_led', 'light.sebastian_taklampe_1', 'light.sebastian_taklampe_2', 'light.sebastian_taklampe_3', 'light.sebastian_taklampe_4', 'switch.stavifte_*'],
    do: ['light.creality_k2_light', 'light.do_klimasensor_status_led'],
    inngang: ['switch.alarm_alarm_heimdall_2', 'switch.trappegang_roykvarsler_alarm_siren', 'switch.ringeklokke_boks', 'switch.shelly_em'],
    kjokken: ['switch.*gulvvarme*', '*_tuya_child_lock'],
    vaskegang: ['switch.*gulvvarme*', '*_tuya_child_lock'],
  };
  /** Standard effekt-par (bryter → effektsensor) */
  H.EFFEKT_PAR = {
    kjokken: { 'switch.brodrister': 'sensor.brodrister_power', 'switch.vannkoker': 'sensor.vannkoker_power', 'switch.kjoleskap': 'sensor.kjoleskap_power', 'switch.mikrobolgeovn': 'sensor.mikrobolgeovn_power', 'switch.kaffetrakter': 'sensor.kaffetrakter_power', 'switch.oppvaskmaskin': 'sensor.oppvaskmaskin_power' },
    vaskegang: { 'switch.fryseskap': 'sensor.fryseskap_power', 'switch.vaskemaskin': 'sensor.vaskemaskin_power' },
  };

  /** Glob-liste → test-funksjon */
  H.matcher = (list) => {
    const res = [].concat(list || []).filter(Boolean).map(p => new RegExp('^' + String(p).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'));
    return id => res.some(re => re.test(id));
  };
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  /** «Stue Grønn sofalampe» → «Grønn sofalampe» */
  H.strip = (name, rooms) => {
    let n = String(name || '');
    for (const r of [].concat(rooms || []).filter(Boolean).map(x => String(x).toLowerCase()).sort((a, b) => b.length - a.length)) {
      if (n.toLowerCase().startsWith(r + ' ')) n = n.slice(r.length + 1);
      if (n.toLowerCase().endsWith(' ' + r)) n = n.slice(0, -(r.length + 1));
    }
    n = n.trim();
    return cap(n) || name;
  };
  H.slug = s => String(s || '').toLowerCase().replace(/ø|ö/g, 'o').replace(/æ|ä|å/g, 'a').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  /* ---- ki_rom-sensorer ---- */
  let OV = null, OV_T = 0, OV_H = null;
  /** alle sensor.*_oversikt fra ki_rom (bufret 30 s) */
  H.ovIds = (hass) => {
    const now = Date.now();
    if (!OV || OV_H !== hass.states && now - OV_T > 30000 || OV.some(id => !hass.states[id])) {
      OV = Object.keys(hass.states).filter(id => id.startsWith('sensor.') && id.endsWith('_oversikt') && hass.states[id].attributes.integrasjon === 'ki_rom' && hass.states[id].attributes.area_id !== 'totalt');
      OV_T = now; OV_H = hass.states;
    }
    return OV;
  };
  const LO_CACHE = new Map(), LO_MISS = new Map();
  /** ki_rom sin romoversikt (sensor.<rom>_oversikt) */
  H.ov = (card, id) => {
    const h = card.hass; if (!h) return null;
    let st = card.st(`sensor.${id}_oversikt`);
    if (st && st.attributes.integrasjon === 'ki_rom') return st;
    const f = H.ovIds(h).find(x => h.states[x].attributes.area_id === id);
    return f ? card.st(f) : null;
  };
  /** lysscene-oversikten (sensor.<slug>_lys_oversikt, integrasjon ki_lys/ki_rom, ki_type oversikt) */
  H.lysOv = (card, id) => {
    const h = card.hass; if (!h) return null;
    const hit = LO_CACHE.get(id);
    if (hit && h.states[hit]) return card.st(hit);
    const ok = x => { const a = h.states[x] && h.states[x].attributes; return a && a.ki_type === 'oversikt' && (a.integrasjon === 'ki_lys' || a.integrasjon === 'ki_rom'); };
    let f = ok(`sensor.${id}_lys_oversikt`) ? `sensor.${id}_lys_oversikt` : null;
    const miss = LO_MISS.get(id);
    if (!f && miss && Date.now() - miss < 30000) return null; // fullt søk maks hvert 30. s
    if (!f) f = Object.keys(h.states).find(x => x.startsWith('sensor.') && x.endsWith('_lys_oversikt') && ok(x) && (h.states[x].attributes.area_id === id || (h.states[x].attributes.area_ids || []).length === 1 && h.states[x].attributes.area_ids[0] === id));
    if (f) { LO_CACHE.set(id, f); LO_MISS.delete(id); return card.st(f); }
    LO_MISS.set(id, Date.now());
    return null;
  };

  /* ---- HA-registeret (hass.entities / hass.devices / hass.areas) ---- */
  const AREA_MAP = new WeakMap();
  /** { area_id: [entity_id] } fra registeret (entitetens område, ellers enhetens) */
  H.areaMap = (hass) => {
    const ents = hass && hass.entities;
    if (!ents) return {};
    let m = AREA_MAP.get(ents);
    if (m) return m;
    m = {};
    const devs = hass.devices || {};
    for (const [id, e] of Object.entries(ents)) {
      if (!e || e.hidden || e.hidden_by || e.disabled_by || e.entity_category) continue;
      const aid = e.area_id || (e.device_id && devs[e.device_id] && devs[e.device_id].area_id);
      if (aid) (m[aid] = m[aid] || []).push(id);
    }
    for (const k in m) m[k].sort();
    AREA_MAP.set(ents, m);
    return m;
  };
  H.areaName = (hass, id) => (hass && hass.areas && hass.areas[id] && hass.areas[id].name) || null;
  H.areaOf = (hass, id) => {
    const e = hass && hass.entities && hass.entities[id]; if (!e) return null;
    return e.area_id || (e.device_id && hass.devices && hass.devices[e.device_id] && hass.devices[e.device_id].area_id) || null;
  };
  const isPower = (st) => {
    if (!st) return false;
    const u = String(st.attributes.unit_of_measurement || '');
    if (/wh$/i.test(u)) return false;
    return st.attributes.device_class === 'power' || /^w$|^kw$/i.test(u);
  };
  /** Finn effektsensor for en bryter/klima: samme enhet i registeret, ellers navnemønster */
  H.findPower = (hass, id) => {
    if (!hass || !id) return null;
    const slug = id.split('.')[1];
    const ent = hass.entities && hass.entities[id];
    if (ent && ent.device_id) {
      const same = Object.values(hass.entities).filter(x => x.device_id === ent.device_id && x.entity_id.startsWith('sensor.') && isPower(hass.states[x.entity_id]))
        .map(x => x.entity_id).sort((a, b) => (/(daily|total|energy)/.test(a) ? 1 : 0) - (/(daily|total|energy)/.test(b) ? 1 : 0));
      if (same.length) return same[0];
    }
    for (const c of [`sensor.${slug}_power`, `sensor.${slug}_effekt`, `sensor.${slug}_current_power_w`, `sensor.${slug}_power_w`, `sensor.${slug}_watt`]) if (isPower(hass.states[c])) return c;
    return null;
  };
  /** Romoversikt i ki_rom-format bygget fra HA-registeret (når ki_rom mangler) */
  H.areaOverview = (hass, areaId) => {
    const ids = (H.areaMap(hass)[areaId] || []).filter(id => hass.states[id]);
    const dom = d => ids.filter(id => id.startsWith(d + '.'));
    const dc = id => hass.states[id].attributes.device_class;
    const withP = l => l.map(id => ({ entity: id, effekt: H.findPower(hass, id) }));
    const bin = ['motion', 'occupancy', 'presence', 'moving', 'vibration', 'door', 'window', 'opening', 'garage_door', 'sound'];
    const sens = dom('sensor');
    return {
      integrasjon: null, area_id: areaId, rom: H.areaName(hass, areaId),
      lys: dom('light'), media: dom('media_player'), brytere: withP(dom('switch')), vifter: withP(dom('fan')), klima: withP(dom('climate')),
      gardiner: dom('cover'), sensorer: dom('binary_sensor').filter(id => bin.includes(dc(id))).map(id => ({ entity: id, klasse: dc(id) })),
      skript: dom('script'), scener: dom('scene'),
      temperatur: sens.filter(id => dc(id) === 'temperature'), fuktighet: sens.filter(id => dc(id) === 'humidity'),
      lysniva: sens.filter(id => dc(id) === 'illuminance'), effekt: sens.filter(id => isPower(hass.states[id])),
    };
  };

  /**
   * Lysene i et rom (r = rad fra KD.rooms). Rekkefølge: ki_rom-telleren, ki_rom-lysoversikten,
   * HA-området, medlemmene i romgruppa. Grupper fjernes når medlemmene er med. skjul = test-funksjon.
   */
  H.lights = (card, r, skjul) => {
    const h = card.hass; if (!h) return [];
    let ids = [];
    const cnt = KD.kiRom(card, r.id, 'lys');
    if (cnt && Array.isArray(cnt.attributes.entiteter)) ids.push(...cnt.attributes.entiteter);
    const lo = H.lysOv(card, r.id);
    if (lo && Array.isArray(lo.attributes.lys)) ids.push(...lo.attributes.lys);
    if (!ids.length) ids.push(...(H.areaMap(h)[r.id] || []).filter(id => id.startsWith('light.')));
    if (!ids.length && r.lys) { const g = h.states[r.lys]; const mem = g && g.attributes.entity_id; ids.push(...(Array.isArray(mem) && mem.length ? mem : [r.lys])); }
    ids = [...new Set(ids)].filter(id => h.states[id] && !(skjul && skjul(id)));
    const set = new Set(ids);
    ids = ids.filter(id => { const m = h.states[id].attributes.entity_id; return !(Array.isArray(m) && m.length && m.some(x => set.has(x))); });
    return ids;
  };
  /** Romnavn-varianter som strippes fra lysnavn */
  H.roomWords = (card, r) => {
    const out = [r.navn, r.id.replace(/_/g, ' '), H.areaName(card.hass, r.id)];
    const ov = H.ov(card, r.id); if (ov && ov.attributes.rom) out.push(ov.attributes.rom);
    return out;
  };
  H.nameOf = (card, id, words) => H.strip(card.at(id, 'friendly_name') || id.split('.')[1].replace(/_/g, ' '), words);

  /** Lysnivå i prosent: 0 = av, null = utilgjengelig. { v, dim } */
  H.level = (card, id) => {
    const st = card.st(id);
    if (!st || BADS.has(st.state)) return { v: 0, bad: true, dim: false };
    const modes = st.attributes.supported_color_modes || [];
    const dim = id.startsWith('light.') && (st.attributes.brightness != null || modes.some(m => m !== 'onoff'));
    if (st.state !== 'on') return { v: 0, dim };
    const b = st.attributes.brightness;
    return { v: b != null ? Math.max(1, Math.round(b / 255 * 100)) : 100, dim, onoff: b == null };
  };
  /** Prosentverdi slik den vises nå (drag/optimistisk verdi først) */
  H.shown = (card, id) => {
    const d = card.state.drag;
    if (d && d.id === id) return { v: d.v, dim: true, drag: true };
    const p = card._pend && card._pend[id];
    const lv = H.level(card, id);
    if (p && card.hass.states[id] === p.ref && Date.now() - p.t < 5000) return { ...lv, v: p.v, onoff: false };
    return lv;
  };
  H.valText = (lv) => lv.bad ? '–' : lv.v ? (lv.onoff ? 'På' : `${lv.v} %`) : 'Av';

  /** Designets lys-pille (brukes av både Lys- og Rom-arket). rom=true gir Rom-variantens små forskjeller. */
  H.pill = (card, id, name, rom) => {
    const lv = H.shown(card, id), v = lv.v, Y = H.Y, a = KD.a;
    const moving = card._d && card._d.moved;
    const pill = { position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 8, height: 56, padding: '0 12px 0 6px', borderRadius: 28, background: '#1c1c1f', touchAction: 'pan-y', cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' };
    const fill = { position: 'absolute', left: 0, top: 0, bottom: 0, width: `${v}%`, background: `linear-gradient(90deg, ${a(Y, 0.18)}, ${a(Y, 0.42)})`, transition: moving ? 'none' : 'width .35s cubic-bezier(.34,1.2,.64,1)' };
    const iconWrap = { position: 'relative', width: 44, height: 44, borderRadius: 22, flex: 'none', display: 'grid', placeItems: 'center', background: v ? Y : '#2a2a2d', color: v ? '#141416' : '#6d6c69', transition: 'background .25s' };
    const valStyle = rom ? { fontSize: 11, color: v ? '#e6e4df' : '#6d6c69', fontVariantNumeric: 'tabular-nums' } : { fontSize: 11, color: v ? '#e6e4df' : '#6d6c69' };
    return `<div data-key="${E(id)}" data-arg="${E(id)}" data-on-pointerdown="lDown" data-on-pointermove="lMove" data-on-pointerup="lUp" data-on-pointercancel="lCancel" data-on-contextmenu="lMenu" style="${S(pill)}">
              <span style="${S(fill)}"></span>
              <span style="${S(iconWrap)}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">lightbulb</span></span>
              <span style="position:relative;flex:1;min-width:0;display:flex;flex-direction:column${rom ? ';gap:0' : ''}">
                <span style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(name)}</span>
                <span style="${S(valStyle)}">${E(H.valText(lv))}</span>
              </span>
            </div>`;
  };

  /* ----- Skjul/vis valgt i UI (lagres som HA-brukerdata, følger brukeren på alle enheter) -----
   * { <rom>: { skjul: [entity_id], vis: [entity_id] } }  – «vis» opphever standard-/config-skjul. */
  H.userHide = (card) => KD.userData(card);
  H.saveUserHide = (card, map) => KD.saveUserData(card, map);
  H.userHideNow = (card) => KD.userData(card);
  /** Kombiner standard/config-skjul med brukerens valg for ett rom (eller alle rom når romId mangler) */
  H.hideFn = (card, base, romId) => {
    const ud = H.userHideNow(card), rows = romId ? [ud[romId] || {}] : Object.values(ud);
    const sk = new Set(rows.flatMap(x => x.skjul || [])), vis = new Set(rows.flatMap(x => x.vis || []));
    return id => sk.has(id) || (base(id) && !vis.has(id));
  };

  /** Metoder for dimming ved dra / av-på ved trykk. Blandes inn i kortklassene. */
  H.mixin = {
    /* Dra vannrett = dim, loddrett = scroll (avbryter), kort stille trykk = av/på. */
    lDown(ev, id, el) { if (ev.button > 0) return; this._d = { id, x: ev.clientX, y: ev.clientY, t: Date.now(), moved: false, scroll: false, el, pid: ev.pointerId }; },
    lMove(ev, id) {
      const d = this._d; if (!d || d.id !== id || d.scroll || this.state.edit) return;
      const dx = ev.clientX - d.x, dy = ev.clientY - d.y;
      if (!d.moved) {
        if (Math.abs(dy) > 8 && Math.abs(dy) >= Math.abs(dx)) { d.scroll = true; return; }   // brukeren scroller
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) { d.moved = true; try { d.el.setPointerCapture(d.pid); } catch (e) { /* ok */ } this.haptic('selection'); }
        else return;
      }
      const r = d.el.getBoundingClientRect();
      const v = Math.round(KD.clamp((ev.clientX - r.left) / r.width, 0, 1) * 100);
      if (!this.state.drag || this.state.drag.v !== v || this.state.drag.id !== id) this.setState({ drag: { id, v } });
    },
    lUp(ev, id) {
      const d = this._d; this._d = null;
      if (!d || d.id !== id || d.scroll) { if (this.state.drag) this.setState({ drag: null }); return; }
      const still = Math.abs(ev.clientX - d.x) < 8 && Math.abs(ev.clientY - d.y) < 8 && Date.now() - d.t < 600;
      if (!d.moved) { if (still) { this.haptic('light'); this.lightTap(id); } }
      else if (this.state.drag) { this.haptic('light'); this.setLight(id, this.state.drag.v); }
      this.setState({ drag: null });
    },
    lCancel() { this._d = null; if (this.state.drag) this.setState({ drag: null }); },
    lMenu(ev, id) { ev.preventDefault(); this._d = null; this.more(id); },
    /** sett lysstyrke (0 = av) – optimistisk visning til HA svarer */
    setLight(id, v) {
      this._pend = this._pend || {};
      this._pend[id] = { v, t: Date.now(), ref: this.hass && this.hass.states[id] };
      setTimeout(() => this._queue(), 5100);
      if (this.onLightChange) this.onLightChange(id);
      const d = id.split('.')[0];
      if (!v) return this.call(d === 'light' ? 'light' : 'homeassistant', 'turn_off', { entity_id: id });
      if (d !== 'light') return this.call('homeassistant', 'turn_on', { entity_id: id });
      return this.call('light', 'turn_on', { entity_id: id, brightness_pct: v });
    },
    lightTap(id) {
      if (this.state.edit && this.hideTog) return this.hideTog(null, id);
      const on = this.v(id) === 'on', d = id.split('.')[0];
      if (this.onLightChange) this.onLightChange(id);
      if (on) { this._pend = this._pend || {}; this._pend[id] = { v: 0, t: Date.now(), ref: this.hass && this.hass.states[id] }; setTimeout(() => this._queue(), 5100); }
      return this.call(d === 'light' ? 'light' : 'homeassistant', on ? 'turn_off' : 'turn_on', { entity_id: id });
    },
    /** slå mange av/på (blandet domene) */
    setMany(ids, on) { if (!ids.length) return; if (this.onLightChange) this.onLightChange(null); return this.call('homeassistant', on ? 'turn_on' : 'turn_off', { entity_id: ids }); },
  };

  /** Klokkeslett + dagord («i dag», «i morgen», ukedag) fra ISO-tid eller «HH:MM» */
  H.when = (val) => {
    if (val == null || BADS.has(String(val))) return null;
    const d = new Date(val);
    if (isNaN(d)) return { dag: '', kl: String(val) };
    const n = new Date(), m = new Date(n); m.setDate(n.getDate() + 1);
    const kl = KD.hm(d);
    if (d.toDateString() === n.toDateString()) return { dag: 'i dag', kl, d };
    if (d.toDateString() === m.toDateString()) return { dag: 'i morgen', kl, d };
    return { dag: d.toLocaleDateString('nb-NO', { weekday: 'long' }), kl, d };
  };

  /** mdi-ikon (HA-område) → Material Symbols */
  H.msIcon = (mdi, def = 'home') => {
    const k = String(mdi || '').replace(/^mdi:/, '');
    const M = [[/sofa|couch/, 'weekend'], [/bed-king|bed-double/, 'king_bed'], [/bed/, 'bed'], [/silverware|stove|countertop|fridge|kitchen|chef/, 'countertops'], [/shower|bath/, 'bathtub'], [/toilet/, 'wc'],
      [/desk|office/, 'desk'], [/door/, 'door_front'], [/stair/, 'stairs'], [/garage/, 'garage'], [/tree|forest|flower|grass|nature/, 'park'], [/washing|laundry/, 'local_laundry_service'],
      [/television|tv/, 'tv'], [/laptop|monitor|desktop/, 'computer'], [/baby|child|teddy/, 'child_care'], [/balcony|deck|patio|umbrella/, 'deck'], [/home|house/, 'home']];
    for (const [re, ic] of M) if (re.test(k)) return ic;
    return def;
  };

  /* ======================================================================
   * kd-lys-card
   * ==================================================================== */
  const Y = H.Y, G = 'oklch(0.72 0.14 150)', PINK = KD.PINK, a = KD.a;
  const STARS = [[8, 14], [18, 30], [30, 10], [40, 24], [52, 8], [60, 34], [70, 16], [84, 28], [92, 12], [24, 46], [46, 44], [78, 42]];
  /* Designets scener → ki_rom-scener (button.<rom>_lys_<id>) og nivå for reserve-dimming */
  const SC = [['max', 'Maks', 'light_mode', 100, 'maks'], ['kveld', 'Kveld', 'weekend', 45, 'komfort'], ['dim', 'Dempet', 'brightness_4', 20, 'mindre'], ['natt', 'Natt', 'bedtime', 5, 'natt'], ['av', 'Alt av', 'dark_mode', 0, 'av']];
  /* Kjente KI Utelys-innstillinger med designets tekster */
  const INST = [[/terskel_(paa|på|on)$/, 'Tenn når lysnivå under'], [/terskel_(av|off)$/, 'Slukk når lysnivå over'], [/minst_morke$/, 'Minste mørketid'], [/forskyv.*kveld|kveld.*forskyv/, 'Forskyvning kveld'], [/morgen_fra$/, 'Morgen fra'], [/slukk_senest$/, 'Slukk senest']];

  class KDLysCard extends KD.KDSheet {
    static get sheetCss() {
      return `@keyframes tw{0%,100%{opacity:.25}50%{opacity:1}}@keyframes glow{0%,100%{opacity:.75}50%{opacity:1}}
.kdl-a97:active{transform:scale(0.97)}.kdl-a96:active{transform:scale(0.96)}
a:hover{color:oklch(0.86 0.12 95)}`;
    }

    /** registeret (områder/enheter) kan komme eller endres uten at noen state endres */
    set hass(h) { const old = this._hass; super.hass = h; if (old && h && (old.entities !== h.entities || old.devices !== h.devices || old.areas !== h.areas)) this._queue(); }
    get hass() { return this._hass; }
    /* ----- entitetsoppslag ----- */
    _has(id) { return !!(id && this.hass && this.hass.states[id]); }
    /** config-verdi hvis den finnes, ellers første entitet som matcher mønsteret */
    _pick(key, re) {
      const c = this.config[key];
      if (this._has(c)) return c;
      this._pk = this._pk || {};
      const p = this._pk[key];
      if (p && (p.id ? this._has(p.id) : Date.now() - p.t < 30000)) return p.id; // søk maks hvert 30. s
      const f = re ? Object.keys(this.hass.states).find(id => re.test(id)) : null;
      this._pk[key] = { id: f || null, t: Date.now() };
      return f || null;
    }
    _skjul() {
      if (!this._skjulFn || this._skjulSrc !== this.config.skjul) {
        this._skjulSrc = this.config.skjul;
        this._skjulFn = H.matcher(this.config.skjul != null ? this.config.skjul : Object.values(H.SKJUL).flat().filter(x => /^light\./.test(x)));
      }
      return H.hideFn(this, this._skjulFn);
    }

    /** Rom per fane: { f1: [{r, lights}], f2: [...], out: [...] } */
    _floors() {
      const h = this.hass, cfg = this.config;
      const rooms = KD.rooms(cfg.rom);
      // ki_rom-rom som ikke står i tabellen
      for (const id of H.ovIds(h)) {
        const at = h.states[id].attributes, aid = at.area_id;
        if (aid && !rooms[aid]) rooms[aid] = { id: aid, navn: at.rom || H.areaName(h, aid) || cap(aid.replace(/_/g, ' ')), ikon: H.msIcon(at.ikon), _niva: at.etasje_niva };
      }
      // HA-områder med lys (når ki_rom mangler)
      if (!H.ovIds(h).length && h.areas) {
        const am = H.areaMap(h);
        for (const aid of Object.keys(h.areas)) if (!rooms[aid] && (am[aid] || []).some(x => x.startsWith('light.'))) rooms[aid] = { id: aid, navn: h.areas[aid].name || aid, ikon: H.msIcon(h.areas[aid].icon) };
      }
      const niva = (r) => {
        if (r._niva != null) return r._niva;
        const ov = h.states[`sensor.${r.id}_oversikt`];
        if (ov && ov.attributes.etasje_niva != null) return ov.attributes.etasje_niva;
        const ar = h.areas && h.areas[r.id], fl = ar && ar.floor_id && h.floors && h.floors[ar.floor_id];
        return fl ? fl.level : null;
      };
      const explicit = cfg.etasjer && typeof cfg.etasjer === 'object' ? cfg.etasjer : null;
      const lvlTab = {};
      if (!explicit) for (const r of Object.values(rooms)) { const l = niva(r); if (l != null && (r.etasje === '1' || r.etasje === '2')) lvlTab[l] = lvlTab[l] || (r.etasje === '1' ? 'f1' : 'f2'); }
      const out = { f1: [], f2: [], out: [] };
      const skjul = this._skjul();
      const add = (tab, r) => { const lights = H.lights(this, r, skjul); if (lights.length) out[tab].push({ r, lights }); };
      if (explicit) {
        for (const tab of ['f1', 'f2']) for (const id of [].concat(explicit[tab] || [])) if (rooms[id]) add(tab, rooms[id]);
        return out;
      }
      for (const r of Object.values(rooms)) {
        if (r.etasje === '0' || r.id === 'ute') continue;
        const tab = r.etasje === '1' ? 'f1' : r.etasje === '2' ? 'f2' : (lvlTab[niva(r)] || 'f1');
        add(tab, r);
      }
      return out;
    }

    /* ----- handlinger ----- */
    tab(ev, k) { this.setState({ tab: k }); }
    onLightChange() { if (this.state.scene) this.setState({ scene: null }); }
    toggleOut() {
      const ids = this._outIds();
      const on = ids.some(id => this.v(id) === 'on');
      if (on) return this.setMany(ids.filter(id => this.v(id) === 'on'), false);
      const g = this.config.utelys;
      return this.setMany(this._has(g) ? [g] : ids, true);
    }
    autoTog(ev, id) { this.toggle(id); }
    lampTog(ev, id) { this.toggle(id); }
    fold(ev, k) { this.setState(st => ({ fold: { ...(st.fold || {}), [k]: !(st.fold || {})[k] } })); }
    rowMore(ev, id) { this.more(id); }
    roomAll(ev, arg) {
      const [tab, i] = arg.split(':'); const g = this._fl && this._fl[tab] && this._fl[tab][+i]; if (!g) return;
      const on = g.lights.filter(id => this.v(id) === 'on');
      this.setState({ scene: null });
      return this.setMany(on.length ? on : g.lights, !on.length);
    }
    sceneGo(ev, k) {
      const sc = SC.find(x => x[0] === k); if (!sc) return;
      const floor = this.state.tab === 'f2' ? 'f2' : 'f1';
      const groups = (this._fl && this._fl[floor]) || [];
      for (const g of groups) {
        const lo = H.lysOv(this, g.r.id);
        const list = lo && Array.isArray(lo.attributes.scener) ? lo.attributes.scener : [];
        const btn = (list.find(s => s.id === sc[4]) || {}).entity || `button.${g.r.id}_lys_${sc[4]}`;
        if (this._has(btn)) { this.press(btn); continue; }
        // reserve: sett nivået direkte
        const lvl = sc[3];
        if (!lvl) this.call('homeassistant', 'turn_off', { entity_id: g.lights });
        else {
          const dim = g.lights.filter(id => id.startsWith('light.')), rest = g.lights.filter(id => !id.startsWith('light.'));
          if (dim.length) this.call('light', 'turn_on', { entity_id: dim, brightness_pct: lvl });
          if (rest.length) this.call('homeassistant', 'turn_on', { entity_id: rest });
        }
      }
      this.setState({ scene: k });
    }
    allOff() {
      const ids = (this._onList || []).map(l => l.id);
      this.setState({ scene: 'av' });
      return this.setMany(ids, false);
    }
    offOne(ev, id) { this.setLight(id, 0); }

    _outIds() {
      const c = this.config, h = this.hass;
      const lamps = [].concat(c.utelamper || []).filter(id => this._has(id));
      const g = this._has(c.utelys) ? c.utelys : null;
      let ids = [...lamps];
      if (!ids.length && g) { const m = h.states[g].attributes.entity_id; if (Array.isArray(m)) ids = m.filter(x => this._has(x)); }
      if (!ids.length) ids = H.lights(this, { id: 'ute', lys: g }, this._skjul());
      if (g && !ids.includes(g)) ids = [g, ...ids];
      return ids;
    }

    /* ----- innhold ----- */
    body() {
      const s = this.state, c = this.config, h = this.hass;
      const tab = s.tab || c.fane || 'out';
      const fl = this._fl = this._floors();

      let inner = '';
      if (tab === 'out') inner = this._out();
      else if (tab === 'f1' || tab === 'f2') inner = this._floor(tab, fl[tab]);
      else inner = this._on(fl);

      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:12px">
  <header style="display:flex;align-items:center;gap:12px;padding:0 4px">
    <span style="width:40px;height:40px;border-radius:20px;background:#e9e8e4;color:#141416;display:grid;place-items:center;flex:none"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">lightbulb</span></span>
    <div style="flex:1;font-size:26px;font-weight:500;letter-spacing:-0.02em">Lys</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  ${KD.segHTML('lysfane', [['out', 'Utelys', 'deck'], ['f1', '1. etg'], ['f2', '2. etg'], ['on', 'Lys på']], tab, 'tab', { pink: true })}
${inner}
</div>`;
    }

    _out() {
      const c = this.config, h = this.hass;
      const ids = this._outIds();
      const out = ids.some(id => this.v(id) === 'on');
      const nPaa = this._pick('neste_paa', /^sensor\.(ki_)?utelys.*neste_(paa|på|on)$/), nAv = this._pick('neste_av', /^sensor\.(ki_)?utelys.*neste_(av|off)$/);
      const wPaa = H.when(nPaa && this.v(nPaa)), wAv = H.when(nAv && this.v(nAv));
      const sol = this._has(c.sol) ? c.sol : 'sun.sun';
      const rise = H.when(this.at(sol, 'next_rising')), set = H.when(this.at(sol, 'next_setting')), dusk = H.when(this.at(sol, 'next_dusk')), dawn = H.when(this.at(sol, 'next_dawn'));
      const kl = w => w ? w.kl : '–';
      const dag = w => w && w.dag ? ' ' + w.dag : '';
      const mod = w => w && w.d ? w.d.getHours() * 60 + w.d.getMinutes() : null;
      const now = new Date(), nowM = now.getHours() * 60 + now.getMinutes();
      const rM = mod(rise), sM = mod(set);
      const day = this._has(sol) ? this.v(sol) === 'above_horizon' : (rM != null && sM != null ? nowM >= rM && nowM < sM : false);
      // sola/månen langs buen: andel av dagen (sol opp → ned) eller natta (ned → opp)
      let f = 0.5;
      if (rM != null && sM != null) {
        const dl = ((sM - rM) + 1440) % 1440 || 720, nl = 1440 - dl;
        f = day ? (((nowM - rM) + 1440) % 1440) / dl : (((nowM - sM) + 1440) % 1440) / nl;
        f = KD.clamp(f, 0.02, 0.98);
      }
      const nw = out ? wAv : wPaa;
      const nextLabel = (out ? 'Slukkes' : 'Tennes') + dag(nw);
      const sw = on => ({ track: { position: 'relative', width: 46, height: 28, borderRadius: 14, flex: 'none', background: on ? G : '#3a3a3d', transition: 'background .2s' }, knob: { position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: 11, background: '#1c1c1f', transition: 'left .2s' } });
      const autoId = this._pick('auto', /^switch\.(ki_)?utelys.*_(auto|automatikk)$/);
      const autoOn = autoId ? this.isOn(autoId) : true;
      const autos = [
        [autoId, 'smart_toy', 'Automatikk', autoOn ? 'Styrer utelyset etter sola og lysnivå' : 'Av – utelyset styres manuelt', true],
        [this._pick('kveld', /^switch\.(ki_)?utelys.*_kveld$/), 'wb_twilight', 'Kveld', 'Tenn i skumringen', false],
        [this._pick('morgen', /^switch\.(ki_)?utelys.*_morgen$/), 'wb_sunny', 'Morgen', 'Tenn før det lysner', false],
      ].filter(x => x[0]);
      const lamps = [].concat(c.utelamper || []).filter(id => this._has(id));
      const lampList = lamps.length ? lamps : ids.filter(id => id !== c.utelys);
      const lampsOn = lampList.filter(id => H.shown(this, id).v > 0).length;
      // dagslengde
      let dagl = '–';
      if (rise && set && rise.d && set.d) {
        let ms = set.d - rise.d; if (ms < 0) ms += 86400e3; if (ms > 86400e3) ms -= 86400e3;
        const m = Math.round(ms / 60000); dagl = `${Math.floor(m / 60)} t ${m % 60} min`;
      }
      // hvor lenge utelyset står på (tennes → slukkes)
      let onDur = null;
      if (wPaa && wAv && wPaa.d && wAv.d) { let m = Math.round((wAv.d - wPaa.d) / 60000); if (m < 0) m += 1440; if (m > 1440) m -= 1440; onDur = `${Math.floor(m / 60)} t ${m % 60} min`; }
      const st = this.state.fold || {};
      const foldDef = (k, icon, title, meta, rows) => {
        const open = !!st[k];
        return { k, icon, title, meta, open, chev: { fontSize: 22, color: '#a9a7a2', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .25s' },
          rows: rows.map(([k2, v, id, ic], i) => ({ k: k2, v, id, ic, row: { display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: id ? 'pointer' : 'default' } })) };
      };
      // innstillinger: config eller alle KI Utelys-tall/tider
      let instIds = [].concat(c.innstillinger || []).filter(id => this._has(id));
      if (!c.innstillinger) instIds = Object.keys(h.states).filter(id => /^(number|input_number|time|input_datetime|select)\.(ki_)?utelys_/.test(id)).sort((x, y) => {
        const ix = INST.findIndex(([re]) => re.test(x)), iy = INST.findIndex(([re]) => re.test(y));
        return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy) || x.localeCompare(y);
      });
      const instRows = instIds.map(id => {
        const hit = INST.find(([re]) => re.test(id));
        const label = hit ? hit[1] : H.strip(this.fname(id).replace(/^KI Utelys\s*/i, ''), []);
        const stt = this.st(id); let v = stt ? stt.state : '–';
        if (stt && !isNaN(parseFloat(v)) && /^(number|input_number)\./.test(id)) { const n = parseFloat(v); v = (n < 0 ? '−' : '') + KD.nf(Math.abs(n), Number.isInteger(n) ? 0 : 1) + (this.unit(id) ? ' ' + this.unit(id) : ''); }
        else if (stt && /^time\./.test(id)) v = String(v).slice(0, 5);
        else if (!stt || KD.BAD.has(v)) v = '–';
        const ic = /terskel_(paa|på|on)$/.test(id) ? 'brightness_low' : /terskel_(av|off)$/.test(id) ? 'brightness_high' : /morke|mørke/.test(id) ? 'dark_mode' : /^time|input_datetime/.test(id) ? 'schedule' : 'tune';
        return [label, v, id, ic];
      });
      const elev = parseFloat(this.at(sol, 'elevation'));
      const folds = [foldDef('sol', 'light_mode', 'Sola', `↑ ${kl(rise)}  ↓ ${kl(set)}`, [['Daggry', kl(dawn), null, 'wb_twilight'], ['Soloppgang', kl(rise), null, 'wb_sunny'], ['Solnedgang', kl(set), null, 'wb_twilight'], ['Borgerlig skumring', kl(dusk), null, 'nights_stay'], ['Dagslengde', dagl, null, 'hourglass_empty'], ...(isNaN(elev) ? [] : [['Solhøyde nå', `${KD.nf(elev, 1)}°`, null, 'explore']])])];
      if (instRows.length) folds.push(foldDef('inst', 'tune', 'Innstillinger', 'terskler og mørketid', instRows));

      /* ---- tidslinje kl. 12 → 12 (natta i midten) ---- */
      const P = m => ((((m - 720) % 1440) + 1440) % 1440) / 1440 * 100;
      const seg = (a1, b1, css) => { if (a1 == null || b1 == null) return ''; const x = P(a1), y = P(b1); const parts = y >= x ? [[x, y]] : [[x, 100], [0, y]]; return parts.map(([l, r]) => `<span style="position:absolute;top:0;bottom:0;left:${l.toFixed(2)}%;width:${Math.max(0, r - l).toFixed(2)}%;${css}"></span>`).join(''); };
      const dM = mod(dawn), kM = mod(dusk), onM = mod(wPaa), offM = mod(wAv);
      const tl = `<div style="position:relative;height:10px;border-radius:5px;overflow:hidden;background:linear-gradient(90deg,oklch(0.82 0.12 75 / 0.55),oklch(0.86 0.12 95 / 0.35))">
          ${seg(sM, rM, 'background:#262d58')}
          ${seg(sM, kM, `background:linear-gradient(90deg,${a('oklch(0.82 0.12 75)', 0.45)},#262d58)`)}
          ${seg(dM, rM, `background:linear-gradient(90deg,#262d58,${a('oklch(0.82 0.12 75)', 0.45)})`)}
        </div>
        <div style="position:relative;height:4px;margin-top:4px;border-radius:2px;background:rgba(255,255,255,0.06);overflow:hidden">${seg(onM, offM, `background:${Y};box-shadow:0 0 8px ${Y}`)}</div>
        <span style="position:absolute;top:-5px;height:30px;left:calc(${P(nowM).toFixed(2)}% - 1px);width:2px;border-radius:1px;background:#fff;box-shadow:0 0 6px rgba(255,255,255,0.7)"></span>
        <span style="position:absolute;top:-22px;left:${P(nowM).toFixed(2)}%;transform:translateX(-50%);font-size:10px;font-weight:600;color:#fff;letter-spacing:.04em">NÅ</span>`;
      const ticks = ['12', '18', '00', '06', '12'];

      /* ---- himmelen med sol/måne langs buen ---- */
      const HOR = 132, ARC = 84;
      const bx = 50 - 42 * Math.cos(Math.PI * f), by = HOR - ARC * Math.sin(Math.PI * f);
      const sky = day ? 'linear-gradient(180deg,#1b3a5e 0%,#2c5a80 62%,#3a6a7e 100%)' : 'linear-gradient(180deg,#0b1030 0%,#1a1f3d 70%,#232a45 100%)';
      const orb = day
        ? `<span style="position:absolute;left:calc(${bx.toFixed(2)}% - 13px);top:${(by - 13).toFixed(1)}px;width:26px;height:26px;border-radius:13px;background:radial-gradient(circle at 40% 40%,#fff6d6,${Y} 60%);box-shadow:0 0 22px 6px ${a(Y, 0.55)}"></span>`
        : `<span style="position:absolute;left:calc(${bx.toFixed(2)}% - 10px);top:${(by - 10).toFixed(1)}px;width:20px;height:20px;border-radius:50%;box-shadow:inset -6px -2px 0 0 #f1ecd9;transform:rotate(-20deg);filter:drop-shadow(0 0 8px rgba(241,236,217,0.6))"></span>`;
      const lampGlow = (x) => `<span style="position:absolute;left:${x}%;bottom:44px">
          <span style="position:absolute;left:-1px;bottom:0;width:2px;height:16px;background:#3a4150"></span>
          <span style="position:absolute;left:-3px;bottom:16px;width:6px;height:6px;border-radius:3px;background:${out ? '#ffe3a0' : '#3a4150'};box-shadow:${out ? '0 0 10px 3px rgba(255,210,120,0.8)' : 'none'};transition:all .6s;animation:${out ? 'glow 3s ease-in-out infinite' : 'none'}"></span>
          <span style="position:absolute;left:-22px;bottom:-5px;width:44px;height:12px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,210,120,0.55),transparent);opacity:${out ? 1 : 0};transition:opacity .6s"></span></span>`;
      const heroScene = `<div style="position:absolute;inset:0;pointer-events:none">
          ${day ? '' : STARS.map(([x, y], i) => `<span style="${S({ position: 'absolute', left: x + '%', top: (y * 0.8) + '%', width: i % 3 ? 2 : 3, height: i % 3 ? 2 : 3, borderRadius: 2, background: '#fff', animation: 'tw ' + (2 + i % 3) + 's ease-in-out ' + (i * 0.3) + 's infinite' })}"></span>`).join('')}
          <svg viewBox="0 0 100 ${HOR + 4}" preserveAspectRatio="none" style="position:absolute;left:0;top:0;width:100%;height:${HOR + 4}px;overflow:visible"><path d="M 8 ${HOR} A 42 ${ARC} 0 0 1 92 ${HOR}" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1.5" stroke-dasharray="3 5" vector-effect="non-scaling-stroke"/></svg>
          ${orb}
          <span style="position:absolute;left:0;right:0;top:${HOR}px;bottom:0;background:${day ? '#18261e' : '#0f1612'}"></span>
          <span style="position:absolute;right:26px;bottom:44px;width:58px;height:30px;background:${day ? '#2a3348' : '#1e2433'}"></span>
          <span style="position:absolute;right:20px;bottom:74px;width:0;height:0;border-left:35px solid transparent;border-right:35px solid transparent;border-bottom:20px solid ${day ? '#333d55' : '#262d3d'}"></span>
          ${[36, 60].map(r => `<span style="position:absolute;right:${r}px;bottom:58px;width:9px;height:7px;border-radius:1px;background:${out ? '#f3c96b' : '#2d3446'};box-shadow:${out ? '0 0 8px #f3c96b' : 'none'};transition:background .6s,box-shadow .6s"></span>`).join('')}
          ${lampGlow(72)}${lampGlow(95)}
        </div>`;
      const heroH = HOR + 44;
      const pwr = { width: 52, height: 52, borderRadius: 26, flex: 'none', display: 'grid', placeItems: 'center', background: out ? Y : 'rgba(255,255,255,0.12)', color: out ? '#141416' : '#e6e4df', boxShadow: out ? `0 0 0 6px ${a(Y, 0.18)}, 0 8px 24px ${a(Y, 0.35)}` : 'inset 0 1px 0 rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', transition: 'background .3s, box-shadow .3s' };
      const statusTxt = out ? (lampsOn ? `På · ${lampsOn} av ${lampList.length || ids.length} lamper` : 'På') : 'Av';
      const cardS = 'border-radius:28px;background:#1c1c1f';
      const lbl = 'font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8e8d89';

      return `
    <section data-lay="utelys-hero" data-lay-navn="Utelys og sola" style="position:relative;overflow:hidden;border-radius:28px;background:${sky};transition:background .6s">
      <div style="position:relative;height:${heroH}px">
        ${heroScene}
        <div style="position:absolute;left:18px;right:14px;top:16px;display:flex;align-items:flex-start;gap:12px">
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
            <span style="font-size:13px;font-weight:500;color:#dfe3ee">Utelys</span>
            <span style="font-size:12px;color:${out ? '#f3d58f' : '#c3c8d6'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(statusTxt)}${autoId ? ` · ${autoOn ? 'auto' : 'manuell'}` : ''}</span>
          </div>
          <button class="kdl-a96" data-on-click="toggleOut" title="${out ? 'Slå av utelys' : 'Slå på utelys'}" style="${S(pwr)}"><span class="ms" style="font-size:26px;font-variation-settings:'FILL' 1">${out ? 'light' : 'power_settings_new'}</span></button>
        </div>
        <div style="position:absolute;left:18px;bottom:12px;display:flex;flex-direction:column;gap:0;text-shadow:0 1px 8px rgba(0,0,0,0.4)">
          <span style="font-size:12px;color:#c3c8d6">${E(nextLabel)}</span>
          <span style="font-size:34px;font-weight:300;letter-spacing:-0.03em;line-height:1.05;font-variant-numeric:tabular-nums">${E(nw ? nw.kl : '–')}</span>
        </div>
      </div>
      <div style="position:relative;padding:26px 18px 14px;background:rgba(10,12,20,0.55);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)">
        <div style="position:relative">${tl}</div>
        <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:10px;color:#8e8d89;font-variant-numeric:tabular-nums">${ticks.map(t => `<span style="width:0;display:flex;justify-content:center">${t}</span>`).join('')}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:12px;font-size:11px;color:#a9a7a2">
          <span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:3px;background:${a('oklch(0.82 0.12 75)', 0.6)}"></span>Dagslys ${E(kl(rise))}–${E(kl(set))}</span>
          <span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:4px;border-radius:2px;background:${Y};box-shadow:0 0 6px ${Y}"></span>Utelys ${E(kl(wPaa))}–${E(kl(wAv))}</span>
        </div>
      </div>
    </section>

    <section data-lay="utelys-plan" data-lay-navn="Tidsplan" style="${cardS};padding:16px 18px;display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;align-items:center;gap:8px"><span style="flex:1;${lbl}">Tidsplan</span>${onDur ? `<span style="font-size:12px;color:#a9a7a2">på i ${E(onDur)}</span>` : ''}</div>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:10px">
        ${[[nPaa, 'emoji_objects', 'Tennes' + dag(wPaa), kl(wPaa), !out], null, [nAv, 'light_off', 'Slukkes' + dag(wAv), kl(wAv), out]].map(x => !x ? `<span class="ms" style="font-size:20px;color:#6d6c69">arrow_forward</span>`
          : `<button data-on-click="rowMore" data-arg="${E(x[0] || '')}" style="min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:12px 14px;border-radius:20px;background:${x[4] ? a(Y, 0.12) : '#232326'};box-shadow:${x[4] ? `inset 0 0 0 1px ${a(Y, 0.35)}` : 'none'};text-align:left">
              <span style="display:flex;align-items:center;gap:6px;min-width:0;max-width:100%;font-size:12px;color:${x[4] ? Y : '#a9a7a2'}"><span class="ms" style="font-size:16px;flex:none">${x[1]}</span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(x[2])}</span></span>
              <span style="font-size:28px;font-weight:300;letter-spacing:-0.03em;line-height:1;font-variant-numeric:tabular-nums">${E(x[3])}</span>
            </button>`).join('')}
      </div>
    </section>

    ${lampList.length ? `<section data-lay="utelys-lamper" data-lay-navn="Utelamper" style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;align-items:center;gap:10px;padding:4px 6px 0">
        <span class="ms" style="font-size:18px;color:#a9a7a2">deck</span>
        <span style="flex:1;font-size:15px;font-weight:500">Utelamper</span>
        <span style="font-size:12px;color:#8e8d89;white-space:nowrap">${lampsOn ? `${lampsOn} på` : 'alle av'}</span>
        <button data-on-click="toggleOut" style="${S({ height: 30, padding: '0 12px', borderRadius: 15, fontSize: 12, fontWeight: 600, background: lampsOn ? '#262629' : a(Y, 0.18), color: lampsOn ? '#c9c7c2' : Y })}">${lampsOn ? 'Av' : 'På'}</button>
      </div>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
        ${lampList.map(id => H.pill(this, id, H.strip(this.fname(id), ['ute']), false)).join('')}
      </div>
    </section>` : ''}

    ${autos.length ? `<section data-lay="utelys-auto" data-lay-navn="Automatikk" style="${cardS};padding:6px 6px 6px;display:flex;flex-direction:column">
      <div style="padding:10px 12px 6px;${lbl}">Automatikk</div>
      ${autos.map(([id, icon, k, sub, main], i) => { const on = this.isOn(id), w = sw(on), dim = !main && !autoOn; return `<button data-key="auto-${E(id)}" data-on-click="autoTog" data-arg="${E(id)}" data-hold="rowMore" style="display:flex;align-items:center;gap:12px;min-height:64px;padding:8px 12px 8px 8px;border-radius:22px;text-align:left;opacity:${dim ? 0.5 : 1};${i ? 'border-top:1px solid rgba(255,255,255,0.05);border-radius:0 0 22px 22px;' : ''}${main && autos.length > 1 ? 'margin-bottom:2px;' : ''}">
          <span style="width:44px;height:44px;border-radius:22px;flex:none;display:grid;place-items:center;background:${on ? a(main ? G : Y, 0.16) : '#262629'};color:${on ? (main ? G : Y) : '#a9a7a2'};transition:background .25s,color .25s"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' ${on ? 1 : 0}">${icon}</span></span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:1px"><span style="font-size:15px;font-weight:500">${E(k)}</span><span style="font-size:12px;color:#a9a7a2">${E(sub)}</span></span>
          <span style="${S(w.track)}"><span style="${S(w.knob)}"></span></span>
        </button>`; }).join('')}
    </section>` : ''}

    ${folds.map(d => `<section data-lay="utelys-${d.k}" style="display:flex;flex-direction:column;${cardS};overflow:hidden">
        <button data-on-click="fold" data-arg="${d.k}" style="display:flex;align-items:center;gap:12px;height:58px;padding:0 18px;text-align:left">
          <span class="ms" style="font-size:22px">${d.icon}</span>
          <span style="flex:1;font-size:15px;font-weight:500">${E(d.title)}</span>
          <span style="font-size:12px;color:#a9a7a2;white-space:nowrap">${E(d.meta)}</span>
          <span class="ms" style="${S(d.chev)}">expand_more</span>
        </button>
        ${d.open ? `<div style="display:flex;flex-direction:column;padding:0 18px 10px">
            ${d.rows.map(r => `<div ${r.id ? `data-on-click="rowMore" data-arg="${E(r.id)}" ` : ''}style="${S(r.row)}">${r.ic ? `<span class="ms" style="font-size:18px;color:#8e8d89">${r.ic}</span>` : ''}<span style="flex:1;min-width:0;font-size:13px">${E(r.k)}</span><span style="font-size:12px;font-weight:600;padding:6px 11px;border-radius:12px;background:#262629;font-variant-numeric:tabular-nums;white-space:nowrap">${E(r.v)}</span></div>`).join('')}
          </div>` : ''}
      </section>`).join('')}`;
    }

    _floor(tab, groups) {
      const s = this.state;
      const scenes = SC.map(([k, label, icon]) => { const act = s.scene === k; return { k, label, icon,
        bubble: { width: 58, height: 58, borderRadius: 29, display: 'grid', placeItems: 'center', background: act ? PINK : '#1c1c1f', color: act ? '#2a1720' : '#c9c7c2', transform: act ? 'scale(1.06)' : 'scale(1)', transition: 'transform .35s cubic-bezier(.34,1.8,.64,1), background .25s' },
        iconStyle: { fontSize: 24, fontVariationSettings: `'FILL' ${act ? 1 : 0}` }, labelStyle: { fontSize: 11, fontWeight: 500, color: act ? '#f2f1ee' : '#8e8d89' } }; });
      return `
    <section data-hscroll="1" style="display:flex;gap:12px;overflow-x:auto;scrollbar-width:none;margin:0 calc(-1 * var(--kd-kant,10px));padding:2px var(--kd-kant,10px)">
      ${scenes.map(c => `<button data-on-click="sceneGo" data-arg="${c.k}" style="flex:none;display:flex;flex-direction:column;align-items:center;gap:6px;width:62px">
          <span style="${S(c.bubble)}"><span class="ms" style="${S(c.iconStyle)}">${c.icon}</span></span>
          <span style="${S(c.labelStyle)}">${E(c.label)}</span>
        </button>`).join('')}
    </section>
    ${groups.map((g, gi) => {
      const words = H.roomWords(this, g.r);
      const n = g.lights.filter(id => H.shown(this, id).v > 0).length;
      const allStyle = { height: 30, padding: '0 12px', borderRadius: 15, fontSize: 12, fontWeight: 600, background: n ? '#262629' : a(Y, 0.18), color: n ? '#c9c7c2' : Y };
      const lights = g.lights.map(id => ({ id, name: H.nameOf(this, id, words) })).sort((x, y) => x.name.localeCompare(y.name, 'nb'));
      return `<section data-key="${E(g.r.id)}" style="display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;align-items:center;gap:10px;padding:4px 6px 0">
          <span class="ms" style="font-size:18px;color:#a9a7a2">${E(g.r.ikon || 'home')}</span>
          <span style="flex:1;font-size:15px;font-weight:500">${E(g.r.navn)}</span>
          <span style="font-size:12px;color:#8e8d89;white-space:nowrap">${n ? `${n} på` : 'alle av'}</span>
          <button data-on-click="roomAll" data-arg="${tab}:${gi}" style="${S(allStyle)}">${n ? 'Av' : 'På'}</button>
        </div>
        <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
          ${lights.map(l => H.pill(this, l.id, l.name, false)).join('')}
        </div>
      </section>`; }).join('')}`;
    }

    _on(fl) {
      const h = this.hass, c = this.config;
      const seen = new Map();
      for (const tab of ['f1', 'f2']) for (const g of fl[tab]) for (const id of g.lights) if (!seen.has(id)) seen.set(id, g.r);
      const outs = new Set(this._outIds()); // utelyset styres i sin egen fane (som i designet)
      const hh = this._has(c.hele_huset) ? c.hele_huset : null;
      const skjul = this._skjul();
      if (hh) for (const id of [].concat(this.at(hh, 'aktiv_liste') || [])) if (!seen.has(id) && !outs.has(id) && this._has(id) && !skjul(id)) { const aid = H.areaOf(h, id); seen.set(id, { id: aid || '', navn: (aid && (H.areaName(h, aid) || (KD.ROOMS[aid] && KD.ROOMS[aid].navn))) || '' }); }
      const on = [];
      for (const [id, r] of seen) {
        const lv = H.shown(this, id);
        if (lv.v > 0 && !(h.states[id].attributes.entity_id && Array.isArray(h.states[id].attributes.entity_id) && h.states[id].attributes.entity_id.some(x => seen.has(x)))) on.push({ id, r, lv, name: H.nameOf(this, id, r.id ? H.roomWords(this, r) : []) });
      }
      this._onList = on;
      // effekt: egen sensor, ellers summen av lysenes egne effektsensorer
      let watt = null;
      if (this.ok(c.effekt)) watt = Math.round(this.n(c.effekt, 0) * (/^kw$/i.test(this.unit(c.effekt)) ? 1000 : 1));
      else { let sum = 0, any = false; for (const l of on) { const p = `sensor.${l.id.split('.')[1]}_power`; if (this.ok(p)) { sum += this.n(p, 0); any = true; } } if (any) watt = Math.round(sum); }
      return `
    <section style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-radius:28px;background:#1c1c1f">
      <span style="display:flex;flex-direction:column;flex:1"><span style="font-size:34px;font-weight:300;letter-spacing:-0.03em;line-height:1">${on.length}</span><span style="font-size:12px;color:#8e8d89">lys på${watt != null ? ` · ca. ${watt} W` : ''}</span></span>
      <button class="kdl-a96" data-on-click="allOff" style="height:48px;padding:0 20px;border-radius:24px;background:#f2f1ee;color:#141416;font-size:14px;font-weight:600;display:flex;align-items:center;gap:6px"><span class="ms" style="font-size:20px">dark_mode</span>Slå av alle</button>
    </section>
    <section style="display:flex;flex-direction:column;gap:8px">
      ${on.map(l => `<button data-key="${E(l.id)}" data-on-click="offOne" data-arg="${E(l.id)}" data-hold="rowMore" style="display:flex;align-items:center;gap:12px;height:60px;padding:0 16px 0 6px;border-radius:30px;background:#1c1c1f;text-align:left">
          <span style="width:48px;height:48px;border-radius:24px;flex:none;display:grid;place-items:center;background:oklch(0.86 0.12 95);color:#141416"><span class="ms" style="font-size:20px;font-variation-settings:'FILL' 1">lightbulb</span></span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:14px;font-weight:500">${E(l.name)}</span><span style="font-size:11px;color:#8e8d89">${E([l.r.navn, H.valText(l.lv)].filter(Boolean).join(' · '))}</span></span>
          <span class="ms" style="font-size:20px;color:#8e8d89">power_settings_new</span>
        </button>`).join('')}
      ${!on.length ? `<div style="padding:30px;text-align:center;font-size:13px;color:#6d6c69">Alle lys er av</div>` : ''}
    </section>`;
    }
  }
  KDLysCard.head = ['lightbulb', 'Lys', 'Alle rom'];
  KDLysCard.defaults = {
    fane: 'out',
    utelys: 'light.ute_lys',
    utelamper: ['light.verandalamp', 'light.utelys_inngang'],
    neste_paa: 'sensor.ki_utelys_neste_paa',
    neste_av: 'sensor.ki_utelys_neste_av',
    auto: 'switch.ki_utelys_auto',
    kveld: 'switch.ki_utelys_kveld',
    morgen: 'switch.ki_utelys_morgen',
    sol: 'sun.sun',
    hele_huset: 'sensor.hele_huset_lys',
    effekt: 'sensor.lys_power',
  };
  Object.assign(KDLysCard.prototype, H.mixin);

  KD.define('kd-lys-card', KDLysCard, 'KD Lys', 'Utelys, lys per etasje og rom (dra for å dimme), og alle lys som er på – fra ki_rom/ki_utelys.');
  KD.sheet('lys', 'kd-lys-card');
})();
} catch (e) { console.error('ki-hjem-design: 70-kd-lys-card.js', e); }

/* ===== 71-kd-rom-card.js ===== */
try {
/*
 * kd-rom-card – «Rom v2» fra Claude Design (pikselkopi) med ekte data.
 *
 *   type: custom:kd-rom-card
 *   rom: stue                 # ki_rom-/område-ID (standard: rommet i URL-hashen, ellers stue)
 *   navn / ikon / farge       # standard fra KD.ROOMS (ikon = Material Symbols-navn)
 *   temp / fukt / sett / lys  # overstyr sensorer, settpunkt (input_number/number) og lysgruppe
 *   skjul: [media_player.x, 'switch.pultvifte_*']            # skjul enheter (erstatter standardlista for rommet)
 *   effekt_par: { switch.vannkoker: sensor.vannkoker_power }  # bryter → effektsensor (legges over standard)
 *   gardin_inverter: false    # true hvis gardinens posisjon betyr «% lukket»
 *
 * Innholdet bygges fra ki_rom (`sensor.<rom>_oversikt`: lys, media, brytere, vifter, klima, gardiner, sensorer,
 * skript, scener, temperatur, fuktighet, lysniva, effekt). Uten ki_rom brukes HA-områdene (hass.entities/devices/areas).
 * Lysscenene er ki_rom-knappene (`button.<rom>_lys_<scene>` fra `sensor.<rom>_lys_oversikt`).
 * Krever KD.LYSH fra 70-kd-lys-card.js.
 */
(() => {
  const KD = window.KD;
  if (!KD || !KD.KDSheet) return;
  const H = KD.LYSH;
  if (!H) { console.error('kd-rom-card: KD.LYSH mangler (70-kd-lys-card.js må lastes først)'); return; }
  const S = KD.S, E = KD.e, C = KD.C, a = KD.a, PINK = KD.PINK;
  const nf = (n, d = 1) => KD.nf(n, d);
  const OVERRIDES = ['navn', 'ikon', 'farge', 'temp', 'fukt', 'sett', 'lys'];
  const LIST_KEYS = ['lys', 'media', 'brytere', 'vifter', 'klima', 'gardiner', 'sensorer', 'skript', 'scener', 'temperatur', 'fuktighet', 'lysniva', 'effekt'];
  /* ki_rom-scene-id → designets tekst og ikon */
  const KI_SC = { maks: ['Maks', 'light_mode'], komfort: ['Komfort', 'weekend'], middag: ['Middag', 'restaurant'], tv: ['TV-kveld', 'tv'], mindre: ['Dempet', 'brightness_4'], natt: ['Natt', 'bedtime'], av: ['Alt av', 'dark_mode'] };
  /* reserve uten ki_rom: designets scener og nivåer */
  const SCENES = [['max', 'Maks', 'light_mode'], ['komfort', 'Komfort', 'weekend'], ['middag', 'Middag', 'restaurant'], ['tv', 'TV-kveld', 'tv'], ['dim', 'Dempet', 'brightness_4'], ['av', 'Alt av', 'dark_mode']];
  const sceneLevel = (k, i, name) => ({ max: 100, komfort: [60, 45, 0, 50, 40, 70, 0, 55, 30][i % 9], middag: /spise/i.test(name) ? 85 : i % 2 ? 25 : 0, tv: i % 3 === 0 ? 15 : 0, dim: 30, av: 0 })[k];
  /* binary_sensor-klasse → [på-tekst, av-tekst, ikon] */
  const BIN = {
    door: ['Åpen', 'Lukket', 'door_front'], window: ['Åpen', 'Lukket', 'window'], opening: ['Åpen', 'Lukket', 'sensor_door'], garage_door: ['Åpen', 'Lukket', 'garage'],
    motion: ['Bevegelse', 'Stille', 'directions_walk'], occupancy: ['Noen her', 'Stille', 'sensor_occupied'], presence: ['Noen her', 'Stille', 'sensor_occupied'],
    moving: ['Bevegelse', 'Stille', 'directions_run'], vibration: ['Vibrerer', 'Stille', 'vibration'], sound: ['Lyd', 'Stille', 'graphic_eq'],
  };
  /* enhetsikon gjettet fra navnet */
  const DEV_ICON = [[/server|rack|nas\b|ruter|router|switch_poe/, 'dns'], [/\btv\b|fjernsyn/, 'tv'], [/\bpc\b|desktop|datamaskin/, 'desktop_windows'], [/skjerm|monitor/, 'monitor'],
    [/kaffe/, 'coffee_maker'], [/kjøleskap|kjoleskap|fryse/, 'kitchen'], [/oppvask/, 'dishwasher_gen'], [/vaskemaskin|tørketrommel|torketrommel/, 'local_laundry_service'],
    [/håndkle|hankle|handkle/, 'dry_cleaning'], [/vannkoker/, 'kettle'], [/brødrister|brodrister/, 'breakfast_dining'], [/mikro/, 'microwave'], [/printer|creality|3d/, 'print'],
    [/vifte|fan/, 'mode_fan'], [/stikkontakt|uttak|outlet/, 'outlet'], [/lampe|lys\b/, 'lightbulb'], [/varme|ovn|heater/, 'heat'], [/lader|charger/, 'power']];
  const devIcon = (id, name) => { const t = String(name).toLowerCase(); const hit = DEV_ICON.find(([re]) => re.test(t)); return hit ? hit[1] : id.startsWith('fan.') ? 'mode_fan' : 'power'; };
  const eid = x => typeof x === 'string' ? x : x && x.entity;

  class KDRomCard extends KD.KDSheet {
    static get sheetCss() {
      return `.kdr-a97:active{transform:scale(0.97)}.kdr-a92:active{transform:scale(0.92)}
.kd-editing .kd-ent{position:relative;padding-right:36px!important;box-shadow:inset 0 0 0 1.5px oklch(0.78 0.13 350 / 0.55)!important;transition:opacity .2s}
.kd-editing .kd-ent.kd-hid{opacity:.38;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.12)!important}
.kd-editing .kd-ent::after{content:'visibility';font-family:'Material Symbols Rounded';font-size:18px;line-height:1;position:absolute;right:10px;top:50%;transform:translateY(-50%);color:oklch(0.82 0.1 350);pointer-events:none;-webkit-font-feature-settings:'liga';font-feature-settings:'liga'}
.kd-editing .kd-ent.kd-hid::after{content:'visibility_off';color:#f2f1ee}`;
    }
    /** registeret (områder/enheter) kan komme eller endres uten at noen state endres */
    set hass(h) { const old = this._hass; super.hass = h; if (old && h && (old.entities !== h.entities || old.devices !== h.devices || old.areas !== h.areas)) this._queue(); }
    get hass() { return this._hass; }
    onConnect() {
      super.onConnect();
      this._hashH = () => { if (!this.config.rom) this._queue(); };
      window.addEventListener('hashchange', this._hashH);
      window.addEventListener('location-changed', this._hashH);
    }
    onDisconnect() {
      super.onDisconnect();
      window.removeEventListener('hashchange', this._hashH);
      window.removeEventListener('location-changed', this._hashH);
    }
    _has(id) { return !!(id && this.hass && this.hass.states[id]); }

    /* ----- rommet ----- */
    _room() {
      const c = this.config, h = this.hass;
      let id = c.rom;
      if (!id && location.hash) { const hit = Object.entries(KD.ROOMS).find(([k, r]) => r.hash === location.hash || '#' + k === location.hash); if (hit) id = hit[0]; }
      id = id || 'stue';
      const r = { id, ...(KD.rooms()[id] || {}) };
      for (const k of OVERRIDES) if (c[k] != null && c[k] !== '') r[k] = c[k];
      const ov = h ? H.ov(this, id) : null;
      if (!r.navn) r.navn = (ov && ov.attributes.rom) || (h && H.areaName(h, id)) || (id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' '));
      if (!r.ikon) r.ikon = H.msIcon((ov && ov.attributes.ikon) || (h && h.areas && h.areas[id] && h.areas[id].icon), 'home');
      if (!r.farge) r.farge = C.green;
      return r;
    }
    _live(r, o) {
      const L = KD.roomLive(this, r);
      if (!L.tempId && o && o.temperatur[0]) { L.tempId = o.temperatur[0]; L.temp = this.n(L.tempId); }
      if (!L.humId && o && o.fuktighet[0]) { L.humId = o.fuktighet[0]; L.hum = this.n(L.humId); }
      const ids = xs => xs.map(x => typeof x === 'string' ? x : x && x.entity).filter(Boolean);
      if (o) {
        L.tempValg = [...new Set([...(L.tempValg || []), ...ids(o.temperatur)])];
        L.humValg = [...new Set([...(L.humValg || []), ...ids(o.fuktighet)])];
      }
      return L;
    }
    /** romoversikt i ki_rom-format, med skjul og effekt-par brukt */
    _ov(r) {
      const c = this.config, h = this.hass;
      const st = H.ov(this, r.id);
      const src = st ? st.attributes : H.areaOverview(h, r.id);
      const baseHide = H.matcher(c.skjul != null ? c.skjul : (H.SKJUL[r.id] || []));
      const hideAll = H.hideFn(this, baseHide, r.id);
      this._hideNow = hideAll;
      const hide = this.state.edit ? (id => /_child_lock$|_status_led$/.test(id) && baseHide(id)) : hideAll; // i tilpass-modus vises alt
      const o = {};
      for (const k of LIST_KEYS) o[k] = [].concat(src[k] || []).filter(x => eid(x) && h.states[eid(x)] && !hide(eid(x))).map(x => typeof x === 'string' ? x : { ...x });
      o.lys = H.lights(this, r, hide);
      o.ki = !!st;
      // effekt-par: config > standard > ki_rom > gjetting
      const par = { ...(H.EFFEKT_PAR[r.id] || {}), ...(c.effekt_par || {}) };
      const used = new Set();
      for (const d of [...o.brytere, ...o.vifter, ...o.klima]) {
        if (Object.prototype.hasOwnProperty.call(par, d.entity)) d.effekt = par[d.entity] || null;
        else if (!d.effekt || !h.states[d.effekt]) d.effekt = H.findPower(h, d.entity);
        if (d.effekt && used.has(d.effekt)) d.effekt = null;
        if (d.effekt) used.add(d.effekt);
      }
      return o;
    }
    _w(id) {
      if (!this.ok(id)) return null;
      const v = this.n(id, 0), u = this.unit(id);
      return /^kw$/i.test(u) ? v * 1000 : /^mw$/i.test(u) ? v / 1000 : v;
    }

    /* ----- handlinger ----- */
    onLightChange() { if (this.state.scene) this.setState({ scene: null }); }
    lightsAll() {
      const ids = this._lights || []; if (!ids.length) return;
      const on = ids.filter(id => this.v(id) === 'on');
      this.setState({ scene: null });
      return this.setMany(on.length ? on : ids, !on.length);
    }
    curtain(ev, id) {
      const pos = this.at(id, 'current_position', null);
      if (pos == null) return this.call('cover', 'toggle', { entity_id: id });
      const inv = !!this.config.gardin_inverter, cv = inv ? 100 - pos : pos;
      const nv = cv >= 100 ? 0 : cv >= 50 ? 100 : 50;
      return this.call('cover', 'set_cover_position', { entity_id: id, position: inv ? 100 - nv : nv });
    }
    mediaTog(ev, id) {
      if (this.state.edit) return this.hideTog(ev, id);
      const s = this.v(id);
      return this.call('media_player', ['off', 'standby', 'unavailable'].includes(s) ? 'turn_on' : 'media_play_pause', { entity_id: id });
    }
    moreInfo(ev, id) { if (this.state.edit && id && id.includes('.')) return this.hideTog(ev, id); this.more(id); }
    devTog(ev, id) { if (this.state.edit) return this.hideTog(ev, id); this.toggle(id); }
    /* ----- tilpass rommet (skjul/vis i UI) ----- */
    editTog() { this.setState({ edit: !this.state.edit }); }
    hideTog(ev, id) {
      if (!id) return;
      const r = this._room(), ud = JSON.parse(JSON.stringify(H.userHideNow(this) || {}));
      const row = ud[r.id] = ud[r.id] || { skjul: [], vis: [] };
      row.skjul = row.skjul || []; row.vis = row.vis || [];
      const hidden = this._hideNow ? this._hideNow(id) : row.skjul.includes(id);
      row.skjul = row.skjul.filter(x => x !== id); row.vis = row.vis.filter(x => x !== id);
      if (!hidden) row.skjul.push(id); else row.vis.push(id);
      this.haptic('selection');
      H.saveUserHide(this, ud);
      this._queue();
    }
    /** velg hvilken sensor rommet henter temperatur/fukt fra (lagres per bruker, brukes også i Hjem) */
    sensorPick(ev, arg) {
      const [k, id] = String(arg).split('|'); if (!k || !id) return;
      const r = this._room(), ud = JSON.parse(JSON.stringify(KD.userData(this) || {}));
      const row = ud[r.id] = ud[r.id] || {};
      if (row[k] === id) delete row[k]; else row[k] = id;
      this.haptic('selection');
      KD.saveUserData(this, ud);
      this._queue();
    }
    editReset() {
      const r = this._room(), ud = JSON.parse(JSON.stringify(H.userHideNow(this) || {}));
      delete ud[r.id]; H.saveUserHide(this, ud); this._queue();
    }
    /* ----- tilpass fliser og scener (per bruker, i romraden: fliser/scener { skjul, vis, rekkefolge, navn, ekstra }) ----- */
    _udRow(kind, fn) {
      const r = this._room(), ud = JSON.parse(JSON.stringify(KD.userData(this) || {}));
      const row = ud[r.id] = ud[r.id] || {};
      const g = row[kind] = row[kind] || {};
      fn(g);
      for (const k of Object.keys(g)) if ((Array.isArray(g[k]) && !g[k].length) || (g[k] && typeof g[k] === 'object' && !Array.isArray(g[k]) && !Object.keys(g[k]).length)) delete g[k];
      if (!Object.keys(g).length) delete row[kind];
      this.haptic('selection');
      KD.saveUserData(this, ud);
      this._queue();
    }
    tileTog(ev, key) { this.edHide(ev, 'fliser|' + key); }
    sceneHide(ev, key) { this.edHide(ev, 'scener|' + key); }
    edHide(ev, arg) {
      const i = String(arg).indexOf('|'), kind = arg.slice(0, i), key = arg.slice(i + 1);
      const hidden = kind === 'fliser' ? (this._tileHid ? this._tileHid(key) : false) : !!((this._scenes || []).find(x => x.key === key) || {}).hid;
      this._udRow(kind, g => {
        g.skjul = (g.skjul || []).filter(x => x !== key);
        if (kind === 'fliser') { g.vis = (g.vis || []).filter(x => x !== key); if (!hidden) g.skjul.push(key); else g.vis.push(key); }
        else if (!hidden) g.skjul.push(key);
      });
    }
    edMove(ev, arg) {
      const [kind, key, d] = String(arg).split('|');
      const list = [...((kind === 'fliser' ? this._tileOrder : this._sceneOrder) || [])];
      const i = list.indexOf(key), j = i + (+d); if (i < 0 || j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      this._udRow(kind, g => { g.rekkefolge = list; });
    }
    edName(ev, arg, el) {
      const i = String(arg).indexOf('|'), kind = arg.slice(0, i), key = arg.slice(i + 1), v = String((el && el.value) || '').trim();
      const def = (el && el.getAttribute('placeholder')) || '';
      this._udRow(kind, g => { g.navn = { ...(g.navn || {}) }; if (!v || v === def) delete g.navn[key]; else g.navn[key] = v.slice(0, 30); });
    }
    edKey(ev) { if (ev.key === 'Enter') { ev.preventDefault(); ev.target.blur(); } }
    scDel(ev, key) {
      this._udRow('scener', g => { g.ekstra = (g.ekstra || []).filter(x => x !== key); g.skjul = (g.skjul || []).filter(x => x !== key); g.rekkefolge = (g.rekkefolge || []).filter(x => x !== key); if (g.navn) delete g.navn[key]; });
    }
    scAddTog() { this.setState({ scAdd: !this.state.scAdd, scQ: '' }); }
    scQ(ev, arg, el) { this._scQ = el.value; clearTimeout(this._scqT); this._scqT = setTimeout(() => this.setState({ scQ: this._scQ }), 150); }
    scAddGo(ev, id) {
      if (!id) return;
      this._udRow('scener', g => { g.ekstra = [...(g.ekstra || []).filter(x => x !== id), id]; g.skjul = (g.skjul || []).filter(x => x !== id); });
    }
    /** redigeringspanel for fliser/scener: gi nytt navn, flytt, skjul/vis (+ legg til scene/skript) */
    _edPanel(kind, title, icon, items, navn) {
      const s = this.state, n = items.length;
      const ib = (on, arg, ic, tip, col, dis) => `<button class="kdr-a92" data-on-click="${on}" data-arg="${E(arg)}" title="${tip}" style="${S({ width: 34, height: 34, borderRadius: 17, flex: 'none', display: 'grid', placeItems: 'center', color: col || '#8e8d89', opacity: dis ? 0.25 : 1, pointerEvents: dis ? 'none' : null })}"><span class="ms" style="font-size:19px">${ic}</span></button>`;
      const rows = items.map((x, i) => `<div data-key="ed-${kind}-${E(x.key)}" style="display:flex;align-items:center;gap:2px;min-height:48px;border-top:${i ? '1px solid rgba(255,255,255,0.05)' : 'none'}">
          <span style="${S({ width: 34, height: 34, borderRadius: 17, flex: 'none', display: 'grid', placeItems: 'center', marginRight: 6, background: x.hid ? '#262629' : 'oklch(0.78 0.13 350 / 0.18)', color: x.hid ? '#6d6c69' : 'oklch(0.85 0.09 350)' })}"><span class="ms" style="font-size:18px">${E(x.icon)}</span></span>
          <input data-on-change="edName" data-on-keydown="edKey" data-arg="${E(kind + '|' + x.key)}" value="${E(x.label)}" placeholder="${E(x.def)}" maxlength="30" enterkeyhint="done" autocomplete="off" style="${S({ flex: 1, minWidth: 0, height: 36, padding: '0 10px', borderRadius: 12, border: 'none', outline: 'none', background: 'rgba(255,255,255,0.04)', color: x.hid ? '#8e8d89' : '#f2f1ee', font: 'inherit', fontSize: 13, boxSizing: 'border-box', textDecoration: x.hid ? 'line-through' : 'none' })}">
          ${ib('edMove', `${kind}|${x.key}|-1`, 'arrow_upward', 'Flytt fram', null, i === 0)}${ib('edMove', `${kind}|${x.key}|1`, 'arrow_downward', 'Flytt bak', null, i === n - 1)}
          ${ib('edHide', `${kind}|${x.key}`, x.hid ? 'visibility_off' : 'visibility', x.hid ? 'Vis' : 'Skjul', x.hid ? '#6d6c69' : 'oklch(0.82 0.1 350)')}
          ${x.extra ? ib('scDel', x.key, 'delete', 'Fjern', 'oklch(0.72 0.15 25)') : ''}
        </div>`).join('');
      let add = '';
      if (kind === 'scener') {
        const have = new Set(items.map(x => x.key)), q = String(s.scQ || '').toLowerCase(), r = this._r || this._room(), w = String(r.navn || r.id).toLowerCase();
        const cand = s.scAdd ? Object.keys(this.all()).filter(id => /^(scene|script)\./.test(id) && !have.has(id) && (!q || (id + ' ' + this.fname(id)).toLowerCase().includes(q)))
          .sort((x, y) => ((y.includes(r.id) || this.fname(y).toLowerCase().includes(w)) - (x.includes(r.id) || this.fname(x).toLowerCase().includes(w))) || (y.startsWith('scene.') - x.startsWith('scene.')) || this.fname(x).localeCompare(this.fname(y), 'nb')) : [];
        add = `<button class="kdr-a92" data-on-click="scAddTog" style="display:flex;align-items:center;justify-content:center;gap:6px;height:40px;margin-top:6px;border-radius:20px;font-size:13px;font-weight:500;background:${s.scAdd ? 'oklch(0.78 0.13 350 / 0.2)' : 'rgba(255,255,255,0.06)'};color:#e6e4df"><span class="ms" style="font-size:18px">${s.scAdd ? 'expand_less' : 'add'}</span>${s.scAdd ? 'Lukk' : 'Legg til scene eller skript'}</button>
        ${s.scAdd ? `<input data-key="kd-scq" data-keep="1" data-on-input="scQ" placeholder="Søk etter scene eller skript …" autocomplete="off" style="height:38px;margin-top:8px;padding:0 14px;border-radius:19px;border:none;outline:none;background:#262629;color:#f2f1ee;font:inherit;font-size:13px;box-sizing:border-box;width:100%">
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;max-height:240px;overflow-y:auto;overscroll-behavior:contain">${cand.slice(0, 40).map(id => `<button class="kdr-a92" data-key="kd-sca-${E(id)}" data-on-click="scAddGo" data-arg="${E(id)}" style="${S({ display: 'flex', alignItems: 'center', gap: 6, maxWidth: '100%', minWidth: 0, height: 34, padding: '0 12px 0 8px', borderRadius: 17, fontSize: 12, fontWeight: 500, background: 'rgba(255,255,255,0.06)', color: '#c9c7c2' })}"><span class="ms" style="font-size:16px;flex:none">${id.startsWith('script.') ? 'play_circle' : 'palette'}</span><span style="min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(this.fname(id))}</span></button>`).join('') || '<span style="font-size:12px;color:#6d6c69">Ingen scener eller skript funnet</span>'}</div>
        ${cand.length > 40 ? `<span style="display:block;margin-top:6px;font-size:11px;color:#6d6c69">${cand.length - 40} til – søk for å snevre inn</span>` : ''}` : ''}`;
      }
      return `<div data-key="kd-ed-${kind}" style="display:flex;flex-direction:column;padding:12px 10px 10px 12px;border-radius:24px;background:#1c1c1f;box-shadow:inset 0 0 0 1px oklch(0.78 0.13 350 / 0.25)">
      <div style="display:flex;align-items:center;gap:8px;padding:0 4px 6px;font-size:12px;color:#8e8d89"><span class="ms" style="font-size:16px">${icon}</span><span style="flex:1">${E(title)} · gi nytt navn, flytt eller skjul</span></div>
      ${rows || '<span style="padding:8px 4px;font-size:12px;color:#6d6c69">Ingen ennå</span>'}${add}
    </div>`;
    }
    sensorAll(ev, k) { this.setState({ sensAll: this.state.sensAll === k ? null : k, sensQ: '' }); }
    sensorQ(ev, arg, el) { this._sensQ = el.value; clearTimeout(this._sqT); this._sqT = setTimeout(() => this.setState({ sensQ: this._sensQ }), 150); }
    /** Animasjonen i topp-pillen (innflyging + pulserende glød) – av/på per bruker, gjelder alle popups */
    animTog() {
      const v = { ...KD.ud(this, 'kd_innst') }; v.topp_animasjon = v.topp_animasjon === false;
      this.haptic('selection'); KD.udSave(this, 'kd_innst', v);
      if (v.topp_animasjon === false) KD.stopSheetTop(document.body);
    }
    /** alle temperatur-/fuktsensorer i HA (enhet/device_class), rommets egne først */
    _allSensors(k, r) {
      const all = this.all(), words = String(r.navn || r.id).toLowerCase().split(/\s+/)[0];
      const ok = id => { if (!id.startsWith('sensor.')) return false; const A = all[id].attributes || {}, u = String(A.unit_of_measurement || '');
        return k === 'temp' ? (A.device_class === 'temperature' || /°\s*[cf]/i.test(u)) : (A.device_class === 'humidity' || (u === '%' && /fukt|humid/i.test(id + ' ' + (A.friendly_name || '')))); };
      const q = String(this.state.sensQ || '').toLowerCase();
      return Object.keys(all).filter(ok).filter(id => !q || (id + ' ' + this.fname(id)).toLowerCase().includes(q))
        .sort((x, y) => (y.includes(r.id) || this.fname(y).toLowerCase().includes(words)) - (x.includes(r.id) || this.fname(x).toLowerCase().includes(words)) || this.fname(x).localeCompare(this.fname(y), 'nb'));
    }
    _sensorPicker(r, L) {
      const U = KD.userRoom(this, r.id), s = this.state;
      const chip = (k, id, cur, unit) => {
        const sel = id === cur, fixed = U[k] === id, v = this.n(id);
        return `<button class="kdr-a92" data-key="kd-sv-${k}-${E(id)}" data-on-click="sensorPick" data-arg="${E(k + '|' + id)}" style="${S({ display: 'flex', alignItems: 'center', gap: 6, maxWidth: '100%', minWidth: 0, height: 34, padding: '0 12px', borderRadius: 17, fontSize: 12, fontWeight: 500, background: sel ? 'oklch(0.78 0.13 350 / 0.2)' : 'rgba(255,255,255,0.06)', boxShadow: sel ? 'inset 0 0 0 1.5px oklch(0.78 0.13 350 / 0.7)' : 'none', color: sel ? '#f2f1ee' : '#a9a7a2' })}">${fixed ? '<span class="ms" style="font-size:14px">push_pin</span>' : ''}<span style="min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(this.fname(id))}</span><span style="color:#8e8d89;white-space:nowrap">${v != null ? E(nf(v, unit === '%' ? 0 : 1) + (unit === '%' ? ' %' : '°')) : '–'}</span></button>`;
      };
      const row = (k, title, icon, list0, cur, unit) => {
        const list = [...new Set([...(U[k] ? [U[k]] : []), ...list0])];
        const open = s.sensAll === k, more = open ? this._allSensors(k, r).filter(id => !list.includes(id)) : [];
        return `<div style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#8e8d89"><span class="ms" style="font-size:16px">${icon}</span><span style="flex:1">${title}</span>
        <button class="kdr-a92" data-on-click="sensorAll" data-arg="${k}" style="height:28px;padding:0 10px;border-radius:14px;font-size:11px;font-weight:500;background:${open ? 'oklch(0.78 0.13 350 / 0.2)' : 'rgba(255,255,255,0.06)'};color:#c9c7c2;display:flex;align-items:center;gap:4px"><span class="ms" style="font-size:15px">${open ? 'expand_less' : 'search'}</span>${open ? 'Lukk' : 'Alle sensorer'}</button></div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${list.map(id => chip(k, id, cur, unit)).join('') || '<span style="font-size:12px;color:#6d6c69">Ingen forslag i rommet – søk i alle sensorer</span>'}</div>
      ${open ? `<input data-key="kd-sq-${k}" data-keep="1" data-on-input="sensorQ" placeholder="Søk etter sensor …" autocomplete="off" style="height:38px;padding:0 14px;border-radius:19px;border:none;outline:none;background:#262629;color:#f2f1ee;font:inherit;font-size:13px;box-sizing:border-box;width:100%">
      <div style="display:flex;flex-wrap:wrap;gap:6px;max-height:260px;overflow-y:auto;overscroll-behavior:contain">${more.slice(0, 60).map(id => chip(k, id, cur, unit)).join('') || '<span style="font-size:12px;color:#6d6c69">Ingen treff</span>'}</div>
      ${more.length > 60 ? `<span style="font-size:11px;color:#6d6c69">${more.length - 60} til – søk for å snevre inn</span>` : ''}` : ''}
    </div>`;
      };
      const t = row('temp', 'Temperatur fra', 'device_thermostat', L.tempValg || [], L.tempId, '°');
      const f = row('fukt', 'Fukt fra', 'humidity_percentage', L.humValg || [], L.humId, '%');
      const anim = KD.ud(this, 'kd_innst').topp_animasjon !== false;
      return `<section data-key="kd-sensorvalg" style="display:flex;flex-direction:column;gap:14px;padding:14px 16px;border-radius:24px;background:#1c1c1f">${t}${f}
      <button class="kdr-a92" data-on-click="animTog" style="display:flex;align-items:center;gap:10px;min-height:44px;text-align:left">
        <span class="ms" style="font-size:18px;color:#8e8d89">animation</span>
        <span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:13px;font-weight:500">Animasjon i toppen</span><span style="font-size:11px;color:#8e8d89">Innflyging og glød i topp-pillen (alle popups)</span></span>
        <span style="${S({ width: 44, height: 26, borderRadius: 13, flex: 'none', position: 'relative', background: anim ? 'oklch(0.78 0.13 350)' : '#3a3a3d', transition: 'background .2s' })}"><span style="${S({ position: 'absolute', top: 3, left: anim ? 21 : 3, width: 20, height: 20, borderRadius: 10, background: '#f4f3ef', transition: 'left .25s cubic-bezier(.34,1.56,.64,1)' })}"></span></span>
      </button></section>`;
    }
    afterRender() {
      const root = this.$('.kd-root > div, .kd-sheet-body > div');
      const edit = !!this.state.edit, hide = this._hideNow;
      this.$$('[data-key]').forEach(el => {
        const k = el.getAttribute('data-key');
        const ent = /^[a-z_]+\.[a-z0-9_]+$/.test(k) && !/^(button|script|scene)\./.test(k);
        el.classList.toggle('kd-ent', edit && ent);
        el.classList.toggle('kd-hid', edit && ent && !!hide && hide(k));
      });
      this._root.classList.toggle('kd-editing', edit);
    }
    sceneGo(ev, key) {
      const sc = (this._scenes || []).find(x => x.key === key); if (!sc) return;
      if (sc.ent) this.toggle(sc.ent);
      else {
        // reserve: designets nivåer per lys
        (this._lightRows || []).forEach((l, i) => { const lvl = sceneLevel(sc.fb, i, l.name); this.setLight(l.id, lvl); });
      }
      this.setState({ scene: key });
    }
    step(ev, dir) {
      const k = this._k; if (!k) return;
      const nv = KD.clamp(Math.round((k.set + (+dir) * k.step) * 100) / 100, k.min, k.max);
      this._setPend = { v: nv, ref: this.hass.states[k.id], t: Date.now() };
      setTimeout(() => this._queue(), 5100);
      this.setState({});
      if (k.kind === 'climate') return this.call('climate', 'set_temperature', { entity_id: k.id, temperature: nv });
      return this.setNum(k.id, nv);
    }
    /* volum: dra på streken */
    mDown(ev, id, el) { this._md = { id, x: ev.clientX, y: ev.clientY, moved: false, scroll: false, el, pid: ev.pointerId }; }
    mMove(ev, id) {
      const d = this._md; if (!d || d.id !== id || d.scroll) return;
      const dx = ev.clientX - d.x, dy = ev.clientY - d.y;
      if (!d.moved) {
        if (Math.abs(dy) > 8 && Math.abs(dy) >= Math.abs(dx)) { d.scroll = true; return; }
        if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) { d.moved = true; try { d.el.setPointerCapture(d.pid); } catch (e) { /* ok */ } } else return;
      }
      const r = d.el.getBoundingClientRect(), v = Math.round(KD.clamp((ev.clientX - r.left) / r.width, 0, 1) * 100);
      if (!this.state.vol || this.state.vol.v !== v) this.setState({ vol: { id, v } });
    }
    mUp(ev, id) {
      const d = this._md; this._md = null;
      if (!d || !d.moved || !this.state.vol) return;
      const v = this.state.vol.v;
      this._volPend = { id, v, ref: this.hass.states[id], t: Date.now() };
      setTimeout(() => this._queue(), 5100);
      this.setState({ vol: null });
      return this.call('media_player', 'volume_set', { entity_id: id, volume_level: v / 100 });
    }
    mCancel() { this._md = null; if (this.state.vol) this.setState({ vol: null }); }

    /* ----- klima ----- */
    _klima(r, o, temp, words) {
      const h = this.hass;
      const cl = o.klima[0] || null;
      let id = r.sett && this._has(r.sett) ? r.sett : null;
      if (!id && this._has(`number.ki_rom_${r.id}_temp`)) id = `number.ki_rom_${r.id}_temp`;
      if (!id && this._has(`number.ki_rom_${H.slug(r.navn)}_temp`)) id = `number.ki_rom_${H.slug(r.navn)}_temp`;
      let kind = 'num', set = null, step = 0.5, min = 5, max = 35;
      if (id) { set = this.n(id); step = Number(this.at(id, 'step', 0.5)) || 0.5; min = Number(this.at(id, 'min', 5)); max = Number(this.at(id, 'max', 35)); }
      else if (cl) { kind = 'climate'; id = cl.entity; set = this.at(id, 'temperature', null); step = Number(this.at(id, 'target_temp_step', 0.5)) || 0.5; min = Number(this.at(id, 'min_temp', 5)); max = Number(this.at(id, 'max_temp', 35)); }
      if (set == null || isNaN(set)) return null;
      set = Number(set);
      const p = this._setPend;
      if (p && p.ref === h.states[id] && Date.now() - p.t < 5000) set = p.v;
      // navn og effekt: fra settpunktets «base» (input_number.stue_oljefyr_teller → climate/switch.stue_oljefyr), ellers klimaenheten
      const base = kind === 'num' ? id.split('.')[1].replace(/_teller$|_temp$/, '') : null;
      let name, power = null, heatId = null;
      if (base && this._has('climate.' + base)) heatId = 'climate.' + base;
      else if (base && this._has('switch.' + base)) heatId = 'switch.' + base;
      else if (kind === 'climate' || (cl && !base)) heatId = cl.entity;
      if (heatId) name = H.strip(this.fname(heatId), words);
      else if (this.at(id, 'friendly_name')) name = H.strip(String(this.fname(id)).replace(/\s*(teller|temp|temperatur)$/i, ''), words);
      else name = H.strip((base || id.split('.')[1]).replace(/_/g, ' '), words);
      const kd = heatId && o.klima.concat(o.brytere).find(d => d.entity === heatId);
      power = (kd && kd.effekt) || (base && H.findPower(h, 'x.' + base)) || (heatId && H.findPower(h, heatId)) || (cl && cl.effekt) || null;
      const w = power ? this._w(power) : null;
      const climId = heatId && heatId.startsWith('climate.') ? heatId : cl ? cl.entity : null;
      const heating = w != null ? w > 10 : climId && this.at(climId, 'hvac_action') ? this.at(climId, 'hvac_action') === 'heating' : temp != null && set > temp;
      return { id, kind, set, step, min: isNaN(min) ? 5 : min, max: isNaN(max) ? 35 : max, name, w: w != null ? Math.round(w) : null, heating, power };
    }

    /* ----- innhold ----- */
    body() {
      const s = this.state, c = this.config, h = this.hass;
      const r = this._r = this._room();
      const o = this._ov(r);
      const L = this._live(r, o);
      const words = H.roomWords(this, r);
      const col = r.farge || C.green;
      const temp = L.temp, hum = L.hum;

      // historikk (24 t) → 25 timepunkter som i designet
      let temps = null;
      if (L.tempId) {
        const hist = this.cached('kdrom-t-' + L.tempId, 5 * 60e3, () => this.history([L.tempId], 24), null);
        const pts = ((hist && hist[L.tempId]) || []).filter(p => typeof p.v === 'number');
        if (pts.length) {
          const t0 = Date.now() - 24 * 3600e3;
          temps = Array.from({ length: 25 }, (_, i) => { const t = t0 + i * 3600e3; let v = pts[0].v; for (const p of pts) { if (+p.t <= t) v = p.v; else break; } return v; });
        }
      }
      const mn = temps ? Math.min(...temps) : null, mx = temps ? Math.max(...temps) : null;
      const line = temps ? temps.map((t, i) => `${i ? 'L' : 'M'}${(i / 24 * 384).toFixed(1)},${(56 - (t - mn) / (mx - mn || 1) * 48).toFixed(1)}`).join(' ') : '';
      const tempRange = temps ? `${nf(mn)}–${nf(mx)}°` : '–';

      // lys
      const lightRows = this._lightRows = o.lys.map(id => ({ id, name: H.nameOf(this, id, words) })).sort((x, y) => x.name.localeCompare(y.name, 'nb'));
      this._lights = o.lys;
      const on = o.lys.filter(id => H.shown(this, id).v > 0).length;

      // klima
      const k = this._k = this._klima(r, o, temp, words);

      // enheter (brytere + vifter)
      const devices = [...o.brytere, ...o.vifter].map(d => {
        const isOn = this.v(d.entity) === 'on', w = d.effekt ? this._w(d.effekt) : null, name = H.strip(this.fname(d.entity), words);
        return { ...d, name, on: isOn, w: w != null ? Math.round(w) : 0, bad: !this.ok(d.entity), icon: devIcon(d.entity, name) };
      });
      // effekt i rommet: alle unike effektsensorer (parede + rommets egne)
      const pw = new Set([...devices.map(d => d.effekt), ...o.klima.map(d => d.effekt), k && k.power, ...o.effekt].filter(Boolean));
      let watt = 0; for (const id of pw) { const w = this._w(id); if (w != null && w > 0) watt += w; }
      watt = Math.round(watt);

      // gardin, media, sensorer
      const cover = o.gardiner[0] || null;
      let cv = null;
      if (cover) { const pos = this.at(cover, 'current_position', null); cv = pos != null ? (c.gardin_inverter ? 100 - pos : pos) : (['open', 'opening'].includes(this.v(cover)) ? 100 : 0); cv = Math.round(cv); }
      const media = o.media.map(id => {
        const st = this.st(id), state = st ? st.state : 'unavailable', playing = state === 'playing';
        const vp = this._volPend, drag = s.vol && s.vol.id === id;
        let vol = st && st.attributes.volume_level != null ? Math.round(st.attributes.volume_level * 100) : null;
        if (vp && vp.id === id && vp.ref === st && Date.now() - vp.t < 5000) vol = vp.v;
        if (drag) vol = s.vol.v;
        const src = st && (st.attributes.app_name || st.attributes.source || st.attributes.media_title);
        const off = ['off', 'standby', 'unavailable', 'unknown'].includes(state);
        const parts = [playing ? 'Spiller' : off ? 'Av' : 'Pauset'];
        if (playing && src) parts.push(src);
        if (vol != null && !off) parts.push(`${vol} %`);
        return { id, name: this.fname(id), sub: parts.join(' · '), playing, vol: vol || 0, tv: st && st.attributes.device_class === 'tv' };
      });
      const m0 = media[0];
      const sensors = o.sensorer.map(x => {
        const id = eid(x), cls = (typeof x === 'object' && x.klasse) || this.at(id, 'device_class') || '';
        const b = BIN[cls] || ['Aktiv', 'Stille', 'sensors'];
        const ok = this.ok(id), onS = this.v(id) === 'on';
        let icon = b[2]; const name = H.strip(this.fname(id), words);
        if (cls === 'motion' && /g\d|turret|kamera|camera|doorbell|ringeklokke/i.test(id + ' ' + name)) icon = 'videocam';
        return { id, name, icon, state: ok ? (onS ? b[0] : b[1]) : '–', hot: ok && onS, pres: /occupancy|presence|motion/.test(cls) };
      }).concat(o.lysniva.map(id => ({ id, name: o.lysniva.length > 1 ? H.strip(this.fname(id), words) : 'Lysnivå', icon: 'light_mode', state: this.ok(id) ? `${nf(this.n(id, 0), 1)} lx` : '–', hot: false, pres: false })));
      const act = sensors.filter(z => z.hot).length;

      // fliser (designets tile())
      const tile = (key, icon, label, sub, cc, actv, go, arg, fillPct) => ({ key, icon, label, sub, go, arg,
        style: { position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 10, height: 66, padding: '0 12px 0 8px', borderRadius: 33, background: '#1c1c1f', boxShadow: actv ? `inset 0 0 0 1px ${a(cc, 0.35)}` : 'none', transition: 'box-shadow .3s, transform .2s' },
        fill: { position: 'absolute', left: 0, top: 0, bottom: 0, width: `${fillPct ?? (actv ? 100 : 0)}%`, background: a(cc, 0.16), transition: 'width .5s cubic-bezier(.34,1.2,.64,1)' },
        iconWrap: { position: 'relative', width: 50, height: 50, borderRadius: 25, flex: 'none', display: 'grid', placeItems: 'center', background: actv ? cc : '#2a2a2d', color: actv ? '#141416' : '#a9a7a2', transition: 'background .3s' },
        subStyle: { fontSize: 12, color: actv ? '#e6e4df' : '#8e8d89', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } });
      const presOn = sensors.some(z => z.pres && z.hot);
      const tStrom = () => tile('strom', 'bolt', 'Strøm', `${watt} W nå`, C.amber, watt > 0, 'moreInfo', o.effekt[0] || '');
      const presS = sensors.find(z => z.pres);
      const TF = { // alle mulige fliser (nøkkel → bygger)
        lys: () => tile('lys', 'lightbulb', 'Lys', on ? `${on} av ${o.lys.length} på` : 'Alle av', C.yellow, on > 0, 'lightsAll', ''),
        gardin: cover ? () => tile('gardin', 'curtains', 'Gardiner', cv ? `${cv} % åpen` : 'Lukket', C.pink, cv > 0, 'curtain', cover, cv) : null,
        media: m0 ? () => tile('media', m0.tv ? 'tv' : 'speaker', 'Media', m0.playing ? 'Spiller' : 'Pauset', C.green, m0.playing, 'mediaTog', m0.id) : null,
        tilstede: presS || !m0 ? () => tile('tilstede', 'sensor_occupied', 'Tilstede', presOn ? 'Noen her' : 'Tomt', C.blue, act > 0, 'moreInfo', (presS || {}).id || '') : null,
        strom: tStrom,
        fukt: () => tile('fukt', 'water_drop', 'Fukt', `${hum != null ? nf(hum, 0) : '–'} %`, C.blue, false, 'moreInfo', L.humId || ''),
        klima: k ? () => tile('klima', 'heat', 'Klima', `${Number.isInteger(k.set) ? k.set : nf(k.set, 1)}° · ${k.heating ? 'varmer' : 'holder'}`, C.red, !!k.heating, 'moreInfo', k.power || k.id) : null,
      };
      const U = KD.userRoom(this, r.id), UF = U.fliser || {}, US = U.scener || {};
      const tDef = ['lys', cover ? 'gardin' : 'strom', m0 ? 'media' : 'tilstede', cover ? 'strom' : 'fukt'];
      const tAll = [...tDef, ...Object.keys(TF).filter(x => !tDef.includes(x))].filter(x => TF[x]);
      const ordered = (all, rek) => [...(rek || []).filter(x => all.includes(x)), ...all.filter(x => !(rek || []).includes(x))].filter((x, i, arr) => arr.indexOf(x) === i);
      const tOrder = this._tileOrder = ordered(tAll, UF.rekkefolge);
      const tHid = x => (UF.skjul || []).includes(x) || (!tDef.includes(x) && !(UF.vis || []).includes(x));
      this._tileHid = tHid;
      const tilesAll = tOrder.map(x => { const t = TF[x](); t.def = t.label; if (UF.navn && UF.navn[x]) t.label = UF.navn[x]; t.hid = tHid(x); return t; });
      const tiles = s.edit ? tilesAll : tilesAll.filter(t => !t.hid);

      // scener
      const lo = H.lysOv(this, r.id);
      let scenes = [];
      if (lo && Array.isArray(lo.attributes.scener)) scenes = lo.attributes.scener.filter(x => x && this._has(x.entity)).map(x => { const m = KI_SC[x.id]; return { key: x.entity, ent: x.entity, label: m ? m[0] : x.navn, icon: m ? m[1] : H.msIcon(x.ikon, 'auto_awesome') }; });
      else for (const id of Object.keys(KI_SC)) { const b = `button.${r.id}_lys_${id}`; if (this._has(b)) scenes.push({ key: b, ent: b, label: KI_SC[id][0], icon: KI_SC[id][1] }); }
      for (const id of [...o.skript, ...o.scener]) scenes.push({ key: id, ent: id, label: H.strip(this.fname(id), words), icon: id.startsWith('script.') ? 'play_circle' : 'palette' });
      if (!scenes.length && o.lys.length) scenes = SCENES.map(([key, label, icon]) => ({ key: 'fb:' + key, fb: key, label, icon }));
      for (const id of [].concat(US.ekstra || [])) if (this._has(id) && !scenes.some(x => x.key === id)) scenes.push({ key: id, ent: id, label: H.strip(this.fname(id), words), icon: id.startsWith('script.') ? 'play_circle' : 'palette', extra: true });
      const sHid = x => (US.skjul || []).includes(x);
      const sOrder = this._sceneOrder = ordered(scenes.map(x => x.key), US.rekkefolge);
      scenes = sOrder.map(key => { const x = scenes.find(y => y.key === key); return { ...x, def: x.label, label: (US.navn && US.navn[key]) || x.label, hid: sHid(key) }; });
      this._scenes = scenes;
      const scShown = s.edit ? scenes : scenes.filter(x => !x.hid);

      const humBar = { display: 'block', width: `${hum != null ? KD.clamp(hum, 0, 100) : 0}%`, height: '100%', borderRadius: 3, background: hum > 60 ? C.amber : C.blue };
      const headIcon = { width: 40, height: 40, borderRadius: 20, flex: 'none', display: 'grid', placeItems: 'center', background: col, color: '#141416' };
      const climIcon = k ? { width: 52, height: 52, borderRadius: 26, flex: 'none', display: 'grid', placeItems: 'center', background: k.heating ? C.red : '#2a2a2d', color: k.heating ? '#141416' : '#a9a7a2', transition: 'background .3s' } : null;
      const modeLabel = k ? (k.heating ? (k.w != null ? `Varmer · ${k.w} W` : 'Varmer') : 'Holder temperaturen') : '';
      const setVal = k ? (Number.isInteger(k.set) ? String(k.set) : nf(k.set, 1)) : '';
      this._headVals = [r.ikon, r.navn, `${temp != null ? nf(temp, 1) : '–'}° · ${hum != null ? nf(hum, 0) : '–'} %`];

      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) ${s.edit ? 'calc(190px + env(safe-area-inset-bottom))' : '40px'};display:flex;flex-direction:column;gap:18px">
  <header style="display:flex;align-items:center;gap:12px;padding:0 4px">
    <span style="${S(headIcon)}"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">${E(r.ikon)}</span></span>
    <div style="flex:1;font-size:26px;font-weight:500;letter-spacing:-0.02em">${E(r.navn)}</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section style="display:flex;align-items:center;gap:16px;padding:18px 20px;border-radius:30px;background:#1c1c1f">
    <div data-on-click="moreInfo" data-arg="${E(L.tempId || '')}" style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">
      <span style="display:flex;align-items:center;gap:6px;font-size:12px;color:#8e8d89"><span class="ms" style="font-size:17px;color:oklch(0.82 0.12 75);font-variation-settings:'FILL' 1">thermostat</span>Temperatur</span>
      <span style="font-size:46px;font-weight:300;letter-spacing:-0.05em;line-height:1;font-variant-numeric:tabular-nums;white-space:nowrap"><span>${E(temp != null ? nf(temp) : '–')}</span><span style="font-size:22px;color:#8e8d89">°</span></span>
      <span style="font-size:11px;color:#8e8d89;white-space:nowrap"><span>${E(tempRange)}</span> siste døgn</span>
    </div>
    <span style="width:1px;align-self:stretch;background:rgba(255,255,255,0.07)"></span>
    <div data-on-click="moreInfo" data-arg="${E(L.humId || '')}" style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">
      <span style="display:flex;align-items:center;gap:6px;font-size:12px;color:#8e8d89"><span class="ms" style="font-size:17px;color:oklch(0.8 0.12 250);font-variation-settings:'FILL' 1">water_drop</span>Fukt</span>
      <span style="font-size:46px;font-weight:300;letter-spacing:-0.05em;line-height:1;font-variant-numeric:tabular-nums;white-space:nowrap"><span>${E(hum != null ? nf(hum, 0) : '–')}</span><span style="font-size:22px;color:#8e8d89"> %</span></span>
      <span style="display:block;height:6px;border-radius:3px;background:#2a2a2d;overflow:hidden;margin-top:5px"><span style="${S(humBar)}"></span></span>
    </div>
  </section>

  <section style="display:flex;flex-direction:column;gap:12px"><div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
    ${tiles.map(t => `<button class="kdr-a97" data-key="${t.key}" data-on-click="${s.edit ? 'tileTog' : t.go}" data-arg="${E(s.edit ? t.key : t.arg)}" ${s.edit ? '' : 'data-hold="moreInfo" '}style="${S({ ...t.style, ...(s.edit ? { opacity: t.hid ? 0.38 : 1, boxShadow: t.hid ? 'inset 0 0 0 1px rgba(255,255,255,0.12)' : 'inset 0 0 0 1.5px oklch(0.78 0.13 350 / 0.55)' } : {}) })}">
        <span style="${S(t.fill)}"></span>
        <span style="${S(t.iconWrap)}"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">${t.icon}</span></span>
        <span style="position:relative;display:flex;flex-direction:column;gap:1px;min-width:0;text-align:left">
          <span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(t.label)}</span>
          <span style="${S(t.subStyle)}">${E(t.sub)}</span>
        </span>
        ${s.edit ? `<span class="ms" style="position:relative;margin-left:auto;font-size:18px;color:${t.hid ? '#f2f1ee' : 'oklch(0.82 0.1 350)'}">${t.hid ? 'visibility_off' : 'visibility'}</span>` : ''}
      </button>`).join('')}
  </div>${s.edit ? this._edPanel('fliser', 'Fliser', 'grid_view', tilesAll.map(t => ({ key: t.key, icon: t.icon, label: t.label, def: t.def, hid: t.hid })), UF.navn) : ''}</section>

  ${scShown.length || s.edit ? `<section style="display:flex;flex-direction:column;gap:12px">${scShown.length ? `<div data-hscroll="1" style="display:flex;gap:14px;overflow-x:auto;scrollbar-width:none;margin:0 calc(-1 * var(--kd-kant,10px));padding:2px var(--kd-kant,10px)">
    ${scShown.map(x => { const act = s.scene === x.key && !s.edit;
      const bubble = { width: 58, height: 58, borderRadius: 29, display: 'grid', placeItems: 'center', background: act ? PINK : '#1c1c1f', color: act ? '#2a1720' : '#c9c7c2', boxShadow: act ? '0 6px 18px rgba(240,140,190,0.3)' : 'inset 0 0 0 1px rgba(255,255,255,0.05)', transform: act ? 'scale(1.06)' : 'scale(1)', transition: 'transform .35s cubic-bezier(.34,1.8,.64,1), background .25s' };
      if (s.edit) Object.assign(bubble, { opacity: x.hid ? 0.38 : 1, boxShadow: x.hid ? 'inset 0 0 0 1px rgba(255,255,255,0.12)' : 'inset 0 0 0 1.5px oklch(0.78 0.13 350 / 0.55)' });
      return `<button data-key="${E(x.key)}" data-on-click="${s.edit ? 'sceneHide' : 'sceneGo'}" data-arg="${E(x.key)}" style="flex:none;display:flex;flex-direction:column;align-items:center;gap:6px;width:62px">
        <span style="${S(bubble)}"><span class="ms" style="${S({ fontSize: 24, fontVariationSettings: `'FILL' ${act ? 1 : 0}` })}">${E(x.icon)}</span></span>
        <span style="${S({ fontSize: 11, fontWeight: 500, color: act ? '#f2f1ee' : '#8e8d89', whiteSpace: 'nowrap', maxWidth: 66, overflow: 'hidden', textOverflow: 'ellipsis', opacity: s.edit && x.hid ? 0.5 : 1 })}">${E(x.label)}</span>
      </button>`; }).join('')}
  </div>` : ''}${s.edit ? this._edPanel('scener', 'Scener', 'auto_awesome', scenes.map(x => ({ key: x.key, icon: x.icon, label: x.label, def: x.def, hid: x.hid, extra: x.extra })), US.navn) : ''}</section>` : ''}

  ${lightRows.length ? `<section style="display:flex;flex-direction:column;gap:8px">
    <div style="display:flex;justify-content:space-between;padding:0 6px"><span style="font-size:15px;font-weight:500">Lys</span><span style="font-size:12px;color:#8e8d89">${on} på · dra for å dimme</span></div>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
      ${lightRows.map(l => H.pill(this, l.id, l.name, true)).join('')}
    </div>
  </section>` : ''}

  ${devices.length ? `<section style="display:flex;flex-direction:column;gap:8px">
    <div style="display:flex;justify-content:space-between;padding:0 6px"><span style="font-size:15px;font-weight:500">Enheter</span><span style="font-size:12px;color:#8e8d89">${watt} W</span></div>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
      ${devices.map(d => {
        const pill = { display: 'flex', alignItems: 'center', gap: 8, height: 56, padding: '0 12px 0 6px', borderRadius: 28, background: d.on ? a(C.amber, 0.12) : '#1c1c1f', transition: 'background .25s, transform .2s' };
        const iw = { width: 44, height: 44, borderRadius: 22, flex: 'none', display: 'grid', placeItems: 'center', background: d.on ? C.amber : '#2a2a2d', color: d.on ? '#141416' : '#6d6c69', transition: 'background .25s' };
        const sub = d.bad ? '–' : d.on ? (d.w ? `${d.w} W` : 'På') : 'Av';
        return `<button class="kdr-a97" data-key="${E(d.entity)}" data-on-click="devTog" data-arg="${E(d.entity)}" data-hold="moreInfo" style="${S(pill)}">
          <span style="${S(iw)}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">${d.icon}</span></span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column;text-align:left">
            <span style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(d.name)}</span>
            <span style="${S({ fontSize: 11, color: d.on ? '#e6e4df' : '#6d6c69' })}">${E(sub)}</span>
          </span>
        </button>`; }).join('')}
    </div>
  </section>` : ''}

  ${k ? `<section style="display:flex;flex-direction:column;gap:8px">
    <div style="display:flex;justify-content:space-between;padding:0 6px"><span style="font-size:15px;font-weight:500">Klima</span><span style="font-size:12px;color:#8e8d89">${E(modeLabel)}</span></div>
    <div style="display:flex;align-items:center;gap:10px;padding:6px;border-radius:34px;background:#1c1c1f">
    <span data-on-click="moreInfo" data-arg="${E(k.power || k.id)}" style="${S(climIcon)}"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">heat</span></span>
    <span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:14px;font-weight:500;white-space:nowrap">${E(k.name)}</span><span style="font-size:11px;color:#8e8d89">${E(modeLabel)}</span></span>
    <button class="kdr-a92" data-on-click="step" data-arg="-1" style="width:44px;height:44px;border-radius:22px;background:#262629;display:grid;place-items:center;flex:none"><span class="ms" style="font-size:20px">remove</span></button>
    <span style="min-width:48px;text-align:center;font-size:17px;font-weight:500;font-variant-numeric:tabular-nums">${E(setVal)}°</span>
    <button class="kdr-a92" data-on-click="step" data-arg="1" style="width:44px;height:44px;border-radius:22px;background:#262629;display:grid;place-items:center;flex:none"><span class="ms" style="font-size:20px">add</span></button>
  </div>
  </section>` : ''}

  ${media.map(m => {
    const card = { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px 10px 10px', borderRadius: 36, background: m.playing ? `linear-gradient(90deg, ${a(C.green, 0.16)}, #1c1c1f)` : '#1c1c1f', transition: 'background .4s' };
    const art = { width: 52, height: 52, borderRadius: 26, flex: 'none', display: 'grid', placeItems: 'center', background: m.playing ? C.green : '#2a2a2d', color: m.playing ? '#141416' : '#a9a7a2' };
    const fill = { position: 'absolute', left: 0, top: 0, bottom: 0, width: `${m.vol}%`, borderRadius: 3, background: '#f2f1ee' };
    return `<section data-key="${E(m.id)}" style="${S(card)}">
    <span data-on-click="moreInfo" data-arg="${E(m.id)}" style="${S(art)}"><span class="ms" style="font-size:24px;font-variation-settings:'FILL' 1">${m.tv ? 'tv' : 'speaker'}</span></span>
    <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
      <span data-on-click="moreInfo" data-arg="${E(m.id)}" style="display:flex;flex-direction:column"><span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(m.name)}</span><span style="font-size:12px;color:#8e8d89">${E(m.sub)}</span></span>
      <span data-arg="${E(m.id)}" data-on-pointerdown="mDown" data-on-pointermove="mMove" data-on-pointerup="mUp" data-on-pointercancel="mCancel" style="position:relative;display:block;height:6px;border-radius:3px;background:rgba(255,255,255,0.12);touch-action:pan-y;cursor:pointer"><span style="${S(fill)}"></span></span>
    </span>
    <button class="kdr-a92" data-on-click="mediaTog" data-arg="${E(m.id)}" style="width:48px;height:48px;border-radius:24px;flex:none;background:#f2f1ee;color:#141416;display:grid;place-items:center"><span class="ms" style="font-size:26px;font-variation-settings:'FILL' 1">${m.playing ? 'pause' : 'play_arrow'}</span></button>
  </section>`; }).join('')}

  ${sensors.length ? `<section style="display:flex;flex-direction:column;gap:8px">
    <div style="display:flex;justify-content:space-between;padding:0 6px"><span style="font-size:15px;font-weight:500">Sensorer</span><span style="font-size:12px;color:#8e8d89">${act} aktiv</span></div>
    <div style="display:flex;flex-direction:column;padding:4px 14px;border-radius:24px;background:#1c1c1f">
      ${sensors.map((z, i) => `<div data-key="${E(z.id)}" data-on-click="moreInfo" data-arg="${E(z.id)}" style="${S({ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' })}">
          <span class="ms" style="${S({ fontSize: 18, color: z.hot ? C.blue : '#6d6c69' })}">${z.icon}</span>
          <span style="flex:1;min-width:0;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${E(z.name)}</span>
          <span style="${S({ fontSize: 12, fontWeight: 500, padding: '4px 9px', borderRadius: 10, whiteSpace: 'nowrap', background: z.hot ? a(C.blue, 0.16) : '#262629', color: z.hot ? '#f2f1ee' : '#8e8d89' })}">${E(z.state)}</span>
        </div>`).join('')}
    </div>
  </section>` : ''}

  ${s.edit ? `<div data-key="kd-edit-bar" style="position:fixed;left:var(--kd-kant,10px);right:var(--kd-kant,10px);bottom:calc(100px + env(safe-area-inset-bottom));z-index:30;max-width:620px;margin:0 auto;display:flex;align-items:center;gap:10px;padding:8px 8px 8px 16px;border-radius:30px;background:rgba(38,38,41,0.92);backdrop-filter:blur(18px) saturate(160%);-webkit-backdrop-filter:blur(18px) saturate(160%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.07),0 8px 24px rgba(0,0,0,0.35)">
    <span class="ms" style="font-size:20px;color:oklch(0.82 0.1 350)">visibility</span>
    <span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:14px;font-weight:500">Tilpass rommet</span><span style="font-size:11px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Trykk for å skjule eller vise</span></span>
    <button class="kdr-a92" data-on-click="editReset" style="height:40px;padding:0 14px;border-radius:20px;background:rgba(255,255,255,0.08);font-size:13px;font-weight:500">Nullstill</button>
    <button class="kdr-a92" data-on-click="editTog" style="height:40px;padding:0 16px;border-radius:20px;background:linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20));color:#2a1720;font-size:13px;font-weight:600">Ferdig</button>
  </div>` : ''}

  <section data-on-click="moreInfo" data-arg="${E(L.tempId || '')}" style="display:flex;flex-direction:column;gap:6px;padding:14px 16px;border-radius:24px;background:#1c1c1f">
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#8e8d89"><span>Temperatur siste døgn</span><span>${E(tempRange)}</span></div>
    <svg viewBox="0 0 384 60" preserveAspectRatio="none" style="width:100%;height:56px;display:block">
      <path d="${line ? line + ' L384,60 L0,60 Z' : ''}" fill="oklch(0.82 0.12 75 / 0.12)"></path>
      <path d="${line}" fill="none" stroke="oklch(0.82 0.12 75)" stroke-width="1.5" vector-effect="non-scaling-stroke"></path>
    </svg>
  </section>
  ${s.edit ? this._sensorPicker(r, L) : ''}
  ${s.edit ? '' : `<button class="kdr-a97" data-key="kd-edit-btn" data-on-click="editTog" style="display:flex;align-items:center;justify-content:center;gap:8px;height:48px;border-radius:24px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.04);color:#a9a7a2;font-size:13px;font-weight:500"><span class="ms" style="font-size:18px">tune</span>Tilpass rommet</button>`}
</div>`;
    }
  }
  KDRomCard.head = function () {
    if (this._headVals) return this._headVals; // satt av body() (som alltid kjører først)
    const r = this._room(), L = this._live(r, null);
    return [r.ikon, r.navn, `${L.temp != null ? nf(L.temp, 1) : '–'}° · ${L.hum != null ? nf(L.hum, 0) : '–'} %`];
  };
  KDRomCard.defaults = { gardin_inverter: false };
  Object.assign(KDRomCard.prototype, H.mixin);

  KD.define('kd-rom-card', KDRomCard, 'KD Rom', 'Ett rom: temperatur, lys (dra for å dimme), scener, enheter, klima, media og sensorer – bygget automatisk fra ki_rom.');
  KD.sheet('rom', 'kd-rom-card');
})();
} catch (e) { console.error('ki-hjem-design: 71-kd-rom-card.js', e); }

/* ===== 95-kd-editor.js ===== */
try {
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
  const PROFIL = sel([{ value: 'auto', label: 'Automatisk (landet i HA)' }, { value: 'no', label: 'Norge – Norgespris, NOK' }, { value: 'se', label: 'Sverige – SE3, SEK' }]);
  const PRIS = { entity: { domain: 'sensor' } };
  const EXTRA = {
    'kd-strom-card': { strom_profil: PROFIL, pris: PRIS, spotpris: PRIS, norgespris: PRIS, spart_i_dag: PRIS },
    'kd-hjem-card': {
      strom_profil: PROFIL, pris: PRIS, pris_total: PRIS, pris_spot: PRIS, pris_norges: PRIS,
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
} catch (e) { console.error('ki-hjem-design: 95-kd-editor.js', e); }
