import { ACTIVITIES } from "./activities";
import { computeCoverage, type CoverageRow } from "./coverage";
import type { Branch, BranchActivity, Municipality } from "./database.types";
import { supabase } from "./supabase";

type LoadedData = {
  municipalities: Municipality[];
  branches: Branch[];
  activities: BranchActivity[]; // ALLE aktiviteter, ikke bare Besøkstjeneste
  coverage: CoverageRow[];
};

// Module-level cache. Persisterer for hele build-prosessen, så `next build`
// gjør kun ÉN runde mot Supabase selv om alle 357 detaljsider kaller getData().
let cached: LoadedData | null = null;

async function loadAll(): Promise<LoadedData> {
  const [muns, branches, acts] = await Promise.all([
    supabase.from("municipalities").select("*"),
    supabase.from("red_cross_branches").select("*"),
    supabase.from("branch_activities").select("*"),
  ]);

  if (muns.error) throw new Error(`municipalities: ${muns.error.message}`);
  if (branches.error) throw new Error(`branches: ${branches.error.message}`);
  if (acts.error) throw new Error(`activities: ${acts.error.message}`);

  // Coverage trenger kun Besøkstjeneste-aktivitetene; vi filtrerer i JS
  // siden datasettet er bittesmått (~2k rader).
  const besokActivities = acts.data.filter(
    (a) => a.activity_name === ACTIVITIES.BESOKSTJENESTE,
  );
  const coverage = computeCoverage(muns.data, branches.data, besokActivities);

  return {
    municipalities: muns.data,
    branches: branches.data,
    activities: acts.data,
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
