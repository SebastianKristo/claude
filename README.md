# KI Hjem Design

Pikselnøyaktig kopi av Claude Design-prosjektet **«Home Assistant sikkerhetspanel»** (`Hjem mobil` med alle arkene den åpner),
bygget som egne Lovelace-kort i ren JavaScript. Utseendet er hentet 1:1 fra designfilene (mål, farger i oklch, Space Grotesk,
Material Symbols Rounded, glass-dokken, bunnarket med den animerte pillen, karusellene og strømgrafen).
Fra det gamle dashboardet er **bare entitets-ID-ene** brukt – de er standardverdier i kortene, så alt virker uten konfig («auto config»).

## Installasjon (HACS)

[![Åpne i HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=SebastianKristo&repository=claude&category=plugin)

1. HACS → ⋮ → *Egendefinerte repositorier* → legg til `https://github.com/SebastianKristo/claude`, type **Dashboard**.
2. Søk opp **KI Hjem Design** og last ned. HACS legger til ressursen `/hacsfiles/claude/ki-hjem-design.js` selv.
3. Lag et nytt dashbord og lim inn `dashboard.yaml` i rå konfigurasjonsredigering.
   (Alternativ: `dashboard-bubble.yaml` bruker bubble-card-popups i stedet for kortets innebygde ark. Den varianten er ikke testet mot en ekte bubble-card – CSS-velgerne i `styles` kan måtte justeres for din bubble-card-versjon.)
4. Hard-refresh appen/nettleseren (Ctrl/Cmd + Shift + R, eller tøm frontend-bufferen i mobilappen).

### Manuelt
Kopier `dist/ki-hjem-design.js` til `/config/www/` og legg til `/local/ki-hjem-design.js` (JavaScript-modul) under
*Innstillinger → Dashbord → ⋮ → Ressurser*.

Fontene (Space Grotesk og Material Symbols Rounded) lastes automatisk fra Google Fonts.

## Tema

`themes/ki-hjem-design.yaml` er et Home Assistant-tema med designets farger (nesten svart, rosa aksent), Space Grotesk,
runde kort og dialoger. Det farger også HAs egne deler (topp, sidepanel, mer-info, skjemaer) og setter `--gray*`,
`--active-big` m.fl., så de eldre ki-*/button-card-kortene dine følger samme palett.

1. Kopier filen til `/config/themes/ki-hjem-design.yaml`.
2. I `configuration.yaml`: `frontend: { themes: !include_dir_merge_named themes }`.
3. *Utviklerverktøy → YAML → Last inn temaer på nytt*, og velg **KI Hjem Design** på profilen din. `dashboard.yaml` setter det også på visningen.

## GUI-editor

Alle kd-kortene kan redigeres i dashbord-editoren (ikke bare YAML). Feltene lages ut fra kortets standardkonfig:
entitetsvelgere med riktig domene, tall, brytere og tekst, og lister/objekter (soner, rom, kameraer …) som YAML under «Avansert».
Standardverdien står under hvert felt; et tomt felt betyr «bruk standard», så konfigen forblir kort.
I `kd-hjem-card` finnes en **Popups**-seksjon med et eget skjema for hvert av de 20 arkene, pluss «Rom – per rom»
(lagres som `ark_config` / `ark_config.rom_per`).

## Kortene

| Kort | Designfil | Ark-nøkkel / hash |
|---|---|---|
| `custom:kd-hjem-card` | Hjem mobil | – |
| `custom:kd-strom-card` | Strøm v3 | `strom` · `#strom` |
| `custom:kd-klima-card` | Klima v2 | `klima` · `#klima` |
| `custom:kd-sikkerhet-card` | Sikkerhet v2 | `sik` · `#alarm` |
| `custom:kd-kamera-card` | Kamera | `cam` · `#kamera` |
| `custom:kd-person-card` | Person | `person` · `#personer` |
| `custom:kd-vanning-card` | Vanning v2 | `vann` · `#vanning` |
| `custom:kd-planter-card` | Planter | `plants` · `#planter` |
| `custom:kd-sovn-card` | Søvn | `sleep` · `#sovn` |
| `custom:kd-vaer-card` | Vær | `vaer` · `#weather` |
| `custom:kd-stovsuger-card` | Støvsuger | `vac` · `#rolf` |
| `custom:kd-media-card` | Media | `media` · `#media` |
| `custom:kd-bil-card` | Bil | `car` · `#tesla` |
| `custom:kd-printer-card` | 3D-printer | `printer` · `#3d` |
| `custom:kd-server-card` | Server | `server` · `#server` |
| `custom:kd-innstillinger-card` | Innstillinger | `settings` · `#settings` |
| `custom:kd-kalender-card` | Kalender | `cal` · `#kalender` |
| `custom:kd-gjoremal-card` | Gjøremål | `todo` · `#gjoremal` |
| `custom:kd-soppel-card` | Søppel | `trash` · `#soppel` |
| `custom:kd-lys-card` | Lys v2 | `lys` · `#lys` |
| `custom:kd-rom-card` | Rom v2 | `rom` · `#stue`, `#kjokken`, `#pult`, `#soverom`, `#bad`, `#gang`, `#do`, `#cybele`, `#rune`, `#kontor`, `#ute`, `#vaskegang` |

Ikke med: de eldre variantene (`Strøm`, `Strøm v2`, `Sikkerhet`, `Klima`, `Lys`, `Rom`, `Vanning`, `Vanning v3/v4`) og `iPad Dashboard`, siden «Hjem mobil» bruker v-versjonene over.

Hvert ark-kort kan også brukes alene (f.eks. i en bubble-card-popup): da tegner det designets topp-pille øverst.
Inne i `kd-hjem-card` åpnes de i det innebygde bunnarket.

## kd-hjem-card

```yaml
type: custom:kd-hjem-card
ark: intern          # intern (standard) | bubble – bubble: bare naviger til #hash
meg: sebastian       # standard: personen koblet til innlogget bruker
hjem: { venstre: [stue, inngang, ute], hoyre: [pult, kjokken] }
etasjer: { '1': [stue, kjokken, inngang, do, vaskegang], '2': [pult, soverom, bad, cybele_soverom, rune_soverom, rune_kontor] }
servere: [{ navn: Strømstad, sub: Lokal · tilkoblet, ikon: home, url: ... }]
rom: { stue: { navn: Stue, ikon: weekend, farge: 'oklch(0.8 0.12 150)', temp: sensor..., fukt: sensor..., sett: input_number..., lys: light... } }
ark_config: { strom: {...}, rom_per: { stue: {...} } }
```
Entitetsnøkler (med standard): `vaer` weather.forecast_home · `ute_temp` sensor.vaervarsel_temperature · `pris` sensor.norgespris_total_strompris_norgespris ·
`pris_total` sensor.totalpris_inkludert_grid_el_company_og_stromstotte · `pris_spot` sensor.nordpool_kwh_no1_nok_3_10_025 · `pris_norges` sensor.norgespris_pris_na ·
`effekt` sensor.strommaler_effekt · `lys_totalt` sensor.hele_huset_lys · `kalender_sensor` sensor.alle_kalendere · `las` lock.dorlas_blatann ·
`las_batteri` sensor.dorlas_wifi_battery · `las_sist` sensor.ansiktsgjenkjenning_dorlas_sist_last_opp_av · `autolas` (finnes automatisk) ·
`alarm` alarm_control_panel.alarm · `bevegelse` [kamerasensorene] · `gjoremal` todo.gjoremal · `soppel` [avfallssensorene] ·
`stovsuger_varsel` / `stovsuger_vannboks` (rød prikk på dokken) · `sover_nar` on.

Automatisk: personen som hører til innlogget bruker blir «meg»; romdata hentes fra KI Rom (`sensor.<rom>_oversikt`/`_lys`) når det finnes;
antall lys på faller tilbake til å telle `light.*`; hendelser i dag faller tilbake til kalender-API-et.

## Arkene – konfig

Alle nøkler er valgfrie; standardverdiene er dine entiteter (se `docs/entiteter.md`) og resten finnes automatisk.
Dokumentasjonen for hver nøkkel står øverst i hver fil i `src/`. Kort oppsummert:

- **Strøm** – `effekt`, `energi_i_dag`, `pris`, `spotpris`, `norgespris`, `spart_i_dag`, `bereder`, `varmtvann`, `effekt_grense_kw`, `dyr` (1.5), `middels` (1.1), `rom`, `enheter`, `skjul`. Rom/enheter fra KI Rom, forbruk per time fra langtidsstatistikken, hendelser fra loggboken.
- **Klima** – KI Energi-sensorene (`status`, `laster`, `logg`, `prognose`, `nettleie`, `bereder` …), `fane`. Soner, personer, lysregler og bereder oppdages som i ki-klima-strom-kort; handlinger via `ki_energi.*`-tjenestene.
- **Sikkerhet** – `entity` (alarm_control_panel.alarm), `kode_lengde` (6), `batteri_grense` (20), `ansikt`, `zones` (standard: dine dører, vinduer, bevegelse og låser). Hold inne modus 0,9 s; kode tastes på tastaturet når alarmen krever det.
- **Kamera** – `kameraer` (standard: dine fem UniFi/Frigate-kameraer), `auto`, `skjul`, `oppdater` (10 s), `direkte`, `sirene`, `frigate`.
- **Person** – `person: sebastian|cybele|rune`, `personer`, `soner`, `bilde`. Mobil- og helsesensorer finnes fra personens device_tracker.
- **Vanning** – KI Vanning/OpenSprinkler oppdages; `vann_prefiks` (sensor.hjemme_), `rate`, `standard_min`, `historikk_dager`.
- **Planter** – alle KI Planter-planter; `sted`, `fukt_spenn`, `planter` (overstyring per plante).
- **Søvn** – `personer`, `vekking` (tom = alle KI Søvn-vekkealarmer), `nattmodus`.
- **Vær** – `sted` (Strømstad), `vaer`, `naa`, `sol`, `maane`, `pollen: auto`, `luft`, `timer`, `dager`.
- **Støvsuger** – `entity`, skriptene (`start`, `start_rom`, `pause`, `hjem`, `tom`), `rom` (dine input_boolean-er, valgfritt `areal`), `soner`, `deler`.
- **Media** – `tv`, `fjernkontroll`, `musikk`, `hoyttalere`, `apper`, `radio`.
- **Bil** – Tesla-entitetene, `smartlading` (switch.ki_lading_automatikk), `kapasitet` (75), `ladeeffekt_kw` (11), `prefiks`.
- **3D-printer** – `prefiks` (creality_k2), `lys`, `romvifte`, `energi`, `homey_bryter`, `cfs_spor`.
- **Server** – `pve_node`, `unraid`, speedtest/qBittorrent, `faner`. Proxmox-gjester, Unraid, UniFi og lagring oppdages.
- **Innstillinger** – `natt`, `privat`, `vekking`, `kiosk`, `morgen_fra`/`morgen_til`, `strom` (KI Energi-varsler). Varslingsregler fra KI Varslinger.
- **Kalender** – `kalendere`, `auto`, `bursdager`, `post`, `serier`/`filmer`, `hytter` (KI Hyttebesøk oppdages).
- **Gjøremål** – `lister` (todo.gjoremal, todo.personlig_seb), `auto`.
- **Søppel** – `fraksjoner`, `auto`, `dager_attributt`, `dato_attributt`, `intervall` (14), `varsel`.
- **Lys** – `fane`, utelys-entitetene (KI Utelys), `etasjer`, `skjul`.
- **Rom** – `rom`, `navn`, `ikon`, `farge`, `temp`, `fukt`, `sett`, `lys`, `skjul`, `effekt_par`. Innhold fra KI Rom eller HA-områder.

## Bevisste avvik fra designet

Designet er en prototype med oppdiktede tall. Der Home Assistant har dataene er utseendet identisk; der ingen entitet finnes,
vises `–` eller elementet skjules (aldri falske verdier). Eksempler: m²-tall per rom i Støvsuger vises bare med `areal` i config,
«Autolås»-raden i låsdialogen bare hvis en autolås-bryter finnes, luftkvalitet i Vær bare med sensorer, og sikkerhetsarket har
et kodetastatur (samme formspråk) fordi alarmen din krever kode. Kortene viser også tilstander designet mangler (feil, utilgjengelig).

## Verifisering

Hvert kort er sammenlignet med designfilen rendret i samme nettleser, med mock-data som gjenskaper designets eksempelverdier
(pixelmatch). Resultat: 0 % avvik for de fleste visninger; gjenstående avvik skyldes klokkeslett/ekte data.
`node test/alle-ark.js` åpner alle arkene i Hjem-kortet fra den bygde bunten uten konsollfeil.

## Utvikling

- `src/` – ett kort per fil, `00-kd-base.js` er grunnmuren (DOM-morph, hendelser, hass-hjelpere, ark-pillen).
- `./build.sh` → `dist/ki-hjem-design.js`.
- `test/` – mock av hass og skjermbildeverktøy (`test/shoot.js`) brukt til å sammenligne hvert kort piksel for piksel med designet.
- `docs/entiteter.md` – entitetene fra det gamle dashboardet. `docs/ARBEIDSREGLER.md` – porteringsreglene.
