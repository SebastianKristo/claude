// Mock for kd-klima-card – gjenskaper eksempelverdiene i «Klima v2» (KI Energi-entiteter).
// Designet står på kl. 21:24 (nå-streken i tidslinjene) – kortet leser «nå» fra window.__kdMockNowKlima (bare i test).
(() => {
  const at = (h, m, dd = 0) => { const d = new Date(); d.setHours(h, m, 0, 0); d.setDate(d.getDate() + dd); return d; };
  window.__kdMockNowKlima = at(21, 24).getTime();
  const iso = (d) => d.toISOString();
  const H12 = [2.2, 1.3, 1.1, 1.8, 0.7, 0.6, 0.7, 0.8, 0.7, 0.8, 0.6];
  const PRICE = [0.4, 0.62, 0.7, 0.66, 0.66, 0.6, 0.62, 0.64, 0.66, 0.6, 0.56, 0.5, 0.3, 0.2, 0.18, 0.2, 0.3, 0.6, 0.64, 0.66, 0.6, 0.58, 0.5, 0.46];
  const BARS = [0.1, 2.5, 0.2, 0.9, 0.7, 0.6, 0.8, 0.1, 0.9, 0.1, 0.1, 0.8, 0.1, 0.1, 0.1, 0.1, 0.1, 0.5];
  const ZONES = [
    ['bad_gulv', 'Bad gulvvarme', 22.1, 22, 'Helgesenking av bad', 'gulv', 'Bad'],
    ['cybele_panelovn', 'Cybele panelovn', 21.8, 19, 'Vindu åpent, holder likevel varmen', 'panel', 'Cybele', 'Cybele', 'barn'],
    ['kjokken_panelovn', 'Kjøkken panelovn', 22.0, 19, 'Helgemodus, på måltemperatur', 'panel', 'Kjøkken'],
    ['kjokken_gulv', 'Kjøkken gulvvarme', 24.0, 19, 'Helgesenking av gulvvarme', 'gulv', 'Kjøkken'],
    ['sebastian_panelovn', 'Sebastian panelovn', 22.1, 19, 'Helgemodus, på måltemperatur', 'panel', 'Sebastian', 'Sebastian', 'ungdom'],
    ['stue', 'Stue', 23.2, 19, 'Helgemodus, på måltemperatur', 'panel', 'Stue'],
    ['trappegang', 'Trappegang', 23.0, 19, 'Helgemodus, på måltemperatur', 'panel', 'Trappegang'],
    ['do_gulv', 'Do gulvvarme', 21.5, null, 'Manuell i klimakortet', 'gulv', 'Do'],
    ['vaskegang_gulv', 'Vaskegang gulvvarme', 24.0, null, 'Manuell i klimakortet', 'gulv', 'Vaskegang'],
  ];
  const laster = ZONES.map(([key, navn, naa, mal, forklaring, type, rom, person, person_type], i) => ({
    navn, rom, key, type, prio: 3, handling: mal == null ? 'manuell' : 'normal', mal: mal == null ? 20 : mal, settpunkt: mal, naa, effekt: 0, forklaring,
    overstyrt: false, overstyrt_til: null, overstyrt_temp: null, styr: `switch.ki_styr_${key}`, helpere: [], leggetid: false,
    entiteter: [`climate.${key}`, `sensor.${key}_power`], person: person || null, person_type: person_type || null,
  })).concat([{ navn: 'Varmtvannsbereder', rom: 'Varmtvann', key: 'vvb', type: 'bryter', prio: 2, handling: 'av', effekt: 0, forklaring: 'Styres av varmtvannsdelen', overstyrt: false }]);
  const LOG = [['21:00', 'gronn', 'God margin. Bruker 0,94 kW av 5,50 kW tillatt.'], ['20:59', 'gul', 'Senker bad gulvvarme. Til 19,0 °C for å holde timen under 5,50 kWh.'],
    ['18:50', 'info', 'Helgemodus aktivert. Automatisk etter 6 t fravær.'], ['17:59', 'gul', 'Senker bad og kjøkken. Holder timen under 5,50 kWh.'], ['17:54', 'gronn', 'God margin. Bruker 1,45 kW av 5,50 kW tillatt.']];
  const linjer = Array.from({ length: 40 }, (_, i) => { const l = LOG[i % 5]; return { tid: `2026-09-25 ${l[0]}:00`, sone: l[1], forklaring: l[2], tiltak: [] }; });
  const on = (v) => (v ? 'on' : 'off');
  const num = (v, unit = '') => ({ state: String(v), attributes: { unit_of_measurement: unit } });
  const time = (v) => `${v}:00`;
  const S = {
    'sensor.ki_energi_status': { state: 'gronn', attributes: {
      forklaring: 'God margin. Bruker 0,57 kW av 5,50 kW tillatt.', modus: 'HELG', hustype: 'bolig',
      personer: [{ key: 'cybele', navn: 'Cybele', type: 'barn' }, { key: 'sebastian', navn: 'Sebastian', type: 'ungdom' }, { key: 'rune', navn: 'Rune', type: 'voksen' }],
      hanklevarmer: true, gardiner: true, vvb_bryter: true, grense_kwh: 5.5, grense_grunn: 'Økonomisk rom over absolutt grense', forbrukt_kwh: 0.31, igjen_kwh: 5.19,
      minutter_igjen: 33, tillatt_effekt_kw: 5.5, forventet_effekt_kw: 0.57, uregulert_kw: 0.57, uregulert_60_kw: 0.72, ledig_kw: 4.08, malekilde: 'energimåler',
      prognose_15_kw: 0.6, prognose_30_kw: 0.6, prognose_60_kw: 0.7, prognose_120_kw: 0.7 } },
    'sensor.ki_laster': { state: '0', attributes: { laster } },
    'sensor.ki_prognose': { state: '0.6', attributes: { om_15_min_kw: 0.6, om_30_min_kw: 0.6, om_60_min_kw: 0.7, om_120_min_kw: 0.7, topp_forventet: 60 } },
    'sensor.ki_nettleie': { state: '250', attributes: {
      registrert_trinn_kr: 250, registrert_trinn_til: 5, dagens_maks_kwh: 2.99, dagens_maks_time: '00', registrert_snitt: 3.83, forventet_time_kwh: 0.62,
      hvorfor: 'Økonomisk rom (5,64 kWh) er over den absolutte grensen, så 5,50 kWh gjelder.', topp_tre: [{ dato: '2026-09-03', kwh: 3.99 }, { dato: '2026-09-11', kwh: 3.87 }, { dato: '2026-09-17', kwh: 3.64 }],
      timer_siste_12: H12.map((kwh, i) => ({ start: at(10 + i, 0).getTime() / 1000, kwh, kvalitet: 'malt' })) } },
    'sensor.ki_bereder': { state: 'Mettet', attributes: {
      bryter: 'switch.varmtvannsbereder', bryter_pa: false, varmer: false, effekt_w: 0, effekt_sensor: 'sensor.varmtvannsbereder_power', legionella_aktiv: true, sikret: true, forfalt: false,
      siste_syklus: iso(at(12, 36, 1)), neste_frist: iso(at(12, 36, 3)), intervall_dager: 3, hard_frist_dager: 7, vindu: '00:00–05:00', forklaring: 'Ferdig for i natt' } },
    'sensor.ki_vvb_forklaring': 'Ferdig for i natt. Neste vindu åpner kl. 00:00.',
    'sensor.ki_vvb_dager_siden_siste_syklus': num(0.4, 'd'),
    'sensor.ki_vvb_billige_timer': { state: '6', attributes: { doegn: PRICE.map((pris, i) => ({ t: (21 + i) % 24, pris, valgt: i >= 3 && i <= 8, vindu: i >= 3 && i <= 8, naa: i === 0 })) } },
    'binary_sensor.ki_vvb_boost_aktiv': 'off', 'switch.ki_vvb_tvungen_syklus_aktiv': 'off', 'switch.ki_vvb_prisstyring': 'on', 'switch.ki_vvb_legionella_aktiv': 'on',
    'sensor.ki_hanklevarmer': { state: 'av', attributes: { bryter: 'switch.hanklevarmer', forklaring: 'Av. Neste vindu kl. 05:30.', effekt_w: 0, i_vindu: false,
      spart_kr_maned: 13, spart_kwh_i_dag: 0.6, spart_kr_ar: 293, effekt_nominell_w: 45, pa_min_i_dag: 522 } },
    'switch.hanklevarmer': { state: 'off', attributes: { friendly_name: 'Håndklevarmer' } }, 'switch.ki_styr_hanklevarmer': 'on',
    'sensor.ki_sparing': { state: '47', attributes: { total_kr_maned: 47, total_kwh_maned: 103.7, poster: { motor: { kr: 15, kwh: 5 }, gardiner: { kr: 5, kwh: 2 }, hanklevarmer: { kr: 14, kwh: 6 }, bereder: { kr: 13, kwh: 20 }, lys: { kr: 0, kwh: 0 } } } },
    'sensor.ki_besparelse': { state: '15', attributes: { flyttet_kwh: 103.7, spart_nettleie_kr: 8 } },
    'number.ki_stat_unngatte_topper': num(0), 'number.ki_stat_shed_hendelser': num(641), 'number.ki_stat_flyttet_kwh': num(51.66, 'kWh'), 'number.ki_stat_komfortavvik': num(263.5),
    'sensor.ki_uregulert_effekt': num(540, 'W'), 'sensor.ki_styrt_effekt': num(50, 'W'),
    'number.ki_maks_time_kwh': num(5.5, 'kWh'), 'number.ki_mal_trinn_kw': num(5.0, 'kW'), 'number.ki_reserve_topp_kwh': num(0.3, 'kWh'), 'number.ki_min_time_kwh': num(3.0, 'kWh'),
    'number.ki_reserve_uregulert_kwh': num(0.35, 'kWh'), 'number.ki_shed_gulv_maks': num(3, '°C'), 'number.ki_shed_panel_maks': num(2, '°C'), 'number.ki_komfort_vekt': num(60),
    'sensor.ki_tidskonstanter': { state: '8', attributes: { soner: {
      'Bad gulvvarme': { tau_timer: 2.7, grader_per_time: 6.7, malinger: 2281 }, 'Sebastian panelovn': { tau_timer: 3.5, grader_per_time: 2.7, malinger: 1234 },
      'Trappegang': { tau_timer: 6.2, grader_per_time: 2.2, malinger: 936 }, 'Cybele panelovn': { tau_timer: 6.3, grader_per_time: 1.7, malinger: 321 },
      'Kjøkken panelovn': { tau_timer: 6.0, grader_per_time: 1.5, malinger: 786 }, 'Kjøkken gulvvarme': { tau_timer: 2.0, grader_per_time: 11.9, malinger: 56 },
      'Stue': { tau_timer: 7.5, grader_per_time: 1.2, malinger: 416 }, 'Vaskegang gulvvarme': { tau_timer: 2.0, grader_per_time: 1.2, malinger: 24 } } } },
    'sensor.ki_beslutningslogg': { state: '2026-09-25 21:00:00', attributes: { linjer } },
    'sensor.ki_lys': { state: '2', attributes: { spart_kr_maned: 0, regler: [{ key: 'rune_soverom', navn: 'Rune soverom', type: 'glemt', tekst: 'Lyset er av', aktiv: true }, { key: 'vaskegang', navn: 'Vaskegang', type: 'glemt', tekst: 'Lyset er av', aktiv: true }] } },
    'switch.ki_lys_rune_soverom': 'on', 'switch.ki_lys_vaskegang': 'on',
    'sensor.ki_prognoselaering': { state: 'usikkert_grunnlag', attributes: { forventet_slutt_kwh: 0.62, kwh: 0.47, strategisk_reserve_kwh: 0.3,
      grunn: '278 av timene ble påvirket av motorens egne tiltak eller holdt utenfor. Grunnlaget mangler de vanskelige timene, så marginen holdes minst på fast nivå.' } },
    // moduser og brytere
    'switch.ki_helgemodus': 'on', 'binary_sensor.ki_alle_borte': 'on', 'switch.ki_hjemkomst_aktiv': 'off', 'switch.ki_sommermodus': 'off', 'switch.ki_sebastian_ferie': 'off',
    'switch.ki_helg_auto': 'on', 'switch.ki_energi_hovedbryter': 'on', 'switch.ki_skyggemodus': 'off', 'switch.ki_adaptiv_reserve': 'on', 'switch.ki_tillat_dyrere_trinn': 'off',
    'switch.ki_varsel_effekt': 'on', 'switch.ki_varsel_helg': 'on', 'switch.ki_varsel_hjemkomst': 'on', 'switch.ki_varsel_sommer': 'on', 'switch.ki_varsel_vvb': 'on', 'switch.ki_varsel_hanklevarmer': 'off',
    'switch.ki_helg_spor_torsdag': 'off', 'switch.ki_helg_spor_fredag': 'on', 'switch.ki_helg_venter_svar': 'off',
    'number.ki_helg_auto_timer': num(6, 't'), 'number.ki_temp_helg': num(19, '°C'), 'number.ki_temp_helg_gulvvarme': num(19, '°C'), 'number.ki_temp_helg_bad': num(22, '°C'),
    'number.ki_temp_sommer': num(17, '°C'), 'number.ki_sommer_start_maned': num(6), 'number.ki_sommer_slutt_maned': num(8), 'number.ki_sommer_ute_grense': num(25, '°C'),
    'number.ki_natt_senk_ute_grense': num(19, '°C'), 'number.ki_stue_reduksjon': num(1.5, '°C'), 'number.ki_vindu_forsinkelse_min': num(3, 'min'), 'number.ki_vindu_temp': num(17, '°C'),
    'number.ki_sone_gul': num(75, '%'), 'number.ki_sone_oransje': num(88, '%'), 'number.ki_sone_rod': num(97, '%'),
    'number.ki_prognose_margin_min': num(0, 'kWh'), 'number.ki_prognose_margin_maks': num(1.5, 'kWh'), 'number.ki_prognose_min_obs': num(8), 'number.ki_reserve_frokost_kwh': num(0.7, 'kW'), 'number.ki_reserve_middag_kwh': num(1.0, 'kW'),
    // tider
    'time.ki_tid_dag_start': time('06:30'), 'time.ki_tid_natt_start': time('22:30'), 'time.ki_stue_reduksjon_fra': time('23:00'),
    'time.ki_cybele_dag': time('05:30'), 'time.ki_cybele_natt': time('19:00'), 'time.ki_cybele_borte_fra': time('08:00'), 'time.ki_cybele_borte_til': time('15:00'),
    'time.ki_sebastian_vekking': time('07:00'), 'time.ki_sebastian_vekking_helg': time('09:30'), 'time.ki_sebastian_natt': time('23:00'),
    'time.ki_hanklevarmer_morgen_start': time('05:30'), 'time.ki_hanklevarmer_morgen_slutt': time('11:15'), 'time.ki_hanklevarmer_kveld_start': time('19:00'), 'time.ki_hanklevarmer_kveld_slutt': time('22:00'),
    'time.ki_frokost_start': time('06:30'), 'time.ki_frokost_slutt': time('08:30'), 'time.ki_middag_start': time('15:30'), 'time.ki_middag_slutt': time('19:00'),
    'time.ki_helg_varsel_tid_torsdag': time('16:00'), 'time.ki_helg_varsel_tid': time('10:00'), 'time.ki_helg_sporsmal_tid': time('08:00'), 'time.ki_helg_frist_tid': time('11:00'), 'time.ki_hjemkomst_tid': time('14:00'),
  };
  for (const [key, , naa, mal] of ZONES) { S[`switch.ki_styr_${key}`] = on(mal != null); S[`climate.${key}`] = { state: 'heat', attributes: { temperature: mal == null ? 20 : mal, current_temperature: naa } }; S[`sensor.${key}_power`] = num(0, 'W'); }
  MOCK.add(S);
  // Effekt siste 6 timer: 18 bøtter à 20 min (bøtte 2 er styrt varme)
  const make0 = MOCK.make;
  MOCK.make = function () {
    const h = make0.apply(this, arguments), cw = h.callWS;
    h.callWS = (msg) => {
      if (msg.type === 'history/history_during_period' && (msg.entity_ids || []).includes('sensor.ki_uregulert_effekt')) {
        const t0 = new Date(msg.start_time).getTime() / 1000, u = [], s = [];
        BARS.forEach((v, i) => { const t = t0 + i * 1200 + 60; u.push({ s: String(i === 1 ? 1000 : v * 1000), lu: t }); s.push({ s: String(i === 1 ? 1500 : 0), lu: t }); });
        return Promise.resolve({ 'sensor.ki_uregulert_effekt': u, 'sensor.ki_styrt_effekt': s });
      }
      return cw(msg);
    };
    return h;
  };
})();
