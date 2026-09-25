/*
 * kd-server-card – pikselkopi av Claude Design «Server» (Proxmox · Unraid · UniFi · HA).
 *
 *   type: custom:kd-server-card        # virker uten mer: alt under er standardverdier
 *   pve_node: sensor.1_node_pve_       # prefiks for Proxmox-noden (Proxmox Extended Sensors)
 *   unraid: d_day_darling              # prefiks for Unraid-integrasjonen (uten «sensor.»)
 *   unifi_gateway: ''                  # slug for ruteren; tom = finnes selv (den med *_wan_latency)
 *   speedtest_ned / speedtest_opp / speedtest_ping, qbit_sparefart
 *   pve_ip, unraid_ip, isp, pve_cpu_navn, unraid_cpu_navn, pve_effekt, unraid_effekt, pve_temp
 *   navn_map: { "102": "Plex" }        # penere navn på gjester/containere (vmid eller nøkkel)
 *   blokker: [switch.x]                # UniFi-klienter som kan blokkeres (tom = finnes selv)
 *   faner: [pve, unraid, unifi, ha]    # hvilke faner (tom = de som har data)
 *
 * Oppdager selv: Proxmox-gjester (sensor.N_ct_…_status / sensor.N_vm_…_status + start/stopp-knapper), lagring
 * (sensor.N_storage_*_usage), Unraid-containere/VM-er/disker, UniFi-enheter (device_tracker + *_uptime),
 * og via entitetsregisteret UniFi-sporere, blokk- og PoE-brytere og fastvareoppdateringer.
 */
