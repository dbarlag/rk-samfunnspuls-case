import type { CoverageRow } from "@/lib/coverage";
import { getKommunePaths, MAP_HEIGHT, MAP_WIDTH } from "@/lib/geo";

type Props = {
  coverage: CoverageRow[];
};

/**
 * Server-rendret SVG-kart over Norges kommuner.
 *
 * Farger basert på dekning:
 *   - no_coverage  → mørk rød (kritisk gap)
 *   - high need    → lys rød
 *   - low need     → svært lys rød / off-white
 *
 * All interaktivitet (hover, fokus) er CSS-only — ingen klient-JS nødvendig.
 */
export function MunicipalityMap({ coverage }: Props) {
  const paths = getKommunePaths();
  const coverageByKnr = new Map(coverage.map((c) => [c.kommunenummer, c]));

  // Beregn need-bånd for fargeskala (eks. quintile av need_per_service blant dekkede)
  const dekkedeNeeds = coverage
    .filter((c) => c.need_per_service !== null)
    .map((c) => c.need_per_service as number)
    .sort((a, b) => a - b);
  const p33 = dekkedeNeeds[Math.floor(dekkedeNeeds.length * 0.33)] ?? 0;
  const p66 = dekkedeNeeds[Math.floor(dekkedeNeeds.length * 0.66)] ?? 0;

  function colorFor(c: CoverageRow | undefined): string {
    if (!c) return "#f5f5f5"; // ingen data
    if (c.no_coverage) return "#D7282F"; // RK rød — kritisk
    if ((c.need_per_service ?? 0) >= p66) return "#F4A1A4"; // mye behov per gruppe
    if ((c.need_per_service ?? 0) >= p33) return "#FBDADA"; // moderat
    return "#FDEDEE"; // god dekning
  }

  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      width="100%"
      style={{ height: "auto", display: "block" }}
      role="img"
      aria-label="Kart over Norge med kommuner farget etter dekningsgap for besøkstjenesten"
    >
      <g>
        {Array.from(paths.entries()).map(([knr, { name, d }]) => {
          const cov = coverageByKnr.get(knr);
          const status = cov?.no_coverage
            ? "ingen besøkstjeneste"
            : cov
              ? `${cov.antall_besokstjenester} besøkstjeneste${cov.antall_besokstjenester !== 1 ? "r" : ""}`
              : "ingen data";
          const eldre = cov ? cov.antall_67plus_alene.toLocaleString("nb-NO") : "?";
          return (
            <path
              key={knr}
              d={d}
              fill={colorFor(cov)}
              stroke="#fff"
              strokeWidth="0.5"
              tabIndex={0}
              aria-label={`${name}: ${eldre} eldre alene, ${status}`}
            >
              <title>{`${name} — ${eldre} eldre alene, ${status}`}</title>
            </path>
          );
        })}
      </g>
    </svg>
  );
}
