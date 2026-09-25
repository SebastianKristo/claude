// Mock for kd-rom-card («Rom v2», standardvisning = Stue): ki_rom-oversikt med designets eksempelverdier.
(() => {
  const L = (name) => ({ state: 'off', attributes: { friendly_name: name, supported_color_modes: ['brightness'], color_mode: null, brightness: null } });
  const lights = {
    'light.stue_gronn_sofalampe': 'Stue Grønn sofalampe', 'light.stue_peislampe': 'Stue Peislampe', 'light.stue_skjenklampe': 'Stue Skjenklampe',
    'light.stue_sofabord': 'Stue Sofabord', 'light.stue_spisebord': 'Stue Spisebord', 'light.stue_stalampe': 'Stue Stålampe',
    'light.stue_stalampe_hjorne': 'Stue Stålampe hjørne', 'light.stue_stalampe_piano': 'Stue Stålampe piano', 'light.stue_taklist': 'Stue Taklist',
  };
  const add = {};
  for (const [id, n] of Object.entries(lights)) add[id] = L(n);
  const lysIds = Object.keys(lights);
  const scener = [['maks', 'Maks lys'], ['komfort', 'Komfort'], ['middag', 'Middag'], ['tv', 'TV-kveld'], ['mindre', 'Mindre lys'], ['av', 'Alt av']];
  for (const [id, n] of scener) add[`button.stue_lys_${id}`] = { state: 'unknown', attributes: { friendly_name: `Stue ${n}`, integrasjon: 'ki_lys', ki_type: 'scene', scene: id, area_id: 'stue' } };
  Object.assign(add, {
    'sensor.stue_lys': { state: '0', attributes: { integrasjon: 'ki_rom', rom: 'Stue', totalt: 9, aktiv: 0, entiteter: lysIds, aktiv_liste: [], inaktiv_liste: lysIds } },
    'sensor.stue_lys_oversikt': { state: '0', attributes: { integrasjon: 'ki_lys', ki_type: 'oversikt', rom: 'Stue', area_id: 'stue', area_ids: ['stue'], slug: 'stue', lys: lysIds,
      scener: scener.map(([id, navn]) => ({ id, navn, entity: `button.stue_lys_${id}` })) } },
    'sensor.stue_oversikt': { state: '24', attributes: {
      integrasjon: 'ki_rom', rom: 'Stue', area_id: 'stue', ikon: 'mdi:sofa', etasje: '1. etasje', etasje_niva: 1,
      lys: lysIds,
      media: ['media_player.rn602_stue', 'media_player.tv_stue_a75_3'],
      brytere: [
        { entity: 'switch.stikkontakt_spisebord', effekt: null }, { entity: 'switch.stikkontakt_piano', effekt: null },
        { entity: 'switch.stue_server_rack', effekt: 'sensor.stue_server_rack_power' }, { entity: 'switch.stikkontakt_stue_tak', effekt: null },
        { entity: 'switch.stikkontakt_tv', effekt: null },
      ],
      vifter: [], klima: [{ entity: 'climate.stue_oljefyr', effekt: 'sensor.stue_oljefyr_power' }],
      gardiner: ['cover.stue_gardiner'],
      sensorer: [
        { entity: 'binary_sensor.everything_presence_lite_occupancy', klasse: 'occupancy' }, { entity: 'binary_sensor.everything_presence_lite_zone_1_occupancy', klasse: 'occupancy' },
        { entity: 'binary_sensor.stue_g6_turret_motion', klasse: 'motion' }, { entity: 'binary_sensor.verandador', klasse: 'door' },
      ],
      skript: [], scener: [],
      temperatur: ['sensor.stue_meter_pro_temperature'], fuktighet: ['sensor.stue_meter_pro_humidity'],
      lysniva: ['sensor.everything_presence_lite_illuminance'],
      effekt: ['sensor.stue_server_rack_power', 'sensor.stue_oljefyr_power'],
    } },
    'sensor.stue_meter_pro_temperature': { state: '22.8', attributes: { friendly_name: 'Stue Meter Pro Temperatur', unit_of_measurement: '°C', device_class: 'temperature' } },
    'sensor.stue_meter_pro_humidity': { state: '50', attributes: { friendly_name: 'Stue Meter Pro Fuktighet', unit_of_measurement: '%', device_class: 'humidity' } },
    'scene.stue_filmkveld': { state: 'unknown', attributes: { friendly_name: 'Stue filmkveld', icon: 'mdi:movie' } }, 'scene.god_natt': { state: 'unknown', attributes: { friendly_name: 'God natt' } },
    'switch.stikkontakt_spisebord': { state: 'on', attributes: { friendly_name: 'Spisebord' } },
    'switch.stikkontakt_piano': { state: 'on', attributes: { friendly_name: 'Piano' } },
    'switch.stue_server_rack': { state: 'on', attributes: { friendly_name: 'Stue Server rack' } },
    'sensor.stue_server_rack_power': { state: '198', attributes: { friendly_name: 'Server rack effekt', unit_of_measurement: 'W', device_class: 'power' } },
    'switch.stikkontakt_stue_tak': { state: 'off', attributes: { friendly_name: 'Takstikkontakt' } },
    'switch.stikkontakt_tv': { state: 'on', attributes: { friendly_name: 'TV' } },
    'climate.stue_oljefyr': { state: 'heat', attributes: { friendly_name: 'Stue Oljefyr', temperature: 21, current_temperature: 22.8, hvac_action: 'idle', min_temp: 5, max_temp: 35, target_temp_step: 0.5 } },
    'sensor.stue_oljefyr_power': { state: '0', attributes: { friendly_name: 'Oljefyr effekt', unit_of_measurement: 'W', device_class: 'power' } },
    'input_number.stue_oljefyr_teller': { state: '21', attributes: { friendly_name: 'Stue oljefyr teller', min: 5, max: 30, step: 0.5, unit_of_measurement: '°C' } },
    'cover.stue_gardiner': { state: 'open', attributes: { friendly_name: 'Stue Gardiner', current_position: 99 } },
    'media_player.rn602_stue': { state: 'paused', attributes: { friendly_name: 'RN602-stue', volume_level: 0.2, source: 'Spotify' } },
    'media_player.tv_stue_a75_3': { state: 'off', attributes: { friendly_name: 'TV stue A75' } },
    'binary_sensor.everything_presence_lite_occupancy': { state: 'off', attributes: { friendly_name: 'Stue Tilstede', device_class: 'occupancy' } },
    'binary_sensor.everything_presence_lite_zone_1_occupancy': { state: 'off', attributes: { friendly_name: 'Stue Tilstede sone 1', device_class: 'occupancy' } },
    'binary_sensor.stue_g6_turret_motion': { state: 'off', attributes: { friendly_name: 'G6 Turret bevegelse', device_class: 'motion' } },
    'binary_sensor.verandador': { state: 'off', attributes: { friendly_name: 'Verandadør', device_class: 'door' } },
    'sensor.everything_presence_lite_illuminance': { state: '0', attributes: { friendly_name: 'Stue Lysnivå', unit_of_measurement: 'lx', device_class: 'illuminance' } },
  });
  MOCK.add(add);

  // Temperaturhistorikk for stua: designets kurve (25 timepunkter). Andre entiteter: samme standardkurve som mock-hass.js.
  const DESIGN = 'sensor.stue_meter_pro_temperature';
  const dflt = (msg) => {
    const out = {}, st = MOCK.make().states;
    const start = new Date(msg.start_time).getTime(), end = new Date(msg.end_time).getTime();
    for (const id of msg.entity_ids) {
      const s = st[id]; const base = s ? parseFloat(s.state) : 0; const arr = [];
      if (isNaN(base)) { out[id] = [{ s: s ? s.state : 'off', lu: start / 1000 }]; continue; }
      for (let t = start, i = 0; t <= end; t += 900e3, i++) arr.push({ s: (base + Math.sin(i / 8) * base * 0.08 + Math.cos(i / 3) * base * 0.02).toFixed(2), lu: t / 1000 });
      out[id] = arr;
    }
    return out;
  };
  const prev = MOCK._kdHistory || dflt;
  MOCK._kdHistory = (msg) => {
    const out = prev({ ...msg, entity_ids: msg.entity_ids.filter(id => id !== DESIGN) });
    if (msg.entity_ids.includes(DESIGN)) {
      const start = new Date(msg.start_time).getTime(), temp = 22.8;
      out[DESIGN] = Array.from({ length: 25 }, (_, i) => ({ s: (temp - 1.4 + Math.sin((i + 3) / 24 * Math.PI * 2) * 1.1 + Math.sin(i * 1.7) * 0.2).toFixed(4), lu: (start + i * 3600e3) / 1000 }));
    }
    return out;
  };
  MOCK.ws('history/history_during_period', MOCK._kdHistory);
})();
