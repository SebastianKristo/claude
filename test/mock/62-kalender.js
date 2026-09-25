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
  const pm = i => MONTHS.map((r, k) => ({ maaned: k + 1, netter: r[i] }));
  const lest = dAt(0, 22, 0).toISOString();
  const hut = (sted, rolle, i, p, nights, visits, her, siste) => ({ state: her.join(', ') || 'Tomt', attributes: { integrasjon: 'ki_hyttebesok', type: 'oversikt', friendly_name: `${sted} Oversikt`, sted, rolle, kalender: 'calendar.hytta',
    her_naa: her.map(n => ({ navn: n })), kjente_personer: ['Cybele', 'Rune', 'Sebastian'], netter_i_aar: nights, besok_i_aar: visits, dager: dager[p], opphold: opp(p), kommende: [], per_maaned: pm(i), siste, sist_lest: lest } });
  MOCK.add({
    'calendar.rune': { state: 'on', attributes: { friendly_name: 'Rune' } },
    'calendar.cybele': { state: 'on', attributes: { friendly_name: 'Cybele' } },
    'calendar.familie': { state: 'off', attributes: { friendly_name: 'Familie' } },
    'calendar.sebastian_kristo_no': { state: 'on', attributes: { friendly_name: 'Sebastian Kristo' } },
    'calendar.oslomet_timeplan': { state: 'off', attributes: { friendly_name: 'OsloMet timeplan' } },
    'calendar.birthdays': { state: 'off', attributes: { friendly_name: 'Bursdager' } },
    'calendar.posten_calendar': { state: 'off', attributes: { friendly_name: 'Posten' } },
    'sensor.oslo_oversikt': hut('Oslo', 'hjem', 0, 'o', 64, 38, ['Rune'], { person: 'Rune', start: dayOf(25), netter: 1 }),
    'sensor.stromstad_oversikt': hut('Strømstad', 'hytte', 1, 's', 163, 58, ['Cybele'], { person: 'Cybele', start: dayOf(24), netter: 1 }),
    'sensor.toten_oversikt': hut('Toten', 'hytte', 2, 't', 21, 8, [], { person: 'Cybele', start: dayOf(18), netter: 3 }),
    'sensor.nar_kommer_posten_posten_sensor_next': { state: ymd(dAt(3)), attributes: { postal_code: '1670', city: 'Strømstad' } },
    'sensor.nar_kommer_posten_posten_sensor_next_relative': 'om 3 dager',
    'sensor.zalando_status': { state: 'Klar til henting', attributes: { friendly_name: 'Zalando Status', pickup_point: 'Coop Extra', estimated_delivery: ymd(dAt(0)) } },
    'sensor.komplett_usb_hub_status': { state: 'Under transport', attributes: { friendly_name: 'Komplett · USB-hub Status', estimated_delivery: ymd(dAt(3)) } },
    'sensor.apotek_1_status': { state: 'Sendingen er registrert', attributes: { friendly_name: 'Apotek 1 Status', estimated_delivery: ymd(dAt(4)) } },
  });
  // Sonarr / Radarr / Plex
  const air = (off, h) => dAt(off, h).toISOString();
  MOCK.add({
    'sensor.sonarr_sonarr_upcoming_media': { state: '5', attributes: { data: [{ title_default: '$title', line1_default: '$episode' },
      { title: 'American Hostage', episode: 'Magic Ticket Sweepstakes', number: 'S01E03', studio: 'MGM+', airdate: air(3, 3) },
      { title: 'Lanterns', episode: "The Jordan Boy's Legacy", number: 'S01E07', studio: 'HBO', airdate: air(3, 3) },
      { title: 'Line of Fire', episode: 'A Bigger Picture', number: 'S01E02', studio: 'NBC', airdate: air(4, 4) },
      { title: 'Best Medicine', episode: "Breakin' in Is Hard to Do", number: 'S02E02', studio: 'FOX', airdate: air(5, 2) },
      { title: 'The Last of Us', episode: 'TBA', number: 'S03E01', studio: 'HBO', airdate: air(7, 3) }] } },
    'sensor.radarr_radarr_upcoming_media': { state: '3', attributes: { data: [{ title_default: '$title' },
      { title: 'Spider-Man: Brand New Day', studio: 'Marvel Studios', airdate: air(4, 2) },
      { title: 'Coyote vs. Acme', studio: 'Ketchup Entertainment', airdate: air(4, 2), flag: true },
      { title: 'Digger', studio: 'Warner Bros. Pictures', airdate: air(5, 2) }] } },
    'sensor.d_day_darling_plex_recently_added_show': { state: '1', attributes: { data: JSON.stringify([{ title_default: '$title' }, { title: 'The Last of Us', number: 'S03E01', airdate: air(-1, 3) }]) } },
    'sensor.d_day_darling_plex_recently_added_movie': { state: '1', attributes: { data: JSON.stringify([{ title_default: '$title' }, { title: 'Coyote vs. Acme', airdate: air(-2, 3) }]) } },
  });
  // alternative kilder å velge mellom i «Tilpass oppsett»
  MOCK.add({
    'sensor.sonarr_queue': { state: '2', attributes: { friendly_name: 'Sonarr Queue', unit_of_measurement: 'episodes' } },
    'sensor.radarr_movies': { state: '412', attributes: { friendly_name: 'Radarr Movies' } },
    'sensor.plex_d_day_darling': { state: '0', attributes: { friendly_name: 'Plex (D-Day Darling)' } },
    'sensor.posten_neste_levering': { state: ymd(dAt(5)), attributes: { friendly_name: 'Posten neste levering' } },
  });
  const REG = {};
  for (const id of ['sensor.zalando_status', 'sensor.komplett_usb_hub_status', 'sensor.apotek_1_status']) REG[id] = { entity_id: id, platform: 'norwegian_parcel_tracker' };
  const prev = MOCK.make;
  MOCK.make = function () { const h = prev.apply(this, arguments); h.entities = Object.assign({}, h.entities || {}, REG); return h; };
})();
