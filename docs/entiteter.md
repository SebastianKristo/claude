# Entiteter – hentet fra det eksisterende dashboardet (raw config)

Kun entiteter/ID-er er hentet fra det gamle dashboardet. Utseendet kommer 100 % fra Claude Design.
Kortene bruker disse som standardverdier (overstyrbare i config) og finner resten automatisk.

## Felles / Hjem
- Personer: `person.sebastian_kristo_jemtland` (hjemme/borte-bryter `switch.sebastian_posisjon_hjemme_borte`, søvn `switch.homey_logic_sebastian_sovn_vaken`),
  `person.rune_jemtland` (`switch.rune_posisjon_hjemme_borte`, `switch.homey_logic_rune_sovn_vaken`),
  `person.cybele_kristo` (`switch.cybele_posisjon_hjemme_borte`, `switch.homey_logic_cybele_sovn_vaken`).
  Søvn-bryterne: `on` = sover. (ki_sovn gir også `binary_sensor.<navn>_sovn_sover`.)
- Soner: `zone.skole`, `zone.stromstad`, `zone.toten`, `zone.mormor`, `zone.oslo_revmatologipraksis`, `zone.kor`, `zone.home`
- Servere (family-status-card): Oslo, Strömstad (server «Strømstad»), Toten. `server_sti: /dashboard-mysmarthome`
- Vær: `weather.forecast_home` (attr temperature, humidity, uv_index, forecast via `weather.get_forecasts`),
  `sensor.weather_forecast_v2` (attr `current.{condition,temperature,feels_like,icon,wind_desc,precipitation}`),
  `sensor.vaervarsel_temperature`, `sensor.vaervarsel_humidity`, `sensor.dashboard_index` (attr `weather`, `current.icon`)
- Sol/måne: `sun.sun` (next_dawn, next_dusk, next_rising, next_setting, elevation), `sensor.sun_next_dawn|_rising|_noon|_setting|_dusk`,
  `sensor.sun_solar_elevation`, `binary_sensor.sun_solar_rising`, `sensor.oslo_moon_phase`
- Pollen: `sensor.pollen_{birch,grass,alder,hazel,mugwort}_oslo_pollen_today` (attr `display_name`, `category`, `index_value` 0–5)
- Strømpris nå: `sensor.norgespris_pris_na` (kr/kWh, attr `today`/`tomorrow` = [{start,end,value}]),
  `sensor.totalpris_inkludert_grid_el_company_og_stromstotte` (øre/kWh, attr `raw_today`/`raw_tomorrow` = [{start,end,value}], `max`, `min`, `mean`),
  `sensor.nordpool_kwh_no1_nok_3_10_025` (spot, øre/kWh, Nord Pool-attributter `raw_today`/`raw_tomorrow`, `today`/`tomorrow`),
  `sensor.norgespris_total_strompris_norgespris`, `sensor.totalpris_strompris_kroner`
- Effekt nå: `sensor.strommaler_effekt` (W). Lys på i hele huset: `sensor.hele_huset_lys` (ki_rom, attr `totalt`, `aktiv_liste`, `aktiv_navn`)
- Kalender: `sensor.alle_kalendere` (state = antall, attr `events` = [{summary,start,end}]), `sensor.kalender_oslomet`
  Kalendere: `calendar.sebastian_kristo_no` (Sebastian), `calendar.oslomet_timeplan` (OsloMet), `calendar.helligdager_i_norge`,
  `calendar.birthdays` (Bursdager), `calendar.open_home_foundation_devs` (HassOs)
