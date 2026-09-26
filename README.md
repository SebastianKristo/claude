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

`themes/ki-hjem-design.yaml` er et Home Assistant-tema (kun mørk modus, så HA bruker mørk grunnpalett overalt) med designets farger (nesten svart, rosa aksent), Space Grotesk,
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

## Tilpass rom (skjul/vis uten entitets-ID-er)

Nederst i hver rompopup: **Tilpass rommet**. Trykk på lys, enheter, mediespillere eller sensorer for å skjule eller vise dem, og **Ferdig** når du er ferdig.
Valgene lagres som Home Assistant-brukerdata (følger brukeren på alle enheter) og brukes også i Lys-arket. **Nullstill** går tilbake til standard.

## Servervelger

Trykk på stedsnavnet øverst (Oslo / Strömstad / Toten) for å bytte Home Assistant-server i companion-appen – samme mekanisme som familiekortet
(`homeassistant://navigate/<sti>?server=<navn>`). Gjeldende server finnes fra installasjonens navn. Konfig: `servere`, `server_sti`, `server_navn`.

## Haptikk

Alle trykk gir vibrasjon i HA-appen (hendelsen `haptic`). Slå av med `haptikk: false` på kortet.

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
| `custom:kd-gressklipper-card` | Robotgressklipper | `mower` · `#gressklipper` |
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
**Strømprofiler:** `strom_profil: auto | no | se` (også på `kd-strom-card`). `auto` velger ut fra landet i HA og hvilke sensorer som finnes.
- `no` – Norgespris/NOK: totalpris `sensor.totalpris_inkludert_grid_el_company_og_stromstotte`, spot `sensor.nordpool_kwh_no1_nok_3_10_025`, Norgespris `sensor.norgespris_pris_na`.
- `se` – Sverige/SEK: pris nå `sensor.stromstad_totalpris_kwh_sek`, totalpris `sensor.stromstad_totalpris_kwh_ore`, spot `sensor.nordpool_kwh_se3_sek_3_10_0` (ingen fastpris-fane).

Öre/øre/cent og Nord Pool sin `price_in_cents` tolkes riktig, og 15-minutterspriser slås sammen til timer. Egne profiler eller andre sensorer:
```yaml
strom_profil: se
strom_profiler: { se: { pris_spot: sensor.nordpool_kwh_se4_sek_3_10_025 } }
```
`pris`, `pris_total`, `pris_spot` og `pris_norges` i config overstyrer profilen.

Entitetsnøkler (med standard): `vaer` weather.forecast_home · `ute_temp` sensor.vaervarsel_temperature · `effekt` sensor.strommaler_effekt · `lys_totalt` sensor.hele_huset_lys · `kalender_sensor` sensor.alle_kalendere · `las` lock.dorlas_blatann ·
`las_batteri` sensor.dorlas_wifi_battery · `las_sist` sensor.ansiktsgjenkjenning_dorlas_sist_last_opp_av · `autolas` (finnes automatisk) ·
`alarm` alarm_control_panel.alarm · `bevegelse` [kamerasensorene] · `gjoremal` todo.gjoremal · `soppel` [avfallssensorene] ·
`sover_nar` on · `kant` (10 – avstand til skjermkanten i px, gjelder også alle popups) · `dokk_stil` (`bred` som Apple Music | `kompakt` designets glassdokk).

Liquid Glass-dokken og «Mer»-menyen kan settes opp selv (standard er designets knapper):
```yaml
dokk:                       # knappene i dokken; «Mer» legges alltid til sist
  - { ikon: cleaning_services, ark: vac, prikk: binary_sensor.x_water_shortage }
  - { ikon: bolt, ark: strom }
  - { ikon: lightbulb, entity: light.stue }      # entity: slå av/på (hold = mer info)
  - { ikon: tv, hash: '#media' }                 # eller sti: /lovelace/2 · url: https://…
meny:                       # «Mer»-menyen
  - { navn: Klima, ikon: thermostat, ark: klima, farge: 'oklch(0.8 0.12 60)' }
```
`prikk` viser rød prikk når entiteten er «på», `prikk_av` når den er «av».

