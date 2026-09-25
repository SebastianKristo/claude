// Felles mock for Hjem – gjenskaper eksempelverdiene i «Hjem mobil».
(() => {
  const SPOT = [62,58,55,54,56,68,118,142,138,125,110,98,92,88,90,104,128,156,188,204,176,140,112,86].map(v => v / 100);
  const TMR = [70,66,63,61,64,74,102,121,115,104,96,90,86,84,88,97,112,131,149,158,139,118,98,80].map(v => v / 100);
  const price = sp => sp * 1.25 + 0.45 - Math.max(0, (sp - 0.75) * 0.9) * 1.25;
  const day = (off) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + off); return d; };
  const series = (arr, off, f) => arr.map((v, h) => { const s = new Date(day(off).getTime() + h * 3600e3); return { start: s.toISOString(), end: new Date(s.getTime() + 3600e3).toISOString(), value: f(v) }; });
  const norges = h => (50 + (h >= 6 && h < 22 ? 40 : 30)) / 100;
  const nowH = new Date().getHours();
  const monday = (() => { const d = day(3); return d.toISOString().slice(0, 10); })();
  MOCK.add({
    'weather.forecast_home': { state: 'cloudy', attributes: { temperature: 14, humidity: 71, friendly_name: 'Forecast Home' } },
    'sensor.vaervarsel_temperature': { state: '14.5', attributes: { unit_of_measurement: '°C' } },
    'sensor.vaervarsel_humidity': { state: '71', attributes: { unit_of_measurement: '%' } },
    'sensor.norgespris_total_strompris_norgespris': { state: '1.47', attributes: { unit_of_measurement: 'kr/kWh' } },
    'sensor.totalpris_inkludert_grid_el_company_og_stromstotte': { state: String(price(SPOT[nowH]) * 100), attributes: { unit_of_measurement: 'øre/kWh', raw_today: series(SPOT, 0, v => price(v) * 100), raw_tomorrow: series(TMR, 1, v => price(v) * 100) } },
    'sensor.nordpool_kwh_no1_nok_3_10_025': { state: String(SPOT[nowH] * 100), attributes: { unit_of_measurement: 'Øre/kWh', raw_today: series(SPOT, 0, v => v * 100), raw_tomorrow: series(TMR, 1, v => v * 100) } },
    'sensor.norgespris_pris_na': { state: String(norges(nowH)), attributes: { unit_of_measurement: 'kr/kWh', today: series(SPOT, 0, (v) => 0).map((p, h) => ({ ...p, value: norges(h) })), tomorrow: series(TMR, 1, () => 0).map((p, h) => ({ ...p, value: norges(h) })) } },
    'sensor.strommaler_effekt': { state: '1155', attributes: { unit_of_measurement: 'W' } },
    'sensor.hele_huset_lys': { state: '7', attributes: { totalt: 24 } },
    'sensor.alle_kalendere': { state: '3', attributes: { events: [0, 1, 2].map(i => ({ summary: 'Hendelse ' + i, start: new Date(day(0).getTime() + (10 + i * 3) * 3600e3).toISOString(), end: new Date(day(0).getTime() + (11 + i * 3) * 3600e3).toISOString() })) } },
    'lock.dorlas_blatann': { state: 'locked', attributes: { friendly_name: 'Dørlås' } },
    'sensor.dorlas_wifi_battery': { state: '78', attributes: { unit_of_measurement: '%' } },
    'sensor.ansiktsgjenkjenning_dorlas_sist_last_opp_av': 'Sebastian',
    'alarm_control_panel.alarm': { state: 'armed_home', attributes: { code_format: 'number' } },
    'binary_sensor.stue_g6_turret_motion': 'off', 'binary_sensor.mellomgang_g5_turret_ultra_motion': 'off', 'binary_sensor.ringeklokke_g6_entry_motion': 'off',
    'todo.gjoremal': { state: '2', attributes: { friendly_name: 'Gjøremål' } },
    'sensor.todo_oppgaver_count': '2',
    'sensor.restavfall': { state: '3', attributes: { days_to_pickup: 3, raw_date: monday, friendly_name: 'Restavfall' } },
    'sensor.plastemballasje': { state: '3', attributes: { days_to_pickup: 3, raw_date: monday, friendly_name: 'Plastemballasje' } },
    'sensor.papir_og_papp': { state: '10', attributes: { days_to_pickup: 10, raw_date: day(10).toISOString().slice(0, 10) } },
    'sensor.glass_og_metallemballasje': { state: '17', attributes: { days_to_pickup: 17, raw_date: day(17).toISOString().slice(0, 10) } },
    'binary_sensor.sir_sweeps_a_lot_water_shortage': 'on',
    'binary_sensor.sir_sweeps_a_lot_water_box_attached': 'on',
    // personer
    'person.sebastian_kristo_jemtland': { state: 'home', attributes: { friendly_name: 'Sebastian', user_id: 'u1' } },
    'person.cybele_kristo': { state: 'not_home', attributes: { friendly_name: 'Cybele' } },
    'person.rune_jemtland': { state: 'home', attributes: { friendly_name: 'Rune' } },
    'switch.sebastian_posisjon_hjemme_borte': 'on', 'switch.cybele_posisjon_hjemme_borte': 'off', 'switch.rune_posisjon_hjemme_borte': 'on',
    'switch.homey_logic_sebastian_sovn_vaken': 'off', 'switch.homey_logic_cybele_sovn_vaken': 'off', 'switch.homey_logic_rune_sovn_vaken': 'off',
    // rom (Hjem-visningen)
    'sensor.stue_meter_pro_temperature': '23', 'sensor.stue_meter_pro_humidity': '50', 'input_number.stue_panelovn_teller': { state: '21', attributes: { step: 1, min: 5, max: 30 } }, 'light.stue_lys': 'on',
    'sensor.pult_hub_2_temperature': '23', 'sensor.pult_hub_2_humidity': '50', 'light.pult_lys': 'on',
    'sensor.kjokken_meter_pro_temperature': '22', 'sensor.kjokken_meter_pro_humidity': '46', 'input_number.kjokken_gulvvarme_teller': { state: '22', attributes: { step: 1 } }, 'light.kjokken_lys': 'on',
    'sensor.trappegang_meter_pro_temperature': '25', 'sensor.trappegang_meter_pro_humidity': '62', 'input_number.bad_gulvvarme_teller': { state: '26', attributes: { step: 1 } }, 'light.bad_lys': 'off',
    'input_number.sebastian_panelovn_teller': { state: '18', attributes: { step: 1 } }, 'light.soverom_lys': 'off',
    'sensor.inngang_temp_og_fukt_temperature': '20', 'sensor.inngang_temp_og_fukt_humidity': '45', 'light.inngang_lys': 'off',
    'light.ute_lys': 'off',
  });
  MOCK.ws('todo/item/list', (msg) => ({ items: msg.entity_id === 'todo.gjoremal' ? [
    { uid: '1', summary: 'Bytt filter i ventilasjon', status: 'needs_action' },
    { uid: '2', summary: 'Vann plantene', status: 'completed' },
    { uid: '3', summary: 'Skift batteri i dørlås', status: 'needs_action' },
    { uid: '4', summary: 'Tøm oppvaskmaskin', status: 'completed' },
  ] : [] }));
})();
MOCK.add({ 'switch.dorlas_autolas': { state: 'on', attributes: { friendly_name: 'Dørlås autolås', minutter: 2 } } });
