import type { ActivityConfig } from "./activities";
import type {
  Branch,
  BranchActivity,
  Municipality,
} from "./database.types";

/**
 * Én rad i dekningsgap-analysen for én aktivitet.
 *
 * `needValue` er behovet (eldre alene / barn 6-16 / innvandrere etc.) —
 * styrt av aktivitets-config.
 */
export type CoverageRow = {
  kommunenummer: string;
  kommunenavn: string;
  fylkesnavn: string | null;
  needValue: number;
  antall_grupper: number;
  no_coverage: boolean;
  need_per_service: number | null;
};

/**
 * Beregn dekningsgap for alle kommuner for én gitt aktivitet.
 *
 * Sortering bruker tre nøkler i prioritert rekkefølge:
 *   1. `no_coverage` DESC  — kommuner uten dekning først
 *   2. `needValue` DESC    — størst absolutt behov
 *   3. `need_per_service` DESC — mest strukket tjeneste innen "har dekning"-bøtta
 *
 * Pure function — ingen I/O, ingen DB-avhengighet.
 */
export function computeCoverage(
  municipalities: Municipality[],
  branches: Branch[],
  allActivities: BranchActivity[],
  config: ActivityConfig,
): CoverageRow[] {
  const branchToKommune = new Map<string, string>();
  for (const b of branches) {
    if (b.kommunenummer) branchToKommune.set(b.branch_id, b.kommunenummer);
  }

  // Filter activities to the chosen aktivitetsnavn.
  const relevant = allActivities.filter(
    (a) => a.activity_name === config.activityName,
  );

  const grupperCount = new Map<string, number>();
  for (const a of relevant) {
    const knr = branchToKommune.get(a.branch_id);
    if (!knr) continue;
    grupperCount.set(knr, (grupperCount.get(knr) ?? 0) + 1);
  }

  return municipalities
    .map((m): CoverageRow => {
      const need = config.needAccessor(m);
      const count = grupperCount.get(m.kommunenummer) ?? 0;
      return {
        kommunenummer: m.kommunenummer,
        kommunenavn: m.kommunenavn,
        fylkesnavn: m.fylkesnavn,
        needValue: need,
        antall_grupper: count,
        no_coverage: count === 0,
        need_per_service: count === 0 ? null : need / count,
      };
    })
    .sort((a, b) => {
      if (a.no_coverage !== b.no_coverage) return a.no_coverage ? -1 : 1;
      if (b.needValue !== a.needValue) return b.needValue - a.needValue;
      return (b.need_per_service ?? 0) - (a.need_per_service ?? 0);
    });
}
