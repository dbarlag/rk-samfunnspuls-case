import type {
  Branch,
  BranchActivity,
  Municipality,
} from "./database.types";

/**
 * Én rad i dekningsgap-analysen.
 *
 * Representerer én kommune med både behovet (antall eldre alene) og
 * dekningen (antall besøkstjeneste-grupper) i Røde Kors-systemet.
 */
export type CoverageRow = {
  kommunenummer: string;
  kommunenavn: string;
  fylkesnavn: string | null;
  antall_67plus_alene: number;
  antall_besokstjenester: number;
  /** True hvis kommunen ikke har noen besøkstjeneste i det hele tatt. */
  no_coverage: boolean;
  /**
   * Antall eldre alene per eksisterende besøkstjeneste-gruppe.
   * `null` når `no_coverage` er true (ingen tjenester å dele på).
   */
  need_per_service: number | null;
};

/**
 * Beregn dekningsgap for alle kommuner.
 *
 * Tar tre rådatasett (kommuner, lokalforeninger, og pre-filtrerte
 * besøkstjeneste-aktiviteter), og produserer en sortert liste der
 * de mest kritiske kommunene står øverst.
 *
 * Sortering bruker tre nøkler i prioritert rekkefølge:
 *   1. `no_coverage` DESC  — kommuner uten dekning først
 *   2. `antall_67plus_alene` DESC  — størst absolutt behov
 *   3. `need_per_service` DESC  — mest strukket tjeneste innen "har dekning"-bøtta
 *
 * Pure function — ingen I/O, ingen DB-avhengighet. Trivielt å enhetsteste.
 */
export function computeCoverage(
  municipalities: Municipality[],
  branches: Branch[],
  besokActivities: BranchActivity[],
): CoverageRow[] {
  // Branch-id → kommunenummer (skip branches uten kommune-match).
  const branchToKommune = new Map<string, string>();
  for (const b of branches) {
    if (b.kommunenummer) branchToKommune.set(b.branch_id, b.kommunenummer);
  }

  // Tell besøkstjeneste-grupper per kommune.
  const besokCount = new Map<string, number>();
  for (const a of besokActivities) {
    const knr = branchToKommune.get(a.branch_id);
    if (!knr) continue;
    besokCount.set(knr, (besokCount.get(knr) ?? 0) + 1);
  }

  return municipalities
    .map((m): CoverageRow => {
      const count = besokCount.get(m.kommunenummer) ?? 0;
      return {
        kommunenummer: m.kommunenummer,
        kommunenavn: m.kommunenavn,
        fylkesnavn: m.fylkesnavn,
        antall_67plus_alene: m.antall_67plus_alene,
        antall_besokstjenester: count,
        no_coverage: count === 0,
        need_per_service: count === 0 ? null : m.antall_67plus_alene / count,
      };
    })
    .sort((a, b) => {
      if (a.no_coverage !== b.no_coverage) return a.no_coverage ? -1 : 1;
      if (b.antall_67plus_alene !== a.antall_67plus_alene) {
        return b.antall_67plus_alene - a.antall_67plus_alene;
      }
      return (b.need_per_service ?? 0) - (a.need_per_service ?? 0);
    });
}
