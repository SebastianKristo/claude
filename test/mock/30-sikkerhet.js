// Mock for kd-sikkerhet-card – gjenskaper eksempelverdiene i «Sikkerhet v2».
// Entiteter som deles med andre kort (alarm, dørlås, bevegelse) overstyres bare når kortet som testes er dette.
(() => {
  const mine = new URLSearchParams(location.search).get('card') === 'kd-sikkerhet-card';
  const at = (h, m) => { const d = new Date(); d.setHours(h, m, 0, 0); return d; };
  const bs = (dc, state = 'off', name) => ({ state, attributes: { device_class: dc, friendly_name: name } });
  MOCK.add({
    'binary_sensor.inngangsdor': bs('door'), 'sensor.inngangsdor_battery': { state: '92', attributes: { unit_of_measurement: '%' } },
    'binary_sensor.trappegang_bevegelsessensor_occupancy': bs('occupancy'), 'sensor.trappegang_bevegelsessensor_battery': '81',
    'binary_sensor.verandador': bs('door'), 'sensor.verandador_battery': '77',
    'binary_sensor.everything_presence_lite_occupancy': bs('occupancy'),
    'binary_sensor.kjokken_vindu': bs('window'), 'sensor.kjokken_vindu_battery': '64',
    'binary_sensor.bad_bevegelsesensor_motion': bs('motion'), 'sensor.bad_bevegelsesensor_battery': '58',
    'binary_sensor.cybele_soverom_vindu': { state: 'on', attributes: { device_class: 'window' }, last_changed: at(13, 2).toISOString() },
    'binary_sensor.rune_kontorvindu': bs('window'), 'binary_sensor.rune_soveromsvindu': bs('window'),
    'binary_sensor.soveromsvindu_venstre': bs('window'), 'binary_sensor.soveromsvindu_hoyre': bs('window'),
    'lock.boddor': { state: 'locked', attributes: { friendly_name: 'Boddør' } }, 'sensor.boddor_battery': '88',
  });
  if (!mine) return;
  MOCK.add({
    'alarm_control_panel.alarm': { state: 'armed_away', attributes: { code_format: 'number', code_arm_required: true, friendly_name: 'Alarm' }, last_changed: at(12, 40).toISOString() },
    'lock.dorlas_blatann': { state: 'locked', attributes: { friendly_name: 'Dørlås' }, last_changed: at(12, 39).toISOString() },
    'sensor.dorlas_wifi_battery': { state: '40', attributes: { unit_of_measurement: '%' } },
    'binary_sensor.stue_g6_turret_motion': { state: 'on', attributes: { device_class: 'motion' } },
    'binary_sensor.mellomgang_g5_turret_ultra_motion': bs('motion'),
    'binary_sensor.stue_royk': bs('smoke', 'off', 'Røykvarsler stue'),
    'binary_sensor.vaskerom_lekkasje': bs('moisture', 'off', 'Lekkasje vaskerom'),
    'binary_sensor.kjellerdor': bs('door', 'off', 'Kjellerdør'),
    'cover.garasjeport': { state: 'closed', attributes: { device_class: 'garage', friendly_name: 'Garasjeport' } },
    'person.rune_jemtland': { state: 'home', attributes: { friendly_name: 'Rune', user_id: 'u-rune' } },
  });
  const LOG = [
    { entity_id: 'binary_sensor.stue_g6_turret_motion', state: 'on', when: at(12, 31) / 1000 },
    { entity_id: 'lock.dorlas_blatann', state: 'locked', when: at(12, 39) / 1000, context_entity_id: 'automation.las_inngang' },
    { entity_id: 'alarm_control_panel.alarm', state: 'arming', when: at(12, 39) / 1000 + 30, context_user_id: 'u-rune' },
    { entity_id: 'alarm_control_panel.alarm', state: 'armed_away', when: at(12, 40) / 1000, context_user_id: 'u-rune' },
    { entity_id: 'binary_sensor.cybele_soverom_vindu', state: 'on', when: at(13, 2) / 1000 },
  ];
  // Kjed callWS, så andre mock-filer beholder sine egne svar.
  const make = MOCK.make;
  MOCK.make = () => {
    const h = make(), ws = h.callWS;
    h.callWS = (msg) => {
      if (msg.type === 'logbook/get_events') return Promise.resolve(LOG.filter(x => !msg.entity_ids || msg.entity_ids.includes(x.entity_id)));
      return ws(msg);
    };
    const cs = h.callService;
    h.callService = (domain, service, data, target) => {
      if (domain === 'alarm_control_panel') {
        MOCK.calls.push([domain, service, data, target]);
        console.log('callService', domain, service, JSON.stringify(data || {}));
        if (data.code !== '123456') return Promise.reject(new Error('Feil kode'));
        const st = { alarm_disarm: 'disarmed', alarm_arm_home: 'armed_home', alarm_arm_away: 'armed_away', alarm_arm_night: 'armed_night' }[service];
        setTimeout(() => MOCK.set(data.entity_id, st), 50);
        return Promise.resolve({});
      }
      return cs(domain, service, data, target);
    };
    return h;
  };
})();
