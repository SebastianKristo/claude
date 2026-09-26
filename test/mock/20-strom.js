// Mock for kd-strom-card – gjenskaper eksempelverdiene i «Strøm v5».
// Designet regner med klokka – kortet leser «nå» fra window.__kdMockNowStrom (bare i test), satt til kl. 21:04 i dag.
// Referansen tas med samme klokkeslett (Date overstyrt til 21:04, Math.random = 0.48 så effekten står på 2 074 W).
// Andre mocker deler entiteter (Hjem viser 1 155 W på sensor.strommaler_effekt, felles-mocken har Nord Pool/Norgespris),
// så designdataene ligger på egne kdm_-ID-er og kobles inn med window.__kdMockCfgStrom (legges under kortets config, bare i test).
(() => {
  const at = (h, m) => { const d = new Date(); d.setHours(h, m, 0, 0); return d; };
  window.__kdMockNowStrom = at(21, 4).getTime();
  const nowH = 21 + 4 / 60, nowHi = 21, frac = nowH - nowHi;
  // ----- designets eksempeldata (ordrett fra «Strøm v5») -----
  const TODAY = [98,95,92,90,93,105,132,160,172,165,150,140,128,115,108,112,135,170,205,232,225,200,170,140];
  const TOM = [85,80,78,77,80,95,120,150,158,148,132,120,110,100,96,102,125,160,190,210,198,176,150,120];
  const q15 = arr => Array.from({ length: 96 }, (_, i) => { const h = Math.floor(i / 4), f = (i % 4) / 4, n = arr[Math.min(23, h + 1)]; return arr[h] + (n - arr[h]) * f + Math.sin(i * 1.7) * 6 + Math.sin(i * 0.61) * 4; });
  const Q_TODAY = q15(TODAY), Q_TOM = q15(TOM);
  const USE = [0.62,0.64,0.82,0.78,0.52,0.64,1.98,2.06,2.06,1.42,1.1,0.94,0.88,0.8,0.86,1.1,1.6,2.2,2.4,2.1,1.7,1.3,0.9,0.7];
  const NET_DAG = 36.4, NET_NATT = 28.4, CO = 4.9, VAT = 1.25; // øre/kWh uten mva
  const price = (spot, h) => (spot + (h >= 6 && h < 22 ? NET_DAG : NET_NATT) + CO) * VAT; // øre/kWh
  const kwhToday = USE.slice(0, nowHi).reduce((x, y) => x + y, 0) + USE[nowHi] * frac;
  const krToday = USE.slice(0, nowHi + 1).reduce((x, y, i) => x + y * (i === nowHi ? frac : 1) * price(TODAY[i], i) / 100, 0);
  const day = (off) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + off); return d; };
  const raw = (arr, off, f) => { const n = arr.length, step = 86400e3 / n; return arr.map((v, i) => { const s = new Date(day(off).getTime() + i * step); return { start: s.toISOString(), end: new Date(s.getTime() + step).toISOString(), value: f(v, Math.floor(i * 24 / n)) }; }); };
  const W = (v) => ({ state: String(v), attributes: { unit_of_measurement: 'W', device_class: 'power' } });
  const A = (v) => ({ state: v.toFixed(2), attributes: { unit_of_measurement: 'A', device_class: 'current' } });
  const KWH = (v, name) => ({ state: v.toFixed(3), attributes: { unit_of_measurement: 'kWh', state_class: 'total_increasing', friendly_name: name } });
  const watt = 2074;
  const SRC = [['varmepumpe', 'Varmepumpe', 0.38], ['varmtvannsbereder', 'Varmtvannsbereder', 0.24], ['elbillader', 'Elbillader', 0.18]];
  const CIRC = [['heat_pump', 'Varmepumpe', 16, 780, 'L1'], ['water_heater', 'Varmtvannsbereder', 16, 0, 'L2'], ['ev_station', 'Elbillader', 32, 0, 'L1–L3'], ['kitchen', 'Kjøkken', 16, 410, 'L3'], ['local_laundry_service', 'Vaskerom', 16, 520, 'L2'], ['living', 'Stue og gang', 10, 180, 'L1'], ['bed', 'Soverom', 10, 60, 'L3'], ['garage', 'Garasje og ute', 10, 124, 'L2']];
  const kid = (name) => 'sensor.kdm_kurs_' + name.toLowerCase().replace(/ø/g, 'o').replace(/[^a-z]+/g, '_') + '_power';
  window.__kdMockCfgStrom = {
    kant: 18,
    effekt: 'sensor.kd_mock_strom_effekt', pris: 'sensor.kdm_totalpris', spotpris: 'sensor.kdm_spotpris', norgespris: 'sensor.kdm_norgespris',
    regning: 'sensor.kdm_stromregning', kostnad_maned: 'sensor.kdm_kostnad_maned', kostnad_ar: 'sensor.kdm_kostnad_ar',
    nettleie_dag: NET_DAG * VAT / 100, nettleie_natt: NET_NATT * VAT / 100, nettleie_helg: false, paslag: CO * VAT / 100,
    kurser: CIRC.map(([ikon, navn, a, , fase]) => ({ navn, ikon, a, fase, effekt: kid(navn) })),
    rom: ['kdm_vaskegang', 'kdm_bad', 'kdm_stue', 'kdm_kjokken', 'kdm_kontor', 'kdm_sebastian', 'kdm_garasje'],
  };
  const dev = (id, name, state) => ({ state, attributes: { friendly_name: name } });
  const ov = (name, o) => ({ state: '1', attributes: { friendly_name: name + ' Oversikt', integrasjon: 'ki_rom', brytere: [], klima: [], vifter: [], effekt_andre: [], ...o,
    effekt: [...(o.klima || []), ...(o.brytere || [])].map((d) => d.effekt).sort((x, y) => (ORDER.indexOf(x) - ORDER.indexOf(y))) } });
  const ORDER = ['sensor.kdm_bad_gulvvarme_power', 'sensor.kdm_bad_speillys_power', 'sensor.kdm_fryseskap_power', 'sensor.kdm_kjokken_gulvvarme_power', 'sensor.kdm_oppvaskmaskin_power'];
  MOCK.add({
    'sensor.kd_mock_strom_effekt': W(watt),
    'sensor.kdm_spotpris': { state: TODAY[nowHi].toFixed(2), attributes: { unit_of_measurement: 'øre/kWh', friendly_name: 'Spotpris', region: 'NO1', raw_today: raw(TODAY, 0, v => v), raw_tomorrow: raw(TOM, 1, v => v) } },
    'sensor.kdm_totalpris': { state: price(Q_TODAY[Math.floor(nowH * 4)], nowHi).toFixed(2), attributes: { unit_of_measurement: 'øre/kWh', friendly_name: 'Totalpris', raw_today: raw(Q_TODAY, 0, price), raw_tomorrow: raw(Q_TOM, 1, price) } },
    'sensor.kdm_norgespris': { state: '0.50', attributes: { unit_of_measurement: 'kr/kWh' } },
    'sensor.kdm_stromregning': { state: '1560', attributes: { unit_of_measurement: 'kr', friendly_name: 'Strømregning september' } },
    'sensor.kdm_kostnad_maned': { state: (548 + krToday).toFixed(2), attributes: { unit_of_measurement: 'kr' } },
    'sensor.kdm_kostnad_ar': { state: '11870', attributes: { unit_of_measurement: 'kr' } },
    'sensor.strommaler_powercalc_energy_daily': KWH(kwhToday, 'Strømmåler energi i dag'),
    // kilder (kWh i dag) – funnes automatisk som sensor.*_kurs_energy_daily
    ...Object.fromEntries(SRC.map(([id, name, f]) => ['sensor.kdm_' + id + '_kurs_energy_daily', KWH(kwhToday * f, name)])),
    // faser og kurser
    'sensor.kdm_strommaler_current_l1': A(watt * 0.42 / 230), 'sensor.kdm_strommaler_current_l2': A(watt * 0.34 / 230), 'sensor.kdm_strommaler_current_l3': A(watt * 0.24 / 230),
    ...Object.fromEntries(CIRC.map(([, name, , w]) => [kid(name), W(w)])),
    'sensor.norgespris_besparelse_dag': { state: '12.40', attributes: { unit_of_measurement: 'kr' } },
    'number.ki_mal_trinn_kw': { state: '5.0', attributes: { min: 2, max: 20, step: 0.5, unit_of_measurement: 'kW' } },
    'sensor.ki_bereder': { state: 'Varmer nå', attributes: { bryter: 'switch.varmtvannsbereder', bryter_pa: true, varmer: true, effekt_w: 2000 } },
    // Rom fra ki_rom (brukes til hendelsene og som kurser når `kurser` ikke er satt)
    'sensor.kdm_vaskegang_oversikt': ov('Vaskegang', { brytere: [{ entity: 'switch.varmtvannsbereder', effekt: 'sensor.varmtvannsbereder_power' }] }),
    'sensor.kdm_bad_oversikt': ov('Bad', { klima: [{ entity: 'climate.kdm_bad_gulvvarme', effekt: 'sensor.kdm_bad_gulvvarme_power' }], brytere: [{ entity: 'switch.kdm_bad_speillys', effekt: 'sensor.kdm_bad_speillys_power' }] }),
    'sensor.kdm_stue_oversikt': ov('Stue', { brytere: [{ entity: 'switch.kdm_server_rack', effekt: 'sensor.kdm_server_rack_power' }, { entity: 'switch.kdm_stue_tv', effekt: 'sensor.kdm_stue_tv_power' }, { entity: 'switch.kdm_stue_lys', effekt: 'sensor.kdm_stue_lys_power' }, { entity: 'switch.kdm_stue_lydplanke', effekt: 'sensor.kdm_stue_lydplanke_power' }] }),
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
    'switch.kdm_stue_lydplanke': dev('', 'Stue lydplanke', 'on'), 'sensor.kdm_stue_lydplanke_power': W(2),
    'switch.kdm_fryseskap': dev('', 'Fryseskap', 'on'), 'sensor.kdm_fryseskap_power': W(90),
    'climate.kdm_kjokken_gulvvarme': dev('', 'Kjøkken gulvvarme', 'off'), 'sensor.kdm_kjokken_gulvvarme_power': W(0),
    'switch.kdm_oppvaskmaskin': dev('', 'Oppvask', 'on'), 'sensor.kdm_oppvaskmaskin_power': W(0),
    'switch.kdm_pult': dev('', 'Pult', 'on'), 'sensor.kdm_pult_power': W(95),
    'climate.kdm_sebastian_panelovn': dev('', 'Sebastian panelovn', 'heat'), 'sensor.kdm_sebastian_panelovn_power': W(0),
    'switch.kdm_elbillader': dev('', 'Elbillader', 'off'), 'sensor.kdm_elbillader_power': W(0),
  });
  // Statistikk (timeforbruk per dag, måneder i år, timepris tidligere dager) og logbok – lagt oppå eventuelle andre handlere
  const EID = 'sensor.strommaler_powercalc_energy_daily';
  const MONTHS_KWH = (() => { const m = new Date().getMonth(), cur = 312 + kwhToday, rest = 11480 - cur, w = Array.from({ length: m }, (_, i) => [1.5, 1.4, 1.25, 1, 0.8, 0.6, 0.55, 0.6, 0.8, 1, 1.2, 1.4][i]), ws = w.reduce((a, b) => a + b, 0) || 1; return [...w.map((x) => rest * x / ws), cur]; })();
  const make0 = MOCK.make;
  MOCK.make = function () {
    const h = make0.apply(this, arguments), cw = h.callWS;
    h.callWS = (msg) => {
      const ids = msg.statistic_ids || [];
      if (msg.type === 'recorder/statistics_during_period' && ids.some((id) => id === EID || id.startsWith('sensor.kdm_'))) {
        const start = new Date(msg.start_time), out = {};
        if (msg.period === 'month') {
          if (ids.includes(EID)) out[EID] = MONTHS_KWH.map((v, i) => { const s = new Date(start.getFullYear(), i, 1); return { start: s.getTime(), end: new Date(start.getFullYear(), i + 1, 1).getTime(), change: v }; });
          return Promise.resolve(out);
        }
        const d0 = new Date(start); d0.setHours(0, 0, 0, 0);
        const off = Math.round((d0 - day(0)) / 86400e3);
        const use = off === 0 ? USE.slice(0, nowHi) : USE.map((v, i) => v * (0.85 + ((i * 7 + off * 13) % 10) / 30));
        const tot = use.reduce((a, b) => a + b, 0);
        for (const id of ids) {
          const src = SRC.find(([k]) => id === 'sensor.kdm_' + k + '_kurs_energy_daily');
          if (id === EID) out[id] = use.map((v, i) => ({ start: at(i, 0).getTime() + off * 86400e3, end: at(i, 0).getTime() + off * 86400e3 + 3600e3, change: v }));
          else if (src) out[id] = use.map((v, i) => ({ start: at(i, 0).getTime() + off * 86400e3, end: at(i, 0).getTime() + off * 86400e3 + 3600e3, change: v * src[2] }));
          else if (id === 'sensor.kdm_totalpris') out[id] = TODAY.map((v, i) => ({ start: at(i, 0).getTime() + off * 86400e3, end: at(i, 0).getTime() + off * 86400e3 + 3600e3, mean: price(v, i) }));
        }
        void tot;
        return Promise.resolve(out);
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