Dokken i bruk: dra fingeren langs dokken – glasslinsen følger fingeren, og slipp velger knappen.
Under de tre prikkene ligger **«Tilpass dokken»**: flytt knapper mellom dokken og «Mer»-menyen (maks 7 i dokken),
endre rekkefølge, slå navn under ikonene av/på og velg om dokken skal krympe når du scroller.
Valgene lagres per bruker i HA. Standardverdiene kan også settes i config: `dokk_stil` (bred), `dokk_navn` (true) og `dokk_krymp` (true).

Automatisk: personen som hører til innlogget bruker blir «meg»; romdata (temperatur, fukt, lys) hentes fra KI Rom-sensorene når de finnes;
antall lys på faller tilbake til å telle `light.*`; hendelser i dag faller tilbake til kalender-API-et.

## Tilpass fra appen (lagres per bruker i HA)

- **«Mer» → Tilpass Hjem** – rekkefølge og synlighet for seksjonene (personer, setningen øverst, rom/fliser, søppel, strømpriser),
  delene av setningen øverst (ute, strømpris, effekt, lys, hendelser) og flisene i hver kolonne (flytt, bytt kolonne, skjul).
- **«Mer» → Tilpass dokken** – knapper i dokken / bak de tre prikkene, bred stil, navn, krymping. Dokken markerer popupen som er åpen, og «Hjem» når ingen er åpen.
- **Rom → Tilpass rommet** – skjul/vis elementer, velg temperatur- og fuktsensor (også søk i alle sensorer), og slå av animasjonen i topp-pillen (`topp_animasjon: false` i config gjør det samme).
- **Kamera → Tilpass kameraer** – rekkefølge, bytt entitet, fjern og legg til kameraer.
- **Alarm → Tilpass sensorene** – rekkefølge, fjern og legg til dører, vinduer, bevegelse, låser, røyk/lekkasje m.m. (med søk).

Hjem og popupene bruker full bredde (Pixel Fold, iPad). `bredde`-variabelen `--kd-bredde` kan begrense den via kortets `card_mod`/tema om ønskelig.

### Familie-toppen
«Mer» → Tilpass Hjem → **Topp-oppsett: Familie** gir samme topp som familiekortet i ki-cards: «👋 Navn!» med serverpil til venstre
og alle profilbildene med stedsmerke (hjemme, sover, sone eller borte) til høyre. Hilsenen kan endres (`{navn}`, `{server}`), også i config: `topp: familie`, `hilsen: '👋 {navn}!'`.

### Nytt i denne runden
- **Tilpass oppsett i alle popups** (knapp nederst): flytt og skjul seksjonene. Kortene kan ha egne valg øverst i panelet:
  Kalender (hvilke kalendere som vises), Media (TV, høyttalere, apper og hva volumknappene styrer: automatisk, fjernkontroll,
  en forsterker/mediespiller eller to skript – også `volum`, `volum_opp`, `volum_ned` i config).
- **Tilpass dokken**: «Ny knapp» (popup, rom, person eller side/URL med navn og ikon), slett egne knapper, og skjul knapper helt fra «Mer».
- **Tilpass Hjem**: tittel (servernavn eller ditt navn), personer på toppen (legg til alle `person.*`, fjern, sorter),
  etasjer (vis/skjul, velg rom per etasje), romkort (stor/middels/liten, klimaknapp av/på), avstand under strømpriser.
- **Personer**: trykk åpner personens egen popup (`#person-<id>`), hold inne gir hurtigvalg hjemme/borte/sover.
  Merket på bildet viser stedet som i familiekortet (hjemme/sover, sonens eget ikon, eller fly når borte) med stedsnavn under.
- **Dobbelttrykk** på tittelen åpner innstillingene (`dobbeltrykk: /config`).
- **Strømpriser**: ny velger over hele bredden for Total / Spot / fastpris.

## Arkene – konfig

Alle nøkler er valgfrie; standardverdiene er dine entiteter (se `docs/entiteter.md`) og resten finnes automatisk.
Dokumentasjonen for hver nøkkel står øverst i hver fil i `src/`. Kort oppsummert:

