-- ====================================================================
-- Røde Kors Samfunnspuls — Database Schema
-- Run this in Supabase SQL Editor (idempotent — safe to re-run).
-- ====================================================================

-- ----------------------------------------------------------------
-- 1. Kommuner med befolkningsdata (fra SSB tabell 06844)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS municipalities (
  kommunenummer            text PRIMARY KEY,         -- "0301", "5634"
  kommunenavn              text NOT NULL,            -- "Oslo", "Karasjok"
  kommunenavn_normalized   text NOT NULL,            -- lowercase + trim, for join mot RK-data
  fylkesnummer             text,
  fylkesnavn               text,
  antall_67_79_alene       integer,                  -- fra SSB 06844 (Aleneboende, alder 67-79)
  antall_80plus_alene      integer,                  -- fra SSB 06844 (Aleneboende, alder 80+)
  antall_67plus_alene      integer GENERATED ALWAYS AS (
                              COALESCE(antall_67_79_alene, 0) + COALESCE(antall_80plus_alene, 0)
                           ) STORED,
  total_befolkning         integer,                  -- valgfritt (SSB 07459, stretch)
  data_year                integer,
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_municipalities_fylke
  ON municipalities(fylkesnummer);

CREATE INDEX IF NOT EXISTS idx_municipalities_navn_norm
  ON municipalities(kommunenavn_normalized);

-- ----------------------------------------------------------------
-- 2. Røde Kors lokalforeninger (kun aktive Lokalforening-typer)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS red_cross_branches (
  branch_id           text PRIMARY KEY,              -- "L098"
  branch_number       text,                          -- "0600069"
  name                text NOT NULL,                 -- "Modum Røde Kors"
  branch_type         text NOT NULL,                 -- alltid "Lokalforening" i denne tabellen
  parent_name         text,                          -- "Buskerud Røde Kors"
  municipality_name   text,                          -- rå navn-streng fra JSON
  kommunenummer       text REFERENCES municipalities(kommunenummer),  -- løst opp via name-match (kan være NULL)
  county              text,                          -- "Buskerud"
  postal_code         text,
  email               text,
  phone               text,
  web                 text,
  is_active           boolean NOT NULL DEFAULT true,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branches_kommunenummer
  ON red_cross_branches(kommunenummer);

-- ----------------------------------------------------------------
-- 3. Hvilke aktiviteter en lokalforening tilbyr
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS branch_activities (
  branch_id        text REFERENCES red_cross_branches(branch_id) ON DELETE CASCADE,
  activity_name    text NOT NULL,                    -- f.eks. "Besøkstjeneste", "Hjelpekorps"
  PRIMARY KEY (branch_id, activity_name)
);

CREATE INDEX IF NOT EXISTS idx_activities_name
  ON branch_activities(activity_name);

-- ====================================================================
-- Row Level Security
-- (RLS er allerede auto-enabled via Supabase project settings.
--  Vi legger på eksplisitte read-only policies for `anon`-rollen.
--  Service-role bypasser RLS automatisk og bruker den i ETL-scripts.)
-- ====================================================================

-- Slipp inn lese-tilgang for klienten (anon role)
GRANT SELECT ON public.municipalities      TO anon, authenticated;
GRANT SELECT ON public.red_cross_branches  TO anon, authenticated;
GRANT SELECT ON public.branch_activities   TO anon, authenticated;

-- Full tilgang for service_role (brukes av ETL-scripts).
-- "Auto-expose new tables" er av, så Supabase gir ikke disse default.
GRANT ALL ON public.municipalities      TO service_role;
GRANT ALL ON public.red_cross_branches  TO service_role;
GRANT ALL ON public.branch_activities   TO service_role;

-- Re-create policies idempotent
DROP POLICY IF EXISTS "Public read"                ON public.municipalities;
DROP POLICY IF EXISTS "Public read"                ON public.red_cross_branches;
DROP POLICY IF EXISTS "Public read"                ON public.branch_activities;

CREATE POLICY "Public read" ON public.municipalities
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public read" ON public.red_cross_branches
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public read" ON public.branch_activities
  FOR SELECT TO anon, authenticated USING (true);

-- ====================================================================
-- Sanity check: kjør disse SELECT-ene etter at du har kjørt ETL.
-- (Forventet 0 rader nå, fordi ETL ikke har kjørt enda.)
-- ====================================================================
-- SELECT count(*) FROM municipalities;
-- SELECT count(*) FROM red_cross_branches;
-- SELECT count(*) FROM branch_activities;