- Lås: `lock.dorlas_blatann` (batteri `sensor.dorlas_wifi_battery`), `lock.boddor`, sist låst av `sensor.ansiktsgjenkjenning_dorlas_sist_last_opp_av`
- Alarm: `alarm_control_panel.alarm` (ny), `select.alarm_homealarm_state` + `script.mysmarthome_home_screen_alarm_aktiver_deaktiver` (gammel)
- Garasje: `cover.garasje`
- Kamera: dashboard `/dashboard-kamera`; bevegelse `binary_sensor.stue_g6_turret_motion`, `binary_sensor.mellomgang_g5_turret_ultra_motion`, `binary_sensor.ringeklokke_g6_entry_motion`, ringeklokke `binary_sensor.ringeklokke_g6_entry_doorbell`. Kamera-entiteter: finn `camera.*` automatisk.
- Gjøremål: `sensor.todo_oppgaver_count`, `todo.gjoremal` (Store oppgaver), `todo.personlig_seb` (Personlig)
- Søppel: `sensor.neste_tomming` (state «dager,type»), `sensor.restavfall`, `sensor.papir_og_papp`, `sensor.plastemballasje`, `sensor.glass_og_metallemballasje`
  (attr `days_to_pickup`, `raw_date`), tømmeintervall 14 dager
- Kiosk: `input_boolean.kiosk_mode`
- Vaskemaskin/oppvask: `input_select.vaskemaskin_status` («Vasker»), `sensor.vaskemaskin_power`, `sensor.vaskemaskin_tid_igjen`, `sensor.oppvaskmaskin_tid_igjen`
- TV: `media_player.stue_tv`

## Rom (ki_rom lager `sensor.<rom>_oversikt|_lys|_media|_brytere|_sensorer|_effekt`)
`sensor.<rom>_oversikt` har attributter `lys`, `media`, `brytere`, `vifter`, `klima`, `gardiner`, `sensorer`, `skript`, `scener`, `temperatur`, `fuktighet`, `lysniva`, `effekt`, `area_id`, `ikon`, `etasje`/`etasje_niva`.
Rom-ID-er: `stue`, `kjokken`, `inngang` (Gang), `do`, `vaskegang`, `bad`, `pult`, `soverom`, `seng`, `benk`, `cybele_soverom`, `rune_soverom`, `rune_kontor`, `trappegang`, `ute`, `veranda`, `garasje`, `lofte`.
| Rom | Temp / fukt | Settpunkt (±) | Lysgruppe | Hash |
|---|---|---|---|---|
| Stue | `sensor.stue_meter_pro_temperature` / `_humidity` | `input_number.stue_panelovn_teller` (og `input_number.stue_oljefyr_teller`) | `light.stue_lys` | `#stue` |
| Kjøkken | `sensor.kjokken_meter_pro_temperature` / `_humidity` | `input_number.kjokken_gulvvarme_teller` | `light.kjokken_lys` | `#kjokken` |
| Pult | `sensor.pult_hub_2_temperature` / `_humidity` | – | `light.pult_lys` | `#pult` |
| Soverom | `sensor.pult_hub_2_temperature` / `_humidity` | `input_number.sebastian_panelovn_teller` | `light.soverom_lys` | `#soverom` |
| Bad | `sensor.trappegang_meter_pro_temperature` / `_humidity` | `input_number.bad_gulvvarme_teller` | `light.bad_lys` | `#bad` |
| Gang (inngang) | `sensor.inngang_temp_og_fukt_temperature` / `_humidity` | – | `light.inngang_lys` | `#gang` |
| Do | `sensor.do_klimasensor_temperatur` / `sensor.do_klimasensor_luftfuktighet` | – | `light.do_lys` | `#do` |
| Cybele | `sensor.trappegang_meter_pro_temperature` / `_humidity` | – | `light.cybele_soverom_lys` | `#cybele` |
| Rune soverom | samme | – | `light.rune_soverom_lys` | `#rune` |
| Rune kontor | samme | – | – | `#kontor` |
| Vaskegang | – | – | `light.vaskegang_lys` | `#vaskegang` |
| Ute | `sensor.vaervarsel_temperature` / `_humidity` | – | `light.ute_lys` | `#ute` |
Andre lysgrupper: `light.trappegang_lys`, `light.veranda_lys`, `light.alle_lys`.
Etasjer: 1. etg = stue, kjokken, inngang, do, vaskegang · 2. etg = pult, soverom, bad, cybele_soverom, rune_soverom, rune_kontor, trappegang.
Favoritter (Hjem): stue, inngang, ute (venstre) · pult, kjokken (høyre).
Skjul i rom-popup: stue `media_player.tv_stue_a75_3`; pult `light.pultvifte_led`, `switch.pultvifte_*`; soverom `light.stavifte_led`, `light.sebastian_taklampe_1..4`, `switch.stavifte_*`;
do `light.creality_k2_light`, `light.do_klimasensor_status_led`; gang `switch.alarm_alarm_heimdall_2`, `switch.trappegang_roykvarsler_alarm_siren`, `switch.ringeklokke_boks`, `switch.shelly_em`;
kjøkken/vaskegang: gulvvarme-bryterne og `*_tuya_child_lock`.
Effekt-par kjøkken: `switch.brodrister→sensor.brodrister_power`, `switch.vannkoker→sensor.vannkoker_power`, `switch.kjoleskap→sensor.kjoleskap_power`, `switch.mikrobolgeovn→sensor.mikrobolgeovn_power`, `switch.kaffetrakter→sensor.kaffetrakter_power`, `switch.oppvaskmaskin→sensor.oppvaskmaskin_power`; vaskegang: `switch.fryseskap→sensor.fryseskap_power`, `switch.vaskemaskin→sensor.vaskemaskin_power`.

