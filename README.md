# Røde Kors Samfunnspuls — case

Hjemmeoppgave for senior frontend-stillingen i Røde Kors. En interaktiv kartside som viser hvor i Norge det er størst dekningsgap for fire RK-aktiviteter: besøkstjeneste, leksehjelp, norsktrening og flyktningguide.

Tanken er å gi fagansvarlige og frivillige et utgangspunkt for å planlegge nye lokale grupper.

🌐 Live: <https://rk-case.vercel.app/>

## Tech

- Next.js 16 (App Router, full SSG)
- React 19
- TypeScript (strict)
- Supabase (Postgres med RLS)
- rk-designsystem + rk-design-tokens
- CSS Modules

## Arkitektur

Følger oppgavens datafyt: **åpen data → DB → API → frontend**.

```
SSB API + RK-JSON
   │  (scripts/ingest-*.ts)
   ↓
Supabase Postgres
   │  (lib/data.ts, intern loader med cache)
   ↓
Next.js API-routes  (/api/coverage, /api/geo, /api/kommuner, /api/kommune/[knr])
   │  (lib/api-client.ts)
   ↓
Frontend (server components → client components for interaksjon)
```

Frontend henter aldri fra DB direkte — alt går via vårt eget API.

## Kjøre lokalt

```bash
npm install
cp .env.example .env.local   # fyll inn Supabase-keys
```

Kjør innholdet i `db/schema.sql` i Supabase SQL Editor (idempotent), så:

```bash
npm run ingest:ssb         # SSB tabell 06844 + oppretter kommunene
npm run ingest:ssb-extra   # SSB 07459 og 09817
npm run ingest:redcross    # RK-JSON inn i DB
npm run dev
```

## Datakilder

- **SSB** tabell 06844 (eldre alene), 07459 (alder), 09817 (innvandrere — også brukt for flyktning-proxy)
- **Røde Kors** organisasjons-JSON (`data/redcross-organizations.json`)
- **Kartverket** GeoJSON via [robhop/fylker-og-kommuner](https://github.com/robhop/fylker-og-kommuner) (CC BY 4.0)

Flyktning-tall er proxy: sum innvandrere fra 13 klassiske flyktningland (Syria, Afghanistan, Eritrea, Somalia, Ukraina osv.). SSB publiserer ikke flyktningstatus per kommune av personvernhensyn — samme proxy brukes av samfunnspuls.no.

## API

```
GET /api/coverage                          # alle 4 aktiviteter
GET /api/coverage?activity=...&fylke=...   # filtrert single aktivitet
GET /api/kommuner                          # liste over alle kommuner
GET /api/kommune/[knr]                     # full detaljside-data
GET /api/geo                               # SVG-paths for kartet
```

## Notater

- Storkommuner etter kommunereformen 2020 (Ullensvang, Sunnfjord m.fl.) rommer flere historiske RK-foreninger på distinkte tettsteder. Modellen aggregerer på kommune-nivå og overestimerer dermed dekning for sånne kommuner litt.
- RLS er aktivt på alle tabeller. Anon-keyen er trygg å eksponere — den kan kun SELECT.
- Kun aktive Lokalforening- og Distrikt-typer lastes inn fra RK-JSON. Stiftelser/AS/terminerte foreninger filtreres bort.
