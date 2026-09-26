// Mock for kd-bil-card – gjenskaper designets eksempelverdier (Bil.dc.html).
(() => {
  const now = Date.now(), M = 60e3, H = 3600e3;
  const day = (offset, h, m = 0) => { const d = new Date(); d.setDate(d.getDate() - offset); d.setHours(h, m, 0, 0); return d.getTime(); };
  const today = new Date(); let mon = (today.getDay() + 6) % 7; if (mon < 2) mon += 7; // siste mandag minst to dager tilbake
  // turene i designet (eldst først): Oslo → Hjem (man), Hjem → Svinesund (i går), Strømstad sentrum → Hjem, Hjem → Strømstad sentrum (i dag)
  const A = [day(mon, 16), day(mon, 16) + 108 * M], B = [day(1, 15), day(1, 15) + 22 * M], Cc = [now - 3 * H, now - 3 * H + 21 * M], D = [now - 60 * M, now - 41 * M];
  const TR = 'device_tracker.tesla_model_y_location', ODO = 'sensor.tesla_model_y_kilometerteller', BAT = 'sensor.tesla_model_y_batteri_batteriniva';
  const HIST = {
    [TR]: [[day(mon, 8), 'Oslo'], [A[0], 'not_home'], [A[1], 'home'], [B[0], 'not_home'], [B[1], 'Svinesund'], [day(1, 20), 'Strømstad sentrum'], [Cc[0], 'not_home'], [Cc[1], 'home'], [D[0], 'not_home'], [D[1], 'Strømstad sentrum']],
    [ODO]: [[day(mon, 8), 38020], [A[1], 38162], [B[1], 38180], [Cc[1], 38192], [D[1], 38204]],
    [BAT]: [[day(mon, 8), 82], [A[1], 50], [day(1, 6), 81.8667], [B[1], 77.8667], [Cc[1], 74.8], [D[1], 72]],
  };
  // «Spart per dag» – designets stolper, skalert så summen blir 1 094,2 kr
  const DAILY = [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,3,26,34,36,39,42,44,50,54,57];
  const k = 1094.2 / DAILY.reduce((x, y) => x + y, 0);
  const STATS = [{ start: day(31, 0), state: 0 }];
  DAILY.forEach((v, i) => STATS.push({ start: day(30 - i, 0), state: STATS[STATS.length - 1].state + v * k }));

  const make = MOCK.make;
  MOCK.make = function () {
    const h = make.apply(this, arguments), orig = h.callWS;
    h.callWS = (msg) => {
      if (msg.type === 'history/history_during_period' && (msg.entity_ids || []).includes(TR)) {
        const out = {}; for (const id of msg.entity_ids) out[id] = (HIST[id] || []).map(([t, s]) => ({ s: String(s), lu: t / 1000 })); return Promise.resolve(out);
      }
      if (msg.type === 'recorder/statistics_during_period' && (msg.statistic_ids || []).includes('sensor.ki_drivstoff_spart_i_ar'))
        return Promise.resolve({ 'sensor.ki_drivstoff_spart_i_ar': STATS.map(x => ({ start: x.start, end: x.start + 86400e3, state: x.state, max: x.state })) });
      return orig(msg);
    };
    return h;
  };

  const spart = { diesel_ville_kostet: 1243.4, strom_kostet: 149.2 };
  MOCK.add({
    [BAT]: { state: '72', attributes: { unit_of_measurement: '%', device_class: 'battery' } },
    'sensor.tesla_model_y_batteri_estimert_batterirekkevidde': { state: '298', attributes: { unit_of_measurement: 'km' } },
    'input_number.tesla_model_y_ladegrense': { state: '80', attributes: { min: 50, max: 100, step: 1 } },
    'switch.elbillader_charging': 'off',
    'sensor.elbillader_charge_power': { state: '0', attributes: { unit_of_measurement: 'W' } },
    'sensor.ki_tesla_ladetid_gjenstaende': { state: '0', attributes: { unit_of_measurement: 'min' } },
    'sensor.ki_tesla_ladepris_estimat': { state: '5.4', attributes: { unit_of_measurement: 'kr' } },
    'sensor.ki_tesla_forrige_lading_kostnad': { state: '38', attributes: { unit_of_measurement: 'kr' } },
    'switch.ki_lading_automatikk': 'on',
    'switch.ki_elbil_natt': 'on',
    'time.ki_elbil_til': '07:00:00',
    'switch.tesla_model_y_car_doors_locked': 'off',
    'button.folkevogn_honk_horn': 'unknown',
    'switch.tesla_model_y_klima_climate_defrost': 'off',
    'climate.tesla_model_y_klima': { state: 'off', attributes: { temperature: 21, current_temperature: 17 } },
    'switch.tesla_model_y_car_trunk_front': 'off',
    'switch.tesla_model_y_car_trunk_rear': 'off',
    'switch.tesla_model_y_klima_climate_window_vent': 'off',
    'switch.tesla_model_y_sentry_mode': 'on',
    'cover.tesla_model_y_charge_port_door': { state: 'closed', attributes: { friendly_name: 'Tesla Model Y Ladeport' } },
    'sensor.tesla_model_y_tire_pressure_front_left': { state: '2.9', attributes: { unit_of_measurement: 'bar' } },
    'sensor.tesla_model_y_tire_pressure_front_right': { state: '2.9', attributes: { unit_of_measurement: 'bar' } },
    'sensor.tesla_model_y_tire_pressure_rear_left': { state: '2.8', attributes: { unit_of_measurement: 'bar' } },
    'sensor.tesla_model_y_tire_pressure_rear_right': { state: '2.4', attributes: { unit_of_measurement: 'bar' } },
    'select.tesla_model_y_seat_heater_front_left': { state: 'off', attributes: { friendly_name: 'Tesla Model Y Setevarme fører', options: ['off', 'low', 'medium', 'high'] } },
    'select.tesla_model_y_seat_heater_front_right': { state: 'low', attributes: { friendly_name: 'Tesla Model Y Setevarme passasjer', options: ['off', 'low', 'medium', 'high'] } },
    [TR]: { state: 'Strømstad sentrum', attributes: { latitude: 58.94, longitude: 11.17 } },
    'sensor.tesla_model_y_daglig_kjoring': { state: '42', attributes: { unit_of_measurement: 'km' } },
    [ODO]: { state: '38204', attributes: { unit_of_measurement: 'km' } },
    'sensor.tesla_model_y_energy_consumption': { state: '168', attributes: { unit_of_measurement: 'Wh/km' } },
    'sensor.ki_drivstoff_spart_denne_maneden': { state: '1094', attributes: { ...spart, kjort_km: 684 } },
    'sensor.ki_drivstoff_spart_i_ar': { state: '1094', attributes: { ...spart, kjort_km: 684 } },
    'sensor.ki_drivstoff_kostnad_per_mil_tesla_model_y': '2.36',
    'sensor.ki_drivstoff_kostnad_per_mil_audi_a6_avant_2011': '19.59',
    'sensor.ki_drivstoff_liter_diesel_spart_i_ar': '48',
    'sensor.ki_drivstoff_co2_spart_i_ar': '126',
    'sensor.ki_drivstoff_dieselpris': '27.99',
    'sensor.ki_drivstoff_ladepris': '1.31',
  });
})();
