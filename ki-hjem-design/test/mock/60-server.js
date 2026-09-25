// Mock for kd-server-card – gjenskaper eksempelverdiene i «Server».
(() => {
  const ago = (d) => new Date(Date.now() - d * 86400e3).toISOString();
  const GB = (v) => ({ state: String(v), attributes: { unit_of_measurement: 'GB', device_class: 'data_size' } });
  const MB = (v) => ({ state: String(v), attributes: { unit_of_measurement: 'MB', device_class: 'data_size' } });
  const pct = (v, fn) => ({ state: String(v), attributes: { unit_of_measurement: '%', ...(fn ? { friendly_name: fn } : {}) } });
  const ts = (d) => ({ state: ago(d), attributes: { device_class: 'timestamp' } });
  const E = {
    // Proxmox-node
    'sensor.1_node_pve_cpu_usage': pct(18), 'sensor.1_node_pve_memory_usage': pct(61),
    'sensor.1_node_pve_memory_used': GB(39), 'sensor.1_node_pve_memory_total': GB(64),
    'sensor.1_node_pve_cpu_temperature': { state: '46', attributes: { unit_of_measurement: '°C' } },
    'sensor.1_node_pve_pve_version': '8.4.1', 'sensor.1_node_pve_kernel_version': '6.8.12-4-pve',
    'sensor.1_node_pve_uptime': ts(23.2), 'sensor.1_node_pve_load_average_1m': '0.42', 'sensor.1_node_pve_swap_usage': pct(0),
    'sensor.1_node_pve_root_filesystem_usage': pct(31),
    'sensor.server_rack_power': { state: '186', attributes: { unit_of_measurement: 'W' } },
    // lagring
    'sensor.5_storage_local_zfs_usage': pct(44, 'local-zfs Usage'), 'sensor.5_storage_local_zfs_used': { state: '0.88', attributes: { unit_of_measurement: 'TB' } }, 'sensor.5_storage_local_zfs_total': { state: '2', attributes: { unit_of_measurement: 'TB' } },
    'sensor.5_storage_tank_usage': pct(74, 'tank Usage'), 'sensor.5_storage_tank_used': { state: '31.1', attributes: { unit_of_measurement: 'TB' } }, 'sensor.5_storage_tank_total': { state: '42', attributes: { unit_of_measurement: 'TB' } },
    'sensor.5_storage_backup_pbs_usage': pct(58, 'backup (PBS) Usage'),
    'sensor.1_node_pve_backup_progress': { state: '100', attributes: { unit_of_measurement: '%' } },
    'sensor.1_node_pve_last_task': 'vzdump OK',
    // UniFi
    'device_tracker.stromstad_dream_machine_pro': { state: 'home', attributes: { friendly_name: 'UDM Pro', mac: 'aa:00' } },
    'sensor.stromstad_dream_machine_pro_uptime_2': ts(41), 'sensor.stromstad_dream_machine_pro_cpu_utilisation_2': pct(23), 'sensor.stromstad_dream_machine_pro_memory_utilisation_2': pct(55),
    'sensor.stromstad_dream_machine_pro_clients': '47', 'sensor.stromstad_dream_machine_pro_google_wan_latency': { state: '6', attributes: { unit_of_measurement: 'ms' } }, 'sensor.stromstad_dream_machine_pro_cloudflare_wan_latency': { state: '4', attributes: { unit_of_measurement: 'ms' } },
    'update.stromstad_dream_machine_pro_firmware': { state: 'off', attributes: { friendly_name: 'UDM Pro Firmware', installed_version: '4.1.13', latest_version: '4.1.13' } },
    'device_tracker.usw_pro_24_poe': { state: 'home', attributes: { friendly_name: 'USW Pro 24 PoE', mac: 'aa:01' } },
    'sensor.usw_pro_24_poe_uptime': ts(41), 'sensor.usw_pro_24_poe_cpu_utilisation': pct(9), 'sensor.usw_pro_24_poe_memory_utilisation': pct(40), 'sensor.usw_pro_24_poe_clients': '18',
    'device_tracker.u7_pro_1_etg': { state: 'home', attributes: { friendly_name: 'U7 Pro · 1. etg', mac: 'aa:02' } },
    'sensor.u7_pro_1_etg_uptime': ts(20), 'sensor.u7_pro_1_etg_cpu_utilisation': pct(6), 'sensor.u7_pro_1_etg_clients': '22',
    'device_tracker.u6_mesh_hage': { state: 'home', attributes: { friendly_name: 'U6 Mesh · Hage', mac: 'aa:03' } },
    'sensor.u6_mesh_hage_uptime': ts(20), 'sensor.u6_mesh_hage_cpu_utilisation': pct(4), 'sensor.u6_mesh_hage_clients': '4',
    'update.u6_mesh_hage_firmware': { state: 'on', attributes: { friendly_name: 'U6 Mesh · Hage Firmware', installed_version: '6.6.77', latest_version: '6.7.10', in_progress: false } },
    'update.usw_pro_24_poe_firmware': { state: 'on', attributes: { friendly_name: 'USW Pro 24 PoE Firmware', installed_version: '2.1.4', latest_version: '2.1.6', in_progress: false } },
    'sensor.speedtest_download': { state: '312', attributes: { unit_of_measurement: 'Mbit/s' } }, 'sensor.speedtest_upload': { state: '64', attributes: { unit_of_measurement: 'Mbit/s' } }, 'sensor.speedtest_ping': { state: '5', attributes: { unit_of_measurement: 'ms' } },
    // UniFi-klienter
    'device_tracker.sebastian_iphone': { state: 'home', attributes: { friendly_name: 'Sebastian iPhone', essid: 'Hjemme', ap_mac: 'aa:02' } },
    'device_tracker.rune_iphone': { state: 'not_home', attributes: { friendly_name: 'Rune iPhone', essid: 'Hjemme', ap_mac: 'aa:02' }, ago: 3 * 3600e3 },
    'switch.sebastian_ps5': { state: 'on', attributes: { friendly_name: 'Sebastian PS5' } }, 'switch.gjest_iphone': { state: 'off', attributes: { friendly_name: 'Gjest iPhone' } },
    'switch.usw_pro_24_poe_port_3_poe': { state: 'on', attributes: { friendly_name: 'Port 3 · Kamera inngang PoE' } }, 'switch.usw_pro_24_poe_port_4_poe': { state: 'on', attributes: { friendly_name: 'Port 4 · Kamera veranda PoE' } },
    'sensor.usw_pro_24_poe_port_3_poe_power': { state: '6.2', attributes: { unit_of_measurement: 'W' } },
    // Unraid
    'sensor.d_day_darling_cpu_usage': pct(11, 'D-Day Darling CPU usage'), 'sensor.d_day_darling_ram_usage': pct(48), 'sensor.d_day_darling_array_usage': pct(74), 'sensor.d_day_darling_cpu_temperature': { state: '41', attributes: { unit_of_measurement: '°C' } },
    'sensor.d_day_darling_unraid_version': '7.1.2', 'sensor.d_day_darling_up_since': ts(23), 'binary_sensor.d_day_darling_array_started': 'on',
    'sensor.d_day_darling_disk_1_usage': pct(86), 'sensor.d_day_darling_disk_1_temperature': '41', 'sensor.d_day_darling_disk_2_usage': pct(81), 'sensor.d_day_darling_disk_2_temperature': '39',
    'sensor.d_day_darling_parity_temperature': '36', 'sensor.d_day_darling_cache_usage': pct(45), 'sensor.d_day_darling_cache_temperature': '48',
    'switch.d_day_darling_container_plex': 'on', 'switch.d_day_darling_container_binhex_sonarr': 'on', 'switch.d_day_darling_container_binhex_radarr': 'on', 'switch.d_day_darling_container_binhex_qbittorrentvpn': 'on', 'switch.d_day_darling_container_nextcloud': 'off',
    'switch.d_day_darling_vm_home_assistant': 'on', 'button.d_day_darling_check_container_updates': 'unknown',
    'switch.qbittorrent_alternative_speed': 'off', 'sensor.qbittorrent_download_speed': { state: '2.1', attributes: { unit_of_measurement: 'MB/s' } }, 'sensor.qbittorrent_upload_speed': { state: '310', attributes: { unit_of_measurement: 'kB/s' } },
  };
  // Proxmox-gjester (designets eksempel)
  const G = [['4_vm', 'home_assistant_os', '100', 'Home Assistant OS', true, 6, 4, 14], ['3_ct', 'frigate', '101', 'Frigate', true, 22, 3, 14], ['3_ct', 'plex', '102', 'Plex', true, 9, 4, 14], ['3_ct', 'arr_stack', '103', 'Arr-stack', true, 3, 2, 9],
    ['3_ct', 'zigbee2mqtt', '104', 'Zigbee2MQTT', true, 1, 0.512, 14], ['4_vm', 'nextcloud', '105', 'Nextcloud', false, 0, 4, 0], ['3_ct', 'vaultwarden', '106', 'Vaultwarden', true, 0, 0.256, 14]];
  for (const [p, k, id, name, on, cpu, ram, up] of G) {
    const b = `${p}_${k}_${id}_`;
    E[`sensor.${b}status`] = { state: on ? 'running' : 'stopped', attributes: { friendly_name: `${name} Status` } };
    E[`sensor.${b}cpu_usage`] = pct(cpu);
    E[`sensor.${b}ram_used`] = ram >= 1 ? GB(ram) : MB(ram * 1000);
    if (on) E[`sensor.${b}uptime`] = ts(up + 0.1);
    E[`button.${b}start_${k}`] = 'unknown'; E[`button.${b}shutdown_${k}`] = 'unknown';
  }
  MOCK.add(E);
  // entitetsregister for UniFi-oppdagelse
  const REG = {};
  for (const id of Object.keys(E)) if (/dream_machine|usw_pro|u7_pro|u6_mesh|iphone|ps5|gjest_iphone/.test(id)) REG[id] = { entity_id: id, platform: 'unifi', device_id: /usw_pro_24_poe_port/.test(id) ? 'dev-usw' : null };
  const DEV = { 'dev-usw': { id: 'dev-usw', name: 'USW Pro 24 PoE' } };
  const prev = MOCK.make;
  MOCK.make = function () { const h = prev.apply(this, arguments); h.entities = Object.assign({}, h.entities || {}, REG); h.devices = Object.assign({}, h.devices || {}, DEV); return h; };
})();