- **Strøm** – `strom_profil`, `effekt`, `energi_i_dag`, `pris`, `spotpris`, `norgespris`, `spart_i_dag`, `bereder`, `varmtvann`, `effekt_grense_kw`, `dyr` (1.5), `middels` (1.1), `rom`, `enheter`, `skjul`. Rom/enheter fra KI Rom, forbruk per time fra langtidsstatistikken, hendelser fra loggboken.
- **Klima** – KI Energi-sensorene (`status`, `laster`, `logg`, `prognose`, `nettleie`, `bereder` …), `fane`. Soner, personer, lysregler og bereder oppdages som i ki-klima-strom-kort; handlinger via `ki_energi.*`-tjenestene.
- **Sikkerhet** – `entity` (alarm_control_panel.alarm), `kode_lengde` (6), `batteri_grense` (20), `ansikt`, `zones` (standard: dine dører, vinduer, bevegelse og låser). Hold inne modus 0,9 s; kode tastes på tastaturet når alarmen krever det.
- **Kamera** – `kameraer` (standard: dine fem UniFi/Frigate-kameraer), `auto`, `skjul`, `oppdater` (10 s), `direkte`, `sirene`, `frigate`.
- **Person** – `person: sebastian|cybele|rune`, `personer`, `soner`, `bilde`. Mobil- og helsesensorer finnes fra personens device_tracker.
- **Vanning** – KI Vanning/OpenSprinkler oppdages; `vann_prefiks` (sensor.hjemme_), `rate`, `standard_min`, `historikk_dager`.
- **Planter** – alle KI Planter-planter; `sted`, `fukt_spenn`, `planter` (overstyring per plante).
- **Søvn** – `personer`, `vekking` (tom = alle KI Søvn-vekkealarmer), `nattmodus`.
- **Vær** – `sted` (Strømstad), `vaer`, `naa`, `sol`, `maane`, `pollen: auto`, `luft`, `timer`, `dager`.
- **Støvsuger** – `entity`, skriptene (`start`, `start_rom`, `pause`, `hjem`, `tom`), `rom` (dine input_boolean-er, valgfritt `areal`), `soner`, `deler`.
- **Media** – `tv`, `fjernkontroll` (finnes automatisk; styreflaten kan trykkes eller sveipes, og vekker Apple TV-en hvis den sover), `musikk`, `hoyttalere`, `apper`, `radio`.
- **Bil** – Tesla-entitetene, `smartlading` (switch.ki_lading_automatikk), `kapasitet` (75), `ladeeffekt_kw` (11), `prefiks`.
- **3D-printer** – `prefiks` (creality_k2), `lys`, `romvifte`, `energi`, `homey_bryter`, `cfs_spor`.
- **Server** – `pve_node`, `unraid`, speedtest/qBittorrent, `faner`. Proxmox-gjester, Unraid, UniFi og lagring oppdages.
- **Innstillinger** – `natt`, `privat`, `vekking`, `kiosk`, `morgen_fra`/`morgen_til`, `strom` (KI Energi-varsler). Varslingsregler fra KI Varslinger.
- **Kalender** – `kalendere`, `auto`, `bursdager`, `post`, `serier`/`filmer`, `hytter` (KI Hyttebesøk oppdages).
- **Gjøremål** – `lister` (todo.gjoremal, todo.personlig_seb), `auto`.
- **Søppel** – `fraksjoner`, `auto`, `dager_attributt`, `dato_attributt`, `intervall` (14), `varsel`.
- **Lys** – `fane`, utelys-entitetene (KI Utelys), `etasjer`, `skjul`.
- **Rom** – `rom`, `navn`, `ikon`, `farge`, `temp`, `fukt`, `sett`, `lys`, `skjul`, `effekt_par`. Innhold fra KI Rom eller HA-områder.
  «Tilpass rommet» nederst i rom-popupen: trykk på elementer for å skjule/vise, og velg hvilken KI Rom-sensor rommet skal hente
  temperatur og fukt fra. Valget lagres per bruker i HA og brukes både i popupen og på romkortene i Hjem.

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
