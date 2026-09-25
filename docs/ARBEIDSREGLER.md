# Arbeidsregler for kd-kortene (for utviklere/agenter)

Mål: **pikselnøyaktig kopi** av Claude Design-filene, som fungerende Home Assistant-kort med ekte data.
Designfilene ligger i `/tmp/claude-0/-home-user/1790ad22-b176-58f3-8971-1fbe9108bfbd/scratchpad/design/home-assistant-sikkerhetspanel/project/`
(filnavn med æøå er kodet som `#U00f8` osv. – f.eks. `Str#U00f8m v3.dc.html`).

## Absolutte regler
1. Repoene `/home/user/ki-*` er **skrivebeskyttet**. Les gjerne (for entitets-ID-er og hvordan integrasjonene eksponerer data), men endre/commit/push aldri noe der.
2. Du skriver **kun** dine egne filer: `src/NN-kd-<navn>-card.js` og `test/mock/NN-<navn>.js`. Ikke rør `src/00-kd-base.js`, andres filer, `build.sh`, `test/shoot.js` eller `test/harness.html`.
   Trenger du en hjelper grunnmuren mangler, lag den lokalt i din egen fil.
3. Det gamle dashboardet (raw config) brukes **bare** som kilde til entitets-ID-er – aldri til utseende. Alt utseende kommer fra designfilen.
4. Ingen falske data i produksjon. Designets eksempeldata skal bare finnes i mock-filen din. Mangler en entitet: vis `–` eller skjul elementet på samme måte som designet selv gjør (tomme lister osv.).

## Slik porterer du en designfil
Designfilene er React-baserte maler (`<x-dc>`): mal-HTML med `{{ uttrykk }}`, `<sc-for list="{{ xs }}" as="x">`, `<sc-if value="{{ b }}">`,
`onClick="{{ fn }}"`, `style="{{ stilobjekt }}"`, `style-hover`/`style-active`, og en `class Component extends DCLogic` med `state` og `renderVals()`.

- Lag en klasse som arver `KD.KDSheet` (se `src/00-kd-base.js`). Implementer `body()` som returnerer HTML-strengen for **hele rot-diven i designfilen** (inkl. `<header>` – den skjules automatisk, som i designet der `[data-sheet-scroll] header{display:none}`).
- Kopier **alle** stilverdier ordrett (størrelser, farger, oklch, radius, gap, skygger, font-variation-settings). Stilobjekter fra `renderVals()` kopieres ordrett og gjøres om med `KD.S({...})` (samme regler som React: tall → px unntatt enhetsløse egenskaper).
- `{{ x }}` → `${KD.e(x)}` for tekst (escape!) og `${KD.S(obj)}` for stil. `<sc-for>` → `${list.map(x => `...`).join('')}`. `<sc-if>` → `${cond ? `...` : ''}`.
- `onClick="{{ fn }}"` → `data-on-click="metodenavn" data-arg="..."`. Metoden kalles som `this.metodenavn(event, arg, element)`. Innerste element med handler vinner (tilsvarer `stopPropagation`).
  Andre hendelser: `data-on-scroll`, `data-on-pointermove`, `data-on-pointerdown`, `data-on-pointerleave`, `data-on-input`, `data-on-change` … Langt trykk: `data-hold="metode"`.
- `style-hover="..."` / `style-active="..."` → legg til en klasse og regelen i `static sheetCss = '.x:hover{...}'`.
- Lokal UI-tilstand (valgt fane, valgt time, åpne dialoger) → `this.state` / `this.setState()`. Alt som er husets tilstand → ekte entiteter.
- Designets handlinger → ekte tjenestekall: `this.call(domain, service, data)`, `this.toggle(id)`, `this.press(id)`, `this.setNum(id, v)`, `this.more(id)` (mer-info), `this.nav('#hash' | '/sti')`.
- Lesing: `this.st(id)`, `this.v(id)`, `this.n(id, def)`, `this.at(id, attr, def)`, `this.isOn(id)`, `this.ok(id)`, `this.fname(id)`, `this.find('sensor.*_battery')`, `this.all()`.
- Asynkrone data (historikk, statistikk, kalender, gjøremål): `this.cached(nøkkel, ttlMs, () => this.history([...], 24), standard)` – returnerer siste verdi straks og rendrer når data kommer.
  Ferdige lastere: `this.history(ids, timer)`, `this.stats(ids, timer, 'hour'|'day'|'month')`, `this.calendar(ids, dager)`, `this.todos(id)`, `this.ws(msg)`, `this.api(method, path)`.
