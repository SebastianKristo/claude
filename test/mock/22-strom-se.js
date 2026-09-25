// Mock av svenske strømsensorer (Strömstad, SE3) – 15-minutters priser i öre, slik Nord Pool-integrasjonen gir dem.
// Brukes med strom_profil: se.
(() => {
  const Q = [113.688,79.643,79.134,67.752,63.868,55.399,46.5,37.625,45.473,35.841,63.235,58.967,43.452,46.704,56.031,56.054,52.971,56.415,48.025,50.283,59.678,38.709,40.369,40.392,38.935,43.237,60.469,64.172,37.84,60.74,64.997,79.315,71.422,81.732,86.384,76.334,86.576,82.782,71.738,63.224,80.862,48.917,42.401,39.974,55.681,50.927,40.888,31.945,32.939,24.357,19.705,17.864,17.593,16.735,14.826,13.934,9.768,13.55,25.046,32.069,24.21,31.708,45.168,56.686,32.465,31.155,45.123,70.586,82.138,104.654,93.453,99.946,120.011,116.951,115.856,119.39,126.143,124.201,118.047,112.92,120.836,115.788,120.192,118.476,115.845,111.351,107.545,99.686,99.494,86.734,79.372,64.41,103.254,88.281,83.312,83.787];
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const raw = f => Q.map((v, i) => { const s = new Date(d0.getTime() + i * 900e3); return { start: s.toISOString(), end: new Date(s.getTime() + 900e3).toISOString(), value: f(v) }; });
  const i = Math.floor((Date.now() - d0) / 900e3), tot = v => Math.round((v * 1.25 + 40 + 30) * 1000) / 1000;
  MOCK.add({
    'sensor.nordpool_kwh_se3_sek_3_10_0': { state: Q[i], attributes: { unit: 'kWh', currency: 'SEK', country: 'Sweden', region: 'SE3', price_in_cents: true, unit_of_measurement: 'Öre/kWh', today: Q, tomorrow: [], tomorrow_valid: false, raw_today: raw(v => v), raw_tomorrow: [], friendly_name: 'nordpool_kwh_se3_sek_3_10_0' } },
    'sensor.stromstad_totalpris_kwh_ore': { state: tot(Q[i]), attributes: { unit_of_measurement: 'öre/kWh', raw_today: raw(tot), raw_tomorrow: [], friendly_name: 'Strömstad totalpris kWh öre' } },
    'sensor.stromstad_totalpris_kwh_sek': { state: (tot(Q[i]) / 100).toFixed(4), attributes: { unit_of_measurement: 'SEK/kWh', friendly_name: 'Strömstad totalpris kWh SEK' } },
  });
})();
