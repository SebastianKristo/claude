// Mock for kd-stromregning-card – gjenskaper eksempelverdiene i «Strømregning».
// «Nå» er 25. september 2026 kl. 13:30 (window.__kdMockNowRegning, bare i test). Timestatistikken for energisensoren
// lages slik at september hittil gir 1 180 kWh anslått for hele måneden (1 560 kr, hittil 1 352 kr), og at
// månedene januar–august havner på trinnene i designet (560, 560, 415, 415, 290, 290, 290, 290 kr).
// sensor.ki_nettleie og energisensorens tilstand deles med andre mocker, så de overstyres bare når kortet vises alene.
(() => {
  const NOW = new Date(2026, 8, 25, 13, 30).getTime();
  window.__kdMockNowRegning = NOW;
  const ID = 'sensor.strommaler_powercalc_energy_daily';
  const mine = new URLSearchParams(location.search).get('card') === 'kd-stromregning-card';

  // Jan–aug: grunnlast per time og døgnmaks på tre dager (snitt → trinn 560/415/290)
  const BASE = [3.0, 2.9, 2.0, 1.6, 1.1, 0.9, 0.9, 1.0];
  const PEAK = [[11.2, 10.8, 10.5], [10.9, 10.6, 10.4], [7.4, 7.0, 6.8], [6.6, 6.2, 6.0], [3.9, 3.6, 3.4], [3.2, 3.0, 2.9], [3.1, 2.9, 2.8], [3.6, 3.3, 3.1]];
  const PDAY = [[5, 18], [14, 8], [22, 19]];
  // September: topp tre fra designet
  const SEP = [[12, 18, 7.8], [3, 17, 6.9], [21, 19, 6.4]];
  const s9 = new Date(2026, 8, 1).getTime(), e9 = new Date(2026, 9, 1).getTime();
  const target = 1180 * (NOW - s9) / (e9 - s9);                       // kWh hittil i september
  const fullH = Math.floor((NOW - s9) / 3600e3), partH = (NOW - s9) / 3600e3 - fullH;
  const x = (target - SEP.reduce((a, p) => a + p[2], 0)) / (fullH + partH - SEP.length); // grunnlast i september

  const HOURS = [];
  for (let t = new Date(2026, 0, 1).getTime(); t + 3600e3 <= NOW; t += 3600e3) {
    const d = new Date(t), m = d.getMonth(), day = d.getDate(), h = d.getHours();
    let v;
    if (m === 8) { const p = SEP.find((q) => q[0] === day && q[1] === h); v = p ? p[2] : x; }
    else { const i = PDAY.findIndex((q) => q[0] === day && q[1] === h); v = i >= 0 ? PEAK[m][i] : BASE[m]; }
    HOURS.push({ start: t, end: t + 3600e3, change: v });
  }
  const mid = new Date(NOW); mid.setHours(0, 0, 0, 0);
  const today = HOURS.filter((p) => p.start >= mid.getTime()).reduce((a, p) => a + p.change, 0) + x * partH;

  const add = {};
  if (mine) {
    add[ID] = { state: today.toFixed(3), attributes: { unit_of_measurement: 'kWh', state_class: 'total_increasing', friendly_name: 'Strømmåler energi i dag' } };
    add['sensor.ki_nettleie'] = { state: '415', attributes: {
      registrert_trinn_kr: 415, registrert_trinn_fra: 5, registrert_trinn_til: 10, registrert_snitt: 7.033,
      topp_tre: SEP.map(([d, h, kwh]) => ({ dato: `2026-09-${String(d).padStart(2, '0')}`, time: String(h).padStart(2, '0'), kwh, kvalitet: 'malt', kilde: 'egen' })),
      tabell: [[2, 160], [5, 290], [10, 415], [15, 560], [20, 745]], friendly_name: 'KI Nettleie' } };
  }
  MOCK.add(add);

  const make0 = MOCK.make;
  MOCK.make = function () {
    const h = make0.apply(this, arguments), cw = h.callWS;
    h.callWS = (msg) => {
      if (msg.type === 'recorder/statistics_during_period' && msg.period === 'hour' && (msg.statistic_ids || []).includes(ID) && Date.parse(msg.start_time) < Date.now() - 36 * 3600e3) {
        const s = Date.parse(msg.start_time), e = Date.parse(msg.end_time);
        return Promise.resolve({ [ID]: HOURS.filter((p) => p.start >= s && p.start < e) });
      }
      return cw(msg);
    };
    return h;
  };
})();
