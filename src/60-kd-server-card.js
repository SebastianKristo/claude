/*
 * kd-server-card – Server-popup (Proxmox · Unraid · UniFi · Nettverk) med oversikt, helsevarsler og styring.
 *
 *   type: custom:kd-server-card        # virker uten mer: alt under er standardverdier
 *   pve_node: sensor.1_node_pve_       # foretrukket Proxmox-node (andre noder finnes selv)
 *   unraid: d_day_darling              # prefiks for Unraid-integrasjonen (uten «sensor.»)
 *   unifi_gateway: ''                  # slug for ruteren; tom = finnes selv (den med *_wan_latency)
 *   speedtest_ned / speedtest_opp / speedtest_ping, qbit_sparefart
 *   pve_ip, unraid_ip, isp, pve_cpu_navn, unraid_cpu_navn, pve_effekt, unraid_effekt, pve_temp
 *   navn_map: { "102": "Plex" }        # penere navn på gjester/containere (vmid eller nøkkel)
 *   blokker: [switch.x]                # UniFi-klienter som kan blokkeres (tom = finnes selv)
 *   faner: [oversikt, pve, unraid, unifi, ha]   # hvilke faner (tom = de som har data). «ha» = Nettverk
 *   grense_cpu: 85, grense_ram: 90, grense_disk: 85, grense_temp: 70, grense_disktemp: 50   # varselgrenser
 *
 * Oppdager selv: Proxmox-noder og -gjester (Proxmox Extended Sensors: sensor.N_node_…, sensor.N_ct_/vm_…_status
 * + knapper, og «Proxmox VE»-integrasjonen (proxmoxve) via entitetsregisteret), lagring (sensor.N_storage_*_usage),
 * Unraid-array/paritet/disker/containere/VM-er/UPS, UniFi-enheter (device_tracker + *_uptime, *_restart, update.*),
 * Wi-Fi-nett, PoE-porter, blokk-brytere og klienter. Faner uten data skjules.
 * Handlinger som stopper noe (slå av, omstart, PoE av, fastvare …) må bekreftes (trykk → bekreft-rad).
 */
