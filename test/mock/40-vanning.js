// Mock for kd-vanning-card – eksempelverdiene i «Vanning v2.dc.html», med entitetene slik KI Vanning (modus «opensprinkler»)
// og OpenSprinkler-integrasjonen faktisk lager dem:
//  • sensor.ki_vanning_oversikt (ki_type oversikt): modus, prefiks, soner, programmer (planlagt, fra kalenderen), program_historikk
//    (OpenSprinkler-form: slug, bryter, start = time-entitet, dager = bitmaske), neste. I OpenSprinkler-modus finnes IKKE
//    anlegg / regnpause / planlegger i oversikten, og heller ikke knappene stopp_alt / regn_24t eller number.ki_vanning_regnpause.
//  • sensor.ki_vanning_neste_vanning (ki_type neste): state «I morgen 05:25», attributter som «neste».
//  • OpenSprinkler: switch.<p>_enabled (kontrolleren), binary_sensor.<p>_rain_delay_active, sensor.<p>_rain_delay_stop_time,
//    switch.<p>_sNN_…_station_enabled, switch.<p>_<slug>_program_enabled, time.<p>_<slug>_start_time.
//  • hass.services: ki_vanning.* (registrert i begge moduser) og opensprinkler.*.
(() => {
  const P = 'ute_opensprinkler';
  const pad = n => String(n).padStart(2, '0');
  const day = (off, hm) => { const d = new Date(); d.setDate(d.getDate() + off); const [h, m] = hm.split(':'); d.setHours(+h, +m, 0, 0); return d; };
  const Z = [['01', 'Garasje/Roser', 'Drypp B1'], ['02', 'Lavendelbed', 'Drypp B1'], ['03', 'Garasje/Passasje', 'Spreder B1'], ['04', 'Bed v/støttemur', 'Drypp B2'],
    ['05', 'Plen nord', 'Spreder B2'], ['06', 'Hilliihekk', 'Drypp B2'], ['07', 'Ligusterhekk', 'Drypp B3'], ['08', 'Plen sør', 'Spreder B3'], ['09', 'Inngang/Rododendron', 'Drypp']];
  const add = {};
  const slug = t => t.toLowerCase().replace(/ø/g, 'o').replace(/æ/g, 'a').replace(/å/g, 'a').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
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
  add[`switch.${P}_enabled`] = { state: 'on', attributes: { friendly_name: 'Ute OpenSprinkler Enabled' } };
  add[`binary_sensor.${P}_rain_delay_active`] = { state: 'off', attributes: { friendly_name: 'Ute OpenSprinkler Rain Delay Active' } };
  add[`sensor.${P}_rain_delay_stop_time`] = { state: 'unknown', attributes: { device_class: 'timestamp', friendly_name: 'Ute OpenSprinkler Rain Delay Stop Time' } };
  add[`sensor.${P}_current_draw`] = { state: '0', attributes: { unit_of_measurement: 'mA' } };
  add[`sensor.${P}_last_run`] = { state: day(-11, '05:00').toISOString(), attributes: { device_class: 'timestamp' } };

  const EST = { 1: 96, 2: 64, 3: 160, 4: 144, 6: 120, 7: 120, 9: 144 };
  const MONTH = { ...EST }, YEAR = { 1: 610, 2: 402, 3: 1180, 4: 960, 5: 1450, 6: 790, 7: 820, 8: 2310, 9: 930 };
  const soner = Z.map(([nr, navn, metode]) => {
    const h = '_' + slug(navn);
    return { nr: +nr, navn, metode, boks: (metode.match(/B(\d)/) || [])[1] || '', bryter: `switch.${P}_s${nr}${h}_station_enabled`, gaar: `binary_sensor.${P}_s${nr}${h}_station_running`,
      status: `sensor.${P}_s${nr}${h}_station_status`, flow: '', rate: 8, kalibrert: true, i_dag: 0, uke: 0, maaned: MONTH[+nr] || 0, aar: YEAR[+nr] || 0, totalt: YEAR[+nr] || 0,
      estimat_i_dag: EST[+nr] || 0 };
  }).concat([{ nr: 0, navn: 'Hageslange', metode: 'Slange', boks: '', bryter: '', gaar: '', status: '', rate: 8.04, kalibrert: false, i_dag: 0, uke: 0, maaned: 114, aar: 540 }]);

  // Programmene: OpenSprinkler-bryterne + KI Vannings programliste (OpenSprinkler-form)
  const BIT = { man: 1, tir: 2, ons: 4, tor: 8, fre: 16, lor: 32, son: 64 };
  const mask = ds => ds.reduce((t, d) => t | BIT[d], 0);
  const ALL = ['man', 'tir', 'ons', 'tor', 'fre', 'lor', 'son'];
  const RM = [[1, 12], [3, 20], [4, 18], [6, 15], [7, 15], [9, 18]], RT = [[1, 12], [2, 8], [3, 20], [4, 18], [6, 15], [7, 15], [9, 18]];
  const zs = list => list.map(([nr, min]) => ({ navn: Z[nr - 1][1], nr, min }));
  const PROG = [['Plen nord', '05:00', ALL, false, [[5, 25]]], ['Plen sør', '05:25', ALL, true, [[8, 25]]], ['Runde – mandag', '05:00', ['man'], true, RM], ['Runde – torsdag', '05:00', ['fre'], true, RT]];
  const program_historikk = PROG.map(([navn, tid, dager, on, list]) => {
    const sl = slug(navn);
    add[`switch.${P}_${sl}_program_enabled`] = { state: on ? 'on' : 'off', attributes: { friendly_name: `${navn} Program Enabled` } };
    add[`binary_sensor.${P}_${sl}_program_running`] = 'off';
    add[`time.${P}_${sl}_start_time`] = `${tid}:00`;
    const s = zs(list);
    return { navn, slug: sl, bryter: `switch.${P}_${sl}_program_enabled`, gaar: `binary_sensor.${P}_${sl}_program_running`, start: `time.${P}_${sl}_start_time`,
      soner: s, total_min: s.reduce((t, z) => t + z.min, 0), dager: mask(dager), kjoringer: 0, snitt_liter: 0, siste_liter: 0, siste_minutter: 0 };
  });

  // «programmer» = motor.planlagt, fra OpenSprinkler-kalenderen (kilde: kalender)
  const run = (off, navn, tid, list) => {
    const d = day(off, tid), s = zs(list), mins = s.reduce((t, z) => t + z.min, 0);
    return { navn, tid, start: d.toISOString(), minutter_til: Math.floor((d - Date.now()) / 60e3), i_dag: off === 0, total_min: mins, soner: s,
      estimat_liter: mins * 8, estimat_rader: s.map(z => ({ program: navn, sone: z.navn, minutter: z.min, liter: z.min * 8, rate: 8, kalibrert: true })), kilde: 'kalender' };
  };
  const programmer = [run(1, 'Plen sør', '05:25', [[8, 25]]), run(3, 'Runde – mandag', '05:00', RM), run(4, 'Plen sør', '05:25', [[8, 25]]), run(7, 'Runde – torsdag', '05:00', RT)];
  const UKE = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];
  const n0 = programmer[0], nd = 1;
  const neste = { ...n0, naar: nd === 0 ? 'I dag' : nd === 1 ? 'I morgen' : UKE[(new Date(n0.start).getDay() + 6) % 7], dager_fram: nd };

  add['sensor.ki_vanning_oversikt'] = { state: '9 soner', attributes: {
    integrasjon: 'ki_vanning', ki_type: 'oversikt', modus: 'opensprinkler', prefiks: P, hovedventil: null, har_flyt: true, felles_flyt: true,
    i_dag: 0, uke: 0, maaned: 962, aar: 10392, totalt: 52340, pris_m3: 39.54 / 962 * 1000, kostnad_i_dag: 0, estimat_i_dag: 848, estimat_kostnad: 34.9,
    neste, programmer, program_historikk, soner, friendly_name: 'KI Vanning Oversikt' } };
  add['sensor.ki_vanning_neste_vanning'] = { state: `${neste.naar} ${neste.tid}`, attributes: { integrasjon: 'ki_vanning', ki_type: 'neste', ...neste, friendly_name: 'KI Vanning Neste vanning' } };
  add['sensor.ki_vanning_planlagt_i_dag'] = { state: '0', attributes: { integrasjon: 'ki_vanning', ki_type: 'plan', programmer: [], alle_programmer: programmer, program_historikk, feil: null } };
  add['sensor.ki_vanning_aktiv_sone'] = { state: 'Ingen', attributes: { integrasjon: 'ki_vanning', ki_type: 'aktiv', flow: 0, sone_nr: null, metode: '', liter_denne_kjoringen: 0, minutter_denne_kjoringen: 0 } };
  add['binary_sensor.ki_vanning_vanner_na'] = { state: 'off', attributes: { integrasjon: 'ki_vanning', device_class: 'running' } };
  add['sensor.ki_vanning_estimat_i_dag'] = { state: '848', attributes: { integrasjon: 'ki_vanning', ki_type: 'estimat', unit_of_measurement: 'L' } };
  add['sensor.ki_vanning_forbruk_totalt'] = { state: '52340', attributes: { integrasjon: 'ki_vanning', ki_type: 'total', unit_of_measurement: 'L', state_class: 'total_increasing' } };
  add['button.ki_vanning_hent_programplan'] = { state: 'unknown', attributes: { integrasjon: 'ki_vanning', ki_type: 'hent_plan' } };
  add['button.ki_vanning_nullstill_alt'] = { state: 'unknown', attributes: { integrasjon: 'ki_vanning', ki_type: 'nullstill_alt' } };
  MOCK.add(add);

  // døgnstatistikk: 962 L den 14. september (11 dager før i dag i designet)
  const stat = [];
  for (let i = 119; i >= 0; i--) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); stat.push({ start: +d, end: +d + 864e5, change: i === 11 ? 962 : 0, sum: 0 }); }

  // Tjenestene som faktisk er registrert (ki_vanning/services.yaml + OpenSprinkler-integrasjonen)
  const svc = names => Object.fromEntries(names.map(n => [n, {}]));
  const SERVICES = {
    ki_vanning: svc(['nullstill', 'hent_plan', 'kjor', 'apne_hovedventil', 'kjor_program', 'stopp', 'sett_regnpause', 'nullstill_regnpause', 'sett_anlegg', 'lag_program', 'slett_program']),
    opensprinkler: svc(['run', 'run_once', 'run_program', 'run_station', 'stop', 'set_rain_delay', 'set_water_level', 'pause_stations', 'reboot']),
  };
  const mk = MOCK.make;
  MOCK.make = function () {
    const h = mk.apply(this, arguments), cw = h.callWS, cs = h.callService;
    h.services = { ...(h.services || {}), ...SERVICES };
    h.callWS = (msg) => {
      if (msg.type === 'recorder/statistics_during_period' && (msg.statistic_ids || []).includes('sensor.ki_vanning_forbruk_totalt'))
        return cw(msg).then(r => ({ ...(r && !Array.isArray(r) ? r : {}), 'sensor.ki_vanning_forbruk_totalt': stat }));
      return cw(msg);
    };
    // OpenSprinkler reagerer som den ekte: regnpause og stopp endrer tilstanden. ki_vanning.* i OpenSprinkler-modus gjør ingenting.
    h.callService = (domain, service, data, target) => {
      const r = cs.call(h, domain, service, data, target);
      if (domain === 'opensprinkler' && service === 'set_rain_delay') {
        const t = Number(data && data.rain_delay) || 0;
        MOCK.set(`sensor.${P}_rain_delay_stop_time`, t ? new Date(Date.now() + t * 3600e3).toISOString() : 'unknown');
        MOCK.set(`binary_sensor.${P}_rain_delay_active`, t ? 'on' : 'off');
      }
      if (domain === 'opensprinkler' && service === 'stop') for (const id of Object.keys(h.states)) if (id.startsWith(`binary_sensor.${P}_s`) && id.endsWith('_station_running') && h.states[id].state === 'on') MOCK.set(id, 'off');
      return r;
    };
    return h;
  };
})();
