// Mock for kd-planter-card – gjenskaper eksempelverdiene i «Planter.dc.html».
(() => {
  const day = 864e5, now = Date.now();
  const P = [
    ['arekapalme', 'Arekapalme', 'Dypsis lutescens', 41, 35, 7, 4, 2400, 21.4, 640, 'off'],
    ['palmelilje', 'Palmelilje', 'Yucca elephantipes', 53, 20, 16, 16, 3100, 22.1, 410, 'on'],
    ['monstera', 'Monstera', 'Monstera deliciosa', 22, 30, 8, 9, 1800, 21.0, 520, 'on'],
  ];
  const add = {};
  for (const [id, navn, latin, moist, lo, every, days, lux, temp, ec, on] of P) {
    const last = new Date(now - days * day - 3600e3);
    add[`binary_sensor.${id}_trenger_vann`] = { state: on, attributes: {
      integrasjon: 'ki_planter', type: 'plante', sted: 'Sebastians soverom', sted_prefix: 'sebastians_soverom_planter', plante_id: id,
      navn, latin, ikon: 'mdi:sprout', intervall_dager: every, sist_vannet: last.toISOString(), dager_siden: days, dager_igjen: every - days,
      prosent: Math.min(100, days / every * 100), sesong: 'vekst', daglengde_timer: 11.8, fuktighet_sensor: `sensor.${id}_moisture`, fuktighet: moist, fuktighet_min: lo,
      friendly_name: `${navn} trenger vann` } };
    add[`button.${id}_vannet_na`] = 'unknown';
    add[`sensor.${id}_moisture`] = { state: String(moist), attributes: { unit_of_measurement: '%' } };
    add[`sensor.${id}_illuminance`] = { state: String(lux), attributes: { unit_of_measurement: 'lx' } };
    add[`sensor.${id}_temperature`] = { state: String(temp), attributes: { unit_of_measurement: '°C' } };
    add[`sensor.${id}_conductivity`] = { state: String(ec), attributes: { unit_of_measurement: 'µS/cm' } };
  }
  MOCK.add(add);
})();
