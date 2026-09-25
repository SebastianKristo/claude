// Mock for kd-innstillinger-card – gjenskaper eksempelverdiene i «Innstillinger».
(() => {
  const E = {
    'switch.nattmodus': { state: 'off', attributes: { friendly_name: 'Nattmodus', tid_pa: '23:00', tid_av: '07:00' } },
    'input_boolean.innendors_privace_mode': { state: 'off', attributes: { friendly_name: 'Innendørs privacy mode' } },
    'sensor.soverom_vekking_neste_alarm': { state: '06:30', attributes: { neste_dag: 'i morgen' } },
    'switch.soverom_vekking_aktiv': { state: 'on', attributes: { friendly_name: 'Soverom vekking Aktiv' } },
    'input_boolean.kiosk_mode': { state: 'off', attributes: { friendly_name: 'Kiosk mode' } },
    'switch.ki_utelys_auto': { state: 'on', attributes: { friendly_name: 'KI Utelys automatikk' } },
    // KI Energi
    'switch.ki_vvb_prisstyring': { state: 'on', attributes: { friendly_name: 'KI VVB Prisstyring' } },
    'switch.ki_nattsenk_okonomi': { state: 'on', attributes: { friendly_name: 'KI Økonomisk Nattsenking' } },
    'switch.ki_lading_automatikk': { state: 'on', attributes: { friendly_name: 'KI Lading Automatikk' } },
    'switch.ki_dynamisk_grense': { state: 'off', attributes: { friendly_name: 'KI Dynamisk Grense' } },
    'switch.ki_varsel_effekt': { state: 'off', attributes: { friendly_name: 'KI Varsel Effektgrense' } },
  };
  // KI Varslinger og sikkerhet: [entity, enhet, navn, på]
  const N = [
    ['switch.ansiktsgjenkjenning_aktivert', 'Ansiktsgjenkjenning', 'Ansiktsgjenkjenning Aktivert', 'on'],
    ['switch.autolas_autolas', 'Autolås', 'Autolås Autolås', 'on'],
    ['switch.dor_last_apnet_med_kamerabilde_alle_varsler', 'Dør – låst/åpnet med kamerabilde', 'Dør Alle varsler', 'on'],
    ['switch.dor_last_apnet_med_kamerabilde_dora_lukket', 'Dør – låst/åpnet med kamerabilde', 'Døra lukket', 'off'],
    ['switch.dorlys_blink_ved_apning', 'Dørlys', 'Dørlys – blink ved åpning', 'on'],
    ['switch.dorlas_fastkjort_aktivert', 'Dørlås fastkjørt', 'Dørlås fastkjørt Aktivert', 'on'],
    ['switch.alarm_alle_varsler', 'Alarm', 'Alarm Alle varsler', 'on'],
    ['switch.egne_varsler_vannlekkasje', 'Vannlekkasje', 'Vannlekkasje', 'on'],
    ['switch.egne_varsler_pakke_levert', 'Pakke levert', 'Pakke levert', 'on'],
    ['switch.egne_varsler_soppeltomming', 'Søppeltømming', 'Søppeltømming', 'on'],
    ['switch.familie_alle_varsler', 'Familie', 'Familie Alle varsler', 'off'],
    ['switch.egne_varsler_lavt_batteri', 'Lavt batteri', 'Lavt batteri', 'on'],
  ];
  const REG = {}, DEV = {};
  N.forEach(([id, dev, fn, st], i) => { E[id] = { state: st, attributes: { friendly_name: fn } }; const d = 'kin-' + dev; DEV[d] = { id: d, name: dev }; REG[id] = { entity_id: id, platform: 'ki_notifications', device_id: d }; });
  // entiteter som andre mock-filer allerede har (nattmodus, KI Energi, utelys) overskrives ikke
  const cur = MOCK.make().states;
  for (const k of Object.keys(E)) if (cur[k]) delete E[k];
  MOCK.add(E);
  const prev = MOCK.make;
  MOCK.make = function () { const h = prev.apply(this, arguments); h.entities = Object.assign({}, h.entities || {}, REG); h.devices = Object.assign({}, h.devices || {}, DEV); return h; };
})();
