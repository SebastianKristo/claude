// Mock for kd-kamera-card – gjenskaper eksempelverdiene i «Kamera» (5 kameraer, person ved inngangen, 7 hendelser i dag).
// Bildene er SVG-gradienter som data:-URL-er (i HA er entity_picture en signert /api/camera_proxy/…-adresse).
(() => {
  const mine = new URLSearchParams(location.search).get('card') === 'kd-kamera-card';
  const pic = (h1, h2, label) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h1},28%,34%)"/><stop offset="1" stop-color="hsl(${h2},22%,14%)"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><rect x="0" y="250" width="640" height="110" fill="rgba(0,0,0,.25)"/><circle cx="480" cy="90" r="46" fill="rgba(255,255,255,.08)"/><text x="24" y="340" font-family="monospace" font-size="14" fill="rgba(255,255,255,.35)">${label}</text></svg>`);
  const cam = (name, h1, h2) => ({ state: 'streaming', attributes: { friendly_name: name, entity_picture: pic(h1, h2, name), brand: 'Ubiquiti Inc.', model_name: '1080p · 15 fps', supported_features: 3 } });
  const at = (hh, mm) => { const d = new Date(); d.setHours(hh, mm, 0, 0); return d.getTime(); };
  const CAMS = {
    'camera.ringeklokke_g6_entry_high_resolution_channel': cam('Ringeklokke G6 Entry High resolution channel', 30, 220),
    'camera.ringeklokke_g6_entry_medium_resolution_channel': cam('Ringeklokke G6 Entry Medium resolution channel', 30, 220),
    'camera.mellomgang_g5_turret_ultra_high_resolution_channel': cam('Mellomgang G5 Turret Ultra High resolution channel', 200, 260),
    'camera.veranda_g6_bullet_high_resolution_channel': cam('Veranda G6 Bullet High resolution channel', 120, 200),
    'camera.stue_g6_turret_high_resolution_channel': cam('Stue G6 Turret High resolution channel', 25, 280),
    'camera.ringeklokke_g6_entry_package_camera': cam('Ringeklokke G6 Entry Package Camera', 45, 10),
    // Frigate-kameraene (samme kameraer – skal ikke vises dobbelt)
    'camera.ringeklokke': cam('Ringeklokke', 30, 220), 'camera.ringeklokke_pakke': cam('Ringeklokke pakke', 45, 10),
    'camera.mellomgang': cam('Mellomgang', 200, 260), 'camera.veranda': cam('Veranda', 120, 200), 'camera.stue': cam('Stue', 25, 280),
  };
  MOCK.add({
    ...CAMS,
    'binary_sensor.ringeklokke_g6_entry_person_detected': { state: 'on', attributes: { device_class: 'occupancy', event_score: 92 } },
    'binary_sensor.ringeklokke_g6_entry_vehicle_detected': { state: 'off', attributes: { device_class: 'occupancy' } },
    'binary_sensor.ringeklokke_g6_entry_package_detected': { state: 'off', attributes: { device_class: 'occupancy' } },
    'binary_sensor.mellomgang_g5_turret_ultra_person_detected': 'off',
    'binary_sensor.veranda_g6_bullet_person_detected': 'off', 'binary_sensor.veranda_g6_bullet_animal_detected': 'off', 'binary_sensor.veranda_g6_bullet_motion': 'off',
    'binary_sensor.stue_g6_turret_person_detected': 'off',
    'sensor.stromstad_dream_machine_pro_recording_capacity': { state: '604800', attributes: { unit_of_measurement: 's' } },
    'light.utelys_inngang': { state: 'off', attributes: { friendly_name: 'Utelys inngang' } },
    'light.veranda_lys': 'off',
    'siren.ringeklokke_alarm': 'off',
  });
  if (mine) MOCK.add({ 'binary_sensor.ringeklokke_g6_entry_motion': { state: 'on', attributes: { device_class: 'motion' } } });
  // Designets hendelser: [sensor, klokkeslett, varighet s, score, sone]
  const EV = [
    ['binary_sensor.ringeklokke_g6_entry_person_detected', [21, 24], 18, 92, 'Innkjørsel'],
    ['binary_sensor.ringeklokke_g6_entry_package_detected', [19, 2], 42, 88, 'Trapp'],
    ['binary_sensor.ringeklokke_g6_entry_vehicle_detected', [18, 47], 9, 81, 'Innkjørsel'],
    ['binary_sensor.veranda_g6_bullet_animal_detected', [17, 30], 24, 76, 'Plen'],
    ['binary_sensor.mellomgang_g5_turret_ultra_person_detected', [16, 11], 12, 90, 'Gang'],
    ['binary_sensor.ringeklokke_g6_entry_person_detected', [15, 48], 31, 94, 'Dør'],
    ['binary_sensor.veranda_g6_bullet_person_detected', [14, 5], 62, 87, 'Terrasse'],
  ];
  // Frigate: designets hendelser (bil-hendelsen er favoritt/retain, som i designet)
  const FCAM = { 'binary_sensor.ringeklokke_g6_entry_person_detected': 'ringeklokke', 'binary_sensor.ringeklokke_g6_entry_package_detected': 'ringeklokke_pakke', 'binary_sensor.ringeklokke_g6_entry_vehicle_detected': 'ringeklokke', 'binary_sensor.veranda_g6_bullet_animal_detected': 'veranda', 'binary_sensor.mellomgang_g5_turret_ultra_person_detected': 'mellomgang', 'binary_sensor.veranda_g6_bullet_person_detected': 'veranda' };
  const FLAB = ['person', 'package', 'car', 'cat', 'person', 'person', 'person'];
  MOCK.ws('frigate/events/get', () => EV.map(([sid, [hh, mm], dur, score, zone], i) => ({ id: 'ev' + i, camera: FCAM[sid], label: FLAB[i], start_time: at(hh, mm) / 1000, end_time: at(hh, mm) / 1000 + dur, top_score: score / 100, zones: [zone], retain_indefinitely: i === 2, has_clip: true })));
  MOCK.ws('frigate/event/retain', () => ({ success: true }));
  const make = MOCK.make;
  MOCK.make = () => {
    const h = make(), ws = h.callWS;
    h.callWS = (msg) => {
      if (msg.type === 'history/history_during_period' && msg.no_attributes === false && msg.entity_ids.some(id => /_detected$/.test(id))) {
        const out = {};
        for (const id of msg.entity_ids) {
          const list = [{ s: 'off', a: {}, lu: new Date(msg.start_time).getTime() / 1000 }];
          for (const [sid, [hh, mm], dur, score, zone] of EV.slice().reverse()) if (sid === id) {
            const t = at(hh, mm) / 1000;
            list.push({ s: 'on', a: { event_score: score, zones: [zone] }, lu: t }, { s: 'off', a: {}, lu: t + dur });
          }
          out[id] = list;
        }
        return Promise.resolve(out);
      }
      return ws(msg);
    };
    return h;
  };
})();
