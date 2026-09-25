// Mock for kd-vanning-card – gjenskaper eksempelverdiene i «Vanning v2.dc.html» (OpenSprinkler + KI Vanning).
(() => {
  const P = 'ute_opensprinkler';
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const day = (off, hm) => { const d = new Date(); d.setDate(d.getDate() + off); const [h, m] = hm.split(':'); d.setHours(+h, +m, 0, 0); return d; };
  const Z = [['01', 'Garasje/Roser', 'Drypp B1'], ['02', 'Lavendelbed', 'Drypp B1'], ['03', 'Garasje/Passasje', 'Spreder B1'], ['04', 'Bed v/støttemur', 'Drypp B2'],
    ['05', 'Plen nord', 'Spreder B2'], ['06', 'Hilliihekk', 'Drypp B2'], ['07', 'Ligusterhekk', 'Drypp B3'], ['08', 'Plen sør', 'Spreder B3'], ['09', 'Inngang/Rododendron', 'Drypp']];
  const add = {};
  const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  for (const [nr, navn, metode] of Z) {
    const h = '_' + slug(navn);
    add[`switch.${P}_s${nr}${h}_station_enabled`] = { state: 'on', attributes: { friendly_name: `S${nr} ${navn} · ${metode} Station Enabled` } };
    add[`binary_sensor.${P}_s${nr}${h}_station_running`] = 'off';
    add[`sensor.${P}_s${nr}${h}_station_status`] = 'idle';
  }
  for (let n = 10; n <= 16; n++) {
    add[`switch.${P}_s${n}_station_enabled`] = { state: 'off', attributes: { friendly_name: `S${n} Station Enabled` } };
    add[`binary_sensor.${P}_s${n}_station_running`] = 'off';
  }
  add[`switch.${P}_enabled`] = 'on';
  add[`binary_sensor.${P}_rain_delay_active`] = 'off';
  add[`sensor.${P}_current_draw`] = { state: '0', attributes: { unit_of_measurement: 'mA' } };
  const EST = { 1: 96, 2: 64, 3: 160, 4: 144, 6: 120, 7: 120, 9: 144 };
  const MONTH = { ...EST }, YEAR = { 1: 610, 2: 402, 3: 1180, 4: 960, 5: 1450, 6: 790, 7: 820, 8: 2310, 9: 930 };
  const soner = Z.map(([nr, navn]) => ({ nr: +nr, navn, rate: 8, kalibrert: true, i_dag: 0, uke: 0, maaned: MONTH[+nr] || 0, aar: YEAR[+nr] || 0, estimat_i_dag: EST[+nr] || 0 }))
    .concat([{ nr: 0, navn: 'Hageslange', rate: 8.04, kalibrert: false, i_dag: 0, uke: 0, maaned: 114, aar: 540 }]);
  const prog = (navn, tid, dager, aktiv, zs) => ({ navn, tid, dager, intervall: 0, aktiv, soner: zs.map(([nr, min]) => ({ nr, navn: Z[nr - 1][1], min })) });
  const ALL = ['man', 'tir', 'ons', 'tor', 'fre', 'lor', 'son'];
  const RM = [[1, 12], [3, 20], [4, 18], [6, 15], [7, 15], [9, 18]], RT = [[1, 12], [2, 8], [3, 20], [4, 18], [6, 15], [7, 15], [9, 18]];
  const run = (off, navn, zs) => ({ navn, start: day(off, '05:00').toISOString(), tid: navn === 'Plen sør' ? '05:25' : '05:00', soner: zs.map(([nr, min]) => ({ nr, navn: Z[nr - 1][1], min })) });
  const plenSor = off => { const r = run(off, 'Plen sør', [[8, 25]]); r.start = day(off, '05:25').toISOString(); return r; };
  add['sensor.ki_vanning_oversikt'] = { state: '9 soner', attributes: {
    integrasjon: 'ki_vanning', ki_type: 'oversikt', modus: 'opensprinkler', prefiks: P, pris_m3: 39.54 / 962 * 1000, i_dag: 0, uke: 0, maaned: 962, aar: 10392, estimat_i_dag: 848, anlegg: true, regnpause: false,
    soner,
    program_historikk: [prog('Plen nord', '05:00', ALL, false, [[5, 25]]), prog('Plen sør', '05:25', ALL, true, [[8, 25]]), prog('Runde – mandag', '05:00', ['man'], true, RM), prog('Runde – torsdag', '05:00', ['fre'], true, RT)],
    programmer: [plenSor(1), run(3, 'Runde – mandag', RM), plenSor(4), run(7, 'Runde – torsdag', RT)],
    planlegger: { kjorer: false, program: null, sekunder_igjen: 0, i_koe: [] } } };
  add['sensor.ki_vanning_forbruk_totalt'] = { state: '52340', attributes: { integrasjon: 'ki_vanning', ki_type: 'total', unit_of_measurement: 'L', state_class: 'total_increasing' } };
  MOCK.add(add);
  // døgnstatistikk: 962 L den 14. september (11 dager før i dag i designet)
  const stat = [];
  for (let i = 119; i >= 0; i--) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); stat.push({ start: +d, end: +d + 864e5, change: i === 11 ? 962 : 0, sum: 0 }); }
  const mk = MOCK.make;
  MOCK.make = function () {
    const h = mk.apply(this, arguments), cw = h.callWS;
    h.callWS = (msg) => {
      if (msg.type === 'recorder/statistics_during_period' && (msg.statistic_ids || []).includes('sensor.ki_vanning_forbruk_totalt'))
        return cw(msg).then(r => ({ ...(r && !Array.isArray(r) ? r : {}), 'sensor.ki_vanning_forbruk_totalt': stat }));
      return cw(msg);
    };
    return h;
  };
})();