## Strøm (KI Energi = `ki_energi`, repo ki-strom)
- `sensor.strommaler_effekt` (W), `sensor.strommaler_powercalc_energy_daily` (kWh i dag)
- Kostnad: `sensor.um_daily_cost_strommaler_norgespris`, `sensor.total_stromregning_maned_norgespris`, `sensor.total_stromregning_ar_med_historikk_norgespris`,
  `sensor.um_daily_cost_strommaler`, `sensor.um_monthly_cost_strommaler`, `sensor.norgespris_besparelse_dag`
- Trend (attr `endring`, `trend`): `sensor.ki_stromforbruk_i_dag`, `sensor.ki_norgespris_spart_i_dag`, `sensor.ki_spotpris_mot_i_gar` (attr `ore_per_kwh`),
  `sensor.ki_forbruk_i_dag`, `sensor.ki_forbruk_denne_maneden`, `sensor.ki_forbruk_i_ar`
- Motor: `sensor.ki_energi_status`, `sensor.ki_laster`, `sensor.ki_beslutningslogg`, `sensor.ki_bereder`, `sensor.ki_tidskonstanter`
- Pris-brytere: `input_boolean.include_grid`, `input_boolean.include_el_company`, `input_boolean.include_government_support`, `input_boolean.include_vat`
- Kategorier (daglig/månedlig energi og kostnad): `sensor.<x>_energy_daily|_monthly`, `sensor.um_daily_cost_<x>|um_monthly_cost_<x>` for
  oppvarming (`oppvarming`, kost `oppvarming_kurs`), belysning (`lys`, kost `lights`), hvitvarer, data; kurser `stue_kurs`, `kjokken_kurs`, `soverom_og_bad_kurs`,
  `vaskegang_og_do_kurs` (kost `vaskegang_kurs`), `gang_og_bod_kurs`, `vaskemaskin_kurs`, `oppvaskmaskin_kurs`, `varmtvannsbereder_kurs`.
  Enheter: stue_panelovn, kjokken_panelovn, cybele_panelovn, trappegang_panelovn, sebastian_panelovn, bad_gulvvarme, kjokken_gulvvarme, vaskegang_gulvvarme, do_gulvvarme,
  hanklevarmer, stue_oljefyr, baderomsvifte, varmtvannsbereder_enhet, kjoleskap, fryseskap, komfyr, platetopp, oppvaskmaskin_enhet, vaskemaskin_enhet, mikrobolgeovn,
  kaffetrakter, vannkoker, brodrister, server_rack, stue_server_rack, do_server, creality_k2, og stikkontakter (pult, tv, stue_tak, stue_piano, spisebord, seng, cybele_soverom, rune_kontor, rune_soverom, veranda).

