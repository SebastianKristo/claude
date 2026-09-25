/*
 * kd-gjoremal-card – pikselkopi av Claude Design «Gjøremål».
 *
 *   type: custom:kd-gjoremal-card        # virker uten mer
 *   lister:                              # standard: disse to (om de finnes) + alle andre todo.* som finnes
 *     - { entity: todo.gjoremal, navn: Store oppgaver }
 *     - { entity: todo.personlig_seb, navn: Personlig }
 *   auto: true                           # ta med andre todo.*-lister automatisk
 *   ekskluder: []                        # todo.* som ikke skal vises
 *
 * Prioritet og hvem leses fra beskrivelsen («Prioritet: Høy», «Av: Rune»). Nye oppgaver får det samme
 * i beskrivelsen når lista støtter beskrivelser. Avhuking = todo.update_item, sletting = todo.remove_item,
 * ny = todo.add_item; lista hentes på nytt etter hver endring.
 */
(() => {
  const KD = window.KD; if (!KD) return;
  const PR = { h: ['Høy', 'oklch(0.72 0.15 25)'], m: ['Medium', 'oklch(0.8 0.12 70)'], l: ['Lav', 'oklch(0.8 0.12 250)'] };
  const a = (c, o) => c.replace(')', ` / ${o})`);
  const PINK = 'linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20))';
  const GREEN = 'oklch(0.8 0.12 150)';
  const e = KD.e, S = KD.S;
  const prioOf = (t) => { const m = String(t || '').match(/prio(?:ritet)?\s*[:=]\s*(høy|hoy|high|h|medium|middels|normal|m|lav|low|l)\b/i); if (!m) return null; const v = m[1].toLowerCase(); return /^(høy|hoy|high|h)$/.test(v) ? 'h' : /^(lav|low|l)$/.test(v) ? 'l' : 'm'; };
  const whoOf = (t) => { const m = String(t || '').match(/(?:^|\n)\s*(?:av|hvem|ansvarlig|who)\s*[:=]\s*([^\n,;]+)/i); return m ? m[1].trim() : ''; };
  const dueTxt = (d) => { if (!d) return ''; const x = new Date(String(d).length === 10 ? d + 'T00:00' : d); if (isNaN(x)) return ''; const t = new Date(); t.setHours(0, 0, 0, 0); const n = Math.round((new Date(x).setHours(0, 0, 0, 0) - t) / 864e5); return n === 0 ? 'frist i dag' : n === 1 ? 'frist i morgen' : n < 0 ? `forfalt ${x.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}` : `frist ${x.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}`; };

  class KDGjoremalCard extends KD.KDSheet {
    static head = ['checklist', 'Gjøremål', 'Store og personlige'];
    static defaults = { lister: [{ entity: 'todo.gjoremal', navn: 'Store oppgaver' }, { entity: 'todo.personlig_seb', navn: 'Personlig' }], auto: true, ekskluder: [] };
    constructor() { super(); this.state = { tab: null, filter: 'open', draft: '', prio: 'm' }; this._ovr = {}; }

    _lists() {
      const c = this.config, ex = new Set(c.ekskluder || []);
      const out = [];
      for (const l of (Array.isArray(c.lister) ? c.lister : [])) { const id = typeof l === 'string' ? l : l && l.entity; if (id && this.st(id) && !ex.has(id)) out.push({ id, navn: (l && l.navn) || this.fname(id) }); }
      if (c.auto !== false) for (const id of this.find(/^todo\./)) if (!ex.has(id) && !out.some(x => x.id === id)) out.push({ id, navn: this.fname(id) });
      return out;
    }
    _items(id) {
      const st = this.st(id); if (!st) return [];
      const raw = this.cached(`kd-todo-${id}|${st.state}|${st.last_updated}`, 5 * 60e3, () => this.todos(id), null);
      if (!raw) return this._last && this._last[id] ? this._last[id] : [];
      this._last = this._last || {};
      if (this._last[id] !== raw) { // ferske data: glem lokale (optimistiske) endringer for lista
        if (this._last[id]) for (const k of Object.keys(this._ovr)) if (k.startsWith(id + '|')) delete this._ovr[k];
        this._last[id] = raw;
      }
      return raw;
    }
    _norm(id, list) {
      return list.map(it => {
        const o = this._ovr[`${id}|${it.uid}`];
        if (o === 'deleted') return null;
        const status = o || it.status;
        return { uid: it.uid, list: id, text: it.summary || '', prio: prioOf(it.description) || prioOf(it.summary), who: whoOf(it.description), due: it.due, done: status === 'completed' };
      }).filter(Boolean);
    }
    _refresh(id) { setTimeout(() => { this.invalidate(`kd-todo-${id}|`); this._queue(); }, 400); }

    /* hendelser */
    goTab(ev, k) { this.setState({ tab: k }); }
    goFilter(ev, k) { this.setState({ filter: k }); }
    cyclePrio() { this.setState({ prio: { l: 'm', m: 'h', h: 'l' }[this.state.prio] }); }
    setDraft(ev) { this.state.draft = ev.target.value; }
    draftKey(ev) { if (ev.key === 'Enter') { ev.preventDefault(); this.add(); } }
    add(ev) {
      if (ev && ev.preventDefault) ev.preventDefault();
      const inp = this.$('input[data-kd-draft]'); const t = String((inp && inp.value) || this.state.draft || '').trim();
      const id = this._cur; if (!t || !id) return;
      const feat = Number(this.at(id, 'supported_features', 0)) || 0;
      const data = { entity_id: id, item: t };
      if (feat & 64) { const who = (this._hass.user && this._hass.user.name) || ''; data.description = `Prioritet: ${PR[this.state.prio][0]}${who ? `\nAv: ${who}` : ''}`; }
      this.call('todo', 'add_item', data).then(() => this._refresh(id));
      if (inp) inp.value = '';
      this.setState({ draft: '', filter: 'open' });
    }
    toggleItem(ev, key) {
      const [id, uid] = key.split('|'); const it = (this._shown || []).find(x => x.uid === uid && x.list === id); if (!it) return;
      const status = it.done ? 'needs_action' : 'completed';
      this._ovr[key] = status; this._queue();
      this.call('todo', 'update_item', { entity_id: id, item: uid, status }).then(() => this._refresh(id));
    }
    removeItem(ev, key) {
      const [id, uid] = key.split('|');
      this._ovr[key] = 'deleted'; this._queue();
      this.call('todo', 'remove_item', { entity_id: id, item: uid }).then(() => this._refresh(id));
    }

    body() {
      const s = this.state;
      const lists = this._lists();
      const cur = lists.some(l => l.id === s.tab) ? s.tab : lists.length ? lists[0].id : null;
      this._cur = cur;
      const data = {}; for (const l of lists) data[l.id] = this._norm(l.id, this._items(l.id));
      const inList = cur ? data[cur] : [];
      const done = inList.filter(x => x.done).length;
      const order = { h: 0, m: 1, l: 2 };
      const shown = inList.filter(x => s.filter === 'all' || (s.filter === 'open' ? !x.done : s.filter === 'done' ? x.done : x.prio === 'h' && !x.done)).sort((p, q) => (p.done - q.done) || ((order[p.prio] ?? 1.5) - (order[q.prio] ?? 1.5)));
      this._shown = shown;
      const tag = (p, full) => p ? ({ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 8, background: a(PR[p][1], full ? 0.9 : 0.18), color: full ? '#141416' : PR[p][1], whiteSpace: 'nowrap' }) : { display: 'none' };
      const headline = inList.length - done ? `${inList.length - done} gjenstår` : 'Alt er gjort';
      const subline = `${inList.length} oppgaver · ${done} fullført`;
      const progress = { width: `${inList.length ? done / inList.length * 100 : 0}%`, height: '100%', borderRadius: 3, background: GREEN, transition: 'width .4s' };
      const tabs = lists.map(l => { const act = cur === l.id, n = data[l.id].filter(x => !x.done).length; return { k: l.id, label: l.navn, count: n,
        style: { height: 40, borderRadius: 20, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 500, background: act ? PINK : '#1c1c1f', color: act ? '#2a1720' : '#a9a7a2' },
        countStyle: { minWidth: 20, height: 20, borderRadius: 10, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600, background: act ? 'rgba(42,23,32,0.14)' : '#2a2a2d' } }; });
      const draftPrio = { label: PR[s.prio][0], style: { ...tag(s.prio), height: 32, padding: '0 12px', borderRadius: 16, fontSize: 12 } };
      const filters = [['open', 'Åpne'], ['high', 'Høy'], ['done', 'Fullført'], ['all', 'Alle']].map(([k, label]) => ({ k, label, style: { height: 32, padding: '0 13px', borderRadius: 16, fontSize: 12, fontWeight: 500, background: s.filter === k ? '#f4f3ef' : '#1c1c1f', color: s.filter === k ? '#1a1a1c' : '#c9c7c2' } }));
      const items = shown.map((x, i) => ({ key: `${x.list}|${x.uid}`, text: x.text, prioLabel: x.prio ? PR[x.prio][0] : '', prio: tag(x.prio),
        meta: x.done ? ['Fullført', x.who].filter(Boolean).join(' · ') : [x.who, dueTxt(x.due)].filter(Boolean).join(' · '),
        row: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 4px', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none', opacity: x.done ? 0.55 : 1, transition: 'opacity .2s' },
        box: { width: 26, height: 26, borderRadius: 9, flex: 'none', marginTop: 1, display: 'grid', placeItems: 'center', background: x.done ? GREEN : 'transparent', boxShadow: x.done ? 'none' : 'inset 0 0 0 1.5px #5d5c5a', transition: 'background .2s' },
        check: { fontSize: 18, color: '#141416', opacity: x.done ? 1 : 0, fontVariationSettings: "'wght' 600" },
        textStyle: { fontSize: 14, lineHeight: 1.4, textWrap: 'pretty', textDecoration: x.done ? 'line-through' : 'none' } }));
      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:20px">
  <header style="display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:13px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89">Gjøremål</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <section style="display:flex;flex-direction:column;gap:6px;padding:0 4px">
    <div style="font-size:24px;font-weight:500;letter-spacing:-0.015em"><span>${e(headline)}</span></div>
    <div style="font-size:14px;color:#8e8d89"><span>${e(subline)}</span></div>
    <div style="height:6px;border-radius:3px;background:#1f1f22;overflow:hidden;margin-top:8px"><div style="${S(progress)}"></div></div>
  </section>

  ${tabs.length <= 3 && tabs.every(t => String(t.label).length <= (tabs.length > 2 ? 11 : 17)) ? KD.segHTML('lister', tabs.map(t => [t.k, t.count ? `${t.label} · ${t.count}` : t.label]), cur, 'goTab', { pink: true, h: 40 })
    : `<div data-key="tabs-rull" style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 calc(-1 * var(--kd-kant,10px));padding:0 var(--kd-kant,10px)">
    ${tabs.map(t => `<button data-key="tab-${e(t.k)}" data-on-click="goTab" data-arg="${e(t.k)}" style="${S({ ...t.style, flex: 'none', maxWidth: 200, padding: '0 8px 0 16px', whiteSpace: 'nowrap' })}"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis">${e(t.label)}</span><span style="${S({ ...t.countStyle, flex: 'none' })}"><span>${e(t.count)}</span></span></button>`).join('')}
  </div>`}

  <form style="display:flex;align-items:center;gap:10px;height:52px;padding:0 8px 0 16px;border-radius:26px;background:#1c1c1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.05)">
    <span class="ms" style="font-size:20px;color:#6d6c69">add</span>
    <input data-kd-draft="1" data-on-input="setDraft" data-on-keydown="draftKey" value="${e(s.draft)}" placeholder="Ny oppgave" enterkeyhint="done" style="flex:1;min-width:0;height:100%;font-size:14px">
    <button type="button" data-on-click="cyclePrio" style="${S(draftPrio.style)}"><span>${e(draftPrio.label)}</span></button>
  </form>

  <div style="display:flex;gap:6px">
    ${filters.map(f => `<button data-on-click="goFilter" data-arg="${f.k}" style="${S(f.style)}"><span>${e(f.label)}</span></button>`).join('')}
  </div>

  <section style="display:flex;flex-direction:column">
    ${items.map(i => `<div data-key="${e(i.key)}" style="${S(i.row)}">
        <button data-on-click="toggleItem" data-arg="${e(i.key)}" style="${S(i.box)}"><span class="ms" style="${S(i.check)}">check</span></button>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
          <span style="${S(i.textStyle)}"><span>${e(i.text)}</span></span>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            <span style="${S(i.prio)}"><span>${e(i.prioLabel)}</span></span>
            <span style="font-size:11px;color:#6d6c69"><span>${e(i.meta)}</span></span>
          </div>
        </div>
        <button data-on-click="removeItem" data-arg="${e(i.key)}" title="Slett" style="width:32px;height:32px;border-radius:16px;display:grid;place-items:center;color:#6d6c69;flex:none"><span class="ms" style="font-size:18px">close</span></button>
      </div>`).join('')}
    ${!shown.length ? `<div style="padding:30px 0;text-align:center;font-size:14px;color:#6d6c69">${lists.length ? 'Ingen oppgaver her' : 'Fant ingen gjøremålslister'}</div>` : ''}
  </section>
</div>`;
    }
    noop() { }
  }
  // Gjøremålskortet har egne input-regler (samme som designet)
  KDGjoremalCard.sheetCss = `input{font:inherit;color:inherit;border:0;background:none;padding:0;cursor:text;outline:none}input::placeholder{color:#6d6c69}`;

  KD.define('kd-gjoremal-card', KDGjoremalCard, 'KD Gjøremål', 'Gjøremålslister med prioritet – pikselkopi av Claude Design «Gjøremål»');
  KD.sheet('todo', 'kd-gjoremal-card');
})();
