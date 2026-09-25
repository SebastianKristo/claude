// Mock for kd-stovsuger-card – gjenskaper designets eksempelverdier (Støvsuger.dc.html).
(() => {
  const y = new Date(); y.setDate(y.getDate() - 1); y.setHours(14, 20, 0, 0);
  const B = 'sir_sweeps_a_lot';
  // enkelt Roborock-aktig kart (SVG som data-URI) så kartfanen har noe å vise
  const MAP = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#1c1c1f"/>
<g stroke="#8fb5d9" stroke-width="3" stroke-linejoin="round">
<path d="M40 30h150v110H40z" fill="#3b5a7a"/><path d="M200 30h160v80H200z" fill="#5a4a7a"/><path d="M200 120h160v70H200z" fill="#3f6b58"/>
<path d="M40 150h150v110H40z" fill="#7a5a3b"/><path d="M200 200h160v60H200z" fill="#6b3f52"/></g>
<path d="M60 60h110M60 80h110M60 100h110M220 50h120M220 70h120M220 90h120M60 175h110M60 195h110M60 215h110" stroke="rgba(255,255,255,0.12)" stroke-width="10"/>
<circle cx="80" cy="235" r="9" fill="#f2f1ee"/><circle cx="80" cy="235" r="15" fill="none" stroke="#7fd6a0" stroke-width="3"/></svg>`);
  MOCK.add({
    [`vacuum.${B}`]: { state: 'docked', attributes: { friendly_name: 'Sir Sweeps a lot', battery_level: 100, fan_speed: 'balanced', fan_speed_list: ['off', 'quiet', 'balanced', 'turbo', 'max', 'custom', 'max_plus'] } },
    [`sensor.${B}_battery`]: { state: '100', attributes: { unit_of_measurement: '%' } },
    [`binary_sensor.${B}_charging`]: 'off',
    [`binary_sensor.${B}_water_shortage`]: 'off',
    [`binary_sensor.${B}_water_box_attached`]: 'on',
    [`input_boolean.${B}_sebsatian_soverom`]: 'off',
    [`input_boolean.${B}_mamma_soverom`]: 'off',
    [`input_boolean.${B}_pappa_kontor`]: 'off',
    [`input_boolean.${B}_pappa_soverom`]: 'off',
    [`input_boolean.${B}_trappegang`]: 'off',
    'script.start_sir_sweeps_a_lot_room_select': 'off',
    'script.stovsuger_start': 'off',
    'script.stovsuger_pause': 'off',
    'script.stovsuger_retuner_hjem': 'off',
    'script.rolf_empty': 'off',
    'script.rolf_zone_stuebord': 'off',
    'script.rolf_zone_stuebord_mye': 'off',
    'script.rolf_zone_stue_uten_spisebord': 'off',
    'script.rolf_zone_teppe': 'off',
    'script.rolf_zone_kjokkenbord': 'off',
    [`sensor.${B}_last_clean_end`]: { state: y.toISOString(), attributes: { device_class: 'timestamp' } },
    [`sensor.${B}_cleaning_area`]: { state: '42', attributes: { unit_of_measurement: 'm²' } },
    [`sensor.${B}_cleaning_time`]: { state: '38', attributes: { unit_of_measurement: 'min' } },
    [`sensor.${B}_total_cleaning_area`]: { state: '8420', attributes: { unit_of_measurement: 'm²' } },
    [`sensor.${B}_total_cleaning_time`]: { state: '312', attributes: { unit_of_measurement: 'h' } },
    [`sensor.${B}_total_cleaning_count`]: '214',
    [`sensor.${B}_main_brush_time_left`]: { state: '216', attributes: { unit_of_measurement: 'h' } },
    [`sensor.${B}_side_brush_time_left`]: { state: '82', attributes: { unit_of_measurement: 'h' } },
    [`sensor.${B}_filter_time_left`]: { state: '18', attributes: { unit_of_measurement: 'h' } },
    [`sensor.${B}_sensor_time_left`]: { state: '26.4', attributes: { unit_of_measurement: 'h' } },
    [`button.${B}_reset_main_brush_consumable`]: 'unknown',
    [`button.${B}_reset_side_brush_consumable`]: 'unknown',
    [`button.${B}_reset_air_filter_consumable`]: 'unknown',
    [`button.${B}_reset_sensor_consumable`]: 'unknown',
    [`select.${B}_mop_intensity`]: { state: 'off', attributes: { options: ['off', 'mild', 'moderate', 'intense'] } },
    [`switch.${B}_do_not_disturb`]: 'on',
    [`time.${B}_do_not_disturb_begin`]: '22:00:00',
    [`time.${B}_do_not_disturb_end`]: '08:00:00',
    [`image.${B}_hjemme_andre_etasje`]: { state: 'idle', attributes: { friendly_name: 'Sir Sweeps a lot Andre etasje', entity_picture: MAP } },
    [`sensor.${B}_current_room`]: 'Soverom',
  });
})();