## Sikkerhet
`alarm_control_panel.alarm`, kodelengde 6, batterigrense 20 %, ansikt `sensor.ansiktsgjenkjenning_dorlas_sist_last_opp_av`.
Soner:
- Dører: `binary_sensor.inngangsdor` (Inngang, batt `sensor.inngangsdor_battery`), `binary_sensor.verandador` (Veranda, `sensor.verandador_battery`)
- Vinduer: `binary_sensor.kjokken_vindu` (Kjøkken), `binary_sensor.cybele_soverom_vindu` (Cybele soverom), `binary_sensor.rune_kontorvindu` (Rune kontor),
  `binary_sensor.rune_soveromsvindu` (Rune soverom), `binary_sensor.soveromsvindu_venstre` (Soverom venstre), `binary_sensor.soveromsvindu_hoyre` (Soverom høyre) – batteri `sensor.<samme>_battery`
- Bevegelse: `binary_sensor.trappegang_bevegelsessensor_occupancy` (Trapp/Inngang, batt `sensor.trappegang_bevegelsessensor_battery`), `binary_sensor.stue_g6_turret_motion` (Stue),
  `binary_sensor.everything_presence_lite_occupancy` (Stue, tilstede), `binary_sensor.bad_bevegelsesensor_motion` (Bad, batt `sensor.bad_bevegelsesensor_battery`),
  `binary_sensor.mellomgang_g5_turret_ultra_motion` (Mellomgang), `binary_sensor.pult_aqara_fp2_motion` (Pult)
- Låser: `lock.dorlas_blatann` (Dørlås, Inngang, batt `sensor.dorlas_wifi_battery`), `lock.boddor` (Boddør, Bod)
- Hjelpesensorer (kan mangle): `binary_sensor.ki_alarm_klar` (attr `hindringer`), `sensor.ki_alarm_dorer_apne`, `sensor.ki_alarm_vinduer_apne`, `sensor.ki_alarm_bevegelse_aktiv`, `sensor.ki_alarm_laser_ulast` (attr `totalt`, `apne_navn`, `aktive_navn`)

## Støvsuger (Sir Sweeps / «Rolf»)
`vacuum.sir_sweeps_a_lot` (attr `fan_speed`, `battery_level`), `sensor.sir_sweeps_a_lot_battery`, `binary_sensor.sir_sweeps_a_lot_charging`,
`binary_sensor.sir_sweeps_a_lot_water_shortage`, `binary_sensor.sir_sweeps_a_lot_water_box_attached`.
Rom-valg: `input_boolean.sir_sweeps_a_lot_sebsatian_soverom` (Soverom), `_pappa_soverom` (Pappa), `_mamma_soverom` (Mamma), `_pappa_kontor` (Kontor), `_trappegang` (Trapp).
Skript: `script.start_sir_sweeps_a_lot_room_select`, `script.stovsuger_start`, `script.stovsuger_pause`, `script.stovsuger_retuner_hjem`, `script.rolf_empty`,
soner `script.rolf_zone_stuebord` (Spisebord lite), `script.rolf_zone_stuebord_mye` (Spisebord mye), `script.rolf_zone_stue_uten_spisebord`, `script.rolf_zone_teppe` (Teppe stue), `script.rolf_zone_kjokkenbord`.
Vifte: `script.cycle_vacuum_fan_speed`, `input_select.vacuum_fan_speed`. Slitedeler (timer igjen): `sensor.sir_sweeps_a_lot_main_brush_time_left`, `_filter_time_left`, `_sensor_time_left`, `_side_brush_time_left`.
Totaler: `sensor.sir_sweeps_a_lot_total_cleaning_area` (m²), `sensor.sir_sweeps_a_lot_total_cleaning_time` («HH:MM:SS»). Kart: `image.sir_sweeps_a_lot_hjemme_andre_etasje`.

