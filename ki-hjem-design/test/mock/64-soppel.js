// Mock for kd-soppel-card – gjenskaper eksempelverdiene i «Søppel» (datoer relativt til i dag).
(() => {
  const iso = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const f = (n, fn) => ({ state: String(n), attributes: { days_to_pickup: n, raw_date: iso(n), friendly_name: fn } });
  MOCK.add({
    'sensor.restavfall': f(3, 'Restavfall'),
    'sensor.plastemballasje': f(3, 'Plastemballasje'),
    'sensor.papir_og_papp': f(6, 'Papir og papp'),
    'sensor.glass_og_metallemballasje': f(6, 'Glass og metallemballasje'),
    'sensor.neste_tomming': '3,Restavfall',
    'automation.soppel_varsel_kvelden_for': { state: 'on', attributes: { friendly_name: 'Søppel – varsel kvelden før' } },
  });
})();