(() => {
  const KD = window.KD; if (!KD) return;
  const C = { green: 'oklch(0.8 0.12 150)', blue: 'oklch(0.8 0.12 250)', amber: 'oklch(0.82 0.12 75)', red: 'oklch(0.72 0.15 25)', pink: 'oklch(0.78 0.13 350)' };
  const a = (c, o) => c.replace(')', ` / ${o})`);
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

  class KDServerCard extends KD.KDSheet {
    static head = ['dns', 'Server', 'Proxmox · UniFi'];
    static defaults = {
      pve_node: 'sensor.1_node_pve_', pve_temp: '', pve_effekt: 'sensor.server_rack_power', pve_ip: '', pve_cpu_navn: '',
      unraid: 'd_day_darling', unraid_effekt: '', unraid_ip: '', unraid_cpu_navn: '',
      unifi_gateway: '', isp: '', klienter_maks: 80, ping_mal: 'cloudflare',
      speedtest_ned: 'sensor.speedtest_download', speedtest_opp: 'sensor.speedtest_upload', speedtest_ping: 'sensor.speedtest_ping',
      qbit_sparefart: 'switch.qbittorrent_alternative_speed', qbit: 'sensor.qbittorrent_',
      navn_map: {}, blokker: null, faner: null, poe_maks: 8,
    };
    constructor() { super(); this.state = { tab: null }; }

    /* ---------------- oppdagelse ---------------- */
    _ids() { const S = this.all(); if (this._idsN !== this._hass.states) { this._idsN = this._hass.states; this._idList = Object.keys(S); } return this._idList; }
    _reg() { return (this._hass && this._hass.entities) || {}; }
    _devs() { return (this._hass && this._hass.devices) || {}; }
    _nm(k, def) { const m = this.config.navn_map || {}; return m[k] || def; }

    /** Proxmox: noden */
    _pveNode() {
      const P = this.config.pve_node || '';
      const name = (P.match(/_node_(.+?)_?$/) || [])[1] || 'pve';
      const has = this._ids().some(id => id.startsWith(P));
      return { P, name, has };
    }
    /** Proxmox: gjester fra sensor.N_(ct|vm)_<nøkkel>_status */
    _pveGuests() {
      if (this._pgS === this._hass.states && this._pgC) return this._pgC;
      this._pgS = this._hass.states;
      const out = [];
      for (const id of this._ids()) {
        const m = id.match(/^sensor\.(\d+)_(ct|lxc|vm|qemu)_(.+)_status$/); if (!m) continue;
        const [, n, k, key] = m, kind = /ct|lxc/.test(k) ? 'lxc' : 'vm', base = `${n}_${k}_${key}_`;
        const vmid = (key.match(/_(\d{2,})$/) || [])[1] || '';
        const raw = key.replace(/_\d{2,}$/, '');
        let name = String(this.at(id, 'friendly_name', '') || '').replace(/\s*status\s*$/i, '').replace(/\(?\b\d{3,}\b\)?/g, '').replace(/^\s*(lxc|ct|vm|qemu)\b\s*[-:]?\s*/i, '').trim() || title(raw);
        name = this._nm(vmid, this._nm(raw, name));
        const btn = (re) => this._ids().find(b => b.startsWith(`button.${base}`) && re.test(b.slice(7 + base.length)));
        out.push({ id, kind, vmid, key: raw, name, base: `sensor.${base}`, start: btn(/^start/), stop: btn(/^shutdown/) || btn(/^stop/) });
      }
      return (this._pgC = out.sort((x, y) => (+x.vmid || 1e9) - (+y.vmid || 1e9) || x.name.localeCompare(y.name, 'nb')));
    }
    _pveStorage() {
      const out = [];
      for (const id of this._ids()) {
        const m = id.match(/^sensor\.(\d+)_storage_(.+)_usage$/); if (!m) continue;
        const base = `sensor.${m[1]}_storage_${m[2]}_`;
        const name = this._nm(m[2], String(this.at(id, 'friendly_name', '') || '').replace(/\s*(usage|bruk)\s*$/i, '').replace(/^\s*storage\s*/i, '').trim() || m[2].replace(/_/g, '-'));
        out.push({ id, name, used: base + 'used', total: base + 'total' });
      }
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
        return { id, key: k, name: nm, upd: `update.${obj(id)}_update`, cpu: `sensor.${u}_container_${k}_cpu_usage`, mem: `sensor.${u}_container_${k}_memory_usage` };
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
        out.push({ slug, name, type, tracker: id, up: `sensor.${slug}_uptime${sfx}`, cpu, mem: `sensor.${slug}_memory_utilisation${sfx}`, clients: `sensor.${slug}_clients`, fw: `update.${slug}_firmware`, temp: `sensor.${slug}_cpu_temperature${sfx}` });
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

    /* ---------------- hendelser ---------------- */
    goTab(ev, k) { this.setState({ tab: k }); }
    act(ev, id) { if (!id) return; const d = dom(id); if (d === 'button') this.press(id); else if (d === 'update') this.call('update', 'install', { entity_id: id }); else this.toggle(id); }
    tog(ev, id) { if (id) this.toggle(id); }

    /* ---------------- visninger ---------------- */
    _gauge(label, v, max, unit, sub, col) {
      const vv = v == null || isNaN(v) ? 0 : v;
      return { label, sub, v: v == null || isNaN(v) ? '–' : `${nf(v)}${unit}`, ring: { position: 'relative', width: 72, height: 72, borderRadius: '50%', background: `conic-gradient(${col} ${Math.max(0, Math.min(1, vv / max)) * 360}deg, #2a2a2d 0)`, transition: 'background .6s' } };
    }
    _item(o, i) {
      const on = o.on ?? true, col = o.col || C.blue;
      return {
        name: o.name, icon: o.icon, sub: o.sub || '', v: o.v || '', tagT: o.tag || '', act: o.act, tog: o.tog, btnIcon: o.btnIcon || '',
        row: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' },
        iconWrap: { width: 36, height: 36, borderRadius: 12, flex: 'none', display: 'grid', placeItems: 'center', background: on ? a(col, 0.16) : '#1f1f22', color: on ? col : '#6d6c69' },
        tag: { display: o.tag ? 'inline-block' : 'none', fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 6, background: o.tagCol ? a(o.tagCol, 0.18) : '#2a2a2d', color: o.tagCol || '#a9a7a2', textTransform: 'uppercase', letterSpacing: '0.04em' },
        subStyle: { display: o.sub ? 'block' : 'none', fontSize: 12, color: o.warn ? C.red : '#8e8d89', fontVariantNumeric: 'tabular-nums' },
        barWrap: { display: o.bar != null ? 'block' : 'none', height: 4, borderRadius: 2, background: '#2a2a2d', overflow: 'hidden' },
        bar: { display: 'block', width: `${o.bar || 0}%`, height: '100%', background: (o.bar || 0) > 85 ? C.amber : col },
        vStyle: { display: o.v ? 'block' : 'none', fontSize: 13, fontWeight: 500, color: '#c9c7c2', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
        btn: { display: o.act ? 'grid' : 'none', width: 36, height: 36, borderRadius: 18, flex: 'none', placeItems: 'center', background: '#1f1f22', color: o.btnCol || '#c9c7c2' },
        track: { display: o.tog ? 'block' : 'none', position: 'relative', width: 44, height: 26, borderRadius: 13, flex: 'none', background: o.togOn ? C.pink : '#3a3a3d', transition: 'background .2s' },
        knob: { position: 'absolute', top: 3, left: o.togOn ? 21 : 3, width: 20, height: 20, borderRadius: 10, background: '#f4f3ef', transition: 'left .2s' },
      };
    }
    _group(title, meta, list) { return list.length ? { title, meta, items: list.map((o, i) => this._item(o, i)) } : null; }

    _pve() {
      const c = this.config, N = this._pveNode(), P = N.P;
      const guests = this._pveGuests().map(g => {
        const st = this.v(g.id).toLowerCase(), on = st === 'running';
        const cpu = this.n(g.base + 'cpu_usage'), ram = fmtB(bytes(this.st(g.base + 'ram_used'))), up = upShort(upSec(this.st(g.base + 'uptime')));
        return { ...g, on, cpu, ram, up, state: st };
      });
      const running = guests.filter(g => g.on).length;
      const ver = (String(this.v(P + 'pve_version')).match(/\d+\.\d+/) || [])[0];
      const cpu = this.n(P + 'cpu_usage'), mem = this.n(P + 'memory_usage');
      const memU = bytes(this.st(P + 'memory_used')), memT = bytes(this.st(P + 'memory_total'));
      const tempId = c.pve_temp || this._ids().find(id => id.startsWith(P) && /temp/.test(id)) || '';
      const temp = tempId ? this.n(tempId) : null;
      const load = this.n(P + 'load_average_1m'), swap = this.n(P + 'swap_usage'), root = this.n(P + 'root_filesystem_usage');
      const W = c.pve_effekt ? this.n(c.pve_effekt) : null;
      const store = this._pveStorage().map(s => {
        const bar = this.n(s.id), u = bytes(this.st(s.used)), t = bytes(this.st(s.total));
        return { name: s.name, icon: 'hard_drive', sub: u != null && t != null ? `${fmtB(u)} av ${fmtB(t)}` : '', bar: bar == null ? null : Math.round(bar), v: bar == null ? '' : `${Math.round(bar)} %` };
      });
      const bk = [];
      const bp = this.st(P + 'backup_progress');
      if (bp && !KD.BAD.has(bp.state)) { const v = num(bp); bk.push({ name: 'Sikkerhetskopi', icon: 'backup', sub: v != null ? (v > 0 && v < 100 ? `Pågår · ${nf(v)} %` : `Sist oppdatert kl. ${hm(bp.last_changed)}`) : String(bp.state), v: v != null && v > 0 && v < 100 ? `${nf(v)} %` : 'OK', col: C.green }); }
      const lt = this.st(P + 'last_task');
      if (lt && !KD.BAD.has(lt.state)) { const bad = /error|fail|feil/i.test(lt.state); bk.push({ name: 'Siste oppgave', icon: 'verified', sub: `${lt.state} · kl. ${hm(lt.last_changed)}`, v: bad ? 'Feil' : 'OK', col: bad ? C.red : C.green }); }
      const upd = this.n(P + 'node_updates');
      if (upd != null) bk.push({ name: 'Oppdateringer', icon: 'system_update', sub: upd ? `${nf(upd)} pakker venter` : 'Noden er oppdatert', v: upd ? String(upd) : 'OK', col: upd ? C.amber : C.green });
      return {
        status: `${N.name} · Proxmox VE${ver ? ' ' + ver : ''}`, ok: guests.length && running === guests.length ? C.green : C.amber,
        headline: !guests.length ? (N.has ? 'Noden kjører' : 'Fant ingen Proxmox-node') : running === guests.length ? 'Alle gjester kjører' : `${running} av ${guests.length} gjester kjører`,
        subline: [this.ok(P + 'uptime') ? `Oppe i ${upLong(upSec(this.st(P + 'uptime')))}` : '', W != null ? `${nf(W)} W` : '', c.pve_ip].filter(Boolean).join(' · '),
        gauges: [
          this._gauge('CPU', cpu, 100, ' %', c.pve_cpu_navn || (load != null ? `load ${nf(load, 2)}` : ''), cpu > 70 ? C.amber : C.blue),
          this._gauge('Minne', mem, 100, ' %', memU != null && memT != null ? `${fmtBs(memU)[0]} av ${fmtBs(memT).join(' ')}` : swap != null ? `swap ${nf(swap)} %` : '', C.blue),
          tempId ? this._gauge('Temp', temp, 90, '°', 'CPU-pakke', temp > 58 ? C.red : C.green) : this._gauge('Disk', root, 100, ' %', 'rot-FS', root > 85 ? C.amber : C.green),
        ],
        groups: [
          this._group('VM og LXC', `${running} kjører`, guests.map(g => ({ name: g.name, icon: iconFor(g.name, g.kind === 'vm' ? 'computer' : 'deployed_code'), tag: `${g.kind}${g.vmid ? ' ' + g.vmid : ''}`, on: g.on,
            sub: g.on ? [g.cpu != null ? `CPU ${nf(g.cpu)} %` : '', g.ram, g.up ? `oppe ${g.up}` : ''].filter(Boolean).join(' · ') : g.state === 'paused' ? 'Pauset' : 'Stoppet', warn: !g.on,
            act: g.on ? g.stop : g.start, btnIcon: g.on ? 'stop' : 'play_arrow', btnCol: g.on ? '#c9c7c2' : C.green }))),
          this._group('Lagring', `${store.length} ${store.length === 1 ? 'område' : 'områder'}`, store),
          this._group('Sikkerhetskopi', 'Proxmox VE', bk),
        ].filter(Boolean),
      };
    }

    _unraidV(U) {
      const c = this.config, P = U.P, u = U.u;
      const nameS = String(this.at(P + 'cpu_usage', 'friendly_name', '') || '').replace(/\s*cpu.*$/i, '').trim() || title(u);
      const ver = (String(this.v(P + 'unraid_version')).match(/\d+(\.\d+)?/) || [])[0];
      const dockers = U.cont.map(d => ({ ...d, on: this.v(d.id) === 'on', gone: !this.ok(d.id), hasUpd: this.v(d.upd) === 'on', cpu: this.n(d.cpu), mem: this.n(d.mem) }));
      const parRun = this.v(`binary_sensor.${u}_parity_check_running`) === 'on';
      const parP = this.n(`sensor.${u}_parity_check_progress`, this.n(`sensor.${u}_parity_progress`));
      const parity = parRun || (parP != null && parP > 0 && parP < 100) || (U.parity && this.v(U.parity) === 'on');
      const arrOn = this.st(`binary_sensor.${u}_array_started`) ? this.v(`binary_sensor.${u}_array_started`) === 'on' : !/stop/i.test(this.v(P + 'array_state'));
      const upS = this.st(P + 'up_since') || this.st(P + 'uptime');
      const Wid = c.unraid_effekt || [P + 'ups_power', P + 'ups_load_power', P + 'ups_current_power'].find(id => this.st(id));
      const W = Wid ? this.n(Wid) : null;
      const cpu = this.n(P + 'cpu_usage'), ram = this.n(P + 'ram_usage'), arr = this.n(P + 'array_usage'), temp = this.n(P + 'cpu_temperature');
      const ramU = bytes(this.st(P + 'ram_used')), ramT = bytes(this.st(P + 'ram_total'));
      const arU = bytes(this.st(P + 'array_used')) ?? bytes(this.st(P + 'array_usage_used')), arT = bytes(this.st(P + 'array_total')) ?? bytes(this.st(P + 'array_size'));
      const disks = U.disks.map(d => {
        const bar = this.n(d.use), t = this.n(d.temp), par = /^Parity/.test(d.name);
        return { name: d.name, icon: /^Cache/.test(d.name) ? 'memory' : 'hard_drive', sub: [t != null ? `${nf(t)}°` : '', !par && bar == null ? 'spunnet ned' : ''].filter(Boolean).join(' · ') || (par ? 'paritet' : ''), bar: par ? 100 : bar == null ? 0 : Math.round(bar), v: par ? 'paritet' : bar == null ? '' : `${Math.round(bar)} %`, col: par ? '#6d6c69' : C.blue };
      });
      const qb = this.config.qbit || 'sensor.qbittorrent_';
      const qbSub = () => { const d = this.st(qb + 'download_speed'), up = this.st(qb + 'upload_speed'); if (!d || KD.BAD.has(d.state)) return ''; const rate = s => { const v = num(s); if (v == null) return '–'; const uu = String(s.attributes.unit_of_measurement || 'B/s').toLowerCase(); const f = uu.startsWith('gi') ? 1073741824 : uu.startsWith('mi') ? 1048576 : uu.startsWith('ki') ? 1024 : uu.startsWith('g') ? 1e9 : uu.startsWith('m') ? 1e6 : uu.startsWith('k') ? 1e3 : 1; const b = v * (uu.includes('bit') ? f / 8 : f); return b >= 1e6 ? `${nf1(b / 1e6)} MB/s` : `${nf(b / 1e3)} kB/s`; }; return `↓ ${rate(d)} · ↑ ${rate(up)}`; };
      const acts = [];
      if (U.parity) acts.push({ name: 'Paritetssjekk', icon: 'fact_check', sub: parity ? `Pågår${parP != null ? ' · ' + nf(parP) + ' %' : ''}` : (this.ok(P + 'last_parity_check') ? `Sist ${new Date(this.v(P + 'last_parity_check')).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}` : 'Ikke i gang'), col: C.amber, on: parity, togOn: parity, tog: U.parity });
      if (U.mover) { const on = this.v(U.mover) === 'on'; acts.push(dom(U.mover) === 'button' ? { name: 'Mover', icon: 'move_down', sub: 'Flytt fra cache til array', col: C.blue, act: U.mover, btnIcon: 'play_arrow', btnCol: C.blue } : { name: 'Mover', icon: 'move_down', sub: on ? 'Flytter fra cache til array' : 'Venter', col: C.blue, on, togOn: on, tog: U.mover }); }
      if (this.st(P + 'ups_battery') || this.st(P + 'ups_battery_charge')) { const b = this.n(P + 'ups_battery', this.n(P + 'ups_battery_charge')), rt = this.n(P + 'ups_runtime', this.n(P + 'ups_battery_runtime')); acts.push({ name: 'UPS', icon: 'battery_charging_full', sub: [b != null ? `${nf(b)} %` : '', rt != null ? `${nf(rt)} min` : ''].filter(Boolean).join(' · '), v: W != null ? `${nf(W)} W` : '', col: C.green }); }
      for (const vm of U.vms) { const on = this.v(vm.id) === 'on'; acts.push({ name: vm.name, icon: iconFor(vm.name, 'computer'), tag: 'vm', sub: on ? 'Kjører' : 'Stoppet', col: C.blue, on, togOn: on, tog: vm.id }); }
      if (this.st(c.qbit_sparefart)) { const on = this.v(c.qbit_sparefart) === 'on'; acts.push({ name: 'Sparefart', icon: 'speed', sub: on ? 'qBittorrent · alternativ hastighet på' : 'qBittorrent · full hastighet', col: C.amber, on, togOn: on, tog: c.qbit_sparefart }); }
      if (U.check) acts.push({ name: 'Se etter oppdateringer', icon: 'update', sub: 'Docker-containere', col: C.blue, act: U.check, btnIcon: 'refresh' });
      return {
        status: `${nameS} · Unraid${ver ? ' ' + ver : ''} · integrasjon i HA`, ok: dockers.every(d => d.on) ? C.green : C.amber,
        headline: parity ? 'Paritetssjekk pågår' : arrOn ? 'Arrayet er startet' : 'Arrayet er stoppet',
        subline: parity ? [parP != null ? `${nf(parP)} %` : '', 'paritetssjekk'].filter(Boolean).join(' · ') : [upS && !KD.BAD.has(upS.state) ? `Oppe i ${upLong(upSec(upS))}` : '', W != null ? `${nf(W)} W` : '', c.unraid_ip].filter(Boolean).join(' · '),
        gauges: [
          this._gauge('CPU', cpu, 100, ' %', c.unraid_cpu_navn || (temp != null ? `${nf(temp)}° CPU` : ''), C.blue),
          this._gauge('Minne', ram, 100, ' %', ramU != null && ramT != null ? `${fmtBs(ramU)[0]} av ${fmtBs(ramT).join(' ')}` : '', C.blue),
          this._gauge('Array', arr, 100, ' %', arU != null && arT != null ? `${fmtBs(arU)[0]} av ${fmtBs(arT).join(' ')}` : '', C.amber),
        ],
        groups: [
          this._group('Array', `${disks.length} ${disks.length === 1 ? 'disk' : 'disker'}`, disks),
          this._group('Docker', `${dockers.filter(d => d.on).length} av ${dockers.length} kjører`, dockers.map(d => ({ name: d.name, icon: iconFor(d.key + ' ' + d.name, 'deployed_code'), on: d.on,
            sub: d.gone ? 'Svarer ikke' : d.on ? ([d.cpu != null ? `CPU ${nf1(d.cpu)} %` : '', d.mem != null ? `minne ${nf1(d.mem)} %` : '', /qbit|torrent/i.test(d.key) ? qbSub() : '', d.hasUpd ? 'oppdatering klar' : ''].filter(Boolean).join(' · ') || 'Kjører') : 'Stoppet', warn: !d.on,
            act: d.id, btnIcon: d.on ? 'stop' : 'play_arrow', btnCol: d.on ? '#c9c7c2' : C.green }))),
          this._group('Handlinger i HA', 'unraid-integrasjon', acts),
        ].filter(Boolean),
      };
    }

    _speed() {
      const c = this.config, ids = [c.speedtest_ned, c.speedtest_opp].filter(id => this.st(id));
      if (!ids.length) return null;
      const hist = this.cached('kd-srv-speed-' + ids.join(','), 10 * 60e3, () => this.history(ids, 48), {});
      const series = (id) => {
        if (!id || !this.st(id)) return [];
        const pts = ((hist && hist[id]) || []).map(p => p.v).filter(v => typeof v === 'number');
        const cur = this.n(id);
        const arr = pts.slice(-20);
        if (cur != null && (!arr.length || arr[arr.length - 1] !== cur)) { arr.push(cur); if (arr.length > 20) arr.shift(); }
        return arr;
      };
      return { down: series(c.speedtest_ned), up: series(c.speedtest_opp) };
    }

    _unifiV(UF) {
      const c = this.config, gw = UF.gw, g = UF.gwSlug;
      const devs = UF.list.map(d => {
        const tr = this.st(d.tracker), on = !tr || tr.state === 'home';
        return { ...d, on, kl: this.n(d.clients), cpuV: this.n(d.cpu), memV: this.n(d.mem), fwV: this.at(d.fw, 'installed_version', '') };
      });
      const down = devs.filter(d => !d.on).length;
      const lat = { cloudflare: this.n(`sensor.${g}_cloudflare_wan_latency`), google: this.n(`sensor.${g}_google_wan_latency`) };
      const pm = c.ping_mal === 'google' ? ['google', 'cloudflare'] : ['cloudflare', 'google'];
      const pk = pm.find(k => lat[k] != null);
      const ping = pk ? lat[pk] : this.n(c.speedtest_ping);
      const pingSub = pk === 'cloudflare' ? '1.1.1.1' : pk === 'google' ? '8.8.8.8' : 'Speedtest';
      const gwD = devs.find(d => gw && d.slug === gw.slug);
      const apCl = devs.filter(d => d.type === 2).reduce((s, d) => s + (d.kl || 0), 0);
      const gwCl = gwD && gwD.kl != null ? gwD.kl : this.n(`sensor.${g}_clients`);
      const clients = gwCl != null ? gwCl : devs.reduce((s, d) => s + (d.kl || 0), 0);
      const sp = this._speed();
      const sd = this.n(c.speedtest_ned), su = this.n(c.speedtest_opp);
      const top = this._topClients();
      return {
        status: `UniFi Network${gw ? ' · ' + gw.name : ''}`, ok: devs.length && !down ? C.green : C.amber,
        headline: !devs.length ? 'Fant ingen UniFi-enheter' : down ? `${down} ${down === 1 ? 'enhet svarer' : 'enheter svarer'} ikke` : ping != null && ping > 100 ? 'Høy latens på WAN' : 'Nettet er friskt',
        subline: [gw && this.ok(gw.up) ? `WAN oppe ${upLong(upSec(this.st(gw.up)))}` : '', [c.isp, sd != null && su != null ? `${nf(sd)}/${nf(su)}` : ''].filter(Boolean).join(' ')].filter(Boolean).join(' · '),
        gauges: [
          this._gauge('Klienter', clients, Number(c.klienter_maks) || 80, '', apCl ? `${nf(apCl)} trådløst` : 'tilkoblet', C.blue),
          this._gauge('Ping', ping, 40, ' ms', pingSub, C.green),
          this._gauge('Gateway', gwD ? gwD.cpuV : null, 100, ' %', 'CPU', C.blue),
        ],
        hasNet: !!sp, sp,
        groups: [
          this._group('Enheter', `${devs.length} adoptert`, devs.map(d => ({ name: d.name, icon: ['router', 'lan', 'wifi'][d.type], on: d.on, col: C.green, warn: !d.on,
            sub: !d.on ? 'Svarer ikke' : [d.type === 0 ? 'Gateway' + (d.fwV ? ' · ' + d.fwV : '') : d.fwV ? `v${d.fwV}` : '', d.type !== 0 && d.kl != null ? `${nf(d.kl)} klienter` : '', d.cpuV != null ? `CPU ${nf(d.cpuV)} %` : ''].filter(Boolean).join(' · '),
            v: !d.on ? 'Borte' : d.type === 0 && d.kl != null ? `${nf(d.kl)} klienter` : 'OK' }))),
          top.length ? this._group('Topp klienter', 'nå', top) : null,
        ].filter(Boolean),
      };
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

    _haV(UF) {
      const c = this.config, R = this._reg(), S = this._hass.states;
      const reg = this._unifiReg();
      const infra = new Set(UF.list.map(d => d.tracker));
      const infraDev = new Set(UF.list.map(d => (R[d.tracker] || {}).device_id).filter(Boolean));
      // sporere: personenes device_trackers som kommer fra UniFi (eller har UniFi-attributter)
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
        return { name: this.fname(id), icon: 'smartphone', on, col: C.green, v: on ? 'Hjemme' : 'Borte', sub: on ? ([ap, at.essid].filter(Boolean).join(' · ') || (at.is_wired ? 'Kablet' : 'Tilkoblet')) : `Borte · sist sett ${hm((this.st(id) || {}).last_changed)}` };
      });
      // brytere
      const sw = reg.filter(id => dom(id) === 'switch');
      const poe = sw.filter(id => /port_\d+_poe$|_poe$/.test(obj(id)));
      const blocks = Array.isArray(c.blokker) ? c.blokker.filter(id => this.st(id)) : sw.filter(id => !poe.includes(id) && !infraDev.has((R[id] || {}).device_id) && !/wlan|wifi|ssid|dpi|restrict|forward|traffic|rule|outlet|led|vpn|port_\d/.test(obj(id)));
      const upds = reg.filter(id => dom(id) === 'update');
      const updOn = upds.filter(id => this.v(id) === 'on');
      const last = reg.reduce((m, id) => Math.max(m, new Date((S[id] || {}).last_updated || 0).getTime()), 0);
      const poeDev = (() => { const id = poe[0]; const dev = id && this._devs()[(R[id] || {}).device_id]; return (dev && (dev.name_by_user || dev.name)) || 'UniFi'; })();
      const poeW = id => { const p = this.n(`sensor.${obj(id).replace(/_poe$/, '')}_poe_power`); return p != null ? ` · ${nf1(p)} W` : ''; };
      const alive = reg.some(id => this.ok(id));
      return {
        status: 'UniFi Network · integrasjon i Home Assistant', ok: alive ? C.green : C.amber,
        headline: !reg.length ? 'Fant ikke UniFi-integrasjonen' : alive ? 'Integrasjonen er tilkoblet' : 'Integrasjonen svarer ikke',
        subline: reg.length ? `Oppdatert for ${agoTxt(last)} · ${reg.length} entiteter` : 'Krever UniFi Network-integrasjonen',
        gauges: [
          this._gauge('Sporere', clientTr.filter(id => this.v(id) === 'home').length, Math.max(1, clientTr.length), '', 'hjemme', C.green),
          this._gauge('Brytere', sw.filter(id => this.v(id) === 'on').length, Math.max(1, sw.length), '', 'blokk og PoE', C.blue),
          this._gauge('Oppdat.', updOn.length, Math.max(1, upds.length), '', 'fastvare', C.amber),
        ],
        groups: [
          this._group('Tilstedeværelse', 'device_tracker', pres),
          this._group('Blokker klient', `${blocks.filter(id => this.v(id) === 'off').length} blokkert`, blocks.map(id => { const bl = this.v(id) === 'off'; return { name: this.fname(id), icon: 'block', sub: bl ? 'Blokkert i UniFi' : 'Tillatt', on: bl, col: C.red, togOn: bl, tog: id }; })),
          this._group('PoE-porter', poeDev, poe.slice(0, Number(c.poe_maks) || 8).map(id => { const on = this.v(id) === 'on'; return { name: this.fname(id).replace(/\s*poe\s*$/i, ''), icon: 'power', sub: on ? `PoE på${poeW(id)}` : 'PoE av', on, col: C.amber, togOn: on, tog: id }; })),
          this._group('Oppdateringer', 'update-entiteter', updOn.map(id => { const busy = !!this.at(id, 'in_progress', false); return { name: this.fname(id).replace(/\s*(firmware|fastvare)\s*$/i, ''), icon: 'system_update', sub: `${this.at(id, 'installed_version', '?')} → ${this.at(id, 'latest_version', '?')}`, col: C.amber, act: id, btnIcon: busy ? 'check' : 'download', btnCol: busy ? C.green : C.amber }; })),
        ].filter(Boolean),
      };
    }

    body() {
      const s = this.state, c = this.config;
      const UF = this._unifi(), U = this._unraid(), N = this._pveNode();
      const has = { pve: N.has || this._pveGuests().length > 0, unraid: !!U, unifi: UF.list.length > 0 || !!UF.gwSlug, ha: this._unifiReg().length > 0 || UF.list.length > 0 };
      const all = [['pve', 'Proxmox', 'deployed_code'], ['unraid', 'Unraid', 'storage'], ['unifi', 'UniFi', 'router'], ['ha', 'HA', 'home']];
      let tabs = Array.isArray(c.faner) && c.faner.length ? all.filter(t => c.faner.includes(t[0])) : all.filter(t => has[t[0]]);
      if (!tabs.length) tabs = [all[0]];
      const tabK = tabs.some(t => t[0] === s.tab) ? s.tab : tabs[0][0];
      const V = tabK === 'unraid' ? this._unraidV(U) : tabK === 'unifi' ? this._unifiV(UF) : tabK === 'ha' ? this._haV(UF) : this._pve();
      const tab = (k, l, icon) => ({ k, label: l, icon, style: { height: 54, borderRadius: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 11, fontWeight: 500, background: tabK === k ? PINK : 'transparent', color: tabK === k ? '#2a1720' : '#a9a7a2', transition: 'background .25s' } });
      const bars = (arr, col) => { const m = Math.max(1, ...arr); return arr.map((v, i) => ({ flex: 1, height: `${v / m * 100}%`, borderRadius: 2, background: i === arr.length - 1 ? col : a(col, 0.45) })); };
      const net = V.sp ? [['Ned', 'south', V.sp.down, C.green], ['Opp', 'north', V.sp.up, C.blue]].map(([label, icon, arr, col]) => ({ label, icon, v: nf(arr[arr.length - 1] || 0), bars: bars(arr, col), iconStyle: { fontSize: 16, color: col } })) : [];
      const statusStyle = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#c9c7c2' };
      const statusDot = { width: 8, height: 8, borderRadius: 4, flex: 'none', background: V.ok, boxShadow: `0 0 10px ${V.ok}` };
      const tl = tabs.map(t => tab(...t));
      return `<div style="box-sizing:border-box;width:100%;max-width:420px;min-height:100vh;margin:0 auto;background:#141416;padding:20px 18px 40px;display:flex;flex-direction:column;gap:20px">
  <header style="display:flex;align-items:center;gap:12px">
    <span style="width:40px;height:40px;border-radius:20px;background:#e9e8e4;color:#141416;display:grid;place-items:center;flex:none"><span class="ms" style="font-size:22px;font-variation-settings:'FILL' 1">dns</span></span>
    <div style="flex:1;font-size:26px;font-weight:500;letter-spacing:-0.02em">Server</div>
    <button data-on-click="closeSheet" style="width:36px;height:36px;border-radius:18px;background:#232326;display:grid;place-items:center"><span class="ms" style="font-size:20px">close</span></button>
  </header>

  <div style="display:grid;grid-template-columns:repeat(${tl.length},1fr);gap:2px;padding:4px;border-radius:22px;background:#1c1c1f">
    ${tl.map(t => `<button data-on-click="goTab" data-arg="${t.k}" style="${S(t.style)}"><span class="ms" style="font-size:19px">${e(t.icon)}</span><span>${e(t.label)}</span></button>`).join('')}
  </div>

  <section style="display:flex;flex-direction:column;gap:6px;padding:0 4px">
    <div style="${S(statusStyle)}"><span style="${S(statusDot)}"></span><span>${e(V.status)}</span></div>
    <div style="font-size:24px;font-weight:500;letter-spacing:-0.015em"><span>${e(V.headline)}</span></div>
    <div style="font-size:14px;color:#8e8d89"><span>${e(V.subline)}</span></div>
  </section>

  <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
    ${V.gauges.map(g => `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 6px 14px;border-radius:22px;background:#1c1c1f">
        <div style="${S(g.ring)}"><div style="position:absolute;inset:8px;border-radius:50%;background:#1c1c1f;display:grid;place-items:center"><span style="font-size:17px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap"><span>${e(g.v)}</span></span></div></div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:1px;text-align:center"><span style="font-size:13px;font-weight:500"><span>${e(g.label)}</span></span><span style="font-size:11px;color:#8e8d89"><span>${e(g.sub)}</span></span></div>
      </div>`).join('')}
  </section>

  ${V.hasNet ? `<section style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">
      ${net.map(n => `<div style="display:flex;flex-direction:column;gap:6px;padding:16px;border-radius:22px;background:#1c1c1f">
          <span style="display:flex;align-items:center;gap:6px;font-size:12px;color:#8e8d89"><span class="ms" style="${S(n.iconStyle)}">${e(n.icon)}</span><span>${e(n.label)}</span></span>
          <span style="font-size:28px;font-weight:300;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;white-space:nowrap"><span>${e(n.v)}</span><span style="font-size:13px;color:#8e8d89"> Mbit/s</span></span>
          <div style="display:flex;align-items:flex-end;gap:2px;height:32px">${n.bars.map(b => `<span style="${S(b)}"></span>`).join('')}</div>
        </div>`).join('')}
    </section>` : ''}

  ${V.groups.map(gr => `<section style="display:flex;flex-direction:column;gap:4px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;padding:0 4px 6px">
        <div style="font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8e8d89"><span>${e(gr.title)}</span></div>
        <div style="font-size:12px;color:#6d6c69"><span>${e(gr.meta)}</span></div>
      </div>
      ${gr.items.map(it => `<div style="${S(it.row)}">
          <span style="${S(it.iconWrap)}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">${e(it.icon)}</span></span>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:5px">
            <span style="display:flex;align-items:center;gap:6px;font-size:14px;font-weight:500"><span>${e(it.name)}</span><span style="${S(it.tag)}"><span>${e(it.tagT)}</span></span></span>
            <span style="${S(it.subStyle)}"><span>${e(it.sub)}</span></span>
            <span style="${S(it.barWrap)}"><span style="${S(it.bar)}"></span></span>
          </div>
          <span style="${S(it.vStyle)}"><span>${e(it.v)}</span></span>
          <button data-on-click="act" data-arg="${e(it.act || '')}" style="${S(it.btn)}"><span class="ms" style="font-size:18px;font-variation-settings:'FILL' 1">${e(it.btnIcon)}</span></button>
          <button data-on-click="tog" data-arg="${e(it.tog || '')}" style="${S(it.track)}"><span style="${S(it.knob)}"></span></button>
        </div>`).join('')}
    </section>`).join('')}
</div>`;
    }
  }

  KD.define('kd-server-card', KDServerCard, 'KD Server', 'Proxmox, Unraid, UniFi og HA – pikselkopi av Claude Design «Server»');
  KD.sheet('server', 'kd-server-card');
})();
