# Røde Kors Samfunnspuls — Besøkstjeneste-prototype

Hjemmeoppgave for senior frontend-utvikler i Røde Kors. Interaktiv kartbasert webside som svarer på:

> **"Hvor i Norge bør Røde Kors prioritere å starte eller styrke besøkstjenesten?"**

Henter åpne data fra SSB om eldre som bor alene per kommune, kombinerer med Røde Kors' egen oversikt over avdelinger og aktiviteter, og presenterer dekningsgap som et konkret beslutningsverktøy.

## Status

🚧 Under utvikling. Setup-fase.

## Tech stack

- **Next.js 16** (App Router, full SSG)
- **TypeScript** (strict)
- **Supabase** (PostgreSQL)
- **Røde Kors designsystem**
- **React + inline SVG** (kartet)

## Kjøre lokalt

```bash
npm install
cp .env.example .env.local
# fyll inn Supabase-credentials
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000).

## Datakilder

- **SSB tabell 06844** — "Personer 67 år og over i privathusholdninger"
- **Røde Kors organisasjons-API** — JSON-snapshot fra developer.redcross.no
- **Kartdata** — Kartverket via [robhop/fylker-og-kommuner](https://github.com/robhop/fylker-og-kommuner) (CC BY 4.0)

Mer informasjon under `/metode`-siden i appen.
