import { ACTIVITIES } from "./activities";
import { computeCoverage, type CoverageRow } from "./coverage";
import type { Branch, BranchActivity, Municipality } from "./database.types";
import { createAdminClient } from "./supabase";

type LoadedData = {
  municipalities: Municipality[];
  branches: Branch[];
  activities: BranchActivity[]; // ALLE aktiviteter, ikke bare Besøkstjeneste
  coverage: CoverageRow[];
};

// Module-level cache. Persisterer for hele build-prosessen, så `next build`
// gjør kun ÉN runde mot Supabase selv om alle 357 detaljsider kaller getData().
let cached: LoadedData | null = null;

const PAGE_SIZE = 1000; // Supabase REST-API har en hard 1000-rad-grense per request

/**
 * Henter ALLE rader fra en Supabase-tabell ved å pagere i bolker av 1000.
 * Trengs fordi PostgREST har default (og hard) max 1000 rader per request,
 * og branch_activities har ~2131 rader.
 */
async function fetchAll<T extends "municipalities" | "red_cross_branches" | "branch_activities">(
  supabase: ReturnType<typeof createAdminClient>,
  table: T,
) {
  const out: unknown[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return out;
}

async function loadAll(): Promise<LoadedData> {
  // Service-role + pagination kjøres kun fra RSC ved build-time. Service-role-key
  // forblir server-side, sendes aldri til klient.
  const supabase = createAdminClient();

  const [muns, branches, acts] = await Promise.all([
    fetchAll(supabase, "municipalities") as Promise<Municipality[]>,
    fetchAll(supabase, "red_cross_branches") as Promise<Branch[]>,
    fetchAll(supabase, "branch_activities") as Promise<BranchActivity[]>,
  ]);

  // Coverage trenger kun Besøkstjeneste-aktivitetene; vi filtrerer i JS.
  const besokActivities = acts.filter(
    (a) => a.activity_name === ACTIVITIES.BESOKSTJENESTE,
  );
  const coverage = computeCoverage(muns, branches, besokActivities);

  return {
    municipalities: muns,
    branches,
    activities: acts,
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
