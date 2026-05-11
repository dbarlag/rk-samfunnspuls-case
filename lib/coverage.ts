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

/**
 * Nasjonale snitt + tellinger for én aktivitet.
 *
 * Brukes på kommune-detaljsiden for å gi kontekst:
 * - Er kommunens behov over/under en typisk kommune?
 * - Er dekningen mer/mindre strukket enn snittet blant dekkede?
 */
export type NationalAverage = {
  meanNeedPerKommune: number;
  /** Gjennomsnittlig need_per_service blant kommuner med dekning. */
  meanNeedPerService: number;
  totalKommuner: number;
  totalCovered: number;
  totalUncovered: number;
};

export function computeNationalAverages(
  coverage: CoverageRow[],
): NationalAverage {
  const totalNeed = coverage.reduce((s, c) => s + c.needValue, 0);
  const meanNeedPerKommune = coverage.length === 0 ? 0 : totalNeed / coverage.length;

  const dekkede = coverage.filter((c) => c.need_per_service != null);
  const meanNeedPerService =
    dekkede.length === 0
      ? 0
      : dekkede.reduce((s, c) => s + (c.need_per_service ?? 0), 0) /
        dekkede.length;

  return {
    meanNeedPerKommune,
    meanNeedPerService,
    totalKommuner: coverage.length,
    totalCovered: dekkede.length,
    totalUncovered: coverage.length - dekkede.length,
  };
}

/**
 * Aggregert dekning per fylke.
 *
 * Sorteres på "andel udekkede kommuner" descending, så på "behov per gruppe"
 * descending — fylker hvor flest tettsteder mangler dekning kommer først,
 * og innenfor samme dekningsgrad havner mest strukket tjeneste øverst.
 */
export type FylkeRow = {
  fylkesnavn: string;
  kommuner_totalt: number;
  kommuner_uten_dekning: number;
  total_need: number;
  total_grupper: number;
  pct_uten_dekning: number;
  need_per_gruppe: number | null;
};

export function aggregateByFylke(coverage: CoverageRow[]): FylkeRow[] {
  const groups = new Map<string, FylkeRow>();
  for (const c of coverage) {
    if (!c.fylkesnavn) continue;
    let row = groups.get(c.fylkesnavn);
    if (!row) {
      row = {
        fylkesnavn: c.fylkesnavn,
        kommuner_totalt: 0,
        kommuner_uten_dekning: 0,
        total_need: 0,
        total_grupper: 0,
        pct_uten_dekning: 0,
        need_per_gruppe: null,
      };
      groups.set(c.fylkesnavn, row);
    }
    row.kommuner_totalt += 1;
    if (c.no_coverage) row.kommuner_uten_dekning += 1;
    row.total_need += c.needValue;
    row.total_grupper += c.antall_grupper;
  }

  for (const row of groups.values()) {
    row.pct_uten_dekning =
      row.kommuner_totalt === 0
        ? 0
        : row.kommuner_uten_dekning / row.kommuner_totalt;
    row.need_per_gruppe =
      row.total_grupper === 0 ? null : row.total_need / row.total_grupper;
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.pct_uten_dekning !== b.pct_uten_dekning)
      return b.pct_uten_dekning - a.pct_uten_dekning;
    return (b.need_per_gruppe ?? 0) - (a.need_per_gruppe ?? 0);
  });
}

/**
 * Finn 1-indexed rang for kommunen i den allerede sorterte coverage-listen.
 * (Sorteringen er: udekkede først descending behov, så dekkede med
 *  descending behov + need_per_service.) Rang 1 = høyest prioritet for
 *  nye grupper.
 */
export function findRank(
  coverage: CoverageRow[],
  kommunenummer: string,
): number | null {
  const idx = coverage.findIndex((c) => c.kommunenummer === kommunenummer);
  return idx === -1 ? null : idx + 1;
}
