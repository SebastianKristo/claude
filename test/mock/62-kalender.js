// Mock for kd-kalender-card – gjenskaper eksempelverdiene i «Kalender» (datoer relativt til i dag, som designets 25. sep).
(() => {
  const pad = n => String(n).padStart(2, '0');
  const T0 = new Date(); T0.setHours(0, 0, 0, 0);
  const dAt = (off, h = 0, m = 0) => new Date(T0.getFullYear(), T0.getMonth(), T0.getDate() + off, h, m);
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const allDay = (off, summary, extra = {}) => ({ summary, start: { date: ymd(dAt(off)) }, end: { date: ymd(dAt(off + 1)) }, ...extra });
  const timed = (off, from, to, summary, extra = {}) => { const [h1, m1] = from.split(':').map(Number), [h2, m2] = (to || from).split(':').map(Number); return { summary, start: { dateTime: dAt(off, h1, m1).toISOString() }, end: { dateTime: dAt(off, h2, m2).toISOString() }, ...extra }; };
  const CAL = {
    'calendar.rune': [allDay(0, 'Oslo')],
    'calendar.sebastian_kristo_no': [allDay(0, 'Oslo'), timed(4, '09:00', '12:00', 'TRE1300 Skriftlig eksamen under tilsyn'), timed(7, '17:00', null, 'Håndballtrening')],
    'calendar.cybele': [allDay(0, 'Strømstad'), timed(1, '10:00', '11:00', 'Tannlege')],
    'calendar.familie': [timed(1, '18:30', null, 'Middag hos Anne og Per'), allDay(3, 'Søppeltømming · restavfall og plast')],
    'calendar.oslomet_timeplan': [],
    'calendar.birthdays': [],
    'calendar.posten_calendar': [3, 5, 7, 11, 13].map(o => allDay(o, 'Posten leverer')),
  };
  // forelesninger (samme formel som designet)
  const COURSES = [['MEK1300 Forelesning', '08:30', '10:15', 'Zoom · student.oslomet.no/zoom'], ['ELI1300 Forelesning', '12:30', '14:15', 'Pilestredet park 35 U2005'], ['DAT1100 Lab', '10:30', '12:15', 'P52 rom 407'], ['TRE1300 Øving', '14:30', '16:00', 'Teams']];
  for (let off = -60; off <= 60; off++) {
    const d = dAt(off), wd = d.getDay(); if (wd === 0 || wd === 6) continue;
    const n = 1 + ((d.getDate() * 7 + d.getMonth()) % 3);
    const l = Array.from({ length: n }, (_, k) => COURSES[(d.getDate() + k) % COURSES.length]).sort((x, y) => x[1].localeCompare(y[1]));
    for (const c of l) CAL['calendar.oslomet_timeplan'].push(timed(off, c[1], c[2], c[0], { location: c[3] }));
  }
  // bursdager (neste forekomst, fødselsdato i beskrivelsen)
  for (const [name, iso] of [['Mormor', '1941-10-03'], ['Cybele', '1972-11-14'], ['Onkel Lars', '1968-12-02'], ['Rune', '1969-01-21'], ['Sebastian', '2006-03-08'], ['Tante Kari', '1975-05-30'], ['Farfar', '1938-07-19']]) {
    const [, bm, bd] = iso.split('-').map(Number);
    let n = new Date(T0.getFullYear(), bm - 1, bd); if (n < T0) n = new Date(T0.getFullYear() + 1, bm - 1, bd);
    CAL['calendar.birthdays'].push({ summary: name, description: `Født ${iso}`, start: { date: ymd(n) }, end: { date: ymd(new Date(n.getTime() + 864e5)) } });
  }
  MOCK.api(/^calendars\//, (path) => {
    const m = path.match(/^calendars\/([^?]+)\?start=([^&]+)&end=(.+)$/); if (!m) return [];
    const s = new Date(decodeURIComponent(m[2])), e = new Date(decodeURIComponent(m[3]));
    return (CAL[m[1]] || []).filter(ev => { const a = new Date(ev.start.dateTime || ev.start.date + 'T00:00'), b = new Date(ev.end.dateTime || ev.end.date + 'T00:00'); return a < e && b > s; });
  });

  // KI Hyttebesøk – designets september (dag D → i dag + D − 25)
  const P = { c: 'Cybele', r: 'Rune', s: 'Sebastian' };
  const SEP = { 1: 's', 2: 's', 3: 's', 4: 's', 5: 's', 6: 's', 7: 's', 8: 's', 9: 's', 10: 's', 11: 's', 12: 'os', 13: 'os', 14: 'os', 15: 'o', 16: 'o', 17: 'os', 18: 'os', 19: 's', 20: 'os', 21: 'o', 22: 'o', 23: 'o', 24: 'os', 25: 'os' };
  const WHO_SEP = { s: { 1: 'rs', 2: 'rs', 3: 'rs', 4: 'crs', 5: 'rsc', 6: 'crs', 7: 'c', 8: 'c', 9: 'c', 10: 'c', 11: 'c', 12: 'r', 13: 'r', 14: 'r', 24: 'c', 25: 'c' }, o: { 12: 'r', 13: 'r', 14: 'rs', 15: 'rs', 16: 'r', 17: 'rs', 18: 'r', 20: 'rc', 21: 'rs', 22: 'r', 23: 'rc', 24: 'rcs', 25: 'rcs' } };
  const dayOf = D => ymd(dAt(D - 25));
  const dager = { o: {}, s: {}, t: {} };
  for (const [D, codes] of Object.entries(SEP)) for (const p of codes) dager[p][dayOf(+D)] = ((WHO_SEP[p] && WHO_SEP[p][D]) || 'c').split('').map(x => P[x]);
  for (const D of [32, 33, 34]) dager.s[dayOf(D)] = ['Cybele', 'Rune']; // planlagt tur (stiplet)
  const STAYS = [['r', 'o', 25, 1], ['s', 'o', 25, 1], ['c', 'o', 25, 1], ['c', 'o', 24, 1], ['s', 'o', 24, 1], ['r', 'o', 24, 2], ['c', 's', 24, 2], ['r', 'o', 23, 2], ['c', 'o', 23, 2], ['r', 'o', 22, 2], ['c', 't', 18, 3], ['r', 's', 12, 3], ['c', 's', 7, 5], ['s', 's', 1, 6]];
  const opp = p => STAYS.filter(x => x[1] === p).map(([w, , D, n]) => ({ person: P[w], start: dayOf(D), slutt: dayOf(D + n), netter: n, tittel: '' }));
  const MONTHS = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 62, 0], [0, 49, 0], [64, 52, 21], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const MN = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
  const pm = i => MONTHS.map((r, k) => ({ maaned: k + 1, navn: MN[k], netter: r[i], personer: {} }));
  const lest = dAt(0, 22, 0).toISOString();
  // KI Hyttebesøk (custom_components/ki_hyttebesok): has_entity_name, enhet «KI Hyttebesøk <Sted>» → sensor.ki_hyttebesok_<sted>_oversikt,
  // attributtene fra HytteMotor.oversikt() + integrasjon/ki_type.
  const KOMMENDE = { s: [{ person: 'Cybele', start: dayOf(32), slutt: dayOf(34), tittel: 'Strömstad – Cybele' }, { person: 'Rune', start: dayOf(32), slutt: dayOf(34), tittel: 'Strömstad – Rune' }], o: [], t: [] };
  const hut = (sted, rolle, i, p, nights, visits, her, siste, skriver) => { const op = opp(p); return { state: her.join(', ') || 'Tomt', attributes: { integrasjon: 'ki_hyttebesok', ki_type: 'oversikt', friendly_name: `KI Hyttebesøk ${sted} Oversikt`, icon: 'mdi:home-heart',
    sted, rolle, skriver, kalender: 'calendar.hytta', hjemme_kilde: rolle === 'hjem' ? 'auto' : '', lest_hendelser: 57, titler: [],
    kjente_personer: ['Cybele', 'Rune', 'Sebastian'], her_naa: her.map(n => ({ navn: n, farge: 'var(--green)', siden: dayOf(24) })),
    personer: ['Cybele', 'Rune', 'Sebastian'].map(n => { const mine = op.filter(o => o.person === n); return { navn: n, farge: 'var(--green)', entity: skriver ? `switch.${n.toLowerCase()}_posisjon_hjemme_borte` : '', her: her.includes(n), siden: her.includes(n) ? dayOf(24) : null,
      netter_i_aar: Math.round(nights * (n === 'Cybele' ? 0.45 : n === 'Rune' ? 0.35 : 0.2)), besok_i_aar: Math.round(visits * (n === 'Cybele' ? 0.45 : n === 'Rune' ? 0.35 : 0.2)), siste: mine[0] || null }; }),
    netter_i_aar: nights, besok_i_aar: visits, siste, kommende: KOMMENDE[p], opphold: op, per_maaned: pm(i), dager: dager[p], feil: null, sist_lest: lest } }; };
  const HUTS = [['oslo', 'Oslo', 'o'], ['stromstad', 'Strömstad', 's'], ['toten', 'Toten', 't']];
  const HREG = {};
  const sib = {};
  for (const [slug, sted, p] of HUTS) {
    const pre = `ki_hyttebesok_${slug}`, dev = `dev_hytte_${slug}`, A = (t, x) => ({ integrasjon: 'ki_hyttebesok', ki_type: t, ...x });
    const op = opp(p);
    Object.assign(sib, {
      [`sensor.${pre}_netter_i_ar`]: { state: '0', attributes: A('netter', { friendly_name: `KI Hyttebesøk ${sted} Netter i år`, unit_of_measurement: 'netter', besok: 0, per_maaned: [] }) },
      [`sensor.${pre}_siste_besok`]: { state: op[0] ? `${op[0].person} ${op[0].start}` : '—', attributes: A('siste', { friendly_name: `KI Hyttebesøk ${sted} Siste besøk`, ...(op[0] || {}), opphold: op }) },
      [`sensor.${pre}_neste_besok`]: { state: KOMMENDE[p][0] ? `${KOMMENDE[p][0].person} ${KOMMENDE[p][0].start}` : '—', attributes: A('neste', { friendly_name: `KI Hyttebesøk ${sted} Neste besøk`, kommende: KOMMENDE[p] }) },
      [`sensor.${pre}_her_na`]: { state: '0', attributes: A('her', { friendly_name: `KI Hyttebesøk ${sted} Her nå`, personer: [] }) },
      [`binary_sensor.${pre}_noen_pa_stedet`]: { state: 'off', attributes: A('noen_her', { friendly_name: `KI Hyttebesøk ${sted} Noen på stedet`, device_class: 'presence', personer: [] }) },
      [`button.${pre}_synk_kalenderen_na`]: { state: lest, attributes: A('synk', { friendly_name: `KI Hyttebesøk ${sted} Synk kalenderen nå`, sist_lest: lest, feil: null }) },
      [`button.${pre}_lagre_pagaende_opphold`]: { state: 'unknown', attributes: A('lagre_naa', { friendly_name: `KI Hyttebesøk ${sted} Lagre pågående opphold`, paagaar: [] }) },
    });
    for (const id of [`sensor.${pre}_oversikt`, ...Object.keys(sib).filter(x => x.includes(pre))]) HREG[id] = { entity_id: id, platform: 'ki_hyttebesok', device_id: dev };
  }
  // helgeoversikten (bare på hjemme-oppføringen)
  const helger = Array.from({ length: 8 }, (_, i) => { const l = new Date(T0); l.setDate(l.getDate() - ((l.getDay() + 1) % 7) - 7 * i); const so = new Date(l); so.setDate(so.getDate() + 1);
    const wk = (() => { const d = new Date(l); d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7); const w1 = new Date(d.getFullYear(), 0, 4); return 1 + Math.round(((d - w1) / 864e5 - 3 + (w1.getDay() + 6) % 7) / 7); })();
    const st = i % 3 === 0 ? { 'Strömstad': ['Cybele'], Oslo: ['Rune', 'Sebastian'] } : i % 3 === 1 ? { 'Strömstad': ['Cybele', 'Rune', 'Sebastian'] } : { Oslo: ['Rune'], Toten: ['Cybele'], 'Strömstad → Oslo': ['Sebastian'] };
    const pers = {}; for (const [k, v] of Object.entries(st)) for (const n of v) pers[n] = k;
    return { uke: wk, aar: l.getFullYear(), lordag: ymd(l), sondag: ymd(so), personer: pers, steder: st, sammen: Object.keys(st).length === 1, hovedsted: Object.keys(st)[0] }; });
  sib['sensor.ki_hyttebesok_oslo_helger'] = { state: helger[0].hovedsted, attributes: { integrasjon: 'ki_hyttebesok', ki_type: 'helger', friendly_name: 'KI Hyttebesøk Oslo Helger', helger, hvor_er_vi_naa: { Cybele: 'Strömstad', Rune: 'Oslo', Sebastian: 'Oslo' }, steder: HUTS.map(([, sted], i) => ({ sted, rolle: i ? 'hytte' : 'hjem' })), personer: ['Cybele', 'Rune', 'Sebastian'] } };
  HREG['sensor.ki_hyttebesok_oslo_helger'] = { entity_id: 'sensor.ki_hyttebesok_oslo_helger', platform: 'ki_hyttebesok', device_id: 'dev_hytte_oslo' };
  MOCK.add(sib);
  MOCK.add({
    'calendar.rune': { state: 'on', attributes: { friendly_name: 'Rune' } },
    'calendar.cybele': { state: 'on', attributes: { friendly_name: 'Cybele' } },
    'calendar.familie': { state: 'off', attributes: { friendly_name: 'Familie' } },
    'calendar.sebastian_kristo_no': { state: 'on', attributes: { friendly_name: 'Sebastian Kristo' } },
    'calendar.oslomet_timeplan': { state: 'off', attributes: { friendly_name: 'OsloMet timeplan' } },
    'calendar.birthdays': { state: 'off', attributes: { friendly_name: 'Bursdager' } },
    'calendar.posten_calendar': { state: 'off', attributes: { friendly_name: 'Posten' } },
    'calendar.hytta': { state: 'off', attributes: { friendly_name: 'Hytta' } },
    'sensor.ki_hyttebesok_oslo_oversikt': hut('Oslo', 'hjem', 0, 'o', 64, 38, ['Rune'], { person: 'Rune', start: dayOf(25), slutt: dayOf(25), netter: 1, tittel: '' }, true),
    'sensor.ki_hyttebesok_stromstad_oversikt': hut('Strömstad', 'hytte', 1, 's', 163, 58, ['Cybele'], { person: 'Cybele', start: dayOf(24), slutt: dayOf(25), netter: 1, tittel: '' }, false),
    'sensor.ki_hyttebesok_toten_oversikt': hut('Toten', 'hytte', 2, 't', 21, 8, [], { person: 'Cybele', start: dayOf(18), slutt: dayOf(20), netter: 3, tittel: '' }, false),
    'sensor.nar_kommer_posten_posten_sensor_next': { state: ymd(dAt(3)), attributes: { postal_code: '1670', city: 'Strømstad' } },
    'sensor.nar_kommer_posten_posten_sensor_next_relative': 'om 3 dager',
    'sensor.zalando_status': { state: 'Klar til henting', attributes: { friendly_name: 'Zalando Status', pickup_point: 'Coop Extra', estimated_delivery: ymd(dAt(0)) } },
    'sensor.komplett_usb_hub_status': { state: 'Under transport', attributes: { friendly_name: 'Komplett · USB-hub Status', estimated_delivery: ymd(dAt(3)) } },
    'sensor.apotek_1_status': { state: 'Sendingen er registrert', attributes: { friendly_name: 'Apotek 1 Status', estimated_delivery: ymd(dAt(4)) } },
  });
  // Sonarr / Radarr / Plex
  const air = (off, h) => dAt(off, h).toISOString();
  // Radarr (HA core): calendar.radarr – én heldagshendelse per utgivelse, summary = filmtittel, description = handling
  CAL['calendar.radarr'] = [
    allDay(4, 'Spider-Man: Brand New Day', { description: 'Peter Parker må velge mellom …' }),
    allDay(4, 'Coyote vs. Acme (Cinemas)', { description: 'Wile E. Coyote saksøker Acme.' }),
    allDay(5, 'Digger', { description: 'Et hemmelig prosjekt.' }),
    allDay(12, 'The Running Man (Digital)', { description: 'Ben Richards stiller opp.' }),
    allDay(40, 'Utenfor rekkevidde'),
  ];
  // Sonarr (community-kalender): «Serie - 1x03 - Episode»
  CAL['calendar.sonarr'] = [
    timed(3, '03:00', '04:00', 'American Hostage - 1x03 - Magic Ticket Sweepstakes'),
    timed(3, '03:00', '04:00', 'Lanterns - S01E07 - The Jordan Boy\'s Legacy'),
    timed(4, '04:00', '05:00', 'Line of Fire - 1x02 - A Bigger Picture'),
    timed(5, '02:00', '03:00', 'Best Medicine - 2x02 - Breakin\' in Is Hard to Do'),
  ];
  MOCK.add({
    'calendar.radarr': { state: 'off', attributes: { friendly_name: 'Radarr', message: 'Spider-Man: Brand New Day', all_day: true, start_time: ymd(dAt(4)) + ' 00:00:00' } },
    'calendar.sonarr': { state: 'off', attributes: { friendly_name: 'Sonarr' } },
    // Sonarr (HA core): state = antall, attributtene «Serie SxxEyy» → sendetid (nyere) eller «Serie» → «SxxEyy» (eldre)
    'sensor.sonarr_upcoming': { state: '4', attributes: { friendly_name: 'Sonarr Upcoming', unit_of_measurement: 'episodes', icon: 'mdi:television',
      'American Hostage S01E03': air(3, 3), 'Lanterns S01E07': air(3, 3), 'Line of Fire S01E02': air(4, 4), 'The Last of Us': 'S03E01' } },
    'sensor.radarr_movies': { state: '412', attributes: { friendly_name: 'Radarr Movies', unit_of_measurement: 'movies' } },
  });
  MOCK.add({
    'sensor.sonarr_sonarr_upcoming_media_old': { state: '5', attributes: { data: [{ title_default: '$title', line1_default: '$episode' },
      { title: 'American Hostage', episode: 'Magic Ticket Sweepstakes', number: 'S01E03', studio: 'MGM+', airdate: air(3, 3) },
      { title: 'Lanterns', episode: "The Jordan Boy's Legacy", number: 'S01E07', studio: 'HBO', airdate: air(3, 3) },
      { title: 'Line of Fire', episode: 'A Bigger Picture', number: 'S01E02', studio: 'NBC', airdate: air(4, 4) },
      { title: 'Best Medicine', episode: "Breakin' in Is Hard to Do", number: 'S02E02', studio: 'FOX', airdate: air(5, 2) },
      { title: 'The Last of Us', episode: 'TBA', number: 'S03E01', studio: 'HBO', airdate: air(7, 3) }] } },
    'sensor.radarr_radarr_upcoming_media_old': { state: '3', attributes: { data: [{ title_default: '$title' },
      { title: 'Spider-Man: Brand New Day', studio: 'Marvel Studios', airdate: air(4, 2) },
      { title: 'Coyote vs. Acme', studio: 'Ketchup Entertainment', airdate: air(4, 2), flag: true },
      { title: 'Digger', studio: 'Warner Bros. Pictures', airdate: air(5, 2) }] } },
    'sensor.d_day_darling_plex_recently_added_show': { state: '1', attributes: { data: JSON.stringify([{ title_default: '$title' }, { title: 'The Last of Us', number: 'S03E01', airdate: air(-1, 3) }]) } },
    'sensor.d_day_darling_plex_recently_added_movie': { state: '1', attributes: { data: JSON.stringify([{ title_default: '$title' }, { title: 'Coyote vs. Acme', airdate: air(-2, 3) }]) } },
  });
  // alternative kilder å velge mellom i «Tilpass oppsett»
  MOCK.add({
    'sensor.sonarr_queue': { state: '2', attributes: { friendly_name: 'Sonarr Queue', unit_of_measurement: 'episodes' } },
    'sensor.plex_d_day_darling': { state: '0', attributes: { friendly_name: 'Plex (D-Day Darling)' } },
    'sensor.posten_neste_levering': { state: ymd(dAt(5)), attributes: { friendly_name: 'Posten neste levering' } },
  });
  const REG = {};
  for (const id of ['sensor.zalando_status', 'sensor.komplett_usb_hub_status', 'sensor.apotek_1_status']) REG[id] = { entity_id: id, platform: 'norwegian_parcel_tracker' };
  Object.assign(REG, HREG);
  const prev = MOCK.make;
  MOCK.make = function () { const h = prev.apply(this, arguments); h.entities = Object.assign({}, h.entities || {}, REG); return h; };
})();
