import { ACTIVITIES } from "./activities";
import { computeCoverage, type CoverageRow } from "./coverage";
import type { Branch, Municipality } from "./database.types";
import { supabase } from "./supabase";

type LoadedData = {
  municipalities: Municipality[];
  branches: Branch[];
  coverage: CoverageRow[];
};

// Module-level cache. Persisterer for hele build-prosessen, så `next build`
// gjør kun ÉN runde mot Supabase selv om alle 357 detaljsider kaller getData().
let cached: LoadedData | null = null;

async function loadAll(): Promise<LoadedData> {
  // NB: Supabase anon-klienten har en hard 1000-rad-grense per request
  // (default project setting). branch_activities har ~2131 rader, så vi
  // filtrerer på Besøkstjeneste i SQL — det er bare ~256 rader, og det
  // er det eneste vi trenger for forsidens dekningsanalyse. Når detaljsiden
  // bygges, må vi enten paginere eller bumpe project setting.
  const [muns, branches, acts] = await Promise.all([
    supabase.from("municipalities").select("*"),
    supabase.from("red_cross_branches").select("*"),
    supabase
      .from("branch_activities")
      .select("*")
      .eq("activity_name", ACTIVITIES.BESOKSTJENESTE),
  ]);

  if (muns.error) throw new Error(`municipalities: ${muns.error.message}`);
  if (branches.error) throw new Error(`branches: ${branches.error.message}`);
  if (acts.error) throw new Error(`activities: ${acts.error.message}`);

  const coverage = computeCoverage(muns.data, branches.data, acts.data);

  return {
    municipalities: muns.data,
    branches: branches.data,
    coverage,
  };
}

/**
 * Hent alle data + ferdig-beregnet coverage. Kalles av RSC og API-route.
 * Resultatet caches på modul-nivå for hele build-prosessen.
 */
export async function getData(): Promise<LoadedData> {
  if (!cached) cached = await loadAll();
  return cached;
}