## Media
TV: `media_player.stue_tv` (Apple TV, fjernkontroll `remote.stue_tv`), `media_player.google_tv`. Musikk: `media_player.squeezebox_radio` (Sonos), `media_player.kjokken_radio`, `media_player.rn602_stue` (RN602).
Apper (kilde): Plex, NRK TV, Telia Play, TV 2 Play, YouTube, Netflix. RN602-kilder: AirPlay, Net Radio, Spotify, Bluetooth, CD, Phono, Optical1, Tuner.
Radio: `button.squeezebox_radio_preset_1` (NRK P1), `_2` (NRK JAZZ), `_3` (NRK P3), `_4` (P24-7 MIX), `_5` (NRK mp3), `_6` (Montebello).
Seertid: `sensor.tv_seertid_i_dag`, `sensor.tv_seertid_denne_maned`.

## Bil (Tesla Model Y)
Lås `switch.tesla_model_y_car_doors_locked`, tut `button.folkevogn_honk_horn`, defrost `switch.tesla_model_y_klima_climate_defrost`, frunk `switch.tesla_model_y_car_trunk_front`, bagasje `switch.tesla_model_y_car_trunk_rear`.
Lading: `switch.elbillader_charging`, `sensor.elbillader_charge_power` (W), ladegrense `input_number.tesla_model_y_ladegrense`, `sensor.ki_tesla_ladetid_gjenstaende` (min),
`sensor.ki_tesla_ladepris_estimat` (kr), `sensor.ki_tesla_forrige_lading_kostnad` (kr).
Kjøring: `sensor.tesla_model_y_batteri_estimert_batterirekkevidde` (km), `sensor.tesla_model_y_kilometerteller` (km), `sensor.tesla_model_y_daglig_kjoring`.
Sparing: `sensor.ki_drivstoff_spart_i_ar` / `_spart_denne_maneden` (attr `diesel_ville_kostet`, `strom_kostet`, `kjort_km`), `sensor.ki_drivstoff_kostnad_per_mil_tesla_model_y`,
`sensor.ki_drivstoff_kostnad_per_mil_audi_a6_avant_2011`, `sensor.ki_drivstoff_liter_diesel_spart_i_ar`, `sensor.ki_drivstoff_co2_spart_i_ar`, `sensor.ki_drivstoff_dieselpris`, `sensor.ki_drivstoff_ladepris`.
Batterinivå / klima / posisjon: finn `sensor.tesla_model_y_*`, `climate.tesla_model_y*`, `device_tracker.tesla_model_y*` automatisk (se ki-cards/src/84-ki-tesla-card.js for mønstre).

## Server / homelab
`sensor.speedtest_download`, `sensor.speedtest_upload`, `sensor.home_assistant_core_cpu_percent`, `sensor.home_assistant_core_memory_percent`, `sensor.d_day_darling_cpu_temperature`,
qBittorrent `sensor.qbittorrent_download_speed|_upload_speed|_active_torrents|_all_torrents`, `switch.qbittorrent_alternative_speed`,
Proxmox `sensor.1_node_pve_{cpu_usage,memory_usage,load_average_1m,swap_usage,io_wait,idle,network_rx,network_tx,node_updates,pve_version,kernel_version,backup_progress,ksm_shared_memory,root_filesystem_usage,last_task,node_score}`,
UniFi `sensor.stromstad_dream_machine_pro_google_wan_latency`, `sensor.stromstad_dream_machine_pro_cloudflare_wan_latency`, `sensor.dashboard_office` (attr `uptime`, `strom`).
(ki-cards/src/82-ki-homelab-card.js og 81/75/76 viser automatisk oppdagelse av gjester/containere/lagring.)