- Registrer: `KD.define('kd-<navn>-card', Klasse, 'KD <Navn>', 'beskrivelse')` og `KD.sheet('<nøkkel>', 'kd-<navn>-card')`.
- `static head = [ikon, tittel, undertekst]` (eller en funksjon som bruker `this`) – dette vises i topp-pillen. Verdiene står i oppgaven din.
- `static defaults = { ... }` – alle entitets-ID-er som config-nøkler med brukerens ID-er som standard. Kortet skal virke med bare `type: custom:kd-<navn>-card` («auto config»): finn resten automatisk (prefiks-søk, ki_rom-/ki_energi-sensorer osv.), og la alt kunne overstyres i config.
- Mal-strenger: bruk template literals; hold markupen strukturelt lik designet (samme elementer, samme nesting) så layouten blir identisk.
- SVG-grafer: kopier viewBox, defs, gradienter og stier; regn ut stiene fra ekte data på samme måte som designet regner ut fra eksempeldata.

## Mock og verifisering (obligatorisk)
- Lag `test/mock/NN-<navn>.js` med `MOCK.add({ 'sensor.x': { state: '..', attributes: {...} }, 'switch.y': 'on' })` som gjenskaper **designets eksempelverdier**, slik at skjermbildet ditt kan sammenlignes 1:1 med referansen.
  Asynkrone kall: `MOCK.ws('type', msg => svar)`, `MOCK.api(/regex/, (path) => svar)`. Legg bare inn dine egne entiteter.
- Referanse: `cd /tmp/claude-0/-home-user/1790ad22-b176-58f3-8971-1fbe9108bfbd/scratchpad/tools && node shoot-design.js "<Fil>.dc.html" /tmp/.../scratchpad/cmp/<navn>-ref.png 420 <høyde>`
  (valgfritt `--eval "js"` for å klikke i designet før bildet tas).
- Ditt kort: `cd /home/user/ki-hjem-design/test && KD_FONTS=/tmp/claude-0/-home-user/1790ad22-b176-58f3-8971-1fbe9108bfbd/scratchpad/fonts PW=/tmp/claude-0/-home-user/1790ad22-b176-58f3-8971-1fbe9108bfbd/scratchpad/tools/node_modules/playwright node shoot.js kd-<navn>-card /tmp/.../scratchpad/cmp/<navn>-kd.png 420 <høyde> --wrap sheet --cfg '{"header":false}'`
  (`--eval "js"` kjøres i siden etterpå; kortet nås med `document.querySelector('kd-<navn>-card').shadowRoot`).
- Se på begge bildene (Read-verktøyet viser PNG) og juster til de er like. Sjekk også frittstående modus (uten `"header":false`) og minst én interaksjon (klikk) via `--eval`.
- Sørg for null feil i konsollen (`PAGEERROR`/`CONSOLE error` skrives ut av shoot.js).

## Rapport tilbake
Kort liste: filer, kortnavn, config-nøkler med standardverdier, entiteter som brukes, hva som oppdages automatisk, og eventuelle avvik fra designet (med grunn).

## VIKTIG: interpolasjoner er egne <span>-er
Designets runtime rendrer hver `{{ uttrykk }}` i tekst som et eget `<span class="sc-interp">`, og teksten rundt som egne tekstnoder.
I en **flex/grid-beholder** blir dermed verdien og teksten rundt **separate flex-elementer**: mellomrom i starten/slutten av tekstbitene
forsvinner og `gap` brukes i stedet. Eksempel: `<span style="display:inline-flex">{{ watt }} W</span>` vises som «1 155W» (ingen mellomrom),
og `<button style="display:flex;gap:5px">…{{ n }} lys</button>` får 5 px mellom «7» og «lys».
Gjør derfor ALLTID slik: `{{ x }}` → `<span>${KD.e(x)}</span>` (ikke bare `${x}`) når det står i tekstinnhold, så layouten blir identisk.

Grunnmuren matcher elementer med `data-key="..."` på nøkkel (flytter i stedet for å erstatte). Bruk det på elementer som kan dukke opp/forsvinne foran andre (dialoger, betingede seksjoner), så DOM/scroll/animasjoner bevares.
