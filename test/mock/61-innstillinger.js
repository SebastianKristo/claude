// Mock for kd-innstillinger-card – gjenskaper eksempelverdiene i «Innstillinger v2».
(() => {
  // KI Nattmodus: av, starter automatisk kl. 23:00 (switch.nattmodus finnes også i søvn-mocken – vi legger på attributtene)
  const E = {
    'switch.nattmodus': { state: 'off', attributes: { friendly_name: 'Nattmodus', tid_pa: '23:00', tid_av: '07:00' } },
    // KI Energi: Effektvakt (av). Borte-modus (switch.ki_helg_auto) kommer fra klima-mocken.
    'switch.ki_dynamisk_grense': { state: 'off', attributes: { friendly_name: 'KI Dynamisk Grense' } },
  };
  // KI Varslinger og sikkerhet: [entity, enhet, navn, på]
  const N = [
    ['switch.ansiktsgjenkjenning_aktivert', 'Ansiktsgjenkjenning', 'Ansiktsgjenkjenning Aktivert', 'on'],
    ['switch.egne_varsler_ringeklokke', 'Ringeklokke', 'Ringeklokke', 'on'],
    ['switch.egne_varsler_bevegelse_ute', 'Bevegelse ute', 'Bevegelse ute - Kun når alarmen er armert', 'on'],
    ['switch.egne_varsler_vaskemaskin_ferdig', 'Vaskemaskin ferdig', 'Vaskemaskin ferdig', 'on'],
    ['switch.egne_varsler_hoy_strompris', 'Høy strømpris', 'Høy strømpris - Når prisen går over 2 kr/kWh', 'off'],
    ['switch.egne_varsler_soppeltomming', 'Søppeltømming', 'Søppeltømming', 'on'],
  ];
  const REG = {}, DEV = {};
  N.forEach(([id, dev, fn, st]) => { E[id] = { state: st, attributes: { friendly_name: fn } }; const d = 'kin-' + dev; DEV[d] = { id: d, name: dev }; REG[id] = { entity_id: id, platform: 'ki_notifications', device_id: d }; });
  // entiteter som andre mock-filer allerede har overskrives ikke (unntatt nattmodus, som er vår)
  const cur = MOCK.make().states;
  for (const k of Object.keys(E)) if (cur[k] && k !== 'switch.nattmodus') delete E[k];
  MOCK.add(E);
  const prev = MOCK.make;
  MOCK.make = function () { const h = prev.apply(this, arguments); h.entities = Object.assign({}, h.entities || {}, REG); h.devices = Object.assign({}, h.devices || {}, DEV); return h; };
})();
