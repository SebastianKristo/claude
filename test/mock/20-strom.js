// Mock for kd-strom-card – gjenskaper eksempelverdiene i «Strøm v3».
// Prisene (totalpris/Nord Pool/Norgespris) kommer fra 00-felles.js (samme SPOT/TMR som designet).
// Designet står på kl. 21 – kortet leser «nå» fra window.__kdMockNowStrom (bare i test).
// Andre mocker deler entiteter (Hjem viser 1 155 W på sensor.strommaler_effekt, Rom har sin egen sensor.stue_oversikt),
// så rommene/enhetene her har egne kdm_-ID-er. For 1:1-sammenligning:
//   --cfg '{"header":false,"effekt":"sensor.kd_mock_strom_effekt","rom":["kdm_vaskegang","kdm_bad","kdm_stue","kdm_kjokken","kdm_kontor","kdm_sebastian","kdm_garasje"]}'
(() => {
  const at = (h, m) => { const d = new Date(); d.setHours(h, m, 0, 0); return d; };
  window.__kdMockNowStrom = at(21, 4).getTime();
  const SPOT = [62,58,55,54,56,68,118,142,138,125,110,98,92,88,90,104,128,156,188,204,176,140,112,86].map(v => v / 100);
  const USE = [2.9,2.7,2.6,2.2,1.4,1.1,0.9,1.2,1.3,0.8,0.7,1.0,1.9,2.2,1.5,1.0,0.8,1.1,1.0,0.5,1.2,1.1];
  const price = sp => sp * 1.25 + 0.45 - Math.max(0, (sp - 0.75) * 0.9) * 1.25;
  const saved = USE.reduce((t, k, h) => t + (price(SPOT[h]) - 0.90) * k, 0);
  const W = (v) => ({ state: String(v), attributes: { unit_of_measurement: 'W', device_class: 'power' } });
  const dev = (id, name, state) => ({ state, attributes: { friendly_name: name } });
  const ov = (name, o) => ({ state: '1', attributes: { friendly_name: name + ' Oversikt', integrasjon: 'ki_rom', brytere: [], klima: [], vifter: [], effekt_andre: [], ...o,
    effekt: [...(o.klima || []), ...(o.brytere || [])].map((d) => d.effekt).sort((x, y) => (ORDER.indexOf(x) - ORDER.indexOf(y))) } });
  const ORDER = ['sensor.kdm_bad_gulvvarme_power', 'sensor.kdm_bad_speillys_power', 'sensor.kdm_fryseskap_power', 'sensor.kdm_kjokken_gulvvarme_power', 'sensor.kdm_oppvaskmaskin_power'];
  MOCK.add({
    'sensor.kd_mock_strom_effekt': W(3535),
    'sensor.strommaler_powercalc_energy_daily': { state: String(USE.reduce((a, b) => a + b, 0).toFixed(2)), attributes: { unit_of_measurement: 'kWh', state_class: 'total_increasing' } },
    'sensor.norgespris_besparelse_dag': { state: saved.toFixed(2), attributes: { unit_of_measurement: 'kr' } },
    'number.ki_mal_trinn_kw': { state: '5.0', attributes: { min: 2, max: 20, step: 0.5, unit_of_measurement: 'kW' } },
    'sensor.ki_bereder': { state: 'Varmer nå', attributes: { bryter: 'switch.varmtvannsbereder', bryter_pa: true, varmer: true, effekt_w: 2000 } },
    // Rom fra ki_rom (rekkefølgen her = rekkefølgen i kortet)
    'sensor.kdm_vaskegang_oversikt': ov('Vaskegang', { brytere: [{ entity: 'switch.varmtvannsbereder', effekt: 'sensor.varmtvannsbereder_power' }] }),
    'sensor.kdm_bad_oversikt': ov('Bad', { klima: [{ entity: 'climate.kdm_bad_gulvvarme', effekt: 'sensor.kdm_bad_gulvvarme_power' }], brytere: [{ entity: 'switch.kdm_bad_speillys', effekt: 'sensor.kdm_bad_speillys_power' }] }),
    'sensor.kdm_stue_oversikt': ov('Stue', { brytere: [{ entity: 'switch.kdm_server_rack', effekt: 'sensor.kdm_server_rack_power' }, { entity: 'switch.kdm_stue_tv', effekt: 'sensor.kdm_stue_tv_power' }, { entity: 'switch.kdm_stue_lys', effekt: 'sensor.kdm_stue_lys_power' }] }),
    'sensor.kdm_kjokken_oversikt': ov('Kjøkken', { brytere: [{ entity: 'switch.kdm_fryseskap', effekt: 'sensor.kdm_fryseskap_power' }, { entity: 'switch.kdm_oppvaskmaskin', effekt: 'sensor.kdm_oppvaskmaskin_power' }], klima: [{ entity: 'climate.kdm_kjokken_gulvvarme', effekt: 'sensor.kdm_kjokken_gulvvarme_power' }] }),
    'sensor.kdm_kontor_oversikt': ov('Kontor', { brytere: [{ entity: 'switch.kdm_pult', effekt: 'sensor.kdm_pult_power' }] }),
    'sensor.kdm_sebastian_oversikt': ov('Sebastian', { klima: [{ entity: 'climate.kdm_sebastian_panelovn', effekt: 'sensor.kdm_sebastian_panelovn_power' }] }),
    'sensor.kdm_garasje_oversikt': ov('Garasje', { brytere: [{ entity: 'switch.kdm_elbillader', effekt: 'sensor.kdm_elbillader_power' }] }),
    'switch.varmtvannsbereder': dev('', 'Varmtvann', 'on'), 'sensor.varmtvannsbereder_power': W(2000),
    'climate.kdm_bad_gulvvarme': dev('', 'Bad gulvvarme', 'heat'), 'sensor.kdm_bad_gulvvarme_power': W(850),
    'switch.kdm_bad_speillys': dev('', 'Bad speillys', 'off'), 'sensor.kdm_bad_speillys_power': W(0),
    'switch.kdm_server_rack': dev('', 'Server rack', 'on'), 'sensor.kdm_server_rack_power': W(180),
    'switch.kdm_stue_tv': dev('', 'Stue TV', 'on'), 'sensor.kdm_stue_tv_power': W(120),
    'switch.kdm_stue_lys': dev('', 'Stue lys', 'on'), 'sensor.kdm_stue_lys_power': W(60),
    'switch.kdm_fryseskap': dev('', 'Fryseskap', 'on'), 'sensor.kdm_fryseskap_power': W(90),
    'climate.kdm_kjokken_gulvvarme': dev('', 'Kjøkken gulvvarme', 'off'), 'sensor.kdm_kjokken_gulvvarme_power': W(0),
    'switch.kdm_oppvaskmaskin': dev('', 'Oppvask', 'on'), 'sensor.kdm_oppvaskmaskin_power': W(0),
    'switch.kdm_pult': dev('', 'Pult', 'on'), 'sensor.kdm_pult_power': W(95),
    'climate.kdm_sebastian_panelovn': dev('', 'Sebastian panelovn', 'heat'), 'sensor.kdm_sebastian_panelovn_power': W(0),
    'switch.kdm_elbillader': dev('', 'Elbillader', 'off'), 'sensor.kdm_elbillader_power': W(0),
  });
  // Statistikk (timeforbruk i dag) og logbok – lagt oppå eventuelle andre handlere
  const make0 = MOCK.make;
  MOCK.make = function () {
    const h = make0.apply(this, arguments), cw = h.callWS;
    h.callWS = (msg) => {
      if (msg.type === 'recorder/statistics_during_period' && (msg.statistic_ids || []).includes('sensor.strommaler_powercalc_energy_daily')) {
        const out = []; for (let i = 0; i < 21; i++) { const s = at(i, 0); out.push({ start: s.getTime(), end: s.getTime() + 3600e3, change: USE[i] }); }
        return Promise.resolve({ 'sensor.strommaler_powercalc_energy_daily': out });
      }
      if (msg.type === 'logbook/get_events' && (msg.entity_ids || []).includes('switch.varmtvannsbereder')) {
        return Promise.resolve([
          { when: at(15, 50).getTime() / 1000, entity_id: 'switch.kdm_oppvaskmaskin', state: 'on', name: 'Oppvask' },
          { when: at(17, 32).getTime() / 1000, entity_id: 'switch.kdm_oppvaskmaskin', state: 'off', name: 'Oppvask' },
          { when: at(18, 58).getTime() / 1000, entity_id: 'climate.kdm_kjokken_gulvvarme', state: 'off', name: 'Kjøkken gulvvarme', context_domain: 'script', context_entity_id_name: 'Prisstyring' },
          { when: at(20, 14).getTime() / 1000, entity_id: 'switch.varmtvannsbereder', state: 'on', name: 'Varmtvann', context_domain: 'automation', context_entity_id_name: 'Varmtvann' },
        ]);
      }
      if (msg.type === 'history/history_during_period' && (msg.entity_ids || []).length === 1 && msg.entity_ids[0] === 'sensor.kdm_oppvaskmaskin_power') {
        const pts = []; for (let t = at(15, 50).getTime(); t <= at(17, 30).getTime(); t += 300e3) pts.push({ s: '529.4', lu: t / 1000 });
        pts.push({ s: '0', lu: at(17, 32).getTime() / 1000 });
        return Promise.resolve({ 'sensor.kdm_oppvaskmaskin_power': pts });
      }
      return cw(msg);
    };
    return h;
  };
})();
