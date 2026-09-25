// Mock av hass-objektet for testing i nettleser (brukes av harness.html).
// Mock-filer i test/mock/*.js kaller MOCK.add({...}), MOCK.ws(type, fn) og MOCK.api(regex, fn).
(() => {
  const states = {};
  const wsH = {}, apiH = [];
  const now = Date.now();
  const iso = (msAgo = 0) => new Date(now - msAgo).toISOString();
  const MOCK = window.MOCK = {
    calls: [],
    iso,
    add(obj) {
      for (const [id, v] of Object.entries(obj)) {
        const o = typeof v === 'object' && v !== null && 'state' in v ? v : { state: v };
        states[id] = { entity_id: id, state: String(o.state), attributes: o.attributes || {}, last_changed: o.last_changed || iso(o.ago || 3600e3), last_updated: o.last_updated || iso(o.ago || 60e3), context: {} };
      }
    },
    ws(type, fn) { wsH[type] = fn; },
    api(re, fn) { apiH.push([re, fn]); },
    set(id, state, attrs) { const s = states[id] || { entity_id: id, attributes: {} }; states[id] = { ...s, state: String(state), attributes: { ...s.attributes, ...(attrs || {}) }, last_changed: new Date().toISOString(), last_updated: new Date().toISOString() }; MOCK.push(); },
    push() { MOCK.hass = MOCK.make(); for (const el of document.querySelectorAll('[data-kd-card]')) el.hass = MOCK.hass; },
    make() {
      return {
        states: { ...states },
        user: { name: 'Sebastian', id: 'u1', is_admin: true },
        language: 'nb', locale: { language: 'nb', number_format: 'language', time_format: '24' },
        themes: { darkMode: true },
        callService(domain, service, data, target) {
          MOCK.calls.push([domain, service, data, target]);
          console.log('callService', domain, service, JSON.stringify(data || {}));
          const id = data && data.entity_id;
          if (id && typeof id === 'string' && states[id]) {
            const s = states[id].state;
            if (service === 'toggle') MOCK.set(id, s === 'on' ? 'off' : 'on');
            else if (service === 'turn_on') MOCK.set(id, 'on');
            else if (service === 'turn_off') MOCK.set(id, 'off');
            else if (service === 'lock') MOCK.set(id, 'locked');
            else if (service === 'unlock') MOCK.set(id, 'unlocked');
            else if (service === 'set_value') MOCK.set(id, data.value);
            else if (service === 'select_option') MOCK.set(id, data.option);
          }
          return Promise.resolve({});
        },
        callWS(msg) { const h = wsH[msg.type]; return h ? Promise.resolve(h(msg)) : Promise.resolve(msg.type === 'history/history_during_period' ? {} : []); },
        callApi(method, path, data) { for (const [re, fn] of apiH) if (re.test(path)) return Promise.resolve(fn(path, data)); return Promise.resolve([]); },
        formatEntityState(s) { return s.state; },
        connection: { subscribeMessage: () => Promise.resolve(() => {}) },
      };
    },
  };
  // Standard historikk: jevn kurve rundt dagens verdi
  MOCK.ws('history/history_during_period', (msg) => {
    const out = {};
    const start = new Date(msg.start_time).getTime(), end = new Date(msg.end_time).getTime();
    for (const id of msg.entity_ids) {
      const s = states[id]; const base = s ? parseFloat(s.state) : 0; const arr = [];
      if (isNaN(base)) { out[id] = [{ s: s ? s.state : 'off', lu: start / 1000 }]; continue; }
      for (let t = start, i = 0; t <= end; t += 900e3, i++) arr.push({ s: (base + Math.sin(i / 8) * base * 0.08 + Math.cos(i / 3) * base * 0.02).toFixed(2), lu: t / 1000 });
      out[id] = arr;
    }
    return out;
  });
})();
