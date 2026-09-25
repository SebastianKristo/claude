// Mock for kd-vaer-card – gjenskaper eksempelverdiene i «Vær.dc.html».
(() => {
  const now = new Date(); now.setMinutes(0, 0, 0);
  const H = [[14.5, 'cloudy', 0], [13.9, 'cloudy', 0], [13.2, 'rainy', 0.4], [12.8, 'rainy', 1.2], [12.4, 'rainy', 1.8], [12.1, 'rainy', 0.9], [11.8, 'cloudy', 0.2], [11.5, 'cloudy', 0], [11.4, 'partlycloudy', 0], [11.9, 'partlycloudy', 0], [12.6, 'partlycloudy', 0], [13.8, 'sunny', 0]];
  const hourly = [];
  for (let i = 0; i < 24; i++) {
    const [t, c, mm] = H[i] || [14 + (i % 3) * 0.3, 'partlycloudy', i === 17 ? 0.6 : 0];
    hourly.push({ datetime: new Date(+now + i * 3600e3).toISOString(), temperature: t, condition: c, precipitation: mm, pressure: 1008 - i * 0.6, wind_speed: 22.3, wind_bearing: 225 });
  }
  const D = [['cloudy', 10, 15, 4.5], ['rainy', 9, 13, 6], ['partlycloudy', 8, 14, 0], ['sunny', 7, 16, 0], ['sunny', 8, 17, 0], ['cloudy', 9, 15, 0], ['rainy', 8, 12, 3]];
  const d0 = new Date(); d0.setHours(12, 0, 0, 0);
  const daily = D.map(([c, lo, hi, mm], i) => ({ datetime: new Date(+d0 + i * 864e5).toISOString(), condition: c, templow: lo, temperature: hi, precipitation: mm }));
  const tomorrow = (h, m) => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(h, m, 0, 0); return d.toISOString(); };
  MOCK.add({
    'weather.forecast_home': { state: 'cloudy', attributes: { temperature: 14.5, apparent_temperature: 13, humidity: 82, pressure: 1008, wind_speed: 22.32, wind_gust_speed: 41.04, wind_bearing: 225, wind_speed_unit: 'km/h',
      uv_index: 0, dew_point: 11.6, cloud_coverage: 92, visibility: 18, visibility_unit: 'km', fog_area_fraction: 0, friendly_name: 'Forecast Hjem' } },
    'sun.sun': { state: 'below_horizon', attributes: { elevation: -14.2, next_rising: tomorrow(7, 14), next_setting: tomorrow(19, 5), next_dawn: tomorrow(6, 38), next_dusk: tomorrow(19, 41) } },
    'sensor.oslo_moon_phase': 'waxing_gibbous',
    'sensor.nilu_stromstad_aqi': { state: '28', attributes: { device_class: 'aqi', attribution: 'NILU · Strømstad' } },
    'sensor.nilu_stromstad_pm25': { state: '6.2', attributes: { device_class: 'pm25', unit_of_measurement: 'µg/m³' } },
    'sensor.nilu_stromstad_pm10': { state: '11.8', attributes: { device_class: 'pm10', unit_of_measurement: 'µg/m³' } },
    'sensor.nilu_stromstad_no2': { state: '9.4', attributes: { device_class: 'nitrogen_dioxide', unit_of_measurement: 'µg/m³' } },
    'sensor.nilu_stromstad_o3': { state: '52', attributes: { device_class: 'ozone', unit_of_measurement: 'µg/m³' } },
  });
  const P = { birch: [0, 0, 0], grass: [1, 1, 0], mugwort: [2, 1, 1], alder: [0, 0, 0], hazel: [0, 0, 0], salix: [0, 0, 0] };
  const add = {};
  for (const [t, v] of Object.entries(P)) ['today', 'tomorrow', 'day_after_tomorrow'].forEach((d, k) => { add[`sensor.pollen_${t}_oslo_pollen_${d}`] = { state: String(v[k]), attributes: { index_value: v[k], display_name: t } }; });
  MOCK.add(add);
  // prognoser via weather/subscribe_forecast + posisjon (Strømstad)
  const mk = MOCK.make;
  MOCK.make = function () {
    const h = mk.apply(this, arguments), sub = h.connection.subscribeMessage;
    h.config = h.config || { latitude: 58.94, longitude: 11.17, time_zone: 'Europe/Oslo' };
    h.connection = { ...h.connection, subscribeMessage(cb, msg) {
      if (msg && msg.type === 'weather/subscribe_forecast' && msg.entity_id === 'weather.forecast_home') { setTimeout(() => cb({ type: msg.forecast_type, forecast: msg.forecast_type === 'hourly' ? hourly : daily }), 0); return Promise.resolve(() => {}); }
      return sub.apply(this, arguments);
    } };
    return h;
  };
})();
