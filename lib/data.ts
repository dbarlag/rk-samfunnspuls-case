import {
  ACTIVITY_CONFIGS,
  ACTIVITY_KEYS,
  type ActivityKey,
} from "./activities";
import { computeCoverage, type CoverageRow } from "./coverage";
import type { Branch, BranchActivity, Municipality } from "./database.types";
import { createAdminClient } from "./supabase";

type LoadedData = {
  municipalities: Municipality[];
  branches: Branch[];
  activities: BranchActivity[];
  // Pre-beregnet coverage per aktivitet — UI bytter bare nøkkel ved toggle.
  coverageByActivity: Record<ActivityKey, CoverageRow[]>;
};

let cached: LoadedData | null = null;

const PAGE_SIZE = 1000;

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
  const supabase = createAdminClient();

  const [muns, branches, acts] = await Promise.all([
    fetchAll(supabase, "municipalities") as Promise<Municipality[]>,
    fetchAll(supabase, "red_cross_branches") as Promise<Branch[]>,
    fetchAll(supabase, "branch_activities") as Promise<BranchActivity[]>,
  ]);

  // Beregn coverage for hver aktivitet (Besøkstjeneste, Leksehjelp, Norsktrening)
  const coverageByActivity = {} as Record<ActivityKey, CoverageRow[]>;
  for (const key of ACTIVITY_KEYS) {
    coverageByActivity[key] = computeCoverage(
      muns,
      branches,
      acts,
      ACTIVITY_CONFIGS[key],
    );
  }

  return {
    municipalities: muns,
    branches,
    activities: acts,
    coverageByActivity,
  };
}

export async function getData(): Promise<LoadedData> {
  if (!cached) cached = await loadAll();
  return cached;
}
