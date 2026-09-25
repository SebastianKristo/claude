// Mock for kd-gjoremal-card – gjenskaper eksempelverdiene i «Gjøremål».
// todo.gjoremal har de samme fire som 00-felles (Hjem viser «2 ferdige»); designets «Store oppgaver» ligger derfor
// i todo.personlig_seb her. Sammenlign med --cfg lister: [personlig_seb → «Store oppgaver», gjoremal → «Personlig»].
(() => {
  const P = { h: 'Høy', m: 'Medium', l: 'Lav' };
  const L = {
    'todo.personlig_seb': [[1, 'Ki-energi: legg til expand under menyer for servere, panelovner og gulvvarme', 'm', false, 'Sebastian'], [2, 'VVB må ordnes, står bare på i 50 min', 'h', false, 'Rune'], [3, 'Legg til innstillinger for autolås', 'm', false, 'Sebastian'], [4, 'Få lagt til qBittorrent-nedlasting i Framover', 'l', false, 'Sebastian']],
    'todo.gjoremal': [[5, 'Bytt filter i ventilasjon', 'm', false, 'Rune'], [6, 'Vann plantene', 'l', true, 'Cybele'], [7, 'Skift batteri i dørlås', 'h', false, 'Sebastian'], [8, 'Tøm oppvaskmaskin', 'l', true, 'Cybele']],
  };
  const items = {};
  for (const [id, l] of Object.entries(L)) items[id] = l.map(([uid, summary, p, done, who]) => ({ uid: String(uid), summary, status: done ? 'completed' : 'needs_action', description: `Prioritet: ${P[p]}\nAv: ${who}` }));
  MOCK.add({
    'todo.gjoremal': { state: '2', attributes: { friendly_name: 'Gjøremål', supported_features: 127 } },
    'todo.personlig_seb': { state: '4', attributes: { friendly_name: 'Personlig Seb', supported_features: 127 } },
  });
  MOCK.ws('todo/item/list', (msg) => ({ items: (items[msg.entity_id] || []).map(x => ({ ...x })) }));
})();
