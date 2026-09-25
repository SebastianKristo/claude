// Mock for kd-person-card – gjenskaper designets eksempel (personId: sebastian).
// Person/bryter-tilstander deles med Hjem-mocken og overstyres bare når kortet som testes er dette.
(() => {
  const mine = new URLSearchParams(location.search).get('card') === 'kd-person-card';
  const at = (off, h, m) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + off); d.setHours(h, m, 0, 0); return d; };
  const P = 'sensor.sebastian_iphone_17_pro_';
  const u = (state, unit, attrs) => ({ state: String(state), attributes: { unit_of_measurement: unit, ...(attrs || {}) } });
  MOCK.add({
    [P + 'battery_level']: u(64, '%'), [P + 'battery_state']: 'Not Charging',
    [P + 'connection_type']: { state: 'Wi-Fi', attributes: {} }, [P + 'ssid']: 'Hjemme',
    [P + 'geocoded_location']: { state: 'Strømstad', attributes: { Locality: 'Strømstad', Country: 'Norge' } },
    [P + 'steps']: u(8412, 'steps'), [P + 'distance']: u(0, 'm'),
    [P + 'sleep_duration']: { ...u(7.2, 'h'), last_changed: at(0, 7, 6).toISOString() },
    [P + 'awake']: u(57.6, 'min'), [P + 'core_sleep']: u(172.8, 'min'), [P + 'deep_sleep']: u(86.4, 'min'), [P + 'rem_sleep']: u(115.2, 'min'),
    [P + 'sleep_score']: u(82, ''),
    'binary_sensor.sebastian_iphone_17_pro_focus': 'off',
    'device_tracker.sebastian_iphone_17_pro': { state: 'home', attributes: { friendly_name: 'Sebastian iPhone 17 Pro', source_type: 'gps' } },
    'zone.home': { state: '3', attributes: { friendly_name: 'Strømstad' } },
    'zone.skole': { state: '0', attributes: { friendly_name: 'NTNU Gjøvik', icon: 'mdi:school' } },
  });
  if (mine) MOCK.add({
    'person.sebastian_kristo_jemtland': { state: 'home', attributes: { friendly_name: 'Sebastian', user_id: 'u1', device_trackers: ['device_tracker.sebastian_iphone_17_pro'] }, last_changed: at(0, 16, 42).toISOString() },
  });
  const HIST = {
    'person.sebastian_kristo_jemtland': [['home', at(-1, 12, 0)], ['not_home', at(0, 7, 40)], ['NTNU Gjøvik', at(0, 8, 12)], ['not_home', at(0, 15, 58)], ['home', at(0, 16, 42)]],
    'switch.homey_logic_sebastian_sovn_vaken': [['off', at(-1, 12, 0)], ['on', at(-1, 23, 36)], ['off', at(0, 7, 6)]],
    [P + 'sleep_duration']: [6.8, 7.4, 6.1, 7.9, 7.2, 8.4].map((v, i) => [String(v), at(i - 6, 7, 0)]).concat([['7.2', at(0, 7, 6)]]),
  };
  const make = MOCK.make;
  MOCK.make = () => {
    const h = make(), ws = h.callWS;
    h.callWS = (msg) => {
      if (msg.type === 'history/history_during_period' && msg.entity_ids.some(id => HIST[id])) {
        return ws(msg).then(r => {
          const out = { ...(r || {}) };
          for (const id of msg.entity_ids) if (HIST[id]) out[id] = HIST[id].map(([s, d]) => ({ s, lu: d.getTime() / 1000 }));
          return out;
        });
      }
      return ws(msg);
    };
    return h;
  };
})();
