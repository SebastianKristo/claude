// Mock for kd-sovn-card – gjenskaper eksempelverdiene i «Søvn.dc.html».
(() => {
  const now = Date.now();
  // tidslinjen slutter ved neste hele time; designet regner fra kl. 21 (= start på vinduet)
  const end = new Date(now); end.setMinutes(0, 0, 0); if (+end < now) end.setHours(end.getHours() + 1);
  const t0 = +end - 24 * 3600e3;
  const P = [
    ['cybele', 'Cybele', true, [[23.0, 6.4]]],
    ['rune', 'Rune', false, [[22.8, 7.8]]],
    ['sebastian', 'Sebastian', false, [[23.6, 7.2], [15.5, 0.6]]],
  ];
  const add = {}, hist = {};
  for (const [id, navn, vindu, night] of P) {
    const sid = `binary_sensor.${id}_sovn_sover`;
    add[sid] = { state: 'off', attributes: { integrasjon: 'ki_sovn', type: 'person', navn, prefix: `${id}_sovn`, sannsynlighet: 4, 'obs_vindu_åpent': vindu, bryter: `switch.homey_logic_${id}_sovn_vaken`, siden: new Date(now - 3 * 3600e3).toISOString(), friendly_name: `${navn} søvn sover` } };
    add[`switch.homey_logic_${id}_sovn_vaken`] = 'off';
    add[`button.${id}_sovn_sett_sover`] = 'unknown';
    add[`button.${id}_sovn_sett_vaken`] = 'unknown';
    const pts = [{ s: 'off', lu: (t0 - 6 * 3600e3) / 1000 }];
    for (const [start, dur] of night) { const s = t0 + ((start - 21 + 24) % 24) * 3600e3; pts.push({ s: 'on', lu: s / 1000 }, { s: 'off', lu: (s + dur * 3600e3) / 1000 }); }
    hist[sid] = pts.sort((a, b) => a.lu - b.lu);
  }
  // vekkealarmer (ki_sovn type vekking), én per person som i designet
  const A = [['cybele_vekking', 'binary_sensor.cybele_sovn_sover', '06:30', [1, 1, 1, 1, 1, 0, 0], true, 9 * 60 + 4],
    ['rune_vekking', 'binary_sensor.rune_sovn_sover', '07:00', [1, 1, 1, 1, 1, 1, 1], true, 9 * 60 + 34],
    ['soverom_vekking', 'binary_sensor.sebastian_sovn_sover', '07:15', [1, 1, 1, 1, 1, 0, 0], false, null]];
  const D = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lordag', 'sondag'];
  for (const [p, person, tid, days, on, inMin] of A) {
    add[`sensor.${p}_neste_alarm`] = { state: on ? tid : 'Av', attributes: { integrasjon: 'ki_sovn', type: 'vekking', prefix: p, navn: p, person, neste_dag: 'I morgen',
      neste_tidspunkt: inMin != null ? new Date(now + inMin * 60e3).toISOString() : null, lys: person.includes('rune') ? [] : ['light.soverom_lys', 'light.sebastian_taklampe_1'] } };
    add[`switch.${p}_aktiv`] = on ? 'on' : 'off';
    add[`number.${p}_fade_opp`] = '20';
    add[`binary_sensor.${p}_kjorer`] = 'off';
    D.forEach((d, k) => { add[`switch.${p}_${d}_aktiv`] = days[k] ? 'on' : 'off'; add[`time.${p}_${d}`] = tid + ':00'; });
  }
  add['switch.nattmodus'] = 'off';
  MOCK.add(add);
  // historikk for våre entiteter – kjedes foran standardhåndteringen
  const mk = MOCK.make;
  MOCK.make = function () {
    const h = mk.apply(this, arguments), cw = h.callWS;
    h.callWS = (msg) => {
      if (msg.type === 'history/history_during_period' && msg.entity_ids.some(id => hist[id])) {
        return cw(msg).then(r => { for (const id of msg.entity_ids) if (hist[id]) r[id] = hist[id]; return r; });
      }
      return cw(msg);
    };
    return h;
  };
})();