## Innstillinger
`switch.nattmodus` (ki_nattmodus), `input_boolean.innendors_privace_mode` (helg/privat), `sensor.soverom_vekking_neste_alarm`, morgen 05:00–12:00,
varslinger fra ki_varslinger (se ki-cards/src/83-ki-varsling-card.js og repo ki-varslinger), `input_boolean.kiosk_mode`.

## Kalender / post / hytte
Kalendere over. Post: `sensor.nar_kommer_posten_posten_sensor_next`, `sensor.nar_kommer_posten_posten_sensor_next_relative`. Bursdager `calendar.birthdays`.
Hytte (ki_hyttebes_k): steder Strömstad (blå, kyst), Toten (gul, land), Oslo (grønn, hus).
Seriestart: `sensor.sonarr_sonarr_upcoming_media`, `sensor.radarr_radarr_upcoming_media`.

## Person / helse (Sebastian)
Prefiks `sensor.sebastian_iphone_17_pro_`: steps, active_energy, exercise_time, walking_running_distance, heart_rate, resting_heart_rate, heart_rate_variability, vo2_max,
blood_oxygen, respiratory_rate, sleep_duration, in_bed, deep_sleep, core_sleep, rem_sleep, awake, weight, battery_level/battery_state (mobil) m.fl.

## Søvn / vekking / natt (ki_sovn, ki-vekking, ki-nattmodus)
`binary_sensor.<navn>_sovn_sover`, vekkealarm `soverom_vekking_*` (`sensor.soverom_vekking_neste_alarm`, `switch.soverom_vekking_*`), `switch.nattmodus`.

## Planter (ki_planter), sted «Sebastians soverom»
`binary_sensor.<plante>_trenger_vann` (attr navn, latin, ikon, tips, intervall_dager, sist_vannet, dager_siden, dager_igjen, neste_vanning, prosent, status, sted),
`button.<plante>_vannet_na`, evt. fuktighetssensor.

## Vanning (ki_vanning) / vann (ki_vann, prefiks `sensor.hjemme_`)
`binary_sensor.ki_vanning_vanner`, `sensor.ki_vanning_oversikt` (attr `aktiv_sone` m.fl.). Vann: `sensor.hjemme_vann_i_dag` (attr `per_person`), `sensor.hjemme_forklart_av_sensorene`,
`sensor.hjemme_dusj_i_dag`, `sensor.hjemme_toalett_i_dag`, `sensor.hjemme_vaskemaskin_i_dag`, dagsmål 400 L.

## Klima (KI Energi)
Se repo ki-klima-strom-kort (`ki-klima-strom-kort.js`) for hvordan sonene, moduser, varmtvann osv. oppdages automatisk fra `ki_energi`.

## 3D-printer (Creality K2)
Prefiks `creality_k2` (sensor/…), romvifte `fan.baderomsvifte`, Homey-bryter `button.homey_flows_02_creality_k2_bryter`, lys `light.creality_k2_light`, energi `sensor.creality_k2_energy_daily`.

## Utelys (ki_utelys)
`light.ute_lys`, `light.utelys_inngang`, `light.verandalamp`, `sensor.ki_utelys_neste_paa`, `sensor.ki_utelys_neste_av`, `sensor.ki_utelys_status`,
`switch.ki_utelys_auto`, `switch.ki_utelys_kveld`, `switch.ki_utelys_morgen`, `number.ki_utelys_terskel_paa`, `number.ki_utelys_terskel_av`, `number.ki_utelys_minst_morke`.

## Navigasjon (dokk)
Støvsuger (rød prikk når `binary_sensor.sir_sweeps_a_lot_water_box_attached` er `off`), Strøm, Musikk, Bil, Server, Innstillinger, Mer →
Klima, Søppel, Vanning, Kalender, Planter, Søvn, 3D-printer, Gjøremål.