(() => {
  const KD = window.KD; if (!KD) return;
  const C = { green: 'oklch(0.8 0.12 150)', blue: 'oklch(0.8 0.12 250)', amber: 'oklch(0.82 0.12 75)', red: 'oklch(0.72 0.15 25)', pink: 'oklch(0.78 0.13 350)' };
  const a = (c, o) => String(c).startsWith('#') ? `color-mix(in srgb, ${c} ${Math.round(o * 100)}%, transparent)` : String(c).replace(')', ` / ${o})`);
  const PINK = 'linear-gradient(135deg, oklch(0.78 0.13 350), oklch(0.9 0.05 20))';
  const nf = (n, d = 0) => (n == null || isNaN(n)) ? '–' : Number(n).toLocaleString('nb-NO', { minimumFractionDigits: d, maximumFractionDigits: d });
  const nf1 = (n) => (n == null || isNaN(n)) ? '–' : Number(n).toLocaleString('nb-NO', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const e = KD.e, S = KD.S;
  const dom = id => id.slice(0, id.indexOf('.'));
  const obj = id => id.slice(id.indexOf('.') + 1);
  const PRETTY = { qbittorrent: 'qBittorrent', qbittorrentvpn: 'qBittorrent', sabnzbd: 'SABnzbd', pihole: 'Pi-hole', adguard: 'AdGuard', zigbee2mqtt: 'Zigbee2MQTT', mqtt: 'MQTT', nzbget: 'NZBGet', unifi: 'UniFi' };
  const title = t => String(t || '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ').map(w => PRETTY[w.toLowerCase()] || w.replace(/^./, c => c.toUpperCase())).join(' ');

  /** Tall bare når hele tilstanden er et tall («6.12.4-pve» er ikke et tall) */
  const num = (s) => { if (!s || KD.BAD.has(s.state)) return null; const r = String(s.state).trim(); if (!/^-?\d+([.,]\d+)?$/.test(r)) return null; return parseFloat(r.replace(',', '.')); };
  /** Sekunder oppe fra tidsstempel eller tall med enhet */
  const upSec = (s) => {
    if (!s || KD.BAD.has(s.state)) return null;
    const r = String(s.state).trim(), at = s.attributes || {};
    if (/^-?\d+(\.\d+)?$/.test(r) && at.device_class !== 'timestamp') {
      const u = String(at.unit_of_measurement || 's'), n = parseFloat(r);
      return /^min/i.test(u) ? n * 60 : /^(h|t)/i.test(u) ? n * 3600 : /^(d|day|dag)/i.test(u) ? n * 86400 : n;
    }
    const d = new Date(r); return isNaN(d) ? null : Math.max(0, (Date.now() - d) / 1000);
  };
  const upLong = (sec) => { if (sec == null) return ''; const d = Math.floor(sec / 86400); if (d >= 1) return `${d} ${d === 1 ? 'dag' : 'dager'}`; const h = Math.floor(sec / 3600); if (h >= 1) return `${h} t`; return `${Math.max(1, Math.floor(sec / 60))} min`; };
  const upShort = (sec) => { if (sec == null) return ''; const d = Math.floor(sec / 86400); if (d >= 1) return `${d} d`; const h = Math.floor(sec / 3600); if (h >= 1) return `${h} t`; return `${Math.max(1, Math.floor(sec / 60))} min`; };
  /** Byte-verdi fra sensor med enhet → «4 GB» / «512 MB» */
  const UNIT = { b: 1, kb: 1e3, kib: 1024, mb: 1e6, mib: 1048576, gb: 1e9, gib: 1073741824, tb: 1e12, tib: 1099511627776 };
  const bytes = (s) => { const v = num(s); if (v == null) return null; const u = String((s.attributes || {}).unit_of_measurement || 'B').toLowerCase().replace(/\s/g, ''); return v * (UNIT[u] || 1); };
  const fmtB = (b) => { if (b == null) return ''; const [f, u] = b >= 1e12 ? [1e12, 'TB'] : b >= 1e9 ? [1e9, 'GB'] : b >= 1e6 ? [1e6, 'MB'] : [1e3, 'kB']; return `${nf1(b / f)} ${u}`; };
  const fmtBs = (b) => { if (b == null) return ''; const [f, u] = b >= 1e12 ? [1e12, 'TB'] : b >= 1e9 ? [1e9, 'GB'] : b >= 1e6 ? [1e6, 'MB'] : [1e3, 'kB']; return [nf1(b / f), u]; };
  const hm = d => { d = new Date(d); return isNaN(d) ? '' : d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }); };
  const agoTxt = (d) => { const s = Math.max(0, Math.round((Date.now() - new Date(d)) / 1000)); if (isNaN(s)) return ''; return s < 60 ? `${s} s siden` : s < 3600 ? `${Math.round(s / 60)} min siden` : s < 86400 ? `${Math.round(s / 3600)} t siden` : `${Math.round(s / 86400)} d siden`; };

  /** Ikon ut fra navnet (Material Symbols) */
  const ICONS = [[/home ?assistant|haos|\bha\b/i, 'home'], [/frigate|kamera|nvr|camera/i, 'videocam'], [/plex|jellyfin|emby/i, 'play_circle'], [/sonarr/i, 'tv'], [/radarr|arr|prowlarr|bazarr|readarr|seerr|overseerr/i, 'movie'],
    [/zigbee|z2m|mqtt|zwave|matter/i, 'hub'], [/nextcloud|cloud/i, 'cloud'], [/vault|bitwarden|pass/i, 'key'], [/pi-?hole|adguard|dns/i, 'shield'], [/qbit|torrent|download|sabnzbd|nzb/i, 'download'],
    [/immich|photo|foto/i, 'photo_library'], [/dispatch|iptv|tvh/i, 'live_tv'], [/docker|portainer|dockge/i, 'deployed_code'], [/unifi/i, 'router'], [/postgres|mysql|maria|influx|db\b|redis/i, 'database'],
    [/grafana|monitor|uptime|kuma/i, 'monitoring'], [/nginx|proxy|traefik|caddy|tunnel/i, 'lan'], [/windows|win\d/i, 'desktop_windows'], [/ubuntu|debian|linux|alpine/i, 'terminal'], [/flaresolverr|solver/i, 'bolt']];
  const iconFor = (name, def) => { for (const [re, ic] of ICONS) if (re.test(name)) return ic; return def; };
  /** Handlingstyper for Proxmox-knapper: [tekst, ikon, farge, må bekreftes] */
  const ACT = {
    start: ['Start', 'play_arrow', C.green, false], resume: ['Fortsett', 'play_arrow', C.green, false],
    shutdown: ['Slå av', 'power_settings_new', C.amber, true], reboot: ['Omstart', 'restart_alt', C.blue, true],
    suspend: ['Pause', 'pause', C.amber, true], hibernate: ['Dvale', 'bedtime', C.amber, true],
    stop: ['Tving stopp', 'stop_circle', C.red, true], reset: ['Tilbakestill', 'device_reset', C.red, true],
    start_all: ['Start alle', 'play_circle', C.green, true], stop_all: ['Stopp alle', 'stop_circle', C.red, true],
  };
  const actOf = (rest) => {
    const r = String(rest || '');
    if (/^start_?all/.test(r)) return 'start_all'; if (/^(stop|shutdown)_?all/.test(r)) return 'stop_all';
    const m = r.match(/^(start|shutdown|stop|reboot|restart|suspend|pause|resume|hibernate|reset)/); if (!m) return null;
    return { restart: 'reboot', pause: 'suspend' }[m[1]] || m[1];
  };
  const prefixOf = (list) => { if (!list.length) return ''; let p = list.reduce((x, y) => { let i = 0; while (i < x.length && x[i] === y[i]) i++; return x.slice(0, i); }, list[0]); return p.slice(0, p.lastIndexOf('_') + 1); };
  /** Størrelse fra attributt («4.0 TB», 4000000000) → byte */
  const sizeAttr = (v) => { if (v == null || v === '') return null; if (typeof v === 'number') return v; const m = String(v).match(/(-?\d+(?:[.,]\d+)?)\s*([kmgt]i?b)?/i); if (!m) return null; return parseFloat(m[1].replace(',', '.')) * (UNIT[(m[2] || 'b').toLowerCase()] || 1); };
  const pctCol = (p, warn = 85, bad = 95, def = C.blue) => p == null ? def : p >= bad ? C.red : p >= warn ? C.amber : def;
  const tempCol = (t, warn, bad) => t == null ? '#8e8d89' : t >= bad ? C.red : t >= warn ? C.amber : C.green;
  const LVL = [C.blue, C.amber, C.red];

  class KDServerCard extends KD.KDSheet {
    static head = ['dns', 'Server', 'Proxmox · Unraid · UniFi'];
    static defaults = {
      pve_node: 'sensor.1_node_pve_', pve_temp: '', pve_effekt: 'sensor.server_rack_power', pve_ip: '', pve_cpu_navn: '',
      unraid: 'd_day_darling', unraid_effekt: '', unraid_ip: '', unraid_cpu_navn: '',
      unifi_gateway: '', isp: '', klienter_maks: 80, ping_mal: 'cloudflare',
      speedtest_ned: 'sensor.speedtest_download', speedtest_opp: 'sensor.speedtest_upload', speedtest_ping: 'sensor.speedtest_ping',
      qbit_sparefart: 'switch.qbittorrent_alternative_speed', qbit: 'sensor.qbittorrent_',
      navn_map: {}, blokker: null, faner: null, poe_maks: 8,
      grense_cpu: 85, grense_ram: 90, grense_disk: 85, grense_temp: 70, grense_disktemp: 50,
    };
    constructor() { super(); this.state = { tab: null, open: null, conf: null, gf: 'alle', gs: 'id', df: 'alle' }; this._cm = {}; this._mi = {}; }

    /* ---------------- oppdagelse ---------------- */
    _ids() { const S = this.all(); if (this._idsN !== this._hass.states) { this._idsN = this._hass.states; this._idList = Object.keys(S); } return this._idList; }
    _reg() { return (this._hass && this._hass.entities) || {}; }
    _devs() { return (this._hass && this._hass.devices) || {}; }
    _nm(k, def) { const m = this.config.navn_map || {}; return m[k] || def; }
    _devName(id) { const R = this._reg(), d = this._devs()[(R[id] || {}).device_id]; return d ? (d.name_by_user || d.name || '') : ''; }

    /** Proxmox-noder: sensor.N_node_<navn>_* (Proxmox Extended Sensors) + proxmoxve-integrasjonen */
    _pveNodes() {
      if (this._pnS === this._hass.states && this._pnC) return this._pnC;
      this._pnS = this._hass.states;
      const ids = this._ids(), keys = [], out = [];
      for (const id of ids) { const m = id.match(/^sensor\.(\d+_node_.+?)_(cpu_usage|uptime|memory_usage)$/); if (m && !keys.includes(m[1])) keys.push(m[1]); }
      const pref = (this.config.pve_node || '').replace(/^sensor\./, '').replace(/_$/, '');
      keys.sort((x, y) => (y === pref) - (x === pref) || x.localeCompare(y));
      for (const k of keys) {
        const P = `sensor.${k}_`, name = k.replace(/^\d+_node_/, '');
        const btns = {};
        for (const b of ids) if (b.startsWith(`button.${k}_`)) { const a = actOf(b.slice(8 + k.length)); if (a && !btns[a]) btns[a] = b; }
        const f = (sfx) => this._hass.states[P + sfx] ? P + sfx : null;
        out.push({ key: k, name: this._nm(name, name), P, cpu: f('cpu_usage'), mem: f('memory_usage'), memUsed: f('memory_used'), memTotal: f('memory_total'), disk: f('root_filesystem_usage') || f('disk_usage'),
          up: f('uptime'), load1: f('load_average_1m'), load5: f('load_average_5m'), load15: f('load_average_15m'), swap: f('swap_usage'), iowait: f('io_wait'),
          ver: f('pve_version'), kernel: f('kernel_version'), upd: f('node_updates'), status: f('status') || (this._hass.states[`binary_sensor.${k}_status`] ? `binary_sensor.${k}_status` : null),
          temp: (k === pref && this.config.pve_temp) || ids.find(id => id.startsWith(P) && /temp/.test(id)) || null,
          stress: ids.filter(id => id.startsWith(`binary_sensor.${k}_`) && /stress|overload/.test(id)), btns, src: 'pes' });
      }
      // proxmoxve (HACS/kjerne): grupper registerentiteter per enhet
      for (const g of this._pveRegGroups()) if (g.type === 'node') {
        const L = g.ids, fnd = (re, d = 'sensor') => L.find(id => id.startsWith(d + '.') && re.test(obj(id))) || null;
        const btns = {}; for (const b of L) if (dom(b) === 'button') { const a = actOf(obj(b).slice(g.pre.length)); if (a && !btns[a]) btns[a] = b; }
        out.push({ key: g.dev, name: g.name, P: '', cpu: fnd(/cpu_(usage|used)$/), mem: fnd(/memory_(usage|used_percentage)$/), memUsed: fnd(/memory_used$/), memTotal: fnd(/memory_(total|free)$/), disk: fnd(/disk_(usage|used_percentage)$/),
          up: fnd(/uptime$/), load1: null, load5: null, load15: null, swap: fnd(/swap_(usage|used_percentage)$/), iowait: null, ver: fnd(/version$/), kernel: null, upd: fnd(/updates?$/),
          status: fnd(/status$/, 'binary_sensor') || fnd(/status$/), temp: fnd(/temp/), stress: [], btns, src: 'reg' });
      }
      return (this._pnC = out);
    }
    /** proxmoxve-registerentiteter gruppert per enhet: [{dev, type, name, vmid, ids, pre}] */
    _pveRegGroups() {
      if (this._prS === this._hass.states && this._prC) return this._prC;
      this._prS = this._hass.states;
      const R = this._reg(), D = this._devs(), per = {};
      for (const id in R) { const r = R[id]; if (!r || !/^proxmox(ve)?$/.test(r.platform) || r.hidden || !this._hass.states[id]) continue; (per[r.device_id || 'x'] = per[r.device_id || 'x'] || []).push(id); }
      const out = [];
      for (const [dev, ids] of Object.entries(per)) {
        const objs = ids.map(obj), pre = prefixOf(objs), d = D[dev] || {};
        const hint = `${pre} ${d.model || ''} ${d.name || ''}`.toLowerCase();
        const type = /(^|[\s_])(lxc|ct|container)/.test(hint) ? 'lxc' : /(^|[\s_])(qemu|vm|virtual)/.test(hint) ? 'vm' : /storage/.test(hint) ? 'storage' : /node/.test(hint) ? 'node' : null;
        if (!type) continue;
        const vmid = (hint.match(/\b(\d{3,})\b|_(\d{3,})_/) || []).slice(1).find(Boolean) || '';
        const raw = pre.replace(/^(node|qemu|lxc|vm|ct|storage)_/, '').replace(/_?\d{3,}_?$/, '').replace(/_$/, '');
        let name = String(d.name_by_user || d.name || '').replace(/^(node|qemu|lxc|vm|ct|storage)\s*[:-]?\s*/i, '').replace(/\(?\b\d{3,}\b\)?/g, '').trim() || title(raw);
        name = this._nm(vmid, this._nm(raw, name));
        out.push({ dev, type, name, vmid, ids, pre, raw });
      }
      return (this._prC = out);
    }
    /** Proxmox-gjester (struktur) */
    _pveGuests() {
      if (this._pgS === this._hass.states && this._pgC) return this._pgC;
      this._pgS = this._hass.states;
      const out = [], ids = this._ids();
      const mk = (kind, vmid, key, name, L, pre) => {
        const fnd = (re, doms = ['sensor']) => L.find(id => doms.includes(dom(id)) && re.test(obj(id).slice(pre.length))) || null;
        const btns = {}; for (const b of L) if (dom(b) === 'button') { const a = actOf(obj(b).slice(pre.length)); if (a && !btns[a]) btns[a] = b; }
        return { k: `pve-${kind}-${vmid || key}`, kind, vmid, key, name, status: fnd(/^status$/, ['sensor', 'binary_sensor']) || fnd(/status$/, ['sensor', 'binary_sensor']),
          cpu: fnd(/^cpu_(usage|used)$/), memPct: fnd(/^(memory|ram)_(usage|used_percentage)$/), memUsed: fnd(/^(memory|ram)_used$/), memTotal: fnd(/^(memory|ram)_total$/),
          disk: fnd(/^disk_(usage|used_percentage)$/), up: fnd(/^uptime$/), btns };
      };
      const groups = {};
      for (const id of ids) {
        const m = id.match(/^sensor\.(\d+)_(ct|lxc|vm|qemu)_(.+)_status$/); if (!m) continue;
        const [, n, k, key] = m, base = `${n}_${k}_${key}_`;
        const vmid = (key.match(/_(\d{2,})$/) || [])[1] || '', raw = key.replace(/_\d{2,}$/, '');
        let name = String(this.at(id, 'friendly_name', '') || '').replace(/\s*status\s*$/i, '').replace(/\(?\b\d{3,}\b\)?/g, '').replace(/^\s*(lxc|ct|vm|qemu)\b\s*[-:]?\s*/i, '').trim() || title(raw);
        name = this._nm(vmid, this._nm(raw, name));
        groups[base] = { kind: /ct|lxc/.test(k) ? 'lxc' : 'vm', vmid, raw, name };
      }
      if (Object.keys(groups).length) {
        const by = {}; for (const b of Object.keys(groups)) by[b] = [];
        for (const id of ids) { const o = obj(id); if (!/^\d+_(ct|lxc|vm|qemu)_/.test(o)) continue; for (const b in by) if (o.startsWith(b)) { by[b].push(id); break; } }
        for (const b in groups) { const g = groups[b]; out.push(mk(g.kind, g.vmid, g.raw, g.name, by[b], b)); }
      }
      for (const g of this._pveRegGroups()) if (g.type === 'lxc' || g.type === 'vm') out.push(mk(g.type, g.vmid, g.raw, g.name, g.ids, g.pre));
      return (this._pgC = out);
    }
    _pveStorage() {
      const out = [];
      for (const id of this._ids()) {
        const m = id.match(/^sensor\.(\d+)_storage_(.+)_usage$/); if (!m) continue;
        const base = `sensor.${m[1]}_storage_${m[2]}_`;
        const name = this._nm(m[2], String(this.at(id, 'friendly_name', '') || '').replace(/\s*(usage|bruk)\s*$/i, '').replace(/^\s*storage\s*/i, '').trim() || m[2].replace(/_/g, '-'));
        out.push({ id, name, used: base + 'used', total: base + 'total' });
      }
      for (const g of this._pveRegGroups()) if (g.type === 'storage') { const u = g.ids.find(id => /disk_(usage|used_percentage)$|_usage$/.test(id)); if (u) out.push({ id: u, name: g.name, used: g.ids.find(id => /_used$/.test(id)), total: g.ids.find(id => /_total$/.test(id)) }); }
      return out;
    }
    /** Unraid */
    _unraid() {
      const u = this.config.unraid; if (!u) return null;
      const P = `sensor.${u}_`, ids = this._ids();
      if (!ids.some(id => id.startsWith(P) || id.startsWith(`switch.${u}_`))) return null;
      const cont = ids.filter(id => id.startsWith(`switch.${u}_container_`)).map(id => {
        const k = id.slice(`switch.${u}_container_`.length);
        const nm = this._nm(k, title(k.replace(/^binhex_/, '')));
        return { id, key: k, name: nm, upd: `update.${obj(id)}_update`, restart: ids.find(b => b.startsWith(`button.${u}_container_${k}_`) && /restart/.test(b)) || null, cpu: `sensor.${u}_container_${k}_cpu_usage`, mem: `sensor.${u}_container_${k}_memory_usage` };
      }).sort((x, y) => x.name.localeCompare(y.name, 'nb'));
      const vms = ids.filter(id => id.startsWith(`switch.${u}_vm_`)).map(id => ({ id, name: this._nm(id.slice(`switch.${u}_vm_`.length), title(id.slice(`switch.${u}_vm_`.length))) }));
      const disks = {};
      for (const id of ids) {
        if (!id.startsWith(P)) continue;
        const m = id.slice(P.length).match(/^(disk_?\d+|parity_?\d*|cache[a-z0-9_]*?)_(usage|temperature|temp)$/); if (!m) continue;
        (disks[m[1]] = disks[m[1]] || { key: m[1] })[m[2] === 'usage' ? 'use' : 'temp'] = id;
      }
      const dl = Object.values(disks).map(d => ({ ...d, name: /^disk/.test(d.key) ? 'Disk ' + d.key.replace(/\D/g, '') : /^parity/.test(d.key) ? ('Parity ' + d.key.replace(/\D/g, '')).trim() : title(d.key.replace(/_/g, ' ')).replace(/^Cache$/, 'Cache (NVMe)') }))
        .sort((x, y) => (/^Parity/.test(x.name) ? -1 : 0) - (/^Parity/.test(y.name) ? -1 : 0) || (/^Cache/.test(x.name) ? 1 : 0) - (/^Cache/.test(y.name) ? 1 : 0) || x.name.localeCompare(y.name, 'nb', { numeric: true }));
      const first = (re, d = 'switch') => ids.find(id => id.startsWith(`${d}.${u}_`) && re.test(id.slice(d.length + u.length + 2)));
      return { u, P, cont, vms, disks: dl, parity: first(/parit/), mover: first(/mover/) || first(/mover/, 'button'), check: first(/check_container_updates/, 'button') };
    }
    /** UniFi-enheter: device_tracker.<slug> med sensor.<slug>_uptime(_2) */
    _unifi() {
      const ids = this._ids(), S = this._hass.states, out = [];
      for (const id of ids) {
        if (!id.startsWith('device_tracker.')) continue;
        const slug = id.slice(15);
        const sfx = S[`sensor.${slug}_uptime_2`] ? '_2' : S[`sensor.${slug}_uptime`] ? '' : null;
        if (sfx === null) continue;
        const cpu = S[`sensor.${slug}_cpu_utilisation${sfx}`] ? `sensor.${slug}_cpu_utilisation${sfx}` : S[`sensor.${slug}_cpu_utilization${sfx}`] ? `sensor.${slug}_cpu_utilization${sfx}` : null;
        if (!cpu) continue;
        const name = String(this.at(id, 'friendly_name', '') || this.at(`sensor.${slug}_uptime${sfx}`, 'friendly_name', '') || '').replace(/\s*(uptime|oppetid)\s*$/i, '').trim() || title(slug);
        const lav = `${name} ${slug}`.toLowerCase();
        const type = /dream|udm|gateway|udr|ucg|uxg|usg/.test(lav) || ids.includes(`sensor.${slug}_google_wan_latency`) || ids.includes(`sensor.${slug}_cloudflare_wan_latency`) ? 0 : /usw|switch|flex|\bus[- ]?\d/.test(lav) ? 1 : 2;
        const memId = [`sensor.${slug}_memory_utilisation${sfx}`, `sensor.${slug}_memory_utilization${sfx}`].find(x => S[x]) || `sensor.${slug}_memory_utilisation${sfx}`;
        const temp = [`sensor.${slug}_cpu_temperature${sfx}`, `sensor.${slug}_temperature${sfx}`, `sensor.${slug}_cpu_temperature`, `sensor.${slug}_temperature`].find(x => S[x]) || null;
        const restart = [`button.${slug}_restart`, `button.${slug}_restart_2`].find(x => S[x]) || null;
        const ports = ids.filter(p => p.startsWith(`switch.${slug}_port_`) && /_port_\d+(_poe)?$/.test(p)).sort((x, y) => +x.match(/_port_(\d+)/)[1] - +y.match(/_port_(\d+)/)[1]);
        const cycles = ids.filter(p => p.startsWith(`button.${slug}_port_`) && /power_cycle$/.test(p));
        out.push({ slug, name, type, tracker: id, up: `sensor.${slug}_uptime${sfx}`, cpu, mem: memId, clients: `sensor.${slug}_clients`, fw: `update.${slug}_firmware`, temp, restart, ports, cycles });
      }
      out.sort((x, y) => x.type - y.type || x.name.localeCompare(y.name, 'nb'));
      const gws = this.config.unifi_gateway;
      const gw = (gws && out.find(d => d.slug === gws)) || out.find(d => d.type === 0) || null;
      const gwSlug = gws || (gw && gw.slug) || ((ids.find(id => /_(google|cloudflare)_wan_latency$/.test(id)) || '').replace(/^sensor\.|_(google|cloudflare)_wan_latency$/g, ''));
      return { list: out, gw, gwSlug };
    }
    /** Entiteter fra UniFi-integrasjonen (krever entitetsregisteret) */
    _unifiReg() {
      const R = this._reg(), out = [];
      for (const id in R) if (R[id] && R[id].platform === 'unifi' && !R[id].hidden && this._hass.states[id]) out.push(id);
      return out;
    }
    /** Wi-Fi-nett (WLAN-brytere): enheter med QR-bilde eller id med wlan/wifi/ssid */
    _wlans() {
      const R = this._reg(), reg = this._unifiReg();
      const qrDev = new Set(reg.filter(id => dom(id) === 'image').map(id => (R[id] || {}).device_id).filter(Boolean));
      return reg.filter(id => dom(id) === 'switch' && !/port_\d/.test(id) && (qrDev.has((R[id] || {}).device_id) || /wlan|wifi|wi_fi|ssid/.test(obj(id))));
    }

    /* ---------------- modeller (verdier) ---------------- */
    _gV(g) {
      const raw = this.v(g.status).toLowerCase();
      const state = dom(g.status || 'x.x') === 'binary_sensor' ? (raw === 'on' ? 'running' : raw === 'off' ? 'stopped' : raw) : raw;
      const on = state === 'running', paused = /pause|suspend/.test(state);
      const mu = bytes(this.st(g.memUsed)), mt = bytes(this.st(g.memTotal));
      const memP = this.n(g.memPct) ?? (mu != null && mt ? mu / mt * 100 : null);
      return { ...g, state, on, paused, cpuV: this.n(g.cpu), memV: memP, mu, mt, diskV: this.n(g.disk), upS: upSec(this.st(g.up)) };
    }
    _nV(N) {
      const mu = bytes(this.st(N.memUsed)), mt = bytes(this.st(N.memTotal));
      const st = this.v(N.status).toLowerCase();
      const online = !N.status || ['online', 'on', 'running', 'ok'].includes(st) || (!KD.BAD.has(st) && !/off|down|unknown/.test(st));
      return { ...N, online, cpuV: this.n(N.cpu), memV: this.n(N.mem) ?? (mu != null && mt ? mu / mt * 100 : null), mu, mt, diskV: this.n(N.disk), upS: upSec(this.st(N.up)),
        loads: [this.n(N.load1), this.n(N.load5), this.n(N.load15)], swapV: this.n(N.swap), ioV: this.n(N.iowait), tempV: N.temp ? this.n(N.temp) : null,
        verV: (String(this.v(N.ver)).match(/\d+\.\d+(\.\d+)?/) || [])[0] || '', updV: this.n(N.upd), stressOn: N.stress.filter(id => this.v(id) === 'on') };
    }
    _urV(U) {
      const P = U.P, u = U.u;
      const dockers = U.cont.map(d => ({ ...d, on: this.v(d.id) === 'on', gone: !this.ok(d.id), hasUpd: this.v(d.upd) === 'on', cpuV: this.n(d.cpu), memV: this.n(d.mem) }));
      const parRun = this.v(`binary_sensor.${u}_parity_check_running`) === 'on';
      const parP = this.n(`sensor.${u}_parity_check_progress`, this.n(`sensor.${u}_parity_progress`));
      const parity = parRun || (parP != null && parP > 0 && parP < 100) || (U.parity && this.v(U.parity) === 'on');
      const arrState = this.v(P + 'array_state') || this.v(P + 'array_status');
      const arrOn = this.st(`binary_sensor.${u}_array_started`) ? this.v(`binary_sensor.${u}_array_started`) === 'on' : !/stop/i.test(arrState);
      const disks = U.disks.map(d => {
        const s = this.st(d.use), at = (s && s.attributes) || {}, t = this.n(d.temp), bar = this.n(d.use), par = /^Parity/.test(d.name);
        const tot = sizeAttr(at.total_size ?? at.disk_size ?? at.size ?? at.total), used = sizeAttr(at.used_space ?? at.used), free = sizeAttr(at.free_space ?? at.free);
        const spun = at.spin_down === true || /standby|spun|sleep/i.test(String(at.disk_status || at.status || at.spin_state || '')) || (d.temp && !this.ok(d.temp) && !!this.st(d.temp));
        return { ...d, par, cache: /^Cache/.test(d.name), t, bar, tot, used: used ?? (tot != null && free != null ? tot - free : null), spun, model: at.model || at.device || '', fs: at.filesystem || at.fs_type || '' };
      });
      return { dockers, parRun: parity, parP, arrOn, arrState, disks, cpu: this.n(P + 'cpu_usage'), ram: this.n(P + 'ram_usage'), arr: this.n(P + 'array_usage'), temp: this.n(P + 'cpu_temperature'),
        mobo: this.n(P + 'motherboard_temperature'), parErr: this.n(P + 'parity_check_errors', this.n(P + 'parity_errors')), upsStatus: this.v(P + 'ups_status'),
        upsB: this.n(P + 'ups_battery', this.n(P + 'ups_battery_charge')), upsRt: this.n(P + 'ups_runtime', this.n(P + 'ups_battery_runtime')), upsLoad: this.n(P + 'ups_load', this.n(P + 'ups_load_percentage')) };
    }
    _ufV(UF) {
      return UF.list.map(d => {
        const tr = this.st(d.tracker), on = !tr || tr.state === 'home';
        return { ...d, on, kl: this.n(d.clients), cpuV: this.n(d.cpu), memV: this.n(d.mem), tempV: d.temp ? this.n(d.temp) : null, upS: upSec(this.st(d.up)), fwV: this.at(d.fw, 'installed_version', ''), fwNew: this.v(d.fw) === 'on' ? this.at(d.fw, 'latest_version', '') || 'ny' : '' };
      });
    }

    /* ---------------- hendelser ---------------- */
    goTab(ev, k) { this.setState({ tab: k, open: null, conf: null }); }
    setGf(ev, v) { this.setState({ gf: v, open: null }); }
    setGs(ev, v) { this.setState({ gs: v }); }
    setDf(ev, v) { this.setState({ df: v, open: null }); }
    openRow(ev, k) { this.setState({ open: this.state.open === k ? null : k, conf: null }); }
    moreInfo(ev, k) { const id = this._mi[k] || k; if (id && id.includes('.')) this.more(id); }
    _run(id) {
      if (!id) return; const d = dom(id);
      if (d === 'button') this.press(id); else if (d === 'update') this.call('update', 'install', { entity_id: id }); else this.toggle(id);
    }
    /** Trykk på handling: bekreft først hvis den kan stoppe noe */
    ask(ev, id) { if (!id) return; const m = this._cm[id]; if (m && m.confirm) { clearTimeout(this._cT); this._cT = setTimeout(() => this.state.conf === id && this.setState({ conf: null }), 9000); this.setState({ conf: id }); } else this._run(id); }
    yesConf(ev, id) { clearTimeout(this._cT); this.haptic('heavy'); this._run(id); this.setState({ conf: null }); }
    noConf() { this.setState({ conf: null }); }
    /* bakoverkompatible navn */
    act(ev, id) { this.ask(ev, id); }
    tog(ev, id) { this.ask(ev, id); }
    /** Registrer handling for bekreftelse: rad-nøkkel, verb («Slå av»), tekst, bekreft? */
    _A(id, row, verb, what, confirm, col) { if (id) this._cm[id] = { row, verb, what, confirm: !!confirm, col: col || C.red }; return id; }

    /* ---------------- byggeklosser (HTML) ---------------- */
    _chip(t, col) { return t ? `<span style="display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 8px;border-radius:10px;flex:none;font-size:11px;font-weight:600;white-space:nowrap;background:${a(col, 0.16)};color:${col}"><span style="width:6px;height:6px;border-radius:3px;background:${col}"></span>${e(t)}</span>` : ''; }
    _mbar(label, p, col, txt) {
      const w = p == null || isNaN(p) ? 0 : Math.max(0, Math.min(100, p));
      return `<div style="display:flex;align-items:center;gap:8px;min-width:0;font-size:11px;color:#8e8d89;font-variant-numeric:tabular-nums">
        <span style="width:34px;flex:none">${e(label)}</span>
        <span style="flex:1;min-width:0;height:4px;border-radius:2px;background:#2a2a2d;overflow:hidden"><span style="display:block;height:100%;width:${w}%;border-radius:2px;background:${col};transition:width .5s"></span></span>
        <span style="flex:none;min-width:38px;text-align:right;color:#c9c7c2">${e(txt != null ? txt : p == null ? '–' : nf(p) + ' %')}</span></div>`;
    }
    _stats(list) {
      const L = list.filter(x => x && x[1] != null && x[1] !== '');
      return L.length ? `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px">${L.map(([l, v, col]) => `<div style="min-width:0;padding:9px 11px;border-radius:16px;background:#232326;display:flex;flex-direction:column;gap:2px">
        <span style="font-size:11px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(l)}</span>
        <span style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;${col ? 'color:' + col : ''}">${e(v)}</span></div>`).join('')}</div>` : '';
    }
    /** Handlingsknapp (pille) – med bekreftelse når må */
    _btn(id, row, act, what, label, icon, col, confirm) {
      if (!id) return '';
      this._A(id, row, label, what, confirm, col);
      const on = this.state.conf === id;
      return `<button data-on-click="ask" data-arg="${e(id)}" style="height:36px;padding:0 13px 0 10px;border-radius:18px;display:inline-flex;align-items:center;gap:6px;flex:none;font-size:13px;font-weight:500;white-space:nowrap;background:${on ? a(col, 0.22) : '#232326'};color:${col};box-shadow:inset 0 0 0 1px ${on ? a(col, 0.5) : 'rgba(255,255,255,0.04)'}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">${e(icon)}</span>${e(label)}</button>`;
    }
    _btns(list) { const h = list.filter(Boolean).join(''); return h ? `<div style="display:flex;flex-wrap:wrap;gap:6px">${h}</div>` : ''; }
    /** Bekreft-rad for en rad (vises når en av radens handlinger venter) */
    _confHTML(row) {
      const id = this.state.conf, m = id && this._cm[id];
      if (!m || m.row !== row) return '';
      return `<div data-key="cf-${e(row)}" style="display:flex;align-items:center;gap:8px;padding:8px 8px 8px 12px;border-radius:20px;background:${a(m.col, 0.12)};box-shadow:inset 0 0 0 1px ${a(m.col, 0.3)};animation:fadein .2s">
        <span class="ms" style="font-size:20px;color:${m.col};flex:none">warning</span>
        <span style="flex:1;min-width:0;font-size:13px;line-height:1.3"><b style="font-weight:600">${e(m.verb)}</b> ${e(m.what)}?</span>
        <button data-on-click="noConf" style="height:34px;padding:0 12px;border-radius:17px;flex:none;background:#2a2a2d;font-size:13px">Avbryt</button>
        <button data-on-click="yesConf" data-arg="${e(id)}" data-no-haptic="1" style="height:34px;padding:0 14px;border-radius:17px;flex:none;background:${m.col};color:#161414;font-size:13px;font-weight:600;white-space:nowrap">${e(m.verb)}</button></div>`;
    }
    _toggleHTML(id, row, on, what, confirmOff, col = C.pink, verbs = ['Slå på', 'Slå av']) {
      this._A(id, row, on ? verbs[1] : verbs[0], what, on && confirmOff, on ? C.red : C.green);
      return `<button data-on-click="ask" data-arg="${e(id)}" style="position:relative;width:44px;height:26px;border-radius:13px;flex:none;background:${on ? col : '#3a3a3d'};transition:background .2s"><span style="position:absolute;top:3px;left:${on ? 21 : 3}px;width:20px;height:20px;border-radius:10px;background:#f4f3ef;transition:left .2s"></span></button>`;
    }
    /** Generisk rad. o: {k, name, icon, col, on, tag, chip:[t,col], sub, warn, bar, bars:[[l,p,col,txt]], v, act, actIcon, actCol, actVerb, actConfirm, tog, togOn, togConfirm, togCol, detail(fn), more} */
    _row(o, i) {
      const on = o.on ?? true, col = o.col || C.blue, k = o.k || o.act || o.tog || o.name, open = !!o.detail && this.state.open === k;
      if (o.more) this._mi[k] = o.more;
      const bar = o.bar != null ? `<span style="display:block;height:4px;border-radius:2px;background:#2a2a2d;overflow:hidden"><span style="display:block;width:${Math.max(0, Math.min(100, o.bar))}%;height:100%;border-radius:2px;background:${o.barCol || pctCol(o.bar, 85, 95, col)};transition:width .5s"></span></span>` : '';
      const bars = (o.bars || []).filter(Boolean).map(b => this._mbar(...b)).join('');
      let actB = '';
      if (o.act) { this._A(o.act, k, o.actVerb || 'Utfør', o.name, o.actConfirm, o.actCol && o.actConfirm ? o.actCol : C.red); actB = `<button data-on-click="ask" data-arg="${e(o.act)}" style="width:36px;height:36px;border-radius:18px;flex:none;display:grid;place-items:center;background:${this.state.conf === o.act ? a(C.red, 0.2) : '#232326'};color:${o.actCol || '#c9c7c2'}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">${e(o.actIcon || 'play_arrow')}</span></button>`; }
      const togB = o.tog ? this._toggleHTML(o.tog, k, !!o.togOn, o.name, o.togConfirm, o.togCol, o.togVerbs) : '';
      const detail = open ? o.detail() : '';
      const conf = this._confHTML(k);
      return `<div data-key="r-${e(k)}" style="display:flex;flex-direction:column;gap:${open || conf ? 10 : 0}px;padding:${open ? '12px 12px 14px' : '10px 4px'};margin:${open ? '4px -4px' : '0'};border-radius:${open ? 22 : 0}px;background:${open ? '#1c1c1f' : 'transparent'};border-top:${i && !open ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent'};transition:background .25s,padding .25s,margin .25s,border-radius .25s">
        <div ${o.detail ? `data-on-click="openRow" data-arg="${e(k)}"` : ''} ${o.more ? `data-hold="moreInfo" data-arg="${e(k)}"` : ''} style="display:flex;align-items:center;gap:12px;min-width:0;${o.detail ? 'cursor:pointer' : ''}">
          <span style="width:36px;height:36px;border-radius:12px;flex:none;display:grid;place-items:center;background:${on ? a(col, 0.16) : '#1f1f22'};color:${on ? col : '#6d6c69'}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">${e(o.icon)}</span></span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:5px">
            <span style="display:flex;align-items:center;gap:6px;min-width:0;font-size:14px;font-weight:500"><span style="min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(o.name)}</span>${o.tag ? `<span style="flex:none;font-size:10px;font-weight:600;padding:2px 6px;border-radius:6px;background:${o.tagCol ? a(o.tagCol, 0.18) : '#2a2a2d'};color:${o.tagCol || '#a9a7a2'};text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap">${e(o.tag)}</span>` : ''}${o.chip ? this._chip(o.chip[0], o.chip[1]) : ''}</span>
            ${o.sub ? `<span style="font-size:12px;color:${o.warn ? C.red : '#8e8d89'};font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(o.sub)}</span>` : ''}
            ${bar}${bars ? `<div style="display:flex;flex-direction:column;gap:3px">${bars}</div>` : ''}
          </div>
          ${o.v ? `<span style="flex:none;font-size:13px;font-weight:500;color:${o.vCol || '#c9c7c2'};font-variant-numeric:tabular-nums;white-space:nowrap">${e(o.v)}</span>` : ''}
          ${o.detail ? `<span class="ms" style="flex:none;font-size:20px;color:#6d6c69;transition:transform .25s;transform:rotate(${open ? 180 : 0}deg)">expand_more</span>` : ''}
          ${actB}${togB}
        </div>
        ${detail}${conf}
      </div>`;
    }
    _sec(title, meta, inner, opts = {}) {
      if (!inner) return '';
      return `<section data-key="sec-${e(opts.key || title)}" data-lay="${e(opts.key || title)}" data-lay-navn="${e(title)}" style="display:flex;flex-direction:column;gap:${opts.gap ?? 4}px;min-width:0">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:0 4px 6px">
        <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89;white-space:nowrap">${e(title)}</div>
        <div style="font-size:12px;color:#6d6c69;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(meta || '')}</div>
      </div>${inner}</section>`;
    }
    _rows(list) { return list.filter(Boolean).map((o, i) => this._row(o, i)).join(''); }
    _gauge(label, v, max, unit, sub, col) {
      const vv = v == null || isNaN(v) ? 0 : v;
      return { label, sub, v: v == null || isNaN(v) ? '–' : `${nf(v)}${unit}`, deg: Math.max(0, Math.min(1, vv / max)) * 360, col };
    }
    _gaugesHTML(G) {
      return `<section data-lay="maalere" data-lay-navn="Målere" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
    ${G.map(g => `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 6px 14px;border-radius:22px;background:#1c1c1f;min-width:0">
        <div style="position:relative;width:72px;height:72px;border-radius:50%;background:conic-gradient(${g.col} ${g.deg}deg, #2a2a2d 0);transition:background .6s"><div style="position:absolute;inset:8px;border-radius:50%;background:#1c1c1f;display:grid;place-items:center"><span style="font-size:17px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap">${e(g.v)}</span></div></div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:1px;text-align:center;min-width:0;max-width:100%"><span style="font-size:13px;font-weight:500">${e(g.label)}</span><span style="font-size:11px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${e(g.sub)}</span></div>
      </div>`).join('')}
  </section>`;
    }
    _heroHTML(V) {
      return `<section data-lay="status" data-lay-navn="Status" style="display:flex;flex-direction:column;gap:6px;padding:0 4px;min-width:0">
    <div style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;color:#c9c7c2;min-width:0"><span style="width:8px;height:8px;border-radius:4px;flex:none;background:${V.ok};box-shadow:0 0 10px ${V.ok}"></span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(V.status)}</span></div>
    <div style="font-size:24px;font-weight:500;letter-spacing:-0.015em">${e(V.headline)}</div>
    <div style="font-size:14px;color:#8e8d89">${e(V.subline)}</div>
  </section>`;
    }
    _speedHTML() {
      const sp = this._speed(); if (!sp) return '';
      const bars = (arr, col) => { const m = Math.max(1, ...arr); return arr.map((v, i) => `<span style="flex:1;height:${v / m * 100}%;border-radius:2px;background:${i === arr.length - 1 ? col : a(col, 0.45)}"></span>`).join(''); };
      return `<section data-lay="fart" data-lay-navn="Hastighet" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
      ${[['Ned', 'south', sp.down, C.green], ['Opp', 'north', sp.up, C.blue]].map(([label, icon, arr, col]) => `<div style="display:flex;flex-direction:column;gap:6px;padding:16px;border-radius:22px;background:#1c1c1f;min-width:0">
          <span style="display:flex;align-items:center;gap:6px;font-size:12px;color:#8e8d89"><span class="ms" style="font-size:16px;color:${col}">${icon}</span><span>${label}</span></span>
          <span style="font-size:28px;font-weight:300;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;white-space:nowrap">${e(nf(arr[arr.length - 1] || 0))}<span style="font-size:13px;color:#8e8d89"> Mbit/s</span></span>
          <div style="display:flex;align-items:flex-end;gap:2px;height:32px">${bars(arr, col)}</div>
        </div>`).join('')}
    </section>`;
    }
    _speed() {
      const c = this.config, ids = [c.speedtest_ned, c.speedtest_opp].filter(id => this.st(id));
      if (!ids.length) return null;
      const hist = this.cached('kd-srv-speed-' + ids.join(','), 10 * 60e3, () => this.history(ids, 48), {});
      const series = (id) => {
        if (!id || !this.st(id)) return [];
        const pts = ((hist && hist[id]) || []).map(p => p.v).filter(v => typeof v === 'number');
        const cur = this.n(id), arr = pts.slice(-20);
        if (cur != null && (!arr.length || arr[arr.length - 1] !== cur)) { arr.push(cur); if (arr.length > 20) arr.shift(); }
        return arr;
      };
      return { down: series(c.speedtest_ned), up: series(c.speedtest_opp) };
    }

    /* ---------------- helse (varsler) ---------------- */
    _health(M) {
      const c = this.config, out = [], G = { cpu: +c.grense_cpu || 85, ram: +c.grense_ram || 90, disk: +c.grense_disk || 85, temp: +c.grense_temp || 70, dt: +c.grense_disktemp || 50 };
      const add = (lvl, icon, text, sub, tab, k) => out.push({ lvl, icon, text, sub, tab, k: k || text });
      if (M.pve) {
        for (const n of M.pve.nodes) {
          if (!n.online) add(2, 'dns', `${n.name} er frakoblet`, 'Proxmox-node', 'pve');
          if (n.cpuV != null && n.cpuV >= G.cpu) add(n.cpuV >= 95 ? 2 : 1, 'speed', `Høy CPU på ${n.name}`, `${nf(n.cpuV)} %`, 'pve');
          if (n.memV != null && n.memV >= G.ram) add(n.memV >= 97 ? 2 : 1, 'memory', `Lite minne på ${n.name}`, `${nf(n.memV)} % brukt`, 'pve');
          if (n.diskV != null && n.diskV >= G.disk) add(n.diskV >= 95 ? 2 : 1, 'hard_drive', `Rot-disken på ${n.name} er nesten full`, `${nf(n.diskV)} %`, 'pve');
          if (n.tempV != null && n.tempV >= G.temp) add(n.tempV >= G.temp + 10 ? 2 : 1, 'thermostat', `Varm CPU på ${n.name}`, `${nf(n.tempV)}°`, 'pve');
          for (const s of n.stressOn) add(1, 'warning', this.fname(s), 'Proxmox', 'pve');
          if (n.updV) add(0, 'system_update', `${nf(n.updV)} pakkeoppdateringer på ${n.name}`, 'Proxmox VE', 'pve');
        }
        const off = M.pve.guests.filter(g => !g.on);
        if (off.length) add(0, 'deployed_code', off.length === 1 ? `${off[0].name} er ${off[0].paused ? 'pauset' : 'stoppet'}` : `${off.length} gjester er stoppet`, 'Proxmox · ' + off.map(g => g.name).join(', '), 'pve');
        for (const g of M.pve.guests) if (g.on && g.cpuV != null && g.cpuV >= G.cpu) add(1, 'speed', `${g.name} bruker mye CPU`, `${nf(g.cpuV)} %`, 'pve');
        for (const g of M.pve.guests) if (g.diskV != null && g.diskV >= G.disk) add(g.diskV >= 95 ? 2 : 1, 'hard_drive', `Disken til ${g.name} er nesten full`, `${nf(g.diskV)} %`, 'pve');
        for (const s of M.pve.store) if (s.bar != null && s.bar >= G.disk) add(s.bar >= 95 ? 2 : 1, 'database', `Lagring ${s.name} er nesten full`, `${nf(s.bar)} %`, 'pve');
      }
      if (M.ur) {
        const R = M.ur;
        if (!R.arrOn) add(2, 'storage', 'Unraid-arrayet er stoppet', R.arrState || '', 'unraid');
        if (R.parRun) add(0, 'fact_check', 'Paritetssjekk pågår', R.parP != null ? `${nf(R.parP)} %` : '', 'unraid');
        if (R.parErr) add(2, 'error', `Paritetsfeil: ${nf(R.parErr)}`, 'Siste paritetssjekk', 'unraid');
        for (const d of R.disks) {
          if (!d.par && d.bar != null && d.bar >= G.disk) add(d.bar >= 95 ? 2 : 1, 'hard_drive', `${d.name} er nesten full`, `${nf(d.bar)} %`, 'unraid');
          if (d.t != null && d.t >= G.dt) add(d.t >= G.dt + 5 ? 2 : 1, 'device_thermostat', `${d.name} er varm`, `${nf(d.t)}°`, 'unraid');
        }
        if (R.cpu != null && R.cpu >= G.cpu) add(1, 'speed', 'Høy CPU på Unraid', `${nf(R.cpu)} %`, 'unraid');
        if (R.ram != null && R.ram >= G.ram) add(1, 'memory', 'Lite minne på Unraid', `${nf(R.ram)} %`, 'unraid');
        if (R.temp != null && R.temp >= G.temp) add(1, 'thermostat', 'Varm CPU på Unraid', `${nf(R.temp)}°`, 'unraid');
        if (/batt|onbatt/i.test(R.upsStatus)) add(2, 'battery_alert', 'UPS går på batteri', R.upsRt != null ? `${nf(R.upsRt)} min igjen` : '', 'unraid');
        const stop = R.dockers.filter(d => !d.on);
        if (stop.length) add(0, 'deployed_code', stop.length === 1 ? `${stop[0].name} er stoppet` : `${stop.length} containere er stoppet`, 'Docker · ' + stop.map(d => d.name).join(', '), 'unraid');
      }
      if (M.uf) {
        for (const d of M.uf.devs) {
          if (!d.on) add(2, 'wifi_off', `${d.name} svarer ikke`, 'UniFi-enhet', 'unifi');
          else if (d.cpuV != null && d.cpuV >= G.cpu) add(1, 'speed', `Høy CPU på ${d.name}`, `${nf(d.cpuV)} %`, 'unifi');
        }
        if (M.uf.ping != null && M.uf.ping > 100) add(1, 'network_ping', 'Høy latens på WAN', `${nf(M.uf.ping)} ms`, 'unifi');
      }
      if (M.upds.length) add(1, 'system_update', M.upds.length === 1 ? `Oppdatering klar: ${M.upds[0].name}` : `${M.upds.length} oppdateringer klare`, M.upds.map(u => u.name).slice(0, 4).join(', '), 'oversikt', 'upd');
      return out.sort((x, y) => y.lvl - x.lvl);
    }
    /** Alle update.* som venter (UniFi-fastvare og Unraid-containere) */
    _updates(U, UF) {
      const R = this._reg(), set = new Set();
      for (const d of UF.list) set.add(d.fw);
      for (const id of this._unifiReg()) if (dom(id) === 'update') set.add(id);
      if (U) for (const d of U.cont) set.add(d.upd);
      for (const id in R) if (R[id] && /^proxmox(ve)?$/.test(R[id].platform) && dom(id) === 'update') set.add(id);
      return [...set].filter(id => this.v(id) === 'on').map(id => ({ id, name: this.fname(id).replace(/\s*(firmware|fastvare|update|oppdatering)\s*$/i, '').trim(), from: this.at(id, 'installed_version', ''), to: this.at(id, 'latest_version', ''), busy: !!this.at(id, 'in_progress', false) }));
    }
    _updRows(list) {
      return list.map(u => ({ k: 'upd-' + u.id, name: u.name, icon: 'system_update', col: C.amber, more: u.id, sub: u.busy ? 'Installerer …' : [u.from, u.to].filter(Boolean).join(' → ') || 'Ny versjon',
        act: u.busy ? null : u.id, actIcon: 'download', actCol: C.amber, actVerb: 'Installer', actConfirm: true }));
    }

    /* ---------------- faner ---------------- */
    _tabOversikt(M, H) {
      const red = H.filter(x => x.lvl === 2).length, amb = H.filter(x => x.lvl === 1).length;
      const ok = red ? C.red : amb ? C.amber : C.green;
      const sys = [];
      if (M.pve) {
        const n = M.pve.nodes[0], run = M.pve.guests.filter(g => g.on).length;
        sys.push({ tab: 'pve', icon: 'deployed_code', name: 'Proxmox', col: C.blue, line: M.pve.guests.length ? `${run} av ${M.pve.guests.length} gjester kjører` : `${M.pve.nodes.length} ${M.pve.nodes.length === 1 ? 'node' : 'noder'}`, bars: n ? [['CPU', n.cpuV, pctCol(n.cpuV, 70, 90)], ['RAM', n.memV, pctCol(n.memV)]] : [] });
      }
      if (M.ur) sys.push({ tab: 'unraid', icon: 'storage', name: 'Unraid', col: C.amber, line: `${M.ur.arrOn ? 'Array startet' : 'Array stoppet'} · ${M.ur.dockers.filter(d => d.on).length}/${M.ur.dockers.length} Docker`, bars: [['Array', M.ur.arr, pctCol(M.ur.arr, 85, 95, C.amber)], ['CPU', M.ur.cpu, pctCol(M.ur.cpu, 70, 90)]] });
      if (M.uf) { const on = M.uf.devs.filter(d => d.on).length; sys.push({ tab: 'unifi', icon: 'router', name: 'UniFi', col: C.green, line: `${on}/${M.uf.devs.length} enheter · ${M.uf.clients != null ? nf(M.uf.clients) + ' klienter' : ''}`, bars: [['Ping', M.uf.ping != null ? Math.min(100, M.uf.ping / 40 * 100) : null, C.green, M.uf.ping != null ? `${nf(M.uf.ping)} ms` : '–'], M.uf.gwD ? ['GW', M.uf.gwD.cpuV, pctCol(M.uf.gwD.cpuV, 70, 90)] : null].filter(Boolean) });
      }
      const alertN = (t) => H.filter(x => x.tab === t && x.lvl > 0).length;
      const tiles = sys.map((s, i) => { const n = alertN(s.tab); return `<button data-on-click="goTab" data-arg="${s.tab}" style="min-width:0;${sys.length % 2 && i === sys.length - 1 ? 'grid-column:1/-1;' : ''}display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:24px;background:#1c1c1f;text-align:left">
          <span style="display:flex;align-items:center;gap:10px;min-width:0;width:100%"><span style="width:34px;height:34px;border-radius:12px;flex:none;display:grid;place-items:center;background:${a(s.col, 0.16)};color:${s.col}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">${s.icon}</span></span>
            <span style="flex:1;min-width:0;font-size:15px;font-weight:500">${e(s.name)}</span>${n ? `<span style="flex:none;min-width:20px;height:20px;padding:0 6px;box-sizing:border-box;border-radius:10px;display:grid;place-items:center;font-size:11px;font-weight:600;background:${a(C.amber, 0.2)};color:${C.amber}">${n}</span>` : `<span class="ms" style="flex:none;font-size:18px;color:${C.green};font-variation-settings:'FILL' 1">check_circle</span>`}</span>
          <span style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%">${e(s.line)}</span>
          <span style="display:flex;flex-direction:column;gap:4px;width:100%">${s.bars.map(b => this._mbar(...b)).join('')}</span></button>`; }).join('');
      const alerts = H.filter(x => x.k !== 'upd').map(x => ({ k: 'al-' + x.k, name: x.text, sub: x.sub, icon: x.icon, col: LVL[x.lvl], chip: [['Info', 'Advarsel', 'Kritisk'][x.lvl], LVL[x.lvl]], act: null, _tab: x.tab }));
      const alertHTML = alerts.map((o, i) => `<button data-on-click="goTab" data-arg="${e(o._tab)}" style="display:block;width:100%;text-align:left">${this._row({ ...o }, i)}</button>`).join('');
      return `${this._heroHTML({ ok, status: `Helse · ${sys.length} ${sys.length === 1 ? 'system' : 'systemer'}`, headline: red ? `${red} ${red === 1 ? 'kritisk varsel' : 'kritiske varsler'}` : amb ? `${amb} ${amb === 1 ? 'ting' : 'ting'} å se på` : 'Alt ser bra ut', subline: [M.pve ? `${M.pve.guests.filter(g => g.on).length} gjester` : '', M.ur ? `${M.ur.dockers.filter(d => d.on).length} containere` : '', M.uf ? `${M.uf.devs.filter(d => d.on).length} nettverksenheter` : '', M.upds.length ? `${M.upds.length} oppdateringer` : ''].filter(Boolean).join(' · ') })}
  ${tiles ? `<section data-lay="systemer" data-lay-navn="Systemer" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">${tiles}</section>` : ''}
  ${this._sec('Varsler', alerts.length ? `${alerts.length} aktive` : 'ingen', alerts.length ? alertHTML : `<div style="display:flex;align-items:center;gap:10px;padding:14px;border-radius:20px;background:#1c1c1f;color:#8e8d89;font-size:13px"><span class="ms" style="color:${C.green};font-variation-settings:'FILL' 1">verified</span>Ingen varsler – alt kjører som det skal</div>`, { key: 'varsler' })}
  ${this._sec('Oppdateringer', `${M.upds.length} klare`, this._rows(this._updRows(M.upds)), { key: 'oppd' })}`;
    }

    _tabPve(M) {
      const c = this.config, s = this.state, nodes = M.nodes, N = nodes[0] || null;
      const guests0 = M.guests, running = guests0.filter(g => g.on).length;
      const W = c.pve_effekt ? this.n(c.pve_effekt) : null;
      const V = {
        status: `${N ? N.name : 'Proxmox'} · Proxmox VE${N && N.verV ? ' ' + N.verV : ''}${nodes.length > 1 ? ` · ${nodes.length} noder` : ''}`, ok: nodes.some(n => !n.online) ? C.red : guests0.length && running === guests0.length ? C.green : C.amber,
        headline: !guests0.length ? (N ? 'Noden kjører' : 'Fant ingen Proxmox-node') : running === guests0.length ? 'Alle gjester kjører' : `${running} av ${guests0.length} gjester kjører`,
        subline: [N && N.upS != null ? `Oppe i ${upLong(N.upS)}` : '', W != null ? `${nf(W)} W` : '', c.pve_ip].filter(Boolean).join(' · '),
      };
      const G = N ? [
        this._gauge('CPU', N.cpuV, 100, ' %', c.pve_cpu_navn || (N.loads[0] != null ? `load ${nf(N.loads[0], 2)}` : ''), N.cpuV > 70 ? C.amber : C.blue),
        this._gauge('Minne', N.memV, 100, ' %', N.mu != null && N.mt != null ? `${fmtBs(N.mu)[0]} av ${fmtBs(N.mt).join(' ')}` : N.swapV != null ? `swap ${nf(N.swapV)} %` : '', N.memV > 90 ? C.amber : C.blue),
        N.temp ? this._gauge('Temp', N.tempV, 90, '°', 'CPU-pakke', N.tempV > 58 ? C.red : C.green) : this._gauge('Disk', N.diskV, 100, ' %', 'rot-FS', N.diskV > 85 ? C.amber : C.green),
      ] : null;
      // noder
      const nodeHTML = nodes.map(n => {
        const k = 'node-' + n.key, what = `noden ${n.name}`;
        const acts = this._btns([this._btn(n.btns.reboot, k, 'reboot', what, 'Omstart', 'restart_alt', C.blue, true), this._btn(n.btns.shutdown, k, 'shutdown', what, 'Slå av', 'power_settings_new', C.red, true),
          this._btn(n.btns.start_all, k, 'start_all', `alle gjester på ${n.name}`, 'Start alle', 'play_circle', C.green, true), this._btn(n.btns.stop_all, k, 'stop_all', `alle gjester på ${n.name}`, 'Stopp alle', 'stop_circle', C.red, true)]);
        const lds = n.loads.filter(x => x != null), load = lds.length ? lds.map(x => nf(x, lds.length > 1 ? 1 : 2)).join(' / ') : null;
        return `<div data-key="${e(k)}" style="display:flex;flex-direction:column;gap:12px;padding:14px;border-radius:24px;background:#1c1c1f;min-width:0">
          <div data-hold="moreInfo" data-arg="${e(n.cpu || n.status || '')}" style="display:flex;align-items:center;gap:10px;min-width:0">
            <span style="width:36px;height:36px;border-radius:12px;flex:none;display:grid;place-items:center;background:${a(C.blue, 0.16)};color:${C.blue}"><span class="ms" style="font-size:19px;font-variation-settings:'FILL' 1">dns</span></span>
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(n.name)}</span><span style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(['Proxmox VE' + (n.verV ? ' ' + n.verV : ''), (String(this.v(n.kernel)).match(/^[\d.]+-\d+/) || [])[0] ? 'kjerne ' + String(this.v(n.kernel)).match(/^[\d.]+-\d+/)[0] : ''].filter(Boolean).join(' · '))}</span></div>
            ${this._chip(n.online ? 'Online' : 'Frakoblet', n.online ? C.green : C.red)}
          </div>
          <div style="display:flex;flex-direction:column;gap:5px">${this._mbar('CPU', n.cpuV, pctCol(n.cpuV, 70, 90))}${this._mbar('RAM', n.memV, pctCol(n.memV, 85, 95), n.mu != null && n.mt != null ? `${fmtBs(n.mu)[0]}/${fmtB(n.mt)}` : null)}${n.diskV != null ? this._mbar('Disk', n.diskV, pctCol(n.diskV, 85, 95, C.green)) : ''}${n.swapV != null ? this._mbar('Swap', n.swapV, pctCol(n.swapV, 50, 80, C.blue)) : ''}</div>
          ${this._stats([['Oppetid', n.upS != null ? upLong(n.upS) : null], [n.loads.filter(x => x != null).length > 1 ? 'Load 1/5/15' : 'Load', load], ['Temp', n.tempV != null ? `${nf(n.tempV)}°` : null, tempCol(n.tempV, 60, 75)], ['IO-vent', n.ioV != null ? `${nf1(n.ioV)} %` : null], ['Oppdateringer', n.updV != null ? (n.updV ? `${nf(n.updV)} pakker` : 'Ingen') : null, n.updV ? C.amber : null], ['Varsler', n.stress.length ? (n.stressOn.length ? n.stressOn.length + ' aktive' : 'Ingen') : null, n.stressOn.length ? C.red : null]])}
          ${acts}${this._confHTML(k)}
        </div>`;
      }).join('');
      // gjester: filter og sortering
      const cnt = { alle: guests0.length, on: running, off: guests0.length - running };
      let guests = guests0.filter(g => s.gf === 'on' ? g.on : s.gf === 'off' ? !g.on : true);
      guests = guests.slice().sort(s.gs === 'cpu' ? (x, y) => (y.cpuV ?? -1) - (x.cpuV ?? -1) : s.gs === 'ram' ? (x, y) => (y.mu ?? y.memV ?? -1) - (x.mu ?? x.memV ?? -1) : (x, y) => (+x.vmid || 1e9) - (+y.vmid || 1e9) || x.name.localeCompare(y.name, 'nb'));
      const gRows = guests.map(g => {
        const chip = g.on ? ['Kjører', C.green] : g.paused ? ['Pauset', C.amber] : [g.state && !KD.BAD.has(g.state) && g.state !== 'stopped' ? title(g.state) : 'Stoppet', C.red];
        const what = `${g.kind === 'vm' ? 'VM' : 'LXC'} ${g.name}`, b = g.btns;
        return { k: g.k, name: g.name, icon: iconFor(g.name, g.kind === 'vm' ? 'computer' : 'deployed_code'), tag: `${g.kind}${g.vmid ? ' ' + g.vmid : ''}`, on: g.on || g.paused, col: g.paused ? C.amber : C.blue, chip, more: g.status,
          sub: g.on ? [g.upS != null ? `oppe ${upShort(g.upS)}` : '', g.mu != null ? fmtB(g.mu) + (g.mt ? ` av ${fmtB(g.mt)}` : '') : ''].filter(Boolean).join(' · ') : '',
          bars: g.on ? [['CPU', g.cpuV, pctCol(g.cpuV, 70, 90)], g.memV != null ? ['RAM', g.memV, pctCol(g.memV, 85, 95)] : null] : null,
          act: !g.on && !g.paused ? b.start : null, actIcon: 'play_arrow', actCol: C.green, actVerb: 'Start',
          detail: () => `${this._stats([['Status', title(g.state || '–')], ['Oppetid', g.upS != null ? upLong(g.upS) : null], ['CPU', g.cpuV != null ? `${nf1(g.cpuV)} %` : null], ['Minne', g.mu != null ? fmtB(g.mu) : g.memV != null ? `${nf(g.memV)} %` : null], ['Disk', g.diskV != null ? `${nf(g.diskV)} %` : null, pctCol(g.diskV, 85, 95, null)], ['VMID', g.vmid || null]])}
            ${this._btns(g.on ? [this._btn(b.shutdown, g.k, 'shutdown', what, 'Slå av', 'power_settings_new', C.amber, true), this._btn(b.reboot, g.k, 'reboot', what, 'Omstart', 'restart_alt', C.blue, true), this._btn(b.suspend, g.k, 'suspend', what, 'Pause', 'pause', C.amber, true), this._btn(b.stop, g.k, 'stop', what, 'Tving stopp', 'stop_circle', C.red, true)]
              : g.paused ? [this._btn(b.resume, g.k, 'resume', what, 'Fortsett', 'play_arrow', C.green, false), this._btn(b.stop, g.k, 'stop', what, 'Tving stopp', 'stop_circle', C.red, true)]
              : [this._btn(b.start, g.k, 'start', what, 'Start', 'play_arrow', C.green, false)])}` };
      });
      const filt = guests0.length > 3 ? `<div style="display:flex;gap:8px;padding:0 0 6px;min-width:0"><div style="flex:3;min-width:0">${KD.segHTML('srv-gf', [['alle', `Alle ${cnt.alle}`], ['on', `Kjører ${cnt.on}`], ['off', `Stoppet ${cnt.off}`]], s.gf, 'setGf', { small: true })}</div><div style="flex:2;min-width:0">${KD.segHTML('srv-gs', [['id', 'ID'], ['cpu', 'CPU'], ['ram', 'RAM']], s.gs, 'setGs', { small: true })}</div></div>` : '';
      const store = M.store.map(x => ({ k: 'st-' + x.id, name: x.name, icon: 'hard_drive', more: x.id, sub: x.u != null && x.t != null ? `${fmtB(x.u)} av ${fmtB(x.t)} · ${fmtB(x.t - x.u)} ledig` : '', bar: x.bar, v: x.bar == null ? '' : `${Math.round(x.bar)} %`, vCol: x.bar >= 85 ? C.amber : null }));
      const bk = [];
      const P = N && N.P;
      if (P) {
        const bp = this.st(P + 'backup_progress');
        if (bp && !KD.BAD.has(bp.state)) { const v = num(bp); bk.push({ name: 'Sikkerhetskopi', icon: 'backup', sub: v != null ? (v > 0 && v < 100 ? `Pågår · ${nf(v)} %` : `Sist oppdatert kl. ${hm(bp.last_changed)}`) : String(bp.state), v: v != null && v > 0 && v < 100 ? `${nf(v)} %` : 'OK', col: C.green, bar: v > 0 && v < 100 ? v : null }); }
        const lt = this.st(P + 'last_task');
        if (lt && !KD.BAD.has(lt.state)) { const bad = /error|fail|feil/i.test(lt.state); bk.push({ name: 'Siste oppgave', icon: 'verified', sub: `${lt.state} · kl. ${hm(lt.last_changed)}`, v: bad ? 'Feil' : 'OK', vCol: bad ? C.red : C.green, col: bad ? C.red : C.green }); }
      }
      return `${this._heroHTML(V)}
  ${G ? this._gaugesHTML(G) : ''}
  ${nodeHTML ? `<section data-lay="noder" data-lay-navn="Noder" style="display:flex;flex-direction:column;gap:8px">${nodeHTML}</section>` : ''}
  ${this._sec('VM og LXC', `${running} av ${guests0.length} kjører`, guests0.length ? filt + (this._rows(gRows) || `<div style="padding:14px 4px;font-size:13px;color:#8e8d89">Ingen gjester i dette utvalget</div>`) : '', { key: 'gjester' })}
  ${this._sec('Lagring', `${store.length} ${store.length === 1 ? 'område' : 'områder'}`, this._rows(store), { key: 'lagring' })}
  ${this._sec('Sikkerhetskopi', 'Proxmox VE', this._rows(bk), { key: 'backup' })}`;
    }

    _tabUnraid(U, R) {
      const c = this.config, s = this.state, P = U.P, u = U.u;
      const nameS = String(this.at(P + 'cpu_usage', 'friendly_name', '') || '').replace(/\s*cpu.*$/i, '').trim() || title(u);
      const ver = (String(this.v(P + 'unraid_version')).match(/\d+(\.\d+)*/) || [])[0];
      const upS = this.st(P + 'up_since') || this.st(P + 'uptime');
      const Wid = c.unraid_effekt || [P + 'ups_power', P + 'ups_load_power', P + 'ups_current_power'].find(id => this.st(id));
      const W = Wid ? this.n(Wid) : null;
      const ramU = bytes(this.st(P + 'ram_used')), ramT = bytes(this.st(P + 'ram_total'));
      const arU = bytes(this.st(P + 'array_used')) ?? bytes(this.st(P + 'array_usage_used')), arT = bytes(this.st(P + 'array_total')) ?? bytes(this.st(P + 'array_size'));
      const V = {
        status: `${nameS} · Unraid${ver ? ' ' + ver : ''}`, ok: !R.arrOn ? C.red : R.dockers.every(d => d.on) ? C.green : C.amber,
        headline: R.parRun ? 'Paritetssjekk pågår' : R.arrOn ? 'Arrayet er startet' : 'Arrayet er stoppet',
        subline: R.parRun ? [R.parP != null ? `${nf(R.parP)} %` : '', 'paritetssjekk'].filter(Boolean).join(' · ') : [upS && !KD.BAD.has(upS.state) ? `Oppe i ${upLong(upSec(upS))}` : '', W != null ? `${nf(W)} W` : '', c.unraid_ip].filter(Boolean).join(' · '),
      };
      const G = [
        this._gauge('CPU', R.cpu, 100, ' %', c.unraid_cpu_navn || (R.temp != null ? `${nf(R.temp)}° CPU` : ''), C.blue),
        this._gauge('Minne', R.ram, 100, ' %', ramU != null && ramT != null ? `${fmtBs(ramU)[0]} av ${fmtBs(ramT).join(' ')}` : '', C.blue),
        this._gauge('Array', R.arr, 100, ' %', arU != null && arT != null ? `${fmtBs(arU)[0]} av ${fmtBs(arT).join(' ')}` : '', R.arr >= 90 ? C.red : C.amber),
      ];
      // array + paritet
      const lastP = this.v(P + 'last_parity_check'), lastD = lastP && !isNaN(new Date(lastP)) ? new Date(lastP) : null;
      const dur = this.st(P + 'parity_check_duration') || this.st(P + 'last_parity_check_duration');
      const durV = dur && !KD.BAD.has(dur.state) ? (num(dur) != null ? upLong(upSec(dur)) : String(dur.state)) : null;
      const nextP = this.v(P + 'next_parity_check'), nextD = nextP && !isNaN(new Date(nextP)) ? new Date(nextP) : null;
      const speed = this.st(P + 'parity_check_speed');
      const dt = d => d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
      const parK = 'ur-parity', parOn = U.parity && this.v(U.parity) === 'on';
      const arrHTML = `<div data-key="ur-array" style="display:flex;flex-direction:column;gap:12px;padding:14px;border-radius:24px;background:#1c1c1f;min-width:0">
        <div style="display:flex;align-items:center;gap:10px;min-width:0">
          <span style="width:36px;height:36px;border-radius:12px;flex:none;display:grid;place-items:center;background:${a(C.amber, 0.16)};color:${C.amber}"><span class="ms" style="font-size:19px;font-variation-settings:'FILL' 1">storage</span></span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:500">Array</span><span style="font-size:12px;color:#8e8d89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e([arU != null && arT != null ? `${fmtB(arU)} av ${fmtB(arT)}` : '', `${R.disks.filter(d => !d.par && !d.cache).length} datadisker`].filter(Boolean).join(' · '))}</span></div>
          ${this._chip(R.arrOn ? (R.arrState && !/start/i.test(R.arrState) && !KD.BAD.has(R.arrState) ? title(R.arrState) : 'Startet') : 'Stoppet', R.arrOn ? C.green : C.red)}
        </div>
        ${R.arr != null ? this._mbar('Bruk', R.arr, pctCol(R.arr, 85, 95, C.amber)) : ''}
        <div style="display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:18px;background:#232326">
          <div style="display:flex;align-items:center;gap:10px;min-width:0"><span class="ms" style="font-size:18px;color:${R.parErr ? C.red : R.parRun ? C.amber : C.green};font-variation-settings:'FILL' 1">fact_check</span>
            <span style="flex:1;min-width:0;font-size:14px;font-weight:500">Paritet</span>
            ${this._chip(R.parRun ? 'Pågår' : R.parErr ? `${nf(R.parErr)} feil` : 'Gyldig', R.parRun ? C.amber : R.parErr ? C.red : C.green)}
            ${U.parity && dom(U.parity) === 'switch' ? this._toggleHTML(U.parity, parK, parOn, 'paritetssjekk', true, C.amber, ['Start', 'Avbryt']) : ''}</div>
          ${R.parRun && R.parP != null ? this._mbar('Fremdr.', R.parP, C.amber) : ''}
          ${this._stats([['Sist kjørt', lastD ? dt(lastD) : null], ['Feil', R.parErr != null ? nf(R.parErr) : null, R.parErr ? C.red : null], ['Varighet', durV], ['Fart', speed && !KD.BAD.has(speed.state) ? `${speed.state} ${speed.attributes.unit_of_measurement || ''}`.trim() : null], ['Neste', nextD ? dt(nextD) : null]]).replace(/#232326/g, '#2a2a2d')}
        </div>
        ${this._confHTML(parK)}
      </div>`;
      if (U.parity && dom(U.parity) === 'switch') this._cm[U.parity].confirm = true; // både start og avbryt bekreftes
      const DT = +c.grense_disktemp || 50;
      const disks = R.disks.map(d => ({ k: 'disk-' + d.key, name: d.name, icon: d.cache ? 'memory' : d.par ? 'shield' : 'hard_drive', col: d.par ? '#8e8d89' : d.cache ? C.blue : C.amber, on: !d.spun, more: d.use || d.temp,
        chip: d.t != null ? [`${nf(d.t)}°`, tempCol(d.t, DT - 5, DT)] : d.spun ? ['Hviler', '#8e8d89'] : null,
        sub: d.par ? ['Paritet', d.tot != null ? fmtB(d.tot) : '', d.model].filter(Boolean).join(' · ') : [d.used != null && d.tot != null ? `${fmtB(d.used)} av ${fmtB(d.tot)}` : d.tot != null ? fmtB(d.tot) : '', d.fs, d.spun ? 'spunnet ned' : ''].filter(Boolean).join(' · '),
        bar: d.par ? null : d.bar, barCol: pctCol(d.bar, 85, 95, d.cache ? C.blue : C.amber), v: d.par ? '' : d.bar == null ? '' : `${Math.round(d.bar)} %`, vCol: d.bar >= 85 ? C.amber : null }));
      // Docker
      const qb = c.qbit || 'sensor.qbittorrent_';
      const qbSub = () => { const d = this.st(qb + 'download_speed'), up = this.st(qb + 'upload_speed'); if (!d || KD.BAD.has(d.state)) return ''; const rate = s => { const v = num(s); if (v == null) return '–'; const uu = String(s.attributes.unit_of_measurement || 'B/s').toLowerCase(); const f = uu.startsWith('gi') ? 1073741824 : uu.startsWith('mi') ? 1048576 : uu.startsWith('ki') ? 1024 : uu.startsWith('g') ? 1e9 : uu.startsWith('m') ? 1e6 : uu.startsWith('k') ? 1e3 : 1; const b = v * (uu.includes('bit') ? f / 8 : f); return b >= 1e6 ? `${nf1(b / 1e6)} MB/s` : `${nf(b / 1e3)} kB/s`; }; return `↓ ${rate(d)} · ↑ ${rate(up)}`; };
      const dOn = R.dockers.filter(d => d.on).length;
      const dl = R.dockers.filter(d => s.df === 'on' ? d.on : s.df === 'off' ? !d.on : true);
      const dRows = dl.map(d => ({ k: 'dk-' + d.key, name: d.name, icon: iconFor(d.key + ' ' + d.name, 'deployed_code'), on: d.on, more: d.id,
        chip: d.hasUpd ? ['Oppdatering', C.amber] : null,
        sub: d.gone ? 'Svarer ikke' : d.on ? ([/qbit|torrent/i.test(d.key) ? qbSub() : ''].filter(Boolean).join(' · ') || (d.cpuV == null && d.memV == null ? 'Kjører' : '')) : 'Stoppet', warn: !d.on,
        bars: d.on && (d.cpuV != null || d.memV != null) ? [d.cpuV != null ? ['CPU', d.cpuV, pctCol(d.cpuV, 70, 90), `${nf1(d.cpuV)} %`] : null, d.memV != null ? ['RAM', d.memV, pctCol(d.memV, 85, 95), `${nf1(d.memV)} %`] : null] : null,
        tog: d.id, togOn: d.on, togConfirm: true, togCol: C.green, togVerbs: ['Start', 'Stopp'],
        detail: (d.restart || d.hasUpd) ? () => this._btns([d.on ? this._btn(d.restart, 'dk-' + d.key, 'reboot', `containeren ${d.name}`, 'Omstart', 'restart_alt', C.blue, true) : '', d.hasUpd ? this._btn(d.upd, 'dk-' + d.key, 'upd', `${d.name} (${this.at(d.upd, 'latest_version', 'ny versjon')})`, 'Oppdater', 'download', C.amber, true) : '']) : null }));
      const dFilt = R.dockers.length > 4 ? `<div style="padding:0 0 6px">${KD.segHTML('srv-df', [['alle', `Alle ${R.dockers.length}`], ['on', `Kjører ${dOn}`], ['off', `Stoppet ${R.dockers.length - dOn}`]], s.df, 'setDf', { small: true })}</div>` : '';
      // VM-er
      const vmRows = U.vms.map(vm => { const on = this.v(vm.id) === 'on'; return { k: 'uvm-' + vm.id, name: vm.name, icon: iconFor(vm.name, 'computer'), tag: 'vm', chip: on ? ['Kjører', C.green] : ['Stoppet', C.red], on, more: vm.id, tog: vm.id, togOn: on, togConfirm: true, togCol: C.green, togVerbs: ['Start', 'Stopp'] }; });
      // system / UPS / handlinger
      const sys = this._stats([['CPU-temp', R.temp != null ? `${nf(R.temp)}°` : null, tempCol(R.temp, 60, 75)], ['Hovedkort', R.mobo != null ? `${nf(R.mobo)}°` : null, tempCol(R.mobo, 50, 65)], ['Oppetid', upS && !KD.BAD.has(upS.state) ? upLong(upSec(upS)) : null], ['Flash', this.n(P + 'flash_usage') != null ? `${nf(this.n(P + 'flash_usage'))} %` : null], ['Logg', this.n(P + 'log_usage') != null ? `${nf(this.n(P + 'log_usage'))} %` : null], ['Effekt', W != null ? `${nf(W)} W` : null]]);
      const ups = (R.upsB != null || R.upsStatus) ? `<div style="display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:24px;background:#1c1c1f">
          <div style="display:flex;align-items:center;gap:10px"><span class="ms" style="font-size:20px;color:${C.green};font-variation-settings:'FILL' 1">battery_charging_full</span><span style="flex:1;font-size:14px;font-weight:500">UPS</span>${this._chip(R.upsStatus && !KD.BAD.has(R.upsStatus) ? R.upsStatus : 'Tilkoblet', /batt/i.test(R.upsStatus) ? C.red : C.green)}</div>
          ${this._mbar('Batteri', R.upsB, R.upsB != null && R.upsB < 30 ? C.red : C.green)}${R.upsLoad != null ? this._mbar('Last', R.upsLoad, pctCol(R.upsLoad, 70, 90)) : ''}
          ${this._stats([['Kjøretid', R.upsRt != null ? `${nf(R.upsRt)} min` : null], ['Effekt', W != null ? `${nf(W)} W` : null]])}</div>` : '';
      const acts = [];
      if (U.mover) { const on = this.v(U.mover) === 'on'; acts.push(dom(U.mover) === 'button' ? { name: 'Mover', icon: 'move_down', sub: 'Flytt fra cache til array', col: C.blue, act: U.mover, actIcon: 'play_arrow', actCol: C.blue, actVerb: 'Start', actConfirm: true } : { name: 'Mover', icon: 'move_down', sub: on ? 'Flytter fra cache til array' : 'Venter', col: C.blue, on, tog: U.mover, togOn: on, togConfirm: true }); }
      if (this.st(c.qbit_sparefart)) { const on = this.v(c.qbit_sparefart) === 'on'; acts.push({ name: 'Sparefart', icon: 'speed', sub: on ? 'qBittorrent · alternativ hastighet på' : 'qBittorrent · full hastighet', col: C.amber, on, tog: c.qbit_sparefart, togOn: on }); }
      if (U.check) acts.push({ name: 'Se etter oppdateringer', icon: 'update', sub: 'Docker-containere', col: C.blue, act: U.check, actIcon: 'refresh', actCol: C.blue, actVerb: 'Sjekk' });
      return `${this._heroHTML(V)}
  ${this._gaugesHTML(G)}
  <section data-lay="array" data-lay-navn="Array og paritet" style="display:flex;flex-direction:column;gap:8px">${arrHTML}</section>
  ${this._sec('Disker', `${R.disks.length} ${R.disks.length === 1 ? 'disk' : 'disker'}`, this._rows(disks), { key: 'disker' })}
  ${this._sec('Docker', `${dOn} av ${R.dockers.length} kjører`, R.dockers.length ? dFilt + this._rows(dRows) : '', { key: 'docker' })}
  ${this._sec('Virtuelle maskiner', `${U.vms.filter(v => this.v(v.id) === 'on').length} kjører`, this._rows(vmRows), { key: 'vm' })}
  ${this._sec('System', 'temperatur og oppetid', sys, { key: 'system', gap: 0 })}
  ${ups ? `<section data-lay="ups" data-lay-navn="UPS">${ups}</section>` : ''}
  ${this._sec('Handlinger', 'unraid-integrasjon', this._rows(acts), { key: 'handl' })}`;
    }

    _tabUnifi(UF, M) {
      const c = this.config, gw = UF.gw, g = UF.gwSlug, devs = M.devs;
      const down = devs.filter(d => !d.on).length;
      const lat = { cloudflare: this.n(`sensor.${g}_cloudflare_wan_latency`), google: this.n(`sensor.${g}_google_wan_latency`) };
      const sd = this.n(c.speedtest_ned), su = this.n(c.speedtest_opp);
      const apCl = devs.filter(d => d.type === 2).reduce((s, d) => s + (d.kl || 0), 0);
      const V = {
        status: `UniFi Network${gw ? ' · ' + gw.name : ''}`, ok: !devs.length ? C.amber : down ? C.red : C.green,
        headline: !devs.length ? 'Fant ingen UniFi-enheter' : down ? `${down} ${down === 1 ? 'enhet svarer' : 'enheter svarer'} ikke` : M.ping != null && M.ping > 100 ? 'Høy latens på WAN' : 'Nettet er friskt',
        subline: [M.gwD && M.gwD.upS != null ? `WAN oppe ${upLong(M.gwD.upS)}` : '', [c.isp, sd != null && su != null ? `${nf(sd)}/${nf(su)}` : ''].filter(Boolean).join(' ')].filter(Boolean).join(' · '),
      };
      const G = [
        this._gauge('Klienter', M.clients, Number(c.klienter_maks) || 80, '', apCl ? `${nf(apCl)} trådløst` : 'tilkoblet', C.blue),
        this._gauge('Ping', M.ping, 40, ' ms', M.pk === 'cloudflare' ? '1.1.1.1' : M.pk === 'google' ? '8.8.8.8' : 'Speedtest', M.ping > 100 ? C.red : C.green),
        this._gauge('Gateway', M.gwD ? M.gwD.cpuV : null, 100, ' %', 'CPU', C.blue),
      ];
      const wan = this._stats([['Cloudflare', lat.cloudflare != null ? `${nf(lat.cloudflare)} ms` : null], ['Google', lat.google != null ? `${nf(lat.google)} ms` : null], ['Speedtest-ping', this.n(c.speedtest_ping) != null ? `${nf(this.n(c.speedtest_ping))} ms` : null],
        ['Ned', sd != null ? `${nf(sd)} Mbit/s` : null], ['Opp', su != null ? `${nf(su)} Mbit/s` : null], ['WAN-IP', this.ok(`sensor.${g}_wan_ip`) ? this.v(`sensor.${g}_wan_ip`) : null]]);
      const TYP = ['Gateway', 'Switch', 'Aksesspunkt'];
      const dRows = devs.map(d => {
        const k = 'uf-' + d.slug, what = d.name;
        return { k, name: d.name, icon: ['router', 'lan', 'wifi'][d.type], on: d.on, col: C.green, more: d.tracker,
          chip: !d.on ? ['Frakoblet', C.red] : d.fwNew ? ['Oppdatering', C.amber] : null,
          sub: !d.on ? 'Svarer ikke' : [TYP[d.type], d.kl != null ? `${nf(d.kl)} klienter` : '', d.upS != null ? `oppe ${upShort(d.upS)}` : ''].filter(Boolean).join(' · '),
          bars: d.on ? [['CPU', d.cpuV, pctCol(d.cpuV, 70, 90, C.green)], d.memV != null ? ['RAM', d.memV, pctCol(d.memV, 85, 95, C.green)] : null] : null,
          detail: () => {
            const ports = d.ports.slice(0, Math.max(Number(c.poe_maks) || 8, 24)).map(p => {
              const on = this.v(p) === 'on', n = (p.match(/_port_(\d+)/) || [])[1], w = this.n(`sensor.${obj(p).replace(/_poe$/, '')}_poe_power`);
              this._A(p, k, on ? 'Slå av PoE' : 'Slå på PoE', `på port ${n} (${this.fname(p).replace(/\s*poe\s*$/i, '')})`, on, on ? C.red : C.green);
              return `<button data-on-click="ask" data-arg="${e(p)}" data-hold="moreInfo" style="min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:8px 10px;border-radius:14px;background:${on ? a(C.amber, 0.14) : '#232326'};box-shadow:${this.state.conf === p ? `inset 0 0 0 1px ${C.red}` : 'none'};text-align:left">
                <span style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:${on ? C.amber : '#8e8d89'}"><span class="ms" style="font-size:14px;font-variation-settings:'FILL' ${on ? 1 : 0}">bolt</span>${e(n)}</span>
                <span style="font-size:11px;color:#8e8d89;font-variant-numeric:tabular-nums;white-space:nowrap">${on ? (w != null ? `${nf1(w)} W` : 'PoE på') : 'av'}</span></button>`;
            }).join('');
            return `${this._stats([['Type', TYP[d.type]], ['Klienter', d.kl != null ? nf(d.kl) : null], ['Oppetid', d.upS != null ? upLong(d.upS) : null], ['CPU', d.cpuV != null ? `${nf(d.cpuV)} %` : null], ['Minne', d.memV != null ? `${nf(d.memV)} %` : null], ['Temp', d.tempV != null ? `${nf(d.tempV)}°` : null, tempCol(d.tempV, 70, 85)], ['Fastvare', d.fwV || null], ['Ny versjon', d.fwNew || null, C.amber]])}
              ${ports ? `<div style="display:flex;flex-direction:column;gap:6px"><span style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8e8d89">PoE-porter · trykk for å slå av/på</span><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px">${ports}</div></div>` : ''}
              ${this._btns([this._btn(d.restart, k, 'restart', what, 'Omstart', 'restart_alt', C.blue, true), d.fwNew ? this._btn(d.fw, k, 'fw', `fastvare ${d.fwNew} på ${what}`, 'Installer fastvare', 'download', C.amber, true) : ''])}`;
          } };
      });
      const wl = this._wlans().map(id => { const on = this.v(id) === 'on', cl = this.n(`sensor.${obj(id)}_clients`); return { k: 'wl-' + id, name: this.fname(id), icon: on ? 'wifi' : 'wifi_off', col: C.blue, on, more: id, sub: on ? (cl != null ? `${nf(cl)} klienter` : 'Sender') : 'Av', tog: id, togOn: on, togConfirm: true, togCol: C.green }; });
      const upd = M.upds.filter(u => devs.some(d => d.fw === u.id) || (this._reg()[u.id] || {}).platform === 'unifi');
      return `${this._heroHTML(V)}
  ${this._gaugesHTML(G)}
  ${this._speedHTML()}
  ${this._sec('WAN', gw ? gw.name : 'ruter', wan, { key: 'wan', gap: 0 })}
  ${this._sec('Enheter', `${devs.length - down} av ${devs.length} tilkoblet`, this._rows(dRows), { key: 'enheter' })}
  ${this._sec('Wi-Fi-nett', `${wl.filter(w => w.on).length} aktive`, this._rows(wl), { key: 'wifi' })}
  ${this._sec('Fastvare', `${upd.length} klare`, this._rows(this._updRows(upd)), { key: 'fastvare' })}`;
    }
    /** Klienter med rx/tx-sensorer fra UniFi (valgfrie, av som standard i HA) */
    _topClients() {
      const R = this._reg(), per = {};
      for (const id of this._unifiReg()) {
        if (dom(id) !== 'sensor') continue;
        const m = obj(id).match(/^(.+)_(rx|tx)$/); if (!m) continue;
        const k = R[id].device_id || m[1];
        const p = (per[k] = per[k] || { key: m[1], sum: 0, unit: this.unit(id) });
        p.sum += this.n(id, 0); p.id = p.id || id;
      }
      return Object.values(per).filter(p => p.sum > 0).sort((x, y) => y.sum - x.sum).slice(0, 4).map(p => {
        const dev = this._devs()[(R[p.id] || {}).device_id]; const name = (dev && (dev.name_by_user || dev.name)) || title(p.key);
        return { name, icon: iconFor(name, /iphone|phone|pixel|galaxy/i.test(name) ? 'smartphone' : /mac|laptop|book/i.test(name) ? 'laptop_mac' : /tv/i.test(name) ? 'tv' : 'devices'), sub: 'Klient', v: `${nf1(p.sum)} ${p.unit}` };
      });
    }

    _tabNett(UF) {
      const c = this.config, R = this._reg(), S = this._hass.states;
      const reg = this._unifiReg();
      const infra = new Set(UF.list.map(d => d.tracker));
      const infraDev = new Set(UF.list.map(d => (R[d.tracker] || {}).device_id).filter(Boolean));
      const isUnifiTr = id => id && S[id] && !infra.has(id) && ((R[id] && R[id].platform === 'unifi') || ['essid', 'ap_mac', 'is_wired'].some(k => k in (S[id].attributes || {})));
      let phones = [];
      for (const pid of this._ids().filter(id => id.startsWith('person.'))) for (const t of (this.at(pid, 'device_trackers', []) || [])) if (isUnifiTr(t) && !phones.includes(t)) phones.push(t);
      if (!phones.length) phones = reg.filter(id => dom(id) === 'device_tracker' && !infra.has(id) && /iphone|phone|pixel|galaxy|android/i.test(this.fname(id)));
      const clientTr = reg.filter(id => dom(id) === 'device_tracker' && !infra.has(id));
      const macName = {};
      for (const d of UF.list) { const mac = this.at(d.tracker, 'mac', ''); if (mac) macName[String(mac).toLowerCase()] = d.name; }
      const pres = phones.map(id => {
        const on = this.v(id) === 'home', at = (this.st(id) || {}).attributes || {};
        const ap = at.ap_mac ? macName[String(at.ap_mac).toLowerCase()] : '';
        return { k: 'pr-' + id, name: this.fname(id), icon: 'smartphone', on, col: C.green, more: id, chip: on ? ['Hjemme', C.green] : ['Borte', '#8e8d89'], sub: on ? ([ap, at.essid].filter(Boolean).join(' · ') || (at.is_wired ? 'Kablet' : 'Tilkoblet')) : `Sist sett kl. ${hm((this.st(id) || {}).last_changed)}` };
      });
      const wl = new Set(this._wlans());
      const sw = reg.filter(id => dom(id) === 'switch');
      const pn = id => +((id.match(/_port_(\d+)/) || [])[1] || 0), poe = sw.filter(id => /port_\d+_poe$|_poe$/.test(obj(id))).sort((x, y) => x.slice(0, x.indexOf('_port_')).localeCompare(y.slice(0, y.indexOf('_port_'))) || pn(x) - pn(y));
      const blocks = Array.isArray(c.blokker) ? c.blokker.filter(id => this.st(id)) : sw.filter(id => !poe.includes(id) && !wl.has(id) && !infraDev.has((R[id] || {}).device_id) && !/wlan|wifi|ssid|dpi|restrict|forward|traffic|rule|outlet|led|vpn|port_\d/.test(obj(id)));
      const last = reg.reduce((m, id) => Math.max(m, new Date((S[id] || {}).last_updated || 0).getTime()), 0);
      const poeDev = (() => { const id = poe[0]; const dev = id && this._devs()[(R[id] || {}).device_id]; return (dev && (dev.name_by_user || dev.name)) || 'UniFi'; })();
      const poeW = id => { const p = this.n(`sensor.${obj(id).replace(/_poe$/, '')}_poe_power`); return p != null ? ` · ${nf1(p)} W` : ''; };
      const alive = reg.some(id => this.ok(id));
      const home = clientTr.filter(id => this.v(id) === 'home').length;
      const V = {
        status: 'UniFi Network · integrasjon i Home Assistant', ok: alive ? C.green : C.amber,
        headline: !reg.length ? 'Fant ikke UniFi-integrasjonen' : `${nf(home)} ${home === 1 ? 'klient' : 'klienter'} tilkoblet`,
        subline: reg.length ? `Oppdatert for ${agoTxt(last)} · ${reg.length} entiteter` : 'Krever UniFi Network-integrasjonen',
      };
      const G = [
        this._gauge('Sporere', home, Math.max(1, clientTr.length), '', 'hjemme', C.green),
        this._gauge('Blokkert', blocks.filter(id => this.v(id) === 'off').length, Math.max(1, blocks.length), '', 'klienter', C.red),
        this._gauge('PoE', poe.filter(id => this.v(id) === 'on').length, Math.max(1, poe.length), '', 'porter på', C.amber),
      ];
      const top = this._topClients();
      return `${this._heroHTML(V)}
  ${this._gaugesHTML(G)}
  ${this._sec('Tilstedeværelse', 'device_tracker', this._rows(pres), { key: 'pres' })}
  ${this._sec('Blokker klient', `${blocks.filter(id => this.v(id) === 'off').length} blokkert`, this._rows(blocks.map(id => { const bl = this.v(id) === 'off'; return { k: 'bl-' + id, name: this.fname(id), icon: 'block', more: id, sub: bl ? 'Blokkert i UniFi' : 'Tillatt', on: bl, col: C.red, tog: id, togOn: bl, togCol: C.red, togConfirm: false }; })), { key: 'blokk' })}
  ${this._sec('PoE-porter', poeDev, this._rows(poe.slice(0, Number(c.poe_maks) || 8).map(id => { const on = this.v(id) === 'on'; return { k: 'poe-' + id, name: this.fname(id).replace(/\s*poe\s*$/i, ''), icon: 'power', more: id, sub: on ? `PoE på${poeW(id)}` : 'PoE av', on, col: C.amber, tog: id, togOn: on, togConfirm: true, togCol: C.amber }; })), { key: 'poe' })}
  ${this._sec('Topp klienter', 'nå', this._rows(top), { key: 'topp' })}`;
    }

    body() {
      const s = this.state, c = this.config;
      this._cm = {}; this._mi = {};
      const UF = this._unifi(), U = this._unraid(), nodes = this._pveNodes(), pg = this._pveGuests();
      const has = { pve: nodes.length > 0 || pg.length > 0, unraid: !!U, unifi: UF.list.length > 0 || !!UF.gwSlug, ha: this._unifiReg().length > 0 || UF.list.length > 0 };
      has.oversikt = (has.pve + has.unraid + has.unifi) >= 1;
      const all = [['oversikt', 'Oversikt', 'monitor_heart'], ['pve', 'Proxmox', 'deployed_code'], ['unraid', 'Unraid', 'storage'], ['unifi', 'UniFi', 'router'], ['ha', 'Nettverk', 'lan']];
      const want = Array.isArray(c.faner) && c.faner.length ? c.faner.map(x => x === 'nett' ? 'ha' : x) : null;
      let tabs = want ? all.filter(t => want.includes(t[0])) : all.filter(t => has[t[0]]);
      if (!tabs.length) tabs = [all[1]];
      const tabK = tabs.some(t => t[0] === s.tab) ? s.tab : tabs[0][0];
      // modeller (bare det som trengs)
      const needAll = tabK === 'oversikt';
      const M = {};
      if (has.pve && (needAll || tabK === 'pve')) M.pve = { nodes: nodes.map(n => this._nV(n)), guests: pg.map(g => this._gV(g)), store: this._pveStorage().map(x => ({ ...x, bar: this.n(x.id), u: bytes(this.st(x.used)), t: bytes(this.st(x.total)) })) };
      if (U && (needAll || tabK === 'unraid')) M.ur = this._urV(U);
      if ((UF.list.length || UF.gwSlug) && (needAll || tabK === 'unifi')) {
        const devs = this._ufV(UF), g = UF.gwSlug;
        const lat = { cloudflare: this.n(`sensor.${g}_cloudflare_wan_latency`), google: this.n(`sensor.${g}_google_wan_latency`) };
        const pk = (c.ping_mal === 'google' ? ['google', 'cloudflare'] : ['cloudflare', 'google']).find(k => lat[k] != null);
        const gwD = devs.find(d => UF.gw && d.slug === UF.gw.slug);
        const gwCl = gwD && gwD.kl != null ? gwD.kl : this.n(`sensor.${g}_clients`);
        M.uf = { devs, gwD, pk, ping: pk ? lat[pk] : this.n(c.speedtest_ping), clients: gwCl != null ? gwCl : devs.reduce((x, d) => x + (d.kl || 0), 0) };
      }
      M.upds = this._updates(U, UF);
      if (M.uf) M.uf.upds = M.upds;
      let content;
      if (tabK === 'oversikt') content = this._tabOversikt(M, this._health(M));
      else if (tabK === 'unraid' && U) content = this._tabUnraid(U, M.ur);
      else if (tabK === 'unifi') content = this._tabUnifi(UF, M.uf || { devs: [], clients: null, ping: null, upds: [] }) ;
      else if (tabK === 'ha') content = this._tabNett(UF);
      else content = this._tabPve(M.pve || { nodes: [], guests: [], store: [] });
      const tabBar = tabs.length > 1 ? `<div data-lay-skip="1" data-key="srv-tabs" style="min-width:0">${KD.segHTML('srv-tab', tabs.map(t => [t[0], t[1], tabs.length > 4 ? null : t[2]]), tabK, 'goTab', { pink: true, h: 40 })}</div>` : '';
      return `<div style="box-sizing:border-box;width:100%;max-width:var(--kd-bredde,100%);overflow-x:clip;min-height:100vh;margin:0 auto;background:transparent;padding:20px var(--kd-kant,10px) 40px;display:flex;flex-direction:column;gap:20px">
  <header style="display:flex;align-items:center;gap:12px">
    <span style="width:40px;height:40px;border-radius:20px;background:#e9e8e4;color:#141416;display:grid;place-items:center;flex:none"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">dns</span></span>
    <div style="flex:1;font-size:26px;font-weight:500;letter-spacing:-0.02em">Server</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>
  ${tabBar}
  ${content}
</div>`;
    }
  }

  KD.define('kd-server-card', KDServerCard, 'KD Server', 'Proxmox, Unraid, UniFi og nettverk – oversikt, helsevarsler og styring');
  KD.sheet('server', 'kd-server-card');
})();
