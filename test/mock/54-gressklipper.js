// Mock for kd-gressklipper-card – Husqvarna Automower-aktig klipper («Robbie») som klipper bakhagen.
(() => {
  const B = 'robbie';
  const next = new Date(); next.setDate(next.getDate() + 1); next.setHours(9, 0, 0, 0);
  const hr = (v) => ({ state: String(v), attributes: { unit_of_measurement: 'h', device_class: 'duration' } });
  // enkelt hagekart (SVG som data-URI) så kartfanen har et bilde å vise
  const MAP = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#1c1c1f"/>
<path d="M30 30h220v120H30z" fill="#2f5a3a" stroke="#7fd6a0" stroke-width="3"/><path d="M30 170h340v100H30z" fill="#35643f" stroke="#7fd6a0" stroke-width="3"/>
<path d="M270 30h100v120H270z" fill="#4a4a50"/><text x="320" y="95" font-family="sans-serif" font-size="16" fill="#a9a7a2" text-anchor="middle">Hus</text>
<path d="M50 190h300M50 210h300M50 230h300M50 250h300" stroke="rgba(255,255,255,0.08)" stroke-width="10"/>
<path d="M60 190 L140 205 L120 240 L220 225" fill="none" stroke="#f2f1ee" stroke-width="2" stroke-dasharray="4 4"/>
<circle cx="220" cy="225" r="8" fill="#f2f1ee"/><circle cx="220" cy="225" r="14" fill="none" stroke="#7fd6a0" stroke-width="3"/>
<rect x="36" y="252" width="16" height="10" rx="3" fill="#8e8d89"/></svg>`);
  MOCK.add({
    [`lawn_mower.${B}`]: { state: 'mowing', attributes: { friendly_name: 'Robbie', supported_features: 7 } },
    [`sensor.${B}_battery`]: { state: '76', attributes: { unit_of_measurement: '%', device_class: 'battery', friendly_name: 'Robbie Battery' } },
    [`binary_sensor.${B}_charging`]: 'off',
    [`sensor.${B}_mode`]: { state: 'main_area', attributes: { friendly_name: 'Robbie Mode', options: ['main_area', 'secondary_area', 'home', 'demo'] } },
    [`sensor.${B}_work_area`]: { state: 'Bakhage', attributes: { friendly_name: 'Robbie Work area', options: ['Forhage', 'Bakhage', 'Langs huset'] } },
    [`sensor.${B}_restricted_reason`]: { state: 'none', attributes: { friendly_name: 'Robbie Restricted reason' } },
    [`sensor.${B}_error`]: { state: 'no_error', attributes: { friendly_name: 'Robbie Error' } },
    [`sensor.${B}_next_start`]: { state: next.toISOString(), attributes: { device_class: 'timestamp', friendly_name: 'Robbie Next start' } },
    [`sensor.${B}_cutting_blade_usage_time`]: { ...hr(38.4), attributes: { unit_of_measurement: 'h', friendly_name: 'Robbie Cutting blade usage time' } },
    [`sensor.${B}_total_cutting_time`]: hr(812),
    [`sensor.${B}_total_running_time`]: hr(955),
    [`sensor.${B}_total_charging_time`]: hr(214),
    [`sensor.${B}_total_searching_time`]: hr(64),
    [`sensor.${B}_number_of_charging_cycles`]: '1342',
    [`sensor.${B}_number_of_collisions`]: '5210',
    [`sensor.${B}_total_drive_distance`]: { state: '6120', attributes: { unit_of_measurement: 'km' } },
    [`number.${B}_cutting_height`]: { state: '5', attributes: { friendly_name: 'Robbie Cutting height', min: 1, max: 9, step: 1 } },
    [`number.${B}_forhage_cutting_height`]: { state: '60', attributes: { friendly_name: 'Robbie Forhage cutting height', min: 0, max: 100, step: 5, unit_of_measurement: '%' } },
    [`number.${B}_bakhage_cutting_height`]: { state: '50', attributes: { friendly_name: 'Robbie Bakhage cutting height', min: 0, max: 100, step: 5, unit_of_measurement: '%' } },
    [`number.${B}_langs_huset_cutting_height`]: { state: '40', attributes: { friendly_name: 'Robbie Langs huset cutting height', min: 0, max: 100, step: 5, unit_of_measurement: '%' } },
    [`switch.${B}_forhage`]: { state: 'on', attributes: { friendly_name: 'Robbie Forhage' } },
    [`switch.${B}_bakhage`]: { state: 'on', attributes: { friendly_name: 'Robbie Bakhage' } },
    [`switch.${B}_langs_huset`]: { state: 'off', attributes: { friendly_name: 'Robbie Langs huset' } },
    [`switch.${B}_avoid_blomsterbed`]: { state: 'on', attributes: { friendly_name: 'Robbie Avoid Blomsterbed' } },
    [`switch.${B}_enable_schedule`]: { state: 'on', attributes: { friendly_name: 'Robbie Enable schedule' } },
    [`select.${B}_headlight_mode`]: { state: 'evening_only', attributes: { friendly_name: 'Robbie Headlight mode', options: ['always_on', 'always_off', 'evening_only', 'evening_and_night'] } },
    [`button.${B}_confirm_error`]: { state: 'unknown', attributes: { friendly_name: 'Robbie Confirm error' } },
    [`device_tracker.${B}`]: { state: 'home', attributes: { friendly_name: 'Robbie', latitude: 59.91873, longitude: 10.75281, gps_accuracy: 3, source_type: 'gps' } },
    [`image.${B}_hagekart`]: { state: 'idle', attributes: { friendly_name: 'Robbie Hagekart', entity_picture: MAP } },
  });
})();
