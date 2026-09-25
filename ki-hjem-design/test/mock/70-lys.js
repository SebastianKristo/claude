// Mock for kd-lys-card («Lys v2»): utelys (ki_utelys), sol, og lys per rom (ki_rom) med designets eksempelverdier.
(() => {
  const at = (dayOffset, hh, mm) => { const d = new Date(); d.setDate(d.getDate() + dayOffset); d.setHours(hh, mm, 0, 0); return d.toISOString(); };
  const L = (name, on, pct) => ({ state: on ? 'on' : 'off', attributes: { friendly_name: name, supported_color_modes: ['brightness'], color_mode: on ? 'brightness' : null, brightness: on ? Math.round(pct / 100 * 255) : null } });
  const counter = (ids) => ({ state: '0', attributes: { integrasjon: 'ki_rom', entiteter: ids, totalt: ids.length } });

  // Utelys (ki_utelys)
  MOCK.add({
    'light.ute_lys': { state: 'on', attributes: { friendly_name: 'Ute lys', entity_id: ['light.verandalamp', 'light.utelys_inngang'], supported_color_modes: ['onoff'] } },
    'light.verandalamp': { state: 'on', attributes: { friendly_name: 'Verandalamp', supported_color_modes: ['onoff'] } },
    'light.utelys_inngang': { state: 'on', attributes: { friendly_name: 'Utelys Inngang', supported_color_modes: ['onoff'] } },
    'sensor.ki_utelys_neste_paa': { state: at(0, 19, 34), attributes: { friendly_name: 'KI Utelys neste på', device_class: 'timestamp' } },
    'sensor.ki_utelys_neste_av': { state: at(1, 6, 56), attributes: { friendly_name: 'KI Utelys neste av', device_class: 'timestamp' } },
    'sensor.ki_utelys_status': { state: 'På', attributes: { friendly_name: 'KI Utelys status' } },
    'switch.ki_utelys_auto': { state: 'on', attributes: { friendly_name: 'KI Utelys automatikk' } },
    'switch.ki_utelys_kveld': { state: 'on', attributes: { friendly_name: 'KI Utelys kveld' } },
    'switch.ki_utelys_morgen': { state: 'on', attributes: { friendly_name: 'KI Utelys morgen' } },
    'number.ki_utelys_terskel_paa': { state: '40', attributes: { friendly_name: 'KI Utelys terskel på', unit_of_measurement: 'lx' } },
    'number.ki_utelys_terskel_av': { state: '120', attributes: { friendly_name: 'KI Utelys terskel av', unit_of_measurement: 'lx' } },
    'number.ki_utelys_minst_morke': { state: '15', attributes: { friendly_name: 'KI Utelys minst mørke', unit_of_measurement: 'min' } },
  });
  // Sola: bare hvis ingen andre mock-er har lagt inn sun.sun
  const cur = MOCK.make().states['sun.sun'];
  const sunAttrs = { next_rising: at(1, 7, 11), next_setting: at(0, 19, 4), next_dusk: at(0, 19, 41), next_dawn: at(1, 6, 34), elevation: -8, azimuth: 290 };
  if (!cur) MOCK.add({ 'sun.sun': { state: 'below_horizon', attributes: { friendly_name: 'Sun', ...sunAttrs } } });
  else MOCK.add({ 'sun.sun': { state: cur.state, attributes: { ...sunAttrs, ...cur.attributes } } });

  // Rom (første etg: stue ligger i 71-rom.js). Designets eksempel: Benk 80 %, Gang tak 20 %
  MOCK.add({
    'light.kjokken_tak': L('Kjøkken tak', false), 'light.kjokken_benk': L('Kjøkken benk', true, 80), 'light.kjokken_vindu': L('Kjøkken vindu', false),
    'sensor.kjokken_lys': counter(['light.kjokken_benk', 'light.kjokken_tak', 'light.kjokken_vindu']),
    'light.inngang_tak': L('Inngang tak', true, 20), 'light.inngang_speil': L('Inngang speil', false),
    'sensor.inngang_lys': counter(['light.inngang_speil', 'light.inngang_tak']),
    'light.do_tak': L('Do tak', false), 'light.do_speil': L('Do speil', false),
    'sensor.do_lys': counter(['light.do_speil', 'light.do_tak']),
    'light.soverom_tak': L('Soverom tak', false), 'light.soverom_nattbord_venstre': L('Soverom nattbord venstre', false), 'light.soverom_nattbord_hoyre': L('Soverom nattbord høyre', false),
    'sensor.soverom_lys': counter(['light.soverom_nattbord_hoyre', 'light.soverom_nattbord_venstre', 'light.soverom_tak']),
    'light.pult_tak': L('Pult tak', false), 'light.pult_led_list': L('Pult LED-list', true, 30),
    'sensor.pult_lys': counter(['light.pult_led_list', 'light.pult_tak']),
    'light.cybele_tak': L('Cybele tak', false), 'light.cybele_leselampe': L('Cybele leselampe', false),
    'sensor.cybele_soverom_lys': counter(['light.cybele_leselampe', 'light.cybele_tak']),
  });

  // light.turn_on med brightness_pct oppdaterer lysstyrken i mocken (felles mock kan bare på/av)
  const mk = MOCK.make;
  MOCK.make = function () {
    const h = mk.apply(MOCK, arguments), cs = h.callService;
    h.callService = function (domain, service, data, target) {
      const r = cs.apply(this, arguments);
      const id = data && data.entity_id;
      if (domain === 'light' && service === 'turn_on' && typeof id === 'string' && data.brightness_pct != null) MOCK.set(id, 'on', { brightness: Math.round(data.brightness_pct / 100 * 255) });
      return r;
    };
    return h;
  };
})();
